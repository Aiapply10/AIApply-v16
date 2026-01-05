import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FileText, Loader2, ArrowLeft, Sparkles, Zap, Rocket } from 'lucide-react';
import { toast } from 'sonner';

// LinkedIn OAuth Configuration
const LINKEDIN_CLIENT_ID = process.env.REACT_APP_LINKEDIN_CLIENT_ID || '';
const LINKEDIN_REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/linkedin/callback` : '';
const LINKEDIN_SCOPE = 'openid profile email';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    
    // Handle LinkedIn callback
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state === 'linkedin_login') {
      handleLinkedInCallback(code);
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleLinkedInCallback = async (code) => {
    setIsLinkedInLoading(true);
    try {
      const response = await authAPI.linkedinCallback(code, LINKEDIN_REDIRECT_URI);
      const { user, access_token } = response.data;
      setUser(user, access_token);
      toast.success('Welcome! Signed in with LinkedIn');
      navigate('/dashboard');
    } catch (error) {
      console.error('LinkedIn login error:', error);
      toast.error(error.response?.data?.detail || 'LinkedIn login failed');
    } finally {
      setIsLinkedInLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { user, access_token } = response.data;
      setUser(user, access_token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLinkedInLogin = () => {
    if (!LINKEDIN_CLIENT_ID) {
      toast.error('LinkedIn login is not configured yet. Please use Google or email login.');
      return;
    }
    const state = 'linkedin_login';
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-200/50 rounded-full blur-3xl" />
      </div>

      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 relative z-10">
        <div className="max-w-md mx-auto w-full">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>
          
          <Link to="/" className="flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-heading font-bold text-2xl text-slate-800">CareerQuest</span>
          </Link>

          <h1 className="font-heading text-4xl font-bold mb-2 text-slate-900">Welcome back</h1>
          <p className="text-slate-600 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-slate-200 focus:border-violet-500 bg-white"
                data-testid="login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="border-slate-200 focus:border-violet-500 bg-white"
                data-testid="login-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 text-lg shadow-lg shadow-violet-500/30" 
              disabled={isLoading}
              data-testid="login-submit"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
              Sign In
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-slate-200 hover:bg-slate-50 py-6 text-lg text-slate-700"
            onClick={handleGoogleLogin}
            data-testid="google-login"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          <Button 
            variant="outline" 
            className="w-full border-slate-200 hover:bg-slate-50 py-6 text-lg mt-3 text-slate-700"
            onClick={handleLinkedInLogin}
            disabled={isLinkedInLoading}
            data-testid="linkedin-login"
          >
            {isLinkedInLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <svg className="w-5 h-5 mr-2 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            )}
            Continue with LinkedIn
          </Button>

          <p className="text-center mt-8 text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-violet-600 hover:text-violet-700 font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <div className="relative w-full max-w-lg">
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 space-y-6 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">AI-Powered Resumes</h3>
                <p className="text-white/70">Tailored for every job</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">GPT-5.2 Integration</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">Live Job Matching</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-pink-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">Application Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  const US_CITIES = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
    'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
    'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Boston, MA',
    'Nashville, TN', 'Detroit, MI', 'Portland, OR', 'Atlanta, GA', 'Miami, FL',
    'Raleigh, NC', 'Minneapolis, MN', 'Tampa, FL', 'Remote', 'Anywhere in US'
  ];
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    location: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    
    // Handle LinkedIn callback
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state === 'linkedin_register') {
      handleLinkedInCallback(code);
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleLinkedInCallback = async (code) => {
    setIsLinkedInLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
      const response = await authAPI.linkedinCallback(code, redirectUri);
      const { user, access_token } = response.data;
      setUser(user, access_token);
      toast.success('Account created with LinkedIn!');
      navigate('/dashboard');
    } catch (error) {
      console.error('LinkedIn register error:', error);
      toast.error(error.response?.data?.detail || 'LinkedIn sign up failed');
    } finally {
      setIsLinkedInLoading(false);
    }
  };

  const handleLocationChange = (value) => {
    setLocationInput(value);
    setFormData({ ...formData, location: value });
    if (value.length > 0) {
      const filtered = US_CITIES.filter(city => 
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6);
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(true);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const selectLocation = (city) => {
    setLocationInput(city);
    setFormData({ ...formData, location: city });
    setShowLocationSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { user, access_token } = response.data;
      setUser(user, access_token);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLinkedInLogin = () => {
    if (!LINKEDIN_CLIENT_ID) {
      toast.error('LinkedIn sign up is not configured yet. Please use Google or email.');
      return;
    }
    const state = 'linkedin_register';
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-pink-200/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-200/50 rounded-full blur-3xl" />
      </div>

      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10">
        <div className="max-w-md mx-auto w-full">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>
          
          <Link to="/" className="flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-heading font-bold text-2xl text-slate-800">CareerQuest</span>
          </Link>

          <h1 className="font-heading text-4xl font-bold mb-2 text-slate-900">Create your account</h1>
          <p className="text-slate-600 mb-8">Start your job search journey today</p>

          {/* SSO Buttons First */}
          <div className="space-y-3 mb-6">
            <Button 
              variant="outline" 
              className="w-full border-slate-200 hover:bg-slate-50 py-6 text-lg text-slate-700"
              onClick={handleGoogleLogin}
              data-testid="google-register"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <Button 
              variant="outline" 
              className="w-full border-slate-200 hover:bg-slate-50 py-6 text-lg text-slate-700"
              onClick={handleLinkedInLogin}
              disabled={isLinkedInLoading}
              data-testid="linkedin-register"
            >
              {isLinkedInLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              )}
              Continue with LinkedIn
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="border-slate-200 focus:border-violet-500 bg-white"
                data-testid="register-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-slate-200 focus:border-violet-500 bg-white"
                data-testid="register-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="border-slate-200 focus:border-violet-500 bg-white"
                data-testid="register-password"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 font-medium">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="border-slate-200 focus:border-violet-500 bg-white"
                  data-testid="register-phone"
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="location" className="text-slate-700 font-medium">Location (Optional)</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Start typing a city..."
                  value={locationInput}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => locationInput && setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  className="border-slate-200 focus:border-violet-500 bg-white"
                  data-testid="register-location"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {locationSuggestions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-violet-50 transition-colors text-sm"
                        onMouseDown={() => selectLocation(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 text-lg shadow-lg shadow-violet-500/30"
              disabled={isLoading}
              data-testid="register-submit"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />}
              Create Account
            </Button>
          </form>

          <p className="text-center mt-8 text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative bg-gradient-to-br from-pink-600 via-violet-600 to-purple-700">
        <div className="relative w-full max-w-lg">
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 space-y-6 border border-white/20">
            <h3 className="font-heading text-2xl font-bold text-center text-white">Join 10,000+ Job Seekers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-white">95%</div>
                <div className="text-sm text-white/70">Success Rate</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-sm text-white/70">Jobs Matched</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-white">10K+</div>
                <div className="text-sm text-white/70">Resumes Tailored</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-white/70">AI Support</div>
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">AI-Powered Resume Tailoring</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-cyan-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">Live Job Matching</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-pink-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">Auto-Apply Feature</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
                <div className="text-3xl font-bold text-gradient-neon">10K+</div>
                <div className="text-sm text-muted-foreground">Resumes Tailored</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-gradient-cyber">24/7</div>
                <div className="text-sm text-muted-foreground">AI Support</div>
              </div>
            </div>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <p className="text-center text-muted-foreground text-sm">Rated 4.9/5 by our users</p>
          </div>
        </div>
      </div>
    </div>
  );
}
