# TASKS-onda3 · Quebra AI-ready (1 task = 1 PR = 1 commit `[LEELA-ONDA3-*]`)

> PROPOSTA revisável. Cada task = 1 commit atômico, staging cirúrgico, trailers de decisão. Roteamento: **Fable** (pagamento/segurança/gate/rules/core-negócio/PII) · **Opus** (UI/mecânico/QA). **Sonnet proibido.** `⚔` = review antagonista obrigatório (dinheiro/idempotência/segurança/PII/reusável). Estimativa T-shirt (XS<0.5d · S 0.5-1d · M 1-2d · L 2-4d · XL módulo).
> **Território declarado por task** (paralelização segura). As tasks canônicas vivem nos `epics/`; aqui registra-se a rota + território + delta de dependência da Onda 3. Onde o épico já quebra as tasks (T1/T2/T3), herdam-se os aceites Given/When/Then.

---

## Lote 1 · Robustez financeira/legal (B1) · ROTA FABLE + Opus UI

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S305-T1` | Modelo `politicaVendas` + tipos + Rules (só owner) + seed | M | `packages/core/src/eventos/politica` · `functions/firestore.rules` | E03-S200 ✅ | **Fable** | ⚔ |
| `S305-T2` | Aba "Política de vendas" — reembolso (janela 7d, corte 48h, SLA) | M | `apps/painel/src/routes/eventos/[slug]/configuracoes` | S305-T1 | **Opus** | — |
| `S305-T3` | Transferência de titularidade (flag 72h, taxa) + troca de ingresso (48h, downgrade) | M | `apps/painel/.../configuracoes` | S305-T1, S305-T2 | **Opus** | — |
| `S306-T1` | Flags `exigenciasSaude{atestado,parq}` + campos de regulamento (`regulamentoVersao`) no evento + Rules; subcoleção `saude` isolada (LGPD Art. 11, RN-147) | M | `packages/core` · `functions/firestore.rules` | S305-T1, `EVENTO-CAMPOS` ✅ | **Fable** | ⚔ (dado sensível) |
| `S306-T2` | Aba "Exigências e regulamento" + versionamento (novo aceite RN-149) | M | `apps/painel/.../configuracoes` | S306-T1 | **Opus** | — |
| `S306-T3` | Consentimento destacado + retenção/expurgo do dado de saúde (LGPD) | S | `functions/` + `packages/core` | S306-T1 | **Fable** | ⚔ (LGPD) |
| `S307-T1` | Function `reabrirCapacidadeLote` + auditoria + Rules (reduzir < vendido negado; escrita só por Function; mostra vendido/disponível/configurado) — RN-304 | M | `functions/` + Rules · `packages/core` | `LEELA-BEPEND` (S209-T2) | **Fable** | ⚔ (edita capacidade) |
| `S307-T2` | Editor de capacidade no painel admin (aumentar/salvar; leitura vendido/disponível/configurado) | S | `apps/painel/.../configuracoes` (ou pagina-vendas) | S307-T1 | **Opus** | — |
| `S904-T1` | Subcoleção `reembolsos` + máquina de estados por inscrito (RN-341) + fila de análise do organizador | M | `functions/finance` + Rules · `packages/core` | S305-T1, ADR-011 ✅ | **Fable** | ⚔ |
| `S904-T2` | Execução de estorno via Function (reusa FABLE-B `refund`) + clawback por estado (RN-346) | M | `functions/finance` | S904-T1, FABLE-B ✅ | **Fable** | ⚔ |
| `S904-T3` | Notificações (organizador na abertura, atleta em cada transição — RN-342) | S | `functions/` | S904-T1 | **Fable** | — |
| `S904-T4` | Subcoleção `transferencias` + `titularHistorico[]` + kit/chip (RN-345) + fila | M | `functions/finance` + Rules · `packages/core` | S305-T3, RN-203 | **Fable** | ⚔ |
| `S904-T5` | Fila de reembolso/transferência no painel financeiro (aprovar/recusar, auditada) | M | `apps/painel/.../financeiro` | S904-T1..T4 | **Opus** | — |
| `S1804-T1` | Flag `vendaSomentePorCupom` no evento + guard no checkout (core puro do gate) — RN-303 | S | `packages/core` + guard checkout (`apps/landing` checkout) | E04-S300 ✅ | **Fable** | ⚔ |

**Gate do lote:** adr-conformance **ADR-011** (política/máquina por inscrito) + **ADR-014** (cifra onde o estorno tocar dados de repasse). Kleppmann revisa a fronteira transacional da máquina de estados (`transicoes[]` append-only, idempotência do estorno).

---

## Lote 2 · Web discovery + link-in-bio (B2) · ROTA OPUS + Fable reader

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S1205-T1` | `generateMetadata` dinâmica + OG/Twitter + JSON-LD Event por página de evento/clube | M | `apps/landing` | E12-S1201 ✅ | **Opus** | — |
| `S1205-T2` | sitemap + robots (`publica`⇒noindex, `indexavel`⇒index — RN-140) | S | `apps/landing` | S1205-T1 | **Opus** | — |
| `S1702-T1` | Campo `capaUrl` + upload no painel (clube; evento já tem via `EVENTO-CAMPOS` ✅) | S | `apps/painel` + `packages/core` (clube) | `EVENTO-CAMPOS` ✅ | **Opus** | — |
| `S1702-T2` | Render da capa nos cards/hero com fallback gradiente por categoria (RN-166) | S | `packages/design-system` + `apps/landing` | S1702-T1 | **Opus** | — |
| `S1700-T1` | Rota SSR/ISR `/@{handle}` + leitor `getPublicPerfil` (gate RN-161) + Rules leitura pública de `perfis/{handle}` | M | `apps/landing/app/(public)/[handle]` · `packages/api-client/src/public` · `packages/core/src/public` · `functions/firestore.rules` | E12-S1200 ✅, DN-1 | **Fable** (reader+Rules) + Opus (page) | ⚔ (Rules PII/visibilidade) |
| `S1700-T2` | Componentes das 3 abas (Feed leitura · Eventos · Clubs) + filtro por visibilidade/status por aba | M | `apps/landing` | S1700-T1 | **Opus** | — |
| `S1700-T3` | Estados públicos + bloco compartilhar (URL curta + QR; reusa `ShareBlock` E12) | S | `apps/landing` | S1700-T1 | **Opus** | — |
| `DN-1-T1` | Editor de perfil do organizador no painel (`@handle` imutável RN-160 + bio/visibilidade RN-161) + escrita de `perfis/{handle}` (só dono) + Rules | M | `apps/painel` + `packages/core` + Rules | E01 ✅ | **Fable** (Rules/handle) + Opus (form) | ⚔ (handle imutável/unicidade) |

**Nota:** `DN-1-T1` só entra se o Vitor ratificar a recomendação de `DECISOES-NECESSARIAS-onda3.md §DN-1` (organizador-only na Onda 3). Sem ela, `S1700` fica sem fonte de dado real de perfil. **Data-layer:** SSR/ISR, revalidação por tag `perfil:{handle}`; sem cache de cliente.

---

## Lote 3 · Assessorias parceiras (B3) · ROTA FABLE provisionamento + Opus painel

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S1800-T1` | Tela + form de cadastro no painel + validação de documento (CNPJ/CPF) no core | M | `apps/painel` · `packages/core/src/assessoria/documento` | E05 ✅ | **Fable** (core doc) + Opus (form) | — |
| `S1800-T2` | Function `vincularAssessoriaExistente` (cria clube + parceria quando o responsável já tem conta, idempotente por documento) + Rules (RN-361/362) | M | `functions/` + Rules | S1800-T1, E16 ✅ | **Fable** | ⚔ |
| `S1801-T1` | Dispara convite reusando `enviarConvites` (E05-S104 ✅) + `origem='assessoria_parceira'`/`parceriaRef` | S | `functions/` | S1800-T2 | **Fable** | — |
| `S1801-T2` | Página pública de aceite do convite na landing | M | `apps/landing/app/(public)/convite` | S1801-T1 | **Opus** | — |
| `S1801-T3` | Function `provisionAssessoriaAccount`: Auth + clube + parceria atômico/idempotente (RN-363) + Rules + testes de idempotência (emulador) | M | `functions/` + Rules | S1801-T1, E00 Auth ✅ | **Fable** | ⚔ (provisiona conta) |
| `S1802-T1` | Editor da condição de desconto no painel → cupom `escopo='club_parceiro'`+`clubeRef` (RN-364) | S | `apps/painel` + `packages/core` | S1800-T2, E04-S300 ✅ | **Fable** (cupom core) + Opus (editor) | ⚔ |
| `S1802-T2` | Checkout resolve cupom de club parceiro (reusa `validateCoupon`, adiciona `escopo`; sem split, respeita `commercialTerms` RN-365) | S | `packages/core` + checkout (`apps/landing`) | S1802-T1, E16-S1602 ✅ | **Fable** | ⚔ |
| `S1803-T1` | Lista densa de parceiros (status/documento/condição + busca/filtro/EmptyState) + encerrar (ConfirmModal §2.15 + retenção 90d RN-144) | S | `apps/painel` | S1800-T2 | **Opus** | — |

---

## Lote 4 · Scheduler de campanhas (B4) · ROTA FABLE cron

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S402-T1` | Subcoleção `automacoes/{id}` (gatilho novo_inscrito/kit_disponivel/vespera/pos_evento) + Function de disparo idempotente + Rules | M | `functions/` + Rules · `packages/core` | E06-S401 ✅, FABLE-G ✅ | **Fable** | ⚔ |
| `S402-T2` | Toggle "automação por gatilho" no painel de Marketing | S | `apps/painel/.../comunicacao` | S402-T1 | **Opus** | — |
| `SCHED-T1` | Cloud Scheduler cron → Function varre `campanhas.status='agendada'` (`agendadaPara<=now`), dispara idempotente, marca `enviadaEm` (reusa log FABLE-G) — ADR-015 | S | `functions/` (scheduler) | E06-S401 ✅ | **Fable** | ⚔ (idempotência de disparo) |

**Gate do lote:** adr-conformance **ADR-015** (cron/scheduler). Idempotência = não enviar a mesma campanha duas vezes (marca `enviadaEm` transacional).

---

## Lote 5 · App do atleta E13-slim (B5) · ROTA OPUS mobile + Fable Functions

> Tasks canônicas em `epics/LEELA-E13-app-atleta.md`; herdadas com rota + território. Território-raiz `apps/mobile` (Opus) + `functions/` (Fable, backend do atleta). Alvo 390×844. **Enrollment das lojas (A1) = pré-requisito de S1300-T2.**

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S1300-T1` | Bootstrap `apps/mobile` (Expo Router + core/DS RN + Firebase) | M | `apps/mobile` | E00 ✅, E01 ✅ | **Opus** | — |
| `S1300-T2` | EAS Build/Submit + Sentry mobile + credenciais das lojas | M | `apps/mobile` | S1300-T1, **A1** | **Opus** | — |
| `S1302-T1` | Tab navigator (5 itens) + safe area + deep linking | M | `apps/mobile` | S1300-T1 | **Opus** | — |
| `S1301-T1` | Function `onAtletaCreate` (provisiona `atletas/{uid}` no 1º login) + Rules | M | `functions/` + Rules | S1300-T1 | **Fable** | ⚔ (provisiona conta) |
| `S1301-T2` | Telas de onboarding + entrada (Apple + Google) + gate de sessão | M | `apps/mobile` | S1301-T1 | **Opus** | — |
| `S1304-T1` | Feed de eventos + busca + filtros (aba Eventos) | M | `apps/mobile` | S1302-T1 | **Opus** | — |
| `S1305-T1` | Tela de detalhe do evento + seleção de modalidade/kit (RN-216) | M | `apps/mobile` | S1304-T1 | **Opus** | — |
| `S1306-T1` | `inscricoes` do atleta + Function de conversão (reusa kernel `pedidos` ADR-011 ✅ + `PaymentProvider` sandbox ✅) + Rules | L | `functions/finance` + Rules | S1305-T1, S1301-T1, kernel ✅ | **Fable** | ⚔ (checkout/dinheiro) |
| `S1306-T2` | Tela de checkout (Stepper + cupom + pagamento) + "Meus ingressos" + QR (leitura `qrToken`/`checkinEm`, RN-221/222) | L | `apps/mobile` | S1306-T1 | **Opus** | — |
| `S1310-T1` | Entrar no clube (código/link) + página do clube (membro) — RN-101/140 | M | `apps/mobile` | S1301-T1, E05 ✅ | **Opus** | — |
| `S1311-T1` | Modelo `feed` do clube + Function de agregado + Rules | M | `functions/` + Rules | S1310-T1 | **Fable** | — |
| `S1311-T2` | Tela do feed do clube (leitura — sem compor/postar) | M | `apps/mobile` | S1311-T1 | **Opus** | — |
| `S1312-T1` | Registro de push token (FCM) + entrega de comunicado ao atleta + Rules (RN-133/134) | M | `functions/` + Rules | S1301-T1, E05 ✅ | **Fable** | — |
| `S1312-T2` | Permissão de push + inbox de comunicados + leitura | M | `apps/mobile` | S1312-T1 | **Opus** | — |
| `S1300-GATE` | Gate visual/e2e do app 390×844 (fluxos: login→Início · inscrição→pagamento sandbox→confirmação · clube por código→feed · push→deep link→leitura) — Detox/Maestro | S | `apps/mobile` | todos S13* | **Fable** (veredito de gate) | — |

**Extensão Could (P4, só após B1):** `S1315-T1/T2` (reembolso self-service, dep S904 · Fable Function + Opus tela) · `S1316-T1/T2/T3` (transferência self-service, dep S305/S904 · Fable + Opus). Adiam para Onda 4 se o pipeline nativo não subir cedo.

---

## Resumo de contagem

| Lote | Épicos/recortes | Stories | Tasks (Onda 3) | Rota dominante |
|---|---|---|---|---|
| **B1** Robustez financeira/legal | E04-S305/S306/S307 · E09-S904 · E04-S1804 | 5 | **14** | Fable (dinheiro/LGPD) + Opus (config UI) |
| **B2** Web discovery + link-in-bio | E12-S1205 · E17-S1702/S1700 (+DN-1) | 3 (+1 gate DN-1) | **8** | Opus (landing) + Fable (reader/Rules) |
| **B3** Assessorias parceiras | E18-S1800/S1801/S1802/S1803 | 4 | **8** | Fable (provisionamento/cupom) + Opus (painel) |
| **B4** Scheduler de campanhas | E06-S402 + dispatch ADR-015 | 1 (+scheduler) | **3** | Fable (cron/Function) |
| **B5** App do atleta E13-slim | E13-slim S1300/S1302/S1301/S1304/S1305/S1306/S1310/S1311/S1312 | 9 | **15** (incl. gate) | Opus (mobile) + Fable (conversão/push/auth) |
| **Total** | | **22 stories** | **48 tasks** | Fable + Opus (Sonnet proibido) |

**Antagonista (⚔) — verificado task a task:** S305-T1 (política/dinheiro) · S306-T1/T3 (dado sensível/LGPD) · S307-T1 (capacidade de venda) · S904-T1/T2/T4 (máquina/estorno/transferência) · S1804-T1 (gate de venda) · S1700-T1 (Rules PII/visibilidade) · DN-1-T1 (handle imutável/unicidade) · S1800-T2 (cria clube/parceria) · S1801-T3 (provisiona conta/idempotência) · S1802-T1/T2 (cupom/pricing) · S402-T1 + SCHED-T1 (idempotência de disparo) · S1301-T1 (provisiona atleta) · S1306-T1 (checkout/dinheiro). **Deliberadamente SEM ⚔** (não inflar): telas de leitura/config UI sobre dado já gateado (S305-T2/T3, S306-T2, S307-T2, S904-T5, S1205-*, S1702-*, S1700-T2/T3, S1803, S402-T2, S1301-T2, S1304, S1305, S1306-T2, S1310, S1311-T2, S1312-T2) · gates (S1300-GATE, é o próprio gate).

**adr-conformance por lote:** B1 → ADR-011 + ADR-014 · B2 → (sem ADR novo; reusa E12) · B3 → (reusa E05/E04/E16) · B4 → ADR-015 · B5 → ADR-010 + ADR-011.
