import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiGrid, FiList, FiX } from 'react-icons/fi';
import { IconWheat } from '../../components/icons/AgriIcons';
import { productAPI } from '../../services/api';
import ProductCard from '../../components/products/ProductCard';
import Button from '../../components/common/Button';

import Loading from '../../components/common/Loading';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [certification, setCertification] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['Lương thực', 'Rau củ', 'Trái cây', 'Cây công nghiệp'];
  const certifications = ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP'];

  useEffect(() => {
    fetchProducts();
  }, [page, category, certification]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (category) params.category = category;
      if (certification) params.certification = certification;
      if (search) params.search = search;

      const response = await productAPI.getAll(params);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setCertification('');
    setPage(1);
  };

  const hasActiveFilters = search || category || certification;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            Farmmate<span className="text-primary-500">4U</span>
          </h1>
          <p className="text-center text-primary-100 max-w-2xl mx-auto mb-8">
            Khám phá các sản phẩm nông sản chất lượng cao từ các vùng quy hoạch,
            được chứng nhận và có thể truy xuất nguồn gốc.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-xl overflow-hidden shadow-lg">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm nông sản..."
                className="flex-1 px-6 py-4 text-gray-800 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-4 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <FiSearch size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${showFilters ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                } border border-gray-200`}
            >
              <FiFilter />
              <span>Bộ lọc</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <FiX />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Hiển thị {products.length} sản phẩm
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Danh mục
                </label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="input-field"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Certification Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chứng nhận
                </label>
                <select
                  value={certification}
                  onChange={(e) => { setCertification(e.target.value); setPage(1); }}
                  className="input-field"
                >
                  <option value="">Tất cả chứng nhận</option>
                  {certifications.map((cert) => (
                    <option key={cert} value={cert}>{cert}</option>
                  ))}
                </select>
              </div>

              {/* Certification Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chứng nhận phổ biến
                </label>
                <div className="flex flex-wrap gap-2">
                  {certifications.map((cert) => (
                    <button
                      key={cert}
                      onClick={() => { setCertification(cert === certification ? '' : cert); setPage(1); }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${certification === cert
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <Loading fullScreen={false} message="Đang tải sản phẩm..." />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>

                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPage(idx + 1)}
                    className={`w-10 h-10 rounded-lg transition-colors ${page === idx + 1
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <IconWheat className="text-7xl text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Không tìm thấy sản phẩm
            </h3>
            <p className="text-gray-500 mb-6">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
            <Button onClick={clearFilters} variant="primary">
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* Chatbot */}

    </div>
  );
};

export default ProductsPage;

