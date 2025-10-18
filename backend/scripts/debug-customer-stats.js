// Debug script to check customer stats filtering
const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function debugCustomerStats() {
  try {
    console.log('🔍 Debugging customer stats filtering...');
    console.log('=====================================');
    
    // Test AGENT002 login and customer stats
    console.log('1. Testing AGENT002 customer stats...');
    const agent002Login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'agent002@bt.com',
      password: 'agent002123',
      userType: 'employee'
    });
    
    const agent002Token = agent002Login.data.data.token;
    const agent002User = agent002Login.data.data.user;
    
    console.log(`✅ AGENT002 login successful`);
    console.log(`   Employee ID: ${agent002User.employee_id}`);
    console.log(`   Role: ${agent002User.role}`);
    console.log(`   Name: ${agent002User.employee_name}`);
    console.log('');
    
    // Test AGENT002 customer stats API
    const agent002Stats = await axios.get(`${BASE_URL}/api/customers/stats`, {
      headers: {
        'Authorization': `Bearer ${agent002Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 AGENT002 Customer Stats:`);
    console.log(`   Success: ${agent002Stats.data.success}`);
    console.log(`   Total customers: ${agent002Stats.data.data.total_customers}`);
    console.log(`   Verified customers: ${agent002Stats.data.data.verified_customers}`);
    console.log(`   Unverified customers: ${agent002Stats.data.data.unverified_customers}`);
    console.log(`   Phone verified: ${agent002Stats.data.data.phone_verified_customers}`);
    console.log('');
    
    // Test AGENT001 login and customer stats
    console.log('2. Testing AGENT001 customer stats...');
    const agent001Login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'agent@bt.com',
      password: 'password123',
      userType: 'employee'
    });
    
    const agent001Token = agent001Login.data.data.token;
    const agent001User = agent001Login.data.data.user;
    
    console.log(`✅ AGENT001 login successful`);
    console.log(`   Employee ID: ${agent001User.employee_id}`);
    console.log(`   Role: ${agent001User.role}`);
    console.log(`   Name: ${agent001User.employee_name}`);
    console.log('');
    
    // Test AGENT001 customer stats API
    const agent001Stats = await axios.get(`${BASE_URL}/api/customers/stats`, {
      headers: {
        'Authorization': `Bearer ${agent001Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 AGENT001 Customer Stats:`);
    console.log(`   Success: ${agent001Stats.data.success}`);
    console.log(`   Total customers: ${agent001Stats.data.data.total_customers}`);
    console.log(`   Verified customers: ${agent001Stats.data.data.verified_customers}`);
    console.log(`   Unverified customers: ${agent001Stats.data.data.unverified_customers}`);
    console.log(`   Phone verified: ${agent001Stats.data.data.phone_verified_customers}`);
    console.log('');
    
    // Summary
    console.log('📋 Summary:');
    console.log(`   AGENT001: ${agent001Stats.data.data.total_customers} customers`);
    console.log(`   AGENT002: ${agent002Stats.data.data.total_customers} customers`);
    
    if (agent001Stats.data.data.total_customers === 13 && agent002Stats.data.data.total_customers === 2) {
      console.log('');
      console.log('✅ Customer stats filtering is working correctly!');
    } else {
      console.log('');
      console.log('❌ Customer stats filtering is NOT working correctly!');
      console.log('   Expected: AGENT001=13, AGENT002=2');
      console.log('   Actual: AGENT001=' + agent001Stats.data.data.total_customers + ', AGENT002=' + agent002Stats.data.data.total_customers);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugCustomerStats();
