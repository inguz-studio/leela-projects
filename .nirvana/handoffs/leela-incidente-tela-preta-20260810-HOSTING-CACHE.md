---
trace: leela-incidente-tela-preta-20260810
lane: HOSTING-CACHE
employee: sf-platform-lead (software-forge)
repo: C:\dev\LEELA (main)
worktree: C:/dev/leela-wt-cachefix (pinado em 9fbcd9ab)
data: 2026-08-10
papel: matar a roleta de tela preta pós-deploy — headers de cache no hosting do painel, bundle INALTERADO
contrato: .nirvana/briefs/leela-hosting-cache-20260810-enriched.md
---

# HOSTING-CACHE — headers de cache no painel · handoff vivo

## Etapa 0 · baseline medida do ar (ANTES) ✅

Medição por curl, 10/08/2026 (após o rollback da FASE 1 do incidente):

| Sonda | Resultado |
|---|---|
| `curl -sI https://leela-hub.web.app/` | `Cache-Control: max-age=3600` (default Firebase — a causa do incidente) · ETag `2dbef1bc…` · Last-Modified 10 Aug 2026 12:14:00 GMT |
| `curl -sI .../assets/index-_EVW2ljU.js` | `Cache-Control: max-age=3600` (assets imutáveis sem `immutable` — desperdício, mas não a causa) |
| sha256 do JS baixado do ar | `a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d` — **idêntico** ao alvo do gate de identidade |
| index.html no ar referencia | `index-_EVW2ljU.js` + `index-3PlkfKJK.css` (bundle do rollback, como esperado) |

**Landing:** NÃO tocada nesta lane, por contrato. Medição de hoje (registrada no brief): o HTML
dela já sai `no-cache, no-store` — está segura, nenhuma ação necessária.

## Etapa 1 · mudança no firebase.prod.json (main) ✅

Bloco `headers` no `hosting` (ordem: catch-all `**` primeiro, `/assets/**` depois — no Firebase
Hosting a última regra que casa vence para a mesma chave):

- `**` → `Cache-Control: no-cache` (ETag continua; revalidação = 304 barato)
- `/assets/**` → `Cache-Control: public, max-age=31536000, immutable`

Sem tocar em site/public/rewrites/ignore. Sem tocar em functions/firestore/storage. JSON validado
por parse (`node -e require(...)`) antes do commit.

## Etapa 2 · commit --only + push ✅

`git commit --only firebase.prod.json` → **`b73eef6e`** na main
(`fix(hosting): index.html no-cache e assets imutaveis — mata a tela preta de cache pos-deploy
[TELA-PRETA-HOSTING-CACHE]`), 1 arquivo, 8 inserções. Push ok (`664f5273..b73eef6e`). Nenhum
outro arquivo da árvore (outras lanes têm modificados — não varridos).

## Etapa 3 · worktree pinado + builds em ordem ✅

`git worktree add C:/dev/leela-wt-cachefix 9fbcd9ab` (barras normais, sibling de `C:/dev/LEELA`).
`pnpm --config.verify-deps-before-run=false install` ok (único aviso: build scripts do
`@sentry/cli` ignorados de propósito, igual aos precedentes). Builds um por vez:
core (tsup) → api-client (tsup) → design-system (tsup) → painel
(`vite build --mode leela-hub`, 3991 módulos, `index-_EVW2ljU.js` 2.246,67 kB, 14,26s).

## Etapa 4 · gate de identidade ✅ PASSOU

```
index-_EVW2ljU.js  local a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d  == alvo
index-3PlkfKJK.css local 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8  == alvo
```

Idêntico byte a byte ao bundle no ar (medido na Etapa 0) e ao registrado no rollback da FASE 1.
Deploy autorizado: o bundle NÃO muda.

## Etapa 5 · deploy --only hosting ✅

`firebase.prod.json` NOVO (da main, commit `b73eef6e`, com o bloco `headers`) copiado por cima do
do worktree (que estava pinado em `9fbcd9ab`, sem headers) — documentado aqui por contrato.
Alvo conferido antes do comando: hosting alvos: 1 · site=leela-hub · public=apps/painel/dist.

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
+ hosting[leela-hub]: file upload complete (14 files)
+ hosting[leela-hub]: version finalized · release complete
+ Deploy complete!
```

**Release no ar às 13:49:46 (10/08/2026, hora local).** Um alvo só (`--only hosting`) — nenhum
comando desta lane tocou functions, firestore, storage, índices ou a landing.

## Etapa 6 · prova pós-deploy baixada do ar ✅

| Sonda | Antes | Depois |
|---|---|---|
| `Cache-Control` do `/` (index.html) | `max-age=3600` | **`no-cache`** ✅ |
| `Cache-Control` de `/assets/index-_EVW2ljU.js` | `max-age=3600` | **`public, max-age=31536000, immutable`** ✅ |
| `Cache-Control` de `/assets/index-3PlkfKJK.css` | `max-age=3600` | **`public, max-age=31536000, immutable`** ✅ |
| sha256 do JS baixado do ar | `a1dd6f53c3…` | `a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d` — **INALTERADO** ✅ |
| ETag do index.html | `2dbef1bc…` | `2dbef1bc…` — **idêntico** (conteúdo do HTML não mudou) ✅ |
| ETag do JS | `a9ea3609…` | `a9ea3609…` — idêntico ✅ |
| index.html no ar referencia | `index-_EVW2ljU.js` + `index-3PlkfKJK.css` | os MESMOS ✅ |
| `GET /` | 200 | 200 ✅ |
| `GET /clubes/engajamento` (rewrite SPA) | 200 | 200 ✅ |

Conserto permanente provado no ar: HTML revalida a cada navegação (304 barato via ETag), assets
imutáveis por 1 ano. A roleta de tela preta pós-deploy (index cacheado por até 1h apontando para
asset removido) está morta para deploys futuros. Único deploy que ainda pode pegar cache velho é
o de HOJE, para navegadores que cachearam o index ANTES desta release — janela máxima de 1h a
partir de 13:49, e o index deles aponta para o bundle do rollback, que É o que está no ar (zero
quebra).

## Etapa 7 · limpeza ✅

Worktree `C:/dev/leela-wt-cachefix` removido (`rm -rf` + `git worktree prune` — o `worktree
remove --force` do git falhou com "Directory not empty" no Windows, padrão conhecido). `git
worktree list` confirma: só main + worktrees de OUTRAS lanes (`leela-wt-bootreal2`,
`leela-wt-redesign-v2`), intocados. `firebase.prod.json` limpo na main (commitado em `b73eef6e`).
Arquivos temporários da prova (downloads do ar) viveram só no scratchpad da sessão.

## Estado final

- **Conserto permanente NO AR** desde 13:49:46 de 10/08/2026, bundle inalterado (`a1dd6f53c3…`).
- Commit da config: `b73eef6e` na main, pushed.
- Conferência visual do ar = do maestro (fora desta lane, por contrato).
- Landing: fora do escopo e já segura (`no-cache, no-store` medido hoje, registrado na Etapa 0).
