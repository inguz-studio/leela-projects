---
tags: [leela, decisoes, rodada, produto, taxa, financeiro]
aliases: ["Rodada taxa-flex 2026-07-19", "TAXA-FLEX", "DEC-TAXAFLEX-0719"]
trace: leela-build-2d6ee98d
lote: TAXA-FLEX-SPEC
data: 2026-07-19
fonte: lembrete do Vitor (verbatim abaixo) + AskUserQuestion 2026-07-19 (nível de config + exibição no checkout)
---

# Rodada taxa-flex — 2026-07-19 (TAXA-FLEX)

Arquivo canônico da rodada. Preserva o **verbatim** do Vitor e registra a consolidação nos épicos (E04/E09/E12, com reconciliação em E16) e nas RNs novas. Delta de RNs em `02-rns-delta.md`; fila de código derivada em `03-fila-codigo.md`.

Escopo: **spec-only, ZERO código.** A taxa da plataforma passa a ser **percentual + valor fixo por venda, variável por meio de pagamento**, configurável, congelada na cotação. O código vira card de fila EXECUTÁVEL-APÓS-CLAIM-FIX (mesmo território do checkout; a lane CLAIM-FIX está ativa agora).

## Verbatim do Vitor (preservar)

> *"lembrei de uma coisa, nao configuramos no pagamento o valor da taxa fixa por venda, quero ter essa flexibilidade, para cobrança, por exemplo em caso de uso, 6% pix + 2,00 ou 8% de cartão + 1,50"*

O par percentual+fixo já estava previsto no nível do tenant (decisão 2026-07-05, `DECISOES-ABERTAS` §100: *"percentual puro OU percentual + fixo (ex.: 8% + R$2,00), configurável por tenant no CommercialTerms"*), e a taxa por método também (defaults 10% cartão / 8% PIX, `DECISOES-ABERTAS` §101). Esta rodada **fecha as duas pontas**: o componente **fixo** passa a ser configurável **por meio de pagamento** (não só o percentual), e a taxa vira uma **tabela por meio** (`pix | cartao | boleto`), com fonte global + exceção por organizador, carimbada na compra.

## Decisões ratificadas (AskUserQuestion 2026-07-19)

### Nível de configuração = tabela GLOBAL + exceção por organizador
Tabela **GLOBAL da plataforma** (o default que vale para todos) + **exceção por organizador** (condição negociada por contrato, precedência organizador > global). **Sem nível por-evento no v1.** ⇒ **RN-178** (modelo da tabela).

### Checkout com taxa repassada = total varia por meio, exibido por opção
Em modo **repassada** (RN-347), o total do comprador **varia por meio de pagamento e é exibido por opção** antes de pagar (ex.: **PIX R$ 108,00 · Cartão R$ 110,30**). ⇒ **RN-180** (interação com o `taxaModo`) + atualização da nota de taxa A-5 do checkout.

## Interações especificadas (cada uma com regra escrita)

### (a) Fio do `taxaModo` RN-347 ⇒ RN-180
`repassada` ⇒ o comprador paga `face + taxa(meio)`, onde `taxa(meio) = round(face × percentual) + fixoCentavos` do meio escolhido; o total varia por meio e é exibido por opção; o líquido do organizador segue = face. `incorporada`/absorvida ⇒ o total do comprador **não muda** (= face, mesmo em qualquer meio); o **líquido do organizador varia por meio** (= face − taxa(meio)). Estende `computeSaleState`/`computeLiquidoProdutor`, que hoje tratam a taxa como percentual único, para `percentual + fixo por meio`.

### (b) Estorno ⇒ RN-181 (o COMO; o SE fica na fronteira aberta)
O estorno devolve o **PAGO** pelo inscrito com o **rateio cent-exato vigente**; o componente **fixo** entra no rateio por linha **exatamente como a taxa percentual entra hoje** (`itens[].taxaRepassada`, método do **maior resto**, proporcional ao `valorFinal` da linha, ∑ das linhas = taxa carimbada). **Fronteira NÃO decidida aqui:** SE o reembolso devolve ou não a taxa (percentual+fixo) ao comprador é **decisão AINDA aberta do Vitor** — lane **BENCHMARK-REEMBOLSO** (`outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`; `DECISOES-ABERTAS` item 23, pendente-de-confirmação). RN-181 especifica só a mecânica de rateio do fixo quando/se devolver; o SE não é decidido nesta rodada.

### (c) Comissão de afiliado ⇒ premissa a ratificar (não é RN nova)
A base de cálculo da comissão de afiliado **permanece FACE** (RN-310: percentual sobre o valor **FACE** OU valor fixo por inscrição), coerente com a contabilidade do organizador em FACE (RN-319/RN-347). A taxa-flex **não** muda a base da comissão. Registrada como **premissa a ratificar** (P-TAXAFLEX-3). RN-318/319 são escopo de leitura/acompanhamento — não a base de cálculo.

### (d) Contabilidade/repasse ⇒ RN-182
Líquido a receber do organizador = `face − taxa(meio)` quando **absorvida**; = `face` quando **repassada** (o comprador pagou a taxa por fora; a taxa vai à Leela e nunca entra no "a receber"). O ledger do organizador usa **só o face** (`valorFace`), consistente com o carimbo por meio da RN-179. Confere contra o fio RN-347 existente (E09:821) — é a mesma regra, agora com a taxa resolvida por meio (percentual+fixo) em vez de percentual único.

### (e) Parcelamento de cartão ⇒ FORA do v1 (pergunta aberta registrada)
A taxa-flex tem **uma taxa por meio** (`cartao` é uma linha única). **Parcelamento fica FORA do v1 desta RN.** Pergunta aberta registrada, sem decidir: *a taxa da plataforma deve variar por parcela?* Ortogonal aos juros de parcelamento Price 3,49% a.m. já repassados ao comprador (decisão 2026-07-05), que são outra conta. ⇒ `DECISOES-ABERTAS` item novo (pergunta aberta).

### (f) Estrangeiro (RN-176, gated) ⇒ premissa
O **cartão internacional à vista** do checkout de estrangeiro (RN-176 — "sem PIX, sem boleto, sem parcelamento") **herda a linha `cartao`** da tabela de taxa. Premissa (P-TAXAFLEX-5), coerente com RN-176 restringir o estrangeiro ao rail `cartao`. Sem linha própria de taxa no v1.

## Rounding e fonte única (core)

- **Regra de arredondamento única e cravada:** **half-up em centavos inteiros** — a convenção da casa (COMF2 já usa `centavos × basis-points inteiros, half-up`, E08:317; RN-347 já opera em centavos). ⇒ **RN-183**.
- **Fonte única:** a **tabela** é a fonte de dados (RN-178, em `platform/config` global + `commercialTerms` override, escrita só de `platform_admin` — RN-404/406); a **função** é a fonte de cálculo (`computeTaxaPlataforma(faceCentavos, {percentualBp, fixoCentavos})` no core, ao lado de `computeLiquidoProdutor`), **sem constante hardcoded** (RN-404). Mesmo padrão de fonte única do `PIX_EXPIRACAO_SEGUNDOS` (RN-157) e do `commercialTerms.platformFeePct` (RN-406).

## Congelamento (carimbo na cotação/pedido) ⇒ RN-179

No momento da compra, o par `{percentual, fixoCentavos}` do **meio escolhido** é resolvido (override > global) e **CARIMBADO** no pagamento (`conciliacao.taxaPct`/`taxaFixa`/`taxaValor` — os campos **já existem** no modelo, `modelo-de-dados-firestore.md:92`) e na cotação/pedido, na **mesma transação da confirmação**, no **mesmo padrão de congelamento da comissão do COMF2** (E08:317 — config vigente congelada no doc, mudança só afeta futuras) e do `taxaModo` RN-347. **Mudança da tabela nunca reprecifica pedido existente**; replay não recomputa contra tabela nova.

## Premissas assumidas nesta consolidação

- **P-TAXAFLEX-1** · A tabela de taxa-flex é a generalização por meio do `commercialTerms.platformFeePct` (RN-406/E16). A **global** mora em `platform/config` (nova fonte, reconciliada em E16); o **override por organizador** mora em `commercialTerms/current` do tenant. **Escrita só de `platform_admin` em AMBOS no v1** (RN-404); um ator "comercial" que edite o override negociado é **futuro** (registrado, não aberto agora). Sem nível por-evento no v1 (decisão ratificada).
- **P-TAXAFLEX-2** · `boleto` fica na tabela por completude do enum de meios, mas o checkout público não oferece boleto hoje (`pagamentos.forma ∈ {cartao_credito, pix}`, `modelo-de-dados-firestore.md:92`). A linha `boleto` da tabela é inerte até o boleto existir no checkout — especificada, não ativada.
- **P-TAXAFLEX-3** (c) · Comissão de afiliado sobre FACE = premissa a ratificar; consistente com RN-310/RN-319. Não vira RN nesta rodada.
- **P-TAXAFLEX-4** · O componente fixo é `fixoCentavos` (inteiro, centavos), nunca reais fracionários, para casar com o rateio de maior resto (RN-181) e o rounding half-up (RN-183) sem erro de ponto flutuante.
- **P-TAXAFLEX-5** (f) · Estrangeiro (RN-176) herda a linha `cartao`. Premissa.
- **P-TAXAFLEX-6** · A nota de taxa A-5 (CKFIX, hoje badge condicional "+ taxa de serviço" por `taxaRepassada`) precisa passar a refletir que **o valor varia por meio** (PIX vs cartão). É atualização de spec de UI (E12) — o texto literal vive no código/`CHECKOUT-UX-REPORT.md`, não nos canônicos; aqui fica a direção.
