---
id: LEELA-S1313
type: story
epic: E13
epic_name: App do Atleta
onda: "—"
surface: mobile
moscow: Must
status: backlog
v1: false
tasks_total: 1
tags: [leela, story]
---
# LEELA-S1313 · Perfil / identidade do atleta
**Como** Atleta, **quero** um perfil que mostre quem eu sou como atleta, **para** sentir que sou um atleta em progresso, não um consumidor.

## Critérios de aceite
- Dado a aba Perfil, quando abro, então vejo minha identidade (avatar/iniciais, nome), clubes, estante de medalhas, histórico de inscrições e resumo de progresso.
- Dado editar perfil, quando salvo nome/avatar, então persiste em `atletas/{uid}` e reflete nas superfícies.
- Dado privacidade/dados, quando abro, então posso solicitar exportação e exclusão da conta (LGPD — disclaimer, export 90 dias).
- Dado logout, quando aciono, então encerro a sessão e volto para a entrada.

## Subtarefas
- [ ] LEELA-S1313-T1 — Tela de Perfil (identidade + clubes + medalhas + inscrições + configurações/LGPD/logout)

## Links
Épico: [[LEELA-E13-app-atleta]]
