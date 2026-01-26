import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  RefreshCw,
  Building2,
  Target,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { autoApplyAPI } from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageTransition, StaggerContainer, StaggerItem } from '../components/ui/animations';

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  
  // Filters - initialize from URL params
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    ready_to_apply: 0,
    applied: 0,
    pending: 0,
    interview: 0,
    rejected: 0,
    accepted: 0
  });

  // Update URL when status filter changes
  useEffect(() => {
    if (statusFilter && statusFilter !== 'all') {
      setSearchParams({ status: statusFilter });
    } else {
      setSearchParams({});
    }
  }, [statusFilter, setSearchParams]);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter, searchQuery, dateFilter]);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const response = await autoApplyAPI.getHistory(100);
      const apps = response.data.applications || [];
      setApplications(apps);
      
      // Calculate stats
      const newStats = {
        total: apps.length,
        ready_to_apply: apps.filter(a => a.status === 'ready_to_apply').length,
        applied: apps.filter(a => a.status === 'applied').length,
        pending: apps.filter(a => a.status === 'pending').length,
        interview: apps.filter(a => a.status === 'interview').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        accepted: apps.filter(a => a.status === 'accepted').length
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.job_title?.toLowerCase().includes(query) ||
        app.company?.toLowerCase().includes(query)
      );
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(app => new Date(app.applied_at) >= today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(app => new Date(app.applied_at) >= weekAgo);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(app => new Date(app.applied_at) >= monthAgo);
      }
    }
    
    setFilteredApplications(filtered);
  };

  const handleSubmitApplication = async (applicationId) => {
    setSubmittingId(applicationId);
    try {
      const response = await autoApplyAPI.submitApplication(applicationId);
      
      if (response.data.success) {
        toast.success('Application submitted successfully!');
        loadApplications();
      } else {
        toast.error(response.data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit application');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleViewResume = (application) => {
    setSelectedApplication(application);
    setShowResumeDialog(true);
  };

  const handleDownloadResume = (applicationId) => {
    window.open(
      `${process.env.REACT_APP_BACKEND_URL}/api/applications/${applicationId}/saved-resume`,
      '_blank'
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ready_to_apply: { label: 'Ready to Apply', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      applied: { label: 'Applied', color: 'bg-green-100 text-green-700 border-green-200' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      interview: { label: 'Interview', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
      accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      submission_failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200' }
    };
    
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Applications</h1>
            <p className="text-slate-600">Track and manage all your job applications</p>
          </div>

          {/* Stats Cards */}
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <StaggerItem>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-sm text-slate-600">Total</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats.ready_to_apply}</p>
                  <p className="text-sm text-blue-600">Ready</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats.applied}</p>
                  <p className="text-sm text-green-600">Applied</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{stats.interview}</p>
                  <p className="text-sm text-purple-600">Interview</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-gradient-to-br from-red-50 to-red-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                  <p className="text-sm text-red-600">Rejected</p>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats.accepted}</p>
                  <p className="text-sm text-emerald-600">Accepted</p>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm text-slate-600 mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by job title or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="w-40">
                  <Label className="text-sm text-slate-600 mb-1 block">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ready_to_apply">Ready to Apply</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-40">
                  <Label className="text-sm text-slate-600 mb-1 block">Date</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="outline" onClick={loadApplications}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Applications List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Applications Found</h3>
                <p className="text-slate-500">
                  {applications.length === 0 
                    ? "Run Auto-Apply from the Live Jobs page to start applying to jobs automatically."
                    : "No applications match your current filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app, index) => (
                <motion.div
                  key={app.application_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Job Info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100">
                              <Briefcase className="w-5 h-5 text-violet-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900">{app.job_title}</h3>
                                {getStatusBadge(app.status)}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  {app.company}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {app.location || 'Remote'}
                                </span>
                              </div>
                              
                              {/* Timestamps */}
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Created: {formatDate(app.applied_at)}
                                </span>
                                {app.submitted_at && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Submitted: {formatDate(app.submitted_at)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Features */}
                              <div className="flex items-center gap-2 mt-3">
                                {/* ATS Score Badge */}
                                {(app.ats_score || app.ats_grade) && (
                                  <Badge className={`text-xs ${
                                    (app.ats_score || 0) >= 90 ? 'bg-green-100 text-green-700 border-green-200' :
                                    (app.ats_score || 0) >= 80 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    'bg-amber-100 text-amber-700 border-amber-200'
                                  }`}>
                                    <Target className="w-3 h-3 mr-1" />
                                    ATS: {app.ats_score || 'N/A'} ({app.ats_grade || 'B'})
                                  </Badge>
                                )}
                                {app.resume_saved && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Resume Tailored
                                  </Badge>
                                )}
                                {app.cover_letter_generated && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Cover Letter
                                  </Badge>
                                )}
                                {app.ats_optimized && !app.ats_score && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <Target className="w-3 h-3 mr-1" />
                                    ATS Optimized
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {/* View Resume Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResume(app)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Resume
                          </Button>
                          
                          {/* Download Resume */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadResume(app.application_id)}
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          
                          {/* View Job */}
                          {app.apply_link && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(app.apply_link, '_blank')}
                              className="gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Job
                            </Button>
                          )}
                          
                          {/* Submit Button (for ready_to_apply) */}
                          {app.status === 'ready_to_apply' && (
                            <Button
                              size="sm"
                              onClick={() => handleSubmitApplication(app.application_id)}
                              disabled={submittingId === app.application_id}
                              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                            >
                              {submittingId === app.application_id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  Submit
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Resume Preview Dialog */}
        <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                Tailored Resume - {selectedApplication?.job_title}
              </DialogTitle>
              <DialogDescription>
                Resume customized for {selectedApplication?.company}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="resume" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resume">Tailored Resume</TabsTrigger>
                <TabsTrigger value="cover">Cover Letter</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resume" className="mt-4">
                <ScrollArea className="h-[50vh] border rounded-lg p-4 bg-white">
                  {selectedApplication?.tailored_content ? (
                    <div className="whitespace-pre-wrap font-mono text-sm">
                      {selectedApplication.tailored_content}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      No tailored resume content available. Click Download to get the resume file.
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="cover" className="mt-4">
                <ScrollArea className="h-[50vh] border rounded-lg p-4 bg-white">
                  {selectedApplication?.cover_letter ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {selectedApplication.cover_letter}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      No cover letter available for this application.
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => handleDownloadResume(selectedApplication?.application_id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Resume
              </Button>
              <Button onClick={() => setShowResumeDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </DashboardLayout>
  );
}

export default ApplicationsPage;
