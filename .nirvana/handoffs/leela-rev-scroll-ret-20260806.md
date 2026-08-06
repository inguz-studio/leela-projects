# REV-SCROLL-RET · a review de rolagem retomada, com a tela de eventos primeiro

- **Trace:** `leela-scroll-20260806` · **Lane:** REV-SCROLL-RET
- **Papel:** revisor antagonista do padrão de rolagem (BUILD-SCROLL-PADRAO + `f2398e36`)
- **Território:** `packages/design-system/**` + `apps/painel/src/shell/**`.
  Nada em `functions/`, `apps/painel/src/routes/onboarding/`, `DECISOES-ABERTAS-TRIAGEM.md`
  nem no handoff staged da REV-5B.
- **Sem deploy** — o maestro sequencia.

## Commits

| Commit | O que entrou |
|---|---|
| `a06c16d4` | O `<main>` do AppShell e o contêiner de rolagem do RootShell viram `relative` + 3 testes |
| `a0b353ee` | A sobra do lint completada: grafia arbitrária + objeto de estilo + 7 testes |

## Placar

| # | Vetor | Veredito |
|---|---|---|
| **0** | **Tela de eventos** | ⛔ **DEFEITO** — havia um caminho vivo para a segunda barra, e ele não passava por `overflow-*`. Consertado em `a06c16d4`. |
| 2 | Landing (página do evento, checkout) | ✅ SUSTENTA |
| 3 | Overlays do DS (Drawer, Modal, SlideIn) | ✅ SUSTENTA, com uma lacuna declarada no Drawer |
| 4 | Tabelas e listas largas do painel | ✅ SUSTENTA |
| 5 | Escopo do lint | ⚠️ SUSTENTA no código, mas **folha de estilo é ponto cego de todo gate** |
| 6 | 320px | ✅ SUSTENTA para barra dupla; o `Stepper` segue como recorte, não como barra |

## Vetor zero · a tela de eventos

### O que foi provado por execução

1. **Varredura de `overflow-*`** em `apps/painel/src`: fora de teste e comentário só
   existe `overflow-hidden` decorativo (avatar, thumb, barra de progresso, canto de
   card). Declaram os dois eixos e não rolam. Nenhum eixo solto nas rotas de eventos.
2. **Varredura das outras duas grafias**: nenhum `style={{ overflow… }}` e nenhum
   `[overflow-x|y:…]` no painel. O único `[overflow-…]` do repo é
   `[overflow-wrap:anywhere]` na `Table`, que é quebra de palavra, não eixo.
3. **`eslint --max-warnings 0`** sobre `apps/painel/src/routes/eventos/**` e
   `apps/painel/src/shell/**`, com a regra reforçada: **0**.
4. **Falsificação**, para a regra não estar apenas calada: um `overflow-y-auto`
   solto injetado numa rota de eventos sai **vermelho** com a mensagem inteira; um
   `style={{ overflowY: 'auto' }}` na mesma rota sai **vermelho** pela regra nova.
5. **Contêiner raiz**: `RootShell` carrega `SCROLL_Y_ONLY` e o `<main>` do AppShell é
   `overflow-hidden` nos dois eixos. A cascata da CSS Overflow 3 §3.1 está fechada.

Até aqui o padrão sustenta: **pela classe, a tela de eventos não tem como fabricar
uma segunda barra.**

### O sobrevivente

O dono viu a barra dupla **depois** do deploy das 17:20, que subiu o fix de eixo. Se
a causa fosse o eixo, teria sumido. Não sumiu, e o motivo é que existe um segundo
caminho para a barra vertical que nenhuma varredura de `overflow-*` alcança.

Recorte por `overflow` só atinge descendente **cujo bloco de contenção seja aquele
elemento ou um filho dele**. Um `position:absolute` com **todos** os ancestrais
`static` pula direto para o bloco de contenção inicial, o `<html>`. Não é recortado
pelo `overflow-hidden` do `<main>`, nem pelo do AppShell, nem pelo contêiner de
rolagem da página, e **estica o `scrollHeight` do documento**.

Quem faz isso hoje, no painel:

| Componente | O elemento | Tem ancestral posicionado? |
|---|---|---|
| `Pagination` | `<span class="sr-only">Página X de Y</span>` | **não** — nenhum `relative` no arquivo |
| `Table` | `<caption class="sr-only">` e `<span class="sr-only">Ações</span>` | **não** — nenhum `relative` no arquivo |
| `Stepper` | `<span class="sr-only"> (concluída)</span>` | **não** |

E a cadeia inteira acima deles é `static`: o conteúdo da tela, o contêiner de
rolagem do `RootShell`, o `<main>`, a raiz do AppShell, o `#root`, o `body`.

**Em inscritos isso é grave**: o `.sr-only` da paginação cai **depois** de uma tabela
longa, bem abaixo da dobra. O documento estica até ele e o navegador acende uma barra
vertical **do documento**, encostada na barra da página. Duas barras verticais lado a
lado — exatamente o que o dono reportou, na tela que ele reportou.

Isto não é teoria. **O showroom mediu este mesmo defeito antes**, no mesmo AppShell, e
deixou escrito em `packages/design-system/showcase/src/showcase.css`: *"um descendente
`position:absolute` com posição estática (ex.: o `.sr-only` do Stepper …) estica o
scrollHeight do documento e cria uma barra + scroll para o vazio abaixo do conteúdo"*.
O showroom travou o `<html>`. O painel nunca ganhou trava nenhuma.

### Por que o remédio do showroom não serve aqui

`html { overflow: hidden }` no painel **prenderia as telas de autenticação**. O
`AuthLayout` (entrar, cadastrar, recuperar e redefinir senha) vive **fora** do
AppShell e usa `min-h-screen`: ele cresce com o conteúdo e rola no documento de
propósito. Um lock global deixaria formulário longo inalcançável. Copiar o fix do
showroom teria trocado uma barra a mais por uma tela sem saída.

### O conserto

A trava é por **bloco de contenção**, não por lock global:

- `packages/design-system/src/components/AppShell/AppShell.tsx` — o `<main>` vira
  `relative`. É a barreira de fora, e vale para **qualquer** app que use o shell, não
  só o painel. O `overflow-hidden` que já estava lá volta a alcançar os absolutos.
- `apps/painel/src/shell/RootShell.tsx` — o contêiner de rolagem da página vira
  `relative`. Resolve o outro lado, que é a semântica: o absoluto pertence ao
  conteúdo que rola, não à moldura parada.

Sem offsets e com `z-index: auto`, `relative` **não move nada e não cria contexto de
empilhamento**. Modal, Drawer, DropdownMenu e Popover portalizam no `body` e seguem
intocados.

**Testes novos: 3.** Um no DS (`AppShell.test.tsx`: o `main` é `relative` **e**
`overflow-hidden` — os dois ou nenhum, porque um sem o outro não recorta) e dois no
painel (`ScrollDaPagina.test.tsx`: o contêiner de rolagem é bloco de contenção; a
moldura também é).

## Vetores 2 a 6

**2 · Landing.** Todo `overflow` de `apps/landing/app` é `overflow-hidden` decorativo.
O gate cobre `apps/*/app/**` e fecha em 0. A landing rola no documento por desenho, e
o `Dialog` do regulamento carrega `SCROLL_Y_ONLY`. Não há caminho para barra dupla.
A landing **não** empacota o `AppShell`, então nada desta lane a alcança.

**3 · Overlays.** `Modal`, `Dialog`, `Sidebar` e `InscritoSlideIn` carregam
`SCROLL_Y_ONLY`, e sempre **depois** do `className` do consumidor — a trava da
REV-LOTES está de pé nos quatro. **Lacuna declarada:** o `Drawer` não tem contêiner de
rolagem nenhum. Hoje isso não fere, porque o único consumidor de produção é o
`AppShell`, que aninha a `Sidebar` (que tem o seu). Mas um consumidor futuro com
conteúdo alto ganha **conteúdo inalcançável** — não barra dupla, o defeito oposto. O
lint não pega isso: falta de contêiner não é classe errada, é classe ausente.

**4 · Tabelas e listas largas.** A `Table` rola em x **dentro do card**
(`SCROLL_X_ONLY`), nunca na página. A única consumidora de `responsive="scroll"` é
`EstoqueView` (a matriz kit×modalidade de kits). Procurei o contraexemplo do vetor 5
original — algum consumidor passando `max-h` pelo `className` e sendo recortado pelo
eixo y fechado: **não existe nenhum**. A regra da casa sustenta.

**5 · Escopo do gate.** O lint cobre `packages/design-system/src`,
`packages/design-system/showcase/src`, `apps/*/src` e `apps/*/app`. `apps/mobile` está
fora com justificativa (React Native não usa Tailwind) e `apps/landing/lib` não tem
`className`. **O ponto cego que resta é outro e é maior: nenhum gate lê folha de
estilo.** Um `overflow-y: auto` escrito em `globals.css` passaria por cima de tudo sem
disparar nada — e é justamente onde mora o fix do showroom. Conferi as sete folhas de
estilo do repo à mão: nenhuma declara eixo solto hoje. É verificação manual, não gate.

**6 · 320px.** Com o eixo x da página fechado, largura demais vira **recorte**, não
barra. O `Stepper` continua sem contêiner próprio, como a lane construtora declarou;
ele aparece no balcão (`AtendimentoPanel`, `EstadosBalcao`), que é superfície de
eventos. Não é caminho para barra dupla. Segue como conferência visual do dono, e o
conserto certo, se estourar, é encurtar ou quebrar o rótulo.

## A sobra do lint · decisão: completar

O diff sem commit tinha ~98 linhas e fechava três vetores de fuga **reais**. Descartar
seria jogar fora trabalho bom. Faltavam os testes, e são eles que provam que os
vetores existiam.

Rodei os quatro vetores contra o plugin de `HEAD` e contra o da sobra:

| Vetor | `HEAD` | Sobra |
|---|---|---|
| `"flex-1 [overflow-y:auto]"` | **passou em silêncio** | barrado |
| `"max-lg:[overflow-y:auto]"` | **passou em silêncio** | barrado |
| `style={{ overflowY: 'auto' }}` | **passou em silêncio** | barrado |
| `style={{ 'overflow-y': 'auto' }}` | **passou em silêncio** | barrado |

O repo escreve CSS de duas maneiras e a regra só lia uma. A arbitrária é **idioma vivo
da casa** (`[overflow-wrap:anywhere]` na `Table`, `[scrollbar-width:none]` no
`SubNav`), então era a grafia mais provável de reintroduzir o defeito por baixo do
gate. O corte de prefixo por `lastIndexOf(':')` piorava: cortava
`max-lg:[overflow-y:auto]` no `:` de dentro do colchete e o token inteiro sumia.

O terceiro vetor é o pior dos três. **Estilo inline vence qualquer utilitário**, então
nem a trava depois do `className` no `cn()` segura. Nenhuma análise de literal de
classe pega, porque `'auto'` sozinho não é classe de overflow.

Falso positivo era o risco de verdade, porque um só pararia o gate do repo inteiro:
`[overflow-wrap:anywhere]` e `[scrollbar-width:none]` ganharam teste próprio, e o gate
completo fecha em 0.

**Testes novos: 7** (o arquivo foi de 14 para 21).

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (design-system) | **0** |
| `tsc --noEmit` (painel) | **0** |
| `eslint --max-warnings 0` (DS + showcase + painel + landing) | **0** |
| Suíte do design-system | **67 arquivos / 1236 testes** ✅ |
| Suíte do painel | **207 arquivos / 2176 testes** ✅ |
| Plugin do lint | **21 testes** ✅ (eram 14) |

`tsup` do DS rodou **antes** da suíte do painel, nunca em paralelo. Uma suíte por vez.

## ⚠️ O que esta lane NÃO prova

**jsdom não faz layout.** Os três testes novos são contrato de estilo: provam que a
classe está lá e que some vermelho se alguém a tirar. Nenhum deles desenha barra.

O que fica para o olho do dono, em **inscritos com lista longa**, que é a tela e o
estado onde o mecanismo aparece:

1. **Uma barra vertical só**, a da página. Se ainda houver duas encostadas, a causa
   não é a que esta lane fechou.
2. **A barra do documento não pode existir** — antes ela rolava para o vazio abaixo do
   conteúdo. Esse é o sintoma que identifica o defeito com certeza: rolar e não
   acontecer nada na tela.
3. O mesmo em **kits › estoque** e no **balcão em 320px**.

Não abri navegador (ordem permanente do Vitor). A confirmação de que a barra sumiu na
tela real é conferência visual, não gate.

## Redeploy

**Necessário: sim, e só o painel.** A landing não empacota o `AppShell`.

Mudou em código servido, e é só isto:

| Arquivo | Mudança |
|---|---|
| `packages/design-system/src/components/AppShell/AppShell.tsx` | o `<main>` ganhou a classe `relative` |
| `apps/painel/src/shell/RootShell.tsx` | o contêiner de rolagem da página ganhou a classe `relative` |

Duas classes, sem offset, sem contexto de empilhamento, sem mudança visual esperada.
O resto dos commits é teste e lint, que não são servidos: o plugin roda no gate, não
no navegador.
