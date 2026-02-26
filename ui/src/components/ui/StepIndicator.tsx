import { clsx } from 'clsx';

interface StepIndicatorProps {
    steps: string[];
    current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
    return (
        <div className="flex items-center">
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isDone = stepNumber < current;
                const isActive = stepNumber === current;

                return (
                    <div key={label} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={clsx(
                                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                                    isDone && 'bg-[--color-primary] border-[--color-primary] text-white',
                                    isActive && 'border-[--color-primary] text-[--color-primary] bg-transparent',
                                    !isDone && !isActive && 'border-[--color-border] text-[--color-text-muted] bg-transparent',
                                )}
                            >
                                {isDone ? '✓' : stepNumber}
                            </div>
                            <span className={clsx('text-xs', isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-muted]')}>
                                {label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={clsx('h-px w-16 mx-2 mb-5', isDone ? 'bg-[--color-primary]' : 'bg-[--color-border]')} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
