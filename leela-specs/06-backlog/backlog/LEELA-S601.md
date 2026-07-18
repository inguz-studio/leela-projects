---
id: LEELA-S601
type: story
epic: E02
epic_name: Visão Geral do Profissional
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---

# LEELA-S601 · Eventos ativos e últimas inscrições
**Como** Organizador, **quero** ver meus eventos ativos e as últimas inscrições cross-evento, **para** agir rápido no que precisa de atenção sem abrir cada evento.

## Critérios de aceite
- Dado eventos do profissional, quando "Seus eventos ativos" renderiza, então lista cada evento com thumb, nome, data/local, badge de status/risco, contador "X / capacidade" e botão "Gerenciar" (E03).
- Dado inscrições recentes cross-evento, quando "Últimas inscrições" renderiza, então mostra tabela com atleta, evento, modalidade, valor, status (RN-204) e data relativa, com link "Ver todas".
- Dado zero eventos ativos, quando carrega, então EmptyState "Nenhum evento ativo" com CTA de criar.
- Dado zero inscrições, quando carrega, então EmptyState "Nenhuma inscrição recente".
- Dado carregamento, quando monta, então skeleton de linhas (nunca spinner solto).

## Subtarefas
- [ ] LEELA-S601-T1 — Seção "Seus eventos ativos"
- [ ] LEELA-S601-T2 — Tabela "Últimas inscrições" (cross-evento)

## Links
Épico: [[LEELA-E02-visao-geral]]
