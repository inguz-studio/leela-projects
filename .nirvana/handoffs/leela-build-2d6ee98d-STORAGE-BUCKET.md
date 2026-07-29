# Handoff vivo · lane STORAGE-BUCKET · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-platform-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-STORAGE-BUCKET-enriched.md`.
Autorização do dono: D-0729-8 ("POde criar o bucket do firebase") · achado 19 da rodada 2026-07-29-checkout-ux.

## Estado

- [x] **Task 1 — reconhecimento** (sem mutação; nada a criar ainda)
- [x] **Task 2 — bucket default CRIADO** em `southamerica-east1`

## Task 2 — o bucket

**Nome:** `leela-hub.firebasestorage.app` · **Região:** `SOUTHAMERICA-EAST1` (region, não multi-region)
· **Classe:** `STANDARD` · **Criado:** 2026-07-29T15:19:56.991Z · `projectNumber` 76126035891.

**Caminho usado** (não houve click-ops; tudo por API):
1. `POST serviceusage.googleapis.com/v1/projects/leela-hub/services/firebasestorage.googleapis.com:enable`
   → 200 (`operations/acat.p2-76126035891-687e58d6-...`). Antes disso o GET do defaultBucket
   respondia **403 SERVICE_DISABLED**; depois passou a **404 NOT_FOUND** — a virada 403→404 é a
   prova de que a API subiu e de que o bucket de fato não existia.
2. `POST firebasestorage.googleapis.com/v1beta/projects/leela-hub/defaultBucket`
   body `{"location":"southamerica-east1","storageClass":"STANDARD"}` → **200**.

**Região — por que southamerica-east1:** é a MESMA do Firestore `(default)` da lane DEPLOY-PREVIEW.
As Rules de Storage fazem `firestore.get` cross-service em 3 dos 5 paths (posse do clube, do evento,
dos kits) — cada `create/update` dessas superfícies custa um round-trip ao Firestore. Colocar o bucket
noutra região pagaria latência em TODO upload de tenant, além de espalhar dado de cliente brasileiro
por outra jurisdição. `location` é **Immutable** na API: escolha de mão única, feita a favor da
coerência com o banco. (As functions seguem em us-central1 — assimetria herdada e já registrada na
DEPLOY-PREVIEW; ela não pesa aqui porque o upload é client→Storage direto, sem passar por function.)

**Provas (API REST; `gcloud`/`gsutil` não existem nesta máquina — a JSON API é a MESMA fonte que o
`gsutil ls -L` consulta):**
- `GET storage.googleapis.com/storage/v1/b/leela-hub.firebasestorage.app` → **200**,
  `"location":"SOUTHAMERICA-EAST1"`, `"locationType":"region"`, `"storageClass":"STANDARD"`,
  `"timeCreated":"2026-07-29T15:19:56.991Z"`, `softDeletePolicy` 7 dias (default do GCS).
- `GET firebasestorage…/defaultBucket` → **200** com
  `bucket.name = projects/leela-hub/buckets/leela-hub.firebasestorage.app`.
- `GET firebasestorage…/buckets` → lista com **exatamente 1** bucket vinculado ao Firebase.

**Superfície pública = ZERO no plano IAM** (checado, não presumido):
- `GET …/b/{bucket}/iam` → bindings só `legacyBucketOwner` (projectOwner/projectEditor) e
  `legacyBucketReader` (projectViewer). **Nenhum `allUsers`, nenhum `allAuthenticatedUsers`.**
- `GET …/b/{bucket}/defaultObjectAcl` → só project-owners/editors (OWNER) e project-viewers (READER).
  Objeto novo NÃO nasce world-readable.
- `publicAccessPrevention: "inherited"`, `uniformBucketLevelAccess: false` — defaults do bucket do
  Firebase; o acesso do SDK web não passa por IAM, passa pelas Security Rules (Task 3).

**Impacto em código: NENHUM.** O bucket nasceu com o nome que o config web já embute
(`leela-hub.firebasestorage.app`, `.env.leela-hub` na raiz + `apps/landing/.env.leela-hub`), e o
`api-client` chama `getStorage(_app)` sem bucket explícito. O painel que está no ar
(https://leela-hub--preview-y4n0cxzj.web.app) já carrega esse nome no bundle → **sem rebuild,
sem redeploy do painel, sem escalar mudança de código.**

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

Declarar `storage` no `firebase.prod.json` e deployar `storage.rules` no bucket.

## Premissas assumidas

(nenhuma ainda)
