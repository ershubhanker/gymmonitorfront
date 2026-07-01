// src/pages/WhatsAppLogs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Download, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  X,
  User,
  Phone,
  Calendar,
  IndianRupee,
  Clock as ClockIcon,
  Send,
  AlertCircle,
  Building
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// Message Detail Modal Component
const MessageDetailModal = ({ log, isOpen, onClose }) => {
  if (!isOpen || !log) return null;

  // Get the actual gym name from the log data
  // The gym_name should come from the backend in the log object
  const gymName = log.gym_name || 'Unknown Gym';
  const memberName = log.member_name || 'Valued Member';
  const expiryDate = log.expiry_date ? new Date(log.expiry_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : 'N/A';
  const amount = log.amount_displayed || '0';

  // Construct the message based on your template
  // Header: {{1}} Payment Notification
  // Body: Hello {{1}}, Your membership at {{2}} is expiring on {{3}}. We noticed a pending fee of ₹{{4}}...
  const message = {
    header: `${gymName} Payment Notification`,
    body: `Hello ${memberName},\nYour membership at ${gymName} is expiring on ${expiryDate}.\nWe noticed a pending fee of ₹${amount} on your account. Kindly renew your membership to continue enjoying our services without interruption.\nFor assistance, feel free to contact us.\nThank you,`,
    footer: 'Please do not reply or call on this no.'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Message Details</h3>
              <p className="text-sm text-gray-500">Sent to {log.member_name || 'Unknown'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Gym Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">Gym</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{gymName}</p>
          </div>

          {/* Sender Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Member:</span>
                <span className="text-sm font-medium text-gray-900">{log.member_name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Phone:</span>
                <span className="text-sm font-medium text-gray-900">{log.phone_number || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Sent Date:</span>
                <span className="text-sm font-medium text-gray-900">
                  {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="text-sm font-medium text-gray-900">₹{log.amount_displayed || '0'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Days Left:</span>
                <span className="text-sm font-medium text-gray-900">{log.days_left || 'N/A'} days</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  log.status === 'sent' ? 'bg-green-100 text-green-700' :
                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {log.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Message Preview</h4>
              {/* Template Name */}
              <div className="bg-gray-50 rounded-lg px-4 py-2 mb-3">
                <span className="text-xs text-gray-400">Template:</span>
                <span className="text-sm font-medium text-gray-700 ml-2">{log.template_name || 'event_details_reminder_1'}</span>
              </div>
            </div>

            {/* Message Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              {/* Header */}
              <div className="mb-4 pb-4 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Header</span>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-1">{message.header}</p>
              </div>

              {/* Body */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Body</span>
                </div>
                <div className="bg-white/60 rounded-lg p-4 space-y-1">
                  {message.body.split('\n').map((line, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-blue-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Footer</span>
                </div>
                <p className="text-sm text-gray-500 italic mt-1">{message.footer}</p>
              </div>
            </div>

            {/* Message ID */}
            {log.message_id && (
              <div className="bg-gray-50 rounded-lg px-4 py-2">
                <span className="text-xs text-gray-400">Message ID:</span>
                <span className="text-xs font-mono text-gray-600 ml-2">{log.message_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-2 rounded-lg hover:shadow-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const WhatsAppLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all',
    search: ''
  });
  
  // Pagination states
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    limit: 50,
    offset: 0
  });

  // Fetch WhatsApp stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/whatsapp/logs/stats');
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching WhatsApp stats:', error);
      }
    }
  }, []);

  // Fetch WhatsApp logs with filters and pagination
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pagination.itemsPerPage;
      let url = `/whatsapp/logs?limit=${pagination.itemsPerPage}&offset=${offset}`;
      
      if (filters.startDate) {
        url += `&start_date=${filters.startDate}T00:00:00`;
      }
      if (filters.endDate) {
        url += `&end_date=${filters.endDate}T23:59:59`;
      }
      if (filters.status && filters.status !== 'all') {
        url += `&status=${filters.status}`;
      }
      
      const response = await api.get(url);
      if (response.data) {
        console.log('📊 Logs response:', response.data); // Debug log
        setLogs(response.data.logs || []);
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalItems: response.data.total || 0,
          totalPages: Math.ceil((response.data.total || 0) / pagination.itemsPerPage)
        }));
      }
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching WhatsApp logs:', error);
        toast.error('Failed to fetch logs');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.itemsPerPage]);

  // Export logs as CSV
  const exportLogs = async () => {
    setExporting(true);
    try {
      let url = `/whatsapp/logs/export`;
      const params = new URLSearchParams();
      
      if (filters.startDate) {
        params.append('start_date', `${filters.startDate}T00:00:00`);
      }
      if (filters.endDate) {
        params.append('end_date', `${filters.endDate}T23:59:59`);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const urlObj = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      link.setAttribute('download', `whatsapp_logs_${filters.startDate}_to_${filters.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlObj);
      
      toast.success('Logs exported successfully!');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters and reset to page 1
  const applyFilters = () => {
    fetchLogs(1);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'all',
      search: ''
    });
    fetchLogs(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  // Handle row click to open modal
  const handleRowClick = (log) => {
    console.log('📋 Selected log:', log); // Debug log - check if gym_name is present
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchLogs(1);
  }, []);

  // Get status badge color
  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      delivered: 'bg-blue-100 text-blue-700 border-blue-200',
      read: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              WhatsApp Message Logs
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all WhatsApp messages sent from your account
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportLogs}
              disabled={exporting}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_sent || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_failed || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.success_rate || 0}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_messages || 0}</p>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-1"
              >
                <Filter className="h-4 w-4" />
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading logs...</span>
            </div>
          ) : logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gym</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log, index) => {
                      const serialNumber = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-500">{serialNumber}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-700">{log.gym_name || 'Unknown'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleRowClick(log)}
                              className="flex items-center gap-2 hover:underline cursor-pointer group"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                {(log.member_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800 transition-colors">
                                {log.member_name || 'Unknown'}
                              </span>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{log.phone_number}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {log.amount_displayed ? `₹${log.amount_displayed}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {log.days_left ? `${log.days_left} days` : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(log.status)}`}>
                              {getStatusIcon(log.status)}
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(log.sent_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleRowClick(log)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                    {pagination.totalItems} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              pagination.currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-center">No WhatsApp messages found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or date range</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      <MessageDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </>
  );
};

export default WhatsAppLogs;