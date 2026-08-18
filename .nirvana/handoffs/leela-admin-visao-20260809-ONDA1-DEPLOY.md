# Handoff vivo · ADMIN-VISAO onda 1 — lane de deploy (ONDA1-DEPLOY)

- **trace_id:** `leela-admin-visao-20260809`
- **lane:** ONDA1-DEPLOY · empresa software-forge · perfil `sf-platform-lead`
- **insumos:** handoff do construtor (`...ONDA1.md`) + handoff do fix (`...ONDA1-FIX.md`, commits até `664f5273`)
- **data:** 2026-08-10
- **gatilho:** a retenção (pós-check da purga) caiu — purga completou 17:39Z
- **alvo:** SÓ `--only functions`. Rules/hosting/firestore/storage PROIBIDOS nesta lane. `firestore.rules` = zero linha nas lanes anteriores (provado); NÃO deployadas aqui.

## Estado

⏳ **Em voo.** Gates verdes, inventário ANTES capturado, deploy disparado.

## Pré-condições conferidas

- Branch `main`, HEAD `a2a27abb`; `664f5273` (último commit do fix) é ancestral do HEAD — provado por `git merge-base --is-ancestor`.
- Delta `664f5273..HEAD` em `functions/`: **vazio** (`git diff --stat` sem saída). Os commits posteriores são docs/specs de outras lanes + `firebase.prod.json` (fix de cache de hosting da lane TELA-PRETA, `b73eef6e` — não afeta o alvo `functions`).
- Árvore de trabalho em `functions/` limpa (só `functions/lib/` untracked = saída de build, gitignorada de fato do deploy via bundle).
- O que sobe (exports do `functions/src/index.ts` da onda): `agendarRecomputePlatformRollups` (linha 77; `.schedule('15 * * * *')` + `.timeZone('America/Sao_Paulo')` confirmados em `functions/src/platform/rollups.ts` L192-193) e `listarClientesDoTenant` (linha 496).

## Gates pré-deploy — saída literal (em `functions/`)

| Gate | Comando | Saída literal |
|---|---|---|
| type-check | `pnpm --config.verify-deps-before-run=false run type-check` | `$ tsc --noEmit` → exit 0, zero erros |
| lint | `pnpm --config.verify-deps-before-run=false run lint` | `$ eslint src --max-warnings 0` → exit 0, zero erros/warnings |

## Inventário ANTES

`npx firebase-tools@13 functions:list --project prod` → **99 functions**.
Lista bruta: `.nirvana/tmp/onda1deploy-functions-before.txt` · nomes ordenados:
`.nirvana/tmp/onda1deploy-names-before.txt`. As duas da onda 1 **ausentes**
(só o callable manual `recomputePlatformRollups`, pré-existente).

## Deploy

Comando: `npx firebase-tools@13 deploy --only functions --project prod --config firebase.prod.json --non-interactive`
Log: `.nirvana/tmp/onda1deploy-deploy.log`. Bundle esbuild único — TODAS as
functions redeployam (esperado, não é anomalia).

(seções seguintes preenchidas na aterrissagem)

## Inventário DEPOIS + diff nominal

_pendente_

## Prova do cron

_pendente_

## Board

_pendente_
