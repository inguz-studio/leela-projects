---
id: LEELA-S302
type: story
epic: E04
epic_name: Configuração e Vendas do Evento
onda: 2
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S302 · Financeiro do evento com repasses de afiliados
**Como** Organizador de Evento, **quero** ver o financeiro detalhado com repasses de afiliados, **para** controlar margem e pagamentos.

## Critérios de aceite
- Dado o financeiro, quando abro, então vejo receita bruta, taxa Leela, receita líquida e breakdown por modalidade/lote (herda S207).
- Dado repasses, quando existem, então vejo por afiliado o valor a receber, o status e a data de liberação (referencia `programaAfiliacao`).
- Dado o payout, quando consulto, então o valor vem de `PaymentProvider.getPayout`, nunca ad-hoc no cliente.
- Dado os dados, quando exporto, então baixo um CSV com receita e repasses.

## Subtarefas
- [ ] LEELA-S302-T1 — Tela Financeiro com repasses de afiliados (estende S207)
- [ ] LEELA-S302-T2 — Function de agregado de repasse + payout via `PaymentProvider.getPayout`

## Links
Épico: [[LEELA-E04-config-vendas]]
