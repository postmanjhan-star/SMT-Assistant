/* eslint-env node */
require( "@rushstack/eslint-patch/modern-module-resolution" );

module.exports = {
  root: true,
  extends: [
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    "@vue/eslint-config-prettier/skip-formatting",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  env: {
    browser: true,
    node: true,
    "vue/setup-compiler-macros": true,
  },
  rules: {
    "vue/no-mutating-props": "warn",
  },
  overrides: [
    {
      files: [ "**/*.ts", "**/*.tsx" ],
      parser: "@typescript-eslint/parser",
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
    {
      files: [ "**/*.vue" ],
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [ ".vue" ],
      },
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
    {
      files: [ "**/*.spec.ts", "tests/**/*.ts" ],
      globals: {
        afterEach: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        vi: "readonly",
      },
    },
    // --- Architecture Boundary Rules ---
    // Domain 層：不可依賴 client 或 infra 層
    {
      files: [ "src/domain/**/*.ts" ],
      rules: {
        "no-restricted-imports": [ "error", {
          patterns: [
            {
              group: [ "@/client", "@/client/*", "../client", "../client/*" ],
              message: "[Arch] Domain 層不可依賴 client 層。錯誤映射請移至 Application/Infra adapter。",
            },
            {
              group: [ "@/infra", "@/infra/*", "@/infrastructure", "@/infrastructure/*" ],
              message: "[Arch] Domain 層不可依賴 Infra 層。",
            },
          ],
        } ],
      },
    },
    // Pages/UI 層：不可依賴 infra 或 client 層
    {
      files: [ "src/pages/**/*.ts", "src/pages/**/*.vue", "src/ui/**/*.ts", "src/ui/**/*.vue" ],
      rules: {
        "no-restricted-imports": [ "error", {
          patterns: [
            {
              group: [ "@/infra", "@/infra/*", "@/infrastructure", "@/infrastructure/*" ],
              message: "[Arch] Pages/UI 不可直接依賴 Infra 層。透過 Application 層注入。Phase 5 修復目標。",
            },
            {
              group: [ "@/client", "@/client/*" ],
              message: "[Arch] Pages/UI 不可直接依賴 client 層。透過 Application 層。參見 REFACTORING_BASELINE.md。Phase 3 修復目標。",
            },
          ],
        } ],
      },
    },
  ],
};
