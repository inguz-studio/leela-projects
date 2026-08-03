# Rodada DEC-0803 — achados do dono no teste do parcelamento vivo (2026-08-03, manhã)

O dono testou o checkout com o juros de produção recém-ligado (2,89% a.m., lane
JUROS-PROD-CONFIG) e devolveu três achados de interação, todos na etapa de pagamento.
Verbatim integral ao final.

## Achados e destino

| # | Achado | Classe | Destino |
|---|---|---|---|
| C1-0803 | O subtotal/total exibido NÃO atualiza imediatamente quando o dono faz a seleção (troca de parcelas/forma). Regra: a escada de opções já chega inteira na cotação — trocar parcela é atualização instantânea de tela, sem round-trip; a guarda do item 64 ("Atualizando o total…") só existe quando há cotação NOVA em voo (mudança de seleção de itens/cupom), nunca na troca entre opções já cotadas | UX/dinheiro exibido | Lane CHECKOUT-FIX-0803, ⚔ |
| C2-0803 | Primeira abertura do select de parcelas mostra SÓ o valor do ingresso (1x); as opções completas só aparecem na segunda abertura | Defeito UI | Lane CHECKOUT-FIX-0803, ⚔ |
| C3-0803 | PIX — ordem dos estados: "processando pagamento" só pode aparecer DEPOIS do clique em "código PIX". O clique mostra loader com a mensagem **"Preparando código PIX"**; na sequência o código aparece na tela. Nenhuma cobrança e nenhum estado de processamento antes do clique explícito. **Refina a D-ACH-12/C2 da ACHADOS-0802** (cobrança nascia na escolha da forma PIX → passa a nascer só no clique do botão) | Regra (dinheiro) | Lane CHECKOUT-FIX-0803, ⚔ |

## Fronteiras que continuam valendo

- RN-440: entrar na etapa de pagamento não cria pedido, inscrito nem cobrança.
- Item 64 (CKUX-REV): com cotação nova em voo, botões de pagar desabilitados — o C1-0803
  não revoga a guarda, só proíbe usá-la onde não há cotação em voo.
- 1x do cartão = PIX à vista (RN-436); escada crescente por parcela.

## Verbatim do dono (2026-08-03)

> "sub total, nao altera imediatamente, quando eu faço a seleção. Na primeira vez que
> cliquei no select apareeceu apenas a opção como avlor do ingresso, e nao o
> parcelmanento, somente na segunda vez, que apareciam as opções. Já para o pix, o
> 'processando pagamento só deve aparecer deopis de clicar em 'código pix', com um loader
> apaercendo com a mensagem 'Preparando código pix', com o pix aparecendo na tela. ficou
> claro?"
