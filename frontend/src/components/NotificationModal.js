import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, X, Eye, Archive, AlertCircle, MessageCircle, Shield, CreditCard, UserCheck, Settings } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const NotificationModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('received');
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    recipient_id: '',
    title: '',
    message: '',
    notification_type: 'message',
    priority: 'normal'
  });

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', activeTab],
    queryFn: async () => {
      const response = await api.get(`/notifications?status=${activeTab === 'received' ? 'all' : 'unread'}`);
      return response.data;
    },
    enabled: isOpen
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    },
    enabled: isOpen
  });

  // Fetch employees for sending notifications
  const { data: employeesData } = useQuery({
    queryKey: ['notifications', 'employees'],
    queryFn: async () => {
      const response = await api.get('/notifications/employees');
      return response.data;
    },
    enabled: showCompose
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    }
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await api.patch(`/notifications/${notificationId}/archive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notification archived');
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/notifications', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notification sent successfully');
      setShowCompose(false);
      setComposeData({
        recipient_id: '',
        title: '',
        message: '',
        notification_type: 'message',
        priority: 'normal'
      });
      queryClient.invalidateQueries(['notifications']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    }
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle className="h-4 w-4" />;
      case 'alert': return <AlertCircle className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'transaction': return <CreditCard className="h-4 w-4" />;
      case 'kyc': return <UserCheck className="h-4 w-4" />;
      case 'account': return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900';
      case 'normal': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900';
      case 'low': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleArchive = (notificationId) => {
    archiveMutation.mutate(notificationId);
  };

  const handleSendNotification = (e) => {
    e.preventDefault();
    sendNotificationMutation.mutate(composeData);
  };

  const notifications = notificationsData?.data || [];
  const unreadCount = unreadCountData?.count || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'received'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Received ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'unread'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Unread ({notifications.filter(n => n.status === 'unread').length})
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="ml-auto px-6 py-3 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            <Send className="h-4 w-4 inline mr-1" />
            Send Message
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {showCompose ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Send Notification</h3>
              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    To
                  </label>
                  <select
                    value={composeData.recipient_id}
                    onChange={(e) => setComposeData({ ...composeData, recipient_id: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select recipient</option>
                    {employeesData?.data?.map((employee) => (
                      <option key={employee.employee_id} value={employee.employee_id}>
                        {employee.employee_name} ({employee.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={composeData.title}
                    onChange={(e) => setComposeData({ ...composeData, title: e.target.value })}
                    className="input w-full"
                    placeholder="Enter notification title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    value={composeData.message}
                    onChange={(e) => setComposeData({ ...composeData, message: e.target.value })}
                    className="input w-full h-24"
                    placeholder="Enter your message"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={composeData.notification_type}
                      onChange={(e) => setComposeData({ ...composeData, notification_type: e.target.value })}
                      className="input w-full"
                    >
                      <option value="message">Message</option>
                      <option value="alert">Alert</option>
                      <option value="system">System</option>
                      <option value="transaction">Transaction</option>
                      <option value="kyc">KYC</option>
                      <option value="account">Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={composeData.priority}
                      onChange={(e) => setComposeData({ ...composeData, priority: e.target.value })}
                      className="input w-full"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sendNotificationMutation.isPending}
                  >
                    {sendNotificationMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Sending...</span>
                      </>
                    ) : (
                      'Send Notification'
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No notifications found
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className={`p-4 rounded-lg border ${
                      notification.status === 'unread'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            {notification.status === 'unread' && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>From: {notification.sender_name || 'System'}</span>
                            <span>
                              {new Date(notification.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => handleMarkAsRead(notification.notification_id)}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
                            title="Mark as read"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleArchive(notification.notification_id)}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
