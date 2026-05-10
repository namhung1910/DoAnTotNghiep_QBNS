import { Link } from 'react-router-dom';
import { FiFacebook, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img
                src="/assets/LogoFarmmate4u.webp"
                alt="Farmmate4U Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h3 className="font-display font-bold text-lg text-white">Farmmate<span className="text-primary-500">4U</span></h3>
              </div>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Hệ thống quảng bá và hỗ trợ hoạch định vùng nông sản,
              kết nối nông dân với người tiêu dùng qua công nghệ bản đồ số và AI.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors">
                <FiFacebook />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors">
                <FiMail />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-primary-400 transition-colors">Trang chủ</Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-primary-400 transition-colors">Bản đồ quy hoạch</Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-primary-400 transition-colors">Nông sản</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary-400 transition-colors">Đăng nhập</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Liên hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <FiMapPin className="mt-1 text-primary-400" />
                <span>Kiến Xương, Thái Bình</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiPhone className="text-primary-400" />
                <span>0912 345 678</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiMail className="text-primary-400" />
                <span>info@nongsan.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="my-8 border-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Farm Mate <span className="text-primary-500">For You</span> With <span className="animate-pulse text-primary-500">💚</span></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

