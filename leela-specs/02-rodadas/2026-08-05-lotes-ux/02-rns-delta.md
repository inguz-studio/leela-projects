---
tags: [leela, rn, regras-de-negocio, rodada, lotes, congelamento, capacidade, estouro]
trace: leela-pixreal-diag-20260804
lote: SEAL-LOTES
data: 2026-08-05
---

# 02-rns-delta · o que congela num lote vendido, e o estouro que ninguém via

> Delta de RN da lane SEAL-LOTES. O enunciado canônico de cada regra vive no épico dono,
> consolidado na mesma aterrissagem ([[CONVENCAO-BOARDS]] §2). Este arquivo é o delta do dia e diz
> para onde cada uma foi.
>
> **A regra grande desta rodada não é regra nova.** É a RN-200 valendo como está escrita, depois
> de a apuração mostrar que o código andou além dela sem que ninguém escrevesse o enunciado da
> extensão.

## Prova de não colisão

A faixa mais alta com enunciado é a **RN-496**, criada em 05/08 pela lane SPEC-METRICAS-SERVICO.
As faixas **483 a 485** ficaram vagas de propósito pela reserva da SPEC-CONTAS-LANDING, e
ressuscitá-las quebraria a leitura de quem confia no [[indice-de-regras-de-negocio]]. A **RN-499**
é marcador de faixa sem enunciado e fica de fora pela mesma razão.

Varredura por `RN-497` e `RN-498` sobre `leela-specs/`, `apps/`, `packages/`, `functions/src/` e
`firestore.rules`: zero ocorrências.

**Esta lane consome RN-497 e RN-498.**

## O delta da RN-200, que é o coração desta rodada

O dono declarou que pode editar quantidade e datas de um lote em vigência, e não pode editar
valores. A apuração mostrou que **ele estava pedindo a RN-200 exatamente como ela está escrita**,
e que o divergente é o código.

| Camada | O que ela diz hoje |
|---|---|
| **RN-200**, enunciado canônico em [[LEELA-E03-operacao-evento]] | *"Após a 1ª venda, edição de **preço** (evento/kit/lote) é bloqueada."* Só preço. |
| **RN-304**, em [[LEELA-E04-config-vendas]] | Capacidade de lote **é** editável pós-venda pelo organizador, via Function, com trilha de auditoria; reduzir abaixo do vendido é negado. |
| **`firestore.rules:1118-1123`**, `loteComercialImutavelSeVendido` | Congela seis campos: `preco`, `inicioEm`, `fimEm`, `quantidadeLimite`, `ordem` e `modalidade`. |

A extensão de quatro campos além do preço **nunca teve enunciado**. Ela vive em comentário de
código na Rule, no `api-client` e no `loteForm`, com a marca `"RN-200/300 (registrado)"`, que
registra a intenção e não a regra. Documentação que só existe como comentário é documentação que
diverge em silêncio, e foi o que aconteceu.

Campo a campo, depois do selo:

| Campo | Congela pós-venda? | Por quê |
|---|---|---|
| `preco` | **Sim** | RN-200, inalterada. Dinheiro cotado é dinheiro congelado. |
| `quantidadeLimite` | **Sim na Rule, aberto pela Function** | RN-304. A Rule fecha a escrita direta do cliente de propósito; a porta autorizada é `ajustarCapacidadeLote`, com motivo obrigatório e auditoria. Nada muda aqui. |
| `inicioEm` / `fimEm` | **Não deve congelar** | O dono pediu. A RN-200 nunca travou janela. Precisa de tarefa em `firestore.rules` — RN-497 e a fila. |
| `ordem` | **Sim** | Ninguém pediu, e mexer nela reordena a sequência de virada de um lote que já vendeu. RN-497. |
| `modalidade` | **Sim** | Ninguém pediu, e mexer nela órfãna inscritos que compraram sob a modalidade anterior. RN-497. |

## Novas

| RN | Regra | Épico dono | Lane |
|---|---|---|---|
| **RN-497** | **O congelamento pós-venda de um lote é o preço, mais a ordem e a modalidade, e nada além disso.** A RN-200 vale como está escrita e trava **só o preço**; a extensão que a Rule aplicava a `inicioEm` e `fimEm` é **revogada**, porque o dono declarou a janela editável e a regra escrita sempre concordou com ele. `quantidadeLimite` continua fechado à escrita direta do cliente e continua aberto pela Function auditada da RN-304 — a Rule e a regra não se contradizem aqui, e o campo não muda de tratamento. `ordem` e `modalidade` **passam a ter enunciado próprio** e continuam congelados por razão declarada, não por herança de comentário: mudar a ordem reordena a sequência de virada de um lote que já vendeu, e mudar a modalidade órfãna o inscrito que comprou sob a anterior. Nenhum dos dois foi pedido. **Onde a mudança acontece:** `loteComercialImutavelSeVendido` (`firestore.rules:1118-1123`) perde `inicioEm` e `fimEm` da lista; o `MSG_LOTE_VENDIDO` do painel (`apps/painel/src/routes/eventos/lotes/_lib/loteForm.ts:58-60`) para de dizer que a janela aguarda selo, porque o selo é este; e o `CAMPOS_CONGELADOS_APOS_VENDA` do mesmo arquivo, hoje export morto, passa a ser o espelho consultado ou deixa de existir. **A janela editável não afrouxa a RN-300:** a invariante de não sobreposição entre lotes irmãos continua valendo e continua sendo checada antes da escrita. Falsificação: um lote com `vendidos > 0` tem de aceitar um `fimEm` novo que não pise em irmão, recusar um que pise, e recusar qualquer alteração de `preco`, `ordem` e `modalidade` no mesmo gesto. | E04 (dona) · E03 (define a RN-200 que ela reafirma) | SEAL-LOTES |
| **RN-498** | **Vender além da capacidade do lote é possível, e nunca pode ser silencioso.** Duas pessoas com PIX pendente para a mesma última vaga passam as duas pelo `computeSaleState`, porque a vaga só é contada na **confirmação** do pagamento, e a RN-158 já declara que carrinho aberto não segura estoque. Quando as duas pagam, `webhookPagamento` vira as duas para `confirmado` sem revalidar lote nem capacidade, e `virarLote` recomputa `vendidos = max(atual, tally)` sem teto (`functions/src/eventos/virarLote.ts:215`). O resultado é `vendidos > quantidadeLimite`, e a tela o esconde: `capacidadeDoLote` corta o disponível em zero (`packages/core/src/eventos/capacidadeLote.ts:43`), então o painel exibe "20 vendidos · 0 disponíveis · 19 no total" como se estivesse tudo certo. **A regra crava três coisas.** Primeira: o ingresso pago **nunca** é recusado nem estornado por causa do estouro — o dinheiro entrou e a entrega é devida. Segunda: `virarLote` passa a expor no `ResultadoVirarLote` os lotes em que `vendidos > quantidadeLimite` e a logar `lote_excedido` com `{eventoId, loteId, vendidos, quantidadeLimite}`. Terceira: toda superfície que mostra vagas passa a dizer **"N acima do configurado"** em vez de "0 disponíveis", porque zero disponível e estouro são estados diferentes e o organizador precisa saber em qual está. **O que a regra deliberadamente não decide:** se a vaga passa a ser reservada durante a janela do carrinho, fechando a venda dupla na origem. Isso é mudança de modelo e é decisão do dono — item **ESTOURO-1** do painel. As três exigências acima valem com ou sem a reserva. Falsificação: forçar `vendidos = 21` num lote de 20 tem de produzir a linha de log e o aviso na tela, e nenhuma tela pode exibir "0 disponíveis" sobre um lote estourado. | E04 (dona) · E03 e E09 (consomem) | SEAL-LOTES |

## Ampliadas e reconciliadas (sem número novo)

- **RN-200** — enunciado **inalterado** e agora exigível na letra. Ela sempre travou só o preço; a
  RN-497 remove do código a extensão que ninguém escreveu. Esta é a correção de uma divergência
  entre regra escrita e regra executada, não uma mudança de regra.
- **RN-304** — inalterada. A capacidade de lote vendido já era editável pela Function auditada, e o
  que a BUILD-LOTES-UX entregou foi o **atalho** para essa porta dentro do editor, mais os três
  números à vista. Nenhuma Rule foi tocada e nenhum campo foi aberto ao cliente.
- **RN-300** — inalterada, e é ela que sustenta o limite da RN-497. A virada por data ou por
  quantidade continua sendo o mecanismo, e a não sobreposição entre irmãos continua sendo
  invariante: abrir a janela de um lote vendido não autoriza sobrepor.
- **RN-158** — inalterada, e agora com consequência escrita. O prazo do carrinho continua não
  sendo reserva de vaga. A RN-498 registra o efeito disso no contador do lote em vez de mudar a
  RN-158; se o dono escolher a reserva no **ESTOURO-1**, é a RN-158 que ganha delta, e não esta.
- **RN-487** — inalterada e sem interseção. Ela governa `qtdInscritos`, o contador que congela a
  configuração comercial do evento e conta qualquer status. O estouro da RN-498 é de `vendidos`,
  que é outro número, escrito só por `virarLote` e contando `confirmado` e `estornado`
  (`STATUS_QUE_CONTAM_VENDA`). Métrica e capacidade nunca foram o mesmo contador, e continuam
  não sendo.
- **RN-486** — inalterada. Contar só pagante na tela do organizador não abre nem fecha sobrevenda,
  pela mesma separação acima.
- **RN-229** — inalterada. O `SubNav` mudou de estilo interno e não de contrato: a divisória de
  1px e a rolagem lateral em tela estreita seguem valendo, e o que saiu foi o cromo da barra.

## Onde cada uma foi consolidada

| RN | Épico |
|---|---|
| RN-497, RN-498 | [[LEELA-E04-config-vendas]] |
