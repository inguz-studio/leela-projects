---
id: LEELA-S202
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S202 · Overview do evento (shell + dashboard)
**Como** Organizador de Evento, **quero** ver o dashboard de visão geral do evento, **para** entender vendas, inscritos e operação de relance.

## Critérios de aceite
- Dado um evento, quando abro o Overview, então vejo header 96px (§2.1) e sub-nav do evento (§2.14) com a aba ativa marcada.
- Dado o Overview, quando carrega, então vejo KPIs de venda/inscrição, alertas operacionais inline e atividade recente.
- Dado a sub-nav, quando clico numa aba, então navego para a rota correspondente (inscritos, kits, financeiro).

## Subtarefas
- [ ] LEELA-S202-T1 — Layout do evento (header 96px §2.1 + sub-nav §2.14) reutilizável
- [ ] LEELA-S202-T2 — Dashboard Overview (KPIs, alertas operacionais, atividade recente)

## Links
Épico: [[LEELA-E03-operacao-evento]]
