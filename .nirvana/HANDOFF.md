# HANDOFF — LEELA build (trace leela-build-2d6ee98d) · atualizado 2026-07-04 ~21h UTC

**Cota/contexto no limite — este handoff é a fonte de retomada.** Agentes da sessão anterior NÃO
existem mais; retomada = despacho fresco por lote usando os briefs + o inventário de WIP abaixo.
Frase de entrada: **"retomar leela"** + ler este arquivo. Tudo commitado está PUSHED até `50abc5c`.

## Fechado e pushed nesta sessão (github.com/inguz-studio/leela-projects, main)
- **Gate Onda 0 PASSED**: root-cause exit 134 (force-exit expo CLI, handles libuv; NÃO OOM) → fix
  config `f9f5acb` (turbo concurrency 6, metro maxWorkers 2). Relatório GATE-ONDA0.md.
- **Gate ONDA1-L1 PASSED**: E03-L1 3/3T, E05-L1 2/2T, E16-L1 6/6T + fixes de segurança
  (`2042577` stale-claim, `bda8039` reuso de conta, `90a65cf` /inscritos legada) — re-review
  independente fechou 3/3. Suíte era 515/515.
- **HOTFIX-E16 3/3**: `35894cb` (R1 ordem rollback), `1e50e49` (#8 corrida onCreateUser MORTA,
  prova por execução; replay auto-recupera), `0acea80` (R3 merge de claims). Suíte 531/531.
  Hotfixes AINDA SEM review antagonista — entram no review da onda.
- Kanban (V1-KANBAN.md) e checklist (V1-CHECKLIST.md) sincronizados task a task com hashes.

## ⚠️ QUEDA POR LIMITE DE SESSÃO (~21:3xZ 2026-07-04, reset 17:20 BRT)
Os 4 agentes em voo foram TERMINADOS pelo session limit. E03-L3 já havia fechado antes (4/4T pushed).
Mutexes órfãos removidos pelo maestro. WIP não-commitado dos mortos, por dono (git status confirmado):
- **E03-L2** (morreu aplicando contrato do L3): `M core/eventos/evento.ts` (percursos?), `M functions/package.json`,
  `M functions/__tests__/eventosRules.test.ts` + untracked: functions/src/eventos/{criarEvento,publicarEvento,slug,
  guardPreco,vincularChip,registrarEntrega,agregarFinanceiro}.ts, core/eventos/{entrega,precoBloqueado}.ts,
  api-client/eventos/mutations.ts, testes (criarPublicarEvento.integration, precoBloqueado, entrega*, financeiroEvento.integration).
  PENDÊNCIA DO L3 pro L2: confirmar CriarEventoInput (apps/painel/src/routes/eventos/_data/contracts.ts) + getEvento(db,slug).
- **E05-L2** (estava aguardando index-mutex p/ S106→S109): untracked functions/src/clubs/{onComunicadoEnvio,onConversao}.ts,
  core/clubs/{comunicado,comunicado-validacao,desafio-validacao,evento-vinculo,parceria,pontuacao,segmentacao}.ts,
  seeds (comunicados, parcerias), testes (pontuacao, parceria*, comunicado*, segmentacao).
- **E02-L1** (pronto, faltava barrels+indexes+rules+suíte+commit): functions/src/overview/, core/overview/,
  api-client/overview.ts, testes (overviewKpis, overviewAlerts, overviewDashboard, dashboardRules).
- **E16-L2 telas** (T3 escrito, ia validar): apps/painel/src/routes/plataforma/, api-client/platform/{mutations,rollups}.ts.

## EM VOO no momento do handoff anterior (briefs de referência — retomar por despacho fresco)
Para CADA lote abaixo: o WIP não commitado (se houver) está no worktree; inventarie com
`git status` filtrando pelos caminhos do dono ANTES de redespachar, e passe o inventário no prompt.
1. **E03-L2** (Fable, sf-backend-engineer) — Functions transacionais criar/publicar/chip/financeiro
   + teste adversarial #3. Brief: onda1-E03-lotes.md §L2. Caminhos: functions/src/eventos*, core/eventos.
2. **E05-L2** (Fable, sf-backend-engineer) — motores desafios/parcerias/comunicados; S105-T1 usa
   recontagem count() p/ qtdDesafiosAtivos. Brief: onda1-E05-lotes.md §L2. Caminhos: functions/src/clubs*,
   core/clubs, packages/core/src/desafios*. Estava segurando .rules-mutex/.index-mutex no meio do S105-T1.
3. **E02-L1** (Fable, sf-backend-lead) — camada de dados do dashboard. JÁ PRONTO no worktree (não
   commitado): core/overview/{kpis,alerts}.ts, functions/src/overview/{aggregateProfessionalDashboard,getOverview}.ts,
   api-client/overview.ts + 4 arquivos de teste. Faltava: barrels + indexes + rules (aguardava mutex)
   + suíte + commit. Brief: onda1-E02-lotes.md §L1.
4. **E03-L3 telas** (Opus, sf-frontend-engineer) — telas de eventos consumindo DS + dados do L1;
   contratos do L2 por interface tipada/mock. Brief: onda1-E03-lotes.md §L3. Caminhos: apps/painel.
5. **E16-L2 telas** (Opus, sf-frontend-engineer) — lista/detalhe tenants (S1601-T3/T4), editor termos
   (S1602-T2), dashboard macro (S1605-T3). Backend endurecido pronto; UI trata failed-precondition.
   Brief: onda1-E16slim-lotes.md. Caminhos: apps/painel (área admin).

## Ordem de retomada no terminal novo
1. `git status` → inventário de WIP por dono (caminhos acima). Commitar NADA antes de inventariar.
2. Redespachar os 5 lotes (mesmos briefs, mesmas personas, modelos: 1-3 Fable, 4-5 Opus) com o
   inventário; instrução-chave: "commite o que passa (1 task = 1 commit) e complete o lote".
3. Conforme aterrissam: atualizar V1-KANBAN.md E V1-CHECKLIST.md (regra do Vitor: SEMPRE os dois),
   commit + push a cada aterrissagem.
4. **REVIEW-ONDA1-L2** (Fable, sf-qa-engineer antagonista): L2s + E02-L1 + telas + HOTFIX-E16
   (35894cb/1e50e49/0acea80 ainda sem review). Fix-loop se falhar → gate → push + tags.
5. Depois: E05-L3+ telas, E03-L4/L5, E16-L3, E02-L2/L3 (Opus) → gates por épico (tags e03/e05/e02/e16-slim)
   → gate Onda 1 → Onda 2 (E04 → E12 → E08+E06) → Onda 3 (E13-slim + tag v1).

## Regras vigentes (inalteradas desta sessão — ver detalhes no histórico do arquivo)
- Roteamento: Fable = backend/rules/segurança + toda review/gate · Opus = telas/docs · Sonnet PROIBIDO.
- 1 task = 1 commit `[LEELA-S###-T#]` · staging seletivo SEMPRE (nunca add -A).
- Mutexes mkdir na raiz: `.forge-mutex` (commits/install) · `.rules-mutex`+HOLDER.txt (firestore.rules,
  reler do disco) · `.emu-mutex` (emulator/pipeline pesado) · `.index-mutex` (barrels compartilhados).
- Emulator: JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10" (fora do PATH), `--only firestore,auth`.
  **Baseline: 531/531 zero skip.** Turbo concurrency 6 / metro maxWorkers 2 (não subir).
- Ritual por lote: review antagonista → testes → KANBAN+CHECKLIST → audit (trace leela-build-2d6ee98d)
  → push. Relatórios em .nirvana/outputs/<trace>/ (gitignored). Emulator-only. Git Bash.
- **Regra permanente do Vitor:** ao se aproximar de limite de cota/contexto → atualizar este HANDOFF
  com inventário dos agentes em voo + push imediato de tudo que está commitado. Nada se perde: WIP
  fica no worktree, briefs/decisões estão versionados, retomada é sempre por despacho fresco.

## Pendências e premissas (inalteradas)
- Follow-ups registrados no kanban (#3 teste adversarial eventos → incluído no E03-L2; deny-read
  lifecycleAudit; scheduler rollups → E12; R2/Functions-emulator-em-CI do hotfix).
- Kits E03: capacidades 80/260/300/60 (premissa). Triggers v1 por chamada direta.
- Follow-ups E01: laranja AA, Playwright Popover, border-hover, motion, paleta lima.
