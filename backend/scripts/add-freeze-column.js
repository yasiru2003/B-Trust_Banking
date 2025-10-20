// Add is_frozen column to account table
const { Pool } = require('pg');

// Your Neon database connection string
const connectionString = 'postgresql://neondb_owner:npg_VgG1XjmFtI5D@ep-dawn-frost-adjj0va4-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { 
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

async function addFreezeColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding is_frozen column to account table...');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'account' AND column_name = 'is_frozen'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Column is_frozen already exists in account table');
      return;
    }
    
    // Add is_frozen column
    await client.query(`
      ALTER TABLE account 
      ADD COLUMN is_frozen BOOLEAN DEFAULT FALSE
    `);
    
    console.log('✅ Added is_frozen column to account table');
    
    // Add frozen_at column
    await client.query(`
      ALTER TABLE account 
      ADD COLUMN frozen_at TIMESTAMP NULL
    `);
    
    console.log('✅ Added frozen_at column to account table');
    
    // Update existing accounts to have is_frozen = false
    await client.query(`
      UPDATE account 
      SET is_frozen = FALSE 
      WHERE is_frozen IS NULL
    `);
    
    console.log('✅ Updated existing accounts with default freeze status');
    
    // Verify the changes
    const verifyColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'account' 
      AND column_name IN ('is_frozen', 'frozen_at')
      ORDER BY column_name
    `);
    
    console.log('📋 Column verification:');
    verifyColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    console.log('🎉 Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error adding freeze columns:', error.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

// Run the function
addFreezeColumn();
