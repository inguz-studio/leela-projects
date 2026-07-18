# LEELA-E08 · Painel do Influenciador

- **Superfície:** Painel
- **Horizonte:** H3 (Onda 5 — Expansão)
- **MoSCoW:** Could
- **Estimativa:** XL
- **Status:** 🧊 Icebox
- **Depende de:** LEELA-E00 (fundação), LEELA-E01 (Design System & Shell), LEELA-E04 (programa de afiliação do organizador + PaymentProvider)
- **De-para:** BH-E08 (BH-700 · Painel do Influenciador)

## Objetivo

Dar ao **Promotor/Influenciador** individual uma área própria para descobrir eventos que remuneram divulgação, aceitar a afiliação com um clique, obter link master rastreável + cupom e acompanhar conversões e repasses sem "cobrar na mão" do organizador. É a segunda alavanca de cold start do marketplace (a primeira é o clube, no E05): o promotor individual é o outro tipo de afiliado (RN-312) que consome exatamente o mesmo programa de afiliação configurado pelo organizador (RN-310/311) e o mesmo `PaymentProvider` de split usado no fluxo de vendas.

O épico reusa a mecânica de afiliação já existente do lado do clube (E05 · parcerias evento_afiliado) e do organizador (E04 · programa de afiliação + promotores), materializando-a para uma entidade `promotores/{promoterId}` com suas próprias parcerias e agregados mantidos por Cloud Function.

## Personas & JTBD

- **Persona primária:** Promotor / Influenciador individual — **Dioney Galharte** (independente, iniciais DG; mock canônico do futuro Painel do Influenciador).
- **JTBD atendidos:**
  - "Quando divulgo um evento, quero um link rastreável para receber comissão sem cobrar na mão."
  - "Quando trago vendas, quero ver minhas conversões em tempo real."
  - "Quando recebo comissão, quero repasse automático e transparente."

## Critérios de sucesso do épico

- Promotor navega hub → eventos disponíveis → aceitar → link master + cupom gerados, sem contato manual com o organizador.
- Conversão originada pelo link do promotor é atribuída dentro da janela do programa (RN-311) e aparece em "Minhas conversões" com status correto.
- Financeiro mostra a-receber / liberado / pago por evento, alimentado pelo split do `PaymentProvider` (mesma fonte do E04/E09).
- Todas as listas têm busca + filtros + estado vazio + contador "mostrando X de Y"; todas as telas consomem `packages/design-system` (§2.16 flat).

## Regras de negócio aplicáveis

- **RN-310** — Organizador define a comissão; o promotor apenas aceita/recusa (read-only para o afiliado).
- **RN-311** — Programa de afiliação define % de comissão, janela de atribuição, teto mensal e cupom.
- **RN-312** — Clube e promotor individual são os dois tipos de afiliado do mesmo programa.
- **RN-125** — Aceitar afiliação gera link master rastreável + cupom exclusivo (mesma mecânica do clube, aplicada ao promotor).
- **RN-144** — Ações irreversíveis (encerrar afiliação) com disclaimer; export de dados por 90 dias.

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Este épico introduz o promotor como afiliado:

- **`promotores/{promoterId}`** (nova coleção top-level) — `nome`, `email` (único), `avatarInit`, `bio?`, `canais?[]` (instagram/tiktok/etc.), `criadoEm`. Auth: Firebase Auth uid = promoterId; papel `promotor` via custom claim.
- **`promotores/{promoterId}/parcerias/{parceriaId}`** — espelha `clubes/{clubId}/parcerias` do tipo `evento_afiliado`: `eventoId→eventos`, `organizadorId`, `programaAfiliacaoRef` (termos read-only espelhados — RN-310/311), 🔁`comissaoPct`, `cupom`, `linkMaster`, `janelaAtribuicaoDias`, `status`(convite_pendente/ativa/inativa); ∑`conversoes`, ∑`valorAReceber` mantidos por Function no evento de conversão/split.
- Reuso: `eventos/{eventoId}/programaAfiliacao/{unico}` (E04, RN-311) e o split do `PaymentProvider` (webhook de pagamento) que já atualiza agregados de afiliação.

## Fora de escopo (Won't nesta fase)

- App/superfície dedicada do promotor fora do Painel (por ora vive como área de rota no `apps/painel`).
- Sub-afiliação (promotor recruta promotor).
- Marketplace de eventos com ranking/descoberta algorítmica — a lista é simples (eventos com programa aberto a promotores individuais).
- Onboarding/cadastro público do promotor (assume promotor já autenticado com claim `promotor`).

---

## User stories

### LEELA-S701 · Hub do influenciador · (de-para BH-700.1)

**Como** promotor, **quero** um hub com meus números e atividade recente, **para** entender de relance quanto estou gerando e o que exige ação.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-311, RN-312

**Critérios de aceite (Given/When/Then):**
- **Dado** um promotor autenticado com afiliações ativas, **quando** abro o hub, **então** vejo KPIs (conversões 30d, valor a receber, afiliações ativas, cliques 30d) alimentados por agregados de Function.
- **Dado** um promotor sem nenhuma afiliação, **quando** abro o hub, **então** vejo EmptyState com CTA para "Eventos disponíveis para divulgar".
- **Dado** agregados em atualização, **quando** carrego, **então** os KPIs mostram skeleton (nunca spinner solto).

**Tasks:** LEELA-S701-T1.

#### LEELA-S701-T1 · Rota + shell + hub de KPIs do promotor
- **Tipo:** screen · **Depende de:** E01-S001-3-T1 (Shell), E04 (programa de afiliação) · **Bloqueia:** S702, S703, S704 · **Estimativa:** M

**Objetivo**
Criar a área de rota do influenciador no painel com shell próprio e o hub de KPIs + atividade recente do promotor.

**Contexto & referências**
- Não há tela dedicada no protótipo; derivar do backlog BH-700.1 e do padrão de hub de KPIs do Club-Overview (E05).
- Mocks: Dioney Galharte (DG); afiliações espelhadas dos eventos canônicos (Meia Floripa 2026, Trail Ratones, Corrida da Ponte — HANDOFF-05).
- DS: Shell (Sidebar reduzida do promotor), Card de KPI, EmptyState, Skeleton, Table densa (§2.5).

**Arquivos (criar/editar)**
- `apps/painel/app/influenciador/layout.tsx` — shell da área do promotor (sidebar: Hub, Eventos, Conversões, Financeiro).
- `apps/painel/app/influenciador/page.tsx` — hub de KPIs + atividade recente.
- `packages/core/src/affiliation/promoter.ts` — tipo `Promotor` + derivação de KPIs a partir de agregados.
- `packages/api-client/src/promoters.ts` — leitura de `promotores/{id}` + agregados.

**Passos de implementação**
1. Registrar route group `influenciador` com guard de claim `promotor`.
2. Montar shell com navegação de 4 itens.
3. Ler `promotores/{promoterId}` + somar agregados de `parcerias` (conversões, valorAReceber) para os KPIs.
4. Renderizar KPIs, atividade recente (últimas conversões) e EmptyState quando sem afiliações.

**Modelo de dados / contratos**
- Coleções: `promotores/{promoterId}` (+ subcoleção `parcerias`).
- Tipo: `type Promotor = { id; nome; email; avatarInit; canais?: string[] }` em `packages/core`.

**Regras de negócio a respeitar**
- RN-312 — promotor é afiliado; RN-311 — termos vêm do programa (read-only).

**Critérios de aceite (testáveis)**
- **Dado** promotor com 3 afiliações, **quando** abro o hub, **então** KPIs somam as 3 e listo atividade recente.
- **Dado** promotor sem afiliação, **quando** abro, **então** EmptyState com CTA.

**Testes a escrever**
- unit: derivação de KPIs a partir de agregados (`core`).
- integração: Security Rules — promotor lê apenas `promotores/{ownUid}`.

**Definition of Done**
- [ ] Ver checklist padrão em `definition-of-done.md` (DoD Tela + Componente).

**Fora de escopo**
- Cadastro/edição de perfil do promotor.

---

### LEELA-S702 · Eventos disponíveis para divulgar · (de-para BH-700.2)

**Como** promotor, **quero** ver eventos com programa de afiliação aberto e aceitar num clique, **para** obter link rastreável e cupom sem negociar manualmente.

- **MoSCoW:** Could · **Estimativa:** L · **Superfície:** Painel · **RNs:** RN-310, RN-311, RN-312, RN-125

**Critérios de aceite (Given/When/Then):**
- **Dado** eventos com `programaAfiliacao` aberto a promotores individuais, **quando** abro a lista, **então** vejo cada evento com comissão %, janela e cupom (termos read-only — RN-310).
- **Dado** um evento disponível, **quando** aceito a afiliação, **então** é criado `promotores/{id}/parcerias/{parceriaId}` com `linkMaster` + `cupom` gerados e status `ativa` (RN-125).
- **Dado** nenhum evento elegível, **quando** abro, **então** EmptyState "Nenhum evento disponível para divulgação no momento".

**Tasks:** LEELA-S702-T1.

#### LEELA-S702-T1 · Lista de eventos elegíveis + aceitar afiliação (gera link/cupom)
- **Tipo:** screen + api/function · **Depende de:** S701-T1, E04 (programaAfiliacao) · **Estimativa:** L

**Objetivo**
Listar eventos com programa aberto a promotores e permitir aceitar, criando a parceria com link master + cupom via Function (nunca no cliente).

**Contexto & referências**
- Backlog BH-700.2; termos do programa herdam RN-310/311 (E04).
- Mocks: eventos canônicos com afiliação (Meia Floripa 2026 comissão 10%, janela 7d, cupom `CORRIDAPERFEITA10`; Trail Ratones 8%; Corrida da Ponte 6% — HANDOFF-05).
- DS: Table densa (§2.5) ou grid de Cards de Evento, ConfirmModal (§2.15) para o aceite, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/influenciador/eventos/page.tsx` — lista de eventos elegíveis + ação aceitar.
- `functions/src/affiliation/acceptPromoterAffiliation.ts` — cria parceria, gera `linkMaster` + `cupom`.
- `packages/core/src/affiliation/masterLink.ts` — geração determinística do link/cupom (reuso do E05).

**Passos de implementação**
1. Query eventos com `programaAfiliacao` marcado como aberto a promotores individuais (RN-312), excluindo os já afiliados.
2. Renderizar termos read-only (comissão, janela, teto, cupom — RN-310/311).
3. Ação "Aceitar" → ConfirmModal com resumo dos termos → chama Function.
4. Function valida elegibilidade, cria `promotores/{id}/parcerias/{parceriaId}` (status `ativa`), gera `linkMaster` + `cupom`; Toast de sucesso.

**Modelo de dados / contratos**
- Escreve `promotores/{promoterId}/parcerias/{parceriaId}` (campos espelhados de `eventos/{id}/programaAfiliacao`).
- Function: `acceptPromoterAffiliation({ eventoId }) -> { parceriaId, linkMaster, cupom }`.

**Regras de negócio a respeitar**
- RN-310 — termos read-only para o promotor; RN-311 — %, janela, teto, cupom; RN-125 — aceite gera link+cupom; RN-312 — promotor como afiliado.

**Critérios de aceite (testáveis)**
- **Dado** um evento elegível, **quando** aceito, **então** a parceria é criada com link+cupom e o evento sai da lista de disponíveis.
- **Dado** que já sou afiliado a um evento, **quando** listo, **então** ele não aparece como disponível.

**Testes a escrever**
- unit: geração do link/cupom (`core`).
- integração: Function idempotente (aceitar duas vezes não duplica parceria); Security Rules (parceria só criada via Function).
- e2e: aceitar afiliação → link master rastreável disponível.

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela + API/Function).

**Fora de escopo**
- Negociação de termos (comissão é fixada pelo organizador).

---

### LEELA-S703 · Minhas conversões · (de-para BH-700.3)

**Como** promotor, **quero** ver minhas conversões por evento com status e janela de atribuição, **para** acompanhar o que trouxe e o que ainda vai liberar.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-311, RN-125

**Critérios de aceite (Given/When/Then):**
- **Dado** conversões atribuídas ao meu link dentro da janela (RN-311), **quando** abro a tela, **então** vejo tabela densa por evento com data, valor e status (atribuída/confirmada/cancelada).
- **Dado** filtro por evento ou status, **quando** aplico e nada casa, **então** EmptyState + contador "mostrando 0 de N".
- **Dado** conversão fora da janela de atribuição, **quando** listo, **então** ela não é contada como minha.

**Tasks:** LEELA-S703-T1.

#### LEELA-S703-T1 · Tabela de conversões com filtros e atribuição por janela
- **Tipo:** screen · **Depende de:** S702-T1 · **Estimativa:** M

**Objetivo**
Renderizar a lista densa de conversões do promotor com filtros combináveis e status derivado da janela de atribuição.

**Contexto & referências**
- Backlog BH-700.3; atribuição herda RN-311 (janela) e RN-125 (link master).
- Mocks: performance canônica (ex.: Meia Floripa — cliques únicos, conversões, taxa; HANDOFF-05).
- DS: Table densa (§2.5), Chips de filtro, EmptyState, Badge de status.

**Arquivos (criar/editar)**
- `apps/painel/app/influenciador/conversoes/page.tsx` — tabela + filtros (evento × status).
- `packages/core/src/affiliation/attribution.ts` — regra de atribuição por janela (reuso do E05).

**Passos de implementação**
1. Query conversões agregadas das `parcerias` do promotor.
2. Derivar/validar atribuição pela janela (RN-311) em `core`.
3. Filtros combináveis (evento × status) + busca; contador "mostrando X de Y"; EmptyState.

**Modelo de dados / contratos**
- Lê ∑`conversoes` de `promotores/{id}/parcerias/{parceriaId}` (mantido por Function).

**Regras de negócio a respeitar**
- RN-311 — atribuição só dentro da janela; RN-125 — origem via link master.

**Critérios de aceite (testáveis)**
- **Dado** um clique convertido dentro da janela, **quando** listo, **então** conta como minha conversão; fora da janela, não.
- **Dado** filtro sem correspondência, **quando** aplico, **então** EmptyState + contador 0.

**Testes a escrever**
- unit: atribuição por janela (`core`).
- e2e: conversão registrada aparece com status correto.

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela).

**Fora de escopo**
- Detalhe individual do atleta convertido (dado agregado, privacidade — ver matriz de tensões).

---

### LEELA-S704 · Financeiro do influenciador · (de-para BH-700.4)

**Como** promotor, **quero** ver a receber / liberado / pago por evento, **para** confiar que o repasse é automático e transparente.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-311

**Critérios de aceite (Given/When/Then):**
- **Dado** conversões confirmadas via split do `PaymentProvider`, **quando** abro o financeiro, **então** vejo totais a receber / liberado / pago e breakdown por evento com data de liberação.
- **Dado** que uma janela de atribuição/liberação ainda não fechou, **quando** listo, **então** o valor aparece como "a receber" (não liberado).
- **Dado** teto mensal do programa (RN-311), **quando** excedido, **então** o excedente é sinalizado conforme a regra do programa.

**Tasks:** LEELA-S704-T1.

#### LEELA-S704-T1 · Painel financeiro do promotor sobre o split do PaymentProvider
- **Tipo:** screen + integration · **Depende de:** S703-T1, PaymentProvider (E04/ADR-006) · **Estimativa:** M

**Objetivo**
Exibir o financeiro do promotor lendo os agregados de `valorAReceber`/liberado/pago mantidos pelo split de pagamento, sem cálculo ad-hoc no cliente.

**Contexto & referências**
- Backlog BH-700.4; reutiliza o mesmo split de afiliação do E04/E09.
- Mocks: a receber por evento (ex.: R$ 528 Meia Floripa, liberação após a prova — HANDOFF-05).
- DS: Card de KPI, Table densa (§2.5), Badge de status de repasse.

**Arquivos (criar/editar)**
- `apps/painel/app/influenciador/financeiro/page.tsx` — totais + breakdown por evento.
- `functions/src/payments/split.ts` — (editar) garantir que o split atualiza ∑`valorAReceber` também na parceria do promotor.
- `packages/core/src/affiliation/settlement.ts` — estados a-receber/liberado/pago + teto mensal (RN-311).

**Passos de implementação**
1. No webhook/split de pagamento, fan-out para atualizar ∑ na parceria do promotor (idempotente).
2. Ler agregados por parceria e consolidar totais no `core`.
3. Renderizar KPIs + tabela por evento (valor, status, data de liberação); aplicar teto mensal.

**Modelo de dados / contratos**
- Lê ∑`valorAReceber` de `promotores/{id}/parcerias/{parceriaId}` (escrita apenas via Function).
- Function/webhook: split idempotente, assinado/verificado.

**Regras de negócio a respeitar**
- RN-311 — teto mensal, janela, %; agregados financeiros escritos apenas por Function.

**Critérios de aceite (testáveis)**
- **Dado** um pagamento confirmado atribuído a mim, **quando** o webhook processa, **então** meu "a receber" incrementa idempotentemente.
- **Dado** liberação após a data do programa, **quando** listo, **então** o valor migra de "a receber" para "liberado".

**Testes a escrever**
- integração (crítica — risco financeiro): split idempotente atualiza a parceria do promotor; webhook assinado; reprocessar não duplica.
- unit: transição a-receber → liberado → pago e teto mensal (`core`).

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD API/Function + Tela); cobertura **máxima** na camada de pagamento (ver `estrategia-testes.md`).

**Fora de escopo**
- Emissão de nota fiscal / KYC do promotor.

---

## Ordem sugerida

`S701 (hub) → S702 (eventos + aceitar) → S703 (conversões) → S704 (financeiro)`. Reusa integralmente a mecânica de afiliação do E04/E05 e o `PaymentProvider`; nenhum termo comercial é definido aqui (RN-310).

## Recorte ANTECIPADO (R9 · decisão do Vitor 2026-07-18)

> O Vitor decidiu em 2026-07-18: *"a parte de influenciadores pode ser antecipada para agora."* O recorte **afiliados** (link ref → atribuição → conversões, visão do organizador, **sem comissionamento**) foi ANTECIPADO no LOTE R9. O **resto do E08** (painel do promotor S701-S704, financeiro/split) segue **H3**.

- **RN-313 · Link de afiliado `?ref=<código>` capturado na inscrição.** Atribuído na venda dentro da janela (`dentroDaJanelaAtribuicao`, `packages/core/src/clubs/parceria.ts:184`), preservando a disciplina de atribuição do CTA (E12), reusando a costura `cupomParceria` do `createInscricaoCharge` (`functions/src/checkout/createInscricaoCharge.ts:365-401`) — **sem split**. Atribuição fora da janela não conta.
- **RN-314 · Registro de conversões por afiliado.** Subcoleção `eventos/{eventoId}/afiliados/{afiliadoId}` (organizador dono — decisão justificada em `DECISOES-ABERTAS`: coleção própria, não 3º ramo do union `parcerias`; reusa o kernel de janela + atribuição). ∑ conversões por Function idempotente, escrita exclusiva; organizador vê conversões + valor atribuído (informativo, sem comissão).
- **Fase 2 (pergunta de decisão, NÃO neste recorte):** comissionamento/repasse ao influenciador (dinheiro → review Fable; absorve/antecipa split do E08). Registrado em `DECISOES-ABERTAS`.

Story `S-R9-11`. Spec: `ux-review-2026-07-18/`.

### Mecânica do influenciador (adendo 3 do Vitor · 2026-07-18)

- **RN-315 · Clube como influenciador com threshold.** Clube pode ter link de desconto próprio condicionado a `minimoInscricoes` (definível pelo organizador por parceria/evento). Antes do mínimo (default recomendado): o link rastreia conversão, mas o desconto só ativa ao cruzar o mínimo — **sem desconto retroativo** (retroatividade abriria reprocessamento de vendas pagas). Onde vive: `minimoInscricoes` na parceria/afiliado.
- **RN-316 · Influenciador PF por convite de e-mail.** Convidado por e-mail a criar conta; dashboard das próprias vendas. **Reuso obrigatório (provado por leitura):** `functions/src/assessorias/provisionAssessoria.ts` (`provisionAssessoriaAccount` — convite hasheado, cria/vincula Auth, transação anti-TOCTOU) + rate-limit R2 (failures-only por alvo) + kernel de atribuição (`cupom.clubeRef`/`dentroDaJanelaAtribuicao`). Produção depende do EmailProvider (fail-closed hoje) — **a antecipação eleva a urgência do EmailProvider** nas ações externas.
- **RN-317 · Config via modal.** Cadastro de novo influenciador (clube ou PF) é modal no painel (shadcn), não página dedicada.
- **RN-318 · Escopo de leitura do influenciador.** Vê SÓ as próprias conversões (projeção fechada: qtd/valor/status); nunca dado de terceiros além do agregado da própria atribuição. Rules fail-closed; PII PF com documento mascarado + trust anchors (padrão E18).

Story `S-R9-11` (tasks T5/T6/T7). Spec: `ux-review-2026-07-18/`.

### Adendo 5 (Vitor · 2026-07-18)

- **RN-319 · Acompanhamento de vendas na aba Clubs (dois lados) — RATIFICADA.** O **organizador** vê as vendas/conversões do clube-influenciador e do influenciador PF na **sua aba Clubs**; o **clube/influenciador** vê as próprias vendas na **aba Clubs da própria conta**. Escopo de leitura coerente com RN-318 (cada influenciador só as próprias; organizador só as do próprio tenant). Story `S-R9-11` (task T8).
- **HIP-R9-01 · Modelo "pré-compra" do clube-influenciador (HIPÓTESE, NÃO ratificada).** Proposta group-buy: inscrições pelo link do clube entram em estado "pré-compra"; ao atingir o mínimo X do organizador, dispara a cobrança no cartão de todas. **Pendente validação com um organizador de eventos** (verbatim do Vitor). Não é RN — a spec entrega a proposta + 4 questões de dinheiro (pré-auth expira; X nunca atingido; recusas parciais no lote; reserva de vaga/estoque). Default conservador enquanto não valida = RN-315. Quando/se implementar: dinheiro ⇒ **rota Fable + review antagonista** (DoD). Detalhe em `DECISOES-ABERTAS` (HIP-R9-01) + `ux-review-2026-07-18/STORIES-r9.md §S-R9-11`.
