-- Simplified Fraud Detection Tables Setup
-- This script creates fraud tables compatible with existing database structure

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS fraud_alerts CASCADE;
DROP TABLE IF EXISTS fraud_detection_log CASCADE;
DROP TABLE IF EXISTS fraud_rules CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fraud_dashboard_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS recent_fraud_alerts CASCADE;

-- 1. Fraud Rules Table (simplified)
CREATE TABLE fraud_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_description TEXT,
    rule_type VARCHAR(50) NOT NULL DEFAULT 'transaction',
    conditions JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fraud Alerts Table (simplified)
CREATE TABLE fraud_alerts (
    alert_id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50),
    customer_id VARCHAR(50),
    account_number VARCHAR(50),
    rule_id INTEGER REFERENCES fraud_rules(rule_id),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    fraud_score DECIMAL(5,4) NOT NULL DEFAULT 0.5 CHECK (fraud_score >= 0 AND fraud_score <= 1),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'false_positive')),
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(50),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- 3. Fraud Detection Log Table (simplified)
CREATE TABLE fraud_detection_log (
    log_id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50),
    customer_id VARCHAR(50),
    account_number VARCHAR(50),
    detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detection_result BOOLEAN NOT NULL DEFAULT false,
    fraud_score DECIMAL(5,4) DEFAULT 0.0,
    processing_time_ms INTEGER DEFAULT 0,
    rules_checked JSONB DEFAULT '[]',
    ml_model_version VARCHAR(50) DEFAULT 'v1.0',
    confidence_score DECIMAL(5,4) DEFAULT 0.0
);

-- 4. Insert Default Fraud Rules
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

('Velocity Check', 'Too many transactions per day', 'pattern',
 '{"daily_limit": 10, "amount_threshold": 50000}', 'medium'),

('Account Balance Anomaly', 'Transaction exceeds account balance significantly', 'account',
 '{"balance_check": true, "overdraft_limit": 10000}', 'high')

ON CONFLICT (rule_name) DO NOTHING;

-- 5. Create Simple Views (not materialized for now)
CREATE VIEW fraud_dashboard_stats AS
SELECT 
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
    COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_alerts,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
    COUNT(CASE WHEN detected_at >= CURRENT_DATE THEN 1 END) as today_alerts,
    COALESCE(AVG(fraud_score), 0) as avg_fraud_score
FROM fraud_alerts;

CREATE VIEW recent_fraud_alerts AS
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
    fr.rule_type
FROM fraud_alerts fa
LEFT JOIN fraud_rules fr ON fa.rule_id = fr.rule_id
ORDER BY fa.detected_at DESC;

-- 6. Create Indexes for Performance
CREATE INDEX idx_fraud_alerts_transaction_id ON fraud_alerts(transaction_id);
CREATE INDEX idx_fraud_alerts_customer_id ON fraud_alerts(customer_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_severity ON fraud_alerts(severity);
CREATE INDEX idx_fraud_alerts_detected_at ON fraud_alerts(detected_at);

CREATE INDEX idx_fraud_detection_log_transaction_id ON fraud_detection_log(transaction_id);
CREATE INDEX idx_fraud_detection_log_detection_time ON fraud_detection_log(detection_time);

CREATE INDEX idx_fraud_rules_active ON fraud_rules(is_active);

-- 7. Insert Sample Fraud Alerts (for testing)
INSERT INTO fraud_alerts (transaction_id, customer_id, account_number, rule_id, severity, fraud_score, status, description) VALUES
('TXN001', 'CUST001', 'ACC001', 1, 'high', 0.85, 'pending', 'High amount transaction detected'),
('TXN002', 'CUST002', 'ACC002', 4, 'high', 0.92, 'investigating', 'Large withdrawal from new account'),
('TXN003', 'CUST003', 'ACC003', 2, 'medium', 0.65, 'resolved', 'Rapid successive transactions - verified as legitimate'),
('TXN004', 'CUST004', 'ACC004', 6, 'medium', 0.70, 'pending', 'Velocity check triggered'),
('TXN005', 'CUST005', 'ACC005', 3, 'low', 0.45, 'false_positive', 'Transaction outside business hours - customer confirmed');

-- Success message
SELECT 'Fraud detection tables created successfully!' as message;
SELECT 'Tables created: fraud_rules, fraud_alerts, fraud_detection_log' as tables;
SELECT 'Views created: fraud_dashboard_stats, recent_fraud_alerts' as views;
SELECT COUNT(*) as fraud_rules_count FROM fraud_rules;
SELECT COUNT(*) as fraud_alerts_count FROM fraud_alerts;


