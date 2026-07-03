# LEELA-E09 · Financeiro do Profissional

- **Superfície:** Painel
- **Horizonte:** H2 (Onda 3 · robustez e alavancas)
- **MoSCoW:** Should
- **Estimativa:** L
- **Status:** 🧊 Icebox (protótipo `Financeiro.html` pronto; portar para código)
- **Depende de:** LEELA-E01 (Design System & Shell), LEELA-E03 (Operação do Evento — inscritos), LEELA-E04 (Config & Vendas — kits, preço, `PaymentProvider`), LEELA-E05 (Clubs — parcerias de afiliação)
- **De-para:** BH-E09 · BH-800 (Financeiro do profissional, `Financeiro.html`)

## Objetivo

Entregar ao profissional uma visão financeira **consolidada e confiável** de tudo que ele movimenta na Leela: a receita de inscrições dos eventos que organiza, a taxa da plataforma, os repasses previstos e as comissões de afiliação que ele recebe como coordenador de clube. Hoje esse controle vive em planilha e conversa de WhatsApp (dor levantada no PRD-01 para Organizador e Coordenador); o épico substitui isso por um painel onde receita, taxa, líquido e saldo a receber batem com o extrato real do gateway.

O ponto crítico é a **integridade dos números**. Todo valor exibido é agregado mantido por Cloud Function a partir dos eventos de pagamento (webhooks do `PaymentProvider`), nunca calculado por varredura no cliente (ADR-005, `modelo-de-dados-firestore.md`). O split de afiliação e os webhooks são idempotentes: reprocessar um evento de pagamento não duplica receita, conversão nem repasse. A tela é read-only sobre esses agregados, mais export CSV.

## Personas & JTBD

- **Organizador de Evento (primária):** "acompanhar receita e repasses de todos os meus eventos e planejar saques sem planilha".
- **Coordenador de assessoria (primária):** "ver quanto tenho a receber de afiliação (clube que promove eventos de terceiros) sem controlar comissão em planilha" (JTBD do PRD-01: "Calcular comissão sem planilha").

Um mesmo profissional pode acumular os dois papéis; o painel consolida ambos os fluxos num único saldo (RN-334).

## Critérios de sucesso do épico

- Abrir Financeiro mostra, para o período selecionado, receita confirmada, repasse previsto (líquido de taxa) e ticket médio, todos derivados de agregados de Function — os valores conferem com o somatório das transações confirmadas.
- Receita por dia (barras) e por modalidade (donut) refletem os pagamentos confirmados do período.
- O saldo consolidado soma corretamente repasses do organizador (líquidos) e comissões de afiliação do coordenador, cruzando `eventos` + `clubes/{id}/parcerias`.
- Reprocessar um webhook de pagamento (confirmação, cancelamento ou reembolso) não altera os agregados além do efeito único do evento (idempotência verificada em teste de integração).
- Últimas transações listáveis, filtráveis e exportáveis em CSV, respeitando retenção de 90 dias (LGPD, RN-144).

## Regras de negócio aplicáveis

Reaproveitadas do backlog:
- **RN-120 / RN-122** — comissão de afiliação é definida pelo organizador e é **read-only** para o clube; o clube só aceita/recusa. Reflete no que o coordenador tem a receber.
- **RN-123** — patrocínio tem modelo comercial financeiro ou permuta; só o financeiro entra em valores a receber.
- **RN-125 / RN-311** — o link master atribui a conversão a um afiliado apenas **dentro da janela de atribuição**; fora dela não há split.
- **RN-204** — status da inscrição: confirmado / pendente / cancelado (dirige o que entra em receita confirmada vs. prevista).
- **RN-211** — "sem kit" é válido e o preço aceita valor negativo (desconto); a soma financeira respeita valores negativos.
- **RN-310 / RN-312** — organizador define o programa de afiliação; clube e promotor individual são tipos de afiliado (ambos geram split).
- **RN-144** — LGPD: export de dados por 90 dias; retenção do extrato financeiro segue a mesma janela.

Novas (financeiro do profissional — introduzidas neste épico, faixa RN-330…327):
- **RN-330 · Taxa da plataforma.** Percentual configurável aplicado sobre a receita bruta confirmada de cada pagamento (mock canônico: 10,5%). Receita líquida = bruta − taxa da plataforma − splits de afiliação.
- **RN-331 · Liberação de repasse.** O repasse do organizador só fica "disponível" após o critério de liberação do evento (ex.: encerramento/data da prova) e respeita o prazo de repasse do programa (mock: 10 dias úteis após liberação). Antes disso, exibe-se como "previsto · aguardando encerramento".
- **RN-332 · Split de afiliação.** Na confirmação de um pagamento atribuído a afiliado dentro da janela (RN-125/311), a comissão é debitada do repasse do organizador e creditada como "a receber" do afiliado. O split é calculado e registrado por Cloud Function no processamento do webhook, nunca no cliente.
- **RN-333 · Idempotência.** Webhooks de pagamento e a Function de split usam o `providerTxId` (chave do evento do provider) como chave de deduplicação; reprocessar o mesmo evento não duplica pagamento, receita, conversão nem repasse.
- **RN-334 · Saldo consolidado.** O saldo do profissional consolida (a) repasses a receber como organizador (líquidos de taxa e splits) e (b) comissões a receber como coordenador/afiliado, cruzando `eventos` (que ele organiza) + `clubes/{id}/parcerias` (dos clubes que ele possui).
- **RN-335 · Estados de valor.** Só pagamentos `confirmado` entram em receita confirmada; `pendente` entra em previsto; `cancelado`/`reembolsado` revertem os agregados de forma idempotente.
- **RN-336 · Ticket médio.** Ticket médio = receita confirmada ÷ nº de inscrições pagas no período.
- **RN-337 · Reembolso.** Reembolso reverte a inscrição para `cancelado` (RN-204) e estorna proporcionalmente o split de afiliação (a comissão a receber do afiliado é revertida).

Novas (pós-venda: reembolso/cancelamento/titularidade — introduzidas por LEELA-S904; a política, janelas e SLA de decisão vivem em LEELA-E04-S305):
- **RN-341 · Máquina de estados de reembolso.** Toda solicitação percorre `solicitado → (aprovado_auto | em_analise) → aprovado|recusado → estornado`; cada transição é registrada em `transicoes[]` (de→para, quando, por quem) para auditoria. O estorno reusa RN-337 — reverte a inscrição para `cancelado` (RN-204) e reverte o split de afiliação — executado via `PaymentProvider.refund` (ADR-006). Escrita de estado e financeiro só por Cloud Function, nunca pelo cliente. Em pedido em grupo (ADR-011), a máquina opera por inscrito dentro do pedido, não sobre o pedido inteiro.
- **RN-342 · Notificação de reembolso.** Na abertura (`estado=solicitado`) o organizador é notificado imediatamente (obrigatório) e o atleta recebe recibo; a cada transição (`aprovado_auto`/`aprovado`/`recusado`/`estornado`) o atleta é notificado.
- **RN-345 · Chip/kit na transferência de titularidade.** Na transferência de titularidade, se o kit ainda não foi entregue recoleta-se o tamanho do novo titular; o chip só é vinculado na entrega (RN-203), sem impacto retroativo. Se o kit já foi entregue, a transferência é bloqueada.
- **RN-346 · Clawback de comissão pós-repasse.** Quando o estorno atinge um split cuja comissão do afiliado ainda está `previsto`, a reversão apenas desfaz o agregado a receber (RN-337). Quando a comissão já está `repasseDisponivel`/paga, o estorno **não** escreve saldo negativo direto: gera um lançamento de débito (clawback) auditável em `profissionais/{id}/saldo`, a ser compensado em repasses futuros do afiliado; enquanto houver clawback pendente, o próximo repasse é compensado antes da liberação e fica bloqueado até quitar o saldo devedor.

Regras de design/UX herdadas: §2.5 (tabela densa, linha 64px — usada em "últimas/todas as transações"), §2.12 (estados vazio/erro/carregando sempre, feedback via Toast), §2.16 (flat, sem borda decorativa em cards de KPI).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. O épico é majoritariamente **leitura de agregados** mantidos por Function; introduz um ledger de pagamentos e dois agregados novos.

- `eventos/{eventoId}` — consome ∑`receitaConfirmada`, `qtdInscritos` (já previstos). Novos campos de rollup financeiro (∑, por Function): `receitaBruta`, `taxaPlataforma`, `receitaLiquida`, `repassePrevisto`, `repasseDisponivel`, `porModalidade{}`, `porFormaPagamento{}`.
- `eventos/{eventoId}/inscritos/{inscritoId}` — consome `kit`, `preco`, `status`(RN-204), `modalidade`.
- **`eventos/{eventoId}/pagamentos/{pagamentoId}` (NOVA)** — ledger criado/atualizado apenas pela Function de webhook: `inscritoId→inscritos`, 🔁`atletaNome`, `valorBruto`, `taxaPlataforma`, `afiliadoId?`, `afiliadoTipo?`(clube/promotor), `splitValor?`, `valorLiquido`, `formaPagamento`(pix/cartao), `parcelas?`, `status`(confirmado/pendente/cancelado/reembolsado — RN-335), `providerTxId`(chave de idempotência — RN-333), `criadoEm`.
- `clubes/{clubId}/parcerias/{parceriaId}` — consome ∑`conversoes`, ∑`valorAReceber` (já previstos; alimentados pelo mesmo evento de split — RN-332).
- **`profissionais/{profId}/saldo/{unico}` (NOVA, ∑)** — agregado consolidado mantido por Function: `organizadorAReceber`, `organizadorDisponivel`, `afiliadoAReceber`, `saldoTotal`, `atualizadoEm` (RN-334). ➕ para clawback (RN-346): `saldoDevedor` e `clawbacks[]` (lançamentos de débito auditáveis quando o estorno atinge comissão já repassada/paga — compensados em repasses futuros, nunca saldo negativo direto; enquanto pendente, bloqueia liberação do próximo repasse).
- **`eventos/{eventoId}/reembolsos/{reembolsoId}` (NOVA)** — solicitação de reembolso/cancelamento POR INSCRITO dentro do pedido (ADR-011); estado/financeiro escritos só por Function: `inscritoId→inscritos`, `motivo`, `estado`(solicitado/aprovado_auto/em_analise/aprovado/recusado/estornado — RN-341), `origem`(atleta/organizador/admin), `valorSolicitado`, `valorEstornado?`, `decididoPor?`, `transicoes[]`(auditoria de cada passo da máquina: de→para, quando, por quem — RN-341), `criadoEm`.
- **`eventos/{eventoId}/transferencias/{transferenciaId}` (NOVA)** — transferência de titularidade/ingresso POR INSCRITO dentro do pedido (ADR-011): `tipo`(titularidade/ingresso), `inscritoId`, `titularAnteriorRef`, `novoTitularDados`(inclui tamanho recoletado do novo titular quando o kit não foi entregue — RN-345), `diffCobrada?`, `estado`, `criadoEm`.
- `eventos/{eventoId}/inscritos/{inscritoId}` — no estorno, `status` assume `cancelado` (RN-204 já prevê); ganha `titularHistorico[]` (append-only) na transferência de titularidade (RN-345). O chip (`chipNumero?`) só é vinculado na entrega (RN-203), sem impacto retroativo.

Agregados ∑ mantidos por Cloud Function (obrigatório — nunca no cliente): rollup financeiro do evento; `parcerias.conversoes`/`valorAReceber` (no split); `profissionais/{profId}/saldo`. Padrão de escrita concorrente em pico de vendas: distributed counters (ver `modelo-de-dados-firestore.md` §Agregados). Security Rules: campos financeiros e agregados ∑ são **escrita apenas via Function (Admin SDK)**; o profissional só lê os documentos dos eventos/clubes que possui.

## Fora de escopo (Won't nesta fase)

- **Saque/withdrawal** (executar transferência do saldo disponível para a conta bancária): o painel exibe saldo e status de repasse, mas não dispara ordem de pagamento. Fica para épico posterior.
- **Financeiro por evento individual** (`Financeiro-Evento.html`, BH-207/BH-302): pertence a E03/E04; aqui é a visão consolidada do profissional.
- **Financeiro do influenciador** (BH-700.4 / E08 Painel do Influenciador).
- Conciliação bancária / emissão de nota fiscal.
- Escolha do gateway concreto de pagamento (ADR-006 pendente): construir contra a interface `PaymentProvider` + provider mock/sandbox.

---

## User stories

### LEELA-S900 · Painel financeiro consolidado · (de-para BH-800)

**Como** Organizador de Evento (profissional), **quero** um painel que consolide receita, taxa e repasse previsto de todos os meus eventos por período, **para** acompanhar o resultado sem montar planilha.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro.html`
- **RNs:** RN-330, RN-335, RN-336, §2.12, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** que sou profissional com eventos publicados, **quando** abro Financeiro, **então** vejo três KPIs no topo — receita total confirmada (com contagem de inscrições pagas), repasse previsto (líquido da taxa da plataforma, com badge "Aguardando encerramento"), e ticket médio — todos do período selecionado.
- **Dado** o seletor de período no header, **quando** troco de mês, **então** KPIs, gráficos e transações recarregam para o novo período.
- **Dado** um profissional sem nenhuma venda no período, **quando** abro a tela, **então** vejo estado vazio ("Nenhuma movimentação financeira neste período") em vez de zeros ambíguos, e nenhum gráfico quebrado.
- **Dado** falha ao carregar agregados, **quando** a query erra, **então** vejo estado de erro com ação "Tentar novamente" (§2.12), nunca a tela em branco.
- **Dado** o ticket médio, **quando** é exibido, **então** vale receita confirmada ÷ inscrições pagas (RN-336).

**Tasks:** LEELA-S900-T1, LEELA-S900-T2, LEELA-S900-T3

#### LEELA-S900-T1 · Rota Financeiro + shell + header com seletor de período

- **Tipo:** screen · **Depende de:** E01-S001-3-T1 (Shell), E01-S001-1-T2 (ThemeProvider) · **Bloqueia:** T2, T3 · **Estimativa:** S

**Objetivo**
Criar a rota `Financeiro` no painel com shell padrão, título/subtítulo e o seletor de período (mês), que dirige o intervalo consultado pelos KPIs e gráficos.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Financeiro.html` (header "Financeiro" + subtítulo "Acompanhe a receita e os repasses de todos os seus eventos" + botão de período "Abril 2026").
- RNs: §2.1 (Header), §2.12.
- Mocks canônicos: profissional **Marina Castelo · Castelo Produções** (iniciais MC); período-âncora **Abril 2026** (hoje = 20 Abr 2026). Alinhar o evento exibido ao canônico **Meia Maratona Floripa 2026** (`meia-floripa-2026`); a tela HTML cita "Corrida do Campeche 2026" — usar o canônico.
- Componentes DS: Shell (Sidebar item "Financeiro" ativo), Header 96px, Button/Popover para o seletor de período.

**Arquivos (criar/editar)**
- `apps/painel/app/financeiro/page.tsx` — rota + layout + estado de período (Server Component + client island para o seletor).
- `apps/painel/app/financeiro/PeriodPicker.tsx` — seletor de mês (client).
- `packages/core/src/finance/period.ts` — util de intervalo `{ start, end }` a partir de `ano/mes`.

**Passos de implementação**
1. Registrar a rota e marcar o item "Financeiro" ativo na Sidebar.
2. Renderizar header (título + subtítulo do glossário) e o `PeriodPicker` alinhado à direita.
3. Estado do período via query param (`?periodo=2026-04`) para ser SSR-friendly e compartilhável; default = mês corrente ancorado nos mocks.
4. Expor o intervalo às Server Components filhas (KPIs, gráficos, transações) por props.

**Modelo de dados / contratos**
- Nenhuma coleção nova nesta task. Tipo `Period = { start: Timestamp; end: Timestamp; label: string }` em `packages/core`.

**Regras de negócio a respeitar**
- §2.1 header; §2.12 (a tela nunca fica estática).

**Critérios de aceite (testáveis)**
- **Dado** `?periodo=2026-04`, **quando** carrego, **então** o header mostra "Abril 2026" e o intervalo passado aos filhos é 01→30 Abr 2026.
- **Dado** que troco para Março, **quando** seleciono, **então** o query param muda e os filhos recebem o novo intervalo.

**Testes a escrever**
- unit: `period.ts` deriva intervalo correto por ano/mês (incl. viradas de mês).

**Definition of Done** — ver `definition-of-done.md` (DoD Tela/rota). Sem valor hardcoded; item de sidebar acessível.

**Fora de escopo**
KPIs e gráficos (T2/T3).

#### LEELA-S900-T2 · KPIs de topo (receita confirmada, repasse previsto, ticket médio)

- **Tipo:** screen · **Depende de:** T1, LEELA-S901-T1 (rollup do evento) · **Estimativa:** S

**Objetivo**
Renderizar os três cards de KPI consumindo agregados do evento/profissional, com estados de carregando e vazio.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Financeiro.html` (bloco `.fin-top`: "Receita total confirmada" R$34.820 · "298 inscrições pagas"; "Repasse previsto" R$31.165,40 · "Após taxa de 10,5%" + badge alerta "Aguardando encerramento"; "Ticket médio" R$116,85 + sparkline).
- RNs: RN-330 (taxa), RN-331 (repasse previsto/aguardando), RN-335, RN-336 (ticket).
- Mocks: valores ilustrativos da tela; taxa da plataforma canônica **10,5%**.
- Componentes DS: Card KPI flat (§2.16), Badge `alerta` ("Aguardando encerramento"), Skeleton (carregando), sparkline como SVG do DS.

**Arquivos (criar/editar)**
- `apps/painel/app/financeiro/KpiCards.tsx` — três cards + skeleton + empty.
- `packages/api-client/src/finance.ts` — leitura tipada do rollup do período.

**Passos de implementação**
1. Buscar rollup financeiro do período (soma dos eventos do profissional) via `api-client`.
2. Card 1: receita confirmada + contagem de inscrições pagas.
3. Card 2: repasse previsto = receita − taxa (RN-330); badge "Aguardando encerramento" enquanto não liberado (RN-331).
4. Card 3: ticket médio (RN-336) + sparkline dos últimos períodos.
5. Skeleton em carregamento; empty coerente quando não há venda.

**Modelo de dados / contratos**
- Lê `eventos/{id}` rollup (`receitaBruta`, `taxaPlataforma`, `receitaLiquida`, `repassePrevisto`) agregado no período; nunca soma no cliente varrendo `inscritos`/`pagamentos`.

**Regras de negócio a respeitar**
- RN-330, RN-331, RN-335, RN-336. Valores financeiros só de leitura; escrita é da Function (S901).

**Critérios de aceite (testáveis)**
- **Dado** receita confirmada X e Y inscrições pagas, **quando** exibo, **então** ticket médio = X/Y (RN-336).
- **Dado** taxa 10,5%, **quando** calculo repasse previsto na exibição, **então** bate com o `repassePrevisto` vindo da Function (não recalcular no cliente).
- **Dado** repasse não liberado, **quando** renderizo o card, **então** mostra badge "Aguardando encerramento".

**Testes a escrever**
- unit: formatação de moeda pt-BR + montagem do view-model dos KPIs a partir do rollup.

**Definition of Done** — DoD Tela/rota. Cards flat (§2.16), skeleton em vez de spinner solto.

**Fora de escopo**
Cálculo do rollup (é da Function, S901); saque.

#### LEELA-S900-T3 · Gráfico de receita por dia (barras) + donut por modalidade

- **Tipo:** screen · **Depende de:** T1, LEELA-S901-T1 · **Estimativa:** M

**Objetivo**
Renderizar o gráfico de barras "Inscrições por dia" (receita diária) e o donut "Por modalidade", ambos alimentados por agregados do período.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Financeiro.html` (`.chart-card` barras 30 dias com tooltip data/valor/inscrições; `.donut-card` por modalidade: 21km 48% R$16.713, 10km 32% R$11.142, 5km 20% R$6.964, centro "Total R$34,8k · 298 pagas").
- RNs: RN-335 (só confirmado entra), §2.12.
- Mocks: modalidades canônicas da Meia Floripa — **5k · 10k · 21k**.
- Componentes DS: cartões de gráfico flat, tooltip do DS, legenda; usar tokens de cor por série (nada hardcoded — o HTML usa hex fixos; portar para tokens semânticos).

**Arquivos (criar/editar)**
- `apps/painel/app/financeiro/RevenueBarChart.tsx`
- `apps/painel/app/financeiro/ModalityDonut.tsx`
- `packages/api-client/src/finance.ts` — leitura de série diária + breakdown por modalidade.

**Passos de implementação**
1. Ler série diária (receita/dia) do rollup do período e breakdown `porModalidade`.
2. Barras: altura proporcional ao máximo; tooltip com data, valor e nº de inscrições; ticks a cada 5 dias.
3. Donut: fatias por modalidade com % e valor; centro com total e inscrições pagas.
4. Substituir hex fixos do protótipo por tokens semânticos de série.
5. Empty state quando não há dados no período; sem gráfico quebrado.

**Modelo de dados / contratos**
- Lê agregados `porModalidade{ modalidade: {valor, qtd} }` e série diária mantidos por Function; não varre `pagamentos` no cliente.

**Regras de negócio a respeitar**
- RN-335 (só `confirmado` compõe as séries).

**Critérios de aceite (testáveis)**
- **Dado** breakdown por modalidade, **quando** renderizo o donut, **então** a soma das fatias = total do centro e os % somam 100.
- **Dado** período sem vendas, **quando** carrego, **então** ambos os gráficos mostram estado vazio (não NaN/0 confuso).

**Testes a escrever**
- unit: cálculo de % e proporção de barra a partir da série; view-model do donut.

**Definition of Done** — DoD Tela/rota. Cores por token, a11y (legenda textual + contraste AA).

**Fora de escopo**
Agregação server-side (S901); export (S903).

---

### LEELA-S901 · Agregação financeira por Cloud Function (receita, taxa, líquido, ticket) · (de-para BH-800)

**Como** plataforma, **quero** manter os agregados financeiros por Cloud Function a partir dos eventos de pagamento, **para** que o painel exiba números íntegros e nunca calculados no cliente.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel (backend)
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro.html` (consumidora)
- **RNs:** RN-330, RN-333, RN-335, RN-336, RN-337

**Critérios de aceite (Given/When/Then):**
- **Dado** um webhook de pagamento confirmado, **quando** a Function processa, **então** grava o pagamento no ledger e incrementa receita bruta, taxa, líquido e contagem do evento de forma atômica.
- **Dado** o mesmo `providerTxId` reprocessado, **quando** o webhook chega de novo, **então** os agregados não mudam (idempotência — RN-333).
- **Dado** um cancelamento/reembolso, **quando** processado, **então** os agregados são revertidos exatamente uma vez (RN-335/327).
- **Dado** um pagamento `pendente`, **quando** processado, **então** não entra em receita confirmada, só em previsto.

**Tasks:** LEELA-S901-T1, LEELA-S901-T2, LEELA-S901-T3

#### LEELA-S901-T1 · Modelo de dados: ledger de pagamentos + campos de rollup + Security Rules

- **Tipo:** data-model · **Depende de:** LEELA-E04 (`PaymentProvider` interface) · **Bloqueia:** S900-T2, S900-T3, S901-T2 · **Estimativa:** S

**Objetivo**
Definir a coleção `eventos/{eventoId}/pagamentos`, os campos de rollup financeiro do evento e as Security Rules (escrita só via Function).

**Contexto & referências**
- Modelo: `modelo-de-dados-firestore.md` (§Agregados ∑; §Security Rules).
- RNs: RN-333 (idempotência via `providerTxId`), RN-335.

**Arquivos (criar/editar)**
- `packages/core/src/finance/types.ts` — `Pagamento`, `EventoRollupFinanceiro`.
- `firestore.rules` — regras de `eventos/{id}/pagamentos` e campos de rollup.
- `modelo-de-dados-firestore.md` — documentar a nova subcoleção e os campos ∑.

**Passos de implementação**
1. Tipar `Pagamento` (campos em §Modelo de dados tocado acima) com `providerTxId` como chave de idempotência.
2. Tipar `EventoRollupFinanceiro` (`receitaBruta`, `taxaPlataforma`, `receitaLiquida`, `repassePrevisto`, `repasseDisponivel`, `porModalidade`, `porFormaPagamento`).
3. Rules: `pagamentos` e campos ∑ com `allow write: if false` para o cliente (só Admin SDK); leitura só para o `ownerId` do evento.
4. Registrar no `modelo-de-dados-firestore.md`.

**Modelo de dados / contratos**
- Coleção: `eventos/{eventoId}/pagamentos/{pagamentoId}` (docId = `providerTxId` para dedupe natural).

**Regras de negócio a respeitar**
- RN-333 (docId idempotente), Security Rules (escrita só Function).

**Critérios de aceite (testáveis)**
- **Dado** um cliente autenticado que possui o evento, **quando** tenta escrever em `pagamentos`, **então** a rule nega; **quando** lê, **então** permite.
- **Dado** um profissional que não possui o evento, **quando** lê `pagamentos`, **então** a rule nega.

**Testes a escrever**
- integração (emulator): rules de leitura/escrita por owner e negação de escrita cliente.

**Definition of Done** — DoD API/Function (Security Rules por coleção criada).

**Fora de escopo**
A lógica de agregação (T2).

#### LEELA-S901-T2 · Function `onPaymentWebhook` — grava ledger + atualiza rollup (idempotente)

- **Tipo:** api/function · **Depende de:** T1, T3 · **Estimativa:** M

**Objetivo**
Cloud Function que consome o webhook do `PaymentProvider`, grava/atualiza o pagamento no ledger de forma idempotente e mantém o rollup financeiro do evento (distributed counters).

**Contexto & referências**
- ADR-006 (`PaymentProvider`: `handleWebhook`, `getPayout`). `estrategia-testes.md` (cobertura máxima em pagamento; webhook idempotente + reembolso).
- RNs: RN-330, RN-333, RN-335, RN-336, RN-337.

**Arquivos (criar/editar)**
- `functions/src/finance/onPaymentWebhook.ts`
- `packages/core/src/finance/calc.ts` — funções puras `computeTaxa`, `computeLiquido`, `computeTicketMedio`.

**Passos de implementação**
1. Verificar assinatura do webhook (provider) e extrair `providerTxId`, valor, forma, status, inscritoId, atribuição de afiliado.
2. Idempotência: `providerTxId` como docId; se já processado no estado atual, no-op (RN-333).
3. Calcular taxa (RN-330) e líquido via `core/finance/calc` (funções puras).
4. Transação: gravar/atualizar `pagamentos/{providerTxId}` + incrementar counters do rollup do evento por status (confirmado/pendente/cancelado/reembolsado — RN-335); reembolso reverte (RN-337).
5. Atualizar `porModalidade`/`porFormaPagamento`.
6. Reportar erros ao Sentry sem dado sensível.

**Modelo de dados / contratos**
- Function: `onPaymentWebhook(event) -> void`; escreve `eventos/{id}/pagamentos` + rollup ∑.

**Regras de negócio a respeitar**
- RN-330, RN-333, RN-335, RN-336, RN-337.

**Critérios de aceite (testáveis)**
- **Dado** dois webhooks com o mesmo `providerTxId`, **quando** ambos processam, **então** o rollup reflete um único pagamento (RN-333).
- **Dado** um reembolso após confirmação, **quando** processa, **então** receita e contagem voltam ao estado pré-pagamento (RN-337).
- **Dado** pagamento pendente que depois confirma, **quando** o segundo webhook chega, **então** migra de previsto para confirmado sem duplicar.

**Testes a escrever**
- integração (emulator): idempotência de confirmação; reembolso reverte; pendente→confirmado; assinatura inválida rejeitada.

**Definition of Done** — DoD API/Function (idempotência, webhook assinado, Sentry).

**Fora de escopo**
Split de afiliação (S902) — aqui só receita/taxa/líquido do organizador.

#### LEELA-S901-T3 · Cálculo financeiro puro em `core` (taxa, líquido, ticket)

- **Tipo:** test · **Depende de:** T1 · **Bloqueia:** T2 · **Estimativa:** XS

**Objetivo**
Isolar e testar em `packages/core` as funções puras de cálculo financeiro reusadas pela Function e pela UI.

**Contexto & referências**
- `estrategia-testes.md` (base unit em `core`). RNs: RN-330, RN-336, RN-211 (preço negativo).

**Arquivos (criar/editar)**
- `packages/core/src/finance/calc.ts`
- `packages/core/src/finance/calc.test.ts`

**Passos de implementação**
1. `computeTaxa(bruto, pct)`, `computeLiquido(bruto, taxa, split)`, `computeTicketMedio(receita, qtdPagas)`.
2. Tratar arredondamento em centavos (pt-BR) e divisão por zero (ticket com 0 pagas → 0).
3. Suportar valor negativo (desconto "sem kit" — RN-211).

**Regras de negócio a respeitar**
- RN-330, RN-336, RN-211.

**Critérios de aceite (testáveis)**
- **Dado** bruto R$189 e taxa 10,5%, **quando** calculo, **então** líquido = bruto − taxa (arredondado a centavo).
- **Dado** 0 inscrições pagas, **quando** calculo ticket, **então** retorna 0 (sem divisão por zero).

**Testes a escrever**
- unit: taxa/líquido/ticket, arredondamento e caso negativo.

**Definition of Done** — DoD Task; sem `any`; cobertura alta em `core`.

**Fora de escopo**
I/O e agregação (T2).

---

### LEELA-S902 · Split de afiliação e saldo consolidado (organizador + coordenador) · (de-para BH-800)

**Como** profissional que organiza eventos e coordena clube, **quero** que o split de afiliação seja calculado corretamente e meu saldo consolide os dois papéis, **para** saber quanto tenho a receber sem cruzar planilhas.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro.html`
- **RNs:** RN-120, RN-122, RN-125, RN-311, RN-332, RN-333, RN-334, RN-337

**Critérios de aceite (Given/When/Then):**
- **Dado** um pagamento atribuído a um afiliado dentro da janela, **quando** confirma, **então** a comissão é debitada do repasse do organizador e creditada em `parcerias.valorAReceber` do afiliado (RN-332), uma única vez (RN-333).
- **Dado** um pagamento fora da janela de atribuição, **quando** confirma, **então** não há split (RN-125/311).
- **Dado** um reembolso de pagamento com split, **quando** processa, **então** a comissão a receber do afiliado é revertida proporcionalmente (RN-337).
- **Dado** um profissional que é organizador e coordenador, **quando** abro o saldo, **então** vejo repasses a receber como organizador + comissões a receber como coordenador, somados (RN-334).

**Tasks:** LEELA-S902-T1, LEELA-S902-T2, LEELA-S902-T3

#### LEELA-S902-T1 · Split de afiliação no webhook (`PaymentProvider.splitRules`) idempotente

- **Tipo:** api/function · **Depende de:** LEELA-S901-T2 · **Estimativa:** M

**Objetivo**
Estender o processamento do webhook para calcular e registrar o split quando o pagamento tem afiliado atribuído dentro da janela, debitando do organizador e creditando o afiliado, idempotentemente.

**Contexto & referências**
- ADR-006 (`PaymentProvider.splitRules`). `modelo-de-dados-firestore.md` (`parcerias` ∑`conversoes`/`valorAReceber`). `estrategia-testes.md` (split como cobertura máxima).
- RNs: RN-120/122 (comissão read-only p/ clube), RN-125/311 (janela), RN-312 (clube ou promotor), RN-332, RN-333, RN-337.
- Mocks: **Corrida Perfeita Sul** afiliada à **Meia Floripa 2026** · comissão 10% · janela 7 dias · link master `beh.ro/mfl26?c=cps` · 28 conversões · R$528 a receber.

**Arquivos (criar/editar)**
- `functions/src/finance/onPaymentWebhook.ts` (estender)
- `functions/src/finance/computeSplit.ts`
- `packages/core/src/finance/split.ts` — regra pura de split.

**Passos de implementação**
1. Ao confirmar pagamento, checar atribuição a afiliado e janela (RN-125/311) via `PaymentProvider.splitRules`/dados da parceria.
2. Calcular comissão pela `comissaoPct` da parceria (read-only p/ clube — RN-120/122).
3. Na mesma transação do rollup: gravar `splitValor`/`afiliadoId`/`afiliadoTipo` no pagamento e incrementar `parcerias.conversoes` + `valorAReceber` (RN-332); debitar do repasse do organizador.
4. Idempotência pelo `providerTxId` (RN-333); reembolso reverte split (RN-337).

**Modelo de dados / contratos**
- Escreve `eventos/{id}/pagamentos/{txId}` (campos de split) + `clubes/{clubId}/parcerias/{parceriaId}` ∑.

**Regras de negócio a respeitar**
- RN-120, RN-122, RN-125, RN-311, RN-312, RN-332, RN-333, RN-337.

**Critérios de aceite (testáveis)**
- **Dado** pagamento de R$189 com afiliado a 10% dentro da janela, **quando** confirma, **então** `valorAReceber` do afiliado sobe R$18,90 e o repasse do organizador cai o mesmo, uma vez.
- **Dado** o mesmo webhook reprocessado, **quando** chega de novo, **então** conversões e a receber não mudam (RN-333).
- **Dado** clique fora da janela de 7 dias, **quando** confirma, **então** sem split.

**Testes a escrever**
- integração (emulator): split idempotente; fora da janela sem split; reembolso reverte split; comissão vem da parceria (não do cliente).

**Definition of Done** — DoD API/Function (idempotência, cobertura máxima em pagamento).

**Fora de escopo**
UI de saldo (T3); saque.

#### LEELA-S902-T2 · Function de saldo consolidado do profissional (cruza eventos + clubes)

- **Tipo:** api/function · **Depende de:** T1 · **Estimativa:** M

**Objetivo**
Manter `profissionais/{profId}/saldo` consolidando repasses do organizador (líquidos) e comissões de afiliação do coordenador, cruzando os eventos que ele organiza e as parcerias dos clubes que ele possui.

**Contexto & referências**
- `modelo-de-dados-firestore.md` (agregado novo `profissionais/{profId}/saldo`).
- RNs: RN-331 (liberação), RN-334 (consolidação).
- Mocks: Marina Castelo — organizadora (Meia Floripa) + coordenadora (via clube). Clube CPS: R$1.128 a receber (3 eventos afiliados).

**Arquivos (criar/editar)**
- `functions/src/finance/updateProfessionalBalance.ts`
- `firestore.rules` — `profissionais/{profId}/saldo` leitura só do próprio; escrita só Function.

**Passos de implementação**
1. Trigger onWrite de rollup de evento e de `parcerias.valorAReceber`.
2. Recalcular `organizadorAReceber`/`organizadorDisponivel` (RN-331) somando eventos do `ownerId`.
3. Somar `afiliadoAReceber` das `parcerias` dos clubes do profissional.
4. Gravar `saldoTotal` + `atualizadoEm` idempotentemente.

**Modelo de dados / contratos**
- Escreve `profissionais/{profId}/saldo/{unico}` (∑).

**Regras de negócio a respeitar**
- RN-331, RN-334; escrita só Function.

**Critérios de aceite (testáveis)**
- **Dado** organizador com R$X líquido a receber e coordenador com R$Y de afiliação, **quando** a Function roda, **então** `saldoTotal = X + Y` (RN-334).
- **Dado** repasse ainda não liberado, **quando** consolido, **então** entra em `organizadorAReceber` mas não em `organizadorDisponivel` (RN-331).

**Testes a escrever**
- integração (emulator): consolidação cruzando 1 evento + 1 clube; idempotência do recálculo; rule de leitura do próprio saldo.

**Definition of Done** — DoD API/Function.

**Fora de escopo**
Execução de saque (Won't).

#### LEELA-S902-T3 · Bloco de saldo consolidado na tela (organizador + coordenador)

- **Tipo:** screen · **Depende de:** T2, LEELA-S900-T1 · **Estimativa:** S

**Objetivo**
Exibir na tela Financeiro um bloco com o saldo consolidado, separando o que vem como organizador e como coordenador de clube, com status de liberação.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Financeiro.html` (KPI "Repasse previsto" + badge "Aguardando encerramento"; o saldo consolidado estende o conceito para os dois papéis).
- RNs: RN-331, RN-334, §2.16.
- Mocks: organizador (Meia Floripa) + coordenador (CPS, R$1.128 a receber).
- Componentes DS: Card flat, Badge (`alerta` aguardando / `vitoria` disponível), tooltip explicativo.

**Arquivos (criar/editar)**
- `apps/painel/app/financeiro/BalanceCard.tsx`
- `packages/api-client/src/finance.ts` — leitura de `profissionais/{profId}/saldo`.

**Passos de implementação**
1. Ler `profissionais/{profId}/saldo`.
2. Card com saldo total + duas linhas (organizador a receber/disponível; coordenador afiliação a receber).
3. Badges de status por linha (RN-331); tooltip com regra de liberação.
4. Estados vazio ("Nenhum valor a receber") / carregando / erro (§2.12).

**Modelo de dados / contratos**
- Lê `profissionais/{profId}/saldo/{unico}`.

**Regras de negócio a respeitar**
- RN-331, RN-334.

**Critérios de aceite (testáveis)**
- **Dado** saldo com parte de organizador e parte de afiliação, **quando** renderizo, **então** vejo as duas origens e o total = soma.
- **Dado** repasse não liberado, **quando** exibo, **então** badge "Aguardando encerramento".

**Testes a escrever**
- unit: view-model do saldo (origens + total + badges).

**Definition of Done** — DoD Tela/rota. Card flat (§2.16); a11y AA.

**Fora de escopo**
Cálculo (T2); saque.

---

### LEELA-S903 · Últimas transações + export CSV (LGPD 90 dias) · (de-para BH-800)

**Como** profissional, **quero** ver e exportar as transações do período, **para** conferir cada pagamento e conciliar fora da plataforma.

- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro.html` (bloco "Últimas transações" + "Ver todas →")
- **RNs:** RN-204, RN-144, §2.5, §2.12

**Critérios de aceite (Given/When/Then):**
- **Dado** transações no período, **quando** abro Financeiro, **então** vejo as últimas com atleta, modalidade, valor, status (badge) e data, na tabela densa (§2.5).
- **Dado** "Ver todas", **quando** clico, **então** abro a lista completa paginada com filtros por status e modalidade e contador "mostrando X de Y".
- **Dado** filtro sem resultado, **quando** aplico, **então** EmptyState "Nenhuma transação encontrada com os filtros aplicados" (§2.12).
- **Dado** o export, **quando** gero CSV, **então** recebo colunas de receita/taxa/líquido/repasse do período, limitado à retenção de 90 dias (RN-144).

**Tasks:** LEELA-S903-T1, LEELA-S903-T2

#### LEELA-S903-T1 · Tabela de transações (densa §2.5) + lista completa paginada com filtros

- **Tipo:** screen · **Depende de:** LEELA-S901-T1, LEELA-S900-T1 · **Estimativa:** S

**Objetivo**
Renderizar o bloco "Últimas transações" na tela e a rota "Ver todas" com tabela densa, paginação e filtros por status/modalidade.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Financeiro.html` (`.tx-card` com atleta+avatar, modalidade badge, valor, status badge, data; link "Ver todas").
- RNs: RN-204 (status), §2.5 (linha 64px, header uppercase), §2.12 (empty + contador).
- Mocks: transações canônicas — Rafael Guimarães (21km, R$189, confirmado), Camila Souza (10km, R$129, confirmado), Lucas Bittencourt (5km, R$99, pendente), Juliana Melo (21km, R$189), Beatriz Lima (21km, R$189).
- Componentes DS: Table densa (§2.5), Badge de status (`vitoria` confirmado / `alerta` pendente / `vulcao` cancelado), Avatar sm, EmptyState, paginação.

**Arquivos (criar/editar)**
- `apps/painel/app/financeiro/RecentTransactions.tsx` (bloco na tela)
- `apps/painel/app/financeiro/transacoes/page.tsx` (lista completa)
- `packages/api-client/src/finance.ts` — query paginada de `pagamentos` por período/filtros.

**Passos de implementação**
1. Bloco na tela: últimas N transações confirmadas/pendentes + link "Ver todas".
2. Rota `transacoes`: tabela densa (§2.5), filtros chip por status (RN-204) e modalidade, paginação.
3. EmptyState + contador "mostrando X de Y".
4. Badge de status mapeado (RN-204).

**Modelo de dados / contratos**
- Lê `eventos/{id}/pagamentos` (paginado) — nunca carrega tudo no cliente.

**Regras de negócio a respeitar**
- RN-204, §2.5, §2.12.

**Critérios de aceite (testáveis)**
- **Dado** filtro "pendente", **quando** aplico, **então** só linhas pendentes e o contador atualiza.
- **Dado** filtro sem resultado, **quando** aplico, **então** EmptyState correto.

**Testes a escrever**
- unit: mapeamento status→badge; view-model da linha.
- e2e (opcional): filtro + paginação atualiza contador.

**Definition of Done** — DoD Tela/rota. Tabela densa §2.5; paginação; empty state.

**Fora de escopo**
Export (T2).

#### LEELA-S903-T2 · Export CSV do financeiro (retenção 90 dias, LGPD)

- **Tipo:** api/function · **Depende de:** T1 · **Estimativa:** XS

**Objetivo**
Gerar export CSV das transações/consolidado do período, respeitando a janela de retenção de 90 dias (RN-144).

**Contexto & referências**
- BH-207 CA5 (exportação CSV). RNs: RN-144 (LGPD, 90 dias), RN-335.
- `definition-of-done.md` (Conformidade LGPD).

**Arquivos (criar/editar)**
- `functions/src/finance/exportFinanceCsv.ts` (ou route handler server-side)
- `packages/core/src/finance/csv.ts` — montagem das linhas.

**Passos de implementação**
1. Montar CSV: data, atleta, modalidade, forma, bruto, taxa, split, líquido, status.
2. Restringir ao período e à retenção de 90 dias (RN-144); autorizar só o owner.
3. Gerar download server-side (sem expor dado sensível em logs).

**Modelo de dados / contratos**
- Lê `pagamentos` do período; retorna arquivo CSV.

**Regras de negócio a respeitar**
- RN-144, RN-335; autorização por owner.

**Critérios de aceite (testáveis)**
- **Dado** período com transações, **quando** exporto, **então** o CSV traz uma linha por transação com colunas financeiras corretas.
- **Dado** dados além de 90 dias, **quando** exporto, **então** ficam de fora (RN-144).

**Testes a escrever**
- unit: montagem de linha CSV + escaping.
- integração: autorização por owner; corte de 90 dias.

**Definition of Done** — DoD API/Function + Conformidade LGPD.

**Fora de escopo**
Nota fiscal / conciliação bancária.

---

### LEELA-S904 · Máquina de estados de reembolso/cancelamento + execução de estorno + notificações (clawback RN-346)

**Como** Organizador de Evento (profissional), **quero** uma máquina de estados que processe solicitações de reembolso e cancelamento, execute o estorno e notifique as partes, **para** resolver o pós-venda com regra clara, rastro auditável e sem risco financeiro no split de afiliação.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel (fila do organizador) + backend
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro.html` (bloco de solicitações) + fila de análise do organizador (greenfield, sem HTML de protótipo)
- **RNs:** RN-341, RN-342, RN-345, RN-346, RN-337, RN-330, RN-204, RN-203, §2.12

**Critérios de aceite (Given/When/Then):**
- **Dado** uma solicitação, **quando** entra, **então** percorre a máquina `solicitado → (aprovado_auto | em_analise) → aprovado|recusado → estornado`, com cada transição registrada em `transicoes[]` para auditoria (RN-341).
- **Dado** a decisão de estorno, **quando** executada, **então** reusa RN-337 (reverte a inscrição para `cancelado`, RN-204, e reverte o split de afiliação) via `PaymentProvider.refund` (ADR-006).
- **Dado** a abertura de uma solicitação, **quando** `estado=solicitado`, **então** o organizador é notificado imediatamente (obrigatório) e o atleta recebe recibo; a cada transição, o atleta é notificado (RN-342).
- **Dado** que o pedido é em grupo (ADR-011), **quando** um reembolso/cancelamento é processado, **então** incide por inscrito dentro do pedido, nunca sobre o pedido inteiro.
- **Dado** a comissão do afiliado ainda em `previsto`, **quando** ocorre o estorno, **então** a reversão apenas desfaz o agregado a receber (RN-337).
- **Dado** a comissão do afiliado já em `repasseDisponivel`/paga, **quando** ocorre o estorno, **então** não se escreve saldo negativo direto: gera-se um lançamento de débito (clawback) auditável em `profissionais/{id}/saldo`, a compensar em repasses futuros (RN-346).
- **Dado** um afiliado com clawback pendente, **quando** o próximo repasse é calculado, **então** o débito é compensado antes da liberação e o repasse fica bloqueado até quitar o saldo devedor (RN-346).
- **Dado** a transferência de titularidade, **quando** o kit ainda não foi entregue, **então** recoleta o tamanho do novo titular; o chip só é vinculado na entrega (RN-203), sem impacto retroativo; se o kit já foi entregue, a transferência é bloqueada (RN-345).
- **Dado** escrita de estado ou financeiro, **quando** ocorre, **então** só acontece por Cloud Function (nunca pelo cliente).

**Tasks:** LEELA-S904-T1, LEELA-S904-T2, LEELA-S904-T3, LEELA-S904-T4

#### LEELA-S904-T1 · Subcoleção `reembolsos` + máquina de estados por inscrito + fila de análise do organizador

- **Tipo:** data-model + api/function · **Depende de:** LEELA-E04-S305 (política/janelas/SLA de reembolso), LEELA-S901-T1 (ledger `pagamentos`), ADR-011 (pedido em grupo) · **Bloqueia:** T2, T3 · **Estimativa:** M

**Objetivo**
Definir a subcoleção `eventos/{eventoId}/reembolsos`, a máquina de estados que rege cada solicitação (por inscrito dentro do pedido) e a fila de análise que o organizador usa para aprovar/recusar o que não caiu em `aprovado_auto`.

**Contexto & referências**
- Modelo: `modelo-de-dados-firestore.md` (§Agregados ∑; §Security Rules). Política de janela/corte/SLA vem de LEELA-E04-S305 (RN-338/339/340); S904 orquestra a máquina sobre essa política.
- Pedido em grupo: [[ADR-pedido-em-grupo]] (ADR-011) — reembolso incide por inscrito, e-mail ao responsável.
- RNs: RN-341 (máquina + `transicoes[]`), RN-204 (`cancelado`), §2.12.

**Arquivos (criar/editar)**
- `packages/core/src/finance/refund-machine.ts` — máquina de estados pura (`transition(estado, evento, contexto) -> estado`) + guardas de transição.
- `packages/core/src/finance/types.ts` — `Reembolso`, `EstadoReembolso`, `TransicaoReembolso`.
- `functions/src/finance/requestRefund.ts` — callable que cria `reembolsos/{id}` em `estado=solicitado` (por inscrito) e roteia para `aprovado_auto` ou `em_analise` conforme a política do evento (S305).
- `firestore.rules` — `eventos/{id}/reembolsos`: leitura pelo owner do evento e pelo atleta dono da inscrição; escrita de estado/financeiro só via Function.
- `modelo-de-dados-firestore.md` — documentar a subcoleção e os campos.

**Passos de implementação**
1. Tipar `Reembolso` (`inscritoId`, `motivo`, `estado`, `origem`, `valorSolicitado`, `valorEstornado?`, `decididoPor?`, `transicoes[]`, `criadoEm`) e o enum `EstadoReembolso`.
2. Implementar a máquina pura: transições válidas `solicitado→{aprovado_auto,em_analise}`, `em_analise→{aprovado,recusado}`, `aprovado|aprovado_auto→estornado`; qualquer transição inválida rejeita.
3. Registrar cada transição em `transicoes[]` (de→para, `quando`, `por` — RN-341) de forma append-only.
4. `requestRefund`: por inscrito do pedido (ADR-011); aplica a política de S305 para decidir `aprovado_auto` vs `em_analise`; grava `origem`.
5. Fila de análise do organizador = query dos `reembolsos` do evento em `estado=em_analise`, ordenada por `criadoEm`; ações aprovar/recusar disparam a transição via Function.

**Modelo de dados / contratos**
- Coleção: `eventos/{eventoId}/reembolsos/{reembolsoId}`. A execução financeira (estorno) é da T2.

**Regras de negócio a respeitar**
- RN-341, RN-204, ADR-011; Security Rules (escrita de estado só Function).

**Critérios de aceite (testáveis)**
- **Dado** uma transição inválida (ex.: `solicitado→estornado`), **quando** tentada, **então** a máquina rejeita e o estado não muda.
- **Dado** uma solicitação dentro da janela de arrependimento, **quando** criada, **então** roteia para `aprovado_auto`; fora dela (e antes do corte), para `em_analise`.
- **Dado** um pedido em grupo com 3 inscritos, **quando** peço reembolso de 1, **então** só aquele inscrito ganha um `reembolsos/{id}`; os outros seguem inalterados (ADR-011).

**Testes a escrever**
- unit: máquina de estados (transições válidas/ inválidas; `transicoes[]` append-only).
- integração (emulator): rules de leitura por owner/atleta e negação de escrita cliente; roteamento auto vs análise.

**Definition of Done** — ver `definition-of-done.md` (DoD API/Function + data-model; Security Rules por coleção criada). Sem `any` na máquina.

**Fora de escopo**
Execução do estorno e clawback (T2); notificações (T3); transferência (T4).

#### LEELA-S904-T2 · Execução de estorno via Function (reusa RN-337) + ramificação de clawback por estado do afiliado (RN-346)

- **Tipo:** api/function · **Depende de:** T1, LEELA-S901-T2 (`onPaymentWebhook`/reversão de rollup), LEELA-S902-T1 (split), LEELA-S902-T2 (saldo consolidado) · **Estimativa:** M

**Objetivo**
Ao atingir `estado=aprovado`/`aprovado_auto`, executar o estorno via `PaymentProvider.refund` (ADR-006), reverter inscrição e split (RN-337) e ramificar a reversão da comissão do afiliado pelo estado de liberação: `previsto` desfaz o agregado; `repasseDisponivel`/pago gera clawback auditável, nunca saldo negativo (RN-346).

**Contexto & referências**
- ADR-006 (`PaymentProvider.refund`). RN-337 já reverte inscrição + split; S904 orquestra a política sobre esse primitivo. `estrategia-testes.md` (cobertura máxima em pagamento: split, webhooks, reembolso).
- Objeção C2 (QA antagonista): reembolso pós-repasse sem guarda produz saldo negativo — clawback é a mitigação travada (RN-346).
- RNs: RN-337, RN-330 (taxa revertida junto no reembolso integral), RN-346, RN-204.

**Arquivos (criar/editar)**
- `functions/src/finance/executeRefund.ts` — trigger onWrite de `reembolsos` ao entrar em `aprovado`/`aprovado_auto`.
- `packages/core/src/finance/clawback.ts` — regra pura: dado o estado do split (`previsto`|`disponivel`|`pago`) e o valor, decide reverter agregado vs emitir lançamento de clawback.
- `firestore.rules` — lançamentos de clawback em `profissionais/{id}/saldo` só por Function.

**Passos de implementação**
1. Ao transicionar para estorno, chamar `PaymentProvider.refund` com o `providerTxId` do pagamento; idempotente pelo `reembolsoId`/`providerTxId`.
2. Reverter a inscrição para `cancelado` (RN-204) e reverter o rollup financeiro do evento (RN-337, reusando o caminho de reversão de S901-T2); reverter a taxa da plataforma (RN-330).
3. Ler o estado do split do afiliado: se `previsto`, decrementar `parcerias.valorAReceber` (desfaz agregado). Se `repasseDisponivel`/pago, **não** decrementar abaixo de zero: gravar `clawbacks[]` + incrementar `saldoDevedor` em `profissionais/{afiliadoId}/saldo` com referência auditável ao `reembolsoId` (RN-346).
4. No cálculo de repasse do afiliado (integra S902-T2), compensar `saldoDevedor` antes de liberar e bloquear o repasse até quitar (RN-346).
5. Gravar `valorEstornado` e a transição `→estornado` no `reembolsos/{id}`; reportar erro ao Sentry sem dado sensível.

**Modelo de dados / contratos**
- Escreve `eventos/{id}/reembolsos/{id}` (`estado`, `valorEstornado`, `transicoes[]`), reverte rollup do evento e `parcerias` ∑, e `profissionais/{id}/saldo` (`clawbacks[]`/`saldoDevedor`).

**Regras de negócio a respeitar**
- RN-337, RN-330, RN-346, RN-204; escrita financeira só Function; idempotência.

**Critérios de aceite (testáveis)**
- **Dado** um estorno com comissão em `previsto`, **quando** executa, **então** `parcerias.valorAReceber` cai o valor da comissão e nenhum clawback é criado.
- **Dado** um estorno com comissão já `repasseDisponivel`/paga, **quando** executa, **então** o saldo do afiliado não fica negativo e um `clawback` é registrado em `profissionais/{id}/saldo` (RN-346).
- **Dado** um afiliado com clawback pendente, **quando** o próximo repasse roda, **então** o débito é compensado antes da liberação e o repasse fica bloqueado até quitar (RN-346).
- **Dado** o mesmo estorno reprocessado, **quando** chega de novo, **então** agregados e clawback não duplicam (idempotência).

**Testes a escrever**
- integração (emulator): estorno com split `previsto` reverte agregado; estorno pós-repasse gera clawback sem saldo negativo; compensação em repasse futuro; idempotência; taxa revertida.

**Definition of Done** — DoD API/Function (idempotência, cobertura máxima em pagamento, Sentry sem dado sensível).

**Fora de escopo**
Máquina/roteamento (T1); notificações (T3); transferência (T4); execução de saque (Won't do épico).

#### LEELA-S904-T3 · Notificações de reembolso (organizador na abertura, atleta em cada transição)

- **Tipo:** api/function · **Depende de:** T1 · **Estimativa:** S

**Objetivo**
Disparar as notificações da máquina de reembolso: organizador na abertura (obrigatório) e atleta a cada transição, idempotentes por transição (RN-342).

**Contexto & referências**
- Pedido em grupo (ADR-011): o e-mail do atleta vai ao responsável pelo pedido quando a inscrição foi feita por terceiro.
- Padrão de disparo idempotente espelha `EmailProvider`/webhook de confirmação (LEELA-S1206, faixa RN-219). RNs: RN-342.

**Arquivos (criar/editar)**
- `functions/src/finance/notifyRefund.ts` — trigger onWrite de `reembolsos` que notifica conforme a transição.
- `packages/core/src/finance/refund-notifications.ts` — mapeia `estado`→destinatário(s)+template (puro).

**Passos de implementação**
1. Na criação (`estado=solicitado`): notificar o organizador (obrigatório) e dar recibo ao atleta/responsável (ADR-011).
2. A cada transição (`aprovado_auto`/`aprovado`/`recusado`/`estornado`): notificar o atleta/responsável.
3. Idempotência por transição (não renotifica no reprocessamento), registrando o disparo (subcoleção/flag de notificação).
4. Sem dado sensível no corpo/log.

**Modelo de dados / contratos**
- Lê `reembolsos/{id}` (`estado`, `transicoes[]`); registra idempotência do envio.

**Regras de negócio a respeitar**
- RN-342, ADR-011; sem dado sensível em log.

**Critérios de aceite (testáveis)**
- **Dado** abertura de solicitação, **quando** criada, **então** o organizador é notificado exatamente uma vez.
- **Dado** uma transição reprocessada, **quando** o trigger roda de novo, **então** não reenvia (idempotência).
- **Dado** pedido feito pelo responsável, **quando** o atleta seria notificado, **então** a notificação vai ao responsável (ADR-011).

**Testes a escrever**
- integração (emulator): notificação na abertura; uma notificação por transição; idempotência; roteamento ao responsável em pedido em grupo.

**Definition of Done** — DoD API/Function (idempotência de disparo; sem dado sensível).

**Fora de escopo**
Template visual do e-mail (herda `EmailProvider`/S1206); estorno (T2).

#### LEELA-S904-T4 · Subcoleção `transferencias` + `titularHistorico[]` + regras de kit/chip (RN-345)

- **Tipo:** data-model + api/function · **Depende de:** LEELA-E04-S305 (flag `permiteTransferencia`/janela/taxa), RN-203 (vínculo de chip na entrega) · **Estimativa:** M

**Objetivo**
Definir a subcoleção `eventos/{eventoId}/transferencias` e o histórico de titularidade append-only, aplicando as regras de kit/chip: recoleta de tamanho quando o kit não foi entregue, chip vinculado só na entrega, transferência bloqueada se o kit já saiu (RN-345). Opera por inscrito dentro do pedido (ADR-011).

**Contexto & referências**
- Política de transferência (flag, janela 72h, taxa) vem de LEELA-E04-S305 (RN-343). RN-203 (chip só na entrega). RN-345 (kit/chip na transferência).
- Objeção A5 (QA antagonista): transferência após check-in/vínculo de chip corrompe o resultado — daí o bloqueio quando o kit/chip já saíram.

**Arquivos (criar/editar)**
- `packages/core/src/finance/types.ts` — `Transferencia`, `TipoTransferencia`.
- `functions/src/finance/requestTransfer.ts` — callable que cria `transferencias/{id}` (por inscrito), valida janela/flag (S305) e o estado do kit.
- `firestore.rules` — `eventos/{id}/transferencias`: leitura owner/atleta; escrita só Function.
- `modelo-de-dados-firestore.md` — documentar a subcoleção e `titularHistorico[]`.

**Passos de implementação**
1. Tipar `Transferencia` (`tipo`(titularidade/ingresso), `inscritoId`, `titularAnteriorRef`, `novoTitularDados`, `diffCobrada?`, `estado`, `criadoEm`).
2. Validar autorização (flag `permiteTransferencia` + janela de S305) e o estado do kit: se entregue, bloquear (RN-345).
3. Se o kit não foi entregue: recoletar o tamanho do novo titular em `novoTitularDados`; o chip permanece não vinculado até a entrega (RN-203) — sem impacto retroativo.
4. Registrar a troca em `inscritos.titularHistorico[]` (append-only) mantendo o pagamento na mesma inscrição.
5. Para `tipo=ingresso` (upgrade), calcular `diffCobrada` pelo lote vigente (RN-344) — cobrança fica com o fluxo de checkout, aqui só o registro.

**Modelo de dados / contratos**
- Coleção: `eventos/{eventoId}/transferencias/{transferenciaId}`; estende `inscritos` com `titularHistorico[]`.

**Regras de negócio a respeitar**
- RN-345, RN-203, ADR-011; escrita só Function.

**Critérios de aceite (testáveis)**
- **Dado** kit ainda não entregue, **quando** transfiro a titularidade, **então** o tamanho do novo titular é recoletado e `titularHistorico[]` ganha um registro; o chip segue não vinculado.
- **Dado** kit já entregue, **quando** tento transferir, **então** a operação é bloqueada com motivo explícito (RN-345).
- **Dado** um pedido em grupo, **quando** transfiro um inscrito, **então** só aquele inscrito muda de titular (ADR-011).

**Testes a escrever**
- unit: guarda de kit entregue (bloqueio); montagem de `titularHistorico[]`.
- integração (emulator): rules por owner/atleta; recoleta de tamanho; bloqueio pós-entrega.

**Definition of Done** — DoD API/Function + data-model. `titularHistorico[]` append-only; sem `any`.

**Fora de escopo**
UI de transferência no app (LEELA-S1316); cobrança da diferença (fluxo de checkout); estorno (T2).

---

## Ordem sugerida

`S901 (modelo + agregação + cálculo puro) → S902 (split + saldo consolidado) → S900 (tela: KPIs, gráficos) → S903 (transações + export)`. A tela (S900/S903) consome os agregados mantidos por S901/S902; começar pelo backend garante que a UI leia números íntegros desde o primeiro render.

## Rastreabilidade

- **De-para:** BH-800 (Financeiro do profissional, `Financeiro.html`, L) → LEELA-E09 · stories LEELA-S900…S903.
- **Consolida** conceitos de BH-207/BH-302 (financeiro do evento) na visão do profissional, sem duplicar a tela por-evento (que fica em E03/E04).
- **Depende** de `PaymentProvider` (ADR-006), agregados por Function (ADR-005, `modelo-de-dados-firestore.md`) e DS (E01).
