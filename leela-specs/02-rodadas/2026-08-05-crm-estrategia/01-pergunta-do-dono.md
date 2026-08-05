---
tags: [leela, rodada, crm, estrategia, localizacao, coleta, lgpd, proposta]
trace: leela-pixreal-diag-20260804
lote: SPEC-CRM-ESTRATEGIA
data: 2026-08-05
---

# 01-pergunta · O que mais o CRM pode mostrar, e o que ele pode pedir

> Esta rodada **não decide nada**. Ela é proposta: mede o que a Leela já coleta, propõe o que
> fazer com isso, recusa por escrito o que não vale a pena, e devolve ao painel as escolhas que
> são do dono. Nenhuma RN nasce aqui — regra nasce quando ele ratifica.
>
> Zero código. Território da lane: `leela-specs/`. Toda afirmação sobre o repositório foi medida,
> com o caminho e a linha citados.

## O que o dono perguntou

**Verbatim, 05/08:**

> "Considerando todos os campos que temos também em que incentivamos os usuários a responder,
> com o tempo, quais são outras informações estratégicas que podemos colocar no painel CRM, para
> o organizador do evento? Conseguimos também algo relacionado a localização e endereço?"

## A pergunta tem duas metades, e elas puxam para lados opostos

A primeira metade é **o que mostrar**: dado que já existe, esperando visão. A segunda é **o que
pedir**: campo que ainda não existe, e que custa atrito na única tela onde o dinheiro entra.

Elas puxam para lados opostos porque a resposta fácil da segunda estraga a primeira. Todo produto
de eventos que quis "conhecer melhor o público" fez a mesma coisa: acrescentou campos no checkout.
O resultado é sempre um formulário mais longo, uma taxa de abandono maior e uma base de dados com
colunas que ninguém abre. Esta proposta anda no sentido contrário — **a maior parte do que o
organizador precisa saber já está no banco, e o que falta se pede fora do checkout.**

## O que a varredura encontrou antes de qualquer proposta

Três coisas mudaram o que valia a pena propor, e as três estão medidas na spec.

**O endereço completo já está lá, e o CRM tem uma premissa escrita proibindo usá-lo.** CEP, rua,
bairro, cidade e UF são persistidos em `pedidos/{id}.endereco` desde o checkout novo
(`packages/core/src/pedidos/endereco.ts:39-51`). A premissa **P-CKMOD-1** do épico do CRM diz, com
todas as letras, que endereço nunca entra no doc do cliente e que *"incluir endereço no CRM exige
decisão explícita do Vitor registrada aqui"* (`leela-specs/03-canon/epics/LEELA-E19-crm.md:130`).
A pergunta de hoje é exatamente a decisão que aquela premissa reservou, chegando dezoito dias
depois dela.

**O e-mail de cada participante é pedido, é obrigatório, e é jogado fora.** O checkout exibe um
campo de e-mail por atleta (`StepDados.tsx:451-458`), a validação o exige
(`checkout/validacao.ts:37`), o payload o transporta (`CheckoutFlow.tsx:1273`) — e a Function que
grava o inscrito monta o bloco de dados pessoais com CPF, nascimento, gênero e telefone, **sem
e-mail** (`functions/src/checkout/createInscricaoCharge.ts:1669-1683`). Ninguém decidiu descartar;
o campo simplesmente não existe no modelo, e o núcleo do CRM registra isso como fato consumado:
*"o `[reg]` não tem e-mail"* (`packages/core/src/crm/cliente.ts:13-14`).

**A conversão do painel continua sendo a lição mais cara da casa.** A rodada de ontem mediu que
não existe contagem de visitantes em lugar nenhum, e que os 68,2% e os 42% são literais de maquete
semeados com data no futuro (`functions/scripts/preview-seed-extra.ts:1171, 1282, 1174`;
RN-489/RN-490). Toda visão proposta aqui carrega, por obrigação, a resposta a uma pergunta só: **o
que ela mostra quando não há dado.**

## O que esta rodada entrega

`02-spec-crm-estrategia.md` tem o inventário do que a Leela coleta hoje, dez visões propostas em
ordem de valor sobre custo, a frente de localização por inteiro, as oito coisas que recuso e por
quê, a régua de honestidade aplicada visão a visão, a base legal de cada uma e a escada de coleta
progressiva.

`03-fila-proposta.md` tem a fila de tarefas, **inteira retida** até o painel responder.

## O que sobe para o painel

Quatro itens, e nenhum deles é técnico.

| Item | O que fica com o dono |
|---|---|
| **CRM-1** | quais visões entram na primeira leva |
| **CRM-2** | a localização entra como agregado, e o endereço segue fora da ficha do cliente |
| **CRM-3** | o e-mail que já se pede a cada participante passa a ser guardado |
| **CRM-4** | o que se pede ao participante depois da compra, e com que contrapartida |

## Vizinhos

`02-spec-crm-estrategia.md` tem a proposta e a medição. `03-fila-proposta.md` tem a fila retida.
[[DECISOES-ABERTAS]] tem os quatro vetáveis. Os épicos que receberiam as regras, se o dono
ratificar, são [[LEELA-E19-crm]], [[LEELA-E11-analytics]] e [[LEELA-E12-landing]].
