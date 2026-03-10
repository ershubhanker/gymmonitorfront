import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  UserPlus,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import MemberModal from '../components/MemberModal';
import toast from 'react-hot-toast';
import api from '../services/api';

const Members = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, newThisMonth: 0 });
  const [filters, setFilters] = useState({ status: 'all', plan: 'all', gender: 'all' });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchMembers();
    fetchStats();
  }, [filters, searchTerm]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status !== 'all') params.append('status', filters.status);

      // Fetch members and their memberships + payments in parallel
      const [membersRes, membershipsRes, paymentsRes] = await Promise.all([
        api.get(`/gym/members?${params.toString()}`),
        api.get('/gym/memberships?limit=1000'),
        api.get('/gym/payments?limit=1000'),
      ]);

      const membershipsData = membershipsRes.data || [];
      const paymentsData = paymentsRes.data || [];

      const transformed = membersRes.data.map(member => {
        // Find this member's active membership
        const today = new Date().toISOString().split('T')[0];
        const activeMembership = membershipsData.find(
          ms => ms.member?.id === member.id &&
                ms.status === 'active' &&
                ms.end_date >= today
        );
        // Count how many payments this member has made
        const paymentCount = paymentsData.filter(p => p.member_id === member.id).length;

        return {
          id: member.id,
          fullName: member.full_name,
          email: member.email || '',
          phone: member.phone,
          gender: member.gender || 'male',
          joinDate: member.joined_date,
          membership: activeMembership?.plan?.name || 'No Plan',
          membershipEndDate: activeMembership?.end_date || null,
          membershipStatus: activeMembership?.status || null,
          status: member.is_active ? 'active' : 'inactive',
          lastVisit: member.last_visit || null,
          payments: paymentCount,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff`,
          // Keep raw data for edit modal
          raw: member,
        };
      });

      setMembers(transformed);
    } catch (error) {
      console.error('Error fetching members:', error.response?.data || error.message);
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/gym/dashboard/stats');
      setStats({
        total: response.data.total_members,
        active: response.data.active_members,
        newThisMonth: response.data.new_members_this_month,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddMember = async (memberData) => {
    const { plan_id, membership_start_date, payment_method, amount_paid, ...memberFields } = memberData;

    // 1. Create member
    const response = await api.post('/gym/members', memberFields);
    const memberId = response.data.id;
    let membershipLabel = 'No Plan';

    // 2. Create membership + payment if plan selected
    if (plan_id && membership_start_date) {
      try {
        const membershipResponse = await api.post('/gym/memberships', {
          member_id: memberId,
          plan_id: parseInt(plan_id),
          start_date: membership_start_date,
          amount_paid: amount_paid ? parseFloat(amount_paid) : 0,
          discount_applied: 0,
        });

        if (amount_paid && parseFloat(amount_paid) > 0) {
          await api.post('/gym/payments', {
            member_id: memberId,
            membership_id: membershipResponse.data.id,
            amount: parseFloat(amount_paid),
            payment_method: payment_method || 'cash',
          });
        }

        membershipLabel = membershipResponse.data?.plan?.name || 'Plan assigned';
      } catch (membershipError) {
        console.error('Membership creation error:', membershipError);
        toast.error('Member created but membership assignment failed. Please assign manually.');
      }
    }

    await fetchMembers();
    fetchStats();
    setIsModalOpen(false);
    toast.success('Member added successfully!');
  };

  const handleUpdateMember = async (memberData) => {
    const {
      plan_id, membership_start_date, payment_method, amount_paid,
      renew_membership,
      ...memberFields
    } = memberData;

    // 1. Update member personal details
    await api.put(`/gym/members/${selectedMember.id}`, memberFields);

    // 2. If renewing/changing membership
    if (renew_membership && plan_id && membership_start_date) {
      try {
        const membershipResponse = await api.post('/gym/memberships', {
          member_id: selectedMember.id,
          plan_id: parseInt(plan_id),
          start_date: membership_start_date,
          amount_paid: amount_paid ? parseFloat(amount_paid) : 0,
          discount_applied: 0,
        });

        if (amount_paid && parseFloat(amount_paid) > 0) {
          await api.post('/gym/payments', {
            member_id: selectedMember.id,
            membership_id: membershipResponse.data.id,
            amount: parseFloat(amount_paid),
            payment_method: payment_method || 'cash',
          });
        }

        toast.success('Membership renewed/updated successfully!');
      } catch (err) {
        console.error('Membership update error:', err);
        toast.error('Details saved but membership renewal failed.');
      }
    }

    await fetchMembers();
    fetchStats();
    setIsModalOpen(false);
    toast.success('Member updated successfully!');
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await api.delete(`/gym/members/${memberId}`);
      setMembers(members.filter(m => m.id !== memberId));
      fetchStats();
      toast.success('Member deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete member');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMembers.length} members?`)) return;
    try {
      await Promise.all(selectedMembers.map(id => api.delete(`/gym/members/${id}`)));
      setMembers(members.filter(m => !selectedMembers.includes(m.id)));
      setSelectedMembers([]);
      fetchStats();
      toast.success(`${selectedMembers.length} members deleted successfully!`);
    } catch (error) {
      toast.error('Failed to delete some members');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Membership', 'Status', 'Join Date', 'Payments'],
      ...members.map(m => [m.fullName, m.email, m.phone, m.membership, m.status, m.joinDate, m.payments])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members.csv';
    a.click();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm);
    const matchesStatus = filters.status === 'all' || member.status === filters.status;
    const matchesGender = filters.gender === 'all' || member.gender === filters.gender;
    return matchesSearch && matchesStatus && matchesGender;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedMembers.length === paginatedMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(paginatedMembers.map(m => m.id));
    }
  };

  const toggleSelectMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  // Build member object for editing (pass raw fields + current membership info)
  const openEditModal = (member) => {
    setSelectedMember({
      id: member.id,
      full_name: member.fullName,
      email: member.email,
      phone: member.phone,
      gender: member.gender,
      joined_date: member.joinDate,
      membership: member.membership,
      membershipEndDate: member.membershipEndDate,
      ...member.raw,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Active Members</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Inactive Members</p>
          <p className="text-2xl font-bold text-gray-600">{stats.total - stats.active}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
            >
              <Filter className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {selectedMembers.length > 0 && (
              <>
                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Delete Selected ({selectedMembers.length})
                </button>
                <button onClick={() => setSelectedMembers([])} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
            <button onClick={handleExport} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => { setSelectedMember(null); setIsModalOpen(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2">
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input type="checkbox"
                    checked={selectedMembers.length === paginatedMembers.length && paginatedMembers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No members found</td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleSelectMember(member.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full flex-shrink-0"
                          src={member.avatar} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                          <div className="text-sm text-gray-500">
                            Joined {new Date(member.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{member.email || '—'}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.membership}</div>
                      <div className="text-sm text-gray-500">
                        {member.payments} payment{member.payments !== 1 ? 's' : ''}
                        {member.membershipEndDate && (
                          <span className="ml-1">
                            · expires {new Date(member.membershipEndDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.lastVisit ? new Date(member.lastVisit).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openEditModal(member)} className="text-blue-600 hover:text-blue-900 mr-3">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteMember(member.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of{' '}
              {filteredMembers.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Modal */}
      <MemberModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedMember(null); }}
        onSave={selectedMember ? handleUpdateMember : handleAddMember}
        member={selectedMember}
      />
    </div>
  );
};

export default Members;