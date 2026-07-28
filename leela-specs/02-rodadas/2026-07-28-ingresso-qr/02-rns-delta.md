---
tags: [leela, decisoes, rns, rodada, ingresso, qrcode, credenciamento]
trace: leela-build-2d6ee98d
lote: SPECS-0728
data: 2026-07-28
---

# 02-rns-delta · RNs novas do delta de ingresso e credenciamento

> **Prova de não colisão (2026-07-28).** `RN-370` a `RN-380` consumidas pelo pacote de
> estorno; `RN-400` a `RN-410` são do E16; varredura por `RN-381` a `RN-399` em todo o repo
> fora de `node_modules` deu **zero hits**. A lane SPECS-0728 ocupa `RN-385` a `RN-399`;
> este delta usa **RN-396 a RN-399**, os últimos da faixa. `RN-381` a `RN-384` ficam livres.

## Novas

| RN | Regra | Épico | Lote |
|---|---|---|---|
| **RN-396** | **Código identificador do ingresso.** Todo inscrito com ingresso emitido recebe, além do `qrToken` opaco assinado (RN-218), um **código identificador legível**: curto, único **por evento**, em alfabeto que exclui os caracteres visualmente ambíguos (`0`, `O`, `1`, `I`, `L`). Gerado no servidor no mesmo ponto de emissão do ingresso, idempotente por inscrito: reprocessar o webhook **não** troca o código. O código **não é credencial** — a validação de presença continua sendo a verificação de assinatura do `qrToken`, e nenhuma superfície aceita o código como prova de entrada. | E12 (dona da emissão) · E03 (consumidor) | INGRESSO-QR |
| **RN-397** | **Código na tabela, QR sob demanda.** A lista de inscritos do organizador exibe o código identificador como coluna, e o QR do inscrito é aberto por ação na linha, nunca renderizado em massa na tabela. O código é campo de busca da lista, no mesmo padrão de busca que a tela já tem. | E03 (dona) | INGRESSO-QR |
| **RN-398** | **Conteúdo e degradação do e-mail de compra.** O e-mail transacional que a RN-219 já manda ao responsável do pedido passa a carregar, **para cada inscrito do pedido**, o QR do ingresso e o código identificador. O **código vai como texto**, sempre, ao lado da imagem do QR e do link do ingresso: cliente de e-mail que bloqueia imagem remota é o caso comum, e o ingresso não pode depender da imagem carregar. A idempotência continua sendo a da RN-219 (subcoleção de notificações); reprocessar o webhook não reenvia. | E12 (dona) | INGRESSO-QR |
| **RN-399** | **"Entrega" vira "credenciamento" no vocabulário.** Toda superfície que a pessoa lê passa a dizer credenciamento: SubNav do evento, títulos, textos do balcão e dos estados, mensagens, colunas, copy de e-mail, épicos e boards. A **rota** `/eventos/:slug/entrega` vira `/eventos/:slug/credenciamento`, com redirecionamento garantido da antiga pela **RN-234** (teste orientado a tabela e guarda anti-laço, máquina que já existe). **Não** mudam nesta virada: o campo persistido `kitEntregueEm` e o id da área de permissão `entrega`, porque renomear dado gravado é migração e renomear área de permissão mexe na matriz de papéis. A **mecânica é intocada**: RN-205, RN-221 e RN-222 seguem exatamente como estão. | E03 (dona) · E01 (nav) · E12/E13 (copy) | INGRESSO-QR |

## Ampliadas / reconciliadas (sem número novo)

- **RN-218** — o ingresso digital continua sendo `qrToken` assinado por inscrito. A RN-396
  acrescenta um segundo artefato ao lado dele, sem tocar no token nem na assinatura.
- **RN-219** — o disparo e a idempotência ficam idênticos; muda só o conteúdo (RN-398).
- **RN-220** — o PDF sob demanda passa a trazer o código identificador junto do QR, pelo
  mesmo motivo de degradação.
- **RN-205 / RN-221 / RN-222** — **inalteradas**. A DEC-0728G é troca de palavra.
- **RN-234** — o redirecionamento garantido ganha mais uma linha na tabela, que é
  exatamente o caso de uso para o qual a regra foi escrita.
- **RN-157 (padrão)** — o tamanho do código e o alfabeto entram como constante única no
  core, no mesmo padrão de fonte única.

## Fora desta rodada

- **QR de pagamento PIX** — segue como está. O gateway emite e o checkout mostra; nada é
  gerado do nosso lado.
- **Alinhamento de identificador** (`kitEntregueEm`, área `entrega`) — card próprio, com o
  custo declarado. Não entra de carona.
