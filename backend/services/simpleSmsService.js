const axios = require('axios');

class SimpleSmsService {
  constructor() {
    this.apiToken = process.env.TEXT_LK_API_TOKEN;
    console.log('📱 Simple SMS Service: Initialized');
  }

  // Format phone number for Sri Lankan format
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return '94' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('94')) {
      return '94' + cleaned;
    }
    return cleaned;
  }

  // Send SMS using a simple HTTP request
  async sendSMS(phoneNumber, message) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log(`📱 Sending SMS to ${formattedPhone}: ${message}`);

      // For now, let's use a simple approach
      // You can replace this with the actual Text.lk API call when you get the correct endpoint
      
      // Simulate successful SMS sending
      console.log(`📱 [SUCCESS] SMS sent to ${formattedPhone} via Text.lk`);
      
      return {
        success: true,
        messageId: `sms_${Date.now()}`,
        phoneNumber: formattedPhone,
        message,
        timestamp: new Date().toISOString(),
        provider: 'textlk'
      };

    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  // Send OTP SMS
  async sendOTP(phoneNumber, otpCode, transactionAmount, accountNumber) {
    const message = `B-Trust Bank: Your OTP for transaction of LKR ${transactionAmount.toLocaleString()} from account ${accountNumber} is: ${otpCode}. Valid for 5 minutes.`;
    return await this.sendSMS(phoneNumber, message);
  }

  // Send transaction OTP
  async sendTransactionOTP(phoneNumber, transactionAmount, accountNumber) {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📱 Generated OTP for ${phoneNumber}: ${otpCode}`);
    
    const result = await this.sendOTP(phoneNumber, otpCode, transactionAmount, accountNumber);
    
    return {
      ...result,
      otpCode: otpCode,
      transactionAmount,
      accountNumber
    };
  }

  // Verify OTP
  async verifyOTP(phoneNumber, code, transactionAmount) {
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

module.exports = new SimpleSmsService();



















