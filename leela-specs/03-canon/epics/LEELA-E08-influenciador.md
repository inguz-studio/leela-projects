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
- **Fase 2 — ✅ ENTREGUE (lote COMISSIONAMENTO-F2, 2026-07-18, rota Fable + review antagonista):** comissionamento implementado SOBRE o kernel R9-E (zero contabilidade paralela). Ver §"Fase 2 entregue" abaixo. Desembolso = repasse manual registrado (default em vigor); split do `PaymentProvider` = fase 3, pendente ratificação (`DECISOES-ABERTAS` item 23).

Story `S-R9-11`. Spec: `02-rodadas/2026-07-18-ux-review/`.

### Mecânica do influenciador (adendo 3 do Vitor · 2026-07-18)

- **RN-315 · Clube como influenciador com threshold.** Clube pode ter link de desconto próprio condicionado a `minimoInscricoes` (definível pelo organizador por parceria/evento). Antes do mínimo (default recomendado): o link rastreia conversão, mas o desconto só ativa ao cruzar o mínimo — **sem desconto retroativo** (retroatividade abriria reprocessamento de vendas pagas). Onde vive: `minimoInscricoes` na parceria/afiliado.
- **RN-316 · Influenciador PF por convite de e-mail.** Convidado por e-mail a criar conta; dashboard das próprias vendas. **Reuso obrigatório (provado por leitura):** `functions/src/assessorias/provisionAssessoria.ts` (`provisionAssessoriaAccount` — convite hasheado, cria/vincula Auth, transação anti-TOCTOU) + rate-limit R2 (failures-only por alvo) + kernel de atribuição (`cupom.clubeRef`/`dentroDaJanelaAtribuicao`). Produção depende do EmailProvider (fail-closed hoje) — **a antecipação eleva a urgência do EmailProvider** nas ações externas.
- **RN-317 · Config via modal.** Cadastro de novo influenciador (clube ou PF) é modal no painel (shadcn), não página dedicada.
- **RN-318 · Escopo de leitura do influenciador.** Vê SÓ as próprias conversões (projeção fechada: qtd/valor/status); nunca dado de terceiros além do agregado da própria atribuição. Rules fail-closed; PII PF com documento mascarado + trust anchors (padrão E18).

Story `S-R9-11` (tasks T5/T6/T7). Spec: `02-rodadas/2026-07-18-ux-review/`.

### Fase 2 entregue — comissionamento/repasse (lote COMISSIONAMENTO-F2 · 2026-07-18)

Onda 3 liberada pelo Vitor (audit 14:06). Rota **Fable** + review antagonista (DoD de dinheiro). Tudo ESTENDE o kernel R9-E — nenhuma contabilidade paralela:

- **Modelo de comissão (RN-310 — organizador define):** campo `comissao` no afiliado (`salvarAfiliado`): `percentual` (0,01..100, passo 0,01, sobre o valor FACE) OU `valor_fixo` (R$ por INSCRIÇÃO — base coerente com `conversoes`). `null` = sem comissão (recorte R9-E intacto).
- **Acúmulo cent-exato idempotente:** na CONFIRMAÇÃO (webhook, mesma tx da conversão RN-314), a config vigente é **CONGELADA no doc da conversão** (`comissaoConfig` + `comissao` computada em centavos×basis-points inteiros) e `comissaoAcumulada` acumula por read-modify-write. Replay não duplica (ledger + chave pedidoId). **Anti-forja:** mudar a config depois só afeta conversões futuras.
- **Estorno decrementa (mesma TX do Finding 1b):** recomputa a comissão restante pela config CONGELADA e debita o delta; parcial/integral/replay provados. Comissão nunca negativa (clamp 0).
- **Saldo/extrato (RN-318, projeção fechada):** readers devolvem termos read-only + `comissaoAcumulada`/`comissaoRepassada`/`saldoComissao` + extrato (conversões com comissão, repasses). Saldo PODE ser negativo (estorno pós-repasse = dívida honesta). api-client tipado.
- **Desembolso (default em vigor, ratificação pendente — `DECISOES-ABERTAS` item 23):** `registrarRepasseComissao` = repasse MANUAL off-platform registrado (idempotente por `repasseId`, limitado ao saldo, Rules write:false). **Split do PaymentProvider = FASE 3** — não integrar sem ratificação. **DIRECTIVE (herdada do R9-E, inviolável):** nenhuma rota automática de dinheiro a `responsavelUid` sem `emailVerified === true`.
- **Rules:** `repasses` subcoleção write:false, leitura organizador do tenant + o PRÓPRIO afiliado; ∑ e config intocáveis por cliente (suíte de ataques F6).

Report: `outputs/leela-build-2d6ee98d/COMF2-REPORT.md`. O que segue H3: painel do promotor (S701-S704) e split automático (fase 3).

**UI entregue (lote CRM-COMISSAO-UI, trace leela-build-2d6ee98d — Opus):** config de comissão no `AfiliadoModal` (percentual 0,01..100 passo 0,01 | valor fixo por inscrição, validação espelhando `isComissaoAfiliadoValida`, aviso de NÃO-retroatividade) + coluna de comissão na aba Afiliados; **organizador** (aba Clubs → Influenciadores) vê comissão acumulada/repassada/saldo (saldo negativo = dívida, sem clamp) + KPI de comissão em aberto + registra repasse manual via `ConfirmModal` (`registrarRepasseComissao`, idempotência amigável — repasseId reusado no retry, repasse do saldo total off-platform); **influenciador** (Minhas afiliações) vê saldo/extrato SÓ do próprio (RN-318) — comissão por conversão + extrato de repasses. Gates: tsc painel 0, eslint 0, RTL das 3 superfícies verdes. Falta: repasse PARCIAL (hoje é do saldo total — follow-up).

**Painel do promotor — DELTA entregue por EVOLUÇÃO de `/clubes/minhas-afiliacoes` (lote PROMOTOR, trace leela-build-2d6ee98d — Opus, `fb6f58a`):** triage confirmou que a tela do influenciador JÁ era a visão own-business (cartões por evento com KPIs/comissão/extrato — S703/S704 materializados no recorte R9-E), então NÃO se criou rota `/promotor` (reuso-primeiro; S701-S704 completos do H3 seguem apenas para a app/superfície dedicada, que continua Won't nesta fase). O que faltava e foi entregue: (a) **resumo consolidado cross-eventos** (o "hub" S701 — afiliações ativas, inscrições no total, valor total bruto, comissão a receber), somado SÓ das próprias afiliações (RN-318 preservada — o reader já é keyed no uid; comissão a receber soma só saldos positivos, dívida não abate); (b) **copiar código de indicação por evento** (JTBD "qual link uso" — botão do DS + toast; copia o `refCodigo`). RTL 10/10 (inclui resumo somado, dívida clampada, projeção RN-318, cópia). **Follow-up backend PAGO (lote TAMANHOS-GRADE T-extra, `2cc75bb`, 2026-07-19):** `getMinhasAfiliacoes`/`getAfiliadosDoTenant` projetam `eventoSlug` (slug ausente ⇒ docId, convenção slug≡id) e a tela passou a copiar a URL COMPLETA `${landing}/${slug}?ref=` (mesma fonte `PUBLIC_BASE` da `AfiliadosPage`; doc de função antiga sem slug degrada para copiar o código). Integração 28/28 + RTL 16/16.

### Adendo 5 (Vitor · 2026-07-18)

- **RN-319 · Acompanhamento de vendas na aba Clubs (dois lados) — RATIFICADA.** O **organizador** vê as vendas/conversões do clube-influenciador e do influenciador PF na **sua aba Clubs**; o **clube/influenciador** vê as próprias vendas na **aba Clubs da própria conta**. Escopo de leitura coerente com RN-318 (cada influenciador só as próprias; organizador só as do próprio tenant). Story `S-R9-11` (task T8).
- **HIP-R9-01 · Modelo "pré-compra" do clube-influenciador (HIPÓTESE, NÃO ratificada).** Proposta group-buy: inscrições pelo link do clube entram em estado "pré-compra"; ao atingir o mínimo X do organizador, dispara a cobrança no cartão de todas. **Pendente validação com um organizador de eventos** (verbatim do Vitor). Não é RN — a spec entrega a proposta + 4 questões de dinheiro (pré-auth expira; X nunca atingido; recusas parciais no lote; reserva de vaga/estoque). Default conservador enquanto não valida = RN-315. Quando/se implementar: dinheiro ⇒ **rota Fable + review antagonista** (DoD). Detalhe em `DECISOES-ABERTAS` (HIP-R9-01) + `02-rodadas/2026-07-18-ux-review/03-stories.md §S-R9-11`.

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

**Onda 4 · item 2.** Antes de listar lacuna, o inventário — porque o card do kanban estava desatualizado e sugeria um buraco maior do que existe.

### Estado real

O painel do promotor **não é mais a lacuna do épico**. O lote PROMOTOR (`fb6f58a`) fechou o hub por evolução de `/clubes/minhas-afiliacoes` (`apps/painel/src/routes/clubes/influenciadores/MinhasAfiliacoesPage.tsx`), em vez de criar rota `/promotor` nova. O que está no ar hoje:

| Story do épico | Materializada como | Estado |
|---|---|---|
| S701 (hub de KPIs) | resumo consolidado cross-eventos em Minhas afiliações | ✅ |
| S702 (eventos disponíveis + aceitar) | **não existe** — o modelo vigente é por convite do organizador | ❌ ver decisão aberta |
| S703 (minhas conversões) | cartões por evento com conversões e status | ✅ (recorte R9-E) |
| S704 (financeiro) | saldo, extrato e comissão por evento, escopo RN-318 | ✅ (COMF2 + CRM-COMISSAO-UI) |

Backend completo: atribuição por link (RN-313), registro de conversões (RN-314), comissão congelada cent-exata com estorno telescopado (COMF2), repasse manual idempotente. Rules com suíte de ataques. Nada disso volta a ser especificado.

### O que resta, na ordem

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S704-T2` | **repasse parcial** — hoje o registro de repasse quita o saldo total; falta informar um valor menor, com guarda de saldo na mesma transação e idempotência por `repasseId` | `functions/` (repasse) · `packages/core` · `apps/painel` (ConfirmModal do repasse) | COMF2 ✅ | **opus** xhigh | ⚔ |
| 2 | `S-E08-NOTIF` | avisar o afiliado quando o repasse é registrado e quando a comissão cruza um marco — **reusa** o log de comunicação e o pipeline de disparo, sem canal novo | `functions/` (notificação) | EmailProvider (RN-137) | **opus** xhigh | — |
| 3 | `S-R9-11-T*` (convite PF em produção) | o fluxo existe e está provado; o que falta é a chave — não é código | — | **EmailProvider Brevo** | — | — |

**Por que o repasse parcial é opus e não haiku.** Parece um campo a mais no formulário, mas o valor informado entra na mesma transação que já protege o saldo contra corrida e contra estorno posterior. Um parcial que não respeite a guarda de saldo cria dívida invisível — a mesma classe de erro que o COMF2 blindou. Dinheiro não rebaixa.

**Ordem interna:** `S704-T2` é independente e pode entrar já. `S-E08-NOTIF` espera a chave do Brevo, que é a mesma dependência do E19 — os dois destravam juntos.

### Fora da fila, por decisão e não por esquecimento

- **Split automático (fase 3)** — o item 23 foi ratificado: desembolso é repasse manual, o split **não abre**. O racional é de negócio: manter o controle dos repasses permite manejar antecipações, cujos juros são margem nossa. Não voltar a propor split sem o Vitor reabrir.
- **RN-315 · desconto retroativo do clube-influenciador** — PARKED; o Vitor quer ver como a Ticketsports resolve antes de decidir. Retroatividade obriga reprocessar vendas pagas, então é dinheiro e não entra sem decisão explícita.
- **HIP-R9-01 · pré-compra do clube-influenciador** — hipótese, não regra. Pende de validação com um organizador real. As quatro perguntas de dinheiro (pré-autorização que expira, mínimo nunca atingido, recusas parciais no lote, reserva de vaga) seguem sem resposta e são o que torna a implementação arriscada.

### Critério de pronto do épico nesta onda

- [ ] repasse parcial provado por integração: valor menor que o saldo, valor igual ao saldo, valor maior (negado), retry com o mesmo `repasseId` (idempotente), estorno posterior ao parcial
- [ ] o afiliado continua vendo **só** o dele (RN-318) depois de qualquer mudança — a prova de não-vazamento no DOM permanece verde
- [ ] review antagonista em contexto fresco no repasse parcial

### Decisão que volta para o Vitor

**Como o influenciador chega ao evento: por convite ou por descoberta?** Hoje o modelo é convite (o organizador cadastra via modal, RN-317, e convida a PF por e-mail, RN-316). A story S702 do épico original assume o oposto — uma vitrine de eventos com programa aberto, onde o promotor aceita sozinho e o link nasce na hora. São dois produtos diferentes; o segundo é um marketplace de afiliação. Detalhe em `02-rodadas/2026-07-19-espec-sweep/01-decisoes-abertas.md`.

---

## Prontidão de build · posição 2 da fila (SPECS-0728 · 2026-07-28)

Autorizada em DEC-0728A. Esta seção transforma as duas linhas soltas do plano de
2026-07-19 (`S704-T2` e `S-E08-NOTIF`) em histórias com aceite e tarefas, para que a
lane de código não precise decidir nada de produto.

**Rastreabilidade dos nomes antigos:** `S704-T2` corresponde a `S705-T2`; `S-E08-NOTIF`
corresponde a `S706`. O painel de decisões aponta para os nomes antigos, que seguem
válidos como apelido.

### Inventário antes de especificar

A auditoria mudou o tamanho da posição 2, e para menos.

**O parcial já está no servidor.** `registrarRepasseComissaoCore`
(`functions/src/affiliation/registrarRepasse.ts`) recebe `valor` como parâmetro desde a
COMF2. Ele valida cent-exatidão, recusa zero e negativo, e compara contra o saldo lido
**dentro da mesma transação** que grava o ledger e incrementa `comissaoRepassada`. A
idempotência por `repasseId` é estrutural: o id vira o docId, e o replay volta
`duplicado: true` sem segundo débito. A suíte F5 de `afiliados.integration.test.ts` já
prova valor acima do saldo negado, valor não cent-exato negado, valor negativo negado,
replay sem segundo débito e saldo negativo honesto depois de estorno pós-repasse.

O que quita o saldo inteiro é a **tela**: `InfluenciadoresPage.tsx` manda
`valor: alvoRepasse.saldoComissao` fixo e o texto do modal diz "(saldo atual)". A lacuna
é de interface e de prova, não de contabilidade.

Consequência de rota: a parte de dinheiro que justificava opus com review antagonista já
foi escrita e revisada. O que resta no servidor é um teste que ainda não existe, o de
dois parciais consecutivos contra o mesmo saldo, mais a fronteira de entrada na tela.

**O aviso deixou de estar bloqueado.** O plano de 19/07 pendurava `S-E08-NOTIF` na chave
do Brevo. O item 13 fechou em 2026-07-27 (DEC-0727E) com prova de entrega real, e o
próprio registro lista o convite de influenciador PF do E08 entre o que destrava. A
dependência que resta é o remetente de domínio próprio para produção (item 12), que não
impede construir nem provar em preview.

**O log de comunicação serve os dois avisos sem canal novo.**
`packages/core/src/comms/logComunicacao.ts` é o agregado único, com docId determinístico
no formato destinatário mais chave mais canal: a existência do doc é o "já enviei". Um
aviso de repasse com chave própria nasce idempotente por construção, sem tabela de
controle nova. **Atenção ao formato da chave (corrigido pela E08-REV):**
`CHAVE_LOG_COMUNICACAO_RE` PROÍBE `_` — ele é o separador do docId — e limita a chave a
64 caracteres, enquanto `REPASSE_ID_RE` aceita `_` e até 64. Chave com `_` é impossível
de gravar; ver RN-386 para o formato que vale.

### Regras de negócio novas (SPECS-0728)

- **RN-385 · Repasse parcial da comissão.** O organizador registra um repasse de
  **qualquer valor cent-exato entre zero (exclusive) e o saldo de comissão vigente**, e
  não só o saldo inteiro. A guarda de saldo roda **na mesma transação** que grava o
  ledger e incrementa `comissaoRepassada`; a idempotência continua sendo o `repasseId`
  gerado pelo cliente. Consequências fixadas: **saldo negativo não aceita repasse**,
  porque dívida honesta pós-estorno não se quita por registro e a comparação
  `valor > saldo` já reprova qualquer valor positivo; **o resto do saldo permanece a
  receber** e cada parcial vira uma linha própria no extrato dos dois lados; o formulário
  **propõe o saldo integral como valor inicial**, para que o caminho de hoje continue
  sendo um clique.
- **RN-386 · Aviso ao afiliado em repasse e em marco de comissão.** O afiliado é avisado
  quando um repasse é registrado para ele e quando a comissão acumulada dele **cruza um
  marco**. Marco, default proposto: **a primeira comissão do afiliado naquele evento** e
  depois **cada múltiplo de R$ 100 de comissão acumulada**, com o número em constante
  única no core, no padrão do `PIX_EXPIRACAO_SEGUNDOS` (RN-157), para o Vitor ajustar num
  lugar só. O aviso **reusa o log de comunicação e o disparo existentes**, sem canal
  novo: chaves determinísticas, o que faz a não duplicação nascer do modelo em vez de um
  controle paralelo. **Formato das chaves (corrigido pela E08-REV — a redação original
  pedia `repasse_{repasseId}` e `marco_{faixa}`, impossíveis de gravar porque
  `CHAVE_LOG_COMUNICACAO_RE` proíbe `_`, o separador do docId `{ref}_{chave}_{canal}`, e
  limita a 64 caracteres):**
  - **marco** — `marco-{faixa}` (`marco-100`, `marco-300`) e `marco-primeira` para a
    primeira comissão do afiliado no evento (`chaveAvisoMarco`, no core).
  - **repasse** — `repasse-{digest}`, com `digest` = 32 primeiros hex do sha256 do
    `repasseId` (`chaveAvisoRepasse`, em `functions/src/affiliation/avisoAfiliado.ts`).
    O `repasseId` NÃO entra cru: ele aceita `_` e até 64 caracteres, e sanear `_`→`-`
    colapsaria `a_b` e `a-b` na MESMA chave, matando o aviso do segundo repasse — num
    campo de dinheiro, inaceitável. O digest é determinístico, sempre válido, sempre de
    40 caracteres e **recomputável** por quem tem o repasseId (o suporte deriva a chave,
    não adivinha). **Custo aceito:** o docId do log deixa de ser legível de bate-pronto;
    nenhuma consulta do produto filtra ou exibe essa chave, então o custo é só de
    depuração. **NÃO reintroduzir a chave com `_`.**
  O conteúdo respeita a
  RN-318, ou seja, só o número do próprio afiliado, nunca dado de terceiro nem do evento
  além do nome. Marco **atravessado para baixo** por estorno **não** avisa e **não**
  rearma a faixa já avisada: aviso de comissão é boa notícia, não cobrança.

---

### LEELA-S705 · Repasse parcial da comissão registrada · (de-para novo · SPECS-0728)

**Como** organizador, **quero** registrar um repasse de valor menor que o saldo,
**para** adiantar parte da comissão sem que o extrato passe a mentir sobre o resto.

- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Painel (Clubes › Influenciadores) + Functions · **RNs:** RN-385, RN-310, RN-318
- **JTBD servido:** T · "pagar o que combinei agora e continuar enxergando o que ainda devo". Dimensão **Transacional**.
- **Origem:** fila de construção posição 2 (DEC-0728A); lacuna declarada no lote CRM-COMISSAO-UI.

**Critérios de aceite (Given/When/Then):**

- **Dado** um afiliado com saldo de R$ 1.200,00, **quando** registro um repasse de
  R$ 500,00, **então** o registro é aceito, o extrato ganha uma linha de R$ 500,00 e o
  saldo passa a exibir R$ 700,00 para o organizador e para o afiliado.
- **Dado** o mesmo afiliado com saldo de R$ 700,00, **quando** registro um segundo
  repasse de R$ 700,00, **então** é aceito e o saldo vai a zero, com duas linhas
  distintas no extrato.
- **Dado** um saldo de R$ 700,00, **quando** informo R$ 700,01, **então** o servidor
  recusa por exceder o saldo e nada é gravado.
- **Dado** um afiliado com saldo **negativo** por estorno depois de repasse, **quando**
  tento registrar qualquer valor positivo, **então** o servidor recusa e a tela explica
  que dívida não se quita por registro.
- **Dado** um repasse já registrado, **quando** a mesma chave `repasseId` chega de novo
  por clique duplo ou retentativa de rede, **então** nada é debitado uma segunda vez e a
  tela mostra o mesmo resultado.
- **Dado** o modal de repasse aberto, **quando** ele monta, **então** o campo de valor já
  vem preenchido com o saldo integral e é editável para baixo.
- **Dado** um valor com mais de duas casas decimais, **quando** tento confirmar,
  **então** a validação de tela bloqueia antes da chamada, com a mesma regra que o
  servidor aplica.

**Tasks:** `S705-T1`, `S705-T2`, `S705-T3`.

#### LEELA-S705-T1 · Prova de integração dos dois parciais consecutivos
- **Tipo:** test · **Depende de:** COMF2 (entregue) · **Bloqueia:** S705-T2 · **Estimativa:** XS · **Rota:** opus

**Objetivo**
Fechar o único buraco de prova do servidor antes de mexer na tela. Hoje a F5 prova o teto
e o replay, mas não prova que **dois parciais consecutivos** contra o mesmo saldo somam
corretamente e que o segundo respeita o saldo **já decrementado** pelo primeiro.

**Arquivos (editar)**
- `functions/src/__tests__/afiliados.integration.test.ts` — casos novos dentro do bloco F5.

**Critérios de aceite (testáveis)**
- Saldo 30, repasse 10, repasse 15, então saldo 5, dois docs no ledger e
  `comissaoRepassada` 25.
- Saldo 30, repasse 10, repasse 21, então o segundo é recusado e o saldo continua 20.
- Estorno depois de um parcial recomputa pela config congelada e o saldo pode ficar
  negativo sem clamp. O comportamento já é o vigente; o teste apenas o trava contra
  regressão.

**Fora de escopo**
Qualquer alteração de comportamento no `registrarRepasse.ts`. Se um caso falhar, o achado
sobe como bug e não como refactor silencioso.

#### LEELA-S705-T2 · Campo de valor no modal de repasse (antigo `S704-T2`)
- **Tipo:** screen · **Depende de:** S705-T1 · **Estimativa:** S · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Trocar o repasse de saldo integral por um repasse de valor informado, sem perder o
caminho de um clique.

**Arquivos (editar)**
- `apps/painel/src/routes/clubes/influenciadores/InfluenciadoresPage.tsx` — campo de valor
  no `ConfirmModal` do repasse, hoje com `valor: alvoRepasse.saldoComissao` fixo.
- `apps/painel/src/routes/clubes/influenciadores/__tests__/InfluenciadoresPage.test.tsx`.

**Passos de implementação**
1. Campo de valor no modal, inicializado com o saldo e editável para baixo. A observação
   já aceita pelo callable passa a ser oferecida na mesma caixa.
2. Validação de tela **espelhando** a regra do servidor: cent-exato, maior que zero, não
   maior que o saldo. A validação de tela é conveniência; o servidor continua sendo o
   fence.
3. Saldo negativo desabilita a ação e a tela diz por quê.
4. O `repasseId` continua sendo gerado uma vez por tentativa e reusado na retentativa,
   mantendo a idempotência amigável já em vigor.

**Critérios de aceite (testáveis)**
- Os sete critérios da história, cobertos por RTL na camada de tela e pelos casos de
  integração do T1 na camada de servidor.
- Nenhuma asserção existente da suíte de influenciadores muda de valor.

**Definition of Done**
- [ ] Checklist padrão (`definition-of-done.md`, DoD Tela) e review antagonista em
      contexto fresco, porque o campo é de dinheiro mesmo com a guarda no servidor.

#### LEELA-S705-T3 · Extrato com uma linha por repasse nos dois lados
- **Tipo:** screen · **Depende de:** S705-T2 · **Estimativa:** XS · **Rota:** opus

**Objetivo**
Garantir que o parcial apareça como evento próprio para quem paga e para quem recebe.

**Arquivos (editar)**
- `apps/painel/src/routes/clubes/influenciadores/MinhasAfiliacoesPage.tsx` — extrato do
  afiliado, onde `ultimosRepasses` já vem projetado pelo reader.
- `apps/painel/src/routes/clubes/influenciadores/InfluenciadoresPage.tsx` — visão do
  organizador.

**Critérios de aceite (testáveis)**
- Dois parciais no mesmo evento aparecem como duas linhas com valor e data próprios, e
  não como um total somado.
- A projeção do afiliado continua fechada na RN-318, com a prova de não vazamento no DOM
  permanecendo verde.

---

### LEELA-S706 · Aviso ao afiliado no repasse e no marco de comissão · (de-para novo · SPECS-0728 · antigo `S-E08-NOTIF`)

**Como** afiliado, **quero** ser avisado quando registram um repasse para mim e quando
minha comissão cruza um marco, **para** acompanhar sem precisar abrir o painel.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Functions (notificação) · **RNs:** RN-386, RN-318, RN-137
- **JTBD servido:** T · "saber que entrou dinheiro sem ter de conferir". Dimensão **Transacional**.
- **Origem:** fila de construção posição 2 (DEC-0728A). Destravado pelo item 13 (DEC-0727E).

**Critérios de aceite (Given/When/Then):**

- **Dado** um afiliado com e-mail conhecido, **quando** o organizador registra um repasse
  para ele, **então** ele recebe um aviso com o valor repassado, o evento e o saldo que
  restou, e o log de comunicação ganha o registro com chave `repasse-{digest}` (RN-386).
- **Dado** o mesmo repasse reprocessado com o mesmo `repasseId`, **quando** o disparo é
  avaliado de novo, **então** nenhum segundo aviso sai, porque o docId determinístico do
  log já existe.
- **Dado** um afiliado sem comissão, **quando** a primeira conversão comissionada dele
  confirma, **então** ele recebe o aviso de primeira comissão.
- **Dado** um afiliado com R$ 90,00 acumulados, **quando** uma conversão o leva a
  R$ 130,00, **então** ele recebe o aviso da faixa de R$ 100,00, uma vez só.
- **Dado** um afiliado que já cruzou a faixa de R$ 100,00, **quando** um estorno o devolve
  a R$ 80,00 e uma venda nova o traz de volta a R$ 110,00, **então** **nenhum** aviso novo
  sai para a mesma faixa.
- **Dado** o conteúdo do aviso, **quando** ele é montado, **então** ele carrega só o
  número do próprio afiliado e o nome do evento, nunca dado de outro afiliado nem a
  identidade do comprador (RN-318, RN-172).
- **Dado** que o provedor de e-mail falha, **quando** o disparo tenta, **então** o log
  registra a falha e o repasse **continua válido**. O aviso nunca é pré-condição do
  registro de dinheiro.

**Tasks:** `S706-T1`, `S706-T2`.

#### LEELA-S706-T1 · Gatilho e chave de idempotência dos dois avisos
- **Tipo:** api/function · **Depende de:** COMF2 (entregue), log de comunicação (entregue) · **Bloqueia:** S706-T2 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Disparar os dois avisos a partir dos pontos que já existem, sem criar contabilidade nem
controle de envio paralelos.

**Arquivos (criar/editar)**
- `functions/src/affiliation/registrarRepasse.ts` — enfileirar o aviso **depois** da
  transação confirmar, nunca dentro dela.
- `functions/src/checkout/webhookPagamento.ts` — ponto onde `comissaoAcumulada` avança;
  avaliar cruzamento de faixa. **Território compartilhado com a lane ESTORNO-ADMIN:
  serializar, não paralelizar.**
- `packages/core/src/affiliation/marcoComissao.ts` (novo) — função pura
  `faixaCruzada(anterior, atual)` e a constante única do passo de marco (RN-386).
- `packages/core/src/comms/logComunicacao.ts` — só consumo; chaves novas.

**Passos de implementação**
1. Constante única do passo de marco no core, com a função pura que decide se houve
   cruzamento **para cima** entre dois valores.
2. No repasse, depois da transação, enfileirar o aviso com chave `repasse-{digest}`
   (`chaveAvisoRepasse` — ver RN-386; a chave com `_` não é gravável).
3. Na confirmação de comissão, comparar acumulada anterior e posterior pela função pura;
   se cruzou, enfileirar com chave `marco-{faixa}` (ou `marco-primeira`).
4. Falha de envio degrada para registro de falha no log, sem tocar no resultado do
   callable nem do webhook.

**Regras de negócio a respeitar**
- RN-386 (marco e chaves), RN-318 (projeção fechada), RN-137 (EmailProvider),
  RN-172 (minimização).

**Testes a escrever**
- unit: `faixaCruzada` com subida simples, subida que pula duas faixas (avisa só a maior
  alcançada), descida, e subida de volta à mesma faixa sem avisar.
- integração: repasse dispara um aviso e o replay não dispara segundo; falha de provedor
  não reverte o repasse.

**Definition of Done**
- [ ] Checklist padrão (DoD API/Function) e review antagonista em contexto fresco, porque
      o gatilho encosta no webhook de pagamento.

#### LEELA-S706-T2 · Conteúdo dos dois avisos no catálogo de templates
- **Tipo:** api/function · **Depende de:** S706-T1 · **Estimativa:** S · **Rota:** opus

**Objetivo**
Escrever os dois textos no catálogo que já existe, sem canal novo.

**Arquivos (editar)**
- `functions/src/email/templates.ts` — dois templates novos.

**Critérios de aceite (testáveis)**
- O corpo do aviso de repasse traz valor, evento e saldo restante; o de marco traz a faixa
  alcançada e o evento.
- Nenhum dos dois carrega identidade de comprador nem número de outro afiliado.
- O log grava assunto e referência de template, nunca o corpo, mantendo a disciplina de
  PII já vigente no `logComunicacao`.

**Fora de escopo**
Canal push, preferência de frequência e cancelamento de aviso. Se o afiliado quiser
desligar, isso é decisão de produto e volta como card.

---

### Fila de código pronta · lane E08 (posição 2)

Ordem de despacho. Nada aqui precisa de decisão do Vitor.

| # | Task | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| 1 | `S705-T1` prova dos dois parciais consecutivos | `functions/src/__tests__` | — | opus | — |
| 2 | `S705-T2` campo de valor no modal | `apps/painel/src/routes/clubes/influenciadores` | 1 | opus | ⚔ |
| 3 | `S705-T3` extrato com uma linha por repasse | `apps/painel/src/routes/clubes/influenciadores` | 2 | opus | — |
| 4 | `S706-T1` gatilho e chave dos avisos | `functions/src/affiliation`, `functions/src/checkout`, `packages/core` | — | opus | ⚔ |
| 5 | `S706-T2` textos no catálogo de templates | `functions/src/email` | 4 | opus | — |

**Paralelismo.** A trilha 1 a 3 e a trilha 4 a 5 são disjuntas em território e podem
correr juntas. A única fronteira é `webhookPagamento.ts`, que a lane ESTORNO-ADMIN tem
aberto agora: **`S706-T1` só entra depois que a ESTORNO aterrissar**, ou o conflito é
certo.

### Critério de pronto da posição 2

- [ ] dois parciais consecutivos provados por integração, com o segundo respeitando o
      saldo já decrementado
- [ ] valor acima do saldo negado, saldo negativo não quitável, replay sem segundo débito
- [ ] o afiliado continua vendo só o dele depois de qualquer mudança (RN-318)
- [ ] um repasse gera exatamente um aviso, provado por replay
- [ ] marco cruzado para baixo e recruzado não gera aviso novo
- [ ] falha de e-mail não reverte dinheiro registrado
- [ ] review antagonista em contexto fresco em `S705-T2` e `S706-T1`

### O que continua fora, por decisão

Nada mudou aqui. O split automático segue fechado (item 23 ratificado), a RN-315 segue
parada, a HIP-R9-01 segue hipótese, e a pergunta "convite ou descoberta" da S702 continua
com o Vitor. A posição 2 não depende de nenhuma das quatro.
