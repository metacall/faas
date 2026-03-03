import { useEffect, useState } from 'react';
import type { LogEntry } from '@/types';
import { api } from '@/api/client';

interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  refetch: () => void;
}

function stripAnsi(value: string): string {
  const esc = String.fromCharCode(27);
  return value.split(esc).join('').replace(/\[[0-9;]*m/g, '');
}

/**
 * Infer a UI log level from the stored [LEVEL] tag or message text.
 * Handles both the new format  "<ISO> [LEVEL] - <name> | <msg>"
 * and the legacy format       "<ISO> - <name> | <msg>"
 */
function parseLogs(raw: string): LogEntry[] {
  const parsedLogs: LogEntry[] = [];

  const lines = raw.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const clean = stripAnsi(line);

    // New format with explicit level:  "<ISO> [LEVEL] - <name> | <msg>"
    const newFmt = clean.match(
      /^(\S+)\s+\[(INFO|WARN|ERROR|DEBUG|HTTP)\]\s+-\s+([^|]+)\|\s?(.*)$/i,
    );

    const legacyFmt = !newFmt
      ? clean.match(/^(\S+)\s+-\s+([^|]+)\|\s?(.*)$/)
      : null;

    if (newFmt) {
      const [, ts, rawLevel, name, msg] = newFmt;
      const levelMap: Record<string, LogEntry['level']> = {
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error',
        DEBUG: 'info',
        HTTP: 'http',
      };
      let level: LogEntry['level'] = levelMap[rawLevel.toUpperCase()] ?? 'info';
      // Override: messages that explicitly say success / ready bump to success
      if (/\bsuccess\b|\bready\b|\bdone\b/i.test(msg)) level = 'success';

      const short = ts.length >= 19 ? ts.substring(11, 19) : ts;
      parsedLogs.push({ timestamp: short, level, message: `[${name.trim()}] ${msg}` });
    } else if (legacyFmt) {
      const [, ts, name, msg] = legacyFmt;
      let level: LogEntry['level'] = 'info';
      if (/error|fail/i.test(msg)) level = 'error';
      else if (/\bwarn/i.test(msg)) level = 'warn';
      else if (/\bsuccess\b|\bready\b|\bdone\b/i.test(msg)) level = 'success';
      else if (/GET |POST |HTTP\//i.test(msg)) level = 'http';

      const short = ts.length >= 19 ? ts.substring(11, 19) : ts;
      parsedLogs.push({ timestamp: short, level, message: `[${name.trim()}] ${msg}` });
    } else {
      // Unstructured line (continuation, stack trace, etc.)
      let level: LogEntry['level'] = 'info';
      if (/error|fail/i.test(clean)) level = 'error';
      else if (/\bwarn/i.test(clean)) level = 'warn';
      parsedLogs.push({ timestamp: '', level, message: clean });
    }
  }

  return parsedLogs;
}

export function useLogs(suffix: string, prefix: string, pollIntervalMs = 5000): UseLogsResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!suffix || !prefix) return;
    let cancelled = false;

    const doFetch = async () => {
      try {
        const raw = await api.logs(suffix, prefix, 'deploy');
        if (!cancelled) setLogs(parseLogs(raw));
      } catch {
        // retain stale data if logs request fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void doFetch();
    const timer = setInterval(() => setTick(t => t + 1), pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [suffix, prefix, pollIntervalMs, tick]);

  return { logs, loading, refetch: () => setTick(t => t + 1) };
}
