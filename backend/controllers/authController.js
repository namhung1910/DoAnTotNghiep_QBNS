import User from '../models/User.js';
import Counter from '../models/Counter.js';
import { generateToken } from '../middleware/auth.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';

// @desc    Đăng ký tài khoản mới
// @route   POST /api/auth/register
// @access  Public (Admin tạo) hoặc Admin only
export const register = async (req, res) => {
  try {
    const { username, password, fullName, role, phone, address } = req.body;

    // Kiểm tra username đã tồn tại chưa
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    // Tạo user mới
    const user = await User.create({
      username,
      password,
      fullName,
      role: role || 'farmer',
      phone,
      address
    });

    if (user) {
      // Sinh farmerCode tự động cho nông dân — atomic, không race condition
      if (user.role === 'farmer') {
        const counter = await Counter.findByIdAndUpdate(
          'farmerCode',
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        user.farmerCode = `ND${String(counter.seq).padStart(3, '0')}`;
        await user.save();
      }

      res.status(201).json({
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        address: user.address,
        farmerCode: user.farmerCode || undefined,
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Tìm user theo username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Kiểm tra password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thông tin profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;

      if (req.body.password) {
        user.password = req.body.password;
      }

      if (req.file) {
        // Xóa ảnh cũ trên Cloudinary nếu có
        if (user.avatar && user.avatar.includes('cloudinary.com')) {
          try {
            const urlParts = user.avatar.split('/');
            const folderAndId = urlParts.slice(-2).join('/').split('.')[0];
            await deleteImageFromCloudinary(folderAndId);
          } catch (e) {
            console.error('Lỗi xóa avatar cũ:', e.message);
          }
        }

        try {
          const uploadResult = await uploadImageToCloudinary(req.file.buffer, 'avatars');
          user.avatar = uploadResult.url;
        } catch (e) {
          console.error('Lỗi upload avatar mới:', e.message);
          // throw error or handles normally depending on preferences
        }
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        avatar: updatedUser.avatar
      });
    } else {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy danh sách users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      users,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật trạng thái user (Admin only)
// @route   PUT /api/auth/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    user.isActive = req.body.isActive;
    await user.save();

    res.json({ message: 'Cập nhật trạng thái thành công', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Đổi mật khẩu người dùng
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};


// @desc    Đổi số điện thoại
// @route   PUT /api/auth/change-phone
// @access  Private
export const changePhone = async (req, res) => {
  try {
    const { phone, currentPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.phone = phone;
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa tài khoản vĩnh viễn (Hard Delete)
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Xóa avatar trên Cloudinary nếu có
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      try {
        const urlParts = user.avatar.split('/');
        const folderAndId = urlParts.slice(-2).join('/').split('.')[0];
        await deleteImageFromCloudinary(folderAndId);
      } catch (e) {
        console.error('Lỗi xóa avatar cũ:', e.message);
      }
    }

    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Tài khoản đã được xóa vĩnh viễn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

