const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireAgent, optionalAuth } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const fdOpeningSchema = Joi.object({
  customer_id: Joi.string().required(),
  fd_type_id: Joi.string().required(),
  principal_amount: Joi.number().positive().required(),
  source_account_number: Joi.string().required(),
  auto_renew: Joi.boolean().default(false)
});

const fdClosureSchema = Joi.object({
  fd_number: Joi.string().required(),
  closure_reason: Joi.string().max(100).default('Customer request')
});

// GET /api/fixed-deposits/types - Get all FD types
router.get('/types', optionalAuth, async (req, res) => {
  try {
    const query = `
      SELECT fd_type_id, duration_months, interest_rate
      FROM fd_type 
      ORDER BY duration_months
    `;
    
    const result = await db.query(query);
    
    // Format the response to match expected structure
    const formattedTypes = result.rows.map(fdType => ({
      fd_type_id: fdType.fd_type_id,
      type_name: `${fdType.duration_months} Month FD`,
      description: `${fdType.duration_months} months fixed deposit at ${fdType.interest_rate}% interest`,
      minimum_amount: 25000.00,
      maximum_amount: 10000000.00,
      interest_rate: fdType.interest_rate,
      tenure_months: fdType.duration_months,
      penalty_rate: 2.00,
      auto_renewal: false
    }));
    
    res.json({
      success: true,
      data: formattedTypes
    });
  } catch (error) {
    console.error('Get FD types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FD types'
    });
  }
});

// GET /api/fixed-deposits - Get FDs for agent's customers
router.get('/', verifyToken, requireAgent, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT fd.*, ft.duration_months, ft.interest_rate as standard_rate,
             c.first_name, c.last_name, c.phone_number,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             a.account_number as source_account,
             e.employee_name as agent_name
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN account a ON fd.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      WHERE 1=1
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (req.user.role === 'Agent') {
      conditions.push(`TRIM(c.agent_id) = $${++paramCount}`);
      params.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      conditions.push(`e.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    // Add filters
    if (req.query.fd_type_id) {
      conditions.push(`fd.fd_type_id = $${++paramCount}`);
      params.push(req.query.fd_type_id);
    }
    
    if (req.query.customer_id) {
      conditions.push(`a.customer_id = $${++paramCount}`);
      params.push(req.query.customer_id);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ` ORDER BY fd.start_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Format the response
    const formattedFDs = result.rows.map(fd => ({
      fd_id: fd.fd_id,
      fd_number: fd.fd_number,
      customer_id: fd.customer_id || 'N/A',
      fd_type_id: fd.fd_type_id,
      principal_amount: fd.balance_after || 0,
      interest_rate: fd.standard_rate || 0,
      tenure_months: fd.duration_months || 0,
      maturity_date: fd.maturity_date,
      opening_date: fd.start_date,
      status: fd.maturity_date && new Date(fd.maturity_date) < new Date() ? 'MATURED' : 'ACTIVE',
      customer_name: fd.customer_name || 'Unknown',
      source_account: fd.source_account || fd.account_number,
      agent_name: fd.agent_name || 'Unknown'
    }));
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM fixed_deposit fd
      LEFT JOIN account a ON fd.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      WHERE 1=1
    `;
    
    const countConditions = [];
    const countParams = [];
    let countParamCount = 0;

    if (req.user.role === 'Agent') {
      countConditions.push(`TRIM(c.agent_id) = $${++countParamCount}`);
      countParams.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      countConditions.push(`e.branch_id = $${++countParamCount}`);
      countParams.push(req.user.branch_id);
    }

    if (req.query.fd_type_id) {
      countConditions.push(`fd.fd_type_id = $${++countParamCount}`);
      countParams.push(req.query.fd_type_id);
    }
    
    if (req.query.customer_id) {
      countConditions.push(`a.customer_id = $${++countParamCount}`);
      countParams.push(req.query.customer_id);
    }

    if (countConditions.length > 0) {
      countQuery += ' AND ' + countConditions.join(' AND ');
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: formattedFDs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get FDs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fixed deposits'
    });
  }
});

// GET /api/fixed-deposits/:fdNumber - Get specific FD details
router.get('/:fdNumber', verifyToken, requireAgent, async (req, res) => {
  try {
    const query = `
      SELECT fd.*, ft.duration_months, ft.interest_rate as standard_rate,
             c.first_name, c.last_name, c.phone_number, c.email,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             a.account_number as source_account, a.current_balance as source_balance,
             e.employee_name as agent_name, b.name as branch_name
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN account a ON fd.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      WHERE fd.fd_number = $1
    `;
    
    const result = await db.query(query, [req.params.fdNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fixed deposit not found'
      });
    }

    const fd = result.rows[0];
    
    // Check if agent has access to this customer
    if (req.user.role === 'Agent') {
      const customerCheck = await db.query(
        'SELECT agent_id FROM customer WHERE customer_id = $1',
        [fd.customer_id]
      );
      
      if (customerCheck.rows.length === 0 || 
          customerCheck.rows[0].agent_id.trim() !== req.user.employee_id.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not your customer'
        });
      }
    }

    // Format the response
    const formattedFD = {
      fd_id: fd.fd_id,
      fd_number: fd.fd_number,
      customer_id: fd.customer_id || 'N/A',
      fd_type_id: fd.fd_type_id,
      principal_amount: fd.balance_after || 0,
      interest_rate: fd.standard_rate || 0,
      tenure_months: fd.duration_months || 0,
      maturity_date: fd.maturity_date,
      opening_date: fd.start_date,
      status: fd.maturity_date && new Date(fd.maturity_date) < new Date() ? 'MATURED' : 'ACTIVE',
      customer_name: fd.customer_name || 'Unknown',
      source_account: fd.source_account || fd.account_number,
      source_balance: fd.source_balance || 0,
      agent_name: fd.agent_name || 'Unknown',
      branch_name: fd.branch_name || 'Unknown',
      auto_renew: fd.auto_renew || false
    };

    res.json({
      success: true,
      data: formattedFD
    });
  } catch (error) {
    console.error('Get FD details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FD details'
    });
  }
});

// POST /api/fixed-deposits - Open new FD
router.post('/', verifyToken, requireAgent, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Validate request data
    const { error, value } = fdOpeningSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check if customer exists and is assigned to agent
    const customerResult = await client.query(
      'SELECT * FROM customer WHERE TRIM(customer_id) = TRIM($1)',
      [value.customer_id]
    );
    
    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = customerResult.rows[0];
    
    // Check if agent is assigned to this customer
    if (req.user.role === 'Agent' && customer.agent_id.trim() !== req.user.employee_id.trim()) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access denied - customer not assigned to you'
      });
    }

    // Get FD type details
    const fdTypeResult = await client.query(
      'SELECT * FROM fd_type WHERE fd_type_id = $1',
      [value.fd_type_id]
    );
    
    if (fdTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'FD type not found'
      });
    }

    const fdType = fdTypeResult.rows[0];
    
    // Validate principal amount
    if (value.principal_amount < 25000) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Minimum amount for FD is LKR 25,000'
      });
    }

    // Check source account
    const accountResult = await client.query(
      'SELECT * FROM account WHERE account_number = $1 AND TRIM(customer_id) = TRIM($2)',
      [value.source_account_number, value.customer_id]
    );
    
    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Source account not found or does not belong to customer'
      });
    }

    const account = accountResult.rows[0];
    
    if (!account.status) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Source account is inactive'
      });
    }

    if (account.current_balance < value.principal_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance in source account'
      });
    }

    // Generate FD number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const fdNumber = `FD${timestamp.slice(-8)}${random}`;

    // Calculate maturity date
    const openingDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + fdType.duration_months);

    // Create FD
    const insertFDQuery = `
      INSERT INTO fixed_deposit (
        fd_id, fd_number, account_number, fd_type_id, start_date, 
        maturity_date, balance_after, auto_renew
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const fdResult = await client.query(insertFDQuery, [
      fdNumber.substring(0, 9), // fd_id fits character(9)
      fdNumber.trim(),
      String(value.source_account_number).trim(),
      String(value.fd_type_id).trim(),
      openingDate,
      maturityDate,
      value.principal_amount,
      !!value.auto_renew
    ]);

    const newFD = fdResult.rows[0];

    // Deduct amount from source account
    const newBalance = account.current_balance - value.principal_amount;
    await client.query(
      'UPDATE account SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE account_number = $2',
      [newBalance, value.source_account_number]
    );

    // Create transaction record for FD opening
    const transactionId = `TXN${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`.substring(0, 10);
    
    await client.query(`
      INSERT INTO transaction (
        transaction_id, transaction_type_id, account_number, amount, agent_id, 
        reference, status, date
      ) VALUES ($1, 'DEP001', $2, $3, $4, $5, true, CURRENT_DATE)
    `, [
      transactionId.substring(0, 10),
      String(value.source_account_number).trim(),
      -value.principal_amount, // Negative amount for debit
      String(req.user.employee_id).trim(),
      `FD Opening - ${fdNumber}`.substring(0, 255)
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Fixed deposit opened successfully',
      data: {
        fd_number: newFD.fd_number,
        customer_id: value.customer_id,
        principal_amount: newFD.balance_after,
        interest_rate: fdType.interest_rate,
        tenure_months: fdType.duration_months,
        maturity_date: newFD.maturity_date,
        opening_date: newFD.start_date,
        status: 'ACTIVE'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Open FD error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to open fixed deposit'
    });
  } finally {
    client.release();
  }
});

// GET /api/fixed-deposits/customer/:customerId - Get FDs for specific customer
router.get('/customer/:customerId', verifyToken, requireAgent, async (req, res) => {
  try {
    const query = `
      SELECT fd.*, ft.duration_months, ft.interest_rate as standard_rate
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN account a ON fd.account_number = a.account_number
      WHERE a.customer_id = $1
      ORDER BY fd.start_date DESC
    `;
    
    const result = await db.query(query, [req.params.customerId]);
    
    // Check if agent has access to this customer
    if (req.user.role === 'Agent') {
      const customerCheck = await db.query(
        'SELECT agent_id FROM customer WHERE customer_id = $1',
        [req.params.customerId]
      );
      
      if (customerCheck.rows.length === 0 || 
          customerCheck.rows[0].agent_id.trim() !== req.user.employee_id.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not your customer'
        });
      }
    }

    // Format the response
    const formattedFDs = result.rows.map(fd => ({
      fd_id: fd.fd_id,
      fd_number: fd.fd_number,
      fd_type_id: fd.fd_type_id,
      principal_amount: fd.balance_after || 0,
      interest_rate: fd.standard_rate || 0,
      tenure_months: fd.duration_months || 0,
      maturity_date: fd.maturity_date,
      opening_date: fd.start_date,
      status: fd.maturity_date && new Date(fd.maturity_date) < new Date() ? 'MATURED' : 'ACTIVE',
      auto_renew: fd.auto_renew || false
    }));

    res.json({
      success: true,
      data: formattedFDs
    });
  } catch (error) {
    console.error('Get customer FDs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer FDs'
    });
  }
});

module.exports = router;
