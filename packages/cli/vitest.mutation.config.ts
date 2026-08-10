import { defineConfig } from 'vitest/config';

import { projectsLeavingOut } from './vitest.projects.ts';

export default defineConfig({
  test: {
    globalSetup: ['vitest.toolbox-global.ts'],
    projects: projectsLeavingOut(['src/run.test.ts']),
  },
});
