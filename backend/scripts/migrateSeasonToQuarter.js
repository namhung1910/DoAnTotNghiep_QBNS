/**
 * Script migration: Chuyển đổi field `season` → `quarter` trong HarvestRecord.
 * Format mới: Q1/YYYY, Q2/YYYY, Q3/YYYY, Q4/YYYY — trung tính với mọi loại cây trồng.
 *
 * An toàn: KHÔNG xóa field season cũ — có thể rollback bất cứ lúc nào.
 * Idempotent: Chạy nhiều lần vẫn an toàn (bỏ qua bản ghi đã có quarter).
 *
 * Cách chạy: node --experimental-vm-modules migrateSeasonToQuarter.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Đọc .env từ thư mục backend (script nằm trong backend/scripts/)
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI chưa được cấu hình trong .env');
    process.exit(1);
}

// Tính quý từ ngày thu hoạch — Q1~Q4 tương ứng 3 tháng/quý
const calcQuarter = (harvestDate) => {
    const d = new Date(harvestDate);
    const month = d.getMonth() + 1; // 1–12
    const year  = d.getFullYear();
    const q     = Math.ceil(month / 3); // 1-3→1, 4-6→2, 7-9→3, 10-12→4
    return `Q${q}/${year}`;
};

const migrate = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Đã kết nối MongoDB');

        // Dùng raw collection để tránh hook pre-save của model cũ
        const col = mongoose.connection.collection('harvestrecords');
        const records = await col.find({}).toArray();
        console.log(`📦 Tìm thấy ${records.length} bản ghi HarvestRecord`);

        let success = 0, skipped = 0, errors = 0;

        for (const record of records) {
            // Bỏ qua bản ghi đã có quarter (idempotent)
            if (record.quarter) {
                skipped++;
                continue;
            }

            try {
                let quarter;
                if (record.season === 'Vụ bị hủy') {
                    quarter = 'Hủy vụ';
                } else {
                    quarter = calcQuarter(record.harvestDate);
                }

                await col.updateOne(
                    { _id: record._id },
                    { $set: { quarter } }
                    // season cũ vẫn GIỮ NGUYÊN để rollback an toàn
                );

                const oldLabel = record.season || '(chưa có)';
                console.log(`  ✓ ${record._id} | ${oldLabel} → ${quarter}`);
                success++;
            } catch (err) {
                console.error(`  ✗ ${record._id}: ${err.message}`);
                errors++;
            }
        }

        console.log('\n📊 Kết quả migration:');
        console.log(`   ✅ Thành công: ${success} bản ghi`);
        console.log(`   ⏭️  Bỏ qua (đã có quarter): ${skipped} bản ghi`);
        if (errors > 0) console.log(`   ❌ Lỗi: ${errors} bản ghi`);
        console.log('\n💡 Field season cũ vẫn được giữ nguyên để rollback an toàn.');
        console.log('   Khi đã xác nhận hoạt động ổn định, có thể xóa field season bằng lệnh:');
        console.log('   db.harvestrecords.updateMany({}, { $unset: { season: "" } })');

    } catch (err) {
        console.error('❌ Lỗi kết nối hoặc migration:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
    }
};

migrate();
