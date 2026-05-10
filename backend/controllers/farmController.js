import Farm from '../models/Farm.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import HarvestRecord from '../models/HarvestRecord.js';
import Region from '../models/Region.js';
import Counter from '../models/Counter.js';
import StockHistory from '../models/StockHistory.js';
import Product from '../models/Product.js';

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

// @desc    Tạo thửa đất mới
// @route   POST /api/farms
// @access  Private/Farmer hoặc Admin
export const createFarm = async (req, res) => {
  try {
    const { regionId, name, cropType, area, geometry, planningData, status, ownerId, landRequestId } = req.body;
    // autoNameHint đã bỏ — backend tự tra mọi thứ từ DB

    const isAdmin = req.user.role === 'admin';
    const farmOwnerId = isAdmin ? (ownerId || req.user._id) : req.user._id;
    const approvalStatus = isAdmin ? 'approved' : 'pending';

    if (!geometry) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tọa độ thửa đất' });
    }

    // ── Sinh tên thửa đất tự động nếu không có name (Admin có thể gửi name tự do) ────────────
    let farmName      = name;   // Admin tự đặt tên: giữ nguyên
    let farmZoneCode;
    let farmFarmerCode;
    let farmSeq;

    if (!farmName) {
      // Bước 1: farmerCode — lấy từ DB, không tin frontend
      const ownerUser = await User.findById(farmOwnerId).select('farmerCode');
      if (!ownerUser?.farmerCode) {
        return res.status(400).json({
          message: 'Tài khoản nông dân chưa được cấp mã (farmerCode). Vui lòng liên hệ quản trị viên.'
          // Fail rõ ràng, không dùng fallback ẩn lỗi
        });
      }

      // Bước 2: zoneCode — tra từ DB qua regionId
      let zCode = 'KV-00'; // Fallback khi thửa đất nằm ngoài mọi vùng quy hoạch
      if (regionId) {
        const region = await Region.findById(regionId).select('zoneCode');
        if (region?.zoneCode) zCode = region.zoneCode;
      }

      // Bước 3: farmSeq — Counter riêng cho từng (owner, zone, farmer) — atomic, không race condition
      const counterKey = `farmSeq-${farmOwnerId}-${zCode}-${ownerUser.farmerCode}`;
      const seqCounter = await Counter.findByIdAndUpdate(
        counterKey,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      farmZoneCode   = zCode;
      farmFarmerCode = ownerUser.farmerCode;
      farmSeq        = seqCounter.seq;
      farmName       = `${zCode}-${ownerUser.farmerCode}-${String(farmSeq).padStart(2, '0')}`;
    }

    // Chỉ gửi 3 field mới khi có giá trị thực sự
    // → Farm Admin tạo thủ công không có 3 field này → partialFilterExpression không apply
    const farmPayload = {
      ownerId:      farmOwnerId,
      regionId,
      name:         farmName,
      cropType,
      area,
      geometry,
      planningData: planningData || '',
      status:       status || 'planning',
      approvalStatus,
      landRequestId: landRequestId || null,
    };
    if (farmZoneCode)   farmPayload.zoneCode   = farmZoneCode;
    if (farmFarmerCode) farmPayload.farmerCode = farmFarmerCode;
    if (farmSeq)        farmPayload.farmSeq    = farmSeq;

    const farm = await Farm.create(farmPayload);

    const populatedFarm = await Farm.findById(farm._id)
      .populate('ownerId', 'fullName phone')
      .populate('regionId', 'name');

    res.status(201).json(populatedFarm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};


// @desc    Admin duyệt thửa đất do farmer tạo
// @route   PUT /api/farms/:id/approve
// @access  Private/Admin
export const approveFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    farm.approvalStatus = 'approved';
    // Khi được duyệt, chuyển trạng thái canh tác từ 'planning' sang 'planting'
    if (farm.status === 'planning') {
      farm.status = 'planting';
    }
    await farm.save();

    // Cập nhật LandRequest liên kết — tìm theo landRequestId (cũ) hoặc assignedFarm (mới)
    const LandReq = (await import('../models/LandRequest.js')).default;
    let landRequestFilter = null;
    if (farm.landRequestId) {
      landRequestFilter = { _id: farm.landRequestId };
    } else {
      landRequestFilter = { assignedFarm: farm._id };
    }
    await LandReq.findOneAndUpdate(landRequestFilter, {
      status: 'approved',
      responseNote: req.body.note || 'Đã được HTX chấp nhận'
    });

    // Gửi thông báo cho nông dân
    if (farm.ownerId) {
      await Notification.create({
        user: farm.ownerId,
        message: `Thửa đất "${farm.name}" của bạn đã được HTX chấp nhận và chính thức ghi nhận.`,
        type: 'approval',
        relatedId: farm._id
      });
    }

    const populated = await Farm.findById(farm._id)
      .populate('ownerId', 'fullName phone')
      .populate('regionId', 'name');

    res.json({ message: 'Đã duyệt thửa đất', farm: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};


// @desc    Admin từ chối thửa đất do farmer tạo
// @route   PUT /api/farms/:id/reject
// @access  Private/Admin
export const rejectFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    const reason = req.body.reason || 'Không đáp ứng yêu cầu';
    farm.approvalStatus = 'rejected';
    farm.isActive = false; // Xóa mềm
    await farm.save();

    // Cập nhật LandRequest liên kết (tìm theo landRequestId cũ hoặc assignedFarm mới)
    const LandReq = (await import('../models/LandRequest.js')).default;
    const landRequestFilter = farm.landRequestId
      ? { _id: farm.landRequestId }
      : { assignedFarm: farm._id };
    await LandReq.findOneAndUpdate(landRequestFilter, {
      status: 'rejected',
      responseNote: reason
    });

    // Gửi thông báo cho nông dân
    if (farm.ownerId) {
      await Notification.create({
        user: farm.ownerId,
        message: `Yêu cầu thửa đất "${farm.name}" của bạn đã bị từ chối. Lý do: ${reason}. Bạn có thể đăng ký lại thửa đất khác.`,
        type: 'revocation',   // enum hợp lệ: system | revocation | approval | info
        relatedId: farm._id
      });
    }

    res.json({ message: 'Đã từ chối thửa đất', reason });
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

// @desc    Cập nhật trạng thái mùa vụ (luồng một chiều — chỉ tiến, không lùi)
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

    const {
      status,
      cropType,
      plantingDate,
      expectedHarvestDate,
      notes,
      actualYield,
      yieldUnit,
      expectedYield,
      actualHarvestDate,
      stockAdjustment,
    } = req.body;

    // ===== VALIDATION MỘT CHIỀU =====
    const STATUS_ORDER = ['planning', 'planting', 'growing', 'harvesting', 'harvested'];

    // Chặn hoàn toàn nếu vụ đã kết thúc
    if (['harvested', 'cancelled'].includes(farm.status)) {
      return res.status(400).json({
        message: 'Vụ mùa đã kết thúc. Vui lòng sử dụng chức năng "Bắt đầu vụ mới" để canh tác tiếp.'
      });
    }

    // Nếu không phải hủy vụ → chỉ được tiến sang bước kế tiếp
    if (status && status !== 'cancelled') {
      const currentIdx = STATUS_ORDER.indexOf(farm.status);
      const newIdx = STATUS_ORDER.indexOf(status);
      if (newIdx !== currentIdx + 1) {
        return res.status(400).json({
          message: `Không thể chuyển từ "${farm.status}" sang "${status}". Chỉ được tiến sang bước kế tiếp.`
        });
      }
    }

    // ===== XỬ LÝ HỦY VỤ =====
    if (status === 'cancelled') {
      farm.status = 'cancelled';
      if (notes !== undefined) farm.notes = notes;
      await farm.save();

      // Tạo HarvestRecord đặc biệt cho vụ bị hủy (ghi nhận vào lịch sử)
      try {
        await HarvestRecord.create({
          farmId: farm._id,
          ownerId: farm.ownerId,
          regionId: farm.regionId,
          cropType: farm.cropType,
          plantingDate: farm.plantingDate,
          harvestDate: new Date(), // Thời điểm hủy
          yieldInKg: 0,
          yieldUnit: 'kg',
          season: 'Vụ bị hủy',
          notes: `[HỦY VỤ] ${notes || 'Không rõ lý do'}`
        });
      } catch (err) {
        console.error("Lỗi khi tạo HarvestRecord cho vụ hủy:", err);
      }

      return res.json(farm);
    }

    // ===== CẬP NHẬT THÔNG TIN THEO BƯỚC =====
    if (status) farm.status = status;
    if (cropType) farm.cropType = cropType;
    if (plantingDate !== undefined) farm.plantingDate = plantingDate || null;
    if (expectedHarvestDate !== undefined) farm.expectedHarvestDate = expectedHarvestDate || null;
    if (notes !== undefined) farm.notes = notes;
    if (expectedYield !== undefined) farm.expectedYield = Number(expectedYield) || 0;
    if (stockAdjustment !== undefined) farm.stockAdjustment = Number(stockAdjustment) || 0;

    // ===== KHI CHUYỂN SANG HARVESTED =====
    if (status === 'harvested') {
      const yieldVal = Number(actualYield) || 0;
      const unit = yieldUnit || 'kg';
      farm.actualYield = yieldVal;
      farm.yieldUnit = unit;
      const newYieldInKg = unit === 'tấn' ? yieldVal * 1000 : yieldVal;
      farm.yieldInKg = newYieldInKg;
      farm.actualHarvestDate = actualHarvestDate ? new Date(actualHarvestDate) : new Date();

      await farm.save();

      // Tích lũy sản lượng atomically
      const updatedFarm = await Farm.findByIdAndUpdate(
        farm._id,
        { $inc: { cumulativeYieldKg: newYieldInKg } },
        { new: true }
      );

      // Tạo bản ghi lịch sử thu hoạch
      try {
        await HarvestRecord.create({
          farmId: farm._id,
          ownerId: farm.ownerId,
          regionId: farm.regionId,
          cropType: farm.cropType,
          plantingDate: farm.plantingDate,
          harvestDate: farm.actualHarvestDate,
          yieldInKg: newYieldInKg,
          yieldUnit: unit,
          notes: notes || farm.notes
        });
      } catch (err) {
        console.error("Lỗi khi tạo HarvestRecord:", err);
      }

      return res.json(updatedFarm);
    }

    await farm.save();
    res.json(farm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Bắt đầu vụ mới (chỉ khi vụ cũ đã harvested hoặc cancelled)
// @route   PUT /api/farms/:id/new-season
// @access  Private/Farmer
export const startNewSeason = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền thao tác thửa đất này' });
    }

    // Chỉ cho phép khi vụ cũ đã kết thúc
    if (!['harvested', 'cancelled'].includes(farm.status)) {
      return res.status(400).json({
        message: 'Chỉ có thể bắt đầu vụ mới khi vụ hiện tại đã kết thúc (đã thu hoạch hoặc đã hủy).'
      });
    }

    const { cropType, plantingDate, expectedHarvestDate, notes } = req.body;

    if (!cropType) {
      return res.status(400).json({ message: 'Vui lòng nhập loại cây trồng cho vụ mới.' });
    }

    // Reset các trường vụ cũ, giữ nguyên cumulativeYieldKg, area, regionId
    farm.status = 'planting';
    farm.cropType = cropType;
    farm.plantingDate = plantingDate ? new Date(plantingDate) : new Date();
    farm.expectedHarvestDate = expectedHarvestDate ? new Date(expectedHarvestDate) : null;
    farm.actualHarvestDate = null;
    farm.actualYield = 0;
    farm.yieldInKg = 0;
    farm.yieldUnit = 'kg';
    farm.expectedYield = 0;
    farm.notes = notes || '';
    // cumulativeYieldKg, stockAdjustment: giữ nguyên

    await farm.save();

    res.json({ message: 'Đã bắt đầu vụ mới thành công!', farm });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa thửa đất (soft delete)
// @route   DELETE /api/farms/:id
// @access  Private/Admin hoặc Owner
export const deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    // Nông dân chỉ được xóa thửa đất của chính mình
    const isAdmin = req.user.role === 'admin';
    const isOwner = farm.ownerId && farm.ownerId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Không có quyền xóa thửa đất này' });
    }

    farm.isActive = false;
    await farm.save();

    // Nếu Admin thực hiện xóa thửa đất của nông dân, gửi thông báo
    if (isAdmin && !isOwner && farm.ownerId) {
      await Notification.create({
        user: farm.ownerId,
        message: `Thửa đất "${farm.name}" của bạn đã bị HTX xóa khỏi hệ thống. Bạn có thể gửi khiếu nại nếu muốn làm rõ lý do.`,
        type: 'revocation',
        relatedId: farm._id
      });
    }

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

// @desc    Lấy lịch sử thu hoạch của chính nông dân
// @route   GET /api/farms/my-harvest-history
// @access  Private/Farmer
export const getMyHarvestHistory = async (req, res) => {
  try {
    const { farmId, year } = req.query;
    let query = { ownerId: req.user._id };

    if (farmId) {
      query.farmId = farmId;
    }

    if (year) {
      const yearStart = new Date(`${year}-01-01T00:00:00Z`);
      const yearEnd = new Date(`${year}-12-31T23:59:59Z`);
      query.harvestDate = { $gte: yearStart, $lte: yearEnd };
    }

    const history = await HarvestRecord.find(query)
      .populate('farmId', 'name')
      .populate('regionId', 'name')
      .sort({ harvestDate: -1 });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Điều chỉnh kho thủ công (cộng dồn và có validation)
// @route   POST /api/farms/:id/inventory-adjustment
// @access  Private/Farmer
export const adjustInventory = async (req, res) => {
  try {
    const { type, amount, note } = req.body;
    const farmId = req.params.id;

    if (!['loss', 'sale', 'correction'].includes(type)) {
      return res.status(400).json({ message: 'Loại điều chỉnh không hợp lệ' });
    }
    
    if (isNaN(amount) || amount === 0) {
      return res.status(400).json({ message: 'Số lượng không hợp lệ' });
    }

    const farm = await Farm.findById(farmId);
    if (!farm) return res.status(404).json({ message: 'Không tìm thấy thửa đất' });

    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền thao tác thửa đất này' });
    }

    // Tính toán số lượng cần cập nhật (số âm/dương tùy thuộc vào logic của từng loại)
    let stockAdjustmentInc = 0;
    let soldOutsideKgInc = 0;
    let effectOnStock = 0; // Thay đổi đến tồn kho hiện tại (âm là giảm, dương là tăng)

    if (type === 'loss') {
      // Hao hụt: giảm tồn kho. Đầu vào thường là dương (frontend gửi), ta trừ vào stockAdjustment
      const actualAmount = amount > 0 ? -amount : amount; 
      stockAdjustmentInc = actualAmount;
      effectOnStock = actualAmount;
    } else if (type === 'sale') {
      // Bán ngoài: giảm tồn kho, tăng soldOutside. Đầu vào gửi dương.
      const actualAmount = Math.abs(amount);
      soldOutsideKgInc = actualAmount;
      effectOnStock = -actualAmount; // giảm tồn kho
    } else if (type === 'correction') {
      // Sửa sai (nhập bù). Đầu vào gửi dương. Cộng vào stockAdjustment
      const actualAmount = Math.abs(amount);
      stockAdjustmentInc = actualAmount;
      effectOnStock = actualAmount;
    }

    // Lấy product (nếu có) để phục vụ validation
    const product = await Product.findOne({ farmId: farm._id, status: { $ne: 'rejected' } });

    if (type === 'sale' && !product) {
      return res.status(400).json({ message: 'Vui lòng đăng bán sản phẩm trước khi ghi nhận bán trực tiếp.' });
    }

    // Nếu là thao tác làm giảm tồn kho (effectOnStock < 0), cần validate không được vượt quá tồn kho hiện tại
    if (effectOnStock < 0) {
      const cumulative = farm.cumulativeYieldKg || 0;
      const adjustment = farm.stockAdjustment || 0;
      const soldOutside = farm.soldOutsideKg || 0;
      const soldProduct = product?.soldQuantity || 0;
      const currentStock = cumulative + adjustment - soldOutside - soldProduct;

      if (Math.abs(effectOnStock) > currentStock) {
        return res.status(400).json({ 
          message: `Số lượng giảm (${Math.abs(effectOnStock)} kg) vượt quá tồn kho khả dụng hiện tại (${currentStock} kg).` 
        });
      }
    }

    // Atomic Update bằng $inc
    const updatedFarm = await Farm.findByIdAndUpdate(
      farmId,
      {
        $inc: {
          stockAdjustment: stockAdjustmentInc,
          soldOutsideKg: soldOutsideKgInc
        }
      },
      { new: true }
    );

    // Lưu vào lịch sử
    await StockHistory.create({
      farmId,
      farmerId: req.user._id,
      type,
      amount: type === 'sale' ? soldOutsideKgInc : stockAdjustmentInc, // lưu giá trị thay đổi thực tế vào trường tương ứng
      note
    });

    res.json({ message: 'Cập nhật kho thành công', farm: updatedFarm });

  } catch (error) {
    console.error('adjustInventory Error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy lịch sử điều chỉnh kho của 1 thửa đất
// @route   GET /api/farms/:id/stock-history
// @access  Private/Farmer
export const getStockHistory = async (req, res) => {
  try {
    const farmId = req.params.id;
    const history = await StockHistory.find({ farmId, farmerId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(history);
  } catch (error) {
    console.error('getStockHistory Error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
