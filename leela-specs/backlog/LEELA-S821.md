---
id: LEELA-S821
type: story
epic: E11
epic_name: Analytics do Profissional
onda: "—"
surface: painel
moscow: Could
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S821 · Dashboard analítico consolidado
**Como** profissional, **quero** um dashboard que cruza eventos e clubes com seletor de período, **para** ter visão única do meu negócio sem montar planilha.
## Critérios de aceite
- Dado profissional com eventos e clubes, quando abro Analytics, então vejo KPIs consolidados (GMV, % via parcerias, inscritos, membros ativos) do snapshot de rollup.
- Dado o seletor de período (mês / 30d), quando troco, então os KPIs e séries recarregam do snapshot correspondente.
- Dado profissional sem dados no período, quando abro, então EmptyState "Sem dados para o período selecionado"; enquanto carrega, skeleton.
## Subtarefas
- [ ] LEELA-S821-T1 — Function de rollup de analytics (cron + onWrite) + nota de export BigQuery
- [ ] LEELA-S821-T2 — Tela do dashboard consolidado + seletor de período
## Links
Épico: [[LEELA-E11-analytics]]
