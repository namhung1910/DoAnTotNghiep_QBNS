import ContactRequest from '../models/ContactRequest.js';
import Product from '../models/Product.js';

// @desc    Tạo yêu cầu liên hệ (Khách hàng)
// @route   POST /api/contacts
// @access  Public
export const createContactRequest = async (req, res) => {
  try {
    const { productId, customerName, customerPhone, customerEmail, message, quantity } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    const contactRequest = await ContactRequest.create({
      productId,
      farmerId: product.farmerId,
      customerName,
      customerPhone,
      customerEmail,
      message,
      quantity
    });
    
    // Tăng số lượt liên hệ của sản phẩm
    product.contactCount += 1;
    await product.save();
    
    res.status(201).json({
      message: 'Đã gửi yêu cầu liên hệ thành công',
      contactRequest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy yêu cầu liên hệ của farmer
// @route   GET /api/contacts/my-contacts
// @access  Private/Farmer
export const getMyContactRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { farmerId: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    const total = await ContactRequest.countDocuments(query);
    const contacts = await ContactRequest.find(query)
      .populate('productId', 'productName images price')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Đếm số yêu cầu mới
    const newCount = await ContactRequest.countDocuments({ 
      farmerId: req.user._id, 
      status: 'new' 
    });
    
    res.json({
      contacts,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
      newCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Cập nhật trạng thái yêu cầu liên hệ
// @route   PUT /api/contacts/:id/status
// @access  Private/Farmer
export const updateContactStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const contact = await ContactRequest.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu liên hệ' });
    }
    
    if (contact.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền cập nhật yêu cầu này' });
    }
    
    contact.status = status;
    if (notes) {
      contact.notes = notes;
    }
    
    await contact.save();
    
    res.json({ message: 'Đã cập nhật trạng thái', contact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy chi tiết yêu cầu liên hệ
// @route   GET /api/contacts/:id
// @access  Private/Farmer
export const getContactById = async (req, res) => {
  try {
    const contact = await ContactRequest.findById(req.params.id)
      .populate('productId', 'productName images price unit');
    
    if (!contact) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu liên hệ' });
    }
    
    if (contact.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xem yêu cầu này' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

