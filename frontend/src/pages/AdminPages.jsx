import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { reportAPI, jobPortalAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  Send, 
  CheckCircle2, 
  Clock, 
  Globe,
  Loader2,
  Plus,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
const technologies = ['Java', 'Python', 'PHP', 'AI', 'React'];

// Admin Dashboard
export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await reportAPI.getAdmin();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setIsLoading(false);
    }
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

  const techChartData = stats?.technology_breakdown 
    ? Object.entries(stats.technology_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const statusChartData = stats?.status_breakdown 
    ? Object.entries(stats.status_breakdown).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
      }))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="admin-dashboard">
        <div>
          <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of all candidates and applications</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
                  <p className="text-3xl font-bold">{stats?.total_candidates || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                  <p className="text-3xl font-bold">{stats?.total_applications || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Send className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Interviews</p>
                  <p className="text-3xl font-bold">{stats?.total_interviews || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Offers</p>
                  <p className="text-3xl font-bold">{stats?.total_offers || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Applications by Technology</CardTitle>
              <CardDescription>Distribution across tech stacks</CardDescription>
            </CardHeader>
            <CardContent>
              {techChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={techChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Status Overview</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Latest candidates who signed up</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_registrations?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Technology</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent_registrations.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.primary_technology || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent registrations</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Admin Candidates Page
export function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadCandidates();
  }, [page]);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await reportAPI.getAllCandidates(page * limit, limit);
      setCandidates(response.data.candidates);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
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
      <div className="space-y-8" data-testid="admin-candidates">
        <div>
          <h1 className="font-heading text-3xl font-bold">All Candidates</h1>
          <p className="text-muted-foreground mt-1">
            {total} registered candidate{total !== 1 ? 's' : ''}
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Technology</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Interviews</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.user_id}>
                    <TableCell className="font-medium">{candidate.name}</TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{candidate.primary_technology || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{candidate.total_applications || 0}</TableCell>
                    <TableCell>{candidate.total_interviews || 0}</TableCell>
                    <TableCell>
                      {new Date(candidate.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Admin Job Portals Page
export function AdminPortalsPage() {
  const [portals, setPortals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPortal, setEditingPortal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    technology: '',
    description: '',
  });

  useEffect(() => {
    loadPortals();
  }, []);

  const loadPortals = async () => {
    setIsLoading(true);
    try {
      const response = await jobPortalAPI.getAll();
      setPortals(response.data);
    } catch (error) {
      toast.error('Failed to load portals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.url || !formData.technology) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPortal) {
        await jobPortalAPI.update(editingPortal.portal_id, formData);
        toast.success('Portal updated successfully');
      } else {
        await jobPortalAPI.create(formData);
        toast.success('Portal created successfully');
      }
      setShowDialog(false);
      resetForm();
      loadPortals();
    } catch (error) {
      toast.error('Failed to save portal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (portalId) => {
    if (!window.confirm('Are you sure you want to delete this portal?')) return;
    
    try {
      await jobPortalAPI.delete(portalId);
      toast.success('Portal deleted');
      loadPortals();
    } catch (error) {
      toast.error('Failed to delete portal');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', technology: '', description: '' });
    setEditingPortal(null);
  };

  const openEditDialog = (portal) => {
    setEditingPortal(portal);
    setFormData({
      name: portal.name,
      url: portal.url,
      technology: portal.technology,
      description: portal.description || '',
    });
    setShowDialog(true);
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
      <div className="space-y-8" data-testid="admin-portals">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Job Portals Management</h1>
            <p className="text-muted-foreground mt-1">Manually add and manage job portal links for candidates</p>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="add-portal-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Portal Link
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-sm text-amber-400">
            <strong>Manual Entry Mode:</strong> Add job portal links manually. Each portal will be visible to candidates 
            filtered by their primary technology. A web crawler for automated discovery is planned for future release.
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Technology</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portals.map((portal) => (
                  <TableRow key={portal.portal_id}>
                    <TableCell className="font-medium">{portal.name}</TableCell>
                    <TableCell>
                      <a href={portal.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {portal.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{portal.technology}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{portal.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(portal)}
                          data-testid={`edit-${portal.portal_id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(portal.portal_id)}
                          data-testid={`delete-${portal.portal_id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {portals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No job portals added yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPortal ? 'Edit Portal' : 'Add New Portal'}</DialogTitle>
              <DialogDescription>
                {editingPortal ? 'Update the job portal details' : 'Add a new job portal link for candidates'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Portal Name *</Label>
                <Input
                  placeholder="e.g., LinkedIn Jobs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="portal-name"
                />
              </div>
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  data-testid="portal-url"
                />
              </div>
              <div className="space-y-2">
                <Label>Technology *</Label>
                <Select
                  value={formData.technology}
                  onValueChange={(value) => setFormData({ ...formData, technology: value })}
                >
                  <SelectTrigger data-testid="portal-tech">
                    <SelectValue placeholder="Select technology" />
                  </SelectTrigger>
                  <SelectContent>
                    {technologies.map((tech) => (
                      <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="portal-description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting} data-testid="save-portal">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPortal ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Admin Reports Page
export function AdminReportsPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await reportAPI.getAdmin();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
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

  const conversionRate = stats?.total_applications > 0 
    ? ((stats?.total_offers || 0) / stats.total_applications * 100).toFixed(1)
    : 0;

  const interviewRate = stats?.total_applications > 0 
    ? ((stats?.total_interviews || 0) / stats.total_applications * 100).toFixed(1)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="admin-reports">
        <div>
          <h1 className="font-heading text-3xl font-bold">Company Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive analytics and insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
                <p className="text-4xl font-bold text-green-600">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Applications to Offers</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Interview Rate</p>
                <p className="text-4xl font-bold text-purple-600">{interviewRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Applications to Interviews</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Active Portals</p>
                <p className="text-4xl font-bold text-blue-600">{stats?.active_portals || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Job listing sources</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold">User Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Candidates</span>
                    <span className="font-semibold">{stats?.total_candidates || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Applications</span>
                    <span className="font-semibold">{stats?.total_applications || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Interviews</span>
                    <span className="font-semibold">{stats?.total_interviews || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Offers</span>
                    <span className="font-semibold">{stats?.total_offers || 0}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Technology Breakdown</h4>
                <div className="space-y-2">
                  {stats?.technology_breakdown && Object.entries(stats.technology_breakdown).map(([tech, count]) => (
                    <div key={tech} className="flex justify-between">
                      <span>{tech}</span>
                      <span className="font-semibold">{count} applications</span>
                    </div>
                  ))}
                  {(!stats?.technology_breakdown || Object.keys(stats.technology_breakdown).length === 0) && (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
