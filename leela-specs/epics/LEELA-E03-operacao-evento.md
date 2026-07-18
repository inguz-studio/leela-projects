# LEELA-E03 · Operação do Evento

- **Superfície:** Painel
- **Horizonte:** H1 (Onda 1 · Núcleo do Painel)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 🔄 In Progress (protótipo parcial; código a fazer + pendências BH-204/206/207)
- **Depende de:** LEELA-E01 (Design System & Shell), LEELA-E05 (entidades base · dados de Atleta/Inscrição)
- **De-para:** BH-E03 (Operação do Evento · EP-02a)

## Objetivo

Dar ao Organizador de Evento controle operacional completo de um evento ao vivo: descobrir e abrir um evento, criar e publicar a página, acompanhar inscritos em tempo real, configurar e distribuir kits, operar o balcão de entrega (retirada = presença) e ler o financeiro do evento. É o núcleo transacional do Painel do Profissional — sem ele não há operação no dia da prova.

O valor entregue é operar a Meia Maratona Floripa 2026 (453 inscritos, R$ 85.617) da criação da página até a retirada do kit no balcão, sem planilha e sem suporte técnico. Este épico materializa em código (Next.js + Firestore) o protótipo parcial de EP-02a e fecha as três pendências herdadas: balcão de entrega com estados (BH-204), edição de kit em tela cheia (BH-206) e financeiro do evento (BH-207).

## Personas & JTBD

- **Primária — Organizador de Evento (Marina Castelo · Castelo Produções).** JTBD: "Ter minha página no ar em menos de 15 minutos", "Visibilidade do funil em tempo real", "Kit certo na entrega, zero erro de tamanho", "Acompanhar o resultado financeiro e planejar saques".
- **Secundária — Operador de balcão.** JTBD: "Identificar o atleta, entregar o kit e vincular o chip num fluxo único e rápido no dia do evento".
- **Secundária — Admin Leela.** JTBD: suporte operacional e supervisão.

## Critérios de sucesso do épico

- Organizador cria e publica um evento gerando URL pública + QR (RN-201) em uma sessão.
- Lista de 453 inscritos navegável com paginação obrigatória, busca e filtros, sem travar (RN-202/203/204).
- Balcão entrega kit + vincula chip + registra presença num fluxo único; conflito de chip e evento fora da janela tratados como estados dedicados (RN-205/206/207/208).
- Kits configuráveis (0..N), com item reutilizado em múltiplos kits e "Sem kit" como kit válido com desconto (RN-210…217).
- Financeiro do evento legível (bruto/taxa/líquido, breakdown, repasses) e exportável em CSV (BH-207).
- Nomenclatura "kit" em todo o produto — nunca "tier" (RN-216).
- Fluxo demonstrável ponta a ponta com os mocks canônicos de HANDOFF-05, sem inventar dados.

## Regras de negócio aplicáveis

- **RN-200** — Após a 1ª venda, edição de preço do evento/kit é bloqueada.
- **RN-201** — Publicar o evento gera URL pública (`beh.ro/{slug}`) + QR automaticamente.
- **RN-202** — Inscrito tem `kit`: `kit_ouro` | `kit_prata` | `kit_basico` | `sem_kit`.
- **RN-203** — Inscrito tem `chipNumero` (nulo até a entrega).
- **RN-204** — Inscrito tem `status`: `confirmado` | `pendente` | `cancelado`.
- **RN-205** — Retirar kit equivale a check-in; não há check-in separado.
- **RN-206** — Chip já vinculado a outro atleta dispara confirmação de sobrescrita.
- **RN-207** — Quando `evento.usaChip=false`, o passo de vínculo de chip é suprimido.
- **RN-208** — Estados de tela vão para galeria separada, nunca empilhados (§2.9).
- **RN-210** — Evento oferece 0 a N kits (não kit único).
- **RN-211** — "Sem kit" é kit válido e aceita preço negativo (desconto).
- **RN-212** — Item é tamanhado (camiseta) ou único (sacochila, amostra).
- **RN-213** — Item tem origem: `organizador` ou `patrocinador`.
- **RN-214** — Item patrocinado tem toggle "Exibir logo ao atleta".
- **RN-215** — Mesmo item pode aparecer em múltiplos kits.
- **RN-216** — "tier" renomeado para "kit" em toda a nomenclatura do produto.
- **RN-217** — Edição de kit tem 2 pontos de entrada (adicionar + editar card).
- **RN-221** — QR do ingresso é token de identificação/presença, não status de check-in concorrente: escanear carrega o inscrito no balcão; retirar o kit continua registrando presença (RN-205).
- **RN-222** — Quando o kit é entregue antecipadamente, o QR na largada registra apenas `checkinEm` (presença), sem reabrir a entrega de kit.
- **RN-223** — Tamanho é persistido por inscrito por item tamanhado (map `itemId → tamanho`), coletado no checkout; obrigatório quando o kit tem item tamanhado (RN-212).
- **RN-224** — "A encomendar por SKU" = Σ inscritos confirmados que exigem (item, tamanho) − estoque físico do SKU; agregado por Function.
- **RN-225** — Item/kit tem modelo de estoque: `sob_encomenda` ou `estoque_proprio`.
- **RN-226** — Estado de aprovisionamento por SKU: `estimativa → encomendado → em_estoque`; a transição registra quantidade e data.

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Coleções afetadas:

- `eventos/{eventoId}` (docId = slug) — `organizadorId`, `nome`, `data`, `local`, `modalidades[]`, `slug`, `status`, `usaChip`; ∑ `qtdInscritos`, `receitaConfirmada`.
- `eventos/{eventoId}/inscritos/{inscritoId}` — join Atleta↔Evento; `atletaId` 🔁`atletaNome`, `kit`, `chipNumero?`, `status`, `modalidade`. Paginação obrigatória (mock: 453). Novos campos: `kitEntregueEm?` e `checkinEm?` (dois carimbos distintos que substituem a presença implícita em `status` — RN-205/222), `qrToken` (opaco, gerado na confirmação) e `ingressoEmitidoEm` (ingresso digital — S1206/RN-218), `tamanhos: Record<itemId, string>` (tamanho por item tamanhado — RN-223), `pedidoRef` (pedido a que o inscrito pertence) e `ehResponsavel: bool` (se o inscrito também é o responsável/pagador do pedido — ADR-011).
- `eventos/{eventoId}/kits/{kitId}` — `nome` (nunca "tier"), `preco` (aceita negativo), `capacidade`, `modalidades[]`.
- `itensKit/{itemId}` — `nome`, `tamanhado`, `origem`, `exibirLogo`; ⇄ N:N Kit↔ItemKit por array de refs + índice inverso desnormalizado ("usado em: [kits]"). Novos campos: `modeloEstoque` (`sob_encomenda` | `estoque_proprio` — RN-225) e `tamanhosDisponiveis[]` (valores válidos para itens tamanhados — RN-223).
- ➕ `eventos/{eventoId}/aprovisionamento/{sku}` (docId = `itemId__tamanho`) — `estado` (`estimativa` | `encomendado` | `em_estoque` — RN-226), `qtdVendida` (∑), `estoqueFisico`, `aEncomendar` (∑ derivado — RN-224), `historico[]` (quantidade + data por transição). Agregados ∑ só por Function, no onWrite de inscrito confirmado.
- `eventos/{eventoId}/programaAfiliacao/{unico}` — referenciado (leitura) para o financeiro; escrita fica em LEELA-E04.

Agregados ∑ (`qtdInscritos`, `receitaConfirmada`) mantidos por Cloud Function — nunca calculados no cliente.

## Fora de escopo (Won't nesta fase)

- Configuração de página de vendas, lotes, cupons e promotores → **LEELA-E04**.
- Checkout e inscrição pública (landing) → **LEELA-E12**.
- Comunicação/marketing do evento (push/email segmentado) → **LEELA-E06**.
- Gateway de pagamento concreto e split de afiliação (só a leitura de repasse aparece aqui) → **PaymentProvider / ADR-006 / LEELA-E04**.
- Configurações gerais, equipe e permissões do evento (4 papéis) → **LEELA-E04 (BH-304)**.
- Leitura de chip via hardware real (só contrato de input manual/USB é coberto).
- Ajuste manual de estoque continua fora desta fase. O **aprovisionamento** (encomenda → estoque, "a encomendar por SKU") entrou no escopo via **LEELA-S210** — só a edição manual de saldo físico segue fora.

---

## User stories

### LEELA-S200 · Hub de eventos · (de-para BH-200)

**Como** Organizador de Evento, **quero** ver todos os meus eventos num hub com KPIs globais, **para** abrir rapidamente o evento que quero gerenciar.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Meus Eventos.html`
- **RNs:** — (leitura; usa `eventos.status` e agregados ∑)

**Critérios de aceite (Given/When/Then):**
- **Dado** que tenho eventos, **quando** abro `/eventos`, **então** vejo um card por evento com `status` (rascunho/publicado/ao_vivo/encerrado) e KPIs globais consolidados.
- **Dado** um card, **quando** clico, **então** navego para o Overview daquele evento.
- **Dado** que não tenho evento nenhum, **quando** abro o hub, **então** vejo EmptyState com CTA "Criar evento".
- **Dado** o hub, **quando** clico em "+ Novo evento", **então** navego para a tela de criação.

**Tasks:** LEELA-S200-T1, LEELA-S200-T2

#### LEELA-S200-T1 · Tipo `Evento` + query de eventos por organizador + Security Rules

- **Tipo:** data-model · **Depende de:** E00 (Firebase), E01 · **Bloqueia:** S200-T2, S201-T1 · **Estimativa:** S

**Objetivo**
Definir o tipo de domínio `Evento` em `core`, a query paginável de eventos por `organizadorId` no `api-client`, e as Security Rules da coleção `eventos`.

**Contexto & referências**
- RNs: —
- Modelo de dados: `eventos/{eventoId}` (docId = slug).
- Mocks canônicos (seed): Meia Maratona Floripa 2026 (`meia-floripa-2026`, 27 Abr, Marina Castelo, 453 inscritos, R$ 85.617, modalidades 5k/10k/21k, `usaChip=true`).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/evento.ts` — `type Evento`, `type StatusEvento`, derivações puras.
- `packages/api-client/src/eventos/queries.ts` — `listarEventosDoOrganizador(profId)`.
- `functions/firestore.rules` (ou `firestore.rules`) — regras da coleção `eventos`.
- `functions/seed/eventos.seed.ts` — seed do evento canônico.

**Passos de implementação**
1. Modelar `Evento` com `organizadorId`, `nome`, `data`, `local`, `modalidades[]`, `slug`, `status`, `usaChip`, agregados `qtdInscritos`, `receitaConfirmada`.
2. Query `eventos where organizadorId == uid` ordenada por `data`.
3. Rules: profissional lê/escreve só onde `organizadorId == request.auth.uid`; agregados ∑ só escrevíveis por Function.
4. Seed com o mock exato de HANDOFF-05.

**Modelo de dados / contratos**
- `eventos/{slug}` — campos acima; `status ∈ {rascunho, publicado, ao_vivo, encerrado}`.
- `type Evento = { id: string; organizadorId: string; nome: string; data: string; local: string; modalidades: string[]; slug: string; status: StatusEvento; usaChip: boolean; qtdInscritos: number; receitaConfirmada: number }`.

**Regras de negócio a respeitar**
- Agregados ∑ nunca escritos pelo cliente (Rules bloqueiam).

**Critérios de aceite (testáveis)**
- **Dado** um `uid` de organizador, **quando** consulto, **então** recebo só os eventos cujo `organizadorId` é o `uid`.
- **Dado** um cliente tentando escrever `qtdInscritos`, **quando** persiste, **então** a Rule nega.

**Testes a escrever**
- unit: parsing/derivação de `Evento` em `core`.
- integração: Rules (emulator) — leitura restrita ao owner; escrita de agregado negada ao cliente.

**Definition of Done**
- [ ] Critérios de aceite passam · [ ] Testes verdes · [ ] Rules cobrindo a coleção · [ ] Sem segredo no cliente · [ ] Lint + type-check limpos · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Subcoleções `inscritos`/`kits` (ficam em S203/S205).

#### LEELA-S200-T2 · Tela Hub de eventos (`/eventos`) com KPIs globais e EmptyState

- **Tipo:** screen · **Depende de:** S200-T1, E01-S001-3 (Shell, Card Evento) · **Estimativa:** M

**Objetivo**
Renderizar o hub com grid de cards de evento, KPIs globais no topo, EmptyState e botão de criação.

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/Meus Eventos.html`
- RNs: —
- Mocks: Meia Floripa 2026 + demais eventos do organizador.
- Componentes DS: Shell (Sidebar 8 itens, item "Eventos" com badge), Card Evento (media 16/10 gradiente por categoria + badge modalidade), Badge de status, EmptyState, Button (1 Primary).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/page.tsx` — hub.
- `apps/painel/app/eventos/_components/EventoCard.tsx` — consome Card Evento do DS.

**Passos de implementação**
1. Server component busca `listarEventosDoOrganizador`.
2. Barra de KPIs globais (nº eventos ativos, inscritos totais, receita consolidada).
3. Grid de `EventoCard` com badge de status; hover translateY.
4. EmptyState "Você ainda não criou nenhum evento" + CTA.
5. Botão "+ Novo evento" → `/eventos/novo`.

**Modelo de dados / contratos**
- Lê `eventos` (S200-T1). Sem escrita.

**Regras de negócio a respeitar**
- Estados vazio/carregando/erro (§2.12); skeleton, nunca spinner solto.

**Critérios de aceite (testáveis)**
- **Dado** eventos existentes, **quando** abro o hub, **então** cada card mostra status e navega ao Overview no clique.
- **Dado** zero eventos, **quando** abro, **então** vejo EmptyState + CTA.

**Testes a escrever**
- unit: render de `EventoCard` por status.
- e2e: hub → clicar card → Overview.

**Definition of Done**
- [ ] Aceite passa · [ ] Estados vazio/erro/carregando (§2.12) · [ ] Flat §2.16, tokens do DS · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Criação do evento (S201).

---

### LEELA-S201 · Criar e publicar evento · (de-para BH-201)

**Como** Organizador de Evento, **quero** criar um evento com nome, data, local, modalidades e preços e publicar uma página compartilhável, **para** ter minha página no ar em menos de 15 minutos sem suporte técnico.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Novo Evento.html`
- **RNs:** RN-200, RN-201

**Critérios de aceite (Given/When/Then):**
- **Dado** o formulário, **quando** preencho nome, descrição, data, local, modalidades e percursos com preço independente e envio, **então** o evento é criado como `rascunho`.
- **Dado** um evento em rascunho, **quando** publico, **então** o sistema gera URL pública (`beh.ro/{slug}`) + QR (RN-201) e o status vira `publicado`.
- **Dado** um evento com ≥1 venda, **quando** tento editar preço, **então** o campo está bloqueado com aviso (RN-200).
- **Dado** o formulário, **quando** falta um campo obrigatório, **então** vejo validação inline e não avanço.

**Tasks:** LEELA-S201-T1, LEELA-S201-T2, LEELA-S201-T3

#### LEELA-S201-T1 · Tela "Novo evento" (formulário + upload capa/regulamento + pré-visualização)

- **Tipo:** screen · **Depende de:** S200-T1, E01 (Input, Stepper, Upload dashed) · **Estimativa:** L

**Objetivo**
Formulário de criação com nome, descrição, data, local, modalidades, percursos (nome + preço independente), upload de capa (imagem) e regulamento (PDF), e pré-visualização antes de publicar.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Novo Evento.html`
- RNs: RN-200 (preview do bloqueio de preço), RN-201.
- Mocks: Meia Floripa 2026 (5k/10k/21k).
- DS: Input/estados, Chip de modalidade, upload dashed (exceção §2.16), Stepper, Button.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/novo/page.tsx`
- `apps/painel/app/eventos/novo/_components/EventoForm.tsx`
- `packages/core/src/eventos/validacao.ts` — validações puras (nome, data futura, ≥1 modalidade, preço numérico).

**Passos de implementação**
1. Form controlado com seções: identidade, data/local, modalidades/percursos (linhas com preço), mídia (capa + regulamento).
2. Validação inline por campo via `core/validacao`.
3. Preço aceita decimal; "Sem kit" pode ter valor negativo (desconto) — validado em S205, aqui apenas numérico.
4. Pré-visualização da página antes de publicar.
5. Submit chama `criarEvento` (S201-T2) → rascunho.

**Modelo de dados / contratos**
- Escreve `eventos/{slug}` via Function `criarEvento` (S201-T2). Sem escrita direta de agregados.

**Regras de negócio a respeitar**
- RN-200 (campo de preço já renderiza como bloqueável quando houver venda).

**Critérios de aceite (testáveis)**
- **Dado** dados válidos, **quando** envio, **então** o evento é criado como `rascunho` e vejo Toast de sucesso.
- **Dado** campo obrigatório vazio, **quando** envio, **então** erro inline e sem submit.

**Testes a escrever**
- unit: validações de `core/validacao` (data futura, ≥1 modalidade, preço numérico).
- e2e: preencher form → criar rascunho.

**Definition of Done**
- [ ] Aceite passa · [ ] Validação inline (§2.12) · [ ] Upload dashed única exceção de borda (§2.16) · [ ] tokens DS · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Configuração de lotes/cupons (E04).

#### LEELA-S201-T2 · Function `criarEvento` + `publicarEvento` (slug, URL, QR)

- **Tipo:** api/function · **Depende de:** S200-T1 · **Bloqueia:** S201-T1 (submit) · **Estimativa:** M

**Objetivo**
Cloud Functions para criar evento (rascunho) e publicar (gera slug único, URL pública e QR), com validação de input no servidor.

**Contexto & referências**
- RNs: RN-201.
- Modelo: `eventos/{slug}`.

**Arquivos (criar/editar)**
- `functions/src/eventos/criarEvento.ts`
- `functions/src/eventos/publicarEvento.ts`
- `functions/src/eventos/slug.ts` — slugify + garantia de unicidade.
- `packages/api-client/src/eventos/mutations.ts` — wrappers tipados.

**Passos de implementação**
1. `criarEvento(input)`: valida no servidor, gera `slug` único, grava `status=rascunho`, `organizadorId=uid`.
2. `publicarEvento(eventoId)`: valida completude, seta `status=publicado`, computa `url=beh.ro/{slug}` e gera QR (payload da URL) — retorna asset/URL do QR.
3. Erros observáveis no Sentry sem dado sensível.

**Modelo de dados / contratos**
- `criarEvento(input) -> { eventoId, slug }`
- `publicarEvento(eventoId) -> { url, qrUrl }`

**Regras de negócio a respeitar**
- RN-201 — publicar gera URL + QR automaticamente.
- Autorização por `organizadorId == uid` (custom claims).

**Critérios de aceite (testáveis)**
- **Dado** um rascunho completo, **quando** publico, **então** recebo `url` e `qrUrl` e o status vira `publicado`.
- **Dado** input inválido, **quando** chamo `criarEvento`, **então** a Function rejeita (nunca confia no cliente).

**Testes a escrever**
- integração: emulator — criar/publicar; slug único sob colisão; autorização por owner.

**Definition of Done**
- [ ] Validação no servidor · [ ] Autorização por papel · [ ] Erros no Sentry sem PII · [ ] Idempotência de publicação · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Checkout/venda (E12).

#### LEELA-S201-T3 · Bloqueio de edição de preço após 1ª venda (RN-200)

- **Tipo:** integration · **Depende de:** S201-T2, S203-T1 · **Estimativa:** S

**Objetivo**
Impedir edição de preço de evento/kit quando já houver ≥1 inscrição confirmada, no cliente (UI desabilitada + aviso) e no servidor (Rule/Function).

**Contexto & referências**
- RNs: RN-200.
- Modelo: `eventos/{id}` + `inscritos` (existe venda quando há inscrito `confirmado`).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/precoBloqueado.ts` — `precoBloqueado(evento): boolean`.
- `functions/src/eventos/guardPreco.ts` — valida no servidor em updates de preço.
- `functions/firestore.rules` — nega update de `preco` quando há venda.

**Passos de implementação**
1. Derivar `temVenda` a partir de `qtdInscritos>0` (ou existência de inscrito confirmado).
2. UI desabilita campos de preço + Toast/aviso "Preço bloqueado após a primeira venda".
3. Guard no servidor rejeita mudança de preço.

**Modelo de dados / contratos**
- Lê `eventos.qtdInscritos`; guarda updates de `eventos.*.preco` e `kits.preco`.

**Regras de negócio a respeitar**
- RN-200 — bloqueio total após 1ª venda.

**Critérios de aceite (testáveis)**
- **Dado** evento com 1 venda, **quando** tento alterar preço, **então** UI bloqueia e o servidor rejeita.
- **Dado** evento sem venda, **quando** altero preço, **então** persiste.

**Testes a escrever**
- unit: `precoBloqueado`.
- integração: Rule/Function nega update de preço com venda.

**Definition of Done**
- [ ] Aceite passa · [ ] Guard no servidor (não confia no cliente) · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Lotes com virada de preço (E04).

---

### LEELA-S202 · Overview do evento (shell + dashboard) · (de-para BH-202)

**Como** Organizador de Evento, **quero** ver o dashboard de visão geral do evento, **para** entender vendas, inscritos e operação de relance.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Overview do Evento.html`, `WEB-APPV2 (1)/Detalhe do Evento.html`
- **RNs:** — (usa §2.1 header, §2.14 sub-nav)

**Critérios de aceite (Given/When/Then):**
- **Dado** um evento, **quando** abro o Overview, **então** vejo header 96px do evento (§2.1) e sub-nav do evento (§2.14) com a aba ativa marcada.
- **Dado** o Overview, **quando** carrega, **então** vejo KPIs de venda/inscrição, alertas operacionais inline e atividade recente.
- **Dado** a sub-nav, **quando** clico numa aba, **então** navego para a rota correspondente (inscritos, kits, financeiro).

**Tasks:** LEELA-S202-T1, LEELA-S202-T2

#### LEELA-S202-T1 · Layout do evento (header 96px §2.1 + sub-nav §2.14) reutilizável

- **Tipo:** screen · **Depende de:** S200-T1, E01-S001-3-T1 (Shell/SubNav) · **Bloqueia:** S203, S205, S206, S207 · **Estimativa:** M

**Objetivo**
Layout compartilhado das rotas de um evento: header do evento 96px (nome, data, local, badges, ações) + sub-nav do evento com underline Brasa 2px na aba ativa e contadores pill.

**Contexto & referências**
- Telas: `Overview do Evento.html`, `Detalhe do Evento.html`.
- RNs: §2.1, §2.14.
- DS: Header 96px, SubNav (underline + contador pill), Breadcrumb.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/layout.tsx` — layout do evento.
- `apps/painel/app/eventos/[slug]/_components/EventoHeader.tsx`
- `apps/painel/app/eventos/[slug]/_components/EventoSubNav.tsx`

**Passos de implementação**
1. Layout carrega o evento por `slug` e injeta no header.
2. Sub-nav com abas: Overview, Inscritos, Kits, Financeiro (contadores pill onde aplicável, ex.: inscritos 453).
3. Breadcrumb (Eventos / [evento] / [aba]).

**Modelo de dados / contratos**
- Lê `eventos/{slug}`. Sem escrita.

**Regras de negócio a respeitar**
- §2.1 (header 96px), §2.14 (sub-nav underline + pill), §2.7 (abas no DOM quando for tabs internas).

**Critérios de aceite (testáveis)**
- **Dado** um evento, **quando** abro qualquer rota do evento, **então** header e sub-nav aparecem com a aba correta ativa.

**Testes a escrever**
- unit: render de SubNav marca a aba ativa por rota.

**Definition of Done**
- [ ] §2.1/§2.14 aplicados · [ ] tokens DS · [ ] a11y AA (nav por teclado) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Conteúdo do dashboard (T2).

#### LEELA-S202-T2 · Dashboard Overview (KPIs, alertas operacionais, atividade recente)

- **Tipo:** screen · **Depende de:** S202-T1 · **Estimativa:** M

**Objetivo**
Renderizar o dashboard do evento com KPIs de venda/inscrição, alertas operacionais inline e feed de atividade recente.

**Contexto & referências**
- Tela: `Overview do Evento.html`.
- Mocks: Meia Floripa 2026 — 453 inscritos, R$ 85.617.
- DS: Cards flat (§2.16; card crítico com border-left Vulcão é a única exceção), Badge, Skeleton.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/page.tsx` (Overview)
- `apps/painel/app/eventos/[slug]/_components/OverviewKpis.tsx`

**Passos de implementação**
1. KPIs a partir de agregados ∑ (`qtdInscritos`, `receitaConfirmada`) — nunca calcular no cliente.
2. Alertas operacionais inline (ex.: "kits sem estoque suficiente", "evento em 3 dias").
3. Atividade recente (últimas inscrições/entregas).
4. Skeletons no carregamento.

**Modelo de dados / contratos**
- Lê `eventos/{slug}` + agregados. Sem escrita.

**Regras de negócio a respeitar**
- §2.16 (flat; card crítico é a exceção border-left Vulcão); §2.12 (estados).

**Critérios de aceite (testáveis)**
- **Dado** o evento canônico, **quando** abro o Overview, **então** os KPIs batem com os agregados (453 / R$ 85.617) e há alertas + atividade recente.

**Testes a escrever**
- unit: render de `OverviewKpis` com dados do agregado.

**Definition of Done**
- [ ] Aceite passa · [ ] KPIs de agregado, não ad-hoc · [ ] Estados carregando/erro · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Comunicação e marketing (E06).

---

### LEELA-S203 · Gestão de inscritos · (de-para BH-203)

**Como** Organizador de Evento, **quero** ver e filtrar a lista de inscritos com kit e chip, **para** acompanhar o funil e gerenciar a operação em tempo real.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Inscritos do Evento.html`
- **RNs:** RN-202, RN-203, RN-204, §2.5, §2.7

**Critérios de aceite (Given/When/Then):**
- **Dado** 453 inscritos, **quando** abro a lista, **então** vejo tabela densa (§2.5) com ~18 linhas por página e paginação obrigatória, com contador "mostrando X de Y".
- **Dado** a tela, **quando** navego pelas 4 tabs internas (Geral, Pagamento, Comunicação, Histórico), **então** todas estão no DOM (§2.7) e alternam sem recarregar.
- **Dado** a coluna de kit, **quando** listo, **então** vejo badge de kit (Ouro/Prata/Básico/Sem kit — RN-202) e `chipNumero` (vazio até a entrega — RN-203).
- **Dado** busca/filtros, **quando** nada casa, **então** EmptyState "Nenhum inscrito encontrado com os filtros aplicados".
- **Dado** uma linha, **quando** clico, **então** abre slide-in de detalhe do inscrito (status confirmado/pendente/cancelado — RN-204).

**Tasks:** LEELA-S203-T1, LEELA-S203-T2

#### LEELA-S203-T1 · Subcoleção `inscritos` + tipo `Inscrito` + query paginada + Rules

- **Tipo:** data-model · **Depende de:** S200-T1 · **Bloqueia:** S203-T2, S204 · **Estimativa:** M

**Objetivo**
Modelar a subcoleção `inscritos`, o tipo `Inscrito`, a query paginada (cursor) por evento e as Security Rules.

**Contexto & referências**
- RNs: RN-202/203/204.
- Modelo: `eventos/{eventoId}/inscritos/{inscritoId}`.
- Mocks: 453 inscritos da Meia Floripa (seed representativo).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/inscrito.ts` — `type Inscrito`, `type KitInscrito`, `type StatusInscrito`.
- `packages/api-client/src/eventos/inscritos.ts` — query paginada por cursor (18/página).
- `functions/firestore.rules` — leitura restrita ao organizador do evento.
- `functions/seed/inscritos.seed.ts` — seed dos 453.

**Passos de implementação**
1. `type Inscrito = { id; atletaId; atletaNome; kit: KitInscrito; chipNumero: string|null; status: StatusInscrito; modalidade: string }`.
2. `KitInscrito = 'kit_ouro'|'kit_prata'|'kit_basico'|'sem_kit'` (RN-202).
3. Query paginada por cursor `startAfter` (page size 18).
4. Rules: só o organizador do evento lê; agregados ∑ só por Function.
5. Seed 453 com distribuição por kit/modalidade.

**Modelo de dados / contratos**
- `listarInscritos(eventoId, cursor?, pageSize=18) -> { itens: Inscrito[]; proxCursor }`

**Regras de negócio a respeitar**
- RN-202/203/204; agregado `qtdInscritos` só por Function.

**Critérios de aceite (testáveis)**
- **Dado** 453 inscritos, **quando** pagino, **então** recebo páginas de 18 com cursor estável.
- **Dado** um não-owner, **quando** lê, **então** a Rule nega.

**Testes a escrever**
- unit: tipos/derivações em `core`.
- integração: paginação por cursor e Rules (emulator).

**Definition of Done**
- [ ] Paginação por cursor · [ ] Rules por owner · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T2).

#### LEELA-S203-T2 · Tela de inscritos (tabela densa §2.5, paginação, 4 tabs §2.7, slide-in)

- **Tipo:** screen · **Depende de:** S203-T1, S202-T1, E01-S001-3-T2 (Table densa) · **Estimativa:** L

**Objetivo**
Renderizar a lista densa de inscritos com paginação obrigatória, busca + filtros, badge de kit e chip, 4 tabs internas no DOM e slide-in de detalhe por inscrito.

**Contexto & referências**
- Tela: `Inscritos do Evento.html`.
- RNs: RN-202/203/204, §2.5, §2.7.
- Mocks: 453 inscritos; kits Ouro/Prata/Básico/Sem kit.
- DS: Table densa (linha 64px, header uppercase), Badge por kit, Chip de filtro, EmptyState, Tabs (§2.7), Popover de linha, painel slide-in.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/inscritos/page.tsx`
- `apps/painel/app/eventos/[slug]/inscritos/_components/InscritosTable.tsx`
- `apps/painel/app/eventos/[slug]/inscritos/_components/InscritoSlideIn.tsx`

**Passos de implementação**
1. Tabela densa com colunas: atleta, modalidade, kit (badge), chip, status.
2. Paginação obrigatória (18/página, ~26 páginas) + contador "mostrando X de Y".
3. Busca client+cursor e filtros por status/kit/modalidade (chips).
4. 4 tabs (Geral, Pagamento, Comunicação, Histórico) todas no DOM (§2.7).
5. Slide-in de detalhe do inscrito ao clicar na linha.
6. EmptyState quando filtros zeram.

**Modelo de dados / contratos**
- Lê `inscritos` via `listarInscritos` (S203-T1). Sem escrita nesta tela.

**Regras de negócio a respeitar**
- RN-202 (badge de kit), RN-203 (chip vazio até entrega), RN-204 (status), §2.5, §2.7, §2.12.

**Critérios de aceite (testáveis)**
- **Dado** 453 inscritos, **quando** abro, **então** vejo ~18 linhas e paginação; o contador reflete o total.
- **Dado** busca "Marina", **quando** filtro, **então** só linhas que casam aparecem e o contador atualiza.
- **Dado** filtro sem correspondência, **quando** aplico, **então** EmptyState.
- **Dado** uma linha, **quando** clico, **então** abre slide-in com status do inscrito.

**Testes a escrever**
- unit: filtro/contador.
- e2e: paginar 453 + filtrar + abrir slide-in.

**Definition of Done**
- [ ] Paginação obrigatória · [ ] Tabs no DOM (§2.7) · [ ] EmptyState + contador · [ ] Table densa §2.5 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Ações de escrita sobre inscrito (cancelar/reembolsar) → E04.

---

### LEELA-S204 · Balcão de entrega e check-in · (de-para BH-204)

**Como** Organizador de Evento (ou operador de balcão), **quero** identificar o atleta, entregar o kit, vincular o chip e fechar o atendimento num fluxo único, **para** que a retirada seja rápida e sem erro no dia do evento.

- **MoSCoW:** Must · **Estimativa:** XL · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Entrega de Kit.html`, `Entrega-Atendimento.html`, `Entrega de Kit _galeria-estados.html`, `Entrega-Estado-Vazio.html`, `Entrega-Estado-Completo.html`, `Entrega-Estado-Conflito.html`, `Entrega-Estado-ForaJanela.html`
- **RNs:** RN-205, RN-206, RN-207, RN-208, §2.9, §2.15

**Critérios de aceite (Given/When/Then):**
- **Dado** o balcão, **quando** abro, **então** vejo layout 60/40 (atendimento à esquerda, painel operacional à direita com resumo ao vivo, alertas e últimos atendimentos).
- **Dado** um atleta identificado, **quando** conduzo o atendimento, **então** passo por: entregar kit → vincular chip → check-in, e retirar o kit já registra presença (RN-205; sem check-in separado).
- **Dado** um inscrito `sem_kit`, **quando** atendo, **então** o passo "entregar kit" já vem concluído.
- **Dado** `evento.usaChip=false`, **quando** atendo, **então** o passo de vínculo de chip é suprimido (RN-207).
- **Dado** um chip já vinculado a outro atleta, **quando** tento vincular, **então** abre confirmação de sobrescrita (RN-206).
- **Dado** os estados especiais (vazio, sem-kit, já atendido, conflito de chip, fora da janela), **quando** os documento, **então** vão em galeria separada, nunca empilhados (RN-208/§2.9).

**Tasks:** LEELA-S204-T1, LEELA-S204-T2, LEELA-S204-T3

#### LEELA-S204-T1 · Tela do balcão (layout 60/40 + 3 passos + painel operacional)

- **Tipo:** screen · **Depende de:** S203-T1, S205-T1, S202-T1 · **Estimativa:** L

**Objetivo**
Renderizar o balcão de atendimento: layout 60/40, fluxo de 3 passos (entregar kit → vincular chip → check-in) e painel operacional ao vivo à direita.

**Contexto & referências**
- Telas: `Entrega de Kit.html`, `Entrega-Atendimento.html`.
- RNs: RN-205, RN-207, §2.12.
- Mocks: inscritos Meia Floripa; kits Ouro/Prata/Básico/Sem kit.
- DS: Stepper, Cards flat, Badge, Toast, painel lateral.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/entrega/page.tsx`
- `apps/painel/app/eventos/[slug]/entrega/_components/AtendimentoPanel.tsx`
- `apps/painel/app/eventos/[slug]/entrega/_components/PainelOperacional.tsx`

**Passos de implementação**
1. Busca do atleta (nome/dorsal) que carrega o inscrito.
2. Stepper de 3 passos; passo "kit" auto-concluído se `sem_kit`.
3. Passo chip suprimido quando `usaChip=false` (RN-207).
4. Fechar atendimento = presença (RN-205) via Function (S204-T2).
5. Painel direito: resumo ao vivo (entregues/pendentes), alertas, últimos atendimentos.

**Modelo de dados / contratos**
- Lê `inscritos`; escreve entrega via Function (S204-T2).

**Regras de negócio a respeitar**
- RN-205 (retirar = presença), RN-207 (suprime chip), §2.12.

**Critérios de aceite (testáveis)**
- **Dado** um inscrito `sem_kit`, **quando** abro o atendimento, **então** passo 1 vem concluído.
- **Dado** `usaChip=false`, **quando** atendo, **então** não há passo de chip.
- **Dado** atendimento fechado, **quando** confirmo, **então** presença registrada + Toast.

**Testes a escrever**
- unit: derivação dos passos por `kit`/`usaChip`.
- e2e: atendimento completo → presença.

**Definition of Done**
- [ ] Layout 60/40 · [ ] Passos condicionais (RN-205/207) · [ ] Feedback Toast · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Estados especiais (T3); lógica de chip (T2).

#### LEELA-S204-T2 · Function de vínculo de chip + registro de presença (RN-205/206/207)

- **Tipo:** api/function · **Depende de:** S203-T1 · **Bloqueia:** S204-T1, S204-T3 · **Estimativa:** M

**Objetivo**
Function que vincula `chipNumero` ao inscrito (input manual ou leitor USB), detecta conflito de chip já usado (RN-206) e registra presença ao entregar o kit (RN-205), respeitando `usaChip` (RN-207).

**Contexto & referências**
- RNs: RN-205, RN-206, RN-207.
- Modelo: `inscritos/{id}.chipNumero`, `status`.

**Arquivos (criar/editar)**
- `functions/src/eventos/vincularChip.ts`
- `functions/src/eventos/registrarEntrega.ts`
- `packages/core/src/eventos/entrega.ts` — regras puras (elegibilidade de passo, detecção de conflito).

**Passos de implementação**
1. `vincularChip(eventoId, inscritoId, chip)`: se `chip` já em outro inscrito → retorna conflito (não sobrescreve sem confirmação) (RN-206); com flag `sobrescrever=true` reatribui.
2. `registrarEntrega(eventoId, inscritoId)`: marca kit entregue + presença (RN-205); idempotente.
3. Se `usaChip=false`, ignora chip (RN-207).
4. Validação e autorização no servidor.

**Modelo de dados / contratos**
- `vincularChip(...) -> { ok } | { conflito: { inscritoAtual } }`
- `registrarEntrega(...) -> { ok }` (idempotente).

**Regras de negócio a respeitar**
- RN-205/206/207; escrita só via Function autorizada.

**Critérios de aceite (testáveis)**
- **Dado** chip livre, **quando** vinculo, **então** grava.
- **Dado** chip em outro atleta, **quando** vinculo sem flag, **então** retorna conflito; com flag, reatribui.
- **Dado** entrega já registrada, **quando** repito, **então** não duplica (idempotente).

**Testes a escrever**
- integração: emulator — vínculo, conflito, idempotência.
- unit: `core/entrega`.

**Definition of Done**
- [ ] Validação/autorização servidor · [ ] Idempotência · [ ] Conflito tratado (RN-206) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Hardware real de leitura (só contrato de input).

#### LEELA-S204-T3 · Galeria de estados do balcão (§2.9 / RN-208)

- **Tipo:** screen · **Depende de:** S204-T1, S204-T2 · **Estimativa:** M

**Objetivo**
Implementar os estados especiais do balcão como telas dedicadas indexadas por uma galeria — nunca empilhados (RN-208/§2.9): vazio, sem-kit, já atendido (completo), conflito de chip, fora da janela.

**Contexto & referências**
- Telas: `Entrega de Kit _galeria-estados.html` (índice), `Entrega-Estado-Vazio.html`, `Entrega-Estado-Completo.html`, `Entrega-Estado-Conflito.html`, `Entrega-Estado-ForaJanela.html` (+ estado sem-kit, pendência BH-204.2).
- RNs: RN-206 (conflito), RN-208 (§2.9).
- DS: EmptyState, ConfirmModal (§2.15 · conflito de chip), card crítico (border-left Vulcão).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/entrega/estados/page.tsx` — galeria/índice.
- `apps/painel/app/eventos/[slug]/entrega/_components/estados/{Vazio,SemKit,Completo,Conflito,ForaJanela}.tsx`

**Passos de implementação**
1. Índice de galeria listando cada estado como entrada navegável (§2.9).
2. Vazio: nenhum atleta identificado.
3. Sem-kit: passo de kit concluído, foco no chip/presença.
4. Completo (já atendido): bloqueia re-entrega, mostra dados do atendimento.
5. Conflito de chip: ConfirmModal de sobrescrita (§2.15 · preview perde/mantém).
6. Fora da janela (evento distante): aviso de que a entrega ainda não abriu.

**Modelo de dados / contratos**
- Reusa `core/entrega` e Function de chip (S204-T2). Sem novo modelo.

**Regras de negócio a respeitar**
- RN-208/§2.9 (galeria, nunca empilhar), RN-206, §2.15.

**Critérios de aceite (testáveis)**
- **Dado** os 5 estados, **quando** abro a galeria, **então** cada um é uma tela dedicada acessível pelo índice (não empilhados).
- **Dado** conflito de chip, **quando** ocorre, **então** ConfirmModal com preview de consequências.

**Testes a escrever**
- unit: render de cada estado.
- e2e: conflito → ConfirmModal → sobrescrever.

**Definition of Done**
- [ ] Estados em galeria (§2.9) · [ ] ConfirmModal §2.15 no conflito · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Impressão de etiqueta/dorsal.

---

### LEELA-S205 · Cadastro de kits e catálogo de itens · (de-para BH-205)

**Como** Organizador de Evento, **quero** configurar os kits do evento e o catálogo de itens, **para** oferecer opções por modalidade com patrocinadores vinculados.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Kits do Evento.html`, `Kits-Cadastro.html`, `Kits-Distribuicao.html`, `Kits-Estoque.html`, `Kits-Entrega.html`, `Kits-Modal-Item.html`
- **RNs:** RN-210, RN-211, RN-212, RN-213, RN-214, RN-215, RN-216

**Critérios de aceite (Given/When/Then):**
- **Dado** o cadastro de kits, **quando** abro, **então** vejo sub-nav interna de Kits (Cadastro, Distribuição, Estoque, Entrega), seção A com cards de kit (4, incluindo "Sem kit") e seção B com catálogo de itens.
- **Dado** um item, **quando** o vejo, **então** mostra "Usado em: [kits]" (RN-215) e badges de tipo (tamanhado/único — RN-212) e origem (organizador/patrocinador — RN-213).
- **Dado** um item patrocinado, **quando** o abro, **então** vejo o bloco da marca + toggle "Exibir logo ao atleta" (RN-214).
- **Dado** a tela, **quando** carrega, **então** o rodapé mostra 3 cards de resumo (custo, valor agregado, ativação de marcas).
- **Dado** toda a nomenclatura, **quando** leio, **então** aparece "kit" e nunca "tier" (RN-216).

**Tasks:** LEELA-S205-T1, LEELA-S205-T2, LEELA-S205-T3, LEELA-S205-T4

#### LEELA-S205-T1 · Modelo `kits` + `itensKit` + N:N Kit↔Item + Rules

- **Tipo:** data-model · **Depende de:** S200-T1 · **Bloqueia:** S205-T2/T3/T4, S206-T1 · **Estimativa:** M

**Objetivo**
Modelar `eventos/{id}/kits`, `itensKit` e a relação N:N Kit↔Item (array de refs no item + índice inverso desnormalizado "usado em"), com Rules.

**Contexto & referências**
- RNs: RN-210/211/212/213/214/215/216.
- Modelo: `eventos/{id}/kits/{kitId}`, `itensKit/{itemId}`.
- Mocks: kits Ouro/Prata/Básico/Sem kit; itens patrocinados — Olympikus (sacochila), Growth Supplements (whey), Centauro (viseira), Probiótica (gel).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/kit.ts` — `type Kit`, `type ItemKit`.
- `packages/api-client/src/eventos/kits.ts` — CRUD + índice inverso.
- `functions/src/eventos/itemKitIndex.ts` — mantém "usado em: [kits]" (RN-215).
- `functions/firestore.rules` — Rules de `kits`/`itensKit`.
- `functions/seed/kits.seed.ts`

**Passos de implementação**
1. `type Kit = { id; nome; preco; capacidade; modalidades[] }` (RN-210/211; `preco` aceita negativo).
2. `type ItemKit = { id; nome; tamanhado; origem; exibirLogo; kits: string[] }` (RN-212/213/214/215).
3. Function mantém índice inverso "usado em" ao alterar `item.kits`.
4. Rules por owner do evento.

**Modelo de dados / contratos**
- `kits[]` no item (array de refs) + desnormalização mantida por Function.

**Regras de negócio a respeitar**
- RN-210/211/212/213/214/215; nomenclatura "kit" (RN-216).

**Critérios de aceite (testáveis)**
- **Dado** um item em 2 kits, **quando** consulto, **então** "usado em" lista os 2 (RN-215).
- **Dado** um kit "Sem kit" com preço negativo, **quando** salvo, **então** persiste (RN-211).

**Testes a escrever**
- unit: tipos/derivações.
- integração: índice inverso idempotente; Rules.

**Definition of Done**
- [ ] N:N Kit↔Item com índice inverso · [ ] "Sem kit" válido/negativo · [ ] Rules · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI (T2/T3/T4) e edição em tela cheia (S206).

#### LEELA-S205-T2 · Tela Kits · Cadastro (sub-nav interna, cards de kit, catálogo, rodapé de resumo)

- **Tipo:** screen · **Depende de:** S205-T1, S202-T1 · **Estimativa:** L

**Objetivo**
Renderizar a tela de cadastro de kits: sub-nav interna, seção A (cards de kit incl. "Sem kit"), seção B (catálogo de itens com badges e "usado em"), rodapé com 3 cards de resumo.

**Contexto & referências**
- Telas: `Kits do Evento.html`, `Kits-Cadastro.html`.
- RNs: RN-210/211/212/213/215/216.
- Mocks: 4 kits; itens patrocinados canônicos.
- DS: SubNav interna, Cards flat, Badge (tipo/origem), Button, cards de resumo.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/kits/page.tsx` (Cadastro)
- `apps/painel/app/eventos/[slug]/kits/_components/{KitCard,ItemCard,ResumoKits}.tsx`

**Passos de implementação**
1. Sub-nav interna: Cadastro | Distribuição | Estoque | Entrega.
2. Seção A: cards de kit (4) com "Editar" → tela cheia (S206) e "+ Adicionar kit".
3. Seção B: catálogo de itens com badges de tipo/origem + "Usado em: [kits]".
4. Rodapé: 3 cards de resumo (custo, valor agregado, ativação de marcas).
5. Nomenclatura "kit" em toda a copy (RN-216).

**Modelo de dados / contratos**
- Lê `kits`/`itensKit` (S205-T1).

**Regras de negócio a respeitar**
- RN-210/211/212/213/215/216, §2.16.

**Critérios de aceite (testáveis)**
- **Dado** os 4 kits, **quando** abro, **então** vejo os cards (incl. "Sem kit") e o catálogo com "usado em".
- **Dado** um item, **quando** o vejo, **então** badges de tipo/origem corretos.

**Testes a escrever**
- unit: render de `KitCard`/`ItemCard`.

**Definition of Done**
- [ ] "kit" nunca "tier" (RN-216) · [ ] Cards flat §2.16 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Editar kit em tela cheia (S206); modal de item (T3).

#### LEELA-S205-T3 · Modal de item de kit (tamanhado, origem, patrocinador, toggle logo)

- **Tipo:** ui-component · **Depende de:** S205-T1, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Modal de criar/editar item do catálogo com tipo (tamanhado/único), origem (organizador/patrocinador), bloco da marca e toggle "Exibir logo ao atleta".

**Contexto & referências**
- Tela: `Kits-Modal-Item.html`.
- RNs: RN-212/213/214.
- Mocks: patrocinadores de kit (Olympikus, Growth, Centauro, Probiótica).
- DS: Modal (4 vias de fechamento), Toggle, Input, Badge.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/kits/_components/ItemKitModal.tsx`

**Passos de implementação**
1. Campos: nome, `tamanhado` (bool), `origem` (radio), bloco de marca quando patrocinador.
2. Toggle "Exibir logo ao atleta" só quando origem = patrocinador (RN-214).
3. 4 vias de fechamento (cancelar/X/overlay/Esc); salvar → Toast.

**Modelo de dados / contratos**
- Escreve `itensKit` (S205-T1).

**Regras de negócio a respeitar**
- RN-212/213/214; §2.15 não aplicável (não destrutivo).

**Critérios de aceite (testáveis)**
- **Dado** origem "patrocinador", **quando** abro, **então** aparece bloco da marca + toggle de logo.
- **Dado** origem "organizador", **quando** abro, **então** sem toggle de logo.

**Testes a escrever**
- unit: visibilidade condicional do toggle; fechamento 4 vias.

**Definition of Done**
- [ ] Toggle condicional (RN-214) · [ ] 4 vias de fechamento · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Upload real de logo.

#### LEELA-S205-T4 · Sub-telas Distribuição e Estoque de kits

- **Tipo:** screen · **Depende de:** S205-T1, S205-T2 · **Estimativa:** M

**Objetivo**
Renderizar as abas Distribuição (retiradas por modalidade/kit) e Estoque (saldo por item/kit) sob a sub-nav interna de Kits.

**Contexto & referências**
- Telas: `Kits-Distribuicao.html`, `Kits-Estoque.html`, `Kits-Entrega.html` (link para o balcão S204).
- RNs: RN-210/215.
- DS: Table densa (§2.5), Badge, Skeleton, barra de progresso.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/kits/distribuicao/page.tsx`
- `apps/painel/app/eventos/[slug]/kits/estoque/page.tsx`

**Passos de implementação**
1. Distribuição: progresso de retirada por kit/modalidade (usa presença de S204).
2. Estoque: saldo por item/kit; alerta quando abaixo do limite (card crítico border-left Vulcão).
3. Aba "Entrega" aponta para o balcão (S204).

**Modelo de dados / contratos**
- Lê `kits`/`itensKit`/`inscritos` (agregados de entrega).

**Regras de negócio a respeitar**
- §2.5, §2.12, §2.16.

**Critérios de aceite (testáveis)**
- **Dado** entregas registradas, **quando** abro Distribuição, **então** o progresso por kit reflete as retiradas.
- **Dado** item abaixo do limite, **quando** abro Estoque, **então** vejo alerta.

**Testes a escrever**
- unit: cálculo de progresso/saldo (em `core`).

**Definition of Done**
- [ ] Estados vazio/erro/carregando · [ ] Table densa §2.5 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Ajuste manual de estoque (fora desta fase).

---

### LEELA-S206 · Editar kit em tela cheia · (de-para BH-206)

**Como** Organizador de Evento, **quero** editar um kit numa tela cheia navegável (não modal), **para** ter espaço para configurar composição, preço, capacidade e modalidades.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Kits-Editar.html`
- **RNs:** RN-211, RN-216, RN-217, RN-200 (bloqueio de preço), §2.12

**Critérios de aceite (Given/When/Then):**
- **Dado** um kit, **quando** clico em "Editar" no card ou em "+ Adicionar kit", **então** abro a tela cheia (2 pontos de entrada — RN-217) com breadcrumb nível 4 (Eventos / [evento] / Kits / Cadastro / [Kit]).
- **Dado** a tela, **quando** edito, **então** configuro identidade (nome, descrição, cor/badge), modalidades (chips + select), preço (aceita negativo — RN-211), capacidade e checklist de itens.
- **Dado** que altero itens/modalidades, **quando** interajo, **então** chip fade-out, contador e save com Toast funcionam (§2.12).
- **Dado** um evento com venda, **quando** tento editar preço, **então** o campo está bloqueado (RN-200).
- **Dado** toda a nomenclatura, **quando** leio, **então** é "kit", nunca "tier" (RN-216).

**Tasks:** LEELA-S206-T1, LEELA-S206-T2

#### LEELA-S206-T1 · Tela cheia de edição de kit (2 pontos de entrada, composição, preço, capacidade)

- **Tipo:** screen · **Depende de:** S205-T1, S205-T2, S201-T3 (bloqueio de preço) · **Estimativa:** M

**Objetivo**
Substituir o antigo modal de "tier" por uma tela cheia de edição de kit, com breadcrumb nível 4, 2 pontos de entrada (RN-217), card de identidade, modalidades, preço, capacidade e checklist de itens.

**Contexto & referências**
- Tela: `Kits-Editar.html` (substitui `Kits-Modal-Tier.html` — decisão registrada BH-206).
- RNs: RN-211, RN-217, RN-200, RN-216, §2.12.
- DS: Breadcrumb (nível 4), Chip removível (fade-out), select, Input, checklist, Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/kits/editar/[kitId]/page.tsx`
- `apps/painel/app/eventos/[slug]/kits/novo/page.tsx` (2º ponto de entrada "+ Adicionar kit")
- `apps/painel/app/eventos/[slug]/kits/_components/KitEditor.tsx`

**Passos de implementação**
1. Breadcrumb nível 4.
2. Card de identidade (nome, descrição, cor/badge).
3. Modalidades como chips removíveis (fade-out) + select para adicionar.
4. Preço (decimal, aceita negativo — RN-211); bloqueado se houver venda (RN-200).
5. Capacidade + checklist de itens (marca itens do catálogo — reusa N:N de S205-T1).
6. Salvar → Toast; contador de itens ao vivo (§2.12).

**Modelo de dados / contratos**
- Lê/escreve `kits/{kitId}` e `itensKit.kits[]` (S205-T1).

**Regras de negócio a respeitar**
- RN-211 (preço negativo), RN-217 (2 entradas), RN-200 (bloqueio), RN-216 (nomenclatura).

**Critérios de aceite (testáveis)**
- **Dado** "+ Adicionar kit" e "Editar" no card, **quando** clico, **então** ambos abrem a tela cheia (RN-217).
- **Dado** um kit, **quando** removo uma modalidade, **então** chip faz fade-out e o contador atualiza.
- **Dado** evento com venda, **quando** edito preço, **então** bloqueado (RN-200).

**Testes a escrever**
- unit: bloqueio de preço; contador de itens.
- e2e: editar kit → salvar → Toast.

**Definition of Done**
- [ ] 2 pontos de entrada (RN-217) · [ ] Preço negativo (RN-211) · [ ] Bloqueio RN-200 · [ ] "kit" (RN-216) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Modal antigo `Kits-Modal-Tier` (removido).

#### LEELA-S206-T2 · Nomenclatura "kit" nunca "tier" em todo o produto (RN-216)

- **Tipo:** refactor · **Depende de:** E01 (glossário/i18n) · **Estimativa:** S

**Objetivo**
Garantir que o glossário/i18n e todas as telas de E03 usem "kit"; remover qualquer resíduo de "tier" e adicionar guarda (lint/teste) contra regressão.

**Contexto & referências**
- RNs: RN-216, RN-217 (contexto).
- Fonte de copy: `HANDOFF-07-glossario-copy.md`.

**Arquivos (criar/editar)**
- `packages/core/src/i18n/glossario.ts` — termos canônicos ("kit").
- `apps/painel/**` (E03) — substituir ocorrências de "tier".
- `leela-specs/governanca-design.md` — regra de nomenclatura (se ainda não coberta).

**Passos de implementação**
1. Definir termo canônico "kit" no glossário.
2. Varrer telas de E03 e remover "tier".
3. Adicionar teste/lint que falha se "tier" aparecer em copy do produto.

**Modelo de dados / contratos**
- Nenhum (apresentação/copy).

**Regras de negócio a respeitar**
- RN-216.

**Critérios de aceite (testáveis)**
- **Dado** qualquer tela de E03, **quando** leio a copy, **então** só aparece "kit".
- **Dado** um PR que introduz "tier", **quando** roda o lint/teste, **então** falha.

**Testes a escrever**
- unit/lint: guarda contra "tier" na copy do produto.

**Definition of Done**
- [ ] Zero "tier" em E03 · [ ] Guarda de regressão · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Migração de dados legados (não há em greenfield).

---

### LEELA-S207 · Financeiro do evento · (de-para BH-207)

**Como** Organizador de Evento, **quero** ver o financeiro do evento (receita bruta, líquida, taxas, repasses), **para** acompanhar o resultado e planejar saques.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro.html`
- **RNs:** — (leitura de agregados ∑; repasse referencia `programaAfiliacao`)

**Critérios de aceite (Given/When/Then):**
- **Dado** o financeiro, **quando** abro, **então** vejo receita bruta, taxa Leela e receita líquida.
- **Dado** a tela, **quando** carrega, **então** vejo breakdown por modalidade e por lote e inscrições por forma de pagamento.
- **Dado** repasses, **quando** existem, **então** vejo o status de repasse (afiliados/organizador).
- **Dado** os dados, **quando** clico em "Exportar", **então** baixo um CSV.

**Tasks:** LEELA-S207-T1, LEELA-S207-T2

#### LEELA-S207-T1 · Tela Financeiro do evento (bruto/taxa/líquido, breakdown, repasse, export CSV)

- **Tipo:** screen · **Depende de:** S202-T1, S207-T2 · **Estimativa:** M

**Objetivo**
Renderizar o financeiro do evento a partir de agregados: receita bruta, taxa, líquida, breakdown por modalidade e lote, inscrições por forma de pagamento, status de repasse e exportação CSV.

**Contexto & referências**
- Tela: `Financeiro.html`.
- Mocks: Meia Floripa — R$ 85.617 (bruto); comissão do clube afiliado 10% (`CORRIDAPERFEITA10`).
- DS: Cards flat, Table densa (§2.5), Badge de status de repasse, Button de export.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/financeiro/page.tsx`
- `apps/painel/app/eventos/[slug]/financeiro/_components/{ResumoFinanceiro,Breakdown,Repasses}.tsx`
- `packages/core/src/eventos/financeiro.ts` — derivações de exibição (líquido = bruto − taxa).

**Passos de implementação**
1. Ler agregados financeiros (S207-T2) — nunca recalcular receita no cliente.
2. Cards de resumo (bruto/taxa/líquido).
3. Breakdown por modalidade e por lote; inscrições por forma de pagamento.
4. Tabela de repasses com status (referencia `programaAfiliacao`).
5. Export CSV client-side dos dados exibidos.

**Modelo de dados / contratos**
- Lê `eventos.receitaConfirmada` + coleção de agregados financeiros (S207-T2).

**Regras de negócio a respeitar**
- Agregados por Function, nunca ad-hoc no cliente; §2.5, §2.12.

**Critérios de aceite (testáveis)**
- **Dado** o evento canônico, **quando** abro, **então** o bruto é R$ 85.617 e o líquido = bruto − taxa.
- **Dado** os dados, **quando** exporto, **então** baixo CSV com as linhas exibidas.

**Testes a escrever**
- unit: derivação de líquido/breakdown em `core`.
- e2e: abrir financeiro → exportar CSV.

**Definition of Done**
- [ ] Valores de agregado, não ad-hoc · [ ] Export CSV · [ ] Estados vazio/erro · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Split de pagamento real e saque (E04/PaymentProvider).

#### LEELA-S207-T2 · Agregado financeiro do evento por Function (receita/taxa/repasse)

- **Tipo:** api/function · **Depende de:** S203-T1 · **Bloqueia:** S207-T1 · **Estimativa:** M

**Objetivo**
Manter os agregados financeiros do evento (`receitaConfirmada`, taxa, breakdown por modalidade/lote/forma de pagamento, valores de repasse) via Cloud Function idempotente, disparada em confirmação de inscrição/pagamento.

**Contexto & referências**
- Modelo: `eventos/{id}.receitaConfirmada` + doc/coleção de agregados financeiros.
- Repasse referencia `eventos/{id}/programaAfiliacao` (termos definidos em E04).

**Arquivos (criar/editar)**
- `functions/src/eventos/agregarFinanceiro.ts` — onWrite de inscrito confirmado / webhook de pagamento.
- `functions/firestore.rules` — agregados financeiros só escrevíveis por Function.

**Passos de implementação**
1. Trigger onWrite de inscrito `confirmado` + webhook de pagamento (idempotente por id de evento de pagamento).
2. Recomputar/incrementar `receitaConfirmada`, breakdown e repasse.
3. Distributed counter onde a escrita for concorrente (pico de venda).
4. Rules bloqueiam escrita do cliente.

**Modelo de dados / contratos**
- `agregarFinanceiro(evento)` mantém agregados; idempotente (reprocessar não duplica).

**Regras de negócio a respeitar**
- Agregados só por Function; webhooks idempotentes/assinados.

**Critérios de aceite (testáveis)**
- **Dado** N confirmações, **quando** processam, **então** `receitaConfirmada` bate com a soma (sem duplicar em reprocesso).
- **Dado** um cliente, **quando** tenta escrever o agregado, **então** a Rule nega.

**Testes a escrever**
- integração: idempotência do agregado (emulator); Rules.

**Definition of Done**
- [ ] Idempotência · [ ] Rules bloqueiam cliente · [ ] Webhook idempotente/assinado · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Gateway/split concreto (ADR-006/E04).

---

### LEELA-S208 · Identificação e check-in por QR no balcão

**Como** operador de balcão, **quero** escanear o QR do ingresso para carregar o inscrito e registrar presença, **para** identificar o atleta e entregar o kit num fluxo único e rápido, sem buscar por nome ou dorsal.

- **MoSCoW:** Should (Must se o QR do app entrar na v1) · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Entrega-Atendimento.html` (caminho de scanner), galeria de estados de S204
- **RNs:** RN-221, RN-222, RN-205 (preservada), RN-206/RN-207 (reuso do fluxo de S204)

**Critérios de aceite (Given/When/Then):**
- **Dado** um inscrito com `qrToken` válido, **quando** escaneio o QR (câmera do painel ou leitor USB), **então** o inscrito é carregado no balcão e o mesmo fluxo de 3 passos de S204 roda (RN-221 — QR é token de identificação/presença, não status de check-in concorrente).
- **Dado** o fluxo padrão de balcão, **quando** retiro o kit, **então** a presença continua sendo registrada pela retirada (RN-205 preservada) e a Function `registrarEntrega` seta `kitEntregueEm` e `checkinEm` juntos.
- **Dado** um kit entregue antecipadamente (correios ou retirada dias antes), **quando** o atleta escaneia o QR na largada, **então** a Function `registrarCheckin` seta apenas `checkinEm`, sem reabrir a entrega do kit (RN-222).
- **Dado** um QR escaneado, **quando** o servidor valida a assinatura do `qrToken`, **então** uma assinatura inválida ou payload adulterado é rejeitado (validação server-side, nunca confiando no payload do cliente).
- **Dado** um QR de outro evento ou de inscrito já com `checkinEm != null`, **quando** escaneio, **então** vejo estado de erro/aviso ("QR inválido para este evento" / "Check-in já realizado") sem duplicar o registro.

**Tasks:** LEELA-S208-T1, LEELA-S208-T2, LEELA-S208-T3, LEELA-S208-T4

#### LEELA-S208-T1 · Campos `kitEntregueEm?` e `checkinEm?` em `inscritos` (dois carimbos)

- **Tipo:** data-model · **Depende de:** S203-T1 · **Bloqueia:** S208-T2, S208-T3 · **Estimativa:** S

**Objetivo**
Adicionar os carimbos `kitEntregueEm?` e `checkinEm?` ao tipo `Inscrito` e à subcoleção `inscritos`, substituindo a presença implícita em `status` por dois marcos temporais distintos (entrega de kit e presença), sem revogar RN-205.

**Contexto & referências**
- RNs: RN-205 (retirar = presença, preservada), RN-222 (presença ≠ retirada no caso antecipado).
- Modelo: `eventos/{eventoId}/inscritos/{inscritoId}`.
- Decisão de produto: `01-produto-gaps.md §1.2` — QR é token de identificação/presença; dois carimbos materializam o caso de kit antecipado.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/inscrito.ts` — adicionar `kitEntregueEm?: string | null` e `checkinEm?: string | null` ao `type Inscrito`; derivação pura `presente(inscrito): boolean` (= `checkinEm != null`).
- `functions/firestore.rules` — `kitEntregueEm`/`checkinEm` só escrevíveis por Function (nunca pelo cliente).
- `functions/seed/inscritos.seed.ts` — carimbos nulos por padrão no seed.

**Passos de implementação**
1. Estender `type Inscrito` com os dois campos opcionais (nulos até a entrega/check-in).
2. Manter `status` (RN-204) como estado da inscrição; presença/entrega passam a ser lidas dos carimbos, não inferidas de `status`.
3. Derivação pura `presente()` e `kitEntregue()` em `core`.
4. Rules bloqueiam escrita dos carimbos pelo cliente.

**Modelo de dados / contratos**
- `type Inscrito = { …; kitEntregueEm?: string | null; checkinEm?: string | null }`.

**Regras de negócio a respeitar**
- RN-205 (retirar = presença), RN-222 (dois carimbos), RN-204 (status intacto).

**Critérios de aceite (testáveis)**
- **Dado** um inscrito sem entrega, **quando** consulto, **então** ambos os carimbos são nulos e `presente()` é `false`.
- **Dado** um cliente tentando escrever `checkinEm`, **quando** persiste, **então** a Rule nega.

**Testes a escrever**
- unit: derivações `presente()`/`kitEntregue()` em `core`.
- integração: Rules (emulator) — escrita de carimbo negada ao cliente.

**Definition of Done**
- [ ] Carimbos no tipo + Rules · [ ] `status` preservado (RN-204) · [ ] RN-205 não revogada · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Geração do `qrToken` (nasce na confirmação — S1206/E12).

#### LEELA-S208-T2 · Estender `registrarEntrega` (S204-T2) para setar `kitEntregueEm` + `checkinEm`

- **Tipo:** api/function · **Depende de:** S204-T2, S208-T1 · **Estimativa:** S

**Objetivo**
Fazer a Function `registrarEntrega` (S204-T2) setar `kitEntregueEm` e `checkinEm` juntos no fluxo padrão de balcão, preservando RN-205 (retirar = presença) e a idempotência já existente.

**Contexto & referências**
- RNs: RN-205, RN-221.
- Modelo: `inscritos.{kitEntregueEm, checkinEm}` (S208-T1).
- Reuso: Function `registrarEntrega` de S204-T2 (idempotente).

**Arquivos (criar/editar)**
- `functions/src/eventos/registrarEntrega.ts` — passa a gravar os dois carimbos no mesmo write.
- `packages/core/src/eventos/entrega.ts` — ajustar regra pura de "entrega registrada" para refletir os carimbos.

**Passos de implementação**
1. No `registrarEntrega(eventoId, inscritoId)`, setar `kitEntregueEm = now` e `checkinEm = now` atomicamente (RN-205: retirar = presença).
2. Manter idempotência: reprocessar não sobrescreve carimbos já gravados.
3. Respeitar `usaChip` (RN-207) sem alteração do contrato de chip.

**Modelo de dados / contratos**
- `registrarEntrega(...) -> { ok }` (idempotente); grava `kitEntregueEm` + `checkinEm`.

**Regras de negócio a respeitar**
- RN-205 (retirar = presença), RN-221 (fluxo único), idempotência.

**Critérios de aceite (testáveis)**
- **Dado** um atendimento no balcão, **quando** retiro o kit, **então** `kitEntregueEm` e `checkinEm` ficam com o mesmo timestamp.
- **Dado** uma entrega já registrada, **quando** repito, **então** os carimbos não mudam (idempotente).

**Testes a escrever**
- integração: emulator — entrega seta ambos os carimbos; idempotência.

**Definition of Done**
- [ ] Dois carimbos no fluxo padrão · [ ] Idempotência preservada · [ ] RN-205 intacta · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Check-in isolado (T3).

#### LEELA-S208-T3 · Function `registrarCheckin` (só `checkinEm`) + validação da assinatura do `qrToken`

- **Tipo:** api/function · **Depende de:** S208-T1 · **Bloqueia:** S208-T4 · **Estimativa:** M

**Objetivo**
Function `registrarCheckin` que seta apenas `checkinEm` (caso de kit entregue antecipadamente — RN-222) e valida server-side a assinatura do `qrToken` antes de qualquer escrita, rejeitando QR de outro evento, adulterado ou já usado.

**Contexto & referências**
- RNs: RN-221, RN-222.
- Modelo: `inscritos.checkinEm`, `inscritos.qrToken` (opaco, emitido na confirmação — S1206).
- Segurança: `01-produto-gaps.md §1.2` e self-score security — validação da assinatura server-side, nunca confiar no payload do cliente.

**Arquivos (criar/editar)**
- `functions/src/eventos/registrarCheckin.ts` — valida assinatura do `qrToken`, resolve o inscrito, seta só `checkinEm`.
- `packages/core/src/eventos/qrToken.ts` — regras puras: verificação de assinatura/escopo (eventoId) e detecção de já-usado.

**Passos de implementação**
1. `registrarCheckin(eventoId, qrToken)`: verifica assinatura e escopo do token (pertence a este evento).
2. Assinatura inválida / payload adulterado / QR de outro evento → rejeita (erro tipado).
3. Inscrito com `checkinEm != null` → retorna "check-in já realizado" sem duplicar.
4. Caso válido: seta só `checkinEm` (não toca `kitEntregueEm` — RN-222); idempotente.

**Modelo de dados / contratos**
- `registrarCheckin(eventoId, qrToken) -> { ok, inscritoId } | { erro: 'qr_invalido' | 'evento_incorreto' | 'checkin_ja_realizado' }`.

**Regras de negócio a respeitar**
- RN-222 (só `checkinEm`), RN-221, validação server-side da assinatura.

**Critérios de aceite (testáveis)**
- **Dado** um `qrToken` válido deste evento, **quando** chamo `registrarCheckin`, **então** só `checkinEm` é gravado e `kitEntregueEm` permanece intacto.
- **Dado** um token adulterado ou de outro evento, **quando** chamo, **então** a Function rejeita.
- **Dado** um inscrito já com check-in, **quando** repito, **então** retorna "check-in já realizado" sem duplicar.

**Testes a escrever**
- unit: `core/qrToken` (assinatura, escopo, já-usado).
- integração: emulator — check-in válido, token inválido, idempotência.

**Definition of Done**
- [ ] Validação da assinatura server-side · [ ] Só `checkinEm` (RN-222) · [ ] Idempotência · [ ] Erros tipados sem PII no Sentry · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Esquema concreto de assinatura do `qrToken` (definido junto com a emissão do ingresso — S1206).

#### LEELA-S208-T4 · Caminho de scanner (câmera/leitor USB) no balcão + estados de erro

- **Tipo:** screen · **Depende de:** S204-T1, S208-T2, S208-T3 · **Estimativa:** M

**Objetivo**
Adicionar o scanner de QR como terceiro caminho de identificação no balcão (`Entrega-Atendimento.html`), ao lado da busca por nome e por dorsal, com estados de erro para QR inválido / de outro evento / check-in já realizado.

**Contexto & referências**
- Tela: `Entrega-Atendimento.html` (adicionar caminho de scanner), galeria de estados de S204 (T3).
- RNs: RN-221 (carrega inscrito e roda fluxo de 3 passos), RN-222, §2.9 (estados em galeria).
- DS: input de scanner (câmera/USB), EmptyState, card crítico (border-left Vulcão) para erro.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/entrega/_components/ScannerQR.tsx`
- `apps/painel/app/eventos/[slug]/entrega/_components/AtendimentoPanel.tsx` — integrar scanner como 3º caminho.
- `apps/painel/app/eventos/[slug]/entrega/_components/estados/QRInvalido.tsx` — estado dedicado (galeria §2.9).

**Passos de implementação**
1. Terceiro caminho de identificação: escanear (câmera do painel ou leitor USB) → chama `registrarCheckin`/carrega inscrito e dispara o fluxo de 3 passos de S204 (RN-221).
2. Sucesso: inscrito carregado no `AtendimentoPanel`, fluxo padrão roda (retirada seta os dois carimbos — S208-T2).
3. Erros como estados dedicados na galeria (§2.9): "QR inválido para este evento", "Check-in já realizado" — nunca empilhados.
4. Fallback para busca por nome/dorsal permanece disponível.

**Modelo de dados / contratos**
- Consome `registrarCheckin` (S208-T3) e `registrarEntrega` (S208-T2). Sem novo modelo.

**Regras de negócio a respeitar**
- RN-221, RN-222, §2.9 (galeria de estados), §2.12.

**Critérios de aceite (testáveis)**
- **Dado** um QR válido, **quando** escaneio, **então** o inscrito carrega e o fluxo de 3 passos roda.
- **Dado** um QR de outro evento, **quando** escaneio, **então** vejo o estado de erro dedicado (não empilhado).
- **Dado** um inscrito já com check-in, **quando** escaneio, **então** vejo "Check-in já realizado".

**Testes a escrever**
- unit: render dos estados de erro do scanner.
- e2e: escanear QR válido → carregar inscrito → fluxo de retirada.

**Definition of Done**
- [ ] Scanner como 3º caminho · [ ] Estados de erro em galeria (§2.9) · [ ] Fallback nome/dorsal preservado · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Hardware real de leitura de QR (só o contrato de input câmera/USB é coberto).

---

### LEELA-S209 · Persistência de tamanho por inscrito + coleta no checkout

**Como** Organizador de Evento, **quero** que o tamanho de cada item tamanhado do kit seja coletado no checkout e persistido por inscrito, **para** garantir 100% do kit certo na entrega e acabar com o kit errado por falha de coleta manual.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel (data-model + consumo em Distribuição; coleta em E12/E13)
- **Tela(s) de referência:** `Kits (39:921)` (coleta no app), etapa Modalidade/Kit do checkout (E12-S1203-T3), `WEB-APPV2 (1)/Kits-Distribuicao.html` (consumo)
- **RNs:** RN-223, RN-212 (reuso — item tamanhado)

**Critérios de aceite (Given/When/Then):**
- **Dado** um kit com item tamanhado (RN-212), **quando** o inscrito avança na etapa Modalidade/Kit do checkout, **então** o tamanho é obrigatório por item tamanhado e a inscrição não conclui sem ele (RN-223 — tamanho persistido por inscrito por item, map `itemId → tamanho`).
- **Dado** um kit sem item tamanhado, **quando** o inscrito avança, **então** nenhum tamanho é exigido.
- **Dado** um tamanho coletado, **quando** a inscrição é gravada, **então** `inscritos/{inscritoId}.tamanhos` recebe o map (ex.: `{ "camiseta-dry": "M" }`) e o dado persiste para consumo na distribuição.
- **Dado** a tela de distribuição (`Kits-Distribuicao.html`), **quando** o operador abre um inscrito, **então** vê o tamanho persistido por item (não um campo coletado e descartado).
- **Dado** um valor de tamanho fora dos `tamanhosDisponiveis` do item, **quando** o checkout valida, **então** a validação pura em `packages/core` rejeita e exibe erro.

**Tasks:** LEELA-S209-T1, LEELA-S209-T2, LEELA-S209-T3, LEELA-S209-T4

#### LEELA-S209-T1 · Campo `tamanhos: Record<itemId, string>` em `inscritos`

- **Tipo:** data-model · **Depende de:** S203-T1, S205-T1 · **Bloqueia:** S209-T2, S209-T4, S210-T3 · **Estimativa:** S

**Objetivo**
Adicionar o campo `tamanhos: Record<itemId, string>` ao tipo `Inscrito` e à subcoleção `inscritos`, persistindo o tamanho por item tamanhado (não um único "tamanho camiseta"), alinhado a RN-212 (múltiplos itens tamanhados por kit) e ao ADR-011 (tamanho é por inscrito, não herdado do responsável do pedido).

**Contexto & referências**
- RNs: RN-223, RN-212.
- Modelo: `eventos/{eventoId}/inscritos/{inscritoId}.tamanhos`.
- Decisão: `01-produto-gaps.md §3.2` — map `itemId → tamanho`, coletado no checkout.
- ADR-011: em pedido em grupo, cada inscrito carrega seus próprios tamanhos (não herdados do pagador).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/inscrito.ts` — adicionar `tamanhos: Record<string, string>` ao `type Inscrito`.
- `functions/firestore.rules` — `tamanhos` escrito no fluxo de inscrição (checkout), validado no servidor.
- `functions/seed/inscritos.seed.ts` — seed com tamanhos representativos para itens tamanhados.

**Passos de implementação**
1. Estender `type Inscrito` com `tamanhos: Record<itemId, string>` (chave = `itemId` do item tamanhado).
2. Seed dos 453 com distribuição de tamanhos (camiseta Dry) coerente.
3. Rules garantem que `tamanhos` só é gravado no fluxo de inscrição do próprio inscrito/pedido.

**Modelo de dados / contratos**
- `type Inscrito = { …; tamanhos: Record<string, string> }` (ex.: `{ "camiseta-dry": "M" }`).

**Regras de negócio a respeitar**
- RN-223 (persistência por inscrito por item), RN-212, ADR-011 (tamanho por inscrito).

**Critérios de aceite (testáveis)**
- **Dado** um inscrito com kit tamanhado, **quando** consulto, **então** `tamanhos` traz um valor por item tamanhado.
- **Dado** um pedido em grupo, **quando** consulto cada inscrito, **então** cada um tem seu próprio `tamanhos` (não herdado do responsável).

**Testes a escrever**
- unit: tipo/derivação em `core`.
- integração: Rules (emulator) — gravação de `tamanhos` no fluxo de inscrição.

**Definition of Done**
- [ ] Campo `tamanhos` no tipo + Rules · [ ] Por inscrito (ADR-011) · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Coleta no checkout (T3) e consumo na distribuição (T4).

#### LEELA-S209-T2 · Validação pura de tamanho obrigatório por item tamanhado (`packages/core`)

- **Tipo:** data-model · **Depende de:** S209-T1, S205-T1 · **Bloqueia:** S209-T3 · **Estimativa:** S

**Objetivo**
Validação pura em `packages/core` que exige tamanho para cada item tamanhado do kit escolhido e rejeita valores fora de `tamanhosDisponiveis` do item (RN-210/S210-T1), reutilizável no checkout web (E12) e mobile (E13).

**Contexto & referências**
- RNs: RN-223, RN-212.
- Modelo: `itensKit.tamanhado`, `itensKit.tamanhosDisponiveis[]` (S210-T1); `inscritos.tamanhos`.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/tamanhos.ts` — `validarTamanhos(kit, itens, tamanhos): ResultadoValidacao`.

**Passos de implementação**
1. Derivar itens tamanhados do kit escolhido (RN-212).
2. Exigir uma entrada em `tamanhos` para cada item tamanhado (RN-223).
3. Rejeitar valor fora de `tamanhosDisponiveis` do item; mensagem de erro por item.
4. Kit sem item tamanhado → validação passa vazia.

**Modelo de dados / contratos**
- `validarTamanhos(kit, itens, tamanhos) -> { ok: true } | { ok: false; erros: Record<itemId, string> }`.

**Regras de negócio a respeitar**
- RN-223 (obrigatório quando há item tamanhado), RN-212.

**Critérios de aceite (testáveis)**
- **Dado** um kit com item tamanhado sem tamanho informado, **quando** valido, **então** retorna erro por item.
- **Dado** um tamanho fora de `tamanhosDisponiveis`, **quando** valido, **então** rejeita.
- **Dado** um kit sem item tamanhado, **quando** valido, **então** passa.

**Testes a escrever**
- unit: `validarTamanhos` (obrigatório, fora da lista, kit sem tamanhado).

**Definition of Done**
- [ ] Validação pura reutilizável web+mobile · [ ] Erros por item · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI de coleta (T3).

#### LEELA-S209-T3 · Exigir tamanho no `ModalidadeKitStep` do checkout (web E12 + mobile E13)

- **Tipo:** integration · **Depende de:** S209-T2 · **Estimativa:** M

**Objetivo**
Integrar a validação de tamanho no passo Modalidade/Kit do checkout web (E12-S1203-T3) e no fluxo mobile (E13-S1306-T2), exigindo o tamanho por item tamanhado antes de concluir a inscrição, por inscrito do pedido (ADR-011).

**Contexto & referências**
- RNs: RN-223, RN-212.
- Telas: `ModalidadeKitStep` (E12-S1203-T3), etapa de kit no app (E13-S1306-T2), `Kits (39:921)`.
- ADR-011: em pedido em grupo, o passo coleta o tamanho de cada inscrito (novo participante), não só do responsável.

**Arquivos (criar/editar)**
- `apps/landing/**/ModalidadeKitStep.tsx` (E12) — campo de tamanho por item tamanhado + `validarTamanhos`.
- `apps/atleta/**/inscricao/KitStep.tsx` (E13) — mesmo campo/validação no fluxo mobile.

**Passos de implementação**
1. Renderizar seletor de tamanho por item tamanhado do kit escolhido (SELECIONE → obrigatório).
2. Chamar `validarTamanhos` (S209-T2) no avanço do passo; bloquear conclusão com erro inline.
3. Persistir `tamanhos` no inscrito ao gravar a inscrição (por inscrito no pedido — ADR-011).

**Modelo de dados / contratos**
- Escreve `inscritos.tamanhos` (S209-T1) via fluxo de inscrição.

**Regras de negócio a respeitar**
- RN-223, RN-212, ADR-011 (tamanho por inscrito).

**Critérios de aceite (testáveis)**
- **Dado** um kit tamanhado, **quando** avanço sem tamanho, **então** o passo bloqueia com erro inline.
- **Dado** tamanhos válidos, **quando** concluo, **então** `inscritos.tamanhos` persiste por inscrito.

**Testes a escrever**
- e2e (web): checkout com kit tamanhado → exige tamanho → persiste.
- e2e (mobile): inscrição no app → exige tamanho.

**Definition of Done**
- [ ] Tamanho obrigatório web+mobile · [ ] Persistência por inscrito (ADR-011) · [ ] Erro inline (§2.12) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Modelagem/estados de checkout já cobertos em E12/E13 (aqui só o campo de tamanho + validação).

#### LEELA-S209-T4 · Consumir e exibir `tamanhos` por item em `Kits-Distribuicao.html`

- **Tipo:** screen · **Depende de:** S209-T1, S205-T4 · **Estimativa:** S

**Objetivo**
Exibir o tamanho persistido por item na tela de Distribuição de kits, para o operador ver o tamanho certo por inscrito no momento da separação/entrega — fechando o loop "coleta → persistência → uso".

**Contexto & referências**
- Tela: `Kits-Distribuicao.html` (aba Distribuição, S205-T4).
- RNs: RN-223.
- Modelo: `inscritos.tamanhos` (S209-T1).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/kits/distribuicao/page.tsx` — coluna/detalhe de tamanho por item.
- `apps/painel/app/eventos/[slug]/kits/distribuicao/_components/TamanhoInscrito.tsx`

**Passos de implementação**
1. Ler `inscritos.tamanhos` na Distribuição.
2. Exibir o tamanho por item tamanhado no detalhe do inscrito (não um campo descartado).
3. Estado vazio quando o item não é tamanhado.

**Modelo de dados / contratos**
- Lê `inscritos.tamanhos` (S209-T1). Sem escrita.

**Regras de negócio a respeitar**
- RN-223, §2.5, §2.12.

**Critérios de aceite (testáveis)**
- **Dado** um inscrito com tamanho coletado, **quando** abro na Distribuição, **então** vejo o tamanho por item.
- **Dado** um item não tamanhado, **quando** listo, **então** não há campo de tamanho.

**Testes a escrever**
- unit: render do tamanho por item na Distribuição.

**Definition of Done**
- [ ] Tamanho persistido exibido (não descartado) · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Ajuste manual de estoque (fora desta fase).

---

### LEELA-S210 · Aprovisionamento de kit (encomenda → estoque) + "a encomendar por SKU"

**Como** Organizador de Evento, **quero** ver quanto encomendar por SKU e acompanhar o estado de aprovisionamento (encomenda → estoque), **para** resolver a logística de kit sem chutar a quantidade a comprar por item e tamanho.

- **MoSCoW:** Should (Must se a v1 vender sob encomenda) · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Kits-Estoque.html` (nova coluna/estado), `WEB-APPV2 (1)/Kits-Distribuicao.html`
- **RNs:** RN-224, RN-225, RN-226; depende de RN-223 (S209) — dependência dura

**Critérios de aceite (Given/When/Then):**
- **Dado** um item/kit, **quando** o configuro, **então** escolho seu modelo de estoque `sob_encomenda` (vende sem estimativa, encomenda pelo vendido) ou `estoque_proprio` (saldo físico) (RN-225).
- **Dado** inscritos confirmados que exigem (item, tamanho), **quando** a Function agrega, **então** "a encomendar por SKU" = Σ inscritos confirmados que exigem (item, tamanho) − estoque físico do SKU (RN-224), calculado no `onWrite` de inscrito confirmado, nunca varrido no cliente.
- **Dado** um SKU (item + tamanho), **quando** avanço o aprovisionamento, **então** a máquina de estados vai `estimativa → encomendado → em_estoque` e cada transição registra quantidade e data (RN-226).
- **Dado** a tela `Kits-Estoque.html`, **quando** abro, **então** vejo por SKU o estado, quantidade vendida, estoque físico e "a encomendar".
- **Dado** que o tamanho por inscrito ainda não é persistido (S209), **quando** tento calcular "a encomendar por SKU", **então** a dependência dura é declarada e o cálculo depende de S209.

**Tasks:** LEELA-S210-T1, LEELA-S210-T2, LEELA-S210-T3, LEELA-S210-T4

#### LEELA-S210-T1 · Campos `modeloEstoque` e `tamanhosDisponiveis[]` em `itensKit`

- **Tipo:** data-model · **Depende de:** S205-T1 · **Bloqueia:** S209-T2, S210-T2, S210-T3 · **Estimativa:** S

**Objetivo**
Adicionar `modeloEstoque` (`sob_encomenda` | `estoque_proprio`) e `tamanhosDisponiveis[]` ao tipo `ItemKit` e à coleção `itensKit`, base para a máquina de estados de aprovisionamento e para a validação de tamanho (S209-T2).

**Contexto & referências**
- RNs: RN-225 (modelo de estoque), RN-223 (valores de tamanho válidos).
- Modelo: `itensKit/{itemId}`.
- Decisão: `01-produto-gaps.md §3.2` — modelo de estoque por item; ajuste manual de saldo continua fora.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/kit.ts` — adicionar `modeloEstoque: ModeloEstoque` e `tamanhosDisponiveis: string[]` ao `type ItemKit`; `type ModeloEstoque = 'sob_encomenda' | 'estoque_proprio'`.
- `functions/firestore.rules` — campos escrevíveis pelo owner do evento.
- `functions/seed/kits.seed.ts` — seed dos itens com modelo de estoque e tamanhos.

**Passos de implementação**
1. Estender `type ItemKit` com `modeloEstoque` e `tamanhosDisponiveis[]`.
2. Item tamanhado (RN-212) carrega `tamanhosDisponiveis` (ex.: `["P","M","G","GG"]`).
3. Seed com itens `sob_encomenda` (camiseta Dry) e `estoque_proprio` conforme mocks.

**Modelo de dados / contratos**
- `type ItemKit = { …; modeloEstoque: 'sob_encomenda' | 'estoque_proprio'; tamanhosDisponiveis: string[] }`.

**Regras de negócio a respeitar**
- RN-225, RN-223, RN-212.

**Critérios de aceite (testáveis)**
- **Dado** um item tamanhado, **quando** consulto, **então** `tamanhosDisponiveis` traz os valores válidos.
- **Dado** um item, **quando** consulto, **então** `modeloEstoque` é `sob_encomenda` ou `estoque_proprio`.

**Testes a escrever**
- unit: tipo/derivação em `core`.
- integração: Rules (owner escreve; não-owner negado).

**Definition of Done**
- [ ] Campos no tipo + Rules · [ ] Seed coerente · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Cálculo de "a encomendar" (T3) e UI (T4).

#### LEELA-S210-T2 · Subcoleção `aprovisionamento/{sku}` + Rules

- **Tipo:** data-model · **Depende de:** S210-T1 · **Bloqueia:** S210-T3, S210-T4 · **Estimativa:** M

**Objetivo**
Modelar a subcoleção `eventos/{id}/aprovisionamento/{sku}` (docId = `itemId__tamanho`) com estado, quantidades e histórico de transições, e Rules que só permitem escrita de agregados/estado por Function.

**Contexto & referências**
- RNs: RN-224, RN-226.
- Modelo: `eventos/{eventoId}/aprovisionamento/{sku}`.
- SKU = item + tamanho (docId `itemId__tamanho`).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/aprovisionamento.ts` — `type Aprovisionamento`, `type EstadoAprovisionamento`, chave de SKU (`skuId(itemId, tamanho)`).
- `packages/api-client/src/eventos/aprovisionamento.ts` — query por evento.
- `functions/firestore.rules` — `estado`/agregados só escrevíveis por Function; leitura pelo owner.

**Passos de implementação**
1. `type Aprovisionamento = { sku; itemId; tamanho; estado; qtdVendida; estoqueFisico; aEncomendar; historico[] }`.
2. `EstadoAprovisionamento = 'estimativa' | 'encomendado' | 'em_estoque'` (RN-226).
3. `skuId(itemId, tamanho)` gera o docId `itemId__tamanho`.
4. Rules: `qtdVendida`/`aEncomendar`/`estado` só por Function; owner lê.

**Modelo de dados / contratos**
- `aprovisionamento/{itemId__tamanho}` — campos acima; `historico[]` = `{ estado, qtd, em }`.

**Regras de negócio a respeitar**
- RN-224 (agregados por Function), RN-226 (estados), agregados ∑ nunca do cliente.

**Critérios de aceite (testáveis)**
- **Dado** um SKU, **quando** consulto, **então** recebo estado + quantidades + histórico.
- **Dado** um cliente tentando escrever `aEncomendar`, **quando** persiste, **então** a Rule nega.

**Testes a escrever**
- unit: `skuId`, tipos/derivações.
- integração: Rules (escrita de agregado negada ao cliente).

**Definition of Done**
- [ ] Subcoleção + docId por SKU · [ ] Rules por Function · [ ] Testes verdes · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Function de agregação/transição (T3).

#### LEELA-S210-T3 · Function de agregação Σ (onWrite de inscrito confirmado) + máquina de estados

- **Tipo:** api/function · **Depende de:** S210-T1, S210-T2, S209-T1 · **Bloqueia:** S210-T4 · **Estimativa:** M

**Objetivo**
Cloud Function idempotente que, no `onWrite` de inscrito confirmado, recomputa `qtdVendida` e `aEncomendar` por SKU (RN-224) e expõe as transições da máquina de estados `estimativa → encomendado → em_estoque` registrando quantidade e data (RN-226). Dependência dura de S209 (tamanho por inscrito).

**Contexto & referências**
- RNs: RN-224, RN-226; depende de RN-223 (S209) — o cálculo por SKU exige o tamanho persistido.
- Modelo: `aprovisionamento/{sku}` (S210-T2); lê `inscritos.tamanhos` (S209-T1) e `inscritos.status` (confirmado).
- Decisão: `01-produto-gaps.md §3.2` — agregado por Function, nunca varrido no cliente; dependência dura declarada.

**Arquivos (criar/editar)**
- `functions/src/eventos/agregarAprovisionamento.ts` — onWrite de inscrito confirmado; recomputa Σ por SKU.
- `functions/src/eventos/transicaoAprovisionamento.ts` — callable de transição de estado (registra qtd + data).
- `packages/core/src/eventos/aprovisionamento.ts` — regras puras de transição válida e de `aEncomendar = qtdVendida − estoqueFisico`.

**Passos de implementação**
1. onWrite de inscrito `confirmado`: para cada (item tamanhado, tamanho) do kit, incrementa `qtdVendida` do SKU e recomputa `aEncomendar = max(0, qtdVendida − estoqueFisico)` (RN-224). Idempotente por inscrito.
2. `transicaoAprovisionamento(sku, novoEstado, qtd)`: valida transição `estimativa → encomendado → em_estoque` (RN-226), grava `historico[]` com quantidade e data.
3. Distributed counter onde a escrita for concorrente (pico de venda).
4. Rules bloqueiam escrita do cliente.

**Modelo de dados / contratos**
- `agregarAprovisionamento(evento)` mantém `qtdVendida`/`aEncomendar` por SKU (idempotente).
- `transicaoAprovisionamento(sku, novoEstado, qtd) -> { ok } | { erro: 'transicao_invalida' }`.

**Regras de negócio a respeitar**
- RN-224 (Σ por Function), RN-226 (máquina de estados), dependência dura de RN-223 (S209).

**Critérios de aceite (testáveis)**
- **Dado** N inscritos confirmados de um SKU, **quando** processam, **então** `qtdVendida` bate com a soma e `aEncomendar = qtdVendida − estoqueFisico` (sem duplicar em reprocesso).
- **Dado** uma transição inválida (ex.: `estimativa → em_estoque`), **quando** chamo, **então** a Function rejeita.
- **Dado** uma transição válida, **quando** avanço, **então** `historico[]` registra quantidade e data.

**Testes a escrever**
- unit: `core/aprovisionamento` (transição válida, `aEncomendar`).
- integração: emulator — Σ idempotente por SKU; transições; Rules.

**Definition of Done**
- [ ] Σ por Function idempotente (RN-224) · [ ] Máquina de estados (RN-226) · [ ] Dependência de S209 respeitada · [ ] Rules bloqueiam cliente · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Ajuste manual de estoque físico (fora desta fase); UI (T4).

#### LEELA-S210-T4 · Coluna/estado de aprovisionamento e "a encomendar por SKU" em `Kits-Estoque.html`

- **Tipo:** screen · **Depende de:** S210-T2, S210-T3, S205-T4 · **Estimativa:** M

**Objetivo**
Estender a aba Estoque (`Kits-Estoque.html`, S205-T4) com a visão por SKU: estado de aprovisionamento, quantidade vendida, estoque físico e "a encomendar", além do controle de transição de estado.

**Contexto & referências**
- Telas: `Kits-Estoque.html` (nova coluna/estado), `Kits-Distribuicao.html`.
- RNs: RN-224, RN-225, RN-226.
- DS: Table densa (§2.5), Badge de estado, card crítico (border-left Vulcão) quando "a encomendar" > 0.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/kits/estoque/page.tsx` — coluna por SKU (estado, vendida, físico, a encomendar).
- `apps/painel/app/eventos/[slug]/kits/estoque/_components/AprovisionamentoSKU.tsx` — badge de estado + ação de transição.

**Passos de implementação**
1. Ler `aprovisionamento` por SKU (S210-T2) e exibir estado, `qtdVendida`, `estoqueFisico`, `aEncomendar`.
2. Badge de estado (`estimativa`/`encomendado`/`em_estoque`) e ação de avanço via `transicaoAprovisionamento` (S210-T3).
3. Alerta (card crítico) quando `aEncomendar > 0`.
4. Item `estoque_proprio` × `sob_encomenda` renderizados conforme `modeloEstoque` (RN-225).

**Modelo de dados / contratos**
- Lê `aprovisionamento`/`itensKit` (S210-T1/T2); escreve transição via Function (S210-T3).

**Regras de negócio a respeitar**
- RN-224/225/226, §2.5, §2.12, §2.16.

**Critérios de aceite (testáveis)**
- **Dado** SKUs com venda, **quando** abro Estoque, **então** vejo por SKU estado, vendida, físico e "a encomendar".
- **Dado** um SKU em `estimativa`, **quando** avanço, **então** o estado muda para `encomendado` e o histórico registra.
- **Dado** `aEncomendar > 0`, **quando** listo, **então** vejo o alerta.

**Testes a escrever**
- unit: render por estado; cálculo de exibição de "a encomendar".
- e2e: avançar estado de um SKU.

**Definition of Done**
- [ ] Visão por SKU (estado/vendida/físico/a encomendar) · [ ] Transição via Function · [ ] Table densa §2.5 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Ajuste manual de saldo físico (fora desta fase).

---

## Rastreabilidade (de-para BH-###)

| Story | De-para | Tela(s) de referência | Pendência herdada |
|---|---|---|---|
| LEELA-S200 | BH-200 | Meus Eventos.html | — |
| LEELA-S201 | BH-201 | Novo Evento.html | — |
| LEELA-S202 | BH-202 | Overview do Evento.html, Detalhe do Evento.html | — |
| LEELA-S203 | BH-203 | Inscritos do Evento.html | — |
| LEELA-S204 | BH-204 | Entrega de Kit.html, Entrega-Atendimento.html, galeria + estados | ✅ resolve balcão + estados (BH-204.2/204.3) |
| LEELA-S205 | BH-205 | Kits do Evento/Cadastro/Distribuicao/Estoque/Entrega/Modal-Item.html | — |
| LEELA-S206 | BH-206 | Kits-Editar.html | ✅ resolve editar em tela cheia + tier→kit |
| LEELA-S207 | BH-207 | Financeiro.html | ✅ resolve financeiro do evento |
| LEELA-S208 | — (gap) | Entrega-Atendimento.html + galeria de estados S204 | ➕ check-in por QR no balcão (RN-221/222) |
| LEELA-S209 | — (gap) | Kits (39:921), ModalidadeKitStep (E12), Kits-Distribuicao.html | ➕ tamanho por inscrito persistido (RN-223) |
| LEELA-S210 | — (gap) | Kits-Estoque.html, Kits-Distribuicao.html | ➕ aprovisionamento encomenda→estoque (RN-224/225/226) |

## Ordem sugerida

`S200-T1 → S200-T2` (dados + hub) → `S201` (criar/publicar) → `S202-T1` (layout/shell do evento, desbloqueia o resto) → `S203` (inscritos) → `S205` (kits) → `S204` (balcão, depende de inscritos+kits) → `S206` (editar kit) → `S207` (financeiro). Ao fim, o épico é demonstrável ponta a ponta com os mocks de HANDOFF-05.

Stories de lacuna (gap) encaixam após o núcleo: `S209` (tamanho por inscrito · Must; carimba `inscritos.tamanhos`, base do aprovisionamento) → `S210` (aprovisionamento por SKU · depende dura de S209) → `S208` (check-in por QR no balcão · estende S204-T2 e a galeria de estados). `S208` também depende do `qrToken` emitido na confirmação (S1206/E12).

## Regras de negócio novas (Vitor 2026-07-13 — cadastro de evento enriquecido)

- **RN-153 (proposta) · Cadastro de evento completo (S201 revisão):** o form de Novo Evento coleta o que a página pública mobile (wireframe Figma `112-4622`, tela "Corrida do Campeche") precisa: **capa (foto)**, nome, data + horário, endereço/local completo, descrição/informações, **regulamento**, e **lista de modalidades estruturada** (nome/distância — vocabulário fechado + entrada livre). **Lotes NÃO entram no cadastro inicial** (configurados depois, na aba Lotes do painel — decisão reafirmada 2026-07-13). Layout do form: **informações centralizadas** (coluna central, não full-width).
  - *Status 2026-07-13 (EVENTO-CAMPOS, backend):* **persistência ENTREGUE** — `imagemUrl` (URL http(s) validada por `isUrlCapaValida`, teto 2048) e `regulamento` (texto, teto 50k) no model `Evento` + `criarEvento` + edição (`atualizarConfiguracoesEvento`) + Rules; a landing consome a capa no hero (fallback gradiente mantido; leitor filtra esquema fora de http(s)). Versionamento do regulamento (RN-149, `regulamentoVersao` + novo aceite) segue no S306/Onda 3 — hoje persiste SÓ o texto. Upload de arquivo segue lacuna (campo é URL).
- **RN-347 no cadastro:** o toggle **taxa incorporada vs. repassada** aparece já no cadastro do evento (default do tenant; editável depois em Configurações).
  - *Status 2026-07-13 (EVENTO-CAMPOS, backend):* **campo `taxaModo` POR EVENTO ENTREGUE** — estampado no `criarEvento` (input explícito > `commercialTerms.modoTaxaDefault` > 'incorporada'), editável em Configurações até a 1ª venda (Rules CONGELAM depois — trocar quem paga com venda feita mexe em dinheiro). E09 já lê o modo (agregado `financeiro/current` + janela D+N do saldo). O toggle da UI `/eventos/novo` (desabilitado honesto) PODE ser ativado pelo painel. **Fio do checkout: ✅ FECHADO em 2026-07-13 (RN347-CHECKOUT)** — comprador paga face + taxa quando `repassada` (cotação/charge/estorno + linha "Taxa de serviço" na landing, sem vazar `platformFeePct`); detalhes e decisão do estorno em E12 §RN-347.

## Regras de negócio novas (R9 · revisão UX do Vitor 2026-07-18)

- **RN-227 · Kit tem imagem quadrada 1:1.** `Kit.imagemUrl?` opcional (`packages/core/src/eventos/kit.ts` — hoje sem campo de imagem), 1:1, ≤5MB, allowlist ADR-016 (SVG banido). Exibida na dobra de kits da landing (`KitsSection.tsx`) e na gestão de eventos (`KitEditor`/`KitsCadastroView`); ausência = placeholder do DS. Storage `eventos/{eventoId}/kits/{kitId}` (regra com `firestore.get` do tenant, padrão clube). Story `S-R9-08`.
- **RN-228 · Capa do evento editável/persistida na página de vendas (thumb horizontal).** `Evento.imagemUrl` (já no modelo, 16/10, já persistido por `atualizarConfiguracoesEvento`) ganha edição real na página de vendas — hoje o `EventoForm` coleta e descarta. Thumb horizontal, proporção default **16/10** (a já estabelecida no card+hero; pesquisa web da dimensão da cheers pendente — `benchmark-cheers.md` sem evidência de pixel/aspect). Sem capa = gradiente (RN-166). Story `S-R9-09`. Spec: `ux-review-2026-07-18/`.
