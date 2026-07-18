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

## Hardening pós-review (fix crítico de segurança)
Revisão do multi-tenancy achou um exploit de **takeover cross-tenant por overwrite**: as write rules validavam só `request.resource.data.tenantId` (doc novo), nunca `resource.data.tenantId` (dono atual). Owner de A sobrescrevia doc de B carimbando o próprio tenantId. Corrigido:

- **F1 (crítica)** — create/update/delete separados em toda coleção tenant-scoped; `update` valida o dono atual e exige `tenantId` imutável; `delete` valida o dono atual. Exploit bloqueado (2 asserts de `_EXPLOIT_crossTenantOverwrite` passam).
- **F2** — cobertura: matriz de overwrite/delete-hijack + isolamento de leitura em `comunicados`, `parcerias`, `programaAfiliacao`, `equipe`, `promotores`, `inscritos`, `profissionais`, `subscriptions`; testes de integração de `setTenantClaims`, `onCreateUser` e `transitionTenant`.
- **F3** — coleção `inscritos` modelada com o padrão seguro (shape do modelo-de-dados) + teste.
- **F4** — RBAC intra-tenant: helper `isTenantWriter` (owner/staff); `promoter` lê mas não escreve; `equipe` restrita ao owner.
- **F5** — seed com guard anti-produção (`assertEmulatorOnly`).
- **F6** — `vitest.config` com `include: ['src/**/*.test.ts']` + `exclude: ['lib/**','node_modules/**']` (+ `fileParallelism:false` p/ suites que compartilham o emulator).
- **F7** — `canTransition` finalmente no write path: Function `transitionTenant`.
- **F8** — seed grava `criadoEm` só na criação.
- **F9** — TODO nas rules p/ leitura pública de eventos publicados (fluxo de compra, E04) — não aberto agora.

Suite emulator: **150 testes verdes** (`firebase emulators:exec --only firestore --project demo-leela "npx vitest run"`). type-check + lint verdes em `@leela/core`, `@leela/api-client`, `@leela/functions`.

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
