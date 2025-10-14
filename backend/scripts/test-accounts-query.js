const db = require('../config/database');

async function testAccountsQuery() {
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
    if (result.rows.length > 0) {
      console.log('First account:', result.rows[0]);
    }
    process.exit(0);
  } catch (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }
}

testAccountsQuery();










