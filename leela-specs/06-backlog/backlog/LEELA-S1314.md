---
id: LEELA-S1314
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Should
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1314 · QR do ingresso e estado de check-in no app
**Como** Atleta, **quero** ver meu QR do ingresso e saber se meu check-in já foi feito, **para** acompanhar kit, ingresso e presença no mesmo lugar e me identificar rápido no balcão.

## Critérios de aceite
- Dado uma inscrição confirmada com `qrToken`, quando abro "Meus Qr Codes", então o app renderiza o QR a partir de `qrToken` (sem gerá-lo no cliente).
- Dado `checkinEm != null` na minha inscrição espelhada, quando abro o ingresso, então vejo o estado "Check-in já realizado" (`39:6586`) como leitura do espelho, nunca uma escrita de status pelo cliente.
- Dado `checkinEm == null`, quando abro o ingresso, então o QR fica disponível para identificação no balcão sem indicar check-in feito.
- Dado que a inscrição ainda não emitiu ingresso (`qrToken` ausente), quando abro a tela, então vejo estado vazio/carregando coerente, sem QR quebrado.

## Subtarefas
- [ ] LEELA-S1314-T1 — Leitura das inscrições espelhadas (`qrToken`, `checkinEm`) sem escrita de status pelo cliente
- [ ] LEELA-S1314-T2 — Tela "Meus Qr Codes" exibindo o QR de `qrToken` e o estado "Check-in já realizado" (`39:6586`), com estados vazio/carregando

## Links
Épico: [[LEELA-E13-app-atleta]]
