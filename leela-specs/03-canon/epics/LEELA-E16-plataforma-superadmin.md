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
- **Onboarding self-service do produtor** (cadastro público + KYC) → ⚠️ **SUPERADO EM PARTE (SPEC-ONBOARD · 2026-07-28, decisão do dono):** o cadastro público com código de convite entrou — ver a seção "Onboarding self-service por código de convite" no fim deste épico (S1608/S1609, RN-411..417). O **KYC** segue futuro; o caminho manual do `platform_admin` (S1601) segue existindo.
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

**⚡ O elo que faltava, achado e pago em 11/08** (lane METRICAS-PAGANTES-BACKEND ·
`30084e5a`). A T2 foi construída como **full recompute** varrendo `tenants/*` e lendo
`tenants/{id}.gmvAcumulado` — desenho melhor que o incremento previsto no passo 2 acima
(idempotente por construção, sem contador distribuído). Só que **o campo lido nunca
ganhou escritor**: `provisionTenant` o criava em `0` e nenhuma Function o tocava. O
resultado é que os três critérios de aceite acima passavam nos testes (que semeavam
`gmvAcumulado` na mão) e **falhavam em produção**: `/plataforma/macro` mostrava GMV total
R$ 0,00 e Receita Leela total R$ 0,00 para sempre, e a ficha do tenant, GMV zerado.

`eventosAtivos` estava no mesmo estado — e por isso `deriveTenantHealth(status, 0)`
carimbava **toda** produtora ativa como `'atencao'` ("conta operável mas parada"), com
evento no ar ou não. A saúde por tenant do card §2.5 estava inteira errada.

Escritor novo: `functions/src/platform/agregarSaudeTenant.ts` —
`recomputarSaudeTenant(db, tenantId)` recomputa `gmvAcumulado = Σ eventos.receitaConfirmada`
e `eventosAtivos = |eventos publicado/ao_vivo|` a partir da FONTE, disparado pelo `onWrite`
de `eventos/{id}` (é onde o efeito da venda aterrissa: o webhook soma e o estorno subtrai
em `receitaConfirmada`; publicar/despublicar mexe em `status`). Escreve só quando difere —
o no-op deixa `atualizadoEm` intocado, que é a prova externa da idempotência.

Definição fixada com condição de reabertura: GMV é **valor de face CONFIRMADO** (E16 §
"receita bruta confirmada acumulada"; spec ADMIN-VISAO V-1), portanto **cai no estorno**.
Um acumulado monotônico faria o macro do admin discordar da tela do produtor sobre o mesmo
dinheiro.

Rejeitado — incrementar dentro da transação do `webhookPagamento` (o passo 2 original):
toda confirmação do tenant escreveria no MESMO doc DENTRO da transação de dinheiro, e numa
abertura de vendas isso serializa o checkout inteiro do tenant num único documento. Se o
volume um dia chegar a ~1 write de evento por segundo por tenant, a saída é janela/cron ou
contador shardado — **não** increment na transação de pagamento.

⛔ **Backfill dos tenants existentes = passo SEPARADO da fase de deploy.**
`recomputarSaudeDeTodosOsTenants(db)` existe e é testada (idempotente, re-executável), e
não é chamada por gatilho, cron ou callable. Sem ela, tenant sem write de evento novo
permanece no zero histórico.

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

> História nova da rodada TAXA-FLEX (Vitor, 2026-07-19). Detalhe em `02-rodadas/2026-07-19-taxa-flex/`; a tabela (dona) é RN-178/E04-S308 e o cálculo é E09-S905; aqui fica a **tela de config** no super-admin (reconcilia RN-404/406). Molde igual ao de S1900 (E19).

### LEELA-S1606 · Config da taxa da plataforma no super-admin (tabela global + override por organizador) · (de-para novo · TAXA-FLEX) · ✅ ENTREGUE

**Como** platform_admin, **quero** editar a tabela global de taxa por meio e as exceções negociadas por organizador, **para** operar a cobrança da plataforma sem tocar em código.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel super-admin · **RNs:** RN-178 (tabela), RN-404/406 (escrita só platform_admin / fonte da taxa — reconciliadas)
- **Origem:** rodada TAXA-FLEX (Vitor, 2026-07-19). Consome o modelo de E04-S308; não redefine a tabela. Fila `03-fila-codigo (j)` — item (6) do lote.

**Critérios de aceite (Given/When/Then):**
- **Dado** a tela de config global, **quando** edito, **então** defino `{percentual, fixoCentavos}` por meio (`pix | cartao | boleto`) em `platform/config`.
- **Dado** um organizador com condição negociada, **quando** crio a exceção, **então** ela grava o override em `commercialTerms/current` do tenant (precedência organizador > global).
- **Dado** um ator não-`platform_admin`, **quando** tenta abrir/gravar a config, **então** é negado (RN-404, fail-closed); **sem nível por-evento no v1**.

**Tasks:** `S1606-T1` (tela do super-admin: editar a tabela global por meio + gerir override por organizador — consome E04-S308, RN-178/404/406 — `c6ab442`) ✅. **Status:** ✅ ENTREGUE 2026-07-19 (lane TAXAFLEX): rota `/plataforma/taxa` (nav "Taxa") salva a global SÓ pelo callable; guardas F1 da review antagonista (campo vazio NUNCA vira 0%+R$0; taxa zero em meio ativo exige confirmação — `242cef7`); exceção por organizador na seção nova do editor de termos (linha vazia herda a global; par incompleto não grava) com lock otimista contra edição concorrente (F5). BÔNUS: o save do editor deixou de APAGAR os campos opcionais do termo (footgun pré-existente). Report `outputs/leela-build-2d6ee98d/TAXA-FLEX-REPORT.md`.

---

## Ordem sugerida

`S1600 (modelo + claims + isolamento) → S1601 (onboarding & lifecycle) → S1602 (termos comerciais + consumo E04/E09) → S1605 (macro básico)` fecha o **E16-slim da V1**. Depois: `S1603 (recorrência comunidade) → S1604 (recorrência SaaS) → S1605 rico (dashboards)`. Começar por S1600 é obrigatório: o isolamento é fundacional (ADR-009) e o retrofit é proibitivo; toda coleção de domínio (E03/E04/E05/E09) só é segura depois que as Rules multi-tenant de S1600-T3 estão no lugar.

## Rastreabilidade

- **De-para:** épico novo (sem BH) — multi-tenancy nasce em **ADR-009**; stories LEELA-S1600…S1605.
- **Base:** ADR-009 (multi-tenant marketplace), `modelo-de-dados-firestore.md` (§Multi-tenancy), `V1-PRODUTOR-web.md` (§A.6 — E16-slim entra na V1).
- **Consome/alimenta:** E04 (checkout/parcelamento lê `commercialTerms`; split usa a taxa do tenant), E09 (`platformFeePct` do termo é fonte de RN-330), E05 (clube pago destravado por S1603, RN-104), E00 (Auth/claims/isolamento dia-1), E01 (Design System/Shell).
- **Impacta ADR-006:** as recorrências (comunidade + SaaS) exigem que o gateway concreto suporte **assinatura + split** — requisito registrado para a decisão do provider.
- **Pendências:** onboarding self-service + KYC do produtor; mecânica de antecipação de recebíveis (RN-410); dashboards macro ricos; dunning/nota fiscal da mensalidade SaaS — todos pós-V1.

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

Este épico **não tem lacuna aberta na Onda 4**. A última peça do caminho do dinheiro que dependia dele — a config da taxa da plataforma (tabela global + override por organizador, S1606) — foi entregue na TAXA-FLEX, incluindo a trava que impedia campo vazio virar taxa zero para todo mundo.

O que segue fora da fila, por recorte e não por lacuna: **S1603** (recorrência da comunidade) e **S1604** (recorrência SaaS), ambos pós-V1; **S1605** entregue em fatia slim.

Ação de operação pendente, herdada e não-código: provisionar `CRM_ID_PEPPER` no Secret Manager antes do primeiro deploy com dado real (ver E19). Trocar o pepper depois de haver dado real obriga migração de todas as chaves.

---

## Catálogo de benefícios da plataforma (SPECS-0728 · 2026-07-28) · prioridade baixa

DEC-0728C. **Prioridade baixa declarada pelo dono**: entra na fila depois do FormBuilder e
não bloqueia nenhuma das posições 1 a 4.

### Decisão do épico dono: é o E16, não o E10

O verbatim pede o cadastro "como administrador Leela", e a frase decide sozinha. Três
razões, na ordem de peso:

1. **O ator.** É `platform_admin`, não `tenant_owner`. A RN-401 e a RN-404 já dizem que o
   que o dono da plataforma escreve mora em coleção de plataforma, com escrita exclusiva
   dele.
2. **O escopo do dado.** Um cupom de parceiro e um parceiro presencial valem para a
   comunidade inteira, atravessando tenants. O registro do E10 vive em
   `profissionais/{profId}/marcas`, com Rules de dono único: pendurar um catálogo
   cross-tenant ali fura a RN-400, que é a regra fundacional de isolamento e cujo retrofit
   o épico chama de proibitivo.
3. **O trabalho servido.** O E10 existe para o organizador chegar na reunião com o
   patrocinador com dados na mão. Isso é outro emprego. Marca de patrocínio e parceiro de
   benefício se parecem no formulário e não se parecem em nada no propósito.

**A costura com o E10.** É de vocabulário e de componente, não de dado. O tipo `Marca`
(`packages/core/src/brands/marca.ts`) e o primitivo `Thumb` do design system são
reaproveitados como referência de forma; o registro do profissional e o catálogo da
plataforma permanecem **duas coleções separadas**, sem sincronização e sem chave
compartilhada. Uma marca que seja ao mesmo tempo patrocinadora de um organizador e
parceira da Leela existe duas vezes, de propósito — a mesma semântica de cópia
independente que a exclusão de marca já explica na própria caixa de confirmação.

### A leitura do pedido, com o default em vigor

"Cupons de desconto" e "parceiros presenciais" aparecem na mesma frase, junto de endereço,
descritivo de benefícios, capa, logo e fotos. Lidos juntos, são **um catálogo de benefícios
da comunidade**: vantagens que a Leela oferece a quem usa a plataforma, uma parte resgatável
por código e outra atendida em endereço físico.

**Não** é o cupom de venda. O cupom de desconto do checkout já existe, é do organizador, tem
tipo `percentual|fixo`, janela obrigatória e modo de venda fechada (E04, RN-303). Misturar os
dois criaria uma segunda fonte de desconto sobre o preço, que é a classe de erro mais cara
que este produto pode cometer.

O default fica **em vigor**, não volta como pergunta. Se a leitura estiver errada, o item é
de prioridade baixa e nada foi construído em cima dele.

### Regras de negócio novas (SPECS-0728)

- **RN-393 · Catálogo de benefícios da plataforma.** O `platform_admin` mantém um catálogo
  cross-tenant com dois tipos de benefício: **cupom de benefício** (código resgatável em
  parceiro, com descritivo e vigência) e **parceiro presencial** (com endereço, descritivo de
  benefícios, capa, logo e galeria de fotos). Escrita **exclusiva** do `platform_admin`, no
  mesmo padrão da RN-404; leitura conforme a RN-395. O **cupom de benefício não é o cupom de
  venda** da RN-303: ele nunca toca preço, total, taxa nem repasse, e não existe caminho de
  código entre os dois. Coleção de plataforma, nunca sob `profissionais/{profId}` (RN-400).
- **RN-394 · Mídia do parceiro presencial.** Capa, logo e galeria seguem o padrão já
  decidido, sem inventar caminho novo: Firebase Storage (ADR-016), upload obrigatório com
  trocar e ajuste de proporção (RN-168 e RN-170), capa na proporção e no teto já fixados
  (RN-228) e exibição pelo primitivo `Thumb` do design system (RN-236), com carga tardia e
  degradação para a sigla quando a URL morre. A galeria tem **teto de fotos como constante
  única no core**, default proposto **8**. Rules de Storage fail-closed, com teto de tamanho
  e lista de formatos permitidos, no mesmo desenho das capas.
- **RN-395 · Estado e vigência do benefício.** Todo benefício tem estado `rascunho` ou
  `publicado` e uma janela de vigência com início e fim. Publicado significa **pronto para
  ser exibido**, e não exibido: **a vitrine para o atleta é decisão futura** e não é aberta
  aqui. Enquanto ela não existir, o catálogo é back-office puro, e essa honestidade fica
  escrita na própria tela para ninguém achar que publicou e nada aconteceu. Benefício fora da
  vigência não é apagado; ele sai da leitura publicada e continua no back-office.

---

### LEELA-S1607 · Catálogo de benefícios da plataforma · (de-para novo · DEC-0728C) · prioridade baixa

**Como** administrador Leela, **quero** cadastrar cupons de benefício e parceiros presenciais
num lugar só, **para** montar a oferta de vantagens da comunidade sem depender de ninguém.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel (back-office da plataforma) · **RNs:** RN-393, RN-394, RN-395, RN-401, RN-404, RN-400
- **JTBD servido:** "montar a oferta de vantagens da plataforma sem intervenção técnica".
- **Origem:** DEC-0728C (2026-07-28), com prioridade baixa declarada pelo dono.

**Critérios de aceite (Given/When/Then):**

- **Dado** que sou `platform_admin`, **quando** abro a área de plataforma, **então** existe
  Benefícios ao lado de Tenants, Termos, Planos, Taxa, Repasses e Estornos, com as duas abas
  Cupons e Parceiros.
- **Dado** que **não** sou `platform_admin`, **quando** tento abrir a rota por endereço
  direto, **então** o acesso é negado pela mesma guarda que já protege a área, e a leitura
  também falha nas Rules, e não só na tela (RN-401).
- **Dado** um cupom de benefício, **quando** o cadastro, **então** informo código, descritivo,
  parceiro associado e janela de vigência, e o sistema deixa explícito que este cupom não
  interfere em preço, total, taxa nem repasse (RN-393).
- **Dado** o cadastro de um cupom de benefício, **quando** procuro um campo de percentual ou
  de valor de desconto sobre a inscrição, **então** ele não existe — o desconto de venda vive
  no cupom do organizador (RN-303).
- **Dado** um parceiro presencial, **quando** o cadastro, **então** informo nome, endereço,
  descritivo de benefícios, capa, logo e fotos, com a capa e o logo obrigatórios e as fotos
  opcionais (RN-394).
- **Dado** a galeria de um parceiro, **quando** tento subir a nona foto, **então** a validação
  bloqueia pelo teto do core (RN-394).
- **Dado** um arquivo fora do formato ou acima do tamanho permitido, **quando** tento subir,
  **então** as Rules do Storage recusam, e não só a tela.
- **Dado** um benefício em rascunho, **quando** vejo a lista, **então** ele aparece marcado
  como rascunho e a tela explica que publicar ainda não o mostra a ninguém, porque a vitrine
  do atleta não existe (RN-395).
- **Dado** um benefício com vigência encerrada, **quando** vejo a lista, **então** ele
  continua listado no back-office com o estado de vencido, e não desaparece.
- **Dado** a lista de parceiros, **quando** filtro e nada casa, **então** vejo estado vazio e
  contador "mostrando 0 de N", como em toda lista da casa.
- **Dado** um parceiro com cupons associados, **quando** tento excluí-lo, **então** a caixa de
  confirmação mostra os cupons que ficam órfãos antes de confirmar (§2.15).

**Tasks:** `S1607-T1`, `S1607-T2`, `S1607-T3`, `S1607-T4`.

#### LEELA-S1607-T1 · Modelo do catálogo e Rules
- **Tipo:** data-model · **Bloqueia:** T2, T3, T4 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

Coleções de plataforma para cupom de benefício e parceiro presencial, tipos e validações no
core, teto de fotos como constante única, Rules com escrita exclusiva do `platform_admin` e
leitura conforme a RN-395, mais Rules de Storage fail-closed para capa, logo e galeria.

**Testes:** ataque de Rules — `tenant_owner` e atleta tentam escrever e ler, e falham nos
casos que devem falhar; upload de formato e de tamanho proibidos é recusado no Storage.

#### LEELA-S1607-T2 · Aba de cupons de benefício
- **Tipo:** screen · **Depende de:** T1 · **Estimativa:** S · **Rota:** opus

Lista densa com busca, contador e estado vazio; criar e editar por modal do design system;
vigência com início e fim; nenhum campo que toque preço.

#### LEELA-S1607-T3 · Aba de parceiros presenciais com endereço e galeria
- **Tipo:** screen · **Depende de:** T1 · **Estimativa:** M · **Rota:** opus

Cadastro com endereço, descritivo, capa, logo e galeria, reusando o componente de upload
com trocar e ajuste de proporção que já existe (RN-168 e RN-170) e o `Thumb` na lista.
Exclusão com preview das consequências.

#### LEELA-S1607-T4 · Leitura publicada, sem vitrine
- **Tipo:** api/function · **Depende de:** T1 · **Estimativa:** S · **Rota:** opus

Projeção de leitura dos benefícios publicados e vigentes, pronta para quando a vitrine
existir. Nenhuma tela de atleta é criada aqui, e a tela de back-office diz isso com todas as
letras.

---

### Fila de código pronta · lane MARCAS-ADMIN (posição 5, prioridade baixa)

| # | Task | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| 1 | `S1607-T1` modelo, core e Rules | `packages/core`, `firestore.rules`, `storage.rules` | — | opus | ⚔ |
| 2 | `S1607-T2` aba de cupons | `apps/painel/src/routes/plataforma/beneficios` | 1 | opus | — |
| 3 | `S1607-T3` aba de parceiros com galeria | `apps/painel/src/routes/plataforma/beneficios` | 1 | opus | — |
| 4 | `S1607-T4` projeção de leitura publicada | `packages/api-client`, `firestore.rules` | 1 | opus | — |

Itens 2, 3 e 4 são disjuntos entre si e correm juntos depois do 1. A rota nasce dentro da
área de plataforma que já existe, ao lado de Tenants, Termos, Planos, Taxa, Repasses e
Estornos: nenhum item novo no menu principal, porque a área de plataforma tem navegação
própria (§2.1) e não passa pelo catálogo de seis, agora sete, do menu do organizador.

### Critério de pronto

- [ ] `platform_admin` escreve, e mais ninguém — provado por Rules, não por tela
- [ ] nenhum caminho de código liga o cupom de benefício ao cálculo de preço, taxa ou repasse
- [ ] upload fora de formato ou de tamanho é recusado no Storage
- [ ] o teto de fotos vem de constante única no core
- [ ] a tela diz, sem rodeio, que publicar ainda não exibe a ninguém
- [ ] review antagonista em contexto fresco no T1

### Decisão que pode voltar para o Vitor

**Se "cupons de desconto" quisesse dizer cupom de venda no nível da plataforma**, esta spec
está no caminho errado e o item é barato de refazer, porque não bloqueia nada. O default em
vigor é o catálogo de benefícios, pelas razões escritas acima. Nenhuma linha de código foi
escrita em cima dele.

---

## Onboarding self-service por código de convite (SPEC-ONBOARD · 2026-07-28)

Decisão do dono (verbatim na rodada `02-rodadas/2026-07-28-onboarding-organizador/`):
**cadastro aberto, acesso travado**. Qualquer pessoa cria a conta de organizador sem
código; a conta aterrissa na home do painel com um overlay bloqueante pedindo o código de
convite ou o contato com o time Leela; o código, gerido pelo super-admin, destrava o uso.
Supera EM PARTE o Won't deste épico (a parte "cadastro público"); o KYC segue futuro e o
caminho manual (S1601) segue existindo — o resgate por código e a aprovação manual
convergem no MESMO `provisionTenant` (RN-403), nunca em duas máquinas.

**Distinção obrigatória:** este é o convite de **organizador para a plataforma**. O
`clubes.codigoConvite` (RN-101, atleta→clube) e o convite por e-mail de clube (S104) são
outras entidades, com outros donos e outras Rules — nada aqui os toca.

**RNs novas (faixa RN-411..RN-417, série 4xx da plataforma):** RN-411 (cadastro aberto,
acesso travado), RN-412 (dados do cadastro + LGPD — dona E00), RN-413 (formato e ciclo de
vida do código), RN-414 (resgate server-side, atômico e anti-enumeração), RN-415
(rate-limit), RN-416 (escopo da conta travada), RN-417 (canal do CTA configurável).
Detalhe integral em `02-rodadas/2026-07-28-onboarding-organizador/02-rns-delta.md`.

**Modelo de dados:** ➕ `convitesOrganizador/{codigo}` (docId = código normalizado; uso
único; Rules: cliente só `platform_admin`, resgate só por Function) + delta em
`profissionais/{uid}` (`statusOnboarding`, `consentimentoLgpd`) +
`platform/configOnboarding` (doc próprio — ver a reconciliação da RN-417 no delta ao final
deste épico). Ver `modelo-de-dados-firestore.md` (§Convites de organizador).

**Consumidores fora deste épico:** E00-S030 (cadastro completo no `/cadastrar`, upgrade da
S020-T3 — o default "cadastro NÃO cria tenant" permanece) e E12-S1213 (entrada na landing:
"Entrar" + "Criar conta de organizador" no `PublicHeader`).

### LEELA-S1608 · Códigos de convite de organizador no super-admin · (de-para novo · SPEC-ONBOARD)

**Como** super-admin, **quero** gerar e organizar códigos de convite de organizador, ver
quem usou cada um e quando, e revogar os não usados, **para** controlar quem entra na
plataforma sem intervenção técnica.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel (back-office) · **V1-slim:** ✅ (bloqueia o go-live controlado)
- **Tela(s) de referência:** — (novo — back-office; reusa DS: Table densa §2.5, ConfirmModal §2.15, Toast, EmptyState §2.12, flat §2.16)
- **RNs:** RN-413, RN-414 (Rules), RN-401 (guard por claim)

**Critérios de aceite (Given/When/Then):**
- **Dado** o super-admin, **quando** gero um código, **então** nasce `ativo`, único global, 8 chars no alfabeto sem ambíguos (constante única no core), com `nota?` e `expiraEm?` opcionais (P2/P3/P4).
- **Dado** `/plataforma/convites`, **quando** abro, **então** vejo tabela densa com código, nota, status, quem usou (nome/e-mail 🔁) e quando, filtros por status, contador e EmptyState; ação de copiar o código por linha.
- **Dado** um código `ativo`, **quando** revogo, **então** passo por ConfirmModal com preview e vira `revogado`; revogar não desfaz tenant já provisionado (RN-413).
- **Dado** um cliente sem claim `platform_admin`, **quando** tenta ler/escrever `convitesOrganizador` ou acessar a rota, **então** Rule nega e a rota dá 403 (RN-414/401).

**Tasks:**

#### LEELA-S1608-T1 · Modelo `convitesOrganizador` + core + Rules + seed
- **Tipo:** data-model · **Depende de:** S1600 (claims/Rules base) · **Bloqueia:** S1608-T2, S1609-T1 · **Estimativa:** S · **Rota:** opus · ⚔

Tipos em `packages/core/src/platform/conviteOrganizador.ts` (`type ConviteOrganizador`,
`type ConviteStatus`, gerador + `normalizarCodigo` puros, constantes ÚNICAS de alfabeto e
tamanho — padrão RN-157); Rules deny-by-default para cliente que não seja `platform_admin`
(leitura E escrita); seed com um código canônico de exemplo. Testes: unit do
gerador/normalização (colisão, ambíguos, caixa/espaços/hífens) + ataque de Rules
(`tenant_owner`, atleta e anônimo não leem nem escrevem).

#### LEELA-S1608-T2 · Tela `/plataforma/convites`
- **Tipo:** screen · **Depende de:** T1, E01 · **Estimativa:** M · **Rota:** opus

Rota nova na área de plataforma (nav própria §2.1, ao lado de Tenants, Termos, Planos,
Taxa, Repasses e Estornos — nenhum item no menu do organizador). Gerar (modal: nota +
validade opcional) → Toast com o código e ação de copiar; lista com busca/filtros;
revogar via ConfirmModal (§2.15). Estados §2.12; flat §2.16; a11y AA.

### LEELA-S1609 · Resgate do código + overlay de acesso travado · (de-para novo · SPEC-ONBOARD)

**Como** organizador recém-cadastrado, **quero** informar meu código de convite na tela
inicial (ou falar com o time Leela), **para** destravar meu acesso e começar a operar.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel + Functions · **V1-slim:** ✅ (bloqueia o go-live controlado)
- **Tela(s) de referência:** — (overlay sobre a home existente; Modal/Dialog do DS)
- **RNs:** RN-411, RN-413 (normalização), RN-414, RN-415, RN-416, RN-417, RN-403 (reuso)

**Critérios de aceite (Given/When/Then):**
- **Dado** conta `aguardando_convite`, **quando** aterrisso na home, **então** overlay bloqueante não-descartável (sem X/Esc/clique-fora) com campo de código + CTA "Falar com o time Leela" (RN-416).
- **Dado** a conta travada, **quando** navego, **então** só alcanço overlay, `/conta` e sair; nenhum dado de tenant responde — provado por Rules (RN-400/401), não por tela.
- **Dado** código válido (em qualquer caixa/com espaços ou hífens), **quando** resgato, **então** a Function carimba o uso E provisiona o tenant na MESMA transação (RN-414, via RN-403); token refresh traz as claims e o painel destrava sem novo login manual.
- **Dado** código inexistente/usado/revogado/expirado, **quando** tento, **então** o MESMO erro genérico, sem distinguir o caso (RN-414).
- **Dado** 5 tentativas erradas na última hora, **quando** tento a 6ª, **então** `resource-exhausted` com copy honesta; o CTA continua disponível (RN-415).
- **Dado** dois resgates concorrentes do mesmo código, **quando** correm, **então** um vence e o outro recebe o erro genérico; falha no provisionamento não queima o código.
- **Dado** o CTA, **quando** aciono, **então** o destino vem de `platform/configOnboarding`; sem config, mailto oficial (RN-417, letra reconciliada em 03/08).

**Tasks:**

#### LEELA-S1609-T1 · Function `resgatarConviteOrganizador`
- **Tipo:** api/function · **Depende de:** S1608-T1, S030-T2 (doc do profissional), S1601-T1 (`provisionTenant`) · **Bloqueia:** S1609-T2 · **Estimativa:** M · **Rota:** opus · ⚔

Callable autenticada: normaliza (RN-413) → transação (código `ativo` + não expirado ⇒
marca `usado` com `usadoPor/usadoEm/tenantId`) + provisionamento via `provisionTenant`
(nome/slug derivados de `profissionais/{uid}.nomeOrganizacao` — P7; `tipo: 'produtor'`;
slug colidido ganha sufixo) + `statusOnboarding: 'ativo'`. Rate-limit server-side 5/h por
conta (RN-415). Se o input atual do `provisionTenant` não cobrir o caso, ESTENDE-SE o
input — nunca nasce função irmã. Testes: integração (emulator) — resgate feliz; duplo
resgate concorrente; erro genérico único nos 4 casos; rate-limit; rollback (falha no
provisionamento não queima o código); anônimo negado.

#### LEELA-S1609-T2 · Overlay bloqueante + conta travada + CTA
- **Tipo:** screen · **Depende de:** T1, S030-T1 · **Estimativa:** M · **Rota:** opus

Overlay na home para `statusOnboarding: 'aguardando_convite'` (sem claim de tenant):
campo de código com normalização visual, submit → estados §2.12 (enviando/erro
genérico/rate-limited), sucesso → refresh de token e entrada real; CTA lendo a config
(RN-417). Copy da premissa P9 passa pelo gate de linguagem da casa. Testes: unit
(render por status, não-descartável) + e2e (cadastro → travado → resgate → destravado).

### Fila de código pronta · lane SPEC-ONBOARD (bloqueia o go-live controlado)

Fila completa (com E00-S030 e E12-S1213) em
`02-rodadas/2026-07-28-onboarding-organizador/03-fila-codigo.md`. Resumo: S1608-T1 ⚔ é a
fundação; S1609-T1 ⚔ depende dela e do doc do profissional (S030-T2); S1608-T2 e a trilha
de tela correm depois, em paralelo. `functions/**` está disputado com a lane
DEPLOY-PREVIEW — serializar por lane.

## Delta a porta de entrada do organizador construída e revisada (2026-08-03 · ONBOARD-BUILD → ONBOARD-REV)

As sete histórias da SPEC-ONBOARD saíram do papel em 03/08: oito commits de construção
(`d0b7cd49..aa0e2183`) e quatro de review antagonista (`52f27f76..37b9ec94`), esta última
em contexto fresco, sem participação de quem construiu. Rastro completo em
`.nirvana/handoffs/leela-build-2d6ee98d-ONBOARD-BUILD.md` e `-ONBOARD-REV.md`.

### RN-447 (nova, dona) · convite queimado é auditoria

`convitesOrganizador` **não aceita delete de ninguém**, nem de `platform_admin`. O convite
é o registro de quem entrou na plataforma no go-live controlado; apagá-lo apagaria o rastro
de admissão. Revogar (RN-413) continua sendo o caminho, e só alcança código `ativo`. A
propriedade é medida por falsificação: abrir `allow delete: if isPlatformAdmin()` mata o
caso `delete é negado até para platform_admin`.

### RN-446 e RN-448 (novas, donas no E00) · o que este épico consome

- **RN-446** — o aceite LGPD é carimbo do servidor, e a ausência dele não é fabricável. O
  resgate do convite (S1609-T1) é justamente o caminho que recria `profissionais/{uid}`
  quando ele falta, e o doc recriado nasce **sem** `consentimentoLgpd` e com
  `statusOnboarding: 'ativo'`. A escolha de o que fazer nesse caso é do dono e está aberta
  como **LGPD-1** no painel; até ela fechar, o **seed do primeiro convite fica retido**.
- **RN-448** — acesso único por precedência. Vale para este épico porque a exceção de
  `platform_admin` no `ContaTravadaGate` é o que mantém `/plataforma` alcançável para o
  super-admin mesmo sem doc de profissional. **⚠ Superada pela RN-449 em 2026-08-04** na
  parte que dizia que administração e operação de painel cabiam na mesma conta; a exceção do
  `ContaTravadaGate` continua valendo e é a única parte que este épico consumia.

### RN-449 · a conta do painel de plataforma é outra (nova, dona no E00) · 2026-08-04

Correção do dono sobre um registro errado do maestro. Verbatim: *"É uma conta só somente para
quem é organizador e cliente. A conta do painel admin, deve ser outra. os ambientes devem ser
separados, por questões de segurança."*

Este é o épico do super-admin, então é aqui que a consequência pesa mais.

**O que muda no território do E16:**

- Conceder `platform_admin` passa a exigir conta limpa dos dois outros lados e e-mail em
  allowlist de doc próprio, `platform/configAdmin`. O doc é próprio pela mesma razão que
  moveu o contato do CTA na RN-417: Rules do Firestore não filtram campo, e a alternativa
  penduraria a allowlist ao lado da tabela global de taxa.
- As três recusas que já existiam neste território ganham caso citando a regra, para que
  ninguém as desfaça achando que são acidente: papel conflitante no `provisionTenantCore`
  (`provisionTenant.ts:196-256`), `platform_admin` rejeitado como chamador do resgate
  (`resgatarConviteOrganizador.ts:180-181`) e a recusa de `tenantId` junto de administração
  (`setTenantClaims.ts:46`, `:127-132`).
- O menu de plataforma deixa de aparecer para quem não é administrador. Hoje ele é escolhido
  pelo caminho da URL e não pelo papel (`apps/painel/src/shell/sidebar.ts:148-157`), então uma
  conta `tenant_owner` que digitar `/plataforma` recebe o 403 correto com o menu inteiro de
  super-admin desenhado em volta. Vaza taxonomia, não dado.

**Achado de produção que sobe ao dono como ADMINSEP-3:** a conta de super-admin de produção é
a conta de demonstração. O `prod-seed-leela-hub.ts` chama `seedPlatformAdmin` contra o projeto
real e grava a senha `demo1234`, publicada no repositório (`:127`, `:182-188`), e o login foi
provado por REST na lane FIX-AUTHGUARD. Fator único, senha pública, e alcance cross-tenant de
PII, dinheiro e elevação de papel.

**+11/08 · o ADMINSEP-3 foi decidido pelo dono (leva 6 da tarde).** Na íntegra: *"nao é pra ter
admin demo ja falei isso antes também."* Não existe conta de demonstração de tipo nenhum, e a
conta que administra a plataforma em produção não é conta de vitrine — coerente com a purga de
10/08, que tirou as duas contas demo do Auth. A sugestão do maestro de uma conta demo para teste
de checkout está **retirada**: teste ponta a ponta de compra em produção só pelo caminho do dono.
O que a decisão manda para a esteira é o que a task A6 já dizia — o seed para de semear
administrador contra o projeto real e nenhuma conta de demonstração nasce de novo. Registro em
`02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md §ADMINSEP-3`.

**Pendência do CTO humano**, no molde do item 62: segundo fator para `platform_admin` exige
subir para Identity Platform, que é tier pago. Não há MFA em lugar nenhum do repositório
hoje.

Detalhe medido em `02-rodadas/2026-08-02-retomada/09-spec-contas-e-area-cliente.md`; fila
executável em `11-fila-contas-e-area-cliente.md`.

### RN-417 · letra reconciliada, não decisão nova

O CTA lê `platform/configOnboarding` (doc próprio) e não `platform/config.contatoOnboarding`
(campo do doc global). Rules do Firestore não filtram campo: abrir o doc global para a conta
travada entregaria junto a tabela global de taxa da plataforma. A review executou a
falsificação e o veredito foi **premissa sustentada**. Detalhe em
`02-rodadas/2026-07-28-onboarding-organizador/02-rns-delta.md §RN-417`.

### Defeitos que a review achou e corrigiu

| # | Defeito | Fix |
|---|---|---|
| DEF-A | O gate do `/cadastrar` era `length > 0` sem teto, enquanto a Rule `shapeAutoCadastroValido` exige de 2 a 80 — a tela aceitava o que o servidor recusa, a negativa caía num `catch` vazio e a conta Auth nascia sem `profissionais/{uid}` | `52f27f76` — a tela passa a usar `validarCadastroOrganizador`, a mesma régua do servidor |
| DEF-B | A recusa única da RN-414 valia só para o candidato do caminho feliz: conta com papel conflitante atravessava a validação, **reservava o código** e morria depois como `internal`, que é oráculo — e queimava convite alheio a cada tentativa | `06ea10f8` — `contaElegivelParaResgate` decide dentro da transação, depois do ramo de replay e antes do CAS; recusa idêntica à do código morto e o convite não é sequer escrito |
| DEF-C | O véu do overlay bloqueante (RN-416) não existia: `bg-[var(--surface-base)]/95` não compila no Tailwind (modificador de opacidade sobre valor arbitrário é descartado), então o painel ficava sobre a home visível e o contraste dependia do que estivesse por baixo | `37b9ec94` — reuso dos tokens `--modal-overlay-bg` e `--modal-overlay-blur` do Modal do DS, já presentes no bundle; zero byte novo de CSS |

### Pontas técnicas nomeadas, sem decisão de produto pendente

- **Borda volumétrica.** O teto de tentativas da RN-415 é estritamente **por conta**, e o
  cadastro é aberto: o teto global é `5 × contas que o atacante criar`. Quem torna a
  enumeração inviável é o espaço de busca (31⁸ ≈ 8,5 × 10¹¹), não o limitador. O próprio
  `rateLimit.ts` já declara por escrito que o throttle volumétrico é da **borda** — e
  **App Check e Cloud Armor não estão ligados**. É julgamento de custo e de infraestrutura,
  isto é, pendência do CTO humano, e viaja junto do item 62 (`minInstances`).
- **Assimetria de re-check no provisionamento.** `viaClaimRepair` ganhou, na review L2 #29,
  um RE-CHECK da prova dentro da transação; `viaAutoCadastro` lê a claim fora dela e não
  tem o equivalente. A janela é estreita e, com o DEF-B corrigido, o caminho que a
  exploraria passa a ser recusado antes. Fica anotado para quem mexer — é dívida de
  simetria, não defeito medido.
- **Recuperação da conta órfã.** Se o `setDoc` do cadastro falhar por rede, quota ou
  indisponibilidade, a conta nasce sem doc e o login seguinte a barra sem caminho de volta
  (o resgate vive atrás do login; recadastrar esbarra em `auth/email-already-in-use`). A
  única recuperação hoje é intervenção de `platform_admin`. Vira história de recuperação
  self-service na fila do produto, não decisão do dono.

## Delta a economia do parcelamento entra na tela dos termos (SPEC-JUROS-MARGEM · 2026-08-04)

O dono apontou a tabela alvo pelas próprias palavras: *"a tabela de configuração no admin que
gerencia os tenants"*. Existem três telas de taxa no painel de plataforma, e só uma é por
tenant — `/plataforma/tenants/:tenantId/termos`, onde os 2,89% a.m. já são editáveis. O bloco
novo entra **dentro** dela, logo abaixo do fieldset de parcelamento, sem rota nova e sem
tabela irmã. Rodada em `02-rodadas/2026-08-04-juros-margem/`.

### RN-455 (nova, dona) · a tabela de custo do gateway é dado, nunca constante

Vive em `platform/config.custoGateway`, por meio de pagamento e por número de parcelas, no par
`{percentual, fixoCentavos}` que a RN-178 já usa, mais `origem: 'estimativa' | 'contrato'` e
`atualizadoEm`. **Nenhum valor de custo em constante de código**, pela mesma razão da RN-183 e
pela mesma disciplina que a S314-T2 registrou por escrito quando o 2,89% entrou como dado:
quando o dono vetar o número, a mudança tem de ser de dado.

Escrita exclusiva do `platform_admin` (RN-404). Escrita vinda de `tenant_owner` ou de cliente
é negada pelas Rules com `permission-denied`, e percentual fora de `[0, 100]` ou fixo negativo
é recusado na validação com `invalid-argument`.

**Sem dado não há margem.** Quando a linha do meio e da parcela está ausente, a tela declara
"custo não configurado" e a coluna Margem fica **vazia** — nunca zero, nunca estimativa
silenciosa. Isso não é defeito de tela: **o custo real que o Asaas cobra por parcela não
existe em lugar nenhum do sistema hoje** (lacuna L1 da spec). O que existe é benchmark de
discovery de 02/07, com cartão à vista a 2,99% + R$ 0,49 e a coluna de parcelado **vazia** para
o Asaas, sob a recomendação explícita de não fechar taxa sem cotação por volume. O dono vai
usar estes números para decidir preço, então nenhum número inventado entra na conta.

A tabela é **global e não tem override por tenant** (premissa P3 da spec): o custo é o
contrato da Leela com o gateway e não muda porque o produtor mudou. Diferente da taxa da
plataforma, que tem override negociado por organizador pela RN-178.

**A armadilha que quem construir vai encontrar.** `commercialTerms.tabelaTaxasParcela` existe
no modelo, tem validação, tem Rules e tem interface completa de 2x a 12x no modal de planos,
com a legenda "Taxa por parcela (%)" — e o checkout **nunca a consome**. É tela de
administração mostrando número que não move preço nenhum. A economia nova **não** é pendurada
nela; a grade ganha aviso de campo inerte na mesma aterrissagem, e a aposentadoria entra como
dívida.

### RN-458 (nova, dona) · "sem juros" é liberação do admin, por tenant

Restrição do dono, na letra: "pagamento sem juros" não existe hoje e, quando existir, será
**ferramenta do admin da plataforma** liberada por tenant, nunca escolha do produtor.

```
parcelamentoSemJuros?: {
  ateParcelas: number          // inteiro ≥ 2 e ≤ maxParcelas; ausência do campo = desligado
  custoAbsorvidoPor: 'plataforma' | 'produtor'
}
```

Ausente significa desligado, que é o estado de todo tenant hoje. `ateParcelas: 6` zera o juro
de 2x a 6x e devolve o `jurosAoMes` do termo de 7x em diante. Escrita exclusiva do
`platform_admin` (RN-404): tentativa vinda de `tenant_owner` é negada com `permission-denied`,
e `ateParcelas` não inteiro ou fora de `[2, maxParcelas]` é recusado com `invalid-argument`.

**Não existe campo equivalente no evento, no lote nem em tela alguma do organizador**, e a
ausência desse caminho de escrita é a regra, não um detalhe de implementação.

Na tela do comprador, o total das opções sem juro é **exatamente** o total à vista pela
RN-456, e a frase "sem juros" nunca aparece quando o total difere do à vista, nem por um
centavo. Nenhuma linha de juros é renderizada nessas opções.

**Contrato especificado, construção não priorizada.** Não há tarefa na fila da S1610. A regra
existe para que a primeira vez que alguém pedir não vire improviso. Quem paga o custo quando o
juro é zero é decisão do dono e está no painel como **JUROS-3**, com o default proposto de a
plataforma absorver.

### O bloco novo na tela, e o que ele não é

Uma tabela de **leitura**, derivada, com uma linha por número de parcelas ofertável pelo
termo. Colunas: parcelas, parcela, total do comprador, custo, markup e margem, com a margem
por parcela abaixo do valor. Um rodapé fecha a conta cheia da venda, somando a taxa da
plataforma sobre o face.

Ele **não acrescenta campo editável nenhum** (premissa P2 da spec): os três controles que
governam a escada — `maxParcelas`, `jurosAoMes` e `parcelaMinima` — já existem acima no mesmo
formulário, e a tabela reage a eles. Duplicá-los criaria duas autoridades sobre a mesma
escada. Acima da tabela fica só um campo de **valor simulado**, começando em R$ 300,00, que
recalcula na hora sem salvar nada e sem ida ao servidor.

Tabela, e não cards nem lista, porque a tarefa dominante é comparar atributos entre muitos
itens homogêneos: o dono varre doze linhas procurando onde a margem cai. Números alinhados à
direita, sem ordenação de coluna (a escada por número de parcelas é a única ordem que faz
sentido) e sem ação por linha. `Table`, `Badge`, `formatBRL` e `formatPct` já estão no bundle;
nenhum componente novo de design system.

### Quem edita o quê, e o que o produtor nunca toca

| O quê | Quem edita | Efeito |
|---|---|---|
| Juros ao mês, máximo de parcelas, parcela mínima | `platform_admin` | Novo termo, `versao + 1`, com snapshot imutável |
| Override de taxa por meio, e "sem juros" quando existir | `platform_admin` | Mesmo save, mesma versão |
| Tabela global de taxa por meio | `platform_admin` | Imediato, sem versão |
| Tabela de custo do gateway | `platform_admin` | Imediato; carimbado por venda (RN-459) |
| Valor simulado da tabela | Quem estiver olhando | Nenhum. Não persiste |

**O produtor não mexe em nada disso**, e a regra já é fail-closed pela RN-404: a tela de
termos abre em modo leitura para `tenant_owner`, sem botão de salvar, e as Rules negam o
resto. O único controle vizinho que o produtor tem é o modo da taxa por evento (RN-347), que
não encosta na escada de parcelas.

Nada nesta história exige deploy para mudar número. Exige deploy só a chegada do bloco novo na
tela, uma vez.

## Delta a qualificação do profissional (2026-08-04 · SPEC-QUALIFICACAO)

Spec completa em `02-rodadas/2026-08-04-qualificacao-profissional/01-spec-conta-profissional.md`.

### RN-462 · a qualificação É a promoção (nova, dona · 2026-08-04)

Decisão do dono, verbatim: *"Vejo que é legal termos um breve formulário de qualificação. […]
Para entrar e fazer o acesso, perguntaremos se a pessoa é profissional de bem-estar, (qual),
organizador de eventos, quais modalidades a pessoa trabalha, tamanho de eventos, telefone de
contato, CPF ou CNPJ e nome."*

Sob a RN-461 a frase "para entrar e fazer o acesso" deixa de ser ambígua: o momento de fazer o
acesso profissional é a promoção, e a promoção é o formulário de qualificação. Não são dois
passos, são o mesmo passo. É isso que reconcilia a coleta com a palavra **breve** que o dono
frisou: a qualificação não é um questionário enfiado num cadastro, é o próprio ato de virar
profissional, e por isso não disputa conversão com a porta.

O formulário, com obrigatoriedade e origem do vocabulário:

| Campo | Obrigatório | Vocabulário |
|---|---|---|
| Atuação (bem-estar, organizo eventos) | pelo menos uma, **acumuláveis** | enum novo no core |
| Qual profissão | só com bem-estar marcado | texto livre ≤ 60 |
| Modalidades | sim | lista fechada, **reusa `MODALIDADES_CLUBE`**, com "Outra" abrindo sugestão que não é modalidade |
| Porte dos eventos | só com eventos marcado | quatro faixas, sobre o **maior evento já feito** |
| Organização | não | 2 a 80; opcional porque autônomo não tem uma |
| Telefone | sim | reusa `telefoneValido` |
| CPF | só quando a conta não tem pessoa vinculada | reusa `validarDocumento` |
| Vai operar como pessoa jurídica | sim | enum `tipoPessoa`; "sim" abre o CNPJ |
| Uso para recomendação e curadoria | **não**, e recusar não bloqueia | consentimento próprio (RN-466) |

Quem já comprou e só organiza eventos responde cinco. Quem nunca comprou e só é profissional de
bem-estar responde seis. Nenhum caminho passa de sete.

Atuação é acumulável porque quem organiza também pratica, e porque o modelo já aceitava:
`profissionais/{uid}.papeis[]` é lista desde sempre (`packages/core/src/index.ts:69`).
Modalidade é lista fechada porque o dono já tomou essa decisão uma vez, no clube, e a razão
está registrada no módulo: *"o dono decidiu tirar o texto livre"*
(`packages/core/src/clubs/clube-opcoes.ts:5`).

**A qualificação não substitui o convite.** Ao fim dela o doc nasce em `aguardando_convite`
(RN-411) e a pessoa cai no overlay bloqueante que a S1609 construiu. O go-live controlado não é
afrouxado. O que a qualificação compra é o time decidir a liberação com algo além do nome da
organização.

**Won't do preservado.** Coletar documento para identificar não é KYC. Verificação de identidade
contra base oficial segue fora do escopo deste épico.

## Delta a lista de tenants filtrada quebrava em produção (2026-08-05 · DIAG-CLUBES)

Achado de raspão, enquanto a lane investigava outra tela. A listagem de produtoras do administrador
da plataforma combina filtro por situação com ordenação por data de criação, e essa combinação
exige um índice composto que não existia. **É traiçoeiro pelo formato:** sem filtro a consulta
funciona, porque o índice automático de campo único serve; com filtro ela falha. O caminho comum
está certo, e só o caminho filtrado quebra.

Sem regra nova. O índice entrou junto com o de clubes e **está no ar**. A história é a **S035** no
[[LEELA-E00-fundacao-tecnica]], onde as diretrizes desta família ficam registradas, e a tarefa de
tela deste épico que o defeito alcança é a `S1601-T3`.

## Delta a parede do convite virou vitrine (2026-08-06 · ONBOARD-VITRINE)

Ordem do dono em 06/08, depois de duas contas reais pararem na parede que a RN-416 desenhou.
Verbatim e leitura completa em `02-rodadas/2026-07-28-onboarding-organizador/04-decisao-vitrine-0806.md`
(**D-ONB-6**). Construção e gates em `.nirvana/handoffs/leela-onboard-vitrine-20260806.md`.

### RN-510 (nova, dona) · a conta sem código entra em vitrine, e o aviso responde ao gesto

**Sucede a RN-416**, que fica **marcada e legível** no lugar de apagada — o desenho de parede
dela ainda explica por que a propriedade de dados existe.

> **RN-510 · Vitrine e aviso de boas-vindas.** Conta autenticada **sem tenant e sem
> administração da plataforma** (`statusOnboarding: 'aguardando_convite'`) **entra** no
> painel em modo **vitrine**: o shell renderiza, o menu navega e cada área nomeia o que faz,
> **sem número e sem exemplo**. Nenhuma consulta com escopo de tenant sai da vitrine — a
> propriedade que a RN-416 protegia não muda de valor, só de mecanismo: em vez de a rota não
> montar, monta-se uma tela **sem hook de dados**, e a propriedade passa a ser medida por
> allowlist fechada sobre o api-client (prova executável, não leitura).
> Na **primeira interação** — clique ou o equivalente por teclado (`Enter`/`Espaço`) sobre
> algo acionável — sobe o **aviso de boas-vindas**: acolhe, orienta a falar com o time para
> receber o **"código Leela"** (é o nome que a pessoa lê) e mantém o campo de resgate ali
> mesmo (RN-414, inalterada). O aviso **bloqueia** enquanto está na tela (véu opaco,
> `aria-modal`, armadilha de foco) e **fecha** por `Esc` ou botão; fechado, **rearma** — a
> interação seguinte o traz de volta. Uma linha do aviso aponta a área do cliente na landing
> para quem só participa. Enquanto o crachá está sendo lido, **nem a rota real nem a vitrine
> montam**: é estado de espera, porque a janela de leitura deixava escapar consulta de tenant
> de conta que ainda não se sabia sem tenant. `/conta` continua sendo da pessoa (RN-416
> preservada nesta parte): ali a rota real monta e o aviso não sobe. A tranca de dado
> continua sendo das Rules (RN-400/401) — a vitrine é experiência, como o overlay sempre foi.

**Épico dono:** E16 · **consome:** E00 (jornadas de conta), E01 (componentes do DS).

### O que muda na S1609-T2, sem virar história nova

A `LEELA-S1609-T2` ("Overlay bloqueante + conta travada + CTA") foi **entregue em 03/08** e
está reescrita por esta ordem. Ela continua sendo a tarefa dona da superfície; os critérios
que mudaram:

| Critério de 28/07 (RN-416) | Passa a ser (RN-510) |
|---|---|
| Overlay aterrissa na home, antes de qualquer gesto | A pessoa entra em vitrine; o aviso sobe na primeira interação |
| Não-descartável (sem X, sem Esc, sem clique-fora) | Bloqueante enquanto aberto, **descartável** por `Esc` e botão, e rearma no gesto seguinte |
| Rota de destino não monta | Monta a **vitrine** — tela sem consulta, que acompanha o endereço |
| Copy "Seu acesso ainda não foi liberado" (P9) | Copy de boas-vindas; o código é nomeado **"código Leela"** e é coisa de quem vai ser profissional |
| Foco entra no campo de código | Foco entra no painel do aviso — o campo não é pedágio |

**Critério novo, que não existia:** com a conta em vitrine, o painel chama do api-client só
`onSessionChange`, `getClaims`, `getLeelaDb` e `getContatoOnboarding`. Qualquer outro nome
derruba o gate.

### O defeito que a construção achou (não é regressão dela)

O gate lia o crachá **renderizando as rotas reais** — decisão documentada em 03/08 e tida
por inofensiva. Não era: nessa janela `/crm` disparava `getOverview` e `/marcas` disparava
`listarMarcas`, porque o `enabled` das duas telas olha `uid`/`eventoId` e nunca `tenantId`.
Duas consultas de tenant de uma conta que, um tique depois, se revelaria sem tenant — e que
voltariam negadas, que é exatamente o custo que a parede dizia evitar. Fechado com estado de
espera e travado por teste.

### O véu, e por que ele voltou ao mesmo lugar

O **DEF-C** (tabela de defeitos da ONBOARD-REV, acima) foi corrigido em 03/08 trocando a
classe do véu pelos tokens do DS. O que **não** existia era a prova: os comentários do código
citavam um teste de CSS buildado que nunca tinha sido escrito. Ele existe agora, lê a classe
**da fonte**, compila com o Tailwind e o preset reais, e traz falsificação embutida — compila
a classe do DEF-C e exige zero declaração de fundo. Medição independente no `dist`: nenhuma
ocorrência da classe quebrada, regra do véu presente, token em `rgba(0,0,0,.6)`.

## Delta a vitrine ganha um segundo público (SPEC-PAINEL-CLIENTE · 2026-08-06)

A RN-510 continua **inalterada no enunciado**. O que muda é quem chega nela.

Até hoje, a vitrine servia uma pessoa só: quem se cadastrou pelo `/cadastrar` do painel e ficou
em `aguardando_convite`. A rodada SPEC-PAINEL-CLIENTE
(`02-rodadas/2026-08-06-painel-cliente/`) abre uma segunda origem: a participante que já comprou
na Leela, já tem conta, e clica na porta do painel do cliente para conhecer o outro lado.

O mecanismo dela é a **RN-512**, dona em [[LEELA-E12-landing]]: uma promoção no servidor que cria
`profissionais/{uid}` em `aguardando_convite` (RN-411) com o carimbo do termo do profissional, e
entrega a pessoa aqui. Vale registrar o que essa origem **não** faz, porque é o que mantém este
épico intacto:

- não concede tenant, papel nem capacidade de plataforma — a fronteira é provada por teste, no
  molde da RN-480;
- não altera a allowlist de quatro portas que a vitrine consulta, nem a lista `ROTAS_LIBERADAS`;
- não muda o mecanismo do código Leela (RN-414), que continua sendo a chave de virar profissional;
- não pede exceção na guarda de conta órfã do `destinoPosLogin`: ela passa a encontrar o doc que
  procura, e continua barrando quem não o tem.

**Consequência de volume, que é o que vale antecipar.** A vitrine passa a receber gente que já é
cliente da plataforma, e não só quem procurou o painel. A "fila de pedidos de acesso" que a
rodada de 28/07 deixou registrada como candidata natural — para o dono prospectar quem entrou em
vitrine e não resgatou código — fica ainda mais atraente. Continua **não pedida**, e continua
sendo card próprio se o dono quiser.

## Delta o que a review antagonista mediu na vitrine (REV-VITRINE · 2026-08-08)

A RN-510 continua **inalterada no enunciado**. A review de contexto frio atacou os nove vetores
que a lane construtora declarou e a propriedade central resistiu: nenhuma query tenant-scoped sai
da vitrine, e o véu compila em cor de verdade no CSS que o build entrega — medido no `dist`
(`index-DufB2CDQ.css`, 109.895 bytes), não lido do código.

O que muda no épico são **três pontas de mecanismo** que a review consertou, e que quem mexer na
porta precisa saber que existem.

**1 · A camada de PAPEL passou a ser verificável, como a de AUTH já era.** O painel empilha duas
fronteiras em `App.tsx`: `RequireSessao` decide quem entra, `ContaTravadaGate` decide o que um
autenticado vê. A primeira tinha lint (`leela-auth/rota-fora-da-fronteira`) e contrato de 28
casos; a segunda não tinha nada. A review falsificou enxertando uma rota irmã com `RequireSessao`
e sem `ContaTravadaGate`: **eslint verde, os 28 casos verdes, a allowlist verde, e `getOverview`
saindo pela porta** para uma conta sem tenant. A allowlist não pegava porque visita uma lista de
URLs escrita à mão. Agora existe `gate-de-papel.test.ts`, que lê a fonte do `App.tsx` e exige que
toda rota debaixo do guarda de sessão monte também o gate de papel — rota nova que esqueça o gate
aparece pelo `path`. **Consequência para quem escreve rota:** abrir rota autenticada fora do
`ContaTravadaGate` passa a ser decisão declarada, não descuido silencioso.

**2 · O estado de espera do crachá ganhou prazo.** O estado nasceu nesta rodada (é ele que fecha o
vazamento de `getOverview`/`listarMarcas` na janela em que o claim ainda não voltou) e nasceu sem
saída: `getClaims` que **nunca assenta** — a aba que o celular suspendeu no meio do refresh do
token — deixava skeleton eterno, porque promessa pendurada não rejeita e o `catch` que trata a
leitura com erro nunca rodava. Medido: cinco minutos de relógio simulado, o retângulo cinza ainda
na tela. O prazo (12s) faz o caso pendurado terminar no **mesmo** estado terminal em que o caso
com erro já terminava — autenticada sem papel, que é vitrine, fail-closed. Quando a leitura real
assenta depois do prazo, ela sobrescreve e o painel volta sozinho.

**3 · `/conta` entrou na medição.** `ROTAS_LIBERADAS` tem um nome só, e por isso `/conta` é o
**único** endereço em que a conta em vitrine monta uma tela REAL, com hooks de dados — e era a
única rota que a allowlist da RN-510 nunca visitava. Entrou, junto com `/conta/perfil-publico`. As
duas estão limpas hoje; a `RecebimentoSection` (RN-366) e o editor de perfil público vivem lá
dentro, e agora estão congeladas contra dado de tenant.

**O que ficou como decisão do dono, e não como defeito.** O aviso é `role="dialog"` escrito à mão:
o véu bloqueia o hit-test do ponteiro e **não** bloqueia tecnologia assistiva — medido, um clique
de leitor de tela no menu navegou o painel com o aviso na frente, e em silêncio, porque os
ouvintes de interação saem do documento enquanto ele está aberto. O `Modal` do DS já resolve isso
(portal, armadilha cíclica, trava de rolagem, retorno de foco). E no tema brasa o cartão do aviso
dá 1,13:1 contra o próprio fundo velado. Os dois estão em `DECISOES-ABERTAS.md` como
**VITRINE-VEU-1** e **VITRINE-CONTRASTE-1**, com default em vigor.

**Contraste, para não se remedir:** todo o texto do aviso e da vitrine passa AA nos dois temas,
calculado dos tokens resolvidos do bundle. Pior par: botão primário em hover, 4,58:1 num limiar de
4,5. Anel de foco: 6,15:1 sobre o cartão e 6,65:1 sobre a base, num limiar de 3. Números completos
em `.nirvana/handoffs/leela-retomada-20260808-REV-VITRINE.md` §2.


## Delta a vitrine tem DUAS saídas, e a segunda não passa por "fechar" (REV-CORTE · 2026-08-09)

A RN-510 continua **inalterada no enunciado**. O que entra aqui é uma ponta de mecanismo que o
enunciado sempre pressupôs e nunca disse em voz alta, e que custou dois defeitos quando o
VITRINE-VEU-1 trocou o véu escrito à mão pelo `Modal` do DS.

O enunciado descreve o aviso subindo no gesto e **fechando** por `Esc` ou botão. Mas a vitrine
também termina por outro caminho, que é o desfecho FELIZ dela: a pessoa resgata o código Leela,
a claim de tenant nasce, a sessão é relida e a vitrine **cai** — com o aviso ainda aberto,
porque foi de dentro dele que o código foi digitado. Esse caminho nunca passa por "fechar".

**Por que isso virou defeito.** O VITRINE-VEU-1 precisou trazer `inert` para o fundo (o `Modal`
do DS não o faz, e `aria-modal` é sinal e não trava). O `inert` foi amarrado ao estado "aviso
aberto", e esse estado nunca virava falso na saída por resgate: o conteêner do app ficava inerte
**para sempre**. Medido em 09/08, com o resgate dando certo: aviso fora da tela, `inert` no
conteêner, os seis links do menu dentro dele. No navegador, o painel que a pessoa acabou de
liberar não responde a mouse, teclado nem tecnologia assistiva até um F5.

**A regra de mecanismo que fica escrita**, para quem mexer na porta:

1. **Toda trava que o aviso põe no fundo é devolvida em TODAS as saídas** — as quatro do gesto
   (X, `Esc`, clique no véu, "Continuar olhando") **e a saída por sessão**, que é o resgate bem
   sucedido. Amarrar a devolução só à limpeza do efeito não basta: quando a vitrine cai por
   baixo do aviso, as dependências não mudam e a limpeza nunca roda.
2. **A devolução acontece ANTES do desmonte, não depois.** O React processa a remoção da
   subárvore antes da limpeza do efeito do pai, e o retorno de foco ao abridor cai no meio desse
   intervalo. Foco em nó inerte é no-op: quem fecha pelo `Esc` perde o foco para o `<body>` e
   recomeça do topo da página (WCAG 2.4.3) — exatamente a promessa que a adoção do `Modal`
   veio cumprir.
3. **"O aviso está aberto" só pode ser verdade quando ele está na tela.** O estado é lido por
   quem age no DOM, e ali um `true` mentiroso deixa de ser detalhe de render e vira dano.

**A lacuna de prova que isto fecha, e que vale para qualquer lane futura:** o jsdom **não**
implementa o comportamento do `inert` — ele guarda o atributo e não bloqueia clique nem foco. A
lane construtora leu isso como "aqui não dá para medir". Dá: o **atributo** é medível, e é ele
que o navegador consome. Os dois defeitos eram visíveis sem navegador nenhum. O que continua
exigindo navegador é só o *efeito* — o clique sintético que não navega e o leitor de tela.

**O que saiu de DECISÕES-ABERTAS nesta rodada:** VITRINE-VEU-1 e VITRINE-CONTRASTE-1 foram
construídos em 09/08 e revisados no mesmo dia. O contraste do limite do cartão passou de 1,13:1
(cartão contra o velado, brasa) para **3,82:1** de borda contra o cartão e **4,30:1** contra o
velado; no wine, 3,74:1 e 5,90:1. Números reconferidos por conta independente na review, dos
tokens resolvidos e do `dist`. `--surface-raised` **não** foi tocada — clareá-la continua sendo
a condição de reabertura do item, e continua sendo do dono.

**O que continua fora, de propósito:** o `inert` **não** subiu para dentro do `Modal` do DS. As
outras 26 telas que o usam seguem sem trava de fundo, e a review reforça a recomendação de subir
— com um motivo a mais: fora do DS, o ciclo de vida da trava não está amarrado ao do diálogo, e
foi dessa folga que os dois defeitos nasceram. É conversa com review própria.

## Delta a visão master dos tenants (SPEC-ADMIN-VISAO · 2026-08-09)

Ordem do dono em 09/08, verbatim e leitura completa em
`02-rodadas/2026-08-09-admin-visao/01-ordem-do-dono.md`. Ele pediu duas famílias: **drill-down por
tenant** (eventos, clubs, clientes, vendas, faturamento gerado, repasses, plano de cobrança,
responsável) e **listas globais** (todos os eventos, todos os clubs, todos os usuários). A frase que
fechou o pedido — *"temos isso no banco então acho que não seria dificuldade em ver isso no painel
admin"* — foi tratada como hipótese a conferir campo a campo, não como fato. Inventário em
`02-inventario-gap-map.md`, spec em `03-spec.md`, fila em `04-fila-build.md`.

### O que a conferência devolveu, e onde a intuição do dono estava certa

Na camada que ele não podia ver, ele estava certo. O `platform_admin` **já** atravessa a fronteira em
`eventos` (`firestore.rules:744`), `clubes` (`:2018`), `atletas` (`:2812`, leitura),
`profissionais` (`:2922`), `pagamentos` (`:2530`), `pedidos` (`:2671`), `inscritos` (`:931`) e
`tenants` (`:154`). **Nove dos onze itens não pedem nenhuma Rule nova**, e as duas listas globais de
eventos e clubs são coleções raiz cuja consulta passa hoje.

Quatro achados mudam o tamanho da fila, e os quatro estão medidos:

1. **`recomputePlatformRollups` não tem cron.** É `https.onCall` puro; nenhum `pubsub.schedule`
   aponta para ela. A tela `/plataforma/macro` mostra o retrato do último clique, sem dizer que é
   isso. Vira RN-538.
2. **Custo e margem não existem em código.** `custoGateway`, `custoReal`, `receitaPlataforma` e
   qualquer cálculo de margem têm **zero ocorrências** em `packages/core`, `packages/api-client` e
   `functions/src` — existem só em markdown de spec. `economiaParcelamento.ts` (S1610-T6) não existe,
   e o `netValue` do Asaas é descartado de propósito
   (`functions/src/payments/asaasProvider.ts:1506`, com teste travando).
3. **`crmClientes` é a única coleção tenant-scoped cujo `allow read` omite `isPlatformAdmin()` de
   propósito** (`:382`), com a razão escrita na própria Rule: back-office usa Admin SDK. Vira RN-539.
4. **Não existe nenhuma regra de `collectionGroup` no arquivo.** Toda CG vinda do client SDK é
   negada, inclusive para administrador — enquanto `firestore.indexes.json` **já tem** índices
   `COLLECTION_GROUP` servindo consumidores server-side. Índice existe, Rule não; o erro pareceria
   falta de índice e não é.

E dois itens em que "temos no banco" **não se sustenta**: não existe campo de **responsável** próprio
do tenant (só `ownerUid`), e não existe **plano vivo** por tenant — `aplicarPlano` **estampa** os
números no termo e grava `planoAplicadoId`, sem vínculo.

### Regras de negócio novas (faixa RN-537 a RN-542)

- **RN-537 · A visão master lê o carimbo, nunca recalcula dinheiro.** Toda cifra do painel master
  deriva do gravado: `conciliacao.taxaValor` e `conciliacao.repasseOrganizador` por venda (congelados
  na confirmação, RN-179), `gmvAcumulado` e os agregados de `platform/rollups`. O cliente não
  recompõe taxa nem líquido a partir de percentual e não soma venda a venda para produzir total. A
  **RN-182 é mode-aware**: `incorporada` ⇒ `face − taxa(meio)`; `repassada` ⇒ **face cheio**. Aplicar
  `face − taxa` a todo mundo erraria o número de todo evento repassado. Fonte ausente ⇒ campo
  **vazio com rótulo**, nunca zero e nunca estimativa silenciosa (espelha RN-455).
- **RN-538 · Agregado macro tem idade declarada, e uma atualização confiável.** Toda superfície que
  exiba valor de `platform/rollups` mostra o `atualizadoEm` e sinaliza obsolescência. O recompute
  ganha execução agendada, preservada a invocação manual — é recompute integral e idempotente
  (`set()` sobre a varredura de `tenants`), então agendar não introduz dupla contagem. Estende
  RN-409.
- **RN-539 · Perfil de cliente cruza a fronteira por servidor, nunca por Rule.** A visão de clientes
  do painel master é servida por **callable com Admin SDK**, autorizado por `isPlatformAdmin` do
  core; `firestore.rules:382` permanece como está e nenhuma leitura de `crmClientes` pelo client SDK
  é acrescentada. O callable devolve só o que o CRM já minimiza (RN-172): sem CPF, e-mail, telefone
  ou endereço.
- **RN-540 · O diretório de contas é do administrador, é mínimo e não sai da tela.** Escopo
  estritamente `platform_admin` (conta separada, RN-449). Alcance sobre `atletas` e `profissionais`;
  **`pessoas` permanece fechada** (`:2688`) e CPF não aparece no painel master sem decisão própria.
  **Sem export, CSV ou download.** Toda leitura que atravesse a fronteira por servidor registra
  acesso, e a **negativa também**, no molde de `getBankDetailsForPayout`. Frente jurídica: LGPD-1.
- **RN-541 · Plano aplicado é estampa, e a tela declara a divergência.** A ficha mostra
  `planoAplicadoId` junto da versão do termo; quando os números vigentes divergem do plano estampado,
  a tela **diz que divergiu** em vez de exibir o nome do plano como verdade. Sinal de leitura, não
  bloqueio — a edição manual do termo é legítima.
- **RN-542 · Responsável do tenant · condicionada ao veto do dono (V-3).** Se "responsável" for o
  owner, a RN não nasce e o trabalho é tipar `telefone`/`organizacao` (hoje gravados por
  `packages/api-client/src/platform/profissionais.ts:113` **sem estarem na interface `Profissional`**)
  e exibir. Se for contato próprio, nasce `Tenant.responsavel?: { nome, email, telefone? }` —
  opcional, ausência significando "é o owner", escrita exclusiva do `platform_admin` (RN-404), sem
  coleção nem índice novo.

### Histórias novas

| História | O que entrega | Espera |
|---|---|---|
| **LEELA-S1612** · A ficha do tenant: o que ele produz e para quem | SubNav na rota que já existe + abas Eventos, Clubs e Clientes (esta por callable) | V-2, V-3 |
| **LEELA-S1613** · A ficha do tenant: a economia dele | abas Vendas e Financeiro (faturamento, saldo, repasses) + plano aplicado com divergência | V-1 |
| **LEELA-S1614** · Todos os eventos e todos os clubs do sistema ✅ **construída em 11/08** | duas listas globais, coleção raiz, sem Rule nova e sem collection group | — |
| **LEELA-S1615** · O diretório de contas no painel master | uma rota com dois modos: Fila (aguardando liberação) e Diretório (leitura) | V-4, V-5 |

**O desenho que evita sete rotas.** O drill-down é **uma** rota — `/plataforma/tenants/:tenantId` —
com SubNav e abas filhas. O dono não abre o painel para consultar "os clubs do Castelo"; abre para
entender uma produtora, e a pergunta seguinte muda conforme a primeira responde. A rota já existe e
carrega perfil, owner, quatro KPIs e as ações de lifecycle; nada do que está no ar é reescrito.

### A costura com a ADMIN-USUARIOS-1, e por que é uma tela e não duas

A decisão de 09/08 mandou o cadastro aparecer no painel master, com aprovação por código ou liberação
direta. Ela e a "visão de todos os usuários" desta ordem se tocam sem serem iguais: uma é **fila de
trabalho**, a outra é **diretório**. Duas telas duplicariam lista de pessoas no mesmo painel; uma
tela sem separar os modos transformaria diretório em painel de ação e exporia mais gente do que o
trabalho exige. A S1615 resolve com **uma rota, dois modos, Fila como padrão** — o recorte mais
fechado é o que abre.

A tensão com a **RN-510** continua onde estava e **não foi reaberta por esta lane**: se "tenta fazer
alguma ação" é qualquer gesto (ratificando a regra em vigor) ou é ação **bloqueada** (mudando P11 e
P14) é pergunta do dono, registrada como **V-5** com as duas leituras e o custo de cada uma, como o
registro de 09/08 já havia determinado.

### O que a onda 4 construiu (2026-08-11 · lane ADMINVISAO-ONDA4)

A **S1614** fechou inteira: `/plataforma/eventos` e `/plataforma/clubs` no ar como rota, com os dois
itens no menu do super-admin. Três decisões da lane que passam a valer para quem construir as ondas
vizinhas:

- **O contador tem duas formas, e a segunda é a única que declara total.** Enquanto o `proxCursor`
  não é nulo, a tela diz "Mostrando N"; quando a paginação acaba, N vira o total do recorte. Nenhum
  "de N" aparece antes disso, porque a query nunca computou um total. O puro vive em
  `apps/painel/src/routes/plataforma/_lib/listasGlobais.ts` e é reusável pelas abas da ficha.
- **Um recorte por vez na lista de eventos: tenant OU status.** O reader global da onda 1 decidiu
  por escrito que o recorte por tenant reusa `listarEventosDoTenantPaginado`, e não existe reader que
  aceite os dois filtros. Peneirar status no cliente sobre a página do tenant faria o contador mentir
  — a tela declara a restrição em vez de fingir que filtra.
- **Nenhuma cifra na lista global.** `Evento.receitaConfirmada` existe e tem escritor, mas dinheiro no
  painel master é a ficha do tenant (RN-537, mode-aware da RN-182, rota com review antagonista). A
  varredura global responde "o que existe"; "quanto rendeu" é a onda 2.

Nenhum vetável foi tocado: a onda 4 é a única das quatro de tela que não espera V-1 a V-5.

### Dependências declaradas

- **REDESIGN-DS** — as quatro ondas de tela dependem dele, e a dependência é maior do que parece. O
  glass é atributo no `<html>` (`packages/design-system/src/theme/generate.ts:286-303`), e o painel
  do organizador e o painel master são a **mesma aplicação**: alternar por área é decisão de
  mecanismo daquela rodada. Além disso, **desligar o glass devolve os tokens opacos do tema e não
  produz fundo preto** — preto exige variante de superfície ou quarto tema. O dono escreveu "se
  possível" e mandou propor alternativa a ele em vez de decidir em silêncio.
- **S1610** — dona de `platform/config.custoGateway` (T3), do carimbo do custo na venda (T4), do
  custo real do gateway (T5) e do módulo de economia (T6). Esta rodada **consome** o que ela
  entregar; enquanto não subir, a coluna de margem mostra "custo não configurado", que é o que a
  RN-455 já manda.
- **Vetáveis V-1 a V-5** — consolidados em `03-spec.md §Parte 5`, sobem ao dono de uma vez.

### Dívida encontrada, registrada sem carona

**A claim de administrador tem duas leituras que não conversam.** As Rules aceitam as duas pernas
(`role == 'platform_admin'` **ou** `platformAdmin == true`, `firestore.rules:73-77`) e o core faz o
mesmo (`packages/core/src/platform/roles.ts:131`). Mas quase toda guarda de callable compara
`claims.role` na mão — `assertPlatformAdmin` (`functions/src/finance/atores.ts:45`), `aplicarPlano`,
`setTaxaPlataformaGlobal`, `transitionTenant`, `provisionTenant`, `recomputePlatformRollups`. Só
`setPlatformAdminCapability` usa o predicado. Uma conta com capacidade e sem o papel legado **lê**
tudo e **é barrada** em quase toda escrita: telas carregam, ações falham, e o erro não explica por
quê. Não bloqueia esta rodada (a conta do dono tem o papel legado) e por isso não entra em onda
nenhuma — mas encosta em todas, e vira card próprio.

**Três lacunas de teste** que esta rodada acrescenta como tarefa, porque as telas novas passam
exatamente por elas: nenhum caso exercita `platform_admin` contra `crmClientes` (a negação mais
consequente do arquivo não tem canário); nenhum caso de `collectionGroup` com crachá de
administrador; e `pessoas` (`:2688`) não tem caso nomeado com administrador.

## Delta o fluxo de aprovação de contas (SPEC-ADMIN-USUARIOS · 2026-08-10)

Decisão ADMIN-USUARIOS-1 do dono em 09/08 — *"esse cadastro deve aparecer no painel master.
que lá eu aprovarei, passando um código. Ou liberando diretamente o acesso. O modal de liberar
acesso deve aparecer depois que a pessoa já entra no sistema e tenta fazer alguma ação."* —
formalizada contra o código real em `02-rodadas/2026-08-10-admin-usuarios/` (decisão,
inventário linha a linha, spec e fila). A tela continua sendo a **S1615** (uma rota, dois
modos); este delta dá a ela o contrato que faltava.

### O que a medição cravou, e a spec consome

**Aprovação não é campo — é a posse da claim `tenantId`.** Não existe `aprovado`, `pendente`
nem callable de aprovação em lugar nenhum (greps exaustivos no inventário). O estado inteiro
cabe em duas peças: `profissionais/{uid}.statusOnboarding: 'aguardando_convite' | 'ativo'`
(preso pela Rule no create, promovido só por `provisionTenant.ts:407`/`:425`) e as claims
(`role` + `tenantId`). O painel master **não lê** esse estado hoje (grep `aguardando_convite`
em `routes/plataforma`: zero), e nenhum reader lista `profissionais` — a Rule já permitiria ao
admin (`firestore.rules:2920-2922`); falta só a S1615-T1.

**A vitrine não descobre a liberação.** `onSnapshot`/`onIdTokenChanged`: zero no fluxo;
`sessao.recarregar()` só roda após resgate na própria tela (`ContaTravadaGate.tsx:141-144`).
Liberada server-side, a conta fica em vitrine até o F5 — é o buraco que o ADMINVISAO-5 (b)
pergunta e a RN-550 propõe fechar.

### Regras de negócio novas (faixa RN-547 a RN-552)

- **RN-547 · Quem espera aparece.** Toda conta em `aguardando_convite` aparece na fila do
  painel master (modo Fila da S1615) desde o instante do cadastro, pelas duas origens
  (`/cadastrar` — RN-411; ponte — RN-512), com os campos mínimos da RN-540. Nenhum estado novo:
  sair da fila é consequência do `statusOnboarding` virar `'ativo'`, nunca gesto separado. A
  fila declara a borda da conta órfã (write best-effort que falhou — frente LGPD-1).
- **RN-548 · Aprovar tem duas portas e um destino só.** Código (RN-414, intocada) e liberação
  direta terminam no **mesmo** estado terminal, produzido pelo mesmo núcleo
  (`provisionTenantCore`): tenant `ativo` + doc `'ativo'`/`tenantId`/`papeis` + claims
  `tenant_owner`+`tenantId` com refresh revogado. Mesma régua de elegibilidade
  (`contaElegivelParaPapelDeOrganizador`); a porta administrativa nomeia o motivo da recusa (o
  operador não é atacante). Prova por teste que compara os dois desfechos campo a campo.
- **RN-549 · A régua do "AÇÃO" — condicionada ao ADMINVISAO-5 (a).** No default proposto
  (ratificar), nada muda no ar: a regra escreve a régua da RN-510 como texto canônico —
  dispara clique/`Enter`/espaço sobre acionável (o `SELETOR_INTERATIVO` real, aba de menu
  incluída pelo verbatim de 06/08), não dispara texto/moldura/foco puro/tecla de widget/aviso
  isento/`/conta`, rearma ao fechar. Na leitura restritiva, muda P11/P14 e
  `primeiraInteracao.ts`, com o custo declarado no vetável.
- **RN-550 · A liberação chega sem F5 — condicionada ao ADMINVISAO-5 (b).** Default proposto:
  a vitrine assina o **doc próprio** (`request.auth.uid == profId` já passa na Rule — zero
  Rule nova), relê o crachá quando `statusOnboarding` vira `'ativo'` e cai pela mesma saída
  por sessão do resgate, com todas as travas devolvidas (lição REV-CORTE). A allowlist da
  RN-510 cresce **em um nome, declarado**. O aviso ganha a linha da segunda espera; o campo de
  resgate fica (RN-414).
- **RN-551 · Todo ato de aprovação deixa rastro.** Quem, quando, sobre quem, por qual porta —
  nas duas portas, com **negativa registrada**, no livro `auditoriaAcessos` que a Onda 1 já
  abriu. Sem export (RN-540 vale para o rastro). O convite queimado (RN-447) continua sendo o
  rastro do código; o registro canônico do ato passa a ser o resgate/liberação, num lugar só.
- **RN-552 · Recusar e revogar — condicionada ao ADMIN-USUARIOS-2.** Nasce na forma da
  resposta (número consumido de qualquer jeito, como a RN-546). Já cravado: se existirem, são
  atos com o rastro da RN-551, e revogação nunca apaga dado — no máximo suspende
  (`transitionTenant`).

### História nova

| História | O que entrega | Espera |
|---|---|---|
| **LEELA-S1616** · A aprovação converge, e a vitrine descobre | contrato de convergência da liberação direta (T1) + rastro das duas portas + saída da vitrine sem F5 (T2) + copy das duas esperas (T3) + régua do gatilho (T4) + recusa/revogação (T5, condicionada) | ADMINVISAO-5 (a) e (b) · ADMIN-USUARIOS-2 (só T5) |

A S1616 dá o **contrato** da `S1615-T3` (liberação direta) e da `S1615-T4` (delta da RN-510);
a tela continua na onda 5 da ADMIN-VISAO. Fila com territórios e gates em
`02-rodadas/2026-08-10-admin-usuarios/04-fila-codigo.md` — incluindo o **gate de produção**
herdado do corte de 09/08 (o registro diz que `resgatarConviteOrganizador` responde 404 em
produção; conferir o deploy antes de qualquer build que dependa da porta do código viva).

### A RN-510 continua inalterada no enunciado

O gatilho só muda se o dono escolher a leitura restritiva no ADMINVISAO-5 (a) — e aí a mudança
é a `S1616-T4`, declarada, nunca efeito colateral. A allowlist ganha um nome **somente** se o
default do (b) for ratificado, e ganha nomeado. As pontas que a medição achou sem carona em
decisão: a sidebar troca para a nav de plataforma por pathname sem olhar claim
(`shell/sidebar.ts:148-157` — moldura mente o papel para conta em vitrine que digita
`/plataforma`; dado nenhum vaza) e os puros da régua não têm teste unitário dedicado — as duas
na fila da rodada como consertos P1/P2.

### O que saiu e o que entrou no painel de decisões

**ADMIN-USUARIOS-1 saiu** — decidido em 09/08, formalizado nesta rodada; o alcance do
diretório, que era a metade ainda aberta, foi respondido pela própria ordem da visão master
("todos os usuários") com o desenho de dois modos da S1615. **ADMIN-USUARIOS-2 entrou** no
lugar (recusa/revogação — a pergunta que a frase não alcança). **ADMINVISAO-5 foi atualizado
no lugar**: as duas letras ganharam default proposto com custo medido; a decisão continua do
dono.

---

## Delta os cinco vetáveis da visão master fecham juntos (leva 6 do dono · 2026-08-11)

Os cinco vetáveis que a SPEC-ADMIN-VISAO abriu em 09/08 — **V-1 a V-5**, itens **ADMINVISAO-1 a
ADMINVISAO-5** do painel — foram decididos na noite de 11/08, num lote só. As palavras do dono estão
em `02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md`. **As ondas 2, 3 e 5 da fila
(`02-rodadas/2026-08-09-admin-visao/04-fila-build.md`) destravam.**

### V-1 · ADMINVISAO-1 · "faturamento gerado" é o dinheiro da Leela

Na íntegra: *"faturamento gerado é para a leela, já que ficamos como que sobra do TPV menos custos
operacionais e repasses dos organizadores."*

A ficha da produtora chama de **faturamento gerado** a receita da **Leela**: TPV menos custos
operacionais menos repasses dos organizadores. A **RN-537 não muda de enunciado** — o número
continua vindo do carimbo e nunca de conta refeita no cliente; o que fica decidido é **qual dos três
dinheiros o rótulo nomeia**.

A consequência que a esteira não pode esconder: **custo operacional não existe em código** (achado 2
da conferência de 09/08 — `custoGateway`, `custoReal` e `receitaPlataforma` com zero ocorrências, e
o `netValue` do Asaas descartado de propósito). Enquanto a **S1610** não subir, a parcela de custo
fica **vazia com rótulo**, como a RN-455 e a RN-537 já mandam, e a tela declara o que falta em vez de
apresentar um número que finge estar completo. Tarefa: `S1613-T4`.

### V-2 · ADMINVISAO-2 · a aba de clientes mostra a ficha completa, contato incluído

Na íntegra: *"tem que guardar cpf, e-mail, telefone, cidade, endereço, restrições, pedidos, tudo. É
a ficha geral de clientes, membros, participantes dos clubs, e a visao geral no individuo, para
analisarmos como organizadores."*

É a segunda opção do item: **comportamento e contato**. A aba mostra a ficha completa por indivíduo —
CPF, e-mail, telefone, cidade, endereço, restrições e pedidos —, e o alcance é de clientes, membros e
participantes de clubs.

O que isso move na **RN-539**: o callable com Admin SDK continua sendo o mecanismo (a Rule
`firestore.rules:382` não abre, e nenhuma leitura de `crmClientes` pelo client SDK é acrescentada),
mas ele deixa de devolver só o que o CRM minimiza. O contato existe noutro lugar e é de lá que ele
sai — `pedidos.responsavel` (e-mail e telefone) e `inscritos.dadosPessoais` (CPF e telefone) —, lido
cross-tenant por servidor, com registro de acesso e de negativa como a RN-540 já manda.

**A RN-172 não muda.** O CRM continua minimizando por desenho: o que a ficha do painel master faz é
montar a visão a partir das fontes que já guardam o dado, não engordar o documento do cliente.

**A fronteira que o próprio item escreveu continua valendo:** concentrar PII de participante de todo
produtor numa superfície só é frente do **LGPD-1**, e o LGPD-1 segue aberto. A decisão do dono diz o
*que* a tela mostra; a leitura jurídica de sob que base isso é tratado é a mesma conversa de advogado
que o LGPD-1 já pede, e ela não foi respondida aqui.

### V-3 · ADMINVISAO-3 · responsável é o dono da conta

Na íntegra: *"Responsável é o dono da conta."*

É a primeira opção. **A RN-542 não nasce** — nenhum campo novo, nenhuma coleção, nenhum índice. O
trabalho é o que o item já dizia: tipar `telefone` e `organizacao` na interface `Profissional`
(gravados hoje por `packages/api-client/src/platform/profissionais.ts:113` sem estarem no tipo) e
exibir. Tarefa na `S1612`.

### V-4 · ADMINVISAO-4 · o diretório identifica por CPF, e por documento estrangeiro

Na íntegra: *"sim, identificação via CPF ou documento estrangeiro."*

O diretório de contas **mostra CPF**; quem não tem CPF é identificado pelo documento estrangeiro. A
**RN-540 muda nesta metade**: "CPF não aparece no painel master sem decisão própria" passa a ter a
decisão própria, e ela é sim.

**Default do maestro, registrado e vetável — o mecanismo.** A frase do dono responde *se* o CPF
aparece, não *por onde*. Das três saídas do item, fica a do meio: **leitura por callable auditado,
com registro de cada consulta**, no molde do `getBankDetailsForPayout`. A Rule de `pessoas`
(`firestore.rules:2688`) **continua fechada**, que é a escolha mais conservadora do arquivo e a que
não transforma a coleção de CPF do sistema inteiro em leitura de painel. Abrir a Rule seria a saída
barata de construir e cara de defender, e trocar depois é a mesma decisão com uma tela já construída
em cima. Veto do dono muda isso a qualquer momento; o custo da troca é de servidor, não de tela.

O resto da RN-540 fica de pé sem emenda: sem export, sem CSV, sem download, e a negativa registrada
junto do acesso. Tarefas `S1615-T1` e `S1615-T5`.

### V-5 · ADMINVISAO-5 · atividade é qualquer clique de navegação ou de ação

Na íntegra: *"é qualquer clique em botões, menus, para navegar ou mudar de tela ou ter ações."*

Isto responde a **letra (a)** e ratifica o que já está no ar: a **RN-510** faz o aviso subir na
primeira interação com qualquer acionável, e a leitura estrita de "ação bloqueada" **cai**. A
**RN-549 nasce na forma da resposta** — a régua do gatilho vira texto canônico com a definição do
dono, sem reescrever P11 nem P14 e sem derrubar a medição de 08/08. Tarefa `S1616-T4`.

A **letra (b)** — como a tela descobre que foi liberada sem recarregar — não é tocada por esta frase,
e por isso **segue o default proposto em 10/08, que já estava em vigor**: a **RN-550**, com o painel
assinando o doc próprio da pessoa, a vitrine caindo sozinha pela mesma saída por sessão do resgate e
o aviso ganhando a linha da segunda espera. Default em vigor não retém tarefa, então `S1616-T2` e
`S1616-T3` **destravam**; se o dono vetar depois, o custo continua sendo o que a RN-550 dimensionou —
um listener, um nome na allowlist e uma linha de copy.

### O que destrava, e o que continua esperando

| Onda | Esperava | Estado agora |
|---|---|---|
| **2 · a economia do tenant** | onda 1 · REDESIGN-DS · **V-1** | **destravada** — a onda 1 está paga e o redesign entrou na main em 11/08 |
| **3 · produção e pessoas** | onda 1 · onda 2 · REDESIGN-DS · **V-2** e **V-3** | **destravada pelos vetos**; a ordem interna continua: a SubNav nasce na onda 2 |
| **5 · o diretório de contas** | onda 1 · REDESIGN-DS · **V-4**, **V-5** e a leitura do **LGPD-1** para a metade de PII | **destravada pelos vetos**; a metade de PII continua olhando o **LGPD-1**, que segue aberto no painel |
| 1 e 4 | — | pagas: a onda 1 fechou em 10/08 e a onda 4 fechou em 11/08 (S1614) |

**Duas coisas que esta leva não respondeu, e continuam no painel.** O **ADMIN-USUARIOS-2** (recusar e
revogar) segue aberto, então a `S1616-T5` continua retida. O **LGPD-1** segue aberto, e agora ele
carrega uma frente a mais: com o V-2 e o V-4 decididos como foram, a superfície de PII do painel
master é maior do que era quando o item foi escrito.

---

## Delta a fila ganha recusa e revogação (leva 8 do dono · 2026-08-12)

Fecha o **ADMIN-USUARIOS-2**, que estava no painel desde 10/08 como a pergunta que a decisão de
09/08 não alcançava: o que se faz com um cadastro que não se quer aprovar, e o que acontece se
quiser desfazer um acesso já concedido. Registro completo em
`02-rodadas/2026-08-12-decisoes-dono/01-decisoes-dono.md` §8.

Na íntegra: *"admin usuários - aprovar cadastro, reusar e revogar devem existir já"*

### A leitura, declarada porque tem uma correção dentro

**"Reusar" é lido como recusar.** É a leitura que o item pedia, é a única das duas que faz
sentido ao lado de "aprovar" e "revogar", e ela fica escrita aqui como leitura e não como fato.
**Se o dono corrigir, reabre barato** — nada foi construído em cima.

Com essa leitura, ele decidiu **além** dos dois defaults propostos. O default da recusa era
"fila sem recusa por ora"; o default da revogação era "não nasce nesta fase". Os dois caem.

### RN-552 nasce na forma da resposta

A RN-552 foi consumida em 10/08 como **condicionada ao ADMIN-USUARIOS-2**, com o número
reservado para não virar buraco (mesmo desenho da RN-546). Ele respondeu, e ela nasce agora.

**As três operações existem: aprovar, recusar e revogar.** Aprovar já estava especificado pelas
RN-547 a RN-551 e não muda uma linha. As duas novas herdam as invariantes que a própria RN-552
já tinha cravado antes da resposta, e elas continuam valendo exatamente como estavam escritas:

- **Mesmo rastro da aprovação.** Recusa e revogação registram quem, quando, sobre quem e por
  qual porta, no livro `auditoriaAcessos` que a Onda 1 abriu — é a RN-551, sem exceção nova.
- **Revogação nunca apaga dado.** No máximo **suspende o tenant** pelo `transitionTenant`, que é
  o lifecycle que já existe. Das duas opções que o item oferecia, é a única compatível com essa
  invariante.

**Defaults do maestro nas sub-decisões que a fala não alcança, todos vetáveis.** A **recusa nasce
com estado próprio e sem comunicação automática à pessoa**: a opção de avisar existia no item e é
a mais honesta, mas ela decide copy, tom e canal, e inventar os três sem caso real é o tipo de
coisa que depois ninguém desfaz sem parecer grosseria. Uma linha dele acrescenta o aviso. E a
**revogação de organizador com vendas vivas não nasce nesta fase**: a cascata dela toca dinheiro
de terceiro, e isso não sai por default de esteira.

### O que destrava

A **`S1616-T5`** sai da retenção e entra na fila de build, com card próprio em
`02-rodadas/2026-08-12-decisoes-dono/04-fila-cards.md` §Card 2. A tela da fila (S1615) continua
na onda 5 da ADMIN-VISAO, e nascer com o gesto de recusa agora é o que evita o remendo quando a
fila tiver volume.

### O que continua preso no dono, neste épico

Só o **LGPD-1** — e ele fechou na leva 7 de 11/08. A frase que o retinha (*"o aceite é
obrigatório, e registrado no banco"*) já está registrada, então a metade de PII da onda 5
**não olha mais para um item aberto do painel**. Deste épico, nada mais depende dele.

### Painel, na mesma aterrissagem

**ADMIN-USUARIOS-2 saiu** do [[DECISOES-ABERTAS]], e nenhum item entrou no lugar.

## Direção registrada · o slug da página do produtor passa a ser editável (leva 10 do dono · 2026-08-12)

**Decisão direcional, sem build agora.** Na íntegra: *"Outro ponto importante, é deixarmos o
usuários editarem a página deles, quanto ao nome de slug, caso o slug esteja disponivel, Isso
vale para eventos, clubs e para a propria página também. Registre essa decisão para seguirmos
depois."* Registro único, com as perguntas abertas inteiras, em
`02-rodadas/2026-08-12-decisoes-dono/01-decisoes-dono.md` §Leva 10. **Não consome número de RN**
— o mecanismo não está decidido, e a regra escrita antes dele cravaria o que a spec futura ainda
precisa responder.

### Esta decisão supersede a premissa da ponte, e o card renomear-depois ganha dono

É a parte que mais muda de estado, e por isso ela fica escrita aqui e não só no registro da
rodada. Em 11/08, ao fechar o **PONTE-NOME-1**, o painel registrou a razão do conserto na origem
com estas palavras: *"o conserto na origem, porque **depois do código não existe renomear**"*. A
frase era medição verdadeira do produto — a PONTE-REV mediu em 08/08 que as Rules só deixam
**criar** `profissionais/{uid}`, que `tenants` é `create, update: if isPlatformAdmin()` e que não
existe callable que renomeie —, e ela virou premissa de desenho.

**A decisão do dono derruba a premissa.** O "depois" passa a existir por ordem dele. O conserto na
origem **não é revogado**: perguntar o nome da produtora na porta continua certo e continua sendo
o caminho barato. O que muda é que ele deixa de ser o **único** caminho, e o card **renomear
DEPOIS**, que estava separado e sem dono desde 11/08 (registrado na S1234-T5 do [[V1-KANBAN]]),
**ganha dono**: é esta decisão. A premissa fica **marcada, não apagada** — é ela que explica por
que a porta pergunta o nome, e apagá-la faria alguém desfazer o conserto da origem achando que o
renome o dispensa. Ele não dispensa: renomear é caro e a origem certa continua sendo de graça.

### O que este épico obriga a spec futura a responder

O fato duro é o mesmo dos outros dois, e aqui ele é o mais amarrado: **`tenantId == slug ==
docId`**. Trocar o slug do produtor é migração de tenant, e tenant é a fronteira de isolamento de
todo o resto — evento, venda, dinheiro e papel. Três consequências próprias deste épico:

- **O slug viaja em link que já saiu de casa.** A URL do convite de assessoria carrega
  `?tenantId=`, e ela vai por e-mail a terceiro. Convite emitido antes do renome precisa de
  destino declarado.
- **O `/@handle` público é outro registro** (`perfis/{handle}`, com o handle digitado pela
  pessoa), e não se confunde com o slug do tenant. A spec precisa dizer se a fala do dono cobre
  os dois ou só o slug — a leitura da esteira é que *"a propria página também"* fala do endereço
  público do produtor, e onde essa leitura toca o `perfis/{handle}` ela precisa ser confirmada, não
  presumida.
- **Escrita hoje é privilégio de admin de plataforma.** Qualquer caminho de renome pelo usuário
  abre escrita onde hoje só o super-admin escreve, e isso é decisão de superfície de segurança,
  não detalhe de implementação.

**Onde entra na fila:** card do backlog, ancorado nos três épicos por superfície.
