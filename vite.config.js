import path from 'path';
import { defineConfig } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import ViteComponents from 'unplugin-vue-components/vite';
import { VuetifyResolver } from 'unplugin-vue-components/resolvers';
import visualizer from 'rollup-plugin-visualizer';
import eslintPlugin from 'vite-plugin-eslint';

export default defineConfig({
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/analytics',
      'firebase/firestore',
    ],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      plugins: [
        visualizer(),
      ],
      output: {
        manualChunks: {
          firebase: ['firebase'],
          vuetify: ['vuetify', 'vuetify/lib'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~vuetify': 'vuetify',
    },
  },
  plugins: [
    createVuePlugin(),
    ViteComponents({
        dts: 'src/@types/components.d.ts',
        resolvers: [
          VuetifyResolver(),
        ],
    }),
    eslintPlugin(),
  ],
});
