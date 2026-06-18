// src/components/StaffPermissionsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Shield, Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const StaffPermissionsModal = ({ isOpen, onClose, staff, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [permissionGroups, setPermissionGroups] = useState({});

  useEffect(() => {
    if (isOpen && staff) {
      fetchPermissions();
      fetchAllPermissions();
    }
  }, [isOpen, staff]);

  const fetchPermissions = async () => {
    if (!staff) return;
    setLoading(true);
    try {
      const response = await api.get(`/gym/staff/${staff.id}/permissions`);
      setSelectedPermissions(response.data.permissions || []);
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
      toast.error('Failed to load staff permissions');
      setSelectedPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const response = await api.get('/gym/staff/permissions/all');
      setPermissionGroups(response.data || {});
      
      // Flatten all permissions for the list
      const allPerms = [];
      Object.values(response.data).forEach(group => {
        group.forEach(perm => {
          allPerms.push(perm.id);
        });
      });
      setAllPermissions(allPerms);
      
      // Expand all categories by default
      const expanded = {};
      Object.keys(response.data).forEach(key => {
        expanded[key] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Error fetching all permissions:', error);
      toast.error('Failed to load permission list');
    }
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const toggleAllInCategory = (categoryName, permissions) => {
    const permIds = permissions.map(p => p.id);
    const allSelected = permIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deselect all in category
      setSelectedPermissions(prev => prev.filter(p => !permIds.includes(p)));
    } else {
      // Select all in category
      const newPerms = new Set([...selectedPermissions, ...permIds]);
      setSelectedPermissions(Array.from(newPerms));
    }
  };

  const handleSave = async () => {
    if (!staff) return;
    setSaving(true);
    try {
      await api.put(`/gym/staff/${staff.id}/permissions`, {
        permissions: selectedPermissions
      });
      toast.success(`Permissions updated for ${staff.user?.full_name || staff.user?.username || 'Staff'}`);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to update permissions';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

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
      'Settings': '⚙️'
    };
    return icons[categoryName] || '📌';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Staff Permissions</h2>
              <p className="text-sm text-gray-500">
                {staff?.user?.full_name || staff?.user?.username || 'Staff Member'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm text-gray-500">
                  {selectedPermissions.length} of {allPermissions.length} permissions selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedPermissions.length === allPermissions.length) {
                        setSelectedPermissions([]);
                      } else {
                        setSelectedPermissions([...allPermissions]);
                      }
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {selectedPermissions.length === allPermissions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Permission Groups */}
              {Object.entries(permissionGroups).map(([category, permissions]) => (
                <div key={category} className="border rounded-xl overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCategoryIcon(category)}</span>
                      <span className="font-semibold text-gray-900">{category}</span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                        {permissions.filter(p => selectedPermissions.includes(p.id)).length}/{permissions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInCategory(category, permissions);
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        {permissions.every(p => selectedPermissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                      {expandedCategories[category] ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Permissions List */}
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
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{perm.label}</p>
                            <p className="text-xs text-gray-400">{perm.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
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