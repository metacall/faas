import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Trash2, Box, Cpu } from 'lucide-react';
import { api } from '@/api/client';
import type { Deployment } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LanguageBadge } from '@/components/ui/LanguageBadge';
import { FunctionTester } from '@/components/FunctionTester';
import { CopyButton } from '@/components/ui/CopyButton';

export default function DeploymentDetailPage() {
    const { suffix } = useParams();
    const navigate = useNavigate();

    const [deployment, setDeployment] = useState<Deployment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Initial Fetch
    const fetchDeployment = async () => {
        if (!suffix) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.inspectByName(suffix);
            setDeployment(data);
        } catch (err: unknown) {
            setError((err as Error).message || "Failed to load deployment.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeployment();
    }, [suffix]);

    const handleDelete = async () => {
        if (!deployment) return;
        if (!confirm(`Are you sure you want to delete ${deployment.suffix}?`)) return;

        setDeleting(true);
        try {
            await api.deployDelete(deployment.prefix, deployment.suffix, deployment.version);
            navigate('/deployments');
        } catch (err: unknown) {
            alert('Failed to delete deployment: ' + (err as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center min-h-[calc(100vh-80px)]">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Spinner size={32} />
                    <p className="text-sm font-medium">Loading Deployment Details...</p>
                </div>
            </div>
        );
    }

    if (error || !deployment) {
        return (
            <div className="flex-grow flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
                <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-lg max-w-md w-full text-center flex flex-col items-center gap-4 shadow-sm">
                    <div className="bg-red-100 p-3 rounded-full">
                        <Box size={24} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Deployment Not Found</h2>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/deployments')}
                        className="mt-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 font-semibold text-sm rounded shadow-sm hover:bg-gray-50 flexItems-center gap-2"
                    >
                        <ArrowLeft size={16} /> Back to Hub
                    </button>
                </div>
            </div>
        );
    }

    const primaryLang = Object.keys(deployment.packages ?? {})[0] || 'Unknown';
    // Base URL is typically derived from VITE_FAAS_URL or current origin. In MetaCall it typically sits at /prefix/suffix/version/call
    const baseUrl = (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'http://localhost:9000';
    const invokePath = `${baseUrl}/${deployment.prefix}/${deployment.suffix}/${deployment.version}/call`;

    return (
        <div className="flex items-start justify-center min-h-[calc(100vh-120px)] p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-5xl bg-white border border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/deployments')}
                            className="p-2 border border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors shadow-sm"
                            title="Back"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">{deployment.suffix}</h1>
                                <StatusBadge status={deployment.status} />
                            </div>
                            <div className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                                <Cpu size={13} className="text-gray-400" />
                                {deployment.prefix}
                                <span className="text-gray-300 mx-0.5">•</span>
                                {deployment.version}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <LanguageBadge language={primaryLang} />
                        <div className="flex gap-2">
                            <button
                                onClick={fetchDeployment}
                                className="p-1.5 text-gray-500 bg-white border border-gray-200 shadow-sm hover:text-slate-800 hover:bg-gray-50 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={14} />
                            </button>
                            <button
                                onClick={() => navigate(`/deployments/${deployment.suffix}/logs`)}
                                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-white border border-gray-200 shadow-sm hover:bg-blue-50 transition-colors"
                            >
                                View Logs
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-3 py-1.5 text-xs font-bold text-red-500 bg-white border border-gray-200 shadow-sm hover:text-white hover:bg-red-500 hover:border-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                title="Delete Deployment"
                            >
                                {deleting ? <Spinner size={14} /> : <Trash2 size={14} />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Content */}
                <div className="flex flex-col md:flex-row bg-gray-50/30">
                    {/* Left Info Panel */}
                    <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-gray-200 p-5 flex flex-col gap-5 bg-white">
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-3">
                                Endpoints
                            </h3>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Base HTTP URL</span>
                                <div className="flex items-center gap-2 group">
                                    <div className="bg-gray-50 border border-gray-200 shadow-inner px-2 py-1.5 font-mono text-[11px] text-slate-700 truncate min-w-0 font-medium">
                                        {invokePath}
                                    </div>
                                    <div className="shrink-0">
                                        <CopyButton text={invokePath} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-3">
                                Configuration
                            </h3>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Exposed Ports</span>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                    {(deployment.ports || []).length > 0 ? (
                                        deployment.ports.map(p => (
                                            <span key={p} className="px-2 py-1 bg-gray-100 border border-gray-200 text-xs font-mono font-bold text-slate-600 shadow-sm">{p}</span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No ports exposed</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 mt-4">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Environment Config</span>
                                <div className="bg-gray-50 border border-gray-200 p-3 mt-1 text-[11px] italic text-gray-500">
                                    (Environment variables overview not currently supported by API)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Function Tester Block */}
                    <div className="flex-1 overflow-hidden min-h-[400px]">
                        <FunctionTester deployment={deployment} />
                    </div>
                </div>

            </div>
        </div>
    );
}
