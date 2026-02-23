import Farm from '../models/Farm.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import ContactRequest from '../models/ContactRequest.js';
import Region from '../models/Region.js';

// @desc    Lấy thống kê tổng quan (Admin Dashboard)
// @route   GET /api/statistics/overview
// @access  Private/Admin
export const getOverviewStatistics = async (req, res) => {
  try {
    // Thống kê người dùng
    const totalFarmers = await User.countDocuments({ role: 'farmer', isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });

    // Thống kê vùng quy hoạch
    const totalRegions = await Region.countDocuments({ isActive: true });
    const totalRegionArea = await Region.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalArea' } } }
    ]);

    // Thống kê thửa đất
    const totalFarms = await Farm.countDocuments({ isActive: true });
    const totalFarmArea = await Farm.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$area' } } }
    ]);

    // Thống kê sản phẩm
    const totalProducts = await Product.countDocuments({ status: 'approved' });
    const pendingProducts = await Product.countDocuments({ status: 'pending' });

    // Thống kê liên hệ
    const totalContacts = await ContactRequest.countDocuments();
    const newContacts = await ContactRequest.countDocuments({ status: 'new' });

    // Thống kê theo trạng thái mùa vụ
    const farmsByStatus = await Farm.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          area: { $sum: '$area' }
        }
      }
    ]);

    // Thống kê theo loại cây trồng
    const farmsByCrop = await Farm.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$cropType',
          count: { $sum: 1 },
          area: { $sum: '$area' }
        }
      },
      { $sort: { area: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      users: {
        totalFarmers,
        totalAdmins
      },
      regions: {
        total: totalRegions,
        totalArea: totalRegionArea[0]?.total || 0
      },
      farms: {
        total: totalFarms,
        totalArea: totalFarmArea[0]?.total || 0,
        byStatus: farmsByStatus,
        byCrop: farmsByCrop
      },
      products: {
        total: totalProducts,
        pending: pendingProducts
      },
      contacts: {
        total: totalContacts,
        new: newContacts
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thống kê sản lượng dự kiến
// @route   GET /api/statistics/harvest-forecast
// @access  Private/Admin
export const getHarvestForecast = async (req, res) => {
  try {
    const { month, year } = req.query;

    let matchQuery = { isActive: true, status: { $in: ['growing', 'harvesting'] } };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      matchQuery.expectedHarvestDate = { $gte: startDate, $lte: endDate };
    }

    const forecast = await Farm.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            month: { $month: '$expectedHarvestDate' },
            year: { $year: '$expectedHarvestDate' },
            cropType: '$cropType'
          },
          count: { $sum: 1 },
          totalArea: { $sum: '$area' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json(forecast);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thống kê theo vùng
// @route   GET /api/statistics/by-region
// @access  Private/Admin
export const getStatisticsByRegion = async (req, res) => {
  try {
    const regionStats = await Farm.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'regions',
          localField: 'regionId',
          foreignField: '_id',
          as: 'region'
        }
      },
      { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$regionId',
          regionName: { $first: '$region.name' },
          farmCount: { $sum: 1 },
          totalArea: { $sum: '$area' },
          crops: { $addToSet: '$cropType' }
        }
      },
      { $sort: { totalArea: -1 } }
    ]);

    res.json(regionStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thống kê sản phẩm theo chứng nhận
// @route   GET /api/statistics/products-by-certification
// @access  Private/Admin
export const getProductsByCertification = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$certification',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalContacts: { $sum: '$contactCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thống kê công khai cho trang chủ (Public)
// @route   GET /api/statistics/public
// @access  Public
export const getPublicStatistics = async (req, res) => {
  try {
    // Tổng diện tích vùng quy hoạch (hecta)
    const totalRegionArea = await Region.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalArea' } } }
    ]);

    // Tổng diện tích thửa đất nông nghiệp (hecta)
    const totalFarmArea = await Farm.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$area' } } }
    ]);

    // Số nông dân tham gia
    const totalFarmers = await User.countDocuments({ role: 'farmer', isActive: true });

    // Số sản phẩm đạt chuẩn (có chứng nhận)
    const certifiedProducts = await Product.countDocuments({
      status: 'approved',
      certification: { $ne: 'Không có' }
    });

    res.json({
      regionArea: Math.round((totalRegionArea[0]?.total || 0) / 10000), // Convert m² to hecta
      farmArea: Math.round((totalFarmArea[0]?.total || 0) / 10000), // Convert m² to hecta
      farmers: totalFarmers,
      certifiedProducts: certifiedProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
