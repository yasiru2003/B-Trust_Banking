import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  Monitor, 
  Smartphone, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from './LoadingSpinner';
import SessionManagement from './SessionManagement';
import DeviceManagement from './DeviceManagement';
import SecurityMonitoring from './SecurityMonitoring';
import ActivityAudit from './ActivityAudit';

const AdminDashboard = () => {
  const [selectedView, setSelectedView] = useState('overview');
  const location = useLocation();

  // Set view based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/sessions')) {
      setSelectedView('sessions');
    } else if (path.includes('/admin/devices')) {
      setSelectedView('devices');
    } else if (path.includes('/admin/security')) {
      setSelectedView('security');
    } else if (path.includes('/admin/audit')) {
      setSelectedView('audit');
    } else {
      setSelectedView('overview');
    }
  }, [location.pathname]);

  // Fetch admin dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch session statistics
  const { data: sessionStats, isLoading: sessionStatsLoading } = useQuery({
    queryKey: ['admin-session-stats'],
    queryFn: async () => {
      const response = await api.get('/sessions/stats');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch security events summary
  const { data: securitySummary, isLoading: securityLoading } = useQuery({
    queryKey: ['admin-security-summary'],
    queryFn: async () => {
      const response = await api.get('/sessions/security?limit=10');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const views = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'sessions', name: 'Session Management', icon: Monitor },
    { id: 'devices', name: 'Device Management', icon: Smartphone },
    { id: 'security', name: 'Security Monitoring', icon: Shield },
    { id: 'audit', name: 'Activity Audit', icon: BarChart3 },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (dashboardLoading || sessionStatsLoading || securityLoading) {
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
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, Admin!
            </h1>
            <p className="text-gray-600 mt-1">Welcome to the B-Trust Banking Admin Dashboard</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    selectedView === view.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{view.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              {/* System Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData?.data?.total_customers || 0}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-500">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData?.data?.total_accounts || 0}</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-500">
                      <Monitor className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Balance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(dashboardData?.data?.total_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-yellow-500">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData?.data?.total_transactions || 0}</p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-500">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Management Overview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                        <p className="text-xl font-bold text-gray-900">{sessionStats?.data?.active_sessions || 0}</p>
                      </div>
                      <Monitor className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Trusted Devices</p>
                        <p className="text-xl font-bold text-gray-900">{sessionStats?.data?.trusted_sessions || 0}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Suspicious Logins</p>
                        <p className="text-xl font-bold text-gray-900">{sessionStats?.data?.suspicious_logins || 0}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Overview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Recent Security Events</h4>
                    {securitySummary?.data?.length > 0 ? (
                      <div className="space-y-2">
                        {securitySummary.data.slice(0, 5).map((event) => (
                          <div key={event.event_id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{event.event_type.replace(/_/g, ' ')}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {event.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No recent security events</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Security Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">System Security</span>
                        <span className="text-sm font-medium text-green-600">Good</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Session Security</span>
                        <span className="text-sm font-medium text-green-600">Good</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Device Security</span>
                        <span className="text-sm font-medium text-yellow-600">Monitor</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Network Security</span>
                        <span className="text-sm font-medium text-green-600">Good</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setSelectedView('sessions')}
                    className="btn btn-outline flex items-center justify-center space-x-2"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Manage Sessions</span>
                  </button>
                  <button
                    onClick={() => setSelectedView('devices')}
                    className="btn btn-outline flex items-center justify-center space-x-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Manage Devices</span>
                  </button>
                  <button
                    onClick={() => setSelectedView('security')}
                    className="btn btn-outline flex items-center justify-center space-x-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Security Monitor</span>
                  </button>
                  <button
                    onClick={() => window.open('/admin/settings', '_blank')}
                    className="btn btn-outline flex items-center justify-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>System Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Session Management Tab */}
          {selectedView === 'sessions' && (
            <SessionManagement />
          )}

          {/* Device Management Tab */}
          {selectedView === 'devices' && (
            <DeviceManagement />
          )}

          {/* Security Monitoring Tab */}
          {selectedView === 'security' && (
            <SecurityMonitoring />
          )}

          {/* Activity Audit Tab */}
          {selectedView === 'audit' && (
            <ActivityAudit />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
