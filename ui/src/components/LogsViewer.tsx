import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import type { LogEntry } from '@/types';

interface LogsViewerProps {
  logs: LogEntry[];
  className?: string;
}

// Level configuration
const LEVEL_BADGE: Record<
  LogEntry['level'],
  { label: string; cls: string; rowCls: string }
> = {
  info:    { label: 'INFO ', cls: 'text-cyan-400 border-cyan-700',   rowCls: '' },
  success: { label: 'OK   ', cls: 'text-green-400 border-green-700', rowCls: 'bg-green-950/20' },
  warn:    { label: 'WARN ', cls: 'text-amber-400 border-amber-700', rowCls: 'bg-amber-950/20' },
  error:   { label: 'ERROR', cls: 'text-red-400 border-red-700',     rowCls: 'bg-red-950/20' },
  http:    { label: 'HTTP ', cls: 'text-slate-500 border-slate-700', rowCls: '' },
};

// Component
export function LogsViewer({ logs, className }: LogsViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive, unless user has scrolled up
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-3 bg-[#0d1117] text-slate-500 h-full w-full',
          className,
        )}
      >
        {/* blinking cursor */}
        <div className="font-mono text-sm flex items-center gap-1.5">
          <span className="inline-block w-2 h-4 bg-slate-500 animate-pulse" />
          <span>No log entries yet.</span>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">
          Waiting for telemetry…
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        'overflow-y-auto bg-[#0d1117] custom-scrollbar w-full h-full',
        className,
      )}
    >
      {/* Top bar — mimics a terminal title bar */}
      <div className="sticky top-0 z-10 flex items-center gap-1.5 px-4 py-2 bg-[#161b22] border-b border-white/6 select-none">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-amber-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 font-mono text-[11px] text-slate-500 tracking-widest uppercase">
          deployment logs
        </span>
        <span className="ml-auto font-mono text-[10px] text-slate-600">
          {logs.length} line{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Log rows */}
      <div className="px-2 py-3 font-mono text-[12.5px] leading-6">
        {logs.map((entry, i) => {
          const badge = LEVEL_BADGE[entry.level];
          return (
            <div
              key={i}
              className={clsx(
                'group flex items-start gap-0 rounded-sm transition-colors hover:bg-white/4',
                badge.rowCls,
              )}
            >
              {/* Line number */}
              <span className="shrink-0 w-10 text-right pr-3 text-slate-600 select-none text-[11px] leading-6 group-hover:text-slate-400 transition-colors">
                {i + 1}
              </span>

              {/* Timestamp */}
              <span className="shrink-0 w-20 pr-3 text-slate-600 select-none truncate leading-6 text-[11px]">
                {entry.timestamp || '—'}
              </span>

              {/* Level badge */}
              <span
                className={clsx(
                  'shrink-0 w-13 mr-3 px-1 border text-center text-[10px] font-bold uppercase tracking-wider leading-[1.3] rounded-xs mt-0.75',
                  badge.cls,
                )}
              >
                {badge.label}
              </span>

              {/* Message */}
              <span
                className={clsx('flex-1 break-all whitespace-pre-wrap leading-6', {
                  'text-slate-300': entry.level === 'info',
                  'text-green-300': entry.level === 'success',
                  'text-amber-300': entry.level === 'warn',
                  'text-red-300':   entry.level === 'error',
                  'text-slate-500': entry.level === 'http',
                })}
              >
                {entry.message}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
