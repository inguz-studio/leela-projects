---
id: LEELA-S104
type: story
epic: E05
epic_name: Módulo Clubs
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S104 · Convidar membros
**Como** Coordenador de Assessoria, **quero** convidar atletas por link, código ou email, **para** crescer a comunidade pelos canais que fizerem sentido.

## Critérios de aceite
- Modal abre → 3 tabs internas (Link público, Por código, Por email) com Link ativa.
- Tab Link, clico "Copiar" → toast "Link de convite copiado"; WhatsApp/Telegram/QR disparam toasts.
- Tab Código → 8A3K9 em destaque + copiar; botão principal navega após 1s.
- Tab Email vazia → toast erro; emails válidos (≤50) → spinner + toast "[N] convite(s) enviado(s)" + navega.
- Mais de 50 emails → validação bloqueia (RN-106).
- Cancelar/X/overlay/Esc → fecha e volta para Membros (4 vias).

## Subtarefas
- [ ] LEELA-S104-T1 — Modal de convite (3 tabs + validações + 4 vias de fechamento)

## Links
Épico: [[LEELA-E05-clubs]]
