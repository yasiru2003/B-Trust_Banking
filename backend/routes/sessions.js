const express = require('express');
const router = express.Router();
const db = require('../config/database.js');
const { SessionManager, validateSessionMiddleware, trackActivityMiddleware } = require('../middleware/sessionManager.js');
const Joi = require('joi');

// Initialize session manager
const sessionManager = new SessionManager();

// Validation schemas
const createSessionSchema = Joi.object({
  device_name: Joi.string().optional(),
  screen_resolution: Joi.string().optional(),
  timezone: Joi.string().optional(),
  session_duration_minutes: Joi.number().integer().min(5).max(1440).optional()
});

const trustDeviceSchema = Joi.object({
  device_id: Joi.string().required(),
  device_name: Joi.string().required(),
  trust_level: Joi.number().integer().min(0).max(100).optional()
});

// GET /api/sessions - Get user's active sessions
router.get('/', validateSessionMiddleware, trackActivityMiddleware('view_sessions', 'Viewed active sessions'), async (req, res) => {
  try {
    const sessions = await sessionManager.getUserSessions(req.user.userId);
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions'
    });
  }
});

// GET /api/sessions/security - Get security events
router.get('/security', validateSessionMiddleware, trackActivityMiddleware('view_security', 'Viewed security events'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await sessionManager.getSecurityEvents(req.user.userId, limit);
    
    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security events'
    });
  }
});

// GET /api/sessions/trusted-devices - Get trusted devices
router.get('/trusted-devices', validateSessionMiddleware, trackActivityMiddleware('view_devices', 'Viewed trusted devices'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM trusted_devices WHERE user_id = $1 AND is_active = true ORDER BY last_used DESC',
      [req.user.userId]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting trusted devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trusted devices'
    });
  }
});

// POST /api/sessions/trust-device - Trust a device
router.post('/trust-device', validateSessionMiddleware, trackActivityMiddleware('trust_device', 'Trusted a device'), async (req, res) => {
  try {
    const { error, value } = trustDeviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { device_id, device_name, trust_level = 80 } = value;
    
    await db.query(
      'INSERT INTO trusted_devices (device_id, user_id, device_name, trust_level, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (device_id) DO UPDATE SET is_active = true, trust_level = $4, last_used = CURRENT_TIMESTAMP',
      [device_id, req.user.userId, device_name, trust_level]
    );

    res.json({
      success: true,
      message: 'Device trusted successfully'
    });
  } catch (error) {
    console.error('Error trusting device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trust device'
    });
  }
});

// DELETE /api/sessions/trust-device/:deviceId - Untrust a device
router.delete('/trust-device/:deviceId', validateSessionMiddleware, trackActivityMiddleware('untrust_device', 'Untrusted a device'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const success = await sessionManager.untrustDevice(deviceId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Device untrusted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to untrust device'
      });
    }
  } catch (error) {
    console.error('Error untrusting device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to untrust device'
    });
  }
});

// DELETE /api/sessions/:sessionId - Terminate a specific session
router.delete('/:sessionId', validateSessionMiddleware, trackActivityMiddleware('terminate_session', 'Terminated a session'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const reason = req.body.reason || 'manual';
    
    const success = await sessionManager.terminateSession(sessionId, reason);
    
    if (success) {
      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to terminate session'
      });
    }
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session'
    });
  }
});

// DELETE /api/sessions/terminate-all - Terminate all sessions
router.delete('/terminate-all', validateSessionMiddleware, trackActivityMiddleware('terminate_all_sessions', 'Terminated all sessions'), async (req, res) => {
  try {
    const reason = req.body.reason || 'manual';
    
    const success = await sessionManager.terminateAllUserSessions(req.user.userId, reason);
    
    if (success) {
      res.json({
        success: true,
        message: 'All sessions terminated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to terminate all sessions'
      });
    }
  } catch (error) {
    console.error('Error terminating all sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate all sessions'
    });
  }
});

// GET /api/sessions/activities/:sessionId - Get activities for a session
router.get('/activities/:sessionId', validateSessionMiddleware, trackActivityMiddleware('view_activities', 'Viewed session activities'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await db.query(
      'SELECT * FROM session_activities WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2',
      [sessionId, limit]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting session activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session activities'
    });
  }
});

// GET /api/sessions/policies - Get session policies
router.get('/policies', validateSessionMiddleware, trackActivityMiddleware('view_policies', 'Viewed session policies'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM session_policies WHERE user_type = $1 AND is_active = true',
      [req.user.userType]
    );
    
    res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error getting session policies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session policies'
    });
  }
});

// GET /api/sessions/notifications - Get session notifications
router.get('/notifications', validateSessionMiddleware, trackActivityMiddleware('view_notifications', 'Viewed session notifications'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread_only === 'true';
    
    let query = 'SELECT * FROM session_notifications WHERE user_id = $1';
    let params = [req.user.userId];
    
    if (unreadOnly) {
      query += ' AND is_read = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT $2';
    params.push(limit);
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications'
    });
  }
});

// PUT /api/sessions/notifications/:notificationId/read - Mark notification as read
router.put('/notifications/:notificationId/read', validateSessionMiddleware, trackActivityMiddleware('mark_notification_read', 'Marked notification as read'), async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await db.query(
      'UPDATE session_notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE notification_id = $1 AND user_id = $2',
      [notificationId, req.user.userId]
    );
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// GET /api/sessions/stats - Get session statistics
router.get('/stats', validateSessionMiddleware, trackActivityMiddleware('view_stats', 'Viewed session statistics'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM v_session_security_summary WHERE user_id = $1',
      [req.user.userId]
    );
    
    const stats = result.rows[0] || {
      total_sessions: 0,
      trusted_sessions: 0,
      active_sessions: 0,
      unique_ip_addresses: 0,
      unique_devices: 0,
      suspicious_logins: 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session statistics'
    });
  }
});

// POST /api/sessions/cleanup - Clean up expired sessions (admin only)
router.post('/cleanup', validateSessionMiddleware, trackActivityMiddleware('cleanup_sessions', 'Cleaned up expired sessions'), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const cleanedCount = await sessionManager.cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired sessions`,
      cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up sessions'
    });
  }
});

module.exports = router;
