import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Feature-Sliced Design gives routing its own layer, and TanStack Start reads
// the routes, the router entry and the generated tree out of one directory.
export default defineConfig({
  plugins: [tanstackStart({ srcDirectory: 'src/app' }), react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
