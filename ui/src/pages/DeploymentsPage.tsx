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

            <div className="flex flex-col gap-6">

                {/* Page header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">Deployments</h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {loading ? 'Loading…' : `${deployments.length} total deployment${deployments.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="flex items-center gap-1.5 p-2 text-gray-400 border border-gray-200 hover:bg-gray-50 transition-colors"
                            onClick={refetch}
                            title="Refresh"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                            onClick={() => navigate('/deploy/new')}
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            New Deploy
                        </button>
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border border-red-200 text-xs text-red-600">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}><X size={13} /></button>
                    </div>
                )}

                {/* Search and filter row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search box */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 flex-1 min-w-[200px] max-w-xs">
                        <Search size={13} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search deployments…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 text-xs outline-none bg-transparent placeholder-gray-400 text-gray-700"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Status filter chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-3 py-1.5 text-xs font-semibold border transition-all ${filter === f.value
                                        ? 'bg-gray-800 text-white border-gray-800'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Spinner size={14} /><span>Fetching deployments…</span>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200">
                        <DeploymentTable
                            deployments={filtered}
                            onDelete={suffix => setPending(suffix)}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
