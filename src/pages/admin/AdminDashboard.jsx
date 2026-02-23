import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiMap, FiUsers, FiPackage, FiGrid, FiUpload, FiCheckCircle,
  FiTrendingUp, FiBarChart2, FiPieChart, FiActivity
} from 'react-icons/fi';
import { GiWheat, GiFarmer, GiPlantRoots } from 'react-icons/gi';
import { useAuth } from '../../context/AuthContext';
import { statisticsAPI, productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import ChatBot from '../../components/chat/ChatBot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes] = await Promise.all([
        statisticsAPI.getOverview(),
        productAPI.getPending({ limit: 5 })
      ]);
      
      setStats(statsRes.data);
      setPendingProducts(pendingRes.data.products || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Đang tải dữ liệu..." />;
  }

  const overviewCards = [
    { 
      icon: FiUsers, 
      label: 'Nông dân', 
      value: stats?.users?.totalFarmers || 0,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users'
    },
    { 
      icon: FiMap, 
      label: 'Vùng quy hoạch', 
      value: stats?.regions?.total || 0,
      color: 'from-green-500 to-green-600',
      link: '/admin/regions'
    },
    { 
      icon: GiPlantRoots, 
      label: 'Thửa đất', 
      value: stats?.farms?.total || 0,
      color: 'from-earth-500 to-earth-600',
      link: '/admin/farms'
    },
    { 
      icon: FiPackage, 
      label: 'Sản phẩm', 
      value: stats?.products?.total || 0,
      subValue: `${stats?.products?.pending || 0} chờ duyệt`,
      color: 'from-orange-500 to-orange-600',
      link: '/admin/products'
    }
  ];

  const quickActions = [
    { icon: FiUpload, label: 'Upload GeoJSON', link: '/admin/regions/upload', color: 'text-blue-600 bg-blue-50' },
    { icon: FiMap, label: 'Vẽ vùng mới', link: '/admin/regions/draw', color: 'text-green-600 bg-green-50' },
    { icon: GiFarmer, label: 'Giao đất', link: '/admin/farms/assign', color: 'text-purple-600 bg-purple-50' },
    { icon: FiCheckCircle, label: 'Duyệt bài đăng', link: '/admin/products/pending', color: 'text-orange-600 bg-orange-50' }
  ];

  // Prepare chart data
  const statusChartData = stats?.farms?.byStatus?.map(item => ({
    name: getStatusLabel(item._id),
    value: item.count,
    area: item.totalArea
  })) || [];

  const cropChartData = stats?.farms?.byCrop?.slice(0, 5).map(item => ({
    name: item._id,
    area: item.totalArea / 10000 // Convert to hectares
  })) || [];

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#6b7280'];

  function getStatusLabel(status) {
    const labels = {
      planning: 'Quy hoạch',
      planting: 'Gieo trồng',
      growing: 'Phát triển',
      harvesting: 'Thu hoạch',
      harvested: 'Đã thu hoạch',
      fallow: 'Nghỉ'
    };
    return labels[status] || status;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <GiWheat className="text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bảng điều khiển Hợp tác xã</h1>
                <p className="text-primary-100">Chào mừng, {user?.fullName}!</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-white/10 rounded-xl px-4 py-2">
              <FiActivity className="text-primary-200" />
              <span className="text-sm">Tổng diện tích: {((stats?.farms?.totalArea || 0) / 10000).toFixed(2)} ha</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {overviewCards.map((card, idx) => (
            <Link key={idx} to={card.link} className="card group hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center text-white shadow-lg`}>
                  <card.icon size={24} />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  {card.subValue && (
                    <p className="text-xs text-orange-500 font-medium">{card.subValue}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, idx) => (
            <Link 
              key={idx} 
              to={action.link}
              className={`card flex items-center space-x-3 ${action.color} hover:shadow-lg transition-all`}
            >
              <action.icon size={24} />
              <span className="font-medium">{action.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Farm Status Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FiPieChart className="mr-2 text-primary-500" />
              Trạng thái mùa vụ
            </h3>
            {statusChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Chưa có dữ liệu
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Crop Area Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FiBarChart2 className="mr-2 text-primary-500" />
              Diện tích theo loại cây (ha)
            </h3>
            {cropChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cropChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="area" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Pending Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiCheckCircle className="mr-2 text-orange-500" />
              Sản phẩm chờ duyệt
            </h3>
            <Link to="/admin/products/pending" className="text-primary-600 text-sm hover:underline">
              Xem tất cả ({stats?.products?.pending || 0})
            </Link>
          </div>
          
          {pendingProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Sản phẩm</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nông dân</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Giá</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Chứng nhận</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ngày đăng</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProducts.map((product) => (
                    <tr key={product._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                            {product.images?.[0] ? (
                              <img 
                                src={product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000${product.images[0]}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">🌾</div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{product.productName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{product.farmerId?.fullName || 'N/A'}</td>
                      <td className="py-3 px-4 text-primary-600 font-semibold">
                        {product.price?.toLocaleString()}đ/{product.unit}
                      </td>
                      <td className="py-3 px-4">
                        {product.certification && product.certification !== 'Không có' ? (
                          <span className="badge-success">{product.certification}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {new Date(product.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <Link 
                          to={`/admin/products/${product._id}/review`}
                          className="btn-primary text-sm py-1.5 px-3"
                        >
                          Xem xét
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiCheckCircle className="mx-auto text-4xl mb-2 text-green-500" />
              <p>Không có sản phẩm nào đang chờ duyệt</p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100">Tổng diện tích quy hoạch</p>
                <p className="text-3xl font-bold mt-1">
                  {((stats?.regions?.totalArea || 0) / 10000).toFixed(2)} ha
                </p>
              </div>
              <FiMap className="text-5xl opacity-30" />
            </div>
          </div>
          
          <div className="card bg-gradient-to-br from-harvest-500 to-harvest-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-harvest-100">Diện tích đang canh tác</p>
                <p className="text-3xl font-bold mt-1">
                  {((stats?.farms?.totalArea || 0) / 10000).toFixed(2)} ha
                </p>
              </div>
              <GiPlantRoots className="text-5xl opacity-30" />
            </div>
          </div>
          
          <div className="card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Lượt quan tâm mới</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.contacts?.new || 0}
                </p>
              </div>
              <FiTrendingUp className="text-5xl opacity-30" />
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot */}
      <ChatBot chatType="admin" />
    </div>
  );
};

export default AdminDashboard;

