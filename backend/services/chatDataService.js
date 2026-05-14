import Farm from '../models/Farm.js';
import HarvestRecord from '../models/HarvestRecord.js';
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
            .select('productName price unit certification description soldQuantity farmId farmerId')
            .populate('farmerId', 'fullName phone address')
            .populate('farmId', 'cumulativeYieldKg stockAdjustment soldOutsideKg name')
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
            actualStock:   calcActualStock(p.farmId, p.soldQuantity),
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
            .select('productName price soldQuantity certification status viewCount farmId')
            .populate('farmId', 'cumulativeYieldKg stockAdjustment soldOutsideKg name _id')
            .limit(10)
            .lean();

        // Map farmId → product để tra cứu nhanh O(1) thay vì O(n²)
        const productByFarmId = {};
        for (const p of myProducts) {
            if (p.farmId?._id) {
                productByFarmId[p.farmId._id.toString()] = p;
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
            .select('cropType yieldInKg harvestDate season')
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
 */
export const fetchAdminContext = async () => {
    try {
        const totalFarmers = await User.countDocuments({ role: 'farmer', isActive: true });
        const totalFarms = await Farm.countDocuments({ isActive: true });

        const farmsAgg = await Farm.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, totalArea: { $sum: '$area' }, totalYield: { $sum: '$cumulativeYieldKg' } } }
        ]);

        const farmsByStatus = await Farm.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const pendingProducts = await Product.countDocuments({ status: 'pending' });

        return {
            systemStats: {
                totalFarmers,
                totalFarms,
                totalArea: farmsAgg[0]?.totalArea || 0,
                totalYieldKg: farmsAgg[0]?.totalYield || 0
            },
            farmsByStatus: farmsByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            pendingItems: {
                products: pendingProducts
            }
        };
    } catch (error) {
        console.error("fetchAdminContext error:", error);
        return null;
    }
};
