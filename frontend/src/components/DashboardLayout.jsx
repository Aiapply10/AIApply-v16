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
  User
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-violet-400' },
  { href: '/profile', label: 'My Profile', icon: User, color: 'text-fuchsia-400' },
  { href: '/resumes', label: 'My Resumes', icon: FileText, color: 'text-cyan-400' },
  { href: '/live-jobs', label: 'Live Jobs', icon: Sparkles, color: 'text-pink-400' },
  { href: '/live-jobs-2', label: 'Live Jobs 2', icon: Zap, color: 'text-cyan-400' },
  { href: '/jobs', label: 'Job Portals', icon: Briefcase, color: 'text-green-400' },
  { href: '/applications', label: 'Applications', icon: Send, color: 'text-orange-400' },
  { href: '/emails', label: 'Email Center', icon: Mail, color: 'text-blue-400' },
  { href: '/reports', label: 'My Reports', icon: BarChart3, color: 'text-yellow-400' },
];

const adminNavItems = [
  { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard, color: 'text-violet-400' },
  { href: '/admin/candidates', label: 'All Candidates', icon: Users, color: 'text-cyan-400' },
  { href: '/admin/portals', label: 'Job Portals', icon: Globe, color: 'text-pink-400' },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, color: 'text-green-400' },
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
    <div className="min-h-screen bg-background noise-overlay">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hover:bg-white/10"
          data-testid="mobile-menu-toggle"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-heading font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">CareerQuest</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-white/10" data-testid="user-menu-mobile">
              <Avatar className="w-8 h-8 ring-2 ring-violet-500/50">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-violet-600">{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/10">
            <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-white/10">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-500/20 text-red-400">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen glass border-r border-white/10 transition-transform lg:translate-x-0 w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-violet-500/50 transition-shadow group-hover:scale-105 duration-300">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-heading font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">CareerQuest</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/30 border border-violet-500/50 shadow-lg shadow-violet-500/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? item.color : 'text-muted-foreground group-hover:' + item.color}`} />
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-white'}`}>
                    {item.label}
                  </span>
                  {item.label === 'Live Jobs' && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-xs font-semibold animate-pulse">
                      LIVE
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 group"
                  data-testid="user-menu-desktop"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-violet-500/50 group-hover:ring-violet-400 transition-all">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm truncate text-white">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass border-white/10">
                <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-500/20 text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen relative">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
