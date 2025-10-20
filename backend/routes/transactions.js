const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasPermission, checkTransactionLimit, canAccessCustomer } = require('../middleware/permissions');
const { verifyToken, requireAgent, requireBranchAccess, requireEmployee } = require('../middleware/auth');
const smsService = require('../services/smsService');
const NotificationService = require('../services/notificationService');
const Joi = require('joi');

// Validation schemas
const transactionSchema = Joi.object({
  transaction_type_id: Joi.string().required(),
  account_number: Joi.string().required(),
  amount: Joi.number().positive().required(),
  reference: Joi.string().max(255).allow('').optional(),
  customer_phone: Joi.string().allow('').optional(), // For SMS notifications - more flexible validation
  otpVerified: Joi.boolean().optional() // OTP verification status
});

// GET /api/transactions - Get transactions (role-based access)
router.get('/', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT t.*, tt.type_name, a.customer_id, c.first_name, c.last_name, c.phone_number,
             e.employee_name as agent_name, b.name as branch_name,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             t.account_number as account_number
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (req.user.role === 'Agent') {
      conditions.push(`TRIM(t.agent_id) = $${++paramCount}`);
      params.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      // Manager can see all transactions in their branch
      conditions.push(`e.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    // Add filters
    if (req.query.customer_id) {
      conditions.push(`c.customer_id = $${++paramCount}`);
      params.push(req.query.customer_id);
    }

    if (req.query.account_number) {
      conditions.push(`t.account_number = $${++paramCount}`);
      params.push(req.query.account_number);
    }

    if (req.query.transaction_type_id) {
      conditions.push(`t.transaction_type_id = $${++paramCount}`);
      params.push(req.query.transaction_type_id);
    }

    if (req.query.status !== undefined) {
      conditions.push(`t.status = $${++paramCount}`);
      params.push(req.query.status === 'true');
    }

    if (req.query.date_from) {
      conditions.push(`t.date >= $${++paramCount}`);
      params.push(req.query.date_from);
    }

    if (req.query.date_to) {
      conditions.push(`t.date <= $${++paramCount}`);
      params.push(req.query.date_to);
    }

    if (req.query.min_amount) {
      conditions.push(`t.amount >= $${++paramCount}`);
      params.push(parseFloat(req.query.min_amount));
    }

    if (req.query.max_amount) {
      conditions.push(`t.amount <= $${++paramCount}`);
      params.push(parseFloat(req.query.max_amount));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

        query += ` ORDER BY t.date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM transaction t
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
    `;
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await db.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

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
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});


// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', verifyToken, requireEmployee, async (req, res) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN t.status = true THEN 1 END) as successful_transactions,
        COUNT(CASE WHEN t.status = false THEN 1 END) as failed_transactions,
        SUM(CASE WHEN t.transaction_type_id = 'DEP001' AND t.status = true THEN t.amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN t.transaction_type_id = 'WIT001' AND t.status = true THEN t.amount ELSE 0 END) as total_withdrawals,
        SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_volume,
        COUNT(CASE WHEN t.date = CURRENT_DATE THEN 1 END) as today_count,
        AVG(CASE WHEN t.status = true THEN t.amount END) as average_transaction_amount
      FROM transaction t
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (req.user.role === 'Agent') {
      conditions.push(`TRIM(t.agent_id) = $${++paramCount}`);
      params.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      conditions.push(`e.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    // Add date filters
    if (req.query.date_from) {
      conditions.push(`t.date >= $${++paramCount}`);
      params.push(req.query.date_from);
    }

    if (req.query.date_to) {
      conditions.push(`t.date <= $${++paramCount}`);
      params.push(req.query.date_to);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics'
    });
  }
});

// GET /api/transactions/types - Get transaction types
router.get('/types', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    console.log('Fetching transaction types...');
    const result = await db.query('SELECT * FROM transaction_type ORDER BY type_name');
    console.log('Transaction types found:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get transaction types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction types'
    });
  }
});

// GET /api/transactions/recent - Get recent activities for dashboard
router.get('/recent', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    let query = `
      SELECT 
        'transaction' as activity_type,
        CASE 
          WHEN tt.type_name = 'Deposit' THEN 'Deposit processed'
          WHEN tt.type_name = 'Withdraw' THEN 'Withdrawal processed'
          ELSE 'Transaction processed'
        END as message,
        t.date as activity_date,
        CASE 
          WHEN t.status = true THEN 'success'
          ELSE 'danger'
        END as status,
        t.amount,
        tt.type_name as transaction_type,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        a.account_number
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (req.user.role === 'Agent') {
      conditions.push(`TRIM(t.agent_id) = $${++paramCount}`);
      params.push(req.user.employee_id.trim());
    } else if (req.user.role === 'Manager') {
      conditions.push(`e.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY t.date DESC LIMIT $${++paramCount}`;
    params.push(limit);

    const result = await db.query(query, params);
    
    // Format the response
    const activities = result.rows.map(row => ({
      type: row.activity_type,
      message: `${row.message} - ${row.customer_name} (LKR ${parseFloat(row.amount).toLocaleString()})`,
      time: formatTimeAgo(row.activity_date),
      status: row.status,
      details: {
        amount: row.amount,
        transaction_type: row.transaction_type,
        customer_name: row.customer_name,
        account_number: row.account_number
      }
    }));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities'
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInSeconds = Math.floor((now - activityDate) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
}

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    const query = `
      SELECT t.*, tt.type_name, a.customer_id, c.first_name, c.last_name, c.phone_number,
             e.employee_name as agent_name, b.name as branch_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      WHERE t.transaction_id = $1
    `;
    
    const result = await db.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
});

// POST /api/transactions - Create new transaction (Agent only)
router.post('/', verifyToken, requireAgent, checkTransactionLimit, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Debug logging
    console.log('Transaction request body:', JSON.stringify(req.body, null, 2));

    // Validate request data
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      console.log('Validation errors:', error.details);
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check if account exists and is active
    const accountResult = await client.query(
      'SELECT * FROM account WHERE TRIM(account_number) = TRIM($1)',
      [value.account_number]
    );
    
    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const account = accountResult.rows[0];
    
    if (!account.status) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if agent is assigned to this customer (for AGENT role)
    if (req.user.role === 'Agent') {
      const customerCheck = await client.query(
        `SELECT a.customer_id 
         FROM account a 
         WHERE a.account_number = $1 
         AND a.customer_id IN (
           SELECT customer_id FROM customer WHERE TRIM(agent_id) = $2
         )`,
        [value.account_number, req.user.employee_id.trim()]
      );
      
      if (customerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only create transactions for customers assigned to you.'
        });
      }
    }

    // Get current balance
    const currentBalance = parseFloat(account.current_balance);
    const transactionAmount = parseFloat(value.amount);

    // Check if it's a withdrawal and if sufficient funds
    if (value.transaction_type_id === 'WIT001') {
      if (currentBalance < transactionAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient funds. Available balance: LKR ${currentBalance.toLocaleString()}, Required: LKR ${transactionAmount.toLocaleString()}`
        });
      }
      
      // Check minimum balance requirement for withdrawals
      const accountTypeResult = await client.query(
        'SELECT at.minimum_balance FROM account a JOIN account_type at ON a.acc_type_id = at.acc_type_id WHERE a.account_number = $1',
        [value.account_number]
      );
      
      if (accountTypeResult.rows.length > 0) {
        const minimumBalance = parseFloat(accountTypeResult.rows[0].minimum_balance || 0);
        const balanceAfterWithdrawal = currentBalance - transactionAmount;
        
        if (minimumBalance > 0 && balanceAfterWithdrawal < minimumBalance) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Withdrawal would violate minimum balance requirement. Minimum balance: LKR ${minimumBalance.toLocaleString()}, Balance after withdrawal: LKR ${balanceAfterWithdrawal.toLocaleString()}`
          });
        }
      }
    }

    // Calculate expected balance (for response/SMS only). DB trigger will perform the actual update.
    let expectedBalance;
    if (value.transaction_type_id === 'DEP001') {
      expectedBalance = currentBalance + transactionAmount;
    } else if (value.transaction_type_id === 'WIT001') {
      expectedBalance = currentBalance - transactionAmount;
    } else {
      expectedBalance = currentBalance; // For other transaction types
    }

    // Check if transaction requires OTP (over 5,000 LKR)
    const requiresOTP = transactionAmount > 5000;
    if (requiresOTP && !req.body.otpVerified) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'OTP verification required for transactions over 5,000 LKR',
        requiresOTP: true,
        data: {
          accountNumber: value.account_number,
          transactionAmount: transactionAmount,
          threshold: 5000
        }
      });
    }

    // Auto-approve transactions at creation time (frontend requirement)
    // Status is set to true so the DB trigger applies balance updates immediately
    let status = true;
    let requiresManagerApproval = false;

    // Generate transaction ID
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const transactionId = `TXN${timestamp.slice(-6)}${random}`.substring(0, 10);

    // Create transaction
    const insertQuery = `
      INSERT INTO transaction (
        transaction_id, transaction_type_id, account_number, amount, agent_id, reference, status, date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
      RETURNING *
    `;

    // Prepare transaction values (database schema now supports full lengths)
    const transactionTypeId = value.transaction_type_id.trim();
    const accountNumber = value.account_number.trim();
    const agentId = req.user.employee_id.trim();
    const reference = value.reference ? value.reference.trim() : null;

    const transactionResult = await client.query(insertQuery, [
      transactionId,
      transactionTypeId,
      accountNumber,
      transactionAmount,
      agentId,
      reference,
      status
    ]);

    const newTransaction = transactionResult.rows[0];

    // If approved within this transaction, let the DB trigger update the balance; then read the updated balance
    let responseBalance = currentBalance;
    if (status) {
      const balanceRes = await client.query(
        'SELECT current_balance FROM account WHERE TRIM(account_number) = TRIM($1)',
        [value.account_number]
      );
      responseBalance = parseFloat(balanceRes.rows[0]?.current_balance || 0);
    }

    await client.query('COMMIT');

    // Run fraud detection on the new transaction
    try {
      const fraudDetectionService = require('../services/fraudDetectionService');
      
      // Prepare transaction data for fraud detection
      const transactionForFraudDetection = {
        ...newTransaction,
        customer_id: account.customer_id,
        transaction_type_id: transactionTypeId
      };
      
      // Run fraud detection asynchronously (don't block transaction response)
      fraudDetectionService.analyzeTransaction(transactionForFraudDetection)
        .then(alerts => {
          if (alerts.length > 0) {
            console.log(`🚨 Fraud detection generated ${alerts.length} alerts for transaction ${transactionId}`);
            // Broadcast fraud alerts via WebSocket
            const FraudWebSocketServer = require('../services/fraudWebSocket');
            FraudWebSocketServer.broadcastFraudAlert(alerts[0]);
          }
        })
        .catch(error => {
          console.error('Fraud detection error:', error);
          // Don't fail the transaction if fraud detection fails
        });
    } catch (fraudError) {
      console.error('Fraud detection service error:', fraudError);
      // Don't fail the transaction if fraud detection fails
    }

    // Send detailed SMS notification only for approved transactions
    if (status && value.customer_phone) {
      try {
        const transactionDetails = {
          type: value.transaction_type_id,
          amount: transactionAmount,
          accountNumber: value.account_number,
          balance: status ? responseBalance : expectedBalance,
          reference: value.reference,
          timestamp: new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })
        };
        
        await smsService.sendTransactionSuccessNotification(
          value.customer_phone,
          transactionDetails
        );
        
        console.log(`📱 Transaction success SMS sent to ${value.customer_phone} for transaction ${transactionId}`);
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
        // Don't fail the transaction if SMS fails
      }
    }

    // Send notification for large transactions
    if (status && transactionAmount > 50000) {
      try {
        const transactionType = value.transaction_type_id === 'DEP001' ? 'deposit' : 
                               value.transaction_type_id === 'WIT001' ? 'withdrawal' : 'transaction';
        await NotificationService.notifyLargeTransaction(
          req.user.employee_id.trim(),
          value.account_number,
          transactionAmount,
          transactionType
        );
      } catch (notificationError) {
        console.error('Failed to send transaction notification:', notificationError);
        // Don't fail the transaction if notification fails
      }
    }

    // Send notification to manager if approval required
    if (req.requiresApproval) {
      try {
        const agentResult = await db.query(
          'SELECT branch_id FROM employee_auth WHERE employee_id = $1',
          [req.user.userId]
        );
        
        if (agentResult.rows.length > 0) {
          const branchId = agentResult.rows[0].branch_id;
          await smsService.sendManagerNotification(
            branchId,
            `Large transaction requires approval: ${transactionAmount} LKR by agent ${req.user.userId}`
          );
        }
      } catch (notificationError) {
        console.error('Manager notification failed:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      data: {
        ...newTransaction,
        new_balance: status ? responseBalance : currentBalance,
        requires_approval: false
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process transaction'
    });
  } finally {
    client.release();
  }
});

// PUT /api/transactions/:id/approve - Approve transaction (Manager only)
router.put('/:id/approve', hasPermission('approve_large_transactions'), async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Get transaction details
    const transactionResult = await client.query(
      'SELECT * FROM transaction WHERE transaction_id = $1',
      [req.params.id]
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactionResult.rows[0];

    if (transaction.status) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Transaction is already approved'
      });
    }

    // Approve transaction (DB trigger will update account balance)
    await client.query(
      'UPDATE transaction SET status = true, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $1',
      [req.params.id]
    );

    // Read updated balance post-trigger
    const accountBalRes = await client.query(
      'SELECT current_balance, customer_id FROM account WHERE TRIM(account_number) = TRIM($1)',
      [transaction.account_number]
    );
    if (accountBalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    const newBalance = parseFloat(accountBalRes.rows[0].current_balance || 0);

    await client.query('COMMIT');

    // Send detailed SMS notification to customer using text.lk
    try {
      if (accountBalRes.rows.length > 0) {
        const customerResult = await db.query(
          'SELECT phone_number FROM customer WHERE customer_id = $1',
          [accountBalRes.rows[0].customer_id]
        );
        
        if (customerResult.rows.length > 0) {
          const transactionDetails = {
            type: transaction.transaction_type_id,
            amount: transaction.amount,
            accountNumber: transaction.account_number,
            balance: newBalance,
            reference: transaction.reference,
            timestamp: new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })
          };
          
          await smsService.sendTransactionSuccessNotification(
            customerResult.rows[0].phone_number,
            transactionDetails
          );
          
          console.log(`📱 Transaction approval SMS sent to ${customerResult.rows[0].phone_number} for transaction ${req.params.id}`);
        }
      }
    } catch (smsError) {
      console.error('SMS notification failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Transaction approved successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve transaction'
    });
  } finally {
    client.release();
  }
});

// PUT /api/transactions/:id - Update transaction (mainly for status)
router.put('/:id', hasPermission('create_transaction'), async (req, res) => {
  try {
    const updateSchema = Joi.object({
      reference: Joi.string().max(255).optional()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const result = await db.query(
      'SELECT * FROM transaction WHERE transaction_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        updateValues.push(value[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(req.params.id);
    const updateQuery = `
      UPDATE transaction 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = $${++paramCount}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateValues);
    
    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
});

// GET /api/transactions/account/:accountNumber - Get transactions by account
router.get('/account/:accountNumber', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT t.*, tt.type_name, e.employee_name as agent_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      WHERE t.account_number = $1
      ORDER BY t.date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [req.params.accountNumber, limit, offset]);
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM transaction WHERE account_number = $1',
      [req.params.accountNumber]
    );
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Get transactions by account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions for account'
    });
  }
});

// GET /api/transactions/customer/:customerId - Get transactions by customer
router.get('/customer/:customerId', hasPermission('view_all_transactions'), canAccessCustomer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT t.*, tt.type_name, a.account_number, e.employee_name as agent_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN savings_account a ON t.account_number = a.account_number
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      WHERE a.customer_id = $1
      ORDER BY t.date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [req.params.customerId, limit, offset]);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM transaction t
      LEFT JOIN savings_account a ON t.account_number = a.account_number
      WHERE a.customer_id = $1
    `;
    const countResult = await db.query(countQuery, [req.params.customerId]);
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Get transactions by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions for customer'
    });
  }
});

// GET /api/transactions/agent/:agentId - Get transactions by agent
router.get('/agent/:agentId', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT t.*, tt.type_name, a.customer_id, c.first_name, c.last_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN savings_account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE t.agent_id = $1
      ORDER BY t.date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [req.params.agentId, limit, offset]);
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM transaction WHERE agent_id = $1',
      [req.params.agentId]
    );
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Get transactions by agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions for agent'
    });
  }
});

// GET /api/transactions/daily/:date - Get daily transaction summary
router.get('/daily/:date', hasPermission('view_all_transactions'), async (req, res) => {
  try {
    const date = req.params.date;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = true THEN 1 END) as successful_transactions,
        COUNT(CASE WHEN status = false THEN 1 END) as pending_transactions,
        SUM(CASE WHEN transaction_type_id = 'DEP001' AND status = true THEN amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN transaction_type_id = 'WIT001' AND status = true THEN amount ELSE 0 END) as total_withdrawals,
        AVG(CASE WHEN status = true THEN amount END) as average_transaction_amount
      FROM transaction
      WHERE DATE(transaction_date) = $1
    `;
    
    const params = [date];
    let paramCount = 1;

    // Role-based filtering
    if (req.userRole === 'AGENT') {
      query += ` AND agent_id = $${++paramCount}`;
      params.push(req.user.userId);
    } else if (req.userRole === 'MANAGER') {
      query += ` AND agent_id IN (SELECT employee_id FROM employee_auth WHERE branch_id = (SELECT branch_id FROM employee_auth WHERE employee_id = $${++paramCount}))`;
      params.push(req.user.userId);
    }

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: {
        date,
        ...result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily summary'
    });
  }
});

module.exports = router;