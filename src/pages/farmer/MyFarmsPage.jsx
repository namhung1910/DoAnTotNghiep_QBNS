import { useState, useEffect } from 'react';
import { FiMap, FiEdit, FiAlertCircle, FiFileText, FiPlus } from 'react-icons/fi';
import { farmAPI, regionAPI, landRequestAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import MapView from '../../components/map/MapView';
import toast from 'react-hot-toast';

const MyFarmsPage = () => {
  const [farms, setFarms] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState(null);

  // Land Request State
  const [pendingRequest, setPendingRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ purpose: '', commitment: '' });
  const [requesting, setRequesting] = useState(false);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    cropType: '',
    plantingDate: '',
    expectedHarvestDate: '',
    notes: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [farmsRes, regionsRes, requestRes] = await Promise.all([
        farmAPI.getMyFarms(),
        regionAPI.getAll(),
        landRequestAPI.getMyRequest().catch(() => ({ data: null }))
      ]);
      setFarms(farmsRes.data || []);
      setRegions(regionsRes.data || []);

      // Check for pending request
      if (requestRes.data && requestRes.data.status === 'pending') {
        setPendingRequest(requestRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLand = async (e) => {
    e.preventDefault();
    try {
      if (!requestForm.purpose || !requestForm.commitment) {
        toast.error('Vui lòng điền đầy đủ thông tin');
        return;
      }
      setRequesting(true);
      const res = await landRequestAPI.create(requestForm);
      setPendingRequest(res.data);
      setShowRequestModal(false);
      toast.success('Gửi yêu cầu thành công!');
    } catch (error) {
      console.error('Error requesting land:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setRequesting(false);
    }
  };

  const openUpdateModal = (farm) => {
    setSelectedFarm(farm);
    setUpdateForm({
      status: farm.status,
      cropType: farm.cropType,
      plantingDate: farm.plantingDate ? new Date(farm.plantingDate).toISOString().split('T')[0] : '',
      expectedHarvestDate: farm.expectedHarvestDate ? new Date(farm.expectedHarvestDate).toISOString().split('T')[0] : '',
      notes: farm.notes || ''
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSeason = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      await farmAPI.updateSeason(selectedFarm._id, updateForm);
      toast.success('Cập nhật mùa vụ thành công!');
      setShowUpdateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating season:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      planning: 'Đang quy hoạch',
      planting: 'Đang gieo trồng',
      growing: 'Đang phát triển',
      harvesting: 'Sắp thu hoạch',
      harvested: 'Đã thu hoạch',
      fallow: 'Nghỉ canh tác'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      planting: 'bg-yellow-100 text-yellow-800',
      growing: 'bg-green-100 text-green-800',
      harvesting: 'bg-red-100 text-red-800',
      harvested: 'bg-purple-100 text-purple-800',
      fallow: 'bg-gray-100 text-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải danh sách thửa đất..." />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thửa đất của tôi</h1>
          <p className="text-gray-600">Quản lý các lô đất được HTX phân chia</p>
        </div>
        {!pendingRequest && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus />
            <span>Xin cấp đất</span>
          </button>
        )}
      </div>

      {/* Map View */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiMap className="mr-2 text-primary-500" />
          Bản đồ thửa đất
        </h2>
        <div className="h-[400px] rounded-xl overflow-hidden">
          <MapView
            showRegions={true}
            showFarms={true}
            farms={farms}
            regions={regions}
            className="h-full"
          />
        </div>
      </div>

      {/* Pending Request Message */}
      {farms.length === 0 && pendingRequest && (
        <div className="card mb-6 bg-yellow-50 border border-yellow-200">
          <div className="flex items-start">
            <FiFileText className="text-yellow-600 mt-1 mr-3 text-xl" />
            <div>
              <h3 className="font-semibold text-yellow-800">Đơn xin cấp đất đang chờ duyệt</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Yêu cầu của bạn đã được gửi đến Hợp tác xã. Vui lòng chờ phản hồi.
                <br />
                <span className="italic opacity-80">Ngày gửi: {new Date(pendingRequest.createdAt).toLocaleDateString('vi-VN')}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Farms List */}
      {farms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <div key={farm._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{farm.name || 'Thửa đất'}</h3>
                  <p className="text-sm text-gray-500">{farm.cropType}</p>
                </div>
                <span className={`badge ${getStatusColor(farm.status)}`}>
                  {getStatusLabel(farm.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Diện tích:</span>
                  <span className="font-medium">{farm.area?.toLocaleString()} m²</span>
                </div>
                {farm.plantingDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngày trồng:</span>
                    <span>{new Date(farm.plantingDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                )}
                {farm.expectedHarvestDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dự kiến thu hoạch:</span>
                    <span className="text-primary-600 font-medium">
                      {new Date(farm.expectedHarvestDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
                {farm.regionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vùng quy hoạch:</span>
                    <span>{farm.regionId.name}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => openUpdateModal(farm)}
                className="w-full mt-4 btn-secondary flex items-center justify-center space-x-2"
              >
                <FiEdit />
                <span>Cập nhật mùa vụ</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        !pendingRequest && (
          <div className="card text-center py-12">
            <FiAlertCircle className="mx-auto text-5xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có thửa đất nào</h3>
            <p className="text-gray-500 mb-6">
              Bạn chưa được phân quyền sử dụng đất. Vui lòng gửi đơn xin cấp đất.
            </p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary"
            >
              Viết đơn xin cấp đất
            </button>
          </div>
        )
      )}

      {/* Update Season Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Cập nhật trạng thái mùa vụ"
        size="md"
      >
        <form onSubmit={handleUpdateSeason} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái canh tác
            </label>
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="input-field"
            >
              <option value="planning">Đang quy hoạch</option>
              <option value="planting">Đang gieo trồng</option>
              <option value="growing">Đang phát triển</option>
              <option value="harvesting">Sắp thu hoạch</option>
              <option value="harvested">Đã thu hoạch</option>
              <option value="fallow">Nghỉ canh tác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại cây trồng
            </label>
            <input
              type="text"
              value={updateForm.cropType}
              onChange={(e) => setUpdateForm({ ...updateForm, cropType: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày gieo trồng
              </label>
              <input
                type="date"
                value={updateForm.plantingDate}
                onChange={(e) => setUpdateForm({ ...updateForm, plantingDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dự kiến thu hoạch
              </label>
              <input
                type="date"
                value={updateForm.expectedHarvestDate}
                onChange={(e) => setUpdateForm({ ...updateForm, expectedHarvestDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={updateForm.notes}
              onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Ghi chú về tình trạng cây trồng, sâu bệnh..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowUpdateModal(false)}
              className="flex-1 btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Land Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Đơn xin cấp đất canh tác"
        size="lg"
      >
        <form onSubmit={handleRequestLand} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
            Đơn này sẽ được gửi đến Ban quản trị Hợp tác xã để xét duyệt. Vui lòng ghi rõ mục đích và cam kết của bạn.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mục đích sử dụng <span className="text-red-500">*</span>
            </label>
            <textarea
              value={requestForm.purpose}
              onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="VD: Trồng lúa chất lượng cao vụ Đông Xuân..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cam kết canh tác <span className="text-red-500">*</span>
            </label>
            <textarea
              value={requestForm.commitment}
              onChange={(e) => setRequestForm({ ...requestForm, commitment: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="VD: Tuân thủ quy trình canh tác hữu cơ, không sử dụng thuốc trừ sâu cấm..."
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="flex-1 btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={requesting}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {requesting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Gửi đơn</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyFarmsPage;

