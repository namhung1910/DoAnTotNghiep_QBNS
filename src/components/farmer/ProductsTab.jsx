import { Link } from 'react-router-dom';
import { FiPackage, FiEye, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { getImageUrl } from '../../utils/format';
import Button from '../common/Button';

/**
 * Tab danh sách sản phẩm đã đăng.
 * Props:
 *   products, page, totalPages, statusFilter,
 *   onFilterChange, onPageChange, onDelete
 */
const ProductsTab = ({ products, page, totalPages, statusFilter, onFilterChange, onPageChange, onDelete }) => {
  const statusLabel = (s) =>
    ({ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', sold_out: 'Hết hàng' }[s] || s);

  const statusColor = (s) =>
    ({ pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', sold_out: 'bg-gray-100 text-gray-600' }[s] || 'bg-gray-100 text-gray-800');

  return (
    <>
      {/* Bộ lọc */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-2">
          {['', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => onFilterChange(s)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s === '' ? 'Tất cả' : statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {products.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Sản phẩm</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Thửa đất</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Giá</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Chứng nhận</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lượt xem</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const farmList = product.farmIds || [];
                  const farmLabel = farmList.length > 1
                    ? `${farmList.length} thửa`
                    : (farmList[0]?.name || '—');

                  return (
                    <tr key={product._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">🌾</div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{product.productName}</p>
                            <p className="text-xs text-gray-500">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${farmList.length > 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {farmLabel}
                        </span>
                        {farmList.length > 1 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {farmList.map(f => f.name).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-primary-600 text-sm">
                          {product.price?.toLocaleString()}đ/{product.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {product.certification && product.certification !== 'Không có' ? (
                          <span className="badge-success text-xs">{product.certification}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-gray-600 text-sm">
                          <FiEye className="mr-1" size={14} />
                          {product.viewCount || 0}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs ${statusColor(product.status)}`}>
                          {statusLabel(product.status)}
                        </span>
                        {product.status === 'rejected' && product.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1">{product.rejectionReason}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Link
                            to={`/farmer/products/${product._id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <FiEdit2 size={14} />
                          </Link>
                          <button
                            onClick={() => onDelete(product)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-100">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 text-sm"
              >
                Trước
              </button>
              <span className="text-gray-600 text-sm">Trang {page} / {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 text-sm"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có sản phẩm nào</h3>
          <p className="text-gray-500 mb-6">Bắt đầu đăng sản phẩm đầu tiên của bạn</p>
          <Button to="/farmer/products/new" variant="primary" icon={FiPlus}>
            Đăng sản phẩm mới
          </Button>
        </div>
      )}
    </>
  );
};

export default ProductsTab;
