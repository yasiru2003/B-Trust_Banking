const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Custom middleware for Admin or Manager access
const requireAdminOrManager = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied - Admin or Manager role required'
    });
  }
};
const { cacheMiddleware } = require('../middleware/cache');
const ActivityAuditService = require('../services/activityAuditService');
const Joi = require('joi');

// Validation schemas
const auditQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  userId: Joi.string().optional(),
  userType: Joi.string().valid('employee', 'customer', 'admin').optional(),
  action: Joi.string().optional(),
  resourceType: Joi.string().optional(),
  success: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  search: Joi.string().optional()
});

// GET /api/admin/activity-audit - Get activity audit logs
router.get('/', verifyToken, requireAdminOrManager, cacheMiddleware(60), async (req, res) => {
  try {
    const { error, value } = auditQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const logs = await ActivityAuditService.getActivityLogs(value);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: value.page,
        limit: value.limit,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Get activity audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity audit logs'
    });
  }
});

// GET /api/admin/activity-audit/stats - Get activity statistics
router.get('/stats', verifyToken, requireAdminOrManager, cacheMiddleware(300), async (req, res) => {
  try {
    const { startDate, endDate, userType } = req.query;
    
    const stats = await ActivityAuditService.getActivityStats({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      userType
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics'
    });
  }
});

// GET /api/admin/activity-audit/top-users - Get top users by activity
router.get('/top-users', verifyToken, requireAdminOrManager, cacheMiddleware(300), async (req, res) => {
  try {
    const { limit = 10, startDate, endDate, userType } = req.query;
    
    const topUsers = await ActivityAuditService.getTopUsersByActivity({
      limit: parseInt(limit),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      userType
    });
    
    res.json({
      success: true,
      data: topUsers
    });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top users'
    });
  }
});

// GET /api/admin/activity-audit/trends - Get activity trends
router.get('/trends', verifyToken, requireAdminOrManager, cacheMiddleware(300), async (req, res) => {
  try {
    const { days = 30, userType } = req.query;
    
    const trends = await ActivityAuditService.getActivityTrends({
      days: parseInt(days),
      userType
    });
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get activity trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity trends'
    });
  }
});

// GET /api/admin/activity-audit/user/:userId - Get activity logs for specific user
router.get('/user/:userId', verifyToken, requireAdminOrManager, cacheMiddleware(60), async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const logs = await ActivityAuditService.getActivityLogs({
      userId,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity logs'
    });
  }
});

// GET /api/admin/activity-audit/export - Export activity logs
router.get('/export', verifyToken, requireAdminOrManager, async (req, res) => {
  try {
    const { error, value } = auditQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Get all logs without pagination for export
    const exportParams = { ...value };
    delete exportParams.page;
    delete exportParams.limit;
    exportParams.limit = 10000; // Large limit for export

    const logs = await ActivityAuditService.getActivityLogs(exportParams);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity-audit-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Convert to CSV
    if (logs.length === 0) {
      return res.send('No data found');
    }

    const headers = [
      'Audit ID', 'User ID', 'User Type', 'User Name', 'User Email',
      'Action', 'Resource Type', 'Resource ID', 'Success', 'Error Message',
      'IP Address', 'User Agent', 'Session ID', 'Timestamp', 'Details'
    ];
    
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.audit_id,
        log.user_id,
        log.user_type,
        `"${log.user_name || ''}"`,
        `"${log.user_email || ''}"`,
        `"${log.action}"`,
        log.resource_type,
        `"${log.resource_id || ''}"`,
        log.success,
        `"${log.error_message || ''}"`,
        `"${log.ip_address || ''}"`,
        `"${log.user_agent || ''}"`,
        `"${log.session_id || ''}"`,
        log.timestamp,
        `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Export activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export activity logs'
    });
  }
});

module.exports = router;
