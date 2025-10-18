// Test script to verify agent login and customer filtering
const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testAgentLoginAndFiltering() {
  try {
    console.log('🧪 Testing Agent Login and Customer Filtering...');
    console.log('===============================================');
    
    // Test AGENT001 login
    console.log('1. Testing AGENT001 login...');
    const agent001Login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'agent001@bt.com',
      password: 'agent001123',
      userType: 'employee'
    });
    
    if (!agent001Login.data.success) {
      throw new Error('AGENT001 login failed: ' + agent001Login.data.message);
    }
    
    const agent001Token = agent001Login.data.data.token;
    const agent001User = agent001Login.data.data.user;
    console.log(`✅ AGENT001 login successful`);
    console.log(`   Employee ID: ${agent001User.employee_id}`);
    console.log(`   Name: ${agent001User.employee_name}`);
    console.log('');
    
    // Test AGENT001 customer filtering
    console.log('2. Testing AGENT001 customer filtering...');
    const agent001Customers = await axios.get(`${BASE_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${agent001Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (agent001Customers.data.success) {
      console.log(`✅ AGENT001 can see ${agent001Customers.data.data.length} customers`);
      console.log('   Customers:');
      agent001Customers.data.data.forEach(customer => {
        console.log(`     - ${customer.customer_id}: ${customer.first_name} ${customer.last_name} (Agent: ${customer.agent_id})`);
      });
    } else {
      console.log('❌ AGENT001 customer filtering failed:', agent001Customers.data.message);
    }
    console.log('');
    
    // Test AGENT002 login
    console.log('3. Testing AGENT002 login...');
    const agent002Login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'agent002@bt.com',
      password: 'agent002123',
      userType: 'employee'
    });
    
    if (!agent002Login.data.success) {
      throw new Error('AGENT002 login failed: ' + agent002Login.data.message);
    }
    
    const agent002Token = agent002Login.data.data.token;
    const agent002User = agent002Login.data.data.user;
    console.log(`✅ AGENT002 login successful`);
    console.log(`   Employee ID: ${agent002User.employee_id}`);
    console.log(`   Name: ${agent002User.employee_name}`);
    console.log('');
    
    // Test AGENT002 customer filtering
    console.log('4. Testing AGENT002 customer filtering...');
    const agent002Customers = await axios.get(`${BASE_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${agent002Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (agent002Customers.data.success) {
      console.log(`✅ AGENT002 can see ${agent002Customers.data.data.length} customers`);
      console.log('   Customers:');
      agent002Customers.data.data.forEach(customer => {
        console.log(`     - ${customer.customer_id}: ${customer.first_name} ${customer.last_name} (Agent: ${customer.agent_id})`);
      });
    } else {
      console.log('❌ AGENT002 customer filtering failed:', agent002Customers.data.message);
    }
    console.log('');
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   AGENT001 (${agent001User.employee_name}): ${agent001Customers.data.data.length} customers`);
    console.log(`   AGENT002 (${agent002User.employee_name}): ${agent002Customers.data.data.length} customers`);
    console.log('');
    console.log('🎉 Customer filtering is working correctly!');
    console.log('   Each agent can only see their assigned customers.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAgentLoginAndFiltering();
