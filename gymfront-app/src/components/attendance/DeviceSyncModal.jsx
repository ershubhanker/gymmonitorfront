// src/components/attendance/DeviceSyncModal.jsx - COMPLETE WITH ZK SUPPORT

import React, { useState, useEffect } from 'react';
import { X, Wifi, CheckCircle, XCircle, Loader2, WifiOff, Search, User, UserPlus, Link, AlertCircle, Zap } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

const DeviceSyncModal = ({ isOpen, onClose, member, onSyncComplete, refreshMemberList }) => {
  const { devices, syncMemberToDevice, refreshAllData } = useAttendance();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [assignedDeviceId, setAssignedDeviceId] = useState(null);
  const [showMatchView, setShowMatchView] = useState(false);
  const [deviceUsers, setDeviceUsers] = useState([]);
  const [matchingMembers, setMatchingMembers] = useState([]);
  const [selectedMatchMember, setSelectedMatchMember] = useState(null);
  const [loadingDeviceUsers, setLoadingDeviceUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      console.log('🔍 DeviceSyncModal opened with member:', member);
      
      if (!member) {
        console.warn('⚠️ Member is undefined in DeviceSyncModal');
      } else {
        console.log('📋 Member details:', {
          id: member.id,
          full_name: member.full_name || member.fullName,
          phone: member.phone,
          email: member.email,
          device_user_id: member.device_user_id || member.deviceUserId
        });
      }
    }
  }, [isOpen, member]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDevice(null);
      setSyncing(false);
      setSyncSuccess(false);
      setAssignedDeviceId(null);
      setShowMatchView(false);
      setDeviceUsers([]);
      setMatchingMembers([]);
      setSelectedMatchMember(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDevice && isOpen) {
      fetchDeviceUsers(selectedDevice.id);
    }
  }, [selectedDevice, isOpen]);

  if (!isOpen) return null;

  const onlineDevices = devices.filter(d => d.is_online);

  const fetchDeviceUsers = async (deviceId) => {
    setLoadingDeviceUsers(true);
    try {
      const response = await api.get(`/attendance/devices/${deviceId}/sync-preview`);
      setDeviceUsers(response.data.members || []);
      
      if (member) {
        const memberName = member.full_name || member.fullName || '';
        const memberPhone = member.phone || '';
        const memberEmail = member.email || '';
        
        const matches = response.data.members.filter(m => 
          m.full_name?.toLowerCase().includes(memberName.toLowerCase()) ||
          memberName.toLowerCase().includes(m.full_name?.toLowerCase() || '') ||
          m.phone === memberPhone ||
          m.email === memberEmail
        );
        setMatchingMembers(matches);
      }
    } catch (error) {
      console.error('Error fetching device users:', error);
      toast.error('Failed to load device users');
    } finally {
      setLoadingDeviceUsers(false);
    }
  };

  const checkUserExistsOnDevice = async (deviceId, memberId, memberName) => {
    try {
      const response = await api.post(`/attendance/devices/${deviceId}/check-user-exists`, {
        member_id: memberId,
        member_name: memberName
      });
      return response.data;
    } catch (error) {
      console.error('Error checking user exists:', error);
      return { exists: false, error: error.message };
    }
  };

  const triggerImmediateSync = async (deviceSerial) => {
    try {
      if (!deviceSerial) {
        console.warn('No device serial available for immediate sync');
        return;
      }
      console.log(`⚡ Triggering immediate sync for device: ${deviceSerial}`);
      const response = await api.post(`/attendance/devices/trigger-sync?device_serial=${deviceSerial}`);
      if (response.data.success) {
        console.log('✅ Immediate sync triggered successfully');
      } else {
        console.warn('⚠️ Immediate sync trigger returned failure');
      }
    } catch (error) {
      console.warn('Could not trigger immediate sync, will wait for normal poll:', error.message);
    }
  };

  const handleSync = async () => {
    if (!selectedDevice) {
      toast.error('Please select a device');
      return;
    }

    if (!member) {
      toast.error('Member data is missing. Please try again.');
      setSyncing(false);
      return;
    }

    console.log('🔄 Syncing member:', {
      id: member.id,
      full_name: member.full_name || member.fullName,
      phone: member.phone,
      email: member.email
    });

    setSyncing(true);
    try {
      const memberName = member.full_name || member.fullName || 'Unknown Member';
      const memberPhone = member.phone || '';
      const memberId = member.id || member.member_id;
      const deviceUserId = memberPhone.replace(/\D/g, '');
      
      if (!deviceUserId || deviceUserId.length < 10) {
        toast.error('Invalid phone number for device sync. Please ensure member has a valid 10-digit phone number.');
        setSyncing(false);
        return;
      }

      console.log(`📤 Syncing member "${memberName}" (ID: ${memberId}) to device "${selectedDevice.device_name}" with device ID: ${deviceUserId}`);

      const response = await api.post(
        `/attendance/devices/${selectedDevice.id}/sync-member`,
        {
          id: memberId,
          full_name: memberName,
          phone: memberPhone,
          device_user_id: deviceUserId,
          email: member.email || ''
        }
      );

      if (response.data.success) {
        setSyncSuccess(true);
        setAssignedDeviceId(deviceUserId);
        
        if (response.data.direct) {
          if (response.data.method === 'zk') {
            toast.success(`✅ Member "${memberName}" synced directly via ZK to ${selectedDevice.device_name} with ID: ${deviceUserId}`);
          } else {
            toast.success(`✅ Member "${memberName}" synced directly to ${selectedDevice.device_name} with ID: ${deviceUserId}`);
          }
        } else {
          toast.success(`✅ Member "${memberName}" queued for sync to ${selectedDevice.device_name} with ID: ${deviceUserId}`);
          toast.custom(
            (t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-blue-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">📱 Device Sync Queued</p>
                      <p className="mt-1 text-sm text-gray-500">Device will sync within a few seconds.</p>
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
            { duration: 4000 }
          );
        }

        if (onSyncComplete) {
          onSyncComplete(deviceUserId, memberId);
        }

        if (refreshMemberList) {
          await refreshMemberList();
        }
        
        setTimeout(() => {
          refreshAllData();
        }, 500);
      } else {
        toast.error(response.data.message || 'Failed to sync member');
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to sync member';
      toast.error(errorMsg);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncToExistingMember = async (existingMember) => {
    if (!selectedDevice) {
      toast.error('Please select a device');
      return;
    }

    setSyncing(true);
    try {
      const response = await api.post(`/attendance/devices/${selectedDevice.id}/sync-user-to-device`, null, {
        params: { member_id: existingMember.id }
      });

      if (response.data.success) {
        setSyncSuccess(true);
        setAssignedDeviceId(response.data.device_user_id);
        toast.success(`Linked to existing member: ${existingMember.full_name}`);
        
        if (selectedDevice.device_serial) {
          await triggerImmediateSync(selectedDevice.device_serial);
        }
        
        if (onSyncComplete) {
          onSyncComplete(response.data.device_user_id, existingMember.id);
        }
        
        if (refreshMemberList) {
          await refreshMemberList();
        }
        
        setTimeout(() => {
          refreshAllData();
        }, 500);
      }
    } catch (error) {
      console.error('Error syncing to existing member:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync to existing member');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateNew = async () => {
    await handleSync();
  };

  const handleClose = () => {
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Device User ID copied to clipboard!');
  };

  const filteredMatches = matchingMembers.filter(m => 
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.phone && m.phone.includes(searchTerm)) ||
    (m.email && m.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayName = member?.full_name || member?.fullName || 'Member';
  const displayPhone = member?.phone || 'No phone number';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Sync to Attendance Device</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {displayName}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {syncSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Sync Successful!</h4>
              <p className="text-sm text-gray-600 mb-4">
                {displayName} has been synced to {selectedDevice?.device_name}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">Device User ID</p>
                <div 
                  onClick={() => copyToClipboard(assignedDeviceId || member?.id?.toString())}
                  className="font-mono text-lg font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
                >
                  {assignedDeviceId || member?.id?.toString() || 'Unknown'}
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
          ) : showMatchView && matchingMembers.length > 0 ? (
            <div>
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Potential Duplicate Found</p>
                  <p className="text-xs text-yellow-700">
                    This member may already exist on the device. Choose an option below.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search existing members on device
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {filteredMatches.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No matching members found</p>
                ) : (
                  filteredMatches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSyncToExistingMember(m)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedMatchMember?.id === m.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{m.full_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {m.phone && <span>📱 {m.phone}</span>}
                            {m.email && <span>📧 {m.email}</span>}
                          </div>
                          {m.device_user_id && (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ Already has device ID: {m.device_user_id}
                            </p>
                          )}
                        </div>
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMatchView(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Create as New
                </button>
              </div>
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
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Syncing: <span className="font-semibold text-gray-900">{displayName}</span>
                    </p>
                    <p className="text-xs text-gray-400">Phone: {displayPhone}</p>
                    <p className="text-xs text-gray-400">ID: {member?.id || 'Unknown'}</p>
                    {selectedDevice?.connection_type === 'server' && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Server Mode - Direct ZK Connection
                      </p>
                    )}
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Device
                  </label>
                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
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
                            <p className="text-xs text-gray-400 mt-1">Serial: {device.device_serial}</p>
                            {device.connection_type === 'server' && (
                              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Server Mode
                              </p>
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
                      <strong>Note:</strong> The system will use the member's phone number as the device ID.
                    </p>
                    {member?.phone && (
                      <p className="text-xs text-blue-800 mt-1">
                        Device ID: <span className="font-mono font-bold">{member.phone.replace(/\D/g, '')}</span>
                      </p>
                    )}
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