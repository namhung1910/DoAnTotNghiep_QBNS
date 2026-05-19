import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiX, FiSave, FiArrowLeft, FiCheckSquare, FiSquare, FiInfo } from 'react-icons/fi';
import { productAPI, farmAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';

const CreateProductPage = () => {
  const navigate = useNavigate();
  const { id: productId } = useParams(); // có id → chế độ sửa
  const isEditMode = Boolean(productId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farms, setFarms] = useState([]);
  // Map farmId → sản phẩm đang active của thửa đó (để cảnh báo trùng)
  const [occupiedFarmIds, setOccupiedFarmIds] = useState(new Set());

  // Ảnh mới người dùng chọn thêm (File objects)
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  // Ảnh cũ đã có từ server: [{ url, public_id }]
  const [existingImages, setExistingImages] = useState([]);
  // Ảnh cũ mà người dùng giữ lại (chưa xóa); ban đầu = tất cả existingImages
  const [keepImages, setKeepImages] = useState([]);

  const [formData, setFormData] = useState({
    selectedFarmIds: [],   // Mảng id các thửa đã chọn (cốt lõi mới)
    productName: '',
    category: '',
    price: '',
    unit: 'kg',
    description: '',
    certification: 'Không có',
    productionProcess: '',
    harvestDate: '',
    expiryDate: ''
  });

  const categories = ['Lương thực', 'Rau củ', 'Trái cây', 'Cây công nghiệp', 'Khác'];
  const certifications = ['Không có', 'VietGAP', 'GlobalGAP', 'Organic', 'HACCP'];
  const units = ['kg', 'tấn', 'bó', 'túi', 'hộp', 'chai'];

  // Chuyển đổi đường dẫn ảnh từ server sang URL đầy đủ
  const toImageUrl = (path) =>
    path?.startsWith('http') || path?.startsWith('data:') ? path : `http://localhost:5000${path}`;

  // Format ngày từ ISO sang yyyy-MM-dd cho input[type=date]
  const toDateInput = (iso) => {
    if (!iso) return '';
    return iso.slice(0, 10);
  };

  // Tính stock khả dụng cho 1 thửa
  const calcFarmStock = (farm) => {
    const cumulative = farm.cumulativeYieldKg || 0;
    const adjustment = farm.stockAdjustment || 0;
    const soldOutside = farm.soldOutsideKg || 0;
    return Math.max(0, cumulative + adjustment - soldOutside);
  };

  // Tổng stock từ các thửa đã chọn
  const totalSelectedStock = formData.selectedFarmIds.reduce((sum, fid) => {
    const farm = farms.find(f => f._id === fid);
    return sum + (farm ? calcFarmStock(farm) : 0);
  }, 0);

  useEffect(() => {
    loadAll();
  }, [productId]);

  const loadAll = async () => {
    try {
      setLoading(true);

      // 1. Tải thửa đất đã duyệt
      const farmsRes = await farmAPI.getMyFarms();
      const approvedFarms = (farmsRes.data || []).filter(
        (f) => f.approvalStatus === 'approved' && f.isActive !== false
      );
      setFarms(approvedFarms);

      // 2. Lấy danh sách thửa đang bị "khóa" bởi các sản phẩm active khác
      try {
        const prodRes = await productAPI.getMyProducts({ limit: 200 });
        const prods = prodRes.data?.products || [];
        const occupied = new Set();
        prods.forEach(p => {
          // Bỏ qua chính sản phẩm đang sửa để không tự block mình
          if (isEditMode && p._id === productId) return;
          if (p.status === 'pending' || p.status === 'approved') {
            (p.farmIds || []).forEach(f => {
              const fid = f._id || f;
              occupied.add(fid.toString());
            });
          }
        });
        setOccupiedFarmIds(occupied);
      } catch (_) { /* không chặn load đất */ }

      // 3. Nếu edit mode: load thông tin sản phẩm hiện tại
      if (isEditMode) {
        const prodRes = await productAPI.getById(productId);
        const p = prodRes.data;
        const currentFarmIds = (p.farmIds || []).map(f => f._id || f);

        setFormData({
          selectedFarmIds: currentFarmIds,
          productName: p.productName || '',
          category: p.category || '',
          price: p.price ?? '',
          unit: p.unit || 'kg',
          description: p.description || '',
          certification: p.certification || 'Không có',
          productionProcess: p.productionProcess || '',
          harvestDate: toDateInput(p.harvestDate),
          expiryDate: toDateInput(p.expiryDate),
        });
        setExistingImages(p.images || []);
        setKeepImages(p.images || []); // mặc định giữ hết
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Toggle chọn/bỏ chọn thửa đất
  const handleToggleFarm = (farmId) => {
    setFormData(prev => {
      const isSelected = prev.selectedFarmIds.includes(farmId);
      if (isSelected) {
        return { ...prev, selectedFarmIds: prev.selectedFarmIds.filter(id => id !== farmId) };
      } else {
        return { ...prev, selectedFarmIds: [...prev.selectedFarmIds, farmId] };
      }
    });
  };

  /* ── Image handlers ── */
  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    const total = keepImages.length + newImages.length + files.length;
    if (total > 5) {
      toast.error('Tối đa 5 hình ảnh');
      return;
    }
    const invalid = files.find(f => !f.type.startsWith('image/'));
    if (invalid) { toast.error(`File "${invalid.name}" không phải ảnh`); return; }
    const tooBig = files.find(f => f.size > 5 * 1024 * 1024);
    if (tooBig) { toast.error(`File "${tooBig.name}" vượt quá 5MB`); return; }
    setNewImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setNewPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (img) => {
    setKeepImages(prev => prev.filter(k => k.url !== img.url));
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.selectedFarmIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thửa đất');
      return;
    }
    if (!formData.productName || !formData.price) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    // Kiểm tra có thửa nào đang bị khóa không (cảnh báo lần cuối)
    const blockedFarms = formData.selectedFarmIds.filter(id => occupiedFarmIds.has(id));
    if (blockedFarms.length > 0) {
      toast.error('Một hoặc nhiều thửa đã có bài đăng đang hoạt động. Vui lòng bỏ chọn chúng.');
      return;
    }

    try {
      setSubmitting(true);

      const submitData = new FormData();
      // Gửi farmIds dưới dạng JSON string (FormData không hỗ trợ array trực tiếp)
      submitData.append('farmIds', JSON.stringify(formData.selectedFarmIds));

      // Các field còn lại (bỏ qua selectedFarmIds vì đã xử lý riêng)
      const { selectedFarmIds, ...otherFields } = formData;
      Object.keys(otherFields).forEach(key => {
        if (otherFields[key] !== '' && otherFields[key] !== null && otherFields[key] !== undefined) {
          submitData.append(key, otherFields[key]);
        }
      });

      // Ảnh mới
      newImages.forEach(img => submitData.append('productImages', img));

      if (isEditMode) {
        // Gửi danh sách ảnh cũ muốn giữ — backend tự tính diff
        submitData.append('keepImages', JSON.stringify(keepImages));
        await productAPI.update(productId, submitData);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await productAPI.create(submitData);
        toast.success('Đăng sản phẩm thành công! Đang chờ duyệt.');
      }

      navigate('/farmer/products');
    } catch (error) {
      console.error('Lỗi lưu sản phẩm:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải..." />;
  }

  const totalImages = keepImages.length + newImages.length;

  // Kiểm tra có thửa nào được chọn mà đang bị khóa không
  const hasBlockedSelected = formData.selectedFarmIds.some(id => occupiedFarmIds.has(id));

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Sửa thông tin sản phẩm' : 'Đăng sản phẩm mới'}
            </h1>
            <p className="text-gray-600">
              {isEditMode
                ? 'Chỉnh sửa và lưu lại thông tin sản phẩm'
                : 'Điền thông tin sản phẩm để quảng bá tới khách hàng'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Chọn Thửa Đất (Multi-select) ── */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">Thửa đất sản xuất</h3>
            <p className="text-sm text-gray-500 mb-4">
              Chọn một hoặc nhiều thửa đất cung cấp hàng cho sản phẩm này.
              Tổng sản lượng sẽ được cộng gộp tự động.
            </p>

            {farms.length > 0 ? (
              <>
                <div className="space-y-2">
                  {farms.map(farm => {
                    const isSelected = formData.selectedFarmIds.includes(farm._id);
                    const isOccupied = occupiedFarmIds.has(farm._id);
                    const farmStock = calcFarmStock(farm);
                    const hasYield = (farm.cumulativeYieldKg || 0) > 0;

                    return (
                      <label
                        key={farm._id}
                        className={`
                          flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                          ${isOccupied
                            ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-70'
                            : isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isOccupied ? (
                            <span className="text-red-400 text-lg">🚫</span>
                          ) : isSelected ? (
                            <FiCheckSquare className="text-primary-600 text-xl" />
                          ) : (
                            <FiSquare className="text-gray-400 text-xl" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isSelected}
                          disabled={isOccupied}
                          onChange={() => !isOccupied && handleToggleFarm(farm._id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{farm.name}</span>
                            <span className="text-xs text-gray-400">({farm.area?.toLocaleString()} m²)</span>
                            {farm.cropType && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                {farm.cropType}
                              </span>
                            )}
                            {isOccupied && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                Đã có bài đăng
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            {hasYield ? (
                              <>
                                <span>🌾 Tích lũy: <strong className="text-gray-700">{(farm.cumulativeYieldKg || 0).toLocaleString()} kg</strong></span>
                                <span>📦 Khả dụng: <strong className={farmStock > 0 ? 'text-green-700' : 'text-gray-400'}>{farmStock.toLocaleString()} kg</strong></span>
                              </>
                            ) : (
                              <span className="text-yellow-600">⏳ Chưa có sản lượng — có thể đăng trước khi thu hoạch</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Tổng sản lượng khả dụng */}
                {formData.selectedFarmIds.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        {formData.selectedFarmIds.length > 1
                          ? `🧮 Tổng sản lượng từ ${formData.selectedFarmIds.length} thửa đã chọn:`
                          : '📦 Sản lượng khả dụng:'
                        }
                      </span>
                      <span className="text-lg font-bold text-green-700">
                        {totalSelectedStock.toLocaleString()} kg
                      </span>
                    </div>
                    {formData.selectedFarmIds.length > 1 && (
                      <div className="mt-1.5 space-y-0.5">
                        {formData.selectedFarmIds.map(fid => {
                          const farm = farms.find(f => f._id === fid);
                          if (!farm) return null;
                          return (
                            <div key={fid} className="flex justify-between text-xs text-green-700">
                              <span>{farm.name}</span>
                              <span>{calcFarmStock(farm).toLocaleString()} kg</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {hasBlockedSelected && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    ⛔ Một hoặc nhiều thửa đang được chọn đã có bài đăng sản phẩm hoạt động. Vui lòng bỏ chọn chúng.
                  </div>
                )}
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ Bạn chưa có thửa đất nào được HTX phê duyệt.
                Vào <strong>Thửa đất của tôi</strong> để đăng ký và chờ duyệt trước.
              </div>
            )}
          </div>

          {/* ── Thông tin sản phẩm ── */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Thông tin sản phẩm</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="input-field"
                  placeholder="VD: Gạo Bắc Hương Thái Bình"
                  required
                />
                {formData.selectedFarmIds.length > 1 && (
                  <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                    <FiInfo size={12} />
                    Gợi ý: tên nên phản ánh loại nông sản chính, người mua sẽ thấy tổng {totalSelectedStock.toLocaleString()} kg từ {formData.selectedFarmIds.length} thửa.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chứng nhận</label>
                  <select
                    value={formData.certification}
                    onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                    className="input-field"
                  >
                    {certifications.map(cert => <option key={cert} value={cert}>{cert}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá bán <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="25000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input-field"
                  >
                    {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho</label>
                  <div className="input-field bg-gray-50 text-gray-900 font-medium cursor-not-allowed">
                    {totalSelectedStock > 0 ? `${totalSelectedStock.toLocaleString()} kg` : '—'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder="Mô tả chi tiết về sản phẩm, nguồn gốc, chất lượng..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quy trình sản xuất</label>
                <textarea
                  value={formData.productionProcess}
                  onChange={(e) => setFormData({ ...formData, productionProcess: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Mô tả quy trình canh tác, chăm sóc..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày thu hoạch</label>
                  <input
                    type="date"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạn sử dụng</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Hình ảnh ── */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">Hình ảnh sản phẩm (tối đa 5)</h3>
            <p className="text-xs text-gray-500 mb-4">
              {totalImages}/5 ảnh. Nhấn ✕ để xóa ảnh.
            </p>

            <div className="grid grid-cols-5 gap-3">
              {/* Ảnh cũ (từ server) */}
              {keepImages.map((img, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Xóa ảnh này"
                  >
                    <FiX size={12} />
                  </button>
                  <span className="absolute bottom-1 left-1 text-xs bg-black/40 text-white px-1 rounded">cũ</span>
                </div>
              ))}

              {/* Ảnh mới vừa chọn */}
              {newPreviews.map((preview, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <FiX size={12} />
                  </button>
                  <span className="absolute bottom-1 left-1 text-xs bg-green-600/80 text-white px-1 rounded">mới</span>
                </div>
              ))}

              {/* Nút thêm ảnh (ẩn khi đã đủ 5) */}
              {totalImages < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <FiUpload className="text-2xl text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleNewImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={() => navigate(-1)}
              variant="secondary"
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                farms.length === 0 ||
                formData.selectedFarmIds.length === 0 ||
                hasBlockedSelected
              }
              loading={submitting}
              icon={FiSave}
              variant="primary"
              className="flex-1"
            >
              {isEditMode ? 'Lưu thay đổi' : 'Đăng sản phẩm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductPage;
