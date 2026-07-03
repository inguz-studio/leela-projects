---
id: LEELA-S701
type: story
epic: E08
epic_name: Painel do Influenciador
onda: 2
surface: painel
moscow: Could
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S701 · Hub do influenciador
**Como** promotor, **quero** um hub com meus números e atividade recente, **para** entender de relance quanto estou gerando e o que exige ação.
## Critérios de aceite
- Dado promotor autenticado com afiliações ativas, quando abro o hub, então vejo KPIs (conversões 30d, valor a receber, afiliações ativas, cliques 30d) de agregados de Function.
- Dado promotor sem afiliação, quando abro, então vejo EmptyState com CTA para "Eventos disponíveis para divulgar".
- Dado agregados em atualização, quando carrego, então os KPIs mostram skeleton (nunca spinner solto).
## Subtarefas
- [ ] LEELA-S701-T1 — Rota + shell + hub de KPIs do promotor
## Links
Épico: [[LEELA-E08-influenciador]]
