const db = require('../config/database');

class DashboardService {
  // Optimized dashboard data fetching with single query
  static async getDashboardData(userType, user) {
    const cacheKey = `dashboard_${userType}_${user?.employee_id || user?.id}`;
    
    try {
      let query;
      let params = [];

      if (userType === 'employee') {
        if (user.role === 'Admin') {
          // Admin dashboard - all data
          query = `
            WITH stats AS (
              SELECT 
                (SELECT COUNT(*) FROM customer) as total_customers,
                (SELECT COUNT(*) FROM account WHERE status = true) as total_accounts,
                (SELECT COUNT(*) FROM transaction WHERE status = true) as total_transactions,
                (SELECT COUNT(*) FROM employee_auth WHERE role = 'Agent' AND status = true) as total_agents,
                (SELECT COUNT(*) FROM employee_auth WHERE role = 'Manager' AND status = true) as total_managers,
                (SELECT COUNT(*) FROM branch) as total_branches,
                (SELECT COALESCE(SUM(current_balance), 0) FROM account WHERE status = true) as total_balance,
                (SELECT COUNT(*) FROM transaction WHERE date >= CURRENT_DATE - INTERVAL '7 days') as weekly_transactions,
                (SELECT COUNT(*) FROM fraud_alerts WHERE status = 'pending') as pending_fraud_alerts
            )
            SELECT * FROM stats;
          `;
        } else if (user.role === 'Manager') {
          // Manager dashboard - branch data
          query = `
            WITH branch_stats AS (
              SELECT 
                COUNT(DISTINCT c.customer_id) as total_customers,
                COUNT(DISTINCT a.account_number) as total_accounts,
                COUNT(DISTINCT t.transaction_id) as total_transactions,
                COUNT(DISTINCT CASE WHEN e.role = 'Agent' THEN e.employee_id END) as total_agents,
                COALESCE(SUM(a.current_balance), 0) as total_balance,
                COUNT(CASE WHEN t.date >= CURRENT_DATE - INTERVAL '7 days' THEN t.transaction_id END) as weekly_transactions
              FROM branch b
              LEFT JOIN customer c ON c.branch_id = b.branch_id
              LEFT JOIN account a ON a.customer_id = c.customer_id AND a.status = true
              LEFT JOIN transaction t ON t.account_number = a.account_number AND t.status = true
              LEFT JOIN employee_auth e ON e.branch_id = b.branch_id AND e.status = true
              WHERE b.branch_id = $1
            )
            SELECT * FROM branch_stats;
          `;
          params = [user.branch_id];
        } else {
          // Agent dashboard - assigned customers
          query = `
            WITH agent_stats AS (
              SELECT 
                COUNT(DISTINCT c.customer_id) as total_customers,
                COUNT(DISTINCT a.account_number) as total_accounts,
                COUNT(DISTINCT t.transaction_id) as total_transactions,
                COALESCE(SUM(a.current_balance), 0) as total_balance,
                COUNT(CASE WHEN t.date >= CURRENT_DATE - INTERVAL '7 days' THEN t.transaction_id END) as weekly_transactions
              FROM customer c
              LEFT JOIN account a ON a.customer_id = c.customer_id AND a.status = true
              LEFT JOIN transaction t ON t.account_number = a.account_number AND t.status = true
              WHERE TRIM(c.agent_id) = TRIM($1)
            )
            SELECT * FROM agent_stats;
          `;
          params = [user.employee_id];
        }
      } else {
        // Customer dashboard
        query = `
          WITH customer_stats AS (
            SELECT 
              COUNT(DISTINCT a.account_number) as total_accounts,
              COUNT(DISTINCT t.transaction_id) as total_transactions,
              COALESCE(SUM(a.current_balance), 0) as total_balance,
              COUNT(CASE WHEN t.date >= CURRENT_DATE - INTERVAL '7 days' THEN t.transaction_id END) as weekly_transactions
            FROM account a
            LEFT JOIN transaction t ON t.account_number = a.account_number AND t.status = true
            WHERE a.customer_id = $1 AND a.status = true
          )
          SELECT * FROM customer_stats;
        `;
        params = [user.id];
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Dashboard service error:', error);
      throw error;
    }
  }

  // Get recent transactions with optimized query
  static async getRecentTransactions(userType, user, limit = 10) {
    let query;
    let params = [];

    if (userType === 'employee') {
      if (user.role === 'Admin') {
        query = `
          SELECT t.*, tt.type_name, c.first_name, c.last_name, c.phone_number,
                 e.employee_name as agent_name, b.name as branch_name,
                 CONCAT(c.first_name, ' ', c.last_name) as customer_name
          FROM transaction t
          LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
          LEFT JOIN account a ON t.account_number = a.account_number
          LEFT JOIN customer c ON a.customer_id = c.customer_id
          LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
          LEFT JOIN branch b ON e.branch_id = b.branch_id
          ORDER BY t.date DESC, t.time DESC
          LIMIT $1
        `;
        params = [limit];
      } else if (user.role === 'Manager') {
        query = `
          SELECT t.*, tt.type_name, c.first_name, c.last_name, c.phone_number,
                 e.employee_name as agent_name, b.name as branch_name,
                 CONCAT(c.first_name, ' ', c.last_name) as customer_name
          FROM transaction t
          LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
          LEFT JOIN account a ON t.account_number = a.account_number
          LEFT JOIN customer c ON a.customer_id = c.customer_id
          LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
          LEFT JOIN branch b ON e.branch_id = b.branch_id
          WHERE e.branch_id = $1
          ORDER BY t.date DESC, t.time DESC
          LIMIT $2
        `;
        params = [user.branch_id, limit];
      } else {
        query = `
          SELECT t.*, tt.type_name, c.first_name, c.last_name, c.phone_number,
                 e.employee_name as agent_name, b.name as branch_name,
                 CONCAT(c.first_name, ' ', c.last_name) as customer_name
          FROM transaction t
          LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
          LEFT JOIN account a ON t.account_number = a.account_number
          LEFT JOIN customer c ON a.customer_id = c.customer_id
          LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
          LEFT JOIN branch b ON e.branch_id = b.branch_id
          WHERE TRIM(t.agent_id) = TRIM($1)
          ORDER BY t.date DESC, t.time DESC
          LIMIT $2
        `;
        params = [user.employee_id, limit];
      }
    } else {
      query = `
        SELECT t.*, tt.type_name, c.first_name, c.last_name, c.phone_number,
               e.employee_name as agent_name, b.name as branch_name,
               CONCAT(c.first_name, ' ', c.last_name) as customer_name
        FROM transaction t
        LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
        LEFT JOIN account a ON t.account_number = a.account_number
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
        LEFT JOIN branch b ON e.branch_id = b.branch_id
        WHERE a.customer_id = $1
        ORDER BY t.date DESC, t.time DESC
        LIMIT $2
      `;
      params = [user.id, limit];
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  // Get chart data for dashboard
  static async getChartData(userType, user, days = 30) {
    let query;
    let params = [];

    if (userType === 'employee') {
      if (user.role === 'Admin') {
        query = `
          SELECT DATE(t.date) as date, 
                 COUNT(*) as transaction_count,
                 SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_amount
          FROM transaction t
          WHERE t.date >= CURRENT_DATE - INTERVAL $1 days
          GROUP BY DATE(t.date)
          ORDER BY date DESC
        `;
        params = [days];
      } else if (user.role === 'Manager') {
        query = `
          SELECT DATE(t.date) as date, 
                 COUNT(*) as transaction_count,
                 SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_amount
          FROM transaction t
          LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
          WHERE e.branch_id = $1 AND t.date >= CURRENT_DATE - INTERVAL $2 days
          GROUP BY DATE(t.date)
          ORDER BY date DESC
        `;
        params = [user.branch_id, days];
      } else {
        query = `
          SELECT DATE(t.date) as date, 
                 COUNT(*) as transaction_count,
                 SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_amount
          FROM transaction t
          WHERE TRIM(t.agent_id) = TRIM($1) AND t.date >= CURRENT_DATE - INTERVAL $2 days
          GROUP BY DATE(t.date)
          ORDER BY date DESC
        `;
        params = [user.employee_id, days];
      }
    } else {
      query = `
        SELECT DATE(t.date) as date, 
               COUNT(*) as transaction_count,
               SUM(CASE WHEN t.status = true THEN t.amount ELSE 0 END) as total_amount
        FROM transaction t
        LEFT JOIN account a ON t.account_number = a.account_number
        WHERE a.customer_id = $1 AND t.date >= CURRENT_DATE - INTERVAL $2 days
        GROUP BY DATE(t.date)
        ORDER BY date DESC
      `;
      params = [user.id, days];
    }

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = DashboardService;
