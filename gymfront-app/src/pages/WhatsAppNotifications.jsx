// src/pages/WhatsAppNotifications.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Send, Users, User, Phone, Mail, AlertCircle, CheckCircle, 
  Loader, X, ChevronDown, ChevronUp, Filter, Search,
  MessageSquare, Clock, Calendar, FileText, Download,
  UserCheck, UserMinus, TrendingUp, TrendingDown,
  Shield, Eye, RefreshCw, Trash2, Edit, Copy, Plus,
  AlertTriangle, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const WhatsAppNotifications = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' | 'single'
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Bulk notification state
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSearch, setBulkSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  
  // Single notification state
  const [singlePhone, setSinglePhone] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleMessage, setSingleMessage] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  
  // Logs
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logLoading, setLogLoading] = useState(false);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gym/members?limit=1000');
      if (response.data) {
        const memberList = response.data.map(m => ({
          id: m.id,
          name: m.full_name,
          phone: m.phone,
          email: m.email,
          status: m.status || 'active',
          membership: m.membership_plan || 'No Plan',
          joinedDate: m.joined_date,
          selected: false
        }));
        setMembers(memberList);
        
        // Calculate stats
        const active = memberList.filter(m => m.status === 'active').length;
        const inactive = memberList.filter(m => m.status === 'inactive').length;
        setStats({
          total: memberList.length,
          active,
          inactive
        });
        
        // Auto-select all active members by default
        const activeMembers = memberList.filter(m => m.status === 'active').map(m => m.id);
        setSelectedMembers(activeMembers);
        setSelectAll(true);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const response = await api.get('/whatsapp/notification-logs?limit=100');
      if (response.data) {
        setLogs(response.data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
    }
  }, [showLogs, fetchLogs]);

  // Handle select all
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const filtered = getFilteredMembers();
      setSelectedMembers(filtered.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  // Handle individual selection
  const handleSelectMember = (memberId, checked) => {
    if (checked) {
      setSelectedMembers(prev => [...prev, memberId]);
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };

  // Get filtered members
  const getFilteredMembers = () => {
    let filtered = members;
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }
    
    // Apply search
    if (bulkSearch) {
      const search = bulkSearch.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(search) ||
        m.phone.includes(search) ||
        m.email?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  };

  const filteredMembers = getFilteredMembers();

  // Send bulk notification
  const sendBulkNotification = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    
    if (!bulkMessage.trim()) {
      toast.error('Please enter a notification message');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/whatsapp/send-bulk-notification', {
        member_ids: selectedMembers,
        message: bulkMessage.trim()
      });
      
      if (response.data) {
        toast.success(
          `Queued ${response.data.total} notifications — they're sending in the background. Check the logs in a moment for delivery status.`,
          { duration: 6000 }
        );
        setBulkMessage('');
        // Logs fill in as the background job sends each message, so give it
        // a few seconds before refreshing rather than checking immediately.
        if (showLogs) {
          setTimeout(() => fetchLogs(), 5000);
        }
      }
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      toast.error(error.response?.data?.detail || 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  // Send single notification
  const sendSingleNotification = async () => {
    if (!singlePhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    
    if (!singleName.trim()) {
      toast.error('Please enter recipient name');
      return;
    }
    
    if (!singleMessage.trim()) {
      toast.error('Please enter a notification message');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/whatsapp/send-single-notification', {
        phone_number: singlePhone.trim(),
        name: singleName.trim(),
        message: singleMessage.trim()
      });
      
      if (response.data) {
        toast.success('Notification sent successfully');
        setSinglePhone('');
        setSingleName('');
        setSingleMessage('');
        // Refresh logs
        if (showLogs) {
          fetchLogs();
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  // Export logs
  const exportLogs = async () => {
    try {
      const response = await api.get('/whatsapp/notification-logs/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `whatsapp_notification_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Logs exported successfully!');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get log status color
  const getLogStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'disabled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <MessageSquare className="h-7 w-7" />
              WhatsApp Notifications
            </h1>
            <p className="text-blue-100 mt-1">Send notifications to your members via WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all backdrop-blur-sm"
            >
              <FileText className="h-4 w-4" />
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Members</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inactive Members</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <UserMinus className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switch */}
      <div className="bg-white rounded-xl shadow-lg p-1 flex gap-1 border border-gray-200">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bulk'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="h-5 w-5" />
          Bulk Notification
        </button>
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'single'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User className="h-5 w-5" />
          Single Notification
        </button>
      </div>

      {/* Bulk Notification Tab */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Bulk Notification</h2>
              <p className="text-sm text-gray-500">Send notifications to multiple members at once</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const activeMembers = members.filter(m => m.status === 'active').map(m => m.id);
                  setSelectedMembers(activeMembers);
                  setSelectAll(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <UserCheck className="h-4 w-4" />
                Select All Active
              </button>
              <button
                onClick={() => {
                  setSelectedMembers([]);
                  setSelectAll(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-50 border-0 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="text-sm text-gray-500 flex items-center px-3 bg-gray-50 rounded-lg">
              {selectedMembers.length} selected
            </div>
          </div>

          {/* Members List */}
          <div className="border rounded-xl overflow-hidden mb-6">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8">
                        <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => handleSelectMember(member.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                        <td className="px-4 py-3 text-gray-600">{member.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{member.membership}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Message <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Enter your notification message here..."
                  rows="4"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {bulkMessage.length} characters
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                This message will be sent to all selected members with their name in the header
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  <strong>Template Preview:</strong> "Hi {'{{member_name}}'}, *Gym Notification* {bulkMessage || '[Your message here]'}"
                </span>
              </p>
            </div>

            <button
              onClick={sendBulkNotification}
              disabled={sending || selectedMembers.length === 0 || !bulkMessage.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Sending to {selectedMembers.length} members...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send to {selectedMembers.length} {selectedMembers.length === 1 ? 'member' : 'members'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Single Notification Tab */}
      {activeTab === 'single' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Single Notification</h2>
              <p className="text-sm text-gray-500">Send a notification to a specific number</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  placeholder="e.g., 9876543210"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Enter 10-digit number (without +91 or 0)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="e.g., Rohan Sharma"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={singleMessage}
                onChange={(e) => setSingleMessage(e.target.value)}
                placeholder="Enter your notification message here..."
                rows="4"
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-400">{singleMessage.length} characters</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  <strong>Template Preview:</strong> "Hi {singleName || '[Name]'}, *Gym Notification* {singleMessage || '[Your message here]'}"
                </span>
              </p>
            </div>

            <button
              onClick={sendSingleNotification}
              disabled={sending || !singlePhone.trim() || !singleName.trim() || !singleMessage.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Logs Section */}
      {showLogs && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Notification Logs</h2>
              <p className="text-sm text-gray-500">Recent WhatsApp notification history</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={exportLogs}
                className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {logLoading ? (
            <div className="text-center py-8">
              <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No notification logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{log.member_name || 'External'}</td>
                      <td className="px-4 py-3 text-gray-600">{log.phone_number}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLogStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(log.sent_at).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {log.message_type || 'notification'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppNotifications;