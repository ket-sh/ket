export interface PresetFile {
  path: string;
  type: 'registry:file';
  target: string;
}

// A preset offers what suits it. A tool that reads a screen has nothing to say
// about a command line, so the preset that governs one never asks for it.
export interface PresetIntegration {
  name: string;
  asks: string;
  files: PresetFile[];
}

export interface PresetItem {
  $schema: string;
  name: string;
  type: 'registry:item';
  title: string;
  description: string;
  dependencies: string[];
  devDependencies: string[];
  files: PresetFile[];
  integrations: PresetIntegration[];
}

function writes(path: string, target: string): PresetFile {
  return { path: `files/${path}`, type: 'registry:file', target: `~/${target}` };
}

export function everyFileOf(item: PresetItem): PresetFile[] {
  return [...item.files, ...item.integrations.flatMap((integration) => integration.files)];
}

const PIN_SEPARATOR = '@';

function nameOfPin(pin: string): string {
  return pin.slice(0, pin.lastIndexOf(PIN_SEPARATOR));
}

export function dependencyNamesOf(item: PresetItem): string[] {
  return [...item.dependencies, ...item.devDependencies].map(nameOfPin);
}

export const CLI_PRESET: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-cli',
  type: 'registry:item',
  title: 'ket cli',
  description: 'A command line tool under ket, with the gate chain ket runs against itself.',
  dependencies: ['citty@0.2.2'],
  devDependencies: [
    'oxlint@1.76.0',
    'oxfmt@0.61.0',
    '@stylistic/eslint-plugin@5.10.0',
    'oxlint-tsgolint@7.0.2001',
    'vitest@4.1.10',
    'fast-check@4.5.0',
    '@stryker-mutator/core@9.6.1',
    '@stryker-mutator/vitest-runner@9.6.1',
    'dependency-cruiser@18.1.0',
    'knip@6.29.0',
    'jscpd@5.0.14',
    'cspell@10.0.1',
    'lefthook@2.1.10',
    '@commitlint/cli@21.2.1',
    '@commitlint/config-conventional@21.2.0',
    '@nizos/probity@1.10.0',
    'typescript@5.9.3',
    '@types/bun@1.3.14',
  ],
  files: [
    writes('oxlintrc.json', '.oxlintrc.json'),
    writes('oxfmtrc.json', '.oxfmtrc.json'),
    writes('tsconfig.json', 'tsconfig.json'),
    writes('vitest.config.ts', 'vitest.config.ts'),
    writes('stryker.conf.json', 'stryker.conf.json'),
    writes('vitest.mutation.config.ts', 'vitest.mutation.config.ts'),
    writes('dependency-cruiser.cjs', '.dependency-cruiser.cjs'),
    writes('knip.json', 'knip.json'),
    writes('jscpd.json', '.jscpd.json'),
    writes('cspell.json', 'cspell.json'),
    writes('cspell-words.txt', 'cspell-words.txt'),
    writes('lefthook.yml', 'lefthook.yml'),
    writes('commitlint.config.ts', 'commitlint.config.ts'),
    writes('probity.config.ts', 'probity.config.ts'),
    writes('mise.toml', 'mise.toml'),
    writes('gitleaks.toml', '.gitleaks.toml'),
    writes('vale.ini', '.vale.ini'),
    writes('vale-styles/NoEmDash.yml', '.vale/styles/ket/NoEmDash.yml'),
    writes('vale-styles/Terminology.yml', '.vale/styles/ket/Terminology.yml'),
    writes('vale-styles/Intensifiers.yml', '.vale/styles/ket/Intensifiers.yml'),
    writes('vale-styles/WeakOpeners.yml', '.vale/styles/ket/WeakOpeners.yml'),
    writes('vale-vocabulary/accept.txt', '.vale/styles/config/vocabularies/ket/accept.txt'),
    writes('gitignore', '.gitignore'),
    writes('github-ci.yml', '.github/workflows/ci.yml'),
    writes('source/run.ts', 'src/run.ts'),
    writes('source/main.ts', 'src/main.ts'),
    writes('source/commands/hello/command.ts', 'src/commands/hello/command.ts'),
    writes('source/commands/hello/greeting.ts', 'src/commands/hello/greeting.ts'),
    writes('source/commands/hello/greeting.test.ts', 'src/commands/hello/greeting.test.ts'),
    writes(
      'source/commands/hello/greeting.property.test.ts',
      'src/commands/hello/greeting.property.test.ts',
    ),
  ],
  integrations: [
    {
      name: 'codecov',
      asks: 'codecov reports how much of the code the suite reaches. Free for a public repository. A private one is free to 250 uploads a month, then paid per user.',
      files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
    },
    {
      name: 'codeql',
      asks: 'codeql scans for security defects on every push. Free for a public repository. A private one needs GitHub Code Security, billed per committer.',
      files: [writes('github-codeql.yml', '.github/workflows/codeql.yml')],
    },
    {
      name: 'coderabbit',
      asks: 'coderabbit reviews every pull request. Free for a public repository. A private one gets 200 reviews a month free, then paid per user.',
      files: [writes('coderabbit.yaml', '.coderabbit.yaml')],
    },
  ],
};
