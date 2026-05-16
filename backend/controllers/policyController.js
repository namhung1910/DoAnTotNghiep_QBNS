import Policy from '../models/Policy.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';

// @desc    Lấy tất cả bài đăng bảng tin (có filter category, search)
// @route   GET /api/policies
// @access  Public
export const getPolicies = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const policies = await Policy.find(query)
      .populate('createdBy', 'fullName avatar')
      .sort({ createdAt: -1 });

    res.json(policies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy bài đăng theo ID
// @route   GET /api/policies/:id
// @access  Public
export const getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id)
      .populate('createdBy', 'fullName avatar');

    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    res.json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tạo bài đăng mới (hỗ trợ upload ảnh Cloudinary, tối đa 5 ảnh)
// @route   POST /api/policies
// @access  Private/Admin
export const createPolicy = async (req, res) => {
  try {
    const { title, category, content } = req.body;

    // Upload các ảnh đính kèm lên Cloudinary folder 'newsfeed'
    const imageFiles = req.files || [];
    if (imageFiles.length > 5) {
      return res.status(400).json({ message: 'Tối đa 5 ảnh cho mỗi bài đăng' });
    }

    const uploadedImages = await Promise.all(
      imageFiles.map(file => uploadImageToCloudinary(file.buffer, 'newsfeed'))
    );

    const policy = await Policy.create({
      title,
      category,
      content,
      images: uploadedImages,
      createdBy: req.user._id
    });

    const populated = await policy.populate('createdBy', 'fullName avatar');
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật bài đăng — hỗ trợ thêm ảnh mới và xóa ảnh cũ
// @route   PUT /api/policies/:id
// @access  Private/Admin
export const updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    const { title, category, content, removedImageIds } = req.body;

    // Xóa ảnh cũ bị remove khỏi Cloudinary
    const removedIds = removedImageIds
      ? (Array.isArray(removedImageIds) ? removedImageIds : JSON.parse(removedImageIds))
      : [];

    if (removedIds.length > 0) {
      await Promise.all(removedIds.map(pid => deleteImageFromCloudinary(pid)));
      policy.images = policy.images.filter(img => !removedIds.includes(img.public_id));
    }

    // Upload ảnh mới (nếu có) — giữ tổng <= 5
    const newFiles = req.files || [];
    const totalImages = policy.images.length + newFiles.length;
    if (totalImages > 5) {
      return res.status(400).json({ message: `Tối đa 5 ảnh. Hiện đã có ${policy.images.length} ảnh, không thể thêm ${newFiles.length} ảnh nữa.` });
    }

    const newUploaded = await Promise.all(
      newFiles.map(file => uploadImageToCloudinary(file.buffer, 'newsfeed'))
    );

    // Cập nhật các field
    policy.title       = title       ?? policy.title;
    policy.category    = category    ?? policy.category;
    policy.content     = content     ?? policy.content;
    policy.images.push(...newUploaded);

    await policy.save();
    const populated = await policy.populate('createdBy', 'fullName avatar');
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa bài đăng (soft delete) + xóa TẤT CẢ ảnh trên Cloudinary
// @route   DELETE /api/policies/:id
// @access  Private/Admin
export const deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    // Xóa tất cả ảnh khỏi Cloudinary trước khi soft-delete
    if (policy.images && policy.images.length > 0) {
      await Promise.all(
        policy.images.map(img => deleteImageFromCloudinary(img.public_id))
      );
    }

    policy.isActive = false;
    await policy.save();

    res.json({ message: 'Đã xóa bài đăng' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Toggle like/unlike bài đăng (farmer hoặc admin)
// @route   POST /api/policies/:id/like
// @access  Private (farmer + admin)
export const toggleLike = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy || !policy.isActive) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = policy.likes.some(id => id.toString() === userId);

    if (alreadyLiked) {
      // Unlike
      policy.likes = policy.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      policy.likes.push(req.user._id);
    }

    await policy.save();
    res.json({ likes: policy.likes.length, liked: !alreadyLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
