const ActivityAuditService = require('../services/activityAuditService');

// Activity audit middleware
const auditMiddleware = (action, resourceType, getResourceId = null) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;

    let responseData = null;
    let success = true;
    let errorMessage = null;

    // Override response methods to capture data
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.end = function(data) {
      responseData = data;
      return originalEnd.call(this, data);
    };

    // Handle errors
    const originalNext = next;
    next = function(err) {
      if (err) {
        success = false;
        errorMessage = err.message;
      }
      return originalNext.call(this, err);
    };

    // Log activity after response
    res.on('finish', async () => {
      try {
        const userId = req.user?.employee_id || req.user?.customer_id || req.user?.id;
        const userType = req.userType || 'employee';
        
        let resourceId = null;
        if (getResourceId && typeof getResourceId === 'function') {
          resourceId = getResourceId(req, responseData);
        } else if (getResourceId && typeof getResourceId === 'string') {
          resourceId = req.params[getResourceId] || req.body[getResourceId];
        }

        const details = {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseSize: responseData ? JSON.stringify(responseData).length : 0,
          ...(req.body && Object.keys(req.body).length > 0 ? { requestBody: req.body } : {}),
          ...(req.query && Object.keys(req.query).length > 0 ? { queryParams: req.query } : {})
        };

        await ActivityAuditService.logActivity({
          userId,
          userType,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          success,
          errorMessage
        });
      } catch (error) {
        console.error('Activity audit middleware error:', error);
        // Don't throw error to avoid breaking the response
      }
    });

    next();
  };
};

// Common audit actions
const AUDIT_ACTIONS = {
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  CREATE_CUSTOMER: 'create_customer',
  UPDATE_CUSTOMER: 'update_customer',
  DELETE_CUSTOMER: 'delete_customer',
  VIEW_CUSTOMER: 'view_customer',
  CREATE_ACCOUNT: 'create_account',
  UPDATE_ACCOUNT: 'update_account',
  DELETE_ACCOUNT: 'delete_account',
  VIEW_ACCOUNT: 'view_account',
  CREATE_TRANSACTION: 'create_transaction',
  UPDATE_TRANSACTION: 'update_transaction',
  VIEW_TRANSACTION: 'view_transaction',
  CREATE_EMPLOYEE: 'create_employee',
  UPDATE_EMPLOYEE: 'update_employee',
  DELETE_EMPLOYEE: 'delete_employee',
  VIEW_EMPLOYEE: 'view_employee',
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  SYSTEM_CONFIG: 'system_configuration'
};

// Common resource types
const RESOURCE_TYPES = {
  CUSTOMER: 'customer',
  ACCOUNT: 'account',
  TRANSACTION: 'transaction',
  EMPLOYEE: 'employee',
  BRANCH: 'branch',
  DASHBOARD: 'dashboard',
  REPORT: 'report',
  SYSTEM: 'system',
  USER: 'user'
};

module.exports = {
  auditMiddleware,
  AUDIT_ACTIONS,
  RESOURCE_TYPES
};


