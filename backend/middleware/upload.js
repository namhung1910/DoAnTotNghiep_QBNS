import multer from 'multer';

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

// Sử dụng memoryStorage cho mọi file upload (xử lý Sharp/Cloudinary trên RAM)
const memoryStorage = multer.memoryStorage();
export const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});
