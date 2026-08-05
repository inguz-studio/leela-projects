---
tags: [leela, decisoes, rodada, contas, primeiro-acesso, cadastro, adminsep]
trace: leela-pixreal-diag-20260804
lote: SPEC-CONTAS-LANDING
data: 2026-08-05
---

# 01-decisões · As duas portas do modal de entrada, e o fechamento do ADMINSEP-1

> Três falas do dono na mesma conversa. As duas primeiras abrem uma frente: a landing passa a
> ter criação de conta e um primeiro acesso que não depende de link de e-mail. A terceira
> fecha um item que estava no painel desde 04/08.
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

A terceira fala responde ao ADMINSEP-1 e está registrada na seção própria abaixo.

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

## O que esta rodada devolve ao painel

Três coisas sobem, e nenhuma delas foi decidida por conta própria.

**CONTA-1** pergunta se o código de seis dígitos substitui o link do e-mail da compra ou se os
dois convivem. É pergunta de verdade porque a casa tem doutrina escrita contra duas
superfícies de credencial para a mesma capacidade, e a construção do link aterrissou na noite
de 05/08.

**CONTA-2** pergunta se a criação de conta passa a ter uma porta ou duas, agora que a landing
ganha a dela e o `/cadastrar` do painel, sob a RN-461, deixa de criar conta de organizador e
passa a criar conta na Leela — que é exatamente a mesma coisa que a porta nova faz.

**POSSE-EMAIL-1** não é item novo: é o item que já estava no painel, e esta rodada acrescenta a
ele uma recomendação com o custo na mão. O código de seis dígitos é a prova de posse que
faltava, e o parágrafo com o que sobra do item depois dela está em
`02-spec-contas-landing.md` §"O encontro com o POSSE-EMAIL-1". A ratificação continua sendo do
dono.

## Vizinhos

`02-spec-contas-landing.md` tem a spec das duas máquinas, a pesquisa da Cheers e a mecânica do
código. `03-rns-delta.md` tem as sete regras novas, todas canônicas nos épicos. `04-fila-codigo.md`
tem as tarefas em ordem, com as dependências reais e as marcações de review antagonista.
