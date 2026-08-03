import type { PresetItem } from '@ket/preset';

import { STANDING_FILES, STANDING_INTEGRATIONS, STANDING_TOOLCHAIN, writes } from '@ket/preset';

export const CLI_PRESET: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-cli',
  type: 'registry:item',
  title: 'ket cli',
  description: 'A command line tool under ket, with the gate chain ket runs against itself.',
  dependencies: ['citty@0.2.2'],
  devDependencies: [
    ...STANDING_TOOLCHAIN,
    '@cucumber/cucumber@13.2.0',
    'dependency-cruiser@18.1.0',
    '@types/bun@1.3.14',
  ],
  files: [
    ...STANDING_FILES,
    writes('CLAUDE.plain.md', 'CLAUDE.plain.md'),
    writes('dependency-cruiser.cjs', '.dependency-cruiser.cjs'),
    writes('cucumber.json', 'cucumber.json'),
    writes('source/features/greeting.feature', 'features/greeting.feature'),
    writes('source/acceptance/run-built.ts', 'acceptance/run-built.ts'),
    writes('source/acceptance/steps/greeting.steps.ts', 'acceptance/steps/greeting.steps.ts'),
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
  integrations: [...STANDING_INTEGRATIONS],
};
