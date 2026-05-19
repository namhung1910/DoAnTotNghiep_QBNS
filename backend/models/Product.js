import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // ── Mảng thửa đất cung cấp hàng cho sản phẩm này (1 hoặc nhiều) ──────────
  // Nguồn dữ liệu DUY NHẤT liên kết Product với Farm — hỗ trợ đa thửa đất
  farmIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm'
  }],
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productName: {
    type: String,
    required: [true, 'Vui lòng nhập tên sản phẩm'],
    trim: true
  },
  category: {
    type: String,
    default: 'Nông sản'
  },
  images: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true }
  }],
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá sản phẩm']
  },
  unit: {
    type: String,
    default: 'kg'
  },
  description: {
    type: String,
    default: ''
  },
  certification: {
    type: String,
    enum: ['Không có', 'VietGAP', 'GlobalGAP', 'Organic', 'HACCP'],
    default: 'Không có'
  },
  productionProcess: {
    type: String,
    default: ''
  },
  harvestDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold_out'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  viewCount: {
    type: Number,
    default: 0
  },
  contactCount: {
    type: Number,
    default: 0
  },
  // Số lượng đã bán thật (field chuẩn bị cho hệ thống đơn hàng tương lai)
  soldQuantity: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});


const Product = mongoose.model('Product', productSchema);
export default Product;

