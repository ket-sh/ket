const STAGES = [
  'triage',
  'research',
  'decompose',
  'brainstorm',
  'design',
  'approve',
  'implement',
  'verify',
  'ship',
] as const;

export type Stage = (typeof STAGES)[number];

export type Size = 'epic' | 'story' | 'subtask' | 'trivial';

const RUNS: Record<Size, readonly Stage[]> = {
  epic: ['triage', 'research', 'decompose', 'brainstorm', 'approve'],
  story: ['triage', 'research', 'brainstorm', 'design', 'approve', 'implement', 'verify', 'ship'],
  subtask: ['triage', 'design', 'approve', 'implement', 'verify', 'ship'],
  trivial: ['triage', 'implement', 'verify', 'ship'],
};

export const RETURNS_TO: Partial<Record<Stage, Stage>> = { verify: 'implement' };

export function stagesFor(size: Size): Stage[] {
  return [...RUNS[size]];
}

export interface Return {
  from: Stage;
  to: Stage;
}

export function returnsWithin(stages: Stage[]): Return[] {
  const present = new Set<Stage>(stages);
  const found: Return[] = [];

  for (const from of STAGES) {
    const to = RETURNS_TO[from];

    if (to !== undefined && present.has(from) && present.has(to)) {
      found.push({ from, to });
    }
  }

  return found;
}
