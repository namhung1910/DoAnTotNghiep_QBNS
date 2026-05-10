import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiX, FiSave, FiArrowLeft } from 'react-icons/fi';
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
  // Map farmId → sản phẩm đang active (pending/approved) — dùng enforce 1-farm-1-product
  const [activeProdByFarm, setActiveProdByFarm] = useState({});
  const [yieldInfo, setYieldInfo] = useState(null);

  // Ảnh mới người dùng chọn thêm (File objects)
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  // Ảnh cũ đã có từ server: [{ url, public_id }]
  const [existingImages, setExistingImages] = useState([]);
  // Ảnh cũ mà người dùng giữ lại (chưa xóa); ban đầu = tất cả existingImages
  const [keepImages, setKeepImages] = useState([]);

  const [formData, setFormData] = useState({
    farmId: '',
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

      // 2. Tính sản lượng đã đăng bán và map active products theo farm
      let listedMap = {};
      let activeMap = {};  // farmId → product object (pending/approved)
      try {
        const prodRes = await productAPI.getMyProducts({ limit: 200 });
        const prods = prodRes.data?.products || [];
        prods.forEach(p => {
          if (p.farmId && p.status !== 'rejected') {
            const fid = p.farmId?._id || p.farmId;
            listedMap[fid] = (listedMap[fid] || 0) + (Number(p.quantity) || 0);
            // Chỉ track pending/approved cho ràng buộc 1-farm-1-product
            if (p.status === 'pending' || p.status === 'approved') {
              activeMap[fid] = p;
            }
          }
        });
        setListedQtyByFarm(listedMap);
        setActiveProdByFarm(activeMap);
      } catch (_) { /* không chặn load đất */ }

      if (isEditMode) {
        const prodRes = await productAPI.getById(productId);
        const p = prodRes.data;
        const fid = p.farmId?._id || p.farmId || '';
        setFormData({
          farmId: fid,
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
        // Hiển thị yield info của thửa đất gốc khi ở mode sửa
        const linkedFarm = approvedFarms.find(f => f._id === fid);
        if (linkedFarm) buildYieldInfo(linkedFarm);
      } else {
        // Tự chọn thửa đất đầu tiên
        if (approvedFarms.length > 0) {
          const first = approvedFarms[0];
          setFormData(prev => ({ ...prev, farmId: first._id }));
          buildYieldInfo(first);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Xây dựng yieldInfo khi chọn thửa đất
  const buildYieldInfo = (farm) => {
    if (!farm || farm.status !== 'harvested' || !farm.actualYield) {
      setYieldInfo(null);
      return;
    }
    const totalKg = farm.yieldInKg || farm.actualYield;
    setYieldInfo({
      actualYield: farm.actualYield,
      yieldUnit: farm.yieldUnit || 'kg',
      yieldInKg: totalKg,
    });
    // Tự điền đơn vị và ngày thu hoạch vào form (chỉ khi tạo mới)
    if (!isEditMode) {
      setFormData(prev => ({
        ...prev,
        unit: farm.yieldUnit || prev.unit,
        harvestDate: farm.actualHarvestDate
          ? toDateInput(farm.actualHarvestDate) : prev.harvestDate,
      }));
    }
  };

  // Handler khi nông dân đổi thửa đất
  const handleFarmChange = (farmId) => {
    setFormData(prev => ({ ...prev, farmId }));
    const farm = farms.find(f => f._id === farmId);
    buildYieldInfo(farm);
  };

  /* ── Image handlers ── */
  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    const total = keepImages.length + newImages.length + files.length;
    if (total > 5) {
      toast.error('Tối đa 5 hình ảnh');
      return;
    }
    // Validate client-side
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

    if (!formData.farmId) {
      toast.error('Vui lòng chọn thửa đất');
      return;
    }
    if (!formData.productName || !formData.price) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setSubmitting(true);

      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
          submitData.append(key, formData[key]);
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
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải..." />;
  }

  const totalImages = keepImages.length + newImages.length;

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
          {/* Farm Selection */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Thửa đất sản xuất</h3>
            {farms.length > 0 ? (
              <>
                <select
                  value={formData.farmId}
                  onChange={(e) => handleFarmChange(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Chọn thửa đất</option>
                  {farms.map(farm => (
                    <option key={farm._id} value={farm._id}>
                      {farm.name} — {farm.area?.toLocaleString()} m² ({farm.cropType || 'Chưa có loại cây'})
                      {farm.status === 'harvested' && farm.actualYield > 0 ? ` ✔ Đã thu hoạch: ${farm.actualYield} ${farm.yieldUnit}` : ''}
                    </option>
                  ))}
                </select>


                {/* Banner: cập nhật theo chế độ tạo mới / sửa */}
                {formData.farmId && (() => {
                  const selFarm = farms.find(f => f._id === formData.farmId);

                  // ─── Chế độ TẠO MỚI ───────────────────────────────────────
                  if (!isEditMode) {
                    // ① Kiểm tra 1-farm-1-product: farm đã có bài pending/approved
                    const existingProd = activeProdByFarm[formData.farmId];
                    if (existingProd) {
                      return (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                          <p className="font-semibold text-red-700 mb-1">🚫 Thửa đất này đã có bài đăng sản phẩm</p>
                          <p className="text-red-600 mb-2">
                            Mỗi thửa đất chỉ được phép có 1 bài đăng đang hoạt động.
                            Vui lòng chỉnh sửa bài đăng hiện tại thay vì tạo mới.
                          </p>
                          <a
                            href={`/farmer/products/${existingProd._id}/edit`}
                            className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            → Đến bài đăng "{existingProd.productName}"
                          </a>
                        </div>
                      );
                    }

                    // ② Sản lượng live (thửa đã thu hoạch)
                    if (yieldInfo) {
                      return (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">🌾 Sản lượng vụ này:</span>
                            <span className="font-semibold text-green-800">
                              {yieldInfo.actualYield.toLocaleString()} {yieldInfo.yieldUnit}
                              {yieldInfo.yieldUnit === 'tấn' && <span className="ml-1 text-xs text-green-600 font-normal">({yieldInfo.yieldInKg.toLocaleString()} kg)</span>}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // ③ Thửa chưa thu hoạch
                    if (selFarm && selFarm.status !== 'harvested') {
                      return (
                        <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                          ⚠️ Thửa đất này chưa thu hoạch ({selFarm.status === 'planting' ? 'đang gieo trồng' : selFarm.status === 'growing' ? 'đang phát triển' : selFarm.status === 'harvesting' ? 'sắp thu hoạch' : selFarm.status}).
                          Vui lòng nhập số lượng thủ công.
                        </div>
                      );
                    }
                  }

                  // ─── Chế độ SỬA ───────────────────────────────────────────
                  if (isEditMode && selFarm) {
                    const cumulative = selFarm.cumulativeYieldKg || 0;
                    if (cumulative > 0) {
                      const listed = Number(formData.quantity) || 0;
                      const adj = selFarm.stockAdjustment || 0;
                      const stock = cumulative + adj - listed;
                      return (
                        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">🏪 Kho tích lũy (tổng các vụ):</span>
                            <span className="font-semibold text-blue-800">{cumulative.toLocaleString()} kg</span>
                          </div>
                          {adj !== 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">🔧 Điều chỉnh hao hụt:</span>
                              <span className={adj < 0 ? 'text-red-500' : 'text-green-600'}>{adj > 0 ? '+' : ''}{adj.toLocaleString()} kg</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">📦 Đang đăng bán:</span>
                            <span className="text-blue-600 font-medium">{listed.toLocaleString()} {formData.unit}</span>
                          </div>
                          <div className="border-t border-blue-200 pt-1 flex justify-between">
                            <span className="font-medium text-gray-700">📊 Tồn kho còn lại:</span>
                            <span className={`font-bold ${stock < 0 ? 'text-red-600' : stock === 0 ? 'text-orange-600' : 'text-green-700'}`}>
                              {stock.toLocaleString()} kg
                            </span>
                          </div>
                        </div>
                      );
                    }
                  }

                  return null;
                })()}

              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ Bạn chưa có thửa đất nào được HTX phê duyệt.
                Vào <strong>Thửa đất của tôi</strong> để đăng ký và chờ duyệt trước.
              </div>
            )}
          </div>

          {/* Product Info */}
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
                  placeholder="VD: Gạo tám thơm Kiến Xương"
                  required
                />
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
                  {(() => {
                    const farm = farms.find(f => f._id === formData.farmId);
                    if (!farm) return <div className="input-field bg-gray-100 text-gray-500">—</div>;
                    const prod = activeProdByFarm[farm._id];
                    const cumulative = farm.cumulativeYieldKg || 0;
                    const adjustment = farm.stockAdjustment || 0;
                    const soldOutside = farm.soldOutsideKg || 0;
                    const soldProduct = prod?.soldQuantity || 0;
                    const stock = cumulative + adjustment - soldOutside - soldProduct;
                    return (
                      <div className="input-field bg-gray-50 text-gray-900 font-medium cursor-not-allowed">
                        {stock > 0 ? stock.toLocaleString() : 0} kg
                      </div>
                    );
                  })()}
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

          {/* Images */}
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

          {/* Submit */}
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
              disabled={submitting || farms.length === 0 || (!isEditMode && !!activeProdByFarm[formData.farmId])}
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
