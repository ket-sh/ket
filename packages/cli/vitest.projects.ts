import type { TestProjectConfiguration } from 'vitest/config';

const CLIENT = 'src/commands/item/surface/client';

export function projectsLeavingOut(excluded: string[]): TestProjectConfiguration[] {
  return [
    {
      test: {
        name: 'server',
        include: ['src/**/*.test.ts'],
        exclude: [...excluded, `${CLIENT}/**`],
        setupFiles: ['vitest.git-setup.ts', 'vitest.toolbox-setup.ts'],
      },
    },
    {
      test: {
        name: 'client',
        environment: 'happy-dom',
        include: [`${CLIENT}/**/*.test.ts`],
        setupFiles: ['vitest.client-setup.ts'],
      },
    },
  ];
}
