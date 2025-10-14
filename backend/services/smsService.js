const twilio = require('twilio');
const textLkService = require('./textLkService');
const simpleSmsService = require('./simpleSmsService');
const workingSmsService = require('./workingSmsService');
const realSmsService = require('./realSmsService');

class SMSService {
  constructor() {
    // Initialize Real SMS Service as primary
    this.realSmsService = realSmsService;
    console.log('📱 SMS Service: Real SMS configured as primary service');
    
    // Initialize Working SMS Service as backup
    this.workingSmsService = workingSmsService;
    console.log('📱 SMS Service: Working SMS configured as backup');
    
    // Initialize Simple SMS Service as backup
    this.simpleSmsService = simpleSmsService;
    console.log('📱 SMS Service: Simple SMS configured as backup');
    
    // Initialize Text.lk as backup
    this.textLkService = textLkService;
    console.log('📱 SMS Service: Text.lk configured as backup');
    
    // Initialize Twilio as backup
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
        process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-sid') {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      console.log('📱 SMS Service: Twilio configured as backup');
    } else {
      this.client = null;
      this.verifyServiceSid = null;
      console.log('📱 SMS Service: Twilio not configured');
    }
  }

  // Send SMS to rural users (simplified messages in local language)
  async sendSMS(phoneNumber, message, language = 'en') {
    try {
      // For demo purposes, we'll just log the SMS
      // In production, this would send actual SMS via Twilio
      console.log(`📱 SMS to ${phoneNumber}: ${message}`);
      
      // Simulate SMS sending
      const result = {
        success: true,
        messageId: `sms_${Date.now()}`,
        phoneNumber,
        message,
        timestamp: new Date().toISOString()
      };

      return result;
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  // Send account balance notification
  async sendBalanceNotification(customerId, accountNumber, balance) {
    const message = `Your account ${accountNumber} balance: LKR ${balance.toLocaleString()}. B-Trust Bank`;
    return await this.sendSMS(customerId, message);
  }

  // Send transaction confirmation
  async sendTransactionConfirmation(customerId, transactionType, amount, accountNumber) {
    const message = `Transaction confirmed: ${transactionType} of LKR ${amount.toLocaleString()} from account ${accountNumber}. B-Trust Bank`;
    return await this.sendSMS(customerId, message);
  }

  // Send detailed transaction success notification using text.lk
  async sendTransactionSuccessNotification(phoneNumber, transactionDetails) {
    try {
      console.log(`📱 Sending transaction success notification via Text.lk to ${phoneNumber}`);
      
      const result = await this.textLkService.sendTransactionSuccess(phoneNumber, transactionDetails);
      
      return {
        success: true,
        message: 'Transaction success notification sent',
        phoneNumber,
        transactionDetails,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        provider: 'textlk'
      };
    } catch (error) {
      console.error('Transaction success notification failed:', error);
      throw new Error('Failed to send transaction success notification');
    }
  }

  // Send account creation notification
  async sendAccountCreatedNotification(customerId, accountNumber, accountType) {
    const message = `Your ${accountType} account ${accountNumber} has been created successfully. Welcome to B-Trust Bank!`;
    return await this.sendSMS(customerId, message);
  }

  // Send detailed account creation notification using text.lk
  async sendAccountCreatedNotificationDetailed(phoneNumber, accountDetails) {
    try {
      console.log(`📱 Sending account creation notification via Text.lk to ${phoneNumber}`);
      
      const result = await this.textLkService.sendAccountCreated(phoneNumber, accountDetails);
      
      return {
        success: true,
        message: 'Account creation notification sent',
        phoneNumber,
        accountDetails,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        provider: 'textlk'
      };
    } catch (error) {
      console.error('Account creation notification failed:', error);
      throw new Error('Failed to send account creation notification');
    }
  }

  // Send customer registration notification
  async sendRegistrationNotification(customerId, customerName) {
    const message = `Welcome ${customerName}! Your B-Trust Bank account has been created. You can now receive banking services through our agents.`;
    return await this.sendSMS(customerId, message);
  }

  // Send low balance alert
  async sendLowBalanceAlert(customerId, accountNumber, balance) {
    const message = `Low balance alert: Your account ${accountNumber} balance is LKR ${balance.toLocaleString()}. Please visit your agent to deposit funds.`;
    return await this.sendSMS(customerId, message);
  }

  // Send fraud alert
  async sendFraudAlert(customerId, accountNumber, transactionDetails) {
    const message = `Fraud Alert: Suspicious activity detected on account ${accountNumber}. Please contact your agent immediately. B-Trust Bank`;
    return await this.sendSMS(customerId, message);
  }

  // Send detailed fraud alert using text.lk
  async sendFraudAlertDetailed(phoneNumber, fraudDetails) {
    try {
      console.log(`📱 Sending fraud alert via Text.lk to ${phoneNumber}`);
      
      const result = await this.textLkService.sendFraudAlert(phoneNumber, fraudDetails);
      
      return {
        success: true,
        message: 'Fraud alert sent',
        phoneNumber,
        fraudDetails,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        provider: 'textlk'
      };
    } catch (error) {
      console.error('Fraud alert notification failed:', error);
      throw new Error('Failed to send fraud alert');
    }
  }

  // Send customer registration success notification using text.lk
  async sendRegistrationSuccessNotification(phoneNumber, customerName, customerId) {
    try {
      console.log(`📱 Sending registration success notification via Text.lk to ${phoneNumber}`);
      
      const result = await this.textLkService.sendRegistrationSuccess(phoneNumber, customerName, customerId);
      
      return {
        success: true,
        message: 'Registration success notification sent',
        phoneNumber,
        customerName,
        customerId,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        provider: 'textlk'
      };
    } catch (error) {
      console.error('Registration success notification failed:', error);
      throw new Error('Failed to send registration success notification');
    }
  }

  // Send low balance alert using text.lk
  async sendLowBalanceAlertDetailed(phoneNumber, accountNumber, currentBalance, threshold = 1000) {
    try {
      console.log(`📱 Sending low balance alert via Text.lk to ${phoneNumber}`);
      
      const result = await this.textLkService.sendLowBalanceAlert(phoneNumber, accountNumber, currentBalance, threshold);
      
      return {
        success: true,
        message: 'Low balance alert sent',
        phoneNumber,
        accountNumber,
        currentBalance,
        threshold,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        provider: 'textlk'
      };
    } catch (error) {
      console.error('Low balance alert notification failed:', error);
      throw new Error('Failed to send low balance alert');
    }
  }

  // Send OTP for large transactions (for future implementation)
  async sendOTP(customerId, otp) {
    const message = `Your B-Trust Bank OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
    return await this.sendSMS(customerId, message);
  }

  // Send transaction OTP to customer phone number
  async sendTransactionOTP(customerPhone, transactionAmount, accountNumber) {
    try {
      console.log(`📱 Sending transaction OTP via Real SMS to ${customerPhone}`);
      
      // Use Real SMS service for sending OTP
      const result = await this.realSmsService.sendTransactionOTP(customerPhone, transactionAmount, accountNumber);
      
      return {
        success: true,
        message: 'Transaction OTP sent successfully',
        phoneNumber: customerPhone,
        transactionAmount,
        accountNumber,
        verificationId: result.messageId,
        timestamp: new Date().toISOString(),
        fallback: result.fallback || false,
        provider: result.provider || 'real'
      };
    } catch (error) {
      console.error('Transaction OTP sending failed:', error);
      throw new Error('Failed to send transaction OTP');
    }
  }

  // Format phone number for international use
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with +94 (Sri Lanka country code)
    if (cleaned.startsWith('0')) {
      return '+94' + cleaned.substring(1);
    }
    
    // If it doesn't start with +, add +94
    if (!cleaned.startsWith('+')) {
      return '+94' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Send verification code using Twilio Verify
  async sendVerificationCode(phoneNumber) {
    try {
      if (!this.client || !this.verifyServiceSid) {
        console.log(`📱 Verification SMS to ${phoneNumber}: [DEMO] Verification code would be sent`);
        return {
          success: true,
          messageId: `verify_${Date.now()}`,
          phoneNumber,
          status: 'pending',
          timestamp: new Date().toISOString()
        };
      }

      // Format phone number for international use
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log(`📱 Formatting phone number: ${phoneNumber} -> ${formattedPhone}`);

      let verification;
      try {
        verification = await this.client.verify.v2
          .services(this.verifyServiceSid)
          .verifications
          .create({
            to: formattedPhone,
            channel: 'sms'
          });
      } catch (error) {
        if (error.code === 21608) {
          console.log(`📱 [DEMO] Phone number ${formattedPhone} not verified in trial account. Using demo mode.`);
          return {
            success: true,
            messageId: `demo_verify_${Date.now()}`,
            phoneNumber: formattedPhone,
            status: 'pending',
            timestamp: new Date().toISOString(),
            fallback: true,
            demoMode: true
          };
        }
        throw error;
      }

      console.log(`📱 Verification sent to ${phoneNumber}: ${verification.sid}`);
      
      return {
        success: true,
        messageId: verification.sid,
        phoneNumber,
        status: verification.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Verification sending failed:', error);
      
      // If geo-permissions error, fall back to demo mode
      if (error.code === 60605) {
        console.log(`📱 [FALLBACK] Verification SMS to ${phoneNumber}: [DEMO] Geo-permissions blocked, using demo mode`);
        return {
          success: true,
          messageId: `verify_demo_${Date.now()}`,
          phoneNumber,
          status: 'pending',
          timestamp: new Date().toISOString(),
          fallback: true
        };
      }
      
      throw new Error('Failed to send verification code');
    }
  }

  // Verify the code using Real SMS service
  async verifyCode(phoneNumber, code, transactionAmount = null) {
    try {
      console.log(`📱 Verifying OTP code via Real SMS for ${phoneNumber}`);
      
      // Use Real SMS service for verification
      const result = await this.realSmsService.verifyOTP(phoneNumber, code, transactionAmount);
      
      return {
        success: true,
        valid: result.valid,
        phoneNumber: result.phoneNumber,
        timestamp: result.timestamp,
        provider: 'real'
      };
    } catch (error) {
      console.error('Verification check failed:', error);
      return {
        success: false,
        valid: false,
        phoneNumber,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Legacy Twilio verify method (kept for compatibility)
  async verifyCodeTwilio(phoneNumber, code) {
    try {
      if (!this.client || !this.verifyServiceSid) {
        console.log(`📱 Verification check for ${phoneNumber}: [DEMO] Code ${code} would be verified`);
        // For demo purposes, accept any 6-digit code
        const isValid = /^\d{6}$/.test(code);
        return {
          success: true,
          valid: isValid,
          phoneNumber,
          timestamp: new Date().toISOString()
        };
      }

      // Format phone number for international use
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log(`📱 Verifying code for formatted phone: ${phoneNumber} -> ${formattedPhone}`);

      let verificationCheck;
      try {
        verificationCheck = await this.client.verify.v2
          .services(this.verifyServiceSid)
          .verificationChecks
          .create({
            to: formattedPhone,
            code: code
          });
      } catch (error) {
        if (error.code === 21608) {
          console.log(`📱 [DEMO] Phone number ${formattedPhone} not verified in trial account. Using demo mode.`);
          // For demo mode, accept any 6-digit code
          const isValid = /^\d{6}$/.test(code);
          return {
            success: true,
            valid: isValid,
            phoneNumber: formattedPhone,
            timestamp: new Date().toISOString(),
            demoMode: true
          };
        }
        throw error;
      }

      console.log(`📱 Verification check for ${phoneNumber}: ${verificationCheck.status}`);
      
      return {
        success: true,
        valid: verificationCheck.status === 'approved',
        phoneNumber,
        status: verificationCheck.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Verification check failed:', error);
      throw new Error('Failed to verify code');
    }
  }

  // Send agent notification
  async sendAgentNotification(agentId, message) {
    // Get agent phone number from database
    const db = require('../config/database');
    const result = await db.query(
      'SELECT phone_number FROM employee_auth WHERE employee_id = $1',
      [agentId]
    );

    if (result.rows.length > 0) {
      const agentPhone = result.rows[0].phone_number;
      return await this.sendSMS(agentPhone, message);
    }
  }

  // Send manager notification
  async sendManagerNotification(branchId, message) {
    const db = require('../config/database');
    const result = await db.query(
      'SELECT phone_number FROM employee_auth WHERE branch_id = $1 AND role = $2',
      [branchId, 'Manager']
    );

    if (result.rows.length > 0) {
      const managerPhone = result.rows[0].phone_number;
      return await this.sendSMS(managerPhone, message);
    }
  }
}

module.exports = new SMSService();
