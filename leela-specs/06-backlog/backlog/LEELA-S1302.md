---
id: LEELA-S1302
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Must
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S1302 · Shell mobile — Tab Bar 5 itens + navegação
**Como** Atleta, **quero** navegar por abas claras, **para** alcançar rapidamente onde quero (Início, Eventos, Arena, Clubs, Perfil).

## Critérios de aceite
- Dado que estou logado, quando abro o app, então vejo a Tab Bar de 5 itens com a aba ativa destacada (tokens tema `leela`).
- Dado cada aba, quando toco, então navego para a stack correspondente mantendo estado por aba.
- Dado um deep link, quando abro, então caio na tela-alvo dentro da aba certa.
- Dado qualquer tela, quando renderiza, então respeita safe area (notch/home indicator).

## Subtarefas
- [ ] LEELA-S1302-T1 — Tab navigator (Expo Router) + safe area + deep linking

## Links
Épico: [[LEELA-E13-app-atleta]]
