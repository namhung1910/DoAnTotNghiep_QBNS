import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiPackage, FiTruck, FiSliders, FiCheckCircle } from 'react-icons/fi';
import { productAPI, farmAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/format';
import Button from '../../components/common/Button';

const MyProductsPage = () => {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'inventory'
  const [products, setProducts] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [deleting, setDeleting] = useState(false);

  // Điều chỉnh kho thủ công
  const [adjustModal, setAdjustModal] = useState({ open: false, farm: null });
  const [adjustType, setAdjustType] = useState('loss'); // 'loss', 'sale', 'correction'
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Lịch sử điều chỉnh
  const [historyModal, setHistoryModal] = useState({ open: false, farm: null });
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ghi nhận xuất bán
  const [saleModal, setSaleModal] = useState({ open: false, product: null, stock: 0 });
  const [saleAmount, setSaleAmount] = useState('');
  const [savingSale, setSavingSale] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [page, statusFilter]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const [prodRes, farmRes] = await Promise.all([
        productAPI.getMyProducts(params),
        farmAPI.getMyFarms()
      ]);
      setProducts(prodRes.data.products || []);
      setTotalPages(prodRes.data.pages || 1);
      const approved = (farmRes.data || []).filter(f => f.approvalStatus === 'approved' && f.isActive !== false);
      setFarms(approved);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
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
      fetchAll();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Không thể xóa sản phẩm');
    } finally {
      setDeleting(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustModal.farm) return;

    const inv = getInventoryForFarm(adjustModal.farm);
    if (adjustType === 'sale' && !inv.product) {
      toast.error('Vui lòng đăng bán sản phẩm trước khi ghi nhận bán trực tiếp.');
      return;
    }

    try {
      setAdjusting(true);
      await farmAPI.adjustInventory(adjustModal.farm._id, {
        type: adjustType,
        amount: Number(adjustValue),
        note: adjustNote
      });
      toast.success('Đã cập nhật kho thành công');
      setAdjustModal({ open: false, farm: null });
      setAdjustValue('');
      setAdjustNote('');
      setAdjustType('loss');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật kho');
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenHistory = async (farm) => {
    setHistoryModal({ open: true, farm });
    setLoadingHistory(true);
    try {
      const res = await farmAPI.getStockHistory(farm._id);
      setStockHistory(res.data);
    } catch (error) {
      toast.error('Không thể tải lịch sử kho');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!saleModal.product) return;
    const amount = Number(saleAmount);
    if (amount <= 0 || amount > saleModal.stock) {
      toast.error('Số lượng xuất bán không hợp lệ (phải > 0 và <= Tồn kho)');
      return;
    }
    try {
      setSavingSale(true);
      await productAPI.recordSale(saleModal.product._id, { amount });
      toast.success(`Đã ghi nhận bán ${amount} kg thành công`);
      setSaleModal({ open: false, product: null, stock: 0 });
      setSaleAmount('');
      fetchAll();
    } catch (error) {
      const msg = error.response?.data?.message || 'Không thể ghi nhận xuất bán';
      toast.error(msg);
    } finally {
      setSavingSale(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', sold_out: 'Hết hàng' };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', sold_out: 'bg-gray-100 text-gray-600' };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Tính tồn kho cho từng thửa đất
  const getInventoryForFarm = (farm) => {
    const product = products.find(p => {
      const fid = p.farmId?._id || p.farmId;
      return fid === farm._id && p.status !== 'rejected';
    });
    const cumulative = farm.cumulativeYieldKg || 0;
    const adjustment = farm.stockAdjustment || 0;
    const soldOutside = farm.soldOutsideKg || 0;
    
    // Tổng đã bán = Khách mua qua sản phẩm + Nông dân tự bán ngoài
    const soldQty = (product?.soldQuantity || 0) + soldOutside;
    
    const stock = cumulative + adjustment - soldQty;
    return { product, cumulative, adjustment, soldOutside, soldQty, stock };
  };

  const getInventoryStatus = (farm, inv) => {
    if (inv.cumulative === 0) return { label: '⏳ Chưa thu hoạch', color: 'text-gray-400' };
    if (inv.stock < 0) return { label: '⚠️ Vượt kho', color: 'text-red-600 font-semibold' };
    if (inv.stock === 0) return { label: '📭 Hết hàng', color: 'text-gray-500' };
    if (!inv.product) return { label: '📣 Cần đăng bán', color: 'text-orange-600 font-semibold' };
    if (inv.stock <= inv.cumulative * 0.1) return { label: '⚠️ Sắp hết', color: 'text-yellow-600 font-semibold' };
    return { label: '✅ Đủ hàng', color: 'text-green-600 font-semibold' };
  };

  if (loading && products.length === 0 && farms.length === 0) {
    return <Loading fullScreen={false} message="Đang tải sản phẩm..." />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm của tôi</h1>
          <p className="text-gray-600">Quản lý các sản phẩm nông sản đã đăng</p>
        </div>
        <Button to="/farmer/products/new" variant="primary" icon={FiPlus}>
          Đăng sản phẩm mới
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <FiPackage /> Sản phẩm ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <FiTruck /> Kho hàng ({farms.length} thửa)
        </button>
      </div>

      {/* ===== TAB: SẢN PHẨM ===== */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setStatusFilter(''); setPage(1); }}
                className={`px-4 py-2 rounded-lg transition-colors ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Tất cả
              </button>
              {['pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setPage(1); }}
                  className={`px-4 py-2 rounded-lg transition-colors ${statusFilter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {getStatusLabel(status)}
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
                                  src={getImageUrl(product.images[0])}
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
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-100">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">Trước</button>
                  <span className="text-gray-600">Trang {page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">Sau</button>
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
      )}

      {/* ===== TAB: KHO HÀNG ===== */}
      {activeTab === 'inventory' && (
        <div className="card overflow-hidden">
          {farms.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiTruck className="mx-auto text-4xl text-gray-300 mb-3" />
              <p>Chưa có thửa đất nào được duyệt</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Thửa đất</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tích lũy TH</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Điều chỉnh</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Đã bán</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 bg-green-50">Tồn kho</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map(farm => {
                    const inv = getInventoryForFarm(farm);
                    const status = getInventoryStatus(farm, inv);
                    return (
                      <tr key={farm._id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900 text-sm">{farm.name}</p>
                          <p className="text-xs text-gray-500">{farm.cropType}</p>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {inv.cumulative > 0 ? `${inv.cumulative.toLocaleString()} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          <span className={inv.adjustment < 0 ? 'text-red-500' : inv.adjustment > 0 ? 'text-green-600' : 'text-gray-400'}>
                            {inv.adjustment !== 0 ? `${inv.adjustment > 0 ? '+' : ''}${inv.adjustment.toLocaleString()} kg` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-500">
                          {inv.soldQty > 0 ? `${inv.soldQty.toLocaleString()} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold bg-green-50">
                          {inv.cumulative > 0
                            ? <span className={inv.stock < 0 ? 'text-red-600' : 'text-green-700'}>{inv.stock.toLocaleString()} kg</span>
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {inv.cumulative > 0 && (
                              <>
                                <button
                                  onClick={() => { setAdjustModal({ open: true, farm }); setAdjustValue(''); setAdjustNote(''); setAdjustType('loss'); }}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Cập nhật kho (Hao hụt/Bán trực tiếp)"
                                >
                                  <FiSliders size={14} />
                                </button>
                                <button
                                  onClick={() => handleOpenHistory(farm)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                  title="Xem lịch sử điều chỉnh"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </button>
                              </>
                            )}
                            {/* Nút xuất bán */}
                            {inv.product && inv.stock > 0 && (
                              <button
                                onClick={() => { setSaleModal({ open: true, product: inv.product, stock: inv.stock }); setSaleAmount(''); }}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Xác nhận đã bán"
                              >
                                <FiCheckCircle size={14} />
                              </button>
                            )}
                            {/* Nút đến bài đăng hoặc tạo mới */}
                            {inv.product ? (
                              <Link
                                to={`/farmer/products/${inv.product._id}/edit`}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Sửa bài đăng"
                              >
                                <FiEdit2 size={14} />
                              </Link>
                            ) : inv.cumulative > 0 ? (
                              <Link
                                to="/farmer/products/new"
                                className="text-xs bg-primary-600 text-white px-2 py-1 rounded-lg hover:bg-primary-700 transition-colors"
                              >
                                Đăng bán
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Tổng cộng */}
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">Tổng cộng</td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">
                      {farms.reduce((s, f) => s + (f.cumulativeYieldKg || 0), 0).toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-500">
                      {farms.reduce((s, f) => s + (f.stockAdjustment || 0), 0).toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-500">
                      {farms.reduce((s, f) => s + getInventoryForFarm(f).soldQty, 0).toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-700 bg-green-50">
                      {farms.reduce((s, f) => {
                        const inv = getInventoryForFarm(f);
                        return s + inv.stock;
                      }, 0).toLocaleString()} kg
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            Công thức: <strong>Tồn thực tế = (Tích lũy thu hoạch + Điều chỉnh) − Đã bán</strong>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, product: null })} title="Xác nhận xóa" size="sm">
        <p className="text-gray-600 mb-6">Bạn có chắc muốn xóa sản phẩm "{deleteModal.product?.productName}"? Hành động này không thể hoàn tác.</p>
        <div className="flex space-x-3">
          <Button onClick={() => setDeleteModal({ open: false, product: null })} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button onClick={handleDelete} loading={deleting} variant="danger" className="flex-1">
            Xóa
          </Button>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={adjustModal.open} onClose={() => setAdjustModal({ open: false, farm: null })} title="Cập nhật kho hàng" size="md">
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            Tồn kho khả dụng hiện tại: <strong>{getInventoryForFarm(adjustModal.farm || {}).stock?.toLocaleString() || 0} kg</strong>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại cập nhật</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="radio" name="adjustType" value="loss" checked={adjustType === 'loss'} onChange={() => setAdjustType('loss')} className="text-primary-600 focus:ring-primary-500 w-4 h-4" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Hao hụt / Hư hỏng</p>
                  <p className="text-xs text-gray-500">Giảm tồn kho, ghi nhận vào cột Điều chỉnh</p>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="radio" name="adjustType" value="sale" checked={adjustType === 'sale'} onChange={() => setAdjustType('sale')} className="text-primary-600 focus:ring-primary-500 w-4 h-4 flex-shrink-0" />
                <div className="ml-3 w-full">
                  <p className="text-sm font-medium text-gray-900">Bán trực tiếp (Bán ngoài)</p>
                  <p className="text-xs text-gray-500">Giảm tồn kho, ghi nhận vào cột Đã bán</p>
                  {adjustType === 'sale' && !getInventoryForFarm(adjustModal.farm || {}).product && (
                    <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Thửa đất này chưa được đăng bán, không thể ghi nhận bán ngoài.</p>
                  )}
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="radio" name="adjustType" value="correction" checked={adjustType === 'correction'} onChange={() => setAdjustType('correction')} className="text-primary-600 focus:ring-primary-500 w-4 h-4" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Nhập bù (Sửa sai)</p>
                  <p className="text-xs text-gray-500">Tăng tồn kho (Cộng lại số lượng đã lỡ trừ sai lần trước)</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng (kg)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={adjustValue}
              onChange={e => setAdjustValue(e.target.value)}
              className="input-field"
              placeholder="Nhập số dương (VD: 5)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Lưu ý: Luôn nhập số dương, hệ thống sẽ tự động tính toán cộng trừ kho.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
            <textarea
              value={adjustNote}
              onChange={e => setAdjustNote(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Lý do điều chỉnh..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={() => setAdjustModal({ open: false, farm: null })} variant="secondary" className="flex-1">
              Hủy
            </Button>
            <Button type="submit" loading={adjusting} variant="primary" className="flex-1">
              Xác nhận
            </Button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={historyModal.open} onClose={() => setHistoryModal({ open: false, farm: null })} title="Lịch sử cập nhật kho" size="lg">
        {loadingHistory ? (
          <div className="py-8 text-center"><Loading fullScreen={false} /></div>
        ) : stockHistory.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Chưa có lịch sử cập nhật kho nào.</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3 text-right">Số lượng</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {stockHistory.map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      {item.type === 'loss' && <span className="text-red-600 font-medium">Hao hụt</span>}
                      {item.type === 'sale' && <span className="text-green-600 font-medium">Bán ngoài</span>}
                      {item.type === 'correction' && <span className="text-blue-600 font-medium">Nhập bù</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {item.type === 'correction' ? (
                        <span className="text-green-600">+{item.amount} kg</span>
                      ) : (
                        <span className="text-red-600">-{item.amount} kg</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.note || <span className="text-gray-400 italic">Không có</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Record Sale Modal */}
      <Modal isOpen={saleModal.open} onClose={() => setSaleModal({ open: false, product: null, stock: 0 })} title="Xác nhận đã bán" size="sm">
        <form onSubmit={handleRecordSale} className="space-y-4">
          <p className="text-sm text-gray-600">
            Ghi nhận số lượng khách chốt mua (trực tiếp/Zalo).
            Sản phẩm: <strong>{saleModal.product?.productName}</strong><br />
            Tồn kho hiện tại: <strong className="text-green-700">{saleModal.stock.toLocaleString()} kg</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng đã bán (kg)</label>
            <input
              type="number"
              min="1"
              max={saleModal.stock}
              value={saleAmount}
              onChange={e => setSaleAmount(e.target.value)}
              className="input-field"
              placeholder="VD: 50"
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={() => setSaleModal({ open: false, product: null, stock: 0 })} variant="secondary" className="flex-1">
              Hủy
            </Button>
            <Button type="submit" loading={savingSale} variant="primary" className="flex-1 !bg-green-600 hover:!bg-green-700 border-none">
              Xác nhận bán
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyProductsPage;
