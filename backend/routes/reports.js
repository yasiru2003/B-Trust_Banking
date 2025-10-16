const express = require('express');
const router = express.Router();
const Joi = require('joi');
const reportService = require('../services/reportService');
const exportHelper = require('../utils/exportHelper');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All report routes require admin authentication
router.use(verifyToken, requireAdmin);

/**
 * GET /api/reports/agent-transactions
 * Get agent-wise transaction report
 */
router.get('/agent-transactions', async (req, res) => {
  try {
    // Validate query parameters
    const schema = Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).required(),
      branchId: Joi.number().integer().optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const data = await reportService.getAgentTransactions(value);

    res.json({
      success: true,
      data,
      totalRecords: data.length
    });
  } catch (error) {
    console.error('Agent transactions report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate agent transactions report'
    });
  }
});

/**
 * GET /api/reports/account-summary
 * Get account-wise transaction summary
 */
router.get('/account-summary', async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).required(),
      accountType: Joi.string().optional(),
      branchId: Joi.number().integer().optional(),
      minBalance: Joi.number().optional(),
      accountStatus: Joi.boolean().optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const data = await reportService.getAccountSummary(value);

    res.json({
      success: true,
      data,
      totalRecords: data.length
    });
  } catch (error) {
    console.error('Account summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate account summary report'
    });
  }
});

/**
 * GET /api/reports/active-fds
 * Get active fixed deposits report
 */
router.get('/active-fds', async (req, res) => {
  try {
    const schema = Joi.object({
      branchId: Joi.number().integer().optional(),
      fdType: Joi.string().optional(),
      maturityDateStart: Joi.date().optional(),
      maturityDateEnd: Joi.date().min(Joi.ref('maturityDateStart')).optional(),
      autoRenewal: Joi.boolean().optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const data = await reportService.getActiveFDs(value);

    res.json({
      success: true,
      data,
      totalRecords: data.length
    });
  } catch (error) {
    console.error('Active FDs report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate active FDs report'
    });
  }
});

/**
 * GET /api/reports/interest-distribution
 * Get monthly interest distribution summary
 */
router.get('/interest-distribution', async (req, res) => {
  try {
    const schema = Joi.object({
      month: Joi.number().integer().min(1).max(12).required(),
      year: Joi.number().integer().min(2000).max(2100).required(),
      accountType: Joi.string().optional(),
      branchId: Joi.number().integer().optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const data = await reportService.getInterestDistribution(value);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Interest distribution report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate interest distribution report'
    });
  }
});

/**
 * GET /api/reports/customer-activity
 * Get customer activity report
 */
router.get('/customer-activity', async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).required(),
      branchId: Joi.number().integer().optional(),
      agentId: Joi.string().optional(),
      activityStatus: Joi.string().valid('Active', 'Inactive').optional(),
      minTransactionCount: Joi.number().integer().optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const data = await reportService.getCustomerActivity(value);

    res.json({
      success: true,
      data,
      totalRecords: data.length
    });
  } catch (error) {
    console.error('Customer activity report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate customer activity report'
    });
  }
});

/**
 * POST /api/reports/export
 * Export report in specified format (PDF, Excel, CSV)
 */
router.post('/export', async (req, res) => {
  try {
    const schema = Joi.object({
      reportType: Joi.string().valid(
        'agent-transactions',
        'account-summary',
        'active-fds',
        'interest-distribution',
        'customer-activity'
      ).required(),
      format: Joi.string().valid('pdf', 'excel', 'csv').required(),
      data: Joi.array().required(),
      filters: Joi.object().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const { reportType, format, data, filters } = value;

    // Prepare export options
    const exportOptions = {
      title: exportHelper.getReportTitle(reportType),
      subtitle: `Total Records: ${data.length}`,
      data,
      columns: exportHelper.getReportColumns(reportType),
      filters: exportHelper.formatFilters(filters || {}),
      filename: `${reportType}_${new Date().toISOString().split('T')[0]}`,
      sheetName: exportHelper.getReportTitle(reportType).substring(0, 31) // Excel sheet name limit
    };

    // Generate and send file
    await exportHelper.exportReport(format, exportOptions, res);

  } catch (error) {
    console.error('Export report error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export report'
      });
    }
  }
});

/**
 * GET /api/reports/filters/branches
 * Get list of branches for filter dropdown
 */
router.get('/filters/branches', async (req, res) => {
  try {
    const branches = await reportService.getBranches();
    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches'
    });
  }
});

/**
 * GET /api/reports/filters/account-types
 * Get list of account types for filter dropdown
 */
router.get('/filters/account-types', async (req, res) => {
  try {
    const accountTypes = await reportService.getAccountTypes();
    res.json({
      success: true,
      data: accountTypes
    });
  } catch (error) {
    console.error('Get account types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account types'
    });
  }
});

/**
 * GET /api/reports/filters/fd-types
 * Get list of FD types for filter dropdown
 */
router.get('/filters/fd-types', async (req, res) => {
  try {
    const fdTypes = await reportService.getFDTypes();
    res.json({
      success: true,
      data: fdTypes
    });
  } catch (error) {
    console.error('Get FD types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FD types'
    });
  }
});

/**
 * GET /api/reports/filters/agents
 * Get list of agents for filter dropdown
 */
router.get('/filters/agents', async (req, res) => {
  try {
    const { branchId } = req.query;
    const agents = await reportService.getAgents(branchId ? parseInt(branchId) : null);
    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
});

module.exports = router;
