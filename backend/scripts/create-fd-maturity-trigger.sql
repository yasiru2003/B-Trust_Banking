-- FD Maturity Notification Trigger Function
-- This function will be called when FDs mature (maturity_date = CURRENT_DATE)

CREATE OR REPLACE FUNCTION notify_fd_maturity()
RETURNS TRIGGER AS $$
DECLARE
    customer_name TEXT;
    agent_id TEXT;
    maturity_amount NUMERIC;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get customer and agent information
    SELECT 
        CONCAT(c.first_name, ' ', c.last_name),
        c.agent_id,
        fd.balance_after + COALESCE((
            SELECT SUM(interest_amount) 
            FROM fd_interest_accrual 
            WHERE fd_number = fd.fd_number
        ), 0)
    INTO customer_name, agent_id, maturity_amount
    FROM fixed_deposit fd
    LEFT JOIN account a ON fd.account_number = a.account_number
    LEFT JOIN customer c ON a.customer_id = c.customer_id
    WHERE fd.fd_number = NEW.fd_number;

    -- Prepare notification details
    notification_title := 'Fixed Deposit Matured';
    notification_message := 'Fixed Deposit ' || NEW.fd_number || ' for customer ' || 
                          COALESCE(customer_name, 'Unknown') || 
                          ' has matured. Maturity amount: LKR ' || 
                          COALESCE(maturity_amount::TEXT, '0');

    -- Insert notification for the agent
    IF agent_id IS NOT NULL THEN
        INSERT INTO notifications (
            sender_id, sender_type, recipient_id, recipient_type, 
            title, message, notification_type, priority, status, created_at
        ) VALUES (
            'SYSTEM', 'system', agent_id, 'employee',
            notification_title, notification_message, 'fd_maturity', 'high', 'unread', CURRENT_TIMESTAMP
        );
    END IF;

    -- Insert notification for all managers
    INSERT INTO notifications (
        sender_id, sender_type, recipient_id, recipient_type, 
        title, message, notification_type, priority, status, created_at
    )
    SELECT 
        'SYSTEM', 'system', e.employee_id, 'employee',
        notification_title, notification_message, 'fd_maturity', 'high', 'unread', CURRENT_TIMESTAMP
    FROM employee_auth e
    WHERE e.role = 'Manager' AND e.status = true;

    -- Insert notification for all admins
    INSERT INTO notifications (
        sender_id, sender_type, recipient_id, recipient_type, 
        title, message, notification_type, priority, status, created_at
    )
    SELECT 
        'SYSTEM', 'system', e.employee_id, 'employee',
        notification_title, notification_message, 'fd_maturity', 'high', 'unread', CURRENT_TIMESTAMP
    FROM employee_auth e
    WHERE e.role = 'Admin' AND e.status = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for FD maturity
-- This trigger will fire when a FD's maturity_date is updated to CURRENT_DATE
CREATE OR REPLACE TRIGGER fd_maturity_notification_trigger
    AFTER UPDATE ON fixed_deposit
    FOR EACH ROW
    WHEN (OLD.maturity_date != NEW.maturity_date AND NEW.maturity_date = CURRENT_DATE)
    EXECUTE FUNCTION notify_fd_maturity();

-- Create a function to check for upcoming FD maturities (for daily reminders)
CREATE OR REPLACE FUNCTION check_upcoming_fd_maturities()
RETURNS VOID AS $$
DECLARE
    fd_record RECORD;
    customer_name TEXT;
    agent_id TEXT;
    maturity_amount NUMERIC;
    days_until_maturity INTEGER;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Check for FDs maturing in 7 days, 3 days, and 1 day
    FOR fd_record IN 
        SELECT fd.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               c.agent_id,
               fd.balance_after + COALESCE((
                   SELECT SUM(interest_amount) 
                   FROM fd_interest_accrual 
                   WHERE fd_number = fd.fd_number
               ), 0) as maturity_amount,
               (fd.maturity_date - CURRENT_DATE)::INTEGER as days_until_maturity
        FROM fixed_deposit fd
        LEFT JOIN account a ON fd.account_number = a.account_number
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE fd.maturity_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '7 days'
        AND (fd.maturity_date - CURRENT_DATE)::INTEGER IN (1, 3, 7)
    LOOP
        -- Prepare notification details
        notification_title := 'Fixed Deposit Maturity Reminder';
        notification_message := 'Fixed Deposit ' || fd_record.fd_number || 
                              ' for customer ' || COALESCE(fd_record.customer_name, 'Unknown') || 
                              ' will mature in ' || fd_record.days_until_maturity || ' days. ' ||
                              'Maturity amount: LKR ' || COALESCE(fd_record.maturity_amount::TEXT, '0');

        -- Insert notification for the agent
        IF fd_record.agent_id IS NOT NULL THEN
            INSERT INTO notifications (
                sender_id, sender_type, recipient_id, recipient_type, 
                title, message, notification_type, priority, status, created_at
            ) VALUES (
                'SYSTEM', 'system', fd_record.agent_id, 'employee',
                notification_title, notification_message, 'fd_reminder', 'normal', 'unread', CURRENT_TIMESTAMP
            );
        END IF;

        -- Insert notification for all managers
        INSERT INTO notifications (
            sender_id, sender_type, recipient_id, recipient_type, 
            title, message, notification_type, priority, status, created_at
        )
        SELECT 
            'SYSTEM', 'system', e.employee_id, 'employee',
            notification_title, notification_message, 'fd_reminder', 'normal', 'unread', CURRENT_TIMESTAMP
        FROM employee_auth e
        WHERE e.role = 'Manager' AND e.status = true;

    END LOOP;
END;
$$ LANGUAGE plpgsql;
