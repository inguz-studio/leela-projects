---
tags: [leela, design, carga-cognitiva, spec, vetavel, e01, e02, e03, e05, e19]
rodada: 2026-08-17-carga-cognitiva
lane: CARGA-COGNITIVA-SPEC
estado: proposta vetável — nenhum movimento é decisão minha
---

# Spec da reordenação

> Parte 3 do brief. Proposta **vetável**: a direção abaixo foi acordada com o
> maestro no chat, e nada aqui é decisão fechada até o dono responder. Zero código
> nesta rodada; o build é onda seguinte.

## A regra-mãe

**Cada informação tem uma casa por pergunta. Aparição fora de casa é resumo com
caminho, nunca cópia.**

Três leituras dela, porque a frase sozinha já foi lida errado antes:

- "Uma casa **por pergunta**" quer dizer que o mesmo número pode aparecer duas
  vezes se as duas responderem perguntas diferentes, e a segunda declarar qual.
  Total ao lado da própria decomposição é isso. Total ao lado do mesmo total não é.
- "Resumo **com caminho**" quer dizer que a aparição fora de casa leva à casa. Um
  número solto que repete outro número não é resumo, é eco.
- Quem julga é a **dobra**, não o arquivo. Dois componentes distintos que caem na
  mesma dobra estão na mesma tela para quem lê.

## Movimento 1 · O header do evento vira identidade e estado

**Vetável EVT-CARGA-1.**

Hoje (`EventoShell.tsx:150-212`):

```
[breadcrumb]  Eventos / Desafio MTB Costa da Lagoa 2026
[tile]  Desafio MTB Costa da Lagoa 2026   (PUBLICADO)
        25 de setembro de 2026 · Costa da Lagoa, Florianópolis/SC
        120 inscritos · Faltam 39 dias para o evento          ← sai
        [Ver página pública] [...]
[subnav]  Visão geral | Inscritos (120) | Kits | ...          ← pill em discussão
```

Proposta:

```
[breadcrumb]  Eventos / Desafio MTB Costa da Lagoa 2026
[tile]  Desafio MTB Costa da Lagoa 2026   (PUBLICADO)
        25 de setembro de 2026 · Costa da Lagoa, Florianópolis/SC
        [Ver página pública] [...]
[subnav]  Visão geral | Inscritos | Kits | ...
```

O header responde "onde eu estou e em que estado isso está". Nome, status, data e
local são identidade: sem eles a pessoa não sabe qual evento abriu. Contagem de
inscritos e dias restantes são medição, e a casa da medição são os cards.

O que sai: `EventoShell.tsx:174-186` inteiro (o `<p>` com inscritos e contagem
regressiva), mais os imports `formatInt`, `diasParaEvento` e `faltamDiasLabel` que
só ele usa.

**Ganho medido.** Em 375, a dobra devolve 36 px do parágrafo mais o `gap` que ele
consome, e o header cai de 345 px para cerca de 297 px. O primeiro número não
duplicado sobe de y = 870 para cerca de y = 822 — ainda abaixo da dobra de 810 px,
o que é o ponto: **este movimento sozinho não resolve o celular.** Ele precisa do
Movimento 3. Registrar isso importa mais do que anunciar um ganho que a régua não
sustenta.

**Custo.** Uma tela, um bloco removido, três imports. Os testes de
`evento/__tests__/EventoShell.test.tsx` que afirmam a linha precisam ser reescritos
para afirmar a ausência dela, e é isso que impede a linha de voltar por descuido.

## Movimento 2 · A pill de inscritos na sub-nav

**Vetável EVT-CARGA-2 — e este eu explicitamente não decido.**

`_lib/subnav.ts:84-86` põe a contagem na aba "Inscritos". É a terceira aparição do
mesmo número na mesma dobra. Ela tem, porém, um papel que as outras duas não têm:
é afordância de navegação, diz que há 120 coisas atrás daquela aba antes de a
pessoa clicar.

Duas saídas legítimas, e a escolha é do dono:

- **(a) A pill fica**, e o papel distinto passa a ser declarado no código e no
  cânone: contador de sub-nav é promessa de volume atrás do link, não medição.
  Nesse caso a regra da Parte 4 ganha uma exceção nomeada, e a exceção vale para
  as onze barras do painel, não só para esta.
- **(b) A pill sai**, e a sub-nav fica só com rótulos. Ganha consistência (as
  outras nove abas não têm contador) e perde a dica de volume.

A mesma pergunta reaparece idêntica nos clubes (`clubes/_lib/subnav.ts:72-77`),
onde a pill é a **terceira** cópia de "membros ativos". A resposta do dono vale
para as duas áreas.

## Movimento 3 · O `CountdownHero` para de repetir a si mesmo

**Vetável EVT-CARGA-3.**

Hoje o bloco mostra sete números que são, na verdade, três: dias, inscritos e
capacidade. Vagas restantes é `capacidade − inscritos` (`CountdownHero.tsx:48`),
a porcentagem é `inscritos ÷ capacidade` (`:47`), e a porcentagem aparece **duas
vezes** — dentro do ministat de inscritos (`:104`) e no rótulo da barra (`:132-134`).

Hoje:

```
 39   dias para o evento
      SEXTA-FEIRA, 25 DE SETEMBRO · 18:39
      CAPACIDADE TOTAL 300 | INSCRITOS 120 (40%) | VAGAS RESTANTES 180
      Preenchimento [▓▓▓▓░░░░░░] 40%
```

Proposta:

```
 39   dias para o evento
      SEXTA-FEIRA, 25 DE SETEMBRO · 18:39
      INSCRITOS 120 de 300 · 180 vagas
      Preenchimento [▓▓▓▓░░░░░░] 40%
```

Os três números seguem visíveis, porque os três são a resposta a perguntas
diferentes (quanto entrou, quanto cabe, quanto falta). O que sai é a **quarta e a
quinta codificação da mesma razão**: a porcentagem dentro do ministat, já que a
barra logo abaixo a mostra e a desenha.

**Ganho medido.** O bloco de ministats deixa de ser uma grade de três colunas com
rótulo, valor e legenda cada, e vira uma linha. Em 375, onde a grade de três
colunas é o que empurra o countdown para 330 px, a altura cai para a faixa de
190 px a 210 px. Somado ao Movimento 1, o primeiro número não duplicado sai de
y = 870 para cerca de y = 700, **acima da dobra de 810 px**. É o movimento que
paga o celular.

**Custo.** Um componente presentacional puro, sem query. `CountdownHero.test.tsx`
muda junto.

## Movimento 4 · `ModalidadesPanels` para de reescrever o cabeçalho do countdown

**Vetável EVT-CARGA-4.**

`ModalidadesPanels.tsx:66-68` monta `inscricoesSub` como
`120 / 300 vagas · 40%`, que é o trio inteiro do countdown outra vez, 400 px
abaixo dele. E `:79`, `:84` e `:88` repetem a receita total três vezes no card
vizinho (subtítulo, centro do donut e rótulo do centro).

Proposta: o subtítulo de "Inscrições por modalidade" passa a dizer o que o gráfico
**não** diz, que é quantas modalidades compõem a barra ("2 modalidades"). O card de
receita mantém o valor no centro do donut e larga o subtítulo, porque centro de
donut já é o total por construção.

**Ganho.** Duas linhas de texto a menos e, principalmente, o fim do risco descrito
na medição: o subtítulo lia `fin.receitaBruta` enquanto o KPI lia
`evento.receitaConfirmada`. Com uma fonte só na tela, elas não têm como divergir.

**Custo.** Um componente, sem query.

## Movimento 5 · Engajamento devolve a banda Eventos

**Vetável ENG-CARGA-1.** Este é o movimento que responde à segunda pergunta do
dono, e ele é mais barato do que parece.

A banda Eventos (`EngajamentoView.tsx:748-776`) tem dois blocos: `OcupacaoEventos`
e um `EmBreveV3` de formas de pagamento. Os dois já estão montados na Visão geral
(`OverviewContent.tsx:191`, `:173`, `:181`) — é o mesmo componente, importado de
`routes/overview/_components/`, lendo a mesma coisa.

Hoje:

```
Engajamento  [seletor: Todos os clubs ▾]
  ── Clubs ─────────────────────  ← o seletor recorta
  ── Do club para o evento ─────  ← o seletor recorta
  ── Eventos ───────────────────  ← o seletor NÃO recorta
       Ocupação dos últimos 5 eventos
       Formas de pagamento (em breve)
```

Proposta:

```
Engajamento  [seletor: Todos os clubs ▾]
  ── Clubs ─────────────────────  ← o seletor recorta
  ── Do club para o evento ─────  ← o seletor recorta
```

**Nada é migrado.** A Visão geral não ganha bloco nenhum, porque já os tem. O que
acontece é a remoção de uma segunda montagem, mais os imports
(`EngajamentoView.tsx:52-54`), a leitura `useEventosDoOrganizador`
(`EngajamentoPage.tsx:57`), a derivação `ocupacao` (`:58-73`) e as quatro props
`ocupacao`, `eventosLoading`, `eventosError`, `onRetryEventos`.

O critério que sustenta o corte é o mais simples que consegui formular, e ele
serve para qualquer tela com filtro: **bloco que o filtro da tela não alcança não
pertence àquela tela.** Não é gosto, é o seletor dizendo onde termina o assunto.

**Ganho.** A tela deixa de fazer uma leitura de coleção inteira de eventos que não
usa para nada que o título prometa. E o organizador para de ver uma lista que não
responde ao controle que ele acabou de mexer.

**Custo.** Uma tela, um container, dois testes. Nenhum componente do design system
é tocado.

**A pergunta que fica com o dono, e que eu não respondo:** a banda Eventos foi
pedida no estudo (D-1008-R15) e o desenho do estudo tem três seções. Cortá-la
contraria um desenho que o dono aprovou em 10/08. A leitura do maestro é que a
decisão de 10/08 nasceu antes de a incongruência do seletor aparecer, e que a fala
de 17/08 a revisa. Confirmar isso é dele.

## Movimento 6 · A ponte clube → evento vira bloco canônico com recorte

**Vetável ENG-CARGA-2.**

A banda "Do club para o evento" fica em Engajamento, porque ela é de clube: conta
desafios do clube selecionado que apontam para um evento
(`resumirPonteComEventos`, alimentado por `dados.data` que já vem recortado).

O que a spec propõe é que ela deixe de ser exclusiva daquela tela. O mesmo bloco,
com uma prop de recorte, atende duas perguntas diferentes:

| Onde | Recorte | Pergunta que responde |
|---|---|---|
| Engajamento (clube) | clube selecionado | "quanto da **minha** comunidade aponta para evento?" |
| CRM · análise | operação inteira | "quanto da base aponta para evento?" |

Um componente, duas montagens, zero cópia — que é o desenho que a Onda 0 do
roadmap de componentes já estabeleceu para o resto do painel, e o mesmo que
`OcupacaoEventos` usa hoje entre Visão geral e Engajamento (com o defeito de estar
sem recorte nos dois lugares, o que o Movimento 5 resolve).

**Custo.** Promover o bloco a componente com prop de recorte é trabalho de design
system, não de tela, e por isso ele não cabe na onda 1. Fica na onda 3.

## Movimento 7 · Onde cada pergunta passa a morar

O mapa que resulta dos seis movimentos, e que é a resposta curta à pergunta do
dono sobre congruência:

| Área | Pergunta que ela responde | Recorte |
|---|---|---|
| Header do evento | onde estou e em que estado isso está | o evento |
| Visão geral do evento | como **este** evento está indo | o evento |
| Engajamento | quem é a comunidade e quanto dela aponta para evento | o clube selecionado, **em tudo** |
| Visão geral (painel) | como a operação está indo hoje | o organizador |
| CRM e análise | por que está indo assim, ao longo do tempo | o organizador, com séries e períodos |

Cada linha tem um recorte só, e nenhuma linha mostra um bloco que o recorte dela
não alcança. É a regra-mãe aplicada à navegação, não só à dobra.

## Movimento 8 · A navegação mobile vira barra horizontal

**Vetável NAV-MOBILE-1 a 4.** Entrou pela leva 19, na mesma janela, e cabe aqui
porque é arquitetura de informação: é a mesma pergunta de "onde cada coisa mora",
respondida para uma largura em vez de para uma tela.

Fala do dono, na íntegra: *"No formato mobile, como estamos com poucos botões,
podemos deixar um menu horizontal, com 4 botões e na barra superior um botão de
perfil e configurações."*

### A leitura, e ela é vetável

**Leitura vetável NAV-MOBILE-1: "menu horizontal" = barra de navegação inferior.**

O dono disse horizontal, não disse onde. Leio como barra inferior fixa, pelo
alcance do polegar e porque é o padrão que o organizador já usa em qualquer outro
aplicativo no mesmo telefone. A outra leitura honesta é uma faixa horizontal
rolável logo abaixo do cabeçalho, que é o que a sub-nav do evento já faz. Se a
leitura estiver errada, tudo abaixo muda de lugar, e por isso ela vai marcada
antes de qualquer desenho.

### Quais quatro, e onde vive o quinto

O rail do profissional tem **cinco** itens desde a leva 15, quando Configurações
saiu (`shell/sidebar.ts:34-52`): Visão geral, Eventos, Clubs, CRM e Parcerias.
Quatro botões e cinco itens é uma conta que não fecha, e o dono não disse qual
sobra.

**Vetável NAV-MOBILE-2.** Default do maestro, para o dono derrubar:

```
┌──────────────────────────────────────────┐
│  Leela              [perfil]             │  ← barra superior
├──────────────────────────────────────────┤
│                                          │
│              conteúdo                    │
│                                          │
├──────────────────────────────────────────┤
│  ⌂        🎫        ♡        👤          │  ← barra inferior, 4
│ Visão    Eventos   Clubs     CRM         │
└──────────────────────────────────────────┘
```

Parcerias é o quinto e fica fora da barra. A razão é de uso, não de importância:
é a área mais nova do painel (E10, seed S811) e a única cujo trabalho não é
diário. Três destinos possíveis para ele, e eu não escolho:

- **(a)** entra na Visão geral como bloco com caminho, e a barra fica com quatro
  itens de verdade;
- **(b)** o quarto slot vira "Mais", que abre uma folha com CRM e Parcerias — mas
  aí a barra tem três destinos e um menu, o que contraria "quatro botões";
- **(c)** Parcerias volta para dentro de Clubs, de onde Assessorias e Afiliações
  vieram na D-1008-R17.

A **(a)** é a que respeita a fala ao pé da letra e a que eu levo como default.

### O que acontece com o drawer

**Vetável NAV-MOBILE-3, e aqui há conflito nomeado.**

A **D-1008-R5** (10/08) decidiu que o drawer off-canvas abaixo de `lg` fica, e que
só a pele muda: *"o menu no formato mobile também nao está no DS novo"* — a
anatomia foi preservada de propósito. A leva 19 propõe outra anatomia. **Esta
decisão supersede a D-1008-R5 na superfície do profissional**, e isso precisa
sair escrito, porque revogação por silêncio é como a RN-470 quase se perdeu.

Mas ela **não** pode superseder na superfície da plataforma. A navegação do
super-admin tem oito destinos e vive numa tabela própria
(`routes/plataforma/_lib/nav.ts`); quatro slots não a comportam. Então o desenho
que proponho é assimétrico, e a assimetria é a parte que precisa de aval:

| Superfície | Abaixo de `lg` | Razão |
|---|---|---|
| Painel profissional | barra inferior de 4 | cinco itens, quatro cabem, o quinto tem casa |
| Painel master | drawer off-canvas, como hoje | oito destinos não cabem em quatro slots |

Duas navegações mobile diferentes no mesmo produto é custo real de aprendizado. O
contra-argumento é que já são dois painéis com dois conjuntos de destino e duas
peles (o master é preto opaco por decisão do dono), e que forçar a mesma anatomia
nos dois é que seria a escolha estranha.

### O botão de perfil, e por que ele não vem acompanhado

**Vetável NAV-MOBILE-4.**

O dono disse *"um botão de perfil e configurações"*. Duas leituras:

- **(i)** um botão só, o de perfil, que abre o popover que **já existe** e que a
  leva 16 fechou com Configurações e Sair, cada um com seu ícone e Sair por
  último;
- **(ii)** dois botões separados na barra superior, perfil e configurações.

Levo a **(i)** como default, e a razão é que a **(ii)** reabriria a leva 15. Aquela
leva tirou Configurações do menu principal justamente porque ela apontava para
`/conta`, o mesmo destino do perfil (`shell/RootShell.tsx:60`) — pôr os dois lado
a lado na barra superior recria a duplicata que a leva 15 apagou, agora numa
largura onde espaço é o recurso escasso. Se o dono quiser a (ii), a leva 15 volta
para a mesa junto, e não sozinha.

Nada de novo precisa ser desenhado para o popover: ele já existe, já tem os dois
itens com ícone, e já é o mesmo em rail aberto e fechado.

### Passos até o job, antes e depois

Régua L-021, medida no caminho mais comum do organizador em 375: abrir a lista de
eventos a partir de qualquer tela.

| | Hoje | Com a barra |
|---|---|---|
| Ir para Eventos | 2 toques (hambúrguer, depois o item) mais a espera do drawer | **1 toque** |
| Ir para Clubs | 2 toques mais a espera | **1 toque** |
| Ir para CRM | 2 toques mais a espera | **1 toque** |
| Ir para Visão geral | 2 toques mais a espera | **1 toque** |
| Ir para Parcerias | 2 toques mais a espera | **2 toques** pelo destino (a), sem piora |
| Configurações | 1 toque no perfil, 1 no item | 1 toque no perfil, 1 no item |
| Sair | 1 toque no perfil, 1 no item | 1 toque no perfil, 1 no item |

Quatro dos sete caminhos caem pela metade, um empata e nenhum piora. O ganho que
a tabela não mostra é o que a abertura do drawer custa: ela é a animação de 800 ms
da S002, decidida assim de propósito porque é onde a marca aparece. Num destino
que a pessoa alcança dez vezes por dia, oitocentos milissegundos deixam de ser
marca e viram pedágio, e a barra os elimina em vez de encurtá-los — que é
exatamente a diretriz durável da S002 sobre nunca consertar tempo com número menor.

### O que este movimento não resolve

A barra inferior ocupa altura permanente na dobra, e a dobra em 375 é o recurso
que os Movimentos 1 e 3 estão brigando para liberar. Os dois trabalhos precisam ser
medidos **juntos** na onda, ou a barra devolve em altura fixa o que o header
devolveu em altura removida. A linha de base da tabela de pixel da medição vale
para os dois.

## O que esta spec deliberadamente não faz

- **Não decide EVT-CARGA-2** (a pill). Há argumento honesto dos dois lados e a
  escolha muda onze barras de navegação.
- **Não mexe nas 15 duras da amostra de controle.** Elas viram fila (arquivo `04`),
  não movimento desta spec.
- **Não conserta as três ambiguidades de rótulo** achadas na varredura
  (credenciamento, status em duas grafias, "Publicado" com dois sujeitos). Elas
  não são cópia e o conserto é qualificar o rótulo, o que é outra conversa.
- **Não escreve código.** Nenhum arquivo de `apps/` foi tocado nesta rodada.
