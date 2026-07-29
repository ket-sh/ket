const COMMAND = '^src/commands/([^/]+)/';

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'commands-are-islands',
      comment:
        'A command may not reach another command. Whatever two commands need belongs in shared.',
      severity: 'error',
      from: { path: COMMAND },
      to: { path: COMMAND, pathNot: '^src/commands/$1/' },
    },
    {
      name: 'shared-knows-no-commands',
      comment: 'shared is the floor. It may not reach up into a command.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/commands/' },
    },
    {
      name: 'entry-sees-only-command-files',
      comment: 'main and run wire commands together. They never reach past command.ts.',
      severity: 'error',
      from: { path: '^src/(main|run)\\.ts$' },
      to: { path: '^src/commands/[^/]+/', pathNot: '^src/commands/[^/]+/command\\.ts$' },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      from: { orphan: true, pathNot: ['\\.d\\.ts$'] },
      to: {},
    },
    {
      name: 'production-not-into-tests',
      severity: 'error',
      from: { pathNot: '\\.test\\.ts$' },
      to: { path: '\\.test\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage|\\.stryker-tmp)/' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      exportsFields: ['exports'],
    },
  },
};
