import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiMenu, FiX, FiUser, FiLogOut, FiHome,
  FiMap, FiPackage, FiSettings, FiGrid
} from 'react-icons/fi';
import { getInitials } from '../../utils/format';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { user, logout, isAuthenticated, isAdmin, isFarmer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const publicLinks = [
    { path: '/', label: 'Trang chủ', icon: FiHome },
    { path: '/map', label: 'Bản đồ', icon: FiMap },
    { path: '/products', label: 'Nông sản', icon: FiPackage },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileOpen(false);
  };

  const getDashboardLink = () => {
    if (isAdmin) return '/admin';
    if (isFarmer) return '/farmer';
    return '/';
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <img
              src="/assets/LogoFarmmate4u.webp"
              alt="Farmmate4U Logo"
              className="w-10 h-10 object-contain transform group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg text-gray-900">Farmmate<span className="text-primary-500">4U</span></h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {publicLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-all duration-200
                  ${location.pathname === link.path
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <link.icon className="text-lg" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right side - Auth */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.avatar && !imgError ? (
                      <img
                        src={user.avatar}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <span className="text-white font-medium text-sm">
                        {getInitials(user?.fullName)}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.fullName}
                  </span>
                </button>

                {/* Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Hợp tác xã' : 'Nông dân'}</p>
                    </div>

                    <Link
                      to={getDashboardLink()}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FiGrid className="text-gray-400" />
                      <span>Bảng điều khiển</span>
                    </Link>

                    <Link
                      to={isAdmin ? "/admin/profile" : "/farmer/profile"}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FiSettings className="text-gray-400" />
                      <span>Cài đặt</span>
                    </Link>

                    <hr className="my-2 border-gray-100" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
                    >
                      <FiLogOut />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm py-2"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fadeIn">
          <nav className="px-4 py-4 space-y-2">
            {publicLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all
                  ${location.pathname === link.path
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <link.icon />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

