const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Account {
  constructor(data) {
    this.account_number = data.account_number || this.generateAccountNumber();
    this.acc_type_id = data.acc_type_id;
    this.branch_id = data.branch_id;
    this.opening_date = data.opening_date || new Date().toISOString().split('T')[0];
    this.current_balance = data.current_balance || 0;
    this.status = data.status !== undefined ? data.status : true;
  }

  // Generate account number
  generateAccountNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BT${timestamp.slice(-8)}${random}`;
  }

  // Create a new account
  static async create(accountData) {
    const account = new Account(accountData);
    const query = `
      INSERT INTO savings_account (
        account_number, acc_type_id, branch_id, opening_date, 
        current_balance, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      account.account_number, account.acc_type_id, account.branch_id,
      account.opening_date, account.current_balance, account.status
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get account by account number
  static async findByAccountNumber(accountNumber) {
    const query = 'SELECT * FROM savings_account WHERE account_number = $1';
    const result = await db.query(query, [accountNumber]);
    return result.rows[0];
  }

  // Get all accounts with pagination
  static async findAll(page = 1, limit = 10, filters = {}) {
    let query = `
      SELECT sa.*, at.type_name, b.branch_name 
      FROM savings_account sa
      LEFT JOIN account_type at ON sa.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON sa.branch_id = b.branch_id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    // Add filters
    if (filters.branch_id) {
      paramCount++;
      query += ` AND sa.branch_id = $${paramCount}`;
      values.push(filters.branch_id);
    }

    if (filters.acc_type_id) {
      paramCount++;
      query += ` AND sa.acc_type_id = $${paramCount}`;
      values.push(filters.acc_type_id);
    }

    if (filters.status !== undefined) {
      paramCount++;
      query += ` AND sa.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.min_balance) {
      paramCount++;
      query += ` AND sa.current_balance >= $${paramCount}`;
      values.push(filters.min_balance);
    }

    if (filters.max_balance) {
      paramCount++;
      query += ` AND sa.current_balance <= $${paramCount}`;
      values.push(filters.max_balance);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` ORDER BY sa.opening_date DESC LIMIT $${paramCount}`;
    values.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Update account
  static async update(accountNumber, updateData) {
    const allowedFields = ['current_balance', 'status'];
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
    values.push(accountNumber);

    const query = `
      UPDATE savings_account 
      SET ${updates.join(', ')} 
      WHERE account_number = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Update account balance
  static async updateBalance(accountNumber, newBalance) {
    const query = `
      UPDATE savings_account 
      SET current_balance = $1 
      WHERE account_number = $2
      RETURNING *
    `;
    const result = await db.query(query, [newBalance, accountNumber]);
    return result.rows[0];
  }

  // Get account with customer information
  static async getAccountWithCustomer(accountNumber) {
    const query = `
      SELECT 
        sa.*,
        at.type_name,
        b.branch_name,
        ao.customer_id,
        c.first_name,
        c.last_name,
        c.phone_number,
        c.email
      FROM savings_account sa
      LEFT JOIN account_type at ON sa.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON sa.branch_id = b.branch_id
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      LEFT JOIN customer c ON ao.customer_id = c.customer_id
      WHERE sa.account_number = $1
    `;
    const result = await db.query(query, [accountNumber]);
    return result.rows[0];
  }

  // Get accounts by customer
  static async findByCustomer(customerId) {
    const query = `
      SELECT 
        sa.*,
        at.type_name,
        b.branch_name
      FROM savings_account sa
      LEFT JOIN account_type at ON sa.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON sa.branch_id = b.branch_id
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      WHERE ao.customer_id = $1
      ORDER BY sa.opening_date DESC
    `;
    const result = await db.query(query, [customerId]);
    return result.rows;
  }

  // Get accounts by branch
  static async findByBranch(branchId) {
    const query = `
      SELECT 
        sa.*,
        at.type_name,
        ao.customer_id,
        c.first_name,
        c.last_name
      FROM savings_account sa
      LEFT JOIN account_type at ON sa.acc_type_id = at.acc_type_id
      LEFT JOIN account_ownership ao ON sa.account_number = ao.account_number
      LEFT JOIN customer c ON ao.customer_id = c.customer_id
      WHERE sa.branch_id = $1
      ORDER BY sa.opening_date DESC
    `;
    const result = await db.query(query, [branchId]);
    return result.rows;
  }

  // Get account statistics
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN status = true THEN 1 END) as active_accounts,
        COUNT(CASE WHEN status = false THEN 1 END) as inactive_accounts,
        SUM(current_balance) as total_balance,
        AVG(current_balance) as average_balance,
        COUNT(CASE WHEN opening_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_accounts_30d
      FROM account
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  // Check if account exists and is active
  static async isActive(accountNumber) {
    const query = 'SELECT status FROM account WHERE account_number = $1';
    const result = await db.query(query, [accountNumber]);
    return result.rows.length > 0 && result.rows[0].status === true;
  }

  // Get account balance
  static async getBalance(accountNumber) {
    const query = 'SELECT current_balance FROM account WHERE account_number = $1';
    const result = await db.query(query, [accountNumber]);
    return result.rows.length > 0 ? result.rows[0].current_balance : null;
  }
}

module.exports = Account;

