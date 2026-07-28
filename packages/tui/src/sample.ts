import type { ItemView } from './view.ts';

export const SAMPLE: ItemView = {
  id: 'AUTH-3',
  title: 'login with lockout',
  size: 'story',
  stages: [
    {
      stage: 'triage',
      status: 'done',
      note: 'story',
      logs: ['classified kind=feature size=story', 'confirmed by the maintainer'],
    },
    { stage: 'research', status: 'done', logs: ['searched lockout policies', 'wrote research.md'] },
    { stage: 'brainstorm', status: 'done', logs: ['sharpened AC-1 and AC-2 with the maintainer'] },
    {
      stage: 'design',
      status: 'done',
      note: '3 agents',
      logs: [
        'adr       to internet   12.4s',
        'solution  to codebase    8.1s',
        'gherkin   to spec        3.2s',
      ],
    },
    {
      stage: 'approve',
      status: 'done',
      note: 'human',
      logs: ['approved', 'approvals.yaml updated'],
    },
    {
      stage: 'implement',
      status: 'active',
      note: '00:42',
      logs: [
        'Write   domain/lockout.test.ts',
        'Bash    vitest run --project unit          6 passed',
        'Write   domain/lockout.ts',
        'probity failing test observed first',
        'Bash    stryker run --mutate domain',
        'gate    mutation 71% below threshold 90%',
      ],
    },
    { stage: 'verify', status: 'pending', logs: [] },
    { stage: 'ship', status: 'pending', logs: [] },
  ],
};
