---
tags: [leela, decisoes, fila, rodada, juros, margem, parcelamento, admin]
trace: leela-build-2d6ee98d
lane: SPEC-JUROS-MARGEM
data: 2026-08-04
historia: LEELA-S1610
---

# 03-fila-codigo · História S1610

> A economia do parcelamento visível no admin, e o preço exato na tela da compradora. Donos:
> E04 (a régua de parcelas), E09 (o modelo econômico e o carimbo), E16 (a tabela de custo e a
> tela), E12 (o que a compradora vê). Não bloqueia go-live; **T1 conserta defeito que está em
> produção agora**, e é a única com pressa.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S1610-T1` | A regra do centavo (RN-456 e RN-457): divisão exata no ramo de juros zero, resíduo na última parcela, `InstallmentOption` ganha a parcela final, e as três superfícies do checkout passam a dizer `(última R$ Y,YY)` quando ela difere. | `packages/core/src/finance/calc.ts`, `functions/src/checkout/cotarInscricaoCheckout.ts`, `packages/api-client/src/checkout.ts`, `apps/landing/.../checkout` | — | opus | ⚔ |
| 2 | `S1610-T2` | Os 2,89% a.m. entram nos termos dos tenants pelo caminho canônico da tela, selando de passagem o drift `versao: 1` × retrato `v1` que o item JUROS-1 do painel descreve. Operação de dado, zero código. | dado de produção · `/plataforma/tenants/:id/termos` | — | sonnet | — |
| 3 | `S1610-T3` | A tabela de custo do gateway (RN-455): tipo, validação pura, Rules e semente vazia em `platform/config.custoGateway`, com `origem` e `atualizadoEm`. Nasce sem número inventado. | `packages/core/src/platform`, `functions/firestore.rules` | — | opus | ⚔ |
| 4 | `S1610-T4` | O carimbo do custo na venda (RN-459): resolver e congelar `{percentual, fixoCentavos, origem}` do meio e das parcelas escolhidas em `conciliacao`, na mesma transação em que a taxa já é carimbada. | `packages/core/src/checkout/saleState.ts`, `functions/src/checkout` | 3 | opus | ⚔ |
| 5 | `S1610-T5` | O `netValue` do webhook passa a ser gravado como observação, ao lado do valor de cobrança. O cross-check de integridade continua lendo `payment.value` e não é tocado. | `functions/src/payments/asaasProvider.ts` | — | opus | ⚔ |
| 6 | `S1610-T6` | O módulo `economiaParcelamento.ts` (RN-454): funções puras de custo, markup, margem, margem por parcela e margem percentual, compondo `buildInstallmentOptions` e `computeTaxaPlataforma` sem reimplementar nenhuma delas. | `packages/core/src/finance/economiaParcelamento.ts` | 1, 3 | opus | ⚔ |
| 7 | `S1610-T7` | O bloco **Economia do parcelamento** no editor de termos: valor simulado, uma linha por parcela ofertável, colunas parcela · total · custo · markup · margem, rodapé com a conta cheia da venda. Leitura pura, nenhum campo editável novo. | `apps/painel/src/routes/plataforma/tenants/termos` | 6 | opus | — |
| 8 | `S1610-T8` | A grade 2x-12x do modal de planos ganha aviso de que `tabelaTaxasParcela` não é consumida pelo checkout. Uma frase, para ninguém pendurar economia nova num campo morto. | `apps/painel/src/routes/plataforma/planos` | — | sonnet | — |

**Sem tarefa, de propósito:** a **RN-458** ("sem juros" por tenant) tem contrato escrito e
**não** entra na fila. O dono declarou que não existe hoje. A regra existe para que a
primeira vez que alguém pedir não vire improviso, e o campo só nasce quando o pedido chegar.

## Critério de aceite por tarefa

**T1 · a regra do centavo.** Falsificável em três frentes.

- Varredura de `(valor, n)` com `jurosAoMes: 0`, de R$ 10,00 a R$ 500,00 em passos de um
  centavo e `n` de 2 a 12: `valorTotal === valor` em **todas** as combinações, e
  `jurosParcelamento === 0` em todas. Um único par que devolva R$ 0,01 reprova.
- Soma das parcelas fecha no total em toda combinação, com e sem juros. `R$ 35,00` em 3x dá
  `11,66 + 11,66 + 11,68`; em 6x dá cinco de `5,83` e uma de `5,85`.
- Com `jurosAoMes: 2.89`, os números da RN-436 ficam **byte a byte**: R$ 300,00 em 12x
  continua dando `12 × R$ 29,94 = R$ 359,28`. O teste que hoje prova isso não pode ser
  editado; se ele mudar, a tarefa falhou.
- **Sonda de contrato do gateway (fecha a lacuna L3):** uma cobrança em sandbox de R$ 35,00
  em 6x, lendo de volta o array de parcelas do Asaas. O que a tela promete e o que a fatura
  diz têm de bater parcela a parcela. Se o Asaas ajustar para baixo em vez de para cima, a
  direção do resíduo na RN-456 muda **antes** do merge, não depois.
- A parcela mínima passa a ser conferida contra a menor parcela, e a escada ofertada não
  encolhe em nenhum tenant hoje provisionado.

**T2 · os 2,89% nos termos.** Depois da execução, todo tenant que vende tem
`installmentRules.jurosAoMes` em `2.89`, o documento vigente sobe de versão e o retrato
imutável da nova versão diz o mesmo que o vigente. Prova por leitura dos dois documentos, não
por tela. Hoje `na-passada-eventos` e `trilhas-do-sul` estão em zero, `ritmo-run-assessoria`
em 1,2% e dois tenants não têm termo. **O JUROS-4 não bloqueia esta tarefa:** o dono mandou
preencher com 2,89%, e se ele escolher o outro modelo o conserto é editar um número numa
tela, sem deploy.

**T3 · a tabela de custo.** Percentual fora de `[0, 100]` e fixo negativo são recusados com
`invalid-argument`, provado por caso. Escrita direta de `tenant_owner` e de cliente comum é
negada pelas Rules com `permission-denied`, provado por ataque na suíte de Rules, não por
tela. A semente sobe **vazia**: nenhum número de custo entra no repositório, e um teste varre
o código atrás de literal de custo para garantir que ninguém o embutiu. Com a linha ausente,
o consumidor devolve "não configurado" em vez de zero.

**T4 · o carimbo.** Uma venda é fechada, a tabela de custo é alterada, e a margem daquela
venda relida **não muda**. Falsificação direta: apagar o carimbo e ler de novo tem de fazer o
caso quebrar. O campo entra na mesma transação da confirmação, ao lado de
`conciliacao.taxaPct`, e o replay não recomputa contra tabela nova, exatamente como a RN-179
já exige da taxa.

**T5 · o `netValue`.** O cross-check de integridade do checkout continua verde em toda a
suíte de webhook, sem nenhum caso editado. Um webhook com `value` e `netValue` diferentes
grava os dois, e a diferença fica legível como o custo real daquela venda. Um webhook sem
`netValue` não quebra nada e grava só o valor de cobrança. O comentário de
`asaasProvider.ts:1506` deixa de proibir o campo e passa a dizer onde ele mora.

**T6 · o módulo do core.** `markup(1) === 0` e `margem(1) === 0` por caso próprio. Uma
combinação em que o custo de parcelar supera o juro devolve margem **negativa**, e o teste
prova que ela não é zerada nem truncada. Nenhuma linha do módulo reimplementa Price nem taxa:
a prova é que trocar o retorno de `buildInstallmentOptions` por um duplo altera o resultado
do módulo inteiro. Sem tabela de custo, as funções devolvem margem indefinida em vez de zero.

**T7 · a tela.** O bloco aparece **dentro** do editor de termos existente, logo abaixo do
fieldset de parcelamento, sem rota nova e sem tela irmã. Trocar o valor simulado recalcula
sem ida ao servidor e sem salvar nada. Com a tabela de custo vazia, as colunas Custo e Margem
mostram o estado "não configurado" e a tela **não inventa número**. O lint
`leela-tokens/no-hardcoded-tokens` passa, o contraste da margem negativa atinge AA, e a
conferência contra a documentação é direta porque o valor de partida é R$ 300,00, o mesmo dos
exemplos canônicos. Nenhum componente novo de design system: `Table`, `Badge`, `formatBRL` e
`formatPct` já estão no bundle.

**T8 · o aviso.** A grade de 2x a 12x segue editável e salvando, e ganha uma frase dizendo
que o valor não altera preço de venda. Nada de comportamento muda. Se alguém apagar a frase,
nenhum teste quebra, e isso é aceitável: é sinalização para humano.

## Ordem e paralelismo

1. As tarefas 1, 2, 3, 5 e 8 não dependem de nada e partem juntas.
2. A 4 precisa do modelo de custo (3). A 6 precisa do contrato da opção (1) e da tabela (3).
   A 7 fecha depois da 6.
3. O caminho crítico é `(1, 3) → 6 → 7`. As tarefas 2, 4, 5 e 8 saem fora dele.
4. Jornada de aceite do pacote: abrir os termos de um tenant, ver a escada com custo, markup
   e margem por parcela; mudar o juro ao mês e ver a margem se mover; e, do outro lado,
   comprar em 3x num termo sem juros e pagar exatamente o preço anunciado.

## Fronteiras

- **`functions/**` e `packages/**` estão disputados.** Outras lanes desta madrugada tocam
  `functions/src/checkout`, `apps/` e `packages/`. As tarefas 1, 4 e 5 são as que encostam.
  **Serializar por lane, nunca por task**, e reler cada arquivo imediatamente antes de
  escrever.
- **`buildInstallmentOptions` é máquina única.** A tarefa 1 muda o comportamento dela no ramo
  de juros zero e o contrato de retorno; não cria função irmã. Quem quiser um segundo caminho
  de cálculo está reintroduzindo o defeito que a RN-183 existe para impedir.
- **O cross-check de integridade do webhook é intocável.** A tarefa 5 acrescenta um campo de
  observação ao lado. Trocar `payment.value` por `netValue` no cross-check é regressão de
  segurança, não simplificação.
- **A tela de termos está viva.** O editor tem trava otimista por `versao` e snapshot
  imutável a cada save. A tarefa 7 acrescenta bloco de leitura e não encosta no submit.
- **Território exclusivo desta lane foi `leela-specs/`.** Nenhuma linha de código foi
  escrita aqui. Toda a fila acima é trabalho da lane de construção.

## Critério de pronto do pacote

- [ ] compradora em termo sem juros paga **exatamente** o preço anunciado, em toda parcela
      ofertada, e nunca vê linha de juros
- [ ] a soma das parcelas fecha no total em toda combinação, com e sem juros
- [ ] os números da RN-436 com juros seguem byte a byte, sem teste editado
- [ ] o que a tela promete bate com o que o Asaas cobra, provado em sandbox (lacuna L3)
- [ ] a tabela de custo não aceita escrita de quem não é `platform_admin`, provado por ataque
      de Rules
- [ ] nenhum número de custo no repositório; sem dado, a tela declara e não calcula margem
- [ ] margem negativa aparece, com destaque, e nunca é zerada
- [ ] trocar a tabela de custo não altera a margem de venda já fechada
- [ ] o custo real de cada venda passa a ser registrado e a margem deixa de ser só estimativa
- [ ] review antagonista em contexto fresco nas tarefas 1 e 4 (território de dinheiro:
      divisão de centavos, carimbo em transação, replay de webhook)

## Vizinhos

`01-spec-economia-parcelamento.md` para o modelo econômico, a tela e as cinco lacunas.
`02-rns-delta.md` para as regras novas. [[V1-CHECKLIST]] e [[V1-KANBAN]] para o board.
