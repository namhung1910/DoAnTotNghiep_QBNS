import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMap, FiPackage, FiShield, FiMessageCircle, FiArrowRight, FiCheck, FiSearch } from 'react-icons/fi';
import { GiWheat, GiFarmer, GiPlantRoots } from 'react-icons/gi';
import { productAPI, statisticsAPI } from '../../services/api';
import ProductCard from '../../components/products/ProductCard';
import ChatBot from '../../components/chat/ChatBot';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    regionArea: 0,
    farmArea: 0,
    farmers: 0,
    certifiedProducts: 0
  });

  useEffect(() => {
    fetchFeaturedProducts();
    fetchPublicStats();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await productAPI.getAll({ limit: 6 });
      setFeaturedProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicStats = async () => {
    try {
      const response = await statisticsAPI.getPublicStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const features = [
    {
      icon: FiMap,
      title: 'Bản đồ số hóa',
      description: 'Xem trực quan các vùng quy hoạch nông nghiệp và ranh giới vùng trồng trên bản đồ tương tác.'
    },
    {
      icon: FiShield,
      title: 'Truy xuất nguồn gốc',
      description: 'Tra cứu chi tiết quy trình sản xuất, chứng nhận VietGAP, GlobalGAP và thông tin người bán.'
    },
    {
      icon: FiPackage,
      title: 'Nông sản chất lượng',
      description: 'Kết nối trực tiếp với nông dân, đảm bảo sản phẩm tươi ngon, giá cả minh bạch.'
    },
    {
      icon: FiMessageCircle,
      title: 'Trợ lý AI thông minh',
      description: 'Chatbot tư vấn thông tin thị trường, giá cả và gợi ý sản phẩm theo mùa vụ.'
    }
  ];

  const statsDisplay = [
    { value: `${stats.regionArea}+`, label: 'Hecta đất quy hoạch' },
    { value: `${stats.farmArea}+`, label: 'Hecta đất nông nghiệp' },
    { value: `${stats.farmers}+`, label: 'Nông dân tham gia' },
    { value: `${stats.certifiedProducts}+`, label: 'Sản phẩm đạt chuẩn' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-mesh min-h-[90vh] flex items-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-harvest-200 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="stagger-children">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
                <GiWheat className="text-lg" />
                <span>Hệ thống số hóa nông nghiệp</span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Quảng bá & Hoạch định{' '}
                <span className="text-gradient">Vùng Nông Sản</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-lg">
                Kết nối nông dân với người tiêu dùng thông qua công nghệ bản đồ số và trí tuệ nhân tạo.
                Minh bạch từ ruộng đồng đến bàn ăn.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link to="/map" className="btn-primary flex items-center justify-center space-x-2">
                  <FiMap />
                  <span>Xem bản đồ</span>
                </Link>
                <Link to="/products" className="btn-secondary flex items-center justify-center space-x-2">
                  <FiPackage />
                  <span>Khám phá nông sản</span>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <FiCheck className="text-primary-500" />
                  <span>Chứng nhận VietGAP</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiCheck className="text-primary-500" />
                  <span>Truy xuất nguồn gốc</span>
                </div>
              </div>
            </div>

            {/* Right - Illustration */}
            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square">
                {/* Main circle */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full opacity-10" />

                {/* Floating elements */}
                <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-float">
                  <FiShield className="text-4xl text-primary-500" />
                </div>
                <div className="absolute top-20 right-10 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                  <FiPackage className="text-3xl text-harvest-500" />
                </div>
                <div className="absolute bottom-20 left-20 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-float" style={{ animationDelay: '2s' }}>
                  <GiWheat className="text-3xl text-earth-500" />
                </div>

                {/* Center quality badge preview */}
                <div className="absolute inset-16 bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-white p-6">
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white rounded-2xl">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
                      <div className="bg-white p-5 rounded-full shadow-lg relative z-10">
                        <FiShield className="text-5xl text-green-600" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-1.5 rounded-full border-2 border-white z-20">
                        <FiCheck className="text-white text-lg font-bold" />
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-green-800 font-bold text-lg mb-1">Nông Sản Sạch</h3>
                      <p className="text-xs text-green-600 mb-3">Cam kết chất lượng</p>

                      <div className="flex flex-wrap justify-center gap-2">
                        <span className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-green-700 shadow-sm border border-green-100">
                          VietGAP
                        </span>
                        <span className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-green-700 shadow-sm border border-green-100">
                          Organic
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsDisplay.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-primary-200 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Tính năng nổi bật</h2>
            <p className="section-subtitle mx-auto">
              Hệ thống tích hợp công nghệ GIS và AI để hỗ trợ toàn diện cho chuỗi giá trị nông sản
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="card text-center group hover:bg-primary-50 transition-colors"
              >
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                  <feature.icon className="text-2xl text-primary-600" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="section-title">Nông sản nổi bật</h2>
              <p className="section-subtitle">Sản phẩm chất lượng từ các vùng quy hoạch</p>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center space-x-2 text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              <span>Xem tất cả</span>
              <FiArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <GiWheat className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có sản phẩm nào được đăng tải</p>
            </div>
          )}

          <div className="text-center mt-8 sm:hidden">
            <Link to="/products" className="btn-primary">
              Xem tất cả sản phẩm
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Bạn là Nông dân hoặc Hợp tác xã?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Đăng ký ngay để quản lý thửa đất, đăng bán nông sản và tiếp cận hàng nghìn khách hàng tiềm năng.
          </p>
          <Link to="/login" className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
            <span>Đăng nhập / Đăng ký</span>
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* Chatbot */}
      <ChatBot chatType="public" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default HomePage;

