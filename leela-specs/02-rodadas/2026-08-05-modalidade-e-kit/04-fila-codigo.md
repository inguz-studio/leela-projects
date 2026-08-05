---
tags: [leela, fila, rodada, modalidade, kit, lote, fila-tecnica]
trace: leela-pixreal-diag-20260804
lote: SPEC-MODALIDADE-KIT
data: 2026-08-05
---

# 04-fila-código · a lista editável, o interruptor e a dívida do docId

> Duas frentes independentes mais uma dívida. Regras em `03-rns-delta.md`, canônicas em
> [[LEELA-E04-config-vendas]]; o relato e os verbatins em `01-decisoes-dono.md`; a apuração em
> `02-spec-modalidade-e-kit.md`.
>
> **A marca ⚔ está onde a tarefa toca contrato de evento, contrato de lote ou o caminho da
> cotação.** São seis das dez. A renomeação leva **⚔⚔** por escrever cinco referências num commit,
> uma delas numa subcoleção que o dinheiro referencia.
>
> **Nada desta rodada existe.** Não há commit de código nesta lane; o produto dela é
> `leela-specs/`.

## Frente 1 · a lista de modalidades passa a ser editável (E04 · S316, RN-500/501/502/505)

Sobe primeiro porque é o pedido direto do dono e porque hoje não existe caminho nenhum, nem para
corrigir um typo.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1a | `S316-T1` | A porta única no servidor (RN-500): callable `editarModalidadesEvento` com as três operações, transacional, checando `qtdInscritos == 0` por conta própria — a Function escreve com privilégio e por isso herda o dever de reimplementar a guarda que ela contorna. Motivo obrigatório de 3 a 500 caracteres e trilha em `auditoriaAcessos`, no molde da RN-304. Acrescentar toca `modalidades[]` por `arrayUnion` e `percursos[]` por leitura-e-checagem, porque o elemento é objeto e a igualdade do `arrayUnion` é estrutural | `functions/src/eventos/` | — | opus | ⚔ |
| 1b | `S316-T2` | A renomeação atômica (RN-501): os cinco alvos num commit — `modalidades[]`, `percursos[].nome`, `Lote.modalidade`, `Kit.modalidades[]` e `campanha.segmento.referencia` —, pai antes dos filhos, com recusa de nome já existente na lista. O docId do lote **não** é recriado | `functions/src/eventos/` | 1a | opus | ⚔⚔ |
| 1c | `S316-T3` | A remoção que nomeia quem impede (RN-502): recusa enquanto houver lote, kit ou campanha apontando, com a lista de cada um pelo nome, e a mensagem chegando intacta à tela — não "falha ao salvar" | `functions/src/eventos/`, `apps/painel/.../configuracoes/**` | 1a | opus | ⚔ |
| 1d | `S316-T4` | A tela da lista (RN-500): a seção de modalidades em Configurações gerais, reusando o componente de chips que a criação já tem (`EventoForm.tsx:355-403`), com confirmação nomeando a consequência quando o evento está publicado. A copy que a lane DIAG-PAINEL-LACUNAS escreveu em `ConfigGeraisForm.tsx` e `LotesView.tsx` volta a contar o estado real | `apps/painel/src/routes/eventos/**` | 1a | sonnet | — |
| 1e | `S316-T5` | A recuperação do evento degradado (RN-505): ação própria **na listagem**, que abre o reparo sem passar pela tela de detalhe — `getEvento` continua fail-fast, e afrouxá-lo está recusado por escrito. O reparo lê pela Function, mostra a lista real e nomeia o campo inválido | `apps/painel/src/routes/eventos/**`, `functions/src/eventos/` | 1a | opus | ⚔ |

**Por que a porta é uma Function e não o cliente, com o custo declarado.** Acrescentar poderia ser
escrita direta: a Rule já autoriza (`firestore.rules:550-561`) e o campo já estaria no
`AtualizarConfiguracoesEventoInput`. Foi recusado por três medições. A sincronia com
`percursos[]` exige ler antes de escrever, e ler-checar-escrever no cliente é a corrida entre duas
abas. A recusa de nome duplicado precisa do estado atual. E uma porta só é o que garante trilha de
auditoria para as três operações, em vez de trilha para as duas que já teriam de passar pelo
servidor. O custo é fiação: coleção de auditoria, motivo obrigatório e formato de carimbo vêm
todos da RN-304.

**O que esta frente NÃO faz:** acrescentar modalidade depois da primeira venda. A Rule congela o
array inteiro e não sabe calcular a diferença entre acrescentar e renomear (Rules não iteram
listas, limitação declarada em `firestore.rules:566-570`). É o único pedaço do pedido do dono que
a fronteira não atende, e está registrado como tal.

## Frente 2 · o lote que não inclui o kit (E04 · S317, RN-503/504)

Independente da frente 1 e paralelizável com ela, com um cuidado: **1b e 2a não tocam o mesmo
território**, então podem correr em worktrees separados sem a coordenação que a BUILD-LOTES-UX
precisou.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 2a | `S317-T1` | O campo (RN-503): `incluiKitDaModalidade?: boolean` no `Lote` do core, parse com **ausente ≡ ligado**, Rule aceitando `is bool` quando presente, e o campo **fora** de `loteComercialImutavelSeVendido`. Nenhuma migração de documento: escrever `true` onde já se lê `true` é escrita sem efeito e com risco | `packages/core/src/eventos/lote.ts`, `firestore.rules`, `packages/api-client/src/eventos/lotes.ts` | — | opus | ⚔ |
| 2b | `S317-T2` | A recusa do servidor (RN-503): `computeSaleState` refuta kit que o lote ativo não inclui, na mesma frase em que já refuta kit fora da modalidade. Exige reordenar o bloco do kit (`saleState.ts:265-274`) para depois da resolução do lote ativo (`:281`), dentro da mesma função pura | `packages/core/src/checkout/saleState.ts`, `functions/src/checkout/` | 2a | opus | ⚔ |
| 2c | `S317-T3` | O checkout (RN-503/504): a leitura pública carrega o campo do lote ativo, `kitsDaModalidade` passa a considerá-lo, e o ramo de lista vazia que já existe (`StepModalidadeKit.tsx:251-257`) troca a frase pela única — **"Esta inscrição não inclui kit."** — nos dois casos. A obrigatoriedade condicional (`CheckoutFlow.tsx:1711-1715`) acompanha sem nenhuma linha nova | `apps/landing/**` | 2b | sonnet | — |
| 2d | `S317-T4` | O interruptor na tela do lote (RN-503/504): rótulo "Inclui o kit da modalidade", ligado por padrão, **ausente** quando a modalidade não tem kit — não desabilitado —, e o aviso com o número quando desligar tira um kit de preço negativo do cardápio | `apps/painel/src/routes/eventos/lotes/**` | 2a | sonnet | — |

**O que não precisa de tarefa, e por quê.** O balcão, o e-mail, a página do ingresso e o
aprovisionamento não mudam: os três primeiros leem do inscrito, e o quarto chaveia por
`itemId__[corte__]tamanho`, sem modalidade e sem lote. O agregado `porModalidade` também não
precisa de reprocesso na frente 1, porque `qtdInscritos == 0` significa mapa vazio. Nenhuma dessas
quatro afirmações é suposição; todas vieram da varredura registrada em `02-spec-modalidade-e-kit.md`.

## Frente 3 · a dívida que a apuração encontrou

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 3a | `S316-T6` | O docId do lote para de embutir o nome da modalidade: `novoLoteId` (`loteForm.ts:254-255`) passa a gerar chave opaca para lotes **novos**, e nenhum documento existente é renomeado. Enquanto a chave carregar o nome, uma modalidade renomeada deixa docIds com o nome antigo — resíduo cosmético que ninguém lê, e que só some para quem nascer depois | `apps/painel/src/routes/eventos/lotes/_lib/loteForm.ts` | — | sonnet | — |

## Critério de aceite por tarefa

**1a · a porta.** Um evento com `qtdInscritos == 0` aceita as três operações pela Function. O mesmo
evento com `qtdInscritos == 1` as recusa **na Function**, e a prova não pode ser só a Rule, porque
a Function escreve com privilégio: o caso tem de ser vermelho quando a checagem interna for
removida. A trilha carrega quem, quando, de → para e motivo. Acrescentar duas vezes o mesmo nome é
idempotente e não cria duplicata em `percursos[]`.

**1b · a renomeação.** Um evento com dois lotes, um kit e uma campanha apontando para "21k",
renomeado para "Meia maratona", tem os cinco alvos migrados e legíveis num único commit. Uma falha
injetada no meio da transação não deixa **nada** escrito, e o teste que prova isso é o que não pode
faltar: uma migração parcial deixa lotes inutilizados pela própria Rule. Renomear para um nome que
já está na lista é recusado com mensagem própria. O docId do lote continua o mesmo e o lote
continua sendo encontrado pela query da modalidade nova.

**1c · a recusa que nomeia.** Remover "21k" com dois lotes apontando devolve os dois nomes na
mensagem, e a mensagem chega à tela sem virar "falha ao salvar" — é o mesmo defeito de endereço que
a review da SEAL-LOTES corrigiu no `LoteModal` (`2a97a592`), e ele não pode renascer aqui. Apagados
os lotes, a mesma remoção passa.

**1e · a recuperação.** Um evento com `modalidades: ['5k','10k']` no banco e um campo inválido em
outro lugar aparece degradado na lista, abre pelo reparo, **mostra as duas modalidades** e nunca
grava lista vazia sobre elas. Uma varredura por escrita de `modalidades` a partir de `eventoDegradado`
devolve zero.

**2a · o campo silencioso.** Um lote gravado antes desta tarefa, lido depois dela, se comporta como
incluindo o kit — o teste monta o documento **sem** o campo e prova o `true`. Um lote com
`vendidos > 0` aceita a troca do interruptor e continua recusando `preco`, `ordem` e `modalidade`
no mesmo gesto (RN-497 intacta).

**2b · a recusa de servidor.** Uma cotação que declare um `kitId` legítimo da modalidade, sobre um
lote com o interruptor desligado, é recusada pelo servidor. Falsificação direta: remover a checagem
tem de deixar o caso vermelho, e não apenas mudar a tela.

**2c · a frase.** Uma varredura por "kit desligado", "kit desativado" e "kit indisponível" sobre
`apps/landing` devolve zero. Modalidade sem kit e lote com o interruptor desligado exibem a
**mesma** frase. Nenhuma superfície de comprador contém a palavra "lote" por causa desta mudança.

**2d · o aviso que vale dinheiro.** Num evento com um kit de preço negativo na modalidade, desligar
o interruptor mostra ao organizador o desconto que sai e o valor que o próximo comprador passa a
pagar, **antes** de confirmar. Numa modalidade sem kit nenhum, o interruptor não está no DOM.

## O que depende de decisão do dono

**Nada desta fila está retido.** As três respostas pendentes ajustam desenho, não destravam
tarefa:

- **MODAL-1** decide a fronteira temporal. O default está em vigor e é o que a Rule já aplica; se
  o dono trocar para "sem venda e rascunho", muda uma condição em 1a e uma frase em 1d.
- **MODAL-2** decide se remover pode arrastar os lotes junto. O default é recusar e nomear, que é
  a 1c inteira; a outra resposta acrescentaria tarefa, não mudaria esta.
- **KITLOTE-1** decide se o interruptor congela depois da primeira venda e se o kit de desconto
  merece exceção. O default é não congelar e não abrir exceção; congelar seria uma linha na Rule
  da 2a.

## Ordem executável

Frente 1 em sequência a partir de 1a, porque as quatro tarefas seguintes chamam a porta que ela
cria. Dentro delas, 1b e 1c são independentes entre si e podem correr em paralelo depois de 1a;
1d e 1e também. Frente 2 em sequência 2a → 2b → 2c, com 2d podendo subir logo depois de 2a. As
duas frentes são independentes e não compartilham arquivo. A 3a é isolada e pode ir a qualquer
momento, com uma ressalva de ordem: se ela subir **antes** de 1b, a renomeação nasce sem o resíduo
cosmético para os lotes criados depois dela.
