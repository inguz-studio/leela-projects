---
trace: leela-deploy-j3-20260816
lane: DEPLOY-J3
employee: sf-release-engineer (software-forge)
repo: C:\dev\LEELA
worktree: C:\dev\leela-deploy-j3-20260816
head_pinado: 409a5748
baseline_no_ar: a1df3b88
data: 2026-08-16
papel: subir o pacote de 5 dias na ordem da lei — rules/indexes, functions, landing, painel
estado: CONCLUIDA — 4 superficies deployadas com prova; hosting aguarda gate visual do maestro
---

# DEPLOY-J3 — handoff vivo

Contrato: `.nirvana/briefs/leela-deploy-j3-20260816-enriched.md`.
Herdado: `leela-deploy-janela2-20260811.md` (comandos reais da janela anterior),
`leela-infra-deploy-20260811.md` (gate de frescor no funil).

⚠️ **Esta lane não declara "no ar".** O veredito máximo que eu emito é
**deployado, prova técnica OK**. O gate visual L-019 é do maestro, depois de mim.

---

## Etapa 0 · Pino, frescor e pré-requisitos ✅

| Item | Medido |
|---|---|
| `main` | `409a574838cc5134e7b6ace2d6651323564920aa` |
| `origin/main` | `409a5748…` — **iguais** |
| árvore principal | `git status --porcelain -uno` = **0 linhas** |
| worktree | `C:\dev\leela-deploy-j3-20260816`, detached em `409a5748`, status limpo |
| CLI | `firebase projects:list` → **1 projeto: `leela-hub` (76126035891)**, conta `inguzbuilders@gmail.com` |

### O pacote sobre o que está no ar (`a1df3b88`)

**239 commits.**

| Área | Arquivos | Peso |
|---|---|---|
| `firestore.rules` | 1 | +33/−1 |
| `firestore.indexes.json` | 1 | **+28** (índice do `varrerPixVencidos` + fieldOverride `lotes.reservas`) |
| `functions/` | 27 | +6845/−14 |
| `apps/` | 182 | +11141/−2012 |
| `packages/` | 125 | +8433/−116 |
| `scripts/` | 4 | +1090/−21 |

### Pré-requisito não versionado, pago

`functions/.env` é gitignored e não vem em worktree novo. Copiado da árvore principal e conferido
por hash nos dois lados: **`4e689cb3261613d6…`** — o mesmo hash das duas janelas anteriores. Nenhum
valor impresso em log, chat ou aqui.

Os demais envs são **rastreados** e vieram no checkout: `/.env.leela-hub` (o `vite.config.ts` do
painel fixa `envDir` na raiz), `apps/landing/.env.leela-hub`, `functions/.env.leela-hub`.

### Install e build

```
pnpm install --frozen-lockfile     exit 0 · 1 min 11,9 s     20:33:09Z → 20:34:21Z
```
Sem `ERR_PNPM_IGNORED_BUILDS` (a R-8 segue morta na fonte).

⛔ **Não rodei `turbo run build` inteiro, de propósito.** O `build` de `apps/painel` é
`vite build` **sem** `--mode leela-hub` (conferido no `package.json`): rodá-lo aqui assaria um
`dist/` de demo — exatamente a armadilha que o contrato marca na etapa 4. Usei a alternativa que o
próprio contrato autoriza (core → design-system → api-client), e cada app builda na sua etapa com o
mode/env certo.

```
turbo run build --filter=@leela/core --filter=@leela/design-system --filter=@leela/api-client
  → 3 successful · exit 0 · 12,53 s   (2 de 3 vindos do cache do turbo)
```

**O cache não passou sem prova.** A lei do pino é julgar `dist/` por hash rebuildado, então forcei:

```
turbo run build … --force   → 3 successful, 0 cached · exit 0 · 15,14 s
```

| `dist/index.mjs` | cache | rebuild forçado |
|---|---|---|
| `@leela/core` | `6f6ac5675de5488cec30…` | `6f6ac5675de5488cec30…` |
| `@leela/design-system` | `f25ca5f76b54911ba6bf…` | `f25ca5f76b54911ba6bf…` |
| `@leela/api-client` | `6f61ef4a26355a630807…` | `6f61ef4a26355a630807…` |

`diff` dos dois conjuntos = **exit 0**. O cache do turbo era honesto, e agora está provado em vez de
presumido.

### Gate de frescor — verde nos dois apps

```
npm --prefix apps/painel  run verify:frescor  → EXIT=0  "3 pacote(s) com dist/ à frente da fonte"
npm --prefix apps/landing run verify:frescor  → EXIT=0  "3 pacote(s) com dist/ à frente da fonte"
```

### Secrets do `varrerPixVencidos`, conferidos ANTES da etapa 2

O cron declara `secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN']` — ele fala com o gateway
antes de flipar os docs, e sem o binding a produção falharia em silêncio.

| Secret | Versão | Estado |
|---|---|---|
| `ASAAS_API_KEY` | 1 | **ENABLED** |
| `ASAAS_WEBHOOK_AUTH_TOKEN` | 1 | **ENABLED** |

Lido por `functions:secrets:get` (metadado), nunca por `:access` — nenhum valor tocado.

---

## Baseline de produção, medido ANTES de qualquer escrita

Tudo por API somente-leitura. Access token de vida curta trocado do refresh token do
`firebase-tools` já logado, receita documentada da casa. Token nunca impresso, nunca gravado,
nunca commitado; a sonda vive fora do repo.

### Rules

```
release cloud.firestore   ruleset bb41805b-8b9c-4e87-8984-c3ea237c25f5
updateTime 2026-08-11T16:36:20Z
sha256 do source servido   04cf11524ad284ff1ed6963025a8764754639139ea070c86c712d38e92f6f38c
```

É byte a byte o que a DEPLOY-JANELA2 subiu. **Ninguém deployou rules entre as duas janelas.**

### Índices

**18 índices, todos `READY`. Zero na coleção `pagamentos`.**

O índice `pagamentos: status ASC + pixExpiraEm ASC` que o `varrerPixVencidos` consulta **não existe
em produção**. É por isso que a ordem do contrato é lei aqui e não estilo: functions antes do índice
READY = primeira execução do cron morrendo em `FAILED_PRECONDITION`.

### Functions e crons

| Medida | ANTES |
|---|---|
| Functions no projeto | **102** (101 `GEN_1` + 1 `GEN_2` = `ssrleelalanding`) |
| `varrerPixVencidos` | **ausente** |
| Jobs no Cloud Scheduler (`us-central1`) | **11**, todos `ENABLED` |
| cron do rollup | `firebase-schedule-agendarRecomputePlatformRollups-us-central1` · `15 * * * *` · `America/Sao_Paulo` · **ENABLED** |
| `southamerica-east1` | 0 jobs |

---

## Etapa 1 · Rules + indexes ✅ DEPLOYADA, pós-check APROVADO

```
npx firebase-tools@13 deploy --only firestore:rules,firestore:indexes \
    --project prod --config firebase.prod.json --non-interactive
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: deployed indexes in firestore.indexes.json successfully for (default) database
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
RULES_IDX_DEPLOY_EXIT=0        20:39:30Z → 20:39:49Z  (19 s)
```

### Conferência que evitou um prompt de exclusão no meio da janela

Antes de mandar, comparei chave a chave o arquivo local contra os 18 índices de produção:

| | resultado |
|---|---|
| em produção e **ausentes** do arquivo (disparariam prompt de exclusão) | **0** |
| no arquivo e ausentes de produção (seriam criados) | **1** — `pagamentos: status ASC, pixExpiraEm ASC` |
| `fieldOverrides` órfãos | **0** (8 batem; `lotes.reservas` é o novo) |

Por isso o `--non-interactive` foi seguro: não havia nada a excluir para ele recusar.

### Pós-check 1 · o release novo, lido de volta da API

| | ANTES | DEPOIS |
|---|---|---|
| ruleset | `bb41805b-8b9c-4e87-8984-c3ea237c25f5` | **`9e4b4b03-9d4b-41de-b3ff-0dba6ec4a8b0`** |
| updateTime | 2026-08-11T16:36:20Z | **2026-08-16T20:39:48Z** |
| sha256 do source servido | `04cf1152…` | **`d59b63acad280a1d023307f1212830d89aee3d219e4eca6175bba0ce9da9e5c7`** |

**E a prova que fecha a cadeia:** o source baixado do release bate byte a byte com o arquivo do pino.

```
firestore.rules do pino   d59b63acad280a1d023307f1212830d89aee3d219e4eca6175bba0ce9da9e5c7
source servido de prod    d59b63acad280a1d023307f1212830d89aee3d219e4eca6175bba0ce9da9e5c7
diff                      exit 0
```

### Pós-check 2 · sondas no source servido de produção

| Sonda | ANTES | DEPOIS |
|---|---|---|
| `reservasZeradoNoCreate` (RN-543) | 0 | **2** |
| `reservasIntocado` (RN-543) | 0 | **2** |
| `RN-543` | 0 | **2** |
| `faceMinimaVendaPagaOk` (controle+ · RN-559, não é desta janela) | 3 | **3** |
| `xyzzy` (controle−) | 0 | **0** |

O delta das Rules é aditivo e inteiro da RN-543: duas funções novas
(`reservasZeradoNoCreate`, `reservasIntocado`), duas cláusulas no create/update do lote e a
proibição de DELETE com reserva viva. O controle positivo estável mostra que a fechadura da
janela anterior não foi tocada.

### Pós-check 3 · índices

O contrato aceitava `CREATING` com follow-up. **Não aceitei**, porque aqui o índice é
pré-requisito do cron da etapa 2: subir as functions com ele em construção faria a primeira
execução do varredor morrer em `FAILED_PRECONDITION`. Esperei.

```
20:39:49Z  índice pagamentos(status, pixExpiraEm) = CREATING
20:44:01Z  índice pagamentos(status, pixExpiraEm) = READY      (180 s)
```

| Medida | ANTES | DEPOIS |
|---|---|---|
| Índices | 18 | **19** |
| Estados | 18 READY | **19 READY, 0 CREATING** |
| `lotes.reservas` (fieldOverride) | ausente | **COLLECTION READY + COLLECTION_GROUP READY** |

**Etapa 1: pós-check APROVADO.**

---

## Etapa 2 · Functions ✅ DEPLOYADAS, pós-check APROVADO

### Predeploy medido antes de comprometer a janela

```
npm --prefix functions run build   (tsc)          exit 0
node functions/scripts/bundle-deploy.mjs          exit 0   ·  271 pacotes externos
                                                  20:40:52Z → 20:41:24Z  (32 s)
```

`functions-deploy/index.js` = **1.401.645 bytes**.

### O que muda de fato: 4 functions NOVAS

Diff dos exports de `functions/src/index.ts` entre o que está no ar e o pino:

```
+ varrerPixVencidos            (cron do prazo do PIX — RN-545)
+ consultarDocumentoDaConta    (admin ondas 2/3/5)
+ liberarAcessoOrganizador     (admin ondas 2/3/5)
+ obterFichaDoCliente          (admin ondas 2/3/5)
```

Nenhum export removido. Alvo = 101 `GEN_1` existentes + 4 novas = **105**.
`ssrleelalanding` fica de fora **por construção**: é `GEN_2` e pertence ao codebase da landing.

### Sondas no bundle que sobe, medidas ANTES do upload

| Sonda | Ocorrências |
|---|---|
| `varrerPixVencidos` | 15 |
| `pix_varredura_rodada` (a linha de log da rodada) | 2 |
| `pixExpiraEm` | 52 |
| `reservas` | 25 |
| `agendarRecomputePlatformRollups` (controle+) | 5 |
| `recomputarSaudeDeTodosOsTenants` (controle+) | 3 |
| `xyzzy` (controle−) | 0 |

Os dois controles positivos batem com o que a DEPLOY-JANELA2 mediu e provam que **identificadores
não são minificados** neste bundle — logo os números acima são presença, e não renome.

### O deploy, em grupos — e o SIGTERM que a lane comeu

| Grupo | Alvos | Janela | Resultado |
|---|---|---|---|
| 1 | 35 | 20:51:37Z → 20:55:00Z (3 min 23 s) | exit 0 · `Deploy complete!` |
| 2 | 35 | 20:55:13Z → 20:57:46Z (2 min 33 s) | **33 update + 2 create** · exit 0 |
| 3 | 35 | 20:57:55Z → **21:07:55Z** | ⛔ **SIGTERM no teto de 10 min (exit 143)** |
| 3b | 1 (`publicarEvento`) | 21:08:32Z → 21:10:23Z (1 min 51 s) | exit 0 |

⛔ **O grupo 3 estourou o teto e foi morto.** Não presumi nada sobre o que ficou em voo: fui à
API e medi `updateTime` de cada um dos 35 alvos contra o instante de início do grupo.

```
grupo 3 · atualizados depois do corte 20:57:55Z ... 34
grupo 3 · pendentes ......................... 1   publicarEvento @2026-08-11T16:45:18Z
estado de TODAS as 106 ....................... ACTIVE
```

O SIGTERM pegou o fim da fila, não o meio, e não deixou nenhuma function quebrada. `publicarEvento`
foi deployada sozinha em seguida (3b).

⚠️ **Lição para a próxima lane:** com 105 alvos, 35 por grupo **não cabe** em 10 min — o predeploy
(32 s) roda de novo a cada grupo e o grupo 3 gastou o resto. Use **4 grupos de ~26**, ou
aceite o custo e meça por `updateTime` como fiz aqui.

⚠️ **Erro meu, registrado para ninguém repetir:** mandei a saída do grupo 3 para arquivo por
`grep … > g3.log`. O `grep` **bufferiza** quando a saída não é terminal, então o SIGTERM deixou o
log com **0 bytes** e a janela sem rastro do progresso. Quem for dividir deploy precisa de
`--line-buffered` (ou `tee`), senão o log só existe se o comando terminar bem — que é exatamente
quando ele não é necessário.

### Convergência — a prova de que não sobrou nada em voo

```
npx firebase-tools@13 deploy --only functions --project prod --config firebase.prod.json
Skipped (No changes detected) = 105      updating = 0
creating = 0                             deleting = 0
+  Deploy complete!
CONV_EXIT=0        21:10:30Z → 21:11:14Z  (44 s)
```

Conferi que "deleting = 0" é real e não leitura de `grep` ingênua: as duas linhas com a palavra
`delete` são o **nome** da function `deleteClube` e o ruído de limpeza de imagem. Nenhuma linha de
exclusão de function.

### Inventário — antes × depois

| Medida | ANTES | DEPOIS |
|---|---|---|
| Functions no projeto | **102** | **106** |
| Criadas | — | **4** (as 4 novas dos exports) |
| Removidas | — | **nenhuma** |
| Estado | — | **106/106 `ACTIVE`** |

### Crons

| Medida | ANTES | DEPOIS |
|---|---|---|
| Jobs no Cloud Scheduler (`us-central1`) | 11 | **12** |
| `varrerPixVencidos` | ausente | **`3-58/5 * * * *` · `America/Sao_Paulo` · `ENABLED`** |
| `agendarRecomputePlatformRollups` (rollup) | `15 * * * *` · SP · ENABLED | **idêntico, intacto** |
| jobs em estado diferente de `ENABLED` | 0 | **0** |

⚠️ Ruído conhecido e não-bloqueante, idêntico ao das janelas anteriores:
`Unhandled error cleaning up build images` (404 de `artifactregistry`/`us.gcr.io`) ao fim de cada
grupo. É limpeza de imagem, não falha de update — e a convergência prova.

### 🔎 A razão REAL de `publicarEvento` ter ficado para trás — não foi o SIGTERM

Varri o log de **todas** as functions desde 20:51:00Z com `severity>=WARNING`. Resultado:
**exatamente uma entrada**, e ela explica o pendente:

```
2026-08-16T20:59:44.823057Z  ERROR  cloudaudit.googleapis.com/activity
  methodName   google.cloud.functions.v1.CloudFunctionsService.UpdateFunction
  resourceName projects/leela-hub/locations/us-central1/functions/publicarEvento
  status.code  13
  status.message "Unable to retrieve the repository metadata for
                  projects/leela-hub/locations/us-central1/repositories/gcf-artifacts."
```

É **log de auditoria, não de runtime**, e é o mesmo `gcf-artifacts` do ruído de limpeza de imagem
— só que desta vez ele derrubou a operação de update em vez de só sujar a saída. Ou seja: a
`UpdateFunction` de `publicarEvento` **falhou às 20:59:44Z**, oito minutos antes do meu SIGTERM.
Corrigi a leitura que eu tinha escrito acima: o SIGTERM não deixou nada em voo; o que havia era
**uma falha real, já terminada**, e o retry da etapa 3b a pagou.

**Zero entradas `>=WARNING` de runtime em todas as 106 functions** desde o início do deploy.

| Padrão crítico procurado no log | Ocorrências |
|---|---|
| `FAILED_PRECONDITION` | **0** |
| `requires an index` | **0** |
| `PERMISSION_DENIED` | **0** |
| `Secret` | **0** |
| `ENOENT` / `not found` | **0** |

O zero de `requires an index` é o que prova, do lado do runtime, que a decisão de esperar o índice
ficar `READY` antes da etapa 2 estava certa.

### Pós-check da etapa 2 · **duas execuções reais do varredor, lidas do log**

O contrato exige **uma**. Li **duas**, porque duas provam também a cadência:

| Execução | Início | Duração | Status | `severity>=ERROR` |
|---|---|---|---|---|
| `00gvx9bb9r1u` | **2026-08-16T21:13:03Z** | 1.897 ms | **`ok`** | 0 |
| `00gvtnll9hjj` | **2026-08-16T21:18:13Z** | 1.873 ms | **`ok`** | 0 |

**5 minutos exatos entre as duas** — a expressão `3-58/5` não é só o que o Scheduler declara, é o
que o relógio mostrou.

### ⚠️ A ausência da linha `pix_varredura_rodada` é o comportamento CORRETO, e eu conferi na fonte

Nenhuma das duas execuções emitiu `pix_varredura_rodada`. Antes de chamar isso de sucesso, fui ao
código (`functions/src/checkout/varrerPixVencidos.ts`, `fecharRodada`):

```ts
const houveOQueContar =
  resultado.encontrados > 0 || (resultado.recontagem?.corrigidos ?? 0) > 0;
if (!houveOQueContar) return;
```

A linha só sai quando a rodada achou PIX vencido **ou** corrigiu contador. O comentário do próprio
arquivo diz o desenho em voz alta: *"varredura parada aparece na AUSÊNCIA das linhas de rodada"*.
Rodada vazia é silenciosa **por construção**, e produção hoje não tem PIX vencido nem drift.

O que sustenta o veredito, então, não é a linha que não veio — é o conjunto:
`status: 'ok'`, ~1,9 s de duração (compatível com consulta real, não com atalho), **zero**
`severity>=WARNING` no projeto inteiro e **zero** `requires an index`. Se o índice não estivesse
`READY`, a consulta teria estourado `FAILED_PRECONDITION` e o caminho de erro
(`logger.error('reserva_recontagem_falhou')`) teria escrito.

**Etapa 2: pós-check APROVADO.**

---

## Etapa 3 · Landing ✅ DEPLOYADA, pós-check APROVADO

### `@leela/api-client` fresco no pino — a lição do B1 da ponte, paga

Símbolos NOVOS conferidos **dentro do dist**, não na fonte:

| Símbolo novo | `dist/index.mjs` | `dist/index.js` |
|---|---|---|
| `observarPedido` | 2 | 3 |
| `listarProfissionaisPaginado` | 2 | 3 |
| `listarAtletasPaginado` | 2 | 3 |
| `consultarDocumentoDaConta` | 3 | 4 |
| `obterFichaDoCliente` | 3 | 4 |
| `liberarAcessoOrganizador` | 3 | 4 |
| `DIRETORIO_CONTAS_PAGE_SIZE` | 6 | 8 |
| `xyzzy0816` (controle−) | **0** | **0** |

### O deploy

```
node apps/landing/scripts/deploy-leela-hub.mjs
[deploy-landing] env carregada de .env.leela-hub: 9 chaves
[frescor] @leela/landing: 3 pacote(s) com dist/ à frente da fonte        ← gate 1, no funil
+  hosting: Finished running predeploy script.                            ← gate 2, segunda rede
i  hosting[leela-landing]: found 101 files · uploading new files [25]
+  functions[…ssrleelalanding(us-central1)] updating Node.js 22 (2nd Gen)
+  Deploy complete!    ·    Hosting URL: https://leela-landing.web.app
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0      21:16:48Z → 21:25:37Z  (8 min 49 s)
```

O `next build` local com a env de produção **antes** do deploy (método herdado da DEPLOY-JANELA2)
segurou o comando em 8 min 49 s. Rodei em **background por decisão consciente**, e não por
conveniência: o teto de 10 min do meu foreground já tinha matado o grupo 3 das functions nesta
mesma janela, e matar um deploy de hosting no meio é pior que matar um de functions.

`package.json` restaurado pelo `finally`; `package.json.deploybak` **ausente** na árvore, conferido.
`git status --porcelain -uno` do worktree = **0 linhas**.

### ⚠️ Antes das sondas: a régua estava errada, e eu consertei a régua

Duas falhas na **minha** sonda, ambas encontradas por auditar a sonda contra o baseline em vez de
confiar nela. Registro porque as duas são reutilizáveis:

1. **O bundler escapa acento.** `Físico` viaja no chunk como `F\xedsico`. Uma sonda que procure só
   a forma literal lê **ausência onde há presença** — e teria me feito parar a janela por nada.
   A régua agora conta as **três** formas: literal, `\xNN` e `\uNNNN`.
2. **O regex de referências truncava o caminho do chunk da própria rota.** O grupo de rota do App
   Router vive em `chunks/app/(public)/…`; uma classe negada que exclua `)` para em
   `chunks/app/(public` e a sonda baixa **error/not-found e mais nada**. Com a lista branca
   explícita, os arquivos baixados por rodada foram de **91 para 102**.

Só depois disso o baseline foi remedido, e é ele que está na tabela abaixo.

### Pós-check · sondas DO AR (HTML + **todos** os chunks das 4 rotas)

| Sonda | ANTES | DEPOIS | Veredito |
|---|---|---|---|
| home nova · "Físico, mental, espiritual…" | 0 | **2** | ✅ apareceu |
| `"Serviço"` (SERV-3) | 0 | **12** | ✅ apareceu |
| **AUSÊNCIA** de "taxa de serviço" | **7** | **0** | ✅ sumiu |
| "a partir de R$ 10,00" viva na página pública | 2 | **2** | ✅ segue viva |
| **AUSÊNCIA** de "Pronto para largar?" | 0 | 0 | ⚠️ **sonda cega — ver abaixo** |
| controle+ · "Modalidade e kit" | 2 | 2 | ✅ estável |
| controle− · `xyzzy0816` | 0 | 0 | ✅ |

### ⚠️ A sonda de "Pronto para largar?" não prova nada, e eu não vou fingir que prova

Ela lê **0 antes e 0 depois**. Zero não é prova de remoção quando já era zero. Falsifiquei em vez
de aceitar: sondei junto a copy que **substituiu** a frase no pino
(`'Bora garantir sua vaga?'`) e o ramo que **não** mudou (`'Fique de olho na próxima edição'`).

| | ANTES | DEPOIS |
|---|---|---|
| `Pronto para largar` | 0 | 0 |
| `Bora garantir sua vaga` (a nova) | 0 | **0** |
| `Fique de olho na` (ramo inalterado) | 0 | **0** |

As três dão zero nos dois lados: o `CheckoutCtaSection` **não entra no bundle destas rotas** —
ele é servido por evento com seções, e o único evento público de produção (`teste-taxa-repassada`)
não renderiza essa dobra. A sonda é cega para esse componente, nas duas pontas.

O que **está** provado, por outro caminho: a frase existe no que está no ar
(`git grep` em `a1df3b88` → `CheckoutCtaSection.tsx`) e **não existe** no pino
(`git grep` em `409a5748` → nada). A remoção é real na origem; o que falta é uma superfície de
produção que a renderize. **Fica para o gate visual do maestro**, numa página de evento com a
seção `checkout` ligada.

### Pós-check · o chunk de cada rota trocou

| Rota | ANTES | DEPOIS |
|---|---|---|
| `/` | `page-3da0d825c42f83ad.js` | **`page-f66996a1bb28c88e.js`** |
| `/[eventSlug]` | `page-78159775cabed360.js` | **`page-c943f44c94bcdb28.js`** |
| `/[eventSlug]/inscricao` | `page-3d28b4b1045b21ec.js` | **`page-3f7791fa1a9ee681.js`** |
| `/minha-conta` | `page-98c816ae7a663dd0.js` | **`page-3b6fe077a53c79e8.js`** |
| layout `(public)` | `layout-b0e6a7a21db53579.js` | **`layout-a125171fa00fb6f1.js`** |

O ANTES de `/[eventSlug]/inscricao` (`page-3d28b4b1045b21ec.js`) é **exatamente** o que a
DEPLOY-JANELA2 deixou no ar em 11/08 — prova independente de que produção estava mesmo em
`a1df3b88` e de que ninguém deployou a landing entre as duas janelas.

### Pós-check · o servido é byte a byte o construído

| Chunk | sha256 (ar == local) | bytes |
|---|---|---|
| `page-f66996a1bb28c88e.js` | `182c020324a4c2b6…` **IDÊNTICO** | 846 |
| `layout-a125171fa00fb6f1.js` | `2f97f0802e324b2f…` **IDÊNTICO** | 3.108 |
| `page-c943f44c94bcdb28.js` | `6548e4d156003514…` **IDÊNTICO** | 14.554 |
| `page-3f7791fa1a9ee681.js` | `d6ae53e78afa5bf0…` **IDÊNTICO** | 105.541 |
| `page-3b6fe077a53c79e8.js` | `de8666165e0360ca…` **IDÊNTICO** | 29.773 |

A construção do Firebase reproduziu byte a byte a minha, nos cinco.

### Pós-check · smokes, com o controle que impede falso positivo

| Alvo | http | tipo | bytes |
|---|---|---|---|
| `/` | 200 | text/html | 27.203 |
| `/teste-taxa-repassada` | 200 | text/html | 43.031 |
| `/teste-taxa-repassada/inscricao` | 200 | text/html | 38.522 |
| `/health` | 200 | application/json | 15 |
| controle · `/_next/static/chunks/xyzzy0816.js` | **404** | text/html | — |

⚠️ Ruído conhecido, idêntico a 05/08, 06/08, 08/08 e 11/08: `Failed to find esbuild with npx which`
/ `Failed to install esbuild`. O build seguiu.

⛔ Desvio de config previsto pelo contrato e repetido pela mesma razão física: a landing usa
`firebase.landing.json`, porque `firebase.prod.json` declara `site=leela-hub` → `apps/painel/dist`
e não conhece o site `leela-landing`.

**Etapa 3: pós-check APROVADO. Estado: deployada, prova técnica OK, aguardando gate visual do maestro.**

---

## Etapa 4 · Painel ✅ DEPLOYADO, pós-check APROVADO

### Build do pino com o `--mode` que o contrato marca em vermelho

```
npx vite build --mode leela-hub    (apps/painel)   exit 0 · ✓ built in 18.94s
                                                   21:15:53Z → 21:16:14Z
```

Artefatos: `index-CRoaNsxO.js` 2.346,40 kB (gzip 624,83) · `index-BWL8ZyXs.css` 144.249 B ·
`browser-BXdiCFWD.js` 24,53 kB (nome inalterado desde 11/08).

O gate de frescor do painel rodou como `predeploy` de `firebase.prod.json` (`EXIT=0`), e aqui ele
**morde de verdade** — este alvo é `public` estático, não `source`.

### R-7 conferida no artefato, ANTES de subir

| Sonda no JS construído | Ocorrências |
|---|---|
| `VITE_FIREBASE_PROJECT_ID:"leela-hub"` | **1** |
| `leela-hub.firebaseapp.com` | 1 |
| `leela-hub.firebasestorage.app` | 1 |
| `76126035891` | 2 |
| `localhost:8080` / `127.0.0.1:8080` | **0 / 0** |
| `demo-leela` | 4 (a constante `DEMO_CONFIG` do guarda fail-closed, não a config ativa) |

Mesmo padrão das duas janelas anteriores. R-7 satisfeita por medição, não por intenção.

### Deploy

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json
Running command: npm --prefix apps/painel run verify:frescor    → EXIT=0
i  hosting[leela-hub]: found 15 files in apps/painel/dist  ·  uploading new files [3]
+  hosting[leela-hub]: version finalized · release complete · Deploy complete!
PAINEL_DEPLOY_EXIT=0       21:28:15Z → 21:28:33Z  (18 s)
```

### Pós-check 1 · bundle trocado e byte a byte idêntico

| asset | ANTES | DEPOIS | sha256 servido == local |
|---|---|---|---|
| JS | `index-qMVaoZwP.js` | **`index-CRoaNsxO.js`** | `c1c1d94e14b88e2093c848f2…` **IDÊNTICO** |
| CSS | `index-KrtxKSJE.css` | **`index-BWL8ZyXs.css`** | `41aa76f13d35341afb5ec071…` **IDÊNTICO** |
| browser | `browser-BXdiCFWD.js` | `browser-BXdiCFWD.js` | `7e89b6da537b2218d27aa5c1…` **IDÊNTICO** |

O ANTES bate com o que a DEPLOY-JANELA2 deixou: ninguém mexeu no painel entre as duas janelas.

### ⚠️ O painel é MINIFICADO — e isso muda quais sondas valem

Diferente do bundle de functions (onde os controles provaram que identificadores sobrevivem), o
`vite build` do painel minifica: o arquivo começa em `var wce=Object.defineProperty…`. **Nome de
símbolo importado não é régua aqui.** Conferi como cada sonda sobrevive antes de contar:

- `obterFichaDoCliente` sobrevive como **string** — `He(e,"obterFichaDoCliente")`, o nome do callable;
- `AreaSubNav` sobrevive como **string** — `Di.displayName="AreaSubNav"`;
- `listarProfissionaisPaginado` **não** sobrevive: é identificador importado e foi renomeado.

Por isso o **0** de `listarProfissionaisPaginado` e de `DIRETORIO_CONTAS_PAGE_SIZE` no bundle é
**artefato de minificação, não ausência** — e a fonte prova o uso
(`src/routes/plataforma/contas/_data/contas.ts:66`). A tabela abaixo só usa sondas de **string
literal**, que atravessam o minificador.

| Sonda (string literal) | ANTES | DEPOIS |
|---|---|---|
| `/plataforma/contas` (diretório — ondas 2/3/5) | 0 | **2** |
| `"obterFichaDoCliente"` (callable) | 0 | **1** |
| `"liberarAcessoOrganizador"` (callable) | 0 | **1** |
| `"consultarDocumentoDaConta"` (callable) | 0 | **1** |
| `"AreaSubNav"` (navegação nova) | 0 | **1** |
| `Serviço` (SERV-3) | 0 | **37** |
| `Gerenciamento` (aba unificada de kits) | 0 | **3** |
| `reservas` (RN-543) | 0 | **3** |
| controle+ `/plataforma/eventos` | 2 | 2 |
| controle+ `/plataforma/clubs` | 2 | 2 |
| controle+ `--rail-width` | 13 | 13 |
| controle+ `--card-blur` | 12 | 12 |
| controle+ `--chart-accent` | 9 | 9 |
| controle− `xyzzy0816` | 0 | 0 |

Todas as contagens do **ar** batem, uma a uma, com as do **build local** — medi os dois lados.

### Pós-check 2 · o bundle antigo saiu do release

| Alvo | http | tipo | bytes |
|---|---|---|---|
| `/assets/index-CRoaNsxO.js` (novo) | 200 | **text/javascript** | **2.351.260** |
| `/assets/index-qMVaoZwP.js` (antigo) | 200 | text/html | **475** |
| `/assets/index-KrtxKSJE.css` (antigo) | 200 | text/html | **475** |
| controle · `/assets/xyzzy0816.js` (nunca existiu) | 200 | text/html | **475** |

Os dois antigos respondem **byte a byte igual** a um arquivo que nunca existiu: é o rewrite SPA, e
não bundle velho ainda servindo.

### Pós-check 3 · HOSTING-CACHE de pé

```
/                          Cache-Control: no-cache                              200 · 475B
/plataforma/eventos        Cache-Control: no-cache                              200 · 475B
/plataforma/contas         Cache-Control: no-cache                              200 · 475B
/assets/index-CRoaNsxO.js  Cache-Control: public, max-age=31536000, immutable    200
```

O header que fechou o incidente da tela-preta de 10/08 continua na release nova.

⚠️ `--chart-accent` segue com **três** declarações no CSS servido (2× `var(--primary-500)`,
1× `var(--accent-400)`). **Não toquei** — não é matéria desta lane.

**Etapa 4: pós-check APROVADO. Estado: deployado, prova técnica OK, aguardando gate visual do maestro.**

---

## Etapa 5 · Fechamento

### Emuladores e portas

| Item | Medido |
|---|---|
| `java.exe` em `tasklist` | **0** — nenhum emulador vivo |
| 8080 · 8180 · 9099 · 4000 · 5001 · 9199 · 4599 | **livres** |
| `:4601` | **LISTENING**, PID 19476 |
| `:4602` (mock) | ⚠️ **NÃO está de pé** — ver abaixo |

⚠️ **O `:4602` do mock já estava fora quando cheguei.** O contrato manda que ele *fique* de pé;
registro que **não o derrubei** (nunca o toquei) e que **nada de produção depende dele**, como o
próprio contrato diz. Subir de volta não é ato desta lane — fica como item para o maestro.

### ⚠️ O `:4601` do dono serve um bundle que NÃO é o de produção

Herdei do handoff da JANELA2 a nota de que o `:4601` apontava para o worktree
`leela-deploy-j2-20260811`. **Não aponta mais.** Medi a linha de comando do processo:

```
node …\apps\painel\node_modules\.bin\..\vite\bin\vite.js preview --port 4601 --strictPort
raiz servida: C:\dev\LEELA\apps\painel     ← a ÁRVORE PRINCIPAL, não um worktree de deploy
```

E o que ele entrega **não é o que está no ar**:

| | bundle | sha256 | data do build |
|---|---|---|---|
| `:4601` | `index-BzPL_vvo.js` | `7223a22364325f8e06fec21c…` | **12/08 12:44** |
| produção | `index-CRoaNsxO.js` | `c1c1d94e14b88e2093c848f2…` | 16/08 21:16Z |

São **bundles diferentes**, com quatro dias de distância. Quem validar o painel pelo `:4601` hoje
estará olhando para o build local de 12/08, e não para a release de produção.

**Não mexi**, de propósito: o processo é do dono, pode estar em uso, e re-apontá-lo não é passo do
meu contrato — o contrato só manda conferir. Duas saídas possíveis, ambas do maestro: validar
direto em `https://leela-hub.web.app` (é lá que estão os bytes provados), ou re-servir o `:4601`
a partir de `C:\dev\leela-deploy-j3-20260816\apps\painel\dist`, que é o dist do pino.

### Árvore principal intocada

```
HEAD                       409a574838cc5134e7b6ace2d6651323564920aa   (== origin/main)
git status --porcelain -uno sobre packages apps functions scripts
  firestore.rules firestore.indexes.json package.json turbo.json pnpm-workspace.yaml
                           0 linhas
```

Não commitei, não pushei, não usei `stash` nem `amend`, não editei código de produto.

### Worktree do pino

`C:\dev\leela-deploy-j3-20260816` **mantido de propósito**: carrega `node_modules`, os `dist/`, o
`.next` pré-aquecido, `functions-deploy/` e `.firebase/`. Se o gate visual voltar com defeito, a
árvore pronta poupa um ciclo inteiro.

### Boards

`leela-specs/00-boards/V1-KANBAN.md` — três cards atualizados, nenhum deles declarado "no ar":

1. **[E12] A landing para de se contradizer** — de "aplicados, sem deploy" para **deployada com
   prova técnica**, com a ressalva da sonda cega escrita no card.
2. **[E04] Pagamento pendente segura a vaga / PIX vencido expira sozinho** — o `⛔ SEM DEPLOY` caiu:
   Rules, índice e cron no ar, com as duas execuções observadas. Registrei que **isso destrava a
   S323**, que a spec condiciona a "S322 no ar".
3. **[E04] A venda paga tem chão de R$ 10,00** — corrigi um rótulo **defasado desde 11/08**: dizia
   "ainda não está no ar" quando a fechadura de Rules subiu na JANELA2. Medi `faceMinimaVendaPagaOk`
   = 3 em produção **antes** de tocar em nada, e essa é a prova.

---

# Fechamento — placar da lane

| Etapa | Horário | Estado | Prova-chave |
|---|---|---|---|
| 0 · Pino | 20:33 → 20:35Z | ✅ | `409a5748` == `origin/main`; `functions/.env` por hash `4e689cb3…`; install exit 0; **cache do turbo falsificado por rebuild `--force`, 3 hashes idênticos**; frescor verde nos 2 apps; 2 secrets `ENABLED` |
| 1 · Rules + indexes | 20:39:30 → **20:44:01Z** | ✅ **APROVADO** | ruleset `bb41805b` → **`9e4b4b03`**; source do release **byte a byte** == pino (`d59b63ac…`); RN-543 de 0 → 2/2/2; **19/19 índices READY**, `pagamentos(status,pixExpiraEm)` READY em 180 s |
| 2 · Functions | 20:51:37 → **21:18:15Z** | ✅ **APROVADO** | 102 → **106**, 4 criadas, 0 removidas, **106/106 ACTIVE**; convergência **105 Skipped, 0 update/create/delete**; cron `3-58/5` SP ENABLED, rollup intacto; **2 execuções reais `ok`** (21:13:03Z e 21:18:13Z); **0** `severity>=WARNING` de runtime |
| 3 · Landing | 21:16:48 → 21:25:37Z | ✅ **APROVADO** | 5 chunks trocados e **byte a byte idênticos** ao build local; home **0→2**, `Serviço` **0→12**, "taxa de serviço" **7→0**, "a partir de R$ 10,00" **2→2**; smokes + 404 de controle |
| 4 · Painel | 21:15:53 → 21:28:33Z | ✅ **APROVADO** | `qMVaoZwP` → **`CRoaNsxO`**, 3 assets **byte a byte idênticos**; `/plataforma/contas` **0→2**, 3 callables novos **0→1**, `AreaSubNav` **0→1**; bundle antigo fora do release; cache immutable de pé |
| 5 · Fechamento | 21:29Z | ✅ | zero emulador; árvore principal 0 linhas; boards atualizados; **2 achados de porta reportados, nada tocado** |

⛔ **NENHUMA superfície está declarada "no ar".** As duas de hosting estão **deployadas com prova
técnica**. O gate visual L-019 é do maestro: home, página de evento (⚠️ **de preferência uma com a
seção `checkout` ligada** — é a única forma de fechar a sonda cega de "Pronto para largar?"),
checkout, `/plataforma/contas` e a navegação nova. O passeio autenticado do admin é do dono.

## Desvios registrados

1. **`turbo run build` inteiro NÃO foi rodado.** O `build` de `apps/painel` é `vite build` **sem**
   `--mode leela-hub`; rodá-lo assaria um dist de demo. Usei a alternativa que o contrato autoriza.
2. **Grupo 3 das functions morreu no meu teto de 10 min** (SIGTERM). Estado medido por `updateTime`
   na API, não presumido: 34/35 feitos. O pendente (`publicarEvento`) tinha **falhado de verdade**
   às 20:59:44Z com `code 13` do `gcf-artifacts` — o SIGTERM não foi a causa. Pago em retry.
3. **Landing e a espera do cron rodaram em background.** Decisão consciente depois do item 2: matar
   um deploy de hosting no meio é pior que esperar.
4. **`firebase.landing.json` para a landing**, mesmo desvio físico das janelas anteriores.
5. **`npx firebase-tools@13`** em vez do 15.22.4 do PATH, seguindo o método da casa.
6. **Duas correções na minha própria sonda** antes de qualquer veredito (escape `\xNN`, regex que
   truncava em `(public)`). Sem elas, eu teria parado a janela por falso negativo.

## Para a próxima lane

1. ⛔ **35 alvos por grupo não cabe em 10 min.** Use **4 grupos de ~26** — o predeploy (32 s) roda
   de novo a cada grupo.
2. ⛔ **`grep … > arquivo` bufferiza.** Log de deploy dividido precisa de `--line-buffered` ou `tee`,
   senão o log só existe quando o comando termina bem — que é justamente quando ele não é necessário.
3. ⛔ **Sonda de bundle da landing:** normalize `\xNN`/`\uNNNN` **e** deixe `()` passar no regex de
   referências, senão a sonda baixa error/not-found e mais nada. (O card **S1261-T10** do kanban já
   avisava da primeira metade; a segunda é achado desta lane.)
4. ⛔ **Sonda do painel só vale com string literal** — o bundle é minificado, ao contrário do de
   functions.
5. **`:4601` serve a árvore principal com build de 12/08**, não o de produção. Re-apontar ou aposentar.
6. **`:4602` do mock está fora.** Subir é decisão do maestro.
7. **`gcf-artifacts` derrubou uma `UpdateFunction`** nesta janela (não só sujou a saída). Se voltar,
   é retry — mas vale abrir card de limpeza do Artifact Registry.
8. Segue de pé, herdado e não pago: `vendasRules.integration.test.ts:258-271` semeia com `Timestamp`
   do SDK errado; `assertFaceMinimaVendaPaga` sem chamador; `predeploy` de functions sem gate de
   frescor; painel sem gate do próprio `dist`.

## Nada foi violado

Nenhuma escrita manual no Firestore de produção · nenhum `firebase deploy` sem `--only` · storage
não foi deployado · nenhum código de produto editado · nada commitado nem pushado · nenhum `stash`,
nenhum `amend` · nenhum navegador aberto (toda prova por API, `curl`, `sha256sum` e contagem em
disco) · secrets lidos só por metadado, valores nunca impressos · token de leitura trocado em
memória, nunca gravado · **nenhuma superfície declarada "no ar"**.

**Status: lane concluída, 5 etapas com pós-check aprovado. Aguardando o gate visual do maestro.**

---

## Nota de fechamento — 21:35Z, meia hora depois do deploy

Reli o log antes de entregar. O varredor acumulou **cinco** execuções, todas limpas:

| Execução | Início | Duração | Status |
|---|---|---|---|
| `00gvx9bb9r1u` | 21:13:03Z | 1.897 ms | `ok` |
| `00gvtnll9hjj` | 21:18:13Z | 1.873 ms | `ok` |
| — | 21:23:03Z | 1.814 ms | `ok` |
| — | 21:28:07Z | 1.909 ms | `ok` |
| — | 21:33:05Z | 1.878 ms | `ok` |

Cinco rodadas em cadência de 5 minutos exatos, duração estável entre 1,81 s e 1,91 s, e
**zero** entradas `severity>=WARNING` em todas as 106 functions desde 21:11Z. A varredura do PIX
está de pé e batendo o relógio.
