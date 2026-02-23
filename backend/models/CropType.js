import mongoose from 'mongoose';

const cropTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên loại cây trồng'],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Lương thực', 'Rau củ', 'Trái cây', 'Cây công nghiệp', 'Hoa màu', 'Khác'],
    default: 'Khác'
  },
  description: {
    type: String,
    default: ''
  },
  growthDuration: {
    type: Number, // Số ngày từ trồng đến thu hoạch
    default: 90
  },
  suitableSoil: [{
    type: String
  }],
  suitableSeason: [{
    type: String
  }],
  averageYield: {
    type: Number, // kg/hecta
    default: 0
  },
  icon: {
    type: String,
    default: '🌱'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const CropType = mongoose.model('CropType', cropTypeSchema);
export default CropType;

