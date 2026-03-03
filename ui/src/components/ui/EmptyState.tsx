import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-[--color-text-muted]">{icon}</div>}
      <p className="text-sm font-semibold text-[--color-text-primary]">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-[--color-text-muted]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
