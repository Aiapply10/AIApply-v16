import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../lib/api';
import { Loader2 } from 'lucide-react';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];

        if (!sessionId) {
          setError('No session ID found');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Exchange session_id for user data
        const response = await authAPI.createSession(sessionId);
        const userData = response.data;

        setUser(userData, null);

        // Clear hash and navigate to dashboard
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { state: { user: userData } });
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    processSession();
  }, [location, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, checkAuth, isLoading, user } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If user passed from AuthCallback, skip check
    if (location.state?.user) {
      setChecking(false);
      return;
    }

    const verify = async () => {
      const valid = await checkAuth();
      if (!valid) {
        navigate('/login', { replace: true });
      }
      setChecking(false);
    };

    verify();
  }, [checkAuth, navigate, location.state]);

  if (checking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !location.state?.user) {
    return null;
  }

  return children;
}

export function AdminRoute({ children }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const valid = await checkAuth();
      if (!valid) {
        navigate('/login', { replace: true });
      } else if (user?.role !== 'admin') {
        navigate('/dashboard', { replace: true });
      }
      setChecking(false);
    };

    verify();
  }, [checkAuth, navigate, user]);

  if (checking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return children;
}
