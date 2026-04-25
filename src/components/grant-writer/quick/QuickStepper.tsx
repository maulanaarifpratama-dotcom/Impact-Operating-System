import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_STEPS } from '@/lib/grant-writer/types';

interface Props {
  currentStep: number;
  onStepClick?: (step: number) => void;
  maxReached?: number;
}

export function QuickStepper({ currentStep, onStepClick, maxReached }: Props) {
  const max = maxReached ?? currentStep;
  return (
    <ol className="flex flex-wrap items-center gap-1 text-sm">
      {QUICK_STEPS.map((step, i) => {
        const num = step.index;
        const isCurrent = num === currentStep;
        const isDone = num < currentStep;
        const isReachable = num <= max;
        const clickable = !!onStepClick && isReachable;
        return (
          <li key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(num)}
              className={cn(
                'group inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors',
                clickable ? 'cursor-pointer hover:bg-muted' : 'cursor-default',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isDone && 'bg-accent text-accent-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                  !isDone && !isCurrent && 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : num}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium md:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </button>
            {i < QUICK_STEPS.length - 1 && (
              <span className="hidden h-px w-4 bg-border md:inline-block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}