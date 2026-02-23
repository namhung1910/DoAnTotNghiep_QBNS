import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'others';
    
    if (file.fieldname === 'productImages') {
      folder = 'products';
    } else if (file.fieldname === 'avatar') {
      folder = 'avatars';
    } else if (file.fieldname === 'geojson') {
      folder = 'geojson';
    }
    
    const destPath = path.join(uploadsDir, folder);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter file
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'geojson') {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.geojson')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file GeoJSON!'), false);
    }
  } else if (file.fieldname === 'productImages' || file.fieldname === 'avatar') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
  } else {
    cb(null, true);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

