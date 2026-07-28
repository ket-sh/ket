import type { InitializationPlan } from './initialize.ts';

const NO_KEY = 'none derived from the directory name, so init will ask';

export function describePlan(plan: InitializationPlan): string[] {
  return [`repository  ${plan.root}`, `project key ${plan.key ?? NO_KEY}`];
}
