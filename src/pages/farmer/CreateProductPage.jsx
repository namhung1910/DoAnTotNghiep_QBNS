import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiSave, FiArrowLeft } from 'react-icons/fi';
import { productAPI, farmAPI, cropTypeAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const CreateProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farms, setFarms] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  const [formData, setFormData] = useState({
    farmId: '',
    productName: '',
    category: '',
    price: '',
    unit: 'kg',
    quantity: '',
    description: '',
    certification: 'Không có',
    productionProcess: '',
    harvestDate: '',
    expiryDate: ''
  });

  const categories = ['Lương thực', 'Rau củ', 'Trái cây', 'Cây công nghiệp', 'Khác'];
  const certifications = ['Không có', 'VietGAP', 'GlobalGAP', 'Organic', 'HACCP'];
  const units = ['kg', 'tấn', 'bó', 'túi', 'hộp', 'chai'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [farmsRes, cropTypesRes] = await Promise.all([
        farmAPI.getMyFarms(),
        cropTypeAPI.getAll()
      ]);
      setFarms(farmsRes.data || []);
      setCropTypes(cropTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Tối đa 5 hình ảnh');
      return;
    }
    
    setImages([...images, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

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
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      images.forEach(image => {
        submitData.append('productImages', image);
      });

      await productAPI.create(submitData);
      toast.success('Đăng sản phẩm thành công! Đang chờ duyệt.');
      navigate('/farmer/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải..." />;
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Đăng sản phẩm mới</h1>
            <p className="text-gray-600">Điền thông tin sản phẩm để quảng bá tới khách hàng</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Farm Selection */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Thửa đất sản xuất</h3>
            {farms.length > 0 ? (
              <select
                value={formData.farmId}
                onChange={(e) => setFormData({...formData, farmId: e.target.value})}
                className="input-field"
                required
              >
                <option value="">Chọn thửa đất</option>
                {farms.map(farm => (
                  <option key={farm._id} value={farm._id}>
                    {farm.name || farm.cropType} - {farm.area?.toLocaleString()} m²
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500">Bạn chưa có thửa đất nào. Vui lòng liên hệ HTX.</p>
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
                  onChange={(e) => setFormData({...formData, productName: e.target.value})}
                  className="input-field"
                  placeholder="VD: Gạo tám thơm Kiến Xương"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chứng nhận
                  </label>
                  <select
                    value={formData.certification}
                    onChange={(e) => setFormData({...formData, certification: e.target.value})}
                    className="input-field"
                  >
                    {certifications.map(cert => (
                      <option key={cert} value={cert}>{cert}</option>
                    ))}
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
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="input-field"
                    placeholder="25000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="input-field"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="input-field"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả sản phẩm
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  rows={4}
                  placeholder="Mô tả chi tiết về sản phẩm, nguồn gốc, chất lượng..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quy trình sản xuất
                </label>
                <textarea
                  value={formData.productionProcess}
                  onChange={(e) => setFormData({...formData, productionProcess: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Mô tả quy trình canh tác, chăm sóc..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày thu hoạch
                  </label>
                  <input
                    type="date"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({...formData, harvestDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hạn sử dụng
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Hình ảnh sản phẩm (tối đa 5)</h3>
            
            <div className="grid grid-cols-5 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              
              {previews.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <FiUpload className="text-2xl text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || farms.length === 0}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave />
                  <span>Đăng sản phẩm</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductPage;

