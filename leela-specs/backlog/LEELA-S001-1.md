---
id: LEELA-S001-1
type: story
epic: E01
epic_name: Design System temável & Shell
onda: 0
surface: todas
moscow: Must
status: done
v1: true
tasks_total: 2
tags: [leela, story]
---

# LEELA-S001-1 · Tokens em 3 tiers + temas trocáveis
**Como** time, **quero** os tokens como código em tiers com temas trocáveis, **para** re-tematizar o produto sem tocar componentes.

## Critérios de aceite
- Dado `theme="brasa"`, quando renderizo qualquer componente, então usa Brasa `#FF450C` + Exo 2.
- Dado que troco para `theme="leela"`, quando re-renderiza, então paleta e tipografia mudam sem alterar markup do componente.
- Dado um componente, quando referencia cor, então usa token semantic (nunca hex nem primitivo direto).

## Subtarefas
- [x] LEELA-S001-1-T1 — `tokens.json` (3 tiers) + gerador CSS vars / tema RN
- [x] LEELA-S001-1-T2 — `ThemeProvider` (web + RN) com troca em runtime

## Links
Épico: [[LEELA-E01-design-system]]
