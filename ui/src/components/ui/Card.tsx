import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Card({ children, className, header, footer }: CardProps) {
  return (
    <div className={`border border-[--color-border] bg-[--color-surface] ${className ?? ''}`}>
      {header && (
        <div className="px-5 py-3 border-b border-[--color-border] bg-[--color-card-header]">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-[--color-border] bg-[--color-card-header]">
          {footer}
        </div>
      )}
    </div>
  );
}

interface CardHeaderLabelProps {
  icon?: ReactNode;
  children: ReactNode;
}

export function CardHeaderLabel({ icon, children }: CardHeaderLabelProps) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[--color-text-primary] flex items-center gap-2">
      {icon && <span className="text-[--color-primary]">{icon}</span>}
      {children}
    </h3>
  );
}
