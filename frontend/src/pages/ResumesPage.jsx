import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { resumeAPI, technologiesAPI, coverLetterAPI } from '../lib/api';
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
  DialogTrigger,
} from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Download, 
  Eye,
  Loader2,
  Trash2,
  Plus,
  FileType
} from 'lucide-react';
import { toast } from 'sonner';

export function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [technologies, setTechnologies] = useState({ primary: [], sub_technologies: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showTailorDialog, setShowTailorDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCoverLetterDialog, setShowCoverLetterDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const fileInputRef = useRef(null);

  const [tailorForm, setTailorForm] = useState({
    job_title: '',
    job_description: '',
    technologies: [],
  });

  const [coverLetterForm, setCoverLetterForm] = useState({
    job_title: '',
    company_name: '',
    job_description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resumesRes, techRes] = await Promise.all([
        resumeAPI.getAll(),
        technologiesAPI.getAll()
      ]);
      setResumes(resumesRes.data);
      setTechnologies(techRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    setIsUploading(true);
    try {
      const response = await resumeAPI.upload(file);
      toast.success('Resume uploaded successfully!');
      loadData();
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTailor = async () => {
    if (!selectedResume || !tailorForm.job_title || !tailorForm.job_description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsTailoring(true);
    try {
      const response = await resumeAPI.tailor({
        resume_id: selectedResume.resume_id,
        job_title: tailorForm.job_title,
        job_description: tailorForm.job_description,
        technologies: tailorForm.technologies,
      });
      toast.success('Resume tailored successfully!');
      setShowTailorDialog(false);
      loadData();
      // Show the tailored content
      setSelectedResume({ ...selectedResume, tailored_content: response.data.tailored_content });
      setShowPreviewDialog(true);
    } catch (error) {
      toast.error('Failed to tailor resume');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleDownload = async (resume, format) => {
    try {
      const response = await resumeAPI.download(resume.resume_id, format);
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${resume.resume_id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Resume downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to download resume');
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedResume || !coverLetterForm.job_title || !coverLetterForm.company_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsTailoring(true);
    try {
      const response = await coverLetterAPI.generate({
        resume_id: selectedResume.resume_id,
        ...coverLetterForm,
      });
      setCoverLetter(response.data.cover_letter);
      toast.success('Cover letter generated!');
    } catch (error) {
      toast.error('Failed to generate cover letter');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleTechChange = (tech, checked) => {
    if (checked) {
      setTailorForm({ ...tailorForm, technologies: [...tailorForm.technologies, tech] });
    } else {
      setTailorForm({ ...tailorForm, technologies: tailorForm.technologies.filter(t => t !== tech) });
    }
  };

  const allSubTechs = Object.values(technologies.sub_technologies).flat();

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
      <div className="space-y-8" data-testid="resumes-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">My Resumes</h1>
            <p className="text-muted-foreground mt-1">
              Upload, tailor, and manage your resumes
            </p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="upload-resume-btn"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Resume
            </Button>
          </div>
        </div>

        {/* Resumes Grid */}
        {resumes.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No Resumes Yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Upload your resume to get started. We support PDF and Word documents.
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Resume
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <Card key={resume.resume_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileType className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{resume.file_name}</CardTitle>
                        <CardDescription>
                          {new Date(resume.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resume.tailored_content && (
                    <Badge variant="secondary" className="gradient-ai text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Tailored
                    </Badge>
                  )}
                  {resume.target_job_title && (
                    <p className="text-sm text-muted-foreground">
                      Tailored for: {resume.target_job_title}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedResume(resume);
                        setShowPreviewDialog(true);
                      }}
                      data-testid={`preview-${resume.resume_id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedResume(resume);
                        setTailorForm({ job_title: '', job_description: '', technologies: [] });
                        setShowTailorDialog(true);
                      }}
                      data-testid={`tailor-${resume.resume_id}`}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Tailor
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedResume(resume);
                        setCoverLetterForm({ job_title: '', company_name: '', job_description: '' });
                        setCoverLetter('');
                        setShowCoverLetterDialog(true);
                      }}
                      data-testid={`cover-letter-${resume.resume_id}`}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Cover Letter
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDownload(resume, 'docx')}
                      data-testid={`download-docx-${resume.resume_id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      DOCX
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDownload(resume, 'pdf')}
                      data-testid={`download-pdf-${resume.resume_id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tailor Dialog */}
        <Dialog open={showTailorDialog} onOpenChange={setShowTailorDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tailor Resume with AI</DialogTitle>
              <DialogDescription>
                Customize your resume for a specific job position using GPT-5.2
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  placeholder="e.g., Senior Software Engineer"
                  value={tailorForm.job_title}
                  onChange={(e) => setTailorForm({ ...tailorForm, job_title: e.target.value })}
                  data-testid="tailor-job-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Job Description *</Label>
                <Textarea
                  placeholder="Paste the job description here..."
                  rows={6}
                  value={tailorForm.job_description}
                  onChange={(e) => setTailorForm({ ...tailorForm, job_description: e.target.value })}
                  data-testid="tailor-job-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies to Highlight</Label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {allSubTechs.map((tech) => (
                    <div key={tech} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tech-${tech}`}
                        checked={tailorForm.technologies.includes(tech)}
                        onCheckedChange={(checked) => handleTechChange(tech, checked)}
                      />
                      <label htmlFor={`tech-${tech}`} className="text-sm">{tech}</label>
                    </div>
                  ))}
                </div>
              </div>
              <Button 
                className="w-full gradient-ai text-white"
                onClick={handleTailor}
                disabled={isTailoring}
                data-testid="submit-tailor"
              >
                {isTailoring ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Tailor Resume
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Resume Preview</DialogTitle>
              <DialogDescription>
                {selectedResume?.file_name}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue={selectedResume?.tailored_content ? "tailored" : "original"}>
              <TabsList className="mb-4">
                <TabsTrigger value="original">Original</TabsTrigger>
                {selectedResume?.tailored_content && (
                  <TabsTrigger value="tailored">AI Tailored</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="original">
                <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[60vh] overflow-y-auto">
                  {selectedResume?.original_content}
                </div>
              </TabsContent>
              {selectedResume?.tailored_content && (
                <TabsContent value="tailored">
                  <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[60vh] overflow-y-auto">
                    {selectedResume.tailored_content}
                  </div>
                </TabsContent>
              )}
            </Tabs>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => handleDownload(selectedResume, 'docx')}>
                <Download className="w-4 h-4 mr-2" />
                Download DOCX
              </Button>
              <Button variant="outline" onClick={() => handleDownload(selectedResume, 'pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cover Letter Dialog */}
        <Dialog open={showCoverLetterDialog} onOpenChange={setShowCoverLetterDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Cover Letter</DialogTitle>
              <DialogDescription>
                Create a personalized cover letter using AI
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g., Software Engineer"
                    value={coverLetterForm.job_title}
                    onChange={(e) => setCoverLetterForm({ ...coverLetterForm, job_title: e.target.value })}
                    data-testid="cover-job-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    placeholder="e.g., Google"
                    value={coverLetterForm.company_name}
                    onChange={(e) => setCoverLetterForm({ ...coverLetterForm, company_name: e.target.value })}
                    data-testid="cover-company-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  placeholder="Paste the job description (optional but recommended)..."
                  rows={4}
                  value={coverLetterForm.job_description}
                  onChange={(e) => setCoverLetterForm({ ...coverLetterForm, job_description: e.target.value })}
                  data-testid="cover-job-description"
                />
              </div>
              <Button 
                className="w-full gradient-ai text-white"
                onClick={handleGenerateCoverLetter}
                disabled={isTailoring}
                data-testid="generate-cover-letter"
              >
                {isTailoring ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Cover Letter
              </Button>
              {coverLetter && (
                <div className="space-y-2">
                  <Label>Generated Cover Letter</Label>
                  <Textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    data-testid="cover-letter-output"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetter);
                      toast.success('Copied to clipboard!');
                    }}
                  >
                    Copy to Clipboard
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default ResumesPage;
