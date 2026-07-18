# TASKS-r9 · Quebra AI-ready da revisão UX (1 task = 1 PR = 1 commit `[LEELA-R9-*]`)

> PROPOSTA revisável. Cada task = 1 commit atômico, staging cirúrgico, trailers de decisão. Roteamento: **Fable** (pagamento/segurança/gate/rules/core-negócio/PII/atribuição) · **Opus** (UI/mecânico/QA). **Sonnet proibido.** `⚔` = review antagonista obrigatório. Estimativa T-shirt (XS<0.5d · S 0.5-1d · M 1-2d · L 2-4d · XL módulo).
> **Território declarado por task** (paralelização segura). Âncoras conferidas por leitura em `STORIES-r9.md`.

---

## Lote R9-A · Conformidade de DS/UI (quick-wins) · ROTA OPUS/DS

> Fundação de consistência. **S-R9-05 abre o lote** (Combobox/Calendar destravam o Lote R9-B). Baixo risco, alto retorno de percepção.

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S-R9-05-T1` | Primitivo `Popover` (âncora) + `Command` (lista filtrável WAI-APG) no DS — tokens semantic, focus 2px, teclado completo, stories | M | `packages/design-system/src/components/{Popover,Command}/**` | — | **Opus/DS** | — |
| `S-R9-05-T2` | `Combobox` (single/multi) sobre Popover+Command + `Calendar`/`DateRangePicker` (react-day-picker + Popover, shadcn) | M | `packages/design-system/src/components/{Combobox,Calendar}/**` | S-R9-05-T1 | **Opus/DS** | — |
| `S-R9-05-T3` | Diretriz shadcn PERMANENTE em `governanca-design.md` (nova §8) + item de gate de UI + sweep dos `<select>`/filtros fora do padrão | S | `leela-specs/governanca-design.md` + `apps/painel` (sweep) | S-R9-05-T2 | **Opus** | — |
| `S-R9-04-T1` | Medição AA real (thumb-OFF×track-OFF do Switch + borda flat×página, 2 temas) + par novo em `NON_TEXT_PAIRS` (20→21) — o teste FALHA com o token atual (prova) | S | `packages/design-system/src/theme/__tests__/contrast.test.ts` | — | **Opus/DS** | — |
| `S-R9-04-T2` | Fix de tokens: `--switch-thumb-off` ≥3:1 sobre track + borda perceptível do flat (component-token, processo §5) + matriz AA verde + showroom 2 temas | S | `packages/design-system/src/components/Switch` + `Input/Select/Textarea` + `tokens/*.json` | S-R9-04-T1 | **Opus/DS** | — |
| `S-R9-10-T1` | Padronizar divisória das sub-navs terciárias dentro de eventos no padrão Comunicação (Tabs `border-b`) — decisão (a) trocar SubNav→Tabs nas terciárias ou (b) variante de SubNav com divisória; inventário já em `STORIES-r9.md §S-R9-10` | S | `packages/design-system/src/components/{SubNav,Tabs}` + layouts `apps/painel/src/routes/eventos/**` | — | **Opus/DS** | — |
| `S-R9-07-T1` | Foto de perfil da conta = upload-only: remover `Input` "Ou cole uma URL" + estado/validação/botão de URL; atualizar teste `ContaPage.test.tsx:109` | S | `apps/painel/src/routes/conta/perfil/**` | LEELA-R5 ✅ | **Opus** | — |

**Gate do lote:** matriz AA (prova numérica S-R9-04) · showroom nos 2 temas · a11y de teclado no Combobox/Calendar · suíte DS + painel verdes. **Decisões que este lote abre:** upload-only morre em todo lugar? (S-R9-07) · divisória supersede SubNav-plano de 2026-07-11? (S-R9-10) — ambas em `DECISOES-ABERTAS`.

---

## Lote R9-B · Análise financeira unificada (`/financeiro`) · ROTA OPUS + Fable (agregado)

> Depende do Combobox+Calendar do Lote R9-A. `/financeiro` JÁ é a análise — este lote FUNDE o placeholder Analytics + adiciona filtro por evento e temporal + re-bucketiza a demografia.

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S-R9-01-T1` | Resolver o placeholder "Analytics" do sidebar (aponta p/ `/financeiro` ou remove) — a Análise vira a superfície única de desempenho+analytics (RN-821) | XS | `apps/painel/src/shell/sidebar.ts` | — | **Opus** | — |
| `S-R9-01-T2` | Filtro por evento na Análise (Combobox shadcn) recorta os 4 blocos; "Todos os eventos" = agregado do tenant; lê agregado `eventos/{id}/…/current` por evento | M | `apps/painel/src/routes/financeiro/analise/**` | S-R9-05-T2 | **Opus** | — |
| `S-R9-01-T3` | Seleção temporal (DateRangePicker shadcn) recorta blocos datados; nota honesta onde o agregado não é série temporal | M | `apps/painel/src/routes/financeiro/analise/**` | S-R9-05-T2 | **Opus** | — |
| `S-R9-02-T1` | Re-bucketização 5-em-5 (RN-822): `FAIXAS_ETARIAS` + `faixaEtariaDaIdade` (default `ate_17/18_24/25_29/30_34/35_39/40_44/45_49/50_54/55_59/60_mais`) + `agregarDemografia` recompute idempotente | S | `packages/core/src/analytics/demografia.ts` + `functions/src/analytics/agregarDemografia.ts` | RN-820 ✅ | **Fable** | ⚔ (PII — só contagens sobem) |
| `S-R9-02-T2` | Cohort idade×sexo na Análise (viz sobre `charts` do DS, tokens brasa) + nota de cobertura `semNascimento`/`semGenero` | S | `apps/painel/src/routes/financeiro/analise/**` | S-R9-02-T1 | **Opus** | — |
| `S-R9-03-T1` | Repasses = visão consolidada explícita: título/subtítulo "todos os eventos" + EmptyState honesto (RN-358) | XS | `apps/painel/src/routes/financeiro/repasses/**` | — | **Opus** | — |

**Gate do lote:** review antagonista no S-R9-02-T1 (confirmar shape fechado sem PII, como RN-820) · AA · suíte verde · medição de recorte por evento/data por leitura.

---

## Lote R9-C · Imagens de evento (kits + capa) · ROTA OPUS + Fable (Storage rules)

> Estende a infra R5 (Storage) com paths de evento. Kits 1:1 e capa horizontal.

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S-R9-08-T1` | Modelo: `imagemUrl?` no `Kit` + `parseKit` + `SalvarKitInput` + Rules; RN-227 (1:1, ≤5MB, allowlist ADR-016) | S | `packages/core/src/eventos/kit.ts` + `functions`/Rules + api-client | — | **Fable** | ⚔ (Rules) |
| `S-R9-08-T2` | Storage path `eventos/{eventoId}/kits/{kitId}` no seam `storage.ts` + `storage.rules` com `firestore.get` do tenant (padrão clube) | S | `packages/api-client/src/storage.ts` + `storage.rules` | S-R9-08-T1, LEELA-R5 ✅ | **Fable** | ⚔ (cross-tenant) |
| `S-R9-08-T3` | Upload 1:1 no `KitEditor` (painel) + thumb na gestão (`KitsCadastroView`) | S | `apps/painel/src/routes/eventos/kits/**` | S-R9-08-T2 | **Opus** | — |
| `S-R9-08-T4` | Thumb 1:1 no card de kit da landing (dobra de kits) | XS | `apps/landing/app/(public)/[eventSlug]/sections/KitsSection.tsx` | S-R9-08-T1 | **Opus** | — |
| `S-R9-09-T1` | Storage path `eventos/{eventoId}/capa` + regra (padrão clube) — se optar por upload; senão reusa `imagemUrl` já suportado | S | `packages/api-client/src/storage.ts` + `storage.rules` | LEELA-R5 ✅ | **Fable** | ⚔ (cross-tenant) |
| `S-R9-09-T2` | Ligar edição da capa/banner (horizontal **1600×838, 1.9:1**, ≤2MB, JPEG/GIF/PNG — RN-228 ratificada) na página de vendas → persiste `Evento.imagemUrl` via `atualizarConfiguracoesEvento`; validação de upload app-level; ajustar `aspect-[16/10]`→1.9:1 no `HeroSection`/`EventoForm`; render no card+hero | M | `apps/painel/src/routes/eventos/pagina-vendas/**` (ou `configuracoes`) | S-R9-09-T1 | **Opus** | — |
| ~~`S-R9-09-T3`~~ | ~~Pesquisa web da dimensão de capa da cheers~~ **RESOLVIDA (removida)** — dimensão fornecida pelo Vitor (adendo 6, fonte spec da Cheers): 1600×838, 1.9:1, ≤2MB, JPEG/GIF/PNG | — | — | — | — | — |

**Gate do lote:** review antagonista nas Rules de Storage (S-R9-08-T2 / S-R9-09-T1 — cross-tenant, SVG banido) · emulator storage.rules (padrão dos 25/25 do R5) · AA.

---

## Lote R9-D · Fluidez de navegação · ROTA OPUS (data-layer)

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S-R9-06-T1` | Auditoria: mapear rotas que re-buscam no mount (TanStack coverage vs `onSnapshot`); referenciar L-002/ADR-010; produzir plano com causa-raiz | S | `apps/painel/src/lib/query/**` (leitura) | — | **Opus** | — |
| `S-R9-06-T2` | Prefetch on-hover/viewport da nav primária + `staleTime`/`gcTime` calibrados p/ rotas visitadas não refetch no mount | M | `apps/painel/src/lib/query/**` + navegação | S-R9-06-T1 | **Opus** | — |
| `S-R9-06-T3` | Skeletons LOCAIS por bloco + suspense boundaries (sem spinner de página cheia) | M | `apps/painel/src/routes/**` | S-R9-06-T2 | **Opus** | — |
| `S-R9-06-GATE` | Medição Playwright: A→B→A entre rotas visitadas < 150ms sem skeleton de página cheia (padrão gate L-001) | S | `e2e/**` | S-R9-06-T3 | **Opus** | — |

**Gate do lote:** critério mensurável em ms (Playwright) + suíte verde.

---

## Lote R9-E · Marketing/marcas antecipado · ROTA FABLE (atribuição) + Opus painel

> Item 11 (afiliado antecipado, ⚔ dinheiro/atribuição) + item 12 (patrocinadores reutilizáveis).

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S-R9-11-T1` | Subcoleção `eventos/{id}/afiliados/{afiliadoId}` (organizador dono: nome/refCodigo único/canal/janela) + core de geração/validação do `refCodigo` (padrão `masterLink` E05) + Rules | M | `packages/core/src/affiliation/**` + `functions`/Rules | E05 ✅ | **Fable** | ⚔ |
| `S-R9-11-T2` | Captura de `?ref=` na inscrição + atribuição na venda por janela (`dentroDaJanelaAtribuicao`), reusando a costura `cupomParceria` do `createInscricaoCharge`, **sem split** (RN-313) | M | `functions/src/checkout/createInscricaoCharge.ts` + `apps/landing` (captura) | S-R9-11-T1, E12 ✅ | **Fable** | ⚔ (atribuição/idempotência) |
| `S-R9-11-T3` | ∑ conversões por afiliado por Function (idempotente, escrita exclusiva) + Rules negam ao cliente (RN-314) | S | `functions/src/affiliation/**` | S-R9-11-T2 | **Fable** | ⚔ |
| `S-R9-11-T4` | Painel do organizador: lista de afiliados + conversões + valor atribuído (informativo, sem comissão) + busca/filtro/EmptyState; **config de novo influenciador via MODAL shadcn** (RN-317) | M | `apps/painel/src/routes/eventos/[slug]/**` | S-R9-11-T3, S-R9-05-T2 | **Opus** | — |
| `S-R9-11-T5` | **Clube como influenciador** (RN-315): `minimoInscricoes` na parceria/afiliado + gate do desconto (ativa só ao cruzar o mínimo; sem retroativo — default) + Rules | M | `packages/core/src/affiliation/**` + `functions`/Rules | S-R9-11-T1 | **Fable** | ⚔ (gate de desconto) |
| `S-R9-11-T6` | **Influenciador PF por convite de e-mail** (RN-316): reusa `provisionAssessoriaAccount` (E18) + rate-limit R2; PII documento mascarado + trust anchors nas Rules | M | `functions/src/assessorias/provisionAssessoria.ts` (reuso) + `functions`/Rules · `apps/landing` (aceite) | S-R9-11-T1, E18 ✅ | **Fable** | ⚔ (provisiona conta/PII) |
| `S-R9-11-T7` | **Dashboard do influenciador PF** (RN-318): vê SÓ as próprias conversões (projeção fechada — qtd/valor/status; nunca dado de terceiros); reader server-side + Rules fail-closed | M | `apps/painel` (ou área do influenciador) + `functions`/Rules | S-R9-11-T3, S-R9-11-T6 | **Fable** (Rules) + **Opus** (tela) | ⚔ (escopo de leitura/PII) |
| `S-R9-11-T8` | **Acompanhamento na aba Clubs, dois lados** (RN-319): organizador vê vendas/conversões de clube-influenciador e PF na aba Clubs dele; clube/influenciador vê as próprias na aba Clubs da própria conta (escopo RN-318) | M | `apps/painel/src/routes/clubes/**` (+ área do influenciador) + `functions`/Rules | S-R9-11-T3 | **Opus** (telas) + **Fable** (Rules) | ⚔ (escopo de leitura) |
| `S-R9-12-T1` | Registro reutilizável de marca/patrocinador (seed E10-S811): `profissionais/{profId}/marcas` + `packages/core/src/brands/marca.ts` + api-client + Rules owner-only | M | `packages/core/src/brands/marca.ts` + `packages/api-client/src/brands.ts` + Rules | shape `ParceriaPatrocinador` ✅ | **Fable** | ⚔ (Rules owner) |
| `S-R9-12-T2` | Autocomplete/seleção da listagem do tenant ao cadastrar patrocínio no evento (RN-171) + lista densa | S | `apps/painel` (Combobox de S-R9-05) | S-R9-12-T1, S-R9-05-T2 | **Opus** | — |

| `S-R9-14-T1` | Port `EmailProvider` provider-agnóstico (padrão ADR-006) + impl de referência `BrevoProvider` (API transacional REST) + `selectEmailProvider` (fail-closed sem `BREVO_API_KEY`; secret no Secret Manager). Trocar provedor = nova impl, zero mudança nos consumidores | M | `packages/core/src/email/**` + `functions/src/email/**` | conta Brevo + key (externa) | **Fable** | ⚔ (secret) |
| `S-R9-14-T2` | Fiar consumidores: convite E18 (`9e7e017` deixa de fail-closed com key), convite influenciador PF (RN-316), canal e-mail do `executarDisparoCampanha` (E06); cada um segue fail-closed sem key | M | `functions/src/assessorias/**` + `functions/src/email/**` + `functions` (E06) | S-R9-14-T1 | **Fable** | ⚔ |
| `S-R9-14-T3` | Template transacional mínimo + **sanitização** dos campos do organizador (anti-phishing/injeção) + testes HTTP mockado + 1 E2E opt-in (padrão `ASAAS_E2E`) | S | `functions/src/email/**` | S-R9-14-T1 | **Fable** | ⚔ (injeção de conteúdo) |

**Gate do lote:** review antagonista no S-R9-11-T2/T3 (atribuição não conta duas vezes, não vaza entre eventos; idempotência) + S-R9-12-T1 (Rules owner) + **S-R9-14-T1/T3 (secret nunca vazado + sanitização de conteúdo do organizador nos templates)**. **Fase 2 (fora deste lote):** comissionamento/repasse ao influenciador (dinheiro → review Fable; decisão em `DECISOES-ABERTAS`).

---

## Lote R9-F · CRM + hub de Comunicação · ROTA FABLE (PII/LGPD) + Opus painel

> **Maior frente. PII/LGPD no coração. Precisa de DECISÃO do Vitor antes de codar** (base legal + unificação CRM/Comunicação + chave de linking).

| Task | Descrição | Est. | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| `S-R9-13-T1` | Modelo CRM: cross-join de identidade do cliente por evento (chave CPF/e-mail) → `crm/clientes` (nome, nº eventos, valor gasto/LTV, sexo, idade, aniversário) — reader server-side, shape fechado; base legal/finalidade/minimização (RN-172) | L | `packages/core/src/crm/**` + `functions/src/crm/**` | inscrições/pedidos ✅ | **Fable** | ⚔ (PII/LGPD) |
| `S-R9-13-T2` | Rules fail-closed: leitura só `isTenantWriter`; nunca afiliado/patrocinador/coordenador; expurgo na exclusão de conta; retenção RN-144 | M | `functions`/Rules | S-R9-13-T1 | **Fable** | ⚔ (PII) |
| `S-R9-13-T3` | Aba CRM no menu principal: lista densa (§2.5) + busca/filtro/EmptyState/paginação + detalhe do cliente (histórico consolidado) | L | `apps/painel/src/routes/crm/**` + `sidebar.ts` | S-R9-13-T1 | **Opus** | — |
| `S-R9-13-T4` | Hub central de Comunicação (item `comunicacao` do sidebar deixa de ser placeholder) — disparo a segmentos do CRM; **sem apagar** comunicação por evento (E06)/clube (E05); decisão de unificação CRM+Comunicação | L | `apps/painel/src/routes/**` + `sidebar.ts` | S-R9-13-T3 | **Opus** | — |
| `S-R9-13-T5` | (oportunidade, fase futura) gatilho de automação `aniversario` conectado ao CRM (E06) — NÃO escopo obrigatório; registrar | — | `functions` (E06) | S-R9-13-T1 | **Fable** | ⚔ |

**Gate do lote:** **review antagonista obrigatório (PII/LGPD)** no T1/T2 — categoria distinta do RN-820; identidade individual sai só server-side, gated por `isTenantWriter`, coerente com A-T2. **Bloqueio:** não codar antes da decisão do Vitor (base legal + unificação + chave).

---

## Resumo de contagem

| Lote | Stories | Tasks | Rota dominante |
|---|---|---|---|
| **R9-A** Conformidade DS/UI | S-R9-04, 05, 07, 10 | 7 | Opus/DS |
| **R9-B** Análise financeira unificada | S-R9-01, 02, 03 | 6 | Opus + Fable (agregado) |
| **R9-C** Imagens de evento | S-R9-08, 09 | 6 | Opus + Fable (Storage rules) |
| **R9-D** Fluidez | S-R9-06 | 4 | Opus (data-layer) |
| **R9-E** Marketing/marcas + e-mail | S-R9-11, 12, 14 | 13 | Fable (atribuição/e-mail) + Opus |
| **R9-F** CRM + Comunicação | S-R9-13 | 5 | Fable (PII) + Opus |
| **Total** | **14 stories** | **41 tasks** | Fable + Opus (Sonnet proibido) |

**Antagonista (⚔):** S-R9-02-T1 (PII agregado) · S-R9-08-T1/T2 + S-R9-09-T1 (Storage rules cross-tenant) · S-R9-11-T1/T2/T3/T5/T6/T7/T8 (atribuição/dinheiro/idempotência/provisiona conta/PII/escopo de leitura) · S-R9-12-T1 (Rules owner) · S-R9-13-T1/T2/T5 (PII/LGPD) · S-R9-14-T1/T2/T3 (secret + injeção de conteúdo de e-mail). **Deliberadamente SEM ⚔** (não inflar): telas de leitura/config sobre dado já gateado, DS/UI de conformidade, viz. **Hipótese HIP-R9-01 (pré-compra)** = pendente validação com organizador; NÃO gera task até ratificar (dinheiro ⇒ Fable + review antagonista quando entrar).

**Ordem de despacho recomendada (por JTBD + dependência):** **R9-A** (abre com S-R9-05, destrava R9-B) ∥ **R9-C** ∥ **R9-D** → **R9-B** (após Combobox/Calendar) ∥ **R9-E** → **R9-F** (por último; gated por decisão do Vitor). Quick-wins de percepção primeiro: S-R9-04 (contraste), S-R9-03 (repasses copy), S-R9-07 (upload-only), S-R9-10 (divisórias).
