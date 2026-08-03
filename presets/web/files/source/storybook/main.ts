import type { StorybookConfig } from '@storybook/tanstack-react/node';

// The application's vite config carries the TanStack Start plugin, and
// Storybook reads that config. The TanStack framework is what stubs the server
// half of Start for the browser, so the preview builds instead of colliding
// with Start's own client build.
const config: StorybookConfig = {
  framework: '@storybook/tanstack-react',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
};

export default config;
