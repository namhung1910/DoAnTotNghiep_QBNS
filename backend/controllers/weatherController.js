import { getWeatherData } from '../services/weatherService.js';

// @desc    Lấy dữ liệu thời tiết widget (chỉ farmer & admin)
// @route   GET /api/weather
// @access  Private (farmer, admin)
export const getWeather = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user._id;

        const { weatherWidget } = await getWeatherData(role, userId);
        res.json(weatherWidget);
    } catch (error) {
        console.error('[weatherController] getWeather error:', error);
        res.status(500).json({
            message: 'Không thể lấy dữ liệu thời tiết',
            error: error.message
        });
    }
};
