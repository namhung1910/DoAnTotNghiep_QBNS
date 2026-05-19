import Farm from '../models/Farm.js';
import HarvestRecord from '../models/HarvestRecord.js';
import LandRequest from '../models/LandRequest.js';
import Product from '../models/Product.js';
import Region from '../models/Region.js';
import User from '../models/User.js';
import { calcActualStock } from '../utils/stockUtils.js';

/**
 * Lấy ngữ cảnh công khai cho chatbot (role: public).
 * Bao gồm danh sách sản phẩm nổi bật kèm thông tin người bán và tồn kho thực tế.
 * Lưu ý: KHÔNG tiết lộ chi tiết điều chỉnh kho nội bộ (stockAdjustment) cho public.
 */
export const fetchPublicContext = async () => {
    try {
        // Lấy sản phẩm approved, populate người bán và thửa đất để tính tồn kho
        const activeProducts = await Product.find({ status: 'approved' })
            .select('productName price unit certification description soldQuantity farmIds farmerId')
            .populate('farmerId', 'fullName phone address')
            .populate('farmIds', 'cumulativeYieldKg stockAdjustment soldOutsideKg name')
            .sort({ viewCount: -1 })
            .limit(10)
            .lean();

        // Enrich: tính actualStock, gom thông tin người bán
        // CHỈ cung cấp actualStock — KHÔNG tiết lộ stockAdjustment (hao hụt nội bộ) cho public
        // TODO scalability: chuyển sang $aggregate pipeline khi quy mô lớn hơn
        const enrichedProducts = activeProducts.map(p => ({
            productName:   p.productName,
            price:         p.price,
            unit:          p.unit,
            certification: p.certification,
            description:   p.description,
            // Tính tồn kho tổng hợp từ tất cả thửa trong farmIds
            actualStock:   Math.max(0,
                (p.farmIds || []).reduce((sum, f) => sum + calcActualStock(f, 0), 0)
                - (p.soldQuantity || 0)
            ),
            sellerName:    p.farmerId?.fullName   || 'HTX Nông sản',
            sellerPhone:   p.farmerId?.phone      || 'Liên hệ HTX',
            sellerAddress: p.farmerId?.address    || 'Kiến Xương, Thái Bình',
        }));

        const totalFarmers = await User.countDocuments({ role: 'farmer', isActive: true });

        const farmsAgg = await Farm.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, totalArea: { $sum: '$area' } } }
        ]);
        const totalFarmArea = farmsAgg[0]?.totalArea || 0;

        return {
            activeProducts: enrichedProducts,
            systemSummary: {
                totalFarmers,
                totalFarmArea
            }
        };
    } catch (error) {
        console.error("fetchPublicContext error:", error);
        return null;
    }
};

/**
 * Lấy ngữ cảnh của nông dân đang đăng nhập (role: farmer).
 * Bao gồm tồn kho chi tiết từng thửa đất, cảnh báo cần đăng bán,
 * lịch sử thu hoạch, và tổng quan sản lượng.
 *
 * Giới hạn 5 thửa đang canh tác/vừa thu hoạch để tránh nhiễu token.
 */
export const fetchFarmerContext = async (userId) => {
    try {
        // Chỉ lấy các thửa đang canh tác hoặc vừa thu hoạch — thửa planning/cancelled không cần cung cấp cho chatbot
        const RELEVANT_STATUSES = ['planting', 'growing', 'harvesting', 'harvested'];

        const myFarms = await Farm.find({
            ownerId: userId,
            isActive: true,
            status: { $in: RELEVANT_STATUSES }
        })
            .select('name cropType area status expectedHarvestDate expectedYield plantingDate cumulativeYieldKg stockAdjustment soldOutsideKg')
            .sort({ updatedAt: -1 })
            .limit(5) // Giới hạn 5 thửa gần nhất để tiết kiệm token
            .lean();

        // FIX BUG: field 'quantity' không tồn tại trong Product schema
        // Sử dụng 'soldQuantity' (số kg đã bán qua hệ thống) — đúng với schema
        const myProducts = await Product.find({ farmerId: userId })
            .select('productName price soldQuantity certification status viewCount farmIds')
            .populate('farmIds', 'cumulativeYieldKg stockAdjustment soldOutsideKg name _id')
            .limit(10)
            .lean();

        // Map farmId → product để tra cứu nhanh O(1) — mỗi farm trong farmIds đều được map
        const productByFarmId = {};
        for (const p of myProducts) {
            for (const f of (p.farmIds || [])) {
                const fid = f._id ? f._id.toString() : f.toString();
                productByFarmId[fid] = p;
            }
        }

        // Enrich farms: tồn kho thực theo từng thửa + cảnh báo cần đăng bán
        const enrichedFarms = myFarms.map(f => {
            const linkedProduct = productByFarmId[f._id.toString()];
            const actualStock   = calcActualStock(f, linkedProduct?.soldQuantity || 0);
            // Cảnh báo: thửa đã thu hoạch nhưng chưa có sản phẩm approved/pending → cần đăng bán
            const needsListing  = f.status === 'harvested' &&
                                  (!linkedProduct || !['approved', 'pending'].includes(linkedProduct?.status));
            return {
                ...f,
                actualStock,
                needsListing,
                linkedProductStatus: linkedProduct?.status      || null,
                linkedProductName:   linkedProduct?.productName || null,
            };
        });

        // Tổng tồn kho toàn bộ (tổng hợp từ tất cả thửa đang theo dõi)
        const totalStockKg = enrichedFarms.reduce((sum, f) => sum + f.actualStock, 0);

        // Lịch sử thu hoạch gần đây — giữ nguyên logic cũ
        const myHarvests = await HarvestRecord.find({ ownerId: userId })
            .select('cropType yieldInKg harvestDate quarter')
            .sort({ harvestDate: -1 })
            .limit(10)
            .lean();

        // Tổng sản lượng tích lũy toàn bộ (dùng aggregate trên Farm)
        const totalYieldAgg = await Farm.aggregate([
            { $match: { ownerId: userId, isActive: true } },
            { $group: { _id: null, totalYield: { $sum: '$cumulativeYieldKg' } } }
        ]);
        const totalYieldKg = totalYieldAgg[0]?.totalYield || 0;

        return {
            myFarms: enrichedFarms,
            myHarvests,
            myProducts,
            summary: {
                totalFarms:        myFarms.length,
                activeCultivation: myFarms.filter(f => ['planting', 'growing'].includes(f.status)).length,
                totalYieldKg,
                totalStockKg, // mới: tổng tồn kho ước tính từ tất cả thửa đang theo dõi
            }
        };
    } catch (error) {
        console.error("fetchFarmerContext error:", error);
        return null;
    }
};

/**
 * Lấy ngữ cảnh toàn hệ thống cho Admin (role: admin).
 * Bao gồm: tổng quan, cơ cấu cây trồng, thống kê theo vùng,
 * sản phẩm/đất chờ duyệt chi tiết, và cảnh báo hoạt động.
 */
export const fetchAdminContext = async () => {
    try {
        // ── Tổng quan hệ thống ──────────────────────────────────────
        const totalFarmers = await User.countDocuments({ role: 'farmer', isActive: true });
        const totalFarms   = await Farm.countDocuments({ isActive: true });

        const farmsAgg = await Farm.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, totalArea: { $sum: '$area' }, totalYield: { $sum: '$cumulativeYieldKg' } } }
        ]);

        const farmsByStatusAgg = await Farm.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const farmsByStatus = farmsByStatusAgg.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

        // ── Cơ cấu cây trồng toàn HTX (groupBy cropType) ────────────
        // Logic giống statisticsController.getOverviewStatistics (farmsByCrop) nhưng dùng cho RAG
        const cropBreakdown = await Farm.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id:        '$cropType',
                    farmCount:  { $sum: 1 },
                    totalArea:  { $sum: '$area' },
                    totalYield: { $sum: '$cumulativeYieldKg' }
                }
            },
            { $sort: { totalArea: -1 } }
        ]);

        // ── Thống kê theo vùng quy hoạch ────────────────────────────
        // Logic giống statisticsController.getStatisticsByRegion nhưng dùng cho RAG
        const regionStats = await Farm.aggregate([
            { $match: { isActive: true } },
            {
                $lookup: {
                    from:         'regions',
                    localField:   'regionId',
                    foreignField: '_id',
                    as:           'region'
                }
            },
            { $unwind: { path: '$region', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id:        '$regionId',
                    regionName: { $first: '$region.name' },
                    zoneCode:   { $first: '$region.zoneCode' },
                    zoneType:   { $first: '$region.zoneType' },
                    farmCount:  { $sum: 1 },
                    totalArea:  { $sum: '$area' },
                    totalYield: { $sum: '$cumulativeYieldKg' },
                    crops:      { $addToSet: '$cropType' }
                }
            },
            { $sort: { totalYield: -1 } }
        ]);

        // ── Sản phẩm chờ duyệt chi tiết (tối đa 5) ─────────────────
        // Trước đây chỉ là count — nay lấy đủ tên + nông dân để Dewy có thể nhắc admin
        const pendingProductDetails = await Product.find({ status: 'pending' })
            .select('productName price unit certification farmerId createdAt')
            .populate('farmerId', 'fullName')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // ── Yêu cầu cấp đất chờ xử lý (tối đa 5) ───────────────────
        const pendingLandRequests = await LandRequest.find({ status: 'pending' })
            .select('purpose cropType requestedArea user createdAt')
            .populate('user', 'fullName phone')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // ── Cảnh báo hoạt động ───────────────────────────────────────
        // (a) Thửa đã thu hoạch nhưng chưa nhập sản lượng → cần nhắc nông dân
        const missingYieldFarms = await Farm.find({
            isActive: true,
            status:   'harvested',
            $or: [{ yieldInKg: 0 }, { yieldInKg: null }]
        })
            .select('name ownerId actualHarvestDate')
            .populate('ownerId', 'fullName')
            .limit(5)
            .lean();

        // (b) Cảnh báo thu hoạch — 2 trường hợp:
        //   - Đang ở status 'harvesting': thu hoạch rồi, luôn hiển thị (không check ngày)
        //   - Đang ở status 'growing' + có expectedHarvestDate trong 7 ngày tới: sắp thu hoạch
        // Lưu ý: expectedHarvestDate là trường nông dân nhập thủ công, KHÔNG tự dự đoán
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const upcomingHarvests = await Farm.find({
            isActive: true,
            $or: [
                { status: 'harvesting' },
                { status: 'growing', expectedHarvestDate: { $lte: sevenDaysLater, $gte: new Date() } }
            ]
        })
            .select('name cropType expectedHarvestDate expectedYield ownerId')
            .populate('ownerId', 'fullName')
            .sort({ expectedHarvestDate: 1 })
            .limit(5)
            .lean();

        return {
            systemStats: {
                totalFarmers,
                totalFarms,
                totalArea:   farmsAgg[0]?.totalArea  || 0,
                totalYieldKg: farmsAgg[0]?.totalYield || 0
            },
            farmsByStatus,
            cropBreakdown,
            regionStats,
            pendingProductDetails,
            pendingLandRequests,
            alerts: {
                missingYieldFarms,
                upcomingHarvests
            }
        };
    } catch (error) {
        console.error("fetchAdminContext error:", error);
        return null;
    }
};
