// src/pages/HistoricalInvoices.jsx - Fixed PT display (only show if PT exists)

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  Loader2, 
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wifi,
  X,
  RefreshCw,
  ArrowLeft,
  Printer,
  Dumbbell,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ============================================================
// PT STATUS HELPER - Check if session is active based on dates
// ============================================================
const getPtStatus = (session) => {
  if (!session) return null;
  
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

// ============================================================
// SUB-COMPONENTS
// ============================================================

const MemberSearchItem = ({ member, onSelect, isSelected }) => {
  let avatarUrl;
  if (member.profile_image) {
    if (member.profile_image.startsWith('http')) {
      avatarUrl = member.profile_image;
    } else {
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const imagePath = member.profile_image.startsWith('/') ? member.profile_image : `/${member.profile_image}`;
      avatarUrl = `${baseUrl}${imagePath}`;
    }
  } else {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
  }

  return (
    <div
      onClick={() => onSelect(member)}
      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
      }`}
    >
      <img 
        src={avatarUrl}
        alt={member.full_name}
        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{member.full_name}</p>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {member.membership_count} plan{member.membership_count !== 1 ? 's' : ''}
          </span>
          {member.current_plan && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Current: {member.current_plan}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {member.phone}
          </span>
          {member.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {member.email}
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
      )}
    </div>
  );
};

// ============================================================
// INDIVIDUAL PAYMENT ITEM COMPONENT
// ============================================================
const PaymentHistoryItem = ({ payment, membership, onDownload, downloading }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">
              Payment #{payment.id || 'N/A'}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {payment.payment_method || 'Cash'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
            </span>
            {payment.transaction_id && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                #{payment.transaction_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
            <span>Plan: {membership.plan_name}</span>
            <span>Amount: ₹{payment.amount.toLocaleString()}</span>
            {payment.notes && (
              <span className="text-xs text-gray-400">{payment.notes}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm text-gray-500">Paid</div>
            <div className="font-semibold text-blue-600">
              ₹{payment.amount.toLocaleString()}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(membership.membership_id);
            }}
            disabled={downloading === membership.membership_id}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {downloading === membership.membership_id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="text-sm hidden sm:inline">Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PT SESSION DISPLAY COMPONENT
// ============================================================
const PtSessionDisplay = ({ ptSession }) => {
  if (!ptSession) return null;
  
  const ptStatus = getPtStatus(ptSession);
  if (!ptStatus) return null;
  
  // Only show if there's actual PT data (total_amount > 0 or amount_paid > 0)
  const hasPtData = (ptSession.total_amount || 0) > 0 || (ptSession.amount_paid || 0) > 0;
  if (!hasPtData) return null;
  
  const isExpired = ptStatus.status === 'expired';
  
  return (
    <div className={`rounded-lg p-3 ${isExpired ? 'bg-gray-50 border border-gray-200' : 'bg-purple-50 border border-purple-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-purple-600" />
          Personal Training
        </h4>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ptStatus.color}`}>
          {ptStatus.label}
          {isExpired && (
            <span className="text-xs opacity-75">(Expired)</span>
          )}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Trainer</span>
          <span className="font-medium">{ptSession.trainer_name || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total Amount</span>
          <span className="font-medium">₹{ptSession.total_amount?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount Paid</span>
          <span className="font-medium text-green-600">₹{ptSession.amount_paid?.toLocaleString() || 0}</span>
        </div>
        {(ptSession.balance_due || 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Balance Due</span>
            <span className="font-medium text-orange-600">₹{ptSession.balance_due?.toLocaleString() || 0}</span>
          </div>
        )}
        {ptSession.start_date && ptSession.end_date && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>Period</span>
            <span>
              {new Date(ptSession.start_date).toLocaleDateString()} - {new Date(ptSession.end_date).toLocaleDateString()}
            </span>
          </div>
        )}
        {isExpired && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-100 rounded p-1.5 text-center">
            ⚠️ This PT session expired on {new Date(ptSession.end_date).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

const MembershipHistoryItem = ({ membership, onDownload, downloading }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getStatusConfig = (status) => {
    const configs = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      expired: { color: 'bg-gray-100 text-gray-600', icon: Clock, label: 'Expired' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      cancelled: { color: 'bg-red-100 text-red-600', icon: XCircle, label: 'Cancelled' },
    };
    return configs[status] || configs.expired;
  };

  const statusConfig = getStatusConfig(membership.status);
  const StatusIcon = statusConfig.icon;

  // Calculate total payments and count
  const totalPayments = membership.payments?.length || 0;
  const totalPaid = membership.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || membership.amount_paid || 0;

  // Check if PT exists and has data
  const hasPt = membership.has_pt && membership.pt_session;
  const ptStatus = hasPt ? getPtStatus(membership.pt_session) : null;
  const hasPtData = hasPt && ((membership.pt_session?.total_amount || 0) > 0 || (membership.pt_session?.amount_paid || 0) > 0);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      membership.is_active ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
    }`}>
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">
                {membership.plan_name}
              </span>
              {membership.is_active && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3" />
                  Current
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </span>
              {hasPtData && ptStatus && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ptStatus.color}`}>
                  <Dumbbell className="h-3 w-3" />
                  PT {ptStatus.label}
                </span>
              )}
              {totalPayments > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  <CreditCard className="h-3 w-3" />
                  {totalPayments} payment{totalPayments !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {membership.start_date ? new Date(membership.start_date).toLocaleDateString() : 'N/A'}
                {' → '}
                {membership.end_date ? new Date(membership.end_date).toLocaleDateString() : 'N/A'}
              </span>
              <span>Duration: {membership.duration_days} days</span>
              <span>Payments: {totalPayments}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Paid</div>
              <div className="font-semibold text-blue-600">
                ₹{totalPaid.toLocaleString()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(membership.membership_id);
              }}
              disabled={downloading === membership.membership_id}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {downloading === membership.membership_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="text-sm hidden sm:inline">Invoice</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan Price</span>
                  <span className="font-medium">₹{membership.plan_price?.toLocaleString() || 0}</span>
                </div>
                {membership.discount_applied > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount Applied</span>
                    <span>-₹{membership.discount_applied.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-1 border-t border-gray-200">
                  <span>Total Amount Paid</span>
                  <span className="text-blue-600">₹{totalPaid.toLocaleString()}</span>
                </div>
                {membership.discounted_price && membership.discounted_price > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Discounted Price</span>
                    <span>₹{membership.discounted_price.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PT Details - Only show if PT has data */}
            {hasPtData && membership.pt_session && (
              <PtSessionDisplay ptSession={membership.pt_session} />
            )}

            {/* Show empty state if no PT */}
            {!hasPtData && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center text-gray-400 text-sm">
                <Dumbbell className="h-4 w-4 mr-2 text-gray-300" />
                No Personal Training for this period
              </div>
            )}
          </div>

          {/* Individual Payments Section */}
          {membership.payments && membership.payments.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  Individual Payments ({membership.payments.length})
                </h4>
                <button
                  onClick={() => {
                    membership.payments.forEach((p, index) => {
                      setTimeout(() => {
                        onDownload(membership.membership_id);
                      }, index * 500);
                    });
                  }}
                  disabled={downloading === membership.membership_id}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download All
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {membership.payments.map((payment, index) => (
                  <PaymentHistoryItem
                    key={payment.id || index}
                    payment={payment}
                    membership={membership}
                    onDownload={onDownload}
                    downloading={downloading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Invoice Status */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {membership.is_active 
                ? 'This is the current active membership' 
                : `This membership ${membership.status === 'expired' ? 'expired' : 'was ' + membership.status} on ${membership.end_date ? new Date(membership.end_date).toLocaleDateString() : 'N/A'}`}
            </span>
            <button
              onClick={() => onDownload(membership.membership_id)}
              disabled={downloading === membership.membership_id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {downloading === membership.membership_id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Download Full Invoice
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const HistoricalInvoices = () => {
  const { user } = useAuth();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);

  // Search for members
  const searchMembers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    setError(null);
    try {
      const response = await api.get(`/gym/members/historical-invoices/search?search=${encodeURIComponent(query)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
      if (error.response?.status === 404) {
        setError('API endpoint not found. Please check server configuration.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to search members.');
      } else {
        setError(error.response?.data?.detail || 'Failed to search members. Please try again.');
      }
      toast.error(error.response?.data?.detail || 'Failed to search members');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchMembers(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, searchMembers]);

  // Load member's historical memberships
  const loadMemberMemberships = useCallback(async (member) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/gym/members/${member.id}/historical-memberships`);
      const membershipsData = (response.data || []).map(m => ({
        ...m,
        payments: m.payments || [],
        pt_session: m.pt_session ? {
          ...m.pt_session,
          amount_paid: m.pt_session.amount_paid || 0,
          balance_due: m.pt_session.balance_due || 0,
          total_amount: m.pt_session.total_amount || 0,
        } : null
      }));
      setMemberships(membershipsData);
      setMemberDetails(member);
      setSelectedMember(member);
      
      const totalPayments = membershipsData.reduce((sum, m) => sum + (m.payments?.length || 0), 0);
      if (membershipsData.length === 0) {
        toast('No historical memberships found for this member', { icon: 'ℹ️' });
      } else if (totalPayments === 0) {
        toast('No payment records found for this member', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${membershipsData.length} membership(s) with ${totalPayments} payment(s)`);
      }
    } catch (error) {
      console.error('Error loading memberships:', error);
      if (error.response?.status === 404) {
        setError('API endpoint not found. Please check server configuration.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view member memberships.');
      } else {
        setError(error.response?.data?.detail || 'Failed to load membership history');
      }
      toast.error(error.response?.data?.detail || 'Failed to load membership history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle member selection
  const handleMemberSelect = (member) => {
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setMemberships([]);
      setMemberDetails(null);
    } else {
      loadMemberMemberships(member);
    }
  };

  // Download historical invoice
  const handleDownloadInvoice = async (membershipId) => {
    if (!selectedMember) return;
    
    setDownloading(membershipId);
    try {
      const response = await api.post(
        `/gym/members/${selectedMember.id}/memberships/${membershipId}/invoice`,
        {},
        { responseType: 'blob' }
      );
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Invoice_${selectedMember.full_name.replace(/\s+/g, '_')}_${membershipId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error(error.response?.data?.detail || 'Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedMember(null);
    setMemberships([]);
    setMemberDetails(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Render member avatar
  const getAvatarUrl = (member) => {
    if (member.profile_image) {
      if (member.profile_image.startsWith('http')) {
        return member.profile_image;
      }
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const imagePath = member.profile_image.startsWith('/') ? member.profile_image : `/${member.profile_image}`;
      return `${baseUrl}${imagePath}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
  };

  // Calculate total payments across all memberships
  const getTotalPayments = () => {
    return memberships.reduce((total, m) => total + (m.payments?.length || 0), 0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historical Invoices</h1>
            <p className="text-sm text-gray-500">
              Search for a member and download invoices from their previous plans and individual payments
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by member name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {searching && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedMember && (
              <button
                onClick={handleClearSelection}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Selection
              </button>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                handleClearSelection();
                setError(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchTerm.length >= 2 && searchResults.length > 0 && !selectedMember && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-gray-500 mb-3">
              Found {searchResults.length} member{searchResults.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {searchResults.map((member) => (
                <MemberSearchItem
                  key={member.id}
                  member={member}
                  onSelect={handleMemberSelect}
                  isSelected={selectedMember?.id === member.id}
                />
              ))}
            </div>
          </div>
        )}

        {searchTerm.length >= 2 && searchResults.length === 0 && !searching && !error && (
          <div className="mt-4 border-t pt-4 text-center text-gray-500">
            <p>No members found matching "{searchTerm}"</p>
            <p className="text-sm mt-1">Try searching by name, phone number, or email</p>
          </div>
        )}
      </div>

      {/* Selected Member Info */}
      {selectedMember && memberDetails && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <img 
              src={getAvatarUrl(memberDetails)}
              alt={memberDetails.full_name}
              className="h-16 w-16 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(memberDetails.full_name)}&background=0D9488&color=fff&size=128`;
              }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{memberDetails.full_name}</h2>
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {memberships.length} plan{memberships.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {getTotalPayments()} payment{getTotalPayments() !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {memberDetails.phone}
                </span>
                {memberDetails.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {memberDetails.email}
                  </span>
                )}
                {memberDetails.current_plan && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3" />
                    Current: {memberDetails.current_plan}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (memberships.length > 0) {
                    memberships.forEach((m, index) => {
                      setTimeout(() => {
                        handleDownloadInvoice(m.membership_id);
                      }, index * 500);
                    });
                  }
                }}
                disabled={memberships.length === 0 || downloading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Membership History List */}
      {selectedMember && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-300" />
              <p>{error}</p>
              <button 
                onClick={() => loadMemberMemberships(selectedMember)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No historical memberships found for this member.</p>
              <p className="text-sm mt-1">Only current active membership is available.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Membership History
                </h3>
                <span className="text-sm text-gray-500">
                  {memberships.filter(m => m.is_active).length} active · {memberships.filter(m => !m.is_active).length} historical · {getTotalPayments()} total payments
                </span>
              </div>
              <div className="space-y-3">
                {memberships.map((membership) => (
                  <MembershipHistoryItem
                    key={membership.membership_id}
                    membership={membership}
                    onDownload={handleDownloadInvoice}
                    downloading={downloading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedMember && !searchTerm && !error && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Search for a Member
            </h3>
            <p className="text-gray-500">
              Enter a member's name, phone number, or email to view their membership history
              and download invoices from their previous plans and individual payments.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                Search
              </span>
              <span>•</span>
              <span>Select a member</span>
              <span>•</span>
              <span>Download historical invoices</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalInvoices;