const db = require('../config/database');

async function insertDefaults() {
  try {
    console.log('🔄 Inserting default data...');
    
    // Insert default account types
    await db.query(`
      INSERT INTO account_type (acc_type_id, type_name) 
      VALUES ('SAV001', 'Savings Account'), ('CUR001', 'Current Account') 
      ON CONFLICT (acc_type_id) DO NOTHING
    `);
    console.log('✅ Account types inserted');
    
    // Insert default transaction types  
    await db.query(`
      INSERT INTO transaction_type (transaction_type_id, type_name) 
      VALUES ('DEP001', 'Deposit'), ('WIT001', 'Withdraw'), ('INT001', 'Interest_Calculation') 
      ON CONFLICT (transaction_type_id) DO NOTHING
    `);
    console.log('✅ Transaction types inserted');
    
    console.log('✅ Default data insertion completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertDefaults();




























