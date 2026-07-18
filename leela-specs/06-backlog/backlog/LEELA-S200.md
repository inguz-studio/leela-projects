---
id: LEELA-S200
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
# LEELA-S200 · Hub de eventos
**Como** Organizador de Evento, **quero** ver todos os meus eventos num hub com KPIs globais, **para** abrir rapidamente o evento que quero gerenciar.

## Critérios de aceite
- Dado que tenho eventos, quando abro `/eventos`, então vejo um card por evento com status e KPIs globais consolidados.
- Dado um card, quando clico, então navego para o Overview daquele evento.
- Dado zero eventos, quando abro o hub, então vejo EmptyState com CTA "Criar evento".
- Dado o hub, quando clico em "+ Novo evento", então navego para a criação.

## Subtarefas
- [ ] LEELA-S200-T1 — Tipo `Evento` + query de eventos por organizador + Security Rules
- [ ] LEELA-S200-T2 — Tela Hub de eventos (`/eventos`) com KPIs globais e EmptyState

## Links
Épico: [[LEELA-E03-operacao-evento]]
