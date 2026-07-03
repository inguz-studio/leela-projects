# Checklist executável — V1 Produtor (web) + app simples

> Como usar: construir na ordem das ondas; cada item é uma task = 1 PR. Marcar `[x]` ao concluir.

> **Multi-tenancy é pré-requisito transversal (ADR-009).** O Leela é uma ticketeira multi-tenant: `S1600` (modelo `tenants` + claims + isolamento por `tenantId` nas Security Rules) vem **antes de qualquer dado de domínio** e por isso mora na Onda 0, junto do E00. Retrofit de isolamento é proibitivo. Toda coleção de domínio (E03/E04/E05) só é segura depois que as Rules de `S1600-T3` estão no lugar.

> **Domínio público.** Todo slug/URL/link master usa `{DOMINIO_LEELA}` (a definir); nunca fixar `be-hero.com.br`/`beh.ro` no código.

---

## Onda 0 · Fundação

Monorepo + Firebase + Auth + CI; Design System (tema `brasa`) + shell; multi-tenancy fundacional. Bloqueia tudo.

### LEELA-E00 · Fundação técnica (completo)

- [x] LEELA-S000-1-T1 — Inicializar monorepo Turborepo + pnpm workspaces
- [ ] LEELA-S000-1-T2 — Scaffold `apps/painel` e `apps/landing` (Next.js App Router)
- [ ] LEELA-S000-1-T3 — Scaffold `apps/mobile` (Expo)
- [x] LEELA-S000-1-T4 — Pacotes `core`, `design-system`, `api-client` (esqueleto)
- [ ] LEELA-S000-2-T1 — Firebase (Firestore + Functions + Auth) + Emulator Suite
- [ ] LEELA-S000-2-T2 — Firebase Auth (email/Google/Apple) + custom claims de papel
- [ ] LEELA-S000-3-T1 — GitHub Actions (lint/type/test/build) + preview deploy
- [ ] LEELA-S000-3-T2 — Sentry (web + mobile) + gestão de env
- [ ] LEELA-S000-4-T1 — Documento de convenções de código
- [ ] LEELA-S000-4-T2 — Interface `PaymentProvider` + adapter mock/sandbox

### LEELA-E01 · Design System temável & Shell (completo, tema `brasa`)

- [ ] LEELA-S001-1-T1 — `tokens.json` (3 tiers) + gerador CSS vars / tema RN
- [ ] LEELA-S001-1-T2 — `ThemeProvider` (web + RN) com troca em runtime
- [ ] LEELA-S001-2-T1 — Button (variantes/estados/a11y)
- [ ] LEELA-S001-2-T2 — Input, Badge, Chip, Avatar, Divider
- [ ] LEELA-S001-3-T1 — Shell (Sidebar + Breadcrumb + Header 96px + SubNav)
- [ ] LEELA-S001-3-T2 — Table densa + EmptyState + paginação + Popover
- [ ] LEELA-S001-3-T3 — Modal + ConfirmModal (§2.15)
- [ ] LEELA-S001-3-T4 — Toast, Cards (Evento/Desafio), Stepper, Skeleton, Tabs
- [ ] LEELA-S001-4-T1 — Catálogo (Storybook) nos 2 temas
- [ ] LEELA-S001-4-T2 — Lint de tokens + doc de governança

### LEELA-E16 · Plataforma & Super-admin (recorte V1 — fundacional multi-tenant)

- [ ] LEELA-S1600-T1 — Modelo `tenants` + tipos + status/lifecycle + Rules base + seed
- [ ] LEELA-S1600-T2 — Custom claims (`role` + `tenantId`) — `setTenantClaims` + propagação
- [ ] LEELA-S1600-T3 — Security Rules multi-tenant (isolamento por `tenantId`) + testes

---

## Onda 1 · Operar

Criar/publicar evento, inscritos, kits, entrega/check-in; dashboard do produtor; clube com membros + comunicação; super-admin mínimo (onboard do tenant + termos comerciais).

### LEELA-E03 · Operação do evento (completo)

- [ ] LEELA-S200-T1 — Tipo `Evento` + query por organizador + Rules
- [ ] LEELA-S200-T2 — Tela Hub de eventos (`/eventos`) + KPIs globais + EmptyState
- [ ] LEELA-S201-T1 — Tela "Novo evento" (form + upload capa/regulamento + preview)
- [ ] LEELA-S201-T2 — Function `criarEvento` + `publicarEvento` (slug, URL, QR)
- [ ] LEELA-S201-T3 — Bloqueio de edição de preço após 1ª venda (RN-200)
- [ ] LEELA-S202-T1 — Layout do evento (header 96px §2.1 + sub-nav §2.14)
- [ ] LEELA-S202-T2 — Dashboard Overview (KPIs, alertas, atividade recente)
- [ ] LEELA-S203-T1 — Subcoleção `inscritos` + tipo + query paginada + Rules
- [ ] LEELA-S203-T2 — Tela de inscritos (tabela densa, paginação, 4 tabs, slide-in)
- [ ] LEELA-S204-T1 — Tela do balcão (layout 60/40 + 3 passos + painel operacional)
- [ ] LEELA-S204-T2 — Function de vínculo de chip + registro de presença
- [ ] LEELA-S204-T3 — Galeria de estados do balcão (§2.9)
- [ ] LEELA-S205-T1 — Modelo `kits` + `itensKit` + N:N Kit↔Item + Rules
- [ ] LEELA-S205-T2 — Tela Kits · Cadastro (sub-nav, cards, catálogo, resumo)
- [ ] LEELA-S205-T3 — Modal de item de kit (tamanhado, origem, patrocinador)
- [ ] LEELA-S205-T4 — Sub-telas Distribuição e Estoque de kits
- [ ] LEELA-S206-T1 — Tela cheia de edição de kit (2 entradas, composição, preço)
- [ ] LEELA-S206-T2 — Nomenclatura "kit" nunca "tier" (RN-216) + guarda de regressão
- [ ] LEELA-S207-T1 — Tela Financeiro do evento (bruto/taxa/líquido, breakdown, CSV)
- [ ] LEELA-S207-T2 — Agregado financeiro do evento por Function

### LEELA-E02 · Visão geral do profissional (completo)

- [ ] LEELA-S600-T1 — Rota `(overview)` + layout 2 colunas + cabeçalho
- [ ] LEELA-S600-T2 — Cloud Function de agregado do dashboard do profissional
- [ ] LEELA-S600-T3 — KPI row (4 cards) consumindo o agregado
- [ ] LEELA-S601-T1 — Seção "Seus eventos ativos"
- [ ] LEELA-S601-T2 — Tabela "Últimas inscrições" (cross-evento)
- [ ] LEELA-S602-T1 — Countdown card do próximo evento + ações rápidas
- [ ] LEELA-S602-T2 — Painel de alertas operacionais

### LEELA-E05 · Clubs (recorte V1 — núcleo + desafio mínimo)

Membros, convites, parcerias, comunicação, configurações + desafio em versão mínima (listar/criar). A execução gameficada anti-streak (jornada diária do atleta) fica em E13 e está fora da V1.

- [ ] LEELA-S101-T1 — Modelo `clubes` + tipos + Security Rules
- [ ] LEELA-S101-T2 — Tela Hub de clubes (2 zonas + KPIs)
- [ ] LEELA-S102-T1 — Shell do contexto de clube (header 96px + sub-nav 6 tabs)
- [ ] LEELA-S102-T2 — Conteúdo do Overview (4 KPIs + novos membros)
- [ ] LEELA-S103-T1 — Modelo `membros` + derivação de status + Function + Rules
- [ ] LEELA-S103-T2 — Tela de membros (tabela densa + busca + filtros + popover)
- [ ] LEELA-S104-T1 — Modal de convite (3 tabs + validações + 4 vias)
- [ ] LEELA-S105-T1 — Modelo `desafios` + `catalogoAcoes` (seed 16) + junção + Rules
- [ ] LEELA-S105-T2 — Tela lista de desafios (KPIs + cards + filtros)
- [ ] LEELA-S106-T1 — Motor de pontuação + validação de modelo (core, desafio mínimo)
- [ ] LEELA-S106-T2 — Editor de desafio (70/30 + modelo dual + preview ao vivo)
- [ ] LEELA-S107-T1 — Modelo `parcerias` + espelho read-only + agregados + Rules
- [ ] LEELA-S107-T2 — Tela de parcerias (3 blocos + aceitar/recusar convite)
- [ ] LEELA-S107-T3 — Modal adicionar patrocinador
- [ ] LEELA-S107-T4 — Modais destrutivos (desativar patrocinador + remover evento)
- [ ] LEELA-S107-T5 — Modal termos do programa (read-only)
- [ ] LEELA-S108-T1 — Modelo `comunicados` + limite de push + agregados + Rules
- [ ] LEELA-S108-T2 — Tela lista de comunicados (KPIs + filtros + popover)
- [ ] LEELA-S109-T1 — Segmentação + validações de comunicado (core)
- [ ] LEELA-S109-T2 — Editor de comunicado (70/30 + preview Push/Email)
- [ ] LEELA-S110-T1 — Tela de configurações (25/75 + scroll spy + 5 seções)
- [ ] LEELA-S110-T2 — Deletar clube (§2.15 + LGPD) + exportação (Function)

### LEELA-E16 · Super-admin mínimo (recorte V1 — onboarding, termos, macro básico)

- [ ] LEELA-S1601-T1 — Function `provisionTenant` (cria tenant + owner + claims, atômico)
- [ ] LEELA-S1601-T2 — Function de lifecycle (`activate`/`suspend`/`reactivate`)
- [ ] LEELA-S1601-T3 — Tela lista de tenants (tabela densa, filtros, saúde)
- [ ] LEELA-S1601-T4 — Tela detalhe do tenant + provisionar/suspender (ConfirmModal)
- [ ] LEELA-S1602-T1 — Modelo `commercialTerms/current` + tipos + Rules (escrita só platform_admin)
- [ ] LEELA-S1602-T2 — Tela/editor de termos comerciais (por tenant)
- [ ] LEELA-S1602-T3 — Contrato de consumo dos termos por E04 (checkout) e E09 (taxa)
- [ ] LEELA-S1605-T1 — Modelo `platform/rollups` + Rules (leitura só admin)
- [ ] LEELA-S1605-T2 — Function de agregação macro cross-tenant (básico)
- [ ] LEELA-S1605-T3 — Tela dashboard macro (KPIs + saúde por tenant, básico)

---

## Onda 2 · Vender

Página de vendas (lotes/cupons), checkout público, afiliação + split + painel self-service do promotor, comunicação do evento. Fecha o ciclo descobrir → pagar → receita.

### LEELA-E04 · Configuração e vendas (completo)

- [ ] LEELA-S300-T1 — Modelo `paginaVendas` + `lotes` + `cupons` + Rules + seed
- [ ] LEELA-S300-T2 — Function de virada de lote (RN-300) + preço vigente por percurso
- [ ] LEELA-S300-T3 — Tela editor de conteúdo da página (seções + SEO + publicar)
- [ ] LEELA-S300-T4 — Modal de lote (virada por data/quantidade, preços por percurso)
- [ ] LEELA-S300-T5 — Modal de cupom (código, tipo, valor, teto, validade)
- [ ] LEELA-S300-T6 — Modal de percurso (preço independente por percurso)
- [ ] LEELA-S301-T1 — Modelo `programaAfiliacao` + `afiliados` + Rules + seed
- [ ] LEELA-S301-T2 — Interface `PaymentProvider` em core + provider mock/sandbox (ADR-006)
- [ ] LEELA-S301-T3 — Function de conversão + atribuição por link master + split idempotente
- [ ] LEELA-S301-T4 — Tela Promotores (lista de afiliados: conversões, cliques, comissão)
- [ ] LEELA-S301-T5 — Modal Configurar programa (%, janela, teto, cupom)
- [ ] LEELA-S301-T6 — Modal Convidar afiliado (clube ou promotor)
- [ ] LEELA-S301-T7 — Tela Detalhe do afiliado (link master, cupom, conversões, a receber)
- [ ] LEELA-S302-T1 — Tela Financeiro com repasses de afiliados (estende S207)
- [ ] LEELA-S302-T2 — Function de agregado de repasse + payout via `getPayout`
- [ ] LEELA-S303-T1 — Marcar comunicação do evento como escopo de E06 (rastreabilidade)
- [ ] LEELA-S304-T1 — Modelo `equipe` + 4 papéis (RN-320) + custom claims + Rules
- [ ] LEELA-S304-T2 — Tela Configurações gerais do evento
- [ ] LEELA-S304-T3 — Tela Equipe e permissões (4 papéis)

### LEELA-E08 · Painel do influenciador (recorte V1 — self-service do promotor)

- [ ] LEELA-S701-T1 — Rota + shell + hub de KPIs do promotor
- [ ] LEELA-S702-T1 — Lista de eventos elegíveis + aceitar afiliação (gera link/cupom)
- [ ] LEELA-S703-T1 — Tabela de conversões com filtros e atribuição por janela
- [ ] LEELA-S704-T1 — Painel financeiro do promotor sobre o split do PaymentProvider

### LEELA-E12 · Landing pública (completo)

- [ ] LEELA-S1200-T1 — Scaffold `apps/landing` (SSR/ISR) + layout público + ThemeProvider
- [ ] LEELA-S1200-T2 — Leitor público server-side + gate de publicação/visibilidade
- [ ] LEELA-S1201-T1 — Rota SSR/ISR do evento + renderizador de seções por configuração
- [ ] LEELA-S1201-T2 — Componentes de seção (Hero, Modalidades, Kits, Retirada, FAQ, Percurso, Patrocinadores, Depoimentos)
- [ ] LEELA-S1201-T3 — Estados públicos do evento (rascunho→404, encerrado, esgotado) + bloco compartilhar/QR
- [ ] LEELA-S1202-T1 — Rota SSR/ISR do clube com gate de visibilidade (RN-140)
- [ ] LEELA-S1202-T2 — Conteúdo da página do clube (hero, bio, desafios públicos, eventos afiliados)
- [ ] LEELA-S1203-T1 — Rota + máquina de estado do Stepper (5 etapas) + preservação de contexto
- [ ] LEELA-S1203-T2 — Etapa Dados (formulário do atleta anônimo + validação)
- [ ] LEELA-S1203-T3 — Etapa Modalidade/Kit (preço vigente; "Sem kit"; RN-216)
- [ ] LEELA-S1203-T4 — Etapa Resumo (order summary + aplicação de cupom)
- [ ] LEELA-S1203-T5 — Etapa Pagamento (`PaymentProvider.createCharge`, Pix/cartão)
- [ ] LEELA-S1203-T6 — Confirmação + webhook idempotente (inscrito→confirmado, ∑ receita)
- [ ] LEELA-S1204-T1 — Captura de link master (`?c=`) + cookie de atribuição por janela
- [ ] LEELA-S1204-T2 — Validação e resolução de cupom de afiliado
- [ ] LEELA-S1204-T3 — Function de conversão + split (∑ conversoes/valorAReceber, janela, teto)
- [ ] LEELA-S1205-T1 — `generateMetadata` dinâmica + OpenGraph/Twitter + JSON-LD Event
- [ ] LEELA-S1205-T2 — `sitemap.ts` + `robots.ts` (eventos publicados + clubes indexáveis)

### LEELA-E06 · Marketing (recorte V1 — só comunicação do evento, push/email segmentado)

Só a frente de comunicação segmentada do evento (Campanhas). A rede de parceiros de marketing (S400) e as automações (S402) ficam fora da V1. S400-T2 entra só como shell mínimo para hospedar Campanhas.

- [ ] LEELA-S400-T2 — Shell de Marketing (sub-nav interna §2.14) — recorte: shell para hospedar Campanhas, sem a sub-tela Parceiros
- [ ] LEELA-S401-T1 — Modelo `campanhas` + segmento derivado de inscritos + estimativa de alcance + Rules
- [ ] LEELA-S401-T2 — Sub-tela Campanhas (lista por estado, alcance/aberturas, filtros)
- [ ] LEELA-S401-T3 — Editor "Nova campanha" (canal, capa, segmento, estimativa ao vivo, variáveis)
- [ ] LEELA-S401-T4 — Function `enviarCampanha` + agregado de alcance/aberturas (limite push, idempotente)

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

### Épicos inteiros adiados

- **LEELA-E07** — Telas de sistema (404/500/offline/403 genéricos).
- **LEELA-E09** — Financeiro consolidado / repasses (além do agregado por evento em S207/S302).
- **LEELA-E10** — Marcas (patrocinadores/ativações).
- **LEELA-E11** — Analytics avançado.
- **LEELA-E14** — Integrações de treino / `TrainingProvider` (Strava/Garmin/Health).
- **LEELA-E15** — Creator Studio (MyDose — desafios/programas + biblioteca + venda).
