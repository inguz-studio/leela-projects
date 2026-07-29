# Handoff vivo · lane STORAGE-BUCKET · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-platform-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-STORAGE-BUCKET-enriched.md`.
Autorização do dono: D-0729-8 ("POde criar o bucket do firebase") · achado 19 da rodada 2026-07-29-checkout-ux.

## Estado

- [x] **Task 1 — reconhecimento** (sem mutação; nada a criar ainda)
- [x] **Task 2 — bucket default CRIADO** em `southamerica-east1`
- [x] **Task 3 — `storage.rules` da casa DEPLOYADAS** no bucket (ruleset ativo byte-idêntico) + custo registrado

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

## Task 3 — as Rules

**Mudança de config (1 arquivo, 4 linhas):** `firebase.prod.json` ganhou
`"storage": { "rules": "storage.rules" }` — **o MESMO arquivo que o `firebase.json` canônico já
aponta**, sem uma linha editada. O `_comment` da config foi atualizado (dizia "Storage fica FORA
até existir bucket default"; agora registra a lane e a data). `firebase.json` NÃO foi tocado — a
suíte e os emuladores seguem intactos.

**Deploy:** `npx firebase-tools@13 deploy --only storage --project prod --config firebase.prod.json`
→ `rules file storage.rules compiled successfully` → `released rules storage.rules to firebase.storage`
→ `Deploy complete!`. Nenhum predeploy de functions disparou (`--only storage`).

**Prova 1 — ruleset ativo é byte-idêntico ao arquivo do repo:**
- release `projects/leela-hub/releases/firebase.storage/leela-hub.firebasestorage.app`
- ruleset `projects/leela-hub/rulesets/fc6cad14-ede0-4f26-abff-834901df6afe`, criado
  `2026-07-29T15:22:05.652179Z`
- `sha256` do source remoto == `sha256` do `storage.rules` local (LF-normalizado):
  `a02c30f431b9c27c6429f44306a71183d6d331dad4ea0fa15c679d1ef9ff9537`, 11.991 bytes dos dois lados.
  Não é "deploy que não deu erro": é o texto exato que está valendo.

**Prova 2 — sondas ANÔNIMAS contra o endpoint real (`firebasestorage.googleapis.com/v0/b/…/o`),
sem token, do jeito que um atacante bateria.** O que interessa aqui não é o 403 isolado: é o
**contraste** entre os cinco resultados, que só existe se a rule estiver viva e discriminando path
por path.

| # | Sonda | Esperado | Resultado |
|---|-------|----------|-----------|
| P1 | READ `segredo.txt` (fora do contrato) | negar | **403** Permission denied |
| P2 | READ `users/probe/foto-perfil` (contrato, objeto inexistente) | **permitir** e dar 404 | **404** Not Found |
| P3 | READ `users/probe/senha` (dentro de `users/`, nome fora da allowlist) | negar | **403** |
| P4 | WRITE `users/probe/foto-perfil` anônimo (path contratado) | negar (exige sessão) | **403** |
| P5 | WRITE `payload.html` `text/html` na raiz | negar (catch-all) | **403** |

P2 é a sonda que fecha o argumento: um bucket "aberto por acidente" ou uma rule inerte NÃO
produziria 404 num path e 403 no path ao lado. E P3 prova a granularidade fina — a allowlist de
NOME de objeto está sendo avaliada, não só o prefixo `users/`.

**Prova 3 — nenhum resíduo:** `GET storage/v1/b/{bucket}/o` → `{"kind":"storage#objects"}`, lista
vazia. As 5 sondas não criaram nada (as de escrita foram negadas), o bucket segue zerado.

## Custo esperado

Projeto está em **Blaze** (confirmado por API na lane DEPLOY-PREVIEW). Bucket default
`*.firebasestorage.app` é o bucket **Spark-tier-eligible** — a franquia sem custo do Firebase
Storage vale para ele:

| Recurso | Franquia sem custo (bucket default) | Acima disso |
|---------|-------------------------------------|-------------|
| Armazenamento | 5 GB | ~US$ 0,026/GB/mês (Standard, região SA) |
| Download | 1 GB/dia | ~US$ 0,12/GB |
| Operações de upload | 20.000/dia | ~US$ 0,05/10 mil |
| Operações de download | 50.000/dia | ~US$ 0,004/10 mil |

**Projeção honesta para o uso real:** o que vive aqui são imagens de até 5 MB (2 MB na capa de
evento) — avatar/capa de perfil, capa de clube, logo de marca, imagem de kit, capa de evento.
Mesmo com 6 tenants × dezenas de eventos, o volume fica na casa de **centenas de MB**, uma ordem de
grandeza abaixo dos 5 GB. **Custo esperado do bucket enquanto o produto está em preview: R$ 0,00.**
O gasto só aparece se as imagens virarem tráfego de massa (1 GB/dia de download ≈ 200 mil
visualizações de um avatar de 5 KB) — cenário de sucesso, não de operação.

**Custo NÃO-óbvio, registrado como risco de conta (não de bucket):** 3 dos 5 paths validam posse
por `firestore.get` cross-service. Cada upload de tenant dispara **uma leitura de documento no
Firestore** faturada. Em volume de preview isso é ruído; fica anotado para quando o número de
uploads crescer.

**Soft delete:** o GCS liga `softDeletePolicy` de 7 dias por padrão. Objeto sobrescrito fica
retido 7 dias e **é cobrado como armazenamento** nesse período. Com o padrão de re-upload que as
Rules impõem (mesmo nome de objeto SOBRESCREVE), quem trocar a capa 10× numa semana paga 10 cópias
por 7 dias. Irrelevante na escala atual; desligável a qualquer momento se algum dia pesar.

## Premissas assumidas

1. **Região `southamerica-east1` escolhida por coerência com o Firestore**, não por medição de
   latência real. O campo é **imutável** — mudar depois exige bucket novo + migração de objetos +
   troca do config web. Vetável AGORA, caro depois.
2. **`storageClass: STANDARD`.** Imagem de avatar/capa é lida a toda hora; Nearline/Coldline sairiam
   mais caros no acesso do que economizariam no armazenamento.
3. **Rules deployadas são as da casa, sem uma linha alterada.** A premissa vetável prevista no brief
   ("escrever o mínimo seguro") não foi acionada porque `storage.rules` já existia, revisado
   (ADR-016 + review antagonista R5 + CEV). Se o dono quiser rules diferentes, é lane de produto,
   não de infra.
4. **Não validei upload autenticado ponta a ponta pelo painel.** Isso exigiria sessão real de tenant
   writer e um evento/clube no Firestore de produção — e o brief proíbe suíte/emulador. As sondas
   anônimas provam o lado FECHADO (o que importa para segurança); o lado ABERTO está provado por
   P2 (a rule de leitura contratada responde 404, não 403). O teste de upload real cabe no dono,
   junto do teste de compra já pendente.
