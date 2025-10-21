const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Creating admin user...');
    
    // Admin credentials
    const adminEmail = 'admin@btrust.com';
    const adminPassword = 'admin123';
    const adminId = 'ADMIN002';
    const adminName = 'B-Trust Admin';
    
    // Hash the password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT employee_id FROM employee_auth WHERE email = $1',
      [adminEmail]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists, updating password...');
      
      // Update existing admin password
      await client.query(
        'UPDATE employee_auth SET password_hash = $1, employee_name = $2 WHERE email = $3',
        [hashedPassword, adminName, adminEmail]
      );
      
      console.log('✅ Admin password updated successfully!');
    } else {
      // Create new admin user
      await client.query(`
        INSERT INTO employee_auth (
          employee_id, employee_name, email, password_hash, 
          role, branch_id, status, phone_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        adminId,
        adminName,
        adminEmail,
        hashedPassword,
        'Admin',
        1, // Default branch ID
        true,
        '0771234567'
      ]);
      
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('📋 Admin Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Employee ID: ${adminId}`);
    console.log(`   Role: Admin`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createAdminUser();
    console.log('🎉 Admin user setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createAdminUser };



