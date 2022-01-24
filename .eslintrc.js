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
    'plugin:vue/essential',
  ],
  rules: {
    'vue/multi-word-component-names': 1,
  },
};
