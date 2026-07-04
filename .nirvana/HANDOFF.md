# HANDOFF — LEELA build (trace leela-build-2d6ee98d) · atualizado 2026-07-04 ~19h UTC

Sessão de retomada (maestro Fable, Orkestra). Estado do working tree: limpo exceto docs de output
gitignorados. Tudo commitado até `90a65cf`; push feito até `67b05aa` — os 3 commits de fix do E16
(`2042577`, `bda8039`, `90a65cf`) são LOCAIS, push pendente do veredicto do re-review.
**Se retomar em terminal novo:** frase "retomar leela" + ler este arquivo; agentes antigos não existem mais.

## Fechado nesta sessão (além do que o handoff anterior já listava)
- **E05-L1 COMPLETO ✅ 2/2T**: ee39d9a (S101-T1), e2762f8 (S103-T1: Membro + derivarStatus RN-102 +
  onMembroWrite + cron 03:00 BRT + Rules membros + listMembros + índices; agregado por recontagem count(),
  idempotente sob retry).
- **E16-L1 COMPLETO ✅ 6/6T**: 2ec1e85 (S1602-T1 termos versionados + Rules endurecidas), 0eca288
  (S1601-T1 provisionTenant atômico + bootstrap platform_admin), 73e8366 (S1601-T2 lifecycleAudit),
  1d5e1af (S1602-T3 termsProvider + finance/calc), de14546 (S1605-T1 rollups+health), 7876d9b (S1605-T2
  agregação macro idempotente).
- **REVIEW-ONDA1-L1 (antagonista)**: E03 pass-c/-ressalvas, E05 pass-c/-ressalvas, **E16 FAIL** →
  relatório em `.nirvana/outputs/leela-build-2d6ee98d/REVIEW-ONDA1-L1.md`.
- **FIX-ONDA1-E16 ✅**: `2042577` (#1 crítico: snapshot/restauração de claims no rollback; ownership =
  tenants/{slug}.ownerUid, nunca claim), `bda8039` (#2: guarda de papel conflitante no reuso de conta
  por e-mail; rejeitar = default seguro), `90a65cf` (#4: /inscritos top-level legada aposentada, testes
  S1600 migrados). Negativos provados por EXECUÇÃO (RUN B 6-falhas-exatas no código antigo; RUN C rule
  legada permitia escrita). Suíte 515/515 zero skip.
- **Gate da Onda 0: PASSED** ✅ — root-cause exit 134 = force-exit do expo CLI com handles libuv vivos
  sob oversubscription (NÃO era OOM; evidência em `.nirvana/logs/exit134/`). Fix config `f9f5acb`
  (turbo concurrency 6, metro maxWorkers 2, override LEELA_METRO_WORKERS). 5 runs 23/23 verdes com DS
  reincluído. Relatório `GATE-ONDA0.md`.

## EM VOO agora
- **RE-REVIEW-ONDA1-L1** (sf-qa-engineer fresco, Fable): refutar fixes #1/#2/#4 + veredicto final do
  gate ONDA1-L1. Apêndice vai no próprio REVIEW-ONDA1-L1.md.

## Fila imediata (ordem, pós re-review PASSED)
1. **Push** dos commits de fix + kanban; audit gate_passed.
2. **Despachar em paralelo**: E03-L2 (Functions transacionais criar/publicar/chip/financeiro — Fable,
   sf-backend-engineer) · E05-L2 (motores desafios/parcerias/comunicados — Fable, sf-backend-engineer/2º)
   · **E02-L1 (Fable)** — review do L1 aprovou E03+E05, dependência satisfeita.
3. **Telas Opus destravadas** (despachar em lotes de 2-3 p/ não saturar): E03-L3/L4/L5, E05-L3/L4/L5,
   E16-L2/L3. Depois E02-L2/L3 (Opus).
4. Gates por épico conforme fecham (review antagonista → gate_passed → V1-KANBAN → push + tag
   e03/e05/e02/e16-slim) → gate da Onda 1 → Onda 2 (E04 → E12 → E08+E06) → Onda 3 (E13-slim + tag v1).
5. Se re-review FALHAR: novo ciclo de fix com o sf-platform-lead citando o apêndice.

## Follow-ups datados (Onda 1, não bloqueiam)
- #3 teste adversarial cross-tenant/imutabilidade em `eventos` (rule correta, falta teste).
- Teste de leitura deny do `lifecycleAudit`.
- **Protocolo `.index-mutex`** para arquivos-índice compartilhados (api-client/index.ts etc.) — ADOTADO
  como regra a partir de agora; incidente: E16 commitou índice com referência pendente ~1h.
- Follow-ups do E01 (herdados): laranja AA botões primary, Playwright Popover, token border-hover,
  auditoria motion, paleta lima órfã.
- E12: scheduler p/ recompute de rollups (hoje on-demand) + refinar health heurística.
- Unificar guard de seed (E05 e E16 têm guards próprios).

## Regras vigentes (atualizadas)
- **Roteamento:** Fable = backend/rules/pagamentos/auth/segurança + TODA review antagonista/gate.
  Opus = telas que consomem DS, docs, planejamento. Sonnet PROIBIDO. Fable também autorizado pelo Vitor
  a rodar mais largo (janela de 50% Anthropic) quando qualidade pedir.
- 1 task = 1 commit atômico `[LEELA-S###-T#]` (fixes: sufixo `-fix`; trailer Review-finding quando aplicável).
- Mutexes (mkdir na raiz, remover ao liberar): `.forge-mutex` commits/install · `.rules-mutex` +
  HOLDER.txt p/ firestore.rules (RELER do disco após adquirir) · `.emu-mutex` p/ runs de emulator/pipeline
  (NOVO desta sessão) · `.index-mutex` p/ arquivos-índice compartilhados (NOVO).
- Emulator: Java 21 Temurin em `~/.jdks/jdk-21.0.11+10` (JAVA_HOME explícito, fora do PATH),
  `--only firestore,auth` (Auth emulator necessário desde E16-L1). Baseline suíte: **515/515 zero skip**.
- Ritual por lote: review antagonista → testes → V1-KANBAN.md → audit (`~/.harness-logs/YYYY-MM-DD/audit.jsonl`,
  trace leela-build-2d6ee98d). Relatórios em `.nirvana/outputs/<trace>/` (gitignored).
- Push a cada gate_passed + tag por épico. Handoff atualizado a ~90% de contexto (regra do Vitor).
- Emulator-only, sem chaves reais. Windows: Git Bash nos agentes. Turbo concurrency 6 / metro
  maxWorkers 2 (f9f5acb) — não subir sem reler GATE-ONDA0.md.

## Premissas/decisões herdadas ainda válidas
- Capacidade dos kits E03: 80/260/300/60 (premissa, protótipo só mostra contagens).
- Triggers v1 testados por chamada direta (suite não sobe Functions emulator) — revisitar no gate da onda.
- provisionTenant: segundo tenant p/ owner existente — comportamento a definir formalmente (re-review
  pode apontar; hoje segue o que o fix bda8039 documentou em teste).
