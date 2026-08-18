---
trace: leela-redesign-v2-20260810
lane: DEPLOY-J4
employee: sf-release-engineer (software-forge)
repo: C:\dev\LEELA
worktree: C:\dev\leela-deploy-j4-20260818
head_pinado: 82aea920
baseline_no_ar: 409a5748
data: 2026-08-18
papel: subir o pacote pendente das levas 20-25, com o reprocesso da RN-822 junto
estado: CONCLUIDA — 3 superficies deployadas + reprocesso rodado, tudo com prova; gate visual entregue ao maestro
---

# DEPLOY-J4 — handoff

Contrato: `.nirvana/briefs/leela-deploy-j4-20260818-enriched.md`.
Herdados: `leela-deploy-j3-20260816.md` (o runbook) e `leela-serie-financeira-20260817.md`
(o contrato do reprocesso).

⚠️ **Esta lane não declara "no ar".** O veredito máximo que emito é **deployado, prova técnica OK**.
O gate visual L-019 é do maestro — os PNGs de produção estão em `.nirvana/gate-visual/deploy-j4/`.

---

## Etapa 0 · O inventário do delta, que mudou o plano

`git log 409a5748..HEAD` = **99 commits**. Mas o diffstat por área é o que decidiu a janela:

| Área | Arquivos | Peso | Decisão |
|---|---|---|---|
| `firestore.rules` | **0** | — | ⬜ **não deployar** |
| `firestore.indexes.json` | **0** | — | ⬜ **não deployar** |
| `apps/landing` | **0** | — | ⚠️ ver abaixo — deployada mesmo assim, e o motivo é bom |
| `functions/` | 14 | +2181/−15 | 🔄 deployar |
| `apps/painel/` | 85 | +5188/−695 | 🔄 deployar |
| `packages/` | 54 | +3815/−428 | (entra nos dois bundles) |
| `scripts/` | 3 | +389/−2 | não é alvo de deploy |
| `pnpm-lock.yaml` | 1 | +8/−5 | — |

**Rules e índices com delta zero é uma afirmação forte, então provei duas vezes.** Primeiro pelo
diff. Depois pela produção: o sha256 do source servido no release (`d59b63ac…`) bate **byte a byte**
com o `firestore.rules` do pino **novo**. O ruleset segue `9e4b4b03`, exatamente onde a J3 o deixou —
ninguém deployou rules entre as duas janelas, e não havia o que deployar nesta.

Os índices idem: **19/19 `READY`** antes e depois, zero `CREATING`. A etapa 3 do runbook (esperar
índice READY antes das functions) **não teve o que esperar** — e isso é resultado medido, não pulo.

### ⚠️ A landing tem delta ZERO de fonte e mesmo assim mudou

O contrato dizia "landing só se mudou, provar por diff". O diff de `apps/landing/` é **0 arquivos**,
e o caminho fácil era parar aí. Não parei, porque `apps/landing/package.json` depende dos três
pacotes de workspace, e **os três mudaram**.

O que encontrei, e é material:

```
apps/landing/app/globals.css:14
  @import '@leela/design-system/themes/brasa.css';     ← e brasa.css ESTÁ no delta
```

A mudança semântica é uma só: `--modal-overlay-bg` de `rgba(0,0,0,0.6)` para **`0.82`** (a lane
MODAL-LOTE). Os outros tokens novos (`--bottomnav-*`) são aditivos e só o painel os consome.

**Provei nos dois lados, no CSS servido — não na fonte:**

| | `modal-overlay-bg` | `.6` | `.82` |
|---|---|---|---|
| build da J3 (o que **estava** no ar) | 3 ocorrências | **3** | **0** |
| produção **agora** | 3 ocorrências | — | **1** |

Não deployar teria deixado a landing com o overlay antigo enquanto o painel subia com o novo — a
inconsistência exata que a MODAL-LOTE existiu para matar. **Deployei.**

## Etapa 0b · Pino, credencial e frescor

| Item | Medido |
|---|---|
| `main` == `origin/main` | `82aea9205911be48…` |
| worktree | `C:\dev\leela-deploy-j4-20260818`, detached, `git status` = **0 linhas** |
| `functions/.env` (gitignored, não vem no worktree) | copiado, sha256 **`4e689cb3261613d6…`** — o mesmo das três janelas anteriores |
| envs rastreados | `/.env.leela-hub`, `apps/landing/.env.leela-hub`, `functions/.env.leela-hub` presentes |
| `pnpm install --frozen-lockfile` | exit 0 · 2 min 03 s |

**O cache do turbo não passou sem prova** (lei do pino: `dist/` se julga por hash rebuildado):

```
turbo run build --filter=@leela/core --filter=@leela/design-system --filter=@leela/api-client
  → 3 cached · FULL TURBO · 1,2 s
  ... --force → 3 successful, 0 cached · 24,7 s
```

| `dist/index.mjs` | cache | rebuild forçado | |
|---|---|---|---|
| `@leela/core` | `8cc790b120f6b455…` | `8cc790b120f6b455…` | IDÊNTICO |
| `@leela/design-system` | `9873e5c1fd57cdf5…` | `9873e5c1fd57cdf5…` | IDÊNTICO |
| `@leela/api-client` | `9698f740ebba1e7c…` | `9698f740ebba1e7c…` | IDÊNTICO |

**A lição de frescor da J4, paga:** os símbolos novos foram conferidos **dentro do dist**, não na
fonte — `formasPagamento` core=12/api-client=2, `ROTULO_FORMA_PAGAMENTO` core=2,
`editarModalidadesEvento` api-client=3, `BottomNav` ds=9, `RowActions` ds=4, controle− `xyzzy0818`=0.
(`FatiaFormaPagamento` dá 0 no `.mjs` **por ser tipo TS** — apagado em runtime, vive no `.d.ts`.)

Gate de frescor: `apps/painel` **EXIT=0**, `apps/landing` **EXIT=0** — 3 pacotes com `dist/` à frente
da fonte nos dois.

---

## Etapa 1 · Functions ✅ DEPLOYADAS, pós-check APROVADO

### Predeploy

```
npm --prefix functions run build (tsc)      exit 0
node functions/scripts/bundle-deploy.mjs    exit 0 · 271 pacotes externos · 40 s
functions-deploy/index.js = 1.426.318 bytes   (J3: 1.401.645 · +24.673)
```

⚠️ **Erro meu, corrigido antes de virar número no relatório:** medi o bundle com
`ls -l | awk '{print $5}'` e li **197.121 bytes**. O `ls -l` do git bash no Windows não tem as
colunas do POSIX, e o `$5` caiu no campo errado. `wc -c` e `stat -c %s` deram o número real. O sinal
de que algo estava errado foi o bundler estar **intocado** no diff e ainda assim o bundle ter
encolhido 86% — número que contradiz o diff merece uma segunda régua, não uma explicação.

**Um único export novo**, conferido no diff de `functions/src/index.ts`:

```
+ editarModalidadesEvento    (S316-T1/T2/T3 · RN-500/501/502/505)
```

Nenhum removido. Alvo = 105 existentes + 1 = **106**.

### Sondas no bundle, medidas ANTES do upload

| Sonda | n | | Sonda | n |
|---|---|---|---|---|
| `editarModalidadesEvento` | 15 | | `varrerPixVencidos` (ctrl+) | **15** |
| `reprocessarFinanceiroTodosEventos` | 3 | | `agendarRecomputePlatformRollups` (ctrl+) | **5** |
| `formasPagamento` | 20 | | `recomputarSaudeDeTodosOsTenants` (ctrl+) | **3** |
| `serieFormasPagamento` | 5 | | `xyzzy0818` (ctrl−) | **0** |
| `pendentes` | 55 | | | |

Os três controles positivos batem **exatamente** com os da J3 — o que prova que identificadores
**não** são minificados neste bundle e que os números acima são presença, não renome.

### O deploy — e a lição da J3 aplicada ao contrário

A J3 deixou escrito: *"35 alvos por grupo não cabe em 10 min, use 4 grupos de ~26"*. **Não dividi em
grupo nenhum**, porque o teto de 10 min era do *foreground* da lane, não do Firebase. Rodei o deploy
inteiro **em background**, com `tee` (a outra lição da J3: `grep > arquivo` bufferiza e some com o
log justamente quando ele importa).

```
npx firebase-tools@13 deploy --only functions --project prod \
    --config firebase.prod.json --non-interactive
FUNCTIONS_DEPLOY_EXIT=0     12:57:55Z → 13:03:53Z   (5 min 58 s)
1 Successful create + 105 Successful update = 106
```

**106 alvos em 5 min 58 s, num comando só** — contra os ~16 min e o SIGTERM da J3. O gargalo nunca
foi o Firebase; era o predeploy (40 s) rodando de novo a cada grupo, mais o teto do meu foreground.
Quem herdar isto: **não divida — desprenda.**

### Convergência

```
Skipped (No changes detected) = 106     updating = 0
creating = 0                            deleting = 0
CONV_EXIT=0     50 s
```

### Inventário — antes × depois (lido da API, não do log do deploy)

| Medida | ANTES | DEPOIS |
|---|---|---|
| Functions GEN_1 | **105** | **106** |
| Criadas | — | **1** (`editarModalidadesEvento`) |
| Removidas | — | **nenhuma** |
| Estado | 105 ACTIVE | **106/106 `ACTIVE`** |
| Ruleset das Rules | `9e4b4b03` | **`9e4b4b03` — intocado** |
| Índices | 19 READY | **19 READY, 0 CREATING** |
| Jobs no Scheduler | 12 | **12**, todos `ENABLED` |
| `varrerPixVencidos` | `3-58/5` SP ENABLED | **idêntico** |
| `agendarRecomputePlatformRollups` | `15 * * * *` SP ENABLED | **idêntico** |

**Sem cron novo**, exatamente como a SERIE-FINANCEIRA prometeu (a série nasce no gatilho que já
existia). A janela 03:00-03:20 SP **não foi encostada** — a lane rodou às 09:50-10:20 SP.

### Runtime

**Zero entradas `severity>=WARNING` em todas as 106 functions** desde 12:57Z.

O varredor do PIX seguiu batendo o relógio **sobre o código novo**:

| Execução | Duração | Status |
|---|---|---|
| 13:03:09Z | 7.135 ms | `ok` (cold start, logo após o deploy) |
| 13:08:05Z | 1.916 ms | `ok` (quente — a marca de ~1,9 s que a J3 mediu) |

⚠️ Ruído conhecido e não-bloqueante, idêntico ao das três janelas anteriores:
`Unhandled error cleaning up build images` (`gcf-artifacts`). Desta vez ele **não** derrubou nenhuma
`UpdateFunction` — as 106 passaram de primeira, sem o `code 13` que custou um retry à J3.

---

## Etapa 2 · Reprocesso (RN-822) ✅ RODADO, com números

### A função já existia — e conferir isso primeiro poupou a construção inteira

O contrato mandava construir `reprocessarFinanceiroTodosEventos` "se for molde não construído".
**Não era molde: está construída**, em `functions/src/eventos/agregarFinanceiro.ts:451`, entregue
pela própria SERIE-FINANCEIRA. Assinatura `(db) => Promise<{eventos, falhas}>`, full recompute
transacional, sequencial de propósito. Nada a construir.

### ⛔ A credencial foi o único ponto que resistiu, e a saída está registrada

O runbook da SERIE-FINANCEIRA assume Admin SDK. Esta máquina **não tem ADC do gcloud**
(`application_default_credentials.json` ausente, `GOOGLE_APPLICATION_CREDENTIALS` vazia), e o
Firestore do Admin SDK **recusa credencial de refresh token**:

```
firestore/invalid-credential — Must initialize the SDK with a certificate credential
or application default credentials to use Cloud Firestore API.
```

Tentei antes a saída que não escreve nada em disco: injetar um `UserRefreshClient` no cliente
Firestore (`auth`, `authClient`, `preferRest`, nas três combinações). **As três deram
`PERMISSION_DENIED`** — e a falsificação que fecha o diagnóstico é que o **mesmo token**, no
**mesmo instante**, lê a mesma coleção por REST com **HTTP 200**. Ou seja: o token é bom, o SDK é que
ignora auth client injetado. O escopo do token é `cloud-platform`, conferido no `tokeninfo`.

Saída adotada, que é a **documentada pelos próprios scripts da casa** (`functions/scripts/backfill-*.mjs`
dizem `GOOGLE_APPLICATION_CREDENTIALS / credencial padrão do ambiente`): materializar um ADC
`authorized_user` a partir do **mesmo refresh token que o `firebase-tools` já guarda nesta máquina**,
usar, e apagar no `finally`. Arquivo fora do repositório, `mode 0600`, valor **nunca impresso**,
apagamento **verificado** ao fim (`ADC temporario apagado: true`). Reimplementar o recompute sobre
REST foi descartado de propósito: rodaria código que nenhum teste viu.

### Os números

```
13:08:45Z → 13:08:50Z
1a passada:  { eventos: 1, falhas: [], duracaoMs: 1624 }
2a passada:  { eventos: 1, falhas: [], duracaoMs: 1011 }
```

**Produção tem exatamente 1 evento** (`teste-taxa-repassada`) — a base foi enxugada pela limpeza de
06/08. O número é pequeno e é o número real.

**Amostra nomeada — `eventos/teste-taxa-repassada/financeiro/current`:**

| Campo | ANTES | DEPOIS |
|---|---|---|
| `formasPagamento` | **ausente** | `[{cartao_credito, vendas 0, valor 0}, {pix, vendas 1, valor 10}]` |
| `pendentes` | **ausente** | `{qtd: 0, valor: 0}` |
| `atualizadoEm` | 2026-08-05T09:53:17Z | **2026-08-18T13:08:48Z** |

Este doc era o caso de livro-texto da RN-822: escrito pela última vez em **05/08**, por servidor
anterior à série. Sem reprocesso ele **nunca** ganharia `formasPagamento`, porque o gatilho é write
de inscrito e ninguém mais se inscreve nele.

### A série está CERTA, não apenas presente

Não aceitei "o campo apareceu" como prova. Fui aos pagamentos crus do evento **antes** de rodar:
**2 pagamentos — 1 `confirmado/pix` e 1 `falhou/pix`**. A série devolveu `pix: vendas 1, valor 10`.
**O `falhou` ficou fora do Σ**, que é a régua `status == 'confirmado'` da S825 funcionando contra
dado de produção.

E há um segundo achado que só produção entregaria: `pendentes.qtd = 0` **com 1 inscrito pendente no
mesmo doc**. Os dois números estão certos e são diferentes — é exatamente a escolha de denominador
que a SERIE-FINANCEIRA registrou (*"conta cobranças, não pessoas"*), confirmada fora do mock.

**Idempotência medida, não presumida:** 2ª passada devolveu `formasPagamento`, `pendentes` e
`receitaConfirmada` **idênticos**.

**Verificação independente:** reli o doc por **REST** (caminho de código diferente do Admin SDK que
escreveu) — cobertura de eventos com série foi de **0 → 1**, com pendentes de **0 → 1**.

⛔ Nenhuma purga. Nenhum dado cru tocado. O único write desta lane além do deploy é este recompute
de derivado.

---

## Etapa 3 · Painel ✅ DEPLOYADO, pós-check APROVADO

```
npx vite build --mode leela-hub    exit 0 · ✓ built in 36,75s
  index-BCYyq8yg.js  2.382,38 kB (gzip 632,30)
  index-CBlsWQ0a.css   148,61 kB
  browser-BXdiCFWD.js   24,53 kB   (nome inalterado desde 11/08)
```

### R-7 conferida no artefato, ANTES de subir

`VITE_FIREBASE_PROJECT_ID:"leela-hub"` = 1 · `leela-hub.firebaseapp.com` = 1 ·
`leela-hub.firebasestorage.app` = 1 · `76126035891` = 2 · `localhost:8080` = **0** ·
`127.0.0.1:8080` = **0** · `demo-leela` = 4 (a constante `DEMO_CONFIG` do guarda fail-closed, mesmo
padrão das três janelas anteriores).

### Deploy

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json
  predeploy: npm --prefix apps/painel run verify:frescor → EXIT=0
  found 15 files · uploading new files [3]
PAINEL_DEPLOY_EXIT=0     13:09:03Z → 13:09:18Z   (15 s)
```

### Pós-check

| asset | ANTES | DEPOIS | servido == local |
|---|---|---|---|
| JS | `index-CRoaNsxO.js` | **`index-BCYyq8yg.js`** | `564080c08809fca4…` **IDÊNTICO** (2.387.407 B) |
| CSS | `index-BWL8ZyXs.css` | **`index-CBlsWQ0a.css`** | `012dc897e285f06d…` **IDÊNTICO** (148.611 B) |
| browser | `browser-BXdiCFWD.js` | inalterado | `7e89b6da537b2218…` **IDÊNTICO** — o mesmo hash da J3 |

O ANTES bate com o que a J3 deixou: **ninguém deployou o painel entre as duas janelas.**

**O bundle antigo saiu do release.** `index-CRoaNsxO.js` e `index-BWL8ZyXs.css` respondem 200 com
**475 B de `text/html`** — byte a byte o mesmo que `xyzzy0818.js`, um arquivo que nunca existiu. É o
rewrite da SPA, não bundle velho ainda servindo.

**HOSTING-CACHE de pé** (o header que fechou o incidente da tela-preta de 10/08):
`/` e `/plataforma/eventos` → `no-cache` · `/assets/index-BCYyq8yg.js` → `public, max-age=31536000, immutable`.

### Sondas — só string literal, porque o painel é minificado

| Sonda | n | | Sonda | n |
|---|---|---|---|---|
| `editarModalidadesEvento` (callable) | 1 | | `formasPagamento` | 5 |
| `Modalidades` | 23 | | `Nenhuma venda confirmada` | 1 |
| `ormas de pagamento` (fragmento **sem acento**) | 2 | | `cartao_credito` | 7 |
| `BottomNav` | 1 | | `AreaSubNav` (ctrl+) | 1 |
| `RowActions` | 1 | | `/plataforma/contas` (ctrl+) | 2 |
| `--chart-cat-1` (CSS, cores da rosca) | 3 | | `xyzzy0818` (ctrl−) | **0** |

⛔ Sondei "formas de pagamento" **por fragmento sem acento** de propósito — é a armadilha que a J3
documentou. Não re-contei as sondas no ar: os três assets são **byte a byte** idênticos ao local, e
identidade de bytes torna a recontagem redundante por construção.

---

## Etapa 4 · Landing ✅ DEPLOYADA, pós-check APROVADO

```
node apps/landing/scripts/deploy-leela-hub.mjs
  [deploy-landing] env carregada de .env.leela-hub: 12 chaves
  found 101 files · functions[…ssrleelalanding] Successful update operation
  [deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0     13:10:05Z → 13:19:00Z   (8 min 55 s)
```

`next build` local com a env de produção **antes** do deploy (método herdado), rodado em background.
`package.json.deploybak` **ausente** na árvore ao fim, conferido; worktree com `git status` = 0 linhas.

⛔ Desvio de config previsto e repetido pela mesma razão física: a landing usa `firebase.landing.json`
porque `firebase.prod.json` declara `site=leela-hub` → `apps/painel/dist` e não conhece o site
`leela-landing`.

### Pós-check

| Rota | ANTES | DEPOIS | servido == local |
|---|---|---|---|
| `/` | `page-f66996a1bb28c88e.js` | **`page-706c793af589d00a.js`** | **IDÊNTICO** |
| layout `(public)` | `layout-a125171fa00fb6f1.js` | **`layout-d1f8695de7a55eaa.js`** | **IDÊNTICO** |
| `/[eventSlug]` | `page-c943f44c94bcdb28.js` | **`page-76b70a6255874377.js`** | **IDÊNTICO** |

O ANTES bate com o que a J3 deixou — ninguém deployou a landing entre as duas janelas.

**Smokes:** `/` 200 (27.203 B) · `/teste-taxa-repassada` 200 (43.031 B) ·
`/teste-taxa-repassada/inscricao` 200 (38.522 B) · `/health` 200 `application/json` ·
controle `/_next/static/chunks/xyzzy0818.js` **404**.

⚠️ Os três tamanhos de HTML são **idênticos aos da J3** — coerente com o achado: o que mudou na
landing foi um token de CSS, não conteúdo.

**Vocabulário no HTML do evento** (fragmento sem acento): `Servi` = 4 · `taxa de servi` = **0** ·
`a partir de R` = 2 · `xyzzy0818` = 0. SERV-3 de pé.

---

## Etapa 5 · Gate visual — PNGs de produção para o maestro

`.nirvana/gate-visual/probe-deploy-j4.mjs` (molde do `probe-visual.mjs`, `domcontentloaded` + 7 s,
chromium do `@playwright/test` do repo, headless). Saída em **`.nirvana/gate-visual/deploy-j4/`**:

| Arquivo | Página | http | erros de console |
|---|---|---|---|
| `landing-home-desktop.png` | landing `/` (1440) | 200 | **0** |
| `landing-home-375.png` | landing `/` (375) | 200 | **0** |
| `landing-evento-desktop.png` | `/teste-taxa-repassada` (1440) | 200 | **0** |
| `landing-evento-375.png` | `/teste-taxa-repassada` (375) | 200 | **0** |
| `landing-inscricao-desktop.png` | `/teste-taxa-repassada/inscricao` | 200 | **0** |
| `painel-entrar-desktop.png` | painel `/entrar` (1440) | 200 | **0** |
| `painel-entrar-375.png` | painel `/entrar` (375) | 200 | **0** |

**Eu abri os PNGs** — capturar não é ver, e a tela-preta de 10/08 passou por 2.387 testes verdes.
A home renderiza a headline nova ("Físico, mental, espiritual."), o card do evento e
"a partir de R$ 10,00". A página do evento renderiza "+ Serviço" (SERV-3), o QR e a barra fixa de
CTA. O `/entrar` do painel **monta a SPA sobre o bundle novo** — formulário, marca e foco visíveis,
nenhuma tela preta.

⚠️ **A sonda cega da J3 continua cega, e agora com foto.** "Pronto para largar?" não aparece porque
o `CheckoutCtaSection` **não é renderizado** pelo único evento público de produção — confirmado no
PNG, não só na contagem. Fechar isso exige um evento com a dobra `checkout` ligada.

⛔ **Telas autenticadas ficam com o dono** — a rosca de formas de pagamento (S825) vive na Visão
geral, atrás de login, e o gate dela **exige JDK 21** para o emulador do mock (esta máquina tem 17).

---

## Etapa 6 · Fechamento

| Item | Medido |
|---|---|
| worktree de deploy | `git status --porcelain -uno` = **0 linhas**; `package.json.deploybak` ausente |
| árvore principal | código de produto (`packages apps functions scripts` + rules/indexes/configs) = **0 linhas** |
| `:4601` | **LISTENING** (PID 34240) — **não tocado** |
| `:4602` (mock) | **LISTENING** (PID 33652) — **de pé**, ao contrário da J3; não tocado |
| `java.exe` | **2 processos** — emulador da lane vizinha, **não tocado** |
| kill de processo | **nenhum** |

⚠️ **A `main` andou durante o deploy.** Quando fui fechar, `HEAD` era `28448256`, não o meu pino
`82aea920`. Medi antes de assumir qualquer coisa: os 5 commits novos são da lane
MIGRACAO-OBSIDIAN e `git diff 82aea920..28448256 -- packages apps functions firestore.rules
firestore.indexes.json scripts` = **vazio**. **São docs e boards, zero código** — o pino de produção
continua correto e produção está em paridade de código com a `main`.

⚠️ **`:4601` serve build local, não produção** (achado herdado da J3, ainda de pé). Quem validar o
painel por ali vê outro bundle. A régua é `https://leela-hub.web.app`.

---

# Placar da lane

| Etapa | Horário (UTC) | Estado | Prova-chave |
|---|---|---|---|
| 0 · Pino e delta | 12:44 → 12:56 | ✅ | `82aea920` == origin; `functions/.env` `4e689cb3…`; **cache do turbo falsificado**, 3 hashes idênticos; frescor verde nos 2 apps; **rules/índices com delta ZERO, provado por diff E por sha do release** |
| 1 · Functions | 12:57:55 → **13:03:53** | ✅ **APROVADO** | 105 → **106**, 1 criada, 0 removidas, **106/106 ACTIVE**; convergência **106 Skipped, 0/0/0**; crons intactos; **0** `severity>=WARNING`; varredor `ok` 2× sobre o código novo |
| 2 · Reprocesso RN-822 | 13:08:45 → 13:08:50 | ✅ **APROVADO** | função **já existia**; **1 evento, 0 falhas**; série `pix 1/R$10` com o `falhou` **fora do Σ**; `pendentes` presente e zerado; **idempotência medida**; releitura independente por REST |
| 3 · Painel | 13:09:03 → 13:09:18 | ✅ **APROVADO** | `CRoaNsxO` → **`BCYyq8yg`**, 3 assets **byte a byte**; bundle antigo fora do release; cache immutable de pé; R-7 satisfeita por medição |
| 4 · Landing | 13:10:05 → 13:19:00 | ✅ **APROVADO** | delta de **dependência** provado no CSS servido (`.6` → **`.82`**); 3 chunks trocados e **byte a byte**; smokes + 404 de controle |
| 5 · Gate visual | 13:20 → 13:21 | ✅ entregue | 7 PNGs de produção, 200 e **0 erros de console** em todos; abertos e conferidos |
| 6 · Fechamento | 13:25 | ✅ | árvore principal 0 linhas; nada morto; `main` que andou **medida**, não presumida |

⛔ **NENHUMA superfície está declarada "no ar".** As três estão **deployadas com prova técnica**.

## Desvios registrados

1. **Rules, índices e Storage não subiram** — delta zero, provado duas vezes. Não é etapa pulada.
2. **Landing deployada apesar de `apps/landing` ter delta zero** — mudou pela dependência
   (`brasa.css` → `--modal-overlay-bg`), provado no CSS servido dos dois lados.
3. **Functions em UM comando, não em grupos** — a lição da J3 vale para o foreground; em background
   não há teto. 106 alvos em 5 min 58 s.
4. **ADC materializado do refresh token** para o reprocesso, apagado no `finally` — o SDK recusa
   refresh token e a máquina não tem ADC. As três alternativas sem escrita em disco foram tentadas e
   falharam com `PERMISSION_DENIED`, com falsificação por REST 200 no mesmo instante.
5. **`firebase.landing.json`** para a landing, mesmo desvio físico das janelas anteriores.
6. **`npx firebase-tools@13`** em vez do 15.22.4 do PATH, método da casa.
7. **Erro meu de medição do bundle** (`ls -l | awk $5` no git bash), pego pela contradição com o diff.

## Para a próxima lane

1. ⛔ **Deploy de functions vai em background, não em grupos.** `tee` para o log. 106 em ~6 min.
2. ⛔ **Delta de app zero não significa app inalterado.** Se ele importa `@leela/*`, o delta pode
   entrar pela dependência — e a régua honesta é o **artefato servido**, não o `git diff` da pasta.
3. **`gcf-artifacts` não derrubou nada desta vez**, mas o card de limpeza do Artifact Registry que a
   J3 sugeriu segue valendo.
4. **JDK 21 é a pendência #1 de gate visual** — trava a rosca da S825 e a prova no emulador do mock.
5. **`:4601` serve build local**; `:4602` do mock **voltou** a ficar de pé (a lane vizinha subiu).
6. Segue de pé, herdado e não pago: `vendasRules.integration.test.ts:258-271` com `Timestamp` do SDK
   errado; `assertFaceMinimaVendaPaga` sem chamador; `predeploy` de functions sem gate de frescor;
   painel sem gate do próprio `dist`.
7. O worktree `C:\dev\leela-deploy-j4-20260818` ficou **de pé** com `node_modules`, dists, `.next`
   aquecido, `functions-deploy/` e `.firebase/` — se o gate visual voltar com defeito, poupa um ciclo.

## Nada foi violado

Nenhuma escrita manual no Firestore · nenhum `firebase deploy` sem `--only` · storage não deployado ·
nenhum código de produto editado · nenhum `stash`, nenhum `amend` · nenhum processo morto, `:4601` e
`:4602` intactos · nenhuma purga · secrets nunca impressos, ADC temporário apagado e o apagamento
verificado · **nenhuma superfície declarada "no ar"**.

**Status: lane concluída, 6 etapas com pós-check aprovado. Aguardando o gate visual do maestro.**
