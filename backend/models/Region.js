import mongoose from 'mongoose';

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
  soilType: {
    type: String,
    default: 'Phù sa'
  },
  plannedCrops: [{
    type: String
  }],
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

