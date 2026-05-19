import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiMapPin, FiPhone, FiMail, FiCalendar,
  FiAward, FiEye, FiMessageCircle, FiShare2, FiHeart
} from 'react-icons/fi';
import { productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import { getInitials, getImageUrl } from '../../utils/format';
import Button from '../../components/common/Button';

import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const hasIncrementedView = useRef(false); // Flag to prevent double increment

  useEffect(() => {
    // Reset flag when product ID changes
    hasIncrementedView.current = false;
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getById(id);
      setProduct(response.data);

      // Increment view count separately (only once)
      if (!hasIncrementedView.current) {
        hasIncrementedView.current = true;
        try {
          await productAPI.incrementView(id);
        } catch (err) {
          console.error('Error incrementing view:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleContactIntent = async (type) => {
    try {
      await productAPI.trackInterest(product._id);
    } catch (error) {
      console.error('Error tracking interest', error);
    }
  };

  const getCertificationInfo = (cert) => {
    const info = {
      VietGAP: {
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'Tiêu chuẩn thực hành nông nghiệp tốt Việt Nam'
      },
      GlobalGAP: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Tiêu chuẩn thực hành nông nghiệp tốt toàn cầu'
      },
      Organic: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Sản phẩm hữu cơ, không sử dụng hóa chất'
      },
      HACCP: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        description: 'Hệ thống phân tích mối nguy và điểm kiểm soát tới hạn'
      }
    };
    return info[cert] || { color: 'bg-gray-100 text-gray-800 border-gray-200', description: '' };
  };

  if (loading) {
    return <Loading message="Đang tải thông tin sản phẩm..." />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sản phẩm</h2>
          <Button to="/products" variant="primary">
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const certInfo = getCertificationInfo(product.certification);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/products"
            className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Quay lại danh sách
          </Link>
        </div>
      </div>

      {/* Product Detail */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
              {product.images && product.images.length > 0 ? (
                <img
                  src={getImageUrl(product.images[selectedImage])}
                  alt={product.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl">🌾</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-transparent hover:border-gray-300'
                      }`}
                  >
                    <img
                      src={getImageUrl(img)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Views */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="badge-info">{product.category || 'Nông sản'}</span>
                <span className="flex items-center text-sm text-gray-500">
                  <FiEye className="mr-1" />
                  {product.viewCount || 0} lượt xem
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product.productName}</h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-primary-600">
                {product.price?.toLocaleString()}đ
              </span>
              <span className="text-xl text-gray-500">/{product.unit || 'kg'}</span>
            </div>

            {/* Certification */}
            {product.certification && product.certification !== 'Không có' && (
              <div className={`p-4 rounded-xl border ${certInfo.color}`}>
                <div className="flex items-center space-x-2">
                  <FiAward className="text-xl" />
                  <span className="font-semibold">{product.certification}</span>
                </div>
                <p className="text-sm mt-1 opacity-80">{certInfo.description}</p>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Mô tả sản phẩm</h3>
              <p className="text-gray-600 leading-relaxed">
                {product.description || 'Nông sản chất lượng cao từ vùng quy hoạch.'}
              </p>
            </div>

            {/* Production Process */}
            {product.productionProcess && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quy trình sản xuất</h3>
                <p className="text-gray-600 leading-relaxed">{product.productionProcess}</p>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {product.harvestDate && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <FiCalendar className="text-primary-500" />
                  <div>
                    <p className="text-sm text-gray-500">Ngày thu hoạch</p>
                    <p className="font-medium">
                      {new Date(product.harvestDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              )}
              {product.actualStock != null && product.actualStock > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Tồn kho</p>
                  <p className="font-medium text-gray-900">
                    {product.actualStock.toLocaleString()} {product.unit || 'kg'}
                  </p>
                </div>
              )}
            </div>

            {/* Farmer Info */}
            {product.farmerId && (
              <div className="card bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3">Thông tin người bán</h3>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                    {product.farmerId.avatar ? (
                      <img src={product.farmerId.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary-600 font-semibold text-lg">
                        {getInitials(product.farmerId.fullName)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{product.farmerId.fullName}</p>
                    <div className="space-y-1 mt-2 text-sm">
                      <p className="flex items-center text-gray-600">
                        <FiMapPin className="mr-2 text-primary-500" />
                        {product.farmerId.address || 'Kiến Xương, Thái Bình'}
                      </p>
                      <p className="flex items-center text-gray-600">
                        <FiPhone className="mr-2 text-primary-500" />
                        {product.farmerId.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                href={`https://zalo.me/${product.farmerId?.phone?.replace(/^0/, '84') || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleContactIntent('zalo')}
                variant="primary"
                icon={FiMessageCircle}
                className="flex-[2] !bg-blue-500 hover:!bg-blue-600 border-none"
              >
                Chat Zalo
              </Button>
              <Button
                href={`tel:${product.farmerId?.phone}`}
                onClick={() => handleContactIntent('phone')}
                variant="primary"
                icon={FiPhone}
                className="flex-[2] !bg-green-500 hover:!bg-green-600 border-none"
              >
                Gọi điện
              </Button>
              <button className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                <FiHeart size={20} />
              </button>
              <button className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                <FiShare2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Thông tin vùng trồng — hỗ trợ nhiều thửa đất */}
        {product.farmIds && product.farmIds.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Thông tin vùng trồng</h2>
            <div className={`grid gap-4 ${product.farmIds.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {product.farmIds.map((farm, idx) => (
                <div key={farm._id || idx} className="card">
                  {product.farmIds.length > 1 && (
                    <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-3">
                      Thửa đất #{idx + 1}{farm.name ? ` — ${farm.name}` : ''}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Loại cây trồng</p>
                      <p className="font-semibold text-gray-900">{farm.cropType || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Diện tích</p>
                      <p className="font-semibold text-gray-900">
                        {farm.area?.toLocaleString() || '—'} m²
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quy hoạch</p>
                      <p className="font-semibold text-gray-900">
                        {farm.planningData || 'Vùng quy hoạch nông nghiệp'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Chatbot */}

    </div>
  );
};

export default ProductDetailPage;

