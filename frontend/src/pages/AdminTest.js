import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  Monitor, 
  Smartphone, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminTestPage = () => {
  // Test API connection
  const { data: testData, isLoading, error } = useQuery({
    queryKey: ['admin-test'],
    queryFn: async () => {
      try {
        const response = await api.get('/sessions/stats');
        return response.data;
      } catch (err) {
        console.error('API Test Error:', err);
        throw err;
      }
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-medium text-red-800">API Connection Error</h3>
        </div>
        <p className="mt-2 text-sm text-red-700">
          Failed to connect to the session management API. Please check:
        </p>
        <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
          <li>Backend server is running</li>
          <li>Session management routes are properly configured</li>
          <li>Database connection is working</li>
          <li>Authentication token is valid</li>
        </ul>
        <div className="mt-4">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <h3 className="text-lg font-medium text-green-800">Admin Dashboard Ready!</h3>
        </div>
        <p className="mt-2 text-sm text-green-700">
          Session management system is properly connected and working.
        </p>
      </div>

      {/* Test Data Display */}
      {testData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Session Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{testData.data?.total_sessions || 0}</p>
                </div>
                <Monitor className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{testData.data?.active_sessions || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trusted Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{testData.data?.trusted_sessions || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Devices</p>
                  <p className="text-2xl font-bold text-gray-900">{testData.data?.unique_devices || 0}</p>
                </div>
                <Smartphone className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Dashboard Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/sessions"
            className="btn btn-outline flex items-center justify-center space-x-2"
          >
            <Monitor className="h-4 w-4" />
            <span>Session Management</span>
          </a>
          <a
            href="/admin/devices"
            className="btn btn-outline flex items-center justify-center space-x-2"
          >
            <Smartphone className="h-4 w-4" />
            <span>Device Management</span>
          </a>
          <a
            href="/admin/security"
            className="btn btn-outline flex items-center justify-center space-x-2"
          >
            <Shield className="h-4 w-4" />
            <span>Security Monitoring</span>
          </a>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Session Management API</span>
            <span className="text-sm font-medium text-green-600">✓ Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database Connection</span>
            <span className="text-sm font-medium text-green-600">✓ Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Authentication</span>
            <span className="text-sm font-medium text-green-600">✓ Valid</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Admin Permissions</span>
            <span className="text-sm font-medium text-green-600">✓ Granted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTestPage;
