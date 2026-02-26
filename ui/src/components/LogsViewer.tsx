import { clsx } from 'clsx';
import type { LogEntry } from '@/types';

interface LogsViewerProps {
    logs: LogEntry[];
    isLive?: boolean;
}

const LEVEL_CLASSES: Record<LogEntry['level'], string> = {
    info: 'text-[--color-log-info]',
    success: 'text-[--color-log-success]',
    warn: 'text-[--color-log-warn]',
    error: 'text-[--color-log-error]',
    http: 'text-[--color-text-muted]',
};

const LEVEL_LABELS: Record<LogEntry['level'], string> = {
    info: 'INFO',
    success: 'OK  ',
    warn: 'WARN',
    error: 'ERR ',
    http: 'HTTP',
};

export function LogsViewer({ logs, isLive = false }: LogsViewerProps) {
    return (
        <div className="h-full overflow-y-auto rounded-lg bg-[--color-bg] border border-[--color-border] font-mono text-xs p-4 space-y-0.5">
            {isLive && (
                <div className="mb-3 flex items-center gap-2 text-[--color-text-muted]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[--color-log-success] animate-pulse" />
                    <span>Live</span>
                </div>
            )}
            {logs.length === 0 ? (
                <p className="text-[--color-text-muted]">No logs available yet.</p>
            ) : (
                logs.map((entry, i) => (
                    <div key={i} className="flex gap-3">
                        {entry.timestamp && (
                            <span className="shrink-0 text-[--color-text-muted]">{entry.timestamp}</span>
                        )}
                        <span className={clsx('shrink-0 font-semibold', LEVEL_CLASSES[entry.level])}>
                            {LEVEL_LABELS[entry.level]}
                        </span>
                        <span className="text-[--color-text-primary] break-all">{entry.message}</span>
                    </div>
                ))
            )}
        </div>
    );
}
