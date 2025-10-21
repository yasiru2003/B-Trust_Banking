require('dotenv').config({ path: './config.env' });

console.log('Testing Working SMS Service...');

const workingSmsService = require('./services/workingSmsService');

// Test sending SMS
async function testSMS() {
  try {
    console.log('\nTesting SMS...');
    const result = await workingSmsService.sendSMS('0760159557', 'Test SMS from B-Trust Bank - Working Service');
    console.log('SMS Result:', result);
  } catch (error) {
    console.error('SMS Test Error:', error);
  }
}

// Test sending OTP
async function testOTP() {
  try {
    console.log('\nTesting OTP...');
    const result = await workingSmsService.sendTransactionOTP('0760159557', 25000, 'BT86583071977');
    console.log('OTP Result:', result);
  } catch (error) {
    console.error('OTP Test Error:', error);
  }
}

async function runTests() {
  await testSMS();
  await testOTP();
}

runTests();





















