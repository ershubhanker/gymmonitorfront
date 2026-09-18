import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Check,
  Zap,
  Shield,
  Users,
  Wallet,
  Receipt,
  Fingerprint,
  CalendarCheck,
  Activity,
  BarChart3,
  IndianRupee,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

const planFeatures = [
  { icon: Users, text: 'Unlimited Member Management' },
  { icon: Wallet, text: 'Member Balance & Payment Tracking' },
  { icon: Receipt, text: 'Gym Daily Expense Tracking' },
  { icon: Fingerprint, text: 'Biometric Device Integration' },
  { icon: CalendarCheck, text: 'Staff Attendance Management' },
  { icon: Activity, text: 'Member Attendance Tracking' },
  { icon: IndianRupee, text: 'Real-time Revenue Tracking' },
  { icon: BarChart3, text: 'Advanced Analytics & Reports' },
  { icon: Shield, text: 'Enterprise-grade Security' },
  { icon: Zap, text: 'Automated Expiry & Payment Reminders' },
];

const faqs = [
  {
    q: 'Is GST included in the displayed price?',
    a: 'No. Prices shown are exclusive of GST. 18% GST will be added at checkout as per Indian tax regulations.',
  },
  {
    q: 'Can I switch between monthly and yearly billing?',
    a: 'Yes! You can switch at any time. Yearly billing saves you 25% compared to paying monthly.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'You can start with a free trial. No credit card required until you decide to subscribe.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit/debit cards, UPI, net banking, and wallets via our secure payment gateway.',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('yearly');

  const isYearly = billingCycle === 'yearly';
  const basePrice = isYearly ? 3600 : 399;
  const gstRate = 0.18;
  const gstAmount = Math.round(basePrice * gstRate);
  const totalPrice = basePrice + gstAmount;
  const period = isYearly ? '/year' : '/month';
  const monthlyEquivalent = isYearly
    ? Math.round((basePrice / 12) * 100) / 100
    : basePrice;

  // Public page: CTA always routes to signup. Subscribed users reach
  // checkout from BillingSettings.jsx inside the dashboard.
  const handleCtaClick = () => navigate('/signup');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 font-sans">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-lg shadow-md flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              <span>Gym Monitor</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="text-gray-600 hover:text-blue-600 font-medium text-sm px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-gray-600 hover:text-blue-600 font-medium text-sm px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold px-4 sm:px-5 py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <section className="relative pt-16 pb-10 text-center px-4">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            One plan.{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Everything included.
            </span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
            No tiers, no hidden fees. Get full access to every GymMonitor feature for one simple price.
          </p>
        </div>
      </section>

      {/* ── Billing Toggle ── */}
      <div className="flex flex-col items-center gap-3 mb-10 px-4">
        <div className="inline-flex items-center bg-white rounded-full p-1.5 shadow-lg border border-gray-100">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              !isYearly
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              isYearly
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isYearly ? 'bg-white/25 text-white' : 'bg-green-100 text-green-700'
              }`}
            >
              SAVE 25%
            </span>
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {isYearly ? 'Billed annually · Best value' : 'Billed monthly · Cancel anytime'}
        </p>
      </div>

      {/* ── Plan Card ── */}
      <section className="max-w-lg mx-auto px-4 pb-20">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-20 blur-2xl" />

          <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-center">
              <span className="text-white text-xs font-bold tracking-wider uppercase">
                {isYearly ? 'Best Value · Save ₹1,188/year' : 'Flexible · Pay as you go'}
              </span>
            </div>

            <div className="p-8 sm:p-10">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">GymMonitor Pro</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Complete gym management for growing gyms
                </p>
              </div>

              <div className="text-center mb-2">
                <div className="flex items-start justify-center gap-1">
                  <span className="text-3xl font-bold text-gray-700 mt-2">₹</span>
                  <span className="text-6xl font-black text-gray-900 tracking-tight leading-none">
                    {basePrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-lg font-medium text-gray-500 self-end mb-1.5">
                    {period}
                  </span>
                </div>
                {isYearly && (
                  <p className="text-sm text-gray-400 mt-1">
                    ≈ ₹{monthlyEquivalent.toLocaleString('en-IN')}/month
                  </p>
                )}
              </div>

              <div className="mt-5 mb-8 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                  <span>Base price</span>
                  <span className="font-medium">₹{basePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2.5">
                  <span>GST (18%)</span>
                  <span className="font-medium">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-800">Total payable</span>
                  <span className="text-base font-bold text-gray-900">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {planFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCtaClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all text-base"
              >
                Start 14-day Free Trial
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" /> SSL Secured
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" /> Instant Activation
          </div>
          <div className="flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4" /> Made for India
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900">Frequently asked questions</h2>
          <p className="text-gray-500 mt-3">Everything you need to know about our pricing</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{faq.q}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Ready to simplify your gym?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Start your free trial today. No credit card required.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Gym Monitor
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4 text-xs">
          <a href="/privacy-policy" className="text-gray-400 hover:text-blue-400 transition-colors">
            Privacy Policy
          </a>
          <span className="text-gray-600">|</span>
          <a href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
            Terms of Service
          </a>
          <span className="text-gray-600">|</span>
          <a href="/login" className="text-gray-400 hover:text-blue-400 transition-colors">
            Refund Policy
          </a>
        </div>
        <p>© {new Date().getFullYear()} Gym Monitor by Maskottchen Technology. All rights reserved.</p>
        <p className="mt-1 text-gray-500">
          Support:{' '}
          <a href="mailto:info@maskottchentechnology.com" className="text-blue-400 hover:underline">
            info@maskottchentechnology.com
          </a>
        </p>
      </footer>
    </div>
  );
}