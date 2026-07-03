# LEELA-E02 · Visão Geral do Profissional

- **Superfície:** Painel
- **Horizonte:** H1 (Onda 1)
- **MoSCoW:** Should
- **Estimativa:** M
- **Status:** 📋 Backlog (protótipo pronto — `Painel do Organizador.html`)
- **Depende de:** LEELA-E01 (DS + shell), LEELA-E03 (dados de evento: ∑`qtdInscritos`, `receitaConfirmada`), LEELA-E05 (dados de clube: ∑`qtdMembrosAtivos`, `qtdDesafiosAtivos`)
- **De-para:** BH-E02 (BH-600 · Dashboard global do profissional)

## Objetivo

A Visão Geral é a tela inicial do Painel: consolida eventos e clubes do profissional numa única leitura de negócio. Ao logar, Coordenador ou Organizador vê de relance os KPIs agregados (inscrições, receita, vagas em risco, conversão), seus eventos ativos, as últimas inscrições cross-evento, o próximo evento com contagem regressiva, ações rápidas e alertas operacionais. É o hub de orientação: não opera nada em profundidade — direciona para os módulos (Eventos/E03, Clubs/E05) onde a operação acontece.

O valor é reduzir o tempo até a próxima decisão: o profissional entende "onde estou e o que exige atenção" sem abrir cada evento.

## Personas & JTBD

- **Organizador de Evento** (mock: Marina Castelo · Castelo Produções). JTBD: "Ao abrir o painel, saber em segundos como vão minhas vendas e o que está em risco."
- **Coordenador de Assessoria.** JTBD: "Ver saúde de eventos e clubes num lugar só, sem trocar de contexto." A mesma tela serve os dois papéis; o conteúdo é filtrado pelo escopo do usuário (eventos que organiza + clubes que possui/administra).

## Critérios de sucesso do épico

- Ao logar, o profissional cai na rota `(overview)` com shell padrão e saudação personalizada.
- Os 4 KPIs vêm de agregados mantidos por Cloud Function — nunca calculados ad-hoc no cliente.
- Cada bloco (eventos ativos, últimas inscrições, próximo evento, alertas) navega para o destino correto (E03/E05) e cobre estado vazio.
- Tela responsiva com layout de duas colunas (conteúdo + coluna lateral), degradando para coluna única.
- Zero valor visual hardcoded: tokens do DS, flat (§2.16), interativa (§2.12).

## Regras de negócio aplicáveis

- **RN-200** — preço bloqueado após 1ª venda (contexto do KPI de receita; a Visão Geral só lê).
- **RN-204** — inscrito tem status `confirmado`/`pendente`/`cancelado` (dirige badges em "Últimas inscrições" e alerta de pendentes).
- **RN-216** — nomenclatura "kit" nunca "tier"; copy exata do glossário (HANDOFF-07).
- **§2.16** — flat, sem borda decorativa em cards (exceção permitida: card crítico com `border-left` Vulcão para o KPI/alerta em risco).
- **§2.12** — interativo por padrão: links, hover, estados vazio/carregando/erro.
- **§2.1/§2.14** — Header/shell e sub-nav do E01 (esta tela não tem sub-nav própria).
- **Agregados ∑** — todo KPI é servido por Function; o cliente só lê (ver `modelo-de-dados-firestore.md`).

## Modelo de dados tocado

Leitura de agregados já mantidos por outros épicos; **nenhuma coleção de domínio nova é escrita** por este épico (é read-only sobre o negócio). Introduz um documento de agregado desnormalizado do dashboard:

- `eventos/{eventoId}` — lê ∑`qtdInscritos`, `receitaConfirmada`, `status`, `data`, `nome`, `local`, `modalidades[]`, `slug` (filtrando `organizadorId == uid`). Ver modelo de dados §`eventos`.
- `eventos/{eventoId}/inscritos/{inscritoId}` — lê últimas inscrições (🔁`atletaNome`, `modalidade`, `status`, `valor`, `criadoEm`) cross-evento do profissional.
- `clubes/{clubId}` — lê ∑`qtdMembrosAtivos`, `qtdDesafiosAtivos` (filtrando `ownerId == uid`) para compor a visão consolidada.
- **`profissionais/{profId}/dashboard/current`** (novo, ∑) — snapshot desnormalizado dos KPIs agregados do profissional, mantido por Cloud Function via fan-out dos eventos/clubes. Escrita **apenas via Function** (Admin SDK); leitura restrita ao próprio profissional. Evita varredura cara a cada carregamento do painel.

## Fora de escopo (Won't nesta fase)

- Qualquer edição/operação de evento ou clube (mora em E03/E05); a Visão Geral só lê e linka.
- Financeiro detalhado / repasses (E09) — o alerta de repasse aqui é só um sinal navegável.
- Analytics aprofundado, gráficos históricos além do sparkline do KPI (E11).
- Filtro por período / seleção de intervalo de datas nos KPIs (fase posterior).
- Personalização persistida de saudação/densidade (o painel de "Tweaks" do protótipo é ferramenta de design, não feature de produto).

---

## User stories

### LEELA-S600 · Rota de Visão Geral, shell e KPIs agregados · (de-para BH-600)

**Como** Coordenador de Assessoria ou Organizador, **quero** uma tela inicial que consolide os KPIs de eventos e clubes que administro, **para** ter visão única do meu negócio de relance ao logar.

- **MoSCoW:** Must (dentro do épico) · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Painel do Organizador.html`
- **RNs:** §2.1, §2.12, §2.16, agregados ∑

**Critérios de aceite (Given/When/Then):**
- **Dado** um profissional autenticado, **quando** acesso `/` do painel, **então** vejo a rota `(overview)` com shell padrão (sidebar, item "Visão Geral" ativo), saudação "Olá, {primeiroNome} — aqui está o resumo das suas operações." e o `date-badge` com data/hora atuais.
- **Dado** que a Function de agregado retornou dados, **quando** a KPI row renderiza, **então** exibe 4 KPIs — Inscrições totais (1.284, trend +12% esta semana), Receita confirmada (R$ 142.280, trend +8,4% vs. semana anterior), Vagas restantes (47, badge "Esgotando" Vulcão · "Meia Maratona Floripa"), Taxa de conversão (68,2% com sparkline).
- **Dado** que os agregados ainda estão carregando, **quando** a tela monta, **então** cada KPI mostra skeleton (nunca spinner solto).
- **Dado** que o profissional não tem nenhum evento nem clube, **quando** a tela carrega, **então** os KPIs mostram zero com estado vazio orientado ("Crie seu primeiro evento") em vez de números falsos.
- **Dado** falha na Function de agregado, **quando** a tela carrega, **então** exibe estado de erro com ação "Tentar novamente" e nenhum número inventado no cliente.

**Tasks:** LEELA-S600-T1, LEELA-S600-T2, LEELA-S600-T3

---

#### LEELA-S600-T1 · Rota `(overview)`, layout de 2 colunas e cabeçalho da página

- **Tipo:** screen · **Depende de:** E01-S001-3-T1 (Shell), E00 (rotas/auth) · **Bloqueia:** T3, S601-*, S602-* · **Estimativa:** S

**Objetivo**
Criar a rota inicial do painel com o shell padrão, o cabeçalho da página (título + saudação + date-badge) e o grid de duas colunas (conteúdo principal + coluna lateral) que os demais blocos preenchem.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (`.page-head`, `.main-left`, `.right-col`).
- RNs: §2.1 (header/shell), §2.12 (interativo), §2.16 (flat).
- Componentes DS: Shell (Sidebar 8 itens, item "Visão Geral" ativo), tipografia H1/subtítulo, Badge neutro para date-badge.

**Arquivos (criar/editar)**
- `apps/painel/app/(overview)/page.tsx` — server component da rota inicial; monta header + grid.
- `apps/painel/app/(overview)/layout.tsx` — aplica o shell do E01 (se não herdado do layout do painel).
- `apps/painel/app/(overview)/_components/PageHeader.tsx` — título "Visão Geral", saudação e date-badge.
- `packages/core/src/overview/greeting.ts` — deriva primeiro nome + string de saudação.

**Passos de implementação**
1. Registrar `(overview)` como rota raiz autenticada do painel; redirecionar não autenticado para login (E00).
2. Montar grid de 2 colunas responsivo (conteúdo `main-left` + `right-col`), colapsando para 1 coluna em telas estreitas.
3. `PageHeader`: H1 "Visão Geral"; subtítulo com saudação derivada de `greeting.ts`; `date-badge` renderizando data/hora do servidor/cliente com locale pt-BR.
4. Marcar "Visão Geral" como item ativo na sidebar.

**Modelo de dados / contratos**
- Lê apenas identidade do usuário autenticado (`profissionais/{uid}.nome`). Nenhuma escrita.
- Tipo: `type Greeting = { firstName: string; text: string }` em `packages/core`.

**Regras de negócio a respeitar**
- §2.1 — header/shell padrão; §2.16 — flat.
- Saudação usa primeiro nome; copy exata do glossário (HANDOFF-07).

**Critérios de aceite (testáveis)**
- **Dado** usuário "Marina Castelo", **quando** a rota carrega, **então** saudação = "Olá, Marina — aqui está o resumo das suas operações." e item "Visão Geral" está ativo.
- **Dado** viewport estreito, **quando** renderizo, **então** a coluna lateral desce para baixo do conteúdo principal (1 coluna).

**Testes a escrever**
- unit (core): `greeting.ts` deriva primeiro nome de nomes simples e compostos.
- e2e: navegação autenticada cai em `(overview)` e mostra o header correto.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Shell padrão + §2.16 (flat); tokens do DS (nada hardcoded)
- [ ] Estados vazio/erro/carregando previstos no grid (delegados aos blocos filhos)
- [ ] Acessibilidade AA (foco, landmarks, contraste)
- [ ] Sem `localStorage` para estado de domínio; sem segredo no cliente
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md` — DoD Tela/rota)

**Fora de escopo**
KPIs, listas e coluna lateral (tasks/stories próprias). Aqui só o esqueleto da rota.

---

#### LEELA-S600-T2 · Cloud Function de agregado do dashboard do profissional

- **Tipo:** api/function · **Depende de:** E00 (Functions + Emulator), E03/E05 (agregados ∑ de origem) · **Bloqueia:** T3 · **Estimativa:** M

**Objetivo**
Prover os KPIs consolidados do profissional via Cloud Function, mantendo/derivando o documento `profissionais/{profId}/dashboard/current` a partir dos agregados de eventos e clubes — nunca calculando no cliente.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (KPI row).
- Modelo de dados: §`eventos` (∑`qtdInscritos`, `receitaConfirmada`), §`clubes` (∑`qtdMembrosAtivos`, `qtdDesafiosAtivos`), tabela de Agregados ∑.
- RNs: agregados só escrevíveis por Function; §Security Rules.

**Arquivos (criar/editar)**
- `functions/src/overview/aggregateProfessionalDashboard.ts` — fan-out: onWrite de `eventos/{id}` e `clubes/{id}` recalcula e grava `profissionais/{profId}/dashboard/current`.
- `functions/src/overview/getOverview.ts` — callable de leitura (fallback recomputa se `current` ausente/stale).
- `packages/core/src/overview/kpis.ts` — tipos + funções puras de derivação (soma, trend, taxa de conversão).
- `packages/api-client/src/overview.ts` — wrapper tipado do callable.
- `firestore.rules` — regra de leitura de `profissionais/{profId}/dashboard/**` (só o dono); escrita negada ao cliente.

**Passos de implementação**
1. Definir `type OverviewKPIs = { inscricoesTotais: number; inscricoesTrendPct: number; receitaConfirmada: number; receitaTrendPct: number; vagasRestantes: number; eventoEmRisco?: { nome: string; slug: string } | null; taxaConversaoPct: number; conversaoSparkline: number[] }`.
2. Em `kpis.ts` (core, puro): somar `qtdInscritos` e `receitaConfirmada` dos eventos do profissional; `vagasRestantes = Σ(capacidade − qtdInscritos)`; identificar `eventoEmRisco` (evento com maior % de ocupação ≥ limiar de "Esgotando"); `taxaConversaoPct` = confirmadas / visitas quando houver dado de visita (senão marcar indisponível — ver Fora de escopo); trends comparando janela atual vs. anterior.
3. `aggregateProfessionalDashboard`: gatilho onWrite dos agregados de origem → grava `dashboard/current` idempotente (reprocessar não duplica).
4. `getOverview` (callable): valida claims do profissional, lê `current`; se ausente/stale, recomputa on-demand a partir dos ∑ de origem e retorna.
5. Security Rules: `dashboard/**` leitura só `request.auth.uid == profId`; escrita `false` (Admin SDK).

**Modelo de dados / contratos**
- Doc: `profissionais/{profId}/dashboard/current` — campos de `OverviewKPIs` + `atualizadoEm`.
- Function: `getOverview() -> OverviewKPIs` (escopo do `uid` autenticado).

**Regras de negócio a respeitar**
- Agregados ∑ mantidos por Function, idempotentes (reprocessar não duplica) — DoD API/Function.
- Cliente nunca soma nem infere KPI; só consome o retorno.

**Critérios de aceite (testáveis)**
- **Dado** eventos com ∑`qtdInscritos` = 1.284 e ∑`receitaConfirmada` = 142.280, **quando** chamo `getOverview`, **então** retorna esses totais e `vagasRestantes` = 47.
- **Dado** um evento com ocupação ≥ limiar, **quando** agrego, **então** `eventoEmRisco` aponta "Meia Maratona Floripa" (slug `meia-floripa-2026`).
- **Dado** reprocessamento do mesmo gatilho, **quando** roda de novo, **então** `current` não duplica valores (idempotência).
- **Dado** cliente tentando escrever em `dashboard/current`, **quando** a regra avalia, **então** nega.

**Testes a escrever**
- unit (core): soma/trend/vagas/eventoEmRisco em `kpis.ts` com fixtures.
- integração (Emulator): Security Rules (dono lê, cliente não escreve); idempotência do agregado.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Validação no servidor; Security Rules cobrindo leitura/escrita por papel
- [ ] Agregados idempotentes; erros observáveis no Sentry sem dado sensível
- [ ] Sem segredo no cliente; cliente não calcula KPI
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md` — DoD API/Cloud Function)

**Fora de escopo**
Fonte de dado de visitas para taxa de conversão exata (depende de E12/analytics); se indisponível, o campo retorna `null`/indisponível e a UI trata (não inventa). Financeiro/repasses detalhados (E09).

---

#### LEELA-S600-T3 · KPI row (4 cards) consumindo o agregado

- **Tipo:** screen · **Depende de:** T1, T2, E01-S001-2 (Badge), E01-S001-3-T4 (Skeleton) · **Estimativa:** S

**Objetivo**
Renderizar a linha de 4 KPIs a partir do retorno de `getOverview`, com trend, sparkline, badge de risco e todos os estados (carregando/vazio/erro).

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (`.kpi-row`, `.kpi`, `.trend`, `.sparkline`, `.badge-vulcao`).
- Mocks canônicos: 1.284 (+12%), R$ 142.280 (+8,4%), 47 vagas ("Esgotando" · Meia Maratona Floripa), 68,2% (sparkline).
- DS: Card KPI (flat §2.16), Badge (Vulcão para "Esgotando"), trend up/down, Skeleton, sparkline SVG.

**Arquivos (criar/editar)**
- `apps/painel/app/(overview)/_components/KpiRow.tsx` — orquestra os 4 KPIs a partir de `OverviewKPIs`.
- `apps/painel/app/(overview)/_components/KpiCard.tsx` — card genérico (label, valor, foot: trend | badge | sparkline).
- `apps/painel/app/(overview)/_components/Sparkline.tsx` — sparkline SVG a partir de `number[]`.

**Passos de implementação**
1. Buscar `OverviewKPIs` via `packages/api-client` (server component ou hook com estados).
2. Formatar números em pt-BR (milhar com ponto; moeda "R$ 142.280"; percentuais "68,2%").
3. `KpiCard` variantes de foot: trend (seta up verde / down vulcão + "esta semana"/"vs. semana anterior"), badge (Vulcão "Esgotando" + sublabel do evento), sparkline.
4. Estados: skeleton enquanto carrega; erro com "Tentar novamente"; vazio (zeros + CTA "Crie seu primeiro evento") quando sem eventos/clubes.

**Modelo de dados / contratos**
- Consome `OverviewKPIs` (T2). Nenhuma escrita.

**Regras de negócio a respeitar**
- §2.16 flat (exceção permitida: `border-left` Vulcão no KPI em risco).
- Números sempre do agregado; nunca recalculados no cliente.

**Critérios de aceite (testáveis)**
- **Dado** `OverviewKPIs` mock, **quando** renderizo, **então** vejo "1.284" / "R$ 142.280" / "47" (badge "Esgotando") / "68,2%" com sparkline.
- **Dado** carregando, **quando** monto, **então** 4 skeletons no lugar dos valores.
- **Dado** `taxaConversaoPct` indisponível, **quando** renderizo, **então** o card mostra estado "—" sem quebrar.

**Testes a escrever**
- unit (componente): formatação pt-BR; render de cada variante de foot; skeleton/erro/vazio.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Sem borda decorativa (§2.16, exceção card crítico); tokens do DS
- [ ] Estados vazio/erro/carregando cobertos (§2.12)
- [ ] Acessibilidade AA (números com rótulo acessível, contraste do trend)
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Gráficos históricos interativos além do sparkline (E11).

---

### LEELA-S601 · Eventos ativos e últimas inscrições · (de-para BH-601)

**Como** Organizador, **quero** ver meus eventos ativos e as últimas inscrições cross-evento, **para** agir rápido no que precisa de atenção sem abrir cada evento.

- **MoSCoW:** Must (dentro do épico) · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Painel do Organizador.html`
- **RNs:** RN-204, §2.5, §2.12, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** eventos do profissional, **quando** a seção "Seus eventos ativos" renderiza, **então** lista cada evento com thumb por categoria, nome, data/local, badge de status (Publicado/Rascunho) e/ou "Últimas vagas", contador "X / capacidade" e botão "Gerenciar" que navega para a operação do evento (E03).
- **Dado** as inscrições recentes cross-evento, **quando** "Últimas inscrições" renderiza, **então** mostra tabela com atleta (avatar+nome), evento, modalidade, valor (alinhado à direita), status (badge por RN-204: Pago/Pendente/Recusado) e data relativa, com link "Ver todas".
- **Dado** que o profissional não tem eventos ativos, **quando** a seção carrega, **então** EmptyState "Nenhum evento ativo" com CTA para criar evento.
- **Dado** que não há inscrições, **quando** a tabela carrega, **então** EmptyState "Nenhuma inscrição recente".
- **Dado** carregamento, **quando** as seções montam, **então** skeleton de linhas (nunca spinner solto em lista).

**Tasks:** LEELA-S601-T1, LEELA-S601-T2

---

#### LEELA-S601-T1 · Seção "Seus eventos ativos"

- **Tipo:** screen · **Depende de:** S600-T1, E01-S001-2 (Badge), E03 (rota de operação do evento) · **Estimativa:** S

**Objetivo**
Renderizar a lista de eventos ativos do profissional com contador de inscrições, badge de status/risco e ação "Gerenciar" navegando para a operação do evento.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (`.events-list`, `.event-row`, `.event-thumb`, `.event-count`).
- Mocks canônicos: Meia Maratona Floripa 2026 (27 Abr · Florianópolis/SC · 453/500 · "Últimas vagas" · Publicado); Desafio Serra do Mar · MTB (11 Mai · Cunha/SP · 60km/90km · 312/600 · Publicado); Retiro Bem-Estar · Edição Outono (23 Mai · Campos do Jordão/SP · 3 dias · 78/120 · Rascunho).
- DS: `event-thumb` (gradiente por categoria + ícone Lucide), Badge (Vitória "Publicado", Alerta "Rascunho", Vulcão "Últimas vagas"), Button secundário sm, EmptyState.

**Arquivos (criar/editar)**
- `apps/painel/app/(overview)/_components/ActiveEvents.tsx` — seção + header com link "Ver todos os eventos".
- `apps/painel/app/(overview)/_components/EventRow.tsx` — linha de evento.
- `packages/core/src/overview/activeEvents.ts` — seleção/ordenação de eventos ativos + derivação de badges.
- `packages/api-client/src/events.ts` — query de eventos do profissional (se não existir do E03).

**Passos de implementação**
1. Query `eventos` onde `organizadorId == uid` e `status ∈ {publicado, ao_vivo, rascunho}`, ordenados por proximidade de data.
2. Derivar badge de risco "Últimas vagas" quando ocupação ≥ limiar (mesmo limiar do KPI de risco — reusar de `kpis.ts`).
3. `EventRow`: thumb por categoria (corrida/ciclismo/yoga…), nome, meta (data · local, separador, modalidades ou detalhe), contador "X / capacidade", badge de status, botão "Gerenciar" → `/eventos/{slug}` (E03).
4. Header com "Ver todos os eventos" → hub de eventos (E03). EmptyState e skeleton.

**Modelo de dados / contratos**
- Lê `eventos/{id}`: `nome`, `data`, `local`, `modalidades[]`, `status`, `slug`, ∑`qtdInscritos`, `capacidade`. Nenhuma escrita.

**Regras de negócio a respeitar**
- §2.16 flat; badges semânticos coerentes (nunca misturar semântica de cor).
- Contador e risco derivam do mesmo agregado dos KPIs (fonte única).

**Critérios de aceite (testáveis)**
- **Dado** os 3 eventos mock, **quando** renderizo, **então** vejo Meia Maratona Floripa (453/500, "Últimas vagas", "Publicado") e Retiro Bem-Estar com badge "Rascunho".
- **Dado** clique em "Gerenciar" da Meia Maratona, **quando** navego, **então** vou para a operação do evento `meia-floripa-2026`.
- **Dado** zero eventos ativos, **quando** carrego, **então** EmptyState com CTA de criar evento.

**Testes a escrever**
- unit (core): derivação de badge de risco por ocupação; ordenação por data.
- e2e: "Gerenciar" leva à rota do evento correto.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] §2.16 flat; tokens do DS
- [ ] EmptyState + skeleton cobertos (§2.12)
- [ ] Acessibilidade AA (thumb decorativa com `aria-hidden`, botão rotulado)
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Filtros/ordenação manual da lista (mora no hub de eventos, E03).

---

#### LEELA-S601-T2 · Tabela "Últimas inscrições" (cross-evento)

- **Tipo:** screen · **Depende de:** S600-T1, E01-S001-3-T2 (Table densa) · **Estimativa:** S

**Objetivo**
Renderizar as últimas inscrições do profissional, agregando inscritos de todos os seus eventos, com status por RN-204 e link para a lista completa.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (`.table`, `.col-athlete`, `.avatar-sm`, `.col-value`, `.col-date`).
- Mocks canônicos: Rafael Guimarães (Meia Maratona Floripa · 21km · R$ 189,00 · Pago · Hoje 14:22); Camila Souza (Desafio Serra do Mar · MTB 90km · R$ 245,00 · Pago · Hoje 13:41); Lucas Bittencourt (Meia Maratona Floripa · 10km · R$ 129,00 · Pendente · Hoje 12:17); Juliana Melo (Retiro Bem-Estar · Pacote completo · R$ 890,00 · Pago · Ontem 19:58); André Ferrari (Desafio Serra do Mar · MTB 60km · R$ 195,00 · Recusado · Ontem 18:02).
- DS: Table densa (§2.5), Avatar sm (gradiente inicial), Badge (Vitória "Pago", Alerta "Pendente", Vulcão "Recusado"), EmptyState.

**Arquivos (criar/editar)**
- `apps/painel/app/(overview)/_components/RecentRegistrations.tsx` — seção + tabela + link "Ver todas".
- `packages/core/src/overview/recentRegistrations.ts` — merge/ordenação cross-evento + mapeamento de status → badge.
- `packages/api-client/src/registrations.ts` — query das últimas inscrições do profissional.

**Passos de implementação**
1. Buscar inscritos recentes dos eventos do profissional (collection group `inscritos` filtrado por `organizadorId`/escopo), ordenar por `criadoEm` desc, limitar (ex.: 5).
2. Mapear `status` (RN-204) → badge: `confirmado`→"Pago" (Vitória), `pendente`→"Pendente" (Alerta), `cancelado`→"Recusado" (Vulcão).
3. Colunas: Atleta (avatar sm + `atletaNome`), Evento, Modalidade, Valor (direita, "R$ 189,00"), Status, Data (relativa "Hoje · 14:22" / "Ontem · 19:58").
4. Link "Ver todas" → lista de inscritos consolidada (ou hub de eventos). EmptyState e skeleton de linhas.

**Modelo de dados / contratos**
- Lê `eventos/{id}/inscritos/{id}`: 🔁`atletaNome`, `modalidade`, `status`, `valor`, `criadoEm`. Nenhuma escrita.

**Regras de negócio a respeitar**
- RN-204 — três status mapeados corretamente aos badges.
- §2.5 tabela densa; §2.16 flat; copy exata do glossário.

**Critérios de aceite (testáveis)**
- **Dado** as 5 inscrições mock, **quando** renderizo, **então** a ordem é por data desc e os badges batem (Pago/Pendente/Recusado).
- **Dado** inscrição `pendente`, **quando** mapeio, **então** badge "Pendente" (Alerta), não "Pago".
- **Dado** zero inscrições, **quando** carrego, **então** EmptyState "Nenhuma inscrição recente".

**Testes a escrever**
- unit (core): merge cross-evento + ordenação; mapa status→badge (RN-204); formatação de data relativa e moeda.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] §2.5 densa + §2.16 flat; tokens do DS
- [ ] EmptyState + skeleton de linhas (§2.12)
- [ ] Acessibilidade AA (cabeçalhos de tabela, avatar decorativo `aria-hidden`)
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Busca/filtro/paginação (mora na tela de inscritos do evento, E03).

---

### LEELA-S602 · Coluna lateral: próximo evento, ações rápidas e alertas · (de-para BH-602)

**Como** Organizador, **quero** ver o próximo evento com contagem regressiva, ações rápidas e alertas operacionais, **para** não perder prazos e agir direto do painel inicial.

- **MoSCoW:** Should (dentro do épico) · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Painel do Organizador.html`
- **RNs:** RN-204, §2.12, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** o próximo evento do profissional, **quando** o countdown-card renderiza, **então** mostra eyebrow "Próximo evento", nome, "N dias restantes", quando/local, mini-stats (Inscritos / Vagas livres) e ações rápidas (Ver inscritos, Comunicar, Check-in) navegáveis.
- **Dado** os alertas operacionais, **quando** o painel de alertas renderiza, **então** lista cada alerta com ícone por severidade (warn/info/ok), título e tempo relativo, e contador "N novos".
- **Dado** que o profissional não tem próximo evento, **quando** a coluna carrega, **então** o countdown-card mostra estado vazio ("Nenhum evento agendado" + CTA criar).
- **Dado** que não há alertas, **quando** carrega, **então** EmptyState "Tudo em dia. Nenhum alerta."
- **Dado** carregamento, **quando** monta, **então** skeleton dos cards.

**Tasks:** LEELA-S602-T1, LEELA-S602-T2

---

#### LEELA-S602-T1 · Countdown card do próximo evento + ações rápidas

- **Tipo:** screen · **Depende de:** S600-T1, E03 (rotas: inscritos, comunicar, check-in) · **Estimativa:** S

**Objetivo**
Renderizar o card do próximo evento com contagem regressiva, mini-stats e três ações rápidas que navegam para os fluxos de operação do evento.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (`.countdown-card`, `.countdown-number`, `.countdown-stats`, `.quick-actions`, `.quick-btn`).
- Mocks canônicos: Meia Maratona Floripa 2026 · "08 dias restantes" · 27 Abr · 06:00 · Av. Beira-Mar Norte · Inscritos 453 · Vagas livres 47.
- DS: Card destaque (permitido elev-brand/border-left conforme §2.16 card crítico), ícones Lucide, botões de ação rápida.

**Arquivos (criar/editar)**
- `apps/painel/app/(overview)/_components/NextEventCard.tsx` — countdown + stats + ações.
- `packages/core/src/overview/countdown.ts` — cálculo de dias restantes a partir de `data` do evento.

**Passos de implementação**
1. Selecionar o próximo evento (menor `data` futura entre os eventos do profissional; reusar seleção de `activeEvents.ts`).
2. `countdown.ts`: dias restantes = diferença de datas em dias inteiros (fuso pt-BR), com singular/plural ("1 dia restante" / "N dias restantes").
3. Renderizar eyebrow, nome, número grande + unidade, quando/local, mini-stats (Inscritos = ∑`qtdInscritos`; Vagas livres = capacidade − inscritos).
4. Ações rápidas: "Ver inscritos" → inscritos do evento; "Comunicar" → comunicação; "Check-in" → balcão de entrega (E03). Estado vazio quando sem evento futuro.

**Modelo de dados / contratos**
- Lê `eventos/{id}`: `nome`, `data`, `local`, ∑`qtdInscritos`, `capacidade`, `slug`. Nenhuma escrita.
- Tipo: `type Countdown = { dias: number; label: string }` em core.

**Regras de negócio a respeitar**
- §2.16 (card crítico é exceção permitida a "flat"); tokens do DS.
- Dias restantes calculados no cliente a partir da data (não é agregado financeiro).

**Critérios de aceite (testáveis)**
- **Dado** Meia Maratona Floripa em 27 Abr e hoje 19 Abr, **quando** calculo, **então** "08 dias restantes"; mini-stats 453 inscritos / 47 vagas livres.
- **Dado** clique em "Check-in", **quando** navego, **então** vou ao balcão de entrega do evento (E03).
- **Dado** nenhum evento futuro, **quando** carrego, **então** estado vazio "Nenhum evento agendado".

**Testes a escrever**
- unit (core): `countdown.ts` (dias inteiros, singular/plural, evento hoje = "Hoje").

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Tokens do DS; §2.16 respeitado (exceção card crítico justificada)
- [ ] Estado vazio + skeleton (§2.12)
- [ ] Acessibilidade AA (ações rotuladas, ícones decorativos `aria-hidden`)
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Contagem regressiva em tempo real (segundos/minutos animados); aqui é em dias.

---

#### LEELA-S602-T2 · Painel de alertas operacionais

- **Tipo:** screen · **Depende de:** S600-T1, S600-T2 (agregados de origem) · **Estimativa:** S

**Objetivo**
Renderizar a lista de alertas operacionais derivados do estado dos eventos/inscrições do profissional, com severidade, título e tempo relativo.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Painel do Organizador.html` (`.side-panel`, `.alerts-list`, `.alert-item`, `.alert-icon warn|info|ok`).
- Mocks canônicos: "Meia Maratona Floripa está com 90% das vagas preenchidas" (warn · há 2h); "3 inscrições pendentes aguardam pagamento há mais de 24h" (info · há 5h); "Repasse de R$ 48.920 confirmado · Desafio Serra do Mar" (ok · ontem); "Retiro Bem-Estar ainda não foi publicado · prazo 14 dias" (warn · ontem). Contador "4 novos".
- DS: ícone por severidade (warn/info/ok), tipografia de alerta, EmptyState.

**Arquivos (criar/editar)**
- `apps/painel/app/(overview)/_components/AlertsPanel.tsx` — lista + contador + EmptyState.
- `packages/core/src/overview/alerts.ts` — regras de derivação de alertas + severidade.
- `functions/src/overview/getOverview.ts` — estender retorno com `alerts[]` (ou callable dedicada).

**Passos de implementação**
1. Definir `type OverviewAlert = { id: string; severidade: 'warn'|'info'|'ok'; titulo: string; quando: string; href?: string }`.
2. Regras de derivação em `alerts.ts` (puras): ocupação ≥ 90% → warn; N inscrições `pendente` > 24h (RN-204) → info; repasse confirmado → ok; evento não publicado com prazo próximo → warn.
3. Derivar no servidor (Function) para não vazar varredura ao cliente; retornar lista ordenada por recência com `quando` relativo.
4. `AlertsPanel`: renderizar itens com ícone por severidade, título, meta de tempo, contador "N novos"; cada alerta navegável quando houver `href`; EmptyState "Tudo em dia."

**Modelo de dados / contratos**
- Lê agregados/inscritos dos eventos do profissional (via Function). Nenhuma escrita de domínio.
- Contrato: `getOverview() -> { ...OverviewKPIs, alerts: OverviewAlert[] }` (ou `getAlerts()`).

**Regras de negócio a respeitar**
- RN-204 — "pendente" alimenta o alerta de pagamento.
- Derivação no servidor; cliente só renderiza; §2.16 flat.

**Critérios de aceite (testáveis)**
- **Dado** um evento com 90% de ocupação, **quando** derivo alertas, **então** existe um alerta `warn` "…90% das vagas preenchidas".
- **Dado** 3 inscrições pendentes > 24h, **quando** derivo, **então** alerta `info` correspondente.
- **Dado** nenhum sinal, **quando** carrego, **então** EmptyState "Tudo em dia. Nenhum alerta."

**Testes a escrever**
- unit (core): cada regra de derivação de alerta e sua severidade; ordenação por recência.
- integração (Emulator): `getOverview`/`getAlerts` só retorna alertas do escopo do profissional.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] §2.16 flat; tokens do DS
- [ ] EmptyState + skeleton (§2.12)
- [ ] Acessibilidade AA (severidade não só por cor — ícone + texto)
- [ ] Derivação no servidor; sem dado sensível no cliente
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Marcar alerta como lido / centro de notificações persistente (fase posterior); ação inline de resolução (só navega).

---

## Ordem sugerida

`S600-T1 (rota/shell) → S600-T2 (Function de agregado) → S600-T3 (KPIs) → S601-T1/T2 (eventos + inscrições) → S602-T1/T2 (coluna lateral)`.

## Rastreabilidade

| Story | De-para | Tasks |
|---|---|---|
| LEELA-S600 | BH-600 (Dashboard global) | T1 rota/shell · T2 Function agregado · T3 KPI row |
| LEELA-S601 | BH-601 (eventos + inscrições) | T1 eventos ativos · T2 últimas inscrições |
| LEELA-S602 | BH-602 (coluna lateral) | T1 próximo evento/countdown · T2 alertas |

> Nota de-para: o backlog BH-E02 detalha explicitamente apenas BH-600 (`Visao-Geral.html`). BH-601 e BH-602 são a decomposição das regiões da mesma tela canônica (`Painel do Organizador.html`) em stories rastreáveis para execução por IA.
