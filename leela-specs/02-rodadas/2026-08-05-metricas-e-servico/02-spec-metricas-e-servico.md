---
tags: [leela, spec, rodada, metricas, inscritos, ticket-medio, conversao, taxa, servico, piso, estorno]
trace: leela-pixreal-diag-20260804
lote: SPEC-METRICAS-SERVICO
data: 2026-08-05
---

# 02-spec · Quem o painel conta, e quanto custa o Serviço

> Cinco itens de uma fala só. Dois consertam número, um apaga uma linha de texto, um cria um
> preço que não existia e um troca um nome.
>
> Zero código. Toda afirmação foi medida no repositório e o caminho está citado. **Duas coisas
> que a fala do dono não previu foram encontradas antes de virarem código**, e as duas estão em
> destaque: o contador de inscritos também é a fechadura que congela a configuração comercial do
> evento, e o piso de R$ 3,00 pode ultrapassar o preço da venda.

## O que foi medido

Quatro varreduras de leitura sobre `apps/`, `packages/`, `functions/src/`, `firestore.rules` e
`firestore.indexes.json`, mais os épicos E03, E04, E09, E11, E12 e E16, o índice de RNs e as
rodadas TAXA-FLEX, DEC-0726B, PIXFIX-EXTREF e juros-margem. Nenhuma query contra produção.

## Parte 1 · Inscrito no painel é quem pagou

### Não existe um contador: existem dois, e eles já discordam

A primeira coisa que a varredura desfez foi a premissa de que há um número só.

**O contador de métrica** é `eventos/{id}.qtdInscritos`. Ele nasce em
`functions/src/eventos/agregarFinanceiro.ts:177`, onde `contarInscritos` faz `count()` sobre a
subcoleção inteira **sem filtro de status**, e é gravado em `:321-327`. O gatilho que o mantém é
um `onWrite` cru (`:341-362`), sem guarda de status. Como `createInscricaoCharge.ts:1685-1709`
cria os inscritos com `status: 'pendente'` no ato de gerar a cobrança, **o contador sobe antes de
existir pagamento**. É exatamente o que o dono viveu.

**O contador de capacidade** é `eventos/{id}/lotes/{loteId}.vendidos`. Ele nasce em
`functions/src/eventos/virarLote.ts:166-171`, e a linha que importa é uma só:

```ts
export const STATUS_QUE_CONTAM_VENDA = ['confirmado', 'estornado'] as const;
```

Ele conta **apenas confirmado e estornado**, o gatilho que o mantém tem guarda de mudança de
status (`:345-360`), e por isso só se move quando `webhookPagamento.ts:606-617` vira o inscrito
de `pendente` para `confirmado`. É um ratchet monotônico (`:212-235`): cancelar não devolve vaga,
e só o organizador reabre subindo a capacidade (RN-304).

### O veredito sobre capacidade

**Contar só pagante no painel não abre sobrevenda, porque a vaga nunca foi controlada pelo
contador do painel.** O gate que recusa a venda por lotação é
`packages/core/src/eventos/lote.ts:218-220` (`loteEsgotado = vendidos >= quantidadeLimite`),
consumido por `computeSaleState` (`packages/core/src/checkout/saleState.ts:60-63, 326`) e por
`createInscricaoCharge.ts:907-915, 2402-2421`. O estado `esgotado` da landing sai do mesmo campo
(`packages/core/src/eventos/vitrine.ts:144-160`). Nenhum deles lê `qtdInscritos`.

A recomendação do maestro — métrica vira pagante, capacidade mantém contador próprio — está
**certa na conclusão e já implementada na origem**. Não há contador novo a criar para a
capacidade: ele existe, chama-se `vendidos`, e a janela de 15 minutos da RN-158 já declara por
escrito que carrinho aberto não segura estoque.

Duas fronteiras ficam registradas porque são reais, ainda que anteriores a esta fala e fora do
que ela pediu:

1. **Sobrevenda por concorrência já é possível hoje, e não nasce desta mudança.** N compradores
   com PIX pendente passam todos pelo `computeSaleState`, porque `vendidos` só se move na
   confirmação. Isso é consequência direta da RN-158 ("o prazo não é reserva de vaga") e da
   decisão de não segurar estoque no carrinho. Nada nesta rodada piora nem melhora essa janela.
2. **O carrinho expira e não devolve nada, porque nunca segurou nada.**
   `expirarCarrinhosAbandonados.ts:105-122` carimba `expirado_sem_concluir` e grava o ciclo em
   ledger; não toca contador nem lote. `CARRINHO_PRAZO_SEGUNDOS = 15 * 60` vive em
   `packages/core/src/checkout/carrinho.ts:51`.

### ⚠️ O contador que também é fechadura

Aqui está o achado que muda o desenho, e ele não estava na fala.

**`qtdInscritos > 0` é a prova de "este evento já vendeu" que congela a configuração comercial do
evento.** Não em um lugar, em oito:

| Onde | O que congela |
|---|---|
| `firestore.rules:557-561` (`percursosEditaveis`) | `percursos` e `modalidades` |
| `firestore.rules:675-681` (`taxaModoEditavel`) | `taxaModo` — repassada × incorporada |
| `firestore.rules:1002, 1015, 1025` | criar e apagar kit, e mexer em preço de kit |
| `firestore.rules:526-533` | mesma família de guardas de edição do evento |
| `functions/src/eventos/guardPreco.ts:41-44` | preço do evento (RN-200) |
| `functions/src/eventos/guardPrecoLote.ts:63-82` | preço do lote |

Se `qtdInscritos` passar a contar apenas pagante, **um evento que só tem PIX pendente
descongela**: o organizador volta a poder trocar preço, percurso, modalidade, kit e até o modo da
taxa enquanto uma cobrança viva daquele evento espera pagamento. O comprador tem a cotação
congelada (RN-179), então o dinheiro dele não muda — mas ele pagaria por um percurso que deixou
de existir, ou por um kit apagado. É defeito novo, criado por um conserto de métrica, e do tipo
que só aparece semanas depois.

**Por isso a recomendação desta spec é não redefinir `qtdInscritos`, e sim dar nome próprio a
cada um dos dois papéis.** O campo existente continua sendo o total, que é o que a fechadura
precisa saber ("alguém já entrou na fila desta venda"), e nasce um campo novo com os pagantes,
que é o que a tela passa a ler. Duas razões:

- **A fechadura mora nas Rules, e Rules não sobem junto com a tela.** Deploy de `firestore.rules`
  e deploy de `apps/painel` são dois atos separados; redefinir o campo faria a janela entre eles
  ser uma janela de configuração destravada em produção.
- **O dado para o campo novo já está calculado.** `contarInscritos` já devolve `porStatus`
  (`agregarFinanceiro.ts:178-181`), e `financeiro/current.inscritos.porStatus.confirmado` já é
  gravado hoje. O campo novo é uma projeção do que a mesma transação já computa, não uma query a
  mais.

A alternativa rejeitada é redefinir `qtdInscritos` e trocar as oito guardas para uma nova prova
de venda. Ela é mais limpa no fim e mais cara e mais arriscada no caminho: mexe em Rules com
efeito imediato sobre dinheiro e configuração, para um ganho que o campo novo entrega sem tocar
em nada disso.

### O inventário dos consumidores do contador de métrica

Tudo que lê `eventos.qtdInscritos` hoje, e o que acontece com cada um quando a tela passa a ler
pagantes.

| Consumidor | Arquivo:linha | O que faz | Efeito |
|---|---|---|---|
| Header e sub-nav do evento | `apps/painel/src/routes/eventos/evento/EventoShell.tsx:97, 174` | "N inscritos" | **passa a pagantes** |
| Ticket médio | `apps/painel/.../overview/OverviewKpis.tsx:66` | denominador | **passa a pagantes** |
| Countdown do evento | `apps/painel/.../overview/CountdownHero.tsx:47-48` | `%` e `vagas = capacidade − qtdInscritos` | **passa a pagantes** |
| Hub de eventos | `apps/painel/src/routes/eventos/hub/hubRows.ts:59-91` | colunas "Vagas" e "Inscritos" | **passa a pagantes** |
| KPI do portfólio | `apps/painel/src/routes/eventos/_lib/kpis.ts:26` | Σ inscritos | **passa a pagantes** |
| Rótulo "esgotado" | `apps/painel/src/routes/eventos/_lib/status.ts:33-39` | `qtdInscritos >= capacidade` | **passa a pagantes** (rótulo, não gate) |
| Alerta "publicado com 0 inscritos" | `apps/painel/src/routes/eventos/_lib/alertas.ts:47, 112` | alerta | **passa a pagantes** |
| Vagas restantes e "Últimas vagas" | `packages/core/src/overview/kpis.ts:120-133` | `capacidade − qtdInscritos`; limiar 0,9 | **passa a pagantes** |
| Alerta de ocupação | `packages/core/src/overview/alerts.ts:123` | "X% das vagas preenchidas" | **passa a pagantes** |
| Dashboard do profissional | `functions/src/overview/aggregateProfessionalDashboard.ts:142, 178-187` | KPIs + alertas | **passa a pagantes** |
| Snapshot diário | `functions/src/analytics/coletaDiaria.ts:112` | histórico | **passa a pagantes** |
| Eventos ativos e countdown | `apps/painel/src/routes/overview/_lib/{activeEvents.ts:118-127, countdown.ts:122-123}` | "Últimas vagas"/"Esgotado" | **passa a pagantes** |
| Prova social da landing | `apps/landing/lib/leitor.ts:542` + `lib/tipos.ts:147-149` | dado lido, exibição suprimida | decisão **INSCR-1** |
| Guardas de preço | `functions/src/eventos/guardPreco.ts:41-44`, `guardPrecoLote.ts:63-82` | congela preço | **NÃO muda** — lê o total |
| Rules de configuração | `firestore.rules:526-533, 557-561, 675-681, 1002, 1015, 1025` | congela percurso, modalidade, kit, `taxaModo` | **NÃO muda** — lê o total |

Vinte e um consumidores. Dezenove são exibição e passam para o número novo; dois são fechadura e
ficam com o total. Nenhum deles é o gate de lotação da venda, que lê `vendidos`.

### O inscrito fantasma, que é a causa do número errado

O contador não está apenas contando errado: ele está contando errado **para sempre**, e vale
declarar porque muda o que a correção precisa fazer.

`expirarPixPendente.ts:243-245` declara em comentário que "inscritos permanecem 'pendente'" ao
cancelar por expiração, e `webhookPagamento.ts:361-368` faz o mesmo no caminho `failed`. Nenhum
código do repositório apaga doc de inscrito. Como o `count()` não filtra status, **cada PIX
abandonado deixa um inscrito somando +1 no contador de métrica, permanentemente**. Pior:
`expirarPixPendente` é callable disparada pelo cliente (`functions/src/index.ts:166`) e não existe
cron varrendo PIX pendente — se o comprador fecha a aba, o pedido nem sequer é cancelado.

Consequência prática que ninguém tinha escrito: **uma única cobrança gerada e nunca paga congela
a configuração comercial do evento para sempre**, porque `qtdInscritos > 0` passa a ser verdade e
nunca mais volta a ser falso. Isso não é criado por esta rodada, e a correção proposta aqui não o
resolve — ela apenas para de contaminar a tela. O conserto do fantasma é outra frente, e está
nomeado nas fronteiras.

### Ticket médio

`apps/painel/.../overview/OverviewKpis.tsx:66`:

```ts
const ticketMedio = qtdInscritos > 0 ? receitaConfirmada / qtdInscritos : 0;
```

O numerador conta só pagamento confirmado; o denominador conta pendente, cancelado e estornado
junto. **A métrica é estruturalmente subestimada** em qualquer evento com abandono. Um evento com
100 inscritos dos quais 50 pendentes mostra metade do ticket real, que é precisamente a distorção
que o dono percebeu.

A RN-336 já dizia "ticket médio = receita confirmada ÷ nº de inscrições pagas". A spec estava
certa desde sempre; o código nunca a seguiu. Esta rodada não muda a regra: ela a faz valer.

Duas correções de disciplina entram junto, porque a linha 66 as viola e o cabeçalho do próprio
arquivo as declara (`OverviewKpis.tsx:4-5`: "Só LÊ agregados — NUNCA recalcula"):

- **O cálculo sai do cliente.** O ticket médio passa a ser campo do agregado, computado na mesma
  transação de `recomputarFinanceiroEvento` que já tem numerador e denominador na mão.
- **O significado do ticket depende de `taxaModo` e a tela não diz.** Em `incorporada` o
  `valorFinal` embute o Serviço, então o ticket é bruto com o Serviço dentro; em `repassada` o
  Serviço é cobrado por fora e nunca entra em `receitaConfirmada`. A mesma métrica muda de
  sentido conforme a configuração do evento. Fica declarado; nenhuma tela nova é pedida por isso.

## Parte 2 · A conversão que não fecha porque falta o denominador

### Visitantes não existem — medido, não presumido

O dono já suspeitava ("não contabilizei o numero de visitantes, apenas estou exemplificando"), e
a varredura confirma em grau mais forte do que a suspeita.

Busca por `visitante`, `visitors`, `visitas`, `pageview`, `page_view`, `views`, `visualizacoes`,
`acessos`, `sessions`, `analytics`, `GA4`, `gtag`, `firebase/analytics`, `logEvent`, `plausible`,
`posthog`, `umami`, `measurementId` e `mixpanel` sobre `apps/`, `packages/`, `functions/src/`,
`firestore.rules` e `firestore.indexes.json`:

- **Nenhum SDK de analytics instrumentado.** `@firebase/analytics` aparece só no `pnpm-lock.yaml`
  como dependência transitiva do pacote `firebase`; nenhum arquivo importa `getAnalytics` ou
  `logEvent`. Zero `gtag`, zero `<Script>` na landing, zero provedor externo.
- **Nenhum contador próprio no Firestore.** As cerca de 66 coleções declaradas em
  `firestore.rules` não têm `visitas`, `pageviews` nem equivalente. A landing não faz nenhuma
  escrita de contador.

O denominador não existe **nem dentro nem fora** do Firestore. Não é caso de "o dado está no GA e
o painel não alcança": o dado nunca foi coletado.

A função de conversão existe e está correta —
`packages/core/src/overview/kpis.ts:155-161` devolve `null` quando não há visitas — e a única
chamada real passa `null` literal, com o motivo escrito:

```ts
// taxaConversaoPct: sem dado de visitas até E12 → null (decisão nº 7 Onda 1)
```
`functions/src/overview/aggregateProfessionalDashboard.ts:195-201`

**A tela nunca inventou número, e isso é o que salvou o item.** Em produção o card sempre mostra
`—`.

### Duas conversões diferentes com o mesmo nome

O E11 promete conversão **por atribuição**: cliques em link master de clube contra tráfego
direto, meta acima de 3x (PRD 7.1, RN-125/RN-311). O painel exibe conversão **por tráfego**:
visitantes sobre inscritos (`OverviewKpis.tsx:100`). São métricas diferentes com o mesmo rótulo.

O E11 nunca prometeu contagem de visitas. O código atribui a lacuna ao "gap E12"
(`OverviewPage.tsx:6`, `kpis.ts:17`, `queries.ts:232-237`), e o E12 também não especifica coleta
de visitas em lugar nenhum. **O visitante é órfão: nenhum épico o cobre.** Esta rodada dá dono a
ele — o E11 — sem construir.

### O que a tela mostra enquanto não houver

O card promete hoje uma capacidade que não existe em nenhuma camada: o rótulo
`visitantes → inscritos` é renderizado **sempre**, inclusive com valor `—`. Um organizador lê
isso como "a plataforma mede minhas visitas e ainda não tem número suficiente", quando a leitura
verdadeira é "a plataforma não mede visitas".

O default proposto é **esconder o card enquanto não houver denominador**, e não exibi-lo em `—`.
Sem visitas, um card de conversão vazio é pior que a ausência: ele ocupa um quarto da faixa de
KPIs e ensina o organizador a esperar um número que não vem. Quando o contador existir, o card
volta com o mesmo rótulo e a mesma fórmula. A escolha sobe ao painel como **CONV-1**, porque é
decisão de produto e tem alternativa defensável (manter o `—` com uma nota curta de "ainda não
medimos visitas").

### Achado de passagem · o mock que não é do produto

Quando a conversão aparece com número, ele é literal de mockup injetado por seed de preview.
`functions/scripts/preview-seed-extra.ts:1170-1171` fixa `CONVERSAO_TAXA_MOCKUP = 68.2` e
`:1282` fixa `taxaConversaoPct: 42`, escrevendo por cima do agregado real com `merge: true` num
laço que reescreve até estabilizar. Para o dashboard consolidado, ainda carimba `computadoEm`
cerca de dez anos no futuro (`:1172-1174`) para que `getOverview` nunca considere o doc velho e
nunca recompute.

Em produção esses campos não existem e a UI degrada honesto. **O risco é o script:** rodado
contra um projeto que não seja emulador, o `computadoEm` no futuro congela o dashboard daquele
profissional permanentemente. Fica registrado como dívida nomeada, fora do escopo desta rodada.

Na mesma varredura, três campos do Overview são lidos pela tela e **nunca gravados em
produção**: `receitaSemana`, `ticketSparkline` e `receitaPorModalidade`
(`agregarFinanceiro.ts:305-319` grava apenas `tenantId`, `receitaBruta`, `taxaPct`, `taxaValor`,
`receitaLiquida` e `inscritos`). Eles existem só no seed de preview. A tela esconde cada um
quando falta, então não há defeito visível — mas o card de receita promete um "+X esta semana"
que nunca aparece para ninguém.

## Parte 3 · O "Repasse previsto" perde a descrição

Item cirúrgico e de uma linha. O bloco inteiro vive em
`apps/painel/src/routes/eventos/evento/overview/OverviewKpis.tsx:104-116`, e a descrição a
suprimir é a linha 110:

```tsx
{typeof taxaPct === 'number' ? `após taxa ${formatInt(taxaPct)}%` : 'após taxa Leela'}
```

Dois fatos que a leitura do arquivo revela e que mudam o tamanho da tarefa:

- **A string "após taxa 10,5%" não existe como literal.** Ela é composta em tempo de execução;
  `formatInt(10.5)` usa `Intl.NumberFormat('pt-BR')` e produz `10,5`. Procurar pelo texto no
  repositório não acha nada, e é por isso que ele precisa estar escrito aqui.
- **O fallback dessa mesma linha é a única ocorrência visível de "Taxa Leela" no produto
  inteiro.** Suprimir a descrição resolve o item 3 e um pedaço do item 5 no mesmo gesto.

O cálculo não muda: `repassePrevisto` continua vindo de `fin.receitaLiquida`
(`OverviewPage.tsx:61`), computado no servidor por `computeFinanceiro`
(`agregarFinanceiro.ts:123-155`). O que sai é texto.

O badge "Aguardando encerramento" (linhas 112-114) **fica**. Ele é a RN-331 e diz outra coisa:
não fala de taxa, fala de quando o dinheiro libera. A prop `taxaPct` perde o consumidor e sai da
assinatura do componente, o que derruba a fiação em `OverviewDashboard.tsx:29-30, 87-88` e
`OverviewPage.tsx:62`. Três asserções de teste caem junto e precisam ser reescritas
(`__tests__/OverviewDashboard.test.tsx:52, 54, 57-60, 70`).

## Parte 4 · O piso de R$ 3,00 no Serviço

### Onde ele entra

A aritmética canônica é uma função só,
`packages/core/src/finance/taxaPlataforma.ts:253-272`:

```ts
return Math.round((faceCentavos * percentualBp) / 10_000) + fixoCentavos;
```

Tudo em centavos inteiros, half-up, com o componente fixo somado **depois** do arredondamento do
percentual (RN-183). O piso é um terceiro termo na mesma expressão, aplicado por último:

```
taxa = max( round(faceCentavos × percentualBp ÷ 10000) + fixoCentavos , pisoCentavos )
```

**A unidade já está certa por construção.** A taxa é calculada **uma vez por pedido**, sobre o
`valorFinal` do pedido inteiro depois do cupom — `saleState.ts:369-371, 392, 413-415` — e o
`fixoCentavos` já é documentado como "componente fixo POR VENDA"
(`taxaPlataforma.ts:70`), somado uma única vez. Um pedido de dez ingressos paga um fixo, não dez.
**O piso por pedido, que o dono corrigiu, cai exatamente na mesma unidade que a casa já usa** —
não é preciso inventar unidade nova nem mudar onde a conta acontece.

O valor mora na tabela, não no código. Ele entra como campo da linha por meio de pagamento
(`platform/config.taxaPlataforma`, com override em `commercialTerms/current.taxaTabela`), pela
mesma razão da RN-183 e da RN-455: nenhum número de dinheiro em constante. A precedência já
existente — override do organizador, depois global, depois legado
(`resolverTaxaMeio`, `taxaPlataforma.ts:214-238`) — vale linha a linha, e o piso segue a linha.

### O piso, em números

Com a linha vigente de 10,5% e fixo zero, o piso **morde em toda compra de até R$ 28,52**. A
partir de R$ 28,53 a fórmula já entrega R$ 3,00 ou mais por conta própria, e o piso fica inerte.

| Face do pedido | Serviço hoje | Serviço com piso | Efetivo sobre a face |
|---|---|---|---|
| R$ 2,00 | R$ 0,21 | **R$ 3,00** | 150,0% |
| R$ 3,00 | R$ 0,32 | **R$ 3,00** | 100,0% |
| R$ 5,00 | R$ 0,53 | **R$ 3,00** | 60,0% |
| **R$ 10,00** | **R$ 1,05** | **R$ 3,00** | **30,0%** |
| R$ 15,00 | R$ 1,58 | **R$ 3,00** | 20,0% |
| R$ 20,00 | R$ 2,10 | **R$ 3,00** | 15,0% |
| R$ 25,00 | R$ 2,63 | **R$ 3,00** | 12,0% |
| R$ 28,52 | R$ 2,99 | **R$ 3,00** | 10,52% |
| R$ 28,53 | R$ 3,00 | R$ 3,00 | 10,51% |
| R$ 100,00 | R$ 10,50 | R$ 10,50 | 10,5% |

**A linha do dono está na tabela, em negrito: numa experiência de R$ 10,00 o Serviço sai de
R$ 1,05 para R$ 3,00, que é 30% da face.** Fica escrito aqui para que ele leia a consequência
agora, e não descubra depois.

O efeito por modelo de taxa, sobre a mesma experiência de R$ 10,00:

| | hoje | com piso | delta |
|---|---|---|---|
| **repassada** — o comprador paga | R$ 11,05 | **R$ 13,00** | +R$ 1,95 (+17,6% no total) |
| **repassada** — o organizador recebe | R$ 10,00 | R$ 10,00 | inalterado |
| **incorporada** — o comprador paga | R$ 10,00 | R$ 10,00 | inalterado |
| **incorporada** — o organizador recebe | R$ 8,95 | **R$ 7,00** | −R$ 1,95 (−21,8% do líquido) |

As fórmulas são as que já existem em `packages/core/src/finance/repasse.ts:75-97`
(`computeLiquidoProdutor`): em `repassada` o líquido é a face e o comprador paga face mais
Serviço; em `incorporada` o total do comprador é a face e o líquido é face menos Serviço.
`incorporada` é o default (`repasse.ts:50`, `MODO_TAXA_DEFAULT`), então **na configuração padrão
quem absorve o piso é o organizador**.

Um efeito de segunda ordem no parcelamento, para não surpreender: em `repassada` a base do
cálculo de parcelas é `face + Serviço`, então uma venda de R$ 10,00 passa a ter base R$ 13,00.
Com `parcelaMinima` em R$ 10,00 (default dos termos), isso muda a escada de parcelas ofertada. O
cálculo em si não muda de forma.

### ⚠️ A borda que a fala não previu: quando o piso passa da face

Numa venda de R$ 2,00 em modo `incorporada`, o líquido do organizador seria **negativo**:
R$ 2,00 menos R$ 3,00 é −R$ 1,00. `computeLiquidoProdutor` devolveria número negativo
(`repasse.ts:88, 96`), e o clamp em zero só existe uma camada acima, no agregado do evento
(`agregarFinanceiro.ts:123-155` usa `max(0, bruta − taxaValor)`) — o que esconde o problema em vez
de resolvê-lo, e faz o repasse divergir da soma das vendas.

O dono escreveu "se ela for na conta menor que 3,00 cobraremos 3,00" pensando em taxa pequena,
não em venda pequena. A spec **não decide isto**; ela registra o default e manda ao painel como
**SERV-2**.

Default proposto, e a razão: **o Serviço nunca ultrapassa a face** — `taxa = min(max(fórmula,
piso), face)` — porque cobrar do organizador mais do que a venda inteira transforma uma venda em
dívida, e nenhuma tela do produto sabe representar isso. É o comportamento mais defensável sem
uma segunda decisão. A alternativa que resolve de verdade é um **preço mínimo de venda** acima do
piso, que o produto hoje não tem: `saleState.ts:393-397` só recusa `valorFinal ≤ 0` (pedido
gratuito está fora do fluxo pago), e não existe nenhum mínimo positivo.

Vale notar que a borda não é hipotética para sempre: dois eventos publicados hoje estão sem
preço (itens VITRINE-1 e VITRINE-2 do painel), e o produto ainda não tem piso de preço.

### O congelamento, e por que ele precisa de um campo novo

A taxa é congelada no ato da compra (RN-179). O carimbo vive em
`packages/core/src/pedidos/pagamento.ts:250-261` e é escrito em
`createInscricaoCharge.ts:1869-1875`, na mesma transação que cria pedido e pagamento:

```ts
pagamentoDoc['taxaCongelada'] = { meio, percentual, fixoCentavos, valor, origem };
```

O `valor` já é o número final, então o piso entraria "de graça" — e é exatamente aí que está a
armadilha. **Com apenas `{percentual, fixoCentavos, valor}`, um leitor futuro não consegue
distinguir uma venda em que o piso mordeu de uma venda com tabela diferente.** `percentual: 10,5`
com `valor: 3,00` sobre face R$ 10,00 é aritmeticamente impossível pela fórmula gravada, e quem
auditar vai concluir carimbo corrompido — que é exatamente o que
`webhookPagamento.ts:581-590` já trata como anomalia, com telemetria
`taxaflex_carimbo_corrompido_sem_conciliacao`.

O carimbo passa a carregar o piso e a marca de que ele mordeu: `pisoCentavos` e
`pisoAplicado: boolean`. Com isso o replay reproduz o número exato a partir do próprio documento,
sem consultar tabela nenhuma, que é a promessa da RN-179. **Mudar a tabela do piso depois nunca
reprecifica pedido existente.**

Um ponto de atenção fora do carimbo: `functions/src/platform/rollups.ts:82-92` calcula
`receitaLeela = computeTaxa(gmv, platformFeePct)` — uma estimativa macro por percentual, que
ignora o carimbo. Com o piso, essa estimativa passa a **subestimar** a receita da plataforma em
qualquer base com muitas vendas pequenas. Ela já era estimativa; passa a ser estimativa
enviesada, e isso entra na fila como correção de rollup.

### O estorno

A mecânica não muda; os números mudam. Vale a pena separar as duas coisas.

A devolução pura é `calcularDevolucaoEstorno` em
`packages/core/src/eventos/politicaVendas.ts:451-468`: dentro dos sete dias de arrependimento
volta face mais Serviço **integral**, não parametrizável (RN-373/374, art. 49 do CDC); fora da
janela volta a face e o Serviço segue `politica.devolveTaxaForaDaJanela`, cujo default é reter.
Nada disso muda de forma — mas o valor devolvido dentro da janela cresce junto com o piso. Numa
compra de R$ 10,00 em modo `repassada`, o comprador que desiste no prazo recebe R$ 13,00 em vez
de R$ 11,05.

O rateio por linha também não muda de forma. `montarItensDoPedido`
(`packages/core/src/pedidos/pedido.ts:330-449`, rateio em `:388-428`) distribui o
`taxaRepassadaTotal` entre os itens proporcionalmente ao `valorFinal` de cada linha, por piso
proporcional mais maior resto, com a invariante `Σ itens.taxaRepassada === taxaRepassadaTotal`
por construção. **O piso apenas muda o total a ratear.** Como ele é por pedido e o rateio é por
maior resto, estornar as N linhas uma a uma devolve exatamente o piso, sem centavo sobrando nem
faltando — a invariante já garante isso, e a prova é caso de teste, não código novo.

Duas consequências que precisam estar escritas:

- **Estorno parcial de um pedido com piso não devolve o piso proporcional "justo".** Se um pedido
  de três ingressos de R$ 10,00 pagou R$ 3,15 de Serviço (a fórmula já passa do piso em R$ 30,00
  de face), nada muda. Mas um pedido de três ingressos de R$ 3,00 pagou o piso de R$ 3,00 sobre
  face de R$ 9,00, e estornar um ingresso devolve um terço do piso. Isso é consistente com "o
  piso é do pedido", e é a leitura correta da correção do dono.
- **Em `incorporada` não existe decomposição do Serviço por ingresso.** `pedido.ts:444-446` só
  preenche `itens[].taxaRepassada` no modo `repassada`. No modo incorporado o Serviço nunca foi
  dinheiro do comprador e não entra no estorno dele — só reduz o líquido do organizador. O piso
  segue essa mesma regra e não cria caminho novo.

O piso do principal no parcelamento (`packages/core/src/finance/calc.ts:144-150`), corrigido em
rodada anterior, é **outra coisa** e não interage: ele garante que a soma das parcelas não fique
abaixo do total; o piso do Serviço opera sobre a taxa, antes da montagem das parcelas. Os dois
convivem sem se tocar.

### Onde o piso aparece

| Para quem | Superfície | O que muda |
|---|---|---|
| Comprador | Resumo do checkout — `StepResumo.tsx:383, 389` | a linha do Serviço mostra o valor com piso; em `repassada` o total sobe |
| Comprador | Confirmação — `StepConfirmacao.tsx:254, 261` | mesmo valor, mesma linha |
| Comprador | Página do evento — `LotesSection.tsx:36`, `HeroSection.tsx:114`, `HeroMinimo.tsx:77`, `CheckoutCtaSection.tsx:45` | o "+ Serviço" continua sem número (não muda) |
| Comprador | E-mails | **nada** — a varredura de `functions/src/email/*` e `packages/core/src/email/*` não achou nenhuma menção a taxa ou serviço |
| Organizador | Repasse previsto e agregado do evento | líquido menor em `incorporada` |
| Organizador | Caixa e CSV financeiro | **nada** — `gerarCsvFinanceiro` (`apps/painel/src/routes/eventos/_lib/financeiro.ts:223-238`) exclui a taxa de propósito por RN-404, com guarda de teste em `financeiro.test.ts:273-275` |
| Plataforma | `/plataforma/taxa` | a tabela ganha a coluna do piso |

**Nenhum e-mail e nenhum CSV precisa mudar por causa do piso.** É o resultado mais útil da
varredura, porque encolhe a superfície da tarefa pela metade.

## Parte 5 · O inventário do renome

### O que o dono pediu, na letra

Ele escreveu: "não devemos chamar ela de Taxa leela, e sim chamar de 'Serviço'". A palavra alvo
está entre aspas e é **Serviço** — sem "Taxa" na frente. A leitura literal tira as duas palavras
do rótulo, não só a marca.

Isso tem consequência maior do que parece, porque **o comprador já lê "Taxa de serviço"** desde a
rodada S1216. Se o alvo fosse só remover a marca, não haveria trabalho no checkout. Como o alvo é
a palavra "Serviço", o checkout muda também. Sobe ao painel como **SERV-3**, com default de
seguir a letra.

### O achado que sozinho justifica a varredura

`apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx:553`:

```tsx
<Campo termo="Taxa Be Hero" valor={`– ${formatDinheiro(conc.taxaValor)}`} />
```

**O painel do organizador mostra hoje um campo chamado "Taxa Be Hero"** — o nome da plataforma
anterior — e, junto com o nome errado, **expõe o valor da taxa ao produtor**, que é justamente o
que a RN-404 e a decisão do dono registrada em `.nirvana/briefs/leela-fix-tema-clube-enriched.md`
mandam não exibir. O resto do produto respeita a decisão com rigor: o CSV financeiro exclui a
taxa de propósito e tem teste provando a ausência, e `FinanceiroView.test.tsx:38` guarda que a
tela financeira não diga "Taxa Leela". Este slide-in passou por fora das duas guardas.

São dois defeitos num campo só, e nenhum deles é o renome pedido. Entram na fila junto porque a
mão está no mesmo arquivo.

### O inventário, por superfície

Trinta e cinco strings visíveis nomeiam a taxa da plataforma. Nenhuma delas está em e-mail, PDF
de ingresso, CSV ou área do cliente — essas quatro superfícies estão limpas e não têm tarefa.

| Superfície | Visíveis | Onde | O que vira |
|---|---|---|---|
| Checkout — resumo e confirmação | 4 | `StepResumo.tsx:383, 389`; `StepConfirmacao.tsx:254, 261` | `Serviço (PIX)` · `Serviço` |
| Checkout — explicação do modo | 2 | `StepModalidadeKit.tsx:175, 176` | prosa sem "taxa" |
| Página do evento | 5 | `LotesSection.tsx:36`; `HeroMinimo.tsx:77`; `HeroSection.tsx:114`; `CheckoutCtaSection.tsx:45`; `page.tsx:255` (metadata/SEO) | `+ Serviço` |
| Painel do organizador — config | 4 | `EventoForm.tsx:408, 412`; `ConfigGeraisForm.tsx:240`; `PoliticaVendasForm.tsx:143` | `Serviço` · "Repassar o Serviço ao comprador" |
| Painel do organizador — estorno e política | 4 | `PoliticaVendasForm.tsx:149`; `InscritoSlideIn.tsx:469, 482`; `EstornosAdminRoute.tsx:296` | prosa com "Serviço" |
| Painel do organizador — o campo errado | 1 | `InscritoSlideIn.tsx:553` | **suprimir o campo** (RN-404), não renomear |
| Painel do organizador — CRM | 1 | `ClienteDetailPage.tsx:117` (`inclui taxa repassada`) | `inclui o Serviço repassado` |
| Painel do organizador — repasse previsto | 1 | `OverviewKpis.tsx:110` (`após taxa Leela`) | **suprimir** — é o item 3 |
| Super-admin — tabela global | 8 | `TaxaGlobalRoute.tsx:106, 117, 126, 127, 138, 141-145, 148-149, 189-190` | decisão **SERV-3** |
| Super-admin — termos e provisionamento | 3 | `TermsEditor.tsx:235`; `ProvisionTenantModal.tsx:176`; `MacroDashboard.tsx:47` | decisão **SERV-3** |
| Super-admin — navegação | 1 | `nav.ts:24` (rótulo + rota `/plataforma/taxa`) | rótulo muda; rota fica |
| **Total** | **34 + 1 a suprimir** | | |

Sobre o super-admin: a recomendação é **manter a palavra "plataforma" ali** — "Serviço da
plataforma" — porque quem opera aquela tela precisa distinguir esta cobrança de qualquer outra, e
o público é interno, não o comprador nem o organizador. Vai ao painel na mesma pergunta SERV-3.

### O que NÃO muda de nome

**A taxa do gateway não muda porque ela não tem nome no produto.** A varredura por `asaas`,
`gateway`, `MDR`, `adquirente`, `custoGateway`, `gatewayFee` em `apps/`, `packages/` e
`functions/src` devolveu **zero strings visíveis**. Tudo que existe são comentários técnicos,
códigos de erro (`MOTIVO_GATEWAY_SEM_RESPOSTA`, `gatewaySemResposta`) e configuração de ambiente.
O custo do gateway é hoje deliberadamente descartado — `asaasProvider.ts:1505-1507` usa sempre
`payment.value` e nunca `netValue` —, e o modelo dele (RN-455 e RN-459, tabela `custoGateway` e
carimbo do custo) está especificado na rodada de juros e margem e **ainda não construído**. Não há
o que preservar nem o que confundir.

Três famílias de palavras casam com a busca e **não** são esta taxa:

| Onde | Texto | O que é |
|---|---|---|
| `OverviewKpis.tsx:96`; `KpiRow.tsx:213` | "Taxa de conversão" | métrica, não dinheiro |
| `PoliticaVendasForm.tsx:181`; `AceitesCompra.tsx:47` | "Taxa de transferência" | transferência de titularidade |
| `planos/_lib/resumo.ts:30`; `PlanoFormModal.tsx:150, 161` | "Sem taxa", `taxaCartaoAVista`, `taxaPix` | juros de parcelamento |

E dois identificadores que casam com `fee`/`custo` e são outra coisa: `saasMonthlyFee`
(mensalidade) e `anticipation.custoPct` (antecipação de recebíveis).

### Campo de dado não muda

Renome é de **texto visível**. `platformFeePct`, `taxaModo`, `taxaCongelada`, `taxaRepassada`,
`taxaTabela`, `taxaPct`, `taxaValor`, `taxaServico` e a rota `/plataforma/taxa` **ficam como
estão**. A razão é dura: `platformFeePct` vive em `commercialTerms/v{n}`, que são snapshots
imutáveis e create-only; renomear exigiria backfill de histórico de dinheiro. `taxaModo` é
validado por enum fechado nas Rules (`firestore.rules:666, 680`). `taxaCongelada` é carimbo
imutável por transação. **Nenhum ganho de leitura justifica migrar dado financeiro.** Fica escrito
para que a próxima lane não confunda o renome de rótulo com renome de campo.

## Premissas desta lane

1. **Nada é retroativo.** O piso vale para compras futuras. Nenhuma venda já cobrada é
   recalculada, reprecificada ou re-carimbada — é a RN-179 operando como sempre operou. Se o dono
   quiser efeito retroativo, isso é ordem explícita e outra rodada, e envolve dinheiro já
   liquidado.
2. **A contagem histórica muda de número sem mudar de dado.** Ao passar a exibir pagantes, os
   painéis mostram números menores para eventos que já existem, inclusive os dois pedidos órfãos
   do `desafio-mtb-costa-lagoa-2026`. Não é perda: é a mesma base lida com o filtro certo.
3. **Nenhum inscrito é apagado.** A recomendação de 03/08 continua valendo — apagar inscrito em
   produção é escrita irreversível sobre dado de comprador.
4. **A tabela do piso nasce vazia**, pela mesma disciplina da RN-455: nenhum valor de dinheiro
   entra no repositório. O R$ 3,00 é configurado pelo `platform_admin` na tela, não em constante.
5. **O piso é global e por meio de pagamento**, seguindo a forma da RN-178. Não há nível por
   evento, pela mesma decisão de 19/07.
6. **A janela de 15 minutos não vira reserva de vaga.** Nada nesta rodada muda a RN-158.
7. **A contagem de visitantes não é construída aqui.** Esta rodada dá dono e contrato; a
   construção depende de decisão do painel.

## Fronteiras declaradas, não resolvidas

- **O inscrito fantasma que nunca decai.** PIX expirado ou falho deixa o inscrito em `pendente`
  para sempre, e `expirarPixPendente` é callable de cliente sem cron de varredura. Isso mantém a
  fechadura de configuração travada por uma venda que nunca houve. Frente própria, fora daqui.
- **Sobrevenda por concorrência de PIX pendente.** Anterior a esta rodada, declarada na RN-158,
  inalterada por ela.
- **O `computadoEm` no futuro do seed de preview.** Dívida nomeada; risco de congelar o dashboard
  de um profissional se o script rodar fora do emulador.
- **`receitaSemana`, `ticketSparkline` e `receitaPorModalidade` nunca são gravados em
  produção.** A tela esconde cada um, então não há defeito visível — mas três promessas do
  Overview não existem.
- **Se o reembolso devolve o Serviço fora da janela** segue sendo o item 23 do painel, com
  default de reter. O piso não o decide; apenas aumenta o valor em disputa nas compras pequenas.

## Vizinhos

`01-decisoes-dono.md` tem o verbatim e a correção do piso. `03-rns-delta.md` tem as onze regras
novas e o épico dono de cada uma. `04-fila-codigo.md` tem a fila com as marcas de dinheiro
congelado. [[LEELA-E03-operacao-evento]], [[LEELA-E04-config-vendas]],
[[LEELA-E09-financeiro-profissional]], [[LEELA-E11-analytics]] e [[LEELA-E12-landing]] recebem as
regras.
