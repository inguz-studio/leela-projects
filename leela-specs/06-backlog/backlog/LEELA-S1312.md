---
id: LEELA-S1312
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1312 · Comunicados recebidos + push (FCM)
**Como** Atleta, **quero** receber os comunicados do meu clube por push e relê-los num inbox, **para** não perder treino, aviso de kit ou lembrete.

## Critérios de aceite
- Dado que autorizo notificações, quando o clube envia um comunicado push, então recebo a notificação (≤160 chars — RN-134) e, ao tocar, caio no comunicado (deep link).
- Dado o inbox, quando abro, então vejo os comunicados recebidos (push/email) com título, trecho e data; email exibe capa (RN-135), push não.
- Dado um comunicado não lido, quando abro, então marca como lido e o badge atualiza.
- Dado que neguei permissão, quando abro, então vejo como reativar, sem bloquear o app.

## Subtarefas
- [ ] LEELA-S1312-T1 — Registro de push token (FCM) + entrega de comunicado ao atleta + Rules
- [ ] LEELA-S1312-T2 — Permissão de push + inbox de comunicados + leitura

## Links
Épico: [[LEELA-E13-app-atleta]]
