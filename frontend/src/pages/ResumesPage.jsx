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
  FileType,
  Target,
  Wand2,
  CheckCircle2,
  Copy,
  BarChart3,
  AlertTriangle,
  Zap,
  Star,
  Phone,
  Mail,
  MapPin,
  Linkedin,
  FileCheck,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

export function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [technologies, setTechnologies] = useState({ primary: [], sub_technologies: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingMaster, setIsCreatingMaster] = useState(false);
  const [isGeneratingVersions, setIsGeneratingVersions] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showTailorDialog, setShowTailorDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCoverLetterDialog, setShowCoverLetterDialog] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [showMasterDialog, setShowMasterDialog] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [optimizedContent, setOptimizedContent] = useState('');
  const [extractedKeywords, setExtractedKeywords] = useState('');
  const [resumeVersions, setResumeVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('default');
  const [analysisData, setAnalysisData] = useState(null);
  const [masterResume, setMasterResume] = useState('');
  const [titleVersions, setTitleVersions] = useState([]);
  const [showAutoResultsDialog, setShowAutoResultsDialog] = useState(false);
  const [autoResults, setAutoResults] = useState(null);
  const fileInputRef = useRef(null);

  const [tailorForm, setTailorForm] = useState({
    job_title: '',
    job_description: '',
    technologies: [],
  });

  const [optimizeForm, setOptimizeForm] = useState({
    target_role: '',
    generateVersions: false,
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

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      toast.error('Please upload a PDF, Word document, or text file');
      return;
    }

    setIsUploading(true);
    toast.info('Uploading and analyzing your resume... This may take a moment.', { duration: 10000 });
    
    try {
      const response = await resumeAPI.upload(file);
      
      // Show automatic results popup
      if (response.data.auto_processed) {
        setAutoResults({
          resume_id: response.data.resume_id,
          file_name: response.data.file_name,
          analysis: response.data.analysis,
          master_resume: response.data.master_resume,
          title_versions: response.data.title_versions || []
        });
        setShowAutoResultsDialog(true);
        toast.success('Resume analyzed successfully!');
      } else {
        toast.success('Resume uploaded successfully!');
      }
      
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

  const handleOptimize = async () => {
    if (!selectedResume) {
      toast.error('No resume selected');
      return;
    }

    setIsOptimizing(true);
    setOptimizedContent('');
    setExtractedKeywords('');
    setResumeVersions([]);
    
    try {
      const response = await resumeAPI.optimize(selectedResume.resume_id, {
        target_role: optimizeForm.target_role || '',
        generate_versions: optimizeForm.generateVersions,
      });
      
      setOptimizedContent(response.data.optimized_content);
      setExtractedKeywords(response.data.keywords || '');
      
      if (response.data.versions && response.data.versions.length > 0) {
        setResumeVersions(response.data.versions);
        setSelectedVersion('Standard ATS-Optimized');
      }
      
      toast.success('Resume optimized for ATS!');
      loadData();
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize resume');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDownloadOptimized = async (format, versionName = 'default') => {
    if (!selectedResume) return;
    
    try {
      const response = await resumeAPI.generateWord(selectedResume.resume_id, versionName);
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const versionSuffix = versionName !== 'default' ? `_${versionName.replace(/\s+/g, '_')}` : '_ATS_Optimized';
      a.download = `resume${versionSuffix}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('ATS-optimized resume downloaded as Word');
    } catch (error) {
      toast.error('Failed to download resume');
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

  const handleDelete = async (resumeId) => {
    if (!window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }
    
    try {
      await resumeAPI.remove(resumeId);
      toast.success('Resume deleted successfully');
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete resume');
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

  // Analyze Resume - Score and Missing Info
  const handleAnalyzeResume = async () => {
    if (!selectedResume) return;
    
    setIsAnalyzing(true);
    setAnalysisData(null);
    
    try {
      const response = await resumeAPI.analyze(selectedResume.resume_id);
      setAnalysisData(response.data.analysis);
      toast.success('Resume analyzed successfully!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create Master Resume
  const handleCreateMaster = async () => {
    if (!selectedResume) return;
    
    setIsCreatingMaster(true);
    setMasterResume('');
    
    try {
      const response = await resumeAPI.createMaster(selectedResume.resume_id);
      setMasterResume(response.data.master_resume);
      toast.success('Master resume created!');
      loadData();
    } catch (error) {
      console.error('Master creation error:', error);
      toast.error('Failed to create master resume');
    } finally {
      setIsCreatingMaster(false);
    }
  };

  // Generate Multiple Versions with Different Titles
  const handleGenerateVersions = async () => {
    if (!selectedResume) return;
    
    setIsGeneratingVersions(true);
    setTitleVersions([]);
    
    try {
      const response = await resumeAPI.generateVersions(selectedResume.resume_id, {});
      setTitleVersions(response.data.versions || []);
      toast.success(`Generated ${response.data.versions?.length || 0} resume versions!`);
      loadData();
    } catch (error) {
      console.error('Version generation error:', error);
      toast.error('Failed to generate versions');
    } finally {
      setIsGeneratingVersions(false);
    }
  };

  // Download version as Word
  const handleDownloadVersion = async (versionContent, versionName) => {
    if (!selectedResume) return;
    
    try {
      const response = await resumeAPI.generateWord(selectedResume.resume_id, { 
        content: versionContent,
        version: versionName 
      });
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${versionName.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Resume version downloaded!');
    } catch (error) {
      toast.error('Failed to download resume');
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
              accept=".pdf,.doc,.docx,.txt"
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
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    {resume.ats_optimized && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        ATS Optimized
                      </Badge>
                    )}
                    {resume.tailored_content && (
                      <Badge variant="secondary" className="gradient-ai text-white">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Tailored
                      </Badge>
                    )}
                    {resume.versions && resume.versions.length > 0 && (
                      <Badge variant="outline" className="text-violet-400 border-violet-400">
                        <Copy className="w-3 h-3 mr-1" />
                        {resume.versions.length} Versions
                      </Badge>
                    )}
                  </div>
                  
                  {resume.target_job_title && (
                    <p className="text-sm text-muted-foreground">
                      Tailored for: {resume.target_job_title}
                    </p>
                  )}
                  
                  {/* Action Buttons - Row 1 */}
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
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      onClick={() => {
                        setSelectedResume(resume);
                        setAnalysisData(resume.analysis || null);
                        setShowAnalysisDialog(true);
                      }}
                      data-testid={`analyze-${resume.resume_id}`}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Score & Analyze
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                      onClick={() => {
                        setSelectedResume(resume);
                        setMasterResume(resume.master_resume || '');
                        setShowMasterDialog(true);
                      }}
                      data-testid={`master-${resume.resume_id}`}
                    >
                      <Wand2 className="w-4 h-4 mr-1" />
                      Fix Resume
                    </Button>
                  </div>
                  
                  {/* Action Buttons - Row 2 */}
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                      onClick={() => {
                        setSelectedResume(resume);
                        setTitleVersions(resume.title_versions || []);
                        setShowVersionsDialog(true);
                      }}
                      data-testid={`versions-${resume.resume_id}`}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Generate Titles
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      onClick={() => {
                        setSelectedResume(resume);
                        setOptimizeForm({ target_role: '', generateVersions: false });
                        setOptimizedContent('');
                        setExtractedKeywords('');
                        setResumeVersions([]);
                        setShowOptimizeDialog(true);
                      }}
                      data-testid={`optimize-${resume.resume_id}`}
                    >
                      <Target className="w-4 h-4 mr-1" />
                      ATS Optimize
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
                      Tailor for Job
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(resume.resume_id)}
                      data-testid={`delete-${resume.resume_id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
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

        {/* ATS Optimize Dialog */}
        <Dialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                ATS Resume Optimizer
              </DialogTitle>
              <DialogDescription>
                Make your resume ATS-friendly with relevant keywords and optimized formatting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Configuration Section */}
              {!optimizedContent && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Selected Resume</h4>
                    <p className="text-sm text-muted-foreground">{selectedResume?.file_name}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Target Role (Optional)</Label>
                    <Input
                      placeholder="e.g., Senior Software Engineer, Data Scientist..."
                      value={optimizeForm.target_role}
                      onChange={(e) => setOptimizeForm({ ...optimizeForm, target_role: e.target.value })}
                      data-testid="optimize-target-role"
                    />
                    <p className="text-xs text-muted-foreground">
                      Specifying a target role helps optimize keywords and focus areas
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <Checkbox
                      id="generate-versions"
                      checked={optimizeForm.generateVersions}
                      onCheckedChange={(checked) => setOptimizeForm({ ...optimizeForm, generateVersions: checked })}
                      data-testid="generate-versions-checkbox"
                    />
                    <div>
                      <label htmlFor="generate-versions" className="text-sm font-medium cursor-pointer">
                        Generate Multiple Versions
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Creates 3 versions: Standard ATS, Technical Focus, and Leadership Focus
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    data-testid="submit-optimize"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing with AI...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Optimize for ATS
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Results Section */}
              {optimizedContent && (
                <div className="space-y-4">
                  {/* Keywords Section */}
                  {extractedKeywords && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <h4 className="font-medium text-green-500 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Extracted ATS Keywords
                      </h4>
                      <p className="text-sm text-muted-foreground">{extractedKeywords}</p>
                    </div>
                  )}
                  
                  {/* Version Tabs or Single Content */}
                  {resumeVersions.length > 0 ? (
                    <Tabs value={selectedVersion} onValueChange={setSelectedVersion}>
                      <TabsList className="grid w-full grid-cols-3">
                        {resumeVersions.map((version) => (
                          <TabsTrigger key={version.name} value={version.name} className="text-xs">
                            {version.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {resumeVersions.map((version) => (
                        <TabsContent key={version.name} value={version.name}>
                          <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[40vh] overflow-y-auto">
                            {version.content}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button 
                              onClick={() => handleDownloadOptimized('docx', version.name)}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download {version.name} (Word)
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(version.content);
                                toast.success('Copied to clipboard!');
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>ATS-Optimized Resume</Label>
                        <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[40vh] overflow-y-auto">
                          {optimizedContent}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleDownloadOptimized('docx')}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download as Word
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(optimizedContent);
                            toast.success('Copied to clipboard!');
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {/* Reset Button */}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setOptimizedContent('');
                      setExtractedKeywords('');
                      setResumeVersions([]);
                    }}
                  >
                    Optimize Again with Different Settings
                  </Button>
                </div>
              )}
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

        {/* Analysis Dialog */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                Resume Analysis & Score
              </DialogTitle>
              <DialogDescription>
                Get detailed feedback on your resume with missing information alerts
              </DialogDescription>
            </DialogHeader>
            
            {!analysisData ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-4">Click analyze to get your resume score and feedback</p>
                <Button 
                  onClick={handleAnalyzeResume}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analyze My Resume
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {/* Score Card */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-amber-500">{analysisData.score}</span>
                      <span className="text-2xl text-muted-foreground">/100</span>
                    </div>
                    <Badge className={`mt-2 ${
                      analysisData.grade === 'A' ? 'bg-green-600' :
                      analysisData.grade === 'B' ? 'bg-blue-600' :
                      analysisData.grade === 'C' ? 'bg-amber-600' :
                      'bg-red-600'
                    } text-white`}>
                      Grade: {analysisData.grade}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">ATS Score</p>
                    <span className="text-3xl font-bold text-green-500">{analysisData.ats_compatibility?.score || 'N/A'}</span>
                    <p className="text-sm text-muted-foreground">Experience: {analysisData.experience_level}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{analysisData.summary}</p>
                </div>

                {/* Missing Information Alert */}
                {analysisData.missing_info && Object.values(analysisData.missing_info).some(v => v) && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h4 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Missing Information - Please Add:
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {analysisData.missing_info.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-red-400" />
                          <span>Phone Number</span>
                        </div>
                      )}
                      {analysisData.missing_info.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-red-400" />
                          <span>Email Address</span>
                        </div>
                      )}
                      {analysisData.missing_info.address_location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-red-400" />
                          <span>Location/Address</span>
                        </div>
                      )}
                      {analysisData.missing_info.linkedin && (
                        <div className="flex items-center gap-2 text-sm">
                          <Linkedin className="w-4 h-4 text-red-400" />
                          <span>LinkedIn Profile</span>
                        </div>
                      )}
                      {analysisData.missing_info.professional_summary && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileCheck className="w-4 h-4 text-red-400" />
                          <span>Professional Summary</span>
                        </div>
                      )}
                      {analysisData.missing_info.skills_section && (
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="w-4 h-4 text-red-400" />
                          <span>Skills Section</span>
                        </div>
                      )}
                      {analysisData.missing_info.quantifiable_achievements && (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="w-4 h-4 text-red-400" />
                          <span>Quantifiable Achievements</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h4 className="font-semibold text-green-500 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {analysisData.strengths?.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h4 className="font-semibold text-red-500 mb-2">Areas to Improve</h4>
                    <ul className="space-y-1">
                      {analysisData.weaknesses?.map((w, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Improvement Suggestions */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="font-semibold text-blue-500 mb-2">Improvement Suggestions</h4>
                  <ol className="space-y-2">
                    {analysisData.improvement_suggestions?.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Detected Skills */}
                {analysisData.detected_skills?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Detected Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.detected_skills.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-analyze Button */}
                <Button 
                  variant="outline"
                  onClick={handleAnalyzeResume}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  Re-Analyze
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Master Resume Dialog */}
        <Dialog open={showMasterDialog} onOpenChange={setShowMasterDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-violet-500" />
                Create Master Resume
              </DialogTitle>
              <DialogDescription>
                Fix and polish your resume without a specific job description. Creates a strong base for all applications.
              </DialogDescription>
            </DialogHeader>
            
            {!masterResume ? (
              <div className="py-8 text-center">
                <div className="mb-6">
                  <p className="text-muted-foreground mb-2">This will:</p>
                  <ul className="text-sm text-left max-w-md mx-auto space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Fix grammar, spelling, and formatting issues
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Add a compelling professional summary
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Organize skills into categories
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Rewrite bullet points with action verbs
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Make it ATS-friendly
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={handleCreateMaster}
                  disabled={isCreatingMaster}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                >
                  {isCreatingMaster ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Master Resume...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Fix My Resume
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[50vh] overflow-y-auto">
                  {masterResume}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleDownloadVersion(masterResume, 'Master_Resume')}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Master Resume
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(masterResume);
                      toast.success('Copied to clipboard!');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setMasterResume('');
                      handleCreateMaster();
                    }}
                    disabled={isCreatingMaster}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Generate Versions Dialog */}
        <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Generate Job Title Versions
              </DialogTitle>
              <DialogDescription>
                Create 3-4 resume versions optimized for different job titles based on your technology
              </DialogDescription>
            </DialogHeader>
            
            {titleVersions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-6">
                  <p className="text-muted-foreground mb-4">Based on your technology, we'll create versions for titles like:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline">React Developer</Badge>
                    <Badge variant="outline">Frontend Engineer</Badge>
                    <Badge variant="outline">Web Developer</Badge>
                    <Badge variant="outline">UI Developer</Badge>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerateVersions}
                  disabled={isGeneratingVersions}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  {isGeneratingVersions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Versions...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Generate All Versions
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <Tabs defaultValue={titleVersions[0]?.name}>
                  <TabsList className="grid w-full grid-cols-4">
                    {titleVersions.map((version) => (
                      <TabsTrigger key={version.name} value={version.name} className="text-xs">
                        {version.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {titleVersions.map((version) => (
                    <TabsContent key={version.name} value={version.name}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-blue-600 text-white">{version.job_title}</Badge>
                        </div>
                        <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[40vh] overflow-y-auto">
                          {version.content}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleDownloadVersion(version.content, version.name)}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download {version.name}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(version.content);
                              toast.success('Copied to clipboard!');
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    setTitleVersions([]);
                    handleGenerateVersions();
                  }}
                  disabled={isGeneratingVersions}
                >
                  {isGeneratingVersions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Regenerate All Versions
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Auto Results Dialog */}
        <Dialog open={showAutoResultsDialog} onOpenChange={setShowAutoResultsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Resume Analysis Complete!
              </DialogTitle>
              <DialogDescription>
                Your resume has been automatically analyzed and processed
              </DialogDescription>
            </DialogHeader>
            
            {autoResults && (
              <div className="space-y-6 py-4">
                {/* File Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Uploaded File</h4>
                  <p className="text-sm text-muted-foreground">{autoResults.file_name}</p>
                </div>

                {/* Analysis Results */}
                {autoResults.analysis && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-500" />
                      Analysis Results
                    </h4>
                    
                    {/* Score Card */}
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                      <div>
                        <p className="text-sm text-muted-foreground">Overall Score</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-amber-500">{autoResults.analysis.score}</span>
                          <span className="text-xl text-muted-foreground">/100</span>
                        </div>
                        <Badge className={`mt-2 ${
                          autoResults.analysis.grade === 'A' ? 'bg-green-600' :
                          autoResults.analysis.grade === 'B' ? 'bg-blue-600' :
                          autoResults.analysis.grade === 'C' ? 'bg-amber-600' :
                          'bg-red-600'
                        } text-white`}>
                          Grade: {autoResults.analysis.grade}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Experience Level</p>
                        <span className="text-lg font-semibold">{autoResults.analysis.experience_level}</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{autoResults.analysis.summary}</p>
                    </div>
                  </div>
                )}

                {/* Master Resume */}
                {autoResults.master_resume && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-violet-500" />
                      Enhanced Resume
                    </h4>
                    <div className="bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-[30vh] overflow-y-auto">
                      {autoResults.master_resume}
                    </div>
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(autoResults.master_resume);
                        toast.success('Enhanced resume copied to clipboard!');
                      }}
                      variant="outline"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Enhanced Resume
                    </Button>
                  </div>
                )}

                {/* Title Versions */}
                {autoResults.title_versions && autoResults.title_versions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Job Title Versions ({autoResults.title_versions.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {autoResults.title_versions.map((version, index) => (
                        <Badge key={index} variant="outline" className="justify-center p-2">
                          {version.job_title || version.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setShowAutoResultsDialog(false);
                      // Find and select the uploaded resume
                      const uploadedResume = resumes.find(r => r.resume_id === autoResults.resume_id);
                      if (uploadedResume) {
                        setSelectedResume(uploadedResume);
                        setAnalysisData(autoResults.analysis);
                        setShowAnalysisDialog(true);
                      }
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Full Analysis
                  </Button>
                  
                  {autoResults.master_resume && (
                    <Button 
                      onClick={() => {
                        setShowAutoResultsDialog(false);
                        const uploadedResume = resumes.find(r => r.resume_id === autoResults.resume_id);
                        if (uploadedResume) {
                          setSelectedResume(uploadedResume);
                          setMasterResume(autoResults.master_resume);
                          setShowMasterDialog(true);
                        }
                      }}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      View Enhanced Resume
                    </Button>
                  )}
                  
                  {autoResults.title_versions && autoResults.title_versions.length > 0 && (
                    <Button 
                      onClick={() => {
                        setShowAutoResultsDialog(false);
                        const uploadedResume = resumes.find(r => r.resume_id === autoResults.resume_id);
                        if (uploadedResume) {
                          setSelectedResume(uploadedResume);
                          setTitleVersions(autoResults.title_versions);
                          setShowVersionsDialog(true);
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View All Versions
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default ResumesPage;
