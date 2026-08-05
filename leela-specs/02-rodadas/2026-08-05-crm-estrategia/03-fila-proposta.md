---
tags: [leela, fila, rodada, crm, estrategia, localizacao, coleta, retida]
trace: leela-pixreal-diag-20260804
lote: SPEC-CRM-ESTRATEGIA
data: 2026-08-05
---

# 03-fila · O que seria construído, se o dono aprovar

> **A fila inteira está retida.** Nada aqui é despachável: é proposta esperando ratificação, e a
> ratificação é que transforma cada linha em história com RN própria. Os códigos de tarefa abaixo
> são provisórios e existem para dar endereço à conversa, não para virar identidade de card.
>
> **Nenhuma tarefa desta fila reordena a fila que já corre.** As filas de
> `2026-08-05-metricas-e-servico/04-fila-codigo.md` e `2026-08-04-pos-pagamento/04-fila-codigo.md`
> continuam valendo linha a linha.
>
> A marca ⚔ está onde a tarefa toca dado pessoal novo ou a fronteira de PII do CRM. São quatro das
> quinze, e nenhuma delas sobe sem review antagonista em contexto fresco.

## Frente 0 · os dois consertos que não dependem de visão nenhuma

São baratos, isolados, e valem mesmo que o dono recuse todas as visões. Cada um destrava mais de
uma coisa adiante.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 0a | `COL-T1` | O e-mail que o checkout já pede a cada participante passa a ser gravado no bloco `[reg]`: campo novo em `DadosPessoaisInscrito`, gravação na Function, e a chave de identidade do CRM deixa de cair em `atletaId` quando o CPF falha | `packages/core/src/eventos/dadosPessoais.ts`, `functions/src/checkout/createInscricaoCharge.ts`, `packages/core/src/crm/cliente.ts` | **CRM-3** | opus | ⚔ |
| 0b | `COL-T2` | O código IBGE do município deixa de ser descartado no lookup de CEP: campo opcional no endereço do pedido, preenchido quando o ViaCEP responde, vazio no fallback manual | `apps/landing/.../checkout/cep.ts`, `packages/core/src/pedidos/endereco.ts`, `functions/src/checkout/createInscricaoCharge.ts` | **CRM-2** | sonnet | — |

## Frente 1 · as visões que saem de dado pronto

Ordem interna livre — os territórios não colidem. Todas entram como bloco da Visão geral, sem rota
nova (RN-823).

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1a | `V1-T1` | Agregado de canal por evento: soma cupom, afiliado e direto a partir do que o webhook já grava, com a comissão de cada canal ao lado | `functions/src/checkout` (agregado), `packages/core` | **CRM-1** | opus | — |
| 1b | `V1-T2` | Bloco "de onde veio a venda" na Visão geral, com o estado honesto de evento sem canal nenhum | `apps/painel/src/routes/crm/visao-geral` | 1a | sonnet | — |
| 1c | `V3-T1` | Presença: derivação de quem pagou e não fez check-in, e de kit não retirado, **com a guarda de só existir para evento com ao menos um check-in registrado** | `packages/core` (derivação pura), `apps/painel/.../visao-geral` | **CRM-1** | opus | — |
| 1d | `V4-T1` | Bloco de meio de pagamento e parcelamento, lendo `pagamento.forma` e `cartao.parcelas` | `functions/src` (agregado), `apps/painel/.../visao-geral` | **CRM-1** | sonnet | — |

## Frente 2 · a localização

A ordem interna é rígida: o agregado antes da tela, e o endereço do evento antes de qualquer
conversa sobre distância.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 2a | `V2-T1` | Agregado de localização por evento no molde de `demografia/current`: contagens por UF, por cidade e por bairro, escrita exclusiva de Function, Rules negando escrita de cliente, **supressão k=5 aplicada na leitura** | `functions/src/analytics`, `packages/core/src/analytics`, `firestore.rules` | **CRM-2** | opus | ⚔ |
| 2b | `V2-T2` | Bloco de distribuição geográfica na Visão geral, com o rótulo dizendo **compradores** e a nota de cobertura declarando quantos pedidos têm endereço | `apps/painel/src/routes/crm/visao-geral` | 2a | sonnet | — |
| 2c | `V2-T3` | Derivação de cidade e UF do pedido para o `[reg]` quando o participante é o próprio comprador, com o campo marcado como derivado e a cobertura declarada na tela | `functions/src/checkout`, `packages/core/src/eventos/dadosPessoais.ts` | **CRM-4** · 0b | opus | ⚔ |
| 2d | `V2-T4` | Concentração acumulada do organizador, atravessando os eventos dele, para responder onde fazer a próxima edição | `functions/src/analytics`, `apps/painel/.../visao-geral` | 2a | opus | — |
| 2e | `LOC-T1` | **Endereço estruturado do evento**: o mesmo bloco do checkout, com o mesmo lookup de CEP, na configuração do evento; `local` em texto livre continua existindo e passa a ser complemento | `packages/core/src/eventos/evento.ts`, `apps/painel/src/routes/eventos/configuracoes`, `apps/landing` | — | opus | — |

**Sem tarefa, de propósito:** a distância entre participante e evento (L7). Ela depende de `LOC-T1`
e de geocodificação nas duas pontas, o dono não a pediu por nome, e o valor que ela acrescenta
sobre a concentração por bairro é pequeno perto do custo. Fica escrita para que a primeira vez que
alguém pedir não vire improviso — mesmo molde da RN-458 e da RN-490.

## Frente 3 · as visões que precisam de agregado novo

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 3a | `V5-T1` | Novos e recorrentes por evento: projeção do que `agregarClientes` já computa, **sem atravessar tenant** | `functions/src/crm/agregarClientes.ts`, `packages/core/src/crm` | **CRM-1** | opus | ⚔ |
| 3b | `V6-T1` | Agregado do funil por evento — carrinho aberto, pedido criado, cobrança gerada, pago — lendo `carrinhos` e os status de pedido | `functions/src/checkout`, `packages/core` | **CRM-1** | opus | — |
| 3c | `V6-T2` | Bloco "onde a compra parou", com o nome que **não** contém a palavra conversão, e só os degraus que existem | `apps/painel/src/routes/crm/visao-geral` | 3b | sonnet | — |
| 3d | `V8-T1` | Motivo estruturado de estorno e cancelamento: lista curta com "outro, descreva" preservando o texto livre; o campo nasce vazio e a tela declara a cobertura | `packages/core/src/eventos/politicaVendas.ts`, `functions/src/checkout/estornarInscricao.ts`, `functions/src/finance/cancelarInscricao.ts`, `apps/painel` | **CRM-1** | opus | — |

## Frente 4 · o que espera outra coisa, e não este painel

| # | Task | O que faz | Espera |
|---|---|---|---|
| 4a | `V7-T1` | Ritmo de venda com comparação entre edições | o rollup `S821-T1` do E11 — gargalo declarado do épico |
| 4b | `V9-T1` | Interesses da base no CRM | ARENA-1 pela terceira opção, mais ARENA-2 e a revisão jurídica do LGPD-1 |
| 4c | `V10-T1` | Satisfação depois do evento | o hub de comunicação `S1901-T4`, travado na chave do Brevo |

## Critério de aceite por frente

**Frente 0.** Uma compra com três participantes grava três e-mails distintos, e a chave do CRM
daquele participante deixa de ser `atleta` quando o CPF falta. Falsificação direta: apagar o campo
novo e reler tem de fazer a chave voltar para `atleta`. Para o `ibge`: CEP válido grava o código,
fallback manual grava vazio, e **nenhuma contagem por cidade quebra quando ele falta** — o texto
continua sendo o caminho de reserva.

**Frente 1.** Um evento sem cupom e sem afiliado mostra cem por cento direto. Um evento sem
nenhum check-in **não renderiza** o bloco de presença — este é o aceite que não pode faltar, porque
sem ele a visão diz "cem por cento de ausência" para quem simplesmente não escaneou.

**Frente 2.** Uma cidade com quatro compradores **não aparece nominalmente**, e entra em "outras";
com cinco, aparece. Bairro não aparece em cidade sem volume. Cruzar geografia com faixa etária ou
sexo **não é possível pela API do agregado** — não é ausência de tela, é ausência de campo.
Falsificação: um teste tenta montar o cruzamento a partir dos dois agregados e prova que os dados
não se juntam por chave nenhuma. O rótulo diz "compradores" e a nota declara a cobertura.

**Frente 3.** A recorrência de um participante que comprou de dois organizadores aparece como "um
evento" em cada painel, nunca como dois — teste de ataque provando que o docId de um tenant não
casa com o do outro. O funil de um evento sem carrinho aberto mostra os degraus que existem. O
motivo estruturado nasce vazio para todo estorno anterior, e a tela diz "sem motivo registrado".

**Todas.** Nenhuma visão lê `crmClientes`, e o gate `FronteiraPII.test.ts` passa a cobrir os
arquivos novos da Visão geral — ele reprova por adição, então crescer o gate é parte da entrega,
não follow-up.

## O que depende de decisão do dono

Toda a fila. Em detalhe:

- **CRM-1** trava a Frente 1 inteira e as tarefas 3a, 3b e 3d.
- **CRM-2** trava a Frente 2 e a tarefa 0b.
- **CRM-3** trava a tarefa 0a.
- **CRM-4** trava a tarefa 2c e os degraus 2 a 4 da escada de coleta.

`LOC-T1`, o endereço estruturado do evento, é a **única** tarefa que não espera nenhum dos quatro.
Ela vale por si — mapa na página pública, endereço certo no e-mail e no ingresso, busca por
proximidade na vitrine — e é pré-requisito de qualquer conversa futura sobre distância. Se o dono
recusar a frente inteira de localização, ela continua fazendo sentido sozinha.

## Ordem executável, se tudo for aprovado

Frente 0 primeiro e inteira, em paralelo: ela é barata e melhora o dado que todas as outras leem.
Depois 2a e 1a em paralelo, e a partir de cada uma a tela correspondente. `LOC-T1` corre em
paralelo com tudo, porque o território é a configuração do evento e não encosta no CRM. A Frente 3
entra por último entre as construíveis, porque 3a mexe na Function do CRM, que é o agregado mais
sensível da área. A Frente 4 não entra nesta conversa.

## Vizinhos

`01-pergunta-do-dono.md` tem o verbatim. `02-spec-crm-estrategia.md` tem o inventário, as visões
com o custo de cada uma, a frente de localização por inteiro, as recusas e a escada de coleta.
[[DECISOES-ABERTAS]] tem os quatro vetáveis.
