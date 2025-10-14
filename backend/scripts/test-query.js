const db = require('../config/database');

async function testQuery() {
  try {
    const query = `
      SELECT a.*, at.type_name as account_type, b.name as branch_name
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN branch b ON a.branch_id = b.branch_id
      WHERE TRIM(a.customer_id) = TRIM($1) AND a.status = true
      ORDER BY a.opening_date DESC
    `;
    const result = await db.query(query, ['CUST001']);
    console.log('Query result:', result.rows.length, 'rows');
    result.rows.forEach(row => console.log('Account:', row.account_number, 'Type:', row.account_type));
    process.exit(0);
  } catch (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }
}

testQuery();
