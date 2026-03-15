import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Activity, CheckCircle, XCircle, Settings,
  LogOut, Bell, ChevronDown, Menu, X, Home, Shield, RefreshCw,
  Loader2, Mail, Phone, Eye, MapPin, Search, UserCheck, UserX,
  Clock, Calendar, AlertCircle, User, Edit, Trash2, Plus,
  Filter, Download, Database, Server, HardDrive, Globe,
  DollarSign, CreditCard, Award, Star, Zap, Target,
  TrendingUp, TrendingDown, BarChart3, ChevronRight, Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
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
  const [form, setForm] = useState({ ...gym });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBool = (name, val) => setForm(p => ({ ...p, [name]: val }));

  return (
    <ModalShell title="Edit Gym" onClose={onClose} onSave={() => onSave(form)} icon={<Building2 className="h-5 w-5 text-purple-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Gym Name" name="name" value={form.name} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Subscription Plan" name="subscription_plan" value={form.subscription_plan} onChange={handleChange}
          options={[
            { value: 'basic', label: 'Basic' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise' }
          ]} />
        <Field label="Subscription Status" name="subscription_status" value={form.subscription_status} onChange={handleChange}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'trial', label: 'Trial' },
            { value: 'inactive', label: 'Inactive' }
          ]} />
        <Field label="Max Members" name="max_members" type="number" value={form.max_members} onChange={handleChange} />
        <Field label="Max Staff" name="max_staff" type="number" value={form.max_staff} onChange={handleChange} />
        <Field label="Opening Time" name="opening_time" value={form.opening_time} onChange={handleChange} />
        <Field label="Closing Time" name="closing_time" value={form.closing_time} onChange={handleChange} />
        <div className="sm:col-span-2">
          <Field label="Address" name="address" type="textarea" value={form.address} onChange={handleChange} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</label>
          <button
            onClick={() => handleBool('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.is_active ? 'translate-x-5.5 ml-5' : 'ml-0.5'}`} />
          </button>
          <span className="text-sm text-gray-300">{form.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <Field label="ID (read-only)" name="id" value={form.id} readOnly />
        <Field label="Created At (read-only)" name="created_at" value={formatDateTime(form.created_at)} readOnly />
      </div>
    </ModalShell>
  );
};

const EditUserModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ ...user, password: '' });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBool = (name, val) => setForm(p => ({ ...p, [name]: val }));

  return (
    <ModalShell title="Edit User" onClose={onClose} onSave={() => onSave(form)} icon={<User className="h-5 w-5 text-blue-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} />
        <Field label="Username" name="username" value={form.username} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Role (read-only)" name="role" value={form.role} readOnly />
        <Field label="Gym ID" name="gym_id" type="number" value={form.gym_id} onChange={handleChange} />
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</label>
          <button onClick={() => handleBool('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.is_active ? 'ml-5' : 'ml-0.5'}`} />
          </button>
          <span className="text-sm text-gray-300">{form.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verified</label>
          <button onClick={() => handleBool('is_verified', !form.is_verified)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_verified ? 'bg-blue-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.is_verified ? 'ml-5' : 'ml-0.5'}`} />
          </button>
          <span className="text-sm text-gray-300">{form.is_verified ? 'Verified' : 'Unverified'}</span>
        </div>
        <div className="sm:col-span-2">
          <Field label="New Password (leave blank to keep)" name="password" type="password" value={form.password} onChange={handleChange} />
        </div>
        <Field label="ID (read-only)" name="id" value={form.id} readOnly />
        <Field label="Created At (read-only)" name="created_at" value={formatDateTime(form.created_at)} readOnly />
      </div>
    </ModalShell>
  );
};

const EditMemberModal = ({ member, onClose, onSave }) => {
  const [form, setForm] = useState({ ...member });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBool = (name, val) => setForm(p => ({ ...p, [name]: val }));

  return (
    <ModalShell title="Edit Member" onClose={onClose} onSave={() => onSave(form)} icon={<Users className="h-5 w-5 text-green-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} />
        <Field label="Gender" name="gender" value={form.gender} onChange={handleChange}
          options={[
            { value: '', label: 'Not specified' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' }
          ]} />
        <Field label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
        <Field label="ID Proof Type" name="id_proof_type" value={form.id_proof_type} onChange={handleChange}
          options={[
            { value: '', label: 'Select...' },
            { value: 'Aadhar', label: 'Aadhar Card' },
            { value: 'DL', label: 'Driving Licence' },
            { value: 'Passport', label: 'Passport' },
            { value: 'PAN', label: 'PAN Card' }
          ]} />
        <Field label="ID Proof Number" name="id_proof_number" value={form.id_proof_number} onChange={handleChange} />
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</label>
          <button onClick={() => handleBool('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.is_active ? 'ml-5' : 'ml-0.5'}`} />
          </button>
          <span className="text-sm text-gray-300">{form.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="sm:col-span-2">
          <Field label="Address" name="address" type="textarea" value={form.address} onChange={handleChange} />
        </div>
        <Field label="Emergency Contact" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} />
        <Field label="Emergency Phone" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} />
        <div className="sm:col-span-2">
          <Field label="Medical Conditions" name="medical_conditions" type="textarea" value={form.medical_conditions} onChange={handleChange} />
        </div>
        <Field label="Gym (read-only)" name="gym_name" value={form.gym_name} readOnly />
        <Field label="Joined Date (read-only)" name="joined_date" value={formatDate(form.joined_date)} readOnly />
      </div>
    </ModalShell>
  );
};

const EditStaffModal = ({ staff, onClose, onSave }) => {
  const [form, setForm] = useState({ ...staff });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleUserChange = (e) => setForm(p => ({ ...p, user: { ...p.user, [e.target.name]: e.target.value } }));
  const handleBool = (name, val) => setForm(p => ({ ...p, [name]: val }));

  return (
    <ModalShell title="Edit Staff" onClose={onClose} onSave={() => onSave(form)} icon={<Users className="h-5 w-5 text-orange-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <p className="sm:col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-2">Account Details</p>
        <Field label="Full Name" name="full_name" value={form.user?.full_name} onChange={handleUserChange} />
        <Field label="Email" name="email" value={form.user?.email} onChange={handleUserChange} />
        <Field label="Phone" name="phone" value={form.user?.phone} onChange={handleUserChange} />
        <p className="sm:col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-2 pt-2">Staff Details</p>
        <Field label="Position" name="position" value={form.position} onChange={handleChange} />
        <Field label="Hire Date" name="hire_date" type="date" value={form.hire_date} onChange={handleChange} />
        <Field label="Salary (₹)" name="salary" type="number" value={form.salary} onChange={handleChange} />
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</label>
          <button onClick={() => handleBool('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.is_active ? 'ml-5' : 'ml-0.5'}`} />
          </button>
          <span className="text-sm text-gray-300">{form.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="sm:col-span-2">
          <Field label="Specializations" name="specializations" type="textarea" value={form.specializations} onChange={handleChange} />
        </div>
        <Field label="Gym (read-only)" name="gym_name" value={form.gym_name} readOnly />
        <Field label="Staff ID (read-only)" name="id" value={form.id} readOnly />
      </div>
    </ModalShell>
  );
};

const EditPlanModal = ({ plan, onClose, onSave }) => {
  const [form, setForm] = useState({ ...plan });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBool = (name, val) => setForm(p => ({ ...p, [name]: val }));

  return (
    <ModalShell title="Edit Membership Plan" onClose={onClose} onSave={() => onSave(form)} icon={<Award className="h-5 w-5 text-yellow-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Plan Name" name="name" value={form.name} onChange={handleChange} />
        <Field label="Plan Type" name="plan_type" value={form.plan_type} onChange={handleChange}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'half_yearly', label: 'Half Yearly' },
            { value: 'yearly', label: 'Yearly' }
          ]} />
        <Field label="Duration (days)" name="duration_days" type="number" value={form.duration_days} onChange={handleChange} />
        <Field label="Price (₹)" name="price" type="number" value={form.price} onChange={handleChange} />
        <Field label="Discounted Price (₹)" name="discounted_price" type="number" value={form.discounted_price} onChange={handleChange} />
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</label>
          <button onClick={() => handleBool('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.is_active ? 'ml-5' : 'ml-0.5'}`} />
          </button>
          <span className="text-sm text-gray-300">{form.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Features (comma-separated)" name="features" type="textarea" value={form.features} onChange={handleChange} />
        </div>
        <Field label="Gym (read-only)" name="gym_name" value={form.gym_name} readOnly />
        <Field label="Active Memberships (read-only)" name="active_memberships" value={form.active_memberships} readOnly />
      </div>
    </ModalShell>
  );
};

const EditMembershipModal = ({ membership, onClose, onSave }) => {
  const [form, setForm] = useState({ ...membership });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <ModalShell title="Edit Membership" onClose={onClose} onSave={() => onSave(form)} icon={<CreditCard className="h-5 w-5 text-pink-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Member (read-only)" name="member_name" value={membership.member?.full_name} readOnly />
        <Field label="Plan (read-only)" name="plan_name" value={membership.plan?.name} readOnly />
        <Field label="Gym (read-only)" name="gym_name" value={membership.gym_name} readOnly />
        <Field label="Start Date (read-only)" name="start_date" value={formatDate(membership.start_date)} readOnly />
        <Field label="End Date" name="end_date" type="date" value={form.end_date} onChange={handleChange} />
        <Field label="Status" name="status" value={form.status} onChange={handleChange}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'pending', label: 'Pending' }
          ]} />
        <Field label="Payment Status" name="payment_status" value={form.payment_status} onChange={handleChange}
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'cancelled', label: 'Cancelled' }
          ]} />
        <Field label="Amount Paid (₹)" name="amount_paid" type="number" value={form.amount_paid} onChange={handleChange} />
        <Field label="Discount Applied (₹)" name="discount_applied" type="number" value={form.discount_applied} onChange={handleChange} />
        <div className="sm:col-span-2">
          <Field label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
        </div>
      </div>
    </ModalShell>
  );
};

const EditPaymentModal = ({ payment, onClose, onSave }) => {
  const [form, setForm] = useState({ ...payment });
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <ModalShell title="Edit Payment" onClose={onClose} onSave={() => onSave(form)} icon={<DollarSign className="h-5 w-5 text-green-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Member (read-only)" name="member_name" value={payment.member?.full_name} readOnly />
        <Field label="Gym (read-only)" name="gym_name" value={payment.gym_name} readOnly />
        <Field label="Transaction ID (read-only)" name="transaction_id" value={payment.transaction_id} readOnly />
        <Field label="Amount (₹)" name="amount" type="number" value={form.amount} onChange={handleChange} />
        <Field label="Payment Method" name="payment_method" value={form.payment_method} onChange={handleChange}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'card', label: 'Card' },
            { value: 'upi', label: 'UPI' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'online', label: 'Online' }
          ]} />
        <Field label="Status" name="status" value={form.status} onChange={handleChange}
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'cancelled', label: 'Cancelled' }
          ]} />
        <Field label="Date (read-only)" name="payment_date" value={formatDateTime(payment.payment_date)} readOnly />
        <div className="sm:col-span-2">
          <Field label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {children}
        </div>
        {/* Footer */}
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

  // Modal states
  const [editModal, setEditModal] = useState(null); // { type, data }
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, name, endpoint }

  // Data
  const [stats, setStats] = useState({});
  const [gyms, setGyms] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsR, gymsR, usersR, membersR, staffR, plansR, membershipsR, paymentsR] = await Promise.all([
        api.get('/admin/dashboard/stats').catch(() => ({ data: null })),
        api.get('/admin/gyms?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/users?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/members?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/staff?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/plans?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/memberships?limit=1000').catch(() => ({ data: [] })),
        api.get('/admin/payments?limit=1000').catch(() => ({ data: [] })),
      ]);
      if (statsR.data) setStats(statsR.data);
      if (gymsR.data) setGyms(gymsR.data);
      if (usersR.data) setUsers(usersR.data);
      if (membersR.data) setMembers(membersR.data);
      if (staffR.data) setStaff(staffR.data);
      if (plansR.data) setPlans(plansR.data);
      if (membershipsR.data) setMemberships(membershipsR.data);
      if (paymentsR.data) setPayments(paymentsR.data);
      if (showToast) toast.success('Data refreshed!');
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── CRUD handlers ──────────────────────────────────────────────────────────

  const openEdit = (type, data) => setEditModal({ type, data });
  const closeEdit = () => setEditModal(null);

  const openDelete = (type, id, name, endpoint) =>
    setDeleteTarget({ type, id, name, endpoint: endpoint || `admin/${type}s/${id}` });
  const closeDelete = () => setDeleteTarget(null);

  const handleUpdate = async (endpoint, formData) => {
    await api.put(`/${endpoint}`, formData);
    toast.success('Updated successfully!');
    closeEdit();
    fetchAllData();
  };

  const handleDelete = async () => {
    await api.delete(`/${deleteTarget.endpoint}`);
    toast.success('Deleted successfully!');
    closeDelete();
    fetchAllData();
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────

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

  const navigation = [
    { id: 'overview', name: 'Overview', icon: Home },
    { id: 'gyms', name: 'Gyms', icon: Building2, count: gyms.length },
    { id: 'users', name: 'Users', icon: Users, count: users.length },
    { id: 'members', name: 'Members', icon: User, count: members.length },
    { id: 'staff', name: 'Staff', icon: Shield, count: staff.length },
    { id: 'plans', name: 'Plans', icon: Award, count: plans.length },
    { id: 'memberships', name: 'Memberships', icon: CreditCard, count: memberships.length },
    { id: 'payments', name: 'Payments', icon: DollarSign, count: payments.length },
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
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="px-4 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-1.5 rounded-lg">
                <Database className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-white hidden sm:block">Admin Panel</span>
            </div>

            {/* Nav tabs */}
            <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              {navigation.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedTab(item.id); setSearchTerm(''); setFilterStatus('all'); setFilterRole('all'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedTab === item.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.name}
                  {item.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTab === item.id ? 'bg-purple-500/50' : 'bg-gray-700 text-gray-400'
                    }`}>{item.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:block">Refresh</span>
              </button>

              <div className="relative">
                <button onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-2 z-50">
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
          </div>
        </div>
      </nav>

      {/* ── Search / Filter Bar ─────────────────────────────────────────────── */}
      {selectedTab !== 'overview' && (
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

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="px-4 lg:px-8 py-6 space-y-6">

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <StatCard icon={Building2} label="Total Gyms" value={stats.total_gyms || 0}
                sub={`${stats.active_gyms || 0} active`} color="purple"
                onClick={() => setSelectedTab('gyms')} />
              <StatCard icon={Users} label="Users" value={stats.total_users || 0}
                sub={`${stats.gym_owners || 0} owners · ${stats.gym_staff || 0} staff`} color="blue"
                onClick={() => setSelectedTab('users')} />
              <StatCard icon={User} label="Members" value={stats.total_members_across_gyms || 0}
                sub={`${stats.total_active_members || 0} active`} color="green"
                onClick={() => setSelectedTab('members')} />
              <StatCard icon={Shield} label="Staff" value={stats.total_staff_across_gyms || 0}
                sub="across all gyms" color="orange"
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
              <StatCard icon={UserCheck} label="Verified Owners" value={stats.verified_owners || 0}
                sub={`of ${stats.gym_owners || 0} owners`} color="blue" />
            </div>

            {/* Recent Gyms + Recent Signups */}
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
                    <div key={g.id} className="flex items-center justify-between p-2.5 bg-gray-800/60 rounded-xl hover:bg-gray-800 transition-colors">
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_verified ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}`}>
                        {u.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GYMS TABLE ────────────────────────────────────────────────────── */}
        {selectedTab === 'gyms' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-300">{filteredGyms.length} gyms</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <TableHeader cols={['ID', 'Gym', 'Owner', 'Contact', 'Members', 'Staff', 'Plan', 'Status', 'Created', 'Actions']} />
                <tbody className="divide-y divide-gray-800">
                  {filteredGyms.map(gym => (
                    <tr key={gym.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{gym.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {gym.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{gym.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{gym.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{gym.owner_name}</p>
                        <p className="text-xs text-gray-500">{gym.owner_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-400">{gym.email}</p>
                        <p className="text-xs text-gray-500">{gym.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <span className="text-white font-medium">{gym.active_members}</span>
                        <span className="text-gray-600">/{gym.total_members}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{gym.total_staff}</td>
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

        {/* ── USERS TABLE ───────────────────────────────────────────────────── */}
        {selectedTab === 'users' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">{filteredUsers.length} users</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <TableHeader cols={['ID', 'User', 'Username', 'Email', 'Phone', 'Role', 'Gym', 'Verified', 'Active', 'Joined', 'Actions']} />
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

        {/* ── MEMBERS TABLE ─────────────────────────────────────────────────── */}
        {selectedTab === 'members' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">{filteredMembers.length} members</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <TableHeader cols={['ID', 'Member', 'Email', 'Phone', 'Gender', 'DOB', 'Gym', 'ID Proof', 'Emergency', 'Status', 'Joined', 'Actions']} />
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
                      <td className="px-4 py-3">
                        {m.id_proof_type ? (
                          <div>
                            <p className="text-xs text-gray-300">{m.id_proof_type}</p>
                            <p className="text-xs text-gray-500 font-mono">{m.id_proof_number}</p>
                          </div>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {m.emergency_contact_name ? (
                          <div>
                            <p className="text-xs text-gray-300">{m.emergency_contact_name}</p>
                            <p className="text-xs text-gray-500">{m.emergency_contact_phone}</p>
                          </div>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
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

        {/* ── STAFF TABLE ───────────────────────────────────────────────────── */}
        {selectedTab === 'staff' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">{filteredStaff.length} staff members</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <TableHeader cols={['ID', 'Staff', 'Position', 'Email', 'Phone', 'Gym', 'Hire Date', 'Salary', 'Specializations', 'Status', 'Actions']} />
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
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(s.hire_date)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{s.salary ? formatCurrency(s.salary) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[150px] truncate">{s.specializations || '—'}</td>
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

        {/* ── PLANS TABLE ───────────────────────────────────────────────────── */}
        {selectedTab === 'plans' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">{filteredPlans.length} plans</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <TableHeader cols={['ID', 'Plan Name', 'Gym', 'Type', 'Duration', 'Price', 'Disc. Price', 'Active Mbrs', 'Features', 'Status', 'Actions']} />
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
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[150px] truncate">{p.features || '—'}</td>
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

        {/* ── MEMBERSHIPS TABLE ─────────────────────────────────────────────── */}
        {selectedTab === 'memberships' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">{filteredMemberships.length} memberships</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <TableHeader cols={['ID', 'Member', 'Plan', 'Gym', 'Start', 'End', 'Status', 'Payment', 'Amount Paid', 'Discount', 'Notes', 'Actions']} />
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
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(ms.status)}`}>{ms.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(ms.payment_status)}`}>{ms.payment_status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{formatCurrency(ms.amount_paid)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{ms.discount_applied ? formatCurrency(ms.discount_applied) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{ms.notes || '—'}</td>
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

        {/* ── PAYMENTS TABLE ────────────────────────────────────────────────── */}
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
                <TableHeader cols={['ID', 'Txn ID', 'Member', 'Gym', 'Amount', 'Method', 'Date', 'Status', 'Notes', 'Actions']} />
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
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{p.notes || '—'}</td>
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
      </main>

      {/* ── Edit Modals ──────────────────────────────────────────────────────── */}
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

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
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

// ─── Empty row ────────────────────────────────────────────────────────────────
const EmptyRow = ({ text }) => (
  <div className="py-16 text-center text-gray-500">
    <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
    <p className="text-sm">{text}</p>
  </div>
);

export default AdminDashboard;