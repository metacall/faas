import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  GitBranch,
  Code2,
  ArrowLeft,
  FolderSync,
  Plus,
  AlertTriangle,
  FileJson,
  Globe,
  FolderOpen,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/api/client';
import { Plans } from '@metacall/protocol/plan';
import { Spinner } from '@/components/ui/Spinner';

interface EnvRow {
  id: number;
  name: string;
  value: string;
}

export default function DeployRepositoryPage() {
  const navigate = useNavigate();

  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchFetchError, setBranchFetchError] = useState('');
  const [envRows, setEnvRows] = useState<EnvRow[]>([{ id: 1, name: '', value: '' }]);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeploy = async () => {
    if (!repositoryUrl.trim()) {
      setDeployError('Repository URL is required.');
      return;
    }

    setDeploying(true);
    setDeployError('');
    try {
      const branchToDeploy = branchName.trim() || 'main';
      const { id } = await api.add(repositoryUrl.trim(), branchToDeploy);

      const envVars = envRows
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), value: r.value }));

      await api.deploy(id, envVars, Plans.Essential, 'Repository');
      navigate('/deployments');
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      setDeployError(error?.response?.data ?? error?.message ?? 'Failed to deploy repository.');
    } finally {
      setDeploying(false);
    }
  };

  const nextEnvId = envRows.length > 0 ? Math.max(...envRows.map(r => r.id)) + 1 : 1;

  // Parse owner/repo from GitHub or GitLab URL
  function parseRepoInfo(url: string): { provider: 'github' | 'gitlab'; owner: string; repo: string } | null {
    try {
      const u = new URL(url.trim().replace(/\.git$/, ''));
      if (u.hostname === 'github.com') {
        const [, owner, repo] = u.pathname.split('/');
        if (owner && repo) return { provider: 'github', owner, repo };
      }
      if (u.hostname === 'gitlab.com') {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const repo = parts.pop()!;
          return { provider: 'gitlab', owner: parts.join('/'), repo };
        }
      }
    } catch {
      // invalid URL
    }
    return null;
  }

  // Auto-fetch branches when URL changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setBranches([]);
    setBranchFetchError('');

    const info = parseRepoInfo(repositoryUrl);
    if (!info) return;

    debounceRef.current = setTimeout(async () => {
      setBranchLoading(true);
      try {
        let names: string[] = [];
        let defaultBranch = 'main';

        if (info.provider === 'github') {
          const [repoRes, branchRes] = await Promise.all([
            fetch(`https://api.github.com/repos/${info.owner}/${info.repo}`),
            fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/branches?per_page=100`),
          ]);
          if (!repoRes.ok) throw new Error(repoRes.status === 404 ? 'Repository not found.' : 'GitHub API error.');
          const repoData = await repoRes.json() as { default_branch?: string };
          defaultBranch = repoData.default_branch ?? 'main';
          const branchData = await branchRes.json() as { name: string }[];
          names = Array.isArray(branchData) ? branchData.map(b => b.name) : [];
        } else {
          const encoded = encodeURIComponent(`${info.owner}/${info.repo}`);
          const [projRes, branchRes] = await Promise.all([
            fetch(`https://gitlab.com/api/v4/projects/${encoded}`),
            fetch(`https://gitlab.com/api/v4/projects/${encoded}/repository/branches?per_page=100`),
          ]);
          if (!projRes.ok) throw new Error(projRes.status === 404 ? 'Repository not found.' : 'GitLab API error.');
          const projData = await projRes.json() as { default_branch?: string };
          defaultBranch = projData.default_branch ?? 'main';
          const branchData = await branchRes.json() as { name: string }[];
          names = Array.isArray(branchData) ? branchData.map(b => b.name) : [];
        }

        // Default branch first, rest alphabetical
        names.sort((a, b) => {
          if (a === defaultBranch) return -1;
          if (b === defaultBranch) return 1;
          return a.localeCompare(b);
        });
        setBranches(names);
        setBranchName(prev => (prev.trim() && names.includes(prev.trim()) ? prev : defaultBranch));
      } catch (err: unknown) {
        setBranchFetchError((err as Error).message ?? 'Could not fetch branches.');
      } finally {
        setBranchLoading(false);
      }
    }, 700);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [repositoryUrl]);

  return (
    <div className="grow flex flex-col items-center justify-start p-4 sm:p-8 pt-6 min-h-[calc(100vh-80px)] animate-in fade-in duration-500 relative overflow-hidden">
      <div className="absolute top-[-8%] right-[5%] w-96 h-96 bg-blue-500/3 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-8%] left-[-4%] w-96 h-96 bg-violet-500/3 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 flex flex-col gap-8">

        {/* Page header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <button
            onClick={() => navigate('/deploy/new')}
            className="p-2 bg-white text-slate-500 border border-gray-200  hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Back"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-white">
              <FolderSync size={18} className="text-gray-500" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                Deploy Repository
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                Import a Git repository and deploy it as a FaaS function
              </p>
            </div>
          </div>
        </div>

        {/* Source Configuration */}
        <div className="bg-white  overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <GitBranch size={14} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
              Source Configuration
            </span>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Left: inputs */}
            <div className="flex flex-col gap-6">
              {/* Repository URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Repository URL <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 focus-within:border-blue-400 focus-within:bg-white transition-colors overflow-hidden">
                  <Globe size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="url"
                    inputMode="url"
                    value={repositoryUrl}
                    onChange={e => {
                      setRepositoryUrl(e.target.value);
                      if (deployError) setDeployError('');
                    }}
                    placeholder="https://github.com/user/repo"
                    className="flex-1 min-w-0 bg-transparent text-sm font-mono text-slate-800 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Branch */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Branch
                  </label>
                  {branchLoading && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium">
                      <RefreshCw size={10} className="animate-spin" /> Detecting…
                    </span>
                  )}
                  {!branchLoading && branches.length > 0 && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {branches.length} branch{branches.length !== 1 ? 'es' : ''} detected
                    </span>
                  )}
                </div>

                {branches.length > 0 ? (
                  <div className="relative flex items-center bg-slate-50 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                    <GitBranch size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                    <select
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      className="w-full pl-8 pr-8 py-2.5 bg-transparent text-sm font-mono text-slate-800 outline-none appearance-none cursor-pointer"
                    >
                      {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <div className={`flex items-center gap-2  bg-slate-50 px-3 py-2.5  focus-within:bg-white transition-colors ${branchFetchError ? 'border-amber-300' : 'border-slate-200'}`}>
                    <GitBranch size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      placeholder="main"
                      className="flex-1 bg-transparent text-sm font-mono text-slate-800 outline-none placeholder:text-slate-300"
                    />
                  </div>
                )}

                {branchFetchError && !branchLoading && (
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    ⚠ {branchFetchError} — enter branch manually.
                  </p>
                )}
              </div>
            </div>

            {/* Right: info panel */}
            <div className="flex flex-col gap-3">
              {/* Info notice */}
              <div className="flex items-start gap-3 p-3.5 text-sm text-emerald-900">
                <FileJson size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <p className="text-[13px] leading-relaxed">
                  Your repository must include a{' '}
                  <strong className="font-bold">metacall.json</strong> at the root to configure
                  language runtimes and entry points.
                </p>
              </div>

              {/* Detected framework card */}
              <div className="bg-slate-50 border border-slate-200 p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                  <FolderOpen size={12} />
                  Detected Framework
                </div>
                {[
                  { label: 'Language Support', value: 'Node.js + Python', mono: true, blue: true },
                  { label: 'Root Directory', value: '/', mono: true, blue: false },
                  { label: 'Build Context', value: 'metacall.json', mono: true, blue: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">{item.label}</span>
                    <span
                      className={`text-[12px] font-semibold ${item.blue ? 'text-blue-500' : 'text-slate-700'} ${item.mono ? 'font-mono' : ''}`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Environment Variables  */}
        <div className="bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <Code2 size={14} className="text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest truncate">
                <span className="hidden sm:inline">Environment Variables</span>
                <span className="sm:hidden">Env Vars</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium ml-1 shrink-0">
                ({envRows.filter(r => r.name.trim()).length} set)
              </span>
            </div>
            <button
              onClick={() => setEnvRows([...envRows, { id: nextEnvId, name: '', value: '' }])}
              className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer shrink-0 ml-3"
            >
              <Plus size={13} strokeWidth={3} />
              <span className="hidden sm:inline">Add Variable</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          <div className="p-3 sm:p-5 flex flex-col gap-0">
            {/* Column headers — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_32px] gap-4 pb-2 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Key</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Value</span>
              <span />
            </div>

            {envRows.map((row, idx) => (
              <div
                key={row.id}
                className="relative flex flex-col sm:grid sm:grid-cols-[1fr_1fr_32px] gap-2 sm:gap-4 sm:items-center py-3 border-b border-slate-100 last:border-b-0 group"
              >
                {/* Mobile labels */}
                <div className="flex flex-col gap-2 sm:contents">
                  <div className="flex flex-col gap-1 sm:contents">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest sm:hidden px-1">Key</span>
                    <div className="flex items-center gap-2 sm:contents">
                      <input
                        placeholder="VARIABLE_NAME"
                        value={row.name}
                        onChange={e => {
                          const updated = [...envRows];
                          updated[idx] = {
                            ...updated[idx],
                            name: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                          };
                          setEnvRows(updated);
                        }}
                        className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-mono text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:contents">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest sm:hidden px-1">Value</span>
                    <div className="flex items-center gap-2">
                      <input
                        placeholder="value"
                        value={row.value}
                        onChange={e => {
                          const updated = [...envRows];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          setEnvRows(updated);
                        }}
                        className="flex-1 border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-mono text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-slate-300"
                      />
                      {/* Delete btn inline on mobile */}
                      <button
                        onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                        className="sm:hidden flex items-center justify-center w-8 h-8 shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200"
                        title="Remove"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Delete btn on desktop */}
                <button
                  onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                  className="hidden sm:flex items-center justify-center w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            ))}

            {envRows.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400 italic">
                No environment variables defined.
              </p>
            )}
          </div>
        </div>

        {/* Error banner */}
        {deployError && (
          <div className="flex items-start gap-3 px-4 py-3.5 bg-red-50 text-sm text-red-700 shadow-sm animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <strong className="font-bold">Deployment failed — </strong>
              {deployError}
            </div>
            <button
              onClick={() => setDeployError('')}
              className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/*  Actions  */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6">
          <button
            onClick={() => navigate('/deploy/new')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-gray-200 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <button
            onClick={handleDeploy}
            disabled={deploying || !repositoryUrl.trim()}
            className="flex items-center justify-center gap-2 px-8 py-2.5  text-black border text-sm font-bold hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {deploying && <Spinner size={14} />}
            <span className="sm:hidden">{deploying ? 'Deploying…' : 'Deploy'}</span>
            <span className="hidden sm:inline">{deploying ? 'Deploying…' : 'Deploy Repository'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
