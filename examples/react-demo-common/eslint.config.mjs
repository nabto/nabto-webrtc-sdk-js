//import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from '@stylistic/eslint-plugin'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["integration_test/generated/**/*", "src/impl/backend/**/*", "dist/**/*"]
  },
  {
    files: ["react/**/*.{js,mjs,cjs,ts}", "webrtc/**/*.{js,mjs,cjs,ts}"],
  },
  {
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      //'@stylistic/indent': ['error', 4],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  }
];
