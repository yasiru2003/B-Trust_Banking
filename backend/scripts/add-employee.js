// Load environment variables
require('dotenv').config({ path: '../config.env' });
const db = require('../config/database');

async function addEmployee() {
  try {
    console.log('🔄 Adding employee to employee_auth table...');
    
    // First, let's check if the employee already exists
    const existingEmployee = await db.query(
      'SELECT employee_id FROM employee_auth WHERE employee_id = $1',
      ['AGENT002']
    );
    
    if (existingEmployee.rows.length > 0) {
      console.log('⚠️  Employee AGENT002 already exists in the database');
      return;
    }
    
    // Check if branch_id = 1 exists
    const branchCheck = await db.query(
      'SELECT branch_id FROM branch WHERE branch_id = $1',
      [1]
    );
    
    if (branchCheck.rows.length === 0) {
      console.log('❌ Branch with ID 1 does not exist. Please create the branch first.');
      return;
    }
    
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
    
    const result = await db.query(insertQuery, employeeData);
    
    console.log('✅ Employee added successfully!');
    console.log('Employee details:', result.rows[0]);
    
    // Verify the insertion
    const verifyQuery = await db.query(
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
    // Close database connection
    await db.close();
    process.exit(0);
  }
}

// Run the function
addEmployee();
