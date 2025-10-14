const axios = require('axios');

class RealSmsService {
  constructor() {
    this.apiToken = process.env.TEXT_LK_API_TOKEN;
    this.otpStore = new Map(); // Store OTPs for verification
    console.log('📱 Real SMS Service: Initialized');
    console.log('📱 API Token:', this.apiToken ? 'Set' : 'Not set');
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

  // Send SMS using multiple Text.lk endpoints
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

      // Use the correct Text.lk API endpoint
      const endpoint = 'https://app.text.lk/api/http/sms/send';
      
      try {
        console.log(`📱 Sending SMS via Text.lk API: ${endpoint}`);
        console.log(`📱 Phone: ${formattedPhone}`);
        console.log(`📱 Message: ${message}`);
        
        const response = await axios.post(endpoint, {
          api_token: this.apiToken,
          recipient: formattedPhone,
          sender_id: 'TextLKDemo',
          type: 'plain',
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
            delivered: true,
            endpoint: endpoint
          };
        } else {
          throw new Error(response.data.message || 'Text.lk API error');
        }
      } catch (error) {
        console.error('Text.lk API Error:', error.response?.data || error.message);
        
        // Fallback: Log the SMS details for manual sending
        console.log(`📱 [FALLBACK] SMS Details for manual sending:`);
        console.log(`📱 Phone: ${formattedPhone}`);
        console.log(`📱 Message: ${message}`);
        console.log(`📱 API Token: ${this.apiToken}`);
        console.log(`📱 You can manually send this SMS via Text.lk dashboard`);
        
        return {
          success: true,
          messageId: `fallback_${Date.now()}`,
          phoneNumber: formattedPhone,
          message,
          timestamp: new Date().toISOString(),
          provider: 'textlk',
          fallback: true,
          error: error.message
        };
      }

    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  // Send OTP SMS
  async sendOTP(phoneNumber, otpCode, transactionAmount, accountNumber) {
    let message;
    if (transactionAmount === 0 || accountNumber === 'PHONE_VERIFICATION') {
      message = `B-Trust Bank: Your phone verification OTP is: ${otpCode}. Valid for 5 minutes. Do not share with anyone.`;
    } else {
      message = `B-Trust Bank: Your OTP for transaction of LKR ${transactionAmount.toLocaleString()} from account ${accountNumber} is: ${otpCode}. Valid for 5 minutes.`;
    }
    return await this.sendSMS(phoneNumber, message);
  }

  // Generate and store OTP
  generateOTP(phoneNumber) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    this.otpStore.set(phoneNumber, { otp, expiry });
    console.log(`📱 Generated OTP for ${phoneNumber}: ${otp}`);
    return otp;
  }

  // Send transaction OTP
  async sendTransactionOTP(phoneNumber, transactionAmount, accountNumber) {
    const otpCode = this.generateOTP(phoneNumber);
    
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
    const storedOtp = this.otpStore.get(phoneNumber);
    
    if (!storedOtp) {
      console.log(`📱 OTP verification for ${phoneNumber}: ${code} - NO OTP FOUND`);
      return {
        success: true,
        valid: false,
        phoneNumber,
        code,
        transactionAmount,
        timestamp: new Date().toISOString(),
        error: 'No OTP found for this phone number'
      };
    }
    
    if (storedOtp.expiry < Date.now()) {
      console.log(`📱 OTP verification for ${phoneNumber}: ${code} - EXPIRED`);
      this.otpStore.delete(phoneNumber);
      return {
        success: true,
        valid: false,
        phoneNumber,
        code,
        transactionAmount,
        timestamp: new Date().toISOString(),
        error: 'OTP has expired'
      };
    }
    
    const isValid = storedOtp.otp === code;
    console.log(`📱 OTP verification for ${phoneNumber}: ${code} - ${isValid ? 'VALID' : 'INVALID'} (Expected: ${storedOtp.otp})`);
    
    if (isValid) {
      this.otpStore.delete(phoneNumber); // Remove OTP after successful verification
    }
    
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

module.exports = new RealSmsService();
