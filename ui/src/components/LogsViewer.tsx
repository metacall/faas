import { clsx } from 'clsx';
import type { LogEntry } from '@/types';

interface LogsViewerProps {
    logs: LogEntry[];
    className?: string;
}

const LEVEL_CLASS: Record<LogEntry['level'], string> = {
    info: 'text-[--color-log-info]',
    success: 'text-[--color-log-success]',
    warn: 'text-[--color-log-warn]',
    error: 'text-[--color-log-error]',
    http: 'text-[--color-text-muted]',
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
            <div className={clsx('flex items-center justify-center py-12 bg-[--color-elevated] border border-[--color-border]', className)}>
                <p className="text-sm text-[--color-text-muted] font-mono">No logs available</p>
            </div>
        );
    }

    return (
        <div className={clsx('overflow-y-auto bg-[--color-elevated] border border-[--color-border] p-4', className)}>
            <pre className="text-xs font-mono leading-6 space-y-0">
                {logs.map((entry, i) => (
                    <div key={i} className="flex gap-3">
                        {entry.timestamp && (
                            <span className="shrink-0 text-[--color-text-muted] select-none">{entry.timestamp}</span>
                        )}
                        <span className={clsx('shrink-0 select-none font-bold', LEVEL_CLASS[entry.level])}>
                            {LEVEL_PREFIX[entry.level]}
                        </span>
                        <span className="text-[--color-text-primary] break-all">{entry.message}</span>
                    </div>
                ))}
            </pre>
        </div>
    );
}
