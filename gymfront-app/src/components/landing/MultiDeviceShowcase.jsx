import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Layers,
  CheckCircle2,
  Users,
  TrendingUp,
  Fingerprint,
  CreditCard,
  Search,
  Bell,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Calendar,
  Lock,
  Unlock,
  MessageCircle,
} from 'lucide-react';

export default function MultiDeviceShowcase() {
  const [activeDevice, setActiveDevice] = useState('all'); // 'all' | 'desktop' | 'tablet' | 'mobile'

  return (
    <section className="relative py-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Dynamic Background Motion Mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4 backdrop-blur-md">
            <Layers className="w-3.5 h-3.5" />
            <span>One Unified Cloud Platform · Any Device</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Run Your Entire Gym on{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              PC, Tablet & Mobile Phone
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Whether you're at the reception desk with a PC, walking the gym floor with an iPad,
            or tracking daily revenue on your smartphone — GymMonitor synchronizes in real-time.
          </p>

          {/* Device Switcher Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 backdrop-blur-xl max-w-2xl mx-auto">
            {[
              { id: 'all', label: 'All 3 Devices in Sync', icon: Layers },
              { id: 'desktop', label: 'PC / Desktop', icon: Monitor },
              { id: 'tablet', label: 'Tablet / iPad', icon: Tablet },
              { id: 'mobile', label: 'Mobile Phone', icon: Smartphone },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDevice === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDevice(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── DISPLAY CONTAINER ─── */}
        <div className="relative mt-8 min-h-[580px] flex items-center justify-center">

          {/* ============================================================== */}
          {/* VIEW: ALL 3 DEVICES (ISOMETRIC / LAYERED ECOSYSTEM)            */}
          {/* ============================================================== */}
          {activeDevice === 'all' && (
            <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-6 relative">
              
              {/* DESKTOP (Center / Left Anchor) */}
              <div className="w-full lg:w-[62%] bg-slate-900/90 rounded-2xl border border-slate-700/70 shadow-2xl overflow-hidden backdrop-blur-xl animate-float-slow">
                {/* Browser bar */}
                <div className="bg-slate-800/90 px-4 py-2.5 border-b border-slate-700/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-slate-400 text-[11px] hidden sm:inline">
                      gymmonitor.in/admin
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Reception Desk Live
                  </div>
                </div>

                {/* PC Screen Content */}
                <div className="p-4 sm:p-6 bg-slate-950/70">
                  {/* Top Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Total Members</span>
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="text-xl font-bold text-white mt-1">482</div>
                      <span className="text-[10px] text-emerald-400">+12 this week</span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Today Check-ins</span>
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">138</div>
                      <span className="text-[10px] text-slate-400">Gate 1 & 2 Active</span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Monthly Rev</span>
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div className="text-xl font-bold text-purple-300 mt-1">₹2,48,000</div>
                      <span className="text-[10px] text-purple-400">92% collected</span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Expiring (3d)</span>
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-xl font-bold text-amber-400 mt-1">6</div>
                      <span className="text-[10px] text-amber-300">Auto WhatsApp on</span>
                    </div>
                  </div>

                  {/* Live Activity Row */}
                  <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300">Live Biometric Punch Feed</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                        Cloud ADMS Active
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { name: 'Aarav Patel', plan: 'Gold Annual', time: '10:42 AM', device: 'Turnstile 1', ok: true },
                        { name: 'Sneha Rao', plan: 'Quarterly Cardio', time: '10:39 AM', device: 'Main Biometric', ok: true },
                        { name: 'Vikram Joshi', plan: 'Monthly Strength', time: '10:35 AM', device: 'Turnstile 1', ok: true },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="font-medium text-slate-200">{item.name}</span>
                            <span className="text-slate-400 text-[11px] hidden sm:inline">({item.plan})</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-slate-400">{item.device}</span>
                            <span className="text-slate-500">{item.time}</span>
                            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Authorized
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLET & MOBILE OVERLAY (Right Side) */}
              <div className="w-full lg:w-[38%] flex flex-col sm:flex-row lg:flex-col gap-5 items-center justify-center">

                {/* TABLET CARD */}
                <div className="w-full max-w-[340px] bg-slate-900 rounded-2xl p-4 border border-indigo-500/30 shadow-xl shadow-indigo-950/40 relative animate-float-delayed">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Tablet className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-white">iPad / Tablet Floor Mode</span>
                    </div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                      Touch Kiosk
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-gradient-to-r from-indigo-900/40 to-blue-900/40 rounded-xl border border-indigo-500/20">
                      <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">Front-Desk Check-in</span>
                      <p className="text-xs text-slate-200 font-semibold mt-0.5">Instant Member Search & Punch</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-slate-800/80 rounded-lg text-center border border-slate-700/50">
                        <Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                        <span className="text-slate-300 font-medium">+ Add Member</span>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-lg text-center border border-slate-700/50">
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                        <span className="text-slate-300 font-medium">Gate Control</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MOBILE PHONE CARD */}
                <div className="w-full max-w-[280px] bg-slate-950 rounded-3xl p-3.5 border-2 border-slate-700 shadow-2xl relative">
                  {/* Dynamic Island */}
                  <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-2.5 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                    <span className="text-[8px] text-slate-400 font-mono">Live</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Owner Mobile App</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">₹18,500 Today</span>
                    </div>

                    <div className="bg-slate-800/70 p-2 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-200">WhatsApp Alert</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>

                    <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>One-Tap Gate Unlock</span>
                    </button>
                  </div>

                  {/* Mobile Home Indicator */}
                  <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mt-2.5" />
                </div>

              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: DESKTOP PC WORKSTATION ONLY                              */}
          {/* ============================================================== */}
          {activeDevice === 'desktop' && (
            <div className="w-full max-w-5xl bg-slate-900 rounded-2xl border-2 border-slate-700 shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block" />
                  <div className="ml-3 px-4 py-1 rounded-lg bg-slate-900 text-slate-300 font-mono text-xs flex items-center gap-2">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>https://gymmonitor.in/admin/dashboard</span>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Full PC Powerhouse
                </span>
              </div>

              <div className="p-6 bg-slate-950/80">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { title: 'Total Members', val: '482', sub: '+18 this month', color: 'from-blue-600 to-cyan-500' },
                    { title: 'Active Today', val: '142', sub: '94% via biometric', color: 'from-emerald-600 to-teal-500' },
                    { title: 'Monthly Revenue', val: '₹2,84,000', sub: '+22% growth', color: 'from-purple-600 to-pink-500' },
                    { title: 'Expiring Soon (3d)', val: '8', sub: 'WhatsApp ready', color: 'from-amber-600 to-orange-500' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`} />
                      <div className="text-xs text-slate-400">{stat.title}</div>
                      <div className="text-2xl font-black text-white mt-1">{stat.val}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-200">Revenue & Cash Flow Analytics</span>
                      <span className="text-[11px] text-emerald-400">Live ₹3,12,000 Projection</span>
                    </div>
                    {/* Simulated SVG Graph */}
                    <div className="h-32 w-full flex items-end gap-3 pt-4 border-b border-slate-800 pb-2">
                      {[40, 65, 50, 85, 70, 95, 80, 100, 90, 110, 105, 120].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <div
                            style={{ height: `${h}%` }}
                            className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-md group-hover:brightness-125 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-slate-200 block mb-3">Connected Hardware</span>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        <span>Turnstile 1 (Entry)</span>
                        <span className="font-bold">Online</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        <span>Biometric Reader (Floor)</span>
                        <span className="font-bold">Online</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        <span>WhatsApp Automation API</span>
                        <span className="font-bold">Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: TABLET / IPAD PRO ONLY                                   */}
          {/* ============================================================== */}
          {activeDevice === 'tablet' && (
            <div className="w-full max-w-3xl bg-slate-900 rounded-[32px] p-4 border-[6px] border-slate-700 shadow-2xl">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="bg-slate-950 p-6 rounded-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">Reception Kiosk · Touch Mode</h3>
                    <p className="text-xs text-slate-400">Optimized for iPad Pro & Android Tablets</p>
                  </div>
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md">
                    + Quick Add Member
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                  {[
                    { title: 'Scan Member QR', icon: Zap, color: 'text-amber-400' },
                    { title: 'Biometric Gate Punch', icon: Fingerprint, color: 'text-emerald-400' },
                    { title: 'Take Membership Fees', icon: CreditCard, color: 'text-blue-400' },
                    { title: 'PT Session Check', icon: Activity, color: 'text-purple-400' },
                    { title: 'Add Daily Expense', icon: TrendingUp, color: 'text-rose-400' },
                    { title: 'Unlock Turnstile (10s)', icon: Unlock, color: 'text-cyan-400' },
                  ].map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <div
                        key={i}
                        className="p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
                      >
                        <Icon className={`w-6 h-6 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
                        <span className="text-xs font-semibold text-slate-200">{action.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: MOBILE PHONE ONLY                                        */}
          {/* ============================================================== */}
          {activeDevice === 'mobile' && (
            <div className="w-full max-w-sm bg-slate-950 rounded-[44px] p-4 border-[6px] border-slate-800 shadow-2xl relative">
              {/* Dynamic Island */}
              <div className="w-28 h-6 bg-slate-900 rounded-full mx-auto mb-3 flex items-center justify-between px-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-slate-300 font-mono">GymMonitor</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              </div>

              {/* Mobile Content */}
              <div className="p-4 bg-slate-900/90 rounded-3xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Gym Owner App</span>
                    <h4 className="text-sm font-bold text-white">Iron Paradise Fitness</h4>
                  </div>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    ONLINE
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 rounded-2xl border border-indigo-500/20">
                  <span className="text-[10px] text-indigo-300">Today's Collection</span>
                  <div className="text-xl font-black text-white mt-0.5">₹24,500</div>
                  <span className="text-[10px] text-emerald-400">14 check-ins in the last hour</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiring in 3 Days</span>
                  {[
                    { name: 'Karan Mehra', days: '2 days left', phone: '+91 98765 43210' },
                    { name: 'Ananya Roy', days: 'Tomorrow', phone: '+91 98221 00987' },
                  ].map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
                      <div>
                        <span className="font-semibold text-white block">{m.name}</span>
                        <span className="text-[10px] text-amber-400">{m.days}</span>
                      </div>
                      <button className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold shadow">
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </button>
                    </div>
                  ))}
                </div>

                <button className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30">
                  <Unlock className="w-4 h-4" />
                  Remote Gate Unlock
                </button>
              </div>

              {/* Bottom Nav Mockup */}
              <div className="flex items-center justify-around pt-3 text-slate-500 text-[10px]">
                <span className="text-indigo-400 font-bold">Home</span>
                <span>Members</span>
                <span>Attendance</span>
                <span>More</span>
              </div>
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
            </div>
          )}

        </div>

        {/* Feature Checkpoints */}
        <div className="mt-14 grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Full Cloud Synchronization</h4>
            <p className="text-xs text-slate-400 mt-1">Changes made on your phone instantly update the front-desk PC.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No Expensive Hardware Required</h4>
            <p className="text-xs text-slate-400 mt-1">Works on existing laptops, iPads, tablets, and Android or iOS phones.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Multi-Staff Role Access</h4>
            <p className="text-xs text-slate-400 mt-1">Gym owner full admin rights, trainers see schedules, receptionists manage punch-in.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
