# Handoff · SERIE-FINANCEIRA (2026-08-17, noite → 18/08 madrugada)

- **Trace:** `leela-redesign-v2-20260810` · lane `SERIE-FINANCEIRA`
- **Branch:** `serie-financeira` · worktree `C:\dev\leela-wt-seriefin`
- **História:** [[LEELA-E11-analytics]] · **S825-T1 + S825-T2** — prometida ao dono na leva 25
- **Deploy:** ⛔ **ZERO**. Nada subiu. O que o deploy destrava está na seção 7.

## A pergunta, e o que ela achou

> *"por que nao temos esse agregado de pagamento se salvamos todas as formas de pagamento ?"*

Ele estava certo na premissa e a resposta já registrada estava certa no diagnóstico: faltava o
degrau do meio. O que a construção acrescentou foi **onde** esse degrau cabia — e o achado é que
ele já estava pago.

`agregarFinanceiro.ts` **já varria todos os pagamentos confirmados de cada evento**, doc a doc,
dentro de uma transação, para somar os carimbos TAXAFLEX (`:262-267` no HEAD anterior). A série por
forma sai desse mesmo laço: **nenhuma query nova, nenhum índice novo, nenhum doc a mais lido.** O
agregado que não existia custava zero leitura para existir.

Isso muda a resposta ao dono de "falta construir o rollup" para algo mais desconfortável e mais
útil: **o laço estava lá, passando por cima do campo `forma` em cada doc, e ninguém tinha pedido
para olhar.**

## 1 · Onde a série mora, e por que ali

| Camada | Arquivo | O que ganhou |
|---|---|---|
| Contrato | `packages/core/src/pedidos/serieFormasPagamento.ts` **(novo)** | `FatiaFormaPagamento`, soma, parse, cobertura |
| Agregado do **evento** | `functions/src/eventos/agregarFinanceiro.ts` | `formasPagamento` + `pendentes` em `eventos/{id}/financeiro/current` |
| Agregado do **organizador** | `functions/src/overview/aggregateProfessionalDashboard.ts` | lê a série de cada evento por point read |
| Consolidação pura | `packages/core/src/overview/kpis.ts` | `OverviewKPIs.formasPagamento` |
| Histórico diário | `packages/core/src/analytics/snapshot.ts` | a série entra no snapshot |
| Leitura do cliente | `packages/api-client/src/eventos/queries.ts` | `FinanceiroEvento.formasPagamento` |
| Tela | `apps/painel/src/routes/overview/_components/FormasDePagamento.tsx` **(novo)** | a rosca |

**A S825-T1 diz "agregado do EVENTO" e é isso que foi construído.** O brief pedia "no agregado do
organizador"; o épico venceu, como combinado. E venceu com razão: o organizador **consolida**, não
apura — a autoridade sobre número de venda, pelo próprio E11, é a de vendas.

### O shape

```ts
interface FatiaFormaPagamento {
  forma: 'pix' | 'cartao_credito';
  vendas: number;   // pagamentos CONFIRMADOS nesta forma
  valor: number;    // Σ max(0, valorFinal − estornadoTotal), em R$
}
```

A série é sempre **completa** (uma fatia por forma do enum) e sempre na **ordem canônica**, mesmo
para forma sem venda. Cor categórica de dataviz é identidade: Pix precisa ser a mesma cor no evento
vazio e no evento cheio, senão duas roscas lado a lado contam histórias trocadas.

**São duas formas, não três.** O brief dizia "seed com as 3 formas"; `FormaPagamento` tem dois
valores (`pix`, `cartao_credito` — boleto saiu do domínio por decisão de 05/07). O que o seed tem em
três é o **estado** do PIX (confirmado, pendente, vencido). A rosca tem duas fatias e é assim que
tem que ser.

### O valor é líquido de estorno parcial

Mesma régua que `agregarFinanceiro` já usava para a fatia carimbada. Estorno integral flipa o status
e sai do Σ pelo filtro `status == 'confirmado'`; estorno parcial mantém o pagamento confirmado e
desconta o que voltou. Somar face cheio faria a rosca somar **mais** que a receita confirmada da
mesma dobra — dois números do mesmo dinheiro discordando na mesma tela.

## 2 · `null` e série zerada são estados diferentes (e é aqui que mora a honestidade)

Esta é a decisão que atravessa todas as camadas, do Firestore ao pixel:

- **`null`** = *"este agregado não sabe responder"* — doc gravado por servidor anterior à série. A
  tela mantém o **"em breve"**.
- **Série zerada** = *"o servidor somou e não achou venda"*. A tela mostra **vazio honesto**:
  "Nenhuma venda confirmada ainda".

Um donut zerado desenhado sobre um `null` afirmaria **"ninguém pagou"** quando a verdade é
**"ninguém somou"**. O `?? []` que colapsaria os dois é a linha mais tentadora do diff inteiro, e é
por isso que existe teste dedicado para cada um dos três estados: quem colapsar dois deles reprova
em `FormasDePagamento.test.tsx` antes de a tela chegar ao dono.

A consolidação por organizador é **deliberadamente pessimista**: se qualquer evento **com receita**
não carrega a série, o consolidado inteiro vira `null`. Somar só os que sabem devolveria uma rosca
que parece completa sendo parte, e o organizador não teria instrumento nenhum para desconfiar dela.

Evento **sem** receita e sem série não estraga a cobertura — ele não tinha o que contribuir.

## 3 · O que o donut mostra com o seed do mock

⚠️ **Estes números NÃO vêm do emulador** (ver seção 6). Vêm da re-execução determinística da
aritmética do próprio `mock-campeche-seed.ts` — as 17 definições de pedido, os preços por
modalidade, a regra de status por índice. É a mesma conta que o seed faria; não é prova de que o
Firestore a executou.

**Rosca "Formas de pagamento" · `[Mock] - Campeche Run`**

| Fatia | Vendas | Valor | % |
|---|---|---|---|
| Cartão de crédito | 5 | R$ 1.040 | 41,6% |
| Pix | 5 | R$ 1.460 | 58,4% |
| **Centro** | **10** | **R$ 2.500** | |

**E a nota de cobertura acende, com força:** a `receitaConfirmada` do evento no seed é **R$ 50.560**.
A série cobre **4,9%** disso.

Não é defeito da série — é retrato do seed: ele escreve **17 cobranças para 304 inscritos
confirmados**. A receita nasce de `Σ preço × inscrito confirmado`; a série só enxerga venda que tem
doc de pagamento.

**Isso validou a nota de cobertura de forma que nenhum teste sintético teria validado.** Sem ela, o
dono abriria a Visão geral e leria "R$ 2.500" numa rosca ao lado de "R$ 50.560" de receita
confirmada, na mesma dobra, e concluiria — com toda a razão — que sumiu dinheiro. Com ela, lê:

> *A rosca cobre R$ 2.500 dos R$ 50.560 confirmados. O resto veio de inscrições sem cobrança
> registrada, que não têm forma de pagamento para somar.*

A mesma forma aparece em **qualquer base com venda anterior ao doc de pagamento**. O mock só a
exagera.

## 4 · O alvo secundário coube — e o registro dele estava errado

O painel do dono registrou "pendências em R$" como *"o laço já varre os pendentes, falta somar"*.

**Não era verdade, e vale corrigir no registro.** A varredura de pendentes que existe é a do
`aggregateProfessionalDashboard`, e ela varre **inscritos** — que, por decisão de arquitetura
(`inscrito.ts` §*"[pag] NUNCA se denormaliza"*), **não carregam centavo nenhum**. Somar ali era
impossível sem join.

Ficou barato por outro motivo: **esta lane já mora na coleção onde o dinheiro está.** Uma segunda
query equality-only sobre `pagamentos` (`eventoId` + `status == 'pendente'`), no mesmo snapshot da
transação, servida pelo mesmo merge de índices single-field — sem índice novo.

`eventos/{id}/financeiro/current.pendentes = { qtd, valor }`.

**Duas escolhas de denominador, explícitas:**

1. **Conta cobranças, não pessoas.** O alerta de pendências conta inscritos pendentes há mais de
   24h; este número conta pagamentos pendentes. Um pedido de três pessoas é **uma** cobrança e
   **três** inscritos. Casar os dois numa frase só ("N pendentes, R$ X") repetiria em miniatura o
   erro do funil que fechava em inscrito (D-1008-R19). No mock: **19 inscritos pendentes** e
   **3 cobranças · R$ 500**. Os dois números estão certos e são diferentes.
2. **Sem o corte de 24h.** Ele exigiria índice composto (`eventoId` + `status` + `criadoEm`) e
   responde outra pergunta: *"quanto está parado"* é caixa, *"o que já passou do prazo"* é operação.

⛔ **Nenhuma tela mudou por causa disto.** O campo é publicado; **qual leitura entra na Visão geral e
em que ordem segue sendo VG-INSIGHTS-3, decisão do dono.** O que esta lane fez foi tirar "trava é
deploy" da frente: o dado passa a existir, e a escolha dele deixa de esbarrar em construção.

## 5 · O que mudou na tela

`OverviewContent.tsx:210` deixou de montar `EmBreveV3` e passou a montar `FormasDePagamento`, que
decide entre os três estados **lá dentro** — onde a distinção não tem como se perder por alguém
montar o bloco de outro lugar.

- Reusa o **`DonutChart` do DS** (recharts, ADR-010), o mesmo da Análise de vendas. Nenhum gráfico
  novo, nenhuma linha em `packages/design-system`.
- Rótulos vêm do core (`ROTULO_FORMA_PAGAMENTO`), para a Visão geral, a Análise e o Financeiro do
  evento escreverem a mesma palavra.
- O texto do "em breve" mudou de tempo verbal, e só. A causa antiga (*"a inscrição não carrega a
  forma no retorno do resumo"*) descrevia uma dependência que **deixou de existir**; mantê-la seria
  prometer construção já construída.

**Efeito colateral de graça:** `overviewDoFinanceiro` (CRM › Visão geral) mapeia o `financeiro/current`
de um evento para o mesmo contrato, então **a Análise de vendas herda a série por evento** sem
nenhuma linha de tela adicional. Quem quiser a rosca por evento monta o mesmo componente.

## 6 · Gates — números reais

Rodados em fatias seriais, no worktree próprio, **duas vezes**: antes e depois de trazer a `main`
(a lane INSCRITOS-READ-FIX aterrissou no meio e mexeu no `mock-campeche-seed.ts`). Os números
abaixo são os da árvore **já mesclada**.

| Gate | Resultado |
|---|---|
| `tsc --noEmit` core | **0 erros** |
| `tsc --noEmit` functions | **0 erros** |
| `tsc --noEmit` painel | **0 erros** |
| `eslint --max-warnings 0` (core · api-client · functions · painel) | **0 erros** |
| Suíte painel COMPLETA | **262 arquivos · 3.034 testes · 3.034 passando** |
| Functions, arquivos sem emulador (103 de 227) | **2.193 passando · 1 skipped · 3 falhando** |
| `gate-canon` | **PASS** — 23 contadores, todos no baseline |
| `vite build` painel | ver seção 8 |

**Os 3 que falham não são desta lane.** São `platformAdminSeed.test.ts`, e o erro é o guard do
próprio seed: *"BLOQUEADO: seedPlatformAdmin só roda no Emulator. Defina
`FIREBASE_AUTH_EMULATOR_HOST`"*. Ambiente, não regressão — a lane não toca Auth nem platform admin.

### ⛔ O emulador NÃO rodou, e a tentativa está registrada

O brief pedia prova ponta a ponta no emulador do mock (`demo-leela`, Firestore 8280). **Foi
tentado, e falhou por ambiente**, com a mensagem sem retoque:

```
Error: firebase-tools no longer supports Java version before 21.
Please install a JDK at version 21 or above to get a compatible runtime.
```

`java -version` → `openjdk 17.0.19`. `firebase-tools` 15.22.4. Mesmo bloqueio que a MODALIDADE e a
SERV1-BUILD declararam.

**Consequências, sem maquiagem:**

- Os **8 casos de integração** novos em `financeiroEvento.integration.test.ts` estão **escritos e
  não executados nesta máquina**. Rodam no CI, que provisiona Java 21. Nenhum deles é reportado como
  passando aqui.
- A prova ponta a ponta com o seed **não aconteceu**. Os números da seção 3 são derivação da
  aritmética do seed, e estão rotulados como tal.
- **Nenhum pass falso foi declarado.**

Os 8 casos de integração cobrem: soma por forma só de confirmados · estorno parcial descontando do
valor e mantendo a venda na contagem · série completa e ordenada sem venda nenhuma · pagamento de
outro tenant fora do Σ (ADR-009) · forma fora do enum ignorada sem derrubar o agregado ·
idempotência do reprocesso · pendências contando cobranças e não inscritos · pendências zeradas
presentes em vez de ausentes.

## 7 · O que o deploy destrava

Nada disto está no ar. Ao subir o pacote com `functions/`:

1. **A rosca acende na Visão geral.** Até lá, `formasPagamento` chega `null` e o bloco mantém o "em
   breve" — a degradação é o estado natural do intervalo, não um caso de exceção.
2. **A 2ª opção do CAIXA-1 sai de "bloqueada por dado".** É o efeito colateral que o épico já
   registrava, e vale o dono saber disso **antes** de responder o CAIXA-1.
3. **VG-INSIGHTS-3 perde a trava técnica** da opção "pendências em R$". A escolha continua dele.
4. **A Análise de vendas do CRM** ganha a série por evento pelo mesmo doc.
5. **O snapshot diário** passa a guardar a série — é onde "série financeira" vira série de verdade,
   uma leitura por dia civil, e o que abre caminho para S821/S822.

### ⛔ O reprocesso anda JUNTO com o deploy

`reprocessarFinanceiroTodosEventos` (`functions/src/eventos/agregarFinanceiro.ts`), no molde que a
RN-822 fixou para a demografia.

**Não é conveniência.** O gatilho desta Function é o write de inscrito. Sem reprocesso, o
`financeiro/current` de um evento que **já encerrou as inscrições** nunca ganha a série — e evento
encerrado é exatamente aquele cuja rosca o organizador quer olhar. Pior: como a consolidação é
pessimista, **um** evento encerrado com receita e sem série mantém a Visão geral inteira no "em
breve". O sintoma de esquecer este passo não é número errado; é a tela do dono continuar prometendo
o que o deploy já entregou.

Runbook, com credencial do projeto, **depois** do deploy:

```js
const { reprocessarFinanceiroTodosEventos } =
  require('./lib/functions/src/eventos/agregarFinanceiro');
await reprocessarFinanceiroTodosEventos(admin.firestore());
```

Idempotente por construção (full recompute transacional), sequencial de propósito.

**Sem cron novo.** A janela 03:00-03:20 SP não foi tocada — a série não precisa de agendamento
porque nasce no gatilho que já existia.

**Sem índice novo.** Todas as queries são equality-only, servidas por merge de índices single-field,
no precedente que `agregarFinanceiro` e `updateSaldoRepasse` já documentam.

**Sem RN.** O épico declara *"não consome RN"* e a construção não pediu exceção. Faixa 578+
conferida por grep antes de começar: **zero definições** entre RN-578 e RN-583 — os retornos são
prosa de varreduras anteriores. **A próxima livre segue 578.**

## 8 · Telas para o gate visual do maestro

⛔ **Nenhuma tela foi vista renderizada nesta lane.** O gate visual continua **aberto** e é
obrigatório antes de qualquer "no ar" (a rosca é superfície que ninguém nunca viu com número de
verdade — o próprio épico já a marcava como entrada com gate visual).

Para conferir, é preciso **navegador** e o emulador do mock — que exige **JDK 21**, hoje ausente.
Instalar o JDK 21 é o pré-requisito de todo o gate visual desta lane.

**Os três estados, cada um com o seu ensaio:**

| # | Tela | Como chegar | O que tem que estar lá |
|---|---|---|---|
| 1 | Visão geral · rosca acesa | mock-campeche no ar, após reprocesso | Rosca com 2 fatias, centro **R$ 2.500**, "10 vendas confirmadas", legenda Cartão 41,6% / Pix 58,4% **e a nota de cobertura citando R$ 50.560** |
| 2 | Visão geral · "em breve" | mesma tela **antes** do reprocesso | Card "Em breve" — **nunca** rosca zerada |
| 3 | Visão geral · vazio honesto | organizador sem venda confirmada | "Nenhuma venda confirmada ainda" — **sem** a palavra "breve" |

**O que olhar com cuidado no #1:** contraste das duas cores categóricas nas variantes de tema
(`--chart-cat-1`/`--chart-cat-2`), o número do centro não estourando o anel em 180px, e se a nota de
cobertura **cabe** sem empurrar a coluna — ela é o texto mais longo que já entrou nesse cartão.

**A pergunta honesta para o dono no #1:** com 4,9% de cobertura, a nota é suficiente ou a rosca
deveria se recusar a desenhar abaixo de algum piso? O código de hoje desenha e explica. É uma
escolha, e é vetável.

## 9 · Commits

| Hash | O quê |
|---|---|
| `13b74269` | a série nasce no agregado do evento (core + functions + snapshot) |
| `1a42f4d4` | a rosca sai do em-breve (painel + api-client + testes) |
| `61428083` | épico, boards e o painel do dono |
| `8340edec` | `main` mesclada + números do seed refeitos |

Todos com sufixo `[serie-financeira-20260817]`.

🏁 **Merge na `main`: `8340edec`**, fast-forward sobre `603f578b` (a INSCRITOS-READ-FIX), com a
árvore principal limpa como pré-condição conferida no ato. `main == origin/main`. ⛔ **Zero deploy:
produção segue no pino `a1df3b88`.**

O worktree `C:\dev\leela-wt-seriefin` e a branch `serie-financeira` ficaram de pé — quem for fazer o
gate visual precisa deles menos do que precisa de um JDK 21, mas remover agora não economiza nada.

## 10 · Fila nomeada — o que esta lane NÃO fez

1. **Gate visual das 3 telas** — bloqueado por JDK 21. É a pendência #1.
2. **Prova no emulador do mock** — mesma trava.
3. **A rosca por evento na Análise do CRM** — o dado chega pelo `financeiro/current`, o componente
   existe e é reutilizável; falta alguém decidir que ela entra ali e onde.
4. **VG-INSIGHTS-3** — segue com o dono. O que mudou é que "pendências em R$" não é mais opção
   bloqueada por construção.
5. **Piso de cobertura** — hoje a rosca desenha e explica em qualquer cobertura. Se o dono quiser um
   piso abaixo do qual ela se recusa a desenhar, é uma constante e um `if`.
