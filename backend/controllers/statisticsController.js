import Farm from '../models/Farm.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Region from '../models/Region.js';
import HarvestRecord from '../models/HarvestRecord.js';
import LandRequest from '../models/LandRequest.js';
import Complaint from '../models/Complaint.js';
import Policy from '../models/Policy.js';

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

    // Thống kê liên hệ (Contact intent)
    const contactStats = await Product.aggregate([
      { $group: { _id: null, totalContacts: { $sum: '$contactCount' } } }
    ]);
    const totalContacts = contactStats[0]?.totalContacts || 0;
    const newContacts = 0; // Không còn khái niệm "new" vì không lưu record riêng nữa

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

    // Tổng sản lượng toàn hệ thống
    const totalYieldStats = await Farm.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalYield: { $sum: '$cumulativeYieldKg' } } }
    ]);
    const totalYield = totalYieldStats[0]?.totalYield || 0;

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
        totalYield: totalYield,
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
          totalArea: { $sum: '$area' },
          expectedYield: { $sum: '$expectedYield' }
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
          totalYield: { $sum: '$cumulativeYieldKg' },
          crops: { $addToSet: '$cropType' }
        }
      },
      { $sort: { totalYield: -1, totalArea: -1 } }
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

// @desc    Thống kê sản lượng thu hoạch (Admin)
// @route   GET /api/statistics/harvest-summary
// @access  Private/Admin
export const getHarvestSummary = async (req, res) => {
  try {
    // Tổng sản lượng đã thu hoạch (đơn vị chuẩn: kg)
    const totalYield = await Farm.aggregate([
      { $match: { isActive: true, status: 'harvested' } },
      { $group: { _id: null, totalKg: { $sum: '$yieldInKg' }, count: { $sum: 1 } } }
    ]);

    // Sản lượng theo loại cây trồng (top 10)
    const yieldByCrop = await Farm.aggregate([
      { $match: { isActive: true, status: 'harvested', yieldInKg: { $gt: 0 } } },
      {
        $group: {
          _id: '$cropType',
          totalKg: { $sum: '$yieldInKg' },
          count: { $sum: 1 },
          avgYieldPerArea: { $avg: { $cond: [{ $gt: ['$area', 0] }, { $divide: ['$yieldInKg', '$area'] }, 0] } }
        }
      },
      { $sort: { totalKg: -1 } },
      { $limit: 10 }
    ]);

    // Sản lượng theo vùng quy hoạch
    const yieldByRegion = await Farm.aggregate([
      { $match: { isActive: true, status: 'harvested', yieldInKg: { $gt: 0 } } },
      {
        $lookup: {
          from: 'regions',
          localField: 'regionId',
          foreignField: '_id',
          as: 'region'
        }
      },
      { $unwind: { path: '$region', preserveNullAndEmpty: true } },
      {
        $group: {
          _id: '$region.name',
          totalKg: { $sum: '$yieldInKg' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalKg: -1 } }
    ]);

    // Số thửa đất đã thu hoạch nhưng chưa nhập sản lượng (cảnh báo)
    const missingYieldCount = await Farm.countDocuments({
      isActive: true,
      status: 'harvested',
      $or: [{ yieldInKg: 0 }, { yieldInKg: null }]
    });

    // Tổng sản lượng theo tháng (12 tháng gần nhất)
    const yieldByMonth = await Farm.aggregate([
      {
        $match: {
          isActive: true,
          status: 'harvested',
          actualHarvestDate: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$actualHarvestDate' },
            month: { $month: '$actualHarvestDate' }
          },
          totalKg: { $sum: '$yieldInKg' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      totalYieldKg: totalYield[0]?.totalKg || 0,
      totalHarvestedFarms: totalYield[0]?.count || 0,
      missingYieldCount,
      yieldByCrop,
      yieldByRegion,
      yieldByMonth
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy thống kê lịch sử thu hoạch (dành cho Admin vẽ biểu đồ)
// @route   GET /api/statistics/historical-harvests
// @access  Private/Admin
export const getHistoricalHarvests = async (req, res) => {
  try {
    const { groupBy = 'month', year } = req.query;
    
    let matchQuery = {};
    if (year) {
      const yearStart = new Date(`${year}-01-01T00:00:00Z`);
      const yearEnd = new Date(`${year}-12-31T23:59:59Z`);
      matchQuery.harvestDate = { $gte: yearStart, $lte: yearEnd };
    }

    let groupStage = {};
    let sortStage = {};

    if (groupBy === 'year') {
      groupStage = {
        _id: { year: { $year: '$harvestDate' } },
        totalYield: { $sum: '$yieldInKg' },
        totalRecords: { $sum: 1 }
      };
      sortStage = { '_id.year': 1 };
    } else if (groupBy === 'region') {
      groupStage = {
        _id: '$regionId',
        totalYield: { $sum: '$yieldInKg' },
        totalRecords: { $sum: 1 }
      };
    } else {
      groupStage = {
        _id: { 
          month: { $month: '$harvestDate' }, 
          year: { $year: '$harvestDate' } 
        },
        totalYield: { $sum: '$yieldInKg' },
        totalRecords: { $sum: 1 }
      };
      sortStage = { '_id.year': 1, '_id.month': 1 };
    }

    const pipeline = [
      { $match: matchQuery },
      { $group: groupStage },
    ];

    if (groupBy === 'region') {
      pipeline.push(
        {
          $lookup: {
            from: 'regions',
            localField: '_id',
            foreignField: '_id',
            as: 'region'
          }
        },
        { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
        { 
          $project: {
            regionName: '$region.name',
            totalYield: 1,
            totalRecords: 1
          }
        },
        { $sort: { totalYield: -1 } }
      );
    } else {
      pipeline.push({ $sort: sortStage });
    }

    const stats = await HarvestRecord.aggregate(pipeline);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy số lượng thông báo/badge cho Sidebar Menu
// @route   GET /api/statistics/badges
// @access  Private (Admin & Farmer)
export const getDashboardBadges = async (req, res) => {
  try {
    const role = req.user.role;
    let badges = {};

    if (role === 'admin') {
      const landRequests = await LandRequest.countDocuments({ status: 'pending' });
      const complaints = await Complaint.countDocuments({ status: 'pending' });
      const farms = await Farm.countDocuments({ approvalStatus: 'pending' });
      const products = await Product.countDocuments({ status: 'pending' });
      
      badges = { landRequests, complaints, farms, products };
    } else if (role === 'farmer') {
      const lastViewedNews = req.query.lastViewedNews;
      const query = { isActive: true };
      
      // Nếu có truyền lastViewedNews, đếm những bài đăng mới hơn thời điểm đó
      if (lastViewedNews && lastViewedNews !== 'null') {
        query.createdAt = { $gt: new Date(lastViewedNews) };
      }
      
      const news = await Policy.countDocuments(query);
      badges = { news };
    }

    res.json(badges);
  } catch (error) {
    console.error('Lỗi khi lấy badges:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy badges' });
  }
};
