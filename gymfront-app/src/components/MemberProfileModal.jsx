// src/components/MemberProfileModal.jsx - WITH PROPER COST HANDLING, NO DECIMALS, IMAGE UPLOAD/DELETE, AND ADD-ON SUPPORT

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Phone, Mail, Calendar, MapPin, DollarSign, Tag, 
  MessageCircle, User, Clock, CheckCircle, AlertCircle,
  Send, MessageSquare, History, CreditCard, Activity,
  Award, Calendar as CalendarIcon, FileText, Users,
  Edit, RefreshCw, Loader2, Trash2, Save, XCircle,
  Dumbbell, Pencil, Maximize2, Hash, Snowflake,
  Heart, AlertTriangle, Filter, Plus, ChevronDown,
  Percent, Camera
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import toast from 'react-hot-toast';

// ============================================================
// HELPER: Properly format currency (handles paisa to rupee conversion)
// Shows whole numbers without decimal places
// ============================================================
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  if (typeof amount === 'number' && amount > 10000 && Number.isInteger(amount)) {
    const rupeeAmount = amount / 100;
    return `₹${Math.round(rupeeAmount).toLocaleString('en-IN')}`;
  }
  if (typeof amount === 'number') {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
  if (typeof amount === 'string') {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount)) {
      if (numAmount > 10000 && Number.isInteger(numAmount)) {
        return `₹${Math.round(numAmount / 100).toLocaleString('en-IN')}`;
      }
      return `₹${Math.round(numAmount).toLocaleString('en-IN')}`;
    }
  }
  return `₹${Math.round(Number(amount)).toLocaleString('en-IN')}`;
};

// Helper to get raw rupee value from paisa or rupee (for calculations)
const getRupeeValue = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0;
  }
  if (typeof amount === 'number' && amount > 10000 && Number.isInteger(amount)) {
    return amount / 100;
  }
  if (typeof amount === 'number') {
    return amount;
  }
  if (typeof amount === 'string') {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount)) {
      if (numAmount > 10000 && Number.isInteger(numAmount)) {
        return numAmount / 100;
      }
      return numAmount;
    }
  }
  return 0;
};

// ============================================================
// COMMENT CATEGORY CONFIGURATION
// ============================================================
const COMMENT_CATEGORIES = {
  balance: {
    label: 'Balance',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: DollarSign,
    description: 'Payment related discussions'
  },
  enquiry: {
    label: 'Enquiry',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: MessageSquare,
    description: 'General enquiries and questions'
  },
  renewal: {
    label: 'Renewal',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: RefreshCw,
    description: 'Membership renewal discussions'
  },
  feedback: {
    label: 'Feedback',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertCircle,
    description: 'Member feedback and reviews'
  },
  followup: {
    label: 'Follow-up',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: Clock,
    description: 'Follow-up calls and reminders'
  },
  general: {
    label: 'General',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: MessageCircle,
    description: 'General comments'
  }
};

// ============================================================
// HELPER: Properly construct image URL
// ============================================================
const getImageUrl = (profileImage, fullName) => {
  if (!profileImage) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=0D9488&color=fff&size=512`;
  }
  
  if (profileImage.startsWith('http')) {
    return profileImage;
  }
  
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
// PROFILE IMAGE EDITOR COMPONENT (with zoom support)
// ============================================================
const ProfileImageEditor = ({ 
  member, 
  memberId, 
  onImageUpdated,
  thumbnailImageUrl,
  profileImageUrl,
  onImageZoom
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 5;

  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Not an image file'));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          let outputFormat = 'image/jpeg';
          let outputQuality = quality;
          
          if (file.type === 'image/png') {
            outputFormat = 'image/png';
            outputQuality = Math.min(quality, 0.9);
          } else if (file.type === 'image/webp') {
            outputFormat = 'image/webp';
          }
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }
              
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                {
                  type: outputFormat,
                  lastModified: Date.now(),
                }
              );
              
              resolve(compressedFile);
            },
            outputFormat,
            outputQuality
          );
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please choose an image under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    toast.loading('Compressing image...', { id: 'compress' });
    
    try {
      const compressedFile = await compressImage(file, 400, 400, 0.8);
      
      toast.dismiss('compress');
      
      const localUrl = URL.createObjectURL(compressedFile);
      setPreview(localUrl);

      const formData = new FormData();
      formData.append('file', compressedFile);
      
      toast.loading('Uploading...', { id: 'upload' });
      
      const response = await api.post(
        `/gym/members/${memberId}/upload-photo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.dismiss('upload');
      toast.success('Photo updated successfully!');
      
      if (onImageUpdated) {
        onImageUpdated(response.data.photo_url);
      }
      
      setPreview(null);
      
    } catch (err) {
      toast.dismiss('compress');
      toast.dismiss('upload');
      console.error('Upload error:', err);
      toast.error(err.response?.data?.detail || 'Photo upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    setDeleting(true);
    try {
      await api.delete(`/gym/members/${memberId}/photo`);
      toast.success('Photo removed successfully!');
      
      if (onImageUpdated) {
        onImageUpdated(null);
      }
      
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.detail || 'Failed to remove photo');
    } finally {
      setDeleting(false);
    }
  };

  const currentImageUrl = preview || profileImageUrl || thumbnailImageUrl;

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl flex-shrink-0">
      <div className="relative flex-shrink-0 group">
        <div 
          className="h-20 w-20 rounded-full overflow-hidden border-4 border-white shadow-lg cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
          onClick={() => onImageZoom && onImageZoom()}
        >
          <img 
            src={currentImageUrl}
            alt={member?.full_name || 'Member'}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.full_name || 'User')}&background=0D9488&color=fff&size=256`;
            }}
          />
        </div>
        
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center pointer-events-none">
          <Maximize2 className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{member?.full_name || 'Member'}</p>
        <p className="text-xs text-gray-500">
          {member?.profile_image ? '📸 Photo uploaded' : 'No photo uploaded'}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-3 w-3" />
                {member?.profile_image ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </button>
          {member?.profile_image && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {deleting ? 'Removing...' : 'Remove Photo'}
            </button>
          )}
          <button
            onClick={() => onImageZoom && onImageZoom()}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            <Maximize2 className="h-3 w-3" />
            View Full Size
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {uploading ? 'Uploading...' : 'Click image to zoom • JPEG, PNG, WebP up to 5MB'}
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Remove Photo?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to remove the profile photo for <strong>{member?.full_name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 border border-gray-300 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePhoto}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMMENT CATEGORY BADGE COMPONENT
// ============================================================
const CommentCategoryBadge = ({ category, size = 'sm' }) => {
  if (!category || !COMMENT_CATEGORIES[category]) {
    return null;
  }
  
  const config = COMMENT_CATEGORIES[category];
  const Icon = config.icon;
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1' 
    : 'text-sm px-3 py-1 gap-1.5';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${config.color} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </span>
  );
};

// ============================================================
// CATEGORY FILTER COMPONENT
// ============================================================
const CategoryFilter = ({ selectedCategory, onSelect, countMap = {} }) => {
  const categories = Object.keys(COMMENT_CATEGORIES);
  
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      <button
        onClick={() => onSelect(null)}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
          !selectedCategory 
            ? 'bg-gray-800 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
        {countMap.total > 0 && (
          <span className="ml-0.5 text-xs opacity-70">({countMap.total})</span>
        )}
      </button>
      {categories.map((key) => {
        const config = COMMENT_CATEGORIES[key];
        const count = countMap[key] || 0;
        const Icon = config.icon;
        const isSelected = selectedCategory === key;
        
        return (
          <button
            key={key}
            onClick={() => onSelect(isSelected ? null : key)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              isSelected
                ? config.color.replace('bg-', 'bg-').replace('text-', 'text-').replace('border-', 'border-') + ' ring-2 ring-offset-1 ring-blue-400'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
            {count > 0 && (
              <span className="ml-0.5 text-xs opacity-70">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const MemberProfileModal = ({ memberId, onClose, onUpdate }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
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
  
  // ===== ADD-ONS STATE =====
  const [memberAddons, setMemberAddons] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [showAddonPaymentModal, setShowAddonPaymentModal] = useState(false);
  const [selectedAddonForPayment, setSelectedAddonForPayment] = useState(null);
  const [addonPaymentAmount, setAddonPaymentAmount] = useState('');
  const [addonPaymentMethod, setAddonPaymentMethod] = useState('cash');
  const [addonPaymentNotes, setAddonPaymentNotes] = useState('');
  const [payingAddon, setPayingAddon] = useState(false);
  
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

  // ===== FREEZE STATE =====
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeType, setFreezeType] = useState('regular');
  const [freezeStartDate, setFreezeStartDate] = useState('');
  const [freezeEndDate, setFreezeEndDate] = useState('');
  const [freezeNotes, setFreezeNotes] = useState('');
  const [freezing, setFreezing] = useState(false);
  const [freezeHistory, setFreezeHistory] = useState([]);
  const [loadingFreezes, setLoadingFreezes] = useState(false);
  const [cancellingFreeze, setCancellingFreeze] = useState(null);

  // ===== COMMENT FILTER STATE =====
  const [commentFilter, setCommentFilter] = useState(null);

  // ===== CATEGORY DROPDOWN STATE =====
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    fetchMemberDetails();
    fetchComments();
    fetchPayments();
    fetchMembershipHistory();
    fetchAttendanceHistory();
    fetchBalanceDetails();
    fetchPtSessions();
    fetchPlans();
    fetchFreezeHistory();
    fetchMemberAddons();
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gym/members/${memberId}`);
      const memberData = response.data;
      
      // NOTE: Do NOT default is_active to true when missing/undefined.
      // Members.jsx (list page) computes status as:
      //   status: member.is_active ? 'active' : 'inactive'
      // which treats undefined/null/0 as inactive. Previously this modal
      // force-defaulted a missing is_active to `true`, which caused the
      // modal to show "Active" for members the list page correctly showed
      // as "Inactive". Leaving the raw API value here (and letting
      // getMemberStatus() below apply the same truthy check) keeps both
      // views consistent.
      
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
      
      if (memberData.current_membership) {
        const amountPaid = getRupeeValue(memberData.current_membership.amount_paid || 0);
        const discountApplied = getRupeeValue(memberData.current_membership.discount_applied || 0);
        
        setPaymentEditData({
          amount_paid: amountPaid.toString(),
          discount_applied: discountApplied.toString(),
          payment_method: 'cash',
          notes: memberData.current_membership.notes || '',
        });
        
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

  const fetchFreezeHistory = async () => {
    try {
      setLoadingFreezes(true);
      const response = await api.get(`/gym/members/${memberId}/freezes`);
      setFreezeHistory(response.data || []);
    } finally {
      setLoadingFreezes(false);
    }
  };

  // ===== ADD-ONS FUNCTIONS =====
  const fetchMemberAddons = async () => {
    try {
      setLoadingAddons(true);
      const response = await api.get(`/gym/members/${memberId}/addons`);
      setMemberAddons(response.data || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
      setMemberAddons([]);
    } finally {
      setLoadingAddons(false);
    }
  };

  const getAddonStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      expired: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Active'}
      </span>
    );
  };

  const handlePayAddon = (addon) => {
    setSelectedAddonForPayment(addon);
    setAddonPaymentAmount('');
    setAddonPaymentMethod('cash');
    setAddonPaymentNotes('');
    setShowAddonPaymentModal(true);
  };

  const handleAddonPaymentSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(addonPaymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (amount > selectedAddonForPayment.balance_due) {
      toast.error(`Amount cannot exceed balance due of ${formatCurrency(selectedAddonForPayment.balance_due)}`);
      return;
    }
    
    setPayingAddon(true);
    try {
      const response = await api.post(
        `/gym/members/${memberId}/addons/${selectedAddonForPayment.id}/pay`,
        {
          amount: amount,
          payment_method: addonPaymentMethod,
          notes: addonPaymentNotes
        }
      );
      
      toast.success(response.data.message);
      setShowAddonPaymentModal(false);
      setSelectedAddonForPayment(null);
      setAddonPaymentAmount('');
      setAddonPaymentNotes('');
      
      await fetchMemberAddons();
      await fetchPayments();
      await fetchBalanceDetails();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error making addon payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to make payment');
    } finally {
      setPayingAddon(false);
    }
  };

  // ===== IMAGE UPDATE HANDLER =====
  const handleImageUpdated = (newPhotoUrl) => {
    if (member) {
      setMember(prev => ({
        ...prev,
        profile_image: newPhotoUrl
      }));
    }
    fetchMemberDetails();
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

  // ===== FREEZE FUNCTIONS =====
  const handleFreezeSubmit = async (e) => {
    e.preventDefault();
    
    if (!member?.current_membership) {
      toast.error('No active membership to freeze');
      return;
    }

    if (!freezeStartDate || !freezeEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (freezeStartDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (freezeEndDate <= freezeStartDate) {
      toast.error('End date must be after start date');
      return;
    }

    setFreezing(true);
    try {
      const freezeData = {
        membership_id: member.current_membership.id,
        freeze_type: freezeType,
        start_date: freezeStartDate,
        end_date: freezeEndDate,
        notes: freezeNotes || null
      };

      const response = await api.post('/gym/memberships/freeze', freezeData);
      
      const freezeDays = (new Date(freezeEndDate) - new Date(freezeStartDate)) / (1000 * 60 * 60 * 24);
      
      toast.success(`✅ Membership frozen for ${freezeDays} days!`);
      toast.success(`📅 Membership extended to ${new Date(response.data.new_end_date).toLocaleDateString()}`);
      
      setFreezeStartDate('');
      setFreezeEndDate('');
      setFreezeNotes('');
      setFreezeType('regular');
      setShowFreezeModal(false);
      
      await fetchMemberDetails();
      await fetchMembershipHistory();
      await fetchFreezeHistory();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Freeze error:', error);
      toast.error(error.response?.data?.detail || 'Failed to freeze membership');
    } finally {
      setFreezing(false);
    }
  };

  const handleCancelFreeze = async (freezeId) => {
    if (!window.confirm('Are you sure you want to cancel this freeze? The membership end date will be reverted.')) {
      return;
    }

    setCancellingFreeze(freezeId);
    try {
      const response = await api.put(`/gym/freezes/${freezeId}`, {
        status: 'cancelled'
      });
      
      toast.success('Freeze cancelled successfully! Membership end date has been reverted.');
      
      await fetchFreezeHistory();
      await fetchMemberDetails();
      await fetchMembershipHistory();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error cancelling freeze:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel freeze');
    } finally {
      setCancellingFreeze(null);
    }
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
      const amountPaid = getRupeeValue(member.current_membership.amount_paid || 0);
      const discountApplied = getRupeeValue(member.current_membership.discount_applied || 0);
      
      setPaymentEditData({
        amount_paid: amountPaid.toString(),
        discount_applied: discountApplied.toString(),
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
    if (paymentError) setPaymentError(null);
  };

  const validatePaymentEdit = () => {
    const planPrice = getRupeeValue(member?.current_membership?.plan?.price || 0);
    const discountApplied = parseFloat(paymentEditData.discount_applied) || 0;
    const amountPaid = parseFloat(paymentEditData.amount_paid) || 0;
    const finalPrice = Math.max(0, planPrice - discountApplied);
    
    if (amountPaid < 0) {
      setPaymentError('Amount paid cannot be negative');
      return false;
    }
    if (amountPaid > finalPrice) {
      setPaymentError(`Amount paid cannot exceed final price of ${formatCurrency(finalPrice)}`);
      return false;
    }
    if (discountApplied < 0) {
      setPaymentError('Discount cannot be negative');
      return false;
    }
    if (discountApplied > planPrice) {
      setPaymentError(`Discount cannot exceed plan price of ${formatCurrency(planPrice)}`);
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
        amount_paid: Math.round(amountPaid * 100),
        discount_applied: Math.round(discountApplied * 100),
        notes: paymentEditData.notes || '',
        payment_method: paymentEditData.payment_method || 'cash',
      };
      
      await api.put(`/gym/memberships/${membershipId}/payment`, payload);
  
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
      
      await api.put(`/gym/memberships/${membershipId}`, payload);
  
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

  // ===== COMMENT FUNCTIONS WITH CATEGORY =====
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const categoryLabel = COMMENT_CATEGORIES[selectedCategory]?.label || 'General';
      const commentWithCategory = `[${categoryLabel}] ${newComment}`;
      
      const response = await api.post(`/gym/members/${memberId}/comments`, { 
        comment: commentWithCategory 
      });
      
      toast.success('Comment added successfully');
      setNewComment('');
      setSelectedCategory('general');
      setComments(prev => [response.data, ...prev]);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const detectCategoryFromComment = (commentText) => {
    if (!commentText) return 'general';
    
    const match = commentText.match(/^\[([^\]]+)\]/);
    if (match) {
      const label = match[1];
      for (const [key, config] of Object.entries(COMMENT_CATEGORIES)) {
        if (config.label === label) {
          return key;
        }
      }
    }
    return 'general';
  };

  const cleanCommentText = (commentText) => {
    if (!commentText) return '';
    const match = commentText.match(/^\[[^\]]+\]\s*/);
    if (match) {
      return commentText.substring(match[0].length);
    }
    return commentText;
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

  const getFilteredComments = () => {
    if (!commentFilter) return comments;
    return comments.filter(comment => {
      const category = detectCategoryFromComment(comment.comment);
      return category === commentFilter;
    });
  };

  const getCommentCounts = () => {
    const counts = { total: comments.length };
    Object.keys(COMMENT_CATEGORIES).forEach(key => {
      counts[key] = comments.filter(c => detectCategoryFromComment(c.comment) === key).length;
    });
    return counts;
  };

  const filteredComments = getFilteredComments();
  const commentCounts = getCommentCounts();

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

  const getFreezeStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-blue-100 text-blue-700', icon: Snowflake },
      expired: { color: 'bg-gray-100 text-gray-500', icon: Clock },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Active'}
      </span>
    );
  };

  // ===== Get payment summary with proper currency conversion =====
  const getPaymentSummary = () => {
    const membership = member?.current_membership;
    if (!membership) return null;
    
    const planPrice = getRupeeValue(membership.plan?.price || 0);
    const discountApplied = getRupeeValue(membership.discount_applied || 0);
    const amountPaid = getRupeeValue(membership.amount_paid || 0);
    const finalPrice = Math.max(0, planPrice - discountApplied);
    const balanceDue = Math.max(0, finalPrice - amountPaid);
    
    let discountPercentage = 0;
    if (planPrice > 0 && discountApplied > 0) {
      discountPercentage = Math.round((discountApplied / planPrice) * 100);
    }
    
    return {
      planPrice,
      discountApplied,
      amountPaid,
      finalPrice,
      balanceDue,
      discountPercentage,
      hasDiscount: discountApplied > 0,
    };
  };

  // ===== Get member status consistently =====
  // Mirrors the Members list page (Members.jsx), which computes:
  //   status: member.is_active ? 'active' : 'inactive'
  // is_active may come back as a boolean or a number (0/1) or a string,
  // depending on the endpoint, so we normalize all "truthy active" forms
  // here — but we do NOT default a missing/undefined/null value to true.
  // A missing value means inactive, same as the list page.
  const getMemberStatus = () => {
    if (!member) return 'inactive';
    const isActive = member.is_active === true || member.is_active === 1 || member.is_active === 'true';
    return isActive ? 'active' : 'inactive';
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
  
  const totalPaid = payments.reduce((sum, p) => sum + getRupeeValue(p.amount || 0), 0);
  
  let balanceDue = 0;
  if (balanceDetails?.balance_due !== undefined) {
    balanceDue = getRupeeValue(balanceDetails.balance_due);
  } else if (currentMembership?.balance_due !== undefined) {
    balanceDue = getRupeeValue(currentMembership.balance_due);
  }
  
  const totalPlanAmount = getRupeeValue(balanceDetails?.total_amount || currentMembership?.plan?.price || 0);

  const profileImageUrl = getImageUrl(member.profile_image, member.full_name);
  const thumbnailImageUrl = getThumbnailUrl(member.profile_image, member.full_name);

  const activeFreeze = freezeHistory.find(f => f.status === 'active');
  const hasActiveFreeze = !!activeFreeze;
  
  // Get consistent member status
  const memberStatus = getMemberStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header with Profile Image Editor */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <ProfileImageEditor 
              member={member}
              memberId={member.id}
              onImageUpdated={handleImageUpdated}
              thumbnailImageUrl={thumbnailImageUrl}
              profileImageUrl={profileImageUrl}
              onImageZoom={() => setIsImageZoomed(true)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 truncate">{member.full_name}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-mono border border-gray-200 flex-shrink-0">
                  <Hash className="h-3 w-3" />
                  {member.id}
                </span>
                {hasActiveFreeze && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 flex-shrink-0">
                    <Snowflake className="h-3 w-3" />
                    Frozen
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Use consistent status badge */}
                {getStatusBadge(memberStatus)}
                {currentMembership && (
                  <span className="text-xs text-gray-500">
                    Member since {formatDate(member.joined_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                fetchMemberDetails();
                fetchComments();
                fetchPayments();
                fetchMembershipHistory();
                fetchAttendanceHistory();
                fetchBalanceDetails();
                fetchPtSessions();
                fetchFreezeHistory();
                fetchMemberAddons();
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <p className="text-sm text-green-600 font-medium">Total Paid</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-green-500 mt-1">Amount actually paid by member</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
              <p className="text-sm text-orange-600 font-medium">Plan Amount</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalPlanAmount)}</p>
              <p className="text-xs text-orange-500 mt-1">Total amount member needs to pay</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Balance Due</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(balanceDue)}</p>
              <p className="text-xs text-blue-500 mt-1">Remaining amount to be paid</p>
            </div>
            <div className={`rounded-xl p-4 border ${hasActiveFreeze ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-sm text-gray-600 font-medium">Freeze Status</p>
              {hasActiveFreeze ? (
                <>
                  <p className="text-lg font-bold text-blue-700 flex items-center gap-2">
                    <Snowflake className="h-5 w-5" />
                    Active Freeze
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {formatDate(activeFreeze.start_date)} - {formatDate(activeFreeze.end_date)}
                  </p>
                  <p className="text-xs text-blue-500">
                    {activeFreeze.freeze_type === 'medical' ? '🏥 Medical' : '📅 Regular'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-500">Not Frozen</p>
                  <p className="text-xs text-gray-400 mt-1">No active freeze</p>
                </>
              )}
            </div>
          </div>

          {/* Discount Banner */}
          {paymentSummary?.hasDiscount && paymentSummary && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Percent className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-900">Discount Applied</p>
                    <p className="text-xs text-purple-600">
                      {formatCurrency(paymentSummary.discountApplied)} discount ({paymentSummary.discountPercentage}% off)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 line-through">{formatCurrency(paymentSummary.planPrice)}</p>
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(paymentSummary.finalPrice)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-wrap justify-end gap-2">
            {currentMembership && !hasActiveFreeze && (
              <button
                onClick={() => setShowFreezeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Snowflake className="h-4 w-4" />
                Freeze Membership
              </button>
            )}

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

          {/* Freeze Modal */}
          {showFreezeModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Snowflake className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Freeze Membership</h3>
                      <p className="text-sm text-gray-500">
                        {member.full_name} • {member.membership || 'No Plan'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowFreezeModal(false);
                      setFreezeStartDate('');
                      setFreezeEndDate('');
                      setFreezeNotes('');
                      setFreezeType('regular');
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleFreezeSubmit} className="p-5 space-y-5">
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                    <img 
                      src={thumbnailImageUrl}
                      alt={member.full_name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-white shadow"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
                      }}
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.phone}</p>
                      <p className="text-xs text-gray-400">
                        Membership: {currentMembership?.plan?.name || 'N/A'} • 
                        Expires: {currentMembership?.end_date ? formatDate(currentMembership.end_date) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Freeze Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFreezeType('regular')}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          freezeType === 'regular'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Calendar className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Regular</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFreezeType('medical')}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          freezeType === 'medical'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Heart className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Medical</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={freezeStartDate}
                        onChange={(e) => setFreezeStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={freezeEndDate}
                        onChange={(e) => setFreezeEndDate(e.target.value)}
                        min={freezeStartDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {freezeStartDate && freezeEndDate && new Date(freezeEndDate) > new Date(freezeStartDate) && (
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Freeze Duration: {(new Date(freezeEndDate) - new Date(freezeStartDate)) / (1000 * 60 * 60 * 24)} days
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Membership will be extended by {(new Date(freezeEndDate) - new Date(freezeStartDate)) / (1000 * 60 * 60 * 24)} days
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={freezeNotes}
                      onChange={(e) => setFreezeNotes(e.target.value)}
                      placeholder="Reason for freeze or additional notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFreezeModal(false);
                        setFreezeStartDate('');
                        setFreezeEndDate('');
                        setFreezeNotes('');
                        setFreezeType('regular');
                      }}
                      disabled={freezing}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={freezing || !freezeStartDate || !freezeEndDate}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {freezing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Snowflake className="h-4 w-4" />
                          Freeze Membership
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Plan:</span>
                      <span className="font-medium ml-2">{currentMembership.plan?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Plan Price:</span>
                      <span className="font-medium ml-2">{formatCurrency(currentMembership.plan?.price || 0)}</span>
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
                    <p className="text-xs text-gray-400 mt-1">Enter discount amount in rupees</p>
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
                    <p className="text-xs text-gray-400 mt-1">Enter amount paid in rupees</p>
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
                
                {(() => {
                  const planPrice = getRupeeValue(currentMembership.plan?.price || 0);
                  const discount = parseFloat(paymentEditData.discount_applied) || 0;
                  const paid = parseFloat(paymentEditData.amount_paid) || 0;
                  const finalPrice = Math.max(0, planPrice - discount);
                  const balance = Math.max(0, finalPrice - paid);
                  const discountPercent = planPrice > 0 && discount > 0 ? Math.round((discount / planPrice) * 100) : 0;
                  
                  return (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Payment Summary</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Plan Price:</span>
                          <span className="font-medium">{formatCurrency(planPrice)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Discount ({discountPercent}%):</span>
                            <span className="font-medium text-red-600">- {formatCurrency(discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-600 font-medium">Final Price:</span>
                          <span className="font-medium text-green-600">{formatCurrency(finalPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount Paid:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(paid)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-700 font-semibold">Balance Due:</span>
                          <span className={`font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(balance)}
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
                          {plan.name} - {formatCurrency(plan.price)} ({plan.duration_days} days)
                        </option>
                      ))}
                    </select>
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
                      {['active', 'inactive', 'expired', 'pending'].map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
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
                            <span className="font-medium ml-2 text-green-600">{formatCurrency(selectedPlan.price)}</span>
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

          {/* Freeze History Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-blue-600" />
              Freeze History
            </h3>
            
            {loadingFreezes ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : freezeHistory.length > 0 ? (
              <div className="space-y-3">
                {freezeHistory.map((freeze) => (
                  <div key={freeze.id} className={`rounded-xl p-4 border ${
                    freeze.status === 'active' 
                      ? 'bg-blue-50 border-blue-200' 
                      : freeze.status === 'cancelled'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          freeze.freeze_type === 'medical' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {freeze.freeze_type === 'medical' ? '🏥 Medical' : '📅 Regular'}
                        </span>
                        {getFreezeStatusBadge(freeze.status)}
                        <span className="text-xs text-gray-400">
                          {freeze.freeze_days} days
                        </span>
                      </div>
                      {freeze.status === 'active' && (
                        <button
                          onClick={() => handleCancelFreeze(freeze.id)}
                          disabled={cancellingFreeze === freeze.id}
                          className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                        >
                          {cancellingFreeze === freeze.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          Cancel Freeze
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Start:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatDate(freeze.start_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">End:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatDate(freeze.end_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Original End:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatDate(freeze.original_end_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">New End:</span>
                        <span className="ml-2 font-medium text-blue-600">{formatDate(freeze.new_end_date)}</span>
                      </div>
                    </div>
                    
                    {freeze.notes && (
                      <p className="text-xs text-gray-500 mt-2">{freeze.notes}</p>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-2">
                      Created: {formatDateTime(freeze.created_at)}
                      {freeze.created_by_name && ` by ${freeze.created_by_name}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-gray-300 mb-2">
                  <Snowflake className="h-10 w-10 mx-auto" />
                </div>
                <p className="text-sm text-gray-400">No freeze history</p>
                <p className="text-xs text-gray-300 mt-1">Freezes will appear here once applied</p>
              </div>
            )}
          </div>

          {/* Member Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
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
                  
                  {paymentSummary && paymentSummary.discountApplied > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount Applied:</span>
                      <span className="font-medium text-red-600">- {formatCurrency(paymentSummary.discountApplied)} ({paymentSummary.discountPercentage}%)</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(currentMembership.amount_paid || 0)}</span>
                  </div>
                  {paymentSummary && paymentSummary.balanceDue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Balance Due:</span>
                      <span className="font-medium text-orange-600">{formatCurrency(paymentSummary.balanceDue)}</span>
                    </div>
                  )}
                  {currentMembership.next_payment_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Payment:</span>
                      <span className="font-medium text-blue-600">{formatDate(currentMembership.next_payment_date)}</span>
                    </div>
                  )}
                  
                  {paymentSummary && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-1">Payment Summary</p>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Plan Price:</span>
                          <span className="text-gray-600">{formatCurrency(paymentSummary.planPrice)}</span>
                        </div>
                        {paymentSummary.discountApplied > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Discount ({paymentSummary.discountPercentage}%):</span>
                            <span className="text-red-500">- {formatCurrency(paymentSummary.discountApplied)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Final Price:</span>
                          <span className="text-gray-800">{formatCurrency(paymentSummary.finalPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Paid:</span>
                          <span className="text-green-600">{formatCurrency(paymentSummary.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-600">Balance:</span>
                          <span className={paymentSummary.balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {formatCurrency(paymentSummary.balanceDue)}
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
                      {[
                        { value: 'aadhar', label: 'Aadhar Card' },
                        { value: 'pan', label: 'PAN Card' },
                        { value: 'dl', label: 'Driving License' },
                        { value: 'passport', label: 'Passport' },
                        { value: 'voter', label: 'Voter ID' },
                      ].map(option => (
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
                        {[
                          { value: 'aadhar', label: 'Aadhar Card' },
                          { value: 'pan', label: 'PAN Card' },
                          { value: 'dl', label: 'Driving License' },
                          { value: 'passport', label: 'Passport' },
                          { value: 'voter', label: 'Voter ID' },
                        ].find(o => o.value === member.id_proof_type)?.label || member.id_proof_type}
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
                          <p className="font-semibold text-purple-700">{formatCurrency(session.total_amount || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Amount Paid:</span>
                          <p className="font-semibold text-green-600">{formatCurrency(session.amount_paid || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Balance Due:</span>
                          <p className={`font-semibold ${(session.balance_due || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(session.balance_due || 0)}
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

          {/* ===== ADD-ONS SECTION ===== */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              Add-Ons
            </h3>
            
            {loadingAddons ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : memberAddons.length > 0 ? (
              <div className="space-y-3">
                {memberAddons.map((addon) => (
                  <div key={addon.id} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">{addon.addon_name}</span>
                      </div>
                      {getAddonStatusBadge(addon.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <span className="ml-2 font-medium text-gray-900 capitalize">{addon.addon_category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-2 font-medium text-purple-700">{formatCurrency(addon.price)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatDate(addon.start_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">End Date:</span>
                        <span className="ml-2 font-medium text-gray-900">{addon.end_date ? formatDate(addon.end_date) : '—'}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-purple-200">
                      <div>
                        <span className="text-gray-500 text-xs">Amount Paid:</span>
                        <p className="font-semibold text-green-600">{formatCurrency(addon.amount_paid || 0)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Balance Due:</span>
                        <p className={`font-semibold ${(addon.balance_due || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(addon.balance_due || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePayAddon(addon)}
                          disabled={addon.balance_due <= 0}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                            addon.balance_due > 0
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay Now
                        </button>
                      </div>
                    </div>
                    
                    {addon.notes && (
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <span className="text-gray-500 text-sm">Notes:</span>
                        <p className="text-sm text-gray-700 mt-1">{addon.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-300 mb-2">
                  <Tag className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-sm text-gray-400">No add-ons assigned</p>
                <p className="text-xs text-gray-300 mt-1">Add-ons will appear here once assigned</p>
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
                        <td className="px-4 py-2 font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-2 capitalize">{payment.payment_method}</td>
                        <td className="px-4 py-2">{getPaymentStatusBadge(payment.status)}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{payment.transaction_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between">
                  <span className="font-medium text-gray-600">Total Paid:</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalPaid)}</span>
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
                        <span className="ml-2 text-green-600">{formatCurrency(membership.amount_paid || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Balance:</span>
                        <span className="ml-2 text-orange-600">{formatCurrency(membership.balance_due || 0)}</span>
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

          {/* Comments Section with Categories */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments & Communication History
                <span className="text-xs font-normal text-gray-400 ml-2">
                  ({comments.length} comments)
                </span>
              </h3>
              {commentFilter && (
                <button
                  onClick={() => setCommentFilter(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear Filter
                </button>
              )}
            </div>

            <CategoryFilter 
              selectedCategory={commentFilter}
              onSelect={setCommentFilter}
              countMap={commentCounts}
            />

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment about this member..."
                  rows={3}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 h-fit flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Tag as:</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      COMMENT_CATEGORIES[selectedCategory]?.color || 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {selectedCategory && COMMENT_CATEGORIES[selectedCategory]?.icon && (
                      <CommentCategoryBadge category={selectedCategory} size="sm" />
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  
                  {showCategoryDropdown && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1">
                      {Object.entries(COMMENT_CATEGORIES).map(([key, config]) => {
                        const Icon = config.icon;
                        const isSelected = selectedCategory === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(key);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                              isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </span>
                            {isSelected && <CheckCircle className="h-3 w-3 text-blue-500 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('general')}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-2">
                  Category: <span className="font-medium">{COMMENT_CATEGORIES[selectedCategory]?.label || 'General'}</span>
                </span>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {loadingComments ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : filteredComments.length > 0 ? (
                filteredComments.map((comment) => {
                  const category = detectCategoryFromComment(comment.comment);
                  const cleanComment = cleanCommentText(comment.comment);
                  const config = COMMENT_CATEGORIES[category] || COMMENT_CATEGORIES.general;
                  const Icon = config.icon;
                  
                  return (
                    <div key={comment.id} className="bg-gray-50 rounded-xl p-4 group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {comment.user_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{comment.user_name || 'Unknown User'}</p>
                            <p className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</p>
                          </div>
                          <CommentCategoryBadge category={category} size="sm" />
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
                      <p className="text-sm text-gray-700 ml-10">{cleanComment}</p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {commentFilter 
                      ? `No comments in "${COMMENT_CATEGORIES[commentFilter]?.label}" category` 
                      : 'No comments yet. Add the first comment!'}
                  </p>
                  {commentFilter && (
                    <button
                      onClick={() => setCommentFilter(null)}
                      className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                    >
                      Show all comments
                    </button>
                  )}
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

        {/* Addon Payment Modal */}
        {showAddonPaymentModal && selectedAddonForPayment && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Pay for Add-On</h3>
                    <p className="text-sm text-gray-500">{selectedAddonForPayment.addon_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddonPaymentModal(false);
                    setSelectedAddonForPayment(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleAddonPaymentSubmit} className="p-5 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Price:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(selectedAddonForPayment.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedAddonForPayment.amount_paid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-700">Balance Due:</span>
                    <span className="text-orange-600">{formatCurrency(selectedAddonForPayment.balance_due)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedAddonForPayment.balance_due}
                    value={addonPaymentAmount}
                    onChange={(e) => setAddonPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Enter amount"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Max: {formatCurrency(selectedAddonForPayment.balance_due)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={addonPaymentMethod}
                    onChange={(e) => setAddonPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={addonPaymentNotes}
                    onChange={(e) => setAddonPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Payment notes"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddonPaymentModal(false);
                      setSelectedAddonForPayment(null);
                    }}
                    disabled={payingAddon}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payingAddon || !addonPaymentAmount || parseFloat(addonPaymentAmount) <= 0}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {payingAddon ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Make Payment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfileModal;