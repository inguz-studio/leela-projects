# REDEPLOY-PAINEL-20260806 — handoff

- **Lane:** REDEPLOY-PAINEL · **Trace:** `leela-redeploy-painel-20260806`
- **Employee:** sf-platform-lead (software-forge)
- **Projeto:** alias `prod` = `leela-hub` · config `firebase.prod.json` · site `leela-hub`
- **Janela:** 2026-08-06 18:46:33 → 18:49:04 -0300 · **HEAD:** `b5e30b327a9b2616d428ec11435351315a5055da`
- **Escopo:** só o site do painel. Landing, rules, storage, índices e functions **não foram tocados**.
- **Regra da lane:** não altero código, não rodo suíte. Falha 2× pelo mesmo motivo ⇒ PARO e reporto.

> Motivo: o pacote das 17:20 subiu o painel com o fix de rolagem **por eixo**
> (`overflow-y-auto overflow-x-hidden`). Às 18:41 a review de rolagem descobriu que a barra que o
> dono via não vinha do eixo — vinha do **bloco de contenção** — e commitou `a06c16d4`. O ar ficou
> 8 minutos servindo o build anterior a esse conserto.

---

## Passo 0 — Pré-condições ✅

### PC-1 · árvore limpa no que este deploy constrói

```
> git status --porcelain apps/painel packages/design-system/src
(vazio)
```

**Zero modificação** nas duas pastas que entram neste build. As três sobras tracked estão fora de
área buildável e não foram tocadas (uma delas está **staged** por outra lane — daí o `commit --only`
no fecho):

```
 M .nirvana/handoffs/leela-limpeza-prod-20260806.md
A  .nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md      <- staged por outra lane
 M leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md
```

### PC-2 · o fix está em HEAD

```
> git merge-base --is-ancestor a06c16d4 HEAD   -> SIM
a06c16d4  2026-08-06 18:41:22 -0300  fix(ds): a segunda barra da tela de eventos nao vinha do eixo…
```

Três commits atrás de HEAD (`a06c16d4` → `a0b353ee` lint → `b5e30b32` handoff). Os dois posteriores
não mexem em código servido: um é o lint do DS (`packages/design-system/lint/`, fora do bundle) e o
outro é documentação.

### PC-3 · o que precisa ser reconstruído — e o que não precisa

O painel importa `@leela/core` e `@leela/design-system`, e `dist/` é gitignorado. A armadilha do
runbook é rebuildar de menos. Medido contra o commit que gerou o build no ar (`133ef123`):

```
> git diff --stat 133ef123..HEAD -- packages/core packages/design-system/src apps/painel/src
 apps/painel/src/shell/RootShell.tsx                       | 13 ++-
 apps/painel/src/shell/__tests__/ScrollDaPagina.test.tsx   | 32 ++
 packages/design-system/src/components/AppShell/AppShell.tsx | 25 ++-
 packages/design-system/src/components/AppShell/__tests__/AppShell.test.tsx | 26 ++
```

`packages/core` **não mudou** desde o build no ar — o `dist/` dele, feito às 17:18 nesta mesma
máquina, continua correspondendo ao fonte. Rebuildar só o DS é suficiente **e** correto.

**PC-2 (RAM):** um build por vez, do começo ao fim. **Nenhuma suíte executada** — os gates da review
(DS 67/1236, painel 207/2176, tsc 0, eslint `--max-warnings 0`) já rodaram em `a06c16d4`.

---

## Estado ANTES, medido no ar (18:46:33)

```
GET https://leela-hub.web.app/    http=200  bytes=475
  -> /assets/index-hg4CK5Fu.js
  -> /assets/index-DufB2CDQ.css
```

Exatamente o par que a lane das 17:20 publicou.

### O defeito, provado dentro do bundle que estava servindo

O bundle foi **baixado de produção** e inspecionado:

```
GET /assets/index-hg4CK5Fu.js   http=200  bytes=2249843

'relative flex flex-col flex-1 min-w-0 h-full overflow-hidden'  (AppShell COM o fix)   : 0
'relative flex flex-col flex-1'                                 (AppShell + RootShell) : 0
'"flex flex-col flex-1 min-w-0 h-full overflow-hidden"'         (AppShell SEM o fix)   : 1
'xyzzy-nao-existe'                                              (controle)             : 0
```

A linha do meio é o defeito em produção: o `<main>` do AppShell **sem** `relative`. O controle em 0
mostra que a sonda distingue presente de ausente.

---

## Passo 1 — `tsup` do design-system ✅

```
18:47:12 -> 18:47:25    DS_TSUP_EXIT=0
CJS index.js 572 KB map · ESM index.mjs 221.80 KB · DTS index.d.ts 101.10 KB
5 entradas (index / rn / server / dialog / tailwind-preset)
```

Conferido no `dist/` antes de deixar o painel consumir:

```
dist/index.js   'relative flex flex-col flex-1 min-w-0 h-full overflow-hidden' : 1
dist/index.mjs  'relative flex flex-col flex-1 min-w-0 h-full overflow-hidden' : 1
dist/index.mjs  '"flex flex-col flex-1 min-w-0 h-full overflow-hidden"'        : 0
```

---

## Passo 2 — build do painel ✅

Receita do handoff das 17:20, sem alteração: `cd apps/painel && npx vite build --mode leela-hub`.

```
vite v5.4.21 building for leela-hub...
3988 modules transformed.                    (igual às 17:19 — nenhum módulo entrou ou saiu)
dist/index.html                 0.48 kB
dist/assets/index-DufB2CDQ.css  109.90 kB
dist/assets/browser-BXdiCFWD.js  24.53 kB
dist/assets/index-C2icjqor.js  2,245.51 kB
built in 20.51s   ·   PAINEL_BUILD_EXIT=0    (18:47:38 -> 18:48:02)
```

O build saiu **depois** do `tsup`, então carrega o `dist/` novo do DS.

### Por que o CSS não mudou de nome — e por que isso está certo

`index-DufB2CDQ.css` tem o **mesmo hash de antes**, e o sha256 confirma que é byte a byte o mesmo
arquivo já publicado (`1b1d361e…`). Não é build velho: `relative` é utilitário Tailwind que **já
existia** na folha (`.relative{position:relative}` presente, contado 1). O fix troca a *classe
aplicada no JSX*, não a *regra CSS* — o delta é inteiramente no JS. Um CSS renomeado aqui seria o
sinal suspeito, não o contrário.

---

## Passo 3 — deploy Hosting ✅ NO AR

```
> npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
i  hosting[leela-hub]: found 14 files in apps/painel/dist
i  hosting: uploading new files [0/2]
+  hosting[leela-hub]: version finalized
+  hosting[leela-hub]: release complete
+  Deploy complete!   ·   Hosting URL: https://leela-hub.web.app
PAINEL_DEPLOY_EXIT=0                         (18:48:28 -> 18:48:50 -0300)
```

O bloco `hosting` de `firebase.prod.json` é **um site só** (`site: leela-hub`, `public:
apps/painel/dist`). A landing tem config própria (`firebase.landing.json`) e é inalcançável por este
comando; `--only hosting` deixa firestore, storage e functions fora por construção.

---

## Prova 1 — hash de chunk: antes × depois

| asset | ANTES (no ar 18:46) | DEPOIS (no ar 18:49) |
|---|---|---|
| JS | `index-hg4CK5Fu.js` | **`index-C2icjqor.js`** |
| CSS | `index-DufB2CDQ.css` | `index-DufB2CDQ.css` (inalterado, ver acima) |

O HTML servido depois referencia o chunk novo. E o chunk antigo **saiu do release** — a URL dele
devolve 200, mas o corpo é o `index.html` do rewrite SPA (`**` → `/index.html`), não JavaScript:

```
GET /assets/index-hg4CK5Fu.js  ->  type=text/html  bytes=475  (é o index.html, não o bundle)
```

Registrado porque um 200 lido sem olhar o `content-type` seria confundido com "o bundle velho ainda
está no ar".

## Prova 2 — o fix DENTRO do bundle servido em produção ✅

Não é o build local: o arquivo abaixo foi baixado de `leela-hub.web.app` às 18:49.

```
GET /assets/index-C2icjqor.js   http=200  type=text/javascript  bytes=2249861

-- REV-SCROLL-RET (o conserto da segunda barra) --
  'relative flex flex-col flex-1 min-w-0 h-full overflow-hidden'  (<main> do AppShell) : 1
  'relative flex flex-col flex-1'          (1 AppShell + 1 scroller do RootShell)      : 2
  '"flex flex-col flex-1 min-w-0 h-full overflow-hidden"'  (a classe ANTIGA)           : 0
-- BUILD-SCROLL-PADRAO (o fix por eixo, das 17:20, preservado) --
  'overflow-y-auto overflow-x-hidden'      (SCROLL_Y_ONLY do DS)                       : 1
-- controle --
  'xyzzy-nao-existe'                                                                   : 0
```

As **duas** classes que `a06c16d4` mudou estão no ar, a antiga sumiu, e o fix anterior não regrediu.

## Prova 3 — identidade: o servido é byte a byte o construído

```
index-C2icjqor.js   local  0c93e4b158f542ea524e35dc3763f7897df67e559d62031cd533b83d49b13dce
                    no ar  0c93e4b158f542ea524e35dc3763f7897df67e559d62031cd533b83d49b13dce   IDENTICO
index-DufB2CDQ.css  local  1b1d361e8a500beb3a5180498994411929980cec6019a2032648dc8ea1fb14c6
                    no ar  1b1d361e8a500beb3a5180498994411929980cec6019a2032648dc8ea1fb14c6   IDENTICO
```

---

## Higiene pós-deploy ✅

```
> git status --porcelain apps/painel packages/design-system/src
(vazio — o mesmo do início)
```

As três sobras de outras lanes seguem exatamente como estavam. Nenhum arquivo editado à mão,
nenhum script temporário criado.

---

## Fechamento

| Passo | Estado | Prova |
|---|---|---|
| 0. Pré-condições | ✅ | árvore limpa nas 2 pastas do build; `a06c16d4` ancestral de HEAD; `core` intocado |
| 1. `tsup` DS | ✅ | exit 0, fix conferido no `dist/` antes do painel consumir |
| 2. Build painel | ✅ | exit 0, 3988 módulos, `index-C2icjqor.js` |
| 3. Deploy hosting | ✅ **no ar** | `index-hg4CK5Fu` → **`index-C2icjqor`**, 18:48:50 |
| 4. Prova no servido | ✅ | as 2 classes `relative` dentro do bundle baixado de produção; antiga = 0 |

### O que mudou para o dono

A tela de eventos agora tem, no ar, o conserto que a review provou ser o certo: **quem rola é o
bloco de contenção**. O `.sr-only` absoluto da paginação/tabela/stepper não escapa mais para o
`<html>`, e o documento para de acender a segunda barra ao lado da barra da página. O fix das 17:20
(fechar o eixo x) continua no bundle — ele resolvia a barra que o *contêiner* desenha; este resolve
a que o *documento* desenhava.

### Nada foi violado

Não alterei código nem spec · não rodei suíte alguma · não subi landing, rules, storage, índices
nem functions · não toquei as sobras de outras lanes · não escrevi nada em produção (todas as
sondas são leitura) · um build por vez.

### Desvios

Nenhum. A receita das 17:20 rodou sem intercorrência.

Dois pontos registrados para não virarem falso alarme numa próxima leitura:
1. **CSS com o mesmo hash é o esperado** nesta mudança — `relative` já existia na folha; o delta é
   só de classe aplicada no JSX. Confirmado por sha256 e pela presença de `.relative{position:relative}`.
2. **Chunk antigo devolve 200** por causa do rewrite SPA; o `content-type` é `text/html`. Só o
   `content-type` (ou o corpo) distingue "ainda servido" de "capturado pelo rewrite".

### Para o dono

1. 👀 **Conferir a tela de eventos (inscritos, lista longa) em `https://leela-hub.web.app`** — build
   `index-C2icjqor.js`. É a conferência visual que os testes não fazem: jsdom não calcula layout, e
   o próprio commit registra isso em `Not-tested`.
2. ✅ **`git push` para `origin/main` — FEITO nesta lane** (`b5e30b32..19bebad3`, 18:50). A pendência
   que vinha se repetindo há três fechamentos está fechada: `origin/main` e o local estão iguais
   (0 à frente, 0 atrás), então o código que roda em produção deixou de existir só nesta máquina.
   O `commit --only` preservou as sobras das outras lanes, inclusive a que estava staged.
3. Seguem pendentes das lanes anteriores, **não tocadas aqui**: Password policy no Identity Platform
   (configuração manual dele), BREVO-1 (allowlist de IP), expurgo LGPD, tarifas do Asaas, matar
   conta demo, imagens de build não limpas.
