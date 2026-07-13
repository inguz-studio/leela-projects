---
tags: [leela, adr, arquitetura, scheduler, cron, functions]
---

# ADR-007 · Padrão de tarefas agendadas (cron/scheduler)

> Autor: sf-backend-lead (Software Forge) · DNA Kleppmann/Schneier · Trace: leela-build-2d6ee98d · Data: 2026-07-13
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.
> ⚠️ Nota de numeração: `ADR-stack.md` usa "ADR-007" internamente para
> "Monorepo = Turborepo" (seção antiga). O corpus da Onda 2 (briefs,
> `encerrarEventos.ts`, kanban) já referencia **ADR-007 = padrão de cron** —
> este arquivo formaliza esse uso. Colisão registrada para o consolidador
> renumerar a seção do stack se quiser unicidade estrita.

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
4. **Sem registry/índice de crons** por ora — 3 tarefas não justificam
   abstração. Reavaliar se passar de ~6.

**Status.** ✅ Formalizado na Onda 2 (T2-L1). E12/E09 e ondas futuras REUSAM
este padrão — não inventar segundo mecanismo de agendamento.

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
