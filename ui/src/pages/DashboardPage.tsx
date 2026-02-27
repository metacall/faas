import { useNavigate } from 'react-router-dom';
import { useDeployments } from '@/hooks/useDeployments';
import type { Deployment } from '@/types';
import { Plus, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

const PLAN_CLASSES: Record<string, { headerBg: string; borderColor: string; plusBorder: string }> = {
    'Free Plan': { headerBg: 'bg-blue-500', borderColor: 'border-blue-300', plusBorder: 'border-blue-500 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' },
    'Essential Plan': { headerBg: 'bg-gray-400', borderColor: 'border-gray-300', plusBorder: 'border-gray-400 text-gray-500 hover:bg-gray-700 hover:text-white hover:border-gray-700' },
    'Balanced Plan': { headerBg: 'bg-blue-500', borderColor: 'border-blue-300', plusBorder: 'border-blue-400 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500' },
    'Premium Plan': { headerBg: 'bg-pink-500', borderColor: 'border-pink-300', plusBorder: 'border-pink-400 text-pink-500 hover:bg-pink-500 hover:text-white hover:border-pink-500' },
};
function getPlanClasses(plan?: string) {
    return PLAN_CLASSES[plan ?? ''] ?? PLAN_CLASSES['Essential Plan'];
}

function DeployRow({ onClick, plusClass }: { onClick: () => void; plusClass: string }) {
    return (
        <div
            className="flex items-center justify-between px-5 py-6 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <span className="text-sm font-semibold text-gray-700">Deploy</span>
            <span className={`inline-flex items-center justify-center w-8 h-8 border-2 transition-all ${plusClass}`}>
                <Plus size={16} strokeWidth={2.5} />
            </span>
        </div>
    );
}

function NewDeployCard() {
    const navigate = useNavigate();
    const { headerBg, borderColor, plusBorder } = getPlanClasses('Free Plan');
    return (
        <div
            className={`group flex flex-col cursor-pointer transition-all hover:shadow-lg border-2 ${borderColor} bg-white w-72`}
            onClick={() => navigate('/deploy/new')}
        >
            <div className={`flex items-center justify-between px-4 py-2 text-xs font-semibold text-white ${headerBg}`}>
                <span>New Deploy</span>
                <span className="opacity-90 text-[11px]">Free Plan</span>
            </div>
            <DeployRow onClick={() => navigate('/deploy/new')} plusClass={plusBorder} />
        </div>
    );
}

// Real deployment launchpad card
function LaunchpadCard({ dep, onDeploy }: { dep: Deployment; onDeploy: () => void }) {
    const navigate = useNavigate();
    const plan = (dep.plan as string | undefined) ?? 'Essential Plan';
    const { headerBg, borderColor, plusBorder } = getPlanClasses(plan);
    const label = dep.suffix || 'Empty launchpad';

    return (
        <div
            className={`flex flex-col transition-all hover:shadow-md border-2 border-dashed ${borderColor} bg-white w-72 cursor-pointer`}
            onClick={() => navigate(`/deployments/${dep.suffix}`)}
        >
            <div className={`flex items-center justify-between px-4 py-2 text-xs font-semibold text-white ${headerBg}`}>
                <span className="truncate max-w-[140px]">{label}</span>
                <span className="text-[11px] opacity-90 ml-2 shrink-0">{plan}</span>
            </div>
            <DeployRow
                onClick={() => onDeploy()}
                plusClass={plusBorder}
            />

        </div>
    );
}

// Empty placeholder launchpad card
function EmptyLaunchpadCard({ plan, onClick }: { plan: string; onClick: () => void }) {
    const { headerBg, borderColor, plusBorder } = getPlanClasses(plan);
    return (
        <div
            className={`flex flex-col transition-all hover:shadow-md border-2 border-dashed ${borderColor} bg-white w-72 cursor-pointer`}
            onClick={onClick}
        >
            <div className={`flex items-center justify-between px-4 py-2 text-xs font-semibold text-white ${headerBg}`}>
                <span>Empty launchpad</span>
                <span className="text-[11px] opacity-90">{plan}</span>
            </div>
            <DeployRow onClick={onClick} plusClass={plusBorder} />
        </div>
    );
}

// Dashboard Page
export default function DashboardPage() {
    const navigate = useNavigate();
    const { deployments, loading } = useDeployments();

    const emptyCount = deployments.filter(d => !d.suffix || d.status === 'create').length;
    const placeholderPlans = ['Essential Plan', 'Premium Plan', 'Premium Plan'] as const;

    return (
        <div className="flex flex-col gap-8">

            {/* Info bar */}
            {emptyCount > 0 && (
                <div className="flex items-center gap-3 py-2 pl-3 border-l-4 border-teal-400">
                    <Info size={15} className="text-teal-500 shrink-0" />
                    <span className="text-sm font-semibold text-teal-600">
                        Note: You have {emptyCount} empty subscription{emptyCount !== 1 ? 's' : ''}.
                    </span>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Spinner size={16} />
                    <span>Loading deployments…</span>
                </div>
            )}

            {/* Card grid */}
            {!loading && (
                <div className="flex flex-wrap gap-6 items-start">
                    <NewDeployCard />

                    {deployments.map(dep => (
                        <LaunchpadCard
                            key={dep.suffix}
                            dep={dep}
                            onDeploy={() => navigate('/deploy/new')}
                        />
                    ))}

                    {deployments.length === 0 &&
                        placeholderPlans.map((plan, i) => (
                            <EmptyLaunchpadCard
                                key={i}
                                plan={plan}
                                onClick={() => navigate('/deploy/new')}
                            />
                        ))
                    }
                </div>
            )}
        </div>
    );
}
