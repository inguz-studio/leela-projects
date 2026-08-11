---
trace: leela-redesign-v2-20260810
lane: METRICAS-PAGANTES-BACKEND (leva 5 · D-1008-R19 · E03·S221 + E09·S908-T4)
alvo: repo main (`C:\dev\LEELA`), branch main · base 5a952bc1 → c0245e68
data: 2026-08-11
estado: CONCLUÍDA — 2 consertos pagos (+1 hardening) em 4 commits; varredura de
  41 derivações em functions/src + packages/core/src; suíte completa 4367
  verdes com só os 18 vermelhos AMBIENTAIS conhecidos; ZERO deploy; backfill do
  GMV DECLARADO e NÃO executado
---

# METRICAS-PAGANTES-BACKEND · handoff vivo

Contrato: `.nirvana/briefs/leela-metricas-pagantes-backend-enriched.md`.
Decisão-fonte: **D-1008-R19** (leva 5) em
`leela-specs/02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md`.
Lane-irmã: `.nirvana/handoffs/leela-metricas-pagantes-painel.md` (24 superfícies).

Régua, nas palavras do dono: *"ticket médio é só por clientes que pagaram, e
nao pagamentos emitidos(pendentes + pagos)"* → métrica de dinheiro conta
**cliente PAGANTE**; o funil fecha em pagante; emissão pendente e inscrito
nunca entram no denominador.

Disciplina cumprida: `git commit --only` por conserto; push a cada 2; suítes em
FOREGROUND e em série; emuladores 8080/9099 (PIDs 25452/26412) **reusados e
deixados de pé**; `pnpm-workspace.yaml` modificado por outra lane INTOCADO;
⛔ NENHUM deploy.

---

## Método da varredura

Três passadas sobre `functions/src` + `packages/core/src`, fora de testes:

1. **Vocabulário de dinheiro** — `receita|ticket|gmv|ltv|faturamento|conversao|
   valorGasto|valorAtribuido|comissao|taxa` (74 arquivos, triados a olho até
   os 28 que realmente derivam número).
2. **Toda divisão** (`x / y`) — é onde mora denominador, e denominador errado é
   a classe de defeito que a R19 mata. Resultado abaixo.
3. **Todo filtro por status** (`where('status', …)`) — é onde mora recorte, e
   recorte frouxo é a outra metade do mesmo defeito.

**Achado estrutural da passada 2:** em `functions/src` **não existe uma única
divisão de métrica** — todo número de dinheiro do servidor é soma, taxa por
transação ou contagem. Em `packages/core/src` existem 4 divisões que são
métrica (não aritmética de taxa/parcela/rateio): `ocupacaoDoEvento`,
`derivarTrendPct`, `derivarTaxaConversao` e a média de pontuação de clube
(`atleta/registro.ts`, sem dinheiro). **Uma única delas divide gente por
gente: `derivarTaxaConversao` — e era a que estava errada.** O ticket médio,
por sinal, não existe no backend: a única divisão de dinheiro do sistema
inteiro era a do painel, que a lane-irmã consertou.

---

## Tabela função → métrica → veredito

### `functions/src`

| # | Função (arquivo) | Métrica que produz | Recorte encontrado | Veredito |
|---|---|---|---|---|
| 1 | `derivarKpis` via `recomputeProfessionalDashboard` (`overview/aggregateProfessionalDashboard.ts`) | **taxa de conversão** do profissional | passava `Σ qtdInscritos` (todos os status) | **VIOLAVA → CONSERTADO (C1)** |
| 2 | `recomputeProfessionalDashboard` (idem) | `receitaConfirmada` (Σ dos eventos) | ∑ canônico já líquido de estorno | CONFORME |
| 3 | `recomputeProfessionalDashboard` (idem) | `inscricoesTotais`, `vagasRestantes`, `eventoEmRisco`, trends | contagem de gente na lista, rótulo honesto | CONFORME — e agora **separada** de `pagantes` no contrato |
| 4 | `resolverPagantes` (idem) — **NOVA** | clientes pagantes por evento | `count()` sobre `STATUS_PAGANTE` | CONFORME (nasce certa) |
| 5 | `getOverviewCore` (`overview/getOverview.ts`) | — | só serve/recomputa o doc; zero aritmética | CONFORME |
| 6 | `coletarSnapshotsDiariosCore` (`analytics/coletaDiaria.ts`) | snapshot diário dos KPIs | cópia campo a campo, zero recálculo | CONFORME — herda #1 já consertado |
| 7 | `recomputarFinanceiroEvento` (`eventos/agregarFinanceiro.ts`) | `receitaBruta` do evento | espelho de `receitaConfirmada` | CONFORME |
| 8 | `computeFinanceiro` (idem) | `taxaValor`, `receitaLiquida` | híbrido carimbo TAXAFLEX + % do termo; sem termo ⇒ triple null | CONFORME — sem denominador de gente |
| 9 | `contarInscritos` (idem) | `inscritos.porStatus/porKit/porModalidade` | contagem rotulada pelo próprio status | CONFORME — é a fonte que a lane-irmã usou p/ o ticket |
| 10 | `recomputePlatformRollupsCore` (`platform/rollups.ts`) | `gmvTotal`, `receitaLeelaTotal`, `receitaLeela` por tenant | Σ de `gmvAcumulado` + `computeTaxa` do termo de cada tenant (RN-406) | CONFORME à R19 · **lia campo sem escritor → ver C2** |
| 11 | `deriveTenantHealth` via #10 | saúde do tenant | lia `eventosAtivos` sem escritor | **VIOLAVA (número inexistente exibido) → CONSERTADO (C2)** |
| 12 | `recomputarSaudeTenant` (`platform/agregarSaudeTenant.ts`) — **NOVA** | `gmvAcumulado`, `eventosAtivos` | Σ `receitaConfirmada` + contagem `eventoPublico` | CONFORME (nasce certa) |
| 13 | `processarWebhookPagamento` (`checkout/webhookPagamento.ts`) | `eventos.receitaConfirmada` (+valorFinal) | só na confirmação, sob ledger + guarda de estado | CONFORME — exactly-once, cent-exato |
| 14 | idem | `afiliado.conversoes` / `valorAtribuido` / `comissaoAcumulada` | incrementa só em pagamento CONFIRMADO | CONFORME |
| 15 | idem | `cupom.usos` | 1 por pedido confirmado | CONFORME — contagem de uso, não de venda |
| 16 | `estornarInscricaoCore` (`checkout/estornarInscricao.ts`) | reversão de `receitaConfirmada` (−face) + `estornadoTotal` | espelha exatamente o que o webhook somou | CONFORME — é o que torna a receita LÍQUIDA |
| 17 | idem | decremento de conversão/comissão do afiliado | pela config CONGELADA na conversão | CONFORME |
| 18 | `computeCrmCliente` via `agregarClientes.ts` | `ltv`, `valorGasto`, `qtdEventos`, `qtdInscricoes` | só `status === 'confirmado'`; estornada fica no histórico e fora do dinheiro | CONFORME — **precedente que sustenta o TICKET-1** |
| 19 | `agregarDemografia.ts` | faixa etária / sexo / cohort de compradores | query `status == 'confirmado'` | CONFORME — "comprador" é comprador |
| 20 | `agregarEstoque.ts` | `vendidoPorSku` (kit/tamanho) | `status == 'confirmado'` | CONFORME — estoque físico volta na devolução |
| 21 | `virarLote.ts` | `vendidos` por lote | `STATUS_QUE_CONTAM_VENDA` (confirmado+estornado) | CONFORME — **vaga de lote é estoque, não caixa** (ver nota de assimetria) |
| 22 | `onConversao.ts` (`clubs/`) | `conversoes`, `valorAReceber` da parceria | recontagem `count()`+`sum()` sobre a subcoleção | CONFORME |
| 23 | `lerInputsSaldoRepasse` (`finance/updateSaldoRepasse.ts`) | saldo disponível / janela D+N | `pagamentos status == 'confirmado'` com `pagoEm` e `valorFinal > 0` | CONFORME |
| 24 | `listarClientesDoTenant.ts` | projeção de `ltv`/`valorGasto` do CRM | repassa #18, não recalcula | CONFORME |
| 25 | `affiliation/readers.ts`, `registrarRepasse.ts` | leitura/repasse de comissão | valor de transação, sem denominador | CONFORME |

### `packages/core/src`

| # | Função (arquivo) | Métrica que produz | Recorte encontrado | Veredito |
|---|---|---|---|---|
| 26 | `derivarTaxaConversao` (`overview/kpis.ts:225`) | **taxa de conversão (%)** | parâmetro chamado `confirmadas`, alimentado com o total | **VIOLAVA → CONSERTADO (C1)** |
| 27 | `derivarKpis` (idem) | KPIs consolidados | ver #1/#3 | **VIOLAVA → CONSERTADO (C1)** |
| 28 | `ocupacaoDoEvento` / `vagasRestantesDoEvento` / `emEsgotamento` (idem) | ocupação e vagas | divide inscritos por capacidade | CONFORME — **vaga é ocupada por pendente também**; aqui o total é o número certo |
| 29 | `derivarTrendPct` (idem) | variação % entre janelas | inscrições/inscrições, sem base ⇒ null | CONFORME — contagem, rótulo honesto |
| 30 | `montarSnapshot` (`analytics/snapshot.ts`) | snapshot diário | cópia campo a campo | CONFORME |
| 31 | `deriveTenantHealth` (`platform/rollups.ts`) | saúde do tenant | pura; o input é que estava zerado | CONFORME (a função) · input consertado em C2 |
| 32 | `computeTaxa` / `computeLiquidoProdutor` / `roundMoney` (`finance/calc.ts`) | taxa e líquido | % sobre valor de face | CONFORME |
| 33 | `computeTaxaPlataforma` / `taxaMeioParaBp` (`finance/taxaPlataforma.ts`) | taxa carimbada por meio | centavos × basis points | CONFORME |
| 34 | `computeAntecipacao` (`finance/repasse.ts`) | % de antecipação sobre líquido | valor de transação | CONFORME |
| 35 | `computeCrmCliente` (`crm/cliente.ts`) | `ltv`/`valorGasto` | ver #18 | CONFORME |
| 36 | `computeComissaoConversao` / `saldoComissaoAfiliado` (`affiliation/afiliado.ts`) | comissão e saldo | cent-exato; saldo pode ficar negativo e MOSTRA isso | CONFORME |
| 37 | `marcoComissao.ts` | marco de comissão atingido | piso sobre acumulado | CONFORME |
| 38 | `pedidos/pedido.ts` (rateio de desconto e taxa) | valor por linha | rateio proporcional cent-exato com sobra alocada | CONFORME |
| 39 | `eventos/cupom.ts` | desconto | % ou valor sobre a base | CONFORME |
| 40 | `eventos/faixaChips.ts` | `quaseEsgotado` | disponíveis/total (estoque) | CONFORME |
| 41 | `atleta/registro.ts`, `clubs/pontuacao.ts` | médias de pontuação de clube | sem dinheiro, sem venda | FORA DE ESCOPO (registrado por completude da varredura) |

**Contagem:** 41 derivações auditadas · **3 violavam** (#1/#26/#27 são o mesmo
defeito visto de três ângulos, #11 é o segundo) · **38 conformes** ·
**2 consertos pagos**.

---

## C1 · O funil fecha em PAGANTE — commit `e1191818`

### Root cause

`derivarKpis` chamava `derivarTaxaConversao(inscricoesTotais, visitas)` —
enquanto o docstring da própria função dizia *"confirmadas / visitas"*.
`inscricoesTotais` é `Σ eventos.qtdInscritos`, que soma **pendente + cancelado
+ estornado** junto com quem pagou. Três cards do painel herdam a conta (VG v3
KpiRow, `/crm/visao-geral` Análise, Overview do evento) — a lane-irmã já os
mapeou como violações latentes #3/#9/#12.

Latente, não mentindo hoje: em produção `visitas` é sempre `null` ⇒
`taxaConversaoPct = null` ⇒ a UI mostra `"—"`. O conserto é para que o dia em
que o E12 entregar visitas a conta **já nasça certa** em vez de estrear
mentindo.

### Conserto

| Onde | O quê |
|---|---|
| `core/eventos/inscrito.ts` | `STATUS_PAGANTE` + `isStatusPagante` — **régua única** da casa para "pagou"; o vetável TICKET-1 do dono passa a morar numa linha só |
| `core/overview/kpis.ts` | `EventoKpiInput.pagantes` **separado** de `qtdInscritos`; `derivarKpis` soma `pagantesTotais`; `derivarTaxaConversao(pagantes, visitas)` |
| `functions/overview/aggregateProfessionalDashboard.ts` | `resolverPagantes(eventoRef)` — `count()` sobre `status in STATUS_PAGANTE`, no MESMO índice single-field que a query de pendentes já usava (**nenhum índice novo**), dentro do `Promise.all` que já existia |

Separar os dois campos é o que torna o conserto estrutural: `qtdInscritos`
continua sendo contagem de verdade (alimenta vaga/ocupação/risco, onde o
pendente ocupa lugar mesmo), e `pagantes` é o único campo que métrica de
dinheiro e funil enxergam. Colapsados, voltariam a se confundir por descuido.

**Por que recontar da fonte e não ler `financeiro/current.inscritos.porStatus`
(que já existe):** o agregado do evento é espelho mantido por outro gatilho; o
numerador do funil herdaria a defasagem dele. O `count()` custa o mesmo e lê a
verdade.

### Falsificação executada — duas camadas

Core (`derivarTaxaConversao(inscricoesTotais, …)` de volta):

| Cenário | Esperado | Régua antiga cospe |
|---|---|---|
| 400 pagantes · 300 boletos parados · 100 canceladas / 2.000 visitas | **20,0%** | **40,0%** (o dobro) |
| 100 pagantes de 500 inscritos / 2.000 visitas | **5,0%** | **25,0%** |
| 0 pagantes · 300 emissões / 2.000 visitas | **0%** | **15,0%** de conversão num evento que não vendeu nada |
| 3 eventos: 700 pagantes de 1.284 inscritos / 2.000 visitas | **35,0%** | **64,2%** |

Servidor (`resolverPagantes` sem o recorte): **10 vs 4** pagantes com
4 confirmado + 3 pendente + 2 cancelado + 1 estornado; **7 vs 0** num evento só
com emissões pendentes.

Fix restaurado e reverificado verde: `overviewKpis` **24/24**,
`overviewDashboard` **14/14**.

---

## C2 · `tenants.gmvAcumulado` e `eventosAtivos` ganham escritor — commit `30084e5a`

### Root cause (confirma e amplia o achado da lane-irmã)

`provisionTenant.ts:387-388` cria os dois campos em `0` e **nenhuma Function os
escreve** — varredura completa: só o provisionamento, os seeds e a LEITURA
(`platform/rollups.ts:104-105`) tocam os campos.

Consequência, medida no próprio teste: um tenant com R$ 1.000 vendidos fazia
`/plataforma/macro` exibir **GMV total R$ 0,00 e Receita Leela total R$ 0,00**
(`receitaLeela = computeTaxa(gmv, fee)` herda o zero), e `/plataforma/tenants`
mostrava GMV zerado por tenant.

**Achado NOVO desta lane (mesma classe, ninguém tinha visto): `eventosAtivos`
também não tem escritor.** `deriveTenantHealth(status, 0)` devolve `'atencao'`
— *"conta operável mas parada"* — para **todo tenant ativo, com evento no ar ou
não**, e a coluna "Eventos" do macro mostra 0. Consertado no mesmo escritor
(mesmo doc, mesmo gatilho, mesma varredura: quatro linhas a mais).

### Definição adotada (com condição de reabertura)

`gmvAcumulado` = **Σ `eventos.receitaConfirmada` do tenant** — a mesma base que
o organizador vê em `financeiro/current.receitaBruta`. É o que o cânone já
dizia: E16 documenta o campo como *"receita bruta confirmada acumulada"* e a
spec ADMIN-VISAO V-1 como *"valor de face confirmado do tenant"*.

Já é **líquida de reembolso por construção** (o estorno reverte o face em
`receitaConfirmada`), e o teste pina isso: 1.000 → 750 após estorno. Qualquer
outra definição (GMV bruto monotônico, "tudo que já passou") faria o macro do
admin discordar da tela do produtor sobre o mesmo dinheiro.

### Desenho do escritor

- **Onde engancha:** `onWrite` de `eventos/{eventoId}` — é exatamente onde o
  efeito da venda aterrissa (`receitaConfirmada` pelo webhook e pelo estorno;
  `status` por publicar/despublicar). Mesmo formato do vizinho
  `onEventoWriteDashboard`.
- **Idempotência:** recomputação **FULL** a partir da fonte
  (`eventos where tenantId == …` com `select()` projetando dois campos), grava
  **só quando difere** — o no-op deixa `atualizadoEm` intocado, que é como a
  idempotência se prova de fora. Rodar N vezes = mesmo doc.
- **Snapshot-consistente:** leitura do tenant, varredura dos eventos e escrita
  numa **única transação**. Sem isso, dois writes de eventos do mesmo tenant em
  corrida podiam persistir o agregado do snapshot mais VELHO, e ele ficaria de
  pé até o próximo write. É literalmente o defeito que a review Onda1 #07 achou
  em `agregarFinanceiro` — a casa já pagou por essa lição uma vez, e este
  agregado nasce do lado certo dela. Mesmo formato do
  `lerInputsSaldoRepasse`, que já lê essa mesma query dentro de transação.
- **Migração de tenant:** recomputa `before ∪ after` do `tenantId` — o GMV não
  fica preso no tenant errado.
- **Sem loop:** `tenants/{tid}` não tem gatilho algum (verificado: zero
  `document('tenants/{tenantId}')` em `functions/src`).
- **Borda:** `tenantId` órfão devolve `null` e **não cria** doc de tenant por
  efeito colateral; `receitaConfirmada` ausente/lixo conta 0 (nunca NaN no ∑).

**Rejeitado — incrementar dentro da transação do `webhookPagamento`:** toda
confirmação de pagamento do tenant passaria a escrever no MESMO documento
DENTRO da transação de dinheiro. Numa abertura de vendas isso serializa o
checkout inteiro do tenant num único doc (~1 escrita/s por documento) — o
agregado de um dashboard de preço derrubaria a venda. E exigiria abrir três
transações de dinheiro já seladas (webhook, estorno de inscrição, estorno de
órfão) por um campo que nenhuma delas precisa ler.

**Rejeitado — dobrar o recompute dentro do cron horário dos rollups:** o campo
é lido **cru** por `/plataforma/tenants`, que ficaria até 1h velho sem nenhum
indicador de idade na tela.

⚠️ **Condição de reabertura registrada no código:** se um tenant passar a
sustentar ~1 write de evento por segundo, este desenho vira gargalo — a saída é
agregação por janela ou contador shardado, **não** increment na transação de
pagamento.

### ⛔ BACKFILL — passo SEPARADO, NÃO executado nesta lane

O gatilho corrige **daqui para a frente**: todo evento que receber qualquer
write recomputa o tenant dele. Tenant cujos eventos fiquem parados mantém o `0`
histórico até o backfill rodar.

`recomputarSaudeDeTodosOsTenants(db)` existe em
`functions/src/platform/agregarSaudeTenant.ts`, está **testada** (corrige N
tenants zerados e é re-executável sem reescrever nada), e **não é chamada por
gatilho, cron ou callable algum**. Executá-la é da fase de deploy, com os gates
dela. É idempotente e segura para rodar duas vezes.

### Falsificação executada — duas rodadas

| Sabotagem | O que quebrou |
|---|---|
| acumular sobre o valor persistido em vez de recomputar | estorno: **1.750 vs 750**; 2ª rodada volta a escrever (idempotência morta); backfill reescreve tudo |
| remover o filtro `tenantId` | **1.000.999 vs 1.000** — GMV do vizinho vazando para o tenant |

Fix restaurado e reverificado verde: `saudeTenant` **10/10**,
`platformRollups` **8/8** (intacta).

---

## ⛔ TICKET-1 — ocorrências registradas (a palavra final é do dono)

O brief manda **aplicar** o critério da lane-irmã (estornado FORA do
denominador de métrica de dinheiro) onde couber e **registrar** cada
ocorrência. Onde ele coube nesta lane:

| Onde | Aplicado? | Consequência se o dono vetar |
|---|---|---|
| `STATUS_PAGANTE` (core) — régua do funil e de toda métrica de dinheiro do servidor | **SIM** — `['confirmado']` | **uma linha** em `core/eventos/inscrito.ts` + o teste que a pina (`STATUS_PAGANTE é a régua única…`); nenhum consumidor re-deriva |
| `computeCrmCliente` — `ltv`/`valorGasto` | já era assim **antes** desta lane (E19) | é o precedente que sustenta o critério: *"o dinheiro voltou"* |
| `gmvAcumulado` do tenant | **SIM, por herança** — Σ `receitaConfirmada`, que o estorno já reverte | nenhuma mudança de código: o veto do TICKET-1 é sobre DENOMINADOR (contagem de gente), e aqui não há denominador |
| `virarLote` — `STATUS_QUE_CONTAM_VENDA` (confirmado+estornado) | **NÃO aplicado, deliberado** | é **vaga de lote = estoque**, não caixa: a inscrição estornada consumiu um lugar. Régua diferente, e correta como está |
| `agregarEstoque` — `vendidoPorSku` | **NÃO aplicado, deliberado** | estoque FÍSICO: a camiseta volta para a prateleira quando o dinheiro volta — por isso conta só `confirmado` |

**Assimetria registrada (não é defeito, é para o dono saber que existe):**
`virarLote` conta o estornado como vaga consumida; `agregarEstoque` não conta o
estornado como camiseta vendida. As duas estão certas pelas suas próprias
réguas (lugar no lote × item físico), mas um dia alguém vai perguntar por que o
lote diz 100 vendidos e o kit diz 98. A resposta está aqui.

---

## Gates (números reais)

| Gate | Resultado |
|---|---|
| `overviewKpis` (unit puro) | **24/24** ✔ (18 antes + 6 novos) |
| `overviewDashboard` (integração Emulator) | **14/14** ✔ (10 antes + 4 novos) |
| `saudeTenant` (integração Emulator · NOVA) | **10/10** ✔ |
| `platformRollups` (integração Emulator) | **8/8** ✔ intacta |
| Grupo do território (10 arquivos: overview\*, platform\*, tenant\*, analytics\*, dashboardRules) | **139/139** ✔ exit 0 |
| Falsificação C1 · core | 4 casos VERMELHOS com os números inflados exatos ✔ |
| Falsificação C1 · servidor | 2 casos VERMELHOS (10 vs 4 · 7 vs 0) ✔ |
| Falsificação C2 · acumular | 3 casos VERMELHOS (1.750 vs 750 · idempotência · backfill) ✔ |
| Falsificação C2 · sem filtro de tenant | 2 casos VERMELHOS (1.000.999 vs 1.000) ✔ |
| `tsc --noEmit` functions | exit 0 ✔ |
| `eslint src --max-warnings 0` functions | exit 0 ✔ |
| `tsc --noEmit` core | exit 0 ✔ |
| `eslint src --max-warnings 0` core | exit 0 ✔ |
| **Suíte COMPLETA de functions** (246 arquivos · 21min12s) | **4367 passaram · 142 pulados · 18 vermelhos** — **exatamente os 18 AMBIENTAIS conhecidos** que o brief declarou (portas dedicadas que não sobem em `vitest run` cru; a amostra visível é toda de `revContasMotor.antagonista`, classe auth/pepper). **Zero vermelho novo**; os 4 arquivos do território rodaram verdes isolados antes e depois |
| Re-gate do território após a transação | **139/139** ✔ em 10 arquivos |

---

## Commits da lane

- `e1191818` — C1 · o funil fecha em cliente pagante (6 arquivos, +292/−25)
- `30084e5a` — C2 · escritor de `gmvAcumulado` + `eventosAtivos` (3 arquivos, +485)
- `480d7681` — aterrissagem nos boards (E11·S824-T2 paga, E03·S221-T2 fechada,
  E09·S908-T4 com a resposta do `Not-tested`, E16·S1605-T2 com o elo que
  faltava, card novo S1613-T3b) + este handoff (6 arquivos, +432/−10)
- `c0245e68` — C2b · o recompute da saúde do tenant fica snapshot-consistente
  (1 arquivo, +47/−36)

PUSHED em `main` (`5a952bc1..480d7681`; `c0245e68` a empurrar no fecho).
**NENHUM deploy.**

---

## Para a fase de deploy (declarado, não executado)

1. **Functions novas a subir:** `onEventoWriteSaudeTenant` (gatilho v1 onWrite
   em `eventos/{eventoId}`). Nenhuma Rule muda; nenhum índice novo.
2. **⛔ Backfill do GMV, DEPOIS do deploy:** executar
   `recomputarSaudeDeTodosOsTenants(admin.firestore())` uma vez. Idempotente e
   re-executável. Sem ele, tenants sem write de evento seguem com GMV 0.
3. Conferência de tela sugerida (gate visual da fase): `/plataforma/macro` e
   `/plataforma/tenants` — GMV total deixa de ser R$ 0,00 e o Castelo deixa de
   aparecer como `atencao`.

## Fila / achados novos

1. **`eventosAtivos` sem escritor** — ACHADO NOVO, consertado em C2 (não estava
   no brief nem no handoff da lane-irmã).
2. **`gmvViaParcerias` / `conversoesViaLink`** — declarados FORA do
   `AnalyticsSnapshot` até o E12 dar atribuição (corte registrado no brief
   T2-L1, não é dívida escondida).
3. **Rótulo "visitantes → inscritos"** segue intocado no painel, de propósito:
   conta e rótulo mudam no MESMO commit, quando a fonte de visitas existir. Aí a
   palavra vira "pagantes" e ela passa a ser verdade.
4. **`taxaConversaoPct` com visitas reais nunca foi exercitada** — o E12 não
   existe; produção segue `null` → `"—"`. `Not-tested` declarado no commit.
5. **`pagantesTotais` não foi exposto em `OverviewKPIs`** — seria campo sem
   consumidor mexendo no contrato do snapshot diário de graça. Quando o painel
   precisar mostrar "pagantes", adicionar ali + em `CAMPOS_KPI_SNAPSHOT`.
