---
trace: leela-redesign-v2-20260810
lane: DEPLOY-NOTURNO
employee: sf-platform-lead (software-forge)
repo: C:\dev\LEELA
worktree: C:\dev\leela-deploy-20260811
head_pinado: b0f979e5
data: 2026-08-11
papel: subir functions + landing + painel do redesign v2 mergeado, cada etapa com prova
estado: CONCLUIDA — 3 superficies deployadas com prova; hosting aguarda gate visual do maestro
---

# DEPLOY-NOTURNO — handoff vivo

Contrato: `.nirvana/briefs/leela-deploy-noturno-enriched.md`.
Métodos de prova herdados de `leela-redesign-ds-20260809-DEPLOY.md` (sha256 do bundle
baixado do ar) e `leela-retomada-20260808-DEPLOY-FINAL.md` (sondar chunk completo da rota
na landing, controles positivo e negativo).

⚠️ **Nenhuma etapa de hosting desta lane declara "no ar".** O status máximo que eu emito é
**deployado, prova técnica OK, aguardando gate visual do maestro**. A conferência renderizada
de produção é etapa do maestro, depois de mim.

---

## Etapa 0 · Portão e pino

### Pré-condições conferidas por mim

| Item | Esperado (maestro) | Medido por mim |
|---|---|---|
| merge | `b51cdcd9` | `b51cdcd9` presente no log, `--no-ff` |
| `main` | `b0f979e5` | `b0f979e5` |
| `origin/main` | `b0f979e5` | `b0f979e5` — **iguais** |
| gates pós-merge | verdes | handoff `leela-redesign-merge.md`: painel 2583/2583, DS 1809/1809, tsc/lint exit 0, frescor exit 0 nos 3 apps |

Servidores no início da lane, por `netstat` + `tasklist` (nada foi tocado ainda):

```
:8080  PID 25452  java.exe   (Firestore emulator)
:9099  PID 26412  node.exe   (Auth emulator)
:4599  PID 25384  node.exe
:4601  PID 19132  node.exe   (validação local do dono — FICA)
```

### Escolha do pino: `b0f979e5`, e não `b51cdcd9`

O contrato deixou a escolha aberta pedindo justificativa. Escolhi o HEAD **`b0f979e5`** por
duas razões, e a primeira é medida, não presumida:

**1. Os insumos de build são byte a byte idênticos nos dois commits.** Não confiei na
descrição "os boards não afetam build" — comparei as árvores git:

```
packages:  dcf79902e0fe8070268ef6d3c9d99687fee1c74f  ==  dcf79902…   IDENTICO
apps:      66c6bb2e85c0f477f6378b9821c019af514a5ef0  ==  66c6bb2e…   IDENTICO
functions: ce8c88aefb9a3cc07582f4ac7ab231f3d257fd6f  ==  ce8c88ae…   IDENTICO
scripts:   590eb1f21f69bc308199a0ab1dede41c868eca5c  ==  590eb1f2…   IDENTICO
package.json · pnpm-workspace.yaml · turbo.json · firebase.prod.json · firebase.landing.json
                                                                      todos IDENTICOS
```

`git diff --stat b51cdcd9 b0f979e5` = 3 arquivos, todos em `leela-specs/00-boards/` e
`leela-specs/02-rodadas/`, +46/−28. Zero arquivo de código, config ou script.

**2. Empatado o artefato, ganha a procedência.** `b0f979e5` é `origin/main`: o que subir é
exatamente o que está publicado na linha principal. Pinar no `b51cdcd9` produziria o mesmo
bundle mas contaria uma história de proveniência que não bate com `origin/main` — e essa
diferença aparece em qualquer auditoria futura de "que commit está em produção".

```
git worktree add C:/dev/leela-deploy-20260811 b0f979e5   → exit 0, detached em b0f979e5
git status --porcelain -uno no worktree                  → 0 linhas
```


---

## Etapa 1 · Functions ✅ DEPLOYADA + backfill executado

### Pré-gate — suíte de território (worktree pinado)

| Gate | Comando | Resultado |
|---|---|---|
| `tsc --noEmit` functions | `npx tsc --noEmit` | exit **0** |
| `eslint src --max-warnings 0` | `npx eslint src` | exit **0** |
| Território unit (9 arquivos) | `vitest run` sem emulador | **125 passed · 10 skipped · exit 0** |
| Território integração (5 arquivos) | `vitest run` c/ Firestore 8080 + Auth 9099, `LEELA_CLOCK=2026-03-15` | **63 passed · exit 0** |

Cobertura: `promocaoProfissional{Fronteira,Wrapper,Ponte}`, `overview{Kpis,Alerts,Dashboard}`,
`saudeTenant`, `platformRollups`, `adminVisaoOnda1{,Agendamento,Paginacao}`, `analyticsSnapshot`,
`dashboardRules`, `tenant`. Os 18 vermelhos ambientais da suíte COMPLETA não foram perseguidos
(declarados não-bloqueantes pelo contrato); nenhum arquivo do território ficou vermelho.

### ⚠️ Achado 1 — `ERR_PNPM_IGNORED_BUILDS` reproduzido e resolvido

O `pnpm install` do worktree limpo **falhou com exit 1** e escreveu de volta o placeholder da R-8:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @sentry/cli@2.58.6, @sentry/cli@3.5.1
+  '@sentry/cli': set this to true or false      <- o pnpm escreveu isto no pnpm-workspace.yaml
```

⚠️ Nota que corrige o handoff da PONTE-FIX: o `pnpm-workspace.yaml` **commitado** em `b0f979e5`
está LIMPO — não tem o placeholder. Quem o escreve é o próprio `pnpm install` ao encontrar um
pacote com script de build não declarado. A sujeira é **gerada**, não versionada, e é por isso
que ela volta toda vez que alguém restaura o arquivo com `git checkout --`: o remédio da R-8
trata o sintoma e o defeito renasce no próximo install.

**O que eu fiz:** troquei o placeholder por uma decisão explícita — `'@sentry/cli': false`.
Não é chute: busca por `@sentry/cli` / `sentry-cli` em `apps/`, `packages/` e `functions/`
(package.json, configs e .mjs) devolve **zero ocorrência** — o pacote entra transitivamente e o
postinstall dele só baixa o binário de upload de source-map, que nada nesta casa invoca.

O artefato não muda: `allowBuilds` só decide se o postinstall roda, e nos dois casos (placeholder
ou `false`) ele **não** roda. O que muda é o exit code. Depois da troca:

```
pnpm install --config.verify-deps-before-run=false  →  exit 0 · "Lockfile is up to date" · "Already up to date"
```

**Fica worktree-local de propósito** (o worktree é descartável; mexer no `pnpm-workspace.yaml`
da main é mudança de código, fora do mandato de uma lane de deploy). ⛔ **Recomendação para o
dono/próxima lane de código:** commitar `'@sentry/cli': false` na main mata a recorrência da R-8
de vez, em uma linha.

### ⚠️ Achado 2 — o worktree pinado não deploya sem `functions/.env` (1ª tentativa MORREU aqui)

Primeira tentativa de deploy, **09:15:35Z → 09:16:03Z, falha limpa no predeploy, nada subiu**:

```
Running command: node functions/scripts/bundle-deploy.mjs
Error: ENOENT: no such file or directory, lstat 'C:\dev\leela-deploy-20260811\functions\.env'
Error: functions predeploy error: Command terminated with non-zero exit code 1
```

`functions/.env` é **gitignored** (`.gitignore:46`) e o `bundle-deploy.mjs:127` faz `cpSync` dele
para `functions-deploy/`. Ele existe na árvore principal e **não existe em worktree novo** — ou
seja, o padrão da casa "deploy sempre de worktree pinado" tem este pré-requisito não escrito.
Copiado da árvore principal, conferido por hash (`4e689cb3…`, idêntico), e **continua fora do
git** (`git status` do worktree segue mostrando só o `pnpm-workspace.yaml`).

O arquivo se declara **não-secreto** no próprio cabeçalho (segredos de produção moram no Secret
Manager; só `BREVO_SENDER_*`, `QR_TOKEN_KID_ATIVO` e `LEELA_PUBLIC_URL` vivem nele). Nenhum valor
foi impresso em log, chat ou neste handoff.

**Varredura preventiva que fiz na sequência** (para não repetir a surpresa nas etapas 2 e 3):
o único arquivo de env ausente no worktree era esse. `functions/.env.leela-hub`,
`apps/landing/.env.leela-hub` e o `.env.leela-hub` **da raiz** (que é o `envDir` do
`vite.config.ts` do painel, e portanto a fonte da config de Firebase do bundle) são **rastreados**
e vieram no checkout. A ressalva R-7 da REV-FINAL fica coberta pela flag `--mode leela-hub`.

### ⚠️ Achado 3 — o teto de 10 min matou a 2ª tentativa; a 3ª provou que ela quase terminou

| # | Janela | Comando | Resultado |
|---|---|---|---|
| 1 | 09:15:35→09:16:03 | `deploy --only functions` | ❌ predeploy (achado 2). **Nada subiu.** |
| 2 | 09:16:51→09:26:51 | `deploy --only functions` | ⏱️ **SIGTERM no teto de 600 s** do executor |
| 3 | 09:27:44→09:28:43 | `deploy --only functions` | **101 "Skipped (No changes detected)"** + 2 falhas |
| 4 | 09:36:13 | `deploy --only functions:ingressoPorLink` | ✅ exit 0 |
| 5 | ~09:37 | `deploy --only functions:getAfiliadosDoTenant` | ✅ `Successful update operation` · exit 0 |
| 6 | 09:38:49→09:39:35 | `deploy --only functions` (convergência) | ✅ **101 Skipped · 0 update · 0 create · 0 falha · `Deploy complete!` · exit 0** |

A rodada 3 é a que dá sentido à 2: quase tudo já estava "sem mudança", ou seja, **a rodada
interrompida tinha efetivado a maior parte das atualizações antes do SIGTERM**. Confirmei que o
estado não ficou corrompido antes de reagir — inventário logo após o timeout: **102 functions,
zero sumida, `onEventoWriteSaudeTenant` já criada**.

As duas falhas da rodada 3 (`getAfiliadosDoTenant`, `ingressoPorLink`) **não eram determinísticas**:
foram contenção com operações ainda em voo da rodada interrompida. As duas subiram sozinhas no
retry dirigido, sem nenhuma mudança de código ou config. Os 404 de
`artifactregistry…/packages/*` e `us.gcr.io` no `--debug` são **limpeza de imagem de build**, não
a causa da falha de update — ruído conhecido.

⛔ **Desvio a registrar:** o contrato pede FOREGROUND com teto de 600000 ms, e um deploy de 101
functions **não cabe nesse teto**. Eu não usei background: absorvi o timeout, conferi o estado e
convergi em série. Deu certo, mas por sorte de o corte ter caído numa fase reentrante. Para a
próxima lane, ou o teto sobe, ou o deploy de functions ganha lane própria — **um SIGTERM na fase
de upload teria deixado o bundle meio-enviado**.

### Inventário — antes × depois

| Medida | ANTES | DEPOIS |
|---|---|---|
| Functions no projeto | **101** | **102** |
| Novas | — | **`onEventoWriteSaudeTenant`** (gatilho v1 `onWrite` em `eventos/{eventoId}`) |
| Removidas | — | **nenhuma** |
| Convergência final | — | **101/101 "No changes detected"** (a 102ª é `ssrleelalanding`, v2, da landing — não pertence ao codebase `default`) |

⚠️ **Correção de premissa do contrato:** ele diz que a Onda 1 ADMIN-VISAO estava "retida desde
10/08". **Ela já estava em produção antes desta lane** — `agendarRecomputePlatformRollups` e
`listarClientesDoTenant` constam do inventário ANTES (101 = 99 do handoff ONDA1-DEPLOY + 2). O
handoff `leela-admin-visao-20260809-ONDA1-DEPLOY.md` está com as seções de prova em `_pendente_`:
o deploy aconteceu e a documentação não fechou. O que esta lane subiu por cima foi o **código
novo** dessas functions (fixes de cursor/pageSize, canário, cron explícito) mais ponte v2 e
métricas C1/C2.

### Prova do cron (Cloud Scheduler, API real)

```
firebase-schedule-agendarRecomputePlatformRollups-us-central1
        schedule = 15 * * * *      timeZone = America/Sao_Paulo      state = ENABLED
```

11 jobs agendados no projeto, todos ENABLED. O cron do rollup é o do commit `d8e4af8b`
(cron explícito + timezone da casa), e não o `every 60 minutes` anterior.

### ⛔ Backfill declarado — executado, e o número foi uma SURPRESA que investiguei antes de seguir

`recomputarSaudeDeTodosOsTenants(admin.firestore())`, via runner operacional em scratchpad
(fora do repo, sem resíduo), contra `functions/lib/.../agregarSaudeTenant.js` — o mesmo artefato
compilado que subiu. Credencial: ADC `authorized_user` derivada do refresh token do firebase-tools
(receita documentada da casa, arquivo em `%LOCALAPPDATA%\Temp\claude\adc-leela-hub.json`, **nunca
commitada**, apagada no fechamento). Travas do runner: aborta se qualquer `*_EMULATOR_HOST`
estiver no ambiente — conferido vazio, os emuladores 8080/9099 estavam de pé e **não** foram tocados.

**Contagem antes → depois:**

| Tenant | `gmvAcumulado` | `eventosAtivos` |
|---|---|---|
| `castelo-producoes` | **167.277 → 10** | **5 → 1** |

`retorno: tenants=1 escritos=1`.

**O backfill NÃO encheu um zero — ele DERRUBOU um número grande.** Isso é o oposto do que o
handoff `leela-metricas-pagantes-backend.md` previu ("GMV total deixa de ser R$ 0,00"), então
parei e medi a fonte antes de aceitar o resultado. Diagnóstico somente-leitura da coleção
`eventos` em produção:

```
TOTAL de eventos na colecao: 1
id                     tenantId            status      receitaConfirmada
teste-taxa-repassada   castelo-producoes   publicado                  10

eventos SEM tenantId: 0/1     Σ receitaConfirmada: 10
```

**Veredito: o backfill está certo e o valor antigo era mentira.** Produção tem UM evento, de
R$ 10, publicado. `gmvAcumulado=10` e `eventosAtivos=1` são a verdade da fonte. Os 167.277 e os 5
eventos eram **agregado órfão deixado pela purga** (LIMPEZA-PROD, ~2.873 documentos apagados em
10/08): a limpeza removeu os eventos e **não** recomputou o rollup do tenant, então o doc seguia
declarando GMV de R$ 167.277 e 5 eventos ativos que não existiam mais. Este backfill é
exatamente o que reconciliou isso.

**Idempotência provada por 2ª execução:** `retorno: tenants=1 escritos=0`, delta zero.

⛔ **Para o dono, e é a leitura que importa:** a expectativa do gate visual muda. `/plataforma/macro`
**não** vai mostrar um GMV grande aparecendo — vai mostrar **R$ 10,00 e 1 evento ativo**, que é o
estado real do projeto depois da purga. Se alguém esperava ver R$ 167 mil, esse número nunca teve
lastro em dado vivo. ⚠️ Achado colateral para a fila: **a purga não tem passo de recomputação de
agregado**; qualquer rollup futuro derivado de coleção purgada nasce com o mesmo defeito.

**Estado:** functions **deployadas, prova técnica OK**. Backend não tem gate visual próprio; o
efeito dele aparece nas telas que o maestro vai conferir depois da Etapa 3.

---

## Etapa 2 · api-client + landing ✅ DEPLOYADA, prova técnica OK, aguardando gate visual do maestro

Ordem obrigatória da REV da ponte cumprida na íntegra: pnpm destravado → árvore limpa → build por
dependência → gate de frescor → prova no dist do api-client → só então `next build` + deploy.

### Passo 1 · `ERR_PNPM_IGNORED_BUILDS` — resolvido no achado 1 da Etapa 1

`'@sentry/cli': false` declarado no `pnpm-workspace.yaml` do worktree; install exit 0. Detalhe,
razão e recomendação para a main estão na Etapa 1.

### Passo 2 · Árvore limpa + build por dependência

`git status --porcelain -uno -- packages apps` = **0 linhas** antes de construir.

```
pnpm exec turbo run build --filter='@leela/landing^...'
  → 3 successful, 3 total · 0 cached · 13.298s · exit 0
```

Usei o filtro `^...` (dependências de landing, SEM a landing) de propósito: o contrato manda provar
o `dist/` do api-client **antes** do `next build`, e com `@leela/landing...` o turbo construiria a
landing na mesma passada, sem janela para a sonda. Ordem resolvida pelo turbo:
`@leela/core` → `@leela/api-client` → `@leela/design-system`.

| Pacote | Artefato |
|---|---|
| `@leela/core` | `dist/index.js` 303,38 KB · `index.mjs` 290,39 KB (tsup avulso, pré-requisito do backfill da Etapa 1) |
| `@leela/api-client` | `dist/index.js` 102,59 KB · `index.mjs` 92,51 KB |
| `@leela/design-system` | `dist/` completo (index, dialog, server, rn, tailwind-preset) |

### Passo 3 · Gate de frescor — EXIT=0

```
node ../../scripts/verificar-frescor-do-workspace.mjs   (cwd = apps/landing)
[frescor] @leela/landing: 3 pacote(s) de workspace com dist/ à frente da fonte
          — @leela/api-client, @leela/core, @leela/design-system
EXIT=0
```

### Passo 4 · Prova no `dist/` do api-client, ANTES do `next build`

Sondas em símbolos de **runtime** (a armadilha da PONTE-FIX: `intencaoRegistrada` e `nomeAplicado`
são campos de *interface*, apagados pelo compilador — 0 neles é o resultado CERTO):

| Sonda | `index.js` | `index.mjs` | Referência PONTE-FIX |
|---|---|---|---|
| `promoverParaProfissional` | 4 | 3 | 4 / 3 ✅ |
| `nomeProfissional` | **3** | **3** | 0→3 / 0→3 ✅ |
| `intencao` | **3** | **3** | 0→3 / 0→3 ✅ |
| `nome_profissional_invalido` | **1** | **1** | 0→1 / 0→1 ✅ |
| `conta_inelegivel` | 1 | 1 | 1 / 1 ✅ |
| `intencaoRegistrada` | 0 | 0 | 0 / 0 ✅ (interface, apagada) |
| `nomeAplicado` | 0 | 0 | 0 / 0 ✅ (interface, apagada) |
| `xyzzy` (controle negativo) | **0** | **0** | ✅ |

Assinatura no dist, nos dois formatos: `async function promoverParaProfissional(opcoes)` —
**aridade nova**. Bate número a número com o handoff da PONTE-FIX.

### Passo 5 · Baseline no ar, medido ANTES de subir

Método de 09/08: o HTML não serve de prova (o flight data esconde strings). Baixei **todos os 25
chunks** referenciados por `<script src>` e `<link href>` de `/minha-conta` e contei dentro deles.

| Sonda | ANTES (no ar às 09:45) |
|---|---|
| `nomeProfissional` | **0** |
| `intencao` | **0** |
| `nome_profissional_invalido` | **0** |
| `conta_inelegivel` (controle positivo) | **2** |
| `promoverParaProfissional` (controle positivo) | **1** |
| `xyzzy` (controle negativo) | **0** |

As três strings da ponte v2 **não existiam no ar** até este deploy. Os dois controles positivos
já viviam lá (a 6ª recusa e a callable, de lanes anteriores) — é o que prova que a sonda estava
lendo os chunks certos, e não medindo vazio.

### Passo 6 · Deploy

```
node apps/landing/scripts/deploy-leela-hub.mjs
> firebase deploy --only hosting:leela-landing --project prod --config firebase.landing.json

✓ Compiled successfully · ✓ Generating static pages (12/12) · /minha-conta 8,71 kB / 356 kB
i  hosting[leela-landing]: found 100 files in .firebase\leela-landing\hosting
+  hosting[leela-landing]: file upload complete            (22 arquivos novos)
+  functions[…:ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: release complete
+  Deploy complete!
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0        09:47:47Z → 09:58:32Z  (10 min 45 s)
```

⛔ **Desvio 1 — config.** O contrato diz "cada `firebase deploy` com `--config firebase.prod.json`".
Para a landing isso é **impossível**: `firebase.prod.json` declara `site=leela-hub` →
`apps/painel/dist`; ele não conhece o site `leela-landing`. Usei `firebase.landing.json`, que é o
mesmo padrão config-por-propósito da casa, aponta para `--project prod` e declara **um único site
e mais nada** (sem `functions`, sem `firestore`, sem `storage`) — por construção não alcança o
painel nem o backend. Precedente: `leela-retomada-20260808-DEPLOY-FINAL.md`.

⛔ **Desvio 2 — background.** Rodei o deploy **destacado**, não em foreground. Razão medida, não
preferência: a lane levou **10 min 45 s** e o teto do executor é 10 min. Em foreground o SIGTERM
teria caído **exatamente durante o `updating … ssrleelalanding`** — deploy meio-feito, que é o
cenário que o próprio contrato manda evitar acima de tudo. Bloqueei esperando: **nada rodou em
paralelo**, nenhum watcher ficou vivo, o processo terminou sozinho com exit 0. Mesmo desvio, pela
mesma razão, que a DEPLOY-FINAL de 08/08 registrou para este mesmo comando.

⚠️ **Ruído conhecido, não-bloqueante** (idêntico a 05/08, 06/08 e 08/08): `Failed to find esbuild
with npx which`, `Failed to install esbuild`, `Unable to bundle next.config.js … proceeding with
deploy`. O build seguiu e achou os arquivos.

### 🔎 Achado NOVO — o gate de frescor NÃO roda no caminho de deploy

O firebase-tools avisou, em letras próprias:

```
WARNING: Your package.json contains a custom build that is being ignored.
Only the Next.js default build script (e.g, "next build") is respected.
```

A PONTE-FIX fiou o gate de frescor dentro do script `build` da landing
(`node ../../scripts/verificar-frescor-do-workspace.mjs && next build`) justamente para impedir
que um `dist/` velho embarcasse. **A integração webframeworks ignora esse script e roda `next
build` puro** — ou seja, o guarda existe para `pnpm build` e `turbo run build`, mas **não existe
no caminho que de fato sobe para produção**.

Nesta lane não houve exposição: eu rodei o gate à mão (EXIT=0) e reconstruí os três pacotes
minutos antes, e a prova byte a byte abaixo fecha a cadeia. Mas a **classe** que a PONTE-FIX quis
matar continua viva pela porta do deploy. ⛔ Card para a próxima lane de código: mover o gate para
um `predeploy` do `firebase.landing.json`, ou para dentro do `deploy-leela-hub.mjs` (que é o
funil real), e não confiar no `package.json#scripts.build`.

### Prova 1 · chunks trocados no ar — antes × depois

| chunk | ANTES | DEPOIS |
|---|---|---|
| **`333-…`** (carrega a ponte) | `333-292aeafb4b95e62e.js` | **`333-dd50f139a6429857.js`** |
| **`page-…` de `/minha-conta`** | `page-9fa6ff203c4c7b3f.js` | **`page-fd68f32ce09ec7f3.js`** |
| `main-app` | `main-app-a3edf82a1b6d0150.js` | `main-app-d90ba8ca94825e2c.js` |
| `870-` | `870-13385d65ca07f15d.js` | `870-348bb378406a5b2f.js` |
| CSS tema | `5c28c218c2cc65aa.css` | `7f07f1b1c916259d.css` |
| CSS componentes | `d89e678cd64bcb3e.css` | `6a40ee7790a510e8.css` |
| `81dfbdbac8790c5b.css`, `polyfills`, `webpack`, `e4548fa6`, `390bae33`, `976-`, `331-`, `99-`, `686-`, `28-` | — | **inalterados** (corretamente: não carregam a ponte) |

### Prova 2 · strings baixadas DO AR (não do build local)

| Sonda | ANTES | DEPOIS | Onde |
|---|---|---|---|
| `nomeProfissional` | 0 | **4** | `333-…` (3) + `page-…` (1) |
| `intencao` | 0 | **11** | `333-…` (3) + `page-…` (8) |
| `nome_profissional_invalido` | 0 | **5** | `333-…` (1) + `page-…` (4) |
| `conta_inelegivel` (controle positivo) | 2 | **2** | estável ✅ |
| `promoverParaProfissional` (controle positivo) | 1 | **1** | estável ✅ |
| `xyzzy` (controle negativo) | 0 | **0** | ✅ |

**O número que a PONTE-REV mediu como zero deixou de ser zero.**

### Prova 3 · o servido é byte a byte o construído

```
333-dd50f139a6429857.js   local ce2ab7796ead15a5fc7b3bdcde17483072dd51ac15386b0e8186178de76cd3a8
                          no ar ce2ab7796ead15a5fc7b3bdcde17483072dd51ac15386b0e8186178de76cd3a8   IDÊNTICO
page-fd68f32ce09ec7f3.js  local 5669fe9284b581c1f45ba1b19d574feaa27207b6d0391b83b4ed058e1e618835
                          no ar 5669fe9284b581c1f45ba1b19d574feaa27207b6d0391b83b4ed058e1e618835   IDÊNTICO
```

### Prova 4 · smokes (leitura)

| # | Alvo | Resultado |
|---|---|---|
| 1 | `/` | http=200 · text/html · 25.709 B |
| 2 | `/minha-conta` | http=200 · text/html · 15.300 B · 0,38 s |
| 3 | `/health` | http=200 · application/json |
| 4 | controle · `_next/static/chunks/xyzzy0811.js` | **http=404** |

O smoke 4 importa: aqui o 404 é 404 de verdade (a landing não tem rewrite SPA de estático), então
o 200 dos chunks reais não é falso positivo — armadilha oposta à do painel, onde o rewrite devolve
200 com `text/html`.

**Estado: deployada, prova técnica OK, aguardando gate visual do maestro.**

---

## Etapa 3 · Painel ✅ DEPLOYADO, prova técnica OK, aguardando gate visual do maestro

### Baseline — o painel estava INTEIRO no estado pré-redesign

Medido no ar antes de qualquer build:

```
index.html  →  /assets/index-_EVW2ljU.js   sha256 a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d
               /assets/index-3PlkfKJK.css  sha256 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8
```

| Sonda | ANTES |
|---|---|
| `--rail-width` | **0** |
| `--chart-accent` | **0** |
| `data-glass` | **0** |
| `Rubik` | **0** |
| `Exo 2` | 3 (o token único pré-redesign) |
| `primary-500` | 9 |
| `Engajamento` (JS) | **0** |

⚠️ **Nota de estado que o contrato não previa:** o `index-_EVW2ljU.js` é o bundle **anterior** ao
deploy REDESIGN-DS de 10/08 (aquele handoff registra `_EVW2ljU` como o "ANTES" e `NiMJIszs` como o
"DEPOIS"). Ou seja, o painel em produção **não** carregava o redesign-DS quando esta lane começou —
coerente com o incidente da tela-preta de 10/08 e o retorno ao bundle conhecido-bom. Consequência
prática: este deploy não é um delta pequeno, é **o redesign inteiro entrando de uma vez**, e o
gate visual do maestro deve ser conduzido com essa expectativa.

### Build — ordem da REV-FINAL respeitada

```
1. npx tsup            (packages/design-system)            → exit 0
2. gate de frescor     (cwd apps/painel)                   → EXIT=0
   "@leela/painel: 3 pacote(s) com dist/ à frente da fonte — api-client, core, design-system"
3. npx vite build --mode leela-hub   (apps/painel)         → exit 0 · ✓ built in 14.66s
```

Artefatos: `index-BuNH0eyQ.js` 2.286,74 kB (gzip 608,78) · `index-sDPZyP0B.css` 141,01 kB
(gzip 20,87) · `browser-BXdiCFWD.js` 24,53 kB (inalterado).

### ⚠️ R-7 conferida no artefato, não na intenção

A ressalva R-7 diz que sem `--mode leela-hub` o bundle sai sem configuração de Firebase, compila e
não fala com o backend. Não bastou passar a flag — medi o resultado dentro do bundle construído,
**antes** de subir:

| Sonda no JS | Ocorrências |
|---|---|
| `VITE_FIREBASE_PROJECT_ID:"leela-hub"` | **presente** |
| `leela-hub.firebaseapp.com` (authDomain) | **1** |
| `leela-hub.firebasestorage.app` (bucket) | **1** |
| `76126035891` (sender id) | 2 |
| `localhost:8080` / `127.0.0.1:8080` | **0 / 0** |

O `demo-leela` aparece 4×, e **não é a config ativa**: é a constante `DEMO_CONFIG` do guarda
fail-closed, cuja própria mensagem no bundle diz *"({ useEmulator: false }) exige firebaseConfig.
DEMO_CONFIG (demo-leela) é permitido apenas com useEmulator: true"*. A única literal
`projectId:"…"` do bundle é a da constante demo; a config real viaja no objeto de
`import.meta.env` com as chaves `VITE_FIREBASE_*`. **R-7 satisfeita por medição.**

### Deploy

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive

i  hosting[leela-hub]: found 15 files in apps/painel/dist
+  hosting[leela-hub]: file upload complete        (3 arquivos novos)
+  hosting[leela-hub]: version finalized · release complete
+  Deploy complete!
DEPLOY_EXIT=0        10:02:56Z → 10:03:26Z  (30 s)
```

Alvo único: `firebase.prod.json` declara `hosting.site = leela-hub` → `apps/painel/dist`, e
`--only hosting` exclui functions/firestore/storage do mesmo arquivo. Nenhum comando desta etapa
tocou backend.

### Prova 1 · hash do bundle — antes × depois

| asset | ANTES | DEPOIS |
|---|---|---|
| JS | `index-_EVW2ljU.js` | **`index-BuNH0eyQ.js`** |
| CSS | `index-3PlkfKJK.css` | **`index-sDPZyP0B.css`** |

### Prova 2 · o servido é byte a byte o construído

```
index-BuNH0eyQ.js    local b97647eeaf7131cc5dc5941369df728800a84dbc1efd21e9adf65c325da0bf2b
                     no ar b97647eeaf7131cc5dc5941369df728800a84dbc1efd21e9adf65c325da0bf2b   IDÊNTICO
index-sDPZyP0B.css   local f81c5190e1a55b912db7d9b7b8eb69e0ba3b3937fc029b8448b17478adb4e862
                     no ar f81c5190e1a55b912db7d9b7b8eb69e0ba3b3937fc029b8448b17478adb4e862   IDÊNTICO
browser-BXdiCFWD.js  local 7e89b6da537b2218d27aa5c1a028b57eea8f852d2cdaaa1d29f5db76fdff9d3c
                     no ar 7e89b6da537b2218d27aa5c1a028b57eea8f852d2cdaaa1d29f5db76fdff9d3c   IDÊNTICO
```

### Prova 3 · tokens novos no CSS **baixado do ar**

| Sonda | ANTES | DEPOIS |
|---|---|---|
| `--rail-width` | 0 | **10** |
| `--chart-accent` | 0 | **8** |
| `data-glass` | 0 | **2** |
| `Rubik` | 0 | **2** |
| `Exo 2` | 3 | 2 |
| `primary-500` | 9 | **12** |
| `Engajamento` (no JS do ar) | 0 | **4** |
| `xyzzy` (controle negativo) | 0 | **0** |

Declarações servidas de produção:

```
--chart-accent: var(--primary-500);
--chart-accent: var(--accent-400);
```

⚠️ O `--chart-accent` existe em **duas** declarações (escopos de tema diferentes). O contrato só
citava `var(--primary-500)`, que está lá. Registro o segundo porque a memória do maestro tem um
vetável aberto sobre `chart.accent` (`#FF6520` × `#FF450C`): **a decisão de cor continua aberta e
não foi tocada por mim** — subiu exatamente o que o merge continha.

### Prova 4 · smokes, com o controle que evita o falso positivo do rewrite

| # | Alvo | http | tipo | bytes |
|---|---|---|---|---|
| 1 | `/` | 200 | text/html | — |
| 2 | `/clubes/engajamento` | 200 | text/html | — |
| 3 | `/plataforma/macro` | 200 | text/html | — |
| 4 | `/assets/index-BuNH0eyQ.js` (novo) | 200 | **text/javascript** | **2.291.223** |
| 5 | `/assets/index-_EVW2ljU.js` (antigo) | 200 | **text/html** | **475** |
| 6 | controle · `/assets/xyzzy0811.js` (nunca existiu) | 200 | **text/html** | **475** |

O smoke 6 é o que dá sentido ao 5: um arquivo que **nunca existiu** responde byte a byte igual ao
bundle antigo — logo aquele 200 é o rewrite SPA, e não "o bundle velho ainda servindo". O bundle
antigo **saiu** do release.

### Prova 5 · HOSTING-CACHE ativo (o conserto do incidente de 10/08)

```
/                          Cache-Control: no-cache
/assets/index-BuNH0eyQ.js  Cache-Control: public, max-age=31536000, immutable
/assets/index-sDPZyP0B.css Cache-Control: public, max-age=31536000, immutable
```

A causa provada da tela-preta de 10/08 foi cache. O header que a fecha está no ar nesta release —
conferido, não presumido.

⛔ **NÃO declaro "no ar".** Estado: **deployado, prova técnica OK, aguardando gate visual do
maestro.** A conferência renderizada de produção (extensão/navegador) é etapa dele, depois de mim.
Toda prova acima é estática: hash, header, string e status — nenhuma delas vê pixel, e a casa já
pagou caro por confundir as duas coisas.

---

## Etapa 4 · Fechamento técnico ✅

### Canal de preview `redesign-v2` — re-deployado com o build mergeado

```
npx firebase-tools@13 hosting:channel:deploy redesign-v2 --project prod --config firebase.prod.json --expires 30d

+  hosting[leela-hub]: version finalized · release complete
+  hosting:channel: Channel URL (leela-hub):
   https://leela-hub--redesign-v2-e5ptbqp7.web.app   [expires 2026-09-10 07:05:38]
CHANNEL_EXIT=0        10:05:29Z → 10:05:45Z (16 s)
```

Mesmo channel id, como o contrato pediu. **Canal e produção provados idênticos**, e não presumidos:

```
index-BuNH0eyQ.js    prod  b97647eeaf7131cc5dc5941369df728800a84dbc1efd21e9adf65c325da0bf2b
                     canal b97647eeaf7131cc5dc5941369df728800a84dbc1efd21e9adf65c325da0bf2b   IDÊNTICO
index-sDPZyP0B.css   prod  f81c5190e1a55b912db7d9b7b8eb69e0ba3b3937fc029b8448b17478adb4e862
                     canal f81c5190e1a55b912db7d9b7b8eb69e0ba3b3937fc029b8448b17478adb4e862   IDÊNTICO
```

Smoke do canal: `/` http=200 · text/html. O dono acorda com canal e produção servindo o mesmo byte.

### Servidores e emuladores — estado final

Conferi PID **antes** de matar (PID reciclado é o jeito clássico de matar o processo errado); os
quatro batiam com o contrato.

| Porta | PID | Ação | Estado final |
|---|---|---|---|
| 8080 (Firestore emulator, `java.exe`) | 25452 | **MATADO** | ✅ ÊXITO · porta livre |
| 9099 (Auth emulator, `node.exe`) | 26412 | **MATADO** | ✅ ÊXITO · porta livre |
| 4599 (`node.exe`, incidente fechado) | 25384 | **MATADO** | ✅ ÊXITO · porta livre |
| **4601** (`node.exe`, validação local do dono) | **19132** | **PRESERVADO** | ✅ **VIVO**, LISTENING |

`netstat` final: apenas `:4601` em LISTENING (PID 19132). Os três PIDs mortos confirmados por
`tasklist`.

### Higiene de credencial

`%LOCALAPPDATA%\Temp\claude\adc-leela-hub.json` e o access token temporário **apagados**,
conferidos ausentes. Nada de credencial entrou em commit, log, chat ou handoff — só o formato da
receita (que já é público e documentado na casa).

### Árvore principal intocada

```
cd C:\dev\LEELA
git status --porcelain -uno -- packages apps functions scripts pnpm-workspace.yaml   → 0 linhas
```

Não commitei nada, não fiz push, não usei `stash` nem `amend`. Todo o trabalho aconteceu no
worktree pinado.

### ⚠️ A main andou DURANTE o deploy — e não invalida nada

Quando fui fechar, a árvore principal estava em **`25da1ad8`**, e não no `b0f979e5` que eu pinei:
a lane ROADMAP-COMPONENTES aterrissou 11 commits enquanto eu deployava.

Conferi se isso deixava produção defasada, e **não deixa**:

```
git diff --stat b0f979e5 25da1ad8 -- packages apps functions scripts pnpm-workspace.yaml package.json turbo.json
   → VAZIO
```

Os 11 commits são **exclusivamente** docs, specs, cânone, boards e handoffs
(`leela-specs/**`, 15 arquivos, +1574/−22). **Zero linha de código, config ou script.** Portanto o
que está em produção continua sendo, byte a byte de build, o código do HEAD atual da main.

Isto reforça a escolha do pino registrada na Etapa 0: com o artefato empatado, o critério foi
procedência — e a procedência seguiu válida mesmo com a main andando embaixo da lane.

### Worktree — mantido de propósito

`C:\dev\leela-deploy-20260811` **NÃO** foi removido. Decisão, não esquecimento: o gate visual do
maestro é a próxima etapa e pode voltar com defeito; manter a árvore pinada com `node_modules`,
`dist/`, `functions-deploy/` e `.firebase/` prontos economiza um ciclo inteiro de install+build
num eventual fix. A única modificação rastreada nela é a linha `'@sentry/cli': false`.

Quando o maestro fechar o gate, a remoção é:

```
git worktree remove --force C:/dev/leela-deploy-20260811
# se acusar "Directory not empty" (node_modules/dist), apagar a pasta na mão — precedente de 10/08
```

---

# Fechamento — placar da lane

| Etapa | Estado | Prova-chave |
|---|---|---|
| 0 · Pino | ✅ | `b0f979e5`; árvores `packages`/`apps`/`functions`/`scripts` idênticas ao merge `b51cdcd9` |
| 1 · Functions | ✅ **deployadas** | convergência **101/101 "No changes detected"**, exit 0; `onEventoWriteSaudeTenant` criada; cron `15 * * * *` SP ENABLED |
| 1b · Backfill | ✅ **executado** | `tenants=1 escritos=1` → **gmv 167.277→10, eventosAtivos 5→1**; 2ª rodada `escritos=0` (idempotente) |
| 2 · api-client + landing | ✅ **deployada, aguardando gate visual** | `nomeProfissional` 0→4, `intencao` 0→11, `nome_profissional_invalido` 0→5 no ar; 2 chunks byte a byte idênticos |
| 3 · Painel | ✅ **deployado, aguardando gate visual** | `_EVW2ljU`→`BuNH0eyQ`; 3 assets byte a byte idênticos; `--rail-width` 0→10, `--chart-accent` 0→8 |
| 4 · Fechamento | ✅ | canal == produção byte a byte; 8080/9099/4599 mortos, **4601 vivo** |

⛔ **NENHUMA superfície de hosting está declarada "no ar".** As duas (landing e painel) estão
**deployadas com prova técnica**, e o gate visual renderizado de produção é do maestro.

## Desvios registrados

1. **Background no deploy da landing** — a lane levou 10 min 45 s contra teto de 10 min do
   executor. Em foreground o SIGTERM cairia dentro do `updating ssrleelalanding`. Bloqueei
   esperando; nada rodou em paralelo. Precedente idêntico em 08/08.
2. **`firebase.landing.json` no lugar de `firebase.prod.json`** para a landing — o
   `firebase.prod.json` não conhece o site `leela-landing`; é fisicamente impossível cumprir a
   regra ao pé da letra. Config usada declara um site só, `--project prod`.
3. **Timeout absorvido no deploy de functions** (rodada 2). Estado conferido antes de reagir,
   convergido em série. Sem background.
4. **`'@sentry/cli': false`** no `pnpm-workspace.yaml` do worktree — destrava o passo 1 do
   contrato sem alterar artefato.
5. **`functions/.env` copiado** da árvore principal para o worktree — gitignored, exigido pelo
   `bundle-deploy.mjs`, sem ele não existe deploy de functions a partir de worktree.

## Para a próxima lane (achados que não são meus para consertar)

1. ⛔ **O gate de frescor não roda no caminho de deploy da landing.** O firebase-tools ignora o
   script `build` do `package.json` e roda `next build` puro. A guarda da PONTE-FIX protege
   `pnpm build`/`turbo`, e **não** o funil que sobe para produção. Mover para `predeploy` do
   `firebase.landing.json` ou para dentro do `deploy-leela-hub.mjs`.
2. ⛔ **A purga não recomputa agregado.** O `gmvAcumulado` de 167.277 sobreviveu à LIMPEZA-PROD
   apontando para eventos que não existiam mais. Qualquer rollup derivado de coleção purgada
   nasce com o mesmo defeito. Passo de recomputação tem de entrar no procedimento de purga.
3. **`'@sentry/cli': false` na main** mata a recorrência da R-8 em uma linha; o remédio atual
   (`git checkout --`) trata sintoma e o defeito renasce no próximo install.
4. **Deploy de functions não cabe em 10 min.** Ou o teto sobe, ou vira lane própria — desta vez o
   corte caiu numa fase reentrante por sorte, não por desenho.
5. **`leela-admin-visao-20260809-ONDA1-DEPLOY.md` está com provas em `_pendente_`** embora o
   deploy tenha acontecido. Vale fechar para o inventário não mentir de novo.
6. **`--chart-accent` tem duas declarações** no CSS servido (`var(--primary-500)` e
   `var(--accent-400)`). O vetável de cor do dono segue aberto e intocado por mim.

## Nada foi violado

Não deployei Rules, índices, storage nem Firestore · não rodei deploy sem `--only` · não toquei
Firestore fora do backfill declarado · não editei código de produto · não commitei nem pushei ·
não abri navegador (toda prova por `curl`/`sha256sum`/`grep`/API) · não declarei "no ar" ·
`:4601` preservado.

**Status: lane concluída. Aguardando o gate visual do maestro.**
