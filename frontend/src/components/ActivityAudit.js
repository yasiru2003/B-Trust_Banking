import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Activity,
  Users
} from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const ActivityAudit = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    userId: '',
    userType: '',
    action: '',
    resourceType: '',
    success: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch activity audit logs
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['activity-audit', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/admin/activity-audit?${params}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch activity statistics
  const { data: statsData } = useQuery({
    queryKey: ['activity-audit-stats', filters.startDate, filters.endDate, filters.userType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userType) params.append('userType', filters.userType);
      
      const response = await api.get(`/admin/activity-audit/stats?${params}`);
      return response.data;
    },
  });

  // Fetch top users
  const { data: topUsersData } = useQuery({
    queryKey: ['activity-audit-top-users', filters.startDate, filters.endDate, filters.userType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userType) params.append('userType', filters.userType);
      
      const response = await api.get(`/admin/activity-audit/top-users?${params}`);
      return response.data;
    },
  });

  // Fetch activity trends
  const { data: trendsData } = useQuery({
    queryKey: ['activity-audit-trends', filters.userType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.userType) params.append('userType', filters.userType);
      
      const response = await api.get(`/admin/activity-audit/trends?${params}`);
      return response.data;
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/admin/activity-audit/export?${params}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-audit-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (success) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.total_activities || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.successful_activities || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.failed_activities || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.unique_users || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trends */}
        {trendsData && trendsData.data && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Trends (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData.data}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total_activities" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="successful_activities" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="failed_activities" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Users */}
        {topUsersData && topUsersData.data && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Active Users</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsersData.data.slice(0, 10)}>
                <XAxis dataKey="user_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activity_count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search activities..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
            <select
              value={filters.userType}
              onChange={(e) => handleFilterChange('userType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="employee">Employee</option>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Success Status</label>
            <select
              value={filters.success}
              onChange={(e) => handleFilterChange('success', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={handleExport}
              className="btn btn-outline flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activity Logs</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditData?.data?.map((log) => (
                <tr key={log.audit_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.user_name || log.user_id}</div>
                      <div className="text-sm text-gray-500">{log.user_type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.action}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.resource_type}</div>
                    {log.resource_id && (
                      <div className="text-sm text-gray-500">{log.resource_id}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(log.success)}
                      <span className="ml-2 text-sm text-gray-900">
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => viewLogDetails(log)}
                      className="text-blue-600 hover:text-blue-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {auditData?.data && auditData.data.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {filters.page} of {Math.ceil(auditData.data.length / filters.limit)}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
                className="btn btn-outline btn-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={auditData.data.length < filters.limit}
                className="btn btn-outline btn-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Activity Log Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="text-sm text-gray-900">{selectedLog.user_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Type</label>
                <p className="text-sm text-gray-900">{selectedLog.user_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <p className="text-sm text-gray-900">{selectedLog.action}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                <p className="text-sm text-gray-900">{selectedLog.resource_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                <p className="text-sm text-gray-900">{selectedLog.resource_id || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center">
                  {getStatusIcon(selectedLog.success)}
                  <span className="ml-2 text-sm text-gray-900">
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="text-sm text-gray-900">{selectedLog.ip_address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="text-sm text-gray-900">{formatDate(selectedLog.timestamp)}</p>
              </div>
            </div>
            
            {selectedLog.error_message && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Error Message</label>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{selectedLog.error_message}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Details</label>
              <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActivityAudit;

