const db = require('../config/database');

async function checkAgentData() {
  try {
    console.log('🔍 Checking AGENT001 data...');
    
    // Check accounts for AGENT001 customers
    const accountsQuery = `
      SELECT COUNT(*) as account_count, SUM(current_balance) as total_balance
      FROM account a
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE TRIM(c.agent_id) = 'AGENT001'
    `;
    const accounts = await db.query(accountsQuery);
    console.log('📊 Accounts for AGENT001:', accounts.rows[0]);
    
    // Check transactions for AGENT001
    const transactionsQuery = `
      SELECT COUNT(*) as transaction_count, SUM(amount) as total_amount
      FROM transaction t
      WHERE TRIM(t.agent_id) = 'AGENT001'
    `;
    const transactions = await db.query(transactionsQuery);
    console.log('💳 Transactions for AGENT001:', transactions.rows[0]);
    
    // Check customers for AGENT001
    const customersQuery = `
      SELECT COUNT(*) as customer_count
      FROM customer c
      WHERE TRIM(c.agent_id) = 'AGENT001'
    `;
    const customers = await db.query(customersQuery);
    console.log('👥 Customers for AGENT001:', customers.rows[0]);
    
    await db.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAgentData();









