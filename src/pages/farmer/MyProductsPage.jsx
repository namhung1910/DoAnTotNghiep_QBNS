import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiPackage } from 'react-icons/fi';
import { productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const MyProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [page, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      
      const response = await productAPI.getMyProducts(params);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.product) return;
    
    try {
      setDeleting(true);
      await productAPI.delete(deleteModal.product._id);
      toast.success('Đã xóa sản phẩm');
      setDeleteModal({ open: false, product: null });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Không thể xóa sản phẩm');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
      sold_out: 'Hết hàng'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      sold_out: 'bg-gray-100 text-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && products.length === 0) {
    return <Loading fullScreen={false} message="Đang tải sản phẩm..." />;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm của tôi</h1>
          <p className="text-gray-600">Quản lý các sản phẩm nông sản đã đăng</p>
        </div>
        <Link to="/farmer/products/new" className="btn-primary flex items-center space-x-2">
          <FiPlus />
          <span>Đăng sản phẩm mới</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !statusFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
          {['pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {products.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Sản phẩm</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Giá</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Chứng nhận</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lượt xem</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img 
                              src={product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000${product.images[0]}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🌾</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.productName}</p>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-primary-600">
                        {product.price?.toLocaleString()}đ/{product.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {product.certification && product.certification !== 'Không có' ? (
                        <span className="badge-success">{product.certification}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-gray-600">
                        <FiEye className="mr-1" />
                        {product.viewCount || 0}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${getStatusColor(product.status)}`}>
                        {getStatusLabel(product.status)}
                      </span>
                      {product.status === 'rejected' && product.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">{product.rejectionReason}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/farmer/products/${product._id}/edit`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <FiEdit2 />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, product })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
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
          <Link to="/farmer/products/new" className="btn-primary inline-flex items-center space-x-2">
            <FiPlus />
            <span>Đăng sản phẩm mới</span>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null })}
        title="Xác nhận xóa"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Bạn có chắc muốn xóa sản phẩm "{deleteModal.product?.productName}"? 
          Hành động này không thể hoàn tác.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => setDeleteModal({ open: false, product: null })}
            className="flex-1 btn-secondary"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MyProductsPage;

