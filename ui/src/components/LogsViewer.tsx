import { clsx } from 'clsx';
import type { LogEntry } from '@/types';

interface LogsViewerProps {
    logs: LogEntry[];
    className?: string;
}

const LEVEL_CLASS: Record<LogEntry['level'], string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    http: 'text-gray-400',
};

const LEVEL_PREFIX: Record<LogEntry['level'], string> = {
    info: '[INFO]',
    success: '[OK]  ',
    warn: '[WARN]',
    error: '[ERR] ',
    http: '[HTTP]',
};

export function LogsViewer({ logs, className }: LogsViewerProps) {
    if (logs.length === 0) {
        return (
            <div className={clsx('flex flex-col items-center justify-center p-12 bg-slate-900 text-slate-400 h-full w-full', className)}>
                <div className="font-mono text-sm">No telemetry signals detected.</div>
                <div className="text-[10px] uppercase font-bold tracking-widest mt-2 opacity-50">Standing by...</div>
            </div>
        );
    }

    return (
        <div className={clsx('overflow-y-auto bg-slate-900 p-6 custom-scrollbar w-full h-full', className)}>
            <pre className="text-[13px] font-mono leading-relaxed space-y-1">
                {logs.map((entry, i) => (
                    <div key={i} className="flex gap-4 hover:bg-white/5 px-2 py-0.5 -mx-2 rounded-sm transition-colors">
                        {entry.timestamp && (
                            <span className="shrink-0 text-slate-500 font-medium select-none">{entry.timestamp}</span>
                        )}
                        <span className={clsx('shrink-0 select-none font-bold tracking-wider w-16', LEVEL_CLASS[entry.level])}>
                            {LEVEL_PREFIX[entry.level]}
                        </span>
                        <span className="text-slate-300 break-all">{entry.message}</span>
                    </div>
                ))}
            </pre>
        </div>
    );
}
