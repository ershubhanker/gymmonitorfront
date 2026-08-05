// src/components/admin/GymDetails.jsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, MailIcon, PhoneIcon, MapPin, Clock, 
  BarChart3, Shield, Award, CreditCard, DollarSign, Wallet,
  Users, Building2, Loader2, Edit, Trash2, ExternalLink,
  Search, X, ChevronRight, Calendar, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, statusBadge } from '../../services/adminHelpers';

const DetailSection = ({ title, icon, children }) => (
  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
    <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/80">
      {icon}
      <h3 className="font-semibold text-white text-sm">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const DetailItem = ({ label, value, className = '' }) => (
  <div className={`flex justify-between py-1.5 border-b border-gray-700/50 last:border-0 ${className}`}>
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-sm text-white font-medium">{value || '—'}</span>
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color = 'green' }) => {
  const colors = {
    green: 'border-green-500 bg-green-900/20 text-green-400',
    orange: 'border-orange-500 bg-orange-900/20 text-orange-400',
    yellow: 'border-yellow-500 bg-yellow-900/20 text-yellow-400',
    pink: 'border-pink-500 bg-pink-900/20 text-pink-400',
    red: 'border-red-500 bg-red-900/20 text-red-400',
    purple: 'border-purple-500 bg-purple-900/20 text-purple-400',
  };
  return (
    <div className={`bg-gray-800 rounded-2xl p-5 border-l-4 ${colors[color]}`}>
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
    </div>
  );
};

const GymDetails = ({ gymId, gym, loading, onBack, onEdit, onDelete, onMemberEdit, onStaffEdit, onPlanEdit }) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);

  useEffect(() => {
    if (gym?.members) {
      const search = memberSearch.toLowerCase();
      if (search) {
        setFilteredMembers(
          gym.members.filter(m =>
            m.full_name?.toLowerCase().includes(search) ||
            m.email?.toLowerCase().includes(search) ||
            m.phone?.includes(search)
          )
        );
      } else {
        setFilteredMembers(gym.members);
      }
    }
  }, [memberSearch, gym]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
        <p className="text-gray-400 mt-3 text-sm">Loading gym details...</p>
      </div>
    );
  }

  if (!gym) return null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Gyms
      </button>

      {/* Gym Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {gym.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{gym.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`px-2.5 py-0.5 text-xs rounded-full ${statusBadge(gym.subscription_status)}`}>
                  {gym.subscription_status}
                </span>
                <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium capitalize ${statusBadge(gym.subscription_plan)}`}>
                  {gym.subscription_plan}
                </span>
                {gym.is_active ? (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                    Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-red-900/60 text-red-300 border border-red-700">
                    Inactive
                  </span>
                )}
              </div>
              {gym.description && (
                <p className="text-sm text-gray-300 mt-2 max-w-2xl">{gym.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(gym)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(gym.id, gym.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-purple-800/30">
          <div className="flex items-center gap-2">
            <MailIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-300">{gym.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-300">{gym.phone || 'No phone'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-300 truncate">{gym.address || 'No address'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-300">
              {gym.opening_time && gym.closing_time 
                ? `${gym.opening_time} - ${gym.closing_time}`
                : 'Hours not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={User} label="Members" value={gym.members?.length || 0}
          sub={`${gym.members?.filter(m => m.is_active).length || 0} active`} color="green" />
        <StatCard icon={Shield} label="Staff" value={gym.total_staff || 0}
          sub={`${gym.active_staff || 0} active`} color="orange" />
        <StatCard icon={Award} label="Plans" value={gym.plans?.length || 0}
          sub="membership plans" color="yellow" />
        <StatCard icon={CreditCard} label="Memberships" value={gym.stats?.total_memberships || 0}
          sub="active memberships" color="pink" />
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(gym.monthly_revenue || 0)}
          sub="monthly revenue" color="green" />
        <StatCard icon={Wallet} label="Expenses" value={formatCurrency(gym.stats?.total_expenses || 0)}
          sub="total expenses" color="red" />
      </div>

      {/* Gym Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailSection title="Gym Owner" icon={<User className="h-4 w-4 text-blue-400" />}>
          {gym.owner ? (
            <div className="space-y-1">
              <DetailItem label="Name" value={gym.owner.name} />
              <DetailItem label="Email" value={gym.owner.email} />
              <DetailItem label="Phone" value={gym.owner.phone || '—'} />
              <DetailItem label="Username" value={gym.owner.username || '—'} />
              <DetailItem label="Status" value={
                <span className={gym.owner.is_verified ? 'text-emerald-400' : 'text-amber-400'}>
                  {gym.owner.is_verified ? '✅ Verified' : '⏳ Pending Verification'}
                </span>
              } />
              <DetailItem label="Joined" value={formatDate(gym.owner.joined_at)} />
              {gym.owner.last_login && (
                <DetailItem label="Last Login" value={formatDateTime(gym.owner.last_login)} />
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No owner information available</p>
          )}
        </DetailSection>

        <DetailSection title="Gym Statistics" icon={<BarChart3 className="h-4 w-4 text-teal-400" />}>
          {gym.stats && (
            <div className="space-y-1">
              <DetailItem label="Total Members" value={gym.stats.total_members || 0} />
              <DetailItem label="Active Members" value={gym.stats.active_members || 0} />
              <DetailItem label="Total Staff" value={gym.stats.total_staff || 0} />
              <DetailItem label="Active Staff" value={gym.stats.active_staff || 0} />
              <DetailItem label="Total Plans" value={gym.stats.total_plans || 0} />
              <DetailItem label="Monthly Revenue" value={formatCurrency(gym.monthly_revenue || 0)} />
            </div>
          )}
        </DetailSection>
      </div>

      {/* Staff Section */}
      <DetailSection title="Staff Members" icon={<Shield className="h-4 w-4 text-orange-400" />}>
        {gym.staff && gym.staff.length > 0 ? (
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
                {gym.staff.map(s => (
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
                        onClick={() => onStaffEdit(s)}
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
        {gym.plans && gym.plans.length > 0 ? (
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
                {gym.plans.map(p => (
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
                        onClick={() => onPlanEdit(p)}
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
        {/* Member Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
          />
          {memberSearch && (
            <button
              onClick={() => setMemberSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filteredMembers.length > 0 ? (
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
                {filteredMembers.slice(0, 50).map(m => (
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
                        onClick={() => onMemberEdit(m)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMembers.length > 50 && (
              <p className="text-xs text-gray-500 mt-2">Showing first 50 of {filteredMembers.length} members</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            {memberSearch ? 'No members match your search' : 'No members found in this gym'}
          </p>
        )}
      </DetailSection>

      {/* Recent Payments Section */}
      <DetailSection title="Recent Payments" icon={<DollarSign className="h-4 w-4 text-emerald-400" />}>
        {gym.recent_payments && gym.recent_payments.length > 0 ? (
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
                {gym.recent_payments.map(p => (
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
    </div>
  );
};

export default GymDetails;