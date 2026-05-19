import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiFileText, FiMap, FiMapPin } from 'react-icons/fi';
import { landRequestAPI, farmAPI, regionAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import L from 'leaflet';
import Button from '../../components/common/Button';

// Màu vùng quy hoạch — dùng chung với MapView
const ZONE_COLORS = {
  VLT: { fill: '#fef08a', border: '#ca8a04' },
  VCN: { fill: '#fed7aa', border: '#c2410c' },
  VAR: { fill: '#bbf7d0', border: '#16a34a' },
  default: { fill: '#bbf7d0', border: '#16a34a' },
};

const getRegionStyle = (feature) => {
  const zoneType = feature?.properties?.zoneType || 'default';
  const colors = ZONE_COLORS[zoneType] || ZONE_COLORS.default;
  return {
    fillColor: colors.fill,
    fillOpacity: 0.4,
    color: colors.border,
    weight: 2,
    dashArray: '5, 5'
  };
};

const pinIcon = new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)"><svg width="28" height="36" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2C9.373 2 4 7.373 4 14c0 9.333 12 24 12 24S28 23.333 28 14C28 7.373 22.627 2 16 2z" fill="#22c55e" stroke="white" stroke-width="2"/><circle cx="16" cy="14" r="5" fill="white"/></svg></div>`,
    iconSize: [28, 36], iconAnchor: [0, 0], className: ''
});

const LandRequestsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Reject Modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // Map preview modal
    const [showMapModal, setShowMapModal] = useState(false);
    const [previewFarm, setPreviewFarm] = useState(null);
    const [previewRegions, setPreviewRegions] = useState(null); // Vùng quy hoạch cho bản đồ preview

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await landRequestAPI.getAll({ status: 'pending' });
            setRequests(res.data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    // Duyệt yêu cầu
    const handleApprove = async (request) => {
        if (!request.assignedFarm) {
            toast.error('Yêu cầu này chưa có thông tin thửa đất để duyệt.');
            return;
        }
        try {
            setProcessing(true);
            const farmId = request.assignedFarm?._id || request.assignedFarm;
            // (1) Duyệt farm → backend cũng sẽ update LandRequest sang approved
            await farmAPI.approve(farmId, { note: 'Đã được HTX chấp nhận' });
            // (2) Đảm bảo LandRequest.status được cập nhật (fallback)
            await landRequestAPI.updateStatus(request._id, {
                status: 'approved',
                responseNote: 'Đã được HTX chấp nhận'
            });
            toast.success('Đã chấp nhận yêu cầu! Thửa đất đã được phê duyệt.');
            fetchRequests();
        } catch (error) {
            console.error('Error approving:', error);
            toast.error('Có lỗi xảy ra khi duyệt');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        try {
            setProcessing(true);
            if (selectedRequest.assignedFarm) {
                const farmId = selectedRequest.assignedFarm?._id || selectedRequest.assignedFarm;
                await farmAPI.reject(farmId, { reason: rejectReason });
            } else {
                await landRequestAPI.updateStatus(selectedRequest._id, {
                    status: 'rejected',
                    responseNote: rejectReason
                });
            }
            toast.success('Đã từ chối yêu cầu. Nông dân sẽ nhận được thông báo.');
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedRequest(null);
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            // Nếu lỗi xảy ra sau khi action đã được thực thi (ví dụ: lỗi notification)
            // thì vẫn đóng modal và refresh để tránh admin bị stuck
            const msg = error.response?.data?.message || '';
            if (error.response?.status === 500 && !msg) {
                toast.success('Đã từ chối yêu cầu (thông báo có thể bị trễ).');
                setShowRejectModal(false);
                setRejectReason('');
                setSelectedRequest(null);
                fetchRequests();
            } else {
                toast.error('Có lỗi xảy ra: ' + (msg || error.message));
            }
        } finally {
            setProcessing(false);
        }
    };

    const openMapPreview = async (request) => {
        setPreviewFarm(request);
        setShowMapModal(true);
        // Load vùng quy hoạch để hiển thị trên bản đồ preview (nếu chưa load)
        if (!previewRegions) {
            try {
                const res = await regionAPI.getGeoJSON();
                setPreviewRegions(res.data);
            } catch (e) {
                console.warn('Không thể tải vùng quy hoạch cho bản đồ preview:', e.message);
            }
        }
    };

    if (loading) return <Loading fullScreen={false} />;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Yêu cầu cấp đất</h1>
                <p className="text-gray-600">Duyệt đơn đăng ký thửa đất từ nông dân</p>
            </div>

            {requests.length === 0 ? (
                <div className="card text-center py-12">
                    <FiFileText className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">Không có yêu cầu mới</h3>
                    <p className="text-gray-500">Hiện tại không có đơn đăng ký thửa đất nào đang chờ duyệt.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map((request) => (
                        <div key={request._id} className="card">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    {/* Farmer info */}
                                    <div className="flex items-center space-x-3 mb-3">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {request.user?.fullName}
                                        </h3>
                                        <span className="text-sm text-gray-500">(@{request.user?.username})</span>
                                        <span className="badge bg-yellow-100 text-yellow-800">Chờ duyệt</span>
                                    </div>

                                    {/* Farm info — lấy từ assignedFarm (populated) */}
                                    {(request.assignedFarm || request.cropType) && (
                                        <div className="flex flex-wrap gap-3 mb-3">
                                            {request.assignedFarm?.name && (
                                                <span className="flex items-center space-x-1 text-sm bg-green-50 text-green-800 px-3 py-1 rounded-full">
                                                    <FiMapPin size={12} />
                                                    <span>{request.assignedFarm.name}</span>
                                                </span>
                                            )}
                                            {(request.assignedFarm?.cropType || request.cropType) && (
                                                <span className="text-sm bg-blue-50 text-blue-800 px-3 py-1 rounded-full">
                                                    🌱 {request.assignedFarm?.cropType || request.cropType}
                                                </span>
                                            )}
                                            {(request.assignedFarm?.area || request.requestedArea) > 0 && (
                                                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                                                    📐 {(request.assignedFarm?.area || request.requestedArea).toLocaleString()} m²
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Purpose & commitment */}
                                    <div className="grid md:grid-cols-2 gap-4 mt-3">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-medium text-gray-700 mb-1">Mục đích sử dụng:</h4>
                                            <p className="text-gray-600 text-sm whitespace-pre-line">{request.purpose}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-medium text-gray-700 mb-1">Cam kết:</h4>
                                            <p className="text-gray-600 text-sm whitespace-pre-line">{request.commitment}</p>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-400">
                                        Ngày gửi: {new Date(request.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex md:flex-col justify-center gap-3 min-w-[160px]">
                                    {/* Preview map if farm has geometry */}
                                    {request.assignedFarm?.geometry && (
                                        <Button
                                            onClick={() => openMapPreview(request)}
                                            variant="secondary"
                                            icon={FiMap}
                                            className="w-full text-sm !border-blue-200 !text-blue-600 hover:!bg-blue-50"
                                        >
                                            Xem bản đồ
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => handleApprove(request)}
                                        loading={processing}
                                        variant="primary"
                                        icon={FiCheck}
                                        className="w-full"
                                    >
                                        Chấp nhận
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setSelectedRequest(request);
                                            setRejectReason('');
                                            setShowRejectModal(true);
                                        }}
                                        variant="secondary"
                                        icon={FiX}
                                        className="w-full !border-red-200 !text-red-600 hover:!bg-red-50"
                                    >
                                        Từ chối
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Map Preview Modal */}
            <Modal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                title="Xem trước vị trí thửa đất"
                size="xl"
            >
                {previewFarm && previewFarm.assignedFarm && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-sm">
                            <span className="bg-green-50 text-green-800 px-3 py-1 rounded-full">{previewFarm.assignedFarm.name || 'Thửa đất'}</span>
                            <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full">{previewFarm.assignedFarm.cropType || previewFarm.cropType || 'N/A'}</span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{(previewFarm.assignedFarm.area || previewFarm.requestedArea)?.toLocaleString()} m²</span>
                        </div>
                        <div style={{ height: 400 }} className="rounded-xl overflow-hidden border border-gray-200">
                            <MapContainer
                                center={
                                    previewFarm.assignedFarm.geometry?.type === 'Point'
                                        ? [previewFarm.assignedFarm.geometry.coordinates[1], previewFarm.assignedFarm.geometry.coordinates[0]]
                                        : [20.4167, 106.3833]
                                }
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution="© OpenStreetMap contributors"
                                />
                                {/* Vùng quy hoạch — layer dưới cùng */}
                                {previewRegions && (
                                    <GeoJSON
                                        key="preview-regions"
                                        data={previewRegions}
                                        style={getRegionStyle}
                                        interactive={false}
                                    />
                                )}
                                {/* Thửa đất nông dân đã chọn */}
                                {previewFarm.assignedFarm.geometry?.type === 'Point' ? (
                                    <Marker
                                        position={[
                                            previewFarm.assignedFarm.geometry.coordinates[1],
                                            previewFarm.assignedFarm.geometry.coordinates[0]
                                        ]}
                                        icon={pinIcon}
                                    />
                                ) : previewFarm.assignedFarm.geometry ? (
                                    <GeoJSON
                                        data={previewFarm.assignedFarm.geometry}
                                        style={{ color: '#22c55e', weight: 3, fillOpacity: 0.4 }}
                                    />
                                ) : null}
                            </MapContainer>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <p>📍 Dấu mốc xanh = vị trí thửa đất nông dân đã đánh dấu</p>
                            <p>🗺️ Các vùng màu = vùng quy hoạch nông nghiệp</p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                title="Từ chối yêu cầu"
                size="md"
            >
                <form onSubmit={handleReject} className="space-y-4">
                    <p className="text-gray-600">
                        Bạn có chắc chắn muốn từ chối yêu cầu này? Vui lòng nhập lý do.
                    </p>
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="input-field"
                        rows={3}
                        placeholder="Lý do từ chối..."
                        required
                    />
                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="button"
                            onClick={() => setShowRejectModal(false)}
                            variant="secondary"
                            className="flex-1"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            loading={processing}
                            variant="danger"
                            className="flex-1"
                        >
                            Xác nhận từ chối
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
export default LandRequestsPage;
