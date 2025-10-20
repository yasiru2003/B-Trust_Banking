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

// GET /api/employees/stats - Get employee statistics
router.get('/stats', verifyToken, requireEmployee, async (req, res) => {
  try {
    // Role-based access control
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Manager or Admin access required' 
      });
    }

    let query = `
      SELECT
        COUNT(*) as total_employees,
        COUNT(CASE WHEN role = 'Agent' THEN 1 END) as total_agents,
        COUNT(CASE WHEN role = 'Manager' THEN 1 END) as total_managers,
        COUNT(CASE WHEN role = 'Admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN status = true THEN 1 END) as active_employees,
        COUNT(CASE WHEN status = false THEN 1 END) as inactive_employees
      FROM employee_auth
    `;

    const params = [];
    let paramCount = 0;

    // Manager can only see their branch employees
    if (req.user.role === 'Manager') {
      query += ` WHERE branch_id = $${++paramCount}`;
      params.push(req.user.branch_id);
    }

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee statistics'
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

// Manager/Admin: Freeze an agent (disable status)
router.put('/agents/:agentId/freeze', verifyToken, requireEmployee, async (req, res) => {
  try {
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
    }
    const branchId = req.user.branch_id;
    const { agentId } = req.params;

    const check = await db.query(
      `SELECT employee_id, status FROM employee_auth 
       WHERE LOWER(TRIM(employee_id)) = LOWER(TRIM($1)) 
         AND (${req.user.role === 'Admin' ? '1=1' : 'LOWER(TRIM(branch_id)) = LOWER(TRIM($2))'}) 
         AND role = 'Agent'`,
      req.user.role === 'Admin' ? [agentId] : [agentId, branchId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found or not in your branch' });
    }

    if (check.rows[0].status === false) {
      return res.status(400).json({ success: false, message: 'Agent is already frozen' });
    }

    await db.query(`UPDATE employee_auth SET status = false WHERE LOWER(TRIM(employee_id)) = LOWER(TRIM($1))`, [agentId]);

    res.json({ success: true, message: 'Agent frozen successfully' });
  } catch (error) {
    console.error('Freeze agent (employees) error:', error);
    res.status(500).json({ success: false, message: 'Failed to freeze agent' });
  }
});

// Manager/Admin: Unfreeze an agent (enable status)
router.put('/agents/:agentId/unfreeze', verifyToken, requireEmployee, async (req, res) => {
  try {
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
    }
    const branchId = req.user.branch_id;
    const { agentId } = req.params;

    const check = await db.query(
      `SELECT employee_id, status FROM employee_auth 
       WHERE LOWER(TRIM(employee_id)) = LOWER(TRIM($1)) 
         AND (${req.user.role === 'Admin' ? '1=1' : 'LOWER(TRIM(branch_id)) = LOWER(TRIM($2))'}) 
         AND role = 'Agent'`,
      req.user.role === 'Admin' ? [agentId] : [agentId, branchId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found or not in your branch' });
    }

    if (check.rows[0].status === true) {
      return res.status(400).json({ success: false, message: 'Agent is already active' });
    }

    await db.query(`UPDATE employee_auth SET status = true WHERE LOWER(TRIM(employee_id)) = LOWER(TRIM($1))`, [agentId]);

    res.json({ success: true, message: 'Agent unfrozen successfully' });
  } catch (error) {
    console.error('Unfreeze agent (employees) error:', error);
    res.status(500).json({ success: false, message: 'Failed to unfreeze agent' });
  }
});
