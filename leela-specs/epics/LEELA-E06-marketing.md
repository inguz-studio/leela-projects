# LEELA-E06 · Marketing Unificado

- **Superfície:** Painel
- **Horizonte:** H2 (Onda 3 · Robustez e alavancas)
- **MoSCoW:** Should
- **Estimativa:** XL
- **Status:** 📋 Backlog (protótipo parcial em Comunicacao.html; Promotores só especificado)
- **Depende de:** LEELA-E01 (Design System & Shell), LEELA-E03 (Operação do Evento · sub-nav, inscritos, layout do evento), LEELA-E04 (Configuração e Vendas · página de vendas, lotes, cupons)
- **De-para:** BH-E06 (Marketing Unificado)

## Objetivo

Unificar **Comunicação** e **Promotores** do evento num único módulo **Marketing** dentro do Painel do Organizador, organizado em três frentes: **Campanhas** (disparos segmentados de push/email para inscritos), **Automações** (mensagens por gatilho, sem ação manual) e **Parceiros** (rede de distribuição — clubes, influenciadores e lojas — com programa de afiliação, link master rastreável e comissão). Antes espalhados em duas abas separadas, os dois eixos passam a viver num lugar só, o que reduz a sub-nav do evento de **9 → 8 tabs** (RN-002) e dá ao organizador um comando único de aquisição e relacionamento.

O valor entregue é o organizador da Meia Maratona Floripa 2026 (453 inscritos, R$ 85.617) impulsionar vendas em momentos-chave, avisar o inscrito certo na hora certa (kit pronto, véspera de prova, boas-vindas) e remunerar quem traz venda (Corrida Perfeita Sul com 28 conversões, R$ 528 a repassar) sem planilha e sem trocar de tela. Materializa em código (Next.js + Firestore) o protótipo de comunicação (`Comunicacao.html`) e a especificação de promotores (BH-301/BH-400..402), fechando o patch retroativo de sub-nav (BH-403).

## Personas & JTBD

- **Primária — Organizador de Evento (Marina Castelo · Castelo Produções).** JTBD: "Impulsionar vendas em momentos-chave", "Avisar o inscrito certo na hora certa sem virar spam", "Rastrear e remunerar quem traz venda sem controlar em planilha", "Ter um só painel de aquisição e relacionamento por evento".
- **Secundária — Parceiro (Coordenador de assessoria / Marca / Influenciador).** Aparece como **entidade parceira** convidada para divulgar; recebe link master + cupom + comissão. No painel do organizador é objeto de gestão (leitura de conversões, convite, configuração da comissão) — a experiência do lado do parceiro é E05 (clube, read-only dos termos — RN-121/122) e E08 (influenciador, icebox).
- **Secundária — Admin Leela.** Suporte e supervisão.

## Critérios de sucesso do épico

- Sub-nav do evento migra de 9 para 8 tabs em todas as telas do evento; "Promotores" e "Comunicação" somem como abas isoladas e viram a aba única **Marketing** (RN-002).
- Dentro de Marketing há sub-nav interna (§2.14) com **Campanhas · Automações · Parceiros**.
- Organizador cria e dispara uma campanha segmentada (por modalidade, kit, status ou engajamento) para os inscritos, respeitando limite de push/semana e truncamento de 160 chars (RN-133/134), com estimativa de alcance ao vivo.
- Organizador configura uma automação por gatilho (novo inscrito, kit disponível, véspera, pós-evento) que dispara sem ação manual.
- Organizador convida um parceiro, define a comissão do programa de afiliação (%, janela, teto, cupom — RN-310/311) e vê conversões/repasse por parceiro; o programa configurado é exatamente o que o clube lê read-only (RN-121/122).
- Cada parceiro tem link master rastreável (`beh.ro/{slug}?p={codigo}`) e cupom, com conversão atribuída dentro da janela.
- Fluxo demonstrável ponta a ponta com os mocks canônicos de HANDOFF-05 (Meia Floripa, Corrida Perfeita Sul, Dioney Galharte, comunicados adaptados ao evento), sem inventar dados.
- Nenhum valor hardcoded: tokens do DS, copy do glossário (HANDOFF-07).

## Regras de negócio aplicáveis

- **RN-002** — Sub-nav do evento: 9 → 8 tabs (Comunicação + Promotores → **Marketing**).
- **RN-310** — **O organizador define a comissão** (espelha RN-120 do lado do clube; o clube só aceita/recusa).
- **RN-311** — Programa de afiliação define `%` de comissão, `janela de atribuição`, `teto mensal` e `cupom`.
- **RN-312** — Tipos de afiliado: clube, promotor individual, influenciador e loja/marca (unificados na lista de parceiros).
- **RN-121** — Configuração do programa de afiliação mora no painel do organizador (esta é a superfície de escrita).
- **RN-122** — O que o organizador grava aqui é servido como termos read-only ao parceiro (E05-S107-T5 lê este doc).
- **RN-125** — Evento promovido gera link master rastreável + cupom exclusivo + comissão; conversão só conta dentro da janela de atribuição.
- **RN-130** — Campanha (comunicado) tem 3 estados: `enviada` | `agendada` | `rascunho`.
- **RN-131** — Campanha tem 2 canais: `push`, `email` (ou ambos).
- **RN-132** — Campanha tem 2 origens: `manual` (Campanhas) | `automatizada` (Automações).
- **RN-133** — Limite de 4 push por semana por evento (validado por Function).
- **RN-134** — Push tem limite de 160 caracteres no corpo.
- **RN-135** — Email suporta imagem de capa; push não.
- **§2.5** (tabela densa, linha 64px), **§2.7** (tabs no DOM), **§2.12** (interativo: estados vazio/erro/carregando + feedback via Toast), **§2.14** (sub-nav underline Brasa 2px + contador pill), **§2.15** (ConfirmModal com preview de consequências em ação destrutiva), **§2.16** (flat, sem borda decorativa).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Coleções afetadas:

- `eventos/{eventoId}/programaAfiliacao/{unico}` — **escrita** pelo organizador (RN-310/311): `comissaoPct`, `janelaAtribuicaoDias`, `tetoMensal?`, `cupom?`, `criadoEm`, `atualizadoEm`. É o doc que E05 espelha read-only (RN-121/122).
- `eventos/{eventoId}/parceiros/{parceiroId}` — **nova** subcoleção; rede de distribuição do evento. `tipo` (clube/promotor_individual/influenciador/loja — RN-312), `nome` 🔁, `refId?` (→`clubes` ou `profissionais` quando aplicável), `status` (convite_pendente/ativo/inativo), 🔁`comissaoPct`/`cupom`/`codigoRastreio` (deriva o link master), ∑`cliquesUnicos`, ∑`conversoes`, ∑`valorAReceber`, `convidadoEm`, `ativadoEm?`.
- `eventos/{eventoId}/campanhas/{campanhaId}` — **nova** subcoleção (comunicado escopado ao evento). `titulo`(≥5), `conteudo`(≥10; push ≤160 — RN-134), `capaUrl?`(só email — RN-135), `canal[]`(push/email — RN-131), `origem`(manual/automatizada — RN-132), `status`(rascunho/agendada/enviada — RN-130), `segmento`(embed: `tipo` todos_inscritos/por_modalidade/por_kit/por_status/por_engajamento + `referencia?`), `agendadaPara?`, `enviadaEm?`, ∑`alcance`, ∑`aberturasPct?`.
- `eventos/{eventoId}/automacoes/{automacaoId}` — **nova** subcoleção. `gatilho`(novo_inscrito/kit_disponivel/vespera_evento/pos_evento), `templateRef`(campanha origem=automatizada), `canal[]`, `ativa`(bool), `offset?`(ex.: 24h antes), ∑`disparos`.
- `eventos/{eventoId}/inscritos` — **leitura** (S203) para derivar segmentos e estimativa de alcance.

Agregados ∑ (`parceiros.cliquesUnicos/conversoes/valorAReceber`, `campanhas.alcance/aberturasPct`, `segmento.tamanhoEstimado`, `automacoes.disparos`) mantidos por Cloud Function — nunca calculados no cliente. Distributed counters onde a escrita for concorrente (cliques/conversões em pico).

## Fora de escopo (Won't nesta fase)

- Experiência do lado do parceiro (aceitar convite, ver termos read-only) → **E05** (clube) e **E08** (influenciador · icebox).
- Split de pagamento real e execução do repasse ao parceiro → **PaymentProvider / ADR-006 / E04/E09** (aqui só a leitura do valor a receber e do status).
- Configuração da página de vendas, lotes e cupons de venda → **E04** (o cupom de afiliação é referenciado, não gerido aqui).
- Comunicação do clube (não do evento) → **E05-S108**.
- WhatsApp Business API como canal concreto (contrato de canal `push`/`email`; WhatsApp entra depois via Notificações).
- Editor de rich-media/HTML avançado de email (só título, corpo, capa e variáveis).
- A/B testing e analytics de campanha além de alcance/aberturas.

---

## User stories

### LEELA-S400 · Parceiros de marketing · (de-para BH-400)

**Como** Organizador de Evento, **quero** uma lista unificada de parceiros (clubes, influenciadores, lojas, promotores individuais) com programa de afiliação, comissão e conversões, **para** gerenciar toda a distribuição do evento num lugar só e remunerar quem traz venda sem planilha.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Comunicacao.html` (shell de Marketing), `Club-Parcerias.html` + `Club-Parcerias-Modal-Termos-Programa.html` (espelho do lado do clube, referência de conteúdo do programa)
- **RNs:** RN-002, RN-310, RN-311, RN-312, RN-121, RN-122, RN-125, §2.5, §2.14, §2.15

**Critérios de aceite (Given/When/Then):**
- **Dado** a aba Marketing do evento, **quando** abro, **então** vejo sub-nav interna (§2.14) com **Campanhas · Automações · Parceiros** e a aba corrente marcada (underline Brasa 2px + contador pill).
- **Dado** a sub-tela Parceiros, **quando** listo, **então** vejo tabela densa (§2.5) com parceiro (avatar + nome + tipo), status, cliques únicos, conversões, comissão e valor a receber, com contador "mostrando X de Y".
- **Dado** um parceiro ativo, **quando** clico em "Copiar link master", **então** copio `beh.ro/{slug}?p={codigo}` e vejo o Toast `Link master de [nome do evento] copiado`.
- **Dado** que ainda não configurei o programa, **quando** abro Parceiros, **então** vejo EmptyState com CTA "Configurar programa de afiliação".
- **Dado** o programa configurado, **quando** convido um parceiro (clube/influenciador/loja), **então** ele entra como `convite_pendente` e passa a `ativo` ao aceitar (aceite é E05/E08).
- **Dado** que altero a comissão do programa, **quando** salvo, **então** o doc `programaAfiliacao` é gravado e é exatamente o que o clube lê read-only (RN-121/122); o organizador é o único que edita (RN-310).
- **Dado** uma conversão fora da janela de atribuição, **quando** processada, **então** não incrementa `conversoes` (RN-125).

**Tasks:** LEELA-S400-T1, LEELA-S400-T2, LEELA-S400-T3, LEELA-S400-T4

#### LEELA-S400-T1 · Modelo `parceiros` + `programaAfiliacao` (escrita) + link master + Rules

- **Tipo:** data-model · **Depende de:** E03-S200-T1 (Evento), E03-S203-T1 (Inscrito) · **Bloqueia:** S400-T2, S400-T3, S400-T4, S401-T4 (repasse), E05-S107-T5 (leitura) · **Estimativa:** M

**Objetivo**
Modelar a subcoleção `parceiros`, o doc de escrita `programaAfiliacao`, a geração do código de rastreio / link master e as Security Rules; expor os tipos em `core` e as queries/mutations em `api-client`.

**Contexto & referências**
- RNs: RN-310 (organizador define comissão), RN-311 (%, janela, teto, cupom), RN-312 (tipos de afiliado), RN-121/122 (programa mora no organizador, servido read-only ao clube), RN-125 (link + cupom + comissão; janela de atribuição).
- Modelo: `eventos/{id}/programaAfiliacao/{unico}`, `eventos/{id}/parceiros/{parceiroId}`.
- Mocks (seed): programa da Meia Floripa — comissão 10%, janela 7 dias, teto sem limite, cupom `CORRIDAPERFEITA10`. Parceiros: Corrida Perfeita Sul (clube, `beh.ro/mfl26?c=cps`, 234 cliques, 28 conversões, R$ 528 a receber, taxa 12%); Dioney Galharte (promotor individual); ACATE Run Club (clube).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/parceiro.ts` — `type Parceiro`, `type TipoParceiro`, `type StatusParceiro`, derivação `linkMaster(evento, parceiro)`.
- `packages/core/src/eventos/programaAfiliacao.ts` — `type ProgramaAfiliacao` + validação (%, janela, teto, cupom).
- `packages/api-client/src/eventos/parceiros.ts` — CRUD parceiros + `salvarPrograma` + query paginada.
- `functions/src/eventos/atribuicaoConversao.ts` — incrementa ∑`cliquesUnicos`/`conversoes`/`valorAReceber` só dentro da janela (RN-125).
- `functions/firestore.rules` — Rules de `parceiros` e `programaAfiliacao`.
- `functions/seed/parceiros.seed.ts` — seed do programa + parceiros canônicos.

**Passos de implementação**
1. `type Parceiro = { id; tipo: TipoParceiro; nome; refId?; status: StatusParceiro; comissaoPct; cupom?; codigoRastreio; cliquesUnicos; conversoes; valorAReceber; convidadoEm; ativadoEm? }`; `TipoParceiro = 'clube'|'promotor_individual'|'influenciador'|'loja'` (RN-312); `StatusParceiro = 'convite_pendente'|'ativo'|'inativo'`.
2. `type ProgramaAfiliacao = { comissaoPct; janelaAtribuicaoDias; tetoMensal?; cupom? }` (RN-311); validação pura (0<pct≤100, janela≥1).
3. `linkMaster` deriva `beh.ro/{slug}?p={codigoRastreio}` (RN-125).
4. Function de atribuição idempotente: só conta conversão se dentro de `janelaAtribuicaoDias` do clique inicial e respeitando `tetoMensal` (RN-125/311).
5. Rules: só o organizador do evento lê/escreve `parceiros` e `programaAfiliacao`; `comissaoPct`/agregados ∑ nunca escritos por outro papel; parceiro (clube) tem leitura read-only dos termos (RN-122).
6. Seed com o programa e os parceiros de HANDOFF-05.

**Modelo de dados / contratos**
- `salvarPrograma(eventoId, ProgramaAfiliacao) -> { ok }`
- `convidarParceiro(eventoId, { tipo, nome, refId? }) -> { parceiroId, codigoRastreio }`
- `listarParceiros(eventoId, cursor?) -> { itens: Parceiro[]; proxCursor }`

**Regras de negócio a respeitar**
- RN-310/311 (organizador define; campos do programa), RN-121/122 (escrita aqui, read-only lá), RN-125 (janela), RN-312 (tipos). Agregados só por Function.

**Critérios de aceite (testáveis)**
- **Dado** um organizador, **quando** grava o programa, **então** persiste e um cliente não-owner não consegue escrevê-lo (Rule nega).
- **Dado** um parceiro clube, **quando** leio os termos como clube, **então** só leio (RN-122); alterar `comissaoPct` como clube é negado (RN-120/310).
- **Dado** uma conversão fora da janela, **quando** processada, **então** `conversoes` não incrementa (RN-125).
- **Dado** um parceiro, **quando** derivo o link master, **então** é `beh.ro/{slug}?p={codigo}`.

**Testes a escrever**
- unit: validação de `ProgramaAfiliacao`; derivação de `linkMaster`; elegibilidade de conversão por janela (core).
- integração: Rules (emulator) — escrita restrita ao owner, read-only do clube; idempotência do agregado de conversão.

**Definition of Done**
- [ ] Rules cobrindo `parceiros` e `programaAfiliacao` · [ ] Programa write-side espelha o read-side do clube (RN-121/122) · [ ] Agregados só via Function e idempotentes · [ ] Sem segredo no cliente · [ ] Lint + type-check limpos · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T2/T3/T4); execução do repasse (E09/PaymentProvider).

#### LEELA-S400-T2 · Shell de Marketing (sub-nav interna §2.14) + sub-tela Parceiros (tabela densa)

- **Tipo:** screen · **Depende de:** S400-T1, E03-S202-T1 (layout do evento), E01-S001-3-T2 (Table densa) · **Bloqueia:** S401-T2, S402-T2 · **Estimativa:** L

**Objetivo**
Renderizar o layout do módulo Marketing (sub-nav interna Campanhas · Automações · Parceiros) e a sub-tela Parceiros com tabela densa, estados, copiar link master e ações por linha.

**Contexto & referências**
- Telas: `Comunicacao.html` (shell/estrutura), `Club-Parcerias.html` (referência de colunas de afiliação).
- RNs: RN-002 (aba Marketing), RN-312, RN-125, §2.5, §2.12, §2.14, §2.16.
- Mocks: parceiros da Meia Floripa (Corrida Perfeita Sul, Dioney Galharte, ACATE).
- Componentes DS: SubNav interna (underline + pill), Table densa (linha 64px, header uppercase), Badge de status/tipo, Avatar, Popover de linha, EmptyState, Toast, Button (1 Primary).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/marketing/layout.tsx` — sub-nav interna do módulo.
- `apps/painel/app/eventos/[slug]/marketing/parceiros/page.tsx`
- `apps/painel/app/eventos/[slug]/marketing/_components/MarketingSubNav.tsx`
- `apps/painel/app/eventos/[slug]/marketing/parceiros/_components/ParceirosTable.tsx`

**Passos de implementação**
1. Sub-nav interna §2.14: Campanhas | Automações | Parceiros; aba ativa por rota; contador pill onde aplicável (nº de parceiros ativos).
2. Tabela densa: colunas parceiro (avatar+nome+tipo), status (Badge), cliques únicos, conversões, comissão, a receber; contador "mostrando X de Y".
3. Popover de linha: ver detalhe (T4), copiar link master (Toast `Link master de [nome do evento] copiado`), copiar cupom (Toast `Cupom [código] copiado`).
4. EmptyState "Nenhum parceiro ainda · configure o programa de afiliação para começar" + CTA (abre T3) quando não há programa/parceiros.
5. Botão "+ Convidar parceiro" (abre modal T4) e "Configurar programa" (abre modal T3).
6. Estados vazio/erro/carregando (skeleton, §2.12).

**Modelo de dados / contratos**
- Lê `parceiros` + `programaAfiliacao` (S400-T1). Sem escrita direta (via modais T3/T4).

**Regras de negócio a respeitar**
- RN-002, RN-125, §2.5, §2.14, §2.16; copy exata do glossário (HANDOFF-07).

**Critérios de aceite (testáveis)**
- **Dado** parceiros existentes, **quando** abro Parceiros, **então** vejo a tabela densa com conversões e a receber e o contador reflete o total.
- **Dado** um parceiro, **quando** copio o link master, **então** vejo o Toast canônico.
- **Dado** zero parceiros, **quando** abro, **então** vejo EmptyState + CTA.

**Testes a escrever**
- unit: render de `ParceirosTable` por status/tipo; MarketingSubNav marca a aba ativa.
- e2e: abrir Parceiros → copiar link master → Toast.

**Definition of Done**
- [ ] Sub-nav interna §2.14 · [ ] Table densa §2.5 · [ ] EmptyState + contador · [ ] Toasts do glossário · [ ] Flat §2.16, tokens DS · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Modais de programa/convite (T3/T4); detalhe do parceiro (T4).

#### LEELA-S400-T3 · Modal "Configurar programa de afiliação" (%, janela, teto, cupom)

- **Tipo:** ui-component · **Depende de:** S400-T1, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Modal de configuração do programa de afiliação do evento (comissão, janela de atribuição, teto mensal, cupom), gravando o doc que o clube lê read-only.

**Contexto & referências**
- Tela: `Club-Parcerias-Modal-Termos-Programa.html` (mesma informação, aqui em modo de **escrita**).
- RNs: RN-310 (organizador define), RN-311 (campos), RN-121/122 (write-side).
- Mocks: comissão 10%, janela 7 dias, teto sem limite, cupom `CORRIDAPERFEITA10`.
- DS: Modal (4 vias de fechamento), Input, Toggle (teto sem limite), Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/marketing/parceiros/_components/ProgramaModal.tsx`

**Passos de implementação**
1. Campos: `COMISSÃO (%)`, `JANELA DE ATRIBUIÇÃO (DIAS)`, `TETO MENSAL (R$)` (com toggle "sem limite"), `CUPOM EXCLUSIVO`.
2. Validação inline (0<pct≤100, janela≥1) via `core/programaAfiliacao`.
3. Salvar → `salvarPrograma` (S400-T1) + Toast; 4 vias de fechamento (cancelar/X/overlay/Esc).
4. Aviso: "Estes termos são exibidos como read-only ao parceiro" (RN-122).

**Modelo de dados / contratos**
- Escreve `programaAfiliacao` (S400-T1).

**Regras de negócio a respeitar**
- RN-310/311/121/122; §2.15 não se aplica (não destrutivo); validações da SPEC-02.

**Critérios de aceite (testáveis)**
- **Dado** o modal, **quando** informo comissão inválida (0 ou >100), **então** erro inline e sem salvar.
- **Dado** dados válidos, **quando** salvo, **então** o programa persiste, o Toast confirma e o clube passa a ver os termos atualizados (read-only).

**Testes a escrever**
- unit: validação de campos; visibilidade do toggle "sem limite"; fechamento 4 vias.

**Definition of Done**
- [ ] Campos RN-311 · [ ] Validação inline (§2.12) · [ ] Write-side do programa (RN-121/122) · [ ] Modal 4 vias · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Convite de parceiro (T4).

#### LEELA-S400-T4 · Modal "Convidar parceiro" + tela de detalhe do parceiro

- **Tipo:** screen · **Depende de:** S400-T1, S400-T2, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Permitir convidar um parceiro por tipo (clube/influenciador/loja/promotor individual) e ver o detalhe de um parceiro (link master, cupom, cliques, conversões, taxa, valor a receber, status de repasse).

**Contexto & referências**
- Telas: `Club-Parcerias-Modal-Adicionar.html` (referência de campos de convite), `Comunicacao.html` (shell).
- RNs: RN-312 (tipos), RN-125 (link + cupom + comissão), §2.12.
- Mocks: Corrida Perfeita Sul (234 cliques, 28 conversões, taxa 12%, R$ 528 a receber); Dioney Galharte (promotor individual).
- DS: Modal, Input, radio de tipo, Cards flat, Table densa (histórico), Badge, Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/marketing/parceiros/_components/ConvidarParceiroModal.tsx`
- `apps/painel/app/eventos/[slug]/marketing/parceiros/[parceiroId]/page.tsx`

**Passos de implementação**
1. Modal convite: `TIPO DE PARCERIA` (radio: clube/influenciador/loja/promotor individual — RN-312), `NOME`, busca de clube/profissional existente (`refId`) quando aplicável; enviar → `convidarParceiro` (status `convite_pendente`) + Toast.
2. Tela de detalhe: header do parceiro; cards de resumo (cliques únicos · conversões · taxa `[%]` · a receber); link master + cupom com copiar (Toasts canônicos); status de repasse (leitura, referencia programa/PaymentProvider).
3. Estados vazio/erro/carregando (§2.12).

**Modelo de dados / contratos**
- Escreve `parceiros` (convite) e lê o detalhe + agregados (S400-T1).

**Regras de negócio a respeitar**
- RN-312, RN-125; agregados só por Function; §2.12.

**Critérios de aceite (testáveis)**
- **Dado** o modal, **quando** convido um influenciador, **então** ele entra como `convite_pendente` e aparece na lista.
- **Dado** um parceiro, **quando** abro o detalhe, **então** vejo cliques/conversões/taxa/a receber batendo com os agregados e copio link master/cupom.

**Testes a escrever**
- unit: seleção de tipo e campos condicionais; render dos cards de resumo.
- e2e: convidar parceiro → aparece na lista → abrir detalhe.

**Definition of Done**
- [ ] Tipos de parceiro (RN-312) · [ ] Cards de resumo de agregado (não ad-hoc) · [ ] Toasts do glossário · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Aceite do convite pelo parceiro (E05/E08); execução do repasse (E09).

---

### LEELA-S401 · Campanhas · (de-para BH-401)

**Como** Organizador de Evento, **quero** criar e disparar campanhas de marketing segmentadas por push/email para os inscritos, **para** impulsionar vendas e informar em momentos-chave sem virar spam.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Comunicacao.html`, `Club-Comunicacao.html`, `Club-Comunicacao-Nova.html`
- **RNs:** RN-130, RN-131, RN-132, RN-133, RN-134, RN-135, §2.5, §2.12

**Critérios de aceite (Given/When/Then):**
- **Dado** a sub-tela Campanhas, **quando** abro, **então** vejo as campanhas em três grupos por estado (enviadas, agendadas, rascunhos — RN-130) com alcance e aberturas por linha (§2.5).
- **Dado** busca/filtros, **quando** nada casa, **então** EmptyState "Nenhuma campanha encontrada com os filtros aplicados".
- **Dado** "+ Nova campanha", **quando** clico, **então** abro o editor com título, conteúdo, canal (push/email — RN-131), capa (só email — RN-135), segmento e variáveis.
- **Dado** o segmento, **quando** escolho (todos os inscritos, por modalidade, por kit, por status, por engajamento), **então** vejo a estimativa de alcance ao vivo.
- **Dado** canal push, **quando** o corpo passa de 160 chars, **então** vejo aviso de truncamento (RN-134); email suporta capa (RN-135).
- **Dado** o limite de 4 push/semana (RN-133), **quando** excedo, **então** o disparo é bloqueado com aviso.
- **Dado** o editor, **quando** confirmo, **então** posso Enviar agora, Agendar envio ou Salvar rascunho, com Toast canônico.

**Tasks:** LEELA-S401-T1, LEELA-S401-T2, LEELA-S401-T3, LEELA-S401-T4

#### LEELA-S401-T1 · Modelo `campanhas` + segmento derivado de inscritos + estimativa de alcance + Rules

- **Tipo:** data-model · **Depende de:** E03-S203-T1 (Inscrito) · **Bloqueia:** S401-T2, S401-T3, S401-T4 · **Estimativa:** M

**Objetivo**
Modelar a subcoleção `campanhas`, o tipo `Segmento` derivado dos inscritos, a estimativa de alcance por segmento (Function on-demand) e as Security Rules.

**Contexto & referências**
- RNs: RN-130/131/132/134/135.
- Modelo: `eventos/{id}/campanhas/{campanhaId}`; segmento embed.
- Mocks (seed, comunicados adaptados ao evento — HANDOFF-05): "Alerta · kit pronto para retirada" (48 inscritos), "Cupom para amigos · AMIGOCPS", "Boas-vindas" (trigger); segmentos por modalidade 5k/10k/21k e por kit Ouro/Prata/Básico/Sem kit.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/campanha.ts` — `type Campanha`, `type Segmento`, `type CanalCampanha`, validação (título≥5, conteúdo≥10, push≤160).
- `packages/api-client/src/eventos/campanhas.ts` — CRUD + query por estado.
- `functions/src/eventos/estimarAlcance.ts` — tamanho do segmento a partir de `inscritos` (on-demand).
- `functions/firestore.rules` — Rules de `campanhas`.
- `functions/seed/campanhas.seed.ts`

**Passos de implementação**
1. `type Campanha = { id; titulo; conteudo; capaUrl?; canal: CanalCampanha[]; origem; status; segmento: Segmento; agendadaPara?; enviadaEm?; alcance; aberturasPct? }`.
2. `type Segmento = { tipo: 'todos_inscritos'|'por_modalidade'|'por_kit'|'por_status'|'por_engajamento'; referencia?: string }`.
3. Validação pura: título≥5, conteúdo≥10, push corpo≤160 (RN-134), capa só quando canal inclui email (RN-135).
4. `estimarAlcance(eventoId, segmento)` conta inscritos que casam (por modalidade/kit/status/engajamento) — nunca calculado no cliente.
5. Rules: só o organizador do evento lê/escreve; agregados ∑ (`alcance`/`aberturasPct`) só por Function.

**Modelo de dados / contratos**
- `estimarAlcance(eventoId, segmento) -> { tamanho }`
- `listarCampanhas(eventoId, estado?) -> Campanha[]`

**Regras de negócio a respeitar**
- RN-130/131/132/134/135; agregados só por Function.

**Critérios de aceite (testáveis)**
- **Dado** um segmento "por_kit=kit_ouro", **quando** estimo, **então** o tamanho bate com os inscritos daquele kit.
- **Dado** canal push, **quando** o corpo tem 161 chars, **então** a validação falha (RN-134).
- **Dado** um não-owner, **quando** lê `campanhas`, **então** a Rule nega.

**Testes a escrever**
- unit: validações de `campanha` (título/conteúdo/160/capa); tipos de segmento.
- integração: `estimarAlcance` (emulator) por modalidade/kit/status; Rules.

**Definition of Done**
- [ ] Segmentos derivados de inscritos · [ ] Validações RN-134/135 · [ ] Rules por owner · [ ] Agregados só por Function · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T2/T3); envio real (T4).

#### LEELA-S401-T2 · Sub-tela Campanhas (lista por estado, alcance/aberturas, filtros)

- **Tipo:** screen · **Depende de:** S401-T1, S400-T2 (shell Marketing), E01-S001-3-T2 (Table densa) · **Estimativa:** M

**Objetivo**
Renderizar a lista de campanhas agrupada por estado (enviadas, agendadas, rascunhos), com alcance/aberturas, busca, filtros e ações por linha.

**Contexto & referências**
- Telas: `Comunicacao.html`, `Club-Comunicacao.html`.
- RNs: RN-130/131/132, §2.5, §2.12.
- Mocks: comunicados adaptados ao evento (kit pronto, cupom amigos, boas-vindas).
- DS: SubNav interna (Campanhas ativa), Table densa/Cards, Badge por estado/canal, Chip de filtro, EmptyState, Popover de linha, Button (+ Nova campanha).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/marketing/campanhas/page.tsx`
- `apps/painel/app/eventos/[slug]/marketing/campanhas/_components/CampanhasList.tsx`

**Passos de implementação**
1. Grupos por estado (RN-130): enviadas (alcance + aberturas %), agendadas (disparo em), rascunhos (criado em).
2. Colunas/stats canônicos: `ALCANCE [N] · ABERTURAS [%] · SEGMENTO "[nome]" · ENVIADO EM [data]` (HANDOFF-07).
3. Busca + filtros (estado/canal/segmento) com contador "mostrando X de Y".
4. Popover de linha: ver, duplicar (Toast `Comunicado "[título]" duplicado · rascunho criado`), reenviar para quem não abriu, arquivar.
5. EmptyState "Nenhuma campanha encontrada com os filtros aplicados".
6. Botão "+ Nova campanha" → editor (T3).

**Modelo de dados / contratos**
- Lê `campanhas` (S401-T1). Sem escrita (via editor T3 / Function T4).

**Regras de negócio a respeitar**
- RN-130/131/132, §2.5, §2.12; copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** campanhas mistas, **quando** abro, **então** vejo os 3 grupos com stats corretos.
- **Dado** filtro sem correspondência, **quando** aplico, **então** EmptyState.

**Testes a escrever**
- unit: agrupamento por estado; render de stats.
- e2e: filtrar campanhas + abrir "+ Nova campanha".

**Definition of Done**
- [ ] 3 estados (RN-130) · [ ] Stats canônicos · [ ] EmptyState + contador · [ ] Table densa §2.5 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Editor de campanha (T3).

#### LEELA-S401-T3 · Editor "Nova campanha" (canal, capa, segmento, estimativa ao vivo, variáveis)

- **Tipo:** screen · **Depende de:** S401-T1, S401-T2 · **Estimativa:** L

**Objetivo**
Editor de criação/edição de campanha: título, conteúdo, canal (push/email), capa (só email), segmento com estimativa de alcance ao vivo, variáveis, e ações Enviar/Agendar/Salvar rascunho.

**Contexto & referências**
- Tela: `Club-Comunicacao-Nova.html`.
- RNs: RN-131 (canal), RN-133 (limite push), RN-134 (160 chars), RN-135 (capa só email), §2.12.
- Mocks: segmentos do evento (todos 453, por modalidade, por kit, por status, por engajamento); variáveis `{nome}`, `{proximo_evento}`.
- DS: Input, Textarea com contador, radio/checkbox de canal, upload dashed (capa · exceção §2.16), select de segmento + estimativa, select de variável, Button (Enviar agora / Agendar envio / Salvar rascunho), Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/marketing/campanhas/nova/page.tsx`
- `apps/painel/app/eventos/[slug]/marketing/campanhas/_components/CampanhaEditor.tsx`

**Passos de implementação**
1. Campos: `TÍTULO DO COMUNICADO *`, `CONTEÚDO DO COMUNICADO *` (contador; aviso de truncamento a partir de 160 quando canal=push — RN-134), `IMAGEM DE CAPA (OPCIONAL)` (só habilita com email — RN-135), canal (push/email/ambos — RN-131).
2. Select de segmento com estimativa de alcance ao vivo via `estimarAlcance` (S401-T1); helper "Aparece no topo do email · push não suporta imagem".
3. Inserção de variáveis `{nome}`/`{proximo_evento}` (helper "Use {nome} para personalizar por membro").
4. Validações inline (título≥5, conteúdo≥10, segmento e canal obrigatórios) com toasts canônicos.
5. Ações: Enviar agora / Agendar envio / Salvar rascunho → chama Function/CRUD (T4/T1) + Toast; limite push (RN-133) bloqueia envio com aviso.

**Modelo de dados / contratos**
- Cria/edita `campanhas` (S401-T1); dispara via Function (S401-T4).

**Regras de negócio a respeitar**
- RN-131/133/134/135, §2.12, §2.16 (upload dashed é a única exceção de borda); copy do glossário.

**Critérios de aceite (testáveis)**
- **Dado** canal push, **quando** o corpo passa de 160, **então** vejo aviso de truncamento (RN-134).
- **Dado** segmento "por modalidade = 21k", **quando** seleciono, **então** a estimativa de alcance atualiza ao vivo.
- **Dado** dados válidos, **quando** salvo rascunho, **então** Toast `Rascunho salvo`.
- **Dado** o 5º push da semana, **quando** tento enviar, **então** bloqueia com aviso (RN-133).

**Testes a escrever**
- unit: contador/truncamento; visibilidade da capa por canal; estimativa ao vivo.
- e2e: criar campanha → segmentar → agendar → Toast.

**Definition of Done**
- [ ] Canal/capa/limite/160 (RN-131/133/134/135) · [ ] Estimativa ao vivo · [ ] Validação inline · [ ] Upload dashed única exceção §2.16 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Envio/agregação (T4); rich-media de email.

#### LEELA-S401-T4 · Function `enviarCampanha` + agregado de alcance/aberturas (limite push, idempotente)

- **Tipo:** api/function · **Depende de:** S401-T1, S400-T1 (parceiros, p/ repasse não aplicável aqui) · **Bloqueia:** S402-T1 (reuso de disparo) · **Estimativa:** M

**Objetivo**
Cloud Function que dispara/agenda a campanha para o segmento resolvido, valida o limite de 4 push/semana (RN-133), grava `alcance` e mantém `aberturasPct` via webhooks de entrega/abertura, tudo idempotente.

**Contexto & referências**
- RNs: RN-133 (limite push), RN-134 (160), RN-131 (canal).
- Modelo: `campanhas.alcance`, `aberturasPct`, `enviadaEm`.

**Arquivos (criar/editar)**
- `functions/src/eventos/enviarCampanha.ts`
- `functions/src/eventos/agregarAberturas.ts` — webhooks de entrega/abertura.
- `functions/firestore.rules` — `alcance`/`aberturasPct` só escrevíveis por Function.

**Passos de implementação**
1. `enviarCampanha(eventoId, campanhaId, quando?)`: resolve o segmento (inscritos), valida limite push/semana (RN-133) e 160 chars (RN-134), grava `status`/`enviadaEm`/`alcance` (idempotente por id de disparo).
2. Agendamento (`agendadaPara`) via scheduler; disparo no horário.
3. Webhooks de entrega/abertura mantêm `aberturasPct` (idempotentes/assinados).
4. Autorização por `organizadorId == uid`; erros no Sentry sem PII.

**Modelo de dados / contratos**
- `enviarCampanha(...) -> { ok, alcance } | { bloqueado: 'limite_push' }`

**Regras de negócio a respeitar**
- RN-133/134/131; agregados só por Function; webhooks idempotentes/assinados.

**Critérios de aceite (testáveis)**
- **Dado** um segmento de 48 inscritos, **quando** disparo, **então** `alcance=48` e o Toast `Comunicado enviado para 48 membros`.
- **Dado** o 5º push da semana, **quando** disparo, **então** retorna `bloqueado: 'limite_push'`.
- **Dado** reprocesso de webhook de abertura, **quando** repito, **então** `aberturasPct` não infla (idempotente).

**Testes a escrever**
- integração: emulator — envio, limite push, idempotência de abertura; Rules.

**Definition of Done**
- [ ] Limite push (RN-133) no servidor · [ ] Idempotência de disparo/abertura · [ ] Autorização por owner · [ ] Erros sem PII · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Canal WhatsApp concreto; A/B testing.

---

### LEELA-S402 · Automações · (de-para BH-402)

**Como** Organizador de Evento, **quero** configurar automações de comunicação por gatilho, **para** que mensagens (boas-vindas, kit disponível, véspera, pós-evento) disparem sozinhas sem ação manual.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Comunicacao.html` (bloco de automações)
- **RNs:** RN-132 (origem automatizada), RN-131, RN-133, RN-134, §2.12

**Critérios de aceite (Given/When/Then):**
- **Dado** a sub-tela Automações, **quando** abro, **então** vejo as automações por gatilho (novo inscrito, kit disponível, véspera do evento, pós-evento) com toggle ativa/pausada e ∑ de disparos.
- **Dado** uma automação, **quando** ativo/pauso o toggle, **então** o estado persiste com Toast.
- **Dado** que edito o template de uma automação, **quando** salvo, **então** reuso o editor de campanha (origem=automatizada — RN-132) e as validações de canal/160 chars/limite valem.
- **Dado** o gatilho "novo inscrito", **quando** um inscrito é confirmado, **então** a mensagem dispara automaticamente (respeitando canal/limite).

**Tasks:** LEELA-S402-T1, LEELA-S402-T2

#### LEELA-S402-T1 · Modelo `automacoes` + Functions de gatilho + Rules

- **Tipo:** api/function · **Depende de:** S401-T1 (Campanha/template), S401-T4 (disparo), E03-S203-T1 (Inscrito), E03-S204-T2 (entrega) · **Bloqueia:** S402-T2 · **Estimativa:** M

**Objetivo**
Modelar a subcoleção `automacoes`, as Cloud Functions de gatilho (novo_inscrito, kit_disponivel, vespera_evento, pos_evento) que reusam `enviarCampanha`, e as Security Rules.

**Contexto & referências**
- RNs: RN-132 (origem automatizada), RN-131/133/134 (reuso das regras de campanha).
- Modelo: `eventos/{id}/automacoes/{automacaoId}`.
- Mocks (seed): boas-vindas ao inscrito; "kit pronto para retirada" (48); lembrete véspera; pós-evento.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/automacao.ts` — `type Automacao`, `type Gatilho`.
- `packages/api-client/src/eventos/automacoes.ts` — CRUD + toggle.
- `functions/src/eventos/automacoesTriggers.ts` — onWrite inscrito confirmado (novo_inscrito), onWrite entrega (kit_disponivel), scheduler (vespera_evento/pos_evento com `offset`).
- `functions/firestore.rules` — Rules de `automacoes`.
- `functions/seed/automacoes.seed.ts`

**Passos de implementação**
1. `type Automacao = { id; gatilho: Gatilho; templateRef; canal: CanalCampanha[]; ativa; offset?; disparos }`; `Gatilho = 'novo_inscrito'|'kit_disponivel'|'vespera_evento'|'pos_evento'`.
2. Triggers chamam `enviarCampanha` com o template (origem=automatizada — RN-132) só quando `ativa`, respeitando limite/160 (RN-133/134).
3. Idempotência por (automacaoId, alvo) para não redisparar ao reprocessar.
4. Rules: só o organizador escreve `automacoes`; ∑`disparos` só por Function.

**Modelo de dados / contratos**
- `toggleAutomacao(eventoId, automacaoId, ativa) -> { ok }`

**Regras de negócio a respeitar**
- RN-132/131/133/134; agregados só por Function; idempotência.

**Critérios de aceite (testáveis)**
- **Dado** a automação "novo_inscrito" ativa, **quando** um inscrito é confirmado, **então** dispara uma vez (idempotente) e ∑`disparos` incrementa.
- **Dado** a automação pausada, **quando** o gatilho ocorre, **então** não dispara.

**Testes a escrever**
- integração: emulator — trigger por gatilho, idempotência, toggle; Rules.

**Definition of Done**
- [ ] Gatilhos reusam `enviarCampanha` (RN-132) · [ ] Idempotência por alvo · [ ] Rules por owner · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T2); criação de novos tipos de gatilho custom.

#### LEELA-S402-T2 · Sub-tela Automações (lista por gatilho, toggle, editar template)

- **Tipo:** screen · **Depende de:** S402-T1, S400-T2 (shell Marketing), S401-T3 (editor reusado) · **Estimativa:** S

**Objetivo**
Renderizar a lista de automações por gatilho com toggle ativa/pausada, ∑ de disparos e edição de template reusando o editor de campanha.

**Contexto & referências**
- Tela: `Comunicacao.html` (bloco de automações).
- RNs: RN-132, §2.12.
- DS: SubNav interna (Automações ativa), Cards flat, Toggle, Badge, Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/marketing/automacoes/page.tsx`
- `apps/painel/app/eventos/[slug]/marketing/automacoes/_components/AutomacaoCard.tsx`

**Passos de implementação**
1. Card por gatilho (novo inscrito, kit disponível, véspera, pós-evento) com descrição, canal, ∑ disparos e Toggle.
2. Toggle ativa/pausa → `toggleAutomacao` (S402-T1) + Toast.
3. "Editar template" abre o editor de campanha (S401-T3) em modo automação (origem=automatizada).
4. Estados vazio/erro/carregando (§2.12).

**Modelo de dados / contratos**
- Lê/escreve `automacoes` (S402-T1).

**Regras de negócio a respeitar**
- RN-132, §2.12, §2.16.

**Critérios de aceite (testáveis)**
- **Dado** as automações, **quando** abro, **então** vejo um card por gatilho com toggle e disparos.
- **Dado** uma automação, **quando** pauso, **então** persiste com Toast.

**Testes a escrever**
- unit: render de `AutomacaoCard`; toggle chama a mutation.
- e2e: pausar/ativar automação.

**Definition of Done**
- [ ] Toggle persistente · [ ] Editor reusado (RN-132) · [ ] Estados §2.12 · [ ] Flat §2.16 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Novos gatilhos custom.

---

### LEELA-S403 · Patch retroativo de sub-nav (9 → 8 tabs) · (de-para BH-403)

**Como** time de desenvolvimento, **quero** migrar a sub-nav do evento de 9 para 8 tabs em todas as telas do evento, **para** que o módulo Marketing unificado seja consistente e "Promotores" + "Comunicação" deixem de existir como abas separadas.

- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Painel
- **Tela(s) de referência:** todas as telas do evento (`Overview do Evento.html` e demais que renderizam a `ev-tabs`)
- **RNs:** RN-002, §2.14

**Critérios de aceite (Given/When/Then):**
- **Dado** qualquer rota do evento, **quando** renderiza a sub-nav, **então** vejo exatamente **8 tabs** na ordem: Overview · Inscritos · Entrega · Kits · Página de Vendas · **Marketing** · Financeiro · Configurações (RN-002).
- **Dado** a sub-nav, **quando** procuro, **então** **não** existem mais as abas isoladas "Promotores" nem "Comunicação"; ambas foram absorvidas por Marketing.
- **Dado** a aba Marketing, **quando** clico, **então** navego para `/eventos/[slug]/marketing` (default: Campanhas) com underline Brasa 2px na ativa (§2.14).
- **Dado** um PR que reintroduza "Promotores"/"Comunicação" como aba do evento, **quando** roda a guarda, **então** falha.

**Tasks:** LEELA-S403-T1, LEELA-S403-T2

#### LEELA-S403-T1 · Refatorar `EventoSubNav` para as 8 tabs canônicas + rota Marketing

- **Tipo:** refactor · **Depende de:** E03-S202-T1 (EventoSubNav), S400-T2 (rota Marketing) · **Estimativa:** S

**Objetivo**
Substituir a sub-nav de 9 tabs pela definição canônica de 8 tabs no componente compartilhado do layout do evento, adicionando a aba/rota **Marketing** e removendo as abas isoladas de Promotores e Comunicação.

**Contexto & referências**
- RNs: RN-002, §2.14.
- Componente: `EventoSubNav` (E03) é a fonte única — a sub-nav não é redefinida por tela (governança §DS).
- Prototipo de referência (9 tabs): Overview · Inscritos (453) · Entrega · Kits · Página de Vendas · Promotores · Financeiro · Comunicação · Configurações.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/_components/EventoSubNav.tsx` — lista canônica de 8 tabs + contador pill (Inscritos 453).
- `apps/painel/app/eventos/[slug]/layout.tsx` — garante a sub-nav única em todas as rotas do evento.

**Passos de implementação**
1. Definir as 8 tabs canônicas (RN-002): Overview, Inscritos (pill), Entrega, Kits, Página de Vendas, Marketing, Financeiro, Configurações.
2. Rota "Marketing" → `/eventos/[slug]/marketing` (default Campanhas).
3. Remover quaisquer entradas isoladas de Promotores/Comunicação.
4. Underline Brasa 2px na aba ativa + contador pill (§2.14).

**Modelo de dados / contratos**
- Nenhum (apresentação/navegação).

**Regras de negócio a respeitar**
- RN-002, §2.14.

**Critérios de aceite (testáveis)**
- **Dado** qualquer rota do evento, **quando** renderiza, **então** há 8 tabs na ordem canônica com Marketing presente e sem Promotores/Comunicação isoladas.
- **Dado** a aba Marketing, **quando** clico, **então** navego para o módulo Marketing com a aba ativa marcada.

**Testes a escrever**
- unit: `EventoSubNav` renderiza 8 tabs, marca a ativa por rota e não contém "Promotores"/"Comunicação".

**Definition of Done**
- [ ] 8 tabs canônicas (RN-002) · [ ] Sub-nav única no layout (governança) · [ ] §2.14 (underline + pill) · [ ] a11y AA (nav por teclado) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Conteúdo das telas de Marketing (S400/S401/S402).

#### LEELA-S403-T2 · Guarda de regressão contra sub-nav de 9 tabs

- **Tipo:** test · **Depende de:** S403-T1 · **Estimativa:** XS

**Objetivo**
Adicionar teste/lint que falha se a sub-nav do evento voltar a ter 9 tabs ou reintroduzir "Promotores"/"Comunicação" como abas isoladas.

**Contexto & referências**
- RNs: RN-002.
- Estratégia: ver `estrategia-testes.md` (unit/guarda de regressão).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/_components/EventoSubNav.test.tsx` — asserção de 8 tabs + ausência dos termos.

**Passos de implementação**
1. Teste snapshot/asserção: contagem === 8, contém "Marketing", não contém aba "Promotores" nem "Comunicação".
2. Falhar o build se a asserção quebrar.

**Modelo de dados / contratos**
- Nenhum.

**Regras de negócio a respeitar**
- RN-002.

**Critérios de aceite (testáveis)**
- **Dado** a sub-nav com 8 tabs, **quando** rodo o teste, **então** passa.
- **Dado** uma regressão para 9 tabs (ou aba Promotores/Comunicação), **quando** rodo, **então** falha.

**Testes a escrever**
- unit: a própria guarda (é o entregável).

**Definition of Done**
- [ ] Guarda de regressão verde no estado canônico · [ ] Falha ao reintroduzir 9 tabs · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Refatoração da sub-nav (T1).

---

## Rastreabilidade (de-para BH-###)

| Story | De-para | Tela(s) de referência | Observação |
|---|---|---|---|
| LEELA-S400 | BH-400 (+ absorve BH-301 Promotores) | Comunicacao.html, Club-Parcerias*.html | Parceiros unificados (clube/influenciador/loja/promotor); write-side do programa de afiliação (RN-121/122) |
| LEELA-S401 | BH-401 (+ absorve BH-303 Comunicação do evento) | Comunicacao.html, Club-Comunicacao*.html | Campanhas segmentadas por inscritos |
| LEELA-S402 | BH-402 | Comunicacao.html (bloco automações) | Automações por gatilho (Could) |
| LEELA-S403 | BH-403 | Todas as telas do evento (ev-tabs) | Patch sub-nav 9 → 8 (RN-002) |

## Ordem sugerida

`S400-T1` (modelo parceiros/programa) → `S400-T2` (shell Marketing + Parceiros, desbloqueia S401/S402) → `S403-T1/T2` (sub-nav 8 tabs, torna Marketing acessível) → `S400-T3/T4` (programa + convite/detalhe) → `S401-T1 → T2 → T3 → T4` (campanhas: modelo, lista, editor, envio) → `S402-T1 → T2` (automações). Ao fim, o evento tem 8 tabs, Marketing operante (Campanhas · Automações · Parceiros) e o fluxo é demonstrável ponta a ponta com os mocks de HANDOFF-05.
