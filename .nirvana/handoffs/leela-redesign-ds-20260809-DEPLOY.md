---
trace: leela-redesign-ds-20260809
lane: DEPLOY
employee: sf-platform-lead (software-forge)
repo: C:\dev\LEELA
worktree: C:\dev\leela-wt-redesign-deploy
head_pinado: 021e3e4a
data: 2026-08-10
papel: subir ao ar o pacote REDESIGN-DS liberado pelo re-gate delta da review antagonista
---

# DEPLOY — REDESIGN-DS · handoff selado

Contrato: `.nirvana/briefs/leela-redesign-ds-20260809-deploy-enriched.md`. Método: o mesmo
provado pela `leela-deploy-corte-ret-20260809` (worktree pinado, build em ordem de
dependência, deploy hosting-only, prova baixada do ar com hash e strings, controles
positivo e negativo).

## Etapa 0 · portão

Veredito de entrada: **LIBERADA PARA DEPLOY**, re-gate delta em
`.nirvana/handoffs/leela-redesign-ds-20260809-REV.md` (seção "Re-gate delta", 2026-08-10).
D-1 e D-2 pagos pela lane FIX; commit aprovado `021e3e4a` (código idêntico a `5826466d`, o
topo é só docs — confirmado por `git log -1 --format="%H %ci" 021e3e4a`).

Árvore principal no início desta lane: limpa em `packages/` e `apps/` (só os arquivos de
docs/board desta e de lanes anteriores, não tocados por esta lane até o fechamento).

## Etapa 1 · worktree + build

`git worktree add C:/dev/leela-wt-redesign-deploy 021e3e4a` — ok, HEAD detached em
`021e3e4a`. (Nota de método: a primeira tentativa com path `C:\dev\leela-wt-redesign-deploy`
foi engolida pelo bash como caminho drive-relativo e criou o worktree dentro de
`C:\dev\LEELA\`; removida com `git worktree remove --force` e refeita com barras normais —
sem consequência, nenhum build rodou na tentativa errada.)

`pnpm install --config.verify-deps-before-run=false` — ok (único aviso:
`@sentry/cli` fica de fora de propósito, igual ao precedente; `pnpm-workspace.yaml` ganhou
uma linha de scaffold automática do pnpm dentro do worktree descartável, sem efeito na
árvore principal).

Build em ordem de dependência (nenhum pacote tem `dist/` num worktree novo — todos
gitignorados):

| Pacote | Build | Resultado |
|---|---|---|
| `packages/core` | `tsup` | ok — `dist/index.js` 302.83 KB |
| `packages/api-client` (depende de `core`) | `tsup` | ok — `dist/index.js` 101.52 KB |
| `packages/design-system` | `tsup` | ok — `dist/index.js` 246.28 KB |
| `apps/painel` | `vite build --mode leela-hub` | ok — 4001 módulos, `index-NiMJIszs.js` (2.269,43 kB) + `index-CD9xuJJq.css` (127,36 kB) + `browser-BXdiCFWD.js` (24,53 kB, inalterado), 13,35s |

### Verificação local antes de subir (o build não mentiu)

No `dist/assets` recém-gerado, antes de qualquer deploy:

| Sonda | Resultado local |
|---|---|
| `"Sem registro (30 dias"` no JS | presente (1) |
| `"Engajamento"` no JS | presente (1) |
| `"sem atividade há 30 dias"` no JS (frase antiga) | ausente (0) |
| controle negativo `xyzzy` no JS e no CSS | ausente (0/0) |
| `[data-glass="on"]` no CSS | presente (2) |
| `Exo 2` / `Rubik` no CSS | presentes (2/2) |

## Etapa 2 · deploy — hosting-only do painel

Confirmação de alvo único antes do comando (lido de `firebase.prod.json`):

```
hosting alvos: 1
  site=leela-hub  public=apps/painel/dist
```

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
i  hosting[leela-hub]: found 14 files in apps/painel/dist
+  hosting[leela-hub]: file upload complete
+  hosting[leela-hub]: version finalized · release complete
+ Deploy complete!
```

**Um alvo só** (`--only hosting`, config declara 1 site) — nenhum comando desta lane tocou
functions, rules, índices ou a landing.

## Etapa 3 · prova pós-deploy baixada do ar

### Prova 1 · hash do bundle — antes × depois

| asset | ANTES (no ar até este deploy, confirmado por curl antes de subir) | DEPOIS (no ar agora) |
|---|---|---|
| JS | `index-_EVW2ljU.js` (sha256 `a1dd6f53c3…`, idêntico ao provado pela DEPLOY-CORTE-RET) | **`index-NiMJIszs.js`** |
| CSS | `index-3PlkfKJK.css` | **`index-CD9xuJJq.css`** |

### Prova 2 · o servido é byte a byte o construído localmente

```
index-NiMJIszs.js  local b54466afce24dc5ef74e97affce3d040fe1d5b9c09bf27e2d65377f6162ced41
                    no ar b54466afce24dc5ef74e97affce3d040fe1d5b9c09bf27e2d65377f6162ced41   IDÊNTICO
index-CD9xuJJq.css local 79a027a90e00c10b1753631dfa4b215958c7e8b59972c3391a14443e9c62d77a
                    no ar 79a027a90e00c10b1753631dfa4b215958c7e8b59972c3391a14443e9c62d77a   IDÊNTICO
```

### Prova 3 · strings novas e antiga, no JS baixado do ar (não do build local)

| Sonda | No ar? |
|---|---|
| `"Sem registro (30 dias+)"` (rótulo novo do D-2) | **presente** (1) |
| `"Engajamento"` (rota/labels novas) | **presente** (1) |
| `"sem atividade há 30 dias"` (frase antiga que o D-2 removeu) | **ausente** (0) |
| controle positivo — `"leela-theme-preference"` (já vivia no ar antes deste deploy) | **presente** (1) |
| controle negativo (`xyzzy`) | **ausente** (0) |

### Prova 4 · CSS baixado do ar

| Sonda | No ar? |
|---|---|
| `[data-glass="on"]` | **presente** (2 ocorrências) |
| `Exo 2` (família display, token `--font-family-display`) | **presente** (2) |
| `Rubik` (família UI, token `--font-family-ui`, entra nesta lane) | **presente** (2) |
| controle negativo (`xyzzy`) | **ausente** (0) |

### Sonda de baseline (pré-deploy, para não inferir a diferença)

Antes de subir, baixei o bundle então-no-ar (`index-_EVW2ljU.js` /
`index-3PlkfKJK.css`, hash confirmado igual ao da DEPLOY-CORTE-RET) e rodei as
mesmas sondas: zero ocorrência de `"Sem registro (30 dias"`, zero de
`"Engajamento"`, zero de `[data-glass="on"]`, zero de `Rubik` (só `Exo 2` ×3, o
token único pré-redesign). Isso é o "antes" que a "prova baixada do ar, não
inferida" pede — as strings não existiam no ar até este deploy.

### Smokes finais (leitura, sem escrita)

| # | Smoke | Resultado |
|---|---|---|
| 1 | painel `/` | http=200 · 0,40s |
| 2 | painel `/clubes/engajamento` (rewrite SPA) | http=200 |

## Etapa 4 · limpeza

`git worktree remove --force` reportou "Directory not empty" (arquivos residuais de
`node_modules`/`dist`, gitignorados); o git já havia desregistrado o worktree (sumiu de
`git worktree list`) e a pasta em disco foi apagada manualmente (`rm -rf`). Confirmado:
`git worktree list` mostra só `C:/dev/LEELA [main]`, e o path
`C:/dev/leela-wt-redesign-deploy` não existe mais.

## Fechamento

| Passo | Estado | Prova |
|---|---|---|
| 0. Portão | ✅ | re-gate delta da REV: LIBERADA PARA DEPLOY; commit `021e3e4a` confirmado (código = `5826466d`, topo só docs) |
| 1. Worktree + build | ✅ | pinado em `021e3e4a`; `core`→`api-client`→`design-system`→`painel` nessa ordem, todos gitignorados, todos rebuildados do zero; sondas locais bateram antes de subir |
| 2. Painel | ✅ **NO AR** | hash mudou (`index-_EVW2ljU.js`→`index-NiMJIszs.js`, `index-3PlkfKJK.css`→`index-CD9xuJJq.css`), byte a byte igual ao build local, strings novas presentes, frase antiga ausente, `[data-glass="on"]` e Exo 2/Rubik presentes no CSS servido, controles positivo e negativo se comportaram como esperado |
| 3. Limpeza | ✅ | worktree removido (git + disco) |

### Zero mudança em functions/rules/índices/landing

Único comando de deploy desta lane: `firebase deploy --only hosting --project prod --config
firebase.prod.json`, e `firebase.prod.json` declara hosting como o único alvo possível para
`leela-hub`. Nenhum comando usou `--only functions`, `--only firestore`, `--only storage`,
deploy sem `--only`, nem tocou a landing (`firebase.landing.json` não foi referenciado).

### Nada foi violado

Não fiz deploy de functions, Firestore, Rules, storage, índices ou landing · não rodei
suíte (fora de escopo desta lane, já verde na REV) · não editei código de produto · não abri
navegador (toda prova por `curl`/`sha256sum`/`grep`) · não escrevi em nenhum documento de
produção além de handoff/board/adendo · commits de docs na árvore principal com
`git commit --only` e pathspec explícito, sem `-A`, sem `stash`, sem `amend`.

Status: **concluído.**
