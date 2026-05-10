import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiEye, FiAward } from 'react-icons/fi';
import { getImageUrl } from '../../utils/format';


const ProductCard = ({ product }) => {
  const getCertificationColor = (cert) => {
    switch (cert) {
      case 'VietGAP':
        return 'bg-green-100 text-green-800';
      case 'GlobalGAP':
        return 'bg-blue-100 text-blue-800';
      case 'Organic':
        return 'bg-purple-100 text-purple-800';
      case 'HACCP':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link to={`/products/${product._id}`} className="block">
      <div className="card-hover group">
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-gray-100">
          {product.images && product.images.length > 0 ? (
            <img
              src={getImageUrl(product.images[0])}
              alt={product.productName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">🌾</span>
            </div>
          )}

          {/* Certification Badge */}
          {product.certification && product.certification !== 'Không có' && (
            <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 ${getCertificationColor(product.certification)}`}>
              <FiAward />
              <span>{product.certification}</span>
            </div>
          )}

          {/* Views */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white rounded-lg text-xs flex items-center space-x-1">
            <FiEye />
            <span>{product.viewCount || 0}</span>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
            {product.productName}
          </h3>

          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {product.description || 'Nông sản chất lượng cao'}
          </p>

          {/* Price */}
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-xl font-bold text-primary-600">
              {product.price?.toLocaleString()}đ
            </span>
            <span className="text-sm text-gray-500">/{product.unit || 'kg'}</span>
          </div>

          {/* Farmer Info */}
          {product.farmerId && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <FiMapPin className="mr-2 text-primary-500" />
                <span className="line-clamp-1">{product.farmerId.address || 'Kiến Xương, Thái Bình'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <FiPhone className="mr-2 text-primary-500" />
                <span>{product.farmerId.phone || 'Liên hệ'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

