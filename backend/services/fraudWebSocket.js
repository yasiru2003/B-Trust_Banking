const WebSocket = require('ws');
const db = require('../config/database');

class FraudWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/fraud'
    });
    this.clients = new Map();
    this.setupWebSocket();
    this.startFraudMonitoring();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('Fraud monitoring client connected');
      
      // Store client connection
      const clientId = Date.now() + Math.random();
      this.clients.set(clientId, ws);
      
      // Send initial fraud stats
      this.sendFraudStats(ws);
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('Fraud monitoring client disconnected');
        this.clients.delete(clientId);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });
  }

  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'subscribe':
        // Client wants to subscribe to specific fraud alerts
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          channels: data.channels || ['all'] 
        }));
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  async sendFraudStats(ws) {
    try {
      const result = await db.query('SELECT * FROM fraud_dashboard_stats');
      const stats = result.rows[0];
      
      ws.send(JSON.stringify({
        type: 'fraud_stats',
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
      }));
    } catch (error) {
      console.error('Error sending fraud stats:', error);
    }
  }

  async broadcastFraudAlert(alert) {
    const message = JSON.stringify({
      type: 'fraud_alert',
      data: {
        alert_id: alert.alert_id,
        transaction_id: alert.transaction_id,
        customer_id: alert.customer_id,
        account_number: alert.account_number,
        rule_id: alert.rule_id,
        severity: alert.severity,
        description: alert.description,
        fraud_score: alert.fraud_score,
        status: alert.status,
        detected_at: alert.detected_at,
        customer_name: alert.customer_name,
        amount: alert.amount,
        transaction_type: alert.transaction_type
      }
    });

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  async broadcastTransactionUpdate(transaction) {
    const message = JSON.stringify({
      type: 'transaction_update',
      data: {
        transaction_id: transaction.transaction_id,
        transaction_date: transaction.transaction_date,
        amount: transaction.amount,
        transaction_type: transaction.transaction_type,
        customer_id: transaction.customer_id,
        account_id: transaction.account_id,
        isFraud: transaction.isFraud || false,
        fraudScore: transaction.fraudScore || 0,
        severity: transaction.severity
      }
    });

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  startFraudMonitoring() {
    // Monitor for new fraud alerts every 5 seconds
    setInterval(async () => {
      try {
        // Get recent fraud alerts (last 5 seconds)
        const result = await db.query(`
          SELECT fa.*, c.first_name || ' ' || c.last_name as customer_name,
                 a.account_number, t.amount, tt.type_name as transaction_type
          FROM fraud_alerts fa
          LEFT JOIN customer c ON fa.customer_id = c.customer_id
          LEFT JOIN account a ON fa.account_number = a.account_number
          LEFT JOIN transaction t ON fa.transaction_id = t.transaction_id
          LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.transaction_type_id
          WHERE fa.detected_at >= NOW() - INTERVAL '5 seconds'
          ORDER BY fa.detected_at DESC
        `);

        result.rows.forEach(alert => {
          this.broadcastFraudAlert(alert);
        });

        // Broadcast updated stats to all clients
        this.clients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            this.sendFraudStats(ws);
          }
        });
      } catch (error) {
        console.error('Fraud monitoring error:', error);
      }
    }, 5000);
  }

  getConnectedClients() {
    return this.clients.size;
  }
}

module.exports = FraudWebSocketServer;
