import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, MapPin, DollarSign, Tag, 
  MessageCircle, User, Clock, CheckCircle, AlertCircle,
  Send, MessageSquare, History, Flame, Sun, Snowflake,
  UserCheck, Building, Target, Link as LinkIcon, Star
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SOURCE_CONFIG = {
  walk_in:    { label: 'Walk-in',    icon: User },
  phone_call: { label: 'Phone',      icon: Phone },
  whatsapp:   { label: 'WhatsApp',   icon: MessageCircle },
  instagram:  { label: 'Instagram',  icon: LinkIcon },
  facebook:   { label: 'Facebook',   icon: LinkIcon },
  google:     { label: 'Google',     icon: LinkIcon },
  referral:   { label: 'Referral',   icon: Star },
  website:    { label: 'Website',    icon: LinkIcon },
  public_form:{ label: 'Public Form', icon: LinkIcon },
  other:      { label: 'Other',      icon: Star },
};

const STATUS_CONFIG = {
  new:             { label: 'New',            color: 'bg-blue-100 text-blue-700' },
  contacted:       { label: 'Contacted',      color: 'bg-yellow-100 text-yellow-700' },
  interested:      { label: 'Interested',     color: 'bg-green-100 text-green-700' },
  not_interested:  { label: 'Not Interested', color: 'bg-red-100 text-red-700' },
  converted:       { label: 'Converted',      color: 'bg-purple-100 text-purple-700' },
  lost:            { label: 'Lost',           color: 'bg-gray-100 text-gray-500' },
};

const LEAD_QUALITY_CONFIG = {
  hot:  { label: 'Hot',  color: 'bg-red-100 text-red-700', icon: Flame },
  warm: { label: 'Warm', color: 'bg-orange-100 text-orange-700', icon: Sun },
  cold: { label: 'Cold', color: 'bg-blue-100 text-blue-700', icon: Snowflake },
};

const LeadProfileModal = ({ lead, onClose, onUpdate }) => {
  const [leadDetail, setLeadDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLeadDetail();
  }, [lead.id]);

  const fetchLeadDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gym/leads/${lead.id}/detail`);
      setLeadDetail(response.data);
    } catch (error) {
      console.error('Error fetching lead details:', error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/gym/leads/${lead.id}/comments`, { comment: newComment });
      toast.success('Comment added successfully');
      setNewComment('');
      fetchLeadDetail();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/gym/leads/${lead.id}`, { status: newStatus });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label}`);
      fetchLeadDetail();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleQualityChange = async (newQuality) => {
    setUpdating(true);
    try {
      await api.put(`/gym/leads/${lead.id}`, { lead_quality: newQuality });
      toast.success(`Quality updated to ${LEAD_QUALITY_CONFIG[newQuality]?.label}`);
      fetchLeadDetail();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating quality:', error);
      toast.error('Failed to update quality');
    } finally {
      setUpdating(false);
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!leadDetail) return null;

  const qualityConfig = LEAD_QUALITY_CONFIG[leadDetail.lead_quality] || LEAD_QUALITY_CONFIG.warm;
  const QualityIcon = qualityConfig.icon;
  const SourceIcon = SOURCE_CONFIG[leadDetail.source]?.icon || Star;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
              leadDetail.lead_quality === 'hot' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
              leadDetail.lead_quality === 'warm' ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
              'bg-gradient-to-br from-blue-400 to-cyan-500'
            }`}>
              {leadDetail.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{leadDetail.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${qualityConfig.color}`}>
                  <QualityIcon className="h-3 w-3" />
                  {qualityConfig.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[leadDetail.status]?.color}`}>
                  {STATUS_CONFIG[leadDetail.status]?.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
    <User className="h-4 w-4" />
    Enquiry Details
  </h3>
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span className="text-gray-500">Assigned Staff:</span>
      <span className="font-medium text-gray-900 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
          {leadDetail.assigned_staff_name?.charAt(0).toUpperCase() || '?'}
        </div>
        {leadDetail.assigned_staff_name || 'Unassigned'}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-500">Source:</span>
      <span className="font-medium text-gray-900 flex items-center gap-1">
        <SourceIcon className="h-3 w-3" />
        {SOURCE_CONFIG[leadDetail.source]?.label || leadDetail.source}
      </span>
    </div>
    {/* Rest of the fields... */}
  </div>
</div>

        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <select
              value={leadDetail.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updating}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
            <select
              value={leadDetail.lead_quality}
              onChange={(e) => handleQualityChange(e.target.value)}
              disabled={updating}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="hot">🔥 Hot</option>
              <option value="warm">☀️ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
          </div>

          {/* Lead Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-medium text-gray-900">{leadDetail.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium text-gray-900">{leadDetail.phone}</span>
                </div>
                {leadDetail.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-900">{leadDetail.email}</span>
                  </div>
                )}
                {leadDetail.age && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Age:</span>
                    <span className="font-medium text-gray-900">{leadDetail.age} years</span>
                  </div>
                )}
                {leadDetail.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gender:</span>
                    <span className="font-medium text-gray-900">{leadDetail.gender}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Details */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Lead Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Source:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <SourceIcon className="h-3 w-3" />
                    {SOURCE_CONFIG[leadDetail.source]?.label || leadDetail.source}
                  </span>
                </div>
                {leadDetail.interest && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interest:</span>
                    <span className="font-medium text-gray-900">{leadDetail.interest}</span>
                  </div>
                )}
                {leadDetail.preferred_plan && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preferred Plan:</span>
                    <span className="font-medium text-gray-900">{leadDetail.preferred_plan}</span>
                  </div>
                )}
                {leadDetail.budget && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Budget:</span>
                    <span className="font-medium text-green-600">₹{leadDetail.budget.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium text-gray-900">{formatDateTime(leadDetail.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Activity:</span>
                  <span className="font-medium text-gray-900">{formatDateTime(leadDetail.last_activity)}</span>
                </div>
                {leadDetail.next_follow_up && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Follow-up:</span>
                    <span className="font-medium text-orange-600">{formatDateTime(leadDetail.next_follow_up)}</span>
                  </div>
                )}
                {leadDetail.conversion_days && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time to Convert:</span>
                    <span className="font-medium text-green-600">{leadDetail.conversion_days} days</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Follow-ups:</span>
                  <span className="font-medium text-gray-900">{leadDetail.total_followups || 0}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {leadDetail.notes && (
              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </h3>
                <p className="text-sm text-gray-700">{leadDetail.notes}</p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments & History
            </h3>

            {/* Add Comment */}
            <div className="flex gap-3 mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment about this lead..."
                rows={3}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 h-fit"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {leadDetail.comments && leadDetail.comments.length > 0 ? (
                leadDetail.comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {comment.user_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{comment.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{comment.user_role?.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-10">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet. Add the first comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadProfileModal;