import { defineConfig, enforceTdd } from '@nizos/probity';

export default defineConfig({
  rules: [
    {
      files: [
        'packages/*/src/**',
        'presets/*/src/**',
        '!**/*.test.*',
        '!**/*.test-d.*',
        '!**/*.gen.*',
      ],
      rules: [enforceTdd({ maxEvents: 30 })],
    },
  ],
});
