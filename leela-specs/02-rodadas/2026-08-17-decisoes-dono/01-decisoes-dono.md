---
tags: [leela, decisoes-dono, leva17, leva18, leva19, carga-cognitiva, navegacao, e01, e02, e03, e05]
aliases: [Leva 17, Leva 18, Leva 19, Decisões do dono 17/08]
atualizado: 2026-08-17
---

# Decisões do dono — 17/08 (levas 17, 18 e 19)

As três levas desta janela são sobre a mesma coisa: a interface pede mais atenção
do que o trabalho exige. A leva 17 é sobre informação repetida, a 18 sobre ação
que se escreve quando devia se apontar, a 19 sobre navegação que cobra dois toques
onde um bastava. Quem reabrir uma delas deve ler as três.

---

## ⛔ Registro de falha de captura

**A queixa do header duplicado já tinha sido feita, e não existe em registro
nenhum.** O dono escreveu, na íntegra: *"Já falei anteriormente, e voce
ignorou..."*

Procurei antes de escrever esta seção. Não há card, não há item de painel, não há
linha de rodada, não há RN. A fala anterior não virou nada. Não existe a
possibilidade de dizer que ela estava numa fila e não foi priorizada, porque não
houve fila: ela foi ouvida no meio de outra conversa e morreu ali.

Isto não é contexto perdido nem falha de ferramenta. É a fala do dono sobre o
produto tratada como comentário de passagem porque chegou no meio de outro
assunto. O custo aparece medido na Parte 2 desta rodada: oito fatos e vinte e uma
aparições numa dobra só, e em 375 o primeiro número que a tela não repetiu nasce
abaixo da linha do celular. O defeito rodou em produção esse tempo todo porque
ninguém tinha onde ler que ele existia.

**A regra de conserto, e ela nasce vinculante:** fala do dono sobre produto
**sempre** vira item registrado na mesma janela, mesmo quando chega no meio de
outra conversa, mesmo quando é uma frase solta, mesmo quando o assunto principal é
outro. Registrar primeiro, priorizar depois. Item registrado que espera é uma
decisão; item não registrado é uma perda, e a diferença entre os dois é de quem
escreve, não de quem fala.

A leva 17 nasce com esta confissão em vez de sem ela, porque um registro que
começa contando que funcionou é pior que registro nenhum.

---

# Leva 17 · carga cognitiva

**Na íntegra:**

> *"nao fizemos um review de carga cognitiva na parte interna dos eventos, onde
> mostramos informações duplicadas. temos algum processo definido com nossa squad
> de software, que faça esssa revisão de design? por exemplo, estamos colocando
> numero de inscritos, data, o nome do evento, dias para o evento. no 'Header' do
> evento, e logo abaixo já temos um componente que informa isso, como uma KPI
> card, praticamente. Logo, nao afz sentido termos essa informação, que só ocupa
> espaço, e prejudica principalmente a experiencia de tablet e mobile. Já falei
> anteriormente, e voce ignorou...Mas em Engajamento, nos clubs, temos as
> informações referentes aos clubs. Mas logo abaixo temos uma relação 'do club
> para o evento' e Eventos'. Isso, no mockup original estava em Visão Geral. Mas
> entendo, que temos visão geral e CRM, para análise dessas informações, mais
> aprofundadas. Como poderíamos reordenar essas informações, para manter
> congruencia de informações, e cognitivas?"*

## 17.1 · A informação duplicada entre header e KPI morre

**Decidido. A casa dos números são os cards.**

O header do evento passa a responder identidade e estado: nome, status, data e
local. Contagem de inscritos e dias para o evento saem dele, porque os dois já
vivem no `CountdownHero` logo abaixo, na mesma dobra.

Medição que sustenta, em `02-rodadas/2026-08-17-carga-cognitiva/00-medicao-area-interna-evento.md`:
os quatro fatos que o dono nomeou aparecem, juntos, **onze vezes** na primeira
dobra do Visão geral do evento. A contagem de inscritos sozinha aparece quatro
vezes. E a última coluna da tabela de pixel é o argumento dele provado: **em 375,
o primeiro número que a tela não repetiu nasce 60 px abaixo da dobra.** No desktop
o mesmo desenho cabe folgado, que é por que o defeito sobreviveu tanto tempo.

A varredura foi além do que ele apontou, pela mesma régua: **44 redundâncias
puras em 77 pares medidos**, cobrindo todas as abas internas do evento.

## 17.2 · A reordenação Engajamento, Visão geral e CRM

**Direção decidida, desenho vetável.** O mapa está em
`02-rodadas/2026-08-17-carga-cognitiva/03-spec-reordenacao.md` e nenhuma linha dele
é decisão minha.

A resposta curta à pergunta dele: **Engajamento é 100% clube, e o seletor do topo
recorta tudo.** Hoje ele não recorta. A banda "Eventos" lê os eventos do
organizador inteiro e ignora o seletor — está escrito no próprio código, em
`EngajamentoPage.tsx:54-56`, como se fosse desenho.

O achado que barateia a decisão: a banda Eventos não é um bloco daquela tela. É o
componente `OcupacaoEventos` da Visão geral, importado, **e a Visão geral já o
monta** (`OverviewContent.tsx:191`). Tirar a banda do Engajamento não migra nada
para lugar nenhum: apaga uma segunda montagem. **O mockup original que ele lembra
está certo, e a Visão geral nunca deixou de ter aquilo.**

A banda "Do club para o evento" **fica**, porque ela é de clube: conta desafios do
clube selecionado que apontam para um evento. O nome engana, o sujeito da frase
não.

**Vetáveis abertos:** EVT-CARGA-1 a 4 (header, pill da sub-nav, countdown,
painéis de modalidade), ENG-CARGA-1 e 2 (a banda Eventos e a promoção do bloco de
ponte). O ENG-CARGA-1 carrega um conflito que precisa da palavra dele: a banda
Eventos foi pedida no estudo D-1008-R15, em 10/08. A leitura do maestro é que
aquela decisão nasceu antes de a incongruência do seletor aparecer e que a fala de
17/08 a revisa. Confirmar é dele.

## 17.3 · Nasce o processo permanente

**Decidido.** Ele perguntou se existe processo. Não existia. Passa a existir, em
três peças:

1. **Critério novo no gate de design** — `governanca-design.md §9`: nenhum número
   ou fato aparece duas vezes na mesma dobra sem papel distinto declarado. Entra
   como critério de aceite em todo dispatch de UI.
2. **RN-573** no [[LEELA-E01-design-system]], que torna a régua regra de negócio em
   vez de recomendação. A lição da §8 é que regra em prosa não sobrevive: ela é
   vinculante desde 19/07 e a varredura de 11/08 achou 223 divergências.
3. **Campanha retroativa em ondas R0 a R6**, 64 itens, com a área interna do evento
   como onda 1 por ordem dele.

---

# Leva 18 · ações e movimento

> ⚠ **Só registro nesta lane.** O build corre em paralelo na lane
> **UI-ACOES-MOTION**, e é o registro dela que aponta os cards destes três itens.

**Na íntegra:**

> *"antes que eu me esqueça, os tooltips, do menu, quando ele está recolhido,
> aparecem de maneira, cortada, dentro do próprio menu. E nas ações, de tabelas,
> quero que ao invés de escritos, utilzemos ícones de ação, que ao clicar, abrimos
> modais, ou direcionamos para páginas. Como por exemplo 'detalhes'. Ao clicar, os
> drawers devem aparecer no formato de animação, de slide in, e slide out, do
> drawer"*

Três itens, e eles são de naturezas diferentes. Separá-los importa porque só o
primeiro é defeito.

## 18.1 · Defeito · tooltip do rail recolhido nasce cortado

O tooltip dos itens do menu, com o rail recolhido, aparece recortado dentro do
próprio menu. É clipping: o tooltip é filho de um contêiner que corta o que passa
da borda, então ele desenha para fora e some. Defeito de contenção, não de
posição.

Vale a nota de que o padrão da casa para este caso já existe e foi pago uma vez: o
popover opaco por tema, na lane DELTA-UX de 10/08, onde a hipótese do portal se
provou falsa e a causa era cascata. Quem for consertar lê aquele registro antes de
supor.

## 18.2 · Padrão · ação de tabela vira ícone

**Decisão de padrão, não conserto pontual.** As ações nas linhas de tabela deixam
de ser texto e passam a ser ícones de ação. O clique abre modal ou navega, e ele
deu o exemplo: "detalhes".

Isto é padrão canônico de row-action e pertence ao design system, não a cada
tabela. Pela diretriz de 11/08 — peça que não existe nasce no DS, documentada — o
caminho é o componente, não a receita repetida em cada lista. O cânone em
`03-canon/canone-de-componentes.md` ganha a família quando a lane construir.

A a11y é a parte que não pode ser esquecida na pressa: ícone sem texto precisa de
nome acessível, e o gate de UI reprova o que não tiver.

## 18.3 · Movimento · drawer entra e sai deslizando

Os drawers ganham animação de slide-in e slide-out.

⛔ **A trava que a lane precisa carregar:** a S002 já cravou que abrir e fechar
**não** são o mesmo movimento — oitocentos milissegundos para abrir, duzentos e
cinquenta para fechar, e as duas durações viajam em par para não serem trocadas
por simetria. E a diretriz durável da mesma história: encurtar duração nunca
conserta corrida, só a torna mais rara, que é o pior estado possível. Saída
animada foi o que abriu a janela dos dois overlays disputando a página.

---

# Leva 19 · pesquisadores e navegação mobile

**Na íntegra:**

> *"os pesquisadores, estão fora do padrão dos filtros também. Do nosso estilo mais
> flat. E vi que voce estava fazenod uma simulação no navegador. Acho que cabe o
> seguinte: No formato mobile, como estamos com poucos botões, podemos deixar um
> menu horizontal, com 4 botões e na barra superior um botão de perfil e
> configurações."*

## 19.1 · Campos de pesquisa fora do padrão flat

> ⚠ **Só registro nesta lane.** Build na lane **UI-ACOES-MOTION**, e é o registro
> dela que aponta o card.

Os campos de pesquisa não seguem o estilo flat da família de filtros. É a quarta
cobrança da classe padronização, depois do cânone de componentes (11/08), da
bronca que criou a L-021 (10/08) e do traço de 1px na barra de menu (13/08). A
marcação da leva 14 vale outra vez, sem tirar nem pôr: classe que reincide não se
paga com conserto, pede catraca.

O componente é `packages/design-system/src/components/SearchInput/SearchInput.tsx`,
e o vizinho contra o qual ele destoa é a família de filtros que a RN-568 já
nomeou como composição recorrente.

## 19.2 · A navegação mobile vira barra horizontal de quatro

**Direção decidida, desenho vetável.** A spec está no Movimento 8 de
`02-rodadas/2026-08-17-carga-cognitiva/03-spec-reordenacao.md`.

Quatro vetáveis, e o primeiro governa os outros três:

- **NAV-MOBILE-1 — leitura vetável.** "Menu horizontal" está lido como **barra de
  navegação inferior fixa**. Ele disse horizontal e não disse onde. Se a leitura
  estiver errada, todo o resto muda de lugar.
- **NAV-MOBILE-2 — quais quatro.** O rail tem **cinco** itens desde a leva 15
  (Visão geral, Eventos, Clubs, CRM, Parcerias) e a conta não fecha. Default do
  maestro: os quatro primeiros na barra e Parcerias com casa na Visão geral, como
  bloco com caminho.
- **NAV-MOBILE-3 — o drawer, e há conflito nomeado.** A **D-1008-R5** (10/08)
  decidiu que a anatomia off-canvas fica e só a pele muda. Esta leva propõe outra
  anatomia, então **ela supersede a D-1008-R5 na superfície do profissional** —
  escrito aqui de propósito, porque revogação por silêncio já quase custou a
  RN-470. Na superfície do master o drawer **fica**: são oito destinos e quatro
  slots não os comportam.
- **NAV-MOBILE-4 — perfil e configurações.** Lido como **um** botão, o de perfil,
  abrindo o popover que a leva 16 já fechou com Configurações e Sair. Dois botões
  separados reabririam a leva 15, que tirou Configurações do menu justamente por
  apontar para o mesmo `/conta` do perfil. Se ele quiser dois, a leva 15 volta
  para a mesa junto.

**Ganho medido pela L-021:** quatro dos sete caminhos mais comuns caem de dois
toques para um, um empata e nenhum piora. E some a espera de 800 ms da abertura do
drawer num destino que se alcança dez vezes por dia.

**O que a spec avisa:** a barra inferior ocupa altura permanente, e altura em 375 é
exatamente o que os movimentos da leva 17 estão brigando para liberar. As duas
frentes precisam ser medidas juntas na onda, ou uma devolve o que a outra ganhou.

---

## Regras de negócio desta janela

Uma só: a **RN-573**, no [[LEELA-E01-design-system]]. Delta em
`02-rodadas/2026-08-17-carga-cognitiva/05-rns-delta.md`.

As decisões das levas 18 e 19 **não consomem número**, e isso é deliberado. Row-action
em ícone, slide do drawer, campo de pesquisa flat e a barra de quatro são desenho
com vetável em aberto; escrever regra antes de o desenho responder cravaria a
pergunta que a spec ainda faz. É o mesmo tratamento que a leva 10 recebeu no slug
editável e que o ARENA-1 inaugurou. Fica registrado aqui porque decisão do dono
que não aparece nesta seção parece rodada que esqueceu de registrar.

## O que fica com o dono

| Item | Pergunta | Onde |
|---|---|---|
| EVT-CARGA-1 | O header cede inscritos e dias? | spec, Movimento 1 |
| EVT-CARGA-2 | A pill de inscritos na sub-nav fica ou sai? Vale para as 11 barras | spec, Movimento 2 |
| EVT-CARGA-3 | O countdown larga a porcentagem repetida? | spec, Movimento 3 |
| EVT-CARGA-4 | Os painéis de modalidade largam o trio e o total? | spec, Movimento 4 |
| ENG-CARGA-1 | A banda Eventos sai do Engajamento? Supersede a D-1008-R15 | spec, Movimento 5 |
| ENG-CARGA-2 | A ponte vira bloco canônico com recorte, no clube e no CRM? | spec, Movimento 6 |
| NAV-MOBILE-1 | "Menu horizontal" é barra inferior? | spec, Movimento 8 |
| NAV-MOBILE-2 | Quais quatro, e onde fica Parcerias? | spec, Movimento 8 |
| NAV-MOBILE-3 | O drawer sai no profissional e fica no master? | spec, Movimento 8 |
| NAV-MOBILE-4 | Perfil sozinho, ou perfil e configurações separados? | spec, Movimento 8 |
