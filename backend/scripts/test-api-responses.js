// Test script to verify API responses for both agents
const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testAPIResponses() {
  try {
    console.log('🧪 Testing API responses for both agents...');
    console.log('==========================================');
    
    // Test AGENT001 login and customer API
    console.log('1. Testing AGENT001 (agent@bt.com)...');
    const agent001Login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'agent@bt.com',
      password: 'password123',
      userType: 'employee'
    });
    
    const agent001Token = agent001Login.data.data.token;
    const agent001User = agent001Login.data.data.user;
    
    console.log(`✅ AGENT001 login successful`);
    console.log(`   Employee ID: ${agent001User.employee_id}`);
    console.log(`   Name: ${agent001User.employee_name}`);
    
    // Test AGENT001 customers API
    const agent001Customers = await axios.get(`${BASE_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${agent001Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 AGENT001 API Response:`);
    console.log(`   Success: ${agent001Customers.data.success}`);
    console.log(`   Total customers returned: ${agent001Customers.data.data.length}`);
    console.log(`   Pagination total: ${agent001Customers.data.pagination?.total || 'N/A'}`);
    console.log('   Customer IDs:', agent001Customers.data.data.map(c => c.customer_id).join(', '));
    console.log('');
    
    // Test AGENT002 login and customer API
    console.log('2. Testing AGENT002 (agent002@bt.com)...');
    const agent002Login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'agent002@bt.com',
      password: 'agent002123',
      userType: 'employee'
    });
    
    const agent002Token = agent002Login.data.data.token;
    const agent002User = agent002Login.data.data.user;
    
    console.log(`✅ AGENT002 login successful`);
    console.log(`   Employee ID: ${agent002User.employee_id}`);
    console.log(`   Name: ${agent002User.employee_name}`);
    
    // Test AGENT002 customers API
    const agent002Customers = await axios.get(`${BASE_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${agent002Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 AGENT002 API Response:`);
    console.log(`   Success: ${agent002Customers.data.success}`);
    console.log(`   Total customers returned: ${agent002Customers.data.data.length}`);
    console.log(`   Pagination total: ${agent002Customers.data.pagination?.total || 'N/A'}`);
    console.log('   Customer IDs:', agent002Customers.data.data.map(c => c.customer_id).join(', '));
    console.log('');
    
    // Summary
    console.log('📋 Summary:');
    console.log(`   AGENT001 (${agent001User.employee_name}): ${agent001Customers.data.data.length} customers`);
    console.log(`   AGENT002 (${agent002User.employee_name}): ${agent002Customers.data.data.length} customers`);
    
    if (agent001Customers.data.data.length === 10 && agent002Customers.data.data.length === 2) {
      console.log('');
      console.log('✅ API filtering is working correctly!');
      console.log('   The issue might be browser cache or frontend caching.');
      console.log('');
      console.log('🔧 Solutions to try:');
      console.log('   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
      console.log('   2. Open browser developer tools and clear application storage');
      console.log('   3. Try logging out and logging back in');
      console.log('   4. Check if you\'re using the correct login credentials');
    } else {
      console.log('');
      console.log('❌ API filtering is NOT working correctly!');
      console.log('   There might be an issue with the backend filtering logic.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAPIResponses();
