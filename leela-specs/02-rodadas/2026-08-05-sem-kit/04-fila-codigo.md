---
tags: [leela, fila, rodada, kit, sem-kit, fila-tecnica]
trace: leela-pixreal-diag-20260804
lote: SPEC-SEM-KIT
data: 2026-08-05
---

# 04-fila-código · o piso na Rule, a tela que ensinava o contrário, e dois documentos em produção

> Uma frente nova mais um delta na frente que a rodada anterior deixou. Regras em
> `03-rns-delta.md`, canônicas em [[LEELA-E03-operacao-evento]]; o relato e o verbatim em
> `01-decisoes-dono.md`; a apuração em `02-spec-sem-kit.md`.
>
> **A marca ⚔ está onde a tarefa toca `firestore.rules`, o caminho da cotação ou documento de
> produção.** São três das cinco. O reparo dos dois kits leva **⚔⚔** por escrever em produção
> atravessando a RN-200, ainda que com a prova de que não há comprador atrás.
>
> **Nada desta rodada existe.** Não há commit de código nesta lane; o produto dela é `leela-specs/`.

## Frente 1 · o kit não vende desconto (E03 · S318 nova, RN-506/507/508)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1a | `S318-T1` | **O piso onde ele vale (RN-506).** `shapeKitValido` ganha `moneyCentExato` e `preco >= 0`, copiados do lote (`firestore.rules:1060-1061`), e o predicado do core se divide: `precoKitValido` **fica como está** (leitura, Postel, é o que `computeSaleState` chama e por isso não pode apertar) e nasce `precoKitGravavel`, espelho exato da Rule. `SalvarKitInput` passa a chamar o novo e o comentário *"Aceita negativo"* sai | `firestore.rules`, `packages/core/src/eventos/kit.ts`, `packages/api-client/src/eventos/kits.ts` | — | opus | ⚔ |
| 1b | `S318-T2` | **A tela que ensinava o contrário (RN-506).** O rótulo do campo, hoje literalmente *"Preço (delta sobre a inscrição, aceita negativo)"* (`KitEditor.tsx:412`), muda, e com ele o cabeçalho do arquivo (`:4`); `precoKitGravavel` entra antes do `onSalvarKit`; e a recusa da Rule ganha **endereço** no campo de preço em vez de virar "falha ao salvar" — inclusive no caso torto em que o organizador estava editando a **descrição** de um kit legado e leva uma recusa que fala de preço. O comentário de lacuna em `:94-95` sai junto. ⚠️ Este arquivo acabou de receber a correção do parser de três casas (`41df2d7f`, lane REV-PARSE); partir de `main` atualizado | `apps/painel/src/routes/eventos/kits/**` | 1a | sonnet | — |
| 1c | `S318-T3` | **O rótulo sai do conteúdo, não do sinal (RN-508).** `labelDeltaKit` para de chamar `preco === 0` de "Incluso" / "Incluso no valor" quando o kit não tem itens — o kit de preço zero criado para ser a saída lê como "você ganha isto", que é o oposto do que a pessoa escolheu. As **duas cópias** (`StepModalidadeKit.tsx:16-20`, `KitsSection.tsx:9-13`) mudam juntas, e o ramo `preco < 0` **fica** enquanto houver documento legado | `apps/landing/**` | — | sonnet | — |
| 1d | `S318-T4` | **O teste que fixa o enum vivo (RN-507).** Caso que prova que o valor `sem_kit` de `KitInscrito` continua existindo e continua governando o credenciamento: `kitJaConcluido`, o denominador de kits a retirar e o carimbo de `kitEntregueEm`. É teste, não produção, e existe para que a leitura errada de "tirar o Sem kit do produto" fique **vermelha** em vez de derrubar o balcão no dia da prova | `packages/core/src/eventos/__tests__/`, `apps/painel/src/routes/eventos/entrega/__tests__/` | — | sonnet | — |

**Por que a Rule vem primeiro, e por que ela sozinha não basta.** O kit é escrita direta do cliente
(`kits.ts:85-109`, `setDoc` com merge, zero validação) e **nenhuma Cloud Function cria ou atualiza
kit**. Logo a Rule é o único lugar que um payload montado à mão não contorna, e é onde a regra tem
de nascer. Ela sozinha não basta porque a recusa que ela produz chega à tela sem endereço, e o
organizador que estava mexendo em descrição lê uma mensagem sobre preço — daí a 1b existir e
depender da 1a, nunca o contrário.

**O que esta frente NÃO faz.** Não aperta `precoKitValido`, e a razão é a mais cara da rodada:
`computeSaleState` o chama e **lança** (`saleState.ts:265-269`), então apertar o predicado único
recusaria toda cotação sobre um kit legado negativo e **derrubaria o checkout de dois eventos de
produção no meio da venda**, sem que ninguém tivesse mexido neles. Não remove `kitEhDesconto` nem
`guardPrecoNaoNegativo`: o primeiro é o detector que a 2a usa, e o segundo vira última linha de
defesa, no mesmo molde do piso do principal da RN-456. Não migra documento nenhum em varredura.

## Frente 2 · os dois kits de produção (E03 · S318, RN-509)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 2a | `S318-T5` | **A fonte, antes do banco (RN-509).** `functions/src/seed/kits.seed.ts:64` (−15) e `functions/scripts/preview-seed-extra.ts:457` (−10) param de semear preço negativo, junto com o comentário `// RN-211: ... preço NEGATIVO` que vive uma linha acima do primeiro. Sobe **antes** da 2b, porque o runner de produção já rodou duas vezes e uma terceira ressuscita os dois documentos | `functions/src/seed/`, `functions/scripts/` | 1a | sonnet | ⚔ |
| 2b | `S318-T6` | **O reparo em `leela-hub` (RN-509).** Operação de plataforma sobre os dois documentos, na forma que o dono escolher em **SEMKIT-1** (default: zerar). Atravessa a RN-200 por **exceção declarada**, com o motivo e a medição no registro — os dois eventos têm inscritos, então `precoEditavel` congela o preço e o `delete` é negado para o cliente. Report obrigatório: contagem antes e depois, e a varredura por `kitEhDesconto` devolvendo zero | produção `leela-hub` (zero arquivo do repositório) | 2a, SEMKIT-1 | opus | ⚔⚔ |

**Por que o reparo não é migração automática.** Reescrever preço de kit em varredura contraria a
RN-200 em evento com venda e muda configuração de organizador sem ele saber. Aqui a exceção se
sustenta por uma medição específica, e não por conveniência: **nenhum pedido pago referencia
qualquer um dos dois**, e o modelo nem tem caminho para isso — `ItemPedido` não carrega campo de
kit (`packages/core/src/pedidos/pedido.ts:123-145`). Se um pedido referenciasse, a tarefa 2b não
existiria e o documento ficaria como está, marcado como legado.

## Frente 3 · delta na S317 da rodada anterior (E04 · RN-503/504)

Nenhuma tarefa nova. Uma perde requisito.

| # | Task | O que muda | Efeito |
|---|---|---|---|
| 2d da rodada anterior | `S317-T4` | Saem o requisito *"o aviso com o número quando desligar tira um kit de preço negativo do cardápio"* e o aceite que o exigia. Ficam o rótulo "Inclui o kit da modalidade", o default ligado e a ausência do controle quando a modalidade não tem kit | tarefa **mais barata**, mesma rota `sonnet` |
| 2b da rodada anterior | `S317-T2` | Nada no enunciado. **Ganha uma ordem:** ela reordena o bloco do kit dentro de `computeSaleState` (`saleState.ts:265-274`), e a **1a desta rodada mexe no predicado que aquele bloco chama**. São linhas vizinhas no mesmo arquivo | rodar **1a antes de 2b**; em paralelo, colidem |

As tarefas `S317-T1` e `S317-T3` ficam idênticas. Nenhuma tarefa da S316 (a lista de modalidades) é
tocada.

## Critério de aceite por tarefa

**1a · o piso onde ele vale.** Gravar um kit com `preco: -1` é **recusado pela Rule**, com a tela
intacta e com payload montado à mão — a prova não pode ser só a tela. `preco: 75.001` também é
recusado, e esse caso é o que prova que o `moneyCentExato` entrou junto e não só o piso. E o teste
que não pode faltar: **uma cotação sobre um evento cujo banco ainda tem kit negativo continua
fechando normalmente** — se ela quebrar, `precoKitValido` foi apertado por engano e o checkout de
produção cai.

**1b · a recusa com endereço.** Editar a **descrição** de um kit legado negativo produz uma
mensagem que diz qual campo impede e por quê, no campo de preço, e nunca "falha ao salvar". É o
mesmo defeito de endereço que a review da SEAL-LOTES corrigiu no `LoteModal` (`2a97a592`) e ele não
pode renascer aqui. Um kit novo com preço negativo é barrado antes de chegar ao servidor.

**1c · o rótulo honesto.** Um kit de preço zero **sem itens** não é rotulado "Incluso" em nenhuma
das duas superfícies. Um kit de preço zero **com** itens continua sendo. Varredura por
`labelDeltaKit` devolve as duas cópias com o mesmo comportamento.

**1d · o enum fixado.** Remover o valor `sem_kit` de `KitInscrito` deixa **vermelha a suíte do
credenciamento** — `kitJaConcluido`, denominador de kits a retirar e carimbo de `kitEntregueEm` —,
e não apenas a do checkout. É o caso que impede a leitura errada de custar um dia de prova.

**2a · a fonte.** Uma execução limpa do seed em emulador não produz nenhum kit com preço abaixo de
zero. `grep -rn "preco: -" functions/src/seed/ functions/scripts/` devolve zero.

**2b · o reparo.** Antes: dois kits com `kitEhDesconto` verdadeiro em `leela-hub`. Depois: zero. A
contagem de inscritos, os agregados financeiros e `qtdInscritos` dos dois eventos ficam **intactos**
— nenhum deles depende de preço de kit, e o report tem de mostrar isso medido, não afirmado.

## O que depende de decisão do dono

- **SEMKIT-1** decide a forma do reparo dos dois kits. **Retém a 2b** e só ela; a 2a sobe de
  qualquer jeito, porque parar de semear preço negativo é consequência direta da RN-506 e não
  depende de qual reparo o dono escolher.
- **SEMKIT-2** decide se a plataforma garante a saída de preço zero em toda modalidade que oferece
  kits. **Não retém nada.** O default está em vigor e é deixar com o organizador; a outra resposta
  acrescentaria tarefa na frente 1, não mudaria nenhuma das cinco.

## Ordem executável

**1a primeiro**, porque a 1b depende dela e porque a `S317-T2` da rodada anterior não pode correr
em paralelo com ela. Depois, 1b, 1c e 1d são independentes entre si e podem correr juntas. A 2a sai
logo atrás da 1a, e a 2b só depois da 2a **e** da resposta do dono. A frente 3 não tem tarefa
própria: é edição de escopo em tarefas que já estão na fila da rodada anterior, e acontece na
mesma aterrissagem desta spec.
