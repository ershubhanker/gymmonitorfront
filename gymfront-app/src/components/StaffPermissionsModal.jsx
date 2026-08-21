// src/components/StaffPermissionsModal.jsx - FIXED VERSION

import React, { useState, useEffect } from 'react';
import { X, Shield, Check, ChevronDown, ChevronRight, Loader2, LayoutDashboard, Users, DollarSign, TrendingUp, Activity, Wallet, Target, UserPlus, Calendar, Bell, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// ─── DEFAULT PERMISSION GROUPS ──────────────────────────────────────────
const DEFAULT_PERMISSION_GROUPS = {
  'Member Management': [
    { id: 'view_members', label: 'View Members', description: 'View list of all members' },
    { id: 'add_member', label: 'Add Member', description: 'Create new member accounts' },
    { id: 'edit_member', label: 'Edit Member', description: 'Update member information' },
    { id: 'delete_member', label: 'Delete Member', description: 'Remove members from system' },
    { id: 'view_member_profile', label: 'View Member Profile', description: 'View detailed member profiles' },
    { id: 'export_members', label: 'Export Members', description: 'Export member data to CSV' },
  ],
  'Membership Management': [
    { id: 'view_memberships', label: 'View Memberships', description: 'View membership plans and details' },
    { id: 'create_membership', label: 'Create Membership', description: 'Assign membership to members' },
    { id: 'renew_membership', label: 'Renew Membership', description: 'Renew existing memberships' },
    { id: 'delete_membership', label: 'Delete Membership', description: 'Remove memberships' },
  ],
  'Payment Management': [
    { id: 'view_payments', label: 'View Payments', description: 'View payment history' },
    { id: 'create_payment', label: 'Create Payment', description: 'Record new payments' },
    { id: 'delete_payment', label: 'Delete Payment', description: 'Remove payment records' },
    { id: 'view_balances', label: 'View Balances', description: 'View member balance details' },
  ],
  'Staff Management': [
    { id: 'view_staff', label: 'View Staff', description: 'View staff members list' },
    { id: 'add_staff', label: 'Add Staff', description: 'Create new staff accounts' },
    { id: 'edit_staff', label: 'Edit Staff', description: 'Update staff information' },
    { id: 'delete_staff', label: 'Delete Staff', description: 'Remove staff members' },
    { id: 'manage_staff_permissions', label: 'Manage Staff Permissions', description: 'Set permissions for staff' },
  ],
  'Attendance & Devices': [
    { id: 'view_attendance', label: 'View Attendance', description: 'View attendance records' },
    { id: 'mark_attendance', label: 'Mark Attendance', description: 'Mark member check-in/out' },
    { id: 'view_devices', label: 'View Devices', description: 'View attendance devices' },
    { id: 'manage_devices', label: 'Manage Devices', description: 'Add/Edit/Delete devices' },
    { id: 'sync_to_device', label: 'Sync to Device', description: 'Sync members/staff to devices' },
  ],
  'Lead Management': [
    { id: 'view_leads', label: 'View Leads', description: 'View all leads' },
    { id: 'add_lead', label: 'Add Lead', description: 'Create new leads' },
    { id: 'edit_lead', label: 'Edit Lead', description: 'Update lead information' },
    { id: 'delete_lead', label: 'Delete Lead', description: 'Remove leads' },
    { id: 'convert_lead', label: 'Convert Lead', description: 'Convert leads to members' },
  ],
  'Expense Management': [
    { id: 'view_expenses', label: 'View Expenses', description: 'View expense records' },
    { id: 'add_expense', label: 'Add Expense', description: 'Create new expenses' },
    { id: 'edit_expense', label: 'Edit Expense', description: 'Update expense records' },
    { id: 'delete_expense', label: 'Delete Expense', description: 'Remove expense records' },
  ],
  'Reports & Dashboard': [
    { id: 'view_dashboard', label: 'View Dashboard', description: 'Access dashboard overview' },
    { id: 'view_reports', label: 'View Reports', description: 'Access reports and analytics' },
    { id: 'export_reports', label: 'Export Reports', description: 'Export report data' },
  ],
  'Settings': [
    { id: 'view_settings', label: 'View Settings', description: 'View gym settings' },
    { id: 'manage_settings', label: 'Manage Settings', description: 'Update gym settings' },
  ],
  // Dashboard Visibility section - these will be merged from the API
  'Dashboard Visibility': [
    { id: 'dashboard_view_member_stats', label: 'Member Statistics', description: 'Show member stats cards on dashboard' },
    { id: 'dashboard_view_revenue_stats', label: 'Revenue Statistics', description: 'Show revenue/income cards on dashboard' },
    { id: 'dashboard_view_expense_stats', label: 'Expense Statistics', description: 'Show expense and profit cards on dashboard' },
    { id: 'dashboard_view_attendance_stats', label: 'Attendance Statistics', description: 'Show attendance cards on dashboard' },
    { id: 'dashboard_view_balance_stats', label: 'Balance Statistics', description: 'Show balance/dues cards on dashboard' },
    { id: 'dashboard_view_lead_stats', label: 'Lead Statistics', description: 'Show lead tracking cards on dashboard' },
    { id: 'dashboard_view_staff_stats', label: 'Staff Statistics', description: 'Show staff statistics cards on dashboard' },
    { id: 'dashboard_view_classes', label: 'Today\'s Classes', description: 'Show today\'s classes card on dashboard' },
    { id: 'dashboard_view_birthdays', label: 'Birthday Notifications', description: 'Show birthday notifications on dashboard' },
    { id: 'dashboard_view_activity', label: 'Recent Activity', description: 'Show recent activity feed on dashboard' },
    { id: 'dashboard_view_alerts', label: 'Dashboard Alerts', description: 'Show alerts section on dashboard' },
  ],
};

// ─── DASHBOARD PERMISSIONS DEFINITION ──────────────────────────────────
const DASHBOARD_PERMISSIONS = [
  { 
    id: 'dashboard_view_member_stats', 
    label: 'Member Statistics', 
    description: 'Show total members, active members, new members, and demographic charts',
    icon: Users
  },
  { 
    id: 'dashboard_view_revenue_stats', 
    label: 'Revenue Statistics', 
    description: 'Show monthly revenue, total revenue, and revenue growth',
    icon: DollarSign
  },
  { 
    id: 'dashboard_view_expense_stats', 
    label: 'Expense Statistics', 
    description: 'Show monthly expenses, total expenses, expense growth, and profit',
    icon: TrendingUp
  },
  { 
    id: 'dashboard_view_attendance_stats', 
    label: 'Attendance Statistics', 
    description: 'Show today\'s check-ins, attendance history, and irregular members',
    icon: Activity
  },
  { 
    id: 'dashboard_view_balance_stats', 
    label: 'Balance Statistics', 
    description: 'Show total balance due, overdue payments, and upcoming payments',
    icon: Wallet
  },
  { 
    id: 'dashboard_view_lead_stats', 
    label: 'Lead Statistics', 
    description: 'Show recent leads, lead status, and follow-up tracking',
    icon: Target
  },
  { 
    id: 'dashboard_view_staff_stats', 
    label: 'Staff Statistics', 
    description: 'Show staff count, staff attendance, and staff birthdays',
    icon: UserPlus
  },
  { 
    id: 'dashboard_view_classes', 
    label: 'Today\'s Classes', 
    description: 'Show upcoming classes, class bookings, and schedule',
    icon: Calendar
  },
  { 
    id: 'dashboard_view_birthdays', 
    label: 'Birthday Notifications', 
    description: 'Show upcoming member and staff birthdays',
    icon: Bell
  },
  { 
    id: 'dashboard_view_activity', 
    label: 'Recent Activity', 
    description: 'Show recent check-ins, payments, and sign-ups',
    icon: Clock
  },
  { 
    id: 'dashboard_view_alerts', 
    label: 'Dashboard Alerts', 
    description: 'Show expiry alerts, overdue alerts, and pending payments alerts',
    icon: Bell
  },
];

const StaffPermissionsModal = ({ isOpen, onClose, staff, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [dashboardPermissions, setDashboardPermissions] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState(DEFAULT_PERMISSION_GROUPS);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allPermissionIds, setAllPermissionIds] = useState([]);
  const [loadingError, setLoadingError] = useState(false);
  const [activeTab, setActiveTab] = useState('system'); // 'system' or 'dashboard'
  const [allDashboardPermissionIds, setAllDashboardPermissionIds] = useState([]);

  // Initialize expanded categories
  useEffect(() => {
    const expanded = {};
    Object.keys(DEFAULT_PERMISSION_GROUPS).forEach(key => {
      expanded[key] = true;
    });
    setExpandedCategories(expanded);
  }, []);

  // Get all dashboard permission IDs
  useEffect(() => {
    const ids = DASHBOARD_PERMISSIONS.map(p => p.id);
    setAllDashboardPermissionIds(ids);
  }, []);

  // Get all permission IDs from groups
  useEffect(() => {
    const ids = [];
    Object.values(permissionGroups).forEach(group => {
      group.forEach(perm => {
        ids.push(perm.id);
      });
    });
    setAllPermissionIds(ids);
  }, [permissionGroups]);

  useEffect(() => {
    if (isOpen && staff) {
      fetchAllPermissions();
      // Fetch both system and dashboard permissions
      fetchStaffPermissions();
    }
  }, [isOpen, staff]);

  // ─── FETCH ALL AVAILABLE PERMISSIONS ────────────────────────────────────
  const fetchAllPermissions = async () => {
    try {
      setLoadingError(false);
      const response = await api.get('/gym/staff/permissions/all');
      if (response.data && Object.keys(response.data).length > 0) {
        // Merge the response with our defaults to ensure all dashboard permissions are included
        const mergedGroups = { ...DEFAULT_PERMISSION_GROUPS };
        Object.keys(response.data).forEach(key => {
          if (mergedGroups[key]) {
            // Merge existing group with API data (deduplicate by id)
            const existingIds = new Set(mergedGroups[key].map(p => p.id));
            const newPerms = response.data[key].filter(p => !existingIds.has(p.id));
            mergedGroups[key] = [...mergedGroups[key], ...newPerms];
          } else {
            mergedGroups[key] = response.data[key];
          }
        });
        setPermissionGroups(mergedGroups);
      } else {
        setPermissionGroups(DEFAULT_PERMISSION_GROUPS);
      }
    } catch (error) {
      console.error('Error fetching all permissions:', error);
      setPermissionGroups(DEFAULT_PERMISSION_GROUPS);
      setLoadingError(true);
    }
  };

  // ─── FETCH STAFF'S CURRENT PERMISSIONS ──────────────────────────────────
  const fetchStaffPermissions = async () => {
    if (!staff) return;
    setLoading(true);
    
    try {
      // Fetch all permissions from the permissions table
      const response = await api.get(`/gym/staff/${staff.id}/permissions`);
      
      if (response.data && response.data.permissions) {
        const allPerms = response.data.permissions;
        
        // Separate system permissions and dashboard permissions
        const systemPerms = allPerms.filter(p => !p.startsWith('dashboard_'));
        const dashboardPerms = allPerms.filter(p => p.startsWith('dashboard_'));
        
        setSelectedPermissions(systemPerms);
        setDashboardPermissions(dashboardPerms);
      } else {
        setSelectedPermissions([]);
        setDashboardPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
      
      // Fallback: try debug endpoint
      try {
        const debugResponse = await api.get(`/gym/staff/${staff.id}/debug-permissions`);
        if (debugResponse.data && debugResponse.data.permissions) {
          const allPerms = debugResponse.data.permissions;
          const systemPerms = allPerms.filter(p => !p.startsWith('dashboard_'));
          const dashboardPerms = allPerms.filter(p => p.startsWith('dashboard_'));
          
          setSelectedPermissions(systemPerms);
          setDashboardPermissions(dashboardPerms);
        } else {
          setSelectedPermissions([]);
          setDashboardPermissions([]);
        }
      } catch (debugError) {
        console.error('Error fetching staff data:', debugError);
        setSelectedPermissions([]);
        setDashboardPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── TOGGLE CATEGORY ──────────────────────────────────────────────────────
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // ─── TOGGLE PERMISSION ──────────────────────────────────────────────────
  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // ─── TOGGLE DASHBOARD PERMISSION ──────────────────────────────────────
  const toggleDashboardPermission = (permissionId) => {
    setDashboardPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // ─── TOGGLE ALL IN CATEGORY ────────────────────────────────────────────
  const toggleAllInCategory = (categoryName, permissions) => {
    const permIds = permissions.map(p => p.id);
    const allSelected = permIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !permIds.includes(p)));
    } else {
      const newPerms = new Set([...selectedPermissions, ...permIds]);
      setSelectedPermissions(Array.from(newPerms));
    }
  };

  // ─── TOGGLE ALL DASHBOARD PERMISSIONS ─────────────────────────────────
  const toggleAllDashboardPermissions = () => {
    const allSelected = allDashboardPermissionIds.every(id => dashboardPermissions.includes(id));
    
    if (allSelected) {
      setDashboardPermissions([]);
    } else {
      setDashboardPermissions([...allDashboardPermissionIds]);
    }
  };

  // ─── SAVE PERMISSIONS ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!staff) return;
    setSaving(true);
    
    try {
      // Combine system permissions and dashboard permissions
      const allPermissions = [...selectedPermissions, ...dashboardPermissions];
      
      await api.put(`/gym/staff/${staff.id}/permissions`, {
        permissions: allPermissions
      });
      
      toast.success(`Permissions updated for ${staff.user?.full_name || staff.user?.username || 'Staff'}`);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      
      // Try POST as fallback
      try {
        const allPermissions = [...selectedPermissions, ...dashboardPermissions];
        await api.post(`/gym/staff/${staff.id}/permissions`, {
          permissions: allPermissions
        });
        toast.success(`Permissions updated for ${staff.user?.full_name || staff.user?.username || 'Staff'}`);
        if (onUpdate) onUpdate();
        onClose();
        return;
      } catch (postError) {
        const errorMsg = error.response?.data?.detail || 'Failed to save permissions';
        toast.error(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── GET CATEGORY ICON ──────────────────────────────────────────────────
  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Member Management': '👥',
      'Membership Management': '📋',
      'Payment Management': '💰',
      'Staff Management': '👔',
      'Attendance & Devices': '📱',
      'Lead Management': '📊',
      'Expense Management': '💳',
      'Reports & Dashboard': '📈',
      'Settings': '⚙️',
      'Dashboard Visibility': '📊'
    };
    return icons[categoryName] || '📌';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Staff Permissions</h2>
              <p className="text-sm text-gray-500">
                {staff?.user?.full_name || staff?.user?.username || 'Staff Member'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 pt-2">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'system'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            System Permissions
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Visibility
            <span className="ml-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
              {dashboardPermissions.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : activeTab === 'system' ? (
            <div className="space-y-4">
              {/* System Permissions */}
              {loadingError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-700 flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    Using default permissions. Changes will be saved to the server.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pb-3 border-b flex-wrap gap-2">
                <span className="text-sm text-gray-500">
                  {selectedPermissions.length} of {allPermissionIds.length} permissions selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPermissions.length === allPermissionIds.length) {
                        setSelectedPermissions([]);
                      } else {
                        setSelectedPermissions([...allPermissionIds]);
                      }
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {selectedPermissions.length === allPermissionIds.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {Object.entries(permissionGroups).map(([category, permissions]) => {
                // Skip dashboard visibility category in system tab (it's shown in dashboard tab)
                if (category === 'Dashboard Visibility') return null;
                
                return (
                  <div key={category} className="border rounded-xl overflow-hidden">
                    <div 
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl flex-shrink-0">{getCategoryIcon(category)}</span>
                        <span className="font-semibold text-gray-900 truncate">{category}</span>
                        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          {permissions.filter(p => selectedPermissions.includes(p.id)).length}/{permissions.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span 
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium cursor-pointer select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAllInCategory(category, permissions);
                          }}
                        >
                          {permissions.every(p => selectedPermissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
                        </span>
                        {expandedCategories[category] ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedCategories[category] && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {permissions.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700">{perm.label}</p>
                              <p className="text-xs text-gray-400 truncate">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // ─── DASHBOARD PERMISSIONS TAB ──────────────────────────────────
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <LayoutDashboard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Dashboard Visibility</p>
                    <p className="text-sm text-blue-600">
                      Control which dashboard cards and sections this staff member can see.
                      {dashboardPermissions.length === 0 && (
                        <span className="block mt-1 text-amber-600 font-medium">
                          ⚠️ No dashboard cards are selected. Staff will see an empty dashboard.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pb-3 border-b flex-wrap gap-2">
                <span className="text-sm text-gray-500">
                  {dashboardPermissions.length} of {allDashboardPermissionIds.length} dashboard cards selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleAllDashboardPermissions}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {dashboardPermissions.length === allDashboardPermissionIds.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DASHBOARD_PERMISSIONS.map((perm) => {
                  const Icon = perm.icon;
                  const isSelected = dashboardPermissions.includes(perm.id);
                  
                  return (
                    <label
                      key={perm.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDashboardPermission(perm.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                          <p className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                            {perm.label}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{perm.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Preview of dashboard visibility */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dashboard Preview</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {DASHBOARD_PERMISSIONS.map((perm) => {
                    const Icon = perm.icon;
                    const isSelected = dashboardPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                          isSelected
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <Icon className={`h-3 w-3 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                        <span>{isSelected ? '✅' : '❌'}</span>
                        <span className="truncate">{perm.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffPermissionsModal;