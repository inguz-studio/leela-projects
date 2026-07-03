---
id: LEELA-S1311
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
# LEELA-S1311 · Comunidade — feed social dentro do clube
**Como** Atleta, **quero** um feed social que vive dentro do meu clube, **para** ver que a galera está na mesma jornada e interagir com rosto e nome.

## Critérios de aceite
- Dado que sou membro, quando abro a comunidade do clube, então vejo o feed (posts com autor/rosto/nome, texto, mídia, curtidas, comentários).
- Dado o comportamento do clube (RN-143), quando é "silencioso", então membros só leem; "moderado" exige aprovação.
- Dado um post, quando curto ou comento, então o agregado atualiza (mantido por Function).
- Dado um feed vazio, quando abro, então o estado convida ("A galera ainda não postou. Comece a conversa").

## Subtarefas
- [ ] LEELA-S1311-T1 — Modelo `feed` do clube + Functions de agregado (curtidas/comentários) + Rules
- [ ] LEELA-S1311-T2 — Tela do feed do clube (posts + curtir + comentar + compor)

## Links
Épico: [[LEELA-E13-app-atleta]]
