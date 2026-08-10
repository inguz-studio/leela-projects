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

EM EXECUÇÃO. Plano de tarefas (mapeado após leitura completa do README + inspeção do gerador/ThemeProvider/testes existentes):

1. [x] Tema dark-wine: `primitives.dark-wine.json` + `semantic.dark-wine.json` (com revisão de formato) + patch `generate-tokens.ts` + `pnpm generate-tokens` — commits `c23d916b` (+ fix `dbc66d5f`, ver Incidente abaixo)
2. [ ] ThemeProvider (web+RN): `Theme` ganha `'dark-wine'`, validações, retrocompat intocada
3. [ ] Camada glass: `glass.json` + bloco `[data-glass="on"]` + `@supports` fallback + testes de contraste do glass
4. [ ] Tipografia do brasa: `font.family.ui` = Rubik, 4 tokens de peso, carga da webfont no mesmo mecanismo (showcase)
5. [ ] Gates finais + diff review + board + veredito

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
