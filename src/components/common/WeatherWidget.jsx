import { useState, useEffect, useCallback } from 'react';
import { weatherAPI } from '../../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 32 * 60 * 1000;

// ─── Weather-State Theme ─────────────────────────────────────────────────────
const THEMES = {
    day_sunny: {
        aura: ['#3FA9FF', '#1E88E5', '#1565C0'], 
        accent: 'text-white/85',
        hero: 'from-[#4FC3F7] to-[#1976D2]', 
        baseBg: '#1E88E5', 
        isNight: false,
    },
    day_partly_cloudy: {
        aura: ['#6FA8DC', '#4A90C2', '#2F5D8A'],
        accent: 'text-white/80',
        hero: 'from-[#7FB3E6] to-[#2F6FA3]',
        baseBg: '#4A90C2',
        isNight: false,
    },
    day_overcast: {
        aura: ['#90A4AE', '#78909C', '#546E7A'],
        accent: 'text-white/75',
        hero: 'from-[#B0BEC5] to-[#607D8B]',
        baseBg: '#78909C',
        isNight: false,
    },
    day_rainy: {
        aura: ['#5C6BC0', '#3949AB', '#1A237E'],
        accent: 'text-white/85',
        hero: 'from-[#7986CB] to-[#303F9F]',
        baseBg: '#3949AB',
        isNight: false,
    },
    night_clear: {
        aura: ['#0B1E3A', '#08142B', '#020617'],
        accent: 'text-white/65',
        hero: 'from-[#0F2A44] to-[#020617]',
        baseBg: '#020617',
        isNight: true,
    },
    night_cloudy: {
        aura: ['#2C3E50', '#1C2833', '#0B0F14'],
        accent: 'text-white/65',
        hero: 'from-[#34495E] to-[#0B0F14]',
        baseBg: '#1C2833',
        isNight: true,
    },
    night_rainy: {
        aura: ['#1A237E', '#0D133D', '#050816'],
        accent: 'text-white/65',
        hero: 'from-[#283593] to-[#050816]',
        baseBg: '#0D133D',
        isNight: true,
    },
};

const getTheme = (weatherState) => THEMES[weatherState] ?? THEMES.day_overcast;

const getInitialTheme = () => {
    const hour = new Date().getHours();
    const isDayTime = hour >= 6 && hour < 18;
    return isDayTime ? THEMES.day_sunny : THEMES.night_clear;
};

const SOIL_CONFIG = {
    green: { fill: 'bg-emerald-400', text: 'text-emerald-300' },
    yellow: { fill: 'bg-amber-400', text: 'text-amber-300' },
    blue: { fill: 'bg-sky-400', text: 'text-sky-300' },
    gray: { fill: 'bg-slate-400', text: 'text-slate-300' },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────
const useWeather = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        let isMounted = true;
        try {
            const res = await weatherAPI.getWeather();
            if (isMounted) {
                setData(res.data);
                setError(false);
            }
        } catch (e) {
            console.error(e);
            if (isMounted) setError(true);
        } finally {
            if (isMounted) setLoading(false);
        }
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, REFRESH_INTERVAL);
        return () => clearInterval(timer);
    }, [fetchData]);

    return { data, loading, error, fetchData };
};

// ─── Sub Components ──────────────────────────────────────────────────────────
const BentoCard = ({ children, className = "" }) => (
    <div className={`bento-card ${className}`}>
        {children}
    </div>
);

const StatCell = ({ icon, label, value }) => (
    <BentoCard>
        <div className="p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-base leading-none">{icon}</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {label}
                </p>
            </div>
            <p className="text-sm font-black tracking-tight text-white">
                {value ?? '--'}
            </p>
        </div>
    </BentoCard>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const WeatherWidget = () => {
    const { data, loading, error, fetchData } = useWeather();

    const current = data?.current;
    const currentTheme = data ? getTheme(current?.weatherState) : getInitialTheme();

    return (
        <div
            className="aurora-container relative rounded-3xl p-3 transition-all duration-1000 border border-white/5 overflow-hidden min-h-[380px]"
            style={{ backgroundColor: currentTheme.baseBg }}
        >
            <div className="aurora-blur-wrapper">
                {currentTheme.aura.map((color, i) => (
                    <div key={i} className={`aurora-ball ball-${i + 1}`} style={{ backgroundColor: color }} />
                ))}
            </div>

            <div className="relative z-10">
                {loading ? (
                    <div className="grid grid-cols-6 gap-2 animate-pulse">
                        <div className="col-span-4 row-span-2 h-40 bg-white/10 rounded-2xl" />
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-[76px] bg-white/10 rounded-2xl" />
                        ))}
                        <div className="col-span-3 h-24 bg-white/10 rounded-2xl" />
                        <div className="col-span-3 h-24 bg-white/10 rounded-2xl" />
                        <div className="col-span-6 grid grid-cols-3 gap-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-white/10 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                ) : error || !data ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white animate-fadeIn">
                        <p className="text-sm font-bold opacity-60">Lỗi kết nối trạm khí tượng</p>
                        <button onClick={fetchData} className="mt-4 text-xs underline opacity-40 uppercase tracking-tighter">
                            Thử lại
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-6 gap-2 animate-fadeIn">
                        <BentoCard className="col-span-4 row-span-2 !bg-transparent border-none">
                            <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.hero} opacity-40`} />
                            <div className="relative p-5 h-full flex flex-col justify-between text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Hiện tại</p>
                                        <h3 className="text-2xl font-black mt-1 leading-tight text-white">
                                            {current?.weather?.label || 'Đang tải...'}
                                        </h3>
                                    </div>
                                    <span className="text-5xl drop-shadow-2xl">
                                        {current?.weather?.icon || '☀️'}
                                    </span>
                                </div>
                                <div className="mt-6">
                                    <h2 className="text-5xl font-black tracking-tighter text-white">
                                        {current?.tempC != null ? `${current.tempC}°` : '--'}
                                    </h2>
                                    <p className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-widest text-white">
                                        Cập nhật {new Date(data.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </BentoCard>

                        <StatCell icon="💧" label="Độ ẩm" value={current?.humidity != null ? `${current.humidity}%` : null} />
                        <StatCell icon="🌬️" label="Gió" value={current?.windSpeed != null ? `${current.windSpeed} km/h` : null} />
                        <StatCell icon="🌡️" label="Điểm sương" value={current?.dewPoint != null ? `${current.dewPoint}°C` : null} />
                        <StatCell icon="🔬" label="VPD" value={current?.vpd != null ? `${current.vpd} kPa` : null} />

                        <BentoCard className="col-span-3">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Độ ẩm đất</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 ${SOIL_CONFIG[current?.soilStatus?.color || 'gray'].text}`}>
                                        {current?.soilStatus?.label || 'N/A'}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${SOIL_CONFIG[current?.soilStatus?.color || 'gray'].fill}`}
                                        style={{ width: `${current?.soilStatus?.level || 0}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] font-bold mt-2 opacity-30 uppercase text-white">
                                    <span>Khô</span><span>Tốt</span><span>Úng</span>
                                </div>
                            </div>
                        </BentoCard>

                        <BentoCard className="col-span-3">
                            <div className="p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-white/50">Khuyến cáo</p>
                                <div className="space-y-2.5">
                                    {data.alerts?.length > 0 ? (
                                        data.alerts.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                                <span className="text-xs font-bold text-white/90 truncate">{a.message}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-xs font-bold text-white/90">Môi trường ổn định</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </BentoCard>

                        <div className="col-span-6 grid grid-cols-3 gap-2">
                            {data.forecast?.map((day, i) => (
                                <BentoCard key={day.date} className={i === 0 ? 'bg-white/10' : ''}>
                                    <div className="p-3 flex flex-col items-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-white/40">
                                            {i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : 'Sắp tới'}
                                        </p>
                                        <div className="flex items-end gap-1">
                                            <span className="text-lg font-black text-white">{day.maxTempC}°</span>
                                            <span className="text-[10px] font-bold mb-0.5 text-white/30">{day.minTempC}°</span>
                                        </div>
                                        <p className={`text-[9px] font-bold mt-2 ${day.totalPrecipMm > 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                                            {day.totalPrecipMm > 0 ? `🌧️ ${day.totalPrecipMm}mm` : '☀️ Khô ráo'}
                                        </p>
                                    </div>
                                </BentoCard>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;