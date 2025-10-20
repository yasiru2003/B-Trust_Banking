// Direct connection to Neon database
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

async function debugCustomerFiltering() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging customer filtering issue...');
    console.log('=====================================');
    
    // Check all customers and their agent assignments
    console.log('1. All customers and their agent assignments:');
    const allCustomersResult = await client.query(`
      SELECT 
        c.customer_id, c.first_name, c.last_name, c.phone_number,
        c.agent_id, e.employee_name as agent_name, e.email as agent_email
      FROM customer c
      LEFT JOIN employee_auth e ON TRIM(c.agent_id) = TRIM(e.employee_id)
      ORDER BY c.agent_id, c.customer_id
    `);
    
    console.log(`   Total customers: ${allCustomersResult.rows.length}`);
    allCustomersResult.rows.forEach(customer => {
      console.log(`   ${customer.customer_id}: ${customer.first_name} ${customer.last_name} (Agent: ${customer.agent_id?.trim() || 'NULL'})`);
    });
    console.log('');
    
    // Test the exact query that the API uses for AGENT001
    console.log('2. Testing AGENT001 customer query:');
    const agent001Query = `
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      WHERE TRIM(c.agent_id) = TRIM($1) ORDER BY c.customer_id DESC LIMIT $2 OFFSET $3
    `;
    
    const agent001Result = await client.query(agent001Query, ['AGENT001', 10, 0]);
    console.log(`   AGENT001 query result: ${agent001Result.rows.length} customers`);
    agent001Result.rows.forEach(customer => {
      console.log(`     - ${customer.customer_id}: ${customer.first_name} ${customer.last_name}`);
    });
    console.log('');
    
    // Test the exact query that the API uses for AGENT002
    console.log('3. Testing AGENT002 customer query:');
    const agent002Result = await client.query(agent001Query, ['AGENT002', 10, 0]);
    console.log(`   AGENT002 query result: ${agent002Result.rows.length} customers`);
    agent002Result.rows.forEach(customer => {
      console.log(`     - ${customer.customer_id}: ${customer.first_name} ${customer.last_name}`);
    });
    console.log('');
    
    // Check if there are any customers with NULL or empty agent_id
    console.log('4. Checking for customers with NULL or empty agent_id:');
    const nullAgentResult = await client.query(`
      SELECT customer_id, first_name, last_name, agent_id 
      FROM customer 
      WHERE agent_id IS NULL OR TRIM(agent_id) = ''
    `);
    
    if (nullAgentResult.rows.length > 0) {
      console.log(`   Found ${nullAgentResult.rows.length} customers with NULL/empty agent_id:`);
      nullAgentResult.rows.forEach(customer => {
        console.log(`     - ${customer.customer_id}: ${customer.first_name} ${customer.last_name}`);
      });
    } else {
      console.log('   No customers with NULL/empty agent_id found');
    }
    console.log('');
    
    // Check agent table structure
    console.log('5. Checking agent table structure:');
    const agentStructureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'employee_auth' 
      ORDER BY ordinal_position
    `);
    
    console.log('   employee_auth table structure:');
    agentStructureResult.rows.forEach(row => {
      console.log(`     ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
    // Check customer table structure
    console.log('6. Checking customer table structure:');
    const customerStructureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'customer' 
      ORDER BY ordinal_position
    `);
    
    console.log('   customer table structure:');
    customerStructureResult.rows.forEach(row => {
      console.log(`     ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

// Run the function
debugCustomerFiltering();
