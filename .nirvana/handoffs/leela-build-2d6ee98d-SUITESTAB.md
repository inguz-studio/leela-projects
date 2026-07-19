# Handoff vivo — lane SUITE-STAB · run leela-build-2d6ee98d

- **Employee:** sf-qa-engineer (software-forge)
- **Base:** `d414414` (pull limpo em 2026-07-19)
- **Portas:** 8080/9099 (dono nesta rodada). TAXAFLEX = 8480/9598 — NUNCA cruzar.
- **Território proibido:** packages/core cálculo de venda, functions/src/checkout/*, testes precoBloqueado/checkout*/claim* (lane TAXAFLEX).

## Status: T2 — wiring (lotes A+B commitados; C em andamento)

| Task | Estado | Commit |
|------|--------|--------|
| T0 — handoff + leitura evidência (full5, e4ddbb9, infra de teste) | FEITO | — |
| T1 — helper `stability.ts` + drain global em vitest.setup | FEITO | `d33eec3` |
| T2a — lote A (afiliados, setClaimsEquipe, kitsRules, automacoes, inscritosRules, financeiroEvento, equipeRules, demografia) | FEITO | `28fbdd2` |
| T2b — lote B (repasseAdmin, requestRepasse, rateLimitAceite, qrCheckin, journeyGatilhosScheduler, enviarCampanha) | FEITO (pushed) | `54e6462` |
| T2c — lote C (storageRules, parceriasEventoNome, journeyAceiteE18, eventoCamposRules, criarPublicarEvento, comunicacoesLog, provisionTenant, onCreateUser) + `seedVerifiedWith` no helper | FEITO (pushed) | `236b555` |
| T3 — prova alvo: probe afiliados 28/28 verde · smoke #1 FALSIFICOU desenho v1 (ver nota) · fix sticky commitado · smoke #2 (`suitestab-t3-smoke6b.log`) EM EXECUÇÃO | EM ANDAMENTO | `6fd2a56` |
| T4 — prova final 2× verde (comando canônico) + aterrissagem (kanban E00 + épico + report) | pendente | — |

**T3 — smoke #1 falsificou o desenho v1 (autocrítica QA, log `suitestab-t3-smoke6.log`):** o RE-ENABLE de background triggers via Hub dispara RELOAD das function definitions (~segundos cada). Com pause/enable POR beforeEach: 105 reloads no smoke ⇒ kitsRules 40/40 verde mas 341s, hook timeouts (10s default) no comunicacoesLog, 4× `Failed to load function definition ... Timeout after 10000` (runtime de functions MORTO ⇒ cascata fetch failed), setClaimsEquipe/automacoes nem rodaram (run abortado). provisionTenant: 3 hook-timeouts no clearAll doc-a-doc. **Fix v2 (`6fd2a56`):** (a) pausa STICKY — pausa 1× no primeiro beforeEach e re-habilita 1× no FIM do arquivo (afterAll global do vitest.setup, emulator ocioso); os arquivos wired testam os cores DIRETO, nenhum precisa de entrega de background no corpo do teste; (b) `clearFirestoreRest` (clear bulk via REST) nas 3 suites sem RulesTestEnvironment; (c) `hookTimeout: 60_000` global. Diretiva: NUNCA re-habilitar triggers dentro de beforeEach.

## Wiring aplicado (21 arquivos; todos os 22 vermelhos do full5 MENOS precoBloqueado=TAXAFLEX)
Padrão por arquivo: `withTriggersPaused(clearFirestoreDrained → [deleteAllUsersDrained] → seedVerified(canários))`. Especiais: setClaimsEquipe usa `ensureUserWithClaims`; requestRepasse verifica canários condicionais por opção do seed; provisionTenant usa `clearAllVerified` (verificação de VAZIO); onCreateUser usa `provisionarDrenado` (espera entrega de background do trigger convergir antes do runTrigger manual); criarPublicarEvento usa `seedVerifiedWith` (sem RulesTestEnvironment).

**Prova empírica do Hub API (T3 parcial):** log `suitestab-t3-probe-afiliados.log` mostra `function temporarily disabled` para todos os triggers durante clear+seed e `Enabling Cloud Functions triggers` na saída — PUT `/functions/{disable,enable}BackgroundTriggers` funciona no firebase-tools@13. Probe afiliados: 28/28 verde, exit 0.

## Diagnóstico (causa-raiz por classe — T0)
- **Classes 1+2 (mesmo motor): backlog de triggers cross-file.** Seeds grandes (453 inscritos canônicos em financeiroEvento/inscritosRules/demografia) enfileiram ~2700 execuções (`onInscritoWrite*` ×6). O backlog transborda para os arquivos seguintes (prova: full5 mostra triggers de `meia-floripa-2026` insc-0294/0295 executando DURANTE afiliados). O clear+seed do arquivo seguinte corre contra o backlog: seeds engolidos ("Evento 'meia-afiliados' não existe", kit NOT_FOUND), leftovers ("Slug 'castelo-producoes' já em uso"), contenção (409 Transaction lock, `Service call error` em get() de Rules, `Transaction is invalid or closed`), contadores fora por 1.
- **Classe 3: janela do onCreateUser.** `functions/src/auth/onCreateUser.ts` — trigger async relê claims (getUser) e seta `role: 'athlete'`; se o teste seta claims profissionais NO MEIO da janela getUser→setCustomUserClaims, o default clobbera (`athlete` vs `tenant_owner`). Delete best-effort de `atletas/{uid}` (linhas 156/223) aterrissa após o próximo seed.
- **Classe da rodada anterior (lib stale / emulator órfão): já pagas** (627f08d + órfão morto) — não recolete.

## Decisões / escalas
- **precoBloqueado.test.ts está VERMELHO no full5 (9 testes)** — mesmo mecanismo (seed engolido: kit NOT_FOUND), mas é TERRITÓRIO TAXAFLEX. NÃO toco. Mitigação indireta: drain global em vitest.setup.ts (infra compartilhada, não é teste de checkout) + eliminação do storm nos vizinhos wired. Se persistir vermelho na prova final, registro aqui como pendência da TAXAFLEX aplicar o mesmo padrão.

## Notas
- Evidência: logs `.nirvana/logs/claimfix-t4-suite-full{3,4,5}.log`; full5 = canônico (23 red / 137 green / 89 testes, 627s).
- Reaproveitado: seeds de `src/seed/*` JÁ são idempotentes (docIds fixos + set merge) — o retry do seed verificado apoia nisso; padrão e4ddbb9 (createUser idempotente) generalizado no helper.
- Fix desenhado: (a) `withTriggersPaused` — PUT `/functions/{disable,enable}BackgroundTriggers` no Emulator Hub durante clear+seed (mata o storm na fonte; fallback gracioso se o Hub não expuser); (b) `clearFirestoreDrained` — clear com retry em 409 + settle + segundo clear (varre recriações tardias); (c) `seedVerified` — seed + settle + canários via getAll + re-clear/re-seed em caso de swallow; (d) `ensureUserWithClaims` — createUser idempotente + drenagem do onCreateUser (poll até role default aterrissar) + set de claims com verificação de estabilidade; (e) drain global de fim-de-arquivo em vitest.setup.ts (settle p/ backlog residual antes do clear do próximo arquivo).
