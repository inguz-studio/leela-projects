---
id: LEELA-S904
type: story
epic: E09
epic_name: Financeiro do Profissional
onda: "—"
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 4
tags: [leela, story]
---
# LEELA-S904 · Máquina de estados de reembolso/cancelamento + execução de estorno + notificações
**Como** Organizador de Evento (profissional), **quero** uma máquina de estados que processe solicitações de reembolso e cancelamento, execute o estorno e notifique as partes, **para** resolver pós-venda com regra clara, rastro auditável e sem risco financeiro no split de afiliação.

## Critérios de aceite
- Dado uma solicitação, quando entra, então percorre a máquina `solicitado → (aprovado_auto | em_analise) → aprovado|recusado → estornado`, com cada transição registrada em `transicoes[]` para auditoria (RN-341).
- Dado a decisão de estorno, quando executada, então reusa RN-337 (reverte a inscrição para `cancelado` conforme RN-204 e reverte o split de afiliação) via `PaymentProvider.refund` (ADR-006).
- Dado a abertura de uma solicitação, quando `estado=solicitado`, então o organizador é notificado imediatamente (obrigatório); a cada transição, o atleta é notificado (RN-342).
- Dado que o pedido é em grupo (ver [[ADR-pedido-em-grupo]]), quando um reembolso ou cancelamento é processado, então incide por inscrito dentro do pedido, não sobre o pedido inteiro.
- Dado a comissão do afiliado ainda em estado `previsto`, quando ocorre o estorno, então a reversão apenas desfaz o agregado a receber (RN-337).
- Dado a comissão do afiliado já repassada/paga (estado `repasseDisponivel` ou pago), quando ocorre o estorno, então **não** se escreve saldo negativo direto: gera-se um lançamento de débito (clawback) em `profissionais/{id}/saldo`, com registro auditável, a ser compensado em repasses futuros do afiliado (RN-346).
- Dado um afiliado com clawback pendente, quando o próximo repasse é calculado, então o débito é compensado antes da liberação e o repasse fica bloqueado até quitar o saldo devedor (RN-346).
- Dado a transferência de titularidade/ingresso, quando o kit ainda não foi entregue, então recoleta o tamanho do novo titular; o chip só é vinculado na entrega (RN-203), sem impacto retroativo; se o kit já foi entregue, a transferência é bloqueada (RN-345).
- Dado escrita de estado ou financeiro, quando ocorre, então só acontece por Cloud Function (nunca pelo cliente).

## Subtarefas
- [ ] LEELA-S904-T1 — Subcoleção `eventos/{id}/reembolsos/{reembolsoId}` (`inscritoId`, `motivo`, `estado`, `origem`, `valorSolicitado`, `valorEstornado?`, `decididoPor?`, `transicoes[]`, `criadoEm`) + máquina de estados por inscrito + fila de análise do organizador
- [ ] LEELA-S904-T2 — Execução de estorno via Function (reusa RN-337) + ramificação do split por estado do afiliado: `previsto` reverte agregado; `disponivel`/pago gera clawback auditável em `profissionais/{id}/saldo` sem saldo negativo (RN-346)
- [ ] LEELA-S904-T3 — Notificações: organizador na abertura (obrigatório) e atleta em cada transição (RN-342)
- [ ] LEELA-S904-T4 — Subcoleção `eventos/{id}/transferencias/{transferenciaId}` (titularidade/ingresso, por inscrito) + `titularHistorico[]` append-only + regras de kit/chip (RN-345)

## Links
Épico: [[LEELA-E09-financeiro-profissional]]
