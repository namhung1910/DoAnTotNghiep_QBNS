import { useState, useEffect, useRef } from 'react';
import { FiBell, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { notificationAPI, complaintAPI } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Modal state for complaint
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [activeRevocation, setActiveRevocation] = useState(null);
    const [complaintForm, setComplaintForm] = useState({ title: '', content: '' });
    const [submittingComplaint, setSubmittingComplaint] = useState(false);

    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await notificationAPI.getMyNotifications();
            const notifs = res.data || [];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Lỗi khi lấy thông báo:', error);
        }
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            fetchNotifications();
        }
    };

    const markAsRead = async (id) => {
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.isRead) {
            markAsRead(notif._id);
        }

        if (notif.type === 'revocation') {
            setActiveRevocation(notif);
            setShowComplaintModal(true);
            setIsOpen(false);
        }
    };

    const handleSubmitComplaint = async (e) => {
        e.preventDefault();
        if (!complaintForm.title || !complaintForm.content) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            setSubmittingComplaint(true);
            await complaintAPI.create({
                ...complaintForm,
                relatedFarm: activeRevocation.relatedId
            });

            toast.success('Đã gửi khiếu nại thành công lên HTX');
            setShowComplaintModal(false);
            setActiveRevocation(null);
            setComplaintForm({ title: '', content: '' });
            fetchNotifications();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi gửi khiếu nại');
        } finally {
            setSubmittingComplaint(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'revocation': return <FiAlertCircle className="text-red-500" />;
            case 'approval': return <FiCheckCircle className="text-green-500" />;
            case 'system': return <FiInfo className="text-blue-500" />;
            default: return <FiInfo className="text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
            >
                <FiBell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Thông báo</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs bg-primary-100 text-primary-700 font-medium px-2 py-1 rounded-full">
                                {unreadCount} mới
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <FiBell className="mx-auto text-3xl mb-2 opacity-30" />
                                <p>Không có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif._id}
                                        className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 text-lg">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${!notif.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(notif.createdAt).toLocaleString('vi-VN')}
                                                </p>

                                                {notif.type === 'revocation' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleNotificationClick(notif);
                                                        }}
                                                        className="mt-2 text-sm text-primary-600 font-medium hover:text-primary-700 hover:underline"
                                                    >
                                                        Viết khiếu nại
                                                    </button>
                                                )}
                                                {notif.type !== 'revocation' && !notif.isRead && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notif._id);
                                                        }}
                                                        className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        Đánh dấu đã đọc
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal
                isOpen={showComplaintModal}
                onClose={() => setShowComplaintModal(false)}
                title="Gửi Khiếu Nại Suy Xét Thu Hồi"
                size="md"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3">
                        <FiAlertCircle className="flex-shrink-0 text-xl mt-1" />
                        <div>
                            <h4 className="font-bold">Đất canh tác đã bị thu hồi</h4>
                            <p className="text-sm mt-1">{activeRevocation?.message}</p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <h4 className="font-semibold text-gray-900 mb-2">Thông tin khiếu nại</h4>
                        <p className="text-xs text-gray-500 mb-3">Đơn khiếu nại của bạn sẽ được gửi thẳng đến Hợp tác xã để xem xét. Xin hãy giải thích rõ lý do.</p>
                        <form onSubmit={handleSubmitComplaint} className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Tiêu đề khiếu nại (VD: Đề nghị xem xét lại quyết định)"
                                    className="input-field w-full"
                                    value={complaintForm.title}
                                    onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <textarea
                                    placeholder="Nội dung chi tiết & lý do phản đối..."
                                    className="input-field w-full h-28"
                                    value={complaintForm.content}
                                    onChange={(e) => setComplaintForm({ ...complaintForm, content: e.target.value })}
                                />
                            </div>
                        </form>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setShowComplaintModal(false)}
                            className="btn text-gray-600 hover:bg-gray-100"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmitComplaint}
                            disabled={submittingComplaint}
                            className="btn-primary"
                        >
                            {submittingComplaint ? 'Đang gửi...' : 'Gửi đơn khiếu nại'}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default NotificationBell;
