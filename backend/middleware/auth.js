import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware xác thực token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Không tìm thấy người dùng' });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'Tài khoản đã bị khóa' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập' });
  }
};

// Middleware kiểm tra token không bắt buộc (dành cho route public có thể có context)
export const optionalProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      // Nếu user bị khóa, req.user vẫn tồn tại nhưng sẽ set thành null hoặc xử lý tuỳ ý.
      // Tuy nhiên ở đây là optional nên chỉ throw log nếu khóa, ta cứ cho qua thành khách.
      if (req.user && !req.user.isActive) {
        req.user = null;
      }
    } catch (error) {
      console.error("optionalProtect error:", error);
      req.user = null; // Token lỗi thì coi như khách
    }
  } else {
    req.user = null;
  }
  next();
};

// Middleware kiểm tra role Admin
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Chỉ Admin mới có quyền truy cập' });
  }
};

// Middleware kiểm tra role Farmer hoặc Admin
export const farmerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'farmer' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
};

// Tạo JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

