---
id: LEELA-S105
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
# LEELA-S105 · Listar e gerir desafios
**Como** Coordenador de Assessoria, **quero** ver todos os desafios (ativos e encerrados) com progresso coletivo, **para** acompanhar engajamento e decidir quando criar ou encerrar desafios.

## Critérios de aceite
- Topo carrega → 4 KPIs (desafios ativos, membros participando, taxa de conclusão, pontos distribuídos).
- Seção ativos → 3 cards grandes com progresso coletivo e distribuição por pilar.
- Seção encerrados → 2 cards menores.
- Chips de status (exclusivos) + chips de modelo A/B/C (toggles) + busca → filtra; EmptyState quando zera.
- Clico no `•••` → popover com 6 ações (Ver detalhes, Editar, Duplicar, Notificar, Arquivar, Encerrar antecipadamente).
- Clico "Editar" → navego para o editor `?id=[slug]`.

## Subtarefas
- [ ] LEELA-S105-T1 — Modelo `desafios` + `catalogoAcoes` (seed 16 ações) + junção `acoes` + Rules
- [ ] LEELA-S105-T2 — Tela lista de desafios (KPIs + cards ativos/encerrados + filtros + popover)

## Links
Épico: [[LEELA-E05-clubs]]
