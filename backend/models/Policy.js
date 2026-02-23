import mongoose from 'mongoose';

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tiêu đề chính sách'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Hỗ trợ', 'Quy định', 'Khuyến nông', 'Bảo hiểm', 'Vay vốn', 'Khác'],
    default: 'Khác'
  },
  content: {
    type: String,
    required: [true, 'Vui lòng nhập nội dung chính sách']
  },
  effectiveDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  attachments: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Policy = mongoose.model('Policy', policySchema);
export default Policy;

