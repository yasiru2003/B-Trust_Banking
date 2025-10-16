const { Pool } = require('pg');

// Use Neon connection string directly
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_VgG1XjmFtI5D@ep-dawn-frost-adjj0va4-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { 
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

async function viewDatabase() {
  try {
    console.log('🔗 Connecting to Neon database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available Tables:');
    console.log('==================');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Get table structures and data counts
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      console.log(`\n📊 Table: ${tableName}`);
      console.log('='.repeat(50));
      
      // Get column info
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log('Columns:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
      
      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = countResult.rows[0].count;
      console.log(`\nTotal rows: ${count}`);
      
      // Show sample data (first 5 rows)
      if (count > 0) {
        console.log('\nSample data (first 5 rows):');
        const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 5`);
        console.table(sampleResult.rows);
      }
      
      console.log('\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the function
viewDatabase();