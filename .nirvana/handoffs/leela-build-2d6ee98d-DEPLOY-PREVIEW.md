# Handoff vivo · lane DEPLOY-PREVIEW · trace leela-build-2d6ee98d · 2026-07-28

Executor: sf-cto (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-DEPLOY-PREVIEW-enriched.md`. Autorizada por DEC-0728F.

## Estado

- [x] **Gate Blaze** — `leela-hub` com `billingEnabled: true` (Cloud Billing API via token do CLI local; nenhum token impresso/persistido). CLI logado: conta do dono. gcloud NÃO instalado na máquina.
- [x] Task 1 — `.firebaserc` alias `prod: leela-hub` (default `demo-leela` intocado) — commit `98cc775`
- [x] Task 2 — provisionamento mínimo FEITO:
  - Firestore `(default)` CRIADO em **southamerica-east1** (não existia; API estava desligada — liguei via serviceusage e criei via `firestore:databases:create`). Rules nascem fechadas até o deploy.
  - Auth INICIALIZADO via `identityPlatform:initializeAuth` (mesmo caminho do Terraform; console mostraria "Get started" — subtype IDENTITY_PLATFORM, sem custo no free tier de e-mail/senha) + provider **e-mail/senha HABILITADO** (o que `EntrarPage` usa). Google/Apple popup existem no api-client mas NÃO foram habilitados (exigem consent/config — PENDENTE-DONO se quiser).
  - Hosting: site default `leela-hub` já existia (https://leela-hub.web.app).
  - Web app `painel` REGISTRADO: appId `1:76126035891:web:d858cdf41199c7103575c6`; config web (pública) commitada em `apps/painel/.env.leela-hub` (exceção cirúrgica no .gitignore).
  - `firebase.prod.json` criado (deploy-only; sem bloco emulators; storage FORA — bucket default não existe; uploads do painel = pendência).
- [ ] Task 3 — segredos no Secret Manager (item 11)
- [ ] Task 4 — deploy functions
- [ ] Task 5 — painel no canal de preview do Hosting
- [ ] Task 6 — seed de produção re-datado (com codigoIngresso)
- [ ] Task 7 — webhook Asaas → produção
- [ ] Suíte canônica verde (build → emulators:exec vitest)

## Fatos levantados (reconhecimento)

- Functions: 73 exports em `functions/src/index.ts`, SEM região explícita no código → default **us-central1**; o api-client já fixa `getFunctions(_app, 'us-central1')` (`packages/api-client/src/firebase.ts:170`). Região das functions = us-central1, coerente com o código.
- Painel: Vite; produção exige `VITE_USE_EMULATOR=false` + `VITE_FIREBASE_*` completos (fail-closed, `apps/painel/src/lib/firebase.ts`). Config web do Firebase NÃO é segredo — pode ser commitada.
- `firebase.json` NÃO tem bloco `hosting` — adicionar lá poderia acordar o emulador de hosting na suíte; a lane usará config separada de deploy (padrão já existente no repo: `firebase.preview.json`, `firebase.r6.json`).
- Webhook: `asaasWebhook` (`functions/src/checkout/webhookAsaas.ts`, https.onRequest) + `pagamentoWebhook` (legado?).
- Segredos locais: `functions/.env` (gitignored). `ASAAS_API_KEY` fica VAZIA (item 51) — provider de checkout em produção continua Mock.

## Próxima ação

Commit da Task 1 e reconhecimento fino (env vars usadas pelas functions, provider de Auth do painel, seed scripts).

## Premissas (acumulando)

1. Blaze confirmado por API de billing, não por deploy — chamada barata conforme brief.
