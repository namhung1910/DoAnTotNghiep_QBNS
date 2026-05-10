import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMapEvents } from 'react-leaflet';
import { FiNavigation, FiLoader, FiCheck, FiAlertTriangle, FiMapPin } from 'react-icons/fi';
import { IconWheat } from '../../components/icons/AgriIcons';
import L from 'leaflet';
import * as turf from '@turf/turf';
import toast from 'react-hot-toast';

import Modal from '../common/Modal';
import { farmAPI, landRequestAPI, regionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';

// ─── Custom marker icon (đánh dấu mốc) ───────────────────────────────────────
const pinIcon = new L.DivIcon({
    html: `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="38" rx="8" ry="3" fill="rgba(0,0,0,0.18)"/>
        <path d="M16 2C9.373 2 4 7.373 4 14c0 9.333 12 24 12 24S28 23.333 28 14C28 7.373 22.627 2 16 2z"
              fill="#22c55e" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="14" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [0, 0],   // offset handled by CSS transform above
    className: '',
});

const gpsIcon = new L.DivIcon({
    html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: '',
});

// Icon mốc thửa đất đã có của người khác (màu xám nhạt)
const existingFarmIcon = new L.DivIcon({
    html: `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <svg width="22" height="28" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="38" rx="8" ry="3" fill="rgba(0,0,0,0.12)"/>
        <path d="M16 2C9.373 2 4 7.373 4 14c0 9.333 12 24 12 24S28 23.333 28 14C28 7.373 22.627 2 16 2z"
              fill="#9ca3af" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="14" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [22, 28],
    iconAnchor: [0, 0],
    className: '',
});

const STEPS = {
    SELECT_METHOD: 'select_method',
    GPS_PREVIEW: 'gps_preview',
    MANUAL_PIN: 'manual_pin',
    FILL_INFO: 'fill_info',
};

// ─── Map click handler component ─────────────────────────────────────────────
const MapClickHandler = ({ onPin }) => {
    useMapEvents({
        click(e) {
            onPin({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
};

// ─── Validation: check if point is inside any region ─────────────────────────
const findContainingRegion = (lat, lng, regions) => {
    const point = turf.point([lng, lat]);
    for (const region of regions) {
        if (!region.geometry) continue;
        try {
            const poly = turf.polygon(region.geometry.coordinates);
            if (turf.booleanPointInPolygon(point, poly)) return region;
        } catch { /* skip */ }
    }
    return null;
};

// ─── Component ───────────────────────────────────────────────────────────────
const AddFarmModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(STEPS.SELECT_METHOD);
    const [regions, setRegions] = useState([]);
    const [allFarms, setAllFarms] = useState([]);   // thửa đất đã duyệt để hiển thị tham chiếu

    // GPS / pin state (single point)
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsPosition, setGpsPosition] = useState(null);   // {lat, lng} – raw GPS
    const [pinPosition, setPinPosition] = useState(null);   // {lat, lng} – confirmed pin
    const [containingRegion, setContainingRegion] = useState(null);
    const [validationError, setValidationError] = useState('');

    const [form, setForm] = useState({
        area: '',          // nhập tay (m²)
        cropType: '',
        purpose: '',
        commitment: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            loadData();
            setStep(STEPS.SELECT_METHOD);
            setGpsPosition(null);
            setPinPosition(null);
            setContainingRegion(null);
            setValidationError('');
            setForm({ area: '', cropType: '', purpose: '', commitment: '' });
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            const [regRes, farmRes] = await Promise.all([
                regionAPI.getAll(),
                farmAPI.getAll({ approvalStatus: 'approved' }),
            ]);
            setRegions(regRes.data || []);
            setAllFarms(farmRes.data || []);
        } catch { /* ignore */ }
    };

    // ── Pin validation ──────────────────────────────────────────────────────
    const handlePin = useCallback((pos) => {
        setPinPosition(pos);
        setValidationError('');
        const found = findContainingRegion(pos.lat, pos.lng, regions);
        if (!found) {
            setValidationError('Vị trí không nằm trong vùng quy hoạch nào! Hãy chọn điểm khác.');
            setContainingRegion(null);
        } else {
            setContainingRegion(found);
        }
    }, [regions]);

    // ── GPS ────────────────────────────────────────────────────────────────
    const handleGetGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Trình duyệt không hỗ trợ GPS!');
            return;
        }
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setGpsPosition({ lat, lng });
                setGpsLoading(false);
                setStep(STEPS.GPS_PREVIEW);
                handlePin({ lat, lng });
            },
            (err) => {
                setGpsLoading(false);
                const msgs = {
                    1: 'Bạn đã từ chối quyền GPS.',
                    2: 'Không xác định được vị trí. Hãy thử lại hoặc chọn thủ công.',
                    3: 'Hết thời gian GPS.',
                };
                toast.error(msgs[err.code] || 'Lỗi GPS.');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pinPosition) {
            toast.error('Vui lòng đánh dấu vị trí thửa đất trên bản đồ!');
            return;
        }
        if (validationError) {
            toast.error(validationError);
            return;
        }
        if (!form.area || isNaN(Number(form.area)) || Number(form.area) <= 0) {
            toast.error('Vui lòng nhập diện tích hợp lệ!');
            return;
        }
        if (!form.cropType || !form.purpose || !form.commitment) {
            toast.error('Vui lòng điền đủ thông tin!');
            return;
        }

        try {
            setSubmitting(true);

            // Geometry: Point (vị trí đánh dấu)
            const geometry = {
                type: 'Point',
                coordinates: [pinPosition.lng, pinPosition.lat],
            };

            // Backend sẽ tự sinh tên: ZoneCode-FarmerName-Seq
            const farmRes = await farmAPI.create({
                cropType: form.cropType,
                area: Number(form.area),
                geometry,
                regionId: containingRegion?._id,
                planningData: containingRegion?.name || '',
                // autoNameHint đã bỏ — backend tự tra:
                //   farmerCode từ req.user._id (JWT)
                //   zoneCode   từ regionId → Region.findById(regionId)
            });

            const createdFarm = farmRes.data;

            await landRequestAPI.create({
                purpose: form.purpose,
                commitment: form.commitment,
                farmName: createdFarm.name,
                cropType: form.cropType,
                requestedArea: Number(form.area),
                farmGeometry: geometry,
                regionId: containingRegion?._id,
                farmId: createdFarm._id,
            });

            toast.success('Đã gửi yêu cầu! HTX sẽ phê duyệt sớm.');
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra!');
        } finally {
            setSubmitting(false);
        }
    };

    const defaultCenter = pinPosition
        ? [pinPosition.lat, pinPosition.lng]
        : gpsPosition
            ? [gpsPosition.lat, gpsPosition.lng]
            : [20.4167, 106.3833];

    const ZONE_COLORS = {
        VLT: { fill: '#fef08a', border: '#ca8a04' },
        VCN: { fill: '#fed7aa', border: '#c2410c' },
        VAR: { fill: '#bbf7d0', border: '#16a34a' },
        default: { fill: '#bbf7d0', border: '#16a34a' },
    };
    const getRegionStyle = (feature) => {
        const zt = feature?.properties?.zoneType || 'default';
        const c = ZONE_COLORS[zt] || ZONE_COLORS.default;
        return { fillColor: c.fill, fillOpacity: 0.4, color: c.border, weight: 2, dashArray: '5,5' };
    };
    const existingFarmStyle = { color: '#6b7280', weight: 2, fillOpacity: 0.25 };

    // ── STEP 1: Chọn phương thức ──────────────────────────────────────────
    if (step === STEPS.SELECT_METHOD) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Thêm thửa đất của tôi" size="md">
                <div className="space-y-4 py-2">
                    <p className="text-gray-600 text-sm">Chọn phương thức xác định vị trí thửa đất:</p>

                    {/* GPS */}
                    <button
                        onClick={handleGetGPS}
                        disabled={gpsLoading}
                        className="w-full flex items-center space-x-4 p-5 border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-xl transition-all group"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 flex-shrink-0">
                            {gpsLoading ? <FiLoader className="animate-spin text-green-600 text-xl" /> : <FiNavigation className="text-green-600 text-xl" />}
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-gray-900">Dùng GPS (Vị trí hiện tại)</h3>
                            <p className="text-sm text-gray-500">Tự động định vị bằng GPS, sau đó điều chỉnh mốc</p>
                        </div>
                    </button>

                    {/* Manual */}
                    <button
                        onClick={() => setStep(STEPS.MANUAL_PIN)}
                        className="w-full flex items-center space-x-4 p-5 border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 flex-shrink-0">
                            <FiMapPin className="text-blue-600 text-xl" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-gray-900">Chọn thủ công trên bản đồ</h3>
                            <p className="text-sm text-gray-500">Nhấn vào bản đồ để đặt mốc vị trí thửa đất</p>
                        </div>
                    </button>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                        <FiAlertTriangle className="inline mr-1" />
                        Mốc phải nằm trong vùng quy hoạch. Yêu cầu sẽ được HTX xem xét trước khi phê duyệt.
                    </div>
                </div>
            </Modal>
        );
    }

    // ── STEP 2: Bản đồ đánh dấu mốc ─────────────────────────────────────
    if (step === STEPS.GPS_PREVIEW || step === STEPS.MANUAL_PIN) {
        const isGPS = step === STEPS.GPS_PREVIEW;
        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={isGPS ? 'Xem trước vị trí GPS' : 'Chọn vị trí thửa đất'}
                size="xl"
            >
                <div className="space-y-3">
                    {/* Validation feedback */}
                    {validationError && (
                        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                            <FiAlertTriangle className="flex-shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}
                    {!validationError && pinPosition && containingRegion && (
                        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                            <FiCheck className="flex-shrink-0" />
                            <span>Vị trí hợp lệ! Vùng: <strong>{containingRegion.name}</strong>
                                {containingRegion.zoneCode && <span className="ml-1 font-mono text-xs bg-green-100 px-1 rounded">{containingRegion.zoneCode}</span>}
                            </span>
                        </div>
                    )}

                    {/* Map */}
                    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 380 }}>
                        <MapContainer
                            center={defaultCenter}
                            zoom={isGPS ? 16 : 13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="© OpenStreetMap contributors"
                            />

                            {/* Click handler */}
                            <MapClickHandler onPin={handlePin} />

                            {/* Regions overlay */}
                            {regions.map((r) => r.geometry && r.geometry.type !== 'Point' && (
                                <GeoJSON key={r._id} data={{ type: 'Feature', geometry: r.geometry, properties: { zoneType: r.zoneType } }} style={getRegionStyle} />
                            ))}

                            {/* Thửa đất đã được duyệt — hiển thị tham chiếu */}
                            {allFarms.map((f) => {
                                if (!f.geometry) return null;
                                if (f.geometry.type === 'Point') {
                                    const [lng, lat] = f.geometry.coordinates;
                                    return (
                                        <Marker key={f._id} position={[lat, lng]} icon={existingFarmIcon}>
                                        </Marker>
                                    );
                                }
                                return (
                                    <GeoJSON key={f._id} data={f.geometry} style={existingFarmStyle} />
                                );
                            })}

                            {/* GPS raw position indicator */}
                            {isGPS && gpsPosition && (
                                <Marker position={[gpsPosition.lat, gpsPosition.lng]} icon={gpsIcon} />
                            )}

                            {/* Selected pin marker */}
                            {pinPosition && (
                                <Marker position={[pinPosition.lat, pinPosition.lng]} icon={pinIcon} />
                            )}
                        </MapContainer>
                    </div>

                    <p className="text-xs text-gray-500">
                        {isGPS
                            ? '📍 Mốc xanh = vị trí của bạn. ⬜ Mốc xám = thửa đất đã có. Vùng xanh dương = vùng quy hoạch.'
                            : '📍 Nhấn vào bản đồ để đặt mốc. ⬜ Mốc xám = thửa đất đã có. Vùng xanh dương = vùng quy hoạch.'}
                    </p>

                    <div className="flex space-x-3">
                        <Button onClick={() => setStep(STEPS.SELECT_METHOD)} variant="secondary" className="flex-1">
                            Quay lại
                        </Button>
                        <Button
                            onClick={() => setStep(STEPS.FILL_INFO)}
                            disabled={!pinPosition || !!validationError}
                            variant="primary"
                            className="flex-1"
                        >
                            Tiếp tục
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    // ── STEP 3: Điền thông tin ────────────────────────────────────────────
    if (step === STEPS.FILL_INFO) {
        // Preview auto-name — định dạng mới: {zoneCode}-{farmerCode}-{seq}
        // farmerCode được backend tự sinh, frontend chỉ biết zoneCode
        const zoneCode = containingRegion?.zoneCode || 'KV-00';
        const previewName = `${zoneCode}-ND###-##`;

        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Thông tin thửa đất" size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Info banner */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 space-y-1">
                        <div className="flex items-center space-x-2">
                            <IconWheat />
                            <span>Vùng: <strong>{containingRegion?.name}</strong>
                                {containingRegion?.zoneCode && (
                                    <span className="ml-2 font-mono text-xs bg-green-100 px-1.5 py-0.5 rounded">{containingRegion.zoneCode}</span>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-green-700">
                            <FiMapPin />
                            <span>Tọa độ: {pinPosition?.lat.toFixed(6)}, {pinPosition?.lng.toFixed(6)}</span>
                        </div>
                    </div>

                    {/* Tên thửa đất (auto) */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-500 font-medium mb-0.5">Tên thửa đất (tự động)</p>
                        <p className="font-mono font-bold text-blue-800 text-sm">{previewName}</p>
                        <p className="text-xs text-blue-500 mt-1">
                            ND### = mã nông dân &nbsp;|&nbsp; ## = số thứ tự thửa — hệ thống tự gán
                        </p>
                    </div>

                    {/* Diện tích — nhập tay */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Diện tích thực tế (m²) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={form.area}
                            onChange={(e) => setForm({ ...form, area: e.target.value })}
                            className="input-field"
                            placeholder="VD: 500"
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1">Nhập diện tích đo thực tế hoặc theo giấy chứng nhận</p>
                    </div>

                    {/* Loại cây trồng */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại cây trồng</label>
                        <input
                            type="text"
                            value={form.cropType}
                            onChange={(e) => setForm({ ...form, cropType: e.target.value })}
                            className="input-field"
                            placeholder="VD: Lúa nước, Rau muống, Cà chua..."
                            required
                        />
                    </div>

                    {/* Mục đích */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích sử dụng đất</label>
                        <textarea
                            value={form.purpose}
                            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                            className="input-field"
                            rows={2}
                            placeholder="VD: Trồng lúa chất lượng cao theo tiêu chuẩn VietGAP..."
                            required
                        />
                    </div>

                    {/* Cam kết */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cam kết canh tác</label>
                        <textarea
                            value={form.commitment}
                            onChange={(e) => setForm({ ...form, commitment: e.target.value })}
                            className="input-field"
                            rows={2}
                            placeholder="VD: Cam kết tuân thủ quy định của HTX, không dùng hóa chất độc hại..."
                            required
                        />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                        Sau khi gửi, HTX sẽ xem xét và phê duyệt. Thửa đất xuất hiện trên bản đồ sau khi được duyệt.
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            onClick={() => setStep(step === STEPS.GPS_PREVIEW ? STEPS.GPS_PREVIEW : STEPS.MANUAL_PIN)}
                            variant="secondary"
                            className="flex-1"
                        >
                            Quay lại
                        </Button>
                        <Button type="submit" loading={submitting} variant="primary" className="flex-1">
                            Gửi yêu cầu
                        </Button>
                    </div>
                </form>
            </Modal>
        );
    }

    return null;
};

export default AddFarmModal;
