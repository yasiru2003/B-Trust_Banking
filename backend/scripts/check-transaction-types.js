// Load environment variables
require('dotenv').config({ path: '../config.env' });
const { Pool } = require('pg');

async function checkTransactionTypes() {
  const dbConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined },
  } : {
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
  const pool = new Pool(dbConfig);

  try {
    console.log('🔍 Checking transaction types...');
    
    const result = await pool.query('SELECT * FROM transaction_type ORDER BY type_name');
    
    console.log('📋 Current transaction types:');
    result.rows.forEach(row => {
      console.log(`  - ${row.transaction_type_id}: ${row.type_name}`);
    });
    
    console.log(`\n✅ Total transaction types: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error checking transaction types:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionTypes();
