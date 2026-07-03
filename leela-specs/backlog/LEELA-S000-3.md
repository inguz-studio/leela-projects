---
id: LEELA-S000-3
type: story
epic: E00
epic_name: Fundação Técnica
onda: 0
surface: todas
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---

# LEELA-S000-3 · CI/CD e observabilidade
**Como** time, **quero** CI que valide todo PR e Sentry captando erros, **para** manter qualidade e ter visibilidade em produção.

## Critérios de aceite
- Dado um PR, quando abre, então roda lint + type-check + test + build; falha bloqueia merge.
- Dado um erro em runtime, quando acontece, então aparece no Sentry com release e contexto.

## Subtarefas
- [x] LEELA-S000-3-T1 — GitHub Actions (lint/type/test/build) + preview deploy
- [ ] LEELA-S000-3-T2 — Sentry (web + mobile) + gestão de env

## Links
Épico: [[LEELA-E00-fundacao-tecnica]]
