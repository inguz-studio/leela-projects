---
tags: [leela, visao, projeto, epicos, historias, tarefas]
aliases: [Visão de projeto, Onde estamos, O projeto inteiro numa página]
atualizado: 2026-08-11
---

# Visão de projeto

> Você disse que com o desenvolvimento perdeu a visão de projeto. Esta página existe para
> devolvê-la: quais épicos estão pendentes, que histórias eles têm, que tarefas cada história
> tem, o que está parado esperando você e o que anda sozinho. Uma leitura de dez minutos, sem
> abrir mais nada.
>
> **Retrato da noite de 11/08**, depois das duas janelas de trabalho do dia e da sua leva 6 de
> decisões. As três alturas continuam onde estavam: [[BOARD-EPICOS]] é o mapa de uma linha por
> épico, [[V1-KANBAN]] é o board vivo e [[CONVENCAO-BOARDS]] é a regra de como se escreve um card.

## Onde o produto está, em cinco linhas

O organizador **opera** o evento inteiro e **vende** ponta a ponta: o atleta descobre, se
inscreve e paga; ele vê a receita, estorna e pede o repasse. Isso está no ar.

O redesign **entrou na linha principal** em 11/08 e a primeira parte dele **subiu**: o painel com
a pele nova, a área de clubs com moldura, o painel de engajamento e a área de Parcerias estão em
produção, com a conferência visual fechada antes de subir. Depois desse deploy o dia produziu
muito mais — e tudo isso está **construído, na main e fora do ar**.

O que está sendo fechado agora é o **produto web**: o dinheiro em voo, o painel de administração,
os afiliados, o CRM e a análise. Depois vem o **app do atleta** como site instalável, e por último
a **camada social**. Fora da fila, com spec pronta e nenhuma linha escrita, está o **radar da
comunidade do WhatsApp**.

## O que mudou hoje, e é muito

**A sua leva 6, à noite, tirou onze decisões da sua mesa de uma vez.** O painel caiu de 25 para
**14 itens**. Três frentes que estavam paradas esperando você voltaram a andar: o pós-pagamento do
checkout, o painel de administração inteiro e o renome do "Serviço".

**As duas janelas de trabalho do dia entregaram, em ordem:**

1. **O deploy da madrugada** levou ao ar o chrome novo do painel, a área de clubs, o painel de
   engajamento e a área de Parcerias — com o gate visual fechado antes de subir, como a regra da
   casa manda.
2. **A revisão de componentes virou roadmap, cânone e trava.** A medição corrigiu o número que os
   boards carregavam: não são 40 telas com fundo cru (isso não existe no produto), são **223
   lugares** que reescreveram à mão um componente que já existia pronto. O mapa de qual componente
   é o padrão virou canônico, as seis ondas de conversão estão ordenadas, e a trava agora é código
   que roda com catraca — o número só pode cair.
3. **A Onda 0 e a Onda 1 da conversão foram pagas.** O design system parou de duplicar o próprio
   motor; o checkout e a página pública pararam de remontar o cartão da casa 38 vezes. E um clique
   inútil morreu: evento com uma modalidade e um kit só já vem escolhido, e **o checkout caiu de 16
   para 14 passos**.
4. **A venda mínima de R$ 10,00 virou regra no mesmo dia** em que você a decidiu (RN-559): um lote
   entre R$ 0,01 e R$ 9,99 não nasce mais, e a recusa diz o motivo na tela e no servidor.
5. **O painel master ganhou as listas globais** — todos os eventos e todos os clubs do sistema, com
   a produtora em cada linha e contador que não mente.
6. **Quinze melhorias de texto** entraram nas telas do redesign, mais a grade da Agenda navegável
   por teclado e o endereço público dos clubs saindo do código chumbado.
7. **Dois números que mentiam foram consertados no servidor**: o GMV de cada produtora, que nascia
   zero e ficava zero para sempre, e o funil, que dividia por inscrito em vez de por quem pagou.

**O que isso deixa pendente, e é o maior recado desta página:** tudo do item 2 em diante está na
main e **não está no ar**. O próximo deploy é grande, e ele não sobe sem a conferência visual.

## O placar

| Estado | Quantos | Quais |
|---|---|---|
| ✅ **Fechado** — nada aberto no board | 3 | E02 visão geral · E06 comunicação · E07 estados de sistema |
| 🔄 **Em curso** — tem trabalho sendo tocado agora | 9 | E00 · E01 · E04 · E05 · E08 · E10 · E12 · E16 · E18 |
| 📋 **Pendente** — tem trabalho planejado, ninguém tocando | 7 | E03 · E09 · E11 · E13 · E17 · E19 · E20 |
| 🧊 **Gelado** — adiado de propósito | 2 | E14 integrações de treino · E15 creator studio |

**Total: 21 épicos.** No board vivo: **46 cards abertos no backlog**, **15 em execução**, **3 em
execução já construídos e esperando deploy**, 112 feitos e 4 fora da V1.

O peso do que falta, por épico, contando só o que está aberto no board vivo:

| Épico | Cards abertos | Histórias abertas | Tarefas abertas |
|---|---|---|---|
| [[LEELA-E12-landing]] · landing, checkout e área do cliente | 22 | 28 | 60 |
| [[LEELA-E16-plataforma-superadmin]] · plataforma e admin | 9 | 12 | 63 |
| [[LEELA-E00-fundacao-tecnica]] · fundação e contas | 8 | 11 | 42 |
| [[LEELA-E04-config-vendas]] · configuração e vendas | 8 | 10 | 44 |
| [[LEELA-E09-financeiro-profissional]] · financeiro | 7 | 6 | 26 |
| [[LEELA-E01-design-system]] · design system e casca | 4 | 3 | 12 |
| [[LEELA-E05-clubs]] · clubs e comunidade | 4 | 5 | 12 |
| [[LEELA-E11-analytics]] · análise | 4 | 3 | 18 |
| [[LEELA-E19-crm]] · CRM | 4 | 1 | 14 |
| [[LEELA-E08-influenciador]] · afiliados | 4 | 1 | 1 |
| [[LEELA-E03-operacao-evento]] · operação do evento | 3 | 5 | 14 |
| [[LEELA-E10-marcas]] · marcas e parcerias | 2 | 1 | 5 |
| [[LEELA-E20-radar-comunidade]] · radar do WhatsApp | 1 | 9 | 0 |
| [[LEELA-E13-app-atleta]] · app do atleta | 1 | 0 | 0 |
| [[LEELA-E17-perfil-social]] · social no app | 1 | 0 | 0 |
| [[LEELA-E18-assessorias-parceiras]] · assessorias | 1 | 0 | 0 |

Uma história pode aparecer em dois épicos quando o trabalho atravessa os dois — o número da
esquerda conta cards, não trabalho duplicado. Os números caíram em vários épicos porque o dia
fechou tarefa, não porque alguém tirou trabalho da conta.

---

## Os épicos em curso

### E12 · Landing, checkout e área do cliente

O maior de todos, e por um motivo bom: é onde o dinheiro entra. Ganhou um card novo hoje à noite,
vindo direto da sua decisão.

**As três próximas entregas**

1. **A tela do pagamento avisa sozinha** — S1246, três tarefas: a tela passa a observar o pedido e
   cada desfecho ganha destino (PIX pago e PIX vencido vão para a área do cliente, cartão recusado
   volta ao checkout, cartão aceito mostra sucesso e leva junto). **Não espera nada** — nasceu
   decidida por você hoje.
2. **O painel do cliente vira painel de verdade** — S1233: casca com cabeçalho de conta, navegação
   que fica de pé e estados com nome próprio. Destravou na sua decisão da manhã ("já existe": é o
   `/minha-conta` de hoje ganhando casca, no mesmo endereço).
3. **A palavra "Serviço" nas três aplicações** — S1231, quatro tarefas. Destravou hoje à noite, com
   um cuidado: o inventário das 34 frases é de 09/08 e mira caminhos que o rename de Parcerias
   mudou, então a primeira tarefa é **re-inventariar antes de trocar**.

**O que fica esperando você:** ARENA-1 e ARENA-4 (o que aparece do que a pessoa preenche na Arena
Social, e o corte do vocabulário), PB-11 (no retry, a prova de aceite carimba a versão que a pessoa
não leu) e o item 12, o domínio público.

**O que ninguém pediu ainda e está parado:** o pedido de reembolso e a troca de titularidade pelo
lado de quem comprou (S1236 e S1237). As máquinas existem no servidor e têm tela do lado do
profissional; do lado da participante não existe nada.

### E16 · Plataforma e painel de administração

Nove cards e o maior número de tarefas do projeto — sessenta e três. **A onda 4 fechou hoje** (as
listas globais de eventos e clubs), e **os seus cinco vetos da noite destravaram as ondas 2, 3 e
5**. Quase tudo aqui é tela, não é regra: a apuração de 09/08 mostrou que nove dos onze itens já
existem no banco e nas regras.

**As três próximas entregas**

1. **A ficha da produtora por dentro** — S1612 e S1613: abas de eventos, clubs, clientes, vendas e
   financeiro numa rota só. "Faturamento gerado" agora tem nome definido por você: é a receita da
   Leela. Enquanto o custo operacional não existir em código, a parcela de custo aparece vazia com
   rótulo, em vez de fingir um número.
2. **O diretório de contas e a fila de aprovação** — S1615: uma tela, dois modos. O diretório passa
   a identificar por CPF ou documento estrangeiro, como você decidiu, por uma leitura de servidor
   auditada que registra cada consulta.
3. **A aprovação converge** — S1616: liberar direto e resgatar convite terminam no mesmo lugar, com
   registro de quem aprovou, e a tela descobre a liberação sem F5.

**O que fica esperando você:** ADMIN-USUARIOS-2 (recusar e revogar não existem — segura uma tarefa
só). E o **LGPD-1**, que continua olhando esta frente: com a ficha de cliente passando a mostrar
contato e documento, a superfície de dado pessoal do painel master ficou maior do que era quando o
item foi escrito.

### E04 · Configuração e vendas

Oito cards, quarenta e quatro tarefas. É o épico com mais trabalho especificado e não construído —
e a sua frase da noite mexeu na ordem dele.

**As três próximas entregas**

1. **A varredura do PIX vencido** — S322, quatro tarefas. Hoje um PIX abandonado seguraria a vaga
   para sempre. Você disse *"não podemos ter excedentes de ingressos jamais"*, e é exatamente isto
   que esta história protege.
2. **A vaga sai do estoque quando a cobrança nasce** — S323, sete tarefas, depois da S322 no ar.
   Uma tarefa só, o teto da reserva de cartão, fica retida no **ESTOURO-2**; o resto não espera.
3. **A lista de modalidades passa a ter dono** — S316: hoje ela nasce na criação do evento e morre
   lá.

**O que fica esperando você:** ESTOURO-2, e só. A venda mínima de R$ 10,00 já é código.

### E01 · Design system e casca do painel

Quatro cards. Três coisas grandes fecharam hoje: o cânone, a trava e as duas primeiras ondas de
conversão.

**As três próximas entregas**

1. **As ondas 2 a 5 da conversão** — operação do evento, o dinheiro que sai, a comunidade e o
   relance. Elas convertem cartão e botão e **não dependem de você**; podem começar antes da sua
   resposta sobre layout.
2. **A Onda 0 Parte B** — os primitivos de layout e os cartões de domínio. Retida no **CANONE-1**.
3. **O painel passa a se chamar Painel Profissional** — S034: o banco já chama a coleção de
   profissionais desde o começo; foi o texto que ficou preso em organizador.

**O que fica esperando você:** o **CANONE-1**, com a versão curta agora escrita no painel — o kit
de peças tem 50 peças e nenhuma é de moldura; 106 lugares montam moldura na mão, de 23 jeitos; a
pergunta é se o kit ganha peças oficiais de moldura ou se cada tela continua fazendo a sua.

### E05 · Clubs e comunidade

Quatro cards. A área de clubs e o painel de engajamento **estão no ar** desde a madrugada, e o
"Meus Clubes" vazio deixou de ser beco: agora aponta um caminho que existe.

**As três próximas entregas**

1. **Os três resíduos que a review achou** — desafio sem participante ainda desenha três barras em
   zero em vez do vazio honesto.
2. **A contagem de check-ins** — S115: um número só destrava três blocos do estudo que hoje dizem
   "em breve".
3. **O membro do club e o comprador viram a mesma pessoa** — S1904, que mora no E19 e fecha a
   pergunta de quantos da comunidade viraram inscritos.

**O que fica esperando você:** nada. O CLUBES-1 fechou.

### E10, E18 e E08 · Marcas, parcerias, assessorias e afiliados

A área **Parcerias está no ar**: o item do menu mudou de nome e juntou marcas, assessorias e
afiliações num lugar só.

**As três próximas entregas**

1. **As ativações da marca** — S812: saber em quantos patrocínios cada marca é usada.
2. **O campo de valor do repasse** — S708: hoje "1.500" vira quinze reais, porque o separador de
   milhar é lido como centavo.
3. **O desconto retroativo do clube-influenciador** — aguarda sua revisão da hipótese, sem pressa.

**O que fica esperando você:** se o épico também muda de nome nos arquivos. Na tela a área já se
chama Parcerias; o épico continua se chamando Marcas.

### E00 · Fundação, contas e entrada

Oito cards. O assunto é sempre o mesmo: quem entra, como entra e o que a plataforma prova sobre
esse aceite.

**As três próximas entregas**

1. **Virar profissional deixa de ser cadastro** — S033 e S1611: a porta encolhe de sete perguntas
   para quatro e serve cliente e profissional.
2. **A conta de administração é outra** — S032: administração não acumula com organizador nem com
   cliente. Junto vem o que a sua decisão de hoje mandou para a esteira: o seed para de semear
   administrador contra o projeto real, e nenhuma conta de demonstração nasce de novo.
3. **A prontidão de deploy entra na esteira** — S040: o conferidor existe e roda pelo caminho
   longo; falta o atalho e o passo automático.

**O que fica esperando você:** LGPD-1 (um organizador pode estar ativo sem prova de que aceitou o
termo — segura o primeiro convite de organizador) e PB-11.

---

## Os épicos pendentes

### E09 · Financeiro

Sete cards, nenhum sendo tocado. As duas decisões que os seguravam caíram hoje.

**As três próximas entregas**

1. **O piso do Serviço** — S907, seis tarefas, todas mexendo em dinheiro, com a tabela nascendo
   vazia para nada mudar em produção até você configurar. Destravou com o piso de R$ 3,00
   ratificado por você e a venda mínima de R$ 10,00 já construída: o líquido do organizador nunca
   fica negativo.
2. **O ticket médio como campo do agregado** — S908: a conta na tela já está certa, e você
   ratificou a régua (compra estornada fora do denominador). O que sobra é materializar o número se
   e quando alguém fora da tela precisar dele.
3. **O documento do repasse confere os dígitos** — S906: hoje qualquer sequência de onze ou catorze
   dígitos passa.

**O que fica esperando você:** JUROS-1 — abrir os termos comerciais do Castelo no painel e salvar
sem mudar nada, para o histórico voltar a bater.

### E03 · Operação do evento

Três cards. O maior deles é a outra metade da métrica de pagante.

**As três próximas entregas**

1. **O contador de pagantes** — S221: quatro tarefas, incluindo o teste que prova que separar o
   número exibido não afrouxou a fechadura que congela a configuração do evento.
2. **O kit não vende desconto** — S318: o reparo em produção ficou sem objeto na purga de 10/08, e
   o que sobra é a fonte do seed, para uma terceira execução não ressuscitar os dois kits.
3. **O credenciamento** — S211: a tabela do organizador e o código curto ao lado do QR.

**O que fica esperando você:** nada. SEMKIT-1 e SEMKIT-2 saíram do painel hoje.

### E11 · Análise

Quatro cards. É onde as perguntas de "de onde vem a venda" ainda não têm resposta.

**As três próximas entregas**

1. **O cartão de conversão para de prometer o que não medimos** — S824-T1: o rótulo de visitantes
   deixa de aparecer enquanto não houver contagem de visitas. A outra metade já foi paga hoje no
   servidor.
2. **A forma de pagamento vira número** — S825: o dado existe em cada pedido e nenhum resumo chega
   à tela.
3. **De onde vem a venda e de onde vem o público** — canal de origem com a comissão de cada um.
   Espera o CRM-1.

### E19 · CRM

Quatro cards. O backend está pronto e a lista com histórico está no ar; o que falta é decidir o que
se pergunta ao participante.

**As três próximas entregas**

1. **O membro do club e o comprador viram a mesma pessoa** — S1904.
2. **As visões da primeira leva** — espera o CRM-1.
3. **A localização como agregado** — espera o CRM-2.

**O que fica esperando você:** CRM-1, CRM-2, CRM-3 e CRM-4. Quatro perguntas, e o épico inteiro
atrás delas.

### E20 · Radar da comunidade do WhatsApp

Um card, nove histórias, zero linha de código. A spec está completa, foi revisada por antagonista e
teve os buracos da verificação fechados em 10/08.

**As três próximas entregas**

1. **S2001** — provar que o número sobrevive antes de existir produto: parear o aparelho e operar
   catorze dias registrando o laudo.
2. **S2002** — a ponte de dados sobe agregado contra o emulador, com regras fechadas para todo
   cliente.
3. **S2003** — o radar vira tela no painel, com o termo do organizador como pré-condição de ligar.

**Registrado:** o risco jurídico foi assumido por você. A fase F1 continua atrás do LGPD-1.

### E13 · App do atleta, e E17 · Social no app

Os dois esperam a mesma coisa: a ratificação de que o app nasce como site instalável em vez de
aplicativo de loja. Com essa decisão, o bloqueio das lojas morre, o ingresso passa a funcionar sem
rede, e de nove histórias sobram seis.

---

## O que está travado em você

**Quatorze itens, e eram vinte e cinco de manhã.** Doze decisões e duas ações, todas no painel
canônico [[DECISOES-ABERTAS]], que é o lugar único delas. O que esta página acrescenta é o **custo
de cada espera**:

| Decisão | O que ela segura |
|---|---|
| **LGPD-1** | o primeiro convite de organizador, que está retido; e agora também a leitura jurídica da ficha de cliente do painel master |
| **CRM-1 a CRM-4** | o épico do CRM inteiro, que é onde a base de contatos vira retenção |
| **CANONE-1** | a onda de fundação do design system. As ondas de tela **não** dependem dela e podem começar antes |
| **ADMIN-USUARIOS-2** | recusar e revogar acesso — uma tarefa da fila de aprovação |
| **ARENA-1 e ARENA-4** | a tela de interesses da Arena Social e o vocabulário que ela expõe |
| **ESTOURO-2** | uma tarefa da reserva de vaga; o resto da história anda sem ela |
| **PB-11** | a prova de aceite no retry — decisão jurídica, não técnica |
| **12 · domínio público** | o endereço definitivo do produto e o remetente do e-mail |

**As duas ações que só você executa:** a conferência visual das telas novas (agora com um lote
grande esperando deploy) e o **JUROS-1**, que é abrir os termos comerciais no painel e salvar.

**Fora do painel, e continua fora:** seis vetos pequenos que a rodada do redesign produziu — a
lista das frases de apoio cortadas, a proposta em duas fases para alcançar as modalidades, o título
"Modalidades da comunidade", o nome do épico de Marcas, o H1 em itálico contra o peso 800, e se a
landing passa a dizer "Acessar painel profissional". Todos rodam com default em vigor e nenhum
segura tarefa. Se você quiser vê-los no painel, eles sobem na próxima aterrissagem.

## O que anda sozinho, sem depender de você

A fila que a leva 6 deixou ordenada, e nenhuma destas lanes precisa de resposta sua:

1. 🔄 **REGISTRO-BOARDS** — esta aterrissagem: painel limpo, regras novas, épicos e boards em dia.
2. 📋 **CKPIX-FLOW** — a tela do pagamento reage sozinha nos quatro ramos que você escreveu.
3. 📋 **ESTOURO-BUILD** — a varredura do PIX vencido e a reserva da vaga, para o excedente não
   existir.
4. 📋 **ADMIN-VISAO ondas 2, 3 e 5** — a ficha da produtora, a aba de clientes e o diretório de
   contas.
5. 📋 **SERV3-RENOME** — as 34 frases, com o re-inventário antes.
6. 📋 **As ondas 2 a 5 do roadmap de componentes** — conversão de cartão e botão, tela por tela.
7. ⛔ **O deploy**, que **não sobe sem a conferência visual**. Se ela não puder ser feita aqui, ela
   é sua, antes de qualquer "está no ar".

## As três próximas entregas do projeto inteiro

Se for para olhar uma coisa só de cada frente, é esta:

| Frente | A próxima entrega | Espera alguém? |
|---|---|---|
| **Dinheiro** | a vaga deixa de estourar: varredura do PIX vencido + reserva do pendente | não |
| **Checkout** | a tela do pagamento avisa sozinha e leva a pessoa para a área dela | não |
| **Administração** | a ficha da produtora por dentro, com a economia dela | não |
| **Produto no ar** | o deploy do lote grande de 11/08, com conferência visual | você, se a conferência não puder ser feita aqui |

## O que os boards ainda dizem errado

Três achados continuam abertos da varredura de 11/08 de manhã, e os três são decisão, não faxina.

1. **O checklist executável parou em 06/08**, enquanto o kanban e os épicos seguiram. Ou ele volta
   a ser mantido, ou deixa de ser a terceira altura e a tarefa passa a viver só no card e no épico.
2. **Dois cards abertos não têm âncora de épico** — usam etiquetas como Plano e Higiene. A regra da
   casa diz que card se ancora em épico, então esses dois precisam de destino.
3. **Cinco histórias ainda vivem só no kanban e na pasta da rodada**, sem constar do épico: S1231,
   S1611, S1242, S1243 e S031. Elas entram na próxima aterrissagem que as tocar — a S1231 é a mais
   provável, porque o renome do Serviço acabou de destravar.

Os três achados desta mesma varredura que **já foram consertados** ficam anotados aqui para não
serem redescobertos: as levas 3, 4 e 5 do redesign viravam código sem card (sete histórias novas
entraram em épicos que já existiam), nove histórias viviam só na pasta da rodada e no kanban
(quatro já subiram ao épico), e o radar do WhatsApp tinha spec completa e zero presença no board
(entrou com as nove histórias).

## Como manter esta página viva

Ela se atualiza na aterrissagem de cada rodada, junto com o kanban e o épico — mesma regra que já
vale para os boards. Se uma rodada nova não puder apontar suas tarefas para uma história que já
existe, o certo é criar a história dentro de um épico cadastrado; épico novo só quando o trabalho
não couber em nenhum dos vinte e um.
