import mongoose from 'mongoose';

/**
 * Counter collection — dùng để sinh sequence atomic, không race condition.
 *
 * Các key đang dùng trong hệ thống:
 *   - 'farmerCode'                              → đếm tổng số nông dân (ND001, ND002, ...)
 *   - 'farmSeq-{ownerId}-{zoneCode}-{farmerCode}' → đếm thửa đất của từng nông dân trong từng vùng
 *
 * Cách dùng:
 *   const counter = await Counter.findByIdAndUpdate(
 *     KEY,
 *     { $inc: { seq: 1 } },
 *     { new: true, upsert: true }
 *   );
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
