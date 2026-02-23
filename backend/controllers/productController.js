import Product from '../models/Product.js';
import Farm from '../models/Farm.js';

// @desc    Lấy tất cả sản phẩm đã duyệt (Public)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { category, certification, search, page = 1, limit = 12 } = req.query;

    let query = { status: 'approved' };

    if (category) {
      query.category = category;
    }

    if (certification && certification !== 'Không có') {
      query.certification = certification;
    }

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('farmerId', 'fullName phone address')
      .populate('farmId', 'cropType area geometry')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      products,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy sản phẩm theo ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmerId', 'fullName phone address avatar')
      .populate('farmId', 'cropType area geometry status planningData');

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Removed auto-increment to prevent double counting in React Strict Mode
    // Use separate endpoint POST /api/products/:id/view instead

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tăng lượt xem sản phẩm
// @route   POST /api/products/:id/view
// @access  Public
export const incrementViewCount = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    product.viewCount += 1;
    await product.save();

    res.json({ viewCount: product.viewCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy sản phẩm của farmer đang đăng nhập
// @route   GET /api/products/my-products
// @access  Private/Farmer
export const getMyProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { farmerId: req.user._id };

    if (status) {
      query.status = status;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('farmId', 'name cropType')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      products,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Tạo sản phẩm mới
// @route   POST /api/products
// @access  Private/Farmer
export const createProduct = async (req, res) => {
  try {
    const { farmId, productName, category, price, unit, quantity, description, certification, productionProcess, harvestDate, expiryDate } = req.body;

    // Kiểm tra farm thuộc về farmer này
    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Thửa đất này không thuộc về bạn' });
    }

    // Xử lý upload ảnh
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    const product = await Product.create({
      farmId,
      farmerId: req.user._id,
      productName,
      category,
      images,
      price,
      unit,
      quantity,
      description,
      certification,
      productionProcess,
      harvestDate,
      expiryDate,
      status: 'pending'
    });

    const populatedProduct = await Product.findById(product._id)
      .populate('farmId', 'name cropType')
      .populate('farmerId', 'fullName');

    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật sản phẩm
// @route   PUT /api/products/:id
// @access  Private/Farmer
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền cập nhật sản phẩm này' });
    }

    // Xử lý upload ảnh mới
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
      req.body.images = [...(product.images || []), ...newImages];
    }

    // Reset status về pending nếu farmer sửa
    if (req.user.role === 'farmer') {
      req.body.status = 'pending';
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('farmId', 'name cropType').populate('farmerId', 'fullName');

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa sản phẩm
// @route   DELETE /api/products/:id
// @access  Private/Farmer
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xóa sản phẩm này' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy sản phẩm chờ duyệt (Admin)
// @route   GET /api/products/pending
// @access  Private/Admin
export const getPendingProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const total = await Product.countDocuments({ status: 'pending' });
    const products = await Product.find({ status: 'pending' })
      .populate('farmerId', 'fullName phone')
      .populate('farmId', 'name cropType')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      products,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Duyệt/Từ chối sản phẩm (Admin)
// @route   PUT /api/products/:id/review
// @access  Private/Admin
export const reviewProduct = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    product.status = status;
    if (status === 'rejected' && rejectionReason) {
      product.rejectionReason = rejectionReason;
    }

    await product.save();

    res.json({ message: `Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} sản phẩm`, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

