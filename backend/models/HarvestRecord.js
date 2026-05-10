import mongoose from 'mongoose';

const harvestRecordSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Region',
    default: null
  },
  cropType: {
    type: String,
    required: [true, 'Vui lòng nhập loại cây trồng']
  },
  plantingDate: {
    type: Date
  },
  harvestDate: {
    type: Date,
    required: true
  },
  yieldInKg: {
    type: Number,
    required: true
  },
  yieldUnit: {
    type: String,
    enum: ['kg', 'tấn'],
    default: 'kg'
  },
  season: {
    type: String,
    default: 'Khác' // Có thể gán tự động dựa trên tháng
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Helper auto-calculate season before save
harvestRecordSchema.pre('save', function (next) {
  if (this.isModified('harvestDate') || !this.season || this.season === 'Khác') {
    const month = this.harvestDate.getMonth() + 1; // 1-12
    const year = this.harvestDate.getFullYear();
    let seasonName = 'Khác';
    
    // Gợi ý mùa vụ Việt Nam cơ bản:
    // Xuân (Tháng 1-3), Hè Thu (Tháng 4-8), Thu Đông (Tháng 9-12)
    if (month >= 1 && month <= 3) seasonName = 'Vụ Xuân';
    else if (month >= 4 && month <= 8) seasonName = 'Vụ Hè Thu';
    else if (month >= 9 && month <= 12) seasonName = 'Vụ Thu Đông';
    
    this.season = `${seasonName} ${year}`;
  }
  next();
});

const HarvestRecord = mongoose.model('HarvestRecord', harvestRecordSchema);
export default HarvestRecord;
