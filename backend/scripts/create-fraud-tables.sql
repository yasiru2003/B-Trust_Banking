-- Fraud Detection Database Tables
-- This script creates all necessary tables for the fraud monitoring system

-- 1. Fraud Rules Table
CREATE TABLE IF NOT EXISTS fraud_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'transaction', 'account', 'customer', 'pattern'
    conditions JSONB NOT NULL, -- JSON conditions for the rule
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fraud Alerts Table
CREATE TABLE IF NOT EXISTS fraud_alerts (
    alert_id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50),
    customer_id VARCHAR(50),
    account_number VARCHAR(50),
    rule_id INTEGER REFERENCES fraud_rules(rule_id),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    fraud_score DECIMAL(5,4) NOT NULL CHECK (fraud_score >= 0 AND fraud_score <= 1),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'false_positive')),
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(50),
    resolution_notes TEXT,
    metadata JSONB -- Additional data about the alert
);

-- 3. Fraud Detection Log Table
CREATE TABLE IF NOT EXISTS fraud_detection_log (
    log_id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50),
    customer_id VARCHAR(50),
    account_number VARCHAR(50),
    detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detection_result BOOLEAN NOT NULL, -- true if fraud detected
    fraud_score DECIMAL(5,4),
    processing_time_ms INTEGER,
    rules_checked JSONB, -- Which rules were checked
    ml_model_version VARCHAR(50),
    confidence_score DECIMAL(5,4)
);

-- 4. Fraud Dashboard Stats View (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS fraud_dashboard_stats AS
SELECT 
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
    COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_alerts,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
    COUNT(CASE WHEN detected_at >= CURRENT_DATE THEN 1 END) as today_alerts,
    AVG(fraud_score) as avg_fraud_score
FROM fraud_alerts;

-- 5. Recent Fraud Alerts View
CREATE MATERIALIZED VIEW IF NOT EXISTS recent_fraud_alerts AS
SELECT 
    fa.alert_id,
    fa.transaction_id,
    fa.customer_id,
    fa.account_number,
    fa.severity,
    fa.fraud_score,
    fa.status,
    fa.description,
    fa.detected_at,
    fa.resolved_at,
    fa.resolved_by,
    fa.resolution_notes,
    fr.rule_name,
    fr.rule_type,
    c.first_name || ' ' || c.last_name as customer_name,
    a.current_balance,
    t.amount as transaction_amount
FROM fraud_alerts fa
LEFT JOIN fraud_rules fr ON fa.rule_id = fr.rule_id
LEFT JOIN customer c ON fa.customer_id = c.customer_id
LEFT JOIN account a ON fa.account_number = a.account_number
LEFT JOIN transaction t ON fa.transaction_id = t.transaction_id
ORDER BY fa.detected_at DESC;

-- 6. Insert Default Fraud Rules
INSERT INTO fraud_rules (rule_name, rule_description, rule_type, conditions, severity) VALUES
('High Amount Transaction', 'Detect transactions above threshold', 'transaction', 
 '{"amount_threshold": 1000000, "currency": "LKR"}', 'high'),

('Rapid Successive Transactions', 'Multiple transactions in short time', 'pattern',
 '{"time_window_minutes": 5, "transaction_count": 3, "amount_threshold": 100000}', 'medium'),

('Unusual Time Transaction', 'Transactions outside business hours', 'transaction',
 '{"business_hours_start": "09:00", "business_hours_end": "17:00", "weekend_check": true}', 'low'),

('Large Withdrawal', 'High amount withdrawals', 'transaction',
 '{"transaction_type": "withdrawal", "amount_threshold": 500000}', 'high'),

('New Account Large Transaction', 'Large transactions on new accounts', 'account',
 '{"account_age_days": 30, "amount_threshold": 200000}', 'medium'),

('Geographic Anomaly', 'Transaction from unusual location', 'pattern',
 '{"location_check": true, "previous_locations": []}', 'medium'),

('Velocity Check', 'Too many transactions per day', 'pattern',
 '{"daily_limit": 10, "amount_threshold": 50000}', 'medium'),

('Account Balance Anomaly', 'Transaction exceeds account balance significantly', 'account',
 '{"balance_check": true, "overdraft_limit": 10000}', 'high')

ON CONFLICT (rule_name) DO NOTHING;

-- 7. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_transaction_id ON fraud_alerts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_customer_id ON fraud_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_detected_at ON fraud_alerts(detected_at);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_fraud_score ON fraud_alerts(fraud_score);

CREATE INDEX IF NOT EXISTS idx_fraud_detection_log_transaction_id ON fraud_detection_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_log_detection_time ON fraud_detection_log(detection_time);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_log_result ON fraud_detection_log(detection_result);

CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON fraud_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_type ON fraud_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_severity ON fraud_rules(severity);

-- 8. Create Function to Refresh Materialized Views
CREATE OR REPLACE FUNCTION refresh_fraud_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW fraud_dashboard_stats;
    REFRESH MATERIALIZED VIEW recent_fraud_alerts;
END;
$$ LANGUAGE plpgsql;

-- 9. Create Trigger to Auto-refresh Views (Optional)
CREATE OR REPLACE FUNCTION trigger_refresh_fraud_views()
RETURNS trigger AS $$
BEGIN
    PERFORM refresh_fraud_views();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-refresh
DROP TRIGGER IF EXISTS fraud_alerts_refresh_trigger ON fraud_alerts;
CREATE TRIGGER fraud_alerts_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fraud_alerts
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_fraud_views();

-- 10. Insert Sample Fraud Alerts (for testing)
INSERT INTO fraud_alerts (transaction_id, customer_id, account_number, rule_id, severity, fraud_score, status, description) VALUES
('TXN001', 'CUST001', 'ACC001', 1, 'high', 0.85, 'pending', 'High amount transaction detected'),
('TXN002', 'CUST002', 'ACC002', 4, 'high', 0.92, 'investigating', 'Large withdrawal from new account'),
('TXN003', 'CUST003', 'ACC003', 2, 'medium', 0.65, 'resolved', 'Rapid successive transactions - verified as legitimate'),
('TXN004', 'CUST004', 'ACC004', 7, 'medium', 0.70, 'pending', 'Velocity check triggered'),
('TXN005', 'CUST005', 'ACC005', 3, 'low', 0.45, 'false_positive', 'Transaction outside business hours - customer confirmed')

ON CONFLICT DO NOTHING;

-- 11. Grant Permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- 12. Create Comments for Documentation
COMMENT ON TABLE fraud_rules IS 'Rules for fraud detection with configurable conditions';
COMMENT ON TABLE fraud_alerts IS 'Generated fraud alerts with status tracking';
COMMENT ON TABLE fraud_detection_log IS 'Log of all fraud detection attempts and results';
COMMENT ON MATERIALIZED VIEW fraud_dashboard_stats IS 'Aggregated statistics for fraud dashboard';
COMMENT ON MATERIALIZED VIEW recent_fraud_alerts IS 'Recent fraud alerts with related data';

COMMENT ON COLUMN fraud_alerts.fraud_score IS 'Fraud probability score between 0 and 1';
COMMENT ON COLUMN fraud_alerts.metadata IS 'Additional JSON data about the alert';
COMMENT ON COLUMN fraud_rules.conditions IS 'JSON configuration for rule conditions';

-- 13. Initial refresh of materialized views
REFRESH MATERIALIZED VIEW fraud_dashboard_stats;
REFRESH MATERIALIZED VIEW recent_fraud_alerts;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Fraud detection tables created successfully!';
    RAISE NOTICE 'Tables created: fraud_rules, fraud_alerts, fraud_detection_log';
    RAISE NOTICE 'Views created: fraud_dashboard_stats, recent_fraud_alerts';
    RAISE NOTICE 'Default fraud rules inserted: %', (SELECT COUNT(*) FROM fraud_rules);
    RAISE NOTICE 'Sample fraud alerts inserted: %', (SELECT COUNT(*) FROM fraud_alerts);
END $$;