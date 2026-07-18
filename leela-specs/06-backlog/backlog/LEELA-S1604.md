---
id: LEELA-S1604
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---

# LEELA-S1604 · Recorrência SaaS (mensalidade Leela→tenant)
**Como** super-admin, **quero** cobrar a mensalidade SaaS de cada tenant conforme `saasMonthlyFee`, **para** monetizar a plataforma sobre os produtores, isentando quem tem fee 0.

## Critérios de aceite
- Dado um tenant com `saasMonthlyFee > 0`, quando o ciclo roda, então gera cobrança via `PaymentProvider` e registra em `platform/billing/{tenantId}` (RN-408).
- Dado `saasMonthlyFee = 0`, quando o ciclo roda, então não gera cobrança nem ledger (isento — RN-405).
- Dado o mesmo `providerTxId` reprocessado, quando o webhook chega, então o ledger não duplica (RN-333).
- Dado o billing por tenant, quando abro (super-admin), então vejo o histórico de cobranças SaaS com status.

## Subtarefas
- [ ] LEELA-S1604-T1 — Modelo `platform/billing/{tenantId}` (ledger SaaS) + Rules
- [ ] LEELA-S1604-T2 — Function de cobrança SaaS recorrente (deriva de `saasMonthlyFee`, idempotente)
- [ ] LEELA-S1604-T3 — Tela billing SaaS por tenant (super-admin)

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
