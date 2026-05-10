import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMap, FiPackage, FiPlus, FiEye,
  FiUser, FiArrowRight, FiPhoneCall,
  FiTrendingUp, FiActivity, FiAlertTriangle, FiCheckCircle,
  FiClock, FiZap
} from 'react-icons/fi';
import { IconWheat } from '../../components/icons/AgriIcons';
import { useAuth } from '../../context/AuthContext';
import { farmAPI, productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import WeatherWidget from '../../components/common/WeatherWidget';
import { getImageUrl } from '../../utils/format';

// ─── Màu & label cho trạng thái mùa vụ ──────────────────────────────────────
const STATUS_CONFIG = {
  planning: { label: 'Quy hoạch', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  planting: { label: 'Gieo trồng', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  growing: { label: 'Đang phát triển', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  harvesting: { label: 'Sắp thu hoạch', bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  harvested: { label: 'Đã thu hoạch', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  fallow: { label: 'Bỏ nghỉ', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-300' },
};

const PRODUCT_STATUS = {
  pending: { label: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { label: 'Đang bán', bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { label: 'Từ chối', bg: 'bg-red-100', text: 'text-red-700' },
  sold_out: { label: 'Hết hàng', bg: 'bg-gray-100', text: 'text-gray-600' },
};

// Hiệu suất canh tác (kg/m²)
const calcEfficiency = (farm) => {
  if (!farm.area || !farm.cumulativeYieldKg) return null;
  return (farm.cumulativeYieldKg / farm.area).toFixed(3);
};

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [farmsRes, productsRes] = await Promise.all([
        farmAPI.getMyFarms(),
        productAPI.getMyProducts({ limit: 100 })
      ]);
      setFarms(farmsRes.data || []);
      setProducts(productsRes.data?.products || productsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Đang tải dữ liệu..." />;

  // ─── Derived metrics ──────────────────────────────────────────────────────
  const approvedFarms = farms.filter(f => f.approvalStatus === 'approved' || f.isActive);
  const activeFarms = farms.filter(f => ['growing', 'harvesting', 'planting'].includes(f.status));
  const totalArea = farms.reduce((s, f) => s + (f.area || 0), 0);
  const totalYieldKg = farms.reduce((s, f) => s + (f.cumulativeYieldKg || 0), 0);
  const totalViews = products.reduce((s, p) => s + (p.viewCount || 0), 0);
  const totalContacts = products.reduce((s, p) => s + (p.contactCount || 0), 0);
  const approvedProducts = products.filter(p => p.status === 'approved');
  const pendingProducts = products.filter(p => p.status === 'pending');

  // Farm cần chú ý: sắp thu hoạch
  const urgentFarms = farms.filter(f => f.status === 'harvesting');

  const kpiCards = [
    {
      icon: FiMap,
      label: 'Thửa đất',
      value: farms.length,
      sub: activeFarms.length > 0 ? `${activeFarms.length} đang canh tác` : 'Chưa có hoạt động',
      subColor: activeFarms.length > 0 ? 'text-green-600' : 'text-gray-400',
      color: 'from-blue-500 to-blue-600',
      link: '/farmer/farms',
    },
    {
      icon: FiActivity,
      label: 'Diện tích',
      value: totalArea >= 10000
        ? `${(totalArea / 10000).toFixed(2)} ha`
        : `${totalArea.toLocaleString()} m²`,
      sub: 'Tổng diện tích canh tác',
      subColor: 'text-gray-400',
      color: 'from-emerald-500 to-emerald-600',
      link: '/farmer/farms',
    },
    {
      icon: FiPackage,
      label: 'Sản phẩm',
      value: products.length,
      sub: pendingProducts.length > 0
        ? `${pendingProducts.length} chờ duyệt`
        : approvedProducts.length > 0 ? `${approvedProducts.length} đang bán` : 'Chưa có',
      subColor: pendingProducts.length > 0 ? 'text-amber-600 font-semibold' : 'text-green-600',
      color: 'from-orange-500 to-orange-600',
      link: '/farmer/products',
    },
    {
      icon: FiPhoneCall,
      label: 'Lượt liên hệ',
      value: totalContacts,
      sub: `${totalViews} lượt xem`,
      subColor: 'text-purple-500',
      color: 'from-purple-500 to-purple-600',
      link: '/farmer/products',
    },
  ];

  const quickActions = [
    { icon: FiPlus, label: 'Đăng sản phẩm', link: '/farmer/products/new', color: 'bg-primary-500 hover:bg-primary-600' },
    { icon: FiMap, label: 'Thửa đất của tôi', link: '/farmer/farms', color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: FiTrendingUp, label: 'Thống kê', link: '/farmer/statistics', color: 'bg-purple-500 hover:bg-purple-600' },
    { icon: FiZap, label: 'Thị trường', link: '/products', color: 'bg-amber-500 hover:bg-amber-600' },
  ];

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
                <h1 className="text-xl font-bold">Xin chào, {user?.fullName}!</h1>
                <p className="text-primary-200 text-sm">Quản lý thửa đất và nông sản của bạn</p>
              </div>
            </div>
            {/* Right side summary */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              {totalYieldKg > 0 && (
                <div className="text-center">
                  <p className="text-primary-200 text-xs">Tổng sản lượng</p>
                  <p className="font-bold text-lg">{(totalYieldKg / 1000).toFixed(2)} tấn</p>
                </div>
              )}
              {urgentFarms.length > 0 && (
                <div className="flex items-center space-x-2 bg-orange-500/80 rounded-xl px-3 py-2">
                  <FiAlertTriangle size={14} />
                  <span className="text-xs font-semibold">{urgentFarms.length} thửa sắp thu hoạch</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── ROW 1: KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((card, idx) => (
            <Link key={idx} to={card.link} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-sm`}>
                  <card.icon size={18} />
                </div>
                <FiArrowRight size={14} className="text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              <p className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
            </Link>
          ))}
        </div>

        {/* ── ROW 2: Weather + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WeatherWidget />
          </div>
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

        {/* ── ROW 3: Farms + Products ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Thửa đất của tôi */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <FiMap className="mr-2 text-blue-500" />
                Thửa đất của tôi
              </h3>
              <Link to="/farmer/farms" className="text-xs text-primary-600 hover:underline flex items-center">
                Xem tất cả <FiArrowRight size={12} className="ml-1" />
              </Link>
            </div>

            {farms.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {farms.slice(0, 5).map((farm) => {
                  const sc = STATUS_CONFIG[farm.status] || STATUS_CONFIG.planning;
                  const eff = calcEfficiency(farm);
                  return (
                    <div key={farm._id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {farm.name || farm.cropType || 'Thửa đất'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 ml-4">
                            {farm.area?.toLocaleString()} m²
                            {farm.cropType && ` · ${farm.cropType}`}
                            {eff && ` · NS: ${eff} kg/m²`}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ml-3 ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FiMap size={36} className="opacity-20 mb-2" />
                <p className="text-sm">Chưa có thửa đất nào được giao</p>
                <p className="text-xs mt-1 text-gray-400">Liên hệ HTX để được cấp đất</p>
              </div>
            )}
          </div>

          {/* Sản phẩm của tôi */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <FiPackage className="mr-2 text-orange-500" />
                Sản phẩm của tôi
              </h3>
              <div className="flex items-center space-x-3">
                {pendingProducts.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingProducts.length} chờ duyệt
                  </span>
                )}
                <Link to="/farmer/products" className="text-xs text-primary-600 hover:underline flex items-center">
                  Xem tất cả <FiArrowRight size={12} className="ml-1" />
                </Link>
              </div>
            </div>

            {products.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {products.slice(0, 5).map((product) => {
                  const ps = PRODUCT_STATUS[product.status] || PRODUCT_STATUS.pending;
                  return (
                    <div key={product._id} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-3">
                        {product.images?.[0] ? (
                          <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">🌾</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.productName}</p>
                        <p className="text-xs text-gray-500">
                          {product.price?.toLocaleString()}đ/{product.unit || 'kg'}
                          {product.viewCount > 0 && (
                            <span className="ml-2 text-blue-500">
                              <FiEye size={10} className="inline mr-0.5" />{product.viewCount}
                            </span>
                          )}
                          {product.contactCount > 0 && (
                            <span className="ml-2 text-green-500">
                              <FiPhoneCall size={10} className="inline mr-0.5" />{product.contactCount}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ml-2 ${ps.bg} ${ps.text}`}>
                        {ps.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FiPackage size={36} className="opacity-20 mb-2" />
                <p className="text-sm">Chưa có sản phẩm nào</p>
                <Link to="/farmer/products/new" className="mt-3 flex items-center space-x-1.5 bg-primary-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors">
                  <FiPlus size={14} />
                  <span>Đăng sản phẩm đầu tiên</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 4: Summary bar (hiển thị khi có dữ liệu) ── */}
        {(totalYieldKg > 0 || totalContacts > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Tổng sản lượng tích lũy</p>
                <p className="text-2xl font-bold mt-1">
                  {totalYieldKg >= 1000
                    ? `${(totalYieldKg / 1000).toFixed(2)} tấn`
                    : `${totalYieldKg.toLocaleString()} kg`}
                </p>
              </div>
              <IconWheat className="text-4xl opacity-25" />
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Lượt xem sản phẩm</p>
                <p className="text-2xl font-bold mt-1">{totalViews.toLocaleString()}</p>
              </div>
              <FiEye className="text-4xl opacity-25" />
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Lượt khách liên hệ</p>
                <p className="text-2xl font-bold mt-1">{totalContacts.toLocaleString()}</p>
              </div>
              <FiPhoneCall className="text-4xl opacity-25" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FarmerDashboard;
