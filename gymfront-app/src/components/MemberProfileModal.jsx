// src/components/MemberProfileModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, MapPin, DollarSign, Tag, 
  MessageCircle, User, Clock, CheckCircle, AlertCircle,
  Send, MessageSquare, History, CreditCard, Activity,
  Award, Calendar as CalendarIcon, FileText, Users,
  Edit, RefreshCw, Loader2, Trash2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MemberProfileModal = ({ memberId, onClose, onUpdate }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [deletingComment, setDeletingComment] = useState(null);

  useEffect(() => {
    fetchMemberDetails();
    fetchComments();
    fetchPayments();
    fetchMembershipHistory();
    fetchAttendanceHistory();
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gym/members/${memberId}`);
      setMember(response.data);
    } catch (error) {
      console.error('Error fetching member details:', error);
      if (error.response?.status === 404) {
        toast.error('Member not found');
        onClose();
      } else {
        toast.error('Failed to load member details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await api.get(`/gym/members/${memberId}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const response = await api.get(`/gym/payments?limit=100`);
      const memberPayments = response.data.filter(p => p.member_id === memberId);
      setPayments(memberPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchMembershipHistory = async () => {
    try {
      const response = await api.get(`/gym/members/${memberId}`);
      const memberData = response.data;
      setMembershipHistory(memberData.memberships || []);
    } catch (error) {
      console.error('Error fetching membership history:', error);
      setMembershipHistory([]);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setLoadingAttendance(true);
      const response = await api.get(`/attendance/members/${memberId}/history`);
      setAttendanceHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      setAttendanceHistory([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/gym/members/${memberId}/comments`, { comment: newComment });
      toast.success('Comment added successfully');
      setNewComment('');
      // Add the new comment to the list immediately
      setComments(prev => [response.data, ...prev]);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    // Confirm before deleting
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeletingComment(commentId);
    try {
      await api.delete(`/gym/members/${memberId}/comments/${commentId}`);
      toast.success('Comment deleted successfully');
      // Remove the comment from the list
      setComments(prev => prev.filter(c => c.id !== commentId));
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-500', icon: X },
      expired: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      overdue: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!member) return null;

  const currentMembership = member.current_membership;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = currentMembership?.balance_due || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img 
              src={member.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`}
              alt={member.full_name}
              className="h-12 w-12 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
              }}
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{member.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(member.is_active ? 'active' : 'inactive')}
                {currentMembership && (
                  <span className="text-xs text-gray-500">
                    Member since {formatDate(member.joined_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchMemberDetails();
                fetchComments();
                fetchPayments();
                fetchMembershipHistory();
                fetchAttendanceHistory();
              }}
              className="p-2 rounded-xl hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-500" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <p className="text-sm text-green-600 font-medium">Total Paid</p>
              <p className="text-2xl font-bold text-green-700">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
              <p className="text-sm text-orange-600 font-medium">Balance Due</p>
              <p className="text-2xl font-bold text-orange-700">₹{balanceDue.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Total Payments</p>
              <p className="text-2xl font-bold text-blue-700">{payments.length}</p>
            </div>
          </div>

          {/* Member Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-medium text-gray-900">{member.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium text-gray-900">{member.phone}</span>
                </div>
                {member.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-900">{member.email}</span>
                  </div>
                )}
                {member.date_of_birth && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date of Birth:</span>
                    <span className="font-medium text-gray-900">{formatDate(member.date_of_birth)}</span>
                  </div>
                )}
                {member.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gender:</span>
                    <span className="font-medium text-gray-900">{member.gender}</span>
                  </div>
                )}
                {member.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address:</span>
                    <span className="font-medium text-gray-900">{member.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Membership */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Current Membership
              </h3>
              {currentMembership ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium text-gray-900">{currentMembership.plan?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span className="font-medium text-gray-900">{formatDate(currentMembership.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date:</span>
                    <span className="font-medium text-gray-900">{formatDate(currentMembership.end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    {getStatusBadge(currentMembership.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Status:</span>
                    {getPaymentStatusBadge(currentMembership.payment_status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Paid:</span>
                    <span className="font-medium text-green-600">₹{currentMembership.amount_paid?.toLocaleString() || 0}</span>
                  </div>
                  {currentMembership.balance_due > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Balance Due:</span>
                      <span className="font-medium text-orange-600">₹{currentMembership.balance_due.toLocaleString()}</span>
                    </div>
                  )}
                  {currentMembership.next_payment_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Payment:</span>
                      <span className="font-medium text-blue-600">{formatDate(currentMembership.next_payment_date)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No active membership</p>
              )}
            </div>

            {/* Emergency Contact */}
            {(member.emergency_contact_name || member.emergency_contact_phone) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Emergency Contact
                </h3>
                <div className="space-y-2 text-sm">
                  {member.emergency_contact_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium text-gray-900">{member.emergency_contact_name}</span>
                    </div>
                  )}
                  {member.emergency_contact_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium text-gray-900">{member.emergency_contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical Info */}
            {(member.medical_conditions || member.allergies || member.medications) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Medical Information
                </h3>
                <div className="space-y-2 text-sm">
                  {member.medical_conditions && (
                    <div>
                      <span className="text-gray-500 block">Medical Conditions:</span>
                      <p className="text-gray-900 mt-1">{member.medical_conditions}</p>
                    </div>
                  )}
                  {member.allergies && (
                    <div>
                      <span className="text-gray-500 block">Allergies:</span>
                      <p className="text-gray-900 mt-1">{member.allergies}</p>
                    </div>
                  )}
                  {member.medications && (
                    <div>
                      <span className="text-gray-500 block">Medications:</span>
                      <p className="text-gray-900 mt-1">{member.medications}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </h3>
            {loadingPayments ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Amount</th>
                      <th className="text-left px-4 py-2">Method</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-left px-4 py-2">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 py-2 font-medium text-green-600">₹{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 capitalize">{payment.payment_method}</td>
                        <td className="px-4 py-2">{getPaymentStatusBadge(payment.status)}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{payment.transaction_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No payment records found</p>
            )}
          </div>

          {/* Membership History */}
          {membershipHistory.length > 1 && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Membership History
              </h3>
              <div className="space-y-3">
                {membershipHistory.map((membership) => (
                  <div key={membership.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{membership.plan?.name || 'Unknown Plan'}</span>
                      {getStatusBadge(membership.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Start:</span>
                        <span className="ml-2 text-gray-900">{formatDate(membership.start_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">End:</span>
                        <span className="ml-2 text-gray-900">{formatDate(membership.end_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid:</span>
                        <span className="ml-2 text-green-600">₹{membership.amount_paid?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Balance:</span>
                        <span className="ml-2 text-orange-600">₹{membership.balance_due?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance History */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Recent Attendance
            </h3>
            {loadingAttendance ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : attendanceHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Check In</th>
                      <th className="text-left px-4 py-2">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceHistory.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{formatDate(attendance.check_in_time)}</td>
                        <td className="px-4 py-2">{formatDateTime(attendance.check_in_time)}</td>
                        <td className="px-4 py-2">{attendance.check_out_time ? formatDateTime(attendance.check_out_time) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No attendance records found</p>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments & Communication History
            </h3>

            {/* Add Comment */}
            <div className="flex gap-3 mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment about this member (renewal discussion, upgrade conversation, payment follow-up, etc.)..."
                rows={3}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 h-fit"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {loadingComments ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-xl p-4 group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {comment.user_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{comment.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 capitalize">{comment.user_role?.replace('_', ' ')}</span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingComment === comment.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-100 text-red-500 disabled:opacity-50"
                          title="Delete comment"
                        >
                          {deletingComment === comment.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 ml-10">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet. Add the first comment!</p>
                  <p className="text-xs mt-1">Track renewals, upgrades, and payment discussions here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;