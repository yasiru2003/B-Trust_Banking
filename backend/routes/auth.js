const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const Joi = require('joi');
const { auditMiddleware, AUDIT_ACTIONS, RESOURCE_TYPES } = require('../middleware/auditMiddleware');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  userType: Joi.string().valid('employee', 'customer', 'user').required()
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional()
});

// POST /api/auth/login - Login user
router.post('/login', auditMiddleware(AUDIT_ACTIONS.LOGIN, RESOURCE_TYPES.USER, (req, res) => req.body.email), async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password, userType } = value;
    let user, query;

    // Get user based on type
    if (userType === 'employee') {
      query = 'SELECT * FROM employee_auth WHERE email = $1 AND status = true';
    } else if (userType === 'customer') {
      query = 'SELECT * FROM customer WHERE email = $1';
    } else {
      query = 'SELECT * FROM users WHERE email = $1';
    }

    const result = await db.query(query, [email]);
    user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    let isValidPassword = false;
    if (userType === 'employee') {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else if (userType === 'customer') {
      // For customers, we might not have password_hash, so check if they have a password field
      if (user.password) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        return res.status(401).json({
          success: false,
          message: 'Customer authentication not set up'
        });
      }
    } else {
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const tokenPayload = {
      userId: userType === 'employee' ? user.employee_id : 
              userType === 'customer' ? user.customer_id : user.id,
      userType: userType,
      email: user.email
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    // Remove sensitive data
    delete user.password;
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { name, email, password, phone } = value;

    // Check if user already exists
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const query = `
      INSERT INTO users (name, email, password, phone, phone_verified, two_factor_enabled)
      VALUES ($1, $2, $3, $4, false, false)
      RETURNING id, name, email, phone, phone_verified, two_factor_enabled, created_at
    `;

    const result = await db.query(query, [name, email, hashedPassword, phone]);
    const newUser = result.rows[0];

    // Generate JWT token
    const tokenPayload = {
      userId: newUser.id,
      userType: 'user',
      email: newUser.email
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser,
        token,
        userType: 'user'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// POST /api/auth/verify-token - Verify JWT token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details
    let user, query;
    if (decoded.userType === 'employee') {
      query = 'SELECT * FROM employee_auth WHERE employee_id = $1 AND status = true';
    } else if (decoded.userType === 'customer') {
      query = 'SELECT * FROM customer WHERE customer_id = $1';
    } else {
      query = 'SELECT * FROM users WHERE id = $1';
    }

    const result = await db.query(query, [decoded.userId]);
    user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Remove sensitive data
    delete user.password;
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user,
        userType: decoded.userType
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// POST /api/auth/refresh-token - Refresh JWT token
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required'
      });
    }

    // Verify the token (even if expired)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Get user details
    let user, query;
    if (decoded.userType === 'employee') {
      query = 'SELECT * FROM employee_auth WHERE employee_id = $1 AND status = true';
    } else if (decoded.userType === 'customer') {
      query = 'SELECT * FROM customer WHERE customer_id = $1';
    } else {
      query = 'SELECT * FROM users WHERE id = $1';
    }

    const result = await db.query(query, [decoded.userId]);
    user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Generate new token
    const tokenPayload = {
      userId: decoded.userId,
      userType: decoded.userType,
      email: user.email
    };

    const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    // Remove sensitive data
    delete user.password;
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        token: newToken,
        userType: decoded.userType
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

module.exports = router;

