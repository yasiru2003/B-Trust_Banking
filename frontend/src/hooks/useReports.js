import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getAgentTransactions,
  getAccountSummary,
  getActiveFDs,
  getInterestDistribution,
  getCustomerActivity,
  exportReport,
  getBranches,
  getAccountTypes,
  getFDTypes,
  getAgents
} from '../api/reportsApi';
import toast from 'react-hot-toast';

/**
 * Custom hooks for report data fetching and export
 */

// Agent transactions report hook
export const useAgentTransactions = (filters, enabled = true) => {
  return useQuery({
    queryKey: ['agent-transactions', filters],
    queryFn: () => getAgentTransactions(filters),
    enabled: enabled && !!filters.startDate && !!filters.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Account summary report hook
export const useAccountSummary = (filters, enabled = true) => {
  return useQuery({
    queryKey: ['account-summary', filters],
    queryFn: () => getAccountSummary(filters),
    enabled: enabled && !!filters.startDate && !!filters.endDate,
    staleTime: 5 * 60 * 1000,
  });
};

// Active FDs report hook
export const useActiveFDs = (filters, enabled = true) => {
  return useQuery({
    queryKey: ['active-fds', filters],
    queryFn: () => getActiveFDs(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// Interest distribution report hook
export const useInterestDistribution = (filters, enabled = true) => {
  return useQuery({
    queryKey: ['interest-distribution', filters],
    queryFn: () => getInterestDistribution(filters),
    enabled: enabled && !!filters.month && !!filters.year,
    staleTime: 5 * 60 * 1000,
  });
};

// Customer activity report hook
export const useCustomerActivity = (filters, enabled = true) => {
  return useQuery({
    queryKey: ['customer-activity', filters],
    queryFn: () => getCustomerActivity(filters),
    enabled: enabled && !!filters.startDate && !!filters.endDate,
    staleTime: 5 * 60 * 1000,
  });
};

// Report export hook
export const useReportExport = () => {
  return useMutation({
    mutationFn: ({ reportType, format, data, filters }) =>
      exportReport(reportType, format, data, filters),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${variables.reportType}_${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully!');
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast.error('Failed to export report. Please try again.');
    }
  });
};

// Filter options hooks
export const useBranches = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    staleTime: 30 * 60 * 1000, // 30 minutes (branches don't change often)
  });
};

export const useAccountTypes = () => {
  return useQuery({
    queryKey: ['account-types'],
    queryFn: getAccountTypes,
    staleTime: 30 * 60 * 1000,
  });
};

export const useFDTypes = () => {
  return useQuery({
    queryKey: ['fd-types'],
    queryFn: getFDTypes,
    staleTime: 30 * 60 * 1000,
  });
};

export const useAgents = (branchId) => {
  return useQuery({
    queryKey: ['agents', branchId],
    queryFn: () => getAgents(branchId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
