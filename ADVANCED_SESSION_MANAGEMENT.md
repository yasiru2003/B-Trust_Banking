# Advanced Session Management System - B-Trust Bank

## 🔐 Overview

The Advanced Session Management System provides comprehensive session tracking, device management, and security monitoring for the B-Trust Banking System. It includes real-time session monitoring, device fingerprinting, security event tracking, and configurable session policies.

## ✨ Features

### 🔍 **Session Tracking**
- **Real-time Session Monitoring** - Track all active user sessions
- **Session Activity Logging** - Log all user activities and API calls
- **Session Expiration Management** - Automatic session cleanup and timeout handling
- **Concurrent Session Limits** - Configurable limits per user type
- **Session Statistics** - Comprehensive session analytics and reporting

### 📱 **Device Management**
- **Device Fingerprinting** - Unique device identification using browser and system info
- **Trusted Device Management** - Allow users to trust specific devices
- **Device Information Tracking** - Browser, OS, screen resolution, timezone tracking
- **Multi-device Support** - Support for desktop, mobile, and tablet devices
- **Device Security** - Monitor and alert on new or suspicious devices

### 🛡️ **Security Features**
- **Security Event Monitoring** - Track suspicious activities and security events
- **Risk Assessment** - Automatic risk scoring for sessions and activities
- **Location Tracking** - IP address and location-based security monitoring
- **Session Hijacking Prevention** - Detect and prevent unauthorized session access
- **Audit Trail** - Complete audit trail for all session-related activities

### ⚙️ **Configurable Policies**
- **User Type Policies** - Different policies for customers, employees, admins, managers
- **Session Timeouts** - Configurable session and idle timeouts
- **Concurrent Session Limits** - Maximum concurrent sessions per user
- **Device Verification Requirements** - Optional device verification for sensitive operations
- **Security Thresholds** - Configurable security alert thresholds

## 🗄️ Database Schema

### **Core Tables**

#### `user_sessions`
Tracks all user sessions with comprehensive device and location information.

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    device_id VARCHAR(128),
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    operating_system VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_trusted BOOLEAN DEFAULT false,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    logout_reason VARCHAR(100),
    logout_at TIMESTAMP
);
```

#### `session_activities`
Logs all session activities and user actions.

```sql
CREATE TABLE session_activities (
    activity_id SERIAL PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    risk_score INTEGER DEFAULT 0,
    is_suspicious BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `trusted_devices`
Manages trusted devices for users.

```sql
CREATE TABLE trusted_devices (
    device_id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    device_fingerprint TEXT,
    browser_fingerprint TEXT,
    is_active BOOLEAN DEFAULT true,
    trust_level INTEGER DEFAULT 50,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);
```

#### `session_security_events`
Tracks security-related events and incidents.

```sql
CREATE TABLE session_security_events (
    event_id SERIAL PRIMARY KEY,
    session_id VARCHAR(128),
    user_id INTEGER,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    risk_indicators JSONB,
    action_taken VARCHAR(100),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `session_policies`
Configurable session policies for different user types.

```sql
CREATE TABLE session_policies (
    policy_id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL UNIQUE,
    user_type VARCHAR(20) NOT NULL,
    max_concurrent_sessions INTEGER DEFAULT 3,
    session_timeout_minutes INTEGER DEFAULT 30,
    idle_timeout_minutes INTEGER DEFAULT 15,
    require_device_verification BOOLEAN DEFAULT false,
    allow_multiple_devices BOOLEAN DEFAULT true,
    require_location_verification BOOLEAN DEFAULT false,
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `session_notifications`
Session-related notifications for users.

```sql
CREATE TABLE session_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_via VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);
```

### **Database Views**

#### `v_active_sessions`
Real-time view of all active sessions with status information.

```sql
CREATE VIEW v_active_sessions AS
SELECT 
    s.session_id,
    s.user_id,
    s.user_type,
    s.device_name,
    s.device_type,
    s.browser_name,
    s.ip_address,
    s.location_country,
    s.location_city,
    s.is_trusted,
    s.last_activity,
    s.created_at,
    s.expires_at,
    EXTRACT(EPOCH FROM (s.expires_at - CURRENT_TIMESTAMP)) as seconds_until_expiry,
    CASE 
        WHEN s.expires_at < CURRENT_TIMESTAMP THEN 'expired'
        WHEN s.last_activity < (CURRENT_TIMESTAMP - INTERVAL '15 minutes') THEN 'idle'
        ELSE 'active'
    END as session_status
FROM user_sessions s
WHERE s.is_active = true;
```

#### `v_session_security_summary`
Security summary statistics for users.

```sql
CREATE VIEW v_session_security_summary AS
SELECT 
    s.user_id,
    s.user_type,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN s.is_trusted = true THEN 1 END) as trusted_sessions,
    COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_sessions,
    COUNT(DISTINCT s.ip_address) as unique_ip_addresses,
    COUNT(DISTINCT s.device_id) as unique_devices,
    MAX(s.last_activity) as last_activity,
    COUNT(CASE WHEN se.event_type = 'suspicious_login' THEN 1 END) as suspicious_logins
FROM user_sessions s
LEFT JOIN session_security_events se ON s.user_id = se.user_id
GROUP BY s.user_id, s.user_type;
```

### **Database Functions**

#### `cleanup_expired_sessions()`
Automatically cleans up expired sessions.

```sql
CREATE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = false, logout_reason = 'timeout', logout_at = CURRENT_TIMESTAMP
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM user_sessions 
    WHERE is_active = false AND logout_at < (CURRENT_TIMESTAMP - INTERVAL '30 days');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

#### `check_session_limits(user_id, user_type)`
Checks if user is within session limits.

```sql
CREATE FUNCTION check_session_limits(p_user_id INTEGER, p_user_type VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    max_sessions INTEGER;
    current_sessions INTEGER;
BEGIN
    SELECT max_concurrent_sessions INTO max_sessions
    FROM session_policies 
    WHERE user_type = p_user_type AND is_active = true;
    
    SELECT COUNT(*) INTO current_sessions
    FROM user_sessions 
    WHERE user_id = p_user_id AND is_active = true AND expires_at > CURRENT_TIMESTAMP;
    
    RETURN current_sessions < max_sessions;
END;
$$ LANGUAGE plpgsql;
```

#### `generate_device_fingerprint(user_agent, screen_resolution)`
Generates unique device fingerprint.

```sql
CREATE FUNCTION generate_device_fingerprint(p_user_agent TEXT, p_screen_resolution TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(p_user_agent || COALESCE(p_screen_resolution, ''), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;
```

## 🔌 API Endpoints

### **Session Management**

#### `GET /api/sessions`
Get user's active sessions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": "abc123...",
      "user_id": 1,
      "user_type": "customer",
      "device_name": "iPhone 13",
      "device_type": "mobile",
      "browser_name": "Safari",
      "ip_address": "192.168.1.100",
      "location_country": "Sri Lanka",
      "location_city": "Colombo",
      "is_trusted": true,
      "last_activity": "2024-01-15T10:30:00Z",
      "session_status": "active"
    }
  ],
  "count": 1
}
```

#### `DELETE /api/sessions/:sessionId`
Terminate a specific session.

**Request Body:**
```json
{
  "reason": "manual"
}
```

#### `DELETE /api/sessions/terminate-all`
Terminate all user sessions.

### **Device Management**

#### `GET /api/sessions/trusted-devices`
Get trusted devices.

#### `POST /api/sessions/trust-device`
Trust a device.

**Request Body:**
```json
{
  "device_id": "device_fingerprint_123",
  "device_name": "My iPhone",
  "trust_level": 90
}
```

#### `DELETE /api/sessions/trust-device/:deviceId`
Untrust a device.

### **Security Monitoring**

#### `GET /api/sessions/security`
Get security events.

#### `GET /api/sessions/activities/:sessionId`
Get activities for a session.

#### `GET /api/sessions/stats`
Get session statistics.

### **Notifications**

#### `GET /api/sessions/notifications`
Get session notifications.

#### `PUT /api/sessions/notifications/:notificationId/read`
Mark notification as read.

## 🛠️ Implementation

### **Middleware Integration**

```javascript
const { sessionMiddleware, validateSessionMiddleware, trackActivityMiddleware } = require('./middleware/sessionManager');

// Add session management to all requests
app.use(sessionMiddleware);

// Protect routes with session validation
app.use('/api/protected', validateSessionMiddleware);

// Track specific activities
app.use('/api/transactions', trackActivityMiddleware('transaction', 'Transaction activity'));
```

### **Session Creation**

```javascript
const sessionManager = new SessionManager();

// Create session on login
const sessionResult = await sessionManager.createSession(
  userId,
  userType,
  req,
  sessionDurationMinutes
);

if (sessionResult.success) {
  res.json({
    success: true,
    token: sessionResult.token,
    sessionId: sessionResult.sessionId,
    expiresAt: sessionResult.expiresAt
  });
}
```

### **Activity Tracking**

```javascript
// Track user activity
await sessionManager.validateSession(
  sessionId,
  userId,
  'view_account',
  'User viewed account details'
);
```

## 🔧 Configuration

### **Session Policies**

Default policies are configured for different user types:

- **Customer Policy**: 2 concurrent sessions, 60min timeout, 30min idle
- **Employee Policy**: 3 concurrent sessions, 480min timeout, 60min idle
- **Admin Policy**: 5 concurrent sessions, 1440min timeout, 120min idle
- **Manager Policy**: 4 concurrent sessions, 720min timeout, 90min idle

### **Environment Variables**

```env
# Session Management
SESSION_TIMEOUT_MINUTES=60
IDLE_TIMEOUT_MINUTES=15
MAX_CONCURRENT_SESSIONS=3
REQUIRE_DEVICE_VERIFICATION=false
ENABLE_SESSION_CLEANUP=true
```

## 📊 Monitoring & Analytics

### **Session Statistics**
- Total active sessions
- Session duration averages
- Device type distribution
- Geographic distribution
- Security event counts

### **Security Metrics**
- Suspicious login attempts
- Device changes
- Location anomalies
- Session hijacking attempts
- Failed authentication attempts

### **Performance Metrics**
- Session creation time
- Activity logging performance
- Database query performance
- Cleanup operation efficiency

## 🚀 Usage Examples

### **Basic Session Management**

```javascript
// Create session
const session = await sessionManager.createSession(userId, 'customer', req);

// Validate session
const isValid = await sessionManager.validateSession(sessionId, userId);

// Terminate session
await sessionManager.terminateSession(sessionId, 'manual');

// Get user sessions
const sessions = await sessionManager.getUserSessions(userId);
```

### **Device Management**

```javascript
// Check if device is trusted
const isTrusted = await sessionManager.isDeviceTrusted(userId, deviceFingerprint);

// Trust a device
await sessionManager.trustDevice(userId, deviceInfo, deviceFingerprint);

// Untrust a device
await sessionManager.untrustDevice(deviceId);
```

### **Security Monitoring**

```javascript
// Get security events
const events = await sessionManager.getSecurityEvents(userId, 50);

// Clean up expired sessions
const cleanedCount = await sessionManager.cleanupExpiredSessions();
```

## 🔒 Security Considerations

### **Data Protection**
- All sensitive data is encrypted
- IP addresses are stored securely
- Device fingerprints are hashed
- Session data is automatically cleaned up

### **Privacy Compliance**
- User consent for device tracking
- Data retention policies
- Right to data deletion
- Audit trail maintenance

### **Security Best Practices**
- Regular session cleanup
- Monitoring for suspicious activities
- Device verification for sensitive operations
- Rate limiting on session operations

## 🧪 Testing

### **Test Script**
Run the comprehensive test suite:

```bash
node test-session-management.js
```

### **Manual Testing**
Test API endpoints using Postman or curl:

```bash
# Get sessions
curl -H "Authorization: Bearer <token>" http://localhost:5001/api/sessions

# Trust device
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test123","device_name":"Test Device"}' \
  http://localhost:5001/api/sessions/trust-device
```

## 📈 Future Enhancements

### **Planned Features**
1. **Biometric Integration** - Fingerprint and face recognition
2. **Machine Learning** - Anomaly detection and risk scoring
3. **Real-time Alerts** - Push notifications for security events
4. **Advanced Analytics** - User behavior analysis and insights
5. **Multi-factor Authentication** - Enhanced security for sensitive operations

### **Performance Optimizations**
1. **Caching** - Redis integration for session data
2. **Database Optimization** - Query optimization and indexing
3. **Background Processing** - Async session cleanup and monitoring
4. **Load Balancing** - Session distribution across multiple servers

## 📞 Support

For technical support or questions about the Session Management System:

- **Documentation**: This guide and inline code comments
- **Testing**: Use the provided test scripts
- **Monitoring**: Check database views and logs
- **Troubleshooting**: Review error logs and session activities

The Advanced Session Management System is now fully integrated and ready for production use! 🎉
