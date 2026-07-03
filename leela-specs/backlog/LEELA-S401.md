---
id: LEELA-S401
type: story
epic: E06
epic_name: Marketing Unificado
onda: 2
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 4
tags: [leela, story]
---
# LEELA-S401 · Campanhas
**Como** Organizador de Evento, **quero** criar e disparar campanhas de marketing segmentadas por push/email para os inscritos, **para** impulsionar vendas e informar em momentos-chave sem virar spam.

## Critérios de aceite
- Sub-tela Campanhas → três grupos por estado (enviadas, agendadas, rascunhos — RN-130) com alcance e aberturas por linha.
- Busca/filtros sem correspondência → EmptyState "Nenhuma campanha encontrada com os filtros aplicados".
- "+ Nova campanha" → editor com título, conteúdo, canal (push/email), capa (só email), segmento e variáveis.
- Escolho segmento (todos, modalidade, kit, status, engajamento) → estimativa de alcance ao vivo.
- Canal push com corpo > 160 chars → aviso de truncamento (RN-134); email suporta capa (RN-135).
- Excedo 4 push/semana (RN-133) → disparo bloqueado com aviso.
- Confirmo → Enviar agora / Agendar envio / Salvar rascunho com Toast canônico.

## Subtarefas
- [ ] LEELA-S401-T1 — Modelo `campanhas` + segmento derivado de inscritos + estimativa de alcance + Rules
- [ ] LEELA-S401-T2 — Sub-tela Campanhas (lista por estado, alcance/aberturas, filtros)
- [ ] LEELA-S401-T3 — Editor "Nova campanha" (canal, capa, segmento, estimativa ao vivo, variáveis)
- [ ] LEELA-S401-T4 — Function `enviarCampanha` + agregado de alcance/aberturas (limite push, idempotente)

## Links
Épico: [[LEELA-E06-marketing]]
