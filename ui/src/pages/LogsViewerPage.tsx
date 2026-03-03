import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Terminal, ChevronRight } from 'lucide-react';
import { api } from '@/api/client';
import { useLogs } from '@/hooks/useLogs';
import type { Deployment } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { LogsViewer } from '@/components/LogsViewer';

export default function LogsViewerPage() {
  const { suffix } = useParams();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loadingDep, setLoadingDep] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial Fetch of Deployment to get the prefix
  useEffect(() => {
    if (!suffix) return;
    let cancelled = false;

    const fetchDeployment = async () => {
      setLoadingDep(true);
      setError(null);
      try {
        const data = await api.inspectByName(suffix);
        if (!cancelled) setDeployment(data);
      } catch (err: unknown) {
        if (!cancelled) setError((err as Error).message || 'Failed to load deployment.');
      } finally {
        if (!cancelled) setLoadingDep(false);
      }
    };

    void fetchDeployment();
    return () => {
      cancelled = true;
    };
  }, [suffix]);

  const { logs, loading: loadingLogs, refetch } = useLogs(suffix ?? '', deployment?.prefix ?? '');

  if (loadingDep) {
    return (
      <div className="grow flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Spinner size={32} />
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="grow flex items-center justify-center p-6">
        <div className="bg-white border-2 border-slate-800 p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Deployment Not Found
          </h2>
          <p className="text-sm font-medium text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/deployments')}
            className="mt-4 px-6 py-2.5 bg-slate-800 text-white font-bold text-sm hover:translate-y-px hover:translate-x-px active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-80px)] p-4 sm:p-8 pt-6 sm:pt-10 bg-slate-50/50 animate-in fade-in duration-300">
      <div className="w-full max-w-6xl flex flex-col h-[calc(100vh-140px)] min-h-125 border-2 border-slate-800 bg-white shadow-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-800 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/deployments/${deployment.suffix}`)}
              className="p-2 bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 hover:text-slate-900 hover:-translate-y-px hover:-translate-x-px active:translate-y-px active:translate-x-px active:shadow-none transition-all"
              title="Back to Details"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-slate-700 shrink-0" strokeWidth={2.5} />
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">
                Logs
              </h1>
            </div>

            {/* Breadcrumb: prefix › suffix */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-500">
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-slate-400">{deployment.prefix}</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="font-bold text-slate-700">{deployment.suffix}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live badge */}
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>

            <button
              onClick={refetch}
              disabled={loadingLogs}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 hover:-translate-y-px hover:-translate-x-px active:translate-y-px active:translate-x-px active:shadow-none transition-all disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Logs Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading overlay — only on initial load with no data yet */}
          {loadingLogs && logs.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80 backdrop-blur-[2px] z-10">
              <div className="flex items-center gap-3 px-6 py-3 bg-[#161b22] border border-white/10 font-mono text-sm text-slate-300">
                <Spinner size={16} />
                <span>Fetching logs…</span>
              </div>
            </div>
          ) : null}

          <LogsViewer logs={logs} className="h-full border-none" />
        </div>
      </div>
    </div>
  );
}
