---
tags: [leela, rn, regras-de-negocio, rodada, modalidade, kit, lote, integridade-referencial]
trace: leela-pixreal-diag-20260804
lote: SPEC-MODALIDADE-KIT
data: 2026-08-05
---

# 03-rns-delta · a lista que passa a ser editável, e o lote que dispensa o kit

> Delta de RN da lane SPEC-MODALIDADE-KIT. O enunciado canônico de cada regra vive no épico dono,
> consolidado na mesma aterrissagem ([[CONVENCAO-BOARDS]] §2). Este arquivo é o delta do dia e diz
> para onde cada uma foi.

## Prova de não colisão

A faixa mais alta com enunciado é a **RN-498**, criada em 05/08 pela lane SEAL-LOTES e registrada
em [[indice-de-regras-de-negocio]]. A **RN-499** é marcador de faixa sem enunciado e fica de fora
de propósito, pela mesma razão que manteve o RN-460 fora da rodada de juros: ressuscitar marcador
quebra a leitura de quem confia no índice. As faixas **483 a 485** continuam vagas pela reserva da
SPEC-CONTAS-LANDING e não foram tocadas.

Varredura por `RN-50[0-9]` e `RN-51[0-9]` sobre `leela-specs/`, `apps/`, `packages/`,
`functions/src/` e `firestore.rules`: **zero ocorrências**.

**Esta lane consome RN-500 a RN-505.**

## Novas

| RN | Regra | Épico dono | Lane |
|---|---|---|---|
| **RN-500** | **A lista de modalidades de um evento é editável enquanto ele não vendeu, e a fronteira é a que a Rule já aplica.** Hoje não existe caminho nenhum: `evento.modalidades[]` é escrito uma única vez, na criação (`functions/src/eventos/criarEvento.ts:389`), e o contrato de atualização exclui o campo por escrito (`packages/api-client/src/eventos/configuracoesEvento.ts:13-15`). A trava é de produto: `firestore.rules:550-561` (`percursosEditaveis`) **já autoriza** o cliente enquanto `qtdInscritos == 0`. A fronteira adotada é **sem venda**, e não "sem venda e rascunho", por três medições. `qtdInscritos` conta qualquer status (RN-487), então uma cobrança PIX viva já fecha a lista, e a única pessoa que a edição pode pegar no meio do caminho é a que ainda não gerou cobrança. O modo de falha dessa pessoa é **recusa**, nunca preço errado: sem lote para o nome antigo a venda vem fechada (`packages/core/src/checkout/saleState.ts:281`) e um kit fora da modalidade lança (`:271-273`). E exigir rascunho pioraria o produto no caso exato do dono, porque `status` é escrita de Function (ADR-005) e ele descobre o erro olhando a página pública: consertar um nome passaria a exigir tirar a página do ar. **A lista é duas listas.** `modalidades[]` e `percursos[].nome` (`packages/core/src/eventos/evento.ts:87-90, 127`) são cópias do mesmo fato no mesmo documento, sincronizadas por um único lugar do produto (`EventoForm.tsx:203-206`), e a segunda é o preço legado consultado por nome no checkout (`createInscricaoCharge.ts:929`). Toda operação trata as duas como uma só. **Requisito de tela:** editar a lista de um evento **publicado** exige confirmação que nomeie a consequência antes do gesto. Falsificação: um evento publicado com zero inscritos aceita a edição; o mesmo evento com uma cobrança PIX pendente e nenhum pagamento a recusa. | E04 (dona) · E03 e E12 (consomem) | SPEC-MODALIDADE-KIT |
| **RN-501** | **Renomear modalidade é migração atômica no servidor, nunca edição de campo.** O nome é referenciado por texto em onze lugares, e cinco deles são do próprio evento: `modalidades[]`, `percursos[].nome`, `Lote.modalidade`, `Kit.modalidades[]` e `campanha.segmento.referencia`. Uma Function transacional migra os cinco **num único commit**, com o pai antes dos filhos, porque a Rule do lote consulta o documento do evento (`firestore.rules:1067-1076`, chamada no create **e no update**, `:1134` e `:1142`). Duas escritas separadas não são uma versão mais barata: entre elas todo lote da modalidade fica **inutilizado**, inclusive para a escrita que fecharia a janela. **Proibir a renomeação foi recusado**, porque "criar nova e migrar na mão" é a mesma operação com a mesma janela e sem transação nenhuma protegendo o meio dela. **Renomear para um nome já presente na lista é recusado**: isso é fusão de modalidades, com dois conjuntos de lotes disputando a sequência de virada e a invariante da RN-300, e ninguém pediu. **O docId do lote fica com o nome antigo.** `novoLoteId` embute a modalidade na chave (`loteForm.ts:254-255`) e uma renomeação não reescreve docId; apagar e recriar moveria uma chave que `pedidos/{id}.itens[].loteId` referencia e por onde `virarLote` reconta (`virarLote.ts:165-201`). O resíduo é cosmético, nenhuma tela mostra docId de lote, e que lotes novos parem de embutir o nome é dívida registrada. **A trilha é obrigatória:** quem, quando, de → para e motivo, no formato do ajuste de capacidade da RN-304. Falsificação: renomear com um lote e um kit apontando para o nome antigo tem de deixar os dois apontando para o novo no mesmo commit; falhar no meio tem de não deixar nada escrito. | E04 (dona) · E03 e E06 (consomem) | SPEC-MODALIDADE-KIT |
| **RN-502** | **Remover modalidade só quando nada aponta para ela, e a recusa nomeia quem impede.** Remover é a única das três operações sem destino: renomear leva as referências junto, remover as deixa apontando para o vazio. E o vazio não é benigno, porque `modalidadeExisteNoEventoPai` é checada também no **update** do lote: tirar o nome da lista não órfãna os lotes, **inutiliza** os documentos, inclusive para a escrita que corrigiria a modalidade deles. A remoção é recusada enquanto existir lote, kit ou campanha referenciando o nome, e a recusa lista **cada um pelo nome**, nunca com frase genérica. O organizador tem caminho reversível: apagar os lotes (permitido sem venda, `firestore.rules:1146-1149`), tirar a modalidade do kit ou apagar o kit (permitido sem venda no evento, `:1017-1027`), e então remover. **A alternativa recusada** é remover em cascata num gesto só: apagar um lote é apagar preço e janela que alguém configurou, e o botão que faz isso a reboque de outra ação não deixa a pessoa medir o que perdeu — item **MODAL-2** do painel, com este default. Remover tira o nome das duas listas. Falsificação: remover uma modalidade com um lote apontando para ela devolve recusa nomeando o lote; remover a mesma modalidade depois de o lote ser apagado passa. | E04 (dona) · E03 (consome) | SPEC-MODALIDADE-KIT |
| **RN-503** | **O lote declara se inclui o kit da modalidade, e o default é incluir.** `Lote` ganha `incluiKitDaModalidade?: boolean`, e **ausente equivale a ligado** — nenhum documento no banco tem o campo, todo leitor usa `get(campo, true)`, e por isso nenhum lote existente muda de comportamento e não há migração. O campo **não** cria vínculo entre kit e lote: `Kit.modalidades[]` continua sendo o único vínculo, o kit continua valendo em todos os lotes da modalidade, e o interruptor é tudo ou nada — três kits na modalidade somem juntos. A limitação foi apresentada ao dono e aceita. **A recusa é do servidor.** Esconder a etapa é interface; um payload montado à mão declara um `kitId` da modalidade e compra o kit num lote que não o inclui. A validação mora onde a irmã dela já mora: `computeSaleState` já refuta kit fora da modalidade (`saleState.ts:271-274`) e já resolve o lote ativo (`:281`). Detalhe que a fila carrega: o bloco do kit roda **antes** da resolução do lote, então a checagem nova exige reordenação dentro da mesma função pura. **O campo não entra no congelamento da RN-497**, porque o `preco` do lote não se move quando ele vira e porque o caso pós-venda é banal — o kit acabou no meio do lote. Essa escolha tem consequência de dinheiro, declarada na RN-504, e o congelamento sobe como alternativa em **KITLOTE-1**. Falsificação: uma cotação que declare um kit da modalidade sobre um lote com o interruptor desligado tem de ser recusada pelo servidor, e não apenas ausente da tela. | E04 (dona) · E03 e E12 (consomem) | SPEC-MODALIDADE-KIT |
| **RN-504** | **Desligar o kit num lote não mexe em quem já comprou, não libera estoque, e o comprador nunca lê "kit desligado".** Três afirmações e nenhuma é promessa: as três são o que o código faz hoje, escritas para que nenhum caminho futuro as contrarie. **Quem comprou:** a cotação está congelada no pedido (RN-179) e o kit está gravado duas vezes no inscrito, como enum em `inscrito.kit` (RN-202) e como id real em `inscrito.kitId` (`inscrito.ts:139-147`); o balcão e a página do ingresso leem o inscrito, nunca o lote. A entrega é devida. **Estoque:** não existe reserva para liberar. O aprovisionamento é movido pela demanda, `aEncomendar = max(0, qtdVendida − estoqueFisico)` (RN-224, `aprovisionamento.ts:266-269`), com `qtdVendida` recomputado a partir de inscritos confirmados; desligar o interruptor só faz esse número **parar de crescer** pelas vendas daquele lote. Nada retrocede e nenhum documento de aprovisionamento é tocado. `Kit.capacidade` também não se move: os dois consumidores dela somam por documento de kit (`aggregateProfessionalDashboard.ts:86`, `distribuicao.ts:199-209`), e o documento continua lá. **Vocabulário:** o comprador lê **"Esta inscrição não inclui kit."**, a mesma frase para modalidade sem kit e para lote com o interruptor desligado, porque para quem compra os dois são o mesmo fato. Proibidas em superfície de comprador: "kit desligado", "kit desativado", "kit indisponível neste lote", e qualquer frase que exponha a palavra lote a quem está comprando. **A exceção que vale dinheiro:** "Sem kit" é um kit de verdade, com preço negativo (RN-211, `kitEhDesconto` em `kit.ts:118-120`). Num evento que use esse desenho, desligar o interruptor tira o desconto do cardápio e o comprador daquele lote passa a pagar **mais**, sem que o `preco` do lote mude. É o único caminho pelo qual este campo mexe no que alguém paga, e ele tem de aparecer ao organizador **no gesto**, com o número. Falsificação: desligar o interruptor num lote com vendas não altera nenhum `inscrito.kitId`, nenhum documento de aprovisionamento e nenhum valor de pedido. | E04 (dona) · E03 e E12 (consomem) | SPEC-MODALIDADE-KIT |
| **RN-505** | **A edição de modalidades nunca escreve a partir da projeção degradada, e a recuperação é alcançável.** `eventoDegradado` devolve `modalidades: []` e `percursos: []` **incondicionalmente** (`packages/api-client/src/eventos/queries.ts:186-187`), sem olhar o campo bruto: um evento que degradou por `janelasEntrega` ou `faixaChips` — que o próprio arquivo aponta como fontes mais prováveis do defeito — tem a lista perfeita no banco e vazia na projeção. Um editor que grave "a lista que eu vi" apaga modalidades boas, e a escrita passa em todas as Rules, porque lista vazia é lista válida. Por isso as três operações são da Function, que lê o documento direto, e o acréscimo é `arrayUnion`, que não apaga o que outra aba escreveu. **E há um beco a abrir:** a degradação só existe na listagem, porque a leitura pontual mantém o fail-fast de propósito (`queries.ts:117-123`) — o organizador vê o evento na lista, clica, e a tela de detalhe não abre. A porta de conserto está atrás da porta quebrada. A recuperação precisa de ação própria **na listagem**; afrouxar `getEvento` foi recusado, porque aquele fail-fast protege toda tela que assume evento válido. A tela do reparo diz qual campo está inválido, porque publicar exige modalidade não vazia (`publicarEvento.ts:69-71`) e recuperar a lista é necessário sem ser suficiente. Falsificação: um evento cujo doc tem `modalidades: ['5k','10k']` e um campo inválido em outro lugar, aberto pelo reparo, tem de mostrar as duas modalidades e nunca gravar uma lista vazia sobre elas. | E04 (dona) · E00 (consome) | SPEC-MODALIDADE-KIT |

## Ampliadas e reconciliadas (sem número novo)

- **RN-200** — inalterada. Ela trava preço, e a fronteira desta rodada é a que a Rule já aplicava:
  `percursosEditaveis` congela o array inteiro depois da primeira venda, e continua congelando.
  Nenhuma linha de `firestore.rules` referente a `modalidades` é afrouxada aqui.
- **RN-487** — inalterada e **respeitada na letra**. Ela crava que as oito guardas de configuração
  continuam lendo `qtdInscritos`, o total. A RN-500 escreve contra esse contador exatamente como
  ele é hoje, e o usa como argumento a favor da fronteira: contar qualquer status é o que faz uma
  cobrança PIX viva fechar a lista antes de qualquer pagamento. Se um dia aquele campo mudar de
  significado, a RN-500 muda de fronteira junto, e é por isso que a dependência está escrita.
- **RN-497** — inalterada, e agora com uma vizinha declarada. O congelamento pós-venda do lote
  continua sendo preço, ordem e modalidade. O `incluiKitDaModalidade` **não** entra nessa lista, e
  a razão está na RN-503; o congelamento dele é alternativa no **KITLOTE-1**, não default.
- **RN-210** — inalterada. O evento continua oferecendo de zero a N kits, e o filtro do checkout
  continua sendo por modalidade. A RN-503 acrescenta uma condição ao filtro, não uma segunda regra
  de oferta.
- **RN-211** — inalterada, e é ela que produz a única consequência de dinheiro da Parte 2. "Sem
  kit" continua sendo kit válido com preço negativo; o que a RN-504 acrescenta é o registro de que
  desligar o interruptor faz esse desconto sumir do cardápio daquele lote.
- **RN-224** — inalterada. O aprovisionamento continua sendo demanda menos estoque físico, e é essa
  aritmética que torna a pergunta "desligar libera estoque?" uma pergunta sem objeto.
- **RN-304** — inalterada, e reusada como molde. O motivo obrigatório, a trilha de auditoria e o
  formato do carimbo das operações de modalidade vêm dela; nada novo é inventado.
- **RN-179** — inalterada, e é o que sustenta "quem já comprou não muda" nas duas partes.
- **RN-202** — inalterada. O enum do kit no inscrito segue sendo o rótulo; a RN-504 registra que o
  `kitId` real também está persistido, o que fecha em definitivo o comentário de follow-up que
  ainda vive em `checkout/tipos.ts:64-66`.

## Ponta solta nomeada, sem número

**`modalidades[]` e `percursos[].nome` são duas listas do mesmo fato.** A duplicação é anterior a
esta rodada, é mantida por um único lugar do produto e não tem enunciado próprio. Esta spec passa a
tratá-las como uma só em toda operação, o que contém o risco sem resolver a deriva. Unificar as
duas é rodada própria, com migração de documento vivo, e não cabia aqui.

## Onde cada uma foi consolidada

| RN | Épico |
|---|---|
| RN-500, RN-501, RN-502, RN-503, RN-504, RN-505 | [[LEELA-E04-config-vendas]] |

O [[LEELA-E03-operacao-evento]] recebe o delta de fronteira do kit (o vínculo fica na modalidade, e
o que o interruptor do lote não muda no balcão nem no aprovisionamento). O [[LEELA-E12-landing]]
recebe o delta do checkout (a etapa de kit, a frase única e a recusa de servidor).
