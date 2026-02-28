import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Folder, GitBranch, Code } from 'lucide-react';
import { api } from '@/api/client';
import { Plans } from '@metacall/protocol/plan';
import { Spinner } from '@/components/ui/Spinner';

interface EnvRow { id: number; name: string; value: string; }

export default function DeployRepositoryPage() {
    const navigate = useNavigate();

    const [repoUrl, setRepoUrl] = useState('https://github.com/metacall/polyglot-service');
    const [branch, setBranch] = useState('production');
    const [envRows, setEnvRows] = useState<EnvRow[]>([{ id: 1, name: '', value: '' }]);
    const [deploying, setDeploying] = useState(false);
    const [deployError, setDeployError] = useState('');

    const handleDeploy = async () => {
        if (!repoUrl) {
            setDeployError('Repository URL is required');
            return;
        }

        setDeploying(true);
        setDeployError('');
        try {
            const branchToDeploy = branch.trim() || 'master';
            const { id } = await api.add(repoUrl.trim(), branchToDeploy);

            const envVars = envRows
                .filter(r => r.name.trim())
                .map(r => ({ name: r.name.trim(), value: r.value }));

            await api.deploy(id, envVars, Plans.Essential, 'Repository');

            navigate('/deployments');
        } catch (err: unknown) {
            console.error('Deploy failed', err);
            const error = err as { response?: { data?: string }, message?: string };
            setDeployError(error?.response?.data || error?.message || 'Failed to deploy repository.');
        } finally {
            setDeploying(false);
        }
    };

    const nextEnvId = envRows.length > 0 ? Math.max(...envRows.map(r => r.id)) + 1 : 1;

    return (
        <div className="flex-grow flex flex-col items-center justify-start p-4 sm:p-10 bg-white min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
            <div className="w-full max-w-4xl mt-2 flex flex-col pt-0 transition-all">

                {/*Source Configuration */}
                <div className="flex items-center gap-2 mb-10 mt-4">
                    <Folder className="text-blue-500 fill-blue-500" size={18} />
                    <h2 className="text-[13px] font-bold text-slate-800 tracking-[0.15em] uppercase">Source Configuration</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">

                    <div className="flex flex-col gap-10">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Repository URL</label>
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={e => setRepoUrl(e.target.value)}
                                className="w-full border-b border-slate-300 pb-2 text-[15px] outline-none focus:border-blue-500 transition-colors bg-white font-mono text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Branch Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={branch}
                                    onChange={e => setBranch(e.target.value)}
                                    className="w-full border-b border-slate-300 pb-2 text-[15px] outline-none focus:border-blue-500 transition-colors bg-white font-mono text-slate-800 pr-8"
                                />
                                <div className="absolute right-0 top-0 bottom-2 flex items-center mb-1 text-slate-300 pointer-events-none">
                                    <GitBranch size={16} strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/*Detected Framework Box */}
                    <div className="flex flex-col gap-4">
                        <div className="p-4 bg-white border border-l-2 border-slate-200 border-l-green-600 text-slate-700 text-[13px] shadow-sm flex items-start gap-3">
                            <div className="flex-1">
                                Repository correctly loaded with valid <strong className="font-bold text-slate-800">metacall.json</strong> configuration.
                            </div>
                        </div>

                        <div className="bg-[#f8f9fc] p-8">
                            <h3 className="text-[13px] font-bold text-slate-900 mb-8">Detected Framework</h3>

                            <div className="flex justify-between items-center mb-5">
                                <span className="text-[13px] text-slate-500 font-medium">Language Support</span>
                                <span className="text-[12px] font-mono font-medium text-blue-500">Node.js + Python</span>
                            </div>

                            <div className="flex justify-between items-center mb-5">
                                <span className="text-[13px] text-slate-500 font-medium">Root Directory</span>
                                <span className="text-[12px] font-mono font-medium text-slate-800">/</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-[13px] text-slate-500 font-medium">Build Context</span>
                                <span className="text-[12px] font-mono font-medium text-slate-800">metacall.json</span>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="w-full h-px bg-slate-100 mb-10"></div>

                {/* Env Vars */}
                <div className="flex items-center justify-between mb-8 max-w-[600px]">
                    <div className="flex items-center gap-2">
                        <Code className="text-blue-500" size={18} strokeWidth={2.5} />
                        <h2 className="text-[13px] font-bold text-slate-800 tracking-[0.15em] uppercase">Environment Variables</h2>
                    </div>
                    <button
                        onClick={() => setEnvRows([...envRows, { id: nextEnvId, name: '', value: '' }])}
                        className="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 tracking-wider uppercase"
                    >
                        + Add Variable
                    </button>
                </div>

                <div className="flex flex-col gap-4 max-w-[600px]">
                    {envRows.map((row, idx) => (
                        <div key={row.id} className="flex gap-6 items-center mb-2">
                            <input
                                placeholder="KEY"
                                value={row.name}
                                onChange={e => {
                                    const newRow = [...envRows];
                                    newRow[idx].name = e.target.value.toUpperCase().replace(/\s+/g, '_');
                                    setEnvRows(newRow);
                                }}
                                className="w-1/2 border-b border-slate-300 pb-2 text-[14px] font-mono text-slate-800 outline-none focus:border-blue-500 transition-colors bg-white placeholder:text-slate-300"
                            />
                            <input
                                placeholder="VALUE"
                                value={row.value}
                                onChange={e => {
                                    const newRow = [...envRows];
                                    newRow[idx].value = e.target.value;
                                    setEnvRows(newRow);
                                }}
                                className="w-1/2 border-b border-slate-300 pb-2 text-[14px] font-mono text-slate-800 outline-none focus:border-blue-500 transition-colors bg-white placeholder:text-slate-300"
                            />
                            <button
                                onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                                className="text-slate-300 hover:text-red-500 transition-colors pb-2 shrink-0 ml-2"
                                title="Remove"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    ))}
                </div>

                {deployError && (
                    <div className="p-4 bg-white border border-l-2 border-slate-200 border-l-red-500 text-slate-700 text-[13px] mt-6 max-w-[500px] shadow-sm flex items-start gap-3">
                        <div className="flex-1">
                            <strong className="block font-bold text-red-600 mb-1">Deployment Error</strong>
                            {deployError}
                        </div>
                    </div>
                )}

                <div className="flex justify-start pt-10 mt-6 mb-10 w-full max-w-[500px]">
                    <button
                        onClick={handleDeploy}
                        disabled={deploying}
                        className="px-8 py-3 text-black border font-bold text-[13px] tracking-wide rounded-md shadow-sm hover:shadow hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {deploying ? <Spinner size={14} /> : null}
                        {deploying ? 'Deploying...' : 'Deploy'}
                    </button>
                </div>

            </div>
        </div>
    );
}
