# Governança do design system · Leela

> Regras que mantêm o `packages/design-system` único, temável e consistente ao longo do tempo. Complementa `epics/LEELA-E01-design-system.md` e o DoD de componente em `definition-of-done.md`. Violação de regra dura (lint) quebra o build; não há rewrite automático.

## 1. Arquitetura de tokens (3 tiers)

| Tier | Onde vive | Quem pode referenciar |
|------|-----------|----------------------|
| Primitives | `tokens/primitives.brasa.json`, `tokens/primitives.leela.json` | Apenas o tier semantic |
| Semantic | `tokens/semantic.json` | Componentes e telas |
| Component | `tokens/component.json` | O próprio componente dono do token |

Regras:

- **Componente referencia semantic (ou seu próprio component token), nunca primitivo direto e nunca valor cru.** `bg-[var(--surface-raised)]` é correto; `bg-[var(--primary-500)]` e `bg-[#FF450C]` são violações.
- Temas (`brasa`, `leela`) são apenas conjuntos distintos de primitives. Trocar tema não pode exigir mudança em componente. Se exigir, o componente vazou primitivo.
- Os arquivos gerados (`themes/*.css`, `src/theme/rn-themes.ts`) nunca são editados à mão. Fluxo: editar JSON de token, rodar `pnpm generate-tokens` no package e commitar JSON + gerados juntos.
- Web consome CSS custom properties via `[data-theme]`; React Native consome o objeto `brasaTheme`/`leelaTheme` via `ThemeProviderRN`.

## 2. Lint de tokens (regra dura)

A regra `leela-tokens/no-hardcoded-tokens` (plugin em `packages/design-system/lint/leela-tokens-plugin.mjs`, ativada no `eslint.config.mjs` da raiz) barra em qualquer string de componente ou tela:

- Cor hex: `#FF450C`, `#fff`, `#ffffff80`.
- Funções de cor: `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch()`, `lab()`, `lch()`.
- `px`/`rem`/`em` crus em arbitrary values do Tailwind: `h-[64px]`, `p-[1.5rem]`.

Permitido: qualquer arbitrary value que resolve para token — `h-[var(--table-row-height)]`, `max-w-[calc(100vw-var(--spacing-8))]` — e razões sem unidade como `aspect-[16/10]`.

Escopo atual: `packages/design-system/src/**`, `apps/*/src/**` e `apps/*/app/**` (web). Fora do escopo, por serem fonte legítima de valor cru: `src/theme/**`, `src/tailwind-preset.ts`, `src/scripts/**` e os JSON de tokens.

Pendência registrada: `apps/mobile` (React Native) tem hex hardcoded em telas de scaffold e tematiza por objeto, não por CSS var. A adoção mobile exige migrar essas telas para `useTheme()`/`brasaTheme` e então remover `apps/mobile/**` dos ignores da regra.

Proibido desabilitar a regra inline (`eslint-disable`) em tela. Se um caso parece exigir valor cru, o caminho é criar token (seção 5).

## 3. Regras visuais duras

- **Flat por padrão (§2.16).** Sem borda decorativa. Exceções permitidas: input, divider, card selecionado, upload dashed, card crítico com border-left Vulcão (o Toast usa a mesma exceção de borda esquerda semântica).
- **Acessibilidade AA.** Contraste WCAG AA, foco visível de 2px (`--border-focus`), navegação por teclado completa, ARIA correto (roles, `aria-current`, `aria-selected`, live regions em Toast). Motion sempre atrás de `motion-safe:`/`prefers-reduced-motion`.
- **Loading de lista é Skeleton, nunca spinner solto.** Toast em toda ação de escrita; danger persiste até dismiss manual.
- **Tabs e SubNav (§2.7, §2.14).** Painéis de Tabs permanecem no DOM (`forceMount`); ativa com underline Brasa 2px + contador pill.
- **Copy.** Glossário HANDOFF-07; "kit" nunca "tier" (RN-216); voz do coordenador, não institucional.

## 4. Nomenclatura

- Tokens CSS: kebab-case por domínio semântico — `--surface-*`, `--text-*`, `--action-*`, `--border-*`, `--feedback-*`; component tokens prefixados pelo componente (`--btn-height-md`, `--table-row-height`).
- Componentes: PascalCase, um diretório por componente (`src/components/Nome/`) com `Nome.tsx`, `index.ts`, `__tests__/Nome.test.tsx` e `Nome.stories.tsx`.
- Variantes CVA em minúsculas e semânticas (`primary`, `destructive`, `vitoria`), nunca cor literal (`red`, `orange`). Badge nunca mistura semântica entre variantes.
- Props em português quando expõem domínio (`loses`, `keeps` são exceção herdada do §2.15; novos componentes de domínio preferem o vocabulário do glossário).

## 5. Processo para adicionar token

1. Justifique por que nenhum token existente serve (no PR).
2. Adicione no tier certo: cor de marca nova entra em primitives dos dois temas; papel novo de UI entra em semantic mapeando para primitive; medida específica de componente entra em component.
3. Rode `pnpm generate-tokens` e commite JSON + `themes/*.css` + `rn-themes.ts` juntos.
4. Se o token for consumido por classe Tailwind nomeada, exponha também no `tailwind-preset.ts`.
5. Teste de resolução: o unit de tokens já valida que todo semantic resolve para primitive existente nos dois temas.

## 6. Processo para adicionar componente

1. Confirme que não é composição de componentes existentes; o DS não aceita duplicata com outro nome.
2. Siga o padrão do package: CVA para variantes, Radix para primitivos com comportamento, `cn()` para merge de classes, tokens semantic-only.
3. Cubra todas as variantes e estados (default/hover/pressed/disabled/focus/invalid conforme o caso).
4. Testes por componente (render + interações + a11y) em `__tests__/`.
5. Story no catálogo (`Nome.stories.tsx`) demonstrando variantes; o toggle da toolbar do Storybook valida os dois temas sem mudança de markup.
6. Exporte no `src/index.ts` e satisfaça o DoD de componente antes do merge.

## 7. Catálogo

`pnpm storybook` no package sobe o catálogo em `localhost:6006`; `pnpm build-storybook` gera o estático. Toda alteração visual de componente deve ser conferida nos dois temas pelo toggle antes do merge. Nenhuma tela redefine token ou componente localmente; se a tela precisa de algo que o DS não tem, o componente nasce no DS, não na tela.
