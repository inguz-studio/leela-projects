# HANDOFF — LEELA build (trace leela-build-2d6ee98d) · PARADA POR SPEND LIMIT · 2026-07-05

**Tudo commitado está PUSHED até `77429ba`** (github.com/inguz-studio/leela-projects, main).
Retomada: **"retomar leela"** + ler este arquivo. Mutexes todos livres.

## ⛔ ONDE PARAMOS (spend limit mensal — claude.ai/settings/usage)
FIX-LOOP do gate da Onda 1: **3 de 4 fix-agents COMPLETOS e pushed** (FIX-E02, FIX-E16, FIX-E03).
**FIX-E05 morreu no meio — WIP NÃO COMMITADO no worktree (preservado, git status confirma):**
`M apps/painel/src/routes/clubes/ClubesRoutes.tsx` · `M clubes/_data/clubes.ts` ·
`?? apps/painel/src/routes/clubes/novo/` · `M functions/src/__tests__/desafiosRules.test.ts` ·
`M functions/src/clubs/membrosMutations.ts` · `M functions/src/clubs/onComunicadoEnvio.ts` ·
`M packages/api-client/src/clubs.ts` + `index.ts` · `M firestore.indexes.json`.
(Logs de crash Java `hs_err_pid*`/`replay_pid*` = 2 OOMs da suíte monolítica na máquina 8GB — ignorar.)

**PRÓXIMO PASSO ao retomar (com cota):**
1. `git status` → inventariar o WIP do FIX-E05 acima. Redespachar sf-backend-engineer/Fable p/ CONCLUIR
   FIX-E05 lendo REVIEW-ONDA1-L2-SUPLEMENTAR.md (S1-S9) + REVIEW-ONDA1-L2.md (médios E05) — S1 blocker
   já resolvido por agente anterior (scrollIntoView); faltam S2 atualizarComunicado, S3 rules legadas
   /comunicados+/parcerias, S4 config estado honesto, matriz de transições c/ decisões DO VITOR:
   **T14 reabrir desafio=owner-only · T15 reativação parceria=unilateral · T13 SEM limite de pontuação**
   (essas 3 já estão nas mensagens/DECISOES-ABERTAS.md — viram testes) + 12 testes integração do suplementar.
2. Após FIX-E05: **re-verify CALIBRADO** (xhigh só nos altos) — RODAR SUÍTE EM BLOCOS, não monolítica
   (a máquina deu 2 OOM com suíte full + agentes paralelos). Depois **GATE FINAL Onda 1** → push + tags
   `e03`/`e05`/`e02`/`e16-slim` → kanban épicos → Feito → **Onda 2** (plans/onda2-decisoes.md, 24L/74T).
3. Preview local pronto: `bash preview.sh` (portas alt 5273/8180 — NÃO colide). Subir só com worktree
   estável (WIP do E05 quebra a montagem do painel). PREVIEW.md tem o passo a passo.

## Fix-loop — o que JÁ fechou e pushed
- FIX-E02 (e92aca8): #03 estados honestos + #13/#15/#16-ui · painel 430/430.
- FIX-E16 (nos commits até ab32323): #11/#12 corridas admin + 7/8 baixos (#30 follow-up 2026-08-08) · E16 89/89.
- FIX-E03 (77429ba): 12 achados, 3 altos c/ prova negativa (datas fuso SP, RN-200 blindada) + #16 dos dois lados.
- Planos: plano de cobrança propagado (24L/74T); decisões comerciais (taxa por método default editável).



## Estado da build — ONDA 1 100% CONSTRUÍDA (pendente gate)
- **E03 20/20T ✅** · **E02 7/7T ✅** · **E16-slim ✅** (L1+fixes+hotfix+4 telas) · **E05 ✅** (motores 844/844
  + 16 telas 156/156; único backend pendente: deleteClube/exportClubeData — em voo, ver abaixo).
- **FIX-LOTE ✅** (0f422b5 capacidade no parseEvento → ratio real nas telas; 282de2c doc subcoleção
  convites; f9e46a5 4 testes deny lifecycleAudit). Glossário RN-216 fica no painel (decisão documentada).
- Suítes de referência: functions 844/844 · painel 206/206+ (eventos 124, clubes 156, overview 50,
  plataforma 62) · DS 502/502. Protocolo WIKI+RTK ativo (WIKI §6; rtk proxy/run PROIBIDOS, deny rules
  em .claude/settings.json).

## Decisões de escopo (VINCULANTES) — leela-specs/discovery/decisoes-escopo-2026-07-04.md
V1=vender/V1.5=engajar · E09-slim repasses ENTRA (retenção 15% pós-evento editável pelo admin,
comprovante, dados bancários salvos, histórico) · **SEM afiliados (cupons sim); E08 ADIADO** ·
GymRats sem medalhas (V1.5) · Leela+ PAGO mensalidade receita 100% Leela (teaser na V1) · E07-web
entra · E11 coleta e E15 higiene APROVADOS explicitamente · Strava gated O3.1.
**AÇÃO EXTERNA PENDENTE DO VITOR: registrar app OAuth na Strava (lead time semanas).**
Discovery relacionado: proposta-revisao-escopo, benchmark-cheers, leela-plus-hipotese-jtbd (todos pushed).

## EM VOO no checkpoint (4 trabalhos — como retomar cada um)
1. **GATE Onda 1 (workflow REVIEW-ONDA1-L2)**: 5 lentes antagonistas → verificação adversarial →
   suíte → síntese. Deve escrever `.nirvana/outputs/leela-build-2d6ee98d/REVIEW-ONDA1-L2.md` + audit
   gate. Se morreu antes de escrever: redespachar como agente único Fable xhigh lendo os sumários
   em outputs/ (escopo congelado até 28ce61a; eixos: rules novas, idempotência, hotfixes E16,
   contratos UI↔backend, qualidade de testes).
2. **Passe suplementar de review** (Fable): range pós-28ce61a (E05-L4/L5 + api-client estendido pelo
   frontend + fix-lote). Deve escrever REVIEW-ONDA1-L2-SUPLEMENTAR.md. Foco: writes diretos de
   cliente (desafios/parcerias/comunicados/config) vs Rules; validações client-side sem espelho
   server-side; lista de *Rules.integration exigidos. Se morreu: redespachar com este parágrafo.
3. **S110-T2 backend** (Fable): deleteClube (cascata LGPD transacional) + exportClubeData (guard 90d),
   assinaturas EXATAS dos callables já publicados no api-client (contratos no E05-L4L5-SUMMARY.md).
   WIP possivelmente untracked em functions/src/clubs — inventariar com git status antes de redespachar.
4. **Planejamento Onda 2 (workflow)**: 6 planners Opus escrevendo `.nirvana/briefs/onda2-*.md`
   (E04-slim SEM afiliação, E12 c/ decisões comerciais do benchmark, E09-slim spec do Vitor, E07-web,
   E06, transversais: coleta E11 + higiene E15 + backend desafio + lint PlatformShell) + consolidador
   Fable que audita coerência, escreve `.nirvana/plans/onda2-decisoes.md`, atualiza V1-CHECKLIST
   (remove S301/S303 afiliação, adiciona E09/E07/transversais) e commita tudo `[LEELA-PLAN-O2]`.
   Se morreu no meio: briefs parciais podem estar no worktree sem commit — inventariar e completar.

## DELTA checkpoint 97% (2026-07-05 ~0h UTC)
- Item 2 ✅ **REVIEW SUPLEMENTAR ENTREGUE: REPROVADO** (REVIEW-ONDA1-L2-SUPLEMENTAR.md) — 4 ALTOS
  (S1 campo-set de clubes aberto; S2 editar comunicado duplica; S3 blocos legados top-level
  /comunicados e /parcerias; S4 config sucesso sem persistir) + S5-S9 + **15 testes de integração
  exigidos (12 obrigatórios, 3 atrás de decisão: T13 RN-111, T14 reabrir encerrado, T15 reativação
  unilateral de parceria)**. Fix-lote 3/3 passa.
- Item 3 ✅ **S110-T2 backend COMMITADO** (524607f + 3b9d91c): deleteClube cascata + retenção 90d
  replay-safe + exportClubeData guard + Rules delete negado. functions 882/882. E05 = 100% total.
- Item 4 ✅ **ONDA 2 PLANEJADA E COMMITADA** (2e35997): 23 lotes/71 tasks, briefs onda2-*,
  plans/onda2-decisoes.md (sequência Fable serial + Opus por gate), checklist atualizado.
  **3 decisões pendentes do Vitor** (não bloqueiam início): gateway (rec. Asaas; KYC lead time) +
  e-mail transacional; domínio {DOMINIO_LEELA} + e-mail suporte; ratificar defaults comerciais
  (taxa incorporada/tenant, 12x sem juros, retirada-only, % efetivo da taxa).
- Item 1 (gate principal) AINDA EM VOO: resumed wf_3f0b3f66-439 — Find cacheado (58 achados),
  re-executando ~30 verifies + suite + síntese. Se morrer de novo: journal.jsonl do run tem os
  resultados por agente; sintetizar a partir dele + suplementar num REVIEW único.
- Fix-loop consolidado (gate principal + suplementar) é o PRÓXIMO passo após o gate aterrissar.

## Ordem de retomada
1. `git status` → inventário (briefs onda2 parciais? functions/src/clubs WIP? outputs novos?).
2. Completar/redespachar os 4 acima (1 e 2 podem virar um review único se ambos morreram).
3. **Fix-loop** dos achados do gate (Fable, autor por área) → re-verify → **GATE FINAL Onda 1** →
   push + tags `e03`/`e05`/`e02`/`e16-slim` + atualizar kanban (épicos → Feito).
4. Executar Onda 2 conforme `.nirvana/plans/onda2-decisoes.md` (trilha Fable serial + Opus telas
   paralelo, mutexes, commit-por-task, kanban+checklist SEMPRE os dois, push por aterrissagem).
5. Preview local p/ Vitor: emulator (JAVA_HOME jdk-21) + `pnpm --filter @leela/painel dev` :5173 —
   janela livre quando o gate não estiver rodando suíte.

## Regras vigentes (inalteradas — detalhe no WIKI §3/§6)
Roteamento Fable/Opus (Sonnet PROIBIDO) · 1 task = 1 commit `[LEELA-S###-T#]` · staging cirúrgico ·
mutexes .forge/.rules/.emu/.index (mkdir; HOLDER.txt nas rules; reler do disco) · Java 21 fora do
PATH · emulator --only firestore,auth · turbo concurrency 6 · handoff a 90%+97% (regra do Vitor) ·
review antagonista antes de todo gate · relatórios em outputs/ no ato · audit JSONL por evento.
**Calibragem de gate (Vitor 2026-07-05):** verify `xhigh` só crítico/alto · `high` médio · baixo direto · painel completo só em gate de onda · lotes com reviewer único.
