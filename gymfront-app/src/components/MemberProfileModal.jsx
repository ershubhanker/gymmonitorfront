// src/components/MemberProfileModal.jsx - FIXED IMAGE URL HANDLING
import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, MapPin, DollarSign, Tag, 
  MessageCircle, User, Clock, CheckCircle, AlertCircle,
  Send, MessageSquare, History, CreditCard, Activity,
  Award, Calendar as CalendarIcon, FileText, Users,
  Edit, RefreshCw, Loader2, Trash2, Save, XCircle,
  Dumbbell, Pencil, Maximize2, Hash
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import toast from 'react-hot-toast';

// ============================================================
// HELPER: Properly construct image URL
// ============================================================
const getImageUrl = (profileImage, fullName) => {
  if (!profileImage) {
    // Fallback to avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=0D9488&color=fff&size=512`;
  }
  
  // If it's already a full URL (starts with http)
  if (profileImage.startsWith('http')) {
    return profileImage;
  }
  
  // Construct full URL from relative path
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const imagePath = profileImage.startsWith('/') ? profileImage : `/${profileImage}`;
  return `${baseUrl}${imagePath}`;
};

const getThumbnailUrl = (profileImage, fullName) => {
  if (!profileImage) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=0D9488&color=fff&size=128`;
  }
  
  if (profileImage.startsWith('http')) {
    return profileImage;
  }
  
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const imagePath = profileImage.startsWith('/') ? profileImage : `/${profileImage}`;
  return `${baseUrl}${imagePath}`;
};

// ============================================================
// MAIN COMPONENT
// ============================================================
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
  
  // ===== IMAGE ZOOM STATE =====
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  
  // ===== PT State =====
  const [ptSessions, setPtSessions] = useState([]);
  const [loadingPt, setLoadingPt] = useState(false);

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

  // ===== PAYMENT EDIT STATE =====
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentEditData, setPaymentEditData] = useState({
    amount_paid: '',
    discount_applied: '',
    payment_method: 'cash',
    notes: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // ===== MEMBERSHIP EDIT STATE =====
  const [isEditingMembership, setIsEditingMembership] = useState(false);
  const [membershipEditData, setMembershipEditData] = useState({
    plan_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });
  const [savingMembership, setSavingMembership] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    fetchMemberDetails();
    fetchComments();
    fetchPayments();
    fetchMembershipHistory();
    fetchAttendanceHistory();
    fetchBalanceDetails();
    fetchPtSessions();
    fetchPlans();
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gym/members/${memberId}`);
      const memberData = response.data;
      setMember(memberData);
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
      
      // Initialize payment edit data from current membership
      if (memberData.current_membership) {
        setPaymentEditData({
          amount_paid: memberData.current_membership.amount_paid?.toString() || '0',
          discount_applied: memberData.current_membership.discount_applied?.toString() || '0',
          payment_method: 'cash',
          notes: memberData.current_membership.notes || '',
        });
        
        // Initialize membership edit data from current membership
        setMembershipEditData({
          plan_id: memberData.current_membership.plan_id?.toString() || '',
          start_date: memberData.current_membership.start_date || '',
          end_date: memberData.current_membership.end_date || '',
          status: memberData.current_membership.status || 'active',
        });
      }
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

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await api.get('/gym/plans');
      setPlans(response.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
    } finally {
      setLoadingPlans(false);
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

  // ===== Fetch PT Sessions =====
  const fetchPtSessions = async () => {
    try {
      setLoadingPt(true);
      const response = await api.get(`/gym/members/${memberId}/personal-training`);
      setPtSessions(response.data || []);
    } catch (error) {
      console.error('Error fetching PT sessions:', error);
      setPtSessions([]);
    } finally {
      setLoadingPt(false);
    }
  };

  // ===== PT Status Badge =====
  const getPtStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
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

  // ===== Helper function to parse session days =====
  const parseSessionDays = (sessionDays) => {
    if (!sessionDays) return [];
    if (Array.isArray(sessionDays)) return sessionDays;
    if (typeof sessionDays === 'string') {
      try {
        const parsed = JSON.parse(sessionDays);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // ===== EDIT FUNCTIONS =====
  const handleEditClick = () => {
    setIsEditing(true);
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

  // ===== PAYMENT EDIT FUNCTIONS =====
  const handleEditPaymentClick = () => {
    if (member?.current_membership) {
      setPaymentEditData({
        amount_paid: member.current_membership.amount_paid?.toString() || '0',
        discount_applied: member.current_membership.discount_applied?.toString() || '0',
        payment_method: 'cash',
        notes: member.current_membership.notes || '',
      });
      setPaymentError(null);
      setIsEditingPayment(true);
    } else {
      toast.error('No active membership to edit');
    }
  };

  const handlePaymentEditChange = (e) => {
    const { name, value } = e.target;
    setPaymentEditData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (paymentError) setPaymentError(null);
  };

  const validatePaymentEdit = () => {
    const planPrice = member?.current_membership?.plan?.price || 0;
    const discountApplied = parseFloat(paymentEditData.discount_applied) || 0;
    const amountPaid = parseFloat(paymentEditData.amount_paid) || 0;
    const finalPrice = Math.max(0, planPrice - discountApplied);
    
    if (amountPaid < 0) {
      setPaymentError('Amount paid cannot be negative');
      return false;
    }
    
    if (amountPaid > finalPrice) {
      setPaymentError(`Amount paid cannot exceed final price of ₹${finalPrice}`);
      return false;
    }
    
    if (discountApplied < 0) {
      setPaymentError('Discount cannot be negative');
      return false;
    }
    
    if (discountApplied > planPrice) {
      setPaymentError(`Discount cannot exceed plan price of ₹${planPrice}`);
      return false;
    }
    
    return true;
  };

  const handlePaymentEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!member?.current_membership) {
      toast.error('No active membership to update');
      return;
    }
  
    if (!validatePaymentEdit()) {
      return;
    }
  
    setSavingPayment(true);
    try {
      const membershipId = member.current_membership.id;
      const discountApplied = parseFloat(paymentEditData.discount_applied) || 0;
      const amountPaid = parseFloat(paymentEditData.amount_paid) || 0;
  
      const payload = {
        amount_paid: amountPaid,
        discount_applied: discountApplied,
        notes: paymentEditData.notes || '',
        payment_method: paymentEditData.payment_method || 'cash',
      };
      
      console.log('📤 Updating payment with payload:', payload);
      
      const response = await api.put(`/gym/memberships/${membershipId}/payment`, payload);
      
      console.log('📥 Payment update response:', response.data);
  
      toast.success('Payment details updated successfully!');
      setIsEditingPayment(false);
      await fetchMemberDetails();
      await fetchPayments();
      await fetchBalanceDetails();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error updating payment:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update payment details';
      toast.error(errorMessage);
    } finally {
      setSavingPayment(false);
    }
  };

  const handlePaymentEditCancel = () => {
    setIsEditingPayment(false);
    setPaymentError(null);
  };

  // ===== MEMBERSHIP EDIT FUNCTIONS =====
  const handleEditMembershipClick = () => {
    if (member?.current_membership) {
      setMembershipEditData({
        plan_id: member.current_membership.plan_id?.toString() || '',
        start_date: member.current_membership.start_date || '',
        end_date: member.current_membership.end_date || '',
        status: member.current_membership.status || 'active',
      });
      setIsEditingMembership(true);
    } else {
      toast.error('No active membership to edit');
    }
  };

  const handleMembershipEditChange = (e) => {
    const { name, value } = e.target;
    setMembershipEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleMembershipEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!member?.current_membership) {
      toast.error('No active membership to update');
      return;
    }

    if (!membershipEditData.plan_id) {
      toast.error('Please select a plan');
      return;
    }

    if (!membershipEditData.start_date) {
      toast.error('Please select a start date');
      return;
    }

    if (!membershipEditData.end_date) {
      toast.error('Please select an end date');
      return;
    }

    // Validate dates
    const startDate = new Date(membershipEditData.start_date);
    const endDate = new Date(membershipEditData.end_date);
    
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    setSavingMembership(true);
    try {
      const membershipId = member.current_membership.id;
      const payload = {
        plan_id: parseInt(membershipEditData.plan_id),
        start_date: membershipEditData.start_date,
        end_date: membershipEditData.end_date,
        status: membershipEditData.status,
      };
      
      console.log('📤 Updating membership with payload:', payload);
      
      const response = await api.put(`/gym/memberships/${membershipId}`, payload);
      
      console.log('📥 Membership update response:', response.data);
  
      toast.success('Membership details updated successfully!');
      setIsEditingMembership(false);
      await fetchMemberDetails();
      await fetchMembershipHistory();
      await fetchBalanceDetails();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error updating membership:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update membership details';
      toast.error(errorMessage);
    } finally {
      setSavingMembership(false);
    }
  };

  const handleMembershipEditCancel = () => {
    setIsEditingMembership(false);
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
      inactive: { color: 'bg-gray-100 text-gray-500', icon: XCircle },
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

  // Calculate payment summary
  const getPaymentSummary = () => {
    const membership = member?.current_membership;
    if (!membership) return null;
    
    const planPrice = membership.plan?.price || 0;
    const discountApplied = membership.discount_applied || 0;
    const amountPaid = membership.amount_paid || 0;
    const finalPrice = Math.max(0, planPrice - discountApplied);
    const balanceDue = Math.max(0, finalPrice - amountPaid);
    
    return {
      planPrice,
      discountApplied,
      amountPaid,
      finalPrice,
      balanceDue,
    };
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
  const paymentSummary = getPaymentSummary();
  
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

  // Status options for membership
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'expired', label: 'Expired' },
    { value: 'pending', label: 'Pending' },
  ];

  // Get image URLs using the helper functions
  const profileImageUrl = getImageUrl(member.profile_image, member.full_name);
  const thumbnailImageUrl = getThumbnailUrl(member.profile_image, member.full_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Profile Image with click to zoom */}
            <div 
              className="relative cursor-pointer group flex-shrink-0"
              onClick={() => setIsImageZoomed(true)}
            >
              <img 
                src={thumbnailImageUrl}
                alt={member.full_name}
                className="h-12 w-12 rounded-full object-cover border-2 border-transparent group-hover:border-blue-400 transition-all duration-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{member.full_name}</h2>
                {/* Member ID Badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-mono border border-gray-200">
                  <Hash className="h-3 w-3" />
                  #{member.id}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                fetchPtSessions();
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

        {/* Image Zoom Modal */}
        {isImageZoomed && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setIsImageZoomed(false)}
          >
            <button
              onClick={() => setIsImageZoomed(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
              <img
                src={profileImageUrl}
                alt={member.full_name}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=512`;
                }}
              />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">
              Click anywhere to close
            </div>
          </div>
        )}

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

          {/* Edit Buttons Row */}
          <div className="flex flex-wrap justify-end gap-2">
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
            
            {currentMembership && !isEditingPayment && (
              <button
                onClick={handleEditPaymentClick}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <Pencil className="h-4 w-4" />
                Edit Payment
              </button>
            )}

            {currentMembership && !isEditingMembership && !isEditingPayment && !isEditing && (
              <button
                onClick={handleEditMembershipClick}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Calendar className="h-4 w-4" />
                Edit Membership
              </button>
            )}
          </div>

          {/* Payment Edit Modal */}
          {isEditingPayment && currentMembership && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  Edit Payment Details
                </h3>
                <button
                  onClick={handlePaymentEditCancel}
                  className="text-purple-400 hover:text-purple-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handlePaymentEditSubmit} className="space-y-4">
                {/* Plan Info Display */}
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Plan:</span>
                      <span className="font-medium ml-2">{currentMembership.plan?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Plan Price:</span>
                      <span className="font-medium ml-2">₹{currentMembership.plan?.price || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Applied (₹)
                    </label>
                    <input
                      type="number"
                      name="discount_applied"
                      min="0"
                      step="1"
                      value={paymentEditData.discount_applied}
                      onChange={handlePaymentEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Discount amount applied to this membership</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      name="amount_paid"
                      min="0"
                      step="1"
                      value={paymentEditData.amount_paid}
                      onChange={handlePaymentEditChange}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white ${
                        paymentError ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {paymentError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {paymentError}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      name="payment_method"
                      value={paymentEditData.payment_method}
                      onChange={handlePaymentEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
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
                      Notes
                    </label>
                    <input
                      type="text"
                      name="notes"
                      value={paymentEditData.notes}
                      onChange={handlePaymentEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      placeholder="Payment notes"
                    />
                  </div>
                </div>
                
                {/* Payment Summary Preview */}
                {(() => {
                  const planPrice = currentMembership.plan?.price || 0;
                  const discount = parseFloat(paymentEditData.discount_applied) || 0;
                  const paid = parseFloat(paymentEditData.amount_paid) || 0;
                  const finalPrice = Math.max(0, planPrice - discount);
                  const balance = Math.max(0, finalPrice - paid);
                  
                  return (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Payment Summary</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Plan Price:</span>
                          <span className="font-medium">₹{planPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Discount:</span>
                          <span className="font-medium text-red-600">- ₹{discount}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-600 font-medium">Final Price:</span>
                          <span className="font-medium text-green-600">₹{finalPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount Paid:</span>
                          <span className="font-medium text-blue-600">₹{paid}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-700 font-semibold">Balance Due:</span>
                          <span className={`font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            ₹{balance}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handlePaymentEditCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment || !!paymentError}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {savingPayment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingPayment ? 'Saving...' : 'Update Payment'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Membership Edit Modal */}
          {isEditingMembership && currentMembership && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  Edit Membership Details
                </h3>
                <button
                  onClick={handleMembershipEditCancel}
                  className="text-indigo-400 hover:text-indigo-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleMembershipEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan *
                    </label>
                    <select
                      name="plan_id"
                      value={membershipEditData.plan_id}
                      onChange={handleMembershipEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      disabled={loadingPlans}
                    >
                      <option value="">Select a plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id.toString()}>
                          {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                        </option>
                      ))}
                    </select>
                    {loadingPlans && (
                      <p className="text-xs text-gray-400 mt-1">Loading plans...</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={membershipEditData.status}
                      onChange={handleMembershipEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={membershipEditData.start_date}
                      onChange={handleMembershipEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={membershipEditData.end_date}
                      onChange={handleMembershipEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Selected Plan Preview */}
                {membershipEditData.plan_id && (
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Selected Plan Details</p>
                    {(() => {
                      const selectedPlan = plans.find(p => p.id.toString() === membershipEditData.plan_id);
                      if (!selectedPlan) return <p className="text-sm text-gray-400">Plan not found</p>;
                      return (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Name:</span>
                            <span className="font-medium ml-2">{selectedPlan.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="font-medium ml-2 text-green-600">₹{selectedPlan.price}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="font-medium ml-2">{selectedPlan.duration_days} days</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Date Validation Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Ensure the end date is after the start date. The membership duration will be calculated based on these dates.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleMembershipEditCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingMembership}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {savingMembership ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingMembership ? 'Saving...' : 'Update Membership'}
                  </button>
                </div>
              </form>
            </div>
          )}

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
                    <span className="text-gray-500">Member ID:</span>
                    <span className="font-medium text-gray-900 font-mono">#{member.id}</span>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Current Membership
                </h3>
                {isEditingMembership && <span className="text-xs text-indigo-600">(Editing)</span>}
              </div>
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
                  
                  {/* Discount Applied Display */}
                  {currentMembership.discount_applied > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount Applied:</span>
                      <span className="font-medium text-red-600">- ₹{currentMembership.discount_applied.toLocaleString()}</span>
                    </div>
                  )}
                  
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
                  
                  {/* Payment Summary */}
                  {paymentSummary && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-1">Payment Summary</p>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Plan Price:</span>
                          <span className="text-gray-600">₹{paymentSummary.planPrice}</span>
                        </div>
                        {paymentSummary.discountApplied > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Discount:</span>
                            <span className="text-red-500">- ₹{paymentSummary.discountApplied}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Final Price:</span>
                          <span className="text-gray-800">₹{paymentSummary.finalPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Paid:</span>
                          <span className="text-green-600">₹{paymentSummary.amountPaid}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-600">Balance:</span>
                          <span className={paymentSummary.balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}>
                            ₹{paymentSummary.balanceDue}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No active membership</p>
              )}
            </div>

            {/* Emergency Contact */}
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

            {/* Medical Info */}
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

            {/* ID Proof */}
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

          {/* Personal Training Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-600" />
              Personal Training
            </h3>
            
            {loadingPt ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : ptSessions.length > 0 ? (
              <div className="space-y-4">
                {ptSessions.map((session) => {
                  const daysArray = parseSessionDays(session.session_days);
                  const daysDisplay = daysArray.length > 0 
                    ? daysArray.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                    : '—';
                  
                  return (
                    <div key={session.id} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold text-gray-900">
                            Trainer: {session.trainer_name || 'Unknown Trainer'}
                          </span>
                        </div>
                        {getPtStatusBadge(session.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <span className="ml-2 font-medium text-gray-900">{formatDate(session.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <span className="ml-2 font-medium text-gray-900">{formatDate(session.end_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <span className="ml-2 font-medium text-gray-900">{session.session_time || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Days:</span>
                          <span className="ml-2 font-medium text-gray-900">{daysDisplay}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-purple-200">
                        <div>
                          <span className="text-gray-500 text-xs">Total Amount:</span>
                          <p className="font-semibold text-purple-700">₹{session.total_amount?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Amount Paid:</span>
                          <p className="font-semibold text-green-600">₹{session.amount_paid?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Balance Due:</span>
                          <p className={`font-semibold ${session.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            ₹{session.balance_due?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Status:</span>
                          <p className="font-medium text-gray-900 capitalize">{session.status || 'Pending'}</p>
                        </div>
                      </div>
                      
                      {session.notes && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <span className="text-gray-500 text-sm">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{session.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-300 mb-2">
                  <Dumbbell className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-sm text-gray-400">No personal training sessions</p>
                <p className="text-xs text-gray-300 mt-1">PT sessions will appear here once assigned</p>
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