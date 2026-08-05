# FIX-OVERLAY-LOGIN — o modal de login nascia preso dentro do header

- **Trace:** `leela-pixreal-diag-20260804`
- **Lane:** FIX-OVERLAY-LOGIN · employee `sf-frontend-lead` (software-forge)
- **Data:** 05/08/2026
- **Repo:** `C:\dev\LEELA` · base `7f6133fd` (HEAD == origin/main na largada)
- **Defeito:** reportado pelo DONO, em produção, em `https://leela-landing.web.app/teste-taxa-repassada`

---

## 1. O que estava errado

Clicar em "Entrar" no cabeçalho abria o modal colado no topo, cortado ao meio e sem
cortina. Nada no comportamento do diálogo estava quebrado — o problema era de
POSICIONAMENTO, e a medição no navegador (feita pelo maestro antes desta lane) já
tinha o culpado:

```
painel role=dialog  → "fixed inset-0 z-50 flex items-end justify-center sm:items-center"
                      computado: position fixed, inset 0px, MAS rect = 1920×64
                      (viewport de 911 de altura — o overlay ficou com 64px)
ancestral culpado   → <header class="sticky top-0 z-40 ... bg-surface-base/90 backdrop-blur">
```

`backdrop-filter` cria **bloco de contenção** para descendentes `position: fixed`
(mesma regra de `transform`/`filter`/`perspective`/`will-change`/`contain`). O
overlay era renderizado dentro do `<nav>` do `<header>`, então `fixed inset-0`
resolveu contra a caixa do header em vez da viewport: o modal centralizou dentro
de 64px e a cortina não cobriu tela nenhuma.

**Segundo sintoma, do mesmo pai:** `backdrop-filter` também cria CONTEXTO DE
EMPILHAMENTO. O `z-50` do diálogo ficava preso dentro do `z-40` do header, então
a barra fixa "Garantir inscrição" da página do evento (`page.tsx:248`, também
`z-40` e posterior no DOM) pintava POR CIMA do modal.

---

## 2. O conserto — e por que ele NÃO ficou onde o brief pediu

O brief pedia o portal no `EntrarOverlay`. A varredura mostrou que essa seria a
correção errada de altitude, e o conserto foi feito **um nível abaixo**, no
primitivo do DS:

**`packages/design-system/src/components/Dialog/Dialog.tsx`** agora usa
`createPortal(…, document.body)`.

Três fatos sustentam a mudança de altitude:

1. **O `Dialog` era o ÚNICO overlay do DS sem portal.** `Modal.tsx:101`,
   `Drawer.tsx:97` e `DropdownMenu.tsx:282` já portalizavam. Era omissão, não
   decisão de design — o conserto restaura a consistência do DS em vez de criar
   um one-off (anti-pattern explícito do meu contrato: "zero componente
   reinventado por feature").
2. **O raio de explosão fica 100% no meu território.** O `Dialog` tem
   exatamente 4 consumidores, todos em `apps/landing`. O painel NÃO usa este
   primitivo (usa `Modal`/`Drawer`, que já portalizam). A regra "não conserte
   `apps/painel`" foi respeitada — nada do painel muda.
3. **Corrige a classe, não a instância.** Login, regulamento, kit e aceites
   passam a ser imunes a qualquer ancestral filtrado, hoje e no futuro.

⛔ O `backdrop-blur` do header **não foi tocado** — é da marca e não é a causa.

### SSR (Next 14)

`createPortal` toca `document`, que não existe no servidor, e um portal já
presente na hidratação diverge do HTML do servidor. Por isso:

- o portal só monta depois do primeiro efeito do cliente (estado `montado`);
- o `useDialogBehavior` recebe **`open && montado`**, não o `open` cru. Sem esse
  `&&`, um diálogo que nascesse aberto rodaria o efeito de foco com o painel
  ainda fora do DOM e **o foco nunca entraria**. Nenhum consumidor nasce aberto
  hoje; a trava é para que o primeiro que nascer não descubra isso em produção.

### O gate da allowlist Radix-free (achado da lane)

`src/test/server-safety.test.ts` reprovou o `react-dom` novo no grafo do
`dialog.ts` — corretamente: a allowlist existe para que lib nova ali seja decisão
de arquitetura, não drift. **Decisão tomada e registrada no próprio teste:**
`react-dom` entra. O perigo que a allowlist guarda é o do `@radix-ui/*` (o dist
externaliza e, se a lib não existir no grafo do consumidor, vira MODULE_NOT_FOUND
no bundle público — foi o 500 da lane LPVK). `react-dom` não corre esse risco:
é peerDependency declarada do DS, é externalizada pelo tsup pelo MESMO caminho
que `react`, e é dependência direta da landing (`react-dom@^18.3.1` — Next não
renderiza sem ela).

---

## 3. Prova vermelho → verde

Medida trocando o arquivo pela versão de HEAD por **cópia de arquivo**
(⚠️ sem `git stash` — lição registrada; o original foi para fora do repo antes).

**VERMELHO** (com `Dialog.tsx` de HEAD, testes novos já no lugar):

```
apps/landing        Tests  2 failed | 14 passed (16)
  × FIX-OVERLAY-LOGIN > aberto de dentro do header, o diálogo é filho do BODY
    → expected true to be false
  × FIX-OVERLAY-LOGIN > nenhum ancestral do diálogo cria bloco de contenção
    → expected 'HEADER.sticky top-0 z-40 bg-surface-b…' to be null

packages/design-system  Tests  1 failed | 11 passed (12)
  × Dialog — portal no body > renderiza no document.body, fora do ancestral
    → expected true to be false
```

A mensagem do 2º caso **entrega o ancestral culpado por nome** — quem quebrar
isto de novo não precisa medir nada no navegador para saber quem foi.

**VERDE** (com o portal): `16 passed (16)` na landing, `12 passed (12)` no DS.

### Por que a suíte não pegou antes

Duas razões, e a segunda é a que importa:

1. jsdom não calcula layout — nenhum teste de posição acharia isto;
2. **os testes existentes renderizavam o `ContaHeader` SOZINHO**, fora do header
   que o contém na página real. O defeito só existe na composição.

Por isso os testes novos (a) montam o slot dentro de uma réplica do header e
(b) provam que a réplica é fiel lendo a fonte do `PublicHeader.tsx` e exigindo
`backdrop-blur` + `sticky top-0 z-40` + `<ContaHeader />`. Sem (b) a réplica
viraria teatro no dia em que o header mudasse. As asserções são **estruturais**
(quem é pai de quem), que é o que sobrevive à ausência de layout.

---

## 4. Varredura — o defeito é de classe, não de instância

Varredura completa de `position: fixed` sob ancestral com
`backdrop-filter`/`filter`/`transform`/`perspective`/`will-change`/`contain`,
em `apps/landing`, `apps/painel` e `packages/design-system`.

**Resultado: o raio é menor do que parecia.** Só existem 9 nós `fixed` em código
de produção no monorepo inteiro, e **só um ancestral criador de bloco de
contenção envolve um overlay** — o que o dono achou.

### (A) apps/landing + packages/design-system

| # | Local | Veredito |
|---|-------|----------|
| A1 | `packages/design-system/src/components/Dialog/Dialog.tsx:153` (container `fixed inset-0 z-50`) | **ERA A CAUSA-RAIZ · CORRIGIDO** (portal) |
| A2 | `apps/landing/app/components/EntrarOverlay.tsx:99` montado em `ContaHeader.tsx:90`, sob `PublicHeader.tsx:46` (`sticky top-0 z-40 … backdrop-blur`) | **ERA O DEFEITO EM PRODUÇÃO · CORRIGIDO** |
| A3 | `apps/landing/app/(public)/minha-conta/EstadosDaArea.tsx:50` (2º call site do `EntrarOverlay`) | SAFE — `PublicHeader` é IRMÃO do `<main>`, não ancestral. Corrigido de brinde. |
| A4 | `apps/landing/app/components/KitImagem.tsx:86` (lightbox) | SAFE — o `backdrop-blur-sm` de `KitImagem.tsx:80` é IRMÃO do `<Dialog>`, não ancestral |
| A5 | `…/[eventSlug]/sections/RegulamentoModal.tsx:44` e `…/inscricao/checkout/AceitesCompra.tsx:209,:228,:255` | SAFE hoje — sem ancestral filtrado; imunizados pelo portal |
| A6 | `apps/landing/app/(public)/[eventSlug]/page.tsx:248` — barra "Garantir inscrição" (`fixed inset-x-0 bottom-0 z-40 … backdrop-blur`) | SAFE (ela É o nó fixo). **Mas era ela que pintava por cima do modal preso** |
| A7 | `packages/design-system/src/components/Toast/ToastProvider.tsx:110` (`fixed bottom-… z-50`) | SAFE hoje, **NÃO portaliza** — ver pendência P1 |
| A8 | `…/checkout/PixCobranca.tsx:140` (`textarea` off-screen p/ `execCommand('copy')`) | SAFE — já é nível body, `opacity: 0`, removido na hora |

Portalizados por construção (conferidos): `Modal.tsx:101`, `Drawer.tsx:97`,
`DropdownMenu.tsx:282`, `Popover.tsx:34` (Radix Portal).

### (B) apps/painel — REGISTRADO, não consertado (território de outra lane)

O painel tem **dois** overlays `fixed` em código e **zero** ancestrais filtrados
no shell. Nada quebrado hoje; os dois são bombas-relógio sem teste.

| # | Local | Veredito |
|---|-------|----------|
| B1 | `apps/painel/src/routes/onboarding/OverlayConvite.tsx:103` — `fixed inset-0 z-50 … backdrop-blur-[…]` (carrega o blur ele mesmo). Montado em `ContaTravadaGate.tsx:69` → `AppShell.tsx:58/:81` → `RootShell.tsx:83` | SAFE — só `overflow` na cadeia, e `overflow` **não** cria bloco de contenção para `fixed`. Não portaliza. |
| B2 | `apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx:200` (scrim) e `:206` (painel) — sheet feito à mão, **não** usa o `Drawer` do DS | SAFE hoje, **não portaliza**. Se alguém puser `backdrop-blur` no shell do evento ou numa subnav sticky acima, quebra em silêncio. Ver P2. |

Quase-acidentes no painel/DS (ancestrais com `transform` que hoje não contêm
nenhum `fixed`): `KpiRow.tsx:108`, `CardEvento.tsx:59`, `EventRow.tsx:167` — os
três aceitam slots `ReactNode` arbitrários e hoje só recebem o `DropdownMenu`
portalizado. Nada quebrado; vira problema se um overlay não-portalizado for
encaixado num card.

### Resultados negativos (para ninguém re-gregar)

- **Zero** declarações de `backdrop-filter`/`filter`/`transform`/`will-change`/
  `contain`/`perspective` em QUALQUER `.css` do repo (landing, painel, temas do
  DS, showcase, storybook).
- **Zero** `style={{ transform | filter | willChange | perspective | contain }}`
  inline em `.tsx` sob `apps/` ou `packages/`.
- **Uma única** combinação `sticky` + `backdrop-blur` no monorepo inteiro:
  `PublicHeader.tsx:46`. Os outros `sticky` (`CampanhaEditor.tsx:439`,
  `ConfiguracoesView.tsx:159`, `ComunicadoEditor.tsx:278`, `DesafioEditor.tsx:363`)
  são `lg:sticky` puros, sem filtro.

---

## 5. Foco, teclado, rolagem e empilhamento — o que mudou

Nada regrediu; o portal foi feito para preservar o aceite da REV-AREACLIENTE.

- **Esc** — segue fechando (o listener é no `document`, indiferente ao portal). Testado.
- **Clique fora** — a cortina é filha do container portalizado; o handler viaja junto. Testado.
- **Botão X** — inalterado.
- **Retorno de foco ao gatilho** — o `returnFocusRef` aponta para o botão "Entrar"
  do header, que continua no header. O portal move o DIÁLOGO, não a ref. Testado
  explicitamente com o diálogo fora da árvore do header.
- **Foco de entrada** — continua no X. Preservado pelo `open && montado` (§2).
- **Trava de rolagem do fundo** — já existia no `useDialogBehavior` (body
  `overflow: hidden`, restaurado no cleanup); segue valendo. Testado.
- **Empilhamento** — nenhum token tocado. O `z-50` do diálogo é o mesmo; o que
  mudou é que ele agora disputa no contexto raiz em vez de ficar capado dentro
  do `z-40` do header. Ganha do header (`z-40`) e da barra de inscrição (`z-40`).

---

## 6. Gates

```
apps/landing        tsc --noEmit ............................. 0
apps/landing        eslint app lib --max-warnings 0 .......... 0
apps/landing        eslint test/entrar-overlay-s1221.test.tsx  0
packages/design-system  tsc --noEmit ......................... 0
packages/design-system  eslint src --max-warnings 0 .......... 0

SUÍTE DA LANDING INTEIRA, 2× SEGUIDAS (linha de base declarada: 57 arquivos /
700 testes; agora 706 = 700 + os 6 casos novos desta lane):
  RUN A   Test Files  57 passed (57)   Tests  706 passed (706)   127.00s
  RUN B   Test Files  57 passed (57)   Tests  706 passed (706)   122.29s

SUÍTE DO DESIGN-SYSTEM (mexi no pacote, então roda também):
          Test Files  59 passed (59)   Tests 1112 passed (1112)   35.43s
```

Sem `--testTimeout` extra: o arquivo já tinha `vi.setConfig({ testTimeout: 20_000 })`
por causa do custo de import do barrel do DS, e não precisou de mais.

### ⚠️ Armadilha encontrada na própria lane (vale para as próximas)

Uma rodada intermediária da suíte da landing acusou **9 falhas em 2 arquivos**
(`checkout-s1225-consulta-pedido`, `minha-conta-dados-s1222`) que **não têm
relação nenhuma com Dialog**. Causa: eu rodei `npx tsup` no design-system **em
paralelo** com a suíte, e o tsup tem `clean: true` — ele apagou e reescreveu
`dist/` no meio da execução. As duas rodadas limpas depois disso deram 706/706.
**Não rebuildar pacote enquanto uma suíte roda** — a falha resultante é
indistinguível de regressão.

---

## 7. ⚠️ O que o deploy PRECISA fazer (senão o fix não sobe)

`packages/design-system/dist/` é **gitignorado** (`.gitignore:38`) e os apps
resolvem `@leela/design-system/dialog` pelo campo `exports` do package →
`./dist/dialog.mjs`. **O commit não carrega o `dist`.**

Isso está coberto pelo `turbo.json`: a task `build` tem
`dependsOn: ["^build"]`, então `turbo run build` (o `pnpm build` da raiz)
reconstrói o DS antes da landing. **Confirme que o deploy passa pelo build da
raiz** — se alguém rodar `next build` direto dentro de `apps/landing` com um
`dist/` velho em cache, o modal sobe quebrado do mesmo jeito e os testes seguem
verdes (a suíte usa alias para `src`, não para `dist`).

Localmente eu já rebuildei e conferi: `dist/dialog.mjs` agora contém
`createPortal` (antes: 0 ocorrências).

---

## 8. Commit

```
fix(ds): o modal da landing nascia preso ao header porque o Dialog nao portalizava
```

Arquivos:

- `packages/design-system/src/components/Dialog/Dialog.tsx` — o portal + o porquê
- `packages/design-system/src/components/Dialog/__tests__/Dialog.test.tsx` — guarda no primitivo
- `packages/design-system/src/test/server-safety.test.ts` — `react-dom` na allowlist, com a razão
- `apps/landing/test/entrar-overlay-s1221.test.tsx` — 6 casos de regressão

Sem deploy — o maestro sequencia.

---

## 9. Pendências (o que precisa de olho humano DEPOIS do deploy)

**Verificação visual do dono, em produção** (⛔ eu não abro navegador sem
validação prévia — regra do Vitor). Na página de um evento, deslogado:

1. Clicar "Entrar" no cabeçalho → o modal precisa aparecer **centrado** (desktop)
   ou **colado embaixo como bottom-sheet** (mobile), inteiro, com o **fundo
   escurecido cobrindo a tela toda**.
2. Confirmar que o modal fica **acima da barra "Garantir inscrição"** do rodapé.
3. Esc, clique fora e o X fecham; ao fechar, o foco volta visivelmente para o
   botão "Entrar" do cabeçalho.
4. Com o modal aberto, a página de trás **não rola**.
5. Repetir em `/minha-conta` (2º call site) e no lightbox de kit.

**P1 — `ToastProvider` é o último `fixed` não-portalizado do DS**
(`packages/design-system/src/components/Toast/ToastProvider.tsx:110`). Seguro
hoje só por sorte de composição: qualquer consumidor que o monte dentro de um
wrapper com `backdrop-blur`/`transform` reproduz este mesmo bug, e não há teste
que pegue. Candidato a portal pela mesma receita.

**P2 — `InscritoSlideIn` (painel) é sheet feito à mão, não portalizado**
(`apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx:200,:206`).
Território de outra lane. Candidato a migrar para o `Drawer` do DS, que já
portaliza e já tem o comportamento provado.

**P3 — o gate que faltava.** Não existe teste que impeça um `fixed` novo de
nascer dentro de ancestral filtrado. O padrão dos 2 casos estruturais desta lane
(monta na composição real + prova a fidelidade da réplica lendo a fonte) é
replicável. Vale para P1 e P2.
