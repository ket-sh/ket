import { defineConfig } from 'vitest/config';

// The domain runs in node so the mutation runner can drive it. Anything under a
// ui segment is an adapter and a browser answers for it instead.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'domain',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/ui/**', 'e2e/**'],
        },
      },
    ],
  },
});
