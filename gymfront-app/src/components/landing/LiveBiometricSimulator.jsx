import React, { useState } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  XCircle,
  Unlock,
  Lock,
  Zap,
  MessageCircle,
  Activity,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function LiveBiometricSimulator() {
  const [punchState, setPunchState] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'blocked'
  const [checkinCount, setCheckinCount] = useState(138);
  const [simulateType, setSimulateType] = useState('active'); // 'active' | 'expired'

  const handleSimulatePunch = () => {
    if (punchState === 'scanning') return;

    setPunchState('scanning');

    setTimeout(() => {
      if (simulateType === 'active') {
        setPunchState('success');
        setCheckinCount((prev) => prev + 1);
      } else {
        setPunchState('blocked');
      }

      setTimeout(() => {
        setPunchState('idle');
      }, 4000);
    }, 900);
  };

  return (
    <section className="relative py-24 bg-slate-900 text-white overflow-hidden border-y border-slate-800">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Hardware Motion Simulator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Experience Sub-Second{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Biometric & Turnstile Control
            </span>
          </h2>
          <p className="mt-3 text-slate-400 text-base sm:text-lg">
            See how GymMonitor communicates with biometric devices and physical gates in under 300ms.
          </p>

          {/* Test Mode Selector */}
          <div className="mt-6 inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setSimulateType('active');
                setPunchState('idle');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                simulateType === 'active'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulate: Active Member
            </button>
            <button
              onClick={() => {
                setSimulateType('expired');
                setPunchState('idle');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                simulateType === 'expired'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulate: Expired Member
            </button>
          </div>
        </div>

        {/* Simulator Device Box */}
        <div className="grid lg:grid-cols-12 gap-8 items-center bg-slate-950/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl backdrop-blur-xl">
          
          {/* SENSOR TOUCH PAD (Col 5) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl border border-slate-700/70 text-center relative overflow-hidden">
            
            {/* Live Scan laser line */}
            {punchState === 'scanning' && (
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan z-20 pointer-events-none" />
            )}

            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              ZKTeco / ADMS Optical Scanner
            </span>

            {/* Interactive Fingerprint Pad Button */}
            <button
              onClick={handleSimulatePunch}
              disabled={punchState === 'scanning'}
              className={`relative w-36 h-36 rounded-3xl flex items-center justify-center transition-all duration-300 transform active:scale-95 group ${
                punchState === 'scanning'
                  ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.4)] animate-pulse'
                  : punchState === 'success'
                  ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.5)]'
                  : punchState === 'blocked'
                  ? 'bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.5)]'
                  : 'bg-slate-800 border-2 border-slate-600 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20'
              }`}
            >
              {punchState === 'scanning' && (
                <div className="absolute inset-0 rounded-3xl bg-cyan-400/10 animate-ping" />
              )}
              
              <Fingerprint
                className={`w-20 h-20 transition-all duration-300 ${
                  punchState === 'scanning'
                    ? 'text-cyan-400 scale-105'
                    : punchState === 'success'
                    ? 'text-emerald-400 scale-110'
                    : punchState === 'blocked'
                    ? 'text-rose-400 scale-110'
                    : 'text-slate-400 group-hover:text-indigo-400 group-hover:scale-105'
                }`}
              />
            </button>

            <div className="mt-5">
              <span className="text-xs font-semibold text-slate-300 block">
                {punchState === 'idle' && '👆 Click Fingerprint To Test Punch'}
                {punchState === 'scanning' && '⚡ Verifying Biometric Hardware (180ms)...'}
                {punchState === 'success' && '✅ Verified! Turnstile Unlocked (10s)'}
                {punchState === 'blocked' && '⛔ Turnstile Locked — Membership Expired'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Supports Fingerprint, RFID Cards, Face Recognition & QR
              </span>
            </div>
          </div>

          {/* REAL-TIME RESPONSE FEED (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Status Card */}
            <div className={`p-4 rounded-2xl border transition-all duration-500 ${
              punchState === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                : punchState === 'blocked'
                ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/50'
                : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {punchState === 'success' ? (
                    <Unlock className="w-5 h-5 text-emerald-400" />
                  ) : punchState === 'blocked' ? (
                    <Lock className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Activity className="w-5 h-5 text-indigo-400" />
                  )}
                  <span className="text-sm font-bold text-white">
                    {punchState === 'success'
                      ? 'GATE 1 TURNSTILE: OPEN'
                      : punchState === 'blocked'
                      ? 'GATE 1 TURNSTILE: CLOSED'
                      : 'HARDWARE STATUS: READY'}
                  </span>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  punchState === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : punchState === 'blocked'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {punchState === 'success' ? '0.24s LATENCY' : 'CLOUD ADMS'}
                </span>
              </div>

              {/* Member Result Info */}
              {punchState === 'success' && (
                <div className="bg-slate-950/70 p-3 rounded-xl border border-emerald-500/30 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>Member: <strong>Aman Verma</strong> (ID: 9876543210)</span>
                    <span className="text-emerald-400">Paid Member</span>
                  </div>
                  <div className="text-slate-400 text-[11px] flex justify-between">
                    <span>Plan: 12-Month Unlimited Pro</span>
                    <span>Valid Till: 24 Dec 2026</span>
                  </div>
                </div>
              )}

              {punchState === 'blocked' && (
                <div className="bg-slate-950/70 p-3 rounded-xl border border-rose-500/30 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>Member: <strong>Rohit Gupta</strong> (ID: 9811223344)</span>
                    <span className="text-rose-400">Access Denied</span>
                  </div>
                  <div className="text-rose-300 text-[11px] flex justify-between">
                    <span>Reason: Membership Expired 2 days ago</span>
                    <span>Auto-WhatsApp Sent</span>
                  </div>
                </div>
              )}

              {punchState === 'idle' && (
                <p className="text-xs text-slate-400">
                  When members swipe RFID or touch fingerprint, turnstiles unlock immediately if the member's plan is active.
                  If expired, the gate stays locked and a WhatsApp fee link is dispatched automatically.
                </p>
              )}
            </div>

            {/* Live Metrics Counters */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Today Check-ins</span>
                <span className="text-xl font-bold text-emerald-400">{checkinCount}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Sync Speed</span>
                <span className="text-xl font-bold text-cyan-400">&lt; 300ms</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Device Uptime</span>
                <span className="text-xl font-bold text-indigo-400">99.98%</span>
              </div>
            </div>

            {/* WhatsApp Integration Preview */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Automated WhatsApp Check-in & Expiry Alerts</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                Active
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
