import Policy from '../models/Policy.js';

// @desc    Lấy tất cả chính sách
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
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });
    
    res.json(policies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy chính sách theo ID
// @route   GET /api/policies/:id
// @access  Public
export const getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id)
      .populate('createdBy', 'fullName');
    
    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy chính sách' });
    }
    
    res.json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tạo chính sách mới
// @route   POST /api/policies
// @access  Private/Admin
export const createPolicy = async (req, res) => {
  try {
    const { title, category, content, effectiveDate, expiryDate, attachments } = req.body;
    
    const policy = await Policy.create({
      title,
      category,
      content,
      effectiveDate,
      expiryDate,
      attachments,
      createdBy: req.user._id
    });
    
    res.status(201).json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật chính sách
// @route   PUT /api/policies/:id
// @access  Private/Admin
export const updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    
    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy chính sách' });
    }
    
    const updatedPolicy = await Policy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedPolicy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa chính sách
// @route   DELETE /api/policies/:id
// @access  Private/Admin
export const deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    
    if (!policy) {
      return res.status(404).json({ message: 'Không tìm thấy chính sách' });
    }
    
    policy.isActive = false;
    await policy.save();
    
    res.json({ message: 'Đã xóa chính sách' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

