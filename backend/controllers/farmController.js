import Farm from '../models/Farm.js';
import Notification from '../models/Notification.js';

// @desc    Lấy tất cả thửa đất
// @route   GET /api/farms
// @access  Public
export const getFarms = async (req, res) => {
  try {
    const { status, ownerId } = req.query;
    let query = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (ownerId) {
      query.ownerId = ownerId;
    }

    const farms = await Farm.find(query)
      .populate('ownerId', 'fullName phone address')
      .populate('regionId', 'name')
      .sort({ createdAt: -1 });

    res.json(farms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thửa đất theo ID
// @route   GET /api/farms/:id
// @access  Public
export const getFarmById = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id)
      .populate('ownerId', 'fullName phone address')
      .populate('regionId', 'name description');

    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    res.json(farm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy GeoJSON của tất cả thửa đất
// @route   GET /api/farms/geojson
// @access  Public
export const getFarmsGeoJSON = async (req, res) => {
  try {
    const farms = await Farm.find({ isActive: true })
      .populate('ownerId', 'fullName phone');

    const geojson = {
      type: 'FeatureCollection',
      features: farms.map(farm => {
        // Check if ownerId exists but population failed (it would remain an ObjectId)
        const hasOwnerId = farm.ownerId && (farm.ownerId._id || farm.ownerId.toString().match(/^[0-9a-fA-F]{24}$/));
        const ownerName = farm.ownerId?.fullName || (hasOwnerId ? 'Đang cập nhật...' : null);

        // if (!ownerName && hasOwnerId) console.log('Farm has ownerId but no name:', farm.name, farm.ownerId);

        return {
          type: 'Feature',
          properties: {
            id: farm._id,
            name: farm.name,
            cropType: farm.cropType,
            area: farm.area,
            status: farm.status,
            ownerName: ownerName,
            ownerPhone: farm.ownerId?.phone,
            plantingDate: farm.plantingDate,
            expectedHarvestDate: farm.expectedHarvestDate
          },
          geometry: farm.geometry
        }
      })
    };

    res.json(geojson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thửa đất của farmer đang đăng nhập
// @route   GET /api/farms/my-farms
// @access  Private/Farmer
export const getMyFarms = async (req, res) => {
  try {
    const farms = await Farm.find({ ownerId: req.user._id, isActive: true })
      .populate('regionId', 'name')
      .populate('ownerId', 'fullName phone')
      .sort({ createdAt: -1 });

    res.json(farms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tạo thửa đất mới (Admin gán cho farmer)
// @route   POST /api/farms
// @access  Private/Admin
export const createFarm = async (req, res) => {
  try {
    const { ownerId, regionId, name, cropType, area, geometry, planningData, status } = req.body;

    const farm = await Farm.create({
      ownerId,
      regionId,
      name,
      cropType,
      area,
      geometry,
      planningData,
      status: status || 'planning'
    });

    const populatedFarm = await Farm.findById(farm._id)
      .populate('ownerId', 'fullName phone')
      .populate('regionId', 'name');

    res.status(201).json(populatedFarm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật thửa đất
// @route   PUT /api/farms/:id
// @access  Private (Owner hoặc Admin)
export const updateFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    // Check permission - Only Owner or Admin can update
    const isOwner = farm.ownerId && farm.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Không có quyền cập nhật thửa đất này' });
    }

    const updatedFarm = await Farm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('ownerId', 'fullName phone').populate('regionId', 'name');

    res.json(updatedFarm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật trạng thái mùa vụ
// @route   PUT /api/farms/:id/season
// @access  Private/Farmer
export const updateSeasonStatus = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền cập nhật thửa đất này' });
    }

    const { status, cropType, plantingDate, expectedHarvestDate, notes } = req.body;

    farm.status = status || farm.status;
    farm.cropType = cropType || farm.cropType;
    farm.plantingDate = plantingDate || farm.plantingDate;
    farm.expectedHarvestDate = expectedHarvestDate || farm.expectedHarvestDate;
    farm.notes = notes || farm.notes;

    if (status === 'harvested') {
      farm.actualHarvestDate = new Date();
    }

    await farm.save();

    res.json(farm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa thửa đất (soft delete)
// @route   DELETE /api/farms/:id
// @access  Private/Admin
export const deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    farm.isActive = false;
    await farm.save();

    res.json({ message: 'Đã xóa thửa đất' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Thống kê thửa đất
// @route   GET /api/farms/statistics
// @access  Private/Admin
export const getFarmStatistics = async (req, res) => {
  try {
    const totalFarms = await Farm.countDocuments({ isActive: true });

    const byStatus = await Farm.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalArea: { $sum: '$area' } } }
    ]);

    const byCropType = await Farm.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$cropType', count: { $sum: 1 }, totalArea: { $sum: '$area' } } }
    ]);

    const totalArea = await Farm.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$area' } } }
    ]);

    res.json({
      totalFarms,
      totalArea: totalArea[0]?.total || 0,
      byStatus,
      byCropType
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Thu hồi quyền canh tác
// @route   PUT /api/farms/:id/revoke
// @access  Private/Admin
export const revoke = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    const oldOwnerId = farm.ownerId;
    if (!oldOwnerId) {
      return res.status(400).json({ message: 'Thửa đất này chưa có chủ sở hữu' });
    }

    // Reset farm
    farm.ownerId = null;
    farm.status = 'planning';
    farm.notes = `Thu hồi từ nông dân ngày ${new Date().toLocaleDateString()}. Lý do: ${req.body.reason || 'Quyết định của HTX'}`;
    await farm.save();

    // Create Notification
    if (oldOwnerId) {
      await Notification.create({
        user: oldOwnerId,
        message: `Quyền canh tác tại thửa đất "${farm.name}" của bạn đã bị thu hồi bởi HTX. Lý do: ${req.body.reason || 'Quyết định của HTX'}. Bạn có thể gửi khiếu nại nếu không đồng ý.`,
        type: 'revocation',
        relatedId: farm._id
      });
    }

    res.json({ message: 'Đã thu hồi quyền canh tác thửa đất', farm });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

