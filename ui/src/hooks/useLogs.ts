import { useEffect, useState } from 'react';
import type { LogEntry } from '@/types';
import { api } from '@/api/client';

interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  refetch: () => void;
}

function parseLogs(raw: string): LogEntry[] {
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      let level: LogEntry['level'] = 'info';
      if (/error|fail/i.test(line)) level = 'error';
      else if (/warn/i.test(line)) level = 'warn';
      else if (/success|ready/i.test(line)) level = 'success';
      else if (/GET|POST|HTTP/i.test(line)) level = 'http';
      return { timestamp: '', level, message: line };
    });
}

export function useLogs(suffix: string, prefix: string): UseLogsResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!suffix) return;
    let cancelled = false;

    const doFetch = async () => {
      try {
        const raw = await api.logs(suffix, prefix, 'deploy');
        if (!cancelled) setLogs(parseLogs(raw));
      } catch {
        // logs endpoint is a stub — retain stale data
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void doFetch();

    return () => {
      cancelled = true;
    };
  }, [suffix, prefix, tick]);

  return { logs, loading, refetch: () => setTick(t => t + 1) };
}
