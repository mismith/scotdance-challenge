module.exports = {
  root: true,
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [
          [
            '@',
            './src',
          ],
        ],
      },
    },
  },
  extends: [
    '@vue/eslint-config-typescript',
    'plugin:vue/recommended',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'eol-last': ['error', 'always'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'semi': ['error', 'never'],
    'vue/html-self-closing': ['error', {
      html: {
        void: 'always',
        normal: 'always',
        component: 'always',
      },
      svg: 'always',
      math: 'always',
    }],
    'vue/max-attributes-per-line': 0,
    'vue/multi-word-component-names': 0,
    'vue/singleline-html-element-content-newline': 0,
  },
}
