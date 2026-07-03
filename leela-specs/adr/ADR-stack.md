# ADRs · Decisões de arquitetura · Leela

> Formato: contexto → decisão → status → consequência. Consolida as decisões que destravam os specs. Complementa `be-hero-documentacao/be-hero-docs/arquitetura.md` (que trazia estas como pendentes).

---

## ADR-004 · Framework web = Vite (painel) + Next.js (landing)

**Contexto:** o painel do produtor/super-admin fica **atrás de login** (sem necessidade de SEO); a **landing pública** (evento/clube) precisa de SSR para SEO. O time (sócio) trabalha com **Vite + React**.
**Decisão:** **`apps/painel` = Vite + React (SPA)** com **React Router**; **`apps/landing` = Next.js (App Router, SSR/ISR)** — ou Astro + React islands, a confirmar no início do E12.
**Status:** ✅ Decidido (revisado 2026-07 conforme a stack do time; substitui a decisão anterior de Next.js em tudo).
**Consequência:** Vite dá build rápido e DX simples para o admin; Next.js cobre o SEO das páginas públicas. Ambos React/TS, compartilhando `packages/core` e `packages/design-system`. Firebase client SDK no browser; Admin SDK em Functions. Sem Server Components no painel (é SPA) — estado de servidor via TanStack Query (ADR-010).

---

## ADR-005 · Banco = Firestore (Firebase)

**Contexto:** o domínio tem 4 relações N:N (Profissional↔Clube parceiro, Desafio↔CatalogoAcao, Kit↔ItemKit, ProgramaAfiliacao←Parceria) e 5 grupos de agregados computados (status de membro, pontos/progresso de desafio, conversões+valor a receber de parceria, alcance+aberturas de comunicado, tamanho de segmento).
**Decisão:** **Firestore** como banco primário, aceitando o trade-off NoSQL em troca de velocidade e integração nativa Firebase.
**Status:** ✅ Decidido (rodada 2026-07). Prioriza velocidade de MVP.
**Consequência / estratégia obrigatória (ver `modelo-de-dados-firestore.md`):**
- **N:N** → subcoleção de junção OU array de referências, escolhido caso a caso (documentado por entidade).
- **Agregados** → mantidos por **Cloud Functions** (padrão fan-out / distributed counters); nunca calculados por varredura no cliente.
- **Desnormalização deliberada** para leitura barata (ex.: nome do clube embutido em Membro).
- **Security Rules** por coleção como parte da task que a cria.
- **Custo:** vigiar leituras em telas de lista densa (paginação obrigatória, ex.: 453 inscritos).
- *Porta de saída:* se agregados/relatórios ficarem caros, mover analytics para BigQuery (export do Firestore) sem trocar o banco transacional.

---

## ADR-006 · Gateway de pagamento = camada plugável (`PaymentProvider`)

**Contexto:** ticketing exige Pix + cartão parcelado + **split automático** para repasse de afiliação (clube/promotor). O fornecedor concreto (Pagar.me / Asaas / Stripe Connect) ainda não foi escolhido.
**Decisão:** especificar uma **interface `PaymentProvider`** em `packages/core` (métodos: `createCharge`, `splitRules`, `refund`, `handleWebhook`, `getPayout`) e programar contra ela. O gateway concreto entra como implementação num `functions/` adapter, decidido em ADR futuro sem tocar o domínio.
**Status:** ⏸️ Decisão do fornecedor adiada; interface decidida.
**Consequência:** épicos E04 (vendas) e E12 (checkout) dependem da **interface**, não do fornecedor. Um mock/sandbox provider permite construir e testar o fluxo ponta a ponta antes da escolha. Critério decisivo do fornecedor: qualidade do **split** (recebedores múltiplos) + Pix nativo.

---

## ADR-007 · Monorepo = Turborepo

**Contexto:** três superfícies (painel, landing, mobile) compartilham domínio (`core`) e design system.
**Decisão:** **monorepo com Turborepo** (apps/ + packages/ + functions/).
**Status:** ✅ Decidido (proposto; validar no E00).
**Consequência:** compartilhamento de `core`, `design-system` e `api-client` entre web e mobile; pipeline de build com cache; um único fluxo de CI. Custo: setup inicial no E00.

---

## ADR-008 · Auth = Firebase Auth

**Contexto:** login de atletas e profissionais; App Store exige login social (Apple + Google); papéis (atleta/coordenador/organizador/admin).
**Decisão:** **Firebase Auth** (email/senha + Google + Apple), papéis via custom claims.
**Status:** ✅ Decidido (natural com Firebase).
**Consequência:** claims dirigem Security Rules e autorização de UI; sessão multi-device nativa.

---

## ADR-010 · UI, formulários e dados (stack do time)

**Contexto:** padronizar UI, formulários e acesso a dados com o que o sócio/time domina.
**Decisão:**
- **UI:** **Tailwind CSS + shadcn/ui** (Radix). O Design System v3 (tema **brasa**) é codificado em `tailwind.config.ts` + tema do shadcn; componentes shadcn são customizados para os padrões §2.x (Table densa §2.5, ConfirmModal §2.15, SubNav §2.14, flat §2.16). Moram em `packages/design-system`.
- **Formulários + validação:** **React Hook Form + Zod** (`zodResolver`). Schemas Zod em `packages/core`, reusados no client, nas Functions e como validação de escrita.
- **Estado de servidor:** **TanStack Query** sobre o Firebase SDK (cache, revalidação, listeners Firestore).
- **Complementos:** **Zustand** (estado de UI leve, opcional) · **Recharts** (gráficos) · **Lucide** (ícones) · **date-fns** (datas).
**Status:** ✅ Decidido (2026-07).
**Consequência:** Zod vira a fonte única de schema. shadcn dá componentes acessíveis (Radix) que adaptamos ao DS. TanStack Query evita boilerplate de fetch/cache com Firestore.

---

## Pendências ainda abertas (não bloqueiam Onda 0/1)

| Item | Quando decidir |
|---|---|
| Fornecedor de pagamento (ADR-006 concreto) | Antes da Onda 2 (vendas/checkout) |
| Fornecedor de email transacional (SendGrid/Resend/Firebase Ext.) | Antes de comunicados por email |
| WhatsApp Business API (V2) | Pós-MVP |

---

*Fim dos ADRs.*
