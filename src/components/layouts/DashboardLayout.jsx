import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome, FiMap, FiPackage, FiMessageCircle, FiUsers, FiSettings,
  FiMenu, FiX, FiLogOut, FiChevronRight, FiGrid, FiFileText,
  FiBarChart2, FiLayers
} from 'react-icons/fi';
import { GiWheat, GiFarmer, GiPlantRoots } from 'react-icons/gi';

const DashboardLayout = ({ type = 'farmer' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const farmerMenuItems = [
    { path: '/farmer', icon: FiHome, label: 'Tổng quan' },
    { path: '/farmer/farms', icon: FiMap, label: 'Thửa đất của tôi' },
    { path: '/farmer/products', icon: FiPackage, label: 'Sản phẩm của tôi' },
    { path: '/farmer/contacts', icon: FiMessageCircle, label: 'Yêu cầu liên hệ' },
    { path: '/farmer/profile', icon: FiSettings, label: 'Cài đặt tài khoản' },
  ];

  const adminMenuItems = [
    { path: '/admin', icon: FiHome, label: 'Tổng quan' },
    { path: '/admin/land-requests', icon: FiFileText, label: 'Yêu cầu cấp đất' },
    { path: '/admin/complaints', icon: FiMessageCircle, label: 'Giải quyết khiếu nại' },
    { path: '/admin/regions', icon: FiMap, label: 'Quản lý đất đai' },
    { path: '/admin/products', icon: FiPackage, label: 'Quản lý sản phẩm' },
    { path: '/admin/users', icon: FiUsers, label: 'Quản lý nông dân' },
    { path: '/admin/crop-types', icon: GiWheat, label: 'Danh mục cây trồng' },
    { path: '/admin/policies', icon: FiFileText, label: 'Chính sách' },
    { path: '/admin/statistics', icon: FiBarChart2, label: 'Thống kê & Báo cáo' },
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <GiWheat className="text-white text-xl" />
            </div>
            <div>
              <h1 className="font-display font-bold text-gray-900">NôngSản</h1>
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
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.fullName?.charAt(0) || 'U'}
              </span>
            </div>
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
              {isActive(item.path) && (
                <FiChevronRight className="ml-auto" />
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
      <div className="flex-1 flex flex-col min-h-screen">
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
            <Link
              to={type === 'admin' ? '/admin/complaints' : '/farmer/contacts'}
              className="p-2 hover:bg-gray-100 rounded-lg relative"
            >
              <FiMessageCircle size={20} />
              {/* <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span> */}
            </Link>
            <Link
              to={type === 'admin' ? '/admin/profile' : '/farmer/profile'}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.fullName}
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

