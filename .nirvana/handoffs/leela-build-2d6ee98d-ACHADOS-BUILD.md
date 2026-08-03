# Handoff vivo · lane ACHADOS-0802 · trace leela-build-2d6ee98d · 2026-08-03

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-ACHADOS-BUILD-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-08-02-retomada/07-fila-achados.md` (fila), `04-spec-achados.md`
(D-ACH-1..14), `05-rns-achados.md` (RN-434..445), `03-achados-dono.md` (verbatim).

Base: `main` em `13a3f00`. Sem push — o maestro pusha. `git commit --only` por caminho, um commit por task.

## Estado da fila

- [x] **D0** · redeploy da landing (os dois fix-commits de dinheiro da KITCUPOM-REV entram no ar)
- [x] **B1t · S314-T1** — tabela Price real em `buildInstallmentOptions`
- [x] **B2t · S314-T2** — 2,89% a.m. no termo semeado e no default
- [x] **A1 · S1216-T1** — gatilho da cotação na etapa de dados + sequência nos caminhos de cupom
- [ ] **A2 · S1216-T2** — `jurosParcelamento` no contrato da cotação e da cobrança
- [x] **A3 · S1216-T3** — bloco de totais (taxa nomeada, "inclusa", linha de juros)
- [x] **A4 · S1216-T4** — total por opção sempre que os dois existirem
- [x] **C1 · S1217-T1** — aceites migram para a etapa de dados e gateiam o "Continuar"
- [x] **C2 · S1217-T2** — nenhuma forma pré-selecionada
- [x] **C3 · S1217-T3** — terceiro aceite condicional (termo de saúde do organizador)
- [x] **C4 · S1217-T4** — versão exibida conferida pelo servidor
- [x] **C5 · S1217-T5** — origem da requisição na prova de aceite
- [ ] **D1 · S1218-T1** — rótulo do grupo grudado no primeiro cartão
- [ ] **D2 · S1218-T2** — clique em qualquer ponto do cartão seleciona
- [ ] **D3 · S1218-T3** — "Escolha seu percurso" → "Modalidades disponíveis"
- [ ] **D4 · S1218-T4** — fotos reais de kit no acervo local

---

## D0 · o site no ar volta a ser o HEAD

O deploy vigente era o da KITCUPOM-BUILD (21:25 de 02/08), cortado ANTES da frente B da própria
KITCUPOM, da X1 e dos dois fix-commits de dinheiro da KITCUPOM-REV (`f68b22b` teto do cache do
cupom do link; `f249f33` remover cupom descarta a cotação). Um comando:
`node apps/landing/scripts/deploy-leela-hub.mjs`.

| | |
|---|---|
| Exit do script | **0** — *Deploy complete!* |
| Backend SSR | `ssrleelalanding` (gen2, Node 22, us-central1) — *Successful update operation* |
| Hosting | 90 arquivos, 12 novos · *release complete* |
| Pacote da função | 284,37 MB |
| `package.json` do app | restaurado pelo `finally` (`[deploy-landing] package.json restaurado.`) |

### Prova 1 — códigos HTTP, medidos depois do release

```
200   7,73 s   45.710 B   https://leela-landing.web.app/
200   2,06 s   79.831 B   https://leela-landing.web.app/meia-floripa-2026
200   1,43 s   40.205 B   https://leela-landing.web.app/meia-floripa-2026/inscricao
200   0,61 s        15 B  https://leela-landing.web.app/health
```

Os 7,7 s da home são o cold start de `minInstances: 0` — o mesmo número das lanes anteriores, não
regressão. A página do evento cresceu de 78.613 B para 79.831 B: é a faixa do cupom da B3.

### Prova 2 — o chunk da rota de inscrição trocou, e é BYTE A BYTE o que foi construído aqui

O chunk é content-addressed, então o nome É o hash do conteúdo:

- antes: `.../inscricao/page-**8581cec0538e410c**.js` (o que a KITCUPOM-BUILD deixou)
- depois: `.../inscricao/page-**ac6808a1385e2ca8**.js`

E o servido é o mesmo arquivo que saiu deste build — não "um build novo qualquer":

```
md5  d635c69729251361de93d7baf7d66782  (baixado de leela-landing.web.app)
md5  d635c69729251361de93d7baf7d66782  .firebase/leela-landing/hosting/.../page-ac6808a1385e2ca8.js
```

O chunk antigo passou a devolver o HTML de 404 (o release rotacionou de verdade).

### Prova 3 — marcadores ASCII no bundle novo

Cliente (chunk baixado do ar), com dois controles que NÃO podiam sumir:

| Marcador | Origem | Ocorrências |
|---|---|---|
| `(desconto aplicado)` | S1215-T2 · marca da linha de desconto | **1** |
| `do seu link` | S1215-T2 · cupom do link no resumo | **1** |
| `Atualizando o total` | CKUX-REV `f291f33` (controle) | 1 |
| `totalDefasado` | CKUX-REV (controle) | 2 |
| `Pagar ` | rótulo normal (controle) | 1 |

Servidor (`f68b22b` mora em `lib/leitor.ts`, que roda no `ssrleelalanding` e não é baixável). A
cadeia é: o marcador está no artefato construído, o artefato construído é o que foi empacotado, e o
empacotado subiu com *Successful update operation*.

| Marcador (minificado) | `apps/landing/.next/server/.../[eventSlug]/page.js` | `.firebase/leela-landing/functions/.next/...` |
|---|---|---|
| `size>=500` (teto de entradas do cache) | 1 | 1 |
| `!e.includes("/")` (régua do slug) | 1 | 1 |

Os dois arquivos têm o mesmo md5 (`94cc881aad65ec6ce2edb2e0ae0dc214`).

`f249f33` são duas linhas dentro do `removerCupom` (`assinaturaCotadaRef.current = null` +
`setCotacao(null)`): não deixam string para grep. Viajam no chunk cujo hash mudou e cuja identidade
byte a byte com o artefato local está provada acima, e estão cobertas por
`checkout-kitcupom-rev-remover.test.tsx` (4/4).

### Prova 4 — a X1 está servida (e o que ela NÃO fez)

Na página do evento no ar: `Grupo de corredores na largada` = **0**, `Corredores durante o percurso`
= **0**, `No percurso` = **0**, `Durante` = **2**. O vocabulário da X1 está no ar.

E o veredito que a fila pediu: **`Escolha seu percurso` = 2 ocorrências, vivas**. A X1 **não** pagou
o B8 — a **D3 é edição, não verificação**.

---

## B1t · S314-T1 · a tabela Price de verdade

Commit `e0ef9a5`. Território: `packages/core/src/finance/calc.ts` + as suítes que documentavam o
modelo antigo.

### O que estava errado

`buildInstallmentOptions` fazia `total = valor × (1 + i)^n` e `parcela = total / n`. Isso não é
Price: é o principal corrigido pelo juro composto do prazo inteiro, sem amortização. Enquanto
`jurosAoMes` era 0 os dois modelos coincidiam byte a byte e a diferença nunca valeu um centavo —
por isso ninguém tropeçou nela. Ligar o número é o que a torna dinheiro.

### Correção de número da spec (não é premissa: é aritmética)

A spec ilustra a diferença com **R$ 422,03** (modelo antigo) e **R$ 359,90** (Price) para R$ 300 a
2,89% a.m. em 12x. Os dois estão errados. Medido:

| | Spec | Medido |
|---|---|---|
| Modelo antigo (`300 × 1,0289^12`) | R$ 422,03 | **R$ 422,28** |
| Price (parcela 29,941065… → 29,94 × 12) | R$ 359,90 | **R$ 359,28** |

A diferença que o dono paga a mais no modelo antigo é de **17,5%**, não 17% — a ordem de grandeza
da spec está certa, os dois valores fechados não. O teste asserta o valor MEDIDO; quem for
reconciliar a spec depois usa esta tabela.

### As três propriedades provadas

1. **A conta bate com Price.** 12x de R$ 300 a 2,89% = parcela 29,94, total 359,28 — e o teste
   asserta explicitamente que o total **não** é 422,28.
2. **A parcela única não tem juros.** `n = 1` devolve o próprio PV. É isto que faz "À vista" do
   cartão bater com o PIX à vista na mesma tela, e o `totalAVista` do resumo bater com o primeiro
   item da lista de parcelamento.
3. **A soma fecha exato em centavos.** Para todo `n`, `round(parcela × 100) × n === round(total ×
   100)`, varrido em 5 valores × 3 taxas (0 / 2,89 / 3,49). O arredondamento passou para a
   **parcela**, e o total é a parcela multiplicada — é o que faz a divisão do gateway (que recebe
   `installmentCount` + `totalValue`) cair no mesmo número que a tela mostrou. Vale inclusive com
   juros ZERO, onde R$ 35 em 3x dava parcela 11,67 e total 35,00: três parcelas que não somavam o
   total.

### Falsificação (a fila exige: teste que REPROVA a versão anterior)

Fórmula antiga restaurada, core reconstruído, suíte re-executada:

```
Tests  4 failed | 10 passed (14)
```

Os quatro que morrem são exatamente os discriminantes: o valor de 12x, a parcela única sem juros, a
soma exata em centavos e o corte pela parcela mínima com juros ligados. O quinto caso novo ("a
parcela cresce com o juro e o total nunca é menor que o principal") passa nos DOIS mundos de
propósito — é guarda de sanidade, não discriminante, e está declarado como tal no arquivo.

### Duas suítes que documentavam o modelo antigo e foram corrigidas

Não são regressões: são os testes que **carimbavam** a fórmula velha, e cada um é uma prova a mais
de que a mudança é de dinheiro.

- `checkoutCore.test.ts:244` — esperava `roundMoney(300 × 1,0349³)` = **332,52**; Price dá
  **321,18**. R$ 11,34 a menos para o comprador no mesmo prazo e na mesma taxa.
- `rn347TaxaRepassada.test.ts:209` — esperava `opcoesParcelamento[0].valorTotal ===
  totalComprador × 1,0349` (**217,16**), ou seja, a parcela única do cartão carregando um mês de
  juros. Agora é o próprio total à vista (**209,84**), pela P2 da spec.

Nos dois, a tolerância de "½ centavo por parcela" foi trocada por igualdade EXATA em centavos — ela
existia justamente porque o total era arredondado antes da parcela.

### Gates

| | |
|---|---|
| `tsc --noEmit` core | **0** |
| `eslint src --max-warnings 0` core | **0** |
| `tsup` (build do core, ANTES das suítes — lição NAV-FIX) | exit 0 |
| `tsc --noEmit` functions | **0** |
| `eslint src --max-warnings 0` functions | **0** |
| Suítes de venda/parcelamento (6 arquivos) | **148/148** |
| Suíte da landing, processo único | **310/310** em 28 arquivos |

Os 6 arquivos são todos os que consomem `buildInstallmentOptions` ou `computeSaleState`:
`financeCalc`, `checkoutCore`, `pagamento`, `rn347TaxaRepassada`, `taxaFlexSaleState`,
`termsProvider`.

---

## B2t · S314-T2 · o número 2,89 entra como dado, e os 3,49 saem da documentação

Commit `5568f33`. Território: `packages/core/src/platform/commercialTerms.ts`,
`packages/core/src/pedidos/pagamento.ts`, `functions/src/seed/commercialTerms.seed.ts`,
`functions/src/seed/pedidos.seed.ts` + suíte do termo.

O `jurosAoMes` do termo canônico era 0 — o motor existia e estava desligado. Passou a 2,89.
Nenhum literal de percentual entrou em código de cálculo: o seed do termo herda de
`DEFAULT_COMMERCIAL_TERMS`, e a linha de log dele deixou de dizer "12x sem juros" fixo (agora é
derivada do próprio termo).

**O conflito dos 3,49% foi resolvido de frente.** Dois lugares documentavam a decisão de 2026-07-05:
o cabeçalho de `pedidos/pagamento.ts` e a constante `JUROS_AM_PCT` do seed de pedidos. O
comentário do core deixou de citar percentual nenhum (aponta para o termo); a constante do seed
passou a ESPELHAR o termo em vez de ter valor próprio.

**Uma cópia da regra do dinheiro morreu.** O `parcelamento()` do seed reimplementava a fórmula
antiga — a mesma que a B1t aposentou. Agora chama `buildInstallmentOptions`, com
`parcelaMinima: 0` porque o seed precifica pedido que JÁ existe e corte por parcela mínima é regra
de oferta, não de histórico.

### Falsificação

`jurosAoMes` de volta a 0: **2 failed | 12 passed** — caem "o termo canônico traz 2,89% a.m."
(expected 0 to be 2.89) e "12x de R$ 300 sai pela tabela Price".

### Gates

| | |
|---|---|
| core `tsc` / `eslint` / `tsup` | 0 / 0 / exit 0 |
| functions `tsc` / `eslint` | 0 / 0 |
| 9 suítes (termo, plano, provisionamento, venda, parcelamento) | **182/182** |
| Suíte da landing, processo único | **310/310** em 28 arquivos |

---

## A1 · S1216-T1 · a cotação começa na etapa de dados

Commit `fdd3918`. Território: `.../checkout/CheckoutFlow.tsx` + teste novo
`test/checkout-s1216-cotacao-antecipada.test.tsx`.

`precisaCotar` passou de `step >= 2` para `step >= 1`. O round-trip (1,7 s a 9,8 s medidos em
produção) passa a acontecer enquanto a pessoa preenche nome, CPF, nascimento e endereço. Ao chegar
no PAGAR a assinatura não mudou, então o efeito cai no ramo já cotado e **nenhuma chamada nova
sai**.

O step 0 continua sem cotar (a assinatura muda a cada clique de modalidade/kit). O pré-aquecimento
é silencioso: falha ali não pinta erro no formulário nem bloqueia o "Continuar".

**Os dois caminhos manuais de cupom entraram no `cotacaoSeqRef`.** O `vivo` do auto-apply só cobria
desmontagem do próprio efeito; ele não sabia nada de uma cotação pedida por outro caminho. O
`setAplicandoCupom(false)` sai SEMPRE, antes do descarte por sequência — travá-lo por resposta
obsoleta deixaria o campo em "Aplicando…" para sempre.

### Falsificação

Gatilho de volta a `step >= 2` e os dois descartes removidos: **4 failed | 2 passed (6)**. Caem a
cotação na etapa de dados, o formulário na tela durante o round-trip, o silêncio do pré-aquecimento
e a resposta obsoleta do cupom. Os dois que passam nos dois mundos são guardas de custo declaradas
no arquivo ("o step 0 continua sem cotar" e "o cupom cola no caminho feliz").

### Gates

| | |
|---|---|
| landing `tsc` / `eslint` | 0 / 0 |
| Suíte da landing, processo único | **316/316** em 29 arquivos (era 310/310 em 28) |

---

## A2 · S1216-T2 · o juro do parcelamento ganha nome próprio

Commit `13df11a`. Território: `functions/src/checkout/cotarInscricaoCheckout.ts`,
`functions/src/checkout/createInscricaoCharge.ts`, `packages/api-client/src/checkout.ts` + duas
suítes.

`jurosParcelamento` entra no contrato da cotação e no da cobrança, em reais, derivado no servidor
como `roundMoney(totalCobrado − totalComprador)`. `totalComprador` já é face + taxa repassada,
então a subtração isola exatamente o custo de financiar.

**Congelado no ato da compra** (mesma disciplina da RN-179): grava no doc de pagamento quando > 0,
e o replay lê dali. Campo só quando existe — PIX, cartão à vista e termo sem juros continuam
gravando o doc vigente byte a byte.

**O juro não é receita do organizador (RN-437), e agora tem prova.** À vista e em 9x do mesmo
carrinho produzem o MESMO líquido, a mesma base e a mesma taxa, com o total do comprador diferente.
A falsificação está declarada no próprio caso: somar o juro à base faz as três asserções morderem.

**Dois testes de integração carregavam a fórmula antiga** (`TOTAL_REP × 1,0349³`) e passaram a
chamar a fonte única por um helper — teste que reimplementa a regra do dinheiro é a terceira cópia
dela.

### ~~⚠️ Limitação medida~~ → RESOLVIDA (ver "Estado do emulator" no fim)

A suíte de integração da A2 ficou sem rodar quando a task fechou, porque o `firebase-tools` global
exige JDK 21+ e esta máquina tem Java 17. **O bloqueio caiu**: com `firebase-tools@13` o emulator
sobe em Java 17, e `rn347Checkout.integration.test.ts` foi executada — **16/16 verdes**, com as
asserções da A2 contra o documento persistido incluídas. Comando e provas na seção final.

### Gates

| | |
|---|---|
| api-client `tsc` / `eslint` / build | 0 / 0 / exit 0 |
| functions `tsc` / `eslint` | 0 / 0 |
| 9 suítes puras (termo, plano, provisionamento, venda, parcelamento) | **184/184** |
| landing `tsc` + suíte, processo único | 0 · **316/316** |

---

## A3 · S1216-T3 · o total para de ser um número sem história

Commit `ecb5188`. Território: `.../checkout/StepResumo.tsx`, `.../checkout/StepConfirmacao.tsx`,
mais duas linhas de fiação em `CheckoutFlow.tsx` e quatro arranjos de teste.

O bloco de totais ganhou duas linhas e um nome:

```
Subtotal                          R$ ___
Desconto                        − R$ ___     (da KITCUPOM — NÃO tocada)
Taxa de serviço (PIX|cartão)      R$ ___     (repassada)
Taxa de serviço                   inclusa no valor   (incorporada, sem número)
Juros do parcelamento             R$ ___     (só quando > 0)
Total                             R$ ___
```

**O modo veio do flag do evento, não do valor.** `taxaRepassada` (leitor · RN-347) entrou como prop
nos dois componentes. Usar `taxaServico > 0` como proxy seria mais barato e estaria errado: evento
que repassa pode ter taxa zerada no meio escolhido, e chamar isso de "inclusa" é falso. Três
ramos, cada um com um enunciado verdadeiro — repassada com valor nomeia o meio; repassada com zero
não diz nada (não há o que discriminar); incorporada diz "inclusa no valor" e nunca um número.

**A tela não subtrai.** `jurosParcelamento` é lido do campo que a A2 pôs na cotação e no doc de
pagamento. O caso `A INTERFACE NÃO SOMA UM CENTAVO` prova isso pelo avesso: a cotação chega com
`jurosParcelamento: 5` e `totalCobrado − totalAVista = 92`, de propósito. A tela mostra R$ 5,00 e
o texto do bloco não contém "92,00". Qualquer implementação que derivasse o juro localmente morde.

### Falsificação (11 dos 17 casos morrem na versão anterior)

Os dois componentes restaurados do HEAD e o mesmo arquivo de teste re-executado:

```
Tests  11 failed | 6 passed (17)
```

Os 11 discriminantes: taxa nomeada no PIX, taxa nomeada no cartão, o rótulo mudo "Taxa de serviço"
não sobrevive, "inclusa no valor" existe, o valor real não vaza em incorporada, a linha de juros
existe, o juro exibido é o do servidor, a ordem das cinco linhas, e os três casos da confirmação.

Os 6 que passam nos dois mundos são guardas declaradas: taxa zero em evento repassado segue sem
linha, "R$ 0,00" nunca aparece, percentual nunca aparece, PIX/à vista sem linha de juros, servidor
antigo sem o campo (nem `undefined` nem `NaN` na tela) e pedido antigo sem juros na confirmação.

### Gate de marca (task de interface)

Sem componente novo e sem classe nova. As classes acrescentadas são as MESMAS já usadas dentro do
próprio bloco de totais: `flex items-center justify-between`, `gap-3`, `text-text-secondary`,
`text-text-primary`. Varredura no diff dos dois componentes: zero hex, zero valor arbitrário, zero
utilitário de cor fora dos tokens do DS. O "inclusa no valor" é renderizado em
`text-text-secondary` de propósito — é enunciado, não número, e a hierarquia visual diz isso.

### Gates

| | |
|---|---|
| landing `tsc --noEmit` | **0** |
| landing `eslint` (checkout + test, `--max-warnings 0`) | **0** |
| Suíte da landing, processo único | **333/333** em 30 arquivos (era 316/316 em 29) |
| Arquivo novo `checkout-s1216-totais-discriminados` | **17/17** |

---

## A4 · S1216-T4 · a feature que existia e não aparecia

Commit `7427b3e`. Território: `.../checkout/StepResumo.tsx`, `.../checkout/StepModalidadeKit.tsx`
+ dois arquivos de teste.

O `totaisPorMeio` da RN-180 chegava do servidor desde a S1210 e o rótulo só o exibia quando os dois
totais **diferiam**. Em taxa incorporada eles nunca diferem — o dono testou exatamente o evento em
que a feature inteira era invisível. O critério passa a ser **por opção**: existe total daquele
meio, o rótulo o carrega.

Por opção, e não um gate único para os dois, porque a RN-180 já prometia que falha parcial na
derivação do meio alternativo não derruba a opção principal. `null` num meio devolve o rótulo
genérico **daquele** meio e o outro segue com número — caso novo no teste, com a asserção negativa
de que a opção sem derivação não ganha `R$` nenhum.

A nota da etapa 0 ganhou o segundo ramo (D-ACH-7): em modo incorporada ela diz que não há taxa
adicional e que o valor exibido é o valor final. Antes, o modo incorporada era silêncio — e o
silêncio foi o achado.

### Falsificação

`StepResumo` e `StepModalidadeKit` restaurados do HEAD (que já contém a A3, então o que se mede
aqui é só a A4):

```
Tests  3 failed | 9 passed (12)   (checkout-fixes-steps)
```

Os três: os totais iguais nas duas opções, a derivação parcial e a nota do modo incorporada.

### Dois casos que carimbavam a regra antiga — reescritos, não removidos

- `checkout-fixes-steps.test.tsx` — `"incorporada (taxaServico 0): rótulos vigentes, sem total por
  opção"` exigia justamente o rótulo mudo. Virou `"os totais IGUAIS aparecem nas duas opções"`.
- `checkout-fixes-steps.test.tsx` — `"evento em modo incorporada: SEM nota de taxa"` exigia o
  silêncio. Virou `"a nota diz que não há taxa adicional"`, com a guarda de que percentual não
  aparece em nenhum dos dois ramos.
- `checkout-s1209-cupom-forma.test.tsx` — dois casos casavam o nome acessível do rádio por string
  EXATA (`'PIX (à vista)'`). Passaram a casar por padrão: o que eles guardam é o papel de rádio e a
  troca de forma, não a copy do total.

### Gates

| | |
|---|---|
| landing `tsc` / `eslint` | **0** / **0** |
| Suíte da landing, processo único | **334/334** em 30 arquivos |

---

## C1 · S1217-T1 · o aceite muda de etapa, a prova não muda de dono

Commit `9abf1a6`. Território: `.../checkout/CheckoutFlow.tsx`, `.../checkout/StepDados.tsx`,
`.../checkout/StepPagamento.tsx` + o teste novo `checkout-s1217-aceites-inscricao.test.tsx` e oito
arquivos de teste que atravessavam o PAGAR.

O bloco `AceitesCompra` saiu do pagamento e passou a fechar a etapa de dados. Ele muda de LUGAR,
não de conteúdo: os mesmos dois checkboxes, os mesmos dois modais, os mesmos rótulos de versão. O
gate de constraint que morava sobre o botão de pagar passou a morar sobre o "Continuar" do step 1.

**O `StepDados` recebeu um slot, não nove props.** `aceites?: React.ReactNode` — a política, as
versões e o travamento pela cobrança já moram no `CheckoutFlow`, e é o mesmo arranjo que o
`conteudoCartao` do `SeletorForma` usa. O `StepPagamento` perdeu sete props e ganhou uma
(`aceitesOk`): o gate do botão continua de pé como defesa em profundidade — a tela não oferece um
ato que o servidor recusaria.

**O que NÃO mudou, e é o coração da regra.** O servidor continua recusando `createInscricaoCharge`
sem os dois booleanos (flip F-4a), o carimbo continua nascendo na transação com versão e
`materialHash` lidos ali dentro, e o cliente continua sem canal para forjar versão ou antedatar
aceite. Nenhuma linha de `createInscricaoCharge.ts` foi tocada nesta task.

**Travado no retorno (RN-438).** `desabilitado={charge !== null}` viaja com o bloco: como agora ele
vive numa etapa para a qual a pessoa pode voltar, voltar com a cobrança criada mostra os dois
marcados e travados. O caso não usa `fireEvent.click` para "provar" que não desmarca — clique
sintético atravessa `disabled` no jsdom e provaria o contrário do que acontece na tela; a asserção
é sobre o atributo, que é o guarda real.

### ⚠️ O defeito que a migração produz, e que a C2 desfaz

Com o aceite dado antes, **chegar ao PAGAR com PIX pré-selecionado passa a criar cobrança
sozinho**. Isso não é hipótese: caiu de dois testes existentes no mesmo instante em que a C1
entrou — `checkout-s1209-cards-atleta` deixou de achar o botão "Gerar código PIX" (a cobrança já
tinha nascido) e `checkout-ckux-rev-cotacao` viu `createInscricaoCharge` chamado 1× onde esperava
zero. É exatamente o que a D-ACH-12/RN-440 previu, e a **C2 é quem o desfaz tirando a
pré-seleção**. Os dois casos ficaram com asserção relativa e comentário apontando para a C2.

**C1 não vai ao ar sem C2.** Está escrito no `Directive:` do commit.

### Falsificação

Os três componentes restaurados do HEAD e o arquivo novo re-executado:

```
Tests  7 failed | 1 passed (8)
```

O único que passa nos dois mundos é a guarda "o step 0 NÃO os apresenta" — ela é sobre onde os
aceites **não** vão, e era verdade antes e depois.

### Oito arquivos de teste que atravessavam o PAGAR

Nenhum foi apagado. Cinco `preencherDados()` ganharam os dois cliques de aceite (o helper leva o
fluxo ao PAGAR, então ele agora marca o que a etapa exige); três laços
`for (const c of getAllByRole('checkbox')) click(c)` no PAGAR foram removidos, porque lá não há
mais checkbox. Dois casos que carimbavam a colocação antiga foram reescritos:

- `checkout-form-aceites.test.tsx` — o arquivo inteiro seguiu o bloco. As asserções de modal,
  versão e vocabulário C1-LEGAL (participante/experiência, zero "atleta") passaram a mirar
  `AceitesCompra` diretamente, que é onde sempre pertenceram; o `StepPagamento` ficou com o gate do
  botão e ganhou dois casos novos: a etapa não exibe mais checkbox, e sem aceite ela aponta ONDE
  ele é dado em vez de deixar a pessoa no beco.
- `checkout-dec0729-pagar.test.tsx` — o achado 3 da DEC-0729 tinha duas metades. A unificação de
  resumo e pagamento numa tela só continua de pé e continua provada; a metade "aceites juntos" foi
  superseded pela RN-438 e virou a asserção inversa (zero checkbox no PAGAR). O caso "sem os 2
  aceites nenhuma cobrança nasce" foi reescrito para a etapa certa: sem aceite não se **chega** ao
  pagamento, e a cobrança nunca é pedida.

### Gates

| | |
|---|---|
| landing `tsc` / `eslint` | **0** / **0** |
| Suíte da landing, processo único | **344/344** em 31 arquivos (era 334/334 em 30) |

---

## C2 · S1217-T2 · a tela deixa de comprar sozinha

Commit `590226b`. Território: `.../checkout/CheckoutFlow.tsx`, `.../checkout/StepResumo.tsx`,
`.../checkout/StepPagamento.tsx`, `.../checkout/SeletorForma.tsx` + sete arquivos de teste.

**Fecha o buraco que a C1 abriu.** `useState<FormaUI>('pix')` virou
`useState<FormaUI | null>(null)`. A auto-geração do PIX dispara com
`step === 2 && forma === 'pix' && aceitesOk`: com o aceite vindo da etapa anterior e `'pix'` no
default, entrar no pagamento criava pedido, pagamento e inscritos pendentes e uma cobrança real no
gateway — antes de a pessoa olhar o total.

**A fronteira entre cotar e cobrar virou código.** `formaCotada = forma ?? 'pix'` alimenta a
cotação; `forma` (que pode ser `null`) alimenta a cobrança, com um guard explícito no
`gerarCobranca` que devolve erro em vez de criar nada. Cotar é leitura: nada é gravado, nada é
cobrado, e a pessoa vê os dois preços no rótulo de cada opção (S1216-T4) antes de decidir.

**`exactOptionalPropertyTypes` cobrou honestidade.** Ausência de escolha entra no `RadioGroup` e no
`StepConfirmacao` como **prop ausente**, não como `undefined` passado — spread condicional. O
`RadioCard` compara `ctx.value === value` e nenhum casa, que é exatamente o estado sem seleção.

Sem meio escolhido o `StepPagamento` não renderiza instrumento nenhum: uma linha aponta para a
escolha logo acima. Não há botão de pagar a desabilitar, porque não há o que pagar ainda.

### Falsificação

Os quatro componentes restaurados do HEAD (que já contém a C1) e o arquivo novo re-executado:

```
Tests  6 failed | 1 passed (7)
```

O único que passa nos dois mundos é "escolher CARTÃO não cria cobrança" — o cartão já era assim,
porque o pagamento dele sempre exigiu o botão. Está declarado no arquivo como guarda.

### Sete arquivos de teste que atravessavam o PAGAR

O gesto que faltava passou a ser escrito nos helpers: quem tem contrato de "pagar com PIX"
(`checkout-asaas-teto`, `checkout-s1209-rev-ataque`, `checkout-s1209-cards-atleta`, e o caso de
retorno da C1) ganhou o clique na opção PIX; quem tem contrato de "chegar ao PAGAR"
(`checkout-dec0729-pagar`, `checkout-ckux-rev-cotacao`) trocou o marco de chegada do botão "Gerar
código PIX" para o resumo do pedido — porque na chegada não existe mais botão de pagar.

### Gates

| | |
|---|---|
| landing `tsc` / `eslint` | **0** / **0** |
| Suíte da landing, processo único | **351/351** em 32 arquivos (era 344/344 em 31) |

---

## C3 · S1217-T3 · o aceite que o servidor exigia e a tela nunca pediu

Commit `5e17cc1`. Território: `.../checkout/AceitesCompra.tsx`, `.../checkout/CheckoutFlow.tsx`
+ o teste novo `checkout-s1217-termo-saude-custom.test.tsx`.

**O leitor e os tipos já estavam prontos.** `apps/landing/lib/leitor.ts` e `lib/tipos.ts` — dois dos
quatro caminhos declarados no território da task — já projetavam `termoSaudeCustom { texto, versao }`
desde a CK2, com `null` honesto para doc ausente, texto vazio, doc inválido ou leitura que falha.
Nenhuma linha precisou mudar neles. O que faltava era a COLETA.

O defeito era este: `createInscricaoCharge.ts:1409` lança `failed-precondition` quando o evento tem
termo de saúde próprio ativo e o input não traz `aceites.saudeCustom === true`; o `CheckoutFlow`
mandava `{ termos: true, saude: true }` fixo. Todo evento com termo custom ativo tinha a compra
quebrada, sempre.

**O payload parou de afirmar `true` literal.** Agora sobe `{ termos: aceiteTermos, saude:
aceiteSaude }`, com `saudeCustom` só nos eventos que têm o termo — um cliente que diz "houve
aceite" porque o código escreveu assim, e não porque alguém clicou, é uma afirmação que a prova não
suporta. O que continua vindo só do servidor: versão, instante e hash (caso de anti-forja no
arquivo varre o payload bruto atrás de `materialHash`, `aceitoEm`, `versao`).

### Achado da própria task: `undefined !== null` travava a compra

A primeira versão do gate era `evento.termoSaudeCustom !== null`. Projeção **sem o campo** devolve
`undefined`, e `undefined !== null` é `true` em JavaScript: o gate passou a exigir um terceiro
aceite que a tela não renderizava, e a compra travava em silêncio num evento que não tem termo
próprio nenhum. **Derrubou 53 casos da suíte de uma vez** — foi assim que apareceu. Corrigido com
leitura Postel (`?? null`) e travado por caso próprio, que deleta o campo do fixture.

### Falsificação

`CheckoutFlow` e `AceitesCompra` restaurados do HEAD:

```
Tests  4 failed | 3 passed (7)
```

Os quatro: o terceiro aceite existe com modal e versão, os dois base não bastam, a compra conclui
com os três, e o payload traz `saudeCustom: true`. Os três que passam nos dois mundos são as
guardas: evento sem termo segue com dois aceites, `saudeCustom` não é inventado no payload, e o
anti-forja (que a task não afrouxou).

### Gates

| | |
|---|---|
| landing `tsc` / `eslint` (`app` + `test`) | **0** / **0** |
| Suíte da landing, processo único | **359/359** em 33 arquivos (era 351/351 em 32) |

---

## C4 · S1217-T4 · a versão que a pessoa viu passa a valer alguma coisa

Commit `e57ce3b`. Território: `packages/core/src/pedidos/aceites.ts` (+ `index.ts`),
`functions/src/checkout/createInscricaoCharge.ts`, `packages/api-client/src/checkout.ts`,
`.../checkout/CheckoutFlow.tsx` + dois arquivos de teste novos e um corrigido.

A tela passa a mandar `aceites.versoesExibidas`; o servidor compara com a vigente lida **dentro da
tx** e recusa com motivo tipado (`MOTIVO_ACEITE_VERSAO_DIVERGENTE`) antes de qualquer escrita.

**O número exibido morre no gate.** O bloco carimbado continua lendo só fontes do servidor
(`versaoTermosVigente`, `TERMO_SAUDE_VERSAO_VIGENTE`, `termoCustomStamp`) — provado pelo avesso: o
doc do pedido é serializado e varrido atrás de `versoesExibidas`, e não há ocorrência.

**A recusa é muda.** Nem o texto novo, nem o hash, nem a versão nova, nem o instante da publicação
atravessam. O caso V3 publica a versão **7** com um parâmetro de material mudado para **29** e
varre a mensagem + os `details` atrás dos dois números, de padrão de data e de qualquer palavra de
carimbo. Só o motivo passa.

**O campo é opcional por evolução de schema, e isso não é um buraco.** Quem omite perde a própria
guarda e não ganha nada — a versão gravada nunca veio dali. Exigi-lo quebraria replay e chamada
direta sem comprar segurança.

### O beco que a regra abriria, e o seam que o fecha

Recusar sem trazer material novo seria laço infinito: `evento.politicaVendas` é prop renderizada no
servidor, então reconfirmar mandaria a MESMA versão velha e levaria a MESMA recusa. A tela repõe o
aceite (desmarca os três, volta ao step 1, uma frase) **e** chama `recarregarMaterial()`, prop nova
com default `() => window.location.reload()`. Ver premissa **PB-10**.

### Duas falsificações, uma de cada lado

| Lado | Como | Resultado |
|---|---|---|
| Servidor (`if (exibidas !== undefined)` desligado) | emulator, mesmo arquivo | **4 failed \| 4 passed (8)** |
| Cliente (`CheckoutFlow` restaurado do HEAD) | jsdom, mesmo arquivo | **5 failed \| 2 passed (7)** |

Os 4 que sobrevivem no servidor são guardas declaradas (compra conclui com versão igual; a exibida
não é gravada — verdade nos dois mundos; cliente legado sem o campo; termo custom com a versão
certa). Os 2 do cliente são o caso do payload sem `saudeCustom` inventado e a guarda de que outra
recusa `failed-precondition` não desmarca aceite nenhum.

### Gates

| | |
|---|---|
| core `tsc` / `eslint` / `tsup` | **0** / **0** / exit 0 |
| api-client `tsc` / `eslint` / build | **0** / **0** / exit 0 |
| functions `tsc` / `eslint` | **0** / **0** |
| landing `tsc` / `eslint` (checkout + test) | **0** / **0** |
| Integração no emulator (`@13`, Java 17) | **8/8** · `emulators:exec` exit **0** |
| 4 suítes puras de functions (checkoutCore, pedido, inscritoPedido, politicaVendas) | **145/145** |
| Suíte da landing, processo único | **366/366** em 34 arquivos (era 359/359 em 33) |

### Um teste que carimbava o payload inteiro — reescrito, não removido

`checkout-s1217-termo-saude-custom.test.tsx` casava `payload.aceites` por igualdade EXATA de
objeto, e a RN-439 acrescentou um campo a ele. Os dois casos passaram a asserir os BOOLEANOS, que é
o que eles guardam; a asserção NEGATIVA (`'saudeCustom' in payload.aceites === false`) continua
exata, porque ela é o contrato do caso.

---

## C5 · S1217-T5 · a prova passa a dizer de onde veio

Commit `1d0611a`. Território: `packages/core/src/pedidos/aceites.ts` (+ `index.ts`),
`functions/src/checkout/createInscricaoCharge.ts` + o teste novo
`aceitesOrigem.integration.test.ts`.

A prova de aceite guardava **o quê** (versão + `materialHash`) e **quando** (carimbo do servidor).
Não guardava **de onde** — e o `context.rawRequest` estava disponível na callable desde sempre, sem
ninguém lê-lo. O bloco ganha `origem { ipHash, userAgent }`.

**O endereço nunca é gravado em claro.** Vira HMAC-SHA256 com o mesmo pepper secreto dos
identificadores de pessoa do CRM (hardening A3). O sha256 puro não serviria: IPv4 tem 2³² valores e
a força bruta offline reverte em segundos — o caso O3 asserta explicitamente que o hash gravado
**não é** `sha256(ip)`.

**O cliente não participa.** O caso O4 planta no payload tudo o que um cliente hostil tentaria
(`origem`, `ipHash`, `userAgent`, `ip`) e prova duas coisas: o que fica gravado é o da requisição, e
nenhum dos valores plantados sobrevive em ponto nenhum do documento.

**Requisição sem endereço omite a origem em vez de inventá-la.** Gravar `hash('')` afirmaria
conhecer uma coisa que não se sabe. Prova sem origem é prova incompleta, não prova falsa — e o
parse defensivo do core aceita as duas.

**Atrás do proxy, `req.ip` é o do proxy.** `x-forwarded-for` vem primeiro, e vale o PRIMEIRO da
lista (o cliente; os seguintes são saltos). Cabeçalho forjado pode mentir sobre o VALOR, e é por
isso que a prova diz "origem declarada pela requisição" — o que a regra impede é o cliente escolher
o que fica gravado.

**O replay (F-4b) carimba a origem DESTE retry**, que é quando o aceite chegou ao servidor;
antedatar seria forja. E prova existente segue intocada (caso O7b).

### Falsificação

`origemAceite` fixado em `null` (a derivação desligada), mesma suíte no emulator:

```
Tests  5 failed | 4 passed (9)
```

Os 4 que sobrevivem são guardas declaradas: o hash puro (unidade da derivação, que não passa pelo
documento), os dois casos de ausência de endereço e o `caller` sem origem.

### Gates

| | |
|---|---|
| core `tsc` / `eslint` / `tsup` | **0** / **0** / exit 0 |
| functions `tsc` / `eslint` | **0** / **0** |
| landing `tsc` | **0** |
| Integração no emulator — 5 arquivos (os 2 novos + `pedidosRules` + `rn347Checkout` + `checkoutS1203`) | **61/61** · exit **0** |
| 4 suítes puras de functions | **145/145** |
| Suíte da landing, processo único | **366/366** em 34 arquivos |

⚠️ `pedidosRules.test.ts` **exige o emulator** — fora dele o arquivo inteiro falha com
`ECONNREFUSED 127.0.0.1:8080` e 21 casos pulados. É comportamento preexistente, não regressão desta
lane; ele entrou no lote do emulator por isso.

---

## Onde a lane parou

Fila paga: **D0, B1t, B2t, A1, A2, A3, A4, C1, C2**. O par C1+C2 está fechado — o aviso de "não
deployar C1 sem C2" está **cumprido** dentro da própria lane.

**C3 paga.** Próxima: **C4** (`S1217-T4` — a tela envia a versão EXIBIDA e o servidor confere
contra a vigente, recusando em vez de carimbar outra). Território dela:
`packages/core/src/pedidos/aceites.ts`, `functions/src/checkout/createInscricaoCharge.ts`,
`packages/api-client/src/checkout.ts`, `.../checkout/CheckoutFlow.tsx`. Depois dela, **C5**
(origem da requisição na prova de aceite), e então a frente D (D1..D4), que é independente.

⚠️ **A C4 e a C5 são de servidor.** A prova executável delas mora em
`functions/src/__tests__/*.integration.test.ts`, que dependem do emulator — ver a seção
"Estado do emulator" no fim deste handoff antes de começar.

**Worktree limpo** — nenhuma mudança de código pendente; tudo o que foi tocado está commitado. Sem
push, como a lane manda.

Avisos para quem retomar:

- A **A3 não pode encostar na linha "(desconto aplicado)"** do `StepResumo` — ela é da KITCUPOM
  (`S1215-T2`). Se a task "precisar" mexer nela, a spec errou: pare e registre.
- A **D3 é edição, não verificação** (veredito medido no D0 — `Escolha seu percurso` continua vivo
  em `ModalidadesSection.tsx:20` e o apoio da etapa 0 em `StepModalidadeKit.tsx:157`).
- A A3 já tem o dado de que precisa: `jurosParcelamento` chega pronto da cotação (A2). A tela
  **renderiza**; não subtrai.

---

## Estado do emulator · o bloqueio caiu, e não custou tocar no sistema

O handoff da A2 registrou que a suíte de integração não rodava nesta máquina: o `firebase-tools`
global recusa Java abaixo de 21 e aqui roda **OpenJDK 17.0.19**. O diagnóstico estava certo e a
conclusão estava larga demais — o corte de JDK 21 é do `firebase-tools` NOVO, não do emulator.

**Com a versão 13 o emulator sobe em Java 17.** Medido, não estimado:

```
cd functions
npx firebase-tools@13 emulators:exec --only firestore,auth --project demo-leela-s1203 \
  "npx vitest run src/__tests__/rn347Checkout.integration.test.ts"
```

| | |
|---|---|
| Emulators | `auth` + `firestore` subiram (projeto demo, config emulada) |
| Suíte de integração da A2 | **16/16** |
| Exit do `emulators:exec` | **0** — *Script exited successfully* |

Não há `firebase-tools` no `package.json` de lugar nenhum do repo (varredura em todos os
`package.json` fora de `node_modules`): a versão vem do que estiver global, e é por isso que o
comando **precisa** do `@13` explícito. Nada foi instalado e nada foi alterado no sistema — `npx`
resolve a versão sob demanda.

**Consequência para quem retomar:** a C4 e a C5 têm prova executável disponível. As asserções
delas contra o documento persistido devem rodar sob este comando, trocando o arquivo de teste.

---

## Premissas registradas (vetáveis — o dono dorme)

| # | Premissa | Onde | Custo de vetar |
|---|---|---|---|
| PB-4 | O juro é derivado na borda (callables), não acrescentado ao `SaleState` do core. É uma linha sobre dois campos que o `SaleState` já expõe, e o território da A2 é a borda | A2 | Baixo — mover para o core é mecânico, e o número não muda |
| PB-1 | Os números fechados da spec (R$ 422,03 / R$ 359,90) são erro aritmético e foram substituídos pelos medidos (R$ 422,28 / R$ 359,28). O código implementa a FÓRMULA da RN-436; nenhum literal de valor entrou nele | B1t | Nenhum no código — é reconciliação de texto da spec |
| PB-3 | O seed de `commercialTerms` é idempotente por design: ambiente que já tem `current` NÃO é regravado, então o termo dele continua com juros 0 até alguém versionar. O 2,89 vale para provisionamento novo e para re-seed limpo | B2t | Nenhum — é comportamento preexistente, registrado para não virar surpresa no emulador |
| PB-9 | A **D4** (fotos reais de kit no acervo local) não pode ser paga por este executor sem material: a task pede FOTOGRAFIA de camiseta, kit fitness e ioga versionada em `apps/landing/public/mock/`, e a própria fila proíbe link para fora. Gerar imagem sintética e chamá-la de "foto real" seria mentir no nome do arquivo | D4 | Nenhum no código — é entrega de material pelo dono, ou a task vira "placeholder honesto rotulado como exemplo" |
| PB-7 | O terceiro aceite entra no MESMO bloco dos outros dois, com o mesmo padrão de modal e versão, e o texto do organizador é renderizado como veio (quebras de linha viram parágrafos). O vocabulário D-0802-1 governa o que a PLATAFORMA escreve; o que o organizador escreveu atravessa intacto | C3 | Baixo — é copy e layout dentro de um bloco que já existe |
| PB-8 | Sem meio escolhido, o rótulo da linha de taxa diz "(PIX)", porque a cotação exibida É uma cotação de PIX à vista. A alternativa (rótulo genérico até a escolha) nomearia menos do que a RN-435 pede | C2 | Baixo — é uma expressão ternária |
| PB-5 | O modo da taxa entra na tela pelo flag do EVENTO (`taxaRepassada` do leitor), não por `taxaServico > 0`. Custa uma prop nos dois componentes e duas linhas de fiação no `CheckoutFlow` — arquivo fora do território declarado da A3, tocado no mínimo | A3 | Nenhum — o proxy pelo valor é que estaria errado; vetar seria escolher a versão falsa |
| PB-6 | Evento com taxa REPASSADA e taxa zero no meio escolhido continua sem linha de taxa (não vira "inclusa"). "Inclusa" é enunciado do modo incorporada; ali a taxa realmente sai do repasse do organizador | A3 | Baixo — é um ramo de três linhas; a alternativa é dizer "inclusa" onde não é verdade |
| PB-10 | A tela busca o material novo por `recarregarMaterial()`, prop com default `() => window.location.reload()`, em vez de `router.refresh()`. O recarregamento perde o formulário preenchido; o `refresh` do Next preservaria, mas custaria mock de `next/navigation` em 16 arquivos de teste que hoje não o mockam | C4 | Baixo — é uma linha no default da prop, mais os mocks de teste |
| PB-11 | A conferência de versão vale no caminho de CRIAÇÃO, não no `garantirAceitesNoReplay`. O replay completa prova de um pedido que JÁ existe (e já foi pago): recusar ali deixaria a compra sem prova em vez de proteger alguém | C4 | Baixo — é o mesmo bloco de comparação num segundo lugar |
| PB-2 | O arredondamento na parcela vale também com juros ZERO. Consequência: R$ 35 em 3x passa a cobrar R$ 35,01 (três parcelas de 11,67) em vez de R$ 35,00 com parcelas que não fechavam | B1t | Volta a divergência entre o total da tela e a divisão do gateway, que é o vetor 3 da fila |
