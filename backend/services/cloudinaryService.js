import cloudinary from '../config/cloudinary.js';
import sharp from 'sharp';

/**
 * Retry helper with exponential backoff.
 * @param {Function} fn  - Async function to retry
 * @param {number} maxAttempts - Max number of attempts (default 3)
 * @param {number} delayMs    - Base delay in ms (default 500); doubles each retry
 */
async function withRetry(fn, maxAttempts = 3, delayMs = 500) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxAttempts) throw err;
            const wait = delayMs * attempt; // 500ms → 1000ms → 1500ms
            console.warn(`[Cloudinary] Attempt ${attempt}/${maxAttempts} failed (${err.message}). Retrying in ${wait}ms…`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
}

/**
 * Upload image buffer to Cloudinary after processing with Sharp.
 * @param {Buffer} buffer - Image buffer from multer
 * @param {String} folder - Cloudinary folder name ('products', 'avatars')
 * @returns {Promise<{ url: string, public_id: string }>}
 */
export const uploadImageToCloudinary = (buffer, folder = 'others') => {
    return withRetry(() => new Promise(async (resolve, reject) => {
        try {
            const processedBuffer = await sharp(buffer)
                .resize({ width: 1280, height: 720, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'image',
                    format: 'webp',
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({
                            url: result.secure_url,
                            public_id: result.public_id
                        });
                    }
                }
            );

            uploadStream.end(processedBuffer);
        } catch (error) {
            reject(error);
        }
    }));
};

/**
 * Delete image from Cloudinary (with retry).
 * @param {String} public_id - Cloudinary public ID
 * @returns {Promise<Object>}
 */
export const deleteImageFromCloudinary = (public_id) => {
    if (!public_id) return Promise.resolve(null);
    return withRetry(() => new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(public_id, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    }));
};
