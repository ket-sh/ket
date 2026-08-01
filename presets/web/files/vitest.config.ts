import { defineConfig } from 'vitest/config';

// The domain runs alone in node, because that is what the mutation runner
// drives. An integration test composes real collaborators and stubs only the
// network, so it takes a setup file and never reaches the mutation gate.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'domain',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/ui/**', 'src/**/*.integration.test.ts', 'e2e/**'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.integration.test.ts'],
          setupFiles: ['src/test-support/integration-setup.ts'],
        },
      },
    ],
  },
});
