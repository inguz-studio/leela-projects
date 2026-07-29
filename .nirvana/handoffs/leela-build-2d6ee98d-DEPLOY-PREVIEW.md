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
- [x] Task 3 — segredos no Secret Manager (item 11) FEITO:
  - 4 secrets criados no `leela-hub` (versions/1): `ASAAS_API_KEY` (← valor da chave de produção que morava em ASAAS_PROD_API_KEY local), `ASAAS_WEBHOOK_AUTH_TOKEN` (mesmo token local — o cadastro do webhook usa ele), `BREVO_API_KEY`, `CRM_ID_PEPPER` (**valor NOVO forte, 96 hex** — o comentário do .env exige pepper próprio de produção; nunca gravado em arquivo).
  - Bindings v1 `runWith({secrets})` CIRÚRGICOS: `asaasWebhook` (3 secrets — cadeia real completa: auth do webhook + provider + e-mail de ingresso/conta), `pagamentoWebhook` (ASAAS_API_KEY **para fechar a porta mock** — 410 com chave presente), `confirmarPagamentoSandbox` (idem — fail-safe hasAsaasKey recusa), `onInscritoWriteCrm` (CRM_ID_PEPPER, fail-closed).
  - **Superfície de chave real = SÓ o webhook.** `createInscricaoCharge`/estornos/campanhas SEM binding → Mock/fail-closed null em produção, igual ao local. Ligar checkout real no painel = decisão do dono (cria cobrança de verdade), registrada como PENDENTE-DONO.
  - Arquivos locais reorganizados (gitignored, nada em commit): `functions/.env` = SÓ BREVO_SENDER_* (deploy sobe como env var); segredos migraram p/ `functions/.env.local` (deploy NÃO lê; Emulator lê); `functions/.secret.local` criado (Emulator resolve secrets declarados offline; ASAAS_API_KEY vazia = item 51 preservado); backup `.env.bak-deploypreview`. `.secret.local` adicionado ao .gitignore.
  - `npm run build` + `npm run lint` das functions: verdes após os bindings.
- [x] Task 4 — deploy functions FECHADA: **86/86 ACTIVE em us-central1** (verificado via GCF API). Saga: 1ª subida FALHOU inteira (OFFLINE, `EUNSUPPORTEDPROTOCOL` — Cloud Build roda npm puro e não entende `workspace:*` do pnpm) → fix `functions/scripts/bundle-deploy.mjs` (esbuild embute @leela/core; externals só de registro; commit `792f58f`) + `firebase.prod.json` aponta `source=functions-deploy` (gitignored). 2ª subida esbarrou em quota `Build Create requests per minute` (esperado com 86 gen1) — o retry do CLI pagou 81 e um deploy dirigido pagou as 5 restantes (getOverview, onInscritoWrite, onInscritoWriteAutomacao, dispatchCampanhasAgendadas, dispatchAutomacoes). Firestore rules+índices deployados no `(default)` ✓. Região das functions: **us-central1** (default v1, coerente com `getFunctions(_app,'us-central1')` do api-client). Firestore = southamerica-east1 (latência cross-região functions↔db = premissa aceitável p/ preview).
- [x] Task 5 — painel NO AR no canal de preview: **https://leela-hub--preview-y4n0cxzj.web.app** (HTTP 200; expira 2026-08-27 — canais de preview têm teto de 30d, renovável com 1 comando). Live channel (leela-hub.web.app) segue 404 = não tocado. Domínio do preview AUTORIZADO no Auth (`authorizedDomains` + localhost). Build: `vite build --mode leela-hub` (env na RAIZ — envDir do vite.config.ts do painel aponta pra raiz, pegadinha commitada em `e6e2d0d`).
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
