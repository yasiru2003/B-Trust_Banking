const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function setupTables() {
  try {
    console.log('🔄 Setting up database tables...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'create-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement.trim());
          console.log('✅ Executed SQL statement');
        } catch (error) {
          if (error.code === '42P07') { // Table already exists
            console.log('⚠️  Table already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Database tables setup completed!');

    // Run FD interest accrual objects
    try {
      const fdAccrualFile = path.join(__dirname, 'create-fd-interest-accrual.sql');
      if (fs.existsSync(fdAccrualFile)) {
        console.log('🔄 Applying FD interest accrual SQL...');
        const fdSql = fs.readFileSync(fdAccrualFile, 'utf8');
        const fdStatements = fdSql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const stmt of fdStatements) {
          try {
            await db.query(stmt.trim());
          } catch (err) {
            // Ignore errors for missing dependent tables/views so script is idempotent
            if (err.code === '42P07' /* already exists */ || err.code === '42P01' /* undefined table */) {
              console.log('⚠️  Skipping statement (dependency/exists):', err.message);
              continue;
            }
            throw err;
          }
        }
        console.log('✅ FD interest accrual objects created/updated');
      }
    } catch (e) {
      console.error('❌ Error applying FD interest accrual SQL:', e.message);
    }
    
    // Create some sample accounts for existing customers
    await createSampleAccounts();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    process.exit(1);
  }
}

async function createSampleAccounts() {
  try {
    console.log('🔄 Creating sample accounts for existing customers...');
    
    // Get existing customers
    const customersResult = await db.query('SELECT customer_id FROM customer LIMIT 5');
    const customers = customersResult.rows;
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const accountNumber = `ACC${(i + 1).toString().padStart(3, '0')}`;
      
      try {
        await db.query(`
          INSERT INTO account (account_number, customer_id, acc_type_id, branch_id, current_balance)
          VALUES ($1, $2, 'SAV001', 1, 1000.00)
          ON CONFLICT (account_number) DO NOTHING
        `, [accountNumber, customer.customer_id]);
        
        console.log(`✅ Created account ${accountNumber} for customer ${customer.customer_id}`);
      } catch (error) {
        if (error.code === '23505') { // Unique violation
          console.log(`⚠️  Account ${accountNumber} already exists`);
        } else {
          console.error(`❌ Error creating account for ${customer.customer_id}:`, error.message);
        }
      }
    }
    
    console.log('✅ Sample accounts created!');
  } catch (error) {
    console.error('❌ Error creating sample accounts:', error);
  }
}

// Run the setup
setupTables();










