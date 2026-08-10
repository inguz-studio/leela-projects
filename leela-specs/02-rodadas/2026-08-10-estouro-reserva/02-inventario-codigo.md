---
tags: [leela, inventario, rodada, estouro, reserva, checkout, pix, cron, medicao]
trace: leela-estouro-reserva-20260810
lote: SPEC-ESTOURO-RESERVA
data: 2026-08-10
---

# 02-inventário de código · o que o sistema faz hoje, linha a linha

> Toda linha citada foi lida nesta lane, em 10/08, contra o HEAD do repositório. Nada aqui é
> herdado de memória de rodada anterior sem reconferência.

## 1 · Hoje, pendente NÃO segura vaga — e é exatamente isso que a decisão muda

A "venda" que consome vaga é o inscrito **confirmado** (ou estornado). A fonte da contagem está
declarada no cabeçalho do `virarLote`: *"uma venda é um INSCRITO que JÁ FOI CONFIRMADO pelo
webhook de pagamento"* (`functions/src/eventos/virarLote.ts:12-17`), e o contrato é executável:
`STATUS_QUE_CONTAM_VENDA = ['confirmado', 'estornado']` (`virarLote.ts:67`). O inscrito nasce
`'pendente'` na criação do pedido (`functions/src/checkout/createInscricaoCharge.ts:1709`) e não
conta para lote nenhum até o webhook virar.

O esgotamento que a cotação e a cobrança enxergam deriva de `vendidos`:
`loteEsgotado = vendidos >= quantidadeLimite` (`packages/core/src/eventos/lote.ts:218-220`),
consumido por `loteAtivo`/`precoVigente` dentro do `computeSaleState`. Consequência medida (é a
RN-498, canônica em [[LEELA-E04-config-vendas]]): duas cobranças PIX em voo pela mesma última
vaga passam as duas, as duas pagam, e `vendidos` estoura o limite sem teto — o ratchet
`vendidos = max(atual, tally)` não conhece `quantidadeLimite` (`virarLote.ts:215`).

`vendidos` é campo de escrita exclusiva de Function: o create exige 0/ausente e o update de
cliente não pode tocá-lo (`firestore.rules:1109-1117`). O campo novo de reserva tem de entrar no
MESMO regime.

## 2 · As duas janelas que existem, e o vão entre elas

| Janela | Duração | Fonte única | Quem executa o fim |
|---|---|---|---|
| Carrinho (RN-158) | 15 min da abertura | `CARRINHO_PRAZO_SEGUNDOS` (`packages/core/src/checkout/carrinho.ts:51`) | gate transacional na conclusão + cron `expirarCarrinhosAbandonados` a cada 5 min (`functions/src/checkout/expirarCarrinhosAbandonados.ts:147-153`) |
| PIX (RN-157) | 30 min da criação do pedido | `PIX_EXPIRACAO_SEGUNDOS` (`packages/core/src/pedidos/pagamento.ts:85`) | **ninguém, automaticamente** — ver §3 |

A composição é sequencial e está canônica na RN-158: `abertura ──15 min──▶ conclusão ──30 min──▶
fim do PIX` ([[LEELA-E12-landing]], seção RN-158). O carrinho termina quando a cobrança nasce
(`concluirCarrinhoNaTx` na mesma tx do pedido, `createInscricaoCharge.ts:1930-1935`); a reserva
que a decisão pede vive **depois** disso, da cobrança até pagar ou vencer. O carimbo
`pixExpiraEm` nasce na criação, do relógio injetado da plataforma
(`createInscricaoCharge.ts:1876-1882`).

## 3 · `expirarPixPendente` é onCall, exige o dono do pedido, e nunca roda sozinho

- **Porta:** `https.onCall` com auth obrigatória (`functions/src/checkout/expirarPixPendente.ts:263-276`).
- **Ownership:** só o dono do pedido (`responsavel.atletaId === caller.uid`,
  `expirarPixPendente.ts:123-128`). Um chamador de sistema não existe hoje — a varredura vai
  precisar dele, sem afrouxar a porta pública.
- **Anti-abuso de relógio:** o servidor decide com o próprio relógio; antes da hora é
  `failed-precondition` (`expirarPixPendente.ts:165-171`).
- **Gateway-primeiro + fail-safe:** cancela a cobrança NO GATEWAY antes de flipar os docs
  (`:173-201`); se o gateway não confirmar, o pedido segue vivo e a chamada devolve
  `failed-precondition` com motivo tipado (`:186-199`, `MOTIVO_CANCELAMENTO_GATEWAY_FALHOU`).
  Cobrança já paga não é cancelável ⇒ pedido pago nunca morre por timer (corolário `:32-34`).
- **Flip transacional com releitura:** só flipa se pedido E pagamento seguem `'pendente'`;
  webhook em corrida vence (`:206-247`). Resposta idempotente quando já final (`:131-134`,
  `:151-154`).
- **Inscritos permanecem `'pendente'`** no flip — mesmo tratamento do caminho `'falhou'` do
  webhook (`:243-244`). Nova tentativa é NOVA cotação + novo pedido.

O core já é reusado por um segundo consumidor: `encerrarPixAnteriorNaCriacao` na trava do PIX
(`functions/src/checkout/travaCobrancaPix.ts:66-74` e o import em `:90`) — precedente exato de
"reusar a máquina em vez de criar uma segunda".

## 4 · O que o "webhook de expiração" do Asaas faz hoje — e por que ele não substitui a varredura

O evento existe e tem efeito mapeado: `PAYMENT_OVERDUE → 'failed'`
(`functions/src/payments/asaasProvider.ts:560`; status `OVERDUE → 'failed'` em `:539`). No core,
`'failed'` flipa pagamento e pedido para `'falhou'` numa transação com guarda de transição única,
inscritos seguem `'pendente'`, receita intocada
(`functions/src/checkout/webhookPagamento.ts:361-368`; guarda `:321-323`).

O que ele **não** faz: chegar em 30 minutos. O `dueDate` da cobrança no Asaas tem granularidade
de **DIA** (default +1 dia — `asaasProvider.ts:341-342`, `:786`, `:1047-1050`), e a premissa está
documentada no próprio adapter: *"POST /payments do Asaas não aceita expiração por minuto
(dueDate é DIA); o enforcement fino dos 30 minutos é da PLATAFORMA"* (`asaasProvider.ts:966-968`).
Ou seja: o OVERDUE é uma porta real de expiração, mas com ~1 dia de atraso sobre a semântica da
RN-157 — sob a reserva, seria 1 dia de vaga presa por pedido abandonado. A varredura é da
plataforma, e o webhook vira a **terceira porta** do mesmo estado (idempotência em §6 da spec).

Nota de assimetria que a spec preserva: o caminho `'failed'` do webhook **não cancela nada no
gateway** (a cobrança já morreu lá — é o gateway avisando), enquanto varredura e onCall cancelam
gateway-primeiro (a plataforma decidiu antes do gateway). São dois motivos terminais distintos
(`'falhou'` × `'cancelado'/pix_expirado`) e continuam distintos.

## 5 · A trava da segunda cobrança PIX viva NÃO fecha a corrida entre compradores

A sentinela `cobrancasPixAtivas/{uid}__{eventoId}__{hash}` serializa duas requisições do MESMO
comprador com o MESMO carrinho (`travaCobrancaPix.ts:14-31`), de propósito com escopo por
carrinho (`:33-42`). Dois compradores distintos disputando a última vaga não passam por nenhum
documento em comum — a corrida do ESTOURO-1 continua aberta e é a que a reserva fecha. A trava é
lida na mesma tx que cria o pedido (`createInscricaoCharge.ts:1371-1416`).

## 6 · Onde a reserva entra: a transação de criação já lê e escreve tudo que ela precisa

`criarDocsDeCheckout` roda uma transação única (`createInscricaoCharge.ts:1367`) que já:
relê o pedido para replay idempotente (`:1368-1369`), lê a trava PIX (`:1382-1416`), lê o
carrinho e aplica o gate de prazo (`:1418-1429`), cria inscritos `'pendente'` (`:1709`), cria o
pedido com `itens[].loteId` por linha (`:1341-1354`, `:1816`), cria o pagamento com valor
congelado e `pixExpiraEm` (`:1831-1912`), grava a sentinela (`:1917-1924`) e conclui o carrinho
(`:1930-1935`). O gate de capacidade e o incremento de reserva entram NESTA transação — nenhuma
segunda janela nasce entre checar e gravar.

Na confirmação/falha, o `webhookPagamento` já opera transação com releitura e transição única
(`webhookPagamento.ts:321-368`) — é onde a liberação da reserva entra no caminho do dinheiro.

## 7 · Precedentes de agendamento, e a lição da REV da Onda 1 (10/08)

| Cron | Expressão | Timezone | Fonte |
|---|---|---|---|
| `expirarCarrinhosAbandonados` | `every 5 minutes` | America/Sao_Paulo | `expirarCarrinhosAbandonados.ts:147-153` |
| `varrerEstornosOrfaos` | `every 15 minutes` + `runWith(secrets)` | America/Sao_Paulo | `functions/src/checkout/estornarPagamentoOrfao.ts:572-578` |
| `recalcularStatusMembros` | `every day 03:00` | America/Sao_Paulo | `functions/src/clubs/recalcularStatusMembros.ts:21-24` |
| `coletaDiaria` | `every day 03:05` | America/Sao_Paulo | `functions/src/analytics/coletaDiaria.ts:222-225` |
| `encerrarEventos` | `10 3 * * *` | FUSO_EVENTO | `functions/src/eventos/encerrarEventos.ts:154-157` |
| `expurgarSaude` | `every day 03:20` | America/Sao_Paulo | `functions/src/eventos/expurgarSaude.ts:147-150` |
| `recomputePlatformRollups` | `15 * * * *` (minuto explícito) | America/Sao_Paulo | `functions/src/platform/rollups.ts:189-193` |

A lição, paga hoje pela REV da Onda 1 do admin-visão: `every 1 hours` **não fixa minuto nenhum** —
o Scheduler escolhe o horário-base e o cron pode aterrissar dentro do bloco noturno 03:00-03:20.
O conserto foi cron explícito com minuto fixo, e virou teste que falsifica o agendamento
(`functions/src/__tests__/adminVisaoOnda1Agendamento.test.ts:2-8`). A varredura desta spec nasce
já nesse padrão (expressão cron explícita + timezone + teste de agendamento — [[03-spec]] §RN-545).

`varrerEstornosOrfaos` é o precedente completo para a nossa varredura: cron de checkout que fala
com o gateway, com `runWith({secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN']})` — a mesma
dupla de secrets que o `expirarPixPendente` já declara (`expirarPixPendente.ts:263-265`). Sem o
binding, a lição registrada no `asaasWebhook` (classe `QR_TOKEN_KEYS`,
`functions/src/checkout/webhookAsaas.ts:190-202`) morde de novo: o Emulator passa e a produção
falha em silêncio.

## 8 · O que NÃO existe hoje, medido

- **Nenhum agendamento de expiração de PIX.** Varredura por `schedule(` em `functions/src`
  devolve os sete crons da tabela acima e nenhum toca `pagamentos`/`pixExpiraEm`.
- **Nenhum índice composto em `pagamentos`.** `firestore.indexes.json` não tem entrada para a
  coleção (grep por `"pagamentos"` = zero). A query da varredura
  (`status == 'pendente'` + `pixExpiraEm <= agora`) exige **um índice composto novo**, declarado
  na fila com justificativa — é o primeiro desvio do "zero índice novo" das rodadas vizinhas e
  está nomeado de propósito.
- **Nenhum campo de reserva no lote.** `parseLote` normaliza `vendidos` (ausente = 0,
  `lote.ts:344`, `:370-373`, `:402`) e nada mais de contagem. O campo novo (`reservas`) precisa
  de parse próprio com a mesma leitura Postel.
- **Nenhum estado de tela para "última vaga reservada".** A cotação devolve erro de venda via
  `invalid-argument` genérico (`cotarInscricaoCheckout.ts:287-292`); "esgotado" e "reservado"
  seriam hoje a mesma mensagem.

## 9 · Vizinhas conferidas, sem mudança

- **RN-497** (congelamento pós-venda = preço, ordem, modalidade) — sem interseção; a reserva não
  edita lote.
- **RN-487** (`qtdInscritos` congela configuração e conta qualquer status) — segue outro
  contador; a reserva não o toca.
- **RN-486** (contagem de pagante nas telas) — sem interseção.
- **RN-182** (líquido do produtor) — intocada; nenhuma linha desta spec toca dinheiro.
- **Janela residual CK2-4b** (pagamento em voo aceito durante o cancelamento) — já tem dono: o
  ramo retardatário registra e dispara estorno órfão (`webhookPagamento.ts:324-356`), com
  varredura própria de 15 min. A reserva não muda essa máquina.
