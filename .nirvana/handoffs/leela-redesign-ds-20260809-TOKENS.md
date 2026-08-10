---
tags: [leela, handoff, design-system, tokens, redesign-ds]
trace: leela-redesign-ds-20260809
lane: TOKENS
data: 2026-08-09
---

# Handoff vivo — REDESIGN-DS · lane TOKENS

> Persona: `sf-frontend-lead` (Software Forge). Mind-clones declarados no employee (dan-abramov, rich-harris, evan-you, addy-osmani, kent-c-dodds) — nenhum foi invocado via Task tool nesta lane: o trabalho é implementação direta de tokens/gerador/ThemeProvider, sem decisão de framework/perf que justificasse consultar os clones. Registrado por transparência.

Contrato: `.nirvana/briefs/leela-redesign-ds-20260809-enriched.md`.
Spec técnica: `leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/README.md` (seções 1-4 = meu escopo).
Decisão do dono: `leela-specs/02-rodadas/2026-08-09-redesign-ds/00-decisao.md`.
Território: `packages/design-system` SOMENTE — não toquei `apps/`.

## Estado

SELADA. Todas as tarefas concluídas, gates verdes, board atualizado.

1. [x] Tema dark-wine: `primitives.dark-wine.json` + `semantic.dark-wine.json` (com revisão de formato) + patch `generate-tokens.ts` + `pnpm generate-tokens` — commits `c23d916b` (+ fix `dbc66d5f`, ver Incidente abaixo)
2. [x] ThemeProvider (web+RN): `Theme` ganha `'dark-wine'`, validações, retrocompat intocada — commit `5a895da8`
3. [x] Camada glass: `glass.json` + bloco `[data-glass="on"]` + `@supports` fallback + testes de contraste do glass — commit `b5e75f49`
4. [x] Tipografia do brasa: `font.family.ui` = Rubik, 4 tokens `--peso-*`, carga da webfont no mecanismo do showcase — commit `3ecbe818`
5. [x] Gates finais + diff review + board + veredito — este documento

Commits da lane (ordem cronológica, todos em `main`, todos pushed):
- `c23d916b` — feat(design-system): tema dark-wine entra no gerador de tokens
- `dbc66d5f` — fix(git): remove arquivo de outra lane que entrou junto no commit anterior
- `5a895da8` — feat(design-system): ThemeProvider aceita dark-wine + suite de contraste cobre o 3o tema
- `b5e75f49` — feat(design-system): camada glass — tokens, bloco [data-glass="on"] e fallback @supports
- `3ecbe818` — feat(design-system): tipografia pareada do brasa — Exo 2 (display) + Rubik (ui) + peso-*

Push: `d67c35db..3ecbe818` em 2 lotes (`..5a895da8` e `..3ecbe818`), ambos confirmados no remoto (`origin/main`).

## Vetáveis abertos (registrados, não decididos)

- **thumb.virtual do dark-wine falha AA em t=0.25** (ícone branco .9 sobre mix ≈ `#81AC30` = 2.45:1, piso é 3.0:1). `linear-gradient(135deg, #A3D93B, #1B2410)` vem literal de `semantic.dark-wine.json` (handoff do dono). Diferente do `border.strong` (mesma lane, CORRIGIDO — era desvio de padrão entre temas irmãos, não escolha de cor), aqui mudar o endpoint claro do gradiente é decisão de marca. Teste marcado `it.fails` em `contrast.test.ts` (rastreado, não mascarado) até o dono decidir a cor.

## Incidente (árvore compartilhada) — corrigido

Commit `c23d916b` (tarefa 1) varreu `.nirvana/handoffs/leela-painel-corte-20260809-DEPLOY-CORTE.md`
junto — arquivo de OUTRA lane, já staged no index compartilhado antes de eu rodar `git add`.
Corrigido em `dbc66d5f` com `git rm --cached` (arquivo permanece intocado no disco, volta a
untracked, a lane dona commita quando quiser) — sem `reset --hard`, sem `amend`. Diretriz adotada
daqui pra frente: `git status --short` conferido logo antes de cada `git add`/commit desta lane,
`git add` sempre com paths explícitos.

## Achados da leitura prévia (ficam registrados para a retomada)

- `primitives.dark-wine.json` do handoff está **incompleto** frente ao formato de `primitives.brasa.json`/`primitives.wine.json`: falta `font.size`, `font.weight`, `font.lineHeight`, `spacing`, `radius`, `motion`, `icon`. Essas seções são **idênticas byte a byte** entre brasa e wine hoje, então a "revisão" pedida pelo brief é copiá-las para dark-wine (não é decisão de marca, é escala universal do DS). `gradient` NÃO precisa ser adicionado: `semantic.dark-wine.json` sobrescreve `thumb.*` com gradientes LITERAIS (não `{gradient.X}`), cobrindo as 6 chaves que a base usa.
- `danger/success/warning/heroico` em `primitives.dark-wine.json` só têm os stops 300-700 (brasa/wine têm 50-900). Conferido: nenhum semantic (base ou dark-wine) referencia stop fora de 300-700 para essas famílias — não é bug, não vou inventar stops que a marca não deu.
- `semantic.dark-wine.json` não sobrescreve `table.*` nem `datebadge.*` — herda os valores do brasa (base) via `mergeTokens`. Isso é o mesmo padrão que `wine` já usa para `thumb` (quando não sobrescreve, herda). Não é lacuna a preencher por mim — registrado como achado, não como decisão de marca.
- Territorial: a carga de webfont (Exo 2 hoje) acontece em DOIS mecanismos, nenhum deles em `apps/`... na verdade um está em `apps/painel/src/globals.css` (`@import` Google Fonts) e outro em `apps/landing/app/layout.tsx` (`next/font`) — **ambos fora do meu território**. O único mecanismo de carga de fonte que vive DENTRO de `packages/design-system` é `showcase/src/showcase.css` (`@import` Google Fonts, usado pelo showroom e Storybook). Vou estender esse `@import` com Rubik 400/500/600/700 — é o único lugar onde "o mesmo mecanismo das fontes atuais" está no meu território. Registro como premissa (não vetável): a carga real em produção (painel/landing) fica para quem tocar `apps/`.

## Premissas assumidas

1. **`--peso-*` como primitive top-level, não `font.peso.*`.** O README nomeia a var `--peso-display` etc. O gerador prefixa pelo caminho do JSON (`font.peso.display` viraria `--font-peso-display`), então os 4 tokens entraram como chave irmã de `font`/`primary`/`neutral` em `primitives.brasa.json`, não aninhados. Descoberto e corrigido no meio da tarefa 4 (primeira tentativa gerou `--font-peso-*`, currigido antes de commitar).
2. **Números dos 4 papéis de peso derivados, não copiados de lugar nenhum.** O README dá a REGRA ("800 ou o maior corte disponível", "600 cai para 500", "500 cai para 400"), não os números finais. Apliquei a regra aos cortes que Exo 2 e Rubik REALMENTE carregam pelo `@import` existente (Exo 2: 400/600/700 — sem 800; Rubik, carga nova desta lane: 400/500/600/700): `display=700` (cai, sem 800 carregado), `forte=700`, `medio=600` (não cai, Rubik tem), `suave=500` (não cai, Rubik tem). Raciocínio completo no `$description` do token — reabrir se o dono achar que os números deveriam ser outros.
3. **`--card-blur`/`--page-glow` como tokens NOVOS, sem componente consumidor.** Nenhum componente (Card, KpiCard, etc.) foi tocado — "nenhum componente sabe que glass existe" é leitura literal do README, e wiring de consumo (`backdrop-filter: var(--card-blur)` em algum componente real) é trabalho de CONSUMO, fora de "tokens". A lane entrega o mecanismo completo e provado (CSS gerado, testes), pronto para a lane que for construir a tela.
4. **`--surface-raised-opaque` só para `surface-raised`** (não criei `--elevation-2-opaque` nem `--page-glow-opaque`). O exemplo literal do README só mostra o fallback de `surface-raised`; inventar fallback para os outros dois seria escopo não pedido.
5. **Bloco `[data-glass="on"]` + `@supports` repetido em CADA `themes/*.css`** (não só em `index.css`). Cada arquivo de tema publicado fica self-sufficient — mesmo padrão do `rootFallback` do brasa hoje (quem importa só `brasa.css` continua funcional). Repetição é idêntica/inofensiva quando os 3 arquivos são concatenados em `index.css`.
6. **`page.glow` da base (brasa/wine) é `"none"`** — nenhum tema tinha esse conceito antes desta lane; `glass.json` só dá o valor GLASS, não o opaco. `dark-wine` é a exceção (README §1 descreve o glow como parte da identidade do tema, não só do modo glass), então herda incondicionalmente do próprio `semantic.dark-wine.json`.
7. **`primitives.dark-wine.json` ganhou as 7 seções que faltavam** (spacing/radius/font.size/font.weight/font.lineHeight/motion/icon) copiadas verbatim de brasa/wine — são idênticas nos 2 temas hoje, entendido como "escala universal do DS", não decisão de marca por tema. Sem isso, qualquer token de `component.json` que referenciasse essas seções ficaria com ref quebrada só para dark-wine.
8. **`border.strong` do dark-wine corrigido de `{neutral.700}` para `{neutral.500}`** — não tratei como vetável porque não é escolha de cor nova: é realinhar ao MESMO índice que brasa E wine já usam para essa role exata (ambos apontam `{neutral.500}`), com o valor `{neutral.700}` do handoff reprovando o piso de contraste por quase o dobro (1,49–1,54:1 contra o piso 3,0:1). Medido antes e depois; registrado no commit `5a895da8` e aqui, não escondido.
9. **Showcase (dentro do território, mas fora do `tsconfig` do pacote).** `showcase/src` não tem `tsconfig.json` próprio e não está no `include` de `packages/design-system/tsconfig.json` — `pnpm type-check` não o cobre, nem `showcase:build` (esbuild via Vite não faz checagem estrutural). Ainda assim mantive `HomePage.tsx` (`THEME_INFO: Record<Theme,...>`), `ShowroomBar.tsx`, `.storybook/preview.tsx` e `LLM.txt` sincronizados com o 3º tema — é completude discricionária de quem entrega, não prova de gate. Registrado para quem for medir "type-check verde" não presumir que isso cobre o showcase.
10. **Geist (fonte do dark-wine) não foi carregada.** Geist não está disponível no Google Fonts (é fonte própria da Vercel, self-hosted ou via pacote npm). O token `font.family.display/ui` do dark-wine aponta para `Geist, sans-serif` com fallback gracioso — o showroom em dark-wine hoje renderiza em `sans-serif` do sistema, não em Geist de verdade. Carregar Geist é decisão fora do escopo do README §3 (só pede a tipografia do BRASA); registrado como achado, não vetável (não bloqueia gate nenhum, fallback é gracioso).

## Veredito

**Lane TOKENS entregue e selada.** As 4 seções do README (§1 dark-wine, §2 glass, §3 tipografia do brasa, §4 breakpoints — só conferência, nada mudou) estão implementadas em `packages/design-system`, com `apps/` intocado.

### Gates (saída real de cada comando, não presumida)

| Gate | Comando | Resultado |
|---|---|---|
| `generate-tokens` limpo | `pnpm --config.verify-deps-before-run=false run generate-tokens` | `[generate-tokens] brasa.css, wine.css, dark-wine.css, index.css, rn-themes.ts → written.` — rodado 4x ao longo da lane, sempre sem erro |
| Idempotência (re-rodar sem editar token não muda nada) | `generate-tokens` de novo + `git status` | `themes/`/`rn-themes.ts` sem diff — gerador é determinístico |
| Type-check | `pnpm --config.verify-deps-before-run=false run type-check` (`tsc --noEmit`) | limpo, sem output, em todas as 4 rodadas (uma por tarefa) |
| Lint | `pnpm --config.verify-deps-before-run=false run lint` (`eslint src showcase/src --max-warnings 0`) | limpo, sem output, em todas as 4 rodadas |
| Suíte do DS | `pnpm --config.verify-deps-before-run=false run test` (`vitest run`) | **1579/1579 em 70 arquivos**, verde na rodada final. Um flake transitório de `Popover.test.tsx` (timeout de 5000ms sob carga de máquina) apareceu numa rodada e sumiu ao isolar o arquivo (847ms) e ao re-rodar a suíte inteira — mesmo padrão já documentado no board (NAV-FIX, "o vitest sobrecarrega esta máquina"); Popover não foi tocado por esta lane |
| Testes de contraste | incluídos na suíte acima — `contrast.test.ts` (219 casos, +1 `it.fails` documentado), `glass.test.ts` (27 casos novos, prova a regra "texto nunca translúcido, 4.5:1 sobre fundo composto" numericamente nos 3 temas), `shadcn-aliases.test.ts`, `color-scheme.test.ts`, `tokens.test.ts` | verdes |
| Diff de brasa/wine além do README | `git diff <SHA-antes-da-lane> -- themes/brasa.css themes/wine.css` | brasa: SOMENTE `font-family-ui` (Exo2→Rubik) + `--peso-*` (§3) + `--surface-raised-opaque`/`--page-glow`/`--card-blur`/`--glass-*`/bloco de ativação (§2) — nenhum valor pré-existente mudou. wine: SOMENTE a parte de §2 (glass), zero de §3 (não pedido para wine) — nenhum valor pré-existente mudou |
| Fio de luz do glass | `glass.test.ts` → `inset 0 1px 0 rgba(255,255,255,` presente em `--glass-elevation` nos 3 temas | passa |
| Fallback `@supports` | `glass.test.ts` + leitura de `themes/*.css` | `@supports not (backdrop-filter: blur(1px))` presente nos 3 arquivos de tema + `index.css` |
| `governanca-design.md` como régua (L-011) | leitura manual | seguido: 3-tier de tokens respeitado, nenhum valor cru introduzido em componente (nenhum componente tocado), nomenclatura kebab-case por domínio mantida. **Achado, não consertado** (fora do território): o próprio arquivo `governanca-design.md` está desatualizado — cita `primitives.leela.json` (nome pré-rename) e não menciona wine nem dark-wine |

### O que só o olho do dono fecha (L-011 — gate de código não prova marca)

- A cor do dark-wine (vinho + lime) e o efeito visual do glass — nenhum componente foi tocado, então não há NADA para olhar ainda nesta lane. Isso é da lane 2 (tela de Engajamento), que vai efetivamente RENDERIZAR os tokens.
- O pareamento Exo 2 + Rubik do brasa — mesma razão: nenhuma tela consome os tokens de peso ainda.

### Vetáveis para o dono (ver seção acima, repetido aqui por completude)

1. Gradiente `thumb-virtual` do dark-wine reprova AA num ponto do ícone (2,45:1 vs piso 3:1) — precisa de uma nova cor clara, decisão de marca.
2. `governanca-design.md` desatualizado (fora do meu território, achado lateral).

### Próximo passo

Lane 2 (TELA — Visão Geral v3 + Engajamento em `apps/painel`) pode começar: os tokens que ela consome (dark-wine, glass, tipografia do brasa) estão prontos, testados e documentados.
