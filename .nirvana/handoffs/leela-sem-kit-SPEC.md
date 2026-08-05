# Handoff · SPEC-SEM-KIT

- **Trace:** `leela-pixreal-diag-20260804`
- **Lane:** SPEC-SEM-KIT · employee `sf-cto` (software-forge)
- **Data:** 2026-08-05
- **Território:** `leela-specs/` apenas. Zero linha de código. A review em voo em `packages/core` e `apps/painel` não foi tocada.
- **Rodada:** `leela-specs/02-rodadas/2026-08-05-sem-kit/`

## A decisão

O dono revogou a **RN-211** — *"Sem kit" é kit válido e aceita preço negativo (desconto)* — depois
de a lane anterior (`500704f4`) apresentar a borda de que desligar o kit num lote podia
**encarecer** a inscrição.

> "isso é um problema, pois nao existe essa opção de 'dar desconto sem o kit' pois é interessante
> para os organizadores e patrocinadores que os participantes tenham os kits com os brindes deles."

Decisão registrada como **D-0805-7**. A revogação está **marcada, não apagada**, no épico dono e nas
três cópias herdadas — o índice de RN já registrava como defeito a RN-448 ter sido superada sem
marca, e aqui a marca entra junto.

## RNs

| ID | O que é |
|---|---|
| **RN-211** | **REVOGADA.** A primeira metade sobrevive na RN-506 (um kit chamado "Sem kit" continua válido); morre o preço abaixo de zero |
| **RN-506** | O preço do kit tem piso zero e centavo exato, e a fronteira é a Rule |
| **RN-507** | O valor `sem_kit` do enum `KitInscrito` é rótulo e continua vivo — não é o kit que a RN-506 elimina |
| **RN-508** | Escolher kit já é obrigatório onde a modalidade oferece kits; a saída é um kit de preço zero |
| **RN-509** | Os dois kits negativos de produção são reparados na fonte e no banco, por operação nomeada |

Todas em [[LEELA-E03-operacao-evento]]. Faixa 506-509 conferida livre antes de consumir (varredura
`RN-50[6-9]` e `RN-51[0-5]` sobre `leela-specs/`, `apps/`, `packages/`, `functions/src/` e
`firestore.rules`: zero ocorrências). A 499 continua fora, por ser marcador de faixa.

## A fronteira escolhida para proibir o preço negativo

**A Rule, e ela é o gate.** Três camadas, uma delas enforcement:

1. **`firestore.rules` · `shapeKitValido` (`:959-966`)** ganha `moneyCentExato` e `preco >= 0`,
   copiados do **lote** (`:1060-1061`). Vale no create e no update.
2. **`packages/core` · o predicado se divide.** `precoKitValido` **fica liberal** (leitura, Postel)
   e nasce `precoKitGravavel` (escrita, espelho da Rule).
3. **A tela** antecipa e não conta como enforcement.

**Por que a Rule.** O kit é escrita direta do cliente (`packages/api-client/src/eventos/kits.ts:85-109`,
`setDoc` com merge, zero validação) e **nenhuma Cloud Function cria ou atualiza kit** — as quatro
que tocam kit só leem. Tipo TypeScript não recusa payload.

**Por que o predicado se divide, e essa é a decisão mais cara da lane.** `precoKitValido` é chamado
dentro de `computeSaleState` (`saleState.ts:265-269`), onde **lança**. Apertá-lo num lugar só
recusaria toda cotação sobre um kit legado negativo e **derrubaria o checkout dos dois eventos de
produção que têm um**, no meio da venda, sem ninguém ter mexido neles.

**Achado de graça:** `shapeKitValido` também não aplica `moneyCentExato` hoje, então `preco: 75.001`
e `Infinity` passam pela Rule do kit. O lote já tem as duas condições. O kit passa a espelhá-lo nas
duas, não só no piso.

**Quem já tem:** continua vendendo (leitura liberal) e **para de editar**, porque o payload do
`salvarKit` carrega `preco` incondicionalmente e a Rule roda no update. Essa recusa precisa de
endereço na tela — é o defeito do `LoteModal` (`2a97a592`) e está na tarefa `S318-T2`. Migração
automática **recusada**.

## O que fica com o enum `sem_kit`

**Fica inteiro, e é outra coisa.** `KitInscrito` (`packages/core/src/eventos/inscrito.ts:41`, RN-202)
é rótulo de fallback: `kitEnumFromId` o devolve para kit fora do conjunto canônico **e** para
ausência de kit, e o preço nunca depende dele. **Cinco superfícies vivas dependem do valor existir**
— `kitJaConcluido` do credenciamento, carimbo de `kitEntregueEm`, denominador de kits a retirar,
checklist do balcão, rótulo e chave `porKit.sem_kit` do financeiro.

**Medido:** 32 inscritos em produção carregam `kit == 'sem_kit'` e **nenhum** carrega `kitId`. São o
rótulo, não a compra. A tarefa `S318-T4` é um teste que fixa o valor vivo, para que a leitura errada
de "tirar o Sem kit do produto" fique vermelha em vez de derrubar o balcão no dia da prova.

## A consequência de fluxo no checkout

**Escolher kit já era obrigatório.** `CheckoutFlow.tsx:1706-1715` recusa avançar quando
`kitsDaModalidade(...).length > 0` e `kitId` está vazio. Nunca existiu botão de "não quero kit"; o
que fazia o gate parecer suave é que o "Sem kit" estava **dentro** da lista — escolhê-lo satisfazia
o gate, e o comprador achava que estava recusando quando estava comprando. **Nenhuma linha de
obrigatoriedade nasce nesta rodada**; muda o conteúdo da lista.

**Becos:**

- **Por obrigatoriedade: não há.** Uma modalidade só com kits pagos obriga a comprar um kit, e isso
  é a decisão do dono lida até o fim. A saída, onde o organizador quiser, é um kit de preço zero
  (**SEMKIT-2**, default: escolha do organizador).
- **Por esgotamento: não há hoje, e a razão é desconfortável.** `Kit.capacidade` **não gateia venda
  nenhuma** — varredura por `capacidade` sobre `functions/src/checkout/` e sobre
  `apps/landing/app/(public)/[eventSlug]/inscricao/` devolve zero. Kit esgotado não é estado
  alcançável. **Mas ligar a capacidade um dia abre o beco**, e a RN-508 grava a condição: toda
  tarefa que faça `capacidade` gatear tem de trazer junto o que a etapa faz quando a lista esvazia.
- **O beco que existe é do organizador**, e está abaixo.

**Copy:** a frase única da RN-504 ganha um terceiro caso. Defeito achado: `labelDeltaKit` rotula
`preco === 0` como "Incluso", que lê como "você ganha isto" no exato kit criado para ser a saída —
o rótulo tem de sair do conteúdo, não do sinal. Duas cópias da função.

## Os dois kits de produção

**Medição direta em `leela-hub`**, leitura apenas, credencial descartada ao fim.

| Evento | docId | Preço | Origem |
|---|---|---|---|
| `meia-floripa-2026` | `sem_kit` | **−15** | seed `functions/src/seed/kits.seed.ts:64` |
| `sao-silvestre-floripa-2025` | `sem_kit` | **−10** | seed `functions/scripts/preview-seed-extra.ts:457` |

Os quinze kits do banco batem **1:1** com o seed (docId, nome, preço, capacidade). Aplicados em
produção pelo runner `functions/scripts/prod-seed-leela-hub.ts:194,203`, que escapa do
`assertEmulatorOnly` de propósito. Os treze restantes vão de 0 a 89; **nenhum kit de preço zero
chamado "Sem kit" existe** hoje.

**Há pedido referenciando? Não, por três razões independentes.** Zero inscritos com
`kitId == 'sem_kit'`; **`ItemPedido` não tem campo de kit** (`packages/core/src/pedidos/pedido.ts:123-145`),
então não existe caminho no modelo; e os 8 pedidos pagos da Meia apontam para inscritos fora da
faixa de seed que usa o rótulo. São Silvestre tem zero pagamentos. **Mexer nesses dois kits não mexe
em dinheiro já cobrado.**

**O beco do organizador:** os dois eventos têm inscritos (462 e 40), então `eventoPaiTemVenda()` é
verdadeiro, `precoEditavel` congela o `preco` (`firestore.rules:999-1003`) e o `delete` é negado
(`:1025`). **O organizador não tem gesto nenhum que conserte.** O reparo é operação de plataforma,
como **exceção declarada** à RN-200 — e ela só se sustenta pela medição acima.

**Reparo proposto (default): zerar o preço dos dois, fonte antes do banco.** A ordem é obrigatória:
o runner já rodou duas vezes, e uma terceira ressuscita os dois documentos. Apagar removeria
configuração e deixaria 32 inscritos de demonstração rotulados "Sem kit" sem kit correspondente
(estado legítimo pela RN-507, e incoerente de olhar), além de tirar 60 + 20 da capacidade derivada.
Renomear acrescenta churn sem resolver nada. **A escolha é do dono: SEMKIT-1.**

## Destino do KITLOTE-1

**Fechado, sem resposta do dono, e o registro subiu para a rodada.** A segunda metade do item — se o
kit de desconto merecia exceção — deixa de existir junto com o kit de desconto. A primeira — se o
interruptor congela pós-venda — perde o argumento: sem preço negativo, desligar **só pode baratear
ou empatar**. O default da RN-503 fica em vigor sem ressalva.

**RN-503 fica inteira. RN-504 perde um dos quatro parágrafos** ("a exceção que vale dinheiro"),
marcado no E04 e não apagado, junto com o requisito de tela de mostrar o número no gesto.

## Fila

**S318 nova (E03), seis tarefas.** `S318-T1` (⚔ Rule + predicado dividido) · `S318-T2` (tela e
recusa com endereço) · `S318-T3` (rótulo do preço zero) · `S318-T4` (teste que fixa o enum) ·
`S318-T5` (⚔ seed) · `S318-T6` (⚔⚔ reparo em produção, **retido por SEMKIT-1**).

**S317 (rodada anterior) muda sem tarefa nova.** `S317-T4` perde o requisito do aviso com o número.
`S317-T2` ganha uma **ordem**: rodar depois de `S318-T1`, que mexe em linha vizinha do mesmo
arquivo (`saleState.ts:265-274`). Em paralelo, colidem. S316 intacta.

Ordem executável: **1a → (1b, 1c, 1d em paralelo)**, com **2a atrás de 1a** e **2b atrás de 2a e da
resposta do dono**.

## Vetáveis

| Item | Estado | Retém |
|---|---|---|
| **KITLOTE-1** | ✅ **fechado** pela própria decisão do dono | — |
| **SEMKIT-1** · qual reparo para os dois kits de produção | 🔴 aberto, default *zerar* | `S318-T6` |
| **SEMKIT-2** · a plataforma garante a saída de preço zero, ou é do organizador | 🔴 aberto, default *do organizador* | nada |

## Boards e canon atualizados

`BOARD-EPICOS` (E03 e E04), `V1-KANBAN` (S318 nova, S317 ajustada), `V1-CHECKLIST` (rodada nova,
S317-T2 e S317-T4 ajustadas), `DECISOES-ABERTAS` (KITLOTE-1 sai, SEMKIT-1 e SEMKIT-2 entram),
`indice-de-regras-de-negocio` (faixa 506-509, nova faixa mais alta, segunda substituição
deliberada), `estrategia-testes`, e os épicos E03, E04, E09, E12, E13.

**Não tocado de propósito:** `05-discovery/` (benchmark é registro do que se sabia na data) e as
linhas de `V1-CHECKLIST` que marcam tarefas **já entregues** citando a RN-211 — reescrever registro
de entrega passada é falsear histórico.

## Ponta solta nomeada

`labelDeltaKit` existe em duas cópias (`StepModalidadeKit.tsx:16-20`, `KitsSection.tsx:9-13`), com
strings ligeiramente diferentes e o mesmo ramo `preco < 0`. Anterior a esta rodada. Tratadas como
uma só em toda tarefa de copy; unificar é rodada própria.
