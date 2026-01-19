import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store';
import { 
  FileText, 
  Sparkles, 
  Send, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Briefcase,
  Mail,
  Users,
  Zap,
  Target,
  Rocket,
  Star,
  ChevronRight,
  Globe,
  Bot,
  Shield
} from 'lucide-react';

export function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const features = [
    {
      icon: FileText,
      title: 'Smart Resume Upload',
      description: 'Upload your resume in PDF or Word format. Our AI extracts and analyzes your experience.',
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Tailoring',
      description: 'Get your resume customized for specific job descriptions using advanced AI technology.',
      color: 'from-indigo-500 to-purple-600',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      icon: Target,
      title: 'Live Job Matching',
      description: 'Real-time job recommendations from LinkedIn, Indeed, Dice based on your skills.',
      color: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      icon: Send,
      title: 'One-Click Applications',
      description: 'Apply to jobs directly from our platform with auto-generated cover letters.',
      color: 'from-orange-500 to-amber-600',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      icon: Mail,
      title: 'Email Management',
      description: 'AI assists with email responses and scheduling interviews automatically.',
      color: 'from-pink-500 to-rose-600',
      bgLight: 'bg-pink-50',
      textColor: 'text-pink-600',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      description: 'Track applications, interviews, and offers with beautiful dashboards.',
      color: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
    },
  ];

  const technologies = [
    { name: 'Java', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50', borderColor: 'border-orange-200' },
    { name: 'Python', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', borderColor: 'border-blue-200' },
    { name: 'PHP', color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    { name: 'AI/ML', color: 'bg-pink-500', textColor: 'text-pink-600', bgLight: 'bg-pink-50', borderColor: 'border-pink-200' },
    { name: 'React', color: 'bg-cyan-500', textColor: 'text-cyan-600', bgLight: 'bg-cyan-50', borderColor: 'border-cyan-200' },
  ];

  const stats = [
    { value: '10K+', label: 'Resumes Tailored', color: 'text-blue-600' },
    { value: '50K+', label: 'Jobs Matched', color: 'text-indigo-600' },
    { value: '95%', label: 'Success Rate', color: 'text-emerald-600' },
    { value: '24/7', label: 'AI Support', color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden">
      {/* Animated Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-3xl" 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl" />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, 10, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            className="absolute w-2 h-2 rounded-full bg-blue-400/30"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + i * 10}%`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </motion.div>
              <span className="font-heading font-bold text-xl text-slate-800">CareerQuest</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <motion.a 
                href="#features" 
                whileHover={{ y: -2 }}
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Features
              </motion.a>
              <motion.a 
                href="#technologies" 
                whileHover={{ y: -2 }}
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Technologies
              </motion.a>
              {isAuthenticated ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30" data-testid="go-to-dashboard">
                    Dashboard
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              ) : (
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => navigate('/login')} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" data-testid="login-btn">
                    Login
                  </Button>
                  <Button onClick={() => navigate('/register')} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30" data-testid="register-btn">
                    Get Started
                    <Zap className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 border border-violet-200">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">Powered by GPT-5.2</span>
                <span className="px-2 py-0.5 rounded-full bg-violet-600 text-xs text-white font-bold">NEW</span>
              </div>
              
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900">
                Land Your 
                <span className="block bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Dream Job</span>
                <span className="block text-slate-800">with AI Power</span>
              </h1>
              
              <p className="text-xl text-slate-600 max-w-xl leading-relaxed">
                Upload your resume, let AI customize it for each job, and apply with confidence. 
                Track applications, manage communications, and get hired faster.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-lg px-8 py-6 shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40 transition-all"
                  onClick={handleGetStarted}
                  data-testid="get-started-btn"
                >
                  Get Started Free
                  <Rocket className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-slate-300 text-slate-700 hover:bg-slate-100 text-lg px-8 py-6"
                  onClick={handleGoogleLogin}
                  data-testid="google-login-btn"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 pt-8">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative">
                {/* Main Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1758518727592-706e80ebc354?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                    alt="Professional using AI resume builder"
                    className="w-full h-auto"
                  />
                </div>
                
                {/* Floating Cards */}
                <div className="absolute -left-8 top-1/4 bg-white rounded-xl p-4 shadow-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">Resume Tailored</p>
                      <p className="text-xs text-slate-500">For Senior Developer</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl p-4 shadow-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">12 Jobs Applied</p>
                      <p className="text-xs text-slate-500">This week</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-8 top-8 bg-white rounded-xl p-3 shadow-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-6">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Powerful Features</span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4 text-slate-900">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Land Your Next Role</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From resume optimization to application tracking, we've got you covered.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group relative bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2 text-slate-800">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section id="technologies" className="relative py-24 px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4 text-slate-900">
              Specialized for{' '}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Top Technologies</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our AI understands the specific requirements for each technology stack.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {technologies.map((tech, index) => (
              <div 
                key={tech.name}
                className={`group relative px-8 py-4 bg-white rounded-2xl shadow-lg border ${tech.borderColor} hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tech.color}`} />
                  <span className={`font-heading font-semibold text-lg ${tech.textColor}`}>{tech.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center overflow-hidden shadow-2xl">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 mb-6">
                <Rocket className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Start Your Journey</span>
              </div>
              
              <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-6 text-white">
                Ready to Transform Your Job Search?
              </h2>
              
              <p className="text-lg text-white/90 max-w-xl mx-auto mb-8">
                Join thousands of job seekers who've already landed their dream roles using our AI-powered platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-violet-700 hover:bg-slate-100 text-lg px-8 py-6 font-semibold shadow-xl"
                  onClick={handleGetStarted}
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-8 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-heading font-bold text-slate-800">CareerQuest</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2025 CareerQuest. AI-powered job search platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
