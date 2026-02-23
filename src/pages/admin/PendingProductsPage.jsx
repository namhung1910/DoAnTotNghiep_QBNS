import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye, FiPackage } from 'react-icons/fi';
import { productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const PendingProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getPending({ limit: 100 });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching pending products:', error);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId) => {
    try {
      setProcessing(true);
      await productAPI.review(productId, { status: 'approved' });
      toast.success('Đã duyệt sản phẩm');
      fetchPendingProducts();
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProduct) return;
    
    try {
      setProcessing(true);
      await productAPI.review(selectedProduct._id, { 
        status: 'rejected',
        rejectionReason: rejectReason 
      });
      toast.success('Đã từ chối sản phẩm');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedProduct(null);
      fetchPendingProducts();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (product) => {
    setSelectedProduct(product);
    setShowRejectModal(true);
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Duyệt sản phẩm</h1>
        <p className="text-gray-600">Xem xét và phê duyệt các bài đăng quảng bá của nông dân</p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {products.map((product) => (
            <div key={product._id} className="card">
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000${product.images[0]}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🌾</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">{product.productName}</h3>
                  <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                  
                  <div className="space-y-1 text-sm">
                    <p className="text-primary-600 font-semibold">
                      {product.price?.toLocaleString()}đ/{product.unit}
                    </p>
                    <p className="text-gray-600">
                      Người đăng: {product.farmerId?.fullName}
                    </p>
                    {product.certification && product.certification !== 'Không có' && (
                      <span className="badge-success">{product.certification}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mt-4 line-clamp-2">
                {product.description || 'Không có mô tả'}
              </p>

              {/* Actions */}
              <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="flex-1 btn-secondary flex items-center justify-center space-x-1"
                >
                  <FiEye />
                  <span>Chi tiết</span>
                </button>
                <button
                  onClick={() => openRejectModal(product)}
                  disabled={processing}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors flex items-center space-x-1"
                >
                  <FiX />
                  <span>Từ chối</span>
                </button>
                <button
                  onClick={() => handleApprove(product._id)}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <FiCheck />
                  <span>Duyệt</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FiPackage className="mx-auto text-5xl text-green-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Không có sản phẩm chờ duyệt</h3>
          <p className="text-gray-500">Tất cả sản phẩm đã được xử lý</p>
        </div>
      )}

      {/* Product Detail Modal */}
      <Modal
        isOpen={!!selectedProduct && !showRejectModal}
        onClose={() => setSelectedProduct(null)}
        title="Chi tiết sản phẩm"
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-4">
            {/* Images */}
            {selectedProduct.images?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedProduct.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.startsWith('http') ? img : `http://localhost:5000${img}`}
                    alt=""
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Tên sản phẩm</label>
                <p className="font-semibold">{selectedProduct.productName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Danh mục</label>
                <p>{selectedProduct.category}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Giá bán</label>
                <p className="text-primary-600 font-semibold">
                  {selectedProduct.price?.toLocaleString()}đ/{selectedProduct.unit}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Chứng nhận</label>
                <p>{selectedProduct.certification || 'Không có'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Người đăng</label>
                <p>{selectedProduct.farmerId?.fullName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">SĐT liên hệ</label>
                <p>{selectedProduct.farmerId?.phone}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500">Mô tả</label>
              <p className="text-gray-700">{selectedProduct.description || 'Không có mô tả'}</p>
            </div>

            {selectedProduct.productionProcess && (
              <div>
                <label className="text-sm text-gray-500">Quy trình sản xuất</label>
                <p className="text-gray-700">{selectedProduct.productionProcess}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={() => openRejectModal(selectedProduct)}
                className="flex-1 px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200"
              >
                Từ chối
              </button>
              <button
                onClick={() => { handleApprove(selectedProduct._id); setSelectedProduct(null); }}
                className="flex-1 btn-primary"
              >
                Duyệt sản phẩm
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectReason(''); }}
        title="Từ chối sản phẩm"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Bạn sắp từ chối sản phẩm: <strong>{selectedProduct?.productName}</strong>
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lý do từ chối
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Nhập lý do từ chối để thông báo cho nông dân..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
              className="flex-1 btn-secondary"
            >
              Hủy
            </button>
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PendingProductsPage;

