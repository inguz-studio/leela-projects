---
tags: [leela, decisoes, rodada, metricas, inscritos, ticket-medio, conversao, taxa, servico, piso]
trace: leela-pixreal-diag-20260804
lote: SPEC-METRICAS-SERVICO
data: 2026-08-05
---

# 01-decisões · Quem é inscrito, e quanto custa o Serviço

> Uma fala do dono, escrita depois de ele mesmo fazer uma compra real por PIX e **não pagar**.
> Ela carrega cinco coisas de naturezas diferentes: duas correções de métrica, uma supressão de
> texto, um preço mínimo que ainda não existia e um renome. Uma correção posterior fixou a
> unidade do preço mínimo.
>
> Zero código. O território desta lane foi `leela-specs/`, e toda afirmação sobre o repositório
> foi medida com o caminho citado.

## O que o dono pediu

**Verbatim, 05/08:**

> "hoje consideramos inscritos, como pessoas que entraram e geraram um pagamento, mas fiz uma
> compra no pix, e nao paguei. Logo, nao sou inscrito, devemos apenas considerar no painel
> profissional, inscritos, aqueles que já efetuaram o pagamento de fato. isso vale para o ticket
> médio também, a Taxa de conversão no caso, seria de 50% já que uma pessoa pagou e outra não.
> (mas no caso, nao contabilizei o numero de visitantes, apenas estou exemplificando) a
> contabilidade de visitantes e pagantes é a correta. 'Repasse previsto' nao deve ter escrito o
> 'após taxa 10.5%' suprimir essa descrição. Outra coisa, também nao configuramos o valor mínimo
> que cobraremos pelo nosso serviço, que a priori será de R$ 3,00. Ou seja, proporcionalmente, a
> taxa será contabilizada, se ela for na conta menor que 3,00 cobraremos 3,00 pela taxa de
> serviço leela, e nao devemos chamar ela de Taxa leela, e sim chamar de 'Serviço'."

**Correção posterior, verbatim.** Perguntado se o piso de R$ 3,00 vale por pedido ou por
ingresso:

> "coloquei errado, É POR PEDIDO."

A correção é do dono e vale sobre a primeira leitura. O piso é **um por compra**, não um por
pessoa inscrita naquela compra.

**Reconfirmação, verbatim, em 05/08:** *"a taxa minima ficou por pedido mesmo né? nao por
ingresso"* — sim, por pedido. Nada mudou desde a correção acima: a RN-491 nasceu com a unidade
certa, e ela é certa por medição e não por escolha, porque a taxa já é calculada uma vez sobre o
`valorFinal` do pedido depois do cupom (`packages/core/src/checkout/saleState.ts:369-371`). Uma
compra de dez ingressos paga um piso, não dez.

## As quatro decisões

### D-0805-1 · inscrito no painel é quem pagou

A contagem exibida ao organizador passa a contar apenas quem tem pagamento confirmado. Vale
para o número em si, para o **ticket médio** que divide por ele e para tudo que derive dos dois.

O que a fala **não** decide, e a spec resolve com recomendação: se o mesmo número passa a
governar vaga, lote e o congelamento da configuração comercial do evento. Ele governa hoje uma
parte disso, e mexer nessa parte sem dizer abriria efeito em produção que a fala não pediu.
Detalhe em `02-spec-metricas-e-servico.md` §"O contador que também é fechadura".

### D-0805-2 · a taxa de conversão é visitantes sobre pagantes

O dono deu o exemplo com o denominador certo e declarou, na mesma frase, que não contabilizou
visitantes. Ele estava certo nas duas pontas: **a contabilidade de visitantes e pagantes é a
correta, e a de visitantes não existe.** A conversão não é calculável hoje, e a decisão que
sobra é o que a tela mostra enquanto não houver. A resposta medida está em
`02-spec-metricas-e-servico.md` §"A conversão que não fecha porque falta o denominador".

### D-0805-3 · o Serviço tem piso de R$ 3,00, por pedido

Quando a conta da taxa der menos que R$ 3,00, cobra-se R$ 3,00. A unidade é o **pedido**, pela
correção do dono, e não o ingresso. O piso entra na mesma aritmética que já existe, é congelado
na compra pela disciplina da RN-179 e nunca é recalculado depois.

Três consequências que a fala não menciona e a spec escreve por extenso, porque descobri-las
depois seria pior: o piso morde em **toda compra de até R$ 28,52**; numa experiência de R$ 10,00
o Serviço passa de R$ 1,05 para R$ 3,00, ou **30% da face**; e no modelo incorporado quem paga a
diferença é o organizador, que numa venda abaixo de R$ 3,00 receberia valor negativo. As três
estão em `02-spec-metricas-e-servico.md` §"O piso, em números".

### D-0805-4 · o nome é Serviço

"Taxa Leela" sai de toda superfície humana. O dono escreveu a palavra alvo entre aspas —
**Serviço** —, e a leitura literal tira também a palavra "taxa" do rótulo, não só a palavra
"Leela". A varredura mostrou que o comprador já lê "Taxa de serviço" no checkout desde a rodada
S1216, então o renome não parte do zero: ele fecha o último centímetro. O inventário com
arquivo e linha está em `02-spec-metricas-e-servico.md` §"O inventário do renome".

## O que já era verdade antes desta fala

Duas coisas que a lane mediu e que mudam o tamanho do trabalho.

**A contagem inflada já estava nomeada.** O parecer da lane PIXFIX-EXTREF, de 03/08, registrou
no [[LEELA-E03-operacao-evento]] que o "N inscritos" do cabeçalho conta qualquer status, e
fechou com a frase "se um dia virar regra: a decisão a tomar é se o N inscritos público conta
pendente ou só confirmado. Hoje ele conta tudo por construção, e isso nunca foi escrito". A fala
do dono é essa decisão, chegando dois dias depois do parecer que a pediu. O evento
`desafio-mtb-costa-lagoa-2026` seguia com dois pedidos órfãos contados.

**O dono virou o próprio caso de teste.** A compra por PIX que ele abriu e não pagou é o
terceiro registro do mesmo defeito, e é o primeiro em que a pessoa afetada é quem decide.

## Vizinhos

`02-spec-metricas-e-servico.md` tem a spec dos cinco itens, com o inventário dos consumidores do
contador, o veredito sobre capacidade e a conta do piso nos dois modelos de taxa.
`03-rns-delta.md` tem as regras novas e para onde cada uma foi. `04-fila-codigo.md` tem a fila
com as marcas de dinheiro congelado. [[DECISOES-ABERTAS]] tem o que sobe para veto.
