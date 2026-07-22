import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Activity, CheckCircle, XCircle, Settings,
  LogOut, Bell, ChevronDown, Menu, X, Home, Shield, RefreshCw,
  Loader2, Mail, Phone, Eye, MapPin, Search, UserCheck, UserX,
  Clock, Calendar, AlertCircle, User, Edit, Trash2, Plus,
  Filter, Download, Database, Server, HardDrive, Globe,
  DollarSign, CreditCard, Award, Star, Zap, Target,
  TrendingUp, TrendingDown, BarChart3, ChevronRight, Save, MessageSquare,
  Wallet, Receipt, FileText, Users as UsersIcon, Briefcase, Calendar as CalendarIcon,
  ChevronLeft, PanelLeftClose, PanelLeftOpen, ArrowLeft, ExternalLink,
  BookOpen, Hash, Phone as PhoneIcon, Mail as MailIcon, Dumbbell, Gift,
  PieChart, Layers, LayoutGrid, List, Grid, Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const convertToIST = (utcDateString) => {
  if (!utcDateString) return null;
  const utcDate = new Date(utcDateString);
  if (isNaN(utcDate.getTime())) return null;
  const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate;
};

const formatDateTime = (d) => {
  if (!d) return '—';
  const istDate = convertToIST(d);
  if (!istDate) return '—';
  return istDate.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount || 0);

const statusBadge = (status) => {
  const map = {
    active: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    inactive: 'bg-gray-700 text-gray-400 border border-gray-600',
    suspended: 'bg-red-900/60 text-red-300 border border-red-700',
    pending: 'bg-amber-900/60 text-amber-300 border border-amber-700',
    paid: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    expired: 'bg-red-900/60 text-red-300 border border-red-700',
    cancelled: 'bg-gray-700 text-gray-400 border border-gray-600',
    trial: 'bg-blue-900/60 text-blue-300 border border-blue-700',
    basic: 'bg-slate-700 text-slate-300',
    pro: 'bg-purple-900/60 text-purple-300',
    enterprise: 'bg-indigo-900/60 text-indigo-300',
    new: 'bg-blue-900/60 text-blue-300 border border-blue-700',
    contacted: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
    interested: 'bg-green-900/60 text-green-300 border border-green-700',
    not_interested: 'bg-gray-700 text-gray-400 border border-gray-600',
    converted: 'bg-purple-900/60 text-purple-300 border border-purple-700',
    lost: 'bg-red-900/60 text-red-300 border border-red-700',
    completed: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  };
  return map[status] || 'bg-gray-700 text-gray-400';
};

const roleBadge = (role) => {
  const map = {
    super_admin: 'bg-purple-900/60 text-purple-300 border border-purple-700',
    gym_owner: 'bg-blue-900/60 text-blue-300 border border-blue-700',
    gym_staff: 'bg-teal-900/60 text-teal-300 border border-teal-700',
    member: 'bg-gray-700 text-gray-400',
  };
  return map[role] || 'bg-gray-700 text-gray-400';
};

// ─── Field components ─────────────────────────────────────────────────────────

const Field = ({ label, name, value, onChange, type = 'text', options, readOnly }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    {options ? (
      <select
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={readOnly}
        className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        name={name}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        rows={3}
        className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50"
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 read-only:opacity-60"
      />
    )}
  </div>
);

// ─── Edit Modals ─────────────────────────────────────────────────────────────

const EditGymModal = ({ gym, onClose, onSave }) => {
  const [form, setForm] = useState(gym || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      description: form.description,
      opening_time: form.opening_time,
      closing_time: form.closing_time,
      subscription_plan: form.subscription_plan,
      subscription_status: form.subscription_status,
      is_active: form.is_active === true || form.is_active === 'true',
      max_members: parseInt(form.max_members) || 100,
      max_staff: parseInt(form.max_staff) || 5,
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Gym" icon={<Building2 className="h-5 w-5 text-purple-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Gym Name" name="name" value={form.name} onChange={handleChange} />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <div className="md:col-span-2">
          <Field label="Address" name="address" value={form.address} onChange={handleChange} />
        </div>
        <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Description" name="description" value={form.description} onChange={handleChange} />
        <Field label="Opening Time" name="opening_time" value={form.opening_time} onChange={handleChange} />
        <Field label="Closing Time" name="closing_time" value={form.closing_time} onChange={handleChange} />
        <Field 
          label="Subscription Plan" 
          name="subscription_plan" 
          value={form.subscription_plan} 
          onChange={handleChange}
          options={[
            { value: 'basic', label: 'Basic' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
        />
        <Field 
          label="Subscription Status" 
          name="subscription_status" 
          value={form.subscription_status} 
          onChange={handleChange}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'trial', label: 'Trial' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <Field 
          label="Status" 
          name="is_active" 
          value={String(form.is_active)} 
          onChange={handleChange}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <Field label="Max Members" name="max_members" value={form.max_members} onChange={handleChange} type="number" />
        <Field label="Max Staff" name="max_staff" value={form.max_staff} onChange={handleChange} type="number" />
      </div>
    </ModalShell>
  );
};

const EditUserModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState(user || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      full_name: form.full_name,
      email: form.email,
      username: form.username,
      phone: form.phone,
      is_active: form.is_active === true || form.is_active === 'true',
      is_verified: form.is_verified === true || form.is_verified === 'true',
      gym_id: form.gym_id ? parseInt(form.gym_id) : null,
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit User" icon={<Users className="h-5 w-5 text-blue-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} />
        <Field label="Username" name="username" value={form.username} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field 
          label="Active" 
          name="is_active" 
          value={String(form.is_active)} 
          onChange={handleChange}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <Field 
          label="Verified" 
          name="is_verified" 
          value={String(form.is_verified)} 
          onChange={handleChange}
          options={[
            { value: 'true', label: 'Verified' },
            { value: 'false', label: 'Not Verified' },
          ]}
        />
      </div>
    </ModalShell>
  );
};

const EditMemberModal = ({ member, onClose, onSave }) => {
  const [form, setForm] = useState(member || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      gender: form.gender,
      is_active: form.is_active === true || form.is_active === 'true',
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Member" icon={<User className="h-5 w-5 text-green-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Address" name="address" value={form.address} onChange={handleChange} />
        <Field 
          label="Gender" 
          name="gender" 
          value={form.gender} 
          onChange={handleChange}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Field 
          label="Status" 
          name="is_active" 
          value={String(form.is_active)} 
          onChange={handleChange}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
      </div>
    </ModalShell>
  );
};

const EditStaffModal = ({ staff, onClose, onSave }) => {
  const [form, setForm] = useState(staff || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      position: form.position,
      salary: form.salary ? parseFloat(form.salary) : null,
      specializations: form.specializations,
      is_active: form.is_active === true || form.is_active === 'true',
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Staff" icon={<Briefcase className="h-5 w-5 text-orange-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Position" name="position" value={form.position} onChange={handleChange} />
        <Field label="Salary" name="salary" value={form.salary} onChange={handleChange} type="number" />
        <div className="md:col-span-2">
          <Field label="Specializations" name="specializations" value={form.specializations} onChange={handleChange} />
        </div>
        <Field 
          label="Status" 
          name="is_active" 
          value={String(form.is_active)} 
          onChange={handleChange}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
      </div>
    </ModalShell>
  );
};

const EditPlanModal = ({ plan, onClose, onSave }) => {
  const [form, setForm] = useState(plan || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      discounted_price: form.discounted_price ? parseFloat(form.discounted_price) : null,
      duration_days: parseInt(form.duration_days) || 30,
      plan_type: form.plan_type,
      is_active: form.is_active === true || form.is_active === 'true',
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Plan" icon={<Award className="h-5 w-5 text-yellow-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Plan Name" name="name" value={form.name} onChange={handleChange} />
        <Field label="Description" name="description" value={form.description} onChange={handleChange} />
        <Field label="Price" name="price" value={form.price} onChange={handleChange} type="number" />
        <Field label="Discounted Price" name="discounted_price" value={form.discounted_price} onChange={handleChange} type="number" />
        <Field label="Duration (days)" name="duration_days" value={form.duration_days} onChange={handleChange} type="number" />
        <Field 
          label="Plan Type" 
          name="plan_type" 
          value={form.plan_type} 
          onChange={handleChange}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'half_yearly', label: 'Half Yearly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
        />
        <Field 
          label="Status" 
          name="is_active" 
          value={String(form.is_active)} 
          onChange={handleChange}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
      </div>
    </ModalShell>
  );
};

const EditMembershipModal = ({ membership, onClose, onSave }) => {
  const [form, setForm] = useState(membership || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      status: form.status,
      payment_status: form.payment_status,
      notes: form.notes,
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Membership" icon={<CreditCard className="h-5 w-5 text-pink-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field 
          label="Status" 
          name="status" 
          value={form.status} 
          onChange={handleChange}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'pending', label: 'Pending' },
          ]}
        />
        <Field 
          label="Payment Status" 
          name="payment_status" 
          value={form.payment_status} 
          onChange={handleChange}
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
          ]}
        />
        <div className="md:col-span-2">
          <Field label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" />
        </div>
      </div>
    </ModalShell>
  );
};

const EditPaymentModal = ({ payment, onClose, onSave }) => {
  const [form, setForm] = useState(payment || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      status: form.status,
      payment_method: form.payment_method,
      notes: form.notes,
      amount: parseFloat(form.amount) || 0,
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Payment" icon={<DollarSign className="h-5 w-5 text-green-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Amount" name="amount" value={form.amount} onChange={handleChange} type="number" />
        <Field 
          label="Payment Method" 
          name="payment_method" 
          value={form.payment_method} 
          onChange={handleChange}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'card', label: 'Card' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'upi', label: 'UPI' },
            { value: 'online', label: 'Online' },
          ]}
        />
        <Field 
          label="Status" 
          name="status" 
          value={form.status} 
          onChange={handleChange}
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <div className="md:col-span-2">
          <Field label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" />
        </div>
      </div>
    </ModalShell>
  );
};

const EditLeadModal = ({ lead, onClose, onSave }) => {
  const [form, setForm] = useState(lead || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      status: form.status,
      source: form.source,
      interest: form.interest,
      notes: form.notes,
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Lead" icon={<Target className="h-5 w-5 text-orange-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field 
          label="Source" 
          name="source" 
          value={form.source} 
          onChange={handleChange}
          options={[
            { value: 'walk_in', label: 'Walk-in' },
            { value: 'phone_call', label: 'Phone Call' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'google', label: 'Google' },
            { value: 'referral', label: 'Referral' },
            { value: 'website', label: 'Website' },
          ]}
        />
        <Field 
          label="Status" 
          name="status" 
          value={form.status} 
          onChange={handleChange}
          options={[
            { value: 'new', label: 'New' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'interested', label: 'Interested' },
            { value: 'not_interested', label: 'Not Interested' },
            { value: 'converted', label: 'Converted' },
            { value: 'lost', label: 'Lost' },
          ]}
        />
        <div className="md:col-span-2">
          <Field label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" />
        </div>
      </div>
    </ModalShell>
  );
};

const EditExpenseModal = ({ expense, onClose, onSave }) => {
  const [form, setForm] = useState(expense || {});
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = () => {
    const data = {
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      category: form.category,
      vendor_name: form.vendor_name,
    };
    onSave(data);
  };
  
  return (
    <ModalShell title="Edit Expense" icon={<Wallet className="h-5 w-5 text-red-400" />} onClose={onClose} onSave={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Title" name="title" value={form.title} onChange={handleChange} />
        <Field label="Amount" name="amount" value={form.amount} onChange={handleChange} type="number" />
        <Field 
          label="Category" 
          name="category" 
          value={form.category} 
          onChange={handleChange}
          options={[
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'equipment', label: 'Equipment' },
            { value: 'salary', label: 'Salary' },
            { value: 'utilities', label: 'Utilities' },
            { value: 'rent', label: 'Rent' },
            { value: 'marketing', label: 'Marketing' },
            { value: 'supplies', label: 'Supplies' },
            { value: 'training', label: 'Training' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Field label="Vendor" name="vendor_name" value={form.vendor_name} onChange={handleChange} />
        <div className="md:col-span-2">
          <Field label="Description" name="description" value={form.description} onChange={handleChange} type="textarea" />
        </div>
      </div>
    </ModalShell>
  );
};

// ─── Modal Shell ──────────────────────────────────────────────────────────────

const ModalShell = ({ title, icon, children, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {children}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteConfirmModal = ({ target, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const handleConfirm = async () => {
    setDeleting(true);
    try { await onConfirm(); } finally { setDeleting(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-red-800/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-900/50 p-2 rounded-xl">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Confirm Delete</h3>
        </div>
        <p className="text-gray-300 mb-2">
          Are you sure you want to delete this <span className="text-red-400 font-semibold">{target?.type}</span>?
        </p>
        {target?.name && (
          <p className="text-gray-400 text-sm mb-4 bg-gray-800 px-3 py-2 rounded-lg">
            <span className="text-white">{target.name}</span>
          </p>
        )}
        <p className="text-xs text-gray-500 mb-6">This action <span className="text-red-400">cannot be undone</span>. All related data may also be deleted.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={handleConfirm} disabled={deleting}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Table Header ─────────────────────────────────────────────────────────────

const TableHeader = ({ cols }) => (
  <thead>
    <tr className="bg-gray-800/80 border-b border-gray-700">
      {cols.map((col, i) => (
        <th key={i} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

// ─── Action Buttons ───────────────────────────────────────────────────────────

const ActionBtns = ({ onEdit, onDelete }) => (
  <div className="flex items-center gap-1.5">
    <button onClick={onEdit}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg border border-blue-800/50 transition-colors">
      <Edit className="h-3.5 w-3.5" /> Edit
    </button>
    <button onClick={onDelete}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors">
      <Trash2 className="h-3.5 w-3.5" /> Del
    </button>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color = 'purple', onClick }) => {
  const colors = {
    purple: 'border-purple-500 bg-purple-900/20 text-purple-400',
    blue: 'border-blue-500 bg-blue-900/20 text-blue-400',
    green: 'border-green-500 bg-green-900/20 text-green-400',
    orange: 'border-orange-500 bg-orange-900/20 text-orange-400',
    pink: 'border-pink-500 bg-pink-900/20 text-pink-400',
    yellow: 'border-yellow-500 bg-yellow-900/20 text-yellow-400',
    red: 'border-red-500 bg-red-900/20 text-red-400',
    teal: 'border-teal-500 bg-teal-900/20 text-teal-400',
    indigo: 'border-indigo-500 bg-indigo-900/20 text-indigo-400',
    emerald: 'border-emerald-500 bg-emerald-900/20 text-emerald-400',
    amber: 'border-amber-500 bg-amber-900/20 text-amber-400',
    cyan: 'border-cyan-500 bg-cyan-900/20 text-cyan-400',
  };
  return (
    <div onClick={onClick}
      className={`bg-gray-800 rounded-2xl p-5 border-l-4 ${colors[color]} ${onClick ? 'cursor-pointer hover:bg-gray-750 transition-colors' : ''}`}>
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
    </div>
  );
};

// ─── Empty row ────────────────────────────────────────────────────────────────

const EmptyRow = ({ text }) => (
  <div className="py-16 text-center text-gray-500">
    <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
    <p className="text-sm">{text}</p>
  </div>
);

// ─── Detail Section Components ──────────────────────────────────────────────

const DetailSection = ({ title, icon, children, className = '' }) => (
  <div className={`bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
    <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/80">
      {icon}
      <h3 className="font-semibold text-white text-sm">{title}</h3>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

const DetailItem = ({ label, value, className = '' }) => (
  <div className={`flex justify-between py-1.5 border-b border-gray-700/50 last:border-0 ${className}`}>
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-sm text-white font-medium">{value || '—'}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal states
  const [editModal, setEditModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ===== GYM DETAILS VIEW STATE =====
  const [selectedGym, setSelectedGym] = useState(null);
  const [selectedGymId, setSelectedGymId] = useState(null);
  const [viewingGymDetails, setViewingGymDetails] = useState(false);
  const [loadingGymDetails, setLoadingGymDetails] = useState(false);
  const [gymMemberSearch, setGymMemberSearch] = useState('');
  const [filteredGymMembers, setFilteredGymMembers] = useState([]);

  // Data
  const [stats, setStats] = useState({});
  const [gyms, setGyms] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [payments, setPayments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsR, gymsR, usersR, membersR, staffR, plansR, membershipsR, paymentsR, leadsR, expensesR] = await Promise.all([
        api.get('/admin/dashboard/stats').catch(() => ({ data: null })),
        api.get('/admin/gyms?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/users?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/members?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/staff?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/plans?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/memberships?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/payments?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/leads?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/expenses?limit=1000').catch(() => ({ data: [] })),
      ]);
      if (statsR.data) setStats(statsR.data);
      if (gymsR.data) setGyms(gymsR.data);
      if (usersR.data) setUsers(usersR.data);
      if (membersR.data) setMembers(membersR.data);
      if (staffR.data) setStaff(staffR.data);
      if (plansR.data) setPlans(plansR.data);
      if (membershipsR.data) setMemberships(membershipsR.data);
      if (paymentsR.data) setPayments(paymentsR.data);
      if (leadsR.data) setLeads(leadsR.data);
      if (expensesR.data) setExpenses(expensesR.data);
      if (showToast) toast.success('Data refreshed!');
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===== GYM DETAILS FUNCTIONS =====
  const fetchGymDetails = async (gymId, gymName) => {
    setLoadingGymDetails(true);
    setSelectedGymId(gymId);
    setViewingGymDetails(true);
    setGymMemberSearch('');
    
    try {
      const response = await api.get(`/admin/gyms/${gymId}`);
      setSelectedGym(response.data);
      
      // Also fetch members separately
      const membersResponse = await api.get(`/admin/gyms/${gymId}/members?limit=1000`);
      setSelectedGym(prev => ({
        ...prev,
        members: membersResponse.data || []
      }));
      
    } catch (error) {
      console.error('Error fetching gym details:', error);
      toast.error('Failed to load gym details');
      setSelectedGym(null);
    } finally {
      setLoadingGymDetails(false);
    }
  };

  const handleBackToGyms = () => {
    setViewingGymDetails(false);
    setSelectedGym(null);
    setSelectedGymId(null);
    setGymMemberSearch('');
    setFilteredGymMembers([]);
  };

  // Filter gym members when search changes
  useEffect(() => {
    if (selectedGym?.members) {
      const search = gymMemberSearch.toLowerCase();
      if (search) {
        setFilteredGymMembers(
          selectedGym.members.filter(m =>
            m.full_name?.toLowerCase().includes(search) ||
            m.email?.toLowerCase().includes(search) ||
            m.phone?.includes(search)
          )
        );
      } else {
        setFilteredGymMembers(selectedGym.members);
      }
    }
  }, [gymMemberSearch, selectedGym]);

  const openEdit = (type, data) => setEditModal({ type, data });
  const closeEdit = () => setEditModal(null);

  const openDelete = (type, id, name, endpoint) =>
    setDeleteTarget({ type, id, name, endpoint: endpoint || `admin/${type}s/${id}` });
  const closeDelete = () => setDeleteTarget(null);

  const handleUpdate = async (endpoint, formData) => {
    await api.put(`/${endpoint}`, formData);
    toast.success('Updated successfully!');
    closeEdit();
    if (viewingGymDetails && selectedGymId) {
      fetchGymDetails(selectedGymId, selectedGym?.name);
    } else {
      fetchAllData();
    }
  };

  const handleDelete = async () => {
    await api.delete(`/${deleteTarget.endpoint}`);
    toast.success('Deleted successfully!');
    closeDelete();
    if (viewingGymDetails && selectedGymId) {
      fetchGymDetails(selectedGymId, selectedGym?.name);
    } else {
      fetchAllData();
    }
  };

  const s = searchTerm.toLowerCase();
  const filteredGyms = gyms.filter(g =>
    (g.name?.toLowerCase().includes(s) || g.owner_name?.toLowerCase().includes(s) || g.email?.toLowerCase().includes(s)) &&
    (filterStatus === 'all' || g.subscription_status === filterStatus)
  );
  const filteredUsers = users.filter(u =>
    (u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s)) &&
    (filterRole === 'all' || u.role === filterRole)
  );
  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s) || m.phone?.includes(searchTerm)
  );
  const filteredStaff = staff.filter(st =>
    st.user?.full_name?.toLowerCase().includes(s) || st.position?.toLowerCase().includes(s) || st.gym_name?.toLowerCase().includes(s)
  );
  const filteredPlans = plans.filter(p =>
    p.name?.toLowerCase().includes(s) || p.gym_name?.toLowerCase().includes(s)
  );
  const filteredMemberships = memberships.filter(m =>
    m.member?.full_name?.toLowerCase().includes(s) || m.plan?.name?.toLowerCase().includes(s) || m.gym_name?.toLowerCase().includes(s)
  );
  const filteredPayments = payments.filter(p =>
    p.member?.full_name?.toLowerCase().includes(s) || p.transaction_id?.toLowerCase().includes(s)
  );
  const filteredLeads = leads.filter(l =>
    l.full_name?.toLowerCase().includes(s) || l.phone?.includes(s) || l.email?.toLowerCase().includes(s)
  );
  const filteredExpenses = expenses.filter(e =>
    e.title?.toLowerCase().includes(s) || e.vendor_name?.toLowerCase().includes(s) || e.gym_name?.toLowerCase().includes(s)
  );

  const navigation = [
    { id: 'overview', name: 'Overview', icon: Home, count: null },
    { id: 'gyms', name: 'Gyms', icon: Building2, count: gyms.length },
    { id: 'users', name: 'Users', icon: Users, count: users.length },
    { id: 'members', name: 'Members', icon: User, count: members.length },
    { id: 'staff', name: 'Staff', icon: Shield, count: staff.length },
    { id: 'plans', name: 'Plans', icon: Award, count: plans.length },
    { id: 'memberships', name: 'Memberships', icon: CreditCard, count: memberships.length },
    { id: 'payments', name: 'Payments', icon: DollarSign, count: payments.length },
    { id: 'leads', name: 'Leads', icon: Target, count: leads.length },
    { id: 'expenses', name: 'Expenses', icon: Wallet, count: expenses.length },
    { id: 'whatsapp', name: 'WhatsApp Logs', icon: MessageSquare, count: null },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <Database className="h-16 w-16 text-purple-500/30 absolute inset-0" />
            <Loader2 className="h-16 w-16 text-purple-500 absolute inset-0 animate-spin" />
          </div>
          <p className="text-gray-300 font-medium">Loading admin dashboard…</p>
          <p className="text-xs text-gray-600">Fetching all records from database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside 
        className={`bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        } fixed h-full z-50`}
      >
        {/* Logo / Brand */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 h-14 border-b border-gray-800 flex-shrink-0`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-1.5 rounded-lg">
                <Database className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-white">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => { 
                setSelectedTab(item.id); 
                setSearchTerm(''); 
                setFilterStatus('all'); 
                setFilterRole('all');
                if (item.id !== 'gyms') {
                  setViewingGymDetails(false);
                  setSelectedGym(null);
                  setSelectedGymId(null);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                selectedTab === item.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? item.name : ''}
            >
              <item.icon className={`h-4 w-4 flex-shrink-0 ${sidebarCollapsed ? 'h-5 w-5' : ''}`} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.count !== null && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTab === item.id ? 'bg-purple-500/50' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* User Menu at Bottom */}
        <div className="border-t border-gray-800 p-2 flex-shrink-0">
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(v => !v)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title={sidebarCollapsed ? user?.full_name || 'User' : ''}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 text-left truncate">
                    <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
            
            {showUserMenu && (
              <div className={`absolute ${sidebarCollapsed ? 'left-full ml-2' : 'bottom-full mb-2 left-0'} w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-2 z-50`}>
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs bg-purple-900/60 text-purple-300 border border-purple-700">
                    <Shield className="h-3 w-3 mr-1" /> Super Admin
                  </span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        
        {/* Top Navbar */}
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
          <div className="px-4 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors lg:hidden"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
              <h1 className="text-sm font-semibold text-white capitalize">
                {viewingGymDetails ? `${selectedGym?.name || 'Gym'} - Details` : (selectedTab === 'overview' ? 'Dashboard Overview' : selectedTab)}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:block">Refresh</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Search / Filter Bar */}
        {selectedTab !== 'overview' && !viewingGymDetails && (
          <div className="bg-gray-900/60 border-b border-gray-800 px-4 lg:px-8 py-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={`Search ${selectedTab}…`}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              />
            </div>
            {selectedTab === 'gyms' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="trial">Trial</option>
                <option value="inactive">Inactive</option>
              </select>
            )}
            {selectedTab === 'users' && (
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="all">All Roles</option>
                <option value="gym_owner">Gym Owners</option>
                <option value="gym_staff">Staff</option>
              </select>
            )}
          </div>
        )}

        {/* Gym Details Search Bar */}
        {viewingGymDetails && (
          <div className="bg-gray-900/60 border-b border-gray-800 px-4 lg:px-8 py-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                value={gymMemberSearch}
                onChange={e => setGymMemberSearch(e.target.value)}
                placeholder={`Search members in ${selectedGym?.name || 'gym'}...`}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              />
            </div>
            {gymMemberSearch && (
              <button
                onClick={() => setGymMemberSearch('')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        <main className="px-4 lg:px-8 py-6 space-y-6">

          {/* ==================== TAB CONTENT ==================== */}
          {/* OVERVIEW */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <StatCard icon={Building2} label="Total Gyms" value={stats.total_gyms || 0}
                  sub={`${stats.active_gyms || 0} active`} color="purple"
                  onClick={() => setSelectedTab('gyms')} />
                <StatCard icon={Users} label="Total Users" value={stats.total_users || 0}
                  sub={`${stats.gym_owners || 0} owners · ${stats.gym_staff || 0} staff`} color="blue"
                  onClick={() => setSelectedTab('users')} />
                <StatCard icon={User} label="Members" value={stats.total_members_across_gyms || 0}
                  sub={`${stats.total_active_members || 0} active`} color="green"
                  onClick={() => setSelectedTab('members')} />
                <StatCard icon={Shield} label="Staff" value={stats.total_staff_across_gyms || 0}
                  sub={`${stats.active_staff || 0} active`} color="orange"
                  onClick={() => setSelectedTab('staff')} />
                <StatCard icon={Award} label="Plans" value={plans.length}
                  sub={`${plans.filter(p => p.is_active).length} active`} color="yellow"
                  onClick={() => setSelectedTab('plans')} />
                <StatCard icon={CreditCard} label="Memberships" value={memberships.length}
                  sub={`${memberships.filter(m => m.status === 'active').length} active`} color="pink"
                  onClick={() => setSelectedTab('memberships')} />
                <StatCard icon={DollarSign} label="Payments" value={payments.length}
                  sub={`Total: ${formatCurrency(payments.reduce((acc, p) => acc + (p.amount || 0), 0))}`} color="green"
                  onClick={() => setSelectedTab('payments')} />
                <StatCard icon={Target} label="Leads" value={leads.length}
                  sub={`${leads.filter(l => l.status === 'new').length} new`} color="orange"
                  onClick={() => setSelectedTab('leads')} />
                <StatCard icon={Wallet} label="Expenses" value={expenses.length}
                  sub={`Total: ${formatCurrency(expenses.reduce((acc, e) => acc + (e.amount || 0), 0))}`} color="red"
                  onClick={() => setSelectedTab('expenses')} />
                <StatCard icon={UserCheck} label="Verified Owners" value={stats.verified_owners || 0}
                  sub={`of ${stats.gym_owners || 0} owners`} color="blue" />
                <StatCard icon={Activity} label="Active Users (30d)" value={stats.active_users_last_30_days || 0}
                  sub="logged in recently" color="purple" />
                <StatCard icon={TrendingUp} label="Monthly Revenue" value={formatCurrency(stats.monthly_revenue || 0)}
                  sub="from all payments" color="green" />
              </div>

              {/* Recent Gyms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-400" /> Recent Gyms
                    </h3>
                    <button onClick={() => setSelectedTab('gyms')} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(stats.recent_gyms || gyms).slice(0, 6).map(g => (
                      <div 
                        key={g.id} 
                        onClick={() => {
                          setSelectedTab('gyms');
                          fetchGymDetails(g.id, g.name);
                        }}
                        className="flex items-center justify-between p-2.5 bg-gray-800/60 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {g.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{g.name}</p>
                            <p className="text-xs text-gray-500">{g.owner_name}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(g.subscription_status)}`}>
                          {g.subscription_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Signups */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" /> Recent Signups
                    </h3>
                    <button onClick={() => setSelectedTab('users')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(stats.recent_signups || users).slice(0, 6).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2.5 bg-gray-800/60 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {u.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{u.full_name}</p>
                            <p className="text-xs text-gray-500">{u.gym_name || 'No gym'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.last_login && (
                            <span className="text-xs text-gray-500">{formatDate(u.last_login)}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_verified ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}`}>
                            {u.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Methods Stats */}
              {stats.payment_method_stats && stats.payment_method_stats.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                    <CreditCard className="h-4 w-4 text-green-400" /> Payment Methods
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {stats.payment_method_stats.map((pm, idx) => (
                      <div key={idx} className="bg-gray-800/60 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400 capitalize">{pm.method}</p>
                        <p className="text-lg font-bold text-white">{pm.count}</p>
                        <p className="text-xs text-emerald-400">{formatCurrency(pm.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Logins */}
              {stats.recent_logins && stats.recent_logins.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-400" /> Recent Logins
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {stats.recent_logins.slice(0, 10).map(login => (
                      <div key={login.id} className="flex items-center justify-between p-2.5 bg-gray-800/60 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {login.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{login.full_name}</p>
                            <p className="text-xs text-gray-500">{login.email}</p>
                            {login.gym_name && <p className="text-xs text-gray-600">{login.gym_name}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{formatDateTime(login.last_login)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(login.role)}`}>
                            {login.role?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== GYMS TABLE OR GYM DETAILS VIEW ==================== */}
          {selectedTab === 'gyms' && !viewingGymDetails && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">{filteredGyms.length} gyms</p>
                <p className="text-xs text-gray-500">Total Revenue: {formatCurrency(filteredGyms.reduce((acc, g) => acc + (g.monthly_revenue || 0), 0))}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Gym', 'Owner', 'Contact', 'Members', 'Staff', 'Plan', 'Status', 'Revenue', 'Created', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredGyms.map(gym => (
                      <tr key={gym.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{gym.id}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => fetchGymDetails(gym.id, gym.name)}
                            className="flex items-center gap-2.5 hover:bg-gray-700/50 rounded-lg p-1 -m-1 transition-colors group w-full text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {gym.name?.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium group-hover:text-purple-400 transition-colors">
                                {gym.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-[150px]">{gym.address}</p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{gym.owner_name}</p>
                          <p className="text-xs text-gray-500">{gym.owner_email}</p>
                          <p className="text-xs text-gray-600">{gym.owner_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-400">{gym.email}</p>
                          <p className="text-xs text-gray-500">{gym.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <span className="text-white font-medium">{gym.active_members}</span>
                          <span className="text-gray-600">/{gym.total_members}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <span className="text-white font-medium">{gym.active_staff}</span>
                          <span className="text-gray-600">/{gym.total_staff}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${statusBadge(gym.subscription_plan)}`}>
                            {gym.subscription_plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(gym.subscription_status)}`}>
                            {gym.subscription_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{formatCurrency(gym.monthly_revenue || 0)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(gym.created_at)}</td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('gym', gym)}
                            onDelete={() => openDelete('gym', gym.id, gym.name, `admin/gyms/${gym.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredGyms.length === 0 && <EmptyRow text="No gyms found" />}
              </div>
            </div>
          )}

          {/* ==================== GYM DETAILS VIEW ==================== */}
          {selectedTab === 'gyms' && viewingGymDetails && selectedGym && (
            <div className="space-y-6">
              <button
                onClick={handleBackToGyms}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Gyms
              </button>

              {loadingGymDetails ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
                  <p className="text-gray-400 mt-3 text-sm">Loading gym details...</p>
                </div>
              ) : (
                <>
                  {/* Gym Header */}
                  <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/50 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {selectedGym.name?.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white">{selectedGym.name}</h2>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-2.5 py-0.5 text-xs rounded-full ${statusBadge(selectedGym.subscription_status)}`}>
                              {selectedGym.subscription_status}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium capitalize ${statusBadge(selectedGym.subscription_plan)}`}>
                              {selectedGym.subscription_plan}
                            </span>
                            {selectedGym.is_active ? (
                              <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 text-xs rounded-full bg-red-900/60 text-red-300 border border-red-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          {selectedGym.description && (
                            <p className="text-sm text-gray-300 mt-2 max-w-2xl">{selectedGym.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEdit('gym', selectedGym)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-purple-800/30">
                      <div className="flex items-center gap-2">
                        <MailIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{selectedGym.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{selectedGym.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300 truncate">{selectedGym.address || 'No address'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">
                          {selectedGym.opening_time && selectedGym.closing_time 
                            ? `${selectedGym.opening_time} - ${selectedGym.closing_time}`
                            : 'Hours not set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={User} label="Members" value={selectedGym.members?.length || 0}
                      sub={`${selectedGym.members?.filter(m => m.is_active).length || 0} active`} color="green" />
                    <StatCard icon={Shield} label="Staff" value={selectedGym.total_staff || 0}
                      sub={`${selectedGym.active_staff || 0} active`} color="orange" />
                    <StatCard icon={Award} label="Plans" value={selectedGym.plans?.length || 0}
                      sub="membership plans" color="yellow" />
                    <StatCard icon={CreditCard} label="Memberships" value={selectedGym.stats?.total_memberships || 0}
                      sub="active memberships" color="pink" />
                    <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(selectedGym.monthly_revenue || 0)}
                      sub="monthly revenue" color="green" />
                    <StatCard icon={Wallet} label="Expenses" value={formatCurrency(selectedGym.stats?.total_expenses || 0)}
                      sub="total expenses" color="red" />
                  </div>

                  {/* Gym Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Owner Info */}
                    <DetailSection title="Gym Owner" icon={<User className="h-4 w-4 text-blue-400" />}>
                      {selectedGym.owner ? (
                        <div className="space-y-1">
                          <DetailItem label="Name" value={selectedGym.owner.name} />
                          <DetailItem label="Email" value={selectedGym.owner.email} />
                          <DetailItem label="Phone" value={selectedGym.owner.phone || '—'} />
                          <DetailItem label="Username" value={selectedGym.owner.username || '—'} />
                          <DetailItem label="Status" value={
                            <span className={selectedGym.owner.is_verified ? 'text-emerald-400' : 'text-amber-400'}>
                              {selectedGym.owner.is_verified ? '✅ Verified' : '⏳ Pending Verification'}
                            </span>
                          } />
                          <DetailItem label="Joined" value={formatDate(selectedGym.owner.joined_at)} />
                          {selectedGym.owner.last_login && (
                            <DetailItem label="Last Login" value={formatDateTime(selectedGym.owner.last_login)} />
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No owner information available</p>
                      )}
                    </DetailSection>

                    {/* Stats */}
                    <DetailSection title="Gym Statistics" icon={<BarChart3 className="h-4 w-4 text-teal-400" />}>
                      {selectedGym.stats && (
                        <div className="space-y-1">
                          <DetailItem label="Total Members" value={selectedGym.stats.total_members || 0} />
                          <DetailItem label="Active Members" value={selectedGym.stats.active_members || 0} />
                          <DetailItem label="Total Staff" value={selectedGym.stats.total_staff || 0} />
                          <DetailItem label="Active Staff" value={selectedGym.stats.active_staff || 0} />
                          <DetailItem label="Total Plans" value={selectedGym.stats.total_plans || 0} />
                          <DetailItem label="Monthly Revenue" value={formatCurrency(selectedGym.monthly_revenue || 0)} />
                        </div>
                      )}
                    </DetailSection>
                  </div>

                  {/* Staff Section */}
                  <DetailSection title="Staff Members" icon={<Shield className="h-4 w-4 text-orange-400" />}>
                    {selectedGym.staff && selectedGym.staff.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                              <th className="pb-2 pr-4 font-medium">Name</th>
                              <th className="pb-2 pr-4 font-medium">Position</th>
                              <th className="pb-2 pr-4 font-medium">Email</th>
                              <th className="pb-2 pr-4 font-medium">Status</th>
                              <th className="pb-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {selectedGym.staff.map(s => (
                              <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="py-2 pr-4 text-white">{s.name}</td>
                                <td className="py-2 pr-4 text-gray-300">{s.position}</td>
                                <td className="py-2 pr-4 text-gray-400">{s.email}</td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${s.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                                    {s.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-2">
                                  <button
                                    onClick={() => {
                                      const staffToEdit = staff.find(st => st.id === s.id) || s;
                                      openEdit('staff', staffToEdit);
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No staff members found</p>
                    )}
                  </DetailSection>

                  {/* Membership Plans Section */}
                  <DetailSection title="Membership Plans" icon={<Award className="h-4 w-4 text-yellow-400" />}>
                    {selectedGym.plans && selectedGym.plans.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                              <th className="pb-2 pr-4 font-medium">Plan Name</th>
                              <th className="pb-2 pr-4 font-medium">Type</th>
                              <th className="pb-2 pr-4 font-medium">Duration</th>
                              <th className="pb-2 pr-4 font-medium">Price</th>
                              <th className="pb-2 pr-4 font-medium">Status</th>
                              <th className="pb-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {selectedGym.plans.map(p => (
                              <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="py-2 pr-4 text-white font-medium">{p.name}</td>
                                <td className="py-2 pr-4 text-gray-300 capitalize">{p.plan_type}</td>
                                <td className="py-2 pr-4 text-gray-300">{p.duration_days} days</td>
                                <td className="py-2 pr-4 text-emerald-400 font-medium">{formatCurrency(p.price)}</td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${p.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                                    {p.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-2">
                                  <button
                                    onClick={() => {
                                      const planToEdit = plans.find(pl => pl.id === p.id) || p;
                                      openEdit('plan', planToEdit);
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No membership plans found</p>
                    )}
                  </DetailSection>

                  {/* Members Section */}
                  <DetailSection title="Members" icon={<Users className="h-4 w-4 text-green-400" />}>
                    {filteredGymMembers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                              <th className="pb-2 pr-4 font-medium">Name</th>
                              <th className="pb-2 pr-4 font-medium">Phone</th>
                              <th className="pb-2 pr-4 font-medium">Email</th>
                              <th className="pb-2 pr-4 font-medium">Plan</th>
                              <th className="pb-2 pr-4 font-medium">Status</th>
                              <th className="pb-2 pr-4 font-medium">Joined</th>
                              <th className="pb-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {filteredGymMembers.slice(0, 50).map(m => (
                              <tr key={m.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="py-2 pr-4 text-white">{m.full_name}</td>
                                <td className="py-2 pr-4 text-gray-300">{m.phone}</td>
                                <td className="py-2 pr-4 text-gray-400">{m.email || '—'}</td>
                                <td className="py-2 pr-4 text-gray-300">{m.current_plan || '—'}</td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${m.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                                    {m.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.joined_date)}</td>
                                <td className="py-2">
                                  <button
                                    onClick={() => {
                                      const memberToEdit = members.find(mem => mem.id === m.id) || m;
                                      openEdit('member', memberToEdit);
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredGymMembers.length > 50 && (
                          <p className="text-xs text-gray-500 mt-2">Showing first 50 of {filteredGymMembers.length} members</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">
                        {gymMemberSearch ? 'No members match your search' : 'No members found in this gym'}
                      </p>
                    )}
                  </DetailSection>

                  {/* Recent Payments Section */}
                  <DetailSection title="Recent Payments" icon={<DollarSign className="h-4 w-4 text-emerald-400" />}>
                    {selectedGym.recent_payments && selectedGym.recent_payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                              <th className="pb-2 pr-4 font-medium">Member</th>
                              <th className="pb-2 pr-4 font-medium">Amount</th>
                              <th className="pb-2 pr-4 font-medium">Method</th>
                              <th className="pb-2 pr-4 font-medium">Date</th>
                              <th className="pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {selectedGym.recent_payments.map(p => (
                              <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="py-2 pr-4 text-white">{p.member_name}</td>
                                <td className="py-2 pr-4 text-emerald-400 font-medium">{formatCurrency(p.amount)}</td>
                                <td className="py-2 pr-4 text-gray-300 capitalize">{p.payment_method}</td>
                                <td className="py-2 pr-4 text-xs text-gray-400">{formatDate(p.payment_date)}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(p.status)}`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No recent payments found</p>
                    )}
                  </DetailSection>
                </>
              )}
            </div>
          )}

          {/* ==================== USERS TABLE ==================== */}
          {selectedTab === 'users' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-300">{filteredUsers.length} users</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'User', 'Username', 'Email', 'Phone', 'Role', 'Gym', 'Last Login', 'Verified', 'Active', 'Joined', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{u.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {u.full_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-white font-medium">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 font-mono">@{u.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{u.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{u.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${roleBadge(u.role)}`}>
                            {u.role?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{u.gym_name || '—'}</td>
                        <td className="px-4 py-3">
                          {u.last_login ? (
                            <div>
                              <p className="text-xs text-gray-400">{formatDateTime(u.last_login)}</p>
                              {u.days_since_login !== null && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {u.days_since_login === 0 ? 'Today' : `${u.days_since_login} days ago`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.is_verified
                            ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                            : <XCircle className="h-4 w-4 text-red-400" />}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${u.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('user', u)}
                            onDelete={() => openDelete('user', u.id, u.full_name, `admin/users/${u.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && <EmptyRow text="No users found" />}
              </div>
            </div>
          )}

          {/* ==================== MEMBERS TABLE ==================== */}
          {selectedTab === 'members' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-300">{filteredMembers.length} members</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Member', 'Email', 'Phone', 'Gender', 'DOB', 'Gym', 'Current Plan', 'Total Paid', 'Status', 'Joined', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{m.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {m.full_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-white font-medium">{m.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{m.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{m.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 capitalize">{m.gender || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(m.date_of_birth)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{m.gym_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{m.current_plan || '—'}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{formatCurrency(m.total_paid || 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${m.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.joined_date)}</td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('member', m)}
                            onDelete={() => openDelete('member', m.id, m.full_name, `admin/members/${m.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMembers.length === 0 && <EmptyRow text="No members found" />}
              </div>
            </div>
          )}

          {/* ==================== STAFF TABLE ==================== */}
          {selectedTab === 'staff' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-300">{filteredStaff.length} staff members</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Staff', 'Position', 'Email', 'Phone', 'Gym', 'Last Login', 'Hire Date', 'Salary', 'Status', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredStaff.map(s => (
                      <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{s.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {s.user?.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{s.user?.full_name}</p>
                              <p className="text-xs text-gray-500 font-mono">@{s.user?.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{s.position}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.user?.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.user?.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.gym_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{s.user?.last_login ? formatDate(s.user.last_login) : 'Never'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(s.hire_date)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{s.salary ? formatCurrency(s.salary) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${s.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('staff', s)}
                            onDelete={() => openDelete('staff', s.id, s.user?.full_name, `admin/staff/${s.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStaff.length === 0 && <EmptyRow text="No staff found" />}
              </div>
            </div>
          )}

          {/* ==================== PLANS TABLE ==================== */}
          {selectedTab === 'plans' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-300">{filteredPlans.length} plans</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Plan Name', 'Gym', 'Type', 'Duration', 'Price', 'Disc. Price', 'Active Mbrs', 'Total Revenue', 'Status', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredPlans.map(p => (
                      <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{p.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              <Award className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{p.name}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[150px]">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{p.gym_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-900/60 text-indigo-300 capitalize">{p.plan_type}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{p.duration_days} days</td>
                        <td className="px-4 py-3 text-sm text-white font-medium">{formatCurrency(p.price)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{p.discounted_price ? formatCurrency(p.discounted_price) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{p.active_memberships}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{formatCurrency(p.total_revenue || 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${p.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('plan', p)}
                            onDelete={() => openDelete('plan', p.id, p.name, `admin/plans/${p.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPlans.length === 0 && <EmptyRow text="No plans found" />}
              </div>
            </div>
          )}

          {/* ==================== MEMBERSHIPS TABLE ==================== */}
          {selectedTab === 'memberships' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-300">{filteredMemberships.length} memberships</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Member', 'Plan', 'Gym', 'Start', 'End', 'Days Left', 'Status', 'Payment', 'Amount Paid', 'Balance', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredMemberships.map(ms => (
                      <tr key={ms.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{ms.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white font-medium">{ms.member?.full_name}</p>
                          <p className="text-xs text-gray-500">{ms.member?.phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{ms.plan?.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{ms.plan?.plan_type}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{ms.gym_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(ms.start_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(ms.end_date)}</td>
                        <td className="px-4 py-3">
                          {ms.days_remaining !== null && (
                            <span className={`text-xs font-medium ${ms.days_remaining < 0 ? 'text-red-400' : ms.days_remaining < 7 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {ms.days_remaining < 0 ? 'Expired' : `${ms.days_remaining} days`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(ms.status)}`}>{ms.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(ms.payment_status)}`}>{ms.payment_status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{formatCurrency(ms.amount_paid)}</td>
                        <td className="px-4 py-3 text-sm text-yellow-400 font-medium">{formatCurrency(ms.balance_due || 0)}</td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('membership', ms)}
                            onDelete={() => openDelete('membership', ms.id, `${ms.member?.full_name} – ${ms.plan?.name}`, `admin/memberships/${ms.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMemberships.length === 0 && <EmptyRow text="No memberships found" />}
              </div>
            </div>
          )}

          {/* ==================== PAYMENTS TABLE ==================== */}
          {selectedTab === 'payments' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">{filteredPayments.length} payments</p>
                <p className="text-sm font-semibold text-emerald-400">
                  Total: {formatCurrency(filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Txn ID', 'Member', 'Gym', 'Amount', 'Method', 'Date', 'Status', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{p.id}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.transaction_id || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white font-medium">{p.member?.full_name}</p>
                          <p className="text-xs text-gray-500">{p.member?.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{p.gym_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 capitalize">{p.payment_method}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(p.payment_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('payment', p)}
                            onDelete={() => openDelete('payment', p.id, `${p.member?.full_name} – ${formatCurrency(p.amount)}`, `admin/payments/${p.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPayments.length === 0 && <EmptyRow text="No payments found" />}
              </div>
            </div>
          )}

          {/* ==================== LEADS TABLE ==================== */}
          {selectedTab === 'leads' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-300">{filteredLeads.length} leads</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Name', 'Phone', 'Email', 'Source', 'Status', 'Interest', 'Gym', 'Created', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredLeads.map(l => (
                      <tr key={l.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{l.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {l.full_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-white font-medium">{l.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{l.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{l.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 capitalize">{l.source?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(l.status)}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{l.interest || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{l.gym_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('lead', l)}
                            onDelete={() => openDelete('lead', l.id, l.full_name, `admin/leads/${l.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredLeads.length === 0 && <EmptyRow text="No leads found" />}
              </div>
            </div>
          )}

          {/* ==================== EXPENSES TABLE ==================== */}
          {selectedTab === 'expenses' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">{filteredExpenses.length} expenses</p>
                <p className="text-sm font-semibold text-red-400">
                  Total: {formatCurrency(filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <TableHeader cols={['ID', 'Title', 'Amount', 'Category', 'Vendor', 'Gym', 'Date', 'Created By', 'Actions']} />
                  <tbody className="divide-y divide-gray-800">
                    {filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{e.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white font-medium">{e.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">{e.description}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-400">{formatCurrency(e.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 capitalize">{e.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{e.vendor_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{e.gym_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(e.expense_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{e.created_by_name || '—'}</td>
                        <td className="px-4 py-3">
                          <ActionBtns
                            onEdit={() => openEdit('expense', e)}
                            onDelete={() => openDelete('expense', e.id, e.title, `admin/expenses/${e.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredExpenses.length === 0 && <EmptyRow text="No expenses found" />}
              </div>
            </div>
          )}

          {/* ==================== WHATSAPP LOGS ==================== */}
          {selectedTab === 'whatsapp' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-400" />
                  WhatsApp Message Logs
                </h2>
                <p className="text-xs text-gray-500">Coming soon - WhatsApp logs will be displayed here</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Modals */}
      {editModal?.type === 'gym' && (
        <EditGymModal
          gym={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/gyms/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'user' && (
        <EditUserModal
          user={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/users/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'member' && (
        <EditMemberModal
          member={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/members/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'staff' && (
        <EditStaffModal
          staff={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/staff/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'plan' && (
        <EditPlanModal
          plan={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/plans/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'membership' && (
        <EditMembershipModal
          membership={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/memberships/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'payment' && (
        <EditPaymentModal
          payment={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/payments/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'lead' && (
        <EditLeadModal
          lead={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/leads/${editModal.data.id}`, form)}
        />
      )}
      {editModal?.type === 'expense' && (
        <EditExpenseModal
          expense={editModal.data}
          onClose={closeEdit}
          onSave={form => handleUpdate(`admin/expenses/${editModal.data.id}`, form)}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          onClose={closeDelete}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default AdminDashboard;