const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/otp - Get OTP records
router.get('/', verifyToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM "otp"."OtpToken" ORDER BY created_at DESC';
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get OTP records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch OTP records'
    });
  }
});

module.exports = router;
