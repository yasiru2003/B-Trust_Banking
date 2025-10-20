import api from '../services/authService';

/**
 * Reports API Service
 * Handles all API calls for admin reports
 */

// Get agent-wise transaction report
export const getAgentTransactions = async (filters) => {
  const response = await api.get('/reports/agent-transactions', { params: filters });
  return response.data;
};

// Get account-wise transaction summary
export const getAccountSummary = async (filters) => {
  const response = await api.get('/reports/account-summary', { params: filters });
  return response.data;
};

// Get active fixed deposits report
export const getActiveFDs = async (filters) => {
  const response = await api.get('/reports/active-fds', { params: filters });
  return response.data;
};

// Get monthly interest distribution
export const getInterestDistribution = async (filters) => {
  const response = await api.get('/reports/interest-distribution', { params: filters });
  return response.data;
};

// Get customer activity report
export const getCustomerActivity = async (filters) => {
  const response = await api.get('/reports/customer-activity', { params: filters });
  return response.data;
};

// Export report
export const exportReport = async (reportType, format, data, filters) => {
  const response = await api.post('/reports/export', {
    reportType,
    format,
    data,
    filters
  }, {
    responseType: 'blob' // Important for file downloads
  });
  return response.data;
};

// Get filter options
export const getBranches = async () => {
  const response = await api.get('/reports/filters/branches');
  return response.data;
};

export const getAccountTypes = async () => {
  const response = await api.get('/reports/filters/account-types');
  return response.data;
};

export const getFDTypes = async () => {
  const response = await api.get('/reports/filters/fd-types');
  return response.data;
};

export const getAgents = async (branchId) => {
  const params = branchId ? { branchId } : {};
  const response = await api.get('/reports/filters/agents', { params });
  return response.data;
};
