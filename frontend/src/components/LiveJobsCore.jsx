import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { liveJobsAPI, liveJobs1API, resumeAPI, applicationAPI, coverLetterAPI, autoApplyAPI, authAPI } from '../lib/api';
import { useAuthStore } from '../store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search,
  MapPin, 
  Building2,
  ExternalLink, 
  Briefcase,
  Clock,
  DollarSign,
  Loader2,
  Sparkles,
  Globe,
  Send,
  Filter,
  RefreshCw,
  FileEdit,
  Target,
  AlertTriangle,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Copy,
  CheckCircle2,
  Bot,
  Rocket,
  Settings,
  History,
  AlertCircle,
  X,
  Plus,
  Wand2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem,
  HoverCard,
} from './ui/animations';

// Job Source Platforms
const JOB_SOURCES = [
  { value: 'all', label: 'All Platforms', icon: '🌐' },
  { value: 'arbeitnow', label: 'Arbeitnow', icon: '💼' },
  { value: 'remotive', label: 'Remotive', icon: '🏠' },
  { value: 'remoteok', label: 'RemoteOK', icon: '🌍' },
  { value: 'jobicy', label: 'Jobicy', icon: '🎯' },
  { value: 'hackernews', label: 'HackerNews', icon: '🔶' },
];

// Employment type options
const EMPLOYMENT_TYPES = [
  { value: 'FULLTIME', label: 'Full Time' },
  { value: 'PARTTIME', label: 'Part Time' },
  { value: 'CONTRACTOR', label: 'Contract' },
  { value: 'C2C', label: 'C2C' },
  { value: 'W2', label: 'W2' },
];

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatSalary = (min, max, currency = 'USD') => {
  if (!min && !max) return null;
  const format = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num;
  };
  if (min && max) return `${currency} ${format(min)} - ${format(max)}`;
  if (min) return `${currency} ${format(min)}+`;
  if (max) return `Up to ${currency} ${format(max)}`;
  return null;
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard!');
};

// Job Card Component (moved outside to avoid re-creation on every render)
function JobCard({ job, index, onApply }) {
  return (
    <HoverCard delay={50}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-violet-300 bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    {job.source || 'Job Board'}
                  </Badge>
                  {job.remote && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      Remote
                    </Badge>
                  )}
                  {job.employment_type && (
                    <Badge variant="secondary" className="text-xs">
                      {job.employment_type}
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-violet-700 transition-colors truncate">
                  {job.title}
                </h3>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {job.company}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                  )}
                </div>

                {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-green-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                  </div>
                )}

                {job.description && (
                  <p className="mt-3 text-sm text-slate-500 line-clamp-2">
                    {job.description.substring(0, 150)}...
                  </p>
                )}

                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.tags.slice(0, 5).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-violet-50 text-violet-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  Posted {formatDate(job.posted_at || job.date_posted)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => onApply(job)}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  data-testid={`apply-job-${index}`}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Apply
                </Button>
                {(job.url || job.apply_url) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(job.url || job.apply_url, '_blank')}
                    data-testid={`view-job-${index}`}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </HoverCard>
  );
}

// Unified Live Jobs Component
export function LiveJobsCore({ variant = 'free', pageTitle, pageDescription }) {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  
  // Select the appropriate API based on variant
  const jobsAPI = variant === 'premium' ? liveJobs1API : liveJobsAPI;
  
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredContent, setTailoredContent] = useState('');
  const [tailoredVersions, setTailoredVersions] = useState([]);
  const [extractedKeywords, setExtractedKeywords] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('default');
  const [activeTab, setActiveTab] = useState('recommendations');
  const [apiMessage, setApiMessage] = useState('');
  const [requiresProfileUpdate, setRequiresProfileUpdate] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [apiErrors, setApiErrors] = useState([]);
  
  // Step-by-step apply wizard state
  const [applyStep, setApplyStep] = useState(1);
  const [aiCommand, setAiCommand] = useState('');

  // Auto-Apply state
  const [showAutoApplyDialog, setShowAutoApplyDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [isRunningAutoApply, setIsRunningAutoApply] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(null);
  const [autoApplyStatus, setAutoApplyStatus] = useState(null);
  const [autoApplySettings, setAutoApplySettings] = useState({
    enabled: false,
    resume_id: '',
    job_keywords: [],
    locations: ['United States'],
    max_applications_per_day: 10,
    auto_tailor_resume: true,
    generate_cover_letter: true,
    source_filters: [],
    schedule_time: '12:00',
    schedule_enabled: true,
    schedule_frequency: 'daily',
    auto_submit_enabled: true
  });
  const [autoApplyHistory, setAutoApplyHistory] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [viewingResumeApp, setViewingResumeApp] = useState(null);

  const [searchForm, setSearchForm] = useState({
    query: '',
    location: 'United States',
    employment_types: [],
    remote_only: true,
    source: 'all',
  });

  const [applicationForm, setApplicationForm] = useState({
    resume_id: '',
    cover_letter: '',
  });

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setQuotaExhausted(false);
    setApiErrors([]);
    
    try {
      try {
        const userRes = await authAPI.getMe();
        if (userRes.data) {
          updateUser(userRes.data);
        }
      } catch (userError) {
        console.error('Error loading user profile:', userError);
      }
      
      try {
        const recsRes = await jobsAPI.getRecommendations();
        setRecommendations(recsRes.data.recommendations || []);
        
        if (recsRes.data.message) {
          setApiMessage(recsRes.data.message);
        }
        if (recsRes.data.requires_profile_update) {
          setRequiresProfileUpdate(true);
        }
        if (recsRes.data.quota_exhausted) {
          setQuotaExhausted(true);
          toast.error('API quota exhausted. Please check your RapidAPI subscription.');
        } else if (recsRes.data.quota_warning) {
          toast.warning(recsRes.data.message || 'Some APIs hit rate limits.');
        }
        if (recsRes.data.api_errors) {
          setApiErrors(recsRes.data.api_errors);
        }
      } catch (recsError) {
        console.error('Error loading recommendations:', recsError);
        if (recsError.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
        } else {
          toast.error('Failed to load job recommendations');
        }
        setRecommendations([]);
      }
      
      try {
        const resumesRes = await resumeAPI.getAll();
        setResumes(resumesRes.data || []);
      } catch (resumeError) {
        console.error('Error loading resumes:', resumeError);
        setResumes([]);
      }
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [jobsAPI, updateUser]);

  const loadAutoApplyStatus = useCallback(async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        autoApplyAPI.getStatus(),
        autoApplyAPI.getSettings()
      ]);
      
      console.log('Auto-apply status loaded:', statusRes.data);
      setAutoApplyStatus(statusRes.data);
      
      if (settingsRes.data) {
        setAutoApplySettings(prev => ({ ...prev, ...settingsRes.data }));
      }
    } catch (error) {
      console.error('Error loading auto-apply status:', error);
      // Set default values on error
      setAutoApplyStatus({
        applications_today: 0,
        total_submitted: 0,
        total_failed: 0,
        success_rate: 0,
        enabled: false
      });
    }
  }, []);

  const loadProfileCompleteness = useCallback(async () => {
    try {
      const res = await authAPI.getProfileCompleteness();
      setProfileCompleteness(res.data);
    } catch (error) {
      console.error('Error loading profile completeness:', error);
    }
  }, []);

  const loadAutoApplyHistory = useCallback(async () => {
    try {
      const response = await autoApplyAPI.getHistory(50);
      setAutoApplyHistory(response.data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    loadAutoApplyStatus();
    loadProfileCompleteness();
  }, [loadInitialData, loadAutoApplyStatus, loadProfileCompleteness]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setIsSearching(true);
    setActiveTab('search');
    setQuotaExhausted(false);
    setApiErrors([]);
    
    try {
      const response = await jobsAPI.search({
        query: searchForm.query || user?.primary_technology || 'software engineer',
        location: searchForm.location,
        employmentTypes: searchForm.employment_types,
        remoteOnly: searchForm.remote_only,
        source: searchForm.source,
        page: 1
      });
      
      if (response.data.jobs) {
        setJobs(response.data.jobs);
        if (response.data.jobs.length === 0) {
          toast.info('No jobs found. Try different search terms.');
        } else {
          toast.success(`Found ${response.data.jobs.length} jobs`);
        }
      }
      
      if (response.data.quota_exhausted) {
        setQuotaExhausted(true);
        toast.error('API quota exhausted');
      }
      if (response.data.api_errors) {
        setApiErrors(response.data.api_errors);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search jobs');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = (job) => {
    setSelectedJob(job);
    setApplyStep(1);
    setAiCommand('');
    setTailoredContent('');
    setTailoredVersions([]);
    setExtractedKeywords('');
    setSelectedVersion('default');
    setApplicationForm({ resume_id: '', cover_letter: '' });
    setShowApplyDialog(true);
  };

  const handleTailorResume = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume first');
      return;
    }

    setIsTailoring(true);
    try {
      const response = await resumeAPI.tailor({
        resume_id: applicationForm.resume_id,
        job_title: selectedJob.title,
        job_description: selectedJob.description || `${selectedJob.title} at ${selectedJob.company}`,
        company_name: selectedJob.company,
        ai_command: aiCommand || undefined,
        generate_versions: true
      });

      setTailoredContent(response.data.tailored_content);
      setTailoredVersions(response.data.versions || []);
      setExtractedKeywords(response.data.extracted_keywords || '');
      toast.success('Resume tailored successfully!');
      setApplyStep(2);
    } catch (error) {
      console.error('Tailor error:', error);
      toast.error(error.response?.data?.detail || 'Failed to tailor resume');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume first');
      return;
    }

    setIsGeneratingCover(true);
    try {
      const selectedResume = resumes.find(r => r.id === applicationForm.resume_id);
      const response = await coverLetterAPI.generate({
        resume_content: tailoredContent || selectedResume?.content || '',
        job_title: selectedJob.title,
        company_name: selectedJob.company,
        job_description: selectedJob.description || ''
      });

      setApplicationForm(prev => ({
        ...prev,
        cover_letter: response.data.cover_letter
      }));
      toast.success('Cover letter generated!');
    } catch (error) {
      console.error('Cover letter error:', error);
      toast.error('Failed to generate cover letter');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume');
      return;
    }

    setIsSubmitting(true);
    try {
      await applicationAPI.create({
        job_id: selectedJob.id || `job_${Date.now()}`,
        job_title: selectedJob.title,
        company: selectedJob.company,
        job_url: selectedJob.url || selectedJob.apply_url,
        resume_id: applicationForm.resume_id,
        tailored_resume: tailoredContent || null,
        cover_letter: applicationForm.cover_letter || null,
        status: 'ready_to_apply',
        source: selectedJob.source || 'live_jobs'
      });

      toast.success('Application saved! Go to Applications page to submit.');
      setShowApplyDialog(false);
      
      if (selectedJob.url || selectedJob.apply_url) {
        window.open(selectedJob.url || selectedJob.apply_url, '_blank');
      }
    } catch (error) {
      console.error('Application error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAutoApply = async () => {
    if (!autoApplySettings.enabled && profileCompleteness?.percentage < 80) {
      setShowProfileWarning(true);
      return;
    }

    try {
      const response = await autoApplyAPI.toggle();
      setAutoApplySettings(prev => ({ ...prev, enabled: response.data.enabled }));
      toast.success(response.data.enabled ? 'Auto-apply enabled!' : 'Auto-apply disabled');
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to toggle auto-apply');
    }
  };

  const handleSaveAutoApplySettings = async () => {
    try {
      await autoApplyAPI.updateSettings(autoApplySettings);
      toast.success('Settings saved!');
      setShowAutoApplyDialog(false);
      // Refresh status after saving settings
      loadAutoApplyStatus();
    } catch (error) {
      console.error('Settings error:', error);
      toast.error('Failed to save settings');
    }
  };

  // Auto-apply progress state
  const [autoApplyProgress, setAutoApplyProgress] = useState({
    isRunning: false,
    currentJob: '',
    jobsProcessed: 0,
    totalJobs: 0,
    submittedCount: 0,
    failedCount: 0,
    status: '',
    results: []
  });

  const handleRunAutoApply = async () => {
    if (profileCompleteness?.percentage < 80) {
      setShowProfileWarning(true);
      return;
    }

    setIsRunningAutoApply(true);
    setAutoApplyProgress({
      isRunning: true,
      currentJob: 'Finding matching jobs and submitting applications...',
      jobsProcessed: 0,
      totalJobs: 0,
      submittedCount: 0,
      failedCount: 0,
      status: 'searching',
      results: []
    });
    
    try {
      // Pass the source variant to the backend
      const response = await autoApplyAPI.run({ source_variant: variant === 'premium' ? 'live_jobs_1' : 'live_jobs' });
      
      const data = response.data;
      const appliedCount = data.applied_count || data.applications_created || 0;
      const submittedCount = data.submitted_count || 0;
      const submittedApps = data.submitted_applications || [];
      const successCount = submittedApps.filter(a => a.success).length;
      const failedCount = submittedApps.filter(a => !a.success).length;
      
      if (appliedCount > 0) {
        setAutoApplyProgress(prev => ({
          ...prev,
          isRunning: false,
          status: 'completed',
          jobsProcessed: appliedCount,
          totalJobs: appliedCount,
          submittedCount: successCount,
          failedCount: failedCount,
          currentJob: 'Completed!',
          results: data.applications || []
        }));
        
        // Show detailed toast
        if (data.auto_submit_skipped) {
          toast.info(`Created ${appliedCount} applications. Browser automation unavailable - please apply manually from Applications page.`, {
            duration: 8000
          });
        } else if (submittedCount > 0) {
          toast.success(
            `Processed ${appliedCount} jobs: ${successCount} submitted successfully, ${failedCount} need manual apply.`,
            { duration: 8000 }
          );
        } else {
          toast.success(`Created ${appliedCount} applications! Go to Applications page to submit.`);
        }
      } else {
        setAutoApplyProgress(prev => ({
          ...prev,
          isRunning: false,
          status: 'no_jobs',
          currentJob: data.message || 'No matching jobs found'
        }));
        toast.info(data.message || 'No new applications created');
      }
      
      // Refresh data after auto-apply completes
      loadAutoApplyHistory();
      loadAutoApplyStatus();
    } catch (error) {
      console.error('Auto-apply error:', error);
      setAutoApplyProgress(prev => ({
        ...prev,
        isRunning: false,
        status: 'error',
        currentJob: error.response?.data?.detail || 'Auto-apply failed'
      }));
      toast.error(error.response?.data?.detail || 'Auto-apply failed');
    } finally {
      setIsRunningAutoApply(false);
    }
  };

  const handleAutoFillSettings = async () => {
    try {
      const response = await autoApplyAPI.autoFillSettings();
      if (response.data.settings) {
        setAutoApplySettings(prev => ({ ...prev, ...response.data.settings }));
        toast.success('Settings auto-filled from your profile!');
        // Refresh status
        loadAutoApplyStatus();
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      toast.error('Failed to auto-fill settings');
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !autoApplySettings.job_keywords.includes(newKeyword.trim())) {
      setAutoApplySettings(prev => ({
        ...prev,
        job_keywords: [...prev.job_keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setAutoApplySettings(prev => ({
      ...prev,
      job_keywords: prev.job_keywords.filter(k => k !== keyword)
    }));
  };

  const addLocation = () => {
    if (newLocation.trim() && !autoApplySettings.locations.includes(newLocation.trim())) {
      setAutoApplySettings(prev => ({
        ...prev,
        locations: [...prev.locations, newLocation.trim()]
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (location) => {
    setAutoApplySettings(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l !== location)
    }));
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              {pageTitle || (variant === 'premium' ? 'Live Jobs (Premium)' : 'Live Jobs')}
            </h1>
            <p className="text-slate-600 mt-1">
              {pageDescription || (variant === 'premium' 
                ? 'Premium job listings from RapidAPI sources' 
                : 'Free job listings from multiple sources')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadInitialData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Auto Apply Panel */}
        <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Auto-Apply AI Agent</CardTitle>
                  <CardDescription>Let AI apply to jobs automatically</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoApplySettings.enabled}
                  onCheckedChange={handleToggleAutoApply}
                  data-testid="auto-apply-toggle"
                />
                <span className="text-sm font-medium">
                  {autoApplySettings.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {autoApplyStatus && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-violet-600">
                    {autoApplyStatus.applications_today || 0}
                  </div>
                  <div className="text-xs text-slate-500">Today</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {autoApplyStatus.total_submitted || autoApplyStatus.total_applications || 0}
                  </div>
                  <div className="text-xs text-slate-500">Submitted</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-red-500">
                    {autoApplyStatus.total_failed || 0}
                  </div>
                  <div className="text-xs text-slate-500">Failed</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">
                    {autoApplyStatus.success_rate || 0}%
                  </div>
                  <div className="text-xs text-slate-500">Success Rate</div>
                </div>
              </div>
            )}

            {/* Running status indicator with progress */}
            {isRunningAutoApply && (
              <div className="p-4 bg-violet-100 border border-violet-200 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-violet-800">Auto-Apply is running...</p>
                    <p className="text-xs text-violet-600">{autoApplyProgress.currentJob || 'Processing applications...'}</p>
                  </div>
                </div>
                
                {autoApplyProgress.totalJobs > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-violet-700">
                      <span>Progress</span>
                      <span>{autoApplyProgress.jobsProcessed} / {autoApplyProgress.totalJobs} jobs</span>
                    </div>
                    <div className="w-full bg-violet-200 rounded-full h-2">
                      <div 
                        className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(autoApplyProgress.jobsProcessed / autoApplyProgress.totalJobs) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Show completion status */}
            {!isRunningAutoApply && autoApplyProgress.status === 'completed' && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Auto-Apply Completed!</span>
                </div>
                
                {/* Submission Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-violet-600">{autoApplyProgress.jobsProcessed}</div>
                    <div className="text-xs text-slate-500">Processed</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-green-600">{autoApplyProgress.submittedCount}</div>
                    <div className="text-xs text-slate-500">Submitted</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-amber-600">{autoApplyProgress.failedCount}</div>
                    <div className="text-xs text-slate-500">Need Manual</div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-2">
                  {autoApplyProgress.submittedCount > 0 
                    ? `Successfully submitted ${autoApplyProgress.submittedCount} applications. ${autoApplyProgress.failedCount > 0 ? `${autoApplyProgress.failedCount} applications need manual submission.` : ''}`
                    : 'Applications are ready. Go to Applications page to review and submit.'}
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate('/applications')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View Applications
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleRunAutoApply}
                disabled={isRunningAutoApply || !autoApplySettings.enabled}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                data-testid="run-auto-apply-btn"
              >
                {isRunningAutoApply ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-1" />
                    Run Now
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  // Refresh resumes and settings when opening dialog
                  try {
                    const [resumesRes, settingsRes] = await Promise.all([
                      resumeAPI.getAll(),
                      autoApplyAPI.getSettings()
                    ]);
                    console.log('Resumes loaded for settings dialog:', resumesRes.data);
                    setResumes(resumesRes.data || []);
                    if (settingsRes.data) {
                      console.log('Settings loaded:', settingsRes.data);
                      setAutoApplySettings(prev => ({ ...prev, ...settingsRes.data }));
                    }
                  } catch (error) {
                    console.error('Error refreshing data for settings dialog:', error);
                  }
                  setShowAutoApplyDialog(true);
                }}
                data-testid="auto-apply-settings-btn"
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  loadAutoApplyHistory();
                  setShowHistoryDialog(true);
                }}
                data-testid="auto-apply-history-btn"
              >
                <History className="w-4 h-4 mr-1" />
                History
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/applications')}
                data-testid="view-applications-btn"
              >
                <Briefcase className="w-4 h-4 mr-1" />
                View Applications
              </Button>
            </div>

            {profileCompleteness && profileCompleteness.percentage < 80 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-700">
                    Complete your profile ({profileCompleteness.percentage}%) for better results
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/profile')}
                  className="border-amber-300 text-amber-700"
                >
                  Complete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recommended
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
                <p className="text-slate-500">Loading recommendations...</p>
              </div>
            ) : quotaExhausted ? (
              <Card className="border-2 border-red-200 bg-red-50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2 text-red-800">API Quota Exhausted</h3>
                  <p className="text-red-600 text-center max-w-md mb-4">
                    {apiMessage || "The job search API quota has been exhausted. Please try again later or upgrade your RapidAPI subscription."}
                  </p>
                  {apiErrors.length > 0 && (
                    <div className="bg-red-100 rounded-lg p-3 mb-4 w-full max-w-md">
                      <p className="text-sm font-medium text-red-700 mb-1">API Status:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {apiErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => window.open('https://rapidapi.com/dashboard', '_blank')}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Check RapidAPI Dashboard
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('search')}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Try Manual Search
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : requiresProfileUpdate ? (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Complete Your Profile</h3>
                  <p className="text-slate-600 text-center max-w-md mb-4">
                    {apiMessage || 'Add your skills and preferences to get personalized job recommendations.'}
                  </p>
                  <Button onClick={() => navigate('/profile')}>
                    Complete Profile
                  </Button>
                </CardContent>
              </Card>
            ) : recommendations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                  <p className="text-slate-500 text-center max-w-md mb-4">
                    Try searching for jobs or complete your profile for personalized recommendations.
                  </p>
                  <Button onClick={() => setActiveTab('search')}>
                    <Search className="w-4 h-4 mr-2" />
                    Search Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <StaggerContainer>
                <div className="grid gap-4">
                  {recommendations.map((job, index) => (
                    <StaggerItem key={job.id || index}>
                      <JobCard job={job} index={index} onApply={handleApply} />
                    </StaggerItem>
                  ))}
                </div>
              </StaggerContainer>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Search Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Keywords</Label>
                      <Input
                        placeholder="Job title, skills..."
                        value={searchForm.query}
                        onChange={(e) => setSearchForm(prev => ({ ...prev, query: e.target.value }))}
                        data-testid="search-keywords"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        placeholder="City, Country..."
                        value={searchForm.location}
                        onChange={(e) => setSearchForm(prev => ({ ...prev, location: e.target.value }))}
                        data-testid="search-location"
                      />
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select
                        value={searchForm.source}
                        onValueChange={(value) => setSearchForm(prev => ({ ...prev, source: value }))}
                      >
                        <SelectTrigger data-testid="search-source">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_SOURCES.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.icon} {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={searchForm.remote_only}
                          onCheckedChange={(checked) => setSearchForm(prev => ({ ...prev, remote_only: checked }))}
                        />
                        <Label>Remote Only</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSearching}
                    className="bg-violet-600 hover:bg-violet-700"
                    data-testid="search-submit-btn"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search Jobs
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {jobs.length > 0 ? (
              <StaggerContainer>
                <div className="grid gap-4">
                  {jobs.map((job, index) => (
                    <StaggerItem key={job.id || index}>
                      <JobCard job={job} index={index} onApply={handleApply} />
                    </StaggerItem>
                  ))}
                </div>
              </StaggerContainer>
            ) : !isSearching && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search for Jobs</h3>
                  <p className="text-slate-500 text-center">
                    Use the filters above to find your perfect job
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Apply Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Apply to {selectedJob?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedJob?.company} • {selectedJob?.location || 'Remote'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between mb-6">
              {[
                { step: 1, label: 'Tailor Resume', icon: FileEdit },
                { step: 2, label: 'Review & Edit', icon: Eye },
                { step: 3, label: 'Apply', icon: Send }
              ].map(({ step, label, icon: Icon }) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center gap-2 ${applyStep >= step ? 'text-violet-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      applyStep >= step ? 'bg-violet-100' : 'bg-slate-100'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{label}</span>
                  </div>
                  {step < 3 && (
                    <ChevronRight className="w-5 h-5 mx-2 text-slate-300" />
                  )}
                </div>
              ))}
            </div>

            {applyStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Select Resume</Label>
                  {resumes.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-amber-200 rounded-lg bg-amber-50 mt-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">No resumes found</span>
                      </div>
                      <p className="text-sm text-amber-600 mt-1">
                        Please upload a resume first from the &quot;My Resumes&quot; page.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 border-amber-300 text-amber-700"
                        onClick={() => {
                          setShowApplyDialog(false);
                          navigate('/resumes');
                        }}
                      >
                        Go to My Resumes
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={applicationForm.resume_id}
                      onValueChange={(value) => setApplicationForm(prev => ({ ...prev, resume_id: value }))}
                    >
                      <SelectTrigger data-testid="select-resume" className="mt-2">
                        <SelectValue placeholder="Choose a resume" />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes.map((resume) => (
                          <SelectItem key={resume.resume_id || resume.id} value={resume.resume_id || resume.id}>
                            <div className="flex items-center gap-2">
                              <span>{resume.name || resume.file_name || resume.filename || 'Resume'}</span>
                              {resume.is_master && (
                                <Badge className="bg-violet-100 text-violet-700 text-xs">Master</Badge>
                              )}
                              {resume.is_variant && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">Variant</Badge>
                              )}
                              {resume.is_primary && !resume.is_master && !resume.is_variant && (
                                <Badge className="bg-green-100 text-green-700 text-xs">Primary</Badge>
                              )}
                              {resume.analysis?.score && (
                                <Badge variant="outline" className="text-xs">
                                  ATS: {resume.analysis.score}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>AI Instructions (Optional)</Label>
                  <Textarea
                    placeholder="E.g., Emphasize my leadership experience, highlight Python skills, focus on remote work experience..."
                    value={aiCommand}
                    onChange={(e) => setAiCommand(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="ai-command-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Tell the AI how to tailor your resume for this specific job
                  </p>
                </div>

                <Button
                  onClick={handleTailorResume}
                  disabled={!applicationForm.resume_id || isTailoring}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  data-testid="tailor-resume-btn"
                >
                  {isTailoring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Tailoring Resume...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Tailor Resume with AI
                    </>
                  )}
                </Button>
              </div>
            )}

            {applyStep === 2 && (
              <div className="space-y-4">
                {extractedKeywords && (
                  <div className="p-3 bg-violet-50 rounded-lg">
                    <Label className="text-violet-700">Keywords Extracted</Label>
                    <p className="text-sm text-violet-600 mt-1">{extractedKeywords}</p>
                  </div>
                )}

                {tailoredVersions.length > 0 && (
                  <div>
                    <Label>Resume Version</Label>
                    <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Tailored</SelectItem>
                        {tailoredVersions.map((v, i) => (
                          <SelectItem key={i} value={`version_${i}`}>
                            {v.title || `Version ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Tailored Resume</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(tailoredContent)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-lg p-3 bg-slate-50">
                    <pre className="text-sm whitespace-pre-wrap">{tailoredContent}</pre>
                  </ScrollArea>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Cover Letter</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateCoverLetter}
                      disabled={isGeneratingCover}
                      data-testid="generate-cover-letter-btn"
                    >
                      {isGeneratingCover ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      Generate
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Cover letter will appear here..."
                    value={applicationForm.cover_letter}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, cover_letter: e.target.value }))}
                    className="min-h-[150px]"
                    data-testid="cover-letter-input"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setApplyStep(1)}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setApplyStep(3)}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    data-testid="proceed-to-apply-btn"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {applyStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Ready to Apply!</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Your tailored resume and cover letter are ready. Click submit to save the application.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Position</div>
                    <div className="font-medium">{selectedJob?.title}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Company</div>
                    <div className="font-medium">{selectedJob?.company}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setApplyStep(2)}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitApplication}
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                    data-testid="submit-application-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Save & Apply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Auto Apply Settings Dialog */}
        <Dialog open={showAutoApplyDialog} onOpenChange={setShowAutoApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-500" />
                Auto-Apply Settings
              </DialogTitle>
              <DialogDescription>
                Configure how the AI agent applies to jobs
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <Label>Default Resume</Label>
                {resumes.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center bg-slate-50">
                    <div className="text-slate-500">
                      <span className="font-medium">No resumes found</span>
                      <p className="text-sm mt-1">
                        Please upload a resume first from the "My Resumes" page.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate('/resumes')}
                    >
                      Go to My Resumes
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={autoApplySettings.resume_id || ''}
                    onValueChange={(value) => setAutoApplySettings(prev => ({ ...prev, resume_id: value }))}
                  >
                    <SelectTrigger data-testid="default-resume-select">
                      <SelectValue placeholder="Select a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Build all options as a flat array
                        const allOptions = [];
                        
                        resumes.forEach((resume) => {
                          const resumeId = resume.resume_id || resume.id;
                          const resumeName = resume.name || resume.file_name || resume.filename || 'Resume';
                          
                          // Primary/Original Resume Option
                          allOptions.push(
                            <SelectItem key={resumeId} value={resumeId}>
                              {resumeName} {resume.is_primary ? '(Primary)' : ''} {resume.analysis?.score ? `- ATS: ${resume.analysis.score}` : ''}
                            </SelectItem>
                          );
                          
                          // Master Resume Option (if exists)
                          if (resume.master_resume) {
                            allOptions.push(
                              <SelectItem key={`${resumeId}_master`} value={`${resumeId}_master`}>
                                {resumeName} - Master (Enhanced)
                              </SelectItem>
                            );
                          }
                          
                          // Title Versions (if exist)
                          if (resume.title_versions && resume.title_versions.length > 0) {
                            resume.title_versions.forEach((version, idx) => {
                              allOptions.push(
                                <SelectItem key={`${resumeId}_variant_${idx}`} value={`${resumeId}_variant_${idx}`}>
                                  {version.name || version.job_title} (Variant)
                                </SelectItem>
                              );
                            });
                          }
                        });
                        
                        return allOptions;
                      })()}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Job Keywords</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button onClick={addKeyword} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {autoApplySettings.job_keywords.map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeKeyword(keyword)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Preferred Locations</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Add location..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  />
                  <Button onClick={addLocation} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {autoApplySettings.locations.map((location, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {location}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeLocation(location)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Max Applications Per Day: {autoApplySettings.max_applications_per_day}</Label>
                <Input
                  type="range"
                  min={1}
                  max={25}
                  value={autoApplySettings.max_applications_per_day}
                  onChange={(e) => setAutoApplySettings(prev => ({
                    ...prev,
                    max_applications_per_day: parseInt(e.target.value)
                  }))}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>25</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Auto-Submit Toggle - Most Important */}
                <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <div>
                    <div className="font-medium text-violet-800">Auto-Submit to Job Portals</div>
                    <div className="text-sm text-violet-600">Automatically fill forms and submit applications</div>
                  </div>
                  <Switch
                    checked={autoApplySettings.auto_submit_enabled !== false}
                    onCheckedChange={(checked) => setAutoApplySettings(prev => ({
                      ...prev,
                      auto_submit_enabled: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto-Tailor Resume</div>
                    <div className="text-sm text-slate-500">AI tailors resume for each job</div>
                  </div>
                  <Switch
                    checked={autoApplySettings.auto_tailor_resume}
                    onCheckedChange={(checked) => setAutoApplySettings(prev => ({
                      ...prev,
                      auto_tailor_resume: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Generate Cover Letters</div>
                    <div className="text-sm text-slate-500">AI creates custom cover letters</div>
                  </div>
                  <Switch
                    checked={autoApplySettings.generate_cover_letter}
                    onCheckedChange={(checked) => setAutoApplySettings(prev => ({
                      ...prev,
                      generate_cover_letter: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Schedule Auto-Apply</div>
                    <div className="text-sm text-slate-500">
                      {autoApplySettings.schedule_frequency === '1h' ? 'Runs every hour' :
                       autoApplySettings.schedule_frequency === '6h' ? 'Runs every 6 hours' :
                       autoApplySettings.schedule_frequency === '12h' ? 'Runs every 12 hours' :
                       'Runs once daily at 12:00 PM UTC'}
                    </div>
                  </div>
                  <Switch
                    checked={autoApplySettings.schedule_enabled}
                    onCheckedChange={(checked) => setAutoApplySettings(prev => ({
                      ...prev,
                      schedule_enabled: checked
                    }))}
                  />
                </div>
              </div>

              {autoApplySettings.schedule_enabled && (
                <div className="space-y-4">
                  <div>
                    <Label>Run Frequency</Label>
                    <Select
                      value={autoApplySettings.schedule_frequency || 'daily'}
                      onValueChange={(value) => setAutoApplySettings(prev => ({
                        ...prev,
                        schedule_frequency: value
                      }))}
                    >
                      <SelectTrigger data-testid="schedule-frequency-select">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-violet-500" />
                            <span>Every hour</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="6h">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>Every 6 hours</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="12h">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            <span>Every 12 hours</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="daily">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span>Once daily (12:00 PM UTC)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose how often the auto-apply should run
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAutoFillSettings}
                  className="flex-1"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Auto-Fill from Profile
                </Button>
                <Button
                  onClick={handleSaveAutoApplySettings}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-violet-500" />
                Auto-Apply History
              </DialogTitle>
              <DialogDescription>
                Recent applications created by the AI agent
              </DialogDescription>
            </DialogHeader>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="text-lg font-bold text-green-600">
                  {autoApplyHistory.filter(a => a.status === 'submitted' || a.status === 'applied').length}
                </div>
                <div className="text-xs text-green-600">Submitted</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                <div className="text-lg font-bold text-red-600">
                  {autoApplyHistory.filter(a => a.status === 'failed' || a.status === 'submission_failed').length}
                </div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-600">
                  {autoApplyHistory.filter(a => a.status === 'ready_to_apply' || a.status === 'pending').length}
                </div>
                <div className="text-xs text-blue-600">Pending</div>
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              {autoApplyHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No applications yet. Run auto-apply to get started!
                </div>
              ) : (
                <div className="space-y-3">
                  {autoApplyHistory.map((app, i) => (
                    <Card key={i} className={`border-slate-200 ${
                      app.status === 'failed' || app.status === 'submission_failed' ? 'border-red-200 bg-red-50/30' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{app.job_title}</div>
                            <div className="text-sm text-slate-500">{app.company}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">
                                {formatDate(app.created_at)}
                              </span>
                              {/* Submission Method Badge */}
                              {app.submitted_by && (
                                <Badge variant="outline" className="text-xs">
                                  {app.submitted_by === 'system' || app.submitted_by === 'auto' ? (
                                    <><Bot className="w-3 h-3 mr-1" />Auto</>
                                  ) : (
                                    <><User className="w-3 h-3 mr-1" />Manual</>
                                  )}
                                </Badge>
                              )}
                              {app.source && (
                                <Badge variant="secondary" className="text-xs">
                                  {app.source}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={
                              app.status === 'submitted' || app.status === 'applied' ? 'bg-green-100 text-green-700' :
                              app.status === 'ready_to_apply' || app.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                              app.status === 'failed' || app.status === 'submission_failed' ? 'bg-red-100 text-red-700' :
                              app.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-700'
                            }>
                              {app.status === 'submission_failed' ? 'Failed' : app.status}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {app.tailored_resume && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewingResumeApp(app)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Resume
                            </Button>
                          )}
                          
                          {/* Manual Submit button for failed/pending applications */}
                          {(app.status === 'failed' || app.status === 'submission_failed' || app.status === 'ready_to_apply' || app.status === 'pending') && app.job_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-violet-600 border-violet-200 hover:bg-violet-50"
                              onClick={() => window.open(app.job_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Apply Manually
                            </Button>
                          )}
                        </div>
                        
                        {/* Error message for failed applications */}
                        {(app.status === 'failed' || app.status === 'submission_failed') && app.error_message && (
                          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-600">
                            {app.error_message}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Profile Warning Dialog */}
        <Dialog open={showProfileWarning} onOpenChange={setShowProfileWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Complete Your Profile
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-600">
                Your profile is {profileCompleteness?.percentage}% complete. For best results with auto-apply, 
                please complete at least 80% of your profile.
              </p>
              {profileCompleteness?.missing_fields && (
                <div>
                  <Label className="text-sm text-slate-500">Missing fields:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileCompleteness.missing_fields.map((field, i) => (
                      <Badge key={i} variant="outline">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowProfileWarning(false)}
                  className="flex-1"
                >
                  Later
                </Button>
                <Button
                  onClick={() => {
                    setShowProfileWarning(false);
                    navigate('/profile');
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  Complete Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog for viewing resume in history */}
        <Dialog open={!!viewingResumeApp} onOpenChange={() => setViewingResumeApp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Resume for {viewingResumeApp?.job_title}
              </DialogTitle>
              <DialogDescription>
                {viewingResumeApp?.company}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] border rounded-lg p-4 bg-slate-50">
              <pre className="text-sm whitespace-pre-wrap">
                {viewingResumeApp?.tailored_resume}
              </pre>
            </ScrollArea>
            <Button
              onClick={() => copyToClipboard(viewingResumeApp?.tailored_resume)}
              variant="outline"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

export default LiveJobsCore;
