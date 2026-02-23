import CropType from '../models/CropType.js';

// @desc    Lấy tất cả loại cây trồng
// @route   GET /api/crop-types
// @access  Public
export const getCropTypes = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const cropTypes = await CropType.find(query).sort({ name: 1 });
    res.json(cropTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy loại cây trồng theo ID
// @route   GET /api/crop-types/:id
// @access  Public
export const getCropTypeById = async (req, res) => {
  try {
    const cropType = await CropType.findById(req.params.id);
    
    if (!cropType) {
      return res.status(404).json({ message: 'Không tìm thấy loại cây trồng' });
    }
    
    res.json(cropType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tạo loại cây trồng mới
// @route   POST /api/crop-types
// @access  Private/Admin
export const createCropType = async (req, res) => {
  try {
    const { name, category, description, growthDuration, suitableSoil, suitableSeason, averageYield, icon } = req.body;
    
    const existingCrop = await CropType.findOne({ name });
    if (existingCrop) {
      return res.status(400).json({ message: 'Loại cây trồng đã tồn tại' });
    }
    
    const cropType = await CropType.create({
      name,
      category,
      description,
      growthDuration,
      suitableSoil,
      suitableSeason,
      averageYield,
      icon
    });
    
    res.status(201).json(cropType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật loại cây trồng
// @route   PUT /api/crop-types/:id
// @access  Private/Admin
export const updateCropType = async (req, res) => {
  try {
    const cropType = await CropType.findById(req.params.id);
    
    if (!cropType) {
      return res.status(404).json({ message: 'Không tìm thấy loại cây trồng' });
    }
    
    const updatedCropType = await CropType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedCropType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa loại cây trồng (soft delete)
// @route   DELETE /api/crop-types/:id
// @access  Private/Admin
export const deleteCropType = async (req, res) => {
  try {
    const cropType = await CropType.findById(req.params.id);
    
    if (!cropType) {
      return res.status(404).json({ message: 'Không tìm thấy loại cây trồng' });
    }
    
    cropType.isActive = false;
    await cropType.save();
    
    res.json({ message: 'Đã xóa loại cây trồng' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

