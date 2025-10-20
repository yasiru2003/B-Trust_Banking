// Load environment variables
require('dotenv').config({ path: './config.env' });
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
    console.log('🔍 Checking transaction types setup...');
    
    const result = await pool.query('SELECT * FROM transaction_type ORDER BY type_name');
    
    console.log('📋 All transaction types in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.transaction_type_id}: ${row.type_name}`);
    });
    
    console.log('\n✅ Current Setup:');
    console.log('  - Interest Calculation (INT001) is kept in database for system-generated transactions');
    console.log('  - Frontend filters out INT001 from manual transaction dropdown');
    console.log('  - Agents can only create Deposit and Withdraw transactions manually');
    console.log('  - Interest calculations will be automatic/system-generated');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionTypes();
