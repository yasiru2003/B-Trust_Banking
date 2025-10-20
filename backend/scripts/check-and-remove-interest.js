// Load environment variables
require('dotenv').config({ path: './config.env' });
const { Pool } = require('pg');

async function checkAndRemoveInterestCalculation() {
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
    console.log('🔍 Checking transaction types and related data...');
    
    // Check current transaction types
    const typesResult = await pool.query('SELECT * FROM transaction_type ORDER BY type_name');
    console.log('📋 Current transaction types:');
    typesResult.rows.forEach(row => {
      console.log(`  - ${row.transaction_type_id}: ${row.type_name}`);
    });
    
    // Check if there are any transactions using Interest Calculation
    const interestTypes = typesResult.rows.filter(row => 
      row.type_name.toLowerCase().includes('interest') || 
      row.transaction_type_id === 'INT001'
    );
    
    if (interestTypes.length > 0) {
      console.log('\n🔍 Checking for transactions using interest calculation types...');
      
      for (const interestType of interestTypes) {
        const transactionCount = await pool.query(
          'SELECT COUNT(*) FROM transaction WHERE transaction_type_id = $1',
          [interestType.transaction_type_id]
        );
        
        console.log(`  - ${interestType.transaction_type_id}: ${transactionCount.rows[0].count} transactions`);
        
        if (parseInt(transactionCount.rows[0].count) > 0) {
          console.log(`    ⚠️  Cannot delete ${interestType.transaction_type_id} - has existing transactions`);
        } else {
          // Safe to delete
          const deleteResult = await pool.query(
            'DELETE FROM transaction_type WHERE transaction_type_id = $1',
            [interestType.transaction_type_id]
          );
          console.log(`    ✅ Deleted ${interestType.transaction_type_id}`);
        }
      }
    } else {
      console.log('\n✅ No interest calculation transaction types found');
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
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkAndRemoveInterestCalculation();
