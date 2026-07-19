# Handoff vivo — lane TAXAFLEX · run leela-build-2d6ee98d

- Lane: sf-backend-lead (software-forge) · rota Fable + antagonista (DINHEIRO)
- Brief: `.nirvana/briefs/leela-taxa-flex-enriched.md` (RN-178..183)
- Base: main == origin == `d414414`
- Emulator da lane: `firebase.r6.json` portas **8480/9598** · JDK 21 `~/.jdks/jdk-21.0.11+10` · NUNCA 8080/9099 (SUITE-STAB é dona)
- Lição RN-822 (obrigatória): `npm run build` em `functions/` ANTES de todo `emulators:exec` — lib stale testa código velho.

## Estado por task

| Task | Escopo | Status | Commit |
|------|--------|--------|--------|
| T0 | Contexto + inventário de reuso + desenho + checkpoint + card (j) → Em execução | FEITO | `8686585` |
| T1 | Modelo + Rules: core `taxaPlataforma.ts`, `platform/config.taxaPlataforma` global, `commercialTerms.taxaTabela` override, callable `setTaxaPlataformaGlobal` + api-client, Rules fail-closed (RN-178/404) | FEITO — tsc 0 · eslint 0 · unit 26/26 · Rules r6 11/11 | `ec9b248` |
| T2 | Core: extensão `computeSaleState` (param `taxaMeio` resolvido + saída `taxaMeioAplicada` congelável) e `computeLiquidoProdutor` (união `number \| TaxaMeio`) + unit (RN-180/182/183) | FEITO — tsc 0 · eslint 0 · 160/160 (incl. regressão rn347/checkoutCore/repasseCore) | `1d71b41` |
| T3 | Congelamento: carimbo `taxaCongelada` na criação (SEMPRE, incl. legado) + `conciliacao` na tx da confirmação (porta única `processarWebhookPagamento`) + `parseConciliacao` mode-aware + `agregarFinanceiro` híbrido + janela D+N do carimbo + cotação com a MESMA resolução (RN-179/182) | FEITO — tsc 0 · eslint 0 · congelamento r6 8/8 · regressão r6 exit 0 (rn347Checkout+financeiroEvento+repasseSaldo) | `335622e` |
| T4 | Estorno: fixo no rateio via `sale.taxaRepassada` (mecânica `montarItensDoPedido`/`estornarInscricao` REUSADA — zero código novo, só prova): fatias 12,40/12,39 de fixo indivisível, ∑ = carimbo 24,79, devolve o PAGO, receita reverte só FACE, integral flipa (RN-181) | FEITO — r6 11/11 | `c14a084` |
| T5 | Checkout E12/S1210: cotação `totaisPorMeio` (só valores; meio alternativo 1x null-safe) + StepResumo total por opção nos radios (repassada) + nota A-5 "varia conforme a forma de pagamento" | FEITO — r6 13/13 (congelamento+cotação) · rn347 15/15 (leak-scan ok) · landing RTL 11/11 · eslint 0 | (T5) |
| T6 | Config UI E16/S1606: rota `/plataforma/taxa` (tabela global via callable; nav "Taxa") + seção "Exceção de taxa por meio" no TermsEditor (par completo ou vazio; fixo em R$→centavos) + FIX footgun: save do editor agora PRESERVA opcionais (retenção/D+N/taxaPorMetodo/tabelaTaxasParcela/modoTaxaDefault/rastro de plano) que antes eram APAGADOS | FEITO — painel type-check 0 · eslint 0 · plataforma 129/129 (20 files; TermsEditor 13/13 c/ 5 provas novas) | (T6) |
| T7 | Gates: tsc 0 + eslint 0 (core/functions/api-client/landing/painel) + suítes da lane no r6 FRESCO (build antes) | — | — |
| T8 | Review antagonista Fable contexto FRESCO (só diff+RNs+handoff) → fix-commits re-provados | — | — |
| T9 | Aterrissagem: E04/E09/E12/E16 + kanban card (j) → Feito + V1-CHECKLIST + `outputs/leela-build-2d6ee98d/TAXA-FLEX-REPORT.md` (reaproveitado vs criado) | — | — |

## Inventário de reuso (T0 — reaproveitado vs criado)

REUSADO:
- `conciliacao.taxaPct/taxaFixa/taxaValor` (`packages/core/src/pedidos/pagamento.ts:187-192`) — JÁ EXISTEM; casa do carimbo na confirmação.
- `computeSaleState` / `computeLiquidoProdutor` / `computeTaxa` / `roundMoney` — estendidos, nunca reimplementados.
- `montarItensDoPedido` (`pedidos/pedido.ts:306`) — rateio maior resto cent-exato JÁ total-agnóstico: fixo entra via `taxaRepassadaTotal`; ∑ linhas = total por construção. ZERO código novo de rateio.
- `estornarInscricao` — já devolve `itens[].valorFinal + itens[].taxaRepassada`; mecânica intocada.
- Padrão bp half-up do COMF2: `computeComissaoConversao` (`affiliation/afiliado.ts:242-247`) `centavos × bp / 10_000` + passo 0,01%.
- Padrão de congelamento COMF2: `comissaoConfig` congelada no doc (`webhookPagamento.ts:494-528`) — molde do `taxaCongelada`.
- Fonte única `PIX_EXPIRACAO_SEGUNDOS` — molde da tabela como fonte única (RN-183).
- `carregarInsumos`/TermsProvider (`createInscricaoCharge.ts:889`) — ponto único de carga; estendido p/ `platform/config`.
- Rules: `platform/{doc=**}` write:false já fail-closed (`firestore.rules:328`); `termsShapeValido` + bump (140-218).
- Molde de callable admin `aplicarPlano`/`provisionTenant` + api-client `platform/mutations.ts`.
- Infra r6 + comando canônico dos reports CK2/CLAIMFIX.
- `TermsEditor` S1602-T2 — estendido p/ override.

CRIADO (justificado):
- `packages/core/src/finance/taxaPlataforma.ts` (tipos, `computeTaxaPlataforma`, resolver, validadores, mapa forma→meio).
- `pagamento.taxaCongelada {meio, percentual, fixoCentavos, valor, origem}` — congelamento no ATO DA COMPRA precisa de casa própria: `conciliacao` tem contrato de confirmação (idTransacao/gateway obrigatórios no parse); relaxar o parser enfraqueceria docs vigentes.
- Callable `setTaxaPlataformaGlobal` + campo `platform/config.taxaPlataforma` + wrapper api-client.
- Cotação: campo `totaisPorMeio` (SÓ valores R$ — nunca pct; confidencialidade 703db9c).
- Tela global de taxa (plataforma) + seção override no TermsEditor.

## Decisões de desenho (premissas — consolidar no report)

1. **RN-179 em 2 tempos** (operacionalização, estilo CLAIMFIX a/b/c): RESOLUÇÃO override>global no ato da compra — tx de criação carimba `taxaCongelada` no doc de pagamento (mudar tabela nunca reprecifica; replay lê o doc, zero recompute). `conciliacao.taxaPct/taxaFixa/taxaValor` escrita na MESMA tx da CONFIRMAÇÃO (porta única `processarWebhookPagamento` — os 3 confirmadores afunilam nela) COPIANDO o congelado, nunca re-resolvendo tabela. Compra e confirmação são txs distintas por natureza (PIX confirma minutos depois).
2. **Carimbo SEMPRE** (incl. caminho legado pct-único, `origem:'legado'`) — congela também mudança de `platformFeePct` entre venda e recompute (aproximação documentada do E09s vira exata p/ docs novos).
3. **Precedência por LINHA de meio**: `override.taxaTabela[meio] ?? global.taxaPlataforma[meio] ?? platformFeePct legado (fixo 0)`. Override PARCIAL por meio. `taxaPorMetodo` (Onda 2 — NUNCA consumido pelo checkout, só estampado por planos) fica INERTE fora da cadeia; superseded pela tabela — registrar no report, não deletar.
4. **repasseOrganizador mode-aware**: incorporada = `valorFinal − taxaValor`; repassada = `valorFinal`. Invariante de `parseConciliacao` vira `repasse ≈ valorFinal − taxaValor + taxaRepassada(doc)` (tolerância 1 centavo mantida; consumidor de produção = api-client `pedidos.ts:149`, slide-in).
5. **`agregarFinanceiro` híbrido por fatos**: `taxaValor` = Σ `taxaCongelada.valor` dos pagamentos confirmados do evento + `computeTaxa(max(0, receitaBruta − Σ valorFinal com carimbo), pct)` p/ resto legado/seed. Full-recompute idempotente (padrão da própria Function). Estorno parcial: taxa cheia mantida (conservador p/ organizador; SE devolve = fronteira BENCHMARK-REEMBOLSO). Estorno integral flipa status → sai do Σ inteiro (coerente com a reversão da receita).
6. **Janela D+N** (`updateSaldoRepasse`): líquido da transação do CARIMBO quando presente (incorporada: `valorFinal − taxaCongelada.valor`; repassada: `valorFinal`); fallback pct vigente (aproximação documentada preservada p/ docs antigos).
7. **`boleto` inerte** (P-TAXAFLEX-2): linha existe na tabela/validação; checkout não oferta (`FormaPagamento` sem boleto).
8. **`fixoCentavos` int** (P-TAXAFLEX-4): 0..100_000 (teto sanidade R$ 1.000); percentual passo 0,01% (bp cent-exato, guard do afiliado).
9. **Global via callable** (Admin SDK, claim platform_admin na Function) — Rules `platform/` seguem `write:false` p/ TODO client (postura pós-19c8afe). Override via fluxo client S1602-T2 existente (Rules revalidam shape+bump). Fix em escopo: `toInput` do TermsEditor hoje APAGA opcionais no save (taxaPorMetodo/retencao/modoTaxaDefault) — passa a preservá-los (meu override vive lá).
10. **Comissão de afiliado segue FACE** (`computeComissaoConversao(valorFace)`) — INTOCADA (premissa c).
11. **Cotação** calcula o meio alternativo com parcelas=1 p/ `totaisPorMeio` (total à vista por opção); falha do meio alternativo ⇒ `null` naquele meio (nunca degrada a cotação principal).
12. **Modo no confirmador** derivado do DOC congelado (`taxaRepassada` presente ⇒ repassada), nunca re-lendo o evento.

## Notas de coordenação (SUITE-STAB)
- `financeiroEvento.integration` e `repasseSaldo.integration` cravavam porta 8080 — passaram a honrar `LEELA_FS_EMU_PORT` (default 8080 preservado, padrão ck2Rules). Motivo: são a REGRESSÃO das Functions que a TAXAFLEX tocou (`agregarFinanceiro`/`updateSaldoRepasse`) e a lane é proibida de usar 8080. Zero mudança de comportamento no fluxo default da suíte.
- Cotação → mudança de tabela → cobrança: a cobrança RE-RESOLVE no ato da compra (o valor autoritativo é o do `createInscricaoCharge`, padrão vigente da cotação informativa). O congelamento vale da COMPRA em diante (premissa; RN-179 fala em "ato da compra").

## Fronteiras (NÃO tocar)
SE reembolso devolve taxa (BENCHMARK-REEMBOLSO/item 23) · taxa por parcela · ator "comercial" · base da comissão de afiliado · testes de infra da SUITE-STAB (8080/9099; fixtures/helpers/setup fora do meu território — checkout*/claim*/precoBloqueado são MEUS).

## Riscos mapeados p/ o antagonista (T8)
Rounding half-up centavos (fronteiras .5) · corrida compra × mudança de tabela (carimbo na criação, tx snapshot) · replay pós-mudança (doc congelado) · estorno cent-exato com fixo indivisível (∑ = carimbo) · Rules fail-closed (write client em platform/ negado até p/ admin; shape `taxaTabela` inválido negado; callable nega não-admin) · invariante `parseConciliacao` nos 2 modos · agregado híbrido sem contagem dupla (carimbo vs imputação).

## Operacional
- `git commit --only -- <paths>` SEMPRE · push a cada 2-3 commits · `git pull` antes de cada commit (SUITE-STAB paralela).
- RAM baixa: NUNCA rodar a suíte inteira — gates da lane = tsc/eslint + suítes da lane no r6.
- Comando r6 (de `functions/`, APÓS `npm run build`): `LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 JAVA_HOME=~/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec --config ../firebase.r6.json --project demo-leela "npx vitest run <suites>"`.
