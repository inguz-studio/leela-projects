# Decisões em aberto — painel do Vitor

> **Como ler.** Todo item tem a mesma forma: um parágrafo curto de contexto, o **caso de uso** (a cena concreta em que a decisão aparece na vida de alguém), a **job story** (o trabalho que essa pessoa está tentando fazer), depois o que fica com você, por que está na mesa agora, as opções com o default marcado e onde a resposta aterrissa. Nada aqui bloqueia código. Tudo roda com um default defensável em vigor, ratificar é confirmar o default, e mudar é ajuste no próximo lote.
>
> **O corte de 09/08, e é ele que explica o tamanho desta página.** Você disse que 67 decisões não é razoável, que o painel devia carregar decisão de negócio e de produto, e que duplicidade, CTA inconsistente e contraste eu resolvo. **Trinta e nove itens saíram**: 37 decididos com default, porquê e condição de reabertura escritos, um absorvido pelo LGPD-1 e um fechado porque a ação já tinha sido executada. Nada foi apagado — o registro item a item está em `02-rodadas/2026-08-09-corte-painel/01-decisoes-maestro.md`, e os consertos que essas decisões geram estão em `02-rodadas/2026-08-09-corte-painel/02-fila-execucao.md`. Nenhum item de dinheiro cobrado, de dado pessoal ou de vocabulário de marca saiu sem você.
>
> **Disciplina de limpeza.** Item resolvido sai deste painel na mesma aterrissagem. O registro completo, com o seu verbatim, passa a viver no arquivo da rodada em `02-rodadas/`. Este painel só carrega o que ainda é seu, e o histórico do que já fechou mora lá, não aqui.
>
> **Limpeza de 09/08 (pós-pausa).** JUROS-3 e JUROS-4 saíram — fechados pelo lote 1 e pela sua correção (*"eu que decido como cobrarei juros pelo painel admin, manualmente"*; o "até 3x sem juros" era exemplo, e o JUROS-ALINHAMENTO que nasceu dele foi cancelado). JUROS-5 saiu porque você entregou o número (1,89% a.m.) e a tabela foi calculada na rodada. Registro: `02-rodadas/2026-08-09-decisoes-dono/`.
>
> **Troca de 10/08.** O **ESTOURO-1** saiu — você o decidiu em 09/08 (*"Se um pedido está com pagamento pendente, a vaga não está disponível para compra"*) e a spec que o formaliza aterrissou (`02-rodadas/2026-08-10-estouro-reserva/`, RN-543 a RN-545: reserva na cobrança + varredura automática do PIX vencido). No lugar dele entrou o **ESTOURO-2**, a única pergunta que a sua frase não alcança: o teto da reserva do pendente de cartão. A conta não muda.
>
> **Segunda troca de 10/08.** O **ADMIN-USUARIOS-1** saiu — você o decidiu em 09/08 (*"esse cadastro deve aparecer no painel master. que lá eu aprovarei, passando um código. Ou liberando diretamente o acesso"*) e a spec que o formaliza aterrissou (`02-rodadas/2026-08-10-admin-usuarios/`, RN-547 a RN-552: a fila lê o estado que já existe, as duas portas de aprovação convergem no mesmo destino, todo ato de aprovar deixa rastro). O alcance do diretório, que era a metade ainda aberta, foi respondido pela sua própria ordem da visão master ("todos os usuários") com o desenho de dois modos da S1615. No lugar dele entrou o **ADMIN-USUARIOS-2**, a pergunta que a sua frase não alcança: recusar e revogar. O **ADMINVISAO-5** continua seu e ganhou defaults propostos com custo medido nos dois lados. A conta não muda.
>
> **Terceira troca de 10/08.** O **ARENA-2** saiu — você o decidiu em 09/08 (*"Nao temos essa listgem? de acordo com o spilares e modaldiades disponiveis? podemos usar de base"*) e a spec que o formaliza aterrissou (`02-rodadas/2026-08-10-arena-2-lista/`, RN-553 a RN-557: a lista de interesses da Arena deriva da taxonomia canônica — e a medição corrigiu a premissa do item: a listagem **existe**, é a RN-114 com os 3 pilares e as 16 ações, mais as 9 modalidades do clube). No lugar dele entrou o **ARENA-4**, a única pergunta que a sua frase não alcança: o corte do vocabulário exposto — a tabela derivada integral está lá, com fusões e rótulos marcados para o seu veto ser barato. A conta não muda.
>
> **A purga de dados de teste aterrissou em 10/08, fim de tarde, e a conta cai para 28.** O plano congelado rodou inteiro em produção: 247 exclusões, backup duplo tirado antes do primeiro delete, pós-check integral verde e as duas contas demo fora do Auth (21 → 19). Os quatro intocáveis (a compra real PED-8CDHM, o código T93N7F, o evento teste-taxa-repassada e a conta inguzbuilders) foram relidos depois de tudo por sonda independente: vivos, com o mesmo carimbo de antes. Dois itens fecham com ela. O **COMPROMETIDO-1** fecha pela purga: os três repasses vetados morreram com o resto do seed, o pós-check provou `comprometido = 0`, e o disponível para repasse voltou a bater com o dinheiro real. O **VITRINE-2** fecha sem objeto: os dois eventos sem preço já não existem em produção (a leitura de 10/08 devolve 404 para ambos), então não há mais o que precificar nem despublicar. Entra também a nota que a rodada de 09/08 deixou pronta para este registro: a tarefa **S318-T6**, o reparo dos dois kits de preço negativo em produção, fica **sem objeto** — a leitura de 10/08 encontra zero `itensKit` nos dois eventos.
>
> **Personagens dos exemplos.** Ana compra, Castelo organiza eventos, Marina opera o painel, Téo é influenciador afiliado. São ilustrativos, não pessoas do banco.
>
> **A conta de hoje: 28 itens abertos.** São **25** em "Decisões que dependem de você" e **3** em "Ações que só você pode executar" — contados à mão, um a um, contra as duas seções abaixo, já sem o COMPROMETIDO-1 e o VITRINE-2, que a purga de 10/08 fechou. Os cinco que entraram em 09/08 são os **ADMINVISAO-1 a ADMINVISAO-5**, da spec da visão master do painel admin: dois de dado pessoal, um de dinheiro, um de modelo e um de mecanismo. Eles fecham juntos, e a esteira não constrói as ondas que dependem deles enquanto isso não acontece. A "Fila de construção" no fim não é decisão e não entra na conta, agora sem exceção nenhuma: o **ADMIN-USUARIOS-1**, que morava lá dentro e pedia resposta sua, subiu para o bloco das decisões — você o decidiu em 09/08 e ele saiu na segunda troca de 10/08, dando lugar ao **ADMIN-USUARIOS-2**.

## Decisões que dependem de você

### LGPD-1 · um organizador pode ficar ativo sem prova de que aceitou o termo

O cadastro carimba o consentimento com a versão do termo, a finalidade e a hora do servidor. Quando a escrita desse perfil falha, o resgate do convite recria o registro mais adiante — e o recria **sem** o consentimento, com a conta já em `ativo`. A pessoa marcou o checkbox; o registro nunca existiu; e nada no produto sinaliza quem está nessa situação.

- **Caso de uso:** a organizadora aceita o termo no cadastro, a gravação do perfil falha sem ninguém perceber, ela entra pelo convite e opera a plataforma inteira sem que exista uma linha provando o aceite. Meses depois alguém pergunta quem aceitou o quê, e a resposta não está no banco.
- **Job story:** quando eu aceito o termo para começar a organizar, eu quero que fique registrado o que aceitei e em que momento, para que ninguém precise adivinhar depois se eu concordei.
- **O que fica com você:** escolher um dos três caminhos. Não há default proposto, e isso é deliberado: a review se recusou a escolher porque inventar o carimbo de consentimento fabricaria justamente a prova que a regra recusa.
- **Por que agora:** é decisão jurídica, não técnica, e ela trava a partida. O **seed do primeiro código de convite fica retido** até você responder, então nenhum organizador entra por convite enquanto isso.
- **Opções:** recoletar no resgate, com o overlay pedindo o aceite junto do código quando o registro falta — custa uma linha na tela e um campo na chamada · recusar a ativação sem aceite, com mensagem própria mandando falar com o time — mais rígido, e tranca gente legítima na porta · marcar e varrer, com o registro nascendo com o consentimento explicitamente vazio e um relatório listando quem está sem — não resolve, mas para de esconder.
- **Onde aterrissa:** `resgatarConviteOrganizador` e o overlay de convite; RN-412 e RN-446. Registro completo em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md §ONBOARD-REV`.
- **+04/08 · a porta segue fechada, e agora está medido depois de um deploy.** A lane DEPLOY-EMAIL subiu 18 functions e **re-provou as três da porta do organizador em 404** — `resgatarConviteOrganizador`, `gerarConviteOrganizador` e `revogarConviteOrganizador` —, com três controles positivos para que o 404 não seja sonda quebrada: uma function criada no mesmo deploy responde 204, o webhook responde 405, e o `provisionTenant` responde 204 com data de 28/07 intacta. Detalhe que vale registrar: das três, **só `resgatarConviteOrganizador` existe no código**; as outras duas nunca foram escritas. Produção tem 88 functions e o repositório exporta 89 — a diferença é exatamente ela.
- **+09/08 · a terceira frente entrou aqui, e ela era um item próprio até hoje de manhã.** O **ACEITE-1** perguntava qual texto do termo de saúde a pessoa aceitou, e a resposta é que ninguém sabe: o pedido guarda **a versão e a hora, e nada mais**. O texto é montado na hora da leitura, e o nome da produtora entra nele vindo do perfil vigente — então trocar o nome da produtora reescreve, para trás, perante quem cada pessoa declarou estar apta, sem versão nova e sem registro do que foi assinado. A assimetria é o que denuncia: o **termo de uso** guarda `materialHash`, a impressão digital do texto aceito, e o **termo de saúde** não guarda. Dois aceites lado a lado no mesmo pedido, um auditável e o outro não. O efeito prático hoje é nulo e está medido — os três aceites que sobrevivem à limpeza são compras de teste suas (`8CDHM`, `Q57PA`, `N4FHP`) —, e o preço sobe com cada venda real. **Os três caminhos:** carimbar `materialHash` no aceite de saúde igual ao do termo de uso, e versionar quando o texto muda · congelar o texto aceito dentro do pedido · deixar como está, assumindo que o termo de saúde é declaração da pessoa e não contrato com a produtora — defensável, mas precisa ser escolha e não acidente. Isto virou frente deste item em vez de continuar sozinho porque é prova de consentimento, que é a mesma conversa jurídica, e porque o próprio item pedia isso em letra. Onde vive: `aceites.saude` no documento do pedido, `paragrafosDoTermoSaude` em `AceitesCompra.tsx` e `resolverOrganizadorPublico` em `apps/landing/lib/leitor.ts`; medição em `.nirvana/handoffs/leela-limpeza-prod-20260806.md §T9`.
- **+04/08 (tarde) · nasceu a segunda frente de LGPD, e ela pega carona na mesma conversa jurídica.** A Arena Social (rodada `02-rodadas/2026-08-04-pos-pagamento/`) tem um campo que pode inferir orientação sexual — dado sensível do art. 11: os gêneros de pessoas com quem a pessoa quer se conectar. O tratamento já está escrito como contrato, não como decisão sua (RN-472: campo sempre opcional, consentimento específico com finalidade declarada, visibilidade só da própria pessoa por default, apagar apaga e revoga) — fica registrado aqui para a revisão jurídica que este item já pede cobrir as duas frentes de uma vez, em vez de abrir um segundo item de painel.
- **+09/08 · quarta frente: o radar de WhatsApp, e esta trava o F1 dele.** Você decidiu que o radar da comunidade mostra o **nome real** dos participantes ao organizador (JTBD: pirâmide de engajamento), **sem aviso publicado no grupo** (a transparência fica no termo do organizador e no perfil do contato do número radar). Isso é medição de comportamento em grupo com dado pessoal exposto a terceiro, sem consentimento direto do participante — a base legal desse tratamento e o termo que o organizador aceita precisam do mesmo advogado desta conversa, **antes do F1 do radar** (o F0, número observando 1 comunidade de teste sua, não depende). Decisões e defaults da rodada em `02-rodadas/2026-08-09-radar-whatsapp/01-decisoes-dono.md`; o estudo de arquitetura completo vive no Orkestra (trace `c5a4a8bd`).

### PCLIENTE-1 · o painel do cliente é a área que já existe amadurecendo, ou é outra coisa

Você pediu a spec do painel do cliente antes de qualquer código, e vai simular as telas no Claude Design. A varredura achou que a área do cliente **já está no ar** desde 05/08, com sete das oito coisas que você pediu em 04/08: ingressos em próximos e passados, histórico de compras, clubes e convites, meus dados e trocar senha, e o botão para o outro painel. Então o pedido não é uma superfície nova; é a forma que essa superfície toma.

- **Caso de uso:** você abre o Claude Design e simula dezoito telas: ou elas são o `/minha-conta` de hoje ganhando cara de painel, ou elas são um lugar novo. Simular a forma errada joga a simulação inteira fora.
- **Job story:** quando eu volto ao site depois de ter comprado, eu quero um lugar só que reúna meus ingressos, minhas compras e meus dados, para não ter de aprender duas casas diferentes da mesma marca. As duas opções servem gente diferente: a primeira serve a Ana, que só compra; a segunda serve quem compra e produz ao mesmo tempo, e é uma pessoa que hoje quase não existe na base.
- **O que fica com você:** confirmar a forma antes de simular.
- **Por que agora:** é a única decisão desta spec que precede o seu próprio próximo gesto. As duas ondas de construção que dependem dela ficam retidas até você olhar; a onda que conserta a porta quebrada não depende e pode sair antes.
- **Opções:** o painel do cliente é o **`/minha-conta` de hoje ganhando casca de painel** — cabeçalho de conta, navegação persistente, estados próprios —, no mesmo endereço e na mesma landing (**default proposto**, porque a área está no ar com callables, testes e deploy atrás dela, e porque a decisão de 04/08 já cravou que a casa dela é a landing) · o painel do cliente vira superfície **dentro do painel profissional**, com o alternador servindo os dois lados — custa derrubar a guarda que hoje barra na porta quem não é organizador, abrir o painel a todo participante do ecossistema e refazer a fronteira de autenticação que acabou de ser provada fechada com dezoito endereços em produção.
- **Onde aterrissa:** RN-511 em [[LEELA-E12-landing]]; história `S1233` e onda B de `02-rodadas/2026-08-06-painel-cliente/05-fila-codigo.md`. O inventário das dezoito telas, com propósito, estados e componentes, está em `02-rodadas/2026-08-06-painel-cliente/04-inventario-de-telas.md` — é o arquivo para levar ao Claude Design.
- **Achado que vale saber antes de responder:** a oitava coisa que você pediu, "criar conta de organizador", está no ar e **não funciona**. O botão manda quem está logada para o formulário de cadastro do painel, e como a conta dela já existe, o sistema devolve a negativa genérica e ela fica sem caminho. O conserto não depende desta sua resposta e já está especificado: virar profissional passa a ser promoção da conta que já existe, e ela aterrissa na vitrine que subiu hoje, com o campo do código Leela à mão.

### PONTE-CTA-1 · você deu três rótulos para a mesma porta, e só um deles pode subir por vez

Em 07/08 você escreveu que a primeira coisa a testar é **"Painel Profissional"** no lugar de "virar profissional", e que **podemos ter CTAs diferentes: "Criar Club" e "Organizar eventos"**. São três rótulos para o mesmo botão. Ao construir, apareceram dois fatos que mudam a pergunta.

- **Caso de uso:** você abre a área do cliente esperando ver dois botões e vê um só. A razão não é escopo: é que dois botões ali não mediriam nada, porque a landing não conta cliques.
- **Job story:** quando eu já compro na Leela e decido produzir a minha própria experiência, eu quero entender pelo nome do botão o que vou encontrar do outro lado, para não atravessar uma porta que não é a minha. Os três rótulos servem jobs diferentes: "Criar Club" serve quem quer reunir gente, "Organizar eventos" serve quem quer vender inscrição, e "Painel Profissional" serve os dois sem prometer nenhum dos dois.
- **O que fica com você:** dizer se o teste de rótulo vale o custo da medição, ou se a porta fica com um nome e pronto.
- **Por que agora:** o rótulo sobe junto com o conserto da porta quebrada, e trocar depois é um deploy a mais.
- **Os dois fatos que a construção trouxe:** *"Criar Club" não promete o que não existe* — a tela de criação de clube está construída, e o que a segura é o mesmo portão que segura a criação de evento, o código Leela; as duas intenções são simétricas e a vitrine já nomeia as duas áreas com o mesmo peso. E *a landing não tem uma linha de telemetria* — nenhum gtag, plausible, posthog ou evento próprio —, então dois botões lado a lado disparando a mesma promoção não diriam qual intenção converteu.
- **Opções:** **um rótulo por vez, sem instrumentar**, na ordem que você deu — "Painel Profissional" agora, e os outros dois a um deploy de distância cada (**default em vigor**, e é o que está construído: o rótulo é uma constante única na tela, `ROTULO_DA_TRAVESSIA`) · **medir pelo servidor**, que é o caminho barato e faltava no seu menu — a promoção já escreve uma linha de log a cada clique, com o identificador da conta, e um campo de "intenção" nessa mesma chamada diria qual botão foi apertado; como o resgate do código também loga, os dois se juntam pela conta e medem **conversão**, não clique; custa um campo, não uma infra · **instrumentar a landing** e rodar as três variantes com número, que é a primeira infra de medição do produto · **desistir do teste** e deixar "Painel Profissional" fixo, que é o nome que descreve com precisão o que o clique entrega.
- **Uma ponta de vocabulário, que é sua e não do maestro:** "Organizar **eventos**" e "Criar **Club**" são as suas palavras, e a casa fixou "experiência" e "participante" como guarda-chuva pela D-0802-1. As duas convivem hoje porque "Eventos" e "Clubs" são os nomes das **áreas do painel**, não categorias do produto. Se um desses rótulos vencer o teste e virar a porta permanente, a conversa de vocabulário volta.
- **Onde aterrissa:** `02-rodadas/2026-08-06-painel-cliente/06-desenho-do-cartao.md` tem o desenho completo e o que ficou de fora; o rótulo vive em `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx`. A lane que construiu recusou o campo de intenção de propósito, para não ampliar contrato de chamada na véspera da review antagonista — razão de calendário, não de impossibilidade.

### PONTE-NOME-1 · quem entra pela porta nova vira uma produtora com o nome próprio dela, para sempre

A porta nova promove a conta sem pedir formulário nenhum — é justamente isso que a tira do beco. O preço apareceu quando ela rodou contra banco de verdade: o campo "organização" nasce **vazio**, e no dia em que a pessoa resgata o código Leela o sistema precisa batizar a produtora dela. Sem organização, ele cai no nome da pessoa; sem nome, cai no pedaço do e-mail antes do arroba.

- **Caso de uso:** Ana Paula compra um ingresso, resolve organizar, resgata o código, e passa a operar uma produtora chamada "Ana Paula", com endereço interno `ana-paula`, que ela nunca escolheu e não tem como trocar. Quando ela convida uma assessoria parceira, esse nome viaja por e-mail dentro do link.
- **Job story:** quando eu passo de compradora a organizadora, eu quero escolher com que nome a minha produtora aparece, para não carregar para sempre um nome que o sistema escolheu por mim.
- **O que fica com você:** decidir se a porta pede o nome da produtora, se o batismo espera, ou se fica como está.
- **Por que agora:** o endereço interno é **cunhado uma vez e é definitivo**. Depois de resgatado o código, não existe renomear — nem para ela, nem pelo painel. Cada pessoa que atravessar antes da sua resposta fica com o nome pessoal grudado.
- **O que a review mediu, e é pior do que a construção supunha:** não é só que "preencher depois não corrige". É que **não existe o depois**. As regras do banco só deixam a pessoa **criar** o próprio registro de profissional, nunca alterá-lo; não há nenhuma tela nem chamada que a deixe escrever a organização mais tarde; e renomear a produtora é exclusivo de administrador da plataforma. A tela de conta do painel salva o nome de exibição da conta, que é outra coisa. O comentário no código que dizia "a pessoa preenche o perfil dela no painel" descreve algo que hoje não existe.
- **Onde o nome aparece fora do banco:** o convite de assessoria parceira monta o link com o endereço interno na própria URL, e esse link vai por e-mail a um terceiro. *Não* chega ao endereço público `/@handle` — a review mediu isso e o `/@handle` é outro registro, que a pessoa digita e escolhe. Mas o nome pessoal circula em link enviado para fora.
- **Opções:** **pedir o nome da produtora no próprio cartão** — um campo a mais na porta que existe para não ter formulário, e a decisão de produto foi justamente tirá-lo · **adiar o batismo** para o primeiro momento em que ela precisa do nome, já dentro do painel, e aí ela escolhe com contexto — mexe na regra do resgate · **abrir a edição** do registro para a própria dona, o que resolve o nome de exibição mas **não** o endereço interno, que continua definitivo · **deixar como está** e tratar o nome pessoal como padrão aceitável, já que a produtora de uma pessoa só costuma mesmo ser ela.
- **Não há default proposto**, e isso é deliberado: as quatro saídas custam coisas diferentes e uma delas é dado pessoal de titular virando identificador permanente — escolher por você seria escolher a sua exposição.
- **Onde aterrissa:** `promoverParaProfissional.ts` (o campo vazio), `resgatarConviteOrganizador.ts` (o batismo), `cadastrarAssessoria.ts` (o link). Registro completo em `.nirvana/handoffs/leela-retomada-20260808-PONTE-REV.md` §vetor 11.

### SERV-1 · o piso de R$ 3,00 é 30% da face numa experiência de R$ 10,00

Você fixou o piso do Serviço em R$ 3,00 e disse "a priori". A conta foi feita, e ela morde mais fundo do que a frase sugere: com a linha vigente de 10,5%, **o piso vale em toda compra de até R$ 28,52**, e nesse trecho o percentual efetivo sobe conforme o preço cai.

- **Caso de uso:** uma aula de ioga a R$ 10,00 paga R$ 3,00 de Serviço em vez de R$ 1,05. Como o modo padrão é a taxa incorporada, quem absorve isso é a professora, que recebe R$ 7,00 no lugar de R$ 8,95.
- **Job story:** quando eu vendo uma experiência barata, eu quero que a taxa da plataforma acompanhe o tamanho do que eu cobro, para que vender a R$ 10,00 continue fazendo sentido para mim.
- **O que fica com você:** ratificar os R$ 3,00, ou trocar o número. O mecanismo não depende disso — a tabela nasce vazia e nada muda em produção enquanto o valor não for configurado na tela.
- **Por que agora:** a fila que constrói o piso pode subir inteira sem você, mas o dia em que alguém digitar o valor é o dia em que o preço de toda venda pequena muda. Melhor ver a tabela antes.
- **Opções:** **R$ 3,00 como você escreveu** (**default proposto**, porque é o seu número e o efeito está medido) · um valor menor, que encolhe a faixa mordida · um piso **por modo de taxa**, cobrando o piso cheio quando o comprador paga e um menor quando o organizador absorve — mais justo e mais uma regra para explicar.
- **Onde aterrissa:** RN-491 em [[LEELA-E04-config-vendas]]; a tabela de efeito em `02-rodadas/2026-08-05-metricas-e-servico/02-spec-metricas-e-servico.md` §"O piso, em números".

### SERV-2 · numa venda de R$ 2,00 o piso é maior que a venda inteira

Sua frase tratou de taxa pequena, não de venda pequena. Numa venda abaixo de R$ 3,00 com a taxa incorporada, o organizador receberia **valor negativo** — o líquido dele é a face menos o Serviço. Nada no produto sabe representar isso: o clamp em zero existe só uma camada acima, no agregado, e ele esconde a divergência em vez de resolvê-la, fazendo o repasse deixar de bater com a soma das vendas. Hoje nada impede uma venda de R$ 2,00: o único mínimo que existe recusa preço zero.

- **Caso de uso:** o Castelo publica um ingresso simbólico de R$ 2,00 para um mutirão, vende trinta, e a plataforma calcula que ele deve R$ 30,00.
- **Job story:** quando eu abro uma inscrição simbólica de dois reais, eu quero que a conta feche em zero e nunca contra mim, para que cobrar pouco não vire dívida com a plataforma.
- **O que fica com você:** escolher entre limitar o Serviço ou limitar o preço.
- **Por que agora:** é uma linha de código na aritmética se decidida antes, e uma migração de dado financeiro se decidida depois.
- **Opções:** **o Serviço nunca ultrapassa a face** (**default proposto** e já em vigor na spec) — numa venda de R$ 2,00 o organizador recebe R$ 0,00 e a plataforma fica com os R$ 2,00; nada quebra, mas a venda vira trabalho de graça para ele · **preço mínimo de venda** acima do piso, que resolve na origem e cria uma regra a explicar para quem quiser vender barato · deixar negativo e mostrar como dívida, que eu **recomendo recusar**, porque nenhuma tela do produto sabe desenhar saldo devedor de organizador.
- **Onde aterrissa:** RN-494 em [[LEELA-E09-financeiro-profissional]].

### SERV-3 · até onde vai a palavra "Serviço"

Você escreveu a palavra entre aspas, e a leitura literal tira duas palavras do rótulo, não uma. Isso muda o tamanho do trabalho, porque **o comprador já lê "Taxa de serviço" no checkout** — se o alvo fosse só apagar a marca, o checkout não teria tarefa nenhuma. E há uma segunda pergunta embutida: o painel que **você** opera chama a mesma coisa de "Taxa da plataforma", e ali quem lê precisa distinguir esta cobrança das outras.

- **Caso de uso:** a Ana vê "Serviço (PIX) · R$ 3,00" no resumo da compra; você abre `/plataforma/taxa` e vê "Serviço da plataforma" ou "Taxa da plataforma", dependendo da sua resposta.
- **Job story:** quando eu leio o resumo antes de pagar, eu quero entender o que é cada linha cobrada, para não achar que estão me empurrando uma taxa escondida. No super-admin quem lê é você, e ali a palavra tem outro trabalho: separar esta cobrança das outras que a mesma tela mostra.
- **O que fica com você:** confirmar a leitura literal, e dizer se o super-admin acompanha.
- **Por que agora:** são 34 strings em três aplicações, e trocá-las duas vezes é o desperdício que a pergunta evita. A fila do renome está retida esperando esta resposta.
- **Opções:** **"Serviço" para comprador e organizador, "Serviço da plataforma" no super-admin** (**default proposto**, porque segue a sua letra onde o público é externo e mantém a desambiguação onde o público é você) · "Serviço" em tudo, inclusive no super-admin · manter "Taxa de serviço" para o comprador e trocar só onde diz "Leela", que é a leitura mínima da sua frase.
- **Onde aterrissa:** RN-495 em [[LEELA-E12-landing]]; tarefas 4a, 4b e 4c de `02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`.

### ESTOURO-2 · o pendente de cartão reserva vaga por quanto tempo

Você decidiu o ESTOURO-1 em 09/08 — pagamento pendente segura a vaga, e a vaga volta ao vencer — e a spec que o formaliza aterrissou em 10/08 (`02-rodadas/2026-08-10-estouro-reserva/`, RN-543 a RN-545, com a varredura automática do PIX vencido que faltava). Sobrou **uma** pergunta que a sua frase não alcança: o PIX vence em 30 minutos e a varredura o executa, mas o pedido pendente de **cartão** não tem vencimento nenhum — a confirmação normalmente chega em segundos, e um webhook perdido deixaria o pendente vivo para sempre. Sob a reserva, "para sempre" é uma vaga presa que ninguém consegue soltar.

- **Caso de uso:** um comprador paga com cartão e o webhook do gateway se perde. Com reserva sem teto, a última vaga do lote fica presa até alguém da plataforma intervir à mão; com teto, ela volta sozinha em 30 minutos — e se a confirmação atrasada chegar, a pessoa entra do mesmo jeito, com o eventual excedente aparecendo no painel como a RN-498 já manda.
- **Job story:** quando eu vendo um evento com poucas vagas, eu quero que vaga presa a pagamento que não anda volte sozinha para a venda, para não perder inscrição real por causa de um webhook perdido.
- **O que fica com você:** o teto da reserva do pendente de cartão. A sua letra cobre "pagamento pendente" sem distinguir meio, então a reserva de cartão nasce dela; o que a letra não diz é quando ela solta, e escolher isso em silêncio seria decidir estoque por você.
- **Por que agora:** a história da reserva (S323) está especificada e a tarefa do cartão (`S323-T7`) fica retida até esta resposta — o resto da frente não espera.
- **Opções:** **teto de 30 minutos, o mesmo número do PIX** — a vaga volta, o pedido continua vivo, confirmação atrasada entra e o excedente aparece pela RN-498 (**default proposto**: um número só no sistema, nenhum pedido cancelado, nenhuma vaga presa) · **reserva de cartão sem teto**, até o webhook final — fecha 100% da venda dupla no cartão ao custo de a vaga ficar presa enquanto o webhook não vier, que é a classe de defeito que a varredura existe para matar · **cartão não reserva** — só o PIX segura vaga; diverge da sua letra e reabre no cartão a corrida que você fechou, então só entra se for escolha sua explícita.
- **Onde aterrissa:** RN-546 em [[LEELA-E04-config-vendas]] (nasce na forma da sua resposta); tarefa `S323-T7` em `02-rodadas/2026-08-10-estouro-reserva/04-fila-codigo.md`. Detalhe em `03-spec.md §Parte 5` da mesma rodada.

### SEMKIT-1 · o reparo dos dois kits em produção é escrito em campo de preço, e isso precisa da sua autorização

Você acabou de dizer que a plataforma não vende desconto por dispensar o kit. Existem dois documentos em produção que fazem exatamente isso: um "Sem kit" de **−R$ 15,00** na Meia Floripa 2026 e um de **−R$ 10,00** na São Silvestre 2025. Os dois vieram do seed, não de organizador, e a apuração conferiu o que importa antes de propor qualquer coisa: **ninguém comprou nenhum dos dois**. Zero inscritos apontam para eles, zero pedidos, zero pagamentos — e o modelo de pedido nem tem campo de kit, então não existe caminho para um pedido referenciar um. *Mexer neles não mexe em dinheiro que já entrou.*

- **Caso de uso:** você abre a Meia Floripa 2026 para mostrar o produto a alguém e a lista de kits traz um "Sem kit" de −R$ 15,00, que é exatamente o desconto por dispensar o kit que você acabou de proibir. Pelo painel você não consegue arrumar: o campo está bloqueado porque o evento já vendeu.
- **Job story:** quando eu mostro a plataforma a um organizador novo, eu quero que os dados que ele vê digam a mesma coisa que as regras dizem, para o produto não ensinar o contrário do que eu decidi.
- **O que fica com você:** **a autorização, e só ela.** Qual dos três reparos era escolha de engenharia e saiu deste painel em 09/08, com o default **zerar o preço dos dois** — o movimento mínimo que obedece à regra nova, preserva a opção que as modalidades 5k e 10k já oferecem, não mexe na capacidade derivada do evento e produz exatamente o padrão de saída de que a regra fala. O registro, com as duas alternativas recusadas e o porquê, está em `02-rodadas/2026-08-09-corte-painel/01-decisoes-maestro.md`.
- **Por que a autorização continua sendo sua:** o reparo é escrito em **campo de preço** de produção, como **exceção declarada à RN-200**, que congela preço de kit depois da primeira venda — e os dois eventos têm 462 e 40 inscritos. **Você não consegue fazer isso pela tela do painel**: o campo aparece bloqueado e apagar o kit é negado. A régua desta casa é que dinheiro não anda sem você, e preço de kit é preço, mesmo quando a medição prova que não há comprador para proteger.
- **Por que agora:** enquanto os dois documentos existem, a demonstração do produto ensina o contrário do que você decidiu. E há um detalhe de ordem que não pode ser esquecido: o seed de produção já rodou duas vezes, então **a fonte tem de ser corrigida antes do banco**, senão uma terceira execução ressuscita os dois.
- **Onde aterrissa:** RN-509 em [[LEELA-E03-operacao-evento]]; tarefas 2a e 2b de `02-rodadas/2026-08-05-sem-kit/04-fila-codigo.md`. A tarefa da fonte sobe de qualquer forma; só o reparo em produção espera por você.
- **+10/08 · o reparo em produção ficou sem objeto.** A leitura de 10/08 encontra zero `itensKit` nos dois eventos: os documentos de preço negativo já não existem, e a `S318-T6` fecha sem rodar. O que esta decisão ainda governa é a fonte do seed (`S318-T5`) e o comportamento de eventos futuros.

### SEMKIT-2 · a plataforma garante ao participante uma forma de se inscrever sem kit, ou isso é escolha do organizador

Sua decisão tem uma consequência que prefiro escrever do que deixar você descobrir na tela. Onde a modalidade oferece kits, **escolher um sempre foi obrigatório** — isso já é o código, não muda nada agora. O que fazia a etapa parecer suave é que o "Sem kit" estava dentro da lista, e escolhê-lo satisfazia a exigência. Sem ele, uma modalidade que só tem kits pagos passa a obrigar a compra de um kit para se inscrever.

- **Caso de uso:** a Ana quer correr os 5k e não quer a camiseta. Se o Castelo não criar um kit de R$ 0,00, ela paga a camiseta ou não corre.
- **Job story:** quando eu me inscrevo só para participar, eu quero uma opção sem kit, para não pagar por uma camiseta que eu não vou usar. O organizador é servido pelo lado oposto: quem quer que todo participante leve o brinde do patrocinador precisa poder não abrir essa saída.
- **O que fica com você:** se a plataforma **garante** essa saída, ou se ela é escolha de cada organizador.
- **Por que agora:** é uma regra na criação do evento enquanto nada existe. Depois, é migrar evento configurado.
- **Opções:** **é escolha do organizador** (**default proposto**, e ele vem da sua própria frase) — quem quiser abrir a saída cria um kit de R$ 0,00, e quem quiser que todo participante leve o brinde do patrocinador simplesmente não cria; forçar a saída em toda modalidade trabalharia contra a razão que você deu · **a plataforma garante**, exigindo que toda modalidade com kits tenha pelo menos um de preço zero — mais protetor para quem compra, e tira do organizador uma decisão comercial que é dele · **a plataforma sugere**, criando o kit de R$ 0,00 por padrão e deixando apagar, que é o meio-termo e o único que muda o comportamento de eventos futuros sem impedir nada.
- **Onde aterrissa:** RN-508 em [[LEELA-E03-operacao-evento]]. **Não retém tarefa nenhuma** — o default está em vigor; a segunda ou a terceira resposta acrescentariam tarefa na frente 1 de `02-rodadas/2026-08-05-sem-kit/04-fila-codigo.md`.

### 12 · domínio público

Todo endereço do produto ainda é o marcador `{DOMINIO_LEELA}`, e o remetente definitivo do e-mail depende dessa escolha.

- **Caso de uso:** o Castelo quer divulgar a página do evento no Instagram, e o endereço de hoje nasce para quebrar. É um subdomínio de hospedagem que vai mudar de nome no dia em que o domínio de verdade existir.
- **Job story:** quando eu divulgo a página do meu evento, eu quero um endereço que eu não tenha vergonha de colar e que continue funcionando depois, para não ter de reeditar cada post no dia em que o site mudar de casa.
- **O que fica com você:** cravar o domínio público da Leela.
- **Por que agora:** o produto já está no ar em `leela-landing.web.app` e o e-mail transacional sai por `vitoreldp@gmail.com`, que o DMARC do Gmail tende a jogar em spam quando a Brevo envia por ele.
- **Onde aterrissa:** env dos dois apps, substituição do marcador nas specs e verificação DKIM/SPF/DMARC na Brevo. Puxa junto o item 66 e o placeholder `contato@leela.app`, que a porta de entrada do organizador já usa como CTA de "Falar com o time Leela".

### PB-11 · no retry, a prova de aceite carimba a versão que a pessoa não leu

A conferência de versão vale na criação do pedido: se a tela declara uma versão diferente da vigente, o servidor recusa. No retry de uma compra já nascida, o carimbo usa a vigente sem conferir a exibida, e isso está medido: pedido sem bloco de aceite, política na v3, retry declarando a v1, resultado carimba a v3.

- **Caso de uso:** a Ana aceita a v1, a política vira v3 no meio da compra, e o retry carimba a v3 que ela nunca leu. O documento fica com uma prova, e a prova aponta para um texto que não estava na tela dela.
- **Job story:** quando eu aceito uma política antes de pagar, eu quero que fique registrado exatamente o texto que estava na minha frente, para que a prova do meu aceite corresponda ao que eu li.
- **O que fica com você:** escolher entre prova ausente e prova errada. Recusar ali deixaria sem prova um pedido já pago.
- **Por que agora:** é decisão jurídica, não técnica, e o caso de teste já está escrito no ponto exato onde a decisão vira código.
- **Opções:** carimbar a vigente e manter a compra viva (**em vigor**) · recusar o retry divergente e ficar sem prova nesse pedido.
- **Onde aterrissa:** `aceitesVersaoExibida.integration` e o caminho de replay de `createInscricaoCharge`.

### ARENA-1 · quem vê o que a pessoa preencheu na Arena Social

Você pediu a Arena Social — mini bio, gênero, gêneros de interesse (pessoas e experiências), interesses nos pilares de bem-estar e a foto da conta. A frase não diz quem vê, e visibilidade é a diferença entre um formulário e uma rede.

- **Caso de uso:** a Ana preenche a mini bio e os interesses. Ou só ela vê, e a área ainda não conecta ninguém, ou outros participantes veem, e o produto precisa dizer isso a ela antes de ela preencher.
- **Job story:** quando eu escrevo sobre mim numa plataforma, eu quero saber quem vai ler antes de começar a escrever, para decidir o quanto eu conto. As duas opções servem gente diferente: quem quer conhecer pessoas na mesma experiência é servida pela abertura, e quem só quer guardar os próprios dados é servida pelo fechamento.
- **O que fica com você:** dizer quem vê o perfil da Arena.
- **Por que agora:** a resposta desenha as Rules e as telas antes de virar código; mudar visibilidade depois de dado preenchido é retrabalho com dado de gente real.
- **Opções:** só a própria pessoa vê, e a abertura para outros participantes vem depois, junto da feature de conexão (**default proposto** — o dado nasce guardado e nenhuma promessa é feita antes da hora) · participantes de uma mesma experiência veem o perfil de quem optou por aparecer · organizador da experiência também vê. Em qualquer opção, o campo de gêneros de pessoas segue a régua própria da RN-472 e **nunca** fica visível por default.
- **Onde aterrissa:** RN-471 e RN-472 em [[LEELA-E12-landing]]; S1226 em `02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`.

### ARENA-4 · Vocabulário · o corte da lista derivada de pilares e modalidades

Você decidiu o método em 09/08: a lista de interesses da Arena sai dos pilares e modalidades disponíveis (*"podemos usar de base"*). A spec formalizou a derivação (RN-553 a RN-556, `02-rodadas/2026-08-10-arena-2-lista/`) e a medição corrigiu a premissa do item antigo: a listagem existe — RN-114 define os 3 pilares (Físico, Mental, Espiritual) e as 16 ações do catálogo, e o clube tem 9 modalidades de vocabulário fechado. O que sobrou é a escolha que só você pode fazer: as fontes se sobrepõem em cinco práticas (Correr ↔ Corrida de rua, Caminhar ↔ Caminhada, Pedalar ↔ Ciclismo, Nadar ↔ Natação, Yoga/alongamento ↔ Bem-estar/Yoga) e algumas ações têm rótulo de hábito, não de interesse.

- **Caso de uso:** a Ana abre a Arena e escolhe interesses numa lista que é a mesma taxonomia dos clubes e desafios. Se a lista dela disser "Corrida" e o clube disser "Corrida de rua", é a mesma coisa com dois nomes — e é você quem diz qual nome o produto fala.
- **Job story:** quando eu escolho o que me interessa, eu quero categorias com nome de interesse e não de tarefa, para me reconhecer na lista em vez de decifrá-la.
- **O que fica com você:** o corte sobre a tabela de 20 termos da spec (§Parte 5 de `03-spec.md` da rodada) — quais entram, quais rótulos mudam, e se as cinco fusões valem. Dois rótulos foram reescritos pela esteira ("Sono e descanso" para dormir-7h, "Menos tela" para limitar-tela-noite) e estão marcados para o seu veto ser barato.
- **Por que agora:** a tela de interesses (S1226) não nasce sem a lista, e a mesma lista serve a categorização da home que você avisou que vai mexer (D-0802-1). Nascer uma vez, num lugar só, evita duas listas divergindo. Uma honestidade de medição: a proposta não traz "eventos por termo" porque a produção congelada de 10/08 tem 2 eventos de teste — a ancoragem é a taxonomia canônica, não uso que ainda não existe.
- **Opções:** **ratificar a tabela** (20 termos em 3 pilares, fusões e rótulos como estão — **default proposto**) · cortar/acrescentar/renomear sobre a tabela, e a RN-557 nasce na forma da resposta · só pilares (Físico/Mental/Espiritual sem granular — a lista mínima que a sua frase permite).
- **Onde aterrissa:** RN-557 em [[LEELA-E12-landing]] (nasce na forma da resposta); `S1245-T2` em `02-rodadas/2026-08-10-arena-2-lista/04-fila-codigo.md`.

### CRM-1 · quais visões entram na primeira leva do CRM

Você perguntou que outras informações estratégicas o painel CRM podia mostrar ao organizador. A varredura achou dez visões possíveis e mediu o custo de cada uma; seis saem de dado que já está no banco, quatro dependem de coleta ou de destravar outra coisa. A ordem proposta não é por sofisticação, é por quanto cada uma muda uma decisão que o Castelo toma de verdade.

- **Caso de uso:** o Castelo abre o CRM e vê perfil de idade e sexo. O que ele precisava saber era se o link do Téo trouxe venda nova ou só comissão sobre venda que ele já teria feito de qualquer jeito.
- **Job story:** quando eu abro o CRM depois de uma campanha, eu quero saber o que de fato mudou a minha venda, para escolher onde colocar o próximo real de esforço.
- **O que fica com você:** dizer quais entram na primeira leva. Este é veto de escopo, não de mecanismo — cada visão recusada continua escrita e volta quando você quiser.
- **Por que agora:** cada visão é um agregado mantido por Function, e agregado é barato de nascer e caro de aposentar. Escolher quatro agora custa menos que construir dez e descobrir que três ninguém abre.
- **Opções:** as quatro que saem de dado pronto e não pedem nada a ninguém — **de onde veio a venda** (cupom, afiliado, direto, com a comissão de cada canal), **distribuição geográfica**, **quem pagou e não apareceu** e **como o seu público paga** (PIX contra cartão, e em quantas parcelas) — deixando recorrência, funil e motivo de estorno para a leva seguinte (**default proposto** — é o corte que entrega dinheiro e logística primeiro, e nenhuma delas pede um campo novo) · a lista inteira das construíveis de uma vez, que é mais trabalho num lote e adia a primeira entrega · só a geografia, que foi o que você pediu por nome, e o resto espera.
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 2; fila em `03-fila-proposta.md` Frentes 1 e 3. As regras nasceriam em [[LEELA-E19-crm]] e [[LEELA-E11-analytics]].

### CRM-2 · a localização entra como agregado, e o endereço continua fora da ficha do cliente

Você perguntou se dá para fazer algo com localização e endereço. Dá, e o dado já está inteiro no banco desde o checkout novo: CEP, rua, bairro, cidade e UF, persistidos por pedido. O que existe é uma premissa escrita reservando essa decisão para você — a **P-CKMOD-1** diz que endereço nunca entra no doc do cliente e que incluí-lo "exige decisão explícita do Vitor registrada aqui". A pergunta de hoje é exatamente ela, dezoito dias depois.

- **Caso de uso:** a Marina quer saber de que bairros vem o público para escolher onde montar o balcão de retirada de kit. Ou ela vê a contagem por bairro, ou ela vê o endereço da Ana na ficha dela, e as duas coisas são muito diferentes.
- **Job story:** quando eu planejo a retirada de kit, eu quero saber de que região vem o meu público, para escolher o ponto certo sem precisar do endereço de ninguém em particular.
- **O que fica com você:** autorizar a contagem agregada por cidade e bairro, e dizer se o endereço passa também a aparecer na ficha individual do cliente.
- **Por que agora:** o desenho do agregado muda conforme a resposta, e ele nasce com Rules próprias. Mudar depois de existir contagem é reprocesso; mudar depois de existir endereço em ficha é dado de gente real que saiu e não volta.
- **Opções:** **agregado sim, ficha não** (**default proposto** — a contagem por cidade e bairro nasce no mesmo molde da demografia, sem identidade, com a mesma supressão de privacidade do cohort, e a premissa P-CKMOD-1 continua valendo para a ficha) · agregado e ficha, o que dá ao organizador o endereço de cada pessoa numa área que hoje não tem controle de papel — eu **recomendo recusar**, porque é o mesmo desenho que o P-IAMENU-1 já registrou como buraco · nada, e a pergunta fica respondida com "temos o dado e escolhemos não usá-lo".
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 3; tarefas 2a a 2d em `03-fila-proposta.md`. A premissa P-CKMOD-1 vive em [[LEELA-E19-crm]] e é ela que muda de estado.
- **Duas coisas que a resposta não decide e você precisa saber.** O endereço é do **comprador**, uma vez por pedido, nunca por participante — quem compra quatro ingressos dá um endereço, então o mapa descreve de onde vem o dinheiro, não de onde vem a gente. E a **distância até o local do evento não é calculável**, porque o evento não tem endereço estruturado: `local` é texto livre e não existe coordenada em lugar nenhum. Estruturar o endereço do evento é tarefa própria, vale por si (mapa na página pública, endereço certo no ingresso, busca por proximidade na vitrine) e não espera este item.

### CRM-3 · o e-mail que já pedimos a cada participante é jogado fora

Este item não escolhe entre dois futuros: ele conserta uma coisa que ninguém decidiu. O checkout exibe um campo de e-mail para **cada** atleta, obrigatório, a pessoa preenche, o payload envia, o servidor valida — e a gravação monta o bloco de dados pessoais com CPF, nascimento, gênero e telefone, sem e-mail. O campo nunca existiu no modelo, e a esteira herdou o buraco como se fosse regra.

- **Caso de uso:** a Ana compra quatro ingressos para a família e digita o e-mail dos quatro. O Castelo consegue falar com uma pessoa, a Ana, e as outras três são invisíveis para qualquer comunicado dele.
- **Job story:** quando eu dou o meu e-mail na hora da inscrição, eu quero receber o que diz respeito ao evento em que eu vou entrar, para não depender de quem pagou por mim para saber a que horas é a largada.
- **O que fica com você:** autorizar guardar esse e-mail. É expansão do que se guarda sobre alguém que não é o comprador, então é sua, e não da esteira.
- **Por que agora:** custo de atrito **zero** — o campo já está na tela e já é obrigatório; ninguém digita nada a mais. E há um efeito colateral bom que some se a decisão demorar: a chave que une o mesmo cliente entre os seus eventos tenta CPF, depois e-mail, depois um identificador de sessão; sem e-mail, todo participante que não comprou cai no último recurso e vira cliente novo a cada evento.
- **Opções:** guardar, com a mesma disciplina de minimização do resto do bloco (**default proposto** — é o maior retorno sobre esforço de toda a proposta, e o dado já foi coletado com a pessoa vendo o que digitava) · não guardar, e aí vale tirar o campo do checkout, porque pedir um dado obrigatório e descartá-lo é pior que não pedir · guardar só com uma frase explícita na tela dizendo para que serve, o que é mais honesto e custa uma linha.
- **Onde aterrissa:** tarefa `COL-T1` em `02-rodadas/2026-08-05-crm-estrategia/03-fila-proposta.md`; o campo nasceria em `packages/core/src/eventos/dadosPessoais.ts` e a regra em [[LEELA-E19-crm]], ao lado da RN-172.

### CRM-4 · o que se pede ao participante depois da compra, e em troca de quê

A segunda metade da sua pergunta foi sobre os campos que incentivamos as pessoas a responder com o tempo. A resposta curta da esteira é que **nada novo entra no checkout** — ele é a única tela onde o dinheiro entra, e cada campo a mais é venda perdida. O que existe é uma escada para fora dele, e ela precisa de você porque cada degrau é uma promessa feita a quem responde.

- **Caso de uso:** a Ana acabou de pagar e está na tela de confirmação com o ingresso na mão. É ali que confirmar o endereço de entrega custa quase nada, e é ali que perguntar a renda dela seria uma invasão.
- **Job story:** quando eu acabei de pagar e estou aliviada, eu quero responder só o que me devolve alguma coisa na hora, para sentir que estou completando a minha compra em vez de preencher pesquisa dos outros.
- **O que fica com você:** dizer até que degrau a gente sobe, e qual contrapartida é dita em voz alta.
- **Por que agora:** a tela de pós-pagamento e a área do cliente acabaram de nascer, e o FormBuilder é a próxima frente da fila. Decidir agora faz os pedidos nascerem no lugar certo em vez de virarem campo avulso depois.
- **Opções:** **degraus 1 e 2 agora** (**default proposto** — degrau 1 é conserto sem atrito nenhum: guardar o e-mail que já se pede, guardar o código de município que o consultor de CEP já devolve e a gente descarta, e copiar cidade e UF do endereço quando o participante é o próprio comprador; degrau 2 é a confirmação logo depois da compra, com contrapartida imediata e verdadeira — "confirme para o kit chegar certo") · subir também o degrau 3, o perfil de interesses, que é a Arena Social e depende dos vetos ARENA · subir tudo, incluindo a pergunta de satisfação depois do evento, que depende do canal de e-mail travado na chave do Brevo.
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 7; tarefas `COL-T2` e `V2-T3` em `03-fila-proposta.md`.
- **O que a esteira recusa pedir, em qualquer degrau:** renda, profissão, estado civil e número de filhos. São os campos que todo formulário de evento pede, que nenhum organizador abre depois, e que cada um obriga a guardar, justificar e expurgar dado pessoal sem que nenhuma decisão melhore.

### CLUBES-1 · "Meus Clubes" nasce vazio porque não existe caminho para um participante entrar num clube

A aba de clubes da área do cliente foi construída e funciona. O que a descoberta feita antes de codar devolveu é maior que a aba: **não existe hoje nenhum caminho pelo qual uma pessoa entre num clube**. A varredura por escritores de membros no repositório inteiro devolve três, e nenhum é do participante — a soma automática, as ações do painel do organizador e os dados de exemplo. Não há função de entrar, e o código de convite de clube que a regra prevê não é consumido em lugar nenhum fora do seed. O convite de membro comum tem a mesma forma: o e-mail sai, o documento é criado, e **não existe máquina que o transforme em membro**.

- **Caso de uso:** a Ana abre a área dela, clica em Clubes, e a tela diz honestamente que ela não participa de nenhum. Vai continuar dizendo isso para sempre, porque o produto não tem por onde ela entrar em um.
- **Job story:** quando eu vejo uma aba de clubes na minha conta, eu quero conseguir entrar em algum, para a aba fazer alguma coisa por mim além de informar que está vazia.
- **O que fica com você:** dizer se a entrada no clube vira frente própria agora, ou se a aba fica declaradamente informativa até lá.
- **Por que agora:** a aba subiu no deploy de 05/08 e **está no ar**, então a tela vazia já é o que a pessoa vê. Ajustar o que ela promete continua barato, mas deixou de ser gratuito. E porque isto não é borda: **é o caso normal** de praticamente toda conta real, e uma tela que fica vazia para todo mundo é uma tela que pede explicação.
- **Opções:** **manter o estado vazio honesto e abrir a entrada numa rodada própria** (**default proposto**) — a tela foi escrita de propósito para não prometer um botão que não existe, e a entrada no clube é épico de produto (E05), com convite, aceite e vínculo, não um ajuste de tela · **construir a entrada agora**, o que puxa a frente inteira do clube para dentro desta rodada · **esconder a aba até existir caminho de entrada**, que eu recomendo recusar: você pediu Meus Clubes no escopo da área, e esconder resolve a tela em vez de resolver o produto.
- **Onde aterrissa:** `functions/src/cliente/meusClubes.ts` e `PainelClubes.tsx`; RN-101 e RN-451 em [[LEELA-E05-clubs]] e [[LEELA-E12-landing]]. Medição em `.nirvana/handoffs/leela-pixreal-diag-20260804-BUILD-B4.md` §1.1 e §1.7.

### ADMIN-USUARIOS-2 · aprovar existe; recusar e revogar, não

Sua decisão de 09/08 criou as duas portas de aprovação (código ou liberação direta) e a spec de 10/08 as formalizou (`02-rodadas/2026-08-10-admin-usuarios/`). O que a sua frase não alcança: o que você faz com um cadastro que **não** quer aprovar, e o que acontece se quiser desfazer um acesso já concedido. Hoje não existe nem um nem outro — a fila só cresce, e a única revogação do sistema é a de **convite ainda não usado**; conta liberada não tem caminho de volta pelo painel.

- **Caso de uso:** um cadastro claramente de teste (ou de má-fé) entra na fila e fica lá para sempre, na frente de gente real, porque não há gesto de recusa. Ou: você libera alguém por engano, e desfazer vira operação de engenharia em vez de um botão.
- **Job story:** quando eu olho a fila de cadastros, eu quero poder tirar da frente o que não vou aprovar, para a fila ser a lista real de quem espera decisão minha.
- **O que fica com você:** se a recusa existe (e o que ela diz à pessoa), e se a revogação existe (e o que ela faz com o tenant já provisionado).
- **Por que agora:** a tela da fila (S1615) nasce agora; nascer sem o gesto de recusa é barato de aceitar hoje e caro de remendar quando a fila tiver volume. E o que já está cravado pela RN-552, qualquer que seja a sua resposta: recusa e revogação, se existirem, deixam o mesmo rastro da aprovação, e revogação **nunca apaga dado** — no máximo suspende o tenant, que o lifecycle já sabe fazer.
- **Opções para a recusa:** **fila sem recusa por ora** — cadastro indesejado simplesmente não é aprovado (**default proposto**, porque não inventa comunicação com a pessoa nem estado novo sem caso real) · recusa explícita com estado próprio, sem avisar a pessoa · recusa explícita com aviso à pessoa — a mais honesta e a que mais decide por você (copy, tom, canal).
- **Opções para a revogação:** **não nasce nesta fase** (**default proposto** — nenhum caso real a pediu, e revogar organizador com vendas vivas tem consequência em cascata) · revogação = suspender o tenant pelo lifecycle que já existe, sem apagar nada.
- **Onde aterrissa:** RN-552 (nasce na forma da resposta); tarefa `S1616-T5`. Detalhe em `02-rodadas/2026-08-10-admin-usuarios/03-spec.md §Parte 5`.

### ADMINVISAO-1 · o que a ficha da produtora chama de "faturamento gerado"

Você pediu "análise de faturamento gerado" por tenant. A palavra `faturamento` **não existe no código** — existem três números gravados que ela poderia nomear, e um quarto que não existe em lugar nenhum: `custoGateway`, `custoReal`, `receitaPlataforma` e qualquer cálculo de margem têm zero ocorrências em `packages/core`, `packages/api-client` e `functions/src`.

- **Caso de uso:** você abre a ficha do Castelo para decidir se a taxa dele está certa e lê "faturamento gerado: R$ 120 mil". Se isso for GMV, é o que os compradores pagaram e não diz nada sobre o que sobrou para você. Se for receita da plataforma, é o que você faturou antes de pagar o gateway. Os dois são verdadeiros e levam a decisões opostas.
- **Job story:** quando eu olho uma produtora para decidir preço, eu quero saber exatamente qual dinheiro cada número representa, para não negociar taxa olhando para a cifra errada.
- **O que fica com você:** qual dos três a ficha chama de "faturamento gerado", e se a tela mostra os três com nomes distintos.
- **Opções:** exibir **os três, nomeados** — GMV do produtor, receita da plataforma (bruta) e líquido do produtor —, com a coluna de margem vazia e rotulada "custo não configurado" até a S1610 subir (**default proposto**, porque não esconde nem inventa) · exibir **só GMV** e deixar receita e margem para depois da S1610 · esperar a S1610 inteira antes de qualquer número de faturamento na ficha, o que atrasa os dez outros itens por causa de um.
- **Onde aterrissa:** RN-537 em [[LEELA-E16-plataforma-superadmin]]; tarefa `S1613-T4`. Detalhe em `02-rodadas/2026-08-09-admin-visao/03-spec.md §V-1`.

### ADMINVISAO-2 · a aba de clientes mostra comportamento, ou mostra contato

O CRM guarda, de propósito, muito pouco de cada cliente: nome, gênero, nascimento, quantidade de eventos e inscrições, valor gasto e LTV. Não guarda CPF, e-mail, telefone, cidade, endereço nem restrição médica, e a chave do documento é hash. Isso é a RN-172, e é desenho. O contato existe noutro lugar: `pedidos.responsavel` tem e-mail e telefone, e `inscritos.dadosPessoais` tem CPF e telefone.

- **Caso de uso:** você abre a aba Clientes do Castelo para entender quem compra dele. Se a tela mostrar só comportamento, você vê padrão de consumo e não vê pessoa. Se mostrar contato, o painel master vira uma agenda de e-mails e telefones de todos os participantes de todos os produtores, num lugar só.
- **Job story:** quando eu analiso a base de uma produtora, eu quero entender o comportamento de compra dela sem virar depositário do contato de gente que nunca falou comigo.
- **O que fica com você:** se a aba Clientes é comportamento ou é contato.
- **Por que agora:** as duas custam a mesma tela e fronteiras completamente diferentes. Comportamento usa um callable sobre o CRM e não abre nada. Contato exige ler pedidos e inscritos cross-tenant e concentra PII de participante no painel master, o que é frente do **LGPD-1**.
- **Opções:** **só comportamento** (**default proposto** — atende "clientes" com a menor superfície de PII possível e não fecha porta nenhuma) · comportamento **e** contato, com o contato entrando como frente do LGPD-1 antes de subir · comportamento agora, contato como item separado quando houver caso de uso concreto.
- **Onde aterrissa:** RN-539; tarefas `S1612-T5` e `S1612-T6`. Detalhe em `03-spec.md §V-2`.

### ADMINVISAO-3 · "responsável" é o dono da conta, ou é outra pessoa

Hoje o tenant tem `ownerUid` e nada mais de pessoa, e a ficha já mostra o nome do owner. Telefone e organização **já estão gravados** no documento do profissional, sem estarem no tipo — gravação em `packages/api-client/src/platform/profissionais.ts:113` que a interface nunca refletiu.

- **Caso de uso:** o Castelo tem a Marina como dona da conta, mas quem responde sobre nota fiscal e repasse é o financeiro da produtora. Você precisa falar com o segundo e a tela só conhece a primeira.
- **Job story:** quando eu preciso resolver algo de uma produtora, eu quero saber com quem falar, para não descobrir depois de duas mensagens que a pessoa da conta não é a pessoa do assunto.
- **O que fica com você:** se "responsável" é o owner ou é um contato próprio.
- **Opções:** **é o owner** — nada de campo novo, o trabalho é tipar telefone e organização e exibir (**default proposto**, porque é o que o dado já diz e custa uma tela) · é um **contato próprio**, e nasce `Tenant.responsavel?: { nome, email, telefone? }`, opcional, ausência significando "é o owner", escrita só do administrador da plataforma — campo novo, mas mínimo.
- **Onde aterrissa:** RN-542 (só nasce na segunda opção); tarefa em `S1612`. Detalhe em `03-spec.md §V-3`.

### ADMINVISAO-4 · o diretório de contas mostra CPF

A coleção `pessoas` guarda CPF em claro e é cross-tenant. As Security Rules a fecham para **todo mundo**, inclusive para o administrador da plataforma (`firestore.rules:2688`). Não é omissão: é a escolha mais conservadora do arquivo inteiro.

- **Caso de uso:** duas pessoas se cadastram com nomes parecidos e você precisa saber se são a mesma. Com CPF a resposta é imediata; sem, você compara e-mail e telefone e às vezes não resolve.
- **Job story:** quando eu vou liberar o acesso de alguém, eu quero ter certeza de quem é a pessoa, para não liberar a conta errada.
- **O que fica com você:** manter `pessoas` fechada, ou abrir uma leitura de CPF para o painel master.
- **Por que agora:** abrir depois é a mesma decisão com uma tela já construída em cima, e a fronteira fica mais difícil de defender quando alguém já se acostumou a ver o número.
- **Opções:** **manter fechada** — o diretório usa nome, e-mail, telefone e organização (**default proposto**, e é o que a base de código já decidiu por escrito) · abrir leitura de CPF **só** por callable auditado, com registro de cada consulta, no molde do `getBankDetailsForPayout` · abrir a Rule para o administrador — a mais barata de construir e a mais cara de defender, porque transforma a coleção de CPF do sistema inteiro em leitura de painel.
- **Onde aterrissa:** RN-540; tarefas `S1615-T1` e `S1615-T5`. Frente jurídica: **LGPD-1**. Detalhe em `03-spec.md §V-4`.

### ADMINVISAO-5 · o que "tenta fazer alguma ação" quer dizer, e como a liberação direta termina

Vem da sua própria decisão de 09/08 (ADMIN-USUARIOS-1), e o registro daquele dia já dizia que ela viria como pergunta de spec. A **RN-510**, que está no ar, faz o aviso subir na **primeira interação** — qualquer gesto sobre algo acionável, botão, link, item de menu ou campo, inclusive por teclado; fechado, ele rearma. Sua frase foi "depois que a pessoa já entra no sistema e tenta fazer alguma ação". **+10/08:** a spec da aprovação (`02-rodadas/2026-08-10-admin-usuarios/`) escreveu a régua e mediu o custo dos dois lados — a letra (b), que estava sem proposta, agora tem uma.

- **Caso de uso:** a pessoa entra, navega pelo menu para conhecer o painel e não clica em nada que faça coisa alguma. Pela regra em vigor, o aviso já subiu no primeiro item de menu. Pela leitura estrita da sua frase, ele só sobe quando ela tentar uma ação bloqueada.
- **Job story:** quando eu chego num sistema novo sem acesso liberado, eu quero entender o que fazer sem ser interrompido antes de ter olhado nada.
- **O que fica com você:** duas perguntas ligadas. **(a)** "Ação" é qualquer gesto, ou é ação **bloqueada**? **(b)** Quando você libera alguém direto, sem código: o que tira a conta da vitrine, o que o aviso passa a dizer para quem espera liberação em vez de código, e como a tela descobre que foi liberada sem a pessoa recarregar?
- **Opções para (a):** ratificar a RN-510 (**default proposto** — é o que está no ar, foi medido em 08/08, e sua frase cabe nela: o seu verbatim de 06/08 já incluía "aba de menu", e na vitrine todo acionável é uma ação que não pode acontecer, então as duas leituras só divergem na navegação; régua completa na RN-549) · restringir à ação bloqueada, com o custo de reescrever P11 e P14, tocar o mecanismo do gatilho e derrubar parte da medição de 08/08.
- **Opções para (b):** o painel assina o **doc próprio** da pessoa e a vitrine cai sozinha — leitura que a Rule já permite, zero Rule nova; quando o estado vira ativo, a tela relê o crachá e cai pela mesma saída por sessão do resgate, com as travas devolvidas, e o aviso ganha a linha da segunda espera (**default proposto em 10/08**, RN-550; custo: um listener, um nome novo declarado na allowlist da RN-510, uma linha de copy) · exigir recarregar — custo zero, e a sua liberação vira chamado de suporte ("já liberei, dá F5") · polling — custo parecido com o listener e pior em tudo.
- **Onde aterrissa:** delta na RN-510 em [[LEELA-E16-plataforma-superadmin]]; RN-549 e RN-550 (condicionadas às suas respostas); tarefas `S1615-T3`, `S1615-T4`, `S1616-T2`, `S1616-T3` e `S1616-T4`. Detalhe em `2026-08-09-admin-visao/03-spec.md §V-5` e `2026-08-10-admin-usuarios/03-spec.md §Parte 5`.

## Ações que só você pode executar

### ADMINSEP-3 · a conta de super-admin de produção é a conta de demonstração

Achado enquanto eu apurava a separação de contas que você pediu. A conta que administra a plataforma em produção é `admin@demo-leela.dev`, com a senha `demo1234` — a mesma senha de vitrine que está publicada no repositório. O seed de produção a criou de propósito, junto com as contas de demonstração, e o login já foi provado funcionando contra `leela-hub`.

- **Caso de uso:** qualquer pessoa que abra o repositório tem, hoje, a senha da conta que enxerga o CPF e o telefone de todos os inscritos de todos os organizadores, lê dados bancários em claro, aprova repasse, estorna compra, muda a tabela de taxa e cria outros administradores.
- **Job story:** quando eu entrego meu CPF e meu telefone para me inscrever, eu quero que só quem administra a plataforma de verdade alcance esse dado, para a minha ficha não ficar atrás de uma senha publicada.
- **O que fica com você:** escolher o e-mail real do administrador da plataforma e definir uma senha de verdade. Só você pode fazer as duas coisas.
- **Por que agora:** é fator único, sem segundo fator, com App Check desligado, e o produto já está no ar com dado real de compra. Não depende de nenhuma decisão de arquitetura, e o ADMINSEP-1, que fechou em 05/08, não o tocou.
- **Onde aterrissa:** a conta nova recebe a claim pelo caminho manual, que já é o declarado para produção; o seed para de semear administrador contra o projeto real; e a conta de demonstração é revogada. O passo a passo está na task A6 de `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`. As contas de organizador de demonstração podem ficar: elas não alcançam a plataforma.
- **+05/08 · este item virou bloqueio de uma coisa concreta.** A ferramenta de reenvio existe desde 04/08 e a trava da Brevo caiu, mas a porta é **admin da plataforma** e a senha do super-admin foi rotacionada em 04/08 sem ficar registrada em lugar nenhum. Os **dois e-mails represados do seu pedido** (o ingresso `T93N7F` e o da conta) continuam sem sair por falta de credencial, não por falta de código. Escolher o e-mail real e definir a senha destrava o reenvio no mesmo gesto.

### 69 · conferência visual das telas novas, no mesmo passeio

Sete coisas entraram no ar entre 02 e 03/08 e nenhuma delas tem gate de código que substitua o seu olho: os três ícones de rede desenhados em casa (WhatsApp, TikTok e Strava não existem no lucide), o menu Feed · Eventos · Clubs na página do produtor, o respiro do rótulo nos grupos de escolha, o toque em qualquer ponto do cartão de modalidade e kit, e os três consertos do checkout de 03/08.

- **Caso de uso:** alguém abre a página do produtor pela primeira vez e vê os três ícones de rede desenhados em casa, o menu Feed · Eventos · Clubs e os cartões de modalidade e kit. Nenhuma dessas peças tem gate de código capaz de substituir o seu olho.
- **Job story:** quando eu abro a página de um evento pela primeira vez, eu quero que ela pareça acabada, para me sentir seguro de digitar o meu cartão ali.
- **O que fica com você:** olhar e vetar o que não estiver certo. Cada peça é troca barata.
- **Por que agora:** tudo está servido em produção, incluindo a página do produtor, e os vetos ficam mais caros depois que houver compra real em cima.
- **Onde aterrissa:** `https://leela-landing.web.app/@castelo` para o menu e os ícones; `.../meia-floripa-2026/inscricao` para o select de parcelas completo na primeira abertura, o total que muda no ato e o loader "Preparando código PIX" só depois do clique. A copy "Modalidades disponíveis" e "Modalidade oficial" está nas duas.
- **Entra no mesmo passeio quando for ao ar:** as telas da porta de entrada do organizador, construídas e já revisadas. Elas esperavam o **DEPLOY-1**, que foi decidido em 09/08 — a máquina sobe no próximo deploy, com o seed do primeiro convite retido pelo LGPD-1 —, então o passeio delas passa a depender do deploy, e não mais de uma resposta sua. O botão de pagar você confere depois da S1219, que troca a frase "Atualizando o total…" pelo spinner que você aprovou.
- **+04/08 · os oito e-mails entraram nesta lista e agora estão em produção.** A moldura da marca subiu no deploy da lane DEPLOY-EMAIL, então o próximo e-mail que sair do sistema já vai com logo e fundo da identidade. A conferência é por arquivo, não por navegador: os oito renderizados com dados de exemplo estão em `.nirvana/outputs/leela-build-2d6ee98d/emails/` (`index.html` percorre os oito). O que vale olhar com cuidado é o **cabeçalho com a imagem bloqueada** — é o caso normal no Gmail, não a exceção, e é o `alt` estilizado que segura a marca ali.
- **+05/08, atualizado em 06/08 · a tela de lotes entra nesta lista, e agora ela está no ar.** Seus seis achados foram atendidos, revisados por antagonista e subiram no deploy do painel de 05/08. Sete conferências, todas em `/eventos/{slug}/lotes`: o aviso acende no campo da **vaga** e não no do preço; dois campos vazios acendem juntos e o cursor cai no primeiro da ordem visual; a recusa por janela sobreposta traz o **nome** do outro lote e as datas com hora; os três números (vendidas · disponíveis · total) aparecem na tabela e dentro do modal, e o disponível cai **na hora** quando você digita um total menor em `Ajustar capacidade`; um lote com venda abre com o preço cinza e o atalho de capacidade logo abaixo da vaga; `Desativar` num lote vigente para a venda e mantém válido quem já comprou; e o menu secundário do evento não tem barra de rolagem nenhuma em 320, 768 e 1024 pixels, com as abas que não cabem ainda alcançáveis por gesto. **A janela de datas segue cinza de propósito** — ela é a única parte do seu pedido que não foi entregue, e agora tem tarefa própria, porque a trava vive numa regra de servidor.

### JUROS-1 · salvar os termos comerciais no painel, para selar o rastro

A escrita de 03/08 foi minimalista por ordem explícita, então o documento vigente ficou em `versao: 1` enquanto o retrato imutável `v1` ainda diz juros zero. Nada quebra por causa disso, mas o histórico da v1 deixou de ser fiel.

- **Caso de uso:** você abre os termos comerciais do Castelo no painel e salva sem mudar nada. Hoje o documento vigente diz `versao: 1` enquanto o retrato imutável da v1 ainda diz juros zero, e quem for ler o histórico depois vai ler uma coisa que não aconteceu.
- **Job story:** quando eu preciso saber que condição comercial valia numa data passada, eu quero que o histórico mostre o que de fato estava valendo, para não defender um número que o próprio registro contradiz.
- **O que fica com você:** abrir os termos e salvar sem mudar nada.
- **Por que agora:** o próximo save pelo painel grava a v2 já com 2,89% e sela o rastro pelo caminho canônico, que é o único jeito de o histórico voltar a bater.
- **Onde aterrissa:** `/plataforma` → Termos do tenant Castelo Produções.

## Fila de construção

> Ordem ratificada por você em 28/07 (DEC-0728). Roda em sequência sem nova consulta, e o detalhe de cada frente vive no card do backlog em [[V1-KANBAN]] e no épico correspondente. As frentes que nasceram da sua leva de 03/08 estão no fim, ainda sem posição.
>
> **A exceção que morava aqui acabou em 09/08.** O **ADMIN-USUARIOS-1** pedia decisão sua e vivia nesta seção porque a pergunta dele é de escopo de fila. Ele subiu para o bloco das decisões, e esta seção voltou a ser só o que ela diz ser: trabalho ordenado, sem pergunta escondida dentro.
>
> **+05/08 · duas frentes desta lista saíram por estarem construídas:** o login no meio da landing e a área do cliente com os próprios ingressos. As duas perguntavam a posição na fila, e a pergunta ficou sem objeto — a noite de 05/08 construiu as duas, com o registro completo em `02-rodadas/2026-08-04-pos-pagamento/01-decisoes-dono.md` §O que a noite de 05/08 executou. **+05/08 (madrugada): a frente fechou** — Meus Clubes entrou (`4b72c556`+`b3e51638`) e a review da área rodou e consertou quatro defeitos. O que a construção da aba devolveu **é** seu, e virou o **CLUBES-1** acima: a tela nasce vazia porque não existe caminho para entrar num clube. **+05/08 (noite): as duas estão no ar.** O deploy tinha uma sequência obrigatória — quatro isenções de campo único antes das functions — e ela foi cumprida sem esforço: a conferência contra o servidor mostrou que os índices já batiam, arquivo e produção, então nada precisou subir ali.

### Construída e revisada · porta de entrada do organizador

A landing ganhou "Entrar" e "Criar conta", o cadastro abre com acesso travado por overlay de código de convite, e os códigos são geridos por você no super-admin. *Hoje um organizador novo não tem onde clicar para entrar, e quando entrar ninguém controla quem usa a plataforma.*

- **O que fica com você:** uma coisa, e ela está no topo deste painel: o **LGPD-1**. O **DEPLOY-1**, que era a outra, foi decidido em 09/08 — a máquina sobe no próximo deploy e o seed do primeiro convite continua retido pelo LGPD-1 —, e o registro está na rodada do corte. As dez premissas vetáveis seguem valendo por default sem veto seu.
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
- **Por que agora:** o custo de deixar assim é faturado — cada tentativa é uma invocação de função mais uma transação no banco. Entrava na conta do DEPLOY-1, que foi decidido em 09/08 pela subida no próximo deploy — então o cadastro aberto fica exposto a partir dele, e a borda continua desligada.
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

### Entrou em 06/08 · o retrato contínuo do banco está desligado (PITR — pendência do CTO)

O expurgo pediu um export com hora exata (`snapshotTime`) e a API recusou: **Point-in-Time Recovery está desligado** no Firestore de produção. A corrida seguiu pela rede primária (export normal + importação), que está de pé e provada — mas ficou nomeada a causa do A3: sem PITR, não existe "voltar o banco para as 14h07 de ontem"; existe só o último export tirado à mão. *Um erro operacional grave hoje se desfaz até o export mais recente, não até o minuto anterior ao erro.* Ligar tem custo recorrente de armazenamento e política de retenção — decisão de infraestrutura para o CTO (sócio), não sua. Registro em `.nirvana/handoffs/leela-apply-limpeza-20260806.md`.

### Depois da fila · app v1 como PWA

Sua decisão de 18/07 tirou o cadastro nas lojas do caminho do v1, e a reespecificação reduziu nove histórias para seis, com o ingresso passando a funcionar sem rede. *A Ana chega ao ginásio sem sinal e hoje o ingresso dela precisa de rede.*

- **O que fica com você:** nada agora.
- **Por que agora:** na ordem ratificada no mesmo dia, o horizonte 3 vem antes do 2, com a estratégia de terminar por projeto. O produto web inteiro fecha antes do app, e o Creator Studio permanece por último.
- **Onde aterrissa:** [[LEELA-E13-app-atleta]] · [[ROADMAP]] §5.
