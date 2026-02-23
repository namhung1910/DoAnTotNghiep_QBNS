import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMap, FiPackage, FiMessageCircle, FiPlus, FiEye,
  FiAlertCircle
} from 'react-icons/fi';
import { GiFarmer } from 'react-icons/gi';
import { useAuth } from '../../context/AuthContext';
import { farmAPI, productAPI, contactAPI, notificationAPI, complaintAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import ChatBot from '../../components/chat/ChatBot';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState({ contacts: [], newCount: 0 });
  const [notifications, setNotifications] = useState([]);
  const [showRevocationModal, setShowRevocationModal] = useState(false);
  const [activeRevocation, setActiveRevocation] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ title: '', content: '' });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [farmsRes, productsRes, contactsRes, notificationRes] = await Promise.all([
        farmAPI.getMyFarms(),
        productAPI.getMyProducts({ limit: 100 }),
        contactAPI.getMyContacts({ limit: 100 }),
        notificationAPI.getMyNotifications()
      ]);

      setFarms(farmsRes.data || []);
      setProducts(productsRes.data.products || []);
      setContacts(contactsRes.data || { contacts: [], newCount: 0 });

      const notifs = notificationRes.data || [];
      setNotifications(notifs);

      // Check for unread revocation
      const revocation = notifs.find(n => n.type === 'revocation' && !n.isRead);
      if (revocation) {
        setActiveRevocation(revocation);
        setShowRevocationModal(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      planning: 'Đang quy hoạch',
      planting: 'Đang gieo trồng',
      growing: 'Đang phát triển',
      harvesting: 'Sắp thu hoạch',
      harvested: 'Đã thu hoạch',
      fallow: 'Nghỉ canh tác'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      planting: 'bg-yellow-100 text-yellow-800',
      growing: 'bg-green-100 text-green-800',
      harvesting: 'bg-red-100 text-red-800',
      harvested: 'bg-purple-100 text-purple-800',
      fallow: 'bg-gray-100 text-gray-600',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getProductStatusLabel = (status) => {
    const labels = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      sold_out: 'Hết hàng'
    };
    return labels[status] || status;
  };

  const handleDismissRevocation = async () => {
    try {
      if (activeRevocation) {
        await notificationAPI.markAsRead(activeRevocation._id);
      }
      setShowRevocationModal(false);
      setActiveRevocation(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error(error);
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

      toast.success('Đã gửi khiếu nại thành công');
      // Mark notification as read
      if (activeRevocation) {
        await notificationAPI.markAsRead(activeRevocation._id);
      }

      setShowRevocationModal(false);
      setActiveRevocation(null);
      setComplaintForm({ title: '', content: '' });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi gửi khiếu nại');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading) {
    return <Loading message="Đang tải dữ liệu..." />;
  }

  const stats = [
    {
      icon: FiMap,
      label: 'Thửa đất',
      value: farms.length,
      color: 'bg-blue-500'
    },
    {
      icon: FiPackage,
      label: 'Sản phẩm',
      value: products.length,
      color: 'bg-green-500'
    },
    {
      icon: FiMessageCircle,
      label: 'Yêu cầu mới',
      value: contacts.newCount || 0,
      color: 'bg-orange-500'
    },
    {
      icon: FiEye,
      label: 'Lượt xem',
      value: products.reduce((sum, p) => sum + (p.viewCount || 0), 0),
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <GiFarmer className="text-3xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Xin chào, {user?.fullName}!</h1>
              <p className="text-primary-100">Quản lý thửa đất và nông sản của bạn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="card">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/farmer/products/new" className="card hover:bg-primary-50 border-2 border-dashed border-primary-200 flex items-center justify-center space-x-2 text-primary-600">
            <FiPlus size={24} />
            <span className="font-semibold">Đăng sản phẩm mới</span>
          </Link>
          <Link to="/farmer/farms" className="card hover:bg-blue-50 flex items-center justify-center space-x-2 text-blue-600">
            <FiMap size={24} />
            <span className="font-semibold">Quản lý thửa đất</span>
          </Link>
          <Link to="/farmer/contacts" className="card hover:bg-orange-50 flex items-center justify-center space-x-2 text-orange-600 relative">
            <FiMessageCircle size={24} />
            <span className="font-semibold">Xem yêu cầu liên hệ</span>
            {contacts.newCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                {contacts.newCount}
              </span>
            )}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Farms */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Thửa đất của tôi</h2>
              <Link to="/farmer/farms" className="text-primary-600 text-sm hover:underline">
                Xem tất cả
              </Link>
            </div>

            {farms.length > 0 ? (
              <div className="space-y-3">
                {farms.slice(0, 5).map((farm) => (
                  <div key={farm._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{farm.name || farm.cropType}</p>
                      <p className="text-sm text-gray-500">{farm.area?.toLocaleString()} m²</p>
                    </div>
                    <span className={`badge ${getStatusColor(farm.status)}`}>
                      {getStatusLabel(farm.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiMap className="mx-auto text-4xl mb-2 opacity-50" />
                <p>Chưa có thửa đất nào được giao</p>
              </div>
            )}
          </div>

          {/* My Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sản phẩm của tôi</h2>
              <Link to="/farmer/products" className="text-primary-600 text-sm hover:underline">
                Xem tất cả
              </Link>
            </div>

            {products.length > 0 ? (
              <div className="space-y-3">
                {products.slice(0, 5).map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0].startsWith('http') ? product.images[0] : `${import.meta.env.VITE_API_URL}${product.images[0]}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🌾</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.productName}</p>
                        <p className="text-sm text-primary-600 font-semibold">
                          {product.price?.toLocaleString()}đ/{product.unit || 'kg'}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${getStatusColor(product.status)}`}>
                      {getProductStatusLabel(product.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiPackage className="mx-auto text-4xl mb-2 opacity-50" />
                <p>Chưa có sản phẩm nào</p>
                <Link to="/farmer/products/new" className="btn-primary mt-4 inline-flex">
                  <FiPlus className="mr-2" />
                  Đăng sản phẩm
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Contact Requests */}
        <div className="card mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Yêu cầu liên hệ gần đây</h2>
            <Link to="/farmer/contacts" className="text-primary-600 text-sm hover:underline">
              Xem tất cả
            </Link>
          </div>

          {contacts.contacts?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Khách hàng</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Sản phẩm</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SĐT</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.contacts.slice(0, 5).map((contact) => (
                    <tr key={contact._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{contact.customerName}</td>
                      <td className="py-3 px-4 text-gray-600">{contact.productId?.productName || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-600">{contact.customerPhone}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${contact.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            contact.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              contact.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {contact.status === 'new' ? 'Mới' :
                            contact.status === 'contacted' ? 'Đã liên hệ' :
                              contact.status === 'completed' ? 'Hoàn thành' : contact.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {new Date(contact.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiMessageCircle className="mx-auto text-4xl mb-2 opacity-50" />
              <p>Chưa có yêu cầu liên hệ nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Chatbot */}
      <ChatBot chatType="farmer" />

      {/* Revocation Alert Modal */}
      <Modal
        isOpen={showRevocationModal}
        onClose={() => { }} // Force user to choose action
        title="Thông báo quan trọng"
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

          <div className="pt-4">
            <h4 className="font-semibold text-gray-900 mb-2">Bạn có muốn gửi khiếu nại?</h4>
            <form onSubmit={handleSubmitComplaint} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Tiêu đề khiếu nại"
                  className="input-field"
                  value={complaintForm.title}
                  onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                />
              </div>
              <div>
                <textarea
                  placeholder="Nội dung chi tiết & lý do phản đối..."
                  className="input-field h-24"
                  value={complaintForm.content}
                  onChange={(e) => setComplaintForm({ ...complaintForm, content: e.target.value })}
                />
              </div>
            </form>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleDismissRevocation}
              className="btn text-gray-600 hover:bg-gray-100"
            >
              Tôi đã hiểu (Đóng)
            </button>
            <button
              onClick={handleSubmitComplaint}
              disabled={submittingComplaint}
              className="btn-primary"
            >
              {submittingComplaint ? 'Đang gửi...' : 'Gửi khiếu nại'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FarmerDashboard;
