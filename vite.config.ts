import { URL, fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { type Plugin, defineConfig } from 'vite'

// each build's version: the app checks `/version.json` against its own to know when there's a newer one
const version = process.env.GITHUB_SHA?.slice(0, 7) ?? Date.now().toString(36)
const versionFile: Plugin = {
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), versionFile, process.env.ANALYZE ? visualizer({ open: true }) : null],
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
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
