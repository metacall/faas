import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useDeployments } from '@/hooks/useDeployments';
import { api } from '@/api/client';
import { DeploymentTable } from '@/components/DeploymentTable';
import { Spinner } from '@/components/ui/Spinner';

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
              <span className="font-mono font-semibold text-gray-700">{suffix}</span> will be
              permanently removed. This cannot be undone.
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

  const [pendingDelete, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          onCancel={() => {
            setPending(null);
            setError(null);
          }}
        />
      )}

      <div className="grow flex flex-col items-center justify-start p-4 sm:p-8 pt-6 sm:pt-10 bg-slate-50/50 min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
        <div className="w-full max-w-6xl flex flex-col gap-6 relative">
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-500">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                Deployments
              </h1>
              <p className="text-sm font-semibold text-gray-500 mt-1">
                {loading
                  ? 'Fetching active deployments…'
                  : `Tracking ${deployments.length} running deployment${
                      deployments.length !== 1 ? 's' : ''
                    }`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-200 active:translate-y-0.5 transition-all"
                onClick={() => navigate('/')}
                title="Back to Dashboard"
              >
                <Home size={15} />
                Home
              </button>
              <button
                className="flex items-center justify-center p-2.5 bg-white hover:bg-gray-200 hover:translate-y-px hover:translate-x-px text-gray-600 active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all"
                onClick={refetch}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 font-bold text-black hover:bg-gray-500 hover:text-white active:shadow-none active:translate-y-0.5 active:translate-x-0.5 transition-all"
                onClick={() => navigate('/deploy/new')}
              >
                <Plus size={16} strokeWidth={3} />
                New Deploy
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border-l-4 border-red-500 text-sm font-semibold text-red-700 shadow-sm">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="hover:bg-red-100 p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-gray-300 w-full relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="bg-white border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3 font-semibold text-sm text-slate-700">
                  <Spinner size={16} /> Syncing network...
                </div>
              </div>
            )}
            <DeploymentTable deployments={deployments} onDelete={suffix => setPending(suffix)} />
          </div>
        </div>
      </div>
    </>
  );
}
