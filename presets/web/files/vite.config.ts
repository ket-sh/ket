import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { varlockVitePlugin, type VarlockVitePluginOptions } from '@varlock/vite-integration';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';

// @varlock/vite-integration declares its plugin factory as returning `any`.
const varlockEnvPlugin: (options?: VarlockVitePluginOptions) => PluginOption = varlockVitePlugin;

// Feature-Sliced Design gives routing its own layer, and TanStack Start reads
// the routes, the router entry and the generated tree out of one directory.
export default defineConfig({
  plugins: [
    varlockEnvPlugin({ ssrInjectMode: 'auto-load' }),
    tanstackStart({ srcDirectory: 'src/app' }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
