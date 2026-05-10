import Region from '../models/Region.js';
import fs from 'fs';

// Hàm helper: tính mã vùng tiếp theo cho một loại phân vùng
const getNextZoneCodeForType = async (zoneType) => {
  if (!zoneType) return '';
  
  // Tìm vùng có zoneCode lớn nhất (bao gồm cả vùng đã xóa) để lấy số thứ tự
  const lastRegion = await Region.findOne({ zoneType, zoneCode: { $ne: null } })
    .sort({ zoneCode: -1 })
    .exec();

  let nextSeq = 1;
  if (lastRegion && lastRegion.zoneCode) {
    const parts = lastRegion.zoneCode.split('-');
    if (parts.length === 2 && !isNaN(parts[1])) {
      nextSeq = parseInt(parts[1], 10) + 1;
    } else {
      // Fallback an toàn nếu format cũ không đúng chuẩn
      const count = await Region.countDocuments({ zoneType });
      nextSeq = count + 1;
    }
  }

  const seq = String(nextSeq).padStart(2, '0');
  return `${zoneType}-${seq}`;
};

// @desc    Lấy tất cả vùng quy hoạch
// @route   GET /api/regions
// @access  Public
export const getRegions = async (req, res) => {
  try {
    const regions = await Region.find({ isActive: true })
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });
    res.json(regions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy vùng quy hoạch theo ID
// @route   GET /api/regions/:id
// @access  Public
export const getRegionById = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id)
      .populate('createdBy', 'fullName');

    if (!region) {
      return res.status(404).json({ message: 'Không tìm thấy vùng quy hoạch' });
    }

    res.json(region);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy GeoJSON của tất cả vùng
// @route   GET /api/regions/geojson
// @access  Public
export const getRegionsGeoJSON = async (req, res) => {
  try {
    const regions = await Region.find({ isActive: true });

    const geojson = {
      type: 'FeatureCollection',
      features: regions.map(region => ({
        type: 'Feature',
        properties: {
          id: region._id,
          name: region.name,
          description: region.description,
          soilType: region.soilType,
          zoneType: region.zoneType,
          zoneCode: region.zoneCode,
          totalArea: region.totalArea,
          ...region.properties
        },
        geometry: region.geometry
      }))
    };

    res.json(geojson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy mã vùng tiếp theo (xem trước, chưa tạo)
// @route   GET /api/regions/next-zone-code/:zoneType
// @access  Private/Admin
export const getNextZoneCode = async (req, res) => {
  try {
    const { zoneType } = req.params;
    const code = await getNextZoneCodeForType(zoneType);
    res.json({ zoneCode: code });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tạo vùng quy hoạch mới
// @route   POST /api/regions
// @access  Private/Admin
export const createRegion = async (req, res) => {
  try {
    const { name, description, soilType, zoneType, plannedCrops, totalArea, geometry, properties } = req.body;

    // Tự động sinh mã vùng theo phân loại
    const zoneCode = await getNextZoneCodeForType(zoneType);

    const region = await Region.create({
      name,
      description,
      soilType,
      zoneType: zoneType || '',
      zoneCode,
      plannedCrops: plannedCrops || [],
      totalArea,
      geometry,
      properties,
      createdBy: req.user._id
    });

    res.status(201).json(region);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Đổi tên vùng quy hoạch
// @route   PATCH /api/regions/:id/rename
// @access  Private/Admin
export const renameRegion = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên mới' });
    }
    const region = await Region.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );
    if (!region) return res.status(404).json({ message: 'Không tìm thấy vùng quy hoạch' });
    res.json(region);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Upload GeoJSON file và tạo vùng quy hoạch
// @route   POST /api/regions/upload-geojson
// @access  Private/Admin
export const uploadGeoJSON = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng upload file GeoJSON' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const geojson = JSON.parse(fileContent);

    const regions = [];

    if (geojson.type === 'FeatureCollection') {
      for (const feature of geojson.features) {
        const region = await Region.create({
          name: feature.properties?.name || 'Vùng mới',
          description: feature.properties?.description || '',
          soilType: feature.properties?.soilType || 'Phù sa',
          plannedCrops: feature.properties?.plannedCrops || [],
          totalArea: feature.properties?.area || 0,
          geometry: feature.geometry,
          properties: feature.properties || {},
          createdBy: req.user._id
        });
        regions.push(region);
      }
    } else if (geojson.type === 'Feature') {
      const region = await Region.create({
        name: geojson.properties?.name || 'Vùng mới',
        description: geojson.properties?.description || '',
        soilType: geojson.properties?.soilType || 'Phù sa',
        plannedCrops: geojson.properties?.plannedCrops || [],
        totalArea: geojson.properties?.area || 0,
        geometry: geojson.geometry,
        properties: geojson.properties || {},
        createdBy: req.user._id
      });
      regions.push(region);
    }

    // Không cần xóa file vật lý vì dùng memoryStorage

    res.status(201).json({
      message: `Đã tạo ${regions.length} vùng quy hoạch`,
      regions
    });
  } catch (error) {
    console.error(error);
    // Không tồn tại file vật lý để xóa
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật vùng quy hoạch
// @route   PUT /api/regions/:id
// @access  Private/Admin
export const updateRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);

    if (!region) {
      return res.status(404).json({ message: 'Không tìm thấy vùng quy hoạch' });
    }

    const updatedRegion = await Region.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedRegion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa vùng quy hoạch (soft delete)
// @route   DELETE /api/regions/:id
// @access  Private/Admin
export const deleteRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);

    if (!region) {
      return res.status(404).json({ message: 'Không tìm thấy vùng quy hoạch' });
    }

    region.isActive = false;
    await region.save();

    res.json({ message: 'Đã xóa vùng quy hoạch' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tìm vùng quy hoạch theo điểm
// @route   POST /api/regions/find-by-point
// @access  Public
export const findRegionByPoint = async (req, res) => {
  try {
    const { lng, lat } = req.body;

    const region = await Region.findOne({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        }
      },
      isActive: true
    });

    res.json(region);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy danh sách vùng quy hoạch đã xóa (soft delete)
// @route   GET /api/regions/deleted
// @access  Private/Admin
export const getDeletedRegions = async (req, res) => {
  try {
    const regions = await Region.find({ isActive: false })
      .populate('createdBy', 'fullName')
      .sort({ updatedAt: -1 }); // Mới xóa hiện trước
    res.json(regions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa vĩnh viễn vùng quy hoạch (hard delete)
// @route   DELETE /api/regions/:id/hard
// @access  Private/Admin
export const hardDeleteRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);

    if (!region) {
      return res.status(404).json({ message: 'Không tìm thấy vùng quy hoạch' });
    }

    await Region.findByIdAndDelete(req.params.id);

    res.json({ message: 'Đã xóa vĩnh viễn vùng quy hoạch' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Khôi phục vùng quy hoạch đã xóa
// @route   PUT /api/regions/:id/restore
// @access  Private/Admin
export const restoreRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);

    if (!region) {
      return res.status(404).json({ message: 'Không tìm thấy vùng quy hoạch' });
    }

    if (region.isActive) {
      return res.status(400).json({ message: 'Vùng quy hoạch này vẫn đang hoạt động' });
    }

    // Kiểm tra chồng chéo với các vùng đang hoạt động
    const overlappingRegions = await Region.find({
      isActive: true,
      geometry: {
        $geoIntersects: {
          $geometry: region.geometry
        }
      }
    }).select('name zoneCode geometry properties'); // Chỉ lấy các trường cần thiết

    if (overlappingRegions.length > 0) {
      // Nếu có chồng chéo, trả về mã 400 kèm danh sách các vùng bị đè
      return res.status(400).json({ 
        message: 'Không thể khôi phục do vùng quy hoạch này chồng chéo với các vùng đang hiện hữu.',
        overlappingRegions 
      });
    }

    region.isActive = true;
    await region.save();

    res.json({ message: 'Khôi phục vùng quy hoạch thành công', region });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
