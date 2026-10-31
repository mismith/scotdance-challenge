import { URL, fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), process.env.ANALYZE ? visualizer({ open: true }) : null],
  build: {
    chunkSizeWarningLimit: 600, // firebase alone is ~580 kB
    rolldownOptions: {
      output: {
        // vendor chunks change less often than the app, so they stay cached across deploys
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'ui', test: /node_modules[\\/](reka-ui|@floating-ui|lucide-vue-next)/ },
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
