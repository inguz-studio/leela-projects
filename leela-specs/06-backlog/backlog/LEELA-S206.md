---
id: LEELA-S206
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S206 · Editar kit em tela cheia
**Como** Organizador de Evento, **quero** editar um kit numa tela cheia navegável (não modal), **para** ter espaço para configurar composição, preço, capacidade e modalidades.

## Critérios de aceite
- Dado um kit, quando clico em "Editar" no card ou em "+ Adicionar kit", então abro a tela cheia (2 pontos de entrada — RN-217) com breadcrumb nível 4.
- Dado a tela, quando edito, então configuro identidade, modalidades, preço (aceita negativo — RN-211), capacidade e checklist de itens.
- Dado que altero itens/modalidades, quando interajo, então chip fade-out, contador e save com Toast funcionam (§2.12).
- Dado um evento com venda, quando tento editar preço, então o campo está bloqueado (RN-200).
- Dado toda a nomenclatura, quando leio, então é "kit", nunca "tier" (RN-216).

## Subtarefas
- [ ] LEELA-S206-T1 — Tela cheia de edição de kit (2 pontos de entrada, composição, preço, capacidade)
- [ ] LEELA-S206-T2 — Nomenclatura "kit" nunca "tier" em todo o produto (RN-216)

## Links
Épico: [[LEELA-E03-operacao-evento]]
