// Direct connection to Neon database
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Your Neon database connection string
const connectionString = 'postgresql://neondb_owner:npg_VgG1XjmFtI5D@ep-dawn-frost-adjj0va4-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { 
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

async function setupAgentCredentials() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up proper login credentials for agents...');
    console.log('==================================================');
    
    // Setup AGENT001 credentials
    console.log('1. Setting up AGENT001 credentials...');
    const agent001Password = 'agent001123';
    const agent001PasswordHash = await bcrypt.hash(agent001Password, 12);
    
    await client.query(
      'UPDATE employee_auth SET password_hash = $1, email = $2 WHERE employee_id = $3',
      [agent001PasswordHash, 'agent001@bt.com', 'AGENT001']
    );
    
    console.log('✅ AGENT001 credentials updated');
    console.log('   Email: agent001@bt.com');
    console.log('   Password: agent001123');
    console.log('');
    
    // Setup AGENT002 credentials
    console.log('2. Setting up AGENT002 credentials...');
    const agent002Password = 'agent002123';
    const agent002PasswordHash = await bcrypt.hash(agent002Password, 12);
    
    await client.query(
      'UPDATE employee_auth SET password_hash = $1, email = $2 WHERE employee_id = $3',
      [agent002PasswordHash, 'agent002@bt.com', 'AGENT002']
    );
    
    console.log('✅ AGENT002 credentials updated');
    console.log('   Email: agent002@bt.com');
    console.log('   Password: agent002123');
    console.log('');
    
    // Verify the updates
    console.log('3. Verifying agent credentials...');
    const agentsResult = await client.query(
      'SELECT employee_id, employee_name, email, role FROM employee_auth WHERE role = $1 ORDER BY employee_id',
      ['Agent']
    );
    
    console.log('📋 Updated Agent Credentials:');
    agentsResult.rows.forEach(agent => {
      console.log(`   ${agent.employee_id}: ${agent.employee_name}`);
      console.log(`     Email: ${agent.email}`);
      console.log(`     Role: ${agent.role}`);
      console.log('');
    });
    
    // Test login for both agents
    console.log('4. Testing login functionality...');
    
    // Test AGENT001 login
    const agent001Result = await client.query(
      'SELECT employee_id, employee_name, email, password_hash FROM employee_auth WHERE email = $1',
      ['agent001@bt.com']
    );
    
    if (agent001Result.rows.length > 0) {
      const agent001 = agent001Result.rows[0];
      const isValidPassword = await bcrypt.compare('agent001123', agent001.password_hash);
      console.log(`✅ AGENT001 login test: ${isValidPassword ? 'SUCCESS' : 'FAILED'}`);
    }
    
    // Test AGENT002 login
    const agent002Result = await client.query(
      'SELECT employee_id, employee_name, email, password_hash FROM employee_auth WHERE email = $1',
      ['agent002@bt.com']
    );
    
    if (agent002Result.rows.length > 0) {
      const agent002 = agent002Result.rows[0];
      const isValidPassword = await bcrypt.compare('agent002123', agent002.password_hash);
      console.log(`✅ AGENT002 login test: ${isValidPassword ? 'SUCCESS' : 'FAILED'}`);
    }
    
    console.log('');
    console.log('🎉 Agent credentials setup completed!');
    console.log('');
    console.log('📝 Login Instructions:');
    console.log('   For AGENT001 (13 customers):');
    console.log('     Email: agent001@bt.com');
    console.log('     Password: agent001123');
    console.log('');
    console.log('   For AGENT002 (2 customers):');
    console.log('     Email: agent002@bt.com');
    console.log('     Password: agent002123');
    console.log('');
    console.log('   User Type: employee');
    
  } catch (error) {
    console.error('❌ Error setting up agent credentials:', error.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

// Run the function
setupAgentCredentials();
