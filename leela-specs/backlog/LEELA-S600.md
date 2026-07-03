---
id: LEELA-S600
type: story
epic: E02
epic_name: Visão Geral do Profissional
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---

# LEELA-S600 · Rota de Visão Geral, shell e KPIs agregados
**Como** Coordenador de Assessoria ou Organizador, **quero** uma tela inicial que consolide os KPIs de eventos e clubes que administro, **para** ter visão única do meu negócio de relance ao logar.

## Critérios de aceite
- Dado um profissional autenticado, quando acesso `/` do painel, então vejo a rota `(overview)` com shell padrão, saudação personalizada e `date-badge`.
- Dado que a Function de agregado retornou dados, quando a KPI row renderiza, então exibe 4 KPIs (inscrições, receita confirmada, vagas restantes com badge de risco, taxa de conversão com sparkline).
- Dado que os agregados carregam, quando a tela monta, então cada KPI mostra skeleton (nunca spinner solto).
- Dado zero eventos/clubes, quando carrega, então KPIs mostram zero com estado vazio orientado, não números falsos.
- Dado falha na Function, quando carrega, então estado de erro com "Tentar novamente" e nenhum número inventado no cliente.

## Subtarefas
- [ ] LEELA-S600-T1 — Rota `(overview)`, layout de 2 colunas e cabeçalho da página
- [ ] LEELA-S600-T2 — Cloud Function de agregado do dashboard do profissional
- [ ] LEELA-S600-T3 — KPI row (4 cards) consumindo o agregado

## Links
Épico: [[LEELA-E02-visao-geral]]
