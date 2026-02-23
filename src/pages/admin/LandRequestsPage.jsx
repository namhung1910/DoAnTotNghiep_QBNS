import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { FiCheck, FiX, FiFileText, FiMap } from 'react-icons/fi';
import { landRequestAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

const LandRequestsPage = () => {
    const navigate = useNavigate(); // Initialize useNavigate
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Reject Modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

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

    const handleApprove = (request) => {
        // When approving, we redirect to the Regions Map to create/assign a plot
        // We pass the requestId and userId via state or query params
        toast.success('Đã chấp nhận yêu cầu. Đang chuyển đến bản đồ để giao đất...');

        // Use navigate to go to regions page with state
        navigate('/admin/regions', {
            state: {
                assignMode: true,
                requestId: request._id,
                user: request.user
            }
        });
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectReason) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        try {
            setProcessing(true);
            await landRequestAPI.updateStatus(selectedRequest._id, {
                status: 'rejected',
                responseNote: rejectReason
            });
            toast.success('Đã từ chối yêu cầu');
            setShowRejectModal(false);
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <Loading fullScreen={false} />;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Yêu cầu cấp đất</h1>
                <p className="text-gray-600">Duyệt các đơn xin cấp đất canh tác từ nông dân</p>
            </div>

            {requests.length === 0 ? (
                <div className="card text-center py-12">
                    <FiFileText className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">Không có yêu cầu mới</h3>
                    <p className="text-gray-500">Hiện tại không có đơn xin cấp đất nào đang chờ duyệt.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map((request) => (
                        <div key={request._id} className="card">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {request.user?.fullName}
                                        </h3>
                                        <span className="text-sm text-gray-500">(@{request.user?.username})</span>
                                        <span className="badge bg-yellow-100 text-yellow-800">Chờ duyệt</span>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 mt-4">
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

                                <div className="flex md:flex-col justify-center gap-3 min-w-[150px]">
                                    <button
                                        onClick={() => handleApprove(request)}
                                        className="btn-primary flex items-center justify-center space-x-2 w-full"
                                    >
                                        <FiCheck />
                                        <span>Duyệt & Giao đất</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedRequest(request);
                                            setRejectReason('');
                                            setShowRejectModal(true);
                                        }}
                                        className="btn px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center space-x-2 w-full transition-colors"
                                    >
                                        <FiX />
                                        <span>Từ chối</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                        <button
                            type="button"
                            onClick={() => setShowRejectModal(false)}
                            className="flex-1 btn-secondary"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 btn bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center"
                        >
                            {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
export default LandRequestsPage;
