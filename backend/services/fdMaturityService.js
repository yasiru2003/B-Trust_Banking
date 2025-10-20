const db = require('../config/database');
const NotificationService = require('../services/notificationService');

class FDMaturityService {
  // Execute the SQL trigger setup
  static async setupFDMaturityTrigger() {
    try {
      console.log('Setting up FD maturity trigger...');
      
      // Create the trigger function
      const triggerFunctionSQL = `
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
                    notification_title, notification_message, 'alert', 'high', 'unread', CURRENT_TIMESTAMP
                );
            END IF;

            -- Insert notification for all managers
            INSERT INTO notifications (
                sender_id, sender_type, recipient_id, recipient_type, 
                title, message, notification_type, priority, status, created_at
            )
            SELECT 
                'SYSTEM', 'system', e.employee_id, 'employee',
                notification_title, notification_message, 'alert', 'high', 'unread', CURRENT_TIMESTAMP
            FROM employee_auth e
            WHERE e.role = 'Manager' AND e.status = true;

            -- Insert notification for all admins
            INSERT INTO notifications (
                sender_id, sender_type, recipient_id, recipient_type, 
                title, message, notification_type, priority, status, created_at
            )
            SELECT 
                'SYSTEM', 'system', e.employee_id, 'employee',
                notification_title, notification_message, 'alert', 'high', 'unread', CURRENT_TIMESTAMP
            FROM employee_auth e
            WHERE e.role = 'Admin' AND e.status = true;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      await db.query(triggerFunctionSQL);
      
      // Create the trigger
      const triggerSQL = `
        DROP TRIGGER IF EXISTS fd_maturity_notification_trigger ON fixed_deposit;
        CREATE TRIGGER fd_maturity_notification_trigger
            AFTER UPDATE ON fixed_deposit
            FOR EACH ROW
            WHEN (OLD.maturity_date != NEW.maturity_date AND NEW.maturity_date = CURRENT_DATE)
            EXECUTE FUNCTION notify_fd_maturity();
      `;
      
      await db.query(triggerSQL);
      
      console.log('✅ FD maturity trigger setup completed');
    } catch (error) {
      console.error('Error setting up FD maturity trigger:', error);
      throw error;
    }
  }

  // Check for upcoming FD maturities and send notifications
  static async checkUpcomingFDMaturities() {
    try {
      console.log('Checking for upcoming FD maturities...');
      
      // Get FDs maturing in 7, 3, and 1 days
      const query = `
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
      `;
      
      const result = await db.query(query);
      
      for (const fd of result.rows) {
        await NotificationService.notifyFDUpcomingMaturity(
          fd.fd_number,
          fd.customer_name,
          fd.agent_id,
          fd.days_until_maturity,
          fd.maturity_amount
        );
      }
      
      console.log(`📧 Sent ${result.rows.length} FD maturity reminders`);
      return result.rows.length;
    } catch (error) {
      console.error('Error checking upcoming FD maturities:', error);
      throw error;
    }
  }

  // Check for matured FDs and send notifications
  static async checkMaturedFDs() {
    try {
      console.log('Checking for matured FDs...');
      
      // Get FDs that matured today
      const query = `
        SELECT fd.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               c.agent_id,
               fd.balance_after + COALESCE((
                   SELECT SUM(interest_amount) 
                   FROM fd_interest_accrual 
                   WHERE fd_number = fd.fd_number
               ), 0) as maturity_amount
        FROM fixed_deposit fd
        LEFT JOIN account a ON fd.account_number = a.account_number
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE DATE(fd.maturity_date) = CURRENT_DATE
      `;
      
      const result = await db.query(query);
      
      for (const fd of result.rows) {
        await NotificationService.notifyFDMaturity(
          fd.fd_number,
          fd.customer_name,
          fd.agent_id,
          fd.maturity_amount
        );
      }
      
      console.log(`📧 Sent ${result.rows.length} FD maturity notifications`);
      return result.rows.length;
    } catch (error) {
      console.error('Error checking matured FDs:', error);
      throw error;
    }
  }

  // Manual trigger for testing - simulate FD maturity
  static async simulateFDMaturity(fdNumber) {
    try {
      console.log(`Simulating FD maturity for ${fdNumber}...`);
      
      // Get FD details
      const query = `
        SELECT fd.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               c.agent_id,
               fd.balance_after + COALESCE((
                   SELECT SUM(interest_amount) 
                   FROM fd_interest_accrual 
                   WHERE fd_number = fd.fd_number
               ), 0) as maturity_amount
        FROM fixed_deposit fd
        LEFT JOIN account a ON fd.account_number = a.account_number
        LEFT JOIN customer c ON a.customer_id = c.customer_id
        WHERE fd.fd_number = $1
      `;
      
      const result = await db.query(query, [fdNumber]);
      
      if (result.rows.length === 0) {
        throw new Error(`FD ${fdNumber} not found`);
      }
      
      const fd = result.rows[0];
      
      await NotificationService.notifyFDMaturity(
        fd.fd_number,
        fd.customer_name,
        fd.agent_id,
        fd.maturity_amount
      );
      
      console.log(`✅ Simulated FD maturity notification for ${fdNumber}`);
      return fd;
    } catch (error) {
      console.error('Error simulating FD maturity:', error);
      throw error;
    }
  }
}

module.exports = FDMaturityService;
