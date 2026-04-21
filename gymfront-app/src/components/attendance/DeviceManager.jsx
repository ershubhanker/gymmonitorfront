// src/components/attendance/DeviceManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Wifi, WifiOff, Copy, RefreshCw, 
  Eye, EyeOff, Edit, Check, X, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DeviceManager = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showApiKey, setShowApiKey] = useState(null);
  const [formData, setFormData] = useState({
    device_name: '',
    device_ip: '',
    device_port: 4370,
    device_serial: '',
    location: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch devices on load
  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/attendance/devices');
      setDevices(response.data);
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

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.device_name.trim()) errors.device_name = 'Device name is required';
    if (!formData.device_ip.trim()) errors.device_ip = 'Device IP is required';
    if (!formData.device_serial.trim()) errors.device_serial = 'Device serial is required';
    
    // Validate IP format
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (formData.device_ip && !ipPattern.test(formData.device_ip)) {
      errors.device_ip = 'Invalid IP address format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Register new device
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/attendance/devices/register', formData);
      toast.success('Device registered successfully!');
      
      // Show API key in a special toast
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

  // Update device
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

  // Delete device
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

  // Regenerate API key
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

  // Test device connection
  const handleTestConnection = async (deviceIp, devicePort) => {
    toast.loading('Testing connection...', { id: 'test' });
    try {
      const response = await api.post('/attendance/devices/test-connection', {
        device_ip: deviceIp,
        device_port: devicePort
      });
      toast.dismiss('test');
      if (response.data.success) {
        toast.success(`Connection test initiated for ${deviceIp}:${devicePort}`);
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      toast.dismiss('test');
      toast.error('Failed to test connection');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('API Key copied to clipboard');
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      device_name: '',
      device_ip: '',
      device_port: 4370,
      device_serial: '',
      location: ''
    });
    setFormErrors({});
    setEditingDevice(null);
  };

  // Open edit modal
  const openEditModal = (device) => {
    setEditingDevice(device);
    setFormData({
      device_name: device.device_name,
      device_ip: device.device_ip,
      device_port: device.device_port,
      device_serial: device.device_serial,
      location: device.location || ''
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Devices</h1>
          <p className="text-sm text-gray-500 mt-1">Register and manage your ESSL K30 Pro devices</p>
        </div>
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

      {/* Devices List */}
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
          {devices.map((device) => (
            <div key={device.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{device.device_name}</h3>
                    <p className="text-sm text-gray-500">{device.location || 'No location set'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.is_online ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full">
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
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-600 text-xs">{new Date(device.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {/* API Key Section */}
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
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleTestConnection(device.device_ip, device.device_port)}
                    className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
                  >
                    <Wifi className="h-4 w-4 inline mr-1" />
                    Test
                  </button>
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
          ))}
        </div>
      )}

      {/* Register/Edit Device Modal */}
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
              
              {!editingDevice && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-800 font-medium">Important Note</p>
                      <p className="text-xs text-blue-700">
                        After registration, a unique API key will be generated. 
                        Save this key - you'll need it to configure the bridge application.
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