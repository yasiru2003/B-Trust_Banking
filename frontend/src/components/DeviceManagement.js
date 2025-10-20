import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Shield, 
  ShieldCheck, 
  ShieldX,
  Clock,
  MapPin,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import api from '../services/authService';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import toast from 'react-hot-toast';

const DeviceManagement = () => {
  const [selectedTab, setSelectedTab] = useState('trusted');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showUntrustModal, setShowUntrustModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch trusted devices
  const { data: trustedDevices, isLoading: trustedLoading } = useQuery({
    queryKey: ['admin-trusted-devices'],
    queryFn: async () => {
      const response = await api.get('/sessions/trusted-devices');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch all sessions for device analysis
  const { data: allSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin-all-sessions'],
    queryFn: async () => {
      const response = await api.get('/sessions');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Trust device mutation
  const trustDeviceMutation = useMutation({
    mutationFn: async (deviceData) => {
      const response = await api.post('/sessions/trust-device', deviceData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Device trusted successfully');
      queryClient.invalidateQueries(['admin-trusted-devices']);
      setShowTrustModal(false);
    },
    onError: (error) => {
      toast.error('Failed to trust device');
      console.error('Trust device error:', error);
    },
  });

  // Untrust device mutation
  const untrustDeviceMutation = useMutation({
    mutationFn: async (deviceId) => {
      const response = await api.delete(`/sessions/trust-device/${deviceId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Device untrusted successfully');
      queryClient.invalidateQueries(['admin-trusted-devices']);
      setShowUntrustModal(false);
    },
    onError: (error) => {
      toast.error('Failed to untrust device');
      console.error('Untrust device error:', error);
    },
  });

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const getDeviceTypeColor = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return 'bg-blue-500';
      case 'tablet': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrustLevelColor = (trustLevel) => {
    if (trustLevel >= 80) return 'text-green-600 bg-green-100';
    if (trustLevel >= 60) return 'text-yellow-600 bg-yellow-100';
    if (trustLevel >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
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

  // Group sessions by device fingerprint
  const deviceSessions = allSessions?.data?.reduce((acc, session) => {
    const deviceId = session.device_id || 'unknown';
    if (!acc[deviceId]) {
      acc[deviceId] = {
        device_id: deviceId,
        device_name: session.device_name,
        device_type: session.device_type,
        browser_name: session.browser_name,
        sessions: [],
        users: new Set(),
        locations: new Set(),
        last_used: session.last_activity,
        is_trusted: session.is_trusted
      };
    }
    acc[deviceId].sessions.push(session);
    acc[deviceId].users.add(session.user_id);
    if (session.location_city) acc[deviceId].locations.add(session.location_city);
    if (new Date(session.last_activity) > new Date(acc[deviceId].last_used)) {
      acc[deviceId].last_used = session.last_activity;
    }
    return acc;
  }, {}) || {};

  const deviceList = Object.values(deviceSessions);

  const tabs = [
    { id: 'trusted', name: 'Trusted Devices', icon: ShieldCheck },
    { id: 'all', name: 'All Devices', icon: Monitor },
    { id: 'suspicious', name: 'Suspicious Devices', icon: AlertTriangle },
  ];

  if (trustedLoading || sessionsLoading) {
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
            <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
            <p className="text-gray-600 mt-1">Manage trusted devices and monitor device security</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTrustModal(true)}
              className="btn btn-primary"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Trust Device
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{deviceList.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Monitor className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trusted Devices</p>
              <p className="text-2xl font-bold text-gray-900">{trustedDevices?.count || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mobile Devices</p>
              <p className="text-2xl font-bold text-gray-900">
                {deviceList.filter(d => d.device_type === 'mobile').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspicious Devices</p>
              <p className="text-2xl font-bold text-gray-900">
                {deviceList.filter(d => d.users.size > 3 || d.locations.size > 2).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <AlertTriangle className="h-6 w-6 text-white" />
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
          {/* Trusted Devices Tab */}
          {selectedTab === 'trusted' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Trusted Devices</h3>
                <span className="text-sm text-gray-500">
                  {trustedDevices?.count || 0} trusted devices
                </span>
              </div>
              
              {trustedDevices?.data?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trustedDevices.data.map((device) => {
                    const DeviceIcon = getDeviceIcon(device.device_type);
                    return (
                      <div key={device.device_id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${getDeviceTypeColor(device.device_type)}`}>
                              <DeviceIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{device.device_name}</h4>
                              <p className="text-xs text-gray-500">{device.device_type} • {device.browser_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrustLevelColor(device.trust_level)}`}>
                              {device.trust_level}%
                            </span>
                            <button
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowUntrustModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <ShieldX className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Last used: {formatTimeAgo(device.last_used)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No trusted devices</h3>
                  <p className="mt-1 text-sm text-gray-500">No devices have been marked as trusted yet.</p>
                </div>
              )}
            </div>
          )}

          {/* All Devices Tab */}
          {selectedTab === 'all' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">All Devices</h3>
                <span className="text-sm text-gray-500">
                  {deviceList.length} devices
                </span>
              </div>
              
              {deviceList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Device
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Users
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sessions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Locations
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Used
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deviceList.map((device) => {
                        const DeviceIcon = getDeviceIcon(device.device_type);
                        const isSuspicious = device.users.size > 3 || device.locations.size > 2;
                        return (
                          <tr key={device.device_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getDeviceTypeColor(device.device_type)}`}>
                                    <DeviceIcon className="h-5 w-5 text-white" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {device.device_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {device.device_type} • {device.browser_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {device.users.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {device.sessions.length}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {device.locations.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTimeAgo(device.last_used)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                {device.is_trusted ? (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100">
                                    Trusted
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-gray-600 bg-gray-100">
                                    Not Trusted
                                  </span>
                                )}
                                {isSuspicious && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-red-600 bg-red-100">
                                    Suspicious
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedDevice(device);
                                    setShowDeviceDetails(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {!device.is_trusted && (
                                  <button
                                    onClick={() => {
                                      trustDeviceMutation.mutate({
                                        device_id: device.device_id,
                                        device_name: device.device_name,
                                        trust_level: 80
                                      });
                                    }}
                                    className="text-green-600 hover:text-green-900"
                                    disabled={trustDeviceMutation.isPending}
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                  </button>
                                )}
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
                  <p className="mt-1 text-sm text-gray-500">No devices have been detected yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Suspicious Devices Tab */}
          {selectedTab === 'suspicious' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Suspicious Devices</h3>
                <span className="text-sm text-gray-500">
                  {deviceList.filter(d => d.users.size > 3 || d.locations.size > 2).length} suspicious devices
                </span>
              </div>
              
              {deviceList.filter(d => d.users.size > 3 || d.locations.size > 2).length > 0 ? (
                <div className="space-y-4">
                  {deviceList.filter(d => d.users.size > 3 || d.locations.size > 2).map((device) => {
                    const DeviceIcon = getDeviceIcon(device.device_type);
                    return (
                      <div key={device.device_id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${getDeviceTypeColor(device.device_type)}`}>
                              <DeviceIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{device.device_name}</h4>
                              <p className="text-xs text-gray-500">{device.device_type} • {device.browser_name}</p>
                              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                                <span>Users: {device.users.size}</span>
                                <span>Sessions: {device.sessions.length}</span>
                                <span>Locations: {device.locations.size}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <button
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowDeviceDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-red-600">
                          <strong>Risk Indicators:</strong>
                          {device.users.size > 3 && <span className="ml-2">Multiple users</span>}
                          {device.locations.size > 2 && <span className="ml-2">Multiple locations</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No suspicious devices</h3>
                  <p className="mt-1 text-sm text-gray-500">All devices appear to be operating normally.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Device Details Modal */}
      <Modal
        isOpen={showDeviceDetails}
        onClose={() => setShowDeviceDetails(false)}
        title="Device Details"
      >
        {selectedDevice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Device Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDevice.device_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Device Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDevice.device_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Browser</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDevice.browser_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Device ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedDevice.device_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Users</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDevice.users?.size || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sessions</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDevice.sessions?.length || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Locations</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDevice.locations?.size || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Used</label>
                <p className="mt-1 text-sm text-gray-900">{formatTimeAgo(selectedDevice.last_used)}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowDeviceDetails(false)}
                className="btn btn-outline"
              >
                Close
              </button>
              {!selectedDevice.is_trusted && (
                <button
                  onClick={() => {
                    trustDeviceMutation.mutate({
                      device_id: selectedDevice.device_id,
                      device_name: selectedDevice.device_name,
                      trust_level: 80
                    });
                    setShowDeviceDetails(false);
                  }}
                  className="btn btn-primary"
                  disabled={trustDeviceMutation.isPending}
                >
                  Trust Device
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Trust Device Modal */}
      <Modal
        isOpen={showTrustModal}
        onClose={() => setShowTrustModal(false)}
        title="Trust Device"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Device ID</label>
            <input
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter device fingerprint"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Device Name</label>
            <input
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter device name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Trust Level</label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="80">High (80%)</option>
              <option value="60">Medium (60%)</option>
              <option value="40">Low (40%)</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setShowTrustModal(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle trust device logic here
                setShowTrustModal(false);
              }}
              className="btn btn-primary"
            >
              Trust Device
            </button>
          </div>
        </div>
      </Modal>

      {/* Untrust Device Modal */}
      <Modal
        isOpen={showUntrustModal}
        onClose={() => setShowUntrustModal(false)}
        title="Untrust Device"
      >
        {selectedDevice && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to untrust the device "{selectedDevice.device_name}"? 
              This will require additional verification for future logins from this device.
            </p>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowUntrustModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  untrustDeviceMutation.mutate(selectedDevice.device_id);
                }}
                className="btn btn-danger"
                disabled={untrustDeviceMutation.isPending}
              >
                Untrust Device
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DeviceManagement;
