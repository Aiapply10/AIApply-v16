import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FileText, Loader2, ArrowLeft, Sparkles, Zap, Rocket, Mail, Lock, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
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
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // OTP verification state
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Complete Profile
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [generatedOTP, setGeneratedOTP] = useState(''); // Store generated OTP for display
  const otpInputRefs = useRef([]);
  
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

  // Resend timer
  useEffect(() => {
    let interval;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

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

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e?.preventDefault();
    
    if (!formData.email || !formData.name) {
      toast.error('Please enter your name and email');
      return;
    }
    
    setIsSendingOTP(true);
    try {
      const response = await authAPI.sendOTP({ email: formData.email, name: formData.name });
      // Store the OTP from response for display
      if (response.data.otp) {
        setGeneratedOTP(response.data.otp);
      }
      toast.success('Verification code generated!');
      setOtpSent(true);
      setStep(2);
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send verification code');
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (i + index < 6) {
          newOtp[i + index] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    
    setIsLoading(true);
    try {
      await authAPI.verifyOTP({ email: formData.email, otp: otpCode });
      toast.success('Email verified successfully!');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid verification code');
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setIsSendingOTP(true);
    try {
      const response = await authAPI.resendOTP({ email: formData.email, name: formData.name });
      // Store the new OTP from response for display
      if (response.data.otp) {
        setGeneratedOTP(response.data.otp);
      }
      toast.success('New verification code generated!');
      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Step 3: Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authAPI.registerWithOTP({
        ...formData,
        otp: otp.join('')
      });
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

          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  step === s 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' 
                    : step > s 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className="ml-2 text-sm font-medium text-slate-600 hidden sm:inline">
                  {s === 1 ? 'Email' : s === 2 ? 'Verify' : 'Complete'}
                </span>
                {s < 3 && <div className={`w-8 h-0.5 mx-2 ${step > s ? 'bg-green-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Email & Name */}
          {step === 1 && (
            <>
              <h1 className="font-heading text-4xl font-bold mb-2 text-slate-900">Create your account</h1>
              <p className="text-slate-600 mb-8">Enter your email to receive a verification code</p>

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

              <form onSubmit={handleSendOTP} className="space-y-4">
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
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="border-slate-200 focus:border-violet-500 bg-white"
                    data-testid="register-email"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 text-lg shadow-lg shadow-violet-500/30" 
                  disabled={isSendingOTP}
                  data-testid="send-otp-btn"
                >
                  {isSendingOTP ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-violet-600" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2 text-slate-900">Verify your email</h1>
                <p className="text-slate-600">
                  We've sent a 6-digit code to<br />
                  <span className="font-semibold text-violet-600">{formData.email}</span>
                </p>
              </div>

              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all bg-white"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 text-lg shadow-lg shadow-violet-500/30 mb-4" 
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.join('').length !== 6}
                data-testid="verify-otp-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Verify Code
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-slate-500 text-sm mb-2">Didn't receive the code?</p>
                {canResend ? (
                  <Button 
                    variant="ghost" 
                    onClick={handleResendOTP}
                    disabled={isSendingOTP}
                    className="text-violet-600 hover:text-violet-700"
                  >
                    {isSendingOTP ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Resend Code
                  </Button>
                ) : (
                  <p className="text-slate-400 text-sm">Resend in {resendTimer}s</p>
                )}
              </div>

              <Button 
                variant="ghost" 
                onClick={() => setStep(1)} 
                className="w-full mt-4 text-slate-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Email
              </Button>
            </>
          )}

          {/* Step 3: Complete Profile */}
          {step === 3 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2 text-slate-900">Email Verified!</h1>
                <p className="text-slate-600">Complete your profile to get started</p>
              </div>

              <form onSubmit={handleCompleteRegistration} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="border-slate-200 focus:border-violet-500 bg-white"
                    data-testid="register-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 font-medium">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
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
                    placeholder="e.g., San Francisco, CA"
                    value={locationInput}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    onFocus={() => locationInput && setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    className="border-slate-200 focus:border-violet-500 bg-white"
                    data-testid="register-location"
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {locationSuggestions.map((city, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-violet-50 text-slate-700 text-sm"
                          onMouseDown={() => selectLocation(city)}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 text-lg shadow-lg shadow-violet-500/30 mt-6" 
                  disabled={isLoading}
                  data-testid="complete-registration-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-violet-600 hover:text-violet-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 p-12 items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-lg text-white">
          <h2 className="font-heading text-5xl font-bold mb-6">
            Start your career journey
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Create your account and let AI help you land your dream job. Our smart platform tailors your resume and automates applications.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI-Powered Resume</h3>
                <p className="text-white/80 text-sm">Tailored for each application</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Auto-Apply Feature</h3>
                <p className="text-white/80 text-sm">Apply to jobs automatically</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-Time Jobs</h3>
                <p className="text-white/80 text-sm">Fresh listings from top platforms</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}