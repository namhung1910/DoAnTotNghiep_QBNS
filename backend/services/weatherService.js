import NodeCache from 'node-cache';
import Farm from '../models/Farm.js';
import Region from '../models/Region.js';

// Cache TTL = 30 phút
const weatherCache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });

// ─── Helpers ────────────────────────────────────────────────────────────────

const r = (v, d = 1) => (v == null ? null : parseFloat(v.toFixed(d)));

/**
 * Tính centroid thô từ mảng coordinates GeoJSON (Polygon/MultiPolygon)
 * Không cần @turf — chỉ lấy trung bình tất cả các điểm exterior ring.
 */
function computeCentroid(geometries) {
    let latSum = 0, lonSum = 0, count = 0;

    for (const geo of geometries) {
        if (!geo || !geo.coordinates) continue;
        // Lấy exterior ring đầu tiên bất kể Polygon / MultiPolygon
        let rings;
        if (geo.type === 'Polygon') {
            rings = [geo.coordinates[0]];
        } else if (geo.type === 'MultiPolygon') {
            rings = geo.coordinates.map(p => p[0]);
        } else if (geo.type === 'Point') {
            const [lon, lat] = geo.coordinates;
            latSum += lat; lonSum += lon; count++;
            continue;
        } else continue;

        for (const ring of rings) {
            for (const [lon, lat] of ring) {
                latSum += lat; lonSum += lon; count++;
            }
        }
    }
    if (count === 0) return null;
    return { lat: latSum / count, lon: lonSum / count };
}

/**
 * Resolve toạ độ theo thứ tự ưu tiên:
 *  1. Centroid từ Farm của farmer (nếu role=farmer)
 *  2. Centroid từ tất cả Region active (nếu role=admin)
 *  3. Fallback WEATHER_LAT / WEATHER_LON từ .env
 */
export async function resolveCoordinates(role, userId) {
    try {
        if (role === 'farmer' && userId) {
            // Lấy thêm cropType, plantingDate, status để xây dựng ngữ cảnh cây trồng cho RAG
            const farms = await Farm.find({ ownerId: userId, isActive: true })
                .select('geometry cropType status name plantingDate')
                .lean();
            if (farms.length > 0) {
                const centroid = computeCentroid(farms.map(f => f.geometry));

                // Tổng hợp cây đang canh tác (loại harvested/cancelled — những thửa này không cần tư vấn thời tiết)
                const activeCrops = farms
                    .filter(f => ['planting', 'growing', 'harvesting'].includes(f.status))
                    .map(f => ({
                        name:         f.name,
                        cropType:     f.cropType,
                        status:       f.status,
                        plantingDate: f.plantingDate || null,
                    }));

                if (centroid) return { ...centroid, activeCrops, cropSummary: [] };
            }
        }

        if (role === 'admin') {
            const regions = await Region.find({ isActive: true }).select('geometry').lean();
            const centroid = regions.length > 0
                ? computeCentroid(regions.map(r => r.geometry))
                : null;

            // BUG FIX: Thay vì trả activeCrops: [], query tổng hợp cây trồng toàn HTX
            // để Dewy có ngữ cảnh thực tế khi admin hỏi về thời tiết/canh tác
            const cropAgg = await Farm.aggregate([
                { $match: { isActive: true, status: { $in: ['planting', 'growing', 'harvesting'] } } },
                {
                    $group: {
                        _id: '$cropType',
                        count: { $sum: 1 },
                        totalArea: { $sum: '$area' }
                    }
                },
                { $sort: { totalArea: -1 } }
            ]);

            // cropSummary cho admin: tổng hợp theo loại cây (khác activeCrops của farmer: per-farm)
            const cropSummary = cropAgg.map(c => ({
                cropType:  c._id || 'Chưa xác định',
                count:     c.count,
                totalArea: c.totalArea,
            }));

            const lat = centroid?.lat ?? parseFloat(process.env.WEATHER_LAT || '10.98');
            const lon = centroid?.lon ?? parseFloat(process.env.WEATHER_LON || '106.65');
            return { lat, lon, activeCrops: [], cropSummary };
        }
    } catch (err) {
        console.error('[weatherService] resolveCoordinates error:', err.message);
    }

    // Fallback .env
    const lat = parseFloat(process.env.WEATHER_LAT || '10.98');
    const lon = parseFloat(process.env.WEATHER_LON || '106.65');
    return { lat, lon, activeCrops: [], cropSummary: [] };
}

// ─── Open Meteo Call ─────────────────────────────────────────────────────────

async function fetchOpenMeteo(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        hourly: [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation',
            'soil_temperature_0_to_7cm',
            'soil_moisture_0_to_7cm',
            'soil_moisture_7_to_28cm',
            'et0_fao_evapotranspiration',
            'vapor_pressure_deficit',
            'dew_point_2m',
            'wind_speed_10m',
            'shortwave_radiation',
            'is_day',              // 1 = ban ngày, 0 = ban đêm
        ].join(','),
        // Model tốt nhất cho Việt Nam, có độ phủ dữ liệu đất tốt
        models: 'ecmwf_ifs025',
        forecast_days: 3,
        past_days: 2,
        timezone: 'Asia/Bangkok',
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open Meteo HTTP ${res.status}`);
    return res.json();
}

// ─── Processing ──────────────────────────────────────────────────────────────

/**
 * Phân loại giờ nào thuộc "quá khứ" (past 2 ngày) và "tương lai" (forecast 3 ngày)
 * Open Meteo trả time dạng "2024-04-10T06:00" (local)
 */
function splitPastFuture(hourly, timezone) {
    const now = new Date();
    // So sánh dựa trên chuỗi ISO để tránh vấn đề timezone phức tạp
    const nowIso = now.toISOString();

    const past = [], future = [];
    hourly.time.forEach((t, i) => {
        // Open Meteo trả "2024-04-10T06:00" không có Z, thêm offset +07:00 để parse chính xác
        const parsed = new Date(t + '+07:00');
        const entry = {
            time: t,
            parsed,
            temp: hourly.temperature_2m[i],
            humidity: hourly.relative_humidity_2m[i],
            precip: hourly.precipitation[i],
            soilTemp: hourly.soil_temperature_0_to_7cm[i],
            soilMoist07: hourly.soil_moisture_0_to_7cm[i],
            soilMoist728: hourly.soil_moisture_7_to_28cm[i],
            et0: hourly.et0_fao_evapotranspiration[i],
            vpd: hourly.vapor_pressure_deficit[i],
            dewPoint: hourly.dew_point_2m[i],
            windSpeed: hourly.wind_speed_10m[i],
            radiation: hourly.shortwave_radiation[i],
            isDay: hourly.is_day[i],   // 1 = ngày, 0 = đêm
        };
        if (parsed <= now) past.push(entry);
        else future.push(entry);
    });
    return { past, future };
}

/**
 * Bước A: Tóm tắt 2 ngày quá khứ
 */
function summarizePast(past) {
    if (past.length === 0) return null;

    const temps = past.map(e => e.temp).filter(v => v != null);
    const precipTotal = past.map(e => e.precip).filter(v => v != null).reduce((a, b) => a + b, 0);
    const soilMoistList = past.map(e => e.soilMoist07).filter(v => v != null);
    const humidityList = past.map(e => e.humidity).filter(v => v != null);
    const et0List = past.map(e => e.et0).filter(v => v != null);

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
        totalPrecipMm: r(precipTotal),
        avgTempC: r(avg(temps)),
        avgSoilMoisture07: r(avg(soilMoistList), 2),
        avgHumidityPct: r(avg(humidityList)),
        totalEt0Mm: r(et0List.reduce((a, b) => a + b, 0)),
    };
}

/**
 * Bước B: Tóm tắt 3 ngày (hôm nay + 2 ngày tới)
 * - Min/Max nhiệt dùng ALL giờ trong ngày (kể cả giờ đã qua)
 * - keySlots chỉ lấy từ giờ chưa xảy ra (future) để dự báo
 * @param {Array} allHours - toàn bộ hourly (past + future)
 * @param {Array} futureHours - chỉ các giờ tương lai (cho keySlots)
 */
function summarizeForecast(allHours, futureHours) {
    const KEY_HOURS = [0, 6, 12, 18];
    const now = new Date();

    // Xác định 3 ngày cần lấy: hôm nay + 2 ngày tới (dạng "YYYY-MM-DD")
    const targetDates = [0, 1, 2].map(offset => {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        // Chuyển sang giờ địa phương Bangkok (+7)
        const local = new Date(d.getTime() + 7 * 3600 * 1000);
        return local.toISOString().slice(0, 10);
    });

    // Group ALL hours by date → min/max chính xác
    const byDay = {};
    targetDates.forEach(dk => { byDay[dk] = { date: dk, temps: [], precips: [], et0s: [], soilMoists: [], vpds: [], dewPoints: [], windSpeeds: [], keySlots: [] }; });

    for (const e of allHours) {
        const dk = e.time.slice(0, 10);
        if (!byDay[dk]) continue;
        const day = byDay[dk];
        if (e.temp != null) day.temps.push(e.temp);
        if (e.precip != null) day.precips.push(e.precip);
        if (e.et0 != null) day.et0s.push(e.et0);
        if (e.soilMoist07 != null) day.soilMoists.push(e.soilMoist07);
        if (e.vpd != null) day.vpds.push(e.vpd);
        if (e.dewPoint != null) day.dewPoints.push(e.dewPoint);
        if (e.windSpeed != null) day.windSpeeds.push(e.windSpeed);
    }

    // keySlots chỉ từ future (chưa xảy ra)
    for (const e of futureHours) {
        const dk = e.time.slice(0, 10);
        if (!byDay[dk]) continue;
        const hour = e.parsed.getHours();
        if (KEY_HOURS.includes(hour)) {
            byDay[dk].keySlots.push({
                hour,
                temp: r(e.temp),
                precip: r(e.precip),
                soilMoist07: r(e.soilMoist07, 2),
                vpd: r(e.vpd),
                dewPoint: r(e.dewPoint),
                windSpeed: r(e.windSpeed),
            });
        }
    }

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return targetDates.map(dk => {
        const day = byDay[dk];
        return {
            date: day.date,
            minTempC: day.temps.length ? r(Math.min(...day.temps)) : null,
            maxTempC: day.temps.length ? r(Math.max(...day.temps)) : null,
            totalPrecipMm: r(day.precips.reduce((a, b) => a + b, 0)),
            maxWindKmh: r(day.windSpeeds.length ? Math.max(...day.windSpeeds) : 0),
            avgSoilMoisture07: r(avg(day.soilMoists), 2),
            avgVpd: r(avg(day.vpds)),
            totalEt0Mm: r(day.et0s.reduce((a, b) => a + b, 0)),
            keySlots: day.keySlots,
        };
    });
}

/**
 * Lấy giờ hiện tại (gần nhất trong past)
 */
function getCurrentConditions(past) {
    if (past.length === 0) return null;
    const last = past[past.length - 1];
    return {
        tempC: r(last.temp),
        humidity: r(last.humidity),
        precip: r(last.precip),
        soilMoist07: r(last.soilMoist07, 2),
        soilMoist728: r(last.soilMoist728, 2),
        vpd: r(last.vpd),
        dewPoint: r(last.dewPoint),
        windSpeed: r(last.windSpeed),
        radiation: r(last.radiation),
        et0: r(last.et0),
        isDay: last.isDay,         // 0/1 — quan trọng để xác định ngày/đêm
    };
}

/**
 * Bước C & Logic cảnh báo → tạo alerts array
 */
function generateAlerts(current, forecast) {
    const alerts = [];
    if (!current) return alerts;

    const { tempC, dewPoint, humidity, soilMoist07, windSpeed, et0 } = current;

    // Cảnh báo nấm bệnh: dew point gap < 3°C VÀ độ ẩm > 80%
    if (tempC != null && dewPoint != null && humidity != null) {
        if ((tempC - dewPoint) < 3 && humidity > 80) {
            alerts.push({ type: 'disease', icon: '⚠️', message: 'Nguy cơ nấm bệnh cao — điều kiện ẩm ướt kéo dài' });
        }
    }

    // Cảnh báo cần tưới: ET0 cao & đất khô
    const todayEt0 = forecast?.[0]?.totalEt0Mm ?? 0;
    if ((todayEt0 > 4 || (et0 != null && et0 > 0.3)) && soilMoist07 != null && soilMoist07 < 0.2) {
        alerts.push({ type: 'irrigation', icon: '💧', message: 'Cần tưới nước ngay — đất khô, bốc thoát hơi cao' });
    }

    // Cảnh báo gió to
    if (windSpeed != null && windSpeed > 15) {
        alerts.push({ type: 'wind', icon: '🚫', message: `Không nên phun thuốc (Gió ${windSpeed} km/h)` });
    }

    if (alerts.length === 0) {
        alerts.push({ type: 'ok', icon: '✅', message: 'Điều kiện canh tác ổn định' });
    }

    return alerts;
}

/**
 * Nhãn độ ẩm đất cho widget
 */
function soilMoistLabel(val) {
    if (val == null) return { label: 'Không có dữ liệu', color: 'gray', level: 0 };
    if (val < 0.15) return { label: 'Khô', color: 'yellow', level: Math.round((val / 0.15) * 40) };
    if (val <= 0.35) return { label: 'Tốt', color: 'green', level: Math.round(((val - 0.15) / 0.20) * 50 + 40) };
    return { label: 'Úng', color: 'blue', level: Math.min(100, Math.round(((val - 0.35) / 0.15) * 10 + 90)) };
}

/**
 * Xác định weatherState từ dữ liệu thô:
 *   day_sunny | day_partly_cloudy | day_overcast | day_rainy
 *   night_clear | night_cloudy | night_rainy
 *
 * @param {number} isDay   - 1=ban ngày, 0=ban đêm (từ Open Meteo is_day)
 * @param {number} precip  - lượng mưa mm trong giờ
 * @param {number} radiation - bức xạ W/m²
 * @param {number} humidity - độ ẩm %
 */
function getWeatherState(isDay, precip, radiation, humidity) {
    const isNight = isDay === 0;
    const isRaining = (precip ?? 0) > 0.5;

    if (isNight) {
        if (isRaining) return { state: 'night_rainy', icon: '🌧️', label: 'Mưa đêm' };
        if ((humidity ?? 0) >= 80) return { state: 'night_cloudy', icon: '☁️', label: 'Mây đêm' };
        return { state: 'night_clear', icon: '🌙', label: 'Trời đêm' };
    }

    // Ban ngày
    if (isRaining) return { state: 'day_rainy', icon: '🌧️', label: 'Có mưa' };
    if ((radiation ?? 0) > 400) return { state: 'day_sunny', icon: '☀️', label: 'Trời nắng' };
    if ((radiation ?? 0) > 100) return { state: 'day_partly_cloudy', icon: '⛅', label: 'Có mây' };
    return { state: 'day_overcast', icon: '🌫️', label: 'Âm u' };
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Lấy dữ liệu thời tiết đã xử lý.
 * @param {string} role  - 'farmer' | 'admin'
 * @param {string|null} userId - ObjectId của user (dùng cho farmer)
 * @returns {{ weatherWidget: object, weatherSummary: string }}
 */
export async function getWeatherData(role, userId = null) {
    const { lat, lon, activeCrops = [], cropSummary = [] } = await resolveCoordinates(role, userId);

    // Cache theo toạ độ làm tròn 2 chữ số (~1.1km) — nhiều farmer cùng vùng sử dụng chung 1 cầu trả lời
    const latKey = lat.toFixed(2);
    const lonKey = lon.toFixed(2);
    const cacheKey = `weather_${latKey}_${lonKey}`;

    const cached = weatherCache.get(cacheKey);
    if (cached) return cached;
    const raw = await fetchOpenMeteo(lat, lon);

    const { past, future } = splitPastFuture(raw.hourly);
    const allHours = [...past, ...future];
    const current = getCurrentConditions(past);
    const pastSummary = summarizePast(past);
    const forecast = summarizeForecast(allHours, future); // allHours cho min/max, future cho keySlots
    const alerts = generateAlerts(current, forecast);
    const soilStatus = soilMoistLabel(current?.soilMoist07);
    // getWeatherState dùng is_day thực tế từ Open Meteo — chính xác ngày/đêm theo vị trí địa lý
    const weatherInfo = getWeatherState(
        current?.isDay,
        current?.precip ?? 0,
        current?.radiation,
        current?.humidity
    );

    // ── Widget object cho UI ──────────────────────────────────────
    const weatherWidget = {
        location: { lat: r(lat, 4), lon: r(lon, 4) },
        current: {
            tempC: current?.tempC,
            weather: { icon: weatherInfo.icon, label: weatherInfo.label },
            weatherState: weatherInfo.state,   // 'day_sunny' | 'night_clear' | v.v.
            soilMoisture07: current?.soilMoist07,
            soilStatus,
            humidity: current?.humidity,
            windSpeed: current?.windSpeed,
            vpd: current?.vpd,
            dewPoint: current?.dewPoint,
        },
        alerts,
        forecast: forecast.map(d => ({
            date: d.date,
            minTempC: d.minTempC,
            maxTempC: d.maxTempC,
            totalPrecipMm: d.totalPrecipMm,
            maxWindKmh: d.maxWindKmh,
        })),
        updatedAt: new Date().toISOString(),
    };

    // ── Summary string cho Gemini RAG ────────────────────────────
    // NGUYÊN TẮC: Gửi số liệu THÔ + ngưỡng nông nghiệp để Gemini tự suy luận.
    // KHÔNG gửi kết quả đã diễn giải (alert text) — việc đó là của widget UI.

    // Ngữ cảnh diễn giải các chỉ số nông nghiệp
    const vpdContext = (vpd) => {
        if (vpd == null) return 'không có dữ liệu';
        if (vpd < 0.5) return `${vpd} kPa — thấp, cây không thoát hơi được, dễ bí gốc`;
        if (vpd < 1.5) return `${vpd} kPa — lý tưởng, cây sinh trưởng tốt`;
        if (vpd < 2.5) return `${vpd} kPa — cao, cây bắt đầu bị stress nước`;
        return `${vpd} kPa — rất cao (>2.5), cây héo, thoát hơi nước cực mạnh, cần tưới gấp`;
    };

    const soilContext = (sm) => {
        if (sm == null) return 'không có dữ liệu';
        if (sm < 0.15) return `${sm} m³/m³ — khô hạn (ngưỡng tốt: 0.15-0.35), rễ khó hút nước`;
        if (sm <= 0.35) return `${sm} m³/m³ — đạt ngưỡng tốt (0.15-0.35), cây sinh trưởng bình thường`;
        return `${sm} m³/m³ — úng nước (>0.35), rễ có thể bị thiếu oxy`;
    };

    const dewGapContext = (temp, dew) => {
        if (temp == null || dew == null) return 'không có dữ liệu';
        const gap = r(temp - dew, 1);
        if (gap < 2) return `${gap}°C — cực thấp (<2°C), không khí gần bão hoà, nguy cơ nấm bệnh/đạo ôn rất cao`;
        if (gap < 5) return `${gap}°C — thấp (2-5°C), điều kiện thuận lợi cho nấm bệnh phát sinh`;
        return `${gap}°C — an toàn (>5°C), ít nguy cơ nấm bệnh`;
    };

    const et0Context = (et0) => {
        if (et0 == null) return 'không có dữ liệu';
        if (et0 < 3) return `${et0} mm/ngày — thấp, nhu cầu nước của cây ít`;
        if (et0 < 5) return `${et0} mm/ngày — trung bình, cần kiểm tra độ ẩm đất`;
        return `${et0} mm/ngày — cao (>5mm), nhu cầu nước rất lớn, cần tưới nếu đất khô`;
    };

    const windContext = (w) => {
        if (w == null) return 'không có dữ liệu';
        if (w < 10) return `${w} km/h — nhẹ, thuận lợi phun thuốc`;
        if (w < 15) return `${w} km/h — trung bình, cân nhắc phun buổi sáng sớm`;
        if (w < 25) return `${w} km/h — mạnh, không nên phun thuốc/phân bón lá`;
        return `${w} km/h — rất mạnh, dừng mọi hoạt động phun xịt`;
    };

    // Dự báo từng ngày với keySlots
    const forecastLines = forecast.map((d, i) => {
        const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : 'Ngày kia';
        const slotLines = (d.keySlots || []).map(s =>
            `    ${String(s.hour).padStart(2, '0')}h: ${s.temp}°C, Mưa ${s.precip}mm, Gió ${s.windSpeed}km/h, VPD ${s.vpd} kPa, Điểm sương-gap ${s.temp != null && s.dewPoint != null ? r(s.temp - s.dewPoint, 1) : 'N/A'}°C`
        ).join('\n');
        return `  ${label} (${d.date}): Min ${d.minTempC}°C / Max ${d.maxTempC}°C | Tổng mưa ${d.totalPrecipMm}mm | Gió max ${d.maxWindKmh}km/h | ET0 ${et0Context(d.totalEt0Mm)} | Độ ẩm đất: ${soilContext(d.avgSoilMoisture07)} | VPD TB ${d.avgVpd != null ? d.avgVpd + ' kPa' : 'N/A'}\n  Các mốc giờ quan trọng:\n${slotLines || '    (không có dữ liệu mốc giờ)'}`;
    }).join('\n');

    // Xây dựng ngữ cảnh cây trồng theo role:
    // - Farmer: hiển thị chi tiết từng thửa + số ngày đã trồng (để suy luận giai đoạn sinh trưởng)
    // - Admin: hiển thị tổng hợp theo loại cây toàn HTX (groupBy cropType)
    let cropContextHeader;
    let cropContextLines;

    if (activeCrops.length > 0) {
        // Farmer context: per-farm, có plantingDate
        cropContextHeader = '[CÂY TRỒNG HIỆN TẠI CỦA NÔNG DÂN]';
        cropContextLines = activeCrops.map(c => {
            const daysSincePlanting = c.plantingDate
                ? Math.floor((Date.now() - new Date(c.plantingDate)) / 86400000)
                : null;
            return `- ${c.name}: ${c.cropType} | Giai đoạn: ${c.status}` +
                   (daysSincePlanting !== null ? ` | Đã trồng ${daysSincePlanting} ngày` : ' | Ngày trồng chưa ghi nhận');
        }).join('\n');
    } else if (cropSummary.length > 0) {
        // Admin context: tổng hợp toàn HTX theo cropType
        cropContextHeader = '[CÂY TRỒNG TOÀN HTX ĐANG CANH TÁC]';
        cropContextLines = cropSummary.map(c =>
            `- ${c.cropType}: ${c.count} thửa đất, tổng ${Math.round(c.totalArea)} m²`
        ).join('\n');
    } else {
        cropContextHeader = '[CÂY TRỒNG]';
        cropContextLines = '- Không có thửa đất đang canh tác';
    }

    // Ghi chú canh tác phụ thuộc role: farmer cần suy luận giai đoạn sinh trưởng, admin cần tư vấn hệ thống
    const cropAdviceNote = activeCrops.length > 0
        ? `KHI TƯ VẤN CANH TÁC, BẮT BUỘC xem xét đồng thời: (1) Loại cây trồng ở phần [CÂY TRỒNG HIỆN TẠI CỦA NÔNG DÂN], (2) Số ngày đã trồng để suy luận giai đoạn sinh trưởng:\n  Lúa nước: 0-25 ngày = mạ/bén rễ | 25-50 ngày = đẻ nhánh | 50-80 ngày = làm đòng | >80 ngày = trỗ bông/chín\n  Ví dụ: "Với lúa đã trồng 45 ngày (đang đẻ nhánh), VPD 3.2 kPa cho thấy cây bị stress nước — tưới ngay để tránh nghẹt đòng non."`
        : `Đây là dữ liệu thời tiết toàn khu vực HTX. Khi tư vấn, hãy xem xét điều kiện thời tiết ảnh hưởng đến TẤT CẢ các loại cây đang được canh tác trong HTX (xem phần [CÂY TRỒNG TOÀN HTX]). Ưu tiên cảnh báo nếu có nguy cơ nấm bệnh, hạn hán, hoặc điều kiện bất lợi trên diện rộng.`;

    const weatherSummary = `=== DỮ LIỆU THỜI TIẾT KHU VỰC HTX (Toạ độ: ${r(lat, 4)}, ${r(lon, 4)}) ===

${cropContextHeader}
${cropContextLines}

[QUÁ KHỨ 2 NGÀY]
- Tổng lượng mưa tích lũy: ${pastSummary?.totalPrecipMm ?? 'N/A'} mm${(pastSummary?.totalPrecipMm ?? 0) < 5 ? ' — ít mưa, đất có xu hướng khô dần' : ' — đủ ẩm'}
- Nhiệt độ trung bình: ${pastSummary?.avgTempC ?? 'N/A'}°C
- Độ ẩm không khí trung bình: ${pastSummary?.avgHumidityPct ?? 'N/A'}%${(pastSummary?.avgHumidityPct ?? 0) > 85 ? ' — cao kéo dài, cần theo dõi nấm bệnh' : ''}
- Độ ẩm đất (0-7cm) trung bình: ${soilContext(pastSummary?.avgSoilMoisture07)}
- Tổng ET0 (bốc thoát hơi) 2 ngày qua: ${pastSummary?.totalEt0Mm ?? 'N/A'} mm — cây đã mất lượng nước đáng kể nếu không được tưới bù

[HIỆN TẠI]
- Nhiệt độ: ${current?.tempC ?? 'N/A'}°C
- Độ ẩm không khí: ${current?.humidity ?? 'N/A'}%
- Gió: ${windContext(current?.windSpeed)}
- Điểm sương (dew point): ${current?.dewPoint ?? 'N/A'}°C | Khoảng cách nhiệt độ - điểm sương: ${dewGapContext(current?.tempC, current?.dewPoint)}
- Chỉ số VPD (áp suất hơi nước thiếu hụt): ${vpdContext(current?.vpd)}
- Độ ẩm đất tầng 0-7cm: ${soilContext(current?.soilMoist07)}
- Độ ẩm đất tầng 7-28cm (tầng rễ): ${soilContext(current?.soilMoist728)}
- Bức xạ mặt trời: ${current?.radiation ?? 'N/A'} W/m²${(current?.radiation ?? 0) > 600 ? ' — cường độ cao, cây thoát hơi mạnh' : ''}
- ET0 giờ hiện tại: ${current?.et0 != null ? current.et0 + ' mm/h' : 'N/A'}

[DỰ BÁO 3 NGÀY TỚI]
${forecastLines}

[Ghi chú cho Dewy — ƯU TIÊN CAO khi tư vấn canh tác]
Hãy dùng các số liệu trên để phân tích VÀ GIẢI THÍCH cụ thể tại sao nên/không nên thực hiện hoạt động được hỏi.
Đừng chỉ nêu kết quả — hãy giải thích cơ chế: VD "VPD 3.2 kPa nghĩa là cây đang thoát hơi rất mạnh, kết hợp với đất khô (SM=0.12) thì rễ sẽ không đủ nước..."
${cropAdviceNote}
=========================================`;

    // Trả thêm activeCrops để chatController có thể merge vào userData nếu cần
    const result = { weatherWidget, weatherSummary, activeCrops };
    weatherCache.set(cacheKey, result);
    return result;
}

