---
id: LEELA-S000-1
type: story
epic: E00
epic_name: Fundação Técnica
onda: 0
surface: todas
moscow: Must
status: in_progress
v1: true
tasks_total: 4
tags: [leela, story]
---

# LEELA-S000-1 · Monorepo e apps scaffolding
**Como** time de engenharia, **quero** um monorepo com as três apps e os pacotes compartilhados, **para** compartilhar domínio e design system entre web e mobile sem duplicação.

## Critérios de aceite
- Dado o repositório limpo, quando rodo o setup, então existe `apps/{painel,landing,mobile}` + `packages/{core,design-system,api-client}` + `functions/` e `pnpm dev` sobe painel e landing.
- Dado o monorepo, quando altero `packages/core`, então painel e mobile enxergam a mudança (workspace linkado) e o cache do Turborepo evita rebuild desnecessário.

## Subtarefas
- [x] LEELA-S000-1-T1 — Inicializar monorepo Turborepo + pnpm workspaces
- [ ] LEELA-S000-1-T2 — Scaffold `apps/painel` e `apps/landing` (Next.js App Router)
- [ ] LEELA-S000-1-T3 — Scaffold `apps/mobile` (Expo)
- [ ] LEELA-S000-1-T4 — Pacotes compartilhados `core`, `design-system`, `api-client` (esqueleto)

## Links
Épico: [[LEELA-E00-fundacao-tecnica]]
