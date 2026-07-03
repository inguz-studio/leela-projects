// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import leelaTokens from "./packages/design-system/lint/leela-tokens-plugin.mjs";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/.turbo/**",
      "**/*.min.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // General quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Lint de tokens do design system (LEELA-S001-4-T2):
    // componentes e telas nunca hardcodam cor/spacing/radius — semantic-only.
    // Fontes legítimas de valores crus (tokens, gerador, preset, temas) ficam fora.
    files: [
      "packages/design-system/src/**/*.{ts,tsx}",
      "apps/*/src/**/*.{ts,tsx}",
      "apps/*/app/**/*.{ts,tsx}",
    ],
    ignores: [
      "packages/design-system/src/theme/**",
      "packages/design-system/src/tailwind-preset.ts",
      "packages/design-system/src/scripts/**",
      // Mobile (RN) tematiza via objeto de tema, não CSS vars; a regra
      // string-based é web. Adoção RN é pendência registrada na governança.
      "apps/mobile/**",
    ],
    plugins: {
      "leela-tokens": leelaTokens,
    },
    rules: {
      "leela-tokens/no-hardcoded-tokens": "error",
    },
  },
];
