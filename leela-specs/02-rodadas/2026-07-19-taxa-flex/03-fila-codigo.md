---
tags: [leela, decisoes, fila, rodada, taxa]
trace: leela-build-2d6ee98d
lote: TAXA-FLEX-SPEC
data: 2026-07-19
---

# 03-fila-codigo · Lote de código derivado da rodada TAXA-FLEX

> Card de fila **SEM implementar** (esta lane é só documentação/spec). Vira brief de execução num lote próprio. **Estado: 📋 executável-APÓS-CLAIM-FIX** — mesmo território do checkout (`computeSaleState`/pedido/pagamento) que a lane **CLAIM-FIX** (RN-174) está tocando agora; para não colidir no mesmo código, executa **depois** que o CLAIM-FIX aterrissar. É dinheiro/gateway ⇒ **rota Fable + review antagonista obrigatória**.

| # | Lote | Escopo | RNs | Dep / Nota |
|---|---|---|---|---|
| (j) | **TAXA-FLEX** (📋 executável-após-CLAIM-FIX) | (1) Modelo: tabela por meio `{pix\|cartao\|boleto}→{percentual, fixoCentavos}` — **global** em `platform/config` + **override por organizador** em `commercialTerms/current`, escrita só `platform_admin`, Rules fail-closed (RN-178/404). (2) Core: `computeTaxaPlataforma(faceCentavos, {percentualBp, fixoCentavos})` half-up centavos, fonte única, sem hardcode; estender `computeSaleState`/`computeLiquidoProdutor` de pct-único para pct+fixo por meio (RN-180/182/183). (3) Congelamento: resolver override>global no ato da compra e carimbar `conciliacao.taxaPct/taxaFixa/taxaValor` + cotação na mesma tx (RN-179). (4) Estorno: fixo entra no rateio `itens[].taxaRepassada` por maior resto (RN-181). (5) Checkout (E12): total por opção de meio em repassada (PIX vs cartão) + atualizar a nota A-5 para refletir variação por meio. (6) Config UI (platform admin): tela da tabela global + override por organizador. | RN-178, RN-179, RN-180, RN-181, RN-182, RN-183 | **Executável-após-CLAIM-FIX** (mesmo território de checkout; a lane CLAIM-FIX RN-174 está ativa — não sobrepor o mesmo código). É dinheiro ⇒ rota Fable + antagonista. Campos `conciliacao.taxaFixa`/`taxaPct` **já existem** no modelo (reuso, não criar). Parcelamento por-parcela FORA (pergunta aberta e). `boleto` inerte até o checkout ter boleto (P-TAXAFLEX-2). |

## Não-cards (fronteiras / pendências de outra lane)

- **BENCHMARK-REEMBOLSO** (lane em paralelo) decide se o reembolso devolve ou não a taxa (percentual+fixo) ao comprador — RN-181 só especifica o rateio do fixo; o SE vira regra quando o benchmark voltar (`DECISOES-ABERTAS` item 23).
- **Comissão de afiliado sobre FACE** (premissa c) — a ratificar pelo Vitor antes de encostar no split; hoje já é FACE (RN-310), então nada muda por default.
- **Taxa por parcela** (pergunta aberta e) — se a taxa da plataforma deve variar por parcela. Fora do v1.
- **Ator "comercial"** para editar o override negociado — futuro; no v1 é `platform_admin` (RN-178/404).
