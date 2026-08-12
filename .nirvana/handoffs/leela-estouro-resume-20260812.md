---
trace: leela-redesign-v2-20260810
lane: ESTOURO-RESUME
data: 2026-08-12
autor: sf-backend-lead (software-forge)
branch: estouro-reserva
worktree: C:\dev\leela-wt-estouro
spec: leela-specs/02-rodadas/2026-08-10-estouro-reserva/
herda: .nirvana/handoffs/leela-estouro-build-20260811.md
---

# Handoff · ESTOURO-RESUME — fechar a lane que o reinício matou

O PC reiniciou ~01h30 de 12/08 no meio da fase final da ESTOURO-BUILD, com 27 commits
reais na branch e o handoff declarando as 12 tarefas ✅ sem os gates finais terem
rodado. Esta lane auditou a herança tarefa a tarefa por grep/teste (declaração não é
prova), rodou os gates do zero e mergeou.

## Veredito da auditoria: as 12 tarefas EXISTEM no código, provadas — não só declaradas

| Task | Prova (grep/teste, não declaração) |
|---|---|
| contrato | `MOTIVO_CANCELAMENTO_PIX_EXPIRADO`/`canceladoPorPrazoPix` em `packages/core/src/pedidos/pagamento.ts:220-266`; trava estática `contratoCancelamentoPix.test.ts` |
| S322-T1 | `ChamadorExpiracaoPix = {uid} \| {sistema:true}` em `expirarPixPendente.ts:120`; ownership pulado só para `sistema`; ataque de uid alheio provado em `varrerPixVencidos.integration.test.ts` T7 |
| S322-T2 | `functions/src/checkout/varrerPixVencidos.ts` (wrapper `runWith({secrets})` + cron `3-58/5 * * * *` + Core bounded); export em `index.ts:220`; índice novo `pagamentos(status, pixExpiraEm)` em `firestore.indexes.json` |
| S322-T3 | `varrerPixVencidosAgendamento.test.ts` — 4 casos, lê o manifesto `__endpoint.scheduleTrigger` |
| S322-T4 | `varrerPixVencidos.integration.test.ts` T4 (5 casos de corrida par-a-par) + `reservaVaga.integration.test.ts` P4 (3 casos) |
| S323-T1 | `reservaLote.ts` (parse Postel `reservas`); `firestore.rules:1156-1257` (`reservasZeradoNoCreate`/`reservasIntocado`, mesmo molde do `vendidos`); ataque em `vendasRules.integration.test.ts` (4 casos, todos verdes) |
| S323-T2 | `reservarNaTx` chamado em `createInscricaoCharge.ts:1963`, dentro da tx, no mesmo commit dos docs; gate `cabeNaCapacidade` na fase de leitura |
| S323-T3 | `liberarNaTx` nos 3 pontos que cobrem as 4 saídas: `expirarPixPendente.ts:279` (varredura + onCall, mesmo core), `webhookPagamento.ts:376` (`failed`) e `webhookPagamento.ts:622` (`confirmado`) |
| S323-T4 | `recontarReservasCore` em `reservaLote.ts` — recontagem absoluta, substitui não soma; `reservaVaga.integration.test.ts` P9 (4 casos) |
| S323-T5 | `MOTIVO_VAGAS_EM_PAGAMENTO`/`MOTIVO_LOTE_ESGOTADO` em `cotarInscricaoCheckout.ts:268-311`, mesmo predicado (`cabeNaCapacidade`/`recusaPorReserva`) do gate de criação — fonte única em `packages/core/src/eventos/lote.ts` |
| S323-T6 | Delta na RN-158 documentado em `LEELA-E12-landing.md` (linha 86) + comentário em `packages/core/src/checkout/carrinho.ts` |
| S323-T7 | `RESERVA_CARTAO_TETO_SEGUNDOS = 15 * 60` em `packages/core/src/pedidos/pagamento.ts:115` (**15 min, não os 30 do default proposto** — decisão do dono confirmada) + `reservaVaga.integration.test.ts` P7 (4 casos, um deles falsificando explicitamente o número) |

**Teto de reserva do cartão = 15 minutos, conferido contra a decisão da leva 7
(11/08): "ESTOURO-2 · DECIDIDO — teto de 15 minutos".** A constante está deliberadamente
DESACOPLADA de `PIX_EXPIRACAO_SEGUNDOS` (30 min) — dois relógios, dois donos — e
ancorada em `CARRINHO_PRAZO_SEGUNDOS` (RN-158) por escolha do dono, documentado no
comentário da constante.

## Achado 1 — não é gap desta lane: stub da tela do refresh (CKPIX-FLOW)

`apps/landing/.../checkout/desfechoPedido.ts` tem `reservaDoPedidoExpirou()` como stub
que sempre devolve `false`, esperando **o campo do core** que esta lane construiu
(`reservaDeCartaoExpirada` em `packages/core/src/pedidos/pagamento.ts:128`). A função
já existe e está pronta para ser consumida — falta só trocar o corpo do stub pela
leitura dela. Fiar essa troca é **território de `apps/**`**, fora do declarado por
ambas as lanes (ESTOURO-BUILD "Não toco: apps/**"; CKPIX-FLOW "aqui é a tela"). Não
invadi. **Registrar card**: ligar `reservaDoPedidoExpirou` a `reservaDeCartaoExpirada`
— o card S1246-T4 no kanban (linha 294) já nomeia essa pendência.

## Achado 2 — ~58 arquivos usam porta 8080 HARDCODED, fora da convenção de porta por lane

`vendasRules.integration.test.ts` (e outros ~57 arquivos de `__tests__/`, todos os que
usam `@firebase/rules-unit-testing` `initializeTestEnvironment`) hardcodam `host:
'localhost', port: 8080` — não leem `FIRESTORE_EMULATOR_HOST`. A convenção de porta
dedicada por lane (8490/9599, para não colidir com outras lanes rodando em paralelo)
**não cobre esses arquivos**: contra o emulador da lane eles derrubam com
`ECONNREFUSED :8080`, e é isso que apareceu como "56 Failed Suites" na primeira
rodada da suíte completa. Não é bug de código — é mismatch de porta. Corrigido subindo
um SEGUNDO emulador (Firestore 8080 + Auth 9099, as portas DEFAULT do `firebase.json`,
via `firebase-tools@13` compatível com JDK 17) e rodando a suíte inteira de novo contra
ele — essa é a rodada que valeu como gate final (ver números abaixo).

- **As 4 tarefas de ataque `reservas` desta lane (S323-T1): TODAS VERDES**, nas duas
  rodadas (create forjado, update em qualquer direção, smuggling, delete com reserva
  viva).
- Dentro de `vendasRules.integration.test.ts`, **7 testes fora do escopo desta lane**
  (`financeiro — repasse`, `catch-all de eventos é ALLOWLIST` ×3, `fan-out da fila
  admin de estornos`, `lotes — ataques antagonistas … payload SÓ-NOME`) seguem
  falhando mesmo com a porta certa, com `Property platformAdmin is undefined on
  object`. Zero diff desta branch nessas áreas (nem no arquivo, nem em
  `firestore.rules`) — **pré-existente em `main`**, nunca antes exercitado porque
  nenhuma lane sobe o par de emuladores completo no dia a dia. Não é da reserva; não
  tentei consertar (subsistema de admin/financeiro fora do meu território). **Achado a
  escalar separadamente** — sugiro lane própria para investigar o seed de
  `platformAdmin` nesses blocos.

## Achado 3 — suíte cheia de 251 arquivos é NÃO-DETERMINÍSTICA; um único arquivo se repete

Rodei a suíte inteira DUAS vezes do zero, contra dois emuladores limpos distintos
(porta 8490/9599 da lane; depois porta padrão 8080/9099). O conjunto de arquivos que
falha **muda entre as duas rodadas** — sintoma clássico de estado global compartilhado
(rate-limit, filas de órfão) entre 251 arquivos sequenciais sobre UM emulador, e é
exatamente o que o brief desta lane já avisava: *"o gate de lote de functions não é
confiável — julgar por fatia."*

| Arquivo | Rodada 1 (8490) | Rodada 2 (8080/9099) | Diff desta branch |
|---|---|---|---|
| `revContasMotor.antagonista.test.ts` | 8/18 falhas | 8/18 falhas (idêntico) | zero |
| `estornoOrfao.integration.test.ts` | 2/5 falhas | ✅ 5/5 verde | zero |
| `emailIncidente.integration.test.ts` | 2/8 falhas | ✅ 8/8 verde | zero |
| `ingressosOrfaos.integration.test.ts` | ✅ verde | 3 falhas | zero |
| `journeyAceiteE18.e2e.test.ts` | ✅ verde | 2 falhas | zero |
| `rateLimitAceite.integration.test.ts` | ✅ verde | 3 falhas | zero |
| `backfillCodigoPedido` / `codigoPedidoReserva` ×2 / `storageRules` | ECONNREFUSED :8080 (Achado 2) | ECONNREFUSED em portas PRÓPRIAS distintas (8981/8881/8781/Storage 9199, nenhuma subida) | zero |

**Zero diff desta branch em qualquer um dos arquivos acima.** Só
`revContasMotor.antagonista.test.ts` se repete IDÊNTICO nas duas rodadas — é o único
achado com prova de reprodutibilidade real, fora de território (subsistema de
contas/auth). Os demais são ruído de suíte-cheia, não bugs. **Não tentei consertar
nenhum** — fora do território desta lane (checkout/reserva), risco de regressão em
subsistemas que não conheço.

**A fatia que importa para esta lane — isolada, limpa, determinística — é verde:**
rodei os 8 arquivos de teste que este branch toca ou que cobrem S322/S323
(`reservaVaga.integration.test.ts`, `varrerPixVencidos.integration.test.ts`,
`varrerPixVencidosAgendamento.test.ts`, `contratoCancelamentoPix.test.ts`,
`checkoutCore.test.ts`, `pixCarrinho.integration.test.ts`,
`pixArbitragem.integration.test.ts`, `virarLote.test.ts`) sozinhos, contra o emulador
limpo: **8 arquivos / 140 testes / 0 falhas.**

## Gates — números

- **tsc** (`core` + `functions`, `--noEmit`): 0 erros.
- **eslint --max-warnings 0** (`core/src` + `functions/src`): 0 warnings.
- **Rules attack suite** (porta 8080 dedicada, JDK 17 via `firebase-tools@13`):
  `rules.test.ts` 7/7 verde; `vendasRules.integration.test.ts` 48/55 verde — as 4
  provas de `reservas` (S323-T1) entre elas, 7 falhas pré-existentes fora de
  território (Achado 2).
- **Suíte de functions, fatia da lane** (8 arquivos relevantes a S322/S323, isolados,
  emulador padrão limpo): **8/8 arquivos · 140/140 testes · 0 falhas.**
- **Suíte de functions, lote completo** (251 arquivos, DUAS rodadas do zero, portas
  distintas): rodada 1 = 190 passou/59 falhou/2 pulou; rodada 2 = 241 passou/8
  falhou/2 pulou. Não-determinístico entre rodadas (Achado 3); zero falha tem diff
  desta branch. Julgado por fatia, como o brief orientou.

## Higiene

Untracked de emulador limpos sem commitar: `firebase.estouro8080.json`,
`firebase-debug.log`, `firestore-debug.log`, `functions/firebase-debug.log`,
`functions/firestore-debug.log`, `functions/lib/`. Emuladores derrubados ao fim
(todas as portas usadas nesta lane — 8490/9599, 8080/9099 — conferido por `netstat`).

## Merge

`estouro-reserva` → `main`, `--no-ff`. Hash: `6e9dfdb4`. Push confirmado:
`origin/main` sincronizado (`ahead 0`, `behind 0`).

## Fila

- Card novo: ligar `reservaDoPedidoExpirou` (landing) a `reservaDeCartaoExpirada`
  (core) — Achado 1.
- Card novo/urgente: investigar `platformAdmin` undefined em `vendasRules.integration.test.ts`
  fora do território da reserva — Achado 2.
- Card novo/urgente: `revContasMotor.antagonista.test.ts` tem 8/18 falhas reproduzíveis
  em `main`, fora do território da reserva — Achado 3.
- Card novo, menor: a suíte de 251 arquivos como lote único não é confiável (achado
  reforça o aviso que já vinha no brief) — vale avaliar particionar em fatias
  estáveis por subsistema, ou dar a cada arquivo Rules-dependente sua própria
  varredura de porta via `FIRESTORE_EMULATOR_HOST`.
