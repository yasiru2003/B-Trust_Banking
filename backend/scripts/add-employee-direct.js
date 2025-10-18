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

async function addEmployee() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding employee to employee_auth table...');
    
    // First, let's check if the employee already exists
    const existingEmployee = await client.query(
      'SELECT employee_id FROM employee_auth WHERE employee_id = $1',
      ['AGENT002']
    );
    
    if (existingEmployee.rows.length > 0) {
      console.log('⚠️  Employee AGENT002 already exists in the database');
      console.log('Existing employee:', existingEmployee.rows[0]);
      return;
    }
    
    // Check if branch_id = 1 exists
    const branchCheck = await client.query(
      'SELECT branch_id FROM branch WHERE branch_id = $1',
      [1]
    );
    
    if (branchCheck.rows.length === 0) {
      console.log('❌ Branch with ID 1 does not exist. Please create the branch first.');
      return;
    }
    
    console.log('✅ Branch ID 1 exists, proceeding with employee creation...');
    
    // Insert the new employee
    const insertQuery = `
      INSERT INTO employee_auth (
        employee_id, branch_id, role, employee_name, 
        password_hash, phone_number, email, profile_picture_url, 
        gender, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    // Default values for required fields
    const employeeData = [
      'AGENT002',           // employee_id
      1,                    // branch_id
      'Agent',              // role
      'New Agent',          // employee_name
      '$2b$10$defaultpasswordhash', // password_hash (you'll need to set a real password)
      '0770000000',         // phone_number (default)
      'agent002@bank.com',  // email (default)
      null,                 // profile_picture_url
      'Other',              // gender (default)
      true                  // status (active)
    ];
    
    const insertResult = await client.query(insertQuery, employeeData);
    
    console.log('✅ Employee added successfully!');
    console.log('Employee details:', insertResult.rows[0]);
    
    // Verify the insertion
    const verifyQuery = await client.query(
      'SELECT employee_id, branch_id, role, employee_name, status FROM employee_auth WHERE employee_id = $1',
      ['AGENT002']
    );
    
    if (verifyQuery.rows.length > 0) {
      console.log('✅ Verification successful - Employee found in database:');
      console.log(verifyQuery.rows[0]);
    } else {
      console.log('❌ Verification failed - Employee not found');
    }
    
  } catch (error) {
    console.error('❌ Error adding employee:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

// Run the function
addEmployee();
