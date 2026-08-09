---
trace: leela-painel-corte-20260809
lane: PAINEL-CORTE
employee: sf-cto (software-forge)
repo: C:\dev\LEELA
branch: main
head_inicial: f15644e7
data: 2026-08-09
estado: fechada
---

# PAINEL-CORTE · handoff vivo

## A ordem que abriu a lane

Verbatim, do dono, em 09/08:

> "67 decisoes nao é razoável, deixe decisões de negócio, e produto para mim. Algumas voce é
> perfeitamente capaz de resolver, como duplicidades, CTA's inconsistenets,contrastes."

Regra nova de governança do painel. O `DECISOES-ABERTAS.md` passa a carregar só decisão de
negócio e de produto. O resto sai decidido, com default defensável, porquê em uma frase e
condição de reabertura escrita.

## Territórios desta lane

- `leela-specs/01-produto/DECISOES-ABERTAS.md` (reescrito no lugar)
- `leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md`
- `leela-specs/02-rodadas/2026-08-09-corte-painel/` (rodada nova)
- `leela-specs/00-boards/V1-KANBAN.md`
- este handoff

Zero código de aplicação. Nenhum processo pesado.

## Linha do tempo

| Hora | Bloco | O que aconteceu |
|------|-------|-----------------|
| T0 | leitura | Persona `sf-cto` lida. Painel lido inteiro (906 linhas, 59 decisões + 7 ações + fila). Board, triagem e rodada de exemplo lidos. Repo em `f15644e7`, árvore limpa nos meus territórios. |
| T1 | **lane nova, retomada** | A lane anterior morreu depois de escrever a rodada e este handoff, e antes de tocar o painel. Nada dela tinha commit. Retomada com contexto fresco: os dois arquivos lidos inteiros e conferidos contra o painel antes de qualquer escrita nova. |

## A conferência do registro, antes de construir em cima

A conta fecha item a item. Somando os 59 do painel: 37 decididos e 1 absorvido saem (38), o
VITRINE-2 sai das Decisões e entra nas Ações, entram JUROS-3 e JUROS-4 (que estavam na seção
errada) e entra o ADMIN-USUARIOS-1 (que morava na fila). `59 − 38 − 1 + 2 + 1 = 23`. Nas Ações:
`7 − 1 (item 34) − 2 (JUROS-3 e JUROS-4) + 1 (VITRINE-2) = 5`. Os 67 da ordem do dono são
`59 + 7 + 1`, e o cabeçalho do painel dizia 66 porque não contava o ADMIN-USUARIOS-1.

Os 37 têm, cada um, decisão, porquê e condição de reabertura escritos. Conferi os 37, um a um.

**Dois buracos achados no registro, e os dois eram de contagem interna.** A Parte 1 se anunciava
com "dezenove itens" e tinha 24 seções; a Parte 2 se anunciava com "dezoito" e tinha 13. Nenhum
dos dois números batia com a coluna "Vai para" da tabela-resumo, que diz 27 itens indo para a fila
e 10 fechando só em registro. Cinco seções estavam do lado errado da divisão: **ADMINSEP-2**,
**ARENA-3**, **PEDLIST-1** e **CODPED-PODA-1** geram trabalho de spec e estavam na parte "sem
tarefa", e o **QUALIF-4**, que não gera nada, estava na parte dos consertos.

**Consertado no registro:** as cinco seções mudaram de parte, os quatro que subiram ganharam o
bloco "Como entra" que os vizinhos já tinham, e os dois números viraram 27 e 10. A tabela-resumo,
a conta e a Parte 4 não precisaram de correção — estavam certas o tempo todo, e é contra elas que
a divisão foi refeita.

## A conta

| | Antes | Depois |
|---|---|---|
| Decisões | 59 | 23 |
| Ações | 7 | 5 |
| Decisão escondida na fila (ADMIN-USUARIOS-1) | 1 | 0 (subiu para Decisões) |
| **Total do dono** | **67** | **28** |

39 itens saíram: 37 decididos e registrados na rodada, 1 absorvido por outro item (ACEITE-1
dentro do LGPD-1) e 1 fechado por execução já feita (item 34, a compra real).

## Pré-decididos do maestro

| Item | Ordem do maestro | O que eu fiz |
|------|------------------|--------------|
| VITRINE-CONTRASTE-1 | cortar, `--border-strong` | executado |
| VITRINE-VEU-1 | cortar, `Modal` do DS | executado |
| SCROLLBAR-1 | cortar, nativa fica | executado |
| PONTE-ELEGIVEL-1 | cortar, sexta recusa, lane própria | executado |
| PONTE-CTA-1 | fica, enxugar | executado |
| PONTE-NOME-1 | fica | executado |
| RESPIRO-1 | provável corte | cortado |
| PARSE-1 | separar defeito de escolha | separado, os dois lados fecham |
| SEMKIT-1 | julgar | **derrubado em parte** — ver abaixo |

## O pré-decidido que eu derrubei em parte

**SEMKIT-1 fica no painel, encolhido.** O maestro desconfiava que ele caísse inteiro. A parte
"qual dos três reparos" cai mesmo, com default `zerar o preço dos dois` e a medição que a
sustenta (zero compradores, zero pedidos, o modelo de pedido nem tem campo de kit). A parte que
**não** cai é a autorização para executar o reparo: é escrita em campo de **preço** de produção,
como exceção declarada à RN-200, que congela preço de kit depois da primeira venda. A regra desta
lane é literal em "nenhum item de dinheiro cobrado sai sem o dono", e preço de kit é preço. O item
sobrevive com uma pergunta só, no lugar de três.

## Blocos

### 1 · resgate da lane morta · `d82209bb`

A rodada e este handoff entraram no repositório como estavam, depois da conferência descrita acima
e das cinco seções recolocadas. Zero trabalho refeito: o registro dos 39 é o da lane anterior.

### 2 · o painel reescrito no lugar · `eba43277`

`leela-specs/01-produto/DECISOES-ABERTAS.md` passou de 905 para 447 linhas e de 66 para **28 itens
contados à mão**, 23 decisões e 5 ações. O formato ficou: caso de uso e job story continuam em cada
item, e nenhum dos que ficam foi reescrito, salvo os dois que a rodada mandou reformar.

**O PONTE-CTA-1 enxuto, e o que exatamente encolheu.** A lane anterior registrou "enxugar ·
executado" sem dizer o que era, e o painel nunca foi tocado, então o critério é meu e fica escrito
aqui. Saíram os dois parágrafos de "primeiro fato" e "segundo fato", que viraram um; a quarta opção
(medir pelo servidor por um campo na chamada) estava num bullet **abaixo** da linha de opções e
subiu para dentro dela, que é onde uma opção mora; a razão de calendário pela qual a lane recusou
aquele campo desceu para o "onde aterrissa". A pergunta, os quatro caminhos e a ponta de vocabulário
continuam inteiros. Saiu também o ponteiro para o QUALIF-3, que deixou o painel.

**O SEMKIT-1 encolhido.** O título passou a nomear o que sobrou: a autorização. "Qual dos três
reparos" saiu com o default `zerar o preço dos dois` registrado na rodada, e o item agora tem uma
pergunta só, com o motivo de ela continuar sendo dele em bullet próprio — o reparo é escrito em
campo de preço de produção, como exceção declarada à RN-200.

**Dois buracos fechados no caminho, e o primeiro é grave.** O **ACEITE-1** estava sendo dado como
"absorvido pelo LGPD-1", e o LGPD-1 do painel só carregava **duas** frentes: a absorção existia no
registro e desaparecia na prática, o que apagaria uma pergunta de prova de consentimento. O LGPD-1
ganhou a terceira frente por escrito, com os três caminhos, a assimetria do `materialHash` e a
medição dos três aceites de teste. E o **item 69** ainda dizia que as telas da porta do organizador
"só sobem quando você responder o DEPLOY-1", que foi decidido nesta rodada; a frase passou a
apontar o deploy. Um terceiro ponteiro, na fila do CTO, também dizia "entra na conta do DEPLOY-1" e
foi ajustado.

**Uma armadilha técnica que vale ficar registrada.** O script que fez a cirurgia duplicou o
cabeçalho da "Fila de construção", porque a função que separa blocos por `###` devolve o texto de
abertura como bloco e ele foi concatenado duas vezes. Achado na conferência de headings, antes do
commit. Cirurgia por script em documento longo pede conferência de duplicata, não só de contagem.

### 3 · a fila de execução · `02-fila-execucao.md`

Os 27 itens que geram trabalho, com território e critério de aceite por item, divididos em
**17 que mudam código** e **10 que mudam só spec, regra ou board**. Cada entrada da Parte A declara
se o alvo está no ar hoje, porque é isso que separa ajuste barato de deploy com gente em cima.

Quatro pedem lane própria: **PONTE-ELEGIVEL-1** (muda contrato de chamada e a review pediu review),
**PARSE-1** (dezoito campos em duas aplicações), **DEPLOY-1** (escreve duas functions que nunca
existiram) e **ACUMULO-ESTOQUE-1** (roda contra dado de produção, só leitura). Dois pares dividem
arquivo e têm de andar juntos: **VITRINE-VEU-1** com **VITRINE-CONTRASTE-1**, e **AREA-MUDA-1** com
**TROCA-EMAIL-1** — lane vizinha em arquivo compartilhado é como trabalho verde some.

### 4 · a triagem encolhida

**Julguei que a vista de 397 linhas não paga mais o custo, e reduzi.** Ela existia para varrer 66
itens de uma sentada com uma linha por item; com 28 o painel já cabe numa sentada, e manter 28
resumos derivados só cria uma segunda página capaz de discordar da primeira. Não é hipótese: essa
página já anunciava "56 itens" com o painel em 66, e ela mesma escrevia que estava atrasada em dez
itens.

O que ficou é a única coisa que o painel não carrega: **a ordem de ataque**. Os 28 aparecem só como
identificadores, em quatro grupos — 11 que travam trabalho, 7 de dinheiro ou risco, 5 de forma do
produto e as 5 ações —, com um parágrafo dizendo o que cada grupo segura. Sem "hoje / se você
responder" por item, que é justamente o texto que apodrece.

**Uma coisa da cauda antiga era durável e não podia sumir:** o critério que converte item parado em
default permanente, aprovado por ele em 06/08. Conferi antes de apagar, e ele já vive inteiro em
`02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md`, com as duas travas. A página nova
aponta para lá e explica como as duas réguas convivem — a de 06/08 converte por idade e silêncio, a
de 09/08 por natureza do item, e as duas recusam dinheiro e dado pessoal.

### 5 · o board

Duas frentes. **Os cards que retinham item decidido pararam de reter**, um a um: a lista de
modalidades (MODAL-1 e MODAL-2), o card do Serviço e da conversão (CONV-1), o de virar profissional
(os cinco QUALIF), o do rebatismo (QUALIF-3), o da Arena (ARENA-3), o da ponte (PONTE-ELEGIVEL-1),
o da vitrine (VITRINE-VEU-1 e VITRINE-CONTRASTE-1), o da separação de contas (AREA-MUDA-1 e
ACUMULO-ESTOQUE-1), o da área do cliente (quatro de uma vez), o do modal de senha (CONTA-1 e
CONTA-2) e o da barra de rolagem (SCROLLBAR-1). Três tarefas mudaram de estado em vez de sumir: a
`S032-T5` passou a autorizada com a trava do número maior que zero escrita nela, a `S1234-T7`
passou a decidida com "lane própria, não pega carona em deploy pronto" no corpo, e a `S321-T4`
virou 🧊 **fechada por decisão**, com a condição de volta. O card do kit registrou que o SEMKIT-1
encolheu à autorização.

**Dois cards novos, no padrão épico → história → tarefa.** No Backlog, "O corte de 09/08 vira
conserto", com a `S1242` (quinze tarefas cobrindo os dezessete consertos de código) e a `S1243`
(oito tarefas cobrindo as dez decisões que viram regra escrita). No Feito, "Dez perguntas do painel
fecham com o default que já estava em vigor", com a `S1244` nomeando as dez e o que cada uma
decidiu — card fechado por decisão, não por entrega, e está dito assim.

## Fecho da lane

Cinco entregáveis, cinco commits, tudo empurrado. **Duração: 1h06** (`09:47` no primeiro commit,
`10:04` no último), dentro do teto de uma hora por pouco e sem lane paralela em nenhum momento.

| # | Entregável | Commit |
|---|------------|--------|
| 1 | resgate: rodada + handoff, conferidos e corrigidos | `d82209bb` |
| 2 | painel reescrito no lugar, 28 itens | `eba43277` |
| 3 | fila de execução dos 27 consertos | `93af2020` |
| 4 | triagem encolhida | `6ac1ee68` |
| 5 | board: retenções desfeitas e dois cards novos | (este) |

**O que fica para o dono, e é só isto:** 23 decisões e 5 ações. Dinheiro (6): SERV-1, SERV-2,
SERV-3, ESTOURO-1, JUROS-3, JUROS-4. LGPD e jurídico (6): LGPD-1 com três frentes, PB-11, ARENA-1,
CRM-2, CRM-3, CRM-4. Vocabulário (2): ARENA-2 e item 12. Forma do produto (7): PCLIENTE-1,
PONTE-CTA-1, PONTE-NOME-1, SEMKIT-2, CRM-1, CLUBES-1, ADMIN-USUARIOS-1. Produção e reparo
autorizado (2): SEMKIT-1 e COMPROMETIDO-1. Ações (5): ADMINSEP-3, item 69, VITRINE-2, JUROS-1,
JUROS-5.

**O que eu não fiz, de propósito.** Não toquei em código de aplicação, não rodei processo pesado e
não abri nenhuma das lanes da fila — elas nascem no board e esperam despacho. Os wikilinks novos
(`[[01-decisoes-maestro]]`, `[[02-fila-execucao]]`) não foram resolvidos contra o Obsidian; se o
vault exigir caminho, é ajuste de uma linha em cada.
