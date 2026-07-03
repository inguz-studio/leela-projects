---
tags: [leela, adr, arquitetura, multitenancy, marketplace]
---

# ADR-009 · Multi-tenant marketplace (ticketeira)

**Contexto.** Leela não é um único produtor — é uma **ticketeira/marketplace multi-tenant**. Muitos promotores/produtores operam na plataforma, cada um com base de leads, eventos, tickets, comunidade e central de negócio **isolados**, no próprio painel admin. Cada tenant tem **termos comerciais próprios** (taxa da plataforma, parcelamento, antecipação, mensalidade cobrada na comunidade dele, e a mensalidade SaaS que o Leela cobra dele — pode ser 0). Acima de todos, um **super-admin da plataforma** (o dono do Leela) configura termos e tem a visão macro.

**Decisão.** Multi-tenancy de primeira classe, decidido no E00, com:
- **Tenant = conta do produtor/promotor.** Coleção `tenants/{tenantId}`.
- **Isolamento por `tenantId`** em todo agregado de negócio (eventos, clubes, inscritos, financeiro, comunicados, parcerias). Regra: dado de um tenant **nunca** é legível por outro.
- **Identidade do atleta é global** (`atletas/{uid}` cross-tenant) — o mesmo atleta compra de vários produtores; a inscrição é que é scoped por tenant.
- **Auth/claims:** `role` ∈ {`platform_admin`, `tenant_owner`, `tenant_staff`, `promoter`, `athlete`} + `tenantId` (quando aplicável) em custom claims. Security Rules autorizam por claim.
- **Super-admin** (`platform_admin`) tem acesso cross-tenant (leitura macro + configuração de termos); nenhum outro papel cruza a fronteira do tenant.

**Status.** ✅ Decidido (fundacional). Entra no E00.

**Consequência.**
- Toda query e toda Security Rule filtram por `tenantId`. Custo de disciplina, mas barato se feito desde o início.
- **Retrofit é proibitivo** (risco de vazamento entre promotores) — por isso a decisão vem antes de qualquer código de domínio.
- Onboarding de tenant, configuração de termos e visão macro viram um épico próprio: **[[LEELA-E16-plataforma-superadmin]]**.
- Índices compostos no Firestore por `tenantId` + campos de filtro.

## Estratégia de partição (Firestore)
- **Tenant-scoped** (carregam `tenantId` e/ou vivem sob o tenant): `eventos`, `clubes`, `inscritos`, `comunicados`, `parcerias`, `programaAfiliacao`, `pagamentos`, `equipe`, `promotores`, `subscriptions`.
- **Global:** `atletas`, `catalogoAcoes`, `config/system`.
- **Plataforma:** `tenants/{tenantId}` (perfil + status), `tenants/{tenantId}/commercialTerms`, e agregados macro em `platform/…` (só `platform_admin` escreve, via Function).

## Termos comerciais por tenant (`tenants/{id}/commercialTerms`)
`platformFeePct` (taxa Leela sobre ticket) · `installmentRules` (parcelamento permitido/juros) · `anticipation` (antecipação de recebíveis: disponível? custo?) · `communityMonthlyEnabled` (o tenant pode cobrar mensalidade na comunidade dele) · `saasMonthlyFee` (mensalidade que o Leela cobra do tenant; **pode ser 0**). Escrita **só** pelo `platform_admin`.

## Cobrança recorrente (mensalidades)
Duas recorrências distintas, ambas exigem `PaymentProvider` com suporte a assinatura:
1. **Mensalidade da comunidade** (tenant → seus membros) — assinatura de clube pago (destrava o antigo "clube pago em breve", RN-104).
2. **Mensalidade SaaS** (Leela → tenant) — cobrança da plataforma sobre o produtor, conforme `saasMonthlyFee`.

Ambas atrás da mesma interface de pagamento; o gateway concreto (ADR-006) precisa suportar recorrência + split.

---
Relacionado: [[ADR-stack]] · [[modelo-de-dados-firestore]] · [[LEELA-E16-plataforma-superadmin]] · [[LEELA-E00-fundacao-tecnica]]
