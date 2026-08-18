# Onda 0 Parte B — a moldura para de nascer na tela

**Trace** `leela-roadmap-componentes-20260810` · lane **FUNDACAO-LAYOUT** · branch `canon-fundacao`
**Worktree** `C:\dev\leela-wt-fundacao` (criado sobre `origin/main` @ `1e67eaff`)
**Data** 2026-08-11/12 · sf-frontend-lead (software-forge)

Paga a **Onda 0 Parte B** de `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md`,
destravada pela **CANONE-1** (leva 7, 11/08) e pela diretriz do dono: *"Se um componente nao existe,
precisamos documentar e padronizar o componente para nao ficar refazendo ele."* Ancora na história
**S005** do épico `LEELA-E01-design-system`. **Nenhum deploy. Nenhuma linha de `apps/` tocada.**

---

## 1 · As peças

Sete peças novas e três existentes que ganharam o que lhes faltava. Cada uma com catálogo (story +
docs + contrato LLM), teste, e a linha do cânone **no mesmo commit** — que é a regra de manutenção
escrita no próprio cânone.

| Peça | Props em uma linha | O que ela mata |
|---|---|---|
| **`Stack`** | `gap` (7 degraus) · `align` · `as` | as 448 ocorrências de `flex flex-col gap-*` com sete ritmos diferentes no painel |
| **`FormGrid`** | `columns` 2\|3 · `from` sm\|md\|lg · `gap` · `as` | **8 das 23 receitas** — `grid-cols-1 sm:grid-cols-2` (30×), `sm:grid-cols-3` (10×), `lg:grid-cols-2` (10×) e mais cinco |
| **`MetricGrid`** | `columns` 2\|3\|4 · `gap` · `as` | **7 das 23** — `grid-cols-2 lg:grid-cols-4` (12×), `md:grid-cols-4` (6×), `1 xs:2 lg:4` (4×) e mais quatro |
| **`SplitPanel`** | `ratio` 3:2\|7:3\|1:3 · `gap` · `as` | **5 das 23** — o bento assimétrico, `[3fr_2fr]` (4×), `[7fr_3fr]` (3×), `[1fr_3fr]` (1×) |
| **`SectionHeader`** | `title` · `titleAs` · `description` · slots `help`/`control`/`action` | a §7.3 — o cabeçalho de bloco que o painel resolveu em `components/SecaoHead.tsx` **depois de duas cópias** |
| **`CardDominio`** | `title`/`titleAs` · `leading` · `badges` · `description` · `meta` · `actions` · `accent` · `footer` · `children` · `clamp` · `as` | a §7.2 inteira — clube, comunicado, campanha, parceria e afiliação, os sete `<article>` crus |
| **`Alert`** | `tone` info\|vitoria\|alerta\|vulcao · `title`/`titleAs` · `icon` · `live` · `actions` | os **quatro** avisos do checkout escritos à mão (escopo acrescentado pelo maestro, encaminhado pela lane CKPIX-FLOW) |
| `Badge` **+`outline` +`size`** | `variant` ganha `outline`; `size` sm\|md\|lg | as **cinco pílulas** da landing que a Onda 1 deixou nomeadas (handoff §3.2) |
| `Card` **+`as`** | `as` div\|article\|section\|li\|aside | a lacuna que a Onda 1 nomeou: converter `<article>` de lista ou `<section aria-label>` apagava a semântica |
| `CardTitle` **+`as`** | `as` h2\|h3\|h4 | heading fora de ordem em cartão aninhado |

**23 receitas de grade → 3 componentes.** As três famílias que a medição achou, e nada além delas:
os casos próprios (calendário `grid-cols-7`, cohort, planos) seguem legítimos e sem canônico, porque
forçá-los num primitivo seria inventar generalidade que a medição não achou.

### As decisões de engenharia, e por que cada uma

**Uma peça para os cinco cartões de domínio, não cinco.** As cinco famílias foram lidas linha a
linha antes de qualquer código (`ClubeCard.tsx:67`, `ComunicadosList.tsx:58`, `CampanhasList.tsx:81`,
`ParceriasView.tsx:55`, `MinhasAfiliacoesPage.tsx:65`) e têm **a mesma anatomia**. O que muda é o
conteúdo dos slots. Cinco componentes com o mesmo corpo seriam cinco motores para manter em
sincronia — a lição que o `ConfirmModal` custou, aplicada ao contrário. Há teste comparando as
classes do `CardDominio` com as do `Card` para provar que a superfície é **composta, não reescrita**.

**A escala de cada peça é fechada.** Um primitivo que reexportasse a régua do Tailwind não teria
fechado nada. Três consequências concretas: o `Stack` **não publica degrau para `--spacing-5`** (24
usos, e é o único sem papel declarado na moldura); o `MetricGrid` **não tem prop de breakpoint** (a
diferença `md:`/`lg:` era gosto, e o ponto de partida tem decisão escrita no preset — REDESIGN-V2
item 6: abaixo de 480px o rótulo do KPI corta); o `SplitPanel` lê a proporção de **token**, e uma
quarta entra por token + linha no cânone, nunca por `className` de tela.

**`Grid` e `Surface` não eram nomes disponíveis.** Já são sinônimos reservados de `Table` e `Card` na
regra 2 do gate — a peça nasceria acusando a si mesma.

**O canal de ARIA do `Alert` é prop, com default `none`.** Os três avisos do checkout escolheram
canais **diferentes**, cada um com a razão escrita no topo do arquivo, e estavam certos:
`role="alert"` para o desfecho final que muda o que fazer; `role="status"` + `aria-live="polite"`
para a espera que não pode atropelar o anúncio de erro ao lado. `role` e `aria-live` saem de **uma**
prop porque `role="alert"` com `aria-live="polite"` é contradição que o navegador resolve do jeito
dele, e o defeito não aparece em teste nenhum. Default `none`: aviso que já estava na tela quando ela
carregou não é live region, e ruído treina a pessoa a ignorar o canal.

**A borda do `Badge outline` é `border-strong`, não `border-default`.** Numa pílula transparente a
borda é o componente inteiro, o que a tira da isenção de "frame decorativo" que o `Card` invoca e a
põe sob a 1.4.11. `border-default` dá **1.67:1** no brasa e **1.46:1** no wine — o mesmo número que
fez o `ConfirmModal` migrar (M1 da matriz). As cinco instâncias da landing usam `border-default`:
**converter sobe o contraste.**

### O defeito que o teste pegou antes do commit

Com `rounded-[var(--badge-radius)]` na base e `rounded-ds-pill` no eixo `size`, o **tailwind-merge
deixava os dois na string**: ele não reconhece `ds-pill` como chave de raio (é entrada própria do
preset) e por isso não vê conflito. Duas regras de mesma especificidade, vencedor decidido pela
ordem do stylesheet — que ninguém controla e que muda entre builds.

A correção não foi na asserção: a geometria inteira mudou de lugar, da base para o eixo, e três casos
travam a volta (`nunca há dois raios na string`, `nunca há dois paddings horizontais nem dois
tamanhos de texto`). **Deduplicação por merge é conveniência; ela não é contrato.**

---

## 2 · O gate passou a reprovar layout

| Contagem | painel | landing | Origem |
|---|---|---|---|
| `grade-crua` (**nova**) | **104** | **12** | instâncias de moldura escrita à mão |
| `receita-de-grid` | 23 | 9 | assinaturas distintas |
| `superficie-crua` | 107 | 6 | inalterado |
| `botao-cru-estilizado` | 6 | 0 | inalterado |
| `padrao-orfao` | 0 | 0 | inalterado |
| `controle-cru-fora-do-ds` | — | — | 3 (inalterado) |
| `padrao-reimplementado-fora-do-ds` | — | — | 2 → **3** (`SecaoHead`) |

Enquanto layout não tinha canônico, a §6 da spec mandava tratá-lo como **finding de processo** —
medir instâncias de um padrão sem componente é contar dívida que ninguém pode pagar. Com as peças
publicadas, a família migrou para a catraca, exatamente como a spec previa. **As duas contagens
ficam**, porque respondem perguntas diferentes: `grade-crua` é o tamanho da dívida (o que as ondas 1
a 5 derrubam) e `receita-de-grid` é a diversidade — é ela que denuncia tela reinventando a fração
com o primitivo já publicado.

Os sinônimos de moldura entraram no **plugin**, não no `eslint.config.mjs`: é lá que os outros vivem,
e o teste "todo sinônimo aponta para um nome que o barrel real publica" passa a cobri-los de graça.
`Alert` **saiu** da lista de sinônimos do `Toast` e virou nome canônico próprio — no shadcn, de onde
este DS puxa proveniência, `alert` é o aviso em bloco e o flutuante é `toast`.

**`ClubeCard`/`ComunicadoCard`/`CampanhaCard` ficaram DE FORA da lista de sinônimos do
`CardDominio`, com teste travando a decisão.** A §5 da spec protege o wrapper que COMPÕE (`KitCard`
compondo `Card` é o comportamento desejado), e um sinônimo ali proibiria para sempre o wrapper
legítimo de uma família. A dívida deles é de **superfície**, e quem a mede é a catraca.

### `--remedir`, a porta que faltava

`--atualizar` recusa quando uma contagem sobe, e essa recusa é o coração da catraca. Ela tem um ponto
cego: **quando o instrumento melhora, o número sobe sem o código piorar.** Foi o que aconteceu aqui —
`SecaoHead` virou sinônimo de `SectionHeader` e a contagem foi de 2 para 3, na mesma árvore, com zero
linha de `apps/` tocada.

Sem porta declarada, o único caminho seria editar o JSON à mão: exatamente o "conserte o baseline em
vez do código" que o script existe para impedir, e sem rastro nenhum. `--remedir` exige uma **razão
em texto** (mínimo 20 caracteres), grava razão e delta dentro do próprio baseline em `remedicoes[]`,
e faz o ato aparecer sozinho no diff. É o desenho da porta única de exceção da governança §8: não se
proíbe o caso legítimo, obriga-se ele a aparecer. As duas recusas (`--atualizar` com contagem
subindo, `--remedir` sem razão) foram provadas por execução antes do uso.

---

## 3 · O que a lane NÃO fez, de propósito

- **Nenhuma tela convertida.** As 104 + 12 instâncias de `grade-crua`, os sete `<article>` crus, as
  cinco pílulas e os quatro avisos do checkout seguem como estão. A conversão é das ondas 1 a 5, e o
  baseline existe para que ela seja medida.
- **`SecaoHead` não subiu para o DS.** Mover o arquivo significaria reescrever os consumidores em
  `clubes/engajamento` (Onda 4) e `overview/**` (Onda 5), território de lanes vizinhas. A peça nasce
  aqui, a conversão é delas, e a dívida está nomeada no `eslint.config.mjs` com a onda que paga.
- **`Card` não ganhou variante de superfície.** A lacuna que a Onda 1 nomeou (§3.1: seis instâncias
  em `surface-base`/`sunken`/`overlay`, que não têm elevação e por isso não são `Card`) **segue
  aberta**, deliberadamente. Ela é decisão de desenho — publicar `raised`/`sunken`/`inset` muda o que
  "superfície com elevação é `Card`" quer dizer — e esta lane não a inventou.
- **As dez grades `xl:grid-cols-2` do próprio showroom** não foram convertidas: o `FormGrid` abre em
  `sm`/`md`/`lg`, e acrescentar `xl` só para a vitrine seria inventar degrau a partir do showroom, e
  não do produto medido.

---

## 4 · O delta visual, para a conferência renderizada

**Esta lane não subiu navegador.** O showroom e o Storybook estão prontos com todas as peças nos dois
temas (L-019), mas a prova renderizada fica **pendente declarada** — é o item que eu levantaria antes
de qualquer deploy. O que olhar, e onde:

1. **Seção "Moldura"** do showroom (primeira da página de Componentes): as seis peças, com os
   degraus de `gap` do `Stack`, as três proporções do `SplitPanel` e as cinco famílias do
   `CardDominio` lado a lado.
2. **Card do `Badge`**: a linha `outline` e as três escalas. O delta contra a landing é declarado —
   a pílula herda peso **700** do selo (as instâncias usavam 600, uma 500) e a borda sobe de
   `border-default` para `border-strong`.
3. **Card do `Alert`** (seção Feedback): os quatro tons. O delta contra o checkout é o padding e o
   raio uniformes (as quatro cópias divergiam em `p-5`/`p-4` e `rounded-ds-lg`/`rounded-lg`).
4. **`CardDominio` composto de `Card`**: ele herda `border`, `shadow-elev-1` e `card-blur`, que os
   sete `<article>` crus não têm. É o mesmo delta que a Onda 1 registrou na landing, e ele aparece na
   conversão, não aqui.

---

## 5 · Gates

Rodados em foreground, em série. Números medidos nesta árvore.

| Gate | Resultado |
|---|---|
| DS · `tsc --noEmit` | ✅ limpo |
| DS · `eslint src showcase/src --max-warnings 0` | ✅ limpo |
| DS · suíte completa (`--fileParallelism=false`) | ✅ **83 arquivos, 1960 casos** (era 77/1842) |
| DS · suíte das peças novas + tocadas | ✅ Alert 23 · Stack 17 · FormGrid 14 · MetricGrid 10 · SplitPanel 9 · SectionHeader 14 · CardDominio 21 · Card 17 · Badge 23 |
| DS · `contrast.test.ts` | ✅ **249 casos** — zero par novo; dois casos nomeados (ALERT, BADGE-OUTLINE) para que ninguém remova os pares de que as peças dependem |
| DS · `server-safety.test.ts` | ✅ as sete peças novas entram em `/server` sem hook e sem Radix |
| `generate-tokens` 2× | ✅ idempotente (`git status` vazio na segunda) |
| `gate-canon` (camadas A e B) | ✅ **PASS** — 85 componentes no barrel, todos com linha no cânone |
| painel · `tsc --noEmit` | ✅ limpo |
| painel · `eslint src --max-warnings 0` | ✅ limpo |
| painel · suíte inteira | ver §5.1 |
| merge-tree vs `origin/main` | ver §6 |

### 5.1 · Nota de ambiente — o que custou tempo e vai custar de novo

**Worktree novo não tem `dist/` de pacote nenhum.** O `tsc` do painel reprovou com
`Cannot find module '@leela/design-system/tailwind-preset'` e a suíte reprovou 65 de 82 arquivos com
`Failed to resolve entry for package "@leela/core"` — **nenhum dos dois é defeito de código**. Os
`exports` dos três pacotes apontam para `./dist`, e um worktree recém-criado não tem nada lá.

A ordem que funciona, e que a próxima lane deve rodar antes de qualquer gate:

```
(cd packages/core && pnpm build) && (cd packages/api-client && pnpm build) && (cd packages/design-system && pnpm build)
```

É a mesma lição que a Onda 1 registrou de outro ângulo ("merge de main pede rebuild dos pacotes antes
de rodar a suíte") — aqui ela aparece na criação do worktree, não no merge.

**A suíte do painel não fecha em 600 s, nem serial nem a 2 workers.** São 239 arquivos de teste; a
execução serial gasta ~3 s por arquivo só de ambiente jsdom. `src/routes/eventos` sozinho (82
arquivos) passa de 600 s. O caminho que funciona é fatia por área, e as fatias precisam ser menores
que `eventos` inteiro.

---

## 6 · Merge

**Fechado em 12/08 pela lane `FUNDACAO-RESUME`** (sf-frontend-lead, software-forge), no mesmo
worktree `C:\dev\leela-wt-fundacao`, branch `canon-fundacao`. A lane morreu num reinício de PC
depois do merge da main (`a23f5bd5`), antes dos gates finais e do push — o resume auditou a
herança peça a peça (declaração não é prova) e rodou os gates do zero.

**Auditoria peça a peça.** As 10 entregas declaradas (7 peças novas + 3 upgrades) existem na
branch com story, docs, contrato LLM e teste. Achado registrado, não bloqueador: a linha do
cânone dos três upgrades (`Badge`, `Card`, `CardTitle`) entrou no commit `443394a1` (o das seis
peças novas), não nos commits que mudaram o código dos upgrades (`143e3ac5`, `1e53feac`) — quebra
a atomicidade "linha do cânone no mesmo commit" que a Parte A praticou à risca. Não bloqueou
porque o estado final da árvore está correto e o `gate-canon` (que aplica a regra em código)
passa; fica como lição para a próxima lane.

**Gates rodados do zero nesta máquina**, em foreground, fatiados por causa de contenção de lanes
vizinhas (vários processos `node` concorrentes; nenhum veredito aceito de execução em background,
por ordem direta do maestro):

| Gate | Resultado |
|---|---|
| DS · build dos 3 pacotes (`core`, `api-client`, `design-system`) | ✅ do zero, worktree sem `dist/` |
| DS · `tsc --noEmit` | ✅ limpo |
| DS · `eslint src showcase/src --max-warnings 0` | ✅ limpo |
| DS · suíte completa (`--fileParallelism=false`) | ✅ **84 arquivos, 1984 casos** (era 83/1960 na herança) |
| DS · `contrast.test.ts` | ✅ casos nomeados ALERT e BADGE-OUTLINE confirmados |
| DS · `server-safety.test.ts` | ✅ as sete peças novas cobertas pelo grafo de `server.ts` |
| `generate-tokens` 2× | ✅ idempotente (`git status` vazio nas duas passagens) |
| `gate-canon` (camadas A e B) | ✅ **PASS** — 85 componentes no barrel, catraca intacta, nenhuma contagem subiu contra o baseline |
| painel · `tsc --noEmit` | ✅ limpo |
| painel · `eslint src --max-warnings 0` | ✅ limpo |
| painel · suíte completa | ✅ **239 arquivos, 2646 casos**, rodada em 6 fatias seriais foreground (133+24 fora de `eventos`, 25+23+34 dentro de `eventos`) |

**Merge.** `git fetch` trouxe a main adiante por 6 commits desde o merge anterior (leva 8, docs e
boards apenas — nenhuma linha de `packages/` ou `apps/` tocada); `git merge origin/main --no-edit`
na worktree, sem conflito. Boards e ondas atualizados e commitados na branch
(`5467fa2e`) antes do merge para a main. `git merge --no-ff canon-fundacao` na main, sem
conflito: hash `b113da92`. `git push origin main`: aceito de primeira, sem rejeição — `ahead 0`,
`behind 0` confirmado por `git fetch` + `git rev-list --left-right --count HEAD...origin/main`.

**Nenhum deploy.**

---

## 7 · Para quem pegar as ondas 1 a 5

- **A conversão tem alvo agora.** `grade-crua` = 104 + 12. Cada onda que converter moldura derruba o
  número e roda `--atualizar` no mesmo commit.
- **`--remedir` é para quando a RÉGUA muda, nunca para quando o código piora.** A distinção está no
  diff: se `apps/` foi tocado, é `--atualizar` ou é conserto.
- **Os quatro avisos do checkout são a primeira conversão do `Alert`, e há uma armadilha.** Os três
  originais **não usam o mesmo canal de ARIA** — `AvisoPedidoEncerrado` é `alert`,
  `ProcessandoPagamento` é `status`, e cada um tem a razão escrita no topo do arquivo. Uniformizar
  apagaria uma distinção de acessibilidade deliberada. Conferir `live` um por um.
- **`col-span-full` é a saída sancionada** para o campo de linha inteira dentro de `FormGrid`; não há
  prop, e a razão está no LLM.txt.
- **`<Card as="li">` dentro de `<ul>`, `<Card as="section">` quando havia `aria-label`.** As duas
  regras que a Onda 1 aprendeu agora têm suporte no componente em vez de contorno na tela.
- **Lacuna que segue aberta e nomeada:** `Card` sem variante de superfície (`raised` × `sunken` ×
  `inset`) — seis instâncias da landing (Onda 1 §3.1) esperam essa decisão de desenho.
