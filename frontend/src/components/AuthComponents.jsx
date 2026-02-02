import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        console.log('Auth callback - Hash:', hash);
        setStatus('Extracting session ID...');
        
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        console.log('Auth callback - Session ID:', sessionId);

        if (!sessionId) {
          console.error('No session ID in hash');
          setError('No session ID found in URL');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        setStatus('Exchanging session for user data...');
        console.log('Calling createSession API...');
        
        // Exchange session_id for user data and token
        const response = await authAPI.createSession(sessionId);
        console.log('Session API response:', response.data);
        
        const { access_token, ...userData } = response.data;

        if (!access_token) {
          console.error('No access token in response');
          setError('No access token received from server');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        setStatus('Setting user data...');
        // Set user with access token
        setUser(userData, access_token);

        // Clear hash and navigate to dashboard
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('Success! Redirecting...');
        navigate('/dashboard', { state: { user: userData } });
      } catch (err) {
        console.error('Auth callback error:', err);
        console.error('Error response:', err.response?.data);
        const errorDetail = err.response?.data?.detail || '';
        
        // Provide user-friendly error messages
        let errorMessage = 'Authentication failed. Please try again.';
        if (errorDetail.includes('expired') || errorDetail.includes('invalid')) {
          errorMessage = 'Session expired. Please try signing in again.';
        } else if (errorDetail.includes('timeout')) {
          errorMessage = 'Connection timed out. Please try again.';
        }
        
        setError(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processSession();
  }, [location, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 font-semibold mb-2">{error}</p>
          <p className="text-slate-500 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-violet-600" />
        <p className="text-slate-700 font-medium">{status}</p>
        <p className="text-slate-500 text-sm mt-2">Please wait...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, checkAuth, isLoading, user, token, _hasHydrated } = useAuthStore();
  const hasCheckedRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [hydrationTimeout, setHydrationTimeout] = useState(false);

  // Set a timeout for hydration - if it doesn't happen in 500ms, proceed anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      setHydrationTimeout(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If user passed from AuthCallback, skip check
    if (location.state?.user) {
      setChecking(false);
      return;
    }

    // Check if we already have valid auth data in localStorage directly
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token && state?.user && state?.isAuthenticated) {
          // We have valid auth data, no need to check
          setChecking(false);
          return;
        }
      } catch (e) {
        // Continue with normal flow
      }
    }

    // Wait for hydration or timeout before checking auth
    if (!_hasHydrated && !hydrationTimeout) {
      return;
    }

    // If already authenticated with token and user data, no need to check again
    if (isAuthenticated && token && user) {
      setChecking(false);
      return;
    }

    // Prevent multiple checks on the same route
    if (hasCheckedRef.current) {
      return;
    }

    const verify = async () => {
      hasCheckedRef.current = true;
      const valid = await checkAuth();
      if (!valid) {
        navigate('/login', { replace: true });
      }
      setChecking(false);
    };

    verify();
  }, [checkAuth, navigate, location.state, _hasHydrated, isAuthenticated, token, user, hydrationTimeout]);

  // Reset check flag when location changes to a different path
  useEffect(() => {
    hasCheckedRef.current = false;
  }, [location.pathname]);

  // Show loading while waiting for hydration (with timeout) or checking
  const isHydrating = !_hasHydrated && !hydrationTimeout;
  if (isHydrating || checking || isLoading) {
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
  const { user, isAuthenticated, checkAuth, isLoading, token, _hasHydrated } = useAuthStore();
  const hasCheckedRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [hydrationTimeout, setHydrationTimeout] = useState(false);

  // Set a timeout for hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      setHydrationTimeout(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check localStorage directly first
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token && state?.user && state?.isAuthenticated) {
          if (state.user?.role !== 'admin') {
            navigate('/dashboard', { replace: true });
          }
          setChecking(false);
          return;
        }
      } catch (e) {
        // Continue with normal flow
      }
    }

    // Wait for hydration or timeout
    if (!_hasHydrated && !hydrationTimeout) {
      return;
    }

    // If already authenticated with token and user data, just check role
    if (isAuthenticated && token && user) {
      if (user?.role !== 'admin') {
        navigate('/dashboard', { replace: true });
      }
      setChecking(false);
      return;
    }

    // Prevent multiple checks
    if (hasCheckedRef.current) {
      return;
    }

    const verify = async () => {
      hasCheckedRef.current = true;
      const valid = await checkAuth();
      if (!valid) {
        navigate('/login', { replace: true });
      } else if (user?.role !== 'admin') {
        navigate('/dashboard', { replace: true });
      }
      setChecking(false);
    };

    verify();
  }, [checkAuth, navigate, user, _hasHydrated, isAuthenticated, token, hydrationTimeout]);

  // Show loading while hydrating or checking
  const isHydrating = !_hasHydrated && !hydrationTimeout;
  if (isHydrating || checking || isLoading) {
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
