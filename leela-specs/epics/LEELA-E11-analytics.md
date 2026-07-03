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
