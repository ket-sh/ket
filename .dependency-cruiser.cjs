const WORKSPACE = '^(packages|presets)/([^/]+)/src/';

const CLI = '^packages/cli/src/';

const CLI_COMMAND = '^packages/cli/src/commands/([^/]+)/';

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-keep-their-internals',
      comment:
        'A package reaches another through its published entry, never by path. Deep imports outlive the refactor that breaks them.',
      severity: 'error',
      from: { path: WORKSPACE },
      to: {
        path: WORKSPACE,
        pathNot: ['^$1/$2/src/', '^(packages|presets)/[^/]+/src/index\\.ts$'],
      },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)tsconfig\\.json$'] },
      to: {},
    },
    {
      name: 'production-not-into-tests',
      severity: 'error',
      from: { pathNot: '\\.test\\.ts$' },
      to: { path: '\\.test\\.ts$' },
    },

    {
      name: 'preset-knows-no-preset',
      comment:
        'packages/preset says what a preset is. Reaching a preset would tie the definition to one instance of it, and the next preset would inherit the cli.',
      severity: 'error',
      from: { path: '^packages/preset/src/' },
      to: { path: '^presets/' },
    },
    {
      name: 'cli-commands-are-islands',
      comment:
        'A cli command may not reach another command. Whatever two commands need belongs in shared.',
      severity: 'error',
      from: { path: CLI_COMMAND },
      to: { path: CLI_COMMAND, pathNot: '^packages/cli/src/commands/$1/' },
    },
    {
      name: 'cli-shared-knows-no-commands',
      comment: 'shared is the floor of the cli. It may not reach up into a command.',
      severity: 'error',
      from: { path: `${CLI}shared/` },
      to: { path: `${CLI}commands/` },
    },
    {
      name: 'cli-entry-sees-only-command-files',
      comment: 'main and run wire the cli together. They never reach past command.ts.',
      severity: 'error',
      from: { path: `${CLI}(main|run)\\.ts$` },
      to: {
        path: `${CLI}commands/[^/]+/`,
        pathNot: `${CLI}commands/[^/]+/command\\.ts$`,
      },
    },
    {
      name: 'cli-draws-no-terminal',
      comment:
        'The cli reaches the terminal view through the tui package and nothing else. A renderer here would put command logic in a component tree.',
      severity: 'error',
      from: { path: CLI },
      to: { path: '^(@opentui/|react$|react/|react-dom)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage|\\.stryker-tmp)/|^(packages|presets)/[^/]+/files/' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      exportsFields: ['exports'],
    },
  },
};
