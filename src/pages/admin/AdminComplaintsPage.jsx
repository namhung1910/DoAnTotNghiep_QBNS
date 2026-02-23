import { useState, useEffect } from 'react';
import { FiMessageSquare, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { complaintAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const AdminComplaintsPage = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [responseForm, setResponseForm] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await complaintAPI.getAll();
            setComplaints(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (status) => {
        if (!responseForm.trim()) {
            toast.error('Vui lòng nhập nội dung phản hồi');
            return;
        }

        try {
            setProcessing(true);
            await complaintAPI.resolve(selectedComplaint._id, {
                status,
                response: responseForm
            });
            toast.success('Đã xử lý khiếu nại');
            setSelectedComplaint(null);
            setResponseForm('');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi xử lý');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <Loading fullScreen={false} message="Đang tải khiếu nại..." />;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Giải quyết khiếu nại</h1>
            <p className="text-gray-600 mb-6">Quản lý và phản hồi các khiếu nại từ nông dân</p>

            <div className="grid gap-4">
                {complaints.length === 0 ? (
                    <div className="card text-center py-12">
                        <FiMessageSquare className="mx-auto text-4xl text-gray-300 mb-4" />
                        <p className="text-gray-500">Chưa có khiếu nại nào</p>
                    </div>
                ) : (
                    complaints.map(c => (
                        <div key={c._id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedComplaint(c)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`badge ${c.status === 'pending' ? 'badge-warning' :
                                                c.status === 'resolved' ? 'badge-success' : 'badge-error'
                                            }`}>
                                            {c.status === 'pending' ? 'Chờ xử lý' :
                                                c.status === 'resolved' ? 'Đã giải quyết' : 'Đã từ chối'}
                                        </span>
                                        <span className="text-sm text-gray-500 flex items-center">
                                            <FiClock className="mr-1" />
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-lg">{c.title}</h3>
                                    <p className="text-gray-600 line-clamp-2">{c.content}</p>
                                    <p className="text-sm text-blue-600 mt-2">
                                        Người gửi: {c.user?.fullName} ({c.user?.username})
                                        {c.relatedFarm && <span className="ml-2">• Thửa đất: {c.relatedFarm.name}</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={!!selectedComplaint}
                onClose={() => setSelectedComplaint(null)}
                title="Chi tiết khiếu nại"
                size="lg"
            >
                {selectedComplaint && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-900 mb-2">{selectedComplaint.title}</h4>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedComplaint.content}</p>
                            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                                <p>Người gửi: {selectedComplaint.user?.fullName}</p>
                                <p>Thời gian: {new Date(selectedComplaint.createdAt).toLocaleString()}</p>
                            </div>
                        </div>

                        {selectedComplaint.status === 'pending' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phản hồi của HTX</label>
                                <textarea
                                    className="input-field h-32"
                                    value={responseForm}
                                    onChange={(e) => setResponseForm(e.target.value)}
                                    placeholder="Nhập nội dung phản hồi..."
                                />
                                <div className="flex justify-end space-x-3 mt-4">
                                    <button
                                        onClick={() => handleResolve('rejected')}
                                        disabled={processing}
                                        className="btn bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                        <FiX className="mr-2" /> Từ chối
                                    </button>
                                    <button
                                        onClick={() => handleResolve('resolved')}
                                        disabled={processing}
                                        className="btn-primary"
                                    >
                                        <FiCheck className="mr-2" /> Giải quyết
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h5 className="font-semibold text-blue-800 mb-1">Phản hồi từ HTX</h5>
                                <p className="text-blue-900">{selectedComplaint.response}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminComplaintsPage;
