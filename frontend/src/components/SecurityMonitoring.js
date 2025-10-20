import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  User, 
  Monitor,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import toast from 'react-hot-toast';

const SecurityMonitoring = () => {
  const [selectedTab, setSelectedTab] = useState('events');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [filters, setFilters] = useState({
    severity: 'all',
    eventType: 'all',
    resolved: 'all',
    timeRange: '24h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch security events
  const { data: securityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-security-events', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.eventType !== 'all') params.append('event_type', filters.eventType);
      if (filters.resolved !== 'all') params.append('resolved', filters.resolved);
      if (filters.timeRange !== 'all') params.append('time_range', filters.timeRange);
      
      const response = await api.get(`/sessions/security?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch session statistics for security overview
  const { data: sessionStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-session-stats'],
    queryFn: async () => {
      const response = await api.get('/sessions/stats');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch recent activities
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['admin-recent-activities'],
    queryFn: async () => {
      const response = await api.get('/sessions/activities/recent?limit=50');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Resolve event mutation
  const resolveEventMutation = useMutation({
    mutationFn: async ({ eventId, action }) => {
      const response = await api.put(`/sessions/security-events/${eventId}/resolve`, {
        action,
        resolved_by: 'admin'
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Event resolved successfully');
      queryClient.invalidateQueries(['admin-security-events']);
    },
    onError: (error) => {
      toast.error('Failed to resolve event');
      console.error('Resolve event error:', error);
    },
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return XCircle;
      case 'high': return AlertTriangle;
      case 'medium': return AlertTriangle;
      case 'low': return CheckCircle;
      default: return Shield;
    }
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'suspicious_login': return User;
      case 'multiple_failed_attempts': return AlertTriangle;
      case 'unusual_location': return MapPin;
      case 'device_change': return Monitor;
      case 'session_hijacking': return Shield;
      default: return Activity;
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

  const formatEventType = (eventType) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter events based on search term
  const filteredEvents = securityEvents?.data?.filter(event => 
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.ip_address?.includes(searchTerm) ||
    event.user_id?.toString().includes(searchTerm)
  ) || [];

  // Calculate security metrics
  const securityMetrics = {
    totalEvents: securityEvents?.count || 0,
    criticalEvents: securityEvents?.data?.filter(e => e.severity === 'critical').length || 0,
    highEvents: securityEvents?.data?.filter(e => e.severity === 'high').length || 0,
    unresolvedEvents: securityEvents?.data?.filter(e => !e.resolved).length || 0,
    resolvedEvents: securityEvents?.data?.filter(e => e.resolved).length || 0,
  };

  const tabs = [
    { id: 'events', name: 'Security Events', icon: Shield },
    { id: 'overview', name: 'Security Overview', icon: Activity },
    { id: 'activities', name: 'Recent Activities', icon: Clock },
  ];

  if (eventsLoading || statsLoading || activitiesLoading) {
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
            <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
            <p className="text-gray-600 mt-1">Monitor security events and system activities</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => queryClient.invalidateQueries(['admin-security-events'])}
              className="btn btn-outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{securityMetrics.totalEvents}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-900">{securityMetrics.criticalEvents}</p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-900">{securityMetrics.highEvents}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unresolved</p>
              <p className="text-2xl font-bold text-yellow-900">{securityMetrics.unresolvedEvents}</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-900">{securityMetrics.resolvedEvents}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

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
          {/* Security Events Tab */}
          {selectedTab === 'events' && (
            <div className="space-y-4">
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters({...filters, severity: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={filters.eventType}
                    onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="suspicious_login">Suspicious Login</option>
                    <option value="multiple_failed_attempts">Failed Attempts</option>
                    <option value="unusual_location">Unusual Location</option>
                    <option value="device_change">Device Change</option>
                    <option value="session_hijacking">Session Hijacking</option>
                  </select>
                  <select
                    value={filters.resolved}
                    onChange={(e) => setFilters({...filters, resolved: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="false">Unresolved</option>
                    <option value="true">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Security Events</h3>
                <span className="text-sm text-gray-500">
                  {filteredEvents.length} events
                </span>
              </div>
              
              {filteredEvents.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvents.map((event) => {
                    const SeverityIcon = getSeverityIcon(event.severity);
                    const EventIcon = getEventTypeIcon(event.event_type);
                    return (
                      <div key={event.event_id} className={`border rounded-lg p-4 ${getSeverityColor(event.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <SeverityIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <EventIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {formatEventType(event.event_type)}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                                  {event.severity}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatTimeAgo(event.created_at)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm">{event.description}</p>
                              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                                <span>User ID: {event.user_id}</span>
                                <span>IP: {event.ip_address}</span>
                                <span>Action: {event.action_taken}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {event.resolved ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <button
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowEventDetails(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No security events</h3>
                  <p className="mt-1 text-sm text-gray-500">No security events match your current filters.</p>
                </div>
              )}
            </div>
          )}

          {/* Security Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Security Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Session Security</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Sessions</span>
                      <span className="text-sm font-medium text-gray-900">{sessionStats?.data?.total_sessions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Sessions</span>
                      <span className="text-sm font-medium text-gray-900">{sessionStats?.data?.active_sessions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trusted Sessions</span>
                      <span className="text-sm font-medium text-gray-900">{sessionStats?.data?.trusted_sessions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Suspicious Logins</span>
                      <span className="text-sm font-medium text-gray-900">{sessionStats?.data?.suspicious_logins || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Device Security</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unique Devices</span>
                      <span className="text-sm font-medium text-gray-900">{sessionStats?.data?.unique_devices || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unique IP Addresses</span>
                      <span className="text-sm font-medium text-gray-900">{sessionStats?.data?.unique_ip_addresses || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Device Trust Level</span>
                      <span className="text-sm font-medium text-gray-900">
                        {sessionStats?.data?.trusted_sessions > 0 
                          ? Math.round((sessionStats.data.trusted_sessions / sessionStats.data.total_sessions) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Trends */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Security Trends</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">Security Score</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-2">85%</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-gray-600">Risk Level</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 mt-2">Low</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Activity Level</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-2">Normal</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activities Tab */}
          {selectedTab === 'activities' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                <span className="text-sm text-gray-500">
                  {recentActivities?.count || 0} activities
                </span>
              </div>
              
              {recentActivities?.data?.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.data.map((activity) => (
                    <div key={activity.activity_id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.activity_description}</p>
                            <p className="text-xs text-gray-500">
                              {activity.activity_type} • {formatTimeAgo(activity.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Risk: {activity.risk_score || 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activities</h3>
                  <p className="mt-1 text-sm text-gray-500">No activities have been recorded recently.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal
        isOpen={showEventDetails}
        onClose={() => setShowEventDetails(false)}
        title="Security Event Details"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <p className="mt-1 text-sm text-gray-900">{formatEventType(selectedEvent.event_type)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.severity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.user_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.ip_address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Action Taken</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.action_taken}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedEvent.resolved ? 'Resolved' : 'Unresolved'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedEvent.created_at).toLocaleString()}</p>
              </div>
              {selectedEvent.resolved_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resolved</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedEvent.resolved_at).toLocaleString()}</p>
                </div>
              )}
            </div>
            
            {selectedEvent.risk_indicators && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Risk Indicators</label>
                <div className="mt-1 text-sm text-gray-900">
                  <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedEvent.risk_indicators, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowEventDetails(false)}
                className="btn btn-outline"
              >
                Close
              </button>
              {!selectedEvent.resolved && (
                <button
                  onClick={() => {
                    resolveEventMutation.mutate({ 
                      eventId: selectedEvent.event_id, 
                      action: 'resolved_by_admin' 
                    });
                    setShowEventDetails(false);
                  }}
                  className="btn btn-primary"
                  disabled={resolveEventMutation.isPending}
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SecurityMonitoring;
