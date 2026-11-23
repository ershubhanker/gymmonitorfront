// src/components/DoneFollowUpCard.jsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  Phone, 
  Mail, 
  ChevronRight, 
  User, 
  UserCheck,
  Flame, 
  Zap, 
  Snowflake,
  MessageCircle, 
  RefreshCw,
  Loader,
  Calendar,
  FileText
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DoneFollowUpCard = ({ 
  onFollowUpClick, 
  onRefresh,
  autoRefreshInterval = 60000 // 1 minute
}) => {
  const [doneFollowups, setDoneFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const fetchDoneFollowups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/gym/followups/done-today');
      if (response.data) {
        setDoneFollowups(response.data.done_followups || []);
        setCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching done followups:', error);
      if (error.response?.status !== 403) {
        toast.error('Failed to load completed follow-ups');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoneFollowups();
    
    // Auto-refresh interval
    const interval = setInterval(() => {
      fetchDoneFollowups();
    }, autoRefreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  // Listen for real-time lead updates & follow-up completion events
  useEffect(() => {
    const handleUpdate = () => {
      fetchDoneFollowups();
    };
    
    window.addEventListener('followupCompleted', handleUpdate);
    window.addEventListener('leadUpdated', handleUpdate);
    window.addEventListener('leadAdded', handleUpdate);
    
    return () => {
      window.removeEventListener('followupCompleted', handleUpdate);
      window.removeEventListener('leadUpdated', handleUpdate);
      window.removeEventListener('leadAdded', handleUpdate);
    };
  }, []);

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'hot': return <Flame className="h-4 w-4 text-red-500" />;
      case 'warm': return <Zap className="h-4 w-4 text-orange-500" />;
      case 'cold': return <Snowflake className="h-4 w-4 text-blue-400" />;
      default: return <User className="h-4 w-4 text-gray-400" />;
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'hot': return 'bg-red-100 text-red-700';
      case 'warm': return 'bg-orange-100 text-orange-700';
      case 'cold': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-emerald-100 text-emerald-700',
      interested: 'bg-teal-100 text-teal-700',
      not_interested: 'bg-red-100 text-red-700',
      converted: 'bg-purple-100 text-purple-700',
      lost: 'bg-gray-100 text-gray-500'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      interested: 'Interested',
      not_interested: 'Not Interested',
      converted: 'Converted 🎉',
      lost: 'Lost'
    };
    return labels[status] || (typeof status === 'string' ? status.toUpperCase() : status);
  };

  const formatDoneTime = (dateStr) => {
    if (!dateStr) return 'Today';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Today';
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const displayList = showAll ? doneFollowups : doneFollowups.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Done Follow-ups Today</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (doneFollowups.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Done Follow-ups Today</h3>
          </div>
          <button 
            onClick={fetchDoneFollowups}
            className="text-emerald-600 hover:text-emerald-700 transition-colors p-1.5 rounded-lg hover:bg-emerald-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-center py-8 my-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-3 ring-8 ring-emerald-50/50">
            <UserCheck className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-gray-900 font-semibold text-base">No follow-ups done yet today</p>
          <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
            Leads you follow up with or mark as completed today will be listed here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Done Follow-ups</h3>
              <p className="text-emerald-100 text-sm">
                {count} person{count !== 1 ? 's' : ''} followed up today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchDoneFollowups}
              className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {doneFollowups.length > 5 && (
              <button 
                onClick={() => setShowAll(!showAll)}
                className="text-white/90 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors bg-white/10 px-2.5 py-1 rounded-lg"
              >
                {showAll ? 'Show Less' : `View All (${count})`}
                <ChevronRight className={`h-4 w-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Done Follow-ups List */}
      <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar flex-1">
        <div className="space-y-3">
          {displayList.map((lead) => {
            const cleanPhone = (lead.lead_phone || '').replace(/[^0-9]/g, '');
            const whatsappUrl = cleanPhone 
              ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}`
              : null;

            return (
              <div 
                key={lead.id} 
                className="group relative flex flex-col gap-2 p-3.5 rounded-xl transition-all bg-gradient-to-r from-emerald-50/70 to-teal-50/60 border-l-4 border-emerald-500 hover:shadow-md cursor-pointer border border-emerald-100/60"
                onClick={() => {
                  if (onFollowUpClick) {
                    onFollowUpClick(lead);
                  }
                }}
              >
                {/* Main Row */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={lead.lead_avatar} 
                      alt={lead.lead_name} 
                      className="w-10 h-10 rounded-full ring-2 ring-emerald-300 object-cover shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.lead_name || 'U')}&background=10B981&color=fff&size=64`;
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                          {lead.lead_name}
                        </h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${getQualityColor(lead.lead_quality)}`}>
                          {getQualityIcon(lead.lead_quality)}
                          <span className="capitalize">{lead.lead_quality || 'warm'}</span>
                        </span>
                      </div>

                      {/* Done Time */}
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDoneTime(lead.done_at)}
                      </span>
                    </div>

                    {/* Contact & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                      {lead.lead_phone && (
                        <span className="flex items-center gap-1 text-gray-700 font-medium">
                          <Phone className="h-3 w-3 text-emerald-600" />
                          {lead.lead_phone}
                        </span>
                      )}

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>

                      {lead.done_by_name && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-white/70 px-1.5 py-0.5 rounded border border-gray-100">
                          <UserCheck className="h-3 w-3 text-teal-600" />
                          Done by {lead.done_by_name}
                        </span>
                      )}
                    </div>

                    {/* Action Note / Comment */}
                    {lead.comment && (
                      <div className="mt-2 text-xs text-emerald-950 bg-white/80 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                        <div className="flex items-start gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2 italic">{lead.comment}</span>
                        </div>
                      </div>
                    )}

                    {/* Rescheduled Indicator if next follow up exists */}
                    {lead.next_follow_up && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50 w-fit">
                        <Calendar className="h-3 w-3 text-teal-600" />
                        <span>Next follow-up: {new Date(lead.next_follow_up).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Contact & View Details Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-emerald-100/70 mt-1">
                  <div className="flex items-center gap-2">
                    {lead.lead_phone && (
                      <a
                        href={`tel:${lead.lead_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-2 py-1 rounded border border-emerald-200 transition-colors"
                        title="Call lead"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                    )}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 hover:text-green-800 bg-white hover:bg-green-50 px-2 py-1 rounded border border-green-200 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3 text-green-600" />
                        WhatsApp
                      </a>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-emerald-700 group-hover:text-emerald-900 flex items-center gap-0.5 transition-colors">
                    View Lead
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DoneFollowUpCard;
