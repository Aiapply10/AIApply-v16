import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase, 
  Send, 
  Mail, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  Globe,
  ChevronDown,
  Sparkles,
  Zap,
  User,
  Bell
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const candidateNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  { href: '/profile', label: 'My Profile', icon: User, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { href: '/resumes', label: 'My Resumes', icon: FileText, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { href: '/live-jobs', label: 'Live Jobs', icon: Sparkles, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { href: '/jobs', label: 'Job Portals', icon: Briefcase, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { href: '/applications', label: 'Applications', icon: Send, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { href: '/email-center', label: 'Email Center', icon: Mail, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { href: '/reports', label: 'My Reports', icon: BarChart3, color: 'text-rose-600', bgColor: 'bg-rose-100' },
];

const adminNavItems = [
  { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  { href: '/admin/candidates', label: 'All Candidates', icon: Users, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { href: '/admin/portals', label: 'Job Portals', icon: Globe, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
];

export function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : candidateNavItems;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-violet-100/20 to-cyan-100/20 rounded-full blur-3xl" />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hover:bg-slate-100"
          data-testid="mobile-menu-toggle"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
        </Button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-heading font-bold text-xl text-slate-800">CareerQuest</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-slate-100 relative">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-violet-600 rounded-full" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-slate-100" data-testid="user-menu-mobile">
                <Avatar className="w-8 h-8 ring-2 ring-violet-200">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-sm">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-200 shadow-xl">
              <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-slate-100 text-slate-700">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200" />
              <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50 text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200 transition-transform lg:translate-x-0 w-72 shadow-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all duration-300 group-hover:scale-105">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <span className="font-heading font-bold text-xl text-slate-800">CareerQuest</span>
                <p className="text-xs text-slate-500">AI-Powered Job Search</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Main Menu</p>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-white/20' : item.bgColor
                  }`}>
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {item.label === 'Live Jobs' && (
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                    }`}>
                      LIVE
                    </span>
                  )}
                  {item.label === 'Live Jobs 2' && (
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-all duration-200 group shadow-sm bg-white"
                  data-testid="user-menu-desktop"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-violet-100 group-hover:ring-violet-200 transition-all">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm text-slate-800 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-slate-100 text-slate-700">
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-slate-100 text-slate-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50 text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen relative">
        {/* Top bar for desktop */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/60 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20">
          <div>
            <h2 className="font-heading font-semibold text-slate-800">
              {navItems.find(item => item.href === location.pathname)?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-slate-500">Welcome back, {user?.name?.split(' ')[0]}!</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-violet-600 rounded-full" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hover:bg-slate-100 gap-2" data-testid="user-menu-topbar">
                  <Avatar className="w-8 h-8 ring-2 ring-violet-100">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-sm">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-slate-100 text-slate-700">
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-slate-100 text-slate-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50 text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
