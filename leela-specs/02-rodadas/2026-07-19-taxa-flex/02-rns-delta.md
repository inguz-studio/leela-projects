---
tags: [leela, decisoes, rns, rodada, taxa]
trace: leela-build-2d6ee98d
lote: TAXA-FLEX-SPEC
data: 2026-07-19
---

# 02-rns-delta · RNs novas da rodada TAXA-FLEX

> Numeração atribuída **após grep de colisão**. Banda **178–199 livre**: a lista distinta de RNs salta de **RN-177** direto para **RN-200** (RN-176/177 do cluster estrangeiro são as últimas da faixa 170s). Prova: `grep -rn 'RN-17[8-9]\|RN-18[0-3]'` em `leela-specs/` = **0 hits**; `grep -rn 'RN-17[8-9]\|RN-18[0-5]'` em `**/*.{ts,tsx,json}` (fora de `node_modules`) = **0 hits**. Série 178–183 = **taxa da plataforma flex** (par percentual+fixo por meio de pagamento).
>
> **Consolidação nos épicos (regra dos boards):** cada RN consolidou no épico dono na mesma aterrissagem — E04 (config/tabela), E09 (cálculo/repasse/estorno), E12 (checkout/exibição), com reconciliação de RN-404/406 em E16. A rodada guarda só o delta.

## Novas

| RN | Regra | Épico | Lote de código (fila) |
|---|---|---|---|
| **RN-178** | **Tabela de taxa-flex por meio de pagamento.** A taxa da plataforma deixa de ser um `platformFeePct` único e vira uma **tabela por meio** (`pix \| cartao \| boleto`) de `{percentual, fixoCentavos}`. **Global** (default de todos) em `platform/config` + **override por organizador** em `commercialTerms/current` (precedência **organizador > global**). **Sem nível por-evento no v1.** Escrita **só de `platform_admin`** em ambos (RN-404); ator "comercial" para o override negociado = futuro. Generaliza RN-330/RN-406 (fonte da taxa) e o par percentual+fixo por tenant (decisão 2026-07-05). | E04 (dona) · E16 (fonte global, reconcilia RN-404/406) | (j) TAXA-FLEX |
| **RN-179** | **Congelamento da taxa na cotação/pedido.** No ato da compra, o par `{percentual, fixoCentavos}` do **meio escolhido** é resolvido (override > global) e **carimbado** no pagamento (`conciliacao.taxaPct`/`taxaFixa`/`taxaValor` — campos já existentes) + na cotação/pedido, na **mesma tx da confirmação**, no padrão de congelamento do COMF2 (E08) e do `taxaModo` RN-347. **Mudança da tabela nunca reprecifica pedido existente**; replay não recomputa contra tabela nova. | E09 (dona) · E12 (efeito) | (j) TAXA-FLEX |
| **RN-180** | **(a) Interação com `taxaModo` RN-347, por meio de pagamento.** `taxa(meio) = round(face × percentual) + fixoCentavos`. **repassada** ⇒ comprador paga `face + taxa(meio)` (varia por meio, **exibido por opção** no checkout — ex.: PIX R$108,00 · Cartão R$110,30); líquido do organizador = face. **absorvida/incorporada** ⇒ total do comprador = face (não muda por meio); líquido do organizador = `face − taxa(meio)` (varia por meio). Estende `computeSaleState`/`computeLiquidoProdutor` de percentual único para percentual+fixo por meio. | E12 (exibição) · E09 (cálculo) | (j) TAXA-FLEX |
| **RN-181** | **(b) Estorno: componente fixo no rateio cent-exato.** O estorno devolve o **PAGO** com o rateio vigente; o **fixo** entra por linha **como a taxa percentual entra hoje** (`itens[].taxaRepassada`, **maior resto**, proporcional ao `valorFinal`, ∑ das linhas = taxa carimbada). **Fronteira aberta (NÃO decidida aqui):** SE o reembolso devolve a taxa ao comprador = decisão do Vitor pendente (lane **BENCHMARK-REEMBOLSO**; `DECISOES-ABERTAS` item 23). RN-181 crava só o COMO ratear o fixo; o SE não é decidido. | E09 (dona) | (j) TAXA-FLEX |
| **RN-182** | **(d) Contabilidade/repasse mode-aware por meio.** Líquido a receber = `face − taxa(meio)` quando **absorvida**; = `face` quando **repassada** (taxa paga por fora, vai à Leela, nunca entra no "a receber"). Ledger do organizador usa **só o face** (`valorFace`). Confere contra o fio RN-347 (E09:821) — mesma regra, taxa agora resolvida por meio (percentual+fixo). | E09 (dona) | (j) TAXA-FLEX |
| **RN-183** | **Rounding único + fonte única no core.** Arredondamento único = **half-up em centavos inteiros** (convenção da casa, COMF2/RN-347). Fonte de cálculo = função `computeTaxaPlataforma(faceCentavos, {percentualBp, fixoCentavos})` no core, **sem constante hardcoded** (RN-404); a fonte de dados é a tabela (RN-178). Mesmo padrão de fonte única do `PIX_EXPIRACAO_SEGUNDOS`. | E00/core · ref E09/E16 | (j) TAXA-FLEX |

## Ampliadas / reconciliadas (sem novo número)

- **RN-330** (taxa da plataforma sobre receita bruta) — a **fonte** passa da constante/`platformFeePct` único para a **tabela por meio** (RN-178). O cálculo por pagamento usa a linha do meio do próprio pagamento.
- **RN-347** (taxaModo incorporada/repassada) — o cálculo de "quem paga / a receber" agora resolve `taxa` por meio (percentual+fixo) em vez de percentual único; a semântica de modo (RN-180) e o carimbo (RN-179) são o par novo. Estorno já documentado em RN-347 (devolve o PAGO; organizador usa só face) **ganha** o rateio do componente fixo (RN-181).
- **RN-404 / RN-406** (E16 — termos comerciais só do platform_admin / fonte da taxa) — reconciliadas: a fonte da taxa é a tabela por meio (global + override), ambas escrita exclusiva de `platform_admin`.
- **RN-348** (D+N + retenção) — inalterada; opera sobre o líquido já resolvido por meio (RN-182). Sem colisão.

## Premissas a ratificar (NÃO é RN)

- **(c) Comissão de afiliado sobre FACE** (P-TAXAFLEX-3) — base da comissão permanece FACE (RN-310); a taxa-flex não muda. Ratificar.

## Pergunta aberta registrada (NÃO decidida)

- **(e) Taxa por parcela?** Parcelamento fora do v1 desta RN (taxa única por meio `cartao`). Se a taxa da plataforma deve variar por parcela = pergunta aberta em `DECISOES-ABERTAS` (não decidir aqui).

## Fronteira referenciada (decisão de outra lane — NÃO decidir)

- **Cobrar vs devolver a taxa no reembolso** — lane **BENCHMARK-REEMBOLSO** (`outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`; `DECISOES-ABERTAS` item 23, pendente-de-confirmação). RN-181 especifica o rateio do fixo, não o SE devolve.
