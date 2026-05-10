import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMap, FiUsers, FiPackage, FiUpload, FiCheckCircle,
  FiTrendingUp, FiBarChart2, FiPieChart, FiActivity, FiLayers,
  FiFileText, FiClock, FiAlertCircle, FiArrowRight
} from 'react-icons/fi';
import { IconWheat } from '../../components/icons/AgriIcons';
import { useAuth } from '../../context/AuthContext';
import { statisticsAPI, productAPI, landRequestAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import WeatherWidget from '../../components/common/WeatherWidget';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { getImageUrl } from '../../utils/format';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#6b7280'];

const STATUS_LABELS = {
  planning: 'Quy hoạch',
  planting: 'Gieo trồng',
  growing: 'Phát triển',
  harvesting: 'Thu hoạch',
  harvested: 'Đã thu hoạch',
  fallow: 'Bỏ nghỉ'
};

// Custom tooltip cho PieChart
const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-2 text-sm">
        <p className="font-semibold text-gray-800">{d.name}</p>
        <p className="text-gray-600">{d.value} thửa</p>
        {d.area > 0 && (
          <p className="text-primary-600">{(d.area / 10000).toFixed(2)} ha</p>
        )}
      </div>
    );
  }
  return null;
};

// Custom tooltip cho BarChart
const BarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-2 text-sm">
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-primary-600">{payload[0].value} ha</p>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingLandRequests, setPendingLandRequests] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes, landRes] = await Promise.all([
        statisticsAPI.getOverview(),
        productAPI.getPending({ limit: 4 }),
        landRequestAPI.getAll({ status: 'pending', limit: 5 })
      ]);

      setStats(statsRes.data);
      setPendingProducts(pendingRes.data.products || []);
      // API returns array directly (not wrapped in {requests:[]})
      const landData = Array.isArray(landRes.data) ? landRes.data : (landRes.data?.requests || []);
      setPendingLandRequests(landData);
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
      bg: 'bg-blue-50',
      link: '/admin/users'
    },
    {
      icon: FiMap,
      label: 'Vùng quy hoạch',
      value: stats?.regions?.total || 0,
      sub: `${((stats?.regions?.totalArea || 0) / 10000).toFixed(1)} ha`,
      subColor: 'text-green-600',
      color: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      link: '/admin/regions'
    },
    {
      icon: FiLayers,
      label: 'Thửa đất',
      value: stats?.farms?.total || 0,
      sub: `${((stats?.farms?.totalArea || 0) / 10000).toFixed(2)} ha đang canh tác`,
      subColor: 'text-amber-600',
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      link: '/admin/farms'
    },
    {
      icon: FiPackage,
      label: 'Sản phẩm',
      value: stats?.products?.total || 0,
      sub: stats?.products?.pending > 0 ? `${stats.products.pending} chờ duyệt` : 'Đã cập nhật',
      subColor: stats?.products?.pending > 0 ? 'text-red-500 font-semibold' : 'text-gray-400',
      color: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-50',
      link: '/admin/products'
    }
  ];

  const quickActions = [
    { icon: FiUpload, label: 'Upload GeoJSON', link: '/admin/regions/upload', color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: FiMap, label: 'Vẽ vùng mới', link: '/admin/regions/draw', color: 'bg-green-500 hover:bg-green-600' },
    { icon: FiUsers, label: 'Giao đất', link: '/admin/farms/assign', color: 'bg-purple-500 hover:bg-purple-600' },
    { icon: FiCheckCircle, label: 'Duyệt sản phẩm', link: '/admin/products/pending', color: 'bg-orange-500 hover:bg-orange-600' }
  ];

  // ✅ BUG FIX: was item.totalArea (undefined), correct field is item.area
  const cropChartData = (stats?.farms?.byCrop || [])
    .filter(item => item._id) // Bỏ null cropType
    .slice(0, 6)
    .map(item => ({
      name: item._id,
      area: Math.round((item.area / 10000) * 100) / 100
    }));

  const statusChartData = (stats?.farms?.byStatus || []).map(item => ({
    name: STATUS_LABELS[item._id] || item._id,
    value: item.count,
    area: item.area || 0
  }));

  const totalFarmArea = ((stats?.farms?.totalArea || 0) / 10000).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <IconWheat className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Bảng điều khiển Hợp tác xã</h1>
                <p className="text-primary-200 text-sm">Chào mừng, {user?.fullName}!</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-primary-200 text-xs">Tổng DT canh tác</p>
                <p className="font-bold text-lg">{totalFarmArea} ha</p>
              </div>
              <div className="text-center">
                <p className="text-primary-200 text-xs">Sản lượng tích lũy</p>
                <p className="font-bold text-lg">{((stats?.farms?.totalYield || 0) / 1000).toFixed(1)} tấn</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── ROW 1: KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overviewCards.map((card, idx) => (
            <Link key={idx} to={card.link} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-sm`}>
                  <card.icon size={18} />
                </div>
                <FiArrowRight size={14} className="text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              {card.sub && (
                <p className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
              )}
            </Link>
          ))}
        </div>

        {/* ── ROW 2: Weather + Quick Actions (side by side) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weather: chiếm 2/3 */}
          <div className="lg:col-span-2">
            <WeatherWidget />
          </div>

          {/* Quick Actions: chiếm 1/3 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Thao tác nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <Link
                  key={idx}
                  to={action.link}
                  className={`${action.color} text-white rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 transition-colors`}
                >
                  <action.icon size={20} />
                  <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 3: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie: Trạng thái mùa vụ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <FiPieChart className="mr-2 text-primary-500" />
              Phân bố trạng thái mùa vụ
            </h3>
            {statusChartData.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                  {statusChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-xs text-gray-600">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span>{item.name}: <strong>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-gray-400">
                <FiPieChart size={40} className="opacity-20 mb-2" />
                <p className="text-sm">Chưa có dữ liệu</p>
              </div>
            )}
          </div>

          {/* Bar: Diện tích theo loại cây (FIXED) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <FiBarChart2 className="mr-2 text-primary-500" />
              Diện tích theo loại cây (ha)
            </h3>
            {cropChartData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cropChartData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="name" type="category" width={80}
                      tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: '#F0FDF4' }} />
                    <Bar dataKey="area" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      <LabelList dataKey="area" position="right" style={{ fontSize: 11, fill: '#6B7280' }} formatter={(v) => `${v} ha`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400">
                <FiBarChart2 size={40} className="opacity-20 mb-2" />
                <p className="text-sm">Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 4: Pending Panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Panel: Yêu cầu cấp đất chờ duyệt */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <FiFileText className="mr-2 text-amber-500" />
                Yêu cầu cấp đất chờ duyệt
                {pendingLandRequests.length > 0 && (
                  <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingLandRequests.length}
                  </span>
                )}
              </h3>
              <Link to="/admin/land-requests" className="text-xs text-primary-600 hover:underline flex items-center">
                Xem tất cả <FiArrowRight size={12} className="ml-1" />
              </Link>
            </div>

            {pendingLandRequests.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {pendingLandRequests.slice(0, 5).map((req) => (
                  <div key={req._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiClock size={14} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {req.user?.fullName || 'Nông dân'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {req.cropType || 'Yêu cầu cấp đất'} · {(req.requestedArea || 0).toLocaleString()} m²
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/admin/land-requests"
                      className="flex-shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors ml-3"
                    >
                      Xem xét
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FiCheckCircle size={36} className="text-green-400 mb-2" />
                <p className="text-sm">Không có yêu cầu nào đang chờ</p>
              </div>
            )}
          </div>

          {/* Panel: Sản phẩm chờ duyệt */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <FiAlertCircle className="mr-2 text-orange-500" />
                Sản phẩm chờ duyệt
                {pendingProducts.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats?.products?.pending || 0}
                  </span>
                )}
              </h3>
              <Link to="/admin/products/pending" className="text-xs text-primary-600 hover:underline flex items-center">
                Xem tất cả <FiArrowRight size={12} className="ml-1" />
              </Link>
            </div>

            {pendingProducts.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {pendingProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">🌾</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                        <p className="text-xs text-gray-500">
                          {product.farmerId?.fullName || 'N/A'} · {product.price?.toLocaleString()}đ/{product.unit}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/admin/products/${product._id}/review`}
                      className="flex-shrink-0 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-lg hover:bg-orange-100 transition-colors ml-3"
                    >
                      Xem xét
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FiCheckCircle size={36} className="text-green-400 mb-2" />
                <p className="text-sm">Không có sản phẩm nào đang chờ duyệt</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
