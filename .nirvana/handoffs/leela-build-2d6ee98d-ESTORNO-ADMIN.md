# Handoff · Lane ESTORNO-ADMIN · trace leela-build-2d6ee98d

Employee `sf-backend-lead` (software-forge). Emulator exclusivo via
`emulators:exec` (8080/9099/5001) — preview do Vitor (5273/8180/3000) intocado.
Nenhum navegador, nenhuma rede real, sem push. **Retomada 2 em curso
(2026-07-27 ~23h)** — placar abaixo verificado em disco contra `git log`.

## Placar

| Task | Commit | Estado |
|---|---|---|
| T1 · refund assíncrono + autoridade do webhook | `1201044` | FEITO |
| T2 · política dos 7 dias (taxa) | `5b02fd9` | FEITO |
| T1/T2 · specs na faixa RN-370–374 | `8ac2730` | FEITO |
| T3 · rota automática via requestRefund | `20e0075` | FEITO |
| T4 · backend da porta cross-tenant (functions/rules/core roles + testes) | `c209ff1` | FEITO |
| T4-frontend · fila admin no painel da plataforma | `e67edd6` | FEITO |
| T5 · item 27 (retardatário) | `867f7dc` | FEITO |
| T6 · specs/RNs/boards | `2a39a7e` | FEITO |

**LANE COMPLETA (retomada 2, 2026-07-28 ~00h40). SEM push — o maestro pusha
na aterrissagem. Próximo da fila: ⚔ ESTORNO-REV (review antagonista
obrigatória).** RN-370..380 documentadas em
`leela-specs/02-rodadas/2026-07-28-estorno-admin/02-rns-delta.md` e
consolidadas em E09 (dono) / E04 / E12; boards atualizados (kanban card
ESTORNO-ADMIN, checklist S904-T6..T11, board de épicos).

## T5 — o que entrou (`867f7dc`)

- `functions/src/checkout/estornarPagamentoOrfao.ts` — `estornarPagamentoOrfaoCore`
  (refund TOTAL, ledger próprio `pagamentos/{id}/estornosOrfaos/total`, mesma
  máquina de carimbo do T1), `confirmarEstornoOrfaoPorWebhook` (autoridade
  RN-372), extrato `estornosOrfaosPendentes/{pagamentoId}` (RN-380, mesma tx
  da entrega) e cron `varrerEstornosOrfaos` (15 min: conta, alerta, re-dispara).
- `webhookPagamento.ts` — ramo estado-final detecta `cancelado`+`confirmed` ⇒
  efeito `retardatario_pos_cancelamento` + extrato + dispatch pós-tx;
  fechamento órfão encadeado quando o T1 devolve `sem_carimbo_vivo`.
- Testes: `estornoOrfao.integration.test.ts` (5, espião que conta POSTs);
  pixArbitragem `.integration`/`.ataque` atualizados ao contrato novo
  (asserções MAIS fortes: dinheiro volta exatamente uma vez).

Gates T5: functions tsc 0 · eslint 0 · emulador: estornoOrfao 5/5 +
estornoAssincrono 21 + estornoLedger 15 + estornarInscricao 14+u.i.+e2e 10/10
(com auth 9099) + estornoAdmin 17 + requestRefund + webhookAsaas +
devolucaoEstorno + checkoutFoundation + pixArbitragem 44/44 — exit 0.

## T4-frontend — o que entrou (`e67edd6`)

Inventário aprovou TODO o diff interrompido (215 linhas + `plataforma/estornos/`
com rota, view, hooks `_data` e teste). Três lacunas fechadas por cima:

- **Bug real no caminho parseado:** `parseReembolso` coagia `origem` para
  `'organizador'` e descartava `overrideCorte` — a coluna "aberto por"
  mentiria em produção. Core ganhou `origem: 'plataforma'` + campos do furo
  (RN-376) no tipo `Reembolso`; parser preserva; `parseReembolso` exportado
  como prova executável e testado com o doc que o requestRefund grava.
- Ícone `estornos: Undo2` no `PLATFORM_NAV_ICONS` + tabela do teste do
  sidebar (7→8 itens).
- `ReembolsosView` (organizador) rotula `origem: 'plataforma'` como
  "Plataforma".

Gates T4: core/api-client tsup 0 · painel tsc 0 · eslint painel/core/api-client
0 · vitest estornosAdmin (8) + sidebar (34) + ReembolsosView (4) verdes ·
functions `tsc` 0 (core tocado).

## T1 — o que entrou

`1201044 feat(estorno): o ledger carimba o envio e o webhook fecha a saga`

- `functions/src/checkout/estornarInscricao.ts` — máquina de estados DURÁVEL do
  ledger de estorno: `pendente → enviando → solicitado → aprovado`, mais os
  ramos de bloqueio `gateway_sem_resposta`, `divergencia_valor`,
  `rejeitado_gateway`. Carimbo compare-and-set ANTES do POST; nenhum segundo
  POST sobre carimbo vivo. Novo `confirmarEstornoPorWebhook`.
- `functions/src/checkout/webhookPagamento.ts` — o ramo `refunded` subiu para
  ANTES da guarda de estado final (era ali que ele virava
  `ignorado_estado_final`) e agora fecha o ledger fora da transação da entrega.
- `functions/src/finance/requestRefund.ts` — `executarEstorno` entende
  `aguardandoConfirmacao` (não mente "estornado"); novo
  `fecharReembolsoPorEstorno` chamado pelo webhook.
- `functions/src/payments/mockProvider.ts` — modo `refundStatus: 'pending'`,
  `MockRefundRecusadoError`, bloco de estorno na entrega.
- `functions/src/payments/asaasProvider.ts` — `extrairRefundDaEntrega`
  (`payment.refunds[]`, DONE mais recente) atravessando até o core.
- `packages/core/src/payments/PaymentProvider.ts` — `WebhookRefundInfo` +
  `WebhookResult.refund?` (opcional: zero mudança no fluxo de confirmação).
- Testes: `estornoLedger.test.ts` (15, puros) e
  `estornoAssincrono.integration.test.ts` (13, emulador, gateway espião que
  CONTA os POSTs e não deduplica).

RNs: **RN-370** carimbo antes do POST · **RN-371** nunca re-enviar sobre
carimbo vivo · **RN-372** o webhook `PAYMENT_REFUNDED` é a autoridade.

## Pendências herdadas

- Provas de sandbox real (INV-CANCEL-ESTORNO §8 itens 1/2/5): status real do
  refund de PIX, refund parcial em cobrança de grupo, payload do
  `PAYMENT_REFUNDED`. Ficam no pacote pré-go-live.
- E-1 do ASAASTETO-REV (teto do cliente × servidor) segue aberto — fora desta
  lane.
