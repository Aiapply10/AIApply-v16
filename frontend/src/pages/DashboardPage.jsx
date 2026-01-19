import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuthStore } from '../store';
import { reportAPI, resumeAPI, authAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
  User,
  AlertTriangle,
  X,
  ChevronRight,
  Bot,
  Star,
  Award,
  Calendar,
  MessageSquare,
  Eye
} from 'lucide-react';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  HoverCard,
  AnimatedTooltip,
  AnimatedProgress,
  AnimatedCounter 
} from '../components/ui/animations';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(null);

  // Field labels for display
  const fieldLabels = {
    name: 'Full Name',
    email: 'Email Address',
    primary_technology: 'Primary Technology',
    sub_technologies: 'Sub Technologies (Skills)',
    location: 'Current Location',
    phone: 'Phone Number',
    linkedin_profile: 'LinkedIn Profile',
    salary_min: 'Expected Minimum Salary',
    salary_max: 'Expected Maximum Salary',
    tax_type: 'Tax Type Preference (W2/1099/C2C)',
    relocation_preference: 'Relocation Preference',
    location_preferences: 'Preferred Job Locations',
    job_type_preferences: 'Job Type Preferences (Remote/Hybrid/Onsite)',
    resume: 'Resume Upload',
  };

  // Field icons for display
  const fieldIcons = {
    name: User,
    email: Send,
    primary_technology: Zap,
    sub_technologies: Sparkles,
    location: Target,
    phone: Clock,
    linkedin_profile: Briefcase,
    salary_min: TrendingUp,
    salary_max: TrendingUp,
    tax_type: FileText,
    relocation_preference: Rocket,
    location_preferences: Target,
    job_type_preferences: Briefcase,
    resume: Upload,
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, resumesRes, completenessRes] = await Promise.all([
        reportAPI.getCandidate(),
        resumeAPI.getAll(),
        authAPI.getProfileCompleteness()
      ]);
      setStats(statsRes.data);
      setResumes(resumesRes.data);
      setProfileCompleteness(completenessRes.data);
      
      // Show popup if profile is incomplete (less than 80%)
      if (completenessRes.data.percentage < 80) {
        setShowProfilePopup(true);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-700 border-blue-200',
      screening: 'bg-amber-100 text-amber-700 border-amber-200',
      interview_scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
      interviewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      offer: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
      ready_to_apply: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600" />
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      label: 'Total Applications',
      value: stats?.total_applications || 0,
      icon: Send,
      color: 'from-blue-500 to-indigo-500',
      bgLight: 'bg-blue-50',
      iconColor: 'text-blue-600',
      description: 'Jobs applied to',
    },
    {
      label: 'Interviews',
      value: stats?.interviews_scheduled || 0,
      icon: Calendar,
      color: 'from-orange-500 to-amber-500',
      bgLight: 'bg-orange-50',
      iconColor: 'text-orange-600',
      description: 'Scheduled',
    },
    {
      label: 'Offers',
      value: stats?.offers_received || 0,
      icon: Award,
      color: 'from-emerald-500 to-green-500',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      description: 'Received',
    },
    {
      label: 'Resumes',
      value: stats?.resume_count || 0,
      icon: FileText,
      color: 'from-violet-500 to-purple-500',
      bgLight: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  const isProfileComplete = profileCompleteness?.percentage >= 80;

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="candidate-dashboard">
        {/* Profile Completion Popup */}
        <Dialog open={showProfilePopup} onOpenChange={setShowProfilePopup}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-slate-800">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <span className="block">Complete Your Profile</span>
                  <span className="text-sm font-normal text-slate-500">
                    {profileCompleteness?.percentage}% complete
                  </span>
                </div>
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Please complete these fields to use Auto-Apply and get better job matches.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Profile Completion</span>
                  <span className={`font-semibold ${
                    profileCompleteness?.percentage >= 80 ? 'text-green-600' : 
                    profileCompleteness?.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {profileCompleteness?.percentage}%
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      profileCompleteness?.percentage >= 80 ? 'bg-green-500' : 
                      profileCompleteness?.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${profileCompleteness?.percentage}%` }}
                  />
                </div>
              </div>
              
              {/* Missing Fields */}
              {profileCompleteness?.missing_fields?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    Missing Information ({profileCompleteness.missing_fields.length} items):
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {profileCompleteness.missing_fields.map((field) => {
                      const IconComponent = fieldIcons[field] || AlertTriangle;
                      return (
                        <div 
                          key={field}
                          className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {fieldLabels[field] || field}
                            </p>
                          </div>
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Auto-Apply Warning */}
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Auto-Apply Disabled</p>
                    <p className="text-sm text-red-600 mt-1">
                      Complete at least 80% of your profile to enable Auto-Apply feature for automatic job applications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 border-slate-200 text-slate-700"
                onClick={() => setShowProfilePopup(false)}
              >
                Remind Me Later
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                onClick={() => {
                  setShowProfilePopup(false);
                  navigate('/profile');
                }}
              >
                Complete Profile
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-800">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0]}!
              </span>
            </h1>
            <p className="text-slate-600 mt-1">
              Here's an overview of your job search progress
            </p>
          </div>
          <Button 
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 group"
            onClick={() => navigate('/live-jobs')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Browse Live Jobs
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Profile Incomplete Warning Banner */}
        {!isProfileComplete && (
          <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Profile Incomplete ({profileCompleteness?.percentage}%)</h3>
                <p className="text-sm text-amber-700">
                  Complete your profile to enable Auto-Apply and get better job recommendations.
                </p>
              </div>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                onClick={() => setShowProfilePopup(true)}
              >
                View Missing Fields
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for new users */}
        {resumes.length === 0 && (
          <Card className="border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 overflow-hidden relative">
            <CardContent className="flex flex-col items-center justify-center py-12 relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/30">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-heading text-2xl font-semibold mb-2 text-slate-800">Upload Your First Resume</h3>
              <p className="text-slate-600 text-center mb-6 max-w-md">
                Get started by uploading your resume. Our AI will help you tailor it for specific job applications.
              </p>
              <Button 
                onClick={() => navigate('/resumes')} 
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30" 
                data-testid="upload-resume-cta"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.label}
              className="bg-white border-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-4xl font-bold mt-1 text-slate-800">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-xl ${stat.bgLight} flex items-center justify-center`}>
                    <stat.icon className={`w-7 h-7 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <Card className="lg:col-span-2 bg-white border-slate-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-violet-600" />
                  </div>
                  Recent Applications
                </CardTitle>
                <CardDescription className="text-slate-500">Your latest job applications</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/applications')}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {stats?.recent_applications?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_applications.slice(0, 5).map((app, index) => (
                    <div 
                      key={app.application_id || index}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{app.job_title || 'Position'}</p>
                          <p className="text-sm text-slate-500">{app.company_name || 'Company'}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(app.status)} border`}>
                        {app.status?.replace('_', ' ') || 'Applied'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-800 mb-1">No applications yet</h3>
                  <p className="text-sm text-slate-500 mb-4">Start applying to jobs to see them here</p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/live-jobs')}
                    className="border-slate-200 text-slate-600"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-600" />
                </div>
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-500">Common tasks at your fingertips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-50 h-12"
                onClick={() => navigate('/resumes')}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                  <Upload className="w-4 h-4 text-blue-600" />
                </div>
                Upload New Resume
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-50 h-12"
                onClick={() => navigate('/live-jobs')}
              >
                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center mr-3">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                </div>
                Browse Live Jobs
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-50 h-12"
                onClick={() => navigate('/resumes')}
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center mr-3">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                </div>
                Tailor Resume with AI
              </Button>
              <Button 
                variant="outline" 
                className={`w-full justify-start h-12 ${
                  isProfileComplete 
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-50' 
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
                onClick={() => isProfileComplete ? navigate('/live-jobs-2') : setShowProfilePopup(true)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                  isProfileComplete ? 'bg-cyan-100' : 'bg-amber-100'
                }`}>
                  {isProfileComplete ? (
                    <Bot className="w-4 h-4 text-cyan-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                {isProfileComplete ? 'Auto-Apply Jobs' : 'Auto-Apply (Profile Incomplete)'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
