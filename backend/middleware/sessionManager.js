const jwt = require('jsonwebtoken');
const db = require('../config/database.js');
const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessionTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
    this.idleTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Extract device information from request
   */
  extractDeviceInfo(req) {
    const userAgent = req.get('User-Agent') || '';
    const deviceInfo = {
      device_name: req.body.device_name || this.parseDeviceName(userAgent),
      device_type: this.parseDeviceType(userAgent),
      browser_name: this.parseBrowserName(userAgent),
      browser_version: this.parseBrowserVersion(userAgent),
      operating_system: this.parseOperatingSystem(userAgent),
      screen_resolution: req.body.screen_resolution || null,
      timezone: req.body.timezone || null,
      language: req.get('Accept-Language') || 'en-US'
    };
    return deviceInfo;
  }

  /**
   * Parse device name from user agent
   */
  parseDeviceName(userAgent) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }

  /**
   * Parse device type from user agent
   */
  parseDeviceType(userAgent) {
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return 'mobile';
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Parse browser name from user agent
   */
  parseBrowserName(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown Browser';
  }

  /**
   * Parse browser version from user agent
   */
  parseBrowserVersion(userAgent) {
    const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (chromeMatch) return chromeMatch[1];
    
    const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (firefoxMatch) return firefoxMatch[1];
    
    const safariMatch = userAgent.match(/Version\/(\d+\.\d+)/);
    if (safariMatch) return safariMatch[1];
    
    return 'Unknown';
  }

  /**
   * Parse operating system from user agent
   */
  parseOperatingSystem(userAgent) {
    if (userAgent.includes('Windows NT 10.0')) return 'Windows 10';
    if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
    if (userAgent.includes('Mac OS X')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown OS';
  }

  /**
   * Create a new session
   */
  async createSession(userId, userType, req, sessionDurationMinutes = null) {
    try {
      const sessionId = this.generateSessionId();
      const deviceInfo = this.extractDeviceInfo(req);
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.get('User-Agent') || '';

      // Create session in database
      const result = await db.query(
        'SELECT create_user_session($1, $2, $3, $4, $5, $6, $7)',
        [sessionId, userId, userType, JSON.stringify(deviceInfo), ipAddress, userAgent, sessionDurationMinutes]
      );

      if (result.rows[0].create_user_session) {
        // Generate JWT token with session info
        const token = jwt.sign(
          {
            userId,
            userType,
            sessionId,
            deviceInfo,
            createdAt: new Date().toISOString()
          },
          process.env.JWT_SECRET,
          { expiresIn: sessionDurationMinutes ? `${sessionDurationMinutes}m` : '1h' }
        );

        return {
          success: true,
          sessionId,
          token,
          deviceInfo,
          expiresAt: new Date(Date.now() + (sessionDurationMinutes || 60) * 60 * 1000)
        };
      } else {
        return {
          success: false,
          error: 'Session limit exceeded or creation failed'
        };
      }
    } catch (error) {
      console.error('Error creating session:', error);
      return {
        success: false,
        error: 'Failed to create session'
      };
    }
  }

  /**
   * Validate and update session
   */
  async validateSession(sessionId, userId, activityType = 'activity', activityDescription = null) {
    try {
      const result = await db.query(
        'SELECT update_session_activity($1, $2, $3, $4)',
        [sessionId, activityType, activityDescription, null]
      );

      return result.rows[0].update_session_activity;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId) {
    try {
      const result = await db.query(
        'SELECT * FROM v_active_sessions WHERE user_id = $1 ORDER BY last_activity DESC',
        [userId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId, reason = 'manual') {
    try {
      await db.query(
        'UPDATE user_sessions SET is_active = false, logout_reason = $2, logout_at = CURRENT_TIMESTAMP WHERE session_id = $1',
        [sessionId, reason]
      );

      // Log logout activity
      await db.query(
        'INSERT INTO session_activities (session_id, activity_type, activity_description) VALUES ($1, $2, $3)',
        [sessionId, 'logout', `Session terminated: ${reason}`]
      );

      return true;
    } catch (error) {
      console.error('Error terminating session:', error);
      return false;
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(userId, reason = 'manual') {
    try {
      await db.query(
        'UPDATE user_sessions SET is_active = false, logout_reason = $2, logout_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_active = true',
        [userId, reason]
      );

      return true;
    } catch (error) {
      console.error('Error terminating all user sessions:', error);
      return false;
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId, deviceFingerprint) {
    try {
      const result = await db.query(
        'SELECT is_active FROM trusted_devices WHERE user_id = $1 AND device_id = $2',
        [userId, deviceFingerprint]
      );

      return result.rows.length > 0 && result.rows[0].is_active;
    } catch (error) {
      console.error('Error checking trusted device:', error);
      return false;
    }
  }

  /**
   * Add device to trusted devices
   */
  async trustDevice(userId, deviceInfo, deviceFingerprint) {
    try {
      await db.query(
        'INSERT INTO trusted_devices (device_id, user_id, device_name, device_type, device_fingerprint, trust_level) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (device_id) DO UPDATE SET is_active = true, last_used = CURRENT_TIMESTAMP',
        [
          deviceFingerprint,
          userId,
          deviceInfo.device_name,
          deviceInfo.device_type,
          deviceFingerprint,
          80 // Default trust level
        ]
      );

      return true;
    } catch (error) {
      console.error('Error trusting device:', error);
      return false;
    }
  }

  /**
   * Remove device from trusted devices
   */
  async untrustDevice(deviceId) {
    try {
      await db.query(
        'UPDATE trusted_devices SET is_active = false WHERE device_id = $1',
        [deviceId]
      );

      return true;
    } catch (error) {
      console.error('Error untrusting device:', error);
      return false;
    }
  }

  /**
   * Get session security events
   */
  async getSecurityEvents(userId, limit = 50) {
    try {
      const result = await db.query(
        'SELECT * FROM session_security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const result = await db.query('SELECT cleanup_expired_sessions()');
      return result.rows[0].cleanup_expired_sessions;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return 0;
    }
  }
}

// Middleware for session management
const sessionMiddleware = (req, res, next) => {
  req.sessionManager = new SessionManager();
  next();
};

// Middleware to validate session on protected routes
const validateSessionMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { sessionId, userId, userType } = decoded;

    // Validate session in database
    const isValid = await req.sessionManager.validateSession(sessionId, userId, 'api_access', `API access: ${req.method} ${req.path}`);
    
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    req.user = { userId, userType, sessionId };
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Middleware to track API activity
const trackActivityMiddleware = (activityType, activityDescription) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.sessionId) {
        await req.sessionManager.validateSession(
          req.user.sessionId,
          req.user.userId,
          activityType,
          activityDescription || `${req.method} ${req.path}`
        );
      }
      next();
    } catch (error) {
      console.error('Activity tracking error:', error);
      next(); // Don't block the request if tracking fails
    }
  };
};

module.exports = {
  SessionManager,
  sessionMiddleware,
  validateSessionMiddleware,
  trackActivityMiddleware
};
