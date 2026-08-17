---
tags: [leela, medicao, leva22, kits, caixa, menu-terciario, e01, e03, e04]
aliases: [Medição da leva 22, Estado real das telas de kits]
atualizado: 2026-08-17
---

# Medição — o estado real das telas da leva 22

> Toda afirmação aqui tem arquivo:linha ou hash. O que não pôde ser medido está
> escrito como não medido. Esta é a base das quatro ondas do `04-fila-em-ondas.md`.

O mock `[Mock] - Campeche Run` estava de pé na `:4602` e a conferência visual saiu
pelo navegador com a sessão do organizador (`?preview=castelo`). A tela de listagem
de kits foi lida renderizada; o **editor de kit travou o renderizador** sob a pressão
de memória que o handoff do mock já nomeia (`.nirvana/handoffs/leela-mock-campeche-20260812.md`
§Nota de ambiente), então o editor está medido **por código**, não por olho. Fica
escrito porque medição por leitura de código e medição por tela renderizada não são a
mesma prova, e a onda A precisa saber qual das duas ela herdou.

## 1 · As bordas dos cards de kit — veredito: REGRESSÃO, provada por diff

**O dono está certo, e a lane que causou isso é identificável.** Não é "fora do alcance
da lane da R11": é exatamente a lane da R11.

Em 10/08 ele reclamou do oposto (D-1008-R11, na íntegra: *"nao consigo visualizar os
bento cards, ou conteineres de informação, estao todas as informações flutuantes"*). A
lane AJUSTES-DONO pagou em `a60690c2`, e o diff é de uma linha:

```diff
-    <article className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-4)]">
+    <Card role="article" className="flex flex-col gap-[var(--spacing-3)] p-[var(--spacing-4)]">
```

O `<article>` antigo tinha raio e fundo, e **zero borda**. O `Card` do design system
acrescenta `border border-border` na receita base
(`packages/design-system/src/components/Card/Card.tsx:72`). A troca aconteceu nos dois
cards da tela: `KitsCadastroView.tsx:127` (kit) e `:173` (item do catálogo).

Nenhum arquivo da pasta de kits escreve `border` à mão para card: a varredura de
`border|ring|outline|divide` em `routes/eventos/kits/*.tsx` devolve duas ocorrências, e
as duas são de alerta (`DistribuicaoView.tsx:485` e `:502`).

**Confirmação na tela renderizada** (mock, tema brasa, card do Kit Ouro):
`border-top-width: 0.909px`, `border-color: rgb(56,56,56)`, `background: rgba(30,11,16,0.42)`,
`box-shadow` presente, `padding: 16px`, caixa de 516×228.

### O que a regressão revelou, e é maior que a tela de kits

A borda não é defeito da tela — é a **receita canônica do `Card`**, e ela contradiz a
régua da casa. `04-engenharia/governanca-design.md:38` diz, na letra:

> **Flat por padrão (§2.16).** Sem borda decorativa. Exceções permitidas: input,
> divider, card selecionado, upload dashed, card crítico com border-left Vulcão.

Card comum não está na lista de exceções. E o próprio componente declara o que faz, sem
disfarce: *"border-border é decorativa (frame shadcn), fora do gate 1.4.11"*
(`Card.tsx:23-24`). É borda decorativa por escrito, num sistema cuja regra é não ter
borda decorativa.

**Alcance medido:** 48 arquivos dos apps importam `Card`, com 43 instâncias diretas de
`<Card `. **Zero** delas mata a borda por `className`. Ou seja: a borda está em todo
card canônico do produto, não só nos kits.

**A prova de que a tela já se contradiz sozinha:** o `KpiCard`
(`packages/design-system/src/components/KpiCard/KpiCard.tsx:64-72`) usa
`rounded-[var(--card-radius)] bg-[var(--surface-raised)]` **sem** borda. Os três KPIs do
topo da tela de kits (`KitsCadastroView.tsx:59-61`) e os cards de kit logo abaixo
(`:127`) são duas superfícies diferentes na mesma dobra — e é a de baixo que está fora
da régua.

**As outras seis peças do DS com `border border-border`** são todas superfície
FLUTUANTE — `DropdownMenu.tsx:368`, `Popover.tsx:42`, `Toast.tsx:52`, `Tooltip.tsx:63`,
`Command.stories.tsx:26`. Nelas a borda separa do que está atrás e é funcional. O `Card`
é a única superfície **dentro da página** com moldura, e é a única em que a borda é
decoração pura.

### ⚠️ A trava que a onda A precisa carregar

A própria lane da R11 escreveu o teste que **congela a borda**:
`routes/eventos/kits/__tests__/superficie-cartoes.test.tsx:80` e `:93` afirmam
`expect(cls).toContain('border-border')`. A decisão do dono contradiz a asserção. Tirar a
borda sem tocar no teste deixa a suíte vermelha; tocar só no teste sem entender por que
ele existe repete o erro que ele existe para impedir. **Os dois no mesmo commit.**

### ⚠️ O risco de reabrir a R11, medido por tema

Matar a borda devolve a separação inteira para `bg-card` + `shadow-elev-1`. A distância
entre a superfície do card e a da página, por tema:

| Tema | Página (`surface.base`) | Card (`surface.raised`) | Distância |
|---|---|---|---|
| brasa | `neutral.950` | `neutral.900` | um degrau da rampa |
| dark-wine | `neutral.950` | `neutral.900` | um degrau da rampa |
| **wine (claro)** | `neutral.50` = **#FDFAF7** | `neutral.0` = **#FFFFFF** | **quase nada** |

Fonte: `tokens/semantic.json:surface`, `tokens/semantic.wine.json:surface`,
`tokens/semantic.dark-wine.json:surface`, `tokens/primitives.wine.json:neutral`.

**O wine é o tema que pode reabrir a D-1008-R11 no ato de fechar esta leva.** Lá o card
é branco puro sobre um fundo quase branco, e sem borda a separação passa a depender só
da sombra. É por isso que o aceite da tarefa não é "a borda sumiu" — é "a superfície
continua legível como contêiner nos três temas, sem borda", conferido com o olho, por
tema. Fechar um pedido do dono reabrindo outro pedido do dono é o desfecho a evitar, e
ele já aconteceu uma vez nesta mesma família.

## 2 · Botão editar — duas formas, nenhuma é ícone, a 40 linhas uma da outra

**Card de kit** (`KitsCadastroView.tsx:158-163`): `Button variant="ghost"` com a palavra
"Editar", dentro de um `<div className="mt-auto">`. O `mt-auto` empurra para a base e o
card é `flex flex-col` sem `items-end`, então o botão encosta na esquerda. É o
**rodapé-esquerda** que o dono descreveu, na letra.

**Card de item do catálogo** (`KitsCadastroView.tsx:179-187`): `<button>` cru estilizado
como link (`text-[var(--text-brand)] hover:underline`), no **topo-direita** — dentro do
`<header className="flex items-start justify-between">` da `:174`. Não é o `Button` do
DS e não tem anel de foco próprio.

Dois "Editar" na mesma tela, em cantos opostos, em componentes diferentes. O alvo do dono
(ícone, topo-direita) é o que o card de item já faz de posição e o que nenhum dos dois faz
de forma.

**Peças prontas:** `RowActions` já mapeia `editar: Pencil`
(`packages/design-system/src/components/RowActions/RowActions.tsx:97`) e existe
`IconButton` (`.../IconButton/IconButton.tsx:52`).

**Por que a onda de 17/08 não pegou isto:** a lane UI-ACOES-MOTION (`853aa04e`) converteu
15 ações em 7 arquivos, e da área de kits tocou só `DistribuicaoView.tsx:420`. A fila dela
é declaradamente de **ações de TABELA** (`renderActions` do `Table`), e a catraca
`acao-de-tabela-em-texto` do `scripts/gate-canon.mjs` não enxerga ação em **card**. Não é
fila pendente: é trabalho novo, e a catraca tem um buraco nomeado.

## 3 · Breadcrumbs dentro de kits — são dois, empilhados

O dono viu certo, e é pior do que ele descreveu.

**Trilha 1**, do shell do evento, presente em toda aba (`evento/EventoShell.tsx:147`,
montada em `:97-100`): `Eventos › {nome do evento}`. Confirmada na tela renderizada.

**Trilha 2**, do editor de kit (`kits/KitEditor.tsx:323-334`), cinco níveis:
`Eventos › {nome do evento} › Kits › Gerenciamento › {nome do kit}`.

Como `kits/editar/:kitId` vive sob o `EventoLayout` (`EventosRoutes.tsx:93,145`), que
renderiza o `EventoShell` (`EventoLayout.tsx:68-70`), **as duas aparecem juntas** e as
duas repetem `Eventos › {nome do evento}`. Ainda por cima, os níveis 3 e 4 da segunda
apontam para o mesmo destino (`KitEditor.tsx:328` e `:329` são ambos
`/eventos/${slug}/kits`): dois degraus para uma porta só.

Nas telas de listagem não há trilha própria — só a do shell. **Não existe botão de voltar
em lugar nenhum da área de kits** (`Voltar` só aparece em `EventoLayout.tsx:45` e `:59`,
dentro de `EmptyState` de erro).

⚠️ **Fronteira que a onda A precisa respeitar:** a trilha 1 não é de kits, é do evento
inteiro. Matá-la "em kits" mata em todas as dez abas. O que o dono chamou de "breadcrumbs
dentro de kits" é a **trilha 2**; a decisão sobre a 1 é outra conversa e não está nesta
leva.

## 4 · Fotos dos kits — o alvo dos 50% é a galeria do editor, e ela não tem número

`KitEditor.tsx:484` (grade) e `:503-514` (as caixas):

```
:484  <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
:506    className="aspect-square w-full rounded-[var(--radius-md)] object-cover"
:511    className="flex aspect-square w-full items-center justify-center ..."
```

Três quadrados 1:1, cada um `w-full` de uma coluna de três, **sem `max-w`**. Num conteúdo
de ~1200px cada foto renderiza ~389px de lado; abaixo do breakpoint `sm` a grade vira
`grid-cols-1` e cada foto ocupa a **largura inteira**. **Não há um valor em px em lugar
nenhum** — o tamanho é 100% derivado do contêiner.

Isto decide a forma da tarefa: "reduzir 50%" não é trocar um número, porque não existe
número. É introduzir teto de largura ou mudar a escada de colunas. As duas leituras dão
resultados diferentes em mobile, e o dono falou de tablet e mobile na leva 17.

**A outra imagem**, a miniatura no card (`KitsCadastroView.tsx:133`, `Thumb size="md"`),
mede **64px** (`theme/rn-themes.ts:370`) — confirmado na tela: 64×64. Metade disso é 32px,
abaixo do `sm` (40px) que o DS publica. Quase certamente não é esta que ele quer.

## 5 · "O que está incluso" — hoje é `<ul>` de texto livre

`KitEditor.tsx:557-602`. Uma `<ul>` com uma `<li>` por item: `<span className="truncate">`
com o texto e um `Button variant="ghost"` escrito "Remover" à direita. Sem cabeçalho, sem
colunas, sem quantidade, sem ordem. Entrada por `Input` + botão "Adicionar item".

Limites do core: `KIT_ITENS_MAX = 30`, `KIT_ITEM_MAX = 140`
(`packages/core/src/eventos/kit.ts:62,64`). O `Table` do DS já é usado duas vezes na
própria área (`DistribuicaoView.tsx:593` e `:643`), então a tabela compõe do que existe.

## 6 · Kit × itens cadastrados — as duas coisas existem e não se falam

Este é o achado que decide o tamanho da ordem "só posso adicionar itens que já estejam
cadastrados como item individual".

**Existe catálogo real de item:** `interface ItemKit`
(`packages/core/src/eventos/kit.ts:535`), coleção `itensKit/{itemId}`, com `nome`,
`tamanhado`, `origem`, `marca`, `grade`, `tamanhosDisponiveis`, o vínculo N:N em
`kits: string[]` (`:566`, fonte de verdade da RN-215) e o índice inverso `usadoEm?`
(`:568`) mantido pela Function `itemKitIndex`.

**E existe, em paralelo, uma lista de texto livre:** `Kit.itens: string[]`
(`kit.ts:92`), normalizada por `normalizarItensKit` (`:129-139`). O comentário do próprio
core diz o que ela é: *"a visão é decorativa"* (`:57-58`).

**As duas convivem na mesma tela do editor, sem ponte nenhuma.** O checklist do catálogo
está em `KitEditor.tsx:445-471` (um `CheckboxField` por `ItemKit`, sincronizando
`item.kits` em `:291-311`); a lista de texto livre está em `:556-602`. O estado é separado
desde a declaração — `itensSel` (Set de ids, `:124-126`) e `itensKit` (array de strings,
`:107`) — e no `salvar` (`:275-311`) o payload manda `itens: itensKit` (as strings, `:281`)
e depois, em bloco separado, sincroniza o catálogo. **Nada lê um para preencher o outro.**

**Tamanho que isto define:** derivar "o que está incluso" do catálogo é possível **sem
migração de dado** — os dois campos já existem, já são gravados, e `ItemKit.nome` é
exatamente o texto que hoje se digita à mão. O trabalho é de UI e de regra de precedência.
**O que não existe em lugar nenhum é quantidade por item:** `ItemKit` não tem campo de
quantidade e `Kit.itens` é string solta. Uma coluna "Qtd." na tabela do item 5 exige campo
novo no core e nas Rules — é a única parte cara do pedido.

## 7 · Seletor de modalidades — peças do DS, composição inventada, três dialetos no produto

`KitEditor.tsx:375-406`. Não é um widget: são três peças coladas.

- `:375-387` — `<Chip onRemove>` para o que já foi escolhido
- `:388-398` — `Select` do DS com `label="Adicionar modalidade"`
- `:399-405` — `Button variant="secondary"` "Adicionar", solto ao lado, dentro de um
  `flex items-end`

Procedência está certa: `Chip`, `Select` e `Button` são todos do design system. O que é
bespoke é a **composição** — o DS não publica multi-select, e esta tela inventou um. O
`items-end` da `:388` existe só para o botão nu não subir junto com o label do campo.
Resultado: campo rotulado grudado em botão sem rótulo, padrão que nenhuma outra tela
repete. É exatamente o caso da **RN-568** (composição recorrente de controles canônicos).

**As outras duas telas que tratam o mesmo dado, cada uma na sua língua:**

| Tela | Como mostra modalidade | Arquivo |
|---|---|---|
| Criação de evento | `Chip` de sugestão + `Input` livre com Enter + `Chip active onRemove` | `eventos/novo/EventoForm.tsx:363-396` |
| Configurações gerais | `Badge variant="neutro"`, **somente leitura** | `configuracoes/_components/ConfigGeraisForm.tsx:304-308` |
| Editor de kit | `Chip` + `Select` + botão "Adicionar" | `kits/KitEditor.tsx:375-406` |

**Peça do DS não adotada:** `Combobox`
(`packages/design-system/src/components/Combobox/Combobox.tsx`) existe e roda em
`AfiliadoModal`, `AddPatrocinadorModal`, `EngajamentoView` e `AnaliseVendasView` — e não
em kits.

## 8 · Alertas operacionais — os dois são bespoke, e o de kits tem a barra quebrada

**O molde que o dono citou** (Visão Geral) — `evento/overview/OverviewDashboard.tsx:44-109`,
componente local `Alertas`:

- `:47` `<section aria-label="Alertas operacionais">` com `<h3>` em `:48-50` — o grupo tem título
- `:51` `<ul role="list">`, um `<li role="alert">` por alerta
- `:73` superfície **neutra** `--surface-raised`, raio `--card-radius`
- `:74-78` severidade só na barra: `border-l-4 border-l-[var(--border-danger)]`
- `:97-101` **ação**: `Button asChild` + `Link` — o alerta que nomeia um lugar leva até ele
- `:102` `Badge variant="vulcao"` no crítico

**Os alertas de kits** — `kits/DistribuicaoView.tsx:482-495` e `:499-517`, o mesmo bloco
copiado duas vezes: um `<div role="alert">` solto, superfície **inteira vermelha**
(`--feedback-danger-surface`), sem título de grupo, sem lista, **sem ação** — nomeia kits e
SKUs sem levar a lugar nenhum.

### A barra esquerda dos alertas de kits não existe na tela

`border-l-[var(--card-critical-border)]` é utilitário de **cor**, não de largura. O CSS
compilado (`apps/painel/dist/assets/index-BWL8ZyXs.css`) mostra as duas classes lado a lado:

```
.border-l-\[var\(--card-critical-border\)\]{border-left-color:var(--card-critical-border)}
.border-l-\[length\:var\(--card-critical-border\)\]{border-left-width:var(--card-critical-border)}
```

A classe usada gera `border-left-color: 3px`, declaração inválida que o navegador
descarta. Com o preflight do Tailwind zerando tudo, a largura fica em **0**. A forma certa
(`length:`) existe e roda em `Modal/ConfirmModal.tsx:197` e
`plataforma/tenants/TenantDetail.tsx:132`. **Mesmo defeito em mais três lugares:**
`entrega/BalcaoBanner.tsx:47` e `:69`, `entrega/estados/EstadosBalcao.tsx:122`.

### Nenhum dos dois é o canônico

`packages/design-system/src/components/Alert/Alert.tsx` existe, com quatro tons, ícone
automático (`:78-83`, `:153-162`) e canal ARIA por prop (`:144-149`), e **zero arquivos do
painel o importam**. O painel tem hoje pelo menos quatro dialetos de aviso: o `Alertas` da
Visão Geral, os dois `<div>` de kits, o `Alerta` local de
`entrega/PainelOperacional.tsx:240` e o `AuthAlert` de `conta/auth/AuthAlert.tsx:14`.

Detalhe de ARIA: os blocos de kits usam `role="alert"` (assertivo) em conteúdo estático
que já está na tela no carregamento — o anti-padrão que o próprio `Alert.tsx:29-33`
documenta.

## 9 · Espaçamentos — cinco inconsistências medidas

Escala: `spacing-1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32` (`theme/rn-themes.ts:97-104`).

1. **O ritmo de raiz muda por rota, dentro do mesmo layout.** `KitsLayout.tsx:64` usa
   `spacing-5` (20px); `KitsCadastroView.tsx:56` usa `spacing-8` (32px);
   `DistribuicaoView.tsx:481` usa `Stack gap="xl"` (24px); `KitEditor.tsx:322` usa
   `spacing-6` (24px). **As duas abas irmãs da mesma sub-nav respiram a 32 e a 24.**
2. **Seções irmãs do editor, mesmo nível, gaps diferentes** — todas filhas diretas do root
   de `KitEditor.tsx:322`: Identidade `:341` = 16 · Modalidades `:360` = 12 · Preço e
   capacidade `:410` = 16 · Itens `:445` = 12 · Fotos `:476` = 12 · O que está incluso
   `:557` = 12. Duas de seis em 16, quatro em 12, sem critério visível.
3. **Padding de card na mesma dobra:** `KpiCard` usa 20px (`KpiCard.tsx:67`),
   `KitCard`/`ItemCard` sobrescrevem para 16px (`KitsCadastroView.tsx:127,173`), e o
   default do `Card` do DS é 24px (`Card.tsx:87`), ignorado pelos dois.
4. **Listas irmãs na Distribuição:** `Stack gap="lg"` (16px) em `DistribuicaoView.tsx:548`
   e `:564` contra `gap="md"` (12px) em `:615`, mesmo nível.
5. **Dois dialetos no mesmo arquivo:** `DistribuicaoView.tsx` mistura a API por token
   (`Stack gap="xl"`, `:481`) com classe arbitrária crua (`gap-[var(--spacing-3)]`, `:485`,
   `:502`). `KitsCadastroView` e `KitEditor` não usam `Stack` em lugar nenhum.

## 10 · O menu terciário dos Clubs — o molde, medido

**É âncora, confirmado por código.** `clubes/clube/configuracoes/ConfiguracoesView.tsx`:
`IntersectionObserver` com scroll spy em `:124-138`, `scrollIntoView({behavior:'smooth'})`
em `:140-147`, seções empilhadas com `id={'config-'+id}` em `:69-74`, clique fiado em
`:167`. O próprio teste nomeia assim: *"renderiza a navegação âncora com 5 seções"*
(`__tests__/ConfiguracoesView.test.tsx:24`) e *"clique na âncora marca a seção como ativa
(scroll spy)"* (`:32`). Os 5 itens vêm de `clubes/_lib/configClube.ts:47-53`.

**É bespoke.** Não existe em `packages/design-system/src/components/**` — é `<ul>` de
`<button>` escrita à mão dentro da rota (`ConfiguracoesView.tsx:160-179`), com as classes
dos dois estados em `:168-172`. Layout `lg:grid-cols-[1fr_3fr]` sticky (`:159-160`), ou
seja **coluna vertical à esquerda**, não barra horizontal. E ele escapa da catraca
`menu-secundario-cru` (`scripts/gate-canon.mjs:561`) justamente por não parecer um `SubNav`.

**É o único lugar do painel com esse padrão:** a varredura de `scrollIntoView` fora de
`node_modules` devolve só este arquivo no painel (mais `CheckoutFlow.tsx:2014` na landing,
outro uso), e `IntersectionObserver` só `:122-126`.

### Nota de vocabulário que muda a conversa

O que o dono chama de "menu terciário" é o **quarto** nível na anatomia do código:

| Nível | Quem renderiza | Componente |
|---|---|---|
| Área (2º) | `clubes/ClubesAreaLayout.tsx:32` | `AreaSubNav` |
| Dentro do club (3º) | `clubes/clube/ClubeShell.tsx:107` | `AreaSubNav` |
| Dentro de Configurações (4º) | `ConfiguracoesView.tsx:160` | **bespoke, âncora** |

Os três primeiros já são canônicos. **O que ele elogiou é justamente o único que não é** —
e o cânone diz na letra que não deveria haver diferença: *"Área, sub-área e terciária são o
mesmo componente com a mesma aparência: não existe variante por nível de profundidade"*
(`03-canon/canone-de-componentes.md:234-235`).

### O que o DS já tem para abas fixas

`Tabs` existe (`packages/design-system/src/components/Tabs/Tabs.tsx:52`, sobre Radix) e
**troca conteúdo no lugar sem rolar** — todos os painéis ficam no DOM com `forceMount`, o
inativo só `hidden` (`:137-152`, teste em `__tests__/Tabs.test.tsx:20-29`). a11y de tablist
completa (setas, Home/End, roving tabindex).

O que falta para virar o padrão que o dono pediu:

| Requisito | Estado | Evidência |
|---|---|---|
| Troca no lugar, sem rolar | ✅ tem | `Tabs.tsx:137-152` |
| a11y de tablist | ✅ tem | `Tabs.tsx:17` |
| Estado na URL | ❌ **não tem** — só `defaultTab` ou controlado pelo pai | `Tabs.tsx:37-46`, `:61-67` |
| Indicador **deslizante** (D-1008-R14) | ❌ **não tem** — é `::after` por aba, aparece e some | `Tabs.tsx:111-115` |
| Fundo transparente (D-1008-R18) | ⚠️ tem `border-b` na lista, **por decisão** | `Tabs.tsx:74`; escopo em `SubNav.tsx:19-25` |

**A onda B compõe, não constrói do zero.** A mecânica do indicador deslizante já está
escrita e testada no `SubNav.tsx:98-112` e `:268-281` — é código para **promover**, não para
inventar. O que exige decisão é o item de fundo: hoje `SubNav` (transparente, `border-b-0`)
e `Tabs` (com `border-b`) divergem **de propósito**, e a D-1008-R18 nomeia a exceção.

## 11 · Configurações de eventos — já é sub-nav por rota, não é página empilhada

Casca em `eventos/configuracoes/ConfiguracoesLayout.tsx:34`, montada em
`EventosRoutes.tsx:203-215`. A barra é `AreaSubNav` (`:94`) e o conteúdo é `<Outlet>`
(`:95`); a aba ativa deriva do pathname (`:78-79`). Quatro sub-áreas: Geral, Política de
vendas, Exigências e regulamento, Equipe e permissões (`:51-66`), com gate por papel aba a
aba (`_lib/gateEvento.ts:28-35`).

**Ou seja: virar abas fixas aqui é trocar rota-filha por painel no lugar — não é
desempilhar seções.** É um caso diferente do molde dos Clubs, e o mesmo componente novo
tem de servir aos dois.

### A página de vendas: o custo real do movimento não é o menu

Hoje ela é rota **irmã** de configurações (`EventosRoutes.tsx:149-156`), sob
`RequirePapel area="pagina_vendas"`, e é alcançada pelo menu secundário do evento
(`eventos/_lib/subnav.ts:37`).

Cinco pontos, e o quarto é o que importa:

1. Rótulo e union do menu — `_lib/subnav.ts:37` e `:18`
2. Testes de ordem das abas — `_lib/__tests__/subnav.test.ts:56`, `:87-88`
3. Rota para dentro do bloco de configurações — o contrato de contexto muda de
   `EventoOutletContext` para `ConfiguracoesOutletContext`, que é **superconjunto**
   (`ConfiguracoesLayout.tsx:22-25`, `:81`): edit de tipo, não de arquitetura
4. ⚠️ **Colisão de permissão.** As duas áreas divergem na matriz: o papel `financeiro` tem
   `pagina_vendas: false` com comentário explícito *"aceite E04-L4: financeiro edita
   página → NEGA"* (`packages/core/src/eventos/equipe.ts:107,116,125,134`). Aninhar sob
   `configuracoes` faria a página herdar o `RequirePapel` do pai
   (`EventosRoutes.tsx:206`) e **mudaria quem entra**. O guard da filha tem de continuar
   `area="pagina_vendas"`, e a aba entra no array com `visivel:` por papel
5. Redirect da RN-234 para o endereço antigo — molde pronto em `EventosRoutes.tsx:53-58`

## 12 · Credenciamento — o corte ação × análise já existe no espaço, com uma impureza

A pasta é `eventos/entrega/` e continua assim por decisão da RN-399 (*"a pasta segue
`entrega/` porque mover arquivo não é o que a virada pede"*, `BalcaoPage.tsx:2-4`). Layout
60/40 (`BalcaoView.tsx:63`), quatro blocos:

| Bloco | Arquivo | Papel |
|---|---|---|
| `BalcaoBanner` | `BalcaoView.tsx:61` | contexto |
| `AtendimentoPanel` (60%) | `:64-71` | **ação** — todo o check-in |
| `PainelOperacional` (40%) | `:72-77` | **análise**, com uma impureza |
| `AtalhosBalcao` | `:80` | apoio |

**A impureza:** o card 4 do painel de análise é de ação — "Ações rápidas"
(`PainelOperacional.tsx:152-165`), com três `<Button>` **sem `onClick`** (`:155`, `:158`,
`:161`). São botões mortos na tela hoje.

### O check-in custa 4 toques e 2 digitações

Caminho feliz com chip (`AtendimentoPanel.tsx`): focar a busca (`:266-273`, atalho ⌘K em
`:61-69`) → digitar → clicar no resultado (`:278-285`) → digitar o chip (`:214-220`) →
"Vincular chip" (`:221-227`) → "Entregar kit e registrar presença" (`:230-235`). Sem chip
(RN-207) caem dois passos: **3 toques e 1 digitação**.

Onde está a gordura, medida:

- **Não existe scanner.** A varredura de `scanner|qrcode|QrReader|BarcodeDetector` em
  `apps/painel/src` devolve só **geração** de QR (`inscritos/QrIngressoModal.tsx:13,51,53`).
  O ingresso tem QR na landing, e no balcão **ninguém o lê** — o operador digita o código
  na mesma caixa do nome. Esta é a simplificação de maior efeito, e é trabalho novo.
- **A barra de atalhos mente.** `AtalhosBalcao.tsx:13-18` promete quatro teclas (⌘K, Enter,
  Tab, Esc); o wiring real em `AtendimentoPanel.tsx:61-78` implementa **duas**. "Enter
  confirma" e "Tab próximo passo" não têm handler.
- **O `Stepper` de 3 passos é decorativo** (`:186-197`, passos em `_lib/balcao.ts:81-96`):
  o passo "kit" nunca é acionável e o carimbo nasce no fechamento (`balcao.ts:65-70`).
  Três passos desenhados para uma ação real.

## 13 · Menu secundário do evento — o custo de "Lotes" → "Modalidades"

O array em `eventos/_lib/subnav.ts:32-48`, dez entradas. `{ id: 'lotes', label: 'Lotes',
segmento: 'lotes' }` é a `:36`.

O caso é o mesmo da RN-572 (que trocou "Cadastro" por "Gerenciamento" em Kits) e cai na
régua da RN-399: **muda o que a pessoa lê, não o identificador**.

**Se for só rótulo — 1 linha, mais 4 de copy, zero teste:**

| # | O quê | Arquivo:linha |
|---|---|---|
| 1 | O rótulo — **única ocorrência de `'Lotes'` como label em `apps/` + `packages/`** | `_lib/subnav.ts:36` |
| 2 | Copy: *"o PREÇO de cada modalidade vive na aba Lotes"* | `ConfigGeraisForm.tsx:291`, `:294` |
| 3 | Copy: *"depois, na aba Lotes"* | `novo/EventoForm.tsx:263` |
| 4 | Título da tela `<h2>Lotes por modalidade</h2>` — vira ambíguo | `lotes/LotesView.tsx:71` |

**Testes: zero edits.** Os testes da sub-nav afirmam **ids**, nunca o label de Lotes
(`__tests__/subnav.test.ts:56`, `:87`). **Breadcrumb: zero edits** — a trilha do evento tem
dois degraus e não carrega a aba (`EventoShell.tsx:97-100`).

**Se mudar id e rota:** 4 pontos para o id, 9 para a rota, mais um `RedirectLegado` da
RN-234. Não recomendado.

⚠️ **A armadilha, e ela é de produto.** A tela de Lotes hoje declara na cara que **não**
edita modalidades (`lotes/LotesView.tsx:75-78`, `EmptyState` em `:88-91`, espelho em
`ConfigGeraisForm.tsx:292-296`). **Chamar a aba de "Modalidades" sem entregar a S316-T4
recria o círculo fechado que a lane DIAG-PAINEL-LACUNAS pagou para desfazer** — a tela
prometeria pelo nome o que continua não fazendo. Renome e conteúdo sobem juntos, ou o
renome espera.

## 14 · A tabela do caixa — o que ela é, medido

Vive em `/eventos/:slug/financeiro` (`EventosRoutes.tsx:190-197`), aba rotulada **"Caixa"**
(`financeiro/FinanceiroLayout.tsx:35`), renderizada em `FinanceiroView.tsx:303-313`.

**Três colunas** (`:196-200`): `Categoria` · `Item` · `Inscritos`. **Nenhuma é dinheiro.**
O título visível é `Inscrições (N)` (`:304-306`), e o `caption` que explicaria
(*"Breakdown de inscrições por kit, modalidade e status"*, `:311`) **não aparece na tela** —
o `TableCaption` do DS é `sr-only` (`Table.tsx:151`).

**Não existe chave composta.** O agregador (`_lib/financeiro.ts:245-259`) concatena **três
partições independentes** distinguidas só pela string da coluna `Categoria`:

```ts
for (const kit of KITS_INSCRITO)           → { categoria: 'Kit', ... }
for (const [modalidade, valor] of ...)      → { categoria: 'Modalidade', ... }
for (const status of STATUS_INSCRITO)       → { categoria: 'Status', ... }
```

Num evento com 3 modalidades × 2 kits × 4 status isso dá **9 linhas**, não 24. O produto
cartesiano — a matriz que a spec pedia — nunca foi construído.

**A consequência aritmética é o cerne:** cada partição soma o mesmo total, então a coluna
"Inscritos" somada de ponta a ponta dá **3× o número escrito no cabeçalho**, sem separador
visual entre as partições.

**Fonte:** `eventos/{id}/financeiro/current`, agregado por Cloud Function
(`functions/src/eventos/agregarFinanceiro.ts:166-197`, gatilho `onInscritoWrite` em
`:341-343`), chegando ao painel por `onSnapshot`. `porModalidade` só conta modalidades
listadas em `evento.modalidades` (`:189-194`).

**O que ela não tem:** coluna de valor, de percentual, de forma de pagamento, de lote,
ticket médio por corte, ou cruzamento kit×modalidade. Nada disso existe na tabela.

### Por que ela nasceu assim

`git log` do arquivo: **12 commits, 11 mexeram nos cards de dinheiro, no CSV ou nos
gráficos. A tabela nasceu em `9e181caa` (04/07) e nunca mais foi tocada.**

Ela nasceu como **substituto declarado**. A spec S207 pedia outra coisa
(`03-canon/epics/LEELA-E03-operacao-evento.md:1009`): *"vejo breakdown por modalidade **e
por lote** e inscrições **por forma de pagamento**"*. E o ADR é explícito sobre a forma
(`03-canon/adr/ADR-lotes-por-modalidade.md:21`): *"**Financeiro (S207/S302): breakdown é
uma matriz modalidade×lote** — cada célula é um par real, não um produto cartesiano de
dimensões independentes."* O commit de nascimento registra a recusa na trailer:
`Rejected: breakdown por forma de pagamento | dado inexistente no agregado (E12)`.

**A dependência que destravaria a matriz continua aberta:** `LEELA-FABLE-A · Modelo de
pedido/pagamento no Inscrito. Destrava S203-T3, S207 (por forma de pagamento), E12-L4`
(`00-boards/V1-CHECKLIST.md:530`).

### A redundância, medida

- **O BarChart "Inscrições por modalidade" (`:272-281`) e as linhas `Categoria=Modalidade`
  da tabela são o mesmo dado, na mesma dobra.** Um terço das linhas já está desenhado em
  barra 40px acima.
- **O total de inscritos aparece 4× na dobra da Caixa** — header do evento
  (`EventoShell.tsx:175-178`), pill da sub-nav (`_lib/subnav.ts:84-86`), nota do BarChart
  (`:272`) e título da tabela (`:305`). Já medido e registrado em
  `2026-08-17-carga-cognitiva/00-medicao-area-interna-evento.md:109` e `:133`.
- **As três partições já existem, acionáveis, na tela de Inscritos** — chips por status com
  contagem, clicáveis como filtro (`inscritos/InscritosView.tsx:415-422`), mais Selects de
  kit (`:180-182`) e modalidade (`:184-186`). A Caixa mostra em leitura o que a outra tela
  serve em ação.
- **O DonutChart "Receita por modalidade" ao lado dela está morto em produção.**
  `receitaPorModalidade` é campo opcional (`api-client/src/eventos/queries.ts:249`) e
  **nenhuma Function o escreve** — o único produtor é o seed de preview
  (`functions/scripts/preview-seed-extra.ts:1286`). Em produção aquele card renderiza
  EmptyState (`FinanceiroView.tsx:293-297`). É por isso que o mock mostra o donut cheio e o
  produto real não.

### Onde a receita decomposta existe hoje

Só por **evento**, em `/eventos/repasses`
(`eventos/repasses/_components/RepassesPorEvento.tsx:54-92`: Evento · Vendido · Retido ·
Disponível estimado · Repassado). É a única tabela do produto com colunas de dinheiro
decompostas, e o eixo dela não é kit nem modalidade. **Receita por forma de pagamento não
existe em lugar nenhum**, e três telas declaram a ausência em vez de inventar
(`FinanceiroView.tsx:319`, `overview/OverviewContent.tsx:184`,
`clubes/engajamento/EngajamentoView.tsx:773`). **Receita por kit não existe** — o único
consumo de `porKit` fora da Caixa é contagem de retirada (`_lib/distribuicao.ts:36-46`).

## 15 · O que o pedido grava sobre preço de kit — veredito: SNAPSHOT-PARCIAL

**Congelado, e é a metade que vale dinheiro.** O valor que o kit acrescentou já está
**somado dentro** de `pedido.itens[].valorBase` e nunca é relido. O achatamento acontece no
core:

```ts
// packages/core/src/checkout/saleState.ts:294
kitPreco = roundMoney(item.kit.preco);
// packages/core/src/checkout/saleState.ts:300
const preco = roundMoney(ativo.preco + kitPreco);
// functions/src/checkout/createInscricaoCharge.ts:1361
return { inscritoRef, loteId: item.loteId, valorBase: item.preco };
```

`ItemPedido` (`packages/core/src/pedidos/pedido.ts:123-145`) tem cinco campos —
`inscritoRef`, `loteId?`, `valorBase`, `desconto`, `valorFinal` — e **nenhum de kit**.
Gravação em `createInscricaoCharge.ts:1786-1814`.

**Portanto: editar `kit.preco` hoje não altera um centavo de nenhum pedido existente.** A
ordem do dono, na parte do dinheiro, já está satisfeita pela arquitetura.

**Referência viva, e é aqui que a ordem tem lacuna.** O pedido não guarda `kitId` — quem
guarda é o inscrito (`packages/core/src/eventos/inscrito.ts:179`). Nenhum campo `kitPreco`,
`precoKit`, `valorKit` ou `kitSnapshot` é persistido em lugar nenhum; `kitPreco` e `kitNome`
existem só no caminho transitório da cotação (`saleState.ts:166-168`,
`api-client/src/checkout.ts:39-41`) e nunca chegam ao Firestore.

Duas consequências reais:

1. **A decomposição é irrecuperável.** Ninguém consegue provar depois quanto daqueles
   R$ 180 foi kit. Hoje não incomoda porque o preço é imutável; **no instante em que a
   edição for liberada, a série histórica fica cega**. Existe precedente pronto de como
   fazer certo no mesmo repositório: `pagamento.taxaCongelada`
   (`packages/core/src/pedidos/pagamento.ts:468`, `:833-859`, RN-179). O kit não recebeu
   esse tratamento.
2. **Nome e composição derivam do doc vivo.** Renomear um kit reescreve o que a confirmação
   de uma compra antiga mostra (`CheckoutFlow.tsx:2042`, `:2052`, via
   `kitNomeFromId(evento.kits, ...)`), e trocar os itens reescreve o checklist do balcão
   (`_lib/balcao.ts:260`). **Nenhuma Rule impede isso hoje.** Se "pedidos já realizados
   intocados" é o contrato, isto o viola sem tocar em dinheiro.

Nenhuma superfície pós-compra lê preço de kit do doc vivo — o slide-in
(`InscritoSlideIn.tsx:452`, `:463`), a confirmação (`StepConfirmacao.tsx:239`, `:279`),
minhas compras (`minhasCompras.ts:84`), o ingresso e o PDF
(`ingressoPorLink.ts:108-111`, `lib/ingressoPdf.ts:117-122`) e os oito e-mails
(`functions/src/email/**` não menciona kit) leem o valor congelado ou não mostram valor.

### ⚠️ Correção a uma premissa da própria lane

O brief desta rodada supunha que a **RN-497 revogou de dentro da RN-200** a extensão do
congelamento para as datas. **Não foi isso.** A RN-497 revogou uma extensão que só existia
em **comentário de código**, e o épico é explícito: *"ela não muda de enunciado"*
(`LEELA-E03-operacao-evento.md:2193`) e *"A RN-200 permanece aqui, inalterada, e passa a
ser exigível na letra"* (`:2213`). O delta da RN-497 trata do **lote**, não do kit. Fica
registrado porque premissa de brief que passa batida vira citação errada na spec seguinte.

### O que impede a edição hoje — três camadas, todas ativas

1. **Tela** — `KitEditor.tsx:86` (`precoBloqueado(evento)`), campo `disabled` e mensagem em
   `:422-424`; predicado puro em `packages/core/src/eventos/precoBloqueado.ts:30-32`, com
   "mesmo preço nunca bloqueia" em `:40-47`
2. **Security Rule** — `firestore.rules:1030-1033`, dentro de `match /kits/{kitId}`
   (`:987`), aplicada no `allow update` (`:1044-1052`). O `create` e o `delete` também são
   negados com venda (`:1054-1057`), fechando o contorno delete-e-recria. **Esta é a
   fechadura real:** `salvarKit` é escrita direta de cliente e sempre envia `preco`
   (`api-client/src/eventos/kits.ts:95`)
3. **Function** — `functions/src/eventos/guardPreco.ts:31-49`, obrigatória para o Admin SDK,
   que bypassa Rules

Gatilho comum das três: `evento.qtdInscritos > 0`, que conta **qualquer status**, inclusive
PIX pendente (RN-487).

**`incluiKitDaModalidade` não existe em código** — zero ocorrências em `apps`, `packages` e
`functions`. Vive só como RN-503 e tarefa `S317-T1` aberta. O único caminho de preço de kit
hoje é direto, por `Kit.modalidades[]`, somado em `saleState.ts:282-300`.

## Vizinhos

`01-registro-leva22.md` para as decisões. `04-fila-em-ondas.md` para o que cada onda
constrói. `2026-08-17-carga-cognitiva/00-medicao-area-interna-evento.md` para a medição de
redundância que esta rodada reaproveita.
