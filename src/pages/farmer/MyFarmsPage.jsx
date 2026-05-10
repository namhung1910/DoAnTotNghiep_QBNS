import { useState, useEffect } from 'react';
import { FiMap, FiEdit, FiAlertCircle, FiFileText, FiPlus, FiClock, FiTrash2 } from 'react-icons/fi';
import { farmAPI, regionAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import MapView from '../../components/map/MapView';
import AddFarmModal from '../../components/farm/AddFarmModal';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';

const MyFarmsPage = () => {
  const [farms, setFarms] = useState([]);
  const [pendingFarms, setPendingFarms] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null); // Chi tiết vùng quy hoạch khi click bản đồ

  // Add Farm Modal
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [deletingFarmId, setDeletingFarmId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, farm: null });

  // New Season Modal
  const [showNewSeasonModal, setShowNewSeasonModal] = useState(false);
  const [newSeasonForm, setNewSeasonForm] = useState({
    cropType: '',
    plantingDate: '',
    expectedHarvestDate: '',
    notes: ''
  });

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    cropType: '',
    plantingDate: '',
    expectedHarvestDate: '',
    notes: '',
    actualYield: '',
    yieldUnit: 'kg',
    expectedYield: '',
    actualHarvestDate: '',
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [farmsRes, regionsRes] = await Promise.all([
        farmAPI.getMyFarms(),
        regionAPI.getAll(),
      ]);
      const allMyFarms = farmsRes.data || [];
      // Tách thửa đất đã duyệt và đang chờ
      setFarms(allMyFarms.filter(f => f.approvalStatus === 'approved' || !f.approvalStatus));
      setPendingFarms(allMyFarms.filter(f => f.approvalStatus === 'pending'));
      setRegions(regionsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteFarm = (farm) => {
    setDeleteModal({ open: true, farm });
  };

  const confirmDeleteFarm = async () => {
    const farm = deleteModal.farm;
    if (!farm) return;
    try {
      setDeletingFarmId(farm._id);
      await farmAPI.delete(farm._id);
      toast.success(`Đã xóa thửa đất "${farm.name}"`);
      setDeleteModal({ open: false, farm: null });
      fetchData();
    } catch (error) {
      console.error('Error deleting farm:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa thửa đất');
    } finally {
      setDeletingFarmId(null);
    }
  };

  const openUpdateModal = (farm) => {
    setSelectedFarm(farm);
    setUpdateForm({
      status: farm.status,
      cropType: farm.cropType,
      plantingDate: farm.plantingDate ? new Date(farm.plantingDate).toISOString().split('T')[0] : '',
      expectedHarvestDate: farm.expectedHarvestDate ? new Date(farm.expectedHarvestDate).toISOString().split('T')[0] : '',
      notes: farm.notes || '',
      actualYield: farm.actualYield || '',
      yieldUnit: farm.yieldUnit || 'kg',
      expectedYield: farm.expectedYield || '',
      actualHarvestDate: farm.actualHarvestDate ? new Date(farm.actualHarvestDate).toISOString().split('T')[0] : '',
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
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartNewSeason = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      await farmAPI.startNewSeason(selectedFarm._id, newSeasonForm);
      toast.success('Bắt đầu vụ mới thành công!');
      setShowNewSeasonModal(false);
      fetchData();
    } catch (error) {
      console.error('Error starting new season:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
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
      cancelled: 'Hủy vụ'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      planting: 'bg-yellow-100 text-yellow-800',
      growing: 'bg-green-100 text-green-800',
      harvesting: 'bg-orange-100 text-orange-800',
      harvested: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Kiểm tra thửa đất đến hạn thu hoạch nhưng chưa thu
  const isOverdueHarvest = (farm) => {
    if (farm.status === 'harvested' || farm.status === 'cancelled') return false;
    if (!farm.expectedHarvestDate) return false;
    return new Date(farm.expectedHarvestDate) < new Date();
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải danh sách thửa đất..." />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thửa đất của tôi</h1>
          <p className="text-gray-600">Quản lý thửa đất canh tác của bạn</p>
        </div>
        <Button
          onClick={() => setShowAddFarmModal(true)}
          variant="primary"
          icon={FiPlus}
        >
          Thêm thửa đất của tôi
        </Button>
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
            onRegionClick={(feature) => setSelectedRegion(feature.properties)}
            className="h-full"
          />
        </div>
      </div>

      {/* Region detail modal — hiện khi nông dân click vùng quy hoạch */}
      {selectedRegion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4" onClick={() => setSelectedRegion(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết vùng quy hoạch</h3>
              <button onClick={() => setSelectedRegion(null)} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Tên vùng</p>
                <p className="font-semibold text-gray-900">{selectedRegion.name || 'Chưa đặt tên'}</p>
              </div>
              {selectedRegion.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Mô tả</p>
                  <p className="text-gray-700">{selectedRegion.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Loại thổ nhưỡng</p>
                  <p className="text-gray-700">{selectedRegion.soilType || 'Đất phù sa'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Tổng diện tích</p>
                  <p className="text-gray-700">
                    {selectedRegion.totalArea
                      ? selectedRegion.totalArea >= 10000
                        ? `${(selectedRegion.totalArea / 10000).toFixed(2)} ha`
                        : `${selectedRegion.totalArea.toLocaleString()} m²`
                      : 'Chưa xác định'}
                  </p>
                </div>
              </div>
              {selectedRegion.zoneCode && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phân loại vùng</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {selectedRegion.zoneCode}
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedRegion.zoneType === 'VLT' && '(Vùng cây lương thực)'}
                      {selectedRegion.zoneType === 'VCN' && '(Vùng cây công nghiệp)'}
                      {selectedRegion.zoneType === 'VAR' && '(Vùng cây ăn quả & rau màu)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending farms - awaiting approval */}
      {pendingFarms.length > 0 && (
        <div className="card mb-6 bg-yellow-50 border border-yellow-200">
          <div className="flex items-start">
            <FiClock className="text-yellow-600 mt-1 mr-3 text-xl flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800">Thửa đất đang chờ HTX phê duyệt ({pendingFarms.length})</h3>
              <div className="mt-2 space-y-1">
                {pendingFarms.map(f => (
                  <p key={f._id} className="text-yellow-700 text-sm">
                    • <strong>{f.name}</strong> — {f.cropType} — {f.area?.toLocaleString()} m²
                    <span className="ml-2 text-xs italic opacity-80">
                      Gửi ngày {new Date(f.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </p>
                ))}
              </div>
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
                {farm.expectedHarvestDate && farm.status !== 'harvested' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dự kiến thu hoạch:</span>
                    <span className={isOverdueHarvest(farm) ? 'text-red-600 font-semibold' : 'text-primary-600 font-medium'}>
                      {new Date(farm.expectedHarvestDate).toLocaleDateString('vi-VN')}
                      {isOverdueHarvest(farm) && ' ⚠️'}
                    </span>
                  </div>
                )}
                {farm.status === 'harvested' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sản lượng:</span>
                    {farm.actualYield > 0
                      ? <span className="font-semibold text-green-700">{farm.actualYield.toLocaleString()} {farm.yieldUnit}</span>
                      : <span className="text-orange-500 font-medium">⚠️ Chưa nhập</span>
                    }
                  </div>
                )}
                {farm.regionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vùng quy hoạch:</span>
                    <span>{farm.regionId.name}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {['harvested', 'cancelled'].includes(farm.status) ? (
                  <Button
                    onClick={() => {
                      setSelectedFarm(farm);
                      setNewSeasonForm({
                        cropType: farm.cropType || '',
                        plantingDate: new Date().toISOString().split('T')[0],
                        expectedHarvestDate: '',
                        notes: ''
                      });
                      setShowNewSeasonModal(true);
                    }}
                    variant="primary"
                    className={`flex-1 text-sm ${farm.status !== 'harvested' ? '!bg-orange-500 hover:!bg-orange-600' : ''}`}
                  >
                    {farm.status === 'harvested' ? '🌱 Bắt đầu vụ mới' : '♻️ Khởi động lại vụ mới'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => openUpdateModal(farm)}
                    variant="secondary"
                    icon={FiEdit}
                    className="flex-1"
                  >
                    Cập nhật mùa vụ
                  </Button>
                )}
                <button
                  onClick={() => handleDeleteFarm(farm)}
                  disabled={deletingFarmId === farm._id}
                  className="p-2 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                  title="Xóa thửa đất"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        pendingFarms.length === 0 && (
          <div className="card text-center py-12">
            <FiAlertCircle className="mx-auto text-5xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có thửa đất nào</h3>
            <p className="text-gray-500 mb-6">
              Hãy thêm thửa đất của bạn bằng GPS hoặc vẽ tay trên bản đồ.
            </p>
            <Button
              onClick={() => setShowAddFarmModal(true)}
              variant="primary"
            >
              Thêm thửa đất ngay
            </Button>
          </div>
        )
      )}

      {/* Update Season Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Cập nhật mùa vụ"
        size="md"
      >
        <form onSubmit={handleUpdateSeason} className="space-y-4">

          {/* Thanh tiến trình mùa vụ */}
          <div className="flex items-center justify-between mb-2">
            {['planting', 'growing', 'harvesting', 'harvested'].map((s, i, arr) => (
              <div key={s} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => {
                    const statusOrder = ['planning', 'planting', 'growing', 'harvesting', 'harvested'];
                    const currentStatus = selectedFarm?.status || 'planning';
                    if (currentStatus === 'cancelled') return; // Không cho click nếu đã hủy

                    const currentIdx = statusOrder.indexOf(currentStatus);
                    const targetIdx = ['planting', 'growing', 'harvesting', 'harvested'].indexOf(s) + 1; // offset by 1 because 'planning' is index 0

                    if (targetIdx === currentIdx || targetIdx === currentIdx + 1 || (currentStatus === 'planning' && s === 'planting')) {
                      setUpdateForm(f => ({ ...f, status: s }));
                    } else if (targetIdx < currentIdx) {
                      toast.error('Chỉ được tiến, không thể quay lại bước trước.');
                    } else {
                      toast.error('Giai đoạn này chưa tới.');
                    }
                  }}
                  className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all flex items-center justify-center ${updateForm.status === s
                    ? 'bg-primary-600 border-primary-600 text-white scale-110'
                    : ['planting', 'growing', 'harvesting', 'harvested'].indexOf(updateForm.status) > i
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                  title={getStatusLabel(s)}
                >
                  {i + 1}
                </button>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-1 ${['planting', 'growing', 'harvesting', 'harvested'].indexOf(updateForm.status) > i
                    ? 'bg-primary-300' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
            <span>Gieo trồng</span><span>Phát triển</span><span>Sắp TH</span><span>Đã TH</span>
          </div>

          {/* Dropdown trạng thái - bao gồm cả cancelled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái cây trồng</label>
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="input-field"
            >
              <option value={selectedFarm?.status}>{getStatusLabel(selectedFarm?.status)}</option>
              {['planning', 'planting', 'growing', 'harvesting', 'harvested'].map((s, i) => {
                const currentIdx = ['planning', 'planting', 'growing', 'harvesting', 'harvested'].indexOf(selectedFarm?.status);
                if (i === currentIdx + 1) {
                  return <option key={s} value={s}>{getStatusLabel(s)}</option>;
                }
                return null;
              })}
              <option value="cancelled">Hủy vụ (thiên tai / dịch bệnh)</option>
            </select>
          </div>

          {/* Trường theo từng trạng thái */}

          {/* planting: loại cây, ngày gieo, dự kiến */}
          {(updateForm.status === 'planting') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại cây trồng</label>
                <input type="text" value={updateForm.cropType}
                  onChange={(e) => setUpdateForm({ ...updateForm, cropType: e.target.value })}
                  className="input-field" placeholder="VD: Lúa nước, ngô, sắn..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày gieo trồng</label>
                  <input type="date" value={updateForm.plantingDate}
                    onChange={(e) => setUpdateForm({ ...updateForm, plantingDate: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dự kiến thu hoạch</label>
                  <input type="date" value={updateForm.expectedHarvestDate}
                    onChange={(e) => setUpdateForm({ ...updateForm, expectedHarvestDate: e.target.value })}
                    className="input-field" />
                </div>
              </div>
            </>
          )}

          {/* growing: ghi chú tình trạng */}
          {updateForm.status === 'growing' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú tình trạng cây</label>
              <textarea value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                className="input-field" rows={3}
                placeholder="Tình trạng cây trồng, sâu bệnh..." />
            </div>
          )}

          {/* harvesting: dự kiến năng suất */}
          {updateForm.status === 'harvesting' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dự kiến năng suất (kg)</label>
                <input type="number" value={updateForm.expectedYield}
                  onChange={(e) => setUpdateForm({ ...updateForm, expectedYield: e.target.value })}
                  className="input-field" placeholder="VD: 200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  className="input-field" rows={2}
                  placeholder="Tình trạng trước thu hoạch..." />
              </div>
            </>
          )}

          {/* harvested: sản lượng thực tế */}
          {updateForm.status === 'harvested' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                🌾 Nhập sản lượng để hệ thống thống kê chính xác. Nếu chưa cân xong, bạn có thể để trống và cập nhật sau.
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sản lượng thực tế
                  </label>
                  <input type="number" value={updateForm.actualYield}
                    onChange={(e) => setUpdateForm({ ...updateForm, actualYield: e.target.value })}
                    className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                  <select value={updateForm.yieldUnit}
                    onChange={(e) => setUpdateForm({ ...updateForm, yieldUnit: e.target.value })}
                    className="input-field">
                    <option value="kg">kg</option>
                    <option value="tấn">tấn</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày thu hoạch thực tế</label>
                <input type="date" value={updateForm.actualHarvestDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, actualHarvestDate: e.target.value })}
                  className="input-field" />
              </div>
            </>
          )}

          {/* cancelled: lý do */}
          {updateForm.status === 'cancelled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lý do hủy vụ <span className="text-red-500">*</span>
              </label>
              <textarea value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                className="input-field" rows={3}
                placeholder="VD: lủ lụt, dịch rầy nâu, mất mùa..."
                required />
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <Button type="button" onClick={() => setShowUpdateModal(false)} variant="secondary" className="flex-1">Hủy</Button>
            <Button type="submit" loading={updating} variant="primary" className="flex-1">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Start New Season Modal */}
      <Modal
        isOpen={showNewSeasonModal}
        onClose={() => setShowNewSeasonModal(false)}
        title={selectedFarm?.status === 'cancelled' ? "Khởi động lại vụ mới" : "Bắt đầu vụ mới"}
        size="md"
      >
        <form onSubmit={handleStartNewSeason} className="space-y-4">
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-sm text-primary-800 mb-4">
            <p><strong>Lưu ý:</strong> Khởi tạo vụ mới sẽ làm mới thông tin ngày trồng và năng suất cho thửa đất này.</p>
            {selectedFarm?.yieldInKg > 0 && selectedFarm?.status === 'harvested' && (
              <p className="mt-1 opacity-80">Sản lượng của vụ trước đã được lưu vào Lịch sử thu hoạch.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại cây trồng mới <span className="text-red-500">*</span></label>
            <input type="text" value={newSeasonForm.cropType}
              onChange={(e) => setNewSeasonForm({ ...newSeasonForm, cropType: e.target.value })}
              className="input-field" placeholder="VD: Lúa nước, ngô, sắn..." required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu gieo trồng</label>
              <input type="date" value={newSeasonForm.plantingDate}
                onChange={(e) => setNewSeasonForm({ ...newSeasonForm, plantingDate: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dự kiến thu hoạch</label>
              <input type="date" value={newSeasonForm.expectedHarvestDate}
                onChange={(e) => setNewSeasonForm({ ...newSeasonForm, expectedHarvestDate: e.target.value })}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
            <textarea value={newSeasonForm.notes}
              onChange={(e) => setNewSeasonForm({ ...newSeasonForm, notes: e.target.value })}
              className="input-field" rows={3}
              placeholder="Chuẩn bị làm đất, thời tiết..." />
          </div>

          <div className="flex space-x-3 pt-2">
            <Button type="button" onClick={() => setShowNewSeasonModal(false)} variant="secondary" className="flex-1">Hủy</Button>
            <Button type="submit" loading={updating} variant="primary" className="flex-1">
              {selectedFarm?.status === 'cancelled' ? 'Khởi động' : 'Bắt đầu ngay'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Farm Modal */}
      <AddFarmModal
        isOpen={showAddFarmModal}
        onClose={() => setShowAddFarmModal(false)}
        onSuccess={fetchData}
      />

      {/* Delete Farm Confirm Modal */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, farm: null })} title="Xác nhận xóa" size="sm">
        <p className="text-gray-600 mb-6">Bạn có chắc muốn xóa thửa đất "{deleteModal.farm?.name}" không? Hành động này không thể hoàn tác.</p>
        <div className="flex space-x-3">
          <Button onClick={() => setDeleteModal({ open: false, farm: null })} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button onClick={confirmDeleteFarm} loading={deletingFarmId === deleteModal.farm?._id} variant="danger" className="flex-1">
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MyFarmsPage;

