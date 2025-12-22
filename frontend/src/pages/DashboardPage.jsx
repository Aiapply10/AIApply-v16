import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuthStore } from '../store';
import { reportAPI, resumeAPI, applicationAPI } from '../lib/api';
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
  TrendingUp
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
      applied: 'bg-blue-100 text-blue-700',
      screening: 'bg-amber-100 text-amber-700',
      interview_scheduled: 'bg-purple-100 text-purple-700',
      interviewed: 'bg-indigo-100 text-indigo-700',
      offer: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="candidate-dashboard">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold">
            Welcome back, {user?.name?.split(' ')[0]}! 
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your job search progress
          </p>
        </div>

        {/* Quick Actions */}
        {resumes.length === 0 && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Upload Your First Resume</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Get started by uploading your resume. Our AI will help you tailor it for specific job applications.
              </p>
              <Button onClick={() => navigate('/resumes')} data-testid="upload-resume-cta">
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                  <p className="text-3xl font-bold">{stats?.total_applications || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interviews Scheduled</p>
                  <p className="text-3xl font-bold">{stats?.interviews_scheduled || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Offers Received</p>
                  <p className="text-3xl font-bold">{stats?.offers_received || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resumes</p>
                  <p className="text-3xl font-bold">{stats?.resume_count || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Your latest job applications</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/applications')}>
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              {stats?.recent_applications?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent_applications.map((app) => (
                    <div 
                      key={app.application_id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{app.job_title}</p>
                          <p className="text-sm text-muted-foreground">{app.company_name}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No applications yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/jobs')}
                  >
                    Browse Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get things done faster</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/resumes')}
                data-testid="quick-upload-resume"
              >
                <Upload className="w-4 h-4 mr-3" />
                Upload New Resume
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/jobs')}
                data-testid="quick-browse-jobs"
              >
                <Briefcase className="w-4 h-4 mr-3" />
                Browse Job Listings
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gradient-ai text-white hover:opacity-90"
                onClick={() => navigate('/resumes')}
                data-testid="quick-tailor-resume"
              >
                <Sparkles className="w-4 h-4 mr-3" />
                Tailor Resume with AI
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reports')}
                data-testid="quick-view-reports"
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Breakdown */}
        {stats?.status_breakdown && Object.keys(stats.status_breakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Application Status Breakdown</CardTitle>
              <CardDescription>Distribution of your applications by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.status_breakdown).map(([status, count]) => {
                  const percentage = (count / stats.total_applications) * 100;
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
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
