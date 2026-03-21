import React, { useState } from 'react';
import { 
  X, User, Mail, Phone, Key, Briefcase, Building2, 
  AlertCircle, CheckCircle, Loader2, Eye, EyeOff , UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const StaffUserSetup = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    password: 'Staff@123',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: success

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.length < 3) {
      newErrors.full_name = 'Name must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s\-]{7,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number (e.g. +91-9876543210)';
    }
    
    if (!formData.position) {
      newErrors.position = 'Position is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('Step 1: Creating user account...');
      
      // First, create the user account
      const userPayload = {
        email: formData.email,
        username: formData.email.split('@')[0],
        full_name: formData.full_name,
        password: formData.password,
        phone: formData.phone,
        role: 'gym_staff',
        gym_id: null
      };

      console.log('User payload:', userPayload);
      
      const userResponse = await api.post('/signup', userPayload);
      console.log('User created:', userResponse.data);

      if (!userResponse.data || !userResponse.data.id) {
        throw new Error('Failed to create user account - no ID returned');
      }

      console.log('Step 2: Creating staff record...');
      
      // Then create the staff record
      const staffPayload = {
        user_id: userResponse.data.id,
        position: formData.position,
        hire_date: new Date().toISOString().split('T')[0],
        salary: null,
        specializations: null
      };

      console.log('Staff payload:', staffPayload);
      
      const staffResponse = await api.post('/gym/staff', staffPayload);
      console.log('Staff created:', staffResponse.data);
      
      // Success! Move to success step
      setStep(2);
      
      toast.success(
        <div className="flex flex-col gap-2">
          <p className="font-bold text-green-600">✓ Staff Member Added Successfully!</p>
          <p className="text-sm">Name: {formData.full_name}</p>
          <p className="text-sm">Position: {formData.position}</p>
        </div>,
        { duration: 5000 }
      );

      // Show credentials in a separate toast
      toast.success(
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="font-bold text-blue-800 mb-2">🔐 Staff Login Credentials</p>
          <p className="text-sm text-blue-700">Email: {formData.email}</p>
          <p className="text-sm text-blue-700">Password: {formData.password}</p>
          <p className="text-xs text-blue-600 mt-2">Please share these credentials securely with the staff member.</p>
        </div>,
        { duration: 10000, icon: '🔑' }
      );

      // Call onSuccess after a delay
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset form after closing
        setFormData({
          full_name: '',
          email: '',
          phone: '',
          position: '',
          password: 'Staff@123',
        });
        setStep(1);
      }, 2000);

    } catch (error) {
      console.error('Error adding staff:', error);
      
      // Detailed error handling
      let errorMessage = 'Failed to add staff member';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        if (error.response.status === 422) {
          errorMessage = 'Validation error: Please check all fields are correct';
          // Show detailed validation errors
          if (error.response.data.detail) {
            const details = error.response.data.detail;
            if (Array.isArray(details)) {
              details.forEach(err => {
                toast.error(`${err.loc.join('.')}: ${err.msg}`);
              });
            } else {
              toast.error(details);
            }
          }
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.detail || 'Bad request';
        } else if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please login again.';
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to add staff';
        } else if (error.response.status === 404) {
          errorMessage = 'Service not found. Please try again.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        errorMessage = error.response.data?.detail || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const positions = [
    { value: 'Trainer', label: 'Trainer', icon: '💪' },
    { value: 'Personal Trainer', label: 'Personal Trainer', icon: '🏋️' },
    { value: 'Yoga Instructor', label: 'Yoga Instructor', icon: '🧘' },
    { value: 'Group Fitness Instructor', label: 'Group Fitness Instructor', icon: '👥' },
    { value: 'Manager', label: 'Manager', icon: '👔' },
    { value: 'Receptionist', label: 'Receptionist', icon: '📞' },
    { value: 'Cleanliness Staff', label: 'Cleanliness Staff', icon: '🧹' },
    { value: 'Nutritionist', label: 'Nutritionist', icon: '🥗' },
    { value: 'Physiotherapist', label: 'Physiotherapist', icon: '🩺' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {step === 1 ? (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Staff Member
                </h2>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-2">
                Create a new staff account and assign them to your gym
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      errors.full_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
                {errors.full_name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="staff@gym.com"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onKeyDown={(e) => {
                      const nav = new Set(['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']);
                      if (!e.ctrlKey && !e.metaKey && !nav.has(e.key) && !/^[0-9+\- ]$/.test(e.key)) e.preventDefault();
                    }}
                    maxLength={15}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="+91 98765 43210"
                    disabled={loading}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Position <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none bg-white ${
                      errors.position ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select Position</option>
                    {positions.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.icon} {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.position && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.position}
                  </p>
                )}
              </div>

              {/* Password (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Default Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    readOnly
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="space-y-3">
                {/* Gym Association */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-800 text-sm">Gym Association</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Staff will be automatically linked to your gym and will have access to manage members and operations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Key className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-yellow-800 text-sm">Login Credentials</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Default password: <strong>Staff@123</strong>
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Staff can change their password after first login. Please share these credentials securely.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding Staff...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add Staff Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Success Step */
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Staff Added Successfully!</h3>
            <p className="text-gray-600 mb-4">
              {formData.full_name} has been added as {formData.position}
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-left mb-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Login Credentials:</p>
              <p className="text-sm text-blue-700">Email: {formData.email}</p>
              <p className="text-sm text-blue-700">Password: {formData.password}</p>
            </div>
            <p className="text-xs text-gray-500">
              Redirecting to staff list...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffUserSetup;