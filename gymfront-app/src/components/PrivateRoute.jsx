import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Generic private route — just checks "are you logged in?".
// Role enforcement for /admin is handled separately in App.jsx via AdminRoute.
const PrivateRoute = ({ children }) => {
  const { user, initialLoading } = useAuth();

  // While the session is being restored from localStorage, show a spinner
  // instead of immediately redirecting to /login (which causes a flash on refresh).
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;