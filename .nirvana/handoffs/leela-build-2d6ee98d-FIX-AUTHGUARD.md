# Handoff vivo · lane FIX-AUTHGUARD · trace leela-build-2d6ee98d · 2026-07-28

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-FIX-AUTHGUARD-enriched.md`.

## Estado

- [x] Task 1 — guard de sessão na branch com shell: `routes/_system/RequireSessao.tsx` (decisão pura `avaliarSessao` + componente) embrulhando `<RootShell>` no App.tsx; `state.from = pathname + search` (mesmo contrato RequirePapel→EntrarPage).
- [x] Task 2 — preservação do preview local: `isModoEmulador()` extraído de `lib/firebase.ts` (fonte única, mesma regra do initLeela); modo Emulator → guard INERTE (nem assina a sessão). `pnpm dev`, preview.sh e vitest intactos por construção.
- [x] Task 3 — logout/expiração em rota profunda: o listener `onSessionChange` re-renderiza o guard; sessão → null cai no mesmo redirect com `from` da rota atual (coberto por teste).
- [x] Task 4 — testes: `__tests__/RequireSessao.test.tsx`, 9/9 verdes (decisão pura + 7 integrações: inerte no emulador, loading nunca decide, redirect raiz, redirect profundo c/ query, logado passa, morte de sessão, unsubscribe no unmount). Type-check e lint do painel: verdes.
- [x] Task 5 — build `--mode leela-hub` + REDEPLOY no MESMO canal `preview` FEITOS e verificados (detalhe em §Suíte e §Verificação pós-deploy).

## Reconhecimento (fatos, sem código ainda)

- `App.tsx`: branch `/*` (RootShell) assume logado; rotas S020 aditivas; `/entrar` ranqueia acima do splat no React Router 6.
- Contrato `state.from`: `RequirePapel` grava `location.pathname + location.search`; `EntrarPage` sanitiza via `caminhoInternoSeguro` e navega com replace. Guard novo usa o MESMO contrato.
- Distinção de ambiente (fonte: `apps/painel/src/lib/firebase.ts`): `VITE_USE_EMULATOR === 'true'` → Emulator; ausente → `import.meta.env.DEV`; `'false'` → produção fail-closed. Preview local (`preview.sh`) roda `vite` dev com `VITE_USE_EMULATOR=true` + `VITE_PREVIEW_AUTOLOGIN=true` → guard deve ficar INERTE em modo emulador (dev dos agentes e preview do dono intactos; vitest cai em DEV=true → testes existentes intactos).
- Sessão: `useTenantSession` resolve claims (força refresh sem `tenantId`) — custo desnecessário p/ presença; guard usa `onSessionChange` (@leela/api-client) direto, presença pura, mesmo padrão dos contratos distintos listados no cabeçalho de `tenantSession.ts`.
- Deploy (receita da lane DEPLOY-PREVIEW, handoff §Credenciais): `cd apps/painel && npx vite build --mode leela-hub` (env na RAIZ — envDir) → `npx firebase-tools@13 hosting:channel:deploy preview --project prod --config firebase.prod.json --expires 30d`. Mesmo canal = mesma URL `https://leela-hub--preview-y4n0cxzj.web.app`.
- S020 no backlog: story não está mais em `06-backlog/backlog/` (só S030/S1213 referenciam) — nada a marcar lá; verificar painel de aceite se existir.

## Provas colhidas (pré-deploy)

- Commit do código: `56fd53a` (guard + wiring + helper + 9 testes).
- Canal ANTES do redeploy: bundle no ar = `assets/index-CO1JlTMt.js` (sem guard); raiz/entrar/rota profunda = HTTP 200 (rewrite SPA — redirect é client-side, curl não o vê por design).
- Login produção (mesmo caminho do painel, REST `signInWithPassword` com a API key pública): `admin@demo-leela.dev` → **idToken emitido**, uid `FTqslV98itZUNGwL5ss6201d23Z2`, claim `role: platform_admin` visível no JWT. Senha demo já pública no repo; token não persistido.
- Bundle novo local: `dist/assets/index-Bk10tvNM.js` contém o marcador do guard ("Verificando sessão") + config leela-hub.

## Suíte do painel (veredito)

- Rodada completa (solo, 601s): **187 arquivos / 1711 testes — TODOS verdes, zero falha** + 1 "error" = worker Tinypool morto por OOM ("Zone Allocation failed"; máquina de 8GB, mesmo padrão de contenção documentado na lane DEPLOY-PREVIEW — não é regressão; nenhum teste falhou).
- O worker OOM derrubou a contagem de 1 arquivo: diff (arquivos ✓ no log × disco) apontou `src/routes/eventos/repasses/_lib/__tests__/repassesPorEvento.test.ts` — re-rodado SOLO: **19/19 verdes em 4s**. Total: **188/188 arquivos, 1730 testes verdes**.
- `RequireSessao.test.tsx` verde nas duas rodadas (9/9). Type-check e lint (`--max-warnings 0`): verdes.
- 1ª tentativa de rodada morreu por rodar em paralelo com o build de 4m15s (lição repetida: nesta máquina, suíte roda SOZINHA).

## Verificação pós-deploy (curl, link público)

- Deploy: `npx firebase-tools@13 hosting:channel:deploy preview --project prod --config firebase.prod.json --expires 30d` → mesma URL `https://leela-hub--preview-y4n0cxzj.web.app`, expira 2026-08-27.
- ANTES: canal servia `assets/index-CO1JlTMt.js` (sem guard). DEPOIS: serve `assets/index-Bk10tvNM.js` e o JS público CONTÉM o marcador do guard ("Verificando sessão") — código do redirect no ar, provado por curl no asset.
- Live `leela-hub.web.app`: **404, intocado** (o canal não vaza pro live).
- Raiz/`/entrar`/rota profunda: HTTP 200 (rewrite SPA — o redirect deslogado é client-side; curl não executa JS, o comportamento está provado pelos 9 testes do guard + roteiro manual abaixo).
- Login produção provado por REST (`accounts:signInWithPassword`, a MESMA API que o SDK do painel usa): `admin@demo-leela.dev` → idToken emitido, claim `role: platform_admin`.

## Roteiro manual (dono, ~1 min)

1. Janela anônima → abrir https://leela-hub--preview-y4n0cxzj.web.app/ → deve cair em `/entrar` (tela "Entrar", dark).
2. Abrir direto https://leela-hub--preview-y4n0cxzj.web.app/crm/clientes → também cai em `/entrar`.
3. Logar `admin@demo-leela.dev` / `demo1234` → deve voltar para `/crm/clientes` (destino preservado). Repetir o passo 1 e logar → cai na Visão Geral.
4. Preview local: `bash preview.sh` segue caindo na raiz "já logado", sem tela de login (guard inerte em modo Emulator).

## Smoke do preview local (documentado)

Não subi o `preview.sh` completo (Emulator + seed) — a suíte da DEPLOY-PREVIEW podia estar em voo e esta máquina já matou 2 rodadas por contenção. A prova de intacto é estrutural e testada: (a) o guard só ativa quando `isModoEmulador()` é false, e essa função é a MESMA expressão que sempre decidiu o `initLeela` (extraída, não duplicada); (b) `preview.sh` injeta `VITE_USE_EMULATOR=true` (linha 153) → guard inerte por construção; (c) teste "modo Emulator: renderiza direto, sem assinar sessão" verde; (d) `pnpm dev` e vitest caem em `DEV=true` → mesmo caminho inerte, e os 188 arquivos da suíte (que renderizam as rotas sem sessão) passaram sem tocar no guard — a prova viva de que nada mudou fora de produção.

## Reaproveitado vs criado

- **Reaproveitado:** contrato `state.from` (RequirePapel→EntrarPage, sanitização `caminhoInternoSeguro` intocada); `onSessionChange` do @leela/api-client; regra de ambiente do `initFirebase` (extraída para `isModoEmulador()`, fonte única); padrão decisão-pura + skeleton `role=status` do RequirePapel; padrão de mocks `vi.hoisted` dos testes existentes; receita de build/deploy da lane DEPLOY-PREVIEW (canal, config, envDir).
- **Criado:** `RequireSessao.tsx` (guard, 1 componente + 1 função pura), teste (9 casos), export `isModoEmulador()`.
- **Não tocado:** `functions/**`, `packages/**`, emulador (testes do painel rodam sem ele).

## Premissas (acumulando)

1. Guard inerte em modo emulador = decisão do brief ("em modo mockado local o comportamento atual permanece"); vale também para `pnpm dev` dos agentes e para o vitest.
2. Redirect deslogado no link público provado por: guard no bundle público (curl no asset) + 9 testes de comportamento + login REST real. Prova de navegador fica com o dono (roteiro acima) — regra da casa: navegador só com validação prévia.
3. Worker OOM na suíte = contenção da máquina (8GB), não regressão: zero teste falhou e o arquivo não contabilizado passou solo. Se reincidir em máquina ociosa, investigar consumo de memória da suíte (fora desta lane).
4. S020 não tem card vivo em `leela-specs/06-backlog` (story ausente da pasta; só S030/S1213 a referenciam) — nada a marcar lá; board/painel de decisões são do maestro.

## Resumo executivo (selo da lane)

**Defeito fechado:** abrir o preview de produção deslogado agora leva a `/entrar` (raiz E rota profunda), com retorno ao destino após login; logout/expiração em rota profunda cai no mesmo fluxo. Preview local mockado, `pnpm dev` e testes seguem intactos (guard inerte em modo Emulator, mesma fonte de verdade do initFirebase).

**Commits (SEM push):** `56fd53a` (guard + wiring + helper + 9 testes) + o commit deste selo (handoff). Arquivos de código: `apps/painel/src/routes/_system/RequireSessao.tsx` (novo), `apps/painel/src/App.tsx`, `apps/painel/src/lib/firebase.ts`, `apps/painel/src/routes/_system/__tests__/RequireSessao.test.tsx` (novo).

**No ar:** https://leela-hub--preview-y4n0cxzj.web.app (mesmo canal `preview`, expira 2026-08-27) servindo `index-Bk10tvNM.js` com o guard; live segue 404.

**Qualidade:** 188/188 arquivos de teste do painel verdes (1730 testes), type-check e lint zero-warning verdes.

**PENDENTE-DONO:** roteiro manual de 1 min acima (redirect + login + volta ao destino no navegador).
