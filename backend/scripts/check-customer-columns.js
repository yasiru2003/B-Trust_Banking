const db = require('../config/database');

async function checkCustomerColumns() {
  try {
    const result = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customer' 
      ORDER BY ordinal_position
    `);
    console.log('Customer table columns:', result.rows.map(r => r.column_name));
    await db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCustomerColumns();










