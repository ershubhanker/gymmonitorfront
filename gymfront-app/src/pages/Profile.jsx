import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, Key, Save, Camera, Building2, 
  MapPin, Clock, Users, CreditCard, AlertCircle,
  CheckCircle, Loader2, IndianRupee
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { symbol: '₹', label: 'Indian Rupee', code: 'INR', flag: '🇮🇳' },
  { symbol: '$', label: 'US Dollar', code: 'USD', flag: '🇺🇸' },
  { symbol: '€', label: 'Euro', code: 'EUR', flag: '🇪🇺' },
  { symbol: '£', label: 'British Pound', code: 'GBP', flag: '🇬🇧' },
  { symbol: '¥', label: 'Japanese Yen', code: 'JPY', flag: '🇯🇵' },
  { symbol: '₩', label: 'South Korean Won', code: 'KRW', flag: '🇰🇷' },
  { symbol: 'A$', label: 'Australian Dollar', code: 'AUD', flag: '🇦🇺' },
  { symbol: 'C$', label: 'Canadian Dollar', code: 'CAD', flag: '🇨🇦' },
  { symbol: 'CHF', label: 'Swiss Franc', code: 'CHF', flag: '🇨🇭' },
  { symbol: 'AED', label: 'UAE Dirham', code: 'AED', flag: '🇦🇪' },
  { symbol: 'SGD', label: 'Singapore Dollar', code: 'SGD', flag: '🇸🇬' },
  { symbol: 'R', label: 'South African Rand', code: 'ZAR', flag: '🇿🇦' },
];

const Profile = () => {
  const { user, logout, updateCurrencySymbol } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency_symbol || '₹');
  const [currencySaving, setCurrencySaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    username: user?.username || '',
    phone: user?.phone || '',
  });

  const [gymForm, setGymForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    max_members: 100,
    max_staff: 5,
    opening_time: '06:00',
    closing_time: '22:00',
    description: '',
  });

  const [gymData, setGymData] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Fetch gym details when component mounts
  useEffect(() => {
    if (user?.role === 'gym_owner') {
      fetchGymDetails();
    }
  }, [user]);

  const fetchGymDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gym/my-gym');
      setGymData(response.data);
      setGymForm({
        name: response.data.name || '',
        address: response.data.address || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        max_members: response.data.max_members || 100,
        max_staff: response.data.max_staff || 5,
        opening_time: response.data.opening_time || '06:00',
        closing_time: response.data.closing_time || '22:00',
        description: response.data.description || '',
      });
    } catch (error) {
      if (error.response?.status === 404) {
        // No gym found, that's ok - user will create one
        console.log('No gym found, will create one on save');
      } else {
        console.error('Error fetching gym details:', error);
        toast.error('Failed to load gym details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/me', profileForm);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleGymSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (gymData) {
        // Update existing gym
        const response = await api.put('/gym/my-gym', gymForm);
        setGymData(response.data);
        toast.success('Gym details updated successfully!');
      } else {
        // Create new gym
        const response = await api.post('/gym/setup', gymForm);
        setGymData(response.data);
        toast.success('Gym setup completed successfully!');
      }
    } catch (error) {
      console.error('Error saving gym details:', error);
      toast.error(error.response?.data?.detail || 'Failed to save gym details');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.post('/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed! Please log in again.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => logout(), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    const map = {
      super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
      gym_owner: { label: 'Gym Owner', color: 'bg-blue-100 text-blue-800' },
      gym_staff: { label: 'Staff', color: 'bg-green-100 text-green-800' },
      member: { label: 'Member', color: 'bg-gray-100 text-gray-800' },
    };
    const cfg = map[role] || map.member;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
        <Shield className="h-3 w-3 mr-1" />
        {cfg.label}
      </span>
    );
  };

  const getSubscriptionBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.inactive}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User, roles: ['super_admin', 'gym_owner', 'gym_staff'] },
    { id: 'gym', label: 'Gym Info', icon: Building2, roles: ['gym_owner'] },
    { id: 'preferences', label: 'Preferences', icon: IndianRupee, roles: ['super_admin', 'gym_owner', 'gym_staff'] },
    { id: 'security', label: 'Security', icon: Key, roles: ['super_admin', 'gym_owner', 'gym_staff'] },
  ];

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => tab.roles.includes(user?.role));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading gym details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* Avatar and Role Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 bg-white border border-gray-200 p-1.5 rounded-full shadow hover:bg-gray-50">
            <Camera className="h-3.5 w-3.5 text-gray-600" />
          </button>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{user?.full_name || user?.username}</h2>
          <p className="text-gray-500 text-sm mb-2">{user?.email}</p>
          <div className="flex items-center gap-2">
            {getRoleBadge(user?.role)}
            {user?.gymId && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="h-3 w-3" /> Gym #{user.gymId}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            {visibleTabs.map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your full name" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                    <input 
                      type="text" 
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="username" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="email" 
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="you@example.com" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="tel" 
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+91 00000 00000" 
                    />
                  </div>
                </div>
              </div>

              {/* Read-only info */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Account Info</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Role:</span>
                    <span className="ml-2 text-gray-800 capitalize">{(user?.role || '').replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Verified:</span>
                    <span className={`ml-2 font-medium ${user?.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {user?.is_verified ? 'Yes' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Member since:</span>
                    <span className="ml-2 text-gray-800">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Gym Info Tab */}
          {activeTab === 'gym' && (
            <form onSubmit={handleGymSave} className="space-y-6">
              {/* Gym Status Card */}
              {gymData && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">Gym Status</p>
                        <p className="text-sm text-blue-700">Your gym is active and running</p>
                      </div>
                    </div>
                    {getSubscriptionBadge(gymData.subscription_status)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    Gym Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={gymForm.name}
                    onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Fitness Hub Gym"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Gym Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={gymForm.email}
                    onChange={(e) => setGymForm({ ...gymForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="gym@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Gym Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={gymForm.phone}
                    onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Gym Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={gymForm.address}
                    onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                    required
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full address of your gym"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={gymForm.opening_time}
                    onChange={(e) => setGymForm({ ...gymForm, opening_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={gymForm.closing_time}
                    onChange={(e) => setGymForm({ ...gymForm, closing_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="h-4 w-4 inline mr-1" />
                    Maximum Members
                  </label>
                  <input
                    type="number"
                    value={gymForm.max_members}
                    onChange={(e) => setGymForm({ ...gymForm, max_members: parseInt(e.target.value) })}
                    min="1"
                    max="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Based on your subscription plan</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="h-4 w-4 inline mr-1" />
                    Maximum Staff
                  </label>
                  <input
                    type="number"
                    value={gymForm.max_staff}
                    onChange={(e) => setGymForm({ ...gymForm, max_staff: parseInt(e.target.value) })}
                    min="1"
                    max="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Based on your subscription plan</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gym Description
                  </label>
                  <textarea
                    value={gymForm.description}
                    onChange={(e) => setGymForm({ ...gymForm, description: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell members about your gym, facilities, equipment, etc."
                  />
                </div>
              </div>

              {/* Subscription Info Card */}
              {gymData && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Subscription Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-purple-700">Plan:</span>
                      <span className="ml-2 font-medium text-purple-900 capitalize">
                        {gymData.subscription_plan}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700">Status:</span>
                      <span className="ml-2">
                        {getSubscriptionBadge(gymData.subscription_status)}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700">Member Limit:</span>
                      <span className="ml-2 font-medium text-purple-900">
                        {gymData.max_members} members
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : (gymData ? 'Update Gym Details' : 'Complete Gym Setup')}
                </button>
              </div>
            </form>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-2xl">
              {/* Header */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-blue-600" />
                  Currency Display Preference
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Choose the currency symbol shown across your dashboard — revenue cards, payments, and all financial figures.
                </p>
              </div>

              {/* Current setting banner */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <span className="text-2xl">
                  {CURRENCIES.find(c => c.symbol === (user?.currency_symbol || '₹'))?.flag || '💰'}
                </span>
                <div>
                  <p className="text-sm font-medium text-blue-900">Current setting</p>
                  <p className="text-blue-700 font-bold">
                    {user?.currency_symbol || '₹'} —{' '}
                    {CURRENCIES.find(c => c.symbol === (user?.currency_symbol || '₹'))?.label || 'Indian Rupee'}
                  </p>
                </div>
              </div>

              {/* Currency grid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Currency</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.symbol}
                      type="button"
                      onClick={() => setSelectedCurrency(c.symbol)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selectedCurrency === c.symbol
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{c.flag}</span>
                      <div className="min-w-0">
                        <div className={`font-bold text-base leading-none ${selectedCurrency === c.symbol ? 'text-blue-700' : 'text-gray-800'}`}>
                          {c.symbol}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{c.label}</div>
                        <div className="text-xs text-gray-400">{c.code}</div>
                      </div>
                      {selectedCurrency === c.symbol && (
                        <CheckCircle className="h-4 w-4 text-blue-500 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preview</p>
                <div className="flex gap-4 flex-wrap">
                  {[1250, 24500, 128000].map(amt => (
                    <div key={amt} className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-100">
                      <span className="text-lg font-bold text-gray-800">
                        {selectedCurrency} {amt.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end pt-2 border-t">
                <button
                  type="button"
                  disabled={currencySaving || selectedCurrency === user?.currency_symbol}
                  onClick={async () => {
                    setCurrencySaving(true);
                    await updateCurrencySymbol(selectedCurrency);
                    setCurrencySaving(false);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {currencySaving ? 'Saving...' : selectedCurrency === user?.currency_symbol ? 'Already Saved' : 'Save Currency Preference'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <p className="text-sm text-gray-500 mb-4">
                After changing your password you will be logged out and need to sign in again.
              </p>
              {[
                { key: 'current_password', label: 'Current Password' },
                { key: 'new_password', label: 'New Password' },
                { key: 'confirm_password', label: 'Confirm New Password' },
              ].map(({ key, label }) => (
                <div key={key} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="password" 
                      value={passwordForm[key]}
                      onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••" 
                      required 
                      minLength={key !== 'current_password' ? 6 : undefined} 
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors">
                  <Key className="h-4 w-4" />
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;