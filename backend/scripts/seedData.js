import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load env
dotenv.config();

// Import models
import User from '../models/User.js';
import Region from '../models/Region.js';
import Farm from '../models/Farm.js';
import Product from '../models/Product.js';
import CropType from '../models/CropType.js';
import Policy from '../models/Policy.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuangBaNongSanDB';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Region.deleteMany({});
    await Farm.deleteMany({});
    await Product.deleteMany({});
    await CropType.deleteMany({});
    await Policy.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create users - KHÔNG hash password ở đây, model sẽ tự hash
    const admin = await User.create({
      username: 'admin_htx',
      password: '123456',  // Model sẽ tự động hash
      fullName: 'Hợp Tác Xã Kiến Xương',
      role: 'admin',
      phone: '0912345678',
      address: 'Kiến Xương, Thái Bình'
    });

    const farmer1 = await User.create({
      username: 'nongdan_hung',
      password: '123456',  // Model sẽ tự động hash
      fullName: 'Nguyễn Nam Hưng',
      role: 'farmer',
      phone: '0987654321',
      address: 'Xã Lê Lợi, Kiến Xương'
    });

    const farmer2 = await User.create({
      username: 'nongdan_lan',
      password: '123456',  // Model sẽ tự động hash
      fullName: 'Trần Thị Lan',
      role: 'farmer',
      phone: '0976543210',
      address: 'Xã Quốc Tuấn, Kiến Xương'
    });

    console.log('👥 Created users');

    // Create crop types
    const cropTypes = await CropType.insertMany([
      {
        name: 'Lúa chất lượng cao',
        category: 'Lương thực',
        description: 'Lúa được trồng theo tiêu chuẩn VietGAP',
        growthDuration: 120,
        suitableSoil: ['Phù sa', 'Đất thịt'],
        suitableSeason: ['Đông Xuân', 'Hè Thu'],
        averageYield: 6500,
        icon: '🌾'
      },
      {
        name: 'Rau muống',
        category: 'Rau củ',
        description: 'Rau muống xanh, giòn, sạch',
        growthDuration: 30,
        suitableSoil: ['Phù sa', 'Đất ẩm'],
        suitableSeason: ['Quanh năm'],
        averageYield: 20000,
        icon: '🥬'
      },
      {
        name: 'Cà chua',
        category: 'Rau củ',
        description: 'Cà chua bi và cà chua thường',
        growthDuration: 75,
        suitableSoil: ['Đất thịt', 'Đất pha cát'],
        suitableSeason: ['Thu Đông', 'Xuân'],
        averageYield: 35000,
        icon: '🍅'
      },
      {
        name: 'Dưa hấu',
        category: 'Trái cây',
        description: 'Dưa hấu đỏ, ngọt mát',
        growthDuration: 80,
        suitableSoil: ['Đất cát pha', 'Đất phù sa'],
        suitableSeason: ['Hè'],
        averageYield: 30000,
        icon: '🍉'
      }
    ]);
    console.log('🌱 Created crop types');

    // Create regions
    const region1 = await Region.create({
      name: 'Vùng quy hoạch lúa Kiến Xương',
      description: 'Vùng quy hoạch trồng lúa chất lượng cao theo tiêu chuẩn VietGAP',
      soilType: 'Phù sa',
      plannedCrops: ['Lúa chất lượng cao', 'Rau muống'],
      totalArea: 500000,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [106.38, 20.40],
          [106.42, 20.40],
          [106.42, 20.43],
          [106.38, 20.43],
          [106.38, 20.40]
        ]]
      },
      createdBy: admin._id
    });

    const region2 = await Region.create({
      name: 'Vùng quy hoạch rau màu',
      description: 'Vùng chuyên canh rau củ quả an toàn',
      soilType: 'Đất thịt',
      plannedCrops: ['Rau muống', 'Cà chua', 'Dưa hấu'],
      totalArea: 200000,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [106.35, 20.42],
          [106.38, 20.42],
          [106.38, 20.45],
          [106.35, 20.45],
          [106.35, 20.42]
        ]]
      },
      createdBy: admin._id
    });
    console.log('🗺️ Created regions');

    // Create farms
    const farm1 = await Farm.create({
      ownerId: farmer1._id,
      regionId: region1._id,
      name: 'Thửa đất số 1 - Hưng',
      cropType: 'Lúa chất lượng cao',
      area: 5000,
      status: 'growing',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [106.398, 20.412],
          [106.402, 20.412],
          [106.402, 20.415],
          [106.398, 20.415],
          [106.398, 20.412]
        ]]
      },
      planningData: 'Vùng quy hoạch nông nghiệp bền vững 2025',
      plantingDate: new Date('2024-11-01'),
      expectedHarvestDate: new Date('2025-03-01')
    });

    const farm2 = await Farm.create({
      ownerId: farmer1._id,
      regionId: region1._id,
      name: 'Thửa đất số 2 - Hưng',
      cropType: 'Lúa chất lượng cao',
      area: 3000,
      status: 'harvesting',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [106.403, 20.412],
          [106.407, 20.412],
          [106.407, 20.415],
          [106.403, 20.415],
          [106.403, 20.412]
        ]]
      },
      planningData: 'Vùng quy hoạch nông nghiệp bền vững 2025',
      plantingDate: new Date('2024-09-01'),
      expectedHarvestDate: new Date('2025-01-01')
    });

    const farm3 = await Farm.create({
      ownerId: farmer2._id,
      regionId: region2._id,
      name: 'Thửa rau màu - Lan',
      cropType: 'Rau muống',
      area: 2000,
      status: 'growing',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [106.358, 20.432],
          [106.362, 20.432],
          [106.362, 20.435],
          [106.358, 20.435],
          [106.358, 20.432]
        ]]
      },
      planningData: 'Vùng rau sạch an toàn',
      plantingDate: new Date('2024-12-01'),
      expectedHarvestDate: new Date('2025-01-01')
    });
    console.log('🌾 Created farms');

    // Create products
    const products = await Product.insertMany([
      {
        farmId: farm1._id,
        farmerId: farmer1._id,
        productName: 'Gạo tám thơm Kiến Xương',
        category: 'Lương thực',
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'],
        price: 25000,
        unit: 'kg',
        quantity: 1000,
        description: 'Gạo sạch được canh tác theo tiêu chuẩn VietGAP, hạt gạo trắng, thơm ngon, dẻo cơm.',
        certification: 'VietGAP',
        productionProcess: 'Canh tác theo quy trình VietGAP, không sử dụng thuốc bảo vệ thực vật trong 30 ngày trước thu hoạch.',
        harvestDate: new Date('2025-01-15'),
        status: 'approved'
      },
      {
        farmId: farm2._id,
        farmerId: farmer1._id,
        productName: 'Gạo nếp cái hoa vàng',
        category: 'Lương thực',
        images: ['https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=500'],
        price: 35000,
        unit: 'kg',
        quantity: 500,
        description: 'Gạo nếp thơm, dẻo, thích hợp làm bánh chưng, xôi.',
        certification: 'VietGAP',
        status: 'approved'
      },
      {
        farmId: farm3._id,
        farmerId: farmer2._id,
        productName: 'Rau muống sạch',
        category: 'Rau củ',
        images: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500'],
        price: 15000,
        unit: 'bó',
        quantity: 100,
        description: 'Rau muống tươi xanh, được trồng theo phương pháp hữu cơ.',
        certification: 'Organic',
        status: 'approved'
      },
      {
        farmId: farm1._id,
        farmerId: farmer1._id,
        productName: 'Gạo ST25 hữu cơ',
        category: 'Lương thực',
        images: ['https://images.unsplash.com/photo-1594997762972-55a2c4c2a4e5?w=500'],
        price: 45000,
        unit: 'kg',
        quantity: 300,
        description: 'Gạo ST25 đạt giải ngon nhất thế giới, trồng theo phương pháp hữu cơ.',
        certification: 'Organic',
        status: 'pending'
      }
    ]);
    console.log('📦 Created products');

    // Create policies
    await Policy.insertMany([
      {
        title: 'Chính sách hỗ trợ giống lúa chất lượng cao',
        category: 'Hỗ trợ',
        content: 'Hợp tác xã hỗ trợ 50% chi phí giống lúa chất lượng cao cho các hộ nông dân thành viên. Áp dụng cho các giống: BC15, Đài Thơm 8, ST25.',
        effectiveDate: new Date('2024-01-01'),
        createdBy: admin._id
      },
      {
        title: 'Quy định về tiêu chuẩn VietGAP',
        category: 'Quy định',
        content: 'Tất cả sản phẩm đăng bán trên hệ thống phải đạt tiêu chuẩn VietGAP hoặc tương đương. Hồ sơ chứng nhận cần được cập nhật hàng năm.',
        effectiveDate: new Date('2024-01-01'),
        createdBy: admin._id
      },
      {
        title: 'Chương trình bảo hiểm mùa vụ',
        category: 'Bảo hiểm',
        content: 'Nhà nước hỗ trợ 90% phí bảo hiểm nông nghiệp cho cây lúa. Nông dân chỉ đóng 10% phí bảo hiểm.',
        effectiveDate: new Date('2024-06-01'),
        createdBy: admin._id
      }
    ]);
    console.log('📜 Created policies');

    console.log('\n✅ Seed data completed!');
    console.log('\n📝 Demo accounts:');
    console.log('   Admin: admin_htx / 123456');
    console.log('   Farmer 1: nongdan_hung / 123456');
    console.log('   Farmer 2: nongdan_lan / 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
