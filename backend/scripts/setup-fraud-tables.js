const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './config.env' });

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createFraudTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Creating fraud detection tables...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'create-fraud-tables-simple.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    await client.query(sqlContent);
    
    console.log('✅ Fraud detection tables created successfully!');
    console.log('📊 Tables created: fraud_rules, fraud_alerts, fraud_detection_log');
    console.log('📈 Views created: fraud_dashboard_stats, recent_fraud_alerts');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'fraud_%'
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check sample data
    const rulesCount = await client.query('SELECT COUNT(*) FROM fraud_rules');
    const alertsCount = await client.query('SELECT COUNT(*) FROM fraud_alerts');
    
    console.log(`📝 Default fraud rules: ${rulesCount.rows[0].count}`);
    console.log(`🚨 Sample fraud alerts: ${alertsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating fraud tables:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createFraudTables();
    console.log('🎉 Fraud detection system setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createFraudTables };