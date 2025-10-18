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

async function addCustomers() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding customers to customer table...');
    
    // Customer data
    const customers = [
      {
        customer_id: 'CUST015',
        agent_id: 'AGENT002',
        branch_id: 1,
        first_name: 'Dehan',
        last_name: 'Wijesinghe',
        gender: 'Male',
        date_of_birth: '2003-05-12',
        address: '110,Moratuwa',
        nic_number: '200345678987',
        phone_number: '0715678932',
        phone_is_verified: true,
        email: 'dehan.wijesinghe@email.com',
        kyc_status: false
      },
      {
        customer_id: 'CUST016',
        agent_id: 'AGENT002',
        branch_id: 1,
        first_name: 'Navoda',
        last_name: 'Jalanee',
        gender: 'Female',
        date_of_birth: '2003-12-11',
        address: '95, Matara',
        nic_number: '200356400986',
        phone_number: '0775458893',
        phone_is_verified: true,
        email: 'navoda.jalanee@email.com',
        kyc_status: false
      }
    ];
    
    // Check if agent AGENT002 exists
    const agentCheck = await client.query(
      'SELECT employee_id FROM employee_auth WHERE employee_id = $1',
      ['AGENT002']
    );
    
    if (agentCheck.rows.length === 0) {
      console.log('❌ Agent AGENT002 does not exist. Please create the agent first.');
      return;
    }
    
    console.log('✅ Agent AGENT002 exists, proceeding with customer creation...');
    
    // Check if branch_id = 1 exists
    const branchCheck = await client.query(
      'SELECT branch_id FROM branch WHERE branch_id = $1',
      [1]
    );
    
    if (branchCheck.rows.length === 0) {
      console.log('❌ Branch with ID 1 does not exist. Please create the branch first.');
      return;
    }
    
    console.log('✅ Branch ID 1 exists, proceeding with customer creation...');
    
    // Insert customers one by one
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      try {
        // Check if customer already exists
        const existingCustomer = await client.query(
          'SELECT customer_id FROM customer WHERE customer_id = $1',
          [customer.customer_id]
        );
        
        if (existingCustomer.rows.length > 0) {
          console.log(`⚠️  Customer ${customer.customer_id} already exists in the database`);
          continue;
        }
        
        // Check for duplicate NIC
        const existingNIC = await client.query(
          'SELECT customer_id FROM customer WHERE nic_number = $1',
          [customer.nic_number]
        );
        
        if (existingNIC.rows.length > 0) {
          console.log(`⚠️  Customer with NIC ${customer.nic_number} already exists`);
          continue;
        }
        
        // Check for duplicate phone
        const existingPhone = await client.query(
          'SELECT customer_id FROM customer WHERE phone_number = $1',
          [customer.phone_number]
        );
        
        if (existingPhone.rows.length > 0) {
          console.log(`⚠️  Customer with phone ${customer.phone_number} already exists`);
          continue;
        }
        
        // Insert the customer
        const insertQuery = `
          INSERT INTO customer (
            customer_id, agent_id, branch_id, first_name, last_name, 
            gender, date_of_birth, address, nic_number, phone_number, 
            phone_is_verified, email, kyc_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `;
        
        const customerData = [
          customer.customer_id,
          customer.agent_id,
          customer.branch_id,
          customer.first_name,
          customer.last_name,
          customer.gender,
          customer.date_of_birth,
          customer.address,
          customer.nic_number,
          customer.phone_number,
          customer.phone_is_verified,
          customer.email,
          customer.kyc_status
        ];
        
        const insertResult = await client.query(insertQuery, customerData);
        
        console.log(`✅ Customer ${customer.customer_id} added successfully!`);
        console.log(`   Name: ${customer.first_name} ${customer.last_name}`);
        console.log(`   Phone: ${customer.phone_number}`);
        console.log(`   NIC: ${customer.nic_number}`);
        console.log(`   Address: ${customer.address}`);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Error adding customer ${customer.customer_id}:`, error.message);
      }
    }
    
    // Verify the insertions
    console.log('🔍 Verifying customer insertions...');
    const verifyQuery = await client.query(
      'SELECT customer_id, first_name, last_name, phone_number, nic_number FROM customer WHERE customer_id IN ($1, $2) ORDER BY customer_id',
      ['CUST015', 'CUST016']
    );
    
    if (verifyQuery.rows.length > 0) {
      console.log('✅ Verification successful - Customers found in database:');
      verifyQuery.rows.forEach(customer => {
        console.log(`   ${customer.customer_id}: ${customer.first_name} ${customer.last_name} (${customer.phone_number})`);
      });
    } else {
      console.log('❌ Verification failed - No customers found');
    }
    
  } catch (error) {
    console.error('❌ Error adding customers:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

// Run the function
addCustomers();
