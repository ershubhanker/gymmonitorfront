import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, MessageSquare, Send, Check, CheckCheck,
  Clock, Search, Filter, User, Building2, Copy, ExternalLink,
  RefreshCw, AlertCircle, Phone, Calendar, ArrowDown, ChevronRight,
  Sparkles, Shield, UserCheck, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchWhatsAppConversations,
  fetchWhatsAppChatMessages,
  sendWhatsAppChatMessage,
  markWhatsAppChatRead
} from '../../services/api';

const WEBHOOK_URL = 'https://api.gymmonitor.in/whatsapp/webhook';

// Format relative date / time
const formatMessageTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${timeStr}`;
};

const formatChatDateHeader = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const WhatsAppChatScreen = ({ onSelectMember }) => {
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [currentContact, setCurrentContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | unread | members | leads
  const [unreadTotal, setUnreadTotal] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // ─── Fetch Conversations ───────────────────────────────────────────────
  const loadConversations = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingConversations(true);
    try {
      const data = await fetchWhatsAppConversations({
        search: searchTerm || undefined,
        unread_only: filterType === 'unread' ? true : undefined,
      });
      setConversations(data.conversations || []);
      setUnreadTotal(data.unread_total || 0);

      // If a chat is selected, refresh its contact info
      if (selectedPhone) {
        const found = (data.conversations || []).find(
          (c) => c.phone_number === selectedPhone || c.phone_key === selectedPhone.slice(-10)
        );
        if (found) {
          setCurrentContact((prev) => ({ ...prev, ...found }));
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (!isSilent) toast.error('Failed to load WhatsApp conversations');
    } finally {
      if (!isSilent) setLoadingConversations(false);
    }
  }, [searchTerm, filterType, selectedPhone]);

  // Initial load & filter change
  useEffect(() => {
    loadConversations();
  }, [filterType]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadConversations();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── Fetch Messages for Selected Chat ──────────────────────────────────
  const loadMessages = useCallback(async (phone, isSilent = false) => {
    if (!phone) return;
    if (!isSilent) setLoadingMessages(true);
    try {
      const data = await fetchWhatsAppChatMessages(phone);
      setMessages(data.messages || []);
      if (data.contact) {
        setCurrentContact(data.contact);
      }
      // Auto mark read if there were unread messages
      markWhatsAppChatRead(phone).then(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.phone_number === phone || c.phone_key === phone.slice(-10)
              ? { ...c, unread_count: 0 }
              : c
          )
        );
      }).catch(console.error);

      if (!isSilent) {
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      if (!isSilent) toast.error('Failed to load chat history');
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }, []);

  const handleSelectConversation = (conv) => {
    setSelectedPhone(conv.phone_number);
    setCurrentContact(conv);
    loadMessages(conv.phone_number);
  };

  // ─── Polling for Live Incoming Replies ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadConversations(true);
        if (selectedPhone) {
          loadMessages(selectedPhone, true);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, selectedPhone]);

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // ─── Send Reply ────────────────────────────────────────────────────────
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedPhone || sending) return;

    const text = replyText.trim();
    setSending(true);

    try {
      const res = await sendWhatsAppChatMessage(selectedPhone, text, currentContact?.gym_id);
      setReplyText('');
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        scrollToBottom();
      }
      toast.success('Reply sent via WhatsApp!');
      loadConversations(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('Send error:', err);
      const detail = err.response?.data?.detail || 'Failed to send WhatsApp message';
      toast.error(detail, { duration: 6000 });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const copyPhoneNumber = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success('Phone number copied!');
  };

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterType === 'members') return c.contact_type === 'member';
    if (filterType === 'leads') return c.contact_type === 'lead';
    return true;
  });

  // Group messages by date
  const groupedMessages = [];
  let lastDateHeader = null;
  messages.forEach((m) => {
    const dateHeader = formatChatDateHeader(m.timestamp);
    if (dateHeader && dateHeader !== lastDateHeader) {
      groupedMessages.push({ type: 'header', text: dateHeader, id: `header_${dateHeader}` });
      lastDateHeader = dateHeader;
    }
    groupedMessages.push({ type: 'message', data: m, id: m.id || m.message_id });
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-8.5rem)] min-h-[550px]">
      {/* ── Top Bar / Webhook Status Banner ── */}
      <div className="bg-gray-950/80 border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Meta Webhook Live
          </div>
          <span className="text-gray-400 hidden sm:inline">Listening for incoming replies at:</span>
          <code className="text-gray-300 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 font-mono text-[11px] select-all">
            {WEBHOOK_URL}
          </code>
        </div>
        <div className="flex items-center gap-3">
          {unreadTotal > 0 && (
            <span className="bg-emerald-500 text-white font-semibold px-2 py-0.5 rounded-full text-[11px]">
              {unreadTotal} Unread {unreadTotal === 1 ? 'Reply' : 'Replies'}
            </span>
          )}
          <button
            onClick={() => {
              loadConversations();
              if (selectedPhone) loadMessages(selectedPhone);
            }}
            className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            title="Refresh chats"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main Chat Screen Split Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Pane: Conversation List ── */}
        <div className="w-full md:w-80 lg:w-96 border-r border-gray-800 flex flex-col bg-gray-900/50 flex-shrink-0">
          {/* Search & Filter */}
          <div className="p-3 border-b border-gray-800 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone..."
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: `Unread (${unreadTotal})` },
                { id: 'members', label: 'Members' },
                { id: 'leads', label: 'Leads' }
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilterType(chip.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                    filterType === chip.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40">
            {loadingConversations && conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500 mb-2" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-gray-600" />
                <p className="font-medium text-gray-400">No conversations found</p>
                <p className="text-[11px] text-gray-500">
                  When members reply to your WhatsApp reminders or messages, their replies will appear here automatically.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedPhone === conv.phone_number;
                const hasUnread = conv.unread_count > 0;

                return (
                  <button
                    key={conv.phone_number || conv.phone_key}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-3 text-left transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-purple-950/40 border-l-4 border-emerald-500'
                        : hasUnread
                        ? 'bg-gray-800/40 hover:bg-gray-800/70 border-l-4 border-emerald-400/80'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {conv.profile_image ? (
                        <img
                          src={conv.profile_image}
                          alt={conv.contact_name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-700"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white ${
                          conv.contact_type === 'member'
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                            : conv.contact_type === 'lead'
                            ? 'bg-gradient-to-br from-amber-600 to-orange-700'
                            : 'bg-gradient-to-br from-purple-600 to-indigo-700'
                        }`}>
                          {conv.contact_name?.charAt(0) || 'U'}
                        </div>
                      )}
                      {conv.contact_type === 'member' && (
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[9px] text-white rounded-full px-1 font-bold">
                          M
                        </span>
                      )}
                      {conv.contact_type === 'lead' && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-[9px] text-white rounded-full px-1 font-bold">
                          L
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${hasUnread ? 'text-white' : 'text-gray-200'}`}>
                          {conv.contact_name}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {formatMessageTime(conv.last_message_time)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-gray-400 font-mono">
                          +{conv.phone_number}
                        </span>
                        {conv.gym_name && (
                          <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.2 rounded truncate max-w-[110px]" title={conv.gym_name}>
                            {conv.gym_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate ${hasUnread ? 'text-emerald-300 font-medium' : 'text-gray-400'}`}>
                          {conv.last_direction === 'outbound' && (
                            <span className="text-gray-400 mr-1">You:</span>
                          )}
                          {conv.last_message}
                        </p>
                        {hasUnread && (
                          <span className="bg-emerald-500 text-white font-bold text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Pane: Chat History & Reply ── */}
        <div className="flex-1 flex flex-col bg-gray-950/70 overflow-hidden">
          {!selectedPhone ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/50">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">WhatsApp Live Chat Screen</h3>
              <p className="text-xs text-gray-400 max-w-md mb-4">
                Select a conversation on the left to see full chat history, read member replies, and send instant WhatsApp replies back.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 max-w-sm text-left text-xs space-y-2 text-gray-300">
                <div className="flex items-center gap-2 font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Meta Cloud API Connected
                </div>
                <p className="text-gray-400 text-[11px]">
                  When a member replies via WhatsApp, Meta delivers it directly to your webhook. You have a 24-hour window to chat with them for free!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {currentContact?.profile_image ? (
                    <img
                      src={currentContact.profile_image}
                      alt={currentContact.name || currentContact.contact_name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-xs uppercase text-white flex-shrink-0">
                      {(currentContact?.name || currentContact?.contact_name || 'U').charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-white truncate">
                        {currentContact?.name || currentContact?.contact_name}
                      </h4>
                      {currentContact?.type === 'member' && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0.2 rounded font-medium">
                          Member
                        </span>
                      )}
                      {currentContact?.type === 'lead' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0.2 rounded font-medium">
                          Lead
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="font-mono">+{selectedPhone}</span>
                      {currentContact?.gym_name && (
                        <>
                          <span>•</span>
                          <span className="text-gray-300">{currentContact.gym_name}</span>
                        </>
                      )}
                      {currentContact?.membership_plan && (
                        <>
                          <span>•</span>
                          <span className="text-purple-400 font-medium">{currentContact.membership_plan}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyPhoneNumber(`+${selectedPhone}`)}
                    className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Copy phone number"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={`https://wa.me/${selectedPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 text-xs px-2.5"
                    title="Open in WhatsApp Web"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">WhatsApp Web</span>
                  </a>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500 mb-2" />
                  </div>
                ) : groupedMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs space-y-2">
                    <MessageSquare className="h-8 w-8 text-gray-600" />
                    <p>No messages in this conversation yet</p>
                    <p className="text-[11px] text-gray-500">
                      You can type a reply below to send a WhatsApp message directly to this number.
                    </p>
                  </div>
                ) : (
                  groupedMessages.map((item) => {
                    if (item.type === 'header') {
                      return (
                        <div key={item.id} className="flex justify-center my-3">
                          <span className="bg-gray-800/90 text-gray-400 text-[10px] uppercase font-semibold tracking-wider px-3 py-0.5 rounded-full border border-gray-700/60 shadow-sm">
                            {item.text}
                          </span>
                        </div>
                      );
                    }

                    const m = item.data;
                    const isInbound = m.direction === 'inbound';
                    const isAutomated = m.is_automated;

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-md ${
                            isInbound
                              ? 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700/70'
                              : isAutomated
                              ? 'bg-purple-950/80 text-purple-100 border border-purple-800/60 rounded-tr-sm'
                              : 'bg-emerald-600 text-white rounded-tr-sm'
                          }`}
                        >
                          {/* Sender label */}
                          <div className="flex items-center justify-between gap-3 text-[10px] mb-1 font-semibold opacity-80">
                            <span>
                              {isInbound
                                ? m.sender_name || 'Member'
                                : isAutomated
                                ? '🤖 Automated Alert'
                                : 'Admin'}
                            </span>
                          </div>

                          {/* Message Text */}
                          <p className="whitespace-pre-wrap leading-relaxed select-text">
                            {m.text}
                          </p>

                          {/* Footer with time and ticks */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                            <span>{formatMessageTime(m.timestamp)}</span>
                            {!isInbound && (
                              <span>
                                {m.status === 'read' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-cyan-300 inline" title="Read" />
                                ) : m.status === 'delivered' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-gray-300 inline" title="Delivered" />
                                ) : m.status === 'sent' ? (
                                  <Check className="h-3.5 w-3.5 text-gray-300 inline" title="Sent" />
                                ) : m.status === 'failed' ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-400 inline" title="Failed to deliver" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-gray-400 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <div className="bg-gray-900 border-t border-gray-800 p-3">
                <form onSubmit={handleSendReply} className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      placeholder={`Type a reply to ${currentContact?.name || currentContact?.contact_name || 'contact'}... (Press Enter to send, Shift+Enter for new line)`}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-50"
                      disabled={sending}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-medium p-2.5 rounded-xl transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-950/50"
                    title="Send WhatsApp Message"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 px-1">
                  <span>Replying via Meta WhatsApp Cloud API</span>
                  <span className="text-emerald-400/80">Active 24h Customer Service Window</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChatScreen;

