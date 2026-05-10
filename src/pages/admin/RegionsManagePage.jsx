import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FiUpload, FiPlus, FiEdit2, FiTrash2, FiMap, FiEye } from 'react-icons/fi';
import { regionAPI, farmAPI, landRequestAPI } from '../../services/api';
import area from '@turf/area'; // Import area calculation
import { booleanOverlap, booleanIntersects, booleanWithin } from '@turf/turf'; // Import validation functions
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import DeletedRegionsModal from '../../components/admin/DeletedRegionsModal';
import MapView from '../../components/map/MapView';
import toast from 'react-hot-toast';

const RegionsManagePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  // Assign Mode State
  const [assignMode, setAssignMode] = useState(false);
  const [assignRequest, setAssignRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [createRegionModal, setCreateRegionModal] = useState(false);
  const [drawingMode, setDrawingMode] = useState(null); // 'region' | 'farm' | null

  // Universal Modal State (for confirmations/prompts)
  const [activeModal, setActiveModal] = useState({ type: null, data: null, extra: '' });

  // Pending forms state (to save data when switching to draw mode)
  const [pendingRegionForm, setPendingRegionForm] = useState({
    name: '',
    description: '',
    zoneType: '',
    zoneCode: '',
    soilType: '',
    totalArea: '',
    coordinates: ''
  });

  // Rename Region Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingRegion, setRenamingRegion] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Assign/Create Farm Form
  const [assignForm, setAssignForm] = useState({
    name: '',
    cropType: '',
    area: '',
    coordinates: '',
    regionId: ''
  });
  const [assigning, setAssigning] = useState(false);
  const [creatingRegion, setCreatingRegion] = useState(false);

  useEffect(() => {
    fetchData();

    // Check for assign mode from location state
    if (location.state?.assignMode) {
      setAssignMode(true);
      setAssignRequest({
        id: location.state.requestId,
        user: location.state.user
      });
      setAssignRequest({
        id: location.state.requestId,
        user: location.state.user
      });
      // Don't open modal automatically - let user choose
      // setShowAssignModal(true); 
      // Clean up state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regionsRes, farmsRes] = await Promise.all([
        regionAPI.getAll(),
        farmAPI.getAll()
      ]);
      setRegions(regionsRes.data || []);
      setFarms(farmsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateRegion = () => {
    setCreateRegionModal(true);
    setDrawingMode(null);
    // Reset form if not coming back from drawing
    if (!drawingMode) {
      setPendingRegionForm({
        name: '',
        description: '',
        zoneType: '',
        zoneCode: '',
        soilType: '',
        totalArea: '',
        coordinates: ''
      });
    }
  };

  // Kự năng: xếm trước mã vùng khi chọn loại phân vùng
  const handleZoneTypeChange = async (zoneType) => {
    setPendingRegionForm(prev => ({ ...prev, zoneType, zoneCode: '' }));
    if (!zoneType) return;
    try {
      const res = await regionAPI.getNextZoneCode(zoneType);
      setPendingRegionForm(prev => ({ ...prev, zoneCode: res.data.zoneCode }));
    } catch (e) { /* ignore */ }
  };

  // Xử lý đổi tên vùng
  const handleRenameRegion = async (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    try {
      setSavingRename(true);
      await regionAPI.rename(renamingRegion._id, renameValue.trim());
      toast.success('Dổi tên thành công!');
      setShowRenameModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đổi tên');
    } finally {
      setSavingRename(false);
    }
  };

  const handleRegionSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreatingRegion(true);

      let geometry;
      try {
        const coords = JSON.parse(pendingRegionForm.coordinates);
        geometry = {
          type: 'Polygon',
          coordinates: [coords]
        };
      } catch (err) {
        toast.error('Tọa độ không hợp lệ');
        setCreatingRegion(false);
        return;
      }

      await regionAPI.create({
        name: pendingRegionForm.name,
        description: pendingRegionForm.description,
        zoneType: pendingRegionForm.zoneType,
        soilType: pendingRegionForm.soilType,
        totalArea: parseFloat(pendingRegionForm.totalArea),
        geometry: geometry
      });

      toast.success('Tạo vùng quy hoạch thành công');
      setCreateRegionModal(false);
      fetchData();
    } catch (error) {
      console.error('Create region error:', error);
      toast.error('Lỗi khi tạo vùng quy hoạch');
    } finally {
      setCreatingRegion(false);
    }
  };

  const handleUploadGeoJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('geojson', file);

      // ... (existing upload logic)
      const response = await regionAPI.uploadGeoJSON(formData);
      toast.success(response.data.message);
      setShowUploadModal(false);
      fetchData();
    } catch (error) {
      console.error('Error uploading GeoJSON:', error);
      toast.error('Lỗi upload file GeoJSON');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    setActiveModal({ type: 'deleteRegion', data: id });
  };

  const confirmDeleteRegion = async () => {
    const id = activeModal.data;
    if (!id) return;
    try {
      await regionAPI.delete(id);
      toast.success('Đã xóa vùng quy hoạch');
      setActiveModal({ type: null, data: null, extra: '' });
      fetchData();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Không thể xóa vùng quy hoạch');
    }
  };

  const handleRevoke = () => {
    if (!selectedFarm || !selectedFarm.id) return;
    setActiveModal({ type: 'revokeFarm', data: selectedFarm.id, extra: '' });
  };

  const confirmRevokeFarm = async (e) => {
    e.preventDefault();
    const reason = activeModal.extra;
    const farmId = activeModal.data;
    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do thu hồi');
      return;
    }

    try {
      setRevoking(true);
      await farmAPI.revoke(farmId, { reason });
      toast.success('Đã thu hồi thửa đất');
      setActiveModal({ type: null, data: null, extra: '' });
      setSelectedFarm(null);
      fetchData();
    } catch (error) {
      console.error('Revoke error:', error);
      toast.error('Lỗi khi thu hồi đất');
    } finally {
      setRevoking(false);
    }
  };

  const handleCreatePlot = () => {
    setShowAssignModal(true);
    setAssignMode(false); // Creating unassigned plot
    setAssignRequest(null);
    setAssignForm({
      // name đã bỏ — backend tự sinh tên từ farmerCode + zoneCode
      cropType: '',
      area: '',
      coordinates: '',
      regionId: ''
    });
  };

  const handleAssignExistingFarm = (farm) => {
    setActiveModal({ type: 'assignFarm', data: farm });
  };

  const confirmAssignFarm = async () => {
    const farm = activeModal.data;
    if (!farm) return;
    const farmId = farm._id || farm.id;

    try {
      setAssigning(true);
      // Update Farm owner
      await farmAPI.update(farmId, {
        ownerId: assignRequest.user._id,
        status: 'planting', // Reset status for new owner
        notes: `Giao đất ngày ${new Date().toLocaleDateString()}`
      });

      // Update Request
      await landRequestAPI.updateStatus(assignRequest.id, {
        status: 'approved',
        assignedFarm: farmId
      });

      toast.success('Giao đất thành công!');
      setActiveModal({ type: null, data: null, extra: '' });
      setAssignMode(false);
      setAssignRequest(null);
      setSelectedFarm(null); // Close modal
      fetchData();
      navigate('/admin/land-requests');

    } catch (error) {
      console.error('Error assigning existing farm:', error);
      toast.error('Lỗi khi giao đất: ' + (error.response?.data?.message || error.message));
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      setAssigning(true);

      // Parse coordinates
      let geometry;
      try {
        const coords = JSON.parse(assignForm.coordinates);
        geometry = {
          type: 'Polygon',
          coordinates: [coords]
        };
      } catch (err) {
        toast.error('Tọa độ không hợp lệ');
        setAssigning(false);
        return;
      }

      // 1. Create Farm — không gửi name, backend tự sinh
      const farmRes = await farmAPI.create({
        cropType: assignForm.cropType,
        area: parseFloat(assignForm.area),
        geometry: geometry,
        regionId: assignForm.regionId || undefined,
        ownerId: assignRequest?.user?._id || undefined,
        status: 'planning'
        // name bỏ — backend tự tra farmerCode (từ ownerId) + zoneCode (từ regionId)
      });

      // 2. If Assign Mode, Update Request Status
      if (assignMode && assignRequest) {
        await landRequestAPI.updateStatus(assignRequest.id, {
          status: 'approved',
          assignedFarm: farmRes.data._id
        });
        navigate('/admin/land-requests');
      }

      toast.success(assignMode ? 'Giao đất thành công!' : 'Tạo thửa đất thành công!');
      setShowAssignModal(false);
      setAssignMode(false);
      setAssignRequest(null);
      fetchData();

      if (assignMode) {
        navigate('/admin/land-requests');
      }

    } catch (error) {
      console.error('Assignments error', error);
      toast.error('Có lỗi xảy ra khi giao đất');
    } finally {
      setAssigning(false);
    }
  };

  const handleDrawCreated = (e) => {
    const { layer } = e;
    const geoJSON = layer.toGeoJSON();
    const geometry = geoJSON.geometry;

    // Calculate area (sq meters)
    const calculatedArea = area(geoJSON);

    // Convert to [lng, lat] format string for the form
    const coords = geometry.coordinates[0];
    const coordsString = JSON.stringify(coords);

    // ========= VALIDATION LOGIC =========

    if (drawingMode === 'region') {
      // VALIDATION: Check if new region overlaps any existing region
      for (const existingRegion of regions) {
        if (existingRegion.geometry) {
          const existingPolygon = {
            type: 'Feature',
            geometry: existingRegion.geometry
          };

          try {
            if (booleanOverlap(geoJSON, existingPolygon) ||
              booleanIntersects(geoJSON, existingPolygon)) {
              toast.error(`Vùng quy hoạch mới không được chồng lên vùng "${existingRegion.name}"!`);
              e.layer.remove();
              setDrawingMode(null);
              return;
            }
          } catch (err) {
            console.error('Error checking region overlap:', err);
          }
        }
      }
    } else {
      // Farm Mode - VALIDATION 1: Farm must be within at least ONE region
      let isWithinRegion = false;
      let containingRegion = null;

      for (const region of regions) {
        if (region.geometry) {
          const regionPolygon = {
            type: 'Feature',
            geometry: region.geometry
          };

          try {
            if (booleanWithin(geoJSON, regionPolygon)) {
              isWithinRegion = true;
              containingRegion = region;
              break;
            }
          } catch (err) {
            console.error('Error checking region containment:', err);
          }
        }
      }

      if (!isWithinRegion) {
        toast.error('Thửa đất phải nằm hoàn toàn trong vùng quy hoạch!');
        e.layer.remove();
        setDrawingMode(null);
        return;
      }

      // Farm Mode - VALIDATION 2: Farm must NOT overlap existing farms
      for (const existingFarm of farms) {
        // Guard: skip Point-geometry farms (marker-based) — turf booleanOverlap requires Polygon
        if (!existingFarm.geometry || existingFarm.geometry.type === 'Point') continue;
        const existingPolygon = {
          type: 'Feature',
          geometry: existingFarm.geometry
        };

        try {
          if (booleanOverlap(geoJSON, existingPolygon) ||
            booleanIntersects(geoJSON, existingPolygon)) {
            toast.error(`Thửa đất mới không được chồng lên thửa đất "${existingFarm.name}"!`);
            e.layer.remove();
            setDrawingMode(null);
            return;
          }
        } catch (err) {
          console.error('Error checking farm overlap:', err);
        }
      }

      // Auto-fill regionId if we found containing region
      if (containingRegion) {
        setAssignForm(prev => ({
          ...prev,
          regionId: containingRegion._id
        }));
      }
    }

    // ========= VALIDATION PASSED - Proceed =========

    if (drawingMode === 'region') {
      setPendingRegionForm(prev => ({
        ...prev,
        totalArea: Math.round(calculatedArea),
        coordinates: coordsString
      }));
      setCreateRegionModal(true);
    } else {
      // Farm Mode (default or explicit)
      setAssignForm(prev => ({
        ...prev,
        area: Math.round(calculatedArea),
        coordinates: coordsString
      }));
      setShowAssignModal(true);

      // If not in assign mode, we are creating a new plot (unassigned or assigned later)
      if (!assignMode) {
        setAssignRequest(null);
      }
    }

    setDrawingMode(null);
    e.layer.remove();
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải dữ liệu..." />;
  }

  // Admin xóa thửa đất bất kỳ (soft delete)
  const handleAdminDeleteFarm = (farm) => {
    setActiveModal({ type: 'deleteFarm', data: farm });
  };

  const confirmAdminDeleteFarm = async () => {
    const farm = activeModal.data;
    if (!farm) return;
    try {
      await farmAPI.delete(farm._id);
      toast.success('Đã xóa thửa đất');
      setActiveModal({ type: null, data: null, extra: '' });
      fetchData();
    } catch (error) {
      console.error('Error deleting farm:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa thửa đất');
    }
  };

  // Helper to get owner name safely (mirrors MapView logic)
  const getOwnerName = (properties) => {

    if (properties?.ownerName) return properties.ownerName;
    if (properties?.ownerId?.fullName) return properties.ownerId.fullName;
    // Check if ownerId is a populated object with fullName
    if (typeof properties?.ownerId === 'object' && properties?.ownerId?.fullName) {
      return properties.ownerId.fullName;
    }
    return null;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đất đai</h1>
          <p className="text-gray-600">Quản lý vùng quy hoạch và thửa đất nông nghiệp</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline-danger"
            icon={FiTrash2}
            onClick={() => setShowDeletedModal(true)}
            title="Xem các vùng quy hoạch đã xóa"
          >
            <span className="hidden sm:inline">Thùng rác</span>
          </Button>
          <Button
            variant="primary"
            icon={FiPlus}
            onClick={handleOpenCreateRegion}
          >
            Tạo vùng quy hoạch
          </Button>
        </div>
      </div>


      {/* Drawing Mode Banner */}
      {!!drawingMode && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 flex justify-between items-center animate-pulse">
          <div>
            <p className="font-bold text-yellow-700">Đang ở chế độ vẽ: {drawingMode === 'region' ? 'Vùng quy hoạch' : 'Thửa đất'}</p>
            <p className="text-sm text-yellow-600">
              * Sử dụng công cụ hình ngũ giác (Polygon) trên bản đồ để vẽ. Nhấn vào điểm đầu tiên để kết thúc.
            </p>
          </div>
          <button
            onClick={() => {
              setDrawingMode(null);
              if (drawingMode === 'region') setCreateRegionModal(true);
              else setShowAssignModal(true);
            }}
            className="text-sm text-yellow-600 hover:text-yellow-800 underline"
          >
            Hủy vẽ & Quay lại
          </button>
        </div>
      )}

      {/* Map View */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiMap className="mr-2 text-primary-500" />
          Bản đồ quy hoạch & Thửa đất {!!drawingMode && <span className="text-red-500 ml-2">(Đang vẽ...)</span>}
        </h2>
        <div className="h-[500px] rounded-xl overflow-hidden">
          <MapView
            showRegions={true}
            showFarms={true}
            farms={farms}
            editable={!!drawingMode} // Only enable drawing when mode is active
            drawingMode={drawingMode} // Pass drawing mode for overlays
            showUnassigned={true} // Admin can see unassigned farms legend
            onCreated={handleDrawCreated} // Handle drawing event
            onRegionClick={(feature) => setSelectedRegion(feature.properties)}
            onFarmClick={(feature) => {
              const currentOwner = getOwnerName(feature.properties);
              if (assignMode) {
                // Check if unassigned
                if (!currentOwner) {
                  // handleAssignExistingFarm(feature.properties);
                  setSelectedFarm(feature.properties); // Open modal instead of direct confirm
                } else {
                  toast.error(`Thửa đất này đã có chủ: ${currentOwner}`);
                }
              } else {
                setSelectedFarm(feature.properties);
              }
            }}
            className="h-full"
          />
        </div>
      </div>

      {/* Bottom: 50/50 grid — Regions list | Farms list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Regions List ── */}
        <div className="card overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Danh sách vùng quy hoạch</h2>

          {regions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Tên vùng</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Thổ nhưỡng</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Diện tích</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => (
                    <tr key={region._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-900 text-sm">{region.name}</p>
                        {region.zoneCode && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{region.zoneCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 text-sm">{region.soilType}</td>
                      <td className="py-3 px-3 text-gray-600 text-sm">
                        {(region.totalArea / 10000).toFixed(2)} ha
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setSelectedRegion(region)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Xem chi tiết"
                          >
                            <FiEye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setRenamingRegion(region);
                              setRenameValue(region.name);
                              setShowRenameModal(true);
                            }}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            title="Đổi tên"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(region._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Xóa"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FiMap className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Chưa có vùng quy hoạch</p>
              <button onClick={() => setShowUploadModal(true)} className="btn-primary mt-3 text-sm">
                <FiUpload className="mr-1 inline" />Upload GeoJSON
              </button>
            </div>
          )}
        </div>

        {/* ── Farms List ── */}
        <div className="card overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Danh sách thửa đất
            <span className="ml-2 text-sm font-normal text-gray-400">({farms.filter(f => f.isActive !== false).length} thửa)</span>
          </h2>

          {farms.filter(f => f.isActive !== false).length > 0 ? (
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Tên thửa đất</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Chủ sở hữu</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Diện tích</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Trạng thái</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Duyệt</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.filter(f => f.isActive !== false).map((farm) => {
                    const statusColors = {
                      planning: 'bg-gray-100 text-gray-700',
                      planting: 'bg-yellow-100 text-yellow-700',
                      growing: 'bg-green-100 text-green-700',
                      harvesting: 'bg-orange-100 text-orange-700',
                      harvested: 'bg-purple-100 text-purple-700',
                      fallow: 'bg-gray-100 text-gray-500',
                    };
                    const statusLabels = {
                      planning: 'Quy hoạch',
                      planting: 'Gieo trồng',
                      growing: 'Phát triển',
                      harvesting: 'Sắp thu',
                      harvested: 'Đã thu',
                      fallow: 'Nghỉ',
                    };
                    const approvalColor = farm.approvalStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700';
                    const approvalLabel = farm.approvalStatus === 'pending' ? 'Chờ' : 'OK';

                    return (
                      <tr key={farm._id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-900 text-sm">{farm.name || 'Thửa đất'}</p>
                          <p className="text-xs text-gray-400">{farm.cropType}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-sm">
                          {farm.ownerId?.fullName || <span className="italic text-gray-400">Trống</span>}
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-sm">
                          {farm.area?.toLocaleString()} m²
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[farm.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[farm.status] || farm.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${approvalColor}`}>
                            {approvalLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setSelectedFarm(farm)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Xem chi tiết"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              onClick={() => handleAdminDeleteFarm(farm)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Xóa thửa đất"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FiMap className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Chưa có thửa đất nào</p>
            </div>
          )}
        </div>

      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload file GeoJSON"
        size="md"
      >
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUpload className="text-3xl text-primary-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Chọn file GeoJSON chứa dữ liệu vùng quy hoạch.<br />
            Hỗ trợ định dạng FeatureCollection và Feature.
          </p>
          <label className="btn-primary cursor-pointer">
            {uploading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang upload...</span>
              </div>
            ) : (
              <>
                <FiUpload className="mr-2" />
                <span>Chọn file</span>
              </>
            )}
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleUploadGeoJSON}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </Modal>

      {/* Region Detail Modal */}
      <Modal
        isOpen={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        title="Chi tiết vùng quy hoạch"
        size="md"
      >
        {selectedRegion && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Tên vùng</label>
              <p className="font-semibold text-gray-900">{selectedRegion.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Mô tả</label>
              <p className="text-gray-700">{selectedRegion.description || 'Không có mô tả'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Loại thổ nhưỡng</label>
                <p className="text-gray-700">{selectedRegion.soilType}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Tổng diện tích</label>
                <p className="text-gray-700">{(selectedRegion.totalArea / 10000).toFixed(2)} ha</p>
              </div>
            </div>
            {(selectedRegion.zoneCode || selectedRegion.zoneType) && (
              <div>
                <label className="text-sm text-gray-500">Phân loại vùng</label>
                <div className="flex items-center gap-2 mt-1">
                  {selectedRegion.zoneCode && (
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{selectedRegion.zoneCode}</span>
                  )}
                  {selectedRegion.zoneType && (
                    <span className="text-sm text-gray-600">({selectedRegion.zoneType === 'VLT' ? 'Vùng cây lương thực' : selectedRegion.zoneType === 'VCN' ? 'Vùng cây công nghiệp' : 'Vùng cây ăn quả & rau màu'})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Farm Detail Modal (For Revocation) */}
      <Modal
        isOpen={!!selectedFarm}
        onClose={() => setSelectedFarm(null)}
        title="Chi tiết thửa đất"
        size="md"
      >
        {selectedFarm && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Tên thửa đất</label>
              <p className="font-semibold text-gray-900">{selectedFarm.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Diện tích</label>
                <p className="text-gray-900">{selectedFarm.area?.toLocaleString()} m²</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Trạng thái</label>
                <p className="text-gray-900 capitalize">{selectedFarm.status}</p>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Chủ sở hữu</label>
              {getOwnerName(selectedFarm) ? (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-1">
                  <p className="font-medium text-green-800">{getOwnerName(selectedFarm)}</p>
                  <p className="text-sm text-green-600">{selectedFarm.ownerPhone}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic mt-1">Chưa có người nhận (Đất trống)</p>
              )}
            </div>

            {getOwnerName(selectedFarm) && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="btn-danger flex items-center space-x-2"
                >
                  <FiTrash2 />
                  <span>{revoking ? 'Đang xử lý...' : 'Thu hồi đất'}</span>
                </button>
              </div>
            )}

            {/* Assign Button for Unassigned Plots in Assign Mode */}
            {!getOwnerName(selectedFarm) && assignMode && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => handleAssignExistingFarm(selectedFarm)}
                  disabled={assigning}
                  className="btn-primary flex items-center space-x-2"
                >
                  <FiPlus />
                  <span>Giao đất cho {assignRequest?.user?.fullName}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>



      {/* Create Region Modal */}
      <Modal
        isOpen={createRegionModal}
        onClose={() => setCreateRegionModal(false)}
        title="Tạo vùng quy hoạch mới"
        size="lg"
      >
        <form onSubmit={handleRegionSubmit}>
          <div className="space-y-4">
            {/* Hàng 1: Tên vùng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên vùng</label>
              <input
                type="text"
                className="input-field"
                value={pendingRegionForm.name}
                onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, name: e.target.value })}
                placeholder="VD: Vùng cây lương thực Kiến Xương"
                required
              />
            </div>

            {/* Hàng 2: Phân loại vùng (ngay dưới tên) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phân loại vùng quy hoạch</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Vùng cây lương thực', short: 'VLT' },
                  { label: 'Vùng cây công nghiệp', short: 'VCN' },
                  { label: 'Vùng cây ăn quả & rau màu', short: 'VAR' },
                ].map(({ label, short }) => (
                  <button
                    key={short}
                    type="button"
                    onClick={() => handleZoneTypeChange(short)}
                    className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-all ${pendingRegionForm.zoneType === short
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                  >
                    <span className="block font-bold text-xs mb-0.5">{short}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hàng 3: Xem trước mã vùng */}
            {pendingRegionForm.zoneType && (
              <div className="flex items-center space-x-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div>
                  <p className="text-xs text-blue-500 font-medium">Mã vùng (tự động)</p>
                  <p className="text-xl font-bold text-blue-700 font-mono">
                    {pendingRegionForm.zoneCode || '...'}
                  </p>
                </div>
                <p className="text-xs text-blue-600 flex-1">
                  Số thứ tự được tính riêng theo từng phân loại. Mã này sẽ được lưu vào hệ thống khi tạo mới.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                className="input-field"
                value={pendingRegionForm.description}
                onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại thổ nhưỡng</label>
                <input
                  type="text"
                  className="input-field"
                  value={pendingRegionForm.soilType}
                  onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, soilType: e.target.value })}
                  placeholder="VD: Đất phù sa"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tổng diện tích (m²)</label>
                <input
                  type="number"
                  className="input-field"
                  value={pendingRegionForm.totalArea}
                  onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, totalArea: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tọa độ (GeoJSON Polygon)</label>
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateRegionModal(false);
                    setDrawingMode('region');
                    toast.success('Hãy vẽ vùng quy hoạch trên bản đồ', { icon: '✏️' });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
                >
                  <FiMap className="mr-1" />
                  Vẽ trên bản đồ (Tự động điền)
                </button>
              </div>
              <textarea
                className="input-field font-mono text-xs"
                rows={3}
                value={pendingRegionForm.coordinates}
                onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, coordinates: e.target.value })}
                placeholder="[[lng, lat], [lng, lat], ...]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Copy chuỗi tọa độ Polygon vào đây hoặc dùng công cụ vẽ.</p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button type="button" onClick={() => setCreateRegionModal(false)} className="flex-1 btn-secondary">Hủy</button>
              <button type="submit" disabled={creatingRegion} className="flex-1 btn-primary">
                {creatingRegion ? 'Đang tạo...' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Rename Region Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Đổi tên vùng quy hoạch"
        size="sm"
      >
        <form onSubmit={handleRenameRegion} className="space-y-4">
          {renamingRegion?.zoneCode && (
            <p className="text-sm text-gray-500">
              Mã vùng: <span className="font-mono font-bold text-blue-700">{renamingRegion.zoneCode}</span>
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên mới</label>
            <input
              type="text"
              className="input-field"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Nhập tên vùng mới..."
              required
              autoFocus
            />
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={() => setShowRenameModal(false)} className="flex-1 btn-secondary">Hủy</button>
            <button type="submit" disabled={savingRename} className="flex-1 btn-primary">
              {savingRename ? 'Đang lưu...' : 'Lưu tên mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deleted Regions Modal */}
      <DeletedRegionsModal
        isOpen={showDeletedModal}
        onClose={() => setShowDeletedModal(false)}
        onRegionRestored={fetchData}
      />

      {/* Delete Region Confirm Modal */}
      <Modal isOpen={activeModal.type === 'deleteRegion'} onClose={() => setActiveModal({ type: null, data: null, extra: '' })} title="Xác nhận xóa" size="sm">
        <p className="text-gray-600 mb-6">Bạn có chắc muốn xóa vùng quy hoạch này không? Hành động này không thể hoàn tác.</p>
        <div className="flex space-x-3">
          <Button onClick={() => setActiveModal({ type: null, data: null, extra: '' })} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button onClick={confirmDeleteRegion} variant="danger" className="flex-1">
            Xóa
          </Button>
        </div>
      </Modal>

      {/* Revoke Farm Modal */}
      <Modal isOpen={activeModal.type === 'revokeFarm'} onClose={() => setActiveModal({ type: null, data: null, extra: '' })} title="Thu hồi đất" size="sm">
        <form onSubmit={confirmRevokeFarm} className="space-y-4">
          <p className="text-gray-600 text-sm">Vui lòng nhập lý do thu hồi đất:</p>
          <input
            type="text"
            className="input-field"
            value={activeModal.extra}
            onChange={(e) => setActiveModal(prev => ({ ...prev, extra: e.target.value }))}
            placeholder="Lý do thu hồi..."
            required
            autoFocus
          />
          <div className="flex space-x-3">
            <Button type="button" onClick={() => setActiveModal({ type: null, data: null, extra: '' })} variant="secondary" className="flex-1">
              Hủy
            </Button>
            <Button type="submit" loading={revoking} variant="danger" className="flex-1">
              Thu hồi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Existing Farm Modal */}
      <Modal isOpen={activeModal.type === 'assignFarm'} onClose={() => setActiveModal({ type: null, data: null, extra: '' })} title="Xác nhận giao đất" size="sm">
        <p className="text-gray-600 mb-6">
          Bạn có chắc muốn giao thửa đất "{activeModal.data?.name}" cho nông dân <strong>{assignRequest?.user?.fullName}</strong>?
        </p>
        <div className="flex space-x-3">
          <Button onClick={() => setActiveModal({ type: null, data: null, extra: '' })} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button onClick={confirmAssignFarm} loading={assigning} variant="primary" className="flex-1">
            Giao đất
          </Button>
        </div>
      </Modal>

      {/* Admin Delete Farm Confirm Modal */}
      <Modal isOpen={activeModal.type === 'deleteFarm'} onClose={() => setActiveModal({ type: null, data: null, extra: '' })} title="Xác nhận xóa thửa đất" size="sm">
        <p className="text-gray-600 mb-6">Xóa thửa đất "{activeModal.data?.name || 'Thửa đất'}" của {activeModal.data?.ownerId?.fullName || 'nông dân'}? Hành động này không thể hoàn tác.</p>
        <div className="flex space-x-3">
          <Button onClick={() => setActiveModal({ type: null, data: null, extra: '' })} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button onClick={confirmAdminDeleteFarm} variant="danger" className="flex-1">
            Xóa
          </Button>
        </div>
      </Modal>
    </div >
  );
};

export default RegionsManagePage;
