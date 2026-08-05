---
tags: [leela, decisoes, rodada, modalidade, kit, lote, interruptor]
trace: leela-pixreal-diag-20260804
lote: SPEC-MODALIDADE-KIT
data: 2026-08-05
---

# 01-decisões · a modalidade que ninguém edita, e o lote que pode dispensar o kit

> Duas falas do dono, na mesma conversa, e elas não são o mesmo assunto. A primeira abre um
> caminho que o produto nunca teve. A segunda escolhe, entre três desenhos apresentados, o que
> resolve o caso dele com o menor buraco.
>
> Zero código. O território desta lane foi `leela-specs/`, e toda afirmação sobre o repositório
> tem caminho e linha.

## O que o dono pediu

**Verbatim**, respondendo à pergunta de como expressar que um lote não carrega o kit da
modalidade:

> "nao, na verdade é na modalidade mesmo! mas pode acontecer de determinado lote nao ter o Kit.
> Como fariamos nesse caso? E precisamos editar as modalidades."

A fala carrega três coisas encaixadas, e vale separá-las antes de especificar qualquer uma.

A primeira é uma **ratificação**. O kit continua vinculado à modalidade, e não ao lote. A
pergunta que a lane anterior devolveu ao dono era se o vínculo deveria mudar de objeto; ele
respondeu que não, e essa é a metade que fecha a decisão **D-2** do diagnóstico
(`.nirvana/handoffs/leela-painel-lacunas-DIAG.md` §D-2). O modelo não muda: `Kit.modalidades[]`
segue sendo o vínculo, e `Lote.modalidade` segue sendo o degrau de preço dentro dela.

A segunda é um **caso que o modelo não cobre**: um lote específico que não deve carregar o kit
da modalidade dele. Isso não é o mesmo que trocar o vínculo — é uma exceção pontual dentro de um
vínculo que fica onde está.

A terceira é um **pedido direto e independente**: *"precisamos editar as modalidades"*. Hoje não
existe caminho nenhum, nem para acrescentar, nem para renomear, nem para remover. A lista nasce
na criação do evento e morre lá.

## As duas decisões

### D-0805-5 · o interruptor mora no lote, e ele liga ou desliga o kit inteiro da modalidade

Três desenhos foram apresentados ao dono, com a limitação de cada um declarada antes da escolha.
Ele escolheu o primeiro:

> **Interruptor no lote.** Cada lote ganha um liga/desliga *"inclui o kit da modalidade"*, ligado
> por padrão. O kit continua vinculado à modalidade; o lote apenas inclui ou não.

**A limitação foi vista e aceita: é tudo ou nada.** Se a modalidade oferece três kits, o lote com
o interruptor desligado não oferece nenhum dos três — não há como escolher qual dos três vale
naquele lote. O dono aceitou isso sabendo, e a spec não vai contrabandear uma seleção por kit
para "melhorar" o desenho: seleção por kit é `Kit.lotes[]`, que era o segundo desenho, e ele foi
recusado por ser mais caro em modelo, em Rules e em tela para um caso que ninguém trouxe.

O que a frase dele **não** decide, e a spec resolve com default declarado: o que a etapa de kit
do checkout faz quando o interruptor está desligado, o que acontece com quem já comprou naquele
lote, e o que a tela do lote mostra quando a modalidade não tem kit nenhum. Detalhe em
`02-spec-modalidade-e-kit.md` §Parte 2. Um pedaço subiu ao painel como **KITLOTE-1**, porque é
juízo de dono e não de engenharia.

### D-0805-6 · a lista de modalidades passa a ser editável, e a integridade referencial é o problema real

*"precisamos editar as modalidades"* é o pedido, e ele é barato de atender no lugar errado. As
Rules **já autorizam** o cliente a alterar `modalidades` enquanto o evento não vendeu
(`firestore.rules:557-560`, `percursosEditaveis`); a trava é de produto, não de servidor. Falta o
campo no contrato de escrita (`packages/api-client/src/eventos/configuracoesEvento.ts:13-15`
exclui `modalidades` por escrito) e falta a seção na tela.

**O risco não é a edição. É que a modalidade é referenciada por nome, em texto.** `Lote.modalidade`
é uma string, `Kit.modalidades[]` é uma lista de strings, e o nome é copiado para dentro de dado
de venda que já aconteceu. Acrescentar é livre; renomear e remover não são a mesma operação e não
podem receber a mesma resposta. A spec decide caso a caso, com a razão de cada um, em
`02-spec-modalidade-e-kit.md` §Parte 1.

O que fica com o dono é a **fronteira temporal** — se editar segue liberado até a primeira venda,
como a Rule já permite, ou se para antes disso, no momento em que o evento é publicado. A spec
adota um default e o sustenta; o item subiu ao painel como **MODAL-1**.

## O que esta rodada não faz

**Não muda o vínculo do kit.** A ratificação do dono fecha o assunto: kit é da modalidade, vale em
todos os lotes dela, e o interruptor do lote é uma exceção declarada, não um vínculo novo.

**Não constrói nada.** Todo o produto desta lane é `leela-specs/`. As duas regras nasceram
seladas e sem código; a fila está em `04-fila-codigo.md`.

**Não mexe no significado de `qtdInscritos`.** A RN-487, selada em 05/08 pela SPEC-METRICAS-SERVICO,
crava que as oito guardas de configuração — inclusive a das modalidades — continuam lendo o total,
e não o contador de pagantes. Esta spec escreve contra o que existe hoje e aponta a interação onde
ela importa, sem antecipar mudança nenhuma naquele campo.
