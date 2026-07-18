---
id: LEELA-S823
type: story
epic: E11
epic_name: Analytics do Profissional
onda: "—"
surface: painel
moscow: Could
status: backlog
v1: false
tasks_total: 1
tags: [leela, story]
---
# LEELA-S823 · Comunidade e retenção
**Como** profissional, **quero** ver novos atletas por clube/mês, churn de clube e retenção 60 dias, **para** entender a saúde da comunidade ao longo do tempo.
## Critérios de aceite
- Dado membros com status derivado (RN-102), quando abro a seção, então vejo novos atletas por clube/mês (via código de convite) em série temporal.
- Dado o histórico mensal, quando listo, então vejo churn de clube mês a mês e retenção 60 dias.
- Dado clube novo sem histórico, quando abro, então EmptyState + nota "dados insuficientes para o período".
## Subtarefas
- [ ] LEELA-S823-T1 — Seção de novos atletas, churn e retenção 60d
## Links
Épico: [[LEELA-E11-analytics]]
