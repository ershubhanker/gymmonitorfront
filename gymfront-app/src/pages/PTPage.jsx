// src/pages/PTPage.jsx - Complete PT Management with Dynamic Total Sessions

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell, Calendar, Clock, User, CheckCircle, XCircle,
  Plus, Search, Filter, RefreshCw, Loader2, ArrowRight,
  ChevronLeft, ChevronRight, Edit, Trash2, Eye,
  Users, CreditCard, Wallet, AlertCircle, Check,
  X, Mail, Phone, Calendar as CalendarIcon, Tag,
  Clock as ClockIcon, UserPlus, Send, MessageSquare,
  Hash, Pencil
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const PTPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [activeTab, setActiveTab] = useState('packages');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState(null);
  
  const currencySymbol = user?.currency_symbol || '₹';

  const getPtStatus = (session) => {
    if (!session) return { status: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-600' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = session.start_date ? new Date(session.start_date) : null;
    const endDate = session.end_date ? new Date(session.end_date) : null;
    
    if (session.status === 'cancelled') {
      return { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' };
    }
    
    if (session.status === 'completed') {
      return { status: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' };
    }
    
    if (startDate && endDate) {
      if (today >= startDate && today <= endDate) {
        return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-700' };
      }
      if (today < startDate) {
        return { status: 'upcoming', label: 'Upcoming', color: 'bg-purple-100 text-purple-700' };
      }
      if (today > endDate) {
        return { status: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-600' };
      }
    }
    
    return { 
      status: session.status || 'inactive', 
      label: session.status?.charAt(0).toUpperCase() + session.status?.slice(1) || 'Inactive',
      color: session.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
    };
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return `${currencySymbol} 0`;
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${currencySymbol} ${formatted}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      upcoming: { color: 'bg-purple-100 text-purple-700', icon: Calendar },
      expired: { color: 'bg-gray-100 text-gray-600', icon: Clock }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [packagesRes, bookingsRes, trainersRes] = await Promise.all([
        api.get('/gym/pt/packages'),
        api.get('/gym/pt/bookings?limit=50'),
        api.get('/gym/trainers')
      ]);
      
      setPackages(packagesRes.data || []);
      setBookings(bookingsRes.data?.bookings || []);
      setTrainers(trainersRes.data || []);
    } catch (error) {
      console.error('Error fetching PT data:', error);
      toast.error('Failed to load PT data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle search - Now includes Member ID search
  const handleSearch = async (query) => {
    if (query.length < 2) {
      setMembers([]);
      return;
    }
    
    try {
      const response = await api.get(`/gym/pt/members/search?search=${encodeURIComponent(query)}`);
      setMembers(response.data || []);
      setShowMemberSearch(true);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  // Create package
  const handleCreatePackage = async (data) => {
    try {
      const response = await api.post('/gym/pt/packages', data);
      toast.success('PT Package created successfully!');
      setShowPackageModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create package');
    }
  };

  // Update package
  const handleUpdatePackage = async (data) => {
    if (!editingPackage) return;
    
    try {
      const response = await api.put(`/gym/pt/packages/${editingPackage.id}`, data);
      toast.success('PT Package updated successfully!');
      setShowPackageModal(false);
      setEditingPackage(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update package');
    }
  };

  // Delete package
  const handleDeletePackage = async () => {
    if (!deletingPackage) return;
    
    try {
      await api.delete(`/gym/pt/packages/${deletingPackage.id}`);
      toast.success('PT Package deleted successfully!');
      setShowDeleteConfirm(false);
      setDeletingPackage(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete package');
    }
  };

  // Book session
  const handleBookSession = async (data) => {
    try {
      const response = await api.post('/gym/pt/book', data);
      toast.success(response.data.message || 'Session booked successfully!');
      setShowBookingModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book session');
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId, reason) => {
    if (!window.confirm('Are you sure you want to cancel this session? The session will be returned to the member\'s balance.')) {
      return;
    }
    
    try {
      const response = await api.post(`/gym/pt/bookings/${bookingId}/cancel`, {
        cancellation_reason: reason,
        send_notification: true
      });
      toast.success(response.data.message || 'Session cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel session');
    }
  };

  // Complete session
  const handleCompleteSession = async (bookingId) => {
    try {
      const response = await api.post(`/gym/pt/bookings/${bookingId}/complete`, {
        notes: 'Session completed'
      });
      toast.success('Session marked as completed!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete session');
    }
  };

  // Open edit modal
  const openEditModal = (pkg) => {
    setEditingPackage(pkg);
    setShowPackageModal(true);
  };

  // Open delete confirmation
  const openDeleteConfirm = (pkg) => {
    setDeletingPackage(pkg);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Dumbbell className="h-8 w-8" />
              Personal Training
            </h1>
            <p className="text-purple-100 mt-2">
              Manage PT packages, sessions, and bookings
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingPackage(null);
                setShowPackageModal(true);
              }}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all"
            >
              <Plus className="h-5 w-5" />
              New Package
            </button>
            <button
              onClick={() => setShowBookingModal(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all"
            >
              <Calendar className="h-5 w-5" />
              Book Session
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-1">
        <button
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all flex-1 ${
            activeTab === 'packages'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Tag className="h-5 w-5" />
          Packages
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'packages' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {packages.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all flex-1 ${
            activeTab === 'bookings'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="h-5 w-5" />
          Bookings
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'bookings' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {bookings.filter(b => b.status === 'upcoming').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all flex-1 ${
            activeTab === 'schedule'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Clock className="h-5 w-5" />
          Schedule
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : activeTab === 'packages' ? (
          renderPackages()
        ) : activeTab === 'bookings' ? (
          renderBookings()
        ) : (
          renderSchedule()
        )}
      </div>

      {/* Modals */}
      {showPackageModal && (
        <PackageModal
          onClose={() => {
            setShowPackageModal(false);
            setEditingPackage(null);
          }}
          onSave={editingPackage ? handleUpdatePackage : handleCreatePackage}
          trainers={trainers}
          currencySymbol={currencySymbol}
          editPackage={editingPackage}
        />
      )}
      
      {showBookingModal && (
        <BookingModal
          onClose={() => setShowBookingModal(false)}
          onSave={handleBookSession}
          packages={packages}
          trainers={trainers}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete PT Package</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900">{deletingPackage.member_name}</p>
              <p className="text-sm text-gray-500">{deletingPackage.package_name}</p>
              <p className="text-sm text-gray-500">
                {deletingPackage.remaining_sessions} sessions remaining
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this PT package? This will remove all associated data including session history.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingPackage(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePackage}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render packages
  function renderPackages() {
    const filtered = packages.filter(p =>
      p.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.package_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.member_id?.toString().includes(searchTerm)
    );

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member name, ID, or package name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No PT packages found</p>
            <button
              onClick={() => {
                setEditingPackage(null);
                setShowPackageModal(true);
              }}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Create your first package →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((pkg) => {
              const ptStatus = getPtStatus(pkg);
              return (
                <div
                  key={pkg.id}
                  className={`border rounded-xl p-4 hover:shadow-lg transition-all ${
                    ptStatus.status === 'expired' ? 'border-gray-300 bg-gray-50' :
                    ptStatus.status === 'active' ? 'border-green-300 bg-green-50/30' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{pkg.member_name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        ID: {pkg.member_id}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{pkg.package_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      {getStatusBadge(ptStatus.status)}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(pkg);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit package"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteConfirm(pkg);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete package"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{pkg.total_sessions}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-blue-600">{pkg.used_sessions}</p>
                      <p className="text-xs text-gray-500">Used</p>
                    </div>
                    <div className={`rounded-lg p-2 ${pkg.remaining_sessions > 0 ? 'bg-green-50' : 'bg-gray-100'}`}>
                      <p className={`text-lg font-bold ${pkg.remaining_sessions > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {pkg.remaining_sessions}
                      </p>
                      <p className="text-xs text-gray-500">Remaining</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold">{formatCurrency(pkg.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-semibold text-green-600">{formatCurrency(pkg.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance</p>
                      <p className={`font-semibold ${pkg.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(pkg.balance_due)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      Trainer: {pkg.trainer_name || 'Not Assigned'}
                    </span>
                    {pkg.start_date && pkg.end_date && (
                      <span className="text-gray-400">
                        {formatDate(pkg.start_date)} - {formatDate(pkg.end_date)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Render bookings
  function renderBookings() {
    const filtered = bookings.filter(b =>
      b.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.trainer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.member_id?.toString().includes(searchTerm)
    );

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member name, ID, or trainer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            onChange={(e) => {
              const status = e.target.value;
              if (status === 'all') {
                // Reset filter
              }
            }}
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Trainer</th>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{booking.member_name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          ID: {booking.member_id}
                        </p>
                        <p className="text-xs text-gray-500">{booking.member_phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{booking.trainer_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatDate(booking.session_date)}</p>
                      <p className="text-xs text-gray-500">{booking.session_time}</p>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {booking.status === 'upcoming' && (
                          <>
                            <button
                              onClick={() => handleCompleteSession(booking.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark as completed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for cancellation:');
                                if (reason !== null) {
                                  handleCancelBooking(booking.id, reason || 'Cancelled by admin');
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel session"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Render schedule
  function renderSchedule() {
    return (
      <div className="text-center py-12">
        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Trainer Schedule</h3>
        <p className="text-gray-500">Coming soon! View and manage trainer schedules here.</p>
      </div>
    );
  }
};

// ==================== PACKAGE MODAL ====================
const PackageModal = ({ onClose, onSave, trainers, currencySymbol, editPackage }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberSearch, setShowMemberSearch] = useState(true);
  
  const isEditing = !!editPackage;

  // Pre-defined package configurations
  const getPackageConfig = (packageName) => {
    const configs = {
      '4 Sessions Package': { sessions: 4, defaultAmount: 1000 },
      '8 Sessions Package': { sessions: 8, defaultAmount: 2000 },
      '12 Sessions Package': { sessions: 12, defaultAmount: 3000 },
      '16 Sessions Package': { sessions: 16, defaultAmount: 4000 },
      '24 Sessions Package': { sessions: 24, defaultAmount: 6000 },
      'Custom Package': { sessions: null, defaultAmount: 0 },
    };
    return configs[packageName] || { sessions: null, defaultAmount: 0 };
  };

  // Initialize form data
  const getInitialFormData = () => {
    if (editPackage) {
      return {
        member_id: editPackage.member_id,
        package_name: editPackage.package_name || '8 Sessions Package',
        total_sessions: editPackage.total_sessions || 8,
        total_amount: editPackage.total_amount || 0,
        amount_paid: editPackage.amount_paid || 0,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        assign_trainer: editPackage.trainer_id ? true : false,
        trainer_id: editPackage.trainer_id || null,
        notes: editPackage.notes || '',
        start_date: editPackage.start_date || new Date().toISOString().split('T')[0],
        end_date: editPackage.end_date || null,
        status: editPackage.status || 'active'
      };
    }
    return {
      member_id: null,
      package_name: '8 Sessions Package',
      total_sessions: 8,
      total_amount: 2000,
      amount_paid: 2000,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      assign_trainer: false,
      trainer_id: null,
      notes: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      status: 'active'
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [showCustomSessions, setShowCustomSessions] = useState(formData.package_name === 'Custom Package');

  // Handle package name change - update sessions and amount
  const handlePackageNameChange = (packageName) => {
    const config = getPackageConfig(packageName);
    const isCustom = packageName === 'Custom Package';
    
    setShowCustomSessions(isCustom);
    
    setFormData(prev => ({
      ...prev,
      package_name: packageName,
      total_sessions: isCustom ? prev.total_sessions : config.sessions,
      total_amount: isCustom ? prev.total_amount : config.defaultAmount,
    }));
  };

  // Handle search - Now includes Member ID
  const handleSearch = async (query) => {
    setSearchTerm(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await api.get(`/gym/pt/members/search?search=${encodeURIComponent(query)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  // Set selected member when editing
  useEffect(() => {
    if (editPackage && editPackage.member_id) {
      const fetchMember = async () => {
        try {
          const response = await api.get(`/gym/members/${editPackage.member_id}`);
          setSelectedMember(response.data);
          setShowMemberSearch(false);
        } catch (error) {
          console.error('Error fetching member:', error);
        }
      };
      fetchMember();
    }
  }, [editPackage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMember && !editPackage) {
      toast.error('Please select a member');
      return;
    }
    
    // Validate amount_paid
    if (formData.amount_paid > formData.total_amount) {
      toast.error(`Amount paid cannot exceed total amount of ${currencySymbol} ${formData.total_amount}`);
      return;
    }
    
    // Validate total sessions for custom package
    if (formData.package_name === 'Custom Package' && (!formData.total_sessions || formData.total_sessions < 1)) {
      toast.error('Please enter a valid number of sessions for custom package');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        member_id: selectedMember?.id || editPackage?.member_id,
      };
      
      if (isEditing) {
        submitData.id = editPackage.id;
      }
      
      await onSave(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              {isEditing ? (
                <Pencil className="h-5 w-5 text-purple-600" />
              ) : (
                <Dumbbell className="h-5 w-5 text-purple-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit PT Package' : 'New PT Package'}
              </h3>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Update the personal training package' : 'Create a new personal training package'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Member *
            </label>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-gray-900">{selectedMember.full_name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    ID: {selectedMember.id} • {selectedMember.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setShowMemberSearch(true);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                  disabled={isEditing}
                >
                  {isEditing ? 'Cannot change member while editing' : 'Change'}
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Search by name, phone, or member ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isEditing}
                />
                {searchResults.length > 0 && !isEditing && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMemberSearch(false);
                          setSearchTerm('');
                          setSearchResults([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            ID: {member.id} • {member.phone}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.has_active_package ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {member.has_active_package ? `${member.total_remaining_sessions} remaining` : 'No package'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {isEditing && !selectedMember && (
                  <p className="text-sm text-red-500 mt-1">Member cannot be changed while editing</p>
                )}
              </div>
            )}
          </div>

          {/* Status - Only show when editing */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}

          {/* Package Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Name *
              </label>
              <select
                value={formData.package_name}
                onChange={(e) => handlePackageNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="4 Sessions Package">4 Sessions Package</option>
                <option value="8 Sessions Package">8 Sessions Package</option>
                <option value="12 Sessions Package">12 Sessions Package</option>
                <option value="16 Sessions Package">16 Sessions Package</option>
                <option value="24 Sessions Package">24 Sessions Package</option>
                <option value="Custom Package">Custom Package</option>
              </select>
            </div>
            
            {/* Total Sessions - Only show for Custom Package */}
            {showCustomSessions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Sessions *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_sessions}
                  onChange={(e) => setFormData({...formData, total_sessions: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                  placeholder="Enter number of sessions"
                />
                <p className="text-xs text-gray-400 mt-1">Enter the total number of sessions for this custom package</p>
              </div>
            )}
            
            {/* Show sessions count for non-custom packages */}
            {!showCustomSessions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Sessions
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {formData.total_sessions} sessions
                </div>
                <p className="text-xs text-gray-400 mt-1">Pre-defined package: {formData.package_name}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.total_amount}
                onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.amount_paid}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (val <= formData.total_amount) {
                    setFormData({...formData, amount_paid: val});
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">Cannot exceed total amount</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({...formData, end_date: e.target.value || null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty for 1 year default</p>
            </div>
          </div>

          {/* Trainer Assignment */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={formData.assign_trainer}
                onChange={(e) => setFormData({...formData, assign_trainer: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Assign a specific trainer for all sessions
            </label>
            {formData.assign_trainer && (
              <select
                value={formData.trainer_id || ''}
                onChange={(e) => setFormData({...formData, trainer_id: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Trainer</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.full_name} - {trainer.position || 'Trainer'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Any additional notes about this package..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!selectedMember && !editPackage)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isEditing ? 'Update Package' : 'Create Package'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== BOOKING MODAL ====================
const BookingModal = ({ onClose, onSave, packages, trainers }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberSearch, setShowMemberSearch] = useState(true);
  
  const [formData, setFormData] = useState({
    member_id: null,
    session_date: new Date().toISOString().split('T')[0],
    session_time: '07:00',
    trainer_id: null,
    duration_minutes: 60,
    notes: '',
    send_notification: true
  });

  // Handle member search - includes Member ID
  const handleSearch = async (query) => {
    setSearchTerm(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await api.get(`/gym/pt/members/search?search=${encodeURIComponent(query)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  // Handle member selection
  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setFormData({...formData, member_id: member.id});
    setShowMemberSearch(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember && !selectedPackage) {
      toast.error('Please select a member or PT package');
      return;
    }
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.session_time)) {
      toast.error('Please enter time in HH:MM format (e.g., 07:00, 14:30)');
      return;
    }
    
    setLoading(true);
    try {
      await onSave({
        ...formData,
        member_id: selectedMember?.id || selectedPackage?.member_id,
        session_time: formData.session_time
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter packages for selected member
  const availablePackages = packages.filter(p => 
    p.remaining_sessions > 0 && p.status === 'active' &&
    (!selectedMember || p.member_id === selectedMember.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Book PT Session</h3>
              <p className="text-sm text-gray-500">Book a personal training session</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Member Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Member *
            </label>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-2">
                <div>
                  <p className="font-semibold text-gray-900">{selectedMember.full_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    ID: {selectedMember.id} • {selectedMember.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setSelectedPackage(null);
                    setShowMemberSearch(true);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Search by name, phone, or member ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleMemberSelect(member)}
                        className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            ID: {member.id} • {member.phone}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.has_active_package ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {member.has_active_package ? `${member.total_remaining_sessions} sessions` : 'No package'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Select Package */}
          {selectedMember && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select PT Package *
              </label>
              <select
                value={selectedPackage?.id || ''}
                onChange={(e) => {
                  const pkg = packages.find(p => p.id === parseInt(e.target.value));
                  setSelectedPackage(pkg);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select a package</option>
                {availablePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.package_name} ({pkg.remaining_sessions} sessions left)
                    {pkg.trainer_name && ` - Trainer: ${pkg.trainer_name}`}
                  </option>
                ))}
              </select>
              {availablePackages.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No active packages with remaining sessions</p>
              )}
            </div>
          )}

          {selectedPackage && !selectedMember && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{selectedPackage.member_name}</p>
              <p className="text-gray-500 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                ID: {selectedPackage.member_id}
              </p>
              <p className="text-gray-500">{selectedPackage.package_name}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-green-600 font-semibold">{selectedPackage.remaining_sessions} sessions remaining</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">Trainer: {selectedPackage.trainer_name || 'Not assigned'}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Date *
            </label>
            <input
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({...formData, session_date: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Manual Time Entry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Time * (24-hour format)
            </label>
            <input
              type="text"
              value={formData.session_time}
              onChange={(e) => setFormData({...formData, session_time: e.target.value})}
              placeholder="e.g., 07:00, 14:30, 19:00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Enter time in HH:MM format (24-hour)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Trainer *
            </label>
            <select
              value={formData.trainer_id || ''}
              onChange={(e) => setFormData({...formData, trainer_id: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select Trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.full_name} - {trainer.position || 'Trainer'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              value={formData.duration_minutes}
              onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Any special instructions..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.send_notification}
              onChange={(e) => setFormData({...formData, send_notification: e.target.checked})}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label className="text-sm text-gray-700">
              Send notification to member and trainer
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPackage}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Book Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PTPage;