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
- ~~**RN-211** — "sem kit" é válido e o preço aceita valor negativo (desconto); a soma financeira respeita valores negativos.~~ **⛔ REVOGADA em 2026-08-05 (D-0805-7 · lane SPEC-SEM-KIT); substituída pela RN-506**, que dá piso zero ao preço do kit. Cópia herdada — o enunciado canônico e a revogação vivem em [[LEELA-E03-operacao-evento]]. **Nenhum número já apurado muda**: `agregarFinanceiro` declara por escrito que nunca deriva receita de preço de kit (`functions/src/eventos/agregarFinanceiro.ts:24-25`), e lê `eventos.receitaConfirmada`, que nasce no fluxo de pagamento.
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

Novas (ESTORNO-ADMIN — refund assíncrono, porta admin e retardatário; decisões 42–46 + item 27 da rodada DEC-0727D; delta completo em `02-rodadas/2026-07-28-estorno-admin/02-rns-delta.md`):
- **RN-370 · Carimbo antes do POST.** O ledger de estorno (`pagamentos/{id}/estornos/{inscritoId}`) grava o compromisso e o carimbo `enviando` numa transação COMMITADA antes do `POST /refund` — se a Function morrer, o efeito no gateway fica registrado como desconhecido, nunca invisível.
- **RN-371 · Nunca re-enviar sobre carimbo vivo.** `enviando`/`solicitado`/`gateway_sem_resposta`/`divergencia_valor`/`rejeitado_gateway` bloqueiam novo POST da mesma chave. Timeout = efeito possível = bloqueio até o webhook ou conferência manual no extrato do gateway. Mata o estorno duplo provado em ASAASTETO-REV §V4.
- **RN-372 · O webhook é a autoridade.** Refund `pending` do gateway NÃO aplica efeito local; quem fecha a saga (ledger `aprovado` + efeitos) é a entrega `PAYMENT_REFUNDED` (decisão 46). O ramo `refunded` da porta corre ANTES da guarda de estado final.
- **RN-373 · Janela de arrependimento pelo relógio da compra.** Os 7 dias do art. 49 contam da compra (`criadoEm` do pedido), com relógio injetado — derivação pura, testável.
- **RN-374 · Destino da taxa de serviço por rota.** Dentro da janela (rota automática) a taxa REPASSADA volta ao comprador; fora dela (em análise) a taxa fica retida (decisão 42). A tela do comprador diz o que volta e o que não volta.
- **RN-375 · Abertura é a porta única.** Todo estorno pelo painel entra por `requestRefund` (política decide a rota: automática dentro da regra, fila `em_analise` fora); o primitivo `estornarInscricao` não é mais chamado direto da tela.
- **RN-376 · Furar o corte de véspera.** Só `platform_admin`, só com `motivoOverride` — o furo fica NO DOC do reembolso (`overrideCorte`, `motivoOverride`, `overridePor`, `corteHorasNoOverride`) e a fila denuncia a origem (decisão 44). Organizador com a flag leva permission-denied.
- **RN-377 · Cancelar sem estornar.** Ação distinta e auditada (`cancelarInscricao`): tira o inscrito (`confirmado|pendente → cancelado`) e o dinheiro FICA (cortesia/no-show/fraude — decisão 45). Admin cancela qualquer coisa; organizador só fora do corte de véspera.
- **RN-378 · Trilha do cancelamento.** Todo cancelamento sem estorno grava `eventos/{id}/cancelamentos/{inscritoId}` com `trilha` (`organizador`|`plataforma`), motivo, autor e `dinheiroDevolvido: false` — quem mandou fica no doc, não só no log.
- **RN-379 · Estorno automático do retardatário (item 27).** Pagamento confirmado APÓS o cancelamento (efeito `retardatario_pos_cancelamento` no ledger de entregas) dispara estorno TOTAL automático pela MESMA máquina de carimbo (RN-370/371/372), com ledger próprio `pagamentos/{id}/estornosOrfaos/total` — no máximo um por pagamento, `amount` omitido no gateway. **A devolução do órfão é INTEGRAL, taxa de serviço inclusa, e fica FORA da régua da RN-374:** ali a taxa remunera um serviço prestado, e aqui não houve serviço nenhum — a inscrição já estava cancelada quando o dinheiro entrou. Reter qualquer parte seria cobrar por nada. Por isso o refund é do pagamento inteiro (`amount` omitido), e não a composição face + taxa por inscrito da rota normal. Escrito porque o código sempre fez assim e a regra não estava em lugar nenhum (achado E-5 da ESTORNO-REV).
- **RN-380 · Extrato e varredura do retardatário.** A detecção grava `estornosOrfaosPendentes/{pagamentoId}` NA MESMA transação da entrega; a varredura agendada (15 min) conta, alerta (`estornos_orfaos_pendentes`) e re-dispara com segurança o que o gatilho inline não fechou. Detecção nunca des-resolve extrato resolvido. O valor que a varredura re-dispara é o mesmo da RN-379 — integral, sem recorte de taxa: a régua do art. 49 não entra por esta porta, nem no gatilho inline nem no re-disparo.

Regras de design/UX herdadas: §2.5 (tabela densa, linha 64px — usada em "últimas/todas as transações"), §2.12 (estados vazio/erro/carregando sempre, feedback via Toast), §2.16 (flat, sem borda decorativa em cards de KPI).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. O épico é majoritariamente **leitura de agregados** mantidos por Function; introduz um ledger de pagamentos e dois agregados novos.

- `eventos/{eventoId}` — consome ∑`receitaConfirmada`, `qtdInscritos` (já previstos). Novos campos de rollup financeiro (∑, por Function): `receitaBruta`, `taxaPlataforma`, `receitaLiquida`, `repassePrevisto`, `repasseDisponivel`, `porModalidade{}`, `porFormaPagamento{}`.
- `eventos/{eventoId}/inscritos/{inscritoId}` — consome `kit`, `preco`, `status`(RN-204), `modalidade`.
- **`eventos/{eventoId}/pagamentos/{pagamentoId}` (NOVA)** — ledger criado/atualizado apenas pela Function de webhook: `inscritoId→inscritos`, 🔁`atletaNome`, `valorBruto`, `taxaPlataforma`, `afiliadoId?`, `afiliadoTipo?`(clube/promotor), `splitValor?`, `valorLiquido`, `formaPagamento`(pix/cartao), `parcelas?`, `status`(confirmado/pendente/cancelado/reembolsado — RN-335), `providerTxId`(chave de idempotência — RN-333), `criadoEm`.
- `clubes/{clubId}/parcerias/{parceriaId}` — consome ∑`conversoes`, ∑`valorAReceber` (já previstos; alimentados pelo mesmo evento de split — RN-332).
- **`profissionais/{profId}/saldo/{unico}` (NOVA, ∑)** — agregado consolidado mantido por Function: `organizadorAReceber`, `organizadorDisponivel`, `afiliadoAReceber`, `saldoTotal`, `atualizadoEm` (RN-334). ➕ para clawback (RN-346): `saldoDevedor` e `clawbacks[]` (lançamentos de débito auditáveis quando o estorno atinge comissão já repassada/paga — compensados em repasses futuros, nunca saldo negativo direto; enquanto pendente, bloqueia liberação do próximo repasse).
- **`eventos/{eventoId}/reembolsos/{reembolsoId}` (NOVA)** — solicitação de reembolso/cancelamento POR INSCRITO dentro do pedido (ADR-011); estado/financeiro escritos só por Function: `inscritoId→inscritos`, `motivo`, `estado`(solicitado/aprovado_auto/em_analise/aprovado/recusado/estornado — RN-341), `origem`(atleta/organizador/**plataforma** — a trilha do operador vira a origem, ESTORNO-ADMIN), `valorSolicitado`, `valorEstornado?`, `decididoPor?`, campos do furo do corte quando houver (`overrideCorte`, `motivoOverride`, `overridePor`, `corteHorasNoOverride` — RN-376), `transicoes[]`(auditoria de cada passo da máquina: de→para, quando, por quem — RN-341), `criadoEm`.
- **`pagamentos/{pagamentoId}/estornos/{inscritoId}` (NOVA)** — ledger DURÁVEL do estorno por inscrito (RN-370/371/372): `status`(pendente/enviando/solicitado/gateway_sem_resposta/divergencia_valor/rejeitado_gateway/aprovado), `valorCentavos` congelado, `refundId?`, `tentativasEnvio`. Escrita só Function; leitura de gestão pelas Rules.
- **`pagamentos/{pagamentoId}/estornosOrfaos/total` (NOVA)** — ledger do estorno TOTAL do pagamento retardatário (RN-379); docId fixo = no máximo um por pagamento. Sem Rule de cliente (deny-by-default).
- **`estornosOrfaosPendentes/{pagamentoId}` (NOVA, top-level)** — extrato de retardatários (RN-380): `resolvido`, `entregas`, `amountCentavos`, `chargeId`, `detectadoEm`. Nasce na MESMA tx da entrega de webhook; consumido pela varredura agendada. Sem Rule de cliente.
- **`eventos/{eventoId}/cancelamentos/{inscritoId}` (NOVA)** — trilha do cancelamento SEM estorno (RN-377/378): `motivo`, `statusAnterior`, `trilha`(organizador/plataforma), `por`, `papel`, `dinheiroDevolvido: false`, `criadoEm`.
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
3. Suportar valor negativo na **leitura** de documento legado (a RN-211 foi revogada em 05/08 pela RN-506, que dá piso zero ao preço de kit novo; o predicado de leitura continua liberal por Postel).

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

> **Status 2026-07-17 (O3-L1, backend Fable `bebbc0a`):** T1-T4 ATERRISSADOS com review antagonista (APPROVE-COM-FIXES aplicados). Desvios/premissas registrados: (a) execução e notificações são SÍNCRONAS a partir das transições (não trigger onWrite) — testável no emulator, idempotência explícita; (b) **clawback RN-346 = N/A** enquanto o split de afiliação estiver CORTADO do produto (RN-337 vigente em `estornarInscricao.ts`) — reativar afiliação REABRE esta RN; (c) notificações = registro idempotente no log FABLE-G (envio físico depende do provider de e-mail transacional — ação externa); (d) troca de ingresso (T4 tipo `ingresso`) SÓ REGISTRA com `diffCobrada` do lote vigente — aplicação+cobrança são do fluxo de checkout (mudar `modalidade` fora dele corromperia vendidos/capacidade por lote); (e) Rules congelam `atletaNome`/`atletaId`/`modalidade` para cliente (review H1) — mudança de titular SÓ via `requestTransfer`. Resta **T5** (fila no painel, Opus).

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

> História nova da rodada TAXA-FLEX (Vitor, 2026-07-19). Detalhe em `02-rodadas/2026-07-19-taxa-flex/`; regras em §"Regras de negócio novas (TAXA-FLEX...)" abaixo (RN-179/181/182/183). Molde igual ao de S1900 (E19).

### LEELA-S905 · Cálculo, congelamento e estorno da taxa por meio (percentual + fixo) · (de-para novo · TAXA-FLEX) · ✅ ENTREGUE

**Como** plataforma, **quero** calcular a taxa por meio (percentual + fixo), congelá-la na compra e ratear o fixo no estorno, **para** que o dinheiro feche cent-exato e mudar a tabela nunca reprecifique pedido feito.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Core/Functions financeiro (efeito em E12 exibição) · **RNs:** RN-179 (congelamento), RN-180 (cálculo), RN-181 (estorno), RN-182 (repasse), RN-183 (rounding/fonte única)
- **Origem:** rodada TAXA-FLEX (Vitor, 2026-07-19). A tabela (dona) é RN-178/E04; aqui vive o **cálculo, o carimbo e o estorno**. Fila `03-fila-codigo (j)` — executável (a lane CLAIM-FIX que segurava o território do checkout aterrissou). É dinheiro ⇒ rota Fable + review antagonista.

**Critérios de aceite (Given/When/Then):**
- **Dado** `computeTaxaPlataforma(faceCentavos, {percentualBp, fixoCentavos})`, **quando** calculo, **então** usa **half-up em centavos inteiros**, fonte única, **sem constante hardcoded** (RN-183/404); `computeSaleState`/`computeLiquidoProdutor` passam de percentual único para percentual + fixo por meio.
- **Dado** o ato da compra, **quando** o pagamento confirma, **então** o par `{percentual, fixoCentavos}` do meio escolhido é resolvido (override > global) e **carimbado** (`conciliacao.taxaPct/taxaFixa/taxaValor` + cotação) na **mesma transação**; mudar a tabela depois **não reprecifica** o pedido (RN-179).
- **Dado** um estorno, **quando** rateio, **então** o componente **fixo** entra por linha **como a taxa percentual entra hoje** (`itens[].taxaRepassada`, maior resto, ∑ = taxa carimbada) — RN-181; o **SE** devolve a taxa fica na fronteira aberta BENCHMARK-REEMBOLSO (não decidido aqui).
- **Dado** o repasse, **quando** calculo o "a receber", **então** = `face − taxa(meio)` em **absorvida** e = `face` em **repassada** (RN-182); o ledger usa só o `valorFace`.

**Tasks:** `S905-T1` (core `computeTaxaPlataforma` half-up + estender `computeSaleState`/`computeLiquidoProdutor` para pct + fixo por meio — RN-180/182/183 — `ec9b248`+`1d71b41`) ✅, `S905-T2` (congelamento: linha resolvida no ATO DA COMPRA carimbada em `pagamento.taxaCongelada` na tx de criação + `conciliacao.taxaPct/taxaFixa/taxaValor` escrita na tx da CONFIRMAÇÃO copiando o congelado — padrão COMF2, RN-179 — `335622e`) ✅, `S905-T3` (estorno: fixo no rateio `itens[].taxaRepassada` por maior resto, ∑ = taxa carimbada — RN-181, mecânica REUSADA, só prova — `c14a084`) ✅. **Status:** ✅ ENTREGUE 2026-07-19 (lane TAXAFLEX): agregado E09 híbrido por carimbos (`242cef7` paga F2 da review — estorno parcial não engole a imputação legada) + janela D+N carimbo-aware; repasse mode-aware provado nos 2 modos. Review antagonista Fable APROVADO COM FIXES (todos pagos). Report `outputs/leela-build-2d6ee98d/TAXA-FLEX-REPORT.md`.

---

## Ordem sugerida

`S901 (modelo + agregação + cálculo puro) → S902 (split + saldo consolidado) → S900 (tela: KPIs, gráficos) → S903 (transações + export)`. A tela (S900/S903) consome os agregados mantidos por S901/S902; começar pelo backend garante que a UI leia números íntegros desde o primeiro render.

## Rastreabilidade

- **De-para:** BH-800 (Financeiro do profissional, `Financeiro.html`, L) → LEELA-E09 · stories LEELA-S900…S903.
- **Consolida** conceitos de BH-207/BH-302 (financeiro do evento) na visão do profissional, sem duplicar a tela por-evento (que fica em E03/E04).
- **Depende** de `PaymentProvider` (ADR-006), agregados por Function (ADR-005, `modelo-de-dados-firestore.md`) e DS (E01).

## Regras de negócio novas (Vitor 2026-07-12 — ratificadas em conversa, números propostos)

- **RN-347 (proposta) · Modo da taxa afeta o "a receber".** O cálculo de repasse respeita o modo configurado no evento (E04/`commercialTerms`): **incorporada** → "valor a receber" = face − taxa (a taxa é débito no fluxo do organizador); **repassada** → "valor a receber" = face (a taxa nunca foi dinheiro dele e NÃO aparece no seu fluxo de caixa). O FIX 3 atual assume um único modo — corrigir quando a máquina de repasses aterrissar.
  - *Status 2026-07-13 (EVENTO-CAMPOS, backend):* **ATENDIDA no saldo** — `evento.taxaModo` persiste por evento e os consumidores E09 leem o modo: `agregarFinanceiro` deriva `receitaLiquida` via `computeLiquidoProdutor(bruto, pct, modo)` ('repassada' ⇒ líquido = bruto) e a janela D+N do `updateSaldoRepasse` usa o modo do evento do pagamento. Evento legado sem o campo ⇒ 'incorporada' (comportamento vigente).
- **RN-348 (proposta) · Disponibilização D+N (default D+2 úteis) + retenção % — ajustáveis por cliente.** "Valor disponível" = só fundos que já passaram da janela D+N; "Valor a ser disponibilizado" = retenção (default 15%) + fundos ainda dentro da janela. Config por-tenant em `commercialTerms` (D+N e % de retenção). Hoje o FIX 3 mostra aproximação estática (disponível = total − retenção); a janela D+N entra com a máquina de repasses (S902).
- **RN-349 (proposta, Vitor 2026-07-13) · Repasses POR EVENTO:** a tela de Repasses exibe a visão quebrada por evento (vendido/disponível/retido e repasses associados a cada evento), não só o agregado do tenant. O agregado continua existindo (fonte do saldo); a UI ganha o eixo por-evento.
- **Redefinição da aba "Financeiro" (Vitor 2026-07-13):** a entrada "Financeiro" do menu do profissional vira ANÁLISE de desempenho (ver E11) — desempenho de vendas, perfil de compradores (idade/sexo), modalidades com mais inscritos, tamanhos mais pedidos. O financeiro operacional (por evento) continua na aba Financeiro DO EVENTO; repasses continuam em Repasses (com RN-349).

## Regras de negócio novas (R9 · revisão UX do Vitor 2026-07-18)

- **RN-358 · Repasses = visão consolidada de todos os eventos (explícito na UI).** A rota `/financeiro/repasses` declara em título/subtítulo/EmptyState que é o consolidado de todos os eventos do organizador; os 3 cards de saldo seguem como saldo autoritativo (∑ do servidor, `saldo/current`). Story `S-R9-03`. Spec: `02-rodadas/2026-07-18-ux-review/`.

## Regras de negócio novas (TAXA-FLEX · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-taxa-flex/`. A taxa da plataforma vira **percentual + fixo por meio de pagamento** (tabela por meio, RN-178/E04), congelada na cotação. As regras abaixo cravam o cálculo, o congelamento, o estorno do componente fixo e o repasse mode-aware. Delta em `02-rns-delta.md`.

- **RN-179 · Congelamento da taxa na cotação/pedido (dona = E09).** No ato da compra, o par `{percentual, fixoCentavos}` do **meio ESCOLHIDO** é resolvido (override do organizador > global, RN-178) e **carimbado** no pagamento — nos campos **já existentes** `conciliacao.taxaPct`/`taxaFixa`/`taxaValor` (`modelo-de-dados-firestore.md:92`) — e na cotação/pedido, na **mesma transação da confirmação**, no **mesmo padrão de congelamento da comissão do COMF2** (config vigente congelada no doc; mudança só afeta futuras) e do `taxaModo` RN-347. **Mudança da tabela nunca reprecifica pedido existente**; replay não recomputa contra tabela nova.
- **RN-180 · Fio do `taxaModo` RN-347, por meio de pagamento.** `taxa(meio) = round(face × percentual) + fixoCentavos`. **repassada** → comprador paga `face + taxa(meio)` (varia por meio, exibido por opção no checkout — E12); líquido do organizador = face. **incorporada/absorvida** → total do comprador = face (não muda por meio); líquido do organizador = `face − taxa(meio)` (varia por meio). Estende `computeSaleState`/`computeLiquidoProdutor`, hoje com taxa percentual única, para **percentual + fixo por meio**.
- **RN-181 · Estorno: componente fixo no rateio cent-exato.** O estorno devolve o **PAGO** pelo inscrito com o rateio vigente; o **fixo** entra por linha **exatamente como a taxa percentual entra hoje** — `itens[].taxaRepassada`, método do **maior resto**, proporcional ao `valorFinal` da linha, ∑ das linhas = taxa carimbada (RN-179). Reusa a mecânica de estorno já documentada em RN-347 (devolve `valorFinal + taxaRepassada` da linha; contabilidade do organizador só face). **Fronteira NÃO decidida aqui:** SE o reembolso devolve ou não a taxa ao comprador = decisão AINDA aberta do Vitor — lane **BENCHMARK-REEMBOLSO** (`outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`; item 23 de `DECISOES-ABERTAS`, pendente-de-confirmação). RN-181 crava só o COMO ratear o fixo; o SE não é decidido.
- **RN-182 · Contabilidade/repasse mode-aware por meio.** Líquido a receber do organizador = `face − taxa(meio)` quando **absorvida**; = `face` quando **repassada** (o comprador pagou a taxa por fora; a taxa vai à Leela e nunca entra no "a receber"). O ledger do organizador usa **só o face** (`valorFace`). Confere contra o fio RN-347 (mesma regra, taxa agora resolvida por meio via RN-180 em vez de percentual único). A janela D+N e a retenção (RN-348) operam sobre esse líquido já resolvido por meio.
- **RN-183 · Rounding único + fonte única no core.** Arredondamento único = **half-up em centavos inteiros** (convenção da casa — COMF2 já usa `centavos × basis-points inteiros, half-up`; RN-347 opera em centavos). Fonte de cálculo = função `computeTaxaPlataforma(faceCentavos, {percentualBp, fixoCentavos})` no core, ao lado de `computeLiquidoProdutor`, **sem constante hardcoded** (RN-404); a fonte de dados é a tabela (RN-178). Mesmo padrão de fonte única do `PIX_EXPIRACAO_SEGUNDOS`.
- *Ampliada · RN-330:* a **fonte** da taxa da plataforma passa da constante/`platformFeePct` único para a **tabela por meio** (RN-178); o cálculo por pagamento usa a linha do meio do próprio pagamento. RN-348 (D+N/retenção) inalterada.
- *Premissa a ratificar (c):* a **base da comissão de afiliado permanece FACE** (RN-310: percentual sobre FACE OU valor fixo por inscrição), coerente com a contabilidade do organizador em FACE. A taxa-flex não muda a base. Ver `DECISOES-ABERTAS`.

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

Este épico entra na **Onda 4 · item 1** (caminho do dinheiro em curso). Resta uma task, e ela é a que faltava para o pós-venda ter operador:

- **S904-T5** · fila de reembolso e transferência no painel financeiro. A máquina de estados (T1-T4) está aterrissada e auditável; falta a superfície pela qual o organizador aprova ou recusa o que não caiu em `aprovado_auto`. Rota **opus** xhigh, review antagonista obrigatório (dinheiro). Passo a passo, cuidados e critério de pronto em `02-rodadas/2026-07-19-espec-sweep/02-caminho-do-dinheiro.md` §Bloco B.
- **S905** (cálculo/congelamento/estorno da taxa) — ✅ entregue na TAXA-FLEX.

**Decisão aberta que toca este épico:** a fronteira do reembolso (item 23) — se o reembolso devolve a taxa de serviço ao comprador. A RN-181 crava o rateio; o *se* segue pendente. Não bloqueia S904-T5, desde que a tela não afirme nada sobre devolução de taxa até a decisão sair. Ver `02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md`.

---

## Regras de negócio novas (IA-MENU · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-ia-menu/`. Verbatim dele: *"deixando a parte repasses como uma subdivisão de eventos com a visão macro. Já que o caixa de eventos é separado dos repasses que poderão vir futuramente dos clubs, caso eles sejam pagos."* Desenho completo em `00-decisao.md`; mapa das rotas em `01-mapa-de-para.md`.

- **RN-366 · O repasse pertence à origem que gerou o dinheiro.** Repasse deixa de ser assunto guarda-chuva de um item "Financeiro" e vira **subdivisão da origem**: hoje **Eventos › Repasses** (`/eventos/repasses`, com a visão macro); amanhã, se o clube pago existir, **Clubs › Repasses**, sem herdar nada de eventos. Três consequências, todas ratificadas pelo Vitor na mesma noite:
  - **Dados bancários são do titular, não da origem.** O cadastro sai de dentro de Repasses e vira **Configurações › Dados de recebimento** (`/conta`), uma vez só. A **RN-354 não muda** — o callable continua devolvendo apenas o mascarado, nunca o número em claro. Muda a superfície, não a regra.
  - **O saldo permanece único.** A **RN-334** (saldo consolidado: repasse como organizador + comissão como afiliado) e a **RN-346** (clawback, hoje por profissional) seguem exatamente como estão. O saque acontece **na origem**, sobre esse saldo único. A origem é dimensão do lançamento, não do titular — e essa é a razão pela qual saldo por origem com conta bancária por origem foi descartado: reescreveria RN-334 e RN-346 sem nenhuma dor real que justifique.
  - **A visão consolidada mora na visão macro de Eventos**, junto do eixo por evento — não num lugar novo. É onde a RN-358 já a colocou.

### Repasse individualizado por evento — reconciliação com a RN-349, não regra nova

O Vitor reforçou o requisito: *"cada evento seu repasse, e deve ter o registro individualizado e controle. Embora ainda seja possível termos a visão geral e consolidada."*

**Isso já é lei desde 2026-07-13.** É a **RN-349** (visão quebrada por evento: vendido, retido, disponível e os repasses associados a cada um) somada à **RN-358** (o consolidado declarado explicitamente na mesma superfície). Nenhuma RN nova nasce daqui — e o inventário do código confirma que a promessa está construída:

- quebra por evento na tela (`RepassesPorEvento`, reader `repassesPorEvento`);
- histórico agrupado pelo campo `eventoId` do próprio lançamento — associação exata, fim da heurística;
- solicitação de repasse **com o evento escolhido** (`requestRepasse` recebe `eventoId`; o servidor valida que o evento é do tenant e recusa o que não for, com teste de ataque cobrindo evento inexistente);
- os três cards de saldo como número autoritativo do servidor (`saldo/current`).

**Portanto o delta desta rodada é de navegação, não de domínio:** a tela inteira muda de `/financeiro/repasses` para `/eventos/repasses` e nenhum contrato de dado é tocado.

**A lacuna real, e ela está do outro lado.** A aba de Caixa do evento (E03 · S207) mostra "repassado R$ 0,00" com aviso honesto, porque nunca leu o ledger de repasse — a informação existe, mas só na tela consolidada. Com "registro individualizado e controle" ratificado, isso vira delta explícito: a Caixa do evento passa a mostrar a linha de repasse **daquele** evento, reusando o reader que já existe. É reuso de leitor, não backend novo. Dono da execução: E03 (ver lá).

**Efeito de UI que a execução não pode perder:** hoje o modal de saque só é montado quando há dados bancários salvos, porque o formulário está na mesma tela. Com o cadastro em Configurações, a proximidade acaba. A tela de Repasses continua exigindo o mesmo pré-requisito e, quando faltar, **mostra o caminho** em vez de abrir um modal que o servidor recusaria. A regra do servidor não muda; muda quem avisa.

#### ⛔ PONTA SOLTA · P-IAMENU-2 (2026-07-26) — o "disponível" da Caixa não abate o repasse do evento

Levantado pela **review antagonista da IA-MENU** (achados A-2/A-7) depois que a Caixa passou a ler o ledger.

`derivarRepasse` (`apps/painel/src/routes/eventos/_lib/financeiro.ts`) calcula `disponivel = receitaTotal − retenção − repassado` com **`repassado` cravado em `0`**, e devolve `repasseIndisponivel: true`. Isso era coerente enquanto a Caixa exibia R$ 0,00: os quatro cards fechavam entre si. Com o repasse REAL do ledger ao lado, **deixaram de fechar** — a tela pode mostrar "repassado R$ 500" e "disponível" calculado como se nada tivesse saído.

**Contornado, não resolvido.** O fix da lane de review (`6c5f719`) fez o card **declarar** a estimativa quando há repasse vivo — mesma disciplina que a visão macro já pratica na coluna "disponível estimado" (que também não abate o comprometido nem a janela D+N, e diz isso). E o CSV exportado dessa tela passou a levar a **mesma Σ** que a tela mostra, fechando um buraco pior: até então a planilha de conciliação dizia `0` enquanto a tela dizia o valor real.

**O que fica em aberto, para dono:** (a) o `disponivel` por evento deveria abater os repasses vivos daquele evento, ou permanecer estimativa declarada? O número **autoritativo** é do servidor (RN-352, `saldo/current`), e recalcular no cliente é exatamente o que a RN-352 proíbe — então a resposta provável é "permanece estimativa", mas isso precisa ser dito. (b) `repasseIndisponivel` e o docblock de `derivarRepasse` seguem descrevendo o mundo pré-T7 e **não são mais lidos por ninguém** além do próprio teste unitário: reconciliar exige alterar uma asserção existente, o que a lane de review não faz sem dono.

### Reconciliação com a "Redefinição da aba Financeiro" (Vitor, 2026-07-13)

Aquela decisão dizia: o item "Financeiro" do menu vira ANÁLISE (E11); o financeiro operacional fica na aba do evento; repasses ficam em Repasses. **A decisão de hoje é a continuação dela, e a completa:**

| 2026-07-13 | 2026-07-19 |
|---|---|
| item "Financeiro" = ANÁLISE | o item "Financeiro" **morre**; a análise vira `CRM › Visão geral` (RN-823) |
| financeiro operacional na aba do evento | a aba passa a se chamar **Caixa** e ganha a linha de repasse do próprio evento |
| repasses em Repasses (com RN-349) | Repasses viram **subdivisão de Eventos**; RN-349 e RN-358 inalteradas |

As duas versões não convivem soltas: a de 13/07 fica como o passo anterior, e o que vale é a tabela acima.

### Execução

`IAM-T4` (repasses migram para Eventos, com a SubNav do hub) e `IAM-T5` (dados de recebimento em Configurações + o aviso do pré-requisito), ambas **opus xhigh com review antagonista** — é a superfície pela qual o organizador tira dinheiro do sistema. Detalhe em `02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`. **Nenhuma toca `functions/`, `firestore.rules` ou callable**; se precisar, saiu do escopo e volta para a spec.

### Apêndice de execução IA-MENU (2026-07-26 · lane IAMENU-EXEC)

**RN-366 está construída.** `IAM-T4` `cee7bbe` · `IAM-T5` `14f059e`, ambas opus xhigh. ⚔ reviews antagonistas **pendentes**.

**A migração (T4).** `routes/financeiro/repasses/**` inteiro virou `routes/eventos/repasses/**`, e `/eventos/repasses` nasceu **fora de `:slug`**, sob a `EventosHubLayout` nova (SubNav Eventos | Repasses, reusando o SubNav do DS com `divider` — mesmo componente e mesmas props da área Financeiro que morreu, para a troca de casa não virar troca de aparência). RN-334, RN-349 e RN-358 seguem palavra por palavra: o delta foi de endereço.

**Prova do gate do move:** `git diff -M --stat` mostra **0 inserções e 0 deleções nos 11 arquivos de teste movidos** (SaldoCards, HistoricoRepasses, RepassesPorEvento, SolicitarRepasseModal, DadosBancariosSection, session e os 5 de `_lib`). Mascaramento RN-354 e a associação exata por `eventoId` chegaram intactos.

**Colisão de rota fechada.** `/eventos/repasses` × `/eventos/:slug` tem precedência declarada **e testada sobre a árvore de rotas real**: um evento de slug `repasses` não sequestra a subdivisão, e a subdivisão não sequestra `/eventos/repasse`, `/eventos/repassess` nem `/eventos/meus-repasses`. O harness monta o módulo em `/eventos/*`, o mesmo ponto do `App.tsx` — a primeira versão montava na raiz e media o harness em vez do produto.

**O cadastro único (T5).** `DadosBancariosSection` + `DadosBancariosForm` mudaram para `routes/conta/recebimento/`, com um container fino que orquestra as MESMAS `useDadosBancarios` / `useSaveDadosBancarios`. Zero backend novo, RN-354 intacta. `RepasseErro` e `_lib/dadosBancariosForm` **não** se mudaram: são compartilhados com ComprovanteModal, SolicitarRepasseModal, HistoricoRepasses e RepassesPorEvento, e mover o compartilhado por causa de um consumidor criaria a cópia que a rodada existe para evitar.

**O ponto que mais exigia cuidado — o pré-requisito do saque.** Até aqui ele era garantido por PROXIMIDADE: o formulário bancário ficava dois centímetros abaixo do botão, então "tem dado salvo" era quase tautológico. Com o cadastro em outra tela isso acabou, e a checagem virou explícita: sem dado, o `PreRequisitoRecebimento` diz o que falta e leva a `/conta`, o botão não habilita e **o modal não monta** — a proteção é o modal não existir, não o `disabled` do botão. Testado nos estados que mais enganam: enquanto o dado **carrega** a tela não anuncia "faltam dados", e em **erro de leitura** oferece retry em vez de acusar falta de cadastro.

**Dívida deixada explícita:** existem três cópias do mesmo hook de sessão (`assessorias`, `crm`, `eventos/repasses`). A T5 importou a existente em vez de criar a quarta, com acoplamento declarado `conta/` → `eventos/repasses/` (precedente: `plataforma/repasses` já importa de lá). Os próprios docblocks dos três apontam o `SessionProvider` global como saída. Vale card.

**Nota de procedência:** os 3 renames da T5 aterrissaram antes, por colateral, no commit de docs `05708dd` do maestro, com 0 mudança de conteúdo — o que deixou `main` momentaneamente sem compilar (os arquivos no destino ainda importavam os vizinhos da origem). `14f059e` traz o restante e fecha o buraco.

### Apêndice PIX-CARRINHO (2026-07-26 · rodada DEC-0726B · lane PIX-CARRINHO)

Duas decisões de DINHEIRO do Vitor viraram código nesta lane. Elas moram no
E12 (o checkout é a superfície), mas tocam o E09 porque decidem **quantas
cobranças podem existir vivas ao mesmo tempo** e **quando uma intenção de
compra morre sem virar receita**.

**Item 25 · cobrança PIX nunca mais duplica por causa do relógio** (`7e957e9`
· detalhe na RN-157 do E12). A trava da segunda cobrança PIX parou de soltar
por vencimento: cobrança só é considerada morta quando o **gateway
confirma**. Ao chegar um pedido de cobrança nova sobre uma anterior vencida e
não confirmada, a plataforma cancela a anterior no gateway DENTRO do fluxo de
criação; recusa do gateway ⇒ a criação é **negada** com motivo tipado. Efeito
financeiro: some o cenário em que o comprador podia pagar dois códigos do
mesmo carrinho — que antes só era detectável na conciliação, depois do
dinheiro já ter entrado duas vezes.

**Item 26 · RN-158, prazo do carrinho** (`b7a2a77` + `522c23b` · spec completa
no E12). Checkout tem **15 minutos da abertura para concluir**; não concluiu,
o carrinho morre com estado terminal próprio (`expirado_sem_concluir`). Os
dois relógios do checkout compõem em SEQUÊNCIA — 15 min até concluir, 30 min
de validade do PIX depois disso (RN-157) — e nenhum encurta o outro.

**O que este apêndice deixa PENDENTE para o E09.** O carrinho abandonado
passou a deixar registro durável e agregável (`carrinhos/{uid}__{evento}/ciclos/{n}`:
estado, instantes, evento, tenant — sem PII). **A FASE 2 não foi construída**:
não existe tela, agregado, contador nem alerta sobre esses documentos. Quando
o Vitor abrir a visibilidade de carrinhos abandonados, o histórico já estará
lá — é exatamente por isso que o dado nasceu antes da tela.

⚔ Review antagonista da lane: **pendente**.

---

## Regras de negócio novas (CAIXA-SIMPLES · Vitor 2026-07-27, rodada DEC-0727C)

Verbatim dele: *"o que devemos mostrar: Receita Total, Disponível para
Repasse, Valor Repassado. 38, nao complica essa porra. Faz o simples. TUdo que
entrou, menos tudo que foi repassado, e o que tem por repassar. Evento nao pode
repassar mais do que tá liberado. Valor Repassado."*

A rodada fecha os itens 37, 38, 40 e 41 do painel de decisões e responde três
dos cinco escalados da review antagonista CAIXADISP-REV (E-1, E-2 e E-4 por
consequência). Registro da rodada: `01-produto/DECISOES-ABERTAS.md`; report da
review: `outputs/leela-build-2d6ee98d/CAIXADISP-REV-REPORT.md`.

- **RN-367 · Base única do "Disponível para Repasse".** A Caixa do evento
  mostra **três** números — Receita Total, Disponível para Repasse, Valor
  Repassado — e o disponível sai da **mesma base do saque autoritativo**:
  `liberado = encerrado ? líquido : líquido − líquido × pct/100` (RN-350),
  `disponível = max(0, liberado − Σ repasses vivos do evento)` (RN-351/349). A
  base é o **líquido do produtor**, nunca a receita bruta: a taxa da plataforma
  nunca foi dinheiro do organizador e não é repassável, então "tudo que entrou
  menos tudo que saiu" não se literaliza para dentro dela. A diferença entre a
  receita e os outros dois números é retido + taxa, e fica **implícita** — a
  taxa segue invisível ao organizador (RN-404). O card de retenção ("a ser
  disponibilizado") **sai** da tela e do CSV. Sem termo comercial o disponível é
  **indeterminado** (`—`), nunca zero (decisão #7). Fonte única no core:
  `computeDisponivelDoEvento`, consumida pela Caixa, pelo eixo por-evento e pelo
  guard da RN-368. **Fecha o item 37 e o escalado E-1:** até aqui a Caixa retinha
  15% do BRUTO enquanto o saque calculava sobre o LÍQUIDO — no mock canônico do
  repo (bruto 12.000 · líquido 10.000 · repasse vivo 500) a tela dizia **9.700**
  onde o modal aceitava **8.000**, e a divergência media R$ 4.774,45 no evento do
  seed.
- **RN-368 · Teto por evento na solicitação de repasse.** `requestRepasse` nega
  a solicitação cujo valor exceda `liberado − comprometido` **daquele evento**,
  na mesma base da RN-367. A validação de tenant (RN-352) **continua e compõe**:
  a do tenant carrega a janela D+N (RN-348), que é grandeza do tenant e não do
  evento; a do evento impede que um evento consuma o liberado de outro. O erro é
  **tipado** (`details.motivo = 'repasse_excede_evento'` com `eventoId` e
  `disponivelDoEvento`), para o painel dizer quanto aquele evento comporta em vez
  de mandar o organizador adivinhar entre dois tetos. **Fecha o item 40 e o
  escalado E-4:** antes, com a validação só contra o saldo do tenant, um evento
  com 8.500 liberados aceitava um repasse de 9.000 desde que outro evento
  tivesse saldo — e a Caixa mostrava disponível 0 sem dizer por quê.
- **RN-369 · Repasse sempre amarrado a um evento.** `eventoId` passa a ser
  **obrigatório** em toda nova solicitação, no modal e no callable. A opção "Sem
  associação (saldo geral)" morre — era o **default** do modal, e quem não
  mexesse no campo criava um repasse que não abatia evento nenhum. Repasses
  **antigos** sem `eventoId` continuam válidos como dado: comprometem o saldo do
  tenant (RN-351) e **não** abatem evento nenhum — atribuí-los agora seria
  adivinhação —, e a visão macro os declara como **legado** numa nota. **Fecha o
  item 38 e o escalado E-2** (o R$ 500 fantasma do §P-IAMENU-2).
- *Ampliada · RN-235:* o card de repasse da Caixa passa a se chamar **"Valor
  Repassado"** (item 41). Ele soma os estados **vivos** {solicitado, aprovado,
  pago} — a nota de contagem ("N repasses solicitados") é o que declara que nem
  todo esse dinheiro já saiu. O escalado **E-5** da review (renomear para
  "Repasse comprometido") foi respondido pelo dono com o nome acima.

**Escalados da CAIXADISP-REV que seguem ABERTOS:** **E-3** (o que a planilha
exportada faz quando o extrato de repasses não pode ser lido) — é o item **39**
do painel de decisões, ainda do Vitor.

**Entrega.** Lane `CAIXA-SIMPLES` (trace `leela-build-2d6ee98d`), 4 commits:
`15c7121` (T1 · Caixa + core), `74b855d` (T2 · guard e associação obrigatória),
`49b44b8` (T3 · modal), e o T4 de reconciliação de testes.
⚔ Review antagonista da lane: **pendente**.

## Delta o juro não é receita, e o identificador do gateway cabia numa conta (DEC-0802B · 2026-08-02/03)

Duas frentes da mesma rodada `02-rodadas/2026-08-02-retomada/` aterrissam neste épico: a **RN-437**,
construída pela lane `ACHADOS-0802` e provada pela `ACHADOS-REV`, e o hotfix P0 do gateway, da lane
`PIXFIX-EXTREF`. Trace `leela-build-2d6ee98d`.

### RN-437 · O juro do parcelamento não é receita do organizador nem base de comissão

O organizador recebe **o mesmo valor** quer a compra seja à vista ou parcelada. O líquido do produtor
é calculado sobre o valor final da venda, o razão financeiro registra o valor de face, e a comissão
do afiliado incide sobre o face. Nenhum dos três enxerga o juro.

O juro compõe o valor cobrado do comprador e o valor enviado ao gateway, e aparece como linha própria
no resumo e na confirmação (RN-435, E12). Não existe caminho em que ele se apresente como parte do
"total" sem nome. A regra é **ratificação do que o código já faz**, e precisa estar escrita porque,
com a taxa de juros em zero, a propriedade nunca valeu dinheiro; com ela ligada, passa a valer.

**RN-310 e P-TAXAFLEX-3 reafirmadas:** a comissão do afiliado continua sobre o face, agora com juros
na conta do comprador.

**Prova executável, e onde ela quase ficou pela metade.** O caso puro do `computeSaleState` prova o
líquido, e isso é metade: o que o organizador recebe passa pelo `webhookPagamento` e o que o afiliado
comissiona passa pelo doc de conversão, e **nenhum dos dois consome `receitaLiquidaOrganizador`** —
os dois leem `valorFinal` do doc de pagamento (`webhookPagamento.ts:621` e `:659`). Sob a
falsificação que o vetor 5 pede (somar o juro à base de `receitaConfirmada` e `valorConversao`),
**69 casos de integração financeira seguiram verdes**. O caso que fecha a lacuna compra o mesmo
carrinho à vista e em 12x, confirma os dois pelo webhook e compara o delta da `receitaConfirmada`:
R$ 189,90 nas duas, com totais de comprador diferentes (`dffab74`).

`jurosParcelamento` é **congelado no ato da compra** pela mesma disciplina da RN-179: gravado no doc
de pagamento quando maior que zero, e o replay lê dali em vez de recomputar. Pedido antigo nunca é
reprecificado por mudança posterior da taxa de juros (vetor 11, PASS).

### Identificador enviado ao gateway · o defeito que travava toda compra (lane PIXFIX-EXTREF)

**Diagnóstico:** `createInscricaoCharge` nunca retornou 200 em produção. O `externalReference` era
`${pedidoId}::charge-${pedidoId}` = **155 caracteres**, contra um limite de **100** do gateway. O
sufixo nunca carregou informação (no único caller de produção a chave é função pura do prefixo); o
que ele dá é **estabilidade**, porque a mesma chave tem de produzir sempre o mesmo valor, senão o
lookup por `externalReference` deixa de achar o replay antes do POST e a segunda tentativa cria a
**segunda cobrança**. Passou a ser um digest sha256 truncado em 16, que preserva a propriedade em
tamanho fixo: **73 + 2 + 16 = 91**, com folga de 9 (`34ed0e7`).

O **prefixo fica verbatim**. É dele que o `parseExternalReference` tira o `orderId`, e é o `orderId`
que abre o pedido quando o webhook chega — digest no prefixo teria trocado um defeito que aparece
ANTES do pagamento por um que aparece DEPOIS, com compra paga que nunca confirma. O separador `::`
sobrevive porque é o discriminador que separa cobrança nossa de cobrança criada no painel do gateway.
**Sem migração:** não existe cobrança no formato antigo, porque nenhuma jamais nasceu.

**Guarda dura, por reconstrução (`3e056ec`).** `validarCreateCharge` reconstrói o valor com o mesmo
construtor do envio — conta paralela poderia divergir do que é enviado — e recusa acima de 100 com
erro nomeado, antes do POST e antes do lookup.

> ⚠️ **Contradição registrada com a RN-333, e deixada para o dono (item 65 do painel).** A regra
> publicada diz chave de **8 a 64 caracteres**; com o formato novo, chave de até **49** passa e de
> **50 a 64 é recusada**. Ninguém esbarra nisso hoje — a única superfície que cria compra emite 40
> por construção. Apertar contrato publicado num hotfix P0 não é decisão de lane: o default proposto
> é apertar a RN-333 para 49 (uma linha na validação e uma frase na regra).

**Nenhuma recusa do gateway imprime "internal" (`7b5ba3e`).** A família de erro do adapter sai
tipada: 429 vira `resource-exhausted`, 5xx vira `unavailable`, 4xx e falha de validação viram
`failed-precondition`, e erro que não é do adapter sobe cru. A mensagem **não** afirma "nada foi
cobrado" — verdade num 4xx, indeterminado num 5xx; a única coisa verdadeira em todos os casos é o
contrato do retry, e é o que ela promete. O texto cru do gateway não atravessa a fronteira, porque
carrega o valor recusado e o valor carrega o uid: fica no log do servidor.

**Deploy cirúrgico com prova (`2a8c536`).** Só a function de cobrança e os índices; as outras 70+
intocadas, nenhuma mutação de dado. Marcadores contados no pacote antes e depois com um controle que
não podia zerar, registro de atualização da function com os três segredos declarados, preflight sem
executar o handler, e zero linhas de erro 500 depois contra quatro antes. **Não é a prova da
compra** — percorrer a jornada uma vez segue sendo do dono.

### Contadores do evento · parecer read-only (T6 · item 70 do painel)

As quatro tentativas de compra que morreram no defeito acima deixaram **2 pedidos** com inscritos
pendentes (as 4 tentativas foram 2 sessões × 2 cliques reusando a mesma `idempotencyKey`). O que
**não** inflou: `demografia.totalConfirmados`, `financeiro.receitaBruta`, o aprovisionamento de kit e
a virada de lote — os quatro filtram por status. O que **inflou**: `eventos.qtdInscritos`
(`contarInscritos().total`, **sem filtro nenhum**) e o `financeiro.inscritos.total`, que são o
"N inscritos" do cabeçalho do evento e do badge da sub-navegação e são lidos também pela landing.
Evento afetado: `desafio-mtb-costa-lagoa-2026`.

Nenhum dos 11 crons varre isso: `expirarCarrinhosAbandonados` age em carrinhos, `estornarPagamentoOrfao`
trata do caso oposto (dinheiro que chegou depois do cancelamento) e `expirarPixPendente` é callable
disparada pela tela do PIX, que o comprador nunca viu. E mesmo se disparada, o flip cancela pedido e
pagamento e deixa os inscritos em `pendente` de propósito, pelo mesmo tratamento do caminho `falhou`
do webhook. **Dano real: nenhum** — não segura vaga, não reserva kit, não vira lote, não entra em
receita nem em demografia. **Recomendação em vigor: não limpar agora**; se limpar, só depois da
primeira compra bem-sucedida, e a operação é apagar os inscritos dos 2 pedidos (`onInscritoWrite`
recomputa sozinho no delete, por full recompute).

## Delta custo, markup e margem viram três números com nome (SPEC-JUROS-MARGEM · 2026-08-04)

O dono pediu para ver, na tabela que já existe no admin, quanto custa parcelar contra o que
ele cobra por parcelar. Verbatim: *"Inclua o custo de parcelamento também para que eu veja
quanto custa e quanto preciso colocar de markup, para saber nossa margem exata a ser cobrada,
por parcela."* Rodada em `02-rodadas/2026-08-04-juros-margem/`.

### RN-454 (nova, dona) · custo, markup e margem, com fonte única no core

Três números se confundiam porque um deles nunca tinha sido escrito em lugar nenhum.

| Nome | O que é | Quem paga |
|---|---|---|
| **Custo** | O que o gateway cobra da Leela para processar aquela venda naquele número de parcelas | A Leela, descontado do que entra |
| **Markup** | O que a Leela acrescenta ao preço por financiar a compra. Hoje é o juro do parcelamento | A compradora, embutido no total |
| **Margem** | O que sobra: markup menos o custo **incremental** sobre a venda em 1x | Resultado, não insumo |

```
markup(n)           = totalParcelado(n) − totalAVista
custoGateway(n)     = round(totalParcelado(n) × custo[n].percentual) + custo[n].fixoCentavos
custoIncremental(n) = custoGateway(n) − custoGateway(1)
margem(n)           = markup(n) − custoIncremental(n)
margemPorParcela(n) = margem(n) ÷ n
```

Tudo em centavos inteiros com half-up, a convenção da RN-183. As funções vivem em
`packages/core/src/finance/economiaParcelamento.ts` e **compõem** `buildInstallmentOptions` e
`computeTaxaPlataforma` sem reimplementar nenhuma das duas. Nenhuma tela, Function ou
relatório recalcula dinheiro por conta própria: é a mesma disciplina que
`cotarInscricaoCheckout` já impõe ao juro, e pela mesma razão, que é duas autoridades sobre o
mesmo valor divergirem no dia em que uma delas mudar.

Três invariantes: `markup(1) = 0`, porque a parcela única do cartão nunca tem juros (RN-436);
`margem(1) = 0`, porque o custo incremental de 1x é zero por definição; e **`margem(n)` pode
ser negativa**, quando o custo de parcelar supera o juro cobrado. A margem negativa aparece na
tela, com destaque, e nunca é zerada nem escondida.

A palavra "taxa" fica reservada à taxa da plataforma sobre a venda (RN-178). Ela é outra
conta, incide no face, não depende do número de parcelas e nunca é somada ao markup.

**Par com a RN-437:** o juro do parcelamento não é receita do organizador, e por simetria o
custo de parcelar não é despesa dele. É esse par que sustenta o default proposto no item
JUROS-3 do painel.

### RN-459 (nova, dona) · o custo é carimbado na venda, como a taxa já é

Espelha a RN-179 e existe pela mesma razão. A tabela de custo vive em `platform/config`, que
não é versionado; sem carimbo, trocar a tabela reescreveria retroativamente a margem de toda
venda passada, e o dono leria o faturamento de junho com o custo de agosto.

No ato da compra, o par `{percentual, fixoCentavos}` do meio e do número de parcelas
escolhidos é resolvido e carimbado em `conciliacao`, ao lado de `taxaPct`/`taxaFixa`/
`taxaValor`, junto de `custoOrigem` (`'estimativa' | 'contrato'`), na mesma transação da
confirmação. **Mudança da tabela nunca reprecifica nem re-margina pedido existente**, e replay
não recomputa contra tabela nova.

**Junto vem a captura do custo real, e ela fecha uma lacuna que ninguém tinha olhado.** O
webhook do Asaas traz `netValue`, o valor já descontadas as taxas do gateway, e o adapter
descarta o campo de propósito para proteger o cross-check de integridade
(`asaasProvider.ts:1506-1508`). A decisão está certa no que protege, mas a diferença entre
`value` e `netValue` **é o custo real daquela venda**, e ela era jogada fora sem registro:
não existe uma única venda na história do sistema cujo custo real seja conhecido. O `netValue`
passa a ser gravado como campo de **observação**, ao lado do valor de cobrança, sem entrar no
cross-check, que continua lendo `payment.value`. É o que torna a margem apurável em vez de
apenas estimada.

### O que este épico consome

- **RN-455** (dona no E16) — a tabela de custo do gateway, global e configurável, que alimenta
  `custoGateway(n)`. Sem a linha do meio e da parcela, a margem **não é calculada**.
- **RN-456** (dona no E04) — a divisão exata em centavos, que faz o `markup` de um termo sem
  juros ser exatamente zero em vez de um resíduo.

## Delta onde mora o documento do profissional (2026-08-04 · SPEC-QUALIFICACAO)

Spec completa em `02-rodadas/2026-08-04-qualificacao-profissional/01-spec-conta-profissional.md`.

### RN-465 · CPF identifica a pessoa, CNPJ identifica a entidade (nova, dona · 2026-08-04)

Decisão do dono, verbatim: *"O que podemos colocar no painel profissional, é perguntar se a
pessoa tem CNPJ. e se tiver, pedir, para criar o painel."*

São dois documentos com naturezas diferentes. O CPF identifica a **pessoa**; o CNPJ identifica a
**entidade sob a qual ela opera**. A mesma pessoa pode ter CNPJ e continuar operando como
física. Tratá-los como um campo só, "CPF ou CNPJ", é o que produz a impossibilidade de responder
depois quem é o titular de um repasse.

| Documento | Onde | Rule |
|---|---|---|
| CPF | `pessoas/{id}.cpf`, onde já vive | `read, write: if false` para todo cliente (`firestore.rules:2557-2559`) |
| CNPJ, número | `profissionais/{uid}/documentoSecret/current` | leitura só do dono do uid; escrita negada a cliente |
| CNPJ, máscara | `profissionais/{uid}.documentoMascarado` | a Rule do doc pai |
| Tipo de pessoa | `profissionais/{uid}.tipoPessoa` | a Rule do doc pai |

**Documento nunca é campo do doc que o tenant lê.** `profissionais/{profId}` libera leitura a
qualquer membro do tenant (`firestore.rules:2790-2792`), e Rules do Firestore não filtram campo:
um `cnpj` gravado ali seria legível por staff, promoter e atleta com claim daquele tenant no
mesmo instante em que fosse escrito. É a armadilha que a RN-417 já teve de desfazer uma vez.

O par "completo no doc restrito, mascarado no doc de superfície ampla" não é invenção: é o que
`cadastrarAssessoria` faz com o CPF/CNPJ do parceiro
(`functions/src/assessorias/cadastrarAssessoria.ts:352-355`), e a subcoleção owner-only é a Rule
que `profissionais/{profId}/marcas` (`firestore.rules:2876`) e `dashboard` (`:2815`) já usam.

**Cifrar, não.** O `BANK_DATA_KEY` cifra `{ conta, pix }` porque conta e chave PIX são
instrumentos de movimentação: com eles se move dinheiro. Um CNPJ é dado que a Receita publica;
um CPF não é público, mas também não movimenta nada sozinho. Cifrar somaria gestão de chave,
rotação e um caminho de decifra novo para comprar proteção que a Rule owner-only já dá. A
minimização da ADR-014 continua valendo e esta RN não a revoga: o número completo existe num
único documento de leitura restrita, e a máscara continua sendo o que a operação confere.

**Correção de vocabulário que não é cosmética:** a pergunta não é se a pessoa *tem* CNPJ, é se
ela *vai operar* como pessoa jurídica na Leela. Muita gente tem CNPJ de outra atividade e vai
operar como física aqui.

**Estado medido:** o produto não tem noção nenhuma de pessoa jurídica. Varredura por
`tipoPessoa`, `pessoaJuridica` e `companyType` devolve zero. O `cpfCnpj` do recebimento aceita
11 ou 14 dígitos sem ramificar (`saveDadosBancarios.ts:136-144`) e **sem dígito verificador**,
enquanto o core exporta `validarDocumento` desde o E18. A virada de física para jurídica, hoje,
é a troca de um campo, e a RN fixa que continue barata. Quando existir emissão fiscal, a virada
exigirá corte por data, porque documento fiscal emitido não muda retroativamente.

**Profissional estrangeiro fica fora do escopo**, e o bloqueio não é a identidade: é o repasse.
`saveDadosBancarios` valida o titular por comprimento de 11 ou 14 dígitos, e passaporte não tem
nem um nem outro; antes disso, o repasse da V1 é transferência manual para conta bancária
brasileira (RN-356). Aceitar um profissional estrangeiro produziria alguém que vende e nunca
saca, o que é pior que recusar na porta.

## Delta o Serviço ganha piso, e a métrica passa a contar quem pagou (SPEC-METRICAS-SERVICO · 2026-08-05)

O dono comprou por PIX, não pagou, se viu contado como inscrito e escreveu a correção. Na mesma
fala vieram o piso do Serviço e o renome. Verbatim integral e a correção da unidade do piso em
`02-rodadas/2026-08-05-metricas-e-servico/01-decisoes-dono.md`; spec com as contas e os
inventários em `02-spec-metricas-e-servico.md`.

### RN-488 (nova, dona) · o ticket médio sai do servidor, com o denominador de pagantes

A RN-336 já definia ticket médio como receita confirmada dividida por inscrições pagas. O código
nunca a seguiu:

```ts
const ticketMedio = qtdInscritos > 0 ? receitaConfirmada / qtdInscritos : 0;
```
`apps/painel/src/routes/eventos/evento/overview/OverviewKpis.tsx:66`

O numerador conta só pagamento confirmado; o denominador conta pendente, cancelado e estornado
junto. A métrica é estruturalmente subestimada em qualquer evento com abandono — um evento com
cem inscritos dos quais cinquenta pendentes mostra metade do ticket real. E a conta acontece no
cliente, contra a disciplina que o cabeçalho do próprio arquivo declara.

A regra passa a exigir duas coisas. O ticket é **campo do agregado**, computado na mesma
transação de `recomputarFinanceiroEvento` que já tem numerador e denominador na mão. E o
denominador é o da RN-486, o contador de pagantes.

**O significado do ticket depende do `taxaModo`, e isso fica declarado em vez de corrigido:** em
`incorporada` o `valorFinal` embute o Serviço e o ticket é bruto com ele dentro; em `repassada` o
Serviço é cobrado por fora e nunca entra em `receitaConfirmada`. A mesma métrica muda de sentido
conforme a configuração do evento, e nenhuma tela nova é pedida por isso.

Falsificação: dez confirmados, cinco pendentes, receita de R$ 1.000,00 tem de mostrar R$ 100,00
e não R$ 66,67.

### RN-492 (nova, dona) · o piso é congelado na compra, e o carimbo diz que ele mordeu

Espelha a RN-179 e existe por uma razão a mais que ela.

O carimbo de hoje é `{meio, percentual, fixoCentavos, valor, origem}`
(`packages/core/src/pedidos/pagamento.ts:250-261`), escrito na mesma transação que cria pedido e
pagamento (`functions/src/checkout/createInscricaoCharge.ts:1869-1875`). Uma venda em que o piso
mordeu fica **aritmeticamente impossível** de reproduzir a partir dele: `percentual: 10,5` com
`valor: 3,00` sobre face de R$ 10,00 não fecha pela fórmula gravada. Quem auditar concluirá
carimbo corrompido — que é exatamente a anomalia que `webhookPagamento.ts:581-590` já trata com
telemetria `taxaflex_carimbo_corrompido_sem_conciliacao`.

O carimbo passa a carregar `pisoCentavos` e `pisoAplicado`, escritos na mesma transação em que a
taxa já é carimbada. Com isso o replay reproduz o número exato a partir do próprio documento, sem
consultar tabela nenhuma, que é a promessa da RN-179. **Mudar o piso depois nunca reprecifica
pedido existente.**

Falsificação direta: fechar uma venda, alterar o piso na tabela e reler a taxa daquela venda tem
de devolver o número anterior; apagar `pisoAplicado` e reler tem de quebrar o caso.

Efeito colateral que entra junto: `functions/src/platform/rollups.ts:82-92` calcula
`receitaLeela = computeTaxa(gmv, platformFeePct)`, uma estimativa macro por percentual que ignora
o carimbo. Com o piso, ela passa a **subestimar** a receita da plataforma em qualquer base com
muitas vendas pequenas. Ela já era estimativa; passa a ser estimativa enviesada, e o conserto é
somar o carimbo.

### RN-493 (nova, dona) · no estorno o piso não muda a mecânica, só o total a ratear

A devolução pura continua sendo `calcularDevolucaoEstorno`
(`packages/core/src/eventos/politicaVendas.ts:451-468`): dentro dos sete dias de arrependimento
volta face mais Serviço integral e não parametrizável (RN-373/374, art. 49 do CDC); fora da
janela volta a face e o Serviço segue `devolveTaxaForaDaJanela`, default reter.

O rateio por linha continua sendo `montarItensDoPedido`
(`packages/core/src/pedidos/pedido.ts:330-449`, rateio em `:388-428`): proporcional ao
`valorFinal` da linha, piso proporcional mais maior resto, com a invariante
`Σ itens.taxaRepassada === taxaRepassadaTotal` por construção. **O piso apenas aumenta o total a
ratear**, e a invariante garante que estornar as N linhas uma a uma devolva exatamente o piso,
sem centavo sobrando nem faltando.

Duas leituras que ficam escritas. Estorno parcial de um pedido que pagou piso devolve a fração da
linha, o que é a leitura correta de "o piso é do pedido" — três ingressos de R$ 3,00 pagam um
piso sobre face de R$ 9,00, e estornar um devolve um terço dele. E em `incorporada` não existe
decomposição do Serviço por ingresso (`pedido.ts:444-446`), então o piso segue a regra existente
e não cria caminho novo.

O piso do principal no parcelamento (`packages/core/src/finance/calc.ts:144-150`), corrigido em
rodada anterior, é **outra coisa** e não interage: ele garante que a soma das parcelas não fique
abaixo do total, e opera depois da taxa.

### RN-494 (nova, dona) · o Serviço nunca ultrapassa a face da venda

Borda que a fala do dono não previu. Numa venda de R$ 2,00 em modo `incorporada`, o líquido do
organizador por `computeLiquidoProdutor` (`packages/core/src/finance/repasse.ts:88, 96`) seria
**negativo**: dois reais menos três. O clamp em zero que existe uma camada acima
(`functions/src/eventos/agregarFinanceiro.ts:123-155` usa `max(0, bruta − taxaValor)`) esconderia
a divergência em vez de resolvê-la, e faria o repasse deixar de bater com a soma das vendas.

A regra crava `Serviço = min( max(fórmula, piso), face )`, porque cobrar do organizador mais do
que a venda inteira transforma uma venda em dívida e nenhuma tela do produto sabe representar
isso.

**É default em vigor, não decisão fechada.** A alternativa que resolve de verdade é um preço
mínimo de venda acima do piso, que o produto hoje não tem:
`packages/core/src/checkout/saleState.ts:393-397` só recusa `valorFinal ≤ 0`, porque pedido
gratuito está fora do fluxo pago, e não existe nenhum mínimo positivo. Item **SERV-2** do painel.

Falsificação: uma venda de R$ 2,00 em `incorporada` tem de deixar o líquido do organizador em
R$ 0,00 e nunca em número negativo.

### RN-496 (nova, dona) · o "Repasse previsto" não descreve a taxa que o organizador não deve ver

A descrição sob o valor é suprimida —
`apps/painel/src/routes/eventos/evento/overview/OverviewKpis.tsx:110`:

```tsx
{typeof taxaPct === 'number' ? `após taxa ${formatInt(taxaPct)}%` : 'após taxa Leela'}
```

Duas coisas que a leitura do arquivo revela. A string "após taxa 10,5%" **não existe como
literal**: ela é composta em tempo de execução, e `formatInt(10.5)` produz `10,5` pelo
`Intl.NumberFormat('pt-BR')` — procurar pelo texto no repositório não acha nada. E o fallback
dessa mesma linha é a **única ocorrência visível de "Taxa Leela" no produto inteiro**.

**O cálculo não muda**: `repassePrevisto` continua vindo de `financeiro/current.receitaLiquida`,
computado no servidor por `computeFinanceiro`. O badge "Aguardando encerramento" **fica**, porque
é a RN-331 e fala de quando o dinheiro libera, não de taxa. A prop `taxaPct` perde o consumidor e
sai da assinatura.

Como par, o campo `Taxa Be Hero` de
`apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx:553` é **suprimido**, não
renomeado: ele carrega a marca da plataforma anterior e, pior, exibe ao produtor o valor da taxa,
que é o que a RN-404 proíbe. O resto do produto respeita a decisão com rigor — o CSV financeiro
exclui a taxa de propósito com teste provando a ausência, e `FinanceiroView.test.tsx:38` guarda
que a tela financeira não diga "Taxa Leela". Este slide-in passou por fora das duas guardas.

### O que este delta não faz

Não redefine `qtdInscritos` (RN-487, dona em [[LEELA-E04-config-vendas]]). Não constrói o contador
de visitas (RN-490, dona em [[LEELA-E11-analytics]]). Não decide se o reembolso devolve o Serviço
fora da janela, que segue sendo o item 23 do painel — o piso apenas aumenta o valor em disputa nas
compras pequenas. Não toca RN-455 nem RN-459: o custo do gateway segue especificado e não
construído, e o piso do Serviço não depende dele.

## Delta o dinheiro conta cliente que pagou, nunca inscrito (2026-08-11 · D-1008-R19)

Decisão do dono, na íntegra: *"nao faz sentido funil por inscritos, e ja te falei que ticket médio
é só por clientes que pagaram, e nao pagamentos emitidos(pendentes + pagos). iss ja esta em vias
dde correção também?"* Registro em
`02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md`.

A resposta honesta dada a ele foi não: não estava em vias de correção. A conta errada foi
localizada na hora, em `apps/painel/src/routes/eventos/evento/overview/OverviewKpis.tsx:66`, onde
a receita confirmada é dividida pela quantidade de inscritos. Enquanto houver um PIX pendente no
evento, o denominador cresce e o ticket médio encolhe sem que nada tenha acontecido no caixa.

**A regra, escrita de uma vez para todas as telas:** ticket médio é receita confirmada dividida
pelo número de clientes que pagaram. Nunca por inscritos, nunca por cobranças emitidas. Onde
houver funil, ele fecha em pagante.

Esta seção consolida no épico duas histórias que até hoje só existiam na pasta da rodada de 05/08
e no kanban — a de dentro deste épico e o piso do Serviço, que é vizinho de arquivo.

### S908 · o ticket médio e o repasse previsto na tela do organizador

| Tarefa | Estado | Prova |
|---|---|---|
| S908-T1 · a linha que compõe o repasse previsto some da tela | 📋 | RN-496; o selo de liberação fica |
| S908-T2 · o campo com o nome da plataforma anterior sai da ficha do inscrito | 📋 | RN-496 e RN-404; a taxa não se mostra ao produtor |
| S908-T3 · o teste que impede o rótulo antigo de voltar passa a cobrir as três telas | 📋 | depende de T1 e T2 |
| S908-T4 · o ticket médio vira campo do agregado, com o denominador de quem pagou | 📋 | RN-488; é aqui que a decisão do dono de 10/08 aterrissa |

### S907 · o piso do Serviço na aritmética, no carimbo e no estorno

| Tarefa | Estado | Prova |
|---|---|---|
| S907-T1 · o piso entra no modelo da linha de taxa, com a tabela nascendo vazia | 📋 | RN-491 |
| S907-T2 · a aritmética do piso mora num lugar só | 📋 | RN-491 e RN-494 |
| S907-T3 · o carimbo diz que o piso mordeu | 📋 | RN-492 |
| S907-T4 · o estorno com piso fecha sem centavo sobrando | 📋 | RN-493 |
| S907-T5 · o consolidado da plataforma soma o carimbo em vez de estimar | 📋 | com piso, a estimativa fica enviesada para baixo |
| S907-T6 · a coluna do piso na tela da tabela global | 📋 | valor vazio quer dizer "sem piso", não "piso zero" |

**Preso no dono:** SERV-1 e SERV-2 (o piso de três reais contra vendas pequenas) e SERV-3 (até
onde vai a palavra "Serviço"). A frente 4 da rodada de 05/08 inteira espera o SERV-3.
