const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireEmployee } = require('../middleware/auth');

// GET /api/branches - Get all branches
router.get('/', verifyToken, requireEmployee, async (req, res) => {
  try {
    const query = 'SELECT * FROM branch ORDER BY name';
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches'
    });
  }
});

// GET /api/branches/stats - Get branch statistics
router.get('/stats', verifyToken, requireEmployee, async (req, res) => {
  try {
    // Only Admin can access branch stats
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const query = `
      SELECT
        COUNT(*) as total_branches,
        COUNT(CASE WHEN b.branch_id IN (
          SELECT DISTINCT branch_id FROM employee_auth WHERE status = true
        ) THEN 1 END) as active_branches,
        COUNT(CASE WHEN b.branch_id IN (
          SELECT DISTINCT branch_id FROM customer
        ) THEN 1 END) as branches_with_customers,
        COUNT(CASE WHEN b.branch_id IN (
          SELECT DISTINCT branch_id FROM account
        ) THEN 1 END) as branches_with_accounts
      FROM branch b
    `;

    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get branch stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch statistics'
    });
  }
});

module.exports = router;
