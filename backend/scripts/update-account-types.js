const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'btrust_banking',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function updateAccountTypes() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting account types update...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'update-account-types.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Account types updated successfully!');
    
    // Verify the updates
    const result = await client.query(`
      SELECT 
        acc_type_id,
        type_name,
        interest_rate,
        minimum_balance,
        description
      FROM public.account_type 
      ORDER BY acc_type_id
    `);
    
    console.log('\n📋 Updated Account Types:');
    console.log('=====================================');
    result.rows.forEach(row => {
      console.log(`${row.acc_type_id}: ${row.type_name}`);
      console.log(`  Interest Rate: ${row.interest_rate}%`);
      console.log(`  Minimum Balance: LKR ${row.minimum_balance}`);
      console.log(`  Description: ${row.description}`);
      console.log('---');
    });
    
    console.log(`\n✅ Successfully updated ${result.rows.length} account types!`);
    
  } catch (error) {
    console.error('❌ Error updating account types:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
updateAccountTypes()
  .then(() => {
    console.log('\n🎉 Account types update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Account types update failed:', error);
    process.exit(1);
  });







