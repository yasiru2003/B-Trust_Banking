const db = require('../config/database');

/**
 * Fraud Detection Service
 * Implements real-time fraud detection using database functions and rules
 */
class FraudDetectionService {
  
  /**
   * Analyze a transaction for fraud patterns
   * @param {Object} transaction - Transaction data
   * @returns {Promise<Array>} Array of fraud alerts
   */
  async analyzeTransaction(transaction) {
    const alerts = [];
    
    try {
      // Get all active fraud rules
      const rulesResult = await db.query(`
        SELECT rule_id, rule_name, rule_description, rule_type, conditions, severity
        FROM fraud_rules 
        WHERE is_active = true
        ORDER BY severity DESC, rule_id ASC
      `);
      
      const rules = rulesResult.rows;
      
      // Analyze transaction against each rule
      for (const rule of rules) {
        const alert = await this.checkRule(rule, transaction);
        if (alert) {
          alerts.push(alert);
        }
      }
      
      // If alerts found, save them to database
      if (alerts.length > 0) {
        await this.saveAlerts(alerts);
      }
      
      return alerts;
      
    } catch (error) {
      console.error('Fraud detection analysis error:', error);
      throw error;
    }
  }
  
  /**
   * Check a specific fraud rule against transaction
   * @param {Object} rule - Fraud rule
   * @param {Object} transaction - Transaction data
   * @returns {Promise<Object|null>} Fraud alert or null
   */
  async checkRule(rule, transaction) {
    try {
      const conditions = rule.conditions;
      
      switch (rule.rule_type) {
        case 'transaction':
          return await this.checkTransactionRule(rule, transaction, conditions);
        case 'pattern':
          return await this.checkPatternRule(rule, transaction, conditions);
        case 'account':
          return await this.checkAccountRule(rule, transaction, conditions);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error checking rule ${rule.rule_id}:`, error);
      return null;
    }
  }
  
  /**
   * Check transaction-based fraud rules
   */
  async checkTransactionRule(rule, transaction, conditions) {
    const amount = parseFloat(transaction.amount);
    const transactionType = transaction.transaction_type_id;
    const transactionDate = new Date(transaction.date);
    
    // High Amount Transaction
    if (rule.rule_id === 1 && amount > conditions.amount_threshold) {
      return this.createAlert(rule, transaction, {
        detected_value: amount,
        threshold: conditions.amount_threshold,
        description: `Transaction amount LKR ${amount.toLocaleString()} exceeds threshold of LKR ${conditions.amount_threshold.toLocaleString()}`
      });
    }
    
    // Large Withdrawal
    if (rule.rule_id === 4 && transactionType === 'WIT001' && amount > conditions.amount_threshold) {
      return this.createAlert(rule, transaction, {
        detected_value: amount,
        threshold: conditions.amount_threshold,
        description: `Large withdrawal of LKR ${amount.toLocaleString()} exceeds threshold of LKR ${conditions.amount_threshold.toLocaleString()}`
      });
    }
    
    // Unusual Time Transaction
    if (rule.rule_id === 3) {
      const hour = transactionDate.getHours();
      const dayOfWeek = transactionDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isOutsideHours = hour < parseInt(conditions.business_hours_start) || hour > parseInt(conditions.business_hours_end);
      
      if (isWeekend || isOutsideHours) {
        return this.createAlert(rule, transaction, {
          detected_value: `${transactionDate.toLocaleString()}`,
          threshold: `${conditions.business_hours_start}-${conditions.business_hours_end}`,
          description: `Transaction at unusual time: ${transactionDate.toLocaleString()} (${isWeekend ? 'Weekend' : 'Outside business hours'})`
        });
      }
    }
    
    return null;
  }
  
  /**
   * Check pattern-based fraud rules
   */
  async checkPatternRule(rule, transaction, conditions) {
    const accountNumber = transaction.account_number;
    const amount = parseFloat(transaction.amount);
    const transactionDate = new Date(transaction.date);
    
    // Rapid Successive Transactions
    if (rule.rule_id === 2) {
      const timeWindow = new Date(transactionDate.getTime() - (conditions.time_window_minutes * 60 * 1000));
      
      const recentTxnsResult = await db.query(`
        SELECT COUNT(*) as count, SUM(amount) as total_amount
        FROM transaction 
        WHERE account_number = $1 
        AND date >= $2 
        AND date <= $3
        AND transaction_id != $4
        AND status = true
      `, [accountNumber, timeWindow, transactionDate, transaction.transaction_id]);
      
      const recentTxns = recentTxnsResult.rows[0];
      
      if (parseInt(recentTxns.count) >= conditions.transaction_count && 
          parseFloat(recentTxns.total_amount) >= conditions.amount_threshold) {
        return this.createAlert(rule, transaction, {
          detected_value: `${recentTxns.count} transactions`,
          threshold: `${conditions.transaction_count} transactions`,
          description: `${recentTxns.count} transactions totaling LKR ${parseFloat(recentTxns.total_amount).toLocaleString()} in ${conditions.time_window_minutes} minutes`
        });
      }
    }
    
    // Velocity Check - Daily transaction limit
    if (rule.rule_id === 6) {
      const startOfDay = new Date(transactionDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(transactionDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dailyTxnsResult = await db.query(`
        SELECT COUNT(*) as count, SUM(amount) as total_amount
        FROM transaction 
        WHERE account_number = $1 
        AND date >= $2 
        AND date <= $3
        AND transaction_id != $4
        AND status = true
      `, [accountNumber, startOfDay, endOfDay, transaction.transaction_id]);
      
      const dailyTxns = dailyTxnsResult.rows[0];
      
      if (parseInt(dailyTxns.count) >= conditions.daily_limit) {
        return this.createAlert(rule, transaction, {
          detected_value: `${dailyTxns.count} transactions`,
          threshold: `${conditions.daily_limit} transactions`,
          description: `${dailyTxns.count} transactions today, exceeding daily limit of ${conditions.daily_limit}`
        });
      }
    }
    
    return null;
  }
  
  /**
   * Check account-based fraud rules
   */
  async checkAccountRule(rule, transaction, conditions) {
    const accountNumber = transaction.account_number;
    const amount = parseFloat(transaction.amount);
    
    // New Account Large Transaction
    if (rule.rule_id === 5) {
      const accountResult = await db.query(`
        SELECT a.opening_date, a.current_balance, c.first_name, c.last_name
        FROM account a
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE a.account_number = $1
      `, [accountNumber]);
      
      if (accountResult.rows.length > 0) {
        const account = accountResult.rows[0];
        const openingDate = new Date(account.opening_date);
        const accountAge = Math.floor((new Date() - openingDate) / (1000 * 60 * 60 * 24));
        
        if (accountAge <= conditions.account_age_days && amount >= conditions.amount_threshold) {
          return this.createAlert(rule, transaction, {
            detected_value: `${accountAge} days`,
            threshold: `${conditions.account_age_days} days`,
            description: `Large transaction LKR ${amount.toLocaleString()} on account opened ${accountAge} days ago`
          });
        }
      }
    }
    
    // Account Balance Anomaly
    if (rule.rule_id === 7) {
      const accountResult = await db.query(`
        SELECT current_balance, c.first_name, c.last_name
        FROM account a
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE a.account_number = $1
      `, [accountNumber]);
      
      if (accountResult.rows.length > 0) {
        const account = accountResult.rows[0];
        const currentBalance = parseFloat(account.current_balance);
        const transactionType = transaction.transaction_type_id;
        
        // Check for overdraft or suspicious balance changes
        if (transactionType === 'WIT001' && (currentBalance - amount) < -conditions.overdraft_limit) {
          return this.createAlert(rule, transaction, {
            detected_value: `LKR ${(currentBalance - amount).toLocaleString()}`,
            threshold: `LKR ${conditions.overdraft_limit.toLocaleString()}`,
            description: `Withdrawal would result in overdraft of LKR ${(currentBalance - amount).toLocaleString()}`
          });
        }
      }
    }
    
    return null;
  }
  
  /**
   * Create a fraud alert object
   */
  createAlert(rule, transaction, metadata) {
    const fraudScore = this.calculateFraudScore(rule.severity, metadata);
    
    return {
      transaction_id: transaction.transaction_id,
      customer_id: transaction.customer_id,
      account_number: transaction.account_number,
      rule_id: rule.rule_id,
      severity: rule.severity,
      fraud_score: fraudScore,
      status: 'pending',
      description: metadata.description,
      detected_at: new Date(),
      metadata: JSON.stringify({
        rule_name: rule.rule_name,
        detected_value: metadata.detected_value,
        threshold: metadata.threshold,
        transaction_amount: transaction.amount,
        transaction_type: transaction.transaction_type_id
      })
    };
  }
  
  /**
   * Calculate fraud score based on severity and metadata
   */
  calculateFraudScore(severity, metadata) {
    let baseScore = 0;
    
    switch (severity) {
      case 'high':
        baseScore = 0.8;
        break;
      case 'medium':
        baseScore = 0.6;
        break;
      case 'low':
        baseScore = 0.4;
        break;
      default:
        baseScore = 0.5;
    }
    
    // Add some randomness to make it more realistic
    const randomFactor = Math.random() * 0.2;
    return Math.min(1.0, baseScore + randomFactor);
  }
  
  /**
   * Save fraud alerts to database
   */
  async saveAlerts(alerts) {
    try {
      for (const alert of alerts) {
        await db.query(`
          INSERT INTO fraud_alerts (
            transaction_id, customer_id, account_number, rule_id, 
            severity, fraud_score, status, description, detected_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          alert.transaction_id,
          alert.customer_id,
          alert.account_number,
          alert.rule_id,
          alert.severity,
          alert.fraud_score,
          alert.status,
          alert.description,
          alert.detected_at,
          alert.metadata
        ]);
      }
      
      console.log(`✅ Saved ${alerts.length} fraud alerts to database`);
      
    } catch (error) {
      console.error('Error saving fraud alerts:', error);
      throw error;
    }
  }
  
  /**
   * Run fraud detection on recent transactions
   */
  async runFraudDetectionOnRecentTransactions(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const transactionsResult = await db.query(`
        SELECT t.*, c.customer_id, c.first_name, c.last_name
        FROM transaction t
        LEFT JOIN account a ON t.account_number = a.account_number
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE t.date >= $1 
        AND t.status = true
        ORDER BY t.date DESC
      `, [cutoffTime]);
      
      const transactions = transactionsResult.rows;
      let totalAlerts = 0;
      
      console.log(`🔍 Running fraud detection on ${transactions.length} recent transactions...`);
      
      for (const transaction of transactions) {
        const alerts = await this.analyzeTransaction(transaction);
        totalAlerts += alerts.length;
      }
      
      console.log(`✅ Fraud detection completed. Generated ${totalAlerts} alerts from ${transactions.length} transactions`);
      
      return {
        transactionsAnalyzed: transactions.length,
        alertsGenerated: totalAlerts
      };
      
    } catch (error) {
      console.error('Error running fraud detection on recent transactions:', error);
      throw error;
    }
  }
  
  /**
   * Get fraud detection statistics
   */
  async getFraudStats() {
    try {
      const statsResult = await db.query(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
          COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_alerts,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
          COUNT(CASE WHEN detected_at >= CURRENT_DATE THEN 1 END) as today_alerts,
          AVG(fraud_score) as avg_fraud_score
        FROM fraud_alerts
      `);
      
      return statsResult.rows[0];
      
    } catch (error) {
      console.error('Error getting fraud stats:', error);
      throw error;
    }
  }
}

module.exports = new FraudDetectionService();

