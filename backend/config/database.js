const { Pool } = require('pg');
require('dotenv').config();

// Database configuration (supports either discrete vars or DATABASE_URL)
let dbConfig;

if (process.env.DATABASE_URL) {
  // Prefer a single connection string when provided (e.g., Neon)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { 
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined // Disable hostname verification
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}

if (!dbConfig) {
  dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { 
      rejectUnauthorized: false,
    } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  };
}

// Database connection class
class Database {
  constructor() {
    this.pool = new Pool(dbConfig);
    
    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  // Test database connection
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }

  // Execute a query
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Get a client from the pool
  async getClient() {
    return await this.pool.connect();
  }

  // Begin a transaction
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  // Commit a transaction
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  // Rollback a transaction
  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  // Close all connections
  async close() {
    await this.pool.end();
    console.log('Database connections closed');
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// Create and export database instance
const db = new Database();

module.exports = db;
