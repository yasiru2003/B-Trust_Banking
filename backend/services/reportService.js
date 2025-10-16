const db = require('../config/database');

/**
 * Report Service - Contains business logic and SQL queries for all admin reports
 */
class ReportService {
  /**
   * Get agent-wise transaction report
   * @param {Object} filters - { startDate, endDate, branchId }
   * @returns {Promise<Array>} Agent transaction summaries
   */
  async getAgentTransactions(filters) {
    const { startDate, endDate, branchId } = filters;

    let query = `
      SELECT
        e.employee_id,
        e.employee_name,
        e.role,
        b.name as branch_name,
        COUNT(t.transaction_id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as total_value,
        COALESCE(AVG(t.amount), 0) as avg_transaction_value,
        COUNT(CASE WHEN t.transaction_type_id = 'DEP001' THEN 1 END) as deposits_count,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'DEP001' THEN t.amount ELSE 0 END), 0) as deposits_value,
        COUNT(CASE WHEN t.transaction_type_id = 'WIT001' THEN 1 END) as withdrawals_count,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'WIT001' THEN t.amount ELSE 0 END), 0) as withdrawals_value,
        COUNT(CASE WHEN t.transaction_type_id IN ('FD001', 'FD002') THEN 1 END) as fd_operations_count,
        COUNT(CASE WHEN t.status = true THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN t.status = false THEN 1 END) as failed_transactions
      FROM employee_auth e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      LEFT JOIN transaction t ON e.employee_id = t.agent_id
        AND t.transaction_date >= $1
        AND t.transaction_date <= $2
      WHERE e.role IN ('Agent', 'Manager')
    `;

    const params = [startDate, endDate];

    if (branchId) {
      query += ` AND e.branch_id = $3`;
      params.push(branchId);
    }

    query += `
      GROUP BY e.employee_id, e.employee_name, e.role, b.name
      ORDER BY total_value DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get account-wise transaction summary
   * @param {Object} filters - { startDate, endDate, accountType, branchId, minBalance, accountStatus }
   * @returns {Promise<Array>} Account summaries
   */
  async getAccountSummary(filters) {
    const { startDate, endDate, accountType, branchId, minBalance, accountStatus } = filters;

    let query = `
      SELECT
        a.account_number,
        a.acc_type_id,
        at.type_name as account_type,
        a.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        a.current_balance,
        a.opening_date,
        a.status as account_status,
        b.name as branch_name,
        COUNT(t.transaction_id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'DEP001' THEN t.amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'WIT001' THEN t.amount ELSE 0 END), 0) as total_withdrawals,
        MAX(t.transaction_date) as last_transaction_date,
        (
          SELECT COALESCE(balance_after, a.current_balance)
          FROM transaction
          WHERE account_number = a.account_number
            AND transaction_date < $1
          ORDER BY transaction_date DESC
          LIMIT 1
        ) as opening_balance
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      LEFT JOIN transaction t ON a.account_number = t.account_number
        AND t.transaction_date >= $1
        AND t.transaction_date <= $2
      WHERE 1=1
    `;

    const params = [startDate, endDate];
    let paramIndex = 3;

    if (accountType) {
      query += ` AND a.acc_type_id = $${paramIndex}`;
      params.push(accountType);
      paramIndex++;
    }

    if (branchId) {
      query += ` AND a.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    if (accountStatus !== undefined) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(accountStatus);
      paramIndex++;
    }

    query += `
      GROUP BY a.account_number, a.acc_type_id, at.type_name, a.customer_id,
               c.first_name, c.last_name, a.current_balance, a.opening_date,
               a.status, b.name
    `;

    if (minBalance) {
      query += ` HAVING a.current_balance >= $${paramIndex}`;
      params.push(minBalance);
    }

    query += ` ORDER BY a.current_balance DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get active fixed deposits report
   * @param {Object} filters - { branchId, fdType, maturityDateStart, maturityDateEnd, autoRenewal }
   * @returns {Promise<Array>} Active FD list
   */
  async getActiveFDs(filters) {
    const { branchId, fdType, maturityDateStart, maturityDateEnd, autoRenewal } = filters;

    let query = `
      SELECT
        fd.fd_number,
        fd.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        fd.principal_amount,
        fd.interest_rate,
        fd.tenure_months,
        fd.maturity_amount,
        fd.opening_date,
        fd.maturity_date,
        fd.auto_renewal,
        fd.fd_type_id,
        ft.type_name as fd_type_name,
        b.name as branch_name,
        e.employee_name as agent_name,
        EXTRACT(DAY FROM (fd.maturity_date - CURRENT_DATE)) as days_to_maturity,
        (
          fd.principal_amount +
          (fd.principal_amount * fd.interest_rate / 100 *
           EXTRACT(EPOCH FROM (CURRENT_DATE - fd.opening_date)) / (365.25 * 24 * 60 * 60))
        ) as current_value,
        (
          CASE
            WHEN EXTRACT(MONTH FROM fd.opening_date + INTERVAL '1 month' *
                 (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fd.opening_date)) * 12 +
                  EXTRACT(MONTH FROM AGE(CURRENT_DATE, fd.opening_date)) + 1)) <= 12
            THEN fd.opening_date + INTERVAL '1 month' *
                 (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fd.opening_date)) * 12 +
                  EXTRACT(MONTH FROM AGE(CURRENT_DATE, fd.opening_date)) + 1)
            ELSE NULL
          END
        ) as next_interest_payout_date
      FROM fixed_deposit fd
      LEFT JOIN fd_type ft ON fd.fd_type_id = ft.fd_type_id
      LEFT JOIN customer c ON fd.customer_id = c.customer_id
      LEFT JOIN branch b ON fd.branch_id = b.branch_id
      LEFT JOIN employee_auth e ON fd.agent_id = e.employee_id
      WHERE fd.status = 'ACTIVE'
    `;

    const params = [];
    let paramIndex = 1;

    if (branchId) {
      query += ` AND fd.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    if (fdType) {
      query += ` AND fd.fd_type_id = $${paramIndex}`;
      params.push(fdType);
      paramIndex++;
    }

    if (maturityDateStart) {
      query += ` AND fd.maturity_date >= $${paramIndex}`;
      params.push(maturityDateStart);
      paramIndex++;
    }

    if (maturityDateEnd) {
      query += ` AND fd.maturity_date <= $${paramIndex}`;
      params.push(maturityDateEnd);
      paramIndex++;
    }

    if (autoRenewal !== undefined) {
      query += ` AND fd.auto_renewal = $${paramIndex}`;
      params.push(autoRenewal);
      paramIndex++;
    }

    query += ` ORDER BY fd.maturity_date ASC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get monthly interest distribution summary
   * @param {Object} filters - { month, year, accountType, branchId }
   * @returns {Promise<Object>} Interest distribution data
   */
  async getInterestDistribution(filters) {
    const { month, year, accountType, branchId } = filters;

    // Calculate date range for the specified month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    // Summary by account type
    let summaryQuery = `
      SELECT
        at.type_name as account_type,
        COUNT(DISTINCT a.account_number) as account_count,
        COALESCE(SUM(a.current_balance), 0) as total_principal,
        COALESCE(SUM(
          CASE
            WHEN t.transaction_type_id = 'INT001' THEN t.amount
            ELSE 0
          END
        ), 0) as interest_paid_this_month,
        COALESCE(AVG(
          CASE
            WHEN at.type_name LIKE '%Savings%' THEN 4.0
            WHEN at.type_name LIKE '%Current%' THEN 0.5
            ELSE 5.0
          END
        ), 0) as avg_interest_rate
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN transaction t ON a.account_number = t.account_number
        AND t.transaction_date >= $1
        AND t.transaction_date <= $2
        AND t.transaction_type_id = 'INT001'
      WHERE 1=1
    `;

    const params = [startDate, endDate];
    let paramIndex = 3;

    if (accountType) {
      summaryQuery += ` AND a.acc_type_id = $${paramIndex}`;
      params.push(accountType);
      paramIndex++;
    }

    if (branchId) {
      summaryQuery += ` AND a.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    summaryQuery += `
      GROUP BY at.type_name
      ORDER BY interest_paid_this_month DESC
    `;

    // Year-to-date summary
    const ytdStartDate = `${year}-01-01`;
    let ytdQuery = `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN t.transaction_type_id = 'INT001' THEN t.amount
            ELSE 0
          END
        ), 0) as total_interest_ytd
      FROM transaction t
      WHERE t.transaction_date >= $1
        AND t.transaction_date <= $2
        AND t.transaction_type_id = 'INT001'
    `;

    const ytdParams = [ytdStartDate, endDate];

    // 12-month trend
    const trendQuery = `
      SELECT
        TO_CHAR(t.transaction_date, 'YYYY-MM') as month,
        COALESCE(SUM(t.amount), 0) as interest_amount
      FROM transaction t
      WHERE t.transaction_date >= $1
        AND t.transaction_date <= $2
        AND t.transaction_type_id = 'INT001'
      GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const twelveMonthsAgo = new Date(year, month - 13, 1).toISOString().split('T')[0];
    const trendParams = [twelveMonthsAgo, endDate];

    // Execute all queries
    const [summaryResult, ytdResult, trendResult] = await Promise.all([
      db.query(summaryQuery, params),
      db.query(ytdQuery, ytdParams),
      db.query(trendQuery, trendParams)
    ]);

    return {
      summary: summaryResult.rows,
      yearToDate: ytdResult.rows[0],
      trend: trendResult.rows
    };
  }

  /**
   * Get customer activity report
   * @param {Object} filters - { startDate, endDate, branchId, agentId, activityStatus, minTransactionCount }
   * @returns {Promise<Array>} Customer activity data
   */
  async getCustomerActivity(filters) {
    const { startDate, endDate, branchId, agentId, activityStatus, minTransactionCount } = filters;

    let query = `
      SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.kyc_status,
        c.created_at as customer_since,
        b.name as branch_name,
        e.employee_name as agent_name,
        COUNT(DISTINCT a.account_number) as active_accounts,
        COALESCE(SUM(a.current_balance), 0) as net_balance,
        COUNT(t.transaction_id) as total_transaction_count,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'DEP001' THEN t.amount ELSE 0 END), 0) as total_deposits_value,
        COUNT(CASE WHEN t.transaction_type_id = 'DEP001' THEN 1 END) as deposits_count,
        COALESCE(SUM(CASE WHEN t.transaction_type_id = 'WIT001' THEN t.amount ELSE 0 END), 0) as total_withdrawals_value,
        COUNT(CASE WHEN t.transaction_type_id = 'WIT001' THEN 1 END) as withdrawals_count,
        MAX(t.transaction_date) as last_transaction_date,
        CASE
          WHEN MAX(t.transaction_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'Active'
          ELSE 'Inactive'
        END as activity_status
      FROM customer c
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN account a ON c.customer_id = a.customer_id AND a.status = true
      LEFT JOIN transaction t ON a.account_number = t.account_number
        AND t.transaction_date >= $1
        AND t.transaction_date <= $2
      WHERE 1=1
    `;

    const params = [startDate, endDate];
    let paramIndex = 3;

    if (branchId) {
      query += ` AND c.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    if (agentId) {
      query += ` AND c.agent_id = $${paramIndex}`;
      params.push(agentId);
      paramIndex++;
    }

    query += `
      GROUP BY c.customer_id, c.first_name, c.last_name, c.kyc_status,
               c.created_at, b.name, e.employee_name
    `;

    // Apply activity status filter in HAVING clause
    const havingConditions = [];

    if (activityStatus === 'Active') {
      havingConditions.push(`MAX(t.transaction_date) >= CURRENT_DATE - INTERVAL '30 days'`);
    } else if (activityStatus === 'Inactive') {
      havingConditions.push(`(MAX(t.transaction_date) < CURRENT_DATE - INTERVAL '30 days' OR MAX(t.transaction_date) IS NULL)`);
    }

    if (minTransactionCount) {
      havingConditions.push(`COUNT(t.transaction_id) >= $${paramIndex}`);
      params.push(minTransactionCount);
      paramIndex++;
    }

    if (havingConditions.length > 0) {
      query += ` HAVING ${havingConditions.join(' AND ')}`;
    }

    query += ` ORDER BY net_balance DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get branch list for filters
   * @returns {Promise<Array>} List of branches
   */
  async getBranches() {
    const query = `
      SELECT branch_id, name, district, town
      FROM branch
      ORDER BY name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get account types for filters
   * @returns {Promise<Array>} List of account types
   */
  async getAccountTypes() {
    const query = `
      SELECT acc_type_id, type_name
      FROM account_type
      ORDER BY type_name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get FD types for filters
   * @returns {Promise<Array>} List of FD types
   */
  async getFDTypes() {
    const query = `
      SELECT fd_type_id, type_name, interest_rate, tenure_months
      FROM fd_type
      WHERE status = true
      ORDER BY type_name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get agents list for filters
   * @param {Number} branchId - Optional branch filter
   * @returns {Promise<Array>} List of agents
   */
  async getAgents(branchId = null) {
    let query = `
      SELECT employee_id, employee_name, branch_id
      FROM employee_auth
      WHERE role IN ('Agent', 'Manager') AND status = true
    `;

    const params = [];
    if (branchId) {
      query += ` AND branch_id = $1`;
      params.push(branchId);
    }

    query += ` ORDER BY employee_name`;

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = new ReportService();
