---
id: LEELA-S1602
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---

# LEELA-S1602 · Termos comerciais por tenant (`commercialTerms`)
**Como** super-admin, **quero** configurar os termos comerciais de cada tenant num lugar só, **para** que o checkout (E04) e o financeiro/split (E09) usem a taxa e as condições certas por produtor, sem constante no código.

## Critérios de aceite
- Dado um tenant, quando abro seus termos, então vejo `platformFeePct`, `installmentRules`, `anticipation`, `communityMonthlyEnabled` e `saasMonthlyFee` editáveis só por mim (RN-404).
- Dado que sou `tenant_owner`, quando leio meus termos, então vejo read-only (RN-404).
- Dado `saasMonthlyFee = 0`, quando salvo, então é aceito (produtor-sócio — RN-405).
- Dado que o checkout de E04 precisa da taxa/parcelamento, quando consulta, então lê `commercialTerms` do tenant (RN-406), não uma constante.
- Dado o campo `anticipation`, quando configuro, então persiste como termo, mas a mecânica não é acionada nesta fase (RN-410).

## Subtarefas
- [ ] LEELA-S1602-T1 — Modelo `commercialTerms/current` + tipos + Rules (escrita só platform_admin)
- [ ] LEELA-S1602-T2 — Tela/editor de termos comerciais (por tenant)
- [ ] LEELA-S1602-T3 — Contrato de consumo dos termos por E04 (checkout) e E09 (split/taxa)

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
