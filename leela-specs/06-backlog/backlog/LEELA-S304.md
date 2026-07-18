---
id: LEELA-S304
type: story
epic: E04
epic_name: Configuração e Vendas do Evento
onda: 2
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---
# LEELA-S304 · Configurações e equipe do evento (4 papéis)
**Como** Organizador de Evento, **quero** configurar dados gerais, equipe e permissões do evento, **para** controlar quem acessa e como o evento opera.

## Critérios de aceite
- Dado as configurações, quando abro, então vejo dados gerais (identidade, `usaChip`, visibilidade) e salvo com Toast.
- Dado a equipe, quando abro, então vejo membros com um dos 4 papéis (RN-320) e suas permissões.
- Dado um membro, quando atribuo/troco o papel, então as permissões (custom claims por evento) refletem o papel.
- Dado a remoção de um membro, quando confirmo, então passa por ConfirmModal (§2.15) e o acesso é revogado.
- Dado um papel sem permissão para uma área, quando tenta acessar, então o acesso é negado (UI + Rules).

## Subtarefas
- [ ] LEELA-S304-T1 — Modelo `equipe` + 4 papéis (RN-320) + custom claims + Rules
- [ ] LEELA-S304-T2 — Tela Configurações gerais do evento
- [ ] LEELA-S304-T3 — Tela Equipe e permissões (4 papéis)

## Links
Épico: [[LEELA-E04-config-vendas]]
