---
id: LEELA-S1605
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: 1
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---

# LEELA-S1605 · Visão macro do super-admin (GMV, receita Leela, tenants ativos, saúde)
**Como** super-admin, **quero** um painel macro com GMV total, minha receita por tenant, nº de tenants ativos e a saúde de cada um, **para** enxergar o resultado da plataforma sem cruzar planilhas.

## Critérios de aceite
- Dado que sou `platform_admin`, quando abro o macro, então vejo GMV total, receita Leela total, nº de tenants ativos e tabela de saúde por tenant, tudo de `platform/rollups` (RN-409).
- Dado que não sou `platform_admin`, quando tento abrir, então vejo 403 (RN-400).
- Dado os agregados, quando um pagamento novo confirma em qualquer tenant, então GMV total e receita Leela do tenant sobem via Function (nunca no cliente — RN-409).
- Dado um período sem movimento, quando abro, então vejo estado vazio coerente (não zeros ambíguos).

## Subtarefas
- [ ] LEELA-S1605-T1 — Modelo `platform/rollups` + Rules (leitura só admin, escrita só Function)
- [ ] LEELA-S1605-T2 — Function de agregação macro cross-tenant (GMV, receita Leela, tenants ativos, saúde)
- [ ] LEELA-S1605-T3 — Tela dashboard macro (KPIs + saúde por tenant)

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
