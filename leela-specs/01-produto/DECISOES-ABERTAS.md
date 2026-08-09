# Decisões em aberto — painel do Vitor

> **Como ler.** Todo item tem a mesma forma: um parágrafo curto de contexto, depois o que fica com você, por que está na mesa agora, as opções com o default marcado e onde a resposta aterrissa. Nada aqui bloqueia código. Tudo roda com um default defensável em vigor, ratificar é confirmar o default, e mudar é ajuste no próximo lote.
>
> **Se forem muitos itens de uma vez, comece pela vista de triagem.** O [[DECISOES-ABERTAS-TRIAGEM]] é uma página de leitura sobre este painel, não um painel paralelo: ela ordena os mesmos itens em três blocos — o que trava trabalho, o que mexe em dinheiro ou em risco, e o que é preferência — com uma linha por item e o link de volta para cá. Ela não guarda resposta nenhuma. A fonte é este arquivo, e a triagem é redesenhada a cada leva.
>
> **Disciplina de limpeza.** Item resolvido sai deste painel na mesma aterrissagem. O registro completo, com o seu verbatim, passa a viver no arquivo da rodada em `02-rodadas/`. Este painel só carrega o que ainda é seu.
>
> **Última leva.** Você respondeu dezesseis itens em lote em 03/08. O registro completo, com o verbatim, as duas regras permanentes que ele gerou e as seis lanes que ele abriu, está em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md` §DEC-0803B.
>
> **Saiu em 05/08.** O **ADMINSEP-1** foi respondido e saiu daqui pela disciplina acima. Você escolheu a primeira profundidade, só as superfícies de login. O registro completo, com o seu verbatim e com a alternativa que foi considerada e não escolhida — endereço próprio para o painel de administração, que era a recomendação do maestro —, está em `02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`. O ADMINSEP-2 e o ADMINSEP-3 continuam abertos.
>
> **Saiu em 05/08, à noite.** O **POSSE-EMAIL-1** foi respondido e saiu daqui pela mesma disciplina. Você mandou aplicar a correção na onda do código de seis dígitos, e ela deixou de ter efeito colateral no mesmo gesto: quem comprou e nunca verificou o endereço passa a ter caminho próprio até a senha, então exigir e-mail verificado na regra não tranca mais ninguém. O registro completo, com o seu verbatim, a exposição medida pela review da área do cliente, a correção exata e o argumento que a destravou, está em `02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`. A tarefa que esperava por você saiu do gate.
>
> **Saiu em 05/08, sem precisar de você.** O **KITLOTE-1** fechou porque a sua própria decisão o respondeu. Ele perguntava se o kit de desconto merecia exceção quando o interruptor do lote desliga; ao dizer que a plataforma não vende desconto por dispensar o kit, você eliminou o kit de desconto e, com ele, a pergunta. A outra metade do item, se o interruptor congela depois da primeira venda, perdeu o argumento junto: sem preço negativo, desligar **só pode baratear ou empatar**, nunca encarecer. O default fica em vigor sem ressalva. Registro completo em `02-rodadas/2026-08-05-sem-kit/02-spec-sem-kit.md` §Parte 5. No lugar dele entraram o **SEMKIT-1** e o **SEMKIT-2**, que a decisão abriu.
>
> **Leia com esta data na cabeça: 05/08 à noite, tudo o que estava represado subiu.** Painel, landing, regras do Firestore, regras do Storage e vinte e uma das noventa e seis funções entraram em produção num deploy só, com cada passo confirmado relendo o servidor. O painel estava vinte e duas horas atrás do repositório e passou a estar em dia. Onde este painel dizia "construído e fora do ar", agora diz "no ar" — e onde continuar dizendo "fora do ar", é porque de fato não subiu. **A única frente do dia que não subiu é o conserto da redefinição de senha**, que é posterior ao deploy e está em review. Prova passo a passo em `.nirvana/handoffs/leela-deploy-tudo-0805.md`.
>
> **Saiu em 06/08 · três itens deixaram de ser seus e viraram default permanente.** Você aprovou a proposta da triagem, verbatim: *"aprovado, pode virar default permanente esses três, e corrija"*. Saíram daqui o **12b** e o **QUALIF-6** (o pagador estrangeiro: o paliativo do comprador brasileiro pagando pelo estrangeiro vira o comportamento permanente, e o lote `ESTRANGEIRO-CHECKOUT` passa de gated por espera a fechado por decisão), o **11** (os três segredos: nunca foi seu, e a conferência que faltava foi feita no mesmo dia — a chave dos dados bancários existe no Secret Manager, e o endereço do monitoramento **não existe**, o que junta essa ponta ao item de observabilidade que já está com o CTO humano) e a hipótese **HIP-R9-01** (a pré-compra do clube-influenciador: a RN-315 vira a regra, sem prazo). Cada um saiu com a **condição de reabertura escrita**, porque default permanente sem condição é esquecimento com outro nome, e as três ficam aqui em vez de só no arquivo da rodada: o **estrangeiro volta** quando um organizador pedir o botão "aceitar estrangeiros", quando alguém tentar pagar com cartão emitido no exterior e for recusado no gateway, ou quando você decidir vender para fora do Brasil — e o do meio **depende da observabilidade que está com o CTO humano**, porque hoje uma recusa de gateway não acorda ninguém; os **segredos voltam** se alguma chave for rotacionada ou nascer projeto novo, e a única parte que volta a ser sua é trocar a `CRM_ID_PEPPER` depois de existir dado real, porque isso obriga migrar todas as chaves do CRM; a **pré-compra volta** quando houver um organizador real na mesa que responda as quatro perguntas de dinheiro, e a conversa não precisa ser sua — o que volta ao painel é o resultado, não a pergunta, e quando entrar entra como dinheiro, com rota opus e review antagonista obrigatória. O registro completo, com o verbatim de cada item como estava aqui e a verificação medida, está em `02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md`. O painel caiu de 60 para **56**.
>
> **Entrou em 06/08 · dois itens da limpeza do banco.** A lane que enxuga o `leela-hub` para uma produtora só trouxe duas decisões que não são dela: o **PERFIL-1** (a produtora passa a se chamar Leela e o endereço público dela continua `/@castelo`, porque `leela` é handle reservado da plataforma e o handle é imutável por regra) e o **ACEITE-1** (o termo de saúde é montado na leitura e não guarda impressão digital do texto aceito, ao contrário do termo de uso). Nenhum dos dois trava a limpeza. O painel vai de 56 para **58**.
>
> **Entrou em 06/08, à noite · um item só, da spec do painel do cliente.** Você pediu a spec antes de codar, e ela devolveu uma pergunta e um achado. A pergunta é o **PCLIENTE-1**, a forma do painel, e ela precede a sua própria simulação no Claude Design. O achado não é seu e já está especificado: a porta "criar conta de organizador" da área do cliente está no ar e não funciona, porque manda quem já tem conta para o formulário de cadastro. As outras cinco decisões da rodada ficaram lá mesmo, com default em vigor, em `02-rodadas/2026-08-06-painel-cliente/01-decisoes-dono.md`. O painel vai de 58 para **59**.
>
> **Entrou em 06/08 e ficou fora da conta até 08/08 · o COMPROMETIDO-1.** Ele entrou por este painel junto com a limpeza do banco e **nenhuma linha somou ele**, então o cabeçalho vinha dizendo 59 enquanto o painel tinha 60. Corrigido aqui, contado à mão nas duas seções que valem: 53 em "Decisões que dependem de você" e 7 em "Ações que só você pode executar". **O número de hoje é 60.** Fica dito por que o erro é chato mais do que grave: o item nunca esteve escondido, só nunca esteve somado — e um painel cujo total não bate com a própria lista ensina a não confiar no total. **Uma coisa relacionada, e ela não entra na conta:** o **ADMIN-USUARIOS-1** pede decisão sua ("o diretório de usuários entra na fila, e com que alcance") mas mora na seção "Fila de construção", onde as coisas não são contadas. Deixei onde estava porque a pergunta dele é literalmente de escopo de fila, mas ele fica nomeado aqui para você saber que existe uma decisão sua fora do bloco das decisões.
>
> **Entrou em 08/08 · um item, da lane que deixa a ponte pronta para subir.** O **PONTE-CTA-1** nasceu do seu recado de 07/08 sobre o rótulo da porta. Ele traz uma correção de premissa que vale ler: a criação de clube **existe** e está construída no painel — o que a segura é o mesmo código de convite que segura a criação de evento. O que impede o teste de três rótulos não é superfície faltando, é que a landing não tem medição nenhuma. **O número passa a ser 61**: 54 em "Decisões que dependem de você" e 7 em "Ações que só você pode executar".
>
> **Entrou em 08/08, mais tarde · dois itens, da review antagonista da mesma ponte.** A review de contexto frio aprovou a ponte com ressalvas e trouxe duas coisas que só apareceram porque ela foi atrás delas. O **PONTE-NOME-1** é o achado da lane anterior **medido até o fim**, e o fim é pior do que a suposição: quem entra pela porta nova não só nasce com o nome próprio como produtora, ela **nunca** consegue trocar — não existe caminho de edição, nem para o nome nem para o endereço interno. O **PONTE-ELEGIVEL-1** é novo e não estava em nenhuma lista: a porta recusa menos gente do que o código de convite recusa, então duas classes de conta atravessam para descobrir a negativa um passo depois. Nenhum dos dois trava o deploy da ponte, e a review disse isso com todas as letras. O **PONTE-CTA-1** ganhou uma **quarta opção** que faltava no menu, e não conta como item novo. **O número passa a ser 63**: 56 em "Decisões que dependem de você" e 7 em "Ações que só você pode executar".
>
> **Entrou em 08/08, à noite · dois itens, da review antagonista da vitrine.** A review de contexto frio aprovou a vitrine com ressalvas. Três defeitos dela viraram conserto no mesmo dia e não chegam a você: a espera do crachá que nunca assentava, a camada de papel que não tinha gate nenhum e a rota `/conta` que ficava fora da medição. Os dois que sobem para cá são escolha, não defeito. O **VITRINE-VEU-1** é o aviso que se anuncia bloqueante e bloqueia só o mouse — medido, um clique de leitor de tela navega o painel com o aviso na frente, e o design system já tem o componente que resolve. O **VITRINE-CONTRASTE-1** é o único número de contraste que não passa: no tema escuro o cartão do aviso dá 1,13:1 contra o próprio véu, enquanto todo o texto passa AA com folga. **O número passa a ser 65**: 58 em "Decisões que dependem de você" e 7 em "Ações que só você pode executar".
>
> **Entrou em 08/08, mais tarde na noite · um item, do conserto da barra de rolagem.** O **SCROLLBAR-1** é o resto de uma coisa que você já reportou e que agora está consertada. A barra clara sobre o tema escuro tinha causa única, e ela era uma declaração que nunca foi escrita; o conserto nasce no tema e vale para os dois apps. O que sobe para cá não é o defeito, é a escolha que sobrou: a barra continua sendo desenhada pelo sistema operacional, na versão escura dele, ou passa a ser cromo nosso com cor de token. Os números dos candidatos estão no item, e **este é um dos poucos itens que você fecha só olhando a tela** depois do deploy. **O número passa a ser 66**: 59 em "Decisões que dependem de você" e 7 em "Ações que só você pode executar".
>
> **Personagens dos exemplos.** Ana compra, Castelo organiza eventos, Marina opera o painel, Téo é influenciador afiliado. São ilustrativos, não pessoas do banco.

## Decisões que dependem de você

### LGPD-1 · um organizador pode ficar ativo sem prova de que aceitou o termo

O cadastro carimba o consentimento com a versão do termo, a finalidade e a hora do servidor. Quando a escrita desse perfil falha, o resgate do convite recria o registro mais adiante — e o recria **sem** o consentimento, com a conta já em `ativo`. A pessoa marcou o checkbox; o registro nunca existiu; e nada no produto sinaliza quem está nessa situação. *A organizadora aceita o termo, a gravação falha, ela entra pelo convite e opera a plataforma inteira sem que exista uma linha provando o aceite.*

- **O que fica com você:** escolher um dos três caminhos. Não há default proposto, e isso é deliberado: a review se recusou a escolher porque inventar o carimbo de consentimento fabricaria justamente a prova que a regra recusa.
- **Por que agora:** é decisão jurídica, não técnica, e ela trava a partida. O **seed do primeiro código de convite fica retido** até você responder, então nenhum organizador entra por convite enquanto isso.
- **Opções:** recoletar no resgate, com o overlay pedindo o aceite junto do código quando o registro falta — custa uma linha na tela e um campo na chamada · recusar a ativação sem aceite, com mensagem própria mandando falar com o time — mais rígido, e tranca gente legítima na porta · marcar e varrer, com o registro nascendo com o consentimento explicitamente vazio e um relatório listando quem está sem — não resolve, mas para de esconder.
- **Onde aterrissa:** `resgatarConviteOrganizador` e o overlay de convite; RN-412 e RN-446. Registro completo em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md §ONBOARD-REV`.
- **+04/08 · a porta segue fechada, e agora está medido depois de um deploy.** A lane DEPLOY-EMAIL subiu 18 functions e **re-provou as três da porta do organizador em 404** — `resgatarConviteOrganizador`, `gerarConviteOrganizador` e `revogarConviteOrganizador` —, com três controles positivos para que o 404 não seja sonda quebrada: uma function criada no mesmo deploy responde 204, o webhook responde 405, e o `provisionTenant` responde 204 com data de 28/07 intacta. Detalhe que vale registrar: das três, **só `resgatarConviteOrganizador` existe no código**; as outras duas nunca foram escritas. Produção tem 88 functions e o repositório exporta 89 — a diferença é exatamente ela.
- **+04/08 (tarde) · nasceu a segunda frente de LGPD, e ela pega carona na mesma conversa jurídica.** A Arena Social (rodada `02-rodadas/2026-08-04-pos-pagamento/`) tem um campo que pode inferir orientação sexual — dado sensível do art. 11: os gêneros de pessoas com quem a pessoa quer se conectar. O tratamento já está escrito como contrato, não como decisão sua (RN-472: campo sempre opcional, consentimento específico com finalidade declarada, visibilidade só da própria pessoa por default, apagar apaga e revoga) — fica registrado aqui para a revisão jurídica que este item já pede cobrir as duas frentes de uma vez, em vez de abrir um segundo item de painel.

### PCLIENTE-1 · o painel do cliente é a área que já existe amadurecendo, ou é outra coisa

Você pediu a spec do painel do cliente antes de qualquer código, e vai simular as telas no Claude Design. A varredura achou que a área do cliente **já está no ar** desde 05/08, com sete das oito coisas que você pediu em 04/08: ingressos em próximos e passados, histórico de compras, clubes e convites, meus dados e trocar senha, e o botão para o outro painel. Então o pedido não é uma superfície nova; é a forma que essa superfície toma. *Você abre o Claude Design e simula dezoito telas: ou elas são o `/minha-conta` de hoje ganhando cara de painel, ou elas são um lugar novo — e simular a forma errada joga a simulação inteira fora.*

- **O que fica com você:** confirmar a forma antes de simular.
- **Por que agora:** é a única decisão desta spec que precede o seu próprio próximo gesto. As duas ondas de construção que dependem dela ficam retidas até você olhar; a onda que conserta a porta quebrada não depende e pode sair antes.
- **Opções:** o painel do cliente é o **`/minha-conta` de hoje ganhando casca de painel** — cabeçalho de conta, navegação persistente, estados próprios —, no mesmo endereço e na mesma landing (**default proposto**, porque a área está no ar com callables, testes e deploy atrás dela, e porque a decisão de 04/08 já cravou que a casa dela é a landing) · o painel do cliente vira superfície **dentro do painel profissional**, com o alternador servindo os dois lados — custa derrubar a guarda que hoje barra na porta quem não é organizador, abrir o painel a todo participante do ecossistema e refazer a fronteira de autenticação que acabou de ser provada fechada com dezoito endereços em produção.
- **Onde aterrissa:** RN-511 em [[LEELA-E12-landing]]; história `S1233` e onda B de `02-rodadas/2026-08-06-painel-cliente/05-fila-codigo.md`. O inventário das dezoito telas, com propósito, estados e componentes, está em `02-rodadas/2026-08-06-painel-cliente/04-inventario-de-telas.md` — é o arquivo para levar ao Claude Design.
- **Achado que vale saber antes de responder:** a oitava coisa que você pediu, "criar conta de organizador", está no ar e **não funciona**. O botão manda quem está logada para o formulário de cadastro do painel, e como a conta dela já existe, o sistema devolve a negativa genérica e ela fica sem caminho. O conserto não depende desta sua resposta e já está especificado: virar profissional passa a ser promoção da conta que já existe, e ela aterrissa na vitrine que subiu hoje, com o campo do código Leela à mão.

### PONTE-CTA-1 · você deu três rótulos para a mesma porta, e só um deles pode subir por vez

Em 07/08 você escreveu que a primeira coisa a testar é **"Painel Profissional"** no lugar de "virar profissional", e que **podemos ter CTAs diferentes: "Criar Club" e "Organizar eventos"**. São três rótulos para o mesmo botão. Ao construir, apareceram dois fatos que mudam a pergunta. *Você abre a área do cliente esperando ver dois botões e vê um só — e a razão não é escopo, é que dois botões ali não mediriam nada.*

- **O que fica com você:** dizer se o teste de rótulo vale o custo da medição, ou se a porta fica com um nome e pronto.
- **Por que agora:** o rótulo sobe junto com o conserto da porta quebrada, e trocar depois é um deploy a mais.
- **Primeiro fato, e ele é bom:** *"Criar Club" não promete o que não existe.* A tela de criação de clube **existe e está construída** — `/clubes/novo`, com formulário, validação e código de convite gerado no submit —, e o CTA "+ Criar clube" já vive no hub de clubes. O que a segura é o tenant, exatamente o mesmo portão que segura a criação de evento: enquanto a conta não resgatou o código Leela, o painel troca as duas telas pela vitrine. As duas intenções são **simétricas**, e a vitrine já nomeia as duas áreas com o mesmo peso, "Eventos" e "Clubs". A suposição de que faltava superfície de clube estava errada.
- **Segundo fato, e é ele que decide:** *a landing não tem uma linha de telemetria.* Nenhum gtag, plausible, posthog ou evento próprio. Dois botões lado a lado disparando a **mesma** promoção não diriam qual intenção converteu — seria um teste que não testa, cobrando de quem lê uma decisão a mais num cartão que existe justamente para desbloquear um beco.
- **Opções:** sobe **um rótulo por vez, sem instrumentar**, na ordem que você deu — "Painel Profissional" agora, e os outros dois quando quiser trocar, cada um a um deploy de distância (**default em vigor**, e é o que está construído: o rótulo é uma constante única na tela, `ROTULO_DA_TRAVESSIA`) · **instrumentar a landing** e aí sim rodar as três variantes com número — custa a primeira infra de medição do produto, que hoje não existe em lugar nenhum · **medir pelo servidor, que é bem mais barato** (ver a linha abaixo) · **desistir do teste** e deixar "Painel Profissional" fixo, que é o nome que descreve com precisão o que o clique entrega.
- **+08/08, da review antagonista · a quarta opção, e ela faltava no seu menu.** A review confirmou o segundo fato (a landing não tem mesmo nenhuma telemetria) mas derrubou a conclusão de que por isso **não dá** para medir. A promoção já escreve uma linha de log no servidor a cada clique, com o identificador da conta; um campo de "intenção" nessa mesma chamada mediria qual botão foi apertado, e como o resgate do código também loga, os dois se juntam pela conta e medem a **conversão**, não só o clique. Custa um campo, não uma infra. A lane que construiu recusou isso de propósito e a razão é boa — ampliar o contrato da chamada na véspera da review antagonista é risco desnecessário —, mas essa é razão de **calendário**, não de impossibilidade. Fica registrado para você escolher sabendo que dois botões lado a lado **são** mensuráveis, se você quiser pagar um campo por isso.
- **Uma ponta de vocabulário, que é sua e não do maestro:** "Organizar **eventos**" e "Criar **Club**" são as suas palavras, e a casa fixou "experiência" e "participante" como guarda-chuva pela D-0802-1. As duas convivem hoje porque "Eventos" e "Clubs" são os nomes das **áreas do painel**, não categorias do produto. Se um desses rótulos vencer o teste e virar a porta permanente, a conversa de vocabulário volta.
- **Onde aterrissa:** `02-rodadas/2026-08-06-painel-cliente/06-desenho-do-cartao.md` tem o desenho completo e o que ficou de fora; o rótulo vive em `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx`. Vizinho do **QUALIF-3**, que pergunta outra coisa: até que profundidade técnica o rebatismo desce.

### PONTE-NOME-1 · quem entra pela porta nova vira uma produtora com o nome próprio dela, para sempre

A porta nova promove a conta sem pedir formulário nenhum — é justamente isso que a tira do beco. O preço apareceu quando ela rodou contra banco de verdade: o campo "organização" nasce **vazio**, e no dia em que a pessoa resgata o código Leela o sistema precisa batizar a produtora dela. Sem organização, ele cai no nome da pessoa; sem nome, cai no pedaço do e-mail antes do arroba. *Ana Paula compra um ingresso, resolve organizar, resgata o código — e passa a operar uma produtora chamada "Ana Paula", com endereço interno `ana-paula`, que ela nunca escolheu e não tem como trocar.*

- **O que fica com você:** decidir se a porta pede o nome da produtora, se o batismo espera, ou se fica como está.
- **Por que agora:** o endereço interno é **cunhado uma vez e é definitivo**. Depois de resgatado o código, não existe renomear — nem para ela, nem pelo painel. Cada pessoa que atravessar antes da sua resposta fica com o nome pessoal grudado.
- **O que a review mediu, e é pior do que a construção supunha:** não é só que "preencher depois não corrige". É que **não existe o depois**. As regras do banco só deixam a pessoa **criar** o próprio registro de profissional, nunca alterá-lo; não há nenhuma tela nem chamada que a deixe escrever a organização mais tarde; e renomear a produtora é exclusivo de administrador da plataforma. A tela de conta do painel salva o nome de exibição da conta, que é outra coisa. O comentário no código que dizia "a pessoa preenche o perfil dela no painel" descreve algo que hoje não existe.
- **Onde o nome aparece fora do banco:** o convite de assessoria parceira monta o link com o endereço interno na própria URL, e esse link vai por e-mail a um terceiro. *Não* chega ao endereço público `/@handle` — a review mediu isso e o `/@handle` é outro registro, que a pessoa digita e escolhe. Mas o nome pessoal circula em link enviado para fora.
- **Opções:** **pedir o nome da produtora no próprio cartão** — um campo a mais na porta que existe para não ter formulário, e a decisão de produto foi justamente tirá-lo · **adiar o batismo** para o primeiro momento em que ela precisa do nome, já dentro do painel, e aí ela escolhe com contexto — mexe na regra do resgate · **abrir a edição** do registro para a própria dona, o que resolve o nome de exibição mas **não** o endereço interno, que continua definitivo · **deixar como está** e tratar o nome pessoal como padrão aceitável, já que a produtora de uma pessoa só costuma mesmo ser ela.
- **Não há default proposto**, e isso é deliberado: as quatro saídas custam coisas diferentes e uma delas é dado pessoal de titular virando identificador permanente — escolher por você seria escolher a sua exposição.
- **Onde aterrissa:** `promoverParaProfissional.ts` (o campo vazio), `resgatarConviteOrganizador.ts` (o batismo), `cadastrarAssessoria.ts` (o link). Registro completo em `.nirvana/handoffs/leela-retomada-20260808-PONTE-REV.md` §vetor 11.

### PONTE-ELEGIVEL-1 · a porta nova deixa passar duas contas que o código de convite vai recusar

A porta nova recusa, com frase própria, só a conta de administração da plataforma. O resgate do código, mais adiante, recusa bem mais: quem já é organizador, quem é da equipe de alguém, o divulgador, e a ex-organizadora que **você rebaixou de propósito**. As duas últimas não são barradas antes — elas veem a porta, atravessam, esperam o código, e quando o código chega o sistema devolve a recusa genérica, a mesma de "código inválido". *A pessoa que você rebaixou pede o painel, é aceita, espera, recebe o código e ouve que o código não presta.*

- **O que fica com você:** se a porta deve dizer a verdade a essas contas, ou se a recusa uniforme continua valendo até o fim.
- **Por que não é urgente:** hoje essas mesmas pessoas clicam no botão e batem na negativa genérica do cadastro — estão presas **mais cedo** e sabendo menos. A porta nova melhora a situação delas mesmo assim; ela só não resolve até o fim.
- **A tensão, e é ela que faz disto pergunta sua:** a recusa uniforme existe de propósito, pela mesma regra anti-enumeração do LGPD-1 — respostas diferentes para estados diferentes ensinam quem está sondando. Dizer "sua conta não pode" é honesto com a pessoa e é um oráculo a mais para quem está testando o sistema. Aqui o alvo é a **própria conta de quem já está logada**, o que enfraquece bastante o argumento do oráculo, mas não é o maestro que decide isso sozinho.
- **Opções:** **recusar na porta**, com uma frase própria mandando falar com o time — a pessoa para de perder tempo, e ganha-se uma sexta recusa nomeada na chamada (**recomendação da review**, e custa uma mudança de contrato que não deve pegar carona no deploy já pronto) · **deixar seguir e melhorar a frase do resgate** só para quem está logada e é inelegível — resolve o mesmo sem tocar na porta · **deixar como está**, aceitando que uma classe pequena de contas descobre tarde (**default em vigor**).
- **Quem é atingido, medido:** o divulgador e a ex-organizadora rebaixada de propósito. Confirmado que a segunda é alcançável de verdade: rebaixar apaga o vínculo com a produtora, então ela reaparece como participante comum e a porta a convida.
- **Onde aterrissa:** as duas guardas que discordam são `promoverParaProfissional.ts` e `resgatarConviteOrganizador.ts`. Registro completo em `.nirvana/handoffs/leela-retomada-20260808-PONTE-REV.md` §"O que eu trago que ninguém tinha nomeado".

### VITRINE-VEU-1 · o aviso de boas-vindas se anuncia bloqueante e não bloqueia quem usa leitor de tela

A vitrine que subiu em 06/08 mostra o aviso de boas-vindas por cima do painel, com véu escuro e desfoque. O véu funciona **para o mouse**: o ponteiro bate nele e não alcança nada por baixo. Não funciona para mais nada. A tecnologia assistiva não clica com o ponteiro — ela dispara o clique direto no elemento, e esse clique não passa pelo véu. *A pessoa que usa leitor de tela abre o aviso, desliza até o menu, toca em "Marcas", o painel navega, e o aviso continua parado na frente dela como se nada tivesse acontecido.*

- **O que fica com você:** aceitar que o aviso bloqueia só o mouse, ou mandar trocá-lo pelo componente que já existe e bloqueia todo mundo.
- **Medido, não suposto:** com o aviso aberto, oito controles do fundo continuam alcançáveis — os seis itens do menu, o rodapé da sidebar e o botão da própria vitrine. Nenhum deles está `inert`, nenhum está `aria-hidden`, não há trava de rolagem, e o aviso não é portalizado (ele mora dentro do `<main>`). A armadilha de Tab funciona, mas ela só morde se o foco já estiver dentro do aviso — cursor virtual, modo de leitura e o gesto de deslizar do celular não são Tab. Um clique de tecnologia assistiva no menu navegou o painel para `/marcas` com o aviso na tela.
- **A parte que dói mais:** enquanto o aviso está aberto, os ouvintes de interação saem do documento de propósito. Então essa navegação acontece em **silêncio absoluto** — a pessoa mexe no painel inteiro e o aviso nunca responde, que é exatamente o beco que a vitrine veio desfazer.
- **Opções:** **trocar pelo `Modal` do design system** (**recomendação da review**), que já faz portal para o `body`, armadilha de foco cíclica, Esc, trava de rolagem e retorno de foco — é o mesmo componente que as vinte e seis telas do painel usam, e usá-lo obedece a regra de reaproveitar antes de escrever; custa uma passada de ajuste visual porque a moldura do Modal tem cabeçalho e botão de fechar próprios · **marcar o fundo como inerte** sem trocar o componente — mais barato, resolve o alcance e deixa de fora a trava de rolagem e o retorno de foco · **deixar como está**, aceitando que o aviso é bloqueante para mouse e informativo para o resto (**default em vigor**).
- **Uma ponta menor, do mesmo assunto, que não vira item próprio:** o aviso sobe com `Enter` e `Espaço`, e não sobe com as setas de um widget de aba ou de interruptor. Isso hoje não alcança nada — a superfície que a conta em vitrine vê não tem um único widget de tecla própria, medido — e vira pergunta sua no dia em que a vitrine ganhar o primeiro.
- **Onde aterrissa:** `apps/painel/src/routes/onboarding/OverlayConvite.tsx`; RN-510 em [[LEELA-E16-plataforma-superadmin]]. Registro completo, com a medição da árvore de acessibilidade, em `.nirvana/handoffs/leela-retomada-20260808-REV-VITRINE.md` §3 vetor 1.

### VITRINE-CONTRASTE-1 · no tema escuro o cartão do aviso não se separa do próprio véu

Todo o texto do aviso passa AA com folga — o menor par é 4,58:1 num limiar de 4,5, e o anel de foco dá 6,15:1 num limiar de 3. O que não passa é o **limite do cartão**: o painel branco-sobre-escuro do aviso é `#161616`, e o fundo velado atrás dele é `rgb(5,5,5)`. A razão entre os dois é **1,13:1**, e a borda fina não resgata: `--border-subtle` contra o mesmo fundo dá **1,31:1**. A WCAG pede 3:1 para o limite de um componente. *Quem tem baixa visão lê o texto do aviso flutuando no escuro, sem enxergar onde o cartão começa e onde ele termina.*

- **O que fica com você:** se vale mexer numa cor por causa disso, e em qual.
- **Por que é seu e não da review:** as duas cores moram no design system e valem para o painel inteiro. Trocar `--surface-raised` mexe em toda superfície elevada de todas as telas; trocar a borda mexe só neste cartão. Nenhuma das duas é escolha de quem revisa.
- **Só acontece no escuro:** no tema wine o mesmo par dá 5,90:1, porque o cartão é claro contra um fundo escurecido pelo véu. O painel roda no tema brasa hoje, então o número que vale é o 1,13:1.
- **Opções:** **subir a borda do cartão do aviso de `--border-subtle` para `--border-strong`** (**recomendação da review**), que dá 3,82:1 contra o próprio cartão e desenha o limite sem tocar em superfície nenhuma — é uma classe · **clarear `--surface-raised` no tema brasa**, que resolve em todo modal do painel de uma vez e mexe na paleta · **deixar como está** (**default em vigor**), aceitando que no escuro o cartão se dissolve no véu.
- **Onde aterrissa:** `apps/painel/src/routes/onboarding/OverlayConvite.tsx` (opção 1) ou `packages/design-system/themes/` (opção 2). Todos os números, par a par e estado a estado, em `.nirvana/handoffs/leela-retomada-20260808-REV-VITRINE.md` §2.

### SCROLLBAR-1 · a barra de rolagem já obedece ao tema; falta decidir se ela também veste a marca

Você disse que o scroll não estava respeitando o DS no modo escuro, e estava certo: `color-scheme` não existia em ponto nenhum do código, então o navegador assumia o esquema claro e pintava uma barra cinza-clara sobre a interface escura. Isso foi consertado e o conserto nasce no tema, não no app. O que sobra é escolha de marca, e ela é sua: a barra continua sendo desenhada pelo **sistema operacional**, na versão escura dele, ou passa a ser desenhada por **nós**, com token. *Você abre a mesma lista de inscritos no seu Windows e no Mac de alguém e vê duas barras escuras que não são idênticas — é isso que a segunda opção elimina, e é só isso.*

- **O que fica com você:** se a barra escura do sistema basta, ou se ela vira cromo nosso, com cor de token.
- **Por que é sua e não minha:** o conserto do defeito é técnico e já saiu. Vestir a barra é decisão de identidade, do mesmo tipo que escolher a cor de um botão, e o brief desta lane me proibiu de decidir sozinho.
- **Medido, não suposto.** Os candidatos a polegar, com o contraste contra a superfície de cada tema, e o piso de 3:1 que a WCAG pede para elemento de interface não-texto: `--border-default` dá **1,67:1** no brasa e **1,46:1** no wine, e portanto **não serve** — seria trocar a barra clara demais por uma barra que quase não se vê, que é o mesmo defeito ao contrário; `--border-strong` dá **4,13:1** e **3,60:1**, e passa nos dois; `--primary-500`, a barra na cor da marca, dá **5,69:1** no brasa e **10,33:1** no wine. O trilho é o detalhe que ninguém lembra: `--surface-sunken` contra a superfície dá **1,01:1** no brasa, ou seja, trilho nenhum — se a barra for estilizada, o trilho tem de ser transparente ou subir para `--surface-raised`.
- **O que a opção estilizada custa, e não é dinheiro:** estilizar desliga o cromo nativo em vez de conviver com ele. No Chrome, declarar `scrollbar-color` já faz a barra perder o desenho fino e voltar à barra clássica; e `::-webkit-scrollbar`, que é o que atende os navegadores antigos, ignora `color-scheme` por completo. Quer dizer que a preferência de acessibilidade que a pessoa configurou no próprio sistema — barra mais grossa, barra sempre visível, alto contraste — deixa de ser respeitada nas nossas telas. Ganha-se consistência entre plataformas e perde-se a preferência do usuário.
- **Opções:** **barra nativa temada** (**default em vigor, já construído**), que resolveu o seu relato com uma linha no tema, respeita a configuração de acessibilidade de quem usa e fica levemente diferente entre Windows e macOS · **barra estilizada neutra**, polegar em `--border-strong`, mesmo desenho em toda plataforma, 4,13:1 no brasa e 3,60:1 no wine · **barra estilizada na marca**, polegar em `--primary-500`, a barra laranja no brasa e vinho no wine, lembrando que barra de rolagem aparece em toda tela longa e é cromo permanente, não acento.
- **Onde aterrissa:** `packages/design-system/tokens/semantic*.json` e `src/theme/generate.ts`. O contrato de teste em `src/theme/__tests__/color-scheme.test.ts` tem hoje um bloco que trava a ausência de barra estilizada de propósito; escolher a segunda ou a terceira opção reescreve esse bloco junto com a decisão, em vez de contorná-lo.
- **Dá para fechar este item só olhando.** Depois que o conserto subir, abra a lista longa de inscritos no seu Chrome: se a barra escura do sistema já parecer parte da tela, o default fica e o item sai daqui.

### ADMINSEP-2 · o botão da área do cliente leva ao painel do organizador, não ao de plataforma

Ao definir a área do cliente você pediu "um botão para entrar na área de administrador". A frase tem duas leituras e elas mudam o desenho, então prefiro perguntar a presumir: presumir a sua intenção em silêncio foi exatamente o que produziu o erro que você acabou de corrigir. *Você abre a área do cliente e clica no botão: ou ele te leva ao painel de quem produz eventos, ou ele te leva ao painel da plataforma, que você acabou de mandar viver em outra conta.*

- **O que fica com você:** ratificar a leitura, ou trocar.
- **Por que agora:** é uma linha na tela e uma linha na spec agora; depois de construída é retrabalho.
- **Opções:** é a área do **organizador**, e o botão só aparece para quem também é organizador (**default proposto**, porque é a única leitura que produz um botão útil — sob a outra, como o painel de plataforma passa a viver em conta separada, o botão nunca apareceria para um cliente) · é o painel de plataforma, e aí o botão existe mas nasce morto.
- **Onde aterrissa:** RN-451 em [[LEELA-E12-landing]]; task B5 em `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`.

### CONTA-1 · o código de seis dígitos convive com o link do e-mail da compra, ou o substitui

Você pediu um código de seis dígitos para o primeiro acesso, e a spec o escreveu. O que ela não decidiu por você é o destino do caminho antigo. Hoje quem compra recebe um link por e-mail que define a senha, e ele foi construído anteontem à noite. A partir do código, existem duas máquinas capazes de dar uma senha à mesma pessoa. *A Ana recebe o e-mail com o link, ignora, abre o site, clica em "É meu primeiro acesso", recebe um código, e a partir daí duas credenciais válidas para a conta dela estão vivas ao mesmo tempo.*

- **O que fica com você:** dizer se os dois convivem ou se o código passa a ser o caminho único.
- **Por que agora:** o "Não sei minha senha" do modal e o "É meu primeiro acesso" que você pediu viram, sob a spec, a **mesma máquina**. Se for para fundir, é uma linha a menos no rodapé e uma tela a menos para manter. Depois de construídas as duas, fundir é retrabalho.
- **Opções:** **convivem** (**default proposto**) — o link segue no e-mail da compra, que é o caminho que chega pronto sem a pessoa pedir, e o código é a porta de quem chega ao modal sem link que funcione, que é exatamente o buraco do incidente de 04/08 · **o código substitui**, com o e-mail da compra passando a mandar a pessoa pedir um código, o que é mais limpo e recusa a segunda superfície de credencial que a casa proíbe em letra no convite, mas descarta o que a `S1223` acabou de construir (`2d7f24d7`, `6d092619`) e acrescenta um passo a quem hoje resolve em um clique.
- **Onde aterrissa:** RN-476 e RN-481 em [[LEELA-E00-fundacao-tecnica]] e [[LEELA-E12-landing]]; `02-rodadas/2026-08-05-contas-landing/02-spec-contas-landing.md` §Parte 7.

### CONTA-2 · criar conta passa a ter duas portas, e uma delas ainda nem existe

A porta nova de criação de conta nasce na landing. O `/cadastrar` do painel, sob a **RN-461** que você decidiu em 04/08, deixa de criar conta de organizador e passa a criar conta na Leela — que é exatamente o que a porta nova faz. A fila que constrói isso não rodou, então dá para escolher antes de existirem duas. *O Castelo clica em "Criar conta de organizador" no header, é jogado para outro endereço, e preenche o mesmo formulário que a Ana preencheu sem sair do site.*

- **O que fica com você:** uma porta ou duas.
- **Por que agora:** dois formulários criando a mesma coisa divergem na primeira revisão de copy, e a régua de um deles já é a Rule. Decidir agora é ordenar duas filas que ainda não rodaram; decidir depois é migrar cadastro.
- **Opções:** **uma porta, na landing** (**default proposto**) — o `/cadastrar` do painel passa a apontar para ela quando a fila da SPEC-QUALIFICACAO rodar, e o rótulo "Criar conta de organizador" do header sai junto, porque sob a RN-461 ele já está errado · **duas portas**, cada uma na sua origem, o que mantém o organizador entrando por onde ele já entra e deixa em pé a metade que a porta nova fecharia, porque o `/cadastrar` continuaria criando conta sem verificar o e-mail — é o resíduo declarado do POSSE-EMAIL-1, que você fechou em 05/08 e cujo registro está em `02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`.
- **Onde aterrissa:** RN-461 e RN-478 em [[LEELA-E00-fundacao-tecnica]]; `PublicHeader.tsx:74-79`; a onda A de `02-rodadas/2026-08-04-qualificacao-profissional/03-fila-codigo.md`.

### SERV-1 · o piso de R$ 3,00 é 30% da face numa experiência de R$ 10,00

Você fixou o piso do Serviço em R$ 3,00 e disse "a priori". A conta foi feita, e ela morde mais fundo do que a frase sugere: com a linha vigente de 10,5%, **o piso vale em toda compra de até R$ 28,52**, e nesse trecho o percentual efetivo sobe conforme o preço cai. *Uma aula de ioga a R$ 10,00 paga R$ 3,00 de Serviço em vez de R$ 1,05 — e como o modo padrão é a taxa incorporada, quem absorve isso é a professora, que recebe R$ 7,00 no lugar de R$ 8,95.*

- **O que fica com você:** ratificar os R$ 3,00, ou trocar o número. O mecanismo não depende disso — a tabela nasce vazia e nada muda em produção enquanto o valor não for configurado na tela.
- **Por que agora:** a fila que constrói o piso pode subir inteira sem você, mas o dia em que alguém digitar o valor é o dia em que o preço de toda venda pequena muda. Melhor ver a tabela antes.
- **Opções:** **R$ 3,00 como você escreveu** (**default proposto**, porque é o seu número e o efeito está medido) · um valor menor, que encolhe a faixa mordida · um piso **por modo de taxa**, cobrando o piso cheio quando o comprador paga e um menor quando o organizador absorve — mais justo e mais uma regra para explicar.
- **Onde aterrissa:** RN-491 em [[LEELA-E04-config-vendas]]; a tabela de efeito em `02-rodadas/2026-08-05-metricas-e-servico/02-spec-metricas-e-servico.md` §"O piso, em números".

### SERV-2 · numa venda de R$ 2,00 o piso é maior que a venda inteira

Sua frase tratou de taxa pequena, não de venda pequena. Numa venda abaixo de R$ 3,00 com a taxa incorporada, o organizador receberia **valor negativo** — o líquido dele é a face menos o Serviço. Nada no produto sabe representar isso: o clamp em zero existe só uma camada acima, no agregado, e ele esconde a divergência em vez de resolvê-la, fazendo o repasse deixar de bater com a soma das vendas. Hoje nada impede uma venda de R$ 2,00: o único mínimo que existe recusa preço zero. *O Castelo publica um ingresso simbólico de R$ 2,00 para um mutirão, vende trinta, e a plataforma calcula que ele deve R$ 30,00.*

- **O que fica com você:** escolher entre limitar o Serviço ou limitar o preço.
- **Por que agora:** é uma linha de código na aritmética se decidida antes, e uma migração de dado financeiro se decidida depois.
- **Opções:** **o Serviço nunca ultrapassa a face** (**default proposto** e já em vigor na spec) — numa venda de R$ 2,00 o organizador recebe R$ 0,00 e a plataforma fica com os R$ 2,00; nada quebra, mas a venda vira trabalho de graça para ele · **preço mínimo de venda** acima do piso, que resolve na origem e cria uma regra a explicar para quem quiser vender barato · deixar negativo e mostrar como dívida, que eu **recomendo recusar**, porque nenhuma tela do produto sabe desenhar saldo devedor de organizador.
- **Onde aterrissa:** RN-494 em [[LEELA-E09-financeiro-profissional]].

### SERV-3 · até onde vai a palavra "Serviço"

Você escreveu a palavra entre aspas, e a leitura literal tira duas palavras do rótulo, não uma. Isso muda o tamanho do trabalho, porque **o comprador já lê "Taxa de serviço" no checkout** — se o alvo fosse só apagar a marca, o checkout não teria tarefa nenhuma. E há uma segunda pergunta embutida: o painel que **você** opera chama a mesma coisa de "Taxa da plataforma", e ali quem lê precisa distinguir esta cobrança das outras. *A Ana vê "Serviço (PIX) · R$ 3,00" no resumo da compra; você abre `/plataforma/taxa` e vê "Serviço da plataforma" ou "Taxa da plataforma", dependendo da sua resposta.*

- **O que fica com você:** confirmar a leitura literal, e dizer se o super-admin acompanha.
- **Por que agora:** são 34 strings em três aplicações, e trocá-las duas vezes é o desperdício que a pergunta evita. A fila do renome está retida esperando esta resposta.
- **Opções:** **"Serviço" para comprador e organizador, "Serviço da plataforma" no super-admin** (**default proposto**, porque segue a sua letra onde o público é externo e mantém a desambiguação onde o público é você) · "Serviço" em tudo, inclusive no super-admin · manter "Taxa de serviço" para o comprador e trocar só onde diz "Leela", que é a leitura mínima da sua frase.
- **Onde aterrissa:** RN-495 em [[LEELA-E12-landing]]; tarefas 4a, 4b e 4c de `02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`.

### INSCR-1 · o "N inscritos" da página pública acompanha o painel, ou fica como está

Você falou do painel profissional. O mesmo número alimenta a página pública do evento, e lá ele já está lido mas com a exibição suprimida — a prova social ficou desligada numa rodada anterior. Se ela voltar um dia, a pergunta de qual verdade ela conta já está respondida ou ainda não, dependendo de você. *A página do evento diz "já somos 40" contando doze pessoas que geraram PIX e nunca pagaram.*

- **O que fica com você:** dizer se as duas telas contam a mesma coisa.
- **Por que agora:** custa uma linha enquanto a fila da métrica está aberta, e custa uma investigação depois que a prova social voltar.
- **Opções:** **a mesma verdade nas duas telas** (**default proposto** — o número que você acabou de corrigir é o número, e ter duas definições de "inscrito" é como este item nasceu) · a página pública conta todo mundo, porque prova social se beneficia do número maior, o que eu **recomendo recusar** por ser exatamente a distorção que você mandou consertar.
- **Onde aterrissa:** RN-486 em [[LEELA-E03-operacao-evento]]; `apps/landing/lib/leitor.ts:542`.

### CONV-1 · o card de conversão fica em branco ou some

Você estava certo nas duas pontas: o denominador certo é visitantes sobre pagantes, e não contabilizamos visitantes. Fui conferir o quanto: **não existe contagem de visitas em lugar nenhum** — nenhum SDK de analytics instalado, nenhum contador no banco, nada fora dele. O card existe e sempre mostrou um traço. O que ele não deveria estar fazendo é manter o rótulo "visitantes → inscritos" na tela, porque ele promete uma medição que não acontece. *A Marina lê "visitantes → inscritos: —" e conclui que a plataforma mede o tráfego dela e ainda não juntou dados suficientes.*

- **O que fica com você:** escolher o que ocupa aquele quarto da faixa de KPIs até existir denominador.
- **Por que agora:** enquanto o rótulo estiver lá, cada organizador novo aprende a esperar um número que não vem.
- **Opções:** **esconder o card** até haver contagem de visitas (**default proposto**, porque card vazio ensina expectativa errada) · manter o traço com uma frase curta dizendo que ainda não medimos visitas — mais honesto e mais ruidoso · construir a contagem de visitas agora, que é frente própria e não estava no seu pedido; o contrato dela já está escrito para o dia em que você pedir.
- **Onde aterrissa:** RN-489 e RN-490 em [[LEELA-E11-analytics]]; tarefa 4d de `02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`.

### ESTOURO-1 · duas pessoas podem comprar a mesma última vaga, e o painel não avisa

A vaga do lote só é contada quando o pagamento **confirma**. Enquanto duas cobranças PIX estão em voo pela mesma última vaga, as duas passam pela cotação, as duas viram pedido e as duas confirmam: o `webhookPagamento` vira o inscrito sem revalidar lote nem capacidade, e o `virarLote` recomputa `vendidos` sem teto. O contador passa do configurado e a tela esconde, porque o disponível é cortado em zero uma camada antes de chegar aos olhos de quem opera. *A Ana e mais uma pessoa geram PIX para a última vaga do lote promocional do Castelo, as duas pagam, e a Marina abre o painel e lê "20 vendidos · 0 disponíveis · 19 no total", sem nenhuma linha dizendo que alguém entrou a mais.*

Isso **não depende** da ação de desativar lote, que foi por onde o achado apareceu. Basta duas pessoas com PIX pendente para a última vaga. E não é hipótese de código: é o efeito direto da RN-158, que declara que carrinho aberto não segura estoque, encontrando um contador que nunca teve teto.

- **O que fica com você:** dizer se a vaga passa a ser **reservada**, ou se o produto aceita o estouro e apenas o mostra.
- **Por que agora:** o beta começa com eventos pequenos, e é em lote pequeno que a última vaga é disputada. Decidir depois de acontecer significa decidir com uma pessoa já paga e sem lugar na frente de você.
- **A correção mínima entra de qualquer forma, e não é o que você decide.** Hoje o estouro é silencioso nos dois lados: nenhum log, nenhum aviso na tela. Isso vira tarefa na fila independente da sua resposta (RN-498). O que a sua resposta muda é se, **além** de avisar, a vaga passa a ser segurada.
- **Opções:** **reservar a vaga durante a janela do carrinho** (**default proposto**), porque é o que o comprador espera de qualquer loja e é o único caminho que impede a venda dupla em vez de documentá-la — com um custo que prefiro declarar agora: a janela de 15 minutos existe e é do carrinho, que termina quando a cobrança nasce, então a reserva que resolve de verdade tem de viver **da cobrança até o PIX pagar ou vencer**, e hoje o vencimento do PIX só acontece quando alguém chama a função, sem varredura automática; sem esse varredor, um PIX abandonado seguraria a vaga para sempre · **aceitar o estouro e apenas avisar**, que é a correção mínima acima e nada mais: o organizador vê "1 acima do configurado", decide o que fazer e nenhuma compra é impedida · **bloquear a confirmação e estornar**, que eu **recomendo recusar** — o dinheiro já entrou, a pessoa se planejou para a experiência, e devolver o valor não devolve a vaga nem a confiança.
- **Onde aterrissa:** RN-498 em [[LEELA-E04-config-vendas]]; se você escolher a reserva, ela abre delta na RN-158 em [[LEELA-E12-landing]] e frente própria de checkout. Tarefas 2a e 2b de `02-rodadas/2026-08-05-lotes-ux/03-fila-codigo.md`; achado medido em `.nirvana/handoffs/leela-lotes-REV.md` §"Correção exata do #4".

### PARSE-1 · o campo de dinheiro não diz como o sistema lê o ponto, e treze das dezoito mensagens não têm como aparecer

Você decidiu em 05/08 que `1.234` num campo de preço é mil duzentos e trinta e quatro. A decisão está aplicada e no ar, e o custo dela está declarado: quem usa teclado numérico e escreve três casas decimais grava mil vezes mais. O problema é que essa regra hoje mora **só no cabeçalho de um arquivo de código**, e nenhuma tela conta isso a ninguém. A revisão do parser devolveu cinco lugares onde falta texto, e o principal é esse. *O Castelo digita `1.005` querendo um real e meio de kit, o sistema grava mil e cinco reais, e nada na tela dá a ele a chance de perceber.*

- **O que fica com você:** aprovar as cinco frases, ou reescrevê-las. São textos de tela, então é a sua palavra que vale, não a minha.
- **Por que agora:** a regra já está valendo em produção. Cada dia sem a frase é um dia em que a única defesa contra o erro é o organizador conferir o valor gravado por conta própria.
- **As cinco, em ordem de peso:**
  1. **A régua do ponto e da vírgula, embaixo dos cinco campos de dinheiro que a pessoa alcança.** Texto proposto: *"O ponto separa o milhar (1.234 = mil duzentos e trinta e quatro). Para centavos, use vírgula (1,23)."*
  2. **A decisão de tela que destrava as outras mensagens.** Treze dos dezoito campos que carregam mensagem do parser são campo numérico do navegador, e o navegador higieniza o que a pessoa digita **antes** de a mensagem existir: o campo apaga sozinho em vez de explicar. Trocar esses treze por campo de texto com teclado numérico é o que faz a mensagem nova ter para onde aparecer. Pelo colar, vindo de planilha, o conserto já funciona hoje.
  3. **O campo de vaga não diz como se escreve mil.** Dica permanente *"Ex.: 1.000"*, em vez de mensagem só depois do erro.
  4. **Capacidade do kit em branco vale zero e a tela não avisa.** Hoje "0" significa tanto "sem kit disponível" quanto "não configurei".
  5. **O intervalo da automação salva vinte e quatro horas calado** quando o valor é ilegível ou zero. Ou a tela diz *"Sem preencher, a campanha sai 24 horas antes."*, ou ela recusa.
- **Onde aterrissa:** os cinco campos de dinheiro alcançáveis e os treze numéricos do painel; a régua já está escrita no cabeçalho de `packages/core/src/finance/parseValorPtBr.ts`. Medição completa em `.nirvana/handoffs/leela-parse-REV.md` §"Item 6" e §"Para o dono".

### RESPIRO-1 · os vinte pixels de respiro do topo são calibragem, e o olho é seu

Quando a barra superior saiu, sumiram oitenta e nove pixels do alto de toda tela autenticada. As telas que abrem com cabeçalho de página não sentiram, porque o próprio cabeçalho segura o espaço. Sete rotas de produtor abrem com o menu secundário, que não tem folga vertical nenhuma, e passaram a nascer com o texto colado no alto. A review pôs vinte pixels ali, escolhidos por alinhar o texto da aba com o texto do título das telas que têm cabeçalho. *Você abre Eventos ao lado da tela inicial e uma das duas parece torta, sem que nenhum número esteja errado.*

- **O que fica com você:** olhar as duas ao lado e dizer se ficou alto demais, baixo demais ou certo.
- **Por que agora:** é uma linha em duas molduras enquanto for calibragem. Depois que outras telas nascerem em cima desse ritmo, mexer vira varredura.
- **Onde olhar:** `/eventos`, `/eventos/repasses` e as cinco telas de `/crm`, comparadas com `/` e com `/clubes`. As três que mudaram de verdade são as duas primeiras e o CRM; todo o resto da lista está no relatório. Entra no mesmo passeio do item 69.
- **Onde aterrissa:** a moldura das duas áreas do painel. Medição em `.nirvana/handoffs/leela-painel-REV.md` §"O que precisa de olho humano".

### MODAL-1 · editar a modalidade para quando o evento vende, ou já quando ele é publicado

Você pediu para editar as modalidades, e hoje não existe caminho nenhum: a lista nasce na criação do evento e morre lá. O que a sua frase não decide é até quando a edição continua valendo. As Rules já autorizam enquanto o evento não vendeu, e a spec adotou essa fronteira. A alternativa é parar antes, no momento em que o evento é publicado. *O Castelo publica a corrida com "21k" escrito errado, ninguém comprou ainda, e ele quer arrumar sem tirar a página do ar.*

- **O que fica com você:** ratificar a fronteira, ou apertá-la.
- **Por que agora:** é uma condição na Function e uma frase na tela agora; depois de construída, apertar a fronteira invalida telas que já ensinaram o organizador a editar.
- **Opções:** **sem venda**, que é o que a Rule já aplica (**default proposto**, e ele se sustenta em três medições) — `qtdInscritos` conta qualquer status, então uma cobrança PIX viva já fecha a lista antes de qualquer pagamento; quem estiver com o checkout aberto sob o nome antigo tem a compra **recusada**, nunca cobrada errado; e exigir rascunho pioraria exatamente o seu caso, porque você descobre o erro olhando a página pública e despublicar é ação de Function que o organizador pode nem ter · **sem venda e ainda em rascunho**, mais rígido, e que obriga a tirar a página do ar para corrigir um nome.
- **Onde aterrissa:** RN-500 em [[LEELA-E04-config-vendas]]; tarefas 1a e 1d de `02-rodadas/2026-08-05-modalidade-e-kit/04-fila-codigo.md`.

### MODAL-2 · remover uma modalidade que tem lote pode arrastar o lote junto

Remover uma modalidade que ainda tem lote apontando para ela não deixa o lote órfão: deixa o documento **inutilizado**, porque a regra do servidor exige que a modalidade do lote conste da lista do evento, e ela é checada também na escrita que consertaria o problema. A spec por isso recusa a remoção enquanto houver quem aponte, e nomeia cada lote e cada kit que impedem. A alternativa é o botão fazer tudo de uma vez. *A Marina remove "Kids 1k" para limpar a página e leva junto os dois lotes que alguém configurou com preço e data.*

- **O que fica com você:** escolher entre a recusa que explica e a remoção em cascata.
- **Por que agora:** é a diferença entre uma mensagem e um botão destrutivo, e os dois custam o mesmo enquanto nada foi construído.
- **Opções:** **recusar e nomear quem impede** (**default proposto**) — a tela lista os lotes e kits que apontam, o organizador apaga o que quiser apagar, e aí remove; nada some sem alguém decidir por ele · **remover em cascata**, mais confortável e mais destrutivo, porque apagar um lote é apagar preço e janela que alguém configurou, e o botão que faz isso a reboque de outra ação não deixa a pessoa medir o que perdeu · **proibir remover**, que eu recomendo recusar: obrigaria a refazer o evento por causa de uma modalidade digitada errada, que é exatamente a queixa que abriu esta rodada.
- **Onde aterrissa:** RN-502 em [[LEELA-E04-config-vendas]]; tarefa 1c da mesma fila.

### SEMKIT-1 · dois kits em produção estão fora da regra nova, e você não consegue consertá-los pela tela

Você acabou de dizer que a plataforma não vende desconto por dispensar o kit. Existem dois documentos em produção que fazem exatamente isso: um "Sem kit" de **−R$ 15,00** na Meia Floripa 2026 e um de **−R$ 10,00** na São Silvestre 2025. Os dois vieram do seed, não de organizador, e a apuração conferiu o que importa antes de propor qualquer coisa: **ninguém comprou nenhum dos dois**. Zero inscritos apontam para eles, zero pedidos, zero pagamentos — e o modelo de pedido nem tem campo de kit, então não existe caminho para um pedido referenciar um. *Mexer neles não mexe em dinheiro que já entrou.*

- **O que fica com você:** qual dos três reparos, e a autorização para executá-lo em produção.
- **Por que agora:** enquanto os dois documentos existem, a demonstração do produto ensina o contrário do que você decidiu. E há um detalhe de ordem que não pode ser esquecido: o seed de produção já rodou duas vezes, então **a fonte tem de ser corrigida antes do banco**, senão uma terceira execução ressuscita os dois.
- **Um fato que muda a natureza da tarefa:** os dois eventos têm inscritos (462 e 40), e a plataforma congela o preço de kit depois da primeira venda (RN-200). **Você não consegue arrumar isso pela tela do painel** — o campo aparece bloqueado e apagar o kit é negado. O reparo é operação de plataforma, feita como **exceção declarada** à RN-200, e ela só se sustenta porque a medição acima prova que não há comprador para proteger.
- **Opções:** **zerar o preço dos dois** (**default proposto**) — é o movimento mínimo que obedece à regra nova, preserva a opção que as modalidades 5k e 10k já oferecem, não mexe na capacidade derivada do evento e produz exatamente o padrão de saída de que a regra fala · **apagar os dois kits**, que remove configuração e deixa 24 e 8 participantes de demonstração rotulados "Sem kit" sem kit correspondente no evento — não quebra nada, e fica incoerente de olhar · **renomear e neutralizar**, que acrescenta trabalho sem resolver nada que zerar não resolva, porque o nome nunca foi o problema.
- **Onde aterrissa:** RN-509 em [[LEELA-E03-operacao-evento]]; tarefas 2a e 2b de `02-rodadas/2026-08-05-sem-kit/04-fila-codigo.md`. A tarefa da fonte sobe de qualquer forma; só o reparo em produção espera por você.

### SEMKIT-2 · a plataforma garante ao participante uma forma de se inscrever sem kit, ou isso é escolha do organizador

Sua decisão tem uma consequência que prefiro escrever do que deixar você descobrir na tela. Onde a modalidade oferece kits, **escolher um sempre foi obrigatório** — isso já é o código, não muda nada agora. O que fazia a etapa parecer suave é que o "Sem kit" estava dentro da lista, e escolhê-lo satisfazia a exigência. Sem ele, uma modalidade que só tem kits pagos passa a obrigar a compra de um kit para se inscrever. *A Ana quer correr os 5k e não quer a camiseta; se o Castelo não criar um kit de R$ 0,00, ela paga a camiseta ou não corre.*

- **O que fica com você:** se a plataforma **garante** essa saída, ou se ela é escolha de cada organizador.
- **Por que agora:** é uma regra na criação do evento enquanto nada existe. Depois, é migrar evento configurado.
- **Opções:** **é escolha do organizador** (**default proposto**, e ele vem da sua própria frase) — quem quiser abrir a saída cria um kit de R$ 0,00, e quem quiser que todo participante leve o brinde do patrocinador simplesmente não cria; forçar a saída em toda modalidade trabalharia contra a razão que você deu · **a plataforma garante**, exigindo que toda modalidade com kits tenha pelo menos um de preço zero — mais protetor para quem compra, e tira do organizador uma decisão comercial que é dele · **a plataforma sugere**, criando o kit de R$ 0,00 por padrão e deixando apagar, que é o meio-termo e o único que muda o comportamento de eventos futuros sem impedir nada.
- **Onde aterrissa:** RN-508 em [[LEELA-E03-operacao-evento]]. **Não retém tarefa nenhuma** — o default está em vigor; a segunda ou a terceira resposta acrescentariam tarefa na frente 1 de `02-rodadas/2026-08-05-sem-kit/04-fila-codigo.md`.

### SENHA-1 · o e-mail de "esqueci minha senha" já veio para a Brevo — falta você ratificar

⚠️ **Este item mudou de natureza em 04/08 e não é mais escolha entre dois futuros.** Quando ele foi escrito, a opção "trazer para a Brevo" custava um template novo e um caminho de envio próprio. As duas coisas foram construídas na madrugada (lane IDENTIDADE-EMAIL) e **entraram em produção na lane DEPLOY-EMAIL**, junto com a moldura da marca nos oito e-mails: a function `solicitarRedefinicaoSenha` está no ar com a chave da Brevo amarrada, e o painel já a chama. *A organizadora que esquecer a senha hoje recebe o e-mail da Leela, não mais o do Firebase.*

Vale manter registrada a distinção que o item desfez: o e-mail de **primeiro acesso**, o que a pessoa recebe depois da primeira compra, **já era nosso** desde antes. O que saía com template genérico e remetente `noreply@leela-hub.firebaseapp.com` era só o "esqueci minha senha" do painel.

- **O que fica com você:** ratificar — ou mandar voltar atrás. Nada aqui foi decidido no seu lugar; o que aconteceu é que a construção da outra frente atropelou o custo que sustentava o default.
- **Por que agora:** o caminho antigo continua vivo como rede de proteção. Se a callable ficar indisponível, o `enviarResetSenha` cai no envio do Firebase com `actionCodeSettings` — feio é melhor que ninguém conseguir recuperar a conta. Voltar atrás é um deploy, não um resgate.
- **Onde aterrissa:** `functions/src/auth/solicitarRedefinicaoSenha.ts` e `packages/api-client/src/auth.ts`; RN-453 em [[LEELA-E12-landing]].
- **+06/08 · a ratificação continua sua, e o caminho quase não funcionava.** Em 05/08 às 11h43 um pedido real de redefinição morreu em produção. O diagnóstico achou a causa e ela não tem nada a ver com a Brevo nem com a sua escolha: a proteção contra descobrir quais e-mails têm conta está ligada no projeto, e desde então o serviço do Google deixou de responder "conta não existe" — responde sucesso sem entregar o link. A biblioteca do servidor não conhece esse desfecho e lança erro interno, então o ramo escrito para "conta não existe" virou código morto e endereço desconhecido passou a viajar como falha de infraestrutura. Quem **tem** conta continuava sendo atendido normalmente, e é por isso que não houve reclamação. **Duas coisas ficam registradas.** A saída fácil está proibida por escrito: desligar a proteção restauraria o comportamento antigo e reabriria a enumeração da sua base de clientes; o conserto certo é o servidor entender o desfecho novo, e é o que foi feito. E o endereço que pediu não tem conta na Leela e nunca comprou — provado sem PII, casando o balde do limitador contra as dezenove contas, contra todo e-mail de pedido, carrinho, pessoa e tenant, e contra variantes de digitação. **O conserto está em review e não está no ar.** Registro em `.nirvana/handoffs/leela-senha-DIAG.md`.

### QUALIF-2 · a premissa "já temos o CPF" não vale, e você precisa escolher o que entra no lugar

Você tirou o CPF do formulário porque a conta já teria o dado. Fui conferir e **não tem**: quem cria conta pelo `/cadastrar` não tem CPF em lugar nenhum do sistema, e o CPF só existe para quem comprou, pagou, se inscreveu e confirmou o e-mail. A sua leva seguinte quase conserta isso, ao propor CPF como identificador de cadastro, mas aí entra o login social, e nem Google nem Apple devolvem documento. *Um professor de ioga que quer vender a própria aula nunca comprou ingresso de ninguém, então o sistema não sabe quem ele é.*

- **O que fica com você:** dizer se CPF é identificador de **entrada** (você loga com ele) ou só de **identificação** (você informa uma vez, e entra por e-mail ou social).
- **Por que agora:** a resposta decide o desenho da porta, e a porta ainda não subiu. Depois de construída é retrabalho.
- **Opções:** CPF só identifica, e é pedido uma vez no primeiro momento em que trabalha — no checkout para quem compra, na promoção a profissional para quem não comprou (**default proposto**, porque é a única leitura que sobrevive ao login social) · CPF também é credencial de login, e aí ele passa a ser obrigatório na porta para todo mundo, o que exclui quem entra por Apple ou Google e transforma um documento adivinhável em nome de usuário.
- **Onde aterrissa:** RN-464 em [[LEELA-E12-landing]]; spec em `02-rodadas/2026-08-04-qualificacao-profissional/01-spec-conta-profissional.md` §Parte 4.

### QUALIF-1 · o número do CNPJ é pedido quando você cria o painel, ou quando vai receber

Você pediu para perguntar se a pessoa tem CNPJ e, se tiver, pedir o número para criar o painel. A pergunta é barata e útil, e ela entra. O **número** é outra conversa: ele só faz trabalho quando o dinheiro anda, e o produto já o pede nesse momento, no cadastro de recebimento. *A pessoa preenche o CNPJ para abrir o painel, cria três eventos, e o número fica seis meses guardado sem nada acontecer com ele.*

- **O que fica com você:** dizer se o número entra na promoção junto da pergunta, ou fica no cadastro de recebimento.
- **Por que agora:** é um campo a mais ou a menos num formulário que você pediu breve, e o desenho de onde o número fica guardado já está pronto nas duas hipóteses.
- **Opções:** só a pergunta na promoção, e o número no recebimento (**default proposto** — o formulário fica mais curto e o dado chega quando serve) · a pergunta e o número na promoção, e aí o número vai para um subdocumento de leitura restrita, nunca para o documento que a equipe do tenant lê.
- **Onde aterrissa:** RN-465 em [[LEELA-E09-financeiro-profissional]].

### QUALIF-3 · até onde vai o rebatismo para Painel Profissional

Você batizou o painel e eu concordo com o nome, com um argumento a mais do que o seu: a coleção do banco já se chama `profissionais` desde o começo, então a troca alinha a tela ao modelo, em vez de inventar vocabulário. O nome aparece em três alturas e elas custam coisas muito diferentes. *Trocar o nome do diretório e do pacote produz um diff enorme e não muda uma letra do que você vê na tela.*

- **O que fica com você:** dizer se a troca para no que se vê, ou vai até o nome técnico.
- **Por que agora:** o rebatismo tem de entrar no mesmo lote da porta de entrada, porque toca os mesmos arquivos. Separado, custa duas vezes.
- **Opções:** só o rótulo visível — título, sidebar, telas de entrada e os botões da landing (**default proposto**: cobre quase toda a percepção e "organizador" continua correto como papel de quem produz eventos) · também o identificador técnico, renomeando diretório, pacote e variáveis, o que é caro e invisível.
- **Onde aterrissa:** RN-468 em [[LEELA-E01-design-system]]; inventário completo na spec §Parte 9.

### QUALIF-4 · "fluxo de referência" era exemplo a copiar, ou programa de indicação

Você citou a Cheers como bom fluxo de referência e emendou com e-mail, CPF e login social. A frase tem duas leituras e eu não quis escolher por você: *fluxo de exemplo*, algo que vale copiar, ou *programa de indicação*, o indique-um-amigo. *A primeira leitura já está especificada; a segunda é um épico que ninguém abriu.*

- **O que fica com você:** uma palavra.
- **Por que agora:** se era indicação, é escopo novo e entra na fila; se era exemplo, não há nada a fazer.
- **Opções:** era exemplo de fluxo de entrada (**default assumido**, porque a frase segue falando de cadastro e login) · era programa de indicação, e aí abre frente própria.
- **Onde aterrissa:** nada hoje. Se for indicação, nasce história nova.
- **+05/08 · você citou a Cheers de novo, e desta vez sem ambiguidade.** "Se tiver dúvidas, simule o fluxo da cheers", dito no meio da conversa sobre primeiro acesso e criação de conta, é *fluxo de exemplo* na letra. O default assumido fica confirmado pelo uso, e você segue podendo abrir a outra frente quando quiser. **A pesquisa foi feita, e ela devolveu uma coisa que muda o registro:** a recuperação da Cheers é **link por e-mail**, não código, e nenhuma fonte pública diz quantos dígitos ela usa. Quem documenta seis dígitos, com quinze minutos de prazo, é a **Sympla**. Os seis dígitos que você pediu são decisão sua, não cópia verificada, e ficaram escritos assim para que ninguém os defenda depois com uma autoridade que a pesquisa não dá. Duas coisas da Cheers valeram: a conta de organizador lá **não é conta separada** (é uma página criada por cima de uma conta pessoal, que é exatamente a RN-461 que você decidiu em 04/08), e o aceite dos termos lá é **tácito**, que é onde a casa não pode seguir. Detalhe com fonte e data em `02-rodadas/2026-08-05-contas-landing/02-spec-contas-landing.md` §Parte 2.

### QUALIF-5 · o Apple Sign-In depende de uma conta que só você abre

O login com Google e com Apple já está escrito no código e nenhuma tela usa. Ligar o Google é trabalho de tela. Ligar a Apple exige Apple Developer Account com App ID e Service ID, uma chave `.p8` registrada no Firebase e verificação de domínio. *Sem as chaves, o botão da Apple aparece e lança erro na cara de quem clicar.*

- **O que fica com você:** abrir a conta e gerar as chaves, ou dizer para subir só o Google agora.
- **Por que agora:** a Apple exige o botão dela para publicar app na App Store, então a conta vai ser necessária de qualquer forma. Antecipar evita subir a porta duas vezes.
- **Opções:** subir Google agora e Apple quando as chaves existirem (**default proposto** — botão que quebra é pior que botão ausente) · segurar os dois até a Apple estar pronta.
- **Onde aterrissa:** `packages/api-client/src/auth.ts`, cujo cabeçalho já lista as três pendências; RN-463 em [[LEELA-E00-fundacao-tecnica]].

### DEPLOY-1 · a porta de entrada do organizador está pronta e não está no ar

O pacote inteiro foi construído, revisado por antagonista em contexto fresco e está verde: cadastro aberto, tela de convites no super-admin, resgate atômico, overlay bloqueante e o roteamento pós-login que você ratificou. Nada disso foi para produção. *Você abre o site hoje e não existe onde um organizador novo clique para entrar.*

- **O que fica com você:** dizer quando sobe.
- **Por que agora:** subir abre publicamente a entrada do organizador na landing e o cadastro aberto. Duas coisas pesam na conta e nenhuma delas é bloqueio: o veto **LGPD-1** acima está aberto, mas ele só se materializa no resgate de convite, e **nenhum convite foi semeado em ambiente nenhum** — a porta sobe fechada na prática; e a borda volumétrica (App Check e Cloud Armor desligados) vale para o cadastro aberto, que é o que fica exposto.
- **Opções:** subir agora com o seed retido — **é a recomendação do maestro**, porque a jornada fica inalcançável sem convite e o roteamento pós-login já corrige em produção um destino que hoje erra · esperar a decisão LGPD-1 antes de qualquer deploy · subir só o roteamento pós-login e segurar a entrada na landing.
- **Onde aterrissa:** deploy de `apps/painel`, `apps/landing`, `functions` e das Rules do Firestore, a partir dos commits `d0b7cd49..37b9ec94`. A recomendação está registrada como recomendação; nada foi executado.
- **+06/08 · metade subiu sem que este item fosse respondido, e a outra metade continua fechada.** O deploy de 05/08 pôs o painel e a landing em dia, então as **telas** desta frente estão no ar: o cadastro aberto, a tela de convites no super-admin e o overlay bloqueante. O que **não** subiu é a máquina: nenhuma das três funções de convite estava no conjunto das vinte e uma deployadas, e das três só uma existe no código — as outras duas nunca foram escritas. A porta de resgate segue devolvendo 404 em produção, provado com controle positivo em 04/08. **Na prática o estado é o que a recomendação deste item propunha**: a entrada existe na superfície e a jornada é inalcançável sem convite, e nenhum convite foi semeado em ambiente nenhum. O que continua sendo seu é dizer se a máquina sobe, e o **LGPD-1** continua sendo o que segura o seed do primeiro código.
- **+05/08 · NOTA, não decisão: o código do convite de organizador era previsível, e foi corrigido antes de qualquer convite existir.** O convite tem oito caracteres e provisiona um tenant para quem o apresentar, sem amarração ao e-mail do convidado — é credencial ao portador. Ele era sorteado com o gerador do navegador, cujo estado interno é recuperável a partir de poucas saídas consecutivas, e o sorteio acontece **no cliente**, onde qualquer um observa quantas saídas quiser: prever ali não é ser atendido como outra pessoa, é abrir um tenant. Corrigido em `20a9c904`, com o formato intacto. **Por que isto é nota e não pergunta:** códigos emitidos **antes** da correção continuariam previsíveis, e revogá-los seria juízo seu — mas não existe nenhum. Conferido no repositório: os únicos convites de organizador que já foram escritos são os dois do ambiente de desenvolvimento, com códigos **fixos e legíveis de propósito** (`LEELA234` e `LEELA567`), atrás de uma trava que impede o seed de rodar contra produção; a tela que gera códigos de verdade vive no painel, que não está no ar; e a porta de resgate foi provada em 404 em produção, com controles positivos, na lane de deploy de 04/08. **Nenhum convite foi semeado em ambiente nenhum**, que é a mesma frase que já sustentava a recomendação deste item — agora ela também quer dizer que não há nada a revogar. **O que fica registrado com honestidade:** os outros dois geradores corrigidos no mesmo commit — o convite de clube e o código de indicação do afiliado — **têm** códigos emitidos antes da correção, onde quer que tenham sido emitidos, e esses continuam previsíveis. Nenhum dos dois provisiona tenant nem concede papel, então nenhum é escalada de privilégio; se alguma hora você quiser reemitir, é gesto de operação e não de código.

### 12 · domínio público

Todo endereço do produto ainda é o marcador `{DOMINIO_LEELA}`, e o remetente definitivo do e-mail depende dessa escolha. *O Castelo quer divulgar a página do evento no Instagram e o endereço de hoje nasce para quebrar.*

- **O que fica com você:** cravar o domínio público da Leela.
- **Por que agora:** o produto já está no ar em `leela-landing.web.app` e o e-mail transacional sai por `vitoreldp@gmail.com`, que o DMARC do Gmail tende a jogar em spam quando a Brevo envia por ele.
- **Onde aterrissa:** env dos dois apps, substituição do marcador nas specs e verificação DKIM/SPF/DMARC na Brevo. Puxa junto o item 66 e o placeholder `contato@leela.app`, que a porta de entrada do organizador já usa como CTA de "Falar com o time Leela".

### 66 · o botão "Ver página pública" aponta para um domínio de terceiro quando falta configuração

O link que o afiliado copia já está resolvido: sem endereço configurado ele não sai, e a tela diz isso. O botão de navegação interna do organizador continua com `be-hero.com.br` cravado como último recurso, o mesmo domínio que você expulsou do e-mail da compra. *Você abre um ambiente novo para um teste, clica em "Ver página pública" e cai no site de outra empresa.*

- **O que fica com você:** ratificar a retirada do domínio do código.
- **Por que agora:** em produção a configuração existe e o botão vai para o lugar certo; o risco é o ambiente novo que nascer sem ela, e a porta de entrada do organizador cria ambientes agora.
- **Opções:** o botão declara que o ambiente não tem endereço configurado, o que é uma linha (**default proposto**) · manter o fallback fixo.
- **Onde aterrissa:** `PUBLIC_BASE` em `apps/painel/src/lib/linkPublico.ts`. Some junto com o item 12.

### PB-11 · no retry, a prova de aceite carimba a versão que a pessoa não leu

A conferência de versão vale na criação do pedido: se a tela declara uma versão diferente da vigente, o servidor recusa. No retry de uma compra já nascida, o carimbo usa a vigente sem conferir a exibida, e isso está medido: pedido sem bloco de aceite, política na v3, retry declarando a v1, resultado carimba a v3. *A Ana aceita a v1, a política vira v3 no meio da compra, e o retry carimba a v3 que ela nunca leu.*

- **O que fica com você:** escolher entre prova ausente e prova errada. Recusar ali deixaria sem prova um pedido já pago.
- **Por que agora:** é decisão jurídica, não técnica, e o caso de teste já está escrito no ponto exato onde a decisão vira código.
- **Opções:** carimbar a vigente e manter a compra viva (**em vigor**) · recusar o retry divergente e ficar sem prova nesse pedido.
- **Onde aterrissa:** `aceitesVersaoExibida.integration` e o caminho de replay de `createInscricaoCharge`.

### VITRINE-1 · nada impede publicar um evento sem preço, e dois estão assim agora

`publicarEvento` confere nome, data, local e modalidades. Preço não entra na conta, em modelo nenhum. `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` estão publicados em produção sem lote **e** sem percursos — o servidor recusa a venda tanto quanto a página. Não é a vitrine discordando do servidor: os dois concordam que não há o que cobrar. *O Castelo publica o evento, o painel diz "Publicado" em verde, e a página responde "Inscrições encerradas" para todo mundo que chega pelo Instagram.*

- **O que fica com você:** decidir se publicar passa a exigir preço.
- **Por que agora:** a lane VITRINE-FIX reconciliou a régua da página com a do servidor e entregou o alerta ao organizador, mas manteve deliberadamente a porta aberta — fechá-la muda o produto. `criarEvento` exige percursos e não cria lote nenhum, então exigir lote para publicar tornaria todo evento novo impublicável até alguém descobrir a aba Lotes.
- **Opções:** manter livre e confiar no alerta crítico novo do painel (**em vigor**) · exigir ao menos um preço para publicar, o que pede migração dos dois eventos e revisão do fluxo de criação.
- **Onde aterrissa:** `camposFaltantesParaPublicar` em `functions/src/eventos/publicarEvento.ts`. O handoff `.nirvana/handoffs/leela-build-2d6ee98d-VITRINE-FIX.md` tem o custo dos dois caminhos.

### VITRINE-2 · os dois eventos sem preço seguem publicados e visíveis

Consertar código não os faz vender: falta dado. Enquanto ninguém cadastra preço, os dois continuam no ar dizendo que as inscrições acabaram. *Quem chega neles hoje conclui que a plataforma está quebrada.*

- **O que fica com você:** cadastrar preço nos dois ou tirá-los do ar até que alguém cadastre.
- **Por que agora:** são 60 e 28 inscritos já contabilizados, então despublicar tem efeito visível e não é decisão de máquina.
- **Opções:** cadastrar lotes e deixar vender · despublicar até ter preço · deixar como está.
- **Onde aterrissa:** dado de produção. A lane não tocou em nada — a apuração inteira foi leitura.

### ARENA-1 · quem vê o que a pessoa preencheu na Arena Social

Você pediu a Arena Social — mini bio, gênero, gêneros de interesse (pessoas e experiências), interesses nos pilares de bem-estar e a foto da conta. A frase não diz quem vê, e visibilidade é a diferença entre um formulário e uma rede. *A Ana preenche a mini bio e os interesses; ou só ela vê (e a área ainda não conecta ninguém), ou outros participantes veem (e o produto precisa dizer isso a ela antes de ela preencher).*

- **O que fica com você:** dizer quem vê o perfil da Arena.
- **Por que agora:** a resposta desenha as Rules e as telas antes de virar código; mudar visibilidade depois de dado preenchido é retrabalho com dado de gente real.
- **Opções:** só a própria pessoa vê, e a abertura para outros participantes vem depois, junto da feature de conexão (**default proposto** — o dado nasce guardado e nenhuma promessa é feita antes da hora) · participantes de uma mesma experiência veem o perfil de quem optou por aparecer · organizador da experiência também vê. Em qualquer opção, o campo de gêneros de pessoas segue a régua própria da RN-472 e **nunca** fica visível por default.
- **Onde aterrissa:** RN-471 e RN-472 em [[LEELA-E12-landing]]; S1226 em `02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`.

### ARENA-2 · a lista dos pilares de bem-estar não existe em documento nenhum

Você pediu interesses "dentro dos pilares de bem-estar", e nenhum doc do repositório define quais são os pilares. O vocabulário mais próximo é a lista de modalidades do clube (corrida, trail, yoga etc.), que é outra coisa. *A tela de interesses precisa de uma lista para mostrar, e inventá-la dentro de uma task viraria vocabulário de produto decidido por ninguém.*

- **O que fica com você:** cravar a lista, ou editar a proposta.
- **Por que agora:** a mesma lista serve os interesses da Arena e a categorização de experiências da home que você avisou que vai mexer (D-0802-1). Nascer uma vez, num lugar só, evita duas listas divergindo.
- **Opções:** a esteira propõe uma lista curta a partir do posicionamento hub de bem-estar — movimento, mente e meditação, natureza e outdoor, comunidade, nutrição, descanso e retiro (ilustrativa) — e você corta e acrescenta (**default proposto**) · você entrega a lista pronta.
- **Onde aterrissa:** RN-471 em [[LEELA-E12-landing]]; spec §Parte 3 em `02-rodadas/2026-08-04-pos-pagamento/02-spec-pos-pagamento-e-arena-social.md`.

### ARENA-3 · onde a Arena Social mora — na área do cliente, ou no perfil social do E17

O default adotado é que a Arena Social é uma **seção da área do cliente**: você a descreveu no mesmo fôlego dela, e "os dados da pessoa" já moram lá. O registro honesto: o E17 (perfil social) já especifica um perfil público de link-in-bio com mini bio e foto, e os campos se sobrepõem. *Construir as duas sem decidir a relação produz duas bios e duas fotos da mesma pessoa, editadas em lugares diferentes.*

- **O que fica com você:** ratificar o default, ou mandar a Arena ser a fatia privada do perfil social.
- **Por que agora:** é uma frase agora; depois de construída, é migração de dado.
- **Opções:** seção da área do cliente, com dados próprios e privados, e a convergência futura mapeada — a bio e a foto podem alimentar o perfil público depois, nunca o contrário automático (**default proposto**) · fatia do perfil social E17, o que obriga a decidir o público×privado de cada campo desde já.
- **Onde aterrissa:** RN-471 em [[LEELA-E12-landing]]; nota de fronteira no [[LEELA-E17-perfil-social]].

### CRM-1 · quais visões entram na primeira leva do CRM

Você perguntou que outras informações estratégicas o painel CRM podia mostrar ao organizador. A varredura achou dez visões possíveis e mediu o custo de cada uma; seis saem de dado que já está no banco, quatro dependem de coleta ou de destravar outra coisa. A ordem proposta não é por sofisticação, é por quanto cada uma muda uma decisão que o Castelo toma de verdade. *O Castelo abre o CRM e vê perfil de idade e sexo; o que ele precisava saber era se o link do Téo trouxe venda nova ou só comissão sobre venda que ele já teria feito.*

- **O que fica com você:** dizer quais entram na primeira leva. Este é veto de escopo, não de mecanismo — cada visão recusada continua escrita e volta quando você quiser.
- **Por que agora:** cada visão é um agregado mantido por Function, e agregado é barato de nascer e caro de aposentar. Escolher quatro agora custa menos que construir dez e descobrir que três ninguém abre.
- **Opções:** as quatro que saem de dado pronto e não pedem nada a ninguém — **de onde veio a venda** (cupom, afiliado, direto, com a comissão de cada canal), **distribuição geográfica**, **quem pagou e não apareceu** e **como o seu público paga** (PIX contra cartão, e em quantas parcelas) — deixando recorrência, funil e motivo de estorno para a leva seguinte (**default proposto** — é o corte que entrega dinheiro e logística primeiro, e nenhuma delas pede um campo novo) · a lista inteira das construíveis de uma vez, que é mais trabalho num lote e adia a primeira entrega · só a geografia, que foi o que você pediu por nome, e o resto espera.
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 2; fila em `03-fila-proposta.md` Frentes 1 e 3. As regras nasceriam em [[LEELA-E19-crm]] e [[LEELA-E11-analytics]].

### CRM-2 · a localização entra como agregado, e o endereço continua fora da ficha do cliente

Você perguntou se dá para fazer algo com localização e endereço. Dá, e o dado já está inteiro no banco desde o checkout novo: CEP, rua, bairro, cidade e UF, persistidos por pedido. O que existe é uma premissa escrita reservando essa decisão para você — a **P-CKMOD-1** diz que endereço nunca entra no doc do cliente e que incluí-lo "exige decisão explícita do Vitor registrada aqui". A pergunta de hoje é exatamente ela, dezoito dias depois. *A Marina quer saber de que bairros vem o público para escolher onde montar o balcão de retirada de kit; ou ela vê a contagem por bairro, ou ela vê o endereço da Ana na ficha dela — e as duas coisas são muito diferentes.*

- **O que fica com você:** autorizar a contagem agregada por cidade e bairro, e dizer se o endereço passa também a aparecer na ficha individual do cliente.
- **Por que agora:** o desenho do agregado muda conforme a resposta, e ele nasce com Rules próprias. Mudar depois de existir contagem é reprocesso; mudar depois de existir endereço em ficha é dado de gente real que saiu e não volta.
- **Opções:** **agregado sim, ficha não** (**default proposto** — a contagem por cidade e bairro nasce no mesmo molde da demografia, sem identidade, com a mesma supressão de privacidade do cohort, e a premissa P-CKMOD-1 continua valendo para a ficha) · agregado e ficha, o que dá ao organizador o endereço de cada pessoa numa área que hoje não tem controle de papel — eu **recomendo recusar**, porque é o mesmo desenho que o P-IAMENU-1 já registrou como buraco · nada, e a pergunta fica respondida com "temos o dado e escolhemos não usá-lo".
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 3; tarefas 2a a 2d em `03-fila-proposta.md`. A premissa P-CKMOD-1 vive em [[LEELA-E19-crm]] e é ela que muda de estado.
- **Duas coisas que a resposta não decide e você precisa saber.** O endereço é do **comprador**, uma vez por pedido, nunca por participante — quem compra quatro ingressos dá um endereço, então o mapa descreve de onde vem o dinheiro, não de onde vem a gente. E a **distância até o local do evento não é calculável**, porque o evento não tem endereço estruturado: `local` é texto livre e não existe coordenada em lugar nenhum. Estruturar o endereço do evento é tarefa própria, vale por si (mapa na página pública, endereço certo no ingresso, busca por proximidade na vitrine) e não espera este item.

### CRM-3 · o e-mail que já pedimos a cada participante é jogado fora

Este item não escolhe entre dois futuros: ele conserta uma coisa que ninguém decidiu. O checkout exibe um campo de e-mail para **cada** atleta, obrigatório, a pessoa preenche, o payload envia, o servidor valida — e a gravação monta o bloco de dados pessoais com CPF, nascimento, gênero e telefone, sem e-mail. O campo nunca existiu no modelo, e a esteira herdou o buraco como se fosse regra. *A Ana compra quatro ingressos para a família e digita o e-mail dos quatro; o Castelo consegue falar com uma pessoa, a Ana, e as outras três são invisíveis para qualquer campanha dele.*

- **O que fica com você:** autorizar guardar esse e-mail. É expansão do que se guarda sobre alguém que não é o comprador, então é sua, e não da esteira.
- **Por que agora:** custo de atrito **zero** — o campo já está na tela e já é obrigatório; ninguém digita nada a mais. E há um efeito colateral bom que some se a decisão demorar: a chave que une o mesmo cliente entre os seus eventos tenta CPF, depois e-mail, depois um identificador de sessão; sem e-mail, todo participante que não comprou cai no último recurso e vira cliente novo a cada evento.
- **Opções:** guardar, com a mesma disciplina de minimização do resto do bloco (**default proposto** — é o maior retorno sobre esforço de toda a proposta, e o dado já foi coletado com a pessoa vendo o que digitava) · não guardar, e aí vale tirar o campo do checkout, porque pedir um dado obrigatório e descartá-lo é pior que não pedir · guardar só com uma frase explícita na tela dizendo para que serve, o que é mais honesto e custa uma linha.
- **Onde aterrissa:** tarefa `COL-T1` em `02-rodadas/2026-08-05-crm-estrategia/03-fila-proposta.md`; o campo nasceria em `packages/core/src/eventos/dadosPessoais.ts` e a regra em [[LEELA-E19-crm]], ao lado da RN-172.

### CRM-4 · o que se pede ao participante depois da compra, e em troca de quê

A segunda metade da sua pergunta foi sobre os campos que incentivamos as pessoas a responder com o tempo. A resposta curta da esteira é que **nada novo entra no checkout** — ele é a única tela onde o dinheiro entra, e cada campo a mais é venda perdida. O que existe é uma escada para fora dele, e ela precisa de você porque cada degrau é uma promessa feita a quem responde. *A Ana acabou de pagar e está na tela de confirmação com o ingresso na mão; é ali que confirmar o endereço de entrega custa quase nada, e é ali que perguntar a renda dela seria uma invasão.*

- **O que fica com você:** dizer até que degrau a gente sobe, e qual contrapartida é dita em voz alta.
- **Por que agora:** a tela de pós-pagamento e a área do cliente acabaram de nascer, e o FormBuilder é a próxima frente da fila. Decidir agora faz os pedidos nascerem no lugar certo em vez de virarem campo avulso depois.
- **Opções:** **degraus 1 e 2 agora** (**default proposto** — degrau 1 é conserto sem atrito nenhum: guardar o e-mail que já se pede, guardar o código de município que o consultor de CEP já devolve e a gente descarta, e copiar cidade e UF do endereço quando o participante é o próprio comprador; degrau 2 é a confirmação logo depois da compra, com contrapartida imediata e verdadeira — "confirme para o kit chegar certo") · subir também o degrau 3, o perfil de interesses, que é a Arena Social e depende dos vetos ARENA · subir tudo, incluindo a pergunta de satisfação depois do evento, que depende do canal de e-mail travado na chave do Brevo.
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 7; tarefas `COL-T2` e `V2-T3` em `03-fila-proposta.md`.
- **O que a esteira recusa pedir, em qualquer degrau:** renda, profissão, estado civil e número de filhos. São os campos que todo formulário de evento pede, que nenhum organizador abre depois, e que cada um obriga a guardar, justificar e expurgar dado pessoal sem que nenhuma decisão melhore.

### CODPED-1 · o prefixo do número da compra

Você pediu prefixo e cinco dígitos, e o resto da conversa é engenharia — onde o código nasce, como a unicidade é garantida, o que acontece com as compras antigas — e já está decidido, com as alternativas rejeitadas escritas. Sobra o prefixo, e ele volta para você por um motivo só: **é a única parte que o cliente lê.** *A pessoa recebe o e-mail da compra e encontra dois códigos ali dentro: o do ingresso dela, `T93N7F`, e o da compra. O prefixo é o que faz um não ser confundido com o outro no instante em que ela olha.*

- **O que fica com você:** ratificar `PED-` ou trocar por outra coisa. Este é veto leve: o default já vale e a construção não espera resposta.
- **Por que agora:** para você responder junto do resto, não porque trave alguma coisa. Trocar depois custa uma constante e um redeploy — o código é gravado sem o prefixo justamente para que a sua opinião continue barata, inclusive depois de construído. E-mail antigo com o prefixo velho continua encontrando a compra, porque a busca ignora o prefixo.
- **Opções:** `PED-` (**default proposto** — é o que "pedido" vira em três letras, e nenhuma outra coisa no produto começa assim) · `LEE-`, que assina a plataforma em vez do objeto e fica igual em compra, ingresso e qualquer coisa futura, o que devolve a confusão que o prefixo existe para evitar · sem prefixo, e aí os dois códigos do e-mail viram duas sequências parecidas, uma de cinco e outra de seis símbolos, distinguíveis só pelo rótulo ao lado.
- **Onde aterrissa:** RN-474 em [[LEELA-E12-landing]]; spec em `02-rodadas/2026-08-04-pos-pagamento/06-spec-codigo-pedido.md`.
- **+05/08 · o código está construído e o `PED-` continua custando uma constante.** A review antagonista provou o que a spec prometia: o código é gravado sem prefixo, e ele vive num lugar só. Uma coisa mudou por decisão técnica do maestro e **não é juízo seu**, mas fica registrada porque mexe numa doutrina escrita: os dois códigos legíveis da casa — o da compra e o do ingresso — deixaram de ser sorteados por `Math.random` e passaram a usar a entropia do sistema. O motivo é a 5d: o operador busca **qualquer** código que lhe ditarem, e o gerador antigo permitia prever os próximos a partir do próprio. Zero mudança de formato, e a injeção continua existindo para teste. Honestidade da medição: a lane do backfill descobriu depois que a troca **ainda não chega ao caminho da venda** — a cadeia do checkout passa o sorteador antigo explicitamente, então compra nova continua com o gerador previsível até um conserto de três linhas entrar. Está na fila técnica como RS1-8, não é decisão sua, e nada disso está no ar de qualquer forma.
- **+05/08 (madrugada) · aquele "ainda não chega" acabou, e o buraco era três vezes maior do que a medição inicial mostrou.** O conserto do caminho da venda entrou (`61776052`), e aí a mesma varredura achou o **mesmo** padrão em mais dois lugares: no código do **ingresso** (`8d779dce`) e nos três geradores do núcleo — convite de organizador, convite de clube e código de indicação do afiliado (`20a9c904`). O modo de falha era sempre o mesmo e vale a frase: trocar o sorteador de um gerador não muda nada enquanto alguém continuar passando o antigo por cima, e **o último a falar vence**. A varredura final do repositório inteiro devolve **zero** geradores previsíveis. Continua não sendo decisão sua e continua não estando no ar; fica registrado porque o parágrafo acima descrevia um estado que deixou de existir.

### PEDLIST-1 · o comprador passa a poder listar as próprias compras, atravessando produtoras

A abertura da RN-469 autoriza por campo, e regra por campo autoriza **consulta**, não só a leitura de um documento que já se conhece pelo endereço. A review antagonista mediu isso e confirmou: quem comprou pode pedir "todas as compras minhas" e receber a lista, de todas as produtoras de uma vez. Só as dele — o teste de ataque prova que documento de terceiro não entra na resposta. A capacidade é útil e é exatamente a que Meus Pedidos vai usar; ela só não estava escrita em lugar nenhum, e capacidade que ninguém escreveu não deveria estrear em silêncio. *A Ana comprou no evento do Castelo e num retiro de outra produtora; com uma consulta só ela recebe as duas compras, sem nunca ter entrado em nenhum dos dois painéis.*

- **O que fica com você:** manter a listagem, ou estreitar a abertura para um pedido de cada vez e deixar a lista nascer só com a área do cliente.
- **Por que agora:** é a consulta que a S1222 vai fazer, e é uma linha nas Rules enquanto ninguém depende dela. Estreitar depois de a área do cliente estar construída custa a área do cliente.
- **Opções:** manter (**default proposto** — o dado é dele, atravessar produtoras é o que faz a área do cliente ter sentido, e nenhum dado de terceiro entra na resposta) · estreitar para leitura por endereço, e a lista passa a ser servida por callable junto da S1222, como já acontece com inscritos e pessoas (RN-451) — mais fechado, e uma porta a mais para construir e manter.
- **Onde aterrissa:** RN-469 em [[LEELA-E12-landing]]; `firestore.rules` e a S1222-T1 na fila `02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-S1225.md`, vetor 1.

### PROJPED-1 · todo campo novo no documento da compra nasce visível ao comprador

Este item não escolhe entre dois futuros: ele carimba uma regra que já está valendo, porque ela restringe o que a esteira pode fazer daqui para frente e isso não deveria ficar por conta de quem lembrar. As Rules do Firestore autorizam **documentos**, não seleção de campos — filtrar coluna não existe ali. Então, desde a RN-469, qualquer campo que alguém grave no pedido passa a ser lido pelo comprador no mesmo instante, sem decisão nova e sem aviso. A regra que fecha o buraco: campo novo em `pedidos/{id}` nasce público ao comprador, e estado operacional interno mora em extrato ou subcoleção que só o servidor lê. *A Marina reenvia o e-mail de uma compra pelo painel; o registro desse reenvio não pode virar campo do pedido, senão a Ana passa a ler o vocabulário interno do atendimento na tela dela.*

- **O que fica com você:** ratificar a regra, ou dizer que campo interno pode conviver no documento desde que nenhuma tela o exiba.
- **Por que agora:** ela já foi aplicada uma vez, em 05/08, quando as duas reviews desta rodada divergiram sobre dois campos e a decisão foi tirá-los do documento que o comprador lê. Ratificar transforma um precedente em critério; sem isso, a mesma discussão renasce a cada campo novo.
- **Opções:** ratificada, com o teste campo a campo da review antagonista como o lugar onde a conta é feita a cada entrega (**default em vigor**) · conviver e confiar em não exibir, que a casa recusa por princípio já registrado: tela não é fronteira de segurança, Rule é.
- **Onde aterrissa:** nota durável ao lado da RN-469 em [[LEELA-E12-landing]]; a reconciliação que a originou está em `02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`, e o teste vive em `functions/src/__tests__/pedidoProprioRulesAntagonista.integration.test.ts`.

### REENVIO-PARCIAL-1 · o reenvio manual no meio da espera entrega meia lista e fecha o chamado

Quando um pedido pago tem um inscrito que ainda não confirmou, o caminho automático agora **segura** o e-mail e abre uma pendência — foi o conserto de 05/08, e ele existe porque a chave do e-mail da compra é de uso único e não tem volta. O reenvio manual do painel não segue a mesma régua, e isso é deliberado: ali nenhuma chave é gasta e um operador pediu explicitamente. A consequência é que ninguém tinha declarado: o inscrito que ainda espera simplesmente **some** da conta, então o reenvio devolve "enviado" ao operador com a pendência aberta, entrega ao comprador uma lista pela metade e carimba o pedido como entregue. Nada no retorno diz "parcial" — o único sinal é a contagem de ingressos ser menor que a de inscritos. *A Ana compra dois ingressos, um dos participantes fica pendurado num acerto manual, ela liga reclamando; a Marina clica em "reenviar", a tela responde "enviado", e a Ana recebe um ingresso de dois com o chamado fechado.*

- **O que fica com você:** dizer se o reenvio recusa enquanto houver pendência aberta, ou se avisa a operadora e deixa seguir.
- **Por que agora:** o dano é limitado — a chave de uso único não é queimada e a varredura manda a lista inteira depois —, mas é um atendimento de rotina fechando errado, e o comportamento já está pinado em teste para não derivar em silêncio. Trocar agora é uma linha; depois é retrabalho com chamado real em cima.
- **Opções:** **avisar e deixar seguir** (**default proposto**) — o retorno passa a dizer que a lista está parcial e quantos faltam, o pedido não é carimbado como entregue, e a operadora decide com a informação na mão; recusar tiraria da Marina a única ferramenta que ela tem quando a compradora está no telefone · **recusar enquanto houver pendência aberta**, com mensagem própria apontando para a pendência — mais rígido, e transfere para a varredura de 15 minutos um caso em que a pessoa está esperando agora.
- **Onde aterrissa:** `reenviarIngresso` e `lerIngressosVivosDoPedido` em `functions/`; diretriz permanente da RN-382 em [[LEELA-E12-landing]]. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-RF2-1.md`, vetor 6.

### INSCRITO-APAGADO-1 · quem pagou por dois e recebeu um não deixa rastro consultável

Se o organizador apaga um inscrito de um pedido já pago, a emissão trata isso como recusa e segue — o juízo está certo, porque não há cura nem destinatário, e segurar o e-mail do comprador por causa disso trocaria um defeito por outro. O que não existe é **extrato**: o fato só vive como uma linha de erro no registro do servidor. Não abre pendência, não vira campo no pedido, não conta em alerta nenhum. *A Ana pagou por dois ingressos e recebeu um; ela liga, a Marina abre a compra e não encontra nada explicando a diferença, porque o único lugar onde ela está escrita é um log que a Marina não lê.*

- **O que fica com você:** dizer se anomalia de dado em pedido pago merece extrato consultável.
- **Por que agora:** é barato e auto-resolve — a pendência se fecha sozinha na primeira passagem da varredura, porque recusa não entra na conta da lista completa, e o que fica é o registro para o humano. Depois de acontecer com uma compradora de verdade, o que falta é justamente o registro daquele caso.
- **Opções:** **abrir pendência com o motivo** (**default proposto**) — mesmo mecanismo que já existe, com a anomalia nomeada, e o atendimento passa a ter o que ler · **manter só o registro do servidor**, aceitando que o caso é raro e que quem investiga tem acesso ao log · **campo no pedido**, que a regra PROJPED-1 recusa: o comprador leria o vocabulário interno da anomalia na tela dele.
- **Onde aterrissa:** `emitirIngressosDoPedido` e `ingressosPendentes` em `functions/`; RN-382 em [[LEELA-E12-landing]]. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-RF2-1.md`, vetor 7.

### PDF-SPINNER-1 · o botão do PDF não tem indicador de progresso próprio

O botão "Salvar como PDF" que você pediu está construído, e ele é um link de verdade — não um botão com JavaScript. Isso é o que mantém a página do ingresso com **zero** JavaScript de cliente e o custo do bundle em nada, que era o critério de aceite da própria página. O preço é que, entre o clique e o arquivo, a única coisa que se mexe é o indicador de download do navegador. *A Ana clica em "Salvar como PDF" num celular com sinal ruim, não vê nada acontecer na página, e clica de novo.*

- **O que fica com você:** nada, se o default servir. Este é veto leve.
- **Por que agora:** a premissa **PDF-5** da spec ("sem JavaScript de cliente, sem indicador próprio de progresso") é trade-off declarado, não esquecimento — e reabri-la muda a forma da task, porque a rota ganha cliente e o critério de bundle cai junto. Melhor você saber que existe do que descobrir clicando.
- **Opções:** **manter como está** (**default em vigor**) — o indicador do navegador, o teto de 12 segundos da leitura e o desfecho honesto do erro, que devolve à página em vez de 500 ou arquivo pela metade · **reabrir a PDF-5** e ganhar o spinner, com o custo declarado de JavaScript de cliente numa rota que hoje não tem nenhum.
- **Onde aterrissa:** `apps/landing/app/(public)/ingresso/[token]`; RN-473 em [[LEELA-E12-landing]]; premissa PDF-5 em `02-rodadas/2026-08-04-pos-pagamento/05-spec-pdf-ingresso.md`.

### CODPED-PODA-1 · o código da compra é reservado para sempre, e o alerta tem de olhar para o lugar certo

Cada compra reserva um código numa coleção que **nunca é podada**: PIX vencido, venda cancelada e estorno seguram o código para sempre. Isso não é defeito — é o que garante que o código dito ao telefone nunca aponte para duas compras. O que a review corrigiu foi a conta: a saúde do sorteio depende do **tamanho acumulado da coleção de reservas**, não do volume de vendas do ano, e a diferença aparece de repente. Com 5 milhões de reservas, uma compra em 1,1 milhão é recusada e mandada tentar de novo; com 10 milhões, uma em **4.515**. *O Castelo vende bem por três anos, ninguém olha o número de reservas porque as vendas do ano parecem tranquilas, e um dia começam a chegar compradores dizendo que o pagamento falhou e funcionou na segunda tentativa.*

- **O que fica com você:** ratificar o gatilho, ou mandar a coleção ser podada.
- **Por que agora:** o Leela está muito longe desses números e nada empurra. Vale carimbar enquanto é uma frase, porque o remédio é barato (um símbolo a mais no código, não mais tentativas) e a única coisa que precisa existir de antemão é o alerta olhando para o contador certo.
- **Opções:** **alerta no contador da coleção de reservas, sem poda** (**default proposto**) — a reserva é o que garante a unicidade, e podar código de compra cancelada devolveria o risco de dois códigos iguais em compras diferentes na mesma tela da área do cliente · **podar reservas de compras mortas**, o que segura o crescimento e reintroduz exatamente o problema que o código existe para não ter.
- **Onde aterrissa:** `functions/src/checkout/codigoPedidoReserva.ts`; RN-474 em [[LEELA-E12-landing]]. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-COD5A.md`, vetor 9 e ressalva R-2.

### RN469-PROJECAO-1 · a área do cliente mostra 6 dos 16 campos da compra, e a regra diz que todos nascem visíveis

A regra que você ratificou em 05/08 (**PROJPED-1**) diz que todo campo novo no documento da compra nasce **visível** ao comprador. A review antagonista da área do cliente foi conferir campo a campo e achou a distância: a tela mostra **seis** fatos — nome do evento, dia, participantes, código da compra, valor total e status — e o documento tem **dezesseis** campos. Ficam invisíveis, para sempre, a decomposição do valor por inscrito (valor base, desconto, valor final, taxa repassada), o endereço, os aceites, o parcelamento, a referência do pagamento, o telefone do responsável e o identificador da produtora. Há um agravante que é meu: o comentário no código afirma que o detalhe "continua onde já mora — a tela do checkout", e **isso não é verdade** — aquela consulta lê o pedido a partir do estado da tela, e não existe endereço, link nem parâmetro que a alcance depois. *A Ana quer conferir quanto pagou de taxa numa compra de três meses atrás; ela fechou o navegador naquele dia, e não existe mais nenhuma tela no produto que saiba mostrar aquilo.*

- **O que fica com você:** escolher entre dar caminho ao detalhe ou enfraquecer a regra. As duas são defensáveis, e a segunda tem de ser dita em voz alta em vez de acontecer por omissão.
- **Por que agora:** a área acabou de nascer e ninguém depende dela ainda. E porque a regra está escrita no épico com a palavra "visível": deixá-la valendo enquanto o produto entrega "autorizado" transforma um critério em decoração, e a próxima entrega vai medir contra a frase, não contra a tela.
- **Opções:** **a linha da compra ganha caminho até o detalhe** (**default proposto**) — uma tela de detalhe da compra dentro da área, lendo a mesma projeção que já vem do servidor, com o custo de uma rota nova e nenhuma porta nova · **a diretriz passa a dizer "nasce autorizado ao comprador"**, o que é honesto sobre o que existe e é uma regra mais fraca: ela deixa de garantir que o comprador consegue ver, e passa a garantir só que ele teria direito.
- **Onde aterrissa:** diretriz permanente da RN-469 em [[LEELA-E12-landing]]; `PainelCompras` e `minhasCompras.ts`. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-AREACLIENTE.md`, ressalva P1.

### CTA-PIX-1 · o botão "ver meus ingressos" aparece com o PIX ainda pendente

O CTA que você pediu na tela de confirmação nasceu apontando para a área do cliente, e ele aparece nos dois casos: com a compra confirmada e com o PIX ainda pendente. No PIX pendente a sessão é a **anônima** do checkout, então o botão não leva a ingresso nenhum — leva à porta de entrada. Até a madrugada de 05/08 aquilo era uma parede; a review consertou a parede e ela virou um formulário de login, o que é melhor e continua não sendo o que o rótulo promete. *A Ana acabou de gerar o código PIX, ainda não pagou, lê "Ver meus ingressos", clica esperando o ingresso e encontra uma tela pedindo senha — no momento exato em que ela está mais insegura sobre se a compra deu certo.*

- **O que fica com você:** dizer o que a tela faz no PIX pendente. É rótulo e visibilidade, não mecânica.
- **Por que agora:** é uma condicional de uma linha enquanto nada disto está no ar. Depois de publicado, é mudar uma tela que gente de verdade já usou.
- **Opções:** **rotular por estado** (**default proposto**) — no PIX pendente o botão diz o que ele realmente faz, algo como "acessar minha conta", e no confirmado continua falando de ingressos; a pessoa nunca lê uma promessa que a tela seguinte não cumpre · **só mostrar o CTA para sessão nomeada**, o que é mais limpo e deixa quem está com PIX pendente sem nenhuma saída na tela · **deixar como está**, aceitando a distância entre o rótulo e a entrega no pior momento possível.
- **Onde aterrissa:** `ctaMeusPedidos()` em `apps/landing/lib/areaDoCliente.ts` e a tela de confirmação do checkout; RN-470 em [[LEELA-E12-landing]]. Medição na ressalva P2 do handoff da REV-AREACLIENTE.

### ADMIN-VE-AREA-1 · a conta de administração da plataforma vê a área do cliente inteira

Você mandou separar as contas, e a separação foi construída no sentido que importava: nenhum caminho da área do cliente alcança o painel da plataforma. O sentido inverso ficou aberto e ninguém tinha declarado — `/minha-conta` renderiza ingressos, compras e meus dados para uma conta de administração como renderiza para qualquer outra. A lane que construiu registrou isso como "verdade, não vazamento", e a leitura é defensável: o que a tela mostra é a compra da própria conta, não a de terceiro. *Você entra com a conta que administra a Leela, abre `/minha-conta` e vê uma área de cliente vazia — ou, pior, com as compras de teste que aquela conta fez, dentro da mesma sessão que enxerga o CPF de todos os inscritos de todos os organizadores.*

- **O que fica com você:** ratificar que a porta de saída não precisa ser fechada, ou mandar fechá-la junto do ADMINSEP-2.
- **Por que agora:** é a mesma conversa do ADMINSEP-2, e responder as duas juntas evita dois desenhos que não conversam. Enquanto a área não sobe, fechar custa uma guarda.
- **Opções:** **manter** (**default proposto**) — a área mostra o que é da própria conta e nada mais, e recusar o acesso criaria uma tela de erro para um caso que não faz dano · **recusar a área para conta de administração**, coerente com "os ambientes devem ser separados" levado à letra.
- **+05/08 · o ADMINSEP-1 fechou e não decidiu isto.** Você respondeu que a separação para nas superfícies de login, e a leitura literal que sustentaria a segunda opção perdeu o apoio que ela teria se você tivesse mandado separar endereço também. O default proposto fica mais forte; a escolha continua sua. Registro em `02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`.
- **Onde aterrissa:** `AreaDoCliente.tsx` e o gate da área; RN-449 em [[LEELA-E00-fundacao-tecnica]] e RN-451 em [[LEELA-E12-landing]]. Medição na ressalva P3 do handoff da REV-AREACLIENTE.

### AREA-MUDA-1 · quem pagou e teve o vínculo recusado vê a mesma tela de quem nunca comprou

A guarda que você pediu foi construída: comprar com o e-mail da conta de administração confirma a compra e **não** amarra a conta, com o motivo carimbado no pedido. O que a review mediu depois é o outro lado da mesma moeda — esse motivo não chega a superfície nenhuma. A área do cliente devolve vazio, e vazio ali significa "você ainda não tem ingressos". É exatamente a lista vazia que mente, que a RN-451 proíbe em letra. *Você compra um ingresso com o e-mail que administra a Leela, o dinheiro sai do seu cartão, e a área do cliente responde que você nunca comprou nada.*

- **O que fica com você:** dizer o que a tela diz. O dado existe e está carimbado; o que falta é a decisão de mostrá-lo e com que palavras.
- **Por que agora:** é o caso que a guarda **cria**, e ele já é alcançável — quem tem a conta de administração é você. Enquanto nada está no ar, a frase é barata; depois, é um chamado.
- **Opções:** **a área explica em uma frase** (**default proposto**) — quando o pedido traz o motivo, a tela diz que aquela compra existe mas está ligada a uma conta de administração e aponta o caminho (comprar com o outro e-mail), o que exige um sinal novo do servidor até a superfície · **manter o silêncio**, aceitando que o caso é raro e que quem o encontra é quem sabe por quê · **recusar a compra na origem**, que você não pediu e que troca "identidade fail-closed" por "dinheiro fail-closed" — a compra pararia de acontecer, e essa é a única opção que mexe em dinheiro.
- **Onde aterrissa:** `lerPedidosDaConta` e `contaSemFriccao`; RN-451 em [[LEELA-E12-landing]] e RN-449 em [[LEELA-E00-fundacao-tecnica]]. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-A4.md`, caso 4 da suíte antagonista.

### TROCA-EMAIL-1 · quem troca de e-mail depois da compra perde o histórico, em silêncio

A área do cliente autoriza pela conta ligada à compra e confere, em memória, se o e-mail verificado do token bate com o e-mail do comprador. Quem trocar o endereço da conta depois da compra deixa de bater e **perde a leitura daquele histórico**. A recusa está certa e é deliberada — negar por padrão é o que impede a compra de alguém aparecer na conta errada —, e ela se auto-cura na próxima compra, porque o carimbo é refeito. O que ninguém avisa é a pessoa que perdeu. *A Ana troca o e-mail da conta dela depois de comprar dois ingressos, entra na área e lê "você ainda não tem ingressos" — a mesma frase que quem nunca comprou vê.*

- **O que fica com você:** dizer se a tela precisa distinguir "não há compras" de "há compras que esta conta deixou de alcançar".
- **Por que agora:** distinguir exige um sinal novo do servidor, e criar esse sinal depois de a área estar no ar é mexer numa resposta que telas já consomem. É a mesma família do AREA-MUDA-1 e provavelmente a mesma resposta.
- **Opções:** **manter o fail-closed e avisar** (**default proposto**) — a autorização não muda em nada, e a tela ganha uma frase quando existir compra sob o e-mail antigo, apontando o caminho (o link do ingresso continua funcionando sem conta, pela RN-452) · **manter como está**, aceitando que a lista vazia é ambígua nesse caso · **re-vincular pelo e-mail novo**, que eu **recomendo recusar**: seria o POSSE-EMAIL-1 ao contrário, escrevendo vínculo por igualdade de endereço sem prova de que a compra é daquela pessoa — e você acabou de fechar aquele item no sentido oposto, mandando exigir a prova (registro em `02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`).
- **Onde aterrissa:** `leituraArea.ts` e `PainelCompras`; RN-451 em [[LEELA-E12-landing]]. Medição na ressalva P4 do handoff da REV-AREACLIENTE.

### ACUMULO-ESTOQUE-1 · a regra fecha o fluxo e não o estoque, e ninguém contou o estoque ainda

A RN-449 impede que **novas** compras liguem conta de administração a conta de cliente. Ela não toca no que já aconteceu: a conta que hoje já carrega os dois lados — ficha de participante e carimbo de compra antigos — continua entrando na área do cliente e lendo as compras velhas, exatamente como antes. Isso não é defeito da guarda, é o recorte dela; o que falta é o número. *Você fecha a porta hoje e não sabe quantas pessoas já estão do lado de dentro dela, porque ninguém contou.*

- **O que fica com você:** autorizar a varredura e, depois do número, decidir o que fazer com o que ela achar. A decisão de migração **não** se toma antes do número.
- **Por que agora:** a varredura é só leitura, é barata e já está especificada como a tarefa A5. E porque a resposta pode perfeitamente ser zero, o que fecha o assunto sem custo nenhum — é resultado válido.
- **Opções:** **rodar a varredura e decidir depois** (**default proposto**) — nenhuma migração antes do número, pela mesma disciplina que valeu para os pedidos de teste · **migrar já**, que eu **recomendo recusar**, porque migrar sem saber o tamanho é escrever em dado real de conta de gente sem conseguir revisar o efeito · **deixar o estoque como está para sempre**, aceitando que a regra vale só daqui para frente e escrevendo isso.
- **Onde aterrissa:** task A5 (`S032-T5`) em `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`; RN-449 em [[LEELA-E00-fundacao-tecnica]]. Medição no caso 5 da suíte antagonista da REV-A4.

### CLUBES-1 · "Meus Clubes" nasce vazio porque não existe caminho para um participante entrar num clube

A aba de clubes da área do cliente foi construída e funciona. O que a descoberta feita antes de codar devolveu é maior que a aba: **não existe hoje nenhum caminho pelo qual uma pessoa entre num clube**. A varredura por escritores de membros no repositório inteiro devolve três, e nenhum é do participante — a soma automática, as ações do painel do organizador e os dados de exemplo. Não há função de entrar, e o código de convite de clube que a regra prevê não é consumido em lugar nenhum fora do seed. O convite de membro comum tem a mesma forma: o e-mail sai, o documento é criado, e **não existe máquina que o transforme em membro**. *A Ana abre a área dela, clica em Clubes, e a tela diz honestamente que ela não participa de nenhum — e vai continuar dizendo isso para sempre, porque o produto não tem por onde ela entrar em um.*

- **O que fica com você:** dizer se a entrada no clube vira frente própria agora, ou se a aba fica declaradamente informativa até lá.
- **Por que agora:** a aba subiu no deploy de 05/08 e **está no ar**, então a tela vazia já é o que a pessoa vê. Ajustar o que ela promete continua barato, mas deixou de ser gratuito. E porque isto não é borda: **é o caso normal** de praticamente toda conta real, e uma tela que fica vazia para todo mundo é uma tela que pede explicação.
- **Opções:** **manter o estado vazio honesto e abrir a entrada numa rodada própria** (**default proposto**) — a tela foi escrita de propósito para não prometer um botão que não existe, e a entrada no clube é épico de produto (E05), com convite, aceite e vínculo, não um ajuste de tela · **construir a entrada agora**, o que puxa a frente inteira do clube para dentro desta rodada · **esconder a aba até existir caminho de entrada**, que eu recomendo recusar: você pediu Meus Clubes no escopo da área, e esconder resolve a tela em vez de resolver o produto.
- **Onde aterrissa:** `functions/src/cliente/meusClubes.ts` e `PainelClubes.tsx`; RN-101 e RN-451 em [[LEELA-E05-clubs]] e [[LEELA-E12-landing]]. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-BUILD-B4.md` §1.1 e §1.7.

### PERFIL-1 · a produtora passa a se chamar Leela e o endereço público dela continua sendo /@castelo

A limpeza troca o nome de exibição da produtora de "Castelo Produções" para "Leela" em todas as superfícies. O endereço público do perfil dela **não** muda: continua `/@castelo`. Não é esquecimento, é a única saída que não quebra nada — e você precisa saber que ela existe. *Você abre o perfil da sua produtora, lê "Leela" no topo, e a barra de endereço diz `castelo`.*

Duas travas do próprio produto impedem a troca. **`leela` é handle reservado da plataforma** (está na lista ao lado de `leela_oficial` e `oficial`): a casa guardou esse nome para si, e entregá-lo a uma produtora — mesmo sendo a sua — é abrir mão do próprio nome. E **o handle é imutável por regra**: ele é a própria chave do documento do perfil, a gravação direta é proibida, e a função que salva perfil recusa a manobra dizendo "handle é imutável: este organizador já tem o perfil @castelo".

- **O que fica com você:** nada agora. Isto fica registrado para o dia em que o endereço incomodar.
- **Por que agora:** porque a decisão foi tomada nesta rodada e some se não for escrita. É coerente com a sua escolha original — você descartou migrar justamente para não mexer em identificador, aceitando que `castelo-producoes` sobreviva em artefato técnico; `/@castelo` é a mesma classe de coisa: endereço de perfil de semente, sem tráfego, que ninguém alcança a não ser digitando.
- **Opções:** **manter `/@castelo`** (**default em vigor**, custo zero) · **apagar o perfil e recriar** com handle novo — e aqui o custo é real e medido: a página pública do evento monta o bloco do organizador lendo o perfil pelo tenant, então qualquer intervalo sem perfil é **página pública de evento sem organizador** · **escolher um handle livre** (`leelaexperiencias`, `sejaleela`) — continua exigindo apagar e recriar, com a mesma janela · **tirar `leela` da lista de reservados**, que é mudança de produto e devolve a pergunta: a casa quer mesmo abrir mão do próprio nome para uma produtora?
- **Onde aterrissa:** `perfis/castelo`; `HANDLES_RESERVADOS` e `validarHandle` em `packages/core/src/perfil/perfil.ts`; RN-160 em `functions/src/perfil/salvarPerfil.ts`. Medição em `.nirvana/handoffs/leela-limpeza-prod-20260806.md §T9`.

### ACEITE-1 · ninguém sabe qual texto do termo de saúde a pessoa aceitou

O pedido guarda o aceite do termo de saúde com **a versão e a hora, e nada mais**. O texto em si não é guardado nem carimbado: ele é **montado na hora da leitura**, e o nome da produtora entra nele vindo do perfil vigente. A consequência é que trocar o nome da produtora reescreve, para trás, quem era a parte contratante de todas as declarações de saúde já aceitas — sem versão nova e sem registro do que foi assinado. *A pessoa declarou estar apta perante "Castelo Produções"; amanhã a mesma tela dirá que ela declarou perante "Leela", e não existe uma linha provando o contrário.*

A assimetria é o que denuncia o defeito: o **termo de uso** guarda `materialHash` — a impressão digital do texto aceito. O **termo de saúde** não guarda. Dois aceites lado a lado no mesmo pedido, um auditável e o outro não.

- **O que fica com você:** nada agora, e por um motivo medido: **os três aceites que sobrevivem à limpeza são compras de teste suas** (`8CDHM`, `Q57PA`, `N4FHP`). Nenhum terceiro foi afetado, então o efeito prático hoje é nulo.
- **Por que agora:** porque hoje custa quase nada e o preço sobe com cada venda real. No dia em que um participante de verdade contestar, a pergunta "o que exatamente ele aceitou?" não tem resposta no banco. Some com a LGPD-1, que já é a conversa jurídica sobre prova de consentimento.
- **Opções:** carimbar `materialHash` no aceite de saúde igual ao do termo de uso, e passar a versionar quando o texto muda · congelar o texto aceito dentro do pedido · deixar como está e assumir que o termo de saúde é declaração da pessoa, não contrato com a produtora — o que é defensável, mas precisa ser escolha e não acidente.
- **Onde aterrissa:** `aceites.saude` no documento do pedido; `paragrafosDoTermoSaude` em `AceitesCompra.tsx`; `resolverOrganizadorPublico` em `apps/landing/lib/leitor.ts`. Medição em `.nirvana/handoffs/leela-limpeza-prod-20260806.md §T9`.

### COMPROMETIDO-1 · três repasses vetados comprometem R$ 167,00 contra eventos que o expurgo apagou

O expurgo de 06/08 rodou limpo (2.873 operações, provadas contra o banco), e o saldo se recompôs sozinho no meio da corrida por um gatilho que ninguém tinha listado — hoje `vendidoBruto` está aritmeticamente certo, a soma exata dos dois eventos vivos. O que sobrou errado é o `comprometido = 16700`: três repasses vetados seguram esse valor, e dois deles apontam para eventos que não existem mais. *O painel de caixa mostra dinheiro comprometido com evento apagado, e nenhuma tela de operador tem botão para desfazer isso.*

- **O que fica com você:** decidir o destino dos três repasses vetados. É dinheiro, estava vetado antes do expurgo, e remendar por conta própria era exatamente o tipo de silêncio que você já proibiu.
- **Por que agora:** enquanto eles existirem, o "disponível para repasse" nasce menor do que a realidade — o guard `disponível = entrou − comprometido` desconta valor preso em referência morta.
- **Opções:** cancelar os três repasses vetados de vez, liberando o comprometido — os dois de evento apagado não têm mais contra o que correr · cancelar só os dois órfãos e manter o terceiro, que aponta para evento vivo · deixar como está até a próxima rodada de caixa, aceitando o disponível menor.
- **Onde aterrissa:** os três documentos de `repasses` com status vetado; a medição completa está em `.nirvana/handoffs/leela-apply-limpeza-20260806.md`. A lacuna estrutural (recomputo de saldo sem caminho de operador) segue registrada na REV3.

## Ações que só você pode executar

### ADMINSEP-3 · a conta de super-admin de produção é a conta de demonstração

Achado enquanto eu apurava a separação de contas que você pediu. A conta que administra a plataforma em produção é `admin@demo-leela.dev`, com a senha `demo1234` — a mesma senha de vitrine que está publicada no repositório. O seed de produção a criou de propósito, junto com as contas de demonstração, e o login já foi provado funcionando contra `leela-hub`. *Qualquer pessoa que abra o repositório tem, hoje, a senha da conta que enxerga o CPF e o telefone de todos os inscritos de todos os organizadores, lê dados bancários em claro, aprova repasse, estorna compra, muda a tabela de taxa e cria outros administradores.*

- **O que fica com você:** escolher o e-mail real do administrador da plataforma e definir uma senha de verdade. Só você pode fazer as duas coisas.
- **Por que agora:** é fator único, sem segundo fator, com App Check desligado, e o produto já está no ar com dado real de compra. Não depende de nenhuma decisão de arquitetura, e o ADMINSEP-1, que fechou em 05/08, não o tocou.
- **Onde aterrissa:** a conta nova recebe a claim pelo caminho manual, que já é o declarado para produção; o seed para de semear administrador contra o projeto real; e a conta de demonstração é revogada. O passo a passo está na task A6 de `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`. As contas de organizador de demonstração podem ficar: elas não alcançam a plataforma.
- **+05/08 · este item virou bloqueio de uma coisa concreta.** A ferramenta de reenvio existe desde 04/08 e a trava da Brevo caiu, mas a porta é **admin da plataforma** e a senha do super-admin foi rotacionada em 04/08 sem ficar registrada em lugar nenhum. Os **dois e-mails represados do seu pedido** (o ingresso `T93N7F` e o da conta) continuam sem sair por falta de credencial, não por falta de código. Escolher o e-mail real e definir a senha destrava o reenvio no mesmo gesto.

### 34 · a jornada completa no ar, com a compra real

Você decidiu em 28/07 que a revisão vira uma só, do início ao fim: a home com as experiências, o produtor, a página do evento, a compra e o QR do ingresso na tela. O mesmo passeio ratifica a ADR-017, que deu ao design system duas portas sem a dependência que quebrava a landing com erro 500.

- **O que fica com você:** percorrer a jornada e comprar de verdade, com valor baixo. É o teste canônico do go-live.
- **Por que agora:** a investigação de 02/08 provou que a função de cobrança nunca devolveu sucesso em produção, porque o identificador enviado ao banco tinha 155 caracteres num limite de 100. O conserto está no ar, revisado por antagonista, e `createInscricaoCharge` segue com zero sucesso na história.
- **Onde aterrissa:** `https://leela-landing.web.app/meia-floripa-2026/inscricao`, com os cupons de teste HEROI10 e CORRA50 válidos até 08/09. A compra prova de uma vez o identificador aceito pelo gateway, o juro na tela e no documento, a conferência de versão do aceite e a origem carimbada na prova.

### 69 · conferência visual das telas novas, no mesmo passeio

Sete coisas entraram no ar entre 02 e 03/08 e nenhuma delas tem gate de código que substitua o seu olho: os três ícones de rede desenhados em casa (WhatsApp, TikTok e Strava não existem no lucide), o menu Feed · Eventos · Clubs na página do produtor, o respiro do rótulo nos grupos de escolha, o toque em qualquer ponto do cartão de modalidade e kit, e os três consertos do checkout de 03/08.

- **O que fica com você:** olhar e vetar o que não estiver certo. Cada peça é troca barata.
- **Por que agora:** tudo está servido em produção, incluindo a página do produtor, e os vetos ficam mais caros depois que houver compra real em cima.
- **Onde aterrissa:** `https://leela-landing.web.app/@castelo` para o menu e os ícones; `.../meia-floripa-2026/inscricao` para o select de parcelas completo na primeira abertura, o total que muda no ato e o loader "Preparando código PIX" só depois do clique. A copy "Modalidades disponíveis" e "Modalidade oficial" está nas duas.
- **Entra no mesmo passeio quando for ao ar:** as telas da porta de entrada do organizador, construídas e já revisadas, e que só sobem quando você responder o **DEPLOY-1**. O botão de pagar você confere depois da S1219, que troca a frase "Atualizando o total…" pelo spinner que você aprovou.
- **+04/08 · os oito e-mails entraram nesta lista e agora estão em produção.** A moldura da marca subiu no deploy da lane DEPLOY-EMAIL, então o próximo e-mail que sair do sistema já vai com logo e fundo da identidade. A conferência é por arquivo, não por navegador: os oito renderizados com dados de exemplo estão em `.nirvana/outputs/leela-build-2d6ee98d/emails/` (`index.html` percorre os oito). O que vale olhar com cuidado é o **cabeçalho com a imagem bloqueada** — é o caso normal no Gmail, não a exceção, e é o `alt` estilizado que segura a marca ali.
- **+05/08, atualizado em 06/08 · a tela de lotes entra nesta lista, e agora ela está no ar.** Seus seis achados foram atendidos, revisados por antagonista e subiram no deploy do painel de 05/08. Sete conferências, todas em `/eventos/{slug}/lotes`: o aviso acende no campo da **vaga** e não no do preço; dois campos vazios acendem juntos e o cursor cai no primeiro da ordem visual; a recusa por janela sobreposta traz o **nome** do outro lote e as datas com hora; os três números (vendidas · disponíveis · total) aparecem na tabela e dentro do modal, e o disponível cai **na hora** quando você digita um total menor em `Ajustar capacidade`; um lote com venda abre com o preço cinza e o atalho de capacidade logo abaixo da vaga; `Desativar` num lote vigente para a venda e mantém válido quem já comprou; e o menu secundário do evento não tem barra de rolagem nenhuma em 320, 768 e 1024 pixels, com as abas que não cabem ainda alcançáveis por gesto. **A janela de datas segue cinza de propósito** — ela é a única parte do seu pedido que não foi entregue, e agora tem tarefa própria, porque a trava vive numa regra de servidor.

### JUROS-1 · salvar os termos comerciais no painel, para selar o rastro

A escrita de 03/08 foi minimalista por ordem explícita, então o documento vigente ficou em `versao: 1` enquanto o retrato imutável `v1` ainda diz juros zero. Nada quebra por causa disso, mas o histórico da v1 deixou de ser fiel.

- **O que fica com você:** abrir os termos e salvar sem mudar nada.
- **Por que agora:** o próximo save pelo painel grava a v2 já com 2,89% e sela o rastro pelo caminho canônico, que é o único jeito de o histórico voltar a bater.
- **Onde aterrissa:** `/plataforma` → Termos do tenant Castelo Produções.

### JUROS-3 · quem paga o custo quando o juro é zero

Você determinou que "sem juros" será ferramenta do admin, liberada por tenant, nunca escolha do produtor. O contrato está especificado e nada será construído agora. Falta a única parte que é dinheiro: quando a plataforma zera o juro de um tenant, o custo de financiar aquela venda sai de quem. *Você libera 6x sem juros para o Castelo, a compradora paga o mesmo preço do à vista, e alguém absorve o que o gateway cobra por parcelar.*

- **O que fica com você:** dizer se a plataforma absorve ou se o custo desce para o líquido do produtor.
- **Por que agora:** é uma linha na spec agora e um campo novo no pagamento mais uma linha no extrato depois. Decidir junto do contrato custa nada; decidir depois de construído é retrabalho de dinheiro.
- **Opções:** a **plataforma absorve** (**default proposto**) — a RN-437 já diz que o juro do parcelamento não é receita do organizador, e a simetria manda que o custo também não seja despesa dele; cobrar do produtor contradiria a RN-182, que hoje define o líquido como `face − taxa(meio)` e mais nada · **descontar do líquido do produtor**, que é o caminho mais caro: pede campo novo no pagamento, linha nova no extrato e revisão da RN-182.
- **Onde aterrissa:** RN-458 em [[LEELA-E16-plataforma-superadmin]]; `02-rodadas/2026-08-04-juros-margem/01-spec-economia-parcelamento.md` §5.3.

### JUROS-4 · dois markups estão no registro e não são o mesmo modelo

Você declarou duas coisas diferentes em duas semanas, e as duas viraram registro. Em 27/07, verbatim: *"já as parcelas, pode ir adicionando 2.5% a cada parcela, e depois eu edito"* — está no backlog como card. Em 03/08 você mandou preencher a tabela com 2,89% a.m., chamando o número de estimativa. *Numa venda de R$ 300,00 em 12x, um modelo cobra R$ 359,28 da compradora e o outro cobra R$ 390,00. Trinta reais e setenta e dois centavos de diferença na mesma venda, e a tabela do admin vai exibir um dos dois.*

- **O que fica com você:** dizer qual vale. Nenhum é obviamente o vencedor, e por isso não há default proposto.
- **Por que agora:** a tabela de margem vai exibir o markup, e exibir o número errado corrompe a decisão de preço que você vai tomar olhando para ela. É troca barata enquanto nada foi construído.
- **Opções:** **Price a 2,89% a.m.** (19,8% sobre o principal em 12x) — está no ar hoje, é o que o teste de 03/08 exercitou e é o que a S314 construiu · **acréscimo linear de 2,5% por parcela** (30% em 12x na leitura direta, ou 27,5% se a contagem começar em 2x) — é a sua decisão mais recente e a mais simples de explicar a um produtor, e a própria frase admite as duas leituras, então escolhê-la pede dizer qual.
- **Onde aterrissa:** `commercialTerms/current.installmentRules`; RN-436 em [[LEELA-E04-config-vendas]]; lacuna L4 da spec da rodada. O card "Preço do SaaS e acréscimo por parcela" do backlog fecha junto.

### JUROS-5 · a tabela de tarifas do Asaas, que só você consegue buscar

A coluna de custo é o que transforma a tabela do admin em margem de verdade, e o número que a preenche não existe em lugar nenhum do sistema. O que existe é benchmark de julho, com cartão à vista a 2,99% mais R$ 0,49 e a coluna de **parcelado vazia** para o Asaas, coletado sob a ressalva de não fechar taxa sem cotação por volume. *Você abre a tabela nova, lê "custo não configurado" em todas as linhas, e a coluna Margem fica vazia até alguém trazer o número do contrato.*

- **O que fica com você:** buscar no painel do Asaas, ou com o gerente de contas, a tabela de tarifas vigente, incluindo o acréscimo por parcela.
- **Por que agora:** é o único insumo que a construção não consegue produzir sozinha. A tela nasce funcionando sem ele, declarando a ausência em vez de estimar, porque você vai usar esses números para decidir preço e um número inventado aqui vira decisão errada.
- **Onde aterrissa:** `platform/config.custoGateway`; RN-455 em [[LEELA-E16-plataforma-superadmin]]; lacunas L1 e L2 da spec da rodada. Enquanto isso, a tarefa T5 da S1610 passa a registrar o custo real de cada venda a partir do que o gateway devolve, o que fecha a lacuna pelo lado da medição em vez do lado do contrato.

## Fila de construção

> Ordem ratificada por você em 28/07 (DEC-0728). Roda em sequência sem nova consulta, e o detalhe de cada frente vive no card do backlog em [[V1-KANBAN]] e no épico correspondente. As frentes que nasceram da sua leva de 03/08 estão no fim, ainda sem posição.
>
> **+05/08 · duas frentes desta lista saíram por estarem construídas:** o login no meio da landing e a área do cliente com os próprios ingressos. As duas perguntavam a posição na fila, e a pergunta ficou sem objeto — a noite de 05/08 construiu as duas, com o registro completo em `02-rodadas/2026-08-04-pos-pagamento/01-decisoes-dono.md` §O que a noite de 05/08 executou. **+05/08 (madrugada): a frente fechou** — Meus Clubes entrou (`4b72c556`+`b3e51638`) e a review da área rodou e consertou quatro defeitos. O que a construção da aba devolveu **é** seu, e virou o **CLUBES-1** acima: a tela nasce vazia porque não existe caminho para entrar num clube. **+05/08 (noite): as duas estão no ar.** O deploy tinha uma sequência obrigatória — quatro isenções de campo único antes das functions — e ela foi cumprida sem esforço: a conferência contra o servidor mostrou que os índices já batiam, arquivo e produção, então nada precisou subir ali.

### Construída e revisada · porta de entrada do organizador

A landing ganhou "Entrar" e "Criar conta", o cadastro abre com acesso travado por overlay de código de convite, e os códigos são geridos por você no super-admin. *Hoje um organizador novo não tem onde clicar para entrar, e quando entrar ninguém controla quem usa a plataforma.*

- **O que fica com você:** duas coisas, e as duas subiram para o topo deste painel como itens próprios: o **LGPD-1** e o **DEPLOY-1**. As dez premissas vetáveis seguem valendo por default sem veto seu.
- **Por que agora:** a construção terminou em 03/08 com as oito tarefas pagas, e a review antagonista fechou na madrugada de 04/08: dez vetores atacados, três defeitos achados e corrigidos, gate final verde nas seis superfícies. Nenhum dos três defeitos era de tela — um deixava a conta nascer sem registro, um vazava o oráculo de qual código existe, e um deixava o overlay bloqueante transparente.
- **Onde aterrissa:** lanes ONBOARD-BUILD e ONBOARD-REV, rodada `02-rodadas/2026-07-28-onboarding-organizador/`. Duas pontas menores seguem abertas e nenhuma é sua: o seed do primeiro código de convite está **retido** até o LGPD-1, e o CTA "Falar com o time Leela" está com o placeholder `contato@leela.app`, que morre junto com o item 12.

### Posição 1 · E10, consolidação das ativações de marcas

A tela de marcas existe e funciona, mas omite de propósito em quantos patrocínios cada marca é usada, porque não existe leitor barato para essa contagem e a casa não exibe número inventado. *A Marina apaga "Café Rota" sem saber que era o patrocinador de um desafio.*

- **O que fica com você:** nada. A ordem já está ratificada.
- **Por que agora:** item pequeno e isolado, por isso está cedo na fila. A auditoria achou um bloqueio que entra antes de tudo: nenhum vínculo guarda o id da marca, só o nome, e casar por nome perde o vínculo no primeiro rename.
- **Onde aterrissa:** S812, cinco tarefas em [[LEELA-E10-marcas]].

### Posição 2 · FORMBUILDER, formulários como template

O organizador monta perguntas próprias numa biblioteca com casa no menu principal, e cada evento ou clube só escolhe um template. Publicar versão nova não mexe em quem já usa. *Hoje o Castelo monta formulário fora do sistema e cruza duas planilhas na véspera.*

- **O que fica com você:** nada. Você puxou a frente em 28/07 e as regras estão fechadas.
- **Por que agora:** a v1 tem três tipos de pergunta, a resposta fica com o inscrito e nunca com o pedido, pergunta obrigatória bloqueia o pagar no mesmo ponto do servidor que já barra os aceites, e anexo de arquivo fica para a fase 2.
- **Onde aterrissa:** S313 e S310 em [[LEELA-E04-config-vendas]] · [[LEELA-E05-clubs]] · [[LEELA-E12-landing]].

### Posição 3 · E11, análise em CRM › Visão geral

O histórico diário já é coletado, com um retrato dos indicadores gravado por data todos os dias às 03:05, de forma idempotente. *A Marina troca o seletor de período para comparar 30 dias com os 30 anteriores e os números não mudam.*

- **O que fica com você:** nada.
- **Por que agora:** a consolidação dessa série é o gargalo do épico. Sem ela nenhuma das três telas de análise é despachável, e o seletor de período segue honestamente inerte, lendo sempre o retrato atual.
- **Onde aterrissa:** seis tarefas em [[LEELA-E11-analytics]].

### Posição 4 · E16, catálogo de benefícios da plataforma

Você, como administrador Leela, cadastra cupons de benefício e parceiros presenciais com endereço, descritivo, capa, logo e fotos. O cupom aqui não é o cupom de venda do organizador e não encosta em preço, taxa nem repasse.

- **O que fica com você:** confirmar essa leitura, se ela estiver errada. É barato refazer, porque nada foi construído em cima.
- **Por que agora:** prioridade baixa declarada por você em 28/07, e não bloqueia nada. Ficou no E16 porque quem escreve é o administrador da plataforma e o dado atravessa produtores.
- **Onde aterrissa:** [[LEELA-E16-plataforma-superadmin]] §"Catálogo de benefícios da plataforma".

### Entrou em 03/08 · uma conta só para quem é admin e organizador

Você decidiu que a mesma pessoa pode ser administradora da plataforma e usuária do painel com **uma conta só**, e que a tela de ver e trocar entre os papéis fica deliberadamente para depois. *Você entra com a sua conta e precisa decidir, na hora, se está olhando como Leela ou como produtor.*

- **O que fica com você:** nada agora. Adiado por sua decisão, não por falta de desenho.
- **Por que agora:** nada empurra. O roteamento do item 57 já resolve o caso comum, mandando cada papel para a casa dele.
- **Onde aterrissa:** [[LEELA-E16-plataforma-superadmin]], quando sair do gelo.

### Entrou em 03/08 · antecipação de recebíveis sob demanda

A tabela de juros do admin, que a PB-2 e a JUROS-2 destravam, é o primeiro degrau de uma visão maior que você declarou: juntar custo de parcelamento e custo de antecipação, aplicar markup e enxergar o faturamento da plataforma ao longo do tempo. A antecipação seria **sob demanda**, nunca automática, operada pelo painel admin e antecipando só o necessário para cobrir repasses.

- **O que fica com você:** nada agora. Suas palavras: "cena para os próximos capítulos".
- **Por que agora:** não empurra nada. Fica escrito para que a tabela de juros nasça com a coluna de custo já pensando nela.
- **Onde aterrissa:** [[LEELA-E09-financeiro-profissional]] · [[LEELA-E16-plataforma-superadmin]], depois da S1610.

### Entrou em 03/08 · dois eventos publicados estão inacessíveis em produção agora

A página pública decide se o evento está à venda olhando só para os lotes. Evento publicado que não tem lote serve "Inscrições encerradas", mesmo quando o servidor tem preço válido e cotaria a compra sem reclamar. A vitrine e o motor discordam, e quem perde é quem publicou. *O Castelo publica um evento, divulga o link e a página diz que as inscrições acabaram antes de a primeira começar.*

- **O que fica com você:** a posição na fila. A decisão embutida é qual das duas fontes manda, e ela é técnica: ou o lote continua sendo a única autoridade de venda, e então publicar sem lote passa a ser recusado ou avisado no painel, ou a página cai no preço legado quando não há lote.
- **Por que agora:** não é hipótese. `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` estão publicados e inacessíveis em produção **hoje**, achado medido pela lane de dados de teste de 03/08. **Prioridade alta na fila.**
- **Onde aterrissa:** `estadoVenda.ts` na landing e a validação de publicação no painel; ponta registrada em [[LEELA-E12-landing]].

### Entrou em 03/08 · a conta que nasce sem registro fica trancada do lado de fora

O cadastro grava a conta de login e o registro do organizador em dois passos. Se o segundo falhar, a conta existe e o registro não, e o login seguinte barra a pessoa com um aviso. Ela não consegue resgatar convite, porque o resgate vive atrás do login, nem se recadastrar, porque o e-mail já está em uso. *A organizadora se cadastra, a rede oscila no instante da gravação, e ela nunca mais entra na própria conta.*

- **O que fica com você:** a posição na fila. A causa que o formulário produzia sozinho já foi fechada pela review de 03/08; o que sobra é falha de rede, quota ou indisponibilidade.
- **Por que agora:** hoje a única recuperação é intervenção manual no super-admin, e isso não escala nem para o beta. Duas saídas possíveis, ambas de produto: o cadastro tentar de novo e mostrar na tela que faltou algo antes de a pessoa sair, ou a tela de entrar oferecer o campo de código quando barra — o que transforma o aviso em porta.
- **Onde aterrissa:** `CadastrarPage` e `EntrarPage`; RN-411, RN-446 e RN-449 em [[LEELA-E00-fundacao-tecnica]].

### Entrou em 03/08 · a borda que segura força bruta não está ligada (pendência do CTO)

Não é decisão sua, e está aqui só para você saber que existe e quem a carrega. O teto de tentativas do resgate de convite é por conta, e o cadastro é aberto: o teto global é cinco vezes o número de contas que alguém criar. O que torna a adivinhação inviável é o tamanho do espaço de códigos, quase 10¹², não o limitador. O throttle volumétrico de verdade é da borda — App Check e Cloud Armor —, e nenhum dos dois está ligado.

- **O que fica com você:** nada. Vai para o **CTO humano**, junto do item 62 (`minInstances`), porque é julgamento de custo de infraestrutura.
- **Por que agora:** o custo de deixar assim é faturado — cada tentativa é uma invocação de função mais uma transação no banco. Entra na conta do DEPLOY-1, já que é o cadastro aberto que fica exposto.
- **Onde aterrissa:** seção "Pendência do CTO" em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md`; ponta técnica registrada em [[LEELA-E16-plataforma-superadmin]].
- **+05/08 · a borda ganha um consumidor novo, e ele dispara e-mail.** A spec de `02-rodadas/2026-08-05-contas-landing/` cria o pedido de código de seis dígitos: superfície pública, anônima, e que manda uma mensagem a cada chamada. O limitador por **alvo** existe e está especificado (RN-476: três em quinze minutos e dez em vinte e quatro horas por endereço), e não há chave por origem dentro da aplicação, por decisão já escrita no `rateLimit.ts` — derivar IP confiável num callable é premissa de infraestrutura não verificável e um balde por IP pune vizinho de NAT. Sem a borda, o teto global passa a ser o número de endereços distintos que alguém quiser digitar. Não é escalada de privilégio e não bloqueia a fila; é custo faturado e reputação de remetente. Continua sendo do CTO humano, e continua não sendo decisão sua.

### Entrou em 06/08 · o gancho de incidente existe e do outro lado não há ninguém (pendência do CTO)

Não é decisão sua, e está aqui pela mesma razão do item acima: para você saber que existe e quem a carrega. A casa tem doutrina de incidente escrita e aplicada — quando um e-mail transacional falha, a linha sai com campo de alerta, severidade e tipo, num formato estável, pronto para ser casado por uma política. A medição de 06/08 contra o projeto de produção diz o resto: **zero políticas de alerta, zero métricas de log e zero canais de notificação.** O gancho está pendurado no vazio. *A redefinição de senha morreu em produção às 11h43 de 05/08, e ninguém soube até alguém abrir o log atrás de outra coisa, nove horas depois.*

- **O que fica com você:** nada. Vai para o **CTO humano**, junto do item da borda volumétrica e do `minInstances`, porque criar política de alerta e canal de notificação é custo de infraestrutura recorrente, e a regra permanente da casa manda rotear custo recorrente ao sócio.
- **Por que agora:** o conserto de 06/08 aplica a doutrina no arquivo que faltava, então a partir dele "aplicamos a doutrina" quer dizer "o log está pronto para ser casado". Não quer dizer "alguém é avisado". Enquanto a política não existir, **toda falha nova continua invisível até alguém abrir o log** — e a única razão de a de 05/08 ter sido descoberta é que outra investigação passou por ali.
- **O que a política precisaria casar:** o campo de alerta que a doutrina já grava, com um canal de notificação atrás. É configuração de projeto, não código; nada no repositório muda.
- **+06/08 · a segunda metade da mesma falta chegou aqui, e agora as duas vivem num lugar só.** A conversão do item 11 (os três segredos) mandou conferir o endereço do monitoramento de erros em produção, e a conferência devolveu que **não há endereço nenhum**: nenhum DSN em `.env`, em `.env.leela-hub` nem no da landing, e nenhum dos dois bundles servidos carrega um. O SDK está instalado nas duas telas — `@sentry/react` no painel, `@sentry/nextjs` na landing — e é desenhado para virar **no-op silencioso quando falta o DSN**, que é o que ele é hoje, em produção. Nas functions o SDK nunca entrou no workspace. Então não é que o Sentry esteja mal configurado: **não existe Sentry ligado**, e a tela que parece instrumentada não reporta uma linha. Junto com a ausência de política de alerta acima, isso quer dizer que a casa não tem nenhum caminho pelo qual uma falha em produção chegue a um humano.
- **Uma consequência concreta, para a conta do CTO não ser abstrata:** a condição que reabre o item do pagador estrangeiro — *alguém tenta comprar com cartão emitido no exterior e a compra é recusada no gateway* — **depende desta pendência**. Enquanto não houver política nem DSN, essa recusa acontece e ninguém fica sabendo. Registrado em `02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md` §Parte 1.
- **Onde aterrissa:** o projeto de produção `leela-hub`, no Cloud Logging e no Cloud Monitoring. Medição e comandos em `.nirvana/handoffs/leela-senha-DIAG.md` §4 e §6; a doutrina que produz o campo vive em `functions/src/email/incidenteEmail.ts` e o runbook em [[runbook-email-transacional]].

### Entrou em 06/08 · quem se cadastra não aparece em lugar nenhum do painel (ADMIN-USUARIOS-1)

Duas pessoas reais se cadastraram em 06/08 e caíram na tela do código de convite — comportamento correto, a porta do organizador é por convite (RN-413). O problema é o que veio depois: você não tem onde vê-las. O painel da plataforma lista convites, estornos, repasses e planos, mas não tem um diretório de contas; quem se cadastrou e ainda não é profissional é invisível para a administração. *Alguém se cadastra para virar organizador, espera o convite, e você nem sabe que a pessoa existe.*

- **O que fica com você:** decidir se o diretório de usuários entra na fila de construção e com que alcance (só contas aguardando convite, ou todas as contas com papel e origem). Envolve PII, então a spec herda o cuidado do P-IAMENU-1.
- **Por que agora:** o caminho de hoje é o Console do Firebase (Authentication → Users lista todas as contas), que funciona mas é ferramenta de engenharia, não de operação. Enquanto o beta for você entregando convite na mão, dá para operar assim; no primeiro terceiro operando, não.
- **Onde aterrissa:** spec nova sob [[LEELA-E16-plataforma-superadmin]] (tela em `/plataforma`); a emissão do convite em si já existe em `/plataforma/convites`.

### Entrou em 06/08 · o retrato contínuo do banco está desligado (PITR — pendência do CTO)

O expurgo pediu um export com hora exata (`snapshotTime`) e a API recusou: **Point-in-Time Recovery está desligado** no Firestore de produção. A corrida seguiu pela rede primária (export normal + importação), que está de pé e provada — mas ficou nomeada a causa do A3: sem PITR, não existe "voltar o banco para as 14h07 de ontem"; existe só o último export tirado à mão. *Um erro operacional grave hoje se desfaz até o export mais recente, não até o minuto anterior ao erro.* Ligar tem custo recorrente de armazenamento e política de retenção — decisão de infraestrutura para o CTO (sócio), não sua. Registro em `.nirvana/handoffs/leela-apply-limpeza-20260806.md`.

### Depois da fila · app v1 como PWA

Sua decisão de 18/07 tirou o cadastro nas lojas do caminho do v1, e a reespecificação reduziu nove histórias para seis, com o ingresso passando a funcionar sem rede. *A Ana chega ao ginásio sem sinal e hoje o ingresso dela precisa de rede.*

- **O que fica com você:** nada agora.
- **Por que agora:** na ordem ratificada no mesmo dia, o horizonte 3 vem antes do 2, com a estratégia de terminar por projeto. O produto web inteiro fecha antes do app, e o Creator Studio permanece por último.
- **Onde aterrissa:** [[LEELA-E13-app-atleta]] · [[ROADMAP]] §5.
