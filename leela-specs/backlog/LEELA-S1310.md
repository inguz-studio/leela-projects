---
id: LEELA-S1310
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
# LEELA-S1310 · Clubs — entrar no clube + página do clube
**Como** Atleta, **quero** entrar no meu clube por código ou link e ver sua página, **para** pertencer a uma comunidade local com rosto e nome.

## Critérios de aceite
- Dado a aba Clubs sem clube, quando abro, então posso entrar por código (8A3K9) ou colar um link de convite.
- Dado um código válido, quando confirmo, então viro membro (ou "pendente" se o clube exige aprovação manual) e recebo as boas-vindas.
- Dado um código inválido, quando tento, então vejo erro claro (5 chars, exclui 0/O/1/I/L — RN-101).
- Dado que sou membro, quando abro o clube, então vejo a página respeitando a visibilidade (RN-140).

## Subtarefas
- [ ] LEELA-S1310-T1 — Entrar no clube (código/link) + página do clube (membro)

## Links
Épico: [[LEELA-E13-app-atleta]]
