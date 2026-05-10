import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['loss', 'sale', 'correction'],
    required: true
    // loss: hao hụt (giảm stockAdjustment)
    // sale: bán ngoài (tăng soldOutsideKg)
    // correction: sửa sai (tăng stockAdjustment hoặc giảm soldOutsideKg)
  },
  amount: {
    type: Number,
    required: true
    // Lưu giá trị thực tế đã cộng/trừ (ví dụ -5, +10)
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
export default StockHistory;
