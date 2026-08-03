---
tags: [leela, rodada, spec, checkout, taxa, parcelamento, aceites]
aliases: ["SPEC-ACHADOS-0802 · decisões e premissas", "D-ACH-1..D-ACH-14"]
trace: leela-build-2d6ee98d
lote: SPEC-ACHADOS-0802
data: 2026-08-02
---

# Cálculo, taxas, parcelas e aceites · decisões da spec

Delta de spec dos quatro achados da DEC-0802B que mexem em regra: **B1** (o total tem de estar
pronto quando o comprador chega ao pagamento), **B2** (taxa de serviço explícita e discriminada),
**B5** (parcelas simuladas a 2,89% a.m.) e **B6** (os dois aceites migram do PAGAR para a
INSCRIÇÃO). Zero código de aplicação nesta rodada. RNs em `05-rns-achados.md`, o B10 em
`06-spec-produtor-page.md`, fila de build em `07-fila-achados.md`.

## O que o inventário mudou no enunciado

Cinco fatos lidos no repositório antes de qualquer proposta. Três deles encolhem o trabalho, dois
o aumentam.

**O motor de juros já existe e está desligado.** `buildInstallmentOptions`
(`packages/core/src/finance/calc.ts:73`) já lê `jurosAoMes` de `installmentRules`, o campo já é
editável no painel da plataforma (`TermsEditor.tsx:273-282`) e o seed grava `jurosAoMes: 0`
(`commercialTerms.seed.ts`). Simular o painel configurado a 2,89% não pede máquina nova: pede um
número. O que pede código é o que o inventário achou junto, e está no D-ACH-6.

**A taxa de serviço não está escondida por descuido: ela não existe para o comprador do
meia-floripa.** O evento roda em `taxaModo: 'incorporada'`, então `taxaServico` volta zero da
cotação e a linha do resumo não é renderizada (`StepResumo.tsx:283`). O comprador paga o preço de
face; os 10,5% saem do repasse do organizador. O achado do dono está certo, mas o defeito não é
"a taxa sumiu": é que **o resumo cala nos dois modos, e no modo incorporada o silêncio parece
omissão**. Isso é o item 61 do painel visto do lado do comprador.

**O total por opção de meio já é entregue pelo servidor e quase nunca aparece.** O
`totaisPorMeio` da RN-180 chega na cotação, mas o rótulo do `RadioCard` só o exibe quando os dois
totais **diferem** (`StepResumo.tsx:89`). Em taxa incorporada eles nunca diferem. O dono testou
exatamente o caso em que a feature inteira fica invisível.

**A prova de aceite é independente da tela, e isso torna o B6 barato.** O carimbo lê a versão e o
hash do material dentro da transação da compra (`createInscricaoCharge.ts:1516-1545`); o cliente
só manda dois booleanos. Mover os checkboxes de etapa não toca uma linha do carimbo. O que a
migração toca são **oito gates de interface** e um efeito que ninguém esperava (D-ACH-11).

**Dois defeitos vivos apareceram no caminho, e nenhum dos dois é do escopo pedido.** O servidor
exige `aceites.saudeCustom === true` quando o evento tem termo de saúde próprio ativo
(`createInscricaoCharge.ts:1367`), e a tela **nunca coleta nem envia esse campo**
(`CheckoutFlow.tsx:784` manda só `{termos, saude}`): qualquer evento com termo custom hoje
falha no pagar, sempre. E a prova de aceite não guarda endereço de origem nem agente do
navegador. Os dois entram na fila porque a lane do B6 é a única que vai abrir esse arquivo.

---

## Parte A · O total pronto na chegada (B1)

### D-ACH-1 · A cotação começa na etapa de dados, não na de pagamento ⇒ RN-434

Hoje o gatilho é `precisaCotar = step >= 2` (`CheckoutFlow.tsx:439`). O primeiro pedido de preço
sai no instante em que a pessoa entra no PAGAR, e ela assiste ao round-trip. Medido em produção
pela própria lane anterior: de 1,7 s no piso a 9,8 s quando a function acorda fria.

O gatilho passa a ser `step >= 1`. Quando a pessoa termina a escolha de modalidade e kit e entra
nos dados, a cotação sai. O preenchimento de nome, CPF, nascimento e endereço de cada
participante leva dezenas de segundos; o round-trip cabe inteiro nessa janela, inclusive o
despertar frio. Ao chegar no PAGAR a assinatura não mudou, então o efeito cai no ramo de
`assinaturaCotadaRef.current === assinaturaAtual` e **nenhuma chamada nova sai**: o número já
está na tela.

Cotar já no step 0 foi rejeitado. A assinatura de preço inclui `selecaoSig`, que muda a cada
clique em modalidade ou kit; cotar ali transformaria a exploração da oferta numa sequência de
chamadas, que é justamente o excesso que a T-CKUX-1 acabou de cortar. O step 1 é o primeiro
momento em que a seleção está congelada: só o "Alterar" do resumo volta atrás, e ele é
deliberado.

O custo é uma cotação a mais por sessão que abandona no preenchimento. É uma callable de leitura,
sem escrita, sem coleção nova, e cabe no free tier com folga.

### D-ACH-2 · O pré-aquecimento é silencioso, e a espera continua honesta quando existir

Não nasce indicador novo. No step 1 não há bloco de totais, então `cotando` alto é invisível, e
essa invisibilidade é a feature. Se a cotação falhar ali, a tela **não** mostra erro no meio do
formulário: o estado de erro continua morando no bloco de totais do PAGAR, com o "Tentar
novamente" que já existe (BC-1). Falhar cedo e avisar cedo puniria a pessoa por um problema que
ela ainda não tem.

Quando o número **não** estiver pronto na chegada, por rede lenta ou por troca de seleção no
caminho, nada muda: "Calculando o total…" e o botão em "Atualizando o total…" continuam sendo a
resposta. O B1 encurta a espera; não promete que ela deixou de existir.

### D-ACH-3 · O que o B1 responde do item 62 do painel

O item 62 pergunta se vale pagar `minInstances` para o checkout ficar sempre quente. O default
registrado é "primeiro pagar a tarefa de código e medir". Esta decisão **é** essa tarefa: o
despertar frio deixa de acontecer na frente do comprador e passa a acontecer enquanto ele digita
o CPF. Só depois de o B1 estar no ar é que a pergunta do dinheiro volta a fazer sentido, com
medida em vez de estimativa.

Uma parte do item 62 continua aberta e não é desta spec: a `cotarInscricaoCheckout` é chamada
mais de uma vez por interação quando o cupom entra por fora do efeito. Ver D-ACH-4.

### D-ACH-4 · O caminho do cupom entra no mesmo número de sequência ⇒ RN-434

A ressalva R-2 da CKUX-REV está escrita: `aplicarCupom` cota por fora do efeito e escreve
`cotacao`/`assinaturaCotadaRef` na volta, usando a assinatura da closure. Trocar de kit enquanto o
cupom está no ar faz a resposta do cupom aterrissar sobre a seleção nova.

Com o B1, o cupom passa a ser aplicável em duas etapas com o pré-aquecimento rodando ao lado, e a
janela do R-2 fica maior. A decisão é fechá-la agora, com a peça que já existe: os dois caminhos
manuais (`aplicarCupom` e o auto-apply da URL) passam pelo mesmo `cotacaoSeqRef`, e resposta
obsoleta é descartada pela mesma regra. Não é feature; é a extensão de uma guarda que a lane
anterior escreveu para o efeito e não estendeu aos vizinhos.

---

## Parte B · A taxa que aparece (B2)

### D-ACH-5 · O resumo declara a composição do total nos dois modos de taxa ⇒ RN-435

O bloco de totais passa a ter esta forma, sempre na mesma ordem, com cada linha aparecendo só
quando tem o que dizer:

```
Subtotal                          R$ ___
Desconto                        − R$ ___     (só com cupom aplicado)
Taxa de serviço (PIX|cartão)      R$ ___     (modo repassada)
Taxa de serviço                   inclusa    (modo incorporada, sem valor)
Juros do parcelamento             R$ ___     (só quando > 0 — ver D-ACH-8)
Total                             R$ ___
```

Três decisões dentro dela.

**A taxa ganha o nome do meio quando é repassada.** "Taxa de serviço (PIX)" e "Taxa de serviço
(cartão)" dizem, na própria linha, o que o dono pediu: que ela varia conforme a forma de
pagamento. Hoje o rótulo é mudo e a variação só aparece se a pessoa trocar de opção e comparar
dois totais que já sumiram da tela.

**No modo incorporada a linha existe e não tem valor.** O texto é "inclusa no valor", e é a
verdade literal: o comprador não paga nada além do preço de face, e o que a plataforma cobra sai
do repasse do organizador. Exibir "R$ 0,00" seria mentira por outro caminho, porque sugere que a
taxa não existe. Exibir o valor real seria vazar o termo comercial do organizador, que a regra de
confidencialidade proíbe desde o `703db9c`. Dizer "inclusa" é o único enunciado que é verdadeiro
para o comprador e mudo sobre o contrato de terceiro.

**Percentual continua proibido em toda superfície pública.** Só valores em reais. A regra está
escrita no topo da `cotarInscricaoCheckout` e não é afrouxada por esta spec em nenhum ponto.

### D-ACH-6 · O total de cada opção aparece sempre que houver opção ⇒ RN-435

A condição de exibir o total dentro do rótulo do `RadioCard` deixa de ser "os totais diferem" e
passa a ser "os dois totais existem". Quando forem iguais, as duas opções mostram o mesmo número,
e isso é informação, não ruído: o comprador aprende que a escolha do meio **não** muda o que ele
paga. Foi exatamente essa a dúvida que o dono levantou olhando um evento de taxa incorporada.

Quando a derivação do meio alternativo falhar, o rótulo daquela opção volta ao texto genérico,
sem número. Falha parcial nunca derruba a opção principal, que é o comportamento que a RN-180 já
tem.

### D-ACH-7 · A nota do step 0 passa a valer nos dois modos

A frase condicional de hoje ("Este evento repassa a taxa de serviço…", `StepModalidadeKit.tsx:165`)
só existe em modo repassada. Ela ganha a contraparte: em modo incorporada, uma linha curta diz que
não há taxa adicional e que o valor exibido é o valor final. Uma frase, dois ramos, o mesmo lugar.

---

## Parte C · As parcelas com juros (B5)

Tudo nesta parte é premissa do dono e está marcado como vetável na tabela do fim. A configuração
real do painel administrativo, com a tabela de juros negociada por organizador, **não é
construída aqui**: vira épico futuro, nomeado em `07-fila-achados.md`.

### D-ACH-8 · 2,89% a.m. é configuração do termo, nunca constante no código ⇒ RN-436

O número entra em `installmentRules.jurosAoMes` do `commercialTerms` do tenant, que é onde ele já
mora. O seed de referência passa a gravar 2,89 no lugar de 0, e o `DEFAULT_COMMERCIAL_TERMS`
acompanha. Nenhuma linha de cálculo ganha um literal `2.89`.

Isso importa por um motivo prático: quando o dono vetar o número, ou quando a tabela real por
organizador nascer, a mudança é de dado. E importa por um motivo de prova: o congelamento da
RN-179 já existe para a taxa, e o mesmo raciocínio vale aqui — pedido criado sob uma regra de
juros não é reprecificado quando a regra muda.

**Conflito resolvido de frente.** O core documenta hoje, em dois lugares
(`packages/core/src/pedidos/pagamento.ts:21-23` e `functions/src/seed/pedidos.seed.ts:50`), uma
decisão de 2026-07-05 fixando **3,49% a.m.**, tabela Price, repassados ao comprador. O 2,89% do
dono **supersede** esse número. Os dois comentários são corrigidos na mesma aterrissagem, porque
documentação que contradiz a regra vigente é a próxima armadilha de quem for mexer nisso.

### D-ACH-9 · O cálculo é Price de verdade, e 1x nunca tem juros ⇒ RN-436

O que `calc.ts:83` faz hoje é `valorTotal = valor × (1 + j)^n` e `valorParcela = valorTotal / n`.
Isso não é tabela Price: é o principal corrigido pelo juro composto do prazo inteiro, sem
amortização, dividido em partes iguais. A diferença não é acadêmica. Com R$ 300 e 2,89% a.m. em
12x, o modelo de hoje cobra **R$ 422,28**; a tabela Price cobra **R$ 359,28**. São 17,5% de
diferença na tela do dinheiro, contra o comprador. (Números corrigidos em 03/08 pela
ACHADOS-0802/REV: a primeira versão desta spec trazia 422,03/359,90 por erro aritmético; o
código implementa a fórmula e o teste asserta o valor medido.)

A regra passa a ser a tabela Price, na forma canônica:

```
parcela = PV × i ÷ (1 − (1 + i)^−n)        para n ≥ 2
total   = parcela × n
```

E `n = 1` tem fator 1, sempre. Price puro cobraria um mês de juros na parcela única, porque a
fórmula assume pagamento ao fim do período; no cartão à vista o pagamento é agora. Sem essa
exceção, a opção "À vista" do cartão nasceria 2,89% mais cara que o PIX e o rótulo estaria
mentindo, que é o defeito que o próprio contrato da cotação já registra como conhecido
(`cotarInscricaoCheckout.ts:120-125`). Com ela, "à vista" volta a significar à vista, e
`totalAVista` volta a ser igual a `opcoesParcelamento[0].valorTotal` — dois números que hoje
divergiriam na mesma tela assim que os juros fossem ligados.

O arredondamento é em centavos inteiros, meio para cima, o mesmo da RN-183: arredonda-se a
**parcela**, e o total é a parcela multiplicada pelo número de parcelas. A ordem importa. Como o
adapter manda `installmentCount` + `totalValue` e deixa o Asaas dividir
(`asaasProvider.ts:866-881`), um total que é múltiplo exato da parcela faz a divisão do gateway
cair no mesmo número que a tela mostrou. Hoje, com o total arredondado primeiro, o Asaas pode
devolver centavos diferentes do que o comprador leu.

A fonte continua única: `buildInstallmentOptions` no core, chamada só pelo `computeSaleState`,
com o cliente renderizando o array. Nenhuma aritmética de dinheiro entra na interface.

### D-ACH-10 · O juro do parcelamento não é receita do organizador ⇒ RN-437

Isto é ratificação, não invenção: `computeLiquidoProdutor` calcula sobre `valorFinal`, o ledger
usa `valorFace`, e a comissão de afiliado incide sobre o face pela P-TAXAFLEX-3. Nenhum dos três
enxerga o juro. O organizador recebe o mesmo quer a pessoa pague à vista ou em 12x, e o afiliado
comissiona o mesmo.

Ficava implícito porque `jurosAoMes` era zero e o caso nunca acontecia. Com o número ligado, a
propriedade passa a valer dinheiro e precisa estar escrita, com prova no build.

O juro entra em `totalCobrado`, que é o valor mandado ao gateway, e vira uma linha própria no
resumo (D-ACH-5). Não existe caminho em que ele se disfarce de "total" sem nome.

---

## Parte D · Os aceites na inscrição (B6)

### D-ACH-11 · Os dois aceites vão para o fim da etapa de dados ⇒ RN-438

Supersede a decisão de 2026-07-18 registrada na CKFORM §5.3 ("aceites no PAGAR, acima do botão de
pagar"). O veto do dono foi colhido e é explícito: **ambos**, termos de uso e declaração de saúde,
saem do pagamento.

O destino é o fim do step 1, não o step 0. Três razões. A declaração de saúde é sobre as pessoas
inscritas, e é no step 1 que elas são identificadas com nome, CPF e nascimento. O aceite passa a
gatear o `avancar()` do step 1, então chegar ao PAGAR já significa aceite dado, e a etapa de
pagamento fica com o que é de pagamento. E o step 0 é a etapa de exploração da oferta, onde a
pessoa troca de kit três vezes; pedir assinatura antes de ela ter decidido o que está comprando
inverte a ordem da decisão.

O bloco `AceitesCompra` muda de lugar, não de conteúdo: os mesmos dois checkboxes, os mesmos dois
modais de leitura, os mesmos rótulos de versão. O gate visual continua sendo o mesmo padrão de
constraint que existe hoje, agora sobre o "Continuar" em vez de sobre o botão de pagar.

O que **não** muda, e é o coração da regra: o servidor continua recusando `createInscricaoCharge`
sem os dois booleanos (flip F-4a), o carimbo continua sendo feito na transação da compra com a
versão e o hash lidos ali dentro, e o cliente continua sem canal para forjar versão ou antedatar
aceite. A coleta muda de etapa; a prova continua nascendo no ato do dinheiro.

Depois de a cobrança existir, os checkboxes continuam travados. Como agora eles vivem numa etapa
para a qual a pessoa pode voltar, o travamento passa a valer também no retorno: `charge !== null`
desabilita o bloco onde quer que ele seja renderizado. É a ressalva R-3 da CKUX-REV mantida de pé
num fluxo que ganhou uma porta a mais.

### D-ACH-12 · Nenhuma cobrança nasce sem escolha de meio ⇒ RN-440

Este é o efeito colateral que a migração produz e que é preciso decidir de propósito.

A auto-geração do PIX (A-3) dispara quando `step === 2 && forma === 'pix' && aceitesOk && ...`.
Hoje os aceites são o último gesto humano antes disso, e é por isso que ninguém nota: a cobrança
nasce porque a pessoa marcou dois checkboxes na tela de pagar. Com os aceites recolhidos na
inscrição e `forma` já valendo `'pix'` por default, **entrar na tela de pagamento passa a criar
uma cobrança sozinho** — antes de a pessoa olhar o total, antes de ela escolher como quer pagar.

Não é um detalhe de UX. O `createInscricaoCharge` grava pedido, pagamento e inscritos como
pendentes **antes** de chamar o gateway (`createInscricaoCharge.ts:1746-1752`), e os gatilhos de
estoque e demografia recomputam os contadores do evento no caminho. Cada chegada ao PAGAR viraria
uma inscrição pendente e uma cobrança real no Asaas, para quem só queria ver o preço.

A decisão é tirar a pré-seleção: **a forma de pagamento nasce sem escolha**. O PIX é gerado quando
a pessoa seleciona PIX, que é um ato deliberado e único, e o ganho do A-3 continua inteiro (o QR
aparece sem clique extra depois da escolha). O cartão já era assim, porque o pagamento dele exige
o botão.

Sem meio escolhido, o resumo continua tendo o que mostrar: o pré-aquecimento do B1 cota assumindo
PIX à vista, o bloco de totais exibe essa composição, e cada opção carrega seu total no rótulo
pela D-ACH-6. A pessoa vê os dois preços antes de decidir, que é melhor do que a tela de hoje.

A alternativa considerada foi manter a pré-seleção e exigir de novo o clique em "Gerar código PIX"
quando o aceite veio de outra etapa. Caiu por reintroduzir o clique que a A-3 tinha eliminado, e
por criar uma regra condicional ("auto-gera só se o aceite foi nesta tela") que ninguém consegue
manter viva.

### D-ACH-13 · O aceite carrega a versão que a pessoa viu ⇒ RN-439

Hoje a distância entre marcar o checkbox e carimbar a prova é de segundos. Depois do B6 ela passa
a ser de minutos, porque no meio cabem o preenchimento do endereço e a escolha do meio.

A janela nova tem uma consequência real: o organizador pode publicar uma versão nova da política
de vendas enquanto a pessoa preenche. O `materialHash` da correção F-1 garante que a prova aponta
o material que o **servidor** leu na transação; ele não garante que esse material é o que a
**pessoa** leu. Com segundos de janela isso era desprezível. Com minutos, não é.

A regra passa a ser: a tela envia, junto dos booleanos, a versão que ela exibiu; o servidor
compara com a vigente na transação; divergência recusa a compra com um motivo próprio, e a tela
repõe o aceite com o texto novo, explicando em uma frase. Nada é carimbado sob material que a
pessoa não viu.

O custo é um campo no input e uma comparação dentro de uma transação que já lê o documento da
política. A alternativa é o comportamento de hoje, que carimba a vigente em silêncio, e ela fica
registrada como premissa vetável.

### D-ACH-14 · Dois defeitos vizinhos que esta lane é a única a poder fechar

**O termo de saúde custom é exigido e nunca coletado ⇒ RN-441.** O servidor lança
`failed-precondition` quando o evento tem termo próprio ativo e o input não traz
`aceites.saudeCustom === true` (`createInscricaoCharge.ts:1367-1373`). A tela não tem esse
checkbox e o `CheckoutFlow` manda `{ termos: true, saude: true }` fixo. Todo evento com termo
custom ativo está com a compra quebrada, hoje, por construção. O bloco de aceites ganha o terceiro
checkbox condicional, com o mesmo padrão de modal e versão dos outros dois, e o payload passa a
refletir o que a pessoa marcou em vez de afirmar `true` literal.

**A prova de aceite não registra a origem ⇒ RN-442.** Não há endereço de origem nem agente do
navegador em nenhum ponto da cadeia; `context.rawRequest` está disponível na callable e não é
lido. Para um termo de isenção de responsabilidade por lesão, isso é fragilidade probatória — e o
B6 aumenta a distância entre o gesto e o carimbo, que é justamente o que uma contestação
exploraria. Os dois campos passam a ser gravados no bloco de aceites do pedido, pelo servidor,
sem participação do cliente. É dado pessoal, com base legal na prova do aceite e na execução do
contrato, retido pelo mesmo ciclo do pedido.

---

## Premissas assumidas, vetáveis (maior peso primeiro)

| # | Premissa | Custo de vetar depois | RN |
|---|---|---|---|
| P1 | O parcelamento passa a usar tabela Price de verdade, no lugar do composto simplificado de hoje | Volta a diferença de 17% em 12x, e o "à vista" do cartão volta a divergir do `totalAVista` | RN-436 |
| P2 | A parcela única do cartão não tem juros | "À vista" do cartão fica 2,89% acima do PIX com o mesmo rótulo, e o resumo passa a ter dois "à vista" diferentes | RN-436 |
| P3 | Nenhuma forma de pagamento vem pré-selecionada; o PIX nasce na escolha | Ou volta o clique manual em "Gerar código PIX", ou toda chegada ao pagamento cria pedido pendente e cobrança no gateway | RN-440 |
| P4 | Os dois aceites vão para o fim da etapa de dados, não para a de modalidade e kit | Refazer o gate do `avancar` e o lugar do bloco; a decisão de qual etapa é "a inscrição" muda a tela toda | RN-438 |
| P5 | 2,89% a.m. supersede os 3,49% documentados em 2026-07-05 no core | Reconciliação de novo, com dois comentários do core apontando para a regra errada | RN-436 |
| P6 | Divergência de versão do termo entre a inscrição e a compra recusa a compra | Volta o carimbo silencioso da vigente, com a janela agora medida em minutos | RN-439 |
| P7 | Em taxa incorporada o resumo diz "inclusa no valor", sem número | Volta o silêncio de hoje, que foi o que o dono reclamou | RN-435 |
| P8 | O juro fica com a plataforma: não entra no repasse do organizador nem na base de comissão | Mexe em `computeLiquidoProdutor`, no ledger e na RN-310, tudo em área de dinheiro | RN-437 |
| P9 | A cotação começa no step 1; o step 0 continua sem cotar | Ou a espera volta para a tela de pagamento, ou a exploração de kits vira uma chamada por clique | RN-434 |
| P10 | A prova de aceite passa a guardar endereço de origem e agente do navegador | Perde-se o reforço probatório; nada mais quebra | RN-442 |
| P11 | O total de cada opção aparece mesmo quando os dois são iguais | Volta o rótulo mudo justamente no caso do meia-floripa | RN-435 |
| P12 | O terceiro aceite (termo custom) entra no mesmo bloco, condicional ao evento | O defeito de `failed-precondition` continua vivo em todo evento com termo próprio | RN-441 |
| P13 | O 2,89% entra como dado do `commercialTerms`, sem literal no código | Vira constante, e a tabela real por organizador nasce como reescrita | RN-436 |
| P14 | Os dois caminhos manuais de cupom passam a respeitar o número de sequência da cotação | A ressalva R-2 fica aberta com janela maior do que a que a CKUX-REV mediu | RN-434 |

As seis primeiras mudam desenho se caírem. As outras oito podem ser vetadas sem refazer a spec.

## Dependências e o que fica fora

- **Sequenciamento obrigatório.** A `PIXFIX-EXTREF` mexe em `functions/src/checkout/` e a
  `KITCUPOM-BUILD` (frente B) mexe em `StepResumo.tsx` e em `[eventSlug]/sections/`. As duas
  precisam aterrissar antes da ACHADOS-0802. Detalhe por arquivo em `07-fila-achados.md`.
- **Fora desta spec:** a tela de configuração real de juros por organizador (o `TermsEditor` já
  tem o campo; o que falta é a tabela negociada, que vira épico futuro); a resposta do item 62
  sobre `minInstances`, que só volta depois de o B1 estar medido no ar; o painel
  `DECISOES-ABERTAS.md`, que é do maestro; e o B10, que tem spec própria.
- **Vocabulário.** Toda superfície tocada aqui segue a D-0802-1: experiência e participante,
  corrida nunca como categoria.
