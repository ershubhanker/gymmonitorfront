// src/components/MemberProfileModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, MapPin, DollarSign, Tag, 
  MessageCircle, User, Clock, CheckCircle, AlertCircle,
  Send, MessageSquare, History, CreditCard, Activity,
  Award, Calendar as CalendarIcon, FileText, Users,
  Edit, RefreshCw, Loader2, Trash2, Save, XCircle
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
  const [balanceDetails, setBalanceDetails] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // ===== EDIT STATE =====
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_conditions: '',
    allergies: '',
    medications: '',
    id_proof_type: '',
    id_proof_number: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchMemberDetails();
    fetchComments();
    fetchPayments();
    fetchMembershipHistory();
    fetchAttendanceHistory();
    fetchBalanceDetails();
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gym/members/${memberId}`);
      const memberData = response.data;
      setMember(memberData);
      // Initialize edit form data
      setEditFormData({
        full_name: memberData.full_name || '',
        email: memberData.email || '',
        phone: memberData.phone || '',
        address: memberData.address || '',
        date_of_birth: memberData.date_of_birth || '',
        gender: memberData.gender || 'male',
        emergency_contact_name: memberData.emergency_contact_name || '',
        emergency_contact_phone: memberData.emergency_contact_phone || '',
        medical_conditions: memberData.medical_conditions || '',
        allergies: memberData.allergies || '',
        medications: memberData.medications || '',
        id_proof_type: memberData.id_proof_type || 'aadhar',
        id_proof_number: memberData.id_proof_number || '',
      });
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

  const fetchBalanceDetails = async () => {
    try {
      setLoadingBalance(true);
      const response = await api.get(`/gym/members/${memberId}/balance`);
      setBalanceDetails(response.data);
    } catch (error) {
      console.error('Error fetching balance details:', error);
      setBalanceDetails(null);
    } finally {
      setLoadingBalance(false);
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

  // ===== EDIT FUNCTIONS =====
  const handleEditClick = () => {
    setIsEditing(true);
    // Reset form data with current member data
    if (member) {
      setEditFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender || 'male',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_conditions: member.medical_conditions || '',
        allergies: member.allergies || '',
        medications: member.medications || '',
        id_proof_type: member.id_proof_type || 'aadhar',
        id_proof_number: member.id_proof_number || '',
      });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!editFormData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!editFormData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!/^[+]?[\d\s\-]{7,15}$/.test(editFormData.phone.trim())) {
      toast.error('Enter a valid phone number');
      return;
    }

    setSavingEdit(true);
    try {
      // Prepare update data - only send fields that have changed
      const updateData = {};
      for (const key of Object.keys(editFormData)) {
        if (editFormData[key] !== member[key]) {
          updateData[key] = editFormData[key] || null;
        }
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        setIsEditing(false);
        setSavingEdit(false);
        return;
      }

      await api.put(`/gym/members/${memberId}`, updateData);
      
      toast.success('Member details updated successfully!');
      
      // Refresh member data
      await fetchMemberDetails();
      if (onUpdate) onUpdate();
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error(error.response?.data?.detail || 'Failed to update member details');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    // Reset form data to current member data
    if (member) {
      setEditFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender || 'male',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_conditions: member.medical_conditions || '',
        allergies: member.allergies || '',
        medications: member.medications || '',
        id_proof_type: member.id_proof_type || 'aadhar',
        id_proof_number: member.id_proof_number || '',
      });
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
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeletingComment(commentId);
    try {
      await api.delete(`/gym/members/${memberId}/comments/${commentId}`);
      toast.success('Comment deleted successfully');
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
  
  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceDue = balanceDetails?.balance_due || currentMembership?.balance_due || 0;
  const totalPlanAmount = balanceDetails?.total_amount || currentMembership?.plan?.price || 0;

  // ID Proof options
  const idProofOptions = [
    { value: 'aadhar', label: 'Aadhar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'dl', label: 'Driving License' },
    { value: 'passport', label: 'Passport' },
    { value: 'voter', label: 'Voter ID' },
  ];

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
                fetchBalanceDetails();
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
              <p className="text-xs text-green-500 mt-1">Amount actually paid by member</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
              <p className="text-sm text-orange-600 font-medium">Plan Amount</p>
              <p className="text-2xl font-bold text-orange-700">₹{totalPlanAmount.toLocaleString()}</p>
              <p className="text-xs text-orange-500 mt-1">Total amount member needs to pay</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Balance Due</p>
              <p className="text-2xl font-bold text-blue-700">₹{balanceDue.toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-1">Remaining amount to be paid</p>
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex justify-end">
            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Member Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info - Editable */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
                {isEditing && <span className="text-xs text-blue-600 ml-2">(Editing)</span>}
              </h3>
              {isEditing ? (
                <form className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Full Name *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={editFormData.full_name}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={editFormData.date_of_birth}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Gender</label>
                    <select
                      name="gender"
                      value={editFormData.gender}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Address</label>
                    <textarea
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditChange}
                      rows="2"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                </form>
              ) : (
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
              )}
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

            {/* Emergency Contact - Editable */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Emergency Contact
                {isEditing && <span className="text-xs text-blue-600 ml-2">(Editing)</span>}
              </h3>
              {isEditing ? (
                <form className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Contact Name</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={editFormData.emergency_contact_name}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Contact Phone</label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={editFormData.emergency_contact_phone}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </form>
              ) : (
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
                  {!member.emergency_contact_name && !member.emergency_contact_phone && (
                    <p className="text-sm text-gray-400 text-center py-2">No emergency contact set</p>
                  )}
                </div>
              )}
            </div>

            {/* Medical Info - Editable */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Medical Information
                {isEditing && <span className="text-xs text-blue-600 ml-2">(Editing)</span>}
              </h3>
              {isEditing ? (
                <form className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Medical Conditions</label>
                    <textarea
                      name="medical_conditions"
                      value={editFormData.medical_conditions}
                      onChange={handleEditChange}
                      rows="2"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="e.g. Diabetes, Hypertension"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Allergies</label>
                    <textarea
                      name="allergies"
                      value={editFormData.allergies}
                      onChange={handleEditChange}
                      rows="2"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="e.g. Peanuts, Latex"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Current Medications</label>
                    <textarea
                      name="medications"
                      value={editFormData.medications}
                      onChange={handleEditChange}
                      rows="2"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="List any regular medications"
                    />
                  </div>
                </form>
              ) : (
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
                  {!member.medical_conditions && !member.allergies && !member.medications && (
                    <p className="text-sm text-gray-400 text-center py-2">No medical information recorded</p>
                  )}
                </div>
              )}
            </div>

            {/* ID Proof - Editable */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ID Proof
                {isEditing && <span className="text-xs text-blue-600 ml-2">(Editing)</span>}
              </h3>
              {isEditing ? (
                <form className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">ID Proof Type</label>
                    <select
                      name="id_proof_type"
                      value={editFormData.id_proof_type}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {idProofOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">ID Proof Number</label>
                    <input
                      type="text"
                      name="id_proof_number"
                      value={editFormData.id_proof_number}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </form>
              ) : (
                <div className="space-y-2 text-sm">
                  {member.id_proof_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium text-gray-900">
                        {idProofOptions.find(o => o.value === member.id_proof_type)?.label || member.id_proof_type}
                      </span>
                    </div>
                  )}
                  {member.id_proof_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Number:</span>
                      <span className="font-medium text-gray-900">{member.id_proof_number}</span>
                    </div>
                  )}
                  {!member.id_proof_type && !member.id_proof_number && (
                    <p className="text-sm text-gray-400 text-center py-2">No ID proof recorded</p>
                  )}
                </div>
              )}
            </div>
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
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between">
                  <span className="font-medium text-gray-600">Total Paid:</span>
                  <span className="font-bold text-green-600">₹{totalPaid.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-300 mb-2">
                  <CreditCard className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-sm text-gray-400">No payment records found</p>
                <p className="text-xs text-gray-300 mt-1">Payments will appear here once recorded</p>
              </div>
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