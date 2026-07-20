# Handoff · lane ESPEC-SWEEP · run leela-build-2d6ee98d — ✅ FECHADA

- **Empresa/employee:** software-forge · sf-cto · rota **opus** effort xhigh
- **Ordem do Vitor (2026-07-19):** revisitar TODOS os épicos do roadmap e escrever o passo a passo de planejamento e specs deles, na ordem em que serão implementados.
- **Escopo:** 100% planejamento/spec. **Zero código de produto** — cumprido.
- **Território:** `leela-specs/**` + `outputs/leela-build-2d6ee98d/ESPEC-SWEEP-REPORT.md` + este handoff.

## Placar por entrega

| # | Entrega | Estado | Commit |
|---|---|---|---|
| 0 | `ROADMAP.md` §5 consolidado (ordem ratificada 18/07) + rodada criada | ✅ | `0549ec9` |
| 1 | Caminho do dinheiro em curso (E04/E09/E12/E16) | ✅ | `110ae25` |
| 2 | E08 — painel do promotor + card do kanban corrigido | ✅ | `0d07951` |
| 3 | E10 — consolidação de ativações (S812) | ✅ | `ded0829` |
| 4 | E19 — disparo de comunicação a segmentos | ✅ | `da659d4` |
| 5 | E11 — épico inteiro + 2 premissas corrigidas | ✅ | `1d0c511` |
| 6 | E13-slim — RESPEC como PWA + ADR-proposta | ✅ | `b7bb955` |
| 7 | H2 — E17 social · E14 (épico novo) · E06 avançado | ✅ | `93c664c` |
| 8 | E15 — Creator Studio (esqueleto) | ✅ | `1dbb943` |
| 9 | Decisões abertas + boards + report | ✅ | (este commit) |

## Números

- **27 histórias** e **35 tarefas de 1 PR** despacháveis, mais **3 tarefas GATED** (checkout de estrangeiro, esperando a liberação Asaas).
- **Rota de modelo:** 34 opus effort xhigh · 1 haiku. **20 tarefas com review antagonista obrigatório.**
- **9 épicos** com seção `Plano de execução (ESPEC-SWEEP)` in-place; **2 épicos criados** (E14, E15); **1 ADR-proposta**.

## Achados que mudam o plano

1. **O painel do promotor não era lacuna** — o lote PROMOTOR já tinha fechado S701/S703/S704. Restam repasse parcial e aviso ao afiliado. Card do kanban corrigido.
2. **O histórico de analytics já é coletado** (`coletaDiaria` → `analyticsSnapshots/{YYYY-MM-DD}`). O rollup agrega série existente, e isso destrava o seletor temporal do RN-821.
3. **A atribuição de conversão já existe** (R9-E RN-313/314 + COMF2). A nota de `snapshot.ts` que dizia "até E12 gerar atribuição" está vencida — S822 não está mais bloqueada na origem.
4. **Com PWA, o E14 perde a camada on-device** (PWA não acessa HealthKit/Health Connect). Strava vira a primeira camada viável.
5. **Armadilha registrada no E11:** os campos do snapshot diário são de ESTOQUE. Somar `receitaConfirmada` de N dias erra por fator N e parece plausível. Teste de estoque × fluxo é obrigatório.

## Decisões que voltam para o Vitor

Consolidadas em `leela-specs/02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md` — 8 itens (D-1 a D-8) + 4 ações externas. As duas que seguram trabalho planejado: arquitetura do PWA (D-1) e push sem garantia no iOS (D-2). A ação de maior alavancagem: **chave do Brevo**, que destrava E19 e E08 ao mesmo tempo.

## Para quem retomar

- A ordem de despacho está em `ROADMAP.md` §5 e em `02-rodadas/2026-07-19-espec-sweep/00-indice.md`.
- Cada épico carrega o próprio passo a passo na seção `Plano de execução (ESPEC-SWEEP · 2026-07-19)`.
- Nenhuma RN foi numerada nesta rodada (planejamento não cria regra de negócio). Onde uma lacuna exige regra, está marcada como "RN a numerar", com o gatilho: numerar no lote que implementar, após grep de colisão.
- Regra de infraestrutura herdada da SUITE-STAB e válida para todo lote de código daqui pra frente: `npm run build` antes de qualquer `emulators:exec`, e todo teste de integração novo usa `stability.ts`.
