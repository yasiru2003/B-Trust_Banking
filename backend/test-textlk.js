require('dotenv').config({ path: './config.env' });

console.log('Environment Variables:');
console.log('TEXT_LK_API_TOKEN:', process.env.TEXT_LK_API_TOKEN ? 'Set' : 'Not set');
console.log('TEXT_LK_API_URL:', process.env.TEXT_LK_API_URL);

const textLkService = require('./services/textLkService');

// Test sending SMS
async function testSMS() {
  try {
    console.log('\nTesting SMS...');
    const result = await textLkService.sendSMS('0760159557', 'Test SMS from B-Trust Bank');
    console.log('SMS Result:', result);
  } catch (error) {
    console.error('SMS Test Error:', error);
  }
}

testSMS();
