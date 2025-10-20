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
  Activity,
  Play,
  BarChart3
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
  const [statusFilter, setStatusFilter] = useState('pending');
  const [timeRange, setTimeRange] = useState(30);

  // Fetch fraud detection statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['fraud-detection-stats'],
    queryFn: async () => {
      const response = await api.get('/fraud-detection/stats');
      return response.data.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch fraud alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['fraud-detection-alerts', statusFilter],
    queryFn: async () => {
      const response = await api.get(`/fraud-detection/alerts?status=${statusFilter}&limit=50`);
      return response.data.data;
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Rules are now static and displayed in the Detection Rules tab

  // Review alert mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ alertId, status, resolution_notes }) => {
      await api.put(`/fraud-detection/alerts/${alertId}/resolve`, { 
        status, 
        resolution_notes: resolution_notes || `Alert marked as ${status.toLowerCase()}` 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fraud-detection-alerts']);
      queryClient.invalidateQueries(['fraud-detection-stats']);
      toast.success('Alert reviewed successfully');
      setIsViewModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to review alert');
    }
  });

  // Run fraud detection on recent transactions
  const runDetectionMutation = useMutation({
    mutationFn: async ({ hours = 24 }) => {
      const response = await api.post('/fraud-detection/detect-recent', { hours });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['fraud-detection-alerts']);
      queryClient.invalidateQueries(['fraud-detection-stats']);
      toast.success(`Fraud detection completed: ${data.data.alertsGenerated} alerts from ${data.data.transactionsAnalyzed} transactions`);
    },
    onError: () => {
      toast.error('Failed to run fraud detection');
    }
  });

  const handleRunDetection = () => {
    runDetectionMutation.mutate({ hours: 24 });
  };

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setIsViewModalOpen(true);
  };

  const handleReviewAlert = (status) => {
    if (selectedAlert) {
      reviewMutation.mutate({
        alertId: selectedAlert.alert_id,
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

  const stats = statsData || {};
  const alerts = alertsData || [];

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
              <p className="text-2xl font-bold text-gray-900">{stats.high_alerts || 0}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.pending_alerts || 0}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.resolved_alerts || 0}</p>
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
            <button
              onClick={() => setActiveTab('actions')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'actions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detection Actions
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
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positives</option>
                  <option value="investigating">Investigating</option>
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
                        <tr key={alert.alert_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {alert.alert_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{alert.customer_id}</div>
                            <div className="text-sm text-gray-500">{alert.account_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {alert.metadata && JSON.parse(alert.metadata).transaction_amount ? 
                              formatCurrency(JSON.parse(alert.metadata).transaction_amount) : 
                              'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(alert.detected_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadge(alert.severity.toUpperCase())}`}>
                              {alert.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(alert.status.toUpperCase())}`}>
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

          {activeTab === 'actions' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Fraud Detection Actions</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Manually trigger fraud detection on recent transactions or specific transactions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-blue-100 rounded-full mr-3">
                        <Play className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Run Detection on Recent Transactions</h4>
                        <p className="text-sm text-gray-600">Analyze transactions from the last 24 hours</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleRunDetection}
                      disabled={runDetectionMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md flex items-center justify-center"
                    >
                      {runDetectionMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Running Detection...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Detection (Last 24 Hours)
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-green-100 rounded-full mr-3">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Detection Statistics</h4>
                        <p className="text-sm text-gray-600">View current fraud detection metrics</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Alerts:</span>
                        <span className="font-medium">{stats.total_alerts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending Review:</span>
                        <span className="font-medium text-yellow-600">{stats.pending_alerts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">High Severity:</span>
                        <span className="font-medium text-red-600">{stats.high_alerts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Today's Alerts:</span>
                        <span className="font-medium">{stats.today_alerts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Fraud Score:</span>
                        <span className="font-medium">{((stats.avg_fraud_score || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Real-time Monitoring</h3>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p>• <strong>Automatic Detection:</strong> All new transactions are automatically analyzed for fraud patterns</p>
                  <p>• <strong>WebSocket Alerts:</strong> Real-time fraud alerts are broadcast to connected admin dashboards</p>
                  <p>• <strong>Rule-based Analysis:</strong> 7 active fraud detection rules monitor different transaction patterns</p>
                  <p>• <strong>Risk Scoring:</strong> Each alert receives a fraud score from 0-100% based on detected patterns</p>
                </div>
              </div>
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
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.alert_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadge(selectedAlert.severity.toUpperCase())}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.customer_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.account_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Amount</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedAlert.metadata && JSON.parse(selectedAlert.metadata).transaction_amount ? 
                    formatCurrency(JSON.parse(selectedAlert.metadata).transaction_amount) : 
                    'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date/Time</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedAlert.detected_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedAlert.metadata && JSON.parse(selectedAlert.metadata).transaction_type ? 
                    JSON.parse(selectedAlert.metadata).transaction_type : 
                    'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedAlert.status.toUpperCase())}`}>
                    {selectedAlert.status}
                  </span>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAlert.description}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Fraud Score</label>
                <p className="mt-1 text-sm text-gray-900">{(selectedAlert.fraud_score * 100).toFixed(1)}%</p>
              </div>
            </div>

            {selectedAlert.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleReviewAlert('resolved')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleReviewAlert('false_positive')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  <XCircle className="h-4 w-4 inline mr-2" />
                  False Positive
                </button>
                <button
                  onClick={() => handleReviewAlert('investigating')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Investigate
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
