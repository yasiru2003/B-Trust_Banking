const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Transaction {
  constructor(data) {
    this.transaction_id = data.transaction_id || uuidv4();
    this.transaction_type_id = data.transaction_type_id;
    this.agent_id = data.agent_id;
    this.account_number = data.account_number;
    this.amount = data.amount;
    this.balance_before = data.balance_before;
    this.reference = data.reference;
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.time = data.time || new Date().toTimeString().split(' ')[0];
    this.status = data.status !== undefined ? data.status : true;
  }

  // Create a new transaction
  static async create(transactionData) {
    const transaction = new Transaction(transactionData);
    const query = `
      INSERT INTO transaction (
        transaction_id, transaction_type_id, agent_id, account_number,
        amount, balance_before, reference, date, time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      transaction.transaction_id, transaction.transaction_type_id, transaction.agent_id,
      transaction.account_number, transaction.amount, transaction.balance_before,
      transaction.reference, transaction.date, transaction.time, transaction.status
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get transaction by ID
  static async findById(transactionId) {
    const query = `
      SELECT 
        t.*,
        tt.type_name as transaction_type,
        ea.employee_name as agent_name,
        sa.current_balance,
        c.first_name,
        c.last_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN employee_auth ea ON t.agent_id = ea.employee_id
      LEFT JOIN savings_account sa ON t.account_number = sa.account_number
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      LEFT JOIN customer c ON ao.customer_id = c.customer_id
      WHERE t.transaction_id = $1
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows[0];
  }

  // Get all transactions with pagination
  static async findAll(page = 1, limit = 10, filters = {}) {
    let query = `
      SELECT 
        t.*,
        tt.type_name as transaction_type,
        ea.employee_name as agent_name,
        c.first_name,
        c.last_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN employee_auth ea ON t.agent_id = ea.employee_id
      LEFT JOIN savings_account sa ON t.account_number = sa.account_number
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      LEFT JOIN customer c ON ao.customer_id = c.customer_id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    // Add filters
    if (filters.account_number) {
      paramCount++;
      query += ` AND t.account_number = $${paramCount}`;
      values.push(filters.account_number);
    }

    if (filters.transaction_type_id) {
      paramCount++;
      query += ` AND t.transaction_type_id = $${paramCount}`;
      values.push(filters.transaction_type_id);
    }

    if (filters.agent_id) {
      paramCount++;
      query += ` AND t.agent_id = $${paramCount}`;
      values.push(filters.agent_id);
    }

    if (filters.status !== undefined) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.date_from) {
      paramCount++;
      query += ` AND t.date >= $${paramCount}`;
      values.push(filters.date_from);
    }

    if (filters.date_to) {
      paramCount++;
      query += ` AND t.date <= $${paramCount}`;
      values.push(filters.date_to);
    }

    if (filters.min_amount) {
      paramCount++;
      query += ` AND t.amount >= $${paramCount}`;
      values.push(filters.min_amount);
    }

    if (filters.max_amount) {
      paramCount++;
      query += ` AND t.amount <= $${paramCount}`;
      values.push(filters.max_amount);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` ORDER BY t.date DESC, t.time DESC LIMIT $${paramCount}`;
    values.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Get transactions by account
  static async findByAccount(accountNumber, page = 1, limit = 10) {
    const query = `
      SELECT 
        t.*,
        tt.type_name as transaction_type,
        ea.employee_name as agent_name
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN employee_auth ea ON t.agent_id = ea.employee_id
      WHERE t.account_number = $1
      ORDER BY t.date DESC, t.time DESC
      LIMIT $2 OFFSET $3
    `;
    const offset = (page - 1) * limit;
    const result = await db.query(query, [accountNumber, limit, offset]);
    return result.rows;
  }

  // Get transactions by customer (through accounts)
  static async findByCustomer(customerId, page = 1, limit = 10) {
    const query = `
      SELECT 
        t.*,
        tt.type_name as transaction_type,
        ea.employee_name as agent_name,
        sa.account_number
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN employee_auth ea ON t.agent_id = ea.employee_id
      LEFT JOIN savings_account sa ON t.account_number = sa.account_number
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      WHERE ao.customer_id = $1
      ORDER BY t.date DESC, t.time DESC
      LIMIT $2 OFFSET $3
    `;
    const offset = (page - 1) * limit;
    const result = await db.query(query, [customerId, limit, offset]);
    return result.rows;
  }

  // Get transactions by agent
  static async findByAgent(agentId, page = 1, limit = 10) {
    const query = `
      SELECT 
        t.*,
        tt.type_name as transaction_type,
        c.first_name,
        c.last_name,
        sa.account_number
      FROM transaction t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
      LEFT JOIN savings_account sa ON t.account_number = sa.account_number
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      LEFT JOIN customer c ON ao.customer_id = c.customer_id
      WHERE t.agent_id = $1
      ORDER BY t.date DESC, t.time DESC
      LIMIT $2 OFFSET $3
    `;
    const offset = (page - 1) * limit;
    const result = await db.query(query, [agentId, limit, offset]);
    return result.rows;
  }

  // Update transaction
  static async update(transactionId, updateData) {
    const allowedFields = ['status', 'reference'];
    const updates = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    values.push(transactionId);

    const query = `
      UPDATE transaction 
      SET ${updates.join(', ')} 
      WHERE transaction_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get transaction statistics
  static async getStats(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = true THEN 1 END) as successful_transactions,
        COUNT(CASE WHEN status = false THEN 1 END) as failed_transactions,
        SUM(CASE WHEN status = true THEN amount ELSE 0 END) as total_amount,
        AVG(CASE WHEN status = true THEN amount ELSE NULL END) as average_amount,
        COUNT(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as transactions_30d
      FROM transaction
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    // Add filters
    if (filters.account_number) {
      paramCount++;
      query += ` AND account_number = $${paramCount}`;
      values.push(filters.account_number);
    }

    if (filters.agent_id) {
      paramCount++;
      query += ` AND agent_id = $${paramCount}`;
      values.push(filters.agent_id);
    }

    if (filters.date_from) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      values.push(filters.date_from);
    }

    if (filters.date_to) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      values.push(filters.date_to);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get daily transaction summary
  static async getDailySummary(date) {
    const query = `
      SELECT 
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = true THEN amount ELSE 0 END) as total_amount,
        COUNT(CASE WHEN status = true THEN 1 END) as successful_count,
        COUNT(CASE WHEN status = false THEN 1 END) as failed_count
      FROM transaction
      WHERE date = $1
    `;
    const result = await db.query(query, [date]);
    return result.rows[0];
  }

  // Get transaction types
  static async getTransactionTypes() {
    const query = 'SELECT * FROM transaction_type ORDER BY type_name';
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = Transaction;

