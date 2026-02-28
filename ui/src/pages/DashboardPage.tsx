import { useNavigate } from 'react-router-dom';
import { useDeployments } from '@/hooks/useDeployments';
import { useServerStatus } from '@/hooks/useServerStatus';
import type { Deployment } from '@/types';
import { Plus, Info, WifiOff, Package, Code2, ExternalLink, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';

// Plan styles
const PLAN_CLASSES: Record<string, { headerBg: string; plusHover: string }> = {
    'Free Plan': { headerBg: 'bg-gray-500', plusHover: 'hover:bg-gray-500  hover:text-white hover:border-gray-500' },
    'Essential Plan': { headerBg: 'bg-blue-500', plusHover: 'hover:bg-blue-500  hover:text-white hover:border-blue-500' },
    'Standard Plan': { headerBg: 'bg-purple-500', plusHover: 'hover:bg-purple-500 hover:text-white hover:border-purple-500' },
    'Premium Plan': { headerBg: 'bg-pink-500', plusHover: 'hover:bg-pink-500  hover:text-white hover:border-pink-500' },
};
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
            <span className={`inline-flex items-center justify-center w-7 h-7 border border-gray-300 text-gray-400 transition-all ${plusHover}`}>
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

// Launchpad card
function LaunchpadCard({ dep, onDeploy }: { dep: Deployment; onDeploy: () => void }) {
    const navigate = useNavigate();
    const plan = ((dep as unknown as Record<string, unknown>).plan as string | undefined) ?? 'Essential Plan';
    const { headerBg, plusHover } = getPlanClasses(plan);
    return (
        <div
            className="flex flex-col border border-dashed border-gray-300 bg-white hover:shadow-sm transition-all cursor-pointer"
            onClick={() => navigate(`/deployments/${dep.suffix}`)}
        >
            <div className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}>
                <span className="truncate">{dep.suffix || 'Empty launchpad'}</span>
                <span className="opacity-80 ml-2 shrink-0">{plan}</span>
            </div>
            <DeployRow onClick={() => onDeploy()} plusHover={plusHover} />
        </div>
    );
}

// Empty placeholder
function EmptyLaunchpadCard({ plan, onClick }: { plan: string; onClick: () => void }) {
    const { headerBg, plusHover } = getPlanClasses(plan);
    return (
        <div
            className="flex flex-col border border-dashed border-gray-300 bg-white hover:shadow-sm transition-all cursor-pointer"
            onClick={onClick}
        >
            <div className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}>
                <span>Empty launchpad</span>
                <span className="opacity-80">{plan}</span>
            </div>
            <DeployRow onClick={onClick} plusHover={plusHover} />
        </div>
    );
}

// Stat Card
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    sub: string;
    trend?: { label: string; up?: boolean };
}
// Status card
function StatCard({ icon, label, value, sub, trend }: StatCardProps) {
    return (
        <div className="flex items-start gap-4 bg-white border border-gray-200 px-5 py-4 flex-1 min-w-[180px]">
            <span className="flex items-center justify-center w-10 h-10 shrink-0 text-gray-400">
                {icon}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                <span className="text-2xl font-bold text-gray-800 leading-tight">{value}</span>
                <span className="text-[11px] text-gray-400 leading-none">{sub}</span>
                {trend && (
                    <span className={`text-[10px] font-semibold mt-1 ${trend.up ? 'text-teal-500' : 'text-red-400'}`}>
                        {trend.up ? '↑' : '↓'} {trend.label}
                    </span>
                )}
            </div>
        </div>
    );
}

// Recent deployments table
function RecentDeploymentsTable({ deployments }: { deployments: Deployment[] }) {
    const navigate = useNavigate();
    const recent = deployments.slice(0, 5);
    if (recent.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Deployments</h2>
            <div className="bg-white border border-gray-200 overflow-x-auto shadow-sm">
                <table className="w-full text-xs min-w-[400px]">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Functions</th>
                            <th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recent.map(dep => {
                            const fnCount = Object.values(dep.packages ?? {}).reduce(
                                (acc, handles) => acc + handles.reduce((a, h) => a + (h.scope?.funcs?.length ?? 0), 0), 0,
                            );
                            return (
                                <tr
                                    key={dep.suffix}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/deployments/${dep.suffix}`)}
                                >
                                    <td className="px-4 py-2.5 font-mono text-gray-700 truncate max-w-[140px]">{dep.suffix}</td>
                                    <td className="px-4 py-2.5">
                                        <StatusBadge status={dep.status === 'fail' ? 'error' : (dep.status ?? 'create')} />
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{fnCount}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center justify-end gap-1">
                                            <button className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                                                onClick={e => { e.stopPropagation(); navigate(`/deployments/${dep.suffix}`); }}>
                                                <ExternalLink size={12} />
                                            </button>
                                            <button className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                                                onClick={e => { e.stopPropagation(); }}>
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
    const { deployments, loading } = useDeployments();
    const { online, loading: statusLoading } = useServerStatus();

    const activeDeployments = deployments.filter(d => d.status === 'ready').length;
    const totalFunctions = deployments.reduce(
        (acc, dep) => acc + Object.values(dep.packages ?? {}).reduce(
            (a, handles) => a + handles.reduce((b, h) => b + (h.scope?.funcs?.length ?? 0), 0), 0), 0);
    const emptyCount = deployments.filter(d => !d.suffix || d.status === 'create').length;
    const placeholderPlans = ['Essential Plan', 'Standard Plan', 'Premium Plan'] as const;

    return (
        <div className="flex flex-col gap-8">

            <div className="flex flex-wrap gap-4">

                <StatCard
                    icon={online ? <CheckCircle2 size={20} /> : <WifiOff size={20} />}
                    label="Server"
                    value={statusLoading ? <Spinner size={18} /> : online ? 'Online' : 'Offline'}
                    sub={online ? 'FaaS is responding' : 'Cannot reach server'}
                />
                <StatCard
                    icon={<Package size={20} />}
                    label="Active Deployments"
                    value={loading ? <Spinner size={18} /> : activeDeployments}
                    sub={`${deployments.length} total`}
                />
                <StatCard
                    icon={<Code2 size={20} />}
                    label="Functions"
                    value={loading ? <Spinner size={18} /> : totalFunctions}
                    sub="across all deployments"
                />
                <StatCard
                    icon={<Clock size={20} />}
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
                        You have {emptyCount} empty subscription{emptyCount !== 1 ? 's' : ''} — deploy something!
                    </span>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Spinner size={14} /><span>Fetching deployments…</span>
                </div>
            )}

            {/* Launchpad grid */}
            {!loading && (
                <div className="flex flex-col gap-3">
                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Launchpads</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <NewDeployCard />
                        {deployments.map(dep => (
                            <LaunchpadCard key={dep.suffix} dep={dep} onDeploy={() => navigate('/deploy/new')} />
                        ))}
                        {deployments.length === 0 &&
                            placeholderPlans.map((plan, i) => (
                                <EmptyLaunchpadCard key={i} plan={plan} onClick={() => navigate('/deploy/new')} />
                            ))}
                    </div>
                </div>
            )}

            {/* Recent deployments table */}
            {!loading && deployments.length > 0 && (
                <RecentDeploymentsTable deployments={deployments} />
            )}
        </div>
    );
}
