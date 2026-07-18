---
id: LEELA-S000-4
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
tags: [leela, story]
---

# LEELA-S000-4 · Convenções e `PaymentProvider` (interface)
**Como** time (e o Fable 5), **quero** convenções de código e a interface de pagamento definidas, **para** que todo épico seguinte programe contra contratos estáveis.

## Critérios de aceite
- Dado `packages/core`, quando um épico precisa cobrar/split, então usa `PaymentProvider` (interface), nunca um SDK de gateway direto.
- Dado o repo, quando um dev entra, então `convencoes-codigo.md` explica estrutura, nomes e padrões.

## Subtarefas
- [x] LEELA-S000-4-T1 — Documento de convenções de código
- [x] LEELA-S000-4-T2 — Interface `PaymentProvider` + adapter mock/sandbox

## Artefatos entregues
- `leela-specs/convencoes-codigo.md` — 11 seções: estrutura de pastas, nomes (PT-BR domínio/UI, EN código/types), conventional commits, 1 PR = 1 task, tokens DS obrigatórios, proibição de localStorage, protocolo de mutex, TypeScript strict, validação no servidor, agregados/idempotência, multi-tenancy
- `packages/core/src/payments/PaymentProvider.ts` — interface plugável (ADR-006): `createCharge`, `splitRules`, `refund`, `handleWebhook`, `getPayout` + todos os tipos de domínio de pagamento
- `packages/core/src/index.ts` — re-exporta todos os tipos de `PaymentProvider.ts` para retrocompatibilidade
- `functions/src/payments/mockProvider.ts` — `MockPaymentProvider` (in-memory idempotente via `idempotencyKey`/`chargeId`), `calcularSplit` (plataforma + destinatários, resíduo no último), singleton `mockPaymentProvider`
- `functions/src/__tests__/mockProvider.test.ts` — 13 testes: split, idempotência de charge/webhook/refund, getPayout

## Links
Épico: [[LEELA-E00-fundacao-tecnica]]
