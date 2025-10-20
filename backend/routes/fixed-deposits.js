const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireAgent, requireBranchAccess } = require('../middleware/auth');
const Joi = require('joi');
const dayjs = require('dayjs');

// Validation schemas
const fdOpeningSchema = Joi.object({
  customer_id: Joi.string().required(),
  fd_type_id: Joi.string().required(),
  principal_amount: Joi.number().positive().required(),
  source_account_number: Joi.string().required(),
  auto_renewal: Joi.boolean().default(false)
});

const fdClosureSchema = Joi.object({
  fd_number: Joi.string().required(),
  closure_reason: Joi.string().max(100).default('Customer request')
});

// GET /api/fixed-deposits/types - Get all FD types
router.get('/types', verifyToken, requireAgent, async (req, res) => {
  try {
    const query = `
      SELECT fd_type_id, duration_months, interest_rate
      FROM fd_type 
      ORDER BY duration_months, interest_rate DESC
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
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
      SELECT fd.*, 
             ft.duration_months, ft.interest_rate as standard_rate,
             c.first_name, c.last_name, c.phone_number,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             a.account_number as source_account,
             e.employee_name as agent_name,
             -- Calculate next payout date (simplified - use maturity date for now)
             fd.maturity_date as next_payout_date,
             -- Calculate total interest accrued so far
             COALESCE((
               SELECT SUM(interest_amount) 
               FROM fd_interest_accrual 
               WHERE fd_number = fd.fd_number
             ), 0) as total_interest_accrued,
             -- Calculate days until maturity (simplified)
             CASE 
               WHEN fd.maturity_date > CURRENT_DATE THEN 
                 (fd.maturity_date - CURRENT_DATE)::text
               ELSE '0'
             END as days_until_payout
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
      conditions.push(`a.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    // Add filters
    if (req.query.status) {
      conditions.push(`fd.status = $${++paramCount}`);
      params.push(req.query.status);
    }
    
    if (req.query.fd_type_id) {
      conditions.push(`fd.fd_type_id = $${++paramCount}`);
      params.push(req.query.fd_type_id);
    }
    
    if (req.query.customer_id) {
      conditions.push(`fd.customer_id = $${++paramCount}`);
      params.push(req.query.customer_id);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ` ORDER BY fd.opening_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM fixed_deposit fd
      LEFT JOIN account a ON fd.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE 1=1
    `;
    
    const countConditions = [];
    const countParams = [];
    let countParamCount = 0;

    if (req.user.role === 'Agent') {
      countConditions.push(`TRIM(c.agent_id) = $${++countParamCount}`);
      countParams.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      countConditions.push(`a.branch_id = $${++countParamCount}`);
      countParams.push(req.user.branch_id);
    }

    if (req.query.status) {
      countConditions.push(`fd.status = $${++countParamCount}`);
      countParams.push(req.query.status);
    }
    
    if (req.query.fd_type_id) {
      countConditions.push(`fd.fd_type_id = $${++countParamCount}`);
      countParams.push(req.query.fd_type_id);
    }
    
    if (req.query.customer_id) {
      countConditions.push(`fd.customer_id = $${++countParamCount}`);
      countParams.push(req.query.customer_id);
    }

    if (countConditions.length > 0) {
      countQuery += ' AND ' + countConditions.join(' AND ');
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
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
      SELECT fd.*, ft.type_name, ft.interest_rate as standard_rate,
             c.first_name, c.last_name, c.phone_number, c.email,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             a.account_number as source_account, a.current_balance as source_balance,
             e.employee_name as agent_name, b.name as branch_name
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN customer c ON fd.customer_id = c.customer_id
      LEFT JOIN account a ON fd.source_account_number = a.account_number
      LEFT JOIN employee_auth e ON fd.agent_id = e.employee_id
      LEFT JOIN branch b ON fd.branch_id = b.branch_id
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

    res.json({
      success: true,
      data: fd
    });
  } catch (error) {
    console.error('Get FD details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FD details'
    });
  }
});

// POST /api/fixed-deposits - Open new FD (Managers and Agents only)
router.post('/', verifyToken, requireAgent, async (req, res) => {
  const client = await db.getClient();

  try {
    // Block Admin from creating FDs
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin users cannot create Fixed Deposits. Only Managers and Agents can create FDs.'
      });
    }

    await client.query('BEGIN');

    // Validate request data
    const { error, value} = fdOpeningSchema.validate(req.body);
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
      'SELECT * FROM customer WHERE customer_id = $1',
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
      'SELECT * FROM fd_type WHERE fd_type_id = $1 AND status = true',
      [value.fd_type_id]
    );
    
    if (fdTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'FD type not found or inactive'
      });
    }

    const fdType = fdTypeResult.rows[0];
    
    // Validate principal amount
    if (value.principal_amount < fdType.minimum_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Minimum amount for this FD type is LKR ${fdType.minimum_amount.toLocaleString()}`
      });
    }

    if (fdType.maximum_amount && value.principal_amount > fdType.maximum_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Maximum amount for this FD type is LKR ${fdType.maximum_amount.toLocaleString()}`
      });
    }

    // Check source account
    const accountResult = await client.query(
      'SELECT * FROM account WHERE account_number = $1 AND customer_id = $2',
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

    // Calculate maturity details
    const openingDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + fdType.tenure_months);
    
    const interestRate = fdType.interest_rate;
    const principalAmount = value.principal_amount;
    
    // Calculate maturity amount (simple interest)
    const interestAmount = (principalAmount * interestRate * fdType.tenure_months) / (12 * 100);
    const maturityAmount = principalAmount + interestAmount;

    // Create FD
    const insertFDQuery = `
      INSERT INTO fixed_deposit (
        fd_number, customer_id, fd_type_id, principal_amount, interest_rate,
        tenure_months, maturity_amount, maturity_date, agent_id, branch_id,
        source_account_number, auto_renewal, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
      RETURNING *
    `;
    
    const fdResult = await client.query(insertFDQuery, [
      fdNumber,
      value.customer_id,
      value.fd_type_id,
      principalAmount,
      interestRate,
      fdType.tenure_months,
      maturityAmount,
      maturityDate,
      req.user.employee_id,
      req.user.branch_id,
      value.source_account_number,
      value.auto_renewal
    ]);

    const newFD = fdResult.rows[0];

    // Deduct amount from source account
    const newBalance = account.current_balance - principalAmount;
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
      ) VALUES ($1, 'FD001', $2, $3, $4, $5, true, CURRENT_DATE)
    `, [
      transactionId,
      value.source_account_number,
      -principalAmount, // Negative amount for debit
      req.user.employee_id,
      `FD Opening - ${fdNumber}`
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Fixed deposit opened successfully',
      data: {
        fd_number: newFD.fd_number,
        customer_id: newFD.customer_id,
        principal_amount: newFD.principal_amount,
        interest_rate: newFD.interest_rate,
        maturity_amount: newFD.maturity_amount,
        maturity_date: newFD.maturity_date,
        opening_date: newFD.opening_date,
        status: newFD.status
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

// POST /api/fixed-deposits/:fdNumber/close - Close FD (premature or on maturity)
router.post('/:fdNumber/close', verifyToken, requireAgent, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Validate request data
    const { error, value } = fdClosureSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Get FD details
    const fdResult = await client.query(
      'SELECT * FROM fixed_deposit WHERE fd_number = $1',
      [req.params.fdNumber]
    );
    
    if (fdResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Fixed deposit not found'
      });
    }

    const fd = fdResult.rows[0];
    
    if (fd.status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Fixed deposit is not active'
      });
    }

    // Check if agent has access to this customer
    if (req.user.role === 'Agent') {
      const customerCheck = await client.query(
        'SELECT agent_id FROM customer WHERE customer_id = $1',
        [fd.customer_id]
      );
      
      if (customerCheck.rows.length === 0 || 
          customerCheck.rows[0].agent_id.trim() !== req.user.employee_id.trim()) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Access denied - not your customer'
        });
      }
    }

    // Calculate closure details
    const currentDate = new Date();
    const maturityDate = new Date(fd.maturity_date);
    const isPremature = currentDate < maturityDate;
    
    let finalAmount = fd.principal_amount;
    let penaltyAmount = 0;
    let interestAmount = 0;
    
    if (isPremature) {
      // Premature closure - apply penalty
      const fdTypeResult = await client.query(
        'SELECT penalty_rate FROM fd_type WHERE fd_type_id = $1',
        [fd.fd_type_id]
      );
      
      const penaltyRate = fdTypeResult.rows[0].penalty_rate;
      const daysElapsed = Math.floor((currentDate - new Date(fd.opening_date)) / (1000 * 60 * 60 * 24));
      const monthsElapsed = daysElapsed / 30;
      
      // Calculate interest for elapsed period
      interestAmount = (fd.principal_amount * fd.interest_rate * monthsElapsed) / (12 * 100);
      
      // Calculate penalty
      penaltyAmount = (interestAmount * penaltyRate) / 100;
      
      finalAmount = fd.principal_amount + interestAmount - penaltyAmount;
    } else {
      // Mature closure - full interest
      finalAmount = fd.maturity_amount;
      interestAmount = fd.maturity_amount - fd.principal_amount;
    }

    // Update FD status
    const newStatus = isPremature ? 'PREMATURE_CLOSED' : 'CLOSED';
    await client.query(
      `UPDATE fixed_deposit 
       SET status = $1, closed_date = $2, closed_by = $3, closure_reason = $4,
           penalty_amount = $5, final_amount = $6, updated_at = CURRENT_TIMESTAMP
       WHERE fd_number = $7`,
      [newStatus, currentDate, req.user.employee_id, value.closure_reason, 
       penaltyAmount, finalAmount, req.params.fdNumber]
    );

    // Credit amount to source account
    const accountResult = await client.query(
      'SELECT current_balance FROM account WHERE account_number = $1',
      [fd.source_account_number]
    );
    
    const currentBalance = accountResult.rows[0].current_balance;
    const newBalance = currentBalance + finalAmount;
    
    await client.query(
      'UPDATE account SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE account_number = $2',
      [newBalance, fd.source_account_number]
    );

    // Create transaction record for FD closure
    const transactionId = `TXN${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`.substring(0, 10);
    
    await client.query(`
      INSERT INTO transaction (
        transaction_id, transaction_type_id, account_number, amount, agent_id, 
        reference, status, date
      ) VALUES ($1, 'FD002', $2, $3, $4, $5, true, CURRENT_DATE)
    `, [
      transactionId,
      fd.source_account_number,
      finalAmount, // Positive amount for credit
      req.user.employee_id,
      `FD Closure - ${req.params.fdNumber}`
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Fixed deposit ${isPremature ? 'prematurely closed' : 'closed on maturity'} successfully`,
      data: {
        fd_number: fd.fd_number,
        closure_type: isPremature ? 'PREMATURE' : 'MATURE',
        principal_amount: fd.principal_amount,
        interest_amount: interestAmount,
        penalty_amount: penaltyAmount,
        final_amount: finalAmount,
        closure_date: currentDate
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Close FD error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close fixed deposit'
    });
  } finally {
    client.release();
  }
});

// GET /api/fixed-deposits/customer/:customerId - Get FDs for specific customer
router.get('/customer/:customerId', verifyToken, requireAgent, async (req, res) => {
  try {
    const query = `
      SELECT fd.*, ft.type_name, ft.interest_rate as standard_rate
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      WHERE fd.customer_id = $1
      ORDER BY fd.opening_date DESC
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

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get customer FDs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer FDs'
    });
  }
});

// GET /api/fixed-deposits/:fdNumber/interest-history - Get interest history for a specific FD
router.get('/:fdNumber/interest-history', verifyToken, requireAgent, async (req, res) => {
  try {
    const query = `
      SELECT ia.*, fd.balance_after as principal_amount, fd.interest_calc_cycle
      FROM fd_interest_accrual ia
      LEFT JOIN fixed_deposit fd ON ia.fd_number = fd.fd_number
      WHERE ia.fd_number = $1
      ORDER BY ia.accrual_date DESC
    `;
    
    const result = await db.query(query, [req.params.fdNumber]);
    
    // Check if agent has access to this FD
    if (req.user.role === 'Agent') {
      const fdCheck = await db.query(`
        SELECT c.agent_id 
        FROM fixed_deposit fd
        LEFT JOIN account a ON fd.account_number = a.account_number
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE fd.fd_number = $1
      `, [req.params.fdNumber]);
      
      if (fdCheck.rows.length === 0 || 
          fdCheck.rows[0].agent_id.trim() !== req.user.employee_id.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not your customer'
        });
      }
    }

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get FD interest history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FD interest history'
    });
  }
});

// GET /api/fixed-deposits/admin/stats - Get FD statistics for admin panel
router.get('/admin/stats', verifyToken, requireAgent, async (req, res) => {
  try {
    // Only allow Admin and Manager roles
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Admin/Manager role required'
      });
    }

    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND ia.accrual_date BETWEEN $1 AND $2';
      params = [startDate, endDate];
    }

    const statsQuery = `
      SELECT 
        -- Total FD funds
        (SELECT COALESCE(SUM(balance_after), 0) FROM fixed_deposit) as total_fd_funds,
        
        -- Total active FDs
        (SELECT COUNT(*) FROM fixed_deposit) as total_active_fds,
        
        -- Next payout stats for given period
        COALESCE(SUM(
          CASE 
            WHEN fd.interest_calc_cycle = 'MONTHLY' THEN 
              fd.balance_after * (ft.interest_rate/100.0) / 12.0
            WHEN fd.interest_calc_cycle = 'QUARTERLY' THEN 
              fd.balance_after * (ft.interest_rate/100.0) / 4.0
            WHEN fd.interest_calc_cycle = 'ANNUAL' THEN 
              fd.balance_after * (ft.interest_rate/100.0)
            ELSE fd.balance_after * (ft.interest_rate/100.0) / 12.0
          END
        ), 0) as next_payout_total,
        
        -- Total interest paid in period
        COALESCE(SUM(ia.interest_amount), 0) as total_interest_paid,
        
        -- Count of FDs with payouts in period
        COUNT(DISTINCT fd.fd_number) as fds_with_payouts,
        
        -- Average interest rate
        COALESCE(AVG(ft.interest_rate), 0) as avg_interest_rate
        
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN fd_interest_accrual ia ON fd.fd_number = ia.fd_number
      WHERE 1=1 ${dateFilter}
    `;

    const result = await db.query(statsQuery, params);
    const stats = result.rows[0];

    // Get upcoming payouts for the next 30 days
    const upcomingPayoutsQuery = `
      SELECT 
        fd.fd_number,
        fd.balance_after,
        ft.interest_rate,
        fd.interest_calc_cycle,
        CASE 
          WHEN fd.interest_calc_cycle = 'MONTHLY' THEN 
            DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '1 day'
          WHEN fd.interest_calc_cycle = 'QUARTERLY' THEN 
            DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' + INTERVAL '1 day'
          WHEN fd.interest_calc_cycle = 'ANNUAL' THEN 
            DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + INTERVAL '1 day'
          ELSE fd.maturity_date
        END as next_payout_date,
        CASE 
          WHEN fd.interest_calc_cycle = 'MONTHLY' THEN 
            fd.balance_after * (ft.interest_rate/100.0) / 12.0
          WHEN fd.interest_calc_cycle = 'QUARTERLY' THEN 
            fd.balance_after * (ft.interest_rate/100.0) / 4.0
          WHEN fd.interest_calc_cycle = 'ANNUAL' THEN 
            fd.balance_after * (ft.interest_rate/100.0)
          ELSE fd.balance_after * (ft.interest_rate/100.0) / 12.0
        END as payout_amount
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      WHERE (
        CASE 
          WHEN fd.interest_calc_cycle = 'MONTHLY' THEN 
            DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '1 day'
          WHEN fd.interest_calc_cycle = 'QUARTERLY' THEN 
            DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' + INTERVAL '1 day'
          WHEN fd.interest_calc_cycle = 'ANNUAL' THEN 
            DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + INTERVAL '1 day'
          ELSE fd.maturity_date
        END
      ) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY next_payout_date ASC
    `;

    const upcomingResult = await db.query(upcomingPayoutsQuery);

    res.json({
      success: true,
      data: {
        ...stats,
        upcoming_payouts: upcomingResult.rows
      }
    });
  } catch (error) {
    console.error('Get FD admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FD admin statistics'
    });
  }
});

// POST /api/fixed-deposits/admin/check-maturity - Manual FD maturity check (Admin/Manager only)
router.post('/admin/check-maturity', verifyToken, requireAgent, async (req, res) => {
  try {
    // Only allow Admin and Manager roles
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Admin/Manager role required'
      });
    }

    const FDMaturityService = require('../services/fdMaturityService');
    
    // Check for matured FDs
    const maturedCount = await FDMaturityService.checkMaturedFDs();
    
    // Check for upcoming maturities
    const upcomingCount = await FDMaturityService.checkUpcomingFDMaturities();

    res.json({
      success: true,
      message: 'FD maturity check completed',
      data: {
        matured_fds: maturedCount,
        upcoming_fds: upcomingCount,
        total_processed: maturedCount + upcomingCount
      }
    });
  } catch (error) {
    console.error('Manual FD maturity check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform FD maturity check'
    });
  }
});

// POST /api/fixed-deposits/admin/simulate-maturity/:fdNumber - Simulate FD maturity for testing
router.post('/admin/simulate-maturity/:fdNumber', verifyToken, requireAgent, async (req, res) => {
  try {
    // Only allow Admin and Manager roles
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Admin/Manager role required'
      });
    }

    const FDMaturityService = require('../services/fdMaturityService');
    
    const fd = await FDMaturityService.simulateFDMaturity(req.params.fdNumber);

    res.json({
      success: true,
      message: 'FD maturity simulation completed',
      data: fd
    });
  } catch (error) {
    console.error('FD maturity simulation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to simulate FD maturity'
    });
  }
});

module.exports = router;

// POST /api/fixed-deposits/accrue-interest - Accrue daily interest for ACTIVE FDs
router.post('/accrue-interest', verifyToken, requireAgent, async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Accrue interest for all ACTIVE FDs where accrual for today not yet recorded
    // Simple daily interest: principal * (annual_rate/100) / 365
    const accrueSql = `
      WITH active_fds AS (
        SELECT fd.fd_number,
               fd.principal_amount,
               fd.interest_rate,
               fd.opening_date,
               fd.maturity_date
        FROM fixed_deposit fd
        WHERE fd.status = 'ACTIVE'
          AND CURRENT_DATE BETWEEN DATE(fd.opening_date) AND DATE(fd.maturity_date)
      ),
      to_accrue AS (
        SELECT a.fd_number,
               a.principal_amount,
               a.interest_rate AS annual_rate,
               CURRENT_DATE AS accrual_date,
               ROUND(a.principal_amount * (a.interest_rate/100.0) / 365.0, 2) AS interest_amount
        FROM active_fds a
        LEFT JOIN fd_interest_accrual ia
          ON ia.fd_number = a.fd_number AND ia.accrual_date = CURRENT_DATE
        WHERE ia.id IS NULL
      )
      INSERT INTO fd_interest_accrual (fd_number, accrual_date, interest_amount, principal_amount, annual_rate)
      SELECT fd_number, accrual_date, interest_amount, principal_amount, annual_rate
      FROM to_accrue
      RETURNING *;
    `;

    const result = await client.query(accrueSql);
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'FD daily interest accrued',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('FD interest accrual error:', error);
    res.status(500).json({ success: false, message: 'Failed to accrue FD interest' });
  } finally {
    client.release();
  }
});





