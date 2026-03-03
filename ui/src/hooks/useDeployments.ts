import { useEffect, useState } from 'react';
import type { Deployment } from '@/types';
import { api } from '@/api/client';

interface UseDeploymentsResult {
  deployments: Deployment[];
  loading: boolean;
  refetch: () => void;
}

export function useDeployments(pollIntervalMs = 30_000): UseDeploymentsResult {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const result = await api.inspect();
        if (!cancelled) setDeployments(result);
      } catch {
        // silently retain stale data on poll failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    const interval = setInterval(() => setTick(t => t + 1), pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollIntervalMs, tick]);

  return { deployments, loading, refetch: () => setTick(t => t + 1) };
}
