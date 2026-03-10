import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, Edit, Trash2, Phone, Mail,
  Briefcase, ChevronLeft, ChevronRight, X, RefreshCw
} from 'lucide-react';
import { X as CloseIcon, User, Camera, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import StaffUserSetup from '../components/StaffUserSetup'; // Import the new component

// ─── Staff Modal (for editing only) ───────────────────────────────────────
const StaffEditModal = ({ isOpen, onClose, onSave, staff = null }) => {
  const [formData, setFormData] = useState({
    position: staff?.position || '',
    hireDate: staff?.hire_date || new Date().toISOString().split('T')[0],
    salary: staff?.salary || '',
    specializations: staff?.specializations || '',
    status: staff?.is_active ? 'active' : 'inactive',
  });

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(staff.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving staff:', error);
    } finally {
      setSaving(false);
    }
  };

  const positions = [
    'Head Trainer', 'Personal Trainer', 'Yoga Instructor', 'Spin Instructor',
    'Group Fitness Instructor', 'Nutritionist', 'Physiotherapist',
    'Receptionist', 'Manager', 'Cleanliness Staff',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Edit Staff Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Position</option>
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
            <input
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary (Monthly ₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializations</label>
            <textarea
              value={formData.specializations}
              onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
              rows="3"
              placeholder="e.g., HIIT, Yoga, Strength Training"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Staff Page ─────────────────────────────────────────────────────────────
const Staff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const response = await api.get(`/gym/staff?${params.toString()}`);
      setStaffList(response.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchStaff();
  };

  const handleAddSuccess = () => {
    fetchStaff();
  };

  const handleUpdateStaff = async (staffId, formData) => {
    try {
      await api.put(`/gym/staff/${staffId}`, {
        position: formData.position,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        specializations: formData.specializations,
        is_active: formData.status === 'active',
        hire_date: formData.hireDate,
      });
      toast.success('Staff updated successfully!');
      fetchStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to update staff');
      throw error;
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await api.delete(`/gym/staff/${staffId}`);
      setStaffList(staffList.filter(s => s.id !== staffId));
      toast.success('Staff removed successfully!');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove staff');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Reset password to default (Staff@123)?')) return;
    try {
      // This endpoint would need to be implemented on the backend
      await api.post(`/users/${userId}/reset-password`, { new_password: 'Staff@123' });
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const filteredStaff = staffList.filter(s => {
    const name = s.user?.full_name || '';
    const email = s.user?.email || '';
    const pos = s.position || '';
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || pos.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginated = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900">{staffList.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{staffList.filter(s => s.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">On Leave / Inactive</p>
          <p className="text-2xl font-bold text-yellow-600">{staffList.filter(s => !s.is_active).length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, email or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Search
          </button>
          <button
            onClick={() => { setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Staff Member', 'Contact', 'Position', 'Hire Date', 'Salary', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'No staff found matching your search.' : 'No staff members yet. Click "Add Staff" to get started.'}
                </td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700 font-semibold text-sm">
                          {(s.user?.full_name || 'S').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.user?.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">@{s.user?.username || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {s.user?.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3 flex-shrink-0" /> 
                          <span className="truncate max-w-[150px]">{s.user.email}</span>
                        </div>
                      )}
                      {s.user?.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3 flex-shrink-0" /> 
                          <span>{s.user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-800">{s.position || '—'}</div>
                    {s.specializations && (
                      <p className="text-xs text-gray-500 mt-0.5 max-w-[160px] truncate" title={s.specializations}>
                        {s.specializations}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.hire_date ? new Date(s.hire_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.salary ? `₹${s.salary.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedStaff(s);
                        setIsEditModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(s.user_id)}
                      className="text-orange-600 hover:text-orange-900 mr-2"
                      title="Reset Password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length}
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal - Uses the new StaffUserSetup component */}
      <StaffUserSetup
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Staff Modal */}
      <StaffEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        onSave={handleUpdateStaff}
        staff={selectedStaff}
      />
    </div>
  );
};

export default Staff;