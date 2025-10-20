const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const Joi = require('joi');

/**
 * GET /api/customer-history/:customer_id
 * Get complete history for a specific customer including:
 * - Transaction history
 * - Interest distributions
 * - Account activity summary
 */
router.get('/:customer_id', verifyToken, async (req, res) => {
  try {
    const { customer_id } = req.params;
    const startDate = req.query.startDate || '1900-01-01';
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    // Fetch customer basic info
    const customerQuery = `
      SELECT c.*, b.name as branch_name, e.employee_name as agent_name
      FROM customer c
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      WHERE c.customer_id = $1
    `;
    const customerResult = await db.query(customerQuery, [customer_id]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = customerResult.rows[0];

    // Fetch all customer accounts
    const accountsQuery = `
      SELECT a.*, at.type_name as account_type
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      WHERE a.customer_id = $1
      ORDER BY a.opening_date DESC
    `;
    const accountsResult = await db.query(accountsQuery, [customer_id]);

    // Fetch complete transaction history
    const transactionsQuery = `
      SELECT t.*, tt.type_name as transaction_type,
             e.employee_name as agent_name,
             a.account_number
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN account a ON t.account_number = a.account_number
      WHERE a.customer_id = $1
        AND t.date >= $2
        AND t.date <= $3
      ORDER BY t.date DESC, t.transaction_id DESC
    `;
    const transactionsResult = await db.query(transactionsQuery, [customer_id, startDate, endDate]);

    // Fetch interest distribution history
    const interestQuery = `
      SELECT t.*, a.account_number, at.type_name as account_type
      FROM transaction t
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      WHERE a.customer_id = $1
        AND t.transaction_type_id = 'INT001'
        AND t.date >= $2
        AND t.date <= $3
      ORDER BY t.date DESC
    `;
    const interestResult = await db.query(interestQuery, [customer_id, startDate, endDate]);

    // Calculate account activity summary
    const activityQuery = `
      SELECT
        COUNT(DISTINCT a.account_number) as total_accounts,
        COUNT(DISTINCT CASE WHEN a.status = true THEN a.account_number END) as active_accounts,
        COALESCE(SUM(a.current_balance), 0) as total_balance,
        COUNT(t.transaction_id) as total_transactions,
        COUNT(CASE WHEN t.transaction_type_id = 'DEP001' THEN 1 END) as total_deposits,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'DEP001' THEN t.amount ELSE 0 END), 0) as total_deposit_amount,
        COUNT(CASE WHEN t.transaction_type_id = 'WIT001' THEN 1 END) as total_withdrawals,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'WIT001' THEN t.amount ELSE 0 END), 0) as total_withdrawal_amount,
        COUNT(CASE WHEN t.transaction_type_id = 'INT001' THEN 1 END) as total_interest_payments,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'INT001' THEN t.amount ELSE 0 END), 0) as total_interest_earned,
        MAX(t.date) as last_transaction_date,
        MIN(a.opening_date) as first_account_date
      FROM account a
      LEFT JOIN transaction t ON a.account_number = t.account_number
        AND t.date >= $2
        AND t.date <= $3
      WHERE a.customer_id = $1
    `;
    const activityResult = await db.query(activityQuery, [customer_id, startDate, endDate]);

    // Fetch fixed deposits history
    const fdQuery = `
      SELECT fd.*, ft.duration_months, ft.interest_rate as standard_rate,
             a.account_number as source_account
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN account a ON fd.account_number = a.account_number
      WHERE a.customer_id = $1
      ORDER BY fd.start_date DESC
    `;
    const fdResult = await db.query(fdQuery, [customer_id]);

    // Monthly transaction summary for the date range
    const monthlyQuery = `
      SELECT
        TO_CHAR(t.date, 'YYYY-MM') as month,
        COUNT(t.transaction_id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'DEP001' THEN t.amount ELSE 0 END), 0) as deposits,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'WIT001' THEN t.amount ELSE 0 END), 0) as withdrawals,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'INT001' THEN t.amount ELSE 0 END), 0) as interest
      FROM transaction t
      LEFT JOIN account a ON t.account_number = a.account_number
      WHERE a.customer_id = $1
        AND t.date >= $2
        AND t.date <= $3
      GROUP BY TO_CHAR(t.date, 'YYYY-MM')
      ORDER BY month DESC
    `;
    const monthlyResult = await db.query(monthlyQuery, [customer_id, startDate, endDate]);

    res.json({
      success: true,
      data: {
        customer: customer,
        accounts: accountsResult.rows,
        transactions: transactionsResult.rows,
        interestHistory: interestResult.rows,
        activitySummary: activityResult.rows[0],
        fixedDeposits: fdResult.rows,
        monthlySummary: monthlyResult.rows,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Customer history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer history'
    });
  }
});

/**
 * GET /api/customer-history/:customer_id/summary
 * Get quick summary stats for a customer
 */
router.get('/:customer_id/summary', verifyToken, async (req, res) => {
  try {
    const { customer_id } = req.params;

    const summaryQuery = `
      SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.phone_number,
        c.kyc_status,
        COUNT(DISTINCT a.account_number) as total_accounts,
        COALESCE(SUM(a.current_balance), 0) as total_balance,
        COUNT(DISTINCT fd.fd_number) as total_fds,
        (SELECT COUNT(*) FROM transaction t
         JOIN account a2 ON t.account_number = a2.account_number
         WHERE a2.customer_id = c.customer_id) as lifetime_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transaction t
         JOIN account a2 ON t.account_number = a2.account_number
         WHERE a2.customer_id = c.customer_id AND t.transaction_type_id = 'INT001') as lifetime_interest_earned
      FROM customer c
      LEFT JOIN account a ON c.customer_id = a.customer_id AND a.status = true
      LEFT JOIN fixed_deposit fd ON a.account_number = fd.account_number AND fd.status = 'ACTIVE'
      WHERE c.customer_id = $1
      GROUP BY c.customer_id, c.first_name, c.last_name, c.phone_number, c.kyc_status
    `;

    const result = await db.query(summaryQuery, [customer_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Customer summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer summary'
    });
  }
});

module.exports = router;
