import Product from '../models/Product.js';
import Farm from '../models/Farm.js';
import StockHistory from '../models/StockHistory.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';

// ── Helper: Tính tồn kho khả dụng cho 1 Farm ────────────────────────────────
const calcFarmStock = (farm) => {
  const cumulative = farm.cumulativeYieldKg || 0;
  const adjustment = farm.stockAdjustment || 0;
  const soldOutside = farm.soldOutsideKg || 0;
  return cumulative + adjustment - soldOutside;
};

// ── Helper: Tính tổng stock từ nhiều Farm ───────────────────────────────────
// legacySoldQty: soldQuantity trên Product cũ (pre-migration, chưa migrate sang Farm.soldOutsideKg)
// Sản phẩm mới (recordSaleMulti): soldOutsideKg đã được cập nhật → legacySoldQty = 0
const calcTotalStock = (farms, legacySoldQty = 0) =>
  Math.max(0, farms.reduce((sum, f) => sum + calcFarmStock(f), 0) - legacySoldQty);

// ── Helper: Xác định legacySoldQty cho 1 product object ─────────────────────
// Nếu tất cả farm đều có soldOutsideKg = 0 (chưa từng dùng recordSaleMulti)
// thì soldQuantity trên Product là từ hệ thống cũ → cần trừ thêm
const getLegacySoldQty = (pObj) => {
  const farms = pObj.farmIds || [];
  const totalSoldOutside = farms.reduce((s, f) => s + (f.soldOutsideKg || 0), 0);
  return totalSoldOutside === 0 ? (pObj.soldQuantity || 0) : 0;
};


// ── Helper: Validate farmIds gửi từ client thuộc về farmer đang đăng nhập ───
// Trả về { farms } nếu hợp lệ, throw Error nếu không hợp lệ
const validateFarmIds = async (farmIds, userId) => {
  if (!farmIds || !Array.isArray(farmIds) || farmIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 thửa đất');
  }
  const farms = await Farm.find({
    _id: { $in: farmIds },
    ownerId: userId,
    isActive: true,
    approvalStatus: 'approved'
  });
  if (farms.length !== farmIds.length) {
    throw new Error('Một hoặc nhiều thửa đất không hợp lệ hoặc không thuộc về bạn');
  }
  return farms;
};



// @desc    Lấy tất cả sản phẩm đã duyệt (Public)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { category, certification, search, page = 1, limit = 12 } = req.query;

    let query = { status: 'approved' };
    if (category) query.category = category;
    if (certification && certification !== 'Không có') query.certification = certification;
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('farmerId', 'fullName phone address')
      .populate('farmIds', 'cropType area geometry name cumulativeYieldKg stockAdjustment soldOutsideKg')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const productsWithStock = products.map(p => {
      const pObj = p.toObject();
      pObj.totalAvailableKg = calcTotalStock(pObj.farmIds || []);
      return pObj;
    });

    res.json({ products: productsWithStock, page: parseInt(page), pages: Math.ceil(total / limit), total });
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
      .populate('farmIds', 'name cropType area geometry status cumulativeYieldKg stockAdjustment soldOutsideKg');

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    const pObj = product.toObject();
    pObj.actualStock = calcTotalStock(pObj.farmIds || [], getLegacySoldQty(pObj));
    res.json(pObj);
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
    if (status) query.status = status;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('farmIds', 'name cropType cumulativeYieldKg stockAdjustment soldOutsideKg yieldUnit area')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const productsWithStock = products.map(p => {
      const pObj = p.toObject();
      pObj.totalAvailableKg = calcTotalStock(pObj.farmIds || [], getLegacySoldQty(pObj));
      return pObj;
    });

    res.json({ products: productsWithStock, page: parseInt(page), pages: Math.ceil(total / limit), total });
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
    let { farmIds, productName, category, price, unit, description, certification, productionProcess, harvestDate, expiryDate } = req.body;

    // Hỗ trợ nhận farmIds dạng JSON string (khi gửi qua FormData)
    if (typeof farmIds === 'string') {
      try { farmIds = JSON.parse(farmIds); } catch (_) { farmIds = [farmIds]; }
    }

    // Validate farmIds: tất cả phải thuộc về farmer này
    let farms;
    try {
      farms = await validateFarmIds(farmIds, req.user._id);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    // Ràng buộc: mỗi thửa chỉ được xuất hiện trong 1 sản phẩm active
    const conflictProduct = await Product.findOne({
      farmIds: { $in: farmIds },
      status: { $in: ['pending', 'approved'] }
    });
    if (conflictProduct) {
      return res.status(400).json({
        message: `Một hoặc nhiều thửa đã có bài đăng sản phẩm đang hoạt động. Vui lòng chỉnh sửa bài đó thay vì tạo mới.`,
        existingProductId: conflictProduct._id
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
      );
    }

    const product = await Product.create({
      farmIds,
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
      .populate('farmIds', 'name cropType')
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

    // ── Xử lý cập nhật farmIds nếu farmer gửi lên ──────────────────────────
    if (req.body.farmIds && req.user.role === 'farmer') {
      let newFarmIds = req.body.farmIds;
      if (typeof newFarmIds === 'string') {
        try { newFarmIds = JSON.parse(newFarmIds); } catch (_) { newFarmIds = [newFarmIds]; }
      }

      // Validate ownership
      try {
        await validateFarmIds(newFarmIds, req.user._id);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

      // Kiểm tra trùng thửa với sản phẩm KHÁC (bỏ qua chính bài đang sửa)
      const conflictProduct = await Product.findOne({
        _id: { $ne: req.params.id }, // ← Loại trừ chính product đang sửa
        farmIds: { $in: newFarmIds },
        status: { $in: ['pending', 'approved'] }
      });
      if (conflictProduct) {
        return res.status(400).json({
          message: `Một hoặc nhiều thửa đã có bài đăng sản phẩm đang hoạt động khác.`,
          existingProductId: conflictProduct._id
        });
      }

      req.body.farmIds = newFarmIds;
    }

    // ── Tính ảnh giữ lại vs ảnh bị xóa dựa trên keepImages từ client ─────────
    let updatedImages = [...(product.images || [])];

    if (req.body.keepImages !== undefined) {
      let keepImages = [];
      try { keepImages = JSON.parse(req.body.keepImages); } catch (_) { }

      // Backend tự tính ảnh cần xóa: có trong DB nhưng không có trong keepImages
      const toDelete = updatedImages.filter(
        old => !keepImages.some(k => k.url === old.url)
      );

      // Xóa trên Cloudinary
      await Promise.all(
        toDelete.map(img => deleteImageFromCloudinary(img.public_id))
      );

      updatedImages = keepImages;
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

    // Reset status về pending nếu farmer sửa (cần duyệt lại)
    if (req.user.role === 'farmer') {
      req.body.status = 'pending';
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('farmIds', 'name cropType').populate('farmerId', 'fullName');

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
      .populate('farmIds', 'name cropType')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const normalized = products.map(p => p.toObject());
    res.json({ products: normalized, page: parseInt(page), pages: Math.ceil(total / limit), total });
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

// @desc    Ghi nhận đã bán — hỗ trợ phân bổ nhiều thửa (legacy 1 thửa vẫn hoạt động)
// @route   POST /api/products/:id/record-sale
// @access  Private/Farmer
export const recordSale = async (req, res) => {
  try {
    const { amount } = req.body;
    const saleAmount = Number(amount);
    if (isNaN(saleAmount) || saleAmount <= 0) {
      return res.status(400).json({ message: 'Số lượng xuất bán không hợp lệ' });
    }

    const product = await Product.findById(req.params.id)
      .populate('farmIds', 'name cumulativeYieldKg stockAdjustment soldOutsideKg ownerId');

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thao tác trên sản phẩm này' });
    }

    // Cập nhật soldQuantity tổng trên Product (giữ để dashboard thống kê)
    product.soldQuantity = (product.soldQuantity || 0) + saleAmount;
    await product.save();

    res.json({ message: 'Đã cập nhật số lượng xuất bán', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Ghi nhận đã bán — phân bổ kho nhiều thửa (endpoint chính cho logic mới)
// @route   POST /api/products/:id/record-sale-multi
// @access  Private/Farmer
export const recordSaleMulti = async (req, res) => {
  try {
    // farmAllocations: [{ farmId: "...", amount: 3000 }, { farmId: "...", amount: 1000 }]
    const { farmAllocations } = req.body;

    if (!farmAllocations || !Array.isArray(farmAllocations) || farmAllocations.length === 0) {
      return res.status(400).json({ message: 'Vui lòng cung cấp dữ liệu phân bổ kho (farmAllocations)' });
    }

    const product = await Product.findById(req.params.id)
      .populate('farmIds', 'name cumulativeYieldKg stockAdjustment soldOutsideKg ownerId');

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thao tác trên sản phẩm này' });
    }

    const productFarmIds = (product.farmIds || []).map(f => f._id.toString());

    // Validate từng phân bổ
    let totalSaleAmount = 0;
    for (const alloc of farmAllocations) {
      const amount = Number(alloc.amount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ message: `Số lượng không hợp lệ cho thửa ${alloc.farmId}` });
      }
      if (amount === 0) continue; // Bỏ qua thửa phân bổ 0

      // Kiểm tra farmId trong allocation có thuộc về sản phẩm này không
      if (!productFarmIds.includes(alloc.farmId.toString())) {
        return res.status(400).json({ message: `Thửa ${alloc.farmId} không thuộc về sản phẩm này` });
      }

      // Kiểm tra không vượt tồn kho từng thửa
      const farm = product.farmIds.find(f => f._id.toString() === alloc.farmId.toString());
      if (farm) {
        const farmStock = calcFarmStock(farm);
        if (amount > farmStock) {
          return res.status(400).json({
            message: `Số lượng bán từ thửa "${farm.name}" (${amount} kg) vượt quá tồn kho khả dụng (${farmStock} kg)`
          });
        }
      }

      totalSaleAmount += amount;
    }

    if (totalSaleAmount <= 0) {
      return res.status(400).json({ message: 'Tổng số lượng bán phải lớn hơn 0' });
    }

    // Thực hiện trừ kho từng thửa một cách atomic
    const stockHistoryDocs = [];
    for (const alloc of farmAllocations) {
      const amount = Number(alloc.amount);
      if (amount <= 0) continue;

      // Atomic increment soldOutsideKg của từng Farm
      await Farm.findByIdAndUpdate(
        alloc.farmId,
        { $inc: { soldOutsideKg: amount } },
        { new: true }
      );

      // Chuẩn bị log lịch sử
      stockHistoryDocs.push({
        farmId: alloc.farmId,
        farmerId: req.user._id,
        type: 'sale',
        amount: amount,
        note: `Bán qua sản phẩm "${product.productName}" — phân bổ ${amount} kg từ thửa này`
      });
    }

    // Lưu lịch sử kho song song
    if (stockHistoryDocs.length > 0) {
      await StockHistory.insertMany(stockHistoryDocs);
    }

    // Cập nhật tổng soldQuantity trên Product (dùng cho dashboard thống kê)
    product.soldQuantity = (product.soldQuantity || 0) + totalSaleAmount;
    await product.save();

    res.json({
      message: `Đã ghi nhận bán ${totalSaleAmount} kg thành công`,
      totalSaleAmount,
      allocations: farmAllocations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
