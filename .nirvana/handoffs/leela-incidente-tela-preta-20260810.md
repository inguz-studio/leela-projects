---
trace: leela-incidente-tela-preta-20260810
lane: INCIDENTE
employee: sf-reliability-engineer (software-forge)
repo: C:\dev\LEELA
worktree: C:/dev/leela-wt-rollback
head_pinado_rollback: 9fbcd9ab
head_quebrado: 021e3e4a
data: 2026-08-10
papel: mitigar (rollback) o painel em tela preta pós-REDESIGN-DS e diagnosticar a causa-raiz
---

# INCIDENTE — painel em tela preta · handoff vivo

Contrato: `.nirvana/briefs/leela-incidente-tela-preta-20260810-enriched.md`. Método: o mesmo
provado por `leela-deploy-corte-ret-20260809` e `leela-redesign-ds-20260809-DEPLOY.md` (worktree
pinado com barras normais, build em ordem de dependência, deploy hosting-only, prova baixada do
ar com hash e strings, controles positivo e negativo).

## Sintoma

"o painel está dando tela preta. nao abre." — relato do dono, 10/08 ~02h, logo após o deploy do
pacote REDESIGN-DS (`index-NiMJIszs.js`, commit `021e3e4a`). Confirmado antes de qualquer ação:
`curl https://leela-hub.web.app/` devolvia `index-NiMJIszs.js` / `index-CD9xuJJq.css` — o bundle
quebrado estava mesmo no ar.

## FASE 1 — ROLLBACK (mitigação) ✅ CONCLUÍDA

### Etapa 0 · portão

Árvore principal (`C:\dev\LEELA`) limpa em `packages/`/`apps/` no início da lane — só docs
untracked de lanes anteriores, não tocados por esta lane.

### Etapa 1 · worktree + build

`git worktree add C:/dev/leela-wt-rollback 9fbcd9ab` — ok, HEAD detached em `9fbcd9ab` (barras
normais desde o início, lição do handoff de DEPLOY registrada e aplicada; `git worktree list`
confirma path com barra normal, sibling de `C:/dev/LEELA`, não aninhado).

`pnpm install --config.verify-deps-before-run=false` — ok (único aviso: build scripts do
`@sentry/cli` ignorados de propósito, igual aos precedentes).

Build em ordem de dependência:

| Pacote | Build | Resultado | Confere com precedente (DEPLOY-CORTE-RET)? |
|---|---|---|---|
| `packages/core` | `tsup` | `dist/index.js` 302.83 KB | idêntico |
| `packages/api-client` | `tsup` | `dist/index.js` 95.90 KB | idêntico |
| `packages/design-system` | `tsup` | `dist/index.js` 231.94 KB | idêntico |
| `apps/painel` | `vite build --mode leela-hub` | 3991 módulos · `index-_EVW2ljU.js` (2.246,67 kB) + `index-3PlkfKJK.css` (109,98 kB) + `browser-BXdiCFWD.js` (24,53 kB) · 13,44s | mesmos nomes de hash |

### Verificação local antes de subir — build reproduzível byte a byte

```
index-_EVW2ljU.js  local a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d
index-3PlkfKJK.css local 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8
```

Idêntico, hash a hash, ao registrado em `.nirvana/handoffs/leela-deploy-corte-ret-20260809.md`
(Etapa 1/Prova 2). Confirma que o worktree pinado em `9fbcd9ab` reproduz exatamente o build que
esteve no ar até o deploy do REDESIGN-DS — sem depender de artefato antigo em disco.

### Etapa 2 · deploy — hosting-only do painel

Alvo único confirmado antes do comando (`firebase.prod.json`): `hosting alvos: 1 · site=leela-hub
· public=apps/painel/dist`.

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
+ hosting[leela-hub]: file upload complete
+ hosting[leela-hub]: version finalized · release complete
+ Deploy complete!
```

**Um alvo só** (`--only hosting`) — nenhum comando desta lane tocou functions, firestore, storage,
índices ou a landing.

### Etapa 3 · prova pós-deploy baixada do ar

**Mitigado às 09:14 (10/08/2026) — painel de volta ao estado pré-redesign.**

| Sonda | Resultado |
|---|---|
| `index.html` no ar referencia | `index-_EVW2ljU.js` + `index-3PlkfKJK.css` (bundle antigo, confirmado — não mais `index-NiMJIszs.js`) |
| hash do JS baixado do ar | `a1dd6f53c3…` — **idêntico** ao build local e ao registrado no precedente |
| hash do CSS baixado do ar | `60bce6cc9f…` — **idêntico** ao build local e ao registrado no precedente |
| `GET /` | HTTP 200 |
| `GET /clubes/engajamento` (rewrite SPA) | HTTP 200 |
| controle negativo — strings do REDESIGN-DS (`"Sem registro (30 dias"`, `"Engajamento"`, `[data-glass="on"]`, `Rubik`) | **ausentes** (0/0/0/0) — confirma que o bundle do redesign saiu do ar |
| controle positivo — `Exo 2` no CSS (token único pré-redesign) | **presente** (3 ocorrências) — mesma contagem da sonda de baseline do precedente |
| controle negativo genérico (`xyzzy`) | ausente (0) |

Rollback provado no ar por hash byte a byte + smoke + controles positivo/negativo. **Painel fora
do bundle quebrado desde 09:14 de 10/08/2026.**

### Etapa 4 · limpeza do worktree de rollback

Adiada — o mesmo worktree (`C:/dev/leela-wt-rollback`) será reaproveitado (checkout local, sem
novo `worktree add`) para reproduzir o boot do commit quebrado `021e3e4a` na FASE 2, evitando
tocar a árvore principal. Removido ao final de toda a lane (ver Etapa de limpeza final abaixo).

---

## FASE 2 — DIAGNÓSTICO

Ver seção abaixo, preenchida após a mitigação.
