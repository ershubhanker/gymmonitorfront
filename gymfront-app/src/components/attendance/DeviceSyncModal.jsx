// src/components/attendance/DeviceSyncModal.jsx - COMPLETE WITH ZK SUPPORT

import React, { useState, useEffect, useRef } from 'react';
import { X, Wifi, CheckCircle, XCircle, Loader2, WifiOff, Search, User, UserPlus, Link, AlertCircle, Zap, Fingerprint, Copy, Check } from 'lucide-react';
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
  const [enrollStatus, setEnrollStatus] = useState('idle'); // 'idle' | 'waiting' | 'completed' | 'failed'
  const [enrollMessage, setEnrollMessage] = useState('');
  const [retryingEnroll, setRetryingEnroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const enrollPollRef = useRef(null);

  const stopPolling = () => {
    if (enrollPollRef.current) {
      clearInterval(enrollPollRef.current);
      enrollPollRef.current = null;
    }
  };

  const startEnrollmentPolling = (cmdId, deviceName) => {
    stopPolling();
    setEnrollStatus('waiting');
    setEnrollMessage(`Machine ready! Ask member to place finger on ${deviceName || 'the machine'} (press 3 times).`);

    const startTime = Date.now();
    enrollPollRef.current = setInterval(async () => {
      // 90 seconds timeout
      if (Date.now() - startTime > 90000) {
        stopPolling();
        setEnrollStatus('failed');
        setEnrollMessage('Fingerprint enrollment timed out after 90 seconds. You can retry below.');
        return;
      }

      try {
        const res = await api.get(`/attendance/commands/${cmdId}/status`);
        const status = (res.data?.status || '').toLowerCase();
        if (status === 'completed') {
          stopPolling();
          setEnrollStatus('completed');
          setEnrollMessage('Fingerprint enrolled successfully!');
          toast.success('Fingerprint enrolled successfully on device!');
          if (refreshMemberList) refreshMemberList();
          refreshAllData();
        } else if (status === 'failed') {
          stopPolling();
          setEnrollStatus('failed');
          setEnrollMessage('Enrollment was cancelled or failed on the device. Please try again.');
        }
      } catch (err) {
        console.warn('Enrollment poll error:', err);
      }
    }, 2000);
  };

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
      stopPolling();
      setSelectedDevice(null);
      setSyncing(false);
      setSyncSuccess(false);
      setAssignedDeviceId(null);
      setShowMatchView(false);
      setDeviceUsers([]);
      setMatchingMembers([]);
      setSelectedMatchMember(null);
      setSearchTerm('');
      setEnrollStatus('idle');
      setEnrollMessage('');
      setRetryingEnroll(false);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

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

    setSyncing(true);
    try {
      const memberName = member.full_name || member.fullName || 'Unknown Member';
      const memberPhone = member.phone || '';
      const memberId = member.id || member.member_id;
      const cleanPhone = memberPhone.replace(/\D/g, '');
      const deviceUserId = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      
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
        const resolvedPin = response.data.device_user_id || deviceUserId;
        setAssignedDeviceId(resolvedPin);

        const enrollCmdId = response.data.enroll_command_id;
        if (enrollCmdId) {
          startEnrollmentPolling(enrollCmdId, selectedDevice.device_name);
        } else {
          setEnrollStatus('idle');
        }

        toast.success(`✅ Member "${memberName}" synced to ${selectedDevice.device_name} with ID: ${resolvedPin}`);

        if (onSyncComplete) {
          onSyncComplete(resolvedPin, memberId);
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

  const handleRetryEnroll = async () => {
    if (!selectedDevice) {
      toast.error('Please select an active device');
      return;
    }
    const cleanPhone = (member?.phone || '').replace(/\D/g, '');
    const pin = assignedDeviceId || (cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone) || String(member?.id);
    setRetryingEnroll(true);
    try {
      const response = await api.post(`/attendance/devices/${selectedDevice.id}/enroll-finger`, {
        member_id: member?.id,
        pin: pin,
        finger_id: 0,
        retry: 3,
      });

      if (response.data.success && response.data.command_id) {
        toast.success(`Enrollment queued on ${selectedDevice.device_name}!`);
        startEnrollmentPolling(response.data.command_id, selectedDevice.device_name);
      } else {
        toast.error(response.data?.message || 'Failed to trigger enrollment');
        setEnrollStatus('failed');
      }
    } catch (err) {
      console.error('Error retrying fingerprint enrollment:', err);
      toast.error(err.response?.data?.detail || 'Failed to trigger fingerprint enrollment on device');
      setEnrollStatus('failed');
    } finally {
      setRetryingEnroll(false);
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
        const resolvedPin = response.data.device_user_id || existingMember.device_user_id;
        setAssignedDeviceId(resolvedPin);
        
        const enrollCmdId = response.data.enroll_command_id;
        if (enrollCmdId) {
          startEnrollmentPolling(enrollCmdId, selectedDevice.device_name);
        } else {
          setEnrollStatus('idle');
        }

        toast.success(`Linked to existing member: ${existingMember.full_name}`);
        
        if (selectedDevice.device_serial) {
          await triggerImmediateSync(selectedDevice.device_serial);
        }
        
        if (onSyncComplete) {
          onSyncComplete(resolvedPin, existingMember.id);
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
    stopPolling();
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Device User ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
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
            <div className="py-2 space-y-4">
              {/* Header */}
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Member Synced to Device</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Target Device: <span className="font-semibold text-gray-800">{selectedDevice?.device_name}</span>
                </p>
              </div>

              {/* Step 1: Member Profile Synced */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Step 1: Profile Synced
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs">
                    <span className="text-gray-400 block text-[10px]">Member</span>
                    <span className="font-semibold text-gray-800 truncate block mt-0.5">{displayName}</span>
                  </div>
                  <div 
                    onClick={() => copyToClipboard(assignedDeviceId || member?.phone?.replace(/\D/g, '')?.slice(-10) || String(member?.id))}
                    className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs cursor-pointer hover:border-purple-300 transition-colors group"
                    title="Click to copy"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 block text-[10px]">Device User ID (PIN)</span>
                      {copied ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      )}
                    </div>
                    <span className="font-mono font-bold text-purple-700 truncate block mt-0.5">
                      {assignedDeviceId || member?.phone?.replace(/\D/g, '')?.slice(-10) || String(member?.id)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Fingerprint Registration */}
              <div className={`border rounded-xl p-4 transition-all ${
                enrollStatus === 'completed'
                  ? 'bg-green-50/70 border-green-200'
                  : enrollStatus === 'failed'
                  ? 'bg-red-50/70 border-red-200'
                  : 'bg-purple-50/70 border-purple-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      enrollStatus === 'completed'
                        ? 'bg-green-600 text-white'
                        : enrollStatus === 'failed'
                        ? 'bg-red-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}>
                      <Fingerprint className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Step 2: Fingerprint Enrollment
                    </span>
                  </div>

                  {enrollStatus === 'waiting' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Device Ready
                    </span>
                  )}
                  {enrollStatus === 'completed' && (
                    <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Enrolled
                    </span>
                  )}
                  {enrollStatus === 'failed' && (
                    <span className="text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>

                {/* State: WAITING FOR FINGER */}
                {enrollStatus === 'waiting' && (
                  <div className="text-center py-2 space-y-3">
                    <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-purple-200 animate-ping opacity-60" />
                      <div className="relative w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <Fingerprint className="h-8 w-8 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Place Finger on Machine Screen</p>
                      <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
                        Ask member to step up to <strong className="text-gray-900">{selectedDevice?.device_name}</strong> and press finger firmly <span className="text-purple-700 font-semibold">3 times</span> when prompted.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-[11px] text-purple-800 bg-purple-100/70 border border-purple-200 px-3 py-1.5 rounded-lg">
                      <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                      <span>Listening for biometric machine...</span>
                    </div>
                  </div>
                )}

                {/* State: COMPLETED */}
                {enrollStatus === 'completed' && (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">Fingerprint Registered Successfully!</h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Member can now punch attendance directly on {selectedDevice?.device_name}.
                      </p>
                    </div>
                  </div>
                )}

                {/* State: FAILED / TIMED OUT */}
                {enrollStatus === 'failed' && (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <XCircle className="h-7 w-7" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">Enrollment Incomplete</h5>
                      <p className="text-xs text-red-600 mt-1">
                        {enrollMessage || 'Timed out or cancelled on the device.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetryEnroll}
                      disabled={retryingEnroll}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {retryingEnroll ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="h-3.5 w-3.5" />
                          Retry Fingerprint Prompt
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* State: IDLE */}
                {enrollStatus === 'idle' && (
                  <div className="text-center py-2 space-y-2">
                    <p className="text-xs text-gray-600">
                      Profile is synced! Click below to trigger the fingerprint enrollment prompt on the device screen.
                    </p>
                    <button
                      type="button"
                      onClick={handleRetryEnroll}
                      disabled={retryingEnroll}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {retryingEnroll ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending to machine...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="h-3.5 w-3.5" />
                          Enroll Fingerprint on Machine
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    enrollStatus === 'completed'
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {enrollStatus === 'completed' ? 'Done' : 'Close'}
                </button>
              </div>
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

                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4">
                    <p className="text-xs text-purple-900">
                      <strong>Automatic Enrollment:</strong> Syncing will create the member on the machine and immediately prompt them to place their finger for biometric registration.
                    </p>
                    {member?.phone && (
                      <p className="text-xs text-purple-800 mt-1">
                        Device User ID (PIN): <span className="font-mono font-bold">{member.phone.replace(/\D/g, '').slice(-10)}</span>
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