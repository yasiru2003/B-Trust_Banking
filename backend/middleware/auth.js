const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    let user;
    if (decoded.userType === 'employee') {
      const query = 'SELECT * FROM employee_auth WHERE employee_id = $1 AND status = true';
      const result = await db.query(query, [decoded.userId]);
      user = result.rows[0];
    } else if (decoded.userType === 'customer') {
      const query = 'SELECT * FROM customer WHERE customer_id = $1';
      const result = await db.query(query, [decoded.userId]);
      user = result.rows[0];
    } else {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await db.query(query, [decoded.userId]);
      user = result.rows[0];
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    req.user = {
      id: decoded.userId,
      type: decoded.userType,
      ...user
    };
    
    next();
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
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Check if user is employee
const requireEmployee = (req, res, next) => {
  console.log('requireEmployee middleware - req.user:', req.user);
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  if (req.user.type !== 'employee') {
    return res.status(403).json({
      success: false,
      message: 'Employee access required'
    });
  }
  next();
};

// Check if user is manager
const requireManager = (req, res, next) => {
  if (req.user.type !== 'employee' || req.user.role !== 'Manager') {
    return res.status(403).json({
      success: false,
      message: 'Manager access required'
    });
  }
  next();
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.type !== 'employee' || req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Branch-based access control for managers
const requireBranchAccess = (req, res, next) => {
  if (req.user.type !== 'employee') {
    return res.status(403).json({
      success: false,
      message: 'Employee access required'
    });
  }

  // Managers can access their branch data
  if (req.user.role === 'Manager') {
    req.userBranchId = req.user.branch_id;
    return next();
  }

  // Agents can access their own data
  if (req.user.role === 'Agent') {
    req.userBranchId = req.user.branch_id;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions'
  });
};

// Check if user is agent
const requireAgent = (req, res, next) => {
  if (
    req.user.type !== 'employee' ||
    (req.user.role !== 'Agent' && req.user.role !== 'Manager' && req.user.role !== 'Admin')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Agent access required'
    });
  }
  next();
};

// Check if user is customer
const requireCustomer = (req, res, next) => {
  if (req.user.type !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Customer access required'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    let user;
    if (decoded.userType === 'employee') {
      const query = 'SELECT * FROM employee_auth WHERE employee_id = $1 AND status = true';
      const result = await db.query(query, [decoded.userId]);
      user = result.rows[0];
    } else if (decoded.userType === 'customer') {
      const query = 'SELECT * FROM customer WHERE customer_id = $1';
      const result = await db.query(query, [decoded.userId]);
      user = result.rows[0];
    } else {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await db.query(query, [decoded.userId]);
      user = result.rows[0];
    }

    if (user) {
      req.user = {
        id: decoded.userId,
        type: decoded.userType,
        ...user
      };
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Check if user owns the resource (for customers accessing their own data)
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (req.user.type !== 'customer') {
        return next(); // Skip ownership check for employees
      }

      const resourceId = req.params.id || req.params.customerId || req.params.accountNumber;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      let query;
      let values;

      switch (resourceType) {
        case 'customer':
          if (resourceId !== req.user.customer_id) {
            return res.status(403).json({
              success: false,
              message: 'Access denied - not your account'
            });
          }
          break;
          
        case 'account':
          query = `
            SELECT ao.customer_id 
            FROM account_ownership ao 
            WHERE ao.account_number = $1
          `;
          values = [resourceId];
          break;
          
        case 'transaction':
          query = `
            SELECT ao.customer_id 
            FROM transaction t
            JOIN savings_account sa ON t.account_number = sa.account_number
            JOIN account_ownership ao ON sa.account_number = ao.account_number
            WHERE t.transaction_id = $1
          `;
          values = [resourceId];
          break;
          
        default:
          return next();
      }

      if (query) {
        const result = await db.query(query, values);
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found'
          });
        }

        if (result.rows[0].customer_id !== req.user.customer_id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied - not your resource'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

module.exports = {
  verifyToken,
  requireEmployee,
  requireManager,
  requireAdmin,
  requireAgent,
  requireCustomer,
  optionalAuth,
  requireOwnership,
  requireBranchAccess
};

