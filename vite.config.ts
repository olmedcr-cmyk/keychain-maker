import { defineConfig } from 'vite';

export default defineConfig({
  // manifold-3d ships its own wasm loader; don't let Vite pre-bundle it.
  optimizeDeps: { exclude: ['manifold-3d'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  worker: { format: 'es' },
});
