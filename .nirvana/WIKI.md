# WIKI — mapa de contexto do monorepo LEELA

> Destilação para agentes: leia isto (~2k tokens) e saia navegando sem escanear o repo.
> Stack: pnpm + Turborepo + TypeScript strict + Firebase (Firestore/Functions v2/Auth). Testes em Vitest.
> Domínio em PT-BR (`atleta`, `clube`, `criadoEm`); código/arquivos em EN; rotas web em PT-BR kebab.

## 1. Workspaces (o que é · o que NUNCA fazer)

- `apps/painel` — Web SPA Vite+React+React Router (área produtor/admin). NUNCA hardcode de token visual; NUNCA `localStorage` p/ estado de domínio; NUNCA ler agregado do cliente sem passar pela Function.
- `apps/landing` — Web SSR Next.js App Router (checkout público). NUNCA segredo sem prefixo `NEXT_PUBLIC_`.
- `apps/mobile` — Expo/React Native (app do atleta, E13-slim). NUNCA subir `metro maxWorkers` (fica em 2 — exit 134).
- `packages/core` — tipos de domínio + RNs puras + interfaces plugáveis (`PaymentProvider`). NUNCA I/O, Firebase ou side-effect aqui; só lógica pura testável.
- `packages/design-system` — tokens + componentes. NUNCA valor hardcoded (cor/spacing/radius/tipo); regra ESLint `leela-tokens/no-hardcoded-tokens` = error.
- `packages/api-client` — wrapper do Firebase client SDK + helpers tipados (`firebase.ts`, `auth.ts`, um `.ts`/pasta por domínio). NUNCA lógica de negócio; NUNCA Admin SDK (é client).
- `functions` — Cloud Functions (Node 20). Únicas que escrevem agregados ∑ e setam claims. NUNCA confiar em input do cliente; validar sempre no servidor.
- `e2e` — Playwright cross-app. NUNCA lógica de domínio.

## 2. Onde cada coisa vive

- **Tipos/RNs de domínio** → `packages/core/src/<dominio>/` — domínios: `eventos`, `clubs`, `finance`, `overview`, `payments`, `platform`.
- **Wrappers client** → `packages/api-client/src/` (`eventos/`, `platform/`, `clubs.ts`, `overview.ts`, `auth.ts`, `firebase.ts`).
- **Functions** → `functions/src/<dominio>/<nomeFunction>.ts` (`eventos/`, `clubs/`, `platform/`, `payments/`, `overview/`, `auth/`, `seed/`).
- **Telas painel** → `apps/painel/src/routes/<dominio>/` (`eventos/`, `clubes/`, `plataforma/`).
- **Security Rules** → `firestore.rules` (deny-by-default). Blocos por coleção: `tenants/{tenantId}` (+ `commercialTerms`, `subscriptions`), `platform`, `eventos` (+ `inscritos`, `kits`), `clubes` (+ `membros`, `desafios/{id}/acoes`, `permissoesAdmin`), `comunicados`, `parcerias`, `programaAfiliacao`, `pagamentos`, `equipe`, `promotores`, `itensKit`, `atletas` (global), `catalogoAcoes` (global), `profissionais/{id}/dashboard`, `config`.
- **Testes** (Vitest, colocados em `__tests__/` ou ao lado): `*.test.ts` = unit puro · `*.integration.test.ts` = precisa do emulator · `*Rules.test.ts` / `*Rules.integration.test.ts` = Security Rules no emulator · `*.regression.test.ts` = regressão fixada.

## 3. Convenções inegociáveis

- **1 task = 1 commit**, atômico: `feat(escopo): descrição EN [LEELA-S###-T#]`. Staging SELETIVO sempre (nunca `git add -A`); há agentes paralelos no worktree.
- **Commit só depois** de build + type-check + lint + testes da task verdes.
- **Mutexes por `mkdir` na raiz** (loop até sucesso; `rmdir` ao liberar):
  - `.forge-mutex` — `pnpm install` e qualquer `git add`/`commit`.
  - `.rules-mutex` (+ `HOLDER.txt`) — editar `firestore.rules`; RELER do disco ao adquirir.
  - `.emu-mutex` — emulator / pipeline pesado.
  - `.index-mutex` — barrels compartilhados (`index.ts`).
- **Emulator**: `JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"` (Java 21, fora do PATH), `firebase emulators:exec --only firestore,auth`. Git Bash.
- **Turbo concurrency 6**, metro maxWorkers 2 — NÃO subir (root-cause do exit 134).
- **Suíte / baseline**: `pnpm turbo run test` (por pacote é `vitest run`). **Baseline 531/531, zero skip.** Integration/Rules exigem emulator ligado (Java 21). Rules isoladas: `functions` → `pnpm test:rules`.
- **DS obrigatório nas telas** (tag `e01`): shell padrão, tokens semânticos, zero hardcode. Componentes em `packages/design-system/src/components/` (AppShell, Button, Table, Modal, SubNav, EmptyState, Skeleton, Toast, CardEvento, CardDesafio…).
- `strict:true` + `noUncheckedIndexedAccess`; `any` proibido sem justificativa. Nunca `tier` (use `kit`, RN-216); nunca gateway concreto no domínio (use `PaymentProvider`).
- **Roteamento de modelo (Regra L 2026-07-19, AMENDADA pelo dono em 2026-07-29)**: teto = **Opus** (Fable fora; estouro escala para o humano). Crítico — dinheiro, segurança, rules, PII, review antagonista, veredito de gate, root-cause, spec/organização — roteia **Opus**. **Sonnet e Haiku liberados** para tarefa mecânica/bem especificada, DESDE QUE a organização (spec, fila, aceite) tenha saído de Opus e haja gate executável por task: Sonnet para execução mecânica de volume/UI com spec fechada; Haiku para transform com gate determinístico. Verbatim do dono e histórico: rodada DEC-0729 + `leela-specs/01-produto/ROADMAP.md` §Rota de modelo.

## 4. Contratos e padrões estabelecidos (extraídos do código real)

- **Agregados ∑ por recontagem `count()`**, nunca `increment` — funções em `functions/src/clubs/{membrosAggregates,desafiosAggregates}.ts`, `onComunicadoEnvio`, `onConversao`. Cliente nunca escreve agregado.
- **Claims via `mergeTenantClaims`** (`functions/src/platform/setTenantClaims.ts`): merge preserva claims não relacionadas; `role`/`tenantId` autoritativos; `tenantId` REMOVIDO p/ papéis sem tenant (`platform_admin`, `athlete`). Roles: `platform_admin`, `tenant_owner`, `tenant_staff`, `promoter`, `athlete`. Só `platform_admin` invoca; `setTenantClaimsAdmin` é Admin-only (bypassa Rules).
- **Ownership**: `tenants/{tenantId}` com `ownerUid → profissionais/{ownerUid}`. Provisionamento: `tenantId == slug` (kebab-case determinístico → idempotente/retry-safe); validação pura em `packages/core/src/platform/provisioning.ts` (`validateProvisionInput`, `buildInitialTerms`).
- **Termos versionados** (`packages/core/src/platform/commercialTerms.ts`): doc `tenants/{id}/commercialTerms/current` carrega `versao` (int ≥1); cada save grava snapshot imutável `commercialTerms/v{versao}` (create-only). Bump: create exige versao 1; update exige anterior+1. Default fee 10,5%; `saasMonthlyFee: 0` é válido (produtor-sócio, RN-405).
- **`derivarStatus` RN-102** (`packages/core/src/clubs/membro.ts`): status do membro (`ativo`/`novo`<7d/`inativo`≥30d) é PURO e derivado por DATA — escrito só por Function, nunca pelo cliente. `MEMBRO_NOVO_DIAS=7`, `MEMBRO_INATIVO_DIAS=30`.
- **Guarda de papel conflitante** no provisioning + rollback ordenado (HOTFIX-E16): corrida `onCreateUser`×`provisionTenant` tratada; provisionamento atômico (Auth+Firestore+claims, RN-403).
- **Padrão de tela do painel** (referência canônica: `apps/painel/src/routes/eventos/`): `hub/` (lista+cards), `novo/` (form+`validacao.ts`), `evento/` (detalhe/layout), `_components/`, `_data/` (`contracts.ts` = contrato tipado com o backend, `session.ts`), `_lib/` (`status.ts`, `kpis.ts`, `alertas.ts`, `subnav.ts` + `__tests__/`). Toda lista tem empty state + contador; ações destrutivas com ConfirmModal; feedback via Toast; UI trata `failed-precondition`.

## 5. Onde está a verdade

- **`.nirvana/HANDOFF.md`** — estado vivo da build (WIP por dono, lotes em voo, ordem de retomada). Frase de entrada: "retomar leela". Sempre atualizar ao chegar em limite de cota.
- **`.nirvana/briefs/`** — specs por lote (`onda1-E0X-lotes.md`, `-enriched.md`). **`.nirvana/plans/`** — decisões de onda.
- **`leela-specs/V1-KANBAN.md` + `V1-CHECKLIST.md`** — progresso. Regra do Vitor: atualizar SEMPRE os DOIS, com hash do commit.
- **`.nirvana/outputs/<trace>/`** — sumários, gates e reviews (gitignored). Trace atual: `leela-build-2d6ee98d`.
- **`leela-specs/modelo-de-dados-firestore.md`** — modelo de dados Firestore (coleções, ∑ agregados, 🔁 desnormalização, RNs). Fonte de verdade das coleções.
- Complementos: `leela-specs/{convencoes-codigo,definition-of-done,estrategia-testes,governanca-design}.md`, `adr/`.

## 6. RTK — economia de tokens (obrigatório p/ agentes)

`rtk` (instalado em `~/.local/bin`, auditado) comprime saída de comandos verbosos 60-90% antes de virar contexto. **Prefixe**: `rtk git status`, `rtk git log`, `rtk vitest run ...`, `rtk tsc`, `rtk grep`/`rtk rg`, `rtk ls`/`rtk tree`, `rtk err <build>`. **NÃO prefixe**: `git diff` (denso, ganho ~4%), commits/push, nem comandos cuja saída crua você precise citar como evidência (reviews/gates citam cru). Falhas preservam exit code + stderr integral sob `[FAIL]`. **PROIBIDO**: `rtk proxy` e `rtk run` (deny rules de segurança, CVE-2026-33068).
