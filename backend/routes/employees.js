const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireEmployee } = require('../middleware/auth');

// GET /api/employees - Get all employees (Manager or Admin)
router.get('/', verifyToken, requireEmployee, async (req, res) => {
  try {
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
    }
    const query = 'SELECT * FROM employee_auth ORDER BY employee_name';
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
});

module.exports = router;

// Self profile routes
// GET /api/employees/me - Get current employee profile
router.get('/me', verifyToken, requireEmployee, async (req, res) => {
  try {
    const query = 'SELECT employee_id, employee_name, email, phone_number, branch_id, role, profile_picture_url, status, gender FROM employee_auth WHERE employee_id = $1';
    const result = await db.query(query, [req.user.employee_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get self profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// PUT /api/employees/me - Update current employee profile (limited fields)
router.put('/me', verifyToken, requireEmployee, async (req, res) => {
  try {
    const { employee_name, phone_number, profile_picture_url } = req.body;
    const query = `
      UPDATE employee_auth
      SET employee_name = COALESCE($2, employee_name),
          phone_number = COALESCE($3, phone_number),
          profile_picture_url = COALESCE($4, profile_picture_url)
      WHERE employee_id = $1
      RETURNING employee_id, employee_name, email, phone_number, branch_id, role, profile_picture_url, status, gender
    `;
    const result = await db.query(query, [req.user.employee_id, employee_name, phone_number, profile_picture_url]);
    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update self profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});
