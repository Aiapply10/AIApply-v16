import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { resumeAPI, applicationAPI, coverLetterAPI, autoApplyAPI, authAPI } from '../lib/api';
import { useAuthStore } from '../store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  RefreshCw,
  FileEdit,
  Target,
  Zap,
  Play,
  Settings,
  History,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Bot,
  AlertTriangle,
  ChevronRight,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

// API functions for Live Jobs 2
const liveJobs2API = {
  search: (query, location, employmentType, page = 1) => 
    api.get('/live-jobs-2/search', { 
      params: { query, location, employment_type: employmentType, page } 
    }),
  getRecommendations: () => api.get('/live-jobs-2/recommendations'),
  getDetails: (jobId) => api.get(`/live-jobs-2/${jobId}`),
};

export function LiveJobs2Page() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showTailorDialog, setShowTailorDialog] = useState(false);
  const [showAutoApplyDialog, setShowAutoApplyDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [isRunningAutoApply, setIsRunningAutoApply] = useState(false);
  const [tailoredContent, setTailoredContent] = useState('');
  const [tailoredVersions, setTailoredVersions] = useState([]);
  const [extractedKeywords, setExtractedKeywords] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('default');
  const [activeTab, setActiveTab] = useState('recommendations');
  const [profileCompleteness, setProfileCompleteness] = useState(null);
  
  // Auto-apply state
  const [autoApplyStatus, setAutoApplyStatus] = useState(null);
  const [autoApplySettings, setAutoApplySettings] = useState({
    enabled: false,
    resume_id: '',
    job_keywords: [],
    locations: ['United States'],
    employment_types: ['FULL_TIME'],
    max_applications_per_day: 10,
    auto_tailor_resume: true
  });
  const [autoApplyHistory, setAutoApplyHistory] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const [searchForm, setSearchForm] = useState({
    query: '',
    location: 'United States',
    employment_type: '',
  });

  const [applicationForm, setApplicationForm] = useState({
    resume_id: '',
    cover_letter: '',
  });

  const [tailorForm, setTailorForm] = useState({
    resume_id: '',
    generateVersions: false,
  });

  useEffect(() => {
    loadInitialData();
    loadAutoApplyStatus();
    loadProfileCompleteness();
  }, []);

  const loadProfileCompleteness = async () => {
    try {
      const res = await authAPI.getProfileCompleteness();
      setProfileCompleteness(res.data);
    } catch (error) {
      console.error('Error loading profile completeness:', error);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [recsRes, resumesRes] = await Promise.all([
        liveJobs2API.getRecommendations(),
        resumeAPI.getAll()
      ]);
      setRecommendations(recsRes.data.recommendations || []);
      setResumes(resumesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load job recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAutoApplyStatus = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        autoApplyAPI.getStatus(),
        autoApplyAPI.getSettings()
      ]);
      setAutoApplyStatus(statusRes.data);
      setAutoApplySettings(settingsRes.data);
    } catch (error) {
      console.error('Error loading auto-apply status:', error);
    }
  };

  const loadAutoApplyHistory = async () => {
    try {
      const res = await autoApplyAPI.getHistory(50);
      setAutoApplyHistory(res.data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    setIsSearching(true);
    try {
      const response = await liveJobs2API.search(
        searchForm.query || null,
        searchForm.location || 'United States',
        searchForm.employment_type || null,
        1
      );
      setJobs(response.data.jobs || []);
      setActiveTab('search');
      toast.success(`Found ${response.data.total} jobs`);
    } catch (error) {
      console.error('Error searching jobs:', error);
      toast.error('Failed to search jobs');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRunAutoApply = async () => {
    if (!autoApplySettings.resume_id) {
      toast.error('Please select a resume in auto-apply settings');
      return;
    }
    
    if (!autoApplySettings.enabled) {
      toast.error('Please enable auto-apply first');
      return;
    }

    setIsRunningAutoApply(true);
    try {
      const response = await autoApplyAPI.run();
      toast.success(response.data.message);
      loadAutoApplyStatus();
      loadAutoApplyHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run auto-apply');
    } finally {
      setIsRunningAutoApply(false);
    }
  };

  const handleSaveAutoApplySettings = async () => {
    try {
      await autoApplyAPI.updateSettings(autoApplySettings);
      toast.success('Auto-apply settings saved');
      loadAutoApplyStatus();
      setShowAutoApplyDialog(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleToggleAutoApply = async () => {
    try {
      const res = await autoApplyAPI.toggle();
      setAutoApplySettings({ ...autoApplySettings, enabled: res.data.enabled });
      setAutoApplyStatus({ ...autoApplyStatus, enabled: res.data.enabled });
      toast.success(res.data.message);
    } catch (error) {
      toast.error('Failed to toggle auto-apply');
    }
  };

  const addKeyword = () => {
    if (newKeyword && !autoApplySettings.job_keywords.includes(newKeyword)) {
      setAutoApplySettings({
        ...autoApplySettings,
        job_keywords: [...autoApplySettings.job_keywords, newKeyword]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setAutoApplySettings({
      ...autoApplySettings,
      job_keywords: autoApplySettings.job_keywords.filter(k => k !== keyword)
    });
  };

  const addLocation = () => {
    if (newLocation && !autoApplySettings.locations.includes(newLocation)) {
      setAutoApplySettings({
        ...autoApplySettings,
        locations: [...autoApplySettings.locations, newLocation]
      });
      setNewLocation('');
    }
  };

  const removeLocation = (location) => {
    setAutoApplySettings({
      ...autoApplySettings,
      locations: autoApplySettings.locations.filter(l => l !== location)
    });
  };

  const handleApply = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume');
      return;
    }

    setIsSubmitting(true);
    try {
      await applicationAPI.create({
        job_portal_id: 'live_job_2',
        job_title: selectedJob.title,
        job_description: selectedJob.full_description || selectedJob.description,
        company_name: selectedJob.company,
        resume_id: applicationForm.resume_id,
        cover_letter: applicationForm.cover_letter,
      });
      
      toast.success('Application recorded! Opening job application page...');
      
      if (selectedJob.apply_link) {
        window.open(selectedJob.apply_link, '_blank');
      }
      
      setShowApplyDialog(false);
      setApplicationForm({ resume_id: '', cover_letter: '' });
    } catch (error) {
      toast.error('Failed to record application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume first');
      return;
    }

    setIsGeneratingCover(true);
    try {
      const response = await coverLetterAPI.generate({
        resume_id: applicationForm.resume_id,
        job_title: selectedJob.title,
        company_name: selectedJob.company,
        job_description: selectedJob.full_description || selectedJob.description || '',
      });
      setApplicationForm({ ...applicationForm, cover_letter: response.data.cover_letter });
      toast.success('Cover letter generated!');
    } catch (error) {
      toast.error('Failed to generate cover letter');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleTailorResume = async () => {
    if (!tailorForm.resume_id) {
      toast.error('Please select a resume to tailor');
      return;
    }

    setIsTailoring(true);
    setTailoredContent('');
    setTailoredVersions([]);
    setExtractedKeywords('');
    
    try {
      const response = await resumeAPI.tailor({
        resume_id: tailorForm.resume_id,
        job_title: selectedJob.title,
        job_description: selectedJob.full_description || selectedJob.description || '',
        technologies: selectedJob.required_skills || [user?.primary_technology || 'Software Development'],
        generate_versions: tailorForm.generateVersions || false,
        ats_optimize: true,
      });
      
      let content = response.data.tailored_content;
      if (typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
      }
      content = content || 'No content generated. Please try again.';
      
      setTailoredContent(content);
      
      if (response.data.keywords) {
        setExtractedKeywords(response.data.keywords);
      }
      
      if (response.data.versions && response.data.versions.length > 0) {
        setTailoredVersions(response.data.versions);
      }
      
      toast.success('Resume tailored with ATS optimization!');
    } catch (error) {
      console.error('Error tailoring resume:', error);
      toast.error('Failed to tailor resume. Please try again.');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleDownloadTailoredResume = async (format, versionName = 'default') => {
    if (!tailorForm.resume_id) return;
    
    try {
      let response;
      if (format === 'docx') {
        response = await resumeAPI.generateWord(tailorForm.resume_id, versionName);
      } else {
        response = await resumeAPI.download(tailorForm.resume_id, format);
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const versionSuffix = versionName !== 'default' ? `_${versionName.replace(/\s+/g, '_')}` : '';
      link.setAttribute('download', `tailored_resume_${selectedJob.title.replace(/[^a-zA-Z0-9]/g, '_')}${versionSuffix}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Resume downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to download resume as ${format.toUpperCase()}`);
    }
  };

  const formatSalary = (min, max, currency, period) => {
    if (!min && !max) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    });
    let salary = '';
    if (min && max) {
      salary = `${formatter.format(min)} - ${formatter.format(max)}`;
    } else {
      salary = formatter.format(min || max);
    }
    if (period) {
      salary += `/${period.toLowerCase()}`;
    }
    return salary;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const JobCard = ({ job, showMatchedTech = false }) => (
    <Card className="hover:shadow-xl transition-all duration-300 group bg-white border-slate-200 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="shrink-0">
            {job.company_logo ? (
              <img 
                src={job.company_logo} 
                alt={job.company}
                className="w-14 h-14 rounded-xl object-contain bg-slate-50 p-1 border border-slate-100"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 items-center justify-center ${job.company_logo ? 'hidden' : 'flex'}`}
            >
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-violet-600 transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-slate-600">{job.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {showMatchedTech && job.matched_technology && (
                  <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 shadow-sm">
                    <Zap className="w-3 h-3 mr-1" />
                    {job.matched_technology}
                  </Badge>
                )}
                {job.source && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Globe className="w-3 h-3 mr-1" />
                    {job.source}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {job.location || job.country}
                </span>
              )}
              {job.is_remote && (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Globe className="w-3 h-3 mr-1" />
                  Remote
                </Badge>
              )}
              {job.employment_type && (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                  {job.employment_type}
                </Badge>
              )}
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period) && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <DollarSign className="w-4 h-4" />
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
                </span>
              )}
              {job.posted_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {formatDate(job.posted_at)}
                </span>
              )}
            </div>

            {job.description && (
              <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                {job.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
                onClick={() => {
                  setSelectedJob(job);
                  setTailorForm({ resume_id: '' });
                  setTailoredContent('');
                  setShowTailorDialog(true);
                }}
              >
                <FileEdit className="w-4 h-4 mr-1" />
                AI Tailor Resume
              </Button>
              <Button 
                size="sm"
                className="bg-slate-800 hover:bg-slate-900 text-white"
                onClick={() => {
                  setSelectedJob(job);
                  setShowApplyDialog(true);
                }}
              >
                <Send className="w-4 h-4 mr-1" />
                Apply Now
              </Button>
              {job.apply_link && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                  onClick={() => window.open(job.apply_link, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View Original
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="live-jobs-2-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3 text-slate-800">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
              Live Jobs 2
            </h1>
            <p className="text-slate-600 mt-2">
              LinkedIn jobs with AI-powered auto-apply
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={loadInitialData}
              disabled={isLoading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Auto-Apply Control Panel */}
        <Card className="border-2 border-violet-200 bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    Auto-Apply AI Agent
                    {autoApplyStatus?.enabled && (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Automatically tailor your resume and apply to matching jobs daily
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoApplyStatus?.enabled || false}
                  onCheckedChange={handleToggleAutoApply}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm">
                <p className="text-sm text-slate-500">Today's Applications</p>
                <p className="text-2xl font-bold text-violet-600">
                  {autoApplyStatus?.today_applications || 0} / {autoApplyStatus?.max_daily || 10}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
                <p className="text-sm text-slate-500">Remaining Today</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {autoApplyStatus?.remaining || 10}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <p className="text-sm text-slate-500">Total Applications</p>
                <p className="text-2xl font-bold text-blue-600">
                  {autoApplyStatus?.total_applications || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-500">Last Run</p>
                <p className="text-sm font-semibold text-slate-700">
                  {autoApplyStatus?.last_run 
                    ? formatDate(autoApplyStatus.last_run)
                    : 'Never'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleRunAutoApply}
                disabled={isRunningAutoApply || !autoApplyStatus?.enabled || !autoApplyStatus?.configured}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30"
              >
                {isRunningAutoApply ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Auto-Apply...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Run Auto-Apply Now
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAutoApplyDialog(true)}
                className="border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  loadAutoApplyHistory();
                  setShowHistoryDialog(true);
                }}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
            
            {!autoApplyStatus?.configured && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Please configure auto-apply settings and select a resume to enable automatic applications.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Form */}
        <Card className="bg-white border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-slate-600" />
              </div>
              Search Jobs
            </CardTitle>
            <CardDescription className="text-slate-500">
              Search across LinkedIn job listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Job Title / Keywords</Label>
                  <Input
                    placeholder={`e.g., ${user?.primary_technology || 'React'} Developer`}
                    value={searchForm.query}
                    onChange={(e) => setSearchForm({ ...searchForm, query: e.target.value })}
                    className="border-slate-200 focus:border-violet-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Location</Label>
                  <Input
                    placeholder="e.g., New York, Remote"
                    value={searchForm.location}
                    onChange={(e) => setSearchForm({ ...searchForm, location: e.target.value })}
                    className="border-slate-200 focus:border-violet-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Employment Type</Label>
                  <Select
                    value={searchForm.employment_type || "all"}
                    onValueChange={(value) => setSearchForm({ ...searchForm, employment_type: value === "all" ? "" : value })}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="FULLTIME">Full Time</SelectItem>
                      <SelectItem value="PARTTIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contract</SelectItem>
                      <SelectItem value="INTERN">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSearching}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search Jobs
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Job Listings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="recommendations" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Zap className="w-4 h-4" />
              Recommended ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Search className="w-4 h-4" />
              Search Results ({jobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="mt-6">
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-violet-50 p-3 rounded-lg border border-violet-100">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <span>Based on your skills: <strong className="text-violet-700">{user?.primary_technology}</strong></span>
                  {user?.sub_technologies?.length > 0 && <span>, {user.sub_technologies.join(', ')}</span>}
                </div>
                {recommendations.map((job) => (
                  <JobCard key={job.job_id} job={job} showMatchedTech />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2 text-slate-800">No Recommendations Yet</h3>
                  <p className="text-slate-500 text-center max-w-md">
                    Update your profile with your primary technology and skills to get personalized job recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            {jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.job_id} job={job} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2 text-slate-800">No Search Results</h3>
                  <p className="text-slate-500 text-center max-w-md">
                    Use the search form above to find jobs from LinkedIn.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Auto-Apply Settings Dialog */}
        <Dialog open={showAutoApplyDialog} onOpenChange={setShowAutoApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-500" />
                Auto-Apply Settings
              </DialogTitle>
              <DialogDescription>
                Configure your automated job application preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Resume Selection */}
              <div className="space-y-2">
                <Label>Select Resume for Auto-Apply *</Label>
                <Select
                  value={autoApplySettings.resume_id}
                  onValueChange={(value) => setAutoApplySettings({ ...autoApplySettings, resume_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.resume_id} value={resume.resume_id}>
                        {resume.file_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Keywords */}
              <div className="space-y-2">
                <Label>Job Title Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Python Developer"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {autoApplySettings.job_keywords?.map((keyword) => (
                    <Badge 
                      key={keyword} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., United States, Remote"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  />
                  <Button type="button" onClick={addLocation} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {autoApplySettings.locations?.map((location) => (
                    <Badge 
                      key={location} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeLocation(location)}
                    >
                      {location} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Employment Types */}
              <div className="space-y-2">
                <Label>Employment Types</Label>
                <div className="flex flex-wrap gap-4">
                  {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={autoApplySettings.employment_types?.includes(type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAutoApplySettings({
                              ...autoApplySettings,
                              employment_types: [...(autoApplySettings.employment_types || []), type]
                            });
                          } else {
                            setAutoApplySettings({
                              ...autoApplySettings,
                              employment_types: autoApplySettings.employment_types?.filter(t => t !== type)
                            });
                          }
                        }}
                      />
                      <label htmlFor={type} className="text-sm">{type.replace('_', ' ')}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Max Applications */}
              <div className="space-y-2">
                <Label>Max Applications Per Day</Label>
                <Select
                  value={String(autoApplySettings.max_applications_per_day || 10)}
                  onValueChange={(value) => setAutoApplySettings({ ...autoApplySettings, max_applications_per_day: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 jobs/day</SelectItem>
                    <SelectItem value="10">10 jobs/day</SelectItem>
                    <SelectItem value="15">15 jobs/day</SelectItem>
                    <SelectItem value="20">20 jobs/day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Tailor Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Auto-Tailor Resume</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically optimize resume for each job with ATS keywords
                  </p>
                </div>
                <Switch
                  checked={autoApplySettings.auto_tailor_resume}
                  onCheckedChange={(checked) => setAutoApplySettings({ ...autoApplySettings, auto_tailor_resume: checked })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowAutoApplyDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600"
                  onClick={handleSaveAutoApplySettings}
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
                <History className="w-5 h-5 text-cyan-500" />
                Auto-Apply History
              </DialogTitle>
              <DialogDescription>
                View your automatically processed job applications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {autoApplyHistory.length > 0 ? (
                autoApplyHistory.map((app) => (
                  <Card key={app.application_id} className="border-cyan-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{app.job_title}</h4>
                          <p className="text-sm text-muted-foreground">{app.company}</p>
                          <p className="text-xs text-muted-foreground mt-1">{app.location}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={app.status === 'ready_to_apply' ? 'default' : 'secondary'}>
                            {app.status === 'ready_to_apply' ? 'Ready' : app.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(app.applied_at)}
                          </p>
                        </div>
                      </div>
                      {app.apply_link && (
                        <Button 
                          size="sm" 
                          className="mt-3"
                          onClick={() => window.open(app.apply_link, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Complete Application
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No auto-apply history yet. Run auto-apply to get started!
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Apply Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply to {selectedJob?.title}</DialogTitle>
              <DialogDescription>at {selectedJob?.company}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Resume *</Label>
                <Select
                  value={applicationForm.resume_id}
                  onValueChange={(value) => setApplicationForm({ ...applicationForm, resume_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.resume_id} value={resume.resume_id}>
                        {resume.file_name}
                        {resume.tailored_content && ' (AI Tailored)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cover Letter (Optional)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCover || !applicationForm.resume_id}
                  >
                    {isGeneratingCover ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea
                  placeholder="Write your cover letter or generate one with AI..."
                  rows={8}
                  value={applicationForm.cover_letter}
                  onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowApplyDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600"
                  onClick={handleApply}
                  disabled={isSubmitting || !applicationForm.resume_id}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Apply & Open Job Page
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tailor Dialog - keeping it simple for brevity */}
        <Dialog open={showTailorDialog} onOpenChange={setShowTailorDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-cyan-500" />
                AI Resume Tailor
              </DialogTitle>
              <DialogDescription>
                Optimize your resume for: {selectedJob?.title} at {selectedJob?.company}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Resume to Tailor *</Label>
                <Select
                  value={tailorForm.resume_id}
                  onValueChange={(value) => setTailorForm({ ...tailorForm, resume_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume to tailor" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.resume_id} value={resume.resume_id}>
                        {resume.file_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!tailoredContent && (
                <Button
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                  onClick={handleTailorResume}
                  disabled={isTailoring || !tailorForm.resume_id}
                >
                  {isTailoring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Optimizing for ATS & Keywords...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Tailor Resume with AI
                    </>
                  )}
                </Button>
              )}

              {tailoredContent && (
                <div className="space-y-4">
                  {extractedKeywords && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg">
                      <h4 className="font-medium text-cyan-400 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        ATS Keywords Incorporated
                      </h4>
                      <p className="text-xs text-cyan-300/80">{extractedKeywords}</p>
                    </div>
                  )}
                  
                  <div className="bg-muted p-4 rounded-lg max-h-[300px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{tailoredContent}</pre>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => handleDownloadTailoredResume('docx')}
                    >
                      Download Word
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowTailorDialog(false);
                        setShowApplyDialog(true);
                        setApplicationForm({ ...applicationForm, resume_id: tailorForm.resume_id });
                      }}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Continue to Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default LiveJobs2Page;
