// src/components/FollowUpCard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  User,
  Users,
  Target,
  Star,
  Flame,
  Zap,
  UserCheck,
  Calendar as CalendarIcon,
  MessageCircle,
  X,
  Loader,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FollowUpCard = ({ 
  onFollowUpClick, 
  onRefresh,
  autoRefreshInterval = 60000 // 1 minute
}) => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [expandedLead, setExpandedLead] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/gym/followups/today');
      if (response.data) {
        setFollowups(response.data.followups || []);
        setCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching followups:', error);
      // Don't show toast for 403 errors
      if (error.response?.status !== 403) {
        toast.error('Failed to load follow-ups');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
    
    // Auto-refresh
    const interval = setInterval(() => {
      fetchFollowups();
    }, autoRefreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  // Listen for lead updates
  useEffect(() => {
    const handleLeadUpdate = () => {
      fetchFollowups();
    };
    
    window.addEventListener('leadAdded', handleLeadUpdate);
    window.addEventListener('leadUpdated', handleLeadUpdate);
    
    return () => {
      window.removeEventListener('leadAdded', handleLeadUpdate);
      window.removeEventListener('leadUpdated', handleLeadUpdate);
    };
  }, []);

  const handleCompleteFollowUp = async (leadId) => {
    try {
      setProcessingId(leadId);
      await api.put(`/gym/followups/${leadId}/complete`);
      toast.success('Follow-up marked as completed!');
      fetchFollowups();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error completing follow-up:', error);
      toast.error('Failed to mark follow-up as completed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReschedule = async (leadId, newDate) => {
    try {
      setProcessingId(leadId);
      await api.post(`/gym/followups/${leadId}/reschedule`, {
        next_follow_up: newDate.toISOString()
      });
      toast.success('Follow-up rescheduled!');
      fetchFollowups();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error rescheduling follow-up:', error);
      toast.error('Failed to reschedule follow-up');
    } finally {
      setProcessingId(null);
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'hot': return <Flame className="h-4 w-4 text-red-500" />;
      case 'warm': return <Zap className="h-4 w-4 text-orange-500" />;
      case 'cold': return <Snowflake className="h-4 w-4 text-blue-400" />;
      default: return <User className="h-4 w-4 text-gray-400" />;
    }
  };

  const getQualityLabel = (quality) => {
    switch (quality) {
      case 'hot': return '🔥 Hot';
      case 'warm': return '☀️ Warm';
      case 'cold': return '❄️ Cold';
      default: return 'Unknown';
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
      contacted: 'bg-yellow-100 text-yellow-700',
      interested: 'bg-green-100 text-green-700',
      not_interested: 'bg-red-100 text-red-700',
      converted: 'bg-purple-100 text-purple-700',
      lost: 'bg-gray-100 text-gray-500'
    };
    return colors[status] || 'bg-gray-100 text-gray-500';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      interested: 'Interested',
      not_interested: 'Not Interested',
      converted: 'Converted',
      lost: 'Lost'
    };
    return labels[status] || status;
  };

  const formatFollowUpTime = (date) => {
    if (!date) return 'No time set';
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return d.toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isFollowUpOverdue = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const displayFollowups = showAll ? followups : followups.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Today's Follow-ups</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 text-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (followups.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Today's Follow-ups</h3>
          </div>
          <button 
            onClick={fetchFollowups}
            className="text-purple-600 hover:text-purple-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-gray-900 font-medium">All caught up! 🎉</p>
          <p className="text-gray-500 text-sm mt-1">No follow-ups scheduled for today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Today's Follow-ups</h3>
              <p className="text-white/80 text-sm">
                {count} lead{count !== 1 ? 's' : ''} need attention today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchFollowups}
              className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {followups.length > 5 && (
              <button 
                onClick={() => setShowAll(!showAll)}
                className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
              >
                {showAll ? 'Show Less' : `View All (${count})`}
                <ChevronRight className={`h-4 w-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Follow-up List */}
      <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          {displayFollowups.map((lead) => {
            const isOverdue = isFollowUpOverdue(lead.next_follow_up);
            
            return (
              <div 
                key={lead.id} 
                className={`group relative flex flex-col gap-2 p-4 rounded-xl transition-all 
                  ${isOverdue 
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500' 
                    : 'bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-400'
                  } 
                  hover:shadow-md cursor-pointer`}
                onClick={() => {
                  if (onFollowUpClick) {
                    onFollowUpClick(lead);
                  }
                }}
              >
                {/* Main Row */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <img 
                    src={lead.lead_avatar} 
                    alt={lead.lead_name}
                    className="w-12 h-12 rounded-full ring-2 ring-purple-200 object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${lead.lead_name}&background=8B5CF6&color=fff&size=64`;
                    }}
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{lead.lead_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getQualityColor(lead.lead_quality)}`}>
                        {getQualityLabel(lead.lead_quality)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                      {isOverdue && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                          ⚠️ Overdue
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.lead_phone}
                      </span>
                      {lead.lead_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.lead_email}
                        </span>
                      )}
                      {lead.assigned_staff_name && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <User className="h-3 w-3" />
                          {lead.assigned_staff_name}
                        </span>
                      )}
                    </div>
                    
                    {/* Follow-up Time */}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className={`h-3 w-3 ${isOverdue ? 'text-red-500' : 'text-purple-500'}`} />
                      <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-purple-600'}`}>
                        {formatFollowUpTime(lead.next_follow_up)}
                      </span>
                      {isOverdue && lead.days_overdue > 0 && (
                        <span className="text-xs text-red-500 font-medium">
                          (Overdue by {lead.days_overdue} day{lead.days_overdue !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    
                    {/* Notes Preview */}
                    {lead.notes && (
                      <div className="mt-2 text-xs text-gray-600 bg-white/50 p-2 rounded-lg max-h-12 overflow-hidden">
                        <span className="line-clamp-2">{lead.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-2 ml-14">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteFollowUp(lead.id);
                    }}
                    disabled={processingId === lead.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${isOverdue 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }
                      hover:shadow-lg transform hover:-translate-y-0.5
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processingId === lead.id ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Mark Done
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedLead(expandedLead === lead.id ? null : lead.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium 
                      bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Reschedule
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onFollowUpClick) {
                        onFollowUpClick(lead);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium 
                      bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contact
                  </button>
                </div>
                
                {/* Reschedule Section */}
                {expandedLead === lead.id && (
                  <div className="ml-14 mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <input
                        type="datetime-local"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        defaultValue={lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().slice(0, 16) : ''}
                        min={new Date().toISOString().slice(0, 16)}
                        id={`reschedule-${lead.id}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const input = document.getElementById(`reschedule-${lead.id}`);
                          if (input && input.value) {
                            const newDate = new Date(input.value);
                            if (newDate > new Date()) {
                              handleReschedule(lead.id, newDate);
                              setExpandedLead(null);
                            } else {
                              toast.error('Please select a future date and time');
                            }
                          }
                        }}
                        disabled={processingId === lead.id}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      >
                        {processingId === lead.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          'Update'
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedLead(null);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer */}
      {followups.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              {count} follow-up{count !== 1 ? 's' : ''} today
            </span>
            <button 
              onClick={() => {
                if (onFollowUpClick) {
                  onFollowUpClick({ viewAll: true });
                }
              }}
              className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View All Leads
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Snowflake icon for cold leads
const Snowflake = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M12 2l-4 4M12 2l4 4M12 22l-4-4M12 22l4-4M4 6l16 12M4 6l4-2M4 6l-2-4M20 18l-4 2M20 18l2 4M4 18l16-12M4 18l-4-2M4 18l2 4M20 6l-4-2M20 6l2-4" />
  </svg>
);

export default FollowUpCard;