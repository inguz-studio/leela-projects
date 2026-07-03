---
id: LEELA-S1300
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
# LEELA-S1300 · Setup do app Expo + pipeline EAS
**Como** time, **quero** o app Expo configurado no monorepo com build e submissão por EAS, **para** que qualquer story do E13 rode em iOS/Android e o app seja publicável nas lojas.

## Critérios de aceite
- Dado o monorepo Turborepo, quando rodo o app, então `apps/mobile` sobe no Expo consumindo `packages/core` e o DS (variante RN) sem duplicar código.
- Dado `eas build` para iOS e Android, quando disparo, então gera artefatos assináveis com os bundle ids definidos.
- Dado `eas submit`, quando configuro os canais, então o app é submetível à App Store e Google Play.
- Dado um erro em runtime, quando ocorre, então é capturado no Sentry mobile sem dado sensível.

## Subtarefas
- [ ] LEELA-S1300-T1 — Bootstrap `apps/mobile` (Expo Router + consumo de core/design-system RN)
- [ ] LEELA-S1300-T2 — Configuração EAS Build/Submit + Sentry mobile + credenciais das lojas

## Links
Épico: [[LEELA-E13-app-atleta]]
