import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { jobPortalAPI, resumeAPI, applicationAPI, coverLetterAPI } from '../lib/api';
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
import { 
  Briefcase, 
  ExternalLink, 
  Send,
  Loader2,
  Search,
  Globe,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export function JobsPage() {
  const { user } = useAuthStore();
  const [portals, setPortals] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState('all');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  const [applicationForm, setApplicationForm] = useState({
    job_title: '',
    job_description: '',
    company_name: '',
    resume_id: '',
    cover_letter: '',
  });

  const technologies = ['all', 'Java', 'Python', 'PHP', 'AI', 'React'];

  useEffect(() => {
    loadData();
  }, [selectedTech]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [portalsRes, resumesRes] = await Promise.all([
        jobPortalAPI.getAll(selectedTech === 'all' ? null : selectedTech),
        resumeAPI.getAll()
      ]);
      setPortals(portalsRes.data);
      setResumes(resumesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load job listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!applicationForm.job_title || !applicationForm.resume_id) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await applicationAPI.create({
        job_portal_id: selectedPortal.portal_id,
        ...applicationForm,
      });
      toast.success('Application submitted successfully!');
      setShowApplyDialog(false);
      setApplicationForm({
        job_title: '',
        job_description: '',
        company_name: '',
        resume_id: '',
        cover_letter: '',
      });
    } catch (error) {
      toast.error('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!applicationForm.resume_id || !applicationForm.job_title) {
      toast.error('Please select a resume and enter job title first');
      return;
    }

    setIsGeneratingCover(true);
    try {
      const response = await coverLetterAPI.generate({
        resume_id: applicationForm.resume_id,
        job_title: applicationForm.job_title,
        company_name: applicationForm.company_name || selectedPortal?.name || 'the company',
        job_description: applicationForm.job_description,
      });
      setApplicationForm({ ...applicationForm, cover_letter: response.data.cover_letter });
      toast.success('Cover letter generated!');
    } catch (error) {
      toast.error('Failed to generate cover letter');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const filteredPortals = portals;

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
      <div className="space-y-8" data-testid="jobs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">Job Portals</h1>
            <p className="text-muted-foreground mt-1">
              Curated job opportunities added by our support team
            </p>
          </div>
          <Badge variant="outline" className="text-xs px-3 py-1 bg-violet-500/10 text-violet-400 border-violet-500/30">
            <Globe className="w-3 h-3 mr-1" />
            Manually Curated
          </Badge>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong>Note:</strong> These job portal links are manually added by our support team. 
            We're working on an automated web crawler to discover more opportunities. 
            For real-time job listings, check out the <a href="/live-jobs" className="underline hover:text-blue-300">Live Jobs</a> section.
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Filter by Technology:</Label>
                <Select value={selectedTech} onValueChange={setSelectedTech}>
                  <SelectTrigger className="w-40" data-testid="tech-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {technologies.map((tech) => (
                      <SelectItem key={tech} value={tech}>
                        {tech === 'all' ? 'All Technologies' : tech}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredPortals.length} job portal{filteredPortals.length !== 1 ? 's' : ''} available
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Portals Grid */}
        {filteredPortals.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Briefcase className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No Job Portals Added Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                {selectedTech !== 'all' 
                  ? `No job portals available for ${selectedTech}. Try selecting a different technology or check back later.`
                  : 'Our support team is working on adding relevant job portal links. In the meantime, check out the Live Jobs section for real-time opportunities!'}
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/live-jobs'}>
                <Sparkles className="w-4 h-4 mr-2" />
                Browse Live Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortals.map((portal) => (
              <Card key={portal.portal_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{portal.name}</CardTitle>
                        <Badge variant="secondary">{portal.technology}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {portal.description && (
                    <p className="text-sm text-muted-foreground">{portal.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(portal.url, '_blank')}
                      data-testid={`visit-${portal.portal_id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Visit Portal
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedPortal(portal);
                        setApplicationForm({
                          ...applicationForm,
                          company_name: portal.name,
                        });
                        setShowApplyDialog(true);
                      }}
                      data-testid={`apply-${portal.portal_id}`}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Apply Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply to {selectedPortal?.name}</DialogTitle>
              <DialogDescription>
                Fill in the job details and submit your application
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g., Senior Developer"
                    value={applicationForm.job_title}
                    onChange={(e) => setApplicationForm({ ...applicationForm, job_title: e.target.value })}
                    data-testid="apply-job-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    placeholder="Company name"
                    value={applicationForm.company_name}
                    onChange={(e) => setApplicationForm({ ...applicationForm, company_name: e.target.value })}
                    data-testid="apply-company-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  placeholder="Paste the job description..."
                  rows={4}
                  value={applicationForm.job_description}
                  onChange={(e) => setApplicationForm({ ...applicationForm, job_description: e.target.value })}
                  data-testid="apply-job-description"
                />
              </div>
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
                  <p className="text-sm text-muted-foreground">
                    No resumes uploaded. Please upload a resume first.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cover Letter</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCover}
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
                  rows={6}
                  value={applicationForm.cover_letter}
                  onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })}
                  data-testid="apply-cover-letter"
                />
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
                  disabled={isSubmitting || !applicationForm.job_title || !applicationForm.resume_id}
                  data-testid="submit-application"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Application
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default JobsPage;
