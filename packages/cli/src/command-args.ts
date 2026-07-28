import type { ArgsDef } from 'citty';

export const COMMAND_ARGS = {
  cwd: {
    type: 'string',
    description: 'Directory to work in',
    default: '.',
  },
} as const satisfies ArgsDef;
