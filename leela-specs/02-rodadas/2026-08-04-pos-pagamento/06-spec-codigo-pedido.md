---
tags: [leela, spec, rodada, pedido, checkout, identificadores, lgpd, painel]
aliases: ["Spec do código do pedido", "SPEC-CODPEDIDO", "codigoPedido", "RN-474", "RN-475"]
trace: leela-pixreal-diag-20260804
lote: SPEC-CODPEDIDO
data: 2026-08-05
---

# O código que a pessoa consegue ditar · o identificador humano da compra

Decisão de origem: **D-0804-5** em `01-decisoes-dono.md`, com as duas mensagens verbatim. As
regras novas são **RN-474** e **RN-475**, canônicas no [[LEELA-E12-landing]] e transcritas no
fim deste arquivo. A story é a **S1228**, nova. Fila em `04-fila-codigo.md`, Frente 5.

## Inventário antes de especificar

**O identificador que existe hoje.** O id do documento do pedido é
`ped-{uid}-{idempotencyKey}`, montado por `idsDoCheckout`
(`functions/src/checkout/createInscricaoCharge.ts:755`). O da compra real de 04/08 tem **73
caracteres**. A chave do cliente é `chk-` mais um UUID
(`CheckoutFlow.tsx:118-125`), e o uid do comprador fica no meio, em claro.

Esse formato não é acidente e não está errado: ele **é** a idempotência do checkout. O
cabeçalho do módulo declara a doutrina em `:11-24` — "retry do cliente NUNCA cria segundo
pedido — colide no docId" — e a transação de venda materializa isso com `tx.create` e um
`tx.get(pedidoRef)` que sai cedo no replay (`:1353-1355`). O mesmo id viaja ao gateway dentro
da `externalReference` (`asaasProvider.ts:501-511`), com teto duro de 100 caracteres
(`:445`, `:998-1003`). Encurtar o id **é** quebrar as duas coisas. Por isso o código curto
nasce ao lado dele, nunca no lugar dele.

**Onde o id aparece para um humano, medido em 05/08.** Cinco lugares, e um deles é o que o
dono viu:

| # | Onde | Arquivo | Quem lê |
|---|---|---|---|
| 1 | Tela de confirmação do checkout, ramo pago, embaixo de "Inscrição confirmada!" | `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao.tsx:129` | **o comprador** |
| 2 | A mesma tela, ramo não-final (em confirmação / encerrado) | o mesmo arquivo, `:138` | **o comprador** |
| 3 | Slide-in do inscrito, aba Pagamento, campo com rótulo "Pedido", em fonte mono | `apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx:361` | o organizador |
| 4 | Formulário de estorno da plataforma: campo "ID do pedido", **digitado à mão** | `apps/painel/src/routes/plataforma/estornos/EstornosAdminRoute.tsx:209-214` | o administrador |
| 5 | O eco do mesmo id no diálogo de confirmação da ação destrutiva | o mesmo arquivo, `:335` | o administrador |

E dois lugares onde ele **não** aparece, e isso importa tanto quanto:

- **Nenhum e-mail transacional imprime o id do pedido.** Varredura em
  `functions/src/email/templates.ts` (arquivo único de templates): "pedido" aparece só como
  palavra corrida (`:473`, `:489`). O que o e-mail imprime como identificador é o
  `codigoIngresso`, com rótulo próprio e mono de 32px (`:414-420`), e com uma guarda de
  formato antes de chamá-lo de código (`CODIGO_EMAIL_RE`, `:342`). Ou seja: **a compra não
  tem referência nenhuma no e-mail**. Quem recebe e quer falar sobre ela não tem o que citar.
- **Nenhuma URL carrega o id.** O pedido nunca entra em rota nem em query string; ele só
  trafega em corpo de callable. A área "meus pedidos" ainda não existe, e há teste que trava
  essa ausência (`apps/landing/test/checkout-s1225-rev-estados-terminais.test.tsx:387`).

**Busca.** Não existe busca de pedidos em lugar nenhum do produto. O único caminho para
"achar um pedido" é colar o docId inteiro no formulário de estorno da plataforma, o que não
é busca, é chave. A busca que existe e que serve de molde é a de inscritos
(`apps/painel/src/routes/eventos/_lib/inscritosFiltro.ts:54-71`): filtro **em memória** sobre
a lista já carregada do evento, casando nome normalizado **ou** prefixo do `codigoIngresso`
(`codigoCasaBusca`, `:37-44`), com a UI declarando os dois campos no rótulo
(`InscritosView.tsx:349-350`). Foi assim que a RN-397 pôs o código do ingresso na busca sem
criar tela nem índice.

**Códigos curtos que a casa já tem.** Quatro, e eles já formam um padrão:

| Código | Alfabeto | Tam. | Como a unicidade é garantida |
|---|---|---|---|
| `codigoIngresso` (RN-396) | `ABCDEFGHJKMNPQRSTUVWXYZ23456789` | 6 | doc de reserva `eventos/{id}/ingressoCodigos/{codigo}`, criado na tx |
| Convite de clube (RN-101) | o mesmo | **5** | campo do clube |
| `refCodigo` de afiliado | o mesmo (quando gerado) | 8 | o código **é** o docId |
| Código de cupom | `A-Z0-9` | 3-20 | o código **é** o docId |

O alfabeto de 31 símbolos exclui `0`, `O`, `1`, `I` e `L` — os cinco pares que a voz e o olho
confundem — e está **duplicado de propósito** em três arquivos do core, com a razão escrita em
`packages/core/src/tickets/codigoIngresso.ts:17-22`: a propriedade compartilhada é garantida
por teste sobre o conjunto ambíguo, não por uma constante comum, porque acoplar dois códigos de
ciclos de vida independentes faz uma mudança num reemitir o outro.

**Volume em produção.** Onze pedidos de seed (`prod-seed-leela-hub.ts` importa `seedPedidos`;
`pedidos.seed.ts:164-187` define `ped-0001`…`ped-0011`) e um pedido real, o de 04/08. A ordem
de grandeza é dezenas, e é ela que decide a pergunta do retroativo mais abaixo.

**Corrigido em 05/08 pela medição, não pela contagem.** O ensaio do backfill rodou contra
`leela-hub` em leitura pura e leu **17 pedidos, não 12**: os onze de seed mais **seis checkouts
reais** de 03 e 04/08, todos do domínio do dono. Junto vieram três números que a spec não tinha:
**22 espelhos** de inscrito a carimbar, **zero** pedido com código fora de formato ou com reserva
alheia, e **`pedidoCodigos` com zero documentos** — a 5a não foi deployada, então o retroativo
entra num espaço limpo, sem reserva viva com que colidir. A ordem de grandeza não muda e nenhuma
decisão desta spec se move. A compra do incidente PIXREAL (a do ingresso `T93N7F`) está na lista,
sem código, e ganha o dela na primeira execução real.

## As decisões de engenharia

### O alfabeto: o da casa, não Crockford

O desenho aprovado na conversa dizia "Crockford base32". **Não é o que entra**, e a razão é o
inventário: o Leela já tem um alfabeto anti-ambíguo, escrito, testado e usado em quatro
códigos, e um deles — o convite de clube — já tem exatamente **cinco** símbolos. Adotar
Crockford criaria um segundo alfabeto no mesmo produto, e as duas famílias discordam no ponto
que mais importa para quem dita: Crockford **mantém** `0` e `1` e derruba as letras parecidas,
enquanto a casa derruba os dois lados do par.

A diferença aparece no balcão. Sob a regra da casa, o operador aprende uma frase só — "aqui
nunca tem zero, um, i, o nem ele" — e ela vale para o código do ingresso e para o da compra,
que vão sair lado a lado no mesmo e-mail. Sob a mistura, ele precisa lembrar de qual código
está falando antes de decidir se o que ouviu é letra ou dígito, e é exatamente aí que o
identificador ditável perde a razão de existir.

O que Crockford tem de melhor é o **alias de decodificação** — `O` lido como `0`, `I` e `L`
lidos como `1`. Ele não entra, e a recusa já é da casa: `normalizarCodigoIngresso`
(`codigoIngresso.ts:70-73`) se recusa a consertar caractere ambíguo, com a frase "trocar `O`
por `0` por conta própria seria adivinhar ingresso alheio". A objeção vale igual aqui, e com
mais força: um alias que erra em silêncio devolve **a compra de outra pessoa**. Sem o alias,
Crockford é só um alfabeto de 32 símbolos com pior consistência interna.

O preço da escolha é 15% de espaço: 31⁵ = **28.629.151** contra 32⁵ = 33.554.432. É irrelevante
na escala em que a colisão realmente importa, e a próxima seção mede isso.

**Rejeitados:** Crockford base32 (motivo acima); alfabeto completo `A-Z0-9` como o do cupom
(o cupom é escolhido por gente e lido em cartaz, não sorteado e ditado ao telefone —
`0`/`O` num código sorteado é armadilha que ninguém escolheu); reusar a constante do
`codigoIngresso` em vez de declarar a própria (contraria a doutrina escrita no core, que a
duplicação é deliberada).

### A unicidade: global, por chave primária, com re-sorteio

O mecanismo é o da `emitirIngressos` copiado linha a linha, porque ele já resolveu este
problema e a razão dele está escrita: sorteio não é unicidade, e varrer com uma query dentro da
transação apostaria no bloqueio de **faixa** de índice, que é justamente o que o Firestore não
promete para resultado vazio (`emitirIngressos.ts:34-44`). Documento lido por id ele promete —
a leitura de um doc inexistente entra no read-set e o commit falha se alguém o criar no meio.

Então: um doc de reserva **`pedidoCodigos/{codigo}`**, lido e criado com `tx.create` (nunca
`set`) dentro da transação que já cria o pedido, com um teto de tentativas e um motivo de falha
nomeado quando nenhuma pega. Coleção **sem `match` em `firestore.rules`**, caindo no
deny-by-default, pelo mesmo motivo que a `ingressoCodigos`: nenhum cliente precisa lê-la, e
escrever nela seria reservar o código de outra pessoa antes dela.

**O escopo é global, e não por tenant.** A regra que segui é que o escopo da unicidade tem de
casar com o escopo da conversa. O código do ingresso é único **por evento** porque ele é
ditado no balcão daquele evento, a um operador que já está dentro dele — o evento é a sala. O
código da compra é ditado no telefone, no chat e no e-mail, por uma pessoa que comprou de um
**evento** e frequentemente nem sabe o nome da produtora que o organiza. Não há sala. Some-se
que a área do cliente lista as compras da pessoa **atravessando produtoras** (medido na
REV-S1225), e duas compras com o mesmo código na mesma lista é precisamente a falha que o
código existe para não ter.

O custo de escolher global é zero: a reserva é um documento nos dois desenhos, e por tenant só
mudaria o caminho dele. O que se perde é a propriedade, e não se ganha nada em troca.

**Rejeitados:** unicidade por tenant (mesmo custo, e quebra no único lugar onde o código é
usado); unicidade por evento, espelhando o ingresso (pior ainda — a compra pertence a um
evento, mas quem a cita não está dentro de nenhum); garantir por query dentro da transação
(não há bloqueio de faixa — é a armadilha que o comentário da `emitirIngressos` já documenta);
sorteio sem reserva, confiando no tamanho do espaço (com 28,6 milhões, a colisão de
aniversário é real na casa dos milhares, e sorteio nunca foi unicidade).

**A conta da colisão, para quem for reabrir.** A probabilidade de um sorteio cair em código
ocupado é o número de compras dividido por 28.629.151. Em dez mil compras, um re-sorteio a cada
2.900; em um milhão, um a cada 29. Com teto de tentativas, a chance de esgotar as tentativas é
essa fração elevada ao número delas — desprezível em qualquer volume que o Leela vá ver antes
de a decisão poder ser retomada com dado real. O que fica registrado é o **sintoma** que pede
revisão: se o log do motivo "sem código livre" aparecer alguma vez, o espaço encolheu demais e
a resposta é acrescentar um símbolo, não aumentar as tentativas.

### Onde o código nasce

Na criação do pedido, no servidor, dentro da transação que **já existe** em
`criarDocsDeCheckout` (`createInscricaoCharge.ts:1353`). A transação já começa com
`tx.get(pedidoRef)` e um `return` seco quando o pedido existe — esse é o replay, e é ele que
garante, de graça, que **um retry não sorteia um segundo código**. O acréscimo é uma leitura
(a reserva) antes das escritas e uma escrita (`tx.create` da reserva) junto das que já estão
lá. Nenhuma transação nova, nenhum caminho novo, nenhuma Function nova.

Nunca no cliente. Um código sorteado no navegador precisaria que o navegador lesse a coleção de
reservas para saber se está livre, o que abre a enumeração do espaço inteiro e entrega ao
comprador a escolha do próprio identificador.

**Rejeitados:** gerar no webhook de confirmação do pagamento (o pedido pendente ficaria sem
referência justamente na tela e no e-mail em que a pessoa mais precisa dela — o PIX que não
confirmou é o caso do incidente de 04/08); gerar sob demanda, na primeira vez que uma tela
pedisse (faz caminho de leitura escrever, e o código deixaria de existir para o e-mail que sai
antes de alguém olhar); derivar o código do id por hash (hash de 5 símbolos não é injetivo, e
colisão silenciosa aqui devolve a compra de outra pessoa).

### O que é gravado, e onde

**No doc do pedido:** `codigoPedido`, os cinco símbolos **sem o prefixo**. O prefixo é
apresentação e vive numa constante única do core, aplicada na hora de exibir. É essa separação
que torna o veto do dono barato: trocar `PED-` por outra coisa passa a ser a troca de uma
constante e um redeploy, em vez de uma migração de dados mais o rechaveamento da coleção de
reservas. Guardar o prefixo junto transformaria um veto leve numa operação de produção.

**No contrato tipado**, e não como campo de evolução de schema. O doc do pedido hoje carrega
quatro campos que a interface `Pedido` não declara — `contaSemFriccao`, `emailIngressos`,
`reenvioEmails`, `canceladoMotivo` — e todos são estado operacional que ninguém digita.
O `codigoPedido` é o oposto: é lido pela landing, pelo painel e pelo e-mail, e é digitado por
gente. Ele entra em `packages/core/src/pedidos/pedido.ts` e em `parsePedido`, como
`codigoIngresso` entrou no contrato do inscrito.

**Espelhado em cada inscrito do pedido**, na mesma transação que os cria
(`createInscricaoCharge.ts`, o `tx.create` de `eventos/{id}/inscritos/{id}`). É o que faz a
busca do painel custar zero: a busca de inscritos já é um filtro em memória sobre a lista do
evento, então acrescentar um campo ao inscrito acrescenta o código à busca sem query nova, sem
índice novo e sem tela nova — que é exatamente o caminho que a RN-397 percorreu para o código
do ingresso. A objeção clássica à desnormalização não se aplica: **o código nunca muda depois
de criado**, então não há divergência possível entre a cópia e a origem.

**Uma nota de fronteira que a REV-S1225 deixou escrita:** desde a RN-469, todo campo novo no
doc `pedidos/{id}` nasce visível ao comprador, e quem grava decide no ato se aceita que o
cliente leia. A conta foi feita: o `codigoPedido` é do comprador, é o que se quer que ele leia,
e é o que ele vai citar. Não há nada a esconder aqui.

### Índice: nenhum

A busca do operador é em memória sobre os inscritos já carregados do evento, então não há
query nova. A área do cliente é servida por callable (RN-451) sobre a lista da própria pessoa,
que é pequena, e filtrar por código lá também é em memória. **Nenhuma entrada nova em
`firestore.indexes.json`.**

O caso que exigiria índice — e não entra — é a busca **cross-tenant** por código, que só o
administrador da plataforma faria. Ela fica de fora por escolha, e a próxima seção diz por quê.

### O retroativo: ferramenta de backfill, não fallback permanente

As compras que já existem ganham código por **backfill**, e não por um caminho de exibição que
mostre outra coisa quando o código falta. A razão de recusar o fallback é que a única coisa que
ele teria para mostrar no lugar é o id interno — precisamente o que esta spec existe para tirar
das telas. Um fallback aqui seria um ramo permanente de código para reintroduzir o problema em
condição rara, que é a pior forma de mantê-lo.

O que a ausência produz, então, é **ausência**: uma superfície que encontra pedido sem código
não escreve nada no lugar, ou escreve um travessão. Nunca o id.

A conta é barata porque a população é minúscula: dezessete pedidos, medidos em 05/08 pelo ensaio
contra produção (onze de seed e seis reais, contra os doze que este parágrafo estimava). E a forma
segue o precedente da casa, que já tem um backfill de produção escrito —
`functions/scripts/backfill-url-eventos.mjs`: script standalone, **`--dry-run` por default** e
`--apply` explícito, `--project` obrigatório, idempotente por comparação (rerun converge para
zero escritas), lotes de 400, contadores impressos antes de escrever, e a frase do cabeçalho
que governa tudo isso — "reescrever documento em produção é operação, não build".

Uma diferença em relação ao precedente, e ela é a parte que exige cuidado: este backfill
**também reserva**. Cada código atribuído tem de criar o doc em `pedidoCodigos/{codigo}` na
mesma transação em que carimba o pedido, senão o retroativo semeia colisão contra o que o
checkout vai sortear amanhã. E ele carimba os inscritos do pedido junto, pelo mesmo espelho.

**A execução não é da esteira.** Vale a regra que a casa já pratica e já registrou uma vez:
*o backfill vem como ferramenta, não como execução*. A lane entrega o script provado em
dry-run; rodar contra produção é ato registrado, e entra no kanban como pendência do dono ao
lado da que já existe lá.

**Rejeitados:** fallback permanente exibindo o id (reintroduz o vazamento no ramo raro);
backfill preguiçoso, atribuindo na primeira leitura (faz leitura escrever, e não serve ao
e-mail, que sai antes de qualquer leitura); deixar as compras antigas sem código para sempre
(a compra real de 04/08 é do próprio dono, e é a primeira que alguém vai citar).

### O formulário de estorno da plataforma fica como está

O campo "ID do pedido" do `EstornosAdminRoute` continua recebendo o id interno, e isso é
escolha, não esquecimento. Aquela tela age **atravessando tenants**, então aceitar o código
curto exigiria uma consulta cross-tenant por código: uma superfície de leitura nova, sem sala
que a delimite, que responde "existe" ou "não existe" para qualquer palpite de cinco símbolos.
O ganho seria pequeno e o preço é um oráculo.

O caminho para quem recebe um `PED-` de um comprador passa pelo painel da produtora, que acha
a compra pelo código na busca que já existe e mostra o id interno ao lado, para copiar. O
runbook de e-mail transacional ganha esse passo de ponte, que é onde ele já mora hoje.

## O que o código é, e o que ele não é

**É** o identificador humano da compra: o que aparece na tela depois de pagar, o que vai no
e-mail, o que a pessoa dita no atendimento e o que o operador digita na busca.

**Não é credencial.** Nenhuma superfície aceita o código como prova de nada: ele não abre
pedido, não abre ingresso, não autentica e não autoriza. A autorização de leitura do pedido
continua sendo a da RN-469, sobre `responsavel.atletaId` e `contaSemFriccao.contaUid` — e as
Rules já dizem, em `firestore.rules:2572`, por que a autorização olha campo e não prefixo de
id. Um espaço de 28,6 milhões seria adivinhável em minutos se alguma porta aceitasse o código
como chave; nenhuma aceita, e essa frase é a fronteira.

**Não substitui o id do documento.** O id continua endereçando o pedido, continua sendo a
idempotência do checkout e continua viajando ao gateway. O código acompanha.

**Não muda depois de criado.** É o que autoriza o espelho no inscrito e o que faz o e-mail já
enviado continuar verdadeiro.

## As superfícies, varridas

Nenhuma linha de código foi tocada por esta lane. O que segue é o mapa que a S1228 executa.

| # | Superfície | Hoje | Depois |
|---|---|---|---|
| 1 | `StepConfirmacao.tsx:129` (ramo pago) | "Pedido ped-{uid}-chk-…" | "Pedido PED-XXXXX" |
| 2 | `StepConfirmacao.tsx:138` (ramo não-final) | o mesmo | o mesmo |
| 3 | E-mail dos ingressos (`templates.ts`) | a compra não tem referência nenhuma | o código do pedido no topo, com rótulo próprio, ao lado dos códigos de ingresso que já estão lá |
| 4 | `InscritoSlideIn.tsx:361`, campo "Pedido" | o id interno em mono | o código; o id interno sai da vista e continua disponível para copiar |
| 5 | Busca de inscritos (`inscritosFiltro.ts:54-71`, `InscritosView.tsx:349-350`) | casa nome ou `codigoIngresso` | casa também o código do pedido, e o rótulo do campo passa a dizer os três |
| 6 | S1222 · Meus Pedidos e histórico (ainda não construída) | — | nasce exibindo o código, nunca o id — a fila ADMINSEP B1/B2 é onde isso aterrissa |
| 7 | `EstornosAdminRoute.tsx:209-214` e `:335` | id interno digitado e ecoado | **inalterado, por escolha** (seção acima) |
| 8 | Runbook de e-mail transacional (`04-engenharia/`) | procedimento parte do `pedidoId` | ganha o passo de ponte: código do comprador → pedido no painel da produtora → id interno |
| 9 | Logs e alerta de incidente (`enviarIngressos.ts`, `incidenteEmail.ts`) | `pedidoId` | **inalterado** — log não é superfície humana de produto, e o id é o que reconcilia com o gateway |

## As duas regras

### RN-474 (nova, dona = E12) · a compra tem um código curto próprio, gerado no servidor

Todo pedido nasce com um **`codigoPedido`**: cinco símbolos maiúsculos do alfabeto
anti-ambíguo da casa (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, sem `0`, `O`, `1`, `I` e `L`),
sorteados no servidor no ato da criação do pedido.

- **Único globalmente, por chave primária.** A garantia é um documento de reserva
  `pedidoCodigos/{codigo}`, lido e criado com `create` dentro da mesma transação que cria o
  pedido, com re-sorteio limitado e um motivo de falha nomeado quando nenhuma tentativa pega.
  Sorteio não é unicidade, e query dentro de transação não trava faixa vazia. O escopo é
  global porque o código é dito fora de qualquer sala: a área do cliente lista compras de
  produtoras diferentes na mesma tela.
- **A reserva é server-only.** A coleção não tem `match` em `firestore.rules` e cai no
  deny-by-default, como a `ingressoCodigos`.
- **O replay não sorteia de novo.** A transação de venda já sai cedo quando o pedido existe;
  o código segue a mesma porta. Um pedido tem um código, para sempre, e ele nunca muda.
- **O que é gravado são os cinco símbolos**, sem prefixo. O prefixo é apresentação, vive numa
  constante única do core e só entra na exibição.
- **O contrato é tipado**: `codigoPedido` entra na interface `Pedido` e em `parsePedido`, e é
  espelhado em cada inscrito do pedido na mesma transação — desnormalização segura porque o
  valor é imutável.
- **O código não é credencial.** Nenhuma porta o aceita como chave de leitura, de acesso ou de
  ação. A autorização do pedido continua sendo a da RN-469, por campo. O alfabeto e o
  comprimento vêm de um módulo próprio no core, não de constante compartilhada com o
  `codigoIngresso` — a propriedade comum ("nenhum caractere ambíguo") é provada por teste
  sobre o conjunto ambíguo, na doutrina que o core já escreveu.

### RN-475 (nova, dona = E12) · o código é o que humano lê; o id interno sai das telas

Toda superfície de produto que identifica uma compra para uma pessoa passa a mostrar o
**código**, com o prefixo. O id do documento **não é exibido** em tela de comprador nem em
e-mail.

- **A razão é maior que o tamanho.** O id é `ped-{uid}-{chave}` por construção, então exibi-lo
  publica o **uid da conta do comprador** — o identificador que correlaciona a pessoa em todo o
  sistema — numa tela que ela fotografa e num texto que ela encaminha. Setenta e três
  caracteres é o sintoma; o uid viajando é o dano.
- **Onde ele aparece hoje** (as duas telas do checkout e o campo "Pedido" do slide-in do
  inscrito) o código o substitui. No painel, o id interno continua disponível para copiar, para
  quem precisa operar com ele.
- **O e-mail da compra passa a carregar o código**, com rótulo próprio, ao lado dos códigos de
  ingresso que já imprime. Hoje a compra não tem referência nenhuma no e-mail, e é por isso que
  quem escreve para o atendimento não tem o que citar.
- **A busca do operador aceita o código**, pelo caminho que a RN-397 abriu: filtro em memória
  sobre a lista de inscritos do evento, sem query nova e sem índice novo.
- **A área do cliente nasce certa** (S1222): Meus Pedidos e o histórico exibem o código desde a
  primeira versão, nunca o id.
- **Ausência é ausência.** Pedido sem código não exibe o id no lugar; exibe nada. Compras
  anteriores ganham código por backfill, entregue como ferramenta com dry-run por default e
  executado como operação registrada, nunca como efeito colateral de deploy.
- **Continua sendo id interno onde é interno**: log, alerta de incidente, `externalReference`
  do gateway, callables e o formulário de estorno da plataforma, que age cross-tenant e cuja
  conversão criaria um oráculo de código para qualquer palpite.

## Fronteiras

- **O id do documento não se move.** Ele é a idempotência do checkout (`tx.create` com id
  determinístico) e a `externalReference` do gateway, com teto de 100 caracteres. Implementação
  que parecer pedir um id mais curto está errada.
- **A fronteira de autorização não se move.** A leitura do pedido continua governada pela
  RN-469, por campo. Se alguma superfície parecer aceitar o código como chave de acesso, a
  superfície está errada.
- **`codigoIngresso` (RN-396) e o token do link (RN-419) ficam intocados.** Um já é curto; o
  outro é credencial, e credencial não encurta.
- **A cota de re-sorteio é o sinal de saúde.** O motivo "sem código livre" aparecendo em log
  alguma vez é pedido de revisão do comprimento, não de aumento das tentativas.
- **`apps/landing` e `functions/` são territórios disputados** enquanto houver lane em voo na
  mesma árvore. A fila posiciona.

## Premissas desta lane

Nenhuma sobe ao painel: são escolhas de engenharia, tomadas, registradas para quem precisar
reabrir com motivo.

| # | Premissa | O que cai se ela cair |
|---|---|---|
| COD-1 | Alfabeto da casa (31 símbolos), não Crockford | Nasce o segundo alfabeto do produto e o operador passa a precisar saber de qual código se fala antes de ouvir |
| COD-2 | Cinco símbolos, como o dono pediu | Muda o espaço e a conta de colisão; hoje 28,6 milhões |
| COD-3 | Unicidade global por doc de reserva | Duas compras com o mesmo código na mesma lista da área do cliente |
| COD-4 | Os cinco símbolos gravados sem prefixo | O veto do prefixo deixa de ser uma constante e vira migração de dados |
| COD-5 | Espelho do código no inscrito | A busca do painel precisa de query, índice ou tela nova |
| COD-6 | Backfill como ferramenta com dry-run, execução registrada | Reescrita de produção vira efeito colateral de deploy |
| COD-7 | Estorno da plataforma segue no id interno | Nasce uma consulta cross-tenant por código, que é oráculo |

## O que esta spec NÃO decide

- **O prefixo.** É a única coisa que sobe ao painel (**CODPED-1**), porque é vocabulário que o
  cliente lê. `PED-` é o default e vale enquanto não houver resposta.
- **Código curto para outra coisa.** Inscrito, pagamento, estorno e evento têm identificadores
  próprios e ciclos próprios. A frase do dono fala de compra.
- **Quando o backfill roda em produção.** A ferramenta é da lane; a execução é ato registrado.
- **Qualquer mudança no id do documento, no `codigoIngresso` ou no token do link.**
- **Como a área do cliente exibe a compra além do código.** Isso é da S1222; o que esta spec
  fixa é que o identificador visível lá é o código.
