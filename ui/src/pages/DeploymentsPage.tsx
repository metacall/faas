import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useDeployments } from '@/hooks/useDeployments';
import { api } from '@/api/client';
import { DeploymentTable } from '@/components/DeploymentTable';
import { Spinner } from '@/components/ui/Spinner';

type StatusFilter = 'all' | 'ready' | 'create' | 'fail';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ready', label: 'Ready' },
    { value: 'create', label: 'Building' },
    { value: 'fail', label: 'Failed' },
];

// Confirm delete modal
function DeleteModal({
    suffix,
    onConfirm,
    onCancel,
    deleting,
}: {
    suffix: string;
    onConfirm: () => void;
    onCancel: () => void;
    deleting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white border border-gray-200 shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">Delete deployment?</p>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="font-mono font-semibold text-gray-700">{suffix}</span> will be permanently removed.
                            This cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button
                        className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                        onClick={onCancel}
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
                        onClick={onConfirm}
                        disabled={deleting}
                    >
                        {deleting ? <Spinner size={14} /> : null}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DeploymentsPage() {
    const navigate = useNavigate();
    const { deployments, loading, refetch } = useDeployments();

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [pendingDelete, setPending] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Clientside filter and search
    const filtered = useMemo(() => {
        let list = deployments;
        if (filter !== 'all') {
            list = list.filter(d => d.status === filter);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(d =>
                d.suffix.toLowerCase().includes(q) ||
                Object.keys(d.packages ?? {}).some(lang => lang.toLowerCase().includes(q))
            );
        }
        return list;
    }, [deployments, filter, search]);

    async function handleDelete() {
        if (!pendingDelete) return;
        const dep = deployments.find(d => d.suffix === pendingDelete);
        if (!dep) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deployDelete(dep.prefix, dep.suffix, dep.version ?? 'v1');
            setPending(null);
            refetch();
        } catch {
            setError('Delete failed — check server connection.');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            {/* Delete confirmation modal */}
            {pendingDelete && (
                <DeleteModal
                    suffix={pendingDelete}
                    deleting={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => { setPending(null); setError(null); }}
                />
            )}

            <div className="flex-grow flex flex-col items-center justify-start p-4 sm:p-8 pt-6 sm:pt-10 bg-slate-50/50 min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
                <div className="w-full max-w-6xl flex flex-col gap-6 relative">

                    {/* Page header */}
                    <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b-1 border-slate-500">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Deployments Hub</h1>
                            <p className="text-sm font-semibold text-gray-500 mt-1">
                                {loading ? 'Fetching active deployments…' : `Tracking ${deployments.length} running deployment${deployments.length !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className="flex items-center justify-center p-2.5 bg-white border border-gray-300 shadow-sm hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] text-gray-600 active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all"
                                onClick={refetch}
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                            <button
                                className="flex items-center gap-2 px-5 py-2.5 font-bold text-black bg-gray-50 border border-gray-300 shadow-sm hover:bg-gray-600 hover:text-white active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all"
                                onClick={() => navigate('/deploy/new')}
                            >
                                <Plus size={16} strokeWidth={3} />
                                Mount New
                            </button>
                        </div>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border-l-4 border-red-500 text-sm font-semibold text-red-700 shadow-sm">
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="hover:bg-red-100 p-1 transition-colors"><X size={16} /></button>
                        </div>
                    )}

                    {/* Search and filter row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search box */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-white flex-1 transition-all">
                            <Search size={16} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search definitions..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 text-sm font-medium border-none bg-transparent placeholder-gray-400 text-slate-800"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-slate-700 transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Status filter chips */}
                        <div className="flex items-center gap-0 overflow-hidden border border-gray-300 bg-white shrink-0">
                            {STATUS_FILTERS.map((f, i) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilter(f.value)}
                                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all
                                        ${i !== 0 ? 'border-l border-gray-200' : ''} 
                                        ${filter === f.value
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-slate-800'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white border border-gray-300 w-full relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                <div className="bg-white border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3 font-semibold text-sm text-slate-700">
                                    <Spinner size={16} /> Syncing network...
                                </div>
                            </div>
                        )}
                        <DeploymentTable
                            deployments={filtered}
                            onDelete={suffix => setPending(suffix)}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
