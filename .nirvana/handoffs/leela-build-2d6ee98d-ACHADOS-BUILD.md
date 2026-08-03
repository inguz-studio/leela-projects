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
- [ ] **A3 · S1216-T3** — bloco de totais (taxa nomeada, "inclusa", linha de juros)
- [ ] **A4 · S1216-T4** — total por opção sempre que os dois existirem
- [ ] **C1 · S1217-T1** — aceites migram para a etapa de dados e gateiam o "Continuar"
- [ ] **C2 · S1217-T2** — nenhuma forma pré-selecionada
- [ ] **C3 · S1217-T3** — terceiro aceite condicional (termo de saúde do organizador)
- [ ] **C4 · S1217-T4** — versão exibida conferida pelo servidor
- [ ] **C5 · S1217-T5** — origem da requisição na prova de aceite
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

### ⚠️ Limitação medida, não estimada

A suíte de integração (`rn347Checkout.integration.test.ts`), onde moram as asserções contra o
documento persistido, **não roda nesta máquina**: o emulator do Firestore exige JDK 21+ e o
`emulators:start` morre com *"firebase-tools no longer supports Java version before 21"*. As
asserções novas estão escritas e compilam (`tsc` 0); a prova executável do número mora na suíte
PURA, que afirma a MESMA derivação com os mesmos insumos. Quem tiver JDK 21+ fecha isso rodando:

```
npx firebase emulators:exec --only firestore,auth --project demo-leela-s1203 \
  "npx vitest run src/__tests__/rn347Checkout.integration.test.ts"
```

Isso também explica por que os gates das tasks anteriores citam suítes dirigidas e não a suíte
inteira de `functions`: os arquivos `*.integration.test.ts` dependem do emulator.

### Gates

| | |
|---|---|
| api-client `tsc` / `eslint` / build | 0 / 0 / exit 0 |
| functions `tsc` / `eslint` | 0 / 0 |
| 9 suítes puras (termo, plano, provisionamento, venda, parcelamento) | **184/184** |
| landing `tsc` + suíte, processo único | 0 · **316/316** |

---

## Onde a lane parou

Fila paga: **D0, B1t, B2t, A1, A2**. Próxima: **A3** (`S1216-T3` — bloco de totais: taxa nomeada
pelo meio, "inclusa no valor" no modo incorporada, linha própria de juros, no resumo e na
confirmação). Território dela: `.../checkout/StepResumo.tsx` e `.../checkout/StepConfirmacao.tsx`.

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

## Premissas registradas (vetáveis — o dono dorme)

| # | Premissa | Onde | Custo de vetar |
|---|---|---|---|
| PB-4 | O juro é derivado na borda (callables), não acrescentado ao `SaleState` do core. É uma linha sobre dois campos que o `SaleState` já expõe, e o território da A2 é a borda | A2 | Baixo — mover para o core é mecânico, e o número não muda |
| PB-1 | Os números fechados da spec (R$ 422,03 / R$ 359,90) são erro aritmético e foram substituídos pelos medidos (R$ 422,28 / R$ 359,28). O código implementa a FÓRMULA da RN-436; nenhum literal de valor entrou nele | B1t | Nenhum no código — é reconciliação de texto da spec |
| PB-3 | O seed de `commercialTerms` é idempotente por design: ambiente que já tem `current` NÃO é regravado, então o termo dele continua com juros 0 até alguém versionar. O 2,89 vale para provisionamento novo e para re-seed limpo | B2t | Nenhum — é comportamento preexistente, registrado para não virar surpresa no emulador |
| PB-2 | O arredondamento na parcela vale também com juros ZERO. Consequência: R$ 35 em 3x passa a cobrar R$ 35,01 (três parcelas de 11,67) em vez de R$ 35,00 com parcelas que não fechavam | B1t | Volta a divergência entre o total da tela e a divisão do gateway, que é o vetor 3 da fila |
