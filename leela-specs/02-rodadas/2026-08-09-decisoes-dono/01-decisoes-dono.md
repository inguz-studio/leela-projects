---
tags: [leela, decisoes, rodada, dono, servico, juros, estouro, semkit, arena, crm, clubes, admin]
trace: leela-dec-0809
lote: DEC-0809-REGISTRO
data: 2026-08-09
---

# 01-decisões do dono · a leva de 09/08

> **O que esta página é.** O dono respondeu quinze frentes do painel numa mensagem só, em 09/08,
> pelo chat. Aqui está cada uma registrada: o trecho verbatim que a decide, a leitura que o maestro
> faz dela, o que ela fecha, o que ela abre e onde aterrissa. O trabalho que sai daqui está em
> [[02-fila-execucao]].
>
> **O que esta página não é.** Não é o painel. O [[DECISOES-ABERTAS]] continua sendo o único lugar
> onde as pendências vivem, e a passada que retira de lá os itens fechados aqui é outra lane, depois
> que a REV-CORTE aterrissar. Enquanto isso não acontece, o painel e esta página divergem de
> propósito, e quem lê o painel lê a verdade antiga.
>
> **A leitura do maestro é corrigível.** Cada bloco separa o que o dono disse do que eu entendi que
> ele disse. Onde a frase dele não alcança a pergunta inteira, está escrito que não alcança, em vez
> de eu completar por ele.

## O verbatim completo, sem retoque

Preservado inteiro, com os erros de digitação, porque é o registro e não a transcrição:

> "serv2 - pedido minimo é de 10,00 (e parcela também). serv1 - nao se preoupe, já sei. pode cobrar
> no minimo 3 de taxa. serviço é a taxa de serviço que cobramos. nós pagamos o juros, abate do que
> iria para nós. Mas nao trabalhraremos com isso agora. Podemos deixar até 3x sem juros, e nós
> cuidamos do custo daoperação, e nao cobramos a mais do pessoal. estouro 1. Se um pedido eesta com
> pagamento pednente, a vaga nao está disponivel para compra. semkit1 - só ajuste ja que os testes
> ainda nao sao reais, e sao testes. sem clientes de verdade. nao existem descontos quando nao tem
> kit, e ponto final. o organizador decide o que está disponivel ou nao. podeme xistir eventos sem
> kits. DOminio depois te passo. PB-11 nao precisa se preocupar, nao quero arquivar esse tipo de
> informação ainda. AERNA 1  Outras pessoas verão futuramente no app, arena2- Nao temos essa
> listgem? de acordo com o spilares e modaldiades disponiveis? podemos usar de base.CRM - DEPOIS TE
> FALO. mEUS CLUBES - deixa cta para se isncrever em um. admin usuários, esse cadastro deve aparecer
> no painel master. que lá eu aprovarei, passando um código. Ou liberando diretamente o acesso. O
> modal de liberar acesso deve aparecer depois que a pessoa já entra no sistema e tenta fazer alguma
> ação. super admin nao deve ser o demo, ja temos o inguzbuilders como e-mail. 69 - pode buscar
> ourtas bibliotecas para utilizarmos os icones."

## O placar

Quinze blocos, cobrindo **vinte** linhas do painel. Quinze fecham, cinco continuam dele.

| | Linhas do painel |
|---|---|
| Fecham nesta leva | 15 · SERV-1, SERV-2, SERV-3, JUROS-3, JUROS-4, ESTOURO-1, SEMKIT-1, SEMKIT-2, PB-11, ARENA-1, ARENA-2, CLUBES-1, ADMIN-USUARIOS-1, ADMINSEP-3, 69 |
| Seguem com o dono | 5 · item 12, CRM-1, CRM-2, CRM-3, CRM-4 |
| Conferidas de passagem, sem decisão nova | 2 · JUROS-1 e JUROS-5, nas Ações |

O **SEMKIT-2** entra na conta sem ter sido chamado pelo nome. A frase do dono sobre kit responde a
pergunta dele por inteiro, e deixá-lo aberto seria manter no painel um item já respondido. Está
registrado dentro do bloco 6, com a ressalva de que a inclusão é leitura do maestro.

---

## 1 · SERV-2 · pedido mínimo de R$ 10,00, e parcela também

> "serv2 - pedido minimo é de 10,00 (e parcela também)."

**Leitura do maestro.** O dono não escolheu entre as duas opções que o painel ofereceu, e resolveu o
problema por fora das duas: em vez de limitar o Serviço ou aceitar que o organizador receba zero, ele
crava um **piso na venda**. Abaixo de R$ 10,00 não existe pedido. Com o piso do Serviço em R$ 3,00, o
caso que abriu o item deixa de ser representável, porque a venda de R$ 2,00 não nasce.

**O que fecha.** Pedido mínimo de R$ 10,00 e parcela mínima de R$ 10,00. A escolha é a terceira
opção do item, "preço mínimo de venda acima do piso", e o número é dele. O default proposto (o
Serviço nunca ultrapassa a face) continua valendo como rede de segurança aritmética, e não como a
resposta: ele passa a ser o comportamento de um caso que a validação já não deixa acontecer.

**O que abre.** Duas metades, e uma delas já está paga.

A **parcela** mínima já é o que roda. `DEFAULT_COMMERCIAL_TERMS` nasce com `parcelaMinima: 10`
(`packages/core/src/platform/commercialTerms.ts:210`) e `buildInstallmentOptions` corta a oferta na
primeira parcela abaixo do piso (`packages/core/src/finance/calc.ts:154`). A decisão do dono ratifica
o que está no ar e não gera tarefa.

O **pedido** mínimo não existe em lugar nenhum. A validação de preço de lote hoje aceita qualquer
valor não negativo (`lote.preco >= 0`, RN-301, `packages/core/src/eventos/lote.ts:141` e `:362`), e
não há teto inferior no total do pedido. Aqui há uma pergunta de desenho que a frase não decide, e
que a spec precisa responder antes do build: o piso vale sobre o **total do pedido** ou sobre o
**preço unitário**? A leitura literal é o pedido, e ela tem uma consequência que vale escrever: com
o piso no total, um lote de R$ 6,00 continua existindo e passa a só poder ser comprado aos pares.
Com o piso no unitário, o lote de R$ 6,00 não pode ser criado. As duas são defensáveis e custam
telas diferentes.

**Onde aterrissa.** RN-494 em [[LEELA-E09-financeiro-profissional]], que muda de enunciado: o item
deixa de ser sobre limitar o Serviço e passa a ser sobre o piso da venda. Território de código na
criação de lote e modalidade e na cotação do checkout
(`functions/src/checkout/cotarInscricaoCheckout.ts` e `createInscricaoCharge.ts`). Dinheiro, então
review antagonista.

---

## 2 · SERV-1 · o piso de R$ 3,00 ratificado

> "serv1 - nao se preoupe, já sei. pode cobrar no minimo 3 de taxa."

**Leitura do maestro.** O "já sei" responde a parte do item que era aviso, não pergunta. O painel
mostrou que o piso vale em toda compra de até R$ 28,52 e que numa aula de R$ 10,00 ele é 30% da
face; o dono diz que a conta não o surpreende. O número fica.

**O que fecha.** R$ 3,00 como piso do Serviço, que era o default proposto. As duas alternativas
saem: nem valor menor, nem piso por modo de taxa.

**O que abre.** Nada de novo, e o item passa a ler-se junto do anterior. Com o pedido mínimo em
R$ 10,00, a pior proporção deixa de ser hipotética e vira a fronteira exata do produto: **na venda
mais barata que a plataforma permite, o Serviço é 30% da face**, e no modo padrão quem absorve é o
organizador, que recebe R$ 7,00. Isso não é objeção, é a régua ficando legível. O mecanismo do piso
continua nascendo com a tabela vazia, então nada muda em produção enquanto ninguém digitar o valor
na tela.

**Onde aterrissa.** RN-491 em [[LEELA-E04-config-vendas]]. A tabela de efeito em
`02-rodadas/2026-08-05-metricas-e-servico/02-spec-metricas-e-servico.md` §"O piso, em números" passa
a ter o corte em R$ 10,00 como primeira linha, e as linhas abaixo disso viram histórico.

---

## 3 · SERV-3 · o alcance da palavra "Serviço"

> "serviço é a taxa de serviço que cobramos."

**Leitura do maestro.** A frase confirma a leitura literal e define o referente: "Serviço" nomeia a
taxa que a plataforma cobra, e não outra coisa da mesma tela. O dono não respondeu por escrito a
segunda metade, se o super-admin acompanha, e a frase inclina para o sim, porque ele descreve a
cobrança do ponto de vista de quem cobra, que é o público do super-admin. A esteira segue o
**default proposto**: "Serviço" para comprador e organizador, "Serviço da plataforma" no super-admin,
onde a palavra ainda precisa separar esta cobrança das outras que a mesma tela mostra. Se ele quiser
"Serviço" em tudo, é uma string.

**O que fecha.** O renome sai da retenção. São 34 strings em três aplicações, e a fila que esperava
esta resposta pode andar.

**O que abre.** A troca em si, que é mecânica, e o cuidado de não trocar duas vezes: o checkout já
diz "Taxa de serviço" ao comprador hoje, então a tarefa dele é encurtar o rótulo, não criar um.

**Onde aterrissa.** RN-495 em [[LEELA-E12-landing]]; tarefas 4a, 4b e 4c de
`02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`.

---

## 4 · JUROS-3 e JUROS-4 · até 3x sem juros, com o custo na plataforma

> "nós pagamos o juros, abate do que iria para nós. Mas nao trabalhraremos com isso agora. Podemos
> deixar até 3x sem juros, e nós cuidamos do custo daoperação, e nao cobramos a mais do pessoal."

**Leitura do maestro.** A resposta tem duas camadas, e separá-las é o que evita ler adiamento onde há
decisão.

A camada que **fecha** é o **JUROS-3**: quando o juro é zero, quem paga é a plataforma, abatido do
que iria para ela. É o default proposto, e ele chega com a razão do dono escrita na própria frase.
A simetria da RN-437 fica de pé, a RN-182 não muda, e nenhum campo novo nasce no pagamento.

A camada que **adia** é o esquema maior do parcelamento configurável por tenant, a ferramenta de
admin que o item descrevia. "Não trabalharemos com isso agora" tira essa construção da mesa.

A camada que **decide sem parecer** é o "até 3x sem juros". Isso não é adiamento, é o modelo
comercial em vigor a partir de hoje, e ele contradiz o que está no ar.

**O que fecha.** Até 3x sem juros para o comprador. O custo da operação é da plataforma. O comprador
nunca paga a mais por parcelar dentro dessa faixa.

**O que abre, e é mais do que conferência.** A medição feita nesta lane, contra o código:

O checkout de hoje **cobra juros em 2x e 3x**. A tabela Price roda com `jurosAoMes: 2.89`
(`commercialTerms.ts:209`) e `buildInstallmentOptions` a aplica de `n = 2` em diante. Numa compra de
R$ 300,00 em 3x, a compradora paga hoje **R$ 105,83 por parcela, R$ 317,49 no total** — R$ 17,49 a
mais que à vista. Sob a decisão de hoje, ela deveria pagar R$ 100,00 por parcela e R$ 300,00 no
total. A divergência é dinheiro cobrado de gente real e não é conferência: é conserto.

**O modelo decidido não é representável na estrutura atual.** `InstallmentRules` tem três campos
(`maxParcelas`, `jurosAoMes`, `parcelaMinima`) e uma taxa **única** para todas as parcelas
(`commercialTerms.ts:36-43`). Não existe "as três primeiras sem juros, o resto com". Só duas
configurações são escrevíveis hoje: `maxParcelas: 3` com `jurosAoMes: 0`, que zera o juro e **tira do
ar o parcelamento de 4x a 12x**; ou `jurosAoMes: 0` com `maxParcelas: 12`, que dá doze vezes sem
juros à custa da plataforma. Nenhuma das duas é obviamente o que ele quis.

**Pergunta de spec, e ela é de dinheiro.** O que acontece de 4x a 12x? Três leituras cabem na frase:
a oferta acima de 3x **sai do ar** até o esquema maior existir; ela **continua como está**, a
2,89% a.m., e o "até 3x sem juros" é um andar novo por cima; ou o campo ganha uma quarta chave
(`parcelasSemJuros`) e as duas coisas convivem, que é a única saída que atende a leitura mais natural
e custa migração no termo. Não escolho isto. Vai ao dono com os três números na mão.

**O que a conferência das Ações devolveu.** O **JUROS-1** pedia que ele abrisse os termos comerciais
e salvasse sem mudar nada, para selar o rastro da v1. Essa instrução envelheceu no ato: salvar sem
mudar nada agora carimbaria uma v2 dizendo 2,89% em toda parcela, que é justamente o que a decisão de
hoje derruba. O JUROS-1 passa a depender da resposta acima e não deve ser executado antes dela. O
**JUROS-5**, a tabela de tarifas do Asaas, continua exatamente como estava e fica mais necessário,
não menos: se a plataforma absorve o custo de parcelar, ela precisa saber quanto esse custo é.

**Onde aterrissa.** RN-458 em [[LEELA-E16-plataforma-superadmin]] para a autoria do custo; RN-436 em
[[LEELA-E04-config-vendas]] e `commercialTerms/current.installmentRules` para a faixa sem juros;
`02-rodadas/2026-08-04-juros-margem/01-spec-economia-parcelamento.md` §5.3. O card "Preço do SaaS e
acréscimo por parcela" do backlog fecha pela metade: o markup linear de 2,5% por parcela está
descartado para 1x a 3x, e continua sem resposta acima disso.

---

## 5 · ESTOURO-1 · pagamento pendente segura a vaga

> "estouro 1. Se um pedido eesta com pagamento pednente, a vaga nao está disponivel para compra."

**Leitura do maestro.** É a reserva, e é a opção que o painel propôs como default. A frase escolhe o
lado difícil de propósito: a vaga sai do estoque quando a cobrança nasce, não quando ela paga. Duas
pessoas deixam de conseguir comprar a mesma última vaga, que era o efeito a impedir.

**O que fecha.** A vaga passa a ser reservada durante o pagamento pendente. As outras duas opções
saem: nem aceitar o estouro e apenas avisar, nem bloquear a confirmação e estornar.

**O que abre.** A frente inteira de reserva, e ela tem uma dependência medida que o painel já havia
declarado e que esta lane confirmou no código.

A janela de 15 minutos que existe é a do **carrinho**, e ela termina quando a cobrança nasce.
`expirarCarrinhosAbandonados` roda sozinho de 5 em 5 minutos
(`functions/src/checkout/expirarCarrinhosAbandonados.ts:147`). A reserva que a decisão pede vive
**depois** disso, da cobrança até o PIX pagar ou vencer, e o vencimento do PIX **não tem varredura**:
`expirarPixPendente` é `https.onCall` (`functions/src/checkout/expirarPixPendente.ts:263`), só
acontece quando alguém chama. Sem transformá-la em varredura agendada, um PIX abandonado segura a
vaga para sempre, e a reserva vira um jeito novo de perder venda.

Então a frente tem duas peças que sobem juntas, ou nenhuma: a reserva na cotação e na criação da
cobrança, e a expiração automática do PIX pendente. Subir a primeira sem a segunda é pior do que o
estado de hoje.

A **correção mínima** que o painel dizia entrar de qualquer jeito continua entrando: o estouro deixa
de ser silencioso, com registro no servidor e aviso na tela do organizador. Ela não depende da
reserva e não espera por ela.

**Onde aterrissa.** RN-498 em [[LEELA-E04-config-vendas]], que passa a declarar a reserva e não o
aviso; delta na RN-158 em [[LEELA-E12-landing]], porque a regra que dizia que carrinho aberto não
segura estoque ganha a exceção da cobrança emitida. Tarefas 2a e 2b de
`02-rodadas/2026-08-05-lotes-ux/03-fila-codigo.md`; achado em `.nirvana/handoffs/leela-lotes-REV.md`
§"Correção exata do #4". Estoque e dinheiro: spec antes de build, rota opus, review antagonista.

---

## 6 · SEMKIT-1 e SEMKIT-2 · a autorização sai, e a regra fica sem exceção

> "semkit1 - só ajuste ja que os testes ainda nao sao reais, e sao testes. sem clientes de verdade.
> nao existem descontos quando nao tem kit, e ponto final. o organizador decide o que está
> disponivel ou nao. podeme xistir eventos sem kits."

**Leitura do maestro.** A autorização vem, e vem com a razão certa. O que segurava o reparo era a
RN-200, que congela preço de kit depois da primeira venda, e a razão de a RN-200 existir é proteger
preço real de comprador real. A apuração já havia provado que ninguém comprou nenhum dos dois kits.
O dono lê a mesma coisa e conclui o mesmo: **não existe preço congelado a proteger**, então a exceção
não é exceção, é a regra aplicada a um caso que ela nunca quis cobrir.

O restante da frase não é sobre o reparo. São três regras permanentes, e a terceira e a quarta
respondem o **SEMKIT-2** por inteiro.

**O que fecha.**

O **SEMKIT-1**: reparo autorizado nos dois documentos de produção, com o default da rodada do corte,
que é **zerar o preço dos dois**. O "só ajuste" é a autorização, e a escolha de qual reparo já havia
saído do painel em 09/08.

O **SEMKIT-2**: *"o organizador decide o que está disponivel ou nao"* e *"podem existir eventos sem
kits"* são o default proposto do item, palavra por palavra. A plataforma **não garante** a saída sem
kit; quem quiser abri-la cria um kit de R$ 0,00. As outras duas opções saem. Registro esta inclusão
como leitura minha: o dono não citou o código SEMKIT-2, e a linha entra na conta dos fechados porque
a frase dele não deixa margem, não porque ele a endereçou.

A regra que vale para sempre: **desconto por dispensar o kit não existe**. Preço de kit é zero ou
positivo, nunca negativo.

**O que abre.** O reparo, com uma ordem que não pode ser invertida: **a fonte antes do banco**. O
seed de produção já rodou duas vezes, e corrigir só o banco deixa uma terceira execução ressuscitar
os dois kits. A tarefa da fonte subia de qualquer forma; agora as duas andam juntas.

**Onde aterrissa.** RN-509 em [[LEELA-E03-operacao-evento]] para o reparo; RN-508 no mesmo épico para
a escolha do organizador, que passa de default proposto a regra. Tarefas 2a e 2b de
`02-rodadas/2026-08-05-sem-kit/04-fila-codigo.md`. Escreve em campo de preço de produção, como
exceção declarada à RN-200: review antagonista.

---

## 7 · item 12 · o domínio

> "DOminio depois te passo."

**Leitura do maestro.** Adiamento explícito, sem condição e sem prazo. Não há o que interpretar.

**O que fecha.** Nada.

**O que abre.** Nada de novo, e o que já estava aberto continua. Todo endereço do produto segue como
`{DOMINIO_LEELA}`, o e-mail transacional segue saindo por `vitoreldp@gmail.com` com o risco de spam
que o DMARC do Gmail cria, e o item 66 segue dependendo desta resposta para ter um endereço
definitivo a apontar. O item **permanece no painel** e é dele.

**Onde aterrissa.** Sem mudança: env dos dois apps, substituição do marcador nas specs, verificação
DKIM, SPF e DMARC na Brevo.

---

## 8 · PB-11 · a prova de aceite fica como está

> "PB-11 nao precisa se preocupar, nao quero arquivar esse tipo de informação ainda."

**Leitura do maestro.** O dono escolhe a opção em vigor: no retry, o carimbo usa a versão vigente da
política, e a compra segue viva. A frase vai um passo além de escolher entre as duas opções que o
item ofereceu, e é por isso que ela fecha e não só ratifica: ele diz que **não quer arquivar** esse
tipo de informação por ora, o que remove também a terceira saída silenciosa, a de guardar a versão
exibida em algum lugar para reconciliar depois.

**O que fecha.** Comportamento atual mantido. Prova de aceite carimba a vigente, e o pedido pago
nunca fica sem prova.

**O que abre.** Nada de código. Fica escrita a condição de reabertura: **o dia em que ele quiser
arquivar a versão exibida no retry**, por exigência jurídica ou por pedido de um organizador. O caso
de teste já está escrito no ponto exato onde a decisão vira código, então reabrir é barato.

**Onde aterrissa.** `aceitesVersaoExibida.integration` e o caminho de replay de
`createInscricaoCharge`, sem alteração.

---

## 9 · ARENA-1 · o perfil da Arena será visto por outras pessoas

> "AERNA 1  Outras pessoas verão futuramente no app,"

**Leitura do maestro.** A resposta é de direção, não de prazo. O perfil da Arena Social nasce para
ser social, e o "futuramente no app" diz que a abertura vem, não que ela vem agora. O default
proposto (só a própria pessoa vê, e a abertura chega junto da feature de conexão) continua sendo o
que se constrói primeiro, e passa a ser um estágio declarado em vez de uma escolha.

O que muda de verdade é o que a pessoa precisa ler **antes de preencher**. Se a visibilidade futura
está decidida, a tela não pode sugerir que o dado é só dela: a promessa feita no momento do
preenchimento tem de cobrir o destino, e não o estágio.

**O que fecha.** Visibilidade social futura para outros participantes. A terceira opção, a de o
organizador também ver, **não** foi respondida e não entra por tabela.

**O que abre, e é a parte que precisa ficar em pé.** A frente jurídica do campo sensível
**continua no LGPD-1**, e a decisão de hoje a torna mais necessária, não menos. Dois motivos, e os
dois são de titular:

Os gêneros de interesse em pessoas são dado sensível pelo art. 11 da LGPD. A RN-472 já os mantém
fora da visibilidade por default, e isso **não** muda com esta decisão. O que muda é que agora existe
um plano declarado de expor perfil de participante a outros participantes, e um campo do art. 11
dentro do mesmo formulário: a régua que separa os dois deixa de ser precaução e passa a ser a linha
que o produto tem de provar que respeita.

O consentimento precisa ser colhido no tempo certo. Quem preenche hoje sob "só você vê" não
consentiu com "outras pessoas verão no app". Abrir depois, sobre dado já preenchido, é a mudança de
finalidade que o advogado do LGPD-1 tem de olhar antes de a Arena receber o primeiro dado real, e
não depois.

Isso conversa com a decisão do radar de WhatsApp de hoje cedo, que expôs nome real de participante ao
organizador pela mesma razão de produto. As duas juntas somam a terceira frente do LGPD-1: **dado
pessoal de participante deixando de ser privado por desenho, em duas superfícies**.

**Onde aterrissa.** RN-471 e RN-472 em [[LEELA-E12-landing]]; S1226 em
`02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`. A frente jurídica fica no **LGPD-1**, que
segue no painel e é do dono.

---

## 10 · ARENA-2 · a lista dos pilares sai da taxonomia que já existe

> "arena2- Nao temos essa listgem? de acordo com o spilares e modaldiades disponiveis? podemos usar
> de base."

**Leitura do maestro.** A pergunta dele tem resposta, e ela é não. A listagem formal de pilares de
bem-estar não existe em documento nenhum do repositório, e foi por isso que o item nasceu. O que
existe é a lista de modalidades do clube (corrida, trail, yoga e assim por diante), que é a
taxonomia que ele reconhece.

A instrução é o "podemos usar de base". Ele não crava a lista nem pede a proposta da esteira do
zero: manda **derivar** da taxonomia existente. Isso é mais barato e mais seguro que a lista
ilustrativa que o painel propunha, porque nasce colada ao vocabulário que os eventos já usam em vez
de inventar categorias que nada preenche.

**O que fecha.** O método. A lista de interesses da Arena sai das modalidades e dos pilares
disponíveis nos eventos, e não de uma proposta editorial.

**O que abre.** Trabalho de spec, e ele tem uma decisão embutida que a derivação vai encontrar: as
modalidades são **granulares** (corrida, trail, yoga) e pilares são **categorias** (movimento,
mente). Derivar uma da outra é agrupar, e o agrupamento é escolha de vocabulário. A spec propõe o
agrupamento a partir do que os eventos vivos usam hoje, com o número de eventos por termo ao lado,
e o dono corta e acrescenta. Uma lista só, porque a mesma serve os interesses da Arena e a
categorização da home que ele avisou que vai mexer (D-0802-1), e duas listas divergindo é o custo
que este item existe para evitar.

**Onde aterrissa.** RN-471 em [[LEELA-E12-landing]]; spec §Parte 3 em
`02-rodadas/2026-08-04-pos-pagamento/02-spec-pos-pagamento-e-arena-social.md`.

---

## 11 · CRM-1, CRM-2, CRM-3 e CRM-4 · adiados em bloco

> "CRM - DEPOIS TE FALO."

**Leitura do maestro.** Adiamento dos quatro de uma vez, sem separar. Nenhum dos quatro tem default
em vigor que possa ser confundido com resposta, então nada anda.

**O que fecha.** Nada.

**O que abre.** Nada de novo. Vale registrar o que continua acontecendo enquanto os quatro esperam,
porque um deles tem custo que corre:

O **CRM-3** não escolhe entre dois futuros, ele conserta um buraco. O checkout pede e-mail de cada
atleta, obrigatório, a pessoa digita, o servidor valida, e a gravação descarta. **Cada dia de espera
é um dia de e-mails coletados e jogados fora**, e cada participante que não comprou continua virando
cliente novo a cada evento, porque a chave de unificação cai no último recurso sem e-mail. É o único
dos quatro cujo custo de espera não é zero.

Os outros três esperam sem custo. O **CRM-1** é veto de escopo e nada nasce até ele escolher; o
**CRM-2** tem a premissa P-CKMOD-1 segurando o endereço fora da ficha, e a premissa continua valendo;
o **CRM-4** desenha degraus que ainda não existem.

Os quatro **permanecem no painel**.

**Onde aterrissa.** Sem mudança: `02-rodadas/2026-08-05-crm-estrategia/`, spec §Partes 2, 3 e 7,
fila em `03-fila-proposta.md`.

---

## 12 · CLUBES-1 · a aba ganha o CTA

> "mEUS CLUBES - deixa cta para se isncrever em um."

**Leitura do maestro.** O dono escolhe a primeira opção com um acréscimo. O default proposto era
manter o estado vazio honesto e abrir a entrada no clube numa rodada própria; ele mantém isso e pede
que a tela **aponte um caminho** em vez de apenas informar que está vazia. A opção de construir a
entrada agora sai, e a de esconder a aba sai também.

Há uma pergunta que a frase resolve pela metade, e é a que decide o tamanho da tarefa: **para onde o
CTA leva?** Hoje não existe caminho pelo qual um participante entre num clube. A varredura já provou
que os três escritores de membros são a soma automática, as ações do painel do organizador e o seed,
e que o código de convite de clube não é consumido em lugar nenhum. Um botão "inscrever-se num
clube" que não tem destino é exatamente o que a tela foi escrita para não fazer.

Duas leituras cabem, e as duas são baratas. O CTA leva à **descoberta**: uma lista dos clubes que
existem, com a página pública de cada um, onde a pessoa pede entrada pelo canal do organizador. Ou o
CTA leva à **espera declarada**: uma frase que diz como se entra hoje, que é por convite do
organizador, com o campo de resgate ao lado se o código de convite for destravado. A esteira propõe
a primeira e o dono veta na tela.

**O que fecha.** A aba Meus Clubes ganha CTA para se inscrever num clube. A entrada no clube continua
sendo épico próprio (E05) e não entra nesta rodada.

**O que abre.** Build na área do cliente, pequeno, sobre tela que **já está no ar** desde 05/08.
Junto, a pergunta de destino acima, que a spec do card responde antes de o botão nascer.

**Onde aterrissa.** `functions/src/cliente/meusClubes.ts` e `PainelClubes.tsx`; RN-101 e RN-451 em
[[LEELA-E05-clubs]] e [[LEELA-E12-landing]].

---

## 13 · ADMIN-USUARIOS-1 · o cadastro aparece no painel master, e o dono libera

> "admin usuários, esse cadastro deve aparecer no painel master. que lá eu aprovarei, passando um
> código. Ou liberando diretamente o acesso. O modal de liberar acesso deve aparecer depois que a
> pessoa já entra no sistema e tenta fazer alguma ação."

**Leitura do maestro.** A frase desenha um fluxo inteiro, e ele é o par administrativo de uma coisa
que já existe do lado da pessoa. Três peças:

O **diretório**. Quem se cadastra passa a aparecer no painel da plataforma. Isso responde a pergunta
que abriu o item: hoje as duas pessoas que se cadastraram em 06/08 são invisíveis, e o único caminho
é o Console do Firebase, que é ferramenta de engenharia.

A **aprovação, com duas portas**. O dono aprova passando um código, que é o caminho que existe hoje
(`/plataforma/convites` emite, RN-414 resgata), **ou** liberando o acesso diretamente. A segunda
porta é nova: hoje não há como conceder acesso sem que a pessoa digite um código.

O **gatilho do modal**. "Depois que a pessoa já entra no sistema e tenta fazer alguma ação."

**O que fecha.** A forma. Diretório no painel master, aprovação por código ou por liberação direta,
modal disparado por ação da pessoa.

**O que abre, e uma parte vai a spec como pergunta, não como resposta.**

**A tensão com a RN-510, e ela é de leitura.** A RN-510 já faz quase isto, e a diferença é sutil o
bastante para virar defeito se ninguém escrever. A regra em vigor diz que a conta sem código entra em
vitrine e que o aviso sobe na **primeira interação**, contando como interação qualquer gesto sobre
algo acionável, botão, link, item de menu, campo (P11), inclusive por teclado (P12); fechado, ele
**rearma** e volta na interação seguinte (P14). A frase do dono diz "tenta fazer alguma ação". Isso
pode ser a mesma coisa, e nesse caso ele está ratificando a RN-510 sem saber o nome dela. Ou pode ser
**uma ação bloqueada**, e aí navegar pelo menu deixaria de disparar o aviso, o que muda P11 e P14 e
derruba parte do que a REV-VITRINE mediu em 08/08. **Não resolvo isto aqui.** Vai como pergunta de
spec, com as duas leituras escritas e o custo de cada uma.

**A segunda tensão, que é de mecanismo.** A liberação direta é um caminho que a RN-510 não prevê. O
aviso de hoje orienta a pessoa a falar com o time para receber o "código Leela" e mantém o campo de
resgate ali (RN-414). Se o dono pode liberar sem código, a pessoa sai da vitrine **sem nunca digitar
nada**, e a spec precisa dizer três coisas que ninguém escreveu: o que tira a conta da vitrine
quando não houve resgate, o que o aviso passa a dizer para quem está esperando liberação em vez de
código, e como a tela em vitrine descobre que foi liberada sem a pessoa recarregar.

**A terceira, que é de alcance, e o item já a fazia.** O painel perguntava se o diretório mostra só
contas aguardando convite ou todas as contas com papel e origem. O dono disse "esse cadastro", que
cobre com certeza quem está esperando. O alcance completo continua sem resposta e volta na spec. É
PII, então a spec herda o cuidado do P-IAMENU-1.

**Onde aterrissa.** Spec nova sob [[LEELA-E16-plataforma-superadmin]], tela em `/plataforma`; delta
na RN-510 no mesmo épico, se a resposta das perguntas acima mexer no gatilho; a emissão do convite já
existe em `/plataforma/convites`. Spec antes de build.

---

## 14 · ADMINSEP-3 · o super-admin é o `inguzbuilders`, e a demo não é

> "super admin nao deve ser o demo, ja temos o inguzbuilders como e-mail."

**Leitura do maestro.** Ratificação do que já foi executado, mais uma ordem sobre o que sobrou.

A metade **feita**: a conta de administração da plataforma deixou de ser `admin@demo-leela.dev` em
06/08. O mesmo uid (`FTqslV98itZUNGwL5ss6201d23Z2`) passou a ter o e-mail
`inguzbuilders@gmail.com`, a claim `platform_admin` ficou intacta, e a senha foi definida por ordem
verbatim do dono às 15h35 e **provada** por `signInWithPassword`, com o registro feito no mesmo ato
em `.nirvana/handoffs/leela-credenciais-20260806.md`. O risco que abriu o item, a senha de vitrine
publicada no repositório valendo para a conta que enxerga CPF e dado bancário de todo mundo, está
pago.

A metade que **sobra**: as contas de demonstração de organizador.

**O que fecha.** A identidade do super-admin. `inguzbuilders@gmail.com`, e a conta demo não ocupa
esse papel.

**O que abre, e é execução administrativa com um fato que precisa ser dito.** Confirmei no registro
da limpeza de 06/08: **o expurgo não tocou em conta de Auth nenhuma**. Está escrito com essas
palavras em `.nirvana/handoffs/leela-apply-limpeza-20260806.md` §"O que NÃO foi feito, de propósito".
As 2.873 operações foram todas em Firestore.

Então:

`marina@demo-leela.dev` e `felipe@demo-leela.dev` **estão vivas em produção**, com senha válida, e a
senha usada no preview está em texto claro no repositório (`preview-autologin.ts:35`). Elas estavam
na fila de exclusão desde 06/08 e a fila não rodou. Enquanto existirem, a janela existe.

`admin@demo-leela.dev` **não existe mais como endereço**, porque foi renomeada e não apagada. O uid é
o mesmo de sempre e hoje é o do dono. Não há conta a matar aqui, e tentar apagar `admin@demo-leela.dev`
seria apagar o super-admin.

A tarefa que resta é uma só, e é pequena: revogar `marina@` e `felipe@`, com `revokeRefreshTokens`
antes da remoção, e conferir se algum documento de Firestore ainda aponta para os uids delas antes de
puxar o gatilho. A REV3 registrou que `ownerUid` já apontou para `uid-marina-castelo`, então esta
conferência não é formalidade.

**Onde aterrissa.** Task A6 de `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`, que
fica com uma metade só; `platformAdmin.seed.ts:65`, para o seed parar de semear administrador contra
o projeto real. O reenvio dos dois e-mails represados (o ingresso `T93N7F` e o da conta) deixou de
estar bloqueado desde 06/08, quando a senha foi definida.

---

## 15 · item 69 · outras bibliotecas de ícones

> "69 - pode buscar ourtas bibliotecas para utilizarmos os icones."

**Leitura do maestro.** O item 69 é a conferência visual de sete coisas no ar, e três delas são os
ícones de WhatsApp, TikTok e Strava desenhados em casa porque não existem no lucide. A frase autoriza
resolver a causa em vez de conferir o sintoma.

Não é veto dos ícones atuais. É permissão para trocar a fonte deles, e a diferença importa: o resto
do item 69, o menu da página do produtor, o respiro do rótulo, o toque no cartão de modalidade e kit
e os três consertos do checkout, continua sendo conferência do olho dele e não sai daqui.

**O que fecha.** Autorização para buscar biblioteca de ícones além do lucide.

**O que abre.** Pesquisa curta, e ela termina em proposta, não em adoção. Quatro critérios, e o
último é o que decide:

Licença compatível com uso comercial, incluindo as marcas de terceiros, que é onde bibliotecas de
logos costumam ter cláusula própria. Tree-shaking de verdade, porque o pacote entra no bundle das
duas aplicações. Cobertura das três marcas que faltam, mais folga para as próximas. E **coerência com
o traço do lucide**, que é o critério que mata a maioria: espessura de linha, grade e cantos. Ícone
de logo é raster de marca e tem regra própria, então a saída provável é conviver, lucide para o
sistema e uma segunda fonte só para logos, em vez de trocar tudo.

A proposta vai ao dono antes de qualquer adoção. Ícone é marca, e marca não muda por decisão de
esteira.

**Onde aterrissa.** [[LEELA-E01-design-system]]; os três ícones desenhados em casa saem do item 69 e
passam a depender desta pesquisa. O restante do item 69 continua no painel, esperando o passeio dele.

---

## O que esta rodada deixa para a próxima lane do painel

A retirada dos quinze itens de [[DECISOES-ABERTAS]] **não** foi feita aqui, por coordenação de
árvore: a lane REV-CORTE estava viva no mesmo arquivo. A passada de painel entra depois dela e tem
esta página como fonte.

Três coisas precisam sobreviver à retirada, e é por isso que ficam escritas aqui:

O **item 12** e os **quatro CRM** continuam no painel, e nenhum deles ganhou default por adiamento.

O **LGPD-1** ganha a terceira frente, vinda do ARENA-1, ao lado da que o radar de WhatsApp criou hoje
cedo. As duas são a mesma família: dado pessoal de participante deixando de ser privado por desenho.

O **JUROS-1** deixou de ser executável como está escrito. Ele pede um save que selaria a v2 com
2,89% em toda parcela, e a decisão de hoje derruba isso para 1x a 3x. Enquanto a pergunta do bloco 4
não voltar respondida, executá-lo carimba o rastro errado.
