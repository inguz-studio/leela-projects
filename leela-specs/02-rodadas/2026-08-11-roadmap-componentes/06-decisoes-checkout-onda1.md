---
tags: [leela, checkout, decisoes, onda-1, carga-cognitiva]
aliases: [Decisões do checkout · Onda 1]
atualizado: 2026-08-11
---

# Duas decisões que a Onda 1 encontrou no checkout

> **De onde vieram.** A medição de carga da Onda 1 contou **16 passos** até pagar na tela do PIX,
> três deles postos ali pela arquitetura e não pelo job (`04-ondas-roadmap.md`, "Os três passos de
> arquitetura do checkout, nomeados"). Um era código de meia hora e **já foi pago** nesta lane: a
> opção única não cobra mais clique (`StepModalidadeKit.tsx`, teste em
> `checkout-onda1-opcao-unica.test.tsx`). Os outros dois não se consertam trocando componente,
> porque não são defeito de frontend — são escolha de produto com dono fora daqui.
>
> **O que a lane fez com eles.** Nada no comportamento. Nenhuma linha do endereço mudou, nenhuma
> linha do PIX mudou. Os dois estão escritos abaixo no formato do painel do dono
> (`01-produto/DECISOES-ABERTAS.md`), prontos para colar, porque a regra da casa é que dinheiro e
> dado pessoal sempre sobem — e um deles é dado pessoal, o outro é dinheiro que a pessoa não sabe
> se pagou.
>
> **Personagens.** Ana compra, Castelo organiza. Ilustrativos, não pessoas do banco.

---

## CKENDERECO-1 · o checkout cobra endereço completo de quem vai retirar o kit no balcão

O checkout exige CEP, logradouro, número, cidade e UF do responsável para concluir qualquer compra
(`validacao.ts:109-125` — os cinco reprovam o avanço da etapa). E o próprio produto diz, na tela
anterior, que o kit **não é enviado**: a descrição de todo kit é *"Retirado nas janelas do evento,
mediante documento"* (`StepModalidadeKit.tsx`), e a página pública tem uma seção inteira de janelas
de retirada com dia, hora e local. Nada no fluxo despacha nada pelo correio. O endereço não serve
ao trabalho de se inscrever e pagar — serve a uma exigência à parte, que não está declarada como
tal em lugar nenhum do código nem das regras de negócio.

- **Caso de uso:** a Ana se inscreve pelo celular na fila do supermercado, já escolheu modalidade e
  kit, e a etapa seguinte pede o CEP dela. Ela não vai receber nada em casa: vai buscar o kit na
  véspera, no ginásio, com documento na mão. São dois campos obrigatórios entre ela e o pagamento,
  num formulário que ela preenche de pé.
- **Job story:** quando eu me inscrevo numa corrida e vou retirar o kit no local, eu quero informar
  só o que a inscrição precisa, para não entregar meu endereço nem gastar tempo com campo que não
  muda nada no que eu vou receber.
- **O que fica com você:** dizer **por que** o endereço é cobrado. São duas respostas possíveis e
  elas levam a lugares opostos: ou existe uma exigência (fiscal, de nota, de contrato com o
  organizador, de política de dados) e então ela precisa estar escrita como regra de negócio e
  aparecer na tela como justificativa; ou não existe, e o endereço sai do caminho feliz.
- **Por que agora:** é o segundo dos três passos de arquitetura da tela mais cara do produto, e o
  único cujo destino depende de você. Com a auto-seleção já paga, o checkout vai de 16 para 14
  passos; com esta resposta liberando, vai para **12**. E há a metade que não é de carga: enquanto
  a exigência não estiver escrita, a plataforma coleta endereço de todo comprador sem finalidade
  declarada, que é a conversa do LGPD-1 aplicada a um campo que já está no ar.
- **Opções:**
  - **Escrever a exigência e mostrá-la** (**default proposto**): o endereço continua obrigatório,
    nasce uma RN dizendo para que ele é coletado e por quanto tempo fica, e a etapa ganha uma linha
    de justificativa em vez de pedir em silêncio. Custa uma regra e uma frase; não mexe no fluxo e
    não mexe no que já foi coletado. É o default porque é o único caminho que não presume qual das
    duas verdades é a verdadeira, e porque coletar dado pessoal sem finalidade declarada é a coisa
    que a casa não faz de propósito.
  - **Endereço só quando houver entrega:** o campo aparece quando o kit tem envio, e some quando a
    modalidade de entrega é retirada presencial. Derruba dois passos do caminho feliz de todo
    evento com retirada no balcão — que é, hoje, todo evento. Exige saber que o produto vai passar
    a ter envio algum dia, senão é código para um caso que não existe.
  - **Endereço opcional, sempre:** o campo continua na tela, ninguém é barrado por ele. Mais barato
    de construir, e o pior dos três se a exigência for real, porque troca uma fricção visível por
    um buraco invisível no dado.
- **Onde aterrissa:** `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/StepDados.tsx` e
  `validacao.ts` (`validarEndereco`); RN nova em [[LEELA-E12-landing]], ou a marcação de opcional
  na regra que existir. Medição de origem em
  `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md`, Onda 1.

---

## CKPIX-1 · quem paga o PIX pelo aplicativo do banco não descobre que pagou

Depois de gerar a cobrança PIX, a tela do comprador **não** acompanha o pagamento sozinha. Ela lê o
estado do pedido em duas ocasiões e só duas: no carregamento da tela, e quando a pessoa clica
**"Atualizar estado do pedido"** (`StepPagamento.tsx`; a fiação está comentada em
`CheckoutFlow.tsx`). Isso é escolha registrada, não esquecimento — a **RN-470** diz que a v1 vai
sem `onSnapshot` e sem polling, e o comentário do código nomeia o incidente de 04/08 que originou a
regra: o PIX real foi pago, o webhook materializou `pago` em dez segundos, e a tela não tinha como
saber. A S1225 abriu a leitura e criou o botão; o que ela não fez foi tirar da pessoa a obrigação
de perguntar.

O caso que dói é o mais comum de todos: pagar PIX é sair do navegador. A pessoa abre o aplicativo
do banco, cola o código, confirma, e a confirmação acontece **fora da aba**. Se ela não voltar e
clicar, a inscrição dela fica, para ela, num limbo — o dinheiro saiu e a tela não diz nada.

- **Caso de uso:** a Ana copia o código, troca para o app do banco, paga, e volta ao navegador
  quinze segundos depois. A tela é a mesma de antes: QR, contagem regressiva e um botão cinza. Ela
  não sabe se precisa pagar de novo. Metade das pessoas nessa situação recarrega a página; a outra
  metade escreve para o organizador — e o Castelo passa a responder "já entrou, pode ficar
  tranquila" no dia inteiro do lote.
- **Job story:** quando eu pago um PIX pelo aplicativo do banco, eu quero que a tela da inscrição
  me diga sozinha que o pagamento entrou, para eu não pagar duas vezes nem ter que perguntar a
  alguém se deu certo.
- **O que fica com você:** se a v1 sobe assim. A RN-470 foi escolha explícita de **custo**, e o
  custo mudou de tamanho agora que a venda é real: o preço de manter é atendimento e desconfiança
  no minuto seguinte ao pagamento, e o preço de trocar é leitura contínua no Firestore por
  comprador em espera.
- **Por que agora:** é o passo de arquitetura mais caro medido no produto inteiro, e a Onda 1 o
  deixou **fora do seu escopo de propósito** — trocar componente não conserta isto. Ele volta à
  mesa quando alguém decidir pagar a conta, e esta é a hora de decidir se é agora ou depois do
  primeiro lote com volume.
- **Opções:**
  - **Polling curto enquanto a cobrança está viva** (**default proposto**): a tela relê o pedido a
    cada poucos segundos, só enquanto o PIX está no ar e a aba está visível, e para sozinha ao
    confirmar ou ao expirar. É o default porque tem teto de custo conhecido (a janela do PIX é de
    30 minutos e nada roda com a aba em segundo plano), não muda as Rules, não muda o servidor, e
    resolve o caso que dói. O botão continua na tela para quem quiser forçar.
  - **`onSnapshot` no pedido:** a confirmação aparece no instante em que o webhook grava. É a
    melhor experiência possível e a mais cara — listener aberto por comprador em espera, com custo
    que cresce com a fila do lote em vez de com a venda.
  - **Manter a RN-470 como está, e dizer isso na tela:** nenhum código de leitura nova; o que muda
    é a frase — a tela passa a instruir explicitamente *"pagou pelo app do banco? toque em
    atualizar"*, em vez de deixar o botão falar sozinho. Não resolve, mas para de fingir que a
    pessoa deveria adivinhar. É a opção honesta se a resposta for "agora não".
- **Onde aterrissa:** `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/StepPagamento.tsx` e
  `CheckoutFlow.tsx` (`consultarPedido`); RN-470 em [[LEELA-E12-landing]]. Medição de origem em
  `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md`, Onda 1.

---

## O que a lane NÃO fez, e por quê

Nenhuma string do checkout mudou nesta rodada. Os avisos de pedido em confirmação, a sexta recusa
do cartão e as frases de estado do PIX carregam decisões recentes, e restyle que reescreve texto é
como uma decisão do dono morre sem ninguém notar. A conversão de componente da Onda 1 passou por
`AvisoPedidoEmConfirmacao`, `StepConfirmacao`, `PixCobranca` e `StepPagamento` sem tocar em uma
palavra — o diff é de `className` e de nome de tag, e é conferível assim.
