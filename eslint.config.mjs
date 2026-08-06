// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import leelaTokens from "./packages/design-system/lint/leela-tokens-plugin.mjs";
import leelaScroll from "./packages/design-system/lint/leela-scroll-plugin.mjs";
import leelaAuth from "./packages/design-system/lint/leela-auth-plugin.mjs";

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
  {
    // Padrão de rolagem (BUILD-SCROLL-PADRAO): ninguém declara um eixo de
    // overflow sozinho — o CSS promove o outro a `auto` e nasce a segunda barra
    // de rolagem (o "scroll duplo" que o dono reportou três vezes). A regra
    // completa e as três constantes estão em
    // packages/design-system/src/utils/scroll.ts.
    //
    // Testes ficam fora: `toHaveClass('overflow-y-hidden')` afirma uma classe
    // renderizada, não declara CSS de componente.
    // O showroom entra no escopo (REV-SCROLL): ele monta o próprio contêiner de
    // rolagem com o AppShell, exatamente como o RootShell do painel, e por ficar
    // de fora ele guardou um `overflow-y-auto` solto durante toda a varredura,
    // com o gate verde. O `lint` do DS também passou a varrer `showcase/src`.
    files: [
      "packages/design-system/src/**/*.{ts,tsx}",
      "packages/design-system/showcase/src/**/*.{ts,tsx}",
      "apps/*/src/**/*.{ts,tsx}",
      "apps/*/app/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
      // Mobile (RN) não usa Tailwind — estiliza por objeto de tema.
      "apps/mobile/**",
    ],
    plugins: {
      "leela-scroll": leelaScroll,
    },
    rules: {
      "leela-scroll/no-scroll-de-um-eixo": "error",
    },
  },
  {
    // Fronteira de autenticação do painel (FRONTEIRA-AUTH): "ninguém entra no
    // sistema sem estar autenticado". A verdade hoje é estrutural — `App.tsx`
    // tem DOIS irmãos debaixo do `<BrowserRouter>`: o bloco público
    // (`AuthLayout`: entrar, cadastrar, recuperar/redefinir senha) e o bloco do
    // app (`RequireSessao`). Um TERCEIRO irmão é uma linha de diff, não quebra
    // build nem teste, e nasce aberto ao mundo.
    //
    // A regra exige que todo `<Route>` de topo declare de que lado está. Abrir
    // uma rota nova ao anônimo passa a exigir a edição DESTE arquivo — a
    // decisão aparece sozinha no diff da review em vez de se esconder na
    // indentação do App.tsx.
    //
    // Escopo: só o painel. A landing é Next (App Router), não tem `<Routes>`, e
    // a fronteira dela é outro contrato (callables + Rules, sem sessão de
    // servidor) — regra própria quando houver o que travar.
    files: ["apps/painel/src/**/*.tsx"],
    ignores: ["**/__tests__/**", "**/*.test.tsx"],
    plugins: {
      "leela-auth": leelaAuth,
    },
    rules: {
      "leela-auth/rota-fora-da-fronteira": [
        "error",
        { guardas: ["RequireSessao"], publicas: ["AuthLayout"] },
      ],
    },
  },
  {
    // Campo de senha da casa (FRONTEIRA-AUTH · pedido do dono: revelar a senha,
    // exigir número + caractere especial, indicar força). Eram DEZESSETE campos
    // em nove arquivos, nos dois apps. O décimo oitavo será escrito por alguém
    // que não leu nenhum dos outros — e é ele que esta regra pega, antes que
    // nasça sem `type="button"` no botão (que submete o formulário) ou sem o
    // `autocomplete` que o gerenciador de senha precisa.
    //
    // Escopo: só `apps/`. O design system precisa do `<input type="password">`
    // cru para construir o `InputSenha`.
    files: ["apps/painel/src/**/*.tsx", "apps/landing/app/**/*.tsx"],
    ignores: ["**/__tests__/**", "**/*.test.tsx", "apps/mobile/**"],
    plugins: {
      "leela-auth": leelaAuth,
    },
    rules: {
      "leela-auth/senha-fora-do-ds": "error",
    },
  },
];
