// src/pages/LiveDisplay.jsx
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';

// ─────────────────────────────────────────────────────────────
// Behaviour
// ─────────────────────────────────────────────────────────────
// • Every 10 seconds:
//     1. Fire POST /attendance/sync-attendance
//        (this is exactly what the "Refresh" button on the Live
//         Attendance page does — it tells the bridge to pull the
//         latest records from the K30 and push them to the backend)
//     2. Wait ~2 seconds for the bridge to complete the sync
//     3. GET /attendance/latest-punch to fetch whatever's new
// • The most recent punch stays on screen indefinitely.
// • When a new punch is detected, the card swaps to it.
// • The idle "Welcome to the Gym" screen shows only before the
//   first punch has ever loaded.
const SYNC_INTERVAL_MS = 10_000;   // how often to trigger a device sync
const SYNC_SETTLE_MS = 2_000;      // wait after triggering sync before reading
const POLL_MS = 2_000;             // fast GET poll (cheap, reads DB only)

export default function LiveDisplay() {
  const [searchParams] = useSearchParams();
  const gymId = searchParams.get('gym_id');

  const [gymName, setGymName] = useState('Gym Monitor');
  const [current, setCurrent] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [clock, setClock] = useState(new Date());

  const lastSeqRef = useRef(-1);
  const lastOkRef = useRef(0);
  const cancelledRef = useRef(false);

  // ---------- 1-second clock ----------
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---------- trigger device sync every 10s ----------
  useEffect(() => {
    cancelledRef.current = false;

    const triggerSync = async () => {
      if (cancelledRef.current) return;
      if (document.visibilityState === 'hidden') return;  // skip when tab hidden

      try {
        await api.post('/attendance/sync-attendance');
        // Response shape may vary; we don't need to inspect it.
        // The subsequent GET poll (below) will pick up anything new.
      } catch (err) {
        // Non-fatal — the GET poll continues regardless. We only log
        // at debug level so a flaky sync doesn't spam the console.
        console.debug('[LiveDisplay] sync-attendance failed:', err?.message || err);
      }
    };

    // Fire one immediately on mount, then every SYNC_INTERVAL_MS
    triggerSync();
    const t = setInterval(triggerSync, SYNC_INTERVAL_MS);

    // Also fire when the tab regains visibility
    const onVisibility = () => {
      if (document.visibilityState === 'visible') triggerSync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ---------- poll latest-punch every 2s ----------
  useEffect(() => {
    let pollTimer = null;

    const scheduleNext = () => {
      if (pollTimer) clearTimeout(pollTimer);
      if (cancelledRef.current) return;
      pollTimer = setTimeout(poll, POLL_MS);
    };

    const poll = async () => {
      if (cancelledRef.current) return;

      if (document.visibilityState === 'hidden') {
        scheduleNext();
        return;
      }

      try {
        const params = {};
        if (gymId) params.gym_id = gymId;
        if (lastSeqRef.current >= 0) params.since_seq = lastSeqRef.current;

        const { data } = await api.get('/attendance/latest-punch', { params });
        if (cancelledRef.current) return;

        lastOkRef.current = Date.now();
        setConnection('ok');

        if (data?.seq != null) {
          lastSeqRef.current = data.seq;
          const incoming = Array.isArray(data.events) ? data.events : [];

          if (incoming.length > 0) {
            // If several punches arrived between polls, show the newest one.
            const latest = incoming[incoming.length - 1];
            const ev = { ...latest };
            if (ev.photo_url && !ev.photo_url.startsWith('http')) {
              ev.photo_url = `${API_BASE_URL}${ev.photo_url}`;
            }
            if (ev.gym_name) setGymName(ev.gym_name);
            setCurrent(ev);
          }
        }
      } catch (err) {
        if (cancelledRef.current) return;
        const sinceOk = Date.now() - lastOkRef.current;
        if (lastOkRef.current === 0 || sinceOk > 30_000) setConnection('offline');
        else setConnection('stale');
      } finally {
        scheduleNext();
      }
    };

    poll();

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [gymId]);

  // ---------- formatters ----------
  const fmtDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${day}-${mon}-${year} ${hh}:${mm}:${ss} ${ampm}`;
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}-${mon}-${d.getFullYear()}`;
  };

  const fmtMoney = (n, sym) => {
    if (n === null || n === undefined) return '—';
    try {
      return `${sym || '₹'} ${Number(n).toLocaleString('en-IN')}`;
    } catch {
      return `${sym || '₹'} ${n}`;
    }
  };

  const clockStr = clock.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  const statusColor =
    connection === 'ok' ? 'bg-green-400'
    : connection === 'stale' ? 'bg-amber-400'
    : connection === 'offline' ? 'bg-red-400'
    : 'bg-gray-400';

  const statusText =
    connection === 'ok' ? 'Live · auto-syncing every 10s'
    : connection === 'stale' ? 'Reconnecting…'
    : connection === 'offline' ? 'Offline'
    : 'Connecting…';

  const ev = current;
  const isCheckout = ev?.event_type === 'check_out';
  const visible = !!ev;

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden
                    bg-[radial-gradient(circle_at_30%_20%,#1aa06d_0%,#0b3d2e_70%)]">
      <div className="absolute top-6 inset-x-0 text-center pointer-events-none">
        <h1 className="text-white text-3xl md:text-5xl font-extrabold tracking-widest uppercase
                       drop-shadow-lg opacity-95">
          {gymName}
        </h1>
      </div>
      <div className="absolute top-6 right-8 text-white text-xl md:text-2xl font-semibold
                      tracking-wider drop-shadow-lg opacity-90">
        {clockStr}
      </div>

      {visible && ev ? (
        <div
          key={ev.attendance_id || ev.timestamp}
          className="bg-white rounded-3xl shadow-2xl px-8 md:px-12 py-8 md:py-10
                     w-[min(94vw,1400px)] min-h-[60vh] flex flex-col md:flex-row gap-8 md:gap-12
                     items-center animate-[fadeIn_.35s_ease]"
        >
          <div className="flex-none w-56 h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden
                          bg-gray-100 shadow-inner ring-2 ring-gray-200 flex items-center justify-center">
            {ev.photo_url ? (
              <img
                src={ev.photo_url}
                alt={ev.user_name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span className="text-7xl md:text-8xl font-black text-emerald-600 opacity-75">
                {(ev.user_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">
            <div className={`flex items-center gap-4 px-5 py-3 md:py-4 rounded-2xl border-2
                            ${isCheckout
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-green-50 border-green-200'}`}>
              <span className="text-3xl md:text-4xl">{isCheckout ? '🚪' : '✅'}</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</span>
                <span className={`text-2xl md:text-3xl font-black
                                  ${isCheckout ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {(ev.event_type || 'check_in').replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <InfoPill icon="🆔" label="Member ID" value={ev.user_id || '—'} />
              <InfoPill icon="👤" label="Name" value={ev.user_name || '—'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <InfoPill icon="📅" label="End Date" value={fmtDate(ev.end_date)} />
              <InfoPill icon="💳" label="Balance" value={fmtMoney(ev.balance, ev.currency_symbol)} />
            </div>

            <InfoPill icon="🕒" label="In Date & Time" value={fmtDateTime(ev.timestamp)} />
          </div>
        </div>
      ) : (
        <div className="text-white text-center flex flex-col items-center gap-6">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-dashed
                          border-white/35 bg-white/10 flex items-center justify-center
                          text-7xl md:text-8xl animate-pulse">
            💪
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide m-0">
            Welcome to the Gym
          </h2>
          <p className="text-xl md:text-2xl text-white/80 m-0">
            Please scan your fingerprint to check in
          </p>
        </div>
      )}

      <div className="absolute bottom-5 left-6 flex items-center gap-2 text-white/70 text-sm">
        <span className={`inline-block w-3 h-3 rounded-full ${statusColor} shadow-lg`} />
        {statusText}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

function InfoPill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 md:py-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
      <span className="text-2xl md:text-3xl flex-none w-10 text-center">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xl md:text-2xl font-extrabold text-gray-900 truncate">
          {value}
        </span>
      </div>
    </div>
  );
}