import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import GymSetup from './pages/GymSetup';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';

// Guards the /admin route: must be logged in AND be super_admin.
// Any other logged-in role gets bounced to /dashboard.
// Not logged in at all → /login.
function AdminRoute({ children }) {
  const { user, initialLoading } = useAuth();

  if (initialLoading) {
    // Match the dark bg of AdminDashboard so there's no white flash
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Logged in but wrong role → send to their own dashboard
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        {/*
          Removed the hardcoded bg-gradient here so AdminDashboard's own
          dark background (bg-slate-950) is not overridden by the wrapper div.
          Each page manages its own background.
        */}
        <div className="min-h-screen">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '12px',
                border: '1px solid #334155',
              },
              success: {
                duration: 3000,
                iconTheme: { primary: '#10b981', secondary: '#fff' },
              },
              error: {
                duration: 4000,
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />

          <Routes>
            {/* ── Public ────────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Gym owner / staff ──────────────────────────────────── */}
            <Route path="/gym-setup" element={<PrivateRoute><GymSetup /></PrivateRoute>} />
            <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/profile"    element={<PrivateRoute><Profile /></PrivateRoute>} />

            {/* ── Super Admin only ───────────────────────────────────── */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* ── Catch-all ─────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;