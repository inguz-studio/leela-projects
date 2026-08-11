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
> As três alturas continuam onde estavam: [[BOARD-EPICOS]] é o mapa de uma linha por épico,
> [[V1-KANBAN]] é o board vivo e [[CONVENCAO-BOARDS]] é a regra de como se escreve um card.

## Onde o produto está, em cinco linhas

O organizador **opera** o evento inteiro e **vende** ponta a ponta: o atleta descobre, se
inscreve e paga; ele vê a receita, estorna e pede o repasse. Isso está no ar.

O que está sendo fechado agora é o **produto web**: o dinheiro que está em voo, os afiliados, as
marcas, o CRM e a análise. Em paralelo, o **redesign** trocou a pele do painel inteiro — tema
novo, camada de vidro, menus, navegação de área — e esse trabalho está **construído e fora do
ar**, esperando entrar na linha principal e subir com conferência visual.

Depois vem o **app do atleta**, agora como site instalável em vez de aplicativo de loja. Por
último a **camada social**. Fora dessa fila, com spec pronta e nenhuma linha escrita, está o
**radar da comunidade do WhatsApp**.

## O placar

| Estado | Quantos | Quais |
|---|---|---|
| ✅ **Fechado** — nada aberto no board | 3 | E02 visão geral · E06 comunicação · E07 estados de sistema |
| 🔄 **Em curso** — tem trabalho sendo tocado agora | 9 | E00 · E01 · E04 · E05 · E08 · E10 · E12 · E16 · E18 |
| 📋 **Pendente** — tem trabalho planejado, ninguém tocando | 7 | E03 · E09 · E11 · E13 · E17 · E19 · E20 |
| 🧊 **Gelado** — adiado de propósito | 2 | E14 integrações de treino · E15 creator studio |

**Total: 21 épicos.** No board vivo: **46 cards no backlog**, **15 em execução**, 112 feitos e
4 fora da V1.

O peso do que falta, por épico, contando só o que está aberto:

| Épico | Cards abertos | Histórias abertas | Tarefas abertas |
|---|---|---|---|
| [[LEELA-E12-landing]] · landing, checkout e área do cliente | 21 | 27 | 57 |
| [[LEELA-E16-plataforma-superadmin]] · plataforma e admin | 9 | 13 | 66 |
| [[LEELA-E00-fundacao-tecnica]] · fundação e contas | 8 | 11 | 42 |
| [[LEELA-E04-config-vendas]] · configuração e vendas | 8 | 10 | 44 |
| [[LEELA-E09-financeiro-profissional]] · financeiro | 7 | 6 | 26 |
| [[LEELA-E01-design-system]] · design system e casca | 5 | 5 | 17 |
| [[LEELA-E05-clubs]] · clubs e comunidade | 4 | 6 | 14 |
| [[LEELA-E08-influenciador]] · afiliados | 4 | 2 | 5 |
| [[LEELA-E11-analytics]] · análise | 4 | 3 | 17 |
| [[LEELA-E19-crm]] · CRM | 4 | 1 | 14 |
| [[LEELA-E03-operacao-evento]] · operação do evento | 3 | 5 | 14 |
| [[LEELA-E10-marcas]] · marcas e parcerias | 2 | 2 | 9 |
| [[LEELA-E13-app-atleta]] · app do atleta | 2 | 0 | 0 |
| [[LEELA-E18-assessorias-parceiras]] · assessorias | 1 | 1 | 4 |
| [[LEELA-E17-perfil-social]] · social no app | 1 | 0 | 0 |
| [[LEELA-E20-radar-comunidade]] · radar do WhatsApp | 1 | 9 | 0 |

Uma história pode aparecer em dois épicos quando o trabalho atravessa os dois — o número da
esquerda conta cards, não trabalho duplicado.

---

## Os épicos em curso

### E12 · Landing, checkout e área do cliente

O maior de todos, e por um motivo bom: é onde o dinheiro entra. Está em execução com oito cards.

**As três próximas entregas**

1. **A área do cliente vira painel de verdade** — S1233: casca com cabeçalho de conta, navegação
   que fica de pé e estados com nome próprio. Espera você no **PCLIENTE-1**.
2. **A porta entre o painel do cliente e o profissional** — S1234 e S1235: o defeito está
   consertado e no ar; falta declarar a travessia nos dois sentidos.
3. **O primeiro acesso e a criação de conta pela landing** — S1229 e S1230: o código de seis
   dígitos vira a prova de que o e-mail é seu, e nenhuma conta nasce antes disso.

**O que fica esperando você:** PCLIENTE-1 (a forma do painel do cliente), PONTE-CTA-1 (você deu
três nomes para a mesma porta e só um pode subir), ARENA-1 e ARENA-4 (o que aparece do que a
pessoa preenche na Arena Social), SERV-3 (até onde vai a palavra "Serviço" — segura quatro
tarefas de renomeação inteiras).

**O que ninguém pediu ainda e está parado:** o pedido de reembolso e a troca de titularidade pelo
lado de quem comprou (S1236 e S1237). As máquinas existem no servidor e têm tela do lado do
profissional; do lado da participante não existe nada. É promessa não cumprida.

### E16 · Plataforma e painel de administração

Nove cards abertos e o maior número de tarefas do projeto — sessenta e seis. Quase tudo é tela,
não é regra: a apuração de 09/08 mostrou que nove dos onze itens da visão de administração já
existem no banco e nas regras.

**As três próximas entregas**

1. **A ficha da produtora por dentro** — S1612 e S1613: você abre uma produtora e vê os eventos,
   os clubs, os clientes e a economia dela numa rota com abas.
2. **O diretório de contas e a fila de aprovação** — S1615: uma tela, dois modos, e o mais
   fechado é o padrão.
3. **A aprovação converge** — S1616: liberar direto e resgatar convite terminam no mesmo lugar,
   com registro de quem aprovou.

**O que fica esperando você:** ADMINVISAO-1 a ADMINVISAO-5 (cinco perguntas que seguram a onda
inteira), ADMIN-USUARIOS-2 (recusar e revogar não existem), ADMINSEP-3 (a conta de administração
de produção é a mesma da demonstração — ação sua, não decisão).

### E00 · Fundação, contas e entrada

Oito cards. O assunto é sempre o mesmo: quem entra, como entra e o que a plataforma prova sobre
esse aceite.

**As três próximas entregas**

1. **Virar profissional deixa de ser cadastro** — S033 e S1611: a porta encolhe de sete
   perguntas para quatro e serve cliente e profissional.
2. **A conta de administração é outra** — S032: administração não acumula com organizador nem
   com cliente; comprar um ingresso com o e-mail da administração não pode criar vínculo.
3. **A prontidão de deploy entra na esteira** — S040: o conferidor existe e roda pelo caminho
   longo; falta o atalho e o passo automático.

**O que fica esperando você:** LGPD-1 (um organizador pode estar ativo sem prova de que aceitou o
termo — segura o primeiro convite), PB-11 (no retry, a prova de aceite carimba a versão que a
pessoa não leu).

### E04 · Configuração e vendas

Oito cards, quarenta e quatro tarefas. É o épico com mais trabalho especificado e não construído.

**As três próximas entregas**

1. **A vaga sai do estoque quando a cobrança nasce** — S322 e S323: sua decisão de 09/08. E a
   varredura do PIX vencido, que hoje não existe — sem ela um PIX abandonado segura a vaga para
   sempre.
2. **A lista de modalidades passa a ter dono** — S316: hoje ela nasce na criação do evento e
   morre lá. Você voltou ao assunto em 10/08.
3. **O lote pode dispensar o kit** — S317: o interruptor por lote, ligado por padrão para nada
   mudar de comportamento sozinho.

**O que fica esperando você:** ESTOURO-2 (por quanto tempo o pendente de cartão reserva a vaga —
segura uma tarefa da S323), a proposta em duas fases das modalidades, SEMKIT-1 (o reparo dos dois
kits de produção é escrito em campo de preço e precisa da sua autorização).

### E01 · Design system e casca do painel

Cinco cards. Três deles são o redesign, construído e fora do ar.

**As três próximas entregas**

1. **A barra de abas fica transparente** — S004-T6, a última tarefa da história do chrome novo.
   Está na lane em voo.
2. **O painel passa a se chamar Painel Profissional** — S034: o banco já chama a coleção de
   profissionais desde o começo; foi a copy que ficou presa em organizador.
3. **A trava que reprova componente feito à mão** — S005-T5, o código do gate `leela-canon`. É a
   única tarefa que sobrou da revisão de componentes: o inventário, o cânone e as ondas
   aterrissaram em 11/08.

**O que a revisão de componentes descobriu, e vale ler antes das ondas.** Sua ordem de 10/08 virou
medição, e a medição corrigiu o número que este board carregava. Não são 40 telas com fundo cru:
fundo cru literal não existe no produto, e todos os tokens estão certos. São **192 superfícies que
reescreveram à mão o cartão que já existia pronto**, mais 17 botões, 8 estados vazios e 5 controles
crus — 223 no total. Dois dos cinco controles crus estão dentro do próprio design system. E o
design system não tem componente de layout nenhum, o que quer dizer que bento e slot, dois dos
padrões que você citou, não podiam ser respeitados porque não existiam. Detalhe em
`02-rodadas/2026-08-11-roadmap-componentes/`.

**O que fica esperando você:** o **CANONE-1** — o design system ganha layout e cartão de domínio, ou
isso continua receita de tela. Mais o que já estava: a lista das frases de apoio que foram cortadas,
o H1 em itálico contra o peso 800, e se "flat" quer dizer item de menu ou variante de botão.

### E05 · Clubs e comunidade

Quatro cards. Dois são o redesign da área; dois são o que a comunidade ainda não sabe contar.

**As três próximas entregas**

1. **A área de clubs para de abandonar quem entra** — S113: o menu passa a ser do layout da área,
   e cada rota prova que tem exatamente um menu.
2. **Os três resíduos que a review achou** — desafio sem participante ainda desenha três barras
   em zero em vez do vazio honesto.
3. **A contagem de check-ins** — S115: um número só destrava três blocos do estudo que hoje dizem
   "em breve".

**O que fica esperando você:** CLUBES-1 — "Meus Clubes" nasce vazio porque não existe caminho
para um participante entrar num clube.

### E10 e E18 · Marcas, parcerias e assessorias

Dois cards no E10, um no E18, e os dois convergem para a mesma entrega.

**As três próximas entregas**

1. **Marcas vira Parcerias** — S813: o item do menu troca de nome e a área junta marcas,
   assessorias parceiras e afiliações. Está na lane em voo.
2. **As ativações da marca** — S812: saber em quantos patrocínios cada marca é usada.
3. **O endereço antigo continua funcionando** — S813-T3: link salvo não morre.

**O que fica esperando você:** se o épico também muda de nome nos arquivos. Hoje a área na tela
se chama Parcerias e o épico continua se chamando Marcas.

### E08 · Afiliados e influenciadores

Quatro cards, cinco tarefas. É o épico mais leve dos que estão em curso.

**As três próximas entregas**

1. **A migração para Parcerias** — as telas de afiliação passam a morar na área nova.
2. **O campo de valor do repasse** — S708: hoje "1.500" vira quinze reais, porque o separador de
   milhar é lido como centavo.
3. **O desconto retroativo do clube-influenciador** — aguarda sua revisão da hipótese.

---

## Os épicos pendentes

### E09 · Financeiro

Sete cards, nenhum sendo tocado. Duas frentes seguram tudo.

**As três próximas entregas**

1. **O ticket médio conta cliente que pagou** — S908: você reforçou isso em 10/08 e a resposta
   honesta foi que não estava em vias de correção. A conta errada foi localizada na hora.
2. **O piso do Serviço** — S907: seis tarefas, todas mexendo em dinheiro, com a tabela nascendo
   vazia para nada mudar em produção até você configurar.
3. **O documento do repasse confere os dígitos** — S906: hoje qualquer sequência de onze ou
   catorze dígitos passa.

**O que fica esperando você:** SERV-3 e JUROS-1 (salvar os termos comerciais no painel para
selar o rastro). **SERV-1 e SERV-2 saíram em 11/08:** você ratificou o piso de três reais e
decidiu a venda mínima de dez, que foi construída no mesmo dia — um lote entre R$ 0,01 e R$ 9,99
não pode mais nascer, e a inscrição gratuita continua permitida. Com os dois números de pé, o
líquido do organizador nunca fica negativo, e a S907 destrava para o piso entrar na tabela.

### E03 · Operação do evento

Três cards. O maior deles é a outra metade da métrica de pagante.

**As três próximas entregas**

1. **O contador de pagantes** — S221: quatro tarefas, incluindo o teste de ataque que prova que
   separar o número exibido não afrouxou a fechadura que congela a configuração do evento.
2. **O kit não vende desconto** — S318: "sem kit" era um kit com preço negativo, e você revogou
   isso.
3. **O credenciamento** — S211: a tabela do organizador e o código curto ao lado do QR.

### E11 · Análise

Quatro cards. É onde as perguntas de "de onde vem a venda" ainda não têm resposta.

**As três próximas entregas**

1. **O cartão de conversão para de prometer o que não medimos** — S824: o rótulo de visitantes
   deixa de ser desenhado sem o número que o sustenta.
2. **A forma de pagamento vira número** — S825: o dado existe em cada pedido e nenhum resumo
   chega à tela.
3. **De onde vem a venda e de onde vem o público** — canal de origem com a comissão de cada um.

**O que fica esperando você:** CONV-1, se o contador de visitas passa a existir.

### E19 · CRM

Quatro cards. O backend está pronto e a lista com histórico já está no ar; o que falta é decidir
o que se pergunta ao participante.

**As três próximas entregas**

1. **O membro do club e o comprador viram a mesma pessoa** — S1904: sem isso, o estudo não
   consegue dizer quantos da comunidade viraram inscritos.
2. **As visões da primeira leva** — espera CRM-1.
3. **A localização como agregado** — espera CRM-2.

**O que fica esperando você:** CRM-1, CRM-2, CRM-3 e CRM-4. Quatro perguntas, e as três entregas
acima dependem delas.

### E20 · Radar da comunidade do WhatsApp

Um card, nove histórias, zero linha de código. A spec está completa, foi revisada por antagonista
e teve os buracos da verificação fechados em 10/08.

**As três próximas entregas**

1. **S2001** — provar que o número sobrevive antes de existir produto: parear o aparelho e operar
   catorze dias registrando o laudo.
2. **S2002** — a ponte de dados sobe agregado contra o emulador, com regras fechadas para todo
   cliente.
3. **S2003** — o radar vira tela de verdade no painel, com o termo do organizador como
   pré-condição de ligar.

**Registrado:** o risco jurídico foi assumido por você.

### E13 · App do atleta, e E17 · Social no app

Os dois esperam a mesma coisa: a ratificação de que o app do atleta nasce como site instalável em
vez de aplicativo de loja. Com essa decisão, o bloqueio das lojas morre, o ingresso passa a
funcionar sem rede, e de nove histórias sobram seis.

---

## O que está travado em você

Vinte e quatro decisões estão no painel canônico [[DECISOES-ABERTAS]] esperando sua palavra, mais
três ações que só você executa. Elas não estão repetidas aqui de propósito — o painel é o lugar
único delas. O que esta página acrescenta é **o custo de cada espera**:

| Decisão | O que ela segura |
|---|---|
| **SERV-3** | quatro tarefas de renomeação, em três aplicações |
| **CRM-1 a CRM-4** | o épico do CRM inteiro, que é onde a base de contatos vira retenção |
| **ADMINVISAO-1 a 5** | a onda inteira do painel de administração — sessenta e seis tarefas atrás delas |
| **LGPD-1** | o primeiro convite de organizador, que está retido |
| **PCLIENTE-1** | a casca do painel do cliente |
| **ESTOURO-2** | uma tarefa da reserva de vaga; o resto da história anda sem ela |
| **CONV-1** | o cartão de conversão sair da honestidade e virar número |
| **CLUBES-1** | "Meus Clubes" deixar de nascer vazio |
| **SEMKIT-1** | o reparo dos dois kits de produção |
| **ADMIN-USUARIOS-2** | recusar e revogar acesso |
| **CANONE-1** | a onda de fundação do design system: primitivos de layout e cartões de domínio. As ondas de tela que só convertem cartão e botão **não** dependem dela e podem começar antes |

Além dessas, a rodada do redesign produziu decisões novas que ainda estão entrando no painel:

- a **lista das frases de apoio cortadas** (você pediu o corte; a lista é sua para vetar);
- a **proposta em duas fases** para alcançar as modalidades a partir de lotes;
- o título **"Modalidades da comunidade"** no lugar de "Top 5 modalidades de interesse" — o
  interesse declarado não existe como dado;
- o **nome do épico** de Marcas, agora que a área na tela se chama Parcerias;
- **H1 em itálico contra peso 800**, que é decisão de design system global;
- se a landing passa a dizer **"Acessar painel profissional"**, para casar com o resto.

**Ações que só você pode executar:** ADMINSEP-3 (separar a conta de administração de produção da
conta de demonstração), a conferência visual das telas novas, e JUROS-1.

## O que anda sozinho, sem depender de você

A ordem da noite de 11/08, com o que já aterrissou marcado:

1. ✅ o painel de engajamento desenhado chegou à tela — três faixas, ocupação real, modalidades
   reais e os blocos sem fonte dizendo por quê;
2. 🔄 Marcas vira Parcerias, e a área de clubs ganha moldura de verdade;
3. 📋 a métrica que conta cliente pagante, na tela e no servidor;
4. 📋 a revisão de texto das telas do redesign;
5. 📋 a review antagonista de tudo que a rodada produziu, e só então o merge;
6. 📋 o roadmap de revisão de componentes;
7. 📋 o deploy, que **não sobe sem a conferência visual** — se ela não puder ser feita aqui, ela é
   sua, antes de qualquer "está no ar".

## O que os boards estavam dizendo errado

Seis achados desta varredura. Os três primeiros já foram consertados nesta rodada; os três
últimos ficam anotados porque consertá-los é decisão, não faxina.

1. **A leva 3, 4 e 5 do redesign não tinha card nem história.** Treze decisões suas de 10 e 11 de
   agosto viravam código sem existir no board. Consertado: sete histórias novas em épicos que já
   existiam, e nenhum épico novo precisou nascer.
2. **Nove histórias viviam só na pasta da rodada e no kanban**, sem constar do épico: S221, S907,
   S908, S824, S1231, S1611, S1242, S1243 e S031. As quatro primeiras foram consolidadas nos
   épicos agora; as outras cinco ficam para a próxima aterrissagem que as tocar.
3. **O radar do WhatsApp tinha spec completa e zero presença no board.** Um épico inteiro invisível
   para quem lê o kanban. Consertado: entrou com as nove histórias.
4. **Um card em "Feito" descrevia trabalho que não está no ar.** O engajamento do redesign v2 vive
   numa branch. Ficou marcado como construído e fora do ar; a régua da casa é que feito quer dizer
   no ar.
5. **O checklist executável parou em 06/08**, enquanto o kanban e os épicos seguiram até 11/08. Ou
   ele volta a ser mantido, ou deixa de ser a terceira altura e a tarefa passa a viver só no card
   e no épico. É decisão de processo, e prefiro que seja sua.
6. **Nove cards não têm âncora de épico** — usam etiquetas como Plano, Higiene, Consolidações,
   Decisões e Docs. Sete já estão fechados e são história; dois continuam abertos no backlog. A
   regra diz que card se ancora em épico, então esses dois precisam de destino.

## Como manter esta página viva

Ela se atualiza na aterrissagem de cada rodada, junto com o kanban e o épico — mesma regra que já
vale para os boards. Se uma rodada nova não puder apontar suas tarefas para uma história que já
existe, o certo é criar a história dentro de um épico cadastrado; épico novo só quando o trabalho
não couber em nenhum dos vinte e um.
