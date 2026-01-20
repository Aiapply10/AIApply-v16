import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/DashboardLayout';
import { liveJobsAPI, resumeAPI, applicationAPI, coverLetterAPI, autoApplyAPI, authAPI } from '../lib/api';
import { useAuthStore } from '../store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
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
  Bookmark,
  Filter,
  RefreshCw,
  FileEdit,
  Target,
  AlertTriangle,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Download,
  FileText,
  Wand2,
  Copy,
  CheckCircle2,
  Bot,
  Rocket,
  Settings,
  History,
  AlertCircle,
  X,
  Plus,
  TrendingUp,
  Zap,
  Award,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem,
  HoverCard,
  AnimatedTooltip,
  AnimatedProgress,
  PulseBadge
} from '../components/ui/animations';

export function LiveJobsPage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showTailorDialog, setShowTailorDialog] = useState(false);
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
  
  // Step-by-step apply wizard state
  const [applyStep, setApplyStep] = useState(1);
  const [aiCommand, setAiCommand] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState({ type: '', content: '' });

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
    auto_tailor_resume: true
  });
  const [autoApplyHistory, setAutoApplyHistory] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Job Source Platforms - US Focused
  const JOB_SOURCES = [
    { value: 'all', label: 'All Platforms', icon: '🌐' },
    { value: 'indeed', label: 'Indeed', icon: '💼' },
    { value: 'linkedin', label: 'LinkedIn', icon: '🔗' },
    { value: 'glassdoor', label: 'Glassdoor', icon: '🏢' },
    { value: 'dice', label: 'Dice', icon: '🎲' },
    { value: 'remoteok', label: 'RemoteOK', icon: '🌍' },
    { value: 'ziprecruiter', label: 'ZipRecruiter', icon: '⚡' },
  ];

  const [searchForm, setSearchForm] = useState({
    query: '',
    location: 'United States',
    employment_types: [],  // Changed to array for multi-select
    remote_only: true,  // Default to remote jobs
    source: 'all',  // Platform filter
  });

  // Employment type options
  const EMPLOYMENT_TYPES = [
    { value: 'FULLTIME', label: 'Full Time' },
    { value: 'PARTTIME', label: 'Part Time' },
    { value: 'CONTRACTOR', label: 'Contract' },
    { value: 'C2C', label: 'C2C' },
    { value: 'W2', label: 'W2' },
  ];

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

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // First fetch user profile to ensure we have latest data including primary_technology
      const userRes = await authAPI.getMe();
      if (userRes.data) {
        updateUser(userRes.data);
      }
      
      const [recsRes, resumesRes] = await Promise.all([
        liveJobsAPI.getRecommendations(),
        resumeAPI.getAll()
      ]);
      setRecommendations(recsRes.data.recommendations || []);
      setResumes(resumesRes.data || []);
      
      // Handle API messages
      if (recsRes.data.message) {
        setApiMessage(recsRes.data.message);
      }
      if (recsRes.data.requires_profile_update) {
        setRequiresProfileUpdate(true);
      }
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
      if (settingsRes.data) {
        setAutoApplySettings(prev => ({ ...prev, ...settingsRes.data }));
      }
    } catch (error) {
      console.error('Error loading auto-apply status:', error);
    }
  };

  const loadProfileCompleteness = async () => {
    try {
      const res = await authAPI.getProfileCompleteness();
      setProfileCompleteness(res.data);
    } catch (error) {
      console.error('Error loading profile completeness:', error);
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

  const handleRunAutoApply = async () => {
    if (!profileCompleteness || profileCompleteness.percentage < 80) {
      setShowProfileWarning(true);
      return;
    }

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
    if (!autoApplyStatus?.enabled && (!profileCompleteness || profileCompleteness.percentage < 80)) {
      setShowProfileWarning(true);
      return;
    }

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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    setIsSearching(true);
    try {
      // Build location based on remote_only flag
      let searchLocation = searchForm.location || 'United States';
      if (searchForm.remote_only) {
        searchLocation = 'Remote, United States';
      }
      
      // Get the first employment type if multiple selected, or null
      const employmentType = searchForm.employment_types.length > 0 
        ? searchForm.employment_types[0] 
        : null;
      
      const response = await liveJobsAPI.search(
        searchForm.query || null,
        searchLocation,
        employmentType,
        1,
        searchForm.source !== 'all' ? searchForm.source : null
      );
      
      // Filter results based on employment types and remote flag
      let filteredJobs = response.data.jobs || [];
      
      // Filter by remote if enabled
      if (searchForm.remote_only) {
        filteredJobs = filteredJobs.filter(job => 
          job.location?.toLowerCase().includes('remote') ||
          job.title?.toLowerCase().includes('remote') ||
          job.description?.toLowerCase().includes('remote')
        );
      }
      
      setJobs(filteredJobs);
      setActiveTab('search');
      const sourceMsg = searchForm.source !== 'all' ? ` from ${searchForm.source}` : '';
      const remoteMsg = searchForm.remote_only ? ' (Remote only)' : '';
      toast.success(`Found ${filteredJobs.length} jobs${sourceMsg}${remoteMsg}`);
    } catch (error) {
      console.error('Error searching jobs:', error);
      toast.error('Failed to search jobs');
    } finally {
      setIsSearching(false);
    }
  };

  // Direct link to external job platforms
  const openPlatformSearch = (platform) => {
    const query = encodeURIComponent(searchForm.query || 'software developer');
    const location = encodeURIComponent(searchForm.location || 'United States');
    
    const platformUrls = {
      indeed: `https://www.indeed.com/jobs?q=${query}&l=${location}`,
      dice: `https://www.dice.com/jobs?q=${query}&location=${location}`,
      linkedin: `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${location}`,
      glassdoor: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${query}&locT=N&locId=1`,
      ziprecruiter: `https://www.ziprecruiter.com/Jobs/${query}`,
      monster: `https://www.monster.com/jobs/search?q=${query}&where=${location}`,
      careerbuilder: `https://www.careerbuilder.com/jobs?keywords=${query}&location=${location}`,
    };
    
    if (platformUrls[platform]) {
      window.open(platformUrls[platform], '_blank');
    }
  };

  const handleApply = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create application record
      await applicationAPI.create({
        job_portal_id: 'live_job',
        job_title: selectedJob.title,
        job_description: selectedJob.full_description || selectedJob.description,
        company_name: selectedJob.company,
        resume_id: applicationForm.resume_id,
        cover_letter: applicationForm.cover_letter,
        tailored_content: tailoredContent,
      });
      
      toast.success('Application recorded! Opening job application page...');
      
      // Open the apply link in a new tab
      if (selectedJob.apply_link) {
        window.open(selectedJob.apply_link, '_blank');
      }
      
      setShowApplyDialog(false);
      resetApplyWizard();
    } catch (error) {
      toast.error('Failed to record application');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset the apply wizard to initial state
  const resetApplyWizard = () => {
    setApplyStep(1);
    setApplicationForm({ resume_id: '', cover_letter: '' });
    setTailoredContent('');
    setExtractedKeywords('');
    setAiCommand('');
  };

  // Initialize AI Command when job is selected
  const initializeAiCommand = (job) => {
    const command = `You are an expert ATS resume optimizer. Transform my resume to match the following job requirements:

**Job Title:** ${job?.title || 'N/A'}
**Company:** ${job?.company || 'N/A'}
**Location:** ${job?.location || 'N/A'}

**Job Description:**
${job?.description || job?.full_description || 'N/A'}

**My Technologies/Skills:** ${user?.primary_technology || 'N/A'}${user?.sub_technologies?.length ? ', ' + user.sub_technologies.join(', ') : ''}

**Instructions:**
1. Highlight relevant experience that matches the job requirements
2. Incorporate keywords from the job description naturally
3. Ensure ATS-friendly formatting
4. Quantify achievements where possible
5. Focus on skills mentioned in the job posting`;
    
    setAiCommand(command);
  };

  // Open apply dialog with step 1
  const openApplyWizard = (job) => {
    setSelectedJob(job);
    initializeAiCommand(job);
    setApplyStep(1);
    setShowApplyDialog(true);
  };

  // Step 1: Generate tailored resume using AI command
  const handleStep1GenerateResume = async () => {
    if (!applicationForm.resume_id) {
      toast.error('Please select a resume first');
      return;
    }

    setIsTailoring(true);
    try {
      const response = await resumeAPI.tailor({
        resume_id: applicationForm.resume_id,
        job_title: selectedJob.title,
        job_description: selectedJob.full_description || selectedJob.description || '',
        company_name: selectedJob.company,
        custom_prompt: aiCommand,
      });
      
      setTailoredContent(response.data.tailored_content);
      setExtractedKeywords(response.data.keywords || '');
      toast.success('Resume tailored successfully!');
      setApplyStep(2);
    } catch (error) {
      console.error('Error tailoring resume:', error);
      toast.error('Failed to tailor resume');
    } finally {
      setIsTailoring(false);
    }
  };

  // Step 2: Confirm tailored resume and move to step 3
  const handleStep2Confirm = () => {
    if (!tailoredContent) {
      toast.error('Please generate a tailored resume first');
      return;
    }
    setApplyStep(3);
  };

  // Download tailored resume as Word document
  const handleDownloadWord = async () => {
    try {
      const response = await resumeAPI.generateWord(applicationForm.resume_id, {
        content: tailoredContent,
        filename: `${selectedJob?.title?.replace(/\s+/g, '_')}_Resume.docx`
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedJob?.title?.replace(/\s+/g, '_')}_Resume.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Resume downloaded!');
    } catch (error) {
      toast.error('Failed to download resume');
    }
  };

  // Preview content in modal
  const openPreview = (type, content) => {
    setPreviewContent({ type, content });
    setShowPreviewDialog(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
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
      
      // Handle different response formats
      let content = response.data.tailored_content;
      if (typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
      }
      content = content || 'No content generated. Please try again.';
      
      setTailoredContent(content);
      
      // Set extracted keywords
      if (response.data.keywords) {
        setExtractedKeywords(response.data.keywords);
      }
      
      // Set versions if available
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
        // Use the new generate-word endpoint
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

  const formatDateRelative = (dateString) => {
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

  // Source badge colors
  const getSourceStyle = (source) => {
    const styles = {
      'LinkedIn': 'bg-[#0077B5]/10 text-[#0077B5] border-[#0077B5]/30',
      'Indeed': 'bg-[#2557A7]/10 text-[#2557A7] border-[#2557A7]/30',
      'Dice': 'bg-pink-500/10 text-pink-500 border-pink-500/30',
      'RemoteOK': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      'Glassdoor': 'bg-green-600/10 text-green-600 border-green-600/30',
      'ZipRecruiter': 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    };
    return styles[source] || 'bg-blue-500/10 text-blue-500 border-blue-500/30';
  };

  // Note: JobCard is intentionally defined inside the component for access to parent scope functions
  // eslint-disable-next-line react/no-unstable-nested-components
  const JobCard = ({ job, showMatchedTech = false, index = 0 }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group"
      >
        <Card className={`relative overflow-hidden transition-all duration-300 border-slate-200/60 ${isHovered ? 'shadow-xl border-blue-300/50' : 'shadow-sm'}`}>
          {/* Animated gradient border on hover */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-indigo-500/0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Shimmer effect on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
            initial={{ x: '-100%' }}
            animate={{ x: isHovered ? '100%' : '-100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
          
          <CardContent className="p-6 relative">
            <div className="flex gap-4">
              {/* Company Logo with animation */}
              <motion.div 
                className="shrink-0"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {job.company_logo ? (
                  <img 
                    src={job.company_logo} 
                    alt={job.company}
                    className="w-14 h-14 rounded-xl object-contain bg-slate-50 p-1.5 border border-slate-100"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center shadow-lg ${job.company_logo ? 'hidden' : 'flex'}`}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </motion.div>

              {/* Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-lg text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {job.title}
                      </h3>
                      {job.is_remote && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700"
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          Remote
                        </motion.span>
                      )}
                    </div>
                    <p className="text-slate-600 font-medium">{job.company}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Save button */}
                    <AnimatedTooltip content={isSaved ? 'Saved' : 'Save job'}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSaved(!isSaved);
                          toast.success(isSaved ? 'Removed from saved' : 'Job saved!');
                        }}
                        className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </motion.button>
                    </AnimatedTooltip>
                    
                    {showMatchedTech && job.matched_technology && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-sm">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {job.matched_technology}
                        </Badge>
                      </motion.div>
                    )}
                    {job.source && (
                      <Badge variant="outline" className={getSourceStyle(job.source)}>
                        {job.source}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Meta Info with icons */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                  {job.location && (
                    <AnimatedTooltip content="Location">
                      <span className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {job.location || job.country}
                      </span>
                    </AnimatedTooltip>
                  )}
                  {job.employment_type && (
                    <AnimatedTooltip content="Employment type">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        <Briefcase className="w-3 h-3" />
                        {job.employment_type}
                      </span>
                    </AnimatedTooltip>
                  )}
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period) && (
                    <AnimatedTooltip content="Salary range">
                      <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
                      </span>
                    </AnimatedTooltip>
                  )}
                  {job.posted_at && (
                    <AnimatedTooltip content="Posted date">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-4 h-4" />
                        {formatDateRelative(job.posted_at)}
                      </span>
                    </AnimatedTooltip>
                  )}
                </div>

                {/* Description - shows more on hover */}
                <AnimatePresence>
                  {job.description && (
                    <motion.div 
                      className="mt-3 overflow-hidden"
                      initial={{ height: 48 }}
                      animate={{ height: isHovered ? 'auto' : 48 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className={`text-sm text-slate-500 ${isHovered ? '' : 'line-clamp-2'}`}>
                        {job.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions - enhanced */}
                <motion.div 
                  className="flex flex-wrap items-center gap-2 mt-4"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: isHovered ? 1 : 0.8 }}
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                      onClick={() => {
                        setSelectedJob(job);
                        setTailorForm({ resume_id: '' });
                        setTailoredContent('');
                        setShowTailorDialog(true);
                      }}
                      data-testid={`tailor-${job.job_id}`}
                    >
                      <Wand2 className="w-4 h-4 mr-1" />
                      AI Tailor Resume
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => openApplyWizard(job)}
                      data-testid={`apply-${job.job_id}`}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Apply Now
                    </Button>
                  </motion.div>
                  {job.apply_link && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-500 hover:text-slate-700"
                        onClick={() => window.open(job.apply_link, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Original
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-10 h-10 text-blue-500" />
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-8" data-testid="live-jobs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">Live Job Listings</h1>
            <p className="text-muted-foreground mt-1">
              Real-time opportunities from Indeed, Dice, RemoteOK & more
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={loadInitialData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Auto-Apply AI Agent Panel */}
        <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    Auto-Apply AI Agent
                    {profileCompleteness && profileCompleteness.percentage < 80 ? (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Profile Incomplete
                      </Badge>
                    ) : autoApplyStatus?.enabled ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : null}
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
                  disabled={profileCompleteness && profileCompleteness.percentage < 80}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm cursor-pointer"
              >
                <p className="text-sm text-slate-500">Today&apos;s Applications</p>
                <p className="text-2xl font-bold text-violet-600">
                  {autoApplyStatus?.today_applications || 0} / {autoApplyStatus?.max_daily || 10}
                </p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm cursor-pointer"
              >
                <p className="text-sm text-slate-500">Remaining Today</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {autoApplyStatus?.remaining || 10}
                </p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm cursor-pointer"
              >
                <p className="text-sm text-slate-500">Total Applications</p>
                <p className="text-2xl font-bold text-blue-600">
                  {autoApplyStatus?.total_applications || 0}
                </p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm cursor-pointer"
              >
                <p className="text-sm text-slate-500">Last Run</p>
                <p className="text-sm font-semibold text-slate-700">
                  {autoApplyStatus?.last_run 
                    ? formatDate(autoApplyStatus.last_run)
                    : 'Never'}
                </p>
              </motion.div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleRunAutoApply}
                disabled={isRunningAutoApply || (profileCompleteness && profileCompleteness.percentage < 80)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
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
                className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300"
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
                className="border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
              >
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
            
            {profileCompleteness && profileCompleteness.percentage < 80 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700">
                  Complete your profile to at least 80% to enable Auto-Apply. Current: {profileCompleteness.percentage}%
                </p>
              </div>
            )}
            
            {!autoApplyStatus?.configured && profileCompleteness && profileCompleteness.percentage >= 80 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700">
                  Please configure auto-apply settings and select a resume to enable automatic applications.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Jobs
            </CardTitle>
            <CardDescription>
              Search across multiple job platforms or leave empty to use your technology preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Job Title / Keywords</Label>
                  <Input
                    placeholder={`e.g., ${user?.primary_technology || 'React'} Developer`}
                    value={searchForm.query}
                    onChange={(e) => setSearchForm({ ...searchForm, query: e.target.value })}
                    data-testid="job-search-query"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location (US Only)</Label>
                  <Input
                    placeholder="e.g., New York, Remote"
                    value={searchForm.location}
                    onChange={(e) => setSearchForm({ ...searchForm, location: e.target.value })}
                    data-testid="job-search-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment Type (Multi-select)</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_TYPES.map((type) => (
                      <Badge
                        key={type.value}
                        variant={searchForm.employment_types.includes(type.value) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          searchForm.employment_types.includes(type.value)
                            ? 'bg-violet-600 hover:bg-violet-700'
                            : 'hover:bg-violet-100'
                        }`}
                        onClick={() => {
                          if (searchForm.employment_types.includes(type.value)) {
                            setSearchForm({
                              ...searchForm,
                              employment_types: searchForm.employment_types.filter(t => t !== type.value)
                            });
                          } else {
                            setSearchForm({
                              ...searchForm,
                              employment_types: [...searchForm.employment_types, type.value]
                            });
                          }
                        }}
                      >
                        {searchForm.employment_types.includes(type.value) && <Check className="w-3 h-3 mr-1" />}
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remote Jobs Only</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={searchForm.remote_only}
                      onCheckedChange={(checked) => setSearchForm({ ...searchForm, remote_only: checked })}
                    />
                    <span className="text-sm text-slate-600">
                      {searchForm.remote_only ? 'Yes - Remote jobs only' : 'No - All locations'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Job Platform</Label>
                  <Select
                    value={searchForm.source}
                    onValueChange={(value) => setSearchForm({ ...searchForm, source: value })}
                  >
                    <SelectTrigger data-testid="job-search-source">
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          <span className="flex items-center gap-2">
                            <span>{source.icon}</span>
                            {source.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Quick Platform Links */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Search directly on:</span>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => openPlatformSearch('indeed')}
                  className="h-7 text-xs"
                >
                  💼 Indeed
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => openPlatformSearch('dice')}
                  className="h-7 text-xs"
                >
                  🎲 Dice
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => openPlatformSearch('linkedin')}
                  className="h-7 text-xs"
                >
                  🔗 LinkedIn
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => openPlatformSearch('glassdoor')}
                  className="h-7 text-xs"
                >
                  🏢 Glassdoor
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => openPlatformSearch('ziprecruiter')}
                  className="h-7 text-xs"
                >
                  ⚡ ZipRecruiter
                </Button>
              </div>
              
              <Button type="submit" disabled={isSearching} data-testid="search-jobs-btn">
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
          <TabsList>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Recommended ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Results ({jobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="mt-6">
            {requiresProfileUpdate || !user?.primary_technology ? (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2 text-slate-800">Profile Update Required</h3>
                  <p className="text-slate-600 text-center max-w-md mb-4">
                    {apiMessage || "Please update your profile with Primary Technology and Skills to get personalized job recommendations."}
                  </p>
                  <Button 
                    onClick={() => navigate('/profile')}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Update Profile
                  </Button>
                </CardContent>
              </Card>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  Based on your skills: {user?.primary_technology}
                  {user?.sub_technologies?.length > 0 && `, ${user.sub_technologies.join(', ')}`}
                </div>
                {recommendations.map((job) => (
                  <JobCard key={job.job_id} job={job} showMatchedTech />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Briefcase className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="font-heading text-xl font-semibold mb-2">No Recommendations Available</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {apiMessage || "No jobs found matching your profile. Try searching manually or check back later."}
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
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="font-heading text-xl font-semibold mb-2">No Search Results</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Use the search form above to find jobs across LinkedIn, Indeed, Glassdoor, and more.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </PageTransition>

        {/* Step-by-Step Apply Wizard Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={(open) => {
          setShowApplyDialog(open);
          if (!open) resetApplyWizard();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-violet-500" />
                Apply to {selectedJob?.title}
              </DialogTitle>
              <DialogDescription>
                at {selectedJob?.company} • {selectedJob?.location}
              </DialogDescription>
            </DialogHeader>
            
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2 py-4 shrink-0">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    applyStep === step 
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' 
                      : applyStep > step 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {applyStep > step ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className={`text-sm font-medium ${applyStep >= step ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step === 1 ? 'AI Command' : step === 2 ? 'Review Resume' : 'Apply'}
                    </p>
                  </div>
                  {step < 3 && (
                    <ChevronRight className={`w-5 h-5 mx-3 ${applyStep > step ? 'text-green-500' : 'text-slate-300'}`} />
                  )}
                </div>
              ))}
            </div>

            <ScrollArea className="flex-1 px-1">
              <div className="space-y-4 py-4">
                {/* Step 1: AI Command Configuration */}
                {applyStep === 1 && (
                  <div className="space-y-4">
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                      <h4 className="font-semibold text-violet-800 flex items-center gap-2 mb-2">
                        <Wand2 className="w-4 h-4" />
                        Step 1: Configure AI Command
                      </h4>
                      <p className="text-sm text-violet-700">
                        The AI will use this command to tailor your resume for this specific job. You can customize it if needed.
                      </p>
                    </div>

                    {/* Resume Selection */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Select Your Resume *</Label>
                      <Select
                        value={applicationForm.resume_id}
                        onValueChange={(value) => setApplicationForm({ ...applicationForm, resume_id: value })}
                      >
                        <SelectTrigger data-testid="apply-resume-select">
                          <SelectValue placeholder="Choose a resume" />
                        </SelectTrigger>
                        <SelectContent>
                          {resumes.map((resume) => (
                            <SelectItem key={resume.resume_id} value={resume.resume_id}>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {resume.file_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {resumes.length === 0 && (
                        <p className="text-sm text-destructive">
                          No resumes uploaded. Please upload a resume first.
                        </p>
                      )}
                    </div>

                    {/* AI Command Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">AI Command (Editable)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(aiCommand)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <Textarea
                        value={aiCommand}
                        onChange={(e) => setAiCommand(e.target.value)}
                        rows={12}
                        className="font-mono text-sm bg-slate-900 text-green-400 border-slate-700"
                        placeholder="AI command will be generated based on job details..."
                      />
                      <p className="text-xs text-slate-500">
                        This command tells the AI how to tailor your resume. Modify it to emphasize specific skills or experiences.
                      </p>
                    </div>

                    {/* Job Summary */}
                    <div className="bg-slate-50 border rounded-lg p-4">
                      <h5 className="font-medium text-sm mb-2">Job Summary</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-slate-500">Title:</span> {selectedJob?.title}</div>
                        <div><span className="text-slate-500">Company:</span> {selectedJob?.company}</div>
                        <div><span className="text-slate-500">Location:</span> {selectedJob?.location}</div>
                        <div><span className="text-slate-500">Type:</span> {selectedJob?.employment_type || 'Full-time'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Review Tailored Resume */}
                {applyStep === 2 && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Step 2: Review AI-Tailored Resume
                      </h4>
                      <p className="text-sm text-green-700">
                        Review the AI-optimized resume below. This version is ATS-friendly and tailored for this specific job.
                      </p>
                    </div>

                    {/* Keywords Extracted */}
                    {extractedKeywords && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h5 className="font-medium text-amber-800 text-sm mb-2">Keywords Incorporated</h5>
                        <p className="text-sm text-amber-700">{extractedKeywords}</p>
                      </div>
                    )}

                    {/* Tailored Resume Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Tailored Resume (Editable)</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPreview('resume', tailoredContent)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadWord}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download Word
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={tailoredContent}
                        onChange={(e) => setTailoredContent(e.target.value)}
                        rows={15}
                        className="font-mono text-sm"
                        placeholder="Tailored resume content will appear here..."
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 text-sm mb-2">💡 Pro Tip</h5>
                      <p className="text-sm text-blue-700">
                        Download the Word document and save it for the application. You can make additional edits before submitting.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Add Cover Letter & Apply */}
                {applyStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-2">
                        <Send className="w-4 h-4" />
                        Step 3: Cover Letter & Apply
                      </h4>
                      <p className="text-sm text-purple-700">
                        Add a cover letter and review everything before applying. Your tailored resume is ready!
                      </p>
                    </div>

                    {/* Cover Letter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Cover Letter</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateCoverLetter}
                            disabled={isGeneratingCover}
                          >
                            {isGeneratingCover ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Generate with AI
                          </Button>
                          {applicationForm.cover_letter && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPreview('cover_letter', applicationForm.cover_letter)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          )}
                        </div>
                      </div>
                      <Textarea
                        placeholder="Write your cover letter or generate one with AI..."
                        rows={10}
                        value={applicationForm.cover_letter}
                        onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })}
                      />
                    </div>

                    {/* Application Summary */}
                    <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
                      <h5 className="font-semibold">Application Summary</h5>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-slate-500">Position</span>
                          <span className="font-medium">{selectedJob?.title}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-slate-500">Company</span>
                          <span className="font-medium">{selectedJob?.company}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-slate-500">Resume</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              AI Tailored ✓
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPreview('resume', tailoredContent)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-slate-500">Cover Letter</span>
                          <Badge variant={applicationForm.cover_letter ? 'secondary' : 'outline'}>
                            {applicationForm.cover_letter ? 'Added ✓' : 'Optional'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h5 className="font-medium text-amber-800 text-sm mb-2">What happens next?</h5>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Your application will be recorded in the Applications page</li>
                        <li>• The job posting will open in a new tab</li>
                        <li>• Upload your tailored resume on the employer&apos;s website</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4 border-t shrink-0">
              {applyStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setApplyStep(applyStep - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={() => {
                  setShowApplyDialog(false);
                  resetApplyWizard();
                }}
              >
                Cancel
              </Button>
              
              {applyStep === 1 && (
                <Button
                  className="bg-gradient-to-r from-violet-600 to-purple-600"
                  onClick={handleStep1GenerateResume}
                  disabled={isTailoring || !applicationForm.resume_id}
                >
                  {isTailoring ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Generate Tailored Resume
                </Button>
              )}
              
              {applyStep === 2 && (
                <Button
                  className="bg-gradient-to-r from-green-600 to-emerald-600"
                  onClick={handleStep2Confirm}
                >
                  Confirm & Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              
              {applyStep === 3 && (
                <Button
                  className="bg-gradient-to-r from-violet-600 to-purple-600"
                  onClick={handleApply}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Apply & Open Job Page
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-violet-500" />
                {previewContent.type === 'resume' ? 'Resume Preview' : 'Cover Letter Preview'}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4">
              <div className="bg-white border rounded-lg p-6 shadow-inner">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {previewContent.content}
                </pre>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => copyToClipboard(previewContent.content)}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button onClick={() => setShowPreviewDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Tailor Resume Dialog */}
        <Dialog open={showTailorDialog} onOpenChange={setShowTailorDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-violet-500" />
                AI Resume Tailor
              </DialogTitle>
              <DialogDescription>
                Optimize your resume for: <span className="font-semibold text-foreground">{selectedJob?.title}</span> at {selectedJob?.company}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Resume Selection */}
              <div className="space-y-2">
                <Label>Select Resume to Tailor *</Label>
                <Select
                  value={tailorForm.resume_id}
                  onValueChange={(value) => setTailorForm({ ...tailorForm, resume_id: value })}
                >
                  <SelectTrigger data-testid="tailor-resume-select">
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
                {resumes.length === 0 && (
                  <p className="text-sm text-destructive">
                    No resumes uploaded. Please upload a resume first from the My Resumes page.
                  </p>
                )}
              </div>

              {/* Job Details Preview */}
              <div className="bg-muted/50 p-4 rounded-lg border">
                <h4 className="font-medium mb-2 text-sm">Job Requirements Preview</h4>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {selectedJob?.description || selectedJob?.full_description || 'No description available'}
                </p>
                {selectedJob?.required_skills?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedJob.required_skills.slice(0, 5).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Tailor Button */}
              {!tailoredContent && (
                <>
                  <Button
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    onClick={handleTailorResume}
                    disabled={isTailoring || !tailorForm.resume_id}
                    data-testid="tailor-resume-btn"
                  >
                    {isTailoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing for ATS & Keywords...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Tailor Resume with AI (ATS Optimized)
                      </>
                    )}
                  </Button>
                  
                  {/* Generate Versions Checkbox */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="generateVersions"
                      checked={tailorForm.generateVersions}
                      onChange={(e) => setTailorForm({ ...tailorForm, generateVersions: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                    />
                    <label htmlFor="generateVersions" className="text-sm text-muted-foreground">
                      Generate 2-3 resume versions (Technical Focus, Leadership Focus)
                    </label>
                  </div>
                </>
              )}

              {/* Tailored Content Display */}
              {tailoredContent && (
                <div className="space-y-4">
                  {/* ATS Keywords Section */}
                  {extractedKeywords && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        ATS Keywords Incorporated
                      </h4>
                      <p className="text-xs text-blue-300/80 leading-relaxed">
                        {extractedKeywords}
                      </p>
                    </div>
                  )}
                  
                  {/* Version Selector (if versions available) */}
                  {tailoredVersions.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select Resume Version</Label>
                      <div className="flex flex-wrap gap-2">
                        {tailoredVersions.map((version, idx) => (
                          <Badge
                            key={idx}
                            variant={selectedVersion === version.name ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1 ${
                              selectedVersion === version.name 
                                ? 'bg-violet-600' 
                                : 'hover:bg-violet-500/20'
                            }`}
                            onClick={() => {
                              setSelectedVersion(version.name);
                              setTailoredContent(version.content);
                            }}
                          >
                            {version.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                      ATS-Optimized Resume Preview
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadTailoredResume('pdf', selectedVersion)}
                      >
                        Download PDF
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleDownloadTailoredResume('docx', selectedVersion)}
                      >
                        Download Word
                      </Button>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-5 rounded-lg border border-slate-700 max-h-[350px] overflow-y-auto shadow-inner">
                    <div className="text-sm text-slate-200 leading-relaxed space-y-2">
                      {tailoredContent.split('\n').map((line, index) => {
                        // Format headers (lines that start with uppercase and end with colon or are all caps)
                        if (line.match(/^[A-Z][A-Z\s]+:?$/) || line.match(/^#+\s/)) {
                          return <h3 key={index} className="font-bold text-violet-400 mt-3 mb-1 text-base">{line.replace(/^#+\s/, '')}</h3>;
                        }
                        // Format bullet points
                        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
                          return <p key={index} className="pl-4 text-slate-300">{line}</p>;
                        }
                        // Empty lines become spacing
                        if (!line.trim()) {
                          return <div key={index} className="h-2" />;
                        }
                        // Regular text
                        return <p key={index} className="text-slate-200">{line}</p>;
                      })}
                    </div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Your resume has been ATS-optimized with relevant keywords. Download as Word for best compatibility with job portals!
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setShowTailorDialog(false);
                      setShowApplyDialog(true);
                      setApplicationForm({ ...applicationForm, resume_id: tailorForm.resume_id });
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Continue to Apply
                  </Button>
                </div>
              )}

              {/* Close button if not tailored yet */}
              {!tailoredContent && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowTailorDialog(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Auto-Apply Settings Dialog */}
        <Dialog open={showAutoApplyDialog} onOpenChange={setShowAutoApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-500" />
                Auto-Apply Settings
              </DialogTitle>
              <DialogDescription>
                Configure how the AI agent should automatically apply to jobs on your behalf.
              </DialogDescription>
            </DialogHeader>
            
            {/* Auto-fill from Profile Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await autoApplyAPI.autoFillSettings();
                    setAutoApplySettings({
                      ...autoApplySettings,
                      ...res.data.settings,
                    });
                    toast.success('Settings auto-filled from your profile!');
                  } catch (error) {
                    toast.error('Failed to auto-fill settings');
                  }
                }}
                className="text-violet-600 border-violet-200 hover:bg-violet-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-fill from Profile
              </Button>
            </div>
            
            <div className="space-y-6 py-4">
              {/* Resume Selection */}
              <div className="space-y-2">
                <Label className="font-semibold">Select Resume *</Label>
                <Select
                  value={autoApplySettings.resume_id}
                  onValueChange={(value) => setAutoApplySettings({ ...autoApplySettings, resume_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume for applications" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.resume_id} value={resume.resume_id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {resume.file_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Keywords */}
              <div className="space-y-2">
                <Label className="font-semibold">Job Title Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Python Developer"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {autoApplySettings.job_keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeKeyword(keyword)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <Label className="font-semibold">Preferred Locations</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Remote, New York"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  />
                  <Button type="button" onClick={addLocation} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {autoApplySettings.locations.map((location) => (
                    <Badge key={location} variant="outline" className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {location}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeLocation(location)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Max Applications */}
              <div className="space-y-2">
                <Label className="font-semibold">Max Applications Per Day</Label>
                <Select
                  value={autoApplySettings.max_applications_per_day.toString()}
                  onValueChange={(value) => setAutoApplySettings({ ...autoApplySettings, max_applications_per_day: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} applications
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Tailor Resume */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="font-semibold">Auto-Tailor Resume</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically customize resume for each job using AI
                  </p>
                </div>
                <Switch
                  checked={autoApplySettings.auto_tailor_resume}
                  onCheckedChange={(checked) => setAutoApplySettings({ ...autoApplySettings, auto_tailor_resume: checked })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAutoApplyDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAutoApplySettings}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Auto-Apply History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-violet-500" />
                Application History
              </DialogTitle>
              <DialogDescription>
                Jobs that the AI agent has applied to on your behalf
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4">
              {autoApplyHistory.length > 0 ? (
                <div className="space-y-3">
                  {autoApplyHistory.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{item.job_title}</h4>
                          <p className="text-sm text-muted-foreground">{item.company}</p>
                        </div>
                        <Badge variant={item.status === 'applied' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.applied_at)}
                        </span>
                      </div>
                      {item.apply_link && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 mt-2"
                          onClick={() => window.open(item.apply_link, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Job
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No application history yet</p>
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
                Profile Incomplete
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4">
                Your profile is less than 80% complete. Please update your profile before using the auto-apply feature.
              </p>
              {profileCompleteness?.missing_fields && (
                <div className="bg-amber-50 p-4 rounded-lg mb-4">
                  <p className="font-medium text-amber-800 mb-2">Missing fields:</p>
                  <ul className="list-disc list-inside text-sm text-amber-700">
                    {profileCompleteness.missing_fields.map((field, i) => (
                      <li key={i}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowProfileWarning(false)} className="flex-1">
                  Later
                </Button>
                <Button onClick={() => navigate('/profile')} className="flex-1">
                  Update Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </DashboardLayout>
  );
}

export default LiveJobsPage;
