const WORKSPACE = '^(packages|presets)/([^/]+)/src/';

const COMMAND = '^(packages|presets)/([^/]+)/src/commands/([^/]+)/';

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
      to: { path: COMMAND, pathNot: '^$1/$2/src/commands/$3/' },
    },
    {
      name: 'shared-knows-no-commands',
      comment: 'shared is the floor of a package. It may not reach up into a command.',
      severity: 'error',
      from: { path: `${WORKSPACE}shared/` },
      to: { path: `${WORKSPACE}commands/` },
    },
    {
      name: 'entry-sees-only-command-files',
      comment: 'main and run wire commands together. They never reach past command.ts.',
      severity: 'error',
      from: { path: '^(packages|presets)/([^/]+)/src/(main|run)\\.ts$' },
      to: {
        path: `${WORKSPACE}commands/[^/]+/`,
        pathNot: `${WORKSPACE}commands/[^/]+/command\\.ts$`,
      },
    },
    {
      name: 'packages-keep-their-internals',
      comment:
        'A package reaches another through its published entry, never by path. Deep imports outlive the refactor that breaks them.',
      severity: 'error',
      from: { path: WORKSPACE },
      to: { path: WORKSPACE, pathNot: '^$1/$2/src/' },
    },
    {
      name: 'cli-draws-no-terminal',
      comment:
        'The CLI reaches the TUI through a lazy import of its command and nothing else. A renderer in this package would put command logic in a component tree.',
      severity: 'error',
      from: { path: '^packages/cli/src/' },
      to: { path: '^(@opentui/|react$|react/|react-dom)' },
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
