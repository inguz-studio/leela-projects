---
tags: [leela, decisoes-dono, leva17, leva18, leva19, leva20, leva22, carga-cognitiva, navegacao, filtros, kits, modalidades, e01, e02, e03, e04, e05]
aliases: [Leva 17, Leva 18, Leva 19, Leva 20, Leva 22, Decisões do dono 17/08]
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

---

# Leva 20 · o padrão de filtro, os KPI de engajamento e a barra mobile

**Na íntegra:**

> *"novamente, voco colocol pills no lugar de filtros, em Membros, em duas fileiras, quanto
> poderiamos apenas ter filtros. Isso ficou confuso na tela de clubes, na hora de filtrar colunas,
> quero que voce aplique o componente dos filtros em lista. e eles devem ficar alinhados ao lado do
> pesquisador, assim como em DEsafios. Para padronizar. (me refiro a rota dos clubes), mas isos deve
> ser aplicar no projeto inteiro. Nao houve o manejamento dos KPI cards, de enagajemtno, nao estou
> localizando os insights da Leela, (que eu havia enviado no template do mockup feito no claude
> design). Já o Menu no formato mobile, pode ser uma barra flutuante, horizontal a ficar na parte
> inferior da tela. e a parte de logout, configurações, na barra superior no lado direito, com o
> ícone de perfil."*

Três assuntos numa fala só, e cada um cai numa lane diferente. O registro inteiro mora aqui; os
ponteiros dizem quem constrói.

## 20.1 · Filtro de listagem é lista, ao lado da pesquisa (2ª cobrança)

> Build na lane **FILTROS-LISTA** (`filtros-lista`), trace `leela-redesign-v2-20260810`.

A palavra que abre a fala é *"novamente"*, e ela é o fato mais importante desta leva. A onda C4
aplicou `FilterChips` em Membros seguindo a spec da conformidade e o limiar do ADR-019 à risca: o
padrão estava **certo pela régua da esteira e errado pelo gosto do dono**. Quem manda no padrão é
ele. Isto não é conserto de defeito, é troca de régua, e por isso a decisão sobe ao cânone em vez de
virar um card de tela.

**O padrão novo, com as duas metades obrigatórias** (cânone §1.1):

1. **A forma é lista.** `FilterChips` desenha `FilterMenu` (empilhável) ou `Combobox` (exclusiva).
   A contagem de opções não decide nada. Fileira de pills como filtro primário está proibida.
2. **A posição é a mesma fileira do campo de pesquisa.** A `FilterBar` hospeda e o `SearchInput`
   fica na largura padrão do DS.

**A anatomia medida antes de escrever o padrão** (desktop 1440, painel de pé, 17/08):

| Tela | Fileiras | Altura da barra | Largura da busca | Facetas |
|---|---:|---:|---:|---|
| Desafios (a referência dele) | 1 | 55px | 320px | 2, em fileira de chips |
| Membros (a queixa dele) | 2 | 99px | 448px | 2, em fileira de chips |
| Comunicados | 2 | 99px | 320px | 3, em fileira de chips |
| Eventos (hub) | 1 | 49px | — | 1, em lista |

O que a medição mostrou e a suposição não teria mostrado: **Membros e Desafios tinham composição
JSX idêntica**. A única diferença era uma classe no campo de busca (`w-full max-w-md`). Um teste de
unidade veria o mesmo código nas duas telas e passaria verde nas duas. E Comunicados prova que
largura sozinha não resolve: com a busca já na largura padrão, três facetas em fileira ainda quebram
a linha.

**A referência do dono cumpria metade do padrão.** Desafios acertava a posição e errava a forma,
então ela também converteu. O hub de Eventos, que ninguém citou, já era o padrão inteiro.

**O motivo medido da troca, além do gosto.** Na fileira, o nome da faceta só existia no
`aria-label`. Em Membros o organizador via `Todos · Ativos · Novos · Inativos · Todos · Owner ·
Admins · Membros`: dois "Todos" colados, sem nada dizendo onde acaba Status e começa Papel. O
gatilho da lista mostra `Status: Todos` — nome e valor aplicado, em texto, para todo mundo.

**Três ADRs caem, e ficam escritos.** ADR-019 e ADR-020 recusavam converter em nome do clique
economizado; a régua deles (*"onda que sobe passo não fecha"*) perdeu para a régua da clareza. O
ADR-020 pedia `disabled` na peça como condição de reabertura, e a prop foi **paga** no mesmo commit
— a dívida foi quitada, não perdoada. O ADR-018 (typeahead do balcão) fica **parcialmente**
superado: a régua de cliques caiu, mas a perna dele que continua de pé é ausência de capacidade no
DS (`Combobox` não tem modo de resultado inline), e o balcão não tem faceta nenhuma, então o padrão
novo não governa aquela tela. Esticar a fala do dono até lá seria inventar decisão.

## 20.2 · Os KPI de engajamento e os insights da Leela

> ⚠ **Só registro nesta lane.** Build na lane **ENG-INSIGHTS** (`eng-insights`).

Duas queixas coladas numa frase, e são coisas diferentes:

- **Os KPI cards de engajamento não foram manejados.** Cobrança de trabalho que a leva anterior
  deixou passar, não pedido novo.
- **Os insights da Leela sumiram.** O dono diz que os enviou *"no template do mockup feito no claude
  design"* e não os localiza no produto. Isto é rastro de insumo do próprio dono que não chegou à
  tela — a lane ENG-INSIGHTS tem de achar o mockup antes de desenhar qualquer coisa, porque o
  material existe e é dele.

## 20.3 · A barra mobile flutuante, e o perfil no canto superior direito

> ⚠ **Só registro nesta lane.** Build na lane **NAV-MOBILE** (`nav-mobile`).

**Esta leva responde dois dos quatro vetáveis que a leva 19 deixou em aberto**, e é por isso que ela
não pode ser lida sozinha:

- **NAV-MOBILE-1 respondido.** *"barra flutuante, horizontal a ficar na parte inferior da tela"* —
  a leitura do maestro (barra inferior) estava certa, e ele acrescentou **flutuante**, que a leitura
  não tinha. Flutuante muda o desenho: a barra passa por cima do conteúdo em vez de reservar altura,
  o que conversa direto com o aviso da leva 19 de que altura em 375 é o que a leva 17 está brigando
  para liberar.
- **NAV-MOBILE-4 respondido.** *"a parte de logout, configurações, na barra superior no lado
  direito, com o ícone de perfil"* — **um** botão, o de perfil, no topo à direita, abrindo o popover
  que a leva 16 já fechou com Configurações e Sair. O default do maestro estava certo.

**Continuam em aberto:** NAV-MOBILE-2 (quais quatro dos cinco itens do rail, e onde fica Parcerias)
e NAV-MOBILE-3 (o drawer sai no profissional e fica no master).

## Regras de negócio desta leva

Nenhuma nova. A mudança de filtro é **cânone**, não regra de negócio: ela governa a forma de um
controle, não o comportamento de um dado. A linha entrou em `03-canon/canone-de-componentes.md`
§1.1, que é onde uma decisão de padrão vincula sem consumir número.

## O que fica com o dono

| Item | Pergunta | Onde |
|---|---|---|
| FILTRO-1 | Gate visual das telas convertidas (antes × depois, 375/768/desktop, 2 temas) | handoff `leela-filtros-lista-20260817.md` |
| NAV-MOBILE-2 | Quais quatro, e onde fica Parcerias | leva 19, spec Movimento 8 |
| NAV-MOBILE-3 | O drawer sai no profissional e fica no master | leva 19, spec Movimento 8 |

---

# ⛔ Leva 21 · a fala do dono não chegou a este arquivo

**Achado no merge da lane FILTROS-LISTA, 17/08.** Este bloco existe para o buraco não passar batido
de novo — é a mesma classe de falha que abre este arquivo, e ela reincidiu no mesmo dia.

O card da lane MODAL-LOTE, no `00-boards/V1-KANBAN.md`, cita a leva 21 e diz que o registro dela
mora *"no card da lane FILTROS-LISTA"*. **Não mora.** O brief da FILTROS-LISTA a tornou dona do
registro da **leva 20** (três itens: filtros, engajamento e nav mobile) e não mencionou a 21 em
nenhuma linha. Duas lanes leram o mesmo mapa de maneira diferente, e a fala do dono ficou no vão.

**O que existe, e onde:** os cinco itens da leva 21 (botões do `LoteModal`, glass da superfície,
opacidade do overlay, animação de fade, scrollbar) estão **construídos e provados** em
`.nirvana/handoffs/leela-modal-lote-20260817.md`, com causa raiz medida e alcance declarado. O
trabalho não se perdeu; o **registro da fala** é que não aconteceu.

**O que falta, e por que esta lane não preencheu:** a fala do dono **na íntegra**. O handoff da
MODAL-LOTE descreve os cinco itens em terceira pessoa e não transcreve o que ele escreveu. Escrever
aqui uma citação reconstruída seria inventar decisão, e é exatamente o vício que a §"Registro de
falha de captura" deste arquivo condena. Fica o buraco nomeado em vez de um texto plausível.

**Quem paga:** a primeira lane que tiver a fala em mãos abre `# Leva 21` neste arquivo, com a
citação e os cinco itens desdobrados, e corrige o ponteiro do card da MODAL-LOTE no kanban.

**A lição, que é de processo e não de lane:** "o registro está na outra lane" só vale quando a outra
lane recebeu a leva **por escrito no brief**. Ponteiro para registro que ninguém foi encarregado de
escrever é registro nenhum — e some sem barulho, porque os dois lados acham que o outro fez.

---

# Leva 22 · o terciário vira padrão, Modalidades toma o lugar de Lotes, kits arrumados

> Rodada `02-rodadas/2026-08-17-leva22/`. Medição com arquivo:linha em
> `00-medicao-kits-caixa-e-terciario.md`; specs e fila nos arquivos seguintes.
> ⛔ Zero código de produto nesta lane — os builds são as quatro ondas nomeadas.

**Na íntegra:**

> *"Em configurações dos Clubs, está perfeita a solução de menu terciário (identidade,
> pagina pblica, regras, moderação, admin avançada). quero que isso seja o padrão, para
> outras áreas que demandem isos. Só que, ele está no formato de menu ancora. e acho que o
> scroll dessa abas terciárias deveriam ser fixas, a nao ovimentar a tela inteira.(me fiz
> claro?) ese formato de menu terciário poderia ser aplicado em configurações dos eventos
> também. Onde a página de vendas deve ficar em Configurações, de eventos. nos kits, o que
> está incluso, deve aparecer no formato de tabela. Organize melhro os espaçamentos, reduza
> o tamanho das simulações das fotos dos kits, em 50%. AO Somente posso adicionar itens no
> kits, que já estejam cadatrados como um item indivudal, POis um kit é um conjunto de
> itens, e essa contagem deve ser feita a partir disso. Quero alterar a RN-200, o
> organizador pode editar os preços dos kits, se achar necessário, só que isso nao deve
> afetar pedidos já realizados.apenas da edição para frente. O Seletor de modalidades,
> tambéme stá fora do padrão de design sistem, quando abro a listagem dele. Existem
> breadcrumbs dentro de kits, isso nao faz sentido algum. E já perdi as contars em dizer
> que nao consigo encontrar aonde adicionar modalidades emum evento. Essa área deve ser ali
> em Lotes. E chamaremos de Modalidades ao invés de Lotes, no menu secundário.Ali posso ou
> adicoinar uma modalidade ou um lote dentro da modalidade. Os alertas operacionais estão
> fore do padao de alertas, que utilizamos em visão geral. Os alertas devem seguir aquele
> padrão. O otão editar em kits (gerenciamento_ deve ficar alinado ao lado direito
> superior, como ícone de edição, e não no lado esquerdo inferior. E os cards dos kits estão
> com linhas de borda que já falei expressamente que nao devem ter. No luagr dos
> breadcrums, deixe um botão de voltar. Em credenciamento, devemos simlpificar mais a ação,
> que é de fazer o checkin. a visualização de informações de analise do credencieamenot,
> pode ficar em ourta aba terciária dentro do mesmo também. NO caixa do evento, a tabela de
> 'inscrições' toda unificada por kit modalidade e status, nao informa nada para o usuário.
> Qual o intuito dela? Mostrar uma divisao de receita por forma de insicrção? Distribuição?"*

## 22.0 · A contagem, refeita à mão

O brief desta lane anunciava **14 itens**. Contando a fala instrução por instrução, dão
**17**. A diferença não é discussão de método: são três pedidos que ficariam sem card se a
conta de 14 fosse aceita sem conferência — o botão de voltar no lugar da trilha (item 11b),
os espaçamentos (item 6) e a pergunta do caixa (item 17), que é a única que não é ordem.
Fica escrito porque contagem herdada de brief é a forma mais barata de perder um pedido do
dono, e esta lane nasceu de outra perda dessas.

| # | O que ele pediu | Onda | Decide |
|---|---|---|---|
| 1 | Menu terciário dos Clubs vira **padrão da casa** | B | MODALIDADES-1 não; **RN-574** |
| 2 | O terciário vira **abas fixas** — sem rolar a tela | B | RN-574 |
| 3 | Terciário aplicado em **Configurações de eventos** | B | — |
| 4 | **Página de vendas** passa a viver em Configurações | B | — |
| 5 | "O que está incluso" vira **tabela** | A (sem Qtd.) / D (com Qtd.) | RN-576 |
| 6 | **Espaçamentos** organizados | A | — |
| 7 | Fotos dos kits **−50%** | A | ⚠ FOTOS-1 |
| 8 | **Kit = conjunto de itens cadastrados**, contagem derivada | D | **RN-576** |
| 9 | **RN-200 alterada** — preço de kit editável, só para frente | D | **RN-575** |
| 10 | Seletor de modalidades **no padrão do DS** | A | — |
| 11a | **Breadcrumbs em kits morrem** | A | — |
| 11b | No lugar deles, **botão de voltar** | A | — |
| 12 | **Modalidades no lugar de Lotes**, com lote dentro da modalidade | C | MODALIDADES-1 **fecha** |
| 13 | **Alertas operacionais** no padrão da Visão Geral | A | — |
| 14 | Botão editar vira **ícone no topo-direita** | A | — |
| 15 | **Bordas dos cards de kit morrem** | A | ⚠ ver 22.2 |
| 16 | **Credenciamento**: ação simplificada + análise em aba própria | B | ⚠ CRED-1 |
| 17 | **Tabela do caixa**: "qual o intuito dela?" | — | **fica com ele** |

## 22.1 · Cobrança repetida (a) — "já perdi as contas" sobre as modalidades

Ele tem razão, e a trilha é rastreável. Não é contexto perdido: é uma proposta que ficou
esperando.

| Quando | O que aconteceu |
|---|---|
| 05/08 | A lane DIAG-PAINEL-LACUNAS mede o círculo fechado entre Lotes e Configurações e devolve a **S316** inteira, com seis tarefas. Nada construído. |
| 10/08 | **D-1008-R13**, na íntegra: *"Nao consigo ver a configuração de modalidades em lotes. Está consufo, pois eu precisaria primeiramente configurar as modalidades e depois os lotes."* |
| 10-11/08 | A resposta vira **proposta vetável** e entra no painel como **MODALIDADES-1**, com fase A e fase B e um default proposto. |
| 12/08 | Ele volta a perguntar no chat: *"Sobre a tela de lotes, nós colocamos o cadastro de modalidade por lá?"* O painel registra que a resposta dele *"pode fechar direto, sem esperar nova rodada"*. |
| 17/08 | *"já perdi as contas em dizer que nao consigo encontrar aonde adicionar modalidades"* — e desta vez ele **não escolhe entre as opções: dá o desenho**. |

**A lição, e ela é de processo, não de produto.** A MODALIDADES-1 estava formalmente
correta: item no painel, contexto, caso de uso, job story, opções com default. E mesmo
assim ele cobrou três vezes. **Proposta vetável que fica semanas sem resposta não é uma
decisão aguardando — é uma pendência que o dono re-cobra como falha nossa**, porque do lado
dele o que se vê é a tela que continua igual. O default proposto existia justamente para
isso e nunca foi exercido.

Vale ao lado da confissão da leva 17, que é o defeito oposto e da mesma família: lá uma fala
não virou registro nenhum; aqui virou registro exemplar e não virou tela. **Item registrado
que espera também custa** — menos que o não registrado, e não zero. A régua que fecha as
duas: item de painel com default proposto e sem resposta em **duas janelas do dono** entra
na fila pelo default, com o veto seguindo aberto. Não vale para dinheiro nem para dado
pessoal, que continuam sempre dele.

## 22.2 · Cobrança repetida (b) — as bordas nos cards de kit

Ele diz *"já falei expressamente que nao devem ter"*. Conferi o histórico, e o veredito é
desconfortável: **é regressão, e foi a lane que consertou o pedido anterior dele que a
introduziu.**

Em 10/08 ele reclamou do **oposto** (D-1008-R11: *"nao consigo visualizar os bento cards
[...] estao todas as informações flutuantes"*). A lane AJUSTES-DONO pagou em `a60690c2`
trocando o `<article>` cru pelo `Card` canônico. O `<article>` tinha raio e fundo e **zero
borda**; o `Card` traz `border border-border` na receita base. Diff e arquivo:linha em
`00-medicao-kits-caixa-e-terciario.md` §1.

**Não maquiando o que a medição achou por baixo:** a borda não é defeito da tela de kits, é
a **receita canônica do `Card`**, e ela contradiz a régua da própria casa — *"flat por
padrão, sem borda decorativa"* (`04-engenharia/governanca-design.md:38`, §2.16), cuja lista
de exceções não inclui card comum. O componente declara isso na cara: *"border-border é
decorativa (frame shadcn)"*. São **43 instâncias** de `<Card>` nos apps e **nenhuma** mata a
borda. O `KpiCard`, na mesma dobra da tela de kits, não tem borda — duas superfícies
diferentes na mesma tela, e a de baixo é a que está fora da régua.

Então a resposta honesta às três hipóteses: **não é (b) fora do alcance nem (c) outra
causa. É (a) regressão — e ela expôs um defeito de cânone maior que a tela.**

⚠️ **Duas travas que a onda A carrega, e as duas já mordem.** A própria lane da R11 escreveu
o teste que congela a borda (`superficie-cartoes.test.tsx:80`, `:93`, afirmando
`toContain('border-border')`): a decisão de hoje contradiz a asserção, e os dois mudam no
mesmo commit. E matar a borda devolve a separação inteira para fundo e sombra — no tema
**wine** o card é `#FFFFFF` sobre página `#FDFAF7`, quase nada. **É o tema onde fechar esta
leva pode reabrir a D-1008-R11 no mesmo gesto**, e por isso o aceite não é "a borda sumiu",
é "o contêiner continua legível nos três temas, sem borda", com olho por tema.

## 22.3 · As quatro decisões que fecham

### MODALIDADES-1 · fechada pelo desenho do dono — sai do painel

Ele não escolheu entre fase A e fase B: deu a forma. **A área de Lotes vira "Modalidades" no
menu secundário do evento**, e dentro dela se adiciona **ou uma modalidade, ou um lote dentro
de uma modalidade** — modalidade é pai, lote é filho. Isso é a fase B com hierarquia
declarada, e supersede o default de "fase A agora" que o painel propunha.

A **S316 inteira é re-ancorada nesse desenho** (spec em `02-spec-modalidades-pai-filho.md`;
as seis tarefas revisadas contra ele, com tamanho refeito). ⚠️ **A ordem que a medição
impõe:** o renome não sobe sozinho. A tela de Lotes hoje declara na cara que **não** edita
modalidades (`lotes/LotesView.tsx:75-78`), então chamá-la de "Modalidades" sem entregar a
`S316-T4` recria o círculo fechado que a DIAG-PAINEL-LACUNAS pagou para desfazer — o nome
prometeria o que a tela continua não fazendo. **Renome e conteúdo sobem juntos.**

### RN-200 · alterada por ordem do dono, com o veredito do snapshot

**Preço de kit passa a ser editável pelo organizador, com efeito só para frente.** Nasce a
**RN-575**, que recorta o kit de dentro da RN-200 sem revogá-la — evento e lote seguem
congelados, e a RN-200 fica **marcada**, nunca apagada, pela mesma disciplina da RN-211 e da
RN-470.

**Veredito medido: SNAPSHOT-PARCIAL** (§15 da medição).

**A metade que vale dinheiro já está pronta.** O preço do kit é somado dentro de
`pedido.itens[].valorBase` na hora da compra (`saleState.ts:294-300` →
`createInscricaoCharge.ts:1361`) e nunca é relido. `ItemPedido` não tem campo de kit.
**Editar `kit.preco` hoje não muda um centavo de pedido nenhum** — a ordem do dono, na parte
do dinheiro, já é satisfeita pela arquitetura. **Isso rebaixa a prioridade da blindagem de
dinheiro na onda D:** não há pedido em risco.

**As duas lacunas que a ordem abre, e que a RN precisa cobrir:**

1. **Auditabilidade.** Sem `kitPreco` gravado, ninguém prova depois quanto daqueles R$ 180
   foi kit. Hoje não incomoda porque o preço é imutável; **liberar a edição cega a série
   histórica**. Molde pronto no repositório: `pagamento.taxaCongelada` (RN-179).
2. **Nome e composição derivam do doc vivo.** Renomear um kit reescreve o que a confirmação
   de uma compra antiga mostra (`CheckoutFlow.tsx:2052`) e trocar itens reescreve o
   checklist do balcão (`_lib/balcao.ts:260`). Nenhuma Rule impede. **Se "pedidos já
   realizados intocados" é o contrato, isto o viola sem tocar em dinheiro** — e é a parte da
   onda D que passa a ter prioridade, no lugar da blindagem de valor.

⚠️ **Correção a uma premissa do brief desta lane:** ele supunha que a RN-497 já havia
revogado parte da RN-200. Não revogou. A RN-497 derrubou uma extensão que existia só em
comentário de código, trata do **lote**, e o épico diz que a RN-200 *"permanece aqui,
inalterada"* (`LEELA-E03-operacao-evento.md:2193`, `:2213`).

### Kit = composição de itens cadastrados

**Nasce a RN-576.** Item individual é a unidade; o kit referencia itens do catálogo; **a
contagem deriva disso**. Só entra no kit o que já existe como item cadastrado.

A medição barateia metade e encarece a outra (§6). **As duas coisas já existem e não se
falam:** há catálogo real (`ItemKit`, coleção `itensKit/{itemId}`, vínculo N:N em
`item.kits`) e, em paralelo, uma lista de **texto livre** (`Kit.itens: string[]`, que o
próprio core chama de *"decorativa"*). Convivem na mesma tela do editor, com estado separado
desde a declaração, e **nada lê um para preencher o outro**.

Derivar "o que está incluso" do catálogo **não exige migração de dado** — os dois campos já
são gravados e `ItemKit.nome` é exatamente o texto que hoje se digita. É trabalho de tela e
de regra de precedência. **O que não existe é quantidade por item**, e é a única parte cara:
uma coluna "Qtd." na tabela do item 5 pede campo novo no core e nas Rules. Por isso a tabela
**sem** quantidade é onda A e **com** quantidade é onda D.

### Menu terciário = padrão da casa, com abas fixas

**Nasce a RN-574.** O padrão que ele elogiou entra no cânone como **padrão nomeado**, com a
correção dele: **abas fixas que trocam o conteúdo no lugar, sem rolar a página**. A leitura
*"morre o formato âncora"* fica marcada **vetável** — ele perguntou *"me fiz claro?"*, e a
resposta honesta é que ficou, mas a pergunta merece confirmação antes de o componente virar
lei em todas as áreas.

Três fatos da medição mudam o tamanho (§10):

- **É âncora mesmo**, confirmado por `IntersectionObserver` + `scrollIntoView`, e o teste
  do arquivo até usa a palavra ("navegação âncora").
- **É bespoke**, escrito à mão dentro da rota do club, e é o **único** lugar do painel com
  esse padrão. Virar padrão da casa significa **criar o componente**, não repropagá-lo.
- **O que ele chama de terciário é o quarto nível** na anatomia do código; os três de cima
  já são canônicos. O cânone inclusive já diz que não deveria haver variante por
  profundidade (`canone-de-componentes.md:234-235`). **O que ele elogiou é justamente o
  único fora do cânone** — e é uma coluna vertical, não uma barra horizontal.

**A onda B compõe, não constrói do zero:** o `Tabs` do DS já troca conteúdo no lugar sem
rolar, com a11y completa. Faltam três coisas — estado na URL, indicador **deslizante**
(exigido pela D-1008-R14, e a mecânica já existe pronta no `SubNav`, é código para promover)
e a decisão de fundo, porque hoje `SubNav` (transparente) e `Tabs` (com `border-b`) divergem
**de propósito** pela D-1008-R18.

**Aplicação imediata:** Configurações de eventos, com a **página de vendas** dentro, e
Credenciamento em duas abas (ação de check-in · análise).

## 22.4 · O que a lane NÃO decidiu, e por quê

### A tabela do caixa fica com o dono — medida, não decidida

Ele perguntou o intuito. A resposta medida é que **ela não faz nenhuma das duas coisas que
ele supôs** (§14).

Não é divisão de receita: **não tem uma única coluna em R$**. São três colunas — Categoria ·
Item · Inscritos. E é distribuição só num sentido degradado: **não existe chave composta
kit×modalidade×status**, são três partições independentes empilhadas numa tabela só,
distinguidas pela palavra na primeira coluna. Cada partição soma o mesmo total, então **a
coluna somada de ponta a ponta dá 3× o número escrito no cabeçalho**, sem separador visual.
Num evento de 3 modalidades × 2 kits × 4 status ela produz 9 linhas, não 24.

**Ela nasceu como substituto declarado**, em 04/07, e nunca mais foi tocada em 11 commits
seguintes ao redor dela. A spec S207 pedia matriz modalidade×lote e inscrições por forma de
pagamento; o ADR é explícito que *"breakdown é uma matriz modalidade×lote — cada célula é um
par real, não um produto cartesiano de dimensões independentes"*. O commit de nascimento
registra a recusa: *"breakdown por forma de pagamento | dado inexistente no agregado"*. **A
dependência que destravaria continua aberta** (FABLE-A, modelo de pedido/pagamento).

E a redundância é grande: **um terço das linhas dela já está desenhado em barra 40px acima,
na mesma dobra**, e **as três partições já existem, acionáveis, na tela de Inscritos** —
chips de status clicáveis como filtro, mais selects de kit e modalidade. A Caixa mostra em
leitura o que a outra tela serve em ação.

**Vira o item CAIXA-1 no painel, com três opções e um default.** Não decido por ele: isto é
o que a tela do dinheiro conta ao organizador.

### FOTOS-1, CRED-1 e o vetável do terciário

- **FOTOS-1.** "Reduzir 50%" não tem número para dividir: a galeria é `grid-cols-3` com
  `w-full` e **zero px em qualquer lugar** (§4). Metade de "a largura da coluna" pode ser
  teto de largura ou outra escada de colunas, e as duas dão resultados diferentes em mobile
  — que é justamente onde ele reclamou na leva 17. O default entra na onda A e o veto fica
  aberto.
- **CRED-1.** O corte ação × análise **já existe no espaço** (60/40), com uma impureza: o
  card "Ações rápidas" está do lado da análise **com três botões sem `onClick`** — botões
  mortos na tela hoje. E a simplificação de maior efeito não é layout: **não existe scanner
  em lugar nenhum do painel**, o ingresso tem QR na landing e no balcão o operador digita o
  código na mesma caixa do nome. Virar duas abas é barato; tirar dois toques do check-in é
  trabalho novo.
- **O vetável do terciário** (a leitura "morre o âncora") segue aberto até ele confirmar.

## Regras de negócio desta leva

Três, e a faixa foi conferida por grep de `RN-574` a `RN-578` sobre o corpus fora do índice
imediatamente antes do commit: **zero definições** — os quatro retornos são prosa de rodadas
anteriores descrevendo as próprias varreduras, o molde de sempre.

| RN | O quê | Épico |
|---|---|---|
| **RN-574** | Menu terciário é padrão nomeado, com abas fixas que trocam conteúdo no lugar | [[LEELA-E01-design-system]] |
| **RN-575** | Preço de kit é editável, com efeito só para frente — recorta o kit da RN-200 | [[LEELA-E04-config-vendas]] |
| **RN-576** | Kit é composição de itens cadastrados, e a contagem deriva do catálogo | [[LEELA-E03-operacao-evento]] |

Delta em `02-rodadas/2026-08-17-leva22/05-rns-delta.md`.

**Os outros catorze itens não consomem número, e isso é deliberado.** Bordas, botão editar,
trilha, espaçamentos, alertas, seletor e fotos são **conformidade a régua que já existe** —
a §2.16 do guia visual, a RN-558 (procedência) e a RN-568 (composição recorrente) já os
cobrem, e escrever regra nova para eles criaria uma segunda definição do que já é lei. O
caso das bordas é o mais claro: não falta regra, **falta o `Card` obedecer à que existe**.
Fica registrado aqui porque decisão do dono que não aparece nesta seção parece rodada que
esqueceu de registrar.

## O que fica com o dono, nesta leva

| Item | Pergunta | Onde |
|---|---|---|
| CAIXA-1 | A tabela de inscrições da Caixa: redesenhar com propósito, trocar por receita, ou remover? | painel + `03-spec-caixa-e-kit-composicao.md` §Parte 1 |
| FOTOS-1 | "50%" das fotos do kit: teto de largura ou outra escada de colunas? | `04-fila-em-ondas.md`, onda A |
| CRED-1 | O check-in ganha scanner, ou só o corte em duas abas? | `01-spec-menu-terciario.md` §Aplicação 2 |
| TERCIARIO-1 | Confirmar que "abas fixas" mata o formato âncora — *"me fiz claro?"* | `01-spec-menu-terciario.md` |
