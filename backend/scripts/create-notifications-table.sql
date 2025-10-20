-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    sender_id VARCHAR(20) NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('employee', 'customer', 'system')),
    recipient_id VARCHAR(20) NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('employee', 'customer', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'message' CHECK (notification_type IN ('message', 'alert', 'system', 'transaction', 'kyc', 'account')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (sender_id) REFERENCES employee_auth(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES employee_auth(employee_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Insert some sample notifications for testing
INSERT INTO notifications (sender_id, sender_type, recipient_id, recipient_type, title, message, notification_type, priority) VALUES
('AGENT001', 'employee', 'MANAGER001', 'employee', 'Customer KYC Update', 'Customer CUST015 KYC status has been updated to approved', 'kyc', 'normal'),
('AGENT002', 'employee', 'MANAGER001', 'employee', 'Transaction Alert', 'Large withdrawal transaction processed for account ACC002', 'transaction', 'high'),
('SYSTEM', 'system', 'AGENT001', 'employee', 'System Maintenance', 'Scheduled maintenance will occur tonight from 2 AM to 4 AM', 'system', 'normal'),
('MANAGER001', 'employee', 'AGENT001', 'employee', 'New Policy Update', 'Please review the updated customer verification procedures', 'message', 'normal');
