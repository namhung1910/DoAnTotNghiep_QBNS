import Region from '../models/Region.js';
import fs from 'fs';

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
          plannedCrops: region.plannedCrops,
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

// @desc    Tạo vùng quy hoạch mới
// @route   POST /api/regions
// @access  Private/Admin
export const createRegion = async (req, res) => {
  try {
    const { name, description, soilType, plannedCrops, totalArea, geometry, properties } = req.body;
    
    const region = await Region.create({
      name,
      description,
      soilType,
      plannedCrops,
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

// @desc    Upload GeoJSON file và tạo vùng quy hoạch
// @route   POST /api/regions/upload-geojson
// @access  Private/Admin
export const uploadGeoJSON = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng upload file GeoJSON' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
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
    
    // Xóa file sau khi xử lý
    fs.unlinkSync(req.file.path);
    
    res.status(201).json({
      message: `Đã tạo ${regions.length} vùng quy hoạch`,
      regions
    });
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

