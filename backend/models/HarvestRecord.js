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
  // Quý thu hoạch — tự động tính từ harvestDate, format: Q1/YYYY ... Q4/YYYY
  // Trung tính với mọi loại cây trồng, không gắn với khái niệm vụ lúa
  quarter: {
    type: String,
    default: 'Khác'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Tự động tính quý (Q1~Q4) trước khi lưu — trung tính với mọi loại cây trồng
harvestRecordSchema.pre('save', function (next) {
  if (this.isModified('harvestDate') || !this.quarter || this.quarter === 'Khác') {
    const month = this.harvestDate.getMonth() + 1; // 1–12
    const year  = this.harvestDate.getFullYear();
    const q     = Math.ceil(month / 3); // 1-3→1, 4-6→2, 7-9→3, 10-12→4
    this.quarter = `Q${q}/${year}`;
  }
  next();
});

const HarvestRecord = mongoose.model('HarvestRecord', harvestRecordSchema);
export default HarvestRecord;
