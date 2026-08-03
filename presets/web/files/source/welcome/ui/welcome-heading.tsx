import { cn } from '@/shared/cn.ts';

import { welcomeTo } from '../model/welcome.ts';

export function WelcomeHeading({ project, className }: { project: string; className?: string }) {
  return (
    <h1 className={cn('text-balance', className)} data-testid="welcome">
      {welcomeTo(project)}
    </h1>
  );
}
