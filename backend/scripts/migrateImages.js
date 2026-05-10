/**
 * Migration script: chuyển các Product có images[*] là String
 * sang { url: String, public_id: String } bằng cách parse URL.
 *
 * Chạy 1 lần:  node backend/scripts/migrateImages.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error('❌  Không tìm thấy MONGO_URI trong .env');
    process.exit(1);
}

/**
 * Trích xuất public_id từ Cloudinary secure_url.
 * URL dạng: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<file>.webp
 * → public_id: <folder>/<file>  (không có đuôi)
 */
function parsePublicId(url) {
    try {
        const parts = url.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx === -1) return null;
        // Bỏ qua phần version (v1234...) nếu có
        let after = parts.slice(uploadIdx + 1);
        if (/^v\d+$/.test(after[0])) after = after.slice(1);
        return after.join('/').replace(/\.[^/.]+$/, ''); // bỏ đuôi file
    } catch {
        return null;
    }
}

async function migrate() {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Kết nối MongoDB thành công');

    const db = mongoose.connection.db;
    const col = db.collection('products');

    // Tìm document có ít nhất 1 phần tử images là String (không phải object)
    const products = await col.find({
        'images.0': { $type: 'string' }
    }).toArray();

    console.log(`🔍  Tìm thấy ${products.length} sản phẩm cần migrate`);

    let ok = 0;
    let skip = 0;

    for (const p of products) {
        const newImages = (p.images || []).map(img => {
            if (typeof img === 'object' && img.url) return img; // đã đúng format
            if (typeof img !== 'string') { skip++; return null; }
            const public_id = parsePublicId(img);
            if (!public_id) { console.warn(`  ⚠️  Không parse được public_id từ: ${img}`); skip++; return null; }
            return { url: img, public_id };
        }).filter(Boolean);

        await col.updateOne(
            { _id: p._id },
            { $set: { images: newImages } }
        );
        ok++;
        console.log(`  ✔  ${p._id}  →  ${newImages.length} ảnh`);
    }

    console.log(`\n🎉  Migration hoàn tất: ${ok} sản phẩm, bỏ qua ${skip} ảnh lỗi`);
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌  Migration thất bại:', err);
    process.exit(1);
});
