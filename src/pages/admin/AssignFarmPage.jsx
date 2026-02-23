import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiMap, FiUser } from 'react-icons/fi';
import { farmAPI, authAPI, regionAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AssignFarmPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farmers, setFarmers] = useState([]);
  const [regions, setRegions] = useState([]);

  const [formData, setFormData] = useState({
    ownerId: '',
    regionId: '',
    name: '',
    cropType: '',
    area: '',
    status: 'planning',
    planningData: '',
    coordinates: ''
  });

  const statusOptions = [
    { value: 'planning', label: 'Đang quy hoạch' },
    { value: 'planting', label: 'Đang gieo trồng' },
    { value: 'growing', label: 'Đang phát triển' },
    { value: 'harvesting', label: 'Sắp thu hoạch' },
    { value: 'fallow', label: 'Nghỉ canh tác' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [farmersRes, regionsRes] = await Promise.all([
        authAPI.getUsers({ role: 'farmer', limit: 100 }),
        regionAPI.getAll()
      ]);
      setFarmers(farmersRes.data.users || []);
      setRegions(regionsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ownerId) {
      toast.error('Vui lòng chọn nông dân');
      return;
    }
    if (!formData.cropType) {
      toast.error('Vui lòng nhập loại cây trồng');
      return;
    }
    if (!formData.area) {
      toast.error('Vui lòng nhập diện tích');
      return;
    }

    // Parse coordinates - REQUIRED
    let geometry;
    try {
      if (!formData.coordinates || formData.coordinates.trim() === '') {
        toast.error('Vui lòng nhập tọa độ thửa đất');
        return;
      }

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
      await farmAPI.create({
        ...formData,
        area: parseFloat(formData.area),
        geometry
      });
      toast.success('Đã giao đất thành công!');
      navigate('/admin/farms');
    } catch (error) {
      console.error('Error creating farm:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải dữ liệu..." />;
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
            <h1 className="text-2xl font-bold text-gray-900">Giao đất cho nông dân</h1>
            <p className="text-gray-600">Phân chia và gán thửa đất cho nông dân quản lý</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Farmer Selection */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FiUser className="mr-2 text-primary-500" />
              Chọn nông dân
            </h3>
            {farmers.length > 0 ? (
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">-- Chọn nông dân --</option>
                {farmers.map(farmer => (
                  <option key={farmer._id} value={farmer._id}>
                    {farmer.fullName} - {farmer.phone} ({farmer.address})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500">Chưa có nông dân nào trong hệ thống</p>
            )}
          </div>

          {/* Region Selection */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FiMap className="mr-2 text-primary-500" />
              Vùng quy hoạch (không bắt buộc)
            </h3>
            <select
              value={formData.regionId}
              onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
              className="input-field"
            >
              <option value="">-- Chọn vùng quy hoạch --</option>
              {regions.map(region => (
                <option key={region._id} value={region._id}>
                  {region.name} - {(region.totalArea / 10000).toFixed(2)} ha
                </option>
              ))}
            </select>
          </div>

          {/* Farm Details */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Thông tin thửa đất</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên thửa đất
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="VD: Thửa đất số 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại cây trồng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cropType}
                    onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                    className="input-field"
                    placeholder="VD: Lúa chất lượng cao"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diện tích (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="input-field"
                    placeholder="5000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái ban đầu
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú quy hoạch
                </label>
                <textarea
                  value={formData.planningData}
                  onChange={(e) => setFormData({ ...formData, planningData: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Thông tin bổ sung về quy hoạch..."
                />
              </div>
            </div>
          </div>

          {/* Coordinates */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Tọa độ thửa đất (GeoJSON)</h3>
            <p className="text-sm text-gray-500 mb-3">
              Nhập tọa độ polygon. Nếu để trống, hệ thống sẽ tự tạo tọa độ mẫu.
            </p>
            <textarea
              value={formData.coordinates}
              onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
              className="input-field font-mono text-sm"
              rows={4}
              placeholder='[[106.398, 20.412], [106.402, 20.412], [106.402, 20.415], [106.398, 20.415], [106.398, 20.412]]'
            />
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
              disabled={submitting || farmers.length === 0}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave />
                  <span>Giao đất</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignFarmPage;

