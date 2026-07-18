---
id: LEELA-S109
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
# LEELA-S109 · Criar/editar comunicado
**Como** Coordenador de Assessoria, **quero** criar ou editar um comunicado com segmentação, canal, agendamento e preview ao vivo, **para** enviar a mensagem certa ao público certo no momento certo.

## Critérios de aceite
- Editor sem `?id` → modo create; com `?id=[slug]` (4 slugs mock) → pré-preenchido.
- Coluna direita sticky → preview Push/Email ao vivo; Push trunca em 160 chars (RN-134); email respeita quebras e capa (RN-135).
- Segmentação por desafio/pilar/engajamento → tamanho estimado do segmento aparece.
- Canal → cards mutuamente exclusivos; capa só para email (RN-135).
- Agendamento "agendar" → data+hora e botão principal muda; validações (título ≥5, conteúdo ≥10, segmento/canal obrigatórios) bloqueiam envio.

## Subtarefas
- [ ] LEELA-S109-T1 — Segmentação + validações de comunicado (core)
- [ ] LEELA-S109-T2 — Editor de comunicado (70/30 + preview Push/Email ao vivo + modo dual)

## Links
Épico: [[LEELA-E05-clubs]]
