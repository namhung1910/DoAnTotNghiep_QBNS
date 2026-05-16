import mongoose from 'mongoose';

// Danh mục bài đăng — dùng cho filter Tab ở Bảng tin
export const POST_CATEGORIES = [
  { label: 'Tất cả', value: '' },
  { label: 'Hỗ trợ', value: 'Hỗ trợ' },
  { label: 'Quy định', value: 'Quy định' },
  { label: 'Khuyến nông', value: 'Khuyến nông' },
  { label: 'Bảo hiểm', value: 'Bảo hiểm' },
  { label: 'Vay vốn', value: 'Vay vốn' },
  { label: 'Khác', value: 'Khác' },
];

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tiêu đề bài đăng'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Hỗ trợ', 'Quy định', 'Khuyến nông', 'Bảo hiểm', 'Vay vốn', 'Khác'],
    default: 'Khác'
  },
  // Nội dung HTML từ TipTap rich text editor
  content: {
    type: String,
    required: [true, 'Vui lòng nhập nội dung bài đăng']
  },
  // Ảnh đính kèm (tối đa 5) — lưu cả url và public_id để xóa Cloudinary
  images: [{
    url:       { type: String, required: true },
    public_id: { type: String, required: true }
  }],
  // Lượt tim — mảng userId của những người đã like
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
