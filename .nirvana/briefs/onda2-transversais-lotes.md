# Onda 2 · Transversais — brief de lotes

Lotes transversais da Onda 2: decisões **6** (coleta E11), **7** (higiene E15), **10** (backend desafio adiantado) + higienes de lint. Tudo **surface-agnostic** (zero tela). Dep: E00/E01/E03/E05/E16-slim (Onda 1, feitos/em-fix). 1 task = 1 commit atômico. Roteamento: **Fable** = core/Functions/rules/segurança; **Opus** = arquivos de painel.

## Cortes registrados no topo (spec original × decisões do Vitor)

- **E11 — só coleta.** Cortadas desta onda: dashboard consolidado (S821-T2), conversão link×direto e % GMV via parcerias (S822), comunidade/churn/retenção 60d (S823). Motivos: telas são Onda 3; S822 depende de E04+E12 **e** de afiliação, que **saiu da V1** (decisão adicional). Entra só o **rollup de coleta** (S821-T1 fatiado): persistir o snapshot diário do agregado que **já existe** — histórico não é backfillável (decisão 6).
- **E11 — sem métrica de parceria/afiliação.** `conversoesViaLink`/`gmvViaParcerias` **não** entram no snapshot agora (sem afiliados neste início). Campos ficam **fora** do tipo até E12 gerar atribuição; readicionáveis sem migração (o snapshot é aditivo).
- **E11 — BigQuery só nota.** Modelagem de dataset e streaming insert ficam atrás de flag desligada + comentário. Não há build de pipeline nesta onda.
- **Desafio — sem telas.** S1307-T2 e S1308-T2 (Arena/detalhe, mobile) **não** entram (decisão 10: lote surface-agnostic). O app do atleta (E13) é Onda 3.
- **Desafio — sem medalhas.** S1309 (concessão de recompensa `medalhas` + estante) **cortada por inteiro** (decisão 3). Nenhum grant de recompensa, nenhuma coleção `medalhas`. `recompensaTipo` do desafio permanece como metadado, sem motor de concessão.
- **Desafio — ranking vira board de consistência.** O "ranking competitivo" que a spec E13 marca como fora de escopo é substituído por **board de consistência** (decisão 2: leaderboard como board de consistência, ético anti-streak). Ordena por dias ativos, não por volume bruto.
- **E15 — só higiene.** Nada de Creator Studio (sem spec, sem épico). Só `autorId` + campo de anexo opcional no tipo `Desafio` (decisão 7). Biblioteca de materiais gated fica congelada até a V1 validar.

---

## Proposta concreta: onde nasce o padrão de cron/scheduler

**Correção factual (a WIKI e a proposta de revisão estão desatualizadas):** o cron **já existe** no repo. `functions/src/clubs/recalcularStatusMembros.ts` roda `pubsub.schedule('every day 03:00').timeZone('America/Sao_Paulo').onRun()` (firebase-functions **v1**) desde a Onda 1. Não há "primeiro cron a nascer" — há um **padrão a formalizar**, e a coleta E11 é a segunda tarefa agendada e o momento certo de fixá-lo.

**Convenção proposta (ADR-007 · a decidir pelo consolidador):**
1. **Wrapper v1 pubsub.schedule** + `.timeZone('America/Sao_Paulo')` + `.onRun()`, log via `firebase-functions/logger`. Precedente: `recalcularStatusMembros`.
2. **Núcleo puro separado do wrapper.** Toda lógica mora numa função `*Core(db, agora)` exportada, **testável no Emulator sem o scheduler** (o Emulator `--only firestore,auth` NÃO sobe pubsub — o cron nunca dispara sozinho no CI; testa-se chamando o Core direto, exatamente como `recalcularStatusMembrosCore`).
3. **Horários escalonados e ordenados por dependência.** `03:00` recalcula status de membro (existente) → `03:05` coleta E11 (nova), para o snapshot ler `membros.status`/`qtdMembrosAtivos` **já reprocessados** pelo envelhecimento do dia. Ordem é aceite, não detalhe.
4. **Sem registry/índice de crons** por ora (2 tarefas não justificam abstração). Documentar a convenção em `convencoes-codigo.md` + ADR-007.

Isso responde à decisão 6/7 ("decidir junto onde nasce o padrão de cron"): **nasce onde já nasceu (clubs), formaliza-se aqui (analytics).** E12/E09 (outras ondas) reusam o mesmo wrapper, sem inventar um segundo mecanismo.

---

## Lote T2-L1 · Coleta E11 — rollup de snapshot diário — FABLE

Backend puro. Persiste, um doc por dia por profissional, uma cópia imutável do agregado `profissionais/{profId}/dashboard/current` **que já existe** (mantido por `aggregateProfessionalDashboard`, E02). É o mínimo que preserva histórico: a granularidade **diária** é a mais fina não-reconstruível; mês/rolling-30d se derivam dela depois (Onda 3).

- **Tasks:** S821-T1a (tipo + Rules), S821-T1b (cron + Core + seed + nota BigQuery)
- **Superfície:** `packages/core/src/analytics/snapshot.ts`, `functions/src/analytics/coletaDiaria.ts`, `functions/src/seed/analyticsSnapshots.seed.ts`, `firestore.rules`
- **Dep:** E02-L1 (`dashboard/current` + `DashboardCurrent`), E03-L1/E05-L1 (agregados de origem). **Não bloqueia nada da Onda 2** (só consumido por telas de Onda 3).
- **RNs:** governança de agregados (∑ só via Function), RN-102 (status alimenta a série de comunidade futura).

**S821-T1a — `core/analytics/snapshot.ts` + Rules**
- Define `AnalyticsSnapshot` = `{ data: string /* YYYY-MM-DD */, profId: string, capturadoEm: number }` **estendendo `OverviewKPIs`** (o tipo canônico já em `packages/core/src/overview/kpis.ts`: `receitaConfirmada`, `inscricoesTotais`, `inscricoesTrendPct`, `vagasRestantes`, `membrosAtivosTotais`, `desafiosAtivosTotais`, `taxaConversaoPct`, `conversaoSparkline`). **NÃO** estender nem importar `DashboardCurrent`: ela vive em `functions/src/overview/aggregateProfessionalDashboard.ts` (camada de Function, `core` não pode importá-la) e só acrescenta `alerts: OverviewAlert[]` + `computadoEm` sobre `OverviewKPIs`; `alerts` é estado de UI transitório (referencia slugs vivos de evento), **fora** do snapshot histórico imutável. Função pura `montarSnapshot(kpis: OverviewKPIs, profId, data): AnalyticsSnapshot` — **copia campo a campo, zero recálculo**.
- Rules: `profissionais/{profId}/analyticsSnapshots/{data}` — leitura só do dono (`isOwner(profId)`), **escrita negada ao cliente** (só Admin SDK). Docs passados são imutáveis (Rule nega update de doc de data anterior).
- **Aceite (falsificável):**
  - `montarSnapshot(kpis, 'marina', '2026-07-04')` retorna objeto com `data==='2026-07-04'` e os mesmos números de `kpis` campo a campo (teste unit compara todos os campos de `OverviewKPIs` — cópia fiel, zero recálculo; `alerts` **não** aparece no resultado).
  - Cliente autenticado como `marina` **lê** `profissionais/marina/analyticsSnapshots/2026-07-04`; cliente `felipe` **não lê** o de `marina` (Rule nega, `*Rules.integration.test.ts`).
  - Cliente tenta `set` em `analyticsSnapshots/{qualquer}` → negado (só Function escreve).

**S821-T1b — `functions/src/analytics/coletaDiaria.ts` (cron) + seed + nota BigQuery**
- Núcleo `coletarSnapshotsDiariosCore(db, data = hoje)`: itera `profissionais`, lê o doc `dashboard/current` (um `DashboardCurrent`) de cada um (recomputa via `recomputeProfessionalDashboard` **se ausente/stale**), **extrai o subset `OverviewKPIs`** desse doc (descartando `alerts`/`computadoEm`), chama `montarSnapshot(kpis, profId, data)` e grava `analyticsSnapshots/{data}` por **substituição total** (rerun do mesmo dia = mesmo conteúdo; nunca toca dias passados). Idempotente. Aqui — na Function, não em `core` — é o único ponto que toca `DashboardCurrent`.
- Wrapper `coletaDiaria = pubsub.schedule('every day 03:05').timeZone('America/Sao_Paulo').onRun(...)` chamando o Core (padrão do lote acima).
- Hook BigQuery: `exportSnapshotBigQuery(snapshot)` **atrás de flag de ambiente desligada** + comentário "dataset modelado em fase posterior". Sem SDK BigQuery real nesta onda.
- Seed: gera 3–5 dias de snapshots mock para Marina (GMV/inscritos/membros dos mocks HANDOFF-05) — habilita testar a série antes das telas de Onda 3.
- **Aceite (falsificável):**
  - `coletarSnapshotsDiariosCore(db, '2026-07-04')` rodado **duas vezes** produz doc idêntico em `analyticsSnapshots/2026-07-04` (idempotente, `*.integration.test.ts` no Emulator — chamando o Core, não o scheduler).
  - Rodar `coletarSnapshotsDiariosCore(db, '2026-07-05')` **não altera** o doc `2026-07-04` (histórico preservado; asserção sobre o doc do dia anterior).
  - Snapshot de Marina bate com `dashboard/current` de Marina no instante da coleta (GMV/inscritos/membros iguais).
  - Flag BigQuery ligada em teste → `exportSnapshotBigQuery` é chamado 1×/profissional (mock espionado); desligada → 0 chamadas.

---

## Lote T2-L2 · Backend do desafio adiantado — FABLE

Surface-agnostic (decisão 10). Registro de ação validado pelo **motor de pontuação que já existe** (`calcularPontos`, E05-S106-T1) + participação + **board de consistência** agregado. Zero tela. O app do atleta (E13, telas T2) é Onda 3 e consome isto pronto.

- **Tasks:** S1307-T1 (registros + agregação de pontos), S1308-T1 (participação), S1308-T3 (board de consistência · **novo**, decisão 2)
- **Superfície:** `packages/core/src/atleta/registro.ts`, `packages/core/src/clubs/participacao.ts`, `packages/core/src/clubs/consistencia.ts`, `functions/src/jornada/{onRegistroWrite,entrarNoDesafio,boardConsistencia}.ts`, `functions/src/seed/{registros,participantes}.seed.ts`, `firestore.rules`
- **Dep:** E05-L1 (`clubes`, `membros`), E05-L2 (`desafios`+`catalogoAcoes`+`calcularPontos` — **todos feitos**). Registro exige um `atletas/{uid}` pai mínimo (ver decisão aberta).
- **RNs:** RN-114 (16 ações/3 pilares), RN-115 (bônus +20%/+10% acumuláveis), RN-110/111 (conclusão por modelo), RN-117 (visibilidade).

**S1307-T1 — `registro.ts` + `onRegistroWrite` + Rules + seed**
- `type Registro` (`acaoRef`, `pilar`, `quantidade`, `unidade`, `data`, `origem`, **`clubeId?` + `desafioId?`** para resolver o path aninhado — ver decisão de path) + validação pura de quantidade/unidade por ação.
- `functions/src/jornada/onRegistroWrite.ts`: onWrite de `atletas/{uid}/registros/{id}` → calcula pontos via `calcularPontos` (`core`), aplica **RN-115** (+20% se 3 pilares no dia, +10% se 5+ dias na semana, acumulam), agrega em `participantes/{uid}` (`pontos`, `pontosPorPilar`, `diasAtivos`) e nos ∑ do desafio (`progressoPct`, `qtdParticipantes`). **Idempotente** (reprocessar não duplica).
- Rules: `atletas/{uid}/registros/**` escrita só do dono; `participantes/**` e ∑ do desafio só via Function.
- **Aceite (falsificável):**
  - Registros em 3 pilares no mesmo dia → agregado aplica **+20%**; com 5+ dias distintos na semana → **+10%**; ambos → acumulam (unit sobre o Core + integration da Function).
  - Reprocessar o mesmo `registro` (retry at-least-once) → `participantes/{uid}.pontos` **não muda** (idempotente).
  - Cliente escreve `participantes/{uid}` direto → negado (Rule). Cliente escreve `registros` de **outro** uid → negado.

**S1308-T1 — `participacao.ts` + `entrarNoDesafio` + Rules**
- `podeParticipar(desafio, atleta, membro?)` puro (**RN-117**: só-membros / convite / público).
- Callable `entrarNoDesafio`: cria `participantes/{uid}` (idempotente) + incrementa `qtdParticipantes` por recontagem `count()`.
- Rules: leitura de `participantes` conforme visibilidade; escrita de entrada validada no servidor.
- **Aceite (falsificável):**
  - Desafio "só membros" + atleta não-membro chama `entrarNoDesafio` → **negado** (RN-117).
  - Chamar `entrarNoDesafio` 2× para o mesmo uid → 1 doc de participação, `qtdParticipantes` incrementa **uma vez** (idempotente).
  - Desafio "público" + qualquer atleta → entra e passa a constar em `participantes`.

**S1308-T3 — `consistencia.ts` + `boardConsistencia` (novo · board de consistência)**
- Substitui ranking competitivo por **board ético anti-streak** (decisão 2). Core puro `ordenarPorConsistencia(participantes[])`: ordena por **dias ativos distintos** na janela do desafio (desc), desempate por pontos (desc). **Não** ordena por volume bruto.
- `functions/src/jornada/boardConsistencia.ts`: mantém `clubes/{clubId}/desafios/{desafioId}/board/current` (top-N materializado) por recontagem, atualizado no fan-out de `onRegistroWrite`.
- Rules: `board/current` leitura por membro/visibilidade, escrita só Function.
- **Aceite (falsificável):**
  - Atleta A com 5 dias ativos / 40 pts e atleta B com 3 dias ativos / 90 pts → **A vem antes de B** no board (consistência > volume; unit sobre o Core).
  - Empate em dias ativos → desempata por pontos (asserção de ordem).
  - Registrar ação nova de um participante recomputa `board/current` (integration); cliente não escreve `board` (Rule).

---

## Lote T2-L3 · Higienes — FABLE (E15) + OPUS (lint)

Duas edições XS independentes, sem dependência entre si.

**S105-hig — E15: `autorId` + anexo no tipo `Desafio` (XS · Fable · decisão 7)**
- Editar `packages/core/src/clubs/desafio.ts`: adicionar `autorId: string` (generaliza o dono — hoje implícito no path `clubes/{clubId}/desafios`; prepara Creator Studio sem migração cara) + `anexo?: DesafioAnexo` (tipo opcional **previsto, não implementado** — `{ tipo: string; url: string }` ou similar). Popular `autorId = ownerId do clube` no seed de desafios.
- Superfície: `packages/core/src/clubs/desafio.ts` (+ `functions/src/seed/desafios.seed.ts`). **`.index-mutex`** se tocar barrel `clubs/index.ts`.
- **Aceite (falsificável):**
  - `Desafio` tem `autorId: string` obrigatório e `anexo?` opcional (type-check falha se `autorId` ausente num literal de desafio).
  - Seed de desafios grava `autorId` = owner do clube pai; suíte E05 permanece **verde** (nenhuma regressão nos 531/531).

**S1601-hig — PlatformShell lint (XS · Opus · consistent-type-imports)**
- `apps/painel/src/routes/plataforma/_components/PlatformShell.tsx` linha 61 usa import de tipo inline `import('@leela/core').Role`, que a regra `@typescript-eslint/consistent-type-imports` reprova (resíduo do commit e5ce3a5). Fix: adicionar `import type { Role } from '@leela/core';` no topo e trocar `import('@leela/core').Role | null` por `Role | null`.
- **Aceite (falsificável):**
  - `eslint` em `PlatformShell.tsx` → **0 erros** de `consistent-type-imports`; `pnpm tsc` limpo; render do PlatformShell (RTL existente) permanece verde.

---

## Sequência interna

`T2-L1 ∥ T2-L2 ∥ T2-L3` — **os três lotes são paralelizáveis entre si** (superfícies disjuntas). Ordem interna: L1 `T1a→T1b`; L2 `S1307-T1 → (S1308-T1 ∥ S1308-T3)` (board e participação dependem de registros; S1308-T3 também precisa do agregado de S1307-T1); L3 as duas tasks independentes.

## Paralelismo entre épicos / barreiras compartilhadas

- **`firestore.rules`** é a barreira única (arquivo compartilhado, `.rules-mutex`): L1 adiciona bloco `analyticsSnapshots`, L2 adiciona `registros`/`participantes`/`board`, L3(E15) não toca rules. Serializar sob mutex; relê do disco ao adquirir (convenção WIKI §3).
- **`functions/src/seed/*`** — um seed por coleção (baixo risco).
- Contra a Onda 2 comercial (E04/E12/E09 de outros planners): **zero conflito de superfície** — analytics/jornada são pastas novas; a única sobreposição é o **padrão de scheduler** (esta é a fonte da convenção; E12/E09 reusam). Coordenar via ADR-007.

## Riscos / entidades compartilhadas

- **`participantes`/`board`** nascem aqui e são consumidos pelas telas de E13 (Onda 3) — este lote é primeiro-movedor do domínio jornada.
- **Path do desafio:** a spec E13 escreve `desafios/{id}/participantes`, mas a realidade E05 (ADR-009) é aninhada: `clubes/{clubId}/desafios/{desafioId}`. O lote **deve usar o path real aninhado**; `Registro` carrega `clubeId`+`desafioId` para resolvê-lo (ver decisão aberta).
- **`atletas/{uid}` mínimo:** S1307-T1 grava sob `atletas/{uid}/registros`, mas o auth/model do atleta (E13-S1301) é Onda 3. Backend testado via **seed de `atletas`** no Emulator; a claim `athlete` já é modelada (mergeTenantClaims remove tenantId para `athlete`).
- **Coleta depende de E02 rodando:** o snapshot copia `dashboard/current`. Se um profissional nunca teve write (dashboard ausente), o Core recomputa via `recomputeProfessionalDashboard` antes de snapshotar — custo aceitável no cron noturno.

## Decisões em aberto (para o consolidador / Vitor)

1. **ADR-007 (padrão de cron):** aprovar a formalização proposta (v1 pubsub.schedule + Core puro + horários escalonados 03:00→03:05) e **corrigir a WIKI/proposta** que afirmam "cron não existe" — ele existe desde `recalcularStatusMembros`. Consolidador decide se E12/E09 ficam obrigados a este padrão.
2. **Granularidade do snapshot E11: diário (proposto) vs mensal.** A task pediu "snapshot diário"; a spec E11 e a proposta falavam `YYYY-MM`+rolling-30d. Proponho **diário** (`analyticsSnapshots/{YYYY-MM-DD}`), do qual mês/rolling se derivam depois. Confirmar path e grão — vira contrato das telas de Onda 3.
3. **Métrica exata de "consistência" (board):** proposto = dias ativos distintos na janela, desempate por pontos. GymRats/anti-streak admite variações (dias distintos totais vs semana corrente vs % de dias com registro). Vitor decide a definição canônica antes de S1308-T3.
4. **Path do desafio (aninhado × top-level):** confirmar `clubes/{clubId}/desafios/{desafioId}/participantes` (ADR-009, realidade E05) como verdade e que `Registro` carrega `clubeId`+`desafioId`. A spec E13 usa `desafios/{id}` top-level — precisa ser reconciliada (corte de path).
5. **`atletas/{uid}` mínimo na Onda 2:** aprovar seed de atletas para testar o backend de jornada antes de E13-S1301 (auth do atleta) existir. Sem isso, S1307-T1 não tem doc pai para registros no Emulator.
6. **E15 higiene — commit isolado vs fold:** `desafio.ts` (E05-L2) **já está mergeado**, então a higiene é um commit XS aditivo autônomo (não dá para dobrar em S105-T1). Confirmar que edição do tipo + seed não requer bump de versão de nenhum consumidor de `Desafio`.
7. **Retenção de snapshots diários:** um doc/dia/profissional cresce indefinidamente. Definir TTL/rollup-e-descarte (ex.: consolidar diários em mensal após 90d) — pode ficar para Onda 3, mas registrar a decisão de não deixar crescer sem teto.
8. **Snapshot carrega só os KPIs numéricos (`OverviewKPIs`), sem `alerts`.** Layering: `AnalyticsSnapshot` (core) estende `OverviewKPIs` (core); `DashboardCurrent` (functions) não é importável por `core` e seu `alerts` é UI transitória (slugs vivos) — não vai para o histórico. Confirmar que as séries/telas de Onda 3 não precisam do histórico de alertas; se precisarem, alertas viram coleção própria versionada, não campo do snapshot. Escolha de field-parity: o snapshot reusa **os nomes reais** de `OverviewKPIs` (`inscricoesTotais`, `membrosAtivosTotais`, `desafiosAtivosTotais`…), não os nomes soltos dos mocks (`inscritos`, `qtdMembrosAtivos`).
