const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['coverage/**', 'node_modules/**', '.expo/**', 'dist/**'],
  },
  expoConfig,
]);
