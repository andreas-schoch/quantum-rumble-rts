/* eslint-env node */
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    minify: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'quantum-rumble',
      fileName: 'quantum-rumble',
    },
  },
  plugins: [dts()],
});
