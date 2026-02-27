import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import DeploymentsPage from '@/pages/DeploymentsPage';
import DeployWizardPage from '@/pages/DeployWizard';

import DeployHubPage from '@/pages/DeployHubPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-[--color-text-primary]">{title}</h2>
      <p className="text-sm text-[--color-text-muted]">Coming in the next phase.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/deployments" element={<DeploymentsPage />} />
          <Route path="/deployments/:suffix" element={<PlaceholderPage title="Deployment Detail" />} />
          <Route path="/deployments/:suffix/logs" element={<PlaceholderPage title="Logs" />} />
          <Route path="/deploy/new" element={<DeployHubPage />} />
          <Route path="/deploy/wizard" element={<DeployWizardPage />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
