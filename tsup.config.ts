import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/server.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist-server',
  external: [
    'vite',
    'vite-plugin-pwa',
    '@vite-pwa/assets-generator',
    '@swc/core',
    '@swc/wasm',
    'postcss',
    'tailwindcss',
    'autoprefixer',
  ],
  noExternal: [],
  clean: true,
  sourcemap: true,
});
