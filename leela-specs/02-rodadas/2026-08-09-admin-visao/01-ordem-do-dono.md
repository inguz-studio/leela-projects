---
tags: [leela, decisoes, rodada, admin, plataforma, super-admin, tenants, visao-master]
aliases: ["Visão master do admin 2026-08-09", "SPEC-ADMIN-VISAO"]
trace: leela-admin-visao-20260809
lote: SPEC-ADMIN-VISAO
data: 2026-08-09
fonte: pedido do dono em 2026-08-09, antes de qualquer código da visão master
---

# 01-ordem do dono · a visão master que o painel admin não dá

## O verbatim, sem retoque

> "no painel master nao consigo ter a visao individualizada dos tenants quanto aos eventos deles,
> clubs, clientes, vendas, analise de faturamento gerado, repasses, plano de cobrança, responsável.
> também nao consigo ver todos os eventos no sistema, nem todos os clubs, também preciso ter a visao
> de todos os usuários. temos isso no banco entao acho que nao seria dificuldade em ver isso no
> painel admin"

## A leitura do maestro

A frase pede duas coisas de naturezas diferentes, e separá-las é o que faz a fila de build caber em
lanes.

A primeira é **drill-down por tenant**: abrir uma produtora e ver o negócio dela inteiro numa tela.
São oito itens nomeados — eventos, clubs, clientes, vendas, faturamento gerado, repasses, plano de
cobrança, responsável. Os oito partilham um eixo (`tenantId`) e três deles são dinheiro.

A segunda é **listas globais**: varrer o sistema por tipo, sem passar por tenant. São três — todos
os eventos, todos os clubs, todos os usuários. Elas partilham a característica de **cruzar a
fronteira de isolamento**, que é a propriedade fundacional do produto (RN-400). A terceira delas,
usuários, concentra PII de todo mundo numa tela só.

### A frase que decide o método: "temos isso no banco"

Essa é a parte da ordem que esta lane tratou como **hipótese a conferir**, não como fato herdado. O
dono acredita que o dado já está lá e que a tela é o que falta. A conferência campo a campo está no
[[02-inventario-gap-map]] e o resultado é misto: a maior parte dos onze itens tem dado gravado, um
tem dado parcial que a tela não consegue somar sem varrer coleção inteira, e **dois não existem** —
nem como campo, nem como coleção. Onde não existe, esta rodada não inventa: propõe a adição mínima e
manda ao dono como vetável.

O custo de ter lido "temos no banco" como fato seria uma tela que promete número e entrega vazio, ou
pior, uma tela que inventa o número que falta. As duas são caras de desfazer depois que ele começar
a decidir preço olhando para elas.

### O que a ordem não decide, e esta spec também não

**Ela não decide dinheiro novo.** Faturamento, repasse e margem exibidos aqui reconciliam com o que
já está gravado e canonizado: a RN-182 (líquido do produtor = face − taxa do meio) segue intocada, e
o custo do gateway vem de `platform/config.custoGateway` (RN-455), nunca de constante. Qualquer
número que exigisse semântica nova de dinheiro virou vetável, com a pergunta escrita, em vez de
default silencioso.

**Ela não pede automação de juros.** A correção do dono do mesmo 09/08 é explícita: *"Eu que decido
como cobrarei juros pelo painel admin, manualmente."* A spec respeita isso ao pé da letra — nenhuma
história aqui calcula, sugere ou aplica juros. Onde juros aparece, aparece como número já
configurado por ele, exibido de volta.

**Ela não abre PII por conveniência.** A visão global de usuários é a única das onze frentes que
concentra dado pessoal de todo mundo numa superfície só. Ela nasce com escopo estritamente
`platform_admin` (ADMINSEP: conta separada, `inguzbuilders@gmail.com`), sem export e sem CSV, e cada
abertura de Security Rule que ela exige entra como item de spec com justificativa própria. Nada de
carona: uma rule que abre por causa de eventos não abre clubs de brinde.

### A tensão que a ordem herda, e que já estava mapeada

A decisão **ADMIN-USUARIOS-1**, do mesmo dia, já mandou o cadastro de organizador aparecer no painel
master, com aprovação por código ou liberação direta. Ela e a "visão de todos os usuários" desta
ordem **se tocam e não são a mesma coisa**: uma é fila de trabalho (quem espera liberação), a outra é
diretório (todo mundo que existe). Construir as duas como telas separadas duplica lista de pessoas;
construir como uma só arrisca transformar diretório em painel de ação e vazar mais do que o
necessário. A spec resolve isso explicitamente em [[03-spec]], e a tensão com a RN-510 (o gatilho do
aviso de vitrine) fica registrada onde estava, sem ser reaberta por esta lane.

## O que esta rodada entrega

Docs somente. Zero código, zero mudança em Rules, zero leitura de produção. A fonte da verdade de
tudo que se afirma aqui sobre o sistema é o **código** — `packages/core`, `firestore.rules` e os
callables — com o caminho citado. Onde não deu para medir, está escrito que não deu.

| Arquivo | O que guarda |
|---|---|
| `01-ordem-do-dono.md` | esta página: o verbatim e a leitura |
| [[02-inventario-gap-map]] | item por item: o que a tela já mostra, onde o dado vive, o que falta |
| [[03-spec]] | histórias com job story e aceite Given/When/Then, RNs novas ancoradas no E16 |
| [[04-fila-build]] | ondas com territórios, dependências e dimensionamento por lane |

O épico [[LEELA-E16-plataforma-superadmin]] é atualizado na mesma aterrissagem, e os cards entram no
board no padrão épico → história → tarefa.

## O contrato visual, declarado e não desenhado

As telas novas do admin seguem o REDESIGN-DS em curso: **glass desligado e fundo preto** no painel
admin, por decisão do dono registrada em
`02-rodadas/2026-08-09-redesign-ds/00-decisao.md`. Componentes do DS e shadcn sempre, AA por estado.
Esta spec **declara a dependência** e não desenha pixel: a onda de tela depende do REDESIGN-DS ter
aterrissado o mecanismo de superfície, senão as telas novas nascem com a identidade do painel do
organizador e precisam ser retocadas depois.
