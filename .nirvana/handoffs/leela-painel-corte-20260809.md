---
trace: leela-painel-corte-20260809
lane: PAINEL-CORTE
employee: sf-cto (software-forge)
repo: C:\dev\LEELA
branch: main
head_inicial: f15644e7
data: 2026-08-09
estado: em curso
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
