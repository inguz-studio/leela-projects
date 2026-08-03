# Handoff vivo · lane ACHADOS-REV · trace leela-build-2d6ee98d · 2026-08-03

Reviewer: sf-qa-engineer (software-forge), contexto FRESCO — sem participação na construção.
Brief: `.nirvana/briefs/leela-build-2d6ee98d-ACHADOS-REV-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-08-02-retomada/07-fila-achados.md` (§ "Review antagonista em
contexto fresco", 19 vetores), `04-spec-achados.md` (D-ACH-1..14), `05-rns-achados.md` (RN-434..445).
Alvo: os 16 commits da ACHADOS-0802 (`58fe76b` … `1d777fb`), base `main` em `36a6616`.

`git commit --only` por caminho, sufixo `[leela-build-2d6ee98d]`, SEM push.

## Placar

| Bloco | Vetores | Estado |
|---|---|---|
| 1 · motor do preço | 1, 2, 3, 11 | **FECHADO** — 2 defeitos confirmados, 2 fix-commits |
| 2 · borda do preço | 4, 5, 6, 7 | em curso |
| 3 · cotação e cupom | 8, 9, 10 | vetor 9 FECHADO com defeito; 8 e 10 pendentes |
| 4 · prova de aceite | 12–19 | pendente |
| Gate final | — | pendente |

---

## Bloco 1 · o motor do preço (vetores 1, 2, 3, 11) + o vetor 9

### Vetor 1 · a conta bate com Price, não com o modelo antigo — **PASS**

Aritmética conferida FORA do repositório antes de olhar o teste (para não ancorar no número que o
builder escolheu):

```
parcela exata  300 × 0,0289 ÷ (1 − 1,0289^−12) = 29,941065457280036
parcela half-up                                 = 29,94
total = parcela × 12                            = 359,28
modelo antigo  300 × 1,0289^12                  = 422,28
diferença                                       = 17,535 %
```

Os dois números fechados da spec (**R$ 422,03** e **R$ 359,90**) estão errados; os do código
(**422,28** / **359,28**) estão certos. **PB-1 ENDOSSADA** — é reconciliação de texto da spec, o
código não carrega literal de valor.

**Falsificação EXECUTADA.** Fórmula antiga (`total = valor × (1+i)^n`, `parcela = total/n`)
restaurada em `packages/core/src/finance/calc.ts`, 7 suítes de venda re-executadas:

```
antes  Test Files 7 passed (7)   Tests 164 passed (164)
depois Test Files 4 failed | 3 passed (7)   Tests 8 failed | 156 passed (164)
```

O discriminante do vetor 1 morre: `R$ 300 a 2,89% a.m. em 12x cobra Price, não o composto do prazo
inteiro`. Morrem junto, em três arquivos distintos, `computeSaleState — parcelamento (RN-311 · Price
repassado)`, `RN-347 · I5 (repassada + cartão)` e `validateCommercialTerms > com o termo canônico,
12x de R$ 300 sai pela tabela Price`.

### Vetor 2 · a parcela única do cartão não tem juros — **PASS**

Falsificação acima: `a parcela única NUNCA carrega juros (1x = PV)` está entre os 8 que morrem.

A segunda metade do vetor (`totalAVista` == `valorTotal` da 1ª opção) foi medida contra o
`computeSaleState` real, em modo repassada com juros 3,49 ligados:

```
totalComprador 331,50 · totalCobrado 331,50 · opcoesParcelamento[0] {1, 331.50, 331.50}
```

Provada também em `rn347TaxaRepassada.test.ts` (`expect(sale.opcoesParcelamento[0]?.valorTotal)
.toBe(totalComprador)`), que é o caso reescrito pelo B1t.

### Vetor 3 · a soma fecha — **PASS**

`para TODO n da lista, parcela × n === total, exato em centavos` morre na falsificação (varredura de
5 valores × 3 taxas, comparação em centavos inteiros). A propriedade sobrevive ao fix DEF-1 abaixo —
o piso é aplicado À PARCELA, então `parcela × n === total` continua exato por construção, e o caso
novo `DEF-1: varredura` reafirma as duas propriedades juntas.

### Vetor 11 · pedido antigo não é reprecificado — **PASS**

O congelamento é código, não promessa: `createInscricaoCharge.ts:1780-1783` grava
`jurosParcelamento` no doc de pagamento no ato da compra, e o replay (`:2094`) lê
`pagamentoSnap.get('jurosParcelamento')` em vez de recomputar. Mesma disciplina da RN-179, que já
carimbava `taxaCongelada` (`:1786-1793`) SEMPRE, inclusive origem legado.

### ⛔ DEF-1 · o total parcelado ficava ABAIXO do principal — **fix-commit `4c3b998`**

Achado por destructive sweep, não por leitura. Reprodução com o `computeSaleState` real:

| Caso (termo `jurosAoMes: 0`) | totalComprador | totalCobrado | `jurosParcelamento` |
|---|---|---|---|
| R$ 35,00 em 3x | 35,00 | **35,01** | **+0,01** |
| R$ 35,00 em 6x | 35,00 | **34,98** | **−0,02** |

O arredondamento half-up na parcela (RN-436, correto) deixa `parcela × n` cair abaixo do principal
sempre que a divisão arredonda para baixo. Varredura com o termo realista
(`jurosAoMes: 0`, `parcelaMinima: 10`, até 12x, tickets de R$ 50,00 a R$ 500,00 em passo de 1
centavo, **512.039** combinações):

```
cobra MENOS que o face: 164.211 (32,1 %)
cobra MAIS:             211.076 (41,2 %)
exato:                  136.752 (26,7 %)
extremos: −R$ 0,06 … +R$ 0,06
```

Três promessas quebravam ao mesmo tempo, e uma delas está escrita no próprio arquivo:

1. `cotarInscricaoCheckout.ts:342` documenta que o juro *"nunca fica negativa, porque
   `buildInstallmentOptions` não emite opção abaixo do principal (S314-T1)"*. **A afirmação é
   falsa** — a opção de 6x emite `valorTotal` 34,98 sobre principal 35,00.
2. O bloco de totais (RN-435) só renderiza a linha de juros quando `> 0` (`StepResumo.tsx:365`,
   `StepConfirmacao.tsx:162`). No ramo negativo o comprador lia `Subtotal R$ 35,00 … Total
   R$ 34,98` **sem nenhuma linha explicando a diferença** — o bloco não fecha.
3. O líquido do organizador (RN-437) sai do `valorFinal`, que o comprador não chegou a pagar.

**É regressão desta lane**, não defeito herdado: antes do `e0ef9a5` o total era arredondado
PRIMEIRO (`round(valor × (1+i)^n)`), que com `i = 0` devolve o principal exato. O resíduo nasceu com
a inversão da ordem. E atinge produção hoje: pela **PB-3** o seed é idempotente, então todo ambiente
já provisionado segue com `jurosAoMes: 0`.

Por que o teste existente não pegou: `rn347TaxaRepassada.test.ts:241` (`o juro … nunca é negativo`)
varre `[1, 2, 3, 6, 9]` parcelas **só com `RULES_COM_JUROS`**. O ramo de juros zero, que é o único
em que a propriedade falha, nunca foi exercido. Viés de confirmação clássico — a propriedade foi
testada exatamente onde ela vale.

**Fix.** Piso do principal em `buildInstallmentOptions`: quando `parcela × n` fica abaixo de `valor`,
a parcela sobe um centavo. Quando o half-up desceu, `ceil` É `round + 0,01` (o erro do
arredondamento é menor que meio centavo), então a correção é exata e não passa por `Math.ceil` sobre
float. Com juros ligados o ramo **nunca dispara** — a parcela Price já é maior que `valor / n` —, e
os números da RN-436 ficam byte a byte (caso `DEF-1: o piso NÃO toca os números da RN-436` prova).

**Falsificação do fix EXECUTADA** (guarda do piso desligada, mesmas suítes):

```
Tests 2 failed | 41 passed (43)
```

Morrem `DEF-1: com juros ZERO o total nunca fica abaixo do principal` e `DEF-1: varredura — total ≥
principal para todo n e toda taxa`. O terceiro caso novo passa nos dois mundos de propósito e está
declarado como guarda no arquivo.

Junto no mesmo commit, dois comentários de contrato de dinheiro que contradiziam a regra vigente
(a armadilha que a D-ACH-8 mandou fechar e que sobreviveu à lane):

- `cotarInscricaoCheckout.ts:121-124` afirmava que *"a opção 1x do CARTÃO carrega 1 mês de juros
  Price e não serve de referência à vista"*. A S314-T1 acabou com isso — é a P2 da spec.
- `cotarInscricaoCheckout.ts:130` afirmava `jurosParcelamento` *"0 quando o termo tem
  `jurosAoMes: 0`"*. Falso pelo resíduo acima.

**VETO-DONO aberto (copy, não código):** com `jurosAoMes: 0`, R$ 50,00 em 3x cobra R$ 50,01 e a tela
nomeia esse centavo como **"Juros do parcelamento"**. O número está certo e o bloco fecha; o rótulo
é impreciso, porque o termo não tem juros. Trocar a copy é decisão do dono — o piso já garante que o
resíduo nunca some da tela.

### ⛔ DEF-2 · vetor 9 falsificado no step 0 — **fix-commit `e309c3c`**

O vetor 9 promete: *"Aplicar cupom e trocar de kit antes da resposta: o preço da seleção abandonada
nunca chega à tela."* O caso que o builder escreveu
(`checkout-s1216-cotacao-antecipada.test.tsx:194`) troca de seleção **e volta à etapa de dados** —
e é a volta que faz o efeito de cotação pedir outra e subir o contador. **No step 0 ninguém pede**:
o efeito abre com `if (!precisaCotar …) return`, e `precisaCotar` é `step >= 1`. O contador nunca
sobe, e o `aplicarCupom` só sabe descartar por contador.

E o campo do cupom **mora no step 0** (D-4 · S1209-T1).

**Reprodução EXECUTADA** (probe em jsdom, `CheckoutFlow` real, resposta do cupom segurada):

1. step 0, modalidade 5k, "Aplicar" em `FLORIPA10` — a chamada fica pendente;
2. ainda no step 0, a pessoa troca para 10k (`cotarInscricaoCheckout` segue com **1** chamada);
3. a resposta chega, calculada para a 5k, com `desconto: 500`.

Texto medido no corpo do documento, sobre uma seleção 10k:

```
Cupom FLORIPA10 aplicado — menos R$ 500,00
```

Viola a RN-434 palavra por palavra: *"Resposta que chega depois de outra ter sido pedida é
descartada, sem exceção de origem"* — aqui a origem (step 0) é justamente a exceção.

**Fix.** A régua passa a ser a **assinatura de preço**, que não depende de haver uma segunda
chamada: `aplicarCupom` guarda a assinatura pedida e confere contra a vigente na volta, por
`assinaturaDeRef` (o `assinaturaDe` que o callback fecha é o do instante do clique — comparar contra
ele mesmo não provaria nada). O contador de sequência continua de pé; a assinatura é a segunda
guarda, para o caso em que ninguém pediu nada.

O caminho do cupom do LINK não tem o buraco e não foi tocado: o efeito de auto-apply depende de
`cotarCom`, cuja identidade muda quando `inscritos` muda, então trocar de seleção re-roda o efeito,
o `vivo = false` do cleanup descarta a resposta velha e a nova chamada sai sozinha. Verificado antes
de escrever qualquer linha.

**Falsificação do fix EXECUTADA** (guarda de assinatura removida, mesmo arquivo):

```
Tests 1 failed | 6 passed (7)
```

Morre exatamente o caso novo `DEF-2: no step 0, trocar de modalidade descarta a resposta do cupom da
seleção abandonada`.

### Gates do bloco 1

| | |
|---|---|
| `packages/core` `tsc` / `eslint` / `tsup` | 0 / 0 / exit 0 |
| `functions` `tsc` / `eslint` | 0 / 0 |
| `apps/landing` `tsc` / `eslint` (`app` + `lib` + `test`) | 0 / 0 |
| 7 suítes de venda/parcelamento | **167/167** (era 164/164 — 3 casos novos) |
| `checkout-s1216-cotacao-antecipada` | **7/7** (era 6/6) |
| Suíte da landing, processo único | **374/374** em 34 arquivos (era 373/373) |
