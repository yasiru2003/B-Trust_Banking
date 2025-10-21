const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const DashboardService = require('../services/dashboardService');

// GET /api/dashboard - Optimized dashboard data
router.get('/', verifyToken, cacheMiddleware(300), async (req, res) => {
  try {
    const { userType, user } = req;
    
    // Get dashboard data in parallel
    const [dashboardData, recentTransactions, chartData] = await Promise.all([
      DashboardService.getDashboardData(userType, user),
      DashboardService.getRecentTransactions(userType, user, 10),
      DashboardService.getChartData(userType, user, 30)
    ]);

    res.json({
      success: true,
      data: {
        stats: dashboardData,
        recentTransactions,
        chartData
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// GET /api/dashboard/stats - Just stats (cached for 5 minutes)
router.get('/stats', verifyToken, cacheMiddleware(300), async (req, res) => {
  try {
    const { userType, user } = req;
    const stats = await DashboardService.getDashboardData(userType, user);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
});

// GET /api/dashboard/transactions - Recent transactions (cached for 2 minutes)
router.get('/transactions', verifyToken, cacheMiddleware(120), async (req, res) => {
  try {
    const { userType, user } = req;
    const limit = parseInt(req.query.limit) || 10;
    const transactions = await DashboardService.getRecentTransactions(userType, user, limit);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Dashboard transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent transactions'
    });
  }
});

// GET /api/dashboard/chart - Chart data (cached for 10 minutes)
router.get('/chart', verifyToken, cacheMiddleware(600), async (req, res) => {
  try {
    const { userType, user } = req;
    const days = parseInt(req.query.days) || 30;
    const chartData = await DashboardService.getChartData(userType, user, days);
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Dashboard chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data'
    });
  }
});

module.exports = router;


