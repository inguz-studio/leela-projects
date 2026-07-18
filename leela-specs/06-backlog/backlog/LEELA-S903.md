---
id: LEELA-S903
type: story
epic: E09
epic_name: Financeiro do Profissional
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S903 · Últimas transações + export CSV (LGPD 90 dias)
**Como** profissional, **quero** ver e exportar as transações do período, **para** conferir cada pagamento e conciliar fora da plataforma.
## Critérios de aceite
- Dado transações no período, quando abro Financeiro, então vejo as últimas com atleta, modalidade, valor, status e data na tabela densa (§2.5).
- Dado "Ver todas", quando clico, então abro a lista completa paginada com filtros por status e modalidade e contador "mostrando X de Y".
- Dado filtro sem resultado, quando aplico, então EmptyState "Nenhuma transação encontrada com os filtros aplicados".
- Dado o export, quando gero CSV, então recebo colunas de receita/taxa/líquido/repasse, limitado à retenção de 90 dias (RN-144).
## Subtarefas
- [ ] LEELA-S903-T1 — Tabela de transações (densa §2.5) + lista completa paginada com filtros
- [ ] LEELA-S903-T2 — Export CSV do financeiro (retenção 90 dias, LGPD)
## Links
Épico: [[LEELA-E09-financeiro-profissional]]
