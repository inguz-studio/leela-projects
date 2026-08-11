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

## 8. shadcn-first para todo componente de UI (PERMANENTE)

> Diretriz vinculante do Vitor. Pedida mais de uma vez para seleção, filtro e calendário (R9, 2026-07-18) e **ampliada em 2026-07-19 para todo e qualquer componente de UI**. Complementa a §3 (regras visuais) e o DoD de Tela. Herança obrigatória de todo lote de UI.

### Regra

**Todo componente de UI do painel usa o primitivo do DS, sempre.** O DS segue a anatomia shadcn/Radix; se o `@leela/design-system` já publica o componente, o painel consome esse. Não recria um equivalente à mão, não usa o controle nativo do sistema operacional, não estiliza um `<input>`, `<select>`, `<textarea>` ou `<input type="checkbox">` cru.

A regra não se limita a seleção rica. Ela cobre a lista **não-exaustiva**: seleção, datas, checkbox, radio, input, textarea, dialog e modal, tooltip, tabs, popover, combobox, dropdown, switch, badge, e qualquer outro controle que o DS exporte.

Checkbox nativo é violação da **mesma severidade** que `<select>` nativo. A marca e os estados de um `<input type="checkbox">` cru não respeitam os tokens nem o AA por estado do DS. Use o `Checkbox` do DS.

### Exceção (porta única)

Um componente custom, fora do DS, só é aceitável quando:

- **(a)** não existe equivalente shadcn nem no DS para o padrão; ou
- **(b)** há necessidade técnica forte que o primitivo do DS não atende.

Nos **dois** casos a exceção exige **justificativa documentada**: um ADR ou nota de decisão equivalente com contexto, critérios de decisão explícitos e a a11y provada. O padrão correto de exceção é o **ADR-017** (modal e primitivos Radix-free para a superfície pública da landing). A landing não pode carregar Radix por peso de bundle público, então o DS ganhou uma entrada Radix-free e a duplicação foi ratificada com critérios ordenados e 10/10 testes de comportamento. Desviar do primitivo do DS sem esse registro é violação, não exceção.

### Seleção rica, filtro, popover e calendário

- Selects, dropdowns, popovers, comboboxes e calendários seguem a anatomia shadcn/Radix: Popover (âncora) + Command (lista filtrável WAI-APG) para seleção rica; focus ring de 2px (`--border-focus`); densidade e tokens do DS (semantic-only); teclado completo e ARIA correto.
- **O `<select>` nativo fica proibido para filtros e seleções ricas.** A lista de opções do `<select>` nativo é renderizada pelo sistema operacional e **não** é estilizável pelos tokens do DS: é a "caixa fora do padrão" que o Vitor apontou. É aceitável só em formulário simples de baixa cardinalidade onde o listbox estilizado não agrega, e mesmo aí o `Select` do DS é preferível.
- **Calendários e date pickers** usam `react-day-picker` ancorado em Popover (padrão shadcn), com tokens do DS. O calendário do sistema operacional (`<input type="date">` e `datetime-local`) fica proibido.

### Gate de UI

Todo lote de UI responde, por componente: "o controle é o primitivo do DS, não o nativo do SO nem um fork à mão?" — junto de "consultou e reusou o existente?" e "documentou no showroom?". Componente custom sem o ADR ou nota de exceção reprova o gate.

### O cânone, e por que esta seção sozinha não bastou (2026-08-11 · RN-558)

Esta §8 é de 2026-07-19 e é vinculante desde então. Mesmo assim, a varredura de 11/08 achou **223 divergências de procedência** — 192 delas superfícies que reescreveram a anatomia do `Card` à mão, com todos os tokens corretos. A regra em prosa não bastou por dois motivos, e os dois têm conserto declarado:

1. **A regra citava "controle" e a lista de primitivos, então ela foi lida como regra de controle.** Cartão, superfície, layout e estado ficaram de fora da leitura. Cinco controles crus sobraram no repositório inteiro (a §8 pegou), contra 192 superfícies (a §8 não alcançou).
2. **Não havia mapa padrão → componente**, então "usa o DS" era critério inchecável por construção: sem cânone declarado não há contra o quê reprovar, e onde o DS não publica componente — layout composto, até hoje — cada tela inventa a sua sem errar formalmente.

O que fecha: o mapa canônico em **`03-canon/canone-de-componentes.md`**, que é a fonte e cobre 13 famílias de padrão, não só controle; a **RN-558** no [[LEELA-E01-design-system]], que torna procedência regra de negócio e obriga padrão sem cânone a virar decisão do dono; e o gate **`leela-canon`** (spec em `02-rodadas/2026-08-11-roadmap-componentes/05-gate-leela-canon.md`), que torna a §8 verificável em vez de exortativa. Medição completa em `02-rodadas/2026-08-11-roadmap-componentes/02-inventario-componentes.md`.

**Dívida do próprio DS, registrada aqui porque é a §8 violada dentro de casa:** o `ConfirmModal` monta `<textarea>` (`ConfirmModal.tsx:198`) e `<input type="checkbox">` (`:226-228`) crus em vez de compor o `Textarea` e o `Checkbox` que o pacote publica. Toda tela que usa `ConfirmModal` herda estados que não passaram pelo AA por estado. Primeiro item da Onda 0.

### Primitivos no DS

`Popover`/`DropdownMenu`, `Command`, `Combobox`, `Calendar`, `Checkbox`, `Radio`/`RadioGroup`, `Input`, `Textarea`, `SearchInput`, `Switch`, `Modal`/`Dialog`, `Tooltip`, `Tabs`, `Select`, `FilterMenu` já existem no DS (R9-A criou os de seleção rica e datas; GATE-DS-W1 confirmou 46 componentes publicados). Antes de escrever qualquer controle, confira o barrel `@leela/design-system` e o showroom (`packages/design-system` → `#/componentes`). Ver `02-rodadas/2026-07-18-ux-review/03-stories.md §S-R9-05`.
