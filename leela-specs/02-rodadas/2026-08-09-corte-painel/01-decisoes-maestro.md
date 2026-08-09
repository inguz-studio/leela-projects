---
tags: [leela, decisoes, rodada, corte-painel, governanca]
trace: leela-painel-corte-20260809
lote: PAINEL-CORTE
data: 2026-08-09
fonte: DECISOES-ABERTAS
---

# 01-decisões do maestro · os 39 itens que deixaram de ser do dono

> **O que este arquivo é.** O registro completo do corte de 09/08 no painel. Cada item que saiu do
> [[DECISOES-ABERTAS]] está aqui com quatro coisas: o que ele perguntava, a decisão que passou a
> valer, o porquê em uma frase e a **condição que o traz de volta**. Nada foi apagado. O painel
> passou a carregar só o que é do dono, e o histórico do que fechou mora aqui, que é a disciplina
> de limpeza que o painel já declarava.
>
> **Isto não é um painel paralelo.** Não existe pergunta aberta nesta página. Se alguma linha daqui
> divergir do painel, o painel manda, e a divergência é defeito meu.

## A ordem que abriu a rodada

Verbatim, do dono, em 2026-08-09:

> "67 decisoes nao é razoável, deixe decisões de negócio, e produto para mim. Algumas voce é
> perfeitamente capaz de resolver, como duplicidades, CTA's inconsistenets,contrastes."

## O critério de corte

Ele nomeou três famílias e elas são exemplo, não lista fechada. A régua que passou a valer:

**Fica com o dono** quando o item é uma destas cinco coisas.

1. **Dinheiro cobrado.** Preço, taxa, piso, repasse, juros, comissão. Não converte sem ele, nunca.
2. **Dado pessoal, LGPD, jurídico.** Consentimento, dado sensível, prova de aceite, retenção.
3. **Posicionamento, vocabulário de marca, naming.** O rótulo que define o produto, não o rótulo
   que só está inconsistente com outro.
4. **Forma do produto e estratégia.** O que entra na V1, o escopo de uma frente, o desenho de uma
   superfície nova.
5. **Ação que só ele executa fisicamente.** Senha, console, conta de terceiro, dado de produção
   que ele cadastra pela tela.

**Sai decidido** quando é uma destas quatro.

1. **Duplicidade.** Dois itens perguntando a mesma coisa, ou item cuja resposta já decorre de uma
   decisão que ele deu.
2. **Inconsistência de rótulo ou de tela.** Duas superfícies dizendo coisas diferentes sobre o
   mesmo fato. Inconsistência é defeito, não escolha.
3. **Contraste e calibragem visual** com número medido e recomendação escrita no próprio item.
4. **Ratificação de regra que já está em vigor**, quando a alternativa é recusada pela doutrina da
   casa ou por medição já feita.

Falhar em uma das cinco primeiras basta para o item continuar sendo dele. Foi por isso que
**SEMKIT-1** sobreviveu ao corte, encolhido: a escolha do reparo cai, a autorização para escrever
em campo de preço de produção não cai.

Esta régua é a de 06/08 (`02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md`) levada
adiante. A de lá convertia por idade e silêncio; esta converte por natureza do item. As duas
recusam a mesma coisa: dinheiro e dado pessoal não convertem.

## A conta

| | Antes | Depois |
|---|---|---|
| Decisões que dependem de você | 59 | 23 |
| Ações que só você pode executar | 7 | 5 |
| Decisão escondida na fila de construção | 1 | 0 |
| **Total** | **67** | **28** |

Dos 39 que saíram: **37** foram decididos aqui, **1** foi absorvido por outro item que já é a mesma
conversa e **1** fechou porque a ação já tinha sido executada.

## Tabela-resumo

| Item | O que era | Decisão | Vai para | Reabre quando |
|---|---|---|---|---|
| PONTE-ELEGIVEL-1 | a porta deixa passar quem o resgate vai recusar | sexta recusa nomeada na ponte | fila · código, lane própria | — |
| VITRINE-VEU-1 | o véu do aviso não bloqueia leitor de tela | trocar pelo `Modal` do design system | fila · código | — |
| VITRINE-CONTRASTE-1 | o cartão do aviso some no véu (1,13:1) | borda em `--border-strong` (3,82:1) | fila · código | o dono mandar clarear `--surface-raised` |
| SCROLLBAR-1 | a barra veste a marca ou fica nativa | nativa temada fica | só registro | o dono pedir a barra na cor da marca |
| ADMINSEP-2 | o botão leva ao painel do organizador ou ao de plataforma | organizador | fila · spec | o dono quiser atalho para a plataforma |
| CONTA-1 | o código de seis dígitos convive com o link do e-mail | convivem | só registro | uma review de segurança tratar as duas superfícies como risco |
| CONTA-2 | criar conta ganha duas portas | uma porta, na landing | fila · código | — |
| INSCR-1 | o "N inscritos" público conta o mesmo que o painel | mesma verdade nas duas telas | fila · código | — |
| CONV-1 | o card de conversão promete o que não medimos | esconder até haver contagem de visitas | fila · código | existir contagem de visitas |
| PARSE-1 | cinco frases e treze mensagens inalcançáveis | as cinco frases entram; os treze campos trocam | fila · código | o dono reescrever alguma das cinco |
| RESPIRO-1 | vinte pixels de respiro no topo | ficam | só registro | o olho dele achar torto no passeio do item 69 |
| MODAL-1 | editar modalidade até a venda ou até publicar | até a venda, como a Rule já aplica | fila · destrava S316 | aparecer edição indevida com evento no ar |
| MODAL-2 | remover modalidade recusa ou arrasta o lote | recusa e nomeia quem impede | fila · destrava S316-T3 | — |
| SENHA-1 | ratificar o e-mail de senha na Brevo | ratificado por uso | fila · deploy do conserto | o dono mandar voltar ao envio do Firebase |
| QUALIF-1 | o número do CNPJ na promoção ou no recebimento | no recebimento; só a pergunta na promoção | fila · spec | o dono quiser o número na porta |
| QUALIF-2 | CPF é credencial de login ou só identificação | só identifica | fila · spec | o login social sair do produto |
| QUALIF-3 | até onde vai o rebatismo | só o rótulo visível | fila · spec | um refactor grande tornar o rename barato |
| QUALIF-4 | "fluxo de referência" era exemplo ou indicação | era exemplo | só registro | o dono abrir programa de indicação |
| QUALIF-5 | Apple Sign-In depende de conta que só ele abre | Google agora, Apple quando as chaves existirem | fila · spec | ele abrir a Apple Developer Account |
| DEPLOY-1 | quando a máquina da porta do organizador sobe | sobe no próximo deploy, com o seed retido pelo LGPD-1 | fila · código | — |
| 66 | o botão aponta para `be-hero.com.br` | o domínio sai do código | fila · código | — |
| VITRINE-1 | publicar passa a exigir preço | não; fica o alerta crítico | só registro | `criarEvento` passar a criar lote |
| ARENA-3 | onde a Arena Social mora | seção da área do cliente | fila · spec | o E17 entrar em construção |
| CODPED-1 | o prefixo do número da compra | `PED-` | só registro | uma constante e um redeploy, quando ele quiser |
| PEDLIST-1 | o comprador lista as compras atravessando produtoras | mantida, e escrita na RN-469 | fila · spec | uma review achar dado de terceiro na resposta |
| PROJPED-1 | campo novo no pedido nasce visível ao comprador | ratificada | só registro | as Rules ganharem seleção de campo |
| REENVIO-PARCIAL-1 | o reenvio entrega meia lista e fecha o chamado | avisa e deixa seguir | fila · código | — |
| INSCRITO-APAGADO-1 | anomalia em pedido pago sem extrato | abre pendência com o motivo | fila · código | — |
| PDF-SPINNER-1 | o botão do PDF sem indicador próprio | fica como está | só registro | queixa real de duplo clique no celular |
| CODPED-PODA-1 | podar a coleção de reservas de código | não podar; alertar no contador certo | fila · spec | — |
| RN469-PROJECAO-1 | a área mostra 6 dos 16 campos da compra | ganha tela de detalhe da compra | fila · código | a rota se mostrar cara |
| CTA-PIX-1 | "ver meus ingressos" com o PIX pendente | rotular por estado | fila · código | — |
| ADMIN-VE-AREA-1 | a conta de administração vê a área do cliente | mantido | só registro | separação de endereço voltar à mesa |
| AREA-MUDA-1 | quem teve o vínculo recusado vê a tela de quem nunca comprou | a área explica em uma frase | fila · código | — |
| TROCA-EMAIL-1 | quem troca de e-mail perde o histórico em silêncio | fail-closed, com aviso | fila · código, junto do AREA-MUDA-1 | — |
| ACUMULO-ESTOQUE-1 | contar o estoque que a RN-449 deixou dentro | varredura autorizada, só leitura | fila · código | **o número voltar maior que zero** |
| PERFIL-1 | a produtora é Leela e o endereço é `/@castelo` | `/@castelo` fica | só registro | o endereço incomodar |
| ACEITE-1 | ninguém sabe qual termo de saúde a pessoa aceitou | **absorvido** pelo LGPD-1, frente 3 | painel, dentro do LGPD-1 | — |
| 34 | a jornada completa no ar, com a compra real | **fechado por execução** em 04/08 | só registro | — |

---

## Parte 1 · Os que viram conserto

Vinte e sete itens saíram do painel e viraram trabalho: **dezessete** mexem em código e **dez**
mexem só em spec, regra ou board. A fila com território e critério de aceite por item está em
[[02-fila-execucao]], e é ela que separa os dois.

### PONTE-ELEGIVEL-1 · a porta deixa passar duas contas que o resgate vai recusar

**O que era.** A porta nova recusa, com frase própria, só a conta de administração. O resgate do
código recusa cinco estados. O divulgador e a ex-organizadora rebaixada atravessam a porta,
esperam o convite e ouvem que o código não presta.

**Decisão.** A porta ganha a sexta recusa nomeada, que é a recomendação da própria review.

**Porquê.** A porta recusar menos que o resgate é inconsistência de contrato entre duas guardas do
mesmo caminho, e o argumento anti-enumeração que sustentava a recusa uniforme quase não vale aqui,
porque o alvo é a conta de quem já está logada.

**Como entra.** Mudança de contrato de chamada, então não pega carona em deploy pronto: lane
própria, com review antagonista, como a review pediu.

**Reabre quando.** Não reabre. Se a régua anti-enumeração mudar, a conversa é do LGPD-1.

### VITRINE-VEU-1 · o aviso se anuncia bloqueante e não bloqueia leitor de tela

**O que era.** O véu do aviso de boas-vindas para o ponteiro do mouse e não para mais nada. Oito
controles do fundo continuam alcançáveis, e um clique de tecnologia assistiva navegou o painel
para `/marcas` com o aviso na tela, em silêncio absoluto.

**Decisão.** Trocar pelo `Modal` do design system.

**Porquê.** Defeito de acessibilidade medido, com componente pronto que vinte e seis telas do
painel já usam. Escrever à mão uma versão pior de um componente existente é o oposto da regra de
reaproveitar antes de escrever.

**Reabre quando.** Não reabre. O ajuste visual da moldura do Modal é parte do conserto, não
decisão nova.

### VITRINE-CONTRASTE-1 · o cartão do aviso não se separa do véu

**O que era.** No tema escuro o cartão do aviso dá 1,13:1 contra o fundo velado, e a borda fina dá
1,31:1, num piso de 3:1 que a WCAG pede para o limite de um componente.

**Decisão.** Subir a borda do cartão de `--border-subtle` para `--border-strong`, que dá 3,82:1.

**Porquê.** Número reprovando AA com fix medido é conserto. É uma classe, não toca superfície
nenhuma, e duas lanes independentes chegaram ao mesmo par.

**Reabre quando.** O dono mandar clarear `--surface-raised` no tema brasa, que resolveria em todo
modal do painel de uma vez e mexe na paleta.

### ADMINSEP-2 · para onde leva o botão da área do cliente

**O que era.** O botão leva ao painel do organizador ou ao painel da plataforma.

**Decisão.** Ao painel do organizador, e ele só aparece para quem também é organizador.

**Porquê.** A outra leitura produz um botão que nasce morto: o painel de plataforma passou a viver
em conta separada por decisão dele, então o botão nunca apareceria para um cliente. Não é escolha
entre dois desenhos, é um desenho e um beco.

**Como entra.** Ratificação que vira frase na RN-451 e destrava a task B5. Não toca código servido.

**Reabre quando.** Ele quiser um atalho da área do cliente para a plataforma, o que pediria
desfazer a separação de contas.

### CONTA-2 · criar conta ganha duas portas, e uma delas nem existe

**O que era.** A porta nova de criação de conta nasce na landing; o `/cadastrar` do painel, sob a
RN-461, passa a criar a mesma coisa.

**Decisão.** Uma porta, na landing. O `/cadastrar` aponta para ela e o rótulo "Criar conta de
organizador" sai do header.

**Porquê.** A resposta já decorre de duas decisões dele: a RN-461, de 04/08, e o POSSE-EMAIL-1,
fechado em 05/08 mandando exigir a prova de posse do e-mail. Manter as duas portas deixaria em pé
justamente a metade que cria conta sem verificar o e-mail.

**Reabre quando.** Não reabre.

### INSCR-1 · o "N inscritos" da página pública

**O que era.** O mesmo número alimenta o painel e a página pública, e a página contaria quem
gerou PIX e nunca pagou.

**Decisão.** A mesma verdade nas duas telas.

**Porquê.** Duas definições de "inscrito" é como o item nasceu, e a alternativa é a distorção que
ele mandou consertar. O próprio item já recomendava recusá-la.

**Reabre quando.** Não reabre. Se a prova social voltar e ele quiser o número maior, é decisão
nova, de marketing.

### CONV-1 · o card de conversão fica em branco

**O que era.** O card mostra um traço e mantém o rótulo "visitantes → inscritos", prometendo uma
medição que não existe em lugar nenhum do produto.

**Decisão.** Esconder o card até haver contagem de visitas.

**Porquê.** Rótulo que promete o que não se mede ensina expectativa errada a cada organizador
novo, e a terceira opção (construir a contagem) é frente própria que ele não pediu.

**Reabre quando.** Existir contagem de visitas. O contrato dela já está escrito e o card volta com
número no lugar do traço.

### PARSE-1 · a régua do ponto e as mensagens inalcançáveis

**O que era.** Um item com duas naturezas dentro. A régua de leitura do ponto e da vírgula já é
decisão dele, de 05/08, e está no ar; o que faltava era texto de tela em cinco lugares, e treze
dos dezoito campos não têm como mostrar mensagem nenhuma porque o navegador higieniza antes.

**Decisão.** As duas metades fecham. O defeito vai para a fila: os treze campos numéricos viram
campo de texto com teclado numérico, que é o que faz a mensagem ter para onde aparecer. As cinco
frases entram com o texto proposto, e nos dois casos em que o item oferecia recusar em vez de
avisar, avisa. A capacidade de kit em branco e o intervalo da automação passam a dizer o que
acontece quando ficam vazios, em vez de recusar.

**Porquê.** Mensagem que não tem como aparecer é defeito. Frase de tela com o texto já escrito e
uma linha de custo para trocar é calibragem, e prender cinco microtextos no painel do dono é
exatamente o volume que ele recusou.

**Reabre quando.** Ele reescrever qualquer uma das cinco. Cada uma é uma string.

### MODAL-1 · até quando a modalidade pode ser editada

**O que era.** Ratificar a fronteira "enquanto o evento não vendeu", que as Rules já aplicam, ou
apertá-la para "e ainda em rascunho".

**Decisão.** Fica em "sem venda".

**Porquê.** É a regra que já vale, sustentada por três medições, e a alternativa pioraria o caso
que ele descreveu: descobrir o erro olhando a página pública e ter de despublicar para corrigir um
nome.

**Reabre quando.** Aparecer edição indevida com evento no ar. A fronteira é uma condição na
Function.

### MODAL-2 · remover modalidade que tem lote

**O que era.** Recusar nomeando quem impede, remover em cascata, ou proibir remover.

**Decisão.** Recusa e nomeia cada lote e cada kit que impedem.

**Porquê.** Cascata apaga preço e janela de venda que outra pessoa configurou, a reboque de outra
ação. Botão destrutivo que não deixa medir o que se perde é defeito de produto, e o próprio item
recomendava recusar a terceira opção.

**Reabre quando.** Não reabre.

### SENHA-1 · o e-mail de "esqueci minha senha" na Brevo

**O que era.** Ratificar que o e-mail de redefinição passou a sair pela Brevo com a moldura da
marca, ou mandar voltar atrás.

**Decisão.** Ratificado por uso. E o conserto que está em review, do desfecho novo da proteção
contra enumeração, entra na fila para subir.

**Porquê.** O item já dizia que a construção da outra frente atropelou o custo que sustentava o
default, e o caminho antigo do Firebase continua vivo como rede de proteção. Voltar atrás seria
escolher o e-mail genérico de um remetente que ninguém reconhece.

**Reabre quando.** Ele mandar voltar ao envio do Firebase, que é um deploy.

### QUALIF-1 · o número do CNPJ

**O que era.** O número entra na promoção a profissional junto da pergunta, ou fica no cadastro de
recebimento.

**Decisão.** Só a pergunta na promoção. O número fica no recebimento.

**Porquê.** O formulário que ele pediu breve fica breve, e o dado chega no momento em que faz
trabalho. Coletar menos e mais tarde é o lado seguro de um dado de empresa.

**Reabre quando.** Ele quiser o número já na porta, por qualificação comercial. O desenho das duas
hipóteses já está pronto.

### QUALIF-2 · o CPF é credencial ou identificação

**O que era.** CPF como identificador de entrada, ou pedido uma vez como identificação.

**Decisão.** Só identifica. É pedido uma vez, no checkout para quem compra e na promoção para quem
nunca comprou.

**Porquê.** É a única leitura que sobrevive ao login social que ele mesmo pediu, porque nem Google
nem Apple devolvem documento. E transformar um documento adivinhável em nome de usuário é o
antipadrão que a casa recusaria de qualquer forma.

**Reabre quando.** O login social sair do produto.

### QUALIF-3 · até onde vai o rebatismo para Painel Profissional

**O que era.** Trocar só o rótulo visível, ou também o identificador técnico (diretório, pacote,
variáveis).

**Decisão.** Só o rótulo visível.

**Porquê.** O nome que define o produto já é dele, e ele já o deu. O que sobrava era engenharia:
renomear diretório e pacote produz um diff enorme e não muda uma letra do que se vê na tela.

**Reabre quando.** Um refactor grande do repositório tornar o rename barato de carona.

### QUALIF-5 · o Apple Sign-In

**O que era.** Subir Google agora e Apple depois, ou segurar os dois até as chaves existirem.

**Decisão.** Google agora. O botão da Apple só aparece quando as chaves existirem.

**Porquê.** Botão que quebra é pior que botão ausente, e o app fora das lojas na V1 (decisão de
18/07, PWA) tira a urgência da conta Apple.

**Reabre quando.** Ele abrir a Apple Developer Account e gerar as chaves, ou quando o app entrar
na App Store. A dependência fica escrita no cabeçalho de `packages/api-client/src/auth.ts`, onde
já mora.

### DEPLOY-1 · quando a máquina da porta do organizador sobe

**O que era.** "Dizer quando sobe" o pacote da entrada do organizador.

**Decisão.** Sobe no próximo deploy, com o seed do primeiro convite retido. O que falta escrever
(duas das três functions de convite nunca foram escritas) entra na fila.

**Porquê.** Isto virou duplicidade do LGPD-1. Metade já subiu em 05/08 sem que o item fosse
respondido, e o estado de hoje é exatamente o que a recomendação dele propunha: entrada existe na
superfície, jornada inalcançável sem convite. O que segura o seed é o LGPD-1, que continua no
painel. Não sobra pergunta própria.

**Reabre quando.** Não reabre como item. O go-live da jornada inteira mora no LGPD-1.

### 66 · o botão "Ver página pública" aponta para domínio de terceiro

**O que era.** Ratificar a retirada de `be-hero.com.br` do último recurso do botão.

**Decisão.** O domínio sai do código. Sem endereço configurado, o botão declara a falta.

**Porquê.** Domínio de outra empresa cravado como fallback é defeito, e o mesmo domínio já foi
expulso do e-mail da compra. A alternativa era manter o defeito.

**Reabre quando.** Não reabre. O endereço definitivo continua dependendo do item 12, que fica com
ele.

### ARENA-3 · onde a Arena Social mora

**O que era.** Seção da área do cliente, ou fatia privada do perfil social do E17.

**Decisão.** Seção da área do cliente, com dados próprios e privados. A convergência futura fica
mapeada: a bio e a foto podem alimentar o perfil público depois, nunca o contrário automático.

**Porquê.** É a leitura que ele deu ao descrever a Arena, e "os dados da pessoa" já moram lá. A
outra obriga a decidir o público contra o privado de cada campo hoje, sem necessidade.

**Como entra.** Vira nota de fronteira na RN-471 e no épico do perfil social. Não toca código
servido; o que ela destrava é a spec das tarefas 3a e 3c, que continuam retidas pelo ARENA-1.

**Reabre quando.** O E17 entrar em construção. A fronteira volta como nota do épico, não como item
do painel.

### PEDLIST-1 · listar as próprias compras atravessando produtoras

**O que era.** Manter a capacidade que a RN-469 abriu, ou estreitar para leitura por endereço.

**Decisão.** Mantida, e escrita na RN-469 para deixar de ser capacidade que ninguém declarou.

**Porquê.** O dado é do comprador, atravessar produtoras é o que faz a área do cliente ter sentido,
e o teste de ataque prova que documento de terceiro não entra na resposta. Estreitar depois custa
a área do cliente.

**Como entra.** A capacidade já está no ar; o que entra é a frase que a declara na RN-469. Spec,
não código.

**Reabre quando.** Uma review antagonista achar caminho de terceiro na resposta.

### REENVIO-PARCIAL-1 · o reenvio entrega meia lista e fecha o chamado

**O que era.** Recusar o reenvio enquanto houver pendência aberta, ou avisar e deixar seguir.

**Decisão.** Avisa e deixa seguir. O retorno diz que a lista está parcial e quantos faltam, e o
pedido não é carimbado como entregue.

**Porquê.** Recusar tira da operadora a única ferramenta que ela tem com a compradora no telefone.
O defeito real é o retorno dizer "enviado" sem qualificar, e isso é conserto.

**Reabre quando.** Não reabre.

### INSCRITO-APAGADO-1 · anomalia em pedido pago sem extrato

**O que era.** Abrir pendência com o motivo, manter só o registro do servidor, ou criar campo no
pedido.

**Decisão.** Abre pendência com o motivo nomeado.

**Porquê.** Usa o mecanismo que já existe, auto-resolve na primeira varredura e dá ao atendimento
o que ler. A terceira opção é recusada pela PROJPED-1, e a segunda deixa o atendimento dependendo
de quem sabe abrir log.

**Reabre quando.** Não reabre.

### CODPED-PODA-1 · podar a coleção de reservas de código

**O que era.** Alertar no contador da coleção sem podar, ou podar reservas de compras mortas.

**Decisão.** Não podar. O alerta olha o tamanho acumulado da coleção de reservas, não o volume de
vendas do ano.

**Porquê.** Podar reintroduz exatamente o problema que a reserva existe para não ter: dois códigos
iguais em compras diferentes, na mesma tela da área do cliente. O Leela está muito longe dos
números que apertam.

**Como entra.** Vira frase na RN-474 e critério do alerta. Não toca código servido, e o alerta em
si fica amarrado à política de alerta que é pendência do CTO humano.

**Reabre quando.** Não reabre.

### RN469-PROJECAO-1 · a área mostra 6 dos 16 campos da compra

**O que era.** Dar caminho ao detalhe da compra, ou enfraquecer a regra de "nasce visível" para
"nasce autorizado".

**Decisão.** A linha da compra ganha caminho até o detalhe, numa tela dentro da área do cliente,
lendo a mesma projeção que já vem do servidor.

**Porquê.** A regra que ele ratificou diz "visível", e deixá-la valendo enquanto o produto entrega
"autorizado" transforma um critério em decoração. Entre consertar a tela e enfraquecer a palavra,
a tela custa uma rota e nenhuma porta nova.

**Reabre quando.** A rota se mostrar mais cara que uma rota. Enfraquecer a regra continua sendo
uma frase no épico, se ele preferir.

### CTA-PIX-1 · "ver meus ingressos" com o PIX pendente

**O que era.** O CTA da tela de confirmação promete ingresso e entrega tela de login, no momento
em que a compradora está mais insegura.

**Decisão.** Rotular por estado. No PIX pendente o botão diz o que ele faz.

**Porquê.** CTA inconsistente com o que a tela seguinte entrega é a família que ele nomeou por
escrito. A alternativa de esconder o botão deixa quem tem PIX pendente sem saída na tela.

**Reabre quando.** Não reabre. O texto exato é uma string e ele veta quando quiser.

### AREA-MUDA-1 · quem pagou e teve o vínculo recusado vê a tela de quem nunca comprou

**O que era.** A área explica em uma frase, mantém o silêncio, ou recusa a compra na origem.

**Decisão.** A área explica em uma frase, com o motivo que o servidor já carimba chegando à
superfície.

**Porquê.** É a lista vazia que mente, e a RN-451 proíbe isso em letra. A terceira opção mexe em
dinheiro e ele não pediu.

**Reabre quando.** Não reabre. A frase exata é dele, quando quiser.

### TROCA-EMAIL-1 · quem troca de e-mail perde o histórico em silêncio

**O que era.** Distinguir "não há compras" de "há compras que esta conta deixou de alcançar".

**Decisão.** A autorização não muda nada (o fail-closed fica), e a tela ganha a frase quando
existir compra sob o e-mail antigo.

**Porquê.** Mesma família do AREA-MUDA-1, mesmo defeito e mesma tarefa, e o próprio item dizia que
provavelmente teria a mesma resposta. Re-vincular pelo e-mail novo é o POSSE-EMAIL-1 ao contrário
e ele acabou de fechar aquele item no sentido oposto.

**Reabre quando.** Não reabre.

### ACUMULO-ESTOQUE-1 · contar o estoque que a RN-449 deixou dentro

**O que era.** Autorizar a varredura e decidir depois, migrar já, ou deixar o estoque como está
para sempre.

**Decisão.** A varredura roda. É leitura pura, já especificada como a tarefa A5.

**Porquê.** Autorizar leitura não é decisão de negócio, e a resposta pode ser zero, o que fecha o
assunto sem custo. Migrar sem o número seria escrever em conta de gente real sem conseguir
revisar o efeito.

**Reabre quando.** **O número voltar maior que zero.** Aí a decisão de migração volta ao painel,
com o número na mão, que é a disciplina que o próprio item pedia.

---

## Parte 2 · Os que fecham com o default, sem tarefa

Dez itens saíram sem gerar trabalho nenhum. O default que já estava em vigor passou a ser a
decisão, e nada muda em código, em spec nem no board por causa deles.

### SCROLLBAR-1 · a barra de rolagem

**O que era.** A barra nativa temada basta, ou ela vira cromo nosso com token.

**Decisão.** A nativa temada fica. Está construída, no ar desde 08/08 nos dois apps, e provada no
CSS baixado de produção.

**Porquê.** O defeito que ele relatou (barra clara sobre tela escura) foi consertado no tema, com
uma linha. Estilizar desliga o cromo nativo e deixa de respeitar a barra grossa, sempre visível ou
de alto contraste que a pessoa configurou no próprio sistema. Trocar preferência de acessibilidade
por consistência entre plataformas precisa de razão de marca, e não há.

**Reabre quando.** Ele pedir a barra na cor da marca. Os números já estão medidos: `--border-strong`
dá 4,13:1 no brasa e 3,60:1 no wine, `--primary-500` dá 5,69:1 e 10,33:1, e o trilho tem de ser
transparente ou subir para `--surface-raised`.

### CONTA-1 · o código de seis dígitos e o link do e-mail

**O que era.** Os dois caminhos de primeiro acesso convivem, ou o código substitui o link.

**Decisão.** Convivem. O link segue no e-mail da compra e o código é a porta de quem chega sem
link que funcione.

**Porquê.** O link é o caminho que chega pronto sem a pessoa pedir, e é o que a S1223 acabou de
construir. Substituí-lo acrescenta um passo a quem hoje resolve em um clique, para fechar uma
superfície que não é credencial ao portador como a do convite.

**Reabre quando.** Uma review de segurança tratar as duas superfícies de credencial como risco, ou
ele quiser caminho único.

### RESPIRO-1 · os vinte pixels de respiro

**O que era.** Olhar duas telas lado a lado e dizer se o respiro do topo ficou alto, baixo ou
certo.

**Decisão.** Ficam os vinte pixels, que é o default em vigor.

**Porquê.** Calibragem visual com critério escrito (alinhar o texto da aba com o texto do título
das telas que têm cabeçalho) e nenhum número reprovado. Prender o painel do dono num ajuste de
moldura é o volume que ele recusou.

**Reabre quando.** O olho dele achar torto no passeio do item 69, que continua no painel. É uma
linha em duas molduras.

### QUALIF-4 · "fluxo de referência"

**O que era.** A frase dele tinha duas leituras, exemplo a copiar ou programa de indicação.

**Decisão.** Era exemplo de fluxo de entrada.

**Porquê.** Ele confirmou por uso em 05/08, dizendo "se tiver dúvidas, simule o fluxo da cheers"
no meio da conversa sobre primeiro acesso. A resposta já decorre da fala dele.

**Reabre quando.** Ele quiser programa de indicação, que nasce como épico próprio, com recompensa
a apurar e a pagar.

### VITRINE-1 · publicar sem preço

**O que era.** Publicar passa a exigir preço, ou continua livre com o alerta.

**Decisão.** Continua livre. O alerta crítico do painel, entregue pela lane VITRINE-FIX, é a
defesa.

**Porquê.** `criarEvento` exige percursos e não cria lote nenhum, então exigir lote para publicar
tornaria todo evento novo impublicável até alguém descobrir a aba Lotes. A régua da página e a do
servidor já foram reconciliadas: os dois concordam que não há o que cobrar.

**Reabre quando.** `criarEvento` passar a criar lote, que é o que tira o custo da outra opção.

### CODPED-1 · o prefixo do número da compra

**O que era.** `PED-`, `LEE-`, ou sem prefixo.

**Decisão.** `PED-`.

**Porquê.** É o que "pedido" vira em três letras, nenhuma outra coisa no produto começa assim, e
`LEE-` devolveria a confusão que o prefixo existe para evitar, porque ficaria igual em compra e em
ingresso.

**Reabre quando.** Ele quiser. O código é gravado sem o prefixo justamente para isso: trocar custa
uma constante e um redeploy, e e-mail antigo continua encontrando a compra.

### PROJPED-1 · campo novo no pedido nasce visível ao comprador

**O que era.** Ratificar a regra, ou permitir campo interno convivendo no documento desde que
nenhuma tela o exiba.

**Decisão.** Ratificada. Estado operacional interno mora em extrato ou subcoleção que só o
servidor lê.

**Porquê.** A alternativa é recusada por princípio já registrado da casa: tela não é fronteira de
segurança, Rule é. E a regra já foi aplicada uma vez, em 05/08; ratificar transforma o precedente
em critério e impede a discussão renascer a cada campo.

**Reabre quando.** As Rules do Firestore ganharem seleção de campo, o que não existe hoje.

### PDF-SPINNER-1 · o botão do PDF sem indicador próprio

**O que era.** Manter a premissa PDF-5 (zero JavaScript de cliente), ou reabri-la e ganhar o
spinner.

**Decisão.** Fica como está.

**Porquê.** Veto leve declarado no próprio item, com trade-off escrito: a rota tem zero JavaScript
de cliente e o indicador de download do navegador cobre o caso. Reabrir a PDF-5 derruba o critério
de bundle da página.

**Reabre quando.** Aparecer queixa real de duplo clique no celular. Aí a PDF-5 volta com dado.

### ADMIN-VE-AREA-1 · a conta de administração vê a área do cliente

**O que era.** Ratificar que a porta de saída não precisa ser fechada, ou fechá-la.

**Decisão.** Mantido. A área mostra o que é da própria conta e nada mais.

**Porquê.** O ADMINSEP-1 fechou em 05/08 dizendo que a separação para nas superfícies de login, e
a leitura literal que sustentaria fechar perdeu o apoio. Recusar criaria tela de erro para um caso
que não faz dano.

**Reabre quando.** A separação de endereço voltar à mesa.

### PERFIL-1 · o endereço `/@castelo` da produtora

**O que era.** Registro de que a produtora passa a se chamar Leela e o endereço público continua
`/@castelo`.

**Decisão.** `/@castelo` fica. O item já nascia com "o que fica com você: nada agora".

**Porquê.** `leela` é handle reservado da plataforma e o handle é imutável por regra. Apagar e
recriar o perfil abre janela de página pública de evento sem organizador, que é o custo medido.

**Reabre quando.** O endereço incomodar, ou a casa quiser decidir se abre mão do próprio nome para
uma produtora.

---

## Parte 3 · O que foi absorvido e o que fechou por execução

### ACEITE-1 · absorvido pelo LGPD-1, como frente 3

**O que era.** O aceite do termo de saúde guarda versão e hora, e não guarda o texto. Trocar o nome
da produtora reescreve, para trás, perante quem a pessoa declarou.

**Por que foi absorvido em vez de cortado.** É prova de aceite, que a régua manda ficar com o dono.
E o próprio item pedia isso em letra: "some com a LGPD-1, que já é a conversa jurídica sobre prova
de consentimento". O LGPD-1 já carregava duas frentes; passou a carregar três, e a revisão jurídica
que ele já pede cobre as três de uma vez em vez de abrir três conversas.

**O que fica registrado.** Os três aceites que sobrevivem à limpeza são compras de teste dele, então
o efeito prático hoje é nulo. A assimetria continua sendo o que denuncia: o termo de uso guarda
`materialHash` e o de saúde não.

### 34 · a jornada completa no ar, com a compra real · fechado por execução

**O que era.** Uma ação dele: percorrer a jornada como uma compradora e comprar de verdade, com
valor baixo. O item afirmava que `createInscricaoCharge` seguia com zero sucesso na história.

**Por que fechou.** A ação foi executada em **04/08** e está medida. O dono pagou a cobrança
`pay_jay08p0u1qlz11r2`, criada pelo checkout novo, e o Asaas devolve **RECEIVED** com
`paymentDate 2026-08-04`. O webhook chegou e processou em 04/08 às 18:59:53Z→19:00:04Z, com
`ingressos_emitidos: emitidos=1`. A leitura do Firestore de produção mostra o pedido em
`status: "pago"` e o inscrito em `status: "confirmado"`, com `codigoIngresso: "T93N7F"` e `qrToken`
assinado. O ingresso existe. Evidência em `.nirvana/handoffs/leela-pixreal-diag-20260804-DIAG-PIXREAL.md`,
elos 1 a 3.

**O que a compra deixou aberto, e já tem dono.** Os dois e-mails do pedido falharam com a Brevo
respondendo 401 por allowlist de IP. Esse resíduo já é carregado pelo **ADMINSEP-3**, que continua
no painel: os dois e-mails represados (o do ingresso `T93N7F` e o da conta) esperam a credencial do
administrador real.

**Reabre quando.** Não reabre. A conferência visual continua sendo o **item 69**, que fica no
painel.

---

## Parte 4 · O que ficou com o dono

Vinte e três decisões e cinco ações. A lista existe aqui para a conta ser conferível; o texto
completo continua no [[DECISOES-ABERTAS]].

**Dinheiro (6).** SERV-1 · SERV-2 · SERV-3 · ESTOURO-1 · JUROS-3 · JUROS-4
**Dado pessoal, LGPD e jurídico (6).** LGPD-1 (três frentes) · PB-11 · ARENA-1 · CRM-2 · CRM-3 · CRM-4
**Vocabulário e naming (2).** ARENA-2 · item 12
**Forma do produto e escopo (7).** PCLIENTE-1 · PONTE-CTA-1 · PONTE-NOME-1 · SEMKIT-2 · CRM-1 · CLUBES-1 · ADMIN-USUARIOS-1
**Produção e reparo autorizado (2).** SEMKIT-1 (encolhido à autorização) · COMPROMETIDO-1
**Ações que só ele executa (5).** ADMINSEP-3 · item 69 · JUROS-1 · JUROS-5 · VITRINE-2

### Três movimentos de arrumação que a rodada fez, e que não são corte

1. **JUROS-3 e JUROS-4 saíram de "Ações" e entraram em "Decisões".** As duas pedem uma resposta,
   não um gesto. Estavam na seção errada.
2. **VITRINE-2 saiu de "Decisões" e entrou em "Ações".** Cadastrar preço nos dois eventos ou
   tirá-los do ar é execução dele, pela tela, sobre dado de produção com 60 e 28 inscritos.
3. **ADMIN-USUARIOS-1 saiu da fila de construção e entrou em "Decisões".** Uma decisão dele morando
   fora do bloco das decisões é exatamente a inconsistência que este corte veio desfazer. A exceção
   nomeada no cabeçalho da fila deixou de existir junto.
