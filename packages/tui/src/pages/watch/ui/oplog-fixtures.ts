import type { OplogEventView } from '../../../shared/model';

function loggedOf(worn: Partial<OplogEventView>): OplogEventView {
  return {
    outcome: undefined,
    gate: undefined,
    about: undefined,
    item: undefined,
    reason: undefined,
    at: undefined,
    note: undefined,
    actor: undefined,
    ...worn,
  };
}

export const LOGGED: OplogEventView[] = [
  loggedOf({
    gate: 'lint',
    outcome: 'allowed',
    about: 'bun run lint',
    at: '2026-08-07T11:45:00.000Z',
  }),
  loggedOf({
    note: 'researching the breakdown',
    actor: 'decomposer',
    item: 'K-2',
    at: '2026-08-07T11:30:00.000Z',
  }),
  loggedOf({
    gate: 'write',
    outcome: 'refused',
    about: 'src/keeper.ts',
    reason: 'no spec named',
    item: 'K-1',
    at: '2026-08-07T11:00:00.000Z',
  }),
  loggedOf({
    gate: 'shell',
    outcome: 'allowed',
    about: 'bun test',
    at: '2026-08-07T10:30:00.000Z',
  }),
  loggedOf({
    gate: 'transition',
    outcome: 'allowed',
    about: 'designing',
    item: 'K-1',
    at: '2026-08-07T10:00:00.000Z',
  }),
];
