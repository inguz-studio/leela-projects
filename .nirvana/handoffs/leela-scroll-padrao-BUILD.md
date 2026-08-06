# BUILD-SCROLL-PADRAO · o padrão de rolagem do sistema

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** BUILD-SCROLL-PADRAO
- **Employee:** sf-frontend-lead (software-forge)
- **Território:** `packages/design-system/**` + `apps/painel/**` + `eslint.config.mjs`.
  Nada em `functions/`, `firestore.rules`, `apps/landing`, `packages/core` ou `leela-specs/`.
- **Sem deploy** — o maestro sequencia.

## Commits

| Commit | O que entrou |
|---|---|
| `1464643f` | A regra da casa (`utils/scroll.ts`) + a regra de lint `leela-scroll/no-scroll-de-um-eixo` + 25 testes |
| `e0e2a558` | Os sete contêineres de rolagem do DS aplicando o padrão + 23 testes de trava |
| `5406e74a` | O contêiner de rolagem da página (RootShell) e o painel do inscrito + 4 testes |

## A causa, e por que ela voltava

A palavra do dono foi **"novamente"**, e ela estava certa. As três ocorrências
— menu secundário do evento, CRM, kits — não eram três bugs parecidos. Eram um
mecanismo só, e ele está na especificação do CSS:

> **CSS Overflow 3 §3.1** — quando um eixo é declarado e o outro fica `visible`,
> o `visible` computa para `auto`.

Quer dizer que `overflow-y: auto` sozinho **nunca entregou um contêiner de
rolagem: entregou dois**. O segundo fica invisível até o dia em que algum
conteúdo estoura o eixo que ninguém declarou. E no Windows/Chrome a barra é
clássica, ocupa espaço: ela come ~15px do eixo oposto e empurra o conteúdo a
estourar de volta. A horizontal fabrica a vertical.

O conserto do `SubNav` (`fd6e5e69` + `c2b19244`) estava certo e fechou aquela
peça. O que ele não podia fechar é que **o contêiner de rolagem da página tinha
o mesmo defeito**: o `RootShell` declarava `overflow-y-auto` e deixava o x
promovido. O painel inteiro carregava um contêiner de rolagem horizontal ligado
o tempo todo, esperando a próxima tela ficar larga. Consertar peça por peça
nunca ia fechar isso — a peça seguinte reabria o buraco, e foi o que aconteceu
em kits.

Duas telas já traziam esse diagnóstico escrito no código, cada uma para o seu
caso, sem que ninguém tivesse generalizado: o `OverviewDashboard` (*"com o
contêiner de rolagem em `overflow-y-auto`, o eixo x é promovido a `auto` e volta
a barra horizontal que o dono já reportou duas vezes"*) e a `Table` (*"scroll-x
CONTIDO no card, nunca no body/documento"*). A regra existia em prosa, em dois
lugares, sem dono e sem gate.

## 1 · O inventário

Varredura de `overflow-*`, `h-screen`, `h-full` e `max-h-*` em `apps/painel/src`
e `packages/design-system/src`. Fora da tabela ficaram ~20 usos de
`overflow-hidden` decorativo (avatar, thumb, barra de progresso, canto
arredondado de card): declaram os dois eixos e não rolam.

**Contêineres de rolagem — antes:**

| # | Onde | Eixo declarado | Eixo promovido a `auto` | Dono da rolagem naquela tela | Veredito |
|---|---|---|---|---|---|
| 1 | `AppShell` (raiz, `<main>`, rail) | `overflow-hidden` (os dois) | — | moldura, não rola | ✅ conforme |
| 2 | `Command` (lista) | `overflow-y-auto overflow-x-hidden` | — | a própria lista | ✅ conforme (a única) |
| 3 | `SubNav` | x + y (trava de `fd6e5e69`) | — | a própria barra | ✅ conforme |
| 4 | **`RootShell` (a página)** | `overflow-y-auto` | **x** | a página | ⛔ **segundo eixo** |
| 5 | **`Table` (wrap)** | `overflow-x-auto` | **y** | o card da tabela | ⛔ **segundo eixo** |
| 6 | **`Modal` (painel)** | `overflow-y-auto` | **x** | o modal | ⛔ **segundo eixo** |
| 7 | **`Dialog` (corpo)** | `overflow-y-auto` | **x** | o corpo | ⛔ **segundo eixo** |
| 8 | **`Sidebar` (seções)** | `overflow-y-auto` | **x** | o menu | ⛔ **segundo eixo** |
| 9 | **`InscritoSlideIn`** | `overflow-y-auto` | **x** | o painel lateral | ⛔ **segundo eixo** |
| 10 | **`Shell.stories`** | `overflow-y-auto` | **x** | — | ⛔ **segundo eixo** |
| 11 | **`Tabs` (tira de abas)** | **nenhum** | — | **ninguém** | ⛔ **empurra a página** |

**Quantas telas violavam o "único contêiner de rolagem" do `RootShell`:** o
número honesto é **todas** — porque a violação não estava nas telas, estava no
próprio `RootShell`, que declarava um eixo e ganhava dois. As telas só decidiam
*quando* a segunda barra aparecia. Contêiner de rolagem legítimo criado por
tela, além do da página: **zero** — nenhuma tela monta scroller próprio; quem
rola é sempre um primitivo do DS (linhas 3, 5, 6, 7, 11 da tabela).

**O caso de kits, especificamente:** `Estoque` monta a matriz kit×modalidade com
`responsive="scroll"`, a única consumidora que mantém a `Table` em grade densa
em toda largura. É o item 5 da tabela — barra horizontal com cromo mais a
vertical fantasma da promoção, dentro do card. A tira de abas do `KitsLayout` é
`SubNav`, que já estava travada (mas **ainda não foi ao ar** — a lane anterior
fechou sem deploy, então o dono pode ter visto as duas coisas juntas).

## 2 · O padrão, e onde ele está escrito

`packages/design-system/src/utils/scroll.ts` — o arquivo **é** a regra, não a
descrição dela. Três constantes, cada uma declarando os dois eixos por
construção:

| Constante | Rola em | Fecha | Cromo da barra | Para quê |
|---|---|---|---|---|
| `SCROLL_Y_ONLY` | y | x | **visível** | página, modal, diálogo, gaveta, painel lateral, menu |
| `SCROLL_X_ONLY` | x | y | **visível** | dado largo: matriz de comparação, grade densa |
| `SCROLL_X_ONLY_SEM_CROMO` | x | y | **escondido** | navegação: `SubNav`, `Tabs` |

As cinco cláusulas da regra:

1. **Um eixo nunca vai sozinho.** Quem declara um declara os dois. É a regra
   inteira, em uma linha, e é o que fecha a família de defeitos.
2. **A página rola na vertical e só.** Rolagem horizontal em nível de página é
   sempre defeito da tela, e se conserta na tela (`flex-wrap`, `min-w-0`,
   `truncate`, `basis-full`).
3. **Quem é largo carrega a própria rolagem.** Tabela, sub-nav e tira de abas
   contêm o scroll-x dentro de si. A página nunca é o scroller de ninguém.
4. **O cromo é decisão de job, não de gosto.** Em **dado**, a barra fica: numa
   grade densa ela é a única pista de que existe mais coluna. Em **navegação**,
   a barra some: a aba cortada na borda já é a afordância, e o dono pediu isso
   duas vezes.
5. **A constante entra depois do `className`.** `cn` é `twMerge` e resolve pelo
   último; a posição **é** a trava.

**Por que `hidden` e não `clip` no eixo fechado:** `hidden` continua rolável por
programa, então o navegador ainda revela o elemento que recebe foco por teclado.
`clip` perderia isso e tiraria conteúdo do alcance do teclado.

**Por que fechar o eixo não recorta nada de novo:** o eixo promovido a `auto` já
tinha estabelecido o contexto de recorte. Trocar por `hidden` só remove a barra;
o que era recortado antes continua sendo, nem mais nem menos.

## 3 · A regra é verificável, não uma recomendação

`packages/design-system/lint/leela-scroll-plugin.mjs` — regra ESLint
`leela-scroll/no-scroll-de-um-eixo`, ligada em `eslint.config.mjs` sobre
`packages/design-system/src` e `apps/*/src|app`. Entra no gate que já existe
(`eslint --max-warnings 0`), não num gate novo.

O que ela faz: analisa cada literal de string e reprova um eixo declarado sem o
par (mesmo prefixo de modificador). Atalho (`overflow-hidden`, `overflow-auto`,
`overflow-visible`) passa — declara os dois por definição. A mensagem nomeia a
cascata, cita a especificação e diz qual constante importar. Testes ficam fora
do escopo: `toHaveClass('overflow-y-hidden')` afirma uma classe renderizada, não
declara CSS.

Nenhuma exceção foi necessária: **as três constantes passam na própria regra**.

Foi escolhida em vez de um teste que varre o código-fonte porque o eslint já é
gate do repo, aponta a linha e não depende de heurística para separar comentário
de classe (o `SubNav` tem 20 linhas de comentário citando essas mesmas classes).

## 4 · A prova de falsificação da trava

Quatro reintroduções do defeito, todas vermelhas:

| # | O que foi reintroduzido | Resultado |
|---|---|---|
| 1 | `SCROLL_X_ONLY` volta a ser `'overflow-x-auto'` (um eixo só) | **13 vermelhos** — contrato das constantes, autoteste do lint, `Table` e `Tabs` renderizados |
| 2 | A trava do `Table` volta para **antes** do `containerClassName` | **3 vermelhos** — `className="overflow-y-auto"`, `"overflow-auto"` e `"overflow-visible"` derrubavam a trava em silêncio |
| 3 | `RootShell` volta a `className="flex flex-col flex-1 overflow-y-auto"` | **eslint vermelho** em `RootShell.tsx:107:22`, com a mensagem inteira |
| 4 | Mesma reintrodução, contra a suíte | **2 vermelhos** em `ScrollDaPagina.test.tsx` |

A #2 é a que importa: é exatamente o buraco que a REV-LOTES achou em
`c2b19244`, agora coberto em **todo** componente que aceita `className` no
elemento que rola (`Table`, `Modal`, `Dialog`), com quatro overrides hostis cada
(`overflow-y-auto`, `overflow-x-auto`, `overflow-auto`, `overflow-visible`).
Há também o par oposto: fundo e padding do consumidor **continuam** vencendo,
para a trava não virar parede.

## 5 · O que continua rolando de propósito

**Nada de rolagem legítima foi morto.** O alvo era a barra que ninguém pediu.

| O que | Rola | Cromo | Por quê |
|---|---|---|---|
| `Table` em `responsive="scroll"` (a matriz de kits) | horizontal | **fica** | Grade de comparação em tela estreita **precisa** rolar; virar card apagaria a leitura "qual modalidade está curta entre os kits". A barra é a única pista de que há mais coluna — escondê-la esconderia dado. |
| `SubNav` | horizontal | some | Ordem do dono, duas vezes. Aba cortada + setas ←/→ são a afordância. |
| `Tabs` | horizontal | some | Mesma família do `SubNav`; Radix já dá ←/→/Home/End. |
| Página, `Modal`, `Dialog`, `Sidebar`, painel do inscrito | vertical | fica | É a rolagem que o produto sempre teve. |
| `Table` em card-mode (<lg) | não rola | — | As linhas viram cards e o min-content de ~772px some. Inalterado. |

## ⚠️ O risco que esta lane assume, dito na cara

Fechar o eixo x da página troca **barra horizontal no painel inteiro** por
**conteúdo recortado na horizontal**, para telas que fiquem largas. É a troca
certa (a barra fabricava a vertical, e o painel todo pagava por uma tela), mas
tem consequência:

- **Continua alcançável por teclado.** `hidden` é rolável por programa, então
  o foco revela o que estiver fora. O que se perde é o arrasto com o mouse.
- **`Tabs` foi a lacuna que isso expôs**, e ela foi fechada nesta lane: sem
  contêiner próprio, a tira de abas viraria aba recortada. Achada pela varredura
  de `whitespace-nowrap`, não por sorte.
- **`Stepper` é a peça que sobra.** É o outro componente em fluxo de página com
  `whitespace-nowrap` e sem contêiner de rolagem (`flex items-center w-full`,
  conectores `flex-1`). Dois consumidores, os dois no balcão
  (`AtendimentoPanel`, `EstadosBalcao`), com rótulos curtos. **Não mexi**: não
  tenho evidência de que estoure, e um stepper que rola na horizontal é UX
  duvidosa — o conserto certo, se estourar, é quebrar ou encurtar rótulo. Está
  na lista de conferência do dono, em 320px.
- **Nada mais depende de pan horizontal.** `DropdownMenu` e `Popover` são
  portalizados em `document.body` com `position: fixed`: escapam do contêiner de
  rolagem da página e não são afetados.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (design-system) | **0** |
| `tsc --noEmit` (painel) | **0** |
| `eslint --max-warnings 0` (DS + lint + painel + `eslint.config.mjs`) | **0** |
| `eslint --max-warnings 0` (landing — raio de alcance do DS) | **0** |
| Suíte do design-system | **65 arquivos / 1204 testes** ✅ |
| Suíte do painel (inteira, sem `--singleFork`) | **201 arquivos / 2050 testes** ✅ |
| `regulamento-modal-focus-trap` (landing, consumidora do `Dialog`) | **5 testes** ✅ |

Base do painel era **200 arquivos / 2046 testes**: +1 arquivo, +4 testes, zero
regressão. `tsup` do DS rodou **antes** da suíte do painel, nunca em paralelo.
`pnpm-workspace.yaml` **não sujou** nesta lane (conferido antes e depois).

**Testes novos: 52.**

| Onde | Quantos | O quê |
|---|---|---|
| `lint/__tests__/leela-scroll-plugin.test.mjs` | 14 | os vetores do defeito e o que a regra não pode barrar |
| `src/utils/__tests__/scroll.test.ts` | 11 | contrato das três constantes |
| `src/utils/__tests__/scrollTrava.test.tsx` | 23 | contrato renderizado + override hostil por componente |
| `apps/painel/.../ScrollDaPagina.test.tsx` | 4 | o contêiner de rolagem da página é um só, e vertical |

## ⚠️ O que os testes NÃO provam

**jsdom não faz layout.** Ele não calcula largura, não tem contêiner de rolagem
de verdade, não desenha barra e não conhece a espessura da barra do sistema.
Tudo acima é **contrato de estilo**: prova que a classe está lá, na ordem certa,
e que sai vermelho quando alguém a tira.

O que fica para o olho do dono:

1. **Se alguma tela está larga de verdade** — agora isso aparece como conteúdo
   recortado, não como barra. É a informação que jsdom não pode dar.
2. **A aparência da barra da tabela** dentro do card com cantos arredondados.
3. **O anel de foco** da aba ativa na borda do contêiner de rolagem (`SubNav` e
   agora `Tabs`) — pode ser cortado; já era assim no `SubNav`.
4. **Barra overlay do macOS** — a cascata medida foi a da barra clássica do
   Windows/Chrome.

## Conferência visual do dono

Encolha o navegador para **320, 768, 1024 e 1440**. Em nenhum ponto o painel
inteiro pode ganhar barra horizontal.

1. **Kits › Estoque** (`/eventos/{slug}/kits/estoque`) — a ocorrência que você
   viu. A matriz "Kit por modalidade" deve ter **uma** barra, a horizontal,
   **dentro do card**, e nenhuma vertical colada nela. As colunas continuam
   alcançáveis arrastando.
2. **Kits › Cadastro, Distribuição** — a tira "Cadastro | Distribuição | Estoque
   | Credenciamento" e a barra do evento acima dela: **nenhuma barra**, e as
   abas que não cabem seguem alcançáveis arrastando.
3. **Menu secundário do evento e CRM** — a dupla que você já reportou. Confirmar
   que segue limpa (esta é a primeira vez que o conserto delas vai ao ar).
4. **Detalhe do inscrito** (`/eventos/{slug}/inscritos`, clicar numa linha) — o
   painel lateral rola na vertical e nada mais; a tira de abas dentro dele
   também não mostra barra.
5. **Qualquer modal com formulário longo** (novo lote, item de kit) — barra
   vertical só, nunca uma horizontal ao lado.
6. **Balcão** (`/eventos/{slug}/credenciamento`) em **320px** — o `Stepper` é a
   peça que não ganhou contêiner de rolagem. Se os rótulos das etapas saírem
   pela direita, é isso, e o conserto é encurtar ou quebrar o rótulo.
7. **Menu lateral** com nome de item longo — sem barra horizontal no rail.

## Vetores para a review antagonista

1. **A troca de barra por recorte na página.** É a decisão de maior alcance
   desta lane. O argumento é que o `min-w-0` do `<main>` e o card-mode da
   `Table` já vinham convergindo para "nada é largo em nível de página" há
   várias rodadas, e que o teclado ainda revela o recortado. Vale procurar uma
   tela que dependa de pan horizontal com o mouse.
2. **`Stepper` ficou de fora.** Deliberado e declarado, mas é a única peça em
   fluxo de página com `whitespace-nowrap` sem contêiner. Se a review achar que
   320px estoura, ela volta como conserto de rótulo, não de rolagem.
3. **`Tabs` ganhou `overflow`.** Vai além de "consertar barra dupla": é uma
   mudança de comportamento, justificada por ser a lacuna que o fechamento do
   eixo da página expunha. Bater na decisão de esconder o cromo lá (dado versus
   navegação) e no recorte do anel de foco.
4. **A regra de lint é por literal de string.** Alguém pode espalhar os dois
   eixos em literais diferentes do mesmo `cn()` e a regra reprova, forçando a
   constante. É rigidez desejada ou vai incomodar num caso legítimo?
5. **`Table` com o eixo y fechado.** O argumento é que a altura do wrap é
   `auto`, então o conteúdo nunca a excede e nada é recortado. Vale procurar o
   contraexemplo — algum consumidor que passe `max-h` pelo `className`.
6. **A ocorrência de kits pode ter duas causas somadas.** A `Table` (consertada
   aqui) e o `SubNav` (consertado antes, mas ainda não no ar). Sem navegador não
   dá para separar as duas, e a conferência 1 e 2 acima é o que decide.
