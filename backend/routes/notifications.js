const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasPermission } = require('../middleware/permissions');
const { verifyToken, requireEmployee } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const createNotificationSchema = Joi.object({
  recipient_id: Joi.string().required(),
  title: Joi.string().max(255).required(),
  message: Joi.string().required(),
  notification_type: Joi.string().valid('message', 'alert', 'system', 'transaction', 'kyc', 'account').default('message'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
});

// GET /api/notifications - Get user's notifications
router.get('/', verifyToken, requireEmployee, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';

    let query = `
      SELECT 
        n.*,
        sender.employee_name as sender_name,
        sender.email as sender_email,
        recipient.employee_name as recipient_name
      FROM notifications n
      LEFT JOIN employee_auth sender ON n.sender_id = sender.employee_id
      LEFT JOIN employee_auth recipient ON n.recipient_id = recipient.employee_id
      WHERE n.recipient_id = $1 AND n.recipient_type = 'employee'
    `;
    
    const params = [req.user.employee_id.trim()];
    let paramCount = 1;

    if (status !== 'all') {
      query += ` AND n.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM notifications n 
      WHERE n.recipient_id = $1 AND n.recipient_type = 'employee'
    `;
    const countParams = [req.user.employee_id.trim()];
    
    if (status !== 'all') {
      countQuery += ` AND n.status = $2`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', verifyToken, requireEmployee, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM notifications 
       WHERE recipient_id = $1 AND recipient_type = 'employee' AND status = 'unread'`,
      [req.user.employee_id.trim()]
    );

    res.json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// POST /api/notifications - Create a new notification
router.post('/', verifyToken, requireEmployee, async (req, res) => {
  try {
    const { error, value } = createNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { recipient_id, title, message, notification_type, priority } = value;

    // Check if recipient exists
    const recipientCheck = await db.query(
      'SELECT employee_id, employee_name FROM employee_auth WHERE employee_id = $1',
      [recipient_id.trim()]
    );

    if (recipientCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create notification
    const result = await db.query(
      `INSERT INTO notifications (sender_id, sender_type, recipient_id, recipient_type, title, message, notification_type, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.employee_id.trim(),
        'employee',
        recipient_id.trim(),
        'employee',
        title,
        message,
        notification_type,
        priority
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', verifyToken, requireEmployee, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const result = await db.query(
      `UPDATE notifications 
       SET status = 'read', read_at = CURRENT_TIMESTAMP 
       WHERE notification_id = $1 AND recipient_id = $2 AND recipient_type = 'employee'
       RETURNING *`,
      [notificationId, req.user.employee_id.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// PATCH /api/notifications/:id/archive - Archive notification
router.patch('/:id/archive', verifyToken, requireEmployee, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const result = await db.query(
      `UPDATE notifications 
       SET status = 'archived' 
       WHERE notification_id = $1 AND recipient_id = $2 AND recipient_type = 'employee'
       RETURNING *`,
      [notificationId, req.user.employee_id.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification archived',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification'
    });
  }
});

// GET /api/notifications/employees - Get list of employees for sending notifications
router.get('/employees', verifyToken, requireEmployee, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT employee_id, employee_name, email, role, branch_id 
       FROM employee_auth 
       WHERE status = true AND employee_id != $1
       ORDER BY role, employee_name`,
      [req.user.employee_id.trim()]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
});

module.exports = router;
