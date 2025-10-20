import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Clock, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  RefreshCw,
  Users,
  Activity,
  Lock,
  Unlock
} from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import toast from 'react-hot-toast';

const SessionManagement = () => {
  const [selectedTab, setSelectedTab] = useState('sessions');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch sessions data
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      const response = await api.get('/sessions');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch security events
  const { data: securityData, isLoading: securityLoading } = useQuery({
    queryKey: ['admin-security-events'],
    queryFn: async () => {
      const response = await api.get('/sessions/security?limit=100');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch session statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-session-stats'],
    queryFn: async () => {
      const response = await api.get('/sessions/stats');
      return response.data;
    },
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, reason = 'admin_action' }) => {
      const response = await api.delete(`/sessions/${sessionId}`, {
        data: { reason }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Session terminated successfully');
      queryClient.invalidateQueries(['admin-sessions']);
    },
    onError: (error) => {
      toast.error('Failed to terminate session');
      console.error('Terminate session error:', error);
    },
  });

  // Terminate all sessions mutation
  const terminateAllSessionsMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.delete('/sessions/terminate-all', {
        data: { reason: 'admin_action' }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('All sessions terminated successfully');
      queryClient.invalidateQueries(['admin-sessions']);
    },
    onError: (error) => {
      toast.error('Failed to terminate all sessions');
      console.error('Terminate all sessions error:', error);
    },
  });

  // Cleanup expired sessions mutation
  const cleanupSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/sessions/cleanup');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Cleaned up ${data.cleanedCount} expired sessions`);
      queryClient.invalidateQueries(['admin-sessions']);
    },
    onError: (error) => {
      toast.error('Failed to cleanup sessions');
      console.error('Cleanup sessions error:', error);
    },
  });

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'idle': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const tabs = [
    { id: 'sessions', name: 'Active Sessions', icon: Monitor },
    { id: 'security', name: 'Security Events', icon: Shield },
    { id: 'stats', name: 'Statistics', icon: Activity },
  ];

  if (sessionsLoading || securityLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage user sessions across the system</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => cleanupSessionsMutation.mutate()}
              disabled={cleanupSessionsMutation.isPending}
              className="btn btn-outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${cleanupSessionsMutation.isPending ? 'animate-spin' : ''}`} />
              Cleanup Expired
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.total_sessions || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Monitor className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.active_sessions || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Devices</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.unique_devices || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suspicious Logins</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.data?.suspicious_logins || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Sessions Tab */}
          {selectedTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
                <span className="text-sm text-gray-500">
                  {sessionsData?.count || 0} active sessions
                </span>
              </div>
              
              {sessionsData?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User & Device
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expires In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessionsData.data.map((session) => {
                        const DeviceIcon = getDeviceIcon(session.device_type);
                        return (
                          <tr key={session.session_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <DeviceIcon className="h-5 w-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    User ID: {session.user_id}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {session.device_name} • {session.browser_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                {session.location_city || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {session.ip_address}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.session_status)}`}>
                                {session.session_status}
                              </span>
                              {session.is_trusted && (
                                <div className="mt-1">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100">
                                    Trusted
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTimeAgo(session.last_activity)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {session.seconds_until_expiry > 0 ? (
                                <span className="text-green-600">
                                  {formatDuration(session.seconds_until_expiry)}
                                </span>
                              ) : (
                                <span className="text-red-600">Expired</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedSession(session);
                                    setShowSessionDetails(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => terminateSessionMutation.mutate({ sessionId: session.session_id })}
                                  className="text-red-600 hover:text-red-900"
                                  disabled={terminateSessionMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Monitor className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
                  <p className="mt-1 text-sm text-gray-500">No users are currently logged in.</p>
                </div>
              )}
            </div>
          )}

          {/* Security Events Tab */}
          {selectedTab === 'security' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Security Events</h3>
                <span className="text-sm text-gray-500">
                  {securityData?.count || 0} events
                </span>
              </div>
              
              {securityData?.data?.length > 0 ? (
                <div className="space-y-4">
                  {securityData.data.map((event) => (
                    <div key={event.event_id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {event.event_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatTimeAgo(event.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-700">{event.description}</p>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>User ID: {event.user_id}</span>
                            <span>IP: {event.ip_address}</span>
                            <span>Action: {event.action_taken}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {event.resolved ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No security events</h3>
                  <p className="mt-1 text-sm text-gray-500">No security events have been detected recently.</p>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {selectedTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Session Statistics</h3>
              
              {statsData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Session Overview</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Sessions</span>
                        <span className="text-sm font-medium text-gray-900">{statsData.data?.total_sessions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Sessions</span>
                        <span className="text-sm font-medium text-gray-900">{statsData.data?.active_sessions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Trusted Sessions</span>
                        <span className="text-sm font-medium text-gray-900">{statsData.data?.trusted_sessions || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Device & Security</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Unique Devices</span>
                        <span className="text-sm font-medium text-gray-900">{statsData.data?.unique_devices || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Unique IP Addresses</span>
                        <span className="text-sm font-medium text-gray-900">{statsData.data?.unique_ip_addresses || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Suspicious Logins</span>
                        <span className="text-sm font-medium text-gray-900">{statsData.data?.suspicious_logins || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal */}
      <Modal
        isOpen={showSessionDetails}
        onClose={() => setShowSessionDetails(false)}
        title="Session Details"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Session ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedSession.session_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="mt-1 text-sm text-gray-900">{selectedSession.user_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Device</label>
                <p className="mt-1 text-sm text-gray-900">{selectedSession.device_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Browser</label>
                <p className="mt-1 text-sm text-gray-900">{selectedSession.browser_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="mt-1 text-sm text-gray-900">{selectedSession.ip_address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">{selectedSession.location_city}, {selectedSession.location_country}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedSession.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedSession.last_activity).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowSessionDetails(false)}
                className="btn btn-outline"
              >
                Close
              </button>
              <button
                onClick={() => {
                  terminateSessionMutation.mutate({ sessionId: selectedSession.session_id });
                  setShowSessionDetails(false);
                }}
                className="btn btn-danger"
                disabled={terminateSessionMutation.isPending}
              >
                Terminate Session
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SessionManagement;
