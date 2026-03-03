import type { Deployment } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { LanguageBadge } from './ui/LanguageBadge';
import { CopyButton } from './ui/CopyButton';
import { Layers } from 'lucide-react';

interface DeploymentTableProps {
  deployments: Deployment[];
  onDelete?: (suffix: string) => void;
}

export function DeploymentTable({ deployments, onDelete }: DeploymentTableProps) {
  const navigate = useNavigate();

  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
        <div className="w-12 h-12 bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-4">
          <Layers size={24} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-bold text-gray-800">No deployments found</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          There are no deployments matching your current filters, or you haven't deployed anything
          yet.
        </p>
        <button
          onClick={() => navigate('/deploy/new')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold shadow hover:bg-slate-800 transition-colors"
        >
          Create Deployment
        </button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            <th className="py-3 px-4 font-bold">Name</th>
            <th className="py-3 px-4 font-bold">Language</th>
            <th className="py-3 px-4 font-bold">Status</th>
            <th className="py-3 px-4 font-bold">Endpoint</th>
            <th className="py-3 px-4 font-bold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {deployments.map(dep => {
            const endpoint = `http://localhost:9000/${dep.prefix}/${dep.suffix}/v1/call`;
            const languages = Object.keys(dep.packages ?? {});

            return (
              <tr
                key={dep.suffix}
                className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={e => {
                  // Don't navigate if clicking action buttons or copy button
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/deployments/${dep.suffix}`);
                }}
              >
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                    {dep.suffix}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {languages.length > 0 ? (
                      languages.map(lang => <LanguageBadge key={lang} language={lang} />)
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unknown</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={dep.status as Parameters<typeof StatusBadge>[0]['status']} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <code className="max-w-[180px] sm:max-w-[240px] truncate text-[11px] text-gray-500 font-mono bg-gray-50 border border-gray-200 px-1.5 py-0.5 shadow-inner">
                      {endpoint}
                    </code>
                    <CopyButton text={endpoint} />
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/deployments/${dep.suffix}`);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                      title="View Details"
                    >
                      <ExternalLink size={14} />
                    </button>
                    {onDelete && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(dep.suffix);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                        title="Delete Deployment"
                      >
                        <Trash2 size={14} />
                      </button>
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
