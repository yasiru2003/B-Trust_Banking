const axios = require('axios');

class TextLkService {
  constructor() {
    this.apiToken = process.env.TEXT_LK_API_TOKEN;
    this.apiUrl = process.env.TEXT_LK_API_URL;
    
    console.log('📱 Text.lk API Token:', this.apiToken ? 'Set' : 'Not set');
    console.log('📱 Text.lk API URL:', this.apiUrl);
    
    if (this.apiToken && this.apiToken !== 'your-textlk-token') {
      console.log('📱 Text.lk SMS Service: Configured successfully');
    } else {
      console.log('📱 Text.lk SMS Service: Not configured, using demo mode');
    }
  }

  // Format phone number for Sri Lankan format
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, remove it and add 94
    if (cleaned.startsWith('0')) {
      return '94' + cleaned.substring(1);
    }
    
    // If it doesn't start with 94, add it
    if (!cleaned.startsWith('94')) {
      return '94' + cleaned;
    }
    
    return cleaned;
  }

  // Send SMS using Text.lk API
  async sendSMS(phoneNumber, message) {
    try {
      if (!this.apiToken || this.apiToken === 'your-textlk-token') {
        console.log(`📱 [DEMO] SMS to ${phoneNumber}: ${message}`);
        return {
          success: true,
          messageId: `demo_${Date.now()}`,
          phoneNumber,
          message,
          timestamp: new Date().toISOString(),
          demoMode: true
        };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log(`📱 Sending SMS via Text.lk to ${formattedPhone}: ${message}`);

      // Try different Text.lk API endpoints
      const endpoints = [
        'https://app.text.lk/api/http',
        'https://app.text.lk/api/v3/sms',
        'https://app.text.lk/api/sms'
      ];

      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`📱 Trying endpoint: ${endpoint}`);
          
          const response = await axios.post(endpoint, {
            token: this.apiToken,
            to: formattedPhone,
            message: message
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          console.log(`📱 Text.lk SMS response from ${endpoint}:`, response.data);

          if (response.data.status === 'success') {
            return {
              success: true,
              messageId: response.data.data?.id || `textlk_${Date.now()}`,
              phoneNumber: formattedPhone,
              message,
              timestamp: new Date().toISOString(),
              provider: 'textlk',
              endpoint: endpoint
            };
          } else {
            lastError = new Error(response.data.message || 'Failed to send SMS via Text.lk');
          }
        } catch (error) {
          console.log(`📱 Endpoint ${endpoint} failed:`, error.message);
          lastError = error;
        }
      }

      throw lastError || new Error('All Text.lk endpoints failed');

    } catch (error) {
      console.error('Text.lk SMS sending failed:', error);
      
      // Fallback to demo mode
      console.log(`📱 [FALLBACK] SMS to ${phoneNumber}: [DEMO] ${message}`);
      return {
        success: true,
        messageId: `demo_fallback_${Date.now()}`,
        phoneNumber,
        message,
        timestamp: new Date().toISOString(),
        fallback: true,
        error: error.message
      };
    }
  }

  // Send OTP SMS
  async sendOTP(phoneNumber, otpCode, transactionAmount, accountNumber) {
    const message = `B-Trust Bank: Your OTP for transaction of LKR ${transactionAmount.toLocaleString()} from account ${accountNumber} is: ${otpCode}. Valid for 5 minutes.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send transaction success notification
  async sendTransactionSuccess(phoneNumber, transactionDetails) {
    const { type, amount, accountNumber, balance, reference, timestamp } = transactionDetails;
    const transactionType = type === 'DEP001' ? 'Deposit' : type === 'WIT001' ? 'Withdrawal' : 'Transaction';
    const action = type === 'DEP001' ? 'credited to' : 'debited from';
    
    const message = `B-Trust Bank: ${transactionType} successful! LKR ${amount.toLocaleString()} ${action} account ${accountNumber}. New balance: LKR ${balance.toLocaleString()}. Ref: ${reference || 'N/A'}. ${timestamp}`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send account creation success notification
  async sendAccountCreated(phoneNumber, accountDetails) {
    const { accountNumber, accountType, initialBalance, customerName } = accountDetails;
    
    const message = `B-Trust Bank: Welcome ${customerName}! Your ${accountType} account ${accountNumber} has been created successfully. Initial balance: LKR ${initialBalance.toLocaleString()}. You can now perform transactions through our agents.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send fraud alert notification
  async sendFraudAlert(phoneNumber, fraudDetails) {
    const { accountNumber, reason, amount, timestamp, transactionId } = fraudDetails;
    
    const message = `B-Trust Bank FRAUD ALERT: Suspicious activity detected on account ${accountNumber}. Reason: ${reason}. Amount: LKR ${amount.toLocaleString()}. Transaction ID: ${transactionId}. Please contact your agent immediately or call our hotline. Do not share your account details.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send low balance alert
  async sendLowBalanceAlert(phoneNumber, accountNumber, currentBalance, threshold = 1000) {
    const message = `B-Trust Bank: Low balance alert! Your account ${accountNumber} balance is LKR ${currentBalance.toLocaleString()}, below the threshold of LKR ${threshold.toLocaleString()}. Please visit your agent to deposit funds.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send customer registration success notification
  async sendRegistrationSuccess(phoneNumber, customerName, customerId) {
    const message = `B-Trust Bank: Welcome ${customerName}! Your customer account (ID: ${customerId}) has been created successfully. You can now open bank accounts and perform transactions through our agents. Thank you for choosing B-Trust Bank!`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Send transaction OTP
  async sendTransactionOTP(phoneNumber, transactionAmount, accountNumber) {
    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📱 Generated OTP for ${phoneNumber}: ${otpCode}`);
    
    // Send the OTP
    const result = await this.sendOTP(phoneNumber, otpCode, transactionAmount, accountNumber);
    
    // Store the OTP for verification (in a real app, you'd store this in a database)
    // For now, we'll just log it
    console.log(`📱 OTP ${otpCode} sent to ${phoneNumber} for transaction ${transactionAmount}`);
    
    return {
      ...result,
      otpCode: otpCode, // In production, don't return this
      transactionAmount,
      accountNumber
    };
  }

  // Verify OTP (simple implementation)
  async verifyOTP(phoneNumber, code, transactionAmount) {
    // In a real implementation, you'd check against stored OTPs
    // For demo purposes, accept any 6-digit code
    const isValid = /^\d{6}$/.test(code);
    
    console.log(`📱 OTP verification for ${phoneNumber}: ${code} - ${isValid ? 'VALID' : 'INVALID'}`);
    
    return {
      success: true,
      valid: isValid,
      phoneNumber,
      code,
      transactionAmount,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new TextLkService();
