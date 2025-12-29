import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { liveJobsAPI, resumeAPI, applicationAPI, coverLetterAPI } from '../lib/api';
import { useAuthStore } from '../store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
  Target
} from 'lucide-react';
import { toast } from 'sonner';

export function LiveJobsPage() {
  const { user } = useAuthStore();
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
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [recsRes, resumesRes] = await Promise.all([
        liveJobsAPI.getRecommendations(),
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

  const handleSearch = async (e) => {
    e?.preventDefault();
    setIsSearching(true);
    try {
      const response = await liveJobsAPI.search(
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
      });
      
      toast.success('Application recorded! Opening job application page...');
      
      // Open the apply link in a new tab
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
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Company Logo */}
          <div className="shrink-0">
            {job.company_logo ? (
              <img 
                src={job.company_logo} 
                alt={job.company}
                className="w-14 h-14 rounded-lg object-contain bg-muted p-1"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-14 h-14 rounded-lg bg-primary/10 items-center justify-center ${job.company_logo ? 'hidden' : 'flex'}`}
            >
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-muted-foreground">{job.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {showMatchedTech && job.matched_technology && (
                  <Badge className="gradient-ai text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {job.matched_technology}
                  </Badge>
                )}
                {job.source && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                    <Globe className="w-3 h-3 mr-1" />
                    {job.source}
                  </Badge>
                )}
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location || job.country}
                </span>
              )}
              {job.is_remote && (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Remote
                </Badge>
              )}
              {job.employment_type && (
                <Badge variant="outline" className="text-xs">
                  {job.employment_type}
                </Badge>
              )}
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period) && (
                <span className="flex items-center gap-1 text-green-600">
                  <DollarSign className="w-4 h-4" />
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
                </span>
              )}
              {job.posted_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(job.posted_at)}
                </span>
              )}
            </div>

            {/* Description */}
            {job.description && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {job.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                onClick={() => {
                  setSelectedJob(job);
                  setTailorForm({ resume_id: '' });
                  setTailoredContent('');
                  setShowTailorDialog(true);
                }}
                data-testid={`tailor-${job.job_id}`}
              >
                <FileEdit className="w-4 h-4 mr-1" />
                AI Tailor Resume
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setSelectedJob(job);
                  setShowApplyDialog(true);
                }}
                data-testid={`apply-${job.job_id}`}
              >
                <Send className="w-4 h-4 mr-1" />
                Apply Now
              </Button>
              {job.apply_link && (
                <Button 
                  variant="outline" 
                  size="sm"
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="live-jobs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">Live Job Listings</h1>
            <p className="text-muted-foreground mt-1">
              Real-time opportunities from LinkedIn, Indeed, Glassdoor & more
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., New York, Remote"
                    value={searchForm.location}
                    onChange={(e) => setSearchForm({ ...searchForm, location: e.target.value })}
                    data-testid="job-search-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={searchForm.employment_type || "all"}
                    onValueChange={(value) => setSearchForm({ ...searchForm, employment_type: value === "all" ? "" : value })}
                  >
                    <SelectTrigger data-testid="job-search-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="FULLTIME">Full Time</SelectItem>
                      <SelectItem value="PARTTIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contract</SelectItem>
                      <SelectItem value="INTERN">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
            {recommendations.length > 0 ? (
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
                  <h3 className="font-heading text-xl font-semibold mb-2">No Recommendations Yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
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

        {/* Apply Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply to {selectedJob?.title}</DialogTitle>
              <DialogDescription>
                at {selectedJob?.company}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Resume *</Label>
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
                        {resume.file_name}
                        {resume.tailored_content && ' (AI Tailored)'}
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
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cover Letter (Optional)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCover || !applicationForm.resume_id}
                    data-testid="generate-cover-btn"
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
                  data-testid="apply-cover-letter"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your application will be tracked in the Applications page</li>
                  <li>• The original job posting will open in a new tab</li>
                  <li>• Complete the application on the employer's website</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowApplyDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleApply}
                  disabled={isSubmitting || !applicationForm.resume_id}
                  data-testid="submit-live-application"
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
      </div>
    </DashboardLayout>
  );
}

export default LiveJobsPage;
