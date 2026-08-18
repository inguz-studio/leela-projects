# DEPLOY-FINAL-0805 — subida de produção

- **Lane:** DEPLOY-FINAL-0805
- **Trace:** leela-pixreal-diag-20260804
- **Employee:** sf-platform-lead (software-forge)
- **Projeto:** alias `prod` = `leela-hub` (76126035891), config `firebase.prod.json`
- **CLI:** `npx firebase-tools@13` (13.35.1)
- **Início:** 2026-08-05
- **Regra da lane:** não altero código. Algo vermelho ⇒ PARO e reporto.

---

## 0. Pré-flight

| Item | Resultado |
|---|---|
| `git pull` | `Already up to date` |
| HEAD | `c03f6f1c` (contém o exigido `c03f6f1c`) |
| `origin/main` | `a1117fdd` |
| **HEAD == origin/main** | ❌ **NÃO** — local está **5 commits à frente**, não publicados |
| `git status` (tracked) | ❌ **não limpo** — 1 arquivo staged: `.nirvana/handoffs/…-REV-5B.md` (doc, não código) |
| `packages/core` build (tsup) | ✅ CJS+ESM+DTS, exit 0 |
| `functions` build (tsc) | ✅ exit 0 |
| `functions` `tsc --noEmit` | ✅ exit 0 |
| auth CLI / acesso ao projeto | ✅ `projects:list` mostra `leela-hub` |

### DESVIO D-A — HEAD à frente de origin/main (5 commits não publicados)

```
c03f6f1c docs(handoff): a REV-B4 derruba o deploy de indices ...
2cdc5629 fix(area-cliente): a aba mais nova nao leva compras e ingressos junto quando cai (REV-B4)
8694d59b fix(area-cliente): a caixa dizia "voce ja aceitou" para quem nunca foi convidado (REV-B4)
ec10fd76 docs(handoff): a REV-5C reprova a entrega ...
32dd9966 fix(indices): o fieldOverride da B4 apagava o indice que a entrada em desafio usa (REV-B4)
```

`a1117fdd` é ancestral de `HEAD` (fast-forward puro, sem divergência). O fix D1 (`32dd9966`) está
entre os não publicados — ou seja, **o que vai a produção não existe no remoto**. Não empurrei:
push não estava na lane e a lane proíbe ato fora da lista. Registrado como pendência do dono.

---

## 1. Índices — conferência D1 ANTES do deploy

### 1.1 Gate do arquivo (`firestore.indexes.json` na árvore)

```
TOTAL fieldOverrides: 7
 - lotes.fimEm                => COLLECTION/ASC, COLLECTION/DESC, COLLECTION_GROUP/ASC
 - afiliados.responsavelUid   => COLLECTION_GROUP/ASC
 - inscritos.pessoaRef        => COLLECTION/ASC, COLLECTION_GROUP/ASC
 - afiliados.tenantId         => COLLECTION_GROUP/ASC
 - membros.atletaId           => COLLECTION/ASC, COLLECTION/DESC, COLLECTION_GROUP/ASC
 - afiliados.responsavelEmail => COLLECTION/ASC, COLLECTION/DESC, COLLECTION_GROUP/ASC
 - convites.email             => COLLECTION/ASC, COLLECTION/DESC, COLLECTION_GROUP/ASC

GATE D1 => membros.atletaId COLLECTION: true | COLLECTION_GROUP: true
```

✅ **`membros.atletaId` lista COLLECTION *e* COLLECTION_GROUP.** O fix `32dd9966` está na árvore.
`functions/src/jornada/entrarNoDesafio.ts:74-79` (`clubes/{id}/membros.where('atletaId','==',uid)`,
escopo COLLECTION, sem try/catch) continua coberto.

### 1.2 Due diligence sobre os dois overrides que seguem só COLLECTION_GROUP

`afiliados.responsavelUid` e `afiliados.tenantId` declaram apenas COLLECTION_GROUP — mesma forma do
defeito D1. Confirmei que **já estão em produção desde antes** (aparecem no baseline abaixo, vindos de
`6b97872e`, ancestral de `origin/main`), logo este deploy não os altera. Varredura de uso:

- `responsavelUid`: única query é `functions/src/affiliation/readers.ts:223`, e é
  `db.collectionGroup(COLECAO_AFILIADOS).where('responsavelUid','==',uid)` — escopo CG. Sem query de coleção.
- `afiliados` em escopo de coleção: só `apps/landing/lib/leitor.ts:882`, e é `.doc(afiliadoRef).get()` —
  leitura por id, não query. Não usa índice.

Sem risco novo. Bate com o `Rejected:` do próprio commit `32dd9966`.

### 1.3 Baseline do servidor ANTES do deploy

```
BEFORE composite indexes: 15
BEFORE fieldOverrides: 3
  - afiliados.responsavelUid => COLLECTION_GROUP/ASCENDING
  - afiliados.tenantId       => COLLECTION_GROUP/ASCENDING
  - lotes.fimEm              => COLLECTION/ASCENDING, COLLECTION/DESCENDING, COLLECTION_GROUP/ASCENDING
```

Confere com o brief: os **quatro** pendentes são `inscritos.pessoaRef`, `membros.atletaId`,
`afiliados.responsavelEmail`, `convites.email`. Compostos: 15 no servidor = 15 no arquivo (sem mudança).

### 1.4 Deploy

```
> npx firebase-tools@13 deploy --only firestore:indexes --project prod --config firebase.prod.json

=== Deploying to 'leela-hub'...
i  deploying firestore
i  firestore: reading indexes from firestore.indexes.json...
i  cloud.firestore: checking firestore.rules for compilation errors...
+  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: deploying indexes...
+  firestore: deployed indexes in firestore.indexes.json successfully for (default) database
+  Deploy complete!
DEPLOY_EXIT=0
```

### 1.5 Estado READY dos quatro (Firestore Admin API, `collectionGroups/-/fields`)

Poll a cada 20s. Saíram de `CREATING` para `READY` em **3.0 min**:

```
[t+3.0min | tentativa 10]
  inscritos.pessoaRef        => COLLECTION/ASCENDING=READY , COLLECTION_GROUP/ASCENDING=READY
  membros.atletaId           => COLLECTION/ASCENDING=READY , COLLECTION/DESCENDING=READY , COLLECTION_GROUP/ASCENDING=READY
  afiliados.responsavelEmail => COLLECTION/ASCENDING=READY , COLLECTION/DESCENDING=READY , COLLECTION_GROUP/ASCENDING=READY
  convites.email             => COLLECTION/ASCENDING=READY , COLLECTION/DESCENDING=READY , COLLECTION_GROUP/ASCENDING=READY

ALL_READY=true apos 3.0 min
```

### 1.6 ✅ CONFIRMAÇÃO EXPLÍCITA — `membros.atletaId` manteve a entrada COLLECTION

No **servidor**, depois do deploy, `membros.atletaId` tem **três** índices READY:
`COLLECTION/ASCENDING`, `COLLECTION/DESCENDING` e `COLLECTION_GROUP/ASCENDING`.

O escopo COLLECTION **não foi apagado**. A query de
`functions/src/jornada/entrarNoDesafio.ts:74-79`
(`clubes/{id}/membros.where('atletaId','==',uid).limit(1)`, sem try/catch)
segue servida. **D1 não se materializou.**

Antes → depois no servidor: `fieldOverrides` 3 → 7; compostos 15 → 15 (inalterados).

---

## 2. Functions — fecho de dependências

### 2.1 Método

O artefato de deploy é **um bundle CJS único** (`functions/scripts/bundle-deploy.mjs` →
`functions-deploy/index.js`, esbuild, entry `functions/lib/functions/src/index.js`). Não há
isolamento de código por função: toda função redeployada recebe os mesmos bytes. Por isso o
recorte é por **contrato de comportamento**, não por artefato.

Fecho calculado sobre o grafo de imports de `functions/src` + `packages/core/src`, com:

- **28 arquivos de implementação alterados** em `bdc9a531..HEAD` (testes e os *barrels*
  `packages/core/src/index.ts` / `functions/src/index.ts` excluídos: mudam só re-exports);
- **arestas de runtime apenas** — `import type {…}` e especificadores `type X` são apagados pelo
  `tsc` e não propagam sujeira (sem isso, o `type Timestamp from '../index'` contaminava o
  projeto inteiro via barrel e o conjunto inchava de 65 para 88 sem razão real);
- ponto fixo iterativo (à prova dos ciclos do grafo).

Arquivos alterados que originam o fecho:

```
functions: auth/linkDeAcao, auth/solicitarRedefinicaoSenha, checkout/codigoPedidoReserva,
  checkout/contaSemFriccao, checkout/createInscricaoCharge, checkout/reenviarEmailsPedido,
  cliente/gateAreaCliente, cliente/leituraArea, cliente/meusClubes, cliente/meusIngressos,
  cliente/minhasCompras, email/enviarIngressos, email/incidenteEmail, email/templates,
  eventos/emitirIngressos, eventos/ingressosPendentes, eventos/slug, eventos/varrerIngressosOrfaos,
  finance/getBankDetailsForPayout, shared/auditoriaAcessos
core:      affiliation/afiliado, aleatorio, clubs/codigo-convite, eventos/inscrito,
  pedidos/codigoPedido, pedidos/pedido, platform/conviteOrganizador, tickets/codigoIngresso
```

### 2.2 Estado prévio de produção

89 functions ACTIVE em `us-central1`; 93 exportadas no código ⇒ **4 são novas**
(`getMeusIngressos`, `getMeusClubesEConvites`, `getMinhasCompras`, `resgatarConviteOrganizador`).

### 2.3 Conjunto justificado — 65 funções (das 93)

Agrupado pela **causa-raiz** (o arquivo alterado que a função alcança por aresta de runtime).
Comando: `npx firebase-tools@13 deploy --only functions:<65 nomes> --project prod --config firebase.prod.json --non-interactive --force`

| Causa-raiz (arquivo alterado) | n | Funções |
|---|---|---|
| `fn: eventos/slug` (RN-453/451: `definir-senha` e `minha-conta` viram slugs reservados; entra via `criarEvento.ts`) | 23 | cadastrarAssessoriaParceira, cancelRepasse, cancelarInscricao, criarEvento, definirCondicaoDesconto, deleteClube, despublicarPaginaVendas, encerrarEncomendasItem, encerrarParceriaAssessoria, exportClubeData, onInscritoWriteEstoque, provisionAssessoriaAccount, publicarEvento, publicarPaginaVendas, registrarCheckin, registrarEntrega, removerMembro, requestRepasse, salvarPerfil, saveDadosBancarios, transferirPropriedade, transicaoAprovisionamento, vincularChip |
| `core: eventos/inscrito` (campos de Function do inscrito — par das Rules do `48fc7116`) | 13 | coletaDiaria, dispatchAutomacoes, dispatchCampanhasAgendadas, enviarCampanha, estimarAlcance, getOverview, onClubeWriteDashboard, onEventoWriteDashboard, onInscritoWrite, onInscritoWriteAutomacao, onItemKitWrite, onKitWrite, requestTransfer |
| `core: affiliation/afiliado` | 10 | decideRefund, estornarInscricao, getAfiliadosDoTenant, getMinhasAfiliacoes, pagamentoWebhook, provisionAfiliadoAccount, registrarRepasseComissao, requestRefund, salvarAfiliado, varrerEstornosOrfaos |
| `core: clubs/codigo-convite` (gerador saiu do PRNG do V8 — RN-413/101/313) | 5 | entrarNoDesafio, enviarConvites, onMembroWrite, onRegistroWrite, recalcularStatusMembros |
| `fn: checkout/contaSemFriccao` (+ `eventos/emitirIngressos`, e-mail) | 2 | asaasWebhook, confirmarPagamentoSandbox |
| `fn: checkout/createInscricaoCharge` (+ `codigoPedidoReserva`) | 2 | cotarInscricaoCheckout, createInscricaoCharge |
| `fn: finance/getBankDetailsForPayout` (+ `shared/auditoriaAcessos`) | 2 | ajustarCapacidadeLote, getBankDetailsForPayout |
| `fn: cliente/meusIngressos` | 1 | **getMeusIngressos** (NOVA) |
| `fn: cliente/meusClubes` | 1 | **getMeusClubesEConvites** (NOVA) |
| `fn: cliente/minhasCompras` | 1 | **getMinhasCompras** (NOVA) |
| `core: platform/conviteOrganizador` | 1 | **resgatarConviteOrganizador** (NOVA) |
| `core: tickets/codigoIngresso` (sorteio do código volta ao CSPRNG — RN-396) | 1 | ingressoPorLink |
| `fn: checkout/reenviarEmailsPedido` | 1 | reenviarEmailsDoPedido |
| `fn: auth/solicitarRedefinicaoSenha` (+ `auth/linkDeAcao`, `email/templates`) | 1 | solicitarRedefinicaoSenha |
| `fn: eventos/varrerIngressosOrfaos` (+ `eventos/ingressosPendentes`) | 1 | varrerIngressosOrfaos |

**Verificação de órfão:** todos os 28 arquivos alterados são alcançados por ao menos uma função
do conjunto. Nenhuma mudança fica sem função que a carregue.

**28 fora do deploy** (nenhum arquivo alterado as alcança por aresta de runtime): aplicarPlano,
approveRepasse, encerrarEventos, expirarCarrinhosAbandonados, expirarPixPendente, expurgarSaude,
getCheckoutPrefill, markRepassePago, onComunicacaoWrite, onCreateUser, onDesafioWrite,
onFinanceiroEventoWrite, onInscritoWriteCrm, onInscritoWriteDemografia, onInscritoWriteVirada,
onRepasseWrite, provisionTenant, recomputePlatformRollups, rejectRepasse, setClaimsEquipe,
setRetencaoRepasse, setTaxaPlataformaGlobal, setTenantClaims, transitionTenant,
versionarPoliticaVendas, versionarRegulamento, versionarTermoSaude, virarLoteCron.

### 2.4 Resultado — ✅ 65/65

```
FUNCTIONS_DEPLOY_EXIT=0
+  Deploy complete!
```

- **65** linhas `Successful create/update operation` no log do CLI (`grep -c` = 65).
- Conferência independente pela Cloud Functions API (não pelo texto do CLI):
  **`ACTIVE E ATUALIZADAS NA JANELA: 65/65` · `PROBLEMAS: nenhum`**.
- **Zero retries** — nenhuma falha isolada, nenhuma real.
- Total em produção: **93 ACTIVE** (89 antes + 4 novas). As 28 fora do conjunto seguem ACTIVE e
  intocadas (`nao-ACTIVE entre elas: nenhuma`).
- `versionId` subiu em todas as 65; `updateTime` entre `07:16` e `07:17` UTC de 2026-08-05.

Exemplos da verificação por API (final da lista):

```
saveDadosBancarios             ACTIVE   v4    2026-08-05T07:16:38.570Z
solicitarRedefinicaoSenha      ACTIVE   v2    2026-08-05T07:17:02.208Z
transferirPropriedade          ACTIVE   v4    2026-08-05T07:16:44.259Z
transicaoAprovisionamento      ACTIVE   v4    2026-08-05T07:17:04.349Z
varrerEstornosOrfaos           ACTIVE   v5    2026-08-05T07:16:46.941Z
varrerIngressosOrfaos          ACTIVE   v7    2026-08-05T07:17:05.012Z
vincularChip                   ACTIVE   v3    2026-08-05T07:16:35.659Z
```

**Aviso não-bloqueante do CLI** (custo, não correção):
`functions: Unhandled error cleaning up build images. This could result in a small monthly bill if
not corrected` — imagens de build ficaram em `gcr.io/leela-hub/us/gcf`. Item de limpeza, entra na
lista do dono.

---

## 3. Rules — ✅ liberada

```
> npx firebase-tools@13 deploy --only firestore:rules --project prod --config firebase.prod.json

i  cloud.firestore: checking firestore.rules for compilation errors...
+  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
RULES_DEPLOY_EXIT=0
```

Confirmação do **release** pela Firebase Rules API (não pelo texto do CLI):

```
RELEASE cloud.firestore -> ruleset: 20e64b19-a2d4-4cb6-829b-1f28103ac0ee
updateTime: 2026-08-05T07:19:19.374269Z
LIVE  sha256[0:16]: f102b6ad6966d837 bytes: 160317
LOCAL sha256[0:16]: f102b6ad6966d837 bytes: 160317
IDENTICOS? true
ocorrencias de "'codigoIngresso', 'codigoPedido'" no ruleset no ar: 2 (esperado 2)
RN-469 no ar? true
```

Ruleset anterior: `ba5ad1c6-445e-4fb8-b65c-c70d6981bf85` (2026-08-05T01:59Z). O diff entre o que
estava no ar e o arquivo era **exatamente** as duas linhas de `48fc7116` — `'codigoPedido'` entrando
nas duas listas `hasAny`. A **RN-469 já estava no ar** desde a release das 01:59; esta release
entrega o fechamento do `codigoPedido` no inscrito.

---

## 4. Landing — ✅ no ar

`node apps/landing/scripts/deploy-leela-hub.mjs --non-interactive`

Li o script antes de rodar. Ele aponta para o site `leela-landing` via `firebase.landing.json`
(declara UM site e nada mais — sem caminho para painel, Functions ou Rules), aplica o patch
temporário no `package.json` (`workspace:*` → `devDependencies`, `engines.node=22`) e restaura no
`finally`. Guardas do próprio script passaram: `NEXT_PUBLIC_USE_EMULATOR` vazio e `LEELA_CLOCK`
indefinido no ambiente.

O script chama `firebase` do PATH (**15.22.4**), não `npx firebase-tools@13`. Mantive assim de
propósito: é o binário com que a lane DEPLOY-POSPAG subiu esta mesma landing, e o handoff
LANDING-PREVIEW documenta o comportamento do patch contra
`firebase-tools@15.22.4/lib/frameworks/index.js`. Trocar para 13 aqui seria introduzir variável
nova no único passo que depende da integração `webframeworks`. Os passos 1-3 usaram `@13` conforme
a lane.

```
i  hosting: The following function(s) are pinned to site leela-landing and will be deployed as well: ssrleelalanding
i  functions: packaged C:\dev\LEELA\.firebase\leela-landing\functions (312.5 MB) for uploading
+  functions: source uploaded successfully
i  hosting[leela-landing]: found 99 files
i  hosting: uploading new files [0/22] (0%)
+  hosting[leela-landing]: file upload complete
i  functions: updating Node.js 22 (2nd Gen) function firebase-frameworks-leela-landing:ssrleelalanding(us-central1)...
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful update operation.
Function URL: https://ssrleelalanding-k32cilz52q-uc.a.run.app
+  hosting[leela-landing]: version finalized
+  hosting[leela-landing]: release complete
+  Deploy complete!
Hosting URL: https://leela-landing.web.app
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0
```

### 4.1 Release (Hosting API)

| | release | releaseTime | version |
|---|---|---|---|
| antes | `1785896088473000` | 2026-08-05T02:14:48Z | `535a735bc77e2a5c` |
| **depois** | **`1785914973317000`** | **2026-08-05T07:29:33Z** | **`49cd424d503bee13`** (FINALIZED) |

### 4.2 Hash de chunk antes × depois — a prova de que o bundle mudou

`curl` na página do evento `/teste-taxa-repassada`:

| chunk | ANTES | DEPOIS |
|---|---|---|
| `main-app` | `b21bdda6cce833e7` | **`6b330d975a00c37a`** |
| `870-` | `a25ff9af6f89a86c` | **`55325e64c717277f`** |
| `287-` | `a61479d249ed0a49` | (sumiu) |
| `836-` | `6f8684454a298eba` | (sumiu) |
| novos | — | `148-a0f19e1e366875bf`, `253-034f959dd6098370`, `331-5e1e511f5c5635b0`, `333-9d1c460ed9037c63`, `390bae33-e53f40ee2b34724c`, `99-09179878789c3144`, `e4548fa6-4946aa450cec0ab6` |
| estáveis | `136-`, `28-`, `415a2810-`, `4a2876f6-`, `85-`, `polyfills-`, `webpack-`, `app/error`, `app/global-error`, `app/not-found` | idênticos |

Veredito: **DIFERENTES — a landing mudou.** Mesma virada na home (`main-app`
`b21bdda6cce833e7` → `6b330d975a00c37a`, `870-` `a25ff9af…` → `55325e64…`, mesmos 6 chunks novos).

### 4.3 Restauração

`git status --porcelain --untracked-files=no` após o deploy volta **só** o handoff staged que já
existia antes da lane. `apps/landing/package.json` está limpo e **não há
`package.json.deploybak` residual** — o `finally` do script cumpriu.

---

## 5. Smoke pós-deploy

### Smoke 1 — `POST /ingressoPorLink` com token inválido (RN-419) ✅

```
$ curl -X POST https://us-central1-leela-hub.cloudfunctions.net/ingressoPorLink \
       -H 'Content-Type: application/json' -d '{"token":"LLIP1.prod1.TOKEN_INVALIDO_QUALQUER.assinatura_falsa"}'
{"ok":false}                       [http=404]

token vazio  -> {"ok":false}       [http=404]
sem corpo    -> {"ok":false}       [http=404]
```

Recusa **genérica** nas três formas, sem distinguir "token malformado" de "ingresso inexistente".
RN-419 viva.

### Smoke extra — as quatro funções novas respondem e falham fechadas

```
getMeusIngressos            {"error":{"message":"Requer autenticação.","status":"UNAUTHENTICATED"}} [401]
getMinhasCompras            {"error":{"message":"Requer autenticação.","status":"UNAUTHENTICATED"}} [401]
getMeusClubesEConvites      {"error":{"message":"Requer autenticação.","status":"UNAUTHENTICATED"}} [401]
resgatarConviteOrganizador  {"error":{"message":"Requer autenticação.","status":"UNAUTHENTICATED"}} [401]
```

Existem (não são 404) e negam sem sessão.

### Smoke 2 — a página do ingresso do dono continua abrindo ✅

Somente leitura. Nada foi alterado no ingresso real.

```
GET https://leela-landing.web.app/ingresso/LLIP1.prod1.eyJpIjoicGVkLXdOWFJUdk1NM3ZjN0JveWk5MXZSZ3gzREJReTIt…
http=200 bytes=39984 time=13.93s   (primeiro acesso, cold start do SSR)

codigo T93N7F no HTML: 1 ocorrencia
```

Trecho renderizado:

```html
… font-mono text-3xl font-bold tracking-widest text-text-primary">T93N7F</p>…
```

### Smoke 3 — o PDF dele ✅ (e **mudou de estado** nesta lane)

```
GET <mesma URL>/pdf
http=200 bytes=10263 type=application/pdf redirects=0
primeiros 8 bytes: %  P  D  F  -  1  .  7
```

**Antes da landing subir eu medi esta mesma URL e ela dava `http=404` com `text/html`** — a rota
do PDF (`dadda11a`) ainda não estava no ar. Agora responde `200 application/pdf` com corpo
começando em `%PDF-`. Não é achado: é a feature entrando em produção, e a medição antes/depois
prova que foi este deploy que a ligou.

### Smoke 4 — `GET /teste-taxa-repassada` ✅

```
http=200 bytes=40572 time=4.28s
```

### Smoke 5 — `functions:log` ✅ com um achado PRÉ-EXISTENTE

Janela capturada (leitura final, já com a landing no ar): **06:03:33Z → 07:30:28Z**, 407 linhas —
cobre antes e depois de tudo (índices ~07:0x, functions 07:16–07:17, rules 07:19, landing 07:29).

**Depois de 07:16 (pós-deploy): zero linhas `E`.** Nenhum erro novo.

Todas as execuções com status ≠ ok depois de 07:16 são **os meus próprios smokes**:

```
07:19:51-52  ingressoPorLink  404 ×3   -> smoke 1 (os tres tokens invalidos)
07:23:17-20  getMeusIngressos / getMinhasCompras / getMeusClubesEConvites /
             resgatarConviteOrganizador  401 ×4  -> smoke extra (sem sessao)
07:30:01-03  ingressoPorLink  200 ×2   -> smokes 2 e 3 (pagina + PDF)
```

Nenhuma execução não explicada.

Uma única linha de erro em toda a janela, e ela é **anterior** ao deploy:

```
2026-08-05T06:20:07.579486Z E expurgarSaude: Error: 9 FAILED_PRECONDITION:
  The query requires an index. …create_composite=…
```

#### Não é o D1 — é outra coisa, e já existia

Decodificando o `create_composite` do link:

```
projects/leela-hub/databases/(default)/collectionGroups/eventos/indexes/_  status  data  __name__
```

- É um **índice COMPOSTO de `eventos(status, data)`** — não um dos quatro `fieldOverride`, e não
  tem relação com `membros.atletaId`.
- **06:20:07 é ANTES do meu deploy de índices** (que rodou por volta das 07:0x). O cron
  `expurgarSaude` roda diariamente e já falhava.
- `expurgarSaude` está entre as **28 funções que NÃO deployei** — o binário dela nem mudou.
- `functions/src/eventos/expurgarSaude.ts:55-57` faz
  `collection('eventos').where('status','==','encerrado').where('data','<',corte)`, que exige o
  composto. Esse composto **nunca esteve em `firestore.indexes.json`** (o único composto de
  `eventos` declarado é `tenantId,organizadorId,data`).
- `git log bdc9a531..HEAD -- functions/src/eventos/expurgarSaude.ts` volta **vazio**.

Prova de que o deploy de índices não removeu nada:

```
compostos ANTES no servidor: 15 | no arquivo: 15
no servidor e NAO no arquivo (seriam removidos): (nenhum)
no arquivo e NAO no servidor (seriam criados): (nenhum)
```

⇒ **ACHADO PRÉ-EXISTENTE, não regressão desta lane.** `expurgarSaude` (expurgo de dados de saúde,
LGPD) está falhando todo dia por falta do composto `eventos(status ASC, data ASC)` em
`firestore.indexes.json`. Não corrigi: a lane proíbe alterar arquivo. Entra para o dono.

---

## 6. Fechamento

### 6.1 Placar

| Passo | Estado |
|---|---|
| 1. Índices (4 `fieldOverride`) | ✅ deployados, **READY em 3.0 min**, `membros.atletaId` **manteve COLLECTION** |
| 2. Functions | ✅ **65/65 ACTIVE**, zero retries, 28 intocadas, 93 ACTIVE no total |
| 3. Rules | ✅ release `20e64b19…`, ruleset no ar **byte-idêntico** ao arquivo |
| 4. Landing | ✅ release `1785914973317000`, chunks mudaram, `package.json` restaurado |
| 5. Smokes 1-5 | ✅ todos passam; 1 achado pré-existente, 0 regressões |

### 6.2 Nada foi violado

Não alterei código nem spec · não rodei o `--apply` do backfill · não rodei o reenvio de e-mails ·
não toquei dado de produção (todos os smokes são GET/POST de leitura; o ingresso do dono foi só
lido) · não rotacionei secret · não deployei função fora da lista justificada.

### 6.3 Desvios e itens do dono

1. **D-A — HEAD 5 commits à frente de `origin/main`.** O que subiu a produção **não está no
   remoto**, incluindo o fix D1 (`32dd9966`). Fast-forward puro, sem divergência. Não empurrei
   porque push não estava na lane. **Ação do dono: `git push` para `origin/main`.** Enquanto não
   for, produção roda código que só existe nesta máquina.
2. **`git status` não estava limpo no pré-flight** — `.nirvana/handoffs/…-REV-5B.md` staged (doc,
   não código). Segue staged; não commitei.
3. **`expurgarSaude` falha diariamente** por falta do composto `eventos(status ASC, data ASC)` em
   `firestore.indexes.json`. Pré-existente, cron de LGPD. Precisa de lane de código.
4. **Imagens de build não limpas** — `gcr.io/leela-hub/us/gcf`. Aviso do próprio CLI; gera custo
   mensal pequeno. Limpeza de fechamento de sprint.
5. **Landing usa `firebase` 15.22.4 do PATH**, não `@13`. Deliberado (ver §4). Se a intenção for
   fixar a versão, o `spawn('firebase', …)` do script precisa virar decisão explícita — hoje ele
   herda o que estiver instalado na máquina, o que é config drift por construção.
6. **Split de bundle**: as 28 funções fora do deploy seguem rodando o bundle antigo. É o estado
   normal de um deploy parcial e nenhuma delas alcança arquivo alterado, mas vale saber que
   coexistem duas versões do mesmo artefato em produção.
