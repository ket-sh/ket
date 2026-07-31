import { defineConfig, enforceTdd } from '@nizos/probity';

export default defineConfig({
  rules: [
    {
      files: ['src/**/model/**', 'src/**/lib/**', '!**/*.test.*', '!**/*.test-d.*', '!**/*.gen.*'],
      rules: [enforceTdd()],
    },
  ],
});
