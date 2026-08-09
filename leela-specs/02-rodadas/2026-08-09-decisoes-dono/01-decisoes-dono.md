---
tags: [leela, decisoes, rodada, dono, servico, juros, estouro, semkit, arena, crm, clubes, admin]
trace: leela-dec-0809
lote: DEC-0809-REGISTRO
data: 2026-08-09
---

# 01-decisões do dono · as duas levas de 09/08

> **O que esta página é.** O dono respondeu o painel em **duas mensagens** no mesmo dia, 09/08, pelo
> chat, mais dois esclarecimentos por pergunta direta. Aqui está cada frente registrada: o trecho
> verbatim que a decide, a leitura que o maestro faz dela, o que ela fecha, o que ela abre e onde
> aterrissa. O **lote 1** são os blocos 1 a 15; o **lote 2** são os blocos 16 a 21, e ele corrige
> duas coisas escritas no primeiro. O trabalho que sai daqui está em [[02-fila-execucao]].
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

Vinte e um blocos nas duas levas, cobrindo **vinte e quatro** linhas do painel. Dezenove fecham,
cinco continuam dele.

| | Linhas do painel |
|---|---|
| Fecham no lote 1 | 15 · SERV-1, SERV-2, SERV-3, JUROS-3, JUROS-4, ESTOURO-1, SEMKIT-1, SEMKIT-2, PB-11, ARENA-1, ARENA-2, CLUBES-1, ADMIN-USUARIOS-1, ADMINSEP-3, 69 |
| Fecham no lote 2 | 4 · VITRINE-2, JUROS-1, JUROS-5, COMPROMETIDO-1 |
| Seguem com o dono | 5 · item 12, CRM-1, CRM-2, CRM-3, CRM-4 |
| Decisão nova, fora do painel | 1 · PATROCINADOR-TOGGLE (bloco 20) |

O lote 2 **corrige** dois blocos do lote 1: o SEMKIT-2 ganha mecanismo (bloco 19 emenda o bloco 6) e
o JUROS-5 destrava o parcelamento que o bloco 4 tinha deixado retido.

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

### ⛔ Correção de 09/08, lote 2 · o reparo em produção pode não ter mais objeto

Apurado ao escrever a purga do bloco 21, e ele muda a parte cara deste item.

Os dois kits negativos vivem em `meia-floripa-2026` e em `sao-silvestre-floripa-2025`, os dois do
tenant `castelo-producoes` (`preview-seed-extra.ts:101` e `:191`). **O expurgo de 06/08 apagou os
dois eventos.** O registro daquela corrida diz, com todas as letras, que `meia-floripa-2026` é um dos
"dois eventos que esta corrida apagou", e a conferência aritmética do saldo nomeia os **dois únicos
sobreviventes** do tenant: `teste-taxa-repassada` e `corrida-inverno-floripa-2026`
(`.nirvana/handoffs/leela-apply-limpeza-20260806.md:223` e `:230`).

Ou seja: o texto do painel, que fala de 462 e 40 inscritos e de preço congelado pela RN-200, descreve
um estado que deixou de existir três dias antes de o dono autorizar o reparo.

**O que isso muda.** A tarefa mais perigosa da cadeia, a `S318-T6`, que escreveria em campo de preço
de produção como exceção declarada à RN-200 e por isso pedia rota opus e review dupla, **provavelmente
não tem objeto**. E a tarefa que parecia acessória vira a única que importa: o seed continua com
`preco: -15` e `preco: -10` no código, e o runner de produção já rodou duas vezes. Enquanto a fonte não
for corrigida, qualquer nova execução **ressuscita os dois kits** em eventos novos.

**O que não faço aqui.** Não declaro o item morto. Esta é inferência a partir do relatório de 06/08 e
não leitura direta da produção, e leitura de produção não é território desta lane. A conclusão vira
gate na fila: **medir antes de despachar a 2b**, e fechá-la como "sem objeto" se a medição confirmar.
A autorização do dono continua registrada e válida para o caso de a medição contrariar a inferência.

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

---

# Lote 2 · a segunda leva do mesmo dia

> O dono respondeu uma segunda mensagem em 09/08, e o maestro esclareceu duas ambiguidades por
> pergunta direta. Mesmo padrão dos quinze blocos acima. Duas coisas mudam o que ficou escrito no
> lote 1, e as duas estão marcadas: o **JUROS-5** entregou o número que destrava o JUROS-ALINHAMENTO,
> e o **SEMKIT-2** ganha mecanismo onde antes tinha só direção.

## O verbatim do lote 2, sem retoque

> "vitrine  - eventos sem preço, pode apagar os dois. juros 1 - ok. Juros 5- o custo do parcelamento
> do asaas é de 1,89% a.m. voce pode calcular isso para mim, para termos a tabela. UM ponto
> importante, esses juros afetam o preço cheio. se eu mandar 300 reais parcelado em 6x, os juros vao
> incidir porparcela, com calculo de custo para cada uma, entao a parcela de 6x tem um custo 2x é
> outro, entendeu? Posição 1 - ok. Podemos deixar botao de liga e desliga,avisando. O comprometido
> pode sair fora, já uq é apenas um teste. cancela e apaga tudo, pois quero trabalhar com dados
> reais."

## Os dois esclarecimentos, também verbatim

Perguntados diretamente pelo maestro, porque duas referências eram ambíguas:

> **Sobre "Posição 1":** "letra A, que voce me sugeriu e também para excluir algum patrocinador, que
> na verdade será liga e desliga"

> **Sobre o alcance de "cancela e apaga tudo":** "Todo dado de teste restante"

---

## 16 · VITRINE-2 · os dois eventos sem preço são apagados

> "vitrine  - eventos sem preço, pode apagar os dois."

**Leitura do maestro.** A segunda das três opções, e a mais radical delas: não é despublicar até ter
preço, é apagar. Faz sentido junto da última frase da mensagem, e as duas são a mesma decisão vista
de dois ângulos: ele quer o banco limpo para trabalhar com dado real.

**O que fecha.** `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` saem. As opções de
cadastrar preço e de deixar como está caem.

**O que abre.** Nada por si. O VITRINE-2 deixa de ser tarefa própria e vira **subconjunto da
PURGA-DADOS-TESTE** do bloco 21, porque apagar evento não é deletar um documento: os dois têm 60 e 28
inscritos contabilizados, e o expurgo de 06/08 provou que cada delete de inscrito dispara três
agregadores que reescrevem documentos que morrem depois, deixando órfãos invisíveis. Fazer isso à mão
é o incidente daquela manhã de novo.

**Onde aterrissa.** Dado de produção, dentro do plano da purga.

---

## 17 · JUROS-1 · ratificado, com uma ordem obrigatória

> "juros 1 - ok."

**Leitura do maestro.** Ele ratifica a ação: abrir os termos comerciais do Castelo no painel e salvar,
para o histórico voltar a bater.

**O que fecha.** A ação está autorizada.

**O que abre, e é a ordem que precisa ficar escrita.** O alerta que abri no bloco 4 continua de pé, e
o "ok" não o dissolve. Salvar **hoje** sela uma v2 dizendo 2,89% a.m. em toda parcela, que é
exatamente o que a decisão de parcelamento derruba de 1x a 3x. O histórico ficaria fiel a um número
que deixou de valer no mesmo dia em que foi carimbado.

**A ordem: o alinhamento do código primeiro, o save depois.** Quando o `commercialTerms/current`
refletir o modelo decidido, o save pelo painel sela a v2 certa e o rastro volta a ser fiel de
verdade. Invertido, ele conserta o histórico com o número errado, que é pior do que o estado de hoje,
porque o de hoje pelo menos é visivelmente incompleto.

**Onde aterrissa.** `/plataforma` → Termos do tenant Castelo Produções, **depois** de JUROS-ALINHAMENTO.

---

## 18 · JUROS-5 · o dono entregou o número, e o item vira cálculo

> "Juros 5- o custo do parcelamento do asaas é de 1,89% a.m. voce pode calcular isso para mim, para
> termos a tabela. UM ponto importante, esses juros afetam o preço cheio. se eu mandar 300 reais
> parcelado em 6x, os juros vao incidir porparcela, com calculo de custo para cada uma, entao a
> parcela de 6x tem um custo 2x é outro, entendeu?"

**Leitura do maestro.** O item mudou de natureza. Ele pedia que o dono **buscasse** a tabela de
tarifas no Asaas, e era a única coisa que a construção não conseguia produzir sozinha. Ele trouxe o
insumo: **1,89% a.m.** sobre o parcelamento. O que resta é aritmética, e aritmética é da esteira.

A segunda metade da frase é o modelo, e ele é preciso. O custo não é uma taxa achatada sobre a venda:
**incide por parcela, e cresce com a espera de cada uma**. A parcela que chega no sexto mês custa
seis vezes o que custa a que chega no primeiro. E "afetam o preço cheio" fixa a base: o percentual
corre sobre o valor inteiro que está sendo financiado, não sobre uma fatia de juro.

Isso dá a fórmula: com a venda `V` em `N` parcelas iguais, o custo da parcela `k` é
`(V/N) × 1,89% × k`, e o custo total é `V × 1,89% × (N+1)/2`.

**O que fecha.** O número e o modelo. O item deixa de ser ação dele e vira entregável da esteira.

**A tabela, calculada.** Venda de R$ 300,00, juros zero ao comprador, custo da operação com a
plataforma. A receita é o Serviço a 10,5%; o custo do cartão à vista segue o benchmark de julho
(2,99% + R$ 0,49), que **continua sendo benchmark e não contrato**, e é a única linha desta tabela que
ainda não veio dele.

| Parcelas | Parcela | Custo do parcelamento | % da face | Receita (Serviço) | Custo do cartão | **Margem** |
|---|---|---|---|---|---|---|
| 1x | R$ 300,00 | R$ 5,67 | 1,890% | R$ 31,50 | R$ 9,46 | **R$ 16,37** |
| 2x | R$ 150,00 | R$ 8,50 | 2,835% | R$ 31,50 | R$ 9,46 | **R$ 13,54** |
| 3x | R$ 100,00 | R$ 11,34 | 3,780% | R$ 31,50 | R$ 9,46 | **R$ 10,70** |
| 4x | R$ 75,00 | R$ 14,17 | 4,725% | R$ 31,50 | R$ 9,46 | R$ 7,87 |
| 5x | R$ 60,00 | R$ 17,01 | 5,670% | R$ 31,50 | R$ 9,46 | R$ 5,03 |
| 6x | R$ 50,00 | R$ 19,84 | 6,615% | R$ 31,50 | R$ 9,46 | R$ 2,20 |
| 7x | R$ 42,86 | R$ 22,68 | 7,560% | R$ 31,50 | R$ 9,46 | **−R$ 0,64** |
| 8x | R$ 37,50 | R$ 25,52 | 8,505% | R$ 31,50 | R$ 9,46 | −R$ 3,48 |
| 9x | R$ 33,33 | R$ 28,35 | 9,450% | R$ 31,50 | R$ 9,46 | −R$ 6,31 |
| 10x | R$ 30,00 | R$ 31,19 | 10,395% | R$ 31,50 | R$ 9,46 | −R$ 9,15 |
| 11x | R$ 27,27 | R$ 34,02 | 11,340% | R$ 31,50 | R$ 9,46 | −R$ 11,98 |
| 12x | R$ 25,00 | R$ 36,86 | 12,285% | R$ 31,50 | R$ 9,46 | −R$ 14,82 |

**O número que decide, e ele apareceu sozinho.** Absorvendo o custo e não cobrando do comprador, **a
plataforma passa a perder dinheiro a partir de 7x**. O ponto de virada é `N = 6,95`, e ele não depende
do tamanho da venda: sai de `10,5% − 2,99% ≥ 1,89% × (N+1)/2`, então vale para uma inscrição de
R$ 30,00 tanto quanto para uma de R$ 3.000,00. Em 12x sem juros, uma venda de R$ 300,00 **custa
R$ 14,82 à plataforma** em vez de render.

Isso valida o corte em 3x por conta própria, e é a razão de eu tratar o "até 3x" como teto e não como
exemplo. Em 3x sobram R$ 10,70, que é 3,6% da face: apertado, mas positivo, e o dobro da folga que 6x
deixaria.

**Duas ressalvas que a tabela carrega, e que a proposta ao dono declara em vez de esconder.**

A **espera da primeira parcela**. A tabela supõe que a parcela `k` chega no mês `k`, que é a liberação
padrão do cartão. Se o Asaas liberar a primeira sem espera, todo custo desce um degrau: 3x cai de
R$ 11,34 para R$ 5,67, e o ponto de virada sobe de 7x para 8x. É a única variável que muda a
conclusão, e ela se confirma numa linha do extrato dele.

**Simples contra composto.** A tabela usa juro simples sobre a espera, que é a leitura direta de
"incide por parcela". Pelo desconto composto a 1,89% a.m. os números ficam ligeiramente menores
(3x custa R$ 10,99 em vez de R$ 11,34; 12x custa R$ 33,82 em vez de R$ 36,86) e o ponto de virada não
se move. A diferença é de centavos por venda e não muda decisão nenhuma.

**Onde aterrissa.** `platform/config.custoGateway`, que passa a nascer com valor em vez de declarar
ausência; RN-455 em [[LEELA-E16-plataforma-superadmin]]; lacunas L1 e L2 da spec da rodada de juros. A
coluna Margem da tabela do admin deixa de ficar vazia. A tarefa T5 da S1610, que registraria o custo
real de cada venda a partir do que o gateway devolve, continua valendo e passa a ter contra o que
comparar.

**Uma correção que devo ao registro.** A instrução que chegou a esta lane dizia que o custo é
"absorvido pela plataforma (abate do repasse)". A frase pode ser lida como abater do **repasse do
organizador**, e isso contradiria a decisão do próprio dono. O verbatim dele é *"abate do que iria
para nós"*, e "nós" é a plataforma. O custo sai do Serviço que a plataforma retém. **O líquido do
produtor continua sendo `face − taxa(meio)` pela RN-182, intocado.** Registro a distinção porque é a
diferença entre a decisão que ele tomou e uma que ele recusou explicitamente no JUROS-3.

---

## 19 · SEMKIT-2 · a letra A ganha mecanismo, e ele é um interruptor

> "Posição 1 - ok. Podemos deixar botao de liga e desliga,avisando."
>
> Esclarecido: "letra A, que voce me sugeriu e também para excluir algum patrocinador, que na verdade
> será liga e desliga"

**Leitura do maestro.** A "letra A" é a primeira opção do SEMKIT-2, *"é escolha do organizador"*, que
era o default proposto e que o lote 1 já havia registrado como fechada. O que o lote 2 acrescenta é o
**mecanismo**, e ele corrige o que escrevi no bloco 6.

**Correção ao bloco 6.** Ali eu escrevi que quem quiser abrir a saída sem kit *"cria um kit de
R$ 0,00"*. Isso continua sendo o que o produto faz hoje, e deixa de ser o que ele vai fazer: o dono
quer um **interruptor explícito, com aviso**, em vez de o organizador descobrir sozinho que a saída se
constrói criando um kit de preço zero. A direção do bloco 6 está certa; o meio estava desatualizado
por uma frase.

**O que fecha.** A escolha é do organizador, e ela é exercida por um interruptor com aviso, não por
um kit de R$ 0,00 usado como gambiarra.

**O que abre, e aqui há uma colisão que precisa ser resolvida antes da primeira linha de código.**

**Já existe um interruptor especificado, e ele não é este.** A RN-503, escrita em 05/08, dá ao **lote**
o campo `incluiKitDaModalidade?: boolean`, com ausente equivalendo a ligado, e a RN-504 já exige que
desligá-lo avise o organizador **no gesto, com o número**, quando isso tira um kit de desconto do
cardápio. As tarefas `S317-T1` e `S317-T2` estão na fila desde então.

Os dois interruptores têm nomes parecidos e significados opostos:

O da **RN-503** desliga o kit inteiro naquele lote. Ninguém leva kit, e o comprador lê "Esta inscrição
não inclui kit." Serve o organizador que fez um lote sem brinde.

O que o **SEMKIT-2** pede mantém os kits existindo e deixa a **pessoa** escolher não levar nenhum.
Serve a Ana, que quer correr os 5k sem a camiseta.

Dois interruptores vizinhos, na mesma tela, com polaridade oposta, é a receita de um defeito que
ninguém enxerga em review. **A tarefa começa por reconciliar os dois**, e a spec do card responde uma
pergunta só: o interruptor do dono é o da RN-503, que já está na fila e ele pode ter visto, ou é um
segundo campo por modalidade, do tipo "permitir inscrição sem kit"? O contexto do SEMKIT-2 e a letra
A apontam para o segundo. Não decido isso dentro da tarefa de build.

O "avisando" tem endereço certo de qualquer forma: a RN-504 já escreveu que o aviso aparece no gesto e
com o número. Com os dois kits negativos zerados pelo SEMKIT-REPARO, o caso que aquele aviso protegia
deixa de existir em produção, mas a regra continua valendo para quem criar um kit de desconto no
futuro. Não é o mesmo aviso que o dono pediu agora, e a spec não deve confundir os dois.

**Onde aterrissa.** RN-508 em [[LEELA-E03-operacao-evento]], que ganha o mecanismo; reconciliação com
RN-503 e RN-504 em [[LEELA-E04-config-vendas]]; `S317-T1` e `S317-T2` de
`02-rodadas/2026-08-05-modalidade-e-kit/04-fila-codigo.md`, que passam a ser leitura obrigatória antes
do card nascer.

---

## 20 · PATROCINADOR-TOGGLE · apagar marca vira desativar marca

> "Posição 1 - ok. Podemos deixar botao de liga e desliga,avisando."
>
> Esclarecido: "[…] e também para excluir algum patrocinador, que na verdade será liga e desliga"

**Leitura do maestro.** Decisão nova, que não estava em item nenhum do painel, e ela responde a
**Posição 1 da fila de construção** com precisão que vale registrar: aquele item é o E10, consolidação
das ativações de marcas, e o caso de uso escrito nele é literalmente *"A Marina apaga 'Café Rota' sem
saber que era o patrocinador de um desafio"*. O item existia porque a tela omite de propósito em
quantos patrocínios cada marca é usada, e o motivo da omissão é que não há leitor barato para essa
contagem.

O dono resolve por outro caminho. Em vez de construir o contador para poder avisar antes de destruir,
**tira a destruição da mesa**: patrocinador não se apaga, desativa-se, com aviso.

**O que fecha.** A exclusão de marca é substituída por liga e desliga, com aviso.

**O que abre, e é menor do que parece, porque metade já existe.** A medição feita nesta lane:

O **campo já existe no modelo**. `StatusMarca = 'ativa' | 'inativa'`
(`packages/core/src/brands/marca.ts:31`), validado no core (`:143`, `:165`) e aceito pela Rule, que
exige "status no enum" no `shapeMarcaValida` de `firestore.rules:2980`.

O que falta é a **superfície**. O `MarcaFormModal.tsx` não expõe `status` em campo nenhum, e a
`MarcasPage.tsx` tem um botão **Excluir** destrutivo (`:188-189`) chamando
`excluirMarcaDoProfissional` (`:133`), com o `ConfirmModal` que hoje é a única proteção.

Então o build é: trocar o botão destrutivo pelo interruptor que o dado já sabe representar, esconder
a marca inativa do autocomplete de patrocínios futuros sem removê-la do registro, e escrever o aviso.

**Uma honestidade sobre o tamanho do risco que isto remove.** O cabeçalho da própria página
(`MarcasPage.tsx:11-13`) diz que excluir tira a marca do autocomplete de patrocínios **futuros**, e
que os patrocínios já cadastrados em eventos e clubes são **cópias independentes e permanecem
intactos**. Apagar "Café Rota" hoje não quebra o desafio dela. O que se perde é o registro
reutilizável, e a perda é irreversível. O interruptor é ganho de reversibilidade e de conforto, não
resgate de integridade, e vender isso como conserto de defeito seria exagero.

**O que a decisão faz com o E10-S812.** O contador de ativações continua não existindo, e o item
continua no gelo. A pergunta que a spec responde: o "avisando" é uma frase genérica, que custa nada, ou
é o número de patrocínios afetados, que exige o leitor barato que o S812 nunca teve? A esteira propõe a
frase genérica agora e o número quando o S812 sair do gelo.

**Onde aterrissa.** `apps/painel/src/routes/marcas/MarcasPage.tsx` e `MarcaFormModal.tsx`;
`packages/api-client` no lugar de `excluirMarcaDoProfissional`; RN-171 em [[LEELA-E10-marcas]], que
ganha o enunciado de que marca não se apaga.

---

## 21 · COMPROMETIDO-1 e a purga · o banco fica só com dado real

> "O comprometido pode sair fora, já uq é apenas um teste. cancela e apaga tudo, pois quero trabalhar
> com dados reais."
>
> Esclarecido, sobre o alcance: "Todo dado de teste restante"

**Leitura do maestro.** Duas frases e dois tamanhos.

A primeira fecha o **COMPROMETIDO-1**: os três repasses vetados que seguram R$ 167,00 são teste, e vão
embora. É a primeira das três opções, cancelar os três de vez, e não a intermediária de poupar o que
aponta para evento vivo. O "disponível para repasse" volta a corresponder ao dinheiro que existe.

A segunda é muito maior que o item, e o esclarecimento confirma o alcance: **todo dado de teste
restante**. Não é uma limpeza de resíduo, é a decisão de zerar o banco para o beta começar sobre dado
real.

**O que fecha.** COMPROMETIDO-1 e VITRINE-2, os dois por purga. E a purga em si, como ato autorizado.

**O que abre, e é a operação mais perigosa desta rodada.** O escopo, como o maestro delimitou: os três
repasses vetados, os eventos de teste, as inscrições de teste e as contas demo `marina@` e `felipe@`.

**O que não pode ser tocado, e cada linha aqui é um jeito de destruir algo que não volta:**

A **compra real do dono**, `PED-8CDHM`, com o ingresso `T93N7F`, e o evento a que ela pertence. É o
único pagamento real que a plataforma já processou, é a prova do fluxo ponta a ponta, e apagá-lo
apagaria o diagnóstico de 04/08 junto.

A conta **`inguzbuilders@gmail.com`**, uid `FTqslV98itZUNGwL5ss6201d23Z2`. Ela **é** a antiga
`admin@demo-leela.dev`, renomeada e não recriada, e carrega a claim `platform_admin`. Qualquer
varredura que selecione contas pelo padrão de demonstração vai encontrá-la pelo histórico. Apagá-la
tira o dono da própria plataforma.

**A forma é a do expurgo de 06/08, e ela não é burocracia.** Aquele run mediu que cada delete de
inscrito dispara `agregarFinanceiro`, `agregarEstoque` e `agregarDemografia`, e que os três só
desistem se o documento do evento não existir. Como o evento morre depois dos inscritos, os agregados
renascem e ficam **órfãos sob um pai inexistente**, invisíveis no console e para qualquer inventário
futuro, porque `documents.list` não devolve pai que não existe. A ordem do plano é o que impede isso, e
ela já está codificada em `planoLimpeza.ts`. Junto: a amplificação medida foi de cerca de 7.800
escritas e 1 milhão de leituras para 710 inscritos, porque quatro gatilhos reescaneiam a coleção
inteira a cada delete.

Então a purga roda com **inventário congelado antes de apagar**, review fria sobre o plano congelado, e
só depois o apply, reusando o runner de `C:\dev\leela-apply-20260806\`. O backup de Firestore e o de
Auth têm de ser feitos **juntos**: restaurar um sem o outro devolve `ownerUid` para
`uid-marina-castelo` com a claim do dono no lugar, que é o incidente da manhã de 06/08 outra vez.

**Onde aterrissa.** Dado de produção em `leela-hub`; os três documentos de `repasses` com status
vetado; `functions/src/limpeza/planoLimpeza.ts` como plano; Firebase Auth para as duas contas demo. A
lacuna estrutural que a REV3 registrou, recomputo de saldo sem caminho de operador, **continua aberta**
depois da purga: apagar o comprometido de teste não cria o botão que faltava.

### ⛔ A armadilha de nome, e ela mataria a coisa mais importante do banco

O evento da compra real do dono chama-se **`teste-taxa-repassada`**. A palavra "teste" está no próprio
identificador. Qualquer varredura que selecione dado de teste por padrão de nome apagaria exatamente o
que esta purga existe para preservar, e apagaria junto o único pagamento real que a plataforma já
processou.

A seleção tem de ser por **lista explícita conferida contra o inventário congelado**, nunca por padrão
de nome, de slug ou de e-mail. A mesma regra vale para a conta `inguzbuilders@gmail.com`, que carrega o
histórico de `admin@demo-leela.dev`, e que uma varredura por padrão de demonstração encontraria.

Duas armadilhas de nome, dois jeitos de destruir o irrecuperável, e as duas se resolvem com a mesma
disciplina: **a lista antes do apply, e nada fora dela**.

---

## O que esta rodada deixa para a próxima lane do painel

A retirada dos dezenove itens de [[DECISOES-ABERTAS]] **não** foi feita aqui, por coordenação de
árvore: a lane REV-CORTE estava viva no mesmo arquivo. A passada de painel entra depois dela e tem
esta página como fonte.

Cinco coisas precisam sobreviver à retirada, e é por isso que ficam escritas aqui:

O **item 12** e os **quatro CRM** continuam no painel, e nenhum deles ganhou default por adiamento.

O **LGPD-1** ganha a terceira frente, vinda do ARENA-1, ao lado da que o radar de WhatsApp criou hoje
cedo. As duas são a mesma família: dado pessoal de participante deixando de ser privado por desenho.

O **JUROS-1** fecha, mas com ordem: o alinhamento do parcelamento no código vem antes do save. Salvar
primeiro sela uma v2 dizendo 2,89% em toda parcela, que é o número que a decisão do mesmo dia derruba
de 1x a 3x. Consertar o histórico com o número errado é pior que o estado de hoje.

Três linhas saem do painel **por purga** e não por construção: **VITRINE-2**, **COMPROMETIDO-1** e as
contas demo do **ADMINSEP-3**. Nenhuma delas está resolvida até a PURGA-DADOS-TESTE rodar, então
retirá-las do painel antes do apply trocaria pendência visível por pendência esquecida. Retirar junto
com o report da purga, não antes.

O **PATROCINADOR-TOGGLE** é decisão nova e não tem linha no painel para remover. Ele entra no board e
no [[LEELA-E10-marcas]], e responde a **Posição 1** da fila de construção, que passa a ter resposta
diferente da que o item propunha.
