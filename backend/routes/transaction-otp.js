const express = require('express');
const router = express.Router();
const smsService = require('../services/smsService');
const db = require('../config/database');
const Joi = require('joi');

// Validation schemas
const sendTransactionOTPSchema = Joi.object({
  accountNumber: Joi.string().required(),
  transactionAmount: Joi.number().positive().required()
});

const verifyTransactionOTPSchema = Joi.object({
  accountNumber: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^\+?[0-9]\d{1,14}$/).required(), // Allow starting with 0
  code: Joi.string().pattern(/^\d{6}$/).required(),
  transactionAmount: Joi.number().positive().required()
});

// POST /api/transaction-otp/send - Send OTP for large transaction
router.post('/send', async (req, res) => {
  try {
    console.log('Transaction OTP send request:', req.body);
    
    const { error, value } = sendTransactionOTPSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
        details: error.details[0].message
      });
    }

    const { accountNumber, transactionAmount } = value;
    console.log('Processing OTP for account:', accountNumber, 'amount:', transactionAmount);
    
    // Check if transaction amount requires OTP (over 5,000 LKR)
    if (transactionAmount <= 5000) {
      return res.status(400).json({
        success: false,
        message: 'OTP not required for transactions under 5,000 LKR'
      });
    }

    // Get customer phone number from account
    const customerQuery = `
      SELECT c.phone_number, c.first_name, c.last_name, a.account_number
      FROM account a
      JOIN customer c ON a.customer_id = c.customer_id
      WHERE a.account_number = $1
    `;
    
    console.log('Querying customer for account:', accountNumber);
    const { rows: customerRows } = await db.query(customerQuery, [accountNumber]);
    console.log('Customer query result:', customerRows);
    
    if (customerRows.length === 0) {
      console.log('No customer found for account:', accountNumber);
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const customer = customerRows[0];
    console.log('Found customer:', customer);
    
    if (!customer.phone_number) {
      console.log('Customer has no phone number:', customer);
      return res.status(400).json({
        success: false,
        message: 'Customer phone number not found. Please update customer information.'
      });
    }

    console.log('Sending OTP to phone:', customer.phone_number);
    // Send transaction OTP
    const result = await smsService.sendTransactionOTP(
      customer.phone_number,
      transactionAmount,
      accountNumber
    );
    console.log('OTP send result:', result);
    
    res.json({
      success: true,
      message: 'Transaction OTP sent successfully',
      data: {
        accountNumber: result.accountNumber,
        phoneNumber: result.phoneNumber,
        transactionAmount: result.transactionAmount,
        verificationId: result.verificationId,
        customerName: `${customer.first_name} ${customer.last_name}`
      }
    });
  } catch (error) {
    console.error('Send transaction OTP error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to send transaction OTP',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/transaction-otp/verify - Verify OTP for transaction
router.post('/verify', async (req, res) => {
  try {
    const { error, value } = verifyTransactionOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
        details: error.details[0].message
      });
    }

    const { accountNumber, phoneNumber, code, transactionAmount } = value;
    
    // Verify the code
    const verificationResult = await smsService.verifyCode(phoneNumber, code);
    
    if (verificationResult.valid) {
      // Store verification in database for audit trail
      const auditQuery = `
        INSERT INTO transaction_otp_verification 
        (account_number, phone_number, transaction_amount, verification_status, verified_at)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      try {
        await db.query(auditQuery, [
          accountNumber,
          phoneNumber,
          transactionAmount,
          'verified',
          new Date()
        ]);
      } catch (auditError) {
        console.warn('Failed to store OTP verification audit:', auditError.message);
        // Don't fail the verification if audit fails
      }
      
      res.json({
        success: true,
        message: 'Transaction OTP verified successfully',
        data: {
          accountNumber,
          phoneNumber,
          transactionAmount,
          verified: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid OTP code',
        data: {
          accountNumber,
          phoneNumber,
          transactionAmount,
          verified: false
        }
      });
    }
  } catch (error) {
    console.error('Verify transaction OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction OTP',
      error: error.message
    });
  }
});

// GET /api/transaction-otp/check - Check if transaction requires OTP
router.get('/check', async (req, res) => {
  try {
    const { accountNumber, transactionAmount } = req.query;
    
    if (!accountNumber || !transactionAmount) {
      return res.status(400).json({
        success: false,
        message: 'Account number and transaction amount are required'
      });
    }

    const amount = parseFloat(transactionAmount);
    const requiresOTP = amount > 5000;
    
    if (requiresOTP) {
      // Get customer phone number
      const customerQuery = `
        SELECT c.phone_number, c.first_name, c.last_name
        FROM account a
        JOIN customer c ON a.customer_id = c.customer_id
        WHERE a.account_number = $1
      `;
      
      const { rows: customerRows } = await db.query(customerQuery, [accountNumber]);
      
      if (customerRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      const customer = customerRows[0];
      
      res.json({
        success: true,
        requiresOTP: true,
        data: {
          accountNumber,
          transactionAmount: amount,
          customerName: `${customer.first_name} ${customer.last_name}`,
          phoneNumber: customer.phone_number ? customer.phone_number.replace(/\d(?=\d{4})/g, '*') : null,
          hasPhoneNumber: !!customer.phone_number
        }
      });
    } else {
      res.json({
        success: true,
        requiresOTP: false,
        data: {
          accountNumber,
          transactionAmount: amount,
          message: 'OTP not required for this transaction amount'
        }
      });
    }
  } catch (error) {
    console.error('Check transaction OTP requirement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check OTP requirement',
      error: error.message
    });
  }
});

// GET /api/transaction-otp/test - Test Twilio configuration
router.get('/test', async (req, res) => {
  try {
    const smsService = require('../services/smsService');
    
    // Check if Twilio is configured
    if (!smsService.client) {
      return res.json({
        success: false,
        message: 'Twilio not configured',
        details: 'Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in your environment variables'
      });
    }

    // Test Twilio connection
    const account = await smsService.client.api.accounts(smsService.client.accountSid).fetch();
    
    res.json({
      success: true,
      message: 'Twilio configured successfully',
      data: {
        accountSid: account.sid,
        accountName: account.friendlyName,
        status: account.status,
        verifyServiceSid: smsService.verifyServiceSid
      }
    });
  } catch (error) {
    console.error('Twilio test error:', error);
    res.status(500).json({
      success: false,
      message: 'Twilio configuration test failed',
      error: error.message
    });
  }
});

module.exports = router;


