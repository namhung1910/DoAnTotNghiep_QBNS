import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { regionAPI, farmAPI } from '../../services/api';
import Loading from '../common/Loading';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet default marker icon
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Map center - Thái Bình, Vietnam
const DEFAULT_CENTER = [20.45, 106.34];
const DEFAULT_ZOOM = 12;

// Style cho các vùng quy hoạch
const getRegionStyle = (feature) => {
  return {
    fillColor: '#22c55e',
    fillOpacity: 0.2,
    color: '#16a34a',
    weight: 2,
    dashArray: '5, 5'
  };
};

// Helper to get owner name safely from different data structures
const getOwnerName = (properties) => {
  if (properties?.ownerName) return properties.ownerName;
  if (properties?.ownerId?.fullName) return properties.ownerId.fullName;
  return null;
};

// Style cho các thửa đất theo trạng thái
const getFarmStyle = (feature) => {
  const statusColors = {
    planning: '#94a3b8',
    planting: '#f59e0b',
    growing: '#22c55e',
    harvesting: '#ef4444',
    harvested: '#8b5cf6',
    fallow: '#64748b'
  };

  const ownerName = getOwnerName(feature.properties);

  if (!ownerName) {
    return {
      fillColor: '#9ca3af', // Gray 400
      fillOpacity: 0.5,
      color: '#6b7280', // Gray 500
      weight: 2,
      dashArray: '4, 4'
    };
  }

  const color = statusColors[feature.properties?.status] || '#22c55e';

  return {
    fillColor: color,
    fillOpacity: 0.5,
    color: color,
    weight: 2
  };
};

// Component để điều khiển map
const MapController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
};

const MapView = ({
  onRegionClick,
  onFarmClick,
  showRegions = true,
  showFarms = true,
  regions = null, // Can be Array or GeoJSON
  farms = null,   // Can be Array or GeoJSON
  selectedRegion = null,
  selectedFarm = null,
  editable = false,
  onCreated = null,
  drawingMode = null, // 'region' | 'farm' | null
  showUnassigned = false, // Show unassigned farms legend (admin-only)
  className = ''
}) => {
  const [regionsGeoJSON, setRegionsGeoJSON] = useState(null);
  const [farmsGeoJSON, setFarmsGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  // Helper to convert Array to GeoJSON FeatureCollection
  const arrayToGeoJSON = (data) => {
    if (!Array.isArray(data)) return data; // Assume it's already GeoJSON or null
    return {
      type: 'FeatureCollection',
      features: data.filter(item => item.geometry).map(item => ({
        type: 'Feature',
        geometry: item.geometry,
        properties: item
      }))
    };
  };

  useEffect(() => {
    fetchData();
  }, [showRegions, showFarms, regions, farms]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Handle Regions
      if (showRegions) {
        if (regions) {
          setRegionsGeoJSON(arrayToGeoJSON(regions));
        } else {
          const res = await regionAPI.getGeoJSON();
          setRegionsGeoJSON(res.data);
        }
      }

      // Handle Farms
      if (showFarms) {
        if (farms) {
          setFarmsGeoJSON(arrayToGeoJSON(farms));
        } else {
          const res = await farmAPI.getGeoJSON();
          setFarmsGeoJSON(res.data);
        }
      }

    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onEachRegion = (feature, layer) => {
    layer.on({
      click: () => {
        if (onRegionClick) {
          onRegionClick(feature);
        }
      },
      mouseover: (e) => {
        e.target.setStyle({
          fillOpacity: 0.4,
          weight: 3
        });
      },
      mouseout: (e) => {
        e.target.setStyle(getRegionStyle(feature));
      }
    });
  };

  const onEachFarm = (feature, layer) => {
    const ownerName = getOwnerName(feature.properties);

    // Tạo popup content
    const popupContent = `
      <div class="p-2">
        <h3 class="font-bold text-gray-900">${feature.properties?.name || 'Thửa đất'}</h3>
        <p class="text-sm text-gray-600">Loại cây: ${feature.properties?.cropType || 'Chưa xác định'}</p>
        <p class="text-sm text-gray-600">Diện tích: ${feature.properties?.area?.toLocaleString() || 0} m²</p>
        <p class="text-sm text-gray-600">Chủ sở hữu: ${ownerName || 'N/A'}</p>
        <span class="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium
          ${feature.properties?.status === 'growing' ? 'bg-green-100 text-green-800' : ''}
          ${feature.properties?.status === 'harvesting' ? 'bg-red-100 text-red-800' : ''}
          ${feature.properties?.status === 'planting' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${feature.properties?.status === 'planning' ? 'bg-gray-100 text-gray-800' : ''}
        ">
          ${getStatusLabel(feature.properties?.status)}
        </span>
        ${!ownerName ? '<span class="inline-block mt-2 ml-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">Chưa giao</span>' : ''}
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      click: () => {
        if (onFarmClick) {
          onFarmClick(feature);
        }
      },
      mouseover: (e) => {
        e.target.setStyle({
          fillOpacity: 0.7,
          weight: 3
        });
      },
      mouseout: (e) => {
        e.target.setStyle(getFarmStyle(feature));
      }
    });
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

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải bản đồ..." />;
  }

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full min-h-[400px] rounded-2xl"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={mapCenter} zoom={DEFAULT_ZOOM} />

        {/* Drawing Controls */}
        {editable && (
          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={onCreated}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  drawError: {
                    color: '#e1e100',
                    message: '<strong>Lỗi:</strong> Các đường không được cắt nhau!'
                  },
                  shapeOptions: {
                    color: '#2563eb'
                  }
                }
              }}
            />
          </FeatureGroup>
        )}

        {/* Vùng quy hoạch */}
        {showRegions && regionsGeoJSON && (
          <GeoJSON
            key="regions"
            data={regionsGeoJSON}
            style={getRegionStyle}
            onEachFeature={onEachRegion}
          />
        )}

        {/* Drawing Mode Overlays - Visual Feedback for allowed/forbidden zones */}
        {editable && drawingMode && (
          <>
            {/* When drawing REGION: highlight existing regions as FORBIDDEN (red) */}
            {drawingMode === 'region' && regionsGeoJSON && (
              <GeoJSON
                key="forbidden-regions-overlay"
                data={regionsGeoJSON}
                style={() => ({
                  fillColor: '#ef4444',
                  fillOpacity: 0.3,
                  color: '#dc2626',
                  weight: 3,
                  dashArray: '10, 5'
                })}
                interactive={false}
              />
            )}

            {/* When drawing FARM: highlight regions as ALLOWED (green) */}
            {drawingMode === 'farm' && regionsGeoJSON && (
              <GeoJSON
                key="allowed-regions-overlay"
                data={regionsGeoJSON}
                style={() => ({
                  fillColor: '#22c55e',
                  fillOpacity: 0.2,
                  color: '#16a34a',
                  weight: 4,
                  dashArray: '10, 5'
                })}
                interactive={false}
              />
            )}

            {/* When drawing FARM: highlight existing farms as FORBIDDEN (red) */}
            {drawingMode === 'farm' && farmsGeoJSON && (
              <GeoJSON
                key="forbidden-farms-overlay"
                data={farmsGeoJSON}
                style={() => ({
                  fillColor: '#ef4444',
                  fillOpacity: 0.3,
                  color: '#dc2626',
                  weight: 2,
                  dashArray: '5, 5'
                })}
                interactive={false}
              />
            )}
          </>
        )}

        {/* Thửa đất */}
        {showFarms && farmsGeoJSON && (
          <GeoJSON
            key="farms"
            data={farmsGeoJSON}
            style={getFarmStyle}
            onEachFeature={onEachFarm}
          />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg p-4 z-[1000]">
        <h4 className="font-semibold text-sm text-gray-900 mb-2">Chú thích</h4>
        <div className="space-y-1 text-xs">
          {showRegions && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-dashed border-green-600 bg-green-500/20 rounded" />
              <span>Vùng quy hoạch</span>
            </div>
          )}
          {showFarms && (
            <>
              {showUnassigned && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded border-2 border-dashed border-gray-500" />
                  <span>Đất chưa có người nhận</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#94a3b8] rounded" />
                <span>Đang quy hoạch</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#f59e0b] rounded" />
                <span>Đang gieo trồng</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#22c55e] rounded" />
                <span>Đang phát triển</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#ef4444] rounded" />
                <span>Sắp thu hoạch</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#8b5cf6] rounded" />
                <span>Đã thu hoạch</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#64748b] rounded" />
                <span>Nghỉ canh tác</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;

