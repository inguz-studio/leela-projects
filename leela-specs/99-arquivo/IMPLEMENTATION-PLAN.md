---
tags: [leela, implementation, prd, stack, fable5]
aliases: [Implementation Plan, Mini PRD, Stack]
---

# Leela · Implementation Plan (mini PRD para o Fable 5)

> Documento único para arrancar o desenvolvimento. Resume objetivo, stack definitiva, o que faremos (V1) e como o Fable 5 executa. Fonte de escopo: [[V1-PRODUTOR-web]] · [[V1-CHECKLIST]] · [[BACKLOG]]. Refina o [[ADR-stack]].

---

## 1 · Objetivo

Construir a **V1 do Leela**: o sistema operacional do **produtor de eventos** na web (tickets, clubs, vendas, landing, comunicação, dashboard) + um **app simples** do atleta, sobre uma arquitetura de **marketplace multi-tenant** (vários produtores, cada um com base/eventos/tickets isolados e termos comerciais próprios; super-admin da plataforma no topo). Há um sócio-produtor real esperando o sistema rodar.

Prova de valor da V1: o produtor cria evento → vende ingresso (landing/checkout) → gere inscritos e entrega → comunica → vê receita; o promotor opera self-service; o atleta compra e recebe no app. Retenção clube-vs-solo é instrumentada em segundo plano.

---

## 2 · Stack definitiva

| Camada | Escolha | Notas |
|---|---|---|
| Linguagem | **TypeScript** (strict) | compartilhado web + mobile |
| Painel admin (web, V1) | **Vite + React** (SPA) | atrás de login, sem SEO → Vite é ideal |
| UI / componentes | **Tailwind CSS + shadcn/ui** (Radix) | tema **brasa** (tokens do E01 → `tailwind.config` + tema shadcn) |
| Formulários + validação | **React Hook Form + Zod** (`zodResolver`) | schemas Zod moram em `packages/core` (reuso client/server) |
| Dados de servidor | **TanStack Query** + **Firebase SDK** | cache, revalidação, listeners Firestore |
| Estado de UI leve | **Zustand** (opcional) | só onde precisar de estado global de UI |
| Roteamento (SPA) | **React Router** (ou TanStack Router) | rotas do painel |
| Backend / infra | **Firebase** — Firestore, **Auth** (custom claims `role`+`tenantId`), **Cloud Functions** | multi-tenant por Security Rules (ADR-009) |
| Landing pública (E12, SEO) | **Next.js** (SSR) *ou* Astro + React islands | app separado no monorepo; decidir no início do E12. Recomendo Next.js |
| Mobile (Onda 3) | **Expo (React Native)** | reusa `packages/core` + tokens; EAS Build/Submit |
| Monorepo | **Turborepo + pnpm** | `apps/*` + `packages/*` + `functions/` |
| Pagamentos | interface **`PaymentProvider`** | gateway concreto = ADR-006 depois (Pagar.me/Asaas); sandbox no início |
| Gráficos (dashboard) | **Recharts** | KPIs de E02 |
| Ícones · datas | **Lucide** · **date-fns** | |
| Testes | **Vitest + Testing Library** · **Firebase Emulator** · **Playwright** (e2e) · Detox/Maestro (mobile) | ver [[estrategia-testes]] |
| Observabilidade | **Sentry** | web + mobile |
| CI/CD | **GitHub Actions** | lint + type-check + test + build + preview |

**Design → código:** os tokens do Design System v3 (tema brasa: Brasa `#FF450C`, Exo 2, superfícies flat §2.16) viram o `tailwind.config.ts` (cores/spacing/radius) + o tema do shadcn/ui. Componentes shadcn são customizados para os padrões §2.x (Table densa §2.5, ConfirmModal §2.15, SubNav §2.14).

---

## 3 · Arquitetura

```
leela/                      # monorepo (Turborepo + pnpm)
├── apps/
│   ├── painel/             # Vite + React — painel do produtor + super-admin (route group /plataforma, guard por claim)
│   ├── landing/            # Next.js/Astro — páginas públicas (evento/clube) + checkout (SSR/SEO)
│   └── mobile/             # Expo — app do atleta (Onda 3)
├── packages/
│   ├── core/               # domínio, tipos, schemas Zod, regras (RN-xxx), PaymentProvider/TrainingProvider (interfaces)
│   ├── design-system/      # tokens (tema brasa) + componentes shadcn/ui customizados (§2.x)
│   └── api-client/         # SDK tipado Firestore/Functions
├── functions/              # Cloud Functions (agregados ∑, split, webhooks, claims, multi-tenant)
└── leela-specs/            # este plano
```

**Fundacional (Onda 0):** multi-tenancy (ADR-009) — todo dado de negócio carrega `tenantId`; Security Rules isolam por tenant; `platform_admin` cruza. Auth com claims `role` + `tenantId`.

---

## 4 · O que faremos (V1, por onda)

Detalhe task-a-task em [[V1-CHECKLIST]] (142 tasks) e por story em [[BACKLOG]].

- **Onda 0 · Fundação (23 tasks):** monorepo, app Vite + Firebase (Firestore/Auth/Functions) + Emulator, CI, Sentry; Design System como código (Tailwind+shadcn tema brasa); **multi-tenant E16-S1600** (isolamento + claims).
- **Onda 1 · Operar (59):** E03 operação do evento · E02 dashboard · E05 clubs (núcleo + desafio mínimo) · E16-slim (onboard tenant + termos comerciais).
- **Onda 2 · Vender (46):** E04 vendas/afiliação/split · E08 promotor self-service · E12 landing + checkout (Next.js) · E06 comunicação.
- **Onda 3 · App simples (14):** E13-slim (descobrir → comprar → ingresso QR → push → ler clube).

**Fora da V1:** anti-streak completo, integrações de treino (E14), Creator Studio (E15), E07/E09/E10/E11, recorrências de mensalidade (E16 S1603/S1604).

---

## 5 · Convenções (todo PR herda)

- **1 task = 1 PR.** DoD em [[definition-of-done]]; aceite em Given/When/Then (nas notas de story).
- **Tokens, nunca hardcoded** — cor/spacing/radius via Tailwind/tema; flat §2.16.
- **Zod como fonte de schema** (client + server + Firestore validation) em `packages/core`.
- **Firestore:** toda query/rule filtra por `tenantId`; agregados só por Function; nada de segredo no cliente; sem `localStorage` para domínio.
- **Copy** do glossário; "kit" nunca "tier" (RN-216); voz do coordenador (não institucional).
- Testes conforme [[estrategia-testes]]; cobertura máxima em pagamento/split.

---

## 6 · Como o Fable 5 executa

1. Ler este plano → [[V1-CHECKLIST]] → épicos referenciados + [[ADR-multitenancy]] + [[modelo-de-dados-firestore]].
2. Construir **na ordem das ondas**; começar pela **Onda 0**.
3. Cada task: implementar → testes → DoD → PR. Ao concluir, marcar a subtarefa na nota da story (`backlog/LEELA-S###.md`) e mover o `status`.
4. Multi-tenancy (E16-S1600) vem **antes** de qualquer dado de domínio.

---

## 7 · Kickoff — prompt pronto para a Onda 0

> Cole no Fable 5, no repositório vazio do Leela:

```
Você vai iniciar o Leela — um marketplace/ticketeira multi-tenant. Stack: TypeScript, monorepo Turborepo+pnpm; painel em Vite+React com Tailwind+shadcn/ui (tema "brasa"), React Hook Form+Zod, TanStack Query; backend Firebase (Firestore, Auth com custom claims role+tenantId, Cloud Functions) + Emulator; Sentry; GitHub Actions.

Leia os specs em leela-specs/ (comece por IMPLEMENTATION-PLAN.md, V1-CHECKLIST.md, ADR-multitenancy.md, modelo-de-dados-firestore.md, epics/LEELA-E00-fundacao-tecnica.md, epics/LEELA-E01-design-system.md, epics/LEELA-E16-plataforma-superadmin.md).

Execute a ONDA 0 (23 tasks), 1 task = 1 PR, na ordem:
1. E00: scaffold monorepo (apps/painel Vite, packages/core|design-system|api-client, functions), TS strict, ESLint/Prettier, Turborepo pipeline.
2. E00: Firebase init (Firestore+Auth+Functions+Emulator), deny-by-default rules, CI GitHub Actions, Sentry.
3. E01: tokens do Design System v3 (tema brasa) → tailwind.config + tema shadcn; componentes base (Button, Input, Table densa §2.5, Modal/ConfirmModal §2.15, Sidebar/SubNav, Toast, Badge, Card).
4. E16-S1600: multi-tenancy fundacional — coleção tenants/{id}, custom claims role+tenantId, Security Rules de isolamento (dado de um tenant nunca vaza; platform_admin cruza), testes de regra no Emulator.

Respeite o DoD (leela-specs/definition-of-done.md). Ao terminar cada task, atualize a subtarefa correspondente em leela-specs/06-backlog/backlog/. Pare ao fim da Onda 0 e me mostre o que rodou.
```

---

## 8 · Gates

Cada task fecha pelo [[definition-of-done]]; testes por [[estrategia-testes]]. Fim de onda: fluxo navegável + testes verdes. Métrica de retenção instrumentada em background (não bloqueia a V1).

Ver também: [[HOME]] · [[ROADMAP]] · [[V1-PRODUTOR-web]] · [[BACKLOG]]
