# LEELA-E00 · Fundação Técnica

- **Superfície:** Todas
- **Horizonte:** H1 (Onda 0 — bloqueia tudo)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 📋 Backlog (novo — fase de código)
- **Depende de:** —
- **De-para:** (novo; complementa BH-E01 Foundation, que era o design system visual do protótipo)

## Objetivo

Levantar o esqueleto técnico da plataforma Leela: monorepo Turborepo com as três apps (painel web — Vite + React SPA com React Router; landing web — Next.js SSR/SEO; app mobile — Expo), os pacotes compartilhados (`core`, `design-system`, `api-client`), o backend Firebase (Firestore + Auth + Functions), CI/CD e observabilidade. A camada de UI usa Tailwind CSS + shadcn/ui (Radix); formulários com React Hook Form + Zod (`zodResolver`, schemas em `packages/core`); estado de servidor com TanStack Query sobre o Firebase SDK. Nada de domínio ainda; é o chão sobre o qual todos os épicos rodam.

## Personas & JTBD

Infraestrutura — serve indiretamente todas as personas. Habilita o time (e o Fable 5) a construir com consistência e a fazer deploy com segurança.

## Critérios de sucesso do épico

- `pnpm dev` sobe painel + landing local; app Expo abre no simulador.
- Firebase Emulator Suite roda Firestore + Auth + Functions localmente.
- Um commit dispara CI (lint + type-check + test + build) verde.
- Deploy de preview do painel funciona; Sentry captura um erro de teste.
- `packages/core` exporta os tipos base do domínio e a interface `PaymentProvider`.

## Regras de negócio aplicáveis

- ADR-004 (Vite painel + Next.js landing), ADR-005 (Firestore), ADR-007 (Turborepo), ADR-008 (Firebase Auth), ADR-006 (`PaymentProvider` plugável), ADR-010 (Tailwind + shadcn/ui · RHF + Zod · TanStack Query). Ver `adr/ADR-stack.md`.

## Modelo de dados tocado

Nenhuma coleção de domínio ainda. Cria a **baseline de Security Rules** (deny-by-default) e o setup do Firestore. Ver `modelo-de-dados-firestore.md`.

## Fora de escopo (Won't nesta fase)

- Componentes visuais do design system (isso é LEELA-E01).
- Qualquer tela de domínio (Clubs, Eventos).
- Escolha do gateway de pagamento concreto (só a interface — ADR-006).

---

## User stories

### LEELA-S000-1 · Monorepo e apps scaffolding · (novo)

**Como** time de engenharia, **quero** um monorepo com as três apps e os pacotes compartilhados, **para** compartilhar domínio e design system entre web e mobile sem duplicação.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Todas
- **RNs:** ADR-004, ADR-007

**Critérios de aceite (Given/When/Then):**
- **Dado** o repositório limpo, **quando** rodo o setup, **então** existe a estrutura `apps/{painel,landing,mobile}` + `packages/{core,design-system,api-client}` + `functions/` e `pnpm dev` sobe painel e landing.
- **Dado** o monorepo, **quando** altero `packages/core`, **então** painel e mobile enxergam a mudança (workspace linkado), e o cache do Turborepo evita rebuild desnecessário.

**Tasks:**

#### LEELA-S000-1-T1 · Inicializar monorepo Turborepo + pnpm workspaces

- **Tipo:** setup · **Depende de:** — · **Bloqueia:** todas · **Estimativa:** S

**Objetivo**
Criar a raiz do monorepo com pnpm workspaces + Turborepo, TS base e lint/format compartilhados.

**Arquivos (criar)**
- `package.json` (workspaces), `pnpm-workspace.yaml`, `turbo.json`
- `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.editorconfig`
- `README.md` (como rodar)

**Passos**
1. `pnpm init`; definir workspaces `apps/*`, `packages/*`, `functions`.
2. Adicionar Turborepo; pipeline `dev/build/lint/test/type-check` em `turbo.json` com cache.
3. TS base estrito (`strict: true`), paths para `@leela/*`.
4. ESLint + Prettier compartilhados.

**Critérios de aceite**
- Dado o repo, quando rodo `pnpm turbo run build`, então executa (mesmo vazio) com cache configurado.

**Testes:** n/a (setup) — validar com `turbo run lint` verde.
**DoD:** ver checklist Task.
**Fora de escopo:** apps e pacotes concretos (tasks seguintes).

#### LEELA-S000-1-T2 · Scaffold `apps/painel` (Vite + React) e `apps/landing` (Next.js)

- **Tipo:** setup · **Depende de:** T1 · **Estimativa:** M

**Objetivo**
Criar as duas apps (TS), com layout raiz mínimo e healthcheck: `apps/painel` em Vite + React (SPA) com React Router; `apps/landing` em Next.js (App Router, SSR/ISR).

**Arquivos (criar)**
- `apps/painel/` (Vite + React SPA, `src/main.tsx`, `src/App.tsx`, `src/routes/` com React Router)
- `apps/landing/` (Next.js App Router, `app/layout.tsx`, `app/page.tsx`; SSR/ISR habilitado)
- configs `apps/painel/vite.config.ts`, `apps/landing/next.config.js`, `tsconfig.json` estendendo base; Tailwind CSS + shadcn/ui em ambas

**Passos**
1. `apps/painel`: `create-vite` (React + TS) + React Router; `apps/landing`: `create-next-app` (App Router, TS, sem exemplo).
2. Consumir `@leela/design-system` e `@leela/core` como dependências de workspace (stubs).
3. Rota `/health` retornando ok em ambas.

**Critérios de aceite**
- Dado `pnpm dev`, quando abro painel e landing, então ambas sobem sem erro e `/health` responde.

**Testes:** smoke e2e `/health` (Playwright).
**DoD:** ver checklist.
**Fora de escopo:** telas de domínio.

#### LEELA-S000-1-T3 · Scaffold `apps/mobile` (Expo)

- **Tipo:** setup · **Depende de:** T1 · **Estimativa:** M

**Objetivo**
App Expo (React Native, TS) que consome os pacotes compartilhados e abre no simulador.

**Arquivos (criar)**
- `apps/mobile/` (Expo Router, `app/_layout.tsx`, `app/index.tsx`)

**Passos**
1. `create-expo-app` (TS, Expo Router).
2. Linkar `@leela/core` (e `design-system` na variante RN).
3. Tela inicial placeholder consumindo um tipo de `core`.

**Critérios de aceite**
- Dado o simulador, quando rodo o app, então abre a tela inicial sem erro.

**Testes:** smoke (Detox/Maestro) — abrir app.
**DoD:** ver checklist. **Fora de escopo:** jornada do atleta (E13).

#### LEELA-S000-1-T4 · Pacotes compartilhados `core`, `design-system`, `api-client` (esqueleto)

- **Tipo:** setup · **Depende de:** T1 · **Estimativa:** S

**Objetivo**
Criar os três pacotes com build tsup e exports públicos vazios/typed.

**Arquivos (criar)**
- `packages/core/` (tipos de domínio base: `Clube`, `Evento`, `Membro`, `Atleta`, `Profissional` — só types + a interface `PaymentProvider`)
- `packages/design-system/` (export vazio; preenchido em E01)
- `packages/api-client/` (wrapper tipado Firestore/Functions — stub)

**Passos**
1. Cada pacote com `package.json`, `tsconfig`, build tsup, `src/index.ts`.
2. `core` declara os tipos base (do `modelo-de-dados-firestore.md`) e `interface PaymentProvider { createCharge, splitRules, refund, handleWebhook, getPayout }`.

**Critérios de aceite**
- Dado `core`, quando importo `PaymentProvider` no painel, então o tipo resolve.

**Testes:** type-check.
**DoD:** ver checklist.

---

### LEELA-S000-2 · Backend Firebase (Firestore + Auth + Functions + Emulators) · (novo)

**Como** time de engenharia, **quero** o projeto Firebase configurado com emulador local, **para** desenvolver e testar backend sem tocar produção.

- **MoSCoW:** Must · **Estimativa:** M · **RNs:** ADR-005, ADR-008

**Critérios de aceite:**
- **Dado** o emulador, **quando** rodo `firebase emulators:start`, **então** Firestore, Auth e Functions sobem localmente e o painel conecta neles em dev.
- **Dado** as Security Rules, **quando** um cliente tenta ler coleção sem permissão, **então** é negado (deny-by-default).

**Tasks:**

#### LEELA-S000-2-T1 · Inicializar Firebase (Firestore + Functions + Auth) + Emulator Suite

- **Tipo:** setup · **Depende de:** S000-1-T1 · **Estimativa:** S

**Arquivos (criar)**
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`
- `functions/` (TS, Node runtime), `functions/src/index.ts`

**Passos**
1. `firebase init` (Firestore, Functions TS, Emulators: Firestore/Auth/Functions).
2. `firestore.rules` deny-by-default.
3. Painel/landing usam client SDK apontando ao emulador em dev (via env).

**Critérios de aceite**
- Dado `firebase emulators:start`, quando abro o painel em dev, então lê/escreve no emulador.

**Testes:** integração — regra deny-by-default nega leitura anônima.
**DoD:** ver checklist API.

#### LEELA-S000-2-T2 · Firebase Auth (email/senha + Google + Apple) + custom claims de papel

- **Tipo:** integration · **Depende de:** T1 · **Estimativa:** M

**Objetivo**
Login funcional com os provedores exigidos (Apple obrigatório p/ App Store) e claims de papel (atleta/coordenador/organizador/admin).

**Arquivos**
- `functions/src/auth/onCreateUser.ts` (cria doc `atletas/{uid}` ou `profissionais/{uid}`; seta claim default)
- `packages/api-client/src/auth.ts`

**Passos**
1. Habilitar provedores no Auth.
2. Function `onCreateUser` cria o doc e claim inicial.
3. Helper de client para login/logout/estado de sessão.

**Critérios de aceite**
- Dado um novo usuário, quando faz login com Google, então existe `atletas/{uid}` e claim `role` setado.

**Testes:** integração (emulator Auth + Functions).
**DoD:** ver checklist. **Fora de escopo:** telas de login estilizadas (E01/E12).

---

### LEELA-S000-3 · CI/CD e observabilidade · (novo)

**Como** time, **quero** CI que valide todo PR e Sentry captando erros, **para** manter qualidade e ter visibilidade em produção.

- **MoSCoW:** Must · **Estimativa:** S

**Critérios de aceite:**
- **Dado** um PR, **quando** abre, **então** roda lint + type-check + test + build; falha bloqueia merge.
- **Dado** um erro em runtime, **quando** acontece, **então** aparece no Sentry com release e contexto.

**Tasks:**

#### LEELA-S000-3-T1 · GitHub Actions (lint/type/test/build) + preview deploy

- **Tipo:** setup · **Depende de:** S000-1-T2 · **Estimativa:** S
- **Arquivos:** `.github/workflows/ci.yml`, `.github/workflows/preview.yml`
- **Passos:** pipeline Turborepo com cache; deploy de preview do painel (Firebase Hosting/Cloud Run).
- **Aceite:** PR verde obrigatório; preview gera URL.
- **Testes:** o próprio CI executando a suíte.

#### LEELA-S000-3-T2 · Sentry (web + mobile) + gestão de env

- **Tipo:** integration · **Depende de:** S000-1-T2/T3 · **Estimativa:** S
- **Arquivos:** init Sentry em `apps/painel`, `apps/landing`, `apps/mobile`; `.env.example`
- **Passos:** SDK + source maps no build; env por ambiente (dev/preview/prod); sem segredo no cliente.
- **Aceite:** erro de teste aparece no Sentry com release.
- **Testes:** disparar erro proposital em staging.

---

### LEELA-S000-4 · Convenções e `PaymentProvider` (interface) · (novo)

**Como** time (e o Fable 5), **quero** convenções de código e a interface de pagamento definidas, **para** que todo épico seguinte programe contra contratos estáveis.

- **MoSCoW:** Must · **Estimativa:** S · **RNs:** ADR-006

**Critérios de aceite:**
- **Dado** `packages/core`, **quando** um épico precisa cobrar/split, **então** usa `PaymentProvider` (interface), nunca um SDK de gateway direto.
- **Dado** o repo, **quando** um dev entra, **então** `convencoes-codigo.md` explica estrutura, nomes e padrões.

**Tasks:**

#### LEELA-S000-4-T1 · Documento de convenções de código

- **Tipo:** setup · **Estimativa:** XS
- **Arquivos:** `leela-specs/convencoes-codigo.md`
- **Conteúdo:** estrutura de pastas, nomes (PT-BR no domínio/UI, EN em código/tipos), padrão de commits, 1 PR = 1 task, uso de tokens do DS, proibição de `localStorage` para domínio.

#### LEELA-S000-4-T2 · Interface `PaymentProvider` + adapter mock/sandbox

- **Tipo:** api/function · **Depende de:** S000-1-T4 · **Estimativa:** S
- **Arquivos:** `packages/core/src/payments/PaymentProvider.ts`; `functions/src/payments/mockProvider.ts`
- **Passos:** definir a interface (createCharge, splitRules, refund, handleWebhook, getPayout) + um provider mock que simula confirmação e split, para destravar E04/E12 antes do fornecedor real.
- **Aceite:** dado o mock provider, quando crio uma cobrança com split, então recebo confirmação simulada e o repasse calculado.
- **Testes:** unit (cálculo de split) + integração (webhook idempotente).

---

## Ordem sugerida de execução do épico

`S000-1-T1 → T2/T3/T4 (paralelizáveis) → S000-2-T1 → T2 → S000-3 → S000-4`. Ao fim, a Onda 1 (E01 design system, depois E05/E03/E02) pode começar.

## US novas (Vitor 2026-07-13 — jornadas de conta do painel, lacuna apontada)

> O backend de Auth (S000-2-T2) existe desde a Onda 0, mas as TELAS ficaram "fora de escopo (E01/E12)" e nenhum épico as assumiu. O E07 já roteia anônimo→`/entrar` (placeholder). Bloco novo:

### LEELA-S020 · Jornadas de conta do painel (Organizador/staff) — proposta 2026-07-13
- **S020-T1 · Login `/entrar`** — e-mail+senha (Firebase Auth já configurado; Google/Apple ficam num segundo passo), erros honestos (credencial inválida sem enumerar contas), redirect pós-login p/ a rota de origem (o `RequirePapel` do E07 já manda anônimo pra cá), identidade DARK brasa sobre o DS.
- **S020-T2 · Recuperação de senha** — fluxo `sendPasswordResetEmail` + tela de confirmação neutra (sem revelar se o e-mail existe); página de redefinição.
- **S020-T3 · Cadastro de conta** — cria a conta Firebase do profissional; o ACESSO a tenant continua vindo por provisionamento (E16) ou convite de equipe (S304)/parceria (E18) — cadastro NÃO cria tenant (default defensável; mudar = decisão de produto).
- **S020-T4 · Configurações da conta** — perfil do usuário logado (nome, e-mail, troca de senha com reauth, foto se houver padrão de upload), separada das Configurações do TENANT (E16) e do EVENTO (S304-T2).
- Segurança: review antagonista Fable obrigatória no lote (fluxos de auth: enumeração, reset, session fixation, reauth na troca de senha).
