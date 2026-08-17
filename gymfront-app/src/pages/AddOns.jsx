// src/pages/AddOns.jsx - Updated with Search Input for Member Selection

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Edit, Trash2, X, CheckCircle, XCircle,
  RefreshCw, Loader2, Tag, DollarSign, Calendar, Clock,
  Filter, ChevronDown, AlertTriangle, Save, UserPlus,
  CreditCard, FileText, Download, Eye, Package, Users,
  TrendingUp, BarChart3, ArrowUp, ArrowDown, MoreVertical, Phone, Mail,
  User, UserSearch
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ============================================================
// ADD-ON FORM MODAL
// ============================================================
const AddOnFormModal = ({ isOpen, onClose, onSave, addon, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    price: '',
    is_active: true,
    is_recurring: false
  });

  const categories = [
    { value: 'locker', label: 'Locker' },
    { value: 'protein', label: 'Protein' },
    { value: 'towel', label: 'Towel' },
    { value: 'supplement', label: 'Supplement' },
    { value: 'training', label: 'Training' },
    { value: 'parking', label: 'Parking' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (addon) {
      setFormData({
        name: addon.name || '',
        description: addon.description || '',
        category: addon.category || 'other',
        price: addon.price?.toString() || '',
        is_active: addon.is_active !== undefined ? addon.is_active : true,
        is_recurring: addon.is_recurring || false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'other',
        price: '',
        is_active: true,
        is_recurring: false
      });
    }
  }, [addon, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Add-on name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    onSave({
      ...formData,
      price: parseFloat(formData.price)
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {addon ? 'Edit Add-On' : 'Create New Add-On'}
              </h3>
              <p className="text-sm text-gray-500">
                {addon ? 'Update add-on details' : 'Add a new add-on for members'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add-On Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Protein Shake, Locker Rental"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              placeholder="Describe the add-on..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Recurring</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {addon ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// ASSIGN ADD-ON MODAL
// ============================================================
const AssignAddOnModal = ({ isOpen, onClose, onAssign, addons, loading }) => {
  const [formData, setFormData] = useState({
    member_search: '',
    addon_id: '',
    start_date: new Date().toISOString().split('T')[0],
    amount_paid: '0',
    payment_method: 'cash',
    notes: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        start_date: new Date().toISOString().split('T')[0]
      }));
    }
  }, [isOpen]);

  const handleMemberSearch = async (value) => {
    setFormData(prev => ({ ...prev, member_search: value }));
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!value.trim() || value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get(`/gym/members?search=${encodeURIComponent(value.trim())}&limit=10`);
        setSearchResults(response.data || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching members:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setFormData(prev => ({ ...prev, member_search: `${member.full_name} (${member.phone})` }));
    setShowResults(false);
    setSearchResults([]);
  };

  const clearSelectedMember = () => {
    setSelectedMember(null);
    setFormData(prev => ({ ...prev, member_search: '' }));
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedMember) {
      toast.error('Please search and select a member');
      return;
    }
    if (!formData.addon_id) {
      toast.error('Please select an add-on');
      return;
    }

    onAssign({
      member_id: selectedMember.id,
      addon_id: parseInt(formData.addon_id),
      start_date: formData.start_date,
      amount_paid: parseFloat(formData.amount_paid) || 0,
      payment_method: formData.payment_method,
      notes: formData.notes
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'member_search') {
      handleMemberSearch(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const selectedAddon = addons.find(a => a.id.toString() === formData.addon_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Assign Add-On</h3>
              <p className="text-sm text-gray-500">Search and assign an add-on to a member</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Member *
            </label>
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
                <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  name="member_search"
                  value={formData.member_search}
                  onChange={handleChange}
                  placeholder="Search by name, phone, or ID..."
                  className="w-full px-3 py-2 border-0 focus:ring-0 outline-none rounded-lg"
                  autoComplete="off"
                />
                {selectedMember && (
                  <button
                    type="button"
                    onClick={clearSelectedMember}
                    className="mr-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {searching && (
                  <Loader2 className="h-4 w-4 text-gray-400 mr-3 animate-spin" />
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => selectMember(member)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {member.full_name?.charAt(0) || 'M'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.full_name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
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
                          <span className="text-gray-400">ID: #{member.id}</span>
                        </div>
                      </div>
                      <UserPlus className="h-4 w-4 text-green-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              
              {showResults && searchResults.length === 0 && formData.member_search.trim().length >= 2 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center">
                  <p className="text-sm text-gray-500">No members found matching "{formData.member_search}"</p>
                </div>
              )}
            </div>
            {selectedMember && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedMember.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedMember.phone} • ID: #{selectedMember.id}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Search by name, phone number, or member ID</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Add-On *
            </label>
            <select
              name="addon_id"
              value={formData.addon_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              required
            >
              <option value="">Select an add-on</option>
              {addons.filter(a => a.is_active).map(addon => (
                <option key={addon.id} value={addon.id}>
                  {addon.name} - ₹{addon.price} {addon.is_recurring ? '(Monthly)' : '(One-time)'}
                </option>
              ))}
            </select>
          </div>

          {selectedAddon && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Price:</span>
                <span className="font-semibold text-gray-900">₹{selectedAddon.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium">
                  {selectedAddon.is_recurring ? 'Recurring' : 'One-time'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid (₹)
            </label>
            <input
              type="number"
              name="amount_paid"
              value={formData.amount_paid}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Amount already paid for this add-on</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMember}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Assign Add-On
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// PAYMENT MODAL
// ============================================================
const PaymentModal = ({ isOpen, onClose, onPay, memberAddon, loading }) => {
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && memberAddon) {
      setFormData({
        amount: memberAddon.balance_due?.toString() || '',
        payment_method: 'cash',
        notes: ''
      });
    }
  }, [isOpen, memberAddon]);

  if (!isOpen || !memberAddon) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > memberAddon.balance_due) {
      toast.error(`Amount cannot exceed balance due of ₹${memberAddon.balance_due}`);
      return;
    }
    onPay({
      amount,
      payment_method: formData.payment_method,
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Make Payment</h3>
              <p className="text-sm text-gray-500">{memberAddon.addon_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Price:</span>
              <span className="font-medium text-gray-900">₹{memberAddon.price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid:</span>
              <span className="font-medium text-green-600">₹{memberAddon.amount_paid}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
              <span className="text-gray-700">Balance Due:</span>
              <span className="text-orange-600">₹{memberAddon.balance_due}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              min="1"
              max={memberAddon.balance_due}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Payment notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Make Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// MEMBER SEARCH INPUT FOR ASSIGNMENTS VIEW
// ============================================================
const MemberSearchInput = ({ onSelect, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef(null);

  const handleSearch = async (value) => {
    setSearchTerm(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!value.trim() || value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get(`/gym/members?search=${encodeURIComponent(value.trim())}&limit=10`);
        setResults(response.data || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching members:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const selectMember = (member) => {
    setSearchTerm(`${member.full_name} (${member.phone})`);
    setShowResults(false);
    setResults([]);
    if (onSelect) onSelect(member);
  };

  return (
    <div className="relative">
      <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
        <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder || "Search by name, phone, or ID..."}
          className="w-full px-3 py-2 border-0 focus:ring-0 outline-none rounded-lg"
          autoComplete="off"
        />
        {loading && <Loader2 className="h-4 w-4 text-gray-400 mr-3 animate-spin" />}
      </div>
      
      {showResults && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => selectMember(member)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {member.full_name?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{member.full_name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {member.phone}
                  </span>
                  <span className="text-gray-400">ID: #{member.id}</span>
                </div>
              </div>
              <User className="h-4 w-4 text-purple-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
      
      {showResults && results.length === 0 && searchTerm.trim().length >= 2 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center">
          <p className="text-sm text-gray-500">No members found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN ADD-ONS PAGE
// ============================================================
const AddOns = () => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedMemberAddon, setSelectedMemberAddon] = useState(null);
  const [memberAddons, setMemberAddons] = useState({});
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [viewMode, setViewMode] = useState('catalog');

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gym/addons');
      setAddons(response.data || []);
    } catch (error) {
      console.error('Error fetching add-ons:', error);
      toast.error('Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/gym/addons/categories');
      const categoryList = response.data || [];
      setCategories(categoryList.filter(cat => typeof cat === 'string'));
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get('/gym/members?limit=100');
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/gym/addons/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchMemberAddons = async (memberId) => {
    try {
      const response = await api.get(`/gym/addons/members/${memberId}`);
      setMemberAddons(prev => ({ ...prev, [memberId]: response.data || [] }));
    } catch (error) {
      console.error('Error fetching member add-ons:', error);
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setSelectedMemberId(member.id);
    fetchMemberAddons(member.id);
  };

  const handleCreateAddon = async (data) => {
    try {
      await api.post('/gym/addons', data);
      toast.success('Add-on created successfully!');
      setShowAddModal(false);
      fetchAddons();
      fetchSummary();
    } catch (error) {
      console.error('Error creating add-on:', error);
      toast.error(error.response?.data?.detail || 'Failed to create add-on');
    }
  };

  const handleUpdateAddon = async (data) => {
    if (!editingAddon) return;
    try {
      await api.put(`/gym/addons/${editingAddon.id}`, data);
      toast.success('Add-on updated successfully!');
      setShowAddModal(false);
      setEditingAddon(null);
      fetchAddons();
      fetchSummary();
    } catch (error) {
      console.error('Error updating add-on:', error);
      toast.error(error.response?.data?.detail || 'Failed to update add-on');
    }
  };

  const handleDeleteAddon = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await api.delete(`/gym/addons/${id}`);
      toast.success('Add-on deleted successfully!');
      fetchAddons();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting add-on:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete add-on');
    }
  };

  const handleAssignAddon = async (data) => {
    try {
      await api.post(`/gym/addons/members/${data.member_id}/assign`, data);
      toast.success('Add-on assigned successfully!');
      setShowAssignModal(false);
      fetchSummary();
      if (selectedMemberId) {
        fetchMemberAddons(selectedMemberId);
      }
    } catch (error) {
      console.error('Error assigning add-on:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign add-on');
    }
  };

  const handlePayment = async (data) => {
    if (!selectedMemberAddon) return;
    try {
      await api.post(
        `/gym/addons/members/${selectedMemberAddon.member_id}/addons/${selectedMemberAddon.id}/pay`,
        data
      );
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedMemberAddon(null);
      if (selectedMemberId) {
        fetchMemberAddons(selectedMemberId);
      }
      fetchSummary();
    } catch (error) {
      console.error('Error making payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to make payment');
    }
  };

  useEffect(() => {
    fetchAddons();
    fetchCategories();
    fetchMembers();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchMemberAddons(selectedMemberId);
    }
  }, [selectedMemberId]);

  const filteredAddons = addons.filter(addon => {
    const matchesSearch = addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (addon.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || addon.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category) => {
    const labels = {
      locker: 'Locker',
      protein: 'Protein',
      towel: 'Towel',
      supplement: 'Supplement',
      training: 'Training',
      parking: 'Parking',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const safeCategories = categories.filter(cat => typeof cat === 'string');

  return (
    <div className="p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Total Add-Ons</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.total_addons || 0}</p>
          <p className="text-xs text-green-600 mt-1">{summary?.active_addons || 0} active</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Active Assignments</p>
          <p className="text-2xl font-bold text-purple-600">{summary?.active_assignments || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Total: {summary?.total_assignments || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.total_revenue || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">From add-on payments</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Popular Add-On</p>
          <p className="text-lg font-bold text-blue-600 truncate">
            {summary?.popular_addons?.[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {summary?.popular_addons?.[0]?.count || 0} assignments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setViewMode('catalog');
            setSelectedMember(null);
            setSelectedMemberId(null);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'catalog'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Package className="h-4 w-4 inline mr-2" />
          Add-On Catalog
        </button>
        <button
          onClick={() => {
            setViewMode('assignments');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'assignments'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Member Assignments
        </button>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'catalog' ? "Search add-ons..." : "Search members..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
            {viewMode === 'catalog' && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="all">All Categories</option>
                {safeCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            )}
            {viewMode === 'assignments' && (
              <MemberSearchInput 
                onSelect={handleMemberSelect}
                placeholder="Search member by name, phone, or ID..."
              />
            )}
            <button
              onClick={() => {
                fetchAddons();
                fetchSummary();
                if (selectedMemberId) fetchMemberAddons(selectedMemberId);
              }}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-shrink-0"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Assign to Member
            </button>
            <button
              onClick={() => { setEditingAddon(null); setShowAddModal(true); }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Add-On
            </button>
          </div>
        </div>
      </div>

      {/* Catalog View */}
      {viewMode === 'catalog' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
                    </td>
                  </tr>
                ) : filteredAddons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      {searchTerm || categoryFilter !== 'all' ? 'No add-ons match your filters' : 'No add-ons created yet'}
                    </td>
                  </tr>
                ) : (
                  filteredAddons.map((addon) => (
                    <tr key={addon.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{addon.name}</div>
                          {addon.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{addon.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {getCategoryLabel(addon.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(addon.price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${addon.is_recurring ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {addon.is_recurring ? 'Recurring' : 'One-time'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {addon.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => { setEditingAddon(addon); setShowAddModal(true); }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddon(addon.id, addon.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignments View - Updated with Member Search */}
      {viewMode === 'assignments' && selectedMemberId && selectedMember && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {selectedMember?.full_name?.charAt(0) || 'M'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {selectedMember?.full_name || 'Member'}
                </h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedMember?.phone || 'No phone'}
                  </span>
                  {selectedMember?.email && (
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedMember?.email}
                    </span>
                  )}
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    ID: #{selectedMember?.id}
                  </span>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined: {selectedMember?.joined_date ? new Date(selectedMember.joined_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="ml-auto">
                <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  {(memberAddons[selectedMemberId] || []).filter(a => a.status === 'active').length} Active Add-Ons
                </span>
              </div>
            </div>
          </div>
          
          {/* Add-On Summary for Member */}
          {(() => {
            const memberAddonsList = memberAddons[selectedMemberId] || [];
            const totalPrice = memberAddonsList.reduce((sum, a) => sum + a.price, 0);
            const totalPaid = memberAddonsList.reduce((sum, a) => sum + a.amount_paid, 0);
            const totalBalance = memberAddonsList.reduce((sum, a) => sum + a.balance_due, 0);
            
            return (
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 border-b">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total Price</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPrice)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total Balance</p>
                  <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </div>
            );
          })()}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Add-On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(memberAddons[selectedMemberId] || []).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      No add-ons assigned to this member
                    </td>
                  </tr>
                ) : (
                  (memberAddons[selectedMemberId] || []).map((ma) => (
                    <tr key={ma.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{ma.addon_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {getCategoryLabel(ma.addon_category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(ma.price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-green-600">{formatCurrency(ma.amount_paid)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${ma.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(ma.balance_due)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ma.status === 'active' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : ma.status === 'expired' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500">
                          <div>Start: {new Date(ma.start_date).toLocaleDateString()}</div>
                          {ma.end_date && <div>End: {new Date(ma.end_date).toLocaleDateString()}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {ma.balance_due > 0 && ma.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedMemberAddon(ma);
                              setShowPaymentModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="Make Payment"
                          >
                            <CreditCard className="h-4 w-4 inline mr-1" />
                            Pay
                          </button>
                        )}
                        {ma.balance_due === 0 && ma.status === 'active' && (
                          <span className="text-xs text-green-600 px-2 py-1 rounded bg-green-50">
                            <CheckCircle className="h-3 w-3 inline mr-1" />
                            Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'assignments' && !selectedMemberId && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <UserSearch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Search for a member</h3>
          <p className="text-sm text-gray-400">Type a member's name, phone number, or ID in the search box above</p>
        </div>
      )}

      {/* Modals */}
      <AddOnFormModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingAddon(null); }}
        onSave={editingAddon ? handleUpdateAddon : handleCreateAddon}
        addon={editingAddon}
        loading={loading}
      />

      <AssignAddOnModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssignAddon}
        addons={addons}
        loading={loading}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setSelectedMemberAddon(null); }}
        onPay={handlePayment}
        memberAddon={selectedMemberAddon}
        loading={loading}
      />
    </div>
  );
};

export default AddOns;