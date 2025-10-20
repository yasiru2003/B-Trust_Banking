const fraudDetectionService = require('./services/fraudDetectionService');

async function testFraudDetection() {
  try {
    console.log('🔍 Testing fraud detection system...');
    
    // Test transaction data
    const testTransaction = {
      transaction_id: 'TXN9999999',
      transaction_type_id: 'WIT001',
      account_number: 'BT52204632982',
      amount: 1500000,
      customer_id: 'CUST014',
      date: new Date()
    };
    
    console.log('📊 Analyzing transaction:', testTransaction.transaction_id);
    
    // Run fraud detection
    const alerts = await fraudDetectionService.analyzeTransaction(testTransaction);
    
    console.log(`✅ Fraud detection completed. Generated ${alerts.length} alerts:`);
    
    alerts.forEach((alert, index) => {
      console.log(`\n🚨 Alert ${index + 1}:`);
      console.log(`   Rule ID: ${alert.rule_id}`);
      console.log(`   Severity: ${alert.severity}`);
      console.log(`   Fraud Score: ${alert.fraud_score}`);
      console.log(`   Description: ${alert.description}`);
    });
    
    // Test recent transactions analysis
    console.log('\n🔍 Running fraud detection on recent transactions...');
    const result = await fraudDetectionService.runFraudDetectionOnRecentTransactions(24);
    console.log(`✅ Recent analysis completed: ${result.alertsGenerated} alerts from ${result.transactionsAnalyzed} transactions`);
    
    // Get fraud stats
    console.log('\n📈 Getting fraud statistics...');
    const stats = await fraudDetectionService.getFraudStats();
    console.log('📊 Fraud Statistics:', stats);
    
  } catch (error) {
    console.error('❌ Fraud detection test failed:', error);
  }
}

// Run the test
testFraudDetection().then(() => {
  console.log('\n✅ Fraud detection test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

