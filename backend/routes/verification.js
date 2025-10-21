const express = require('express');
const router = express.Router();
const smsService = require('../services/smsService');
const Joi = require('joi');

// Validation schemas
const sendVerificationSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
});

const verifyCodeSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  code: Joi.string().pattern(/^\d{6}$/).required()
});

// POST /api/verification/send - Send verification code
router.post('/send', async (req, res) => {
  try {
    const { error, value } = sendVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        details: error.details[0].message
      });
    }

    const { phoneNumber } = value;
    
    // Send verification code
    const result = await smsService.sendVerificationCode(phoneNumber);
    
    res.json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        phoneNumber: result.phoneNumber,
        messageId: result.messageId,
        status: result.status
      }
    });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
      error: error.message
    });
  }
});

// POST /api/verification/verify - Verify the code
router.post('/verify', async (req, res) => {
  try {
    const { error, value } = verifyCodeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
        details: error.details[0].message
      });
    }

    const { phoneNumber, code } = value;
    
    // Verify the code
    const result = await smsService.verifyCode(phoneNumber, code);
    
    if (result.valid) {
      res.json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          phoneNumber: result.phoneNumber,
          verified: true,
          status: result.status
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        data: {
          phoneNumber: result.phoneNumber,
          verified: false,
          status: result.status
        }
      });
    }
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code',
      error: error.message
    });
  }
});

// GET /api/verification/status - Check verification status (for testing)
router.get('/status', async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // This is a simple status check - in production you might want to store verification status in database
    res.json({
      success: true,
      message: 'Verification service is active',
      data: {
        phoneNumber,
        serviceStatus: 'active',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check status',
      error: error.message
    });
  }
});

module.exports = router;























