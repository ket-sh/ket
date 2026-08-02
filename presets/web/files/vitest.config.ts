import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The domain runs alone in node, because that is what the mutation runner
// drives. An integration test composes real collaborators and stubs only the
// network, so it takes a setup file and never reaches the mutation gate.
// A project inherits nothing it does not ask for, so each one extends this
// config to read the same `@` the application and the type checker read.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'domain',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/ui/**', 'src/**/*.integration.test.ts', 'e2e/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.integration.test.ts'],
          setupFiles: ['src/test-support/integration-setup.ts'],
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'component',
          include: ['src/**/*.browser.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
