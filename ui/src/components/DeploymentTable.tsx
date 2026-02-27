import type { Deployment } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { LanguageBadge } from './ui/LanguageBadge';
import { CopyButton } from './ui/CopyButton';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Layers } from 'lucide-react';

interface DeploymentTableProps {
    deployments: Deployment[];
    onDelete?: (suffix: string) => void;
}

export function DeploymentTable({ deployments, onDelete }: DeploymentTableProps) {
    const navigate = useNavigate();

    if (deployments.length === 0) {
        return (
            <EmptyState
                icon={<Layers size={40} />}
                title="No deployments yet"
                description="Deploy your first function to get started."
            />
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[--color-border] text-left text-xs text-[--color-text-muted]">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Language</th>
                        <th className="pb-3 pr-4 font-medium">Status</th>
                        <th className="pb-3 pr-4 font-medium">Endpoint</th>
                        <th className="pb-3 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                    {deployments.map(dep => {
                        const endpoint = `http://localhost:9000/${dep.prefix}/${dep.suffix}/v1/call`;
                        const languages = Object.keys(dep.packages ?? {});

                        return (
                            <tr key={dep.suffix} className="group hover:bg-[--color-elevated] transition-colors">
                                <td className="py-3 pr-4">
                                    <span
                                        className="font-medium text-[--color-text-primary] cursor-pointer hover:text-[--color-primary] transition-colors"
                                        onClick={() => navigate(`/deployments/${dep.suffix}`)}
                                    >
                                        {dep.suffix}
                                    </span>
                                </td>
                                <td className="py-3 pr-4">
                                    <div className="flex gap-1 flex-wrap">
                                        {languages.map(lang => <LanguageBadge key={lang} language={lang} />)}
                                    </div>
                                </td>
                                <td className="py-3 pr-4">
                                    <StatusBadge status={dep.status as Parameters<typeof StatusBadge>[0]['status']} />
                                </td>
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                        <code className="max-w-[220px] truncate text-xs text-[--color-text-muted] font-mono">{endpoint}</code>
                                        <CopyButton text={endpoint} />
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/deployments/${dep.suffix}`)}
                                        >
                                            <ExternalLink size={13} />
                                            View
                                        </Button>
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(dep.suffix)}
                                                className="text-[--color-status-failed]! hover:text-[--color-status-failed]"
                                            >
                                                <Trash2 size={13} />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
