const express = require('express');
const router = express.Router();
const db = require('../config/database');
const fraudDetectionService = require('../services/fraudDetectionService');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/fraud/detect
 * Run fraud detection on a specific transaction
 */
router.post('/detect', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { transaction_id } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }
    
    // Get transaction details
    const db = require('../config/database');
    const transactionResult = await db.query(`
      SELECT t.*, c.customer_id, c.first_name, c.last_name
      FROM transaction t
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE t.transaction_id = $1
    `, [transaction_id]);
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    const transaction = transactionResult.rows[0];
    
    // Run fraud detection
    const alerts = await fraudDetectionService.analyzeTransaction(transaction);
    
    res.json({
      success: true,
      message: `Fraud detection completed for transaction ${transaction_id}`,
      data: {
        transaction_id,
        alerts_generated: alerts.length,
        alerts: alerts
      }
    });
    
  } catch (error) {
    console.error('Fraud detection API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run fraud detection'
    });
  }
});

/**
 * POST /api/fraud/detect-recent
 * Run fraud detection on recent transactions
 */
router.post('/detect-recent', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { hours = 24 } = req.body;
    
    const result = await fraudDetectionService.runFraudDetectionOnRecentTransactions(hours);
    
    res.json({
      success: true,
      message: `Fraud detection completed on recent transactions`,
      data: result
    });
    
  } catch (error) {
    console.error('Recent fraud detection API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run fraud detection on recent transactions'
    });
  }
});

/**
 * GET /api/fraud/stats
 * Get fraud detection statistics
 */
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await fraudDetectionService.getFraudStats();
    
    res.json({
      success: true,
      data: {
        total_alerts: parseInt(stats.total_alerts) || 0,
        pending_alerts: parseInt(stats.pending_alerts) || 0,
        investigating_alerts: parseInt(stats.investigating_alerts) || 0,
        resolved_alerts: parseInt(stats.resolved_alerts) || 0,
        critical_alerts: parseInt(stats.critical_alerts) || 0,
        high_alerts: parseInt(stats.high_alerts) || 0,
        today_alerts: parseInt(stats.today_alerts) || 0,
        avg_fraud_score: parseFloat(stats.avg_fraud_score) || 0
      }
    });
    
  } catch (error) {
    console.error('Fraud stats API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fraud statistics'
    });
  }
});

/**
 * GET /api/fraud/alerts
 * Get fraud alerts with filtering
 */
router.get('/alerts', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, status, severity, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        fa.alert_id,
        fa.transaction_id,
        fa.customer_id,
        fa.account_number,
        fa.rule_id,
        fa.severity,
        fa.fraud_score,
        fa.status,
        fa.description,
        fa.detected_at,
        fa.resolved_at,
        fa.resolved_by,
        fa.resolution_notes,
        fa.metadata
      FROM fraud_alerts fa
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      query += ` AND fa.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (severity) {
      query += ` AND fa.severity = $${++paramCount}`;
      params.push(severity);
    }
    
    query += ` ORDER BY fa.detected_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);
    
    const result = await db.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM fraud_alerts fa
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (status) {
      countQuery += ` AND fa.status = $${++countParamCount}`;
      countParams.push(status);
    }
    
    if (severity) {
      countQuery += ` AND fa.severity = $${++countParamCount}`;
      countParams.push(severity);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Format the response
    const alerts = result.rows.map(alert => ({
      alert_id: alert.alert_id,
      transaction_id: alert.transaction_id,
      customer_id: alert.customer_id,
      account_number: alert.account_number,
      rule_id: alert.rule_id,
      severity: alert.severity,
      fraud_score: parseFloat(alert.fraud_score),
      status: alert.status,
      description: alert.description,
      detected_at: alert.detected_at,
      resolved_at: alert.resolved_at,
      resolved_by: alert.resolved_by,
      resolution_notes: alert.resolution_notes,
      metadata: alert.metadata
    }));

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Fraud alerts API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fraud alerts'
    });
  }
});

/**
 * PUT /api/fraud/alerts/:alertId/resolve
 * Resolve a fraud alert
 */
router.put('/alerts/:alertId/resolve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution_notes, status = 'resolved' } = req.body;
    const resolvedBy = req.user.employee_id;
    
    const db = require('../config/database');
    
    const result = await db.query(`
      UPDATE fraud_alerts 
      SET status = $1, resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
      WHERE alert_id = $4
      RETURNING *
    `, [status, resolvedBy, resolution_notes, alertId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fraud alert not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Fraud alert resolved successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Resolve fraud alert API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve fraud alert'
    });
  }
});

module.exports = router;
