import { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { statisticsAPI } from '../../services/api';
import NotificationBell from '../common/NotificationBell';
import {
  FiHome, FiMap, FiPackage, FiMessageCircle, FiUsers, FiSettings,
  FiMenu, FiX, FiLogOut, FiChevronRight, FiGrid, FiFileText,
  FiBarChart2
} from 'react-icons/fi';
// ChatBot lazy loaded — defers react-markdown (336KB) until widget is used
const ChatBot = lazy(() => import('../chat/ChatBot'));
import Avatar from '../common/Avatar';

const DashboardLayout = ({ type = 'farmer' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [badges, setBadges] = useState({});

  const farmerMenuItems = [
    { path: '/farmer', icon: FiHome, label: 'Tổng quan' },
    { path: '/farmer/farms', icon: FiMap, label: 'Thửa đất của tôi' },
    { path: '/farmer/products', icon: FiPackage, label: 'Sản phẩm của tôi' },
    { path: '/farmer/news', icon: FiFileText, label: 'Bảng tin', badgeKey: 'news' },
    { path: '/farmer/statistics', icon: FiBarChart2, label: 'Thống kê' },
    { path: '/farmer/profile', icon: FiSettings, label: 'Cài đặt tài khoản' },
  ];

  const adminMenuItems = [
    { path: '/admin', icon: FiHome, label: 'Tổng quan' },
    { path: '/admin/land-requests', icon: FiFileText, label: 'Yêu cầu cấp đất', badgeKey: 'landRequests' },
    { path: '/admin/complaints', icon: FiMessageCircle, label: 'Giải quyết khiếu nại', badgeKey: 'complaints' },
    { path: '/admin/regions', icon: FiMap, label: 'Quản lý đất đai', badgeKey: 'farms' },
    { path: '/admin/products', icon: FiPackage, label: 'Quản lý sản phẩm', badgeKey: 'products' },
    { path: '/admin/users', icon: FiUsers, label: 'Quản lý nông dân' },

    { path: '/admin/policies', icon: FiFileText, label: 'Bảng tin' },
    { path: '/admin/statistics', icon: FiBarChart2, label: 'Thống kê & Báo cáo' },
    { path: '/admin/profile', icon: FiSettings, label: 'Cài đặt tài khoản' },
  ];

  const menuItems = type === 'admin' ? adminMenuItems : farmerMenuItems;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/farmer' || path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (location.pathname === '/farmer/news' && type === 'farmer') {
      localStorage.setItem('lastViewedNews', new Date().toISOString());
      setBadges(prev => ({ ...prev, news: 0 }));
    }
  }, [location.pathname, type]);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const params = {};
        if (type === 'farmer') {
          params.lastViewedNews = localStorage.getItem('lastViewedNews');
        }
        const { data } = await statisticsAPI.getBadges(params);
        setBadges(data);
      } catch (error) {
        // Silently fail if badges cannot be fetched
      }
    };
    
    if (user) {
      fetchBadges();
    }
  }, [user, type]);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      {/* Sidebar - Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-100 shadow-lg lg:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/assets/LogoFarmmate4u.webp"
              alt="Farmmate4U Logo"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="font-display font-bold text-gray-900">Farmmate<span className="text-primary-500">4U</span></h1>
              <p className="text-xs text-gray-500">{type === 'admin' ? 'Hợp tác xã' : 'Nông dân'}</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiX />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <Avatar src={user?.avatar} name={user?.fullName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role === 'admin' ? 'Quản trị viên' : 'Nông dân'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-xl transition-all
                ${isActive(item.path)
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="flex-shrink-0" />
              <span>{item.label}</span>
              {item.badgeKey && badges[item.badgeKey] > 0 ? (
                <span className="ml-auto bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {badges[item.badgeKey] > 99 ? '99+' : badges[item.badgeKey]}
                </span>
              ) : (
                isActive(item.path) && <FiChevronRight className="ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        {/* Back to public & Logout */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <Link
            to="/"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiGrid />
            <span>Về trang chủ</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiMenu size={24} />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center space-x-4">
            {type === 'admin' ? (
              <Link
                to="/admin/complaints"
                className="p-2 hover:bg-gray-100 rounded-lg relative"
                title="Giải quyết khiếu nại"
              >
                <FiMessageCircle size={20} />
              </Link>
            ) : (
              <NotificationBell />
            )}
            <Link
              to={type === 'admin' ? '/admin/profile' : '/farmer/profile'}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
            >
              <Avatar src={user?.avatar} name={user?.fullName} size="sm" />
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.fullName}
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Chatbot rendered globally for Dashboard — lazy loaded */}
      <Suspense fallback={null}>
        <ChatBot chatType={type} />
      </Suspense>
    </div>
  );
};

export default DashboardLayout;

