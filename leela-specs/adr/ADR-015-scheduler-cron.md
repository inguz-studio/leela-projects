---
tags: [leela, adr, arquitetura, scheduler, cron, functions]
---

# ADR-015 · Padrão de tarefas agendadas (cron/scheduler)

> Autor: sf-backend-lead (Software Forge) · DNA Kleppmann/Schneier · Trace: leela-build-2d6ee98d · Data: 2026-07-13 · Renumerada: 2026-07-17
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.
> Nota de numeração (resolvida 2026-07-17): esta ADR de cron nasceu numerada
> "ADR-007", em colisão com "Monorepo = Turborepo" do `ADR-stack.md`. O Vitor
> decidiu: **cron/scheduler = ADR-015** (este arquivo); **Turborepo mantém
> ADR-007**. As referências em docs já apontam para ADR-015. ⚠️ O código-fonte
> (`functions/`, `packages/core`, `firestore.rules`) ainda cita "ADR-007" para o
> cron em comentários — renumeração pendente para um lote de backend (troca só
> de rótulo em comentário, não altera comportamento).

**Contexto.** Correção factual ao que a WIKI afirmava: o cron **já existia**
no repo desde a Onda 1 — `functions/src/clubs/recalcularStatusMembros.ts`
roda `pubsub.schedule('every day 03:00')` (firebase-functions **v1**) para o
envelhecimento RN-102. Não havia "primeiro cron a nascer"; havia um **padrão
a formalizar**. A coleta E11 (`coletaDiaria`, S821-T1b) é a segunda tarefa
agendada e o momento de fixá-lo; `encerrarEventos` (E09s-L2-T6, 03:10) já
seguiu o padrão por antecipação.

**Decisão.**
1. **Wrapper v1 fino:** `pubsub.schedule(...)` + `.timeZone('America/Sao_Paulo')`
   + `.onRun()`, log via `firebase-functions/logger`. Precedente:
   `recalcularStatusMembros`. Nada de v2 scheduler enquanto o resto do repo
   for v1 (um único modelo de deploy/trigger).
2. **Núcleo puro separado do wrapper.** Toda a lógica mora numa função
   `*Core(db, agora, …)` exportada, **testável no Emulator sem o scheduler**
   — o Emulator `--only firestore,auth` NÃO sobe pubsub; o cron nunca
   dispara sozinho no CI. Testa-se chamando o Core direto (exatamente como
   `recalcularStatusMembrosCore`, `encerrarEventosCore`,
   `coletarSnapshotsDiariosCore`).
3. **Horários escalonados e ordenados por DEPENDÊNCIA** (a ordem é aceite,
   não detalhe):
   - **03:00** `recalcularStatusMembros` — envelhecimento RN-102
     (novo→ativo→inativo) + recontagem `qtdMembrosAtivos`;
   - **03:05** `coletaDiaria` (E11) — snapshot diário lê
     `membros.status`/`qtdMembrosAtivos` **já reprocessados** pelo
     envelhecimento do dia;
   - **03:10** `encerrarEventos` — encerramento por data (RN-350) + recompute
     de saldo de repasse.
   Slot novo = próximo múltiplo de 5 min, SEMPRE depois das dependências.
   Cadência CONTÍNUA (`every 5 minutes`, sem dependência de ordem diária):
   - `virarLoteCron` — metade DATA da RN-300 (carimbo de lote expirado);
   - `dispatchCampanhasAgendadas` (Onda 3 · SCHED-T1) — varre `campanhas`
     `status='agendado'` vencidas (collection group `status+agendadoPara`,
     índice em firestore.indexes.json) e dispara REUSANDO o pipeline de
     envio/log do E06 (`executarDisparoCampanha` — envelope transacional
     RN-133 + fan-out idempotente RN-219); replay não duplica. Limite de
     push estourado / segmento vazio / tenant não-ativo ficam `agendado`
     (retry natural na próxima varredura).
4. **Sem registry/índice de crons** por ora — 3 tarefas não justificam
   abstração. Reavaliar se passar de ~6.

**Status.** ✅ Formalizado na Onda 2 (T2-L1); renumerado de ADR-007 para
ADR-015 em 2026-07-17 (decisão do Vitor — Turborepo fica com ADR-007). E12/E09
e ondas futuras REUSAM este padrão — não inventar segundo mecanismo de
agendamento.

**Consequência.**
- Todo cron novo entrega: wrapper fino + `*Core` puro + teste de integração
  chamando o Core no Emulator + slot documentado na tabela acima (editar
  ESTE arquivo ao adicionar).
- Idempotência é obrigatória no Core (rerun do mesmo dia/estado ⇒ mesmo
  resultado) — reruns manuais e retries do scheduler são esperados.
- Convenção espelhada em `convencoes-codigo.md` §12.

---
Relacionado: [[ADR-stack]] · `functions/src/clubs/recalcularStatusMembros.ts` ·
`functions/src/analytics/coletaDiaria.ts` · `functions/src/eventos/encerrarEventos.ts`
