import type { PresetSemantics } from './semantics.d.ts';

const semantics: PresetSemantics = {
  slice: {
    root: 'src/commands/{slice}',
    adapter: 'command.ts',
    mutate: ['**/*.ts', '!**/*.test.ts', '!command.ts', '!io/**'],
  },
  acceptance: {
    runner: 'cucumber',
    drives: 'binary',
  },
  substrate: 'temporary-directories',
  gates: [],
  testRuntime: 'vitest',
};

export default semantics;
