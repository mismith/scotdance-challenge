import { URL, fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vuetify(), process.env.ANALYZE ? visualizer({ open: true }) : null],
  build: {
    chunkSizeWarningLimit: 600, // firebase alone is ~580 kB
    rolldownOptions: {
      output: {
        // vendor chunks change less often than the app, so they stay cached across deploys
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'vuetify', test: /node_modules[\\/]vuetify/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
