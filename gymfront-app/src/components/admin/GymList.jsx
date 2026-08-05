// src/components/admin/GymList.jsx
import React, { useState } from 'react';
import { Building2, ExternalLink, Edit, Trash2, Search, ChevronRight, Filter, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatDate, statusBadge } from '../../services/adminHelpers';

const GymList = ({ gyms, onGymClick, onEdit, onDelete, onBulkDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedGyms, setSelectedGyms] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const filteredGyms = gyms.filter(g =>
    (g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     g.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     g.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || g.subscription_status === filterStatus)
  );

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedGyms([]);
    } else {
      setSelectedGyms(filteredGyms.map(g => g.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectGym = (id) => {
    setSelectedGyms(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedGyms.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedGyms.length} selected gyms?`)) {
      onBulkDelete(selectedGyms);
      setSelectedGyms([]);
      setSelectAll(false);
    }
  };

  const totalRevenue = filteredGyms.reduce((acc, g) => acc + (g.monthly_revenue || 0), 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header with Search and Bulk Actions */}
      <div className="px-5 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search gyms..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedGyms.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedGyms.length})
            </button>
          )}
          <span className="text-xs text-gray-500">
            {filteredGyms.length} gyms · Revenue: {formatCurrency(totalRevenue)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800/80 border-b border-gray-700">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectAll && filteredGyms.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Gym</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Members</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredGyms.map(gym => (
              <tr key={gym.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedGyms.includes(gym.id)}
                    onChange={() => handleSelectGym(gym.id)}
                    className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => onGymClick(gym.id, gym.name)}
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
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => onEdit(gym)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg border border-blue-800/50 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button 
                      onClick={() => onDelete(gym.id, gym.name)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredGyms.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No gyms found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GymList;