const db = require('../config/database');

class ActivityAuditService {
  // Log an activity
  static async logActivity({
    userId,
    userType,
    action,
    resourceType,
    resourceId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    success = true,
    errorMessage = null
  }) {
    try {
      const query = `
        INSERT INTO activity_audit (
          user_id, user_type, action, resource_type, resource_id,
          details, ip_address, user_agent, session_id, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING audit_id
      `;
      
      const values = [
        userId, userType, action, resourceType, resourceId,
        JSON.stringify(details), ipAddress, userAgent, sessionId, success, errorMessage
      ];

      const result = await db.query(query, values);
      return result.rows[0].audit_id;
    } catch (error) {
      console.error('Activity audit logging error:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  // Get activity audit logs with filters
  static async getActivityLogs({
    page = 1,
    limit = 50,
    userId = null,
    userType = null,
    action = null,
    resourceType = null,
    success = null,
    startDate = null,
    endDate = null,
    search = null
  } = {}) {
    try {
      let query = `
        SELECT 
          aa.*,
          CASE 
            WHEN aa.user_type = 'employee' THEN ea.employee_name
            WHEN aa.user_type = 'customer' THEN CONCAT(c.first_name, ' ', c.last_name)
            ELSE aa.user_id
          END as user_name,
          CASE 
            WHEN aa.user_type = 'employee' THEN ea.email
            WHEN aa.user_type = 'customer' THEN c.email
            ELSE NULL
          END as user_email
        FROM activity_audit aa
        LEFT JOIN employee_auth ea ON aa.user_id = ea.employee_id AND aa.user_type = 'employee'
        LEFT JOIN customer c ON aa.user_id = c.customer_id AND aa.user_type = 'customer'
        WHERE 1=1
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      // Add filters
      if (userId) {
        conditions.push(`aa.user_id = $${++paramCount}`);
        params.push(userId);
      }

      if (userType) {
        conditions.push(`aa.user_type = $${++paramCount}`);
        params.push(userType);
      }

      if (action) {
        conditions.push(`aa.action ILIKE $${++paramCount}`);
        params.push(`%${action}%`);
      }

      if (resourceType) {
        conditions.push(`aa.resource_type = $${++paramCount}`);
        params.push(resourceType);
      }

      if (success !== null) {
        conditions.push(`aa.success = $${++paramCount}`);
        params.push(success);
      }

      if (startDate) {
        conditions.push(`aa.timestamp >= $${++paramCount}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`aa.timestamp <= $${++paramCount}`);
        params.push(endDate);
      }

      if (search) {
        conditions.push(`(
          aa.action ILIKE $${++paramCount} OR 
          aa.resource_type ILIKE $${++paramCount} OR 
          aa.resource_id ILIKE $${++paramCount} OR
          aa.details::text ILIKE $${++paramCount}
        )`);
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` ORDER BY aa.timestamp DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get activity logs error:', error);
      throw error;
    }
  }

  // Get activity statistics
  static async getActivityStats({
    startDate = null,
    endDate = null,
    userType = null
  } = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_activities,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_activities,
          COUNT(CASE WHEN timestamp >= CURRENT_DATE THEN 1 END) as today_activities,
          COUNT(CASE WHEN timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as weekly_activities,
          COUNT(CASE WHEN timestamp >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_activities,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT action) as unique_actions
        FROM activity_audit
        WHERE 1=1
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (startDate) {
        conditions.push(`timestamp >= $${++paramCount}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`timestamp <= $${++paramCount}`);
        params.push(endDate);
      }

      if (userType) {
        conditions.push(`user_type = $${++paramCount}`);
        params.push(userType);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Get activity stats error:', error);
      throw error;
    }
  }

  // Get top users by activity
  static async getTopUsersByActivity({
    limit = 10,
    startDate = null,
    endDate = null,
    userType = null
  } = {}) {
    try {
      let query = `
        SELECT 
          aa.user_id,
          aa.user_type,
          CASE 
            WHEN aa.user_type = 'employee' THEN ea.employee_name
            WHEN aa.user_type = 'customer' THEN CONCAT(c.first_name, ' ', c.last_name)
            ELSE aa.user_id
          END as user_name,
          COUNT(*) as activity_count,
          COUNT(CASE WHEN aa.success = true THEN 1 END) as successful_count,
          COUNT(CASE WHEN aa.success = false THEN 1 END) as failed_count
        FROM activity_audit aa
        LEFT JOIN employee_auth ea ON aa.user_id = ea.employee_id AND aa.user_type = 'employee'
        LEFT JOIN customer c ON aa.user_id = c.customer_id AND aa.user_type = 'customer'
        WHERE 1=1
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (startDate) {
        conditions.push(`aa.timestamp >= $${++paramCount}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`aa.timestamp <= $${++paramCount}`);
        params.push(endDate);
      }

      if (userType) {
        conditions.push(`aa.user_type = $${++paramCount}`);
        params.push(userType);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += `
        GROUP BY aa.user_id, aa.user_type, user_name
        ORDER BY activity_count DESC
        LIMIT $${++paramCount}
      `;
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get top users error:', error);
      throw error;
    }
  }

  // Get activity trends (daily)
  static async getActivityTrends({
    days = 30,
    userType = null
  } = {}) {
    try {
      let query = `
        SELECT 
          DATE(aa.timestamp) as date,
          COUNT(*) as total_activities,
          COUNT(CASE WHEN aa.success = true THEN 1 END) as successful_activities,
          COUNT(CASE WHEN aa.success = false THEN 1 END) as failed_activities,
          COUNT(DISTINCT aa.user_id) as unique_users
        FROM activity_audit aa
        WHERE aa.timestamp >= CURRENT_DATE - INTERVAL '${days} days'
      `;
      
      const params = [];
      let paramCount = 0;

      if (userType) {
        query += ` AND aa.user_type = $${++paramCount}`;
        params.push(userType);
      }

      query += `
        GROUP BY DATE(aa.timestamp)
        ORDER BY date DESC
      `;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get activity trends error:', error);
      throw error;
    }
  }
}

module.exports = ActivityAuditService;

