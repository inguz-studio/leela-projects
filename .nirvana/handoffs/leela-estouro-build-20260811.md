---
trace: leela-redesign-v2-20260810
lane: ESTOURO-BUILD
data: 2026-08-11
autor: sf-backend-lead (software-forge)
branch: estouro-reserva
worktree: C:\dev\leela-wt-estouro
spec: leela-specs/02-rodadas/2026-08-10-estouro-reserva/
---

# Handoff vivo · ESTOURO-BUILD

Ordem do dono (10/08, tarde): **"não podemos ter excedentes de ingressos jamais."**
Constrói S322 (varredura do PIX vencido) + S323 (reserva do pedido pendente).

⛔ **Nenhum deploy nesta lane.** Functions sobem na próxima fase, com gates.
A spec pede "frente 1 no ar antes da frente 2"; nesta fase o pré-requisito é
cumprido como **provada em teste**, não como deployada. Está declarado aqui de
propósito para ninguém confundir uma coisa com a outra.

---

## 1 · CONTRATO DE DADOS — para a lane CKPIX-FLOW consumir (JÁ NO AR NA BRANCH)

**Commit `0c19807a`, pushed em `origin/estouro-reserva`.** Pode consumir agora.

O status que a varredura escreve quando um PIX vence é **exatamente o que a
porta do comprador (`expirarPixPendente`) já escreve hoje** — nenhum valor
novo, nenhuma migração de doc. O que mudou é que o literal virou símbolo:

```ts
import {
  MOTIVO_CANCELAMENTO_PIX_EXPIRADO, // 'pix_expirado'
  canceladoPorPrazoPix,
} from '@leela/core';
```

**Os campos, no pedido E no pagamento (mesma transação, sempre juntos):**

| Doc | Campo | Valor |
|---|---|---|
| `pedidos/{id}` | `status` | `'cancelado'` |
| `pedidos/{id}` | `canceladoMotivo` | `'pix_expirado'` |
| `pagamentos/{id}` | `status` | `'cancelado'` |
| `pagamentos/{id}` | `canceladoMotivo` | `'pix_expirado'` |
| `pagamentos/{id}` | `gatewayCancelado` | `boolean` — a cobrança morreu no gateway antes dos docs |
| `eventos/{id}/inscritos/{id}` | `status` | permanece `'pendente'` — inscrito NÃO vira cancelado |

**O predicado é a porta da tela** — use ele, não a comparação de string:

```ts
if (canceladoPorPrazoPix(pedido)) { /* "o prazo do PIX venceu" */ }
```

Ele exige a CONJUNÇÃO (status + motivo). Decisões já tomadas dentro dele:
`'cancelado'` **sem** motivo é cancelamento de outra origem e responde `false`;
`'falhou'` (OVERDUE do gateway, ~1 dia depois) **não** é cancelamento por prazo
— é outro desfecho e a spec mantém os dois distintos. Tela que quiser tratar os
dois igual faz a disjunção explícita, à vista.

**A tela não precisa saber qual das três portas agiu.** Comprador, varredura e
webhook convergem para o mesmo estado sob a mesma guarda de transição única; a
diferença fica no log do servidor, não no doc.

Trava: `functions/src/__tests__/contratoCancelamentoPix.test.ts` (estático,
5 casos). Renomear o literal fica vermelho antes de quebrar tela alheia.

---

## 2 · Estado das tarefas

Atualizado a cada aterrissagem. Ver §4 para o registro tarefa a tarefa.

| Task | O que é | Estado |
|---|---|---|
| contrato | motivo tipado no core + predicado | ✅ `0c19807a` |
| S322-T1 | chamador de sistema no `expirarPixPendenteCore` | ✅ |
| S322-T2 | `varrerPixVencidos` + índice + secrets | ✅ |
| S322-T3 | teste de agendamento (cron explícito) | ✅ |
| S322-T4 | idempotência das três portas em corrida | ✅ |
| S323-T1 | campo `reservas` (core + Rules) | ✅ |
| S323-T2 | gate + incremento na criação da cobrança | ✅ |
| S323-T3 | liberação nas quatro saídas | ✅ |
| S323-T4 | recontagem absoluta na varredura | ✅ |
| S323-T5 | estado honesto na cotação (motivo tipado) | ✅ |
| S323-T6 | delta da RN-158 nas superfícies | ✅ |
| S323-T7 | teto da reserva de cartão (parametrizado) | ✅ |

---

## 3 · Território e coordenação

**Meu:** `functions/src/checkout/**`, `functions/src/index.ts`,
`packages/core/src/{pedidos,eventos,checkout}/**`, `firestore.rules` (bloco do
lote), `firestore.indexes.json`, `functions/src/__tests__/**`.

**Não toco:** `apps/**`. A copy e o pixel do estado "últimas vagas em
pagamento" são da lane de tela — eu entrego o motivo tipado que ela consome
(§4, S323-T5).

**Emuladores:** portas dedicadas desta lane — Firestore **8490**, Auth **9599**,
config `firebase.estouro.json`, host IPv4 explícito. Derrubados ao fim de cada
rodada (conferido por `netstat`).

---

## 4 · Registro tarefa a tarefa

_(preenchido durante a construção)_
