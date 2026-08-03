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
| 2 · borda do preço | 4, 5, 6, 7 | **FECHADO** — 3 lacunas de prova fechadas |
| 3 · cotação e cupom | 8, 9, 10 | **FECHADO** — vetor 9 com defeito, 8 byte a byte, 10 com prova nova |
| 4 · prova de aceite | 12–19 | **FECHADO** — 10 falsificações executadas, vetor 19 sem prova anterior |
| Gate final | — | **VERDE** — 6 superfícies, ver o fim |

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

---

## Bloco 2 · a borda do preço (vetores 4, 5, 6, 7) — commit `dffab74`

### Vetor 4 · a interface não soma um centavo — **PASS**

Varredura do `StepResumo` atrás de aritmética de dinheiro: zero. O juro chega pronto do campo
`jurosParcelamento`.

**Falsificação EXECUTADA.** `jurosParcelamento` trocado por
`Math.max(0, totalCobrado − totalAVista)` no componente:

```
Tests 1 failed | 16 passed (17)
```

Morre `A INTERFACE NÃO SOMA UM CENTAVO: o valor exibido é o campo do servidor` — o caso que chega
com `jurosParcelamento: 5` e `totalCobrado − totalAVista = 92` de propósito. Qualquer derivação
local morde.

### Vetor 5 · o organizador não vê o juro — **PASS, com lacuna de prova fechada**

O caso puro (`rn347TaxaRepassada.test.ts`) prova o líquido do `computeSaleState`. **Isso é metade.**
O que o organizador recebe passa pelo `webhookPagamento`, e o que o afiliado comissiona passa pelo
doc de conversão — e nenhum dos dois consome `receitaLiquidaOrganizador`. Os dois leem `valorFinal`
do doc de pagamento (`webhookPagamento.ts:621` e `:659`).

**Falsificação EXECUTADA** — a que o vetor pede ("somar o juro à base"): `receitaConfirmada` e
`valorConversao` trocados para `valorFinal + jurosParcelamento`.

| Suítes | Sob a falsificação |
|---|---|
| `afiliados` + `checkoutS1203` + `estornarInscricao` (integração) | **69/69 VERDES** |
| `rn347Checkout` (integração) | 1 failed \| 16 passed — só o caso NOVO |

Sessenta e nove casos de integração financeira não enxergam o juro entrando na base do razão e da
comissão. O caso novo (`vetor 5: à vista e em 12x do MESMO carrinho…`) compra o mesmo carrinho nas
duas formas, confirma as duas pelo webhook e compara o delta da `receitaConfirmada`: R$ 189,90 nas
duas, com `totalCobrado` de R$ 209,84 e o de 12x.

### Vetor 6 · percentual não vaza — **PASS, com o scan ampliado**

O scan que existia (`I4`) olhava `platformFeePct`, `"taxa":` e o literal `10.5`. Com a S314-T1
ligando o `jurosAoMes`, **o termo ganhou um segundo percentual privado** e ele atravessava o scan
sem ser olhado. O caso novo varre por NOME DE CHAVE (`jurosAoMes`, `fixoCentavos`, `parcelaMinima`,
`maxParcelas`, `installmentRules`, `commercialTerms`, `taxaCongelada`, `taxaMeioAplicada`,
`percentual`, `receitaLiquidaOrganizador`, `anticipation`, `saasMonthlyFee`) sobre **cotação e
cobrança**, nos dois modos de taxa. Comparar valores literais foi rejeitado: `"3.49"` daria falso
positivo no dia em que um total legítimo contivesse os mesmos dígitos.

**Falsificação EXECUTADA** — `taxaMeioAplicada` plantada na resposta da cotação:

```
Tests 2 failed | 16 passed (18)
```

Verificado à parte: `taxaCongelada.percentual`/`.fixoCentavos` vivem em `pagamentos/{id}`, cuja
Rule (`firestore.rules:2404`) restringe a leitura a `isTenantWriter` ou `isPlatformAdmin` — o
comprador anônimo não alcança.

**Não-achado registrado:** a mensagem de recusa de parcelamento inválido diz "termo oferta até 11x".
É o teto EFETIVO, que a própria lista de opções já mostra — não o `maxParcelas` do termo.

### Vetor 7 · o modo incorporada não inventa número — **PASS**

Servidor: `incorporada: totalCobrado = face; taxaServico 0`. Tela: "inclusa no valor", sem
"R$ 0,00" e sem o valor real (o caso manda `taxaServico: 8` num evento incorporado e exige que a
tela siga muda sobre o número).

**Falsificação EXECUTADA** — `StepResumo` e `StepConfirmacao` restaurados de `ecb5188^`:

```
Tests 11 failed | 6 passed (17)
```

Bate com o número que o builder declarou.

---

## Bloco 3 · a cotação (vetores 8, 9, 10)

### Vetor 8 · a cotação antecipada não muda o número, só a hora — **PASS, byte a byte**

Medido nos DOIS mundos, com o mesmo carrinho e o mesmo caminho, capturando o argumento da callable:

```
gatilho NOVO   (step >= 1)  {"eventoId":"experiencia-teste","itens":[{"modalidade":"5k"}],"forma":"pix","parcelas":1}   1 chamada
gatilho ANTIGO (step >= 2)  {"eventoId":"experiencia-teste","itens":[{"modalidade":"5k"}],"forma":"pix","parcelas":1}   1 chamada
```

Strings idênticas. E preencher o formulário inteiro depois da primeira cotação **não** gera segunda
chamada (1 → 1), que é a outra metade da promessa: chegar ao PAGAR não recota.

### Vetor 9 · resposta obsoleta não aterrissa, inclusive pelo cupom — **FAIL ⇒ DEF-2** (bloco 1)

### Vetor 10 · o item 64 continua de pé — **PASS, com lacuna de prova fechada**

A metade do BOTÃO tinha caso próprio (`CKUX-REV · B1`). A metade do CÓDIGO PIX não: desligar o
`!cotando` do efeito de auto-geração derrubava **um único caso**, e ele mora em
`checkout-asaas-teto` para provar o TETO DO GATEWAY — falha ali por acidente (a cobrança nasce duas
vezes), e quem quebrasse a guarda leria um erro sobre o Asaas.

Caso novo: chegada ao PAGAR **antes** da resposta (a função fria mediu 9,8 s em produção), escolha
do PIX, nenhuma cobrança; a resposta chega e o código nasce sozinho, sem clique extra.

**Falsificação EXECUTADA** (`!cotando` desligado): `Tests 1 failed | 5 passed (6)`.

**Caminho descartado, com medida.** A primeira versão do caso voltava a uma seleção JÁ cotada com
outra no ar. Ela reprovava: o efeito cai no early-return, **invalida o que está no ar** e o total da
tela passa a ser o certo — a cobrança nascer ali é correto. O teste teria provado o oposto do vetor.

---

## Bloco 4 · a prova de aceite (vetores 12–19) — commit `44c92b9`

Todas as falsificações abaixo foram executadas uma a uma, com o estado restaurado depois de cada.

| # | Vetor | Falsificação executada | Resultado |
|---|---|---|---|
| 12 | não existe compra sem os dois aceites | gate da TELA removido (`if (!aceitesOk) return`) | **5 failed** em 3 arquivos |
| 12 | — servidor | `validarAceitesCheckoutInput` com os dois `!== true` desligados | **2 failed** (`checkoutModelo`) |
| 13 | o cliente não forja nada | `versoesExibidas` gravada no doc do pedido | **1 failed** (V4) |
| 14 | nenhuma cobrança nasce na chegada | `useState<FormaUI\|null>('pix')` — pré-seleção de volta | **6 failed** |
| 15 | voltar não destrava a prova | `desabilitado={charge !== null}` → `{false}` | **1 failed** |
| 16 | divergência recusa, e recusa por igual | bloco `if (exibidas !== undefined)` desligado | **4 failed** (V2, V3, V5, V7) |
| 17 | o termo do organizador fecha o defeito | `saudeCustom` fora do payload | **2 failed** |
| 18 | a origem é do servidor | origem lida de `input.aceites.origem` | **1 failed** (O4) |
| 18 | — irreversibilidade | HMAC trocado por `sha256` puro | **1 failed** (O3) |
| 19 | nada de PII em log nem em URL | campo novo persistido em `localStorage` | **1 failed** (caso NOVO) |

### Armadilha de método que quase produziu um falso PASS

A primeira falsificação do vetor 12 (gate da tela) devolveu **375/375 verdes** — e a conclusão
"vetor 12 sem cobertura de tela" estava a um passo. O patch tinha sido um **no-op silencioso**: o
arquivo está em CRLF e o `String.replace` casava por `\n`. Repetida por linha, ela derruba **5**
casos. Toda falsificação multi-linha desta lane passou a ser aplicada por índice de linha, com o
conteúdo da linha impresso antes da troca.

### Vetor 19 · o que não tinha prova nenhuma

Nenhum caso varria armazenamento local nem parâmetro de consulta atrás dos três campos que a C4 e a
C5 acrescentaram. O caso novo faz a compra inteira e varre **todas** as chaves do `localStorage`
(chave e valor) mais `search` e `hash` da URL, e trava o contrato do payload: `versoesExibidas`
sobe (RN-439), `origem`/`ipHash`/`userAgent` **não** sobem (RN-442 — quem deriva é o servidor).

Lado servidor, varredura das 4 chamadas de `logger` de `createInscricaoCharge.ts`
(`taxaflex_override_invalido`, `checkout_gateway_sem_resposta`, `checkout_gateway_recusou`,
`checkout_charge_criada`): nenhuma carrega endereço, agente ou bloco de aceites.

---

## Premissas PB-1..PB-14

| # | Veredito | Linha de consequência |
|---|---|---|
| PB-1 | **ENDOSSADA** | Aritmética conferida fora do repositório: 359,28 e 422,28 são os certos. Falta reconciliar o texto da spec. |
| PB-2 | **VETO-DONO** | Correta na direção que enuncia, **incompleta na outra**: o resíduo também descia (R$ 34,98 sobre R$ 35,00) e ninguém o via. O piso do DEF-1 fechou o lado de baixo; sobra a copy — num termo sem juros a tela chama de "Juros do parcelamento" um resíduo de arredondamento de um centavo. |
| PB-3 | **ENDOSSADA, com peso maior do que a premissa dá** | "Ambiente já provisionado segue com juros 0" não é nota de emulador: é o estado de PRODUÇÃO, e foi ele que tornou o DEF-1 um defeito vivo em 73% das combinações (ticket, n). |
| PB-4 | **ENDOSSADA** | Derivar o juro na borda não muda o número; o core segue com uma autoridade só. |
| PB-5 | **ENDOSSADA** | O modo pelo flag do evento é a versão verdadeira; o proxy por `taxaServico > 0` chamaria de "inclusa" uma taxa zerada por meio. |
| PB-6 | **ENDOSSADA** | Taxa zero em evento repassado sem linha é o enunciado honesto. |
| PB-7 | **ENDOSSADA** | O texto do organizador atravessa intacto; o vocabulário D-0802-1 governa só o que a plataforma escreve. |
| PB-8 | **ENDOSSADA** | Sem meio escolhido o rótulo diz "(PIX)" porque a cotação exibida É de PIX à vista. |
| PB-9 | **SUPERADA** | Não precisou ser exercida — as fotos são reais e versionadas. |
| PB-10 | **ENDOSSADA** | `window.location.reload()` perde o formulário; `router.refresh()` custaria mock em 16 arquivos. Trocar depois é uma linha. |
| PB-11 | **VETO-DONO** | **Medido**: pedido sem bloco + política na versão 3 + retry declarando a 1 ⇒ **carimba a 3**. No caminho de criação a mesma divergência recusa. A prova não fica incompleta, fica afirmando material que a pessoa não leu — o carimbo silencioso que a P6 rejeitou. A escolha entre prova ausente e prova errada é do dono. |
| PB-12 | **ENDOSSADA** | `public/covers/kits/` é onde o acervo e o `BASE` do resolvedor já vivem. |
| PB-13 | **VETO-DONO** | Julgamento de marca — a foto de ioga (tapetes enrolados, escura, sem pessoas) precisa do olho do dono. |
| PB-14 | **ENDOSSADA** | "Modalidade oficial" segue a D3, no arquivo do território da task. |

---

## Gate final

| Superfície | `tsc` | `eslint` | Suíte |
|---|---|---|---|
| `packages/core` | **0** | **0** | `tsup` exit 0 · consumida pelas suítes de functions |
| `packages/api-client` | **0** | **0** | — |
| `packages/design-system` | **0** | **0** | **1098/1098** em 59 arquivos |
| `functions` (emulator `@13`, Java 17) | **0** | **0** | **3354 passed · 91 skipped** em 194 arquivos |
| `apps/landing` (processo único) | **0** | **0** | **376/376** em 34 arquivos |
| `apps/painel` (pool PADRÃO) | **0** | — | **1768/1768** em 190 arquivos |

Comando do emulator:
`npx firebase-tools@13 emulators:exec --only firestore,auth --project demo-leela-s1203 "npx vitest run"`

Movimento das suítes tocadas nesta lane:

| Suíte | Antes | Depois |
|---|---|---|
| Venda/parcelamento (7 arquivos puros) | 164 | **167** (+3, DEF-1) |
| `checkout-s1216-cotacao-antecipada` | 6 | **7** (+1, DEF-2) |
| `rn347Checkout.integration` | 16 | **18** (+2, vetores 5 e 6) |
| `checkout-ckux-rev-cotacao` | 5 | **6** (+1, vetor 10) |
| `checkout-s1217-aceites-inscricao` | 8 | **9** (+1, vetor 19) |
| `aceitesVersaoExibida.integration` | 8 | **9** (+1, PB-11) |
| Landing (total) | 373 | **376** |

### Duas suítes que não rodam neste comando — **preexistentes, não regressão**

| Arquivo | Causa medida | Asserções executadas |
|---|---|---|
| `storageRules.integration.test.ts` | `ECONNREFUSED 127.0.0.1:9199` — exige o emulator de **Storage**, que o `--only firestore,auth` não sobe | **0** |
| `estornarInscricao.e2e.review.test.ts` | `FirebaseError: auth/user-not-found` no `beforeAll` — exige usuário semeado no Auth por bootstrap separado | **0** |

As duas morrem no `beforeAll`: **81 casos SKIPPED, zero asserções avaliadas**, então nenhuma
alteração desta lane participa do resultado. Nenhuma das duas importa `buildInstallmentOptions`,
`jurosParcelamento` ou `versoesExibidas`.

---

## Placar por vetor

| # | Vetor | Veredito |
|---|---|---|
| 1 | a conta bate com Price | **PASS** |
| 2 | a parcela única do cartão não tem juros | **PASS** |
| 3 | a soma fecha | **PASS** |
| 4 | a interface não soma um centavo | **PASS** |
| 5 | o organizador não vê o juro | **PASS** (lacuna de prova fechada) |
| 6 | percentual não vaza | **PASS** (scan ampliado) |
| 7 | o modo incorporada não inventa número | **PASS** |
| 8 | a cotação antecipada não muda o número | **PASS** (byte a byte) |
| 9 | resposta obsoleta não aterrissa, inclusive pelo cupom | **FAIL → DEF-2 corrigido** |
| 10 | o item 64 continua de pé | **PASS** (lacuna de prova fechada) |
| 11 | pedido antigo não é reprecificado | **PASS** |
| 12 | não existe compra sem os dois aceites | **PASS** |
| 13 | o cliente não forja nada | **PASS** |
| 14 | nenhuma cobrança nasce na chegada | **PASS** |
| 15 | voltar não destrava a prova | **PASS** |
| 16 | divergência de versão recusa, e recusa por igual | **PASS na criação** · buraco no replay medido (PB-11) |
| 17 | o termo do organizador fecha o defeito | **PASS** |
| 18 | a origem é do servidor e não é reversível | **PASS** |
| 19 | nada de PII em log nem em URL | **PASS** (prova criada — não existia) |

Fora dos 19, achado por sweep: **DEF-1**, o total parcelado abaixo do principal.

## Commits desta lane

| Hash | O que é |
|---|---|
| `4c3b998` | fix DEF-1 — piso do principal no `buildInstallmentOptions` + 3 casos + 2 comentários de contrato corrigidos |
| `e309c3c` | fix DEF-2 — descarte por assinatura no "Aplicar" do cupom + 1 caso |
| `dffab74` | prova dos vetores 5, 6 e 10 (3 casos novos, nenhum defeito) |
| `44c92b9` | prova do vetor 19 + medida do buraco da PB-11 (2 casos novos) |

Sem push, como a lane manda.

## Pendências para o dono

1. **PB-2 (copy):** com termo sem juros, R$ 50,00 em 3x cobra R$ 50,01 e a tela chama esse centavo
   de "Juros do parcelamento". O número está certo e o bloco de totais fecha; o rótulo é impreciso.
2. **PB-11 (jurídica):** no replay, a prova carimba a versão vigente sem conferir a exibida — pode
   afirmar material que a pessoa não leu. Prova ausente × prova errada é decisão do dono; o caso de
   teste está no lugar exato onde a decisão vira código.
3. **PB-13:** a foto de ioga (D4) — julgamento de marca.
4. **Reconciliar a spec:** `04-spec-achados.md` D-ACH-9 e `07-fila-achados.md` vetor 1 ainda trazem
   R$ 422,03 / R$ 359,90. Os corretos são **R$ 422,28** e **R$ 359,28** (PB-1).
5. **Continua valendo do build:** nada disto está no ar. O último release é o do D0, que não contém
   C4, C5, a frente D nem os dois fix-commits desta lane.
