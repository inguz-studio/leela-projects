# Decisões em aberto — painel do Vitor

> **Como ler.** Todo item tem a mesma forma: um parágrafo curto de contexto, o **caso de uso** (a cena concreta em que a decisão aparece na vida de alguém), a **job story** (o trabalho que essa pessoa está tentando fazer), depois o que fica com você, por que está na mesa agora, as opções com o default marcado e onde a resposta aterrissa. Nada aqui bloqueia código. Tudo roda com um default defensável em vigor, ratificar é confirmar o default, e mudar é ajuste no próximo lote.
>
> **O corte de 09/08, e é ele que explica o tamanho desta página.** Você disse que 67 decisões não é razoável, que o painel devia carregar decisão de negócio e de produto, e que duplicidade, CTA inconsistente e contraste eu resolvo. **Trinta e nove itens saíram**: 37 decididos com default, porquê e condição de reabertura escritos, um absorvido pelo LGPD-1 e um fechado porque a ação já tinha sido executada. Nada foi apagado — o registro item a item está em `02-rodadas/2026-08-09-corte-painel/01-decisoes-maestro.md`, e os consertos que essas decisões geram estão em `02-rodadas/2026-08-09-corte-painel/02-fila-execucao.md`. Nenhum item de dinheiro cobrado, de dado pessoal ou de vocabulário de marca saiu sem você.
>
> **Disciplina de limpeza.** Item resolvido sai deste painel na mesma aterrissagem. O registro completo, com a sua fala na íntegra, passa a viver no arquivo da rodada em `02-rodadas/`. Este painel só carrega o que ainda é seu, e o histórico do que já fechou mora lá, não aqui.
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
> **Os dois de ponte saíram em 11/08, e a conta cai para 26.** Você mandou resolver os pontos de ponte, e os dois que ainda eram seus foram resolvidos por default do maestro, com condição de reabertura escrita. O **PONTE-CTA-1** fecha com os **dois CTAs** que você pediu — "Criar Club" e "Organizar eventos" —, cada um carimbando a intenção na própria chamada; "Painel Profissional" virou o título do cartão. O que destravou não foi mudança de opinião: a review provou que a chamada já escreve uma linha de log, então a quarta opção do menu (medir pelo servidor) custava um campo e não uma infra. O **PONTE-NOME-1** fecha pedindo o **nome da produtora na porta**, pré-preenchido com o seu nome e editável — o conserto na origem, porque depois do código não existe renomear. Renomear-depois continua card separado, e a janela que faz isto chegar a tempo é que o resgate do código ainda não está no ar. O registro completo, com o porquê de cada saída recusada, está em `02-rodadas/2026-08-11-ponte-resolve/01-decisoes-maestro.md`. Nada disso subiu: os dois estão construídos, provados e esperando a fase de deploy.
>
> **Personagens dos exemplos.** Ana compra, Castelo organiza eventos, Marina opera o painel, Téo é influenciador afiliado. São ilustrativos, não pessoas do banco.
>
> **Três saíram em 11/08 de manhã, por ordem sua, e a conta cai para 24.** O **PCLIENTE-1** fecha com "já existe": o painel do cliente É o `/minha-conta` ganhando casca, no mesmo endereço — as ondas B/C do painel-cliente destravam. O **SERV-1** fecha com o piso de R$ 3,00 ratificado ("segue o que eu falei"), com o efeito na venda barata aceito de olhos abertos. O **SERV-2** fecha pela regra nova que a sua frase criou — **venda mínima de R$ 10,00** (a opção "preço mínimo de venda" do próprio item): com face mínima 10 e piso 3, o líquido nunca é negativo e o caso da venda de R$ 2,00 morre na origem. RN-559 nasce com a validação; gratuito continua permitido (default registrado, vetável). **A regra foi construída no mesmo dia** (lane SERV1-BUILD · história S324): um lote entre R$ 0,01 e R$ 9,99 não pode mais nascer, a recusa nomeia o motivo, e nada foi para o ar — entra no próximo pacote. Registro completo em `02-rodadas/2026-08-11-decisoes-dono/01-decisoes-dono.md`, delta de regra em `02-rns-delta.md` da mesma pasta.
>
> **Dois entraram no fim da manhã de 11/08, vindos da medição do checkout, e a conta sobe para 26.** A Onda 1 do roadmap converteu o checkout e derrubou 2 passos por código (16 → 14); os dois passos de arquitetura que restam não se consertam trocando componente — são o **CKENDERECO-1** (endereço completo cobrado de quem retira kit no balcão) e o **CKPIX-1** (a tela não avisa sozinha que o PIX entrou; RN-470 foi escolha de custo e o custo mudou com venda real). Cada um com default proposto; nenhum bloqueia o que está no ar.
>
> **Um resíduo saiu no meio-dia de 11/08, e a conta cai para 25.** O **CLUBES-1** estava listado como pergunta viva, mas você o decidiu em 09/08 (decisão 12: "a aba ganha o CTA" — registro em `02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md` §12) e a limpeza daquela aterrissagem não o retirou daqui. O CTA decidido foi construído hoje pela lane BUILDS-DESTRAVADOS ("Ver experiências", com a trilha real vitrine → experiência → aba Clubs) — a entrada do participante em clube segue sendo épico próprio no E05, como a sua decisão desenhou.
>
> **Onze saíram na noite de 11/08, na leva 6, e a conta cai para 14.** Você decidiu de uma vez o que travava três frentes, e o registro completo, com a sua fala em cada item, está em `02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md`. O **CKPIX-1** fecha com o fluxo pós-pagamento inteiro, nos quatro ramos: PIX confirmado leva à área do cliente logado, PIX vencido leva ao mesmo lugar avisando que o prazo passou, cartão recusado mostra o erro e volta ao checkout pedindo revisão dos dados, cartão aceito mostra sucesso e leva junto. A **RN-470** — a tela passiva, que era escolha de custo — fica **revogada por você**, e o fluxo novo nasce como **RN-560**. O **CKENDERECO-1** fecha com o endereço **ficando**: *"mantém pedindo o endereço, pois isso é importante para segurança e cadastro dos usuários"*, e a razão vira a **RN-561** em vez de continuar um passo de arquitetura sem dono. O **SERV-3** fecha com "Serviço" nomeando exatamente a cobrança da Leela em toda superfície onde ela aparece, com as outras cobranças mantendo os nomes delas — as 34 strings do renome **destravam**. Os cinco **ADMINVISAO** fecham juntos, e com eles destravam as ondas 2, 3 e 5 do painel de administração. O **ADMINSEP-3** fecha com *"não é pra ter admin demo"*: não existe conta de demonstração de tipo nenhum, e a sugestão de uma conta demo para testar checkout está retirada. O **SEMKIT-1** e o **SEMKIT-2** saem como resíduo — você já os tinha decidido no lote 1 de 09/08 e a limpeza daquela aterrissagem não os retirou daqui, mesma classe do CLUBES-1. No mesmo ato você ratificou um princípio que não vira item: *"não podemos ter excedentes de ingressos jamais"* — ele prioriza para build a reserva de vaga que já está especificada desde 10/08. O **CANONE-1** ganhou uma linha de resumo em português comum e continua seu.
>
> **Três saíram na leva 7, ainda na noite de 11/08, e a conta cai para 11.** Você fechou os três que seguravam mais trabalho, e o registro está em `02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md §Leva 7`. O **LGPD-1** fecha com a frase mais curta e mais dura do dia: *"o aceite é obrigatório, e registrado no banco."* Nenhum organizador fica ativo sem aceite gravado — quando o registro falta, o resgate do convite recolhe o aceite junto do código, e **o seed do primeiro convite destrava**; o mesmo "registrado no banco" alcança o termo de saúde, que passa a carimbar a impressão digital do texto aceito como o termo de uso já faz. A frente do radar sai daqui porque nunca foi aceite de organizador: a base legal do nome real de participante de grupo é dado de terceiro, segue com o advogado e fica anotada na rodada do radar. O **ESTOURO-2** fecha com número e comportamento: *"devolveremos a vaga após o checkout expirar, (dentro do time de 15 minutos). Se expirou os 15 minutos, o pedido nao é mais reservado, e damos um refresh, levanto novamente para a tela de landing page."* — **15 minutos**, não os 30 do default proposto, e a expiração leva a pessoa de volta à página do evento. O **CANONE-1** fecha com a sua leitura, que é a primeira opção: *"Se um componente nao existe, precisamos documentar e padronizar o componente para nao ficar refazendo ele. Inclusive é diretriz nossa de sempre utilizar códigos, partes de código e componentes para fazer as telas, como forma de economia de tokens, tempo, e conformidade de código."* Virou diretriz permanente da casa — peça que não existe nasce no design system, documentada, antes de ser usada — e a onda de fundação de layout **destrava**.
>
> **Um entrou na madrugada de 12/08, vindo da construção do fluxo que você decidiu, e a conta sobe para 12.** O **CKLOGIN-1**: a lane que construiu o pós-pagamento descobriu que o "cliente logado" da sua frase não existe para quem compra pela primeira vez — a sessão do checkout é anônima e nunca vira conta logada. O fluxo está construído e redireciona; o muro é a promoção da sessão, e ela mexe na fronteira de autenticação que foi provada fechada. Default proposto: promover ao confirmar o pagamento, re-provando a fronteira.
>
> **Oito saíram na manhã de 12/08, na leva 8, e a conta cai para 4.** Você fechou de uma vez o que travava o checkout, o CRM e a lista de interesses, e o registro completo, com a sua fala em cada item, está em `02-rodadas/2026-08-12-decisoes-dono/01-decisoes-dono.md`. O **CKLOGIN-1** fecha com *"Ok, promova a sessao ao confirmar o pagamento."* — a sessão anônima do checkout vira conta logada no pagamento confirmado (RN-562), e o custo que o item declarou entra junto: a fronteira de autenticação que foi provada fechada é **re-provada**, não presumida intacta. O **PB-11** fecha com *"3 - em vigor."*: o que valia por default do maestro passa a valer por decisão sua, e vira a RN-567. O **ARENA-1** fecha com a visão que você já tem para depois — *"a ideia é que isso vire um 'tinder' depois, com essas informações. quando desenvolvermos a versão mobile."* —, então hoje o dado nasce guardado, a RN-472 fica intocada e a abertura vira direção registrada no épico do app, sem uma linha construída. O **ARENA-4** fecha mudando a fonte no meio do caminho: a lista física passa a derivar das **modalidades de esporte do Strava** (RN-563), a mesma lista passa a servir **três** lugares — Arena, onboarding de usuário novo e preferências do perfil (RN-564) —, e a RN-557 nasce com a tabela de 50 termos, que continua vetável barato para o seu corte fino. Os três primeiros **CRM** fecham juntos: as quatro visões de dado pronto (CRM-1), o agregado de cidade e bairro sem o endereço na ficha (CRM-2, RN-566), e o e-mail de cada participante que a tela já pedia e a gravação jogava fora (CRM-3, RN-565, com a sua razão registrada — exportar lista e notificar pelo sistema). O **ADMIN-USUARIOS-2** fecha **além** dos dois defaults propostos, com *"aprovar cadastro, reusar e revogar devem existir já"*: as três operações existem, "reusar" foi lido como **recusar**, e a leitura está declarada para reabrir barato se estiver errada.
>
> **Um entrou à tarde de 12/08, e a conta sobe para 5.** O **MODALIDADES-1** — a proposta de duas fases para as modalidades na tela de lotes (D-1008-R13) — vivia desde 10/08 só dentro do épico E04, fora deste painel. Você perguntou no chat *"Sobre a tela de lotes, nós colocamos o cadastro de modalidade por lá?"*, prova de que a pendência não estava visível onde você olha. Ela sobe agora no formato integral da casa, com o épico ganhando ponteiro de volta.
>
> **A conta de hoje: 5 itens abertos** — 3 em "Decisões que dependem de você" (o **item 12**, o **CRM-4** e o **MODALIDADES-1**) e 2 em "Ações que só você pode executar" (o **69** e o **JUROS-1**), contados à mão, um a um, contra as duas seções abaixo. Eram 4 antes desta entrada, 12 antes da leva 8, 11 depois da leva 7, 14 depois da leva 6 e 25 antes dela. O parágrafo abaixo é o registro da conta anterior e ficou para você seguir o rastro.
>
> **A conta de 12/08 de madrugada era: 12 itens abertos** — 10 em "Decisões que dependem de você" e 2 em "Ações que só você pode executar". Antes disso eram 27 com o **CANONE-1**, que entrou em 11/08 com a medição da sua ordem sobre componentes (o único item que a rodada de componentes manda para cá: as outras 223 divergências têm conserto e trava, e não precisam de você); PCLIENTE-1, SERV-1 e SERV-2 saíram na manhã de 11/08. Os parágrafos abaixo são registros de 10 e 11/08 e as contas deles eram outras; ficaram para você seguir o rastro.
>
> **A conta de 10/08 era: 28 itens abertos.** São **25** em "Decisões que dependem de você" e **3** em "Ações que só você pode executar" — contados à mão, um a um, contra as duas seções abaixo, já sem o COMPROMETIDO-1 e o VITRINE-2, que a purga de 10/08 fechou. Os cinco que entraram em 09/08 são os **ADMINVISAO-1 a ADMINVISAO-5**, da spec da visão master do painel admin: dois de dado pessoal, um de dinheiro, um de modelo e um de mecanismo. Eles fecham juntos, e a esteira não constrói as ondas que dependem deles enquanto isso não acontece. A "Fila de construção" no fim não é decisão e não entra na conta, agora sem exceção nenhuma: o **ADMIN-USUARIOS-1**, que morava lá dentro e pedia resposta sua, subiu para o bloco das decisões — você o decidiu em 09/08 e ele saiu na segunda troca de 10/08, dando lugar ao **ADMIN-USUARIOS-2**.

## Decisões que dependem de você

### 12 · domínio público

Todo endereço do produto ainda é o marcador `{DOMINIO_LEELA}`, e o remetente definitivo do e-mail depende dessa escolha.

- **Caso de uso:** o Castelo quer divulgar a página do evento no Instagram, e o endereço de hoje nasce para quebrar. É um subdomínio de hospedagem que vai mudar de nome no dia em que o domínio de verdade existir.
- **Job story:** quando eu divulgo a página do meu evento, eu quero um endereço que eu não tenha vergonha de colar e que continue funcionando depois, para não ter de reeditar cada post no dia em que o site mudar de casa.
- **O que fica com você:** cravar o domínio público da Leela.
- **Por que agora:** o produto já está no ar em `leela-landing.web.app` e o e-mail transacional sai por `vitoreldp@gmail.com`, que o DMARC do Gmail tende a jogar em spam quando a Brevo envia por ele.
- **Onde aterrissa:** env dos dois apps, substituição do marcador nas specs e verificação DKIM/SPF/DMARC na Brevo. Puxa junto o item 66 e o placeholder `contato@leela.app`, que a porta de entrada do organizador já usa como CTA de "Falar com o time Leela".

### CRM-4 · o que se pede ao participante depois da compra, e em troca de quê

A segunda metade da sua pergunta foi sobre os campos que incentivamos as pessoas a responder com o tempo. A resposta curta da esteira é que **nada novo entra no checkout** — ele é a única tela onde o dinheiro entra, e cada campo a mais é venda perdida. O que existe é uma escada para fora dele, e ela precisa de você porque cada degrau é uma promessa feita a quem responde.

> **Onde este item parou, em 12/08.** Você leu e respondeu com uma pergunta: *"como assim em troca de que?"* O esclarecimento foi dado no chat e a sua resposta ainda não voltou, então o item fica aqui **intacto**, com os degraus e a contrapartida de cada um como estavam. Os outros três de CRM fecharam na mesma leva e este não foi decidido por default de propósito: cada degrau é uma promessa feita a quem responde, e promessa não sai da esteira.

- **Caso de uso:** a Ana acabou de pagar e está na tela de confirmação com o ingresso na mão. É ali que confirmar o endereço de entrega custa quase nada, e é ali que perguntar a renda dela seria uma invasão.
- **Job story:** quando eu acabei de pagar e estou aliviada, eu quero responder só o que me devolve alguma coisa na hora, para sentir que estou completando a minha compra em vez de preencher pesquisa dos outros.
- **O que fica com você:** dizer até que degrau a gente sobe, e qual contrapartida é dita em voz alta.
- **Por que agora:** a tela de pós-pagamento e a área do cliente acabaram de nascer, e o FormBuilder é a próxima frente da fila. Decidir agora faz os pedidos nascerem no lugar certo em vez de virarem campo avulso depois.
- **Opções:** **degraus 1 e 2 agora** (**default proposto** — degrau 1 é conserto sem atrito nenhum: guardar o e-mail que já se pede, guardar o código de município que o consultor de CEP já devolve e a gente descarta, e copiar cidade e UF do endereço quando o participante é o próprio comprador; degrau 2 é a confirmação logo depois da compra, com contrapartida imediata e verdadeira — "confirme para o kit chegar certo") · subir também o degrau 3, o perfil de interesses, que é a Arena Social — e ele **destravou em 12/08**, porque os dois itens ARENA que o seguravam foram decididos na leva 8: o dado nasce guardado (ARENA-1) e a lista de interesses passou a derivar das modalidades do Strava, com a tabela pronta para o seu corte fino (ARENA-4) · subir tudo, incluindo a pergunta de satisfação depois do evento, que depende do canal de e-mail travado na chave do Brevo.
- **Onde aterrissa:** `02-rodadas/2026-08-05-crm-estrategia/02-spec-crm-estrategia.md` §Parte 7; tarefas `COL-T2` e `V2-T3` em `03-fila-proposta.md`.
- **O que a esteira recusa pedir, em qualquer degrau:** renda, profissão, estado civil e número de filhos. São os campos que todo formulário de evento pede, que nenhum organizador abre depois, e que cada um obriga a guardar, justificar e expurgar dado pessoal sem que nenhuma decisão melhore.

### MODALIDADES-1 · visibilidade agora ou editor completo na tela de lotes

As modalidades do evento nascem uma vez, na criação, e nenhuma tela do painel as mostra ou edita depois. Quem configura lotes não enxerga a lista nem tem caminho até ela — a proposta que resolve isso está desenhada desde 05/08 (D-1008-R13) e nunca saiu do papel.

> **De onde vem, em 12/08.** Você perguntou no chat: *"Sobre a tela de lotes, nós colocamos o cadastro de modalidade por lá?"* A resposta é que ainda não, e a proposta vetável já existia fora do seu alcance, dentro do épico E04. Este item sobe ela ao painel canônico pela primeira vez. Sua resposta no chat pode fechar direto, sem esperar nova rodada.

- **Caso de uso:** o Castelo abre a tela de lotes para configurar preço e vaga, e não encontra onde ver as modalidades do evento — a informação existe, mas fica atrás de nenhuma porta.
- **Job story:** quando eu configuro os lotes de um evento, eu quero enxergar e alcançar as modalidades dele no mesmo caminho, para não precisar adivinhar onde essa configuração mora.
- **O que fica com você:** o ritmo da entrega — visibilidade agora, edição de verdade depois, ou as duas juntas — e se as modalidades ganham aba própria.
- **Por que agora:** a proposta está pronta desde 05/08, você voltou a pedir por ela em 10/08 (D-1008-R13) e de novo no chat de 12/08, prova de que ela estava fora do lugar onde você olha.
- **Opções:** **fase A agora + fase B como onda seguinte já especificada** (**default proposto** — fase A é tela apenas, sem servidor: a seção de data e modalidades passa a listar as modalidades do evento e a tela de lotes ganha um caminho até lá; fase B sobe depois como onda própria, com a fila da S316 inteira — servidor, com integridade entre modalidade, lote, kit e campanha) · as duas fases de uma vez, pagando o custo de servidor já nesta entrada · modalidades ganhando aba própria entre kits e lotes, opção independente que soma a qualquer uma das duas de cima.
- **Onde aterrissa:** S316 inteira em [[LEELA-E04-config-vendas]] §"S316 recebe a leva 3 inteira (D-1008-R13)".

## Ações que só você pode executar

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

- **O que fica com você:** **nada**. As duas que ficavam fecharam: o **DEPLOY-1** em 09/08 (a máquina sobe no próximo deploy) e o **LGPD-1** na leva 7 de 11/08 (*"o aceite é obrigatório, e registrado no banco"*), que era o que retinha o seed do primeiro convite. As dez premissas vetáveis seguem valendo por default sem veto seu.
- **Por que agora:** a construção terminou em 03/08 com as oito tarefas pagas, e a review antagonista fechou na madrugada de 04/08: dez vetores atacados, três defeitos achados e corrigidos, gate final verde nas seis superfícies. Nenhum dos três defeitos era de tela — um deixava a conta nascer sem registro, um vazava o oráculo de qual código existe, e um deixava o overlay bloqueante transparente.
- **Onde aterrissa:** lanes ONBOARD-BUILD e ONBOARD-REV, rodada `02-rodadas/2026-07-28-onboarding-organizador/`. O seed do primeiro código de convite **destravou em 11/08** com o LGPD-1 decidido, e sai junto do trabalho que o aceite passa a exigir: quando o registro de consentimento falta, o resgate recolhe o aceite dentro do próprio overlay. Sobra uma ponta menor, e ela não é sua: o CTA "Falar com o time Leela" está com o placeholder `contato@leela.app`, que morre junto com o item 12.

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
