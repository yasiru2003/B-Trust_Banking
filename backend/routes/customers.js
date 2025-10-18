const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasPermission, canAccessCustomer } = require('../middleware/permissions');
const smsService = require('../services/smsService');
const filebaseService = require('../services/filebaseService');
const Joi = require('joi');

// Validation schemas
const customerSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  date_of_birth: Joi.date().max('now').required(),
  address: Joi.string().max(255).required(),
  nic_number: Joi.string().pattern(/^[0-9]{9}[vVxX]|[0-9]{12}$/).required(),
  phone_number: Joi.string().pattern(/^[0-9]{10}$/).required(),
  phone_is_verified: Joi.boolean().optional(),
  email: Joi.string().email().optional(),
  photo: Joi.string().optional(), // Base64 encoded photo
  phone_otp_verified: Joi.boolean().optional() // OTP verification status
});

// Phone verification schemas
const phoneVerificationSchema = Joi.object({
  phone_number: Joi.string().pattern(/^[0-9]{10}$/).required()
});

const phoneOTPVerifySchema = Joi.object({
  phone_number: Joi.string().pattern(/^[0-9]{10}$/).required(),
  otp_code: Joi.string().pattern(/^\d{6}$/).required()
});

const updateCustomerSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional(),
  last_name: Joi.string().min(2).max(50).optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
  date_of_birth: Joi.date().max('now').optional(),
  address: Joi.string().max(255).optional(),
  nic_number: Joi.string().pattern(/^[0-9]{9}[vVxX]|[0-9]{12}$/).optional(),
  phone_number: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  phone_is_verified: Joi.boolean().optional(),
  email: Joi.string().email().optional(),
  kyc_status: Joi.boolean().optional()
});

// GET /api/customers - Get customers (role-based access)
router.get('/', hasPermission('view_assigned_customers'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (req.userRole === 'AGENT') {
      conditions.push(`TRIM(c.agent_id) = TRIM($${++paramCount})`);
      params.push(req.user.userId);
    } else if (req.userRole === 'MANAGER') {
      // Manager can see all customers in their branch
      conditions.push(`c.branch_id = (SELECT branch_id FROM employee_auth WHERE TRIM(employee_id) = TRIM($${++paramCount}))`);
      params.push(req.user.userId);
    }

    // Add search filter
    if (req.query.search) {
      conditions.push(`(c.first_name ILIKE $${++paramCount} OR c.last_name ILIKE $${++paramCount} OR c.nic_number ILIKE $${++paramCount} OR c.phone_number ILIKE $${++paramCount})`);
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add KYC status filter
    if (req.query.kyc_status !== undefined) {
      conditions.push(`c.kyc_status = $${++paramCount}`);
      params.push(req.query.kyc_status === 'true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY c.customer_id DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM customer c';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await db.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers'
    });
  }
});

// GET /api/customers/stats - Get customer statistics
router.get('/stats', hasPermission('view_assigned_customers'), async (req, res) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN c.kyc_status = true THEN 1 END) as verified_customers,
        COUNT(CASE WHEN c.kyc_status = false THEN 1 END) as unverified_customers,
        COUNT(CASE WHEN c.phone_is_verified = true THEN 1 END) as phone_verified_customers
      FROM customer c
      LEFT JOIN employee_auth e ON TRIM(c.agent_id) = TRIM(e.employee_id)
    `;

    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Role-based filtering aligned with auth middleware
    if (req.user?.role === 'Agent') {
      conditions.push(`TRIM(c.agent_id) = TRIM($${++paramCount})`);
      params.push(req.user.employee_id.trim());
    } else if (req.user?.role === 'Manager') {
      conditions.push(`e.branch_id = $${++paramCount}`);
      params.push(req.user.branch_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer statistics'
    });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', hasPermission('view_all_customers'), canAccessCustomer, async (req, res) => {
  try {
    const query = `
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      WHERE c.customer_id = $1
    `;
    
    const result = await db.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer'
    });
  }
});

// POST /api/customers/verify-phone - Send OTP for phone verification
router.post('/verify-phone', async (req, res) => {
  try {
    console.log('Phone verification request:', req.body);
    
    // Validate request data
    const { error, value } = phoneVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { phone_number } = value;

    // Check if phone number already exists
    console.log('Checking for existing customer with phone:', phone_number);
    const existingByPhone = await db.query(
      'SELECT customer_id, first_name, last_name FROM customer WHERE phone_number = $1',
      [phone_number]
    );
    
    if (existingByPhone.rows.length > 0) {
      console.log('Customer with phone already exists:', existingByPhone.rows[0]);
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered with another customer',
        data: {
          existing_customer: existingByPhone.rows[0]
        }
      });
    }

    // Send OTP via Text.lk
    console.log('Sending phone verification OTP to:', phone_number);
    const otpResult = await smsService.sendTransactionOTP(phone_number, 0, 'PHONE_VERIFICATION');
    
    return res.status(200).json({
      success: true,
      message: 'Phone verification OTP sent successfully',
      data: {
        phone_number: phone_number,
        verification_id: otpResult.verificationId,
        timestamp: otpResult.timestamp
      }
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send phone verification OTP',
      error: error.message
    });
  }
});

// POST /api/customers/verify-phone-otp - Verify OTP for phone
router.post('/verify-phone-otp', async (req, res) => {
  try {
    console.log('Phone OTP verification request:', req.body);
    
    // Validate request data
    const { error, value } = phoneOTPVerifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { phone_number, otp_code } = value;

    // Verify OTP
    console.log('Verifying OTP for phone:', phone_number);
    const verifyResult = await smsService.verifyCode(phone_number, otp_code, 0);
    
    if (verifyResult.valid) {
      return res.status(200).json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          phone_number: phone_number,
          verified: true,
          timestamp: verifyResult.timestamp
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code',
        data: {
          phone_number: phone_number,
          verified: false
        }
      });
    }

  } catch (error) {
    console.error('Phone OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify phone OTP',
      error: error.message
    });
  }
});

// POST /api/customers - Create new customer (Agent only)
router.post('/', hasPermission('create_customer'), async (req, res) => {
  try {
    // Debug logging for customer creation request
    console.log('Customer creation request body:', JSON.stringify(req.body, null, 2));
    console.log('Phone verification fields:', {
      phone_otp_verified: req.body.phone_otp_verified,
      phone_is_verified: req.body.phone_is_verified,
      phone_number: req.body.phone_number
    });

    // Validate request data
    const { error, value } = customerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check if customer already exists with same NIC or phone
    console.log('Checking for existing customer with NIC:', value.nic_number);
    const existingByNIC = await db.query(
      'SELECT customer_id FROM customer WHERE nic_number = $1',
      [value.nic_number]
    );
    
    if (existingByNIC.rows.length > 0) {
      console.log('Customer with NIC already exists:', existingByNIC.rows[0]);
      return res.status(409).json({
        success: false,
        message: 'Customer with this NIC number already exists'
      });
    }

    console.log('Checking for existing customer with phone:', value.phone_number);
    const existingByPhone = await db.query(
      'SELECT customer_id FROM customer WHERE phone_number = $1',
      [value.phone_number]
    );
    
    if (existingByPhone.rows.length > 0) {
      console.log('Customer with phone already exists:', existingByPhone.rows[0]);
      return res.status(409).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    // Check if phone OTP verification is required and completed
    // Accept either phone_otp_verified or phone_is_verified as verification status
    let isPhoneVerified = value.phone_otp_verified || value.phone_is_verified;
    
    // Development mode: Allow bypassing phone verification if enabled
    if (!isPhoneVerified && process.env.BYPASS_PHONE_VERIFICATION === 'true') {
      console.log('⚠️  Development mode: Bypassing phone verification');
      isPhoneVerified = true;
    }
    
    // Alternative: Check if phone was recently verified in the system
    if (!isPhoneVerified) {
      try {
        // Check if there's a recent successful OTP verification for this phone
        const recentVerification = await db.query(
          `SELECT * FROM transaction_otp_verification 
           WHERE phone_number = $1 
           AND verification_status = 'verified' 
           AND verified_at > NOW() - INTERVAL '10 minutes'
           ORDER BY verified_at DESC 
           LIMIT 1`,
          [value.phone_number]
        );
        
        if (recentVerification.rows.length > 0) {
          isPhoneVerified = true;
          console.log('Phone verification found in recent OTP verification records');
        }
      } catch (dbError) {
        console.warn('Could not check recent OTP verification:', dbError.message);
      }
    }
    
    console.log('Phone verification check:', {
      phone_otp_verified: value.phone_otp_verified,
      phone_is_verified: value.phone_is_verified,
      isPhoneVerified: isPhoneVerified,
      phone_number: value.phone_number
    });
    
    if (!isPhoneVerified) {
      console.log('Phone verification failed - customer creation blocked');
      return res.status(400).json({
        success: false,
        message: 'Phone number OTP verification required before creating customer',
        requires_otp_verification: true,
        debug: {
          phone_otp_verified: value.phone_otp_verified,
          phone_is_verified: value.phone_is_verified,
          phone_number: value.phone_number,
          suggestion: 'Please verify your phone number using the OTP verification process'
        }
      });
    }
    
    console.log('Phone verification passed - proceeding with customer creation');

    if (value.email) {
      const existingByEmail = await db.query(
        'SELECT customer_id FROM customer WHERE email = $1',
        [value.email]
      );
      
      if (existingByEmail.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this email already exists'
        });
      }
    }

    // Get agent's branch_id
    const agentResult = await db.query(
      'SELECT branch_id FROM employee_auth WHERE employee_id = $1',
      [req.user.userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const branchId = agentResult.rows[0].branch_id;

    // Generate customer ID
    const customerCountResult = await db.query('SELECT COUNT(*) as count FROM customer');
    const customerCount = parseInt(customerCountResult.rows[0].count) + 1;
    const customerId = `CUST${customerCount.toString().padStart(3, '0')}`;

    // Upload photo to Filebase if provided
    let photoUrl = null;
    if (value.photo) {
      console.log(`📸 Starting photo upload for customer: ${customerId}`);
      console.log(`📸 Photo data length: ${value.photo.length} characters`);
      const uploadResult = await filebaseService.uploadCustomerPhoto(customerId, value.photo);
      if (uploadResult.success) {
        photoUrl = uploadResult.url;
        console.log(`📸 Customer photo uploaded to Filebase: ${photoUrl}`);
      } else {
        console.error('Failed to upload photo to Filebase:', uploadResult.error);
        // Continue without photo rather than failing the entire operation
      }
    } else {
      console.log(`📸 No photo provided for customer: ${customerId}`);
    }

    // Create customer
    const insertQuery = `
      INSERT INTO customer (
        customer_id, agent_id, branch_id, first_name, last_name, gender, 
        date_of_birth, address, nic_number, phone_number, 
        phone_is_verified, email, kyc_status, photo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      customerId,       // customer_id
      req.user.userId,  // agent_id
      branchId,         // branch_id
      value.first_name,
      value.last_name,
      value.gender,
      value.date_of_birth,
      value.address,
      value.nic_number,
      value.phone_number,
      isPhoneVerified, // phone_is_verified based on OTP verification
      value.email,
      false,            // kyc_status (needs verification)
      photoUrl          // photo URL from Filebase
    ]);

    const newCustomer = result.rows[0];

    // Send detailed SMS notification to customer using text.lk
    try {
      await smsService.sendRegistrationSuccessNotification(
        newCustomer.phone_number,
        `${newCustomer.first_name} ${newCustomer.last_name}`,
        newCustomer.customer_id
      );
      
      console.log(`📱 Customer registration SMS sent to ${newCustomer.phone_number} for customer ${newCustomer.customer_id}`);
    } catch (smsError) {
      console.error('SMS notification failed:', smsError);
      // Don't fail the customer creation if SMS fails
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: newCustomer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', hasPermission('update_customer'), canAccessCustomer, async (req, res) => {
  try {
    // Validate request data
    const { error, value } = updateCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check if customer exists
    const existingResult = await db.query(
      'SELECT * FROM customer WHERE customer_id = $1',
      [req.params.id]
    );
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const existingCustomer = existingResult.rows[0];

    // Check for duplicate NIC, phone, or email if being updated
    if (value.nic_number && value.nic_number !== existingCustomer.nic_number) {
      const existingByNIC = await db.query(
        'SELECT customer_id FROM customer WHERE nic_number = $1 AND customer_id != $2',
        [value.nic_number, req.params.id]
      );
      
      if (existingByNIC.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this NIC number already exists'
        });
      }
    }

    if (value.phone_number && value.phone_number !== existingCustomer.phone_number) {
      const existingByPhone = await db.query(
        'SELECT customer_id FROM customer WHERE phone_number = $1 AND customer_id != $2',
        [value.phone_number, req.params.id]
      );
      
      if (existingByPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this phone number already exists'
        });
      }
    }

    if (value.email && value.email !== existingCustomer.email) {
      const existingByEmail = await db.query(
        'SELECT customer_id FROM customer WHERE email = $1 AND customer_id != $2',
        [value.email, req.params.id]
      );
      
      if (existingByEmail.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this email already exists'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        updateFields.push(`${key} = $${++paramCount}`);
        updateValues.push(value[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(req.params.id);
    const updateQuery = `
      UPDATE customer 
      SET ${updateFields.join(', ')}
      WHERE customer_id = $${++paramCount}
      RETURNING *
    `;

    const result = await db.query(updateQuery, updateValues);
    
    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
});

// DELETE /api/customers/:id - Delete customer (Manager only)
router.delete('/:id', hasPermission('delete_customer'), canAccessCustomer, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM customer WHERE customer_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has active accounts
    const accountsResult = await db.query(
      'SELECT COUNT(*) FROM account WHERE customer_id = $1',
      [req.params.id]
    );

    if (parseInt(accountsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with active accounts'
      });
    }

    await db.query('DELETE FROM customer WHERE customer_id = $1', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
});

// GET /api/customers/search/:query - Search customers
router.get('/search/:query', hasPermission('view_all_customers'), async (req, res) => {
  try {
    const searchQuery = req.params.query;
    const searchTerm = `%${searchQuery}%`;
    
    let query = `
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      WHERE (c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.nic_number ILIKE $1 OR c.phone_number ILIKE $1)
    `;
    
    const params = [searchTerm];
    let paramCount = 1;

    // Role-based filtering
    if (req.userRole === 'AGENT') {
      query += ` AND c.agent_id = $${++paramCount}`;
      params.push(req.user.userId);
    } else if (req.userRole === 'MANAGER') {
      query += ` AND c.branch_id = (SELECT branch_id FROM employee_auth WHERE employee_id = $${++paramCount})`;
      params.push(req.user.userId);
    }

    query += ' ORDER BY c.customer_id DESC LIMIT 50';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search customers'
    });
  }
});

// GET /api/customers/by-agent/:agentId - Get customers by agent
router.get('/by-agent/:agentId', hasPermission('view_all_customers'), async (req, res) => {
  try {
    const query = `
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      WHERE c.agent_id = $1
      ORDER BY c.customer_id DESC
    `;
    
    const result = await db.query(query, [req.params.agentId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get customers by agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers by agent'
    });
  }
});

// GET /api/customers/by-branch/:branchId - Get customers by branch (Manager only)
router.get('/by-branch/:branchId', hasPermission('view_all_customers'), async (req, res) => {
  try {
    const query = `
      SELECT c.*, e.employee_name as agent_name, b.name as branch_name
      FROM customer c
      LEFT JOIN employee_auth e ON c.agent_id = e.employee_id
      LEFT JOIN branch b ON c.branch_id = b.branch_id
      WHERE c.branch_id = $1
      ORDER BY c.customer_id DESC
    `;
    
    const result = await db.query(query, [req.params.branchId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get customers by branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers by branch'
    });
  }
});

// GET /api/customers/:id/photo - Get signed URL for customer photo
router.get('/:id/photo', hasPermission('view_assigned_customers'), canAccessCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get customer photo URL from database (trim customer_id to handle CHAR padding)
    const customerResult = await db.query(
      'SELECT photo FROM customer WHERE TRIM(customer_id) = $1',
      [id.trim()]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const customer = customerResult.rows[0];
    
    if (!customer.photo) {
      return res.status(404).json({
        success: false,
        message: 'No photo found for this customer'
      });
    }
    
    // Extract customer ID from the stored URL or use the customer ID
    const customerId = id;
    
    // Generate a new signed URL
    const signedUrlResult = await filebaseService.getCustomerPhotoUrl(customerId, 3600); // 1 hour expiry
    
    if (signedUrlResult.success) {
      res.json({
        success: true,
        photoUrl: signedUrlResult.url
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate photo URL'
      });
    }
  } catch (error) {
    console.error('Get customer photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer photo'
    });
  }
});

// PATCH /api/customers/:id/kyc - Update KYC status
router.patch('/:id/kyc', hasPermission('update_customer_info'), canAccessCustomer, async (req, res) => {
  try {
    const { kyc_status } = req.body;
    
    // Validate KYC status
    if (typeof kyc_status !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'KYC status must be a boolean value'
      });
    }

    // Check if customer exists
    const existingResult = await db.query(
      'SELECT customer_id, kyc_status FROM customer WHERE customer_id = $1',
      [req.params.id]
    );
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const existingCustomer = existingResult.rows[0];

    // Update KYC status
    const updateResult = await db.query(
      'UPDATE customer SET kyc_status = $1 WHERE customer_id = $2 RETURNING *',
      [kyc_status, req.params.id]
    );

    const updatedCustomer = updateResult.rows[0];

    res.json({
      success: true,
      message: `KYC status ${kyc_status ? 'approved' : 'rejected'} successfully`,
      data: {
        customer_id: updatedCustomer.customer_id,
        kyc_status: updatedCustomer.kyc_status,
        first_name: updatedCustomer.first_name,
        last_name: updatedCustomer.last_name
      }
    });

  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update KYC status'
    });
  }
});

module.exports = router;