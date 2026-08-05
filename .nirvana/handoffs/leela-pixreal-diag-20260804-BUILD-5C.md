# BUILD-5C · as superfícies do comprador para o código da compra (S1228-T2)

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** BUILD-5C
- **Employee:** sf-frontend-lead (software-forge)
- **Task da fila:** Frente 5, linha **5c** de `04-fila-codigo.md`
- **Spec:** `06-spec-codigo-pedido.md` (linhas 1, 2 e 3 da tabela de superfícies) · **RN-474/RN-475**
- **Território:** `apps/landing/**/checkout/**` e `functions/src/email/**` (+ testes)
- **Commit:** `6993a36a` · pushed (`60f05beb..6993a36a`)
- **Estado:** entregue, gates verdes, sem deploy

## O que mudou, e por quê

Quatro arquivos de produção, três de teste, um config de emulator. Nenhum toque
em `packages/core`, `packages/api-client`, `functions/src/checkout`,
`functions/scripts`, `apps/painel`, `firestore.rules` ou `leela-specs/`.

| # | Arquivo | O que passou a valer |
|---|---|---|
| 1 | `apps/landing/.../checkout/StepConfirmacao.tsx` | Os dois ramos mostram `PED-XXXXX`; o `pedidoId` saiu dos dois. UMA implementação (`ReferenciaDaCompra`) serve os dois |
| 2 | `apps/landing/.../checkout/CheckoutFlow.tsx` | Lê o `codigoPedido` do próprio pedido e o entrega à tela — de carona no PIX, por leitura dedicada no cartão |
| 3 | `apps/landing/.../checkout/Ticket.tsx` | **ACHADO:** parou de imprimir o `inscritoId`, que carrega o id do pedido inteiro |
| 4 | `functions/src/email/templates.ts` | O e-mail da compra ganhou o bloco "Código da compra", antes dos cartões de ingresso, em HTML e em texto |
| 5 | `functions/src/email/enviarIngressos.ts` | O código sai do doc que a função **já lia** — nenhuma leitura a mais no caminho do e-mail |

**O prefixo não foi reimplementado em lugar nenhum.** A tela e o template chamam
`formatarCodigoPedido`; a leitura do doc no servidor usa `isCodigoPedidoValido`.
Varredura por `'PED-'` em `apps/landing/app` e `functions/src/email`: em código
de produção, **zero literal executável** — os literais vivem só nos testes, e ali
eles são o aceite (têm de falhar se o veto CODPED-1 trocar o prefixo sem que
alguém olhe a tela). Mesmo precedente que a 5d fixou.

## De onde o código vem — a parte que não era óbvia

O `createInscricaoCharge` **grava** o `codigoPedido` no doc (5a, `:1713`/`:1761`)
mas **não o devolve** na resposta da callable: `CreateInscricaoChargeResult`
(`packages/api-client/src/checkout.ts:204-259`) não tem o campo. A landing,
portanto, não recebe o código ao chegar na confirmação.

Fechar essa lacuna pelo caminho óbvio — acrescentar o campo à resposta — exige
`functions/src/checkout`, que é território da **BUILD-A4**, em voo. Então a
resposta desta lane é a porta que **já existe**: a leitura do próprio pedido
aberta pela S1225-T3 sobre a RN-469 (`getPedido`, o mesmo `parsePedido` que o
painel usa). Nenhuma superfície nova, nenhuma Rule nova, nenhuma query nova.

São dois caminhos até essa leitura, e é por isso que há dois trechos de código:

- **PIX** — a consulta de status já roda no carregamento da cobrança. O código
  vem de carona nela, **custo zero**. Ele é captado ANTES da porta do `status`:
  `codigoPedido` é imutável e não depende de desfecho, então prendê-lo ao ramo do
  status seria perdê-lo por um motivo que não tem nada a ver com ele.
- **CARTÃO** — a consulta de status não existe ali de propósito (o desfecho se
  resolve na própria chamada de pagar, CHECKOUT-FIX-0803). Sem uma leitura
  dedicada, o comprador de cartão chegaria à confirmação **sem referência
  nenhuma**: nem o código, porque ninguém o leu, nem o id, porque a RN-475 o
  proibiu. Trocar um vazamento por um vazio não é o que a task pede. A leitura é
  **uma por pedido** (guardada por `ref` chaveada pelo `pedidoId`, não pelo
  estado — compra anterior ao backfill responde `undefined` para sempre e um
  guard por `=== null` releria a cada render).

Cobrança nova (troca de preço, PIX expirado) **zera** o código junto com o
`statusPedidoConsultado`, pela mesma razão escrita ali: código de pedido
cancelado é pior que código nenhum — quem o ditasse faria o balcão abrir a
compra errada.

## Gates

| Gate | Comando | Resultado |
|---|---|---|
| Tipos (landing) | `npx tsc --noEmit` | **0 erros** |
| Tipos (functions) | `npx tsc --noEmit` | **0 erros** |
| Lint (landing) | `npx eslint app lib --max-warnings 0` | **0** |
| Lint (functions) | `npx eslint src --max-warnings 0` | **0** |
| Lint (testes novos) | `npx eslint <3 arquivos> --max-warnings 0` | **0** |
| Suíte landing INTEIRA · 1ª | `npx vitest run` | **55 arquivos / 681 testes** |
| Suíte landing INTEIRA · 2ª | `npx vitest run` | **55 / 681** |
| Suíte landing INTEIRA · 3ª | `npx vitest run` | **55 / 681** |

**Linha de base declarada.** Medi a base ANTES de tocar em qualquer coisa:
**53 arquivos / 665 testes**, exatamente o que a ordem de trabalho dizia. A base
nova é **55 / 681** — dois arquivos e dezesseis testes a mais, todos meus.

**O flake conhecido não apareceu.** Três execuções inteiras da suíte da landing,
zero falha, zero teste instável. Nenhum caso da família do import do barrel do DS
foi observado — não tenho nome de caso para reportar.

**Functions, arquivo a arquivo, emulator de porta própria.** Config nova
`firebase.build5c.json` (firestore **8989**, auth 9989, hub 4409, logging 4509,
todos com `host: 127.0.0.1` explícito — IPv4, nunca `::`). JDK 21 em
`C:\Users\Vitor Eduardo\.jdks\jdk-21.0.11+10` — o `java` do PATH da máquina é
**17**, e o `firebase-tools` recusa: sem prefixar o PATH, o emulator morre com
"no longer supports Java version before 21".

| Arquivo | Resultado |
|---|---|
| `emailIngressos.integration.test.ts` (templates + disparo) | **25/25** — inclui os 8 casos novos |
| `emailTemplates.test.ts` | passou |
| `emailIdentidade.test.ts` | passou |
| `basePublicaEmailLink.test.ts` | passou |
| `linkDosEmails.contract.test.ts` | passou |
| `reenvioEmailsPedido.integration.test.ts` | passou (consumidor da camada de baixo) |
| `reenvioEmailsPedido.ataque.test.ts` | passou |

A suíte completa de functions **não** foi rodada, por política.

## Como cada comportamento foi provado

### 1 · O código aparece nos DOIS ramos

`apps/landing/test/checkout-s1228-codigo-compra.test.tsx`, três casos que atacam
os três estados que a tela sabe desenhar:

- **ramo pago** — "Inscrição confirmada!" + `PED-A2B3C`;
- **ramo não-final, em confirmação** — a tela do incidente de 04/08, que é
  justamente onde a pessoa mais precisa de um número para citar;
- **ramo não-final, encerrado** (`falhou`) — quem vai reclamar de uma compra que
  não vingou precisa do código tanto quanto quem pagou.

Mais dois que seguram a implementação: o rótulo continua sendo `Pedido` ao lado
do valor (asserção sobre o texto do parágrafo inteiro), e **`A2B3C` sozinho nunca
aparece na tela** — ele só existe dentro de `PED-A2B3C`. Este último é o caso que
cai se alguém trocar `formatarCodigoPedido` por interpolação direta.

E a fiação, em `checkout-s1228-fiacao-codigo.test.tsx`, sobre o `CheckoutFlow`
inteiro: PIX chega ao código com **duas** leituras (carregamento e gesto, as duas
da S1225 — a dedicada não roda ali), cartão chega com **uma**, e ela não se
repete em re-render.

### 2 · Ausência é ausência, nunca o id

Cinco caminhos distintos até a mesma resposta, porque são cinco portas:

- pago **sem** código (compra anterior ao backfill);
- não-final **sem** código;
- código **fora do alfabeto** (`A0B3C`, com o zero que a casa não tem);
- código de **tamanho errado** (`A2B3`);
- no fluxo real: cartão cujo doc responde sem o campo, e cartão cuja leitura
  **falha** com `permission-denied`.

Em todos: nada de `PED-`, nada de `Pedido `, e a confirmação de quem pagou
continua de pé. Quem julga formato é o core, não a tela.

A asserção de ausência do id é **tripla** de propósito: o id inteiro pega a volta
literal; o **uid sozinho** pega quem "encurtar" o id achando que o problema era o
tamanho (não era); e o `inscritoId` pega a volta pela porta lateral do bloco de
ingressos — que foi exatamente por onde ela estava aberta (achado abaixo).

### 3 · O e-mail, com e sem código

No template (puro, sem emulator): o bloco sai com rótulo próprio e o prefixo do
core; **os dois códigos convivem e se distinguem** — rótulos no singular de cada
coisa ("Código da compra" / "Código do ingresso"), o da compra vem ANTES do
primeiro `data-slot="ingresso"` e **não está dentro de nenhum cartão**, e os
tamanhos são 20px contra os 32px do ingresso; compra sem código omite o bloco
inteiro sem levar nada junto (os códigos de ingresso e o QR continuam lá);
código corrompido é tratado como ausência.

No fio inteiro (emulator, `enviarEmailIngressos`): o `codigoPedido` gravado no
doc chega ao HTML **e** ao texto do e-mail que sai, o `pedidoId` não aparece em
nenhuma das duas partes, e os códigos de ingresso continuam presentes. O caso da
compra anterior ao backfill prova o mesmo do outro lado: sem "Código da compra",
sem `PED-`, sem id, e os dois QR intactos.

Há ainda uma prova de **fronteira**, que vale mais que qualquer asserção sobre
texto: `IngressosCompraEmailInput` **não tem** `pedidoId`. O id não atravessa o
template, então não há o que vazar por ali.

### 4 · O canário de fonte — a volta silenciosa do id

A fila pediu com todas as letras: *"o teste é que nenhuma superfície de comprador
imprime `pedidoId` — executável, e é ele que segura a volta silenciosa do id numa
tela futura"*. Os casos acima cobrem os estados que existem hoje; este varre o
diretório `checkout/` inteiro e vale para a tela que alguém escrever amanhã.

O padrão procurado é a forma de **imprimir**: uma chave cujo conteúdo inteiro é
`pedidoId` ou `algo.pedidoId`, em posição de filho de JSX. Ele ignora os quinze
usos legítimos — argumento (`(`), prop (`=`), objeto (`,`/`{`), desestruturação
(`} =`) — porque um canário que grite em todos eles é um canário que alguém
desliga. E o próprio canário tem teste: sete asserções provando que ele reconhece
a forma que saiu e ignora as que ficaram. Canário que não canta não vigia nada.

## ACHADO · a sexta superfície, que a spec não tinha

`Ticket.tsx:52-53` imprimia o **`inscritoId`** em mono, com `title` para o texto
completo. Ele é `{pedidoId}-i{n}` — ou seja, carrega o **id do pedido inteiro**,
e portanto o uid da conta, dentro de si. O inventário da spec listou cinco
lugares porque a varredura procurou por `pedidoId`, e aqui o vazamento viaja com
outro nome.

A razão da RN-475 vale palavra por palavra: é a **mesma tela** que a pessoa
fotografa, e o valor exibido é maior que o id que a spec mandou tirar da linha
de cima. Tirei-o da vista.

- **O QR continua codificando o `inscritoId`**, e isso não contradiz nada: ele é
  a credencial de check-in, e a RN-475 separa exatamente isso ("continua sendo id
  interno onde é interno"). O que a regra proíbe é o id em texto, para olho
  humano, numa superfície de produto.
- **O que ficou no lugar: nada.** O identificador humano do INGRESSO é o
  `codigoIngresso` (RN-396), e ele **não existe neste instante do fluxo** — quem
  o emite é o webhook, depois do pagamento, e é o e-mail que o entrega. O
  identificador humano da COMPRA é o código do pedido, e ele está no topo da
  mesma tela. Inventar um terceiro rótulo aqui seria dar à pessoa um número que
  nenhum balcão reconhece.
- Nenhum teste da suíte assertava esse id na tela — a remoção não derrubou nada.

**É o item nº 1 de conferência visual do dono**, e o único desvio de escopo desta
lane. Se ele preferir manter alguma legenda no cartão, o conserto é de uma linha.

## Decisões desta lane

### D1 · O rótulo na tela é "Pedido"; no e-mail é "Código da compra"

A tabela de superfícies da spec escreve o depois da tela como `"Pedido
PED-XXXXX"`, e é isso que está lá — mesma palavra que o campo do slide-in do
painel (5d) usa, então o operador e o comprador falam a mesma língua. No e-mail o
rótulo é **"Código da compra"** porque ali ele divide a página com "Código do
ingresso", e é o rótulo que faz o leitor distinguir os dois na primeira leitura.

### D2 · O código sobe um degrau de contraste; o rótulo não

O parágrafo continua em `text-text-tertiary`; o valor é
`text-text-secondary font-mono tracking-wider`. O código é o que se lê em voz
alta ao telefone, não letra miúda de rodapé, e a hierarquia paga isso sem
hardcode nenhum.

Contraste, medido: `text-secondary` (#BFBFBF) sobre `feedback-success-surface`
(#0D1F0A) = **9,4:1**; `text-tertiary` (#999999) sobre a mesma = **6,05:1**. Os
dois passam AA com folga. **Esse par específico não está na matriz do
`contrast.test.ts` do DS** — as superfícies de feedback só têm o par
`feedback-success-fg × feedback-success-surface` lá. É um buraco pré-existente da
matriz, não uma regressão desta lane, e vale como item para quem cuidar do DS.

### D3 · O bloco do e-mail não é um `blocoDestaque`

Os dois códigos saem na mesma mensagem. O do ingresso é de cada participante,
mora dentro do cartão dele e vale 32px porque é o que o operador do balcão lê da
tela do celular a um metro. O da compra é UM para a mensagem inteira, vive no
corpo, **antes** dos cartões, e é lido de perto por quem vai escrever ao
atendimento. Mesma família tipográfica, um degrau abaixo em tamanho, fora da
moldura dos cartões: hierarquia sem competição.

A frase de uso ("É este o código a citar quando o assunto for a compra inteira")
não é enfeite. Sem ela o destinatário vê dois códigos e não sabe qual citar, que
é o problema que o bloco existe para resolver.

### D4 · A leitura dedicada do cartão, e não uma para todos os meios

Uma leitura única para todos os meios seria mais simples de contar, e custaria um
`getDoc` duplicado no PIX sobre o mesmo documento, na tela do dinheiro. O guard
por `forma === 'pix'` é o preço de não pagar isso, e ele está escrito no código
com a razão junto.

## Desvios e efeitos colaterais

- **O `Ticket` perdeu a linha do id** (achado acima). É o único desvio de escopo,
  e está declarado como conferência visual.
- **O reenvio administrativo herdou o código sem uma linha a mais.** Ele entra
  pela mesma camada de baixo (`entregarEmailIngressos`, F2 · BUILD-F2F5), então
  passa a carregar o código — inclusive nas compras que o backfill carimbar
  **depois** de o primeiro e-mail ter saído sem ele. Os dois testes de reenvio
  seguem verdes.
- **Nenhum campo novo em `pedidos/{id}`.** A lane só LÊ. Nenhuma escrita, nenhuma
  coleção, nenhuma Rule, nenhum índice.
- **`DestinatarioEmailIngressos` ganhou `codigoPedido?`**, e ele **não participa
  da chave de idempotência da RN-219** nem de nenhuma decisão do módulo — é dado
  de apresentação, e o comentário no tipo diz isso.
- **`firebase.build5c.json` novo**, no molde das outras lanes. Portas 8989/9989.
- **`functions/src/eventos/emitirIngressos.ts` está modificado na árvore e NÃO
  foi commitado** — é trabalho de terceiro. `git commit --only` com os nove
  caminhos meus.

## O que precisa de conferência VISUAL do dono

Nenhuma é bloqueio de gate; são as coisas que só olho humano decide.

1. **O cartão do ingresso sem o id** (achado acima). Ficou nome + "modalidade ·
   kit" e o QR. Vale ver se a coluna da direita parece vazia agora, e se falta
   alguma legenda — sabendo que o `codigoIngresso` não existe ainda nesse
   instante e que ele chega por e-mail.
2. **O e-mail com os dois códigos juntos, num cliente real.** É o item mais caro
   de errar: a distinção entre "Código da compra" e "Código do ingresso" foi
   desenhada por rótulo, posição e tamanho (20px contra 32px), e nenhum teste
   prova que ela funciona no Gmail e no Outlook. Recomendo olhar um e-mail de
   compra com **dois ou mais participantes**, que é onde a confusão nasce.
3. **A linha `Pedido PED-XXXXX` na tela de confirmação.** Ela está em `text-xs`,
   com o código um degrau acima em contraste. Vale ver se, para quem acabou de
   pagar, ela tem peso suficiente para ser notada como "o número que eu guardo".
4. **A tela vai parecer quebrada no ambiente local, e isso é a RN-475
   funcionando.** Mesma ressalva que a 5d registrou: `pedidos.seed.ts` grava os
   onze pedidos **sem** `codigoPedido`, então no emulator/preview toda compra
   existente aparece sem a linha do código e o e-mail sai sem o bloco. **Sem
   rodar o backfill da 5b contra o ambiente, a conferência visual dos itens 2 e 3
   não é conclusiva.** Não consertei o seed: `functions/src/seed` não é
   território desta lane.

## Vetores para a review antagonista

Em ordem de risco. A 5c não é ⚔ na fila, e o inventário confirma: nenhuma porta
nova, nenhuma escrita, nenhuma credencial, nenhuma Rule.

1. **A leitura dedicada do cartão é leitura a mais no caminho do dinheiro.** Ela
   roda depois de `charge` existir, é acessória (falha engolida com log) e não
   toca nenhum estado do desfecho — mas roda **em paralelo** ao `confirmar()`. Se
   alguma coisa no futuro fizer o `getPedido` lançar de forma síncrona ou
   bloquear, o caminho a atacar é esse. Tem teste de falha; não tem teste de
   lentidão.
2. **O código sobrevive à troca de cobrança?** Zerei em dois lugares (invalidação
   por preço e `novaCobrancaPix`). Se existir um terceiro caminho que troque o
   `pedidoId` sem passar por nenhum dos dois, a tela mostraria o código do pedido
   anterior — e essa é a única falha desta lane que faria alguém ditar a compra
   errada. Vale varrer por `setCharge(` e conferir se são só os três.
3. **`text-secondary` sobre `feedback-success-surface` não está na matriz do
   DS.** Medi 9,4:1 à mão. Se a review quiser gate de verdade, o conserto é
   acrescentar o par ao `contrast.test.ts` do design-system — fora do meu
   território, registrado aqui.
4. **O canário de fonte é regex, e regex tem borda.** Ele varre só
   `checkout/*.tsx` e só a forma `{...pedidoId}`. Um `dangerouslySetInnerHTML`,
   uma variável intermediária (`const ref = charge.pedidoId`) ou um arquivo em
   subdiretório passam por baixo dele. É canário, não prova — a prova são os
   casos de comportamento.
5. **A frase nova do e-mail é copy que ninguém revisou.** "É este o código a
   citar quando o assunto for a compra inteira. Cada participante tem o próprio
   código de ingresso, logo abaixo." Duas frases num e-mail que já é denso.
6. **R-4 da REV-COD5A continua valendo e não foi consertada aqui.** `PED–A2B3C`
   colado de um WhatsApp com autocorreção (en-dash) não normaliza, porque
   `normalizarCodigoPedido` só come `[\s-]+`. Não afeta a exibição (esta lane só
   formata), mas afeta quem tentar colar o código do e-mail numa busca. O
   conserto é no core, nos dois normalizadores no mesmo commit — como a review
   escreveu.
7. **O e-mail antigo continua verdadeiro depois do backfill?** Sim: o código
   nunca muda depois de criado. Mas o e-mail que **já saiu** sem código continua
   sem ele para sempre, e o reenvio administrativo é o único caminho para
   entregá-lo a quem comprou antes. Isso é produto, não defeito — registrado
   porque alguém vai perguntar.

## Para marcar em `leela-specs/` (não editei — selo do maestro)

- **`04-fila-codigo.md`, Frente 5:** a **5c** está **entregue** em `6993a36a`.
  Frente 5 fica com 5a, 5b, 5c e 5d entregues; falta a execução do backfill, que
  é ato do dono.
- **`06-spec-codigo-pedido.md`, tabela "As superfícies, varridas":** as linhas
  **1**, **2** e **3** estão feitas. A linha 7 (`EstornosAdminRoute`) e a 9
  (logs) seguem inalteradas, como a spec decidiu.
- **A tabela ganhou uma linha que não existia:** `Ticket.tsx` — o `inscritoId`
  como sexta superfície humana do id. Ela merece ficar escrita, porque a próxima
  varredura por `pedidoId` vai deixá-la passar de novo.
- **Ordem de deploy:** o backfill (5b) tem de rodar **antes** de a 5c ir ao ar,
  senão a tela e o e-mail estreiam sem referência em toda compra existente —
  correto pela RN-475, mas indistinguível de defeito para quem estiver olhando.
