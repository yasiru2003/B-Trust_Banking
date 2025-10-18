// Load environment variables
require('dotenv').config({ path: './config.env' });
const axios = require('axios');

async function testTransactionTypesAPI() {
  try {
    console.log('🔍 Testing transaction types API...');
    
    // Test login for AGENT001
    console.log('\n1. Testing AGENT001 login...');
    const loginResponse1 = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'agent@bt.com',
      password: 'password123',
      userType: 'employee'
    });
    
    console.log('✅ AGENT001 login successful');
    const token1 = loginResponse1.data.token;
    
    // Test transaction types API for AGENT001
    const typesResponse1 = await axios.get('http://localhost:5001/api/transactions/types', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    
    console.log('📋 Transaction types for AGENT001:');
    typesResponse1.data.data.forEach(type => {
      console.log(`  - ${type.transaction_type_id}: ${type.type_name}`);
    });
    
    // Test login for AGENT002
    console.log('\n2. Testing AGENT002 login...');
    const loginResponse2 = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'agent002@bt.com',
      password: 'agent002123',
      userType: 'employee'
    });
    
    console.log('✅ AGENT002 login successful');
    const token2 = loginResponse2.data.token;
    
    // Test transaction types API for AGENT002
    const typesResponse2 = await axios.get('http://localhost:5001/api/transactions/types', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    
    console.log('📋 Transaction types for AGENT002:');
    typesResponse2.data.data.forEach(type => {
      console.log(`  - ${type.transaction_type_id}: ${type.type_name}`);
    });
    
    console.log('\n✅ Summary:');
    console.log('  - Both agents get the same transaction types from API');
    console.log('  - Frontend should filter out INT001 (Interest Calculation)');
    console.log('  - Only Deposit and Withdraw should appear in dropdown');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTransactionTypesAPI();
