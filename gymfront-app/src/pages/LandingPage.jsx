import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Users,
  TrendingUp,
  CreditCard,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Clock,
  IndianRupee,
  Wallet,
  Receipt,
  Fingerprint,
  CalendarCheck,
  Coffee,
  Activity,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  Sparkles,
  MessageCircle,
  Lock,
  Unlock,
  CheckCircle2,
} from 'lucide-react';
import MultiDeviceShowcase from '../components/landing/MultiDeviceShowcase';
import LiveBiometricSimulator from '../components/landing/LiveBiometricSimulator';

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description: 'Easily add, track and manage all your gym members in one place. View profiles, attendance, 5 active plan limits and history.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Fingerprint,
    title: 'Biometric & Turnstile Access',
    description: 'Direct cloud integration with ZKTeco and ADMS devices. Instant member bio-sync, turnstile gate unlock and fraud-proof attendance.',
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Wallet,
    title: 'Member Balance & Dues',
    description: 'Track member payments, outstanding balances, and payment history. Send automatic WhatsApp reminders for pending dues.',
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Receipt,
    title: 'Gym Daily Expenses',
    description: 'Log and track daily operational expenses, generate expense reports, and monitor your gym\'s financial health.',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    icon: CalendarCheck,
    title: 'Staff Attendance & Shifts',
    description: 'Track staff check-ins, manage shifts, biometric staff registration and generate attendance reports for your entire team.',
    color: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Automation',
    description: 'Send automated invoice PDFs, expiry warnings (3 days before), payment receipts, and birthday greetings straight to WhatsApp.',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: IndianRupee,
    title: 'Real-time Revenue & MRR',
    description: 'Monitor monthly revenue, annual cash flow, pending collections and software plan performance with interactive charts.',
    color: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Growth Reports',
    description: 'Understand retention, member churn, peak gym hours, and trainer commissions with detailed visual breakdown.',
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: Shield,
    title: 'Cross-Device Cloud Security',
    description: 'Enterprise data safety with automated backups. Access anywhere from PC, Mac, iPad, Android tablets, iPhone and Android phones.',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

const stats = [
  { value: '500+', label: 'Gyms Managed' },
  { value: '50K+', label: 'Members Tracked' },
  { value: '<300ms', label: 'Biometric Gate Sync' },
  { value: '99.9%', label: 'Uptime & Cloud Sync' },
];

const highlights = [
  'Zero paper registers or messy spreadsheets',
  'Works on any PC, iPad, tablet, or smartphone',
  'Automated WhatsApp payment receipts & reminders',
  'Biometric turnstile access with instant block/allow',
  'Upcoming 3-day membership expiry alerts',
  'Staff shift management and biometric linking',
  'Daily operational expenses and profit margin analytics',
  'Sub-second member search by name, phone or ID',
];

const planFeatures = [
  'Unlimited Member Management',
  'Member Balance & Payment Tracking',
  'Biometric Device & Turnstile Access',
  'Automated WhatsApp Reminders & Invoices',
  'Gym Daily Expense Tracking',
  'Staff Attendance & Bio-Sync',
  'Real-time Revenue & Cash Flow Charts',
  'Full PC, Tablet & Mobile Phone Access',
  'Instant Member Expiry Alerts',
  'Priority 24/7 Phone & WhatsApp Support',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'

  const isYearly = billingCycle === 'yearly';
  const basePrice = isYearly ? 3600 : 399;
  const gstRate = 0.18;
  const gstAmount = Math.round(basePrice * gstRate);
  const totalPrice = basePrice + gstAmount;
  const period = isYearly ? '/year' : '/month';
  const monthlyEquivalent = isYearly ? Math.round((basePrice / 12) * 100) / 100 : basePrice;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-2 rounded-xl font-bold text-lg shadow-md shadow-indigo-500/20 flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
              GymMonitor
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/pricing')}
              className="text-slate-600 hover:text-indigo-600 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-50 transition-all hidden sm:inline"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-slate-700 hover:text-indigo-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-slate-100/80 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:scale-105 active:scale-100 transition-all flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section with Motion Graphics ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pt-24 pb-28">
        
        {/* Animated Gradient Aurora Mesh */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-blue-600/30 via-indigo-500/30 to-purple-600/25 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          {/* Top Pill */}
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full mb-8 backdrop-blur-md shadow-lg shadow-indigo-500/10 animate-float-slow">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Next-Generation Gym Management & Biometric Gate OS</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight max-w-5xl mx-auto">
            Run Your Gym With{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Superpowers.
            </span>
            <br />
            <span className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-300 block mt-2">
              On PC, Tablet & Mobile Phone.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-xl text-slate-400 leading-relaxed font-normal">
            Automate member attendance, control biometric turnstiles, send instant WhatsApp fee reminders,
            and track daily gym revenue from any device in real-time.
          </p>

          {/* Cross-Device Availability Badge */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" /> PC / Mac Reception
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80">
              <Tablet className="w-3.5 h-3.5 text-indigo-400" /> iPad / Tablet Kiosk
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80">
              <Smartphone className="w-3.5 h-3.5 text-purple-400" /> Owner Mobile App
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:scale-105 active:scale-100 transition-all text-base w-full sm:w-auto"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 bg-slate-900/90 text-slate-200 font-semibold px-8 py-4 rounded-2xl border border-slate-700 hover:border-indigo-400 hover:bg-slate-800 transition-all text-base w-full sm:w-auto"
            >
              <span>Already a Member? Login</span>
            </button>
          </div>

          {/* Star rating social proof */}
          <div className="mt-8 flex items-center justify-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
            <span className="ml-2 text-slate-400 text-sm font-medium">
              Trusted by 500+ Fitness Clubs & Gym Owners Across India
            </span>
          </div>

          {/* Floating Live Motion Badges */}
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl animate-float-slow flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Biometric Gate Unlocked</span>
                <span className="text-[11px] text-slate-400">Turnstile response in 0.2s</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl animate-float-delayed flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">₹2.45L Monthly Revenue</span>
                <span className="text-[11px] text-emerald-400">+18% growth this month</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl animate-float-slow flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">WhatsApp Expiry Alerts</span>
                <span className="text-[11px] text-slate-400">Auto-sent 3 days before</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 py-10 shadow-inner">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center text-white">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-black tracking-tight">{s.value}</div>
              <div className="text-indigo-100 text-xs sm:text-sm mt-1 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Multi-Device Showcase (PC, Tablet & Mobile Phone) ── */}
      <MultiDeviceShowcase />

      {/* ── Live Biometric & Turnstile Motion Graphic Simulator ── */}
      <LiveBiometricSimulator />

      {/* ── Comprehensive Features Grid ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Powerful Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
              Everything Your Gym Needs Under One Roof
            </h2>
            <p className="mt-3 text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
              From day-to-day turnstile access to multi-year revenue analytics — built for modern fitness owners.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-slate-100 group relative overflow-hidden"
                >
                  <div className={`inline-flex p-3.5 rounded-2xl ${f.bg} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison Highlights ── */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                Upgrade Your Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mt-4">
                Say Goodbye to
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Messy Registers & Excel</span>
              </h2>
              <p className="mt-4 text-slate-500 text-base sm:text-lg leading-relaxed">
                Gym owners waste over 15 hours every week tracking manual attendance, calculating monthly fee dues,
                and chasing expiring memberships. GymMonitor automates the entire process on autopilot.
              </p>

              <ul className="mt-6 space-y-3">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all text-sm"
                >
                  <span>Start Free Trial Now</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Live Interactive Card Mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-3xl rotate-2 scale-105 opacity-50 blur-xl" />
              <div className="relative bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-800 text-white">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                      GM
                    </div>
                    <div>
                      <span className="text-xs font-bold block">GymMonitor Live Dashboard</span>
                      <span className="text-[10px] text-emerald-400">Real-Time Sync Active</span>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                    100% Cloud Connected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Total Members', val: '248', sub: '+14 this month', color: 'text-blue-400' },
                    { label: 'Monthly Revenue', val: '₹1,24,500', sub: '92% collected', color: 'text-emerald-400' },
                    { label: "Today's Check-ins", val: '42', sub: 'Biometric verified', color: 'text-purple-400' },
                    { label: 'Expiring in 3 Days', val: '6', sub: 'WhatsApp alert queued', color: 'text-amber-400' },
                  ].map((c, i) => (
                    <div key={i} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <span className="text-[11px] text-slate-400 block">{c.label}</span>
                      <span className={`text-xl font-black ${c.color} block mt-0.5`}>{c.val}</span>
                      <span className="text-[10px] text-slate-500">{c.sub}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-300 block mb-2">Live Turnstile Punches</span>
                  {[
                    { name: 'Kavita Verma', time: '08:15 AM', type: 'Fingerprint', ok: true },
                    { name: 'Manish Rawat', time: '09:20 AM', type: 'RFID Card', ok: true },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-slate-200">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">{p.type}</span>
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Passed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 border border-indigo-100">
              <IndianRupee className="h-3.5 w-3.5" />
              <span>Transparent & Simple Pricing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              One Transparent Plan. Every Feature Included.
            </h2>
            <p className="mt-3 text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
              No hidden add-ons. Full access to biometric integration, WhatsApp reminders, and multi-device support.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex flex-col items-center gap-2 mb-12">
            <div className="inline-flex items-center bg-white rounded-full p-1.5 shadow-md border border-slate-200">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  !isYearly
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Plan
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  isYearly
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yearly Plan
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isYearly ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  SAVE 25%
                </span>
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {isYearly ? 'Billed annually · Most popular for gym owners' : 'Billed monthly · Cancel anytime'}
            </span>
          </div>

          {/* Plan Card */}
          <div className="max-w-lg mx-auto">
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-3 text-center">
                  <span className="text-white text-xs font-extrabold tracking-wider uppercase">
                    {isYearly ? '⭐ Best Value · Save ₹1,188 Annually' : 'Pay as you go · Monthly Flexibility'}
                  </span>
                </div>

                <div className="p-8 sm:p-10">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-black text-slate-900">GymMonitor Complete Pro</h3>
                    <p className="text-sm text-slate-500 mt-1">Full access on PC, Tablet & Mobile Phone</p>
                  </div>

                  <div className="text-center mb-4">
                    <div className="flex items-start justify-center gap-1">
                      <span className="text-3xl font-bold text-slate-700 mt-2">₹</span>
                      <span className="text-6xl font-black text-slate-900 tracking-tight leading-none">
                        {basePrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-base font-semibold text-slate-500 self-end mb-1">
                        {period}
                      </span>
                    </div>
                    {isYearly && (
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        Just ₹{monthlyEquivalent.toLocaleString('en-IN')}/month when billed annually
                      </p>
                    )}
                  </div>

                  <div className="my-6 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Software Base Subscription:</span>
                      <span className="font-semibold text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span className="font-semibold text-slate-900">₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                      <span>Total Amount:</span>
                      <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/signup')}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/25 hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all text-base"
                  >
                    Start 14-Day Free Trial
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                    Instant Setup · No credit card required · Cancel anytime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
            Ready to Automate Your Gym Operations?
          </h2>
          <p className="text-indigo-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Get instant access from your PC, Tablet or Mobile. Connect your biometric device in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center justify-center gap-2 bg-white text-indigo-700 font-extrabold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-100 transition-all text-base"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 border-2 border-white/60 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-base"
            >
              <span>Login to Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-center text-sm border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl font-bold flex items-center gap-2 shadow">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="text-white font-extrabold text-lg">GymMonitor</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-5 text-xs text-slate-400">
            <a href="/pricing" className="hover:text-cyan-400 transition-colors">Pricing</a>
            <span className="text-slate-700">|</span>
            <a href="/privacy-policy" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <span className="text-slate-700">|</span>
            <a href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
            <span className="text-slate-700">|</span>
            <a href="/login" className="hover:text-cyan-400 transition-colors">Refund Policy</a>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} GymMonitor by Maskottchen Technology. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Support: <a href="mailto:info@maskottchentechnology.com" className="text-indigo-400 hover:underline">info@maskottchentechnology.com</a>
          </p>
        </div>
      </footer>

    </div>
  );
}