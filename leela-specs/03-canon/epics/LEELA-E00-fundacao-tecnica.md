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

### LEELA-S021 · Estabilidade da suíte de integração (SUITE-STAB) — ✅ ENTREGUE 2026-07-19

**Como** time, **quero** a suíte inteira de functions determinística mesmo em máquina lenta, **para** que o gate de suíte-verde seja confiável e nenhum lote fique refém de flakiness alheia.

- **Tasks (todas feitas):** T1 helper `functions/src/__tests__/helpers/stability.ts` + drain global no `vitest.setup.ts` · T2 wiring dos 21 arquivos flaky · T3 prova destrutiva do desenho (smoke falsificou pausa-por-teste → pausa sticky por arquivo) · T4 prova final (suíte 2× consecutivas verde: 164 arquivos / 2935 testes).
- **Causa-raiz pagada:** triggers de background do Functions Emulator rodam ASSÍNCRONOS ao vitest — backlog de execuções transborda entre arquivos e corre contra o clear+seed (seeds engolidos, leftovers, contenção 409/500) + janela do `onCreateUser` clobbera claims setadas no meio.

**REGRA DE INFRA DE TESTE (vale para todo teste de integração novo em functions/):**
1. `beforeEach`/`beforeAll` que limpa e semeia o Firestore usa os helpers de `helpers/stability.ts`: `withTriggersPaused(clearFirestoreDrained → seedVerified(canários))` — nunca `clearFirestore()`+seed cru.
2. Usuário de fixture no Auth Emulator nasce via `ensureUserWithClaims` (idempotente + à prova da janela do onCreateUser) — nunca `createUser`+`setCustomUserClaims` cru.
3. NUNCA re-habilitar background triggers dentro de `beforeEach` — o re-enable dispara reload das function definitions (~segundos) e mata o runtime em série; a pausa é sticky por arquivo e o `afterAll` global do `vitest.setup.ts` re-habilita 1× no fim.
4. Teste que precisa de entrega REAL de trigger em background no corpo do teste não usa a pausa — invoca o handler manualmente (padrão `runTrigger`) ou drena a convergência (padrão `provisionarDrenado`).
5. Suites sem `RulesTestEnvironment` limpam via `clearFirestoreRest` (bulk), nunca `recursiveDelete` doc-a-doc.
6. Comando canônico do gate de suíte: `npm run build && npx firebase-tools@13 emulators:exec --project demo-leela "npx vitest run"` (build SEMPRE antes — lição RN-822/CLAIMFIX).

## Delta cadastro completo do organizador (SPEC-ONBOARD · 2026-07-28)

A "decisão de produto" que a S020-T3 previu chegou — e o default **sobreviveu**: o
cadastro segue SEM criar tenant. O dono decidiu (verbatim na rodada
`02-rodadas/2026-07-28-onboarding-organizador/`) o modelo **cadastro aberto, acesso
travado**: quem cria o tenant é o resgate do código de convite (E16-S1609, RN-414). O que
muda aqui é o formulário (dados completos + LGPD) e a aterrissagem (home do painel, onde o
overlay do E16 recebe a conta travada). RNs: RN-411 (dona E16) e RN-412 (dona E00).

### LEELA-S030 · Cadastro completo do organizador (upgrade do `/cadastrar` da S020-T3)

**Como** organizador novo, **quero** me cadastrar informando todos os meus dados e
aceitando os termos, **para** entrar no painel e pedir a liberação do acesso com o código
de convite.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel · **V1-slim:** ✅ (bloqueia o go-live controlado)
- **Tela(s) de referência:** `/cadastrar` existente (S020-T3, identidade DARK brasa)
- **RNs:** RN-411, RN-412; disciplina S020 (erros sem enumeração de contas)

**Critérios de aceite (Given/When/Then):**
- **Dado** o formulário, **quando** cadastro, **então** informo nome, e-mail, senha, telefone/WhatsApp e nome da organização/produtora — obrigatórios (RN-412, P8; CPF/CNPJ fora, KYC segue no Won't do E16).
- **Dado** o consentimento LGPD, **quando** o formulário renderiza, **então** o checkbox nasce desmarcado, com finalidade declarada; o aceite é carimbado com `versao` + `aceitoEm` em `profissionais/{uid}.consentimentoLgpd` (RN-412).
- **Dado** cadastro válido, **quando** concluo, **então** a conta Auth (e-mail/senha) existe, `profissionais/{uid}` nasce com `statusOnboarding: 'aguardando_convite'` (RN-411) e aterrisso LOGADO na home — onde o overlay da S1609 me recebe.
- **Dado** que não há código, **quando** aterrisso, **então** nenhuma claim de tenant existe e nenhum dado de tenant responde (RN-400/401 — a tranca é Rules, não tela).
- **Dado** e-mail já cadastrado, **quando** tento, **então** o erro não enumera contas (disciplina S020).

**Tasks:**

#### LEELA-S030-T1 · Formulário completo + LGPD + aterrissagem logada
- **Tipo:** screen · **Depende de:** S020-T3 · **Bloqueia:** S030-T2, E16-S1609-T2 · **Estimativa:** M · **Rota:** opus

Evolui o `/cadastrar`: campos novos (telefone/WhatsApp, nome da organização), checkbox
LGPD desmarcado com finalidade, criação Auth + login automático + redirect para a home.
Testes: unit (validação, checkbox obrigatório e desmarcado por default) + e2e (cadastro →
home travada).

#### LEELA-S030-T2 · Doc `profissionais/{uid}` no cadastro + Rule
- **Tipo:** data-model · **Depende de:** S030-T1 · **Bloqueia:** E16-S1609-T1 · **Estimativa:** S · **Rota:** opus

Grava `profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'`, dados do form e
consentimento carimbado (modelo em `modelo-de-dados-firestore.md` §profissionais). Rule:
create do PRÓPRIO doc (`request.auth.uid == profId`) com shape validado; update de
`statusOnboarding` NEGADO ao cliente (só Function — quem promove é o resgate, RN-414).
Testes: ataque de Rules (criar doc de terceiro; auto-promover `statusOnboarding`).

## Delta o cadastro do organizador em produção, e o que a review provou (2026-08-03 · ONBOARD-BUILD → ONBOARD-REV)

A S030 (cadastro completo) e o roteamento pós-login saíram do papel em 03/08. Duas RNs
novas nascem aqui, com o E00 como dono, e as duas foram medidas antes de virar letra.

### RN-446 · o aceite LGPD é carimbo do servidor, e a ausência dele não é fabricável

O consentimento nasce com a **versão vigente** do termo (`TERMO_LGPD_VERSAO`, hoje
`2026-07-28`), a finalidade declarada e o instante do **servidor**: a Rule exige
`is timestamp`, que avalia `request.time`, então aceite datado pelo cliente é negado — caso
verde na suíte. Mudou o texto do termo, sobe a constante no mesmo commit.

A outra metade da regra é o que **não** se faz. Quando a escrita do perfil falha no
cadastro, o doc é recriado mais adiante pelo resgate do convite, e nasce **sem**
`consentimentoLgpd` — a pessoa marcou o checkbox, o registro nunca existiu. Preencher esse
campo por dedução carimbaria um consentimento que ninguém registrou, que é exatamente a
prova fabricada que a RN-412 recusa. Por isso a lacuna subiu como decisão do dono
(**LGPD-1** no painel) em vez de ser consertada por conta própria, e o **seed do primeiro
convite fica retido** até ela fechar.

### RN-448 · acesso único por precedência: uma conta, uma casa · ⚠ SUPERADA pela RN-449

> **Superada em 2026-08-04 (lane SPEC-ADMINSEP).** A premissa de que administração da
> plataforma e operação de painel cabem na mesma conta era **registro errado do maestro**, e
> o dono corrigiu: "É uma conta só somente para quem é organizador e cliente. A conta do
> painel admin, deve ser outra. os ambientes devem ser separados, por questões de
> segurança." A regra fica aqui, e não é apagada, porque apagar regra registrada apaga o
> histórico do erro. **O que sobrevive** dela está na tabela de destino abaixo, que continua
> valendo integralmente: o item 57 foi ratificado pelo dono e não foi revogado. **O que
> morre** é a leitura de "papel acumulado resolvido por precedência" — sob a RN-449 a conta
> de administração não tem outro papel a acumular, e vai para `/plataforma` por ser a única
> casa dela. Ver RN-449 e RN-450 abaixo.

Decisão do dono em 03/08, ratificada junto do item 57: a mesma pessoa pode acumular
administração da plataforma e operação de painel numa conta só, e **não se constrói seletor
de papel**. O destino pós-login sai por precedência:

| Conta | Destino |
|---|---|
| `platform_admin` (com ou sem doc de profissional) | `/plataforma` |
| organizador com tenant | `/` (Visão Geral) |
| sem tenant, **com** doc `profissionais/{uid}` | `/` — encontra o overlay de convite (reconciliação com a RN-411) |
| sem tenant e **sem** doc | barrada na tela de entrar, com aviso, e a sessão cai |
| deep-link guardado | vence o default, inclusive para o super-admin |

**Nota de modelo, para quem mexer:** `setTenantClaims` põe `platform_admin` em
`ROLES_WITHOUT_TENANT`, então a claim nunca carrega papel de admin e `tenantId` ao mesmo
tempo. Uma conta que "acumula" hoje é, na prática, uma conta `platform_admin` cujo tenant
só é alcançável pelas Rules de admin. A precedência é a única forma possível com o modelo
atual; o caso de teste (`d8d36697`) trava a decisão para o dia em que o modelo mudar.

### RN-449 · a conta do painel de plataforma é outra (nova, dona · 2026-08-04)

Correção do dono, verbatim: *"É uma conta só somente para quem é organizador e cliente. A
conta do painel admin, deve ser outra. os ambientes devem ser separados, por questões de
segurança."* Supera a RN-448.

Uma conta nunca acumula `platform_admin` com organizador nem com cliente. Conceder
administração a uma conta que já tem `profissionais/{uid}`, `atletas/{uid}`, vínculo de
compra em `pessoas.contaUid` ou papel de tenant vigente é **recusado** com
`failed-precondition` e mensagem própria citando a regra, nunca `internal`. O caminho inverso
segue aberto: rebaixar ou promover um administrador para outro papel é troca de lado, não
acúmulo, e o marcador `demotedFromRole` já distingue a demoção deliberada.

Do lado cliente, o escritor único do vínculo passa a olhar papel: comprar com o e-mail da
conta de administração **confirma a compra e não cria vínculo**, com a pendência carimbada no
pedido. Dinheiro fail-open, identidade fail-closed.

**Por que isso é de segurança e não de organização.** `isPlatformAdmin()` não recebe
`tenantId` e não avalia predicado de tenant (`firestore.rules:44-46`), então toda cláusula
que o cita é cross-tenant por construção, e são 129 delas. O papel alcança PII e dado de
saúde de participante de todos os tenants, com índice de `collectionGroup` que torna a
varredura uma consulta; dados bancários em claro; as máquinas de repasse e de estorno; a
tabela global de taxa; e `setTenantClaims` sem teto, que permite cunhar mais administradores
e derrubar todas as reservas desenhadas contra esse papel. Misturar esse token com a sessão
que abre e-mail de compra, na mesma origem e sem segundo fator, faz da recuperação de senha
do cliente o caminho de tomada da plataforma.

Detalhe medido em `02-rodadas/2026-08-02-retomada/09-spec-contas-e-area-cliente.md`; forma
testável e a allowlist de administração (premissa vetável) em `10-rns-contas-e-area-cliente.md`.

**Estado em 2026-08-05 · a metade (d) saiu do papel, e as duas que ela NÃO cobre estão nomeadas.**
A guarda do lado cliente está inteira em código e em teste (`b1bd5dc4`, `S032-T4`), com
`conta_admin_nao_vinculavel` como string de contrato, e foi **revisada por antagonista** em
contexto fresco (`8d779dce`+`7b69d544`+`d58caa5d`, aprovada com ressalvas). Três decisões da
construção sobreviveram ao ataque e vale registrá-las porque elas são a regra virando desenho:
o papel vem da **claim** e não do Firestore (a claim é a fonte única por RN-401, e ler o documento
criaria uma segunda verdade que diverge no dia em que alguém trocar de lado); a leitura é do uid
**final** e não do que a busca por e-mail devolveu, porque o re-read de corrida devolve conta
alheia e o buraco estaria justamente no caminho em que a conta não é nossa; e a falha de Auth
**propaga**, porque sem saber o papel não dá para afirmar que a conta não é de administração — a
compra segue intocada, e o pedido sem carimbo é a pendência observável.

**As duas metades que a RN-449d não cobre**, ambas medidas pela review e ambas no painel do dono:

1. **O estoque acumulado continua aberto.** A regra fecha o **fluxo**, nunca o **estoque**: a
   conta `platform_admin` que já tem ficha e carimbo antigos continua entrando na área do cliente
   e lendo as compras velhas. Quem dimensiona é a **A5** (`S032-T5`), a varredura só-leitura, e
   nenhuma migração vem antes do número dela. Item **ACUMULO-ESTOQUE-1**.
2. **A área fica muda para quem foi recusado.** O `motivo` está carimbado no pedido e não chega a
   superfície nenhuma: quem PAGOU e teve o vínculo recusado recebe da área exatamente a mesma
   resposta de quem nunca comprou, que é a lista vazia que mente e que a RN-451 proíbe. Item
   **AREA-MUDA-1**.

**Lacuna técnica que a mesma review abriu, e que não é decisão de dono:** não existe reprocesso do
vínculo. Quando a leitura de papel propaga uma falha, a conta **já nasceu** e a compra fica órfã,
sem caminho de volta — o reenvio gateia por `contaCriada === true`, os três chamadores são os
confirmadores e a confirmação é exactly-once, e não existe varredura equivalente ao
`varrerIngressosOrfaos`. A classe é **anterior** à RN-449d; o que ela acrescentou foi um gatilho
novo no caminho mais comum, o do comprador de primeira viagem. A saída que existe hoje é a pessoa
pedir o "esqueci minha senha", que é público, neutro e funciona para conta sem senha — é por isso
que a severidade é média. Está na fila técnica da rodada pós-pagamento.

### RN-450 · organizador e cliente cabem na mesma conta (nova, dona · 2026-08-04)

A outra metade da frase do dono, e é afirmativa. Uma conta carrega ao mesmo tempo o perfil de
organizador (`profissionais/{uid}`) e a identidade de cliente (`atletas/{uid}` mais o vínculo
de compra). São documentos **diferentes**, nenhum sobrescreve o outro, e cada tela edita o
seu: `/conta` no painel para o organizador, área do cliente na landing para o cliente.

A identidade de cliente de quem já é organizador nasce **sob demanda**, na primeira compra ou
na primeira visita à área. O gatilho de criação de conta segue sem criar doc de atleta para
papel profissional (`onCreateUser.ts:88-95`). Continua não existindo seletor de papel: a
pessoa está nas duas casas e navega entre elas por link.

### RN-453 · primeiro acesso: o link define a senha e entra no sistema (nova · 2026-08-04)

Dona no E12, consumida aqui porque encosta no roteamento por papel. Decisão do dono, verbatim:
*"sobre o primeiro acesso da pessoa, ela precisa definir a senha neste acesso, ok? Enviamos o
link, ela entra define a senha e entra no sistema."*

O destino do link é decidido pela **origem**, e essa é a parte que toca o E00: link de compra
aterrissa na landing e termina na área do cliente; link de "esqueci minha senha" do painel
aterrissa no painel e termina no roteamento por papel do item 57, inalterado. Mandar o
comprador para o `/redefinir-senha` do painel o faria ser expulso pela guarda de conta órfã
(`destinoPosLogin.ts:67-73`) logo depois de definir a senha, que é o oposto do que o dono
descreveu.

Defeito medido que a regra endereça: `actionCodeSettings` não existe em lugar nenhum do
código, então hoje o link cai no handler hospedado padrão do Firebase e a
`RedefinirSenhaPage` nunca é alcançada.

### O que a review corrigiu no território do E00

O gate do `/cadastrar` era `nome.trim().length > 0` e `organizacao.trim().length > 0`, sem
teto, enquanto a Rule `shapeAutoCadastroValido` — escrita pela mesma lane — exige de 2 a 80
caracteres. O core já tinha `validarCadastroOrganizador` com a faixa exata e o comentário
dizendo para que serve: a tela usa para habilitar o botão, a Function usa para não confiar
na tela. A tela não usava. Nome de uma letra e organização de 81 caracteres passavam pelo
botão, o servidor recusava, a recusa caía num `catch {}` vazio e a **conta Auth nascia sem
`profissionais/{uid}`** — o que, pela RN-448, barra a pessoa no login seguinte sem caminho
de volta. Fix em `52f27f76`, com falsificação executada (gate frouxo restaurado ⇒ três casos
de limite morrem).

Resíduo declarado: falha do `setDoc` por rede, quota ou indisponibilidade ainda produz a
conta órfã. A recuperação self-service é história de fila; hoje só `platform_admin` resolve.

## Delta a conta profissional vira promoção, e a identidade ganha três camadas (2026-08-04 · SPEC-QUALIFICACAO)

Quatro levas do dono no mesmo dia redesenharam a porta de entrada. Spec completa em
`02-rodadas/2026-08-04-qualificacao-profissional/01-spec-conta-profissional.md`; delta de RNs
em `02-rns-delta.md` da mesma pasta. Quatro RNs nascem com o E00 como dono.

**A S030 é reescopada, não substituída.** O critério de aceite que dizia "informo nome, e-mail,
senha, telefone/WhatsApp e nome da organização — obrigatórios (RN-412, P8; CPF/CNPJ fora, KYC
segue no Won't do E16)" passa a valer só para nome, e-mail e senha. Telefone e organização
migram para a promoção, e a organização vira opcional. A frase sobre CPF/CNPJ deixa de ser
verdade universal: o documento não entra no cadastro, mas entra na promoção quando a conta
ainda não tem pessoa vinculada. **O KYC segue fora**, e a distinção importa: coletar documento
para identificar não é verificar identidade contra base oficial. O Won't do E16 continua de pé.

### RN-461 · conta profissional é promoção de conta existente (nova, dona · 2026-08-04)

Decisão do dono, verbatim: *"só pode criar uma conta profissional, quem tem uma conta na Leela."*

O `/cadastrar` deixa de criar "conta de organizador" e passa a criar conta na Leela: nome,
e-mail, senha e o termo, mais os provedores sociais. Virar profissional é um segundo momento,
sobre uma conta que já existe.

A regra criava uma circularidade, porque o único formulário de criação de conta era o do
organizador e a landing não tem rota de autenticação nenhuma. A saída adotada é reescopar o
`/cadastrar`, e ela tem efeito colateral favorável: a porta cai de sete interações para quatro.

Medido antes de decidir: `resgatarConviteOrganizador` lê `organizacao` do doc
`profissionais/{uid}` (`:250`), não do formulário, e já tem cadeia de fallback para nome e
e-mail (`:197`). Mover a organização não quebra a semente do slug do tenant.

### RN-463 · credencial, conta e pessoa são três camadas (nova, dona · 2026-08-04)

Decisão do dono, verbatim: *"E-mail ou CPF, para se cadastrar. Com a opção de login social,
sendo Apple ID ou gmail."*

Credencial é plural (senha, Google, Apple); conta é o uid; pessoa é `pessoas/{documento_hmac}`.
Uma pessoa nunca fica com duas contas.

**Defeito que a regra existe para impedir, medido antes de ligar o login social.** O recurso
"Ocultar meu e-mail" da Apple entrega um endereço de relay. A conta sem fricção resolve o
comprador por igualdade de e-mail (`contaSemFriccao.ts:165-168`), e o vínculo
`pessoas/{ref}.contaUid` é first-claim que nunca é sobrescrito (`:194-207`, RN-174). Somados:
quem compra com o e-mail real e depois entra pela Apple ganha uma segunda conta que **nunca**
alcança as próprias compras, em silêncio e para sempre.

Quando uma conta autenticada informa um documento cuja pessoa pertence a outro uid, o produto
não funde automaticamente, porque merge automático seria sequestro por digitação de documento
alheio. Ele oferece entrar pela credencial que detém a outra conta e vincular a nova ali. A
resposta é **uniforme** e passa por `consumirRateLimit`, porque documento é adivinhável e a
mensagem viraria oráculo de quem tem conta. O anti-hijack da RN-174 não é afrouxado; nasce o
caminho de vinculação que ele pressupõe.

Estado do código: `loginComGoogle` e `loginComApple` existem e são exportados
(`packages/api-client/src/index.ts:409-410`), e **nenhuma tela os consome**. O Apple exige App
ID, Service ID, chave `.p8` e verificação de domínio, pendência declarada em `auth.ts:9-13`.

### RN-466 · dois termos, duas finalidades, e a base legal partida (nova, dona · 2026-08-04)

`TERMO_LGPD_FINALIDADE` cobre hoje "criação e gestão da conta de organizador e contato sobre a
liberação do acesso". Dados de qualificação não cabem nessa frase, e a finalidade também fica
errada por outro motivo: sob a RN-461 o `/cadastrar` não cria mais conta de organizador.

Passam a existir dois termos. O **da conta**, no `/cadastrar`, cobre criar e gerir a conta na
Leela. O **do profissional**, na promoção, tem constante e versão próprias e cobre avaliar e
liberar o acesso profissional; é carimbado em `profissionais/{uid}.consentimentoProfissional`
com versão, finalidade e instante do servidor, no molde da RN-446.

A base legal se divide, e é isso que mantém o formulário breve. Qualificar para **decidir o
acesso** é procedimento preliminar de contrato (art. 7º, V) e por isso pode ser obrigatório sem
consentimento, que se fosse exigido seria consentimento não livre. Usar a qualificação para
**recomendar, segmentar e exibir em vitrine** é finalidade distinta, tem consentimento próprio,
nasce desmarcado e **recusar não bloqueia o acesso**. Uma caixa, não seis.

O CPF pedido na promoção tem finalidade própria declarada no termo: identificar a pessoa e
evitar identidade duplicada. Não é lido do checkout para dentro do painel; o que a promoção faz
é escrever na mesma identidade canônica quando a pessoa informa o próprio documento.

### RN-467 · versão de termo que estreita não obriga recoleta (nova, dona · 2026-08-04)

A RN-412 criou `TERMO_LGPD_VERSAO` e nunca disse quando o aumento dela custa alguma coisa. Fica
escrito: **estreitar ou esclarecer a finalidade não obriga recoleta**, porque quem consentiu
com o mais amplo já cobriu o mais restrito; **alargar obriga**, e quem não recoletou não é
tratado sob a finalidade nova.

O aumento do termo da conta é estreitamento, então ninguém recoleta. Quem já é profissional e
nunca viu o termo do profissional encontra a qualificação na primeira entrada e carimba ali,
o que não é retroativo: é a primeira vez que aquela finalidade existe.

**O LGPD-1 não é resolvido por esta regra.** Ele segue aberto no painel, sem default, porque
fabricar o carimbo ausente é exatamente a prova que a RN-412 recusa. O que muda é que a
promoção cria o momento natural onde a recoleta caberia, se o dono escolher essa opção.

## Delta o primeiro acesso por código e a criação de conta na landing (2026-08-05 · SPEC-CONTAS-LANDING)

O dono pediu duas portas no modal de entrada da landing, e a fala que as define traz um
mecanismo que o produto não tem. Verbatim: *"Podemos ter o CTA 'É meu primeiro acesso' e Criar
conta, primeiro acesso a pessoa define senha, após receber um código de verificação de 6
dígitos numeros enviados por e-mail, e criar conta cria a conta nova de usuário, sem ser a
profissional."*

Rodada em `02-rodadas/2026-08-05-contas-landing/`. As superfícies são do E12; a mecânica de
credencial, a ordem de criação de conta e a fronteira entre tipos de conta são deste épico.

**Medido antes de escrever:** varredura por código numérico de verificação em `functions/src`,
`packages` e `apps` devolve zero, e o Firebase Auth **não oferece** código por e-mail de forma
nativa — ele entrega link de ação por e-mail e código por SMS para telefone. É peça nova, e é
peça de credencial.

**A referência que o dono citou não sustenta o número.** Ele mandou simular o fluxo da Cheers.
A pesquisa de 05/08/2026 achou que a recuperação da Cheers é **link**, não código, e não achou
fonte nenhuma dizendo seis dígitos. Quem documenta seis dígitos, com quinze minutos de prazo, é
a Sympla. Os seis dígitos são **decisão do dono nesta fala**, não cópia verificada, e ficam
registrados assim para que ninguém os defenda depois com autoridade que a pesquisa não dá. O
detalhe, com fonte e data linha a linha, está em `02-spec-contas-landing.md` §Parte 2.

### RN-476 · o código de seis dígitos é a prova de posse do e-mail (nova, dona · 2026-08-05)

Seis dígitos decimais, com zeros à esquerda preservados — `000123` é código válido, e truncá-lo
reduziria o espaço em silêncio. Sorteio com a **entropia do sistema**, nunca `Math.random`: a
casa acabou de varrer o repositório inteiro por causa disso, em `61776052`, `8d779dce` e
`20a9c904`, e nascer previsível reintroduziria na mesma semana o defeito que ela acabou de
fechar.

**Só o digest persiste, e ele é HMAC, não hash puro.** O material é o par
`HMAC-SHA256(pepper, "<e-mail normalizado>:<código>")`, fail-closed quando o pepper falta. A
razão é aritmética e o precedente é a RN-174: o token do convite de assessoria tem 256 bits e
SHA-256 puro basta porque ninguém enumera 2²⁵⁶; um código de seis dígitos tem 10⁶ valores, e
quem puser as mãos no documento calcula o milhão de digests em milissegundos. Amarrar ao
endereço impede que um digest observado num documento seja testado contra outro.

**Prazo de dez minutos.** É credencial de sessão, e a referência de mercado achada são os
quinze minutos da Sympla. Por contraste deliberado, a **RN-420** registra que o link do
ingresso **não** tem prazo, porque é comprovante de compra aberto meses depois. Confundir os
dois em qualquer direção produz erro.

**Uso único, teto e invalidação.** O consumo acontece dentro de uma transação, e o documento
não é apagado no consumo: apagar faria a segunda tentativa cair no ramo "não existe" em vez de
"já usado", e o servidor precisa distinguir os dois para contar tentativas. O teto é de **cinco
tentativas por código**, e ao esgotar o código morre inteiro, não só aquela requisição — sem
essa propriedade, um milhão de combinações contra um código vivo por dez minutos é força bruta
resolvida numa tarde. O contador vive no mesmo documento e é incrementado na mesma transação da
comparação; fora dela, dois pedidos simultâneos leem o mesmo valor e o teto vira decoração.
Cada endereço tem **um código vivo**, e pedir um novo sobrescreve o anterior, para que pedir
substitua a chance do atacante em vez de acumulá-la.

**Comparação em tempo constante**, no molde do `provisionAssessoria.ts:89-90`.

**Uma resposta só.** Código errado, vencido, já usado, de endereço que nunca pediu nada, e teto
esgotado devolvem **a mesma negativa**. É a RN-419 aplicada a cinco causas em vez de quatro.

**Limitador por alvo, e a borda que não é nossa.** O `consumirRateLimit` já existente, com
chave derivada do e-mail: 3 em 15 minutos e 10 em 24 horas. **Não existe chave por origem**, e
não por esquecimento: o `rateLimit.ts` tem a decisão escrita, com o motivo de que derivar IP
confiável num callable é premissa de infraestrutura não verificável e que um balde por IP pune
vizinho de NAT. O throttle volumétrico por origem é da borda, App Check e Cloud Armor, e a
borda **não está ligada** — o pedido de código passa a ser mais um consumidor do item de CTO
que já está no painel.

**Operação:** o pepper é o terceiro segredo desse tipo na casa, ao lado do `CRM_ID_PEPPER` e
das chaves do QR, e precisa existir no Secret Manager antes do deploy. Nenhum teste do emulador
cobra isso. A coleção `codigosDeAcesso` nasce sem `match` nas Rules, deny-by-default, no mesmo
tratamento de `rateLimits`.

### RN-477 · as duas portas são a mesma máquina, e a divergência vem depois da prova (nova, dona · 2026-08-05)

Se cada porta responder de acordo com o que encontra, o modal vira oráculo: digite um endereço
em cada uma e descubra se aquela pessoa já comprou na Leela. Seria a falha que a `S1221-T1`
acabou de fechar no login, reaberta ao lado dela.

**Antes da prova, as duas portas são indistinguíveis.** Os dois CTAs pedem o endereço, dizem a
mesma frase e o servidor faz o mesmo trabalho: gera, guarda, envia. **Sem consulta a "existe
conta?" antes do envio**, o tempo também não distingue, porque não há ramo a mais para
percorrer. Qualquer ramo que só exista quando a conta existe é oráculo, ainda que a mensagem
seja igual.

**Depois da prova, a divergência é livre**, e vale como frase: não é vazamento contar sobre a
caixa de e-mail de quem acabou de provar que a tem. Os desfechos:

| Entrou por | E a conta | O que acontece |
|---|---|---|
| É meu primeiro acesso | existe, sem senha | define a senha, o endereço é marcado como verificado, entra |
| É meu primeiro acesso | **não existe** | a tela pede o nome junto da senha e cria a conta, com o termo |
| Criar conta | **já existe** | pede só a senha, porque o nome já é conhecido, e entra |
| Criar conta | não existe | caminho feliz do cadastro |
| Qualquer uma | existe **com senha** | define outra senha e entra; funcionalmente é recuperação, e é honesto que seja |

Nenhuma tela diz "você não tem conta" nem "e-mail já cadastrado". As duas frases são o oráculo
voltando pela janela, e nenhuma delas pode existir no código.

O que muda por porta é a moldura e a copy, nunca o que o servidor faz. O dono pediu duas portas
e ganha duas portas; elas são rótulos, não máquinas.

### RN-478 · a conta nasce depois da prova, e nasce inteira ou não nasce (nova, dona · 2026-08-05)

Inverte a ordem que produziu duas feridas conhecidas. Hoje o único cadastro do produto cria a
conta no Auth e depois grava o perfil, o que produziu a conta órfã que está no painel desde
03/08 e a conta não verificada ocupando endereço alheio, que é o vetor medido do POSSE-EMAIL-1.

**Enquanto o código não é digitado, nenhuma conta existe.** O que existe é um digest com prazo.
Quem digitar o endereço de terceiro não cria nada, não ocupa nada e não impede nada.

**Verificado o código, o servidor cria tudo numa chamada só:** conta no Auth com
`emailVerified: true`, `atletas/{uid}` com o consentimento, e **desfaz a conta do Auth se a
gravação falhar**. Nada de conta pela metade. É o desenho que o cadastro do organizador não
tem, porque lá o cliente cria a conta e depois grava o documento, em dois passos e de duas
origens; aqui o servidor faz os dois no mesmo lugar e pode desfazer o primeiro.

**Isto não fecha o LGPD-1.** Ele é do caminho do organizador e é decisão jurídica do dono. Fica
o registro de que a porta nova não herda a ferida.

A gravação convive com o gatilho `onCreateUser`, que grava `atletas/{uid}` por conta própria,
**por merge e nunca sobrescrevendo**, no mesmo padrão que o próprio gatilho já usa para a
corrida com o rollback.

### RN-479 · o consentimento da conta de participante (nova, dona · 2026-08-05)

Checkbox nascendo desmarcado, finalidade declarada, versão e instante do **servidor** em
`atletas/{uid}.consentimentoLgpd`, no molde da RN-446, com aceite datado pelo cliente sendo
negado. `profissionais/{uid}` não é tocado, pela RN-450.

A constante de versão é a do **termo da conta** que a RN-466 definiu, compartilhada com o
`/cadastrar`, nunca uma cópia. Duas superfícies criando conta com dois termos diferentes seria
exatamente a divergência que a RN-466 existe para impedir.

**Quem chega pelo primeiro acesso de conta que já existe não vê checkbox nenhum.** Essa pessoa
comprou, e o aceite dela está carimbado no pedido, com versão, instante e hash do material.
Pedir de novo seria recoletar consentimento existente, o que a RN-467 já dispensa.

### RN-480 · nenhuma das duas portas cria conta profissional (nova, dona · 2026-08-05)

Verbatim do dono, na mesma fala: *"criar conta cria a conta nova de usuário, sem ser a
profissional."*

A porta nova cria conta de participante com papel `athlete`, e mais nada. Conta profissional
continua sendo promoção de conta existente (RN-461). Conta de administração da plataforma
continua sendo outra conta (RN-449, ratificada pelo dono em 05/08 no fechamento do ADMINSEP-1).
Organizador e cliente continuam cabendo na mesma conta (RN-450).

**A fronteira é provada por teste, não presumida:** passar pelas duas portas não produz
`profissionais/{uid}`, não produz claim de tenant e não produz `platform_admin`.

### Reconciliações deste delta

- **RN-453 inalterada, e herdada inteira.** O primeiro acesso define a senha e **entra no
  sistema**, com destino decidido pela origem. A RN-476 acrescenta um segundo caminho até o
  mesmo desfecho, iniciado pela pessoa em vez de pelo e-mail. A ordem é aceite: senha primeiro,
  sessão depois. Um código que abrisse sessão sozinho seria login sem senha, que é a jornada da
  Sympla e não a que o dono descreveu.
- **RN-155 inalterada,** e é ela que faz o primeiro acesso ser caso real aqui. A Sympla é o
  oposto: lá a conta não nasce na compra, e por isso o caso não existe.
- **RN-461 inalterada,** com uma consequência de superfície que sobe ao painel como
  **CONTA-2**: quando a fila da SPEC-QUALIFICACAO rodar, o `/cadastrar` do painel fará o mesmo
  que a porta nova, e o rótulo "Criar conta de organizador" do header
  (`PublicHeader.tsx:74-79`) estará desatualizado.
- **RN-469 inalterada.** Acrescentar `request.auth.token.email_verified == true` ao ramo **(b)**
  de `ehCompradorDoPedido`, o do vínculo por conta, nasceu como recomendação e **foi autorizado
  pelo dono em 05/08** no fechamento do POSSE-EMAIL-1; o ramo (a), a sessão anônima do checkout,
  nunca a recebe. O que a RN-476 muda é o custo: depois dela, toda sessão nomeada da landing tem o endereço verificado,
  então a condição deixa de tirar acesso de alguém. Quem comprou e ainda não fez o primeiro
  acesso continua lendo o próprio pedido pela sessão do checkout, que é o ramo que não muda, e
  continua abrindo o ingresso pelo link assinado (RN-452).
- **Login social fora do escopo.** `loginComGoogle` e `loginComApple` continuam escritos e sem
  tela (QUALIF-5). Ligá-los aqui seria uma terceira porta no mesmo modal, na mesma semana, sem
  o dono ter pedido.


## Delta o que só a produção cobra, e a rodada inteira no ar (2026-08-05 e 06/08 · DIAG-CLUBES · DIAG-STORAGE-CAPA · DEPLOY-TUDO-0805 · SPEC-PROCESSO-DEPLOY · DIAG-SENHA)

Cinco lanes de fundação no mesmo ciclo, quatro delas achando a mesma família de defeito: **verde na
máquina de quem escreveu, quebrado no ar, e nenhum erro visível para quem estava olhando**. Nenhuma
regra de negócio nova — a faixa segue em 509. O que este delta acrescenta é o estado por tarefa e
as diretrizes.

> ⚠️ **Renumeração de 06/08.** A lane SPEC-PROCESSO-DEPLOY tomou `S033` e `S034` sem ver que a
> SPEC-QUALIFICACAO já os havia reservado em 04/08 (`S033 · Criar conta na Leela` e
> `S034 · Painel Profissional na superfície`, os dois no Backlog). O par novo passou a ser **S039**
> (a conferência, feita) e **S040** (a esteira, no Backlog). Os IDs da SPEC-QUALIFICACAO ficam onde
> estavam, porque são os primeiros.

### S035 · o índice que só a produção cobra

| Tarefa | Estado | Prova |
|---|---|---|
| S035-T1 · a causa-raiz provada, e o diagnóstico de entrada corrigido | ✅ | `092de799` |
| S035-T2 · o segundo defeito da mesma classe, na lista de tenants | ✅ | `092de799` |
| S035-T3 · os dois índices compostos, sem tocar nas isenções | ✅ | `092de799` — no ar antes de 05/08 |
| S035-T4 · o auditor estático que exige índice declarado | ✅ | `092de799` — ⚔ entra na tarefa de teste do pacote |
| S035-T5 · a guarda equivalente para as consultas de dentro das functions | 📋 | sem dono |

**A correção de diagnóstico é a parte que vale guardar.** O brief dizia que a consulta devolvia
"zero documentos e **sem** erro". A produção responde 400 com a frase exata *"a consulta exige um
índice"*. **Não existe caminho silencioso no Firestore** — o silêncio era do instrumento de
medição: em erro, a resposta vem como um item com campo de erro, e contar itens com documento dá
zero sem nunca olhar o erro que veio junto. Quem engole a rejeição é sempre a camada de cima.

**Diretrizes:**

- ⛔ **O emulador não cobra índice.** Ele serve qualquer combinação de filtro e ordenação. Um teste
  de integração no emulador passa com folga enquanto a produção erra na primeira linha, e nenhuma
  quantidade de testes desse tipo muda isso. A cegueira é estrutural, e a lista completa do que o
  emulador não sabe está em [[o-que-so-a-producao-cobra]].
- **Filtro opcional esconde o defeito.** A lista de tenants quebra só quando o filtro é usado: sem
  ele o índice automático serve. É o pior formato possível, porque o caminho comum funciona.
- **Contar resposta de consulta sem olhar o campo de erro é medir errado.** Vale para qualquer
  código que resuma resposta de banco.

### S036 · a permissão que só o deploy interativo concede

| Tarefa | Estado | Prova |
|---|---|---|
| S036-T1 · a capa do evento reproduzida condição a condição | ✅ | `096311f9` — as quatro condições da regra passam |
| S036-T2 · o alcance medido: o balde estava vazio desde sempre | ✅ | zero objetos em todo prefixo |
| S036-T3 · duas guardas exigindo a mesma régua na regra e na tela | ✅ | `096311f9` |
| S036-T4 · a permissão concedida, e a conferência que passa a acusá-la | ✅ | virou a C5 da S039 |
| S036-T5 · a tela para de repassar a mensagem crua do provedor | 📋 | fila técnica, RS1-26 |

**O defeito não estava no código.** As regras de arquivo consultam o banco para decidir se a imagem
é sua, essa consulta atravessa dois serviços, e quem a executa é um agente de serviço do Google que
precisa de uma permissão específica. Quem concede é o próprio comando de deploy, e ele **só concede
quando roda em terminal interativo**. Todos os deploys da casa eram automatizados: a regra ficava
publicada, correta e inútil. **Consequência medida: nenhum upload que dependa de checagem no banco
jamais funcionou em produção** — capa de evento, capa de clube, logo de patrocinador e foto de kit.
Só funcionavam foto de perfil e logo de marca, que não consultam o banco.

**Diretriz:** ⛔ **quando a consulta entre serviços falha, a negação sai com a mesma frase de uma
negação legítima.** Foi isso que fez o defeito durar. Quem lê não distingue "você não pode" de "eu
não consegui perguntar", e nenhum teste local pode enxergar a diferença, porque o emulador resolve
a consulta dentro do próprio processo, sem agente de serviço e sem permissão nenhuma.

### S037 · a rodada inteira sobe ao ar

Sete passos, sete conferências pós-deploy, zero regressão. Estado: **✅ tudo no ar**.

O que subiu: regras do Storage (ruleset `34131880`), **21 das 96 functions** (3 criadas e 18
atualizadas), regras do Firestore (ruleset `4eabe733`), landing e painel. O que **não** subiu:
índices, porque arquivo e servidor já batiam — 18 compostos e 8 isenções, zero diferença — e as
outras 75 functions, porque nenhum arquivo alterado desde a baseline **delas** é alcançado por
aresta de runtime.

**Diretrizes:**

- ⛔ **A baseline de functions se mede no servidor, nunca no brief.** A âncora escrita no brief
  estava errada, e o servidor mostrou por quê: **funções diferentes estavam em commits
  diferentes**, 65 numa geração e 28 noutra, sete dias mais velha. A verdade é a data de
  atualização de cada função no servidor, e foi preciso adotar **duas** baselines.
- **A confirmação é reler o servidor, não ler o texto do comando.** "Deploy complete" é a opinião do
  comando sobre si mesmo. Cada passo foi confirmado por API, com impressão digital do arquivo
  publicado comparada à do arquivo local.
- **O que fica de fora fica de fora com prova.** Os parsers de dinheiro mudaram no pacote comum, e
  nenhum arquivo de functions os importa — são do painel, e entraram pelo passo do painel.
- **Bundle heterogêneo em produção é o estado normal de deploys parciais**, e vale saber que
  existe: três gerações do mesmo artefato convivem hoje.

### S038 · o endereço sem conta parou de virar falha de infra

| Tarefa | Estado | Prova |
|---|---|---|
| S038-T1 · a causa-raiz provada contra produção, com controle positivo | ✅ | `cb5922a7` |
| S038-T2 · a classificação do erro na porta única dos links de ação | ✅ | ⚔ `cb5922a7` |
| S038-T3 · o desfecho de erro inesperado separado do de falha de envio | ✅ | `cb5922a7` |
| S038-T4 · os dois registros crus viram incidente observável | ✅ | `cb5922a7` |
| S038-T5 · quem foi afetado, medido sem PII | ✅ | uma tentativa; o endereço não tem conta e nunca comprou |
| S038-T6 · **o deploy** | 📋 | ⛔ sem ele o conserto não existe para quem usa |
| S038-T7 · a p50 real do caminho da conta que existe | 📋 | pré-existente, anotado e não feito |

A proteção contra enumeração de e-mail está **ligada** no projeto, e o serviço deixou de responder
"conta não existe": responde sucesso sem entregar o link. A biblioteca do servidor tem um validador
que só conhece dois mundos e lança erro interno, então o ramo escrito para "conta não existe" virou
**código morto no dia em que a proteção foi ligada**, e endereço desconhecido passou a viajar como
exceção de infraestrutura. Quem **tem** conta continuava sendo atendido, e é por isso que não houve
avalanche de reclamação.

**Diretrizes:**

- ⛔ **Não desligar a proteção de enumeração.** É a saída fácil e é a errada: ela protege os fluxos
  do lado do navegador contra enumeração da base de clientes. O conserto certo é o servidor
  entender o desfecho novo.
- **A classificação exige o par código mais frase.** O código sozinho é o genérico da biblioteca e
  cobre infra de verdade, que precisa continuar subindo em vez de virar um "conta não existe"
  silencioso. Se a biblioteca mudar a frase, o ramo volta a ser inalcançável — e o teste quebra
  junto, que é o aviso.
- **Uma variável inicializada no desfecho errado manda caçar a chave errada.** O envelope nascia
  como "falha de envio", então qualquer exceção antes do provedor saía acusando o provedor.
- **A doutrina de incidente estava escrita e não estava aplicada neste arquivo.** Agora está. E a
  resposta honesta para "por que ninguém soube" é maior que isso: o projeto tem **zero políticas de
  alerta, zero métricas de log e zero canais de notificação** — o gancho existe e do outro lado não
  há nada. Roteado ao CTO humano por ser custo de infraestrutura recorrente.

### S039 e S040 · a conferência de prontidão

A **S039** está feita (`2d44681a`): oito conferências que comparam **arquivo contra servidor**, três
códigos de saída, e uma régua de honestidade que imprime o que o script não verifica junto do
veredito. A primeira execução verde contra produção é de 06/08, e a conferência de permissão dentro
dela é o retrato do conserto da **S036** — até a véspera ela seria vermelha. A **S040** é o que
ficou: ligar o script a um comando nomeado e a um passo de esteira, fora do território daquela lane.

⛔ **O script não entra na tarefa de teste do monorepo**: ele fala com a rede e depende de
credencial de usuário, o que o torna impróprio para uma tarefa de build cacheável. O lugar dele é
um passo explícito, chamado por quem deploya.

## Delta a aterrissagem depois do cadastro deixa de ser parede (2026-08-06 · ONBOARD-VITRINE)

Este épico é dono das **jornadas de conta** (S020) e do **cadastro do organizador** (S030). A
ordem do dono de 06/08 não mexe em nenhum dos dois formulários: ela muda **onde a pessoa
aterrissa** quando o cadastro termina.

A regra nova é a **RN-510** e o enunciado canônico vive no épico dono da porta,
[[LEELA-E16-plataforma-superadmin]]. Aqui ficam as três amarrações que são deste épico:

1. **S020-T3 · o default "cadastro NÃO cria tenant" permanece.** Ele já tinha sobrevivido à
   rodada de 28/07 e sobrevive a esta. O que muda de novo é só a aterrissagem: em 28/07 ela
   virou "home com overlay" (RN-416); em 06/08 vira "**entra em vitrine, e o aviso sobe no
   primeiro gesto**" (RN-510).
2. **S020-T4 · `/conta` continua sendo da PESSOA.** Ali a rota real monta e o aviso não sobe.
   Era a exceção da RN-416 e continua sendo, agora com nome novo: é a única rota em que a
   vitrine sai da frente. Vale reperguntar, quando alguém mexer nisso, se ela ainda é a única.
3. **RN-448 (precedência de acesso) inalterada.** `platform_admin` vence e cai em
   `/plataforma`; organizador com tenant cai na Visão Geral; **conta sem tenant entra em
   vitrine** em vez de encontrar a parede. Deep-link guardado continua vencendo o default.
   `destinoPosLogin` não foi tocado por esta lane, e o refresh de crachá do PAPEL-DUPLO
   continua sendo o que destrava o painel no resgate, sem novo login.
