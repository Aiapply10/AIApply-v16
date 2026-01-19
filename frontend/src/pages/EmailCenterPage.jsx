import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/DashboardLayout';
import { emailCenterAPI, resumeAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
  DialogFooter,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Mail, 
  Send,
  Inbox,
  Settings,
  Loader2,
  Plus,
  Sparkles,
  Reply,
  Trash2,
  RefreshCw,
  Link2,
  LinkIcon,
  AlertCircle,
  CheckCircle2,
  User,
  Building,
  FileText,
  Star,
  MailOpen,
  ExternalLink,
  Copy,
  Edit3,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem 
} from '../components/ui/animations';

export function EmailCenterPage() {
  const [accounts, setAccounts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [history, setHistory] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [settings, setSettings] = useState({
    auto_reply_enabled: false,
    auto_apply_compose: true,
    reply_approval_required: true,
    signature: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts');
  
  // Dialogs
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  
  // Form states
  const [connectForm, setConnectForm] = useState({
    provider: 'gmail',
    email_address: '',
    password: '',
    imap_host: '',
    imap_port: 993,
    smtp_host: '',
    smtp_port: 587,
    use_ssl: true
  });
  
  const [composeForm, setComposeForm] = useState({
    job_title: '',
    company_name: '',
    job_description: '',
    resume_id: '',
    recipient_email: '',
    tone: 'professional'
  });
  
  const [replyForm, setReplyForm] = useState({
    original_email: '',
    original_subject: '',
    sender_email: '',
    context: '',
    tone: 'professional'
  });
  
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accountsRes, settingsRes, resumesRes, historyRes] = await Promise.all([
        emailCenterAPI.getAccounts(),
        emailCenterAPI.getSettings(),
        resumeAPI.getAll(),
        emailCenterAPI.getHistory(20)
      ]);
      
      setAccounts(accountsRes.data || []);
      setSettings(settingsRes.data || settings);
      setResumes(resumesRes.data || []);
      setHistory(historyRes.data || []);
      
      // If there are accounts, load inbox
      if (accountsRes.data?.length > 0) {
        await loadInbox();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInbox = async (accountId = null) => {
    setIsRefreshing(true);
    try {
      const response = await emailCenterAPI.getInbox(accountId, 20);
      setInbox(response.data?.messages || []);
    } catch (error) {
      console.error('Error loading inbox:', error);
      toast.error('Failed to load inbox');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnectProvider = (provider) => {
    // Pre-fill settings based on provider
    if (provider === 'gmail') {
      setConnectForm({
        ...connectForm,
        provider: 'imap',
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587
      });
    } else if (provider === 'outlook') {
      setConnectForm({
        ...connectForm,
        provider: 'imap',
        imap_host: 'outlook.office365.com',
        imap_port: 993,
        smtp_host: 'smtp.office365.com',
        smtp_port: 587
      });
    } else {
      setConnectForm({
        ...connectForm,
        provider: 'imap',
        imap_host: '',
        smtp_host: ''
      });
    }
    setShowConnectDialog(true);
  };

  const handleConnect = async () => {
    if (!connectForm.email_address || !connectForm.password) {
      toast.error('Email and password are required');
      return;
    }
    
    setIsConnecting(true);
    try {
      await emailCenterAPI.connectIMAP(connectForm);
      toast.success('Email account connected successfully!');
      setShowConnectDialog(false);
      setConnectForm({
        provider: 'gmail',
        email_address: '',
        password: '',
        imap_host: '',
        imap_port: 993,
        smtp_host: '',
        smtp_port: 587,
        use_ssl: true
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect email');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) return;
    
    try {
      await emailCenterAPI.disconnectAccount(accountId);
      toast.success('Email account disconnected');
      loadData();
    } catch (error) {
      toast.error('Failed to disconnect account');
    }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      await emailCenterAPI.setPrimaryAccount(accountId);
      toast.success('Primary account updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update primary account');
    }
  };

  const handleGenerateApplication = async () => {
    if (!composeForm.job_title || !composeForm.company_name || !composeForm.resume_id || !composeForm.recipient_email) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await emailCenterAPI.composeApplication(composeForm);
      setGeneratedEmail(response.data);
      toast.success('Application email generated!');
    } catch (error) {
      toast.error('Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!replyForm.original_email || !replyForm.sender_email) {
      toast.error('Please provide the original email and sender');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await emailCenterAPI.draftReply(replyForm);
      setGeneratedEmail(response.data);
      toast.success('Reply drafted!');
    } catch (error) {
      toast.error('Failed to draft reply');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!generatedEmail) return;
    
    if (accounts.length === 0) {
      toast.error('Please connect an email account first');
      return;
    }
    
    setIsSending(true);
    try {
      const emailData = {
        to_addresses: [generatedEmail.recipient || generatedEmail.reply_to],
        subject: generatedEmail.subject || `Re: ${generatedEmail.original_subject}`,
        body: generatedEmail.body || generatedEmail.reply_body,
        body_type: 'text'
      };
      
      await emailCenterAPI.sendEmail(emailData);
      toast.success('Email sent successfully!');
      setGeneratedEmail(null);
      setShowComposeDialog(false);
      setShowReplyDialog(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateSettings = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await emailCenterAPI.updateSettings(newSettings);
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleReplyToEmail = (email) => {
    setReplyForm({
      original_email: email.body_preview,
      original_subject: email.subject,
      sender_email: email.from_email,
      context: '',
      tone: 'professional'
    });
    setGeneratedEmail(null);
    setShowReplyDialog(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-8 h-8 text-blue-600" />
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Email Center</h1>
              <p className="text-slate-500 mt-1">Manage your email accounts and let AI handle your job applications</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => loadData()}
                disabled={isRefreshing}
                className="border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setShowComposeDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={accounts.length === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Compose
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Stats with Animation */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StaggerItem>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-100">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Connected Accounts</p>
                        <p className="text-2xl font-bold text-slate-900">{accounts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
            <StaggerItem>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-green-100">
                        <Send className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Emails Sent</p>
                        <p className="text-2xl font-bold text-slate-900">{history.filter(h => h.type === 'sent').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
            <StaggerItem>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-100">
                        <Inbox className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Inbox Messages</p>
                        <p className="text-2xl font-bold text-slate-900">{inbox.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
            <StaggerItem>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-violet-100">
                        <Zap className="w-6 h-6 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Auto Replies</p>
                        <p className="text-2xl font-bold text-slate-900">{settings.auto_reply_enabled ? 'ON' : 'OFF'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          </StaggerContainer>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="accounts" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="w-4 h-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Send className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4 mt-6">
            {accounts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Mail className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Email Accounts Connected</h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Connect your email account to enable AI-powered job applications and recruiter communication.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={() => handleConnectProvider('gmail')} variant="outline" className="gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Connect Gmail
                    </Button>
                    <Button onClick={() => handleConnectProvider('outlook')} variant="outline" className="gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0078D4">
                        <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V5.8q.54.24.84.7.3.46.3 1.01v.49L24 12zm-6-8.95v3.94h1.7q.17 0 .28-.1.1-.1.1-.28V3.05q0-.17-.1-.28-.1-.1-.28-.1h-1.7zm-1 5.62V2.75H12V9.3l-.78-.56v.25q0 .54-.31 1-.3.47-.83.65l.14.1 6.78 4.97V8.67zm-7.9 4.24q0-.9.27-1.63.28-.72.82-1.22.54-.5 1.33-.77.78-.26 1.8-.26.74 0 1.38.16.63.17 1.12.45.5.28.83.66.34.38.54.82.2.44.3.93.1.48.1 1q0 .77-.22 1.42-.22.65-.65 1.12-.43.47-1.07.74-.64.27-1.47.27H7.1v5.93H1V6h6.5v3.95h.4zm6.9 1.09q0-.65.09-1.2.1-.54.33-.92.22-.38.6-.6.38-.2 1-.2.49 0 .85.16.36.16.58.43.22.28.33.65.11.36.11.79 0 .24-.03.47-.03.24-.1.45l-.5-1.75-2.26 1.6z"/>
                      </svg>
                      Connect Outlook
                    </Button>
                    <Button onClick={() => handleConnectProvider('other')} variant="outline" className="gap-2">
                      <Mail className="w-5 h-5" />
                      Other (IMAP)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => handleConnectProvider('gmail')} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                  </Button>
                </div>
                
                {accounts.map((account) => (
                  <Card key={account.account_id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                            <Mail className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">{account.email_address}</p>
                              {account.is_primary && (
                                <Badge className="bg-violet-100 text-violet-700">Primary</Badge>
                              )}
                              {account.is_connected && (
                                <Badge className="bg-green-100 text-green-700">Connected</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              Provider: {account.provider?.toUpperCase()} | 
                              Connected: {new Date(account.connected_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!account.is_primary && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSetPrimary(account.account_id)}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Set Primary
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDisconnect(account.account_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inbox Tab */}
          <TabsContent value="inbox" className="space-y-4 mt-6">
            {accounts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect an Email Account First</h3>
                  <p className="text-slate-500">Go to the Accounts tab to connect your email.</p>
                </CardContent>
              </Card>
            ) : inbox.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <MailOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Messages</h3>
                  <p className="text-slate-500">Your inbox is empty or we couldn't fetch messages.</p>
                  <Button variant="outline" className="mt-4" onClick={() => loadInbox()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Inbox
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {inbox.map((email, index) => (
                  <Card 
                    key={email.message_id || index} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${email.is_recruiter ? 'border-l-4 border-l-violet-500' : ''}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900 truncate">
                              {email.from_name || email.from_email}
                            </p>
                            {email.is_recruiter && (
                              <Badge className="bg-violet-100 text-violet-700 text-xs">Recruiter</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate mb-1">{email.from_email}</p>
                          <p className="font-medium text-slate-800">{email.subject || '(No Subject)'}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 mt-1">{email.body_preview}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <p className="text-xs text-slate-400 whitespace-nowrap">
                            {email.received_at ? new Date(email.received_at).toLocaleDateString() : 'Unknown'}
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReplyToEmail(email)}
                            className="gap-1"
                          >
                            <Reply className="w-3 h-3" />
                            AI Reply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-6">
            {history.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Send className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Email History</h3>
                  <p className="text-slate-500">Emails you send will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((item, index) => (
                  <Card key={item.history_id || index}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={item.type === 'sent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                              {item.type === 'sent' ? 'Sent' : 'Received'}
                            </Badge>
                            <p className="font-medium text-slate-900">{item.subject}</p>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            To: {item.to_addresses?.join(', ')}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {item.sent_at ? new Date(item.sent_at).toLocaleString() : ''}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Center Settings</CardTitle>
                <CardDescription>Configure how AI handles your emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Auto-Compose Applications</Label>
                    <p className="text-sm text-slate-500">AI will draft job application emails for auto-apply</p>
                  </div>
                  <Switch 
                    checked={settings.auto_apply_compose}
                    onCheckedChange={(v) => handleUpdateSettings('auto_apply_compose', v)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Require Approval for Replies</Label>
                    <p className="text-sm text-slate-500">Review AI-drafted replies before sending</p>
                  </div>
                  <Switch 
                    checked={settings.reply_approval_required}
                    onCheckedChange={(v) => handleUpdateSettings('reply_approval_required', v)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email Signature</Label>
                  <Textarea 
                    placeholder="Your email signature..."
                    value={settings.signature || ''}
                    onChange={(e) => handleUpdateSettings('signature', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Connect Email Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Email Account</DialogTitle>
            <DialogDescription>
              Enter your email credentials. We recommend using an App Password for security.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Use an App Password instead of your regular password.
                <a 
                  href="https://myaccount.google.com/apppasswords" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-amber-600 underline"
                >
                  Create App Password
                </a>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email"
                placeholder="you@gmail.com"
                value={connectForm.email_address}
                onChange={(e) => setConnectForm({...connectForm, email_address: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>App Password</Label>
              <Input 
                type="password"
                placeholder="Your app password"
                value={connectForm.password}
                onChange={(e) => setConnectForm({...connectForm, password: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IMAP Host</Label>
                <Input 
                  value={connectForm.imap_host}
                  onChange={(e) => setConnectForm({...connectForm, imap_host: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input 
                  value={connectForm.smtp_host}
                  onChange={(e) => setConnectForm({...connectForm, smtp_host: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              AI Compose Job Application
            </DialogTitle>
            <DialogDescription>
              Let AI write a personalized application email for you
            </DialogDescription>
          </DialogHeader>
          
          {!generatedEmail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input 
                    placeholder="e.g., Senior Software Engineer"
                    value={composeForm.job_title}
                    onChange={(e) => setComposeForm({...composeForm, job_title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input 
                    placeholder="e.g., Google"
                    value={composeForm.company_name}
                    onChange={(e) => setComposeForm({...composeForm, company_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Recipient Email *</Label>
                <Input 
                  type="email"
                  placeholder="recruiter@company.com"
                  value={composeForm.recipient_email}
                  onChange={(e) => setComposeForm({...composeForm, recipient_email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Select Resume *</Label>
                <Select 
                  value={composeForm.resume_id}
                  onValueChange={(v) => setComposeForm({...composeForm, resume_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.resume_id} value={r.resume_id}>
                        {r.file_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea 
                  placeholder="Paste the job description here..."
                  value={composeForm.job_description}
                  onChange={(e) => setComposeForm({...composeForm, job_description: e.target.value})}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select 
                  value={composeForm.tone}
                  onValueChange={(v) => setComposeForm({...composeForm, tone: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowComposeDialog(false)}>Cancel</Button>
                <Button onClick={handleGenerateApplication} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Email
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">To</Label>
                  <p className="font-medium">{generatedEmail.recipient}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Subject</Label>
                  <Input 
                    value={generatedEmail.subject}
                    onChange={(e) => setGeneratedEmail({...generatedEmail, subject: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Body</Label>
                  <Textarea 
                    value={generatedEmail.body}
                    onChange={(e) => setGeneratedEmail({...generatedEmail, body: e.target.value})}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setGeneratedEmail(null)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`);
                    toast.success('Copied to clipboard!');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={isSending}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Email
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5 text-violet-600" />
              AI Draft Reply
            </DialogTitle>
            <DialogDescription>
              Let AI draft a professional reply to the recruiter
            </DialogDescription>
          </DialogHeader>
          
          {!generatedEmail ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Replying to:</p>
                <p className="font-medium">{replyForm.sender_email}</p>
                <p className="text-sm text-slate-600 mt-2">Subject: {replyForm.original_subject}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Original Email Content</Label>
                <Textarea 
                  value={replyForm.original_email}
                  onChange={(e) => setReplyForm({...replyForm, original_email: e.target.value})}
                  rows={4}
                  placeholder="Paste the full email content here..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Additional Context (Optional)</Label>
                <Textarea 
                  value={replyForm.context}
                  onChange={(e) => setReplyForm({...replyForm, context: e.target.value})}
                  rows={2}
                  placeholder="e.g., I'm available for calls next week, I'm interested but need visa sponsorship..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select 
                  value={replyForm.tone}
                  onValueChange={(v) => setReplyForm({...replyForm, tone: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReplyDialog(false)}>Cancel</Button>
                <Button onClick={handleGenerateReply} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Draft Reply
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Reply To</Label>
                  <p className="font-medium">{generatedEmail.reply_to}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Subject</Label>
                  <p className="text-slate-700">Re: {generatedEmail.original_subject}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Reply Body</Label>
                  <Textarea 
                    value={generatedEmail.reply_body}
                    onChange={(e) => setGeneratedEmail({...generatedEmail, reply_body: e.target.value})}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setGeneratedEmail(null)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedEmail.reply_body);
                    toast.success('Copied to clipboard!');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={isSending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Reply
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
      </PageTransition>
    </DashboardLayout>
  );
}

export default EmailCenterPage;
