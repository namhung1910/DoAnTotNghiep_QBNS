import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
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
    type: String
  }],
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá sản phẩm']
  },
  unit: {
    type: String,
    default: 'kg'
  },
  quantity: {
    type: Number,
    default: 0
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
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;

