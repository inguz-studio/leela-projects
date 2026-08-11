# Onda 0 do roadmap de componentes — o DS para de duplicar o próprio motor, e o gate vira código

**Trace** `leela-roadmap-componentes-20260810` · lane **ONDA-0** · branch `canon-onda-0`
**Worktree** `C:\dev\leela-wt-onda0` (criado sobre `origin/main` @ `67c3b035`)
**Data** 2026-08-11 · sf-frontend-lead (software-forge)

Paga a **Parte A da Onda 0** de `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md` e a
tarefa **S005-T5** do épico `LEELA-E01-design-system`. Nenhum deploy.

## O que mudou, item por item

| # | Item | Commit | Teste |
|---|---|---|---|
| 1 | `ConfirmModal` compõe `Textarea` e `Checkbox` canônicos | `e173b63a` | 4 casos novos no `ConfirmModal.test.tsx` (14 no arquivo) |
| 2 | As dez lacunas de catálogo ganham story | `b63e968e` | `build-storybook` compila as 11 stories; prova renderizada nos dois temas |
| 3 | `Command` ganha teste | `37751b4b` | 12 casos novos (`Command.test.tsx`) |
| 4 | Gate `leela-canon` vira código (S005-T5) | `2ceb9fd4` | 17 casos de `RuleTester` + falsificação da catraca e da camada A |
| 5 | Correções de documento que a execução impôs | `3029022d` | camada A do gate passa a verde |

### 1 · `ConfirmModal` (a violação mais grave do inventário)

O design system duplicava o próprio motor: `ConfirmModal.tsx:198` montava um `<textarea>` cru e
`:226-228` um `<input type="checkbox">` com `accent-color`, **dentro de**
`packages/design-system`. As ~26 telas do painel que consomem o `ConfirmModal` herdavam estados que
nunca passaram pelo AA por estado do `Checkbox`.

O custo concreto, que só apareceu ao ler o código lado a lado: o textarea cru **nasceu antes do
`LEELA-FLAT-DEFAULT`** (ratificado 2026-07-17) e ficou parado no `bg-surface-base` +
`border-strong` da §2.16 antiga — divergindo de todo campo do produto sem que gate nenhum visse. É
a demonstração exata do que a L-021 descreve: a decisão foi tomada, o componente canônico foi
atualizado, e a cópia interna não recebeu o recado.

API pública intacta: mesmos props, mesmo `onConfirm({ reason, notify })`, mesmos nomes acessíveis.

**A prova é por identidade de assinatura**: a `className` do controle dentro do modal tem de ser
igual à do componente renderizado sozinho. Reinlinar o motor quebra o teste — não é uma asserção
sobre como o arquivo foi escrito, é sobre qual engine está lá.

### 2 · Dez lacunas de catálogo → 50 de 50 com story

`charts`, `Checkbox`, `Dialog`, `Field`, `InputSenha`, `Radio`, `Select`, `SidebarRail`, `Switch`,
`Textarea`. Sete dos dez eram controle de formulário. Onze arquivos porque `charts` entra por dois
(`BarChart`, `DonutChart`) — o Storybook aceita um título por arquivo.

Cada story cobre os estados que a governança §7 manda conferir nos dois temas, e a prosa de cada
uma diz qual é a fronteira com o vizinho (`Checkbox` × `Switch`, `Select` × `Combobox` ×
`FilterMenu`, `BarChart` × `DonutChart`) apontando o cânone — porque o inventário §8 identifica o
catálogo cego como causa plausível de reincidência, e catálogo que não ensina a escolher não
resolve isso.

### 3 · `Command` ganha teste → 50 de 50 com suíte

Era o único dos 50 sem teste algum, e é a base do `Combobox`. Doze casos sobre o contrato: roles do
WAI-APG, filtro por digitação, estado vazio, primeira opção pré-selecionada, seta, Enter, clique,
item desabilitado, os dois eixos de rolagem e o `className` do consumidor que **não** apaga o eixo
(o defeito que o próprio comentário do `CommandList` registra ter existido).

Dois casos nasceram falsificados: eu supunha que o `cmdk` devolvia o `value` em minúsculas no
`onSelect`. Ele devolve a string original. A suposição morreu na execução.

### 4 · Gate `leela-canon` (S005-T5)

**Regra 1 · `controle-cru-fora-do-ds`** — barra o controle nativo com canônico publicado
(`select`/`option`, `textarea`, `input` por `type`, `dialog`). Não barra: tipo sem canônico
(`hidden`, `submit`, `button`, `range`, `color`), `type={expressão}` (desconhecido não é violação),
`<input type="password">` (já é a `leela-auth/senha-fora-do-ds` — regra nova não duplica regra
velha), `<details>`/`<summary>` (padrão sem canônico é finding de processo, spec §5) e `<button>`
(spec §4).

**Regra 2 · `padrao-reimplementado-fora-do-ds`** — barra a **declaração** com nome de export
canônico ou sinônimo reconhecido. O nome do arquivo não é evidência: `KitCard` que compõe `Card`
passa; um `Card` declarado fora do DS reprova.

**A lista `canone` não é escrita à mão.** `canoneDoBarrel()` a deriva de
`packages/design-system/src/index.ts` a cada execução do `eslint.config.mjs`. Config e barrel não
têm como divergir, porque a config *é* o barrel.

**`scripts/gate-canon.mjs`** (molde do `verify-brand-fonts.mjs`):
- **Camada A** · barrel × config; barrel × documento canônico (componente sem linha reprova); e a
  prova de que cada entrada de dívida herdada **ainda produz achado** — entrada morta reprova.
- **Camada B** · catraca por app, baseline versionado em `scripts/gate-canon.baseline.json`. Subir
  reprova; `--atualizar` recusa quando alguma contagem subiu.

Rodando: `pnpm gate:canon` · `--relatorio` · `--atualizar`.

### 5 · Correções de documento

- **Cânone** ganhou `CardFooter` (§4) e `SidebarBrand`/`SidebarFooter` (§9) — três lacunas reais que
  a camada A reprovou no primeiro dia. O gate pagou o próprio custo antes de proteger qualquer coisa.
- **`governanca-design.md` §8**: a dívida do próprio DS passa de aberta a paga, e a seção ganha como
  rodar o gate.
- **`04-ondas-roadmap.md`** e **`02-inventario-componentes.md`**: F4/F5 corrigidos (abaixo), estado
  do DS atualizado, fechamento da Parte A com números.

## O baseline inicial do gate

| Contagem | painel | landing | total |
|---|---|---|---|
| `superficie-crua` | 107 | 27 | 134 |
| `botao-cru-estilizado` | 6 | 5 | 11 |
| `receita-de-grid` (assinaturas distintas) | 23 | 9 | — |
| `padrao-orfao` | 0 | 0 | 0 |
| `controle-cru-fora-do-ds` (regra 1) | — | — | **4** |
| `padrao-reimplementado-fora-do-ds` (regra 2) | — | — | **2** |

As **23 receitas de grid do painel batem com as 23 assinaturas distintas** que o inventário §7.1
contou por leitura dirigida. Duas medições independentes no mesmo número — é isso que dá crédito às
outras contagens.

`superficie-crua` (107/27) **não** é o mesmo número da divergência de cartão do inventário (141/51):
o script exige a assinatura completa (raio + fundo de superfície + espaçamento) nos dois dialetos de
classe do repositório; o inventário classificou por leitura. Medem a mesma dívida com réguas
diferentes, e só a do script tem catraca.

## Três decisões que o maestro precisa saber

### 1 · A §9 da spec do gate não se implementa com severidade neste repositório

A spec manda o gate nascer `warn` "para não barrar ninguém". **`warn` não faz isso aqui** — os três
`lint` rodam com `--max-warnings 0`, que é o contrato do CI, e warning barra igual a erro. O
`senha-fora-do-ds`, que a ordem mandou usar de molde, resolveu do único jeito que funciona: nasceu
`error` **depois** que as dezessete instâncias foram pagas, com contagem zero.

Como as instâncias daqui pertencem a ondas que ainda não rodaram, o instrumento do rollout virou a
**lista de dívida herdada no `eslint.config.mjs`**, com o arquivo e a onda que o paga:

| Arquivo | Regra | Onda que paga |
|---|---|---|
| `plataforma/tenants/ProvisionTenantModal.tsx` | controle cru (`<select>`) | **3** |
| `landing/…/[eventSlug]/ShareBlock.tsx` | controle cru (`<input>`) | **1** |
| `clubes/engajamento/EngajamentoView.tsx` | `Painel` = `Card` | **4** |
| `eventos/kits/DistribuicaoView.tsx` | `Vazio` = `EmptyState` | **2** |

O que impede essa lista de virar um `off` mudo é a camada A: **entrada morta reprova**. Arquivo já
convertido que continua na lista é mentira sobre cobertura — exatamente o defeito que o gate existe
para impedir. E o número real, medido sem as listas, é o que vive no baseline.

Um near-miss que vale registrar: o caminho do Next com `(route group)` e `[segmento]` é glob com
metacaractere. Sem escape, `[eventSlug]` vira classe de um caractere e o `ignores` vira **no-op
silencioso** — o gate passaria verde por erro de sintaxe do próprio silêncio. Foi a camada A que
teria pegado; nesta lane pegou o `pnpm lint` primeiro.

### 2 · F4 e F5 já estavam pagos — antes da medição

Os dois saíram em `55ea0d42` (`DELTA-UX-T4`, 10/08 19:59), que é **ancestral de `b0f979e5`**. Já
estavam na árvore que a varredura mediu. O commit diz literalmente *"F5 morta"* e *"F4: tooltip do
rail também por group-focus-visible"*; o código confirma; há teste pinando os dois no
`SidebarRail`; e a entrada `''` do inventário de nome acessível já tinha sumido
(`navegacao-spa.test.tsx:302` = `['Abrir menu', 'Marina Castelo']`).

Causa: a fila do handoff `leela-redesign-hifi-rec-FIX.md` foi copiada para a onda sem reconferir o
código — **o mesmo modo de falha da entrada do BarChart**, que o maestro corrigiu em `25da1ad8`.
Item herdado de handoff se reconfere no código antes de virar linha de onda. Nenhuma lane futura
para F4/F5; só **F6** (grade da Agenda) segue aberto, na Onda 5.

### 3 · Dois achados novos, já distribuídos

O gate encontrou duas re-implementações batizadas que a varredura de 11/08 não tinha: `Painel` (=
`Card`) e `Vazio` (= `EmptyState`). A varredura contou superfície reconstruída em `<div>`/`<article>`
e não procurou **declaração** com nome de canônico. É o segundo mecanismo da L-021, e o mais caro —
a duplicata batizada é a que a próxima pessoa importa achando que importou o cânone.

## Três coisas que ficaram nomeadas, não silenciadas

1. **`<Input type="date">` não é pego pela Regra 1** (`ConvitesView.tsx:142`, item da Onda 3). A
   regra julga elemento **intrínseco**; ali o elemento é o `Input` do DS. Pelo próprio cânone isso é
   correto: procedência (é o componente do DS?) e **escolha** (é o padrão certo?) são réguas
   diferentes, e a segunda é o critério 9 da rubrica de design, não este gate.
2. **As 12 pílulas `rounded-ds-pill` da landing** que o inventário §4 chamou de "CTA replicando
   variante" são, em boa parte, `<span>` — `Badge`/`Chip` reescrito, não `Button`. Ficam fora de
   `botao-cru-estilizado` (a contagem existe para medir botão) e não têm bucket próprio. A Onda 1 as
   converte; até lá, **não há número que impeça uma décima terceira**.
3. **Conflito de documento, para o dono do cânone decidir.** O docstring do `Field` diz que ele é o
   wrapper "para QUALQUER controle cru (`<input>`, `<textarea>`, `<select>` nativo)"; o cânone §3 diz
   "Proibido: todo controle nativo desta tabela". Os dois não podem valer juntos. Enquanto não se
   resolve, o card do `Field` no showroom entrou em `arquivosDeExcecao` (uma linha, visível no diff)
   em vez de eu escolher um lado. **Efeito colateral aceito:** a exceção é por arquivo, então a
   Regra 1 fica cega no `ComponentsPage.tsx` inteiro — a página principal do showroom. Vale estreitar
   quando a decisão voltar.

## Gates

| Gate | Resultado |
|---|---|
| DS · `pnpm test` | **77 arquivos · 1842 casos** (baseline da lane: 75 · 1809) |
| Painel · `pnpm test` (suíte INTEIRA, regra F2 de moldura) | **235 arquivos · 2591 casos** (2583 na branch; +8 vieram do `origin/main` trazido no fim) |
| `tsc --noEmit` (DS, painel, landing) | limpo |
| `pnpm lint --max-warnings 0` (DS, painel, landing) | limpo |
| Landing · `pnpm test` | 799/799 casos passam; **1 arquivo não coleta** — vermelho **pré-existente na main**, ver abaixo |
| `pnpm generate-tokens` 2× | idempotente — zero linha de diferença (o "M" do `git status` é só LF×CRLF do gerador) |
| `pnpm gate:canon` | PASS, com baseline registrado |
| Prova renderizada nos dois temas (L-019) | Storybook estático servido e conferido no navegador: brasa e dark-wine |

Os gates foram rodados **duas vezes**: na branch, e de novo depois de trazer o `origin/main` que
avançou durante a lane (`67c3b035` → `31d78a17`, três commits da RN-559). Zero conflito no
`merge-tree`, e a segunda rodada é a que vale.

Falsificações feitas de propósito (gate que não falha quando deve não é gate):
- baixei uma contagem do baseline em 1 → **reprovou** com `SUBIU: 106 → 107`, e o `--atualizar`
  **recusou** ("conserte o código, não o baseline");
- apontei uma entrada de dívida para um arquivo limpo → **reprovou** com `entrada MORTA`;
- rodei as regras sem as listas de dívida → os 4 + 2 achados apareceram, com arquivo e linha.

## Prova renderizada

Conferido no navegador, `storybook-static` servido em `localhost:6106`, nos dois temas:
`Checkbox/Estados` (vazio, marcado, indeterminado, desabilitado — brasa laranja, dark-wine lima),
`Textarea/Invalido`, `Modal/Confirmacao` (**o ConfirmModal migrado**, com o `Textarea` flat e o
`Checkbox` do DS no lugar dos crus), `Radio/Cards`, `InputSenha/Forte`, `Field/ComErro`,
`Switch/ComDescricao`, `Select/Bordered`, `SidebarRail/Aberto`, `BarChart/RotuloLongo` (o
`formatarTickEixoY` da BARCHART-FIX truncando como previsto), `DonutChart/ComCentro`,
`Dialog/Default`.

## ⚠️ Achado fora do escopo: a suíte da landing está vermelha na main, e ninguém foi avisado

`apps/landing/test/build-frescor-dist.test.ts` **não roda** — falha na coleta com
`Error: Expected ident`, 0 casos executados. Reproduzido em worktree limpo de `origin/main`
(`31d78a17`), sem nenhuma alteração desta lane. Não é meu, e não é contenção.

**Causa:** a primeira linha de `scripts/verificar-frescor-do-workspace.mjs` é o shebang
`#!/usr/bin/env node`. O Node importa esse arquivo sem reclamar (conferi: os seis exports saem); o
parser do rollup que o Vite usa no `ssrTransform` **não aceita** shebang e aborta antes de qualquer
teste rodar. Uma linha.

**Por que importa mais que o normal:** esse arquivo de teste existe, textualmente, porque *"um gate
que não quebra quando deveria é pior que gate nenhum, porque ele produz confiança"*. É o gate do
gate de frescor do `dist` — aquele que nasceu depois do `dist` defasado ter subido duas vezes com os
três gates verdes. Ele está morto desde que nasceu, e o `pnpm test` da landing sai com código 1
enquanto os 799 casos restantes passam, o que faz o vermelho parecer ruído.

**Não consertei de propósito.** Está fora do recorte escrito desta onda, e se eu ressuscitar o teste
ele pode falhar de verdade — aí eu estaria entregando o vermelho de outra lane dentro do meu merge.
Fica aqui com a causa na mão para quem tem o escopo.

## O que fica para a próxima lane

- **Parte B da Onda 0** segue retida em **CANONE-1** (primitivos de layout, cartões de domínio,
  cabeçalho de bloco). Nada aqui a destravou.
- **Onda 1** (landing e checkout) é a próxima da fila, e leva junto: `ShareBlock.tsx` (sai da lista
  de dívida no mesmo commit), as 12 pílulas, e as duas perguntas de arquitetura do checkout.
- Quando a contagem da Regra 1 chegar a zero, as duas regras viram `error` e a lista de dívida
  desaparece (spec §9, passo 3).
