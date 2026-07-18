---
id: LEELA-S101
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
# LEELA-S101 · Hub de clubes
**Como** Coordenador de Assessoria, **quero** ver todos os clubes que gerencio em um hub central, separados entre próprios e parceiros, **para** acessar rapidamente o clube que quero administrar.

## Critérios de aceite
- Sou owner de ≥1 clube → vejo zona "clubes próprios" com card por clube (avatar, nome, categoria, contagem de membros).
- Participo como parceiro → vejo zona "clubes parceiros" separada.
- Topo do hub carrega → vejo KPIs globais (total de membros, clubes ativos, desafios em andamento).
- Clico num card → navego para o Overview daquele clube.
- Botão "+ Criar clube" visível (fluxo de criação fora do escopo).
- Clico no `•••` → popover (Ver perfil → Overview; Editar configurações → Configurações).

## Subtarefas
- [ ] LEELA-S101-T1 — Modelo de dados `clubes` + tipos + Security Rules
- [ ] LEELA-S101-T2 — Tela Hub de clubes (2 zonas + KPIs)

## Links
Épico: [[LEELA-E05-clubs]]
