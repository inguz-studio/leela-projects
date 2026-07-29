# Handoff vivo · lane STORAGE-BUCKET · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-platform-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-STORAGE-BUCKET-enriched.md`.
Autorização do dono: D-0729-8 ("POde criar o bucket do firebase") · achado 19 da rodada 2026-07-29-checkout-ux.

## Estado

- [x] **Task 1 — reconhecimento** (sem mutação; nada a criar ainda)

## Reconhecimento (fatos, com fonte)

1. **As Rules JÁ EXISTEM na casa** — `storage.rules` na raiz (12.458 bytes, ADR-016 · R5 · CEV):
   deny-by-default explícito no catch-all, 5 superfícies contratadas
   (`users/{uid}/{objeto}`, `clubes/{clubeId}/{objeto}`, `marcas/{uid}/{marcaId}`,
   `eventos/{eventoId}/kits/{kitId}`, `eventos/{eventoId}/capa`), allowlist de nome de objeto,
   contentType ancorado `^image/(jpeg|png|webp|gif|avif)$`, teto 5MB (2MB na capa de evento),
   cross-service `firestore.get` para provar posse do tenant.
   **Consequência para esta lane: NÃO escrevo rule nenhuma.** A premissa vetável "mínimo seguro"
   do brief não se aplica — deployo a rule da casa, sem editar uma linha.
2. **`firebase.json` canônico já declara** `"storage": { "rules": "storage.rules" }` (é o que a suíte
   usa no emulador). Quem NÃO declara é o `firebase.prod.json` — o comentário dele diz literalmente
   "Storage fica FORA até existir bucket default no projeto". É esse o buraco a fechar.
3. **O config web já aponta o bucket certo** — `VITE_FIREBASE_STORAGE_BUCKET=leela-hub.firebasestorage.app`
   em `.env.leela-hub` (raiz, commitado; build `--mode leela-hub` da lane DEPLOY-PREVIEW).
   A landing tem o mesmo valor em `apps/landing/.env.leela-hub`.
   O `api-client` faz `getStorage(_app)` **sem bucket explícito** (`packages/api-client/src/firebase.ts:171`),
   ou seja: o SDK usa o `storageBucket` do app, que veio do env embutido no bundle já publicado.
   → **Se o bucket default nascer com o nome `leela-hub.firebasestorage.app`, zero mudança de código
   e zero rebuild do painel.** É o caminho que persigo; nome diferente = ESCALAR (não improviso).
4. **Como criar** — `firebase-tools` só LÊ o default bucket (`lib/gcp/storage.js:getDefaultBucket`,
   v1alpha GET); não cria. Criação = `firebasestorage.projects.defaultBucket.create`
   (POST `v1beta/projects/{p}/defaultBucket`, body `DefaultBucket{location, storageClass}`),
   confirmado no discovery doc oficial da API. `location` é **Required. Immutable.**
5. **Estado inicial provado:** GET do defaultBucket devolveu **403 SERVICE_DISABLED** —
   "Cloud Storage for Firebase API has not been used in project leela-hub before or it is disabled".
   Confirma a premissa da DEPLOY-PREVIEW: não existe bucket, nem a API está ligada.
6. **Transporte:** access token OAuth derivado do refresh token do `firebase-tools` logado
   (conta do dono), mesmo caminho da lane DEPLOY-PREVIEW. Token nunca impresso, nunca persistido.
   `gcloud`/`gsutil` NÃO estão instalados nesta máquina — as provas saem por API REST
   (storage.googleapis.com e firebasestorage.googleapis.com), que é a MESMA fonte que o gsutil consulta.

## Próxima ação

Habilitar `firebasestorage.googleapis.com` e criar o default bucket em `southamerica-east1`.

## Premissas assumidas

(nenhuma ainda)
