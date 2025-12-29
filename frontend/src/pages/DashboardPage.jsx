import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProfileCompleteness } from '../components/ProfileCompleteness';
import { useAuthStore } from '../store';
import { reportAPI, resumeAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  Briefcase,
  ArrowRight,
  Upload,
  Sparkles,
  TrendingUp,
  Zap,
  Target,
  Rocket,
  User
} from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, resumesRes] = await Promise.all([
        reportAPI.getCandidate(),
        resumeAPI.getAll()
      ]);
      setStats(statsRes.data);
      setResumes(resumesRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      applied: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      screening: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      interview_scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      interviewed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      offer: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      withdrawn: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      label: 'Total Applications',
      value: stats?.total_applications || 0,
      icon: Send,
      color: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/20',
    },
    {
      label: 'Interviews Scheduled',
      value: stats?.interviews_scheduled || 0,
      icon: Clock,
      color: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/20',
    },
    {
      label: 'Offers Received',
      value: stats?.offers_received || 0,
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
      glow: 'shadow-green-500/20',
    },
    {
      label: 'Resumes',
      value: stats?.resume_count || 0,
      icon: FileText,
      color: 'from-orange-500 to-amber-500',
      glow: 'shadow-orange-500/20',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="candidate-dashboard">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold">
              Welcome back,{' '}
              <span className="text-gradient-neon">{user?.name?.split(' ')[0]}!</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your job search progress
            </p>
          </div>
          <Button 
            className="btn-neon group"
            onClick={() => navigate('/live-jobs')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Browse Live Jobs
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Quick Actions for new users */}
        {resumes.length === 0 && (
          <Card className="glass-card border-violet-500/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-cyan-600/10" />
            <CardContent className="flex flex-col items-center justify-center py-12 relative">
              <div className="w-20 h-20 rounded-2xl gradient-neon flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30 animate-float">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-heading text-2xl font-semibold mb-2">Upload Your First Resume</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Get started by uploading your resume. Our AI will help you tailor it for specific job applications.
              </p>
              <Button onClick={() => navigate('/resumes')} className="btn-neon" data-testid="upload-resume-cta">
                <Rocket className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Profile Completeness Quick Access */}
        <Card className="glass-card border-fuchsia-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-fuchsia-400" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileCompleteness compact />
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.label}
              className={`glass-card hover-lift card-shine overflow-hidden animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-bold mt-1 text-gradient-cyber">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.glow}`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  Recent Applications
                </CardTitle>
                <CardDescription>Your latest job applications</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/applications')}
                className="hover:bg-white/10 group"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardHeader>
            <CardContent>
              {stats?.recent_applications?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent_applications.map((app, index) => (
                    <div 
                      key={app.application_id} 
                      className="flex items-center justify-between p-4 rounded-xl glass border border-white/10 hover:border-violet-500/30 transition-all duration-300 group animate-slide-up"
                      style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-purple-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Briefcase className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{app.job_title}</p>
                          <p className="text-sm text-muted-foreground">{app.company_name}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(app.status)} border`}>
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No applications yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 btn-cyber"
                    onClick={() => navigate('/live-jobs')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Quick Actions
              </CardTitle>
              <CardDescription>Get things done faster</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start glass border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 group transition-all"
                onClick={() => navigate('/resumes')}
                data-testid="quick-upload-resume"
              >
                <Upload className="w-4 h-4 mr-3 text-cyan-400" />
                <span className="group-hover:text-cyan-400 transition-colors">Upload New Resume</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start glass border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10 group transition-all"
                onClick={() => navigate('/live-jobs')}
                data-testid="quick-browse-jobs"
              >
                <Sparkles className="w-4 h-4 mr-3 text-pink-400" />
                <span className="group-hover:text-pink-400 transition-colors">Browse Live Jobs</span>
              </Button>
              <Button 
                className="w-full justify-start btn-neon"
                onClick={() => navigate('/resumes')}
                data-testid="quick-tailor-resume"
              >
                <Sparkles className="w-4 h-4 mr-3" />
                Tailor Resume with AI
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start glass border-white/10 hover:border-green-500/50 hover:bg-green-500/10 group transition-all"
                onClick={() => navigate('/reports')}
                data-testid="quick-view-reports"
              >
                <TrendingUp className="w-4 h-4 mr-3 text-green-400" />
                <span className="group-hover:text-green-400 transition-colors">View Analytics</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Breakdown */}
        {stats?.status_breakdown && Object.keys(stats.status_breakdown).length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Application Status Breakdown
              </CardTitle>
              <CardDescription>Distribution of your applications by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(stats.status_breakdown).map(([status, count], index) => {
                  const percentage = (count / stats.total_applications) * 100;
                  const colors = ['bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-blue-500'];
                  return (
                    <div key={status} className="space-y-2 animate-slide-up" style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${colors[index % colors.length]} transition-all duration-1000`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
