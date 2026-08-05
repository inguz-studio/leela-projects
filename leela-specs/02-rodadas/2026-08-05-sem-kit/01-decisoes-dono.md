---
tags: [leela, decisoes, rodada, kit, sem-kit, preco-negativo, revogacao]
trace: leela-pixreal-diag-20260804
lote: SPEC-SEM-KIT
data: 2026-08-05
---

# 01-decisões · o kit deixa de vender desconto

> Uma fala do dono, respondendo a uma borda que a lane anterior levantou. Ela não ajusta o
> desenho: revoga uma regra que está no produto desde o primeiro épico e que está em produção
> hoje, em dois eventos.
>
> Zero código. O território desta lane foi `leela-specs/`, e toda afirmação sobre o repositório
> tem caminho e linha.

## O que foi apresentado, e o que ele respondeu

A SPEC-MODALIDADE-KIT (`500704f4`) fechou com uma borda declarada na **RN-504** e subida ao painel
como **KITLOTE-1**: o interruptor de kit no lote podia **encarecer** a inscrição sem o preço do
lote mudar. O caminho é indireto e por isso vale repetir. "Sem kit" não é a ausência de kit, é um
**kit vendável** com preço negativo (RN-211); desligar o interruptor tira esse kit do cardápio
daquele lote; e o comprador que escolheria abrir mão da camiseta por menos dinheiro perde a opção
e paga o preço cheio.

**Verbatim do dono:**

> "isso é um problema, pois nao existe essa opção de 'dar desconto sem o kit' pois é interessante
> para os organizadores e patrocinadores que os participantes tenham os kits com os brindes deles."

A frase tem duas metades e elas não têm o mesmo peso. A primeira é a decisão: *não existe essa
opção*. A segunda é a razão de negócio, e ela vale mais que este caso porque orienta o próximo:
*é interessante para os organizadores e patrocinadores que os participantes tenham os kits com os
brindes deles*.

## A decisão

### D-0805-7 · a RN-211 está revogada, e o kit não tem preço negativo

A RN-211 diz, desde `packages/core/src/eventos/kit.ts:9` e desde a linha 49 do
[[LEELA-E03-operacao-evento]], que *"Sem kit" é kit válido e aceita preço negativo (desconto)*. O
dono revoga a segunda metade. **A regra sai por decisão registrada, não por apagamento**: ela
continua legível no épico, marcada como revogada, com data, verbatim e apontador para a regra que
a substitui. Quem for ler o código nos próximos meses vai encontrar `kitEhDesconto` e precisa
chegar rápido ao motivo de a função existir e não ter mais o que fazer.

A regra nova é a **RN-506**, e ela mora no mesmo épico da regra que revoga.

**O que a decisão não é.** Não é a eliminação do "sem kit" como situação. Uma modalidade pode não
oferecer kit nenhum, e isso continua sendo caso legítimo e comum. Não é a eliminação do rótulo
`sem_kit` do inscrito, que é enum do modelo (RN-202) e sustenta o credenciamento, o financeiro e a
tela de entrega. O que morre é exatamente uma coisa: **um kit vendável com preço abaixo de zero**.
A separação está na RN-507 e é o principal risco desta rodada, porque as duas coisas se chamam
igual em português e diferente em código.

### A razão de negócio vira diretriz, não nota de rodapé

*"é interessante para os organizadores e patrocinadores que os participantes tenham os kits com os
brindes deles"* explica esta decisão e decide sozinha as próximas da mesma família. Um item de
patrocinador que não chega à mão do participante é contrapartida não entregue, e o produto vive de
vender essa contrapartida. Qualquer desenho futuro que ofereça ao comprador um caminho para
**declinar** o kit em troca de dinheiro colide com ela: o desconto por dispensar o brinde, o kit
opcional pago à parte, o cupom que zera só o kit.

Isso está registrado como diretriz durável em [[LEELA-E03-operacao-evento]] §"O brinde é
contrapartida de patrocinador", e não apenas dentro do enunciado da RN-506. Regra responde ao
caso; diretriz responde ao próximo caso.

## O que esta rodada faz com a rodada anterior

**O KITLOTE-1 perde o objeto e fecha.** Ele existia para decidir duas coisas sobre o interruptor de
kit no lote, e a segunda — se o kit de desconto merecia exceção — deixa de existir junto com o kit
de desconto. A primeira, se o interruptor congela depois da primeira venda, sobrevive tecnicamente
mas perde o argumento que a tornava dúvida: sem preço negativo, desligar o interruptor **só pode
baratear ou empatar**, nunca encarecer. O default da RN-503 fica em vigor sem ressalva. O registro
completo está em `02-spec-sem-kit.md` §Parte 5.

**A RN-503 fica inteira.** O interruptor continua útil e continua como o dono escolheu: lote sem
kit é lote sem kit, e a diferença de preço, se houver, vive no **preço do lote**, que é o campo
que existe para isso. O que sai é a metade da RN-504 que descrevia o efeito monetário.

**A S317 fica mais barata.** Uma tarefa perde requisito e nenhuma ganha. Detalhe em
`04-fila-codigo.md`.

## O que esta rodada abre

**Dois kits em produção estão fora da regra nova.** Eles não são hipótese: estão medidos, com
evento, nome e valor, em `02-spec-sem-kit.md` §Parte 4. O reparo é decisão do dono porque as três
saídas possíveis têm consequências diferentes para quem já comprou, e porque a plataforma trava
preço de kit depois da primeira venda (RN-200). Subiu ao painel como **SEMKIT-1**.

**A etapa de kit do checkout perde a saída dela.** Isso não é efeito colateral: é o que o dono
pediu, lido até o fim. Onde a modalidade oferece kits, escolher um passa a ser obrigatório, e essa
obrigatoriedade **já é o comportamento do código hoje** (`CheckoutFlow.tsx:1711-1715`) — o que a
tornava suportável era o "Sem kit" estar na lista. Quem quiser preservar a saída passa a fazê-la
com um kit de **preço zero**, e a pergunta de se a plataforma garante essa saída ou deixa com o
organizador subiu como **SEMKIT-2**. A apuração da consequência inteira, com o beco que existe e o
que não existe, está em `02-spec-sem-kit.md` §Parte 2.

## O que esta rodada não faz

**Não constrói nada.** Todo o produto desta lane é `leela-specs/`. As regras nascem seladas e sem
código; a fila está em `04-fila-codigo.md`.

**Não apaga a RN-211.** Revogação registrada, com o texto original preservado e marcado. O
precedente da casa é a RN-448, superada pelas RN-449 e RN-450 em 02/08, e o
[[indice-de-regras-de-negocio]] registra como defeito daquele caso que *"as definições originais da
RN-448 continuam legíveis nos épicos, sem marca de que já não valem"*. Aqui a marca entra junto.

**Não mexe no enum `sem_kit`.** Nem no `kitEnumFromId`, nem no `KitInscrito`, nem no
`kitJaConcluido` do credenciamento. A RN-507 existe para que a lane de build não confunda os dois
sentidos da mesma palavra e apague o que sustenta o balcão.
