/**
 * Script migration: Chuyển đổi farmId (singular) → farmIds (array)
 * Chạy 1 lần duy nhất sau khi deploy code mới lên production
 *
 * Cách chạy:
 *   node backend/scripts/migrateProductFarmIds.js
 *
 * An toàn: KHÔNG xóa field farmId cũ — có thể rollback bất cứ lúc nào
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Đọc .env từ thư mục backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI chưa được cấu hình trong .env');
  process.exit(1);
}

async function runMigration() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    // Tìm tất cả sản phẩm có farmId nhưng farmIds rỗng hoặc chưa có
    const productsToMigrate = await collection.find({
      farmId: { $exists: true, $ne: null },
      $or: [
        { farmIds: { $exists: false } },
        { farmIds: { $size: 0 } }
      ]
    }).toArray();

    console.log(`📦 Tìm thấy ${productsToMigrate.length} sản phẩm cần migration`);

    if (productsToMigrate.length === 0) {
      console.log('🎉 Tất cả sản phẩm đã được migration trước đó. Không cần làm gì thêm.');
      return;
    }

    // Thực hiện migration theo batch
    let successCount = 0;
    let errorCount = 0;

    for (const product of productsToMigrate) {
      try {
        await collection.updateOne(
          { _id: product._id },
          {
            $set: {
              // Chuyển farmId đơn thành mảng farmIds
              farmIds: [product.farmId]
              // farmId vẫn GIỮ NGUYÊN để rollback an toàn
            }
          }
        );
        successCount++;
        console.log(`  ✓ Product ${product._id} (${product.productName}): farmId → farmIds`);
      } catch (err) {
        errorCount++;
        console.error(`  ✗ Product ${product._id}: ${err.message}`);
      }
    }

    console.log(`\n📊 Kết quả migration:`);
    console.log(`   ✅ Thành công: ${successCount} sản phẩm`);
    if (errorCount > 0) {
      console.log(`   ❌ Thất bại:  ${errorCount} sản phẩm`);
    }
    console.log('\n💡 Lưu ý: farmId cũ vẫn được giữ nguyên để rollback an toàn');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  }
}

runMigration();
