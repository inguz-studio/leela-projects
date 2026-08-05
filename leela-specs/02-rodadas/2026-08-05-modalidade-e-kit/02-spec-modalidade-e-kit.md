---
tags: [leela, spec, rodada, modalidade, kit, lote, integridade-referencial, checkout]
trace: leela-pixreal-diag-20260804
lote: SPEC-MODALIDADE-KIT
data: 2026-08-05
---

# 02-spec · editar a modalidade, e o lote que dispensa o kit

> Duas partes que só têm um assunto em comum: a modalidade é referenciada **por nome, em texto**,
> e é isso que torna as duas caras. A Parte 1 resolve editar a lista sem quebrar o que aponta para
> ela. A Parte 2 acrescenta um campo ao lote e gasta o resto do fôlego nas bordas que o campo abre.
>
> Toda afirmação sobre o repositório tem arquivo e linha. Nada foi construído.

## O mapa do nome

A modalidade não tem entidade, não tem id e não tem documento. Ela é uma **string dentro de um
array no documento do evento**, e todo o resto do produto a referencia copiando esse texto. A
varredura devolveu **onze** lugares em que o nome fica gravado:

| # | Onde o nome vive | Arquivo | Natureza |
|---|---|---|---|
| 1 | `evento.modalidades[]` | `packages/core/src/eventos/evento.ts:120-121`, escrito em `functions/src/eventos/criarEvento.ts:389` | fonte |
| 2 | `evento.percursos[].nome` | `evento.ts:87-90, 127`, escrito em `criarEvento.ts:390-393` | **segunda cópia no mesmo documento** |
| 3 | `Lote.modalidade` | `packages/core/src/eventos/lote.ts:62-67` | discriminador da query `where modalidade == X orderBy ordem` |
| 4 | **o docId do lote** | `apps/painel/.../lotes/_lib/loteForm.ts:254-255`, `` `${modalidade}-lote-${ordem}` `` | **nome dentro da chave primária** |
| 5 | `Kit.modalidades[]` | `packages/core/src/eventos/kit.ts:84-85` | oferta |
| 6 | **`inscrito.modalidade`** | `packages/core/src/eventos/inscrito.ts:137`, escrito em `createInscricaoCharge.ts:1710` | **venda que já aconteceu** |
| 7 | **`financeiro/current.inscritos.porModalidade`** | `functions/src/eventos/agregarFinanceiro.ts:68-69, 189-194` | **mapa chaveado pelo nome** |
| 8 | `financeiro/current.receitaPorModalidade` | `packages/api-client/src/eventos/queries.ts:244-245, 287-289` | agregado opcional, mesma chaveação |
| 9 | `campanhas/{id}.segmento.referencia` | `packages/core/src/eventos/campanha.ts:153-163`, consumido em `enviarCampanha.ts:435-438` | segmento `por_modalidade` |
| 10 | `transferencias/{id}.novaModalidade` e o docId | `functions/src/finance/requestTransfer.ts:381-382, 441` | troca de ingresso |
| 11 | a impressão digital da trava de PIX | `functions/src/checkout/travaCobrancaPix.ts:142, 155-158` | HMAC do carrinho |

As linhas em negrito são a razão de esta spec existir. Um `Lote` órfão é um defeito recuperável.
Um agregado chaveado por um nome que mudou é um número errado que ninguém percebe, porque ele não
some: ele **se divide em duas chaves** no próximo recompute, e as duas parecem legítimas.

**A linha 2 é uma deriva que esta spec herda e precisa carregar.** `modalidades[]` e
`percursos[].nome` são duas listas do mesmo fato dentro do mesmo documento, mantidas em sincronia
por um único lugar do produto: o formulário de criação, que faz
`percursos: values.modalidades.map((m) => ({ nome: m, preco: 0 }))`
(`apps/painel/src/routes/eventos/novo/EventoForm.tsx:203-206`). Nada mais garante a sincronia, e a
segunda lista não é decorativa: ela é o preço legado consultado por nome no checkout
(`createInscricaoCharge.ts:929`). **Toda operação desta spec trata as duas listas como uma só**, e
a Rule ajuda, porque `percursosEditaveis` congela as duas juntas.

**O que NÃO grava o nome**, medido e registrado para que ninguém procure de novo: o ingresso e o
QR leem do inscrito ao vivo (`emitirIngressos.ts:246, 319`, sem campo próprio); `pedidos/{id}.itens[]`
carrega `inscritoRef` e `loteId`, nunca a modalidade (`packages/core/src/pedidos/pedido.ts:123-127`);
o corpo dos e-mails é renderizado na hora e não é persistido (`templates.ts:444-446`); o
aprovisionamento chaveia por `itemId__[corte__]tamanho`, sem modalidade
(`aprovisionamento.ts:5-6`); e a demografia não a menciona.

E há uma trava de servidor que muda o desenho inteiro. A Rule do lote exige que
`lote.modalidade` conste de `evento.modalidades` **no create e também no update**
(`firestore.rules:1069-1075`, chamada em `:1134` e `:1142`):

```
function modalidadeExisteNoEventoPai() {
  return request.resource.data.modalidade
    in get(/databases/$(database)/documents/eventos/$(eventoId)).data.get('modalidades', []);
}
```

Tirar um nome da lista do evento não órfãna os lotes daquela modalidade: **ela os inutiliza**.
O lote continua existindo, continua sendo lido, continua precificando, e nenhuma escrita passa
mais por ele. Nem para corrigir a modalidade, que é justamente a escrita que consertaria o
estrago. A única saída que sobra é apagar o lote, e apagar só é permitido com `vendidos == 0`
(`firestore.rules:1146-1149`).

---

# Parte 1 · editar a lista de modalidades

## O que já está liberado, e o que falta

As Rules **já autorizam** o cliente a alterar `modalidades` enquanto o evento não vendeu
(`firestore.rules:551-561`):

```
function percursosEditaveis() {
  return resource.data.get('qtdInscritos', 0) == 0
    || !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['percursos', 'modalidades']);
}
```

O que falta é de cliente, nas duas pontas. O contrato de escrita exclui o campo **por escrito**
(`packages/api-client/src/eventos/configuracoesEvento.ts:13-15`):

> *"NÃO envia `percursos`/`modalidades`: além de travados após a 1ª venda (RN-200), são editados
> no fluxo de criação/lotes."*

A justificativa do comentário é falsa na segunda metade e sempre foi: a tela de lotes nunca criou
modalidade, e o próprio diagnóstico de 04/08 desfez o círculo em que as duas telas apontavam uma
para a outra. A primeira metade continua verdadeira e é a fronteira desta spec.

## As três operações não são a mesma operação

### Acrescentar · livre, e é um caso à parte

Acrescentar um nome novo não invalida nada, porque nada aponta para um nome que ainda não existe.
Nenhum lote, nenhum kit, nenhum inscrito. A operação é aditiva por natureza, e a escrita correta
é aditiva também: `arrayUnion` do nome novo, e não a regravação da lista inteira.

Isso não é preciosismo. É a defesa contra duas abas abertas: quem regrava a lista inteira a partir
do que sua tela leu apaga o que a outra aba acrescentou, em silêncio, e o Firestore não tem como
reclamar, porque a escrita é válida.

**Acrescentar toca as duas listas.** A modalidade nova entra em `modalidades[]` e entra em
`percursos[]` como `{ nome, preco: 0 }`, que é exatamente o que a criação faz
(`EventoForm.tsx:203-206`). Uma modalidade que entra só na primeira lista nasce sem preço legado, e
o caminho de fallback do checkout deixa de encontrá-la (`createInscricaoCharge.ts:929`). O
`percursos[]` não aceita `arrayUnion` com a mesma garantia, porque o elemento é objeto e a
igualdade do `arrayUnion` é estrutural: acrescentar `{nome, preco: 0}` duas vezes é idempotente,
mas acrescentar `{nome, preco: 0}` quando já existe `{nome, preco: 50}` cria duplicata. A escrita
correta lê, checa por nome e só então acrescenta, o que empurra a operação para dentro da mesma
Function transacional das outras duas.

**Acrescentar segue a mesma fronteira temporal das outras duas**, e a razão não é a integridade
referencial: é a Rule. `percursosEditaveis` congela o array **inteiro** depois da primeira venda,
sem distinguir a natureza da mudança. Liberar só o acréscimo pós-venda exigiria abrir a Rule para
uma diferença que ela não sabe calcular (Rules não iteram listas, limitação declarada no próprio
arquivo em `:566-570`). Fica como está, e o caso "acrescentar uma modalidade num evento que já
vendeu" é decisão futura, não desta rodada.

### Renomear · permitido, e nunca como edição de campo

A leitura tentadora é proibir a renomeação e mandar o organizador criar a nova e migrar na mão.
Ela foi **recusada**, e a razão é que essa sequência **é** a renomeação, executada manualmente,
com a mesma janela de inconsistência e sem transação nenhuma protegendo o meio dela. Proibir a
operação não a impede: só garante que ela seja feita pior.

Renomear é migração, e migração é do servidor:

1. Uma Function transacional lê o evento, os lotes, os kits e as campanhas do evento.
2. Escreve, **num único commit**: `evento.modalidades[]` e `evento.percursos[].nome` com o nome
   novo no lugar do velho, cada `Lote.modalidade` que casava com o velho, cada `Kit.modalidades[]`
   que o continha, e cada `campanha.segmento.referencia` de segmento `por_modalidade`.
3. Carimba a trilha com quem, quando, de → para e motivo, no mesmo formato do ajuste de
   capacidade da RN-304.

A ordem importa e ela é obrigatória mesmo dentro da transação, porque a Rule do lote consulta o
documento do evento: o pai antes dos filhos. Renomear o lote primeiro seria recusado, porque o
nome novo ainda não constaria da lista do pai.

**Renomear para um nome que já está na lista é recusado.** Isso não é renomeação: é fusão de duas
modalidades, com dois conjuntos de lotes que passariam a disputar a mesma sequência de virada e a
mesma invariante de não sobreposição da RN-300. Ninguém pediu, e o desenho de uma fusão é outro.

### O docId do lote carrega o nome, e ele fica como está

`novoLoteId` constrói a chave primária do lote como `` `${modalidade}-lote-${ordem}` ``
(`apps/painel/src/routes/eventos/lotes/_lib/loteForm.ts:254-255`). Uma renomeação não pode reescrever
um docId; ela pode apenas apagar o documento e criar outro.

**Decisão: o docId fica com o nome antigo, e só o campo é migrado.** A razão não é preguiça. O
docId do lote é chave estrangeira de dado de venda: `pedidos/{id}.itens[].loteId` aponta para ele
(`packages/core/src/pedidos/pedido.ts:123-127`) e é por ele que `virarLote` reconta os vendidos
(`functions/src/eventos/virarLote.ts:165-201`). Apagar e recriar o lote move uma chave primária que
o dinheiro referencia. Hoje isso é inofensivo, porque a operação só existe antes da primeira venda
e não há pedido nenhum; mas construir a operação como "recria o documento" é ensinar ao código um
gesto que fica errado no dia em que alguém relaxar a fronteira.

O resíduo é cosmético e declarado: um lote de uma modalidade renomeada para "Meia maratona" pode
ter docId `21k-lote-1`. Nenhuma tela mostra docId de lote. Que os lotes novos parem de embutir o
nome na chave é dívida registrada, não pré-requisito, e está na fila técnica.

**Por que não duas escritas separadas.** Entre a escrita do evento e a dos lotes existe uma janela
em que todo lote da modalidade aponta para um nome que não está mais na lista. Nessa janela o
lote está inutilizado pela `modalidadeExisteNoEventoPai`, inclusive para a escrita seguinte,
que é exatamente a que fecharia a janela. Duas escritas separadas não são uma versão mais barata
da transação: são uma versão que pode travar no meio e não sair de lá.

**O que a fronteira temporal já resolve de graça.** Com `qtdInscritos == 0` não existe inscrito,
o mapa `porModalidade` do agregado está vazio, e nenhum e-mail de ingresso foi enviado. As três
denormalizações que a transação **não** alcança são exatamente as três que não têm linha nenhuma
naquele momento. A renomeação é segura porque a fronteira a torna segura, e não porque a
transação seja completa.

### Remover · só quando nada aponta, e a recusa diz quem impede

Remover é a única das três que não tem destino. Renomear leva as referências junto; remover as
deixa apontando para o vazio, e a `modalidadeExisteNoEventoPai` transforma "apontando para o
vazio" em "inutilizado", como descrito no mapa acima.

A regra: **a remoção é recusada enquanto existir um lote, um kit ou uma campanha referenciando o
nome**, e a recusa **nomeia quem impede**, com o nome de cada um, não com uma frase genérica.

O organizador tem então um caminho claro e reversível: apaga os lotes (permitido, porque sem
venda `vendidos == 0`), tira a modalidade do kit ou apaga o kit (permitido, porque sem venda no
evento o create e o delete de kit estão liberados, `firestore.rules:1017-1027`), e aí remove a
modalidade.

**A alternativa recusada** é a tela oferecer "remover a modalidade e tudo que aponta para ela" num
gesto só. Ela é mais confortável e destrói mais: apagar um lote é apagar preço e janela que
alguém configurou, e o botão que faz isso a reboque de outra ação não deixa a pessoa medir o que
perdeu. Sobe ao painel como **MODAL-2**, com o default sendo recusar e nomear.

Remover também tira o nome das duas listas, `modalidades[]` e `percursos[]`.

## A forma: uma porta só, no servidor

As três operações terminam numa **única Function transacional**, e não em três caminhos.
Acrescentar poderia ser uma escrita de cliente, porque a Rule já a autoriza; ele não fica lá por
três razões medidas. A sincronia com `percursos[]` exige ler antes de escrever, e ler-checar-escrever
no cliente é a receita da corrida entre duas abas. A recusa de nome duplicado precisa do estado
atual. E manter as três num lugar só é o que garante que a trilha de auditoria exista para as três,
em vez de existir para as duas que passaram pelo servidor.

O custo é de fiação, não de invenção: a coleção de auditoria, o motivo obrigatório de 3 a 500
caracteres e o formato de trilha já existem, todos vindos do ajuste de capacidade da RN-304.

A Rule permanece como está. Ela continua sendo a fronteira que congela o array depois da primeira
venda, e a Function opera **sob** ela, com credencial de administração, o que significa que a
Function precisa checar `qtdInscritos == 0` por conta própria. Uma Function que escreve com
privilégio herda o dever de reimplementar a guarda que ela contorna, e o caso que prova isso não
pode faltar na suíte.

## A fronteira temporal, e por que ela é "sem venda" e não "sem venda e rascunho"

A pergunta é legítima: um evento **publicado** e sem venda pode ter a modalidade trocada por baixo
de quem está com a página aberta. A fronteira adotada é **sem venda**, exatamente a que a Rule já
aplica, e ela se sustenta em três medições.

**Primeira: `qtdInscritos` conta qualquer status.** A RN-487, selada em 05/08, crava que as oito
guardas de configuração continuam lendo o total, e o total inclui pendente. Uma cobrança PIX viva,
sem pagamento nenhum, já fecha a lista. A pessoa que a fronteira poderia pegar no meio do caminho
é apenas a que está com a tela aberta e **ainda não gerou cobrança** — quem gerou já travou a
configuração do evento inteiro.

**Segunda: o modo de falha é recusa, não preço errado.** Quem estiver com o checkout aberto sob o
nome antigo manda esse nome ao servidor. O `computeSaleState` resolve o lote ativo pela lista de
lotes daquela modalidade (`packages/core/src/checkout/saleState.ts:281`) e o kit pela
`kit.modalidades` (`:271-273`). Sem lote para o nome, a venda vem fechada; com kit fora da
modalidade, a chamada lança. Nos dois caminhos a compra é **recusada**, e nenhum caminho cobra um
preço que a tela não mostrou. Fail-closed é o comportamento correto para dinheiro, e ele já está
lá.

**Terceira: exigir rascunho tornaria o produto pior justamente no caso do dono.** O organizador
descobre a modalidade errada olhando a página pública. Exigir despublicar para consertar um nome
significa tirar a página do ar para corrigir um typo, e `status` é escrita exclusiva de Function
(`firestore.rules:536-542`, ADR-005): o organizador pode nem ter essa porta.

**O que a fronteira não dispensa.** Editar a lista de um evento **publicado** exige confirmação
que nomeie a consequência antes do gesto, não depois: a página pública muda no mesmo instante, e
quem estiver com o checkout aberto vai precisar recomeçar. Isso é requisito de tela, não trava.

A escolha sobe ao painel como **MODAL-1**, com este default e com a alternativa escrita.

## O caso degradado, que é uma armadilha e não um beco

Um documento de evento que não passa no parse vira `eventoDegradado`
(`packages/api-client/src/eventos/queries.ts:165-199`), e o diagnóstico de 04/08 já provou o
efeito disso na tela do organizador: a mensagem saía com `undefined` literal. A edição de
modalidades tem de ser o caminho de recuperação. E ela é, com uma condição que precisa estar
escrita, porque errá-la destrói dado.

**`eventoDegradado` devolve `modalidades: []` incondicionalmente.** A linha é literal:

```ts
modalidades: [],
percursos: [],
```

Ela não olha o campo bruto. Um evento que degradou por causa de `janelasEntrega` ou de
`faixaChips` — que o próprio comentário do arquivo aponta como "fontes mais prováveis do defeito"
— tem a lista de modalidades **perfeita no banco** e **vazia na projeção**. Um editor que grave
"a lista que eu vi" sobre esse evento apaga modalidades boas, e a escrita passa em todas as
Rules, porque uma lista vazia é uma lista válida.

**A degradação só acontece na listagem, e é aí que o beco aparece.** A leitura pontual mantém o
fail-fast de propósito (`queries.ts:117-123`): `getEvento` **lança** num documento que não parseia.
O organizador vê o evento degradado na lista, clica nele, e a tela de detalhe do evento não abre.
A porta de conserto está atrás da porta quebrada.

Quatro exigências, e a terceira é a que transforma o beco em caminho:

1. **A escrita nunca parte da projeção.** Todas as três operações são da Function, que lê o
   documento direto e não passa pelo parse do api-client. A projeção degradada não é insumo de
   escrita em nenhum ponto.
2. **O acréscimo é aditivo mesmo assim.** `arrayUnion` sobre a lista real, não regravação. Uma
   segunda aba aberta não pode desfazer o que a primeira acrescentou.
3. **A recuperação é alcançável a partir da lista.** O evento degradado precisa de uma ação
   própria na listagem, que abre o reparo sem depender da tela de detalhe. A alternativa é
   `getEvento` ganhar um modo degradado, e ela foi recusada: aquele fail-fast é deliberado e
   protege toda tela que assume um evento válido. O caminho barato é uma porta lateral para o
   reparo, não afrouxar a leitura de que o produto inteiro depende.
4. **A tela do reparo diz o que ela sabe e o que ela não sabe.** Ela mostra a lista real, lida
   pela Function, e diz que o documento tem outro campo inválido, com o nome do campo. Publicar
   exige modalidade não vazia (`functions/src/eventos/publicarEvento.ts:69-71`), então recuperar a
   lista é necessário e pode não ser suficiente.

O evento genuinamente sem modalidade, com `modalidades: []` de verdade, parseia normalmente e nem
chega a degradar. Ele cai na tela de configurações comum, e acrescentar é a operação de que ele
precisa.

---

# Parte 2 · o interruptor de kit no lote

## O campo, e o que ele não é

`Lote` ganha `incluiKitDaModalidade?: boolean`. **Ausente equivale a ligado**, e é isso que
garante que nenhum lote existente mude de comportamento: nenhum documento no banco tem o campo, e
todo leitor usa `data.get('incluiKitDaModalidade', true)`. Não há migração e não pode haver, porque
migração aqui seria escrever `true` em documento que já se comporta como `true`.

O campo **não** cria vínculo entre kit e lote. `Kit.modalidades[]` continua sendo o único vínculo,
o kit continua valendo em todos os lotes da modalidade, e o lote apenas declara se inclui a oferta
inteira. A limitação foi declarada ao dono e aceita: é tudo ou nada, três kits na modalidade
somem juntos.

**O campo não entra no congelamento da RN-497.** Aquela regra congela `preco`, `ordem` e
`modalidade` depois da primeira venda do lote. O interruptor fica de fora porque o preço do lote
não se move quando ele vira, e porque o caso legítimo pós-venda existe e é banal: o kit acabou no
meio do lote. Existe uma consequência de dinheiro nessa escolha, ela está medida logo abaixo, e
por causa dela o congelamento sobe ao painel como alternativa em **KITLOTE-1**.

## O que o checkout faz

O checkout já sabe fazer isto, e é por aí que a resposta é barata.

O filtro é `kitsDaModalidade` (`apps/landing/.../checkout/tipos.ts:81-88`) e a etapa já tem um
ramo para lista vazia (`StepModalidadeKit.tsx:251-257`), que hoje diz:

> *"Nenhum kit para a modalidade {modalidade} — a inscrição vai sem kit."*

Com o interruptor desligado o filtro devolve vazio, e a etapa cai nesse ramo. **Não há etapa nova,
não há tela nova e não há condição nova de layout.**

A obrigatoriedade acompanha de graça, porque ela já é condicional ao mesmo filtro
(`CheckoutFlow.tsx:1711-1715`): *"escolha um kit"* só é exigido quando a lista de ofertados não é
vazia. Com o interruptor desligado a lista é vazia, e a compra segue sem cobrar uma escolha que
não existe. Nenhuma linha de validação precisa mudar.

O que muda é o texto, unificado nos dois casos:

> **"Esta inscrição não inclui kit."**

A unificação é deliberada. Para quem compra, "a modalidade não tem kit" e "este lote não inclui o
kit da modalidade" são o mesmo fato, e distinguir os dois obrigaria a explicar uma configuração
interna a quem só quer se inscrever. A frase nunca menciona interruptor, lote ou desligamento, e
essa proibição é de vocabulário, escrita na regra.

**O preço não muda por causa do interruptor.** O kit é um **delta** sobre o preço da inscrição
(RN-211, `saleState.ts:151`); sem kit, `kitPreco` é zero e o preço é o do lote, intacto.

**Com uma exceção que vale dinheiro e não é óbvia.** "Sem kit" é um kit de verdade, com documento
próprio e preço **negativo** (RN-211, `kitEhDesconto` em `kit.ts:118-120`). Num evento que use esse
desenho, desligar o interruptor tira o desconto do cardápio, e o comprador daquele lote passa a
pagar **mais** do que pagaria com o interruptor ligado, sem que o `preco` do lote tenha mudado uma
vírgula. É a única forma pela qual este campo mexe no que alguém paga, e ela precisa aparecer para
o organizador **no momento do gesto**, com o número.

## A recusa é do servidor

Esconder a etapa é interface. Um payload montado à mão pode declarar um `kitId` da modalidade e
comprar o kit num lote que não o inclui.

A recusa mora onde a irmã dela já mora. O `computeSaleState` já refuta kit fora da modalidade
(`packages/core/src/checkout/saleState.ts:271-274`) e já resolve o lote ativo daquela modalidade
(`:281`). A validação nova é a mesma frase, com o lote no lugar da modalidade.

**Detalhe de implementação que a fila precisa carregar:** hoje o bloco do kit roda **antes** da
resolução do lote ativo (kit em `:265-274`, lote em `:281`). A checagem nova depende do lote, então
ou o bloco do kit desce, ou a resolução do lote sobe. É reordenação dentro da mesma função pura, e
o teste que a protege é o de precificação que já existe.

## Quem já comprou

**Nada muda, e isso não é promessa: é o que o código faz.**

A cotação da compra está congelada no pedido (RN-179). O kit escolhido está gravado no inscrito
**duas vezes**: como enum canônico em `inscrito.kit` (RN-202) e como id real em `inscrito.kitId`
(`packages/core/src/eventos/inscrito.ts:139-147`, escrito em `createInscricaoCharge.ts:1704-1707`).
O balcão lê o inscrito, não o lote. A página do ingresso lê o inscrito
(`functions/src/http/ingressoPorLink.ts:243-245`). A entrega é devida, e nenhum caminho do produto
reconsulta o lote para decidir o que entregar.

A regra escreve isso mesmo assim, porque "nada muda" só é verdade enquanto ninguém escrever um
caminho que reconsulte, e é o enunciado que impede esse caminho de nascer.

## Estoque

**Desligar o kit num lote não libera estoque, porque não existe estoque reservado para liberar.**

O aprovisionamento é **movido pela demanda**, não por reserva. A conta é
`aEncomendar = max(0, qtdVendida − estoqueFisico)` (RN-224,
`packages/core/src/eventos/aprovisionamento.ts:266-269`), e `qtdVendida` é a soma de inscritos
confirmados que exigem aquele SKU. Nenhuma compra futura segura unidade nenhuma; o número reflete
o que já foi vendido. Com o interruptor desligado, a única mudança é que `qtdVendida` **para de
crescer** pelas vendas daquele lote. Nada retrocede, nada é devolvido, e nenhum documento de
aprovisionamento é tocado.

`Kit.capacidade` tem dois consumidores, e nenhum dos dois se move. Ela alimenta a capacidade
derivada do evento quando `evento.capacidade` está ausente, somando os documentos de kit
(`functions/src/overview/aggregateProfessionalDashboard.ts:86, 102`), e alimenta a matriz de estoque
do painel, onde `saldo = capacidade − totalRetirados`
(`apps/painel/src/routes/eventos/_lib/distribuicao.ts:199-209`). Os dois somam por documento de kit,
e o documento continua existindo com a mesma capacidade. O interruptor é do lote.

Vale registrar o que a varredura mostrou de passagem, porque contradiz a leitura intuitiva de
"capacidade": **`Kit.capacidade` não bloqueia venda nenhuma**. Ela não é lida no checkout, não é
decrementada e não aparece em `createInscricaoCharge`. O único estoque que gateia alguma coisa é a
vaga do lote, e mesmo ela é recontada, nunca reservada (`virarLote.ts:165-215`). Nada disso muda
nesta rodada; fica escrito para que a próxima pessoa não procure a reserva que não existe.

## A tela do lote quando a modalidade não tem kit

**O interruptor não aparece.** Não aparece desabilitado com explicação: não aparece.

Um controle cujas duas posições produzem o mesmo resultado é uma promessa falsa de capacidade, e a
casa já pagou por isso uma vez, quando a entrada inerte de Analytics no menu foi removida em vez de
recebida com tooltip (R9-B, RN-821). No lugar dele o slot carrega uma linha que diz o que há e
onde resolver: a modalidade não tem kit cadastrado, e o caminho é a aba de kits.

**E quando um kit for cadastrado depois, o lote passa a incluí-lo.** O campo ausente lê ligado, e é
o comportamento certo: o kit é da modalidade e vale nos lotes dela por default. Um organizador que
queira um lote sem kit precisa desligar o interruptor, que passa a existir no instante em que o
primeiro kit da modalidade nasce.

## O vocabulário

| Quem lê | O que lê |
|---|---|
| **Comprador**, sem kit por qualquer razão | **"Esta inscrição não inclui kit."** |
| Organizador, no editor do lote | **"Inclui o kit da modalidade"**, com o estado ligado por padrão |
| Organizador, modalidade sem kit | "Esta modalidade não tem kit cadastrado." |
| Organizador, ao desligar num evento com kit de desconto | o aviso nomeando o desconto que sai e o valor que o próximo comprador passa a pagar |

Proibido em qualquer superfície de comprador: "kit desligado", "kit desativado", "kit indisponível
neste lote", e qualquer frase que exponha o lote a quem está comprando. O comprador não sabe o que
é um lote e não precisa saber.

---

## O que esta spec deliberadamente não decide

**A seleção de kit por lote.** O dono viu e recusou. Se um dia o caso "este kit vale só no Lote 1"
aparecer com um job por trás, o desenho é `Kit.lotes[]` e ele é outra rodada, com efeito em
modelo, Rules, checkout e tela.

**Acrescentar modalidade depois da primeira venda.** A Rule congela o array inteiro e não sabe
calcular a diferença. Fica registrado como o único pedaço do pedido do dono que a fronteira
temporal não atende.

**Se o interruptor congela quando o lote vende.** Default em vigor: não congela. A alternativa
está em **KITLOTE-1**, junto do efeito do kit de desconto, porque as duas são a mesma pergunta de
dinheiro.
