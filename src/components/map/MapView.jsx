import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap, FeatureGroup, Marker } from 'react-leaflet';
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

// Map center - xã Lê Lợi, Thái Bình cũ, Vietnam
const DEFAULT_CENTER = [20.430556, 106.455];
const DEFAULT_ZOOM = 14;

// Màu vùng quy hoạch theo loại zoneType — tông Pastel hài hòa
const ZONE_COLORS = {
  VLT: { fill: '#fef08a', border: '#ca8a04' },   // vàng lúa
  VCN: { fill: '#fed7aa', border: '#c2410c' },   // cam đất
  VAR: { fill: '#bbf7d0', border: '#16a34a' },   // xanh lá
  default: { fill: '#bbf7d0', border: '#16a34a' },
};

const getRegionStyle = (feature) => {
  const zoneType = feature?.properties?.zoneType || 'default';
  const colors = ZONE_COLORS[zoneType] || ZONE_COLORS.default;
  return {
    fillColor: colors.fill,
    fillOpacity: 0.4,
    color: colors.border,
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

// Màu trạng thái canh tác (dùng chung cho Polygon và CircleMarker Point)
const STATUS_COLORS = {
  planting: '#f59e0b',
  growing: '#22c55e',
  harvesting: '#ef4444',
  harvested: '#8b5cf6',
};

// Style cho các thửa đất theo trạng thái (Polygon only)
const getFarmStyle = (feature) => {
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

  const color = STATUS_COLORS[feature.properties?.status] || '#22c55e';

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

// ─── Legend Panel: thu gọn trên mobile, đầy đủ trên desktop ─────────────────
const LegendPanel = ({ showRegions, showFarms, showUnassigned }) => {
  const [expanded, setExpanded] = useState(false);

  const items = [];
  if (showRegions) {
    items.push(
      { color: '#fef08a', border: '#ca8a04', dashed: true, label: 'VLT — Cây lương thực' },
      { color: '#fed7aa', border: '#c2410c', dashed: true, label: 'VCN — Cây công nghiệp' },
      { color: '#bbf7d0', border: '#16a34a', dashed: true, label: 'VAR — Cây ăn quả & rau màu' },
    );
  }
  if (showFarms) {
    if (showUnassigned) items.push({ color: '#9ca3af', border: '#6b7280', dashed: true, label: 'Đất chưa có người nhận' });
    items.push(
      { color: '#f59e0b', label: 'Đang gieo trồng' },
      { color: '#22c55e', label: 'Đang phát triển' },
      { color: '#ef4444', label: 'Sắp thu hoạch' },
      { color: '#8b5cf6', label: 'Đã thu hoạch' },
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      {/* Nút toggle — chỉ hiện trên mobile (< sm) */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="sm:hidden flex items-center gap-1.5 bg-white rounded-lg shadow-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-100"
      >
        <span>🗺️</span>
        <span>Chú thích</span>
        <span className="text-gray-400">{expanded ? '▼' : '▲'}</span>
      </button>

      {/* Nội dung legend */}
      <div className={`
        bg-white rounded-xl shadow-lg border border-gray-100
        ${expanded ? 'block mt-1' : 'hidden'}
        sm:block sm:mt-0
        p-2 sm:p-4
      `}>
        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1.5 sm:mb-2">Chú thích</h4>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4 rounded"
                style={{
                  background: item.color,
                  border: item.border ? `2px ${item.dashed ? 'dashed' : 'solid'} ${item.border}` : undefined,
                }}
              />
              <span className="text-[10px] sm:text-xs text-gray-700 leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
      planting: 'Đang gieo trồng',
      growing: 'Đang phát triển',
      harvesting: 'Sắp thu hoạch',
      harvested: 'Đã thu hoạch',
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

        {/* Thửa đất — Polygon */}
        {showFarms && farmsGeoJSON && (() => {
          const polygonFeatures = (farmsGeoJSON.features || []).filter(
            f => f.geometry?.type !== 'Point'
          );
          const pointFeatures = (farmsGeoJSON.features || []).filter(
            f => f.geometry?.type === 'Point'
          );
          return (
            <>
              {polygonFeatures.length > 0 && (
                <GeoJSON
                  key="farms-polygon"
                  data={{ type: 'FeatureCollection', features: polygonFeatures }}
                  style={getFarmStyle}
                  onEachFeature={onEachFarm}
                />
              )}
              {pointFeatures.map((f, i) => {
                const ownerName = getOwnerName(f.properties);
                const color = ownerName
                  ? (STATUS_COLORS[f.properties?.status] || '#22c55e')
                  : '#9ca3af';
                const [lng, lat] = f.geometry.coordinates;
                const icon = new L.DivIcon({
                  html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
                    <svg width="28" height="36" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="16" cy="38" rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>
                      <path d="M16 2C9.373 2 4 7.373 4 14c0 9.333 12 24 12 24S28 23.333 28 14C28 7.373 22.627 2 16 2z"
                            fill="${color}" stroke="white" stroke-width="2"/>
                      <circle cx="16" cy="14" r="5" fill="white"/>
                    </svg>
                  </div>`,
                  iconSize: [28, 36],
                  iconAnchor: [0, 0],
                  className: ''
                });
                return (
                  <Marker
                    key={f.properties?._id || i}
                    position={[lat, lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => onFarmClick && onFarmClick(f),
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-gray-900">{f.properties?.name || 'Thửa đất'}</h3>
                        <p className="text-sm text-gray-600">Loại cây: {f.properties?.cropType || 'Chưa xác định'}</p>
                        <p className="text-sm text-gray-600">Diện tích: {f.properties?.area?.toLocaleString() || 0} m²</p>
                        <p className="text-sm text-gray-600">Chủ sở hữu: {ownerName || 'N/A'}</p>
                        <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getStatusLabel(f.properties?.status)}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          );
        })()}
      </MapContainer>

      {/* Legend — thu gọn trên mobile, đầy đủ trên desktop */}
      <LegendPanel showRegions={showRegions} showFarms={showFarms} showUnassigned={showUnassigned} />
    </div>
  );
};

export default MapView;

