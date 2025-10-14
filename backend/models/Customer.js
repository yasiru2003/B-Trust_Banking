const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Customer {
  constructor(data) {
    this.customer_id = data.customer_id || uuidv4();
    this.agent_id = data.agent_id;
    this.branch_id = data.branch_id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.gender = data.gender;
    this.date_of_birth = data.date_of_birth;
    this.address = data.address;
    this.nic_number = data.nic_number;
    this.phone_number = data.phone_number;
    this.phone_is_verified = data.phone_is_verified || false;
    this.email = data.email;
    this.kyc_status = data.kyc_status || false;
  }

  // Create a new customer
  static async create(customerData) {
    const customer = new Customer(customerData);
    const query = `
      INSERT INTO customer (
        customer_id, agent_id, branch_id, first_name, last_name, 
        gender, date_of_birth, address, nic_number, phone_number, 
        phone_is_verified, email, kyc_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      customer.customer_id, customer.agent_id, customer.branch_id,
      customer.first_name, customer.last_name, customer.gender,
      customer.date_of_birth, customer.address, customer.nic_number,
      customer.phone_number, customer.phone_is_verified, customer.email,
      customer.kyc_status
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get customer by ID
  static async findById(customerId) {
    const query = 'SELECT * FROM customer WHERE customer_id = $1';
    const result = await db.query(query, [customerId]);
    return result.rows[0];
  }

  // Get customer by NIC number
  static async findByNIC(nicNumber) {
    const query = 'SELECT * FROM customer WHERE nic_number = $1';
    const result = await db.query(query, [nicNumber]);
    return result.rows[0];
  }

  // Get customer by phone number
  static async findByPhone(phoneNumber) {
    const query = 'SELECT * FROM customer WHERE phone_number = $1';
    const result = await db.query(query, [phoneNumber]);
    return result.rows[0];
  }

  // Get customer by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM customer WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  // Get all customers with pagination
  static async findAll(page = 1, limit = 10, filters = {}) {
    let query = 'SELECT * FROM customer WHERE 1=1';
    const values = [];
    let paramCount = 0;

    // Add filters
    if (filters.branch_id) {
      paramCount++;
      query += ` AND branch_id = $${paramCount}`;
      values.push(filters.branch_id);
    }

    if (filters.kyc_status !== undefined) {
      paramCount++;
      query += ` AND kyc_status = $${paramCount}`;
      values.push(filters.kyc_status);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR nic_number ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` ORDER BY first_name, last_name LIMIT $${paramCount}`;
    values.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Update customer
  static async update(customerId, updateData) {
    const allowedFields = [
      'first_name', 'last_name', 'gender', 'date_of_birth', 'address',
      'nic_number', 'phone_number', 'phone_is_verified', 'email', 'kyc_status'
    ];

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
    values.push(customerId);

    const query = `
      UPDATE customer 
      SET ${updates.join(', ')} 
      WHERE customer_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Delete customer
  static async delete(customerId) {
    const query = 'DELETE FROM customer WHERE customer_id = $1 RETURNING *';
    const result = await db.query(query, [customerId]);
    return result.rows[0];
  }

  // Get customer statistics
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN kyc_status = true THEN 1 END) as kyc_verified,
        COUNT(CASE WHEN phone_is_verified = true THEN 1 END) as phone_verified,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_customers_30d
      FROM customer
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  // Get customers by agent
  static async findByAgent(agentId) {
    const query = 'SELECT * FROM customer WHERE agent_id = $1 ORDER BY first_name, last_name';
    const result = await db.query(query, [agentId]);
    return result.rows;
  }

  // Get customers by branch
  static async findByBranch(branchId) {
    const query = 'SELECT * FROM customer WHERE branch_id = $1 ORDER BY first_name, last_name';
    const result = await db.query(query, [branchId]);
    return result.rows;
  }
}

module.exports = Customer;

