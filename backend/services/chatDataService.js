import Farm from '../models/Farm.js';
import HarvestRecord from '../models/HarvestRecord.js';
import Product from '../models/Product.js';
import Region from '../models/Region.js';
import User from '../models/User.js';

export const fetchPublicContext = async () => {
    try {
        const activeProducts = await Product.find({ status: 'approved' })
            .select('productName price unit certification description')
            .sort({ viewCount: -1 })
            .limit(10)
            .lean();

        const totalFarmers = await User.countDocuments({ role: 'farmer', isActive: true });

        const farmsAgg = await Farm.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, totalArea: { $sum: '$area' } } }
        ]);
        const totalFarmArea = farmsAgg[0]?.totalArea || 0;

        return {
            activeProducts,
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

export const fetchFarmerContext = async (userId) => {
    try {
        const myFarms = await Farm.find({ ownerId: userId, isActive: true })
            .select('name cropType area status expectedHarvestDate expectedYield yieldInKg')
            .limit(10)
            .lean();

        const myHarvests = await HarvestRecord.find({ ownerId: userId })
            .select('cropType yieldInKg harvestDate season')
            .sort({ harvestDate: -1 })
            .limit(10)
            .lean();

        const myProducts = await Product.find({ farmerId: userId })
            .select('productName price quantity certification status viewCount')
            .limit(10)
            .lean();

        const totalYieldAgg = await Farm.aggregate([
            { $match: { ownerId: userId, isActive: true } },
            { $group: { _id: null, totalYield: { $sum: '$cumulativeYieldKg' } } }
        ]);
        const totalYieldKg = totalYieldAgg[0]?.totalYield || 0;

        return {
            myFarms,
            myHarvests,
            myProducts,
            summary: {
                totalFarms: myFarms.length,
                activeCultivation: myFarms.filter(f => ['planting', 'growing'].includes(f.status)).length,
                totalYieldKg
            }
        };
    } catch (error) {
        console.error("fetchFarmerContext error:", error);
        return null;
    }
};

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
