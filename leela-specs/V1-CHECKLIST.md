# Checklist executável — V1 Produtor (web) + app simples

> **📐 Terminologia (ver [[MODELO-ROADMAP]]):** hierarquia canônica **Onda → Épico → User Story → Task**. As seções "Trilha next-trail" (Wave A-D) mais abaixo são **lotes de execução** (agenda de sprint), não um eixo de release — "Wave C" = a Onda 2. O estado de execução (✅/📋) está preservado tal como registrado; o de-para Wave→Onda vive no doc canônico. **Épicos novos (2026-07-12):** [[LEELA-E17-perfil-social]] (Onda 3/4) e [[LEELA-E18-assessorias-parceiras]] (Onda 3) — specs completas em `epics/`, tasks entram no checklist quando despachadas.

> Como usar: construir na ordem das ondas; cada item é uma task = 1 PR. Marcar `[x]` ao concluir.

> **Multi-tenancy é pré-requisito transversal (ADR-009).** O Leela é uma ticketeira multi-tenant: `S1600` (modelo `tenants` + claims + isolamento por `tenantId` nas Security Rules) vem **antes de qualquer dado de domínio** e por isso mora na Onda 0, junto do E00. Retrofit de isolamento é proibitivo. Toda coleção de domínio (E03/E04/E05) só é segura depois que as Rules de `S1600-T3` estão no lugar.

> **Domínio público.** Todo slug/URL/link master usa `{DOMINIO_LEELA}` (a definir); nunca fixar `be-hero.com.br`/`beh.ro` no código.

---

## Onda 0 · Fundação

Monorepo + Firebase + Auth + CI; Design System (tema `brasa`) + shell; multi-tenancy fundacional. Bloqueia tudo.

### LEELA-E00 · Fundação técnica (completo)

- [x] LEELA-S000-1-T1 — Inicializar monorepo Turborepo + pnpm workspaces
- [x] LEELA-S000-1-T2 — Scaffold `apps/painel` e `apps/landing` (Next.js App Router)
- [x] LEELA-S000-1-T3 — Scaffold `apps/mobile` (Expo)
- [x] LEELA-S000-1-T4 — Pacotes `core`, `design-system`, `api-client` (esqueleto)
- [x] LEELA-S000-2-T1 — Firebase (Firestore + Functions + Auth) + Emulator Suite
- [x] LEELA-S000-2-T2 — Firebase Auth (email/Google/Apple) + custom claims de papel
- [x] LEELA-S000-3-T1 — GitHub Actions (lint/type/test/build) + preview deploy
- [x] LEELA-S000-3-T2 — Sentry (web + mobile) + gestão de env
- [x] LEELA-S000-4-T1 — Documento de convenções de código
- [x] LEELA-S000-4-T2 — Interface `PaymentProvider` + adapter mock/sandbox

### LEELA-E01 · Design System temável & Shell (completo, tema `brasa`)

- [x] LEELA-S001-1-T1 — `tokens.json` (3 tiers) + gerador CSS vars / tema RN
- [x] LEELA-S001-1-T2 — `ThemeProvider` (web + RN) com troca em runtime
- [x] LEELA-S001-2-T1 — Button (variantes/estados/a11y)
- [x] LEELA-S001-2-T2 — Input, Badge, Chip, Avatar, Divider
- [x] LEELA-S001-3-T1 — Shell (Sidebar + Breadcrumb + Header 96px + SubNav)
- [x] LEELA-S001-3-T2 — Table densa + EmptyState + paginação + Popover
- [x] LEELA-S001-3-T3 — Modal + ConfirmModal (§2.15)
- [x] LEELA-S001-3-T4 — Toast, Cards (Evento/Desafio), Stepper, Skeleton, Tabs
- [x] LEELA-S001-4-T1 — Catálogo (Storybook) nos 2 temas
- [x] LEELA-S001-4-T2 — Lint de tokens + doc de governança

### Consolidação DS · shadcn+brasa (higiene pré-Onda 2, brief ds-consolidacao-shadcn-brasa)

- [x] LEELA-DS-A1 — Camada de aliases shadcn→brasa via pipeline + Tooltip PoC (954a8b7)
- [x] LEELA-DS-A2 — Motion tokenizado via tailwindcss-animate no preset (ffcf704)
- [x] LEELA-DS-A3 — Button/Input/Badge/Skeleton/Separator/Breadcrumb shadcn stock restilizados (3d42cff)
- [x] LEELA-DS-A4 — Toast: frame shadcn, fila `useToast` intacta (6c5abf9)
- [x] LEELA-DS-A5 — Popover→DropdownMenu: visual shadcn, 13 testes WAI-APG portados (5662960)
- [x] LEELA-DS-A6 — Card genérico shadcn stock brasa (e1dbe58)
- [x] LEELA-DS-A7 — Avatar shadcn stock, engine própria de imagem (determinístico, sem radix-avatar) (ed7a8f1)
- [x] LEELA-DS-A8 — Matriz AA reconstruída: 49 pares × 2 temas (0adf4f9)
- [x] LEELA-DS-A9 — Modal/ConfirmModal frame shadcn via aliases + motion (bde308c)
- [x] LEELA-DS-A10 — Tabs: anéis de foco e pill por aliases, underline mantido (66fec9e)
- [x] LEELA-DS-A11 — Table como composição sobre primitivos shadcn (acfadb0)
- [x] **GATE LOTE A: PASS 2026-07-06** — suíte DS 559/559 · tsc 0 · ESLint 0 · AA 49×2 · verificação independente do maestro
- [x] LEELA-DS-B1 — lucide-react peer dep + 8 ícones no DEFAULT_SIDEBAR_SECTIONS, fim do icon:null (bd55a8e)
- [x] LEELA-DS-B2 — Sidebar FIXA 240px substitui colapsável, a11y preservada (650c005)
- [x] LEELA-DS-B3 — AppShell layout raiz em App.tsx — zero rota sem shell (2544ded)
- [x] LEELA-DS-B4 — SidebarFooter componível (avatar+nome da sessão) (69439f0)
- [x] LEELA-DS-B5 — **GATE VISUAL: PASS 2026-07-06 (maestro, 4 screenshots vs mockup)** · suítes DS 564/564 + painel 446/446 em blocos + shell 17/17 · tsc+ESLint 0 · follow-ups: brand block topo sidebar (aguarda marca Leela) · badges da nav (ligar dado) · KPIs preview (dado, pré-existente)
- [x] LEELA-DS-SHOWROOM — **GATE PASS 2026-07-06 (maestro, 3 screenshots)** — Storybook 25/25 componentes (81 stories + 25 MDX copy-to-clipboard) · showcase 5 páginas no AppShell c/ tema ao vivo · LLM.txt por componente + índice · auditoria interna APPROVE (AA 5.29-18.58:1, teclado 11/11, zero request externo) · suíte 564/564 intacta (8a1e45e..da8227f)
- [x] LEELA-PREVIEW-fix-kpis — **Visão Geral do preview LIMPA (73865e0)**: Functions emulator no preview.sh (:5201) + main correto do functions/package.json + imports modulares firebase-admin/firestore no aggregateProfessionalDashboard (bug do Proxied.bind que perdia estáticos) · 10/10 testes via emulators:exec
- [x] LEELA-DS-COVERAGE — Auditoria de cobertura mockup→DS (51 itens classificados: 30 ativo/6 parcial/6 gap/5 adiado; rota por item) — mockup-coverage-2026-07-06.md (80237d0)
- [x] LEELA-DS-CONGRUENCIA — Auditoria de congruência visual: diff completo be-hero.css vs DS — achado central: paleta SUBSTITUÍDA, não traduzida (semânticos 5/20 iguais, primitivos 4/35) — congruencia-visual-2026-07-06.md (f24f2b0)
- [x] LEELA-DS-TOKENPATCH T1-T4 — Patch das divergências óbvias: escala brasa do mockup, secondary outline, sidebar preta+ativo laranja, radius/elevação/motion/type-scale do mockup, Table na densidade compacta — suíte 582/582, 18 testes AA novos (cf7d7e1..194b2a5)
- [x] LEELA-DS-DPATCH T1-T3 — Decisões do Vitor aplicadas: botão primário TEXTO BRANCO (tríade AA provada #D63500 4.81 / #DC3700 4.58 / #B82D00 6.15) · paleta Be Hero completa restaurada incl. heroico rosa no lugar do azul · text-danger/success do mockup · D3/D5/D6 fechadas como manter-DS documentado — suíte 590/590, +8 pares heroico na matriz (2b2c945..e52e53f)
- [x] LEELA-PREVIEW-seed — Seed extra aplicado no emulador VIVO: +4 eventos (todos os estados incl. esgotado), +190 inscritos, 4 estados de entrega, +3 tenants, alertas derivados (a993460)
- [x] **GATE QA AO VIVO 2026-07-06 (mds-ui + mds-ux-heuristics, browser real)** — REJECT→fix-loop→verde: visual pós-patch 100% PASS medido por computed style · blocker B1 vincularChip 500 CONSERTADO (85f56bc, imports modulares + 18/18 testes + probe RN-206 estruturado no emulador vivo) · M1 roteiro do seed corrigido (cddc833, João Silva + CHIP-0001, reset idempotente)
- [x] **GATE LOTE FIDELIDADE: PASS 2026-07-06 (finalizador Opus 4.8, pós-crash)** — T1-T7 (`f611082..58a049a`): T1 `f611082` tokens espaçamento · T2 `f351bb8` sidebar + brand slot · T3 `064d0ab` toolbar ⌘K · T4 `94aeea0` KPI row (trend/risco/Sparkline) · T5 `acf43ae` event-rows thumb por modalidade · T6 `16ac386` tabela 6col + date-badge + countdown + alertas · T7 `58a049a` revisão atômica shadcn + fecha m2..m6 · **tsc 0 · ESLint no-hardcoded 0 · suíte DS 836/836 em 4 blocos (0 regressão) · QA visual vivo 4 rotas (visão geral/eventos/clubs/plataforma) fiel vs mockup Be Hero** · 3 observações não-bloqueantes p/ maestro (Sparkline sem dado de conversão no seed · label Gerenciar vs Comunicar no card próximo-evento, fora de escopo · thumbs homogêneos pois seed só tem corrida) · FID-GATE-REPORT.md
### FIDELIDADE-EVENTOS · sub-lote 2 (Inscritos — dor #1 pagamento) — balde B
- [x] **GATE FID-EVT INSCRITOS: PASS 2026-07-06 (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d)** — T1 `75c76ef` (DS Select+Checkbox+Table.onRowClick, showroom) · T2 `d0cc44f` (Inscritos: visibilidade de pagamento + filtros consolidados + colunas job + row-click + seleção em massa) · **DS 877/877 · painel 89/89 (inscritos+_lib) · tsc 0 · ESLint no-hardcoded 0** · **gate vivo 1440×900**: 5 critérios S203 + visibilidade de pagamento vs `Inscritos do Evento.html` — evidência `inscritos-pass-*.png` · FID-EVT-INSCRITOS-REPORT.md
- [x] LEELA-FID-EVT-INS-T1 — DS: `Select` (native, filtro compacto 4-15) + `Checkbox` (native, indeterminate p/ selecionar-todos) + `Table.onRowClick` (mouse, preserva role=row) + `TableColumn.header` ReactNode; showroom (`75c76ef`)
- [x] LEELA-FID-EVT-INS-T2 — Inscritos à fidelidade do JOB: banner de inadimplência + aba Pagamento real (KPIs + lista de pendentes) · filtros 13-chips→Status-c/-contagem+2-Selects · Avatar/Check-in/Inscrito-em · clique-na-linha→slide-in (S203 crit.5) · seleção em massa + Exportar CSV; reuso `useQuery`/`listarInscritos` (`d0cc44f`)
- [x] **LEELA-FID-EVT-INS-T3 — hardening pós-review antagonista (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d)** — **ALTO CSV formula injection FECHADO**: `neutralizarFormula` prefixa `'` em células que iniciam por `=+-@`/TAB/CR (nome e modalidade = texto livre público) ANTES do escaping RFC 4180 em `inscritosCsv.ts`; testes de injeção (`=1+1`/`@SUM`/`-2+3`/`+cmd`/TAB → prefixados · `=HYPERLINK` na modalidade · "Ana Lima" intacto · neutralização-antes-de-RFC) · 3 baixos: fronteira 72h `<=`→`<` (fidelidade ao rótulo "mais de 72h") · guard `if (i.status in base)` em `contarPorStatus` (status fora do enum não vira NaN) · sentinela `SEM_KIT_VALUE`→`TODOS_VALUE` (serve kit E modalidade). **tsc 0 · ESLint no-hardcoded 0 · painel 22/22 (inscritosCsv+inscritosFiltro) · build prod limpo**

### DS-FORMS · primitivos de formulário (bloco #1a) — balde B
- [x] LEELA-DS-FORMS-T1 — Primitivos nativos born-responsive (`d05ea2f`): **Textarea** (`resize-y`) · **Radio/RadioGroup** (`<fieldset>`+`<legend>`, `name` compartilhado → setas nativas, contexto injeta `name`/`checked`/`onChange`) · **Switch** (`role="switch"`) · **Field** (wrapper a11y por `cloneElement`, TEMPLATE do padrão de id `htmlFor ?? childProps.id ?? useId`) · tokenizados, tema brasa/leela, sem overflow em 390px · showroom
- [x] **LEELA-DS-FORMS-T2 — hardening pós-review antagonista de a11y (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d)** (`[LEELA-DS-FORMS-T2]`) — 6 achados que propagariam por TODOS os forms do #1b, fix cirúrgico replicando o padrão do Field, 1 teste de regressão por fix: **[HIGH] Textarea** sem id → `useId`/`controlId` dá nome acessível (`getByRole('textbox',{name})` + label-click foca) · **[MED] RadioGroup** `baseId = id ?? useId()` amarra `descId`/`errorId` (grupo com `description` sem id tem `aria-describedby`) · **[MED] Radio item** `checked`/`defaultChecked` no `Omit` + `{...props}` movido para antes dos controlados (forced `checked` não desacopla — value do grupo manda) · **[MED] Field** `React.Children.only` (falha cedo em 2 filhos/fragmento) · **[LOW] Field** `aria-invalid` não clobbera o do filho (`hasError ? true : childProps['aria-invalid']`) · **[LOW] token gap** `gap-1`→`gap-[var(--spacing-1)]` (Field+Textarea; Switch já ok). **suíte DS 912/912 (+5 a11y) · tsc 0 · ESLint no-hardcoded 0 · build limpo** · DS-FORMS-PRIMITIVOS-REPORT.md · **desbloqueia #1b**

### FIDELIDADE-EVENTOS · sub-lote 1 (shell + charts + Overview) — balde B
- [x] **GATE FID-EVT SUB-LOTE 1: PASS 2026-07-06 (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d)** — T1 `2696b7b` · T2 `3217f12` · T3 `1ef0296` · **DS 862/862 · painel 531/531 (blocos) · tsc 0 · ESLint no-hardcoded 0 · build prod limpo** · **gate vivo**: `pass2-overview-*.png` 1440×900 os 5 blocos (hero · 4 KPIs · bar · donut · feed) presentes e fiéis vs `Overview do Evento.html`, 0 erro de console · **adr-conformance** Recharts (única lib de chart, ADR-010) + BarChart/DonutChart no showroom · FID-EVT-SUBLOTE1-REPORT.md
- [x] LEELA-FID-EVT-T1 — Shell do evento fiel ao `Detalhe do Evento.html`: breadcrumb, tile de modalidade, meta + contagem regressiva, "Ver página pública" + menu; reuso DS; tokens `--header-tile-*` (`2696b7b`)
- [x] LEELA-FID-EVT-T2 — BarChart + DonutChart no DS (Recharts · ADR-010), tokenizados (`--chart-cat-*` validados dataviz), acessíveis (role img + tabela + boundary), documentados no showroom; pin react/react-dom 18.3.1 (`3217f12`)
- [x] LEELA-FID-EVT-T3 — Overview à fidelidade: hero contagem regressiva · 4 KPIs (conversão/repasse restaurados, Sparkline) · bar/donut por modalidade (dados reais + preview-seed E12) · feed tipado; dados via hooks existentes (`1ef0296`)
- [x] **LEELA-FID-EVT-T4 — feed "Atividade recente": BUG FECHADO** (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d) — root-cause: `inscritosRecentesQuery` acumulava `listarInscritos` (orderBy `atletaNome`) e o `LIMIT` trazia os inscritos alfabéticos, não os recentes (reordenar no cliente não recupera o que a query nem buscou). **Fix**: nova `listarInscritosRecentes(db, eventoId, limite)` no api-client (orderBy `criadoEm` desc + limit, reusa `parseInscrito`; `listarInscritos`/paginação de Inscritos INTACTOS) · `inscritosRecentesQuery` refiada a ela · `criadoEm` é campo único no orderBy → índice single-field automático do Firestore (nenhum índice composto novo em `firestore.indexes.json`) · seed preview `seedAtividadeRecenteMeia` (+8 inscritos recentes/variados na Meia: 12min…26h, nomes diversos, confirmado/pendente/cancelado; reusa `gravarInscritos`, idempotente). **tsc 0 · ESLint no-hardcoded 0 · painel 531/531 (incl. `atividade.test.ts`) · api-client type-check limpo**. **Gate vivo** 1440×900: feed mostra atividade REALMENTE recente e variada (Rafael 21k há 12min · Camila 10k há 34min · Otávio 5k pendente · Beatriz 21k pendente há 2h · Helena 10k · Diego 10k falha há 6h), carimbos "há N min/h" coerentes com `criadoEm` (avançaram 12→18min entre seed e captura = live), nomes NÃO alfabéticos, os 3 tipos com badges — fiel às linhas de inscrito do `Overview do Evento.html`; receita R$ 85.617 e KPIs intactos. Evidência: `outputs/leela-build-2d6ee98d/fidelidade-eventos/pass3-feed-live.png` (+ `pass3-feed-mockup.png` · `pass3-overview-full.png`)

### UX-DADOS · estado de servidor (ADR-010 · TanStack Query) — lote #1 da fila

- [x] LEELA-UXDADOS-T1 — Fundação: `@tanstack/react-query` (+devtools) + `QueryClientProvider` na raiz (App.tsx); defaults bounded-staleness (staleTime 30s / gcTime 5min / refetchOnWindowFocus off / retry 1) (4c7ffb1)
- [x] LEELA-UXDADOS-T2 — Gateway fino keyed por recurso (`lib/query/keys.ts` + `queries.ts`): queryOptions reusando api-client (getOverview/listarEventos.../getEvento/listarInscritos), narrow-waist Fowler (63d4642)
- [x] LEELA-UXDADOS-T3 — Visão Geral migrada para `useQuery` (useOverview/useEventosProdutor/useInscricoesRecentes); shape de retorno preservado, OverviewPage intocada (71125f8)
- [x] LEELA-UXDADOS-T4 — Hub de Eventos migrado para `useQuery` (useEventos/useEvento/useInscritosRecentes); fallback #16 como query dependente; chave partilhada c/ Visão Geral (dacc4ed)
- [x] LEELA-UXDADOS-T5 — Inscritos migrado para `useQuery` (useTodosInscritos); cursor loop centralizado no gateway; 4 consumidores partilham cache por evento (8eba529)
- [x] **GATE UX-DADOS: PASS 2026-07-06 (sf-frontend-engineer Opus 4.8)** — **journey L-001 AO VIVO** (Playwright vs preview :5273: volta Visão Geral→Eventos→Visão Geral = 0 refetch de dados + 0 skeleton, servido do cache; screenshot da volta idêntico à carga) · **adr-conformance** grep OK (useQuery nas 3 telas, 0 fetch-on-mount cru, @tanstack/react-query em uso) · **suíte painel 516/516 · tsc 0 · ESLint no-hardcoded 0 · build prod limpo** · relatório `outputs/leela-build-2d6ee98d/UXDADOS-REPORT.md`
- [ ] **UX-DADOS lote 2 (próximo):** financeiro (S207) + balcão/entrega (S204) como superfícies VIVAS → `onSnapshot` realtime · kits/estoque (S205) · módulo Clubes (E05) inteiro · Plataforma (E16) · mutations (criarEvento/publicar/vincularChip) → `useMutation` + invalidação de chave (read-your-writes)

- [x] **QA VIVO 2 (pós-Fidelidade): CONCLUÍDO 2026-07-06 (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d)** — método: Playwright/Chromium headless com `viewport` explícito (resolve o bloqueio do passe 1, em que o Chrome do host HiDPI fazia clamp e não encolhia o viewport CSS) · **36 screenshots** (18 rotas × 2 viewports, desktop 1440×900 + mobile 390×844 REAIS) em `outputs/leela-build-2d6ee98d/shots-qa2/` · A1 Sparkline PASS + A2 thumbs por modalidade PASS · **Desktop 1440×900: 0 MAJOR / 0 minor** (gap wide-only fechado; falso-alarme do BalcaoPage vazio era settle-timing, re-shot OK) · **Mobile 390×844: 7 MAJOR de CAUSA-RAIZ ÚNICA** — M1 RootShell/Sidebar sem breakpoint (rail fixo ~230px, documento estoura horizontal) cascateando em M2 Topbar/Toolbar · M3 KpiRow · M4 header+TabNav · M5 Table · M6 EventRow · M7 prose/intro — **insumo direto do lote RESP-MOBILE (já na fila), NÃO regressões** · **minor: 1** (A3 quick-actions já arbitrado) · relatório `QA-LIVE-2-REPORT.md`
- [ ] **Follow-up CRÍTICO pré-Onda 2 (Directive do 73865e0):** ~13 módulos de functions (criarEvento, agregarFinanceiro, deleteClube, exportClubeData...) usam `admin.firestore.*` estático e falham no Functions emulator pelo mesmo motivo — migrar para imports modulares ANTES de depender deles no preview (botões salvar/criar). Candidato a lote de higiene na abertura da Onda 2.
- [x] **Minors do QA ao vivo 2026-07-06 — FECHADOS pelo Lote Fidelidade** (m1 por T4 `94aeea0`, m2..m6 por T7 `58a049a`; validados no gate visual 2026-07-06): KpiRow com elevation/anel · badge Esgotado em evento 100% cheio · stepper completed[] fiel · vocabulário Clubs unificado · badge 10px/700/uppercase · linha de tabela ~47px
- [ ] Follow-ups do showroom (2026-07-13, pré-Onda 2): 6 bugs de componente registrados no DS-SHOWROOM-SUMMARY (Input aria-describedby s/ id · DropdownMenu className no trigger · Toast duration ignorado em danger · Card sem export de tipos · comentário Table cita Popover · CardEvento href+onClick) + arbitrar fontes Exo 2/JetBrains embarcadas vs fallback

### LEELA-E16 · Plataforma & Super-admin (recorte V1 — fundacional multi-tenant)

- [x] LEELA-S1600-T1 — Modelo `tenants` + tipos + status/lifecycle + Rules base + seed
- [x] LEELA-S1600-T2 — Custom claims (`role` + `tenantId`) — `setTenantClaims` + propagação
- [x] LEELA-S1600-T3 — Security Rules multi-tenant (isolamento por `tenantId`) + testes
- [x] LEELA-S1600-FIX — Hardening pós-review: fix write-takeover cross-tenant (create/update/delete separados, `tenantId` imutável, RBAC intra-tenant `isTenantWriter`), cobertura de overwrite/delete/isolamento em todas as coleções, testes de `setTenantClaims`/`onCreateUser`/`transitionTenant`, guard anti-produção no seed, `vitest.config` (include/exclude), wire de `canTransition`. Suite: 150 verdes no emulator.

---

## Onda 1 · Operar

Criar/publicar evento, inscritos, kits, entrega/check-in; dashboard do produtor; clube com membros + comunicação; super-admin mínimo (onboard do tenant + termos comerciais).

### LEELA-E03 · Operação do evento (completo)

- [x] LEELA-S200-T1 — Tipo `Evento` + query por organizador + Rules (`475574d`)
- [x] LEELA-S200-T2 — Tela Hub de eventos (`/eventos`) + KPIs globais + EmptyState (`f599032`)
- [x] LEELA-FID-EVT-HUB — Hub HÍBRIDO (S200 à fidelidade): EventRow estendido (thumb de foto + métricas inline, T1 `a656dc9`) + hub em linhas densas + filtro de status compacto (4 chips/1 linha) + KPIs globais mantidos (T2 `b407af8`) · gate vivo 1440×900 PASS · `FID-EVT-HUB-REPORT.md`
- [x] LEELA-FID-EVT-HUB-FIX-T1 — Alinhamento das métricas inline (EventRow, DS, reusável): colunas tabulares de largura mínima fixa (`--eventrow-metric-col-min-w` 88px + `--eventrow-metric-gap`) com `tabular-nums` à direita → Inscritos/Receita/Vagas batem na vertical entre linhas com valor curto/longo; Visão Geral (`count`) intocada = zero regressão; story `HubMetricasAlinhadas` (`0d5d811`)
- [x] LEELA-FID-EVT-HUB-FIX-T2 — Ordenação temporal do hub: `ordenarEventosHub(eventos, agora)` pura (agora injetável) — futuros+hoje asc (próximo no topo), passados desc, sem-data ao fim; futuro×passado via `diasCivisAte` (core, fonte única); teste puro 11/11 · decisão: rascunho COM data sorteia entre futuros, só SEM-data ao fim (`dc81b36`)
- [x] **GATE FID-EVT-HUB-FIX: PASS 2026-07-07 (sf-frontend-engineer Opus 4.8, trace leela-build-2d6ee98d)** — FIX1 `0d5d811` · FIX2 `dc81b36` · **DS 883/883 · painel hubRows 11/11 · tsc 0 · ESLint no-hardcoded 0 · DS build limpo** · **gate vivo 1440×900** `/eventos?preview=castelo`: 3 colunas de métricas alinhadas entre as 8 linhas + ordem Meia 15 Jul topo → São Silvestre 2025 (passado) fim (via DOM) · evidência `outputs/leela-build-2d6ee98d/fidelidade-eventos/hub-fix-*.png` · `FID-EVT-HUB-FIX-REPORT.md`
- [x] LEELA-S201-T1 — Tela "Novo evento" (form + upload capa/regulamento + preview) (`9781173`; swap da porta para o wrapper real em `3706b6b`)
- [x] LEELA-S201-T2 — Function `criarEvento` + `publicarEvento` (slug, URL, QR) (`fcb7e1b`; + `getEvento(db, slug)` e `CriarEventoInput` c/ percursos no api-client)
- [x] LEELA-S201-T3 — Bloqueio de edição de preço após 1ª venda (RN-200) (`908359c`; core + guard de Function + Rules kits.preco e eventos.percursos)
- [x] LEELA-S202-T1 — Layout do evento (header 96px §2.1 + sub-nav §2.14) (`83d4036`)
- [x] LEELA-S202-T2 — Dashboard Overview (KPIs, alertas, atividade recente) (`d97250f`)
- [x] LEELA-S203-T1 — Subcoleção `inscritos` + tipo + query paginada + Rules (`8caec72`; legada top-level aposentada em `90a65cf`)
- [x] LEELA-S203-T2 — Tela de inscritos (tabela densa, paginação cursor 18/pág, 4 tabs §2.7, slide-in) (`3da2976`; filtro/busca sobre os 453 + EmptyState + 12 testes)
- [x] LEELA-S204-T1 — Tela do balcão (layout 60/40 + 3 passos + painel operacional) (`6de9e43`; wrappers chip/entrega em `0698aa4`; RN-205/207 + ConfirmModal de conflito §2.15)
- [x] LEELA-S204-T2 — Function de vínculo de chip + registro de presença (`6fe2e9f`; RN-205/206/207 + chipNumero exclusivo de Function nas Rules)
- [x] LEELA-S204-T3 — Galeria de estados do balcão (§2.9) (`3dff94b`; 5 estados dedicados, RN-208 nunca empilhados)
- [x] LEELA-S205-T1 — Modelo `kits` + `itensKit` + N:N Kit↔Item + Rules (`df09392`)
- [x] LEELA-S205-T2 — Tela Kits · Cadastro (sub-nav, cards, catálogo, resumo) (`d4bb22f`; RN-211/213/215/216 + resumo por contagens reais)
- [x] LEELA-S205-T3 — Modal de item de kit (tamanhado, origem, patrocinador) (`9f9f463`; toggle logo condicional RN-214 + 4 vias de fechamento)
- [x] LEELA-S205-T4 — Sub-telas Distribuição e Estoque de kits (`60092e0`; distribuição por presença real + estoque por `Kit.capacidade` com degradação graciosa)
- [x] LEELA-S206-T1 — Tela cheia de edição de kit (2 entradas, composição, preço) (`0d4a3da`; RN-217 2 rotas + RN-211 preço negativo + RN-200 bloqueio + N:N itens)
- [x] LEELA-S206-T2 — Nomenclatura "kit" nunca "tier" (RN-216) + guarda de regressão (`11adcae`; glossário E03 + varredura de fontes que falha em "tier")
- [x] LEELA-S207-T1 — Tela Financeiro do evento (bruto/taxa/líquido, breakdown, CSV) (`9e181ca`; lê agregado, null-safe RN-406, export CSV client-side)
- [x] LEELA-S207-T2 — Agregado financeiro do evento por Function (`a0a48b3`; recontagem count() idempotente + taxa do termo RN-406, sem fallback)
- [x] LEELA-FID-EVT-FIN-T1 — Sanitização CSV partilhada + fecha injeção de fórmula no financeiro (`8882d21`; `_lib/csv.ts` `neutralizarFormula`/`celulaCsv`, inscritosCsv reusa, testes de injeção)
- [x] LEELA-FID-EVT-FIN-T2 — Gráficos de breakdown por modalidade na tela Financeiro, per-evento (`5ca8969`; reusa BarChart/DonutChart do DS + prepararModalidades; EmptyState honesto p/ forma de pagamento/lote/repasse = dep. de backend E12)
- [x] LEELA-FID-EVT-FIN-T3 — `useFinanceiro` fetch cru → useQuery, ADR-010 (`314fda3`; financeiroCurrentQuery no gateway, contrato preservado, chave partilhada Overview↔Financeiro)

### LEELA-E02 · Visão geral do profissional (completo)

- [x] LEELA-S600-T1 — Rota raiz `(overview)` + shell (AppShell/Sidebar "Visão Geral" ativa) + layout 2 colunas + saudação (este commit · greeting/sidebar/session/data + App.tsx)
- [x] LEELA-S600-T2 — Cloud Function de agregado do dashboard do profissional (c48b0e6 · kpis+alerts core puro, fan-out idempotente, getOverview 1 round-trip, Rules dashboard/**, 50/50 testes)
- [x] LEELA-S600-T3 — KPI row (4 cards) consumindo o agregado (6b11674 · Inscrições/Receita/Vagas[Esgotando]/Conversão; null→"—")
- [x] LEELA-S601-T1 — Seção "Seus eventos ativos" (d15fa06 · status + inscritos + "Últimas vagas" + Gerenciar→E03)
- [x] LEELA-S601-T2 — Tabela "Últimas inscrições" (cross-evento) (c451d01 · ordena data desc + badge RN-204 Pago/Pendente/Recusado)
- [x] LEELA-S602-T1 — Countdown card do próximo evento + ações rápidas (da20569 · "08 dias restantes" + inscritos/vagas + Check-in→balcão E03)
- [x] LEELA-S602-T2 — Painel de alertas operacionais (8e9ae80 · consome alerts[] do MESMO getOverview; warn/info; "Tudo em dia")

### LEELA-E05 · Clubs (recorte V1 — núcleo + desafio mínimo)

Membros, convites, parcerias, comunicação, configurações + desafio em versão mínima (listar/criar). A execução gameficada anti-streak (jornada diária do atleta) fica em E13 e está fora da V1.

- [x] LEELA-S101-T1 — Modelo `clubes` + tipos + Security Rules (`ee39d9a`)
- [x] LEELA-S101-T2 — Tela Hub de clubes (2 zonas + KPIs) (`af18fe8`)
- [x] LEELA-S102-T1 — Shell do contexto de clube (header 96px + sub-nav 6 tabs) (`adc9c93`)
- [x] LEELA-S102-T2 — Conteúdo do Overview (4 KPIs + novos membros) (`b0f991b`)
- [x] LEELA-S103-T1 — Modelo `membros` + derivação de status + Function + Rules (`e2762f8`)
- [x] LEELA-S103-T2 — Tela de membros (tabela densa + busca + filtros + popover) (`171222b`; wire dos callables reais removerMembro/transferirPropriedade em `1417f70`)
- [x] LEELA-S104-T1 — Modal de convite (3 tabs + validações + 4 vias) (`19103a1`; wire do callable real enviarConvites em `1417f70`)
- [x] LEELA-S105-T1 — Modelo `desafios` + `catalogoAcoes` (seed 16) + junção + Rules (`43cf589`; fecha pendência `qtdDesafiosAtivos` do L1)
- [x] LEELA-S105-T2 — Tela lista de desafios (KPIs + cards + filtros + popover 6 ações) (`f837e5b`)
- [x] LEELA-S106-T1 — Motor de pontuação + validação de modelo (core, desafio mínimo) (`22431eb`)
- [x] LEELA-S106-T2 — Editor de desafio (70/30 + modelo dual + preview ao vivo) (`2b16b79`)
- [x] LEELA-S107-T1 — Modelo `parcerias` + espelho read-only + agregados + Rules (`cd591cf`)
- [x] LEELA-S107-T2 — Tela de parcerias (3 blocos + aceitar/recusar convite) (`d6afe48`)
- [x] LEELA-S107-T3 — Modal adicionar patrocinador (`928f043`)
- [x] LEELA-S107-T4 — Modais destrutivos (desativar patrocinador + remover evento) (`5f02333`)
- [x] LEELA-S107-T5 — Modal termos do programa (read-only) (`371ad51`)
- [x] LEELA-S108-T1 — Modelo `comunicados` + limite de push + agregados + Rules (`c83532c`)
- [x] LEELA-S108-T2 — Tela lista de comunicados (KPIs + filtros + popover contextual) (`37c33b6`)
- [x] LEELA-S109-T1 — Segmentação + validações de comunicado (core) (`da301cf`)
- [x] LEELA-S109-T2 — Editor de comunicado (70/30 + preview Push/Email) (`28ce61a`)
- [x] LEELA-S110-T1 — Tela de configurações (25/75 + scroll spy + 5 seções) (`7bb112d`)
- [x] LEELA-S110-T2 — Deletar clube (§2.15 + LGPD) + exportação — **frontend** modal + contrato tipado (`f1dd7e4`); **backend** deleteClube (cascata + retenção 90d em `clubesExcluidos`, replay-safe) + exportClubeData (guard 90d, `exportsClube`) + Rules `allow delete: if false` em clubes (`524607f` · functions 882/882 no Emulator)

### LEELA-E16 · Super-admin mínimo (recorte V1 — onboarding, termos, macro básico)

- [x] LEELA-S1601-T1 — Function `provisionTenant` (cria tenant + owner + claims, atômico) (`0eca288` + fixes `2042577`/`bda8039` + hotfix `35894cb`/`1e50e49`; merge de claims `0acea80`)
- [x] LEELA-S1601-T2 — Function de lifecycle (`activate`/`suspend`/`reactivate`) (`73e8366`, c/ trilha `lifecycleAudit`)
- [x] LEELA-S1601-T3 — Tela lista de tenants (tabela densa, filtros, saúde) (`e5ce3a5`)
- [x] LEELA-S1601-T4 — Tela detalhe do tenant + provisionar/suspender (ConfirmModal) (`704f17a`)
- [x] LEELA-S1602-T1 — Modelo `commercialTerms/current` + tipos + Rules (escrita só platform_admin) (`2ec1e85`, c/ snapshots versionados)
- [x] LEELA-S1602-T2 — Tela/editor de termos comerciais (por tenant) (`1103d1e`)
- [x] LEELA-S1602-T3 — Contrato de consumo dos termos por E04 (checkout) e E09 (taxa) (`1d5e1af` — `createTermsProvider` + `finance/calc`)
- [x] LEELA-S1605-T1 — Modelo `platform/rollups` + Rules (leitura só admin) (`de14546`)
- [x] LEELA-S1605-T2 — Function de agregação macro cross-tenant (básico) (`7876d9b`, full-recompute idempotente)
- [x] LEELA-S1605-T3 — Tela dashboard macro (KPIs + saúde por tenant, básico) (`da27d37`)

---

## Onda 2 · Vender

**Revisada em 2026-07-05** (decisões de escopo 2026-07-04 + `.nirvana/plans/onda2-decisoes.md`). Página de vendas (lotes/cupons simples), equipe/papéis, checkout público ponta a ponta (sandbox), repasses-slim, estados de sistema web, comunicação do evento (só campanhas), coleta E11 + backend do desafio. **Sem afiliados neste início**: S301/S303 removidas, S1204 reduzida a cupom, E08 adiado. Fecha o ciclo descobrir → pagar → receita.

**Ratificada como definição canônica da Onda 2 em 2026-07-10 (D4)** — `ROADMAP.md §5` corrigido para espelhar este superconjunto. Deltas de dependência da trilha next-trail (D1: kernel `pedidos` nasce em `LEELA-FABLE-A`; FABLE-G é a fonte do log de comunicação) anotados nas tasks abaixo e detalhados em `§Trilha next-trail` ao fim deste arquivo.

### LEELA-E04-slim · Configuração e vendas (sem afiliação; cupons simples) — brief `onda2-E04-lotes.md`

- [x] LEELA-S300-T1 — Modelo `paginaVendas` + `lotes` + `cupons` simples (sem afiliado) + Rules + seed — **✅ GATE PASS 2026-07-11/12** (`6b45b9c` kernel; **ADR-012 lote-por-modalidade travado** — lote pertence à modalidade; `precoVigente`/`loteAtivo` derivados, cupom regex, `paginaVendas` com seções por config; re-review em **Fable** achou e fechou: janela-morta vendia a preço legado + sem hand-off de quantidade (`9a5a671`+`308275f`), `financeiro/current` vazava repasse via catch-all → Rules writer-only + allowlist (`8007f52`), `moneyCentExato` negava 2 casas legítimas → helper portável `v*0.0==0.0` (`7ce033f`; `math.isInfinite` não existe no runtime de Rules@13); gate consolidado emulator **181/181** serial)
- [x] LEELA-S300-T2 — Function de virada de lote (RN-300) + guard RN-200 + callables `publicar/despublicarPaginaVendas` — **✅ `2f0fb0a` 2026-07-12 (Fable)** — `virarLote` transacional recontando ∑ por (modalidade,lote) das LINHAS do pedido (ADR-011/012), carimbo `encerradoEm/Motivo` monotônico, gatilho onWrite (virada na 100ª venda no mesmo ciclo) + cron 5min (collection-group `lotes.fimEm`); guard RN-200 nega preço com venda no evento OU no lote; publicar/despublicar idempotentes com completude server-side; **ataques**: virada dupla concorrente serializa, cron reexecutado no-op, fronteiras 99/100/101 e ±1ms, cliente forjando carimbos/`publicada` NEGADO, cross-tenant negado; unit 21/21 + kernel 78/78 + emulator 40/40 + regressão 28/28, tsc/eslint 0 · **decisões de dinheiro registradas**: estorno NÃO devolve vaga (precedente cupom.usos) · `vendidos` = ratchet max(atual,recontado) · ⚠️ ressalva p/ decisão de negócio: `confirmado→cancelado` sem estorno sai da base de contagem (hoje sem produtor)
- [x] LEELA-S300-T3 — Tela editor de conteúdo da página (seções web/app + SEO + publicar) — **✅ GATE PASS 2026-07-12** (`ce4c5b5`; rota `/eventos/:slug/pagina-vendas` + aba sub-nav; 3 grupos por canal, Checkout travado "Sempre ativa", SEO com URL `{DOMINIO_LEELA}` read-only, publicar/despublicar via ConfirmModal+Toast; TanStack Query read-your-writes **provado no preview**: toggle de seção persistiu reload e restaurou; 12/12 testes; lacuna → backend do publicar foi PARA S300-T2)
- [x] LEELA-S300-T4 — Modal de lote (virada por data/quantidade, preços por percurso) — **✅ GATE PASS + FABLE-REVIEW 2026-07-12** (tela de Lotes completa `d4a6c02`: agrupa por modalidade ADR-012, preço vigente/lote ativo do kernel, tabela densa + modal CRUD; **gate visual do maestro**: seed "venda fechada" correto + lote criado via modal ficou ATIVO com preço vigente do kernel + mobile card-mode 390 sem overflow; **review antagonista Fable APPROVE-COM-FIXES**: F1 payload de lote vendido agora SÓ-NOME (`6968758`), F2 janela pinada em FUSO_EVENTO America/Sao_Paulo (`da98231`), +7 vetores de ataque negados nas Rules (`a385b16`); 24+28 testes, emulator exit 0)
- [x] LEELA-S300-T5 — CRUD de cupons simples na página de vendas — **✅ GATE PASS `a39e4a8` 2026-07-13** (seção Cupons na tela pagina-vendas: lista real + CupomModal 4 vias; validação 100% do kernel — código regex/duplicado inline, percentual 0-100, janela obrigatória; `usos` read-only do servidor; **write path provado no preview**: GATE10 criado via modal e listado; 23 testes; **épico reconciliado ao kernel**: tipo `percentual|fixo`, teto derivado (não persistido), janela obrigatória, sem `status`)
- [x] LEELA-S300-T6 — Modal de percurso (preço independente por percurso, RN-301) — **⛔ SUPERSEDED por ADR-012 (registrado 2026-07-13)**: com lote-por-modalidade, o preço por percurso É o preço do lote da modalidade (tela de Lotes S300-T4, já entregue com preço vigente derivado do kernel). Um modal separado de "preço por percurso" recriaria uma segunda fonte de preço — exatamente o que ADR-012 eliminou. RN-301 é atendida pela sequência de lotes por modalidade. Decisão do maestro; reverter só se o Vitor quiser preço-base fora de lote.
- [x] LEELA-S304-T1 — Modelo `equipe` + 4 papéis (RN-320) + matriz `podeAcessar` + claims por evento + Rules — **✅ `a74b809` 2026-07-13 (Fable)** — matriz 4×7 API pública do core (organizador 7/7 · admin 6/7 sem financeiro · operador 2/7 · financeiro 1/7), célula a célula 28/28 unit + varredura emulator; `mergeClaimsEquipe` preservador (tenant/outros eventos intactos); **Rules `papelEventoAtivo()` = claim + âncora `equipe/{uid}` → janela de token velho (~1h) FECHADA** (provado pós-remoção e pós-troca); 14 vetores de ataque negados (auto-promoção, escalada, cross-tenant, âncora forjada, destituição do organizador); 115/115 total, tsc/eslint 0 · nota: probe client de `configuracoes` fica p/ o gate da UI (S304-T2/L5)
- [x] LEELA-S304-T2 — Tela Configurações gerais do evento — **✅ GATE PASS `1614bfb` 2026-07-13** (form dos campos reais do model: nome/local/capacidade/usaChip com hint RN-207; URL pública `{DOMINIO_LEELA}` read-only; data/modalidades read-only travadas pós-1ª venda; gate de UI por `podeAcessar`)
- [x] LEELA-S304-T3 — Tela Equipe e permissões (4 papéis) — **✅ GATE PASS `4644752` 2026-07-13** (lista real `listarEquipe`; trocar papel → `setClaimsEquipe`+Toast; **convite funcional por escrita Rules-guarded** (`shapeConviteValido`: papel≠organizador, sem uid); remover → ConfirmModal §2.15 com preview da matriz; anti-escalada espelhada do servidor; **ciclo provado no preview**: convite criado→listado convidado→removido→EmptyState de volta; 57 testes) · lacunas honestas: papel do convite read-only até ativar · sem e-mail de convite (ativação = exclusiva da Function)
- [ ] LEELA-E04-PAY-T1 — DI seam de payments + suíte de conformance provider-agnóstica *(next-trail: o `refund` do seam REUSA a Function de `LEELA-FABLE-B-T1` — não reimplementar estorno)*
- [ ] LEELA-E04-PAY-T2 — Adapter concreto do gateway em sandbox — **gateway DECIDIDO: Asaas (D2, 2026-07-10); segue parked até o KYC concluir (ação externa do Vitor — não bloqueia sandbox)**

Removidas (sem afiliados): ~~S301-T1..T7~~. Realocadas: ~~S302-T1/T2~~ → E09-slim · ~~S303-T1~~ → E06 · S305/S306 → Onda 3.

### LEELA-E12 · Landing + checkout público (recorte sem afiliação) — brief `onda2-E12-lotes.md`

- [ ] LEELA-E12-L0-T1 — `core/checkout/serviceFee.ts` (taxa incorporada × não incorporada, teste falsificável)
- [ ] LEELA-E12-L0-T2 — `core/checkout/installments.ts` (parcelamento só cartão, sobre `buildInstallmentOptions`)
- [x] LEELA-S1200-T1 — Formalizar `apps/landing` (layout público, ThemeProvider leela, convenção ISR) — **✅ GATE PASS 2026-07-12** (`974c8e2`; App Router SSR/ISR, tema `leela` via `data-theme`, tailwind-preset do DS, header/footer públicos)
- [x] LEELA-S1200-T2 — Leitor público server-side + gate publicação/visibilidade + Rules + core-checkout puro (steps/validateDados/saleState) — **✅ GATE PASS 2026-07-12** (leitor Admin SDK com gate por `status`→404 no código — Admin SDK bypassa Rules; `getEventoPublicado`/`listarEventosPublicados`/`getPaginaVendas`; bundle cliente 0 vazamentos; core-checkout puro já entregue na fundação S1203-T5)
- [x] LEELA-S1201-T1 — Rota SSR/ISR do evento + `SectionRenderer` por configuração — **✅ GATE PASS 2026-07-12** (renderiza `PaginaVendas.secoes` ativas na ordem)
- [x] LEELA-S1201-T2 — Componentes de seção (Hero, Modalidades, Kits, Retirada, FAQ, Percurso, Patrocinadores, Depoimentos) + `BannerHero`/`CardKit` no DS — **✅ GATE PASS 2026-07-12** (Hero/Sobre/Modalidades/Lotes/Retirada/CheckoutCta; preço vigente por modalidade ADR-012; seções sem dado não renderizam)
- [x] LEELA-S1201-T3 — Estados públicos do evento (rascunho→404, encerrado, esgotado) + ShareBlock URL/QR — **✅ GATE PASS 2026-07-12** (404 provado no rascunho maratona-floripa-2027; CTA off em vendas encerradas; ShareBlock com QR). **Follow-up: hero cover = placeholder gradiente quando sem URL (hoje alt quebrado)**
- [ ] LEELA-S1202-T1 — Rota SSR/ISR do clube com gate de visibilidade (RN-140)
- [ ] LEELA-S1202-T2 — Conteúdo da página do clube (hero, bio, KPIs, desafios públicos, CTA — **sem** bloco de eventos afiliados)
- [ ] LEELA-S1205-T1 — `generateMetadata` dinâmica + OpenGraph/Twitter + JSON-LD Event
- [ ] LEELA-S1205-T2 — `sitemap.ts` + `robots.ts` (eventos publicados + clubes indexáveis)
- [x] LEELA-S1203-T1 — Rota + máquina de estado do Stepper (5 etapas, sem etapa de entrega) — **✅ GATE PASS 2026-07-12** (`c5a7d2a`; CheckoutFlow client, 5 etapas dados→modalidade+kit→resumo→pagamento→confirmação)
- [x] LEELA-S1203-T2 — Etapa Dados (formulário do atleta anônimo + validação) — **✅ GATE PASS 2026-07-12** (ADR-011 responsável + N inscritos, "+ Adicionar outro atleta", auto-inscrição; validação via core; `loginAnonimo`)
- [x] LEELA-S1203-T3 — Etapa Modalidade/Kit (preço vigente; "Sem kit" negativo RN-211; RN-216) — **✅ GATE PASS 2026-07-12** (radiocards 5k75/10k100/21k150 do `precoVigente`; "Sem kit"; nota de retirada honesta)
- [x] LEELA-S1203-T4 — Etapa Resumo (linha de taxa condicional + parcelamento + cupom) — **✅ GATE PASS 2026-07-12** (números 100% de `computeSaleState` via callable read-only; cupom HEROI10; PIX/cartão + parcelamento). **Nota (review Fable `703db9c`): a `taxa` NÃO é exibida ao comprador — expô-la vazava o `platformFeePct` do termo (RN-404); o comprador vê `totalCobrado`, a taxa vive no painel autenticado.**
- [ ] LEELA-S1207-T3 — Compliance na etapa Dados (contato de emergência + aceite de regulamento ≠ LGPD, por inscrito)
- [ ] LEELA-S1204-T2 — `validateCoupon` server-side (cupom de evento, sem afiliadoRef; consome S300-T1)
- [ ] LEELA-S1207-T2 — `validateInscrito` core puro (RN-145/148)
- [ ] LEELA-S1207-T1 — Persistência dos 3 campos de compliance ao criar inscrito
- [x] LEELA-S1203-T5 — `createInscricaoCharge` + `pedidos/{id}` (ADR-011) + sandbox provider — **dep NOVA (D1, 2026-07-10): `LEELA-FABLE-A-T1`** (o kernel `pedidos` nasce em FABLE-A; aqui só o produtor de escrita do checkout — NÃO redefinir a coleção) — **✅ FUNDAÇÃO PASS 2026-07-12** (checkout de ponta a ponta **SEM Asaas/KYC** via `MockPaymentProvider` sandbox + `selectProvider` fail-safe (sandbox nunca roda se houver chave real); `computeSaleState` puro (base→desconto→taxa→parcelamento), `validarDadosMinimosInscrito`, `createInscricaoCharge` (ids determinísticos, 3 camadas de idempotência, popula `itens[]`), webhook idempotente (flip pendente→confirmado + agrega receita); re-fundação em **Fable**; gate consolidado emulator 181/181. **Falta a UI de 5 etapas (S1203-T1..T4) = próximo lote.** AsaasProvider real = parked até chave sandbox)
- [ ] LEELA-S1203-T6 — Webhook idempotente (inscrito→confirmado, ∑ via `agregarFinanceiro` do E03)
- [ ] LEELA-S1206-T1 — `qrToken` assinado + emissão idempotente do ingresso por inscrito
- [ ] LEELA-S1206-T2 — Log de notificações (`hasSent`/`markSent`) + Rules — **dep NOVA (next-trail): `LEELA-FABLE-G-T1`** (o log de envio do ingresso é o MESMO agregado do log de comunicação — não modelar um 2º)
- [ ] LEELA-S1206-T3 — Interface `EmailProvider` + sandbox + disparo ao responsável do pedido
- [ ] LEELA-S1206-T4 — Template de e-mail de marca + `renderTicketPdf` sob demanda

Removidas (sem afiliados): ~~S1204-T1~~, ~~S1204-T3~~. Deferida V1.1: S1208 (portal público do organizador).

### LEELA-E09-slim · Repasses do organizador — brief `onda2-E09slim-lotes.md`

Vendido/disponível/retido + dados bancários LGPD + solicitação validada + retenção 15% (editável platform_admin) + comprovante numerado + histórico. "Pago" é registro manual mock (RN-356).

- [x] LEELA-E09s-L1-T1 — Modelo de dados tenant-scoped (dadosBancarios/secret, repasses, saldo, retenção) + doc (`d7deb66` — repasse-types.ts + campos opcionais RN-348/350 no CommercialTerms + seção E09-slim no modelo-de-dados)
- [x] LEELA-E09s-L1-T2 — Security Rules (cross-tenant nega, secret read:false, escrita só Function) (`4c534c4` — 4 blocos sob tenants/{tid}; secret ilegível até p/ owner e admin via client SDK; 30 testes adversariais + 23 regressão commercialTerms, emulator exit 0)
- [x] LEELA-E09s-L1-T3 — Core puro (computeRetido/computeSaldoRepasse/validarSolicitacao/transitionRepasse/comprovante) (`e5a8abf` — + computeLiquidoProdutor RN-347 e janela D+N dias úteis RN-348; 47 testes unit)
- [x] LEELA-E09s-L2-T1 — `updateSaldoRepasse` (trigger idempotente sobre financeiro/current + repasses) (`1f11280` — full recompute transacional via computeSaldoRepasse; no-op quando nada muda (atualizadoEm intocado); janela D+N com fonte REAL: pagamentos confirmados pagoEm/valorFinal — pendência L1 resolvida; 10 testes Emulator)
- [x] LEELA-E09s-L2-T2 — `saveDadosBancarios` (cifra AES-256-GCM server-side, retorna só mascarado) (`4629b61` — ADR-014 PROPOSTA (Secret Manager + keyVersion + AAD=tenantId; por que não KMS); owner-only; criadoEm preservado; fail-closed sem BANK_DATA_KEY; CPF/CNPJ completo NUNCA armazenado; 14 unit + 6 Emulator)
- [x] LEELA-E09s-L2-T3 — `requestRepasse` (validação transacional RN-352) + `cancelRepasse` (owner) (`a474868` — corrida PROVADA: 2×5000 sobre 8500 ⇒ 1 criado + 2ª failed-precondition (write compartilhado do saldo serializa); snapshot mascarado congelado; payload forjado ignorado; cancel devolve ao disponível, replay sem duplicar trilha; 11 testes)
- [x] LEELA-E09s-L2-T4 — Transições admin (approve/reject/markPago) + comprovante gapless + `setRetencaoRepasse` (`e867439` — só platform_admin; matriz do core decide (solicitado→pago REJEITA); CONCORRÊNCIA PROVADA: 2 pagos simultâneos ⇒ 0007/0008 sem buraco, retry replay com MESMO número; retenção bumpa versao+snapshot v{n} RN-404 + recompute imediato; 9 testes)
- [x] LEELA-E09s-L2-T5 — `getBankDetailsForPayout` auditado (LGPD) (`a298ca0` — único ponto de conta/PIX em claro (JIT, repasse aprovado); TODO desfecho registrado em `auditoriaAcessos` incl. NEGADO; trilha sem plaintext e ilegível por cliente; blob adulterado ⇒ internal sem payload; 5 testes)
- [x] LEELA-E09s-L2-T6 — `encerrarEventos` cron 03:10 (gatilho `evento→encerrado`, libera retenção — ADR-007) (`8209442` — corte por dia civil FUSO_EVENTO (dia da prova NÃO encerra); rerun idempotente (carimbo único); recompute do saldo disparado (retido 1500→0 provado); self-close do organizador NEGADO nas Rules (teste antagonista); virarLote 23/23 sem regressão)
- [ ] LEELA-E09s-L3-T1 — Rota + 3 cards vendido/disponível/retido (lê só `saldo/current`)
- [ ] LEELA-E09s-L3-T2 — Form de dados bancários (exibe só mascarado)
- [ ] LEELA-E09s-L3-T3 — Modal solicitar repasse (espelho client de RN-352, servidor autoritativo)
- [ ] LEELA-E09s-L3-T4 — Histórico + comprovante numerado com aviso de registro manual
- [ ] LEELA-E09s-L4-T1 — Back-office: fila de repasses cross-tenant + aprovar/recusar + editor de retenção
- [ ] LEELA-E09s-L4-T2 — Back-office: registrar pagamento (dados auditados + comprovante)

### LEELA-E07-web · Estados de sistema web (404 · 500 · 403) — brief `onda2-E07web-lotes.md`

- [ ] LEELA-E07w-T1 — `SystemStateScreen` (web) no Design System (5 variants, 3 ligadas)
- [ ] LEELA-E07w-T2 — 404 no Painel (catch-all React Router, com shell)
- [ ] LEELA-E07w-T3 — 404 na Landing + guarda SEO rascunho→HTTP 404
- [ ] LEELA-E07w-T4 — 500 no Painel (ErrorBoundary raiz + segmento + Sentry eventId)
- [ ] LEELA-E07w-T5 — 500 na Landing (`error.tsx` + upgrade `global-error.tsx`)
- [ ] LEELA-E07w-T6 — 403 no Painel (guarda por papel via `podeAcessar` de E04-S304)

Débito V1.1: offline (S503) + manutenção (S504) web; mobile inteiro na onda E13.

### LEELA-E06 · Comunicação do evento (recorte V1 — só Campanhas) — brief `onda2-E06-lotes.md`

**Confirmado V1 (D3, 2026-07-10).** Quando `E06-L3` aterrissar a aba Comunicação na sub-nav, o middle-action do card "Próximo evento" vira "Comunicar" (alinha ao mockup — fecha o anexo A3).

- [ ] LEELA-E06-L1-T1 — Extração camadas A/B → `core/comunicacao` + `functions/shared` (re-point do clube, baseline 531 verde) — **dep NOVA (next-trail): `LEELA-FABLE-G-T1`** (campanhas e aba Comunicação do slide-in partilham o mesmo log de comunicação)
- [ ] LEELA-S401-T1 — Modelo `campanhas` + taxonomia de segmento do evento + Rules + api-client + seed
- [ ] LEELA-E06-L2-T1 — `estimarAlcance` (callable `count()` sobre inscritos por segmento)
- [ ] LEELA-S401-T4 — `enviarCampanha` idempotente + limite push RN-133 (disparo físico mock)
- [x] LEELA-E06-L3-T1 — Aba "Comunicação" aditiva na sub-nav + rota + shell — **✅ GATE PASS `bba54aa` 2026-07-12/13** (contadores 100% do agregado ∑ `comunicacoesResumo/current` — a aba NUNCA conta no cliente; timeline desc do log FABLE-G com badges de status; **PII: `destinatario.ref` mascarada `••••NNNN`, ref crua ausente do DOM (teste)**; CTA "Enviar comunicação" desabilitado honesto com hint até E06-L2 existir; sub-nav ordem canônica E04→E06; 16/16 testes; gate visual maestro desktop+mobile com 4 logs demo semeados) · follow-up D3 registrado: middle-action do card "Próximo evento" → "Comunicar" (task à parte, card de outro épico)
- [ ] LEELA-S401-T2 — Lista de campanhas por estado (RN-130) + filtros + popover
- [ ] LEELA-S401-T3 — Editor "Nova campanha" (canal, capa só-email, segmento, estimativa ao vivo, truncamento 160)

Cortadas: S400 (parceiros/afiliação), S402 (automações → Onda 3), `aberturasPct`, segmento `por_engajamento`, scheduler de agendamento (estado `agendada` fica no modelo).

### Transversais Onda 2 (coleta E11 · backend do desafio · higienes) — brief `onda2-transversais-lotes.md`

- [ ] LEELA-S821-T1a — Tipo `AnalyticsSnapshot` (estende `OverviewKPIs`) + Rules (owner-only, imutável)
- [ ] LEELA-S821-T1b — Cron coleta diária 03:05 + Core idempotente + seed + hook BigQuery atrás de flag
- [ ] LEELA-S1307-T1 — `registros` do atleta + `onRegistroWrite` (pontos via `calcularPontos`, bônus RN-115) + Rules
- [ ] LEELA-S1308-T1 — `participacao` + `entrarNoDesafio` (RN-117, idempotente) + Rules
- [ ] LEELA-S1308-T3 — Board de consistência (dias ativos distintos, desempate por pontos) + Rules
- [ ] LEELA-S105-hig — E15 higiene: `autorId` + `anexo?` no tipo `Desafio` (XS)
- [ ] LEELA-S1601-hig — Fix `consistent-type-imports` em PlatformShell.tsx (XS)

### LEELA-E08 · Painel do influenciador — **ADIADO** (dependia de afiliação; sem afiliados neste início)

- ~~LEELA-S701-T1 / S702-T1 / S703-T1 / S704-T1~~ — retornam se/quando o programa de afiliação entrar (pós-V1).

---

## Onda 3 · App simples

App do atleta mínimo (recorte de E13): descobrir evento, comprar/checkout, meus ingressos (QR), receber comunicado (push), entrar/ler clube.

### LEELA-E13 · App do atleta (recorte V1 — E13-slim)

Fundação do app (bootstrap + shell) é pré-requisito de qualquer tela:

- [ ] LEELA-S1300-T1 — Bootstrap `apps/mobile` (Expo Router + consumo de core/DS RN)
- [ ] LEELA-S1300-T2 — Configuração EAS Build/Submit + Sentry mobile + credenciais das lojas
- [ ] LEELA-S1302-T1 — Tab navigator (5 itens) + safe area + deep linking

Onboarding e login:

- [ ] LEELA-S1301-T1 — Provisionamento de atleta no 1º login + Function `onAtletaCreate` + Rules
- [ ] LEELA-S1301-T2 — Telas de onboarding + entrada (Apple + Google) + gate de sessão

Descobrir evento:

- [ ] LEELA-S1304-T1 — Feed de eventos + busca + filtros (aba Eventos)
- [ ] LEELA-S1305-T1 — Tela de detalhe do evento + seleção de modalidade/kit

Comprar / checkout / meus ingressos:

- [ ] LEELA-S1306-T1 — `inscricoes` do atleta + Function de conversão/split + Rules
- [ ] LEELA-S1306-T2 — Tela de checkout (Stepper + cupom + pagamento) + Minhas ingressos/QR (recorte novo — subconjunto da story: tela "Meus ingressos" + QR do ingresso para check-in)

Entrar / ler clube:

- [ ] LEELA-S1310-T1 — Entrar no clube (código/link) + página do clube (membro)
- [ ] LEELA-S1311-T1 — Modelo `feed` do clube + Functions de agregado + Rules
- [ ] LEELA-S1311-T2 — Tela do feed do clube (recorte leitura — ver mural, sem compor/postar)

Receber comunicados (push):

- [ ] LEELA-S1312-T1 — Registro de push token (FCM) + entrega de comunicado ao atleta + Rules
- [ ] LEELA-S1312-T2 — Permissão de push + inbox de comunicados + leitura

---

## Fora da V1 (não construir agora)

### Recortes pós-V1 dentro de épicos da V1

- **E16 (multi-tenant) — recorrências:** `LEELA-S1603` (recorrência da comunidade, T1/T2/T3) e `LEELA-S1604` (recorrência SaaS Leela→tenant, T1/T2/T3). V1 usa `saasMonthlyFee = 0`. Dashboards macro ricos (séries/coortes/drill-down) também pós-V1.
- **E05 (Clubs) — desafio gameficado:** a mecânica anti-streak completa e o scoring gameficado (execução da jornada) vivem no app do atleta (E13, ver abaixo) e ficam fora. `LEELA-S111` (sub-afiliação de membros, placeholder RN-105) adiada.
- **E13 (App do atleta) — jornada heroica:** `LEELA-S1303` (Início/dashboard heroico), `LEELA-S1307` (Arena — registrar ações dos 3 pilares), `LEELA-S1308` (progresso de desafio + participação), `LEELA-S1309` (medalhas/recompensas), `LEELA-S1313` (perfil/identidade completo). Ou seja: registro de ações/pilares, progresso/medalhas e sync de treino fora da V1. Composição de posts no feed (S1311 write) também fora — na V1 o mural é só leitura.
- **E06 (Marketing) — parceiros e automações:** `LEELA-S400-T1/T3/T4` (rede de parceiros de marketing + programa + convite), `LEELA-S402` (automações por gatilho, T1/T2) e `LEELA-S403` (migração de sub-nav 9→8 tabs, T1/T2 — adiada para não conflitar com a aba Promotores do E04 na V1).

### Épicos adiados (revisado 2026-07-05 — recortes-slim entraram na Onda 2)

- **LEELA-E07** — só a fatia **web 404/500/403** entrou na Onda 2 (E07-web); offline/manutenção = V1.1; superfície mobile = onda E13.
- **LEELA-E08** — Painel do influenciador: **adiado por inteiro** (dependia de afiliação).
- **LEELA-E09** — só o recorte **E09-slim (repasses do organizador)** entrou na Onda 2; painel financeiro rico (KPIs/donut/CSV), split de afiliação e reembolso (S904 + S305/S306) ficam na Onda 3.
- **LEELA-E10** — Marcas (patrocinadores/ativações).
- **LEELA-E11** — só a **coleta** (rollup diário S821-T1) entrou na Onda 2; dashboards/telas de analytics ficam na Onda 3.
- **LEELA-E14** — Integrações de treino / `TrainingProvider` (Strava/Garmin/Health). Ação externa pendente: registrar o app OAuth na Strava (lead time).
- **LEELA-E15** — Creator Studio: só a **higiene** (`autorId` + `anexo?` no tipo `Desafio`) entrou na Onda 2; o resto congelado até a V1 validar.

---

## Trilha next-trail (ratificada 2026-07-10)

> Trilha ratificada pelo Vitor (**D1-D7**, 2026-07-10/11) — planejamento-fonte em `leela-specs/next-trail/` (ROADMAP-next §7 = waves A-D · STORIES-next = aceites · TASKS-next = quebra 1-task-1-PR). Roteamento: **Fable** (pagamento/segurança/rules/core) · **Opus** (UI/mecânico) · Sonnet PROIBIDO. `⚔` = review antagonista obrigatório. JTBD: âncoras de `jobs-to-be-done.md §04.1` — **P1-P5 já aplicadas ao doc (D6, 2026-07-10)**.
> **D1:** kernel `pedidos/{id}` nasce UMA vez em FABLE-A conforme **ADR-011** (gate adr-conformance); deps `FABLE-A → S203-T3` e `FABLE-A → E12-L4/S1203-T5` valem. **D2:** gateway = **Asaas** (KYC = ação externa; `E04-PAY-T2` parked até KYC). **D5:** RESP-MOBILE = **Must V1**, antes/em paralelo à Onda 2.

### Wave A · F1 Trilha Fable — backend crítico (A-G) · ROTA FABLE · review antagonista

**`LEELA-FABLE-A`** · Modelo de pedido/pagamento no Inscrito (implementa **ADR-011** — kernel `pedidos`) — Must · L — **JTBD:** T/H1 · "Compro inscrição → acompanhar kit, pagamento e resultado no mesmo lugar" (04.1) + **P5 "Vendo inscrições chegarem" (inadimplência visível — dor #1)**. Destrava S203-T3, S207 (por forma de pagamento), E12-L4.
- [x] LEELA-FABLE-A-T1 — Modelo `pedidos/{id}` conforme ADR-011 (pedido em grupo: `responsavel`, `inscritoRefs[]`, `pagamentoRef`, `valorTotal`; escrita de estado financeiro só por Function) + tipos core `Pedido`/`Pagamento`/`Conciliacao` + api-client + Rules (nesta fase só organizador lê) + **gate adr-conformance ADR-011** — M · dep S203-T1 ✅ · **Fable** · ⚔ · **✅ GATE PASS 2026-07-11** (review antagonista APPROVE-COM-FIXES → r1 9/9 fixes aplicados · tsc/ESLint 0×3 · unit 45/45 · Rules 19/19 no emulator · adr-conformance provado por grep · coleção ROOT c/ `tenantId`+`eventoId` 🔁 · `Conciliacao` embutida em `Pagamento` · read = `isTenantWriter`, promoter/athlete DENIED · report `outputs/leela-build-2d6ee98d/FABLE-A-T1-REPORT.md`)
- [x] LEELA-FABLE-A-T2 — Enriquecer projeção `Inscrito` (`pedidoRef`+`ehResponsavel` do ADR-011; denormalizar `[reg]` OU join; `tamanhos` = map por item, S209) + surfaçar campos do slide-in S203 §"Campos" — M · dep A-T1 ✅ · **Fable** · ⚔ · **✅ GATE PASS 2026-07-11** (`2c01306` impl + fix `6a46509`; decisão Kleppmann: `[reg]` mora no Inscrito c/ dono=Function checkout, `[pag]` = join 2 point-reads; antagonista aprovou c/ ressalvas → **decisão PII do Vitor aplicada**: read de inscritos E pagamentos `isTenantMember`→`isTenantWriter` (promoter+athlete NEGADOS, provado no emulator; catch-all `/{subcol}` de eventos exclui `inscritos`); +A3-A6; unit 98/98, tsc 0×4, emulator Rules 158/158)
- [x] LEELA-FABLE-A-T3 — Wire do slide-in rico `LEELA-S203-T3`: abas Geral `[reg]` + Pagamento `[pag]` renderizam dado real (Onda 1 colhe) — S · dep A-T2 · **Opus** (UI) · ⚔ (PII no cliente) · **✅ GATE VISUAL PASS 2026-07-11** (`0b0e00b`; 4 abas, dado real via join; CPF/telefone mascarados c/ toggle, saúde atrás de disclosure; [pag] `R$567·Lote 2·Mastercard 12×`; estorno desabilitado B-T2; com/hist EmptyState honesto; legado sem pedido não quebra; gate vivo 1440+390 PASS, evidência `shots-wave-a-ui/`)

**`LEELA-FABLE-B`** · Function de estorno idempotente, por inscrito (ADR-011) — ≙ fatia de `E09-S904` — Must · L — **JTBD:** T/H1 · **P1 "Preciso cancelar uma inscrição" (estorno digno)**. Seam de `refund` compartilhado com E04-L6 (ADR-006). Escopo honesto: fatia organizador-inicia (RN-337); máquina completa RN-341 + fila + política S305 seguem na Onda 2/E09.
- [ ] LEELA-FABLE-B-T1 — Function `estornarInscricao` transacional idempotente por inscrito (estorno PARCIAL dentro do pedido em grupo; RN-337 sem split — afiliação cortada) + guard (só paga, só organizador) + audit trail; testes: reexec não duplica + estorno de 1 inscrito não afeta os demais — M · dep A-T1, PaymentProvider ✅ · **Fable** · ⚔
- [ ] LEELA-FABLE-B-T2 — Ação "Reembolsar" no slide-in + ConfirmModal §2.15 (reflete resultado real "•••• em N faturas" com o valor parcial do inscrito) — S · dep B-T1, A-T3 · **Opus** (UI) · ⚔ (UI de ação de dinheiro)

**`LEELA-FABLE-C`** · QR server-side — validação de assinatura (ENCOLHIDA) — ≙ recorte de `LEELA-S208` — Must · M — **JTBD:** T+S/H1 · **P2 "Faço check-in no balcão" (validar ingresso sem fraude)**.
- [x] LEELA-FABLE-C-T1 — Validação server-side de assinatura do `qrToken` (RN-221/222): rejeita adulterado/outro-evento/já-usado (persiste carimbo `checkinEm`, recorte S208-T1) — ≙ `S208-T3`; scanner/estados (S208-T4) NÃO entram — M · dep firebase-admin ✅ · **Fable** · ⚔ (segurança) · **✅ GATE PASS 2026-07-11** (`bc2bf04` impl + `8158a3f` fix; 2 reviews antagonistas de segurança independentes → APPROVE, núcleo HMAC sem bypass, corrida 3-way/replay/cross-tenant provados no emulator 11/11; fix r1 fechou prototype-pollution do `kid`; unit 30/30; PENDENTE só operacional: `QR_TOKEN_KEYS` no preview/prod. Follow-ups sistêmicos: App Check nos callables; charset de inscritoId no path)

**`LEELA-FABLE-E`** · Chave estável Kit↔enum (integridade) — Should · XS — **JTBD:** T/H1 · enabler de P3.
- [ ] LEELA-FABLE-E-T1 — Alinhar seed `Kit.id` ao enum `inscrito.kit` (chave canônica Kit↔enum) + remover ponte `kitCasa` — XS · dep S205 ✅ · **Opus** (mecânico)

**`LEELA-FABLE-D`** · Estoque por tamanho + movimentações — ≙ `LEELA-S209` + `LEELA-S210` — Should · L — **JTBD:** T/H1 · **P3 "Preparo a entrega de kits" (estoque por tamanho PP-XG)**. Destrava EstoqueView (S205-T4). Aceites canônicos em `epics/LEELA-E03` §S209/§S210 — herdar, não re-modelar.
- [x] LEELA-FABLE-D-T1 — Modelo de estoque por tamanho (lado kit): `modeloEstoque`/`tamanhosDisponiveis[]` em `itensKit` + subcoleção `aprovisionamento/{sku}` + Rules — ≙ `S210-T1/T2` — **✅ `d54c53a` 2026-07-12** (SKU `itemId__tamanho`, ∑ derivados write-exclusivo de Function, Rules write:false + ataques negados, 116/116 emulator)
- [x] LEELA-FABLE-D-T2 — Function de agregação Σ de estoque + máquina de estados + alertas baixa/esgotado — ≙ `S210-T3` — **✅ `d54c53a` 2026-07-12** (agregação idempotente full-recompute; estorno reverte via filtro `confirmado`; máquina linear RN-226; `transicaoAprovisionamento` callable)
- [x] LEELA-FABLE-D-T3 — Wire EstoqueView (S205-T4) a dado real — **✅ GATE PASS `edd395c` 2026-07-12** (seção "Estoque por tamanho" lê a subcoleção real: Vendido/Físico/A-encomendar = campos ∑ do doc, estados como Badge, alerta baixa banner+badge, ações Encomendar/Receber pela matriz canônica do core, terminal sem ação; mobile card-mode ok; 22/22 testes; **review antagonista da ativação = despachada**) · ⚠️ resta da task original: validação de coleta de tamanho no checkout (S209-T2, RN-223) — aguarda ratificação da decisão de estoque #4 (default: validar na origem)

**`LEELA-FABLE-F`** · Cronograma do evento + faixa de chip — Should · M — **JTBD:** T/H1 · doc 04.1 (janela de retirada é a informação de kit; alimenta seção Retirada E12-L2) · sustenta P4.
- [x] LEELA-FABLE-F-T1 — `Evento` ganha cronograma de entrega (janelas dia/local/horário) + faixa/estoque de chips + Rules — M · dep S204 ✅ · **Fable** · ⚔ (Rules novas no `Evento`) · **✅ GATE PASS 2026-07-11** (`7662651` impl + fix `5c83538`; gate emulator Rules PASS 15/15 — promoter/cross-tenant negados, ADR-005/009 intactos; antagonista não-refutado → fix F1 isolamento por-doc na listagem + F3 janela≤prova; unit 77/77. F4 meia-noite = limitação registrada)
- [x] LEELA-FABLE-F-T2 — Banner "Entrega ativa · Dia N de M" + alertas de chip órfão/estoque no balcão (dado real) — S · dep F-T1 · **Opus** (UI) · **✅ GATE VISUAL PASS 2026-07-11** (`96ccd0f`; 4 estados honestos ativa/próxima/encerrada/sem-cronograma; `agora` injetável; alertas de chip reais; gate vivo 1440+390 "Dia 1 de 3 · até 20:00" PASS)

> **🏁 WAVE A COMPLETA (backend + UI) 2026-07-11** — A-T1/A-T2/C-T1/F-T1 (backend) + A-T3/F-T2 (UI), todas gate PASS + pushed. Fix de infra `f60c59e` (preview destravado). **Defeitos fora-de-escopo achados no gate visual, p/ Wave B:** (1) **sidebar não colapsa no mobile 390** = exatamente o M1 do RESP-MOBILE (já mapeado no QA-2) · (2) `QR_TOKEN_KEYS` no env do preview (check-in fail-closed sem ela).

**`LEELA-FABLE-G`** · Logs de comunicação + histórico do registro — Should · M — **JTBD:** S+T/H1 · "Falo com patrocinador → Ter dados na mão" (04.4). **Agregado ÚNICO** consumido por E06-L1 (campanhas) e `S1206-T2` (log de envio do ingresso).
- [ ] LEELA-FABLE-G-T1 — Modelo/expor log de comunicações (e-mail/push, status entrega/abertura) + histórico do registro + Rules — agregado único — M · dep A-T1 · **Fable** · ⚔ (PII/reusável)
- [ ] LEELA-FABLE-G-T2 — Abas Comunicação `[com]` + Histórico `[hist]` do slide-in renderizam o log real (S203) — S · dep G-T1, A-T3 · **Opus** (UI)

### Wave B · F2 RESP-MOBILE — passe mobile real 390×844 · ROTA OPUS · gate Norman (Must V1 — D5)

> Insumo: 7 MAJOR do QA-2, causa-raiz única M1 (shell drawer). Desktop 1440 intocado (0 defeito). UI nova já nasce responsiva (L-004) → varrer só o desktop-only. **Não são regressões.** Ordem: M1→M3→M5→M4→M2/M6/M7. Fidelidade ao mockup segue em desktop; mobile segue o DS.

- [x] LEELA-RESP-QA2-RECON — reconstituir `QA-LIVE-2-REPORT.md` — XS · **Opus** · **✅ FEITO 2026-07-11** (relatório estava preenchido de espaços, conteúdo perdido; reconstituído a partir dos 18 screenshots mobile — todos lidos; 7 MAJOR reconfirmados, 0 achado novo; M1 provado causa-raiz por código: `AppShell` monta Sidebar `w-240px shrink-0` SEM breakpoint; ordem M1→M3·M5·M4→M2·M6·M7→gate confirmada; relatório local em `outputs/`)
- [x] LEELA-RESP-M1-T0/T1/T2 — shell mobile (Sidebar→drawer `<lg` + breakpoints tokenizados + emenda PRD/Playwright-mobile) — M · **Opus** · ⚔ · **🔶 COMMITADO `f0f7a79` 2026-07-11** (rail era flex `shrink-0` 240px sem breakpoint; correção aditiva: rail `hidden lg:block` + `main min-w-0` + Drawer sobre Radix Dialog do Modal; desktop 1440 intocado; gate Norman ✅; DS 940/940 + painel 644/644; ⚔ antagonista **APPROVE** (scroll-y provado intocado; a11y sólida; desktop 1440 intocado; drawer nas 18 rotas). **✅ GATE VISUAL MOBILE 390 PASS** (browser real, 13 shots `shots-m1-mobile/`): rail colapsou 0px em 5/5, drawer completo (hambúrguer/foco/Esc/overlay), **scroll-y sobreviveu** (risco #1), desktop 1440 intocado. Micro-fix z-40 aplicado. **M1 FECHADO.** Gate confirmou o que AINDA quebra em 390 (próximas): **M5 Table** (empurra scroll-x em inscritos/tenants — a maior), **M4 PageHeader** (metadata quebra 1 palavra/linha), **M2 Toolbar** (busca sobrepõe ícones), **M6 EventRow** (métricas cortam); **M3 KpiRow** mais brando (colapsa p/ 2col, lê ok — overview inconclusivo por timing). M7 prose caiu por refluxo.
- [x] LEELA-RESP-M3-T1 — KpiRow grid→1col em 390px — **✅ `302cd02`** (grid-cols-1 <640; 14/14)
- [x] LEELA-RESP-M5-T1 — Table card-mode/scroll contido em 390px — ⚔ — **✅ `c6f6c2f` + fix `33c7390`** (card-mode <lg; antagonista APPROVE-COM-FIXES: select-all mobile em InscritosView + opt-out `responsive="scroll"` p/ matriz EstoqueView + break-words; 31/31)
- [x] LEELA-RESP-M4-T1 — Header truncamento/overflow em 390px — ⚔ — **✅ `9e1f518`** (header do evento é EventoShell bespoke, não PageHeader do DS; empilha ações <lg, metadata flui; 9/9+6/6)
- [x] LEELA-RESP-M2-T1 — Toolbar/CTA mobile — **✅ `a29bb38`** (empilha <lg, busca full-width; 4/4)
- [x] LEELA-RESP-M6-T1 — EventRow mobile — **✅ `0255685`** (card 3 faixas <lg, métricas inteiras; 17/17)
- [x] LEELA-RESP-M7-T1 — prose/intro mobile — **✅ caiu por refluxo do M1** (gate visual confirmou, sem trabalho próprio)
- [x] LEELA-RESP-GATE — Gate visual vivo 390×844 — **✅ PASS 2026-07-11** (11/11 rotas `scrollWidth==390` = zero overflow-x; desktop 1440 sem regressão; gate consolidado DS 960/960 + painel 646/646; evidência `shots-wave-b-final/`)

> **🏁 WAVE B (RESP-MOBILE) COMPLETA 2026-07-11** — os 7 MAJOR mobile do QA-2 resolvidos por causa-raiz M1 (drawer) + M3/M4/M5/M6/M2; cada ⚔ com antagonista + fix; desktop 1440 intocado em toda a onda. Próximo: Wave C (Onda 2) — já com S300-T1 (kernel de vendas) feito.

### Wave C · F3 Onda 2 — delta ratificado (as stories/tasks `[ ]` seguem nas seções "Onda 2 · Vender" acima — NÃO duplicadas aqui)

Registro dos deltas de dependência/rota desta trilha (já anotados in-line nas tasks acima; âncoras JTBD story-a-story em `next-trail/STORIES-next.md §F3`):
- `LEELA-S1203-T5` — **dep NOVA: `LEELA-FABLE-A-T1`** (kernel `pedidos` nasce em FABLE-A; checkout só adiciona o produtor de escrita) — **Fable** · ⚔
- `LEELA-E04-PAY-T1` — o `refund` do seam **reusa** `LEELA-FABLE-B-T1` (não reimplementar estorno) — **Fable** · ⚔
- `LEELA-E06-L1-T1` + `S401-*` — **dep NOVA: `LEELA-FABLE-G-T1`** (mesmo agregado de log) — **Fable**(core) + **Opus**(UI) · ⚔ parcial — E06 campanhas = **V1** (D3)
- `LEELA-S1206-T2` — **dep NOVA: `LEELA-FABLE-G-T1`** (log de envio = mesmo agregado; idempotência de envio sobre o modelo de G) — **Fable** · ⚔
- Faseamento: espinha de venda (E04-slim · E12 · E09-slim · E07-web · E06 campanhas · S821) = **V1 (vender)** · backend do desafio (S1307/S1308) = **V1.5 (engajar)**.

### Wave D · F4 Consolidações — dívida técnica/DS · ROTA OPUS · Should/Could (interleave)

- [ ] LEELA-CONS-1-T1 — Promover `KpiCard`/`StatTile` canônico ao DS (flat §2.16) + showroom + testes — S · dep — · **Opus** · ⚔ (reusável) — **JTBD:** S · "ter dados na mão" (04.4) · enabler G-004
- [ ] LEELA-CONS-1-T2 — Migrar as 4 cópias (eventos/clubes/plataforma/EstoqueView) para o KpiCard do DS — S · dep CONS-1-T1 · **Opus**
- [ ] LEELA-CONS-2-T1 — Ajustar timeout/paralelismo do `EventoLayout.test.tsx` (passa isolado ~1.3s; falha na suíte cheia 8GB) — XS · dep — · **Opus** — enabler de qualidade (sem JTBD de usuário — honesto)
- [ ] LEELA-CONS-3-T1 — `useTenantActions`/`useSaveCommercialTerms` → useMutation + invalidação (read-your-writes) — S · dep — · **Opus** — enabler; persona Admin 03.7 (sem linha no doc — honesto)
- [ ] LEELA-CONS-4-T1 — Backend-dep: nome do owner do tenant (join `profissionais/{ownerUid}`) — XS · dep — · **Fable** (rules/join)
- [ ] LEELA-CONS-4-T2 — Nome canônico do evento na parceria (denormalização) + 5º segmento de comunicado — XS · dep — · **Fable** — **JTBD:** S · "comunidade com rosto e nome" (mapa Clubs) / "ter dados na mão" (04.4)
- [ ] LEELA-CONS-5-T1 — Adotar G-001..G-004 nas definições `~/businesses/software-forge/*` + `~/squads/magic-ds/*` (baseline DS, gate UX, injeção JTBD, KpiCard no checklist) — S · dep — · **Opus** (docs/config) — meta-organizacional (sem JTBD de usuário — honesto)
- [ ] LEELA-CONS-6-T1 — 6 bugs de componente do showroom (Input aria-describedby · DropdownMenu className · Toast duration danger · Card export tipos · comentário Table · CardEvento href+onClick) — S · dep — · **Opus**
- [ ] LEELA-CONS-6-T2 — UX-DADOS lote 2: financeiro/balcão onSnapshot + kits + Clubes + Plataforma mutations → useQuery/useMutation — M · dep UX-DADOS L1 ✅ · **Opus** — **JTBD:** T/S · "Ter dados na mão" (04.4)
