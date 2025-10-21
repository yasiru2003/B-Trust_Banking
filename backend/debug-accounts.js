const db = require('./config/database');

async function debugAccounts() {
  try {
    console.log('🔍 Debugging Account Structure...');
    console.log('=================================');
    
    await db.testConnection();
    console.log('✅ Database connection successful!');
    console.log('');

    // Check account table structure
    console.log('1. Account table structure:');
    const accountColumns = await db.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'account' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Account columns:');
    accountColumns.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   ${col.column_name}: ${col.data_type}${length} - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    console.log('');

    // Check existing accounts
    console.log('2. Existing accounts:');
    const accounts = await db.query('SELECT * FROM account LIMIT 5');
    console.log('📋 Sample accounts:');
    accounts.rows.forEach(account => {
      console.log(`   Account: ${account.account_number}`);
      console.log(`   Customer ID: ${account.customer_id}`);
      console.log(`   Balance: ${account.current_balance}`);
      console.log(`   Status: ${account.status}`);
      console.log('');
    });

    // Check customers
    console.log('3. Existing customers:');
    const customers = await db.query('SELECT customer_id, first_name, last_name FROM customer LIMIT 5');
    console.log('📋 Sample customers:');
    customers.rows.forEach(customer => {
      console.log(`   Customer: ${customer.customer_id} - ${customer.first_name} ${customer.last_name}`);
    });
    console.log('');

    // Test account-customer relationship
    console.log('4. Testing account-customer relationship:');
    const testQuery = `
      SELECT a.account_number, a.customer_id, c.first_name, c.last_name
      FROM account a
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LIMIT 3
    `;
    const relationshipResult = await db.query(testQuery);
    console.log('📋 Account-Customer relationships:');
    relationshipResult.rows.forEach(row => {
      console.log(`   Account: ${row.account_number} -> Customer: ${row.customer_id} (${row.first_name} ${row.last_name})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.close();
  }
}

debugAccounts();

























