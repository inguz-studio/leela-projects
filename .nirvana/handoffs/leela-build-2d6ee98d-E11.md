# Handoff — lote E11-COHORT (trace leela-build-2d6ee98d)

- **Employee:** sf-frontend-engineer (software-forge) · Opus
- **Data:** 2026-07-19
- **Épico:** LEELA-E11 · Analytics do Profissional
- **Missão:** T1 cohort etário 5-em-5 (RN-822) na Análise unificada · T2 triage do restante de E11
- **Resultado:** TRIAGE + destravamento de gate. Nenhuma tela nova entregue — por decisão de engenharia fundamentada, não por falta de execução (ver abaixo).

## Verdito de engenharia (T1)

A bucketização etária vive numa única camada: `packages/core/src/analytics/demografia.ts` (`FAIXAS_ETARIAS` + `faixaEtariaDaIdade`), consumida na INGESTÃO pela Function `agregarDemografia`. O agregado `eventos/{id}/demografia/current` guarda **contagens por bucket já fechado** (6 faixas grossas) + gênero 1D — **nunca idade crua, nunca idade×sexo**.

Consequências:
- O painel **não pode** re-bucketizar em 5-em-5 (`25_34` não se divide em `25_29`+`30_34`) nem montar cohort idade×sexo (não há matriz 2D). A premissa do recorte ("agregado entrega idades agregáveis") é falsa.
- Virar `FAIXAS_ETARIAS` no core **sozinho** quebra o build da lane de functions: os testes `functions/src/__tests__/demografiaCore.test.ts` e `demografia.integration.test.ts` fixam `'25_34'` etc., e o `tsc` de functions resolve `@leela/core` por **source** (paths do tsconfig raiz). Não é "zero mudança em functions" → viola o gate. `functions/**` está bloqueado (lane CHECKOUT-FORM).
- Split-brain (painel 5-em-5, Function 6 faixas) mostraria idade toda vazia.

→ **RN-822 roteada como pendência de backend coordenada.** Sequência quando functions destravar: core (10 bandas + matriz `faixaXGenero`) → functions (redeploy `agregarDemografia` + atualizar os 2 testes de bucket + reprocesso dos `demografia/current`) → api-client (parse da matriz) → painel (`ROTULO_FAIXA` 10 bandas + viz cohort stacked por sexo, reusando `charts`/tokens do DS, sem dependência nova + RTL). Nota de cobertura honesta permanece. PII do RN-820 mantida (só contagens sobem).

## Triage do restante (T2)

**Já entregue (panel-executável, rodadas anteriores):**
- RN-821 · superfície única `/financeiro` + filtro por evento (Combobox) + supressão do placeholder "Analytics" (`IDS_SUPRIMIDOS` em `shell/sidebar.ts`) + estado do seletor temporal (honesto-inerte: agregados são `…/current`, não série datada). R9-B.
- RN-820 · demografia idade/sexo real (`_lib/demografia.ts` somando `demografia/current`). BEPEND-T1.

**Backend-gated (pendências nomeadas · `functions/**` fora desta janela):**
| Item | Falta | Bloqueio |
|---|---|---|
| RN-822 | re-bucketização 5-em-5 + cohort idade×sexo | core + functions (redeploy + reprocesso) |
| S821-T1 | rollup `profissionais/{profId}/analytics/{periodo}` + hook BigQuery | só existe `coletaDiaria` (snapshot diário `analyticsSnapshots`) |
| S821-T2 | dashboard consolidado (tela) | depende de S821-T1 |
| S822 | conversão via link vs direto + % GMV parcerias (tela) | campos fora do snapshot até E12 (ver `snapshot.ts`) |
| S823 | comunidade: novos atletas/churn/retenção 60d (tela) | depende de S821-T1 |
| Seletor temporal funcional | filtro por intervalo real | precisa de agregado histórico por período |

Nenhuma tela de S821-T2/S822/S823 existe em `apps/painel/src/routes/financeiro` (só `analise` + `repasses`).

## Gates (numéricos)

- **tsc painel:** 0 (estava RED no baseline — 4 erros pré-existentes do lote MARCAS `d2e7126` em `MarcasPage.test.tsx`; corrigidos em `[LEELA-E11-GATE]`, fix type-only).
- **eslint painel (arquivos tocados):** 0.
- **suíte completa do painel:** 1194/1194 (162 files), exit 0. Sem flake NovoClubePage neste run.
- **core / functions:** intocados (zero mudança em código de core/functions).

## Commits

- `e2cea3c` fix(painel): destrava tsc do painel — MarcasPage.test.tsx sob exactOptionalPropertyTypes [LEELA-E11-GATE]
- `a86e062` docs(e11): triage E11-COHORT — RN-822 e restante roteados backend-gated [LEELA-E11-T1][LEELA-E11-T2]
- (este) docs(handoff): checkpoint E11-COHORT

## Onde o Vitor confere

- Épico: `leela-specs/03-canon/epics/LEELA-E11-analytics.md` §"Estado de implementação e triage".
- Boards: `leela-specs/00-boards/BOARD-EPICOS.md` (linha E11) + `V1-CHECKLIST.md` (nota E11).
- Evidência do inventário: `packages/core/src/analytics/demografia.ts` (buckets grossos) · `apps/painel/src/routes/financeiro/analise/AnaliseVendasPage.tsx` (seletor temporal honesto-inerte, comentado no código).

## Nota cross-lane

O `[LEELA-E11-GATE]` toca `apps/painel/.../marcas/__tests__/MarcasPage.test.tsx` — **fora do escopo E11**, corrigido só para destravar o gate compartilhado `tsc painel 0` que estava herdado RED do lote MARCAS. Atribuir a origem (MARCAS), não a E11.
