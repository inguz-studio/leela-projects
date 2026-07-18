---
id: LEELA-S1601
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 4
tags: [leela, story]
---

# LEELA-S1601 · Onboarding e lifecycle do tenant (aprovar, provisionar, ativar, suspender)
**Como** super-admin, **quero** aprovar um produtor e provisionar sua conta isolada, e depois ativar/suspender/reativar, **para** operar o marketplace sem intervenção técnica e sem apagar dados ao suspender.

## Critérios de aceite
- Dado um pedido `pending`, quando aprovo, então cria `tenants/{id}` (ativo) + `profissionais/{owner}` + claims atomicamente (RN-403) e mostra Toast.
- Dado a lista de tenants, quando abro, então vejo tabela densa (§2.5) com nome, slug, tipo, status e saúde, com filtros e EmptyState.
- Dado um tenant ativo, quando o suspendo, então passo por ConfirmModal (§2.15) com preview e o status vira `suspenso` (RN-402).
- Dado um tenant suspenso, quando reativo, então volta a `ativo` com Toast.
- Dado uma transição inválida (ex.: `pending → suspenso`), quando tento, então é bloqueada (RN-402).

## Subtarefas
- [ ] LEELA-S1601-T1 — Function `provisionTenant` (cria tenant + owner + claims, atômico)
- [ ] LEELA-S1601-T2 — Function de lifecycle (`activate`/`suspend`/`reactivate`) com guards
- [ ] LEELA-S1601-T3 — Tela lista de tenants (tabela densa, filtros, saúde)
- [ ] LEELA-S1601-T4 — Tela detalhe do tenant + provisionar/aprovar/suspender (ConfirmModal)

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
