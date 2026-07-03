---
id: LEELA-S1600
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: 0
surface: painel
moscow: Must
status: done
v1: true
tasks_total: 3
tags: [leela, story]
---

# LEELA-S1600 · Modelo multi-tenant, claims e isolamento (fundacional)
**Como** dono da plataforma, **quero** um modelo de dados multi-tenant com papéis por custom claims e Security Rules de isolamento, **para** que o dado de um produtor nunca vaze para outro e só eu cruze a fronteira.

## Critérios de aceite
- Dado um `tenant_owner` do tenant A, quando tenta ler evento/clube/pagamento do tenant B, então a Rule nega (RN-400).
- Dado o mesmo owner, quando lê os próprios dados (claim `tenantId` bate), então permite.
- Dado um `platform_admin`, quando lê dados de qualquer tenant, então permite (única exceção).
- Dado um `athlete`, quando lê o próprio `atletas/{uid}`, então permite independentemente de tenant.
- Dado um tenant `suspenso`, quando o owner tenta criar/publicar, então nega, mas leitura dos dados existentes permanece (RN-402).

## Subtarefas
- [x] LEELA-S1600-T1 — Modelo `tenants` + tipos + status/lifecycle + Rules base + seed
- [x] LEELA-S1600-T2 — Custom claims (`role` + `tenantId`) — Function `setTenantClaims` + propagação
- [x] LEELA-S1600-T3 — Security Rules multi-tenant (isolamento por `tenantId`) + testes

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
