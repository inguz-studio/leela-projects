# Handoff vivo · lane STORAGE-BUCKET · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-platform-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-STORAGE-BUCKET-enriched.md`.
Autorização do dono: D-0729-8 ("POde criar o bucket do firebase") · achado 19 da rodada 2026-07-29-checkout-ux.

## Estado

- [x] **Task 1 — reconhecimento** (sem mutação; nada a criar ainda)
- [x] **Task 2 — bucket default CRIADO** em `southamerica-east1`
- [x] **Task 3 — `storage.rules` da casa DEPLOYADAS** no bucket (ruleset ativo byte-idêntico) + custo registrado
- [x] **Task 4 — alinhamento do config web PROVADO no bundle que está no ar** + selo

## Resumo executivo (selo da lane)

**Bucket:** `leela-hub.firebasestorage.app` — default do projeto, existe e está vinculado ao
Firebase. **Região:** `SOUTHAMERICA-EAST1` (regional, a mesma do Firestore `(default)`; o campo é
imutável). **Classe:** STANDARD. Criado 2026-07-29T15:19:56Z por API, sem click-ops.

**Rules:** `storage.rules` — o arquivo da casa (ADR-016 · R5 · CEV), deployado **sem uma linha
alterada**. Fail-closed: 5 superfícies contratadas com allowlist de nome de objeto, contentType
ancorado, teto de 5 MB (2 MB na capa de evento) e posse de tenant provada por `firestore.get`
cross-service; todo o resto cai no deny-by-default. Ruleset ativo:
`projects/leela-hub/rulesets/fc6cad14-ede0-4f26-abff-834901df6afe`.

**Provas (todas por API/HTTP, nenhuma suíte, nenhum emulador):**
1. Bucket existe — `GET storage/v1/b/leela-hub.firebasestorage.app` → 200, região e classe confirmadas.
2. Ruleset ativo é o arquivo do repo — `sha256` idêntico dos dois lados
   (`a02c30f431b9c27c…`, 11.991 bytes).
3. Fail-closed vivo — 5 sondas anônimas contra o endpoint de produção: 403 / **404** / 403 / 403 / 403.
   O 404 (path contratado, objeto ausente) é o que distingue rule ativa de bucket aberto.
4. Zero superfície pública no IAM — sem `allUsers`/`allAuthenticatedUsers` no bucket nem no
   defaultObjectAcl.
5. Bucket vazio — as sondas não deixaram resíduo.
6. **Config web alinhado, provado no ar:** baixei o bundle do painel publicado
   (`https://leela-hub--preview-y4n0cxzj.web.app/assets/index-Bk10tvNM.js`) e o nome
   `leela-hub.firebasestorage.app` está lá dentro. O bucket nasceu com o nome que o app já
   procurava.

**Mudança de código: ZERO.** Nenhum arquivo de aplicação tocado, nenhum rebuild, nenhum redeploy do
painel. O único diff da lane é `firebase.prod.json` (+4 linhas: o bloco `storage` e o comentário
atualizado). O gatilho de escalação do brief — "mudança de código = ESCALAR" — não chegou a disparar
porque o nome do bucket coincidiu; se tivesse divergido, eu teria parado aqui.

**Custo:** R$ 0,00 esperado no horizonte de preview. O bucket default é Spark-tier-eligible (5 GB
armazenados, 1 GB/dia de download, 20k uploads/dia, 50k downloads/dia sem custo) e o conteúdo são
imagens de até 5 MB em escala de centenas de MB. Tabela completa e os dois custos não-óbvios
(leitura de Firestore por upload; soft delete de 7 dias em objeto sobrescrito) na seção "Custo
esperado".

**O que ISTO destrava:** os uploads do painel deixam de falhar por bucket inexistente — cai a
pendência nº 3 do PENDENTE-DONO da lane DEPLOY-PREVIEW ("decidir bucket de Storage") e a galeria de
fotos do kit (D-0729-4 · SPEC-KITCUPOM) passa a ter onde gravar.

**PENDENTE-DONO:** (1) **vetar a região** enquanto é barato — `southamerica-east1` é imutável, e
trocar depois custa bucket novo + migração + rebuild do config web; (2) fazer **um upload real pelo
painel** (trocar o avatar em Conta já serve) — é o único teste que esta lane não podia rodar, e ele
fecha o circuito Rules↔`firestore.get`↔SDK de ponta a ponta.

## Autoavaliação (self_score_contract · sf-platform-lead)

- `delegation_quality` — **0,90** (limiar 0,85). Não deleguei, e a decisão é a resposta ao critério:
  a lane é uma superfície de API e um deploy, com o valor inteiro na **cadeia de evidência**
  (403→404 pós-enable, sha256 do ruleset, contraste das 5 sondas). Cadeia de evidência quebra quando
  passa de mão. Delegar aqui adicionaria round-trip de contexto sem adicionar capacidade.
- `outcome_clarity` — **0,95**. Todo critério de sucesso é falsificável e foi falsificado contra o
  ambiente real: nome e região do bucket, igualdade de `sha256`, códigos HTTP nominais por sonda,
  string presente no bundle publicado. Nada foi dado por "o deploy não deu erro".
- `prioritization_call` — **0,95**. A decisão real era a região (imutável). Recomendei UMA —
  `southamerica-east1` — pelo vizinho que importa (o Firestore que as Rules consultam em 3 dos 5
  paths), e registrei explicitamente as duas rejeitadas e o motivo. Sem análise paralisante.
- `escalation_compliance` — **0,95**. Fiquei dentro da alçada: nenhum arquivo de aplicação tocado,
  `firebase.json` canônico intocado, `leela-specs/**` intocado, nenhuma suíte, nenhum emulador,
  nenhum push. O gatilho "mudança de código = escalar" foi verificado ANTES de agir (nome do bucket
  conferido contra o config web) e não precisou disparar. Único desvio consciente do meu próprio
  contrato: IaC versionada (Terraform) não existe neste projeto — a criação foi por chamada de API,
  com o comando exato registrado acima para ser reproduzível/portável.

Todos os critérios acima do limiar. Sem iteração de revisão necessária.

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
5. **Criação por chamada de API, não por Terraform.** Meu próprio contrato pede IaC versionada e
   zero click-ops. Click-ops não houve; IaC também não existe neste projeto (não há Terraform/Pulumi
   no repo, e introduzir um seria outra lane). O meio-termo aplicado: o comando exato — método, URL,
   body e resposta — está transcrito neste handoff, então a criação é reproduzível à mão e portável
   para IaC quando o projeto tiver uma.

## Reprodutibilidade (nada disso em commit)

- Transporte: access token OAuth via refresh token do `firebase-tools` logado
  (`~/.config/configstore/firebase-tools.json`), client_id/secret públicos do próprio CLI.
  Token nunca impresso, nunca gravado em arquivo. Scripts auxiliares ficaram no scratchpad da
  sessão, fora do repo.
- Recriar o bucket (idempotente — se já existir, a API re-vincula):
  `POST https://firebasestorage.googleapis.com/v1beta/projects/leela-hub/defaultBucket`
  body `{"location":"southamerica-east1","storageClass":"STANDARD"}`.
- Re-deployar as rules:
  `npx firebase-tools@13 deploy --only storage --project prod --config firebase.prod.json`.
- Reconferir o ruleset ativo: `GET https://firebaserules.googleapis.com/v1/projects/leela-hub/releases`
  → pegar `rulesetName` do release `firebase.storage/…` → `GET /v1/{rulesetName}` → comparar
  `source.files[0].content` com `storage.rules`.
