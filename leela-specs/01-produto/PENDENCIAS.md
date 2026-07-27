---
tags: [leela, pendencias]
aliases: [PENDENCIAS, Pendências, Painel de pendências]
atualizado: 2026-07-27
---

# Pendências do Leela, descritas e com exemplo

> Fechamento de 2026-07-27. Este documento **descreve** cada pendência aberta e mostra um caso de uso concreto de cada uma. O **verbatim das decisões** continua em [[DECISOES-ABERTAS]], que segue sendo a fonte; aqui não há decisão nova, só a explicação de cada item e o link para onde ele mora.

São 20 itens em três grupos: 7 dependem de uma decisão ou ação sua, 8 são dívida técnica esperando dono antes do go-live, e 5 são a fila de construção já ratificada. Cada item tem cinco campos fixos: o que é, por que importa, exemplo de caso de uso, o que destrava, onde mora.

Os nomes que aparecem nos exemplos são personagens ilustrativos, não pessoas do banco: **Ana** compra, **Castelo** organiza eventos, **Marina** opera o painel, **Téo** é influenciador afiliado. Os fatos técnicos vêm dos reports e dos épicos; onde a fonte não crava um detalhe, o texto diz que está em aberto em vez de inventar.

## Grupo 1 · decisões e ações que só você destrava

### 1. Pagamento retardatário (item 27)

**O que é.** Um pagamento que entra depois de o pedido já ter sido cancelado cai num registro durável chamado `ignorado_estado_final`. O dinheiro saiu do comprador e fica anotado, mas nada alerta ninguém. Quando você quiser fechar isso, há três saídas: estorno automático, fila de reconciliação ou ressuscitar a inscrição. Qualquer uma delas exige antes um contador e um alerta sobre esse registro.

**Por que importa.** Sem o alerta, a reconciliação nasceria sem gatilho: existiria a rotina de acerto e não existiria o momento em que alguém é avisado de que há um acerto a fazer. Não há urgência enquanto o simulador de pagamento está ativo, e o item entra no pacote de go-live. A review do PIX-CARRINHO conferiu o estado: os fixes recentes estreitam a janela em que isso acontece, sem fechá-la, e o registro continua durável e sem aviso.

**Exemplo de caso de uso.** Ana gera o PIX de uma inscrição às 21h10 e paga o QR às 21h48, dezoito minutos depois de o prazo vencer. O pedido dela já tinha sido cancelado. O dinheiro saiu da conta de Ana, o sistema anota a entrada no registro e ninguém é notificado. Dois dias depois Ana escreve para o Castelo perguntando pela inscrição que não apareceu, e o Castelo não tem tela nem aviso que mostre esse pagamento: ele só descobre porque a compradora reclamou. O que deveria acontecer: o pagamento entrar, o contador subir, alguém receber o aviso no mesmo dia e a regra escolhida por você resolver o caso (devolver, reconciliar à mão ou reativar a inscrição de Ana).

**O que destrava.** Você escolhe uma das três saídas e aprova o contador com alerta como pré-requisito dela. Só depois isso vira lote de código.

**Onde mora.** [[DECISOES-ABERTAS]] item 27 · `outputs/leela-build-2d6ee98d/PIXCARRINHO-REV-REPORT.md` §Escalados item 7.

### 2. Teto de espera do gateway no caminho do dinheiro (item 28)

**O que é.** Hoje não existe limite de tempo para a plataforma esperar a resposta do Asaas. Não há `AbortController` no adapter e a função do checkout não declara `timeoutSeconds`, então o único limite é o timeout de 60 segundos da própria função. O que chega ao comprador quando isso estoura é o erro genérico de uma função que morreu, não uma explicação sobre o meio de pagamento. A recomendação da review é um teto por chamada na casa de 10 a 15 segundos, com erro tipado próprio, aplicado num lugar só (o `request` do adapter, que vale para todas as chamadas ao Asaas).

**Por que importa.** Quem espera é o comprador, e espera no caminho do dinheiro. O número é seu porque a escolha tem dois lados: um teto folgado deixa a pessoa pendurada quase um minuto, e um teto apertado demais transforma cobrança que o gateway até criou em erro na tela.

**Exemplo de caso de uso.** Numa noite de lançamento o Asaas fica lento. Ana clica em "pagar com PIX", a tela gira 58 segundos e devolve uma mensagem que não diz nada. Ana conclui que a compra falhou e clica de novo. Nos logs do Castelo o erro aparece como falha da função, sem nomear o gateway, então nem dá para saber que o problema era do lado de fora. O que deveria acontecer: em doze segundos a tela dizer que o meio de pagamento não respondeu e oferecer nova tentativa, com o erro nomeado no log para quem for investigar.

**O que destrava.** Você crava o número (a review sugere 10 a 15 segundos) e aprova a mensagem que o comprador lê quando ele estoura.

**Onde mora.** [[DECISOES-ABERTAS]] item 28 · `outputs/leela-build-2d6ee98d/PIXCARRINHO-REV-REPORT.md` §A3-REV.

### 3. O simulador de pagamento repete o travamento no preview (item 29)

**O que é.** O `MockPaymentProvider` guarda as cobranças na memória do processo e lança erro quando recebe uma cobrança que não conhece. Essa guarda é deliberada: ela existe para pegar bug de quem chama. O efeito colateral aparece no preview: ao reiniciar o emulador, o mapa de cobranças se apaga, uma cobrança PIX criada antes desaparece, e aquele carrinho passa a ser negado para sempre naquele ambiente. Produção não é afetada, porque lá roda o adapter do Asaas, que já foi corrigido.

**Por que importa.** Morde exatamente na hora da validação manual, que é como você confere o produto. A review não afrouxou a guarda de propósito: enfraquecer um teste-duplo que existe para pegar bug de chamador é decisão de dono, não de revisor.

**Exemplo de caso de uso.** Você abre o preview, gera um PIX no checkout de um evento da Marina, reinicia o emulador para olhar outra coisa e volta para terminar a compra. Toda tentativa recusa com "a cobrança anterior não foi encerrada", e não há saída pela tela: aquele carrinho está morto naquele ambiente. O que deveria acontecer, se você autorizar: o simulador responder "já cancelada" para cobrança desconhecida **apenas** quando o pedido correspondente já estiver vencido. Esse recorte é o caminho honesto; um `catch` genérico devolveria a guarda ao ponto em que ela deixa de pegar bug de verdade.

**O que destrava.** Você autoriza (ou recusa) esse afrouxamento restrito ao simulador.

**Onde mora.** [[DECISOES-ABERTAS]] item 29 · `outputs/leela-build-2d6ee98d/PIXCARRINHO-REV-REPORT.md` §A4-REV.

### 4. Aviso quando a limpeza de carrinhos sai lotada (item 30)

**O que é.** A varredura que cancela carrinhos vencidos processa no máximo 200 por rodada. A review provou que o acúmulo não se perde: 205 vencidos drenaram em duas rodadas, e o atraso de cada retardatário fica mensurável no próprio registro. O que falta é o sinal. Quando a rodada sai com exatos 200, nada distinto é emitido. O conserto tem custo de uma linha: um aviso no log quando a rodada sai cheia.

**Por que importa.** Numa rajada sustentada o atraso vira o normal e ninguém percebe, porque a única forma de notar hoje seria alguém ler o registro da varredura e desconfiar do 200 redondo. O dado de carrinhos abandonados que você pediu para a fase 2 nasceria enviesado em silêncio.

**Exemplo de caso de uso.** Na quarta-feira de abertura das inscrições, o evento do Castelo abre 900 carrinhos que vencem quase na mesma faixa de horário. As rodadas saem lotadas por horas, os cancelamentos atrasam, o estoque fica preso mais tempo do que deveria e nenhum aviso é emitido. Quando alguém for olhar o número de abandonos daquele dia, vai ler um dado atrasado achando que é o dado do dia. O que deveria acontecer: a primeira rodada cheia gravar um aviso, para alguém decidir entre aumentar o teto ou rodar mais vezes.

**O que destrava.** Uma resposta sua: quer o aviso? Se quiser, vale dizer também o que você espera que aconteça quando ele aparecer (só registrar, ou também elevar o teto).

**Onde mora.** [[DECISOES-ABERTAS]] item 30 · `outputs/leela-build-2d6ee98d/PIXCARRINHO-REV-REPORT.md` §A5-REV.

### 5. Brevo: falta a ativação da conta de envio

**O que é.** O fornecedor de e-mail transacional está ratificado (Brevo) e a chave já está entregue e ligada no `functions/.env`, validada ao vivo: a consulta de conta responde 200 desde que você desativou a trava de IPs autorizados, que é incompatível com Cloud Functions. Falta só a ativação da conta de envio pelo suporte do Brevo. Hoje o envio devolve 403 com "SMTP account not yet activated". A ação é externa e de fora do código: o banner do painel do Brevo ou um pedido para contact@brevo.com. O prazo típico é de horas a um ou dois dias.

**Por que importa.** É a dependência externa de maior alavancagem que existe hoje. Quando a conta ativar, três consumidores destravam sem uma linha de código novo: o convite de assessoria do E18 no ramo que hoje falha fechado, o convite de influenciador pessoa física, e as campanhas por e-mail do E06 com o disparo a segmentos do CRM. Há uma dependência honesta a registrar: a verificação do domínio de envio depende da decisão de domínio, que continua aberta, e sem domínio verificado o envio fica limitado ao remetente verificado do provedor. Isso basta para teste e não basta para produção com destinatários reais.

**Exemplo de caso de uso.** Ana compra pela primeira vez. O sistema cria a conta dela sem senha e deveria mandar o link de "defina sua senha e veja sua compra". A compra não trava (isso foi desenhado para não travar), mas o e-mail não sai e fica só a pendência de envio: Ana tem inscrição e não tem como entrar na conta. Do outro lado do mesmo dia, a Marina monta uma campanha para os inscritos do último evento e descobre que o disparo não existe. Com a conta ativada, os dois caminhos passam a funcionar com o código que já está escrito.

**O que destrava.** Você clica no banner ou manda o pedido de ativação para contact@brevo.com. Quando ativar, o passo seguinte é técnico e curto: re-rodar `brevoSandbox.e2e.test.ts` com `BREVO_E2E=1`.

**Onde mora.** [[DECISOES-ABERTAS]] item 13 · [[LEELA-E19-crm]] · [[LEELA-E06-marketing]] · [[LEELA-E08-influenciador]].

### 6. Duas conferências suas: o menu lateral no preview e o sentido de "abertura" na RN-158

**O que é.** São duas confirmações que nenhum teste fecha no seu lugar, e por isso vivem juntas aqui.

A primeira é visual. Na lane NAV-FIX os 6 itens do menu lateral do produtor trocaram de `<button>` para `<a>` de verdade, o que passou a permitir ctrl+clique, clique do meio e copiar endereço. A paridade visual foi provada por medida no DOM, e a review confirmou a dedução. O que sobra é a última milha que o ambiente de teste não computa: cor, sublinhado, cursor e anel de foco renderizados. Foco visível e ordem de tabulação são o item número um para o seu olho no preview. Existe também um ponto de comportamento que virou decisão de produto: `<a>` ativa com Enter, `<button>` ativava com Enter e Espaço, e hoje há teste travando os dois ramos.

A segunda é de regra. A RN-158 diz que o checkout tem 15 minutos "da abertura" para concluir a compra. A lane cravou abertura como a primeira cotação daquele comprador naquele evento no servidor, porque é o primeiro instante em que o servidor sabe que existe um carrinho. Se você quis dizer outro ponto (ao entrar na tela, ou ao chegar no pagamento), o ajuste é pequeno e a decisão é sua. Ligado a isso, quem chama a API sem passar pela cotação não tem carrinho e o prazo não o alcança. A review mediu esse buraco e ele é exatamente o declarado, sem vazar entre eventos; fechá-lo significaria tornar a cotação obrigatória para comprar, que é política nova e não foi ratificada.

**Por que importa.** O menu lateral é a superfície mais usada do painel, e o tipo de regressão que sobra ali (foco que desaparece, tabulação que pula) é justamente o que teste em ambiente simulado não enxerga. Já a definição de abertura decide quando o relógio do comprador começa a andar, o que muda quantos minutos reais cada pessoa tem.

**Exemplo de caso de uso, lado do menu.** A Marina abre o painel no preview e navega só pelo teclado. Ela dá Tab a partir do topo e percorre os seis itens: Visão geral, Eventos, Clubs, CRM, Marcas, Configurações. Se o anel de foco não aparecer em algum item, ou se a ordem pular do terceiro para o quinto, ela perde a referência de onde está e volta ao mouse. Nenhum teste atual pega isso, porque o anel de foco só existe renderizado.

**Exemplo de caso de uso, lado da abertura.** Ana entra na página do evento do Castelo às 20h00 e passa vinte minutos lendo o regulamento e comparando kits. Às 20h20 ela escolhe o lote, e esse é o momento em que o servidor cota pela primeira vez. O relógio dos 15 minutos começa às 20h20, e ela tem até 20h35. Se a sua intenção era contar da entrada na tela, Ana está ganhando vinte minutos que você não previu; se era contar do pagamento, ela está perdendo tempo antes da hora.

**O que destrava.** Dez minutos seus no preview olhando o menu, mais uma frase confirmando ou corrigindo o que significa "abertura". Nenhuma das duas coisas depende de código novo para ser respondida.

**Onde mora.** [[DECISOES-ABERTAS]] item 26 · [[V1-KANBAN]] cards NAV-FIX e PIX-CARRINHO · `.nirvana/handoffs/leela-build-2d6ee98d-NAVFIX.md` · [[LEELA-E01-design-system]].

### 7. HIP-R9-01: pré-compra do clube-influenciador, e o bloco Asaas adiado

**O que é.** A pré-compra é uma hipótese de produto, não uma decisão à espera de ratificação. O seu verbatim foi: *"quero validar isso depois com um organizador de eventos."* A mecânica proposta é de compra coletiva: inscrições que entram pelo link do clube ficam em estado de pré-compra e, quando o mínimo definido pelo organizador é atingido, a cobrança de todas dispara no cartão. A spec registrou as quatro questões de dinheiro que a validação precisa responder antes de virar regra: a janela da pré-autorização, que expira em poucos dias; o que acontece com as pré-compras se o mínimo nunca é atingido; o que fazer se parte das cobranças recusar no disparo em lote e o total voltar a ficar abaixo do mínimo; e se a pré-compra reserva ou não vaga e estoque enquanto espera. Enquanto isso não é validado, vale o default conservador da RN-315: o link do clube só ativa o desconto ao cruzar o mínimo, sem cobrança em lote.

No mesmo item entra o estado do bloco Asaas, que você adiou em 2026-07-26 (*"quanto ao asaas, não precisamos disso agora"*). Sandbox, KYC, rotação da chave de produção e liberação para pagador estrangeiro saíram da fila de cobrança, o lote do checkout de estrangeiro segue travado por essa liberação, e a rotação da chave de produção continua obrigatória antes do primeiro deploy real (adiar não cancelou; só desligou o assunto do dia a dia).

**Por que importa.** Se a pré-compra for construída, é dinheiro: rota opus com review antagonista obrigatória. E as quatro questões não são detalhe de implementação, elas mudam o desenho. Construir antes de ter as respostas é adivinhar qual risco o organizador aceita correr.

**Exemplo de caso de uso.** O Castelo publica o link do clube dele com meta de 30 inscrições para liberar 20% de desconto. Vinte e quatro pessoas entram em pré-compra nos primeiros quatro dias. A vigésima quinta chega no oitavo dia, quando a pré-autorização das primeiras já expirou. Hoje nada disso existe: o link só ativa o desconto depois de cruzar o mínimo, e quem entrou antes paga o preço cheio. O que deveria acontecer antes de qualquer linha de código: o Castelo dizer qual modelo ele aceita, entre reter a pré-autorização e correr o risco de estourar a janela, ou guardar o cartão e cobrar no gatilho correndo o risco de recusa na hora.

**O que destrava.** Uma conversa sua com um organizador real que responda as quatro questões. Do lado Asaas, nada é cobrado de você agora, exceto a rotação da chave de produção antes do primeiro deploy.

**Onde mora.** [[DECISOES-ABERTAS]] bloco HIP-R9-01 e seção de ações externas · `02-rodadas/2026-07-18-ux-review/03-stories.md` §S-R9-11 · [[LEELA-E08-influenciador]].

## Grupo 2 · dívida técnica com dono pendente, antes do go-live

### 8. P-IAMENU-1 (grave): o CRM não separa quem vê o agregado de quem vê a ficha

**O que é.** O CRM tem duas camadas de dado muito diferentes. Visão geral mostra o público em agregado, sem identidade, com supressão de grupos pequenos (k=5). Clientes mostra a ficha individual, com nome, gênero, valor gasto e histórico. Depois da reorganização do menu, as duas passaram a dividir a mesma casca, e a medida do código diz que **as duas são liberadas pela mesma regra**: a coleção de clientes é lida por quem escreve no tenant, e a área do CRM não tem guarda de papel no roteador (nunca teve, nem antes da mudança). Logo, quem vê o gráfico vê a lista.

**Por que importa.** A supressão k=5 é minimização de dado na superfície agregada, não controle de confidencialidade entre audiências. Ela protege contra reidentificação por alguém que só veja o gráfico, e essa pessoa não existe no modelo de permissão de hoje. Tratar o k=5 como fronteira é ler a garantia acima do que ela entrega. Separar de verdade exige um papel de tenant que o painel não tem: o único papel existente vive dentro de um evento, e não há como consultá-lo numa rota de nível de tenant. Foi por isso que a lane não resolveu: é decisão de produto mais backend, não de tela. O que ficou no lugar é um gate executável de 16 testes que reprova por adição, fechando os quatro caminhos que borrariam a fronteira dentro do modelo atual (filtro demográfico na lista, drill-down do agregado para a ficha, filtro por endereço e export da base individual). Some-se a isso a base legal de LGPD, que você mandou relevar por ora com nota explícita de revisitar antes do go-live.

**Exemplo de caso de uso.** A Marina contrata a Bia para cuidar do marketing e libera o CRM para ela estudar o perfil do público. A Bia abre CRM › Visão geral e vê faixas de idade e gênero em agregado, que é exatamente o que a Marina quis dar. Dois cliques ao lado, em CRM › Clientes, ela vê nome, gênero, valor gasto e histórico de compra de cada pessoa, uma por uma, e pode buscar por nome. Nada na tela sinaliza que aquilo era outra camada de acesso. O que deveria acontecer: existir um papel que abra o agregado e não abra a ficha, e a Marina escolher qual dos dois a Bia recebe.

**O que destrava.** Uma resposta sua: o CRM precisa de audiências distintas? Se sim, isso vira papel de tenant, regra própria no banco e guarda de rota, e nasce uma RN nova no épico do CRM. Se não, o k=5 é redocumentado como minimização de dado e o item fecha sem código.

**Onde mora.** [[LEELA-E19-crm]] §P-IAMENU-1 · `outputs/leela-build-2d6ee98d/IAMENU-REV-REPORT.md`.

### 9. P-IAMENU-2: o "disponível" da Caixa não abate o repasse do evento

**O que é.** O cálculo do disponível na aba Caixa do evento parte da receita total, desconta a retenção e desconta o repassado, mas o repassado entra cravado em zero. Isso fechava enquanto a Caixa exibia "repassado R$ 0,00", porque os quatro números da tela concordavam entre si. Depois que a Caixa passou a ler o registro de repasse de verdade, eles deixaram de concordar: a tela pode mostrar "repassado R$ 500" ao lado de um disponível calculado como se nada tivesse saído. O que a lane de review fez foi contornar, não resolver: o card passou a declarar que o disponível é estimativa quando há repasse vivo (a mesma disciplina que a visão macro já praticava) e o CSV daquela tela passou a levar a mesma soma que a tela mostra, o que fechou um buraco pior, em que a planilha de conciliação dizia zero enquanto a tela dizia o valor real.

**Por que importa.** É a tela pela qual o organizador confere quanto do dinheiro dele já saiu. O número autoritativo é do servidor, e recalcular no cliente é justamente o que a regra do saldo proíbe, então a resposta provável é "permanece estimativa declarada". Mas isso precisa ser dito por alguém com nome, porque hoje é um contorno sem decisão por trás. Sobra também um resíduo: a função de derivação e a flag que ela devolve ainda descrevem o mundo anterior, e ninguém as lê além do próprio teste unitário; reconciliar exige mexer numa asserção existente, o que uma review não faz sem dono.

**Exemplo de caso de uso.** O Castelo recebe R$ 500 de repasse na terça e abre a aba Caixa do evento na quarta. A tela mostra o repasse certo e, na linha de baixo, um disponível que ignora essa saída. Ele soma de cabeça, não fecha, e liga para a Marina achando que perdeu dinheiro no meio do caminho. O que deveria acontecer: ou o disponível abater os repasses vivos daquele evento, ou a tela dizer com clareza que aquele número é estimativa que não abate o repasse (é o que o contorno faz hoje, e é exatamente a escolha que falta ratificar).

**O que destrava.** Duas respostas de dono: (a) o disponível por evento abate os repasses vivos, ou permanece estimativa declarada? (b) autorização para reconciliar a função de derivação e a asserção do teste que ainda descrevem o mundo anterior.

**Onde mora.** [[LEELA-E09-financeiro-profissional]] §P-IAMENU-2 · `outputs/leela-build-2d6ee98d/IAMENU-REV-REPORT.md`.

### 10. O observador de sessão está copiado cinco vezes

**O que é.** O mesmo hook de sessão do painel existe em cinco cópias byte a byte idênticas, uma por área. Os próprios comentários das cinco já apontam a saída: um provedor de sessão único acima da casca do painel, com as cópias virando reexports finos, de forma que nenhum consumidor nem teste existente precise mudar na mesma entrega (a tarefa planejada lista oito arquivos de sessão a virarem reexports). É a tarefa T5 do diagnóstico de navegação, deixada fora da lane NAV-FIX de propósito: aquela lane fechou o sintoma que você relatou, e a T5 sozinha não fecharia.

**Por que importa.** É refactor transversal, toca todas as áreas do painel e pede janela sem lanes concorrentes mais review antagonista. Enquanto não acontece, cada área observa a sessão por conta própria, e trocar de área pode devolver a tela ao estado de carregando mesmo com a sessão já resolvida.

**Exemplo de caso de uso.** A Marina vai de Clubs para CRM e de lá para Eventos › Repasses, três telas em meio minuto. Em cada troca a área monta o próprio observador de sessão e a tela pisca em "carregando" outra vez. Ela já está logada, o dado já foi resolvido, e ainda assim espera. O que deveria acontecer: um observador só, acima de tudo, e trocar de área não voltar a "carregando" uma segunda vez (é justamente o teste novo que a tarefa prevê como prova).

**O que destrava.** Você abre a janela: uma lane dedicada sem nada concorrente, com dono nomeado. É a única condição que a tarefa pede.

**Onde mora.** `outputs/leela-build-2d6ee98d/PAINEL-NAV-DIAG-REPORT.md` §T5 · `outputs/leela-build-2d6ee98d/IAMENU-REV-REPORT.md` §A-5 · [[LEELA-E01-design-system]].

### 11. Dois testes vermelhos de base na suíte do painel

**O que é.** A suíte do painel fecha com dois testes vermelhos que vêm de antes das lanes recentes e servem de âncora para a frase "zero vermelho novo". Um deles é o teste da navegação de plataforma: a barra ganhou o item de taxa e a tabela do teste não acompanhou, o que é um card de dez minutos. O outro é o teste do salvamento de termos comerciais.

**Por que importa.** Vermelho permanente treina o olho a ignorar vermelho. Enquanto os dois existem, ler qualquer gate do painel exige explicar dois vermelhos antes de olhar o resto, e um terceiro vermelho de verdade se esconde com facilidade no meio de dois conhecidos.

**Exemplo de caso de uso.** Uma lane nova entrega e o report diz "2 vermelhos de base, zero novo". Quem lê precisa confiar na decomposição escrita em vez de olhar um verde e seguir. Na entrega seguinte aparece um terceiro vermelho com mensagem parecida; quem estava acostumado a "são os dois de sempre" passa direto, e um defeito real entra no main com aparência de dívida velha. O que deveria acontecer: a suíte fechar verde, e qualquer vermelho ser notícia.

**O que destrava.** Sua aprovação para dois cards curtos: atualizar a tabela do teste da navegação de plataforma e olhar o teste dos termos comerciais.

**Onde mora.** `.nirvana/handoffs/leela-build-2d6ee98d-NAVFIX.md` §Pendências · [[V1-KANBAN]] card NAV-FIX.

### 12. Flakes de timeout na suíte do painel sob carga

**O que é.** A suíte do painel estoura tempo quando a máquina está carregada. Nas duas rodadas de lote da NAV-FIX caíram seis testes por rodada com "timeout em 5000ms", e o conjunto que falhou **mudou** entre as rodadas, que é assinatura de flake e não de regressão (regressão cai sempre no mesmo lugar). Todos voltaram verdes ao rodar isolados. Na review seguinte o flake não reproduziu: duas rodadas completas voltaram com exatamente os dois vermelhos de base e nenhum timeout. Vale registrar o contraste: a suíte de funções passou por um saneamento próprio, que resolveu a interferência entre arquivos e provou a suíte inteira verde duas vezes seguidas. A do painel não teve o equivalente.

**Por que importa.** Enquanto isso, todo gate da suíte do painel exige rodada isolada para ser lido, e a conclusão de "zero vermelho novo" fica lastreada em decomposição de falha em vez de em rodada limpa. É dívida que cresce com o tamanho da suíte.

**Exemplo de caso de uso.** No fim de uma lane o agente roda a suíte do painel com o preview e a landing abertos na mesma máquina. Seis testes estouram cinco segundos. Ele roda os seis isolados, todos verdes, e escreve dois parágrafos de decomposição no report para provar que não há regressão. Você lê os dois parágrafos em vez de ler um número. O que deveria acontecer: uma rodada só, verde, sem parágrafo de explicação.

**O que destrava.** Sua priorização de uma lane equivalente ao saneamento da suíte de funções, agora para o painel. A alternativa é aceitar formalmente a rodada isolada como procedimento de leitura do gate.

**Onde mora.** `.nirvana/handoffs/leela-build-2d6ee98d-NAVFIX.md` §Pendências · `outputs/leela-build-2d6ee98d/SUITE-STAB-REPORT.md` · [[LEELA-E00-fundacao-tecnica]].

### 13. H7: o menu do CRM e o hub de Eventos navegam sem ser links

**O que é.** Duas superfícies do painel trocam de aba por evento de clique, sem endereço no elemento: o menu do CRM e o hub de Eventos. Elas nunca recarregaram a página, e foi por isso que ficaram fora da lane NAV-FIX, mas também não são links: não dão ctrl+clique, não dão clique do meio, não dão copiar endereço. E ficam invisíveis para o gate anti-regressão que percorre 37 âncoras em 8 superfícies; o inventário registra as duas com zero âncoras justamente para não mentir sobre a cobertura.

**Por que importa.** Toda outra aba do painel já é link honesto, com a fiação de navegação interna aplicada em sete superfícies. Essas duas são a exceção, e a exceção é a parte que o gate não protege. São também superfícies novas, criadas pela reorganização do menu, então a chance de alguém copiar o padrão errado daqui é real.

**Exemplo de caso de uso.** A Marina está em CRM › Clientes e quer abrir Visão geral numa segunda aba para comparar o agregado com uma ficha. Ela dá ctrl+clique na aba e nada acontece. Tenta o botão direito para copiar o endereço e não há endereço para copiar. Ela desiste e passa a alternar entre as duas telas na mesma aba, perdendo a posição da lista a cada volta. O que deveria acontecer: as duas abas serem links de verdade com a mesma fiação das outras sete, e entrarem no inventário do gate com âncoras contadas.

**O que destrava.** Sua aprovação do card. A receita já existe e já foi aplicada em sete superfícies, então é execução, não desenho.

**Onde mora.** [[V1-KANBAN]] card do achado H7 · [[LEELA-E01-design-system]] · `outputs/leela-build-2d6ee98d/PAINEL-NAV-DIAG-REPORT.md`.

### 14. A-7: clicar na aba em que você já está empilha histórico

**O que é.** Clicar na aba ativa navega de novo para o mesmo endereço e acrescenta uma entrada no histórico do navegador. O efeito é que o botão voltar repete a aba em vez de sair dela. Achado da review de navegação, registrado sem ação: se incomodar no uso, vira regra.

**Por que importa.** É o tipo de irritação que só o uso revela e que nenhum teste reprova, porque tecnicamente nada quebrou. O conserto é curto (não navegar quando o destino é igual ao endereço atual), mas mexer nisso sem decisão seria inventar regra de navegação.

**Exemplo de caso de uso.** O Castelo está em Eventos › Inscritos e clica em "Inscritos" três vezes enquanto fala no telefone, por hábito. Depois aperta o voltar para retornar à Visão geral do evento. O voltar entrega "Inscritos" três vezes antes de sair de lá, e ele conclui que o painel travou. O que deveria acontecer: clicar na aba ativa não mexer no histórico.

**O que destrava.** Uma frase sua: incomoda? Se sim, vira regra e card; se não, fica registrado como comportamento aceito.

**Onde mora.** `.nirvana/handoffs/leela-build-2d6ee98d-NAVFIX.md` §Apêndice NAVFIX-REV · `outputs/leela-build-2d6ee98d/NAVFIX-REV-REPORT.md` §A-7.

### 15. Pré-deploy do Asaas: provar o cancelamento no sandbox e arrumar o nome da chave

**O que é.** Duas ações antes de qualquer deploy que dependa do cancelamento no gateway, e elas continuam valendo apesar de o bloco Asaas estar adiado. A primeira é validar o `DELETE /payments/{id}` contra o sandbox real. O escopo dessa validação diminuiu depois da review: o modo de falha está provado seguro, e está provado que nenhuma das doze respostas plausíveis ao cancelamento deixa o comprador em negativa permanente. O que resta conferir é o formato da resposta, não o comportamento em falha. A segunda é de arrumação: a chave de **sandbox** está guardada no slot chamado `ASAAS_PROD_API_KEY` no `functions/.env`, porque foi colada no bloco errado, e existe ainda uma chave de produção morando num comentário do mesmo arquivo, o que foi o que tornou a rotação obrigatória.

**Por que importa.** Nome de variável que mente sobre o ambiente é a classe de erro que faz alguém cobrar dinheiro de verdade acreditando estar em sandbox. E segredo em comentário é segredo fora de controle: ele não está protegido por nada além do hábito de ninguém abrir o arquivo.

**Exemplo de caso de uso.** No dia do primeiro deploy real, alguém abre o `functions/.env`, lê `ASAAS_PROD_API_KEY` preenchida e conclui que a produção já está configurada. Sobe. O que estava ali era a chave de homologação, ou (pior caminho) a chave antiga de produção que apareceu em transcrição de chat e nunca foi rotacionada. O que deveria acontecer: cada chave no slot com o próprio nome, a de produção rotacionada no painel do Asaas e fora de qualquer comentário, e o cancelamento provado no sandbox antes de subir.

**O que destrava.** Você libera uma janela curta de sandbox (isso é pré-deploy, não fila de cobrança) e rotaciona a chave de produção no painel do Asaas. A renomeação da variável é técnica e vai junto.

**Onde mora.** [[DECISOES-ABERTAS]] §Checklist pré-deploy e itens 8 e 10 · `outputs/leela-build-2d6ee98d/R6-ASAAS-SANDBOX-REPORT.md` · `outputs/leela-build-2d6ee98d/PIXCARRINHO-REV-REPORT.md` §Escalados item 8.

## Grupo 3 · fila de construção, na ordem ratificada

### 16. E08: repasse parcial e aviso ao afiliado

**O que é.** O painel do promotor está entregue: atribuição por link, comissão acumulando sozinha a cada venda confirmada, estorno devolvendo certo, saldo e extrato dos dois lados, e repasse manual registrado. Faltam duas peças. A primeira é o repasse parcial: hoje o registro quita o saldo inteiro, e falta poder informar um valor menor, com guarda de saldo na mesma transação e idempotência pelo identificador do repasse. A segunda é o aviso ao afiliado quando o repasse é registrado e quando a comissão cruza um marco, reusando o log de comunicação e o disparo que já existem, sem canal novo (essa segunda espera a chave do Brevo, a mesma dependência do item 5).

**Por que importa.** Sem parcial, o organizador que quer pagar metade agora paga tudo ou não paga nada, e o que acontece na prática é pagar por fora e deixar o extrato mentindo. O repasse parcial é rota opus com review antagonista por um motivo específico: parece um campo a mais no formulário, mas o valor informado entra na mesma transação que protege o saldo contra corrida e contra estorno posterior, e um parcial que não respeite essa guarda cria dívida invisível.

**Exemplo de caso de uso.** O Téo levou 40 inscrições ao evento do Castelo e acumulou R$ 1.200 de comissão. O Castelo quer adiantar R$ 500 agora e pagar o resto depois do evento, quando o caixa fechar. Hoje o sistema só oferece quitar os R$ 1.200 de uma vez, então o Castelo manda R$ 500 no PIX pessoal e o extrato do Téo continua dizendo R$ 1.200 a receber. Nos dois lados o número está errado, e ninguém consegue conciliar. O que deveria acontecer: o Castelo registrar R$ 500, o saldo do Téo cair para R$ 700, o Téo receber o aviso, e o extrato bater com o banco.

**O que destrava.** Nada de decisão sua. Está na posição 2 da ordem ratificada, depois de fechar o que está aberto no caminho do dinheiro. O repasse parcial pode entrar já; o aviso espera o Brevo.

**Onde mora.** [[LEELA-E08-influenciador]] §S704-T2 e §S-E08-NOTIF · [[V1-KANBAN]] card E08.

### 17. E10: consolidação das ativações de marcas (S812)

**O que é.** A tela de marcas existe e funciona: registro reutilizável, autocomplete, logo quadrada por upload, lista, criar, editar e excluir. Falta a história S812, planejada em quatro tarefas: uma função de índice inverso que mantém as ativações de cada marca e a soma delas a partir de vínculos que já existem no sistema (parceria de patrocínio no clube, desafio patrocinado, item de kit de origem patrocinador); a tela de ativações com abas por tipo; o controle de exibir a logo ao atleta por item patrocinado; e o fechamento das duas dívidas que a tela declarou.

**Por que importa.** A tela de hoje omite de propósito em quantos patrocínios cada marca é usada, porque não existe um leitor barato para essa contagem e a casa não exibe número inventado. A confirmação de exclusão também mostra um aviso genérico em vez das ativações realmente afetadas. É um item pequeno e isolado, e é por isso que ele está cedo na ordem.

**Exemplo de caso de uso.** A Marina abre a tela de marcas para apagar "Café Rota", que ela cadastrou duas vezes por engano. A tela não diz onde essa marca está usada, então ela não sabe se apagar vai deixar um desafio sem patrocínio ou um item de kit sem logo. Ela apaga a errada, descobre uma semana depois quando o desafio aparece sem marca, e refaz o cadastro. O que deveria acontecer: a linha da marca mostrar "3 ativações" e a confirmação listar exatamente quais (o desafio, o item de kit, o evento) antes de ela clicar.

**O que destrava.** Nada de decisão sua. Está na posição 3 da ordem ratificada, e depende só de vínculos que E03 e E05 já entregaram.

**Onde mora.** [[LEELA-E10-marcas]] §S812 · [[V1-KANBAN]] card E10.

### 18. FORMBUILDER: perguntas personalizadas na compra e na inscrição

**O que é.** O organizador monta perguntas próprias, que aparecem na compra do evento e na inscrição em clube. A versão 1 tem três tipos: seleção única, seleção múltipla e sim/não. As regras estão fechadas: a resposta fica com o inscrito ou com o membro, nunca com o pedido, porque ela é atributo de quem participa; pergunta obrigatória sem resposta bloqueia o pagar no mesmo ponto de verificação no servidor que já barra os aceites; o teto de perguntas e de opções (20 e 10) vive como constante única no núcleo, para você ajustar num lugar só; editar uma pergunta versiona, e a resposta carimba a versão no ato, sem nunca reescrever resposta antiga; e as respostas saem junto da lista de inscritos que já existe, sem relatório novo. Você destravou isso em 2026-07-19. Anexo de arquivo fica para a fase 2, registrada sem elaboração.

**Por que importa.** Hoje o organizador que precisa de um dado extra pede por fora e monta planilha à mão. O versionamento é a parte que parece detalhe e não é: sem o carimbo, editar o texto de uma pergunta mudaria o significado das respostas antigas, e ninguém saberia a qual pergunta cada resposta responde.

**Exemplo de caso de uso.** O Castelo precisa saber o tamanho da camiseta do acompanhante e se a pessoa quer lugar no ônibus fretado. Hoje ele cria um formulário fora do sistema, manda o link no e-mail pós-compra, recebe resposta de pouco mais da metade dos inscritos e cruza duas planilhas na véspera, no celular, dentro do carro. O que deveria acontecer: as duas perguntas aparecerem no checkout de Ana, a do ônibus marcada como obrigatória (sem ela, o botão de pagar não fecha), e as respostas saírem na mesma exportação de inscritos que ele já usa no balcão.

**O que destrava.** Nada de decisão sua para a versão 1. Está executável na fila, com três histórias (construtor no evento, clube com inscrição, e o render na compra).

**Onde mora.** [[LEELA-E04-config-vendas]] · [[LEELA-E05-clubs]] · [[LEELA-E12-landing]] · `02-rodadas/2026-07-19-formbuilder-analise/` · [[V1-KANBAN]] card do construtor de formulário.

### 19. E11: analytics em CRM › Visão geral

**O que é.** Seis tarefas planejadas. O histórico diário já é coletado: todos os dias às 03:05 um retrato dos indicadores é gravado por data, por substituição total e de forma idempotente. É esse histórico que destrava o seletor de período. Hoje a tela lê sempre o retrato atual, então o seletor existe e é inerte, honestamente inerte. Com a série datada, um intervalo de datas passa a ser leitura de documentos em vez de agregado novo. A consolidação dessa série é o gargalo do épico: sem ela, nenhuma das três telas de analytics é despachável (o painel consolidado, a visão de comunidade e a conversão por link, que também precisa da atribuição gravada no retrato).

**Por que importa.** É a maior lacuna de planejamento da onda e a que destrava mais tela por tarefa. Também é a diferença entre o organizador decidir por sensação e decidir por comparação.

**Exemplo de caso de uso.** A Marina quer saber se antecipa a virada de lote do próximo evento. Para isso ela precisa comparar as vendas dos últimos 30 dias com os 30 anteriores. Ela troca o seletor de período e os números não mudam, porque a tela lê sempre o retrato de agora. Ela desiste, exporta o que consegue e monta a comparação numa planilha. O que deveria acontecer: o seletor recarregar indicadores e séries do intervalo escolhido, lendo a série diária que já está guardada desde antes de ela pedir.

**O que destrava.** Nada de decisão sua. Está na posição 5 da ordem ratificada, e a consolidação da série vem primeiro por dependência.

**Onde mora.** [[LEELA-E11-analytics]] · `02-rodadas/2026-07-19-espec-sweep/00-indice.md` · [[V1-KANBAN]] card E11.

### 20. Depois da fila: o app v1 é um PWA

**O que é.** Sua decisão de 2026-07-18: *"o app v1 pode ser um PWA, não tem problema."* Com isso o app do atleta na versão reduzida passa a ser um PWA, e o cadastro nas lojas deixa de bloquear o v1 (só bloquearia um app nativo posterior, de prioridade baixa). A spec vigente era para app nativo, então isso muda arquitetura: a re-especificação como PWA reduziu nove histórias para seis, e o ingresso passa a funcionar sem rede. O item aguarda a decisão de arquitetura quando a fila chegar lá. Na ordem ratificada no mesmo dia, o horizonte 3 vem antes do 2, com a estratégia de terminar por projeto: o produto web inteiro (E08, E10, E11) fecha antes do app, e o Creator Studio permanece por último.

**Por que importa.** Define o que vem depois da fila e, principalmente, o que não vem antes. Enquanto o web não fecha, o app não abre, e essa é uma escolha sua, não uma limitação técnica.

**Exemplo de caso de uso.** Ana chega ao evento do Castelo num ginásio onde o sinal de celular não entra. Hoje o ingresso dela é uma página que precisa de rede: sem sinal, sem QR, e a fila do balcão para enquanto alguém procura o nome na lista. Com o app v1 como PWA instalado, o ingresso abre sem rede e o balcão lê o QR sem depender da operadora do local. É o ganho concreto que a decisão compra, e ele entra depois de E08, E10 e E11.

**O que destrava.** Nada agora: é ordem, não pendência de decisão. O próximo ponto de decisão é a arquitetura do app reduzido, e ele chega quando a fila chegar.

**Onde mora.** [[DECISOES-ABERTAS]] bloco do app v1 como PWA · [[LEELA-E13-app-atleta]] · [[ROADMAP]] §5 · [[MODELO-ROADMAP]] §3.
