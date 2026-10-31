import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginImport from 'eslint-plugin-import-x'
import pluginVue from 'eslint-plugin-vue'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['functions/**', '**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  { plugins: { import: pluginImport } },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@/assets/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@/utils',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/utils/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/stores/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/composables/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/directives/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/components/ui/**',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '@/views/**',
              group: 'internal',
            },
            {
              pattern: '@/sections/**',
              group: 'internal',
            },
            {
              pattern: '@/components/**',
              group: 'internal',
            },
          ],
          alphabetize: {
            order: 'asc',
          },
          named: true,
        },
      ],
    },
  },
  {
    files: ['**/components/ui/**/*.{js,vue}'],
    rules: {
      'vue/multi-word-component-names': ['off'],
      'vue/require-default-prop': ['off'],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },
)
