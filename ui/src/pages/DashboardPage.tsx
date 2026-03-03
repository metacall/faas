import { useNavigate } from 'react-router-dom';
import { useDeployments } from '@/hooks/useDeployments';
import { useServerStatus } from '@/hooks/useServerStatus';
import { api } from '@/api/client';
import type { Deployment } from '@/types';
import {
  Plus,
  Info,
  WifiOff,
  Package,
  Code2,
  ExternalLink,
  Trash2,
  Server,
  Layers,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';

// Plan config
const PLAN_CLASSES: Record<string, { headerBg: string; plusHover: string }> = {
  'Essential Plan': {
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-400',
    plusHover: 'hover:bg-blue-500 hover:text-white hover:border-blue-500',
  },
  'Standard Plan': {
    headerBg: 'bg-gradient-to-r from-violet-600 to-purple-400',
    plusHover: 'hover:bg-violet-500 hover:text-white hover:border-violet-500',
  },
  'Premium Plan': {
    headerBg: 'bg-gradient-to-r from-rose-500 to-pink-400',
    plusHover: 'hover:bg-rose-500 hover:text-white hover:border-rose-500',
  },
};

const PLAN_ORDER = ['Essential Plan', 'Standard Plan', 'Premium Plan'] as const;

function getPlanClasses(plan?: string) {
  return PLAN_CLASSES[plan ?? ''] ?? PLAN_CLASSES['Essential Plan'];
}

// Deploy row
function DeployRow({ onClick, plusHover }: { onClick: () => void; plusHover: string }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className="text-sm font-medium text-gray-500">Deploy</span>
      <span
        className={`inline-flex items-center justify-center w-7 h-7 border border-gray-300 text-gray-400 transition-all ${plusHover}`}
      >
        <Plus size={13} strokeWidth={2.5} />
      </span>
    </div>
  );
}

// New Deploy card
function NewDeployCard() {
  const navigate = useNavigate();
  const { plusHover } = getPlanClasses('Free Plan');
  return (
    <div
      className="flex flex-col cursor-pointer border border-gray-200 bg-white hover:shadow-sm transition-all"
      onClick={() => navigate('/deploy/new')}
    >
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white bg-gray-500">
        <span>New Deploy</span>
        <span className="opacity-80">Free Plan</span>
      </div>
      <DeployRow onClick={() => navigate('/deploy/new')} plusHover={plusHover} />
    </div>
  );
}

// Launchpad card (active deployment)
function LaunchpadCard({ dep, onDeploy }: { dep: Deployment; onDeploy: () => void }) {
  const navigate = useNavigate();
  const plan =
    ((dep as unknown as Record<string, unknown>).plan as string | undefined) ?? 'Essential Plan';
  const { headerBg, plusHover } = getPlanClasses(plan);
  return (
    <div
      className="flex flex-col border border-dashed border-gray-300 bg-white hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/deployments/${dep.suffix}`)}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}
      >
        <span className="truncate">{dep.suffix || 'Empty launchpad'}</span>
        <span className="opacity-80 ml-2 shrink-0">{plan}</span>
      </div>
      <DeployRow onClick={() => onDeploy()} plusHover={plusHover} />
    </div>
  );
}

// Empty plan slot
function EmptyLaunchpadCard({ plan, onClick }: { plan: string; onClick: () => void }) {
  const { headerBg, plusHover } = getPlanClasses(plan);
  return (
    <div
      className="flex flex-col border border-dashed border-gray-300 bg-white hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}
      >
        <span>Empty launchpad</span>
        <span className="opacity-80">{plan}</span>
      </div>
      <DeployRow onClick={onClick} plusHover={plusHover} />
    </div>
  );
}

// Stat card
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  trend?: { label: string; up?: boolean };
}

function StatCard({ icon, label, value, sub, trend }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 bg-white border border-gray-200 px-5 py-4 flex-1 min-w-45">
      <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-slate-50 border border-slate-100">
        {icon}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-2xl font-bold text-gray-800 leading-tight">{value}</span>
        <span className="text-[11px] text-gray-400 leading-none">{sub}</span>
        {trend && (
          <span
            className={`text-[10px] font-semibold mt-1 ${trend.up ? 'text-teal-500' : 'text-red-400'}`}
          >
            {trend.up ? '↑' : '↓'} {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}

// Recent deployments table
function RecentDeploymentsTable({ deployments, onDelete }: { deployments: Deployment[]; onDelete: (dep: Deployment) => void }) {
  const navigate = useNavigate();
  const recent = deployments.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Recent Deployments
      </h2>
      <div className="bg-white border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs min-w-100">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                Functions
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recent.map(dep => {
              const fnCount = Object.values(dep.packages ?? {}).reduce(
                (acc, handles) =>
                  acc + handles.reduce((a, h) => a + (h.scope?.funcs?.length ?? 0), 0),
                0,
              );
              return (
                <tr
                  key={dep.suffix}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/deployments/${dep.suffix}`)}
                >
                  <td className="px-4 py-2.5 font-mono text-gray-700 truncate max-w-35">
                    {dep.suffix}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      status={dep.status === 'fail' ? 'error' : dep.status ?? 'create'}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{fnCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/deployments/${dep.suffix}`);
                        }}
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(dep);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Dashboard Page
export default function DashboardPage() {
  const navigate = useNavigate();
  const { deployments, loading, refetch } = useDeployments();
  const { online, loading: statusLoading } = useServerStatus();

  const handleDelete = async (dep: Deployment) => {
    if (!confirm(`Delete deployment "${dep.suffix}"?`)) return;
    try {
      await api.deployDelete(dep.prefix, dep.suffix, dep.version);
      refetch();
    } catch (err: unknown) {
      alert('Failed to delete: ' + (err as Error).message);
    }
  };

  const activeDeployments = deployments.filter(d => d.status === 'ready').length;
  const totalFunctions = deployments.reduce(
    (acc, dep) =>
      acc +
      Object.values(dep.packages ?? {}).reduce(
        (a, handles) => a + handles.reduce((b, h) => b + (h.scope?.funcs?.length ?? 0), 0),
        0,
      ),
    0,
  );
  const emptyCount = deployments.filter(d => !d.suffix || d.status === 'create').length;

  // Build one slot per plan occupied slots show the real deployment, empty ones show placeholder
  const launchpadSlots = PLAN_ORDER.map(planId => {
    const dep = deployments.find(
      d =>
        ((d as unknown as Record<string, unknown>).plan as string | undefined) === planId,
    );
    return { planId, dep: dep ?? null };
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Stat cards */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          icon={
            online ? (
              <span className="relative flex items-center justify-center">
                <Server size={20} className="text-gray-500" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
              </span>
            ) : (
              <span className="relative flex items-center justify-center">
                <WifiOff size={20} className="text-red-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white" />
              </span>
            )
          }
          label="Server"
          value={statusLoading ? <Spinner size={18} /> : online ? 'Online' : 'Offline'}
          sub={online ? 'FaaS is responding' : 'Cannot reach server'}
        />
        <StatCard
          icon={<Package size={20} className="text-gray-400" />}
          label="Active Deployments"
          value={loading ? <Spinner size={18} /> : activeDeployments}
          sub={`${deployments.length} total`}
        />
        <StatCard
          icon={<Code2 size={20} className="text-gray-400" />}
          label="Functions"
          value={loading ? <Spinner size={18} /> : totalFunctions}
          sub="across all deployments"
        />
        <StatCard
          icon={
            <span className="relative flex items-center justify-center">
              <Layers size={20} className="text-gray-400" />
              {emptyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white leading-none">
                  {emptyCount > 9 ? '9+' : emptyCount}
                </span>
              )}
            </span>
          }
          label="Idle Slots"
          value={loading ? <Spinner size={18} /> : emptyCount}
          sub="empty subscriptions"
        />
      </div>

      {/* Info bar */}
      {emptyCount > 0 && (
        <div className="flex items-center gap-2 py-1.5 pl-3 border-l-2 border-amber-400 bg-amber-50">
          <Info size={13} className="text-amber-500 shrink-0" />
          <span className="text-xs font-semibold text-amber-600">
            You have {emptyCount} empty subscription{emptyCount !== 1 ? 's' : ''} — deploy
            something!
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Spinner size={14} />
          <span>Fetching deployments…</span>
        </div>
      )}

      {/* Launchpad grid always shows all plan slots */}
      {!loading && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Launchpads
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <NewDeployCard />
            {launchpadSlots.map(({ planId, dep }) =>
              dep ? (
                <LaunchpadCard
                  key={planId}
                  dep={dep}
                  onDeploy={() => navigate('/deploy/new')}
                />
              ) : (
                <EmptyLaunchpadCard
                  key={planId}
                  plan={planId}
                  onClick={() => navigate('/deploy/new')}
                />
              ),
            )}
          </div>
        </div>
      )}

      {/* Recent deployments table */}
      {!loading && deployments.length > 0 && <RecentDeploymentsTable deployments={deployments} onDelete={handleDelete} />}
    </div>
  );
}
