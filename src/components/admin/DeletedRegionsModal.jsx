import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { FiTrash2, FiRefreshCcw, FiAlertTriangle, FiArrowLeft, FiMap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { regionAPI } from '../../services/api';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';

const DeletedRegionsModal = ({ isOpen, onClose, onRegionRestored }) => {
  const [deletedRegions, setDeletedRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [overlapData, setOverlapData] = useState(null); // { targetRegion, overlappingRegions }
  const [hardDeleteRegion, setHardDeleteRegion] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDeletedRegions();
      setViewMode('list');
      setOverlapData(null);
      setHardDeleteRegion(null);
      setConfirmText('');
    }
  }, [isOpen]);

  const fetchDeletedRegions = async () => {
    try {
      setLoading(true);
      const res = await regionAPI.getDeleted();
      setDeletedRegions(res.data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đã xóa:', error);
      toast.error('Không thể lấy danh sách vùng quy hoạch đã xóa');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (region) => {
    try {
      setLoading(true);
      await regionAPI.restore(region._id);
      toast.success('Khôi phục thành công!');
      fetchDeletedRegions();
      if (onRegionRestored) onRegionRestored();
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.overlappingRegions) {
        toast.error(error.response.data.message);
        setOverlapData({
          targetRegion: region,
          overlappingRegions: error.response.data.overlappingRegions
        });
        setViewMode('map');
      } else {
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi khôi phục');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHardDelete = (region) => {
    setHardDeleteRegion(region);
    setConfirmText('');
  };

  const submitHardDelete = async (e) => {
    e.preventDefault();
    if (confirmText !== 'XOAVINHVIEN') {
      toast.error('Xác nhận không hợp lệ, vui lòng gõ đúng XOAVINHVIEN.');
      return;
    }
    try {
      setLoading(true);
      await regionAPI.hardDelete(hardDeleteRegion._id);
      toast.success('Đã xóa vĩnh viễn vùng quy hoạch');
      fetchDeletedRegions();
      setHardDeleteRegion(null);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa vĩnh viễn');
    } finally {
      setLoading(false);
    }
  };

  const getMapCenter = () => {
    if (overlapData?.targetRegion?.geometry?.coordinates?.[0]?.[0]) {
      const coord = overlapData.targetRegion.geometry.coordinates[0][0];
      return [coord[1], coord[0]]; // Leaflet uses [lat, lng]
    }
    return [10.762622, 106.660172];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (hardDeleteRegion) {
          setHardDeleteRegion(null);
        } else {
          onClose();
        }
      }}
      title={
        hardDeleteRegion ? "Xác nhận xóa vĩnh viễn" :
        viewMode === 'list' ? "Thùng rác - Vùng quy hoạch đã xóa" : "Cảnh báo chồng chéo không gian"
      }
      size={hardDeleteRegion ? "sm" : viewMode === 'list' ? "lg" : "xl"}
    >
      {hardDeleteRegion && (
        <form onSubmit={submitHardDelete} className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="font-bold text-red-800">CẢNH BÁO NGUY HIỂM</p>
            <p className="text-sm text-red-700 mt-1">Hành động này sẽ xóa vĩnh viễn vùng quy hoạch <strong>{hardDeleteRegion.name}</strong> và không thể khôi phục.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vui lòng gõ <strong>XOAVINHVIEN</strong> để xác nhận:
            </label>
            <input
              type="text"
              className="input-field border-red-300 focus:border-red-500 focus:ring-red-500/20"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="XOAVINHVIEN"
              required
              autoFocus
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={() => setHardDeleteRegion(null)} className="flex-1 btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50">
              {loading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </form>
      )}

      {!hardDeleteRegion && viewMode === 'list' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deletedRegions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiTrash2 className="mx-auto text-4xl mb-3 text-gray-300" />
              <p>Thùng rác trống</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Tên vùng</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Phân vùng</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deletedRegions.map(region => (
                    <tr key={region._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{region.name}</p>
                        <p className="text-xs text-gray-500">{region.zoneCode}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {region.zoneType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleRestore(region)}
                            className="flex items-center px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors"
                            title="Khôi phục"
                          >
                            <FiRefreshCcw className="mr-1" size={14} /> Khôi phục
                          </button>
                          <button
                            onClick={() => handleHardDelete(region)}
                            className="flex items-center px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md transition-colors"
                            title="Xóa vĩnh viễn"
                          >
                            <FiTrash2 className="mr-1" size={14} /> Xóa hẳn
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!hardDeleteRegion && viewMode === 'map' && overlapData && (
        <div className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex items-start">
              <FiAlertTriangle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-red-800">Không thể khôi phục</h4>
                <p className="text-sm text-red-700 mt-1">
                  Vùng quy hoạch <strong>{overlapData.targetRegion.name}</strong> không thể khôi phục vì giao cắt với <strong>{overlapData.overlappingRegions.length}</strong> vùng đang hiện hữu.
                </p>
              </div>
            </div>
          </div>

          <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
              center={getMapCenter()}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
              
              {/* Vẽ vùng mục tiêu (Màu đỏ nét đứt) */}
              <GeoJSON 
                key={`target-${overlapData.targetRegion._id}`}
                data={overlapData.targetRegion.geometry} 
                style={{
                  color: '#ef4444', // red-500
                  weight: 3,
                  dashArray: '5, 5',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2
                }}
              />

              {/* Vẽ các vùng bị đè (Màu cam) */}
              {overlapData.overlappingRegions.map(region => (
                <GeoJSON 
                  key={`overlap-${region._id}`}
                  data={region.geometry}
                  style={{
                    color: '#f97316', // orange-500
                    weight: 2,
                    fillColor: '#f97316',
                    fillOpacity: 0.4
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.bindTooltip(`Vùng hiện hữu: ${region.name}`, { permanent: true, direction: 'center', className: 'bg-white/80 text-xs font-bold p-1' });
                  }}
                />
              ))}
            </MapContainer>
          </div>

          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center"><span className="w-4 h-4 bg-red-500/20 border-2 border-red-500 border-dashed inline-block mr-2"></span> Vùng định khôi phục</div>
              <div className="flex items-center"><span className="w-4 h-4 bg-orange-500/40 border-2 border-orange-500 inline-block mr-2"></span> Vùng đang hoạt động</div>
            </div>
            <button 
              onClick={() => setViewMode('list')}
              className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
            >
              <FiArrowLeft className="mr-2" /> Quay lại danh sách
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DeletedRegionsModal;
