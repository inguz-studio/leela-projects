---
id: LEELA-S1301
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
# LEELA-S1301 · Onboarding + autenticação (Apple obrigatório + Google)
**Como** Atleta, **quero** conhecer o app em poucas telas e entrar com Apple ou Google, **para** começar a usar sem fricção e sem criar mais uma senha.

## Critérios de aceite
- Dado o primeiro uso, quando abro o app deslogado, então vejo o onboarding (3 telas de valor) e a tela de entrada.
- Dado a tela de entrada em iOS, quando carrega, então o botão Entrar com Apple está presente e proeminente.
- Dado a tela de entrada, quando escolho Google, então completo o fluxo OAuth e volto autenticado.
- Dado o primeiro login, quando o auth resolve, então o doc `atletas/{uid}` é criado e vou para o Início.
- Dado que já logei antes, quando reabro, então a sessão persiste e caio direto no Início.
- Dado falha de auth, quando ocorre, então vejo mensagem clara e não punitiva.

## Subtarefas
- [ ] LEELA-S1301-T1 — Provisionamento de atleta no 1º login + Function `onAtletaCreate` + Rules
- [ ] LEELA-S1301-T2 — Telas de onboarding + tela de entrada (Apple + Google) + gate de sessão

## Links
Épico: [[LEELA-E13-app-atleta]]
