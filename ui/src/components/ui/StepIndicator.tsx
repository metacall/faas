import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center w-full" role="list">
        {steps.map((step, index) => {
          const isDone = index < current;
          const isActive = index === current;

          return (
            <li key={step.label} className="relative flex flex-col items-center gap-2 w-full">
              {/* Connector line left */}
              {index > 0 && (
                <div className="absolute top-5 right-1/2 w-full h-[2px] bg-gray-200 -z-0">
                  {isDone && <div className="h-full bg-[--color-primary] w-full" />}
                </div>
              )}
              {/* Connector line right */}
              {index < steps.length - 1 && (
                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-200 -z-0">
                  {isDone && <div className="h-full bg-[--color-primary] w-full" />}
                </div>
              )}

              {/* Circle */}
              <div
                className={clsx(
                  'flex items-center justify-center w-10 h-10 rounded-full font-bold z-10 ring-4 ring-[--color-bg] shadow-sm transition-colors',
                  isActive && 'bg-[--color-primary] text-white',
                  isDone && 'bg-[--color-primary] text-white',
                  !isActive &&
                    !isDone &&
                    'bg-white border-2 border-gray-200 text-[--color-text-muted]',
                )}
              >
                {isDone ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={clsx(
                  'text-sm font-medium',
                  isActive || isDone
                    ? 'font-bold text-[--color-primary]'
                    : 'text-[--color-text-muted]',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
