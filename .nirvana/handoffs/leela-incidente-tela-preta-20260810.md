---
trace: leela-incidente-tela-preta-20260810
lane: INCIDENTE
employee: sf-reliability-engineer (software-forge)
repo: C:\dev\LEELA
worktree: C:/dev/leela-wt-rollback
head_pinado_rollback: 9fbcd9ab
head_quebrado: 021e3e4a
data: 2026-08-10
papel: mitigar (rollback) o painel em tela preta pós-REDESIGN-DS e diagnosticar a causa-raiz
---

# INCIDENTE — painel em tela preta · handoff vivo

Contrato: `.nirvana/briefs/leela-incidente-tela-preta-20260810-enriched.md`. Método: o mesmo
provado por `leela-deploy-corte-ret-20260809` e `leela-redesign-ds-20260809-DEPLOY.md` (worktree
pinado com barras normais, build em ordem de dependência, deploy hosting-only, prova baixada do
ar com hash e strings, controles positivo e negativo).

## Sintoma

"o painel está dando tela preta. nao abre." — relato do dono, 10/08 ~02h, logo após o deploy do
pacote REDESIGN-DS (`index-NiMJIszs.js`, commit `021e3e4a`). Confirmado antes de qualquer ação:
`curl https://leela-hub.web.app/` devolvia `index-NiMJIszs.js` / `index-CD9xuJJq.css` — o bundle
quebrado estava mesmo no ar.

## FASE 1 — ROLLBACK (mitigação) ✅ CONCLUÍDA

### Etapa 0 · portão

Árvore principal (`C:\dev\LEELA`) limpa em `packages/`/`apps/` no início da lane — só docs
untracked de lanes anteriores, não tocados por esta lane.

### Etapa 1 · worktree + build

`git worktree add C:/dev/leela-wt-rollback 9fbcd9ab` — ok, HEAD detached em `9fbcd9ab` (barras
normais desde o início, lição do handoff de DEPLOY registrada e aplicada; `git worktree list`
confirma path com barra normal, sibling de `C:/dev/LEELA`, não aninhado).

`pnpm install --config.verify-deps-before-run=false` — ok (único aviso: build scripts do
`@sentry/cli` ignorados de propósito, igual aos precedentes).

Build em ordem de dependência:

| Pacote | Build | Resultado | Confere com precedente (DEPLOY-CORTE-RET)? |
|---|---|---|---|
| `packages/core` | `tsup` | `dist/index.js` 302.83 KB | idêntico |
| `packages/api-client` | `tsup` | `dist/index.js` 95.90 KB | idêntico |
| `packages/design-system` | `tsup` | `dist/index.js` 231.94 KB | idêntico |
| `apps/painel` | `vite build --mode leela-hub` | 3991 módulos · `index-_EVW2ljU.js` (2.246,67 kB) + `index-3PlkfKJK.css` (109,98 kB) + `browser-BXdiCFWD.js` (24,53 kB) · 13,44s | mesmos nomes de hash |

### Verificação local antes de subir — build reproduzível byte a byte

```
index-_EVW2ljU.js  local a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d
index-3PlkfKJK.css local 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8
```

Idêntico, hash a hash, ao registrado em `.nirvana/handoffs/leela-deploy-corte-ret-20260809.md`
(Etapa 1/Prova 2). Confirma que o worktree pinado em `9fbcd9ab` reproduz exatamente o build que
esteve no ar até o deploy do REDESIGN-DS — sem depender de artefato antigo em disco.

### Etapa 2 · deploy — hosting-only do painel

Alvo único confirmado antes do comando (`firebase.prod.json`): `hosting alvos: 1 · site=leela-hub
· public=apps/painel/dist`.

```
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
+ hosting[leela-hub]: file upload complete
+ hosting[leela-hub]: version finalized · release complete
+ Deploy complete!
```

**Um alvo só** (`--only hosting`) — nenhum comando desta lane tocou functions, firestore, storage,
índices ou a landing.

### Etapa 3 · prova pós-deploy baixada do ar

**Mitigado às 09:14 (10/08/2026) — painel de volta ao estado pré-redesign.**

| Sonda | Resultado |
|---|---|
| `index.html` no ar referencia | `index-_EVW2ljU.js` + `index-3PlkfKJK.css` (bundle antigo, confirmado — não mais `index-NiMJIszs.js`) |
| hash do JS baixado do ar | `a1dd6f53c3…` — **idêntico** ao build local e ao registrado no precedente |
| hash do CSS baixado do ar | `60bce6cc9f…` — **idêntico** ao build local e ao registrado no precedente |
| `GET /` | HTTP 200 |
| `GET /clubes/engajamento` (rewrite SPA) | HTTP 200 |
| controle negativo — strings do REDESIGN-DS (`"Sem registro (30 dias"`, `"Engajamento"`, `[data-glass="on"]`, `Rubik`) | **ausentes** (0/0/0/0) — confirma que o bundle do redesign saiu do ar |
| controle positivo — `Exo 2` no CSS (token único pré-redesign) | **presente** (3 ocorrências) — mesma contagem da sonda de baseline do precedente |
| controle negativo genérico (`xyzzy`) | ausente (0) |

Rollback provado no ar por hash byte a byte + smoke + controles positivo/negativo. **Painel fora
do bundle quebrado desde 09:14 de 10/08/2026.**

### Etapa 4 · limpeza do worktree de rollback

Adiada — o mesmo worktree (`C:/dev/leela-wt-rollback`) será reaproveitado (checkout local, sem
novo `worktree add`) para reproduzir o boot do commit quebrado `021e3e4a` na FASE 2, evitando
tocar a árvore principal. Removido ao final de toda a lane (ver Etapa de limpeza final abaixo).

---

## FASE 2 — DIAGNÓSTICO

### Método — por que jsdom sozinho não serve

Tentativa 1 (deixar o jsdom parsear o `index.html` e executar o `<script type="module">` como um
browser faria) não funciona: **jsdom não executa `<script type="module">`** — confirmado por
controle mínimo (`<script type="module">console.log(...)</script>` ao lado de um `<script>`
clássico; só o clássico roda). Isso não é o bug do incidente, é limitação da própria ferramenta.

Método usado: carregar o bundle de entrada (`dist/assets/index-*.js`, achado via regex no
`index.html` construído) através do **loader ESM real do Node** (`import()` dinâmico, resolvendo
`import`/`export` de verdade — inclusive o chunk `browser-BXdiCFWD.js` importado dinamicamente de
dentro do bundle), com as globais de browser do jsdom instaladas em `globalThis` — a mesma técnica
que o `vitest-environment-jsdom` usa por baixo dos panos. Duas armadilhas do próprio harness,
resolvidas no caminho:

1. Copiar TODAS as ~437 propriedades de `window` para `globalThis` sem cuidado quebra: (a) métodos
   como `setTimeout` perdem o `this` amarrado ao window real e o código interno do jsdom recursiona
   infinito (`RangeError: Maximum call stack size exceeded` em `timerInitializationSteps`); (b)
   sobrescrever intrínsecos da linguagem que o Node já tem (`Object`, `Array`, `Promise`...) com as
   cópias do outro realm do jsdom quebra tudo (`TypeError: Object.defineProperty is not a
   function`). Fix: só copiar do jsdom o que o Node AINDA NÃO TEM (diff contra um snapshot de
   `Object.getOwnPropertyNames(globalThis)` tirado antes de tocar em qualquer coisa), mais uma
   lista curta forçada (`window`, `document`, `navigator`, `location`, `history`, `localStorage`,
   `sessionStorage`, `HTMLElement`, `Element`, `Node`, `CustomEvent`, `Event`) — e funções copiadas
   sempre com `.bind(window)`.
2. `process.exit()` chamado logo após várias escritas de `console.log` truncava a saída em pipes no
   Windows (saída cortada sem stack trace, exit code inconsistente). Fix: gravar cada checkpoint
   direto em arquivo via `fs.appendFileSync` (sem depender de flush de stdout) e nunca forçar
   `process.exit()` — deixar o processo drenar sozinho.

Scripts do harness (temporários da lane, removidos ao final): `_incident-boot-node.mjs` (o boot
real) e `_incident-boot-jsdom-control.mjs` (controle que provou a limitação do item 1). Viviam em
`C:/dev/leela-wt-rollback/apps/painel/`, fora da árvore principal.

### Resultado — o bundle de 021e3e4a NÃO lança exceção no boot

Rodei o boot real do bundle **de produção, quebrado** (`021e3e4a`, rebuildado no mesmo worktree
após checkout, `index-1d8YC7zd.js` + `index-CD9xuJJq.css`, 4001 módulos — hash não bate 100% com o
`index-NiMJIszs.js`/`index-CD9xuJJq.css` que está no ar porque o Vite não é *bit-reprodutível* no
nome do chunk principal entre builds idênticos [tamanho bate: 2.269,87 kB local vs 2.269,43 kB no
ar, diferença residual de hashing, não de conteúdo funcional], mas o CSS bateu no nome:
`index-CD9xuJJq.css` local = `index-CD9xuJJq.css` no ar):

| Sonda | Resultado |
|---|---|
| `import()` do entry lançou? | **Não** |
| `uncaughtException` / `unhandledRejection` capturado? | **Nenhum** |
| `window.addEventListener('error'/'unhandledrejection')` disparou? | **Não** |
| `#root` innerHTML após boot | **5343 caracteres** — HTML real da tela de login (`<h1>Entrar</h1>`, `Acesse o painel do organizador.`) |
| `data-theme` no `<html>` | `brasa` (correto) |
| `data-glass` no `<html>` | `on` (correto — rota `/entrar` é superfície "organizador", vidro ligado) |

**Controle A/B**: rodei o MESMO harness contra o bundle `9fbcd9ab` (o que está no ar agora, pós
rollback — usei os arquivos já baixados do ar na Etapa 3 da FASE 1, sem rebuildar). Resultado:
também sem erro, `#root` com 5308 caracteres (tela de login idêntica), `data-theme=brasa`,
`data-glass=null` (o atributo não existe nesse build — o componente é novo). A diferença de 35
caracteres entre os dois (5343 − 5308) é exatamente a classe
`[backdrop-filter:var(--card-blur)]` que o `data-glass="on"` novo injeta no card — ou seja, o
código novo RODA e aplica o efeito corretamente; não crasha nem no bundle velho nem no novo.

### Os três suspeitos do contrato, descartados com evidência direta

1. **Script anti-FOUC (`getThemeInitScript`)** — não se aplica. Grep no repo inteiro mostra que essa
   função só é referenciada em `packages/design-system/src/theme/ThemeProvider.tsx` (definição),
   nos testes do DS, no `showcase/index.html` do PRÓPRIO design-system e em docs — **nunca**
   dentro de `apps/painel`. O `index.html` do painel (fonte E buildado) não tem nenhum
   `<script>` inline; `main.tsx` chama `<ThemeProvider theme="brasa">` com a prop `theme` FIXA, que
   por contrato do próprio componente (doc no topo do arquivo: "prop `theme` — vence no mount e a
   cada mudança") tem PRECEDÊNCIA sobre qualquer valor persistido em `localStorage` — então nem a
   leitura de storage legado (`readStoredTheme`, linha 61-73 de `ThemeProvider.tsx`, já embrulhada
   em `try/catch`) chega a decidir o tema ativo do painel.
2. **Layout effect da `SuperficieDoPainel`** — código-fonte é uma derivação pura
   (`apps/painel/src/shell/superficie.ts`, `vidroDaRota`/`superficieDaRota`/`vidroDaSuperficie`):
   só `string.startsWith`, sem exceção possível para nenhum pathname. O boot real confirma:
   `data-glass="on"` foi escrito corretamente no `<html>` sem lançar nada, para a rota `/entrar`.
3. **Ordem do CSS (`@import` do Rubik)** — verificado byte a byte: o `@import` está na posição 0 do
   arquivo CSS buildado (`hexdump` confirma), a posição exigida pela spec. O bloco
   `[data-glass=on]{...}` e o `@supports not (backdrop-filter...)` de fallback estão presentes e
   bem formados; `--page-glow` tem valor definido em todo caminho (temas + bloco glass);
   `--surface-raised-opaque` (o fallback do `@supports`) está definido para todos os temas. Grep
   por `display:none`/`visibility:hidden`/`opacity:0` incondicional em `html`/`body`/`#root` no CSS
   buildado: nenhuma ocorrência.

### O que este método NÃO consegue provar — e por quê

`git diff 9fbcd9ab..021e3e4a` mostra que `SuperficieDoPainel.tsx`/`superficie.ts` são arquivos
**novos** (0 linhas antes, 48+63 depois) e o único ponto do pacote que escreve atributo direto no
`<html>` fora do fluxo normal de tema. Individualmente o componente passou limpo no boot real — mas
só testei a rota `/entrar` (pública, sem sessão). O guard de autenticação (`RequireSessao`) barra
acesso não-autenticado a TODAS as rotas reais do produto (`OverviewRoutes`, `ClubesRoutes`,
`EventosRoutes`, `PlataformaRoutes`) — sem credencial real (nenhuma foi fornecida, e não fabrico
uma), não consegui exercitar `RootShell` + `AppShell` + `Sidebar` + o card translúcido com dados
reais renderizados sob `[data-glass="on"]`, que é exatamente onde o pacote REDESIGN-DS concentra a
mudança visual. Um bug de CSS (stacking/z-index, `backdrop-filter` mal suportado num browser
específico, uma superfície opaca por cima do conteúdo só nessas rotas) é **estruturalmente
invisível** para jsdom: a ferramenta não calcula layout nem pinta pixel — só executa JS e constrói
a árvore DOM. A regra desta lane (sem navegador interativo) tira do meu alcance qualquer verificação
de paint/visual real.

### Causa-raiz — não determinada com prova executável dentro do escopo desta lane

Não encontrei o erro de boot que o contrato pediu porque **não existe um erro de boot capturável**
nesta ferramenta — o bundle de `021e3e4a` monta corretamente e não lança exceção alguma, em jsdom,
tanto na rota pública quanto (por construção do componente) para qualquer pathname. A hipótese
líder do contrato ("crash de boot") está **refutada** pelas evidências acima. As duas hipóteses
remanescentes, em ordem de probabilidade, exigem ferramenta que este método não tem permissão de
usar:

1. **Bug visual (CSS/paint) restrito às rotas autenticadas com vidro visível** — mais provável, dado
   que `SuperficieDoPainel`/`data-glass` são o único código genuinamente novo e testável só em
   contexto autenticado.
2. **Estado específico do navegador do dono** (cache antigo de HTML/CSS, extensão, viewport,
   suporte a `backdrop-filter`) — meaç não descartável sem o navegador real dele.

### Fix list proposta (para a lane própria de conserto — NÃO executada aqui)

1. **Fechar o gap de gate que deixou isso passar** (prioridade 1, é a causa-raiz do PROCESSO): subir
   um smoke E2E real (Playwright ou equivalente, browser de verdade) no pipeline de deploy — servir
   o `dist/` local, autenticar via Emulator com usuário semeado, navegar até uma rota com vidro
   ligado (`/`, `/clubes/engajamento`) E uma com vidro desligado (`/plataforma`), e afirmar
   conteúdo visível (texto real na árvore de acessibilidade, ou screenshot-diff). É a lacuna que o
   próprio brief já nomeou: suíte de 2387 testes em jsdom nunca fez o boot real do `index.html`.
2. **Reaproveitar o harness `_incident-boot-node.mjs`** (script funcional, hoje descartável) como
   gate leve de "não lança exceção no boot" em CI — barato, roda em segundos, já provou capturar o
   tipo certo de erro (achou e reportou o bug do PRÓPRIO harness em segundos quando eu o
   introduzi). Não substitui o E2E do item 1 (não vê CSS), mas é rede de segurança adicional
   gratuita.
3. **Investigar a rota autenticada com vidro ligado de verdade** — montar sessão real via Emulator
   e olhar (browser real, lane própria) `RootShell` + `AppShell` + `Sidebar` + o card com
   `[backdrop-filter:var(--card-blur)]` em `/`, `/clubes`, `/eventos` — os três `Routes` que a
   `RequireSessao` protegeu do meu alcance aqui.
4. **Perguntar ao dono**: navegador e SO exatos no momento do "tela preta" (Safari tem histórico de
   `backdrop-filter` sem prefixo `-webkit-` incompleto em versões antigas; o `@supports not
   (backdrop-filter: blur(1px))` do bloco gerado testa só a forma sem prefixo — ver
   `generateGlassActivationBlock()` em `packages/design-system/src/theme/generate.ts`) e se ele
   tinha sessão já aberta (cache de HTML antigo) ou abriu de novo/aba anônima.

### Etapa de limpeza final

Scripts temporários (`_incident-boot-node.mjs`, `_incident-boot-jsdom.mjs`,
`_incident-boot-jsdom-control.mjs`) e o worktree `C:/dev/leela-wt-rollback` removidos ao fim desta
lane — nenhum deles fazia parte da árvore principal em nenhum momento.
