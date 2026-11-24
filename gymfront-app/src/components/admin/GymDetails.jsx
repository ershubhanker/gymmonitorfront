// src/components/admin/GymDetails.jsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, UserPlus, MailIcon, PhoneIcon, MapPin, Clock, 
  BarChart3, Shield, Award, CreditCard, DollarSign, Wallet,
  Users, Building2, Loader2, Edit, Trash2, ExternalLink,
  Search, X, ChevronRight, Calendar, AlertCircle, Crown, IndianRupee,
  MessageSquare, Play, Pause, PauseCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, statusBadge } from '../../services/adminHelpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

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
    <div className={`bg-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border-l-4 ${colors[color]}`}>
      <div className={`inline-flex p-2 sm:p-2.5 rounded-lg sm:rounded-xl mb-2 sm:mb-3 ${colors[color]}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <p className="text-gray-400 text-xs sm:text-sm truncate">{label}</p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-0.5 sm:mt-1 truncate">{value}</p>
      {sub && <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 truncate">{sub}</p>}
    </div>
  );
};

const GymDetails = ({ 
  gymId, 
  gym, 
  loading, 
  onBack, 
  onEdit, 
  onDelete, 
  onMemberEdit, 
  onMemberDelete,
  onMemberBulkDelete,
  onLeadEdit,
  onLeadDelete,
  onLeadBulkDelete,
  onStaffEdit, 
  onStaffDelete,
  onPlanEdit, 
  onPlanDelete,
  onSoftwarePlanEdit 
}) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Leads state
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [showAllLeads, setShowAllLeads] = useState(false);

  const [togglingWhatsApp, setTogglingWhatsApp] = useState(false);
  const [currentGym, setCurrentGym] = useState(gym);

  useEffect(() => {
    setCurrentGym(gym);
  }, [gym]);

  const handleToggleWhatsAppService = async (enable) => {
    if (!currentGym?.id) return;
    setTogglingWhatsApp(true);
    try {
      const res = await api.post(`/admin/whatsapp/toggle-service/${currentGym.id}`, { enabled: enable });
      toast.success(res.data?.message || `WhatsApp service ${enable ? 'started' : 'stopped'}`);
      setCurrentGym(prev => ({ ...prev, whatsapp_status: res.data?.whatsapp_status }));
    } catch (err) {
      console.error('Failed to toggle WhatsApp service:', err);
      toast.error(err.response?.data?.detail || 'Failed to toggle WhatsApp service');
    } finally {
      setTogglingWhatsApp(false);
    }
  };

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
    } else {
      setFilteredMembers([]);
    }
  }, [memberSearch, gym]);

  // Filter leads based on search & status
  useEffect(() => {
    if (gym?.leads) {
      let list = gym.leads;
      if (leadStatusFilter !== 'all') {
        list = list.filter(l => l.status === leadStatusFilter);
      }
      const search = leadSearch.toLowerCase().trim();
      if (search) {
        list = list.filter(l =>
          l.full_name?.toLowerCase().includes(search) ||
          l.email?.toLowerCase().includes(search) ||
          l.phone?.includes(search) ||
          l.interest?.toLowerCase().includes(search) ||
          l.preferred_plan?.toLowerCase().includes(search) ||
          l.source?.toLowerCase().includes(search)
        );
      }
      setFilteredLeads(list);
    } else {
      setFilteredLeads([]);
    }
  }, [leadSearch, leadStatusFilter, gym?.leads]);

  const visibleMembers = showAllMembers ? filteredMembers : filteredMembers.slice(0, 50);
  const visibleLeads = showAllLeads ? filteredLeads : filteredLeads.slice(0, 50);

  const toggleSelectMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleMembers.map(m => m.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedMemberIds.includes(id));
    if (allSelected) {
      setSelectedMemberIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectLead = (id) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLeads = () => {
    const visibleIds = visibleLeads.map(l => l.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

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
      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
              {gym.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{gym.name}</h2>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
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
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <button
              onClick={() => onSoftwarePlanEdit && onSoftwarePlanEdit(gym)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-purple-900/40"
            >
              <Crown className="h-3.5 w-3.5" /> Plan
            </button>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        <StatCard icon={User} label="Members" value={gym.members?.length || 0}
          sub={`${gym.members?.filter(m => m.is_active).length || 0} active`} color="green" />
        <StatCard icon={UserPlus} label="Leads" value={gym.leads?.length || gym.stats?.total_leads || 0}
          sub={`${gym.leads?.filter(l => l.status === 'new' || l.status === 'contacted').length || 0} active/new`} color="purple" />
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

      {/* Software Plan & Pricing Overview */}
      <div className="bg-gradient-to-r from-purple-950/60 via-gray-900 to-indigo-950/60 border border-purple-800/60 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-purple-600 rounded-xl text-white shadow-lg shadow-purple-900/30">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Gym Software Subscription
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize bg-purple-900/60 text-purple-300 border border-purple-700/50">
                  {gym.software_plan_type ? `${gym.software_plan_type} Plan` : 'Free Plan'}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Software plan type, custom pricing, and validity period for this gym
              </p>
            </div>
          </div>

          <button
            onClick={() => onSoftwarePlanEdit && onSoftwarePlanEdit(gym)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto shadow-md shadow-purple-900/30"
          >
            <Crown className="h-4 w-4" /> Change Plan & Price
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div>
            <span className="text-xs text-gray-400 block mb-1">Custom Plan Price</span>
            <span className="text-lg font-bold text-white flex items-center gap-1">
              <IndianRupee className="h-4 w-4 text-amber-400" />
              {gym.software_plan_price != null
                ? Number(gym.software_plan_price).toLocaleString('en-IN')
                : '0'}
              <span className="text-xs font-normal text-gray-400">
                {gym.software_plan_type === 'yearly' ? '/year' : gym.software_plan_type === 'monthly' ? '/month' : ''}
              </span>
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">Plan Start Date</span>
            <span className="text-sm font-semibold text-gray-200">
              {gym.software_plan_start_date ? formatDate(gym.software_plan_start_date) : 'Not specified'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">Plan End Date</span>
            <span className="text-sm font-semibold text-gray-200">
              {gym.software_plan_end_date ? formatDate(gym.software_plan_end_date) : 'No expiration (Free)'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">Validity / Status</span>
            {(() => {
              if (!gym.software_plan_end_date) {
                return <span className="text-xs font-medium text-emerald-400">Active (Continuous)</span>;
              }
              const end = new Date(gym.software_plan_end_date);
              const now = new Date();
              const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                return <span className="text-xs font-semibold text-red-400">Expired ({Math.abs(diffDays)}d ago)</span>;
              }
              if (diffDays <= 3) {
                return <span className="text-xs font-bold text-amber-300 animate-pulse">Ending Soon ({diffDays}d left)</span>;
              }
              return <span className="text-xs font-semibold text-emerald-300">Active ({diffDays}d remaining)</span>;
            })()}
          </div>
        </div>
      </div>

      {/* WhatsApp Business API Integration & Service Control */}
      {(currentGym.whatsapp_phone_number || currentGym.whatsapp_waba_id || currentGym.whatsapp_phone_number_id) && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-gray-900 to-indigo-950/40 border border-emerald-800/50 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-900/30">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  WhatsApp Business API Service
                  {currentGym.whatsapp_status === 'paused' ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-800/70 flex items-center gap-1">
                      <PauseCircle className="h-3 w-3 text-amber-400" /> Service Stopped
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-800/70 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Service Active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400">
                  Automated WhatsApp invoices, renewals, and reminders for this gym
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggleWhatsAppService(currentGym.whatsapp_status === 'paused')}
              disabled={togglingWhatsApp}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-md disabled:opacity-50 self-start sm:self-auto ${
                currentGym.whatsapp_status === 'paused'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
              }`}
            >
              {togglingWhatsApp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentGym.whatsapp_status === 'paused' ? (
                <Play className="h-4 w-4 fill-current" />
              ) : (
                <Pause className="h-4 w-4 fill-current" />
              )}
              <span>{currentGym.whatsapp_status === 'paused' ? 'Start WhatsApp Service' : 'Stop WhatsApp Service'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">WhatsApp Number</span>
              <span className="font-mono font-semibold text-white">
                {currentGym.whatsapp_phone_number || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Phone Number ID</span>
              <span className="font-mono text-gray-300">
                {currentGym.whatsapp_phone_number_id || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">WABA ID</span>
              <span className="font-mono text-gray-300">
                {currentGym.whatsapp_waba_id || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Connected Since</span>
              <span className="text-gray-300">
                {currentGym.whatsapp_connected_at ? formatDate(currentGym.whatsapp_connected_at) : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

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
              <DetailItem label="Total Leads" value={gym.leads?.length || gym.stats?.total_leads || 0} />
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
            <table className="w-full min-w-[600px] text-sm">
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
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {onStaffEdit && (
                          <button
                            onClick={() => onStaffEdit(s)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg border border-blue-800/50 transition-colors"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                        )}
                        {onStaffDelete && (
                          <button
                            onClick={() => onStaffDelete(s)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Del
                          </button>
                        )}
                      </div>
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
            <table className="w-full min-w-[600px] text-sm">
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
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {onPlanEdit && (
                          <button
                            onClick={() => onPlanEdit(p)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg border border-blue-800/50 transition-colors"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                        )}
                        {onPlanDelete && (
                          <button
                            onClick={() => onPlanDelete(p)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Del
                          </button>
                        )}
                      </div>
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
        {/* Member Search & Selection Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members by name, email, or phone..."
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
          {selectedMemberIds.length > 0 && (
            <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-800/60 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <span className="text-xs text-purple-200">
                <strong className="text-white font-semibold">{selectedMemberIds.length}</strong> selected
              </span>
              <button
                onClick={() => setSelectedMemberIds([])}
                className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-gray-800"
              >
                Clear
              </button>
              {onMemberBulkDelete && (
                <button
                  onClick={() => {
                    onMemberBulkDelete(selectedMemberIds);
                    setSelectedMemberIds([]);
                  }}
                  className="flex items-center gap-1 text-xs text-white bg-red-600 hover:bg-red-500 px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Selected
                </button>
              )}
            </div>
          )}
        </div>

        {filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2 pr-3 w-8">
                    <input
                      type="checkbox"
                      checked={visibleMembers.length > 0 && visibleMembers.every(m => selectedMemberIds.includes(m.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700 cursor-pointer"
                    />
                  </th>
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
                {visibleMembers.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-800/30 transition-colors ${selectedMemberIds.includes(m.id) ? 'bg-purple-950/20' : ''}`}>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(m.id)}
                        onChange={() => toggleSelectMember(m.id)}
                        className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 pr-4 text-white font-medium">{m.full_name}</td>
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
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {onMemberEdit && (
                          <button
                            onClick={() => onMemberEdit(m)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg border border-blue-800/50 transition-colors"
                            title="Edit Member"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                        )}
                        {onMemberDelete && (
                          <button
                            onClick={() => onMemberDelete(m)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors"
                            title="Delete Member"
                          >
                            <Trash2 className="h-3 w-3" /> Del
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMembers.length > 50 && (
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <p>
                  Showing {visibleMembers.length} of {filteredMembers.length} members
                </p>
                <button
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  {showAllMembers ? 'Show first 50 members' : `Show all ${filteredMembers.length} members`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            {memberSearch ? 'No members match your search' : 'No members found in this gym'}
          </p>
        )}
      </DetailSection>

      {/* Leads Section */}
      <DetailSection title={`Leads (${filteredLeads.length})`} icon={<UserPlus className="h-4 w-4 text-purple-400" />}>
        {/* Lead Search, Filter & Selection Toolbar */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                placeholder="Search leads by name, email, phone, or interest..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              />
              {leadSearch && (
                <button
                  onClick={() => setLeadSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {selectedLeadIds.length > 0 && (
              <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-800/60 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <span className="text-xs text-purple-200">
                  <strong className="text-white font-semibold">{selectedLeadIds.length}</strong> selected
                </span>
                <button
                  onClick={() => setSelectedLeadIds([])}
                  className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-gray-800"
                >
                  Clear
                </button>
                {onLeadBulkDelete && (
                  <button
                    onClick={() => {
                      onLeadBulkDelete(selectedLeadIds);
                      setSelectedLeadIds([]);
                    }}
                    className="flex items-center gap-1 text-xs text-white bg-red-600 hover:bg-red-500 px-2.5 py-1 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Selected
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-hide">
            {[
              { id: 'all', label: `All (${gym.leads?.length || 0})` },
              { id: 'new', label: 'New' },
              { id: 'contacted', label: 'Contacted' },
              { id: 'trial_scheduled', label: 'Trial Scheduled' },
              { id: 'trial_completed', label: 'Trial Done' },
              { id: 'converted', label: 'Converted' },
              { id: 'lost', label: 'Lost' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setLeadStatusFilter(pill.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  leadStatusFilter === pill.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2 pr-3 w-8">
                    <input
                      type="checkbox"
                      checked={visibleLeads.length > 0 && visibleLeads.every(l => selectedLeadIds.includes(l.id))}
                      onChange={toggleSelectAllLeads}
                      className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700 cursor-pointer"
                    />
                  </th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Phone</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Interest / Plan</th>
                  <th className="pb-2 pr-4 font-medium">Next Follow-up</th>
                  <th className="pb-2 pr-4 font-medium">Created</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {visibleLeads.map(l => (
                  <tr key={l.id} className={`hover:bg-gray-800/30 transition-colors ${selectedLeadIds.includes(l.id) ? 'bg-purple-950/20' : ''}`}>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(l.id)}
                        onChange={() => toggleSelectLead(l.id)}
                        className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {l.full_name?.charAt(0) || 'L'}
                        </div>
                        <span className="text-white font-medium">{l.full_name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-300 font-mono text-xs">{l.phone}</td>
                    <td className="py-2 pr-4 text-gray-400 text-xs">{l.email || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${statusBadge(l.status)}`}>
                        {l.status ? l.status.replace('_', ' ') : 'new'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-300 text-xs capitalize">
                      {l.source ? l.source.replace('_', ' ') : 'walk-in'}
                    </td>
                    <td className="py-2 pr-4 text-gray-300 text-xs">
                      {l.interest || l.preferred_plan || '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs text-amber-400 whitespace-nowrap">
                      {l.next_follow_up ? formatDate(l.next_follow_up) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {onLeadEdit && (
                          <button
                            onClick={() => onLeadEdit(l)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg border border-blue-800/50 transition-colors"
                            title="Edit Lead"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                        )}
                        {onLeadDelete && (
                          <button
                            onClick={() => onLeadDelete(l)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-3 w-3" /> Del
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLeads.length > 50 && (
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <p>
                  Showing {visibleLeads.length} of {filteredLeads.length} leads
                </p>
                <button
                  onClick={() => setShowAllLeads(!showAllLeads)}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  {showAllLeads ? 'Show first 50 leads' : `Show all ${filteredLeads.length} leads`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            {leadSearch || leadStatusFilter !== 'all' ? 'No leads match your filter or search' : 'No leads found in this gym'}
          </p>
        )}
      </DetailSection>

      {/* Recent Payments Section */}
      <DetailSection title="Recent Payments" icon={<DollarSign className="h-4 w-4 text-emerald-400" />}>
        {gym.recent_payments && gym.recent_payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-sm">
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