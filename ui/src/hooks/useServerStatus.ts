import { useEffect, useState } from 'react';
import { api } from '@/api/client';

interface UseServerStatusResult {
  online: boolean;
  loading: boolean;
}

export function useServerStatus(pollIntervalMs = 30_000): UseServerStatusResult {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const isReady = await api.ready();
        if (!cancelled) setOnline(isReady);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void check();
    const interval = setInterval(() => void check(), pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return { online, loading };
}
