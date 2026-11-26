// src/components/admin/WhatsAppAccountsManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Building2, Phone, CheckCircle2, AlertTriangle,
  RefreshCw, Search, Copy, Check, ExternalLink, Shield, Globe,
  Link as LinkIcon, Unlink, Key, ArrowRight, X, Loader2, Sparkles,
  PhoneCall, Hash, Info, Smartphone, ChevronDown, Play, Pause,
  PauseCircle, PlayCircle, Power, Send
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function SearchableGymInput({
  gyms = [],
  value,
  onChange,
  placeholder = 'Type to search gym by name, ID, or phone...',
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = React.useRef(null);

  const selectedGym = gyms.find((g) => String(g.id) === String(value));

  useEffect(() => {
    if (selectedGym) {
      setSearchTerm(selectedGym.name || '');
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value, selectedGym]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGyms = gyms.filter((g) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (g.name || '').toLowerCase().includes(q);
    const idMatch = String(g.id).includes(q);
    const phoneMatch = (g.phone || '').includes(q) || (g.whatsapp_phone_number || '').includes(q);
    return nameMatch || idMatch || phoneMatch;
  });

  const handleSelect = (gym) => {
    onChange(String(gym.id));
    setSearchTerm(gym.name || '');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (value && e.target.value !== selectedGym?.name) {
              onChange('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required && !value}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md"
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 divide-y divide-gray-700/50">
          {filteredGyms.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              No gyms found matching "{searchTerm}"
            </div>
          ) : (
            filteredGyms.map((g) => {
              const isSelected = String(g.id) === String(value);
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => handleSelect(g)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors hover:bg-gray-700/70 ${
                    isSelected ? 'bg-purple-900/40 text-purple-200' : 'text-gray-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{g.name}</span>
                      <span className="text-gray-400 font-mono text-[11px]">(ID: #{g.id})</span>
                    </div>
                    {(g.phone || g.whatsapp_phone_number) && (
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5 pl-5 truncate">
                        Phone: {g.whatsapp_phone_number || g.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {g.is_linked_here && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Linked
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-purple-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function WhatsAppAccountsManager({ onSelectGym }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    business_id: '',
    total_count: 0,
    linked_count: 0,
    unlinked_count: 0,
    accounts: [],
    gyms: [],
    error: null,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, linked, unlinked
  const [copiedText, setCopiedText] = useState(null);

  // Link Modal State
  const [linkModalAccount, setLinkModalAccount] = useState(null);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [selectedPhoneId, setSelectedPhoneId] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);

  // Register Phone Modal State
  const [registerModalPhone, setRegisterModalPhone] = useState(null);
  const [registrationPin, setRegistrationPin] = useState('123456');
  const [submittingRegister, setSubmittingRegister] = useState(false);

  // Unlink State
  const [unlinkingGymId, setUnlinkingGymId] = useState(null);
  const [subscribingWabaId, setSubscribingWabaId] = useState(null);

  // Exchange Code Modal State
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeCode, setExchangeCode] = useState('');
  const [exchangeRedirectUri, setExchangeRedirectUri] = useState('');
  const [exchangeGymId, setExchangeGymId] = useState('');
  const [submittingExchange, setSubmittingExchange] = useState(false);

  // Toggle Service State
  const [togglingServiceGymId, setTogglingServiceGymId] = useState(null);

  // Set Active Phone State
  const [settingActivePhoneId, setSettingActivePhoneId] = useState(null);

  const fetchAccounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/admin/whatsapp/client-accounts');
      if (res.data) {
        setData(res.data);
        if (res.data.error) {
          toast.error(`Meta API: ${res.data.error}`);
        } else if (isRefresh) {
          toast.success('Client WhatsApp Accounts synced from Meta!');
        }
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp client accounts:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to load accounts';
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const copyToClipboard = (text, label = 'Copied') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleToggleService = async (gymId, enable) => {
    setTogglingServiceGymId(gymId);
    try {
      const res = await api.post(`/admin/whatsapp/toggle-service/${gymId}`, { enabled: enable });
      toast.success(res.data?.message || `WhatsApp service ${enable ? 'started' : 'stopped'}`);
      fetchAccounts(true);
    } catch (err) {
      console.error('Error toggling WhatsApp service:', err);
      toast.error(err.response?.data?.detail || 'Failed to toggle service');
    } finally {
      setTogglingServiceGymId(null);
    }
  };

  // Open Link Modal
  const openLinkModal = (account) => {
    setLinkModalAccount(account);
    const phones = account.phone_numbers || [];
    setSelectedPhoneId(phones.length > 0 ? phones[0].id : '');
    // If account has a gym suggested or matching name, pre-select
    const matchingGym = data.gyms?.find(
      (g) => g.name?.toLowerCase() === account.name?.toLowerCase()
    );
    setSelectedGymId(matchingGym ? String(matchingGym.id) : '');
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGymId) {
      toast.error('Please select a Gym to link');
      return;
    }

    setSubmittingLink(true);
    try {
      const selectedPhone = linkModalAccount.phone_numbers?.find((p) => p.id === selectedPhoneId);
      const payload = {
        gym_id: parseInt(selectedGymId, 10),
        waba_id: linkModalAccount.waba_id,
        phone_number_id: selectedPhoneId || null,
        phone_number: selectedPhone?.display_phone_number || null,
        display_name: selectedPhone?.verified_name || linkModalAccount.name,
        business_id: linkModalAccount.owner_business_info?.id || null,
      };

      const res = await api.post('/admin/whatsapp/link-waba', payload);
      toast.success(res.data?.message || 'WABA linked successfully!');
      setLinkModalAccount(null);
      fetchAccounts(true);
    } catch (err) {
      console.error('Error linking WABA:', err);
      toast.error(err.response?.data?.detail || 'Failed to link WABA');
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleUnlink = async (gymId, gymName) => {
    if (!window.confirm(`Are you sure you want to unlink WhatsApp from gym "${gymName}"?`)) {
      return;
    }

    setUnlinkingGymId(gymId);
    try {
      const res = await api.post(`/admin/whatsapp/unlink-waba/${gymId}`);
      toast.success(res.data?.message || 'Unlinked successfully');
      fetchAccounts(true);
    } catch (err) {
      console.error('Error unlinking WABA:', err);
      toast.error(err.response?.data?.detail || 'Failed to unlink');
    } finally {
      setUnlinkingGymId(null);
    }
  };

  const handleSubscribe = async (wabaId) => {
    setSubscribingWabaId(wabaId);
    try {
      const res = await api.post(`/admin/whatsapp/subscribe-waba/${wabaId}`);
      toast.success(res.data?.message || 'Webhook subscribed successfully');
    } catch (err) {
      console.error('Error subscribing webhook:', err);
      toast.error(err.response?.data?.detail || 'Failed to subscribe webhook');
    } finally {
      setSubscribingWabaId(null);
    }
  };

  const handleSetActivePhone = async (gymId, phoneId, wabaId) => {
    setSettingActivePhoneId(phoneId);
    try {
      const res = await api.post('/admin/whatsapp/set-gym-phone', {
        gym_id: gymId,
        phone_number_id: phoneId,
        waba_id: wabaId,
      });
      toast.success(res.data?.message || 'Active sending number updated successfully!');
      fetchAccounts(true);
    } catch (err) {
      console.error('Error setting active phone number:', err);
      toast.error(err.response?.data?.detail || 'Failed to set active sending number');
    } finally {
      setSettingActivePhoneId(null);
    }
  };

  const handleRegisterPhone = async (e) => {
    e.preventDefault();
    if (!registerModalPhone?.id) return;

    setSubmittingRegister(true);
    try {
      const payload = {
        phone_number_id: registerModalPhone.id,
        pin: registrationPin || '123456',
        gym_id: registerModalPhone.gymId || null,
      };
      const res = await api.post('/admin/whatsapp/register-number', payload);
      toast.success(res.data?.message || 'Phone number registered with Meta!');
      setRegisterModalPhone(null);
      fetchAccounts(true);
    } catch (err) {
      console.error('Error registering phone number:', err);
      toast.error(err.response?.data?.detail || 'Failed to register number with Meta');
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    if (!exchangeCode.trim()) {
      toast.error('Please enter the authorization code');
      return;
    }

    setSubmittingExchange(true);
    try {
      const payload = {
        code: exchangeCode.trim(),
        redirect_uri: exchangeRedirectUri.trim() || null,
        gym_id: exchangeGymId ? parseInt(exchangeGymId, 10) : null,
      };
      const res = await api.post('/admin/whatsapp/exchange-code', payload);
      toast.success(res.data?.message || 'Code exchanged successfully!');
      setShowExchangeModal(false);
      setExchangeCode('');
      setExchangeRedirectUri('');
      setExchangeGymId('');
      fetchAccounts(true);
    } catch (err) {
      console.error('Exchange code error:', err);
      toast.error(err.response?.data?.detail || 'Failed to exchange code');
    } finally {
      setSubmittingExchange(false);
    }
  };

  // Filter accounts
  const filteredAccounts = (data.accounts || []).filter((acc) => {
    if (filterStatus === 'linked' && !acc.linked_gym) return false;
    if (filterStatus === 'unlinked' && acc.linked_gym) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();

    const matchesName = acc.name?.toLowerCase().includes(q);
    const matchesWaba = acc.waba_id?.toLowerCase().includes(q);
    const matchesOwner = acc.owner_business_info?.name?.toLowerCase().includes(q);
    const matchesGym = acc.linked_gym?.name?.toLowerCase().includes(q);
    const matchesPhone = acc.phone_numbers?.some(
      (p) =>
        p.display_phone_number?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.verified_name?.toLowerCase().includes(q)
    );

    return matchesName || matchesWaba || matchesOwner || matchesGym || matchesPhone;
  });

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER & STATS ── */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-gray-900 border border-purple-800/40 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Client WhatsApp Accounts</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  Tech Provider API v25.0
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Manage all Meta WhatsApp Business Accounts (WABAs) shared with your Solution Partner Business ID:
                <span className="ml-1.5 font-mono text-xs px-2 py-0.5 bg-gray-800 text-purple-300 rounded border border-gray-700">
                  {data.business_id || '405173550900533'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExchangeModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-300 rounded-xl text-sm font-medium transition-colors border border-purple-500/40 shadow-md"
              title="Exchange an authorization code from Meta Developer Console or Embedded Signup"
            >
              <Key className="h-4 w-4" />
              <span>Exchange Auth Code</span>
            </button>

            <button
              onClick={() => fetchAccounts(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-purple-900/30 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync from Meta'}</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Total Meta WABAs</p>
              <p className="text-2xl font-bold text-white mt-1">{data.total_count || 0}</p>
            </div>
            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400">
              <Hash className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Linked to Gyms</p>
              <p className="text-2xl font-bold text-sky-400 mt-1">{data.linked_count || 0}</p>
            </div>
            <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Service Active</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {(data.accounts || []).filter(a => a.linked_gym && a.linked_gym.whatsapp_status !== 'paused').length}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Service Stopped</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {(data.accounts || []).filter(a => a.linked_gym && a.linked_gym.whatsapp_status === 'paused').length}
              </p>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400">
              <Pause className="h-5 w-5 fill-current" />
            </div>
          </div>
        </div>
      </div>

      {/* Meta API Error Alert if any */}
      {data.error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-300">Meta Graph API Notice</h4>
            <p className="text-xs text-red-200/80 mt-0.5">{data.error}</p>
            <p className="text-xs text-gray-400 mt-1">
              Verify that <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-300">WHATSAPP_ACCESS_TOKEN</code> in your backend .env has the required <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-300">whatsapp_business_management</code> permission on Business Manager <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-300">{data.business_id || '405173550900533'}</code>.
            </p>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by WABA ID, Account Name, Phone, or Gym..."
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:inline">Filter:</span>
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({data.accounts?.length || 0})
            </button>
            <button
              onClick={() => setFilterStatus('linked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === 'linked' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Linked ({data.linked_count || 0})
            </button>
            <button
              onClick={() => setFilterStatus('unlinked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === 'unlinked' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Unlinked ({data.unlinked_count || 0})
            </button>
          </div>
        </div>
      </div>

      {/* ── ACCOUNTS LIST ── */}
      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-3">Fetching WhatsApp Business Accounts from Meta Graph API...</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center space-y-3">
          <Smartphone className="h-12 w-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Client WhatsApp Accounts Found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'No client accounts match your current filter or search criteria.'
              : 'No client accounts have been shared with this Business Manager yet. Gym owners who complete WhatsApp Embedded Signup will appear here automatically.'}
          </p>
          {(searchTerm || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => {
            const isLinked = !!account.linked_gym;
            const gym = account.linked_gym;
            const phones = account.phone_numbers || [];

            return (
              <div
                key={account.waba_id}
                className={`bg-gray-900 border rounded-2xl p-5 transition-all shadow-md ${
                  isLinked
                    ? 'border-emerald-800/40 hover:border-emerald-700/60'
                    : 'border-amber-800/40 hover:border-amber-700/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-800">
                  {/* Account Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-3 rounded-xl border flex-shrink-0 ${
                        isLinked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">{account.name || 'Unnamed Account'}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                            isLinked
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/90 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {isLinked ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Linked to {gym?.name}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" /> Unlinked / Needs Setup
                            </>
                          )}
                        </span>

                        {account.currency && (
                          <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs border border-gray-700">
                            {account.currency}
                          </span>
                        )}
                      </div>

                      {/* WABA ID with copy button */}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                        <span>WABA ID:</span>
                        <code className="font-mono text-gray-200 bg-gray-800/80 px-2 py-0.5 rounded border border-gray-700/60">
                          {account.waba_id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(account.waba_id, 'WABA ID')}
                          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                          title="Copy WABA ID"
                        >
                          {copiedText === account.waba_id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {account.owner_business_info?.name && (
                          <span className="hidden sm:inline text-gray-500">
                            • Owner: <strong className="text-gray-300 font-medium">{account.owner_business_info.name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                    <button
                      onClick={() => handleSubscribe(account.waba_id)}
                      disabled={subscribingWabaId === account.waba_id}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition-colors border border-gray-700 flex items-center gap-1.5 disabled:opacity-50"
                      title="Subscribe Webhook to receive messages & delivery status updates"
                    >
                      {subscribingWabaId === account.waba_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-sky-400" />
                      )}
                      <span>Subscribe App</span>
                    </button>

                    {isLinked ? (
                      <>
                        {gym.whatsapp_status === 'paused' ? (
                          <button
                            onClick={() => handleToggleService(gym.id, true)}
                            disabled={togglingServiceGymId === gym.id}
                            className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs font-semibold transition-colors border border-emerald-700/60 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            title="Start / Resume WhatsApp messaging service for this gym"
                          >
                            {togglingServiceGymId === gym.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current text-emerald-400" />
                            )}
                            <span>Start Service</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleService(gym.id, false)}
                            disabled={togglingServiceGymId === gym.id}
                            className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900 text-amber-300 rounded-xl text-xs font-semibold transition-colors border border-amber-700/60 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            title="Stop / Pause WhatsApp messaging service for this gym"
                          >
                            {togglingServiceGymId === gym.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Pause className="h-3.5 w-3.5 fill-current text-amber-400" />
                            )}
                            <span>Stop Service</span>
                          </button>
                        )}

                        {onSelectGym && (
                          <button
                            onClick={() => onSelectGym(gym.id, gym.name)}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-purple-300 rounded-xl text-xs font-medium transition-colors border border-gray-700 flex items-center gap-1.5"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            <span>View Gym</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleUnlink(gym.id, gym.name)}
                          disabled={unlinkingGymId === gym.id}
                          className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl text-xs font-medium transition-colors border border-red-800/60 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {unlinkingGymId === gym.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unlink className="h-3.5 w-3.5" />
                          )}
                          <span>Unlink Gym</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openLinkModal(account)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        <span>Link to Gym</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Details & Phone Numbers */}
                <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Linked Gym Information Card */}
                  <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-400" /> Linked Gym Status
                    </p>

                    {isLinked ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                          <span className="text-gray-400">Gym Name:</span>
                          <span className="font-semibold text-white">{gym.name} (ID: #{gym.id})</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                          <span className="text-gray-400">Owner Contact:</span>
                          <span className="text-gray-200">{gym.owner_name || gym.email || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                          <span className="text-gray-400">Messaging Service:</span>
                          {gym.whatsapp_status === 'paused' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs bg-amber-950/80 text-amber-300 font-semibold border border-amber-800/60">
                              <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
                              Service Stopped / Paused
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-800/60">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              Service Active & Sending
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                          <span className="text-gray-400">Connected Phone:</span>
                          <span className="font-mono text-purple-300 font-medium">
                            {gym.whatsapp_phone_number || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-400">Active Sender ID:</span>
                          <code className="font-mono text-[11px] text-gray-300 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                            {gym.whatsapp_phone_number_id || 'Not Set'}
                          </code>
                        </div>
                        {gym.whatsapp_phone_number_id && !phones.some((p) => p.id === gym.whatsapp_phone_number_id) && (
                          <div className="mt-2 p-2 bg-amber-950/60 border border-amber-800/70 rounded-lg text-amber-300 text-[11px] flex items-start gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>
                              Active Sender ID doesn't match any phone number in this WABA (number was likely re-added on Meta). Click <strong>Set as Active Sender</strong> on the new number below to restore sending.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-xs text-amber-400 font-medium">Not currently linked to any GymMonitor gym</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Click "Link to Gym" above to associate this WhatsApp account with a registered gym.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Registered Phone Numbers */}
                  <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-400" /> Phone Numbers ({phones.length})
                    </p>

                    {phones.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No phone numbers found on this WABA yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {phones.map((phone) => {
                          const isActiveSender = isLinked && gym?.whatsapp_phone_number_id === phone.id;
                          return (
                            <div
                              key={phone.id}
                              className={`border rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                                isActiveSender
                                  ? 'bg-emerald-950/20 border-emerald-800/80 shadow-sm'
                                  : 'bg-gray-900/90 border-gray-800'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-white">
                                    {phone.display_phone_number || 'No number'}
                                  </span>
                                  {isActiveSender && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700/80 flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Active Sender
                                    </span>
                                  )}
                                  {phone.quality_rating && (
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                        phone.quality_rating.toUpperCase() === 'GREEN'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                          : phone.quality_rating.toUpperCase() === 'YELLOW'
                                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                          : 'bg-red-950 text-red-400 border border-red-800'
                                      }`}
                                    >
                                      Quality: {phone.quality_rating}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                  <span>Verified Name: <strong className="text-gray-300">{phone.verified_name || '—'}</strong></span>
                                  <span>• ID: <code className="font-mono text-gray-300">{phone.id}</code></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => copyToClipboard(phone.id, 'Phone Number ID')}
                                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs flex items-center gap-1"
                                  title="Copy Phone ID"
                                >
                                  {copiedText === phone.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                  <span>ID</span>
                                </button>

                                <button
                                  onClick={() => setRegisterModalPhone({ ...phone, gymId: isLinked ? gym?.id : null })}
                                  className="px-2 py-1 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-700/50 rounded text-xs flex items-center gap-1"
                                  title="Register phone number with 6-digit PIN on Meta Cloud API"
                                >
                                  <Key className="h-3 w-3" />
                                  <span>Register PIN</span>
                                </button>

                                {isLinked && !isActiveSender && (
                                  <button
                                    onClick={() => handleSetActivePhone(gym.id, phone.id, account.waba_id)}
                                    disabled={settingActivePhoneId === phone.id}
                                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/60 rounded text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                    title={`Set ${phone.display_phone_number || phone.id} as the active sending number for ${gym.name}`}
                                  >
                                    {settingActivePhoneId === phone.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                    <span>Set as Active Sender</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: LINK WABA TO GYM ── */}
      {linkModalAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setLinkModalAccount(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <LinkIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Link WABA to Gym</h3>
                <p className="text-xs text-gray-400">
                  Assign Meta Account <strong className="text-gray-200">{linkModalAccount.name}</strong> to a gym
                </p>
              </div>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Select Gym in GymMonitor <span className="text-red-400">*</span>
                </label>
                <SearchableGymInput
                  gyms={data.gyms || []}
                  value={selectedGymId}
                  onChange={setSelectedGymId}
                  placeholder="Type gym name, ID, or phone to search..."
                  required={true}
                />
              </div>

              {linkModalAccount.phone_numbers?.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Select Phone Number for Sending
                  </label>
                  <select
                    value={selectedPhoneId}
                    onChange={(e) => setSelectedPhoneId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {linkModalAccount.phone_numbers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_phone_number || 'No number'} ({p.verified_name || 'No Name'}) - ID: {p.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                <p className="font-semibold text-gray-300">What happens on link:</p>
                <p>• The gym's invoices and member notifications will send from this number.</p>
                <p>• Your app will automatically subscribe to webhooks for this WABA.</p>
                <p>• Status will be marked as <span className="text-emerald-400 font-semibold">connected</span>.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModalAccount(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLink || !selectedGymId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {submittingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{submittingLink ? 'Linking...' : 'Confirm Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTER PHONE NUMBER ── */}
      {registerModalPhone && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setRegisterModalPhone(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register Phone with Meta</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {registerModalPhone.display_phone_number} (ID: {registerModalPhone.id})
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterPhone} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  6-Digit Two-Step Verification PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={registrationPin}
                  onChange={(e) => setRegistrationPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Meta Cloud API requires registering the phone number with a 6-digit PIN before sending messages.
                </p>
                {registerModalPhone?.gymId && (
                  <div className="mt-2.5 p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>This phone number will also be automatically set as the active sending number for this gym.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalPhone(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRegister || registrationPin.length !== 6}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {submittingRegister ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{submittingRegister ? 'Registering...' : 'Register on Meta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL: EXCHANGE AUTH CODE (MANUAL / META DEV TOOL) ── */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowExchangeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Exchange Authorization Code</h3>
                <p className="text-xs text-gray-400">
                  Direct exchange for Meta Embedded Signup authorization code
                </p>
              </div>
            </div>

            <form onSubmit={handleExchangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Authorization Code (`code`) <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={exchangeCode}
                  onChange={(e) => setExchangeCode(e.target.value)}
                  placeholder="Paste the authorization code received from the Meta signup popup..."
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Redirect URI (Optional)
                </label>
                <input
                  type="text"
                  value={exchangeRedirectUri}
                  onChange={(e) => setExchangeRedirectUri(e.target.value)}
                  placeholder="https://developers.facebook.com/es/oauth/callback/... (only if used in auth)"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Required only if the code was generated from Meta Developer Console test tool with a redirect URI.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Link Directly to Gym (Optional)
                </label>
                <SearchableGymInput
                  gyms={data.gyms || []}
                  value={exchangeGymId}
                  onChange={setExchangeGymId}
                  placeholder="Type to search gym to link (or leave empty)..."
                  required={false}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExchangeModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExchange || !exchangeCode.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {submittingExchange ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{submittingExchange ? 'Exchanging...' : 'Exchange & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
