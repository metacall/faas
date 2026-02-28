import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Folder, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import { Plans } from '@metacall/protocol/plan';
import { Spinner } from '@/components/ui/Spinner';
import JSZip from 'jszip';
import type { TreeNode } from './TreeNodeView';
import { TreeNodeView } from './TreeNodeView';
import { TreeCheckbox } from './TreeCheckbox';
import { EditorView } from './EditorView';

interface EnvRow { id: number; name: string; value: string; }

function buildTree(paths: string[]): TreeNode {
    const root: TreeNode = { name: 'root', path: '', isDirectory: true, children: {} };
    for (const path of paths) {
        // JSZip paths usually don't start with / but might end with / if directory
        const parts = path.split('/').filter(Boolean);
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isDir = i < parts.length - 1 || path.endsWith('/');
            const currentPath = parts.slice(0, i + 1).join('/');

            if (!current.children[part]) {
                current.children[part] = {
                    name: part,
                    path: currentPath,
                    isDirectory: isDir,
                    children: {}
                };
            }
            current = current.children[part];
        }
    }
    return root;
}

export default function DeployWizardPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // State from previous page
    const file = location.state?.file as File | undefined;
    const plan = location.state?.plan as Plans | undefined;

    // Local State
    const [deploying, setDeploying] = useState(false);
    const [deployError, setDeployError] = useState('');
    const [tree, setTree] = useState<TreeNode | null>(null);
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [loadingZip, setLoadingZip] = useState(true);
    const [envRows, setEnvRows] = useState<EnvRow[]>([{ id: 1, name: '', value: '' }]);

    // Parse Zip
    useEffect(() => {
        if (!file) {
            navigate('/deploy/new');
            return;
        }

        async function processZip() {
            try {
                const jszip = new JSZip();
                const zip = await jszip.loadAsync(file!);
                const paths = Object.keys(zip.files);

                const root = buildTree(paths);
                setTree(root);

                // Select all files by default
                const allFiles = new Set<string>();
                Object.values(zip.files).forEach(z => {
                    if (!z.dir) allFiles.add(z.name);
                });
                setSelectedPaths(allFiles);
            } catch (error) {
                console.error("Failed to parse zip", error);
            } finally {
                setLoadingZip(false);
            }
        }

        processZip();
    }, [file, navigate]);

    // Helpers for Tree Toggle
    const getAllDescendantFiles = (node: TreeNode): string[] => {
        let files: string[] = [];
        if (!node.isDirectory) {
            files.push(node.path);
        } else {
            Object.values(node.children).forEach(child => {
                files = files.concat(getAllDescendantFiles(child));
            });
        }
        return files;
    };

    const findNodeByPath = (rootNode: TreeNode, targetPath: string): TreeNode | null => {
        if (rootNode.path === targetPath) return rootNode;
        for (const child of Object.values(rootNode.children)) {
            const found = findNodeByPath(child, targetPath);
            if (found) return found;
        }
        return null;
    };

    const handleToggle = (path: string, isDirectory: boolean) => {
        const next = new Set(selectedPaths);

        if (isDirectory && tree) {
            const node = findNodeByPath(tree, path);
            if (node) {
                const descendants = getAllDescendantFiles(node);
                const allSelected = descendants.every(f => next.has(f));

                if (allSelected) {
                    descendants.forEach(f => next.delete(f));
                } else {
                    descendants.forEach(f => next.add(f));
                }
            }
        } else {
            if (next.has(path)) next.delete(path);
            else next.add(path);
        }

        setSelectedPaths(next);
    };

    const handleDeploy = async () => {
        if (!file) return;
        setDeploying(true);
        setDeployError('');

        try {
            // In a real scenario we'd rebuild the zip based on `selectedPaths`,
            const deployName = file.name.replace(/\.zip$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-');

            await api.upload(deployName, file);

            const envVars = envRows
                .filter(r => r.name.trim())
                .map(r => ({ name: r.name.trim(), value: r.value }));

            await api.deploy(deployName, envVars, plan || Plans.Essential, 'Package');

            navigate('/deployments');
        } catch (error) {
            console.error('Deploy failed', error);
            const err = error as { response?: { data?: string }, message?: string };
            setDeployError(err?.response?.data || err?.message || 'Failed to deploy package.');
        } finally {
            setDeploying(false);
        }
    };

    const nextEnvId = envRows.length > 0 ? Math.max(...envRows.map(r => r.id)) + 1 : 1;
    const selectedFilesArray = Array.from(selectedPaths);

    if (!file) return null;

    return (
        <div className="flex-grow flex flex-col items-center justify-start p-4 sm:p-6 pt-8 sm:pt-12 relative overflow-hidden animate-in fade-in duration-500 min-h-[calc(100vh-80px)] bg-slate-50/50">
            {/* Background glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-[--color-primary]/[0.02] rounded-full blur-[80px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[80px]"></div>
            </div>

            <div className="w-full max-w-5xl bg-white border border-gray-200 shadow-sm flex flex-col z-10 transition-all rounded-sm">

                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
                            <Folder size={18} className="fill-blue-600/20 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Configure Deployment</h2>
                            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Select files to include and configure your environment.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                            Plan: <span className="text-[--color-primary]">{plan}</span>
                        </span>
                        <button
                            onClick={() => navigate('/deploy/new')}
                            className="text-gray-400 hover:text-gray-800 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-md"
                        >
                            <X size={18} className="sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>

                {/* 2-Column Content */}
                <div className="flex flex-col lg:flex-row min-h-[500px]">

                    {/* Left Column: File Tree */}
                    <div className="w-full lg:w-1/3 flex flex-col p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Source Files</h3>
                            <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                                {selectedPaths.size} selected
                            </span>
                        </div>

                        <div className="flex-grow overflow-y-auto max-h-[300px] lg:max-h-none pr-2 custom-scrollbar bg-gray-50/50 border border-gray-200 rounded-md p-2 sm:p-3">
                            {loadingZip ? (
                                <div className="flex flex-col items-center gap-3 text-sm text-gray-500 py-10 justify-center h-full">
                                    <Spinner size={24} /> Parsing ZIP payload...
                                </div>
                            ) : tree ? (
                                <div className="flex flex-col gap-1">
                                    <div
                                        className="flex items-center gap-1.5 py-1.5 px-2 cursor-pointer select-none hover:bg-gray-100 rounded-md transition-colors"
                                        onClick={() => {
                                            const allDecs = getAllDescendantFiles(tree);
                                            if (selectedPaths.size === allDecs.length) {
                                                setSelectedPaths(new Set()); // Deselect all
                                            } else {
                                                setSelectedPaths(new Set(allDecs)); // Select all
                                            }
                                        }}
                                    >
                                        <ChevronDown size={14} className="text-gray-500" />
                                        <TreeCheckbox
                                            checked={selectedPaths.size === (tree ? getAllDescendantFiles(tree).length : 0) && selectedPaths.size > 0}
                                            partial={selectedPaths.size > 0 && selectedPaths.size < (tree ? getAllDescendantFiles(tree).length : 1)}
                                            onClick={() => { }}
                                        />
                                        <Folder size={14} className="text-blue-500 fill-blue-50" />
                                        <span className="text-sm font-bold text-slate-700 truncate">{file.name}</span>
                                    </div>

                                    <div className="ml-1 border-l border-gray-200 pl-1 mt-1">
                                        {Object.values(tree.children).map(child => (
                                            <TreeNodeView
                                                key={child.path}
                                                node={child}
                                                depth={1}
                                                selectedPaths={selectedPaths}
                                                onToggle={handleToggle}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Right Column: Editor & Env Vars */}
                    <div className="w-full lg:w-2/3 flex flex-col bg-gray-50/20">

                        {/* Configuration Settings */}
                        <div className="p-4 sm:p-6 pb-0 flex-grow flex flex-col h-full">

                            <div className="flex-grow flex flex-col h-[250px] sm:h-[300px] mb-6">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Deployment Configuration</h3>
                                <EditorView
                                    selectedFiles={selectedFilesArray}
                                    onClear={() => setSelectedPaths(new Set())}
                                />
                            </div>

                            {/* Environment Variables */}
                            <div className="flex flex-col mt-4">
                                <div className="flex items-center justify-between mb-3 mt-4">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Environment Variables</h3>
                                    <button
                                        onClick={() => setEnvRows([...envRows, { id: nextEnvId, name: '', value: '' }])}
                                        className="text-[13px] font-semibold text-blue-600 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-md transition-colors"
                                    >
                                        <Plus size={14} strokeWidth={2.5} /> Add Variable
                                    </button>
                                </div>

                                <div className="flex flex-col gap-3 bg-white p-3 sm:p-4 border border-gray-200 rounded-md shadow-sm">
                                    {envRows.length === 0 && (
                                        <div className="text-xs text-gray-400 italic text-center py-2">No environment variables added.</div>
                                    )}
                                    {envRows.map((row, idx) => (
                                        <div key={row.id} className="flex gap-2 sm:gap-3 items-center group flex-wrap sm:flex-nowrap">
                                            <input
                                                placeholder="Key"
                                                value={row.name}
                                                onChange={e => {
                                                    const newRow = [...envRows];
                                                    newRow[idx].name = e.target.value.toUpperCase().replace(/\s+/g, '_');
                                                    setEnvRows(newRow);
                                                }}
                                                className="flex-[1_1_40%] sm:flex-1 w-full sm:w-1/3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-gray-50 focus:bg-white placeholder:text-gray-400"
                                            />
                                            <span className="text-gray-400 font-mono hidden sm:block">=</span>
                                            <input
                                                placeholder="Value"
                                                value={row.value}
                                                onChange={e => {
                                                    const newRow = [...envRows];
                                                    newRow[idx].value = e.target.value;
                                                    setEnvRows(newRow);
                                                }}
                                                className="flex-[1_1_40%] sm:flex-1 w-full sm:w-2/3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-gray-50 focus:bg-white placeholder:text-gray-400"
                                            />
                                            <button
                                                onClick={() => setEnvRows(envRows.filter(r => r.id !== row.id))}
                                                className="text-gray-400 hover:text-red-500 p-1.5 sm:p-2 sm:opacity-50 sm:group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                                                title="Remove Variable"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50/80 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex-1 w-full">
                                {deployError && (
                                    <div className="p-4 bg-white border border-l-2 border-slate-200 border-l-red-500 text-slate-700 text-[13px] shadow-sm flex items-start gap-3 w-full max-w-[500px]">
                                        <div className="flex-1">
                                            <strong className="block font-bold text-red-600 mb-1">Deployment Error</strong>
                                            {deployError}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleDeploy}
                                disabled={deploying}
                                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 text-[15px] font-bold text-white bg-slate-900 border border-transparent rounded-md hover:bg-slate-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deploying ? <Spinner size={16} /> : null}
                                Deploy
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
