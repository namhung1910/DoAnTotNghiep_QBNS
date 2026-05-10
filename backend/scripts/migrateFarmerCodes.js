import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Counter from '../models/Counter.js';

dotenv.config();

/**
 * Migration: Cấp farmerCode cho tất cả nông dân hiện có.
 *
 * Đặc điểm:
 *   - Idempotent: chạy lại lần 2 sẽ thoát ngay (No migration needed)
 *   - Sort theo _id (ObjectId chứa timestamp) — ổn định hơn createdAt
 *   - Đẩy Counter lên mức cao nhất đã dùng để tránh trùng với user mới đăng ký sau
 *
 * Chạy: node backend/scripts/migrateFarmerCodes.js
 */
const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Idempotency guard: chỉ lấy những nông dân chưa có farmerCode
  const farmers = await User.find({ role: 'farmer', farmerCode: { $exists: false } })
    .sort({ _id: 1 }); // ObjectId có embedded timestamp → thứ tự tạo account ổn định

  if (!farmers.length) {
    console.log('✅ No migration needed — all farmers already have farmerCode');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋 Found ${farmers.length} farmer(s) needing farmerCode`);

  // Lấy seq hiện tại của counter để tránh trùng với user mới tạo sau deploy
  let startSeq = 1;
  const existing = await Counter.findById('farmerCode');
  if (existing) {
    startSeq = existing.seq + 1;
    console.log(`ℹ️  Counter hiện tại: ${existing.seq} → bắt đầu cấp từ ${startSeq}`);
  }

  for (let i = 0; i < farmers.length; i++) {
    const seq = startSeq + i;
    farmers[i].farmerCode = `ND${String(seq).padStart(3, '0')}`;
    await farmers[i].save();
    console.log(`  ✅ ${farmers[i].username} → ${farmers[i].farmerCode}`);
  }

  // Đẩy counter lên mức cao nhất đã cấp
  const finalSeq = startSeq + farmers.length - 1;
  await Counter.findByIdAndUpdate(
    'farmerCode',
    { seq: finalSeq },
    { upsert: true }
  );

  console.log(`\n✅ Migration complete! Counter đặt tại seq=${finalSeq}`);
  await mongoose.disconnect();
  process.exit(0);
};

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
