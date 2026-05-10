import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Farm from '../models/Farm.js';
import User from '../models/User.js';
import Region from '../models/Region.js';
import Counter from '../models/Counter.js';

dotenv.config();

/**
 * Migration: Đổi tên toàn bộ thửa đất cũ sang định dạng mới.
 * Định dạng mới: {zoneCode}-{farmerCode}-{seq:02}
 * Ví dụ: VLT-01-ND001-01, VLT-01-ND001-02, VAR-01-ND001-01
 *
 * Idempotent: Farm đã có farmerCode field sẽ bị bỏ qua.
 * Sau khi chạy, Counter cho từng (owner, zone) sẽ được khởi tạo đúng.
 *
 * Chạy: node backend/scripts/migrateFarmNames.js
 */

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Chỉ lấy farm chưa có farmerCode (farm cũ chưa migrate)
  const oldFarms = await Farm.find({ farmerCode: { $exists: false } })
    .populate('ownerId', 'farmerCode fullName')
    .populate('regionId', 'zoneCode name')
    .sort({ ownerId: 1, createdAt: 1 }); // Sort để seq tăng dần theo thứ tự tạo

  if (!oldFarms.length) {
    console.log('✅ No migration needed — all farms already have farmerCode');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋 Found ${oldFarms.length} farm(s) to migrate\n`);

  // Nhóm theo (ownerId, zoneCode) để gán seq tuần tự
  // Key: "ownerId::zoneCode"
  const groupSeqMap = {};
  const counterUpdates = {}; // key → max seq đã dùng

  let successCount = 0;
  let skipCount = 0;

  for (const farm of oldFarms) {
    // Kiểm tra owner có farmerCode chưa
    const farmerCode = farm.ownerId?.farmerCode;
    if (!farmerCode) {
      console.warn(`  ⚠️  Farm "${farm.name}" — chủ sở hữu chưa có farmerCode, bỏ qua`);
      skipCount++;
      continue;
    }

    // Lấy zoneCode từ region (nếu farm không có region → KV-00)
    const zCode = farm.regionId?.zoneCode || 'KV-00';

    // Tính seq cho nhóm (owner, zone) này
    const groupKey = `${farm.ownerId._id}::${zCode}`;
    if (!groupSeqMap[groupKey]) groupSeqMap[groupKey] = 0;
    groupSeqMap[groupKey]++;
    const seq = groupSeqMap[groupKey];

    const newName = `${zCode}-${farmerCode}-${String(seq).padStart(2, '0')}`;
    const oldName = farm.name;

    // Cập nhật farm
    await Farm.findByIdAndUpdate(farm._id, {
      name:       newName,
      zoneCode:   zCode,
      farmerCode: farmerCode,
      farmSeq:    seq,
    });

    // Ghi nhớ max seq cho Counter
    const counterKey = `farmSeq-${farm.ownerId._id}-${zCode}-${farmerCode}`;
    counterUpdates[counterKey] = Math.max(counterUpdates[counterKey] || 0, seq);

    console.log(`  ✅ "${oldName}" → "${newName}"`);
    successCount++;
  }

  // Khởi tạo / cập nhật Counter cho từng nhóm
  console.log('\n🔢 Updating Counters...');
  for (const [key, maxSeq] of Object.entries(counterUpdates)) {
    await Counter.findByIdAndUpdate(
      key,
      { seq: maxSeq },
      { upsert: true }
    );
    console.log(`  ✅ Counter "${key}" → seq=${maxSeq}`);
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Renamed : ${successCount} farm(s)`);
  console.log(`   Skipped : ${skipCount} farm(s)`);
  await mongoose.disconnect();
  process.exit(0);
};

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
