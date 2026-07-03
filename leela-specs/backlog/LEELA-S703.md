---
id: LEELA-S703
type: story
epic: E08
epic_name: Painel do Influenciador
onda: 2
surface: painel
moscow: Could
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S703 · Minhas conversões
**Como** promotor, **quero** ver minhas conversões por evento com status e janela de atribuição, **para** acompanhar o que trouxe e o que ainda vai liberar.
## Critérios de aceite
- Dado conversões atribuídas ao meu link dentro da janela (RN-311), quando abro, então vejo tabela densa por evento com data, valor e status (atribuída/confirmada/cancelada).
- Dado filtro por evento ou status sem correspondência, quando aplico, então EmptyState + contador "mostrando 0 de N".
- Dado conversão fora da janela de atribuição, quando listo, então ela não é contada como minha.
## Subtarefas
- [ ] LEELA-S703-T1 — Tabela de conversões com filtros e atribuição por janela
## Links
Épico: [[LEELA-E08-influenciador]]
