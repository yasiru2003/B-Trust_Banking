const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireEmployee, requireAgent, requireBranchAccess } = require('../middleware/auth');
const smsService = require('../services/smsService');
const Joi = require('joi');

// Validation schemas
const accountSchema = Joi.object({
  customer_id: Joi.string().required(),
  acc_type_id: Joi.string().required(),
  branch_id: Joi.number().integer().optional(),
  current_balance: Joi.number().min(0).optional()
});

// GET /api/accounts - Get all accounts
router.get('/', verifyToken, requireEmployee, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, at.type_name as account_type, b.name as branch_name,
             c.first_name, c.last_name, 
             CONCAT(c.first_name, ' ', c.last_name) as customer_name
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE 1=1
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Add agent-specific filtering
    if (req.user.role === 'Agent') {
      conditions.push(`TRIM(c.agent_id) = $${++paramCount}`);
      params.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      // Manager can see all accounts in their branch
      conditions.push(`a.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    // Add filters
    if (req.query.branch_id) {
      conditions.push(`a.branch_id = $${++paramCount}`);
      params.push(req.query.branch_id);
    }
    
    if (req.query.acc_type_id) {
      conditions.push(`a.acc_type_id = $${++paramCount}`);
      params.push(req.query.acc_type_id);
    }
    
    if (req.query.status !== undefined) {
      conditions.push(`a.status = $${++paramCount}`);
      params.push(req.query.status === 'true');
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ` ORDER BY a.opening_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, total: result.rows.length }
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts'
    });
  }
});

// GET /api/accounts/stats - Get account statistics
router.get('/stats', verifyToken, requireEmployee, async (req, res) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN a.status = true THEN 1 END) as active_accounts,
        COUNT(CASE WHEN a.status = false THEN 1 END) as inactive_accounts,
        SUM(a.current_balance) as total_balance,
        AVG(a.current_balance) as average_balance,
        COUNT(CASE WHEN a.opening_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_accounts_30d
      FROM account a
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON TRIM(c.agent_id) = TRIM(e.employee_id)
    `;

    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (req.user.role === 'Agent') {
      conditions.push(`TRIM(c.agent_id) = $${++paramCount}`);
      params.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      conditions.push(`a.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account statistics'
    });
  }
});

// GET /api/accounts/types - Get all account types
router.get('/types', verifyToken, requireEmployee, async (req, res) => {
  try {
    console.log('Fetching account types...');
    const result = await db.query('SELECT * FROM account_type ORDER BY type_name');
    console.log('Account types query result:', result.rows);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get account types error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account types',
      error: error.message
    });
  }
});

// GET /api/accounts/:accountNumber - Get account by number
router.get('/:accountNumber', verifyToken, requireEmployee, async (req, res) => {
  try {
    const query = `
      SELECT a.*, at.type_name as account_type, b.name as branch_name,
             c.first_name, c.last_name, c.phone_number, c.email
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE a.account_number = $1
    `;
    const result = await db.query(query, [req.params.accountNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account'
    });
  }
});

// POST /api/accounts - Create new account
router.post('/', verifyToken, requireAgent, async (req, res) => {
  let client;
  try {
    const { error, value } = accountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Start transaction
    client = await db.beginTransaction();

    // Check if customer exists and is assigned to this agent
    const customerCheck = await client.query(
      'SELECT customer_id FROM customer WHERE customer_id = $1 AND TRIM(agent_id) = $2',
      [value.customer_id.trim(), req.user.employee_id.trim()]
    );
    
    if (customerCheck.rows.length === 0) {
      await db.rollbackTransaction(client);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only create accounts for customers assigned to you.'
      });
    }

    // For agents, automatically set branch_id to their assigned branch
    if (req.user.role === 'Agent') {
      value.branch_id = req.user.branch_id;
    } else if (req.user.role === 'Manager' && !value.branch_id) {
      // For managers, default to their branch if not specified
      value.branch_id = req.user.branch_id;
    }

    // Check if customer already has an account of this type
    const existingAccount = await client.query(
      `SELECT account_number 
       FROM account
       WHERE customer_id = $1 AND acc_type_id = $2`,
      [value.customer_id.trim(), value.acc_type_id]
    );
    
    if (existingAccount.rows.length > 0) {
      await db.rollbackTransaction(client);
      return res.status(409).json({
        success: false,
        message: 'Customer already has an account of this type'
      });
    }

    // Generate account number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const account_number = `BT${timestamp.slice(-8)}${random}`;

    // Insert into account table
    const insertAccountQuery = `
      INSERT INTO account (
        account_number, customer_id, acc_type_id, branch_id, current_balance, status, opening_date
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      RETURNING *
    `;
    
    const accountResult = await client.query(insertAccountQuery, [
      account_number,
      value.customer_id.trim(),
      value.acc_type_id,
      value.branch_id,
      value.current_balance || 0,
      true
    ]);
    
    await db.commitTransaction(client);
    
    // Send SMS notification to customer about account creation
    try {
      const customerResult = await db.query(
        'SELECT first_name, last_name, phone_number FROM customer WHERE customer_id = $1',
        [value.customer_id.trim()]
      );
      
      const accountTypeResult = await db.query(
        'SELECT type_name FROM account_type WHERE acc_type_id = $1',
        [value.acc_type_id]
      );
      
      if (customerResult.rows.length > 0 && customerResult.rows[0].phone_number) {
        const customer = customerResult.rows[0];
        const accountType = accountTypeResult.rows[0]?.type_name || 'Bank';
        const accountDetails = {
          accountNumber: account_number,
          accountType: accountType,
          initialBalance: value.current_balance || 0,
          customerName: `${customer.first_name} ${customer.last_name}`
        };
        
        await smsService.sendAccountCreatedNotificationDetailed(
          customer.phone_number,
          accountDetails
        );
        
        console.log(`📱 Account creation SMS sent to ${customer.phone_number} for account ${account_number}`);
      }
    } catch (smsError) {
      console.error('Account creation SMS notification failed:', smsError);
      // Don't fail the account creation if SMS fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: accountResult.rows[0]
    });
  } catch (error) {
    if (client) {
      await db.rollbackTransaction(client);
    }
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account'
    });
  }
});

// GET /api/accounts/customer/:customerId - Get accounts for a specific customer
router.get('/customer/:customerId', verifyToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log('Getting accounts for customer:', customerId);
    
    const query = `
      SELECT a.*, at.type_name as account_type, b.name as branch_name
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      WHERE TRIM(a.customer_id) = TRIM($1) AND a.status = true
      ORDER BY a.opening_date DESC
    `;
    
    const result = await db.query(query, [customerId]);
    console.log('Found accounts:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get customer accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer accounts'
    });
  }
});


module.exports = router;
