---
tags: [leela, decisoes, rodada, contas, primeiro-acesso, cadastro, adminsep, posse-email]
trace: leela-pixreal-diag-20260804
lote: SPEC-CONTAS-LANDING
data: 2026-08-05
---

# 01-decisões · As duas portas do modal de entrada, e os fechamentos do ADMINSEP-1 e do POSSE-EMAIL-1

> Cinco falas do dono na mesma conversa. As duas primeiras abrem uma frente: a landing passa a
> ter criação de conta e um primeiro acesso que não depende de link de e-mail. A terceira e a
> quarta fecham itens que estavam no painel desde 04/08 e 05/08. A quinta ratifica de passagem
> a unidade da taxa mínima.
>
> Zero código. O território desta lane foi `leela-specs/`, e toda afirmação sobre o repositório
> foi medida com o caminho citado.

## O que o dono pediu

**Sobre o modal de "Entrar", verbatim:**

> "Entrar precisa ter a logo da Leela, e precisamos colocar um CTA como botão terciário
> pequeno, para a pessa criar conta, nao temos esse fluxo de criação de conta na nossa landing
> page."

**Sobre o que os CTAs fazem, verbatim:**

> "Podemos ter o CTA 'É meu primeiro acesso' e Criar conta, primeiro acesso a pessoa define
> senha, após receber um código de verificação de 6 dígitos numeros enviados por e-mail, e
> criar conta cria a conta nova de usuário, sem ser a profissional. Se tiver dúvidas, simule o
> fluxo da cheers"

**Sobre a fronteira de acesso, respondendo ao ADMINSEP-1, verbatim:**

> "Acho que podemos deixar separado o acesso de cliente e o acesso admin mesmo."

**Sobre a posse do e-mail, respondendo ao POSSE-EMAIL-1, verbatim:**

> "pode aplicar o POSSE-EMAIL-1 na mesma onda."

**Sobre a unidade da taxa mínima, de passagem, verbatim:**

> "a taxa minima ficou por pedido mesmo né? nao por ingresso"

## O que cada fala decide

A primeira fala tem duas partes e só uma delas é desta lane. A logo no modal já está sendo
construída pela lane `BUILD-MOTION`, que tem o `EntrarOverlay.tsx` no território dela agora.
O que fica aqui é o resto: dois CTAs no modal, ambos como botão terciário pequeno, e o fato
declarado de que a criação de conta não existe na landing hoje.

Esse fato é verdadeiro e vale precisar onde ele dói. O header da landing tem um botão escrito
"Criar conta de organizador", e ele aponta para **outra origem** — o `/cadastrar` do painel
(`PublicHeader.tsx:74-79`). É a mesma travessia de origem que a `S1221-T1` acabou de desfazer
para o "Entrar". Para quem quer participar de uma experiência, e não produzir uma, não existe
porta nenhuma: o único jeito de a conta nascer é comprar.

A segunda fala define as duas máquinas. **Primeiro acesso** é para quem já tem conta — ela
nasceu na compra, sem senha, e hoje o único caminho até uma senha é o link que sai por e-mail.
Passa a ter um caminho que a pessoa inicia sozinha: informa o e-mail, recebe um código
numérico de seis dígitos, digita, define a senha e entra. **Criar conta** é cadastro novo de
participante, com a mesma verificação por código, e a fala fecha a fronteira em quatro
palavras: "sem ser a profissional". A conta profissional continua nascendo pela promoção que a
RN-461 já definiu, sobre uma conta que já existe.

A terceira e a quarta falas respondem ao ADMINSEP-1 e ao POSSE-EMAIL-1, e cada uma tem seção
própria abaixo. A quinta é confirmação: a taxa mínima é **por pedido**, e é assim que ela
nasceu. A RN-491 já diz que a unidade é o pedido, e diz por medição, não por escolha nova — a
taxa é calculada uma vez sobre o `valorFinal` do pedido depois do cupom
(`packages/core/src/checkout/saleState.ts:369-371`), então uma compra de dez ingressos paga um
piso e não dez. A correção que originou isso é do próprio dono, em 05/08, e está registrada em
`../2026-08-05-metricas-e-servico/01-decisoes-dono.md` §D-0805-3. Nada muda; o registro existe
porque pergunta respondida em conversa desaparece, e esta volta sozinha na primeira tela de
configuração de taxa.

## A referência que o dono citou, e o que ela devolveu

"Se tiver dúvidas, simule o fluxo da cheers." É a segunda vez que a Cheers aparece como
referência: a primeira foi em 04/08, na leva que gerou a RN-463, e a ambiguidade daquela frase
está no painel como **QUALIF-4**. Aqui a leitura não é ambígua — ele está mandando conferir
como a Cheers resolve entrada e cadastro antes de desenhar.

A pesquisa foi feita e o que ela devolveu está em `02-spec-contas-landing.md` §"O que a
referência da Cheers devolveu", com fonte e data em cada linha, separando o que foi lido do
que foi inferido. O resumo honesto: a Cheers **não publica** documentação do mecanismo de
verificação, e o que se lê nas superfícies públicas dela confirma a forma do fluxo, não a
mecânica. O código de seis dígitos, portanto, é decisão do dono nesta fala — não é cópia
verificada da Cheers, e está escrito assim para que ninguém o defenda depois com uma
autoridade que a pesquisa não sustenta.

## Fechamento do ADMINSEP-1

O item perguntava até onde vai "ambientes separados", depois de o dono corrigir, em 04/08, um
registro errado do maestro sobre acúmulo de papéis. A pergunta oferecia três profundidades.

**A resposta, verbatim:** *"Acho que podemos deixar separado o acesso de cliente e o acesso
admin mesmo."*

A profundidade escolhida é a primeira: **só as superfícies de login**. Contas distintas, que já
era o default proposto e já entrava na fila de qualquer forma. É o que a RN-449 e a RN-450 já
dizem, e o que a `S1222-T5` construiu em `bdebe384`, onde nenhum caminho da área do cliente
alcança `/plataforma`.

**A alternativa que foi considerada e não foi escolhida por ora:** somar um **endereço próprio
para o painel de administração**, saindo do mesmo repositório. Era a recomendação do maestro,
e o motivo dela continua verdadeiro — enquanto painel do organizador e painel da plataforma
compartilham origem, uma falha de tela no primeiro alcança o token que abre a plataforma
inteira, e App Check não pode ser ligado só no segundo. Não foi escolhida agora, e fica
registrada aqui para não voltar como surpresa numa rodada futura. Ela não bloqueia nada: era
descrita como segunda onda desde o dia em que subiu ao painel.

A terceira opção, **projeto Firebase separado**, seguia recomendada para recusa e não foi
escolhida. O motivo permanece: o administrador opera sobre o mesmo banco cross-tenant, e a
fronteira que importa é o token, não o projeto.

**O que continua aberto:** o **ADMINSEP-2** (para qual painel o botão da área do cliente leva)
e o **ADMINSEP-3** (a conta de super-admin de produção é a conta de demonstração). Nenhum dos
dois depende desta resposta. O ADMINSEP-3, aliás, tinha escrito no próprio corpo que não
esperava o ADMINSEP-1.

## Fechamento do POSSE-EMAIL-1

O item estava no painel desde 05/08, saído da review antagonista da S1225. Ele perguntava se o
vínculo por e-mail continuava valendo como chave de leitura do pedido enquanto ninguém provasse
posse daquele endereço.

**A resposta, verbatim:** *"pode aplicar o POSSE-EMAIL-1 na mesma onda."*

A onda são os dois fluxos de conta com código de seis dígitos desta rodada. A tarefa **C2**
(`S1230-T4`) sai do gate e passa a andar com a Onda A, atrás da A4.

### A exposição, como a REV-AREACLIENTE a mediu

A cadeia inteira foi percorrida e ela fecha assim. Alguém registra `vitima@x.com` no
`/cadastrar`, que é aberto, e **nunca verifica** o endereço. A vítima compra usando o próprio
e-mail. Na confirmação, o `contaSemFriccao.ts:203` acha a conta do primeiro pela busca de
e-mail e carimba `contaUid` nela. A **área do cliente nega**, porque o callable exige e-mail
verificado e o gate segurou. E a **Rule permite**, entregando o pedido inteiro: nome, e-mail,
telefone, endereço, aceites, itens e valores.

Duas medidas vão junto do fato, porque sem elas o tamanho do caso vira opinião. **Atenuante:**
é preciso conhecer o `pedidoId`, que é `ped-{uid}-chk-{chave}` e não é enumerável, o que põe a
severidade real em **média**. **Agravante que não dependia de conhecer nada:** a vítima ficava
trancada fora da própria compra, porque não criava conta com o endereço tomado, não recebia o
e-mail de "conta criada" (ele é `nao_aplicavel` de propósito nesse caso) e não tinha caminho
até uma senha. Essa metade **já tinha sido removida** pelo fix D1 da mesma review, que ligou o
"Não sei minha senha": a vítima pede o link, o Firebase prova a posse e ela retoma a conta.

A medição está em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-AREACLIENTE.md`, e o fato
de a área ser estritamente mais fechada que a Rule é o que localiza a exposição do lado da
Rule, não do lado da tela.

### A correção exata

Uma linha: acrescentar `&& request.auth.token.email_verified == true` **só no ramo (b)** de
`ehCompradorDoPedido()`, o do vínculo por conta (`contaSemFriccao.contaUid`).

⛔ **O ramo (a) não pode recebê-la.** Ele é o `responsavel.atletaId`, que é o uid da sessão
**anônima** do checkout, e sessão anônima nunca tem `email_verified`. Exigi-la ali quebraria a
consulta do próprio pedido logo depois de pagar — a **S1225-T3**, que está em produção e é a
primeira metade do conserto de 04/08. A fronteira continua imóvel nos dois sentidos, e o caso 6
da suíte da BUILD-A4 fica vermelho se alguém a mover.

### O argumento que destravou

É o que faz a decisão fazer sentido daqui a três meses, e por isso fica escrito por extenso.

**A hesitação nunca foi sobre o tamanho da exposição — era sobre o custo colateral.** Exigir
`email_verified` hoje trancaria quem comprou e nunca verificou o endereço, e essa pessoa
dependia de um link por e-mail para conseguir verificar. Cobrar a prova de alguém sem lhe dar
caminho até ela é remédio que produz a própria doença.

**Com o código de seis dígitos, essa pessoa passa a ter caminho próprio.** Ela pede, digita,
define a senha, e o servidor carimba `emailVerified` no mesmo gesto (RN-476, tarefa A4). Depois
disso, **toda sessão nomeada da landing tem o e-mail verificado**, porque não existe caminho até
uma senha que não passe pela prova. O remédio deixa de ter efeito colateral, e é só isso que
mudou.

**A metade do atacante morre na origem, pela RN-478:** nenhuma conta nasce antes do código
provado, então digitar o endereço de terceiro na porta da landing não cria conta, não ocupa o
endereço e não impede nada.

Conferido quem ficaria de fora, que é o teste da afirmação: quem comprou e ainda não fez o
primeiro acesso continua lendo o próprio pedido pela sessão do checkout, que é o ramo que não
muda, e continua abrindo o ingresso pelo link assinado (RN-452). Ninguém fica trancado.

### O que sobra depois desta decisão

Sobra o vínculo em si. O `contaSemFriccao.ts:203` continua escolhendo a conta por igualdade de
endereço, e um erro de digitação no checkout continua carimbando a compra na conta errada. O
que muda é que essa conta só lê o pedido se **também** tiver provado posse daquele endereço, o
que reduz o caso a alguém que de fato controla a caixa para a qual a compra foi endereçada — e,
nesse cenário, o e-mail com o ingresso já teria chegado nessa mesma caixa de qualquer forma.

Sobra também a outra porta: o `/cadastrar` do painel continua criando conta sem verificar o
e-mail, e enquanto ele existir a metade do atacante fica de pé por ali. É matéria do
**CONTA-2**, que continua no painel.

## O que esta rodada devolve ao painel

Duas coisas sobem, e nenhuma delas foi decidida por conta própria.

**CONTA-1** pergunta se o código de seis dígitos substitui o link do e-mail da compra ou se os
dois convivem. É pergunta de verdade porque a casa tem doutrina escrita contra duas
superfícies de credencial para a mesma capacidade, e a construção do link aterrissou na noite
de 05/08.

**CONTA-2** pergunta se a criação de conta passa a ter uma porta ou duas, agora que a landing
ganha a dela e o `/cadastrar` do painel, sob a RN-461, deixa de criar conta de organizador e
passa a criar conta na Leela — que é exatamente a mesma coisa que a porta nova faz.

**POSSE-EMAIL-1 desceu no mesmo dia.** Ele não era item novo, e esta rodada acrescentou a ele
uma recomendação com o custo na mão — a análise está em `02-spec-contas-landing.md` §"O
encontro com o POSSE-EMAIL-1". O dono respondeu na mesma conversa, o item saiu do painel pela
disciplina de limpeza e o registro completo é a seção acima.

## Vizinhos

`02-spec-contas-landing.md` tem a spec das duas máquinas, a pesquisa da Cheers e a mecânica do
código. `03-rns-delta.md` tem as sete regras novas, todas canônicas nos épicos. `04-fila-codigo.md`
tem as tarefas em ordem, com as dependências reais e as marcações de review antagonista.
