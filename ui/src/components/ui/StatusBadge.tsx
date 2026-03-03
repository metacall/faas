import { clsx } from 'clsx';

type StatusValue = 'create' | 'ready' | 'error' | 'building' | 'failed' | 'stopped' | 'fail';

interface StatusBadgeProps {
  status: StatusValue;
}

const STATUS_CONFIG: Record<
  StatusValue,
  { label: string; dot: string; text: string; animate: boolean }
> = {
  ready: {
    label: 'Ready',
    dot: 'bg-[--color-status-ready]',
    text: 'text-[--color-status-ready]',
    animate: true,
  },
  create: {
    label: 'Building',
    dot: 'bg-[--color-status-building]',
    text: 'text-[--color-status-building]',
    animate: true,
  },
  building: {
    label: 'Building',
    dot: 'bg-[--color-status-building]',
    text: 'text-[--color-status-building]',
    animate: true,
  },
  error: {
    label: 'Failed',
    dot: 'bg-[--color-status-failed]',
    text: 'text-[--color-status-failed]',
    animate: false,
  },
  failed: {
    label: 'Failed',
    dot: 'bg-[--color-status-failed]',
    text: 'text-[--color-status-failed]',
    animate: false,
  },
  fail: {
    label: 'Failed',
    dot: 'bg-[--color-status-failed]',
    text: 'text-[--color-status-failed]',
    animate: false,
  },
  stopped: {
    label: 'Stopped',
    dot: 'bg-[--color-text-muted]',
    text: 'text-[--color-text-muted]',
    animate: false,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.stopped;

  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', config.text)}>
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', config.dot, config.animate && 'animate-pulse')}
      />
      {config.label}
    </span>
  );
}
