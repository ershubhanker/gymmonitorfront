// src/components/MembershipTransferModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ArrowRight, User, UserPlus, Loader2, AlertTriangle,
  Calendar, IndianRupee, CheckCircle, Search, RefreshCw,
  Hash, Phone, Mail, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, {
  previewMembershipTransfer,
  transferMembership,
} from '../services/api';

const formatCurrency = (amount) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (n === null || n === undefined || isNaN(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// ============================================================
// RECIPIENT PICKER — search existing members
// ============================================================
const ExistingMemberPicker = ({ excludeId, onSelect, selectedId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('limit', '15');
        if (query.trim()) params.append('search', query.trim());
        const res = await api.get(`/gym/members?${params.toString()}`);
        const list = (res.data || []).filter(
          (m) => String(m.id) !== String(excludeId)
        );
        setResults(list);
      } catch (e) {
        console.error('Failed to search members', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, open, excludeId]);

  return (
    <div className="relative" ref={boxRef}>
      <div
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 bg-white"
      >
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search existing member by name or phone…"
          className="flex-1 outline-none text-sm bg-transparent"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {loading ? (
            <div className="p-3 text-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-400">
              No members found
            </div>
          ) : (
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect({
                    id: m.id,
                    full_name: m.full_name,
                    phone: m.phone,
                    email: m.email,
                  });
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                  String(selectedId) === String(m.id) ? 'bg-blue-50' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                <p className="text-xs text-gray-500">{m.phone}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN MODAL
// ============================================================
const MembershipTransferModal = ({ isOpen, onClose, member, onTransferComplete }) => {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const [recipientMode, setRecipientMode] = useState('existing'); // 'existing' | 'new'
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  const [newMember, setNewMember] = useState({
    full_name: '',
    phone: '',
    email: '',
    gender: 'male',
    address: '',
  });

  const [transferFee, setTransferFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setPreview(null);
    setPreviewError(null);
    setSelectedRecipient(null);
    setRecipientMode('existing');
    setNewMember({ full_name: '', phone: '', email: '', gender: 'male', address: '' });
    setTransferFee('');
    setPaymentMethod('cash');
    setReason('');
    setNotes('');
  }, []);

  useEffect(() => {
    if (!isOpen || !member?.id) return;
    reset();
    setLoadingPreview(true);
    previewMembershipTransfer(member.id)
      .then((data) => {
        setPreview(data);
        if (!data.is_transferable) setPreviewError(data.block_reason || 'Not transferable');
      })
      .catch((err) => {
        setPreviewError(err.response?.data?.detail || 'Failed to load transfer preview');
      })
      .finally(() => setLoadingPreview(false));
  }, [isOpen, member?.id, reset]);

  if (!isOpen || !member) return null;

  const handleSubmit = async () => {
    if (!preview?.is_transferable) return;

    // Validate recipient
    if (recipientMode === 'existing') {
      if (!selectedRecipient) {
        toast.error('Please select an existing member as the recipient');
        return;
      }
    } else {
      if (!newMember.full_name.trim() || !newMember.phone.trim()) {
        toast.error('Recipient full name and phone are required');
        return;
      }
      if (!/^[+]?[\d\s\-]{7,15}$/.test(newMember.phone.trim())) {
        toast.error('Enter a valid recipient phone number');
        return;
      }
    }

    const confirmMsg = recipientMode === 'existing'
      ? `Transfer membership from ${member.full_name} to ${selectedRecipient.full_name}?\n\n` +
        `Remaining days: ${preview.remaining_days}\n` +
        `Prorated value: ${formatCurrency(preview.prorated_value)}\n\n` +
        `The original membership will be marked as TRANSFERRED.`
      : `Transfer membership from ${member.full_name} to ${newMember.full_name}?\n\n` +
        `A new member will be created and will inherit the remaining membership.`;

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const payload = {
        from_member_id: member.id,
        transfer_fee: transferFee ? parseFloat(transferFee) : 0,
        payment_method: paymentMethod,
        reason: reason || null,
        notes: notes || null,
      };

      if (recipientMode === 'existing') {
        payload.to_member_id = selectedRecipient.id;
      } else {
        payload.new_member_full_name = newMember.full_name.trim();
        payload.new_member_phone = newMember.phone.trim();
        payload.new_member_email = newMember.email.trim() || null;
        payload.new_member_gender = newMember.gender;
        payload.new_member_address = newMember.address.trim() || null;
      }

      const result = await transferMembership(member.id, payload);

      toast.success(result.message || 'Membership transferred successfully!');

      if (onTransferComplete) onTransferComplete(result);
      onClose();
    } catch (err) {
      console.error('Transfer error:', err);
      toast.error(
        err.response?.data?.detail || 'Failed to transfer membership'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loadingPreview;
  const canSubmit =
    preview?.is_transferable &&
    !submitting &&
    (recipientMode === 'existing' ? !!selectedRecipient : true);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Transfer Membership
              </h3>
              <p className="text-[11px] text-gray-500">
                From: <strong>{member.fullName || member.full_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/60 rounded-lg"
            disabled={submitting}
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Preview loader / error */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
              <p className="text-xs text-gray-500 mt-2">
                Checking membership…
              </p>
            </div>
          )}

          {!isLoading && previewError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Cannot transfer this membership
                </p>
                <p className="text-xs text-red-700 mt-1">{previewError}</p>
              </div>
            </div>
          )}

          {!isLoading && preview?.is_transferable && (
            <>
              {/* Summary card */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  What will be transferred
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium text-gray-900">
                      {preview.plan_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Original end:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(preview.original_end_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remaining days:</span>
                    <span className="font-medium text-indigo-600">
                      {preview.remaining_days} day{preview.remaining_days !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prorated value:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(preview.prorated_value)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                  The recipient's new membership will start <strong>today</strong> and end on{' '}
                  <strong>{formatDate(preview.original_end_date)}</strong>.
                </div>
              </div>

              {/* Recipient mode toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Who is receiving the membership?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('existing')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      recipientMode === 'existing'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Existing Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('new')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      recipientMode === 'new'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    New Person
                  </button>
                </div>
              </div>

              {/* Existing member picker */}
              {recipientMode === 'existing' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select recipient
                  </label>
                  {selectedRecipient ? (
                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-indigo-700" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedRecipient.full_name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {selectedRecipient.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipient(null)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <ExistingMemberPicker
                      excludeId={member.id}
                      selectedId={selectedRecipient?.id}
                      onSelect={setSelectedRecipient}
                    />
                  )}
                </div>
              )}

              {/* New member form */}
              {recipientMode === 'new' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={newMember.full_name}
                        onChange={(e) =>
                          setNewMember({ ...newMember, full_name: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Recipient full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={newMember.phone}
                        onChange={(e) =>
                          setNewMember({ ...newMember, phone: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="+91..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newMember.email}
                        onChange={(e) =>
                          setNewMember({ ...newMember, email: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={newMember.gender}
                        onChange={(e) =>
                          setNewMember({ ...newMember, gender: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={newMember.address}
                      onChange={(e) =>
                        setNewMember({ ...newMember, address: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              {/* Optional transfer fee */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Transfer Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0 (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              {/* Reason / notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Relocating, injury, gifted to family"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Any additional context…"
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-800">
                  <strong>This action cannot be undone easily.</strong> The original
                  membership will be marked as <em>transferred</em> and{' '}
                  {member.fullName || member.full_name}'s door access will be disabled.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-4 py-3 flex justify-end gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-xs font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Transferring…
              </>
            ) : (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                Confirm Transfer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembershipTransferModal;