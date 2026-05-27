import { useState, useEffect } from 'react';
import { FiPlus, FiPackage, FiTruck } from 'react-icons/fi';
import { productAPI, farmAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';

// Components con tách riêng để tránh vượt giới hạn token
import SaleModal from '../../components/farmer/SaleModal';
import InventoryTab from '../../components/farmer/InventoryTab';
import ProductsTab from '../../components/farmer/ProductsTab';

const MyProductsPage = () => {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'inventory'
  const [products, setProducts] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal xóa sản phẩm
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [deleting, setDeleting] = useState(false);

  // Modal điều chỉnh kho (hao hụt / bán ngoài / sửa sai)
  const [adjustModal, setAdjustModal] = useState({ open: false, farm: null });
  const [adjustType, setAdjustType] = useState('loss');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Modal lịch sử kho
  const [historyModal, setHistoryModal] = useState({ open: false, farm: null });
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal xác nhận bán (dùng SaleModal component)
  const [saleModal, setSaleModal] = useState({ open: false, product: null });

  useEffect(() => { fetchAll(); }, [page, statusFilter]);

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
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // ── Xóa sản phẩm ──
  const handleDelete = async () => {
    if (!deleteModal.product) return;
    try {
      setDeleting(true);
      await productAPI.delete(deleteModal.product._id);
      toast.success('Đã xóa sản phẩm');
      setDeleteModal({ open: false, product: null });
      fetchAll();
    } catch (err) {
      toast.error('Không thể xóa sản phẩm');
    } finally {
      setDeleting(false);
    }
  };

  // ── Cập nhật kho thủ công (hao hụt / bán ngoài / sửa sai) ──
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustModal.farm) return;
    try {
      setAdjusting(true);
      await farmAPI.adjustInventory(adjustModal.farm._id, {
        type: adjustType,
        amount: Number(adjustValue),
        note: adjustNote
      });
      toast.success('Đã cập nhật kho');
      setAdjustModal({ open: false, farm: null });
      setAdjustValue('');
      setAdjustNote('');
      setAdjustType('loss');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật kho');
    } finally {
      setAdjusting(false);
    }
  };

  // ── Mở lịch sử kho ──
  const handleOpenHistory = async (farm) => {
    setHistoryModal({ open: true, farm });
    setLoadingHistory(true);
    try {
      const res = await farmAPI.getStockHistory(farm._id);
      setStockHistory(res.data);
    } catch {
      toast.error('Không thể tải lịch sử kho');
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── Mở sale modal ──
  const handleOpenSale = (product) => setSaleModal({ open: true, product });

  if (loading && products.length === 0 && farms.length === 0) {
    return <Loading fullScreen={false} message="Đang tải sản phẩm..." />;
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sản phẩm của tôi</h1>
          <p className="text-gray-600 text-sm mt-0.5">Quản lý sản phẩm và kho hàng nông sản</p>
        </div>
        <Button to="/farmer/products/new" variant="primary" icon={FiPlus} className="w-full sm:w-auto flex-shrink-0">
          Đăng sản phẩm mới
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { key: 'products', label: `Sản phẩm (${products.length})`, icon: FiPackage },
          { key: 'inventory', label: `Kho hàng (${farms.length} thửa)`, icon: FiTruck }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Sản phẩm */}
      {activeTab === 'products' && (
        <ProductsTab
          products={products}
          page={page}
          totalPages={totalPages}
          statusFilter={statusFilter}
          onFilterChange={(s) => { setStatusFilter(s); setPage(1); }}
          onPageChange={setPage}
          onDelete={(p) => setDeleteModal({ open: true, product: p })}
        />
      )}

      {/* Tab: Kho hàng */}
      {activeTab === 'inventory' && (
        <InventoryTab
          products={products}
          farms={farms}
          onSell={handleOpenSale}
          onAdjust={(farm) => { setAdjustModal({ open: true, farm }); setAdjustValue(''); setAdjustNote(''); setAdjustType('loss'); }}
          onHistory={handleOpenHistory}
        />
      )}

      {/* ── Modal Xóa ── */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, product: null })} title="Xác nhận xóa" size="sm">
        <p className="text-gray-600 mb-6">
          Bạn có chắc muốn xóa sản phẩm "{deleteModal.product?.productName}"? Hành động này không thể hoàn tác.
        </p>
        <div className="flex space-x-3">
          <Button onClick={() => setDeleteModal({ open: false, product: null })} variant="secondary" className="flex-1">Hủy</Button>
          <Button onClick={handleDelete} loading={deleting} variant="danger" className="flex-1">Xóa</Button>
        </div>
      </Modal>

      {/* ── Modal Điều Chỉnh Kho ── */}
      <Modal isOpen={adjustModal.open} onClose={() => setAdjustModal({ open: false, farm: null })} title={`Cập nhật kho — ${adjustModal.farm?.name || ''}`} size="md">
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            Thửa: <strong>{adjustModal.farm?.name}</strong> · Cây: {adjustModal.farm?.cropType}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại cập nhật</label>
            <div className="space-y-2">
              {[
                { value: 'loss', label: 'Hao hụt / Hư hỏng', desc: 'Giảm tồn kho (ghi nhận vào điều chỉnh)' },
                { value: 'sale', label: 'Bán trực tiếp (ngoài hệ thống)', desc: 'Giảm tồn kho (ghi nhận vào đã bán)' },
                { value: 'correction', label: 'Nhập bù (Sửa sai)', desc: 'Tăng tồn kho (cộng lại số đã trừ sai)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="adjustType"
                    value={opt.value}
                    checked={adjustType === opt.value}
                    onChange={() => setAdjustType(opt.value)}
                    className="mt-0.5 mr-3"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng (kg)</label>
            <input
              type="number" min="0.1" step="0.1"
              value={adjustValue}
              onChange={e => setAdjustValue(e.target.value)}
              className="input-field"
              placeholder="Nhập số dương (VD: 5)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Luôn nhập số dương, hệ thống tự tính cộng/trừ.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
            <textarea
              value={adjustNote}
              onChange={e => setAdjustNote(e.target.value)}
              className="input-field min-h-[70px]"
              placeholder="Lý do điều chỉnh..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" onClick={() => setAdjustModal({ open: false, farm: null })} variant="secondary" className="flex-1">Hủy</Button>
            <Button type="submit" loading={adjusting} variant="primary" className="flex-1">Xác nhận</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Lịch Sử Kho ── */}
      <Modal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, farm: null })}
        title={`Lịch sử kho — ${historyModal.farm?.name || ''}`}
        size="lg"
      >
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
                {stockHistory.map(item => (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      {item.type === 'loss' && <span className="text-red-600 font-medium">Hao hụt</span>}
                      {item.type === 'sale' && <span className="text-green-600 font-medium">Bán ngoài</span>}
                      {item.type === 'correction' && <span className="text-blue-600 font-medium">Nhập bù</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {item.type === 'correction'
                        ? <span className="text-green-600">+{item.amount} kg</span>
                        : <span className="text-red-600">-{item.amount} kg</span>
                      }
                    </td>
                    <td className="px-4 py-3">{item.note || <span className="text-gray-400 italic">Không có</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ── SaleModal (component con) ── */}
      <SaleModal
        isOpen={saleModal.open}
        onClose={() => setSaleModal({ open: false, product: null })}
        product={saleModal.product}
        onSuccess={fetchAll}
      />
    </div>
  );
};

export default MyProductsPage;
