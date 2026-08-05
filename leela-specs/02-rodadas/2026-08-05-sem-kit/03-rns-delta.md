---
tags: [leela, rn, regras-de-negocio, rodada, kit, sem-kit, revogacao]
trace: leela-pixreal-diag-20260804
lote: SPEC-SEM-KIT
data: 2026-08-05
---

# 03-rns-delta · a regra que sai, e as quatro que entram

> Delta de RN da lane SPEC-SEM-KIT. O enunciado canônico de cada regra vive no épico dono,
> consolidado na mesma aterrissagem ([[CONVENCAO-BOARDS]] §2). Este arquivo é o delta do dia e diz
> para onde cada uma foi.

## Prova de não colisão

A faixa mais alta com enunciado é a **RN-505**, criada em 05/08 pela SPEC-MODALIDADE-KIT e
registrada em [[indice-de-regras-de-negocio]]. Varredura por `RN-50[6-9]` e `RN-51[0-5]` sobre
`leela-specs/`, `apps/`, `packages/`, `functions/src/` e `firestore.rules`: **zero ocorrências**.

As faixas **483 a 485** continuam vagas pela reserva da SPEC-CONTAS-LANDING e não foram tocadas.
A **RN-499** continua sendo marcador de faixa sem enunciado e segue fora, pela mesma disciplina que
manteve o 460 fora das rodadas anteriores.

**Esta lane consome RN-506 a RN-509.**

## Revogada

| RN | O que dizia | O que acontece | Onde está marcada |
|---|---|---|---|
| **RN-211** | *"Sem kit" é kit válido e aceita preço negativo (desconto).* | **Revogada em 2026-08-05** por decisão do dono (**D-0805-7**), verbatim registrado em `01-decisoes-dono.md`. A **primeira metade sobrevive** dentro da RN-506: um kit chamado "Sem kit" continua sendo kit válido. Morre a segunda: o preço abaixo de zero. **O enunciado não é apagado** — fica legível e marcado, porque `kitEhDesconto` e o ramo negativo de `labelDeltaKit` seguem no código enquanto existir documento legado, e quem ler o código precisa chegar rápido ao motivo. Substituída por **RN-506**. | [[LEELA-E03-operacao-evento]]`:49` (épico dono), com o delta em §"Delta o kit não vende desconto" |

**Onde a RN-211 aparece como cópia herdada**, e o que foi feito em cada uma:
[[LEELA-E09-financeiro-profissional]]`:39`, [[LEELA-E12-landing]]`:42` e
[[LEELA-E13-app-atleta]]`:60` recebem a marca de revogação e o apontador para a RN-506, sem que
nenhuma delas passe a ser dona de nada. Os aceites de história que citavam preço negativo foram
reescritos nos quatro épicos. As citações em `05-discovery/` **não** foram tocadas: benchmark é
registro do que se sabia na data, e reescrever registro histórico é pior que deixá-lo datado.

## Novas

| RN | Regra | Épico dono | Lane |
|---|---|---|---|
| **RN-506** | **O preço do kit tem piso zero, e a fronteira é a Rule.** O preço de um kit é valor monetário em centavos exatos, maior ou igual a zero, no create e no update. Revoga a RN-211. **A Rule é a única fronteira real**, porque o kit é escrita direta do cliente (`packages/api-client/src/eventos/kits.ts:85-109` faz `setDoc` com merge, sem validação) e **nenhuma Cloud Function cria ou atualiza kit** — as quatro que tocam kit só leem. Tipo TypeScript não recusa payload. O molde já existe no arquivo e é o do **lote**: `shapeKitValido` (`firestore.rules:959-966`) passa a exigir `moneyCentExato` e `preco >= 0`, as duas condições que o lote tem em `:1060-1061`. Isso fecha de graça uma segunda porta: hoje `preco: 75.001` e `Infinity` passam, porque `is number` é verdadeiro para float infinito. **O predicado do core se divide em dois**, e não é preciosismo: `precoKitValido` (`kit.ts:113-116`) é chamado como leitura dentro de `computeSaleState` (`saleState.ts:265-269`), onde **lança**; apertá-lo num lugar só recusaria toda cotação sobre um kit legado negativo e derrubaria o checkout de eventos vivos que ninguém tocou. `precoKitValido` **fica liberal** (Postel, o padrão que o `gradeEfetivaDoItem` já usa neste arquivo) e nasce `precoKitGravavel`, espelho exato da Rule, chamado pela tela e pelo contrato. **Quem já tem kit negativo continua vendendo e para de editar**: o payload do `salvarKit` carrega `preco` incondicionalmente (`kits.ts:88-95`), então mexer na descrição passa a bater na Rule com recusa que fala de preço — e **essa recusa precisa de endereço na tela**, que é o defeito que a review da SEAL-LOTES corrigiu no `LoteModal` (`2a97a592`). Migração automática **recusada**: reescrever preço em varredura contraria a RN-200 em evento com venda. **`kitEhDesconto` e `guardPrecoNaoNegativo` ficam** — o primeiro vira o detector do legado, o segundo perde a causa viva e vira última linha de defesa, como o piso do principal na RN-456. Nenhum número de receita apurada muda: `agregarFinanceiro` declara por escrito que nunca deriva receita de preço de kit (`functions/src/eventos/agregarFinanceiro.ts:24-25`). Falsificação: gravar `preco: -1` pela Rule é recusado com a tela intacta e com payload à mão; `preco: 75.001` também; e uma cotação sobre evento com kit legado negativo continua fechando. | E03 (dona) · E09, E12 e E13 (consomem) | SPEC-SEM-KIT |
| **RN-507** | **O valor `sem_kit` do enum é rótulo, e não é o kit que a RN-506 elimina.** Duas coisas se chamam "sem kit" e só uma morre. O que a RN-506 elimina é um **kit vendável**: documento em `eventos/{id}/kits/{kitId}` com preço abaixo de zero. O que **continua existindo e é necessário** é o valor `sem_kit` do enum `KitInscrito` (`packages/core/src/eventos/inscrito.ts:41`, RN-202), **rótulo de fallback** do inscrito: `kitEnumFromId` (`checkout/tipos.ts:66-72`) o devolve tanto para kit fora do conjunto canônico do seed quanto para ausência de kit, e o preço **nunca** depende dele. **Cinco superfícies vivas dependem do valor existir**, nenhuma ligada a desconto: o stepper do credenciamento (`entrega.ts:36-46`, `kitJaConcluido`), o carimbo de `kitEntregueEm` (`AtendimentoPanel.tsx:121-123`), o denominador de kits a retirar (`_lib/balcao.ts:130, 148`), o checklist do balcão (`_lib/balcao.ts:247, 258`) e o rótulo mais a chave `porKit.sem_kit` do financeiro (`_lib/kitLabels.ts:19-24`). A confusão tem tamanho medido: em produção **32 inscritos carregam `kit == 'sem_kit'` e nenhum carrega `kitId`** — são o rótulo, não a compra. Modalidade que não oferece kit nenhum é caso legítimo e permanece, com o ramo já pronto em `StepModalidadeKit.tsx:251-257`. Esta regra existe por razão operacional declarada: sem ela, "tirar o Sem kit do produto" tem duas leituras, e a errada apaga o enum e derruba o credenciamento no dia da prova. Falsificação: uma varredura que remova o valor `sem_kit` do enum tem de deixar **vermelha a suíte do credenciamento**, e não apenas a do checkout. | E03 (dona) · E12 (consome) | SPEC-SEM-KIT |
| **RN-508** | **Escolher kit é obrigatório onde a modalidade oferece kits, e a saída é um kit de preço zero.** A obrigatoriedade **não nasce nesta rodada**: `CheckoutFlow.tsx:1706-1715` já recusa avançar quando `kitsDaModalidade(...).length > 0` e `kitId` está vazio, e nunca existiu botão de "não quero kit". O que fazia o gate parecer suave era o "Sem kit" estar **dentro** da lista — escolhê-lo satisfazia o gate, e o comprador achava que estava recusando quando estava comprando. A RN-506 muda o conteúdo da lista, não a regra de avanço. **A saída, onde o organizador quiser abrir uma, é um kit de preço zero**: é o único desenho compatível com a diretriz do patrocinador, porque ninguém ganha dinheiro por dispensar brinde. Seis dos quinze kits de produção já custam zero, mas **nenhum chamado "Sem kit"** — o padrão da saída teria de ser criado. Se a plataforma **garante** a saída ou deixa com o organizador é **SEMKIT-2**, com o default deixando com o organizador. **Não há beco por esgotamento hoje**, e a razão é desconfortável: varredura por `capacidade` sobre `functions/src/checkout/` e sobre `apps/landing/app/(public)/[eventSlug]/inscricao/` devolve **zero ocorrências** — `Kit.capacidade` não gateia venda nenhuma, e kit esgotado não é estado que o produto alcança. **E é aí que a regra vira condição sobre o futuro:** no dia em que a capacidade passar a recusar escolha, a modalidade com todos os kits esgotados vira beco fechado, porque o gate exige `kitId` e a lista vem vazia. **Toda tarefa que faça `capacidade` gatear tem de trazer junto o que a etapa faz quando a lista esvazia.** Vocabulário: a frase única da RN-504 ganha um terceiro caso e cobre qualquer inscrição sem kit; fica proibida toda copy que ofereça **abrir mão** do kit, sugira desconto por dispensá-lo ou apresente a ausência de kit como escolha econômica. O nome "Sem kit" não é proibido; o preço é. Defeito de copy a corrigir: `labelDeltaKit` rotula `preco === 0` como "Incluso" (`StepModalidadeKit.tsx:16-17`) e "Incluso no valor" (`KitsSection.tsx:9-10`), que lê como "você ganha isto" no exato kit criado para ser a saída — o rótulo tem de sair do conteúdo do kit, não do sinal do preço, nas duas cópias. Falsificação: numa modalidade só com kits pagos, o checkout não oferece caminho de avanço sem kit, e isso é o esperado; num kit de preço zero e sem itens, o rótulo não diz "Incluso". | E03 (dona) · E12 (consome) | SPEC-SEM-KIT |
| **RN-509** | **Os dois kits negativos de produção são reparados na fonte e no banco, por operação nomeada.** Existem dois, estão medidos, e nenhum foi vendido: `meia-floripa-2026` com `sem_kit` a **−15** e `sao-silvestre-floripa-2025` com `sem_kit` a **−10**; os treze restantes vão de 0 a 89. Os dois nasceram do **seed** (`functions/src/seed/kits.seed.ts:64` e `functions/scripts/preview-seed-extra.ts:457`), aplicados em produção pelo runner `functions/scripts/prod-seed-leela-hub.ts:194,203`, que escapa do `assertEmulatorOnly` de propósito com `LEELA_SEED_PROD_ACK`; os quinze kits do banco batem 1:1 com o seed, sem preço editado. **Nenhum pedido pago referencia qualquer um dos dois**, por três razões independentes: zero inscritos com `kitId == 'sem_kit'`; **`ItemPedido` não tem campo de kit** (`packages/core/src/pedidos/pedido.ts:123-145`), então não existe caminho no modelo para um pedido apontar para um kit; e os 8 pedidos pagos da Meia apontam para inscritos fora da faixa de seed que usa o rótulo. Os 32 inscritos com `kit == 'sem_kit'` são o enum da RN-507, todos sem `pedidoRef`. **Mexer nesses dois kits não mexe em dinheiro já cobrado**, e é essa medição que sustenta o resto. **O organizador não consegue reparar**: os dois eventos têm inscritos (462 e 40), então `eventoPaiTemVenda()` é verdadeiro, `precoEditavel` congela o `preco` (`firestore.rules:999-1003`) e o `delete` é negado (`:1025`). O reparo é **necessariamente operação de plataforma** e é **exceção declarada** à RN-200, não contorno dela — a exceção se sustenta porque a medição prova que não há comprador para proteger. **A ordem é obrigatória: fonte antes do banco**, porque o runner de seed já rodou duas vezes e uma terceira ressuscita os dois documentos. A escolha entre apagar, zerar e renomear é do dono (**SEMKIT-1**), com o default proposto sendo **zerar os dois**. Falsificação: depois do reparo, uma varredura por `kitEhDesconto` sobre os kits de `leela-hub` devolve zero, e uma execução limpa do seed de produção não recria nenhum preço negativo. | E03 (dona) · E00 (consome, pelo seed) | SPEC-SEM-KIT |

## Ampliadas e reconciliadas (sem número novo)

- **RN-200** — inalterada, e agora com uma exceção **declarada** em vez de contornada. Ela trava
  preço de kit depois da primeira venda, e é exatamente ela que impede o organizador de consertar
  os dois kits medidos. A RN-509 não a afrouxa: ela abre uma operação de plataforma que a
  atravessa com a prova de que não há comprador atrás. A porta que a RN-200 sempre deixou aberta
  do lado das Functions continua registrada em `functions/src/eventos/guardPreco.ts:13-16`.
- **RN-202** — inalterada, e é a dona do enum que a RN-507 protege. O `kit` do inscrito continua
  sendo `kit_ouro | kit_prata | kit_basico | sem_kit`, e o `sem_kit` continua sendo rótulo.
- **RN-210** — inalterada. O evento continua oferecendo de zero a N kits e o filtro do checkout
  continua sendo por modalidade. O que muda é a faixa de preço de cada kit.
- **RN-179** — inalterada, e é o que garante que quem comprou não muda: a cotação está congelada
  no pedido. Como nenhum pedido referencia os dois kits negativos, ela não é sequer acionada aqui.
- **RN-497** — inalterada. O `incluiKitDaModalidade` continua fora do congelamento pós-venda do
  lote, e agora sem a ressalva que o KITLOTE-1 carregava.
- **RN-503** — inalterada e **inteira**. Nada nela dependia do preço negativo. Lote sem kit é lote
  sem kit, e a diferença de preço, se houver, vive no preço do lote.
- **RN-504** — **três quartos intactos, um quarto revogado**. Ficam: quem comprou não muda,
  estoque não é liberado, o comprador nunca lê "kit desligado". Sai o parágrafo **"a exceção que
  vale dinheiro"**, que descrevia um efeito que só existia enquanto o kit podia ter preço
  negativo. Depois da RN-506, desligar o interruptor **só pode baratear ou empatar**. Some junto o
  requisito de tela que aquele parágrafo criava, de mostrar o número ao organizador no gesto.
- **RN-456** — inalterada, e reusada como precedente. O piso do principal ficou no código depois de
  virar inalcançável, como última linha de defesa da invariante. É o mesmo argumento que mantém o
  `guardPrecoNaoNegativo` vivo aqui.
- **RN-224** — inalterada. O aprovisionamento continua sendo demanda menos estoque físico, e o
  preço do kit nunca entrou nessa aritmética.

## Ponta solta nomeada, sem número

**`labelDeltaKit` existe em duas cópias.** `StepModalidadeKit.tsx:16-20` e `KitsSection.tsx:9-13`
são a mesma função com strings ligeiramente diferentes, e as duas carregam o ramo `preco < 0`. A
duplicação é anterior a esta rodada. Esta spec passa a tratá-las como uma só em toda tarefa de
copy, o que contém a deriva sem resolvê-la. Unificar é rodada própria e não cabia aqui.

## Onde cada uma foi consolidada

| RN | Épico |
|---|---|
| RN-506, RN-507, RN-508, RN-509 | [[LEELA-E03-operacao-evento]] |
| RN-211 (revogação marcada) | [[LEELA-E03-operacao-evento]], com cópias marcadas em [[LEELA-E09-financeiro-profissional]], [[LEELA-E12-landing]] e [[LEELA-E13-app-atleta]] |

O [[LEELA-E04-config-vendas]] recebe o delta da reconciliação: a RN-503 fica inteira, a RN-504
perde o último parágrafo, e o **KITLOTE-1** fecha. O [[LEELA-E12-landing]] recebe o delta do
checkout: a etapa sem saída, a frase única com o terceiro caso e o rótulo que sai do conteúdo.
