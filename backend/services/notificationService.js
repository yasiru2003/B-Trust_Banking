const db = require('../config/database');

class NotificationService {
  // Send notification to specific employee
  static async sendNotification(senderId, recipientId, title, message, type = 'message', priority = 'normal') {
    try {
      const result = await db.query(
        `INSERT INTO notifications (sender_id, sender_type, recipient_id, recipient_type, title, message, notification_type, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [senderId, 'employee', recipientId, 'employee', title, message, type, priority]
      );
      
      console.log(`📧 Notification sent: ${title} to ${recipientId}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to all managers
  static async sendToManagers(senderId, title, message, type = 'message', priority = 'normal') {
    try {
      const managers = await db.query(
        'SELECT employee_id FROM employee_auth WHERE role = $1 AND status = true',
        ['Manager']
      );

      const notifications = [];
      for (const manager of managers.rows) {
        const notification = await this.sendNotification(
          senderId,
          manager.employee_id,
          title,
          message,
          type,
          priority
        );
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending notifications to managers:', error);
      throw error;
    }
  }

  // Send notification to all admins
  static async sendToAdmins(senderId, title, message, type = 'message', priority = 'normal') {
    try {
      const admins = await db.query(
        'SELECT employee_id FROM employee_auth WHERE role = $1 AND status = true',
        ['Admin']
      );

      const notifications = [];
      for (const admin of admins.rows) {
        const notification = await this.sendNotification(
          senderId,
          admin.employee_id,
          title,
          message,
          type,
          priority
        );
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending notifications to admins:', error);
      throw error;
    }
  }

  // Send notification to specific role
  static async sendToRole(senderId, role, title, message, type = 'message', priority = 'normal') {
    try {
      const employees = await db.query(
        'SELECT employee_id FROM employee_auth WHERE role = $1 AND status = true',
        [role]
      );

      const notifications = [];
      for (const employee of employees.rows) {
        const notification = await this.sendNotification(
          senderId,
          employee.employee_id,
          title,
          message,
          type,
          priority
        );
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error(`Error sending notifications to ${role}s:`, error);
      throw error;
    }
  }

  // Auto-notify for KYC status changes
  static async notifyKYCStatusChange(agentId, customerId, customerName, newStatus) {
    try {
      const title = 'Customer KYC Status Updated';
      const message = `Customer ${customerName} (${customerId}) KYC status has been updated to ${newStatus ? 'approved' : 'pending'}`;
      
      // Notify managers
      await this.sendToManagers(agentId, title, message, 'kyc', 'normal');
      
      console.log(`📧 KYC notification sent for customer ${customerId}`);
    } catch (error) {
      console.error('Error sending KYC notification:', error);
    }
  }

  // Auto-notify for large transactions
  static async notifyLargeTransaction(agentId, accountNumber, amount, transactionType) {
    try {
      const title = 'Large Transaction Alert';
      const message = `Large ${transactionType} transaction of LKR ${amount.toLocaleString()} processed for account ${accountNumber}`;
      
      // Notify managers for transactions over 50,000
      if (amount > 50000) {
        await this.sendToManagers(agentId, title, message, 'transaction', 'high');
        console.log(`📧 Large transaction notification sent for account ${accountNumber}`);
      }
    } catch (error) {
      console.error('Error sending transaction notification:', error);
    }
  }

  // Auto-notify for account creation
  static async notifyAccountCreation(agentId, accountNumber, customerName, accountType) {
    try {
      const title = 'New Account Created';
      const message = `New ${accountType} account ${accountNumber} has been created for customer ${customerName}`;
      
      // Notify managers
      await this.sendToManagers(agentId, title, message, 'account', 'normal');
      
      console.log(`📧 Account creation notification sent for account ${accountNumber}`);
    } catch (error) {
      console.error('Error sending account creation notification:', error);
    }
  }

  // Auto-notify for system events
  static async notifySystemEvent(event, description, priority = 'normal') {
    try {
      const title = `System Event: ${event}`;
      const message = description;
      
      // Notify all employees
      await this.sendToRole('SYSTEM', 'Agent', title, message, 'system', priority);
      await this.sendToRole('SYSTEM', 'Manager', title, message, 'system', priority);
      await this.sendToRole('SYSTEM', 'Admin', title, message, 'system', priority);
      
      console.log(`📧 System event notification sent: ${event}`);
    } catch (error) {
      console.error('Error sending system event notification:', error);
    }
  }
  // Auto-notify for FD maturity
  static async notifyFDMaturity(fdNumber, customerName, agentId, maturityAmount) {
    try {
      const title = 'Fixed Deposit Matured';
      const message = `Fixed Deposit ${fdNumber} for customer ${customerName} has matured. Maturity amount: LKR ${maturityAmount.toLocaleString()}`;
      
      // Notify the agent who opened the FD
      if (agentId) {
        await this.sendNotification('SYSTEM', agentId, title, message, 'alert', 'high');
      }
      
      // Notify all managers
      await this.sendToManagers('SYSTEM', title, message, 'alert', 'high');
      
      // Notify all admins
      await this.sendToAdmins('SYSTEM', title, message, 'alert', 'high');
      
      console.log(`📧 FD maturity notification sent for FD ${fdNumber}`);
    } catch (error) {
      console.error('Error sending FD maturity notification:', error);
    }
  }

  // Auto-notify for FD maturity (upcoming)
  static async notifyFDUpcomingMaturity(fdNumber, customerName, agentId, daysUntilMaturity, maturityAmount) {
    try {
      const title = 'Fixed Deposit Maturity Reminder';
      const message = `Fixed Deposit ${fdNumber} for customer ${customerName} will mature in ${daysUntilMaturity} days. Maturity amount: LKR ${maturityAmount.toLocaleString()}`;
      
      // Notify the agent who opened the FD
      if (agentId) {
        await this.sendNotification('SYSTEM', agentId, title, message, 'alert', 'normal');
      }
      
      // Notify all managers
      await this.sendToManagers('SYSTEM', title, message, 'alert', 'normal');
      
      console.log(`📧 FD maturity reminder sent for FD ${fdNumber}`);
    } catch (error) {
      console.error('Error sending FD maturity reminder:', error);
    }
  }
}

module.exports = NotificationService;
