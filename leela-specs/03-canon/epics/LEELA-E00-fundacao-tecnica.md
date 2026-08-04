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

