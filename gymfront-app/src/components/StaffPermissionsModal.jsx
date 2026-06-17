// src/components/StaffPermissionsModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  X, Check, ChevronDown, ChevronRight, Shield, 
  Users, CreditCard, Calendar, Wifi, TrendingUp, 
  Settings, DollarSign, UserPlus, Award, Database,
  Loader2, CheckCircle, AlertCircle, Search, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const PERMISSION_ICONS = {
  'Member Management': Users,
  'Membership Management': Calendar,
  'Payment Management': CreditCard,
  'Staff Management': UserPlus,
  'Attendance & Devices': Wifi,
  'Lead Management': TrendingUp,
  'Expense Management': DollarSign,
  'Reports & Dashboard': Award,
  'Settings': Settings,
};

const StaffPermissionsModal = ({ isOpen, onClose, staff, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [permissionGroups, setPermissionGroups] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [allPermissionsData, setAllPermissionsData] = useState({});

  useEffect(() => {
    if (isOpen && staff) {
      fetchPermissions();
    }
  }, [isOpen, staff]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      // Fetch all available permissions
      const groupsResponse = await api.get('/gym/staff/permissions/all');
      setPermissionGroups(groupsResponse.data);
      setAllPermissionsData(groupsResponse.data);

      // Fetch staff's current permissions
      const staffResponse = await api.get(`/gym/staff/${staff.id}/permissions`);
      const currentPermissions = staffResponse.data.permissions || [];
      
      // Initialize expanded sections - expand all by default
      const expanded = {};
      Object.keys(groupsResponse.data).forEach(key => {
        expanded[key] = true;
      });
      setExpandedSections(expanded);

      // Set permissions state
      const permState = {};
      Object.keys(groupsResponse.data).forEach(category => {
        groupsResponse.data[category].forEach(perm => {
          permState[perm.id] = currentPermissions.includes(perm.id);
        });
      });
      setPermissions(permState);

    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permissionId) => {
    setPermissions(prev => ({
      ...prev,
      [permissionId]: !prev[permissionId]
    }));
  };

  const handleToggleSection = (category) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSelectAllInSection = (category, select) => {
    const newPermissions = { ...permissions };
    permissionGroups[category].forEach(perm => {
      newPermissions[perm.id] = select;
    });
    setPermissions(newPermissions);
  };

  const handleSelectAll = (select) => {
    const newPermissions = {};
    Object.keys(permissions).forEach(key => {
      newPermissions[key] = select;
    });
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedPermissions = Object.keys(permissions).filter(
        key => permissions[key] === true
      );
      
      await api.put(`/gym/staff/${staff.id}/permissions`, {
        permissions: selectedPermissions
      });
      
      toast.success('Permissions updated successfully!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(error.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedCount = () => {
    return Object.values(permissions).filter(v => v === true).length;
  };

  const getTotalPermissions = () => {
    return Object.keys(permissions).length;
  };

  const getSectionSelectedCount = (category) => {
    if (!permissionGroups[category]) return 0;
    return permissionGroups[category].filter(p => permissions[p.id]).length;
  };

  const getSectionTotalCount = (category) => {
    if (!permissionGroups[category]) return 0;
    return permissionGroups[category].length;
  };

  // Filter permission groups based on search
  const getFilteredGroups = () => {
    if (!searchTerm.trim()) return permissionGroups;
    
    const filtered = {};
    Object.keys(permissionGroups).forEach(category => {
      const matchingPerms = permissionGroups[category].filter(perm =>
        perm.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingPerms.length > 0) {
        filtered[category] = matchingPerms;
      }
    });
    return filtered;
  };

  if (!isOpen) return null;

  const filteredGroups = getFilteredGroups();
  const totalSelected = getSelectedCount();
  const totalPermissions = getTotalPermissions();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Staff Permissions</h2>
              <p className="text-sm text-gray-500">
                {staff?.user?.full_name || 'Staff'} • {staff?.position || 'No position'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm text-gray-500">Selected:</span>
              <span className="ml-2 text-sm font-semibold text-blue-600">
                {totalSelected} / {totalPermissions}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectAll(true)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : Object.keys(filteredGroups).length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No permissions found matching your search</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(filteredGroups).map((category) => {
                const Icon = PERMISSION_ICONS[category] || Shield;
                const sectionSelected = getSectionSelectedCount(category);
                const sectionTotal = getSectionTotalCount(category);
                const isAllSelected = sectionSelected === sectionTotal && sectionTotal > 0;
                const isSomeSelected = sectionSelected > 0 && sectionSelected < sectionTotal;
                const isExpanded = expandedSections[category];

                return (
                  <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Section Header */}
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleToggleSection(category)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg">
                          <Icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{category}</h3>
                          <p className="text-xs text-gray-500">
                            {sectionSelected} of {sectionTotal} selected
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAllInSection(category, !isAllSelected);
                            }}
                            className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                              isAllSelected 
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : isSomeSelected
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Section Content */}
                    {isExpanded && (
                      <div className="p-4 space-y-2">
                        {filteredGroups[category].map((perm) => (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              permissions[perm.id]
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={permissions[perm.id] || false}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {perm.label}
                                </span>
                                {permissions[perm.id] && (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Database className="h-4 w-4" />
            <span>{totalSelected} permissions selected</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
    </div>
  );
};

export default StaffPermissionsModal;