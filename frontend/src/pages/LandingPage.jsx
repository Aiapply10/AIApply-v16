import { Link, useNavigate } from 'react-router-dom';
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
  ChevronRight
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

  const features = [
    {
      icon: FileText,
      title: 'Smart Resume Upload',
      description: 'Upload your resume in PDF or Word format. Our AI extracts and analyzes your experience.',
      color: 'from-violet-500 to-purple-500',
      glow: 'group-hover:shadow-violet-500/25',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Tailoring',
      description: 'Get your resume customized for specific job descriptions using GPT-5.2 technology.',
      color: 'from-cyan-500 to-blue-500',
      glow: 'group-hover:shadow-cyan-500/25',
    },
    {
      icon: Target,
      title: 'Live Job Matching',
      description: 'Real-time job recommendations from LinkedIn, Indeed, Glassdoor based on your skills.',
      color: 'from-pink-500 to-rose-500',
      glow: 'group-hover:shadow-pink-500/25',
    },
    {
      icon: Send,
      title: 'One-Click Applications',
      description: 'Apply to jobs directly from our platform with auto-generated cover letters.',
      color: 'from-green-500 to-emerald-500',
      glow: 'group-hover:shadow-green-500/25',
    },
    {
      icon: Mail,
      title: 'Email Management',
      description: 'AI assists with email responses and scheduling interviews automatically.',
      color: 'from-orange-500 to-amber-500',
      glow: 'group-hover:shadow-orange-500/25',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      description: 'Track applications, interviews, and offers with beautiful dashboards.',
      color: 'from-blue-500 to-indigo-500',
      glow: 'group-hover:shadow-blue-500/25',
    },
  ];

  const technologies = [
    { name: 'Java', color: 'bg-orange-500' },
    { name: 'Python', color: 'bg-blue-500' },
    { name: 'PHP', color: 'bg-indigo-500' },
    { name: 'AI/ML', color: 'bg-pink-500' },
    { name: 'React', color: 'bg-cyan-500' },
  ];

  const stats = [
    { value: '10K+', label: 'Resumes Tailored' },
    { value: '50K+', label: 'Jobs Matched' },
    { value: '95%', label: 'Success Rate' },
    { value: '24/7', label: 'AI Support' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden noise-overlay">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-violet-500/50 transition-all group-hover:scale-105 duration-300">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-heading font-bold text-xl text-gradient-neon">CareerQuest</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-white transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-500 group-hover:w-full transition-all duration-300" />
              </a>
              <a href="#technologies" className="text-muted-foreground hover:text-white transition-colors relative group">
                Technologies
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-500 group-hover:w-full transition-all duration-300" />
              </a>
              {isAuthenticated ? (
                <Button onClick={() => navigate('/dashboard')} className="btn-neon" data-testid="go-to-dashboard">
                  Dashboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => navigate('/login')} className="hover:bg-white/10" data-testid="login-btn">
                    Login
                  </Button>
                  <Button onClick={() => navigate('/register')} className="btn-neon" data-testid="register-btn">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-violet-500/30 animate-fade-in">
                <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                <span className="text-sm font-medium text-violet-300">Powered by GPT-5.2</span>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-xs text-violet-300">NEW</span>
              </div>
              
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight animate-slide-up">
                Land Your 
                <span className="block text-gradient-neon">Dream Job</span>
                <span className="block text-white/90">with AI Power</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-xl animate-slide-up stagger-2" style={{ opacity: 0 }}>
                Upload your resume, let AI customize it for each job, and apply with confidence. 
                Track applications, manage communications, and get hired faster.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 animate-slide-up stagger-3" style={{ opacity: 0 }}>
                <Button 
                  size="lg" 
                  className="btn-neon text-lg px-8 py-6 group"
                  onClick={handleGetStarted}
                  data-testid="get-started-btn"
                >
                  Get Started Free
                  <Rocket className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="btn-cyber text-lg px-8 py-6"
                  onClick={handleGoogleLogin}
                  data-testid="google-login-btn"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 pt-8 animate-slide-up stagger-4" style={{ opacity: 0 }}>
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-gradient-cyber">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 relative animate-fade-in stagger-2" style={{ opacity: 0 }}>
              <div className="relative">
                {/* Main Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl glow-md">
                  <img 
                    src="https://images.unsplash.com/photo-1758518727592-706e80ebc354?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                    alt="Professional using AI resume builder"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>
                
                {/* Floating Cards */}
                <div className="absolute -left-8 top-1/4 glass-card rounded-xl p-4 shadow-2xl animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">Resume Tailored</p>
                      <p className="text-xs text-muted-foreground">For Senior Developer</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -right-4 bottom-1/4 glass-card rounded-xl p-4 shadow-2xl animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">12 Jobs Applied</p>
                      <p className="text-xs text-muted-foreground">This week</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-8 top-8 glass-card rounded-xl p-3 shadow-2xl animate-float" style={{ animationDelay: '2s' }}>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyan-500/30 mb-6">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">Powerful Features</span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
              Everything You Need to{' '}
              <span className="text-gradient-cyber">Land Your Next Role</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From resume optimization to application tracking, we've got you covered.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`group relative glass-card rounded-2xl p-6 hover-lift card-shine transition-all duration-500 animate-slide-up`}
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2 text-white group-hover:text-gradient-neon transition-all">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
                
                {/* Hover glow effect */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl ${feature.glow}`} style={{ boxShadow: '0 0 60px currentColor' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section id="technologies" className="relative py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
              Specialized for{' '}
              <span className="text-gradient-neon">Top Technologies</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI understands the specific requirements for each technology stack.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {technologies.map((tech, index) => (
              <div 
                key={tech.name}
                className="group relative px-8 py-4 glass-card rounded-2xl hover-lift hover-glow cursor-pointer transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tech.color} animate-pulse`} />
                  <span className="font-heading font-semibold text-lg text-white">{tech.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative glass-card rounded-3xl p-12 text-center overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-600/20" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
                <Rocket className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium">Start Your Journey</span>
              </div>
              
              <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-6">
                Ready to Transform Your{' '}
                <span className="text-gradient-neon">Job Search?</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of job seekers who have landed their dream roles with AI-optimized resumes.
              </p>
              
              <Button 
                size="lg" 
                className="btn-neon text-lg px-12 py-6 group"
                onClick={handleGetStarted}
                data-testid="cta-get-started-btn"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-violet-500/50 transition-all group-hover:scale-105 duration-300">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-heading font-bold text-xl">CareerQuest</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2024 CareerQuest. All rights reserved. Made with AI magic.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
