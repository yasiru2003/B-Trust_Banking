const db = require('../config/database');

async function testCustomerStats() {
  try {
    console.log('🔍 Testing customer stats query...');
    
    const query = `
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN c.kyc_status = true THEN 1 END) as verified_customers,
        COUNT(CASE WHEN c.kyc_status = false THEN 1 END) as unverified_customers,
        COUNT(CASE WHEN c.phone_is_verified = true THEN 1 END) as phone_verified_customers
      FROM customer c
      LEFT JOIN employee_auth e ON TRIM(c.agent_id) = TRIM(e.employee_id)
      WHERE TRIM(c.agent_id) = 'AGENT001'
    `;
    
    const result = await db.query(query);
    console.log('📊 Customer stats result:', result.rows[0]);
    
    await db.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCustomerStats();
