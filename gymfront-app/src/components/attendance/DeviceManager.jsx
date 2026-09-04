// src/components/attendance/DeviceManager.jsx - COMPLETE WITH ZK TESTING

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Wifi, WifiOff, Copy, RefreshCw, 
  Eye, EyeOff, Edit, Check, X, AlertCircle, Loader2,
  DoorOpen, Lock, Unlock, Server, Laptop, HelpCircle,
  Zap
} from 'lucide-react';
import api, { API_BASE_URL } from '../../services/api';
import toast from 'react-hot-toast';

// The physical device must be told to connect to the BACKEND, never the
// frontend's own domain. window.location.hostname is wrong here — on
// production the frontend runs on gymmonitor.in while the backend/TCP
// listener runs on api.gymmonitor.in. Derive the backend host from the
// same API_BASE_URL the rest of the app already uses to talk to the API.
const getBackendHost = () => {
  try {
    return new URL(API_BASE_URL).hostname;
  } catch (e) {
    console.warn('Could not parse API_BASE_URL, falling back to window.location.hostname', e);
    return window.location.hostname;
  }
};

const DeviceManager = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showApiKey, setShowApiKey] = useState(null);
  const [testingDevice, setTestingDevice] = useState(null);
  
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [pollingInterval, setPollingInterval] = useState(null);
  const [statusLoading, setStatusLoading] = useState({});
  
  const [unlockingDevice, setUnlockingDevice] = useState(null);
  const [doorStatuses, setDoorStatuses] = useState({});
  
  const [connectionType, setConnectionType] = useState('bridge');
  
  const [formData, setFormData] = useState({
    device_name: '',
    device_ip: '',
    device_port: 4370,
    device_serial: '',
    location: '',
    connection_type: 'bridge',
    server_port: 8080,
  });
  const [formErrors, setFormErrors] = useState({});
  const [zkTesting, setZkTesting] = useState({});

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/attendance/devices');
      setDevices(response.data);
      
      if (response.data.length > 0) {
        await pollDeviceStatus(response.data);
        await fetchDoorStatuses(response.data);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      pollDeviceStatus(devices);
      fetchDoorStatuses(devices);
      
      const interval = setInterval(() => {
        pollDeviceStatus(devices);
        fetchDoorStatuses(devices);
      }, 15000);
      
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [devices.length]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const pollDeviceStatus = async (deviceList = devices) => {
    if (deviceList.length === 0) return;
    
    try {
      const statuses = {};
      for (const device of deviceList) {
        try {
          const response = await api.get(`/attendance/devices/${device.id}/status`);
          statuses[device.id] = response.data.is_online;
        } catch (error) {
          console.warn(`Failed to get status for device ${device.id}:`, error);
        }
      }
      setOnlineStatuses(prev => ({ ...prev, ...statuses }));
    } catch (error) {
      console.error('Error polling device status:', error);
    }
  };

  const fetchDoorStatuses = async (deviceList = devices) => {
    if (deviceList.length === 0) return;
    
    try {
      for (const device of deviceList) {
        try {
          const response = await api.get(`/gym/attendance/devices/${device.id}/door-status`);
          if (response.data) {
            setDoorStatuses(prev => ({
              ...prev,
              [device.id]: {
                status: response.data.door_status || 'unknown',
                is_online: response.data.is_online,
                last_updated: new Date()
              }
            }));
          }
        } catch (error) {
          setDoorStatuses(prev => ({
            ...prev,
            [device.id]: {
              status: 'unknown',
              is_online: device.is_online,
              last_updated: new Date()
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching door statuses:', error);
    }
  };

  const isDeviceOnline = (device) => {
    if (onlineStatuses[device.id] !== undefined) {
      return onlineStatuses[device.id];
    }
    
    if (!device.is_online) return false;
    
    if (device.last_seen) {
      const lastSeen = new Date(device.last_seen);
      const now = new Date();
      const diffSeconds = (now - lastSeen) / 1000;
      if (diffSeconds > 60) {
        return false;
      }
    }
    
    return true;
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.device_name.trim()) errors.device_name = 'Device name is required';
    if (!formData.device_ip.trim()) errors.device_ip = 'Device IP is required';
    if (!formData.device_serial.trim()) errors.device_serial = 'Device serial is required';
    
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (formData.device_ip && !ipPattern.test(formData.device_ip)) {
      errors.device_ip = 'Invalid IP address format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== ZK CONNECTION TEST =====
  const handleZKTest = async (device) => {
    if (device.connection_type !== 'server') {
      toast.info('This device is not in server mode. ZK test requires server mode.');
      return;
    }

    setZkTesting(prev => ({ ...prev, [device.id]: true }));
    const toastId = toast.loading(`Testing ZK connection to ${device.device_name}...`);
    
    try {
      const response = await api.post(`/attendance/devices/${device.id}/test-zk`);
      
      toast.dismiss(toastId);
      
      if (response.data.success) {
        toast.success(
          <div className="p-2">
            <p className="font-bold text-green-800 mb-1">✅ ZK Connection Successful!</p>
            <p className="text-sm text-gray-600">Device: {response.data.device_name}</p>
            <p className="text-xs text-gray-500">IP: {response.data.device_ip}:{response.data.device_port}</p>
            <p className="text-xs text-gray-500">Users on device: {response.data.user_count}</p>
            {response.data.device_time && (
              <p className="text-xs text-gray-500">Device Time: {new Date(response.data.device_time).toLocaleString()}</p>
            )}
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(
          <div className="p-2">
            <p className="font-bold text-red-800 mb-1">❌ ZK Connection Failed</p>
            <p className="text-sm text-gray-600">{response.data.message}</p>
            <p className="text-xs text-gray-500 mt-2">Make sure the device is powered on and reachable.</p>
          </div>,
          { duration: 8000 }
        );
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('ZK test error:', error);
      toast.error(`ZK test failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setZkTesting(prev => ({ ...prev, [device.id]: false }));
    }
  };

  const handleRegisterServerDevice = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/attendance/devices/register-server', {
        ...formData,
        connection_type: 'server'
      });
      
      toast.success('Device registered with server-based connection!');
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-blue-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Server className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">📡 Server Connection</p>
                  <p className="mt-1 text-sm text-gray-500">Device will communicate directly with:</p>
                  <code className="text-xs bg-gray-100 p-1 rounded block mt-1 font-mono">
                    {response.data.server_address || `${getBackendHost()}:${formData.server_port}`}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">Configure your device with this address.</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-blue-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      );
      
      resetForm();
      setShowModal(false);
      fetchDevices();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBridgeDevice = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/attendance/devices/register', {
        ...formData,
        connection_type: 'bridge'
      });
      
      toast.success('Device registered with bridge-based connection!');
      
      toast.success(
        <div className="p-2">
          <p className="font-bold text-green-800 mb-2">🔑 API Key Generated!</p>
          <code className="text-xs bg-gray-100 p-2 rounded block break-all font-mono">
            {response.data.api_key}
          </code>
          <p className="text-xs text-gray-600 mt-2">Save this key! You'll need it to configure the bridge.</p>
        </div>,
        { duration: 10000 }
      );
      
      resetForm();
      setShowModal(false);
      fetchDevices();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (connectionType === 'server') {
      await handleRegisterServerDevice(e);
    } else {
      await handleRegisterBridgeDevice(e);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await api.put(`/attendance/devices/${editingDevice.id}`, formData);
      toast.success('Device updated successfully!');
      resetForm();
      setShowModal(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId, deviceName) => {
    if (!window.confirm(`Delete device "${deviceName}"? This action cannot be undone.`)) return;
    
    setLoading(true);
    try {
      await api.delete(`/attendance/devices/${deviceId}`);
      toast.success('Device deleted successfully');
      fetchDevices();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete device');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateKey = async (deviceId, deviceName) => {
    if (!window.confirm(`⚠️ WARNING: Regenerating API key for "${deviceName}" will immediately invalidate the old key. The bridge will stop working until you update the configuration. Continue?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post(`/attendance/devices/${deviceId}/regenerate-key`);
      toast.success(
        <div className="p-2">
          <p className="font-bold text-yellow-800 mb-2">🔄 New API Key Generated!</p>
          <code className="text-xs bg-gray-100 p-2 rounded block break-all font-mono">
            {response.data.new_api_key}
          </code>
          <p className="text-xs text-gray-600 mt-2">Update this key in your bridge configuration.</p>
        </div>,
        { duration: 10000 }
      );
      fetchDevices();
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error(error.response?.data?.detail || 'Failed to regenerate API key');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (device) => {
    const toastId = toast.loading(`Checking ${device.device_name}...`);
    setTestingDevice(device.id);
    setStatusLoading(prev => ({ ...prev, [device.id]: true }));
    
    try {
      const statusResponse = await api.get(`/attendance/devices/${device.id}/status`);
      const isOnline = statusResponse.data.is_online;
      const lastSeenSeconds = statusResponse.data.last_seen_seconds_ago;
      
      toast.dismiss(toastId);
      setStatusLoading(prev => ({ ...prev, [device.id]: false }));
      
      setOnlineStatuses(prev => ({ ...prev, [device.id]: isOnline }));
      
      if (isOnline) {
        const connectionLabel = device.connection_type === 'server' ? '🌐 Server' : '🔗 Bridge';
        toast.success(
          <div className="p-2">
            <p className="font-bold text-green-800 mb-1">✅ {device.device_name} is Online!</p>
            <p className="text-sm text-gray-600">Connection: {connectionLabel}</p>
            {lastSeenSeconds !== null && lastSeenSeconds !== undefined && (
              <p className="text-xs text-gray-500 mt-1">Last seen: {lastSeenSeconds} seconds ago</p>
            )}
            <p className="text-xs text-gray-500 mt-1">IP: {device.device_ip}:{device.device_port}</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.custom(
          <div className="p-2">
            <p className="font-bold text-orange-800 mb-1">⚠️ {device.device_name} is Offline</p>
            <p className="text-sm text-gray-600">Device is not responding.</p>
            {lastSeenSeconds !== null && lastSeenSeconds !== undefined && (
              <p className="text-xs text-gray-500 mt-1">Last seen: {lastSeenSeconds} seconds ago</p>
            )}
          </div>,
          { duration: 5000 }
        );
      }
    } catch (error) {
      toast.dismiss(toastId);
      setStatusLoading(prev => ({ ...prev, [device.id]: false }));
      console.error('Test connection error:', error);
      
      toast.error(
        <div className="p-2">
          <p className="font-bold text-red-800 mb-1">❌ Connection Error</p>
          <p className="text-sm text-gray-600">{error.response?.data?.detail || error.message}</p>
        </div>
      );
    } finally {
      setTestingDevice(null);
    }
  };

  const handleUnlockDoor = async (device) => {
    if (!window.confirm(`Unlock the door for ${device.device_name}?`)) {
      return;
    }

    setUnlockingDevice(device.id);
    const toastId = toast.loading(`Unlocking door on ${device.device_name}...`);
    
    try {
      const response = await api.post(
        `/gym/attendance/devices/${device.id}/unlock-door?duration=10`
      );
      
      toast.dismiss(toastId);
      
      if (response.data.success) {
        toast.success(
          <div className="p-2">
            <p className="font-bold text-green-800 mb-1">🚪 Door Unlocked!</p>
            <p className="text-sm text-gray-600">{response.data.message}</p>
            <p className="text-xs text-gray-500 mt-1">Duration: {response.data.duration} seconds</p>
          </div>,
          { duration: 5000 }
        );
        
        setDoorStatuses(prev => ({
          ...prev,
          [device.id]: { 
            status: 'unlocked', 
            is_online: true,
            last_updated: new Date() 
          }
        }));
        
        setTimeout(() => {
          setDoorStatuses(prev => ({
            ...prev,
            [device.id]: { 
              status: 'locked', 
              is_online: true,
              last_updated: new Date() 
            }
          }));
        }, (response.data.duration + 1) * 1000);
        
      } else {
        toast.error(response.data.message || 'Failed to unlock door');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Unlock door error:', error);
      toast.error(error.response?.data?.detail || 'Failed to unlock door');
    } finally {
      setUnlockingDevice(null);
    }
  };

  const getDoorStatusDisplay = (deviceId) => {
    const status = doorStatuses[deviceId];
    if (!status) return 'Unknown';
    return status.status === 'unlocked' ? 'Unlocked 🔓' : 'Locked 🔒';
  };

  const getDoorStatusColor = (deviceId) => {
    const status = doorStatuses[deviceId];
    if (!status) return 'text-gray-400';
    return status.status === 'unlocked' ? 'text-green-600' : 'text-gray-500';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const resetForm = () => {
    setFormData({
      device_name: '',
      device_ip: '',
      device_port: 4370,
      device_serial: '',
      location: '',
      connection_type: 'bridge',
      server_port: 8080,
    });
    setFormErrors({});
    setEditingDevice(null);
    setConnectionType('bridge');
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setFormData({
      device_name: device.device_name,
      device_ip: device.device_ip,
      device_port: device.device_port,
      device_serial: device.device_serial,
      location: device.location || '',
      connection_type: device.connection_type || 'bridge',
      server_port: device.server_port || 8080,
    });
    setConnectionType(device.connection_type || 'bridge');
    setShowModal(true);
  };

  const handleRefreshStatus = async () => {
    toast.loading('Refreshing device status...', { id: 'status-refresh' });
    await pollDeviceStatus(devices);
    await fetchDoorStatuses(devices);
    toast.dismiss('status-refresh');
    toast.success('Device status updated!');
  };

  const getConnectionTypeLabel = (type) => {
    if (type === 'server') {
      return { label: '🌐 Server', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: '🔗 Bridge', color: 'bg-purple-100 text-purple-700' };
  };

  const isZkTesting = (deviceId) => zkTesting[deviceId] || false;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Devices</h1>
          <p className="text-sm text-gray-500 mt-1">Register and manage your biometric devices</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshStatus}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-200">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Two Connection Options Available</p>
            <p className="text-xs text-blue-700 mt-0.5">
              <span className="font-medium">🔗 Bridge Mode:</span> Install the Attendance Bridge on a local PC. 
              The bridge communicates with your device and syncs to the cloud.
            </p>
            <p className="text-xs text-blue-700">
              <span className="font-medium">🌐 Server Mode:</span> Configure your device to communicate directly 
              with our server. No local installation required. Works with supported devices.
            </p>
          </div>
        </div>
      </div>

      {loading && devices.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No devices registered yet.</p>
          <p className="text-sm text-gray-400 mt-1">Add your first attendance device to start tracking</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Register your first device →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const isOnline = isDeviceOnline(device);
            const isTesting = testingDevice === device.id;
            const isStatusLoading = statusLoading[device.id] || false;
            const isUnlocking = unlockingDevice === device.id;
            const connType = getConnectionTypeLabel(device.connection_type);
            const isZkTestRunning = isZkTesting(device.id);
            
            return (
              <div key={device.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{device.device_name}</h3>
                      <p className="text-sm text-gray-500">{device.location || 'No location set'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${connType.color}`}>
                        {connType.label}
                      </span>
                      {isOnline ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full animate-pulse">
                          <Wifi className="h-3 w-3" />
                          Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-sm bg-gray-50 px-2 py-1 rounded-full">
                          <WifiOff className="h-3 w-3" />
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">IP:</span>
                      <span className="text-gray-800 font-mono">{device.device_ip}:{device.device_port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Serial:</span>
                      <span className="text-gray-800 font-mono text-xs">{device.device_serial}</span>
                    </div>
                    
                    {device.connection_type === 'server' && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Server Port:</span>
                        <span className="text-gray-800 font-mono">{device.server_port || 8080}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                      <span className="text-gray-500">Door Status:</span>
                      <span className={`font-medium flex items-center gap-1 ${getDoorStatusColor(device.id)}`}>
                        {doorStatuses[device.id]?.status === 'unlocked' ? (
                          <Unlock className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {getDoorStatusDisplay(device.id)}
                      </span>
                    </div>
                    
                    {device.connection_type !== 'server' && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600 uppercase">API Key</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setShowApiKey(showApiKey === device.id ? null : device.id)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Show/Hide API Key"
                            >
                              {showApiKey === device.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(device.api_key)}
                              className="text-blue-500 hover:text-blue-600 p-1"
                              title="Copy API Key"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRegenerateKey(device.id, device.device_name)}
                              className="text-yellow-500 hover:text-yellow-600 p-1"
                              title="Regenerate API Key"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <code className="text-xs font-mono break-all bg-white p-1.5 rounded block">
                          {showApiKey === device.id ? device.api_key : device.api_key.substring(0, 30) + '...'}
                        </code>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t flex-wrap">
                    <button
                      onClick={() => handleTestConnection(device)}
                      disabled={isTesting}
                      className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm disabled:opacity-50 ${
                        isOnline 
                          ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {isTesting || isStatusLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                      ) : (
                        <Wifi className="h-4 w-4 inline mr-1" />
                      )}
                      {isTesting || isStatusLoading ? 'Checking...' : 'Test'}
                    </button>
                    
                    <button
                      onClick={() => handleUnlockDoor(device)}
                      disabled={isUnlocking || !isOnline}
                      className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isOnline && !isUnlocking
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                      title={isOnline ? 'Unlock Door' : 'Device offline - cannot unlock door'}
                    >
                      {isUnlocking ? (
                        <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                      ) : (
                        <Unlock className="h-4 w-4 inline mr-1" />
                      )}
                      {isUnlocking ? 'Unlocking...' : 'Unlock Door'}
                    </button>

                    {device.connection_type === 'server' && (
                      <button
                        onClick={() => handleZKTest(device)}
                        disabled={isZkTestRunning}
                        className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                          isZkTestRunning ? 'opacity-50 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {isZkTestRunning ? (
                          <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                        ) : (
                          <Zap className="h-4 w-4 inline mr-1" />
                        )}
                        {isZkTestRunning ? 'Testing ZK...' : 'Test ZK'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => openEditModal(device)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Edit className="h-4 w-4 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(device.id, device.device_name)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingDevice ? 'Edit Device' : 'Register New Device'}
                </h2>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={editingDevice ? handleUpdate : handleRegister} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.device_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Main Entrance"
                />
                {formErrors.device_name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.device_name}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device IP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_ip}
                  onChange={(e) => setFormData({ ...formData, device_ip: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.device_ip ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="192.168.1.201"
                />
                {formErrors.device_ip && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.device_ip}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  value={formData.device_port}
                  onChange={(e) => setFormData({ ...formData, device_port: parseInt(e.target.value) || 4370 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Serial <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_serial}
                  onChange={(e) => setFormData({ ...formData, device_serial: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.device_serial ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="K30-PRO-001"
                />
                {formErrors.device_serial && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.device_serial}
                  </p>
                )}
              </div>

              {!editingDevice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setConnectionType('bridge');
                        setFormData(prev => ({ ...prev, connection_type: 'bridge' }));
                      }}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        connectionType === 'bridge'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-300 text-gray-600'
                      }`}
                    >
                      <Laptop className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">🔗 Bridge</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Local PC required</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConnectionType('server');
                        setFormData(prev => ({ ...prev, connection_type: 'server' }));
                      }}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        connectionType === 'server'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 text-gray-600'
                      }`}
                    >
                      <Server className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">🌐 Server</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Direct connection</p>
                    </button>
                  </div>
                </div>
              )}

              {connectionType === 'server' && !editingDevice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Server Port
                  </label>
                  <input
                    type="number"
                    value={formData.server_port}
                    onChange={(e) => setFormData({ ...formData, server_port: parseInt(e.target.value) || 8080 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8080"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Port on which the server will listen for device connections.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Front Door, Back Entrance, etc."
                />
              </div>
              
              {!editingDevice && connectionType === 'bridge' && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-800 font-medium">Bridge Mode</p>
                      <p className="text-xs text-blue-700">
                        After registration, a unique API key will be generated. 
                        Save this key - you'll need it to configure the bridge application.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!editingDevice && connectionType === 'server' && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-800 font-medium">Server Mode</p>
                      <p className="text-xs text-blue-700">
                        Configure your device to point to:
                      </p>
                      <code className="text-xs bg-white p-1 rounded block mt-1 font-mono">
                        {getBackendHost()}:{formData.server_port}
                      </code>
                      <p className="text-xs text-blue-700 mt-1">
                        No local installation required. The server will handle all communication.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      {editingDevice ? 'Updating...' : 'Registering...'}
                    </div>
                  ) : (
                    editingDevice ? 'Update Device' : 'Register Device'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;