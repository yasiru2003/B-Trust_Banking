// Load environment variables
require('dotenv').config({ path: '../config.env' });
const { Pool } = require('pg');

async function removeInterestCalculation() {
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
    console.log('🔍 Checking current transaction types...');
    
    // Check current transaction types
    const checkResult = await pool.query('SELECT * FROM transaction_type ORDER BY type_name');
    console.log('📋 Current transaction types:');
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.transaction_type_id}: ${row.type_name}`);
    });
    
    // Remove Interest Calculation if it exists
    const deleteResult = await pool.query(
      'DELETE FROM transaction_type WHERE transaction_type_id = $1 OR type_name ILIKE $2',
      ['INT001', '%interest%']
    );
    
    if (deleteResult.rowCount > 0) {
      console.log(`\n✅ Removed ${deleteResult.rowCount} interest calculation transaction type(s)`);
    } else {
      console.log('\n✅ No interest calculation transaction types found to remove');
    }
    
    // Check final transaction types
    const finalResult = await pool.query('SELECT * FROM transaction_type ORDER BY type_name');
    console.log('\n📋 Final transaction types:');
    finalResult.rows.forEach(row => {
      console.log(`  - ${row.transaction_type_id}: ${row.type_name}`);
    });
    
    console.log(`\n✅ Total transaction types: ${finalResult.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

removeInterestCalculation();
