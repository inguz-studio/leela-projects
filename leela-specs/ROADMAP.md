# Leela · Roadmap & Specs para execução por IA (Fable 5)

> Documento-espinha. Consolida e eleva a documentação existente (PRD, USM-01, JIRA-01/02/03, SPECs, modelo de dados, DoD, testes) para um plano executável por agente de código.
> Produto: **Leela** (antes referido como "Be Hero"; nome unificado para Leela).
> Data base: 2026-07-01 · Autor do plano: assistente + Vitor Piagge.

---

## 0 · Como usar este roadmap

- **ROADMAP.md** (este): visão, stack, horizontes, mapa de épicos, dependências e ondas de execução.
- **00-TEMPLATE-spec.md**: o formato canônico de spec (otimizado para Fable 5). Todo épico e task segue este molde.
- **epics/LEELA-E##-*.md**: um arquivo por épico, com user stories (Given/When/Then) e tasks AI-ready.
- **adr/**: decisões de arquitetura (ADR-004 framework, ADR-005 banco, ADR-006 pagamento, etc.).

Ordem de leitura para o Fable 5: `ROADMAP.md` → `00-TEMPLATE-spec.md` → `adr/` → `epics/` na ordem das ondas.

---

## 1 · Produto e superfícies

Leela é um produto único que materializa um ecossistema fitness/wellness *community-first*, servido por **três superfícies** sobre um backend e modelo de dados comuns:

| Superfície | Plataforma | Público | Papel |
|---|---|---|---|
| **Painel do Profissional** | Web | Organizador de evento, Coordenador de assessoria | Operar comunidade, eventos, comunicação, monetização |
| **Landing pública** | Web (SSR) | Atleta anônimo | Descobrir evento/clube, inscrever-se, checkout (sem login) |
| **App do Atleta** | Mobile (Expo) | Atleta | Jornada heroica, inscrições, desafios, comunidade |

Diferenciação central: **lock-in emocional (comunidade) + financeiro (afiliação clube↔organizador)**. Nenhuma ticketeira oferece desafios, comunidade e comunicação segmentada integrados.

---

## 2 · Stack decidido (para os specs)

Decisões travadas nesta rodada, somadas ao tooling já contratado:

| Camada | Decisão | Origem |
|---|---|---|
| Web painel (admin) | **Vite + React** (SPA, React Router) | ADR-004 (revisado) |
| Web landing (SEO) | **Next.js** (SSR/ISR) | ADR-004 |
| UI · forms · dados | **Tailwind + shadcn/ui · React Hook Form + Zod · TanStack Query** | ADR-010 |
| Banco de dados | **Firestore** (Firebase) | ADR-005 (decidido nesta rodada) |
| Auth | **Firebase Auth** | natural c/ Firebase |
| Mobile | **React Native via Expo (EAS)** | tooling contratado |
| Backend/infra | **Firebase (Blaze)** + Cloud Functions | tooling contratado |
| Deploy de serviços | **Google Cloud Run** | tooling contratado |
| Monorepo | **Turborepo** (candidato; ADR-007) | a formalizar |
| Pagamento | **Camada plugável `PaymentProvider`** — gateway concreto (Pagar.me / Asaas / Stripe Connect) fica em ADR-006 posterior | decidido nesta rodada |
| Notificações | Push + **WhatsApp Business API** | tooling contratado |
| Observabilidade | **Sentry** | tooling contratado |
| Repositório | **GitHub** | tooling contratado |

**Implicação Firestore (crítica para os specs):** o domínio tem relações N:N (Desafio↔Ação, Kit↔Item) e agregados (conversões, alcance, receita). Em Firestore isso exige: coleções de junção ou arrays de referência, desnormalização deliberada e agregados mantidos por Cloud Functions (fan-out/counters). Cada spec que toca esses pontos declara a estratégia de modelagem. Ver `adr/ADR-005-banco.md` e `modelo-de-dados-firestore.md`.

**Estrutura de monorepo (a validar no E00):**

```
leela/
├── apps/
│   ├── painel/          # Next.js — painel do profissional
│   ├── landing/         # Next.js — páginas públicas (SSR/SEO)
│   └── mobile/          # Expo — app do atleta
├── packages/
│   ├── design-system/   # tokens.json + componentes React (+ RN)
│   ├── core/            # domínio, regras de negócio (RN-xxx), tipos
│   └── api-client/      # SDK Firestore/Functions tipado
├── functions/           # Cloud Functions (agregados, split, webhooks)
└── leela-specs/         # este plano
```

---

## 3 · Horizontes de negócio

| Horizonte | Período | Foco | Épicos-chave |
|---|---|---|---|
| **H1 — Agora** | M0-M12 | Ticketing esportivo + comunidade | E00, E01, E02, E03, E04, E05, E07, E12, início E13 |
| **H2 — Médio** | 12-24m | Marketplace de experiências wellness | E06, E09, E13 (comunidade/jornada), E10 |
| **H3 — Longo** | 24-36m | SaaS organizadores + mídia local | E08, E11, camada SaaS |
| **Visão — H4** | 36-60m | Capital digital do bem-estar no Brasil | expansão, arrecadação municipal |

---

## 4 · Mapa de épicos

IDs renomeados para o prefixo `LEELA-` (produto unificado). Coluna "De-para" preserva rastreabilidade com o backlog existente `BH-`.

| ID | Épico | Superfície | MoSCoW (H1) | Estimativa | Status atual | Depende de | De-para |
|---|---|---|---|---|---|---|---|
| **LEELA-E00** | Fundação Técnica (monorepo, Next.js, Firebase, Auth, CI/CD) | Todas | Must | XL | 🆕 novo (código) | — | (novo) |
| **LEELA-E01** | Design System & Shell como código (tokens.json + componentes) | Todas | Must | XL | 🔄 DS visual pronto; código a fazer | E00 | BH-E01 |
| **LEELA-E02** | Visão Geral do Profissional | Painel | Should | M | 📋 protótipo pronto | E01 | BH-E02 |
| **LEELA-E03** | Operação do Evento | Painel | Must | XL | 🔄 protótipo parcial | E01, E05(dados) | BH-E03 |
| **LEELA-E04** | Configuração e Vendas do Evento | Painel | Must | XL | 📋 especificado | E03, E12, PaymentProvider | BH-E04 |
| **LEELA-E05** | Módulo Clubs | Painel | Must | XL | 🔄 protótipo 11 telas | E01 | BH-E05 |
| **LEELA-E06** | Marketing Unificado | Painel | Should | XL | 📋 backlog | E03, E04 | BH-E06 |
| **LEELA-E07** | Estados de Sistema (404/403/500/offline/manutenção) | Todas | Should | L | 📋 especificado | E01 | BH-E07 |
| **LEELA-E08** | Painel do Influenciador | Painel | Could | XL | 🧊 icebox | E04 | BH-E08 |
| **LEELA-E09** | Financeiro do Profissional | Painel | Should | L | 🧊 icebox | E03, E04 | BH-E09 |
| **LEELA-E10** | Marcas do Profissional | Painel | Could | M | 🧊 icebox | E01 | BH-E10 |
| **LEELA-E11** | Analytics do Profissional | Painel | Could | L | 🧊 icebox | E03, E05 | BH-E11 |
| **LEELA-E12** | Landing Pública (evento/clube, inscrição, checkout, SEO) | Landing | Must | XL | 🔄 conteúdo em PaginaVendas | E01, E04, PaymentProvider | (novo) |
| **LEELA-E13** | App do Atleta (onboarding, descoberta, inscrição, desafios, comunidade) | Mobile | Must (H1/H2) | XL | 📋 documento próprio | E00, E01, E05 | (novo) |
| **LEELA-E14** | Integrações de treino (`TrainingProvider`: Health/Strava/agregador) | Todas | Should (H2) | L | 🆕 proposto (ver `discovery/ANALISE-ROADMAP-v2.md`) | E00, E01, E13 | (novo) |
| **LEELA-E15** | Creator Studio (desafios/programas + ebooks + materiais · SaaS estilo MyDose) | Painel | Could (H2/H3) | XL | 🧊 futuro | E05, E04 | (novo) |
| **LEELA-E16** | Plataforma & Super-Admin (marketplace multi-tenant) | Painel (back-office) | Must (fundacional) | L | 🆕 spec em produção | E00, E01, E04 | (novo) |

> Multi-tenancy é fundacional (ADR-009 · `adr/ADR-multitenancy.md`) — o E00 nasce multi-tenant. A fatia de execução (o que fazer primeiro) está em `V1-PRODUTOR-web.md`.

Capacidades transversais (referenciadas pelos épicos, não são épicos isolados): **PaymentProvider** (split de afiliação), **Notificações** (push/WhatsApp), **Observabilidade** (Sentry), **Acessibilidade** (WCAG AA), **Copy/i18n** (glossário + tom de voz).

---

## 5 · Ondas de execução (sequenciamento por dependência)

> Regra de granularidade herdada de §2.11/§2.13: **1 task ≈ 1 tela/componente/Function = 1 PR**. Cada task é um spec autocontido (ver template).

**Onda 0 · Fundação (bloqueia tudo)**
- LEELA-E00 — monorepo Turborepo, apps Next.js (painel+landing), Expo, projeto Firebase (Firestore + Auth + Functions), CI/CD GitHub Actions, Sentry, convenções de código.
- LEELA-E01 — tokens.json (Design System v3 como código), componentes React base (Button, Card, Badge, Input, Table densa, SubNav, Modal/ConfirmModal, Toast, Sidebar, Breadcrumb), shell de layout.

**Onda 1 · Núcleo do Painel (H1)**
- LEELA-E05 Clubs · LEELA-E03 Operação do Evento · LEELA-E02 Visão Geral.
- Entram juntos porque compartilham shell + entidades base (Evento, Clube, Inscrição, Membro).

**Onda 2 · Vendas ponta a ponta (H1)**
- LEELA-E04 Config & Vendas · LEELA-E12 Landing (inscrição + checkout) · PaymentProvider (interface + 1 provider concreto via ADR-006).
- Fecha o ciclo "atleta descobre → inscreve → paga → organizador vê receita".

**Onda 3 · Robustez e alavancas (H1→H2)**
- LEELA-E07 Estados de Sistema · LEELA-E06 Marketing Unificado · LEELA-E09 Financeiro do Profissional.

**Onda 4 · App do Atleta (H1→H2)**
- LEELA-E13 — reusa `packages/core` + `design-system`; jornada, inscrições, desafios, comunidade.

**Onda 5 · Expansão (H2+)**
- LEELA-E08 Influenciador · LEELA-E10 Marcas · LEELA-E11 Analytics.

Grafo textual de dependências:

```
E00 ──► E01 ──► E05 ─┐
                     ├─► E03 ──► E04 ──► E06
                     │            └─► E12 ──► (checkout)
                     ├─► E02       └─► E09
                     ├─► E07
                     └─► E13 (após E00+E01+E05)
E04 ──► E08 · E01 ──► E10 · (E03+E05) ──► E11
```

---

## 6 · Requisitos funcionais → épicos (do PRD)

Rastreabilidade PRD → épico (resumo; detalhe nos arquivos `epics/`):

- RF-01…11 (Clubs) → **E05**
- RF-20…27 (Operação do Evento) → **E03**
- RF-30…33 (Vendas/Config) → **E04**; RF-40…43 (Marketing) → **E06**
- RF-50…54 (Estados) → **E07**
- Landing/checkout público → **E12**; App do atleta → **E13**

---

## 7 · Convenções de ID e status

| Prefixo | Significado |
|---|---|
| `LEELA-E##` | Épico |
| `LEELA-S###` | User Story (mapeia BH-###) |
| `LEELA-S###-T#` | Task técnica AI-ready (1 PR) |
| `RN-###` | Regra de negócio (reaproveitadas do backlog) |
| `ADR-###` | Decisão de arquitetura |

Status: ✅ Done · 🔄 In Progress · 📋 Backlog · 🧊 Icebox · 🚫 Blocked.
Estimativa T-shirt: XS < 0.5d · S 0.5-1d · M 1-2d · L 2-4d · XL módulo.
MoSCoW por horizonte: Must bloqueia a fase · Should agrega valor · Could nice-to-have · Won't fora de escopo.

---

## 8 · Qualidade transversal (aplica a toda task)

- **Definition of Done:** ver `definition-of-done.md` (consolidado). Toda task só fecha com DoD satisfeito.
- **Testes:** ver `estrategia-testes.md`. Pirâmide: unit (domínio/`core`), integração (Firestore rules + Functions), e2e (fluxos críticos Playwright/Detox).
- **Regras §2.x → componentes:** §2.1/2.2/2.14 (layout), §2.5 (Table densa), §2.7 (Tabs no DOM), §2.12 (interativo por padrão), §2.15 (ConfirmModal com preview), §2.16 (flat, sem borda decorativa).
- **Governança de design:** componentes vivem em `packages/design-system`, consumidos pelas 3 superfícies; nenhuma tela redefine token ou componente localmente. Ver `epics/LEELA-E01-design-system.md`.
- **LGPD:** ações irreversíveis com disclaimer; export de dados de membro por 90 dias após deleção (RN-144).

---

## 9 · Estado desta entrega

- ✅ Espinha: este ROADMAP + `00-TEMPLATE-spec.md`.
- 🔄 Em produção (nesta sessão): ADRs, `modelo-de-dados-firestore.md`, DoD/testes consolidados, e specs por épico começando pela Onda 0 e Onda 1.
- As superfícies Landing (E12) e App (E13) entram com spec completo ao chegar nas suas ondas; por ora ficam mapeadas com escopo e stories-âncora.

---

*Documento vivo. Atualizar mapa de épicos e ondas conforme execução avança.*
