---
id: LEELA-S106
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
# LEELA-S106 · Criar/editar desafio
**Como** Coordenador de Assessoria, **quero** criar ou editar um desafio definindo modelo, ações, metas, recompensa e visibilidade, **para** desenhar desafios alinhados ao meu planejamento de treino.

## Critérios de aceite
- Editor sem `?id` → modo create; com `?id=[slug]` → modo edit pré-preenchido.
- Seletor de modelo A/B/C → muda campos de meta (A: por ação; B: pontos; C: meta + mínimo por pilar).
- Modelo C sem mínimo por pilar → validação bloqueia publicação (RN-111).
- Marco/edito ação no catálogo de 16 ações → resumo e preview recalculam com bônus (RN-115).
- Vinculo evento → sistema adiciona copy "(Preparação para [evento])" (RN-113).
- "Salvar rascunho" → spinner + toast e permaneço; "Publicar" navega + notifica.

## Subtarefas
- [ ] LEELA-S106-T1 — Motor de pontuação + validação de modelo (core)
- [ ] LEELA-S106-T2 — Editor de desafio (layout 70/30 + modelo dual + resumo/preview ao vivo)

## Links
Épico: [[LEELA-E05-clubs]]
