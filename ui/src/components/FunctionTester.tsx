import { useState } from 'react';
import { X, Play, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/api/client';
import { Button } from './ui/Button';

interface FunctionTesterProps {
    functionName: string;
    suffix: string;
    prefix: string;
    isOpen: boolean;
    onClose: () => void;
}

type CallMode = 'call' | 'await';

export function FunctionTester({ functionName, suffix, prefix, isOpen, onClose }: FunctionTesterProps) {
    const [args, setArgs] = useState('[]');
    const [mode, setMode] = useState<CallMode>('call');
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRun = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const parsedArgs = JSON.parse(args) as unknown[];
            const response = await api.call(prefix, suffix, 'v1', functionName, parsedArgs);
            setResult(JSON.stringify(response, null, 2));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Call failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
            )}
            <div
                className={clsx(
                    'fixed inset-y-0 right-0 z-50 w-[420px] flex flex-col bg-[--color-surface] border-l border-[--color-border] transition-transform duration-300',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <div className="flex items-center justify-between border-b border-[--color-border] px-5 py-4">
                    <div>
                        <p className="text-xs text-[--color-text-muted]">Function Tester</p>
                        <p className="text-sm font-semibold text-[--color-text-primary] font-mono">{functionName}</p>
                    </div>
                    <button onClick={onClose} className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <div className="mb-2 flex items-center gap-1 rounded-lg border border-[--color-border] p-1 bg-[--color-elevated] w-fit">
                            {(['call', 'await'] as CallMode[]).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={clsx(
                                        'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                        mode === m ? 'bg-[--color-surface] text-[--color-text-primary] shadow-sm' : 'text-[--color-text-muted] hover:text-[--color-text-primary]',
                                    )}
                                >
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                            ))}
                        </div>
                        <label className="block text-xs text-[--color-text-muted] mb-1">Arguments (JSON array)</label>
                        <textarea
                            value={args}
                            onChange={e => setArgs(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 text-xs font-mono text-[--color-text-primary] focus:outline-none focus:border-[--color-primary] resize-none"
                            placeholder='["arg1", 42, true]'
                        />
                    </div>

                    {result !== null && (
                        <div>
                            <p className="text-xs text-[--color-text-muted] mb-1">Response</p>
                            <pre className="rounded-lg bg-[--color-bg] border border-[--color-border] p-3 text-xs font-mono text-[--color-log-success] overflow-x-auto">{result}</pre>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-[--color-status-failed]/30 bg-[--color-status-failed]/10 p-3">
                            <p className="text-xs text-[--color-status-failed] font-mono">{error}</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-[--color-border] p-4">
                    <Button onClick={handleRun} loading={loading} className="w-full justify-center">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Run {mode === 'await' ? '(await)' : ''}
                    </Button>
                </div>
            </div>
        </>
    );
}
