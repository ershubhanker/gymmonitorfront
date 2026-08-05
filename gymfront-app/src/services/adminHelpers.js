// src/services/adminHelpers.js

export const convertToIST = (utcDateString) => {
    if (!utcDateString) return null;
    const utcDate = new Date(utcDateString);
    if (isNaN(utcDate.getTime())) return null;
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate;
  };
  
  export const formatDateTime = (d) => {
    if (!d) return '—';
    const istDate = convertToIST(d);
    if (!istDate) return '—';
    return istDate.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };
  
  export const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };
  
  export const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount || 0);
  
  export const statusBadge = (status) => {
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
  
  export const roleBadge = (role) => {
    const map = {
      super_admin: 'bg-purple-900/60 text-purple-300 border border-purple-700',
      gym_owner: 'bg-blue-900/60 text-blue-300 border border-blue-700',
      gym_staff: 'bg-teal-900/60 text-teal-300 border border-teal-700',
      member: 'bg-gray-700 text-gray-400',
    };
    return map[role] || 'bg-gray-700 text-gray-400';
  };