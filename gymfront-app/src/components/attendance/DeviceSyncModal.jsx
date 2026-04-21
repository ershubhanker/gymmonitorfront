// src/components/attendance/DeviceSyncModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Wifi, CheckCircle, XCircle, Loader2, WifiOff } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import toast from 'react-hot-toast';

const DeviceSyncModal = ({ isOpen, onClose, member, onSyncComplete, refreshMemberList }) => {
  const { devices, syncMemberToDevice, refreshAllData } = useAttendance();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [assignedDeviceId, setAssignedDeviceId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedDevice(null);
      setSyncing(false);
      setSyncSuccess(false);
      setAssignedDeviceId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onlineDevices = devices.filter(d => d.is_online);

  const handleSync = async () => {
    if (!selectedDevice) {
      toast.error('Please select a device');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncMemberToDevice(selectedDevice.id, member);
      
      if (result.success) {
        const resolvedDeviceUserId =
          result.device_user_id ||
          result.member?.device_user_id ||
          String(member.id);

        setSyncSuccess(true);
        setAssignedDeviceId(resolvedDeviceUserId);
        toast.success(`Member synced to ${selectedDevice.device_name}!`);

        // Call onSyncComplete BEFORE showing success state
        if (onSyncComplete) {
          onSyncComplete(resolvedDeviceUserId, member.id);
        }

        // Refresh the member list
        if (refreshMemberList) {
          await refreshMemberList();
        }

        setTimeout(() => {
          refreshAllData();
        }, 500);
      } else {
        toast.error(result.error || 'Failed to sync member');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync member');
    } finally {
      setSyncing(false);
    }
  };

  const handleClose = () => {
    // Call onClose first
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Device User ID copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Sync to Attendance Device</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {member?.full_name || 'Member'}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {syncSuccess ? (
            // Success state with Device ID display
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Sync Successful!</h4>
              <p className="text-sm text-gray-600 mb-4">
                {member?.full_name} has been synced to {selectedDevice?.device_name}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">Device User ID</p>
                <div 
                  onClick={() => copyToClipboard(assignedDeviceId || member?.id)}
                  className="font-mono text-lg font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
                >
                  {assignedDeviceId || member?.id}
                  <span className="text-xs text-gray-500 font-normal">(click to copy)</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  This ID is used by the attendance device to identify this member.
                </p>
              </div>
              
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {onlineDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <WifiOff className="h-12 w-12 mx-auto mb-3 text-orange-300" />
                  <p>No online devices</p>
                  <p className="text-sm mt-1">Please ensure the bridge is running</p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Device
                  </label>
                  <div className="space-y-2 mb-6">
                    {onlineDevices.map(device => (
                      <button
                        key={device.id}
                        onClick={() => setSelectedDevice(device)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDevice?.id === device.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{device.device_name}</p>
                            <p className="text-xs text-gray-500">{device.device_ip}:{device.device_port}</p>
                            {device.location && (
                              <p className="text-xs text-gray-400 mt-1">{device.location}</p>
                            )}
                          </div>
                          {device.is_online ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> The member will be added to the device with ID: <span className="font-mono font-bold">{member?.id}</span>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSync}
                      disabled={!selectedDevice || syncing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4" />
                      )}
                      Sync to Device
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceSyncModal;