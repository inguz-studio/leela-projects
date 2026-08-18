# DEPLOY-TUDO-0805 — handoff vivo

- **Lane:** DEPLOY-TUDO-0805 · **Trace:** leela-pixreal-diag-20260804
- **Employee:** sf-platform-lead (software-forge)
- **Projeto:** alias `prod` = `leela-hub` (config `firebase.prod.json`; landing por `firebase.landing.json`)
- **Início:** 2026-08-05
- **Regra da lane:** não altero código. Algo vermelho não-transitório ⇒ PARO e reporto.

> Atualizado a cada passo. É o seguro contra queda.

---

## Passo 0 — Pré-flight ✅

| Item | Resultado |
|---|---|
| `git fetch` / posição | `main` **ahead 5** de `origin/main`, **behind 0** → nada a puxar |
| HEAD | `846ce8ee` |
| `git status` (tracked) | 1 arquivo staged: `.nirvana/handoffs/…-REV-5B.md` (doc). Nenhum código sujo. |
| `pnpm-workspace.yaml` | **limpo** (allowBuilds já com `true`; `@sentry/cli` fora de propósito) |
| build `packages/core` (tsup) | ✅ exit 0 — CJS 299.68 KB · ESM 279.69 KB · DTS 353.37 KB |
| build `packages/design-system` (tsup) | ✅ exit 0 — 5 entradas (index/rn/server/dialog/tailwind-preset), CJS+ESM+DTS |
| `git status` pós-build | inalterado (dist é gitignorado) |
| CLI | `npx firebase-tools@13` (13.35.1) para rules/indexes/functions; `firebase` do PATH (15.22.4) só para a landing (webframeworks), como na DEPLOY-FINAL |

**PRÉ-FLIGHT ✅**

### Desvio D-1 (âncora do brief incorreta) — corrigido contra o servidor
O brief ancora functions em `162a1276`. O servidor diz outra coisa: os clusters de `updateTime`
são **2026-07-28T23:55–2026-07-29T01:09 (28 funções)** e **2026-08-05T07:16–07:17 (65 funções)**.
O deploy de 65 é a lane DEPLOY-FINAL, que rodou com HEAD **`c03f6f1c`** (2026-08-05 03:59 -0300),
não `162a1276` (2026-08-04 22:53 -0300). Baselines reais adotados:
- 65 funções → bundle de **`c03f6f1c`**
- 28 funções → bundle de **`bdc9a531`** (deploy de 28/07)

### Estado real do servidor no início da lane

| Superfície | Servidor |
|---|---|
| firestore rules | ruleset `20e64b19-a2d4-4cb6-829b-1f28103ac0ee` (2026-08-05T07:19:19Z) — bate com o brief |
| storage rules | ruleset `fc6cad14-ede0-4f26-abff-834901df6afe` (2026-07-29T15:22:05Z) — bate com o brief |
| hosting `leela-hub` | release `1785819312151000` · **2026-08-04T04:55:12Z** · version `e9bbcf36fed5c76f` — bate com o brief |
| hosting `leela-landing` | release `1785927349209000` · 2026-08-05T10:55:49Z · version `2056226926927113` |
| functions | **94** (93 do app + `ssrleelalanding`), **todas ACTIVE**, nenhuma em falha |

---

## Passo 2 — `firestore:indexes` — ✅ SEM DEPLOY (arquivo == servidor)

Comparação `firestore.indexes.json` × Firestore Admin API (`collectionGroups/-/indexes` e `/fields`):

```
COMPOSITE       arquivo: 18 | servidor: 18
  so no arquivo (seriam CRIADOS):   0
  so no servidor (seriam REMOVIDOS): 0
FIELD OVERRIDES arquivo:  8 | servidor:  8   -> 8/8 idênticos, 0 diferenças
PRECISA DEPLOY DE INDICES? NAO
```

Os quatro índices que o brief cita já estão no ar: `eventos(status,data)` e `saude.eventoId`
(expurgo LGPD), `clubes(tenantId,criadoEm DESC)` e `tenants(status,criadoEm DESC)`.

**D1 (`fieldOverride` não-aditivo): não se aplica** — nenhum override é tocado porque não há deploy.
Guarda executada mesmo assim: nenhum escopo `COLLECTION` do servidor está ausente do arquivo.
`membros.atletaId` mantém `COLLECTION/ASC`, `COLLECTION/DESC` e `COLLECTION_GROUP/ASC` nos dois lados.

---

## Passo 3 — `storage:rules` — ✅ NO AR

O `--only storage:rules` do brief não é aceito pelo CLI (`Could not find rules for the following
storage targets: rules`, exit 1). Repetido com `--only storage`, que é a forma que deploya as
rules do bucket declarado em `firebase.prod.json`. Nada mais foi tocado.

```
> npx firebase-tools@13 deploy --only storage --project prod --config firebase.prod.json --non-interactive
+  firebase.storage: rules file storage.rules compiled successfully
+  storage: released rules storage.rules to firebase.storage
+  Deploy complete!
STORAGE_DEPLOY_EXIT=0
```

Confirmação pela Firebase Rules API (não pelo texto do CLI):

| | ruleset | updateTime |
|---|---|---|
| antes | `fc6cad14-ede0-4f26-abff-834901df6afe` | 2026-07-29T15:22:05Z |
| **depois** | **`34131880-544c-4e67-9939-3c29d2594eba`** | **2026-08-05T20:42:51Z** |

Release: `firebase.storage/leela-hub.firebasestorage.app`.

```
LIVE  bytes: 13856  sha256[0:16]: 53803f9c8dd1eb77
LOCAL bytes: 13856  sha256[0:16]: 53803f9c8dd1eb77
IDENTICOS? true
slotFotoKitValido no ar? true
match .../kits/{kitId}/fotos/{slot} no ar? true
```

O diff `publicado × arquivo` medido ANTES do deploy era exatamente **um bloco aditivo**: a função
`slotFotoKitValido(slot)` e o `match /eventos/{eventoId}/kits/{kitId}/fotos/{slot}` (RN-427).
Nenhuma linha existente mudou — nenhuma permissão foi afrouxada nem revogada.

---

## Passo 4 — `functions` — ✅ 21/21

### 4.1 Fecho de dependências com baseline POR FUNÇÃO

O artefato é um bundle CJS único (`functions/scripts/bundle-deploy.mjs`), então o recorte é por
contrato de comportamento. Reusei o grafo de imports da lane FIX-PROJECAO/DEPLOY-FINAL
(arestas de **runtime** apenas: `import type` e especificadores `type X` são apagados pelo `tsc`)
e acrescentei o que a produção heterogênea exige: **duas baselines**.

```
EXPORTS no codigo: 96 | ACTIVE em prod (app): 93
baseline c03f6f1c: 65 fn   (deploy DEPLOY-FINAL, 05/08 07:16-07:17Z)
baseline bdc9a531: 28 fn   (deploy de 28/07 23:55 - 29/07 01:09Z)
arquivos alterados c03f6f1c..HEAD: 12
arquivos alterados bdc9a531..HEAD: 38
CONJUNTO A DEPLOYAR: 21  |  FORA: 75
```

### 4.2 Lista função → razão

| # | Função | Baseline | Razão (caminho de runtime até o arquivo alterado) |
|---|---|---|---|
| 1 | **solicitarCodigoDeAcesso** | NOVA | não existe em prod (RN-476, código de 6 dígitos) |
| 2 | **confirmarCodigoDeAcesso** | NOVA | não existe em prod |
| 3 | **concluirAcessoComProva** | NOVA | não existe em prod |
| 4 | expurgarSaude | bdc9a531 | `functions/src/eventos/expurgarSaude.ts` (direto) |
| 5 | asaasWebhook | c03f6f1c | `checkout/webhookAsaas` → `checkout/contaSemFriccao` → `email/incidenteEmail` |
| 6 | confirmarPagamentoSandbox | c03f6f1c | `checkout/confirmarPagamentoSandbox` → `checkout/contaSemFriccao` → `email/incidenteEmail` |
| 7 | pagamentoWebhook | c03f6f1c | `checkout/webhookPagamento` → `affiliation/avisoAfiliado` → `email/templates` |
| 8 | reenviarEmailsDoPedido | c03f6f1c | `checkout/reenviarEmailsPedido` → `email/incidenteEmail` |
| 9 | cadastrarAssessoriaParceira | c03f6f1c | `assessorias/cadastrarAssessoria` → `email/templates` |
| 10 | definirCondicaoDesconto | c03f6f1c | `assessorias/definirCondicaoDesconto` → `cadastrarAssessoria` → `email/templates` |
| 11 | encerrarParceriaAssessoria | c03f6f1c | `assessorias/encerrarParceria` → `cadastrarAssessoria` → `email/templates` |
| 12 | provisionAssessoriaAccount | c03f6f1c | `assessorias/provisionAssessoria` → `cadastrarAssessoria` → `email/templates` |
| 13 | provisionAfiliadoAccount | c03f6f1c | `affiliation/provisionAfiliado` → `provisionAssessoria` → `cadastrarAssessoria` → `email/templates` |
| 14 | registrarRepasseComissao | c03f6f1c | `affiliation/registrarRepasse` → `affiliation/avisoAfiliado` → `email/templates` |
| 15 | salvarAfiliado | c03f6f1c | `affiliation/salvarAfiliado` → `email/templates` |
| 16 | enviarCampanha | c03f6f1c | `eventos/enviarCampanha` → `email/templates` |
| 17 | dispatchAutomacoes | c03f6f1c | `eventos/automacoesTriggers` → `enviarCampanha` → `email/templates` |
| 18 | dispatchCampanhasAgendadas | c03f6f1c | `eventos/dispatchCampanhasAgendadas` → `enviarCampanha` → `email/templates` |
| 19 | onInscritoWriteAutomacao | c03f6f1c | `eventos/automacoesTriggers` → `enviarCampanha` → `email/templates` |
| 20 | solicitarRedefinicaoSenha | c03f6f1c | `auth/solicitarRedefinicaoSenha` → `email/templates` |
| 21 | varrerIngressosOrfaos | c03f6f1c | `eventos/varrerIngressosOrfaos` → `email/enviarIngressos` → `email/templates` |

**Os parsers pt-BR ficam de fora com prova.** `parseValorPtBr`, `parseContagemPtBr` e
`pontuacaoPtBr` mudaram em `packages/core`, mas nenhum arquivo de `functions/src` os importa
(grep do símbolo: só o próprio `packages/core` e o barrel). São consumidos pelo **painel**, e é lá
que entram — passo 7. Mesmo para `pedidos/pedido.ts`, `platform/conviteOrganizador.ts` e os
arquivos de `cliente/*`: as funções que os alcançam têm baseline `c03f6f1c` e já os carregam.

**Secret bloqueante conferido antes do deploy:** `CODIGO_ACESSO_PEPPER` existe com a versão **1
ENABLED**; os três callables novos o declaram (`solicitarCodigoDeAcesso.ts:177`,
`confirmarCodigoDeAcesso.ts:479,485`).

**Gates de build antes do deploy:** `functions` `npm run build` (tsc) exit 0 · `tsc --noEmit` exit 0.

### 4.3 Resultado

```
FUNCTIONS_DEPLOY_EXIT=0   ·   +  Deploy complete!
21 linhas "Successful create/update operation" no log do CLI
  -> 3 create (as callables novas) + 18 update
```

Conferência independente pela Cloud Functions API (não pelo texto do CLI):

```
ACTIVE E ATUALIZADAS NA JANELA: 21/21
PROBLEMAS: nenhum
TOTAL functions no projeto: 97 | nao-ACTIVE: nenhuma
FORA do deploy: 75 | alguma nao-ACTIVE? nenhuma
```

97 = 93 do app + **3 novas** + `ssrleelalanding`. **Zero retries** — nenhuma falha isolada.

```
solicitarCodigoDeAcesso        ACTIVE 2026-08-05T20:49:05Z  rev 1
confirmarCodigoDeAcesso        ACTIVE 2026-08-05T20:49:01Z  rev 1
concluirAcessoComProva         ACTIVE 2026-08-05T20:49:06Z  rev 1
expurgarSaude                  ACTIVE 2026-08-05T20:49:17Z  rev 4
asaasWebhook                   ACTIVE 2026-08-05T20:49:05Z  rev 10
varrerIngressosOrfaos          ACTIVE 2026-08-05T20:49:12Z  rev 8
```

Aviso não-bloqueante repetido do CLI: `Unhandled error cleaning up build images` (custo, não
correção) — segue na lista do dono desde a DEPLOY-FINAL.

---

## Passo 5 — `firestore:rules` — ✅ NO AR

Diff medido ANTES do deploy (`ruleset 20e64b19…` × arquivo): **um único bloco de comentário e uma
única linha de código**, dentro de `ehCompradorDoPedido`:

```
+              && request.auth.token.email_verified == true
```

E ela entra **só no ramo (b)** (`contaSemFriccao.contaUid`). O **ramo (a)** — a sessão anônima do
checkout, `resource.data.responsavel.atletaId == request.auth.uid` — sai intocado, confirmado
linha a linha no arquivo E no ruleset publicado.

```
> npx firebase-tools@13 deploy --only firestore:rules --project prod --config firebase.prod.json
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: released rules firestore.rules to cloud.firestore
RULES_DEPLOY_EXIT=0
```

| | ruleset | updateTime |
|---|---|---|
| antes | `20e64b19-a2d4-4cb6-829b-1f28103ac0ee` | 2026-08-05T07:19:19Z |
| **depois** | **`4eabe733-d343-4f61-8378-0e20e07f29ef`** | **2026-08-05T20:50:40Z** |

```
LIVE  bytes: 165932  sha256[0:16]: 23b3a92b0e06ef7d
LOCAL bytes: 165932  sha256[0:16]: 23b3a92b0e06ef7d
IDENTICOS? true
ocorrencias de email_verified no ruleset no ar: 3
```

`ehCompradorDoPedido` **como está no ar**:

```
function ehCompradorDoPedido() {
  return isSignedIn()
    && (
      ('responsavel' in resource.data
        && 'atletaId' in resource.data.responsavel
        && resource.data.responsavel.atletaId == request.auth.uid)      // ramo (a) INTOCADO
      ||
      ('contaSemFriccao' in resource.data
        && 'contaUid' in resource.data.contaSemFriccao
        && resource.data.contaSemFriccao.contaUid == request.auth.uid
        && request.auth.token.email_verified == true)                    // ramo (b) POSSE-EMAIL-1
    );
}
```

---

## Passo 6 — `hosting:leela-landing` — ✅ NO AR (1 retry consumido)

Estado ANTES (chunks servidos em `/` e `/teste-taxa-repassada`, ambos 200):

```
main-app-a8719e8e11c2e70b   webpack-cc97c7a268553d36   870-3757826a6472b490
253-58639177a170c769        768-3342e29a38aad17d       136-5fa1d42a32aa7b2e
28-a652b067a0f14de5         85-1e422b264c271970        99-1eef1d5112bf6449
148-a0f19e1e366875bf        331-5e1e511f5c5635b0       333-9d1c460ed9037c63
390bae33-e53f40ee2b34724c   415a2810-4859d7aa03e109af  4a2876f6-9570b6a6e15b4ea3
e4548fa6-4946aa450cec0ab6   polyfills-42372ed130431b0a
app/(public)/page-1f5d185b7a07926a       app/(public)/layout-bdfe1327603cd32d
app/(public)/[eventSlug]/page-a72b098e36e2af70
app/error-caf852f9283b7912  app/global-error-0bad6555128f100f  app/not-found-d3808ea282678374
```

### Desvio D-2 — 1ª tentativa morreu em falha de autenticação transitória

```
Authentication Error: Your credentials are no longer valid. Please run firebase login --reauth
```

O `firebase` do PATH (15.22.4, o binário que a integração `webframeworks` exige) falhou ao renovar
o token — o `expires_at` do configstore tinha vencido. **Não é falha real:** medido logo depois,
`firebase login:list` devolve `Logged in as inguzbuilders@gmail.com` e `firebase projects:list`
lista `leela-hub`, com a MESMA credencial; e os passos 3, 4 e 5 (via `firebase-tools@13`) já haviam
passado com ela. Enquadrei como falha isolada e usei **o único retry** que a lane autoriza.

Efeito colateral tratado: o processo morreu antes do `finally`, deixando
`apps/landing/package.json` com o patch temporário e o `package.json.deploybak` em disco. Conferi
que o backup era **byte a byte igual ao HEAD** e deixei o próprio script desfazer pelo caminho de
recuperação que ele já tem — a 2ª execução abriu com
`backup de package.json encontrado e restaurado (execução anterior caiu)`. **Não editei arquivo à mão.**

### Resultado da 2ª execução

```
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: version finalized
+  hosting[leela-landing]: release complete
+  Deploy complete!   ·   Hosting URL: https://leela-landing.web.app
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0
```

Release (Hosting API, não pelo texto do CLI):

| | release | releaseTime | version |
|---|---|---|---|
| antes | `1785927349209000` | 2026-08-05T10:55:49Z | `2056226926927113` |
| **depois** | **`1785983098700000`** | **2026-08-06T02:24:58Z** | **`8394c80e88675dc8`** (FINALIZED) |

### Prova por hash de chunk — o bundle mudou

| chunk | ANTES | DEPOIS |
|---|---|---|
| `main-app` | `a8719e8e11c2e70b` | **`55f88c44f9377460`** |
| `870-` | `3757826a6472b490` | **`4ccded8d555da9b5`** |
| `333-` | `9d1c460ed9037c63` | **`b84b047b19eb3c15`** |
| `app/(public)/layout` | `bdfe1327603cd32d` | **`cc456f5435938aa4`** |
| `app/(public)/[eventSlug]/page` | `a72b098e36e2af70` | **`7e8e0f51560174bc`** |
| sumiram | `148-a0f19e…`, `253-58639177…`, `768-3342e29a…` | — |
| novos | — | `686-b4f5d8a81c04f271`, `963-63c6f898feceecdc` |
| estáveis | `webpack-`, `136-`, `28-`, `85-`, `99-`, `331-`, `390bae33-`, `415a2810-`, `4a2876f6-`, `e4548fa6-`, `polyfills-`, `app/(public)/page`, `app/error`, `app/global-error`, `app/not-found` | idênticos |

Ruídos não-bloqueantes da integração `webframeworks`, os mesmos das lanes anteriores:
`Failed to find esbuild with npx which` e `Failed to install esbuild` — o build seguiu, empacotou
272.18 MB, subiu 16 arquivos novos e finalizou a versão.

Higiene depois do deploy: `git status --porcelain --untracked-files=no` volta **só** o handoff que
já estava staged antes da lane; `apps/landing/package.json` limpo; **sem `package.json.deploybak`
residual**.

---

## Passo 7 — `hosting:leela-hub` (painel) — ✅ NO AR

Receita da lane PAINEL-DEPLOY, reusada sem alteração:
`cd apps/painel && npx vite build --mode leela-hub` (env na raiz, `envDir` do `vite.config.ts`).

```
vite v5.4.21 building for leela-hub...
3983 modules transformed.
dist/index.html                 0.48 kB
dist/assets/index-DhwM1Nvh.css  109.38 kB
dist/assets/browser-BXdiCFWD.js  24.53 kB
dist/assets/index-BK64g7OJ.js  2,235.48 kB
built in 1m 24s   ·   PAINEL_BUILD_EXIT=0
```

O build saiu DEPOIS do `tsup` do `@leela/design-system` e do `@leela/core`, então carrega o `dist/`
novo dos dois (a armadilha do brief).

| asset | no ar (04/08 04:55Z) | build local |
|---|---|---|
| JS | `index-D1bmpOyT.js` | **`index-BK64g7OJ.js`** |
| CSS | `index-CtF6I8it.css` | **`index-DhwM1Nvh.css`** |

### Deploy

```
> npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
i  hosting[leela-hub]: found 14 files in apps/painel/dist
+  hosting[leela-hub]: version finalized
+  hosting[leela-hub]: release complete
+  Deploy complete!   ·   Hosting URL: https://leela-hub.web.app
PAINEL_DEPLOY_EXIT=0
```

`--only hosting` com `firebase.prod.json` toca **só** o site `leela-hub` — `firestore`, `storage` e
`functions` ficam fora por construção.

| | release | releaseTime | version |
|---|---|---|---|
| antes | `1785819312151000` | **2026-08-04T04:55:12Z** | `e9bbcf36fed5c76f` |
| **depois** | **`1785983161411000`** | **2026-08-06T02:26:01Z** | **`112f9dc4083f4b4f`** (FINALIZED) |

**O salto de 22 horas que o brief anunciava está feito.**

### Prova: o artefato servido é byte a byte o do build

```
index-BK64g7OJ.js   local f93bf033a6f7d3aec6fe53d1c9f2b86eae205a0428225dea7bc810273802c550
                    live  f93bf033a6f7d3aec6fe53d1c9f2b86eae205a0428225dea7bc810273802c550   IDENTICO
index-DhwM1Nvh.css  local 59aff85860e9651fbc74541a31b74cbc484ac00026ad2f483b334ab095d50a19
                    live  59aff85860e9651fbc74541a31b74cbc484ac00026ad2f483b334ab095d50a19   IDENTICO
```

`index.html` servido aponta para os dois assets novos. O antigo `/assets/index-D1bmpOyT.js`
devolve 200 mas com `Content-Type: text/html` — é o rewrite SPA servindo o `index.html`, não o JS
velho (mesmo comportamento que a lane PAINEL-DEPLOY já havia registrado).

Marcas do salto, lidas **no bundle servido em produção** (não no build local):

```
'PED-'                -> 1 ocorrencia    (codigo do pedido nas telas do operador)
'Configurar lotes'    -> 1 ocorrencia    (a afordancia do alerta que leva aos lotes)
'Verificando sessão'  -> 1 ocorrencia    (skeleton do RequireSessao, controle de que o bundle e o do painel)
```

Os parsers de dinheiro e contagem não aparecem por nome — build de produção mangla identificador.
A prova deles é o hash do bundle, que mudou.


---

## Smoke pós-deploy — 7/7, todos somente leitura

### Smoke 1 · `POST /ingressoPorLink` com token inválido (RN-419) ✅

```
token invalido   -> http=404  {"ok":false}
token vazio      -> http=404  {"ok":false}
sem corpo        -> http=404  {"ok":false}
```

Recusa **genérica** nas três formas — não distingue "token malformado" de "ingresso inexistente".
RN-419 viva.

### Smoke 2 · a página do ingresso do dono abre ✅

```
GET https://leela-landing.web.app/ingresso/LLIP1.prod1.eyJpIjoicGVkLXdOWFJUdk1NM3ZjN0JveWk5MXZSZ3gzREJReTIt…
http=200  bytes=40086  tempo=7.07s   (cold start do SSR recém-deployado)
ocorrencias de T93N7F no HTML: 2
```

```html
…font-mono text-3xl font-bold tracking-widest text-text-primary">T93N7F</p>…
```

Só leitura — nada foi escrito no ingresso do dono.

### Smoke 3 · o PDF dele ✅

```
GET <mesma URL>/pdf
http=200  bytes=10264  type=application/pdf  redirects=0
primeiros 8 bytes: "%" "P" "D" "F" "-" "1" "." "7"
```

### Smoke 4 · `GET /teste-taxa-repassada` ✅

```
http=200  bytes=40974  tempo=1.17s
```

### Smoke 5 · a consulta que estava quebrada ✅ — 2 documentos, sem `FAILED_PRECONDITION`

`documents:runQuery` em `clubes`, `where tenantId == 'castelo-producoes'`, `orderBy criadoEm DESC`:

```
http=200
entradas na resposta: 2
ENTRADAS COM CHAVE error: 0        <- a leitura correta, a que enganou o maestro
DOCUMENTOS: 2
  - clubes/ritmo-forte-assessoria
  - clubes/floripa-run-coletivo
FAILED_PRECONDITION presente? false
```

Contei a chave `error` do array **antes** de contar `.document`, exatamente como o brief exige. As
duas leituras concordam: zero erro, dois documentos.

### Smoke 6 · log das funções — zero erro novo ✅

Consulta pela Cloud Logging API (a janela abre **antes** do primeiro deploy da lane):

```
severity>=WARNING em cloud_function + cloud_run_revision, timestamp >= 2026-08-05T20:40:00Z
=> 0 entradas
"FAILED_PRECONDITION" na mesma janela
=> 0 entradas
```

Dois controles, porque "zero" só vale se a consulta souber achar erro:

```
CONTROLE A (mesma consulta sem filtro de severidade, mesma janela) -> 5 entradas. O filtro funciona.
CONTROLE B (severity>=WARNING de 01/08 ate 05/08 20:40Z)           -> 5 entradas. A consulta acha erro quando ha.
```

Cruzamento com `functions:log -n 400` (janela 2026-08-05T23:28Z → 2026-08-06T02:26Z, 409 linhas):
severidades **355 D · 42 I · 2 N · 1 sem rótulo · zero W · zero E**. Nenhuma falha de secret,
nenhum `PERMISSION_DENIED`, nenhum `UNAUTHENTICATED` não explicado. As únicas execuções com status
diferente de 200 na janela são os meus próprios smokes.

### Smoke 7 · as 3 callables novas existem e falham fechadas ✅ (critério corrigido — ver D-3)

```
solicitarCodigoDeAcesso    http=400 {"error":{"message":"Informe um e-mail válido para receber o código.","status":"INVALID_ARGUMENT"}}
confirmarCodigoDeAcesso    http=400 {"error":{"message":"Informe o e-mail e o código.","status":"INVALID_ARGUMENT"}}
concluirAcessoComProva     http=400 {"error":{"message":"Informe um e-mail válido.","status":"INVALID_ARGUMENT"}}

[controle] asaasWebhook GET        -> http=405   (existe)
[controle] funcao inexistente      -> http=404   (o probe distingue 404 de existente)
```

E no log, do lado do servidor:

```
solicitarCodigoDeAcesso: {"message":"Callable request verification passed","verifications":{"app":"MISSING","auth":"MISSING"}}
solicitarCodigoDeAcesso: Function execution took 149 ms, finished with status code: 400
```

### Desvio D-3 — o critério do brief para o smoke 7 está errado, e o certo é este

O brief espera **401 UNAUTHENTICATED sem token**. As três **não podem** devolver isso: são
**públicas por construção**. `solicitarCodigoDeAcesso.ts:174` diz literalmente
`// Callable (PÚBLICA — quem pede o código não tem sessão)`, e `confirmarCodigoDeAcesso.ts:476`
repete `// Callables (PÚBLICAS — quem confirma o código ainda não tem sessão)`. Nenhuma das três lê
`context.auth`. É o desenho da RN-476: elas são a porta de quem **ainda não tem conta** — exigir
sessão para pedir o código de primeiro acesso trancaria a própria função que o brief quer no ar.

O que o smoke prova de verdade, e é o que importa: **existem** (não é 404, e o controle mostra que o
probe distingue) e **falham fechadas** com `INVALID_ARGUMENT` genérico, sem revelar se o endereço
tem conta — a propriedade de não-oráculo do commit `a0f12500`. Smoke 7 **passado pelo mérito**, com
o critério corrigido e registrado.

---

## Fechamento

### Placar

| Passo | Estado | Prova |
|---|---|---|
| 0. Pré-flight | ✅ | `core` e `design-system` buildados com `tsup` antes de tudo; árvore limpa |
| 1. Índices | ✅ **sem deploy** | arquivo == servidor (18 compostos, 8 overrides, 0 diferenças) |
| 2. Storage rules | ✅ no ar | ruleset `34131880-544c-4e67-9939-3c29d2594eba`, byte-idêntico ao arquivo |
| 3. Functions | ✅ **21/21** | 3 create + 18 update · `ACTIVE E ATUALIZADAS NA JANELA: 21/21` · 97 no projeto · zero não-ACTIVE |
| 4. Firestore rules | ✅ no ar | ruleset `4eabe733-d343-4f61-8378-0e20e07f29ef`, byte-idêntico, ramo (a) intocado |
| 5. Landing | ✅ no ar | release `1785983098700000` · `main-app` `a8719e8e…` → `55f88c44…` |
| 6. Painel | ✅ no ar | release `1785983161411000` · JS/CSS servidos byte-idênticos ao build |
| 7. Smokes 1-7 | ✅ **7/7** | 0 regressões |

### Nada foi violado

Não alterei código nem spec (o único arquivo tocado fora do handoff foi `apps/landing/package.json`,
e quem o tocou e desfez foi o próprio script de deploy) · não executei reenvio de e-mail · não rodei
backfill · não escrevi em Firestore nem em Storage de produção (todos os smokes são leitura) · não
rotacionei secret · não deployei função fora da lista justificada.

### Desvios

1. **D-1 — âncora de functions do brief incorreta.** O brief diz `162a1276`; o servidor diz
   `c03f6f1c` para 65 funções e `bdc9a531` para 28. Adotei as baselines reais. Onde a diferença
   importa (as 28 antigas) a baseline real é **mais conservadora** que a do brief.
2. **D-2 — 1ª tentativa da landing morreu em erro de autenticação transitório.** Retry único
   consumido, bem-sucedido. Detalhe no passo 6.
3. **D-3 — critério do smoke 7 corrigido.** As 3 callables são públicas por desenho; 401 é
   impossível. Passaram pelo mérito.
4. **`--only storage:rules` não existe no CLI**; a forma correta é `--only storage`.

### Ficou de fora, e por quê

- **Deploy de índices:** arquivo idêntico ao servidor. Nada a subir.
- **75 das 96 functions:** nenhum arquivo alterado desde a baseline **delas** é alcançado por aresta
  de runtime. Seguem ACTIVE e intocadas. Lista completa em `deploy-set-0805.txt` / `closure0805.mjs`.
- **Push para `origin/main`:** segue fora da lane (mesmo D-A da DEPLOY-FINAL, agora com 5 commits
  não publicados). **Produção roda código que só existe nesta máquina.**

### Para o dono

1. ⚠️ **`git push` para `origin/main`.** 5 commits locais não publicados, incluindo os 4 fixes que
   liberaram este deploy. Reincidência da DEPLOY-FINAL.
2. **`solicitarRedefinicaoSenha` falhou em produção às 2026-08-05T11:43:11Z** com
   `INTERNAL ASSERT FAILED: Unable to create the email action link` e `desfecho: falha_envio`.
   **Pré-existente** (9h antes deste deploy), não é regressão da lane — mas é o caminho de
   redefinição de senha morrendo para um usuário real. Precisa de lane de diagnóstico.
3. **`expurgarSaude`:** o índice `eventos(status,data)` que faltava **já está no ar** e a função foi
   redeployada nesta lane. A última falha é de 2026-08-05T06:20Z. Como é cron diário, a confirmação
   vem na próxima execução — vale olhar.
4. **Imagens de build não limpas** (`gcr.io/leela-hub/us/gcf`) — aviso repetido do CLI, custo mensal
   pequeno. Limpeza de fechamento de sprint.
5. **Config drift do binário da landing:** o `deploy-leela-hub.mjs` chama `firebase` do PATH
   (15.22.4) e herda o que estiver instalado na máquina. Foi justamente esse binário que falhou a
   autenticação. Fixar a versão é decisão do dono.
6. **Bundle heterogêneo em produção:** três gerações do mesmo artefato coexistem (28/07,
   05/08 07:17Z, 05/08 20:49Z). É o estado normal de deploys parciais e nenhuma função fora do
   conjunto alcança arquivo alterado, mas vale saber.
