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
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        vi: "readonly",
      },
    },
  ],
};
