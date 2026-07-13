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
  Activity
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description: 'Easily add, track and manage all your gym members in one place. View profiles, attendance and history.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Wallet,
    title: 'Member Balance Management',
    description: 'Track member payments, outstanding balances, and payment history. Send automatic reminders for pending dues.',
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
    icon: Fingerprint,
    title: 'Biometric Access',
    description: 'Integrate with biometric devices for secure member check-ins. Fast, accurate, and fraud-proof attendance.',
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: CalendarCheck,
    title: 'Staff Attendance Management',
    description: 'Track staff check-ins, manage shifts, and generate attendance reports for your entire team.',
    color: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: Activity,
    title: 'Member Attendance Tracking',
    description: 'Monitor daily member check-ins, track visit patterns, and identify your most engaged members.',
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: IndianRupee,
    title: 'Revenue Tracking',
    description: 'Monitor monthly revenue, pending payments and membership renewals with real-time insights.',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Understand your gym\'s growth with detailed charts on attendance, retention and revenue trends.',
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Your data is protected with enterprise-grade security. Access from anywhere, anytime.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

const stats = [
  { value: '500+', label: 'Gyms Managed' },
  { value: '50K+', label: 'Members Tracked' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const highlights = [
  'No spreadsheets or paperwork',
  'Real-time dashboard updates',
  'Mobile-friendly interface',
  'Instant member search',
  'Automated expiry alerts',
  'Multi-staff access control',
  'Biometric device integration',
  'Automated payment reminders',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-lg shadow-md flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              <span>Gym Monitor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-600 hover:text-blue-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-28">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            The Smartest Gym Management Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Manage Your Gym
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 leading-relaxed">
            Gym Monitor gives you everything you need to run a thriving gym — member management, revenue tracking, 
            biometric integration, expense tracking, and staff attendance. All in one beautiful dashboard.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base"
            >
              Start Managing Your Gym
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-white text-gray-700 font-semibold px-8 py-4 rounded-2xl border border-gray-200 shadow hover:shadow-md hover:border-blue-300 transition-all text-base"
            >
              Already have an account? Login
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
            <span className="ml-2 text-gray-500 text-sm font-medium">Loved by 500+ gym owners across India</span>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center text-white">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-black">{s.value}</div>
              <div className="text-blue-100 text-sm mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900">
              Everything your gym needs
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
              From day-to-day operations to long-term growth analytics — we've got you covered.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-7 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100 group"
              >
                <div className={`inline-flex p-3 rounded-xl ${f.bg} mb-5`}>
                  <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Highlights ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left copy */}
            <div>
              <h2 className="text-4xl font-extrabold text-gray-900 leading-tight">
                Say goodbye to
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> messy registers</span>
              </h2>
              <p className="mt-5 text-gray-500 text-lg leading-relaxed">
                Running a gym shouldn't mean drowning in paperwork or juggling multiple apps. 
                Gym Monitor brings everything together including biometric integration, expense tracking, 
                and staff management so you can focus on what matters — your members.
              </p>
              <ul className="mt-8 space-y-3">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-3 text-gray-700 font-medium">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className="mt-10 group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                Get Started for Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Right visual card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl rotate-3 scale-105 opacity-60" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm shadow">
                    <Dumbbell className="h-4 w-4" />
                    Gym Monitor
                  </div>
                  <span className="ml-auto text-xs text-gray-400">Live Dashboard</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'Total Members', value: '248', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Monthly Revenue', value: '₹1,24,500', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: "Today's Check-ins", value: '37', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Pending Payments', value: '₹12,400', icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
                  ].map((card) => (
                    <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
                      <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
                      <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">{card.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-gray-500">Today's Expenses</div>
                    <div className="text-xs font-semibold text-gray-500">₹2,450</div>
                  </div>
                  <div className="space-y-2">
                    {['Staff Salary', 'Equipment', 'Utilities'].map((expense, i) => (
                      <div key={expense} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{expense}</span>
                        <span className="text-gray-800 font-medium">₹{i === 0 ? '1,200' : i === 1 ? '800' : '450'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-500 mb-3">Recent Check-ins</div>
                  {[
                    { name: 'Rahul Sharma', time: '08:15 AM', type: 'Biometric' },
                    { name: 'Priya Patel', time: '09:30 AM', type: 'Biometric' },
                    { name: 'Amit Verma', time: '10:45 AM', type: 'Manual' }
                  ].map((checkin) => (
                    <div key={checkin.name} className="flex items-center gap-3 mb-2 last:mb-0">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {checkin.name[0]}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-700 font-medium">{checkin.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{checkin.time}</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        {checkin.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <Dumbbell className="h-12 w-12 mx-auto mb-5 opacity-80" />
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Ready to take control of your gym?
          </h2>
          <p className="text-blue-100 text-lg mb-10">
            Join hundreds of gym owners who've simplified their operations with Gym Monitor.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center justify-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 border-2 border-white/60 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-base"
            >
              Login to Dashboard
            </button>
          </div>
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
  
  {/* Add navigation links */}
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