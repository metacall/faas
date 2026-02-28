import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Terminal } from 'lucide-react';
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
                if (!cancelled) setError((err as Error).message || "Failed to load deployment.");
            } finally {
                if (!cancelled) setLoadingDep(false);
            }
        };

        void fetchDeployment();
        return () => { cancelled = true; };
    }, [suffix]);

    const { logs, loading: loadingLogs, refetch } = useLogs(suffix ?? '', deployment?.prefix ?? '');

    if (loadingDep) {
        return (
            <div className="flex-grow flex items-center justify-center min-h-[calc(100vh-80px)]">
                <Spinner size={32} />
            </div>
        );
    }

    if (error || !deployment) {
        return (
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Deployment Not Found</h2>
                    <p className="text-sm font-medium text-gray-600">{error}</p>
                    <button
                        onClick={() => navigate('/deployments')}
                        className="mt-4 px-6 py-2.5 bg-slate-800 text-white font-bold text-sm hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Back to Hub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start justify-center min-h-[calc(100vh-80px)] p-4 sm:p-8 pt-6 sm:pt-10 bg-slate-50/50 animate-in fade-in duration-300">
            <div className="w-full max-w-6xl flex flex-col h-[calc(100vh-140px)] min-h-[500px] border-2 border-slate-800 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">

                {/* Header Section */}
                <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/deployments/${deployment.suffix}`)}
                            className="p-2 bg-white text-slate-600 border border-slate-300 hover:text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all"
                            title="Back to Details"
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <Terminal size={18} className="text-slate-700" strokeWidth={2.5} />
                                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
                                    System Logs
                                </h1>
                            </div>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1.5">
                                {deployment.suffix}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={refetch}
                            disabled={loadingLogs}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
                            Sync
                        </button>
                    </div>
                </div>

                {/* Logs Area */}
                <div className="flex-1 relative overflow-hidden bg-slate-900 border-t-4 border-t-amber-400">
                    {loadingLogs && logs.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] z-10">
                            <div className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] font-bold text-sm">
                                <Spinner size={16} /> Retrieving telemetry...
                            </div>
                        </div>
                    ) : null}

                    <LogsViewer logs={logs} className="h-full border-none" />
                </div>
            </div>
        </div>
    );
}
