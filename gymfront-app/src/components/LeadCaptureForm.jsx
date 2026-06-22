// src/pages/LeadCaptureForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, Calendar, DollarSign, 
  MessageCircle, Send, CheckCircle, 
  Dumbbell, Heart, Target, Flame, Clock, Award,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.gymmonitor.in';

const LeadCaptureForm = () => {
  const { gymSlug } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [gymName, setGymName] = useState('Gym');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    interest: '',
    preferred_plan: '',
    budget: '',
    message: '',
  });

  const [errors, setErrors] = useState({});

  // Debug logging
  useEffect(() => {
    console.log('LeadCaptureForm mounted with gymSlug:', gymSlug);
    // Try to fetch gym info
    const fetchGymInfo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/gym/public/gym-info/${gymSlug}`);
        if (response.data && response.data.name) {
          setGymName(response.data.name);
        }
      } catch (error) {
        console.log('Could not fetch gym info, using default');
      }
    };
    if (gymSlug) {
      fetchGymInfo();
    }
  }, [gymSlug]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^[+]?[\d\s\-]{7,15}$/.test(formData.phone)) newErrors.phone = 'Enter a valid phone number';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email';
    if (formData.age && (formData.age < 10 || formData.age > 100)) newErrors.age = 'Age must be between 10 and 100';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    if (!validateForm()) return;
    if (!gymSlug) {
      toast.error('Invalid form link. Please contact the gym directly.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        interest: formData.interest || null,
        preferred_plan: formData.preferred_plan || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        message: formData.message || null,
      };
      
      console.log('Submitting lead to:', `${API_BASE_URL}/gym/public/lead-capture/${gymSlug}`);
      console.log('Payload:', payload);
      
      const response = await axios.post(
        `${API_BASE_URL}/gym/public/lead-capture/${gymSlug}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header for public endpoint
          }
        }
      );
      
      console.log('Response:', response.data);
      
      if (response.data.success) {
        setSubmitted(true);
        toast.success('Thank you! We will contact you soon.');
      } else {
        throw new Error(response.data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      let errorMsg = 'Failed to submit. Please try again.';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Status:', error.response.status);
        
        if (error.response.status === 404) {
          errorMsg = 'Invalid gym link. Please contact the gym directly.';
        } else if (error.response.status === 400) {
          errorMsg = error.response.data.detail || 'Invalid form data. Please check your inputs.';
        } else if (error.response.status === 403) {
          errorMsg = 'This gym is not accepting new leads at the moment.';
        } else if (error.response.data?.detail) {
          errorMsg = error.response.data.detail;
        } else if (error.response.data?.message) {
          errorMsg = error.response.data.message;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your inquiry has been submitted successfully to <strong>{gymName}</strong>.
            Their team will get back to you within 24 hours.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const interests = [
    'Weight Loss', 'Muscle Gain', 'General Fitness', 'Yoga', 
    'Zumba', 'CrossFit', 'HIIT', 'Cardio', 'Strength Training'
  ];

  const plans = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join {gymName}
          </h1>
          <p className="text-gray-600">
            Start your fitness journey today! Fill out the form and we'll get back to you.
          </p>
        </div>

        {/* Error Display */}
        {formError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Submission Error</p>
                <p className="text-red-600 text-sm">{formError}</p>
                {formError.includes('Invalid gym link') && (
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Membership Inquiry</h2>
            <p className="text-blue-100 text-sm">Get a free consultation and trial session</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition ${
                    errors.full_name ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition ${
                    errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="+91 98765 43210"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Age & Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="25"
                    min="10"
                    max="100"
                  />
                </div>
                {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Interest */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What's your fitness goal?
              </label>
              <select
                name="interest"
                value={formData.interest}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Select your interest</option>
                {interests.map(interest => (
                  <option key={interest} value={interest}>{interest}</option>
                ))}
              </select>
            </div>

            {/* Preferred Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Membership Plan
              </label>
              <select
                name="preferred_plan"
                value={formData.preferred_plan}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Select a plan</option>
                {plans.map(plan => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Budget (₹)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="2000"
                  min="0"
                  step="500"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Message (Optional)
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                  placeholder="Any specific requirements or questions?"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {loading ? 'Submitting...' : 'Submit Inquiry'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By submitting, you agree to our terms and privacy policy.
              We'll contact you within 24 hours.
            </p>
          </form>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Modern Equipment</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Expert Trainers</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Flexible Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Award className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Best Price</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureForm;