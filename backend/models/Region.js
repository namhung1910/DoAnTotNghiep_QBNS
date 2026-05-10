import mongoose from 'mongoose';

// Các loại phân vùng chuẩn
export const ZONE_TYPES = [
  { label: 'Vùng cây lương thực', value: 'VLT' },
  { label: 'Vùng cây công nghiệp', value: 'VCN' },
  { label: 'Vùng cây ăn quả & rau màu', value: 'VAR' },
];

const regionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên vùng quy hoạch'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Phân loại vùng chuẩn (VLT / VCN / VAR)
  zoneType: {
    type: String,
    enum: ['VLT', 'VCN', 'VAR', ''],
    default: ''
  },
  // Mã vùng tự động (VD: VLT-01)
  zoneCode: {
    type: String,
    default: ''
  },
  soilType: {
    type: String,
    default: 'Phù sa'
  },
  totalArea: {
    type: Number,
    default: 0
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Tạo GeoSpatial Index
regionSchema.index({ geometry: '2dsphere' });

const Region = mongoose.model('Region', regionSchema);
export default Region;
