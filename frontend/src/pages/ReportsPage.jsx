import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { reportAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Loader2,
  Mail,
  Target,
  Bot,
  AlertCircle,
  Calendar,
  Zap,
  Award,
  Briefcase,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#6b7280', '#ec4899', '#14b8a6'];

const STATUS_COLORS = {
  'ready_to_apply': '#3b82f6',
  'applied': '#22c55e',
  'pending': '#f59e0b',
  'interview': '#8b5cf6',
  'rejected': '#ef4444',
  'accepted': '#10b981',
  'submission_failed': '#f97316',
  'offer': '#06b6d4'
};

export function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await reportAPI.getCandidate();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
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

  const statusChartData = stats?.status_breakdown 
    ? Object.entries(stats.status_breakdown).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        fill: STATUS_COLORS[name] || COLORS[0]
      }))
    : [];

  const sourceChartData = stats?.applications_by_source
    ? Object.entries(stats.applications_by_source).map(([name, value], index) => ({
        name: name || 'Direct',
        value,
        fill: COLORS[index % COLORS.length]
      }))
    : [];

  const dateChartData = stats?.applications_by_date || [];

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6" data-testid="reports-page">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track your job search performance and insights
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Activity className="w-3 h-3 mr-1" />
            Updated just now
          </Badge>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600">Total Applications</p>
                    <p className="text-2xl font-bold text-blue-900">{stats?.total_applications || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                    <Send className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600">Auto-Applied</p>
                    <p className="text-2xl font-bold text-green-900">{stats?.auto_applied_count || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600">Interviews</p>
                    <p className="text-2xl font-bold text-purple-900">{stats?.interviews_scheduled || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600">Offers</p>
                    <p className="text-2xl font-bold text-emerald-900">{stats?.offers_received || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-600">Avg ATS Score</p>
                    <p className="text-2xl font-bold text-amber-900">{stats?.avg_ats_score || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600">Failed</p>
                    <p className="text-2xl font-bold text-orange-900">{stats?.failed_count || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-200 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Success Rate Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900">{stats?.success_rate || 0}%</span>
                <span className="text-sm text-muted-foreground mb-1">of applications successful</span>
              </div>
              <Progress value={stats?.success_rate || 0} className="h-2 mt-4" />
            </CardContent>
          </Card>

          {/* This Week Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900">{stats?.weekly_applications || 0}</span>
                <span className="text-sm text-muted-foreground mb-1">applications sent</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Last 7 days activity
              </div>
            </CardContent>
          </Card>

          {/* Resources Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Resumes Uploaded</span>
                  <Badge variant="secondary">{stats?.resume_count || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Emails Tracked</span>
                  <Badge variant="secondary">{stats?.email_count || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="status" className="gap-2">
              <PieChartIcon className="w-4 h-4" />
              Status
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Status Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Status Distribution</CardTitle>
                  <CardDescription>Breakdown of your applications by current status</CardDescription>
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
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-muted-foreground">No application data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Progress Bars */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Progress</CardTitle>
                  <CardDescription>Detailed status breakdown with counts</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.status_breakdown && Object.keys(stats.status_breakdown).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(stats.status_breakdown).map(([status, count], index) => {
                        const percentage = stats.total_applications > 0 
                          ? (count / stats.total_applications) * 100 
                          : 0;
                        const statusName = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return (
                          <div key={status} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{statusName}</span>
                              <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: STATUS_COLORS[status] || COLORS[index % COLORS.length]
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-muted-foreground">No status data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Timeline</CardTitle>
                <CardDescription>Your application activity over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dateChartData.length > 0 ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dateChartData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value) => [`${value} applications`, 'Count']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#8b5cf6" 
                          fillOpacity={1} 
                          fill="url(#colorCount)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="text-center">
                      <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-muted-foreground">No timeline data available yet</p>
                      <p className="text-sm text-muted-foreground">Start applying to jobs to see your activity</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Sources Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications by Source</CardTitle>
                  <CardDescription>Where your job applications are coming from</CardDescription>
                </CardHeader>
                <CardContent>
                  {sourceChartData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sourceChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {sourceChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-muted-foreground">No source data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sources Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Source Breakdown</CardTitle>
                  <CardDescription>Application count by job source</CardDescription>
                </CardHeader>
                <CardContent>
                  {sourceChartData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                            {sourceChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-muted-foreground">No source data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Applications
            </CardTitle>
            <CardDescription>Your latest job application activity</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_applications && stats.recent_applications.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_applications.map((app, index) => (
                  <motion.div
                    key={app.application_id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{app.job_title}</p>
                        <p className="text-sm text-muted-foreground">{app.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline"
                        className={`
                          ${app.status === 'applied' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                          ${app.status === 'ready_to_apply' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          ${app.status === 'interview' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                          ${app.status === 'submission_failed' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                        `}
                      >
                        {app.status?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-muted-foreground">No recent applications</p>
                <p className="text-sm text-muted-foreground">Start applying to jobs to see your activity here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;
