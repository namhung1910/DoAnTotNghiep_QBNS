import Product from '../models/Product.js';
import Farm from '../models/Farm.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';

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
      .populate('farmId', 'cropType area geometry status planningData cumulativeYieldKg stockAdjustment soldOutsideKg');

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Calculate actual stock
    const cumulative = product.farmId?.cumulativeYieldKg || 0;
    const adjustment = product.farmId?.stockAdjustment || 0;
    const soldOutside = product.farmId?.soldOutsideKg || 0;
    const soldProduct = product.soldQuantity || 0;
    const actualStock = cumulative + adjustment - soldOutside - soldProduct;

    res.json({ ...product.toObject(), actualStock });
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
    const { farmId, productName, category, price, unit, description, certification, productionProcess, harvestDate, expiryDate } = req.body;

    // Kiểm tra farm thuộc về farmer này
    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({ message: 'Không tìm thấy thửa đất' });
    }

    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Thửa đất này không thuộc về bạn' });
    }

    // Ràng buộc 1 thửa đất = 1 bài đăng sản phẩm đang active
    // (cho phép tạo lại nếu bài trước bị từ chối hoặc đã bán hết)
    const existingActive = await Product.findOne({
      farmId,
      status: { $in: ['pending', 'approved'] }
    });
    if (existingActive) {
      return res.status(400).json({
        message: `Thửa đất này đã có bài đăng sản phẩm đang chờ duyệt/đã được duyệt. Vui lòng chỉnh sửa bài đó thay vì tạo mới.`,
        existingProductId: existingActive._id
      });
    }

    // Validate và upload ảnh song song
    let images = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return res.status(400).json({ message: 'Tối đa 5 hình ảnh' });
      }
      for (const file of req.files) {
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: `File "${file.originalname}" không phải ảnh hợp lệ` });
        }
        if (file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ message: `File "${file.originalname}" vượt quá 5MB` });
        }
      }
      images = await Promise.all(
        req.files.map(file => uploadImageToCloudinary(file.buffer, 'products'))
      ); // mỗi phần tử: { url, public_id }
    }

    const product = await Product.create({
      farmId,
      farmerId: req.user._id,
      productName,
      category,
      images,
      price,
      unit,
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

    // ── Tính ảnh giữ lại vs ảnh bị xóa dựa trên keepImages từ client ──
    // keepImages: JSON array of { url, public_id } — ảnh cũ client muốn giữ lại
    let updatedImages = [...(product.images || [])];

    if (req.body.keepImages !== undefined) {
      let keepImages = [];
      try { keepImages = JSON.parse(req.body.keepImages); } catch (_) { }

      // Backend tự tính ảnh cần xóa: có trong DB nhưng không có trong keepImages
      const toDelete = updatedImages.filter(
        old => !keepImages.some(k => k.url === old.url)
      );

      // Xóa trên Cloudinary — fail-fast: nếu fail thì throw, không update DB
      await Promise.all(
        toDelete.map(img => deleteImageFromCloudinary(img.public_id))
      );

      updatedImages = keepImages; // chỉ giữ ảnh client chọn
      delete req.body.keepImages;
    }

    // Validate và upload ảnh mới song song
    if (req.files && req.files.length > 0) {
      const totalAfter = updatedImages.length + req.files.length;
      if (totalAfter > 5) {
        return res.status(400).json({ message: 'Tổng số ảnh không được vượt quá 5' });
      }
      for (const file of req.files) {
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: `File "${file.originalname}" không phải ảnh hợp lệ` });
        }
        if (file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ message: `File "${file.originalname}" vượt quá 5MB` });
        }
      }
      const newUploaded = await Promise.all(
        req.files.map(file => uploadImageToCloudinary(file.buffer, 'products'))
      );
      updatedImages = [...updatedImages, ...newUploaded];
    }

    req.body.images = updatedImages;


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

    if (product.images && product.images.length > 0) {
      // Xóa song song — lỗi xóa 1 ảnh không chặn xóa Product khỏi DB
      await Promise.allSettled(
        product.images.map(img => deleteImageFromCloudinary(img.public_id))
      );
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

// @desc    Track sự quan tâm (click liên hệ Zalo/Phone)
// @route   POST /api/products/:id/track-interest
// @access  Public
export const trackInterest = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { contactCount: 1 } },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json({ message: 'Đã ghi nhận lượt quan tâm', contactCount: product.contactCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Ghi nhận đã bán xuất kho (Nông dân thao tác)
// @route   POST /api/products/:id/record-sale
// @access  Private/Farmer
export const recordSale = async (req, res) => {
  try {
    const { amount } = req.body;
    const saleAmount = Number(amount);
    if (isNaN(saleAmount) || saleAmount <= 0) {
      return res.status(400).json({ message: 'Số lượng xuất bán không hợp lệ' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thao tác trên sản phẩm này' });
    }

    product.soldQuantity = (product.soldQuantity || 0) + saleAmount;
    await product.save();

    res.json({ message: 'Đã cập nhật số lượng xuất bán', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

