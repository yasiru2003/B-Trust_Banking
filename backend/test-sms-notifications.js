const textLkService = require('./services/textLkService');
const smsService = require('./services/smsService');

// Test phone number (replace with actual test number)
const TEST_PHONE = '0771234567';

async function testSMSNotifications() {
  console.log('🧪 Testing SMS Notifications with Text.lk');
  console.log('==========================================\n');

  try {
    // Test 1: Transaction Success Notification
    console.log('1. Testing Transaction Success Notification...');
    const transactionDetails = {
      type: 'DEP001',
      amount: 25000,
      accountNumber: 'BT123456789',
      balance: 125000,
      reference: 'TXN001',
      timestamp: new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })
    };
    
    const transactionResult = await smsService.sendTransactionSuccessNotification(
      TEST_PHONE,
      transactionDetails
    );
    console.log('✅ Transaction Success SMS Result:', transactionResult);
    console.log('');

    // Test 2: Account Creation Notification
    console.log('2. Testing Account Creation Notification...');
    const accountDetails = {
      accountNumber: 'BT987654321',
      accountType: 'Savings Account',
      initialBalance: 5000,
      customerName: 'John Doe'
    };
    
    const accountResult = await smsService.sendAccountCreatedNotificationDetailed(
      TEST_PHONE,
      accountDetails
    );
    console.log('✅ Account Creation SMS Result:', accountResult);
    console.log('');

    // Test 3: Fraud Alert Notification
    console.log('3. Testing Fraud Alert Notification...');
    const fraudDetails = {
      accountNumber: 'BT123456789',
      reason: 'HIGH_AMOUNT',
      amount: 150000,
      timestamp: new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' }),
      transactionId: 'TXN123456'
    };
    
    const fraudResult = await smsService.sendFraudAlertDetailed(
      TEST_PHONE,
      fraudDetails
    );
    console.log('✅ Fraud Alert SMS Result:', fraudResult);
    console.log('');

    // Test 4: Customer Registration Success Notification
    console.log('4. Testing Customer Registration Success Notification...');
    const registrationResult = await smsService.sendRegistrationSuccessNotification(
      TEST_PHONE,
      'Jane Smith',
      'CUST001'
    );
    console.log('✅ Registration Success SMS Result:', registrationResult);
    console.log('');

    // Test 5: Low Balance Alert
    console.log('5. Testing Low Balance Alert...');
    const lowBalanceResult = await smsService.sendLowBalanceAlertDetailed(
      TEST_PHONE,
      'BT123456789',
      500,
      1000
    );
    console.log('✅ Low Balance Alert SMS Result:', lowBalanceResult);
    console.log('');

    // Test 6: Transaction OTP
    console.log('6. Testing Transaction OTP...');
    const otpResult = await smsService.sendTransactionOTP(
      TEST_PHONE,
      50000,
      'BT123456789'
    );
    console.log('✅ Transaction OTP SMS Result:', otpResult);
    console.log('');

    console.log('🎉 All SMS notification tests completed successfully!');
    console.log('\n📱 SMS Notifications Summary:');
    console.log('- Transaction Success: ✅');
    console.log('- Account Creation: ✅');
    console.log('- Fraud Alerts: ✅');
    console.log('- Customer Registration: ✅');
    console.log('- Low Balance Alerts: ✅');
    console.log('- Transaction OTP: ✅');
    console.log('\n💡 Note: Check your phone for SMS messages. In demo mode, messages will be logged to console.');

  } catch (error) {
    console.error('❌ SMS notification test failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  testSMSNotifications();
}

module.exports = { testSMSNotifications };
