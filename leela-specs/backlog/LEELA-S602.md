---
id: LEELA-S602
type: story
epic: E02
epic_name: Visão Geral do Profissional
onda: 1
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---

# LEELA-S602 · Coluna lateral: próximo evento, ações rápidas e alertas
**Como** Organizador, **quero** ver o próximo evento com contagem regressiva, ações rápidas e alertas operacionais, **para** não perder prazos e agir direto do painel inicial.

## Critérios de aceite
- Dado o próximo evento, quando o countdown-card renderiza, então mostra eyebrow, nome, "N dias restantes", quando/local, mini-stats (Inscritos / Vagas livres) e ações rápidas navegáveis.
- Dado os alertas operacionais, quando o painel renderiza, então lista cada alerta com ícone por severidade, título, tempo relativo e contador "N novos".
- Dado nenhum próximo evento, quando carrega, então countdown-card em estado vazio com CTA criar.
- Dado nenhum alerta, quando carrega, então EmptyState "Tudo em dia. Nenhum alerta."
- Dado carregamento, quando monta, então skeleton dos cards.

## Subtarefas
- [ ] LEELA-S602-T1 — Countdown card do próximo evento + ações rápidas
- [ ] LEELA-S602-T2 — Painel de alertas operacionais

## Links
Épico: [[LEELA-E02-visao-geral]]
