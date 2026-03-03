import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Trash2, Box, ScrollText, Globe, Server, Layers } from 'lucide-react';
import axios from 'axios';
import { api } from '@/api/client';
import type { Deployment } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LanguageBadge } from '@/components/ui/LanguageBadge';
import { FunctionTester } from '@/components/FunctionTester';
import { CopyButton } from '@/components/ui/CopyButton';

// Helper components

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
        {label}
      </span>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{title}</span>
    </div>
  );
}

// Page

export default function DeploymentDetailPage() {
  const { suffix } = useParams();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchDeployment = useCallback(async () => {
    if (!suffix) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.inspectByName(suffix);
      setDeployment(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          !err.response
            ? 'Unable to reach FaaS server. Check backend status and CORS settings.'
            : (err.response.data?.error ?? err.message ?? 'Failed to load deployment.'),
        );
      } else {
        setError((err as Error).message || 'Failed to load deployment.');
      }
    } finally {
      setLoading(false);
    }
  }, [suffix]);

  useEffect(() => { fetchDeployment(); }, [fetchDeployment]);

  const handleDelete = async () => {
    if (!deployment) return;
    setDeleting(true);
    try {
      await api.deployDelete(deployment.prefix, deployment.suffix, deployment.version);
      navigate('/deployments');
    } catch (err: unknown) {
      alert('Failed to delete deployment: ' + (err as Error).message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="grow flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Spinner size={28} />
          <p className="text-sm font-medium">Loading deployment…</p>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !deployment) {
    const isNetwork = Boolean(error?.toLowerCase().includes('unable to reach'));
    return (
      <div className="grow flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="bg-white border border-slate-200 shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
          <div className="p-3 bg-red-50 rounded-full">
            <Box size={22} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isNetwork ? 'Server Unreachable' : 'Deployment Not Found'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">{error}</p>
          </div>
          <button
            onClick={() => navigate('/deployments')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Hub
          </button>
        </div>
      </div>
    );
  }

  const langs = Object.keys(deployment.packages ?? {}).filter(k => k !== 'Unknown');
  const baseUrl =
    (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'http://localhost:9000';
  const invokePath = `${baseUrl}/${deployment.prefix}/${deployment.suffix}/${deployment.version}/call`;
  const totalFns = Object.values(deployment.packages ?? {}).reduce(
    (acc, handles) => acc + handles.reduce((a, h) => a + (h.scope?.funcs?.length ?? 0), 0),
    0,
  );

  return (
    <div className="flex items-stretch justify-center h-[calc(100vh-80px)] p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-6xl flex flex-col bg-white border border-slate-200 shadow-sm overflow-hidden h-full">
        <div className="h-0.5 w-full bg-linear-to-r from-blue-500 via-violet-500 to-rose-400" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
          {/* Left: back and name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/deployments')}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              title="Back"
            >
              <ArrowLeft size={15} />
            </button>

            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">
                    {deployment.suffix}
                  </h1>
                  <StatusBadge status={deployment.status === 'fail' ? 'error' : deployment.status ?? 'create'} />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400 font-medium">
                  <span className="font-mono">{deployment.prefix}</span>
                  <span className="text-slate-200">·</span>
                  <span className="font-mono">{deployment.version}</span>
                  {langs.length > 0 && (
                    <>
                      <span className="text-slate-200">·</span>
                      <div className="flex gap-1">
                        {langs.map(l => (
                          <LanguageBadge key={l} language={l} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchDeployment}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => navigate(`/deployments/${deployment.suffix}/logs`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <ScrollText size={12} />
              View Logs
            </button>

            {/* Delete with inline confirm */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Spinner size={12} /> : <Trash2 size={12} />}
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500  bg-white hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left panel */}
          <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-6 bg-slate-50/40 overflow-y-auto">

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Functions', value: totalFns, icon: <Layers size={13} /> },
                { label: 'Packages', value: Object.keys(deployment.packages ?? {}).length, icon: <Box size={13} /> },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-1 bg-gray-50 border-slate-200 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {item.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="text-xl font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Endpoints */}
            <div className="flex flex-col gap-3">
              <SectionTitle icon={<Globe size={13} />} title="Endpoints" />
              <InfoRow label="Base HTTP URL">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 px-2 py-1.5 font-mono text-[11px] text-slate-700 truncate">
                    {invokePath}
                  </div>
                  <div className="shrink-0">
                    <CopyButton text={invokePath} />
                  </div>
                </div>
              </InfoRow>
            </div>

            {/* Configuration */}
            <div className="flex flex-col gap-3">
              <SectionTitle icon={<Server size={13} />} title="Configuration" />

              <InfoRow label="Exposed Ports">
                {(deployment.ports || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {deployment.ports.map(p => (
                      <span
                        key={p}
                        className="px-2 py-1 bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-600"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No ports exposed</span>
                )}
              </InfoRow>

              <InfoRow label="Environment">
                <div className="bg-white border border-slate-200 px-3 py-2 text-[11px] text-slate-400 italic">
                  Overview not available via API
                </div>
              </InfoRow>
            </div>
          </div>

          {/* Right: function tester */}
          <div className="flex-1 overflow-hidden min-h-0">
            <FunctionTester deployment={deployment} />
          </div>
        </div>
      </div>
    </div>
  );
}

