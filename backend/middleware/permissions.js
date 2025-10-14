const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Role-based permissions for rural banking system
const PERMISSIONS = {
  MANAGER: [
    'view_all_customers',
    'view_assigned_customers',
    'create_customer',
    'update_customer',
    'delete_customer',
    'view_all_accounts',
    'create_account',
    'update_account',
    'delete_account',
    'view_all_transactions',
    'create_transaction',
    'approve_large_transactions',
    'view_all_employees',
    'create_employee',
    'update_employee',
    'delete_employee',
    'view_branch_reports',
    'manage_branch_settings',
    'view_fraud_alerts',
    'manage_fraud_settings'
  ],
  AGENT: [
    'view_assigned_customers',
    'create_customer',
    'update_customer_info',
    'view_customer_accounts',
    'create_account',
    'view_customer_transactions',
    'view_all_transactions',
    'create_transaction',
    'create_small_transactions',
    'send_sms_notifications',
    'view_agent_reports'
  ],
  CUSTOMER: [
    'view_own_account',
    'view_own_transactions',
    'request_transactions',
    'receive_sms_notifications'
  ],
  USER: [
    'view_own_profile',
    'update_own_profile'
  ]
};

// Transaction limits by role
const TRANSACTION_LIMITS = {
  AGENT: {
    daily_limit: 50000,      // 50,000 LKR per day
    single_transaction: 10000, // 10,000 LKR per transaction
    requires_approval: 5000   // Above 5,000 LKR needs manager approval
  },
  MANAGER: {
    daily_limit: 1000000,    // 1,000,000 LKR per day
    single_transaction: 500000, // 500,000 LKR per transaction
    requires_approval: 100000  // Above 100,000 LKR needs approval
  }
};

// Middleware to check if user has specific permission
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let userRole = decoded.userType.toUpperCase();
      
      // Handle employee role mapping
      if (userRole === 'EMPLOYEE') {
        // Get the actual role from the database
        const db = require('../config/database');
        const result = await db.query(
          'SELECT role FROM employee_auth WHERE employee_id = $1',
          [decoded.userId]
        );
        if (result.rows.length > 0) {
          userRole = result.rows[0].role.toUpperCase();
        }
      }
      
      // Check if user has the required permission
      if (!PERMISSIONS[userRole] || !PERMISSIONS[userRole].includes(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      // Add user info to request
      req.user = decoded;
      req.userRole = userRole;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  };
};

// Middleware to check transaction limits
const checkTransactionLimit = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userRole = req.user?.role?.toUpperCase();
    
    if (!TRANSACTION_LIMITS[userRole]) {
      return res.status(403).json({
        success: false,
        message: 'Transaction not allowed for this user type.'
      });
    }

    const limits = TRANSACTION_LIMITS[userRole];
    
    // Check single transaction limit
    if (amount > limits.single_transaction) {
      return res.status(400).json({
        success: false,
        message: `Transaction amount exceeds limit. Maximum allowed: ${limits.single_transaction} LKR`
      });
    }

    // Check if transaction requires approval
    if (amount > limits.requires_approval) {
      req.requiresApproval = true;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking transaction limits.'
    });
  }
};

// Middleware to check if agent can access specific customer
const canAccessCustomer = async (req, res, next) => {
  try {
    const customerId = req.params.id || req.params.customerId;
    const userId = req.user.userId;
    const userRole = req.userRole;

    // Managers can access all customers
    if (userRole === 'MANAGER') {
      return next();
    }

    // Agents can only access customers assigned to them
    if (userRole === 'AGENT') {
      const result = await db.query(
        'SELECT * FROM customer WHERE TRIM(customer_id) = $1 AND TRIM(agent_id) = $2',
        [customerId.trim(), userId.trim()]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Customer not assigned to you.'
        });
      }
    }

    // Customers can only access their own data
    if (userRole === 'CUSTOMER' && userId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking customer access.'
    });
  }
};

// Middleware to check branch access for managers
const canAccessBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const userId = req.user.userId;
    const userRole = req.userRole;

    // Only managers need branch access check
    if (userRole !== 'MANAGER') {
      return next();
    }

    // Check if manager is assigned to this branch
    const result = await db.query(
      'SELECT * FROM employee_auth WHERE employee_id = $1 AND branch_id = $2',
      [userId, branchId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this branch.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking branch access.'
    });
  }
};

module.exports = {
  hasPermission,
  checkTransactionLimit,
  canAccessCustomer,
  canAccessBranch,
  PERMISSIONS,
  TRANSACTION_LIMITS
};
