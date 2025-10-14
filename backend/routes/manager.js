const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireManager, requireBranchAccess } = require('../middleware/auth');

// Manager dashboard - branch overview
router.get('/dashboard', verifyToken, requireManager, async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    
    // Get branch information
    const branchQuery = `
      SELECT b.*, e.employee_name as manager_name
      FROM branch b
      LEFT JOIN employee_auth e ON b.manager_id = e.employee_id
      WHERE b.branch_id = $1
    `;
    const branchResult = await db.query(branchQuery, [branchId]);
    
    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }
    
    const branch = branchResult.rows[0];
    
    // Get branch statistics
    const statsQuery = `
      SELECT 
        -- Account statistics
        COUNT(DISTINCT a.account_id) as total_accounts,
        COUNT(DISTINCT CASE WHEN a.status = true THEN a.account_id END) as active_accounts,
        COUNT(DISTINCT CASE WHEN a.status = false THEN a.account_id END) as inactive_accounts,
        SUM(a.current_balance) as total_balance,
        AVG(a.current_balance) as average_balance,
        
        -- Agent statistics
        COUNT(DISTINCT e.employee_id) as total_agents,
        COUNT(DISTINCT CASE WHEN e.status = true THEN e.employee_id END) as active_agents,
        
        -- Transaction statistics
        COUNT(DISTINCT t.transaction_id) as total_transactions,
        COUNT(DISTINCT CASE WHEN t.status = true THEN t.transaction_id END) as successful_transactions,
        COUNT(DISTINCT CASE WHEN t.status = false THEN t.transaction_id END) as failed_transactions,
        SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_transaction_amount,
        
        -- Customer statistics
        COUNT(DISTINCT c.customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN c.agent_id IS NOT NULL THEN c.customer_id END) as assigned_customers
      FROM branch b
      LEFT JOIN account a ON b.branch_id = a.branch_id
      LEFT JOIN employee_auth e ON b.branch_id = e.branch_id AND e.role = 'Agent'
      LEFT JOIN transaction t ON t.agent_id = e.employee_id
      LEFT JOIN customer c ON c.agent_id = e.employee_id
      WHERE b.branch_id = $1
    `;
    
    const statsResult = await db.query(statsQuery, [branchId]);
    const stats = statsResult.rows[0];
    
    // Get recent transactions
    const recentTransactionsQuery = `
      SELECT t.*, tt.type_name, a.customer_id, c.first_name, c.last_name,
             e.employee_name as agent_name, b.name as branch_name,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      WHERE e.branch_id = $1
      ORDER BY t.date DESC
      LIMIT 10
    `;
    
    const recentTransactionsResult = await db.query(recentTransactionsQuery, [branchId]);
    
    // Get top agents by transaction count
    const topAgentsQuery = `
      SELECT e.employee_id, e.employee_name, 
             COUNT(t.transaction_id) as transaction_count,
             SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_amount
      FROM employee_auth e
      LEFT JOIN transaction t ON e.employee_id = t.agent_id
      WHERE e.branch_id = $1 AND e.role = 'Agent' AND e.status = true
      GROUP BY e.employee_id, e.employee_name
      ORDER BY transaction_count DESC
      LIMIT 5
    `;
    
    const topAgentsResult = await db.query(topAgentsQuery, [branchId]);
    
    res.json({
      success: true,
      data: {
        branch: {
          branch_id: branch.branch_id,
          name: branch.name,
          district: branch.district,
          town: branch.town,
          phone_number: branch.phone_number,
          manager_name: branch.manager_name
        },
        statistics: {
          accounts: {
            total: parseInt(stats.total_accounts) || 0,
            active: parseInt(stats.active_accounts) || 0,
            inactive: parseInt(stats.inactive_accounts) || 0,
            total_balance: parseFloat(stats.total_balance) || 0,
            average_balance: parseFloat(stats.average_balance) || 0
          },
          agents: {
            total: parseInt(stats.total_agents) || 0,
            active: parseInt(stats.active_agents) || 0
          },
          transactions: {
            total: parseInt(stats.total_transactions) || 0,
            successful: parseInt(stats.successful_transactions) || 0,
            failed: parseInt(stats.failed_transactions) || 0,
            total_amount: parseFloat(stats.total_transaction_amount) || 0
          },
          customers: {
            total: parseInt(stats.total_customers) || 0,
            assigned: parseInt(stats.assigned_customers) || 0
          }
        },
        recent_transactions: recentTransactionsResult.rows,
        top_agents: topAgentsResult.rows
      }
    });
    
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get all agents in manager's branch
router.get('/agents', verifyToken, requireManager, async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    
    const query = `
      SELECT e.employee_id, e.employee_name, e.email, e.phone_number, e.status,
             COUNT(DISTINCT c.customer_id) as customer_count,
             COUNT(DISTINCT t.transaction_id) as transaction_count,
             SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_transaction_amount
      FROM employee_auth e
      LEFT JOIN customer c ON e.employee_id = c.agent_id
      LEFT JOIN transaction t ON e.employee_id = t.agent_id
      WHERE e.branch_id = $1 AND e.role = 'Agent'
      GROUP BY e.employee_id, e.employee_name, e.email, e.phone_number, e.status
      ORDER BY e.employee_name
    `;
    
    const result = await db.query(query, [branchId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get branch agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch agents'
    });
  }
});

// Get all customers in manager's branch
router.get('/customers', verifyToken, requireManager, async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT c.*, e.employee_name as agent_name,
             COUNT(DISTINCT a.account_id) as account_count,
             SUM(a.current_balance) as total_balance
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN account a ON c.customer_id = a.customer_id
      WHERE e.branch_id = $1
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.phone_number, 
               c.date_of_birth, c.gender, c.address, c.agent_id, e.employee_name
      ORDER BY c.first_name, c.last_name
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(DISTINCT c.customer_id) as total
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      WHERE e.branch_id = $1
    `;
    
    const [result, countResult] = await Promise.all([
      db.query(query, [branchId, limit, offset]),
      db.query(countQuery, [branchId])
    ]);
    
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
    console.error('Get branch customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch customers'
    });
  }
});

// Get all accounts in manager's branch
router.get('/accounts', verifyToken, requireManager, async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT a.*, at.type_name as account_type, b.name as branch_name,
             c.first_name, c.last_name, c.phone_number,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE a.branch_id = $1
      ORDER BY a.opening_date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM account a
      WHERE a.branch_id = $1
    `;
    
    const [result, countResult] = await Promise.all([
      db.query(query, [branchId, limit, offset]),
      db.query(countQuery, [branchId])
    ]);
    
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
    console.error('Get branch accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch accounts'
    });
  }
});

// Get all transactions in manager's branch
router.get('/transactions', verifyToken, requireManager, async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT t.*, tt.type_name, a.customer_id, c.first_name, c.last_name, c.phone_number,
             e.employee_name as agent_name, b.name as branch_name,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      WHERE e.branch_id = $1
      ORDER BY t.date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transaction t
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      WHERE e.branch_id = $1
    `;
    
    const [result, countResult] = await Promise.all([
      db.query(query, [branchId, limit, offset]),
      db.query(countQuery, [branchId])
    ]);
    
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
    console.error('Get branch transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch transactions'
    });
  }
});

module.exports = router;





