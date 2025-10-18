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

async function checkCurrentCredentials() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current agent credentials...');
    console.log('=====================================');
    
    // Get all agents with their current credentials
    const agentsResult = await client.query(
      'SELECT employee_id, employee_name, email, role, branch_id FROM employee_auth WHERE role = $1 ORDER BY employee_id',
      ['Agent']
    );
    
    console.log('📋 Current Agent Credentials:');
    agentsResult.rows.forEach(agent => {
      console.log(`   ${agent.employee_id}: ${agent.employee_name}`);
      console.log(`     Email: ${agent.email}`);
      console.log(`     Role: ${agent.role}`);
      console.log(`     Branch: ${agent.branch_id}`);
      console.log('');
    });
    
    // Check what customers each agent has
    console.log('👥 Customers by Agent:');
    const customersResult = await client.query(`
      SELECT 
        c.customer_id, c.first_name, c.last_name, c.phone_number,
        c.agent_id, e.employee_name as agent_name
      FROM customer c
      LEFT JOIN employee_auth e ON TRIM(c.agent_id) = TRIM(e.employee_id)
      ORDER BY c.agent_id, c.customer_id
    `);
    
    const customersByAgent = {};
    customersResult.rows.forEach(customer => {
      const agentId = customer.agent_id?.trim() || 'No Agent';
      if (!customersByAgent[agentId]) {
        customersByAgent[agentId] = [];
      }
      customersByAgent[agentId].push(customer);
    });
    
    Object.keys(customersByAgent).forEach(agentId => {
      console.log(`\n   Agent: ${agentId}`);
      customersByAgent[agentId].forEach(customer => {
        console.log(`     - ${customer.customer_id}: ${customer.first_name} ${customer.last_name} (${customer.phone_number})`);
      });
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Total Agents: ${agentsResult.rows.length}`);
    console.log(`   Total Customers: ${customersResult.rows.length}`);
    
    Object.keys(customersByAgent).forEach(agentId => {
      console.log(`   ${agentId}: ${customersByAgent[agentId].length} customers`);
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
checkCurrentCredentials();
