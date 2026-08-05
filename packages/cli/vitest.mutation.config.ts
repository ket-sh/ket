import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          include: ['src/**/*.test.ts'],
          exclude: ['src/run.test.ts', 'src/commands/item/surface/client/**'],
        },
      },
      {
        test: {
          name: 'client',
          environment: 'happy-dom',
          include: ['src/commands/item/surface/client/**/*.test.ts'],
          setupFiles: ['vitest.client-setup.ts'],
        },
      },
    ],
  },
});
