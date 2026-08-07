// src/components/addons/AddonManager.jsx - Updated with payment functionality

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Edit, Trash2, Loader2, CheckCircle, XCircle,
  DollarSign, Calendar, Tag, CreditCard, Wallet, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AddonManager = ({ isOpen, onClose, onAddonAssigned, memberId }) => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [addonPayments, setAddonPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // ===== ASSIGN (with optional initial payment) STATE =====
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignAmount, setAssignAmount] = useState('');
  const [assignMethod, setAssignMethod] = useState('cash');
  const [assigning, setAssigning] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    price: '',
    is_active: true,
    is_recurring: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchAddons = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Pass memberId so the backend can attach this member's
      // member_addon_id / amount_paid / balance_due / status to each addon.
      // Without this, the UI can never tell an addon is already assigned,
      // so "Pay Now" never appears and no addon payment can ever be recorded.
      const response = await api.get('/gym/addons', {
        params: memberId ? { member_id: memberId } : {}
      });
      setAddons(response.data || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
      toast.error('Failed to load addons');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const fetchAddonPayments = useCallback(async (addonId) => {
    if (!memberId || !addonId) return;
    setLoadingPayments(true);
    try {
      const response = await api.get(`/gym/members/${memberId}/addons/${addonId}/payments`);
      setAddonPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching addon payments:', error);
      setAddonPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (isOpen) {
      fetchAddons();
    }
  }, [isOpen, memberId, fetchAddons]);

  const handleCreateAddon = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Addon name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        is_recurring: formData.is_recurring,
      };
      
      if (editingAddon) {
        await api.put(`/gym/addons/${editingAddon.id}`, payload);
        toast.success('Addon updated successfully');
      } else {
        await api.post('/gym/addons', payload);
        toast.success('Addon created successfully');
      }
      
      setShowCreateModal(false);
      setEditingAddon(null);
      setFormData({
        name: '',
        description: '',
        category: 'other',
        price: '',
        is_active: true,
        is_recurring: false,
      });
      fetchAddons();
      if (onAddonAssigned) onAddonAssigned();
    } catch (error) {
      console.error('Error saving addon:', error);
      toast.error(error.response?.data?.detail || 'Failed to save addon');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddon = async (addon) => {
    if (!window.confirm(`Are you sure you want to delete "${addon.name}"?`)) return;
    
    try {
      await api.delete(`/gym/addons/${addon.id}`);
      toast.success('Addon deleted successfully');
      fetchAddons();
      if (onAddonAssigned) onAddonAssigned();
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete addon');
    }
  };

  // ✅ Opens a small dialog to collect how much (if anything) was paid right
  // now, instead of silently assigning with amount_paid: 0. That silent 0
  // is why paid add-ons never used to show up on the Payments page — no
  // Payment record was ever created for the assignment.
  const handleAssignAddon = (addon) => {
    if (!memberId) {
      toast.error('No member selected');
      return;
    }
    setAssignTarget(addon);
    setAssignAmount(addon.price != null ? String(addon.price) : '');
    setAssignMethod('cash');
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!assignTarget || !memberId) return;

    const amount = assignAmount === '' ? 0 : parseFloat(assignAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > assignTarget.price) {
      toast.error(`Amount cannot exceed the add-on price of ₹${assignTarget.price}`);
      return;
    }

    setAssigning(true);
    try {
      await api.post(`/gym/members/${memberId}/addons`, {
        addon_id: assignTarget.id,
        start_date: new Date().toISOString().split('T')[0],
        amount_paid: amount,
        payment_method: assignMethod,
        notes: 'Assigned from Addon Manager'
      });
      toast.success(
        amount > 0
          ? `Addon "${assignTarget.name}" assigned and ₹${amount} payment recorded`
          : `Addon "${assignTarget.name}" assigned to member`
      );
      setShowAssignModal(false);
      setAssignTarget(null);
      fetchAddons();
      if (onAddonAssigned) onAddonAssigned();
    } catch (error) {
      console.error('Error assigning addon:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign addon');
    } finally {
      setAssigning(false);
    }
  };

  // ===== PAYMENT FUNCTIONS =====
  // ✅ IMPORTANT: `addon.id` here is the catalog Addon's id. The pay/
  // payment-history endpoints instead key off the *member's* assignment
  // record, i.e. `addon.member_addon_id`. Using addon.id would 404 (or
  // silently hit the wrong record), which was the second reason payments
  // never made it to the Payments page.
  const handleOpenPaymentModal = async (addon) => {
    if (!addon.member_addon_id) {
      toast.error('This add-on has not been assigned to the member yet');
      return;
    }
    setSelectedAddon(addon);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
    setAddonPayments([]);
    await fetchAddonPayments(addon.member_addon_id);
    setShowPaymentModal(true);
  };

  const handleMakePayment = async () => {
    if (!selectedAddon || !selectedAddon.member_addon_id) return;
    
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (amount > selectedAddon.balance_due) {
      toast.error(`Amount cannot exceed balance due of ₹${selectedAddon.balance_due}`);
      return;
    }
    
    setPaying(true);
    try {
      const response = await api.post(
        `/gym/members/${memberId}/addons/${selectedAddon.member_addon_id}/pay`,
        {
          amount: amount,
          payment_method: paymentMethod,
          notes: paymentNotes
        }
      );
      
      toast.success(response.data.message);
      
      // Refresh addon data (fetches fresh member_addon_id/amount_paid/balance_due)
      fetchAddons();
      if (onAddonAssigned) onAddonAssigned();
      
      // Refresh payments
      await fetchAddonPayments(selectedAddon.member_addon_id);
      
      // Update selected addon balance
      setSelectedAddon(prev => ({
        ...prev,
        amount_paid: (prev.amount_paid || 0) + amount,
        balance_due: (prev.balance_due || 0) - amount
      }));
      
      setPaymentAmount('');
      setPaymentNotes('');
      
    } catch (error) {
      console.error('Error making payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to make payment');
    } finally {
      setPaying(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      locker: '🔒',
      protein: '💪',
      towel: '🧺',
      supplement: '🧪',
      training: '🏋️',
      parking: '🅿️',
      other: '📦'
    };
    return icons[category] || '📦';
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      expired: { color: 'bg-yellow-100 text-yellow-700', icon: XCircle },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
        <Icon className="h-3 w-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Active'}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                Add-On Manager
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {memberId ? 'Manage addons for this member' : 'Manage gym addons'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {/* Add New Addon Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setEditingAddon(null);
                  setFormData({
                    name: '',
                    description: '',
                    category: 'other',
                    price: '',
                    is_active: true,
                    is_recurring: false,
                  });
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create New Add-On
              </button>
            </div>

            {/* Addons List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : addons.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No add-ons created yet</p>
                <p className="text-xs mt-1">Create your first add-on to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addons.map(addon => {
                  const balanceDue = addon.balance_due || 0;
                  return (
                    <div key={addon.id} className={`border rounded-xl p-4 transition-all ${
                      addon.is_active ? 'border-gray-200 hover:border-blue-300' : 'border-gray-200 opacity-60'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getCategoryIcon(addon.category)}</div>
                          <div>
                            <p className="font-semibold text-gray-900">{addon.name}</p>
                            <p className="text-xs text-gray-500">{addon.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingAddon(addon);
                              setFormData({
                                name: addon.name,
                                description: addon.description || '',
                                category: addon.category,
                                price: addon.price.toString(),
                                is_active: addon.is_active,
                                is_recurring: addon.is_recurring || false,
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Edit addon"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddon(addon)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete addon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-gray-600">{addon.description || 'No description'}</p>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-green-600">₹{addon.price}</span>
                          {addon.is_recurring && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Recurring</span>
                          )}
                          {!addon.is_active && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                        </div>
                        {memberId && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {addon.member_addon_id ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Amount Paid:</span>
                                  <span className="font-medium text-green-600">₹{addon.amount_paid || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Balance Due:</span>
                                  <span className={`font-medium ${balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    ₹{balanceDue}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {addon.status && getStatusBadge(addon.status)}
                                  {balanceDue > 0 && (
                                    <button
                                      onClick={() => handleOpenPaymentModal(addon)}
                                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      <CreditCard className="h-3 w-3" />
                                      Pay Now
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAssignAddon(addon)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Assign to Member
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Addon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editingAddon ? 'Edit Add-On' : 'Create Add-On'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAddon(null);
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateAddon} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Locker Rental"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="locker">🔒 Locker</option>
                  <option value="protein">💪 Protein Powder</option>
                  <option value="towel">🧺 Towel Service</option>
                  <option value="supplement">🧪 Supplements</option>
                  <option value="training">🏋️ Extra Training</option>
                  <option value="parking">🅿️ Parking</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Recurring
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAddon(null);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : editingAddon ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Add-On Modal (collects an optional initial payment) */}
      {showAssignModal && assignTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Assign Add-On
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{assignTarget.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignTarget(null);
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between text-sm">
                <span className="text-gray-500">Add-On Price:</span>
                <span className="font-medium text-gray-900">₹{assignTarget.price}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Collected Now (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={assignTarget.price}
                  value={assignAmount}
                  onChange={(e) => setAssignAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave as 0 to assign without collecting payment now — you can collect it later via "Pay Now".
                </p>
              </div>

              {parseFloat(assignAmount) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={assignMethod}
                    onChange={(e) => setAssignMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignTarget(null);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssign}
                  disabled={assigning}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {assigning ? 'Assigning...' : 'Assign Add-On'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedAddon && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Pay for Add-On
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedAddon.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedAddon(null);
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Addon Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Price:</span>
                  <span className="font-medium text-gray-900">₹{selectedAddon.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-medium text-green-600">₹{selectedAddon.amount_paid || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-700">Balance Due:</span>
                  <span className="text-orange-600">₹{selectedAddon.balance_due || 0}</span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedAddon.balance_due}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Max: ₹{selectedAddon.balance_due}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Payment notes"
                  />
                </div>
              </div>

              {/* Payment History */}
              {addonPayments.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Payment History
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {addonPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium text-green-600">₹{payment.amount}</span>
                          <span className="text-xs text-gray-400 ml-2">{payment.payment_method}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedAddon(null);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMakePayment}
                  disabled={paying || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {paying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {paying ? 'Processing...' : 'Make Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddonManager;