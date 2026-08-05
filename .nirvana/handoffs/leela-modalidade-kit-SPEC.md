# SPEC-MODALIDADE-KIT — a lista que ninguém edita, e o lote que dispensa o kit

Trace `leela-pixreal-diag-20260804` · lane `SPEC-MODALIDADE-KIT` · employee `sf-cto`
Território **`leela-specs/` apenas** · **zero linha de código** · sem deploy.

---

## As duas falas do dono

> "nao, na verdade é na modalidade mesmo! mas pode acontecer de determinado lote nao ter o Kit.
> Como fariamos nesse caso? E precisamos editar as modalidades."

Três coisas encaixadas. Uma **ratificação** (o kit fica na modalidade, o que fecha a decisão D-2 do
diagnóstico de 04/08 e recusa `Kit.lotes[]`). Um **caso não coberto** (um lote que não carrega o
kit). E um **pedido direto e independente** (editar a lista de modalidades, que hoje não tem
caminho nenhum).

Entre três desenhos apresentados, ele escolheu o **interruptor no lote**, com a limitação declarada
antes da escolha e aceita: **é tudo ou nada**, não permite escolher um kit entre três.

---

## O que a apuração acrescentou ao que o DIAG já sabia

O diagnóstico de 04/08 tinha o essencial. Sete fatos novos mudaram o desenho, e todos são medidos.

**1. O nome da modalidade está gravado em onze lugares, não em três.** Além de `Lote.modalidade`,
`Kit.modalidades[]` e `inscrito.modalidade`, ele vive em `evento.percursos[].nome` (segunda cópia
**dentro do mesmo documento**, e é o preço legado consultado por nome em
`createInscricaoCharge.ts:929`), no mapa `financeiro/current.inscritos.porModalidade` chaveado pelo
nome, em `campanha.segmento.referencia`, em `transferencias/{id}.novaModalidade` e no HMAC da trava
de PIX. Inventário completo em `02-spec-modalidade-e-kit.md` §"O mapa do nome".

**2. O nome está dentro da chave primária do lote.** `novoLoteId` monta o docId como
`` `${modalidade}-lote-${ordem}` `` (`loteForm.ts:254-255`). Uma renomeação não reescreve docId.

**3. `modalidadeExisteNoEventoPai` é checada no update, não só no create**
(`firestore.rules:1067-1076`, chamada em `:1134` **e** `:1142`). Isso muda o vocabulário do
problema: tirar um nome da lista não órfãna os lotes daquela modalidade — **inutiliza os
documentos**, inclusive para a escrita que corrigiria a modalidade deles.

**4. `eventoDegradado` devolve `modalidades: []` incondicionalmente**
(`packages/api-client/src/eventos/queries.ts:186-187`), sem olhar o campo bruto. Um evento que
degradou por `janelasEntrega` tem a lista perfeita no banco e vazia na projeção; um editor que
grave "a lista que eu vi" apaga modalidades boas, e a escrita passa em todas as Rules.

**5. A degradação só existe na listagem.** A leitura pontual mantém o fail-fast de propósito
(`queries.ts:117-123`), então o organizador vê o evento degradado na lista, clica, e a tela de
detalhe não abre. **A porta de conserto está atrás da porta quebrada.**

**6. O `kitId` real já é persistido no inscrito** (`createInscricaoCharge.ts:1704-1707`),
contradizendo o comentário de follow-up ainda vivo em `checkout/tipos.ts:64-66`.

**7. Não existe reserva de estoque em lugar nenhum.** O aprovisionamento é
`max(0, qtdVendida − estoqueFisico)` recomputado; a vaga do lote é recontada por `virarLote`, nunca
decrementada; e `Kit.capacidade`, contra a leitura intuitiva da palavra, **não bloqueia venda
nenhuma** — não é lida no checkout nem decrementada, servindo só à capacidade derivada do evento e
à matriz de estoque do painel.

---

## As decisões, com a razão de cada uma

| Operação | Regra escolhida | Por quê |
|---|---|---|
| **Acrescentar** | Livre dentro da fronteira, escrita **aditiva** (`arrayUnion`), tocando as duas listas | Nada aponta para um nome que ainda não existe. Aditivo defende contra duas abas abertas. `percursos[]` precisa de leitura-e-checagem porque o elemento é objeto |
| **Renomear** | **Permitido**, como migração transacional de cinco referências num commit, pai antes dos filhos. Nome já existente é recusado | Proibir não impede: "criar nova e migrar na mão" **é** a mesma operação, com a mesma janela, sem transação. E na janela entre duas escritas separadas o lote fica inutilizado pela própria Rule, inclusive para a escrita que fecharia a janela |
| **Renomear · docId** | Fica com o nome antigo; só o campo migra | O docId é chave estrangeira de `pedidos.itens[].loteId` e é por ele que `virarLote` reconta. Recriar o documento move uma chave que o dinheiro referencia — inofensivo hoje, e um gesto errado a ensinar ao código |
| **Remover** | **Só quando nada aponta**; a recusa **nomeia** cada lote, kit e campanha | Remover é a única sem destino, e o vazio inutiliza os lotes. A cascata num gesto só foi recusada: apagar lote é apagar preço e janela, e o botão a reboque não deixa medir o que se perdeu — item MODAL-2 |
| **Fronteira temporal** | **Sem venda**, e não "sem venda e rascunho" | `qtdInscritos` conta qualquer status (RN-487), então PIX vivo já fecha a lista; o modo de falha de quem está no checkout é **recusa**, nunca preço errado; e exigir rascunho pioraria o caso exato do dono, porque `status` é escrita de Function |
| **Interruptor** | `incluiKitDaModalidade?`, **ausente ≡ ligado**, zero migração, **fora** do congelamento da RN-497 | Nenhum lote existente muda de comportamento. Não congela porque o `preco` do lote não se move e o caso pós-venda é banal (o kit acabou) |
| **Checkout com kit desligado** | O filtro devolve vazio, a etapa cai no ramo que **já existe**, e a frase vira única: **"Esta inscrição não inclui kit."** | Sem etapa nova, sem tela nova, sem condição nova de layout. A obrigatoriedade já é condicional ao mesmo filtro. Para quem compra, "a modalidade não tem kit" e "este lote não inclui" são o mesmo fato |
| **Quem já comprou** | Nada muda, e a regra escreve isso | Cotação congelada no pedido (RN-179); kit gravado duas vezes no inscrito; balcão e página do ingresso leem o inscrito, nunca o lote |
| **Estoque** | Desligar **não libera nada** | Não há reserva para liberar. O único efeito é `qtdVendida` parar de crescer pelas vendas daquele lote |

---

## A borda que a fala do dono não previu

**"Sem kit" é um kit de verdade, com preço negativo (RN-211).** Num evento que use esse desenho,
desligar o interruptor tira o desconto do cardápio e o comprador daquele lote passa a pagar
**mais**, sem que o `preco` do lote mude uma vírgula. É o único caminho pelo qual este campo mexe
no que alguém paga, e ele tem de aparecer ao organizador **no gesto**, com o número. Subiu ao
painel como **KITLOTE-1**, junto da pergunta irmã (se o interruptor congela pós-venda).

---

## Interação com a RN-487, declarada e não presumida

A spec **não** assume que `qtdInscritos` vá mudar de significado. A RN-487, selada em 05/08, crava
que as oito guardas de configuração — inclusive a de `modalidades` — continuam lendo o total. A
RN-500 escreve contra esse contador exatamente como ele é hoje e o **usa como argumento a favor da
fronteira**: contar qualquer status é o que faz uma cobrança PIX viva fechar a lista antes de
qualquer pagamento. Se aquele campo mudar de significado um dia, a RN-500 muda de fronteira junto,
e a dependência está escrita nos dois lugares.

---

## O que ficou registrado como dívida, sem virar tarefa bloqueante

**`modalidades[]` e `percursos[].nome` são duas listas do mesmo fato**, no mesmo documento,
sincronizadas por um único lugar do produto (`EventoForm.tsx:203-206`), e a segunda é preço legado
consultado por nome. A spec passa a tratá-las como uma só em toda operação, o que contém o risco
sem resolver a deriva. Unificar é rodada própria, com migração de documento vivo.

---

## Entregue

`leela-specs/02-rodadas/2026-08-05-modalidade-e-kit/` com quatro arquivos (decisões, spec, delta de
RN, fila). **RN-500 a RN-505** canônicas em [[LEELA-E04-config-vendas]], com deltas de fronteira em
[[LEELA-E03-operacao-evento]] e [[LEELA-E12-landing]]. Histórias **S316** e **S317** com dez tarefas,
seis marcadas ⚔ e uma ⚔⚔. Boards, checklist, índice de regras e painel de decisões atualizados na
mesma aterrissagem.

**Nada retido.** As três respostas do dono ajustam desenho, não destravam tarefa.
