import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// Auth pages — not lazy (needed immediately, small bundles)
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const DeploymentsPage = lazy(() => import('@/pages/DeploymentsPage'));
const DeployWizardPage = lazy(() => import('@/pages/DeployWizard'));
const DeployRepositoryPage = lazy(() => import('@/pages/DeployRepositoryPage'));
const DeploymentDetailPage = lazy(() => import('@/pages/DeploymentFunctionPage'));
const LogsViewerPage = lazy(() => import('@/pages/LogsViewerPage'));
const DeployHubPage = lazy(() => import('@/pages/DeployPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const PlanPage = lazy(() => import('@/pages/PlanPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));

// Loading fallback shown during lazy-route loading
const PageLoader = () => (
  <div className="grow flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <Spinner size={24} className="text-blue-500" />
      <span className="text-sm font-medium text-slate-500 animate-pulse tracking-widest uppercase">
        Loading route...
      </span>
    </div>
  </div>
);

// Guards a route — while auth is rehydrating shows a spinner,
// then redirects to /login if not authenticated.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={28} className="text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Redirects already-authenticated users away from /login and /signup
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={28} className="text-blue-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <SignupPage />
              </GuestRoute>
            }
          />

          {/* All protected routes inside AppShell */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/deployments" element={<DeploymentsPage />} />
                      <Route path="/deployments/:suffix" element={<DeploymentDetailPage />} />
                      <Route path="/deployments/:suffix/logs" element={<LogsViewerPage />} />
                      <Route path="/deploy/new" element={<DeployHubPage />} />
                      <Route path="/deploy/wizard" element={<DeployWizardPage />} />
                      <Route path="/deploy/repository" element={<DeployRepositoryPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/plans" element={<PlanPage />} />
                      <Route path="/chat" element={<ChatPage />} />
                    </Routes>
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
