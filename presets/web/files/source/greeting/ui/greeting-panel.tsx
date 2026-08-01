import { cn } from '@/shared/cn.ts';

import { greeting } from '../model/greeting.ts';

export function GreetingPanel({ who, className }: { who?: string; className?: string }) {
  return (
    <p className={cn('text-ink text-lg', className)} data-testid="greeting">
      {greeting(who)}
    </p>
  );
}
