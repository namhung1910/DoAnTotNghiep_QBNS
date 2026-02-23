import mongoose from 'mongoose';

const contactRequestSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: [true, 'Vui lòng nhập họ tên'],
    trim: true
  },
  customerPhone: {
    type: String,
    required: [true, 'Vui lòng nhập số điện thoại'],
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'completed', 'cancelled'],
    default: 'new'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const ContactRequest = mongoose.model('ContactRequest', contactRequestSchema);
export default ContactRequest;

