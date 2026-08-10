---
tags: [leela, handoff, design-system, glass, dataviz, redesign-ds]
trace: leela-redesign-ds-20260809
lane: BLUR
data: 2026-08-09
---

# Handoff vivo — REDESIGN-DS · lane BLUR (micro-lane)

> Persona: `sf-frontend-lead` (Software Forge). Mind-clones declarados no
> employee (dan-abramov, rich-harris, evan-you, addy-osmani, kent-c-dodds) —
> **nenhum invocado via Task tool nesta lane**: as duas pontes eram consumo
> mecânico de tokens já provados pela lane TOKENS, sem decisão de framework,
> perf ou padrão de interação. Registrado por transparência.

Contrato: `.nirvana/briefs/leela-redesign-ds-20260809-blur-enriched.md`.
Baseline: lane TOKENS (`.nirvana/handoffs/leela-redesign-ds-20260809-TOKENS.md`,
selada) + lane TELA (`.nirvana/handoffs/leela-redesign-ds-20260809-TELA.md`,
selada — vetável 1 é a origem exata desta lane).
Spec de design: `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/README.md`
§2 (glass) e §6 (dataviz).
Território: `packages/design-system` SOMENTE. `apps/` não tocado.

## Estado

SELADA. As duas pontes do contrato concluídas, gates verdes, push confirmado.

1. [x] §2 — consumo do blur: `Card`/`KpiCard`/`CardEvento`/`CardDesafio` ganham
   `backdrop-filter: var(--card-blur)` — commit `f98b2c0a`
2. [x] §6 — rampa no brasa: `--chart-accent-2` (âmbar) entra no tema brasa —
   commit `c8f45e17`
3. [x] Gates finais + diff review + este documento

Commits da lane (ordem cronológica, ambos em `main`, ambos pushed):

| Commit | Assunto |
|---|---|
| `c8f45e172f3bdf6d0d4cb60a949249cc948082a8` | feat(design-system): brasa ganha chart.accent-2 (rampa âmbar do §6) |
| `f98b2c0ab434c2851d7ff87787503edba2ce9f30` | feat(design-system): cartões do DS consomem --card-blur (glass §2) |

Push: `cfedba14..f98b2c0a` em `origin/main`, confirmado
(`git push` → `cfedba14..f98b2c0a  main -> main`).

Ordem de commit: primeiro a ponte de tokens (§6, base + gerador), depois o
consumo nos componentes (§2) — cada commit isolado por pathspec explícito,
`git status --short` conferido antes de cada `git add` (nenhum arquivo de
outra lane na árvore no momento desta lane).

## O que cada ponte fechou

### §2 — consumo do blur (commit `f98b2c0a`)

`Card.tsx`, `KpiCard.tsx`, `CardEvento.tsx`, `CardDesafio.tsx` — os 4
componentes do DS que escrevem `background: var(--surface-raised)` na
família de "cartão" — ganharam **uma linha nova cada**:

```
'[backdrop-filter:var(--card-blur)]'
```

Sintaxe: propriedade arbitrária do Tailwind (`[propriedade:valor]`), não a
utility `backdrop-blur-[...]`. Motivo: `--card-blur` já carrega o filtro
COMPLETO (`blur(24px) saturate(1.45)` ou `none`), não um raio isolado —
`backdrop-blur-[var(--card-blur)]` produziria `backdrop-filter:
blur(blur(24px) saturate(1.45)))`, quebrado. Já existe precedente idêntico
no repo (`[stroke-width:var(--icon-stroke)]` em
`EmptyState.stories.tsx`), então não é padrão novo.

Nenhum componente lê `--glass-blur` nem qualquer valor cru — cada um só
referencia `--card-blur`, e a cascata (`[data-glass="on"]`, lane TOKENS)
resolve para `--glass-blur` ou `none` sozinha. Fora do modo vidro a linha é
inerte (`none`), exatamente como o README prevê.

**Excluído do escopo, registrado, não tocado:**
- `EventRow.tsx` — tem o MESMO padrão CSS (`bg-[var(--surface-raised)]
  shadow-elev-1`, até `hover:shadow-elev-2` igual ao `Card`), mas não é
  nomeado nem documentado como "cartão" no DS (é uma linha de lista). Não
  entrou porque o contrato fala em "componentes de cartão" e `EventRow` não
  se autodeclara um. Fica para o dono decidir se estende.
- `SystemStateScreen.tsx` (bloco `isError`) — usa `surface-raised` mas SEM
  nenhum token de elevação (`shadow`/`box-shadow`) — não bate no critério do
  §2 mesmo na leitura mais larga.

### §6 — rampa no brasa (commit `c8f45e17`)

`--chart-accent-2` (âmbar `oklch(0.75 0.13 75)`, valor literal do README §6,
copiado byte a byte do que já existia em `semantic.dark-wine.json`) entra no
tema brasa.

**Descoberta que mudou a implementação:** `tokens/semantic.json` (a base) É
o semantic do brasa — hoje sem nenhum arquivo de override próprio (brasa é
usado direto pelo gerador, sem `mergeTokens`). Adicionar `accent-2` direto
na base vazaria para o `wine` também, porque `mergeTokens` é **deep merge**:
como `semantic.wine.json` não redeclara `chart.accent-2`, ele herdaria o
valor da base silenciosamente — e o contrato pede SÓ brasa, com o invariante
"nenhum outro valor muda em nenhum tema" como gate de reprovação.

Corrigido criando `tokens/semantic.brasa.json` — mesmo padrão que
`semantic.wine.json`/`semantic.dark-wine.json` já usam (override sobre a
base), só que minúsculo (uma chave). `generate-tokens.ts` passou a mergear
`semanticBase + semanticBrasa` para o brasa, igual ao wine/dark-wine.
`chart.accent` (a ponta lime da rampa) **não** entrou — o brief pede só a
ponta âmbar, e inventar a ponta lime seria decisão de marca fora do escopo.

## Gates (saída real de cada comando, não presumida)

| Gate | Comando | Resultado |
|---|---|---|
| `generate-tokens` limpo | `pnpm --config.verify-deps-before-run=false run generate-tokens` (em `packages/design-system`) | `[generate-tokens] brasa.css, wine.css, dark-wine.css, index.css, rn-themes.ts → written.` — sem erro |
| Idempotência | `generate-tokens` rodado 2x seguidas, hash SHA-256 dos 5 arquivos gerados comparado | hashes idênticos nas duas rodadas (brasa.css, index.css, wine.css, dark-wine.css, rn-themes.ts) — gerador determinístico |
| Diff — brasa ganha SÓ o que foi pedido | `git diff` de `themes/brasa.css`, `themes/index.css`, `src/theme/rn-themes.ts` | exatamente **1 linha nova** em cada (`--chart-accent-2: oklch(0.75 0.13 75);` / `"chart-accent-2": "oklch(0.75 0.13 75)"`), no bloco brasa, na mesma posição relativa (após `--chart-grid`); nenhum valor pré-existente mudou |
| Diff — wine intocado | `git diff -- packages/design-system/themes/wine.css` | **vazio** — byte a byte idêntico ao HEAD anterior |
| Diff — dark-wine intocado | `git diff -- packages/design-system/themes/dark-wine.css` | **vazio** — byte a byte idêntico ao HEAD anterior |
| Type-check | `pnpm --config.verify-deps-before-run=false run type-check` (`tsc --noEmit`) | limpo, sem output |
| Lint | `pnpm --config.verify-deps-before-run=false run lint` (`eslint src showcase/src --max-warnings 0`) | limpo, sem output |
| Suíte do DS inteira | `pnpm --config.verify-deps-before-run=false run test` (`vitest run`) | **1579/1579 em 70 arquivos**, verde. `BarChart`/`DonutChart` emitem stderr de `width(0)/height(0)` (jsdom sem layout, ruído pré-existente, não falha) |
| Zero hex/px no diff dos componentes | `git diff` dos 4 componentes \| `grep -E '#[0-9a-fA-F]{3,8}\|rgba?\(\|[0-9]+px'` sobre as linhas adicionadas | **zero ocorrências** |
| Fiação do vidro do painel — `superficie.test.ts` | `vitest run src/shell/__tests__/superficie.test.ts` (em `apps/painel`) | **19/19** verde |
| Fiação do vidro do painel — `SuperficieDoPainel.test.tsx` | `vitest run src/shell/__tests__/SuperficieDoPainel.test.tsx` (em `apps/painel`) | **5/5** verde (warnings de React Router future flag, ruído pré-existente) |
| Fiação do vidro do painel — `GlowDaPagina.test.tsx` | `vitest run src/shell/__tests__/GlowDaPagina.test.tsx` (em `apps/painel`) | **3/3** verde (warning de `act()`, ruído pré-existente do `RootShell`, não relacionado a esta lane) |
| `apps/` intocado | `git status --short -- apps` antes e depois da lane | só ruído pré-existente (`apps/mobile/.expo/`, untracked, não criado por esta lane) — nenhum arquivo rastreado de `apps/` mudou |

## Vetáveis abertos

Nenhum novo. O único vetável que esta lane tinha autoridade para fechar (o
consumo do blur em `Card`/`KpiCard`, vetável 1 da lane TELA) foi fechado.

## Achados registrados (fora do escopo, não decisão de marca)

1. **`EventRow` tem o mesmo padrão CSS de "cartão elevado"** (`surface-raised`
   + `shadow-elev-1`/`shadow-elev-2` no hover) mas não é nomeado como cartão
   no DS — não ganhou o blur. Se o dono quiser o vidro nas linhas de evento
   também, é uma decisão de nomear/estender, não um bug desta lane.
2. **LLM.txt de `Card`/`KpiCard`/`CardEvento`/`CardDesafio` não foram
   atualizados** com o novo token consumido (`--card-blur`). Fora do delta de
   duas linhas do contrato; documentação discricionária, mesma categoria do
   achado #9 da lane TOKENS sobre o showcase.
3. Herdados das lanes 1 e 2, ainda abertos (não é escopo desta lane, só
   repetidos por completude): gradiente `thumb-virtual` do dark-wine
   reprovando AA (2,45:1 contra piso 3:1); `governanca-design.md`
   desatualizado; eixo do `BarChart` truncando nome longo; barra de ações do
   hub de clubs virando balde de 5 botões.

## O que só o olho do dono fecha (L-011 — gate de código não prova marca)

Sem navegador nesta lane (regra da casa):

- **O desfoque de verdade.** Os 4 componentes agora emitem
  `backdrop-filter: var(--card-blur)`, mas ver o vidro desfocar de fato (e o
  glow atrás borrado através do card) é conferência visual — nenhum teste
  jsdom calcula `backdrop-filter`.
- **A rampa lime→âmbar no brasa.** `--chart-accent-2` existe agora, mas
  `--chart-accent` (lime) continua ausente no brasa — a rampa fica pela
  metade até alguém pedir a ponta que falta. Nenhum gráfico do painel
  consome nenhum dos dois hoje (achado #2 da lane TELA, inalterado).

## Próximo passo

Nenhuma pendência desta lane. O ciclo REDESIGN-DS-0809 (TOKENS → TELA →
BLUR) está com as três lanes seladas. Review antagonista e decisão sobre os
vetáveis herdados (gradiente `thumb-virtual`, extensão do blur a
`EventRow`) ficam para o dono.
