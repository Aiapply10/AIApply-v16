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
    phone: 'Phone Number',
    linkedin_profile: 'LinkedIn Profile',
    linkedin_url: 'LinkedIn URL',
    primary_technology: 'Primary Technology',
    sub_technologies: 'Sub Technologies',
    location: 'Current Location',
    salary_min: 'Minimum Salary',
    salary_max: 'Maximum Salary',
    tax_type: 'Tax Type (W2/1099/C2C)',
    tax_types: 'Tax Types',
    relocation_preference: 'Relocation Preference',
    location_preferences: 'Preferred Locations',
    job_type_preferences: 'Job Type (Remote/Hybrid/Onsite)',
    resume: 'Resume',
    years_of_experience: 'Years of Experience',
    current_job_title: 'Current Job Title',
    work_authorization: 'Work Authorization',
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
      
      // Show popup if profile is not 100% complete
      // Add delay and check if user has dismissed it recently
      if (completenessRes.data.percentage < 100) {
        const lastDismissed = localStorage.getItem('profile_popup_dismissed');
        const dismissedTime = lastDismissed ? parseInt(lastDismissed) : 0;
        const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
        
        // Only show if not dismissed in the last 24 hours
        if (hoursSinceDismissed > 24) {
          // Add a small delay for smoother UX
          setTimeout(() => {
            setShowProfilePopup(true);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissProfilePopup = () => {
    localStorage.setItem('profile_popup_dismissed', Date.now().toString());
    setShowProfilePopup(false);
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
      description: 'Uploaded',
    },
  ];

  const isProfileComplete = profileCompleteness?.percentage >= 80;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-8" data-testid="candidate-dashboard">

        {/* Header with animation */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-800">
              Welcome back,{' '}
              <span className="text-gradient-primary">
                {user?.name?.split(' ')[0]}!
              </span>
            </h1>
            <p className="text-slate-500 mt-2">
              Here&apos;s an overview of your job search progress
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 group"
              onClick={() => navigate('/live-jobs')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Browse Live Jobs
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Profile Incomplete Warning Banner */}
        <AnimatePresence>
          {!isProfileComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden">
                <CardContent className="flex items-center gap-4 py-4">
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                    className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"
                  >
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">Profile Incomplete ({profileCompleteness?.percentage}%)</h3>
                    <p className="text-sm text-amber-700">
                      Complete your profile to enable Auto-Apply and get better job recommendations.
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                      onClick={() => setShowProfilePopup(true)}
                    >
                      View Missing Fields
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions for new users */}
        <AnimatePresence>
          {resumes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 overflow-hidden relative">
                <CardContent className="flex flex-col items-center justify-center py-12 relative">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30"
                  >
                    <Upload className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="font-heading text-2xl font-semibold mb-2 text-slate-800">Upload Your First Resume</h3>
                  <p className="text-slate-600 text-center mb-6 max-w-md">
                    Get started by uploading your resume. Our AI will help you tailor it for specific job applications.
                  </p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={() => navigate('/resumes')} 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30" 
                      data-testid="upload-resume-cta"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Upload Resume
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid with staggered animation */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <StaggerItem key={stat.label}>
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="h-full"
              >
                <Card className="bg-white border-slate-200 shadow-md hover:shadow-xl transition-shadow duration-300 h-full cursor-pointer group">
                  <CardContent className="pt-6 h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        <motion.p 
                          className="text-4xl font-bold mt-1 text-slate-800"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                        >
                          {stat.value}
                        </motion.p>
                        <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                      </div>
                      <motion.div 
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
                      >
                        <stat.icon className="w-7 h-7 text-white" />
                      </motion.div>
                    </div>
                    {/* Hover indicator */}
                    <motion.div 
                      className="h-1 bg-gradient-to-r mt-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }}
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Main Content Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid lg:grid-cols-3 gap-6"
        >
          {/* Recent Applications */}
          <Card className="lg:col-span-2 bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"
                  >
                    <Target className="w-4 h-4 text-blue-600" />
                  </motion.div>
                  Recent Applications
                </CardTitle>
                <CardDescription className="text-slate-500">Your latest job applications</CardDescription>
              </div>
              <motion.div whileHover={{ x: 3 }}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/applications')}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 group"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </CardHeader>
            <CardContent>
              {stats?.recent_applications?.length > 0 ? (
                <StaggerContainer className="space-y-3" delay={0.1}>
                  {stats.recent_applications.slice(0, 5).map((app, index) => (
                    <StaggerItem key={app.application_id || index}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div 
                            whileHover={{ rotate: 10 }}
                            className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center"
                          >
                            <Briefcase className="w-5 h-5 text-white" />
                          </motion.div>
                          <div>
                            <p className="font-medium text-slate-800">{app.job_title || 'Position'}</p>
                            <p className="text-sm text-slate-500">{app.company_name || 'Company'}</p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(app.status)} border`}>
                          {app.status?.replace('_', ' ') || 'Applied'}
                        </Badge>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
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

          {/* Quick Actions - Enhanced */}
          <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"
                >
                  <Zap className="w-4 h-4 text-emerald-600" />
                </motion.div>
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-500">Common tasks at your fingertips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Upload, bgColor: 'bg-blue-100', iconColor: 'text-blue-600', label: 'Upload New Resume', path: '/resumes' },
                { icon: Eye, bgColor: 'bg-pink-100', iconColor: 'text-pink-600', label: 'Browse Live Jobs', path: '/live-jobs' },
                { icon: Sparkles, bgColor: 'bg-violet-100', iconColor: 'text-violet-600', label: 'Tailor Resume with AI', path: '/resumes' },
              ].map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 h-12 group"
                    onClick={() => navigate(action.path)}
                  >
                    <div className={`w-8 h-8 rounded-lg ${action.bgColor} flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                      <action.icon className={`w-4 h-4 ${action.iconColor}`} />
                    </div>
                    <span className="font-medium">{action.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                  </Button>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline" 
                  className={`w-full justify-start h-12 group ${
                    isProfileComplete 
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300' 
                      : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800'
                  }`}
                  onClick={() => isProfileComplete ? navigate('/live-jobs') : setShowProfilePopup(true)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                    isProfileComplete ? 'bg-cyan-100' : 'bg-amber-100'
                  }`}>
                    {isProfileComplete ? (
                      <Bot className="w-4 h-4 text-cyan-600" />
                    ) : (
                      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </motion.div>
                    )}
                  </div>
                  <span className="font-medium">{isProfileComplete ? 'Auto-Apply Jobs' : 'Auto-Apply (Profile Incomplete)'}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </PageTransition>

      {/* Profile Completion Popup - Outside PageTransition for proper centering */}
      <Dialog open={showProfilePopup} onOpenChange={setShowProfilePopup}>
        <DialogContent className="max-w-lg bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-slate-800">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
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
              Complete your profile to use Auto-Apply and get better job matches.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Profile Completion</span>
                <span className={`font-semibold ${
                  profileCompleteness?.percentage >= 80 ? 'text-green-600' : 
                  profileCompleteness?.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {profileCompleteness?.percentage}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Missing ({profileCompleteness.missing_fields.length} items):
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                  {profileCompleteness.missing_fields.map((field) => {
                    const IconComponent = fieldIcons[field] || AlertTriangle;
                    const fieldLabel = fieldLabels[field] || field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                      <div 
                        key={field}
                        className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <IconComponent className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm text-amber-800">{fieldLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Auto-Apply Warning - Compact */}
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">
                  <span className="font-semibold">Auto-Apply Disabled</span> - Complete 80%+ to enable
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 border-slate-200 text-slate-700"
              onClick={handleDismissProfilePopup}
            >
              Later
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              onClick={() => {
                handleDismissProfilePopup();
                navigate('/profile');
              }}
            >
              Complete Profile
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default DashboardPage;
