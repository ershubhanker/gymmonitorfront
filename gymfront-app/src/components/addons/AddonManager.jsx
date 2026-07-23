// src/components/addons/AddonManager.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, X, CheckCircle, XCircle, Loader2,
  Tag, DollarSign, Calendar, AlertCircle, Search, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ADDON_CATEGORIES = [
  { value: 'locker', label: 'Locker', icon: '🔒' },
  { value: 'protein', label: 'Protein Powder', icon: '💪' },
  { value: 'towel', label: 'Towel Service', icon: '🧺' },
  { value: 'supplement', label: 'Supplements', icon: '🧪' },
  { value: 'training', label: 'Extra Training', icon: '🏋️' },
  { value: 'parking', label: 'Parking', icon: '🅿️' },
  { value: 'other', label: 'Other', icon: '📦' }
];

const AddonManager = ({ isOpen, onClose, onAddonAssigned }) => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    price: '',
    is_active: true,
    is_recurring: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchAddons();
    }
  }, [isOpen]);

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gym/addons');
      setAddons(response.data || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
      toast.error('Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Add-on name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        is_recurring: formData.is_recurring
      };

      if (editingAddon) {
        await api.put(`/gym/addons/${editingAddon.id}`, payload);
        toast.success('Add-on updated successfully!');
      } else {
        await api.post('/gym/addons', payload);
        toast.success('Add-on created successfully!');
      }

      setShowCreateModal(false);
      setEditingAddon(null);
      resetForm();
      fetchAddons();
    } catch (error) {
      console.error('Error saving addon:', error);
      toast.error(error.response?.data?.detail || 'Failed to save add-on');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addon) => {
    if (!window.confirm(`Delete add-on "${addon.name}"?`)) return;

    setLoading(true);
    try {
      const response = await api.delete(`/gym/addons/${addon.id}`);
      toast.success(response.data.message || 'Add-on deleted successfully');
      fetchAddons();
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete add-on');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'other',
      price: '',
      is_active: true,
      is_recurring: false
    });
  };

  const openEdit = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || '',
      category: addon.category,
      price: addon.price.toString(),
      is_active: addon.is_active,
      is_recurring: addon.is_recurring
    });
    setShowCreateModal(true);
  };

  const getCategoryLabel = (value) => {
    const cat = ADDON_CATEGORIES.find(c => c.value === value);
    return cat ? `${cat.icon} ${cat.label}` : value;
  };

  const getCategoryColor = (category) => {
    const colors = {
      locker: 'bg-blue-100 text-blue-800',
      protein: 'bg-purple-100 text-purple-800',
      towel: 'bg-green-100 text-green-800',
      supplement: 'bg-orange-100 text-orange-800',
      training: 'bg-red-100 text-red-800',
      parking: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add-Ons Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Create and manage add-ons like lockers, protein powder, towels, etc.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAddons}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-500" />
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingAddon(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Add-On
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Add-Ons List */}
        <div className="p-6">
          {loading && addons.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : addons.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-500">No add-ons created yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create add-ons like lockers, protein powder, towels, etc.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addons.map((addon) => (
                <div key={addon.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                        {addon.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                        {addon.is_recurring && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(addon.category)}`}>
                          {getCategoryLabel(addon.category)}
                        </span>
                        <span className="text-lg font-bold text-green-600">₹{addon.price}</span>
                      </div>
                      {addon.description && (
                        <p className="text-sm text-gray-500 mt-2">{addon.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(addon)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(addon)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="text-lg font-bold">
                  {editingAddon ? 'Edit Add-On' : 'Create Add-On'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAddon(null);
                    resetForm();
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Locker - Gold"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {ADDON_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                    Recurring (Monthly)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAddon(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editingAddon ? 'Update' : 'Create'}
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

export default AddonManager;