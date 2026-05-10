import mongoose from 'mongoose';

const farmSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Region'
  },
  name: {
    type: String,
    default: 'Thửa đất'
  },
  cropType: {
    type: String,
    required: [true, 'Vui lòng nhập loại cây trồng']
  },
  area: {
    type: Number,
    required: [true, 'Vui lòng nhập diện tích (m²)']
  },
  status: {
    type: String,
    enum: ['planning', 'planting', 'growing', 'harvesting', 'harvested', 'cancelled'],
    default: 'planning'
  },
  // Trạng thái phê duyệt (cho luồng farmer tự tạo)
  approvalStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved' // Farm do admin tạo trực tiếp → approved luôn
  },
  // Liên kết với yêu cầu cấp đất (nếu tạo qua luồng farmer)
  landRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LandRequest',
    default: null
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon', 'Point'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },

  plantingDate: {
    type: Date
  },
  expectedHarvestDate: {
    type: Date
  },
  actualHarvestDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  // Sản lượng — nông dân nhập khi thu hoạch
  actualYield: {
    type: Number,
    default: 0
  },
  yieldUnit: {
    type: String,
    enum: ['kg', 'tấn'],
    default: 'kg'
  },
  // Field chuẩn hóa về kg dùng cho mọi phép thống kê
  yieldInKg: {
    type: Number,
    default: 0
  },
  // Tích lũy sản lượng qua tất cả các vụ (không bao giờ reset — chỉ tăng khi harvested)
  cumulativeYieldKg: {
    type: Number,
    default: 0
  },
  stockAdjustment: {
    type: Number,
    default: 0
  },
  // Nông dân tự bán ngoài hệ thống
  soldOutsideKg: {
    type: Number,
    default: 0
  },
  // Dự kiến năng suất (kg) — nhập lúc đang phase 'harvesting'
  expectedYield: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // ─── Thành phần tên thửa đất (chỉ có với thửa do nông dân tự đăng ký) ───────────────
  // KHÔNG đặt default — để partialFilterExpression chỉ apply khi cả 3 field tồn tại
  // Farm Admin tạo thủ công sẽ không có 3 field này → không bị kiểm tra unique
  zoneCode: {
    type: String     // Mã vùng quy hoạch, VD: VLT-01
  },
  farmerCode: {
    type: String     // Mã nông dân, VD: ND003
  },
  farmSeq: {
    type: Number     // Số thứ tự thửa đất của nông dân trong vùng, VD: 1, 2, 3
  }

}, {
  timestamps: true
});

// Compound unique index — chỉ áp dụng khi cả 3 field tồn tại trong document
// partialFilterExpression chính xác hơn sparse với compound index:
//   sparse chỉ bỏ qua doc thiếu TẤT CẢ field; pFE kiểm soát rõ ràng điều kiện
farmSchema.index(
  { ownerId: 1, zoneCode: 1, farmerCode: 1, farmSeq: 1 },
  {
    unique: true,
    partialFilterExpression: {
      zoneCode:   { $exists: true },
      farmerCode: { $exists: true },
      farmSeq:    { $exists: true }
    }
  }
);

// Tạo GeoSpatial Index
farmSchema.index({ geometry: '2dsphere' });

const Farm = mongoose.model('Farm', farmSchema);
export default Farm;
