import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { GiWheat } from 'react-icons/gi';
import { cropTypeAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const CropTypesPage = () => {
  const [cropTypes, setCropTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Lương thực',
    description: '',
    growthDuration: '',
    suitableSoil: [],
    suitableSeason: [],
    averageYield: '',
    icon: '🌾'
  });

  const categories = ['Lương thực', 'Rau củ', 'Trái cây', 'Cây công nghiệp', 'Hoa màu', 'Khác'];
  const soilOptions = ['Phù sa', 'Đất thịt', 'Đất cát', 'Đất sét', 'Đất pha cát', 'Đất ẩm'];
  const seasonOptions = ['Xuân', 'Hè', 'Thu', 'Đông', 'Đông Xuân', 'Hè Thu', 'Quanh năm'];
  const iconOptions = ['🌾', '🌱', '🥬', '🍅', '🌽', '🍉', '🥔', '🥕', '🍆', '🌶️'];

  useEffect(() => {
    fetchCropTypes();
  }, []);

  const fetchCropTypes = async () => {
    try {
      setLoading(true);
      const response = await cropTypeAPI.getAll();
      setCropTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching crop types:', error);
      toast.error('Không thể tải danh mục cây trồng');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCrop(null);
    setFormData({
      name: '',
      category: 'Lương thực',
      description: '',
      growthDuration: '',
      suitableSoil: [],
      suitableSeason: [],
      averageYield: '',
      icon: '🌾'
    });
    setShowModal(true);
  };

  const openEditModal = (crop) => {
    setEditingCrop(crop);
    setFormData({
      name: crop.name,
      category: crop.category,
      description: crop.description || '',
      growthDuration: crop.growthDuration || '',
      suitableSoil: crop.suitableSoil || [],
      suitableSeason: crop.suitableSeason || [],
      averageYield: crop.averageYield || '',
      icon: crop.icon || '🌾'
    });
    setShowModal(true);
  };

  const toggleSoil = (soil) => {
    setFormData({
      ...formData,
      suitableSoil: formData.suitableSoil.includes(soil)
        ? formData.suitableSoil.filter(s => s !== soil)
        : [...formData.suitableSoil, soil]
    });
  };

  const toggleSeason = (season) => {
    setFormData({
      ...formData,
      suitableSeason: formData.suitableSeason.includes(season)
        ? formData.suitableSeason.filter(s => s !== season)
        : [...formData.suitableSeason, season]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Vui lòng nhập tên cây trồng');
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        ...formData,
        growthDuration: parseInt(formData.growthDuration) || 90,
        averageYield: parseInt(formData.averageYield) || 0
      };

      if (editingCrop) {
        await cropTypeAPI.update(editingCrop._id, data);
        toast.success('Đã cập nhật cây trồng!');
      } else {
        await cropTypeAPI.create(data);
        toast.success('Đã thêm cây trồng mới!');
      }
      
      setShowModal(false);
      fetchCropTypes();
    } catch (error) {
      console.error('Error saving crop type:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa loại cây trồng này?')) return;
    
    try {
      await cropTypeAPI.delete(id);
      toast.success('Đã xóa cây trồng');
      fetchCropTypes();
    } catch (error) {
      console.error('Error deleting crop type:', error);
      toast.error('Không thể xóa');
    }
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải..." />;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <GiWheat className="mr-2 text-primary-500" />
            Danh mục cây trồng
          </h1>
          <p className="text-gray-600">Quản lý các loại cây trồng trong hệ thống</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary flex items-center space-x-2"
        >
          <FiPlus />
          <span>Thêm cây trồng</span>
        </button>
      </div>

      {/* Crop Types Grid */}
      {cropTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cropTypes.map((crop) => (
            <div key={crop._id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{crop.icon || '🌾'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{crop.name}</h3>
                    <span className="badge-info text-xs">{crop.category}</span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => openEditModal(crop)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(crop._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {crop.description || 'Không có mô tả'}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian sinh trưởng:</span>
                  <span className="font-medium">{crop.growthDuration || 0} ngày</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Năng suất TB:</span>
                  <span className="font-medium">{crop.averageYield?.toLocaleString() || 0} kg/ha</span>
                </div>
              </div>

              {crop.suitableSeason?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {crop.suitableSeason.map((season, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      {season}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <GiWheat className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Chưa có loại cây trồng nào</p>
          <button onClick={openCreateModal} className="btn-primary">
            <FiPlus className="mr-2" />
            Thêm cây trồng
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCrop ? 'Sửa cây trồng' : 'Thêm cây trồng mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên cây trồng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="input-field"
                placeholder="VD: Lúa chất lượng cao"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Danh mục
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="input-field"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="input-field"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian sinh trưởng (ngày)
              </label>
              <input
                type="number"
                value={formData.growthDuration}
                onChange={(e) => setFormData({...formData, growthDuration: e.target.value})}
                className="input-field"
                placeholder="90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Năng suất TB (kg/ha)
              </label>
              <input
                type="number"
                value={formData.averageYield}
                onChange={(e) => setFormData({...formData, averageYield: e.target.value})}
                className="input-field"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon
              </label>
              <div className="flex flex-wrap gap-1">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({...formData, icon})}
                    className={`w-8 h-8 rounded-lg text-lg ${
                      formData.icon === icon ? 'bg-primary-100 ring-2 ring-primary-500' : 'bg-gray-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại đất phù hợp
            </label>
            <div className="flex flex-wrap gap-2">
              {soilOptions.map(soil => (
                <button
                  key={soil}
                  type="button"
                  onClick={() => toggleSoil(soil)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.suitableSoil.includes(soil)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {soil}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mùa vụ thích hợp
            </label>
            <div className="flex flex-wrap gap-2">
              {seasonOptions.map(season => (
                <button
                  key={season}
                  type="button"
                  onClick={() => toggleSeason(season)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.suitableSeason.includes(season)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : (editingCrop ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CropTypesPage;

