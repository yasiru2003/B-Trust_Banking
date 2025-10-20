const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

// Admin dashboard - global overview
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM branch) as total_branches,
        (SELECT COUNT(*) FROM employee_auth WHERE role = 'Agent') as total_agents,
        (SELECT COUNT(*) FROM employee_auth WHERE role = 'Manager') as total_managers,
        (SELECT COUNT(*) FROM customer) as total_customers,
        (SELECT COUNT(*) FROM account) as total_accounts,
        (SELECT COALESCE(SUM(current_balance),0) FROM account) as total_balance,
        (SELECT COUNT(*) FROM transaction) as total_transactions
    `;
    const stats = (await db.query(statsQuery)).rows[0];
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard' });
  }
});

// GET /api/admin/dashboard/stats - Unified dashboard statistics endpoint
router.get('/dashboard/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Run all queries in parallel for better performance
    const [customersResult, accountsResult, transactionsResult, balanceResult] = await Promise.all([
      // Customer statistics - using customer_id as proxy since no created_at column
      db.query(`
        SELECT
          COUNT(*) as total,
          0 as new_this_month
        FROM customer
      `),
      // Account statistics
      db.query(`
        SELECT
          COUNT(CASE WHEN status = true THEN 1 END) as active,
          COUNT(CASE WHEN status = true AND opening_date >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_this_month
        FROM account
      `),
      // Transaction statistics - using date column
      db.query(`
        SELECT
          COUNT(CASE WHEN status = true THEN 1 END) as total,
          COUNT(CASE WHEN status = true AND date >= date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month,
          COALESCE(SUM(CASE WHEN status = true THEN amount ELSE 0 END), 0) as total_value
        FROM transaction
      `),
      // Total balance across all active accounts
      db.query(`
        SELECT
          COALESCE(SUM(current_balance), 0) as total
        FROM account
        WHERE status = true
      `)
    ]);

    const data = {
      customers: {
        total: parseInt(customersResult.rows[0].total) || 0,
        newThisMonth: parseInt(customersResult.rows[0].new_this_month) || 0
      },
      accounts: {
        active: parseInt(accountsResult.rows[0].active) || 0,
        newThisMonth: parseInt(accountsResult.rows[0].new_this_month) || 0
      },
      transactions: {
        total: parseInt(transactionsResult.rows[0].total) || 0,
        thisMonth: parseInt(transactionsResult.rows[0].this_month) || 0,
        totalValue: parseFloat(transactionsResult.rows[0].total_value) || 0
      },
      balance: {
        total: parseFloat(balanceResult.rows[0].total) || 0
      }
    };

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// GET /api/admin/dashboard/recent-activity - Recent system activities
router.get('/dashboard/recent-activity', verifyToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Fetch recent activities - simplified to avoid errors
    const activitiesQuery = `
      SELECT
        'transaction_processed' as type,
        CONCAT('Transaction of $', CAST(amount AS TEXT), ' - ', COALESCE(tt.type_name, 'Transaction')) as description,
        t.date::timestamp as timestamp,
        CAST(t.transaction_id AS TEXT) as ref_id
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      WHERE t.status = true
      ORDER BY t.date DESC
      LIMIT $1
    `;

    const result = await db.query(activitiesQuery, [limit]);

    // Format activities with proper structure
    const activities = result.rows.map(activity => ({
      id: activity.ref_id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      metadata: {
        ref_id: activity.ref_id
      }
    }));

    res.json({
      success: true,
      activities
    });
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities'
    });
  }
});

// Global lists
router.get('/customers', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      ORDER BY c.customer_id DESC LIMIT 200
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Admin customers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

router.get('/accounts', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, at.type_name as account_type, b.name as branch_name,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      ORDER BY a.opening_date DESC LIMIT 200
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Admin accounts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch accounts' });
  }
});

router.get('/transactions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, tt.type_name, a.customer_id, CONCAT(c.first_name,' ',c.last_name) as customer_name,
             e.employee_name as agent_name, b.name as branch_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      ORDER BY t.date DESC LIMIT 200
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Admin transactions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// Create a new branch
router.post('/branches', verifyToken, requireAdmin, async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      district: Joi.string().allow('', null),
      town: Joi.string().allow('', null),
      phone_number: Joi.string().allow('', null)
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
    }
    const insert = `
      INSERT INTO branch (name, district, town, phone_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(insert, [value.name, value.district, value.town, value.phone_number]);
    res.status(201).json({ success: true, message: 'Branch created', data: result.rows[0] });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ success: false, message: 'Failed to create branch' });
  }
});

// Create a new employee (Agent or Manager or Admin)
router.post('/employees', verifyToken, requireAdmin, async (req, res) => {
  try {
    const schema = Joi.object({
      employee_id: Joi.string().max(20).required(),
      employee_name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      phone_number: Joi.string().allow('', null),
      role: Joi.string().valid('Agent', 'Manager', 'Admin').required(),
      branch_id: Joi.number().integer().required(),
      password: Joi.string().min(6).required()
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
    }
    const hash = await bcrypt.hash(value.password, parseInt(process.env.BCRYPT_ROUNDS || '12', 10));
    const insert = `
      INSERT INTO employee_auth (employee_id, branch_id, role, employee_name, password_hash, phone_number, email, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (employee_id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        role = EXCLUDED.role,
        employee_name = EXCLUDED.employee_name,
        password_hash = EXCLUDED.password_hash,
        phone_number = EXCLUDED.phone_number,
        email = EXCLUDED.email,
        status = true
      RETURNING employee_id, employee_name, email, phone_number, role, branch_id, status
    `;
    const result = await db.query(insert, [
      value.employee_id.trim(),
      value.branch_id,
      value.role,
      value.employee_name,
      hash,
      value.phone_number,
      value.email
    ]);
    res.status(201).json({ success: true, message: 'Employee upserted', data: result.rows[0] });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
});

// GET /api/admin/fraud-alerts - Get fraud alerts for admin dashboard
router.get('/fraud-alerts', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, status, severity } = req.query;
    
    // Build the query with optional filters
    let query = `
      SELECT 
        fa.alert_id,
        fa.transaction_id,
        fa.customer_id,
        fa.account_number,
        fa.rule_id,
        fa.severity,
        fa.fraud_score,
        fa.status,
        fa.description,
        fa.detected_at,
        fa.resolved_at,
        fa.resolved_by,
        fa.resolution_notes,
        fa.metadata,
        c.first_name || ' ' || c.last_name as customer_name,
        a.current_balance,
        t.amount,
        tt.type_name as transaction_type
      FROM fraud_alerts fa
      LEFT JOIN customer c ON fa.customer_id = c.customer_id
      LEFT JOIN account a ON fa.account_number = a.account_number
      LEFT JOIN transaction t ON fa.transaction_id = t.transaction_id
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add status filter if provided
    if (status) {
      query += ` AND fa.status = $${++paramCount}`;
      params.push(status);
    }
    
    // Add severity filter if provided
    if (severity) {
      query += ` AND fa.severity = $${++paramCount}`;
      params.push(severity);
    }
    
    // Order by detected_at descending and limit results
    query += ` ORDER BY fa.detected_at DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    // Format the response
    const alerts = result.rows.map(alert => ({
      alert_id: alert.alert_id,
      transaction_id: alert.transaction_id,
      customer_id: alert.customer_id,
      account_number: alert.account_number,
      rule_id: alert.rule_id,
      severity: alert.severity,
      fraud_score: parseFloat(alert.fraud_score),
      status: alert.status,
      description: alert.description,
      detected_at: alert.detected_at,
      resolved_at: alert.resolved_at,
      resolved_by: alert.resolved_by,
      resolution_notes: alert.resolution_notes,
      metadata: alert.metadata,
      customer_name: alert.customer_name,
      amount: alert.amount ? parseFloat(alert.amount) : null,
      transaction_type: alert.transaction_type
    }));

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get fraud alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fraud alerts'
    });
  }
});

module.exports = router;


