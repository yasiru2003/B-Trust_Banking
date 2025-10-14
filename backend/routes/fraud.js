const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireEmployee } = require('../middleware/auth');
const smsService = require('../services/smsService');

// Simple AI-like heuristic scoring for fraud detection over recent transactions
// POST /api/fraud/scan
// Body (optional): { days: number, amountThreshold: number, velocityWindowMins: number, velocityCount: number }
router.post('/scan', verifyToken, requireEmployee, async (req, res) => {
  try {
    const days = Number(req.body?.days) || 7;
    const amountThreshold = Number(req.body?.amountThreshold) || 100000; // LKR
    const velocityWindowMins = Number(req.body?.velocityWindowMins) || 10; // minutes
    const velocityCount = Number(req.body?.velocityCount) || 3; // transactions in window

    // Pull recent transactions with account and agent context
    const txQuery = `
      SELECT t.transaction_id, t.transaction_type_id, t.account_number, t.amount, t.date,
             e.employee_id as agent_id, e.employee_name as agent_name,
             a.customer_id, c.first_name, c.last_name
      FROM transaction t
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      WHERE t.date >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      ORDER BY t.account_number, t.date ASC
    `;
    const { rows: txs } = await db.query(txQuery);

    // Heuristics:
    // 1) High amount: amount >= amountThreshold
    // 2) Velocity: >= velocityCount transactions within velocityWindowMins for same account
    // 3) Rapid alternating DEP/WIT pattern (simple): 3 alternating within 20 mins
    const flagged = [];

    const byAccount = new Map();
    for (const t of txs) {
      if (!byAccount.has(t.account_number)) byAccount.set(t.account_number, []);
      byAccount.get(t.account_number).push(t);
    }

    const toTime = (d) => new Date(d).getTime();

    for (const [account, list] of byAccount.entries()) {
      // High-amount flags
      for (const t of list) {
        if (Number(t.amount) >= amountThreshold) {
          flagged.push({
            transaction_id: t.transaction_id,
            account_number: t.account_number,
            reason: 'HIGH_AMOUNT',
            score: 0.8,
            details: `Amount ${t.amount} >= threshold ${amountThreshold}`,
            date: t.date,
            customer_id: t.customer_id,
            agent_id: t.agent_id
          });
        }
      }

      // Velocity flags (sliding window)
      let i = 0;
      for (let j = 0; j < list.length; j++) {
        const startMs = toTime(list[j].date) - velocityWindowMins * 60 * 1000;
        while (i < j && toTime(list[i].date) < startMs) i++;
        const windowCount = j - i + 1;
        if (windowCount >= velocityCount) {
          const t = list[j];
          flagged.push({
            transaction_id: t.transaction_id,
            account_number: t.account_number,
            reason: 'HIGH_VELOCITY',
            score: 0.7,
            details: `${windowCount} txs within ${velocityWindowMins} mins`,
            date: t.date,
            customer_id: t.customer_id,
            agent_id: t.agent_id
          });
        }
      }

      // Alternating pattern DEP/WIT
      for (let k = 2; k < list.length; k++) {
        const t0 = list[k - 2];
        const t1 = list[k - 1];
        const t2 = list[k];
        const within20 = toTime(t2.date) - toTime(t0.date) <= 20 * 60 * 1000;
        const alt = t0.transaction_type_id !== t1.transaction_type_id && t1.transaction_type_id !== t2.transaction_type_id;
        if (within20 && alt) {
          flagged.push({
            transaction_id: t2.transaction_id,
            account_number: t2.account_number,
            reason: 'ALTERNATING_PATTERN',
            score: 0.6,
            details: `Rapid alternating tx types within 20 mins`,
            date: t2.date,
            customer_id: t2.customer_id,
            agent_id: t2.agent_id
          });
        }
      }
    }

    // Send SMS alerts for high-risk fraud detections
    for (const fraudAlert of flagged) {
      if (fraudAlert.score >= 0.7) { // Only send SMS for high-risk alerts
        try {
          // Get customer phone number
          const customerResult = await db.query(
            'SELECT phone_number FROM customer WHERE customer_id = $1',
            [fraudAlert.customer_id]
          );
          
          if (customerResult.rows.length > 0 && customerResult.rows[0].phone_number) {
            const fraudDetails = {
              accountNumber: fraudAlert.account_number,
              reason: fraudAlert.reason,
              amount: fraudAlert.amount || 0,
              timestamp: new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' }),
              transactionId: fraudAlert.transaction_id
            };
            
            await smsService.sendFraudAlertDetailed(
              customerResult.rows[0].phone_number,
              fraudDetails
            );
            
            console.log(`📱 Fraud alert SMS sent to ${customerResult.rows[0].phone_number} for account ${fraudAlert.account_number}`);
          }
        } catch (smsError) {
          console.error('Fraud alert SMS failed:', smsError);
          // Don't fail the fraud detection if SMS fails
        }
      }
    }

    // Return flagged set (non-destructive). We can add persistence later.
    res.json({ success: true, data: flagged });
  } catch (error) {
    console.error('Fraud scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to run fraud scan' });
  }
});

// GET /api/fraud - Get fraud detection records
router.get('/', verifyToken, requireEmployee, async (req, res) => {
  try {
    const query = `
      SELECT 
        fd.*,
        t.amount,
        t.date,
        ft.type_name as fraud_type,
        ea.employee_name as reviewed_by_name
      FROM fraud_detection fd
      LEFT JOIN transaction t ON fd.transaction_id = t.transaction_id
      LEFT JOIN fraud_type ft ON fd.fraudtype_id = ft.fraudtype_id
      LEFT JOIN employee_auth ea ON fd.reviewed_by = ea.employee_id
      ORDER BY fd.flag_id DESC
    `;
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get fraud records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fraud records'
    });
  }
});

// Export recent transactions with features as CSV for ML training
router.get('/export', async (req, res) => {
  try {
    const days = Number(req.query.days) || 180;
    const q = `
      SELECT 
        t.transaction_id,
        t.transaction_type_id,
        t.account_number,
        t.amount,
        t.date,
        a.acc_type_id,
        a.branch_id,
        a.current_balance,
        a.opening_date,
        c.customer_id,
        c.phone_is_verified,
        c.kyc_status,
        e.employee_id as agent_id,
        e.role as agent_role
      FROM transaction t
      LEFT JOIN account a ON t.account_number = a.account_number
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee_auth e ON t.agent_id = e.employee_id
      WHERE t.date >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      ORDER BY t.date DESC
    `;
    const { rows } = await db.query(q);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.csv"');

    const headers = [
      'transaction_id','transaction_type_id','account_number','amount','date','acc_type_id','branch_id','current_balance','opening_date','customer_id','phone_is_verified','kyc_status','agent_id','agent_role'
    ];
    res.write(headers.join(',') + '\n');
    for (const r of rows) {
      const line = headers.map(h => {
        const v = r[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
      res.write(line + '\n');
    }
    res.end();
  } catch (error) {
    console.error('Fraud export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

module.exports = router;
