import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import FraudRulesDisplay from '../components/FraudRulesDisplay';
import api from '../services/authService';
import toast from 'react-hot-toast';

const FraudDetection = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [timeRange, setTimeRange] = useState(30);

  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['fraud-stats', timeRange],
    queryFn: async () => {
      const response = await api.get(`/fraud/dashboard-stats?days=${timeRange}`);
      return response.data.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch fraud alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['fraud-alerts', statusFilter],
    queryFn: async () => {
      const response = await api.get(`/fraud/alerts?status=${statusFilter}`);
      return response.data.data;
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Rules are now static and displayed in the Detection Rules tab

  // Review alert mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ flagId, status }) => {
      await api.put(`/fraud/alerts/${flagId}/review`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fraud-alerts']);
      queryClient.invalidateQueries(['fraud-stats']);
      toast.success('Alert reviewed successfully');
      setIsViewModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to review alert');
    }
  });

  // Removed manual scan - fraud detection is now automatic and real-time

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setIsViewModalOpen(true);
  };

  const handleReviewAlert = (status) => {
    if (selectedAlert) {
      reviewMutation.mutate({
        flagId: selectedAlert.flag_id,
        status
      });
    }
  };

  const getSeverityBadge = (level) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-800 border-red-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      FALSE_POSITIVE: 'bg-blue-100 text-blue-800',
      ESCALATED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    return `LKR ${parseFloat(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (statsLoading) {
    return <LoadingSpinner />;
  }

  const stats = statsData?.statistics || {};
  const recentAlerts = statsData?.recent_alerts || [];
  const alerts = alertsData || [];
  const rules = rulesData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Detection</h1>
          <p className="text-gray-600">Monitor and manage suspicious activities</p>
        </div>
        <div className="bg-green-100 border border-green-200 rounded-lg px-4 py-2 flex items-center">
          <Activity className="h-5 w-5 text-green-600 mr-2 animate-pulse" />
          <span className="text-sm font-medium text-green-800">
            Real-time Detection Active
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">{stats.high_risk || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_alerts || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'alerts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fraud Alerts
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'rules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detection Rules
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="FALSE_POSITIVE">False Positives</option>
                  <option value="ESCALATED">Escalated</option>
                </select>

                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              {/* Alerts Table */}
              {alertsLoading ? (
                <LoadingSpinner />
              ) : alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                  <p className="text-gray-500">No fraud alerts match the current filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alerts.map((alert) => (
                        <tr key={alert.flag_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {alert.flag_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{alert.customer_name}</div>
                            <div className="text-sm text-gray-500">{alert.account_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(alert.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(alert.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadge(alert.severity_level)}`}>
                              {alert.severity_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(alert.status)}`}>
                              {alert.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleViewAlert(alert)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="p-6">
              <FraudRulesDisplay />
            </div>
          )}
        </div>
      </div>

      {/* View Alert Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Fraud Alert Details"
        size="lg"
      >
        {selectedAlert && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Alert ID</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.flag_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadge(selectedAlert.severity_level)}`}>
                    {selectedAlert.severity_level}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.customer_name}</p>
                <p className="text-xs text-gray-500">{selectedAlert.customer_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.account_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Amount</label>
                <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedAlert.amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date/Time</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedAlert.date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.transaction_type_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedAlert.status)}`}>
                    {selectedAlert.status}
                  </span>
                </div>
              </div>
            </div>

            {selectedAlert.status === 'PENDING' && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleReviewAlert('RESOLVED')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleReviewAlert('FALSE_POSITIVE')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  <XCircle className="h-4 w-4 inline mr-2" />
                  False Positive
                </button>
                <button
                  onClick={() => handleReviewAlert('ESCALATED')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Escalate
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FraudDetection;
