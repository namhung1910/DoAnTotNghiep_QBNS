import { useState } from 'react';
import { FiInfo, FiLayers, FiMapPin } from 'react-icons/fi';
import MapView from '../../components/map/MapView';

import Modal from '../../components/common/Modal';

const MapPage = () => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRegions, setShowRegions] = useState(true);
  const [showFarms, setShowFarms] = useState(true);

  const handleRegionClick = (feature) => {
    setSelectedFeature({
      type: 'region',
      data: feature.properties
    });
    setShowModal(true);
  };

  const handleFarmClick = (feature) => {
    setSelectedFeature({
      type: 'farm',
      data: feature.properties
    });
    setShowModal(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FiMapPin className="mr-2 text-primary-600" />
                Bản đồ Quy hoạch Nông nghiệp
              </h1>
              <p className="text-gray-600 mt-1">
                Xem trực quan các vùng quy hoạch và thửa đất canh tác
              </p>
            </div>
            
            {/* Layer toggles */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRegions(!showRegions)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showRegions 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <FiLayers />
                <span>Vùng quy hoạch</span>
              </button>
              <button
                onClick={() => setShowFarms(!showFarms)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showFarms 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <FiLayers />
                <span>Thửa đất</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <MapView
            showRegions={showRegions}
            showFarms={showFarms}
            onRegionClick={handleRegionClick}
            onFarmClick={handleFarmClick}
            className="w-full h-full"
          />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="card">
            <div className="flex items-center space-x-3 text-primary-600 mb-3">
              <FiInfo className="text-xl" />
              <h3 className="font-semibold">Hướng dẫn sử dụng</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Click vào vùng để xem thông tin chi tiết</li>
              <li>• Sử dụng nút +/- để phóng to/thu nhỏ</li>
              <li>• Kéo thả để di chuyển bản đồ</li>
            </ul>
          </div>
          
          <div className="card">
            <div className="flex items-center space-x-3 text-harvest-600 mb-3">
              <FiLayers className="text-xl" />
              <h3 className="font-semibold">Chú thích màu sắc</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Đang phát triển tốt</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span>Đang gieo trồng</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>Sắp thu hoạch</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center space-x-3 text-earth-600 mb-3">
              <FiMapPin className="text-xl" />
              <h3 className="font-semibold">Khu vực hiển thị</h3>
            </div>
            <p className="text-sm text-gray-600">
              Bản đồ đang hiển thị vùng quy hoạch nông nghiệp tại Kiến Xương, Thái Bình.
              Click vào từng thửa đất để xem thông tin chi tiết.
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedFeature?.type === 'region' ? 'Chi tiết vùng quy hoạch' : 'Thông tin thửa đất'}
        size="md"
      >
        {selectedFeature && (
          <div className="space-y-4">
            {selectedFeature.type === 'region' ? (
              <>
                <div>
                  <label className="text-sm text-gray-500">Tên vùng</label>
                  <p className="font-semibold text-gray-900">{selectedFeature.data.name || 'Chưa đặt tên'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Mô tả</label>
                  <p className="text-gray-700">{selectedFeature.data.description || 'Không có mô tả'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Loại thổ nhưỡng</label>
                    <p className="text-gray-700">{selectedFeature.data.soilType || 'Đất phù sa'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Tổng diện tích</label>
                    <p className="text-gray-700">
                      {selectedFeature.data.totalArea
                        ? selectedFeature.data.totalArea >= 10000
                          ? `${(selectedFeature.data.totalArea / 10000).toFixed(2)} ha`
                          : `${selectedFeature.data.totalArea.toLocaleString()} m²`
                        : 'Chưa xác định'}
                    </p>
                  </div>
                </div>
                {selectedFeature.data.zoneCode && (
                  <div>
                    <label className="text-sm text-gray-500">Phân loại vùng</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {selectedFeature.data.zoneCode}
                      </span>
                      <span className="text-sm text-gray-600">
                        {selectedFeature.data.zoneType === 'VLT' && '(Vùng cây lương thực)'}
                        {selectedFeature.data.zoneType === 'VCN' && '(Vùng cây công nghiệp)'}
                        {selectedFeature.data.zoneType === 'VAR' && '(Vùng cây ăn quả & rau màu)'}
                      </span>
                    </div>
                  </div>
                )}
                {selectedFeature.data.plannedCrops?.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Cây trồng được hoạch định</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedFeature.data.plannedCrops.map((crop, idx) => (
                        <span key={idx} className="badge-success">{crop}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm text-gray-500">Tên thửa đất</label>
                  <p className="font-semibold text-gray-900">{selectedFeature.data.name || 'Thửa đất'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Loại cây trồng</label>
                    <p className="text-gray-700">{selectedFeature.data.cropType || 'Chưa xác định'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Diện tích</label>
                    <p className="text-gray-700">{selectedFeature.data.area?.toLocaleString() || 0} m²</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Trạng thái</label>
                  <div className="mt-1">
                    <span className={`badge ${getStatusColor(selectedFeature.data.status)}`}>
                      {getStatusLabel(selectedFeature.data.status)}
                    </span>
                  </div>
                </div>
                {selectedFeature.data.ownerName && (
                  <div>
                    <label className="text-sm text-gray-500">Chủ sở hữu</label>
                    <p className="text-gray-700">{selectedFeature.data.ownerName}</p>
                    {selectedFeature.data.ownerPhone && (
                      <p className="text-sm text-primary-600">{selectedFeature.data.ownerPhone}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Chatbot */}
      
    </div>
  );
};

export default MapPage;

