---
id: LEELA-S108
type: story
epic: E05
epic_name: Módulo Clubs
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S108 · Listar comunicados
**Como** Coordenador de Assessoria, **quero** ver todos os comunicados (enviados, agendados, rascunhos) com métricas, **para** acompanhar minha comunicação com a base e gerenciar disparos.

## Critérios de aceite
- Topo carrega → 4 KPIs (comunicados do mês, taxa de abertura, alcance acumulado, automações).
- 7 comunicados (4 enviados, 2 agendados, 1 rascunho) → cada card com borda esquerda colorida por status.
- Filtros (busca + status/canal/origem) → filtra e mostra EmptyState quando zera.
- Clico no `•••` → popover contextual por status (opções diferentes para enviado/agendado/rascunho).
- "+ Nova campanha" → navego para o editor.

## Subtarefas
- [ ] LEELA-S108-T1 — Modelo `comunicados` + limite de push + agregados + Rules
- [ ] LEELA-S108-T2 — Tela lista de comunicados (KPIs + filtros por 3 grupos + popover contextual)

## Links
Épico: [[LEELA-E05-clubs]]
