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
  Users
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

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    {
      icon: FileText,
      title: 'Smart Resume Upload',
      description: 'Upload your resume in PDF or Word format. Our AI extracts and analyzes your experience.',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Tailoring',
      description: 'Get your resume customized for specific job descriptions using GPT-5.2 technology.',
    },
    {
      icon: Send,
      title: 'One-Click Applications',
      description: 'Apply to jobs directly from our platform with auto-generated cover letters.',
    },
    {
      icon: Mail,
      title: 'Email Management',
      description: 'AI assists with email responses and scheduling interviews automatically.',
    },
    {
      icon: BarChart3,
      title: 'Application Tracking',
      description: 'Track all your applications, interviews, and offers in one place.',
    },
    {
      icon: Users,
      title: 'Company Dashboard',
      description: 'For recruiters: manage candidates and view comprehensive statistics.',
    },
  ];

  const technologies = ['Java', 'Python', 'PHP', 'AI', 'React'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-ai flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-xl">AI Resume Tailor</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#technologies" className="text-muted-foreground hover:text-foreground transition-colors">
                Technologies
              </a>
              {isAuthenticated ? (
                <Button onClick={() => navigate('/dashboard')} data-testid="go-to-dashboard">
                  Go to Dashboard
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => navigate('/login')} data-testid="login-btn">
                    Login
                  </Button>
                  <Button onClick={() => navigate('/register')} data-testid="register-btn">
                    Get Started
                  </Button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Powered by GPT-5.2
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Land Your Dream Job with{' '}
                <span className="text-transparent bg-clip-text gradient-ai">AI-Tailored</span>{' '}
                Resumes
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Upload your resume, let AI customize it for each job, and apply with confidence. 
                Track applications, manage communications, and get hired faster.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8"
                  onClick={handleGetStarted}
                  data-testid="get-started-btn"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8"
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
            </div>
            <div className="relative animate-fade-in">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1544813813-2c73bec209ca?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                  alt="Professional using AI resume builder"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
              {/* Floating cards */}
              <div className="absolute -left-4 top-1/4 glass-card rounded-xl p-4 shadow-lg animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Resume Tailored</p>
                    <p className="text-xs text-muted-foreground">For Senior Developer role</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-1/4 glass-card rounded-xl p-4 shadow-lg animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">12 Jobs Applied</p>
                    <p className="text-xs text-muted-foreground">This week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Land Your Next Role
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From resume optimization to application tracking, we've got you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg gradient-ai flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section id="technologies" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Specialized for Top Technologies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI understands the specific requirements for each technology stack.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {technologies.map((tech) => (
              <div 
                key={tech}
                className="px-8 py-4 bg-card rounded-xl border border-border hover:border-primary transition-colors cursor-pointer"
              >
                <span className="font-heading font-semibold text-lg">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-6">
            Ready to Transform Your Job Search?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of job seekers who have landed their dream roles with AI-optimized resumes.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-12"
            onClick={handleGetStarted}
            data-testid="cta-get-started-btn"
          >
            Start for Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-ai flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold">AI Resume Tailor</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 AI Resume Tailor. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
