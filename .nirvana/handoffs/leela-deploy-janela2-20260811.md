---
trace: leela-redesign-v2-20260810
lane: DEPLOY-JANELA2
employee: sf-platform-lead (software-forge)
repo: C:\dev\LEELA
worktree: C:\dev\leela-deploy-j2-20260811
head_pinado: a1df3b88
baseline_no_ar: b0f979e5
data: 2026-08-11
papel: fechar a 2a janela — rules (RN-559), functions, landing, painel, canal de preview
estado: CONCLUIDA — 5 superficies deployadas com prova; hosting aguarda gate visual do maestro
---

# DEPLOY-JANELA2 — handoff vivo

Contrato: `.nirvana/briefs/leela-deploy-janela2-enriched.md`.
Referências: `leela-infra-deploy-20260811.md` (gate de frescor no funil),
`leela-deploy-noturno-20260811.md` (métodos de prova do ar), `leela-serv1-build-20260811.md`
(a fechadura RN-559).

⚠️ **Nenhuma etapa de hosting desta lane declara "no ar".** O veredito máximo que eu emito é
**deployado, prova técnica OK**. O gate visual L-019 é do maestro, depois de mim.

---

## Etapa 0 · Pino e worktree ✅

| Item | Medido |
|---|---|
| `main` | `a1df3b88` |
| `origin/main` | `a1df3b88` — **iguais** |
| árvore principal | `git status --porcelain -uno` = **0 linhas** |
| worktree | `C:\dev\leela-deploy-j2-20260811`, detached em `a1df3b88`, status limpo |

O delta desta janela sobre o que está no ar (`b0f979e5`), por área:

| Área | Arquivos | Peso |
|---|---|---|
| `firestore.rules` | 1 | **+37** (a fechadura da RN-559) |
| `functions/` | 7 | +442/−10 |
| `apps/` | 81 | +2683/−307 |
| `packages/` | 22 | +1958/−57 |
| `scripts/` + config | 8 | +765/−256 (gate de frescor no funil, `gate-canon.mjs`) |

### Dois pré-requisitos não escritos, ambos já conhecidos, ambos pagos

1. **`functions/.env` é gitignored** e não vem em worktree novo (achado 2 da DEPLOY-NOTURNO).
   Copiado da árvore principal e conferido por hash: `4e689cb3…` nos dois lados — o mesmo hash
   registrado pela lane de ontem. Nenhum valor impresso em log, chat ou aqui.
2. **`ERR_PNPM_IGNORED_BUILDS` não voltou.** O commit `31c9dac0` levou `'@sentry/cli': false`
   para a main; a recomendação da DEPLOY-NOTURNO foi cumprida por outra lane e o install do
   worktree saiu limpo de primeira: **exit 0 em 1 min 1 s**, sem placeholder escrito de volta.
   A R-8 morreu na fonte.

---

## Etapa 1 · Rules (RN-559) ✅ DEPLOYADA — ver seção de prova

### 🔎 Achado que muda o que o contrato assumia: a suíte de ataque RODA

O contrato e o handoff da SERV1-BUILD dão a suíte de ataque como impossível ("firebase-tools 15
recusa JDK abaixo de 21 e a máquina tem o 17"). **Medido: o emulador sobe.** Com
`npx firebase-tools@13` o Firestore Emulator inicia sob o JDK 17.0.19 desta máquina e a suíte
inteira roda:

```
npx firebase-tools@13 emulators:exec --only firestore --project demo-leela \
  "cd functions && npx vitest run src/__tests__/vendasRules.integration.test.ts"
  →  36 passed · 8 skipped · 1 suite FAILED
```

O que trava não é o JDK: é um **defeito de semeadura no próprio arquivo de teste**. O
`beforeAll` do `describe` da RN-559 (linha 257) semeia o lote legado pelo **Admin SDK** usando
`Timestamp` importado do **SDK cliente**:

```
Error: Value for argument "data" is not a valid Firestore document.
Detected an object of type "Timestamp" that doesn't match the expected instance
(found in field "inicioEm"). Please ensure that the Firestore types you are using are
from the same NPM package.
```

O `beforeAll` explode, o bloco inteiro é pulado e **os 8 casos da RN-559 saem SKIPPED**. Os
demais seeds do arquivo usam `FieldValue.serverTimestamp()` do admin e por isso passam. A lane
SERV1-BUILD escreveu os casos e nunca os viu correr — o JDK escondeu o defeito atrás de um
sintoma anterior.

⛔ **Card para a próxima lane de código** (não é meu para consertar, e não toquei):
`vendasRules.integration.test.ts:258-271` tem de semear com `Timestamp` do
`firebase-admin/firestore` (ou por `withSecurityRulesDisabled`), senão os 8 casos da RN-559
continuam decorativos.

### A simulação da recusa de 9,99 que o contrato pediu — feita, e com falsificação

Como não cabe a uma lane de deploy consertar teste, construí a sonda fora do caminho de build:
`functions/prova-rn559-emulador.mjs` — **`.mjs`**, então o `tsc` de functions (que compila
`src/**/*.ts` para `lib/`) não a vê, e o `bundle-deploy.mjs`, que monta `functions-deploy/` a
partir de `lib/`, não a embarca. Ela lê o **`firestore.rules` real do disco** e ataca só com o
SDK cliente, semeando por `withSecurityRulesDisabled` — sem a incompatibilidade de SDK.
Apagada no fechamento.

**Rodada com as Rules reais — 14/14 conforme o esperado:**

| Caso | Esperado | Obtido |
|---|---|---|
| CONTROLE+ · face R$ 99,00 cria | PASSA | ✅ |
| CONTROLE− · modalidade fantasma `99k` | RECUSA | ✅ |
| **create de face R$ 9,99** | **RECUSA** | ✅ |
| create de face R$ 10,00 (fronteira inclusiva) | PASSA | ✅ |
| create de face R$ 0,00 (gratuidade não é venda) | PASSA | ✅ |
| create de R$ 0,01 | RECUSA | ✅ |
| create de R$ 5,00 | RECUSA | ✅ |
| create de R$ 3,00 | RECUSA | ✅ |
| create de R$ 80,00 | PASSA | ✅ |
| update baixando para R$ 9,99 | RECUSA | ✅ |
| update baixando para R$ 10,00 | PASSA | ✅ |
| legado de R$ 5,00 renomeado (não retroage) | PASSA | ✅ |
| legado com preço → R$ 6,00 | RECUSA | ✅ |
| legado com preço → R$ 12,00 | PASSA | ✅ |

**Falsificação, para a sonda não medir vazio.** Com `faceMinimaVendaPagaOk()` neutralizado
(`preco >= 10` → `preco >= 0`) na cópia em memória das Rules, o placar cai para **8/14** e as
divergências são **exatamente** as seis recusas que dependem do mínimo:

```
- [RECUSA esperado, PASSOU obtido] create de face R$ 9,99
- [RECUSA esperado, PASSOU obtido] R$ 0,01
- [RECUSA esperado, PASSOU obtido] R$ 5,00
- [RECUSA esperado, PASSOU obtido] R$ 3,00
- [RECUSA esperado, PASSOU obtido] update que BAIXA o preço para 9,99
- [RECUSA esperado, PASSOU obtido] tocar o preço do legado (6)
```

Os dois controles e todos os casos "PASSA" ficam de pé nas duas rodadas. A sonda mede a regra,
e não outra coisa.

⚠️ **Detalhe de CRLF que custou uma rodada:** a primeira tentativa de falsificação usou âncora
com `\n` e não casou — `firestore.rules` é CRLF. É a mesma lição que a SERV1-BUILD registrou
para o teste de espelho, e ela vale para qualquer manipulação textual deste arquivo.

### Espelho core↔rule

`functions/src/__tests__/faceMinimaVenda.test.ts` — **23/23, exit 0**. O número da Rule segue
amarrado ao número do core.

### Baseline em produção, medido ANTES do deploy (Firebase Rules API, somente leitura)

```
release  cloud.firestore   ruleset 8c056b22-ff25-496e-9bc3-fbb2c271505e
createTime 2026-08-06T20:41:07Z   ·   164.330 bytes
sha256   935ba2626d1c681921bfe32d72c24d8f8398d1ce3e5e6a1c680b7fe4159152b2
```

| Sonda no source servido de produção | ANTES |
|---|---|
| `faceMinimaVendaPagaOk` | **0** |
| `precoTocadoNoUpdate` | **0** |
| `RN-559` | **0** |
| `request.resource.data.preco >= 10` | **0** |
| `xyzzy` (controle negativo) | 0 |

A fechadura da RN-559 **não existia em produção**. O ruleset no ar era de 06/08.

### O deploy, e a prova do release

```
npx firebase-tools@13 deploy --only firestore:rules --project prod --config firebase.prod.json
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
RULES_DEPLOY_EXIT=0        16:36:03Z → 16:36:21Z  (18 s)
```

`--only firestore:rules` de propósito: `firebase.prod.json` também declara `firestore.indexes` e
`storage.rules`, e nenhum dos dois foi alvo desta lane.

**Release novo, lido da API depois do deploy:**

| | ANTES | DEPOIS |
|---|---|---|
| ruleset | `8c056b22-ff25-496e-9bc3-fbb2c271505e` | **`bb41805b-8b9c-4e87-8984-c3ea237c25f5`** |
| updateTime | 2026-08-06T20:41:08Z | **2026-08-11T16:36:20Z** |
| bytes | 164.330 | **169.353** |
| sha256 | `935ba262…` | **`04cf1152…`** |

| Sonda no source servido de produção | ANTES | DEPOIS |
|---|---|---|
| `faceMinimaVendaPagaOk` | 0 | **3** |
| `precoTocadoNoUpdate` | 0 | **2** |
| `RN-559` | 0 | **2** |
| `request.resource.data.preco >= 10` | 0 | **1** |
| `xyzzy` (controle negativo) | 0 | **0** |

**E a prova que fecha a cadeia:** o source baixado do release bate byte a byte com o arquivo do
pino.

```
firestore.rules do pino   04cf11524ad284ff1ed6963025a8764754639139ea070c86c712d38e92f6f38c
source servido de prod    04cf11524ad284ff1ed6963025a8764754639139ea070c86c712d38e92f6f38c
diff -q                   exit 0
```

Não é "deployei e o comando disse ok": é o texto que o Firestore avalia em produção, baixado de
volta e comparado. **A fechadura da RN-559 está em produção.**

⚠️ Nota de rodapé da avaliação: nas recusas o emulador imprime junto
`Property platformAdmin is undefined on object` — é o ramo `isPlatformAdmin()` do `||` sendo
avaliado com token sem a claim. Não altera veredito nenhum (a recusa vem do primeiro ramo) e é
comportamento pré-existente da Rule, não desta janela.

### Credencial

Access token de vida curta trocado do refresh token do `firebase-tools` já logado
(`~/.config/configstore/firebase-tools.json`, `inguzbuilders@gmail.com`), receita documentada da
casa. Só leitura em `firebaserules.googleapis.com`. Token nunca impresso, nunca gravado, nunca
commitado. A sonda vive fora do repo.

---

## Etapa 2 · Functions ✅ DEPLOYADAS, convergidas

### Predeploy medido antes de comprometer a janela

```
npm --prefix functions run build   (tsc)          exit 0   ·  15 s
node functions/scripts/bundle-deploy.mjs          exit 0   ·  13 s
```

28 s no total. Foi essa medida que permitiu a decisão da etapa seguinte.

### O deploy foi em três grupos, e a razão é o teto

A DEPLOY-NOTURNO registrou que 101 functions **não cabem** em 600 s e que ali o SIGTERM caiu numa
fase reentrante **por sorte**. O contrato desta lane proíbe background e manda dividir em etapas
conferíveis. Com o predeploy custando 28 s, dividir ficou barato:

| Grupo | Alvos | Janela | Resultado |
|---|---|---|---|
| 1 | 34 | 16:39:35Z → 16:43:10Z (3 min 35 s) | **34 `Successful update operation`** · exit 0 |
| 2 | 34 | 16:43:19Z → 16:46:14Z (2 min 55 s) | **34 `Successful update operation`** · exit 0 |
| 3 | 33 | 16:46:21Z → 16:49:39Z (3 min 18 s) | **33 `Successful update operation`** · exit 0 |

101 de 101. Nenhum comando passou de 3 min 35 s contra um teto de 10 min — a margem que faltou
ontem. `ssrleelalanding` ficou de fora por construção: ela é v2 e não pertence ao codebase
`default` do `firebase.prod.json`.

### Convergência — a prova de que não sobrou nada em voo

```
npx firebase-tools@13 deploy --only functions --project prod --config firebase.prod.json
Skipped (No changes detected) = 101      updating = 0
creating = 0                             deleting = 0
+  Deploy complete!
CONV_EXIT=0        16:49:49Z → 16:50:39Z  (50 s)
```

### Inventário — antes × depois

| Medida | ANTES | DEPOIS |
|---|---|---|
| Functions no projeto | **102** | **102** |
| Criadas | — | **nenhuma** |
| Removidas | — | **nenhuma** |
| `diff` dos dois inventários | — | **vazio** |

O contrato previu que a contagem não mudaria, e ela não mudou.

### 🔎 O que de fato subiu: o guard da RN-559 **não** viaja no bundle

O contrato descreve a mudança desta etapa como "`guardPrecoLote` + comentários". Medi dentro do
bundle que sobe (`functions-deploy/index.js`, 1.356.877 bytes):

| Sonda | Ocorrências |
|---|---|
| `assertFaceMinimaVendaPaga` (o guard da camada Function) | **0** |
| `validarFaceMinimaVendaPaga` (validador do core) | 3 |
| `faceMinimaVendaPagaValida` (core) | 3 |
| `FACE_MINIMA_VENDA_PAGA` | 15 |
| `face_abaixo_da_minima` | 1 (vem de `packages/core/…/faceMinimaVenda.ts:98`) |
| `recomputarSaudeDeTodosOsTenants` (controle) | 3 |
| `agendarRecomputePlatformRollups` (controle) | 5 |

Os dois controles provam que **identificadores não são minificados** neste bundle — logo o zero de
`assertFaceMinimaVendaPaga` é ausência, e não renome. Como `guardPrecoLote.ts` não é importado por
ninguém fora dos próprios testes, o esbuild o descarta.

Isso **confirma**, e não contradiz, o que a SERV1-BUILD escreveu: *"a fechadura da RN-559 SÓ existe
[nas Rules]: a escrita de lote é direta do cliente"*. O que muda é a leitura do risco: hoje a
camada Function é **código sem chamador**, e a etapa 1 é a única que põe a regra em produção. O
bundle mudou por causa de `email/identidade.ts` e `limpeza/planoLimpeza.ts`, não do guard.

⚠️ Correção pequena ao handoff da INFRA-DEPLOY: ele diz que a forma `npm --prefix <app> run
verify:frescor` é *"a mesma já usada pelo hook das functions"*. O `predeploy` de functions em
`firebase.prod.json` tem só `npm --prefix functions run build` e `node functions/scripts/bundle-deploy.mjs`
— **não há gate de frescor no alvo de functions**. Nada quebrou por isso nesta janela (o bundle
embute o core por esbuild a partir de `lib/`, não de `dist/`), mas o texto induz a erro.

⚠️ Ruído conhecido, não-bloqueante: `Unhandled error cleaning up build images` ao fim do grupo 1 —
o mesmo 404 de `artifactregistry`/`us.gcr.io` que a DEPLOY-NOTURNO já tinha isolado como limpeza de
imagem, e não como falha de update.

---

## Etapa 3 · Landing ✅ DEPLOYADA, prova técnica OK, aguardando gate visual do maestro

### O gate de frescor rodou a favor, nos dois pontos do funil

```
1. dentro do deploy-leela-hub.mjs, ANTES do patch de package.json
   [frescor] @leela/landing: 3 pacote(s) com dist/ à frente da fonte      EXIT=0
2. predeploy do firebase.landing.json (segunda rede)
   Running command: npm --prefix apps/landing run verify:frescor          EXIT=0
```

É a primeira vez que a guarda instalada pela INFRA-DEPLOY atravessa um deploy real. Ela passou nos
dois pontos, e **o ENOENT espúrio do cross-spawn não apareceu** — coerente com o diagnóstico
daquela lane, que o amarrou ao caminho de exit 1 do hook.

Antes disso: `turbo run build --filter='@leela/landing^...'` → 3 successful, 12,0 s, exit 0.

### O baseline, e a descoberta de qual rota é o checkout

`/{slug}/inscricao/checkout` devolve **404**, e está certo: `checkout/` é pasta de componentes, sem
`page.tsx`. A rota real é **`/{slug}/inscricao`**. Produção tem um evento
(`teste-taxa-repassada`), e é por ele que o checkout renderiza.

Método da casa aplicado nas 4 rotas (`/`, `/teste-taxa-repassada`, `/teste-taxa-repassada/inscricao`,
`/minha-conta`): baixar **todos** os arquivos referenciados e contar dentro deles — 29 arquivos nos
dois lados.

### Prova 1 · o chunk da rota trocou

| | ANTES | DEPOIS |
|---|---|---|
| chunk de `/[eventSlug]/inscricao` | `page-6cdaad9f81d03195.js` | **`page-3d28b4b1045b21ec.js`** |
| CSS do tema | `6a40ee7790a510e8.css` | **`0b810d985a3c8c9e.css`** |

### Prova 2 · a auto-seleção está no bundle servido

A assinatura escolhida é o patch que o efeito emite —
`onInscrito(i, { modalidade: unica.nome, kitId: '', tamanhos: {} })`:

| Sonda (nos chunks baixados do ar) | ANTES | DEPOIS |
|---|---|---|
| **`.nome,kitId:""`** (assinatura da auto-seleção) | **0** | **1** |
| `kitId:""` | 2 | **3** |
| `tamanhos:{}` | 3 | **5** |
| `precoVigente` (a guarda "opção única sem lote vigente não entra") | 2 | **3** |
| `Modalidade e kit` (controle positivo, já existia) | 1 | 1 |
| `xyzzy` (controle negativo) | 0 | 0 |

Os três números batem, um a um, com o que medi no build local **antes** de subir. O controle
positivo estável mostra que a sonda lia o chunk certo já no baseline.

### Prova 3 · as classes do Card

| Onde | ANTES | DEPOIS |
|---|---|---|
| `shadow-elev-1` nos arquivos servidos | 4 (só no CSS, definição) | **7** (CSS 4 + **3 chunks de página**) |
| `--card-blur` nos arquivos servidos | 4 | **7** |
| `shadow-elev-1` no **HTML** de `/teste-taxa-repassada` | **0** | **1** |
| `shadow-elev-1` no **HTML** de `/teste-taxa-repassada/inscricao` | **0** | **1** |

O que muda de qualidade aqui é o HTML: antes a classe existia no CSS e **nenhuma superfície a
usava**; agora ela aparece no markup renderizado pelo servidor. As 38 superfícies da Onda 1 estão
espalhadas por 24 arquivos e só uma parte renderiza nestas 4 rotas com um evento e sem sessão — o
gate visual do maestro é que vê o resto.

### Prova 4 · o servido é byte a byte o construído

```
page-3d28b4b1045b21ec.js   local 5d93043bcc7875de2156788e81e929e0b12173182c2842882e977b6cf2ac38b5
                           no ar 5d93043bcc7875de2156788e81e929e0b12173182c2842882e977b6cf2ac38b5   IDÊNTICO
```

O hash local é o mesmo do build que fiz **antes** do deploy: a construção do firebase reproduziu
byte a byte a minha.

### Prova 5 · smokes, com o controle que impede falso positivo

| Alvo | http | tipo | bytes |
|---|---|---|---|
| `/` | 200 | text/html | 26.779 |
| `/teste-taxa-repassada/inscricao` | 200 | text/html | 38.293 |
| `/health` | 200 | application/json | 15 |
| controle · `/_next/static/chunks/xyzzy0811.js` | **404** | text/html | — |

### O deploy

```
node apps/landing/scripts/deploy-leela-hub.mjs
> firebase deploy --only hosting:leela-landing --project prod --config firebase.landing.json
✓ Compiled successfully · ✓ Generating static pages (12/12)
i  hosting[leela-landing]: found 100 files
+  functions[…ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: release complete · Deploy complete!
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0      16:57:14Z → 17:05:45Z  (8 min 31 s)
```

**8 min 31 s, dentro do teto de 10 min, em FOREGROUND** — contra os 10 min 45 s que obrigaram a
DEPLOY-NOTURNO a rodar destacada. A diferença é o cache do Next: rodei `next build` local com a
mesma env de produção antes do deploy, e a integração reaproveitou. Fica como método para a
próxima lane, não como sorte.

`package.json` restaurado pelo `finally`; `package.json.deploybak` ausente na árvore, conferido.

⚠️ Ruído conhecido, idêntico a 05/08, 06/08, 08/08 e 11/08: `Failed to find esbuild with npx
which`, `Failed to install esbuild`. O build seguiu.

⛔ **Desvio de config, o mesmo da lane de ontem e pela mesma razão física:** a landing usou
`firebase.landing.json`, porque `firebase.prod.json` declara `site=leela-hub` → `apps/painel/dist`
e não conhece o site `leela-landing`. A config usada declara **um site e mais nada**, com
`--project prod`. O contrato desta lane já previa isso.

**Estado: deployada, prova técnica OK, aguardando gate visual do maestro.**

---

## Etapa 4 · Painel ✅ DEPLOYADO, prova técnica OK, aguardando gate visual do maestro

### Ordem da REV-FINAL cumprida

```
1. npx tsup            (packages/design-system)          exit 0
2. gate de frescor     (cwd apps/painel)                 EXIT=0
   "@leela/painel: 3 pacote(s) com dist/ à frente da fonte"
3. npx vite build --mode leela-hub   (apps/painel)       exit 0 · ✓ built in 14.13s
4. predeploy do firebase.prod.json (segunda rede)        EXIT=0
```

Artefatos: `index-qMVaoZwP.js` 2.297,81 kB (gzip 611,69) · `index-KrtxKSJE.css` 140.651 B ·
`browser-BXdiCFWD.js` 24,53 kB (inalterado).

### R-7 conferida no artefato, antes de subir

| Sonda no JS construído | Ocorrências |
|---|---|
| `VITE_FIREBASE_PROJECT_ID:"leela-hub"` | **1** |
| `leela-hub.firebaseapp.com` | 1 |
| `leela-hub.firebasestorage.app` | 1 |
| `76126035891` | 2 |
| `localhost:8080` / `127.0.0.1:8080` | **0 / 0** |
| `demo-leela` | 4 (a constante `DEMO_CONFIG` do guarda fail-closed, não a config ativa) |

Mesmo padrão que a DEPLOY-NOTURNO mediu. R-7 satisfeita por medição, não por intenção.

### Deploy

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json
Running command: npm --prefix apps/painel run verify:frescor    → EXIT=0
i  hosting[leela-hub]: found 15 files in apps/painel/dist
+  hosting[leela-hub]: version finalized · release complete · Deploy complete!
PAINEL_DEPLOY_EXIT=0       17:08:50Z → 17:09:08Z  (18 s)
```

### Prova 1 · bundle trocado

| asset | ANTES | DEPOIS |
|---|---|---|
| JS | `index-BuNH0eyQ.js` | **`index-qMVaoZwP.js`** |
| CSS | `index-sDPZyP0B.css` | **`index-KrtxKSJE.css`** |

O ANTES bate hash a hash com o que a DEPLOY-NOTURNO deixou (`b97647ee…` / `f81c5190…`): ninguém
mexeu no painel entre as duas janelas.

### Prova 2 · o servido é byte a byte o construído

```
index-qMVaoZwP.js    local 3cca55dff56105b8e1495d017aebe2a58aac8332a85043c5e4e7bb5e63e4d40c
                     no ar 3cca55dff56105b8e1495d017aebe2a58aac8332a85043c5e4e7bb5e63e4d40c   IDÊNTICO
index-KrtxKSJE.css   local 780e30dd83503648e1a7dddeb7b0aaf6a4a58b998145ce7cc248aab701b2c7a4
                     no ar 780e30dd83503648e1a7dddeb7b0aaf6a4a58b998145ce7cc248aab701b2c7a4   IDÊNTICO
browser-BXdiCFWD.js  local 7e89b6da537b2218d27aa5c1a028b57eea8f852d2cdaaa1d29f5db76fdff9d3c
                     no ar 7e89b6da537b2218d27aa5c1a028b57eea8f852d2cdaaa1d29f5db76fdff9d3c   IDÊNTICO
```

### Prova 3 · as telas novas do admin, no bundle baixado do ar

| Sonda | ANTES | DEPOIS |
|---|---|---|
| `/plataforma/eventos` | **0** | **2** |
| `/plataforma/clubs` | **0** | **2** |
| `EventosGlobais` | **0** | **1** |
| `ClubsGlobais` | **0** | **1** |
| `xyzzy` (controle negativo) | 0 | 0 |

Tokens do redesign seguem servidos: `--rail-width` 10 · `--chart-accent` 8 · `--card-blur` 7 ·
`data-glass` 2 · `Rubik` 2 · `primary-500` 12.

⚠️ `--chart-accent` continua com **duas** declarações servidas (`var(--primary-500)` e
`var(--accent-400)`) — o vetável de cor do dono segue **aberto e intocado por mim**, exatamente
como ontem.

### Prova 4 · smokes, com o controle do rewrite

| Alvo | http | tipo | bytes |
|---|---|---|---|
| `/` · `/plataforma/eventos` · `/plataforma/clubs` · `/plataforma/macro` | 200 | text/html | 475 |
| `/assets/index-qMVaoZwP.js` (novo) | 200 | **text/javascript** | **2.302.311** |
| `/assets/index-BuNH0eyQ.js` (antigo) | 200 | text/html | **475** |
| controle · `/assets/xyzzy0811.js` (nunca existiu) | 200 | text/html | **475** |

O bundle antigo responde **byte a byte igual** a um arquivo que nunca existiu: é o rewrite SPA, e
não o bundle velho ainda servindo. Ele saiu do release.

### Prova 5 · HOSTING-CACHE ativo

```
/                          Cache-Control: no-cache
/assets/index-qMVaoZwP.js  Cache-Control: public, max-age=31536000, immutable
```

O header que fechou o incidente da tela-preta de 10/08 continua na release nova. Conferido, não
presumido.

**Estado: deployado, prova técnica OK, aguardando gate visual do maestro.**

---

## Etapa 5 · Canal de preview `redesign-v2` ✅

```
npx firebase-tools@13 hosting:channel:deploy redesign-v2 --project prod \
    --config firebase.prod.json --expires 30d
+  hosting[leela-hub]: version finalized · release complete
Channel URL: https://leela-hub--redesign-v2-e5ptbqp7.web.app   [expires 2026-09-10 14:10:04]
CHANNEL_EXIT=0       17:09:55Z → 17:10:12Z  (17 s)
```

Mesmo channel id de sempre. **Canal e produção provados idênticos, não presumidos:**

```
index-qMVaoZwP.js    prod  3cca55df…   canal 3cca55df…   IDÊNTICO
index-KrtxKSJE.css   prod  780e30dd…   canal 780e30dd…   IDÊNTICO
```

Smoke do canal: `/` http=200 · text/html.

---

## Etapa 6 · Fechamento ✅

### Nenhum emulador vivo

`emulators:exec` derruba o que sobe, e conferi em vez de confiar: portas **8080, 9099, 4000, 5001,
9199 e 4599 livres**, **zero `java.exe`** em `tasklist`.

### `:4601` re-servido do dist do pino — e um achado sobre o que ele servia

⚠️ O servidor antigo (**PID 19132**) não servia o dist do pino anterior: servia
`C:\dev\leela-wt-redesign-v2\apps\painel\dist`, uma **terceira** árvore (branch
`redesign-engajamento-v2` @ `f815c5ae`). Por coincidência de build o bundle era o mesmo
`index-BuNH0eyQ.js` que estava no ar, então a validação local do dono valia — mas por acidente, e
não por desenho. Registro para ninguém herdar a suposição.

| | ANTES | DEPOIS |
|---|---|---|
| PID | 19132 | **4724** |
| raiz servida | `C:\dev\leela-wt-redesign-v2\apps\painel\dist` | **`C:\dev\leela-deploy-j2-20260811\apps\painel\dist`** |
| bundle servido | `index-BuNH0eyQ.js` | **`index-qMVaoZwP.js`** |

Identidade do PID conferida pela linha de comando **antes** de matar. `netstat` final: `:4601`
LISTENING no PID **4724**.

**E o que importa para o dono:** o byte é o mesmo do ar.

```
index-qMVaoZwP.js    :4601  3cca55df…   produção 3cca55df…   IDÊNTICO
index-KrtxKSJE.css   :4601  780e30dd…   produção 780e30dd…   IDÊNTICO
/plataforma/eventos no :4601 → 200 text/html (fallback SPA vivo)
```

### Higiene

- `functions/prova-rn559-emulador.mjs` **apagada**, como declarado.
- `firestore-debug.log` (resíduo do emulador) apagado.
- Worktree: só `functions/lib/` untracked, que é saída de `tsc` e é descartável com ele.
- **Árvore principal intocada:** `git status --porcelain -uno` sobre `packages apps functions
  scripts firestore.rules pnpm-workspace.yaml package.json turbo.json` = **0 linhas**. HEAD segue
  `a1df3b88`. Não commitei, não pushei, não usei `stash` nem `amend`.
- Worktree `C:\dev\leela-deploy-j2-20260811` **mantido de propósito**: o gate visual pode voltar com
  defeito e a árvore pronta (node_modules, dist, `.next`, functions-deploy, `.firebase`) poupa um
  ciclo inteiro. É também a raiz que o `:4601` serve — **removê-la derruba o servidor do dono**.

---

# Fechamento — placar da lane

| Etapa | Estado | Prova-chave |
|---|---|---|
| 0 · Pino | ✅ | `a1df3b88` == `origin/main`; worktree limpo; `functions/.env` por hash; install exit 0 sem R-8 |
| 1 · Rules | ✅ **deployadas** | ruleset `8c056b22`→**`bb41805b`**; source do release **byte a byte** == arquivo do pino; RN-559 de 0 para 3/2/2/1; recusa de 9,99 provada no emulador + falsificação 14/14→8/14 |
| 2 · Functions | ✅ **deployadas** | 101 updates em 3 grupos; convergência **101/101 Skipped**, 0 update/create/delete; inventário **102→102**, diff vazio |
| 3 · Landing | ✅ **deployada, aguardando gate visual** | chunk `6cdaad9f`→**`3d28b4b1`**; `.nome,kitId:""` **0→1**; `shadow-elev-1` no HTML **0→1** em 2 rotas; chunk byte a byte idêntico |
| 4 · Painel | ✅ **deployado, aguardando gate visual** | `BuNH0eyQ`→**`qMVaoZwP`**; 3 assets byte a byte idênticos; `/plataforma/eventos` e `/plataforma/clubs` **0→2**; cache immutable ativo |
| 5 · Canal | ✅ | canal == produção, byte a byte |
| 6 · Fechamento | ✅ | zero emulador; `:4601` PID **19132→4724** servindo o dist do pino, idêntico ao ar |

⛔ **NENHUMA superfície de hosting está declarada "no ar".** As duas estão **deployadas com prova
técnica**. O gate visual L-019 é do maestro, nas superfícies que a janela mexeu: VG e overview de
evento (Cards novos), checkout (auto-seleção + elevação/blur), `/plataforma/eventos` e
`/plataforma/clubs` (telas novas do admin), marcas (toggle novo).

## Desvios registrados

1. **Functions em 3 grupos, não em um comando.** O bundle é único (o `bundle-deploy.mjs` produz um
   só); o que dividi foi a fase de update, para caber no teto sem background. Convergência total
   provada depois.
2. **`firebase.landing.json` para a landing**, porque `firebase.prod.json` não conhece o site
   `leela-landing`. Mesmo desvio, mesma razão física, já previsto pelo contrato.
3. **`npx firebase-tools@13`** em vez do 15.22.4 do PATH nos comandos de deploy e emulador —
   o 13 é o que a casa já usava e é o que sobe o emulador com JDK 17. O funil da landing chama o
   `firebase` do PATH (15) por dentro do script da casa, e foi assim que rodou.
4. **`next build` local antes do deploy da landing.** Não é passo do contrato; foi o que trouxe o
   deploy de 10 min 45 s para 8 min 31 s e permitiu foreground.

## Para a próxima lane

1. ⛔ **`vendasRules.integration.test.ts:258-271` semeia com `Timestamp` do SDK errado** e derruba
   os 8 casos da RN-559 para SKIPPED. A suíte de ataque **roda** nesta máquina
   (`npx firebase-tools@13 emulators:exec --only firestore --project demo-leela …`); o JDK 21 nunca
   foi o bloqueio real.
2. ⛔ **`assertFaceMinimaVendaPaga` não tem chamador** e por isso não viaja no bundle. Enquanto
   isso, a RN-559 tem **uma** camada em produção: a Rule.
3. **O `predeploy` de functions não tem gate de frescor** — o texto da INFRA-DEPLOY sugere que tem.
4. **O painel continua sem gate do próprio `apps/painel/dist`** (item 3 da INFRA-DEPLOY, ainda de pé).
5. **Pré-aquecer o `.next` antes do deploy da landing** é o que mantém o comando em foreground.
6. **`:4601` depende do worktree `C:\dev\leela-deploy-j2-20260811`.** Removê-lo derruba a validação
   local do dono; re-apontar antes de limpar.

## Nada foi violado

Não toquei Firestore fora do deploy de rules (o emulador roda em `demo-leela`, projeto de
demonstração, sem contato com produção) · não deployei índices nem storage · não rodei deploy sem
`--only` · não editei código de produto · não commitei nem pushei · não abri navegador (toda prova
por API, `curl`, `sha256sum` e `grep`) · **não declarei "no ar"** · nenhum comando rodou em
background e nenhuma etapa esperou notificação · `:4601` entregue vivo.

**Status: lane concluída. Aguardando o gate visual do maestro.**
