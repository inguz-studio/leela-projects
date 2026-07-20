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

> **⚠ Reordenação ratificada (Vitor, 2026-07-18 — adendo 3 da rodada `2026-07-18-ux-review`):** *"adiante o H3 para antes do H2, para finalizarmos por projeto, exceto o creator-studio, que vai entrar depois."* A tabela acima descreve o **valor de negócio** de cada horizonte, não mais a ordem de execução. A ordem vigente é: **terminar o produto web inteiro (H3: E08 · E10 · E11 · E19) antes de abrir a frente do app heroico (H2: E13 completo · E17 social · E14)**, com o **E15 Creator Studio por último**. O sequenciamento executável está em §5.

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
| **LEELA-E17** | Perfil social / link-in-bio (Feed·Eventos·Clubs, tema por-usuário, capas) | Landing + Mobile | Should/Could (H2) | XL | 🆕 planejado 2026-07-12 | E01, E12, E05, E13 | (novo) |
| **LEELA-E18** | Assessorias parceiras (tração B2B — clubes parceiros com desconto) | Painel + Landing | Should (H1→H2) | L | ✅ entregue (Onda 3 · L3) | E05, E04, E16, E00, E12 | reusa E08/E05-S107 |
| **LEELA-E19** | CRM do organizador + hub de Comunicação (clientes cross-evento, LTV, disparo a segmentos) | Painel (menu principal) | Could (H3, antecipado) | XL | 🔄 backend + hub entregues; falta o disparo a segmentos | E00, E01, E11 (demografia), identidade transacional | (novo · adendo 2 de 2026-07-18) |

> **📐 Terminologia (2026-07-12):** a hierarquia canônica é **Onda → Épico → User Story → Task** (cada nível ancorado a JTBD+persona). "Wave A-D"/"Frente F1-F4" da trilha `next-trail` = **lotes de execução** (agenda de sprint), NÃO um eixo de release — de-para completo em `MODELO-ROADMAP.md`. "Wave C" = Onda 2.

> Multi-tenancy é fundacional (ADR-009 · `adr/ADR-multitenancy.md`) — o E00 nasce multi-tenant. A fatia de execução (o que fazer primeiro) está em `V1-PRODUTOR-web.md`.

> **Delta ratificado 2026-07-10 (trilha next-trail, D1-D7 — detalhe em `leela-specs/99-arquivo/next-trail/` + `V1-CHECKLIST.md §Trilha next-trail`):** **E03** recebe a trilha **Fable A-G** — o kernel `pedidos/{id}` é implementado **UMA vez na Frente A conforme ADR-011** (gate adr-conformance; deps duras `FABLE-A → S203-T3` e `FABLE-A → E12-L4/S1203-T5`) — D1. **RESP-MOBILE** (passe mobile real 390×844 sobre E01/shell) = **Must V1**, antes/em paralelo à Onda 2 — D5. Recortes confirmados na Onda 2: **E06 campanhas = V1** (D3) · E09-slim · E07-web; **E08 adiado (Won't V1)**. Gateway concreto = **Asaas** (D2; KYC = ação externa, sandbox não bloqueia).

Capacidades transversais (referenciadas pelos épicos, não são épicos isolados): **PaymentProvider** (split de afiliação), **Notificações** (push/WhatsApp), **Observabilidade** (Sentry), **Acessibilidade** (WCAG AA), **Copy/i18n** (glossário + tom de voz).

---

## 5 · Ondas de execução (sequenciamento por dependência)

> Regra de granularidade herdada de §2.11/§2.13: **1 task ≈ 1 tela/componente/Function = 1 PR**. Cada task é um spec autocontido (ver template).
>
> **Estado em 2026-07-19:** Ondas 0 a 3 estão **entregues** (histórico e prova em `00-boards/BOARD-HISTORICO.md` e nos `outputs/leela-build-2d6ee98d/*-REPORT.md`). Ficam registradas abaixo como lastro de dependência. A onda **em execução** é a 4. Ondas 0-3 não voltam a ser fonte de despacho.
>
> **Rota de modelo (Regra L, Vitor 2026-07-19):** o teto é **opus**. Toda ocorrência de "ROTA FABLE" nos blocos históricos abaixo lê-se **opus effort xhigh**. Sonnet segue proibido no Leela. Classe mecânica com gate determinístico roteia **haiku**. Estourou opus no effort máximo ⇒ escala para o humano.

**Onda 0 · Fundação (bloqueia tudo) — ✅ entregue**
- LEELA-E00 — monorepo Turborepo, apps Next.js (painel+landing), Expo, projeto Firebase (Firestore + Auth + Functions), CI/CD GitHub Actions, Sentry, convenções de código.
- LEELA-E01 — tokens.json (Design System v3 como código), componentes React base (Button, Card, Badge, Input, Table densa, SubNav, Modal/ConfirmModal, Toast, Sidebar, Breadcrumb), shell de layout.

**Onda 1 · Núcleo do Painel (H1) — ✅ entregue**
- LEELA-E05 Clubs · LEELA-E03 Operação do Evento · LEELA-E02 Visão Geral.
- Entram juntos porque compartilham shell + entidades base (Evento, Clube, Inscrição, Membro).

**Onda 2 · Vender ponta a ponta + features que fecham o ciclo do evento (H1) — ✅ entregue** *(reconciliada 2026-07-10 — D4; definição canônica = `V1-CHECKLIST.md §Onda 2 · Vender`)*
- **Núcleo de venda (o antigo sentido estreito):** LEELA-E04-slim (S300 vendas/lotes/cupons + S304 equipe + PaymentProvider) · LEELA-E12 Landing (inscrição + checkout público sandbox) · LEELA-E09-slim (repasses do organizador).
- **Superfície nova (abas que faltam na sub-nav do evento, ordem E04 → E06):** Página de vendas (E04-L3) · Configurações (E04-L5) · Comunicação (E06-L3, campanhas = V1 por D3). **E08 (Promotores) fora — adiado** (dependia de afiliação, cortada).
- **Robustez + coleta:** LEELA-E07-web (404/500/403) · transversais (rollup diário E11-S821, V1 + backend do desafio S1307/S1308, V1.5).
- Fecha o ciclo "atleta descobre → inscreve → paga → organizador vê receita".

**Onda 3 · Robustez + discovery + assessorias (H1→H2) — ✅ lotes 1-4 entregues; lote 5 RE-ESPECIFICADO** *(plano original em `leela-specs/99-arquivo/next-trail-onda3/` — 2026-07-17; 5 lotes, 22 stories, 48 tasks)*

> **O lote 5 (E13-slim em Expo nativo) não é mais fonte de despacho.** A decisão "app v1 = PWA" (2026-07-18) mudou a arquitetura; as 9 stories foram reavaliadas na rodada `2026-07-19-espec-sweep/` e o recorte vive agora na **Onda 5** deste documento.

Trilha própria (padrão next-trail): `ROADMAP-onda3` (lotes+grafo) · `STORIES-onda3` (JTBD por story) · `TASKS-onda3` (1-task-1-PR, rota Fable/Opus) · `JTBD-TRACE-onda3` (P6/P7 propostos) · `DECISOES-NECESSARIAS-onda3` (só DN-1 é decisão real; resto = ações externas/premissas). Ordem de despacho: `Lote 1` ∥ `Lote 2` → `Lote 3` ∥ `Lote 4` → `Lote 5` (por último, gated pelo enrollment das lojas). Sonnet proibido.

```
Lote 1 · Robustez financeira/legal    ROTA FABLE+Opus  · functions/+core + painel/{eventos,financeiro}
   E04-S305 (política) ─► E09-S904 (máquina completa reembolso/transferência)
   E04-S306 (saúde+regulamento RN-149) · E04-S307 (capacidade de lote RN-304, pós-BEPEND) · S1804 (cupom-only)
Lote 2 · Web discovery + link-in-bio  ROTA OPUS+Fable reader · apps/landing + core/reader + painel(perfil)
   E12-S1205 (SEO) · E17-S1702 (capas) ─► E17-S1700 (perfil público @handle) ; DN-1 (editor de perfil no painel)
Lote 3 · Assessorias parceiras        ROTA FABLE+Opus · functions/+core + painel + landing(aceite)
   E18-S1800 ─► S1801 (provisionamento) ─► S1802 (desconto) ─► S1803 (gestão)
Lote 4 · Scheduler de campanhas       ROTA FABLE · functions/ + painel(toggle)
   E06-S402 (automações) ∥ dispatch `agendada` (ADR-015)
Lote 5 · App do atleta E13-slim       ROTA OPUS mobile + Fable · apps/mobile + functions/
   S1300 ─► S1302 ─► S1301 ─► S1304 ─► S1305 ─► S1306 ─► S1310 ─► S1311 ─► S1312 (jornada heroica = Onda 4)
```

- **Robustez** (fatias-slim restantes): E09 (máquina completa reembolso S904/RN-341 + política S305) · E04 (S306 saúde/regulamento RN-149 · S307 capacidade de lote RN-304) · E12 (SEO fino S1205) · E06 (automações S402 + scheduler ADR-015).
- **LEELA-E18 Assessorias parceiras** — organizador cadastra assessorias como clubes parceiros com desconto; reusa E05 (clube+convite+parceria) + E04 (cupom) + E16 (termos) + E00 (Auth). Sem split.
- **LEELA-E17 (fatia link-in-bio público)** — perfil `@handle` SSR/ISR reusando E12; abas Feed·Eventos·Clubs + capas.
- **LEELA-E13-slim** — app do atleta nativo (Expo) recorte: descobrir→checkout→meus ingressos/QR→clube (leitura)→push. Detalhe em `V1-CHECKLIST §Onda 3 · App simples`.

**Onda 4 · Fechar o produto web (H3 antecipado) — ORDEM VIGENTE** *(ratificada 2026-07-18; passo a passo executável em `02-rodadas/2026-07-19-espec-sweep/`)*

Esta é a onda em curso. A decisão de "finalizar por projeto" mandou a expansão web (a antiga Onda 5) para antes do app. A ordem interna abaixo **é** a ordem de despacho — cada item entra quando o anterior aterrissa ou em paralelo onde o território de arquivos não colide.

```
4.0  Caminho do dinheiro em curso (E04 · E09 · E12 · E16)   ← o que já tem spec e está em voo
       S1209 (camada de tela do checkout novo) · tela de refund do E04
       fronteira do reembolso (DECISOES-ABERTAS item 23) · S310/S112/S1212 (formbuilder)
       GATED: S309/S1211/S1903 (estrangeiro — espera liberação Asaas)
4.1  E08 · painel do promotor            ← única lacuna do épico; backend+UI de comissão ✅
4.2  E10 · consolidação de ativações (S812)
4.3  E19 · disparo de comunicação a segmentos (S1901/T4)   ← dep dura: EmailProvider Brevo (RN-137)
4.4  E11 · analytics inteiro             ← maior lacuna; parte do rollup S821
```

**Onda 5 · App do atleta como PWA (E13-slim) + link-in-bio completo**
- **LEELA-E13-slim — app v1 = PWA** (Vitor, 2026-07-18, adendo 4: *"o app v1 pode ser um PWA, não tem problema"*). Isso **substitui** o recorte Expo nativo do lote 5 da trilha `next-trail-onda3`: manifest + service worker + push web + instalação, sobre a landing Next.js já existente, em vez de build EAS e enrollment de loja. As 9 stories do lote 5 (S1300, S1302, S1301, S1304, S1305, S1306, S1310, S1311, S1312) foram reavaliadas uma a uma na rodada `2026-07-19-espec-sweep/` — o que fica, o que muda e o que sai está lá, com a arquitetura proposta como ADR (decisão do Vitor, não da lane).
- Destrava-se o bloqueio de loja que segurava o lote 5.

**Onda 6 · H2 — app heroico e alavancas de comunidade**
- **LEELA-E13 completo** — jornada heroica, desafios, comunidade (reusa `packages/core` + `design-system`).
- **LEELA-E17 (fatia social in-app)** — Feed·Eventos·Clubs no bottom-nav + tematização por-usuário (accent sobre o DS). A fatia link-in-bio pública já entregou na Onda 3.
- **LEELA-E14 TrainingProvider** — Health/Strava/agregador.
- **LEELA-E06 avançado** — segmentação e automação além do que a V1 entregou.

**Onda 7 · LEELA-E15 Creator Studio**
- Por último, por decisão explícita do Vitor (adendo 3): *"exceto o creator-studio, que vai entrar depois"*. Esqueleto (objetivo, fronteiras, dependências) na rodada `2026-07-19-espec-sweep/`; sem quebra em tasks até a onda chegar.

**Trilha next-trail (ratificada 2026-07-10 — D1-D7) · ondas de execução entre a Onda 1 e a Onda 2** *(fonte: `next-trail/ROADMAP-next.md §7`; stories/tasks em `V1-CHECKLIST.md §Trilha next-trail`)*:

```
Wave A · Fable kernel (reset da cota Fable)            ← backend crítico, ROTA FABLE
   FABLE-A (pedido/pagamento, kernel `pedidos` ADR-011)  ── linchpin
        ├─► FABLE-B (estorno)                              (seam gateway ↔ E04-L6)
        ├─► LEELA-S203-T3 (slide-in rico · Onda 1 colhe já)
        └─► [alimenta E12-L4 na Wave C]
   FABLE-C (QR sig) · FABLE-F (cronograma)  ∥ independentes de A (deps: firebase-admin ✅ / S204 ✅)
   FABLE-E→D (kit/estoque) · FABLE-G (logs)  ∥ após A (D cruza [reg]; G ancora no pedido)

Wave B · RESP-MOBILE (Opus, sobre telas estáveis)     ← 1 sweep, independente de dados
   1ª task: reconstituir QA-LIVE-2-REPORT (D7) → M1 (shell/drawer) ─► M3 · M5 · M4 ─► M2 · M6 · M7

Wave C · Onda 2 · vender ponta a ponta                ← Opus (UI) + Fable (Functions/rules)
   E04-slim [L1→L2→L3 ∥ L4→L5 ∥ L6]
   E12 [L0 ∥ L1 → L2 ∥ (core L4) → L3 → L4(cobrança, consome kernel FABLE-A) → L5]
   E09-slim [L1→L2→L3→L4]  ·  E07-web  ·  E06 [L1→L2→L3, consome FABLE-G]
   transversais: S821 (V1) · S1307/S1308 (V1.5)

Wave D · Consolidações (interleave, baixa urgência)   ← CONS-1..6, Should/Could
```

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

Grafo da Onda 4 (o que bloqueia o quê na ordem vigente):

```
[em voo] caminho do dinheiro (E04/E09/E12/E16)
   S1209 camada de tela do checkout ─┐
   tela de refund do E04            ─┤
   formbuilder S310→S112→S1212      ─┴─► fecham o ciclo de venda antes de abrir frente nova
   item 23 (fronteira do reembolso) ── DECISÃO DO VITOR, bloqueia E08 fase 3 (split automático)

E08-S701..S704 (painel do promotor) ── independente: só painel, sobre o kernel R9-E ✅
E10-S812 (ativações)   ◄── S811 ✅ ; lê vínculos de E03 (itensKit) + E05 (parcerias/desafios)
E19-S1901-T4 (disparo) ◄── E19 backend ✅ + E06 executarDisparoCampanha ✅ + **EmailProvider Brevo (RN-137)**
                            └─► destrava também o convite PF do E08 (RN-316)
E11-S821-T1 (rollup)   ─┬─► S821-T2 (dashboard)
                        ├─► S823 (comunidade)
                        └─► S822 (conversão) ◄── precisa de atribuição do E12/E08 no snapshot
```

Delta next-trail (ratificado 2026-07-10):

```
firebase-admin ✅ ─► FABLE-C          S204 ✅ ─► FABLE-F (cronograma/chip)
S203-T1 ✅ ─► FABLE-A ─┬─► FABLE-B ──► (E04-L6 reusa refund seam)
   (ADR-011 ✅ = modelo) ├─► S203-T3 (Onda 1 enrichment)
                       ├─► FABLE-D (tamanhos S209) ◄─ FABLE-E
                       ├─► FABLE-G ─► E06-L3 (aba Comunicação) · S1206-T2 (log envio)
                       └─► E12-L4 / S1203-T5 (Onda 2 escreve `pedidos`)
E01 ─► RESP-M1 ─► {M3,M5,M4,M2,M6,M7}
E04-L1 + E04-L6 ─► E12 ; E04-L4 (papéis) ─► E07w-T6 (403)
S207 ✅ + S1602 ✅ ─► E09-slim
G-004 ─► CONS-1 (KpiCard) ; ledger ─► CONS-5 (org defs)
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

*Documento vivo. Atualizar mapa de épicos e ondas conforme execução avança. Última atualização: 2026-07-19 — §5 consolidado com a ordem ratificada em 18/07 (H3 antes do H2, "finalizar por projeto", app v1 = PWA, E15 por último, E08 antecipado); Ondas 0-3 marcadas como entregues; Onda 4 (fechar o produto web) vira a onda em execução; E19 entra no mapa de épicos; teto de modelo = opus (Regra L). Passo a passo por épico em `02-rodadas/2026-07-19-espec-sweep/`.*
