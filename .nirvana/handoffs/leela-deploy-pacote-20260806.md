# DEPLOY-PACOTE-20260806 — handoff vivo

- **Lane:** DEPLOY-PACOTE · **Trace:** `leela-deploy-pacote-20260806`
- **Employee:** sf-platform-lead (software-forge)
- **Projeto:** alias `prod` = `leela-hub` (config `firebase.prod.json`; landing por `firebase.landing.json`)
- **Início:** 2026-08-06 17:17 -0300 · **HEAD:** `133ef12325ab3a7fb8ba3c5ac377896c06cdd5b3`
- **Regra da lane:** não altero código. Falha 2× pelo mesmo motivo ⇒ PARO e reporto.

> Motivo da lane: a double scrollbar da tela de eventos (4ª cobrança do dono) está consertada em
> `main` desde as 01:26 de hoje, mas o site servia o build de 05/08. Fix que dorme sem deploy é,
> aos olhos do dono, defeito não consertado.

---

## Passo 0 — Pré-condições ✅

### PC-1 · árvore limpa nos diretórios buildáveis

```
> git status --porcelain apps/ packages/ functions/
 M packages/design-system/lint/leela-scroll-plugin.mjs      <- sobra TOLERADA pelo brief
?? apps/mobile/.expo/                                        <- cache do Expo, 03/08 04:02
?? functions/lib/                                            <- saída do tsc (functions/lib/{functions,packages})
```

Tracked-only, para separar fonte de artefato:

```
> git status --porcelain --untracked-files=no
 M .nirvana/handoffs/leela-limpeza-prod-20260806.md
A  .nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md
 M leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md
 M packages/design-system/lint/leela-scroll-plugin.mjs
```

**Nenhum arquivo-fonte modificado em `apps/`, `packages/src` ou `functions/` além da sobra tolerada.**
Os dois `??` são artefatos de build não-rastreados (o `.expo/` é de 03/08, anterior a esta lane; o
`functions/lib/` é a saída do `tsc`), não são código e não indicam lane VITRINE em curso. As outras
três sobras (2 handoffs + TRIAGEM) estão fora dos diretórios buildáveis e **não foram tocadas**.

**PC-1 ✅ — sem espera.**

### PC-2 · RAM

Um build por vez, do começo ao fim. **Nenhuma suíte executada** — nem a do painel, nem a de
functions. O deploy confia nos gates que as lanes já rodaram e prova por hash e por smoke.

---

## Desvio D-1 — a âncora `9b0ffd3` do brief está errada (mesma classe do D-1 de ontem)

O brief manda decidir functions por `git diff 9b0ffd3..HEAD`. Mas `9b0ffd3` é de **2026-07-28
23:41** — e a lane DEPLOY-TUDO-0805 deployou 21 functions em **2026-08-05T20:49Z**, partindo de
HEAD `846ce8ee` (2026-08-05 17:34 -0300). Medir contra `9b0ffd3` contaria como "novo" tudo que
**ontem já subiu**: 136 arquivos, incluindo as 3 callables de código de acesso que estão ACTIVE
em produção desde ontem.

**Baseline real adotada: `846ce8ee`.** Todos os 40 commits entre ela e HEAD são de hoje (06/08).
A âncora do brief fica registrada como incorreta pela segunda rodada seguida.

---

## Passo 1 — `tsup` dos pacotes ✅

`packages/core` entrou junto porque **também mudou** (o painel importa os dois, e `dist/` é
gitignorado — é a armadilha que o runbook de ontem registrou):

```
git diff --stat 846ce8ee..HEAD -- packages/core
 packages/core/src/index.ts                      |  31 +++-
 packages/core/src/platform/contaParticipante.ts |  30 ++-
 packages/core/src/platform/politicaDeSenha.ts   | 237 ++++++++++++++++++++++++
 packages/core/src/platform/roles.ts             | 148 ++++++++++++++-
 4 files changed, 421 insertions(+), 25 deletions(-)
```

| Pacote | Início | Resultado |
|---|---|---|
| `packages/core` | 17:18:45 | ✅ exit 0 — CJS **302.83 KB** (ontem 299.68 KB) · ESM 282.63 KB · DTS 360.86 KB |
| `packages/design-system` | 17:19:01 | ✅ exit 0 — 5 entradas (index/rn/server/dialog/tailwind-preset), CJS+ESM+DTS |

O crescimento do `core` é o `politicaDeSenha` (+237 linhas) entrando no bundle — a regra de senha
que o `InputSenha` e as functions passam a compartilhar.

---

## Passo 2 — painel (`hosting:leela-hub`) ✅ NO AR

Receita de ontem, sem alteração: `cd apps/painel && npx vite build --mode leela-hub`.

```
vite v5.4.21 building for leela-hub...
3988 modules transformed.                       (ontem: 3983)
dist/index.html                 0.48 kB
dist/assets/index-DufB2CDQ.css  109.90 kB
dist/assets/browser-BXdiCFWD.js  24.53 kB
dist/assets/index-hg4CK5Fu.js  2,245.49 kB
built in 19.61s   ·   PAINEL_BUILD_EXIT=0     (17:19:23 -> 17:19:46)
```

O build saiu **depois** do `tsup` dos dois pacotes, então carrega o `dist/` novo dos dois.

```
> npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
i  hosting[leela-hub]: found 14 files in apps/painel/dist
i  hosting: uploading new files [0/3]
+  hosting[leela-hub]: version finalized
+  hosting[leela-hub]: release complete
+  Deploy complete!   ·   Hosting URL: https://leela-hub.web.app
PAINEL_DEPLOY_EXIT=0                            (17:19:55 -> 17:20:18 -0300)
```

`--only hosting` com `firebase.prod.json` toca **só** o site `leela-hub` — firestore, storage e
functions ficam fora por construção.

### Prova por hash de chunk — o ar mudou

| asset | ANTES (build de 05/08) | DEPOIS |
|---|---|---|
| JS | `index-BK64g7OJ.js` | **`index-hg4CK5Fu.js`** |
| CSS | `index-DhwM1Nvh.css` | **`index-DufB2CDQ.css`** |

O "antes" foi medido **no ar**, não no papel: `GET https://leela-hub.web.app/` às 17:18 devolvia
`index-BK64g7OJ.js` + `index-DhwM1Nvh.css`, exatamente os assets que a lane de ontem publicou.

### Prova de identidade — o servido é byte a byte o construído

```
index-hg4CK5Fu.js   local 5788f60d4965e6dc2abd4c9cd12b39586e8d685ecc9600acaf45d14f9fbc4d00
                    live  5788f60d4965e6dc2abd4c9cd12b39586e8d685ecc9600acaf45d14f9fbc4d00   IDENTICO
index-DufB2CDQ.css  local 1b1d361e8a500beb3a5180498994411929980cec6019a2032648dc8ea1fb14c6
                    live  1b1d361e8a500beb3a5180498994411929980cec6019a2032648dc8ea1fb14c6   IDENTICO

GET /assets/index-hg4CK5Fu.js -> http=200  type=text/javascript  bytes=2249843
```

---

## Passo 3 — landing (`hosting:leela-landing`) — em curso

Estado ANTES (medido no ar às 17:18, 20 chunks, idêntico ao que a lane de ontem publicou):

```
main-app-55f88c44f9377460   webpack-cc97c7a268553d36   870-4ccded8d555da9b5
333-b84b047b19eb3c15        686-b4f5d8a81c04f271       963-63c6f898feceecdc
136-5fa1d42a32aa7b2e        28-a652b067a0f14de5        85-1e422b264c271970
331-5e1e511f5c5635b0        390bae33-e53f40ee2b34724c  415a2810-4859d7aa03e109af
4a2876f6-9570b6a6e15b4ea3   e4548fa6-4946aa450cec0ab6  polyfills-42372ed130431b0a
app/(public)/layout-cc456f5435938aa4   app/(public)/page-1f5d185b7a07926a
app/error-caf852f9283b7912  app/global-error-0bad6555128f100f  app/not-found-d3808ea282678374
```

### Desvio D-2 — 1ª execução morta pelo teto de 10 min da ferramenta (não é falha do deploy)

A 1ª execução (17:21:06) foi interrompida em **exit 143 (SIGTERM)** ao bater o teto de 10 minutos
do executor de comandos — não houve erro do Firebase. O build do Next da landing passa desse tempo
(ontem a mesma etapa empacotou 272 MB).

Efeito colateral idêntico ao **D-2 de ontem**: o processo morreu antes do `finally`, deixando o
patch temporário em `apps/landing/package.json` e o `package.json.deploybak` em disco.
**Não editei arquivo à mão** — conferi que o backup é byte a byte igual ao HEAD e deixei o próprio
script desfazer pelo caminho de recuperação que ele já tem:

```
git show HEAD:apps/landing/package.json  -> 098a7fed3f079b8f4ebc9d0c10be116ad092d96139f134daa2bc621eda1d7f41
apps/landing/package.json.deploybak      -> 098a7fed3f079b8f4ebc9d0c10be116ad092d96139f134daa2bc621eda1d7f41
BACKUP IDENTICO AO HEAD -> recuperacao do script e segura
```

O patch medido era exatamente o que o script documenta: mover os três `@leela/* : workspace:*` de
`dependencies` para `devDependencies` e fixar `engines.node = "22"`. Nada mais.

**2ª execução lançada em background** (17:23), fora do teto da ferramenta. O caminho de
recuperação do script abriu exatamente como ontem:

```
[deploy-landing] backup de package.json encontrado e restaurado (execução anterior caiu).
[deploy-landing] env carregada de .env.leela-hub: NEXT_PUBLIC_USE_EMULATOR, … (9 chaves)
[deploy-landing] patch temporário: workspace:* → devDependencies; engines.node=22
```

### Resultado ✅ NO AR (17:41)

```
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: version finalized
+  hosting[leela-landing]: release complete
+  Deploy complete!
[deploy-landing] package.json restaurado.
LANDING_DEPLOY2_EXIT=0
```

Ruídos não-bloqueantes repetidos da integração `webframeworks`, os mesmos de ontem:
`Failed to find esbuild with npx which` e `Failed to install esbuild` — o build seguiu, achou 99
arquivos e finalizou a versão.

### Prova por hash de chunk — o bundle mudou

| chunk | ANTES (no ar às 17:18) | DEPOIS |
|---|---|---|
| `main-app` | `55f88c44f9377460` | **`24c4fa540a35e5d0`** |
| `870-` | `4ccded8d555da9b5` | **`7d97b29525175355`** |
| `333-` | `b84b047b19eb3c15` | **`44407093a280634d`** |
| `686-` | `b4f5d8a81c04f271` | **`8892f7fd68283960`** |
| `app/(public)/layout` | `cc456f5435938aa4` | **`292e8548e3ebb3e6`** |
| `app/error` | `caf852f9283b7912` | **`bac1e9d6f20c5445`** |
| `app/global-error` | `0bad6555128f100f` | **`30913483bbf24a70`** |
| `app/not-found` | `d3808ea282678374` | **`7e05e55da66a985c`** |
| sumiram | `136-5fa1d42a…`, `85-1e422b26…`, `963-63c6f898…` | — |
| novos | — | `426-6aca2ca8da0af8b3`, `54-99a513ec4b38d891`, `976-29277ae4440b3fed` |
| estáveis | `webpack-`, `polyfills-`, `28-`, `331-`, `390bae33-`, `415a2810-`, `4a2876f6-`, `e4548fa6-`, `app/(public)/page` | idênticos |

### Higiene pós-deploy ✅

```
> git status --porcelain apps/ packages/ functions/
 M packages/design-system/lint/leela-scroll-plugin.mjs      <- a MESMA sobra tolerada do início
?? apps/mobile/.expo/
?? functions/lib/

apps/landing/package.json      -> limpo (restaurado pelo script)
package.json.deploybak         -> NÃO existe (removido pelo finally)
```

---

## Passo 4 — `firestore:rules` ✅ NO AR (17:41:10)

Diff medido ANTES do deploy pela conferência de prontidão (`functions/scripts/prontidao-de-deploy.mjs`,
C3), que abriu em **BLOQUEIO** justamente por esta divergência:

```
BLOQUEIO   C3 · regras do Firestore (arquivo × publicado)
    ruleset no ar: 4eabe733-d343-4f61-8378-0e20e07f29ef (2026-08-05T20:50:38Z)
    ATRÁS — o publicado NÃO é o arquivo.
        local    167691 bytes  sha256[0:16] 935ba2626d1c6819
        no ar    165932 bytes  sha256[0:16] 23b3a92b0e06ef7d
    linhas só no ARQUIVO (34) — o deploy as PUBLICARIA
    linhas só NO AR (3) — o deploy as REMOVERIA:
        //   isPlatformAdmin()  — role == 'platform_admin' no custom claim
        /** platform_admin: acesso cross-tenant (leitura macro + configuração) */
        return isSignedIn() && request.auth.token.role == 'platform_admin';
```

As 3 linhas removidas são **o comentário antigo e a perna única** — exatamente o que a versão de
duas pernas substitui. A mudança é **aditiva em autorização**: `isPlatformAdmin()` ganha um `||`,
nenhuma outra regra do arquivo é tocada (o `git diff 846ce8ee..HEAD -- firestore.rules` é de 1
arquivo, 34 inserções e 3 remoções, todas dentro dessa função e do comentário dela).

```
> npx firebase-tools@13 deploy --only firestore:rules --project prod --config firebase.prod.json --non-interactive
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
RULES_DEPLOY_EXIT=0                              (17:40:40 -> 17:41:10 -0300)
```

| | ruleset | updateTime |
|---|---|---|
| antes | `4eabe733-d343-4f61-8378-0e20e07f29ef` | 2026-08-05T20:50:38Z |
| **depois** | **`8c056b22-ff25-496e-9bc3-fbb2c271505e`** | **2026-08-06T20:41:07Z** |

Reconferido pela mesma C3 depois do deploy — **virou OK**:

```
OK ......  C3 · regras do Firestore (arquivo × publicado)
    ruleset no ar: 8c056b22-ff25-496e-9bc3-fbb2c271505e (2026-08-06T20:41:07Z)
    firestore.rules e o publicado são IDÊNTICOS (sha256[0:16] 935ba2626d1c6819, 167691 bytes)
```

**Storage NÃO foi tocado** (segue `34131880-…` de 05/08, idêntico ao arquivo) e **índices não
entraram nesta lane** — `--only firestore:rules` recorta só as rules.

---

## Passo 5 — functions — **SOBEM** (12 de 97), com prova

### 5.1 A pergunta do brief, respondida

O brief manda subir functions só se algo fora de `functions/src/limpeza/` e `__tests__/` mudou, e
aponta `178683df` como candidato. **Mudou, e `178683df` é mesmo o commit.**

```
> git diff --stat 846ce8ee..HEAD -- functions/src \
      ':(exclude)functions/src/limpeza/**' ':(exclude)functions/src/__tests__/**'
 functions/src/affiliation/provisionAfiliado.ts     |  27 +-
 functions/src/assessorias/provisionAssessoria.ts   |  24 +-
 functions/src/auth/confirmarCodigoDeAcesso.ts      |  12 +-
 functions/src/auth/linkDeAcao.ts                   |  71 +++++
 functions/src/auth/solicitarCodigoDeAcesso.ts      |   5 +-
 functions/src/auth/solicitarRedefinicaoSenha.ts    | 120 ++++++--
 functions/src/email/incidenteEmail.ts              |  10 +-
 functions/src/index.ts                             |   5 +
 functions/src/platform/setPlatformAdminCapability.ts | 317 +++++++++++++++++
 9 files changed, 548 insertions(+), 43 deletions(-)
```

O `index.ts` mudou por **um único export novo** — a função que o brief chama de "nomear próximo admin":

```diff
+// Plataforma — capacidade de administração que COEXISTE com o papel operacional
+// (lane PAPEL-DUPLO). Autoridade de concessão = papel LEGADO platform_admin;
+// a capacidade não concede a si mesma.
+export { setPlatformAdminCapability } from './platform/setPlatformAdminCapability';
```

`limpeza/` mudou muito (`planoLimpeza.ts` +838, `execucaoLimpeza.ts` +198) e **fica de fora por
construção**: não é exportada no `index.ts`, roda por script local (`functions/scripts/limpeza-prod-leela-hub.ts`).

### 5.2 Conjunto a deployar — 12, não 97

O artefato é um bundle CJS único, então o recorte é por contrato de comportamento, como ontem.
Duas regras evitam super-aproximação:

1. **Aresta = import de runtime.** `import type` some no `tsc` e não propaga.
2. **Barril transparente.** `packages/core/src/index.ts` mudou (+31), mas **só ganhou re-exports
   novos** (o `politicaDeSenha`). Contar o barril como alterado marcaria **92 de 97** funções sem
   que o comportamento de nenhuma tenha mudado. Import de `@leela/core` resolve **símbolo a
   símbolo** até o módulo que define o símbolo; a aresta só conta se **esse** módulo mudou.
   (Mesmo critério que ontem usou para deixar os parsers pt-BR de fora.)

```
BASELINE: 846ce8ee
ALTERADOS (comportamento): 15
EXPORTS no index.ts: 97
A DEPLOYAR: 12   |   FORA: 85
```

| # | Função | Razão (arquivo alterado alcançado por aresta de runtime) |
|---|---|---|
| 1 | **setPlatformAdminCapability** | NOVA — `platform/setPlatformAdminCapability.ts` |
| 2 | solicitarRedefinicaoSenha | `auth/solicitarRedefinicaoSenha.ts` (direto, +120) |
| 3 | solicitarCodigoDeAcesso | `auth/solicitarCodigoDeAcesso.ts` (direto) |
| 4 | confirmarCodigoDeAcesso | `auth/confirmarCodigoDeAcesso.ts` (direto) |
| 5 | concluirAcessoComProva | `auth/confirmarCodigoDeAcesso.ts` (mesmo módulo) |
| 6 | pagamentoWebhook | → `email/incidenteEmail.ts` |
| 7 | asaasWebhook | → `email/incidenteEmail.ts` |
| 8 | confirmarPagamentoSandbox | → `email/incidenteEmail.ts` |
| 9 | reenviarEmailsDoPedido | → `email/incidenteEmail.ts` |
| 10 | varrerIngressosOrfaos | → `email/incidenteEmail.ts` |
| 11 | provisionAssessoriaAccount | `assessorias/provisionAssessoria.ts` (regra de senha no servidor) |
| 12 | provisionAfiliadoAccount | `affiliation/provisionAfiliado.ts` (regra de senha no servidor) |

### 5.3 Falsificação do fecho — as duas pernas do crachá não podem ficar de fora

O risco real desta lane é a UI e as Rules aceitarem a capacidade `platformAdmin` e as **functions**
não. Varredura direta pelo símbolo, não pelo grafo:

```
> grep -rlE "isPlatformAdmin|platformAdmin" functions/src --include=*.ts   (sem __tests__, sem limpeza)
functions/src/auth/confirmarCodigoDeAcesso.ts        <- NA LISTA (#4)
functions/src/platform/setPlatformAdminCapability.ts <- NA LISTA (#1)
functions/src/cliente/meusClubes.ts                  <- FALSO POSITIVO, ver abaixo
functions/src/seed/{convitesOrganizador,equipe,platformAdmin}.seed.ts  <- seeds, não são functions
```

- `meusClubes.ts`: a ocorrência é **comentário** (linha 8, `// … allow read: if isPlatformAdmin() ||`).
  De `@leela/core` ele importa **só** `COLECAO_AFILIADOS`, que vive em módulo não alterado. E o
  arquivo **não mudou** desde a baseline. Fica fora com razão.
- seeds: `functions/src/index.ts` **não exporta nada de `./seed/`** — não são funções deployadas.

Os outros dois símbolos alterados do `core` conferidos do mesmo jeito:
`politicaDeSenha` → só `assessorias/provisionAssessoria.ts` (#11) · `contaParticipante` → só
`auth/confirmarCodigoDeAcesso.ts` (#4). Ambos na lista.

### 5.4 Resultado ✅ 12/12 (17:42:08 → 17:45:03)

Gates de build rodaram como **predeploy**, e passaram:

```
Running command: npm --prefix functions run build     -> tsc, exit 0
Running command: node functions/scripts/bundle-deploy.mjs
[bundle-deploy] OK -> C:\dev\LEELA\functions-deploy
+  functions: Finished running predeploy script.
```

```
> npx firebase-tools@13 deploy --only functions:<as 12> --project prod --config firebase.prod.json --non-interactive
+  Deploy complete!
FUNCTIONS_DEPLOY_EXIT=0
```

Contagem das operações no log do CLI — **12, exatamente o conjunto calculado**:

```
1 creating  setPlatformAdminCapability(us-central1)      -> Successful create operation.
11 updating  asaasWebhook · concluirAcessoComProva · confirmarCodigoDeAcesso ·
             confirmarPagamentoSandbox · pagamentoWebhook · provisionAfiliadoAccount ·
             provisionAssessoriaAccount · reenviarEmailsDoPedido · solicitarCodigoDeAcesso ·
             solicitarRedefinicaoSenha · varrerIngressosOrfaos
             -> 11× Successful update operation.
```

**Zero retry, zero falha isolada.** Runtime Node.js 20 (1ª geração), `us-central1` — a receita de
ontem. Único aviso, o mesmo de ontem e já na lista do dono: `Unhandled error cleaning up build
images` (custo, não correção).

### Desvio D-3 — 403 transitório na callable recém-criada (não é defeito)

Sondada 12s depois do `Successful create`, `setPlatformAdminCapability` devolveu **403** — a
associação de IAM do invoker ainda não havia propagado. Três sondagens depois já respondia
**401 com a mensagem do próprio código** (`"Requer autenticação."`), o que prova as duas coisas que
importam: a função **é invocável** (o IAM propagou) e **falha fechada** sem sessão. Registrado
porque um 403 lido cedo demais seria confundido com "o painel não consegue chamar".

---

## Passo 6 — smokes (todos somente leitura, sem navegador)

### Smoke 1 · painel responde 200 e serve o chunk NOVO ✅

```
GET https://leela-hub.web.app/            http=200  bytes=475
  -> /assets/index-hg4CK5Fu.js    http=200  type=text/javascript  bytes=2249843
  -> /assets/index-DufB2CDQ.css   http=200  bytes=109899
```

### Smoke 2 · as marcas do pacote DENTRO do bundle servido em produção ✅

Não é o build local: os arquivos abaixo foram baixados de `leela-hub.web.app`.

```
-- BUILD-SCROLL-PADRAO (o defeito do dono) --
  'overflow-y-auto overflow-x-hidden' (SCROLL_Y_ONLY do DS) : 1
  '.overflow-x-hidden' no CSS servido                       : 1
-- PAPEL-DUPLO (AlternadorDePainel) --
  'Ir para o Painel Master'                                 : 1
  'Painel do Organizador'                                   : 1
-- FRONTEIRA-AUTH (InputSenha do DS) --
  'Mostrar a senha'                                         : 1
  'Ocultar a senha'                                         : 1
-- controle (o grep sabe devolver zero) --
  'xyzzy-nao-existe'                                        : 0
```

A primeira linha é **a prova do que o dono cobrou**: o contêiner de rolagem da página agora declara
os dois eixos (`overflow-y-auto overflow-x-hidden`), e é isso que fecha o eixo x que fabricava a
segunda barra. O controle devolvendo 0 mostra que a contagem distingue presente de ausente.

### Smoke 3 · landing responde 200 e serve o chunk NOVO ✅

```
GET https://leela-landing.web.app/        http=200  bytes=49568  t=7.90s  (cold start do SSR novo)
  main-app-24c4fa540a35e5d0 referenciado no HTML servido: 1
GET /teste-taxa-repassada                 http=200  t=1.87s
```

### Smoke 4 · as callables existem e falham fechadas ✅

```
solicitarCodigoDeAcesso     {"error":{"message":"Informe um e-mail válido para receber o código.","status":"INVALID_ARGUMENT"}}  http=400
confirmarCodigoDeAcesso     {"error":{"message":"Informe o e-mail e o código.","status":"INVALID_ARGUMENT"}}                     http=400
concluirAcessoComProva      {"error":{"message":"Informe um e-mail válido.","status":"INVALID_ARGUMENT"}}                        http=400
setPlatformAdminCapability  {"error":{"message":"Requer autenticação.","status":"UNAUTHENTICATED"}}                              http=401
```

As três de ontem seguem **públicas por desenho** e genéricas (propriedade de não-oráculo, D-3 de
ontem): não revelam se o endereço tem conta. A nova é **administrativa** e recusa sem sessão — o
contrário seria o defeito.

Controles, porque "existe" só vale se a sonda souber achar o que não existe:

```
[controle] naoExisteEssaFuncao0806  http=404   (a sonda distingue inexistente)
[controle] asaasWebhook GET         http=405   (existe, método errado)
```

### Smoke 5 · RN-419 · `ingressoPorLink` com token inválido ✅

```
{"ok":false}   http=404
```

Recusa genérica mantida — não distingue token malformado de ingresso inexistente.

---

## Fechamento

### Placar

| Passo | Estado | Prova |
|---|---|---|
| 0. Pré-condições | ✅ | só a sobra tolerada em área buildável; nenhuma suíte rodada |
| 1. `tsup` core + DS | ✅ | exit 0 nos dois, antes do build do painel |
| 2. Painel | ✅ **no ar** | `index-BK64g7OJ` → **`index-hg4CK5Fu`**, servido byte-idêntico ao build |
| 3. Landing | ✅ **no ar** | `main-app-55f88c44…` → **`main-app-24c4fa54…`** (+7 chunks trocados) |
| 4. Firestore rules | ✅ **no ar** | ruleset **`8c056b22-ff25-496e-9bc3-fbb2c271505e`**, byte-idêntico ao arquivo |
| 5. Functions | ✅ **12/12** | 1 create + 11 update, exit 0, zero retry |
| 6. Smokes 1-5 | ✅ **5/5** | zero regressão |

### O defeito do dono, fechado

A double scrollbar foi cobrada 4 vezes. O conserto estava em `main` desde **01:26** e o site servia
o build de 05/08. Agora está no ar, e a prova não é o commit — é a string
`overflow-y-auto overflow-x-hidden` **dentro do bundle baixado de `leela-hub.web.app`**.

### Nada foi violado

Não alterei código nem spec · não rodei `--apply` da limpeza · não mexi em Password policy (é do
dono) · não toquei as sobras de outras lanes (lint plugin, TRIAGEM, handoff staged de outra lane) ·
não deployei índices nem storage · não escrevi nada em produção (todos os smokes são leitura) ·
não rotacionei segredo · não deployei função fora da lista justificada.

O único arquivo tocado fora deste handoff foi `apps/landing/package.json`, e quem o tocou e desfez
foi o próprio script de deploy. Os dois scripts efêmeros do fecho de dependências foram apagados.

### Desvios

1. **D-1 — âncora `9b0ffd3` do brief incorreta**, pela 2ª rodada seguida. Ela é anterior ao deploy
   de functions de ontem (05/08 20:49Z). Baseline real usada: **`846ce8ee`**. Com a âncora do brief
   o recorte teria contado como "novo" o que ontem já subiu.
2. **D-2 — 1ª execução da landing morta pelo teto de 10 min da ferramenta** (SIGTERM), não por erro
   do Firebase. Relançada em background; o caminho de recuperação do próprio script restaurou o
   `package.json`. Nenhum arquivo editado à mão.
3. **D-3 — 403 transitório de IAM** na callable recém-criada, resolvido sozinho em segundos.
4. **Barril transparente no fecho de dependências.** Sem isso o recorte seria 92/97 em vez de 12/97,
   por causa de re-exports novos no `packages/core/src/index.ts` que não mudam comportamento de
   ninguém.

### Para o dono

1. ⚠️ **Password policy no Identity Platform — é configuração manual DELE.**
   Console → Authentication → Settings → Password policy → *Require*: mínimo 8 caracteres +
   caractere numérico + caractere não-alfanumérico. O `InputSenha` e o `politicaDeSenha` já estão
   no ar nos dois apps e nas functions que criam conta; falta o servidor de Auth **cobrar** a mesma
   regra. Enquanto não for feito, a regra é de interface e de function, não da plataforma.
2. 👀 **Conferir a tela de eventos sem a double scrollbar em `https://leela-hub.web.app`** — o
   endereço certo, não o preview congelado. É o build de agora (`index-hg4CK5Fu.js`).
3. ⚠️ **`git push` para `origin/main`** — reincidência: produção segue rodando código que só existe
   nesta máquina. Já era pendência no fechamento de ontem.
4. **Imagens de build não limpas** (`gcr.io/leela-hub/us/gcf`) — aviso repetido do CLI, custo mensal
   pequeno, limpeza de fechamento de sprint.
5. Seguem de ontem, **não tocadas por esta lane**: BREVO-1 (allowlist de IP), expurgo LGPD,
   tarifas do Asaas, matar conta demo.
