import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import { regionAPI } from '../../services/api';
import toast from 'react-hot-toast';
import area from '@turf/area';
import { polygon } from '@turf/helpers';
import Button from '../../components/common/Button';

const CreateRegionPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    soilType: 'Phù sa',
    plannedCrops: [],
    totalArea: '',
    coordinates: ''
  });
  const [newCrop, setNewCrop] = useState('');

  const soilTypes = ['Phù sa', 'Đất thịt', 'Đất cát', 'Đất sét', 'Đất pha cát', 'Đất phèn'];
  const suggestedCrops = ['Lúa', 'Ngô', 'Khoai', 'Rau muống', 'Cà chua', 'Dưa hấu', 'Đậu', 'Lạc'];

  // Auto-calculate area when coordinates change
  useEffect(() => {
    if (!formData.coordinates) return;

    try {
      const coords = JSON.parse(formData.coordinates);
      // Valid Polygon has at least 4 points (start=end) and nested array structure
      if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
        const poly = polygon([coords]);
        const calculatedArea = area(poly);
        setFormData(prev => ({
          ...prev,
          totalArea: Math.round(calculatedArea)
        }));
      }
    } catch (error) {
      // Create a silent failure for invalid JSON during typing, 
      // actual validation happens on submit
      // console.debug('Calculating area pending valid JSON');
    }
  }, [formData.coordinates]);

  const addCrop = (crop) => {
    if (crop && !formData.plannedCrops.includes(crop)) {
      setFormData({
        ...formData,
        plannedCrops: [...formData.plannedCrops, crop]
      });
      setNewCrop('');
    }
  };

  const removeCrop = (cropToRemove) => {
    setFormData({
      ...formData,
      plannedCrops: formData.plannedCrops.filter(c => c !== cropToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Vui lòng nhập tên vùng quy hoạch');
      return;
    }

    // Parse coordinates - REQUIRED
    let geometry;
    try {
      if (!formData.coordinates || formData.coordinates.trim() === '') {
        toast.error('Vui lòng nhập tọa độ vùng quy hoạch');
        return;
      }

      // Expect format: [[lng, lat], [lng, lat], ...]
      const coords = JSON.parse(formData.coordinates);
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      };
    } catch (error) {
      toast.error('Định dạng tọa độ không hợp lệ');
      return;
    }

    try {
      setSubmitting(true);
      await regionAPI.create({
        ...formData,
        totalArea: parseFloat(formData.totalArea) || 0,
        geometry
      });
      toast.success('Đã tạo vùng quy hoạch mới!');
      navigate('/admin/regions');
    } catch (error) {
      console.error('Error creating region:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Tạo vùng quy hoạch mới</h1>
            <p className="text-gray-600">Nhập thông tin vùng quy hoạch nông nghiệp</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên vùng quy hoạch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="VD: Vùng quy hoạch lúa Kiến Xương"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Mô tả chi tiết về vùng quy hoạch..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại thổ nhưỡng
                  </label>
                  <select
                    value={formData.soilType}
                    onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                    className="input-field"
                  >
                    {soilTypes.map(soil => (
                      <option key={soil} value={soil}>{soil}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tổng diện tích (m²) - <span className="text-primary-600 italic font-normal">Tự động tính toán</span>
                  </label>
                  <input
                    type="number"
                    value={formData.totalArea}
                    readOnly
                    className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder="Nhập tọa độ để tính diện tích..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Planned Crops */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Cây trồng được hoạch định</h3>

            {/* Current crops */}
            {formData.plannedCrops.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.plannedCrops.map((crop, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700"
                  >
                    {crop}
                    <button
                      type="button"
                      onClick={() => removeCrop(crop)}
                      className="ml-2 hover:text-red-600"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add new crop */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCrop}
                onChange={(e) => setNewCrop(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCrop(newCrop))}
                className="input-field flex-1"
                placeholder="Nhập tên cây trồng..."
              />
              <Button
                type="button"
                onClick={() => addCrop(newCrop)}
                variant="secondary"
                icon={FiPlus}
              />
            </div>

            {/* Suggested crops */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Gợi ý:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedCrops.filter(c => !formData.plannedCrops.includes(c)).map(crop => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => addCrop(crop)}
                    className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700 transition-colors text-sm"
                  >
                    + {crop}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coordinates */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Tọa độ vùng (GeoJSON)</h3>
            <p className="text-sm text-gray-500 mb-3">
              Nhập tọa độ polygon theo định dạng JSON. Diện tích sẽ được tự động tính toán.
            </p>
            <textarea
              value={formData.coordinates}
              onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
              className="input-field font-mono text-sm"
              rows={5}
              placeholder='[[106.38, 20.40], [106.42, 20.40], [106.42, 20.43], [106.38, 20.43], [106.38, 20.40]]'
            />
            <p className="text-xs text-gray-400 mt-2">
              Định dạng: [[longitude, latitude], ...] - Điểm đầu và cuối phải trùng nhau
            </p>
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
              loading={submitting}
              variant="primary"
              icon={FiSave}
              className="flex-1"
            >
              Tạo vùng quy hoạch
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRegionPage;

