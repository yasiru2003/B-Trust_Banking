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

module.exports = router;
