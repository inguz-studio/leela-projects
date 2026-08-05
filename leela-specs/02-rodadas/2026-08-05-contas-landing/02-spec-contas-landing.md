---
tags: [leela, spec, rodada, contas, primeiro-acesso, cadastro, otp, lgpd, anti-enumeracao]
trace: leela-pixreal-diag-20260804
lote: SPEC-CONTAS-LANDING
data: 2026-08-05
---

# 02-spec · O primeiro acesso e a criação de conta na landing

> Duas portas novas no modal de entrada, uma máquina só por baixo delas, e um mecanismo de
> credencial que o produto não tem hoje. Este arquivo escreve as três coisas.
>
> Zero código. Toda afirmação sobre o repositório foi medida e o caminho está citado. **Uma
> premissa do dono foi parcialmente falsificada pela pesquisa** e está em destaque, porque
> construir por cima dela em silêncio seria caro depois.

## Parte 1 · O que o sistema faz hoje

### O modal de entrada existe há uma noite

A `S1221-T1` aterrissou em `20bd6874` e trocou o "Entrar" do header, que era link para outra
origem, por um overlay da própria landing. O componente é o `EntrarOverlay.tsx`: dois campos,
um botão primário, e um rodapé opcional. O rodapé hoje carrega uma linha só, o "Não sei minha
senha" do `RodapeEsqueciSenha.tsx`, que a `REV-AREACLIENTE` ligou em `a1486abe` depois de
descobrir que ele nunca tinha sido ligado.

A disciplina anti-enumeração já está escrita ali: qualquer falha de credencial vira a mesma
frase, servida por `mensagemErroLogin` em `@leela/api-client/authMensagens`, e o comentário do
arquivo registra que a regra não pode ter duas autoridades. Esta spec herda essa disciplina
inteira e a estende para um caso que ela ainda não cobria.

### A conta do comprador nasce sem senha, e o único caminho até uma senha vem por e-mail

Quando o pagamento confirma, o `contaSemFriccao.ts` procura uma conta pelo e-mail digitado no
checkout. Não achando, cria uma com `emailVerified: false` (`:117-123`), e dispara o e-mail 2
do catálogo, "Conta criada, defina sua senha", com um link de ação do Firebase gerado por
`generatePasswordResetLink`. Achando, reusa a conta existente e **não** manda e-mail nenhum,
de propósito: avisar "sua conta foi criada" para conta antiga seria phishing.

Duas consequências dessa segunda metade, e as duas são o motivo desta rodada. Quem compra pela
segunda vez nunca recebe convite nenhum para entrar. E quando o e-mail falha, que é
literalmente o incidente de 04/08, a pessoa não tem caminho.

O `/definir-senha` da landing existe desde `2d7f24d7` e tem cinco estados, incluindo o
`sem_codigo`, que é a porta de quem nunca teve link e veio pedir um. O reenvio dali é neutro:
confirma sempre a mesma frase, exista ou não a conta. Esse caminho funciona e continua
funcionando. O que ele não faz é resolver em uma sentada: a pessoa pede, sai da tela, vai ao
e-mail, volta por outro link. Cada travessia é um lugar onde ela se perde, e a primeira delas
depende de um e-mail que já falhou uma vez.

### A criação de conta na landing aponta para outro lugar

O header tem um botão escrito "Criar conta de organizador" (`PublicHeader.tsx:74-79`) que
navega para `painelUrl('/cadastrar')`, ou seja, para o painel. Não existe, em superfície
nenhuma da landing, um formulário que crie conta de participante. A frase do dono está correta
na letra.

Vale registrar o que já está decidido e ainda não construído, porque muda a leitura: sob a
**RN-461**, o `/cadastrar` do painel deixa de criar conta de organizador e passa a criar conta
na Leela, com nome, e-mail, senha e o termo. A fila da `SPEC-QUALIFICACAO` que faz isso
(`02-rodadas/2026-08-04-qualificacao-profissional/03-fila-codigo.md`) **não foi executada**.
Quando ela rodar, o painel terá um formulário que faz exatamente o que a porta nova da landing
faz, e o rótulo "Criar conta de organizador" no header estará mentindo. Isso é o **CONTA-2** do
painel, e não é decisão desta lane.

### Código de verificação não existe no produto, e o Firebase não o oferece

Varredura por código numérico de verificação em `functions/src`, `packages` e `apps`: zero.
O Firebase Auth entrega link de ação por e-mail (`sendPasswordResetEmail`,
`generatePasswordResetLink`) e código por SMS para telefone. **Não existe código numérico por
e-mail nativo.** O que o dono pediu é peça nova, e é peça de credencial, que é a categoria mais
cara de errar.

Existe, em compensação, doutrina de casa para construí-la sem inventar nada. O
`provisionAssessoria.ts` guarda só o SHA-256 do token de convite, compara em tempo constante
(`:89-90`) e nega de forma opaca. O `rateLimit.ts` é um limitador fail-closed com janela
deslizante, chave derivada por hash e resposta única `resource-exhausted`. O CRM deriva
identificadores com **HMAC e pepper secreto**, e o comentário do épico registra por que:
*"a força bruta offline do CPF (~10⁹ valores) morre: sem o pepper, o espaço de busca é o da
chave do HMAC"*. Essa última frase é a que decide a mecânica desta rodada, e a Parte 4 explica.

## Parte 2 · O que a referência da Cheers devolveu

O dono mandou simular o fluxo da Cheers. A pesquisa foi feita em fontes públicas em 05/08/2026,
sem acesso autenticado. Cada linha abaixo diz se é **verificado**, com URL e data, ou
**premissa**, que é inferência de quem pesquisou.

### O que foi verificado

| O que | Fonte | Data |
|---|---|---|
| A dicotomia da tela é `ENTRAR` × `CRIE UMA CONTA`. Não existe CTA "Primeiro acesso" na Cheers. | `ajuda.cheers.com.br/pt-BR/articles/15811151` | 03/07/2026 |
| O caso de quem tem conta sem senha é absorvido por um link só, rotulado **"Esqueceu a senha ou ainda não criou uma?"** | `cheers.com.br/minha-conta` | 05/08/2026 |
| A recuperação de senha da Cheers é **link por e-mail**, não código. O fluxo termina em "ENVIAR LINK". | `ajuda.cheers.com.br/pt-BR/articles/15811184` | 27/06/2026 |
| Depois de informar e-mail ou CPF, a tela oferece **"PREFIRO ENTRAR COM SENHA"** | `ajuda.cheers.com.br/pt-BR/articles/15811184` | 27/06/2026 |
| Cadastro por e-mail e senha, Google ou Apple. Campos: nacionalidade, nome, sobrenome, e-mail, senha, CPF, nascimento e telefone. | `cheers.com.br/termos-de-uso` | 05/08/2026 |
| O aceite dos termos na Cheers é **tácito**, pela permanência no site. Não há checkbox documentado. | `cheers.com.br/termos-de-uso` | 05/08/2026 |
| O que a Cheers verifica de fato é o **telefone**, por SMS. "Conta verificada" lá significa telefone validado. | `ajuda.cheers.com.br/pt-BR/articles/9174380` | 05/08/2026 |
| A conta de organizador **não é conta separada**: é uma página de entidade criada por cima de uma conta pessoal já logada, com verificação manual do suporte. | `ajuda.cheers.com.br/pt-BR/articles/6695476` | 05/08/2026 |
| Conta criada no ato da venda por promoter, com o promoter preenchendo os dados de quem compra. | `ajuda.cheers.com.br/pt-BR/articles/6580375` | 08/04/2024 |

### A premissa do dono que a pesquisa não sustenta

O dono pediu **código de seis dígitos** e mandou simular a Cheers. A pesquisa não encontrou
nenhuma fonte dizendo que a Cheers usa seis dígitos, e a única mecânica de verificação que ela
documenta por e-mail é **link**, não código.

Há sinal forte de que a Cheers tem login por código, e ele é honesto de registrar: o rótulo
"PREFIRO ENTRAR COM SENHA" é opt-out, e só se oferece saída quando o caminho padrão é outro;
uma avaliação na App Store de ~02/08/2026 diz textualmente *"ele manda um código pro seu
email"*; e há uma thread pública intitulada "Não consigo verificar o código que o aplicativo
cheers me mandou". Isso sustenta que **existe código**. Não sustenta **quantos dígitos**, nem
prazo, nem se o login padrão é código ou link.

Quem documenta seis dígitos é a **Sympla**: código de verificação de seis dígitos, validade de
quinze minutos, por e-mail, SMS ou WhatsApp, com o login por senha descontinuado
(`ajuda.sympla.com.br/hc/pt-br/articles/42334777719956`, lido por resumo de busca em
05/08/2026, porque o Zendesk deles recusa leitura direta).

**Como isso entra na spec.** Os seis dígitos são **decisão do dono**, tomada nesta fala, e o
número de mercado bate com a Sympla. Não são cópia verificada da Cheers, e ficam escritos assim
para que ninguém os defenda depois com uma autoridade que a pesquisa não dá. Se um dia alguém
quiser mudar para oito dígitos ou para link, o argumento terá de ser próprio.

### Onde a Leela segue a Cheers

**A conta profissional é promoção de conta pessoal.** É exatamente o que a Cheers faz, e é
exatamente o que a RN-461 já decidiu em 04/08, antes desta pesquisa existir. A referência
confirma a decisão em vez de mudá-la.

**A porta é `Entrar` mais `Criar conta`, e nada mais.** A Cheers não tem CTA de primeiro
acesso, e resolve o caso com um link de recuperação de nome duplo. É a evidência mais útil da
pesquisa, e ela sugere que os dois CTAs do dono podem virar três elementos no rodapé do modal,
o que é muito. A Parte 7 trata disso sem desobedecer ao pedido.

### Onde a Leela diverge, e por quê

**A conta nasce na compra.** A Sympla é o oposto: a conta não nasce na compra, e a pessoa que
comprou tem de criar uma com o mesmo e-mail para os ingressos aparecerem. A Leela decidiu o
contrário na RN-155, e a decisão é boa. Ela é justamente o que torna o "primeiro acesso" um
caso real aqui e um caso inexistente lá.

**O aceite é explícito, não tácito.** A Cheers usa aceite por permanência no site. A casa não
pode: a RN-412 e a RN-446 exigem checkbox nascendo desmarcado, finalidade declarada e carimbo
do servidor. Isto não é preferência de desenho, é a doutrina que sustenta o LGPD-1.

**A verificação é do e-mail, não do telefone.** A Cheers valida telefone por SMS e trata isso
como o selo de conta verificada. A Leela não coleta telefone de participante e o e-mail é a
chave de tudo: é por ele que o ingresso chega, é por ele que o `contaSemFriccao` liga a compra
à conta, e é ele que o **POSSE-EMAIL-1** aponta como não provado. Verificar telefone aqui
resolveria o problema de outra empresa.

**Não há alteração de e-mail por conta própria.** A Cheers exige suporte para trocar e-mail e
CPF. A Leela tem o **TROCA-EMAIL-1** aberto no painel sobre o assunto, e esta rodada não o
toca.

## Parte 3 · As duas portas são a mesma máquina

### O problema que aparece assim que se desenham duas portas

"É meu primeiro acesso" serve quem já tem conta. "Criar conta" serve quem não tem. Se cada
porta responder de acordo com o que encontra, o modal vira o oráculo mais barato do mundo:
digite um e-mail em cada uma e descubra se aquela pessoa já comprou na Leela. Seria a mesma
falha que a `S1221-T1` fechou no login, aberta de novo ao lado dela.

O precedente da casa é a **RN-419**, onde kid inválido, assinatura inválida, inscrito
inexistente e evento inexistente devolvem a mesma resposta. A regra é essa: a resposta não pode
distinguir.

### A reconciliação

**Antes da prova de posse, as duas portas são indistinguíveis.** Os dois CTAs pedem um e-mail,
os dois dizem a mesma frase depois de enviar, e o servidor faz o mesmo trabalho nos dois casos:
gera um código, guarda, manda o e-mail. Sem consulta a "existe conta?" antes de enviar, o
tempo de resposta também não distingue, porque não há ramo a mais para percorrer.

**Depois da prova, a divergência é livre.** Quem digitou o código correto provou que tem a
caixa de e-mail. A partir daí, contar a essa pessoa o que existe naquele endereço não vaza
nada: é o endereço dela. É esse o eixo de todo o desenho, e vale escrever como frase: *não é
vazamento contar sobre a caixa de e-mail de quem acabou de provar que a tem*.

### Os quatro desfechos

| A pessoa entrou por | E a conta | O que acontece depois do código |
|---|---|---|
| É meu primeiro acesso | existe, sem senha | define a senha, o e-mail é marcado como verificado, entra. É o caso que o dono descreveu. |
| É meu primeiro acesso | **não existe** | a tela pede o nome junto da senha e **cria a conta**, com o termo. Nenhum erro, nenhuma frase dizendo "você não tem conta". |
| Criar conta | **já existe** | a tela pede só a senha, porque o nome já é conhecido, define, verifica e entra. Nenhum erro, nenhuma frase dizendo "e-mail já cadastrado". |
| Criar conta | não existe | o caminho feliz do cadastro: nome, senha, termo, conta criada e verificada, entra. |

*A Ana comprou no ano passado, esqueceu, e clica em "Criar conta". Ela recebe o código, digita,
define uma senha e entra na conta que já era dela, com as compras antigas na tela. Em nenhum
momento o produto disse a ela que o e-mail estava em uso, e em nenhum momento ela precisou
descobrir sozinha que a porta certa era a outra.*

Os dois casos cruzados são os que a `S1221-T1` não tinha, e são eles que fazem os dois CTAs
serem rótulos e não máquinas. O dono pediu duas portas, e ele ganha duas portas: o que muda por
porta é a moldura e a copy, nunca o que o servidor faz.

### A conta que já tem senha

Falta um quinto caso e ele é o menos óbvio: alguém com senha funcionando clica em "É meu
primeiro acesso". Depois do código, define uma senha nova e entra. Funcionalmente isso é
recuperação de senha, e é honesto que seja, porque a pessoa provou posse do e-mail. Nada disso
precisa de aviso, e um aviso do tipo "você já tem senha" seria o oráculo voltando pela janela.

## Parte 4 · A mecânica do código de seis dígitos

Seis dígitos são um milhão de combinações. É um espaço pequeno o suficiente para que cada
decisão abaixo seja carga estrutural, não higiene. A ordem aqui é a ordem em que um atacante as
encontraria.

### Geração

Sorteio com a entropia do sistema, nunca `Math.random`. A casa acabou de percorrer o
repositório inteiro por causa disso: o código da compra (`61776052`), o do ingresso
(`8d779dce`) e os três geradores do núcleo (`20a9c904`) foram trocados em 05/08, e a varredura
final devolve zero geradores previsíveis. Nascer previsível seria reintroduzir na mesma semana
o defeito que a casa acabou de varrer.

Seis dígitos decimais, com zeros à esquerda preservados. `000123` é código válido, e truncá-lo
para `123` reduziria o espaço em silêncio.

### Guarda: HMAC com pepper, e por que SHA-256 puro não serve

**Só o digest persiste, nunca o código.** Isso é doutrina da casa desde o convite de assessoria.

O que muda aqui é o algoritmo, e a razão é aritmética. O token do convite tem 256 bits, e
SHA-256 puro basta porque ninguém enumera 2²⁵⁶. Um código de seis dígitos tem 10⁶ valores: quem
puser as mãos no documento calcula o milhão de digests em milissegundos e recupera o código.
A defesa é a mesma que o CRM já aplica ao CPF, pela mesma conta de espaço de busca:
**HMAC-SHA256 com pepper secreto**, fail-closed quando o pepper falta, exatamente como o
`CRM_ID_PEPPER` faz hoje.

O material do HMAC é o par, nunca o código sozinho: `HMAC(pepper, "<e-mail normalizado>:<código>")`.
Amarrar ao endereço impede que um digest observado num documento seja testado contra outro.

### Prazo

**Dez minutos.** É prazo de código digitado na hora, e a referência de mercado que a pesquisa
achou são os quinze minutos da Sympla. Dez é mais apertado e continua confortável para quem
troca de aplicativo, confere a caixa e volta.

O prazo é do código, e não do link do ingresso: a **RN-420** registra que o link do ingresso
**não** tem prazo, porque ele é comprovante de compra aberto meses depois. Um é credencial de
sessão, o outro é documento. Confundir os dois nas duas direções produz erro.

### Uso único

O consumo acontece dentro de uma transação: lê, compara, marca consumido e segue. Duas
requisições com o mesmo código correto produzem um sucesso e uma negativa. O documento não é
apagado no consumo, porque apagar faz a segunda tentativa cair no ramo "não existe" em vez do
ramo "já usado", e esses dois estados precisam ser distinguíveis no servidor para a contagem
de tentativas funcionar. A **resposta ao cliente é a mesma nos dois**.

### Teto de tentativas por código

**Cinco.** Ao esgotar, o código morre inteiro, não só aquela requisição. Sem essa propriedade a
conta é trivial: um milhão de combinações contra um código vivo por dez minutos é força bruta
resolvida numa tarde. Com ela, o atacante ganha cinco tentativas por código emitido, e emitir
código depende de passar pelo limitador abaixo.

O contador vive no mesmo documento do código, incrementado na mesma transação da comparação.
Fora da transação, dois pedidos simultâneos leriam o mesmo contador e o teto viraria decoração.

### Limitador por alvo, e a borda que não é nossa

O limitador é o `consumirRateLimit` que já existe, com a chave derivada do **e-mail**, que é o
alvo. Duas janelas: uma curta, para o dedo nervoso, e uma longa, para o ataque paciente. A
proposta é **três pedidos em quinze minutos** e **dez em vinte e quatro horas** por endereço.

Aqui é preciso ser honesto sobre um pedido que não cabe. O brief desta lane pede limitador
"por e-mail e por origem", e a casa **tem decisão escrita contra a chave por origem dentro da
aplicação**. O comentário no `rateLimit.ts` registra o motivo: derivar IP confiável do
`x-forwarded-for` num callable é premissa de infraestrutura não verificável, um índice fixo
vira bypass silencioso quando a topologia muda, e um balde por IP pune vizinho de NAT. A
conclusão de lá vale aqui sem ajuste: *o throttle volumétrico por origem é responsabilidade da
BORDA (Firebase App Check / Cloud Armor), não da aplicação*.

E a borda **não está ligada**. Isso já está no painel, sob "a borda que segura força bruta não
está ligada (pendência do CTO)", e esta rodada acrescenta um consumidor novo a ela: o pedido
de código é uma superfície pública, anônima e que dispara e-mail. Sem borda, o teto global é o
número de endereços distintos que alguém quiser digitar. Não é escalada de privilégio, e não
bloqueia nada. É custo faturado e é reputação de remetente, e por isso vira nota no item
existente em vez de item novo.

### Invalidação

Um endereço tem, no máximo, **um código vivo**. Pedir um novo sobrescreve o documento, e o
digest anterior deixa de existir. Sem isso, cada pedido acrescentaria uma chance ao atacante em
vez de substituí-la, e o limitador viraria acumulador.

### Comparação e resposta

Comparação em tempo constante, com `timingSafeEqual`, no molde do `provisionAssessoria.ts:89-90`.

E uma resposta só. Código errado, código expirado, código já usado, código de endereço que
nunca pediu nada, e teto esgotado: tudo isso é **a mesma negativa** para o cliente. A tela
distingue apenas o que ela sabe por conta própria, e a Parte 7 escreve o que ela pode dizer sem
virar oráculo.

### O e-mail do código

Entra no catálogo como o **nono**, com a moldura de `functions/src/email/identidade.ts` que os
oito já usam, etiqueta própria na Brevo, e assunto que não promete nada sobre a existência da
conta. Um texto neutro serve os quatro desfechos: alguém que digitou o endereço errado recebe
um código para um cadastro que não vai completar, e isso é tudo o que ele revela.

**A falha de envio não é silêncio.** É a doutrina desta madrugada, e aqui ela tem uma
consequência de ordem: o documento do código é escrito **antes** do envio, e quando o provedor
recusa, a chamada devolve erro explícito e marca o documento como morto. Sem isso, o pior
desfecho possível seria devolver "enviamos" para quem nunca vai receber, que é exatamente o
incidente de 04/08 servido de novo. Sem provedor configurado, a chamada recusa antes de
começar, no molde fail-closed que o e-mail 3 já pratica.

Não há repetição automática. A política dos oito e-mails é **no máximo uma vez**, e a repetição
aqui é a pessoa pedir de novo, dentro do limitador.

### O que fica de fora, e por quê

**Não há código por SMS nem por WhatsApp.** A Sympla oferece os três canais. A Leela não coleta
telefone de participante e o e-mail é a chave de tudo. Um canal a mais seria um segundo caminho
de posse para provar a mesma coisa, e a casa tem doutrina contra a segunda superfície de
credencial.

**O código não abre sessão sozinho.** Ele prova posse do e-mail e habilita definir a senha. A
frase do dono na RN-453, *"ela entra define a senha e entra no sistema"*, é ordem: senha
primeiro, sessão depois. Um código que logasse direto seria login sem senha, que é a jornada da
Sympla e não a que o dono descreveu.

## Parte 5 · A conta nasce depois da prova, e nasce inteira

### Verificar antes de criar

Esta é a inversão que carrega a rodada. Hoje o único cadastro do produto cria a conta no
Firebase Auth e depois grava o perfil. É a ordem que produz duas feridas conhecidas: a conta
órfã, que já está no painel desde 03/08, e a conta não verificada ocupando o endereço de
outra pessoa, que é o vetor medido do **POSSE-EMAIL-1**.

Sob esta spec, **nenhuma conta nasce antes do código provado**. Enquanto o código não é
digitado, o que existe é um documento com um digest e um prazo. Quem digitar o e-mail de
terceiro não ocupa nada, não impede nada e não recebe nada além de um e-mail que a vítima vai
ver.

### Nasce inteira ou não nasce

A criação acontece do lado do servidor, numa chamada só, e a ordem é: cria a conta no Auth,
grava `atletas/{uid}` com o consentimento, e **desfaz a conta do Auth se a gravação falhar**.
Nada de conta pela metade.

É o mesmo desenho que o cadastro do organizador não tem, e é por isso que ele produziu o
LGPD-1. Lá o cliente cria a conta e depois grava o documento, em dois passos e de duas origens.
Aqui o servidor faz os dois no mesmo lugar e pode desfazer o primeiro. **Isto não fecha o
LGPD-1**, que é sobre o caminho do organizador e é decisão jurídica do dono. Vale como registro
de que a porta nova não herda a ferida.

Há um cuidado a escrever, porque o `onCreateUser` observa criação de conta e grava
`atletas/{uid}` por conta própria. A gravação do consentimento tem de conviver com esse gatilho
sem corrida: escreve por merge, nunca sobrescrevendo, no mesmo padrão que o próprio
`onCreateUser` já usa para a corrida com o rollback.

### O consentimento

Termo próprio, checkbox nascendo desmarcado, finalidade declarada, carimbo do **servidor** com
versão e instante, no molde da **RN-446**. Aceite datado pelo cliente é recusado.

O termo é **o mesmo da conta** que a RN-466 já definiu, com a mesma constante de versão. Sob a
RN-466 existem dois termos, o da conta e o do profissional, e esta porta usa o primeiro. Duas
superfícies criando conta com dois termos diferentes seria a divergência que a RN-466 existe
para impedir.

Onde ele mora: `atletas/{uid}.consentimentoLgpd`, que é o documento da pessoa participante. O
`profissionais/{uid}` não é tocado, pela RN-450, que já diz que cada tela edita o seu.

Quem chega pelo **primeiro acesso** de uma conta que já existe não vê checkbox nenhum, e é
correto: essa pessoa comprou, e o aceite dela está carimbado no pedido, com versão, instante e
hash do material. Pedir de novo seria recoletar consentimento que já existe, e a RN-467 já
registrou que versão que estreita não obriga recoleta.

### A fronteira

**Nada aqui cria ou toca conta profissional, de organizador ou de plataforma.** A porta nova
cria conta de participante e mais nada.

A conta profissional continua nascendo pela promoção da RN-461, sobre uma conta que já existe.
A conta de administração da plataforma continua sendo outra conta, pela RN-449, que o dono
acabou de ratificar ao responder o ADMINSEP-1. E o papel da conta nova é o `athlete` que o
`onCreateUser` já atribui por default, sem elevação nenhuma.

Um teste tem de provar a fronteira em vez de confiar nela: passar pelas duas portas não produz
`profissionais/{uid}`, não produz claim de tenant e não produz `platform_admin`.

## Parte 6 · O encontro com o POSSE-EMAIL-1

### O que o item mede hoje

O `contaSemFriccao.ts:203` escolhe a conta que fica ligada à compra por busca de e-mail, sem
prova de que quem digitou é dono do endereço. Desde a RN-469 esse vínculo é chave de leitura, e
a `REV-AREACLIENTE` mediu a cadeia inteira: alguém registra o endereço da vítima no cadastro
aberto e nunca verifica; a vítima compra com o próprio endereço; o servidor acha a conta do
primeiro e carimba o vínculo nela; **a área do cliente nega**, porque exige e-mail verificado;
e **a Rule permite**, entregando o pedido inteiro.

O item registra a correção exata: acrescentar `&& request.auth.token.email_verified == true` em
**um único ramo** da regra do pedido, o do vínculo por conta. O outro ramo não pode receber a
condição, porque é a sessão anônima do checkout.

### O que esta rodada muda

Duas coisas, e elas atacam pontas diferentes.

**A metade do atacante morre na origem.** O vetor depende de conseguir registrar o endereço da
vítima e ficar com ele. Sob a Parte 5, a porta da landing não cria conta antes do código
provado, então esse registro não acontece por ali. Fica de pé enquanto o `/cadastrar` do painel
continuar criando conta sem verificação, o que é matéria do **CONTA-2** e da fila da
`SPEC-QUALIFICACAO`.

**A metade do custo colateral morre também, e é a que destrava a correção.** Aplicar a condição
de e-mail verificado hoje tira leitura de quem comprou e nunca verificou, e essa pessoa depende
de um link por e-mail para conseguir verificar. Com o código, ela tem caminho próprio: pede,
digita, define a senha e o servidor marca o endereço como verificado no mesmo gesto. Depois
desta rodada, **toda sessão nomeada da landing tem o e-mail verificado**, porque não existe
caminho até uma senha que não passe pela prova.

Vale conferir quem ficaria de fora, porque é o teste da afirmação. Quem comprou e ainda não fez
primeiro acesso continua lendo o próprio pedido pela sessão do checkout, que é o ramo que não
muda, e continua abrindo o ingresso pelo link assinado, pela **RN-452**. Ninguém fica trancado.

### A recomendação, que não é decisão

**Recomendo aplicar a condição de e-mail verificado no ramo de vínculo por conta, na mesma onda
em que o código subir.** O motivo de recomendar agora é que o custo que sustentava a hesitação
deixa de existir, e não porque a exposição mudou de tamanho.

**O que sobra do POSSE-EMAIL-1 depois disso.** Sobra o vínculo em si. O
`contaSemFriccao.ts:203` continua escolhendo a conta por igualdade de endereço, e um erro de
digitação no checkout continua carimbando a compra na conta errada. O que muda é que essa conta
errada só lê o pedido se **também** tiver provado posse daquele endereço, o que reduz o caso a
um cenário estreito: alguém que de fato controla a caixa para a qual a compra foi endereçada.
Nesse cenário, o e-mail com o ingresso já teria chegado nessa mesma caixa de qualquer forma, e
a leitura do pedido não acrescenta exposição nova. Esse é o argumento para eu recomendar
fechar; a ratificação continua sendo do dono, no painel.

## Parte 7 · As telas

### O modal

O dono pediu a logo e dois CTAs terciários pequenos. **A logo está sendo construída pela lane
`BUILD-MOTION`**, que tem o `EntrarOverlay.tsx` no território dela agora. Esta lane não a
especifica e a fila registra a colisão.

O design system não tem variante chamada "terciária". Ele tem `primary`, `secondary`,
`destructive` e **`ghost`**, mais os tamanhos `sm`, `md`, `lg` e `icon`
(`packages/design-system/src/components/Button/variants.ts`). A tradução do pedido do dono é
**`variant="ghost" size="sm"`**, que é o terceiro degrau da hierarquia: o primário é o "Entrar",
o secundário é a borda, e o ghost é o que resta. Inventar uma variante nova para atender ao
nome seria criar um degrau que o sistema não tem.

O rodapé do modal, hoje com uma linha, passaria a ter três elementos. É muito, e a pesquisa da
Cheers mostra uma casa que resolve os três com um só. A proposta que respeita o pedido do dono
sem empilhar: os **dois botões ghost pequenos ficam lado a lado**, com o "Não sei minha senha"
permanecendo como o link discreto abaixo deles, na hierarquia visual mais baixa das três. Se o
dono preferir fundir "Não sei minha senha" em "É meu primeiro acesso", que sob esta spec são a
mesma máquina, é uma linha a menos e está no **CONTA-1**.

### As duas rotas

Os CTAs **navegam**, não trocam o miolo do modal. O motivo já está escrito no
`RodapeEsqueciSenha.tsx`: trocar o conteúdo de um `aria-modal` embaixo do leitor de tela é a
mudança de contexto que a WCAG 3.2 desaconselha, e quem vai digitar um código precisa de uma
tela com foco próprio.

Nascem `/primeiro-acesso` e `/criar-conta`, ambas na landing, ambas com `noindex`, `no-store` e
`disallow`, no mesmo tratamento que `/minha-conta` recebeu. As duas compartilham os
componentes de e-mail e de código; o que muda é a moldura, a copy e o campo de nome.

Elas precisam devolver a pessoa para onde ela estava, que é a propriedade que o overlay tinha
de graça. Isso vira parâmetro de volta na URL, e ele é a única superfície de risco nova das
telas: aceitar apenas caminho relativo da própria origem, com forma conferida contra uma lista,
e cair na home diante de qualquer coisa fora disso. Redirecionamento aberto numa tela que
acabou de autenticar alguém é o clássico da categoria. Nenhum dado de pessoa entra na URL, que
é invariante do projeto.

### Os estados, e o que a tela pode dizer

| Estado | O que a pessoa vê | Nota |
|---|---|---|
| pediu o código | "Se este endereço puder receber um código, ele já saiu." Campo de código na mesma tela, com o endereço visível e um caminho para corrigi-lo. | frase única para os quatro desfechos |
| código errado | "Código incorreto ou vencido." Com quantas tentativas restam. | uma frase para errado, vencido e já usado |
| tentativas esgotadas | "Este código não vale mais. Peça um novo." | o código morreu; pedir de novo é o caminho |
| limitador estourou | "Muitas tentativas. Tente novamente em alguns minutos." | é a frase que o `rateLimit.ts` já devolve |
| envio falhou | "Não conseguimos enviar agora. Tente de novo em instantes." | honesto: o e-mail não saiu, e a tela não finge |
| código aceito | o formulário de senha, com o nome quando ele fizer falta | é aqui que os quatro desfechos divergem |

Contar quantas tentativas restam é escolha deliberada e não afrouxa nada: quem está tentando
adivinhar já sabe quantas gastou, e quem digitou errado de verdade precisa saber que a próxima
é a última. O que a tela nunca diz é se aquele endereço tem conta.

**O que não pode acontecer com o campo de código:** autopreenchimento de senha, aparecer em
log, ou viajar na URL. Ele é credencial pelos dez minutos em que vive.

### Vale a pena registrar o que não muda

O `/definir-senha` continua existindo, com os cinco estados dele, e continua sendo o destino do
link que sai no e-mail da compra. Nada nesta spec o apaga. Se o **CONTA-1** decidir pela fusão,
a mudança será de destino, não de máquina.

## Parte 8 · O que sobe ao painel

**CONTA-1** · o código substitui o link do e-mail da compra, ou os dois convivem? Default
proposto: convivem, com o link seguindo no e-mail da compra e o código sendo a porta de quem
chega ao modal sem link que funcione. O argumento contra o default é bom e é da casa: duas
superfícies de credencial para a mesma capacidade é o que a spec do convite proíbe em letra. O
argumento a favor é que o link acabou de ser construído (`2d7f24d7`, `6d092619`) e cobre o
caminho que já chega pronto por e-mail, enquanto o código cobre exatamente o buraco que ele
deixa.

**CONTA-2** · uma porta de criar conta, ou duas? Default proposto: uma, na landing, com o
`/cadastrar` do painel apontando para ela quando a fila da `SPEC-QUALIFICACAO` rodar, e o
rótulo "Criar conta de organizador" do header saindo junto. Manter as duas deixa dois
formulários criando a mesma coisa com réguas que vão divergir na primeira revisão de copy, e
deixa em pé a metade do **POSSE-EMAIL-1** que esta rodada fecharia.

**POSSE-EMAIL-1** · não é item novo. Ganha a recomendação da Parte 6 e o custo com ela.

**Nota, não pergunta:** o item da borda que segura força bruta ganha um consumidor novo, o
pedido de código, que é público, anônimo e dispara e-mail. Continua sendo do CTO humano.

## Vizinhos

`01-decisoes-dono.md` tem o verbatim das três falas e o fechamento do ADMINSEP-1.
`03-rns-delta.md` tem as sete regras, canônicas nos épicos. `04-fila-codigo.md` tem a ordem de
execução com as dependências reais. [[catalogo-de-emails]] recebe o nono e-mail.
[[LEELA-E00-fundacao-tecnica]] é dono da mecânica e da fronteira de contas;
[[LEELA-E12-landing]] é dono das superfícies.
