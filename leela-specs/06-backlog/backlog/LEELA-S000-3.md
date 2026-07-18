---
id: LEELA-S000-3
type: story
epic: E00
epic_name: Fundação Técnica
onda: 0
surface: todas
moscow: Must
status: done
v1: true
tasks_total: 2
tasks_done: 2
commit: 4230654
tags: [leela, story]
---

# LEELA-S000-3 · CI/CD e observabilidade
**Como** time, **quero** CI que valide todo PR e Sentry captando erros, **para** manter qualidade e ter visibilidade em produção.

## Critérios de aceite
- Dado um PR, quando abre, então roda lint + type-check + test + build; falha bloqueia merge.
- Dado um erro em runtime, quando acontece, então aparece no Sentry com release e contexto.

## Subtarefas
- [x] LEELA-S000-3-T1 — GitHub Actions (lint/type/test/build) + preview deploy
- [x] LEELA-S000-3-T2 — Sentry (web + mobile) + gestão de env

## Pendências humanas (pós-Onda 0)
- Criar três projetos no Sentry (leela-painel, leela-landing, leela-mobile) e preencher DSNs no `.env`.
- Testar disparo de erro: `reportError(new Error('teste'))` no console e confirmar no dashboard Sentry com release + ambiente.
- Para crash reports nativos iOS/Android: adicionar plugin `@sentry/react-native/expo` ao `app.json` e fazer build EAS com `SENTRY_AUTH_TOKEN`.

## Links
Épico: [[LEELA-E00-fundacao-tecnica]]
