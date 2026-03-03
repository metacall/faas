import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

// Auth pages (not lazy — they're small and needed immediately)
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

// Simple loading fallback
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token =
    localStorage.getItem('faas_token') ?? (import.meta.env.VITE_FAAS_TOKEN as string | undefined);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes — rendered without AppShell */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

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
    </BrowserRouter>
  );
}
