---
id: LEELA-S900
type: story
epic: E09
epic_name: Financeiro do Profissional
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---
# LEELA-S900 · Painel financeiro consolidado
**Como** Organizador de Evento (profissional), **quero** um painel que consolide receita, taxa e repasse previsto de todos os meus eventos por período, **para** acompanhar o resultado sem montar planilha.
## Critérios de aceite
- Dado profissional com eventos publicados, quando abro Financeiro, então vejo três KPIs (receita confirmada, repasse previsto com badge "Aguardando encerramento", ticket médio) do período.
- Dado o seletor de período no header, quando troco de mês, então KPIs, gráficos e transações recarregam.
- Dado profissional sem venda no período, quando abro, então vejo estado vazio em vez de zeros ambíguos.
- Dado falha ao carregar agregados, quando a query erra, então vejo erro com "Tentar novamente" (§2.12).
- Dado o ticket médio, quando exibido, então vale receita confirmada ÷ inscrições pagas (RN-336).
## Subtarefas
- [ ] LEELA-S900-T1 — Rota Financeiro + shell + header com seletor de período
- [ ] LEELA-S900-T2 — KPIs de topo (receita confirmada, repasse previsto, ticket médio)
- [ ] LEELA-S900-T3 — Gráfico de receita por dia (barras) + donut por modalidade
## Links
Épico: [[LEELA-E09-financeiro-profissional]]
