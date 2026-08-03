# CHECKOUT-FIX-0803 — os três achados do dono no parcelamento vivo

- **Trace:** `leela-build-2d6ee98d`
- **Lane:** CHECKOUT-FIX-0803 (`sf-frontend-lead`, software-forge)
- **Autoridade:** `leela-specs/02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md`
- **Base:** `main` @ `b7b3f823`
- **Território:** `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/` — functions NÃO mudam nesta lane.

Handoff vivo: cada task escreve aqui na aterrissagem.

---

## C1-0803 · total instantâneo — PAGA

**Commit:** `30232e9c` · `fix(checkout): o total muda no ato da escolha entre opções já cotadas [leela-build-2d6ee98d]`

### O que estava errado

Verbatim do dono: *"sub total, nao altera imediatamente, quando eu faço a seleção."*

O total exibido saía direto de `cotacao.totalCobrado`, e `cotacao` só mudava quando
a cotação NOVA voltava do servidor: 200 ms de debounce mais 1,7-9,8 s de round-trip
(medidos em produção). No meio disso a guarda do item 64 (`totalDefasado={cotando}`)
travava o botão em "Atualizando o total…".

A causa não era a espera: era pedir de novo o que o servidor já tinha mandado. A
cotação chega com a **escada inteira** (`opcoesParcelamento`: parcelas, valorParcela e
valorTotal de cada opção ofertável) e com o total à vista de cada meio
(`totaisPorMeio`). Trocar entre opções já cotadas é releitura, não round-trip.

### O que passou a valer

`projetarCotacao` (puro, em `CheckoutFlow.tsx`) devolve a cotação que responde pela
seleção de AGORA, montada só com números que o servidor calculou:

- **parcelas** — a opção sai de `opcoesParcelamento` (`valorTotal` vira `totalCobrado`,
  `valorParcela` vira a linha de parcela). Zero aritmética.
- **meio** — projetável apenas quando os dois totais por meio existem e são **iguais**
  (taxa incorporada, ou repassada com a mesma taxa nos dois meios), porque aí a
  composição do resumo não muda. Com totais diferentes a projeção se recusa: derivar a
  linha "Taxa de serviço" (total do meio − valorFinal) criaria a segunda autoridade
  sobre dinheiro que a RN-437 proíbe.
- **juro** — acompanha a projeção só quando é fato do contrato (à vista = 0) ou quando a
  parcela projetada é a mesma que o servidor cotou. Nos demais casos a linha some até a
  cotação nova chegar, em vez de exibir o juro de outra parcela ao lado do total certo.

A régua que autoriza a projeção é a **base de preço** (`evento | seleção | cupom`), agora
guardada em estado (`baseCotada`) ao lado da cotação. Base diferente = o valor de face
mudou = nenhuma projeção responde.

`totalDefasado` deixou de ser `cotando` e passou a ser `cotando && cotacaoExibida === null`:
o item 64 continua exato — botão travado com cotação NOVA em voo — e para de disparar
onde não há preço novo a esperar.

### Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (landing) | 0 erros |
| `eslint app lib --max-warnings 0` | 0 |
| Suíte da landing (processo único) | **427/427** (38 arquivos) |
| Regressão reprova a versão anterior | **5/7** casos do arquivo novo falham em `b7b3f823` |

### Falsificações (dinheiro)

| Vetor | Resultado |
|---|---|
| O que o botão prometeu é o que vai ao servidor (`parcelas: 3` com o total de 3x no rótulo) | PASS |
| Mudar a seleção de ITENS com cotação presa no ar ⇒ guarda dispara, botão travado | PASS |
| Trocar de MEIO com totais diferentes por meio ⇒ guarda dispara, botão travado | PASS |
| Cotação de 3x que NUNCA volta ⇒ botão promete o total de 3x da escada, habilitado | PASS |

### Arquivos

- `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx`
- `apps/landing/test/checkout-dec0803-total-instantaneo.test.tsx` (novo, 7 casos)
- `apps/landing/test/checkout-ckux-rev-cotacao.test.tsx` (B1 refinado — ver abaixo)

### Supersede registrado

`CKUX-REV · B1` media "o botão não oferece o preço velho" com um mock em que o total de
3x era **igual** ao de 1x — impossível distinguir "prometeu o preço velho" de "já leu o
preço da opção nova". O mock passou a ter escada real e o caso passou a exigir o que o
B1 sempre quis dizer: o rótulo mostra o total de 3x, nunca o de 1x, e é `parcelas: 3`
que vai ao servidor.

### Premissas vetáveis

1. **Troca de meio com taxa que varia por meio continua esperando a cotação.** A tela
   projeta o total, não a composição; a linha de taxa do outro meio não vem pronta na
   resposta. Alternativa (fora desta lane, mexe em functions): `cotarInscricaoCheckout`
   devolver `taxaServico` por meio ao lado de `totaisPorMeio`.
2. **A linha "Juros do parcelamento" some por alguns segundos** ao trocar para uma
   parcela > 1 diferente da cotada, até a cotação nova aterrissar. Alternativa (mexe em
   functions): cada opção da escada carregar o próprio juro.

---

## C2-0803 · select de parcelas nasce completo — PAGA

**Commit:** `b29e9719` · `fix(checkout): a escada do cartao esta na mao antes do clique [leela-build-2d6ee98d]`

### Reprodução (feita antes do fix)

Teste novo rodado contra `30232e9c`: **4 dos 5 casos falham**, e o primeiro devolve o
sintoma com as palavras do dono —

```
→ expected [ 'À vista — R$ 5.000,00' ] to have a length of 3 but got 1
```

Uma opção só, e ela é o valor do ingresso.

### Causa-raiz — nomeada

**Escada da forma errada, não memo nem re-render.**

As opções do select saíam de `cotacao.opcoesParcelamento`. Enquanto ninguém escolhe meio,
a cotação é pedida com `forma: 'pix'` (D-ACH-12: a cotação assume PIX à vista) — e cotação
de PIX traz **uma** opção por contrato do servidor:

```ts
// packages/core/src/checkout/saleState.ts
const opcoesParcelamento =
  forma === 'cartao_credito'
    ? buildInstallmentOptions(totalComprador, installmentRules)
    : [{ parcelas: 1, valorParcela: totalComprador, valorTotal: totalComprador }];
```

O painel do cartão abre no 1º clique (D-0729-6) e o que ele encontrava lá dentro era a
escada do PIX. A escada de verdade só chegava com a cotação de CARTÃO — 200 ms de
debounce mais o round-trip depois. Essa era a "segunda vez".

Descartadas com evidência: memoização (não há `useMemo`/`memo` no caminho do select) e
re-render do conteúdo (o `RadioCard` renderiza `children` a cada render; o painel abre no
mesmo commit do clique — o segundo caso do arquivo prova que, sem escada, o que aparece é
a mensagem de cálculo, não uma opção velha).

### O que passou a valer

- **Pré-carregamento da escada do cartão** ao entrar no PAGAR: uma cotação
  `forma: 'cartao_credito', parcelas: 1` em segundo plano, invisível (não acende
  `cotando`, não toca em `cotacao`), atrás do debounce da cotação visível (`250 ms`) para
  nunca disputar a vez com o número que o comprador espera. **Uma chamada por BASE de
  preço**, não por clique. É a mesma lógica da RN-434 (o total pronto na chegada), agora
  para o parcelamento.
- `StepResumo` recebe `opcoesParcelamento` como **prop explícita**. `null` = a escada não
  está na mão, e a tela diz isso ("Calculando as opções de parcelamento…") em vez de
  preencher o buraco com a escada do PIX.
- Escada fora da base de preço vigente não serve: trocar de modalidade invalida a escada
  antiga.
- **A11y (achado colhido no caminho):** o `Select` do DS liga o rótulo por `htmlFor={id}`
  e o checkout nunca passava `id` — o controle ficava **sem nome acessível** (WCAG
  1.3.1/4.1.2) na tela do dinheiro. `id="checkout-parcelas"` fecha a associação; há caso
  de teste.

### Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (landing) | 0 erros |
| `eslint app lib --max-warnings 0` | 0 |
| Suíte da landing (processo único) | **432/432** (39 arquivos) |
| Regressão reprova a versão anterior | **4/5** casos falham em `30232e9c` |

### Arquivos

- `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx`
- `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/StepResumo.tsx`
- `apps/landing/test/checkout-dec0803-select-parcelas.test.tsx` (novo, 5 casos)
- `apps/landing/test/checkout-dec0729-pagar.test.tsx`, `checkout-ckux-rev-cotacao.test.tsx`,
  `checkout-fixes-steps.test.tsx`, `checkout-s1209-cupom-forma.test.tsx`,
  `checkout-s1216-totais-discriminados.test.tsx`, `cupom-link-s1215.test.tsx` (ajuste)

### Supersede registrado

`T-CKUX-1` (coalescing) media chamadas **cruas**. Com uma segunda pergunta legítima no
ar, contar chamadas confundiria "pediu duas vezes a mesma coisa" (o que a lane proíbe)
com "pediu duas coisas diferentes uma vez cada". A régua passou a ser a **assinatura do
pedido**: nenhuma assinatura sai duas vezes, e a pergunta da seleção visível sai
exatamente uma vez. É um teste mais forte que o anterior, não mais frouxo.

### Premissas vetáveis

3. **Custo:** o PAGAR passou a fazer **duas** cotações por base de preço (a visível + a
   escada do cartão). Ambas read-only. A alternativa sem custo seria abrir o painel do
   cartão com o select em estado de cálculo — foi o que o dono reprovou.
4. **Corrida residual:** quem clicar em "Cartão de crédito" nos primeiros ~250 ms da
   chegada ao PAGAR ainda vê "Calculando as opções de parcelamento…". Honesto, mas não é
   "nasce completo". Fechar isso exigiria pré-carregar já na etapa de DADOS — o que
   colocaria duas chamadas na janela que a T-CKUX-1 acabou de limpar.

---

## C3-0803 · estados do PIX na ordem do dono — PAGA

**Commit:** `PENDENTE` · `fix(checkout): a cobranca PIX nasce no clique, com o loader do dono [leela-build-2d6ee98d]`

### O que estava errado

Duas coisas, na mesma tela:

1. **A cobrança nascia sem clique.** A auto-geração (A-3) chamava
   `createInscricaoCharge` num efeito, assim que `step === 2 && forma === 'pix' &&
   aceitesOk`. Ela nasceu quando os aceites ainda eram marcados NESTA tela — havia um
   gesto humano deliberado logo antes. A S1217-T1 (RN-438) mudou o chão levando os
   aceites para a etapa anterior; desde então o único gesto entre chegar e criar cobrança
   era ESCOLHER o meio.
2. **A espera tinha o nome errado.** `criandoCharge` entrava em `emVoo`, e `emVoo`
   acendia o bloco "Processando pagamento" (DEC-0727). Gerar o código PIX não é pagar: a
   tela anunciava dinheiro em trânsito antes de existir pagamento nenhum.

`createInscricaoCharge` grava pedido, pagamento e inscritos como PENDENTES antes de falar
com o gateway, recomputa contadores do evento no caminho e cria cobrança real no provedor.

### O que passou a valer

- A auto-geração saiu. **RN-440 + C3-0803:** chegar não cria nada; escolher também não.
- O clique em "Gerar código PIX" mostra um loader `role="status"` com a mensagem exata
  **"Preparando código PIX"**, e o código aparece na sequência.
- **"Processando pagamento" fica onde é verdade:** teto de 15s estourado
  (`gatewaySemResposta`), confirmação do pagamento em voo (`confirmando`, PIX e cartão) e
  criação da cobrança **no cartão** — ali criar É pagar, porque `pagarCartao` encadeia
  criação e confirmação num gesto só.
- A copy antes do clique parou de afirmar preparação em curso ("Estamos preparando o
  código PIX…" → "Ao clicar abaixo, geramos o código PIX de R$ X à vista").
- `gerarCobranca` foi partido em `criarCobranca` (produtor de escrita, sem o atalho de
  cache) e `gerarCobranca` (com o atalho). O recomeço da RN-157 ("Gerar nova cobrança")
  zera `charge` e chama `criarCobranca` no mesmo gesto — sem a separação, a closure leria
  o `charge` antigo e devolveria a cobrança morta. Um clique, uma cobrança nova.

### Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (landing) | 0 erros |
| `eslint app lib --max-warnings 0` | 0 |
| Suíte da landing (processo único) | **443/443** (40 arquivos) |
| Regressão reprova a versão anterior | **6/9** casos do arquivo novo falham em `b29e9719` |

### Falsificações (dinheiro)

| Vetor | Resultado |
|---|---|
| Selecionar PIX + 500 ms ⇒ `createInscricaoCharge` **não** chamado | PASS |
| Clicar em "Gerar código PIX" ⇒ chamado **1×**, com `forma: 'pix', parcelas: 1` | PASS |
| Sair do PAGAR e voltar com PIX escolhido ⇒ nenhuma cobrança | PASS |
| Teto de 15s na criação do PIX ⇒ "Processando pagamento" (não "Preparando") | PASS |
| "Já paguei — confirmar" em voo ⇒ "Processando pagamento" | PASS |
| Cartão: criação em voo ⇒ "Processando pagamento" | PASS |
| Cotação nova em voo ⇒ botão "Gerar código PIX" desabilitado e clique sem efeito | PASS |

### Arquivos

- `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx`
- `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/StepPagamento.tsx`
- `apps/landing/test/checkout-dec0803-pix-estados.test.tsx` (novo, 9 casos)
- Helpers de 6 arquivos passaram a dar o clique: `checkout-asaas-teto`,
  `checkout-s1209-cards-atleta`, `checkout-s1209-rev-ataque`,
  `checkout-s1217-aceites-inscricao`, `checkout-s1217-termo-saude-custom`,
  `checkout-s1217-versao-exibida`

### Supersedes registrados

- `S1217-T2 · "escolher PIX gera a cobrança sem clique extra (o ganho da A-3 continua
  inteiro)"` — o contrato virou o oposto por decisão do dono. O caso foi reescrito e
  ganhou um irmão que prova a ausência da auto-geração com janela generosa.
- `ACHADOS-REV · vetor 10` — a segunda metade ("o código nasce quando o total chega")
  virou "o botão destrava quando o total chega, e é o clique que cria". A guarda que o
  vetor protege continua medida, agora também pelo estado do botão.
- `DEC-0727 · "a espera longa também é 'processando pagamento'"` — o caso do PIX foi para
  o cartão (onde criar é pagar) e ganhou um irmão exigindo "Preparando código PIX" no
  PIX. Nenhuma cobertura foi perdida.

### Premissas vetáveis

5. **"Gerar nova cobrança" (PIX expirado) cria a cobrança no próprio clique**, sem passar
   pelo botão "Gerar código PIX" de novo. Leitura: o botão promete uma cobrança nova, e
   dois cliques para a mesma decisão seria a queixa do dono ao contrário.
6. **A copy do estado sem cobrança mudou** ("Ao clicar abaixo, geramos o código PIX de
   R$ X à vista"). É texto de tela do dinheiro — cabe veto.
