const pdfGenerator = require('./pdfGenerator');
const excelGenerator = require('./excelGenerator');
const csvGenerator = require('./csvGenerator');

/**
 * Export Helper - Unified interface for all export formats
 */
class ExportHelper {
  /**
   * Export report data in specified format
   * @param {String} format - 'pdf', 'excel', or 'csv'
   * @param {Object} options - Export options
   * @param {Object} res - Express response object
   */
  async exportReport(format, options, res) {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = options.filename || `report_${timestamp}`;

    try {
      switch (format.toLowerCase()) {
        case 'pdf':
          options.filename = `${baseFilename}.pdf`;
          await pdfGenerator.generatePDF(options, res);
          break;

        case 'excel':
        case 'xlsx':
          options.filename = `${baseFilename}.xlsx`;
          await excelGenerator.generateExcel(options, res);
          break;

        case 'csv':
          options.filename = `${baseFilename}.csv`;
          await csvGenerator.generateCSV(options, res);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      throw error;
    }
  }

  /**
   * Get report column definitions for different report types
   */
  getReportColumns(reportType) {
    const columnDefinitions = {
      'agent-transactions': [
        { key: 'employee_id', header: 'Employee ID', align: 'left' },
        { key: 'employee_name', header: 'Agent Name', align: 'left' },
        { key: 'branch_name', header: 'Branch', align: 'left' },
        { key: 'total_transactions', header: 'Total Trans.', align: 'right', format: 'number', showTotal: true },
        { key: 'total_value', header: 'Total Value', align: 'right', format: 'currency', showTotal: true },
        { key: 'avg_transaction_value', header: 'Avg Value', align: 'right', format: 'currency' },
        { key: 'deposits_count', header: 'Deposits', align: 'right', format: 'number' },
        { key: 'withdrawals_count', header: 'Withdrawals', align: 'right', format: 'number' },
        { key: 'completed_transactions', header: 'Completed', align: 'right', format: 'number' },
        { key: 'failed_transactions', header: 'Failed', align: 'right', format: 'number' }
      ],

      'account-summary': [
        { key: 'account_number', header: 'Account No.', align: 'left' },
        { key: 'customer_name', header: 'Customer', align: 'left' },
        { key: 'account_type', header: 'Type', align: 'left' },
        { key: 'branch_name', header: 'Branch', align: 'left' },
        { key: 'opening_balance', header: 'Opening Bal.', align: 'right', format: 'currency' },
        { key: 'total_deposits', header: 'Deposits', align: 'right', format: 'currency', showTotal: true },
        { key: 'total_withdrawals', header: 'Withdrawals', align: 'right', format: 'currency', showTotal: true },
        { key: 'current_balance', header: 'Current Bal.', align: 'right', format: 'currency', showTotal: true },
        { key: 'transaction_count', header: 'Trans. Count', align: 'right', format: 'number' },
        { key: 'last_transaction_date', header: 'Last Trans.', align: 'center', format: 'date' },
        { key: 'account_status', header: 'Status', align: 'center' }
      ],

      'active-fds': [
        { key: 'fd_number', header: 'FD Number', align: 'left' },
        { key: 'customer_name', header: 'Customer', align: 'left' },
        { key: 'fd_type_name', header: 'FD Type', align: 'left' },
        { key: 'branch_name', header: 'Branch', align: 'left' },
        { key: 'principal_amount', header: 'Principal', align: 'right', format: 'currency', showTotal: true },
        { key: 'interest_rate', header: 'Rate %', align: 'right', format: 'number' },
        { key: 'tenure_months', header: 'Tenure (Mo)', align: 'right', format: 'number' },
        { key: 'opening_date', header: 'Start Date', align: 'center', format: 'date' },
        { key: 'maturity_date', header: 'Maturity Date', align: 'center', format: 'date' },
        { key: 'days_to_maturity', header: 'Days Left', align: 'right', format: 'number' },
        { key: 'current_value', header: 'Current Value', align: 'right', format: 'currency' },
        { key: 'maturity_amount', header: 'Maturity Amt', align: 'right', format: 'currency', showTotal: true },
        { key: 'auto_renewal', header: 'Auto Renew', align: 'center' }
      ],

      'interest-distribution': [
        { key: 'account_type', header: 'Account Type', align: 'left' },
        { key: 'account_count', header: 'Accounts', align: 'right', format: 'number', showTotal: true },
        { key: 'total_principal', header: 'Total Principal', align: 'right', format: 'currency', showTotal: true },
        { key: 'interest_paid_this_month', header: 'Interest Paid', align: 'right', format: 'currency', showTotal: true },
        { key: 'avg_interest_rate', header: 'Avg Rate %', align: 'right', format: 'number' }
      ],

      'customer-activity': [
        { key: 'customer_id', header: 'Customer ID', align: 'left' },
        { key: 'customer_name', header: 'Customer Name', align: 'left' },
        { key: 'branch_name', header: 'Branch', align: 'left' },
        { key: 'agent_name', header: 'Agent', align: 'left' },
        { key: 'active_accounts', header: 'Accounts', align: 'right', format: 'number' },
        { key: 'net_balance', header: 'Net Balance', align: 'right', format: 'currency', showTotal: true },
        { key: 'deposits_count', header: 'Deposits', align: 'right', format: 'number', showTotal: true },
        { key: 'total_deposits_value', header: 'Deposit Value', align: 'right', format: 'currency', showTotal: true },
        { key: 'withdrawals_count', header: 'Withdrawals', align: 'right', format: 'number', showTotal: true },
        { key: 'total_withdrawals_value', header: 'Withdrawal Value', align: 'right', format: 'currency', showTotal: true },
        { key: 'last_transaction_date', header: 'Last Trans.', align: 'center', format: 'date' },
        { key: 'activity_status', header: 'Status', align: 'center' },
        { key: 'kyc_status', header: 'KYC', align: 'center' }
      ]
    };

    return columnDefinitions[reportType] || [];
  }

  /**
   * Get report title
   */
  getReportTitle(reportType) {
    const titles = {
      'agent-transactions': 'Agent-wise Transaction Report',
      'account-summary': 'Account-wise Transaction Summary',
      'active-fds': 'Active Fixed Deposits Report',
      'interest-distribution': 'Monthly Interest Distribution Summary',
      'customer-activity': 'Customer Activity Report'
    };

    return titles[reportType] || 'Report';
  }

  /**
   * Format filters for display
   */
  formatFilters(filters) {
    const formatted = {};

    if (filters.startDate) {
      formatted['Start Date'] = new Date(filters.startDate).toLocaleDateString();
    }

    if (filters.endDate) {
      formatted['End Date'] = new Date(filters.endDate).toLocaleDateString();
    }

    if (filters.branchId) {
      formatted['Branch ID'] = filters.branchId;
    }

    if (filters.accountType) {
      formatted['Account Type'] = filters.accountType;
    }

    if (filters.fdType) {
      formatted['FD Type'] = filters.fdType;
    }

    if (filters.agentId) {
      formatted['Agent ID'] = filters.agentId;
    }

    if (filters.activityStatus) {
      formatted['Activity Status'] = filters.activityStatus;
    }

    if (filters.month && filters.year) {
      formatted['Period'] = `${filters.month}/${filters.year}`;
    }

    if (filters.minBalance) {
      formatted['Min Balance'] = `$${filters.minBalance}`;
    }

    return formatted;
  }
}

module.exports = new ExportHelper();
