---
id: LEELA-S204
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---
# LEELA-S204 · Balcão de entrega e check-in
**Como** Organizador de Evento (ou operador de balcão), **quero** identificar o atleta, entregar o kit, vincular o chip e fechar o atendimento num fluxo único, **para** que a retirada seja rápida e sem erro no dia do evento.

## Critérios de aceite
- Dado o balcão, quando abro, então vejo layout 60/40 (atendimento à esquerda, painel operacional à direita).
- Dado um atleta identificado, quando conduzo o atendimento, então passo por entregar kit → vincular chip → check-in, e retirar o kit registra presença (RN-205).
- Dado um inscrito `sem_kit`, quando atendo, então o passo "entregar kit" já vem concluído.
- Dado `usaChip=false`, quando atendo, então o passo de chip é suprimido (RN-207).
- Dado um chip já vinculado a outro atleta, quando tento vincular, então abre confirmação de sobrescrita (RN-206).
- Dado os estados especiais, quando os documento, então vão em galeria separada, nunca empilhados (RN-208/§2.9).

## Subtarefas
- [ ] LEELA-S204-T1 — Tela do balcão (layout 60/40 + 3 passos + painel operacional)
- [ ] LEELA-S204-T2 — Function de vínculo de chip + registro de presença (RN-205/206/207)
- [ ] LEELA-S204-T3 — Galeria de estados do balcão (§2.9 / RN-208)

## Links
Épico: [[LEELA-E03-operacao-evento]]
