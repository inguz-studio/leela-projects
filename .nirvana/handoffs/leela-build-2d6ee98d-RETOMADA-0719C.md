# Retomada 0719C — estado do run leela-build-2d6ee98d (checkpoint de cota Fable)

> Escrito em 2026-07-19 ~21h30 local, com a cota semanal de Fable a 96%. Este doc permite a QUALQUER sessão futura (inclusive maestro em OPUS) retomar sem perda. Fonte de estado por lane = handoff da lane (sempre mais atual que este índice).

## Estado das lanes

| Lane | Estado | Handoff | Próximo passo |
|---|---|---|---|
| **CLAIMFIX** | FECHADA (T4 com ressalva: suíte vermelha era flakiness alheia, transferida p/ SUITE-STAB) | `-CLAIMFIX.md` | nada |
| **TAXAFLEX** (dinheiro, RN-178..183) | T1-T7 FEITOS e pushed (impl completa: core pct+fixo por meio, congelamento, estorno cent-exato, checkout por opção, config UI; gates: eslint 0 ×5 pacotes, tsc 0, 271/271 r6) | `-TAXAFLEX.md` | **T8 = review antagonista FABLE — PENDENTE-POR-COTA** (riscos mapeados no handoff); depois fixes+aterrissagem. Card (j) fica "Em execução" com nota; NUNCA Feito sem review de dinheiro |
| **SUITE-STAB** (infra de teste) | Mecanismo provado (probe afiliados 28/28; smoke 6/6 após redesenho sticky `6fd2a56`); prova final 1 de 2 em execução (`suitestab-t4-full-proof1.log`) | `-SUITESTAB.md` | terminar provas 2× + aterrissagem compacta (barato em token — só babysitting) |
| **ESPEC-SWEEP** (revisita de TODOS os épicos + specs na ordem de implementação, ordem do Vitor) | AGUARDANDO: brief pronto em `.nirvana/briefs/leela-espec-sweep-enriched.md` | — | **SÓ DISPARAR COM COTA RENOVADA** (é o maior gasto Fable previsto; commit por épico embutido no brief) |
| FORMBUILDER-CODIGO-F1 | brief da sessão morta existe; NÃO redispachado | — | fila, após TAXAFLEX aterrissar (território E04/E12 sobrepõe) |

## ATUALIZAÇÃO 22:45 — cota Fable esgotada + TETO DE MODELO VIROU OPUS

- **Fable acabou** (agente da SUITE-STAB morreu com `You've reached your Fable 5 limit` — checkpoint segurou: boards já estavam commitados em `a3eb23d`).
- **Decisão do Vitor (2026-07-19): o modelo mais forte passa a ser sempre o OPUS.** Regra L global gravada em `~/.claude/skills/harness/references/08-model-routing.md` (bloco no topo): toda linha `fable` da matriz lê-se `opus`; classe crítica roteia opus/xhigh e **nunca rebaixa**; estouro do topo escala para HUMANO, não para tier acima.
- Consequência: **nada mais fica esperando cota de Fable.** TAXAFLEX já tinha fechado com antagonista pago; SUITE-STAB atingiu o aceite; ESPEC-SWEEP foi despachado em Opus.

## Regras de cota (histórico da decisão original — superadas pelo bloco acima)
- ~~Classe crítica nunca rebaixa para Opus — espera a cota renovar~~ → **superado**: Opus É o topo agora.
- Babysitting/maestro em Opus: continua válido e é o padrão.
- Lições operacionais da rodada: suíte inteira SEMPRE com `npm run build` antes do `emulators:exec`; emulator de suíte é exclusivo; agentes NÃO podem pausar "esperando watcher" (não acorda sozinho) — esperar runs com loop bloqueante em foreground.

## Watchers/processos no momento do checkpoint
- Prova final 1 da SUITE-STAB rodando como processo local (`suitestab-t4-full-proof1.log`) — se a sessão morrer, o resultado fica no log; retomar = ler o log e seguir o handoff da lane.
- Emulator órfão das 11:07 já foi morto; não recriar.

## Como retomar (qualquer sessão)
1. `git pull` em C:\dev\LEELA; ler este doc + handoffs `-TAXAFLEX.md` e `-SUITESTAB.md`.
2. Se SUITE-STAB não fechou: conferir logs `suitestab-t4-full-proof{1,2}.log` e concluir provas/aterrissagem (pode ser Opus).
3. Com cota Fable renovada: (a) despachar T8 antagonista da TAXAFLEX (contexto FRESCO: diff dos commits taxaflex T1-T7 + RN-178..183 + riscos do handoff; nunca a conversa); (b) após T8 pago e aterrissado, despachar ESPEC-SWEEP pelo brief pronto.
4. Auditoria em `~/.harness-logs/2026-07-19/audit.jsonl` (trace leela-build-2d6ee98d).
