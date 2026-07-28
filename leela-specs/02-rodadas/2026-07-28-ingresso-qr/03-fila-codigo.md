---
tags: [leela, decisoes, fila, rodada, ingresso, qrcode, credenciamento]
trace: leela-build-2d6ee98d
lote: SPECS-0728
data: 2026-07-28
---

# 03-fila-codigo · Lote INGRESSO-QR

> Pacote da posição 1 estendida (DEC-0728E e DEC-0728G). Donos E12 (emissão e e-mail) e E03
> (tabela do organizador e credenciamento). Território pesado em `functions/src/checkout`,
> disputado com a lane de estorno.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S1206-T5` | Código identificador por inscrito (RN-396): geração no core com alfabeto sem caractere ambíguo e tamanho em constante única, unicidade por evento, emissão no mesmo ponto do `qrToken`, idempotente por inscrito. | `packages/core/src/tickets`, `functions/src` (emissão) | — | opus | ⚔ |
| 2 | `S211-T1` | Coluna do código na tabela de inscritos e QR por ação na linha (RN-397), com o código entrando na busca já existente. | `apps/painel/src/routes/eventos/inscritos` | 1 | opus | — |
| 3 | `S1206-T6` | Conteúdo do e-mail de compra: QR e código por inscrito, código sempre em texto, link do ingresso (RN-398). Reusa o disparo e a idempotência da RN-219. | `functions/src/email`, template | 1 | opus | ⚔ |
| 4 | `S211-T2` | Virada de vocabulário para credenciamento em toda superfície lida (RN-399): SubNav, títulos, balcão, estados, mensagens, colunas e copy. | `apps/painel/src/routes/eventos/**`, DS se houver rótulo no catálogo | — | opus | — |
| 5 | `S211-T3` | Rota `/entrega` vira `/credenciamento`, com a linha nova na tabela de redirecionamento da RN-234 e o teste de tabela correspondente. | `apps/painel/src/app` (mapa de redirects), `EventosRoutes.tsx` | 4 | opus | — |
| 6 | `S1206-T7` | Código identificador no PDF sob demanda (RN-220 ampliada). | geração de PDF | 1 | opus | — |

## Ordem e paralelismo

1. O item 1 é a fundação dos itens 2, 3 e 6.
2. Os itens 2, 3 e 6 são disjuntos entre si e correm juntos depois do 1.
3. Os itens 4 e 5 são a virada de vocabulário e não dependem do código identificador. Podem
   correr em paralelo com a trilha do ingresso, **desde que** o item 4 aterrisse antes do 5:
   trocar a rota antes dos rótulos deixa a tela dizendo "entrega" num endereço de
   credenciamento, que é pior do que qualquer um dos dois estados puros.

## Fronteiras

- **`functions/src/checkout` e o webhook de confirmação** — território disputado. Hoje a
  lane de estorno escreve ali, e o pacote FORMBUILDER também vai escrever
  (`S1212-T1`). **Serializar por lane.** O item 1 é o que encosta nesse ponto.
- **`functions/src/email`** — o pacote E08 também escreve templates novos (`S706-T2`).
  Arquivo comum, blocos distintos: quem aterrissar depois faz rebase e acrescenta.
- **RN-234 e o mapa de redirects** — o item 5 acrescenta uma linha a um mapa que já tem
  quatro e um teste que percorre cada linha, mais os negativos e a guarda anti-laço. É
  acréscimo, não redesenho.

## Critério de pronto do pacote

- [ ] o código é idempotente por inscrito, provado por reprocesso do webhook
- [ ] dois inscritos do mesmo evento nunca recebem o mesmo código
- [ ] nenhuma superfície aceita o código como prova de presença; a validação continua sendo
      a assinatura do `qrToken`
- [ ] o e-mail entrega o código como texto mesmo com imagem bloqueada
- [ ] reprocessar o webhook não reenvia o e-mail
- [ ] a rota antiga `/entrega` redireciona com no máximo um salto e o teste de tabela cobre
      a linha nova
- [ ] `kitEntregueEm` e a área de permissão `entrega` continuam intactos, e a matriz de
      papéis passa sem edição
- [ ] review antagonista em contexto fresco nos itens 1 e 3
