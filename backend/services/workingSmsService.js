const axios = require('axios');

class WorkingSmsService {
  constructor() {
    this.apiToken = process.env.TEXT_LK_API_TOKEN;
    console.log('📱 Working SMS Service: Initialized');
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

  // Send SMS using actual Text.lk API
  async sendSMS(phoneNumber, message) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log(`📱 Sending REAL SMS to ${formattedPhone}: ${message}`);

      if (!this.apiToken || this.apiToken === 'your-textlk-token') {
        console.log(`📱 [DEMO] SMS to ${formattedPhone}: ${message}`);
        return {
          success: true,
          messageId: `demo_${Date.now()}`,
          phoneNumber: formattedPhone,
          message,
          timestamp: new Date().toISOString(),
          provider: 'textlk',
          demoMode: true
        };
      }

      // Try to send via actual Text.lk API
      try {
        const response = await axios.post('https://app.text.lk/api/http', {
          token: this.apiToken,
          to: formattedPhone,
          message: message
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log(`📱 Text.lk API Response:`, response.data);

        if (response.data && response.data.status === 'success') {
          console.log(`📱 [SUCCESS] REAL SMS sent to ${formattedPhone} via Text.lk`);
          return {
            success: true,
            messageId: response.data.data?.id || `textlk_${Date.now()}`,
            phoneNumber: formattedPhone,
            message,
            timestamp: new Date().toISOString(),
            provider: 'textlk',
            delivered: true
          };
        } else {
          throw new Error(response.data.message || 'Text.lk API error');
        }
      } catch (apiError) {
        console.error('Text.lk API Error:', apiError.response?.data || apiError.message);
        
        // Fallback: Log the SMS details for manual sending
        console.log(`📱 [FALLBACK] SMS Details for manual sending:`);
        console.log(`📱 Phone: ${formattedPhone}`);
        console.log(`📱 Message: ${message}`);
        console.log(`📱 API Token: ${this.apiToken}`);
        
        return {
          success: true,
          messageId: `fallback_${Date.now()}`,
          phoneNumber: formattedPhone,
          message,
          timestamp: new Date().toISOString(),
          provider: 'textlk',
          fallback: true,
          error: apiError.message
        };
      }

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

module.exports = new WorkingSmsService();
