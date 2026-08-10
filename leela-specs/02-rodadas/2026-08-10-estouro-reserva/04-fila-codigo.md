---
tags: [leela, fila, rodada, estouro, reserva, checkout, pix, fila-tecnica]
trace: leela-estouro-reserva-20260810
lote: SPEC-ESTOURO-RESERVA
data: 2026-08-10
---

# 04-fila de código · duas frentes, na ordem que não pode inverter

> Regras em [[03-spec]], canônicas em [[LEELA-E04-config-vendas]]. Nada desta fila foi
> construído; nada sobe sem a spec ter passado.
>
> **⚔ em tudo que toca o contador de vagas ou o caminho do dinheiro.** Rota opus, review
> antagonista em contexto fresco, lane própria, sem carona em deploy pronto — é a régua que a
> fila de 09/08 já cravou para a ESTOURO-RESERVA.
>
> **A correção mínima não está aqui e não espera por aqui.** `S315-T3` e `S315-T4`
> (estouro vira dado e tela honesta — RN-498) seguem em `2026-08-05-lotes-ux/03-fila-codigo.md`,
> independentes desta frente, como o painel prometeu.

## Frente 1 · a varredura do PIX vencido (S322) — sobe primeiro e sozinha

**Lane:** backend · **Territórios:** `functions/src/checkout/expirarPixPendente.ts` (chamador de
sistema), `functions/src/checkout/` (function nova), `functions/src/index.ts` (export),
`firestore.indexes.json` (índice novo), `functions/src/__tests__/`
**Não toca:** `apps/`, `firestore.rules`, `packages/core` (fora de constantes já exportadas)
**Espera:** nada.

| # | Task | O que faz | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| 1a | `S322-T1` | O core da expiração ganha o chamador de sistema: `expirarPixPendenteCore` aceita `{uid}` ou `{sistema:true}`; ownership continua obrigatória na porta pública, provado por teste de ataque que chama com uid alheio e leva `permission-denied` | — | opus | ⚔ |
| 1b | `S322-T2` | A varredura `varrerPixVencidos`: wrapper `runWith({secrets})` + `pubsub.schedule('3-58/5 * * * *').timeZone('America/Sao_Paulo')` + Core bounded (teto por rodada) sobre a query `status == 'pendente' && pixExpiraEm <= agora`; índice composto novo em `pagamentos` declarado em `firestore.indexes.json`; logs `pix_varredura_rodada`/`pix_varredura_item_falhou` sem PII | 1a | opus | ⚔ |
| 1c | `S322-T3` | O teste de agendamento: expressão explícita e timezone lidos do wrapper, no molde `adminVisaoOnda1Agendamento.test.ts` — trocar por `every 5 minutes` deixa o caso vermelho | 1b | sonnet | — |
| 1d | `S322-T4` | Idempotência das três portas: varredura × webhook OVERDUE × onCall em corrida par a par no Emulator — uma transição só, `gatewayCancelado` correto em cada porta | 1b | opus | ⚔ |

**Gate da frente.** Suíte de functions verde; `secretsBinding.contract.test.ts` cobre a function
nova; nenhum pagamento dentro do prazo tocado; recusa do gateway deixa o pedido vivo (fail-safe
herdado provado por mock que nega o cancelamento). Review antagonista antes de deploy — e o
deploy desta frente é o pré-requisito declarado da frente 2.

## Frente 2 · a reserva do pedido pendente (S323) — só depois da frente 1 no ar

**Lane:** fullstack + dinheiro/estoque · **Territórios:** `packages/core/src/eventos/lote.ts`
(parse de `reservas`), `firestore.rules` (bloco do lote), `functions/src/checkout/createInscricaoCharge.ts`
(gate + incremento), `functions/src/checkout/webhookPagamento.ts` (liberação/conversão),
`functions/src/checkout/expirarPixPendente.ts` (liberação no flip), a function da varredura
(recontagem), `cotarInscricaoCheckout.ts` + telas de vagas (estado honesto),
`functions/src/__tests__/`
**Espera:** frente 1 **no ar e provada** · ESTOURO-2 apenas para a 2g.

| # | Task | O que faz | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| 2a | `S323-T1` | O campo `reservas` no lote: parse Postel no core (ausente = 0, inteiro ≥ 0) e o regime Function-only nas Rules, no molde exato do `vendidos` (`firestore.rules:1109-1117`), com ataque na suíte de Rules | — | opus | ⚔ |
| 2b | `S323-T2` | O gate transacional + incremento em `criarDocsDeCheckout`: por linha/lote, `vendidos + reservas + linhas > quantidadeLimite` recusa com motivo tipado sem criar doc nenhum; incremento no mesmo commit dos docs | 2a | opus | ⚔⚔ |
| 2c | `S323-T3` | A liberação nas quatro saídas, cada uma na própria tx: confirmação (converte), `'failed'` do webhook, flip da varredura e flip do onCall — decremento junto do flip, nunca em passo separado | 2b | opus | ⚔⚔ |
| 2d | `S323-T4` | A recontagem absoluta de `reservas` no fecho de cada rodada da varredura (cura de drift; recontagem substitui, não soma; `reservas` não é ratchet — e o teste diz por quê) | 2c | opus | ⚔ |
| 2e | `S323-T5` | O comprador seguinte lê o estado honesto: a cotação distingue "esgotado" de "últimas vagas em pagamento, podem voltar em minutos" (motivo tipado novo, copy proposta na spec), e o painel do organizador mostra `reservas` ao lado de vendidos/disponíveis | 2b | sonnet | — |
| 2f | `S323-T6` | O delta da RN-158 aplicado nas superfícies: onde a doc/copy diz "carrinho não segura estoque", entra a exceção da cobrança emitida | 2b | sonnet | — |
| 2g | `S323-T7` | O teto da reserva de cartão — **retida pelo ESTOURO-2**; só nasce com a resposta do dono, na forma que ele escolher | 2d + veto | opus | ⚔ |

**Gate da frente.** Os oito Given/When/Then da S323 verdes; RN-182 conferida intocada por teste
(nenhum valor de venda, taxa ou repasse muda); RN-300 provada intocada (reserva morta não reabre
lote encerrado por data; nenhum carimbo nasce de reserva); ataque de Rules sobre `reservas`;
a suíte inteira do checkout (`checkoutFoundation`, `pixCarrinho`, `pixArbitragem`,
`virarLote.integration`) verde sem afrouxar caso nenhum. Review antagonista dupla: é contador de
vaga dentro da transação do dinheiro.

## O que pode andar em paralelo, e o que não pode

A frente 1 não toca tela e pode correr em paralelo com qualquer lane de `apps/`. A frente 2 toca
`createInscricaoCharge.ts` e `webhookPagamento.ts` — **não compartilhar worktree** com nenhuma
lane que encoste em checkout (a lição de coordenação da BUILD-LOTES-UX vale aqui; `S318-T1` e
`S317-T2` mexem em vizinhança de `computeSaleState` e têm ordem própria já registrada). A 2e toca
telas de vagas do painel, mesmo território da `S315-T4` — se as duas forem despachadas, a `S315-T4`
primeiro, porque a copy do estouro ("N acima do configurado") é insumo da copy da reserva.

## Ordem executável

1a → 1b → (1c ∥ 1d) → **deploy + review da frente 1** → 2a → 2b → 2c → 2d → (2e ∥ 2f) → 2g
(quando o ESTOURO-2 fechar). Nada desta fila pega carona em deploy de outra lane.
