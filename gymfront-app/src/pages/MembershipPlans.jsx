// src/pages/MembershipPlans.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  PauseCircle, 
  PlayCircle,
  Dumbbell,
  Calendar,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const MembershipPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discounted_price: '',
    duration_days: '',
    plan_type: 'monthly',
    features: '',
  });

  const planTypes = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Half Yearly', value: 'half_yearly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  const fetchPlans = async () => {
    try {
      const response = await api.get('/gym/plans?active_only=false');
      setPlans(response.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = async () => {
    // Validate
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!formData.duration_days || parseInt(formData.duration_days) <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
        duration_days: parseInt(formData.duration_days),
        plan_type: formData.plan_type,
        features: formData.features || null,
        is_active: true,
      };

      await api.post('/gym/plans', payload);
      toast.success('Plan created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to create plan');
    }
  };

  const handleUpdate = async () => {
    if (!editingPlan) return;

    // Validate
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!formData.duration_days || parseInt(formData.duration_days) <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
        duration_days: parseInt(formData.duration_days),
        plan_type: formData.plan_type,
        features: formData.features || null,
      };

      await api.put(`/gym/plans/${editingPlan.id}`, payload);
      toast.success('Plan updated successfully!');
      setEditingPlan(null);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to update plan');
    }
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Are you sure you want to delete the plan "${plan.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(plan.id);
    try {
      await api.delete(`/gym/plans/${plan.id}`);
      toast.success('Plan deleted successfully!');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to delete plan');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      await api.put(`/gym/plans/${plan.id}`, {
        is_active: !plan.is_active,
      });
      toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'} successfully!`);
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast.error(error.response?.data?.detail || 'Failed to update plan status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      discounted_price: '',
      duration_days: '',
      plan_type: 'monthly',
      features: '',
    });
  };

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price?.toString() || '',
      discounted_price: plan.discounted_price?.toString() || '',
      duration_days: plan.duration_days?.toString() || '',
      plan_type: plan.plan_type || 'monthly',
      features: plan.features || '',
    });
  };

  const toggleExpand = (planId) => {
    setExpandedPlanId(expandedPlanId === planId ? null : planId);
  };

  // Filter plans
  const filteredPlans = plans.filter(plan => {
    // Search filter
    const matchesSearch = plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    if (filterStatus === 'active') {
      return matchesSearch && plan.is_active === true;
    }
    if (filterStatus === 'inactive') {
      return matchesSearch && plan.is_active === false;
    }
    return matchesSearch;
  });

  // Stats
  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.is_active).length;
  const inactivePlans = plans.filter(p => !p.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Loading membership plans...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-blue-600" />
              Membership Plans
            </h1>
            <p className="text-gray-500 mt-1">Manage your gym membership plans and pricing</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5" />
            Create New Plan
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Plans</span>
              <span className="text-2xl font-bold text-gray-900">{totalPlans}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">Active Plans</span>
              <span className="text-2xl font-bold text-green-600">{activePlans}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Inactive Plans</span>
              <span className="text-2xl font-bold text-gray-500">{inactivePlans}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === 'inactive' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
            <Dumbbell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plans Found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first membership plan to get started'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      plan.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Dumbbell className={`h-6 w-6 ${
                        plan.is_active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {plan.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          plan.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {plan.discounted_price && plan.discounted_price < plan.price && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                            Discounted
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <IndianRupee className="h-4 w-4" />
                          <span className="font-semibold">{plan.discounted_price || plan.price}</span>
                          {plan.discounted_price && (
                            <span className="text-gray-400 line-through ml-1">₹{plan.price}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {plan.duration_days} days
                        </span>
                        <span className="text-gray-500 capitalize">
                          {plan.plan_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(plan)}
                      className={`p-2 rounded-lg transition-all ${
                        plan.is_active 
                          ? 'text-orange-600 hover:bg-orange-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={plan.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {plan.is_active ? (
                        <PauseCircle className="h-5 w-5" />
                      ) : (
                        <PlayCircle className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditClick(plan)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      disabled={deletingId === plan.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === plan.id ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleExpand(plan.id)}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-all"
                    >
                      {expandedPlanId === plan.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPlanId === plan.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Plan Details</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Plan Type:</span> {plan.plan_type.replace('_', ' ').toUpperCase()}</p>
                        <p><span className="font-medium">Duration:</span> {plan.duration_days} days</p>
                        <p><span className="font-medium">Price:</span> ₹{plan.price}</p>
                        {plan.discounted_price && (
                          <p><span className="font-medium">Discounted Price:</span> ₹{plan.discounted_price}</p>
                        )}
                        <p><span className="font-medium">Status:</span> {plan.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                      {plan.features ? (
                        <div className="flex flex-wrap gap-2">
                          {plan.features.split(',').map((feature, idx) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                              {feature.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No features listed</p>
                      )}
                      {plan.description && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Description</p>
                          <p className="text-sm text-gray-500">{plan.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Dumbbell className="h-6 w-6 text-blue-600" />
                  {editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {editingPlan ? 'Update the plan details below' : 'Fill in the details to create a new membership plan'}
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Plan Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Gold Membership"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the plan benefits..."
                    rows="2"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                {/* Plan Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Plan Type *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {planTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, plan_type: type.value })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          formData.plan_type === type.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g., 5000"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Discounted Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.discounted_price}
                      onChange={(e) => setFormData({ ...formData, discounted_price: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    placeholder="e.g., 30"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Features
                  </label>
                  <input
                    type="text"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="Comma separated features (e.g., Gym Access, Personal Training, Diet Plan)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Separate multiple features with commas</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingPlan ? handleUpdate : handleCreate}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPlans;