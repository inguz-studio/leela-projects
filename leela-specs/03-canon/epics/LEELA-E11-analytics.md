# LEELA-E11 · Analytics do Profissional

- **Superfície:** Painel
- **Horizonte:** H3 (Onda 5 — Expansão)
- **MoSCoW:** Could
- **Estimativa:** L
- **Status:** 🧊 Icebox
- **Depende de:** LEELA-E00 (fundação), LEELA-E01 (Design System & Shell), LEELA-E03 (eventos), LEELA-E05 (clubs)
- **De-para:** BH-E11 (BH-820 · Analytics do Profissional)

## Objetivo

Dar ao **profissional** (organizador ou coordenador) dashboards analíticos que cruzam eventos e clubes num só lugar, materializando as métricas de sucesso do PRD: taxa de conversão em eventos via link master de clube (meta > 3x vs. tráfego direto), novos atletas por clube por mês (via código de convite) e churn de clube mês a mês, além de GMV, % de GMV via parcerias e retenção de atleta 60 dias. É a camada que responde "meu negócio está crescendo?" atravessando os módulos, sem o profissional montar planilha.

Toda métrica lê de **agregados mantidos por Cloud Function** (nunca cálculo ad-hoc no cliente): os KPIs já mantidos em `clubes`, `eventos`, `parcerias` e `comunicados` são consolidados por uma Function de rollup periódica em `profissionais/{profId}/analytics`. Para relatórios pesados/históricos, os agregados podem ser exportados para **BigQuery** sem trocar o banco transacional (ver nota do `modelo-de-dados-firestore.md`).

## Personas & JTBD

- **Persona primária:** Profissional — Organizador (**Marina Castelo**) e Coordenador de Assessoria (**Felipe Martins**).
- **JTBD atendidos:**
  - "Relatório em tempo real sem exportar planilha."
  - "Saber onde meu negócio cresce (conversão, novos atletas, retenção)."
  - "Ter dados na mão para patrocinador e para decisão."

## Critérios de sucesso do épico

- Profissional vê um dashboard consolidado cruzando eventos + clubes, com seletor de período.
- Métrica de conversão via link master de clube é comparável ao tráfego direto (relação alvo > 3x — PRD 7.1).
- Novos atletas por clube/mês (via código de convite) e churn de clube mês a mês são exibidos com série temporal.
- Todos os números vêm de agregados de Function (auditável, idempotente); nenhum cálculo pesado no cliente.
- Estados vazio/carregando/erro cobertos; telas consomem `packages/design-system` (§2.16 flat); nota de export BigQuery registrada e viável.

## Regras de negócio / métricas aplicáveis

- **PRD 7.1 (liderança)** — conversão via link master de clube (> 3x vs. direto); novos atletas por clube/mês; clubes com ≥ 3 desafios/mês.
- **PRD 7.2 (atraso)** — GMV; % GMV via parcerias (clubes + influenciadores); retenção de atleta 60 dias; churn de clube mês a mês.
- **RN-102** — status de membro (novo < 7d, inativo 30d+) alimenta churn/retenção.
- **RN-125 / RN-311** — atribuição de conversão via link master dentro da janela (base da métrica de conversão).
- **Governança de dados** — agregados ∑ mantidos por Cloud Function; escrita apenas via Function (Admin SDK).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Este épico é majoritariamente leitura sobre agregados existentes, mais um rollup consolidado:

- **`profissionais/{profId}/analytics/{periodo}`** (nova subcoleção; `periodo` = `YYYY-MM` ou `rolling-30d`) — ∑ snapshot consolidado: `gmv`, `gmvViaParcerias`, `conversoesViaLink`, `conversoesDiretas`, `novosAtletasPorClube`(map), `churnClubePct`, `retencao60dPct`, `clubesComTresMaisDesafios`, `atualizadoEm`. Mantido por Function de rollup (cron diário + onWrite dos gatilhos financeiros).
- Fontes lidas (não duplicadas): `eventos` (∑`receitaConfirmada`, ∑`qtdInscritos`), `clubes` (∑`qtdMembrosAtivos`, ∑`qtdDesafiosAtivos`, `membros.status` RN-102), `parcerias` (∑`conversoes`, `valorAReceber`), `comunicados` (∑`alcance`).
- **Export BigQuery (nota):** a Function de rollup pode espelhar cada snapshot para um dataset BigQuery (streaming insert) para relatórios históricos/ad-hoc; o banco transacional permanece Firestore.

## Fora de escopo (Won't nesta fase)

- Dados individuais de atleta (só agregados — matriz de tensões de privacidade / LGPD).
- Construtor de relatório customizado / exportação para a marca (H3, portal de mídia).
- BI/visualização avançada e o pipeline BigQuery completo (aqui só a nota e o hook de export; a modelagem do dataset é trabalho posterior).
- Analytics do atleta/app (E13).

---

## User stories

### LEELA-S821 · Dashboard analítico consolidado · (de-para BH-820)

**Como** profissional, **quero** um dashboard que cruza eventos e clubes com seletor de período, **para** ter visão única do meu negócio sem montar planilha.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel · **RNs:** PRD 7.1/7.2, governança de agregados

**Critérios de aceite (Given/When/Then):**
- **Dado** um profissional com eventos e clubes, **quando** abro Analytics, **então** vejo KPIs consolidados (GMV, % via parcerias, inscritos, membros ativos) lidos do snapshot de rollup.
- **Dado** o seletor de período (mês / 30d), **quando** troco, **então** os KPIs e séries recarregam do snapshot correspondente.
- **Dado** um profissional sem dados no período, **quando** abro, **então** EmptyState "Sem dados para o período selecionado"; enquanto carrega, skeleton.

**Tasks:** LEELA-S821-T1, LEELA-S821-T2.

#### LEELA-S821-T1 · Function de rollup de analytics (cron + onWrite) + nota de export BigQuery
- **Tipo:** api/function + data-model · **Depende de:** E03 (eventos), E05 (clubs) · **Bloqueia:** S821-T2, S822, S823 · **Estimativa:** M

**Objetivo**
Criar a Function que consolida agregados de eventos/clubes/parcerias em `profissionais/{profId}/analytics/{periodo}` idempotentemente, com hook opcional de export para BigQuery.

**Contexto & referências**
- Backlog BH-820; métricas do PRD §7; agregados-fonte do `modelo-de-dados-firestore.md` (tabela de agregados ∑).
- Mocks: KPIs canônicos do clube (120 ativos, +12/mês, 47 conversões 30d, R$ 1.128 a receber, taxa média 68% abertura) e do evento (453 inscritos, R$ 85.617) — HANDOFF-05.
- Padrão: distributed counters já usados; rollup lê, não recalcula do zero o transacional.

**Arquivos (criar/editar)**
- `functions/src/analytics/rollup.ts` — cron diário + gatilhos onWrite (venda/conversão) → escreve snapshot.
- `functions/src/analytics/exportBigQuery.ts` — hook opcional de streaming insert (atrás de flag).
- `packages/core/src/analytics/metrics.ts` — fórmulas puras (conversão via link vs direto, churn, retenção 60d, % GMV via parcerias).
- Security Rules — `analytics` legível só pelo dono; escrita só via Function.

**Passos de implementação**
1. Definir o snapshot `analytics/{periodo}` e as fórmulas em `core` (puras, testáveis).
2. Function de rollup: ler agregados-fonte, computar snapshot, escrever idempotentemente (reprocessar não duplica).
3. Hook de export BigQuery atrás de flag de ambiente (nota: dataset modelado depois).
4. Security Rules: leitura owner-only; escrita apenas Function.

**Modelo de dados / contratos**
- Escreve `profissionais/{profId}/analytics/{periodo}` (campos do modelo de dados).
- Function: `rollupAnalytics({ profId, periodo }) -> snapshot`; export opcional para BigQuery.

**Regras de negócio a respeitar**
- Governança — agregados só via Function; RN-102 alimenta churn/retenção; RN-125/311 base da conversão atribuída.

**Critérios de aceite (testáveis)**
- **Dado** agregados-fonte de um período, **quando** rodo o rollup duas vezes, **então** o snapshot é idêntico (idempotente, sem duplicação).
- **Dado** a flag de export ligada, **quando** o rollup roda, **então** um registro é enviado ao BigQuery (mockado em teste).

**Testes a escrever**
- unit: fórmulas de conversão/churn/retenção/% GMV (`core`).
- integração: rollup idempotente (emulator); Security Rules (owner-only, escrita só Function).

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD API/Function).

**Fora de escopo**
- Modelagem completa do dataset BigQuery e dashboards de BI.

#### LEELA-S821-T2 · Tela do dashboard consolidado + seletor de período
- **Tipo:** screen · **Depende de:** S821-T1, E01-S001-3-T1 (Shell) · **Estimativa:** M

**Objetivo**
Renderizar o dashboard consolidado lendo o snapshot de rollup, com KPIs, séries e seletor de período.

**Contexto & referências**
- Backlog BH-820; padrão de KPIs do Club-Overview e Overview do Evento (E02/E03/E05).
- DS: Card de KPI, Skeleton, EmptyState, Tabs (§2.7) se houver seções, gráfico simples (barra/linha) consumindo tokens.

**Arquivos (criar/editar)**
- `apps/painel/app/analytics/page.tsx` — dashboard + seletor de período.
- `packages/api-client/src/analytics.ts` — leitura de `profissionais/{profId}/analytics/{periodo}`.

**Passos de implementação**
1. Ler snapshot por período; renderizar KPIs consolidados.
2. Seletor de período (mês / rolling-30d) que troca o snapshot lido.
3. Estados: skeleton ao carregar, EmptyState sem dados, erro com retry.

**Modelo de dados / contratos**
- Lê `profissionais/{profId}/analytics/{periodo}` (nunca calcula no cliente).

**Regras de negócio a respeitar**
- Números vêm do snapshot (agregado por Function); §2.16 flat; §2.12 estados.

**Critérios de aceite (testáveis)**
- **Dado** dois períodos com snapshots distintos, **quando** troco o seletor, **então** os KPIs mudam para o período selecionado.
- **Dado** período sem snapshot, **quando** abro, **então** EmptyState.

**Testes a escrever**
- unit: componentes de KPI/gráfico (render + estados).
- e2e: trocar período recarrega os KPIs.

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela).

**Fora de escopo**
- Cálculo de métrica no cliente (proibido — só leitura do snapshot).

---

### LEELA-S822 · Conversão e afiliação · (de-para BH-820)

**Como** profissional, **quero** ver a conversão via link master de clube comparada ao tráfego direto, **para** provar o valor da afiliação (meta > 3x).

- **MoSCoW:** Could · **Estimativa:** S · **Superfície:** Painel · **RNs:** PRD 7.1, RN-125, RN-311

**Critérios de aceite (Given/When/Then):**
- **Dado** conversões atribuídas a links master (RN-125/311) e conversões diretas, **quando** abro a seção, **então** vejo a taxa via link vs. direta e a relação (alvo > 3x).
- **Dado** o breakdown por parceiro (clube/influenciador), **quando** listo, **então** vejo conversões e % do GMV via parcerias.
- **Dado** ausência de conversões no período, **quando** abro, **então** EmptyState.

**Tasks:** LEELA-S822-T1.

#### LEELA-S822-T1 · Seção de conversão via link vs. direto + % GMV via parcerias
- **Tipo:** screen · **Depende de:** S821-T1 · **Estimativa:** S

**Objetivo**
Exibir a comparação de conversão (link master vs. direto) e o % de GMV via parcerias, lendo do snapshot.

**Contexto & referências**
- Backlog BH-820; métrica PRD 7.1 (> 3x) e 7.2 (% GMV via parcerias).
- Mocks: performance do clube (234 cliques, 28 conversões, taxa 12%, R$ 528 a receber — Meia Floripa; HANDOFF-05).
- DS: Card de KPI comparativo, Table densa (§2.5) por parceiro, Badge.

**Arquivos (criar/editar)**
- `apps/painel/app/analytics/conversao/page.tsx` — comparativo + breakdown por parceiro.

**Passos de implementação**
1. Ler `conversoesViaLink`/`conversoesDiretas` e `gmvViaParcerias` do snapshot.
2. Renderizar a relação link/direto (destacar meta > 3x) e a tabela por parceiro.
3. EmptyState + contador quando aplicável.

**Modelo de dados / contratos**
- Lê campos de conversão/GMV do snapshot `analytics/{periodo}`.

**Regras de negócio a respeitar**
- RN-125/311 — atribuição por link/janela é a base; leitura de agregado (sem recalcular).

**Critérios de aceite (testáveis)**
- **Dado** conversão via link 3x maior que a direta, **quando** abro, **então** o comparativo destaca que a meta (> 3x) foi atingida.
- **Dado** sem conversões, **quando** abro, **então** EmptyState.

**Testes a escrever**
- unit: render do comparativo por faixa (atingiu/não atingiu meta).

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela).

**Fora de escopo**
- Atribuição em si (mora no fluxo de afiliação — E04/E05).

---

### LEELA-S823 · Comunidade e retenção · (de-para BH-820)

**Como** profissional, **quero** ver novos atletas por clube/mês, churn de clube e retenção 60 dias, **para** entender a saúde da comunidade ao longo do tempo.

- **MoSCoW:** Could · **Estimativa:** S · **Superfície:** Painel · **RNs:** PRD 7.1/7.2, RN-102

**Critérios de aceite (Given/When/Then):**
- **Dado** membros com status derivado (RN-102), **quando** abro a seção, **então** vejo novos atletas por clube/mês (via código de convite) em série temporal.
- **Dado** o histórico mensal, **quando** listo, **então** vejo churn de clube mês a mês e retenção 60 dias.
- **Dado** um clube novo sem histórico, **quando** abro, **então** EmptyState + nota de "dados insuficientes para o período".

**Tasks:** LEELA-S823-T1.

#### LEELA-S823-T1 · Seção de novos atletas, churn e retenção 60d
- **Tipo:** screen · **Depende de:** S821-T1, E05 (clubs/membros) · **Estimativa:** S

**Objetivo**
Exibir as métricas de comunidade (novos atletas por clube/mês, churn de clube, retenção 60d) a partir do snapshot e dos agregados de membros.

**Contexto & referências**
- Backlog BH-820; métricas PRD 7.1 (novos atletas/clube/mês) e 7.2 (churn, retenção 60d); RN-102 (status de membro).
- Mocks: 120 ativos, +12 este mês, 8 novos em 7 dias, 1 inativo (45d — Thiago Bittencourt) — HANDOFF-05.
- DS: Card de KPI, gráfico de linha (série mensal), Table densa (§2.5) por clube.

**Arquivos (criar/editar)**
- `apps/painel/app/analytics/comunidade/page.tsx` — séries de novos atletas, churn e retenção.

**Passos de implementação**
1. Ler `novosAtletasPorClube`, `churnClubePct`, `retencao60dPct` do snapshot.
2. Renderizar série temporal + breakdown por clube; EmptyState para clube sem histórico.
3. Nota de "dados insuficientes" quando o período não tem base.

**Modelo de dados / contratos**
- Lê campos de comunidade do snapshot `analytics/{periodo}`; RN-102 já aplicado na origem.

**Regras de negócio a respeitar**
- RN-102 — status novo/inativo; leitura de agregado (sem recalcular no cliente).

**Critérios de aceite (testáveis)**
- **Dado** um mês com 12 novos e 1 inativo, **quando** abro, **então** os números batem com o snapshot.
- **Dado** clube sem histórico, **quando** abro, **então** EmptyState + nota.

**Testes a escrever**
- unit: render das séries + estado de dados insuficientes.

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela).

**Fora de escopo**
- Métricas individuais de atleta (privacidade/LGPD).

---

## Ordem sugerida

`S821-T1 (Function de rollup + nota BigQuery) → S821-T2 (dashboard) → S822 (conversão) → S823 (comunidade)`. Todas as telas leem o snapshot mantido pela Function; nenhum cálculo pesado roda no cliente. O export BigQuery entra como hook atrás de flag, com a modelagem do dataset deixada para fase posterior.

## Regras de negócio novas (Vitor 2026-07-13 — análise de vendas antecipada)

- **RN-820 (proposta) · Aba "Financeiro" do menu → análise de vendas (antecipa E11 ao nível do profissional):** desempenho de vendas, perfil de compradores (distribuição por idade e sexo), modalidades com mais inscritos e **tamanhos de camiseta mais pedidos** (entrega pré-preparada — quase toda corrida tem camiseta no kit; a fonte já existe: agregado de aprovisionamento por SKU do FABLE-D). Dados derivados dos agregados existentes (dashboard/current, financeiro/current, aprovisionamento) — nunca varredura no cliente.

## Regras de negócio novas (R9 · revisão UX do Vitor 2026-07-18)

- **RN-821 · `/financeiro` = superfície única de análise (desempenho + analytics).** A rota `/financeiro` já é a análise de vendas (index `AnaliseVendasPage`; `/financeiro/repasses`). A entrada "Analytics" do sidebar (`sidebar.ts:31`, placeholder inerte) deixa de ser uma entrada divergente — a Análise É o analytics ao nível do profissional. A Análise passa a aceitar **filtro por evento** (recorta os 4 blocos; "Todos os eventos" = agregado do tenant) e **seleção temporal** (intervalo de datas, calendário shadcn), lendo agregados `eventos/{id}/…/current` por evento — nunca varredura no cliente. Story `S-R9-01`.
- **RN-822 · Buckets etários em bandas de 5 anos.** `FAIXAS_ETARIAS`/`faixaEtariaDaIdade` (`packages/core/src/analytics/demografia.ts`) passam de `ate_17/18_24/25_34/35_44/45_54/55_mais` para bandas de 5 anos (default padrão corrida: `ate_17, 18_24, 25_29, 30_34, 35_39, 40_44, 45_49, 50_54, 55_59, 60_mais`). Idade na data civil da prova, determinística; agregado só de contagens (mesma disciplina de PII do RN-820). Cohort idade×sexo na Análise. Story `S-R9-02`. Spec: `02-rodadas/2026-07-18-ux-review/`.

## Estado de implementação e triage — lote E11-COHORT (trace leela-build-2d6ee98d · 2026-07-19)

### Onde a bucketização etária vive hoje (inventário RN-822)

A conversão idade → bucket acontece numa única camada: `packages/core/src/analytics/demografia.ts` (`FAIXAS_ETARIAS` + `faixaEtariaDaIdade`), consumida na INGESTÃO pela Cloud Function `agregarDemografia`. O doc materializado `eventos/{eventoId}/demografia/current` guarda só CONTAGENS por bucket já fechado (6 faixas grossas `ate_17/18_24/25_34/35_44/45_54/55_mais`) mais o 1D de gênero (`porGenero`). Nunca a idade crua, nunca o cruzamento idade×sexo.

Consequência para o painel: a Análise (`AnaliseVendasView`) lê o agregado grosso e não tem como re-bucketizar em bandas de 5 anos. A informação já se perdeu no fechamento (a faixa `25_34` não se divide em `25_29` + `30_34`). E o cohort idade×sexo do verbatim exige uma matriz `(faixa × gênero)` que o agregado atual não carrega. A premissa do recorte ("se o agregado já entrega idades agregáveis, re-bucketize no painel") não se sustenta contra o código real: o agregado entrega buckets fechados, não idades.

### Por que RN-822 é lote coordenado core+functions (fora desta janela)

A re-bucketização real precisa de: (1) trocar `FAIXAS_ETARIAS`/`faixaEtariaDaIdade` no core para as 10 bandas; (2) para o cohort, somar a matriz `faixaXGenero` a `DemografiaContagens`/`computeDemografia`; (3) redeploy da Function `agregarDemografia` (que importa o core) para produzir o novo shape; (4) reprocesso de todos os `eventos/{id}/demografia/current` (docs antigos ficam no shape velho até reprocessar); (5) atualizar os testes de functions que fixam os buckets antigos.

Os itens 3 a 5 são `functions/**`, bloqueado nesta janela (lane CHECKOUT-FORM). E o painel e a Function têm que concordar no contrato de bucket: virar o union do core sozinho quebra o build da lane de functions (`demografiaCore.test.ts`/`demografia.integration.test.ts` fixam `'25_34'` etc., e o tsc de functions resolve `@leela/core` por source via `paths` do tsconfig raiz). Mexer só no core não é "zero mudança em functions" — viola o próprio gate. Um split-brain (painel em 5 anos, Function em 6 faixas) mostraria idade toda vazia no painel. Por isso RN-822 fica roteada como pendência de backend coordenada, com o painel entrando na sequência.

Sequência quando functions destravar (Fable no core+functions, Opus na viz):
1. core: 10 bandas + (cohort) matriz `faixaXGenero`; suíte do core verde.
2. functions: redeploy `agregarDemografia` + atualizar os 2 testes de bucket; suíte de functions verde; reprocesso dos `demografia/current`.
3. api-client: `DemografiaEvento` ganha a matriz (parse defensivo).
4. painel: `ROTULO_FAIXA` das 10 bandas + viz cohort (stacked por sexo dentro de cada faixa, reusando `charts`/tokens do DS, sem dependência nova) + RTL vazio/sem-nascimento/dados; a nota de cobertura honesta ("confirmados sem nascimento") permanece. PII do RN-820 mantida: só contagens sobem.

### Triage do restante (T2)

Panel-executável, já entregue em rodadas anteriores (nada novo restou para este lote):
- RN-821 · superfície única `/financeiro` + filtro por evento (Combobox) + supressão do placeholder "Analytics" do sidebar (`IDS_SUPRIMIDOS`) + estado do seletor temporal — entregues (R9-B). O seletor temporal é honesto-inerte por ora: os agregados são `…/current`, não série datada, e a View declara a lacuna.
- RN-820 · demografia idade/sexo real — entregue (LEELA-BEPEND-T1).

Backend-gated, pendências nomeadas (`functions/**`, fora desta janela):
- **RN-822** · re-bucketização 5-em-5 + cohort idade×sexo — ver acima (core + functions + reprocesso).
- **S821-T1** · Function de rollup `profissionais/{profId}/analytics/{periodo}` + hook BigQuery — hoje só existe `coletaDiaria` (snapshot diário `analyticsSnapshots`); o rollup consolidado por período não existe. Bloqueia S821-T2, S822, S823.
- **S821-T2** · dashboard consolidado (tela) — depende do rollup S821-T1.
- **S822** · conversão via link vs direto + % GMV via parcerias (tela) — campos de conversão/parceria estão fora do snapshot até E12 gerar atribuição (documentado em `snapshot.ts`).
- **S823** · comunidade: novos atletas/churn/retenção 60d (tela) — depende dos campos do rollup S821-T1.
- **Seletor temporal funcional** (RN-821) — depende de agregado histórico por período, não do `…/current`.

Nenhuma tela de S821-T2/S822/S823 existe em `apps/painel/src/routes/financeiro` (só `analise` + `repasses`), coerente com a dependência do rollup de backend.

### Achado de gate (fora de escopo E11, corrigido para destravar)

O `tsc` do painel estava RED no baseline (4 erros em `apps/painel/src/routes/marcas/__tests__/MarcasPage.test.tsx`, lote MARCAS `d2e7126`: `valorAnual: undefined` sob `exactOptionalPropertyTypes` + destructure de `mock.calls[0]`). Corrigido em `[LEELA-E11-GATE]` (fix type-only, runtime intocado, MarcasPage 7/7) para destravar o gate compartilhado `tsc painel 0`.

## RN-822 ENTREGUE — lote E11-COHORT-BACKEND (trace leela-build-2d6ee98d · 2026-07-19)

Vertical coordenada completa (sf-backend-lead · Fable), commits `aa0afac` (core+functions) → `fcfeda4` (api-client) → `ba2f53c` (painel), tags `[LEELA-RN822-T*]`:

- **Core:** `FAIXAS_ETARIAS` agora são as 10 bandas RN-822 (`ate_17, 18_24, 25_29, 30_34, 35_39, 40_44, 45_49, 50_54, 55_59, 60_mais`); `computeDemografia` soma a matriz `faixaXGenero` (célula exige idade E sexo válidos — Σ matriz ≤ marginais); `demografiaInalterada` compara a matriz (doc antigo nunca "iguala").
- **Salvaguarda LGPD (k-anonimato, `cohortPrivacidade.ts`):** exposição do cruzamento passa por `suprimirCohortPorK` (k=5, reader-side, PÓS-soma): célula 1..4 retém o detalhamento da faixa inteira (R2, anti-subtração) e uma única linha suprimida arrasta a exposta de menor total (R3, anti-diferença contra o marginal `porGenero`). Reader-side porque supressão no write quebraria a soma tenant (células <k de N eventos somam ≥k) — decisão e residual documentados no cabeçalho do módulo.
- **Functions:** `agregarDemografia` persiste a matriz; doc no shape antigo (6 faixas, sem matriz) é reescrito no próximo recompute (chave ausente ⇒ -1); `reprocessarDemografiaTodosEventos` (novo) varre todos os eventos — **premissa de deploy: redeploy + reprocesso são UMA operação**.
- **api-client:** `DemografiaEvento.faixaXGenero`; doc pré-RN822 → `null` (EmptyState honesto até o reprocesso — nunca gráfico zerado fingindo dado).
- **Painel (`financeiro/analise/**` apenas):** card "Idade × sexo (cohort)" na seção Perfil de compradores — `CohortIdadeSexo` (stacked por sexo, tokens do DS + `chartCategoryVar`, tabela sr-only, linha retida mostra só o total + nota do k=5). Nota de cobertura honesta preservada. Rótulos das 10 bandas no 1D.
- **Gates (finais, pós-review):** tsc/eslint 0 (core/functions/api-client/painel) · unit demografia 22/22 · integração 12/12 no emulator de TESTE 8480 (`emulators:exec` + `firebase.r6.json`), incluindo migração de shape antigo, reader na janela de reprocesso e reprocesso idempotente (2ª rodada zero write) · suíte completa do painel 1212/1212 (163 files) · RTL da viz (vazio/sem-nascimento/dados/suprimidas/reprocesso + prova de não-vazamento no DOM).
- **Review antagonista (Fable, contexto fresco): APROVADO COM RESSALVAS → 6 fixes aplicados e re-provados** (`[LEELA-RN822-T4]`): F4 janela deploy→reprocesso agora é DECLARADA (`aguardandoReprocesso` excluído das somas + nota/EmptyState com a causa real — nunca subcontagem muda), F6 guarda de idade fracionária (24.5 geraria chave fora do union), F1/F2/F3 residuais de diferenciação (entre visões RN-821, decomposição mono-sexo, marginal=linha em faixa única) REGISTRADOS em `cohortPrivacidade.ts` com lastro RN-172 e gatilho de bloqueio para exposição futura a papel sem acesso individual. Detalhe no handoff `leela-build-2d6ee98d-RN822.md`.

Seguem backend-gated (inalterados): S821-T1 (rollup), S821-T2, S822, S823, seletor temporal funcional.

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

**Onda 4 · item 5.** É a maior lacuna de planejamento da onda e, ao mesmo tempo, o épico com mais base pronta do que a leitura anterior sugeria. Duas premissas registradas no épico envelheceram e são corrigidas aqui.

### Inventário de reuso — duas correções

**1. O histórico diário já existe.** `functions/src/analytics/coletaDiaria.ts` grava, todo dia às 03:05, `profissionais/{profId}/analyticsSnapshots/{YYYY-MM-DD}` com o subset `OverviewKPIs` (`CAMPOS_KPI_SNAPSHOT`: inscrições, receita confirmada, trends, vagas, taxa de conversão, sparkline, membros ativos, desafios ativos), por substituição total e idempotente, no padrão ADR-015. O rollup de S821-T1 **não parte do zero**: ele agrega a série diária que já está sendo coletada. Isso também é o que torna o **seletor temporal do RN-821 finalmente funcional** — hoje ele é honesto-inerte porque a Análise lê `…/current`, não série datada. Com a série, um intervalo de datas vira leitura de docs, não agregado novo.

**2. A atribuição de conversão já existe.** O corte registrado em `snapshot.ts` diz que `conversoesViaLink`/`gmvViaParcerias` ficam fora "até E12 gerar atribuição". Isso foi pago: o kernel R9-E entregou atribuição por link (RN-313) e o registro de conversões por afiliado (RN-314, `eventos/{eventoId}/afiliados/{afiliadoId}` com ∑ conversões), e o COMF2 somou comissão congelada. **S822 não está mais bloqueada na origem** — falta só levar esses números ao snapshot.

**Armadilha que a agregação precisa respeitar.** Os campos do snapshot diário são de **estoque** (o total naquele dia), não de fluxo. Somar `receitaConfirmada` de 30 dias dá trinta vezes o número errado. Métrica de fluxo no período é **diferença entre as pontas** (valor do último dia menos o do dia anterior ao início); métrica de estoque é o **valor da ponta final**. Errar isso produz um número que parece plausível e não é — o pior modo de falha possível num painel financeiro.

### O que resta

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S821-T1a` | core puro do rollup: agregação de uma janela de snapshots diários em snapshot de período, com a distinção estoque × fluxo explícita e testada; fórmulas de churn, retenção 60d e % de GMV via parcerias | `packages/core/src/analytics` | coletaDiaria ✅ | **opus** xhigh | ⚔ |
| 2 | `S821-T1b` | Function de rollup escrevendo `profissionais/{profId}/analytics/{periodo}` (`YYYY-MM` e `rolling-30d`) idempotente, Rules de leitura pelo dono e escrita só por Function, hook de export BigQuery atrás de flag | `functions/src/analytics` · `firestore.rules` | T1a | **opus** xhigh | ⚔ |
| 3 | `S821-T2` | dashboard consolidado lendo o snapshot de período + **seletor temporal funcional** (fecha a lacuna que a Análise declara honestamente hoje) | `apps/painel/src/routes/financeiro/analise` | T1b | **opus** xhigh | — |
| 4 | `S822-T1` | levar conversão e GMV por parceria ao snapshot, lendo o ledger de afiliados do R9-E/COMF2 — sem contabilidade paralela | `functions/src/analytics` · `packages/core` | T1b · R9-E ✅ | **opus** xhigh | ⚔ |
| 5 | `S822-T2` | seção de conversão via link versus direto, com a relação alvo, e % de GMV via parcerias com breakdown por parceiro | `apps/painel/src/routes/financeiro/analise` | S822-T1 | **opus** xhigh | — |
| 6 | `S823-T1` | seção de comunidade: novos atletas por clube/mês, churn de clube e retenção 60 dias, em série temporal | `apps/painel/src/routes/financeiro/analise` | T1a, T1b | **opus** xhigh | — |

**Por que nenhuma é haiku.** Todas produzem número que o organizador usa para decidir preço, parceria e investimento — e três delas leem o ledger financeiro. Não existe aqui trabalho mecânico com gate determinístico: o gate de um número agregado é a corretude da fórmula, que nenhum linter verifica.

### Ordem interna e grafo

```
S821-T1a (core) ─► S821-T1b (Function + Rules) ─┬─► S821-T2 (dashboard + seletor temporal)
                                                 ├─► S822-T1 (conversão no snapshot) ─► S822-T2 (seção)
                                                 └─► S823-T1 (comunidade)
```

O rollup é o gargalo único: nada de E11 é despachável antes dele. Depois dele, T2, S822-T1 e S823-T1 correm em paralelo (territórios distintos).

### Critério de pronto

- [ ] rodar o rollup duas vezes sobre a mesma janela produz o snapshot idêntico (idempotência provada, não assumida)
- [ ] teste explícito de estoque × fluxo: uma janela onde a receita cresceu R$ 1.000 reporta R$ 1.000, nunca a soma dos totais diários
- [ ] período sem snapshot devolve estado vazio honesto — nunca gráfico zerado fingindo dado (mesma disciplina do RN-822)
- [ ] o número de conversão via link bate com o ledger de afiliados no ambiente de teste (reconciliação, não recálculo)
- [ ] nenhum cálculo pesado no cliente — regra de governança do épico
- [ ] a supressão por k-anonimato do cohort (k=5) continua valendo em qualquer visão nova que cruze demografia
- [ ] review antagonista em contexto fresco nas tasks ⚔

### Fica de fora, e por quê

Dados individuais de atleta (só agregado, por LGPD), construtor de relatório customizado, o pipeline BigQuery completo — aqui entra só o hook atrás de flag —, e analytics do atleta, que é E13.

### Decisão que volta para o Vitor

**O histórico não é retroativo.** A série diária começou quando a `coletaDiaria` subiu; o rollup só enxerga a partir dali. Se o Vitor quiser comparação com períodos anteriores a isso, existe uma reconstrução aproximada a partir do ledger transacional — mas é aproximação, custa um lote próprio e traz risco de número que não bate com o painel. Não decidir isso sozinho. Detalhe em `02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md`.

---

## Regras de negócio novas (IA-MENU · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-ia-menu/`. O item de menu `Financeiro`, que era a porta da análise, deixa de existir; o item `Analytics`, que nunca teve rota, sai do design system. Verbatim e desenho em `00-decisao.md`.

- **RN-823 · A análise de vendas é a Visão geral do CRM.** O destino do analytics ao nível do organizador passa a ser **`CRM › Visão geral`** (`/crm`, índice). A tela é a mesma — desempenho de vendas, perfil demográfico dos compradores, cohort idade × sexo, filtro por evento e seletor temporal — e muda de endereço, não de conteúdo. **Supersede a RN-821 em dois pontos:** (1) a superfície única de análise não é mais `/financeiro`, é `/crm`; (2) a supressão do item "Analytics" deixa de ser um filtro no consumidor (`IDS_SUPRIMIDOS` no `sidebar.ts`) e vira **remoção no `DEFAULT_SIDEBAR_SECTIONS` do design system** — o item não volta por descuido em outro consumidor. O resto da RN-821 (filtro por evento, seletor temporal, leitura de agregados por evento, nunca varredura no cliente) permanece intacto. RN-820 e RN-822 seguem inalteradas.

### Por que a análise vai para o CRM, e não continua sozinha

O Vitor viu o produto do lado de quem usa: *"não vejo no menu principal o CRM ou analytics, pois em análise de vendas e comunicação as coisas estão se misturando um pouco. No financeiro tenho a visão de perfil dos compradores."* Perfil demográfico de comprador é conhecimento sobre cliente — é a mesma pergunta que a lista de clientes responde, só que agregada. Ficavam em dois lugares porque nasceram em épicos diferentes, não porque respondiam a coisas diferentes.

**A disciplina de dado não afrouxa com a mudança de endereço.** A Visão geral continua sendo agregado sem identidade (contagens por bucket, supressão k=5 no cohort, nenhuma leitura de `crmClientes`), e a subdivisão Clientes continua sendo identidade individual (RN-172). A vizinhança nova cria um risco que não existia: um "filtro de clientes por faixa etária" na área CRM reintroduziria a diferenciação que o k-anonimato fecha. Fica registrado como gatilho de bloqueio, com o mesmo lastro dos residuais F1/F2/F3 já documentados em `cohortPrivacidade.ts`.

### Correção do plano de execução escrito hoje (ESPEC-SWEEP)

O plano da Onda 4 acima fixou `apps/painel/src/routes/financeiro/analise` como território de `S821-T2`, `S822-T2` e `S823-T1`. **Esse diretório deixa de existir.** O território correto passa a ser **`apps/painel/src/routes/crm/visao-geral`**, e as três tarefas passam a acrescentar seção a uma tela que vive dentro da área CRM.

Nada mais do plano muda: o grafo (`S821-T1a → S821-T1b → {T2, S822-T1, S823-T1}`), as rotas de modelo (todas opus xhigh, pelo motivo já registrado — o gate de um número agregado é a corretude da fórmula, que nenhum linter verifica), a armadilha estoque × fluxo e o critério de pronto seguem valendo palavra por palavra.

**Ordem entre os dois lotes:** `IAM-T2` (o move) é pré-requisito das três tarefas de tela do E11. Despachar `S821-T2` antes do move significa escrever código num diretório que vai ser movido — retrabalho garantido e conflito de território com a lane IA-MENU. O move é barato, não depende do rollup e vai primeiro.

### Apêndice de execução IA-MENU (2026-07-26 · lane IAMENU-EXEC)

**O move está feito: `IAM-T2` `c1f6f03` (opus xhigh). O pré-requisito de `S821-T2`, `S822-T2` e `S823-T1` está pago — as três podem ser despachadas.**

Território novo confirmado: **`apps/painel/src/routes/crm/visao-geral/**`**. Migraram `AnaliseVendasPage`, `AnaliseVendasView`, `CohortIdadeSexo`, `_lib/{demografia,desempenho,modalidades,tamanhos}`, `_data/analise` e os testes. `apps/painel/src/routes/financeiro/` **não existe mais** (deletado no `IAM-T6`) — qualquer plano que ainda cite aquele caminho está desatualizado.

**RN-823 cumprida na fonte.** A supressão de "Analytics" deixou de ser filtro no consumidor: o item saiu do `DEFAULT_SIDEBAR_SECTIONS` do design system junto com `financeiro`, e o `IDS_SUPRIMIDOS` do painel foi deletado (`IAM-T1` `41fcb73`). A análise agora se alcança por **CRM › Visão geral** (`/crm`), e `/financeiro` redireciona para lá (RN-234).

**Prova de que o move não mexeu em comportamento:** `git diff -M --stat` mostra **0 inserções e 0 deleções** nos 6 arquivos de teste movidos. A supressão k=5 do cohort, a linha companheira arrastada, a nota de cobertura honesta e a exclusão do `aguardandoReprocesso` chegaram intactas — nenhuma asserção foi reescrita, que era o gate.

**Uma mudança de import, e só:** a página passou a usar o `useCrmSession` (mesmo contrato do `useFinanceiroSession`, que viajou com Repasses). Como o caminho relativo `../_data/session` é idêntico nos dois módulos, a troca foi de NOME do hook, não de topologia — e nenhuma cópia nova de sessão nasceu.

## Delta a conversão sem denominador, e o visitante ganha dono (SPEC-METRICAS-SERVICO · 2026-08-05)

O dono deu o exemplo da conversão com o denominador certo e, na mesma frase, declarou que não
tinha contabilizado visitantes. Ele estava certo nas duas pontas. Verbatim em
`02-rodadas/2026-08-05-metricas-e-servico/01-decisoes-dono.md`; varredura completa em
`02-spec-metricas-e-servico.md`.

### RN-489 (nova, dona) · sem denominador não há conversão, e a tela não promete o que não mede

A taxa de conversão é **visitantes sobre pagantes**. A contagem de visitantes **não existe em
lugar nenhum do sistema**, e isso foi medido, não presumido.

Busca por `visitante`, `visitors`, `visitas`, `pageview`, `page_view`, `views`, `visualizacoes`,
`acessos`, `sessions`, `analytics`, `GA4`, `gtag`, `firebase/analytics`, `logEvent`, `plausible`,
`posthog`, `umami`, `measurementId` e `mixpanel` sobre `apps/`, `packages/`, `functions/src/`,
`firestore.rules` e `firestore.indexes.json`:

- **Nenhum SDK instrumentado.** `@firebase/analytics` aparece só no `pnpm-lock.yaml` como
  dependência transitiva do pacote `firebase`; nenhum arquivo importa `getAnalytics` nem
  `logEvent`. Zero `gtag`, zero `<Script>` na landing, zero provedor externo.
- **Nenhum contador próprio no Firestore.** As cerca de 66 coleções declaradas em
  `firestore.rules` não têm `visitas`, `pageviews` nem equivalente, e a landing não faz nenhuma
  escrita de contador.

O denominador não existe nem dentro nem fora do Firestore. Não é o caso de "o dado está no GA e o
painel não alcança": o dado nunca foi coletado.

A função existe e está correta — `derivarTaxaConversao`
(`packages/core/src/overview/kpis.ts:155-161`) devolve `null` sem visitas — e a única chamada real
passa `null` literal, com o motivo escrito no código
(`functions/src/overview/aggregateProfessionalDashboard.ts:195-201`). **A tela nunca inventou
número**, e é isso que salva o item: em produção o card sempre mostra `—`.

A regra crava duas coisas. **Nenhuma superfície exibe conversão derivada de outra coisa** — e o
numerador, quando ela existir, é o de pagantes (RN-486), não o total. E o rótulo
`visitantes → inscritos` (`apps/painel/.../overview/OverviewKpis.tsx:100`) **não é renderizado
enquanto o denominador não existir**: hoje ele aparece sempre, inclusive com valor `—`, e ensina o
organizador a esperar um número que não vem. O que a tela faz no lugar é decisão do dono (item
**CONV-1**), com default de esconder o card.

**Duas conversões diferentes carregam o mesmo nome, e vale separá-las aqui.** Este épico promete
conversão por **atribuição**: cliques em link master de clube contra tráfego direto, meta acima de
3x (PRD 7.1, RN-125/RN-311). O painel exibe conversão por **tráfego**: visitantes sobre inscritos.
São métricas distintas.

**Achado de passagem, registrado como dívida:** quando a conversão aparece com número, ele é
literal de mockup injetado por seed de preview. `functions/scripts/preview-seed-extra.ts:1170-1171`
fixa `CONVERSAO_TAXA_MOCKUP = 68.2` e `:1282` fixa `taxaConversaoPct: 42`, escrevendo por cima do
agregado real com `merge: true` num laço que reescreve até estabilizar; para o dashboard
consolidado, ainda carimba `computadoEm` cerca de dez anos no futuro (`:1172-1174`) para que
`getOverview` nunca recompute. **Rodado contra um projeto que não seja emulador, isso congela o
dashboard daquele profissional permanentemente.**

### RN-490 (nova, dona) · o visitante ganha dono e contrato, e a construção espera o pedido

A conversão por tráfego nunca teve épico. O código atribui a lacuna a um "gap E12"
(`OverviewPage.tsx:6`, `kpis.ts:17`, `queries.ts:232-237`), e o [[LEELA-E12-landing]] também não
especifica coleta de visitas em lugar nenhum. **O visitante era órfão.** Ele passa a ser deste
épico.

Contrato mínimo, para que a primeira vez que alguém pedir não vire improviso:

- **Agregado e por evento**, mantido por Cloud Function como todo agregado da casa, nunca escrito
  pelo cliente. É a mesma governança que este épico já declara para os rollups.
- **Conta sessão, não requisição**, para não inflar com recarga de página e robô. Conversão que
  conta requisição não é conversão, é tráfego bruto.
- **Nasce sem PII** — sem IP em claro, sem identificador de pessoa —, o que a mantém fora do
  escopo do expurgo de retenção e da conversa jurídica aberta no painel.

**Contrato especificado, construção não priorizada.** Não há tarefa na fila desta rodada, pelo
mesmo molde da RN-458: o contador não existe, o dono não pediu para construí-lo, e a regra existe
para que o pedido futuro não nasça improvisado.
