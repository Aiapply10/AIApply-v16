import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { emailAPI, applicationAPI } from '../lib/api';
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
  Mail, 
  Send,
  Inbox,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Reply
} from 'lucide-react';
import { toast } from 'sonner';

export function EmailsPage() {
  const [emails, setEmails] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');

  const [composeForm, setComposeForm] = useState({
    application_id: '',
    subject: '',
    content: '',
    email_type: 'sent',
  });

  const [replyForm, setReplyForm] = useState({
    original_email: '',
    context: '',
    tone: 'professional',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [emailsRes, appsRes] = await Promise.all([
        emailAPI.getAll(),
        applicationAPI.getAll()
      ]);
      setEmails(emailsRes.data);
      setApplications(appsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompose = async () => {
    if (!composeForm.application_id || !composeForm.subject || !composeForm.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await emailAPI.create(composeForm);
      toast.success('Email recorded successfully!');
      setShowComposeDialog(false);
      setComposeForm({
        application_id: '',
        subject: '',
        content: '',
        email_type: 'sent',
      });
      loadData();
    } catch (error) {
      toast.error('Failed to record email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!replyForm.original_email) {
      toast.error('Please enter the original email');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await emailAPI.generateReply(replyForm);
      setGeneratedReply(response.data.generated_reply);
      toast.success('Reply generated!');
    } catch (error) {
      toast.error('Failed to generate reply');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEmailTypeIcon = (type) => {
    switch (type) {
      case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
      case 'received': return <Inbox className="w-4 h-4 text-green-500" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getEmailTypeBadge = (type) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-700',
      received: 'bg-green-100 text-green-700',
      scheduled: 'bg-amber-100 text-amber-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

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
      <div className="space-y-8" data-testid="emails-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">Email Center</h1>
            <p className="text-muted-foreground mt-1">
              Manage your job application communications
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowReplyDialog(true)}
              data-testid="ai-reply-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Reply Helper
            </Button>
            <Button 
              onClick={() => setShowComposeDialog(true)}
              data-testid="compose-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Email
            </Button>
          </div>
        </div>

        {/* Email Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({emails.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({emails.filter(e => e.email_type === 'sent').length})</TabsTrigger>
            <TabsTrigger value="received">Received ({emails.filter(e => e.email_type === 'received').length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({emails.filter(e => e.email_type === 'scheduled').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <EmailList emails={emails} formatDate={formatDate} getEmailTypeIcon={getEmailTypeIcon} getEmailTypeBadge={getEmailTypeBadge} />
          </TabsContent>
          <TabsContent value="sent" className="mt-6">
            <EmailList emails={emails.filter(e => e.email_type === 'sent')} formatDate={formatDate} getEmailTypeIcon={getEmailTypeIcon} getEmailTypeBadge={getEmailTypeBadge} />
          </TabsContent>
          <TabsContent value="received" className="mt-6">
            <EmailList emails={emails.filter(e => e.email_type === 'received')} formatDate={formatDate} getEmailTypeIcon={getEmailTypeIcon} getEmailTypeBadge={getEmailTypeBadge} />
          </TabsContent>
          <TabsContent value="scheduled" className="mt-6">
            <EmailList emails={emails.filter(e => e.email_type === 'scheduled')} formatDate={formatDate} getEmailTypeIcon={getEmailTypeIcon} getEmailTypeBadge={getEmailTypeBadge} />
          </TabsContent>
        </Tabs>

        {/* Compose Dialog */}
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Email Communication</DialogTitle>
              <DialogDescription>
                Keep track of emails related to your job applications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Related Application *</Label>
                  <Select
                    value={composeForm.application_id}
                    onValueChange={(value) => setComposeForm({ ...composeForm, application_id: value })}
                  >
                    <SelectTrigger data-testid="email-application-select">
                      <SelectValue placeholder="Select application" />
                    </SelectTrigger>
                    <SelectContent>
                      {applications.map((app) => (
                        <SelectItem key={app.application_id} value={app.application_id}>
                          {app.job_title} - {app.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email Type *</Label>
                  <Select
                    value={composeForm.email_type}
                    onValueChange={(value) => setComposeForm({ ...composeForm, email_type: value })}
                  >
                    <SelectTrigger data-testid="email-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  placeholder="Email subject"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  data-testid="email-subject"
                />
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  placeholder="Email content..."
                  rows={8}
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                  data-testid="email-content"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowComposeDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCompose} disabled={isSubmitting} data-testid="save-email">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Save Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Reply Dialog */}
        <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Email Reply Helper</DialogTitle>
              <DialogDescription>
                Generate professional email replies using AI
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Original Email *</Label>
                <Textarea
                  placeholder="Paste the email you received..."
                  rows={6}
                  value={replyForm.original_email}
                  onChange={(e) => setReplyForm({ ...replyForm, original_email: e.target.value })}
                  data-testid="original-email"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Context/Instructions</Label>
                  <Input
                    placeholder="e.g., Accept the interview, propose alternative time"
                    value={replyForm.context}
                    onChange={(e) => setReplyForm({ ...replyForm, context: e.target.value })}
                    data-testid="reply-context"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={replyForm.tone}
                    onValueChange={(value) => setReplyForm({ ...replyForm, tone: value })}
                  >
                    <SelectTrigger data-testid="reply-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                className="w-full gradient-ai text-white"
                onClick={handleGenerateReply}
                disabled={isGenerating}
                data-testid="generate-reply-btn"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Reply
              </Button>
              {generatedReply && (
                <div className="space-y-2">
                  <Label>Generated Reply</Label>
                  <Textarea
                    value={generatedReply}
                    onChange={(e) => setGeneratedReply(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    data-testid="generated-reply"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedReply);
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

function EmailList({ emails, formatDate, getEmailTypeIcon, getEmailTypeBadge }) {
  if (emails.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Mail className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-xl font-semibold mb-2">No Emails</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Start recording your email communications to keep track of your job application correspondence.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <Card key={email.email_id} className="hover:shadow-md transition-shadow">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {getEmailTypeIcon(email.email_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{email.subject}</h3>
                  <Badge className={getEmailTypeBadge(email.email_type)}>
                    {email.email_type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{email.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(email.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default EmailsPage;
