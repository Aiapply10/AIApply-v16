import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthCallback, ProtectedRoute, AdminRoute } from './components/AuthComponents';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { ResumesPage } from './pages/ResumesPage';
import { JobsPage } from './pages/JobsPage';
import { LiveJobsPage } from './pages/LiveJobsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { EmailsPage } from './pages/EmailsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { 
  AdminDashboard, 
  AdminCandidatesPage, 
  AdminPortalsPage, 
  AdminReportsPage 
} from './pages/AdminPages';
import './App.css';

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id (Google OAuth callback)
  // This MUST be synchronous during render, NOT in useEffect
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Candidate Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <ResumesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live-jobs"
        element={
          <ProtectedRoute>
            <LiveJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <ApplicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/emails"
        element={
          <ProtectedRoute>
            <EmailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/candidates"
        element={
          <AdminRoute>
            <AdminCandidatesPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/portals"
        element={
          <AdminRoute>
            <AdminPortalsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <AdminReportsPage />
          </AdminRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
