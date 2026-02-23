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
    enum: ['planning', 'planting', 'growing', 'harvesting', 'harvested', 'fallow'],
    default: 'planning'
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
  planningData: {
    type: String,
    default: ''
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Tạo GeoSpatial Index
farmSchema.index({ geometry: '2dsphere' });

const Farm = mongoose.model('Farm', farmSchema);
export default Farm;

