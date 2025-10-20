const axios = require('axios');

async function testFDAPI() {
  try {
    console.log('🧪 Testing FD API...');
    console.log('===================');
    
    // Step 1: Login as agent
    console.log('1. Logging in as agent...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'agent@bt.com',
      password: 'password123',
      userType: 'employee'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Agent login failed: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Agent login successful');
    console.log('');

    // Step 2: Test FD types
    console.log('2. Testing FD types...');
    const fdTypesResponse = await axios.get('http://localhost:5001/api/fixed-deposits/types', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (fdTypesResponse.data.success) {
      console.log('✅ FD types loaded successfully');
      console.log(`   Found ${fdTypesResponse.data.data.length} FD type(s)`);
    } else {
      console.log('❌ FD types failed:', fdTypesResponse.data.message);
    }
    console.log('');

    // Step 3: Test FD listing
    console.log('3. Testing FD listing...');
    const fdListResponse = await axios.get('http://localhost:5001/api/fixed-deposits?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (fdListResponse.data.success) {
      console.log('✅ FD listing successful');
      console.log(`   Found ${fdListResponse.data.pagination.total} FD(s)`);
      console.log(`   Showing ${fdListResponse.data.data.length} FD(s)`);
    } else {
      console.log('❌ FD listing failed:', fdListResponse.data.message);
    }
    console.log('');

    console.log('🎉 FD API test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ FD API test failed:');
    console.error('========================');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Check if the server is running on http://localhost:5001');
    } else {
      console.error('Request setup error:', error.message);
    }
  }
}

// Wait a bit for server to start, then test
setTimeout(() => {
  testFDAPI();
}, 3000);














