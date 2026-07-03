---
id: LEELA-S402
type: story
epic: E06
epic_name: Marketing Unificado
onda: "—"
surface: painel
moscow: Could
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S402 · Automações
**Como** Organizador de Evento, **quero** configurar automações de comunicação por gatilho, **para** que mensagens (boas-vindas, kit disponível, véspera, pós-evento) disparem sozinhas sem ação manual.

## Critérios de aceite
- Sub-tela Automações → automações por gatilho (novo inscrito, kit disponível, véspera, pós-evento) com toggle ativa/pausada e ∑ de disparos.
- Ativo/pauso o toggle → estado persiste com Toast.
- Edito o template → reuso o editor de campanha (origem=automatizada — RN-132); validações de canal/160/limite valem.
- Gatilho "novo inscrito" ocorre → mensagem dispara automaticamente (respeitando canal/limite).

## Subtarefas
- [ ] LEELA-S402-T1 — Modelo `automacoes` + Functions de gatilho + Rules
- [ ] LEELA-S402-T2 — Sub-tela Automações (lista por gatilho, toggle, editar template)

## Links
Épico: [[LEELA-E06-marketing]]
