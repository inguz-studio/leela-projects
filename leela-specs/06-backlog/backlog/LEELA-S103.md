---
id: LEELA-S103
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
# LEELA-S103 · Gestão de membros
**Como** Coordenador de Assessoria, **quero** ver e filtrar a lista completa de membros, **para** encontrar rapidamente um atleta e gerenciar seu papel ou permanência.

## Critérios de aceite
- 120 membros → tabela densa (§2.5) com contador "mostrando X de Y".
- Digito "Camila" na busca → só linhas que casam e contador atualiza.
- Chips de status/papel → filtram exclusivo dentro do grupo; busca + chips = interseção.
- Filtro que zera → EmptyState "Nenhum membro encontrado com os filtros aplicados".
- Clico no `•••` → popover (Ver perfil / Promover Admin / Promover Owner / Remover membro).

## Subtarefas
- [ ] LEELA-S103-T1 — Modelo `membros` + derivação de status + Function de agregados + Rules
- [ ] LEELA-S103-T2 — Tela de membros (tabela densa + busca + filtros combináveis + popover)

## Links
Épico: [[LEELA-E05-clubs]]
