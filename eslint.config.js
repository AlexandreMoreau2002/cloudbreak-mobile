// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // jest.mock() factories sont hoistées avant la resolution des imports :
    // require() a l'interieur de la factory est le seul moyen d'acceder a React/RN.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
