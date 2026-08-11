---
trace: leela-redesign-v2-20260810
lane: METRICAS-PAGANTES-PAINEL (leva 5 · D-1008-R19 · T1-T2)
alvo: branch redesign-engajamento-v2 · base 7230a75d → HEAD · C:/dev/leela-wt-redesign-v2
data: 2026-08-11
estado: EM CURSO — T1 PAGA (f4cda04b); T2 (varredura) em registro
---

# METRICAS-PAGANTES-PAINEL · handoff vivo

Contrato: `.nirvana/briefs/leela-metricas-pagantes-painel-enriched.md`. Decisão-fonte:
**D-1008-R19** (leva 5) em
`leela-specs/02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md`.

Régua, nas palavras do dono: *"ticket médio é só por clientes que pagaram, e nao
pagamentos emitidos(pendentes + pagos)"* → métrica de dinheiro conta **cliente
PAGANTE**; funil fecha em pagante; emissão pendente e inscrito nunca entram.

Disciplina: `git commit --only` pathspec por tarefa; push a cada 2 commits; pnpm com
`--config.verify-deps-before-run=false`; suítes em SÉRIE e em FOREGROUND (exit code lido
no próprio comando — nada de watcher); :4599 (PID 25384) INTOCADO; NENHUM deploy.

Estado inicial verificado: árvore LIMPA em `7230a75d` (HEAD da PARCERIAS-NAV);
:4601 servindo pelo PID 29476 (bundle `index-uTmz4HsF.js`).

## T1 · Ticket médio — PAGA (commit `f4cda04b`, 6 arquivos, +261/−8)

### Root cause: o contrato JÁ TINHA a contagem de pagantes

Pergunta do brief respondida com o código na mão — **sim, tinha, e desde o S207-T2**.
`FinanceiroEvento` (o doc `eventos/{id}/financeiro/current`, lido pela tela desde sempre
via `useFinanceiro`) carrega `inscritos.porStatus: Record<StatusInscrito, number>`
(`packages/api-client/src/eventos/queries.ts:205`). Nenhuma leitura nova, nenhum
`getDocs` extra, nenhum recálculo no cliente: o número estava a um campo de distância.

O defeito era de FIAÇÃO, não de dado. `OverviewPage` passava `qtdInscritos` (do doc do
evento) para o `OverviewKpis`, e o componente fazia
`receitaConfirmada / qtdInscritos` — a contagem de inscritos soma **pendente +
cancelado + estornado** junto com quem pagou. Efeito medido: a cada boleto emitido e não
pago o ticket **caía sozinho**, sem uma venda a menos. Com 400 pagantes e 300 emissões
paradas sobre R$ 100.000, o card dizia **R$ 142,86** onde a verdade é **R$ 250,00**.

O `qtdInscritos` só existia dentro do `OverviewKpis` para alimentar aquela divisão —
nenhum outro card usava.

### Conserto

| Onde | O quê |
|---|---|
| `eventos/_lib/financeiro.ts` | `STATUS_PAGANTE` + `contarPagantes(fin)` + `ticketMedioPorPagante(fin)` — puras, o mesmo `_lib` que já é o dono das derivações de dinheiro da Caixa |
| `overview/OverviewPage.tsx` | `ticketMedio={ticketMedioPorPagante(fin)}` — numerador e denominador do **MESMO** doc (ler receita do `evento` e contagem do agregado misturaria dois instantes do mesmo número) |
| `overview/OverviewKpis.tsx` | recebe o ticket **derivado**; `null` → `"—"`; **a prop `qtdInscritos` MORREU** |
| `overview/OverviewDashboard.tsx` | repassa `ticketMedio` (mantém `qtdInscritos` p/ hero e modalidades, que são contagem de verdade) |

Matar a prop é o que torna o conserto estrutural: sem contagem de inscritos dentro do
componente, o denominador errado **não tem por onde voltar** por descuido.

Degradação honesta (destrava registrada): sem agregado (`financeiro/current` ainda não
computado) ou com zero pagante, `ticketMedioPorPagante` devolve `null` e o card mostra
`"—"`. Zero ali leria como "ticket de R$ 0,00", que é mentira de outra classe.

### ⚠️ Divergência REGISTRADA vs. a letra da decisão (vetável do dono)

O brief manda usar `STATUS_QUE_CONTAM_VENDA` (`functions/src/eventos/virarLote.ts:67`
= **confirmado + estornado**). **Não usei o estornado no denominador**, e a razão é
aritmética, não preferência:

- `estornarInscricao.ts:838` **devolve o face** em `eventos/{id}.receitaConfirmada` — e
  é esse número que `agregarFinanceiro` espelha em `receitaBruta`, o numerador. Logo a
  receita já está **líquida de estorno**.
- Somar o estornado ao denominador dividiria receita já líquida por gente que não está
  mais dentro dela: o ticket **cairia a cada reembolso** — a MESMA classe de mentira
  (denominador inflado) que a R19 manda matar, só que menor.
- `STATUS_QUE_CONTAM_VENDA` conta **vaga de lote** (estoque). Uma inscrição estornada
  consumiu um lugar do lote e por isso conta lá; caixa é outra régua.
- O cânone de dinheiro da casa já decidiu isso uma vez: `computeCrmCliente`
  (`packages/core/src/crm/cliente.ts:20`) deixa a estornada no histórico e **fora** de
  `ltv`/`valorGasto` — *"o dinheiro voltou"*.
- As palavras do dono, na íntegra, não citam estornado: o mapeamento para a constante
  de lote foi da redação da decisão, não dele.

Números do vetor: 10 pagantes × R$ 250 = R$ 2.500 com 2 estornados → pela minha régua
**R$ 250,00**; incluindo estornado, **R$ 208,33**.

**Condição de reabertura:** se o dono quiser o estornado dentro, a mudança é UMA linha
(`STATUS_PAGANTE`) + o teste que a pina. Está comentado no código, com este parágrafo.

### Teste falsificado (a prova, não a promessa)

6 casos novos em `eventos/_lib/__tests__/financeiro.test.ts` (describe
`D-1008-R19 · ticket médio conta cliente PAGANTE`) + 2 em `OverviewDashboard.test.tsx`.

Falsificação **executada**: troquei o denominador de volta para `inscritos.total` e
rodei — **5 dos 6 casos ficaram VERMELHOS**, com os números errados exatos:

| Cenário | Esperado | Denominador antigo cospe |
|---|---|---|
| 400 pagantes · 100 pendentes · 100 canceladas sobre 100k | 250 | **166,67** |
| mesmos pagantes + 300 boletos em aberto | 250 | **142,86** |
| 10 pagantes · 2 estornados sobre 2.500 | 250 | **208,33** |
| só pendentes (receita 0) | `null` ("—") | **0** |
| `porStatus` sem a chave `confirmado` | `null` ("—") | **225** |

Fix restaurado e reverificado verde na sequência.

## T2 · Varredura de TODAS as superfícies de dinheiro do painel

Método: grep dirigido por `receita|ticket|médio|conversão|funil|GMV|LTV|faturamento` +
varredura de **toda divisão** (` / `) no `apps/painel/src` fora de testes + inventário
de todo `KpiCard`/`KpiTile`/`formatBRL` da branch (inclui as telas novas de Parcerias
que a PARCERIAS-NAV entregou). Cada métrica foi seguida até a FONTE (agregado, Function
ou core) — veredito por código lido, não por rótulo.

**Achado estrutural da varredura:** `OverviewKpis.tsx:66` era a **ÚNICA divisão de
dinheiro do painel inteiro**. Nenhuma outra média de dinheiro é derivada no cliente —
todo o resto é leitura de agregado ∑ mantido por Function.

### Tabela superfície → métrica → veredito

| # | Superfície | Métrica | Fonte (verificada) | Veredito |
|---|---|---|---|---|
| 1 | `/eventos/:slug` Overview | **Ticket médio** | `receitaConfirmada ÷ qtdInscritos` | **VIOLAVA → CONSERTADO (T1)** |
| 2 | `/eventos/:slug` Overview | Receita confirmada + Δ semana | `evento.receitaConfirmada` · `fin.receitaSemana` | CONFORME |
| 3 | `/eventos/:slug` Overview | **Taxa de conversão** "visitantes → inscritos" | `fin.taxaConversaoPct` (E12; ausente em prod → "—") | **VIOLA — funil fecha em inscrito** (latente, ver abaixo) |
| 4 | `/eventos/:slug` Overview | Repasse previsto | `fin.receitaLiquida` (core, RN-347/406) | CONFORME |
| 5 | `/eventos/:slug` Overview | Receita por modalidade + total do donut | `fin.receitaPorModalidade` | CONFORME |
| 6 | `/eventos/:slug/financeiro` | Receita Total · Disponível · Repassado | `fin.receitaBruta` + `computeDisponivelDoEvento` | CONFORME |
| 7 | `/eventos/:slug/financeiro` | Breakdown por status/kit/modalidade + CSV | `fin.inscritos` (contagem) | CONFORME — contagem rotulada pelo próprio status |
| 8 | VG v3 `/` (KpiRow) | Receita confirmada | `OverviewKPIs.receitaConfirmada` (Σ `receitaConfirmada` dos eventos) | CONFORME |
| 9 | VG v3 `/` (KpiRow) | **Taxa de conversão** | `derivarKpis` → `derivarTaxaConversao(inscricoesTotais, visitas)` | **VIOLA — numerador é inscrito** (latente) |
| 10 | VG v3 `/` (KpiRow · Countdown · ComunidadeResumo) | Inscrições totais · vagas · % ocupado · membros · desafios | contagens de agregado | CONFORME — contagem com rótulo honesto, "—" quando desconhecido |
| 11 | `/crm/visao-geral` Análise | Receita confirmada | `getOverview` ou `fin.receitaBruta` do evento | CONFORME |
| 12 | `/crm/visao-geral` Análise | **Conversão** (+ sparkline) | mesma fonte de #9/#3 | **VIOLA — mesmo defeito de origem** (latente) |
| 13 | `/crm/visao-geral` Análise | Inscrições | `fin.inscritos.total` | CONFORME — rótulo diz "Inscrições" e conta inscrições |
| 14 | `/crm/visao-geral` Análise | Perfil de compradores (faixa etária, sexo, cohort) | `computeDemografia`, query `status == 'confirmado'` | CONFORME — "comprador" é comprador |
| 15 | `/crm/clientes` + `/crm/clientes/:id` | **LTV** · Valor gasto · Valor confirmado | `computeCrmCliente` — só `status === 'confirmado'`; estornada fica no histórico e fora do dinheiro | CONFORME (é o precedente que sustenta a régua do T1) |
| 16 | `/parcerias/afiliacoes/minhas` | Valor total bruto · Comissão a receber · Inscrições no total | `afiliado.valorAtribuido`/`conversoes` — incrementados em `webhookPagamento` (pagamento CONFIRMADO) e **decrementados no estorno** | CONFORME |
| 17 | `/eventos/:slug/afiliados` | Valor atribuído · Conversões · Comissão | mesma fonte de #16 | CONFORME |
| 18 | `/clubes/:slug/parcerias` | Conversões · A receber · Valor anual | espelho da parceria (campos ∑ de Function) | CONFORME |
| 19 | `/clubes/:slug` overview | Receita de parcerias · Conversão em eventos | `"—"` fixo (sem motor de parcerias / sem visitas) | CONFORME — ausência declarada, nunca 0 |
| 20 | `/clubes/engajamento` | Conversão da base (funil) | sem fonte → `EmptyState` que NOMEIA as duas lacunas | CONFORME — o funil que não existe não é desenhado |
| 21 | `/plataforma/macro` (admin) | GMV total · Receita Leela total · GMV por tenant | `platform/rollups` sobre `tenants.gmvAcumulado` | CONFORME à R19 · **ACHADO grave separado** (abaixo) |
| 22 | `/plataforma/tenants` (+ detalhe) | GMV acumulado | `tenant.gmvAcumulado ?? 0` | CONFORME à R19 · mesmo achado |
| 23 | `/eventos/:slug/repasses` · `/plataforma/repasses` · `/plataforma/estornos` | Valores de repasse, estorno, devolução, taxa retida | ledger — valor de TRANSAÇÃO, não média | CONFORME — não há denominador para errar |
| 24 | `/plataforma/planos` · `/plataforma/taxa` | Fee mensal · % · fixo por venda | configuração comercial | CONFORME — parâmetro, não métrica |

### As três violações latentes (#3, #9, #12) — por que não foram consertadas AQUI

São **um defeito só**, e ele não está no painel: `derivarTaxaConversao(confirmadas,
visitas)` (`packages/core/src/overview/kpis.ts:225`) é chamada com
**`inscricoesTotais`** no lugar de confirmadas — o próprio docstring da função diz
"confirmadas / visitas" enquanto o `derivarKpis` passa o total. Isso é exatamente o
"funil fecha em inscrito" que a R19 proíbe.

- Quem calcula e grava é o **servidor** (`aggregateProfessionalDashboard.ts:195` →
  `profissionais/{id}/dashboard/current`). O painel só LÊ.
- O input `EventoKpiInput` **não tem** recorte por status (só `qtdInscritos` e
  `receitaConfirmada`): consertar exige mudar o contrato do rollup. É trabalho da lane
  **METRICAS-PAGANTES-BACKEND**, e `packages/core` não tem runner de teste próprio (a
  cobertura dele vive em `functions/src/__tests__`) — fora do gate desta lane.
- **Não há número mentindo na tela hoje:** em produção `visitas` é sempre `null` →
  `taxaConversaoPct = null` → o card mostra `"—"`. No preview do :4601 o valor é uma
  CONSTANTE de mockup (68,2%) injetada pelo `preview-seed-extra.ts`, não uma derivação.
- **Não mexi no rótulo** "visitantes → inscritos": trocar a palavra para "pagantes" sem
  trocar a conta criaria a mentira em vez de matá-la. Quando o backend entregar a fonte,
  a conta e o rótulo mudam no MESMO commit.

### Achado grave adjacente (fora da R19, vai para a fila)

**`tenants.gmvAcumulado` não tem escritor.** `provisionTenant.ts:387` cria o campo em
`0` e **nenhuma Function o incrementa** (varredura completa em `functions/src`: só o
provisionamento, os seeds e a LEITURA do rollup tocam o campo). Consequência: o
dashboard macro do admin exibe **GMV total R$ 0,00 · Receita Leela total R$ 0,00** para
sempre, e `receitaLeela = computeTaxa(gmv, fee)` herda o zero. Não é violação da R19 (não
há inscrito nem emissão na conta) — é um número que não existe sendo exibido como se
existisse. O `?? 0` do painel não é a causa (o campo está presente, valendo 0), então o
conserto é do lado do servidor. → **METRICAS-PAGANTES-BACKEND**.

## Gates

| Gate | Resultado |
|---|---|
| Suíte painel INTEIRA | **2573/2573** (235 arquivos) ✔ exit 0 — 2565 antes + 8 novos · log `.maestro-logs/painel-suite-metricas-t1.log` |
| Falsificação do T1 | 5/6 casos VERMELHOS com o denominador antigo ✔ (números na tabela acima) |
| type-check painel | exit 0 ✔ |
| lint painel `--max-warnings 0` | exit 0 ✔ |
| Suíte DS completa | (pendente — a lane não tocou o DS, gate roda mesmo assim) |
| generate-tokens 2× | (pendente) |
| hex/px no diff da lane | (pendente) |
| L-021 no diff | (pendente) |

## Commits da lane

- `f4cda04b` T1 (R19 · ticket médio por pagante; 6 arquivos, +261/−8)
