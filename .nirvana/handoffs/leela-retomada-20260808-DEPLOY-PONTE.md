# DEPLOY-PONTE — handoff vivo

- **Lane:** `DEPLOY-PONTE` · **Trace:** `leela-retomada-20260808`
- **Employee:** `sf-platform-lead` (software-forge)
- **Repo:** `C:\dev\LEELA` · branch `main` · **HEAD a publicar:** `aaf1673a` (== `origin/main`)
- **Projeto:** alias `prod` = `leela-hub` · config `firebase.prod.json` · landing por `firebase.landing.json`
- **Início:** 2026-08-08 21:53 -0300
- **Regra da lane:** não altero código, não rodo suíte. Falha 2× pelo mesmo motivo ⇒ PARO e reporto.

---

## Passo 0 · O portão, conferido no texto e não no recado

O dispatch exige veredito escrito. Li o topo de
`.nirvana/handoffs/leela-retomada-20260808-PONTE-REV.md`:

> **VEREDITO: APROVADA COM RESSALVAS** — "A ponte pode subir. (…) As ressalvas são duas, e
> **nenhuma é regressão** (…). O que **muda** para a DEPLOY-PONTE: nada no artefato."

As duas ressalvas estão registradas como item do dono no painel canônico
(`leela-specs/01-produto/DECISOES-ABERTAS.md`), com a não-obstrução dita por escrito:

- **PONTE-NOME-1** (linha 69) — o tenant nasce com o nome próprio e não há caminho de renomeação;
- **PONTE-ELEGIVEL-1** (linha 81) — a ponte aceita duas classes de conta que o resgate recusa;
- **PONTE-CTA-1** (linha 56) ganhou uma quarta opção, não é item novo.
- Cabeçalho do painel, linha 29: *"Nenhum dos dois trava o deploy da ponte, e a review disse isso
  com todas as letras."*

**Portão aberto.** Nada a corrigir em código antes de publicar.

`origin/main == HEAD == aaf1673a` — os sete commits do escopo estão publicados no remoto:
`35a85f04` (ponte) · `ca72625c`, `0641e7f6`, `71635421` (PONTE-RET) · `b60f307b`, `299eabd3`,
`aaf1673a` (PONTE-REV).

---

## Passo 1 · O baseline — extraído dos handoffs, não da memória

Fontes: `.nirvana/handoffs/leela-deploy-pacote-20260806.md` (pacote das 17:20) e
`.nirvana/handoffs/leela-redeploy-painel-20260806.md` (redeploy do painel, 18:46→18:49).

| Artefato | O que está no ar hoje | Publicado em | HEAD de origem |
|---|---|---|---|
| **Painel** `leela-hub.web.app` | `index-C2icjqor.js` + `index-DufB2CDQ.css` | 06/08 **18:48:50** | `b5e30b32` |
| **Landing** `leela-landing.web.app` | `main-app-24c4fa540a35e5d0` (+ 19 chunks) | 06/08 **17:41** | `133ef123` |
| **Firestore rules** | ruleset `8c056b22-ff25-496e-9bc3-fbb2c271505e` (2026-08-06T20:41:07Z) | 06/08 17:41:10 | `133ef123` |
| **Storage rules** | ruleset `34131880-…` (05/08), **não tocado em 06/08** | 05/08 | — |
| **Índices** | **não deployados** em nenhuma das duas lanes de 06/08 | — | — |
| **Functions** | 12 funções (1 create + 11 update) | 06/08 **17:42:08→17:45:03** | `133ef123` |
| Functions (rodada anterior) | 21 funções | 05/08 20:49Z | `846ce8ee` |

**A âncora de functions desta lane é `133ef123`** — o HEAD da última publicação de functions. Não é
`b5e30b32` (aquela lane só tocou o site do painel: *"Landing, rules, storage, índices e functions
não foram tocados"*).

Chunks da landing no ar, para a prova por hash (medidos no ar às 17:18 de 06/08 e trocados às 17:41):

```
main-app-24c4fa540a35e5d0   870-7d97b29525175355        333-44407093a280634d
686-8892f7fd68283960        app/(public)/layout-292e8548e3ebb3e6
app/error-bac1e9d6f20c5445  app/global-error-30913483bbf24a70
app/not-found-7e05e55da66a985c
426-6aca2ca8da0af8b3        54-99a513ec4b38d891         976-29277ae4440b3fed
estáveis: webpack-cc97c7a268553d36 · polyfills-42372ed130431b0a · 28-a652b067a0f14de5 ·
          331-5e1e511f5c5635b0 · 390bae33-e53f40ee2b34724c · 415a2810-4859d7aa03e109af ·
          4a2876f6-9570b6a6e15b4ea3 · e4548fa6-4946aa450cec0ab6 ·
          app/(public)/page-1f5d185b7a07926a
```

Dois avisos herdados dos handoffs, registrados para não virarem falso alarme:
1. **Hash de CSS igual pode estar certo** — em 06/08 o CSS do painel não trocou de nome porque o
   delta era só de classe aplicada no JSX. Se acontecer de novo, explico por quê.
2. **Chunk antigo devolve 200** por causa do rewrite SPA; só o `content-type` distingue "ainda
   servido" de "capturado pelo rewrite".

---

## Passo 2 · Inventário do bundle de functions — o que sobe de carona

Deploy de functions é bundle esbuild único, então medi **função por função** o que mudou entre a
âncora real (`133ef123`) e HEAD.

```
> git diff --stat 133ef123..HEAD -- functions/src ':(exclude)functions/src/__tests__/**'
 functions/src/index.ts                             |   6 +
 functions/src/platform/promoverParaProfissional.ts | 274 +++++++++++++++++++++
 2 files changed, 280 insertions(+)
```

**Duas mudanças, e as duas são a própria ponte.** O `index.ts` mudou por **um único export novo**:

```diff
+export { promoverParaProfissional } from './platform/promoverParaProfissional';
```

Os outros quatro arquivos do diff bruto são `functions/src/__tests__/**` — não entram no bundle.

Dependências compartilhadas, conferidas para não deixar carona escondida:

| Alvo | Mudou desde `133ef123`? | Entra no bundle? |
|---|---|---|
| `packages/core` | **não** (diff vazio) | — |
| `packages/api-client` | sim (+85: `platform/profissionais.ts` + barril) | **não** — não consta em `functions/package.json`; as únicas ocorrências em `functions/src` estão em `__tests__/` |
| `firestore.rules` | **não** (diff vazio) | — |
| `firestore.indexes.json` | **não** (diff vazio) | — |
| `storage.rules` | **não** (diff vazio) | — |

**Conclusão do inventário: nada sobe de carona.** O recorte `--only functions:promoverParaProfissional`
publica bundle novo em **uma** função — e ela é nova, então não há comportamento anterior a
regredir. As outras 97 continuam servindo o bundle que já serviam.

### Índices — a pergunta respondida explicitamente

**Este deploy NÃO exige índice novo.** Duas razões independentes:

1. `firestore.indexes.json` **não mudou** desde a última publicação.
2. A callable não faz *query*. O único acesso a Firestore é por **referência de documento**:
   `db.collection(COLECAO_PROFISSIONAIS).doc(caller.uid)` (`promoverParaProfissional.ts:230`),
   lido e escrito dentro de transação. `get` por docId nunca consome índice composto.

Nenhum `fieldOverride` entra nesta lane. A lição do COLLECTION_GROUP que apagou o índice COLLECTION
de `entrarNoDesafio` fica registrada como não-aplicável aqui, e não como esquecida.

### Rules — já estão no ar, e por isso não subem

O caminho de leitura de que a ponte depende (`firestore.rules:2920`,
`allow read: if isSignedIn() && request.auth.uid == profId` em `profissionais/{profId}`) é
**anterior** a `133ef123` e o handoff de 06/08 provou que o publicado é byte a byte o arquivo
(sha256 `935ba2626d1c6819`, 167.691 bytes). Como o arquivo não mudou desde então, **o que está no ar
é o arquivo de hoje**. Nada de rules nesta lane.

---

## Passo 3 · Sequenciamento com a REV-VITRINE

A REV-VITRINE está **viva** em `apps/painel` neste minuto. Conferido no handoff dela
(`.nirvana/handoffs/leela-retomada-20260808-REV-VITRINE.md`): veredito já escrito
(**APROVADA COM RESSALVAS**, 3 defeitos provados), mas **T3 em curso (🔄)** e **T4 pendente (⏳)**,
com três arquivos modificados na árvore:

```
 M apps/painel/src/routes/onboarding/__tests__/veu-buildado.test.ts
 M apps/painel/src/routes/onboarding/__tests__/vitrine-sem-query.test.tsx
 M apps/painel/src/routes/onboarding/_data/onboarding.ts
?? apps/painel/src/routes/onboarding/__tests__/gate-de-papel.test.ts
```

Ela **mede no buildado** do painel, que consome `packages/design-system`. Um `tsup` do DS no meio
disso é corrida real. Então:

1. **Functions primeiro** — o predeploy é `tsc` de `functions` + `bundle-deploy.mjs`; não toca
   `packages/design-system` nem `packages/core` (que, aliás, não mudou). Sem corrida.
2. **Landing só depois que a REV-VITRINE fechar.**

RAM no início: **1,97 GB livres de 7,94 GB**. Um processo por vez.

---

## Passo 4 · Functions ✅ NO AR (21:57:04 → 21:59:01)

### Estado ANTES, medido em produção — a porta era mesmo um 404

```
POST https://us-central1-leela-hub.cloudfunctions.net/promoverParaProfissional
  -> http=404   "Error: Page not found"

[controle vivo]   setPlatformAdminCapability  -> http=401  {"message":"Requer autenticação.","status":"UNAUTHENTICATED"}
[controle morto]  naoExisteEssaFuncao0808     -> http=404
```

O controle vivo em 401 e o morto em 404 mostram que a sonda distingue **existente** de
**inexistente**. Ou seja, o 404 da callable não era ruído: **o botão da ponte, se a landing
subisse antes, cairia num 404 real** — exatamente o risco que ordenou functions primeiro.

### O comando

```
> npx firebase-tools@13 deploy --only functions:promoverParaProfissional \
      --project prod --config firebase.prod.json --non-interactive

Running command: npm --prefix functions run build      -> tsc, exit 0
Running command: node functions/scripts/bundle-deploy.mjs
[bundle-deploy] OK → C:\dev\LEELA\functions-deploy
+  functions: Finished running predeploy script.
i  functions: packaged C:\dev\LEELA\functions-deploy (342.98 KB) for uploading
i  functions: creating Node.js 20 (1st Gen) function promoverParaProfissional(us-central1)...
+  functions[promoverParaProfissional(us-central1)] Successful create operation.
+  Deploy complete!
FUNCTIONS_DEPLOY_EXIT=0
```

**1 create, 0 update, 0 retry, 0 falha isolada.** O recorte `--only functions:<uma>` publicou bundle
novo em **uma** função; as outras 98 seguem servindo o bundle que já serviam. O inventário do Passo 2
previu exatamente isto, e o resultado confirmou.

### Prova 1 · a função existe, está ACTIVE e tem número

```
> npx firebase-tools@13 functions:list --project prod --json
  total de funções deployadas: 99      (eram 98 antes desta lane — entrou exatamente uma)

  id:            promoverParaProfissional
  state:         ACTIVE
  platform:      gcfv1        runtime: nodejs20      region: us-central1
  hash:          bf1108862d747f12ef41515eddc52bf4270f7ea9
  uri:           https://us-central1-leela-hub.cloudfunctions.net/promoverParaProfissional
  trigger:       callable     securityLevel: SECURE_ALWAYS
```

O `hash` (`firebase-functions-hash`) é o identificador do bundle publicado nesta revisão — é o
número que o CLI expõe para 1ª geração. A coluna "Version" do `functions:list` tabular diz `v1`, que
é **geração**, não revisão: registrado para ninguém confundir os dois numa próxima leitura.

### Prova 2 · a callable responde, e a recusa é nomeada (3 sondagens)

```
21:59:12   promoverParaProfissional  http=401
  {"error":{"details":{"motivo":"sem_sessao"},"message":"Entre na sua conta para continuar.","status":"UNAUTHENTICATED"}}
21:59:25   idem
21:59:38   idem
[controle] naoExisteEssaFuncao0808   http=404  nas três rodadas
```

Sondei três vezes por causa do **D-3 de 06/08** (403 transitório de IAM logo após um `create`).
**Não houve 403 em nenhuma rodada** — o IAM propagou antes da primeira sondagem.

Esta sonda prova mais do que "existe". Ela prova **em produção** o que a PONTE-REV mediu como o
risco real do vetor 12: o `details.motivo` **sobrevive à serialização** do `wrapOnCallHandler`. Se o
`instanceof HttpsError` tivesse falhado no bundle publicado (o DEF-B da ONBOARD-REV), a resposta
teria vindo `internal` com a mensagem apagada. Veio `sem_sessao`, tipada, com a frase de produto.
**Nenhuma escrita em produção:** a recusa acontece antes de qualquer acesso ao banco. Não criei
conta nem promovi ninguém.

### Prova 3 · a conferência de prontidão do próprio repositório

`node functions/scripts/prontidao-de-deploy.mjs` (read-only, arquivo × servidor), rodado **depois**
do deploy — **VEREDITO: PRONTO**, 7 OK + 1 atenção:

| Check | Resultado |
|---|---|
| **C1 · índices compostos** | **arquivo 18 × servidor 18 — nada no arquivo falta no servidor** |
| **C2 · fieldOverrides** | **arquivo 8 × servidor 8, override a override** |
| C3 · rules do Firestore | ruleset `8c056b22-…` (2026-08-06T20:41:07Z), idêntico ao arquivo (sha256 `935ba2626d1c6819`) |
| C4 · rules do Storage | ruleset `34131880-…` (2026-08-05T20:42:49Z), idêntico ao arquivo |
| C5 · IAM cross-service | `roles/firebaserules.firestoreServiceAgent` concedido |
| C6 · segredos | 7/7 existem no Secret Manager |
| C7 · artefatos × fonte | **ATENÇÃO** — `api-client` 423 min atrás da fonte; `apps/painel` 21 min atrás |
| C8 · guarda estática de índices | 39 variantes de query, 18 índices, toda query com `where+orderBy` coberta |

C3 e C4 **confirmam o baseline que escrevi no Passo 1 antes de medir** — a âncora está certa desta vez.

**A C7 não foi ignorada, foi paga:** o `api-client` atrasado é o Passo 5 abaixo (e era um defeito
real de deploy, não um falso alarme de mtime). O `apps/painel` atrasado era a REV-VITRINE em voo, e o
painel **não é escopo desta lane** — ver Passo 6.

### Índices — a declaração explícita

**Este deploy não pediu índice novo, e a C1/C2 confirmam contra o servidor.** Nenhum `fieldOverride`
foi tocado, então a lição do COLLECTION_GROUP que quase derrubou `entrarNoDesafio` **não se aplica
aqui** — e fica registrada como não-aplicável, não como esquecida.

---

## Passo 5 · Preparação da landing — a armadilha de rebuildar de menos, medida

A REV-VITRINE aterrissou às ~22:00 (`182d2852`, `1defe563`, `998cea5f`, `df3bfb28`, `a0852e76`).
**Re-medi a árvore em vez de confiar no resumo**, e ela bate: os cinco commits tocam
`apps/painel/src/routes/onboarding/**`, dois boards/specs e um handoff. **Zero em `packages/`,
zero em `apps/landing`.** O inventário do Passo 2 continua válido palavra por palavra.

**HEAD passa a ser `a0852e76` (== `origin/main`).** Árvore limpa no território de build; só o
`?? functions/lib/` untracked, que é a saída do `tsc` e já constava assim no handoff de 06/08.

### O que precisa de rebuild, medido pacote a pacote

Contra `133ef123`, que é o HEAD do último deploy da landing:

| Pacote | Mudou desde o ar? | `dist/` está atrás da fonte? | Rebuild? |
|---|---|---|---|
| `packages/core` | **não** | não | **não** |
| `packages/design-system` | sim — só `a06c16d4` (o `<main>` do AppShell) | **não** — o `dist/` é de 06/08 18:47, posterior ao commit | **não** |
| `packages/api-client` | **sim** (+85: `platform/profissionais.ts` + barril) | **SIM** | **SIM** |

Que o DS não precise de `tsup` é medição, não conveniência: `find packages/design-system/src -newer
packages/design-system/dist/index.mjs` devolve **vazio**. O `dist/` no disco já contém `a06c16d4`,
porque a lane de 06/08 18:47 o construiu depois dele. **Efeito colateral bom: esta lane nunca
precisou tocar `packages/design-system`,** então a corrida com a REV-VITRINE nunca chegou a existir.

### O defeito que a C7 pegou — e que teria publicado um botão morto

`apps/landing/app/(public)/minha-conta/PortasDaConta.tsx:76-77` importa
`promoverParaProfissional` e `motivoDaRecusaDaPromocao` de `@leela/api-client`. E o pacote resolve
por **`dist`**, não por fonte:

```json
"exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.js" } }
```

Estado do `dist/` **antes** do rebuild:

```
dist/index.js   'promoverParaProfissional' : 0
dist/index.mjs  'promoverParaProfissional' : 0
```

**Zero.** Um build da landing sobre esse `dist/` não teria o símbolo que a tela importa. É
exatamente a armadilha que o runbook nomeia — rebuildar de menos —, e desta vez ela estava armada.

```
> cd packages/api-client && npx tsup          (22:03:21 -> 22:03:25)
ESM dist\index.mjs 86.42 KB · CJS dist\index.js 95.65 KB · DTS 151.32 KB
APICLIENT_TSUP_EXIT=0

dist/index.js   promoverParaProfissional=3  motivoDaRecusaDaPromocao=2  [controle xyzzy=0]
dist/index.mjs  promoverParaProfissional=3  motivoDaRecusaDaPromocao=2  [controle xyzzy=0]
```

Conferido no `dist/` **antes** de deixar a landing consumir, como o runbook de 06/08 fez com o DS. O
controle em 0 mostra que a contagem distingue presente de ausente.

---

## Passo 6 · Landing ✅ NO AR (22:03:43 → 22:13:11)

```
> node apps/landing/scripts/deploy-leela-hub.mjs

[deploy-landing] env carregada de .env.leela-hub (9 chaves)
[deploy-landing] patch temporário: workspace:* → devDependencies; engines.node=22
  ▲ Next.js 14.2.35 · Creating an optimized production build ...
  ✓ Compiled successfully
  ✓ Generating static pages (12/12)
i  hosting[leela-landing]: found 99 files in .firebase\leela-landing\hosting
+  hosting[leela-landing]: file upload complete
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: version finalized
+  hosting[leela-landing]: release complete
+  Deploy complete!
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0
```

Uma execução, sem queda. **Não houve o D-2 de 06/08** (SIGTERM no teto de 10 min da ferramenta):
lancei em background desde o início justamente por causa daquele registro, e o script rodou inteiro.

Ruídos não-bloqueantes, os **mesmos** de 05/08 e 06/08, da integração `webframeworks`:
`Failed to find esbuild with npx which` e `Failed to install esbuild`. O build seguiu, achou 99
arquivos e finalizou a versão. Registrados como conhecidos, não como novidade.

### Prova 1 · hash de chunk baixado de produção — antes × depois

O "antes" foi medido **no ar às 21:55**, não copiado do handoff — e bateu chunk a chunk com o que
o handoff de 06/08 registrou, o que confirma que ninguém publicou a landing no meio.

| chunk | ANTES (no ar 21:55) | DEPOIS (no ar 22:14) |
|---|---|---|
| `main-app` | `24c4fa540a35e5d0` | **`1d580aaf540f899f`** |
| `870-` | `7d97b29525175355` | **`60336d4fbff4f397`** |
| `333-` | `44407093a280634d` | **`0f7ac081892e8421`** |
| `426-` | `6aca2ca8da0af8b3` | **`a1f183c4c2639204`** |
| `app/(public)/layout` | `292e8548e3ebb3e6` | **`da933de73b59428f`** |
| estáveis (15) | `webpack-cc97c7a2…` · `polyfills-42372ed1…` · `28-a652b067…` · `331-5e1e5115…` · `390bae33-e53f40ee…` · `415a2810-4859d7aa…` · `4a2876f6-9570b6a6…` · `54-99a513ec…` · `686-8892f7fd…` · `976-29277ae4…` · `e4548fa6-4946aa45…` · `app/(public)/page-1f5d185b…` · `app/error-bac1e9d6…` · `app/global-error-30913483…` · `app/not-found-7e05e55d…` | idênticos |

**5 chunks trocados, 15 estáveis.** O ar mudou, e mudou onde tinha que mudar: o `layout` público e o
`main-app`, que é por onde a árvore da `/minha-conta` entra.

### Prova 2 · o cartão novo DENTRO do bundle servido em produção ✅

Não é o build local. Baixei os **22 chunks** que `https://leela-landing.web.app/minha-conta`
referencia (1.298.007 bytes) e contei dentro deles:

```
-- o rótulo novo (decisão do dono de 07/08) --
  'Painel Profissional'                              : 1
  'Quer organizar eventos ou criar um club?'         : 1
-- o aviso do segundo login (PCLIENTE-3) --
  'O painel vai pedir sua senha de novo'             : 1
-- a chamada da callable (é isto que o tsup do api-client pagou) --
  'promoverParaProfissional'                         : 1
-- o rótulo ANTIGO, que tinha que sumir --
  'Conhecer o painel profissional'                   : 0
-- controle --
  'xyzzy-nao-existe-0808'                            : 0
```

O rótulo antigo em **0** e o controle em **0** mostram que a sonda distingue presente de ausente. E
`promoverParaProfissional` em **1** é a confirmação de que o rebuild do `api-client` era mesmo
obrigatório e funcionou: sem ele, esse número seria zero e o botão chamaria o vazio.

### Prova 3 · endereço certo

Tudo medido em `leela-landing.web.app` e `leela-hub.web.app`. **O preview congelado de 28/07 não foi
consultado em nenhum momento** — ele responde 200 e já custou meia hora numa lane anterior.

---

## Passo 7 · Smokes contra produção (todos leitura, sem navegador)

| # | Smoke | Resultado |
|---|---|---|
| 1 | **O painel NÃO mudou** — `leela-hub.web.app` | `index-C2icjqor.js` + `index-DufB2CDQ.css`, **os mesmos de 06/08 18:48** ✅ |
| 2 | landing `/` (home) | http=200 · 1,46 s |
| 3 | landing `/teste-taxa-repassada` (página de evento) | http=200 · 2,11 s |
| 4 | landing `/minha-conta` (a área do cliente) | http=200 · 0,56 s |
| 5 | callable depois da landing | http=401 · `{"details":{"motivo":"sem_sessao"}}` ✅ |
| 6 | controle · função inexistente | http=404 ✅ |

**O que o smoke 4 prova e o que ele não prova.** A área do cliente **abre** (200) e o cartão com o
rótulo novo está **no bundle que ela carrega** (Prova 2). O que nenhuma sonda minha pode mostrar é o
cartão **renderizado**: ele só monta para uma participante logada, e o dispatch proíbe criar conta
real. A conferência visual fica para o dono — e é a mesma classe de coisa que o
`Not-tested` dos commits anteriores já registrava.

**Nada foi escrito em produção.** A callable recusa antes de tocar o banco; não criei conta, não
promovi ninguém, não rodei suíte, não alterei código de produto.

---

## Passo 8 · O painel ficou de fora **de propósito**

Os consertos da vitrine da REV-VITRINE (`182d2852`, `1defe563`, `998cea5f` — DEF-R1/R2/R3/R4) estão
**construídos e revisados** e **NÃO estão no ar**. Isso é decisão do maestro, não esquecimento:
`apps/painel` sobe num deploy posterior junto com a lane SCROLLBAR-TEMA, que ainda vai mexer no DS —
buildar o painel duas vezes seria desperdício.

O smoke 1 é a prova de que respeitei o recorte: o painel em produção continua servindo
`index-C2icjqor.js`, byte a byte o release de 06/08 18:48.

⚠️ **Consequência a não esquecer:** a partir de agora existe conserto de vitrine construído e
revisado dormindo sem deploy. É exatamente o padrão que já foi cobrado quatro vezes na double
scrollbar. Está declarado aqui e no board para que a próxima lane de deploy o encontre.

---

## Fechamento

**Janela:** 21:53 → 22:16 -0300 · **23 minutos.** Não passou de uma hora.
**HEAD publicado:** `a0852e76` (== `origin/main`). O artefato da callable é bit a bit o de
`35a85f04`, como a PONTE-RET e a PONTE-REV declararam.

### Placar

| Passo | Estado | Prova |
|---|---|---|
| 0. Portão | ✅ | veredito APROVADA COM RESSALVAS lido no handoff; as duas ressalvas são item do dono no painel |
| 1. Baseline | ✅ | extraído dos dois handoffs **antes** de tocar em nada; reconfirmado no ar e pela C3/C4 |
| 2. Inventário | ✅ | 2 arquivos não-teste desde `133ef123`, os dois da ponte; **nada de carona** |
| 3. Sequenciamento | ✅ | functions antes da landing; DS nunca tocado, corrida nunca existiu |
| 4. Functions | ✅ **no ar** | 1 create, `state: ACTIVE`, hash `bf110886…`, 98 → 99 funções |
| 5. `tsup` api-client | ✅ | símbolo 0 → 3 no `dist/`, conferido antes de a landing consumir |
| 6. Landing | ✅ **no ar** | `main-app-24c4fa54…` → **`1d580aaf54…`** (+4 chunks), cartão novo no bundle baixado |
| 7. Smokes | ✅ **6/6** | zero regressão; painel intocado |

### Construído × revisado × NO AR

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| Callable `promoverParaProfissional` (`35a85f04`) | 06/08 | 08/08 (PONTE-REV) | ✅ **08/08 21:59** |
| Rótulo "Painel Profissional" + cartão (`ca72625c`) | 08/08 | 08/08 (PONTE-REV) | ✅ **08/08 22:13** |
| Wrapper `https.onCall` sob teste (`b60f307b`) | 08/08 | é o próprio gate | ✅ (vai no bundle da callable) |
| Gate de lote da landing (`299eabd3`) | 08/08 | n/a | n/a — é script de dev |
| **Consertos da vitrine (`182d2852`, `1defe563`, `998cea5f`)** | 08/08 | 08/08 (REV-VITRINE) | ❌ **NÃO** — fora do escopo, deploy posterior |
| S1234-T5 (PONTE-NOME-1) e S1234-T7 (PONTE-ELEGIVEL-1) | — | medidos 08/08 | ❌ não consertados — decisão do dono |

**A porta que estava quebrada em produção desde 06/08 está aberta.** Quem clica agora é promovida
pela callable em vez de ser mandada para o `/cadastrar` do painel e bater na máscara
anti-enumeração.

### Índices

**Nenhum índice novo neste deploy**, e não é suposição: `firestore.indexes.json` não mudou desde a
última publicação, a callable acessa Firestore só por `doc(uid)` (nunca por query) e a C1/C2 da
conferência de prontidão bateram **18×18** e **8×8** contra o servidor. Nenhum `fieldOverride` foi
tocado, então a lição do COLLECTION_GROUP que quase derrubou `entrarNoDesafio` **não se aplica** —
registrada como não-aplicável, não como esquecida.

### Nada foi violado

Não alterei código de produto · não rodei suíte alguma · não deployei `apps/painel`, rules, storage
nem índices · não criei conta nem promovi ninguém em produção (todas as sondas são leitura) · não
rotacionei segredo · não editei arquivo à mão no deploy da landing (o patch do `package.json` foi
aplicado e desfeito pelo próprio script) · `git commit --only` no fecho · nenhum deploy falhou, então
a regra das duas tentativas não chegou a ser exercida.

### Desvios

**Nenhum desvio de processo.** Dois registros que valem para a próxima lane:

1. **A âncora de functions desta vez estava certa no dispatch** — `133ef123` é mesmo o HEAD do
   último deploy de functions. Depois de duas rodadas com âncora errada, esta bateu.
2. **A C7 da conferência de prontidão pegou um defeito real, não um falso alarme de mtime.** O
   `dist/` do `api-client` estava 423 min atrás da fonte e **não continha** o símbolo que a landing
   importa. Se eu tivesse buildado a landing sem o `tsup`, teria publicado um cartão novo chamando
   uma função que não existia no bundle. Vale promover a C7 de "atenção" a bloqueio quando o
   pacote atrasado for consumido pelo app que está sendo publicado.

### Estado da árvore

```
> git status --porcelain apps/ packages/ functions/
?? apps/mobile/.expo/      <- cache do Expo, de 03/08, pré-existente
?? functions/lib/          <- saída do tsc, pré-existente

apps/landing/package.json.deploybak -> NÃO existe (o finally do script rodou)
HEAD = a0852e76 == origin/main
```

Os dois `??` são os **mesmos** que o handoff de 06/08 já registrava. Nenhuma sobra nova, nenhum
script temporário deixado para trás.

### Para o dono

1. 👀 **A porta está no ar.** Em `https://leela-landing.web.app/minha-conta`, logada como
   participante, o cartão agora diz **"Painel Profissional"** sob o título *"Quer organizar eventos
   ou criar um club?"*. É a conferência visual que nenhuma sonda faz — jsdom não desenha e eu não
   crio conta em produção.
2. ⚠️ **Três decisões suas continuam abertas** e nenhuma travou este deploy: **PONTE-CTA-1** (qual
   dos três rótulos fica, e a quarta opção de medir pelo servidor), **PONTE-NOME-1** (quem entra
   pela porta vira produtora com o nome próprio, sem caminho de troca) e **PONTE-ELEGIVEL-1** (duas
   classes de conta atravessam para receber a recusa um passo depois).
3. ⚠️ **Os consertos da vitrine não subiram** — de propósito, para não buildar o painel duas vezes.
   Eles vão no próximo deploy, com a SCROLLBAR-TEMA.
4. Seguem pendentes das lanes anteriores, **não tocadas aqui**: Password policy no Identity
   Platform, BREVO-1 (allowlist de IP), expurgo LGPD, tarifas do Asaas, matar conta demo, imagens de
   build não limpas (`gcr.io/leela-hub/us/gcf` — o mesmo aviso de custo reapareceu neste deploy).


