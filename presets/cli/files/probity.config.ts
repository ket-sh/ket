import { defineConfig, enforceTdd } from '@nizos/probity';

export default defineConfig({
  rules: [
    {
      files: ['src/**', '!**/*.test.*', '!**/*.test-d.*', '!**/*.gen.*'],
      rules: [enforceTdd()],
    },
  ],
});
