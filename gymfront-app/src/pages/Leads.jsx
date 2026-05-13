import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Phone, Mail, User, Calendar,
  MoreVertical, Edit2, Trash2, X, ChevronDown, RefreshCw,
  UserCheck, Clock, AlertCircle, Star, Zap,
  MessageCircle, Instagram, Facebook, Globe, Users, Share2, Copy, Link as LinkIcon, Download, CheckCircle as CheckCircleIcon,
  Flame, Sun, Snowflake
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import MemberModal from '../components/MemberModal';

// Try to import QRCode, but don't fail if not available
let QRCode;
try {
  QRCode = require('qrcode.react').QRCode;
} catch (e) {
  console.warn('qrcode.react not installed');
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  new:             { label: 'New',            color: 'bg-blue-100 text-blue-700 border-blue-200' },
  contacted:       { label: 'Contacted',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  interested:      { label: 'Interested',     color: 'bg-green-100 text-green-700 border-green-200' },
  not_interested:  { label: 'Not Interested', color: 'bg-red-100 text-red-700 border-red-200' },
  converted:       { label: 'Converted',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  lost:            { label: 'Lost',           color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const SOURCE_CONFIG = {
  walk_in:    { label: 'Walk-in',    icon: User },
  phone_call: { label: 'Phone',      icon: Phone },
  whatsapp:   { label: 'WhatsApp',   icon: MessageCircle },
  instagram:  { label: 'Instagram',  icon: Instagram },
  facebook:   { label: 'Facebook',   icon: Facebook },
  google:     { label: 'Google',     icon: Globe },
  referral:   { label: 'Referral',   icon: Users },
  website:    { label: 'Website',    icon: Globe },
  public_form:{ label: 'Public Form', icon: LinkIcon },
  other:      { label: 'Other',      icon: Star },
};

const LEAD_QUALITY_CONFIG = {
  hot:  { label: 'Hot',  color: 'bg-red-100 text-red-700', icon: Flame, priority: 1 },
  warm: { label: 'Warm', color: 'bg-orange-100 text-orange-700', icon: Sun, priority: 2 },
  cold: { label: 'Cold', color: 'bg-blue-100 text-blue-700', icon: Snowflake, priority: 3 },
};

const INTEREST_OPTIONS = [
  'Weight Loss', 'Muscle Gain', 'General Fitness', 'Yoga', 'Zumba',
  'CrossFit', 'HIIT', 'Cardio', 'Strength Training', 'Rehabilitation', 'Other',
];

const PLAN_OPTIONS = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', age: '', gender: '',
  source: 'walk_in', interest: '', preferred_plan: '',
  budget: '', next_follow_up: '', notes: '', assigned_to: '',
  lead_quality: 'warm',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatFollowUp = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'Overdue', color: 'text-red-600' };
  if (diff === 0) return { label: 'Today', color: 'text-orange-600' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-yellow-600' };
  return { label: formatDate(dt), color: 'text-gray-500' };
};

// ── Lead Quality Badge ──────────────────────────────────────────────────────
const LeadQualityBadge = ({ quality, onChange }) => {
  const config = LEAD_QUALITY_CONFIG[quality];
  if (!config) return null;
  const Icon = config.icon;
  
  return (
    <div className="group relative">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color} cursor-pointer hover:opacity-80 transition-opacity`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
      {onChange && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block min-w-[100px]">
          {Object.entries(LEAD_QUALITY_CONFIG).map(([q, cfg]) => (
            <button
              key={q}
              onClick={() => onChange(q)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${quality === q ? 'bg-gray-50' : ''}`}
            >
              <cfg.icon className="h-3 w-3" />
              <span className={cfg.color.split(' ')[1]}>{cfg.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4`}>
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

// ── Share Lead Form Modal ──────────────────────────────────────────────────
const ShareLeadFormModal = ({ isOpen, onClose, shareableLink, gymSlug }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Share Lead Form</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-800 mb-2">📋 Share this link with potential customers</p>
            <p className="text-xs text-blue-600">They can fill the form and leads will be automatically added here</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                {copied ? <CheckCircleIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {QRCode && (
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">QR Code (Scan to open)</label>
              <div className="bg-white p-4 rounded-xl inline-block mx-auto border border-gray-200">
                <QRCode
                  id="qr-code-canvas"
                  value={shareableLink}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <button
                onClick={() => {
                  const canvas = document.getElementById('qr-code-canvas');
                  if (canvas) {
                    const pngUrl = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pngUrl;
                    downloadLink.download = `lead-form-${gymSlug}.png`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    toast.success('QR Code downloaded!');
                  }
                }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 mx-auto"
              >
                <Download className="h-4 w-4" /> Download QR Code
              </button>
            </div>
          )}

          <div className="bg-yellow-50 rounded-xl p-3">
            <p className="text-xs text-yellow-700 text-center">
              💡 Share this link on WhatsApp, Instagram, Facebook, or your website
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 text-center">
              When customers submit the form, leads will appear here automatically
            </p>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Convert Lead to Member Modal ──────────────────────────────────────────────
const ConvertToMemberModal = ({ lead, onClose, onConverted }) => {
  const [showMemberModal, setShowMemberModal] = useState(true);

  const prefillData = {
    full_name: lead.full_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    gender: lead.gender || 'male',
    date_of_birth: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_conditions: '',
    allergies: '',
    medications: '',
    id_proof_type: 'aadhar',
    id_proof_number: '',
    notes: lead.notes || '',
    interest: lead.interest || '',
    preferred_plan: lead.preferred_plan || '',
    budget: lead.budget || '',
    source: lead.source || '',
  };

  const handleMemberSave = async (memberFormData) => {
    try {
      await api.put(`/gym/leads/${lead.id}`, { status: 'converted' });
      toast.success(`Lead "${lead.full_name}" converted to member successfully!`);
      onConverted();
      onClose();
      return memberFormData;
    } catch (err) {
      console.error('Conversion error:', err);
      toast.error(err.response?.data?.detail || 'Failed to convert lead to member');
      throw err;
    }
  };

  return (
    <>
      {showMemberModal && (
        <MemberModal
          isOpen={showMemberModal}
          onClose={onClose}
          onSave={handleMemberSave}
          member={null}
          userRole="gym_owner"
          prefillData={prefillData}
        />
      )}
    </>
  );
};

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

const LeadModal = ({ lead, onClose, onSave }) => {
  const [form, setForm] = useState(lead
    ? {
        ...lead,
        age: lead.age ?? '',
        budget: lead.budget ?? '',
        lead_quality: lead.lead_quality ?? 'warm',
        next_follow_up: lead.next_follow_up
          ? new Date(lead.next_follow_up).toISOString().slice(0, 16)
          : '',
      }
    : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    if (!/^[+]?[\d\s\-]{7,15}$/.test(form.phone.trim())) { toast.error('Enter a valid phone number (e.g. +91-9876543210)'); return; }

    setSaving(true);
    const payload = {
      ...form,
      age: form.age ? parseInt(form.age) : null,
      budget: form.budget ? parseFloat(form.budget) : null,
      next_follow_up: form.next_follow_up || null,
      assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
      email: form.email || null,
    };

    try {
      if (lead) {
        await api.put(`/gym/leads/${lead.id}`, payload);
        toast.success('Lead updated!');
      } else {
        await api.post('/gym/leads', payload);
        toast.success('Lead added!');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const phoneKeyDown = (e) => {
    const allowed = new Set(['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']);
    if (!e.ctrlKey && !e.metaKey && !allowed.has(e.key) && !/^[0-9+\- ]$/.test(e.key)) e.preventDefault();
  };

  const field = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        {...(type === 'tel' ? { maxLength: 15, onKeyDown: phoneKeyDown } : {})}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        {...opts}
      />
    </div>
  );

  const select = (label, key, options) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        <option value="">— Select —</option>
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
          {field('Full Name *', 'full_name', 'text', { placeholder: 'John Doe' })}
          {field('Phone *', 'phone', 'tel', { placeholder: '+91 98765 43210' })}
          {field('Email', 'email', 'email', { placeholder: 'john@example.com' })}
          {field('Age', 'age', 'number', { min: 10, max: 100, placeholder: '25' })}
          {select('Gender', 'gender', GENDER_OPTIONS)}
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Lead Quality</label>
            <select
              value={form.lead_quality}
              onChange={e => set('lead_quality', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="hot">🔥 Hot - Ready to join, high priority</option>
              <option value="warm">☀️ Warm - Interested, needs follow-up</option>
              <option value="cold">❄️ Cold - Low interest, nurture slowly</option>
            </select>
          </div>
          
          {select('Lead Source', 'source', Object.entries(SOURCE_CONFIG).map(([v, c]) => ({ value: v, label: c.label })))}
          {select('Interest', 'interest', INTEREST_OPTIONS)}
          {select('Preferred Plan', 'preferred_plan', PLAN_OPTIONS)}
          {field('Budget (approx.)', 'budget', 'number', { min: 0, placeholder: '2000' })}
          {field('Next Follow-up', 'next_follow_up', 'datetime-local')}

          {lead && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional details, requirements, or comments..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60"
          >
            {saving ? 'Saving...' : lead ? 'Update Lead' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Lead Row Actions Menu ────────────────────────────────────────────────────

const ActionsMenu = ({ lead, onEdit, onDelete, onStatusChange, onConvert, onQualityChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const quickStatuses = ['contacted', 'interested', 'not_interested'].filter(s => s !== lead.status);
  const quickQualities = ['hot', 'warm', 'cold'].filter(q => q !== lead.lead_quality);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-10 py-1">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Edit2 className="h-4 w-4" /> Edit Lead
          </button>
          
          <div className="border-t border-gray-100 my-1" />
          <p className="px-4 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">Change Quality</p>
          {quickQualities.map(q => {
            const config = LEAD_QUALITY_CONFIG[q];
            const Icon = config.icon;
            return (
              <button
                key={q}
                onClick={() => { onQualityChange(q); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </button>
            );
          })}
          
          <div className="border-t border-gray-100 my-1" />
          <p className="px-4 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">Quick Status</p>
          {quickStatuses.map(s => (
            <button
              key={s}
              onClick={() => { onStatusChange(s); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_CONFIG[s]?.color.split(' ')[0]}`} />
              {STATUS_CONFIG[s]?.label}
            </button>
          ))}
          {lead.status !== 'converted' && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { onConvert(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
              >
                <UserCheck className="h-4 w-4" /> Convert to Member
              </button>
            </>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Leads Component ──────────────────────────────────────────────────────

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, interested: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [convertLead, setConvertLead] = useState(null);
  const [shareableLink, setShareableLink] = useState('');
  const [gymSlug, setGymSlug] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterSource) params.append('source', filterSource);
      if (filterQuality) params.append('lead_quality', filterQuality);
      if (search) params.append('search', search);

      const [leadsRes, statsRes] = await Promise.all([
        api.get(`/gym/leads?${params}`),
        api.get('/gym/leads/stats/summary'),
      ]);
      setLeads(leadsRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSource, filterQuality, search]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(fetchLeads, 300);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  const fetchShareableLink = async () => {
    try {
      const response = await api.get('/gym/lead-form-link');
      setShareableLink(response.data.shareable_link);
      setGymSlug(response.data.gym_slug);
      setShowShareModal(true);
      toast.success('Shareable link generated!');
    } catch (error) {
      console.error('Error fetching shareable link:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate shareable link. Make sure you have a gym setup.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gym/leads/${id}`);
      toast.success('Lead deleted');
      setDeleteConfirm(null);
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      await api.put(`/gym/leads/${lead.id}`, { status: newStatus });
      toast.success(`Marked as ${STATUS_CONFIG[newStatus]?.label}`);
      fetchLeads();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleQualityChange = async (lead, newQuality) => {
    try {
      await api.put(`/gym/leads/${lead.id}`, { lead_quality: newQuality });
      toast.success(`Lead marked as ${LEAD_QUALITY_CONFIG[newQuality]?.label}`);
      fetchLeads();
    } catch {
      toast.error('Failed to update lead quality');
    }
  };

  const handleConvert = (lead) => {
    setConvertLead(lead);
  };

  const onConverted = () => {
    fetchLeads();
  };

  // Calculate quality stats
  const qualityStats = {
    hot: leads.filter(l => l.lead_quality === 'hot').length,
    warm: leads.filter(l => l.lead_quality === 'warm').length,
    cold: leads.filter(l => l.lead_quality === 'cold').length,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage incoming gym inquiries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchLeads(); }}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={fetchShareableLink}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-all"
          >
            <Share2 className="h-4 w-4" /> Share Lead Form
          </button>
          <button
            onClick={() => { setEditLead(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Leads" value={stats.total} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard label="New" value={stats.new} icon={Zap} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Contacted" value={stats.contacted} icon={Phone} color="bg-yellow-100 text-yellow-600" />
        <StatCard label="Interested" value={stats.interested} icon={Star} color="bg-green-100 text-green-600" />
        <StatCard label="Converted" value={stats.converted} icon={UserCheck} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Lead Quality Stats Row - Clickable Filters */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilterQuality(filterQuality === 'hot' ? '' : 'hot')}
          className={`bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-4 border transition-all ${
            filterQuality === 'hot' ? 'border-red-500 ring-2 ring-red-200' : 'border-red-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Hot Leads</p>
              <p className="text-2xl font-bold text-red-700">{qualityStats.hot}</p>
            </div>
            <Flame className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-xs text-red-600 mt-1">Ready to join, high priority</p>
        </button>
        
        <button
          onClick={() => setFilterQuality(filterQuality === 'warm' ? '' : 'warm')}
          className={`bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-4 border transition-all ${
            filterQuality === 'warm' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Warm Leads</p>
              <p className="text-2xl font-bold text-orange-700">{qualityStats.warm}</p>
            </div>
            <Sun className="h-8 w-8 text-orange-500" />
          </div>
          <p className="text-xs text-orange-600 mt-1">Interested, need follow-up</p>
        </button>
        
        <button
          onClick={() => setFilterQuality(filterQuality === 'cold' ? '' : 'cold')}
          className={`bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-4 border transition-all ${
            filterQuality === 'cold' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Cold Leads</p>
              <p className="text-2xl font-bold text-blue-700">{qualityStats.cold}</p>
            </div>
            <Snowflake className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-blue-600 mt-1">Low interest, nurture slowly</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Sources</option>
          {Object.entries(SOURCE_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        {filterQuality && (
          <button
            onClick={() => setFilterQuality('')}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Clear Quality Filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">No leads found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {search || filterStatus || filterSource || filterQuality ? 'Try adjusting your filters.' : 'Add your first lead to get started.'}
            </p>
            {!search && !filterStatus && !filterSource && !filterQuality && (
              <button
                onClick={() => { setEditLead(null); setShowModal(true); }}
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Add First Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-5 py-3 font-semibold">Lead</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold">Quality</th>
                  <th className="text-left px-4 py-3 font-semibold">Source</th>
                  <th className="text-left px-4 py-3 font-semibold">Interest</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Follow-up</th>
                  <th className="text-left px-4 py-3 font-semibold">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map(lead => {
                  const followUp = formatFollowUp(lead.next_follow_up);
                  const SrcIcon = SOURCE_CONFIG[lead.source]?.icon || Star;
                  
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                            lead.lead_quality === 'hot' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                            lead.lead_quality === 'warm' ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
                            'bg-gradient-to-br from-blue-400 to-cyan-500'
                          }`}>
                            {lead.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{lead.full_name}</p>
                            {lead.gender && (
                              <p className="text-xs text-gray-400">{lead.gender}{lead.age ? `, ${lead.age} yrs` : ''}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[140px]">{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <LeadQualityBadge 
                          quality={lead.lead_quality || 'warm'} 
                          onChange={(newQuality) => handleQualityChange(lead, newQuality)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <SrcIcon className="h-4 w-4 text-gray-400" />
                          <span>{SOURCE_CONFIG[lead.source]?.label || lead.source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {lead.interest && <p className="text-gray-700">{lead.interest}</p>}
                          {lead.preferred_plan && (
                            <p className="text-xs text-gray-400">{lead.preferred_plan}</p>
                          )}
                          {lead.budget && (
                            <p className="text-xs text-green-600 font-medium">Budget: ₹{lead.budget.toLocaleString()}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_CONFIG[lead.status]?.color}`}>
                          {STATUS_CONFIG[lead.status]?.label || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {followUp ? (
                          <span className={`text-xs font-medium ${followUp.color}`}>
                            {followUp.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <ActionsMenu
                          lead={lead}
                          onEdit={() => { setEditLead(lead); setShowModal(true); }}
                          onDelete={() => setDeleteConfirm(lead)}
                          onStatusChange={(s) => handleStatusChange(lead, s)}
                          onConvert={() => handleConvert(lead)}
                          onQualityChange={(q) => handleQualityChange(lead, q)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowModal(false); setEditLead(null); }}
          onSave={fetchLeads}
        />
      )}

      <ShareLeadFormModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareableLink={shareableLink}
        gymSlug={gymSlug}
      />

      {convertLead && (
        <ConvertToMemberModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onConverted={onConverted}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Lead?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              Are you sure you want to delete <strong>{deleteConfirm.full_name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;