# Brief enriquecido — LEELA Onda 0 (trace: leela-build-2d6ee98d)

**Empresa despachada:** software-forge · **Projeto:** LEELA — ticketeira/marketplace multi-tenant para corridas
**Raiz do projeto:** `C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA`
**Fonte da verdade:** `leela-specs/` — IMPLEMENTATION-PLAN.md (stack + ondas), V1-CHECKLIST.md (tasks), epics/LEELA-E00-fundacao-tecnica.md, epics/LEELA-E01-design-system.md, epics/LEELA-E16-plataforma-superadmin.md, adr/ (ADR-004..011), modelo-de-dados-firestore.md, definition-of-done.md, estrategia-testes.md.

## Missão da Onda 0
Levantar a fundação: monorepo Turborepo+pnpm, apps (painel Vite+React Router, landing Next.js, mobile Expo), packages (core, design-system, api-client), Firebase (Firestore+Auth+Functions) + Emulator, CI GitHub Actions, Sentry (env-gated), Design System tema brasa como código, multi-tenancy fundacional E16-S1600. 23 tasks. Onda 0 roda 100% no Emulator — nenhuma chave real.

## Lotes e dependências
- **A (serial, bloqueia tudo):** S000-1-T1 monorepo raiz + git init + bootstrap toolchain.
- **B (paralelo, dirs distintos):** S000-1-T2 (painel+landing) · S000-1-T3 (mobile Expo) · S000-1-T4 (packages).
- **C:** S000-2-T1 Firebase+Emulator → S000-2-T2 Auth+claims · S000-4-T1 convenções · S000-4-T2 PaymentProvider+mock.
- **D:** E01 completo (S001-1-T1 tokens → T2 ThemeProvider → S001-2-* → S001-3-* → S001-4-*).
- **E:** S1600-T1 tenants → S1600-T2 setTenantClaims → S1600-T3 Rules isolamento + testes.
- **F:** S000-3-T1 CI · S000-3-T2 Sentry (placeholder DSN via env).

## Invariantes (valem para TODA task)
- TypeScript strict; sem `any` não justificado. Paths `@leela/*`.
- Tokens do design-system, zero hardcode de cor/spacing/radius.
- Toda coleção nova cria Security Rules na mesma task; toda query/rule filtra por `tenantId` (ADR-009).
- Agregados só por Function idempotente; webhook idempotente e assinado.
- Nada de segredo no cliente; sem localStorage para domínio.
- "kit" nunca "tier" (RN-216). PaymentProvider/EmailProvider plugáveis (ADR-006). Inscrição = pedido em grupo (ADR-011).
- Domínio público sempre `{DOMINIO_LEELA}`, nunca fixar be-hero.com.br.
- 1 task = 1 commit atômico (conventional commits). Ao fechar task: marcar `[x]` no V1-CHECKLIST.md e atualizar a story em `leela-specs/backlog/LEELA-S###.md`.

## Critérios de aceite da onda (gate)
1. `pnpm turbo run lint type-check test build` verde na raiz.
2. `firebase emulators:start` sobe Firestore+Auth+Functions (se Java disponível; senão flag pendência).
3. Testes de Rules provam isolamento por tenant (S1600-T3).
4. DoD (`leela-specs/definition-of-done.md`) satisfeito item a item por tipo de task.
