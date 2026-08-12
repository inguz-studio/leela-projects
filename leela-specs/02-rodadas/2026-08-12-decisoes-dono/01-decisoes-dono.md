---
tags: [leela, decisoes, dono, rodada, leva8]
trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA8
data: 2026-08-12
---

# Decisões do dono — 12/08 manhã (leva 8)

> Registradas no mesmo ato. As palavras do dono estão citadas na íntegra em cada item, e
> nada aqui foi parafraseado antes de ser citado. Onde a fala não alcança uma sub-decisão,
> o default do maestro está escrito com a etiqueta de vetável e o custo do veto.
>
> **O que esta leva fecha:** oito itens, três frentes. O checkout ganha o dono que faltava
> para o "cliente logado" da leva 6 significar alguma coisa; o CRM sai do papel com quatro
> visões, um agregado e um e-mail que se jogava fora; e a lista de interesses da Arena muda
> de fonte no meio do caminho, porque o dono mandou ancorá-la no Strava e não só no catálogo
> de casa.
>
> **O que esta leva deliberadamente não fecha:** o **CRM-4** e o **item 12**. Os dois estão
> no fim deste arquivo, com a razão de cada um.

## 1 · CKLOGIN-1 · DECIDIDO — a sessão do checkout vira conta ao confirmar o pagamento

O item nasceu na madrugada de 12/08, da própria lane que construiu o fluxo que ele decidiu na
leva 6. A frase dele mandava o pagamento confirmado levar "para a área interna com o cliente
logado", e a construção descobriu que esse cliente logado não existe para quem compra pela
primeira vez: o checkout cria uma sessão anônima e nunca a promove, a conta nasce fora de
banda pelo `contaSemFriccao`, e a área do cliente é inalcançável por sessão anônima pela
RN-451, que é decisão anterior dele. O fluxo está construído e redireciona. O muro é a
promoção da sessão.

**Fala do dono, na íntegra:** *"Ok, promova a sessao ao confirmar o pagamento."*

**Leitura.** O default proposto vence sem emenda. A sessão anônima do checkout é promovida a
conta logada no instante em que o pagamento é confirmado, que é exatamente o que a frase da
leva 6 pedia e o que a lane não pôde entregar sozinha.

**Efeito.** Nasce a **RN-562**, amarrada à RN-451: quem paga chega logada à área do cliente,
pela promoção da própria sessão do checkout, e não por um caminho de e-mail que a pessoa
descobre depois. O custo que o painel declarou continua de pé e não foi escondido na decisão:
promover a sessão mexe na fronteira de autenticação que foi provada fechada nas RN-476 a
RN-480, e essa fronteira precisa ser **re-provada** com teste, não presumida intacta. Esse
custo é trabalho de construção e entra no card da fila. **Construir não é desta lane.**

**Defaults do maestro, vetáveis.** A fala fecha o gatilho e não fecha o resto. Ficam
registrados, cada um com o custo do veto em uma linha: a promoção acontece **uma vez, no
pagamento confirmado**, e não no PIX gerado nem no cartão em análise, porque cobrança pendente
não é compra; a sessão promovida herda o mesmo tipo de conta de participante que o
`contaSemFriccao` já cria, sem tocar na RN-480 (nenhuma das portas cria conta profissional);
e a pessoa **não** define senha dentro do checkout, porque a terceira opção do item foi
recusada por ele ao escolher a primeira, e atrito na tela do dinheiro é o que o item existia
para evitar.

**Onde aterrissa.** RN-562 em [[LEELA-E12-landing]], ao lado da RN-451. Card de build novo na
fila. Detalhe da medição em `.nirvana/handoffs/leela-ckpix-flow-20260811.md` §"Área do cliente
logado".

**Condição de reabertura.** Se a re-prova da fronteira de autenticação achar que a promoção
abre um caminho que a RN-476 a RN-480 fecharam, o achado volta ao dono como item novo, com o
vetor nomeado. Não se conserta fronteira de auth em silêncio.

## 2 · PB-11 · RATIFICADO — o retry carimba a versão vigente, e a compra sobrevive

A conferência de versão do aceite vale na criação do pedido: se a tela declara uma versão
diferente da vigente, o servidor recusa. No retry de uma compra que já nasceu, o carimbo usa a
vigente sem conferir a exibida, e isso está medido, não suposto: pedido sem bloco de aceite,
política na v3, retry declarando a v1, resultado carimba a v3. O item punha na mesa a escolha
entre prova ausente e prova errada, porque recusar ali deixaria sem prova um pedido já pago.

**Fala do dono, na íntegra:** *"3 - em vigor."*

**Leitura.** A opção que já estava em vigor por default do maestro passa a valer por decisão
explícita dele. Carimbar a vigente e manter a compra viva. Nada muda no comportamento; muda
quem responde por ele.

**Efeito.** Nasce a **RN-567**, que escreve como regra declarada o que era comportamento sem
dono: no replay de uma cobrança, a prova de aceite carimba a política **vigente no momento do
carimbo**, e a divergência com a versão exibida não recusa a compra. A regra nomeia a
consequência que o dono aceitou de olhos abertos, porque regra que esconde o próprio custo é
regra que alguém conserta por engano depois: o documento pode guardar uma prova que aponta
para um texto que não estava na tela da pessoa.

**Defaults do maestro, vetáveis.** A divergência entre exibida e carimbada passa a ser
**registrada** no próprio pedido, em vez de sumir. Custa um campo e é o que transforma "prova
errada" em "prova errada e rastreável", que é a diferença entre um problema jurídico e um
problema jurídico com data. Se o dono achar que registrar a divergência é pior que não ter o
registro, uma linha derruba.

**Onde aterrissa.** RN-567 em [[LEELA-E12-landing]], junto do bloco dos aceites;
`aceitesVersaoExibida.integration` e o caminho de replay de `createInscricaoCharge`.

**Condição de reabertura.** Questionamento jurídico real sobre um aceite carimbado. Não é
hipótese de esteira: é alguém contestando a própria prova.

## 3 · ARENA-1 · FECHADO — o dado nasce guardado, e a abertura tem endereço

O item perguntava quem vê o que a pessoa preenche na Arena Social: mini bio, gênero, gêneros
de interesse, interesses nos pilares e a foto da conta. Visibilidade é a diferença entre um
formulário e uma rede, e a frase que criou a Arena não dizia isso.

**Fala do dono, na íntegra:** *"a ideia é que isso vire um 'tinder' depois, com essas
informações. quando desenvolvermos a versão mobile."*

**Leitura.** Duas coisas numa frase só, e elas não se contradizem. Hoje vale o default: só a
própria pessoa vê, o dado nasce guardado e nenhuma promessa é feita antes da hora. A abertura
existe, tem forma declarada — conexão e descoberta entre participantes — e tem endereço no
tempo: a versão mobile.

**Efeito.** O item sai do painel decidido, e a visão vira **direção de produto registrada no
[[LEELA-E13-app-atleta]]**, que é o épico da versão mobile. **Nada se constrói agora.** A
RN-471 continua governando o default restrito e a **RN-472 fica intocada**: os gêneros de
pessoas nunca ficam visíveis por default, e essa régua não é negociada pela visão de conexão
— ela é justamente a régua que a conexão vai ter de respeitar quando existir.

**O que a visão obriga a esteira a fazer desde já, sem construir nada.** O dado de Arena nasce
com o campo de visibilidade **por pessoa** previsto no modelo, mesmo que hoje só aceite um
valor. Mudar visibilidade depois de existir dado de gente real é retrabalho caro, e o item
dizia isso antes de ser decidido. Isso é desenho de modelo, não feature: entra na spec da
Arena, não numa lane de build.

**Onde aterrissa.** Direção de produto no [[LEELA-E13-app-atleta]]; RN-471 e RN-472 em
[[LEELA-E12-landing]], as duas sem alteração; S1226 em
`02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`.

**Condição de reabertura.** A feature de conexão entre participantes entrar em escopo. Ela
reabre o item inteiro, com o desenho de consentimento por campo, e não como ajuste de flag.

## 4 · ARENA-4 · DECIDIDO — a fonte muda, e a mesma lista passa a servir três lugares

Este é o item que mais mudou contra o que a spec de 10/08 desenhou, e vale ler a diferença
antes da fala. A `SPEC-ARENA-2-LISTA` derivou a lista de interesses de duas fontes internas: os
3 pilares e as 16 ações da RN-114, mais as 9 modalidades do clube. A tabela proposta tinha 20
termos e o que ficava com o dono era o corte fino: cinco fusões e dois rótulos reescritos.

**Fala do dono, na íntegra:** *"a lista de interesses deve ser a mesma baseada nos 3 pilares
(fisico menatl e espiritual) e devemos colocar a listagem possivel de modalidades tambémm, que
é o mesmo que devemos perguntar num onboardins de novos usuários. e entra como preferencias do
perfil também. Essa listagem deve ser baseada nas modaliades disponiveis no strava (para as
fisicas), ja a mental e espiritual voce já deveria ter as opções...."*

**Leitura, em três partes, porque a frase decide três coisas.**

**(a) A fonte física deixa de ser o catálogo de casa.** A lista física passa a derivar das
**modalidades de esporte do Strava**. Isso não é ajuste de rótulo: é troca da fonte que a
RN-553 declarou. Mental e espiritual continuam saindo do catálogo interno, que é o que a
própria frase manda (*"voce já deveria ter as opções"*) e o que a RN-114 já entrega.

**(b) A mesma lista serve três lugares, não dois.** A spec de 10/08 escreveu "uma lista, dois
consumidores" na RN-556: a Arena e a categorização futura da home. A frase acrescenta dois
consumidores novos e nomeados — o **onboarding de usuários novos** (*"é o mesmo que devemos
perguntar num onboardins"*) e as **preferências do perfil** (*"e entra como preferencias do
perfil também"*).

**(c) O corte fino continua dele.** A tabela derivada da fonte nova está em
[[02-tabela-modalidades]], com origem termo a termo, e nasce marcada como **vetável barato**,
exatamente como a spec de 10/08 desenhou. Fusões e rótulos são vocabulário de marca, e
vocabulário de marca não se decide em esteira.

**Efeito.**

- **Gate de frescor, cumprido nesta rodada.** A lista oficial do Strava foi consultada em
  **2026-08-12**, e as duas fontes estão registradas com URL em [[02-tabela-modalidades]] §1.
  A autoridade dos identificadores é `https://developers.strava.com/swagger/sport_type.json`
  (56 valores no enum `SportType`); a lista humana agrupada é
  `https://support.strava.com/en-us/articles/15402005-supported-sport-types-on-strava` (52
  tipos em 5 grupos). A página `https://developers.strava.com/docs/reference/` não enumera o
  tipo — quem refizer o gate por ela perde a lista inteira e fica com três exemplos.
- **RN-563** (nova): a lista física deriva do catálogo de tipos de esporte do Strava, com o
  gate de frescor escrito como obrigação recorrente, e não como um ato que aconteceu uma vez.
- **RN-564** (nova): uma lista, **três** consumidores — interesses da Arena, onboarding de
  usuário novo e preferências do perfil. Amplia a RN-556, que fica citada e não revogada.
- **RN-557** nasce agora na **forma da resposta**, que era exatamente o que a spec de 10/08
  prometeu ao consumir o número antes da decisão. O que ela declara é a tabela exposta.
- **Onboarding e preferências são escopo novo.** Nascem como histórias e cards ancorados em
  épico existente. **Nenhuma linha de código nesta lane.**

**Defaults do maestro, vetáveis, todos sobre a tabela.** A tabela proposta corta 16 dos 56
tipos do Strava, funde dois pares e acrescenta três termos que a fonte externa não tem. Cada
corte, cada fusão e cada acréscimo está nomeado com a razão em [[02-tabela-modalidades]] §3 e
§4, para o veto custar uma linha. Os três acréscimos merecem o destaque porque são o lugar
onde a esteira opinou: **beach tennis**, que o Strava não tem e é a modalidade que mais cresce
no Brasil; **triatlo**, que é modalidade do clube desde sempre e não existe no enum do Strava;
e **sono e descanso**, que já vinha da tabela de 10/08 com o rótulo reescrito.

**Onde aterrissa.** RN-557, RN-563 e RN-564 em [[LEELA-E12-landing]]; a tabela em
[[02-tabela-modalidades]]; `S1245-T2` em `02-rodadas/2026-08-10-arena-2-lista/04-fila-codigo.md`;
cards novos de onboarding e preferências na fila.

**Condição de reabertura.** O corte fino dele sobre a tabela, a qualquer momento e de graça
enquanto a tela não nascer. E o gate de frescor: o Strava acrescenta tipo de esporte com
frequência — a lista de casa envelhece sozinha, e a RN-563 é o que impede isso de ser
descoberto por um participante em vez de por nós.

## 5 · CRM-1 · DECIDIDO — as quatro visões que saem de dado pronto

A varredura de 05/08 achou dez visões possíveis para a primeira leva do CRM e mediu o custo de
cada uma. Seis saem de dado que já está no banco; quatro dependem de coleta ou de destravar
outra coisa. A ordem proposta não era por sofisticação, era por quanto cada uma muda uma
decisão que o organizador toma de verdade.

**Fala do dono, na íntegra:** *"1-ok"*

**Leitura.** Default ratificado. Entram as quatro que saem de dado pronto e não pedem nada a
ninguém: **de onde veio a venda**, com a comissão por canal; **distribuição geográfica**;
**quem pagou e não apareceu**; e **como o público paga**, entre PIX e cartão e em quantas
parcelas. Recorrência, funil e motivo de estorno ficam para a leva seguinte.

**Efeito.** Este item **não consome número de RN**, e isso é deliberado: é veto de escopo de
fila, não regra de negócio nova. Cada visão recusada continua escrita e volta quando ele
quiser. O que muda é a fila: as Frentes 1 e 3 de
`02-rodadas/2026-08-05-crm-estrategia/03-fila-proposta.md` entram com quatro agregados, não
dez.

**Onde aterrissa.** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 2;
fila nas Frentes 1 e 3; registro do escopo ratificado em [[LEELA-E19-crm]]. A `S1904-T3`, que
esperava este item para saber o recorte, **destrava**.

**Condição de reabertura.** Ele pedir uma das seis que ficaram de fora. Nenhuma foi apagada.

## 6 · CRM-2 · DECIDIDO — agregado sim, ficha não

Ele perguntou se dava para fazer algo com localização e endereço. Dá, e o dado já está inteiro
no banco desde o checkout novo: CEP, rua, bairro, cidade e UF, persistidos por pedido. O que
existia era uma premissa escrita reservando a decisão para ele — a **P-CKMOD-1**, de 19/07, que
diz que endereço nunca entra no doc do cliente e que incluí-lo exige decisão explícita dele
registrada ali.

**Fala do dono, na íntegra:** *"2-ok"*

**Leitura.** Default ratificado. A contagem por cidade e bairro nasce como **agregado sem
identidade**, no mesmo molde da demografia e com a mesma supressão de privacidade do cohort. O
endereço **não** passa a aparecer na ficha individual do cliente, e a P-CKMOD-1 continua valendo
inteira para a ficha.

**Efeito.** Nasce a **RN-566**, e ela existe porque a premissa precisa mudar de estado sem
mudar de conteúdo: o que era "decisão reservada ao dono" vira "decisão tomada pelo dono, com
uma metade autorizada e a outra recusada". A regra escreve as duas metades juntas, porque
separá-las é o jeito de alguém autorizar a segunda daqui a três meses achando que já estava
autorizada.

**As duas medições que a decisão carrega, e que ela não muda.** O endereço é do **comprador**,
uma vez por pedido, nunca por participante: quem compra quatro ingressos dá um endereço, então
o mapa descreve de onde vem o dinheiro e não de onde vem a gente. E a distância até o local do
evento continua **não sendo calculável**, porque `Evento.local` é texto livre e não existe
coordenada em lugar nenhum. Estruturar o endereço do evento é tarefa própria, vale por si e não
espera este item.

**Onde aterrissa.** RN-566 em [[LEELA-E19-crm]]; a premissa **P-CKMOD-1 muda de estado** no
mesmo épico; `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 3, tarefas
2a a 2d.

**Condição de reabertura.** Ele querer o endereço na ficha individual. O item registra que a
esteira **recomenda recusar**, pela mesma razão que o P-IAMENU-1 já tinha achado: é uma área
sem controle de papel, e endereço de gente real que sai não volta.

## 7 · CRM-3 · DECIDIDO — o e-mail que já se pede passa a ser guardado

Este item não escolhia entre dois futuros. Ele consertava uma coisa que ninguém decidiu: o
checkout exibe um campo de e-mail para **cada** participante, obrigatório, a pessoa preenche, o
payload envia, o servidor valida, e a gravação monta o bloco de dados pessoais com CPF,
nascimento, gênero e telefone, sem e-mail. O campo nunca existiu no modelo, e a esteira herdou
o buraco como se fosse regra.

**Fala do dono, na íntegra:** *"3-guardar (isso é muito importante para que o organizador
consiga exportar ou enviar notificações depois pelo nosso sistema)"*

**Leitura.** Guardar, com a mesma disciplina de minimização do resto do bloco. E a razão que
ele deu não é ornamento: ela nomeia os dois consumidores futuros do dado, e por isso vira
insumo registrado, não só justificativa de uma decisão.

**Efeito.** Nasce a **RN-565**, ao lado da RN-172: o e-mail de cada participante é persistido no
bloco de dados pessoais, com a minimização de sempre. Custo de atrito **zero** — o campo já
está na tela e já é obrigatório, ninguém digita nada a mais. E o efeito colateral bom que o
item avisava que sumiria se a decisão demorasse fica destravado: a chave que une o mesmo
cliente entre eventos tenta CPF, depois e-mail, depois um identificador de sessão. Sem e-mail,
todo participante que não comprou caía no último recurso e virava cliente novo a cada evento.

**A razão dele, registrada como direção e não como promessa.** Exportação de lista e envio de
notificações pelo sistema entram no [[LEELA-E19-crm]] como a direção que este dado serve.
Registrar direção não é construir feature, e as duas continuam sendo trabalho com escopo
próprio — a de notificação, em particular, depende do canal de e-mail e da doutrina de
consentimento que o LGPD-1 acabou de cravar.

**Defaults do maestro, vetáveis.** A terceira opção do item, uma frase na tela dizendo para que
o e-mail serve, **fica de fora por ora**, porque a frase dele não a pediu e porque copy nova na
tela do dinheiro é decisão de produto, não de esteira. Custa uma linha acrescentar. O e-mail
guardado herda a mesma leitura restrita do resto do bloco: `isTenantWriter`, nunca afiliado,
patrocinador ou coordenador.

**Onde aterrissa.** RN-565 em [[LEELA-E19-crm]], ao lado da RN-172; tarefa `COL-T1` em
`02-rodadas/2026-08-05-crm-estrategia/03-fila-proposta.md`; o campo nasce em
`packages/core/src/eventos/dadosPessoais.ts`.

**Condição de reabertura.** A base legal do envio de notificação a quem não comprou. Guardar o
e-mail e usar o e-mail são dois atos, e o segundo tem uma pergunta que este item não responde.

## 8 · ADMIN-USUARIOS-2 · DECIDIDO além do default — as três operações existem

A decisão dele de 09/08 criou as duas portas de aprovação, e a spec de 10/08 as formalizou. O
que a frase não alcançava: o que se faz com um cadastro que não se quer aprovar, e o que
acontece se quiser desfazer um acesso já concedido. Hoje não existe nem um nem outro. A fila só
cresce, e a única revogação do sistema é a de convite ainda não usado.

**Fala do dono, na íntegra:** *"admin usuários - aprovar cadastro, reusar e revogar devem
existir já"*

**Leitura, e ela está declarada porque tem uma correção dentro.** "Reusar" é lido como
**recusar**. É a leitura que o item pedia, é a única das duas que faz sentido ao lado de
"aprovar" e "revogar", e ela fica escrita aqui como leitura e não como fato. **Se o dono
corrigir, reabre barato** — nada foi construído em cima.

Com essa leitura, ele decidiu **além** dos dois defaults propostos. O default da recusa era
"fila sem recusa por ora"; o default da revogação era "não nasce nesta fase". Os dois caem. As
**três** operações existem: aprovar, que já estava especificado, recusar e revogar.

**Efeito.** A **RN-552** nasce na forma da resposta, que é o que a spec de 10/08 prometeu ao
consumir o número antes da decisão. Duas invariantes já estavam cravadas pela própria regra e
não mudam: recusa e revogação deixam o **mesmo rastro** da aprovação, pela RN-551; e revogação
**nunca apaga dado** — no máximo suspende o tenant pelo lifecycle que já existe.

**Defaults do maestro, vetáveis, nas sub-decisões que a fala não alcança.** A recusa nasce com
**estado próprio e sem comunicação automática à pessoa**. A opção de avisar existia no item e é
a mais honesta, mas ela decide copy, tom e canal, e inventar os três sem caso real é o tipo de
coisa que depois ninguém consegue desfazer sem parecer grosseria. Uma linha dele acrescenta o
aviso. A revogação nasce como **suspensão do tenant** pelo `transitionTenant`, que é a única das
duas opções compatível com "nunca apaga dado". E a revogação de um organizador **com vendas
vivas** não nasce nesta fase: a cascata dela toca dinheiro de terceiro, e isso não sai por
default de esteira.

**Onde aterrissa.** RN-552, forma final, em [[LEELA-E16-plataforma-superadmin]]; tarefa
`S1616-T5` entra na fila de build; detalhe em
`02-rodadas/2026-08-10-admin-usuarios/03-spec.md` §Parte 5.

**Condição de reabertura.** A correção dele sobre "reusar", que reabre a metade da recusa sem
tocar na da revogação. E o primeiro caso real de revogação de organizador com venda viva, que é
a sub-decisão que ficou fora de propósito.

## O que esta leva não fecha

### CRM-4 · segue ABERTO, e não vai ser decidido por default

A segunda metade da pergunta dele sobre o CRM era sobre os campos que se incentiva as pessoas a
responder com o tempo. A proposta é uma escada para fora do checkout, com contrapartida
declarada em cada degrau. Ele leu e respondeu com uma pergunta: *"como assim em troca de que?"*

O esclarecimento foi dado no chat e **a resposta dele ainda não veio**. O item continua no
painel, com o texto intacto. Decidir por ele aqui seria transformar uma pergunta dele numa
resposta nossa, e cada degrau dessa escada é uma promessa feita a quem responde.

### Item 12 · domínio público, segue aberto

Todo endereço do produto ainda é o marcador `{DOMINIO_LEELA}`, e o remetente definitivo do
e-mail depende dessa escolha. Nada nesta leva o alcança. As duas ações que só ele pode executar
seguem como estão: a **conferência visual das telas novas** (item 69) e o **save dos termos
comerciais no painel** (JUROS-1).

## A conta do painel

**12 → 4.** Saíram os oito desta leva: CKLOGIN-1, PB-11, ARENA-1, ARENA-4, CRM-1, CRM-2, CRM-3
e ADMIN-USUARIOS-2. Ficam quatro, contados à mão contra as duas seções do painel: o **item 12**
e o **CRM-4** em "Decisões que dependem de você", e o **69** e o **JUROS-1** em "Ações que só
você pode executar".

## Arquivos desta rodada

| Arquivo | O que carrega |
|---|---|
| `01-decisoes-dono.md` | este registro — as oito falas, leitura, efeito, onde aterrissa e reabertura |
| [[02-tabela-modalidades]] | o gate de frescor do Strava, a tabela PT-BR derivada e os cortes propostos |
| [[03-rns-delta]] | a faixa consumida e o que cada regra faz, apontando para o épico dono |
| [[04-fila-cards]] | os cards novos que esta leva manda para a fila |
