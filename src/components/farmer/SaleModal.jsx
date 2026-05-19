import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import { productAPI } from '../../services/api';

/**
 * Modal xác nhận đã bán — hỗ trợ 1 hoặc nhiều thửa.
 * Props:
 *   isOpen, onClose, product (populated farmIds), onSuccess
 */
const SaleModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [totalSale, setTotalSale] = useState('');
  const [allocations, setAllocations] = useState({}); // { farmId: amount }
  const [saving, setSaving] = useState(false);

  // Tính tồn kho khả dụng 1 thửa
  const calcStock = (farm) => {
    const c = farm.cumulativeYieldKg || 0;
    const a = farm.stockAdjustment || 0;
    const s = farm.soldOutsideKg || 0;
    return Math.max(0, c + a - s);
  };

  const farms = product?.farmIds || [];
  // totalAvailableKg đã được backend tính đúng (bao gồm cả legacy soldQuantity)
  // Ưu tiên dùng trực tiếp, chỉ tự tính lại nếu thiếu
  const totalAvailable = product?.totalAvailableKg != null
    ? product.totalAvailableKg
    : farms.reduce((sum, f) => {
        const c = f.cumulativeYieldKg || 0;
        const a = f.stockAdjustment || 0;
        const s = f.soldOutsideKg || 0;
        return sum + Math.max(0, c + a - s);
      }, 0);
  const isSingle = farms.length <= 1;

  // Khi mở modal reset state
  useEffect(() => {
    if (isOpen) {
      setTotalSale('');
      setAllocations({});
    }
  }, [isOpen, product]);

  // Khi nhập tổng bán: tự điền vào thửa đầu tiên (hoặc 1 thửa duy nhất)
  const handleTotalChange = (val) => {
    setTotalSale(val);
    const num = Number(val);
    if (isNaN(num) || num <= 0 || farms.length === 0) {
      setAllocations({});
      return;
    }
    if (isSingle) {
      setAllocations({ [farms[0]._id]: num });
      return;
    }
    // Nhiều thửa: đổ hết vào thửa đầu, các thửa sau = 0
    const newAlloc = {};
    let remaining = num;
    farms.forEach((farm, idx) => {
      if (idx === 0) {
        const fill = Math.min(remaining, calcStock(farm));
        newAlloc[farm._id] = fill;
        remaining -= fill;
      } else {
        newAlloc[farm._id] = idx === farms.length - 1 ? Math.max(0, remaining) : 0;
      }
    });
    setAllocations(newAlloc);
  };

  // Khi sửa ô phân bổ của 1 thửa: nếu còn đúng 1 ô chưa chỉnh → tự fill số còn thiếu
  const handleAllocChange = (farmId, val) => {
    const num = Number(val) || 0;
    const total = Number(totalSale) || 0;

    const newAlloc = { ...allocations, [farmId]: num };

    // Tìm thửa cuối chưa được người dùng chỉnh (để tự điền)
    const editedFarms = new Set(Object.keys(newAlloc).filter(id => id !== farmId || num !== 0));
    const untouched = farms.filter(f => !editedFarms.has(f._id.toString()) && f._id.toString() !== farmId);

    if (untouched.length === 1) {
      const sumEdited = farms
        .filter(f => f._id.toString() !== untouched[0]._id.toString())
        .reduce((s, f) => s + (newAlloc[f._id] || 0), 0);
      const autoFill = Math.max(0, total - sumEdited);
      newAlloc[untouched[0]._id] = autoFill;
    }

    setAllocations(newAlloc);
  };

  const totalAllocated = farms.reduce((s, f) => s + (Number(allocations[f._id]) || 0), 0);
  const total = Number(totalSale) || 0;
  const isMatch = Math.abs(totalAllocated - total) < 0.01;
  const hasOverflow = farms.some(f => (Number(allocations[f._id]) || 0) > calcStock(f));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total <= 0) { toast.error('Nhập số lượng bán'); return; }
    if (total > totalAvailable) { toast.error(`Vượt tồn kho khả dụng (${totalAvailable.toLocaleString()} kg)`); return; }
    if (!isSingle && !isMatch) { toast.error('Tổng phân bổ chưa khớp với tổng bán'); return; }
    if (hasOverflow) { toast.error('Một thửa vượt tồn kho'); return; }

    const farmAllocations = farms.map(f => ({
      farmId: f._id,
      amount: Number(allocations[f._id]) || 0
    })).filter(a => a.amount > 0);

    try {
      setSaving(true);
      await productAPI.recordSaleMulti(product._id, { farmAllocations });
      toast.success(`Đã ghi nhận bán ${total.toLocaleString()} kg`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi ghi nhận bán');
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận đã bán" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-green-800">{product.productName}</p>
          <p className="text-green-700 mt-0.5">
            Tồn kho khả dụng: <strong>{totalAvailable.toLocaleString()} kg</strong>
            {!isSingle && <span className="text-xs ml-1">(từ {farms.length} thửa)</span>}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tổng số lượng bán (kg)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            max={totalAvailable}
            value={totalSale}
            onChange={e => handleTotalChange(e.target.value)}
            className="input-field"
            placeholder="VD: 4000"
            required
            autoFocus
          />
        </div>

        {/* Bảng phân bổ — chỉ hiện khi có nhiều thửa */}
        {!isSingle && total > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Phân bổ theo từng thửa
            </div>
            <div className="divide-y divide-gray-100">
              {farms.map((farm) => {
                const stock = calcStock(farm);
                const alloc = Number(allocations[farm._id]) || 0;
                const isOver = alloc > stock;
                return (
                  <div key={farm._id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{farm.name}</p>
                      <p className="text-xs text-gray-400">Tồn: {stock.toLocaleString()} kg</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      max={stock}
                      value={allocations[farm._id] ?? ''}
                      onChange={e => handleAllocChange(farm._id, e.target.value)}
                      className={`w-28 text-right px-2 py-1.5 text-sm border rounded-lg outline-none transition
                        ${isOver ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300 focus:border-primary-500'}`}
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-400 w-5">kg</span>
                  </div>
                );
              })}
            </div>
            {/* Dòng tổng kiểm tra */}
            <div className={`flex justify-between items-center px-3 py-2 text-sm font-medium
              ${isMatch ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span>Tổng phân bổ</span>
              <span>
                {totalAllocated.toLocaleString()} / {total.toLocaleString()} kg
                {isMatch ? ' ✅' : ' ⚠️ Chưa khớp'}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={saving || !isMatch || hasOverflow}
            variant="primary"
            className="flex-1 !bg-green-600 hover:!bg-green-700 border-none"
          >
            Xác nhận bán
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SaleModal;
