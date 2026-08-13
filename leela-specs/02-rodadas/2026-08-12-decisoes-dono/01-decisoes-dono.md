---
tags: [leela, decisoes, dono, rodada, leva8, leva9, leva10, leva11, leva13, crm, envio, slug, copy]
trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA8 (leva 8) · REGISTRO-CRM4-LEVA9 (levas 9 e 10) · REGISTRO-LEVA11-KITS-IA (leva 11) · COPY-APPLY (leva 13) — os adendos ficam no fim do arquivo, em ordem
data: 2026-08-12
---

# Decisões do dono — 12/08 manhã (leva 8)

> **Este arquivo tem três levas.** A leva 8 é a rodada da manhã e ocupa o corpo principal. As
> **levas 9 e 10** chegaram na tarde do mesmo dia e estão nos **adendos no fim do arquivo**,
> escritos pela lane REGISTRO-CRM4-LEVA9. Se você veio atrás do **CRM-4**, ele **fechou** — a
> seção "O que esta leva não fecha", mais abaixo, é o estado da manhã e está marcada.

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

**+12/08 (tarde) · a lista vira insumo declarado da S316.** Quando a S316 subir (fase B do
**MODALIDADES-1**, agora no painel canônico), o vocabulário físico do editor de modalidades
deriva desta mesma tabela — uma fonte só, nunca duas listas de modalidade divergindo entre a
Arena e o cadastro do evento. Nenhuma tarefa nasce aqui; é ponteiro de intenção, registrado em
`leela-specs/01-produto/DECISOES-ABERTAS.md` **MODALIDADES-1**.

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

### ~~CRM-4 · segue ABERTO~~ → ⚠️ FECHADO na mesma tarde (ver adendo · Leva 9)

> **Estado superado no mesmo dia.** A resposta dele veio no chat algumas horas depois, e o CRM-4
> **fechou**: nenhuma pergunta pós-compra nasce, o degrau 2 morre e a premissa de envio vira a
> RN-569. O texto abaixo fica marcado em vez de apagado porque ele é a leitura correta da manhã e
> explica por que a lane da manhã se recusou a decidir por default. Registro completo no **adendo
> · Leva 9**, no fim deste arquivo.

~~A segunda metade da pergunta dele sobre o CRM era sobre os campos que se incentiva as pessoas a
responder com o tempo. A proposta é uma escada para fora do checkout, com contrapartida
declarada em cada degrau. Ele leu e respondeu com uma pergunta:~~ *"como assim em troca de que?"*

~~O esclarecimento foi dado no chat e **a resposta dele ainda não veio**. O item continua no
painel, com o texto intacto. Decidir por ele aqui seria transformar uma pergunta dele numa
resposta nossa, e cada degrau dessa escada é uma promessa feita a quem responde.~~

**E a recusa da manhã se provou certa.** A pergunta dele não pedia esclarecimento melhor: era
recusa da premissa. Se a lane da manhã tivesse fechado o item por default, teria cravado uma
contrapartida falsa numa spec — que é exatamente o defeito que a leva 9 veio corrigir.

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

## Adendo da tarde de 12/08 · decisão de processo — o painel vira só decisão

Não é decisão de produto, é decisão sobre como a casa registra. Entra aqui porque é dele, e porque
foi cobrada duas vezes.

**Fala do dono, na íntegra:** *"o painel de decisoes está sujo e já falei pra voce limpar ele com
informações que nao sejam estritamene minhas tomadas de decisão, nao quero porra nenhuma de ata. (...)
ta complicado aprender isso ou vamos padronizar logo ?"*

**Leitura.** A cobrança é de repetição, não de estilo. O painel tinha acumulado cerca de vinte
parágrafos de narrativa no cabeçalho — cortes, trocas, purga, levas 6, 7 e 8 —, e cada limpeza anterior
tirava itens sem tirar a ata que eles deixavam. A pergunta final é a ordem de verdade: escrever o
padrão em vez de reaprendê-lo a cada rodada.

**O padrão, que passa a viver escrito no topo do próprio painel como contrato.**

1. Cabeçalho de no máximo 3 linhas: o que é o painel, a contagem atual contada à mão, e onde vive o
   histórico de fechamentos (`02-rodadas/`).
2. Depois do cabeçalho, só itens. Item = título · um parágrafo curto de contexto, no máximo 3 frases ·
   caso de uso em uma linha · job story em uma linha · o que fica com você · opções com o default
   proposto · onde aterrissa. A seção "Ações que só você pode executar" segue a mesma régua.
3. Item fechado sai na mesma aterrissagem, e o registro do fechamento vai para a rodada. Narrativa de
   fechamento nunca vira parágrafo no painel.

**Efeito, aplicado no mesmo ato.** O painel foi reescrito no padrão: os parágrafos de narrativa saíram
depois de conferido, um a um, que o fato já vivia na rodada citada — o único que existia só no painel
era o resultado da execução da purga de 10/08, e ele foi movido para
`02-rodadas/2026-08-09-decisoes-dono/02-fila-execucao.md` §PURGA-DADOS-TESTE antes de a linha ser
apagada. A seção "Fila de construção" inteira, com as pendências do CTO, saiu para
`leela-specs/01-produto/FILA-DE-CONSTRUCAO.md`, com ponteiro de uma linha no fim do painel: ela nunca
foi decisão dele. Os cinco itens vivos ficaram, comprimidos para o formato, com opções e defaults
intocados — nenhuma decisão foi fechada nem aberta nesta passagem.

**Onde mais o padrão foi escrito.** [[CONVENCAO-BOARDS]] §"O painel de decisões", para a régua morar
junto da governança de registro dos boards, e não só dentro do arquivo que ela governa.

**Condição de reabertura.** Ele pedir de volta algum tipo de contexto que o padrão hoje manda para a
rodada. O caminho é emendar o contrato no topo do painel, não voltar a escrever ata solta.

## Arquivos desta rodada

| Arquivo | O que carrega |
|---|---|
| `01-decisoes-dono.md` | este registro — as oito falas da leva 8, mais os **adendos das levas 9 e 10** no fim do arquivo, cada um com leitura, efeito, onde aterrissa e reabertura |
| [[02-tabela-modalidades]] | o gate de frescor do Strava, a tabela PT-BR derivada e os cortes propostos |
| [[03-rns-delta]] | a faixa consumida e o que cada regra faz, apontando para o épico dono — com **adendo** para a faixa RN-569 a RN-571 e a colisão de numeração desfeita |
| [[04-fila-cards]] | os cards novos que esta leva manda para a fila — com **adendo** para os quatro cards das levas 9 e 10 |

A **varredura de promessas de envio** não ganhou arquivo próprio: ela é curta o bastante para caber
no registro, e separá-la a tiraria do lugar onde a decisão que a motivou está escrita. Ela vive no
adendo · Leva 9, §9.5, com método, as 4 promessas vivas, as 26 ocorrências que ficam por família e
o resultado da varredura de código.

---

# Adendo · Leva 9 — 12/08 tarde (o CRM-4 fecha, e a premissa de envio morre de vez)

> Registrado no mesmo ato, algumas horas depois de a leva 8 escrever que o CRM-4 seguia aberto.
> Ele não seguiu: a resposta veio no chat na mesma tarde. A fala está citada na íntegra e nada
> aqui foi parafraseado antes de ser citado.
>
> **O que esta leva fecha:** o último item de CRM do painel, e com ele o desenho inteiro da
> escada de coleta. Um degrau vive, um morre, um muda de casa e um fica onde estava.
>
> **O que ela corrige:** uma premissa que a esteira violou pela **segunda** vez. Essa metade é a
> mais importante do adendo, e ela tem varredura própria mais abaixo.

**Fala do dono, na íntegra:** *"crm-4 -> se ja pegamos o endereço nao precisamos perguntar mais
nada. e quando a pessoa entra na área do cliente pela primeira vez, podemos enviar para ela
definir a senha deça. Nao pediremo endereço novamente pois ja temos ele, basta salvamos as
informações. e na area do cliente podemos colocar um banner/alerta convidando o usuário para
concluir o cadastro. nao existe isso de 'confirme para o kit chegar certo' ja falei que nao
enviaremos nada."*

## 9.1 · CRM-4 · FECHADO — nenhuma pergunta pós-compra, e o degrau 2 morre

**Leitura.** A pergunta que ele tinha feito na leva 8 — *"como assim em troca de que?"* — não
pedia esclarecimento melhor. Era recusa da premissa: a contrapartida do degrau 2 só existia
porque a esteira supôs um envio que não existe. Com o envio fora, o degrau perde o argumento e a
tela perde a razão de ser.

**O degrau 1 fica, e vira o único mecanismo automático.** *"Basta salvarmos as informações"* é o
enunciado dele. Guardar o que a pessoa já digitou, sem perguntar nada: o e-mail de cada
participante, já decidido no CRM-3 e vivendo na RN-565; o código IBGE do município, que o
consultor de CEP devolve e o código descarta; e a cópia de cidade e UF do endereço do pedido para
os campos do participante quando o participante é o próprio comprador, marcada como derivada e com
a tela declarando a cobertura. As três custam zero de atrito, e é por isso que sobrevivem a uma
decisão que matou o resto.

**O degrau 2 morre inteiro**, e a frase-exemplo morre junto. *"Nao existe isso de 'confirme para
o kit chegar certo'."* Não é veto de escopo: é correção de fato. A contrapartida prometia entrega
de kit, e a casa não entrega kit — o kit se retira no balcão. Ela era falsa, e promessa falsa não
se adia, se apaga.

**A confirmação de endereço morre junto, por decisão explícita.** *"Se ja pegamos o endereço nao
precisamos perguntar mais nada"* e *"nao pediremo endereço novamente pois ja temos ele"*. O
endereço completo entra no checkout pela RN-561, com a razão que ele escreveu em 11/08 — segurança
e cadastro. Pedir de novo é atrito sobre dado que já está no banco.

**Os degraus 3 e 4 não nascem como tela pós-compra.** O 3 muda de casa e vira o item 9.3 deste
adendo. O 4, a pergunta de satisfação depois do evento, **não foi decidido nesta fala** e fica
como estava — sem dono novo, sem promessa nova, dependendo do canal. Registrar isso importa
porque a fala fechou o item inteiro do painel, e um leitor futuro poderia ler o fechamento como se
o degrau 4 tivesse sido recusado. Não foi: ele não foi tocado.

**O degrau 5 fica exatamente como estava**, e a decisão o reforça.

**Efeito.** O item **não consome número de RN**: recusar tela pós-compra é veto de escopo de fila,
como o CRM-1 foi. O que virou regra foi a premissa por trás dela, no item 9.4.

**Onde aterrissa.** [[LEELA-E19-crm]], delta próprio; §Parte 7 de
`02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md`, com o degrau 2 **marcado e não
apagado**, pela mesma disciplina que o índice de RNs aplica a regra superada — é o texto morto que
explica por que a contrapartida existia, e apagá-lo faria alguém reescrevê-la em três meses
achando que era ideia nova.

**Condição de reabertura.** Ele querer pedir alguma coisa depois da compra. Nenhum degrau foi
apagado do desenho, e o degrau 4 nem sequer foi respondido.

## 9.2 · A primeira entrada na área do cliente define a senha — RN-570

**Fala, na parte que decide:** *"quando a pessoa entra na área do cliente pela primeira vez,
podemos enviar para ela definir a senha deça."*

**Leitura.** Amarra direto com a **RN-562** da leva 8, e é o desfecho dela. A sessão do checkout
é promovida a conta logada ao confirmar o pagamento; então a pessoa chega logada, com conta e
**sem senha**. Até aqui o único caminho da senha era o link de e-mail da RN-453, que exige que ela
abra a caixa. A fala acrescenta o gatilho que faltava, dentro da própria sessão.

**Efeito.** Nasce a **RN-570**. A **RN-453 não é revogada**: o link de e-mail continua existindo,
continua terminando na `/definir-senha` da landing e continua com os três estados distinguíveis
que ela descreve. O que a regra nova acrescenta é o **segundo gatilho**. E a senha **continua fora
do checkout** — isso foi decidido na leva 8, quando ele escolheu a primeira opção do CKLOGIN-1, e
este gatilho acontece depois do dinheiro, nunca antes.

**Defaults do maestro, vetáveis.** *"Podemos enviar para ela definir a senha"* fecha o gatilho e
não fecha a força dele. A condução nasce como **passo adiável**, e não como parede: quem quiser ver
os próprios ingressos primeiro vê, e o convite volta na entrada seguinte enquanto a senha não
existir. É a leitura que a RN-510 cravou ao derrubar o overlay bloqueante da RN-416, com duas
contas reais paradas nele em 06/08 como medição. Uma linha dele transforma em obrigatório. A
condução some quando a senha existe, e não é oferecida a quem entrou por senha.

**Onde aterrissa.** RN-570 em [[LEELA-E12-landing]], ao lado da RN-562 e da RN-453. **Não vira
história solta:** entra na **S1247**, que é a história da promoção da sessão, como **`S1247-T4`**.
A razão está escrita porque ela é o critério: é o mesmo fluxo — a conta que nasce no fim da compra
chega sem senha, e esta tarefa fecha a lacuna que a T1 abre. **Construir não é desta lane.**

**Condição de reabertura.** A re-prova da fronteira de autenticação da `S1247-T2` achar que a
conta promovida sem senha abre um caminho que as RN-476 a RN-480 fecharam. Aí o gatilho volta ao
dono junto com o achado, e não se conserta fronteira de auth em silêncio.

## 9.3 · O banner convida a concluir o cadastro — RN-571

**Fala, na parte que decide:** *"e na area do cliente podemos colocar um banner/alerta convidando
o usuário para concluir o cadastro."*

**Leitura.** É aqui que o degrau 3 passa a viver. A coleta complementar de perfil sai da tela
pós-compra, que morreu, e vira **convite numa superfície que a pessoa já visita por vontade
própria**. A palavra dele é **convidando**, e ela decide a força: convite, nunca bloqueio.

**Efeito.** Nasce a **RN-571**, na mesma família da RN-510 — aviso de conta é experiência, não
segurança. Fechar o banner não tranca nada, e nenhuma tela da área do cliente fica atrás dele. E o
banner **não pede endereço**: ele já foi coletado pela RN-561, e repetir o pedido é exatamente a
pergunta que o item 9.1 matou.

**Defaults do maestro, vetáveis.** O banner **não inventa contrapartida nova** — e isso está
escrito como restrição, não como escolha de redação. A razão dita na tela é a que a **RN-564** já
sustenta: a pessoa escolhe os interesses uma vez, e eles servem os três consumidores. Copy final é
decisão de produto e não sai de esteira; o que a regra crava é que ela não pode prometer envio
(RN-569) nem contrapartida que a casa não entrega. E o banner nasce **um**, não uma fila: se um
segundo convite quiser espaço, ele disputa o mesmo lugar em vez de empilhar.

**Onde aterrissa.** RN-571 em [[LEELA-E12-landing]]; história nova **S1250**; a coleta lê a
derivação da RN-564, nunca uma cópia da lista. **Nenhuma linha de código nesta lane.**

**Condição de reabertura.** O banner virar bloqueio por pressão de conversão. Aí ele reabre o
item, porque a palavra dele foi *convidando*, e a RN-416 já custou duas contas reais paradas.

## 9.4 · ⛔ CORREÇÃO DE PREMISSA, segunda cobrança — a casa NÃO ENVIA NADA (RN-569)

**Fala, na parte que corrige:** *"nao existe isso de 'confirme para o kit chegar certo' **ja
falei** que nao enviaremos nada."*

**"Já falei" é o dado mais importante deste adendo.** A primeira vez foi em **05/08**, quando ele
revogou a RN-211 e a lane SPEC-SEM-KIT registrou que o kit não vende desconto. Aquela correção
tratou de preço; esta trata da operação inteira, e ela chega porque a esteira reintroduziu a
premissa numa spec escrita **no mesmo dia** da primeira correção. Uma premissa que volta depois de
corrigida não se conserta com um edit: ela vira regra, ou volta uma terceira vez.

**Efeito.** Nasce a **RN-569**, no [[LEELA-E03-operacao-evento]], que é o épico dono do kit e da
retirada. Precedente de forma: a **RN-399**, que também é regra de vocabulário e também mora no
E03 com consumidores em outros épicos. **O enunciado:** o produto não faz envio físico; o kit se
retira no balcão, na janela do evento; e nenhuma superfície que a pessoa lê pode prometer,
sugerir ou pressupor que a casa envia, entrega em domicílio, despacha ou posta qualquer coisa.

**O que a regra NÃO proíbe**, escrito na própria regra porque a palavra "entrega" tem dois
sentidos no produto e o sentido certo é fácil de consertar por engano: entregar o kit no balcão
segue legítimo (RN-205, RN-222, `registrarEntrega`, `kitEntregueEm` — a régua da RN-399 é o que a
**pessoa lê**, não o nome do dado); "enviaremos" sobre e-mail segue legítimo, porque envio de
mensagem não é envio de coisa; a logística do próprio organizador não é a nossa; e registro de
benchmark não é promessa.

**Onde aterrissa.** RN-569 no [[LEELA-E03-operacao-evento]], com [[LEELA-E12-landing]],
[[LEELA-E19-crm]], [[LEELA-E13-app-atleta]] e [[LEELA-E06-marketing]] como consumidores.

**Condição de reabertura.** Ele decidir que a casa passa a enviar. A regra cai inteira e abre um
escopo que hoje não existe em lugar nenhum — frete no checkout, endereço validado como destino,
rastreio e o custo disso. Os dois benchmarks de `05-discovery/` já mediram que isso é lacuna
declarada, e não acidente.

## 9.5 · A varredura de promessas de envio, ocorrência a ocorrência

**Método, para a lista ser falsificável.** Duas varreduras independentes. A primeira sobre
`leela-specs/**/*.md`, por `kit chegar`, `chegue certo`, `chegar certo`, `entrega do kit`,
`enviaremos`, `receber o kit`, `envio do kit`, `enviar o kit`, `endereço de entrega`, `frete`,
`correios`, `chegar em casa` e variações de acento e conjugação. A segunda sobre a **copy
renderizada** dos apps — `apps/landing`, `apps/painel`, `apps/mobile`, `packages/core/src`,
`packages/design-system/src`, `packages/api-client/src`, `functions/src` e `functions/scripts` —,
com o conjunto acima mais `sedex`, `transportadora`, `rastreio`, `remessa`, `postagem`,
`encomenda`, `domicílio`, `receba em casa`, `na sua porta`, `shipping`, `delivery`,
`enderecoEntrega`, `shippingAddress` e `deliveryAddress`. Excluídos dos dois lados: `node_modules`,
`dist`, `.next` e artefatos de build.

**O resultado, em uma linha: 30 ocorrências nas specs, 4 delas promessas vivas; e ZERO promessas
na copy renderizada dos apps.**

### As 4 promessas vivas, e o que foi feito com cada uma

| # | Onde | O que diz | Veredito |
|---|---|---|---|
| 1 | `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md:610` | *"A contrapartida é imediata e verdadeira: **confirme para o kit chegar certo.**"* | **CORRIGIDO nesta lane.** Degrau 2 marcado como morto, texto legível e riscado, com a razão e o ponteiro para a RN-569 |
| 2 | mesmo arquivo, `:608` | *"…e a confirmação do **endereço de entrega**."* | **CORRIGIDO nesta lane**, no mesmo bloco marcado — e é o mais insidioso dos quatro, porque não usa a palavra envio e mesmo assim pressupõe destino |
| 3 | `01-produto/DECISOES-ABERTAS.md`, item CRM-4, linha do caso de uso | *"ali confirmar o **endereço de entrega** custa quase nada"* | **REMOVIDO com o item**, na segunda fase desta lane |
| 4 | mesmo item, linha das opções | *"contrapartida imediata e verdadeira — **'confirme para o kit chegar certo'**"* | **REMOVIDO com o item**, mesma razão |

> **Sobre as linhas dos dois do painel:** a varredura as achou nas linhas 63 e 67, e a lane
> LIMPEZA-PAINEL-FORMATO reescreveu o arquivo inteiro no intervalo, levando-as para 29 e 32 com o
> texto encurtado e a frase intacta. Elas estão citadas por **item e papel na estrutura**, e não por
> número de linha, porque número de linha de um arquivo que outra lane está reescrevendo é
> referência que nasce morta.

Os quatro têm a mesma origem: os dois do painel são a citação dos dois da spec. **Uma frase
escrita uma vez em 05/08 apareceu em quatro lugares em sete dias**, e é isso que a regra existe
para interromper.

### As 26 ocorrências que FICAM, por família e com a razão

**Família A · "entrega" é o balcão (2).** `03-canon/epics/LEELA-E03-operacao-evento.md:1112` e
`06-backlog/backlog/LEELA-S208.md:20`, a mesma frase de critério de aceite: *"um kit entregue
antecipadamente (correios ou retirada dias antes)"*. **Ficam.** Descrevem a logística do
**organizador**, que pode ter distribuído kit antes da prova por conta própria, e são a razão de
existir da RN-222 — o QR da largada que só carimba presença. A casa não promete nada ali. Apagar
a frase mataria o caso de teste da regra.

**Família B · "enviaremos" é e-mail, e é fala do dono (4).**
`02-rodadas/2026-07-28-decisoes/01-decisoes.md:31`,
`02-rodadas/2026-07-28-ingresso-qr/01-decisoes-delta.md:18`,
`02-rodadas/2026-08-04-pos-pagamento/01-decisoes-dono.md:18` e
`03-canon/epics/LEELA-E12-landing.md:2880`. **Ficam, e são intocáveis por duas razões somadas.**
Falam de envio de QR e de acesso de ingresso **por e-mail**, que a RN-569 declara legítimo; e são
**citações do próprio dono na íntegra**, que não se editam por definição — corrigir a palavra de
alguém dentro de aspas é falsificar registro, não consertar spec.

**Família C · benchmark é registro do que se sabia na data (17).**
`05-discovery/benchmark-cheers.md` (linhas 50, 65, 78, 88, 102, 107, 163, 164, 168),
`05-discovery/benchmark-ticketing-br.md` (38, 86, 97, 98, 150, 179, 193) e
`05-discovery/decisoes-escopo-2026-07-04.md:58`. **Ficam.** Descrevem o que **concorrentes** fazem
— a Cheers com toggle de frete, a Minhas Inscrições com kit pelos Correios — e o precedente é
explícito: a revogação da RN-211 registrou que *"as citações em `05-discovery/` não foram tocadas:
benchmark é registro do que se sabia na data"*. Duas delas, aliás, **já diziam a verdade antes**
de alguém a esquecer: `benchmark-cheers.md:78` (*"O Leela V1 assume retirada no balcão; não há
opção de envio de produto"*) e `benchmark-ticketing-br.md:179` (*"O E12 assume só retirada no
balcão"*). A premissa estava escrita e medida; o que faltou foi lê-la.

**Família D · outras, sem promessa (3).** `00-boards/BOARD-HISTORICO.md:139` lista frete entre
decisões comerciais pendentes de julho — registro histórico de board, e o item está pendente, não
prometido. `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md:376` cita *"tabela
estática dos Correios"* como fonte de **faixa de CEP**: Correios como base de dados, nunca como
transportadora. `99-arquivo/next-trail/STORIES-next.md:45` fala de *"receber o kit certo"* e *"Kit
errado na entrega"* — está em `99-arquivo/`, e "entrega" ali é o balcão.

### A copy renderizada dos apps: zero promessas, e nenhum card nasce daqui

A segunda varredura procurou promessa de envio na copy que a pessoa lê, e **não achou nenhuma**.
`frete` e `correios` não aparecem uma única vez em copy de tela, e-mail ou PDF. Como esta lane não
altera código, o desenho previa que cada achado virasse card nomeado: **nenhum card nasceu, porque
não havia o que corrigir.**

O que a varredura achou foram **acertos**, e vale registrá-los porque é a prova de que o produto
construído sempre soube o que a spec esqueceu: a etapa de endereço do checkout diz *"Endereço do
responsável pela inscrição"* e nunca "de entrega"; a seção pública diz **"Retirada do kit"** com
janelas e documento; o passo do kit diz *"Retirado nas janelas do evento, mediante documento"*; e
o e-mail de compra manda apresentar o QR no credenciamento. Os únicos "enviamos" da copy são de
e-mail, e os únicos "entregar" são do balcão do organizador.

**Duas ocorrências que não são copy e ficaram nomeadas de propósito**, para a próxima varredura não
as reencontrar como se fossem achado novo: `functions/src/__tests__/qrCheckin.integration.test.ts`
tem um comentário que cita correios como cenário da RN-222 — é a fixture legítima da família A —, e
`packages/design-system/src/components/Radio/Radio.stories.tsx` usa "Entrega do kit" como rótulo de
exemplo de Storybook, que não renderiza para pessoa nenhuma.

### O que a varredura mediu sobre o mecanismo, e o que a esteira propõe

**A premissa nunca foi desconhecida — ela foi ignorada por quem escreveu depois.** Estava medida em
dois benchmarks desde julho, estava no modelo desde a RN-205 e estava no vocabulário desde a
RN-399. Correção por edit não impede a terceira vez, e regra sem prova tampouco. A esteira propõe,
como **default vetável e não como decisão dele**, que a RN-569 nasça com o mesmo tipo de prova que
a RN-558 trouxe: um gate de vocabulário sobre copy, começando em aviso. O card está na fila,
nomeado, e derrubá-lo custa uma linha — o custo do veto é que a quarta ocorrência será encontrada
por um comprador, e não por nós.

## A conta do painel, depois desta leva

**5 → 4.** Sai o **CRM-4**. Ficam quatro, contados à mão contra as duas seções do painel no
formato novo: o **item 12** e o **MODALIDADES-1** em "Decisões que dependem de você", e o **69** e
o **JUROS-1** em "Ações que só você pode executar".

**Por que a conta parte de 5 e não de 4**, que é o número que a leva 8 registrou de manhã: o
**MODALIDADES-1** subiu ao painel canônico pela primeira vez na tarde de 12/08, pela lane
REGISTRO-S316-PAINEL (commit `b8480223`), no intervalo entre as duas levas. A leva 8 fechou em 4 e
estava certa na hora em que escreveu; a conta desta lane é refeita à mão contra o arquivo, e não
herdada do número anterior — que é a única forma de a contagem não derivar.

⚠️ **Trava de ordem cumprida.** O painel estava sendo reescrito pela lane LIMPEZA-PAINEL-FORMATO
enquanto esta lane trabalhava. Rodada, varredura, épicos, cards e RNs foram feitos e commitados
primeiro (`dac2654a`); o painel só foi tocado depois de a limpeza aterrissar na main
(`c1796608`, `9e0dd727`, `b56fe822`). O item foi removido **no formato novo**: cabeçalho de três
linhas intacto, nada de narrativa de fechamento no arquivo, e o histórico deste fechamento vive
aqui, na rodada, que é onde o contrato do painel manda ele viver.

---

# Adendo · Leva 10 — 12/08 tarde (o slug editável nas três superfícies)

> Uma decisão só, **direcional**, despejada logo depois da leva 9. Ela não dispara build: as
> palavras dele são *"para seguirmos depois"*. Registrada aqui com as perguntas que a spec futura
> precisa responder antes de qualquer linha de código.

**Fala do dono, na íntegra:** *"Outro ponto importante, é deixarmos o usuários editarem a página
deles, quanto ao nome de slug, caso o slug esteja disponivel, Isso vale para eventos, clubs e para
a propria página também. Registre essa decisão para seguirmos depois."*

## 10.1 · DECIDIDO, direcional — o usuário edita o slug da própria página

**Leitura.** Duas coisas ficam decididas e uma fica adiada de propósito. Decidido: o usuário
**pode** trocar o slug da própria página, e isso vale nas **três** superfícies que ele nomeou —
**evento**, **club** e **a própria página do produtor**. Decidida também a condição: *"caso o slug
esteja disponivel"*. Adiado por ordem dele: o **quando**, porque *"para seguirmos depois"* é
instrução de sequência, não de escopo.

**Efeito.** **Não consome número de RN**, e isso é deliberado. O mecanismo não está decidido, e
regra escrita antes do mecanismo cravaria justamente o que a spec futura precisa responder. É o
mesmo desenho do **ARENA-1** na leva 8: o que nasce é direção de produto registrada no épico, não
regra. **Nenhuma linha de código, e nenhum item novo no painel** — decisão tomada não é pendência.

### O fato técnico que a spec futura não pode ignorar

Vale escrever antes das perguntas, porque ele muda o tamanho de todas elas. **Nas três
superfícies, o slug é o `docId`**: `eventos/{eventoId}` com `docId = slug`, `clubes/{clubId}` com
`docId = slug`, e no produtor `tenantId == slug == docId`. Trocar o slug **não é editar um campo**
— é mover o documento e a subárvore inteira que pende dele. É migração, e quem escrever a spec
precisa dizer isso antes de alguém desenhar um input editável na tela de configurações.

### As perguntas que a spec futura precisa responder

1. **Destino dos links antigos.** O slug anterior redireciona, ou morre? Por quanto tempo? É a
   pergunta mais cara das quatro por uma razão física: a **RN-201** gera URL pública **e QR** na
   publicação do evento, e **QR impresso em cartaz e PDF de ingresso já baixado não se
   reimprimem**. Link velho que morre transforma material impresso em lixo. A **RN-234** já é a
   máquina de redirecionamento da casa — nasceu na virada de `entrega` para `credenciamento`, com
   teste orientado a tabela e guarda anti-laço — e é o candidato natural, não mecanismo novo.
2. **Política de colisão e de reserva.** *"Caso o slug esteja disponivel"* define a condição de
   entrada e não diz o que acontece com o slug **liberado**. Se ele volta ao pool na hora, um
   terceiro pode capturar o endereço de um evento cujo QR está na rua — que é sequestro de
   audiência, não coincidência. Reserva por prazo, reserva permanente ou pool imediato são três
   respostas diferentes com custos diferentes.
3. **Limite ou janela de renomes.** Quantas vezes, e até quando. Antes da primeira venda, como a
   edição de modalidades da RN-500? Sempre? Uma vez por período? A resposta muda se o renome é
   operação barata de rascunho ou migração cara de evento vivo.
4. **O que exatamente é "a propria página".** A leitura da esteira é o endereço público do
   produtor, hoje amarrado ao `tenantId`. Mas o `/@handle` público é **outro registro**
   (`perfis/{handle}`, digitado pela pessoa), e onde a decisão tocar os dois ela precisa ser
   confirmada, não presumida.

### ⛔ O conflito declarado: esta decisão supersede a premissa da ponte

É a parte que mais muda de estado, e por isso ela não fica só aqui. Em 11/08, ao fechar o
**PONTE-NOME-1**, o painel registrou a razão do conserto na origem com estas palavras: *"o
conserto na origem, porque **depois do código não existe renomear**"*. A frase era **medição
verdadeira** — a PONTE-REV mediu em 08/08 que as Rules só deixam criar `profissionais/{uid}`, que
`tenants` é `create, update: if isPlatformAdmin()` e que não existe callable de renome — e virou
premissa de desenho.

**A decisão do dono derruba a premissa.** O "depois" passa a existir por ordem dele. O conserto na
origem **não é revogado**: perguntar o nome da produtora na porta continua certo e continua sendo
o caminho barato. O que muda é que ele deixa de ser o **único**. E o card **renomear DEPOIS**, que
estava separado e sem dono desde 11/08 (registrado na `S1234-T5` do [[V1-KANBAN]]), **ganha
dono**: é esta decisão. A premissa fica **marcada, não apagada**, porque é ela que explica por que
a porta pergunta o nome — apagá-la faria alguém desfazer o conserto da origem achando que o renome
o dispensa. Ele não dispensa: renomear é caro, e a origem certa continua de graça.

**Onde aterrissa.** Direção registrada em [[LEELA-E03-operacao-evento]] (slug do evento),
[[LEELA-E05-clubs]] (slug do club) e [[LEELA-E16-plataforma-superadmin]] (slug do produtor, com o
conflito da ponte escrito lá). Card no backlog, ancorado nos três, em [[04-fila-cards]] e no
[[V1-KANBAN]]. **Não entra no painel** — é decisão tomada, não pendência.

**Condição de reabertura.** A spec futura descobrir que o redirecionamento não cobre o QR impresso.
Aí a decisão volta ao dono com o custo medido, porque *"o slug está disponível"* foi dito sem que
ninguém tivesse posto na mesa o preço do endereço que já saiu de casa.

---

# Adendo · Leva 11 — 12/08 (a área de kits perde a redundância e ganha nomes de gente)

> Registro da lane REGISTRO-LEVA11-KITS-IA (trace `leela-redesign-v2-20260810`). Três decisões
> dele sobre a IA da área de kits e credenciamento de um evento, cada uma com a medição da
> superfície citada antes do veredito. Nenhuma constrói nesta lane.

**Fala do dono, na íntegra (12/08):** *"reparei que credenciamento aparece dentro de kits, só que
já temos credenciamento no menu secundário. Ficou redundante e sem necessidade. Distribuição e
'retiradas dos kits' poderiam ser unificados, e aba de cadastro também, poderia virar
'gerenciamento'."*

## 11.1 · DECIDIDO — a duplicata de credenciamento dentro de Kits sai

**Medição.** Dois pontos dizem "Credenciamento" na navegação de um evento:

- **Dentro de Kits** — `apps/painel/src/routes/eventos/kits/KitsLayout.tsx:29`, quarto item da
  sub-nav interna da seção Kits: `{ id: 'entrega', label: 'Credenciamento', href:
  '/eventos/${slug}/credenciamento', active: false }`. `active` é sempre `false` — o item nunca
  acende, porque a rota que ele abre está fora da árvore de Kits. É um atalho de saída, não uma
  sub-tela de Kits.
- **No menu secundário do evento** — `apps/painel/src/routes/eventos/_lib/subnav.ts:43`: `{ id:
  'entrega', label: 'Credenciamento', segmento: 'credenciamento' }`, a aba real da SubNav do
  evento (§2.14), com o destaque de aba ativa calculado por `abaAtiva()` (mesmo arquivo, linha 60).

**Achado.** Não há divergência de conteúdo entre as duas. O item dentro de Kits não é atalho com
tela própria nem versão resumida: é um `href` idêntico para a mesma rota
`/eventos/:slug/credenciamento` que a aba do menu secundário já abre, e o rótulo "Credenciamento"
nas duas pontas já está cravado pela RN-399. A remoção é limpa — nada fica sem destino.

**Efeito.** Sai o item de `KitsLayout.tsx:29`; Kits volta a ter 3 abas internas (Cadastro,
Distribuição, Estoque). Quem quer credenciar sai da área de Kits pelo menu secundário do evento,
como já faz para Inscritos, Financeiro etc. **Não consome número de RN** — é remoção de item de
navegação duplicado, não regra de negócio nova; a identidade e o vocabulário do credenciamento já
estão cravados pela RN-399, e esta decisão só aplica a régua dela (uma porta só) dentro de Kits.

## 11.2 · DECIDIDO com desenho vetável — Distribuição e a leitura de retirada de Estoque unificam

**Medição — anatomia das duas abas hoje.**

- **Distribuição** (`KitsLayout.tsx:27`, rota `kits/distribuicao` → `DistribuicaoPage` →
  `DistribuicaoView.tsx`): tela presentational pura, sem KPI e sem tabela. Duas seções de barra de
  progresso — "Retiradas por kit" (`DistribuicaoView.tsx:46`) e "Retiradas por modalidade"
  (`:59`) —, cada linha com retirados/total/percentual (`LinhaProgresso`, `:86-108`).
- **Estoque** (`KitsLayout.tsx:28`, rota `kits/estoque` → `EstoquePage` → `EstoqueView.tsx`): tela
  maior, cinco blocos — alertas de kit esgotado/SKU em baixa (`:433-468`); 4 KPIs incluindo
  "Retirados" (`:480`, hint "presença registrada"); matriz Kit×modalidade com coluna
  Retirados/confirmados por célula (`:511-517`, caption "Retiradas e saldo por kit e
  modalidade"); tabela de SKU por tamanho — vendido/físico/a encomendar/estado/alerta/entregues
  (`:281-384`); EmptyState de movimentações (`:575-578`).

**Achado — onde mora a redundância que ele leu.** Não existe no código uma terceira aba chamada
"Retirada dos kits" ao lado de Distribuição — o rótulo é dele, lido do **conteúdo**, não de um
rótulo de aba. O dado de retirada aparece em **três leituras dentro de Kits**: as duas seções
inteiras de Distribuição, o KPI "Retirados" de Estoque e a coluna Retirados/confirmados da matriz
de Estoque — três cortes do mesmo número (presença registrada), sem uma leitura única. É essa
sobreposição, e não uma tela isolada, que sustenta "ficou redundante".

**Efeito.** Fica **decidido que Distribuição e a metade de retirada de Estoque unificam** numa aba
só. **Vetável** é o desenho: nome da aba, o que cada metade vira (progresso por kit/modalidade de
um lado, controle de estoque físico/SKU do outro) e a hierarquia interna — proposta da esteira
dentro do card de build (S1258), não decisão fechada aqui.

**Efeito no RN.** **Não consome número agora** — mesmo desenho da leva 10 (slug editável): a
decisão de unificar está tomada, mas o desenho concreto é vetável, e cravar regra antes dele
responder cravaria o que o card ainda precisa perguntar. Se o veto fechar como reorganização pura
de tela (sem mudar o que um dado significa), a build não deve precisar de RN nem nessa hora — é
decisão de UI, não de negócio; se o veto criar comportamento novo, quem constrói registra o número
na própria aterrissagem daquela lane.

## 11.3 · DECIDIDO — a aba Cadastro vira Gerenciamento

**Medição — o que a aba faz hoje.** `KitsCadastroPage.tsx` → `KitsCadastroView.tsx`, rota-índice
de Kits (`KitsLayout.tsx:26`, rótulo atual "Cadastro"). Três seções: resumo com 3 KPIs — kits
configurados, itens no catálogo, marcas ativadas (`:58-62`); "Kits do evento" (`:65`), com cards de
kit e botão "+ Adicionar kit" que abre `KitEditorPage` em tela cheia (`/kits/novo`,
`/kits/editar/:kitId` — rotas próprias, `EventosRoutes.tsx:128-129`); "Catálogo de itens" (`:93`),
com CRUD completo por modal (`ItemKitModal`), badges de tipo/origem (RN-212/RN-213) e bloco de
patrocinador com toggle "Exibir logo ao atleta" (RN-214).

**Achado.** A aba já faz mais que cadastrar: cria **e** edita kits (por rota própria) e itens (por
modal), com KPIs de resumo e configuração de patrocínio — é gestão do inventário de kits e itens
do evento, não só o registro inicial. O nome novo fecha com o conteúdo; não é troca de rótulo
vazio.

**Efeito.** Rótulo de `KitsLayout.tsx:26` muda de "Cadastro" para "Gerenciamento". O `id` interno
(`'cadastro'`, usado no cálculo de aba ativa) **não muda** — mesma régua da RN-399: o que muda é o
que a pessoa lê, não o identificador. **Consome RN-572** (dona = E03), enunciado no épico e no
delta da rodada.

## Onde aterrissa

- Épico dono das três: [[LEELA-E03-operacao-evento]].
- Cards de build no [[V1-KANBAN]], padrão épico → história → tarefa: **S1257** (item 11.1),
  **S1258** (item 11.2, com a proposta da aba unificada como vetável dentro do card) e **S1259**
  (item 11.3). Build não é desta lane.
- RN-572 consolidada no épico e no delta da rodada (`03-rns-delta.md`); índice atualizado.
  Próxima livre passa a ser **573**.

---

# Adendo · Leva 13 — 12/08 noite (a home fala de ecossistema, e a copy é no tom dele)

> Registro da lane COPY-APPLY (trace `leela-copy-landing-20260812`). Uma decisão só, e ela fecha o
> vetável mais antigo do produto: a home pública, reservada a ele desde 02/08 pelo D-0802-1 §2.
> **Esta é a única leva do dia em que o registro e a construção andaram juntos** — a fala fechou a
> direção, a mesma lane aplicou a copy, e o delta foi entregue fechado para a review antagonista.

**Fala do dono, na íntegra (12/08, antes de dormir):** *"Quanto á copy, quero que seja no meu tom
de voz. Lembre-se que a leela nao é sobre corridas apenas. O objetivo é ser um acossistema de
experiencias de bem-estar e nao se esqueça dos 3 pilares."*

## 13.1 · DECIDIDO — a home é ecossistema de experiências de bem-estar, com os 3 pilares

**Leitura, em três partes, porque a frase decide três coisas.**

**(a) A direção da home fecha, e ela não é nenhuma das quatro de 02/08.** O material de 02/08 punha
quatro direções na mesa esperando ele apontar uma. Ele não apontou: fechou a **direção** e mandou a
copy nascer dentro dela. Ecossistema de experiências de bem-estar, com os três pilares presentes, e
**nunca reduzida a corridas**. A frase `Ache sua próxima corrida e garanta a inscrição em minutos.`
morre com esta fala.

**(b) O tom é o dele, e tom não se adivinha.** *"Quero que seja no meu tom de voz"* é instrução de
método, não elogio. A lane extraiu uma **régua de tom de cinco linhas das fontes do próprio dono**
antes de escrever qualquer string — o material de 02/08 que originou o D-0802-1, as falas dele
registradas nas rodadas e o rodapé que ele aprovou (*"sem enrolação"*) —, e cada string nova foi
conferida contra ela. A régua vive em `02-rodadas/2026-08-12-copy-landing/04-apply.md`, e ela
reprovou duas propostas da própria review antes de virarem código.

**(c) Os três pilares entram com as palavras canônicas.** *"Nao se esqueça dos 3 pilares"* é
explícito, e os pilares já têm nome no produto desde a **RN-114**: Físico, Mental, Espiritual. A
home usa esses, e não sinônimos, para falar a mesma língua da Arena, do onboarding de usuário novo
e das preferências do perfil, que a **RN-564** já amarrou aos mesmos três.

**Efeito.**

- **O vetável V1 da rodada de copy FECHA.** Registro em
  `02-rodadas/2026-08-12-copy-landing/02-vetaveis.md`, com ponteiro para esta leva. A história
  **S1256** deixa de esperar o dono e foi **aplicada na mesma noite**.
- **O H1 novo, na íntegra:** `Físico, mental, espiritual. Ache sua próxima experiência e garanta a
  vaga em minutos.` Ele conserva o esqueleto que já estava no ar, porque a frase dele nunca foi o
  problema: o problema era o substantivo.
- **A descrição do root layout entra junto**, e ela é a peça que a rodada de 02/08 não tinha. É o
  texto que alimenta busca e preview de link em **toda** rota sem descrição própria, inclusive a do
  evento e a do produtor: trocar só o `<title>` deixaria o snippet do Google anunciando corrida na
  página de um retiro.
- **Não consome número de RN**, e isso é deliberado. Fechar a direção de uma superfície é decisão
  de vocabulário dentro do D-0802-1, que já é a regra viva. Escrever uma regra nova aqui duplicaria
  a que existe. **A próxima livre continua sendo a 573.**

**Defaults do maestro, vetáveis, nas sub-decisões que a fala não alcança.** A fala fecha a direção e
não fecha a redação, então cada peça abaixo custa uma linha para derrubar, e todas estão na íntegra
em `04-apply.md`: o **eyebrow** virou `Experiências de bem-estar`, declarando a categoria em vez de
uma instância; a **subline** carrega as instâncias (`Corrida, pedal, retiro, treino de clube`),
porque "experiência" sozinha não faz ninguém se reconhecer, e elas atravessam os três pilares em
vez de listar quatro maneiras de correr; o **CTA do hero** virou `Ver experiências` e o rótulo do
card virou `Ver experiência →`, que nomeia o destino real; e o `<title>` virou
`Leela — inscrições para experiências de bem-estar`.

**O que a decisão NÃO alcançou, e segue com ele.** Os outros quatro vetáveis da rodada de copy
continuam intactos e nenhum foi decidido por default: **V2** (organizador × profissional ×
produtora), **V3** (`0 membros ativos` no card do club), **V4** (`Club` em inglês) e **V5** (nomear
o Asaas na tela do checkout). A aplicação acrescentou um quinto, o **V6**, que ela descobriu ao
pagar o achado M4: "modalidade" tem dois sentidos vivos no produto e os dois tiles agora ficam lado
a lado na seção Sobre.

**Onde aterrissa.** `02-rodadas/2026-08-12-copy-landing/04-apply.md` (régua de tom, os 13 defeitos
pagos e a home peça por peça); `02-vetaveis.md` do mesmo diretório (V1 fechado, V6 aberto);
histórias **S1252 a S1256** no [[V1-KANBAN]] e no [[V1-CHECKLIST]]; épico [[LEELA-E12-landing]].
A **S1251 continua aberta e não é desta lane**: ela é o deploy do renome do Serviço, e **nenhum
deploy aconteceu aqui**.

**Condição de reabertura.** Ele ler a home no ar e o tom não ser o dele. É o único juiz que
importa, e é por isso que a régua de cinco linhas ficou escrita: reabrir vira ajuste de linha, e
não redescoberta do tom a cada rodada.
