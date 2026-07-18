---
id: LEELA-S1304
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
# LEELA-S1304 · Descoberta de eventos (feed + busca)
**Como** Atleta, **quero** descobrir eventos e buscar por nome/modalidade/data, **para** encontrar minha próxima prova em poucos toques.

## Critérios de aceite
- Dado a aba Eventos, quando carrega, então vejo um feed de Cards Evento com contador "mostrando X de Y".
- Dado a busca, quando digito "Floripa", então só eventos que casam aparecem e o contador atualiza.
- Dado chips de filtro (modalidade, data), quando seleciono, então o feed filtra por interseção.
- Dado filtro que zera, quando aplico, então EmptyState "Nenhum evento encontrado com os filtros aplicados".
- Dado um Card Evento, quando toco, então navego para a página do evento.

## Subtarefas
- [ ] LEELA-S1304-T1 — Feed de eventos + busca + filtros (aba Eventos)

## Links
Épico: [[LEELA-E13-app-atleta]]
