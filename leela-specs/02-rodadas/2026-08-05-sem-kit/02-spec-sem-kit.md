---
tags: [leela, spec, rodada, kit, sem-kit, preco-negativo, checkout, rules]
trace: leela-pixreal-diag-20260804
lote: SPEC-SEM-KIT
data: 2026-08-05
---

# 02-spec · o kit não vende desconto

> Apuração da lane SPEC-SEM-KIT. A decisão e o verbatim estão em `01-decisoes-dono.md`; o delta de
> regra em `03-rns-delta.md`; a fila em `04-fila-codigo.md`.
>
> Toda afirmação sobre o repositório tem caminho e linha, e foi lida nesta lane. Onde a apuração
> não conseguiu medir, está escrito que não conseguiu.

## Parte 0 · o que a regra revogada realmente sustenta hoje

Antes de tirar a RN-211, vale saber quanto peso ela carrega, porque "aceita preço negativo" está
escrito em mais lugares do que parece e nem todos significam a mesma coisa.

**Onde ela é enunciado.** [[LEELA-E03-operacao-evento]]`:49` (épico dono, faixa 200-236),
[[LEELA-E09-financeiro-profissional]]`:39`, [[LEELA-E12-landing]]`:42` e
[[LEELA-E13-app-atleta]]`:60`. Os três últimos são cópias herdadas na seção "Regras de negócio
aplicáveis" — a ambiguidade entre definir e herdar é conhecida e está registrada no
[[indice-de-regras-de-negocio]].

**Onde ela é código.**

| Lugar | O que faz | Depois da RN-506 |
|---|---|---|
| `packages/core/src/eventos/kit.ts:113-116` `precoKitValido` | aceita qualquer número finito | vira o predicado de **leitura** (Postel), e ganha um irmão de escrita |
| `packages/core/src/eventos/kit.ts:118-121` `kitEhDesconto` | `preco < 0` | fica, sem chamador de produto; é o detector do legado |
| `packages/core/src/checkout/saleState.ts:230-245` `guardPrecoNaoNegativo` | recusa item cujo lote + kit dê negativo | fica; deixa de ter causa viva e vira defesa do legado |
| `firestore.rules:959-966` `shapeKitValido` | exige `preco is number`, **sem piso e sem `moneyCentExato`** | ganha as duas condições que o lote já tem (`:1060-1061`) |
| `packages/api-client/src/eventos/kits.ts:57` `SalvarKitInput` | comentário *"Aceita negativo"* | comentário e contrato mudam; **não é gate** |
| `StepModalidadeKit.tsx:15-20` e `KitsSection.tsx:8-13` `labelDeltaKit` | ramo `preco < 0` → "Desconto R$ X" | ramo fica enquanto houver documento legado |

**Duas medições que mudam o tamanho do problema.**

A primeira: **`salvarKit` é escrita direta do cliente**, `setDoc` com merge em
`eventos/{id}/kits/{kitId}` (`packages/api-client/src/eventos/kits.ts:85-109`), com zero validação.
**Nenhuma Cloud Function cria ou atualiza kit** — as quatro que tocam kit só leem
(`createInscricaoCharge.ts:922`, `aggregateProfessionalDashboard.ts:97`, `itemKitIndex.ts:52,84`).
Logo o `SalvarKitInput` é tipo TypeScript, e tipo TypeScript não recusa payload; quem montar a
chamada à mão fala direto com a Rule. **A Rule é a única fronteira real**, e é por isso que a
RN-506 mora lá antes de morar em qualquer outro lugar.

E ela tem uma segunda lacuna que a apuração encontrou de graça: `shapeKitValido` não aplica
`moneyCentExato`, que o **lote** aplica (`firestore.rules:1060-1061`). Hoje `preco: 75.001` e
`Infinity` passam pela Rule do kit, porque `is number` é verdadeiro para float infinito. O kit
passa a espelhar o lote nas **duas** condições, não só no piso.

A segunda: **nenhum agregado financeiro deriva dinheiro do preço do kit.** `agregarFinanceiro`
declara isso por escrito — *"esta Function NUNCA inventa receita a partir de contagem × preço de
kit"* (`functions/src/eventos/agregarFinanceiro.ts:24-25`) — e lê `eventos.receitaConfirmada`, que
nasce no fluxo de pagamento. Consequência prática: **proibir preço negativo não reescreve nenhum
número de receita já apurado**, em nenhum evento, com ou sem venda. O que já foi cobrado continua
sendo o que foi cobrado.

## Parte 1 · as duas coisas chamadas "sem kit", e por que confundi-las quebra o balcão

Este é o principal risco desta rodada, e ele não é hipotético: as duas coisas se escrevem quase
igual em português e a lane de build vai encontrar as duas no mesmo grep.

### O que morre · o kit vendável chamado "Sem kit"

Um documento em `eventos/{eventoId}/kits/{kitId}` com `nome: "Sem kit"` e `preco` abaixo de zero.
É um kit como qualquer outro: aparece no `RadioGroup` do checkout, entra em `kitsDaModalidade`,
tem capacidade, tem modalidades, tem id. A única coisa que o distingue de um Kit Ouro é o sinal do
número. É isso, e só isso, que a RN-506 elimina.

### O que fica · o valor `sem_kit` do enum `KitInscrito`

`packages/core/src/eventos/inscrito.ts:41` define
`type KitInscrito = 'kit_ouro' | 'kit_prata' | 'kit_basico' | 'sem_kit'`, e a RN-202 é quem manda
nisso. **`sem_kit` é rótulo de fallback, não oferta.** `kitEnumFromId`
(`checkout/tipos.ts:66-72`) devolve `sem_kit` em dois casos distintos que ele deliberadamente não
distingue: kit fora do conjunto canônico do seed, e ausência de kit. O preço **nunca** depende
deste rótulo; ele vem do core pelo `kitId` real, e o comentário no próprio arquivo diz isso.

**Cinco superfícies vivas dependem do valor `sem_kit` existir.** Nenhuma delas tem a ver com
desconto:

| Superfície | Caminho | O que quebra se o valor sumir |
|---|---|---|
| Stepper do credenciamento | `packages/core/src/eventos/entrega.ts:36-46` | `kitJaConcluido` deixa de reconhecer quem não tem kit a retirar |
| Registro de entrega | `AtendimentoPanel.tsx:121-123` | `kitEntregueEm` passa a ser carimbado para quem não retirou nada |
| Denominador do balcão | `_lib/balcao.ts:130, 148` | "confirmados com kit a retirar" passa a contar todo mundo |
| Checklist do balcão | `_lib/balcao.ts:247, 258` | lista itens para quem não tem kit |
| Rótulo e financeiro | `_lib/kitLabels.ts:19-24`, `porKit.sem_kit` | rótulo sem entrada e chave de agregado órfã |

**Uma modalidade que não oferece kit nenhum é caso legítimo e permanece.** O checkout já tem o ramo
pronto (`StepModalidadeKit.tsx:251-257`), o inscrito nasce com `sem_kit`, o balcão trata, o
aprovisionamento ignora. Nada disso é o kit de desconto e nada disso muda.

**A regra é a RN-507**, e ela existe por uma razão operacional: sem ela, a tarefa "tirar o Sem kit
do produto" tem duas leituras, e a leitura errada apaga o enum e derruba o credenciamento no dia da
prova. A fila carrega um teste que fixa o valor vivo (`04-fila-codigo.md`, tarefa 1d), justamente
para que a leitura errada fique vermelha.

## Parte 2 · a consequência de fluxo, que o dono precisa ver escrita

### Escolher kit já é obrigatório, e a lane anterior não sabia disso

A apuração encontrou o gate onde ele está: `CheckoutFlow.tsx:1706-1715`.

```
// Modalidade e kit: modalidade obrigatória; kit obrigatório SE a
// modalidade ofertar kits (RN-210). Modalidade sem kits segue sem kit.
...
const ofertados = kitsDaModalidade(evento.kits, ins.modalidade);
return ofertados.length > 0 && ins.kitId.length === 0 ? 'Escolha um kit.' : undefined;
```

**A etapa nunca teve saída.** Onde a modalidade oferece pelo menos um kit, avançar exige um
`kitId` preenchido, e não existe botão de "não quero kit". O que fazia o gate parecer suave é que
o "Sem kit" estava **dentro** da lista de kits: escolhê-lo satisfazia o gate, e o comprador tinha
a impressão de estar recusando o kit quando na verdade estava comprando um.

Logo a mudança de fluxo é mais estreita do que soa. Nenhuma linha de obrigatoriedade nasce nesta
rodada. O que muda é **o que existe na lista** quando o comprador chega nela.

### O que o comprador vê, caso a caso

| Configuração da modalidade | O que a tela faz hoje | Depois da RN-506 |
|---|---|---|
| Zero kits | ramo de lista vazia, texto próprio, avança | idêntico |
| Kits com preço > 0 e um "Sem kit" negativo | escolhe um dos dois; o negativo desconta | o negativo não existe mais; escolhe um dos pagos |
| Kits com preço > 0 e um kit de preço **zero** | escolhe; o de zero mostra "Incluso" | idêntico, e passa a ser **a** forma de oferecer a saída |
| Só kits com preço > 0 | escolhe e paga | idêntico, e é o que o dono quer |

### O beco, e onde ele está de verdade

**Não há beco por obrigatoriedade.** Uma modalidade que só oferece kits pagos obriga a comprar um
kit para se inscrever, e isso é a decisão do dono lida até o fim, não um defeito: se o brinde do
patrocinador tem que chegar à mão do participante, então a inscrição inclui o kit. O organizador
que quiser abrir a saída cria um kit de preço zero, e isso é o **SEMKIT-2** do painel.

**Não há beco por esgotamento, e a razão é desconfortável.** A leitura intuitiva de
`Kit.capacidade` é que ela limita quantas pessoas escolhem aquele kit. Ela não limita nada.
Varredura por `capacidade` sobre `functions/src/checkout/` e sobre
`apps/landing/app/(public)/[eventSlug]/inscricao/`: **zero ocorrências**. O campo é carregado pela
projeção pública (`leitor.ts:196`, `lib/tipos.ts:46`) e nunca lido para decidir venda. Os dois
consumidores dele somam por documento e servem à capacidade derivada do evento e à matriz de
estoque do painel. **Kit esgotado não é um estado que o produto alcança.** O único estoque que
gateia é a vaga do lote, e mesmo ela é recontada e não reservada — que é exatamente o achado da
RN-498 e o item **ESTOURO-1** do painel.

Isso fecha a pergunta do dono e abre uma condição. **No dia em que a capacidade do kit passar a
gatear**, a modalidade cujos kits estejam todos esgotados vira beco fechado: o gate exige `kitId`,
a lista vem vazia por esgotamento, e o comprador não tem gesto que satisfaça a etapa. A condição
está escrita na RN-508 e é falsificável: qualquer tarefa futura que faça `capacidade` recusar
escolha tem de trazer junto o que a etapa faz quando a lista esvazia. Sem isso, ligar a capacidade
é ligar um beco.

**O beco que existe hoje é outro, e é de organizador.** Está na Parte 4.

### O que a tela diz

A frase única da RN-504 continua valendo e ganha um terceiro caso. **"Esta inscrição não inclui
kit."** cobre modalidade sem kit, lote com o interruptor desligado e — a partir daqui — qualquer
caminho em que a inscrição não carregue kit. Para quem compra os três são o mesmo fato.

Fica proibido em superfície de comprador, além do que a RN-504 já proibia: qualquer copy que
ofereça **abrir mão** do kit, sugira desconto por dispensá-lo, ou apresente a ausência de kit como
escolha econômica. "Sem kit" como **nome de kit** não é proibido: um kit de preço zero pode se
chamar assim, e chamar-se assim é honesto. O que não pode é o preço.

**Um defeito de copy que a RN-506 desnuda.** `labelDeltaKit` renderiza `preco === 0` como
"Incluso" no checkout (`StepModalidadeKit.tsx:16-17`) e "Incluso no valor" na landing
(`KitsSection.tsx:9-10`). Num kit de conteúdo real isso está certo. Num kit de preço zero criado
para ser a **saída** — nome "Sem kit", zero itens — "Incluso" lê como "você ganha isto", que é o
oposto do que a pessoa está escolhendo. A tarefa 2b da fila corrige o rótulo pelo conteúdo do kit,
não pelo sinal do preço, e as duas cópias da função são a mesma dívida.

## Parte 3 · onde proibir o preço negativo

### A fronteira, e por que ela não é a tela

A doutrina da casa está escrita e é curta: validação só na tela é sugestão, não regra. Aqui ela
tem endereço, porque o kit é **escrita direta do cliente** (Parte 0). Sem a Rule, um payload
montado à mão grava `preco: -15` com a tela intacta.

**A proibição entra em três camadas, e só uma delas é gate.**

**1. `firestore.rules` · `shapeKitValido` — o gate.** Duas condições a mais na função que já valida
o shape (`:959-966`), copiadas do lote: `moneyCentExato(request.resource.data.preco)` e
`request.resource.data.preco >= 0` (`:1060-1061`). Valem no create e no update, porque
`shapeKitValido()` é chamada nos dois (`:1011`, `:1017`). É a fronteira que ninguém contorna, e é
a razão de esta tarefa levar ⚔.

**2. `packages/core` · o predicado se divide em dois.** `precoKitValido` é chamado em dois papéis
opostos hoje, e apertá-lo num só lugar quebra o outro. Como **escrita**, ele diz o que pode ser
gravado. Como **leitura**, ele é chamado dentro de `computeSaleState`
(`saleState.ts:265-269`) e **lança** quando o preço não passa. Apertar o predicado único faria
`computeSaleState` recusar toda cotação que envolva um kit legado negativo — ou seja, **derrubaria
o checkout dos dois eventos de produção que têm um**, no meio da venda, sem que ninguém tivesse
mexido neles.

Por isso a divisão, que é Postel e é o padrão que o `parseKit` e o `gradeEfetivaDoItem` já usam
neste mesmo arquivo:

- `precoKitValido` **fica como está** — número finito. É leitura, aceita o que está no banco.
- Nasce `precoKitGravavel` — número finito **e ≥ 0**. É escrita, e é o espelho exato da Rule.

O `SalvarKitInput` e o `KitEditor` passam a chamar o segundo. `computeSaleState` continua no
primeiro, e por isso um evento com kit legado negativo **continua vendendo** até ser reparado. Isso
é decisão, não descuido: derrubar a venda de um evento vivo para aplicar uma regra nova é pior que
o problema que a regra resolve.

**3. A tela — antecipação, não regra.** Hoje o `KitEditor` **ensina** o contrário: o rótulo do campo
é literalmente *"Preço (delta sobre a inscrição, aceita negativo)"* (`KitEditor.tsx:410-426`), o
input é `type="text"` com `inputMode="decimal"`, sem `min`, sem clamp e sem checagem de faixa antes
do `onSalvarKit` — a única recusa possível é texto ilegível (`parseValorPtBr`, que trata sinal à
esquerda de propósito). O rótulo muda, o `precoKitGravavel` entra antes do salvar, e a recusa ganha
mensagem própria. É o que evita o organizador descobrir a fronteira por erro genérico do servidor,
e é a camada que **não** conta como enforcement.

Vale registrar que o próprio arquivo já tinha a lacuna anotada em comentário
(`KitEditor.tsx:94-95`): *"`precoKitValido` só exige número finito (RN-211 admite negativo) e a
Rule do kit só exige `preco is number`, sem `moneyCentExato`"*. A anotação estava certa e sem dono;
agora tem um.

### O que acontece com quem já tem

Três perguntas separadas, três respostas.

**O kit legado continua sendo lido e vendido.** Consequência direta da divisão acima. Ninguém
acorda com o checkout fechado por causa desta rodada.

**O kit legado não pode ser salvo de novo sem virar conforme.** `shapeKitValido()` roda no update,
e o payload do `salvarKit` **sempre carrega `preco`** (`kits.ts:88-95`, o campo é incondicional no
objeto, não faz parte do bloco de campos opcionais). Logo, mexer na descrição de um kit legado
negativo pela tela passa a ser recusado pela Rule, com uma mensagem que fala de preço quando a
pessoa estava editando texto. Isso é o **bloqueio de edição**, e ele acontece por default, não por
escolha — a tarefa 2a da fila carrega o dever de dar endereço a essa recusa, que é o mesmo defeito
que a review da SEAL-LOTES corrigiu no `LoteModal` (`2a97a592`) e que não pode renascer aqui.

**Migração automática está recusada.** Reescrever `preco: -15` para `0` em varredura contraria a
RN-200 num evento com venda, muda o que o organizador configurou sem ele saber, e faz isso em cima
de um valor que tem consequência de dinheiro para o próximo comprador. O reparo é operação
nomeada, com o dono decidindo qual, e é a Parte 4.

### O que a RN-506 deliberadamente **não** faz

Não mexe em `kitEhDesconto` nem em `guardPrecoNaoNegativo`. Os dois ficam. O primeiro passa a ser o
detector do legado, e é o que a operação de reparo usa para achar o que reparar; o segundo perde a
causa viva e vira a última linha de defesa de um item negativo em pedido de grupo, exatamente como
o piso do principal ficou na RN-456. Remover defesa porque a causa sumiu é como o resíduo de
juros zero nasceu.

## Parte 4 · os dois kits de produção

### O que foi medido, e como

Leitura direta de `leela-hub` nesta lane, sem escrita, com credencial derivada do refresh token do
`firebase-tools` e descartada ao fim — a mesma receita que a lane DEPLOY-PREVIEW registrou. Quinze
kits no banco, batendo **1:1** com o seed em docId, nome, preço e capacidade. Nenhum kit fora do
seed. Nenhum preço editado por organizador.

| Evento | docId | Nome | Preço |
|---|---|---|---|
| **meia-floripa-2026** | `sem_kit` | Sem kit | **−15** |
| **sao-silvestre-floripa-2025** | `sem_kit` | Sem kit | **−10** |
| meia-floripa-2026 | `kit_ouro` / `kit_prata` / `kit_basico` | Kit Ouro / Prata / básico | 89 / 35 / 0 |
| corrida-inverno-floripa-2026 | `kit_prata` / `kit_basico` | Kit Prata / básico | 45 / 0 |
| desafio-mtb-costa-lagoa-2026 | `kit_prata` / `kit_basico` | Kit Prata MTB / básico | 55 / 0 |
| noturna-beira-mar-2026 | `kit_ouro` / `kit_basico` | Kit Ouro Neon / básico | 79 / 0 |
| retiro-bem-estar-rio-vermelho-2026 | `kit_ouro` / `kit_basico` | Kit Bem-Estar Plus / básico | 89 / 0 |
| sao-silvestre-floripa-2025 | `kit_basico` | Kit básico | 0 |
| trilha-pantano-sul-2026 | `kit_basico` | Kit trilha | 0 |

**Origem confirmada: seed, os dois.** `functions/src/seed/kits.seed.ts:64` semeia o −15, com o
comentário `// RN-211: "Sem kit" é kit válido com preço NEGATIVO (desconto)` uma linha acima;
`functions/scripts/preview-seed-extra.ts:457` semeia o −10. Chegaram a produção pelo runner
`functions/scripts/prod-seed-leela-hub.ts:194,203`, que escapa do `assertEmulatorOnly` dos dois
seeds de propósito, setando `LEELA_SEED_PROD_ACK`. A rodada está registrada em
`.nirvana/handoffs/leela-build-2d6ee98d-DEPLOY-PREVIEW.md:23` — duas execuções.

### Nenhum pedido pago referencia os dois. A medição, e por que ela é conclusiva

```
meia-floripa-2026:           462 inscritos | kit == 'sem_kit' → 24 | kitId == 'sem_kit' → 0
sao-silvestre-floripa-2025:   40 inscritos | kit == 'sem_kit' →  8 | kitId == 'sem_kit' → 0
pedidos: 17 | itens[] apontando 'sem_kit': 0 | campo de kit em itens[]: não existe
pagamentos: 10 na Meia (8 confirmados) | 0 na São Silvestre
```

Três razões independentes sustentam a conclusão, e nenhuma delas depende das outras.

A primeira é a contagem: **zero inscritos com `kitId == 'sem_kit'`**. Os 32 que aparecem com
`kit == 'sem_kit'` carregam o **enum** da RN-202, que é rótulo (RN-507), não a compra do kit; todos
são documentos de seed (`insc-0430`…`insc-0453` e `insc-s-0033`…`insc-s-0040`), todos sem
`pedidoRef`, todos sem `kitId` — o `kitId` só é gravado pelo checkout real.

A segunda é estrutural e mais forte que a contagem: **`ItemPedido` não tem campo de kit**
(`packages/core/src/pedidos/pedido.ts:123-145` — `inscritoRef`, `loteId`, `valorBase`, `desconto`,
`valorFinal`, `taxaRepassada`). **Não existe caminho no modelo** para um pedido apontar para um
kit. A pergunta "algum pedido pago referencia um deles" tem resposta negativa por construção, não
por sorte de amostragem.

A terceira é o único inscrito de checkout real na Meia: `ped-wNXRT…-i1`, com `kit = kit_basico` e
`kitId = kit_basico`, pedido pai em `falhou`. Os 8 pedidos pagos apontam para
`insc-0001..0006`, `insc-0050..0055` e `insc-0301..0303` — nenhum na faixa 430-453.

**Consequência: mexer nos dois kits não mexe em dinheiro já cobrado.** É essa medição, e só ela,
que torna o reparo seguro e que sustenta a exceção declarada à RN-200 na RN-509. Se um pedido
pago referenciasse qualquer um dos dois, a recomendação seria outra: manter o documento como está,
marcar como legado e nunca reescrever preço de kit que já entrou numa cotação congelada (RN-179).

### O beco que existe, e ele é do organizador

Os dois eventos têm inscritos — 462 e 40 —, logo `eventoPaiTemVenda()` é verdadeiro nos dois. A
Rule congela o `preco` (`precoEditavel`, `firestore.rules:999-1003`) e nega o `delete` (`:1025`); a
tela reflete com `MSG_PRECO_BLOQUEADO` (`KitEditor.tsx:85`). **O organizador não tem gesto nenhum
que conserte o kit dele.** Não é efeito da RN-506 — já era assim antes desta rodada —, e é o que
torna o reparo necessariamente operação de plataforma.

Vale registrar que a porta que a RN-200 deixou aberta continua aberta do outro lado.
`functions/src/eventos/guardPreco.ts:13-16` documenta por escrito que *"deletar um kit e recriá-lo
com outro preço contorna a trava de update"*. Para o cliente, a Rule fecha (delete negado com
venda). Para uma Function com Admin SDK, não fecha: `assertPrecoEditavel` é chamada por convenção,
não por construção. A operação de reparo tem de honrar isso declarando a exceção, e não fingindo
que ela não existe.

### O reparo proposto

**Default proposto: zerar o preço dos dois, na fonte antes do banco.** Ordem obrigatória, porque o
runner de seed de produção já rodou duas vezes e uma terceira ressuscita os dois documentos: primeiro
`kits.seed.ts:64` e `preview-seed-extra.ts:457`, depois `leela-hub`. Reparo que inverta a ordem tem
janela para regredir sozinho.

Por que zerar, e não as outras duas.

**Apagar** removeria configuração e deixaria 32 inscritos rotulados "Sem kit" sem kit
correspondente no evento. Pela RN-507 esse estado é legítimo e nada quebra — o balcão lê o enum, e
`kitLabels` tem entrada para ele. Mas a Meia Floripa é a demonstração canônica do produto, e uma
modalidade 5k com 24 pessoas que escolheram um kit inexistente é incoerência de vitrine. Apagar
também mexe em `Kit.capacidade` derivada: os dois consumidores somam por documento
(`aggregateProfessionalDashboard.ts:97`, `distribuicao.ts:199-209`), e 60 + 20 saem da conta.

**Renomear e neutralizar** acrescenta churn sem resolver nada que zerar não resolva. O nome não é o
problema; a RN-508 diz isso com todas as letras. O preço é.

**Zerar** é o movimento mínimo que satisfaz a RN-506, preserva a saída que as modalidades 5k e 10k
já oferecem, mantém a capacidade derivada estável, e produz em produção exatamente o padrão de que
a RN-508 fala — o único kit de preço zero chamado "Sem kit" que existiria no acervo. Junto vem a
correção de copy: com preço zero, `labelDeltaKit` passaria a rotulá-lo "Incluso", e é por isso que
o rótulo tem de sair do conteúdo do kit e não do sinal do preço.

**A escolha é do dono** (**SEMKIT-1**), e as três saídas estão no painel com esta medição por trás.

## Parte 5 · reconciliação com a SPEC-MODALIDADE-KIT

A rodada anterior (`500704f4`) escreveu seis regras e um vetável. Três delas encostam nesta.

### RN-503 · fica inteira

O interruptor `incluiKitDaModalidade?` continua como o dono escolheu, com ausente equivalendo a
ligado, tudo ou nada, recusa no servidor e fora do congelamento da RN-497. Nada nela dependia do
preço negativo. **Lote sem kit é lote sem kit, e a diferença de preço, se houver, vive no preço do
lote** — que é o campo que existe para isso e que a RN-497 já governa.

### RN-504 · perde um parágrafo, e ele é o último

A RN-504 tem quatro afirmações: quem comprou não muda, estoque não é liberado, o comprador nunca lê
"kit desligado", e **"a exceção que vale dinheiro"**. As três primeiras ficam intactas. A quarta
está **revogada junto com a RN-211**, porque descrevia um efeito que só existia enquanto o kit
podia ter preço negativo. Depois da RN-506, desligar o interruptor **só pode baratear ou empatar**
para o próximo comprador, nunca encarecer: todo delta de kit é maior ou igual a zero, então tirar o
cardápio inteiro tira deltas não-negativos.

Some junto o requisito de tela que aquele parágrafo criava — *"tem de aparecer ao organizador no
gesto, com o número"*. Não há número a mostrar. O aviso do gesto continua existindo, mas passa a
dizer o que o interruptor faz, e não quanto ele custa.

### RN-505 · intacta

Nada nela toca kit.

### KITLOTE-1 · fecha, sem resposta do dono

O item existia para decidir duas coisas. **A segunda — se o kit de desconto merecia exceção quando
o interruptor desliga — deixa de existir junto com o kit de desconto**, e a alternativa que o painel
já recomendava recusar ("preservar os kits de desconto") perde até o objeto de recusa.

**A primeira — se o interruptor congela depois da primeira venda — sobrevive tecnicamente e perde o
argumento.** O que a tornava dúvida era a possibilidade de um organizador encarecer a inscrição sem
tocar em preço; sem isso, o caso pós-venda é o banal que a RN-503 já descrevia (o kit acabou no
meio do lote), e congelar tiraria uma correção operacional legítima em troca de nada. **O default
da RN-503 fica em vigor sem ressalva**, e o item sai do painel pela disciplina de limpeza, com o
registro completo aqui e em `01-decisoes-dono.md`.

Isso não é decidir no lugar do dono: é constatar que a pergunta que ele receberia já foi respondida
pela decisão que ele acabou de tomar.

### O que a S317 ganha e perde

**Perde requisito, não ganha nenhum.** A tarefa **2d** (`S317-T4`, o interruptor na tela do lote)
carregava *"o aviso com o número quando desligar tira um kit de preço negativo do cardápio"* e o
aceite *"num evento com um kit de preço negativo na modalidade, desligar o interruptor mostra ao
organizador o desconto que sai e o valor que o próximo comprador passa a pagar, antes de
confirmar"*. **Os dois saem.** A tarefa fica com o rótulo, o default ligado e a ausência do
controle quando a modalidade não tem kit — e continua `sonnet`, agora com folga.

As tarefas **2a**, **2b** e **2c** ficam idênticas, com uma nota de ordem: **2b reordena o bloco do
kit dentro de `computeSaleState`**, e a tarefa 1a desta rodada mexe no predicado que aquele mesmo
bloco chama (`precoKitValido`, `saleState.ts:265-269`). São linhas vizinhas no mesmo arquivo. Se as
duas rodarem em paralelo, colidem; a ordem segura é **1a antes de 2b**, e ela está declarada na
fila.

Nenhuma tarefa da frente 1 da rodada anterior (S316, a lista de modalidades) é tocada.
