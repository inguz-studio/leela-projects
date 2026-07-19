---
tags: [leela, epico, plataforma, super-admin, multi-tenant, marketplace]
aliases: [E16, Plataforma & Super-Admin, Back-office da Plataforma]
---

# LEELA-E16 · Plataforma & Super-Admin (marketplace multi-tenant)

- **Superfície:** Painel (back-office da plataforma)
- **Horizonte:** H1 (Onda 1 · fundacional) → adensa em H3 (camada SaaS)
- **MoSCoW:** Must (fundacional — isolamento e termos comerciais bloqueiam o modelo de negócio)
- **Estimativa:** XL
- **Status:** 📋 Backlog (épico novo; base decidida em ADR-009)
- **Depende de:** LEELA-E00 (Fundação Técnica — Auth/claims, monorepo, isolamento por `tenantId` desde o dia 1), LEELA-E01 (Design System & Shell), LEELA-E04 (Config & Vendas — consome `commercialTerms`; `PaymentProvider` ADR-006), LEELA-E09 (Financeiro — consome `platformFeePct`/split)
- **De-para:** (novo — sem backlog BH; multi-tenancy nasce nesta rodada, ADR-009)

> **Nota de domínio (obrigatória).** Este épico é o **back-office do dono da plataforma** (o `platform_admin`, você). Não há protótipo HTML em `WEB-APPV2 (1)/` para as telas de super-admin — elas são **novas**, construídas sobre o Design System (E01) numa área guardada por claim `platform_admin`. Onde outras telas citam um `.html` de referência, aqui vale a convenção: reusar componentes do DS (Table densa §2.5, Card flat §2.16, ConfirmModal §2.15, KPI cards, Toast) sem inventar padrões visuais. Tenant/mock canônico: **Castelo Produções** (`castelo-producoes`), owner **Marina Castelo**, `platformFeePct` 10,5% (fonte do mock de E09), `saasMonthlyFee` R$ 0 (produtor-sócio), reusado de HANDOFF-05 / E04 / E09.

## Objetivo

Dar ao dono do Leela o back-office que faltava para operar a **ticketeira/marketplace multi-tenant**: aprovar e provisionar cada produtor/promotor como um `tenant` isolado, definir os **termos comerciais** de cada um (taxa da plataforma, parcelamento, antecipação, mensalidade da comunidade, mensalidade SaaS), cobrar as recorrências (comunidade e SaaS) e enxergar o macro do negócio (GMV total, receita Leela por tenant, nº de tenants ativos, saúde por tenant). É a camada que transforma o Leela de "sistema de um produtor" em "plataforma de N produtores", com o dono no controle da economia e do isolamento.

O valor entregue é duplo. **Isolamento de primeira classe** (ADR-009): dado de um tenant nunca vaza para outro; só o `platform_admin` cruza a fronteira — decisão fundacional porque o retrofit é proibitivo (risco de vazamento entre promotores). E **economia configurável por tenant**: o `platformFeePct` e as regras de parcelamento/split que E04 (checkout) e E09 (split/repasse) consomem passam a vir de `commercialTerms`, escritos **só** pelo `platform_admin`, em vez de constantes espalhadas no código.

## Personas & JTBD

- **Primária — Super-admin / dono da plataforma (`platform_admin`, o Vitor).** JTBD: "Aprovar e ativar um produtor sem intervenção técnica", "Definir a taxa e as condições comerciais de cada produtor num lugar só", "Cobrar a mensalidade SaaS de quem paga e isentar quem é sócio", "Ver o resultado macro da plataforma (GMV, minha receita, quantos produtores ativos) sem cruzar planilhas", "Suspender um produtor problemático sem apagar dados".
- **Secundária — Produtor/Promotor (`tenant_owner`).** JTBD: "Entrar na plataforma com minha conta isolada e ver os termos comerciais que valem para mim (read-only)".
- **Secundária — Membro da comunidade (`athlete`).** JTBD: "Assinar a mensalidade do clube pago do meu produtor" (destrava RN-104) — consumidor da recorrência, não operador do back-office.

## Critérios de sucesso do épico

- Super-admin aprova um produtor e o sistema **provisiona** `tenants/{id}` + `profissionais/{owner}` + custom claims (`tenant_owner` + `tenantId`) atomicamente (RN-403); o produtor loga e vê só os próprios dados.
- Termos comerciais de um tenant são configuráveis **só** pelo `platform_admin` (RN-404); E04 lê `platformFeePct`/`installmentRules` no checkout e E09 lê `platformFeePct` no split — sem constante hardcoded.
- Isolamento verificado: um `tenant_owner` de A **não** lê nenhum dado de B (Security Rules em teste de integração — RN-400); só `platform_admin` cruza.
- Lifecycle do tenant opera: `pending → ativo → suspenso` (e reativação), só pelo `platform_admin`; tenant suspenso não abre novas vendas mas preserva dados (RN-402).
- Recorrências funcionam via `PaymentProvider` (assinatura): mensalidade da comunidade destrava clube pago (RN-104/407) e mensalidade SaaS cobra o tenant conforme `saasMonthlyFee` (RN-408), ambas idempotentes; `saasMonthlyFee = 0` não gera cobrança (RN-405).
- Visão macro exibe GMV total, receita Leela por tenant, nº de tenants ativos e saúde por tenant, tudo de agregados mantidos por Function em `platform/rollups` (RN-409) — nunca varrido no cliente.

## Regras de negócio aplicáveis

Reaproveitadas do backlog / de outros épicos:
- **RN-104** — `modeloEntrada` do clube (gratuito/pago); a recorrência da comunidade (S1603) é o que **destrava** o "clube pago em breve".
- **RN-330** (E09) — Taxa da plataforma sobre a receita bruta confirmada; passa a ter como **fonte** o `platformFeePct` do tenant (RN-406), em vez de constante.
- **RN-311/312, RN-120/122** (E04/E05) — Split de afiliação e comissão read-only para o clube; o split usa a taxa do tenant como base econômica.

Novas (plataforma & multi-tenancy — introduzidas neste épico, faixa **RN-400…RN-410**):
- **RN-400 · Isolamento por tenant.** Todo dado tenant-scoped só é legível/escrevível por membros do tenant (claim `tenantId` bate) **ou** pelo `platform_admin`. Dado de um tenant **nunca** vaza para outro. `atletas` é global (identidade cross-tenant); a inscrição/membro é que é scoped.
- **RN-401 · Papéis e claims.** `role ∈ {platform_admin, tenant_owner, tenant_staff, promoter, athlete}` + `tenantId` (quando aplicável) em custom claims. Security Rules autorizam por claim; o cliente nunca é fonte de verdade de papel.
- **RN-402 · Lifecycle do tenant.** Estados: `pending → ativo → suspenso` (com reativação `suspenso → ativo`). Só o `platform_admin` transita. Tenant `suspenso`: operação bloqueada (sem novas vendas/publicações), dados **preservados** (não deletados).
- **RN-403 · Provisionamento atômico.** Aprovar um tenant cria, na mesma operação de servidor, `tenants/{id}` (status `ativo`), o `profissionais/{ownerUid}` owner e as custom claims (`tenant_owner` + `tenantId`). Falha parcial não deixa tenant meio-provisionado.
- **RN-404 · Termos comerciais só do platform_admin.** `commercialTerms` (`platformFeePct`, `installmentRules`, `anticipation`, `communityMonthlyEnabled`, `saasMonthlyFee`) — escrita **exclusiva** do `platform_admin`. O tenant lê os próprios termos (read-only); E04/E09 consomem.
- **RN-405 · `saasMonthlyFee` pode ser 0.** Mensalidade SaaS zero é válida (produtor-sócio / isento); `0` não gera cobrança nem ledger de billing.
- **RN-406 · Fonte da taxa.** `commercialTerms.platformFeePct` do tenant é a **fonte** de RN-330 (E09) e da base econômica do split (E04). O mock 10,5% de E09 passa a derivar do termo do tenant, não de constante.
- **RN-407 · Recorrência da comunidade.** Com `communityMonthlyEnabled = true`, o tenant pode cobrar mensalidade dos membros (destrava clube pago, RN-104). Assinatura `tenant → membro` via `PaymentProvider` (assinatura), webhook de renovação idempotente; inadimplência move o status da assinatura.
- **RN-408 · Recorrência SaaS.** Cobrança `Leela → tenant` conforme `saasMonthlyFee` via `PaymentProvider` (assinatura); ledger em `platform/billing/{tenantId}`; idempotente. `saasMonthlyFee = 0` (RN-405) não gera cobrança.
- **RN-409 · Rollups macro cross-tenant.** Agregados em `platform/rollups/*` (GMV total, receita Leela por tenant, nº de tenants ativos, saúde por tenant) são mantidos por Cloud Function, cross-tenant; **só** `platform_admin` lê; **só** Function escreve.
- **RN-410 · Antecipação (anticipation).** `anticipation` (disponível? custo?) é termo do tenant; o **campo** existe e é configurável desde a V1, mas a **mecânica** de antecipação de recebíveis é pós-V1 (adensa depois, não bloqueia o épico).

### Reconciliação TAXA-FLEX (2026-07-19) — fonte da taxa vira tabela por meio

Rodada `02-rodadas/2026-07-19-taxa-flex/` (RN-178, dona em E04). A fonte da taxa da plataforma deixa de ser um `platformFeePct` único e passa a ser uma **tabela por meio de pagamento** (`pix | cartao | boleto` → `{percentual, fixoCentavos}`), em dois níveis: **global** em `platform/config` (default de todos os tenants) + **override por organizador** em `commercialTerms/current`. RN-404 e RN-406 seguem valendo, agora sobre a tabela:

- **RN-404 (reconciliada)** — a escrita da tabela (global E override do tenant) é **exclusiva do `platform_admin`**; o tenant lê a própria taxa efetiva (read-only). Ator "comercial" para o override negociado = futuro.
- **RN-406 (reconciliada)** — a **fonte** de RN-330 (E09) e da base econômica do split (E04) passa a ser a **linha do meio de pagamento** na tabela por meio (override > global), não mais um percentual único. O mock 10,5% degrada para a linha do meio quando a tabela existir.

Detalhe do modelo, congelamento e cálculo em E04 (RN-178) e E09 (RN-179..183).

## Regras de design aplicáveis

- **§2.1** header 96px na área de plataforma; sidebar/shell dedicados do `platform_admin` (itens: Tenants, Termos, Billing, Macro) — reusa o Shell de E01, com set de navegação próprio.
- **§2.5** Table densa (linha 64px, header uppercase) — lista de tenants, billing por tenant, saúde por tenant.
- **§2.12** interativo por padrão — estados vazio/erro/carregando (skeleton, nunca spinner solto), feedback via Toast; nenhuma lista sem EmptyState + contador "mostrando X de Y".
- **§2.15** `ConfirmModal` com preview de consequências (perde/mantém) — ações sensíveis: aprovar tenant (o que é criado), **suspender** tenant (o que fica bloqueado × preservado), reativar.
- **§2.16** flat, sem borda decorativa; exceção de card crítico (border-left Vulcão) para tenant suspenso / inadimplência.

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md` (§Multi-tenancy). O épico **cria** as coleções de plataforma (marcadas ➕) e formaliza claims/isolamento:

- ➕ `tenants/{tenantId}` — perfil do produtor: `nome`, `slug` (único), `status` (`pending`/`ativo`/`suspenso` — RN-402), `ownerUid→profissionais`, `tipo` (produtor|promotor), `criadoEm`, `atualizadoEm`. ∑ desnormalizados de saúde (`gmvAcumulado`, `eventosAtivos`, `ultimaAtividadeEm`) mantidos por Function.
- ➕ `tenants/{tenantId}/commercialTerms/current` — `platformFeePct`, `installmentRules` (map: `maxParcelas`, `jurosAoMes`, `parcelaMinima`), `anticipation` (`disponivel`, `custoPct?` — RN-410), `communityMonthlyEnabled` (bool), `saasMonthlyFee` (decimal, pode 0 — RN-405), `atualizadoPor` (uid do platform_admin), `atualizadoEm`. Escrita **só** `platform_admin` (RN-404).
- ➕ `tenants/{tenantId}/subscriptions/{subId}` — mensalidade da **comunidade** (tenant → membro; RN-104/407): `atletaId→atletas`, `clubeId→clubes`, `valor`, `status` (`ativa`/`inadimplente`/`cancelada`), `proximaCobranca`, `providerSubId` (chave de idempotência), `criadoEm`.
- ➕ `platform/billing/{tenantId}` — ledger da mensalidade **SaaS** (Leela → tenant; RN-408): docs `cobrancas/{providerTxId}` com `valor`, `competencia`, `status` (`confirmada`/`pendente`/`falha`/`isenta`), `providerTxId` (idempotência). Escrita só Function.
- ➕ `platform/rollups/{unico}` — agregados macro cross-tenant (RN-409): `gmvTotal`, `receitaLeelaTotal`, `tenantsAtivos`, `porTenant{ tenantId: { gmv, receitaLeela, saude } }`, `atualizadoEm`. Leitura só `platform_admin`; escrita só Function.
- Estende (leitura/consumo, sem recriar): `profissionais/{id}` (owner do tenant), `eventos`/`clubes`/`pagamentos`/`parcerias` (todos carregam `tenantId`; consumidos pelos rollups e pelo isolamento), `clubes/{id}.modeloEntrada` (RN-104, destravado por S1603).

**Padrão obrigatório:** todo agregado ∑ (`gmvAcumulado`, `gmvTotal`, `receitaLeela*`, `tenantsAtivos`) é mantido por Cloud Function; nunca calculado no cliente. Toda coleção nova cria Security Rules na mesma task. Termos, billing e rollups: escrita **apenas via Function** (Admin SDK) e/ou restrita ao `platform_admin`; nunca do cliente comum.

## Fora de escopo (Won't nesta fase)

- **Gateway de pagamento concreto** (Pagar.me/Asaas/Stripe Connect) para as recorrências → **ADR-006 posterior**; aqui só a interface `PaymentProvider` (assinatura + split, definida em E04-S301-T2) + provider mock/sandbox. A recorrência **impacta ADR-006** (exige suporte a assinatura) — registrar como requisito para a escolha do gateway.
- **Mecânica de antecipação de recebíveis** (cálculo de custo, adiantamento efetivo) → pós-V1; nesta fase só o **campo** `anticipation` nos termos (RN-410).
- **Onboarding self-service do produtor** (cadastro público + KYC) → futuro; nesta fase o `platform_admin` aprova/provisiona (o produtor-sócio é aprovado manualmente).
- **Dashboards macro ricos** (séries temporais, coortes, funil de tenants, drill-down por evento) → pós-V1; a V1-slim entrega KPIs macro básicos.
- **Onboarding/painel do promotor self-service** → **LEELA-E08** (o promotor como afiliado vive em E04/E08; aqui `promoter` é só papel/claim).
- **Faturamento fiscal / nota da mensalidade SaaS**, conciliação bancária, cobrança de inadimplência avançada (dunning) → futuro.

---

## Recorte E16-slim (V1) vs. pós-V1

A V1 Produtor (`V1-PRODUTOR-web.md`) inclui o **super-admin mínimo**: onboard do produtor-sócio + configurar os termos dele + macro básico. O restante adensa depois.

| Story | Escopo | V1-slim? | Observação |
|---|---|---|---|
| **S1600** · Modelo multi-tenant + claims + isolamento | Fundacional | ✅ **Sim (todo)** | Isolamento é dia-1 (ADR-009); retrofit proibitivo. |
| **S1601** · Onboarding & lifecycle do tenant | Provisionar + aprovar/ativar/suspender | ✅ **Sim** (T1, T2, T3, T4) | Suspender/reativar entram; onboarding self-service não. |
| **S1602** · Termos comerciais (`commercialTerms`) | Configurar + consumo E04/E09 | ✅ **Sim (todo)** | `anticipation` só como campo (RN-410); mecânica depois. |
| **S1603** · Recorrência da comunidade (RN-104/407) | Assinatura tenant→membro | ❌ **Pós-V1** | Destrava clube pago; recorrência completa depois. |
| **S1604** · Recorrência SaaS (RN-408) | Cobrança Leela→tenant | ❌ **Pós-V1** | V1 usa `saasMonthlyFee = 0` (sócio); cobrança adensa depois. |
| **S1605** · Visão macro (rollups) | GMV, receita Leela, tenants ativos, saúde | ⚠️ **Parcial** — T1 + T2/T3 básicos na V1 | Dashboards ricos (séries/coortes/drill-down) pós-V1. |

---

## User stories

### LEELA-S1600 · Modelo multi-tenant, claims e isolamento (fundacional)

**Como** dono da plataforma, **quero** um modelo de dados multi-tenant com papéis por custom claims e Security Rules de isolamento, **para** que o dado de um produtor nunca vaze para outro e só eu cruze a fronteira.

- **MoSCoW:** Must (fundacional) · **Estimativa:** L · **Superfície:** Painel (backend/rules) · **V1-slim:** ✅ todo
- **Tela(s) de referência:** — (backend/rules; sem tela)
- **RNs:** RN-400, RN-401, RN-402, §Security Rules do modelo de dados

**Critérios de aceite (Given/When/Then):**
- **Dado** um `tenant_owner` do tenant A, **quando** tenta ler um evento/clube/pagamento do tenant B, **então** a Security Rule nega (RN-400).
- **Dado** o mesmo `tenant_owner`, **quando** lê os próprios dados (claim `tenantId` bate), **então** permite.
- **Dado** um `platform_admin`, **quando** lê dados de qualquer tenant, **então** permite (única exceção — RN-400).
- **Dado** um `athlete` (identidade global), **quando** lê o próprio doc `atletas/{uid}`, **então** permite independentemente de tenant.
- **Dado** um tenant `suspenso`, **quando** o owner tenta criar/publicar (nova venda), **então** a Rule/Function nega, mas leitura dos dados existentes permanece (RN-402).

**Tasks:** LEELA-S1600-T1, LEELA-S1600-T2, LEELA-S1600-T3

#### LEELA-S1600-T1 · Modelo `tenants` + tipos + status/lifecycle + Rules base + seed

- **Tipo:** data-model · **Depende de:** E00 (projeto Firebase, monorepo) · **Bloqueia:** S1600-T2, S1600-T3, S1601-*, S1602-* · **Estimativa:** M

**Objetivo**
Modelar em `core` a entidade `tenant` (perfil + status/lifecycle) e criar a coleção `tenants/{tenantId}` com Security Rules base e o seed canônico do produtor-sócio.

**Contexto & referências**
- ADR-009 (multi-tenancy); `modelo-de-dados-firestore.md` (§Multi-tenancy).
- RNs: RN-400, RN-401, RN-402.
- Mocks: tenant **Castelo Produções** (`slug: castelo-producoes`, `tipo: produtor`, `status: ativo`, owner Marina Castelo); um segundo tenant leve **Passo Certo Eventos** (`passo-certo`, `pending`) para exercitar lifecycle e macro.

**Arquivos (criar/editar)**
- `packages/core/src/platform/tenant.ts` — `type Tenant`, `type TenantStatus`, `type TenantTipo`, transições válidas (`canTransition(from,to)`).
- `packages/api-client/src/platform/tenants.ts` — leitura/escrita de tenant (guardada por papel).
- `functions/firestore.rules` — Rules base de `tenants/{tenantId}` (leitura: membro do tenant ou `platform_admin`; escrita: `platform_admin`).
- `functions/seed/tenants.seed.ts` — seed dos tenants canônicos.

**Passos de implementação**
1. `type TenantStatus = 'pending'|'ativo'|'suspenso'`; `type TenantTipo = 'produtor'|'promotor'`; `type Tenant = { id; nome; slug; status; ownerUid; tipo; criadoEm; atualizadoEm }`.
2. Função pura `canTransition(from, to)` validando `pending→ativo`, `ativo→suspenso`, `suspenso→ativo` (RN-402); demais transições inválidas.
3. Rules: `allow read` se `request.auth.token.tenantId == tenantId` **ou** `request.auth.token.role == 'platform_admin'`; `allow write` só `platform_admin` (RN-404 detalha termos noutra coleção).
4. Seed com Castelo Produções (ativo) e Passo Certo (pending).

**Modelo de dados / contratos**
- `tenants/{tenantId}` (docId = uuid; `slug` único validado na escrita).

**Regras de negócio a respeitar**
- RN-400 (isolamento na leitura), RN-401 (claim como fonte de papel), RN-402 (transições válidas).

**Critérios de aceite (testáveis)**
- **Dado** `canTransition('pending','ativo')`, **quando** avalio, **então** `true`; **dado** `canTransition('pending','suspenso')`, **então** `false`.
- **Dado** um cliente sem claim `platform_admin`, **quando** escreve em `tenants`, **então** a Rule nega.
- **Dado** um `tenant_owner` de outro tenant, **quando** lê `tenants/{id}` que não é o seu, **então** a Rule nega.

**Testes a escrever**
- unit: `canTransition` (matriz de transições); validação de slug único.
- integração (emulator): leitura por membro do tenant × `platform_admin` × terceiro; escrita negada ao cliente comum.

**Definition of Done**
- [ ] Critérios de aceite passam · [ ] Rules de `tenants` (isolamento RN-400) · [ ] Transições RN-402 · [ ] Testes verdes · [ ] Lint + type-check limpos · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Custom claims (T2); rules de coleções de domínio (T3); termos comerciais (S1602).

#### LEELA-S1600-T2 · Custom claims (`role` + `tenantId`) — Function `setTenantClaims` + propagação

- **Tipo:** api/function · **Depende de:** S1600-T1, E00 (Auth) · **Bloqueia:** S1601-T1, S1600-T3 · **Estimativa:** M

**Objetivo**
Definir e aplicar as custom claims (`role` + `tenantId`) via Cloud Function (Admin SDK), de forma que a autorização em Security Rules seja dirigida por claim e nunca pelo cliente.

**Contexto & referências**
- ADR-009 (claims). RNs: RN-401, RN-403.
- Papéis: `platform_admin`, `tenant_owner`, `tenant_staff`, `promoter`, `athlete`.

**Arquivos (criar/editar)**
- `functions/src/platform/setTenantClaims.ts` — callable/admin: seta `role` + `tenantId` no usuário; revalida sessão.
- `packages/core/src/platform/roles.ts` — `type Role`, `type AuthClaims = { role: Role; tenantId?: string }`, guards puros (`isPlatformAdmin`, `belongsToTenant`).
- `functions/src/platform/onUserCreate.ts` — atleta ganha `role: 'athlete'` (global, sem `tenantId`) no primeiro login.

**Passos de implementação**
1. `type Role = 'platform_admin'|'tenant_owner'|'tenant_staff'|'promoter'|'athlete'`.
2. `setTenantClaims(uid, role, tenantId?)` (Admin SDK) — só invocável por `platform_admin` (ou pelo fluxo de provisionamento S1601); grava claim e força refresh de token.
3. `onUserCreate`: usuário novo padrão `athlete` (global). Papéis de tenant só via provisionamento/convite.
4. Guards puros em `core` reusados por UI e por testes de Rules.

**Modelo de dados / contratos**
- Sem coleção nova (claims vivem no token). `setTenantClaims(uid, role, tenantId?) -> void`.

**Regras de negócio a respeitar**
- RN-401 (claim é fonte de papel), RN-403 (claims fazem parte do provisionamento atômico).

**Critérios de aceite (testáveis)**
- **Dado** `setTenantClaims(uid,'tenant_owner','castelo-producoes')`, **quando** roda, **então** o token do usuário passa a carregar `role` e `tenantId`.
- **Dado** um usuário não-admin, **quando** invoca `setTenantClaims`, **então** é negado.
- **Dado** `belongsToTenant(claims,'A')` com `claims.tenantId='B'`, **quando** avalio, **então** `false` (e `true` para `platform_admin`).

**Testes a escrever**
- unit: guards `isPlatformAdmin`/`belongsToTenant`.
- integração (emulator): set de claim só por admin; atleta novo vira `athlete`.

**Definition of Done**
- [ ] Claims por Function (nunca cliente) · [ ] Guards puros em `core` · [ ] Autorização de `setTenantClaims` restrita · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Provisionamento completo do tenant (S1601-T1); rules de domínio (T3).

#### LEELA-S1600-T3 · Security Rules multi-tenant (isolamento por `tenantId` nas coleções de domínio) + testes

- **Tipo:** integration · **Depende de:** S1600-T1, S1600-T2 · **Bloqueia:** — · **Estimativa:** L

**Objetivo**
Aplicar o isolamento por `tenantId` nas Security Rules de todas as coleções tenant-scoped (eventos, clubes, inscritos, comunicados, parcerias, programaAfiliacao, pagamentos, equipe, promotores, subscriptions), com bloqueio de escrita para tenant `suspenso`, e provar o isolamento em testes de integração.

**Contexto & referências**
- ADR-009 (partição). `modelo-de-dados-firestore.md` (§Security Rules; §Multi-tenancy). `estrategia-testes.md` (Firestore rules no emulator).
- RNs: RN-400, RN-401, RN-402.
- Coleções tenant-scoped (lista completa): `eventos`, `clubes`, `inscritos`, `comunicados`, `parcerias`, `programaAfiliacao`, `pagamentos`, `equipe`, `promotores`, `subscriptions`. Global: `atletas`, `catalogoAcoes`, `config/system`.

**Arquivos (criar/editar)**
- `functions/firestore.rules` — helpers `isTenantMember(tenantId)`, `isPlatformAdmin()`, `tenantAtivo(tenantId)`; aplicar em cada coleção scoped.
- `functions/test/rules/tenantIsolation.test.ts` — matriz de isolamento (A não lê B; admin cruza; suspenso bloqueia escrita).

**Passos de implementação**
1. Helper `isTenantMember(tenantId) = request.auth.token.tenantId == tenantId`; `isPlatformAdmin() = request.auth.token.role == 'platform_admin'`.
2. Toda coleção scoped: `allow read: if isTenantMember(resource.data.tenantId) || isPlatformAdmin()`; `allow write` idem + `tenantAtivo()` (bloqueia escrita se `suspenso` — RN-402).
3. `atletas` global: `allow read/write` só do próprio doc (`request.auth.uid == atletaId`), independente de tenant.
4. Teste de matriz cruzando 2 tenants (Castelo × Passo Certo) + admin + terceiro.

**Modelo de dados / contratos**
- Sem coleção nova; consolida as Rules das coleções de domínio já modeladas por E03/E04/E05/E09 com o predicado de `tenantId`.

**Regras de negócio a respeitar**
- RN-400 (nunca cruza), RN-401 (claim), RN-402 (suspenso bloqueia escrita, preserva leitura).

**Critérios de aceite (testáveis)**
- **Dado** owner de A, **quando** lê `eventos` de B, **então** negado; **quando** lê os de A, **então** permitido.
- **Dado** `platform_admin`, **quando** lê `eventos` de A e de B, **então** permitido.
- **Dado** tenant A `suspenso`, **quando** o owner cria evento, **então** negado; **quando** lê evento existente, **então** permitido.

**Testes a escrever**
- integração (emulator): matriz completa de isolamento + bloqueio por suspensão + `atletas` global.

**Definition of Done**
- [ ] Isolamento provado em teste (RN-400) · [ ] Suspenso bloqueia escrita/preserva leitura (RN-402) · [ ] Helpers reusados em todas as coleções scoped · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI de qualquer tela; lógica de negócio das coleções (pertence aos épicos de origem).

---

### LEELA-S1601 · Onboarding e lifecycle do tenant (aprovar, provisionar, ativar, suspender)

**Como** super-admin, **quero** aprovar um produtor e provisionar sua conta isolada, e depois ativar/suspender/reativar, **para** operar o marketplace sem intervenção técnica e sem apagar dados ao suspender.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel (back-office) · **V1-slim:** ✅ (T1..T4)
- **Tela(s) de referência:** — (novo — back-office; sem protótipo)
- **RNs:** RN-402, RN-403, RN-401, §2.5, §2.12, §2.15, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** um pedido de produtor `pending`, **quando** aprovo, **então** o sistema cria `tenants/{id}` (ativo) + `profissionais/{owner}` + claims (`tenant_owner` + `tenantId`) atomicamente (RN-403) e mostra Toast.
- **Dado** a lista de tenants, **quando** abro, **então** vejo tabela densa (§2.5) com nome, slug, tipo, status e saúde, com filtros por status e EmptyState.
- **Dado** um tenant ativo, **quando** o suspendo, **então** passo por `ConfirmModal` (§2.15) com preview (o que fica bloqueado × o que é preservado) e o status vira `suspenso` (RN-402).
- **Dado** um tenant suspenso, **quando** reativo, **então** volta a `ativo` (RN-402) com Toast.
- **Dado** uma transição inválida (ex.: `pending → suspenso`), **quando** tento, **então** é bloqueada (RN-402).

**Tasks:** LEELA-S1601-T1, LEELA-S1601-T2, LEELA-S1601-T3, LEELA-S1601-T4

#### LEELA-S1601-T1 · Function `provisionTenant` (cria tenant + owner + claims, atômico)

- **Tipo:** api/function · **Depende de:** S1600-T1, S1600-T2 · **Bloqueia:** S1601-T4 · **Estimativa:** M · **V1-slim:** ✅

**Objetivo**
Cloud Function que provisiona um tenant de ponta a ponta e de forma atômica: cria `tenants/{id}` (ativo), garante o `profissionais/{ownerUid}` owner e aplica as custom claims, sem deixar estado parcial em caso de falha.

**Contexto & referências**
- RNs: RN-403 (atômico), RN-401 (claims), RN-402 (nasce `ativo`).
- Mocks: owner Marina Castelo → tenant Castelo Produções.

**Arquivos (criar/editar)**
- `functions/src/platform/provisionTenant.ts` — callable (só `platform_admin`).
- `packages/core/src/platform/provisioning.ts` — `type ProvisionInput`, validação pura.

**Passos de implementação**
1. Input: `{ nome, slug, tipo, ownerEmail, saasMonthlyFee? , platformFeePct? }` (termos iniciais opcionais, senão default seguro).
2. Resolver/criar o usuário owner (Auth) por email; criar `profissionais/{ownerUid}` se não existir.
3. Numa transação/batch: gravar `tenants/{id}` (status `ativo`), gravar `commercialTerms/current` inicial, chamar `setTenantClaims(ownerUid,'tenant_owner', tenantId)` (S1600-T2).
4. Em falha de qualquer passo, reverter (não deixar tenant meio-criado) e reportar ao Sentry.

**Modelo de dados / contratos**
- Escreve `tenants/{id}`, `tenants/{id}/commercialTerms/current`, `profissionais/{ownerUid}`; seta claims. `provisionTenant(input) -> { tenantId }`.

**Regras de negócio a respeitar**
- RN-403 (atomicidade), RN-401 (claims), RN-404 (termos iniciais válidos), RN-405 (`saasMonthlyFee` pode 0).

**Critérios de aceite (testáveis)**
- **Dado** input válido, **quando** provisiono, **então** existem `tenants/{id}` ativo + owner + claim `tenant_owner`/`tenantId`.
- **Dado** falha ao setar claim, **quando** provisiono, **então** o tenant não é criado (rollback — RN-403).
- **Dado** um invocador não-admin, **quando** chama, **então** negado.

**Testes a escrever**
- unit: validação de `ProvisionInput` (slug/email).
- integração (emulator): provisionamento completo; rollback em falha; autorização só admin.

**Definition of Done**
- [ ] Provisionamento atômico (RN-403) · [ ] Claims aplicadas (RN-401) · [ ] Só `platform_admin` invoca · [ ] Rollback em falha · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Transições de lifecycle pós-criação (T2); UI (T3/T4).

#### LEELA-S1601-T2 · Function de lifecycle (`activate`/`suspend`/`reactivate`) com guards

- **Tipo:** api/function · **Depende de:** S1600-T1, S1601-T1 · **Bloqueia:** S1601-T4 · **Estimativa:** S · **V1-slim:** ✅

**Objetivo**
Expor as transições de status do tenant como operação de servidor guardada, validando `canTransition` (RN-402) e efeitos colaterais (bloquear escrita ao suspender, preservar dados).

**Contexto & referências**
- RNs: RN-402 (transições + suspensão preserva dados), RN-401 (só `platform_admin`).
- `core/platform/tenant.ts` (`canTransition` de S1600-T1).

**Arquivos (criar/editar)**
- `functions/src/platform/tenantLifecycle.ts` — `transitionTenant(tenantId, to)` callable (só admin).

**Passos de implementação**
1. Validar `canTransition(atual, to)`; recusar transição inválida com erro claro.
2. Aplicar novo `status` + `atualizadoEm`; suspensão apenas muda status (dados intactos — a Rule de T3 já bloqueia escrita quando `suspenso`).
3. Registrar auditoria mínima (quem/quando) e Sentry em erro.

**Modelo de dados / contratos**
- Atualiza `tenants/{id}.status`. `transitionTenant(tenantId, to) -> void`.

**Regras de negócio a respeitar**
- RN-402 (matriz de transições; preservação de dados), RN-401 (autorização).

**Critérios de aceite (testáveis)**
- **Dado** tenant ativo, **quando** `transitionTenant(id,'suspenso')`, **então** status vira `suspenso` e nenhum doc de domínio é apagado.
- **Dado** tenant `pending`, **quando** `transitionTenant(id,'suspenso')`, **então** rejeitado (RN-402).
- **Dado** invocador não-admin, **quando** chama, **então** negado.

**Testes a escrever**
- integração (emulator): transições válidas/ inválidas; suspensão preserva dados; autorização.

**Definition of Done**
- [ ] Transições validadas (RN-402) · [ ] Suspensão preserva dados · [ ] Só `platform_admin` · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T4); notificação ao produtor sobre suspensão (futuro).

#### LEELA-S1601-T3 · Tela lista de tenants (tabela densa, filtros, saúde)

- **Tipo:** screen · **Depende de:** S1600-T1, E01 (Shell, Table densa §2.5) · **Estimativa:** M · **V1-slim:** ✅

**Objetivo**
Renderizar a lista de tenants na área de plataforma: tabela densa (§2.5) com nome, slug, tipo, status (badge) e indicadores de saúde, com busca/filtros por status e EmptyState.

**Contexto & referências**
- RNs: RN-402 (status), §2.5, §2.12, §2.16.
- Mocks: Castelo Produções (ativo), Passo Certo (pending); saúde a partir de `∑gmvAcumulado`/`eventosAtivos`.
- Componentes DS: Shell de plataforma (sidebar própria), Table densa, Badge (status: ativo/pending/suspenso), Chip de filtro, EmptyState, Button ("Novo tenant" → T4).

**Arquivos (criar/editar)**
- `apps/painel/app/plataforma/tenants/page.tsx` — rota guardada por claim `platform_admin`.
- `apps/painel/app/plataforma/tenants/_components/TenantsTable.tsx`.
- `apps/painel/app/plataforma/_components/PlatformShell.tsx` — shell/nav do super-admin (Tenants, Termos, Billing, Macro).

**Passos de implementação**
1. Guard de rota: só `platform_admin` (claim) acessa; senão 403 (reusa E07 quando disponível).
2. Tabela densa: nome, slug, tipo, status (badge), GMV acumulado, eventos ativos, última atividade.
3. Filtros chip por status; contador "mostrando X de Y"; EmptyState "Nenhum tenant encontrado com os filtros aplicados." (glossário).
4. Ações por linha: ver detalhe (T4). Botão "Novo tenant" abre o fluxo de provisionamento (T4).

**Modelo de dados / contratos**
- Lê `tenants` (S1600-T1) + ∑ de saúde. Sem escrita direta de agregados.

**Regras de negócio a respeitar**
- RN-401 (guard por claim), RN-402 (badges de status), §2.5/§2.12/§2.16.

**Critérios de aceite (testáveis)**
- **Dado** um usuário sem claim `platform_admin`, **quando** acesso `/plataforma/tenants`, **então** vejo 403 (não a lista).
- **Dado** tenants, **quando** filtro por `pending`, **então** só Passo Certo aparece e o contador atualiza.
- **Dado** filtro sem correspondência, **quando** aplico, **então** EmptyState do glossário.

**Testes a escrever**
- unit: filtro/contador; mapeamento status→badge; guard de claim.
- e2e: acesso admin × não-admin; filtrar por status.

**Definition of Done**
- [ ] Guard `platform_admin` · [ ] Table densa §2.5 · [ ] EmptyState + contador · [ ] Estados §2.12 · [ ] Flat §2.16 · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Detalhe/ações de lifecycle (T4); edição de termos (S1602).

#### LEELA-S1601-T4 · Tela detalhe do tenant + provisionar/aprovar/suspender (ConfirmModal)

- **Tipo:** screen · **Depende de:** S1601-T1, S1601-T2, S1601-T3, E01 (Modal/ConfirmModal) · **Estimativa:** M · **V1-slim:** ✅

**Objetivo**
Renderizar o detalhe de um tenant (perfil, owner, status, saúde, atalho para termos) e as ações de lifecycle — provisionar/aprovar, suspender e reativar — cada ação sensível via `ConfirmModal` (§2.15) com preview de consequências.

**Contexto & referências**
- RNs: RN-402, RN-403, §2.15, §2.12, §2.16.
- Mocks: Castelo Produções (owner Marina Castelo).
- Componentes DS: Cards flat, KPIs de saúde, Badge de status, Modal (provisionar: nome/slug/tipo/email owner), ConfirmModal (suspender/reativar), Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/plataforma/tenants/[tenantId]/page.tsx`
- `apps/painel/app/plataforma/tenants/_components/{TenantDetail,ProvisionTenantModal,LifecycleActions}.tsx`

**Passos de implementação**
1. Detalhe: perfil (nome/slug/tipo), owner, status (badge), KPIs de saúde (GMV acumulado, eventos ativos, última atividade), link "Termos comerciais" (S1602).
2. "Novo tenant"/"Aprovar": modal chama `provisionTenant` (S1601-T1) → Toast "Tenant [nome] provisionado".
3. "Suspender": `ConfirmModal` com preview — bloqueado (novas vendas/publicações) × preservado (dados, membros, histórico) → `transitionTenant(id,'suspenso')` (T2) → Toast.
4. "Reativar": `ConfirmModal` → `transitionTenant(id,'ativo')` → Toast; card crítico (border-left Vulcão, exceção §2.16) enquanto suspenso.

**Modelo de dados / contratos**
- Lê `tenants/{id}`; aciona `provisionTenant`/`transitionTenant`. Nenhuma escrita direta de status no cliente (passa por Function).

**Regras de negócio a respeitar**
- RN-403 (provisionamento por Function), RN-402 (transições por Function; suspensão preserva), §2.15.

**Critérios de aceite (testáveis)**
- **Dado** um `pending`, **quando** aprovo/provisiono, **então** vira ativo e Toast de sucesso.
- **Dado** "Suspender", **quando** confirmo no ConfirmModal, **então** vejo o preview (bloqueado × preservado) e o status vira suspenso.
- **Dado** status suspenso, **quando** renderizo, **então** card crítico (border-left Vulcão) e ação "Reativar" disponível.

**Testes a escrever**
- unit: montagem do preview do ConfirmModal (bloqueado × preservado); render por status.
- e2e: provisionar → suspender (ConfirmModal) → reativar.

**Definition of Done**
- [ ] Ações via Function (nunca status direto no cliente) · [ ] Suspender/reativar via §2.15 com preview · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Edição de termos comerciais (S1602); onboarding self-service/KYC (futuro).

---

### LEELA-S1602 · Termos comerciais por tenant (`commercialTerms`)

**Como** super-admin, **quero** configurar os termos comerciais de cada tenant num lugar só, **para** que o checkout (E04) e o financeiro/split (E09) usem a taxa e as condições certas por produtor, sem constante no código.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel (back-office) · **V1-slim:** ✅ (todo)
- **Tela(s) de referência:** — (novo — back-office; sem protótipo)
- **RNs:** RN-404, RN-405, RN-406, RN-410, RN-330 (consumo), RN-311 (consumo), §2.12, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** um tenant, **quando** abro seus termos, **então** vejo `platformFeePct`, `installmentRules`, `anticipation`, `communityMonthlyEnabled` e `saasMonthlyFee` editáveis **só** por mim (`platform_admin` — RN-404).
- **Dado** que sou `tenant_owner`, **quando** leio meus termos, **então** vejo read-only (não edito — RN-404).
- **Dado** `saasMonthlyFee = 0`, **quando** salvo, **então** é aceito (produtor-sócio — RN-405).
- **Dado** que o checkout de E04 precisa da taxa/parcelamento, **quando** consulta, **então** lê `commercialTerms` do tenant (RN-406) e não uma constante.
- **Dado** o campo `anticipation`, **quando** configuro, **então** persiste como termo, mas a mecânica de antecipação não é acionada nesta fase (RN-410).

**Tasks:** LEELA-S1602-T1, LEELA-S1602-T2, LEELA-S1602-T3

#### LEELA-S1602-T1 · Modelo `commercialTerms/current` + tipos + Rules (escrita só platform_admin)

- **Tipo:** data-model · **Depende de:** S1600-T1, S1600-T2 · **Bloqueia:** S1602-T2, S1602-T3, S1604-T2 · **Estimativa:** S · **V1-slim:** ✅

**Objetivo**
Modelar os termos comerciais do tenant e criar `tenants/{id}/commercialTerms/current` com Security Rules que restringem a escrita ao `platform_admin` e permitem leitura read-only ao próprio tenant e às Functions de E04/E09.

**Contexto & referências**
- ADR-009 (§Termos comerciais). RNs: RN-404, RN-405, RN-410.
- Mocks: Castelo Produções — `platformFeePct` 10,5% (fonte do mock de E09), parcelamento até 12x sem juros, `anticipation` indisponível, `communityMonthlyEnabled` false, `saasMonthlyFee` R$ 0.

**Arquivos (criar/editar)**
- `packages/core/src/platform/commercialTerms.ts` — `type CommercialTerms`, `type InstallmentRules`, `type Anticipation`, validações puras.
- `packages/api-client/src/platform/commercialTerms.ts` — leitura (tenant/admin) + escrita (admin).
- `functions/firestore.rules` — Rules de `commercialTerms/current` (write só `platform_admin`; read tenant-membro ou admin).
- `functions/seed/commercialTerms.seed.ts` — seed do termo canônico.

**Passos de implementação**
1. `type InstallmentRules = { maxParcelas; jurosAoMes; parcelaMinima }`; `type Anticipation = { disponivel: boolean; custoPct?: number }`; `type CommercialTerms = { platformFeePct; installmentRules; anticipation; communityMonthlyEnabled; saasMonthlyFee; atualizadoPor; atualizadoEm }`.
2. Validações puras: `platformFeePct` 0–100; `saasMonthlyFee ≥ 0` (0 válido — RN-405); `maxParcelas ≥ 1`.
3. Rules: `allow write: if isPlatformAdmin()`; `allow read: if isTenantMember(tenantId) || isPlatformAdmin()` (RN-404).
4. Seed do termo canônico (10,5%, 12x, antecipação off, comunidade off, SaaS 0).

**Modelo de dados / contratos**
- `tenants/{tenantId}/commercialTerms/current` (doc único).

**Regras de negócio a respeitar**
- RN-404 (escrita só admin; leitura read-only para o tenant), RN-405 (`saasMonthlyFee` 0), RN-410 (`anticipation` só campo).

**Critérios de aceite (testáveis)**
- **Dado** um `tenant_owner`, **quando** tenta escrever em `commercialTerms`, **então** a Rule nega; **quando** lê, **então** permite.
- **Dado** `platform_admin`, **quando** escreve, **então** permite.
- **Dado** `saasMonthlyFee = 0`, **quando** valido, **então** aceito (RN-405).

**Testes a escrever**
- unit: validações (`platformFeePct`, `saasMonthlyFee`, parcelas).
- integração (emulator): write só admin; read tenant-membro × terceiro negado.

**Definition of Done**
- [ ] Escrita só `platform_admin` (RN-404) · [ ] `saasMonthlyFee` 0 válido (RN-405) · [ ] Rules · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T2); contrato de consumo por E04/E09 (T3); mecânica de antecipação (RN-410, pós-V1).

#### LEELA-S1602-T2 · Tela/editor de termos comerciais (por tenant)

- **Tipo:** screen · **Depende de:** S1602-T1, E01 (Card, Input, Toggle) · **Estimativa:** M · **V1-slim:** ✅

**Objetivo**
Renderizar o editor de termos comerciais de um tenant na área de plataforma: `platformFeePct`, `installmentRules`, `anticipation`, `communityMonthlyEnabled`, `saasMonthlyFee`, salvável só pelo `platform_admin`, com validação inline e Toast.

**Contexto & referências**
- RNs: RN-404, RN-405, RN-410, §2.12, §2.16.
- Mocks: termos da Castelo Produções (10,5%, 12x, antecipação off, comunidade off, SaaS 0).
- Componentes DS: Cards flat, Input (percentual/valor/parcelas), Toggle (comunidade/antecipação), Button, Toast, aviso quando `saasMonthlyFee = 0` ("Produtor isento de mensalidade SaaS").

**Arquivos (criar/editar)**
- `apps/painel/app/plataforma/tenants/[tenantId]/termos/page.tsx`
- `apps/painel/app/plataforma/tenants/_components/CommercialTermsForm.tsx`

**Passos de implementação**
1. Form com seções: Taxa (`platformFeePct`), Parcelamento (`maxParcelas`/`jurosAoMes`/`parcelaMinima`), Antecipação (`disponivel`/`custoPct?` — badge "disponível em breve" para a mecânica, RN-410), Comunidade (`communityMonthlyEnabled` toggle), SaaS (`saasMonthlyFee`).
2. Validação inline (0–100 para %, ≥ 0 para valores, ≥ 1 parcela); salvar → Toast "Termos de [tenant] atualizados".
3. Guard: só `platform_admin` edita (senão read-only); para `tenant_owner` a mesma tela é read-only (RN-404).
4. Estados vazio/erro/carregando (§2.12); flat §2.16.

**Modelo de dados / contratos**
- Lê/escreve `commercialTerms/current` (S1602-T1). Escrita bloqueada a não-admin pela Rule.

**Regras de negócio a respeitar**
- RN-404 (só admin edita), RN-405 (0 válido), RN-410 (antecipação só campo).

**Critérios de aceite (testáveis)**
- **Dado** `platform_admin`, **quando** salvo `platformFeePct=10.5`, **então** persiste + Toast.
- **Dado** `tenant_owner`, **quando** abro a tela, **então** vejo read-only (sem botão salvar).
- **Dado** `saasMonthlyFee=0`, **quando** salvo, **então** aceito + aviso "Produtor isento".

**Testes a escrever**
- unit: validação de campos; modo read-only por papel.
- e2e: admin edita e salva; owner vê read-only.

**Definition of Done**
- [ ] Só `platform_admin` edita (RN-404) · [ ] `saasMonthlyFee` 0 com aviso (RN-405) · [ ] Antecipação como campo (RN-410) · [ ] Estados §2.12 · [ ] Flat §2.16 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Consumo por E04/E09 (T3); cobrança SaaS (S1604).

#### LEELA-S1602-T3 · Contrato de consumo dos termos por E04 (checkout/parcelamento) e E09 (split/taxa)

- **Tipo:** integration · **Depende de:** S1602-T1 · **Bloqueia:** — · **Estimativa:** S · **V1-slim:** ✅

**Objetivo**
Expor os termos comerciais do tenant como fonte única para o checkout (E04, parcelamento) e para o financeiro/split (E09, `platformFeePct`), substituindo qualquer taxa/constante hardcoded pela leitura de `commercialTerms`.

**Contexto & referências**
- RNs: RN-406 (fonte da taxa), RN-330 (E09 consome), RN-311 (E04 parcelamento/split).
- Consumidores: E04-S300 (checkout/parcelamento), E04-S301-T3/S302 (split), E09-S901-T3 (`computeTaxa`).

**Arquivos (criar/editar)**
- `packages/core/src/platform/termsProvider.ts` — `getPlatformFeePct(tenantId)`, `getInstallmentRules(tenantId)` (contrato puro sobre o read tipado).
- `packages/api-client/src/platform/commercialTerms.ts` — leitura cacheável dos termos por tenant.
- Ajuste em `packages/core/src/finance/calc.ts` (E09) e no cálculo de parcelamento de E04: receber `platformFeePct`/`installmentRules` do tenant, não constante.

**Passos de implementação**
1. Definir o contrato `TermsProvider` com `getPlatformFeePct(tenantId)` e `getInstallmentRules(tenantId)` lendo `commercialTerms/current`.
2. `computeTaxa` (E09) passa a receber `platformFeePct` do tenant (RN-406); o mock 10,5% vira o termo do tenant.
3. O parcelamento do checkout (E04) lê `installmentRules` do tenant (RN-311).
4. Documentar a dependência: qualquer constante de taxa/parcelamento é removida em favor do termo.

**Modelo de dados / contratos**
- Lê `tenants/{id}/commercialTerms/current`; expõe funções de leitura tipadas. Sem coleção nova.

**Regras de negócio a respeitar**
- RN-406 (termo é fonte), RN-330/RN-311 (consumo por E09/E04).

**Critérios de aceite (testáveis)**
- **Dado** o tenant Castelo com `platformFeePct=10.5`, **quando** E09 calcula a taxa, **então** usa 10,5% do termo (não constante).
- **Dado** `installmentRules` com `maxParcelas=12`, **quando** E04 monta o parcelamento, **então** oferece até 12x conforme o termo.
- **Dado** dois tenants com taxas diferentes, **quando** cada checkout roda, **então** cada um usa a própria taxa (isolamento econômico).

**Testes a escrever**
- unit: `getPlatformFeePct`/`getInstallmentRules`; `computeTaxa` com taxa vinda do termo.
- integração (emulator): leitura do termo por tenant; taxas distintas por tenant.

**Definition of Done**
- [ ] Taxa/parcelamento vêm do termo (RN-406) · [ ] Sem constante de taxa hardcoded · [ ] E09/E04 consomem o contrato · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Alterar a UI de checkout/financeiro (pertence a E04/E09); mecânica de antecipação.

---

### LEELA-S1603 · Recorrência da comunidade (mensalidade tenant→membro, destrava clube pago) · pós-V1

**Como** produtor (tenant), **quero** cobrar mensalidade dos membros do meu clube, **para** destravar o clube pago (RN-104) e gerar receita recorrente da comunidade.

- **MoSCoW:** Should (pós-V1) · **Estimativa:** M · **Superfície:** Painel · **V1-slim:** ❌ pós-V1
- **Tela(s) de referência:** — (novo; consome conceito de `Club-*` de E05)
- **RNs:** RN-104, RN-407, RN-333 (idempotência de webhook), §2.5, §2.12, §2.15

**Critérios de aceite (Given/When/Then):**
- **Dado** `communityMonthlyEnabled = true` nos termos, **quando** o produtor habilita o clube pago, **então** `modeloEntrada` do clube destrava (RN-104/407).
- **Dado** um membro que assina, **quando** a assinatura é criada, **então** vira `tenants/{id}/subscriptions/{subId}` (`ativa`) via `PaymentProvider` (assinatura).
- **Dado** a renovação mensal, **quando** o webhook de cobrança chega, **então** é processado idempotentemente (RN-333) e mantém o status (`ativa`/`inadimplente`).
- **Dado** `communityMonthlyEnabled = false`, **quando** o produtor tenta cobrar, **então** é bloqueado (RN-407).

**Tasks:** LEELA-S1603-T1, LEELA-S1603-T2, LEELA-S1603-T3

#### LEELA-S1603-T1 · Modelo `subscriptions` (comunidade) + tipos + Rules

- **Tipo:** data-model · **Depende de:** S1600-T1, S1602-T1 · **Bloqueia:** S1603-T2, S1603-T3 · **Estimativa:** S · **V1-slim:** ❌

**Objetivo**
Modelar a assinatura da comunidade (`tenant → membro`) e criar `tenants/{id}/subscriptions/{subId}` com Security Rules (escrita de status só via Function; leitura pelo membro e pelo tenant).

**Contexto & referências**
- ADR-009 (§Recorrência). `modelo-de-dados-firestore.md` (`subscriptions`). RNs: RN-104, RN-407, RN-333.
- Mocks: membro assinando clube da Castelo Produções.

**Arquivos (criar/editar)**
- `packages/core/src/platform/subscription.ts` — `type CommunitySubscription`, `type SubscriptionStatus`.
- `functions/firestore.rules` — Rules de `subscriptions` (status só Function; leitura membro/tenant).
- `functions/seed/subscriptions.seed.ts`.

**Passos de implementação**
1. `type SubscriptionStatus = 'ativa'|'inadimplente'|'cancelada'`; `type CommunitySubscription = { id; atletaId; clubeId; valor; status; proximaCobranca; providerSubId; criadoEm }`.
2. Rules: leitura pelo `atletaId` dono, pelo tenant-membro e por admin; escrita de `status`/`proximaCobranca` só Function.
3. Seed de exemplo (uma assinatura ativa).

**Modelo de dados / contratos**
- `tenants/{tenantId}/subscriptions/{subId}`; `providerSubId` chave de idempotência.

**Regras de negócio a respeitar**
- RN-104/407 (destrava clube pago; só com termo habilitado), RN-333 (idempotência).

**Critérios de aceite (testáveis)**
- **Dado** um cliente, **quando** tenta escrever `status`, **então** a Rule nega (só Function).
- **Dado** o atleta dono, **quando** lê a própria assinatura, **então** permite.

**Testes a escrever**
- unit: tipos/estados.
- integração (emulator): leitura do dono/tenant; escrita de status negada ao cliente.

**Definition of Done**
- [ ] Rules de `subscriptions` · [ ] Status só Function · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Function de assinatura/webhook (T2); UI (T3).

#### LEELA-S1603-T2 · Function de assinatura da comunidade (`PaymentProvider` assinatura) + webhook idempotente

- **Tipo:** api/function · **Depende de:** S1603-T1, E04-S301-T2 (`PaymentProvider`) · **Estimativa:** M · **V1-slim:** ❌

**Objetivo**
Criar/renovar a assinatura da comunidade via `PaymentProvider` (assinatura), gravando `subscriptions` e processando o webhook de renovação idempotentemente (RN-333), com transição de status em inadimplência.

**Contexto & referências**
- ADR-006 (recorrência **impacta** ADR-006: exige suporte a assinatura). `estrategia-testes.md` (pagamento = cobertura máxima).
- RNs: RN-407, RN-333, RN-104.

**Arquivos (criar/editar)**
- `functions/src/platform/createCommunitySubscription.ts`
- `functions/src/platform/onSubscriptionWebhook.ts`
- `packages/core/src/platform/subscriptionRules.ts` — transição de status pura (ativa↔inadimplente↔cancelada).

**Passos de implementação**
1. `createCommunitySubscription`: valida `communityMonthlyEnabled=true` (RN-407); cria assinatura no `PaymentProvider`; grava `subscriptions` (`ativa`, `providerSubId`).
2. `onSubscriptionWebhook`: idempotente por `providerSubId` + evento; renovação confirma → mantém `ativa`; falha → `inadimplente`; cancelamento → `cancelada`.
3. Sem termo habilitado, `createCommunitySubscription` recusa (RN-407).

**Modelo de dados / contratos**
- Escreve `tenants/{id}/subscriptions/{subId}`. `createCommunitySubscription(input) -> { subId }`; webhook `-> void`.

**Regras de negócio a respeitar**
- RN-407 (só com termo), RN-333 (idempotência), RN-104 (destrava clube pago).

**Critérios de aceite (testáveis)**
- **Dado** termo habilitado, **quando** crio assinatura, **então** vira `ativa` com `providerSubId`.
- **Dado** o mesmo webhook de renovação reprocessado, **quando** chega de novo, **então** não duplica cobrança (RN-333).
- **Dado** falha de cobrança, **quando** o webhook chega, **então** status vira `inadimplente`.

**Testes a escrever**
- integração (emulator + mock provider): criação; renovação idempotente; inadimplência; recusa sem termo.

**Definition of Done**
- [ ] Assinatura via `PaymentProvider` · [ ] Webhook idempotente (RN-333) · [ ] Recusa sem termo (RN-407) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Gateway concreto (ADR-006); UI (T3).

#### LEELA-S1603-T3 · Tela de gestão de assinaturas da comunidade + destravar clube pago

- **Tipo:** screen · **Depende de:** S1603-T1, S1603-T2, E05 (Club-*) · **Estimativa:** M · **V1-slim:** ❌

**Objetivo**
Dar ao produtor (tenant) a gestão das assinaturas da comunidade: habilitar o clube pago (quando o termo permite), ver assinantes (tabela densa §2.5) com status, e cancelar/gerir uma assinatura via `ConfirmModal` (§2.15).

**Contexto & referências**
- RNs: RN-104, RN-407, §2.5, §2.12, §2.15.
- Mocks: clube da Castelo Produções com assinantes.
- Componentes DS: Toggle (habilitar clube pago — depende do termo), Table densa (assinantes: atleta, valor, status, próxima cobrança), Badge (ativa/inadimplente/cancelada), ConfirmModal (cancelar), EmptyState, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/assinaturas/page.tsx`
- `apps/painel/app/clubs/[slug]/assinaturas/_components/SubscribersTable.tsx`

**Passos de implementação**
1. Se `communityMonthlyEnabled=true` (termo), permitir habilitar `modeloEntrada` pago do clube (RN-104); senão, mostrar estado bloqueado com explicação.
2. Tabela densa de assinantes com status + próxima cobrança; filtros; contador; EmptyState.
3. Cancelar assinatura → `ConfirmModal` com preview → Toast.

**Modelo de dados / contratos**
- Lê `subscriptions`; aciona `createCommunitySubscription`/cancelamento (Function). Sem escrita direta de status.

**Regras de negócio a respeitar**
- RN-104/407 (habilitação depende do termo), §2.5/§2.12/§2.15.

**Critérios de aceite (testáveis)**
- **Dado** termo desabilitado, **quando** abro, **então** vejo bloqueio explicado (não consigo habilitar clube pago).
- **Dado** assinantes, **quando** filtro por `inadimplente`, **então** só inadimplentes + contador.
- **Dado** "Cancelar", **quando** confirmo, **então** status vira cancelada + Toast.

**Testes a escrever**
- unit: gating por termo; filtro/contador; mapeamento status→badge.
- e2e: habilitar clube pago (com termo) → ver assinantes → cancelar.

**Definition of Done**
- [ ] Habilitação depende do termo (RN-104/407) · [ ] Table densa §2.5 · [ ] Cancelar via §2.15 · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Fluxo de pagamento do membro no app (E13); dunning avançado.

---

### LEELA-S1604 · Recorrência SaaS (mensalidade Leela→tenant) · pós-V1

**Como** super-admin, **quero** cobrar a mensalidade SaaS de cada tenant conforme `saasMonthlyFee`, **para** monetizar a plataforma sobre os produtores, isentando quem tem fee 0.

- **MoSCoW:** Should (pós-V1) · **Estimativa:** M · **Superfície:** Painel · **V1-slim:** ❌ pós-V1
- **Tela(s) de referência:** — (novo — back-office)
- **RNs:** RN-408, RN-405, RN-333, §2.5, §2.12

**Critérios de aceite (Given/When/Then):**
- **Dado** um tenant com `saasMonthlyFee > 0`, **quando** o ciclo de cobrança roda, **então** gera cobrança via `PaymentProvider` (assinatura) e registra em `platform/billing/{tenantId}` (RN-408).
- **Dado** `saasMonthlyFee = 0`, **quando** o ciclo roda, **então** não gera cobrança nem ledger (isento — RN-405).
- **Dado** o mesmo `providerTxId` reprocessado, **quando** o webhook chega, **então** o ledger não duplica (RN-333).
- **Dado** o billing por tenant, **quando** abro (super-admin), **então** vejo o histórico de cobranças SaaS com status.

**Tasks:** LEELA-S1604-T1, LEELA-S1604-T2, LEELA-S1604-T3

#### LEELA-S1604-T1 · Modelo `platform/billing/{tenantId}` (ledger SaaS) + Rules

- **Tipo:** data-model · **Depende de:** S1600-T1, S1602-T1 · **Bloqueia:** S1604-T2, S1604-T3 · **Estimativa:** S · **V1-slim:** ❌

**Objetivo**
Definir o ledger da mensalidade SaaS e criar `platform/billing/{tenantId}/cobrancas/{providerTxId}` com Security Rules (leitura só `platform_admin`; escrita só Function).

**Contexto & referências**
- `modelo-de-dados-firestore.md` (§Recorrência; `platform/billing`). RNs: RN-408, RN-405, RN-333.

**Arquivos (criar/editar)**
- `packages/core/src/platform/saasBilling.ts` — `type SaasCharge`, `type SaasChargeStatus`.
- `functions/firestore.rules` — Rules de `platform/billing/*` (read só admin; write só Function).

**Passos de implementação**
1. `type SaasChargeStatus = 'confirmada'|'pendente'|'falha'|'isenta'`; `type SaasCharge = { providerTxId; valor; competencia; status; criadoEm }`.
2. Rules: `allow read: if isPlatformAdmin()`; `allow write: if false` (só Admin SDK).
3. Documentar no modelo de dados.

**Modelo de dados / contratos**
- `platform/billing/{tenantId}/cobrancas/{providerTxId}` (docId idempotente — RN-333).

**Regras de negócio a respeitar**
- RN-408 (ledger SaaS), RN-405 (fee 0 → `isenta`/sem cobrança), RN-333 (idempotência).

**Critérios de aceite (testáveis)**
- **Dado** um não-admin, **quando** lê `platform/billing`, **então** negado.
- **Dado** um cliente, **quando** escreve, **então** negado (só Function).

**Testes a escrever**
- integração (emulator): read só admin; write negada ao cliente.

**Definition of Done**
- [ ] Ledger SaaS com Rules · [ ] Leitura só admin · [ ] Escrita só Function · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Function de cobrança (T2); UI (T3).

#### LEELA-S1604-T2 · Function de cobrança SaaS recorrente (deriva de `saasMonthlyFee`, idempotente)

- **Tipo:** api/function · **Depende de:** S1604-T1, S1602-T1, E04-S301-T2 (`PaymentProvider`) · **Estimativa:** M · **V1-slim:** ❌

**Objetivo**
Rodar o ciclo de cobrança SaaS por tenant: derivar o valor de `commercialTerms.saasMonthlyFee`, cobrar via `PaymentProvider` (assinatura), gravar o ledger idempotentemente e pular tenants isentos (`fee 0`).

**Contexto & referências**
- ADR-006 (assinatura). RNs: RN-408, RN-405, RN-333.

**Arquivos (criar/editar)**
- `functions/src/platform/chargeSaasMonthly.ts` — cron mensal + processamento por tenant.
- `functions/src/platform/onSaasWebhook.ts` — webhook idempotente do provider.

**Passos de implementação**
1. Cron mensal itera tenants `ativo`; lê `saasMonthlyFee`.
2. `fee = 0` → grava `isenta` (ou pula, sem cobrança) — RN-405; `fee > 0` → cria cobrança no `PaymentProvider`.
3. `onSaasWebhook`: idempotente por `providerTxId`; confirma/falha atualiza o ledger (RN-333).
4. Sentry em erro, sem dado sensível.

**Modelo de dados / contratos**
- Escreve `platform/billing/{tenantId}/cobrancas/{providerTxId}`. `chargeSaasMonthly() -> void`.

**Regras de negócio a respeitar**
- RN-408 (cobrança SaaS), RN-405 (isenção fee 0), RN-333 (idempotência).

**Critérios de aceite (testáveis)**
- **Dado** tenant com fee R$ 199, **quando** o ciclo roda, **então** cria cobrança e registra no ledger.
- **Dado** tenant com fee 0, **quando** o ciclo roda, **então** nenhuma cobrança é gerada (RN-405).
- **Dado** webhook repetido, **quando** processa, **então** ledger não duplica (RN-333).

**Testes a escrever**
- integração (emulator + mock provider): cobrança com fee > 0; skip com fee 0; webhook idempotente.

**Definition of Done**
- [ ] Deriva de `saasMonthlyFee` (RN-408) · [ ] Isenção fee 0 (RN-405) · [ ] Idempotente (RN-333) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Gateway concreto (ADR-006); nota fiscal; dunning.

#### LEELA-S1604-T3 · Tela billing SaaS por tenant (super-admin)

- **Tipo:** screen · **Depende de:** S1604-T1, S1604-T2, E01 (Table densa) · **Estimativa:** S · **V1-slim:** ❌

**Objetivo**
Exibir ao super-admin o histórico de cobranças SaaS por tenant (tabela densa §2.5) com competência, valor, status, e o indicador de isenção quando `fee = 0`.

**Contexto & referências**
- RNs: RN-408, RN-405, §2.5, §2.12.
- Componentes DS: Table densa, Badge (confirmada/pendente/falha/isenta), EmptyState, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/plataforma/billing/page.tsx` (visão geral por tenant)
- `apps/painel/app/plataforma/tenants/[tenantId]/billing/page.tsx` (detalhe do tenant)

**Passos de implementação**
1. Lista por tenant: última competência, status, valor; drill-down para o histórico.
2. Detalhe: tabela densa de `cobrancas` com competência/valor/status; badge `isenta` para fee 0.
3. Filtros por status; EmptyState; contador.

**Modelo de dados / contratos**
- Lê `platform/billing/{tenantId}/cobrancas` (só admin).

**Regras de negócio a respeitar**
- RN-408, RN-405, §2.5/§2.12.

**Critérios de aceite (testáveis)**
- **Dado** tenant com fee 0, **quando** abro billing, **então** vejo badge "Isento" e sem cobranças.
- **Dado** tenant com cobranças, **quando** filtro por `falha`, **então** só falhas + contador.

**Testes a escrever**
- unit: mapeamento status→badge; render isento.
- e2e: abrir billing → filtrar por status.

**Definition of Done**
- [ ] Só `platform_admin` · [ ] Table densa §2.5 · [ ] Badge isento (RN-405) · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Execução de cobrança (T2); nota fiscal.

---

### LEELA-S1605 · Visão macro do super-admin (GMV, receita Leela, tenants ativos, saúde) · V1-slim parcial

**Como** super-admin, **quero** um painel macro com GMV total, minha receita por tenant, nº de tenants ativos e a saúde de cada um, **para** enxergar o resultado da plataforma sem cruzar planilhas.

- **MoSCoW:** Should (KPIs básicos são V1-slim; dashboards ricos pós-V1) · **Estimativa:** M · **Superfície:** Painel (back-office) · **V1-slim:** ⚠️ T1 + T2/T3 básicos
- **Tela(s) de referência:** — (novo — back-office)
- **RNs:** RN-409, RN-400, §2.5, §2.12, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** que sou `platform_admin`, **quando** abro o macro, **então** vejo GMV total, receita Leela total, nº de tenants ativos e uma tabela de saúde por tenant, tudo de `platform/rollups` (RN-409).
- **Dado** que **não** sou `platform_admin`, **quando** tento abrir o macro, **então** vejo 403 (RN-400).
- **Dado** os agregados, **quando** um pagamento novo confirma em qualquer tenant, **então** o GMV total e a receita Leela do tenant sobem via Function (nunca varrendo no cliente — RN-409).
- **Dado** um período sem movimento, **quando** abro, **então** vejo estado vazio coerente (não zeros ambíguos).

**Tasks:** LEELA-S1605-T1, LEELA-S1605-T2, LEELA-S1605-T3

#### LEELA-S1605-T1 · Modelo `platform/rollups` + Rules (leitura só admin, escrita só Function)

- **Tipo:** data-model · **Depende de:** S1600-T1 · **Bloqueia:** S1605-T2, S1605-T3 · **Estimativa:** S · **V1-slim:** ✅

**Objetivo**
Definir os agregados macro cross-tenant e criar `platform/rollups` com Security Rules (leitura só `platform_admin`; escrita só Function).

**Contexto & referências**
- `modelo-de-dados-firestore.md` (§Multi-tenancy; `platform/rollups`). RNs: RN-409, RN-400.

**Arquivos (criar/editar)**
- `packages/core/src/platform/rollups.ts` — `type PlatformRollup`, `type TenantHealth`.
- `functions/firestore.rules` — Rules de `platform/rollups` (read só admin; write só Function).

**Passos de implementação**
1. `type TenantHealth = { tenantId; gmv; receitaLeela; eventosAtivos; ultimaAtividadeEm; saude: 'saudavel'|'atencao'|'inativo' }`; `type PlatformRollup = { gmvTotal; receitaLeelaTotal; tenantsAtivos; porTenant: Record<string,TenantHealth>; atualizadoEm }`.
2. Regra de saúde pura (`saudavel`/`atencao`/`inativo`) por atividade recente/GMV.
3. Rules: `allow read: if isPlatformAdmin()`; `allow write: if false`.

**Modelo de dados / contratos**
- `platform/rollups/{unico}` (doc único).

**Regras de negócio a respeitar**
- RN-409 (rollups por Function; só admin lê), RN-400 (não cruza fora do admin).

**Critérios de aceite (testáveis)**
- **Dado** um não-admin, **quando** lê `platform/rollups`, **então** negado.
- **Dado** um cliente, **quando** escreve, **então** negado (só Function).

**Testes a escrever**
- unit: derivação de `saude`.
- integração (emulator): read só admin; write negada.

**Definition of Done**
- [ ] Rollups com Rules · [ ] Leitura só admin (RN-409) · [ ] Escrita só Function · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Agregação (T2); tela (T3).

#### LEELA-S1605-T2 · Function de agregação macro cross-tenant (GMV, receita Leela, tenants ativos, saúde)

- **Tipo:** api/function · **Depende de:** S1605-T1, S1602-T3 (fonte da taxa) · **Estimativa:** M · **V1-slim:** ✅ (básico)

**Objetivo**
Manter `platform/rollups` por Cloud Function a partir dos eventos de pagamento de todos os tenants: somar GMV total, calcular a receita Leela por tenant (via `platformFeePct` do termo), contar tenants ativos e derivar a saúde — cross-tenant, idempotente.

**Contexto & referências**
- RNs: RN-409, RN-406 (receita Leela usa a taxa do termo), RN-333 (idempotência).
- Consome os mesmos eventos de pagamento de E09 (rollup financeiro por evento) elevados ao nível plataforma.

**Arquivos (criar/editar)**
- `functions/src/platform/updatePlatformRollups.ts` — trigger onWrite de rollup de evento / pagamento confirmado.
- `packages/core/src/platform/health.ts` — derivação pura de saúde por tenant.

**Passos de implementação**
1. Trigger no rollup financeiro do evento (E09) ou no pagamento confirmado (com `tenantId`).
2. Incrementar `gmvTotal` e `porTenant[tenantId].gmv`; calcular `receitaLeela = gmv × platformFeePct` do termo (RN-406).
3. `tenantsAtivos` a partir de `tenants.status='ativo'`; `saude` por atividade recente (health.ts).
4. Idempotência pelo evento de pagamento (RN-333); distributed counters para pico de vendas.

**Modelo de dados / contratos**
- Escreve `platform/rollups` (∑). `updatePlatformRollups(event) -> void`.

**Regras de negócio a respeitar**
- RN-409 (por Function, cross-tenant), RN-406 (taxa do termo), RN-333 (idempotência).

**Critérios de aceite (testáveis)**
- **Dado** pagamento confirmado de R$ 100 num tenant a 10,5%, **quando** processa, **então** `gmvTotal += 100` e `receitaLeela` do tenant `+= 10,50`.
- **Dado** o mesmo pagamento reprocessado, **quando** chega de novo, **então** os agregados não mudam (RN-333).
- **Dado** dois tenants com taxas diferentes, **quando** ambos vendem, **então** a receita Leela de cada um usa a própria taxa.

**Testes a escrever**
- unit: `health.ts`; cálculo de receita Leela por taxa do termo.
- integração (emulator): agregação cross-tenant; idempotência; contagem de tenants ativos.

**Definition of Done**
- [ ] Rollups cross-tenant por Function (RN-409) · [ ] Receita Leela pela taxa do termo (RN-406) · [ ] Idempotente (RN-333) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Séries temporais/coortes (pós-V1); tela (T3).

#### LEELA-S1605-T3 · Tela dashboard macro (KPIs + saúde por tenant)

- **Tipo:** screen · **Depende de:** S1605-T1, S1605-T2, E01 (KPI cards, Table densa) · **Estimativa:** M · **V1-slim:** ✅ (básico)

**Objetivo**
Renderizar o painel macro do super-admin: KPIs (GMV total, receita Leela total, tenants ativos) e a tabela de saúde por tenant (§2.5), tudo de `platform/rollups`, com guard `platform_admin` e estados §2.12.

**Contexto & referências**
- RNs: RN-409, RN-400, §2.5, §2.12, §2.16.
- Mocks: rollup somando Castelo Produções (+ Passo Certo quando ativo).
- Componentes DS: KPI cards flat (§2.16), Table densa (saúde: tenant, GMV, receita Leela, eventos ativos, saúde badge), Badge (saudável/atenção/inativo), EmptyState.

**Arquivos (criar/editar)**
- `apps/painel/app/plataforma/macro/page.tsx` — rota guardada por `platform_admin`.
- `apps/painel/app/plataforma/macro/_components/{MacroKpis,TenantHealthTable}.tsx`
- `packages/api-client/src/platform/rollups.ts` — leitura tipada dos rollups.

**Passos de implementação**
1. Guard: só `platform_admin` (senão 403 — RN-400).
2. KPIs: GMV total, receita Leela total, nº de tenants ativos (do rollup; nunca somar no cliente).
3. Tabela de saúde por tenant com badge; ordenação por GMV; EmptyState quando não há movimento.
4. Estados vazio/erro/carregando (§2.12); cards flat (§2.16).

**Modelo de dados / contratos**
- Lê `platform/rollups` (S1605-T1). Sem cálculo ad-hoc de agregado no cliente.

**Regras de negócio a respeitar**
- RN-409 (lê agregado da Function), RN-400 (guard admin), §2.5/§2.12/§2.16.

**Critérios de aceite (testáveis)**
- **Dado** um não-admin, **quando** acesso `/plataforma/macro`, **então** 403 (RN-400).
- **Dado** o rollup, **quando** abro, **então** vejo GMV total, receita Leela e tenants ativos, mais a tabela de saúde.
- **Dado** rollup vazio, **quando** abro, **então** EmptyState coerente (sem zeros ambíguos).

**Testes a escrever**
- unit: view-model dos KPIs; mapeamento saúde→badge; guard.
- e2e: acesso admin × não-admin; render dos KPIs a partir do rollup.

**Definition of Done**
- [ ] Guard `platform_admin` (RN-400) · [ ] KPIs de agregado (não ad-hoc) · [ ] Table densa §2.5 · [ ] Estados §2.12 · [ ] Flat §2.16 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Dashboards ricos (séries temporais, coortes, funil de tenants, drill-down por evento) → pós-V1.

---

## Ordem sugerida

`S1600 (modelo + claims + isolamento) → S1601 (onboarding & lifecycle) → S1602 (termos comerciais + consumo E04/E09) → S1605 (macro básico)` fecha o **E16-slim da V1**. Depois: `S1603 (recorrência comunidade) → S1604 (recorrência SaaS) → S1605 rico (dashboards)`. Começar por S1600 é obrigatório: o isolamento é fundacional (ADR-009) e o retrofit é proibitivo; toda coleção de domínio (E03/E04/E05/E09) só é segura depois que as Rules multi-tenant de S1600-T3 estão no lugar.

## Rastreabilidade

- **De-para:** épico novo (sem BH) — multi-tenancy nasce em **ADR-009**; stories LEELA-S1600…S1605.
- **Base:** ADR-009 (multi-tenant marketplace), `modelo-de-dados-firestore.md` (§Multi-tenancy), `V1-PRODUTOR-web.md` (§A.6 — E16-slim entra na V1).
- **Consome/alimenta:** E04 (checkout/parcelamento lê `commercialTerms`; split usa a taxa do tenant), E09 (`platformFeePct` do termo é fonte de RN-330), E05 (clube pago destravado por S1603, RN-104), E00 (Auth/claims/isolamento dia-1), E01 (Design System/Shell).
- **Impacta ADR-006:** as recorrências (comunidade + SaaS) exigem que o gateway concreto suporte **assinatura + split** — requisito registrado para a decisão do provider.
- **Pendências:** onboarding self-service + KYC do produtor; mecânica de antecipação de recebíveis (RN-410); dashboards macro ricos; dunning/nota fiscal da mensalidade SaaS — todos pós-V1.
