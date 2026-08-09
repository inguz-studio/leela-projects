# DEPLOY-FINAL — handoff vivo

- **Lane:** `DEPLOY-FINAL` · **Trace:** `leela-retomada-20260808` · **última da fila**
- **Employee:** `sf-platform-lead` (software-forge)
- **Repo:** `C:\dev\LEELA` · branch `main` · **HEAD a publicar:** `6bb9b57b` (== `origin/main`)
- **Projeto:** alias `prod` = `leela-hub` · painel por `firebase.prod.json` · landing por `firebase.landing.json`
- **Início:** 2026-08-08 23:21 -0300
- **Regra da lane:** não altero código, não rodo suíte. Falha 2× pelo mesmo motivo ⇒ PARO e reporto.

---

## Passo 0 · O portão, lido no texto da review e não no recado

Abri `.nirvana/handoffs/leela-retomada-20260808-REV-SCROLLBAR.md`. O veredito é a **primeira coisa
escrita no arquivo**, antes de qualquer seção:

> # ⚔ VEREDITO: **APROVADA COM RESSALVAS**
> **O deploy está LIBERADO.** Nada do que achei bloqueia a subida do conserto da cor, nem os
> consertos da vitrine (`182d2852`, `1defe563`, `998cea5f`) que viajam junto. O único defeito real
> que apareceu vive numa superfície **só de desenvolvimento** (o showroom do DS), foi **consertado
> e provado nesta lane** (`ac010722`) e não muda um pixel do que o dono vê.

E, na seção "Para a lane de deploy", item 1: *"Está liberado. O veredito não segura nada. Sobem
juntos o conserto da cor (`8e10ab8f`) e os três da vitrine."*

**Nada contradiz o dispatch. Portão aberto.** As duas ressalvas (R1 · a var `--color-scheme` não é
travada no arquivo commitado, só no gerador; R2 · o Storybook estampa o tema depois da primeira
pintura) são **de desenvolvimento**, estão escritas na review e nenhuma alcança superfície de
produção.

---

## Passo 1 · Baseline — medido no ar, conferido contra os handoffs

Fontes de baseline, nesta ordem: `.nirvana/handoffs/leela-retomada-20260808-DEPLOY-PONTE.md`
(o deploy de hoje, 21:59/22:13) e `.nirvana/handoffs/leela-redeploy-painel-20260806.md`
(o baseline do painel). **Medi no ar antes de comparar**, não o contrário.

| Artefato | O que está no ar (medido 23:22) | Bate com o handoff? | Publicado em |
|---|---|---|---|
| **Painel** `leela-hub.web.app` | `index-C2icjqor.js` + `index-DufB2CDQ.css` | ✅ redeploy 06/08 **18:48:50**, e o smoke 1 da DEPLOY-PONTE reconfirmou às 22:14 | 06/08 18:48 |
| **Landing** `leela-landing.web.app` | `main-app-1d580aaf540f899f` + 4 chunks trocados | ✅ é a coluna **DEPOIS** da DEPLOY-PONTE | 08/08 **22:13** |

O CSS do painel no ar tem **sha256 `1b1d361e…`** — byte a byte o mesmo registrado no handoff de
06/08. **A âncora está certa desta vez, e foi provada por hash, não por memória.**

### O número que interessa: `color-scheme` no CSS servido — ANTES

O conserto é de CSS, então a prova mora no CSS baixado do ar.

| Arquivo baixado de produção | bytes | `color-scheme` | `--surface-base` | `data-theme` |
|---|---|---|---|---|
| **painel** `/assets/index-DufB2CDQ.css` | 109.899 | **0** | 12 | `wine` 1 |
| landing `/_next/static/css/81dfbdba….css` | 18.753 | **0** | 0 | 0 |
| landing `/_next/static/css/89a187ed….css` | 14.297 | **0** | 2 | `brasa` 1 |
| landing `/_next/static/css/d89e678c….css` | 74.989 | **0** | 7 | `brasa` 1 |
| controle `xyzzy0808` | — | 0 | — | — |

**Zero nos dois apps**, com o CSS do tema presente (`--surface-base` e os blocos `data-theme`
chegam lá). Reproduz exatamente o que a REV-SCROLLBAR mediu para a landing: *"o CSS do tema chega
lá; a declaração não estava nele."* O controle em 0 mostra que a sonda distingue presente de
ausente.

---

## Passo 2 · A armadilha desta lane — armada, e medida antes de qualquer build

`packages/design-system/dist` é gitignorado. A regra do dispatch: o `dist/` do DS tem de ser
**posterior ao último commit que tocou o DS**. Medido:

```
dist/index.mjs · dist/index.js     2026-08-08 22:28:11   (tsup da SCROLLBAR-TEMA)
último commit em packages/design-system/src   ac010722   2026-08-08 23:11:40
```

**O `dist/` é 43 min e 29 s ANTERIOR ao commit.** Pela regra como está escrita, isso é **bloqueio,
não atenção**. E o `find` confirma três fontes mais novas que o `dist/`:

```
$ find packages/design-system/src -type f -newer packages/design-system/dist/index.mjs
packages/design-system/src/theme/generate.ts
packages/design-system/src/theme/__tests__/color-scheme.test.ts
packages/design-system/src/theme/__tests__/showcase-init-theme.test.ts
```

`sha256` do `dist/` **antes** do rebuild, para poder responder se a defasagem era de conteúdo ou só
de mtime:

```
dist/index.mjs   09ce1be2875585540504cad27fdcc91277ac8f9c2d38504c4f84e14cbff43373
dist/index.js    45c6744d23bd5734d77ccfefb90c769751643b1f6a002d5e22d7942c4a37de83
```

### Onde o conserto da cor realmente viaja

Registrado para não confundir as duas coisas: **a declaração de `color-scheme` NÃO passa pelo
`dist/`.** Os temas são arquivos versionados e consumidos direto:

```
$ git ls-files packages/design-system/themes/
packages/design-system/themes/brasa.css
packages/design-system/themes/index.css
packages/design-system/themes/wine.css

$ grep -n '^  color-scheme:' packages/design-system/themes/index.css
5:  color-scheme: dark;      <- bloco :root:not([data-theme]) + [data-theme=brasa]
462:  color-scheme: light;   <- bloco [data-theme=wine]
```

O `tsup` importa para o **JS** do DS que o painel empacota, não para o CSS do tema. As duas coisas
sobem no mesmo build, por caminhos diferentes.

### `tsup` rodado, e a resposta que ele deu

```
> cd packages/design-system && ./node_modules/.bin/tsup      (23:24:41 -> 23:24:53, 12 s)
ESM 1051ms · CJS 1052ms (index.js 231,57 KB) · DTS 8997ms (index.d.ts 101,64 KB)
DS_TSUP_EXIT=0
```

`sha256` **depois**:

```
dist/index.mjs   09ce1be2875585540504cad27fdcc91277ac8f9c2d38504c4f84e14cbff43373   IDENTICO
dist/index.js    45c6744d23bd5734d77ccfefb90c769751643b1f6a002d5e22d7942c4a37de83   IDENTICO
```

**Byte a byte o mesmo.** Ou seja: a defasagem era de **mtime**, não de conteúdo — a REV-SCROLLBAR
estava certa quando disse que o `dist` continuava em dia. Os três arquivos que apareceram "mais
novos" são resíduo das oito mutações que ela aplicou e reverteu com `git checkout --`, que reescreve
o arquivo e carimba mtime novo mesmo devolvendo o conteúdo original.

**Isto é um refinamento do runbook, e vale escrever:** a defasagem por mtime (a C7 da conferência de
prontidão) **não é prova de defasagem de conteúdo**. Em 08/08 22:03 ela era real — o `dist/` do
`api-client` não tinha o símbolo e teria publicado um botão morto. Agora era falso alarme. O teste
que separa os dois casos custa 12 segundos: **rebuildar e comparar o hash**. Rebuildar de mais custa
segundos; rebuildar de menos custou quase um botão morto. Segui rebuildando, e é o que recomendo
manter — a regra "pacote atrasado consumido pelo app que sobe é bloqueio" fica de pé, e o custo dela
é desprezível.

Os outros dois pacotes, medidos pelo mesmo critério:

| Pacote | `dist/` | Último commit no pacote | Fonte mais nova que o `dist`? | Rebuild |
|---|---|---|---|---|
| `design-system` | 22:28 → **23:24** | `ac010722` 23:11 | sim (mtime) → **não, depois do tsup** | ✅ feito |
| `core` | 06/08 17:18 | `02e406c3` 06/08 14:17 | **não** | não precisa |
| `api-client` | 08/08 22:03 | `35a85f04` 06/08 19:10 | **não** | não precisa (foi o `tsup` da DEPLOY-PONTE) |

---

## Passo 3 · Inventário — o que de fato embarca

Contra `b5e30b32`, que é o HEAD do build do painel que estava no ar:

```
> git diff --stat b5e30b32..HEAD -- apps/painel/src packages/design-system/src \
      packages/design-system/themes packages/core/src ':(exclude)**/__tests__/**'

 apps/painel/src/routes/onboarding/_data/onboarding.ts   | 46 +++++++++++++++-
 packages/design-system/src/theme/generate.ts            | 20 ++++++++
 packages/design-system/src/theme/rn-themes.ts           |  2 +
 packages/design-system/src/utils/scroll.ts              | 10 +++++
 packages/design-system/themes/brasa.css                 |  2 +
 packages/design-system/themes/index.css                 |  4 ++
 packages/design-system/themes/wine.css                  |  2 +
 7 files changed, 85 insertions(+), 1 deletion(-)
```

**Uma correção honesta ao enunciado da lane.** O dispatch fala em "os três consertos reais da
REV-VITRINE". Dos três, **só um muda byte servido**:

| Commit | O que é | Embarca? |
|---|---|---|
| `182d2852` | `gate-de-papel.test.ts` — o gate estrutural da camada de papel | **não** — é arquivo de teste |
| `1defe563` | prazo de 12 s do crachá (`onboarding.ts`) **+** `/conta` na allowlist (teste) | **sim**, a metade do prazo |
| `998cea5f` | `veu-buildado.test.ts` exige o elo do desfoque | **não** — é arquivo de teste |

Os dois gates são travas de regressão: valem para sempre no CI e no repositório, e não têm nada para
"subir". Isso **não diminui** a lane — o DEF-R2 era o defeito de maior severidade da review — mas
significa que o que o dono passa a ver no painel é **o prazo do crachá** e **a cor da barra**, não
três coisas. Escrito assim para o relato não prometer mais do que o ar entrega.

`scroll.ts` são **+10 linhas de comentário** (a REV-SCROLLBAR provou por diff). `generate.ts` e
`rn-themes.ts` são o gerador e sua saída.

---

## Passo 4 · Painel ✅ NO AR (23:25:15 → 23:27:16)

```
> cd apps/painel && ./node_modules/.bin/vite build --mode leela-hub
3988 modules transformed.                    (o mesmo número de 06/08 — nada entrou nem saiu)
dist/assets/index-3PlkfKJK.css   109.98 kB
dist/assets/index-CfBX04Vv.js  2.245,73 kB
✓ built in 14.71s        PAINEL_BUILD_EXIT=0

> npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
i  hosting[leela-hub]: found 14 files in apps/painel/dist
i  hosting: uploading new files [0/3]
+  hosting[leela-hub]: version finalized · release complete
+  Deploy complete!        PAINEL_DEPLOY_EXIT=0        (23:26:55 -> 23:27:16)
```

O recorte foi conferido no arquivo antes de rodar, não presumido:

```
> node -e "..." firebase.prod.json
hosting alvos: 1
  site=leela-hub  public=apps/painel/dist
```

**Um alvo só.** A landing tem config própria (`firebase.landing.json`) e é inalcançável por este
comando; `--only hosting` deixa functions, firestore e storage de fora por construção.

### Prova 1 · hash do bundle baixado de produção — antes × depois

| asset | ANTES (no ar 23:22) | DEPOIS (no ar 23:27) |
|---|---|---|
| JS | `index-C2icjqor.js` | **`index-CfBX04Vv.js`** |
| CSS | `index-DufB2CDQ.css` | **`index-3PlkfKJK.css`** |

Desta vez **o CSS trocou de nome**, e isso é o esperado: `color-scheme` é uma **regra nova** na
folha, não uma classe aplicada no JSX. Em 06/08 o CSS manteve o nome porque o delta era só de classe
— o handoff daquela lane registrou o porquê para não virar falso alarme, e aqui o sinal é o inverso:
CSS com o mesmo nome é que seria suspeito.

### Prova 2 · `color-scheme` no CSS **baixado do ar** ✅

Este é o número que interessa, porque o conserto é de CSS. Arquivo baixado de
`leela-hub.web.app`, 109.979 bytes:

```
grep -o 'color-scheme:[a-z]*' | sort | uniq -c
      2 color-scheme:          <- as duas vars --color-scheme (com espaço)
      1 color-scheme:dark      <- a DECLARAÇÃO, minificada
      1 color-scheme:light

:root:not([data-theme]),[data-theme=brasa]{color-scheme:dark
[data-theme=wine]{color-scheme:light

controle 'xyzzy0808' : 0
```

**Era 0 às 23:22. É 2 declarações às 23:27**, coladas nos dois seletores certos. O controle em 0
mostra que a sonda distingue presente de ausente.

### Prova 3 · o conserto da vitrine que embarca, no JS **baixado do ar** ✅

```
'const pit=12e3'   (PRAZO_DO_CRACHA_MS = 12_000, minificado)   ANTES 0  ->  DEPOIS 1
estado terminal  status:"authenticated",uid:x,role:null,tenantId:null   ANTES 1  ->  DEPOIS 2
controle 'xyzzy0808'                                                    0        ->  0
```

Duas sondas independentes concordam. A segunda é a que prova o **comportamento**: a ocorrência nova
é a do `setTimeout` que faz a espera pendurada terminar no mesmo estado em que a espera com erro já
terminava. Contexto lido no bundle servido:

```
…catch{return{status:"authenticated",uid:e,role:null,tenantId:null}}}}const pit=12e3;function vit()
```

### Prova 4 · o servido é byte a byte o construído

```
index-3PlkfKJK.css   local 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8
                     no ar 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8   IDENTICO
index-CfBX04Vv.js    local 9cfe13f4de0dd1574ca04a49695e23962e97ccf2af82287b1f296a713614b034
                     no ar 9cfe13f4de0dd1574ca04a49695e23962e97ccf2af82287b1f296a713614b034   IDENTICO
```

---

## Passo 5 · Nada de backend nesta lane — conferido, não presumido

Desde `a0852e76`, que é o HEAD do deploy de functions das 21:59:

```
functions/src            0 arquivo(s)
firestore.rules          0 arquivo(s)
firestore.indexes.json   0 arquivo(s)
storage.rules            0 arquivo(s)
```

Todo o delta fora de specs e handoffs é `packages/design-system` (temas, tokens, gerador, showroom e
testes). **Nenhuma function de produto, nenhuma Rule, nenhum índice.**

⚠️ **Uma precisão honesta:** o deploy da landing **atualiza a função SSR do próprio Next**
(`firebase-frameworks-leela-landing:ssrleelalanding`). Isso é da integração `webframeworks`, não é
function de produto, e aconteceu igual no deploy das 22:13. Está escrito aqui para "nenhuma
function" não virar afirmação falsa numa leitura futura.

---

## Passo 6 · Landing — o que muda, medido no artefato antes de subir

Uma diferença estrutural entre os dois apps, que muda o que se deve procurar na prova:

```
apps/painel/src/main.tsx:3      import '@leela/design-system/themes/index.css'   <- brasa E wine
apps/landing/app/globals.css:14 @import '@leela/design-system/themes/brasa.css'  <- só brasa
```

Ou seja: **no painel a prova são as duas declarações** (`dark` no bloco `:root`/brasa e `light` no
bloco wine). **Na landing a prova é só `color-scheme:dark`** — não existe bloco `wine` na landing, e
procurar `light` lá seria procurar o que não pode existir. Registrado para não virar falso negativo.

CSS construído, chunk a chunk (medido em `.firebase/leela-landing/hosting/_next/static/css/`):

| chunk | bytes | `color-scheme` | bloco de tema |
|---|---|---|---|
| **`5c28c218c2cc65aa.css`** (novo — substitui `89a187ed9dbddfef`) | 14.335 | **2** | `:root:not([data-theme]),[data-theme=brasa]{color-scheme:dark` ✅ |
| `81dfbdbac8790c5b.css` (inalterado) | 18.753 | 0 | nenhum |
| `d89e678cd64bcb3e.css` (inalterado) | 74.989 | 0 | tem `[data-theme=brasa]` como escopo de componente, não o bloco de tokens |

Os dois inalterados **devem** continuar em 0: nenhum deles define o bloco de tema. O chunk que define
é o que trocou de nome.

### Smokes do painel, contra produção (23:34, todos leitura)

| # | Smoke | Resultado |
|---|---|---|
| 1 | painel `/` | http=200 · `text/html` · 0,08 s |
| 2 | painel `/eventos` (tela de evento) | http=200 · 0,55 s |
| 3 | bundle novo `index-CfBX04Vv.js` | http=200 · `text/javascript` · 2.250.083 B |
| 4 | folha nova `index-3PlkfKJK.css` | http=200 · `text/css` · 109.979 B |
| 5 | chunk **antigo** `index-C2icjqor.js` | http=200 mas **`text/html`, 475 B** — é o `index.html` do rewrite SPA, não o bundle |
| 6 | folha **antiga** `index-DufB2CDQ.css` | idem — saiu do release |
| 7 | controle · `xyzzy0808.js` (nunca existiu) | idêntico ao 5 e ao 6 |

O smoke 7 é o que dá sentido aos 5 e 6: um arquivo que **nunca existiu** responde exatamente igual
ao chunk antigo, o que prova que aquele 200 é o rewrite e não "o bundle velho ainda servindo". Foi o
alerta que o handoff de 06/08 deixou registrado para não virar falso alarme, e aqui ele está usado.

---

## Passo 7 · Landing ✅ NO AR (23:27:58 → 23:37:20)

```
> node apps/landing/scripts/deploy-leela-hub.mjs        (em background, por causa do teto de 10 min)

  ▲ Next.js 14.2.35 · ✓ Compiled successfully · ✓ Generating static pages (12/12)
i  hosting[leela-landing]: found 99 files in .firebase\leela-landing\hosting
+  hosting[leela-landing]: file upload complete
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: version finalized · release complete
+  Deploy complete!
[deploy-landing] package.json restaurado.
LANDING_DEPLOY_EXIT=0
```

Uma execução, sem queda. Lancei em background desde o início por causa do **D-2 de 06/08** (SIGTERM
no teto de 10 min), e foi bom: a lane levou **9 min 22 s**, quase todo o tempo na atualização da
função SSR. Os ruídos `Failed to find esbuild with npx which` e `Failed to install esbuild` são os
**mesmos** de 05/08, 06/08 e das 22:03 — conhecidos, não-bloqueantes, o build seguiu e achou os
mesmos 99 arquivos.

### Prova 1 · hash de chunk baixado de produção — antes × depois

| chunk | ANTES (no ar 23:22) | DEPOIS (no ar 23:37) |
|---|---|---|
| **CSS do tema** | `89a187ed9dbddfef.css` | **`5c28c218c2cc65aa.css`** |
| `main-app` | `1d580aaf540f899f` | **`e695e72d2f035e50`** |
| `686-` | `8892f7fd68283960` | **`26785d39c0c266de`** |
| `870-` | `60336d4fbff4f397` | **`369d957f235eeb3a`** |
| CSS `81dfbdba…` e `d89e678c…` | inalterados | inalterados (corretamente — não definem tema) |
| demais 16 chunks JS | idênticos | idênticos |

### Prova 2 · `color-scheme` no CSS **baixado do ar** ✅

```
5c28c218c2cc65aa.css   14.335 B   color-scheme: 2
   :root:not([data-theme]),[data-theme=brasa]{color-scheme:dark
81dfbdbac8790c5b.css   18.753 B   color-scheme: 0     (não define tema)
d89e678cd64bcb3e.css   74.989 B   color-scheme: 0     (não define tema)
controle 'xyzzy0808' : 0 nos três

TOTAL na landing:   ANTES = 0      DEPOIS = 2
```

**O número que a REV-SCROLLBAR mediu como zero deixou de ser zero.**

### Prova 3 · o servido é byte a byte o construído

```
5c28c218c2cc65aa.css  local 7fca237066ca65d50b90d229efa852d034a1d3a84bc2d9c7805c19530a1f4ca8
                      no ar 7fca237066ca65d50b90d229efa852d034a1d3a84bc2d9c7805c19530a1f4ca8   IDENTICO
```

### Prova 4 · endereço certo

Tudo medido em `leela-hub.web.app` e `leela-landing.web.app`. **O preview congelado de 28/07 não foi
consultado em momento nenhum** — ele responde 200 e já custou meia hora numa lane anterior.

---

## Passo 8 · Smokes da landing e a checagem de regressão

| # | Smoke | Resultado |
|---|---|---|
| 1 | landing `/` (home) | http=200 · 1,44 s |
| 2 | landing `/teste-taxa-repassada` (página de evento) | http=200 · 2,02 s |
| 3 | landing `/minha-conta` (área do cliente) | http=200 · 0,41 s |
| 4 | callable `promoverParaProfissional` | http=401 · `{"details":{"motivo":"sem_sessao"}}` ✅ |
| 5 | controle · função inexistente | http=404 ✅ |
| 6 | painel **depois** do deploy da landing | segue `index-3PlkfKJK.css` + `index-CfBX04Vv.js` ✅ |

### O cartão "Painel Profissional" não regrediu pelo rebuild

O dispatch pede isso explicitamente. Baixei os **22 chunks** que `/minha-conta` referencia
(1.298.007 bytes) e contei dentro deles:

```
'Painel Profissional'                        : 1
'Quer organizar eventos ou criar um club?'   : 1
'O painel vai pedir sua senha de novo'       : 1
'promoverParaProfissional'                   : 1
'Conhecer o painel profissional' (o antigo)  : 0
controle 'xyzzy-nao-existe-0808'             : 0
```

**Os mesmos seis números que a DEPLOY-PONTE mediu às 22:14.** O rebuild não perdeu nada: o rótulo
novo, o subtítulo, o aviso do segundo login e a chamada da callable continuam lá, e o rótulo antigo
continua em zero.

**Nada foi escrito em produção.** A callable recusa antes de tocar o banco; não criei conta, não
promovi ninguém, não rodei suíte, não alterei código de produto, não abri navegador.

---

## Fechamento

**Janela:** 23:21 → 23:41 -0300 · **20 minutos.** Não passou de uma hora.
**HEAD publicado:** `6bb9b57b` (== `origin/main`) nos dois apps.

### Placar

| Passo | Estado | Prova |
|---|---|---|
| 0. Portão | ✅ | "APROVADA COM RESSALVAS / o deploy está LIBERADO", lido no topo do handoff da REV-SCROLLBAR |
| 1. Baseline | ✅ | medido no ar **antes** de comparar; CSS do painel com sha256 `1b1d361e…`, idêntico ao registrado em 06/08 |
| 2. Armadilha do `dist` | ✅ **paga** | `dist` 43 min mais velho que o commit ⇒ `tsup`; hash **idêntico** ⇒ era mtime, não conteúdo |
| 3. Inventário | ✅ | 7 arquivos embarcam; 2 dos 3 "consertos da vitrine" são testes e não sobem |
| 4. Painel | ✅ **no ar 23:27** | `index-C2icjqor` → **`index-CfBX04Vv`**, `index-DufB2CDQ` → **`index-3PlkfKJK`** |
| 5. Backend | ✅ **intocado** | 0 arquivos em `functions/src`, rules, índices e storage desde `a0852e76` |
| 6/7. Landing | ✅ **no ar 23:37** | CSS do tema `89a187ed` → **`5c28c218`**, +3 chunks JS |
| 8. Smokes | ✅ **6/6 + 7/7** | zero regressão; cartão "Painel Profissional" com os mesmos 6 números de 22:14 |

### `color-scheme` no CSS servido — a prova que o dispatch pediu

| App | ANTES (23:22) | DEPOIS | Onde |
|---|---|---|---|
| **Painel** | **0** | **2** | `dark` em `:root:not([data-theme]),[data-theme=brasa]` · `light` em `[data-theme=wine]` |
| **Landing** | **0** | **2** | `dark` em `:root:not([data-theme]),[data-theme=brasa]` |

⚠️ **Por que a landing não tem `light`, e isso está certo:** ela faz
`@import '@leela/design-system/themes/brasa.css'`, enquanto o painel importa `themes/index.css`. Não
existe bloco `wine` na landing — procurar `color-scheme:light` lá seria procurar o que não pode
existir. Registrado para não virar falso negativo numa conferência futura.

### Construído × revisado × NO AR

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| Cor da barra vinda do tema (`8e10ab8f`) | 08/08 | 08/08 (REV-SCROLLBAR) | ✅ **painel 23:27 · landing 23:37** |
| DEF-S1 · anti-FOUC do showroom (`ac010722`) | 08/08 | é o próprio conserto da review | ✅ no commit — **superfície de desenvolvimento, sem alvo de Hosting** |
| Prazo de 12 s do crachá (`1defe563`) | 08/08 | 08/08 (REV-VITRINE) | ✅ **painel 23:27** |
| Gate da camada de papel (`182d2852`) | 08/08 | 08/08 | n/a — **arquivo de teste, não tem o que subir** |
| Gate do elo do desfoque (`998cea5f`) | 08/08 | 08/08 | n/a — **arquivo de teste** |
| Callable + cartão da ponte | 06–08/08 | 08/08 (PONTE-REV) | ✅ desde 21:59 / 22:13 (lane anterior) |

### O que continua FORA DO AR depois desta lane

**Nada de código.** Não sobrou conserto construído dormindo sem deploy — que era exatamente o
padrão cobrado quatro vezes na double scrollbar, e a razão de esta lane existir.

O que continua aberto **não é código não publicado**, é decisão ou ação de outra pessoa:

- **SCROLLBAR-1** — a barra estilizada com token, se o dono quiser a marca na barra. Retido nele.
- **VITRINE-VEU-1** e **VITRINE-CONTRASTE-1** — os dois juízos da REV-VITRINE, com default em vigor.
- **PONTE-CTA-1**, **PONTE-NOME-1**, **PONTE-ELEGIVEL-1** — os três da PONTE-REV.
- **R1 e R2 da REV-SCROLLBAR** — a var `--color-scheme` não travada no arquivo commitado e o
  Storybook que estampa o tema depois do primeiro paint. As duas são de desenvolvimento.
- Pendências antigas, não tocadas aqui: Password policy no Identity Platform, BREVO-1, expurgo LGPD,
  tarifas do Asaas, matar conta demo, imagens de build não limpas.

### Nada foi violado

Não alterei código de produto · não rodei suíte alguma · não deployei function de produto, Rule,
índice nem storage · não criei conta nem promovi ninguém (todas as sondas são leitura) · não
rotacionei segredo · **não abri navegador** · não editei arquivo à mão no deploy da landing (o patch
do `package.json` foi aplicado e desfeito pelo próprio script) · `git commit --only` no fecho ·
**nenhum deploy falhou**, então a regra das duas tentativas não chegou a ser exercida.

### Desvios e registros para a próxima lane

**Nenhum desvio de processo.** Três coisas que valem ser lidas antes do próximo deploy:

1. **mtime atrasado não é conteúdo atrasado.** O `dist/` do DS estava 43 min atrás do último commit
   e o `tsup` devolveu **hash idêntico** — a defasagem vinha das mutações que a review reverteu com
   `git checkout --`. Em 22:03 a mesma classe de alarme era **real** (o `api-client` não tinha o
   símbolo). Como distinguir custa 12 segundos, a regra "pacote atrasado consumido pelo app que sobe
   é bloqueio" **fica de pé**: rebuilde e compare o hash, em vez de julgar pelo mtime.
2. **O deploy da landing atualiza a função SSR do próprio Next.** Não é function de produto, mas
   "nenhuma function" seria afirmação falsa. Escrito para não confundir numa auditoria.
3. **Duas das três "correções da vitrine" são arquivos de teste.** Valem como trava de regressão
   permanente e não têm nada para publicar. O relato ao dono não deve prometer três mudanças de tela.

### Estado da árvore

```
> git status --porcelain apps/ packages/ functions/
?? apps/mobile/.expo/      <- cache do Expo, de 03/08, pré-existente
?? functions/lib/          <- saída do tsc, pré-existente

apps/landing/package.json.deploybak -> NÃO existe (o finally do script rodou)
```

Os dois `??` são os **mesmos** que os handoffs de 06/08 e das 22:16 já registravam. Nenhuma sobra
nova, nenhum script temporário deixado para trás. O índice está vazio: o arquivo alheio
`leela-pixreal-diag-20260804-REV-5B.md` já tinha saído pela SEAL-DEFAULTS e não voltou.

### Para o dono — só o olho resolve o pixel

1. 👀 **Painel · `https://leela-hub.web.app/eventos/{slug}/inscritos`**, num evento com muita gente,
   no **Windows/Chrome**. É a mesma tela da conferência da barra **única** de 06/08, agora com as
   duas coisas juntas: uma barra só, e escura. Pergunta: a barra vertical à direita parece parte da
   tela ou continua um cinza-claro colado por fora?
2. 👀 **Landing · qualquer página longa** (a home, ou `https://leela-landing.web.app/teste-taxa-repassada`).
   Mesma pergunta.
3. **Na mesma passada, o que muda junto** (a review mediu, e classificou como melhora, não
   regressão): a lista aberta de um campo de escolha (modal de provisionar tenant), o ícone do campo
   de hora (evento novo, editor de campanha, editor de comunicado), o campo de data (convites da
   plataforma) e o preenchimento automático (checkout da landing) passam de claros para escuros.
4. **macOS não serve de contraprova** — lá a barra é overlay e some quando parada.
5. **SCROLLBAR-1 está pronto para ser fechado só olhando.** Se a barra escura do sistema já bastar,
   o default fica e o item sai do painel.
