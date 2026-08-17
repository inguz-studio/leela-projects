---
tags: [leela, spec, leva22, caixa, kits, rn-200, rn-575, rn-576, e03, e04]
aliases: [Spec da tabela do caixa, Kit composição de itens, RN-200 forward-only]
atualizado: 2026-08-17
---

# Spec — a tabela do caixa, o preço de kit editável e o kit como conjunto de itens

> Cobre a adjudicação do **CAIXA-1** (⛔ não decidida — vai ao dono), a **RN-575** (preço de
> kit forward-only) e a **RN-576** (kit é composição de itens cadastrados). Medição em
> `00-medicao-kits-caixa-e-terciario.md` §14 e §15. Constrói na **onda D**.

## Parte 1 · A tabela do caixa — adjudicação, com a decisão devolvida

Ele perguntou: *"nao informa nada para o usuário. Qual o intuito dela? Mostrar uma divisao
de receita por forma de insicrção? Distribuição?"*

**A resposta medida é que não é nenhuma das duas.**

### O que ela é, de fato

Três colunas — `Categoria` · `Item` · `Inscritos` (`FinanceiroView.tsx:196-200`). **Nenhuma
é dinheiro.** Então "divisão de receita" está descartado por construção: não há um único
número em reais nela.

E "distribuição" só num sentido degradado. **Não existe a chave composta que o nome sugere.**
O agregador concatena **três partições independentes** (`_lib/financeiro.ts:245-259`), uma
por kit, uma por modalidade, uma por status, distinguidas só pela palavra na primeira
coluna. Num evento com 3 modalidades × 2 kits × 4 status ela produz **9 linhas, não 24**.

**E há um defeito aritmético visível:** cada partição soma o mesmo total, então a coluna
"Inscritos" somada de ponta a ponta dá **três vezes** o número escrito no cabeçalho
`Inscrições (N)`. Sem separador visual entre as partições, e com o único texto que
explicaria a estrutura escondido do olho — o `caption` do DS é `sr-only`
(`Table.tsx:151`), então quem enxerga a tela nunca lê "por kit, modalidade e status".

**Ele está certo, e a tela é que está errada. A intuição dele de que "não informa nada" é
uma leitura correta de uma tabela que soma errado por desenho.**

### Por que ela nasceu assim, sem maquiagem

Ela foi um **substituto declarado**, não um desenho. Nasceu em 04/07 (`9e181caa`) e **nunca
mais foi tocada** — os 11 commits seguintes no mesmo arquivo mexeram nos cards de dinheiro,
no CSV e nos gráficos.

O que a spec pedia era outra coisa: matriz **modalidade × lote** mais inscrições **por forma
de pagamento** (`LEELA-E03-operacao-evento.md:1009`). E o ADR é explícito sobre a forma:
*"breakdown é uma matriz modalidade×lote — cada célula é um par real, não um produto
cartesiano de dimensões independentes"* (`ADR-lotes-por-modalidade.md:21`). O commit de
nascimento registra a recusa na própria trailer: *"breakdown por forma de pagamento | dado
inexistente no agregado (E12)"*.

**A dependência continua aberta:** FABLE-A, o modelo de pedido/pagamento no inscrito, que
destrava S207 por forma de pagamento (`V1-CHECKLIST.md:530`). Três anos de tela esperando um
modelo — e enquanto ele não vem, o substituto ficou no ar como se fosse o produto.

### A redundância, que muda o cálculo

- **Um terço das linhas dela já está desenhado em barra, 40px acima, na mesma dobra.** O
  BarChart "Inscrições por modalidade" (`:272-281`) e as linhas `Categoria=Modalidade` leem
  o mesmo `porModalidade`.
- **As três partições já existem, acionáveis, na tela de Inscritos** — chips por status com
  contagem, clicáveis como filtro (`InscritosView.tsx:415-422`), mais selects de kit e
  modalidade (`:180-186`). **A Caixa mostra em leitura o que a outra tela serve em ação.**
- O total de inscritos aparece **4×** na dobra da Caixa, já medido pela leva 17
  (`2026-08-17-carga-cognitiva/00-medicao-area-interna-evento.md:109`, `:133`).
- E o vizinho dela está morto: o donut "Receita por modalidade" depende de
  `receitaPorModalidade`, que **nenhuma Function escreve** — só o seed de preview. **Em
  produção aquele card é um EmptyState.** É por isso que o mock mostra o donut cheio e o
  produto real não mostra nada.

### As três opções, com default — ⛔ a decisão é dele

**CAIXA-1.** Nenhuma destas é escolha minha; a tela do dinheiro conta ao organizador o que o
dono quiser que ela conte.

**Opção 1 — remover a tabela (default proposto).** Ela não responde nenhuma pergunta que a
tela não responda melhor em outro lugar: modalidade está no gráfico acima, status e kit
estão acionáveis em Inscritos. Sai uma tabela que soma 3× o próprio cabeçalho, a dobra da
Caixa fica com os três números de dinheiro e o gráfico, e o item R1-c da campanha da RN-573
fecha junto. Custo: baixo. Risco: quem usava a contagem por kit perde o único lugar que a
mostra somada — mitigado por um caminho para Inscritos já filtrado.

**Opção 2 — trocar por divisão de receita de verdade.** É o que ele levantou primeiro
("divisão de receita por forma de inscrição"), e é o que a spec original pedia. **Bloqueada
por dado, não por trabalho de tela:** exige o FABLE-A (modelo de pagamento no inscrito) e uma
Function que agregue por forma. Enquanto isso não existir, qualquer tela aqui é EmptyState
honesto ou número inventado. Custo: alto, e a maior parte é backend.

**Opção 3 — redesenhar com propósito declarado.** A tabela fica, vira **uma partição por
vez** (um seletor entre kit · modalidade · status, em vez de três empilhadas), ganha coluna
de percentual sobre o total e o título passa a dizer o que está sendo cortado. A soma volta a
bater com o cabeçalho. Custo: médio, todo em tela. Ganho: resolve a aritmética e mantém a
leitura por kit, que hoje não existe em nenhum outro lugar somada.

**O que eu recomendo e por quê:** a **1**, porque a **3** conserta uma tabela para ela ficar
dizendo o que a tela de Inscritos já diz melhor, e a **2** não depende de decisão, depende
de um modelo que ainda não existe. Mas isto é recomendação, e ele decide.

## Parte 2 · RN-575 · o preço do kit passa a ser editável, só para frente

> *"Quero alterar a RN-200, o organizador pode editar os preços dos kits, se achar
> necessário, só que isso nao deve afetar pedidos já realizados. apenas da edição para
> frente."*

### A forma da regra

A **RN-575** recorta o kit de dentro da RN-200, **sem revogá-la**. Preço de **evento** e de
**lote** continuam congelados após a primeira venda; preço de **kit** passa a ser editável
pelo organizador a qualquer momento, e o efeito é **estritamente prospectivo**.

A RN-200 fica **marcada**, nunca apagada, pela mesma disciplina que a RN-211, a RN-470 e a
RN-416 receberam — ela continua explicando o comportamento do código que está no ar até a
onda D subir, e continua valendo inteira para os outros dois preços.

⚠️ **Correção a uma premissa herdada:** o brief supunha que a RN-497 já havia revogado parte
da RN-200. Não revogou. Ela derrubou uma extensão que existia só em comentário de código,
trata do **lote**, e o épico diz que a RN-200 *"permanece aqui, inalterada, e passa a ser
exigível na letra"* (`LEELA-E03-operacao-evento.md:2193`, `:2213`). Fica escrito porque
premissa de brief não conferida vira citação errada na spec seguinte.

### O veredito do snapshot, e o que ele muda na fila

**SNAPSHOT-PARCIAL.**

**A metade que vale dinheiro já está pronta, e isso é a boa notícia.** O preço do kit é
somado dentro de `pedido.itens[].valorBase` no momento da compra (`saleState.ts:294-300` →
`createInscricaoCharge.ts:1361`) e **nunca é relido**. `ItemPedido` tem cinco campos e
nenhum é de kit. Nenhuma superfície pós-compra — slide-in, confirmação, minhas compras,
ingresso, PDF, os oito e-mails — lê preço de kit do documento vivo.

**Portanto, liberar a edição hoje não altera um centavo de nenhum pedido existente.** A
ordem do dono, na parte do dinheiro, **já é satisfeita pela arquitetura**. Isto **rebaixa** a
prioridade da blindagem de valor que o brief desta lane mandava priorizar: não há pedido em
risco, e tratar isso como emergência de dinheiro seria inventar urgência.

**As duas lacunas reais, que a RN precisa cobrir ou vira promessa sem lastro:**

1. **Auditabilidade.** Não existe `kitPreco` gravado em lugar nenhum — os campos `kitPreco`
   e `kitNome` vivem só no caminho transitório da cotação e nunca chegam ao Firestore.
   Ninguém consegue provar depois quanto daqueles R$ 180 foi kit. **Hoje isso não incomoda
   porque o preço é imutável; no instante em que a edição for liberada, a série histórica
   fica cega.** O molde de como fazer certo já existe no repositório e é do mesmo tipo de
   dado: `pagamento.taxaCongelada` (RN-179). **Esta passa a ser a tarefa prioritária da onda
   D**, no lugar da blindagem de valor.
2. **Nome e composição derivam do doc vivo.** Renomear um kit reescreve o que a confirmação
   de uma compra antiga mostra (`CheckoutFlow.tsx:2052`, via `kitNomeFromId`), e trocar os
   itens reescreve o checklist do balcão (`_lib/balcao.ts:260`). **Nenhuma Rule impede isso
   hoje.** Se "pedidos já realizados intocados" é o contrato que ele escreveu, isto o viola
   sem tocar em dinheiro — e é a lacuna que ele não viu ao dar a ordem, porque ela não
   parece dinheiro.

### O que a onda D constrói

As três travas de hoje (tela `KitEditor.tsx:86`, Rule `firestore.rules:1030-1033`, Function
`guardPreco.ts:31-49`) **abrem para o kit e continuam fechadas para evento e lote**. A Rule
é a fechadura real, porque `salvarKit` é escrita direta de cliente.

Junto, e não depois: o pedido passa a **carimbar** o preço do kit na linha, no molde do
`taxaCongelada`. Sem isso, a edição sobe cega.

⚠️ **Bordas que a spec nomeia e a onda tem de tratar:** o gatilho das travas hoje é
`qtdInscritos > 0`, que conta **qualquer status**, inclusive PIX pendente (RN-487). Um
comprador com PIX vivo está no meio de uma cotação; se o preço do kit mudar entre a cotação
e a confirmação, ele paga um número e a tela mostrou outro. **Editar preço de kit com PIX
pendente na praça precisa de resposta escrita** — congelar durante a janela, ou recusar a
edição, ou aceitar a divergência com aviso. Não decido: entra como borda nomeada da onda D.

## Parte 3 · RN-576 · kit é conjunto de itens cadastrados

> *"Somente posso adicionar itens no kits, que já estejam cadatrados como um item indivudal,
> Pois um kit é um conjunto de itens, e essa contagem deve ser feita a partir disso."*

### O achado que barateia metade e encarece a outra

**As duas coisas já existem, e não se falam.**

Existe catálogo real: `interface ItemKit` (`packages/core/src/eventos/kit.ts:535`), coleção
`itensKit/{itemId}`, com nome, grade de tamanhos, marca, origem, e o vínculo N:N em
`item.kits: string[]` (`:566`, fonte de verdade da RN-215), mais o índice inverso `usadoEm?`
mantido por Function.

E existe, **em paralelo**, uma lista de texto livre: `Kit.itens: string[]` (`:92`), que o
próprio core descreve como *"a visão é decorativa"* (`:57-58`).

**Convivem na mesma tela do editor sem nenhuma ponte:** o checklist do catálogo está em
`KitEditor.tsx:445-471`, a lista digitada em `:556-602`, o estado é separado desde a
declaração (`itensSel` em `:124-126`, `itensKit` em `:107`), e no `salvar` (`:275-311`) o
payload manda as strings e depois, em bloco separado, sincroniza o catálogo. **Nada lê um
para preencher o outro.**

Então o pedido dele não é "construa o catálogo" — o catálogo existe e já é gravado. É
**"pare de aceitar texto livre e derive a lista do catálogo"**.

### O que a regra crava

O item individual é a unidade. O kit **referencia** itens do catálogo, e "o que está
incluso" **deriva** dessa referência em vez de ser digitado. A contagem de itens do kit é a
contagem dos itens referenciados. Texto livre deixa de ser porta de entrada.

**Custo: nenhuma migração de dado.** Os dois campos já existem e já são gravados, e
`ItemKit.nome` é exatamente o texto que hoje se digita à mão. O trabalho é de tela e de
regra de precedência.

⚠️ **A parte cara, e é uma só: quantidade não existe.** `ItemKit` não tem campo de
quantidade e `Kit.itens` é string solta. Uma coluna "Qtd." na tabela que ele pediu **exige
campo novo no core e nas Rules**. Por isso o item 5 dele se parte em dois na fila: a **tabela
sem quantidade é onda A** (é troca de `<ul>` por `Table`, com o dado que já existe), e a
**tabela com quantidade é onda D** (é modelo).

⚠️ **A borda do acervo:** kits que já existem têm `Kit.itens` preenchido com strings que
podem não casar com nenhum `ItemKit`. A regra não pode inutilizar documento legado — leitura
continua aceitando o que está gravado, e a exigência morde na **escrita**, que é a mesma
disciplina que a RN-559 aplicou ao piso de venda (*"não entra em `parseLote`, porque leitura
e shape precisam continuar aceitando doc legado"*). A tela mostra o que existe, marca o que
não casa, e o organizador resolve item a item.

## Aceite

**Caixa (depende do CAIXA-1):** o que subir tem propósito declarado na própria tela, e a
soma da coluna bate com o cabeçalho — ou a tabela não existe mais.

**RN-575:** o organizador edita preço de kit com venda no evento; um pedido criado **antes**
da edição mostra o mesmo valor em todas as superfícies depois dela — provado por teste que
cria pedido, edita preço e relê as seis superfícies; o pedido passa a carimbar o preço do
kit na linha; evento e lote continuam recusando edição de preço, com o teste da RN-200 ainda
verde; a borda do PIX pendente tem resposta escrita e testada.

**RN-576:** não é possível gravar em "o que está incluso" um texto que não corresponda a um
item do catálogo; a lista deriva do catálogo; a contagem deriva da lista; documento legado
continua legível e é sinalizado, nunca apagado.

## Vizinhos

`00-medicao-kits-caixa-e-terciario.md` §14 e §15 para a medição inteira.
`04-fila-em-ondas.md` para tamanho e ordem. `05-rns-delta.md` para os enunciados.
