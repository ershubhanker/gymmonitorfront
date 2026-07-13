// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
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
import { AttendanceProvider } from './context/AttendanceContext';
import LeadCaptureForm from './components/LeadCaptureForm';
import WhatsAppLogs from './components/WhatsAppLogs';
import InvoicePage from './pages/InvoicePage';
import PrivacyPolicy from './pages/PrivacyPolicy'; // ADD THIS IMPORT

function AdminRoute({ children }) {
  const { user, initialLoading } = useAuth();

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AttendanceProvider>
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
                {/* Public Routes - No authentication needed */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} /> {/* ADD THIS ROUTE */}
                
                {/* Public Lead Capture Form - No authentication required */}
                <Route path="/lead-form/:gymSlug" element={<LeadCaptureForm />} />
                
                {/* Public invoice view (no auth required) */}
                <Route path="/invoice/:memberId/:membershipId" element={<InvoicePage />} />
                
                {/* Protected Routes - Require authentication */}
                <Route path="/gym-setup" element={<PrivateRoute><GymSetup /></PrivateRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                
                {/* WhatsApp Logs Route - Only for Super Admin */}
                <Route path="/admin/whatsapp-logs" element={
                  <AdminRoute>
                    <WhatsAppLogs />
                  </AdminRoute>
                } />
                
                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </AttendanceProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;