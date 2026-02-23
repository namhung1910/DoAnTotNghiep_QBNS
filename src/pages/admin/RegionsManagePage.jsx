import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FiUpload, FiPlus, FiEdit2, FiTrash2, FiMap, FiEye } from 'react-icons/fi';
import { regionAPI, farmAPI, landRequestAPI } from '../../services/api';
import area from '@turf/area'; // Import area calculation
import { booleanOverlap, booleanIntersects, booleanWithin } from '@turf/turf'; // Import validation functions
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
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

  // Assign Mode State
  const [assignMode, setAssignMode] = useState(false);
  const [assignRequest, setAssignRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [createRegionModal, setCreateRegionModal] = useState(false);
  const [drawingMode, setDrawingMode] = useState(null); // 'region' | 'farm' | null

  // Pending forms state (to save data when switching to draw mode)
  const [pendingRegionForm, setPendingRegionForm] = useState({
    name: '',
    description: '',
    soilType: '',
    totalArea: '',
    plannedCrops: '',
    coordinates: ''
  });

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
        soilType: '',
        totalArea: '',
        plannedCrops: '',
        coordinates: ''
      });
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
        soilType: pendingRegionForm.soilType,
        totalArea: parseFloat(pendingRegionForm.totalArea),
        plannedCrops: pendingRegionForm.plannedCrops.split(',').map(c => c.trim()),
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

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa vùng quy hoạch này?')) return;

    try {
      await regionAPI.delete(id);
      toast.success('Đã xóa vùng quy hoạch');
      fetchData();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Không thể xóa vùng quy hoạch');
    }
  };

  const handleRevoke = async () => {
    if (!selectedFarm || !selectedFarm.id) return;
    const reason = prompt('Nhập lý do thu hồi đất:');
    if (reason === null) return; // Cancelled

    try {
      setRevoking(true);
      await farmAPI.revoke(selectedFarm.id, { reason });
      toast.success('Đã thu hồi thửa đất');
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
      name: '',
      cropType: '',
      area: '',
      coordinates: '',
      regionId: ''
    });
  };

  const handleAssignExistingFarm = async (farm) => {
    const farmId = farm._id || farm.id;
    console.log('handleAssignExistingFarm called with:', farm);
    if (!confirm(`Bạn có chắc muốn giao thửa đất "${farm.name}" cho nông dân ${assignRequest.user.fullName}?`)) return;

    try {
      setAssigning(true);
      // Update Farm owner
      console.log('Assigning farm:', farmId, 'to user:', assignRequest.user._id);
      await farmAPI.update(farmId, {
        ownerId: assignRequest.user._id,
        status: 'planning', // Reset status for new owner
        notes: `Giao đất ngày ${new Date().toLocaleDateString()}`
      });

      // Update Request
      console.log('Updating request:', assignRequest.id);
      await landRequestAPI.updateStatus(assignRequest.id, {
        status: 'approved',
        assignedFarm: farmId
      });

      toast.success('Giao đất thành công!');
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

      // 1. Create Farm
      const farmRes = await farmAPI.create({
        name: assignForm.name,
        cropType: assignForm.cropType,
        area: parseFloat(assignForm.area),
        geometry: geometry,
        regionId: assignForm.regionId || undefined,
        ownerId: assignRequest?.user?._id || undefined, // undefined means unassigned
        status: 'planning'
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
        if (existingFarm.geometry) {
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
          <button
            onClick={handleOpenCreateRegion}
            className="btn-secondary flex items-center space-x-2"
          >
            <FiMap />
            <span>Tạo vùng quy hoạch</span>
          </button>
          <button
            onClick={handleCreatePlot}
            className="btn-primary flex items-center space-x-2 bg-green-600 hover:bg-green-700"
          >
            <FiPlus />
            <span>Tạo thửa đất</span>
          </button>
        </div>
      </div>

      {assignMode && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="font-bold text-blue-700">Đang thực hiện giao đất</p>
            <p className="text-sm text-blue-600">
              Người nhận: {assignRequest?.user?.fullName} ({assignRequest?.user?.username})
            </p>
            <p className="text-xs text-blue-500 mt-1 italic">
              * Vẽ một thửa đất mới trên bản đồ hoặc chọn thửa đất trống để giao.
            </p>
          </div>
          <button
            onClick={() => {
              setAssignMode(false);
              setAssignRequest(null);
              setShowAssignModal(false);
            }}
            className="text-sm text-blue-500 hover:text-blue-700 underline"
          >
            Hủy bỏ
          </button>
        </div>
      )}
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

      {/* Regions List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Danh sách vùng quy hoạch</h2>

        {regions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tên vùng</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Loại thổ nhưỡng</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Diện tích</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cây trồng</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr key={region._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{region.name}</p>
                        <p className="text-sm text-gray-500">{region.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{region.soilType}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {(region.totalArea / 10000).toFixed(2)} ha
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {region.plannedCrops?.slice(0, 3).map((crop, idx) => (
                          <span key={idx} className="badge-info text-xs">{crop}</span>
                        ))}
                        {region.plannedCoughs?.length > 3 && (
                          <span className="text-xs text-gray-400">+{region.plannedCrops.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedRegion(region)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Xem chi tiết"
                        >
                          <FiEye />
                        </button>
                        <button
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Sửa"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(region._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Xóa"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiMap className="mx-auto text-5xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có vùng quy hoạch</h3>
            <p className="text-gray-500 mb-6">Bắt đầu bằng cách upload file GeoJSON hoặc vẽ trực tiếp</p>
            <button onClick={() => setShowUploadModal(true)} className="btn-primary">
              <FiUpload className="mr-2" />
              Upload GeoJSON
            </button>
          </div>
        )}
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
            {selectedRegion.plannedCrops?.length > 0 && (
              <div>
                <label className="text-sm text-gray-500">Cây trồng được hoạch định</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRegion.plannedCrops.map((crop, idx) => (
                    <span key={idx} className="badge-success">{crop}</span>
                  ))}
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

      {/* Assign/Create Land Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={assignMode ? "Tạo thửa đất cho nông dân" : "Tạo thửa đất mới"}
        size="lg"
      >
        <div className="space-y-6">
          {assignMode && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900">Thông tin người nhận</h4>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-gray-500">Họ tên:</span>
                  <span className="ml-2 font-medium">{assignRequest?.user?.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tài khoản:</span>
                  <span className="ml-2 font-medium">{assignRequest?.user?.username}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAssignSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên thửa đất</label>
                <input
                  type="text"
                  className="input-field"
                  value={assignForm.name}
                  onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
                  placeholder="VD: Thửa đất số 1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại cây trồng (dự kiến)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={assignForm.cropType}
                    onChange={(e) => setAssignForm({ ...assignForm, cropType: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diện tích (m²)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={assignForm.area}
                    onChange={(e) => setAssignForm({ ...assignForm, area: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thuộc vùng quy hoạch</label>
                <select
                  className="input-field"
                  value={assignForm.regionId}
                  onChange={(e) => setAssignForm({ ...assignForm, regionId: e.target.value })}
                >
                  <option value="">-- Chọn vùng --</option>
                  {regions.map(r => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tọa độ (GeoJSON Polygon)</label>
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setDrawingMode('farm');
                      toast.success('Hãy vẽ thửa đất trên bản đồ', { icon: '✏️' });
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
                  value={assignForm.coordinates}
                  onChange={(e) => setAssignForm({ ...assignForm, coordinates: e.target.value })}
                  placeholder="[[lng, lat], [lng, lat], ...]"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Copy chuỗi tọa độ Polygon vào đây hoặc dùng công cụ vẽ.</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 btn-secondary">Hủy</button>
                <button type="submit" disabled={assigning} className="flex-1 btn-primary">
                  {assigning ? 'Đang xử lý...' : (assignMode ? 'Xác nhận & Giao đất' : 'Tạo mới')}
                </button>
              </div>
            </div>
          </form>
        </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên vùng</label>
              <input
                type="text"
                className="input-field"
                value={pendingRegionForm.name}
                onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, name: e.target.value })}
                placeholder="VD: Vùng trồng lúa A"
                required
              />
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Cây trồng được hoạch định (cách nhau bởi dấu phẩy)</label>
              <input
                type="text"
                className="input-field"
                value={pendingRegionForm.plannedCrops}
                onChange={(e) => setPendingRegionForm({ ...pendingRegionForm, plannedCrops: e.target.value })}
                placeholder="VD: Lúa, Ngô, Khoai"
                required
              />
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
    </div >
  );
};

export default RegionsManagePage;
