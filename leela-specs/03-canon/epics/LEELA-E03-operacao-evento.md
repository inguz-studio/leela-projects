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

> **Atualização 2026-07-18 (LP-VENDAS-KIT · `1134da4`):** kit ganhou **visão de compra editável** no `KitEditor` — descrição (≤280), "o que está incluso" (itens[], ≤30) e **imagem 1:1 upload-only** (`uploadImagemKit`, path `eventos/{id}/kits/{kitId}`; padrão R5 do DS, sem URL colada). Reflete no checkout (`KitDetalhe` já consumia `imagemUrl` real). RN-227/RN-230. Fecha a pendência R9-C/gap-R13.

> **Atualização 2026-07-19 (KIT-IMG-LANDING · `[LEELA-KITIMG-T3]`):** definido o **default de PRODUÇÃO do kit sem imagem anexada**: quando o organizador **não** subiu a imagem 1:1 (RN-230), a superfície pública (LP + checkout) usa o **placeholder padrão Leela** — asset estático brandado (`apps/landing/public/covers/kits/leela-kit-placeholder.svg`: wordmark verde-limão do header sobre fundo brasa, **não** foto). Foto mock temática só aparece no **preview** (Emulator); em produção real o placeholder é o piso. Isso reforça o incentivo do `KitEditor` a subir a imagem real (o upload sempre vence o placeholder).

O valor entregue é operar a Meia Maratona Floripa 2026 (453 inscritos, R$ 85.617) da criação da página até a retirada do kit no balcão, sem planilha e sem suporte técnico. Este épico materializa em código (Next.js + Firestore) o protótipo parcial de EP-02a e fecha as três pendências herdadas: balcão de entrega com estados (BH-204), edição de kit em tela cheia (BH-206) e financeiro do evento (BH-207).

## Personas & JTBD

- **Primária — Organizador de Evento (Marina Castelo · Castelo Produções).** JTBD: "Ter minha página no ar em menos de 15 minutos", "Visibilidade do funil em tempo real", "Kit certo na entrega, zero erro de tamanho", "Acompanhar o resultado financeiro e planejar saques".
- **Secundária — Operador de balcão.** JTBD: "Identificar o atleta, entregar o kit e vincular o chip num fluxo único e rápido no dia do evento".
- **Secundária — Admin Leela.** JTBD: suporte operacional e supervisão.

## Critérios de sucesso do épico

- Organizador cria e publica um evento gerando URL pública + QR (RN-201) em uma sessão.
- Lista de 453 inscritos navegável com paginação obrigatória, busca e filtros, sem travar (RN-202/203/204).
- Balcão entrega kit + vincula chip + registra presença num fluxo único; conflito de chip e evento fora da janela tratados como estados dedicados (RN-205/206/207/208).
- Kits configuráveis (0..N), com item reutilizado em múltiplos kits e "Sem kit" como kit válido de preço zero ou positivo (RN-210…217, com a RN-211 revogada pela RN-506 em 05/08 — kit não tem preço negativo).
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
- ~~**RN-211** — "Sem kit" é kit válido e aceita preço negativo (desconto).~~ **⛔ REVOGADA em 2026-08-05 por decisão do dono (D-0805-7 · lane SPEC-SEM-KIT).** Verbatim: *"isso é um problema, pois nao existe essa opção de 'dar desconto sem o kit' pois é interessante para os organizadores e patrocinadores que os participantes tenham os kits com os brindes deles."* A primeira metade do enunciado sobrevive dentro da **RN-506**, que a substitui: um kit chamado "Sem kit" continua sendo kit válido; o que morre é o **preço abaixo de zero**. O texto original fica legível de propósito, porque `kitEhDesconto` e o ramo negativo de `labelDeltaKit` continuam no código enquanto houver documento legado. Registro completo em `02-rodadas/2026-08-05-sem-kit/01-decisoes-dono.md`.
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
- **Dado** um kit "Sem kit" com preço **zero**, **quando** salvo, **então** persiste (RN-506; substitui o aceite de preço negativo da RN-211, revogada em 05/08). **Dado** o mesmo kit com preço negativo, **quando** salvo, **então** a Rule recusa.

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
- **Dado** a tela, **quando** edito, **então** configuro identidade (nome, descrição, cor/badge), modalidades (chips + select), preço (**piso zero** — RN-506; a RN-211, que aceitava negativo, foi revogada em 05/08), capacidade e checklist de itens.
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
4. Preço (decimal, **≥ 0** — RN-506, que revogou a RN-211); bloqueado se houver venda (RN-200).
5. Capacidade + checklist de itens (marca itens do catálogo — reusa N:N de S205-T1).
6. Salvar → Toast; contador de itens ao vivo (§2.12).

**Modelo de dados / contratos**
- Lê/escreve `kits/{kitId}` e `itensKit.kits[]` (S205-T1).

**Regras de negócio a respeitar**
- RN-506 (piso zero no preço; revoga a RN-211), RN-217 (2 entradas), RN-200 (bloqueio), RN-216 (nomenclatura).

**Critérios de aceite (testáveis)**
- **Dado** "+ Adicionar kit" e "Editar" no card, **quando** clico, **então** ambos abrem a tela cheia (RN-217).
- **Dado** um kit, **quando** removo uma modalidade, **então** chip faz fade-out e o contador atualiza.
- **Dado** evento com venda, **quando** edito preço, **então** bloqueado (RN-200).

**Testes a escrever**
- unit: bloqueio de preço; contador de itens.
- e2e: editar kit → salvar → Toast.

**Definition of Done**
- [ ] 2 pontos de entrada (RN-217) · [ ] Preço com piso zero (RN-506) · [ ] Bloqueio RN-200 · [ ] "kit" (RN-216) · [ ] (ver `definition-of-done.md`)

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
  **✅ Backend construído (lote R9-C · trace leela-build-2d6ee98d · 2026-07-18):** modelo `Kit.imagemUrl?` + `isUrlImagemKitValida` + `parseKit` (`20f1e80`, 24/24 unit) · Rules de shape (`dab8238`, 40/40 emulator) · Storage path RN-227 + `uploadImagemKit` 1:1 no api-client (`79c4535`, 41/41) · leitura pública do checkout com fallback (`62bd7ba`).
  **✅ FECHADA ponta a ponta:** upload no `KitEditor` (LP-VENDAS-KIT `1134da4`) · exibição pública na LP e no checkout com placeholder padrão Leela (KIT-IMG-LANDING) · **exibição na `KitsCadastroView`, a última metade, em THUMBS-LISTAS `dbda6cd` (RN-236)** — era o pedaço que a RN sempre previu e que fazia o organizador abrir kit por kit para saber qual era qual.
- **RN-230 · Visão de compra do kit no checkout** (gap R13; nasceu no código como "RN-229", renumerada — RN-229 é das divisórias terciárias/E01). `Kit.descricao?` (≤280) + `Kit.itens[]` ("o que está incluso", ≤30×≤140), opcionais e decorativos: normalização Postel no parse (doc envenenado nunca derruba o checkout público); ausentes ⇒ fallback mock rico na UI (nunca vazio). Seed do preview deriva `itens[]` do catálogo canônico de `itensKit` (uma fonte só; marca no rótulo quando `exibirLogo` — RN-214); imagem NÃO é semeada (mock rico app-side — lição R14). Story `S-R9-08`.
  **✅ Backend+seed construídos (R9-C):** core+Rules+api-client (commits acima) · seed canônico+preview `0ec9181` (idempotente, aditivo, parseKit 20/20 no :8180). **Pendente:** edição de descricao/itens no `KitEditor` — lane UI.
- **RN-228 · Capa/banner horizontal do evento editável/persistida na página de vendas.** `Evento.imagemUrl` (já no modelo, já persistido por `atualizarConfiguracoesEvento`) ganha edição real na página de vendas — hoje o `EventoForm` coleta e descarta. **Spec RATIFICADA (Vitor 2026-07-18, adendo 6 — fonte: spec da Cheers): 1600×838 px, proporção 1.9:1, arquivo ≤2MB, formatos JPEG/GIF/PNG.** Validação de upload app-level (≤2MB + formato); compatível com a allowlist R5 (`image/(jpeg|png|webp|gif|avif)` — JPEG/PNG/GIF já cobertos, sem mudança de Rules; cap 2MB mais estrito que os 5MB das Rules). Ajustar `aspect-[16/10]`→1.9:1 no `HeroSection`/`EventoForm`. Sem capa = gradiente (RN-166). Story `S-R9-09`. Spec: `02-rodadas/2026-07-18-ux-review/`.

## Regras de negócio novas (TAMANHOS-GRADE · Vitor 2026-07-19)

Pedido verbatim do Vitor: (1) "separar forma masculina e feminina e DEPOIS a pessoa seleciona o tamanho — nessa ordem é a melhor forma de escolherem" (RATIFICADO: corte → tamanho no checkout); (2) "tem que ser configurado pelo organizador, e ele coloca os tamanhos disponíveis, para ENCOMENDA e depois para ESTOQUE; ele precisa entender e controlar isso: quando encerrar encomendas, e depois ajustar o estoque de produtos (camisas) ou itens que demandem tamanho, para ir acompanhando as ENTREGAS no credenciamento." Default do maestro aplicado: corte **unissex permitido** (grade única) — separar por corte nunca é obrigatório.

- **RN-231 · Grade corte→tamanho no item tamanhado.** `itensKit.grade[] = [{corte: feminina|masculina|unissex, tamanhos[]}]` — estende RN-223, não cria paralelo. Retrocompat Postel de LEITURA: doc legado só com `tamanhosDisponiveis[]` ≡ grade de um corte `unissex`; nenhum doc é migrado. **Chave de SKU (decisão documentada):** unissex mantém a chave legada `itemId__tamanho` (2 segmentos — os docs de aprovisionamento existentes SÃO os mesmos, zero migração); corte explícito vira `itemId__corte__tamanho` (3 segmentos); `unissex` explícito como segmento é REJEITADO no parse (chave canônica única — duas grafias dividiriam o estoque do mesmo SKU). O valor persistido em `inscritos.tamanhos[itemId]` passa a ser o SUFIXO do SKU (`'M'` | `'feminina__M'`) — a agregação RN-224 segue UMA equality no subcampo do map, sem índice novo. No checkout o atleta escolhe CORTE primeiro → depois TAMANHO (só os do corte), POR inscrito; item de grade única pula direto ao tamanho; validação na origem espelha a grade (corte/tamanho forjado ⇒ invalid-argument, nada é escrito).
- **RN-232 · Encerrar encomendas do item.** Ação explícita do organizador: TODOS os SKUs do item em `estimativa` transicionam para `encomendado` (RN-226) com `qtd = qtdVendida` do instante (a FOTO da produção), numa única transação. **Encerrar encomenda ≠ fechar vendas**: quem compra depois segue escolhendo corte/tamanho; a diferença aparece em `aEncomendar` quando o estoque chega. Idempotente por máquina de estados (SKU já encerrado é pulado). Só organizador (RN-400/401/402).

**✅ ENTREGUE ponta a ponta (lote TAMANHOS-GRADE · trace leela-build-2d6ee98d · 2026-07-19, retomada pós-queda):** T1 modelo+SKU+Rules+validação origem+callable (`09be9e7`) · T2 ciclo do organizador no painel — grade no ItemKitModal, Vendido/Entregues por corte×tamanho, "Encerrar encomendas", ajuste de estoque 2D, corte+tamanho no checklist do balcão (`9270083`) · T3 checkout corte-primeiro na landing (`b1d7e82`). Gates: unit 67/67 · emulator estoque 21/21 + checkout 12/12 · painel 1232/1232 · landing 60/60. Report: `outputs/leela-build-2d6ee98d/TAMANHOS-GRADE-REPORT.md`.

---

## Regras de negócio novas (IA-MENU · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-ia-menu/`. Verbatim dele: *"o caixa de eventos é separado dos repasses que poderão vir futuramente dos clubs, caso eles sejam pagos."* Desenho completo em `00-decisao.md`.

### Por que a aba de caixa do evento é deste épico, e não do E04

A S207 (Financeiro do evento) já vive aqui, e é a decisão certa: o E03 é a **operação** do evento — inscritos, balcão, kits, entrega, o que aconteceu. Caixa é exatamente isso: o dinheiro que **entrou** naquele evento, resultado da operação. O E04 é **configuração e vendas** — lotes, preços, política, cupons, taxa, ou seja, o que **vai** acontecer e sob quais regras. Uma tela que mostra receita realizada, taxa cobrada e o que sobrou pertence a quem opera, não a quem configura. A prova prática: a aba já está montada sob `EventoLayout` com `RequirePapel area="financeiro"`, e a matriz de papéis que decide quem entra é a mesma matriz de operação do evento.

- **RN-235 · A aba do evento se chama Caixa, e mostra o repasse daquele evento.** A sub-aba "Resumo" da seção financeira do evento passa a se chamar **Caixa** — é o macro daquele evento: o que entrou, o que é taxa, o que sobra. **A URL não muda** (`/eventos/{slug}/financeiro`) e a permissão não muda (`area="financeiro"` na matriz de papéis): muda o rótulo, que é o que a pessoa lê, e muda o conteúdo em um ponto. Hoje a tela declara "repassado R$ 0,00" com aviso honesto, porque nunca leu o ledger de repasse; passa a mostrar a **linha de repasse do próprio evento**, lendo o reader `repassesPorEvento` que já existe (RN-349), com atalho para a visão macro em `Eventos › Repasses`. É reuso de leitor — nenhum agregado, callable ou Rule novo. Sem repasse, o estado é honesto: nunca R$ 0,00 sugerindo que houve movimento.

**Caixa ≠ repasse, e a tela precisa deixar isso claro.** Caixa é o que o evento faturou; repasse é o dinheiro saindo para a conta do organizador, que acontece sobre um saldo único do titular (RN-366, E09) e tem janela de liberação própria (RN-348). Confundir os dois é o erro que o Vitor separou de propósito ao dizer que "o caixa de eventos é separado dos repasses".

### O hub de Eventos ganha subdivisão

`/eventos` passa a ter SubNav (padrão §2.14): **Eventos** (a lista de hoje, intacta) | **Repasses** (`/eventos/repasses`, a visão macro que migra do antigo `/financeiro/repasses`, mantendo RN-349 e RN-358 palavra por palavra). Detalhe da regra no E09 · RN-366.

**Armadilha de rota:** `/eventos/repasses` convive com `/eventos/:slug`. A precedência tem de ser declarada e testada — um evento com slug `repasses` não pode sequestrar a subdivisão nem ser sequestrado por ela em silêncio.

### Execução

`IAM-T7` (aba Caixa com o repasse do evento) — **opus xhigh com review antagonista**, porque põe número de dinheiro dentro da tela de um evento específico. Depende de `IAM-T4` (a migração de repasses). Gate: o teste da matriz de papéis passa **sem edição**, e a linha de repasse bate com o mesmo número que aquele evento mostra em `/eventos/repasses` — reconciliação entre as duas telas, nunca recálculo. Detalhe em `02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`.

### Apêndice de execução (2026-07-26 · lane IAMENU-EXEC)

**RN-235 está construída.** `IAM-T7` `e5c77cb`, opus xhigh. ⚔ review antagonista **pendente**.

**O rótulo.** A sub-aba lê **Caixa** e o título da tela virou "Caixa do evento". `/eventos/{slug}/financeiro` e `RequirePapel area="financeiro"` intactos — prova objetiva: `routes/_system/` **não aparece no diff do commit**, ou seja, o teste da matriz de papéis passou sem uma edição, que era o gate.

**A lacuna fechada.** A Caixa lê o repasse **daquele** evento pelo `useHistoricoRepasses` + `associarRepassesPorEvento` — o MESMO reader e a MESMA função pura que montam a linha do evento em `/eventos/repasses`. A reconciliação é **por construção**, não por conferência: mesma fonte, mesma derivação, mesmo campo exato `eventoId`. Se um dia divergirem, é bug de dado, não duas contas paralelas. O teste monta um histórico com ruído de propósito (outro evento, um cancelado, um sem associação), deriva pela função da macro e afirma que a Caixa exibe exatamente aquele número.

**Estados honestos.** Sem repasse associado: "—" com "Nenhum repasse solicitado para este evento". O "repassado R$ 0,00" genérico morreu — zero que parece movimento era o pior modo de falha desta tela. Enquanto o histórico carrega, a tela **não** afirma ausência: diz que está consultando.

**O atalho.** "Ver todos os repasses" leva a `/eventos/repasses`, e a visibilidade deriva da **matriz única** (`podeAcessar(papel, 'financeiro')`, RN-320) — a mesma que o `RequirePapel` consulta, nunca uma segunda regra de acesso. Testado nos dois sentidos e com espelho célula a célula da matriz (organizador ✅ · financeiro ✅ · administrador ❌ · operador ❌).

**Uma asserção mudou de propósito.** O hint genérico "Disponível com o módulo de repasses" saiu de `FinanceiroView.test.tsx`. Isso é mudança de comportamento **deliberada** desta RN, ratificada em `00-decisao` §6 — **não** é o gate transversal de "move sem asserção reescrita", que vale para as telas que se mudaram de pasta (esta não se mudou). Ponto explícito para a review antagonista confirmar.

---

## Regra de negócio nova (THUMBS-LISTAS · Vitor 2026-07-27)

Pedido verbatim dele, **em recorrência** (já havia pedido antes e não tinha sido
fechado): *"Ao visualizar kits e marcas, quero que o usuário já visualize as
imagens dentro do sistema, para facilitar a identificação, no menu, antes de
entrar para editar alguma informação. As imagens devem ser miniaturas. De logos
de marcas, a kits. Já na edição de um evento, deve aparecer a miniatura da capa
do evento."​

O job não é decoração: é reconhecer o item **de vista**, antes de clicar, para
não abrir o kit errado só para descobrir qual era.

- **RN-236 · Listagem de entidade com imagem exibe a miniatura dessa imagem; a
  edição exibe a miniatura da imagem atual.** Onde a entidade tem imagem
  própria, a listagem mostra essa imagem reduzida ao lado do nome, na razão que
  o dado contrata: **kit 1:1** (RN-227), **logo de marca 1:1** (RN-171, E10),
  **capa de evento 1.9:1** (RN-228). Na tela de **edição**, a miniatura mostra a
  imagem **vigente** junto do campo, para a pessoa saber o que está lá antes de
  trocar. É **exibição reduzida da URL que já existe** — nenhum pipeline de
  resize no servidor nasce aqui (os uploads já têm teto de tamanho). Ausência de
  imagem, **e também URL quebrada**, caem num fallback digno (a sigla do nome);
  o quadrado quebrado do navegador nunca é estado aceitável. Miniatura em lista
  carrega adiada (`loading="lazy"`); miniatura única ao lado de campo carrega de
  saída. A caixa é o primitivo **`Thumb`** do DS (E01) — nenhuma tela monta a
  sua à mão.

**Dona:** este épico (2 das 3 superfícies são dele: kits do evento e capa do
evento). **Referenciam:** E10 (lista de marcas) e E01 (o primitivo).

### Apêndice de execução (2026-07-27 · lane THUMBS-LISTAS · trace leela-build-2d6ee98d)

**RN-236 está construída.** Worktree `lane/thumbs`, base `0705ccc`.

**T1 `2e48d28` — o primitivo.** `Thumb` nasce no DS porque três superfícies
pediam a mesma caixa e nenhuma existia: o `Avatar` é circular e representa
PESSOA (aria-label derivado de `name`), e o thumb híbrido do `EventRow` vive
dentro dele com fallback de gradiente semântico por modalidade. Governança §7 —
o que a tela precisa e o DS não tem nasce no DS. A largura vem do token do
tamanho e a altura sai da razão, então uma medida serve às duas proporções.
Tokens novos no tier component (família `--thumb-*`, ao lado dos gradientes de
modalidade que já viviam no semantic). 19 testes.

**T2 `dbda6cd` — kits.** Fecha a metade que faltava da **RN-227**: o backend e o
upload no `KitEditor` já existiam, e a RN sempre disse que a imagem aparece
também na `KitsCadastroView` — lá o card mostrava só texto. A miniatura entra
antes do nome, que é a ordem em que se lê a grade. `siglaDe` virou função em
`lib/` em vez de segunda cópia: a regra da letra já existia embutida na
`LogoCell` de `/marcas`.

**T3 `430e72c` — marcas.** `/marcas` já mostrava o logo, mas por um par
`img`/`div` montado à mão na tela. Trocado pelo `Thumb`: ganhou o
`loading="lazy"` que faltava, medida por token no lugar de `h-10 w-10` cru, e
degradação para a sigla quando a URL morre (antes o fallback só cobria "nunca
teve logo", não "a URL foi revogada").

**T4 `7434cd5` — capa na edição do evento. Achado que muda o recorte:** a capa
atual **já aparecia** na edição (dois testes cobriam). O que não existia era a
**miniatura** — a prévia era bloco de largura cheia que, num formulário de 768px
em 1.9:1, passa de 400px de altura e empurra o resto dos campos para fora da
tela. Era essa a reclamação, não a ausência da imagem. `previewMiniatura` no
`ImageUploadField` é **opt-in** e recebe a razão **explícita** do chamador: as
outras três superfícies do componente (avatar e capa do perfil público, capa do
clube) seguem byte-idênticas. A razão não é derivada de `aspecto` de propósito —
16/9 do clube cairia em 1.9/1 e quebraria o WYSIWYG que o componente promete.

**Onde o Vitor confere:** `/eventos/{slug}/kits` · `/marcas` ·
`/eventos/{slug}/configuracoes`.

### ⚔ Review antagonista (lane THUMBS-REV, 2026-07-27) — APROVADO COM FIXES

Quatro defeitos provados, quatro commits. Dois no DS estão no E01; os dois do
painel:

**A capa com URL morta virava caixa VAZIA, não fallback (`8f4b999`).** Das três
superfícies, a capa era a única que não passava `fallback` ao `Thumb` — nem no
ramo editável nem no de leitura. A RN-236 promete o contrário ("ausência de
imagem, **e também URL quebrada**, caem num fallback digno") e o `LLM.txt` do
Thumb é categórico no mesmo ponto. Era o pior lugar para falhar: a miniatura da
capa só monta quando `imagemUrl` está preenchida, então cair no fallback ali
significa exatamente "existe capa salva e o navegador não baixou" — e a caixa
vazia lia como "não tem capa". Agora cai no ícone `ImageOff`.

**As duas asserções de fallback das listagens passavam a vazio (`e2cca94`).**
Arranquei a prop `fallback` de `/marcas` e da grade de kits e rodei: 22/22
verdes. `toHaveTextContent('C')` casava com o 'C' de "CDL Wellness" na célula ao
lado, e `toHaveTextContent('K')` com o 'K' de "Kit Ouro" no `<h3>` ao lado. A
sigla nunca foi olhada. Escopo estreitado para a célula do logo e para a caixa da
miniatura; agora os dois morrem sem o fallback.

**O que sobreviveu ao ataque.** A fiação das três superfícies morde de verdade
(removi o `Thumb` do `KitCard`, o `Thumb` da `LogoCell` e o `previewMiniatura` do
`ConfigGeraisForm`: 3, 2 e 2 testes caem, respectivamente). O `loading="lazy"`
está provado por atributo nas três, com `false` correto nas duas caixas de capa.
O `onError` aguenta troca de URL, ida e volta para a URL que já morreu, rerender
com o mesmo `src` e `src` vazio×nulo. O `previewMiniatura` opt-in não tocou as
outras três superfícies do `ImageUploadField`.

**O número dos 400px, aterrissado.** O formulário é `max-w-3xl` (768px) e o
preview antigo era bloco de largura cheia com `aspect-ratio: 1600/838`: no
máximo da coluna dá **402px** de altura. A conta fecha. Só que a miniatura nova é
`size="lg"` — 96px de largura, **~50px de altura**. A oscilação foi de 402px para
50px, e `lg` já é o maior tamanho que o `Thumb` publica. Se 50px for pequeno
demais para reconhecer a capa, o caminho é token novo no DS, não ajuste na tela.
**Fica para o olho do Vitor.**

**Ponta solta de fidelidade:** a razão do `Thumb` é 1.9:1 e o `CAPA_EVENTO_ASPECTO`
é 1600×838, que é 1.909:1. O JSDoc do `previewMiniatura` diz "a MESMA razão"; são
0,5% de diferença (0,25px na caixa de 96px), invisível, mas "a mesma" não é
literal. A RN-228 fala em 1.9:1, então quem está fora é o par de pixels, não o
componente.

Suítes após os fixes: DS **1090/1090** · painel **1492/1494** (os 2 vermelhos —
sidebar de `/plataforma` e mutations de termos comerciais — foram reproduzidos
idênticos no base `0705ccc`, são anteriores a esta lane e não têm relação com
miniatura).

---

## Delta ingresso e credenciamento (SPECS-0728 · 2026-07-28)

Rodada `02-rodadas/2026-07-28-ingresso-qr/`. DEC-0728E refinada e DEC-0728G. Este épico é
dono da **tabela de inscritos do organizador** e do **balcão**, e por isso é dono da virada
de vocabulário. A emissão do código e o e-mail são do E12.

### Regras de negócio novas (INGRESSO-QR)

- **RN-397 · Código na tabela, QR sob demanda (dona = E03).** A lista de inscritos exibe o
  código identificador (RN-396) como coluna, e o QR do inscrito abre por ação na linha. O QR
  **não** é renderizado em massa na tabela: quatrocentas imagens numa lista é peso sem uso.
  O código entra como campo da busca que a tela já tem.
- **RN-399 · "Entrega" vira "credenciamento" no vocabulário (dona = E03).** Toda superfície
  que a pessoa lê passa a dizer credenciamento: SubNav do evento, títulos, textos do balcão e
  dos estados, mensagens, colunas e copy. A **rota** `/eventos/:slug/entrega` vira
  `/eventos/:slug/credenciamento`, com redirecionamento garantido da antiga pela RN-234, que
  já tem tabela, teste por linha e guarda anti-laço. **Não mudam nesta virada:** o campo
  persistido `kitEntregueEm`, com 75 ocorrências no código, e o id da área de permissão
  `entrega`, usado em `RequirePapel area="entrega"` e na matriz de papéis testada. Renomear
  dado gravado é migração; renomear área de permissão mexe numa matriz que já carrega um
  teste vermelho conhecido na lista de dívida técnica. **A mecânica é intocada:** RN-205,
  RN-221 e RN-222 seguem exatamente como estão.

---

### LEELA-S211 · Código do ingresso na tabela e credenciamento no vocabulário · (de-para novo · INGRESSO-QR)

**Como** organizador, **quero** enxergar o código do ingresso direto na lista e abrir o QR
quando precisar, **para** achar a pessoa certa no balcão sem depender do celular dela.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel (Eventos › Inscritos e Credenciamento) · **RNs:** RN-397, RN-399, RN-396, RN-234; mecânica RN-205, RN-221, RN-222 intacta
- **JTBD servido:** T · "identificar quem chegou sem depender do aparelho do atleta". Dimensão **Transacional**.
- **Origem:** DEC-0728E refinada e DEC-0728G (2026-07-28).

**Critérios de aceite (Given/When/Then):**

- **Dado** a lista de inscritos de um evento, **quando** ela carrega, **então** existe uma
  coluna com o código identificador de cada inscrito com ingresso emitido (RN-397).
- **Dado** um inscrito sem ingresso emitido, **quando** vejo a linha dele, **então** a célula
  do código mostra vazio honesto, e não um traço que pareça código.
- **Dado** uma linha da lista, **quando** aciono ver QR, **então** o QR daquele inscrito abre
  sobre a tela; a tabela em si nunca renderiza QR em massa (RN-397).
- **Dado** a busca da lista, **quando** digito um código, **então** a linha correspondente é
  encontrada, com o mesmo comportamento de contador "mostrando X de Y" que a tela já tem.
- **Dado** qualquer superfície que hoje diz entrega no sentido de balcão, **quando** a leio
  depois da virada, **então** ela diz credenciamento (RN-399).
- **Dado** o endereço antigo `/eventos/:slug/entrega`, **quando** alguém o abre, **então** ele
  redireciona para `/credenciamento` em no máximo um salto, pela tabela da RN-234.
- **Dado** o fluxo do balcão, **quando** o kit é retirado, **então** a presença continua sendo
  registrada exatamente como antes: RN-205, RN-221 e RN-222 não mudam de comportamento e a
  matriz de papéis passa sem edição.

**Tasks:** `S211-T1` (coluna do código e QR por linha), `S211-T2` (virada de vocabulário nas
superfícies lidas), `S211-T3` (rota nova com o redirecionamento da RN-234).

**Ordem interna.** `S211-T2` antes de `S211-T3`. Trocar o endereço antes dos rótulos deixa a
tela dizendo entrega dentro de um endereço de credenciamento, que é pior do que qualquer um
dos dois estados puros.

**Fora de escopo**
Alinhar os identificadores internos (`kitEntregueEm` e a área de permissão `entrega`). Volta
como card próprio, com o custo declarado, e não de carona numa troca de rótulo.

**Fila completa do pacote:** `02-rodadas/2026-07-28-ingresso-qr/03-fila-codigo.md`.

---

## Delta fronteira com a página pública do ingresso (SPEC-INGPAGE · 2026-07-29)

O item 55 criou uma **página pública do ingresso** (E12-S1214 · RN-418..424), aberta por link
tokenizado que vai no e-mail da compra. Ela toca o vocabulário e a mecânica deste épico em um
ponto só, e a fronteira está escrita para não ser redescoberta no balcão.

**A página exibe; o balcão credencia.** Abrir a página **não escreve nada**: não seta
`checkinEm`, não seta `kitEntregueEm`, não muda status. RN-205, RN-221, RN-222 e RN-399
seguem intactas — quem registra presença é o operador, pelo scanner, no fluxo do `S208`, e o
estado continua sendo decidido em transação no servidor.

**O que a página faz com o estado do balcão.** Ela **lê**. Inscrito já credenciado abre a
página com o credenciamento em destaque e o carimbo, e o QR continua visível (RN-421):
esconder não protegeria nada, porque o servidor já responde `qr_ja_utilizado` no replay, e
tiraria da pessoa a conferência de que aquele é o ingresso dela.

**O código identificador não vira credencial por causa da página.** A RN-396 continua valendo
palavra por palavra: nenhuma superfície aceita o código como prova de entrada, e a página
também não. Ela mostra o código pelo mesmo motivo do e-mail — para a pessoa ditar no balcão e
o operador achar na busca que a `S211-T1` entregou.

**O que muda para o operador, na prática.** Quem chega sem celular carregado passa a ter uma
saída a mais: a folha impressa da página (RN-424). O balcão lê o QR impresso pelo mesmo
scanner, sem nada novo do lado do organizador.

---

## Delta galeria do kit (SPEC-KITCUPOM · 2026-07-29 · D-0729-4)

O dono decidiu que o kit passa a ter até três fotos, uma marcada como principal, e que a
principal é a que aparece nas listagens e no site. Hoje o kit tem uma foto só (`imagemUrl`,
RN-227). Isto é feature nova, não regressão. RNs em
`02-rodadas/2026-07-29-checkout-ux/03-rns-kitcupom.md`; decisões e premissas vetáveis em
`02-spec-kitcupom.md` da mesma rodada.

**RNs novas deste épico:** RN-425 (forma da galeria e principal por construção) e RN-427 (edição
no painel e slots de Storage). A RN-426 (superfícies) e a RN-428 (simulação) são do E12 e estão
referenciadas na fronteira abaixo.

### LEELA-S212 · Galeria do kit (até três fotos, uma principal) · (de-para novo · SPEC-KITCUPOM)

**Como** organizador, **quero** cadastrar até três fotos por kit e escolher qual é a principal,
**para** mostrar o kit por mais de um ângulo sem perder o controle de qual foto representa o kit
nas listagens e no site.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Core + Painel + Storage (+ E12 nas telas públicas)
- **Tela(s) de referência:** `KitEditor` do painel; detalhe do kit no checkout
- **RNs:** RN-425, RN-427; fronteira RN-426, RN-428; contexto RN-227, RN-230, RN-210/211
- **Reuso obrigatório:** `isUrlImagemKitValida`, o padrão Postel de `normalizarItensKit`,
  `uploadImagemKit`, o `FileInput` do DS, `kitObjetoValido`/`eventoDoMeuTenant`/`imagemValida`
  das Rules de Storage, e o primitivo `Thumb` do DS. **Nenhum componente novo de DS.**
- **Dependência herdada, resolvida na mesma data (`78810ee`):** upload real exige bucket de Storage, que não existia no ambiente
  online (pendência 3 do dono, handoff DEPLOY-PREVIEW). A mesma pendência já bloqueia a primeira
  foto; a galeria não acrescenta dependência. O bucket padrão foi criado em `southamerica-east1` durante esta rodada, então o que resta é PROVAR upload real ponta a ponta nele, o que a `S212-T2` faz.

**Critérios de aceite (Given/When/Then):**

- **Dado** um kit com uma foto só, gravado antes desta história, **quando** o produto lê o
  documento, **então** ele parseia sem erro, aparece igual em toda superfície e nenhuma migração
  roda (RN-425).
- **Dado** um kit com principal e duas secundárias, **quando** qualquer superfície pede a
  galeria, **então** o acessor devolve a principal primeiro e as secundárias na ordem gravada
  (RN-425).
- **Dado** um documento com `fotosSecundarias` contendo lixo, esquema perigoso, URL repetida da
  principal, duplicata interna ou mais de duas entradas, **quando** o parse roda, **então** as
  entradas inválidas são descartadas, a lista é cortada em duas e o checkout público não quebra
  (RN-425).
- **Dado** o editor de kit, **quando** abro um kit, **então** vejo três posições, a primeira
  rotulada como principal, cada uma com enviar, trocar e remover (RN-427).
- **Dado** uma foto na posição 2, **quando** peço "tornar principal", **então** ela troca de
  lugar com a principal e nenhuma foto aparece duas vezes (RN-427).
- **Dado** um kit com principal e secundárias, **quando** removo a principal, **então** a
  primeira secundária é promovida e o kit nunca fica com galeria sem principal (RN-427).
- **Dado** o upload de uma segunda foto, **quando** ele grava, **então** o objeto vai para o slot
  literal 2 sob o kit, reenviar sobrescreve, não sobra órfão e não existe nome de arquivo livre
  (RN-427).
- **Dado** uma tentativa de gravar em um slot fora de 2 e 3, **quando** as Rules avaliam,
  **então** ela é negada, e o teto de três fotos vale também no Storage (RN-427).
- **Dado** um usuário de outro tenant, **quando** tenta gravar qualquer slot do kit, **então** as
  Rules negam pelo mesmo caminho fail-closed da foto principal (RN-427).

**Tasks:** S212-T1, S212-T2, S212-T3, S212-T4. Fila e ⚔ em
`02-rodadas/2026-07-29-checkout-ux/04-fila-kitcupom.md`.

#### LEELA-S212-T1 · Forma da galeria no core e nas Rules de Storage
- **Tipo:** core/rules · **Depende de:** — · **Bloqueia:** S212-T2, S212-T3 · **Estimativa:** S · **Rota:** opus

**Objetivo**
Acrescentar `fotosSecundarias[]` ao `Kit`, o acessor canônico `fotosDoKit`, a troca pura
`promoverFotoPrincipal` e os dois slots literais nas Rules de Storage.

**Contexto & referências**
`packages/core/src/eventos/kit.ts` já tem o molde inteiro: `normalizarItensKit` é o padrão Postel
a copiar, `isUrlImagemKitValida` é a fronteira de URL a reusar, e `parseKit` é onde a
normalização entra. `storage.rules` já tem `kitObjetoValido`, `eventoDoMeuTenant` e
`imagemValida`; o bloco novo os reusa sem inventar guarda.

**Modelo de dados / contratos**
Campo opcional `fotosSecundarias?: string[]` (máximo 2 após filtro). `fotosDoKit(kit)` devolve
principal primeiro. `promoverFotoPrincipal(kit, indice)` devolve o par trocado, sem copiar.
Path novo: `eventos/{eventoId}/kits/{kitId}/fotos/{slot}` com `slot` restrito a 2 e 3.

**Aceite**
Testes unitários do parse defensivo (lixo, esquema perigoso, duplicata da principal, duplicata
interna, estouro do teto), da troca e da promoção ao remover a principal. Teste de Rules cobrindo
slot fora do enum, tenant errado e evento inexistente.

#### LEELA-S212-T2 · Três posições no editor de kit
- **Tipo:** ui/painel · **Depende de:** S212-T1 · **Bloqueia:** — · **Estimativa:** M · **Rota:** opus

**Objetivo**
Expor as três posições no `KitEditor`, com enviar, trocar, remover e "tornar principal".

**Contexto & referências**
`apps/painel/src/routes/eventos/kits/KitEditor.tsx` já tem o fluxo de upload, a prévia, o
tratamento de erro e a semântica de payload do `salvarKit` (campo ausente = não tocado, nulo =
removido). A task replica a posição existente, não reescreve o editor. `uploadImagemKit` ganha o
parâmetro de slot.

**Aceite**
Teste de componente para promover, remover a principal com secundárias presentes, e o estado de
kit sem nome (que já bloqueia upload hoje). Contraste por estado nos controles novos.

#### LEELA-S212-T3 · Galeria no detalhe do kit e projeção pública
- **Tipo:** ui/landing · **Depende de:** S212-T1 · **Bloqueia:** — · **Estimativa:** M · **Rota:** opus

**Objetivo**
Levar as fotos secundárias até o detalhe do kit no checkout, mantendo as listagens na principal.

**Contexto & referências**
`apps/landing/lib/tipos.ts` (`KitPublico`) e `lib/leitor.ts` projetam o kit; `KitDetalhe.tsx` já
exibe a foto e já tem lightbox. `Thumb` do DS é o primitivo das miniaturas. `KitsSection` e
`StepModalidadeKit` **não mudam** (RN-426).

**Aceite**
Teste de que a listagem exibe só a principal, de que a troca de miniatura muda a foto em destaque,
de que o lightbox abre a foto em foco, e de que o enquadramento quadrado com recorte por cobertura
não deforma foto fora de esquadro.

#### LEELA-S212-T4 · Simulação de galeria no preview
- **Tipo:** landing/preview · **Depende de:** S212-T3 · **Bloqueia:** — · **Estimativa:** S · **Rota:** opus

**Objetivo**
Fazer o dono ver kits com três fotos no meia-floripa, sem gravar URL no seed.

**Contexto & referências**
`apps/landing/lib/kitImagem.ts` já implementa a cascata real → mock de preview → placeholder
Leela, com o motivo escrito no cabeçalho e a lição LEELA-R14 citada. A task acrescenta um degrau,
não um mecanismo (RN-428).

**Aceite**
Teste do resolvedor: em preview, kit sem secundárias devolve duas extras determinísticas do acervo
local; em produção, devolve só a principal. Zero alteração nos scripts de seed.

### Fronteira com o E12 (telas públicas)

O modelo, o painel e o Storage são deste épico. Quem decide **onde** cada foto aparece é a RN-426
e quem decide a **simulação** é a RN-428, ambas do E12, porque vivem na superfície pública. A
regra que atravessa os dois épicos é uma só: listagem e site usam a principal, o detalhe mostra a
galeria, e nenhuma superfície precisa validar "exatamente uma principal", porque a forma da
RN-425 não permite outra coisa.

## Ponta solta nomeada · o "N inscritos" do evento conta qualquer status (2026-08-03 · lane PIXFIX-EXTREF, T6)

Parecer read-only da rodada `02-rodadas/2026-08-02-retomada/` (trace `leela-build-2d6ee98d`), colhido
ao investigar as quatro tentativas de compra que morreram no defeito do gateway. Nada foi escrito,
nada foi apagado e nenhuma query rodou contra produção — a resposta sai da leitura dos agregadores.

**O contador do cabeçalho do evento e o badge da sub-navegação vêm de `eventos.qtdInscritos`, que é
`contarInscritos().total` e não filtra status nenhum.** Ele soma inscrito pendente, e por isso um
pedido que nunca virou cobrança fica visível como inscrição. O mesmo número é lido pela landing.
Superfícies: `EventoShell.tsx:97` e `:174`, e `apps/landing/lib/leitor.ts:495`.

O que **não** infla, e é o que importa para decisão: `demografia.totalConfirmados` filtra por
`status == 'confirmado'`; `financeiro.receitaBruta` só se move pelo webhook de confirmação; o
aprovisionamento de kit filtra por confirmado; e a virada de lote usa `STATUS_QUE_CONTAM_VENDA`.
Nenhum dos 11 crons varre o estado, e a callable de expiração do PIX deixaria os inscritos em
`pendente` de propósito, pelo mesmo tratamento do caminho `falhou` do webhook — ou seja, a expiração
não conserta o contador.

**Dano real: nenhum.** Não segura vaga, não reserva kit, não vira lote, não entra em receita nem em
demografia; o prejuízo é um número errado na tela do organizador. Evento afetado hoje:
`desafio-mtb-costa-lagoa-2026`, com 2 pedidos órfãos. **Recomendação em vigor: não limpar agora** —
apagar inscrito em produção é escrita irreversível sobre dado de comprador, e o mesmo estado se
repetiria enquanto a compra não fosse provada ponta a ponta. Se o dono decidir limpar, o momento é
depois da primeira compra bem-sucedida, e a operação é apagar os inscritos dos 2 pedidos, porque o
gatilho de escrita de inscrito recomputa o contador sozinho no delete. Registro no item 70 do painel
de decisões; detalhe em `.nirvana/handoffs/leela-build-2d6ee98d-PIXFIX-EXTREF.md`.

**Se um dia virar regra:** a decisão a tomar é se o "N inscritos" público conta pendente ou só
confirmado. Hoje ele conta tudo por construção, e isso nunca foi escrito.

## Delta o inscrito que a tela conta é quem pagou (SPEC-METRICAS-SERVICO · 2026-08-05)

A ponta solta nomeada acima, de 03/08, terminava assim: *"se um dia virar regra: a decisão a tomar
é se o N inscritos público conta pendente ou só confirmado. Hoje ele conta tudo por construção, e
isso nunca foi escrito."* A decisão chegou dois dias depois, do dono, e depois de ele mesmo abrir
uma compra por PIX e não pagá-la. Verbatim em
`02-rodadas/2026-08-05-metricas-e-servico/01-decisoes-dono.md`; spec com o inventário completo em
`02-spec-metricas-e-servico.md`.

### RN-486 (nova, dona) · o contador exibido é o de pagantes, e ele é um número novo

O número mostrado ao organizador passa a ser a contagem de inscritos com pagamento confirmado, e
é a base de toda métrica derivada dele — ticket médio (RN-488), vagas restantes, ocupação e
alertas.

**Ele não substitui `eventos/{id}.qtdInscritos`.** Nasce como campo próprio no mesmo agregado,
projetado de `financeiro/current.inscritos.porStatus.confirmado`, que a transação de
`recomputarFinanceiroEvento` já computa hoje
(`functions/src/eventos/agregarFinanceiro.ts:178-181`). A razão de não redefinir o campo antigo é
a RN-487, dona em [[LEELA-E04-config-vendas]]: `qtdInscritos > 0` é a prova de "este evento já
vendeu" em oito guardas de configuração, e redefini-la descongelaria a configuração comercial de
qualquer evento que só tenha PIX pendente.

Dezenove superfícies de exibição passam a ler o número novo. O inventário completo, com arquivo e
linha, está na spec da rodada; a lista curta é cabeçalho e sub-nav do evento
(`EventoShell.tsx:97, 174`), ticket médio (`OverviewKpis.tsx:66`), countdown
(`CountdownHero.tsx:47-48`), hub de eventos (`hubRows.ts:59-91`), KPI de portfólio
(`_lib/kpis.ts:26`), rótulo de esgotado (`_lib/status.ts:33-39`), alertas
(`_lib/alertas.ts:47, 112`), vagas restantes e limiar de últimas vagas
(`packages/core/src/overview/kpis.ts:120-133`), alerta de ocupação
(`packages/core/src/overview/alerts.ts:123`), dashboard do profissional
(`aggregateProfessionalDashboard.ts:142, 178-187`) e snapshot diário
(`coletaDiaria.ts:112`).

**Nada disso é o gate de lotação da venda.** Aquele lê `lotes/{loteId}.vendidos`, que já conta só
`confirmado` e `estornado` desde sempre — `functions/src/eventos/virarLote.ts:67`:

```ts
export const STATUS_QUE_CONTAM_VENDA = ['confirmado', 'estornado'] as const;
```

Por isso **contar só pagante na tela não abre sobrevenda**: métrica e capacidade nunca foram o
mesmo número. A janela em que N compradores com PIX pendente passam pelo `computeSaleState` é
anterior a esta regra e vem da RN-158, que declara que carrinho aberto não segura estoque.

Falsificação: um evento com uma cobrança PIX pendente e nenhum pagamento tem de exibir zero
inscritos nas dezenove superfícies. O `desafio-mtb-costa-lagoa-2026`, com dois pedidos órfãos, é o
caso real de conferência — **leitura apenas, sem apagar inscrito**, mantendo a recomendação de
03/08.

**O inscrito fantasma continua sendo outra frente.** PIX expirado ou falho deixa o inscrito em
`pendente` para sempre (`expirarPixPendente.ts:243-245`, `webhookPagamento.ts:361-368`), nenhum
código apaga doc de inscrito, e `expirarPixPendente` é callable de cliente sem cron de varredura.
Uma cobrança gerada e nunca paga congela a configuração comercial do evento indefinidamente, pela
RN-487 — a RN-486 para de contaminar a tela, e não conserta isso.

### O que o "N inscritos" público faz

Fica **em aberto**, como item **INSCR-1** do painel. O dono falou do painel profissional; a
landing lê o mesmo campo (`apps/landing/lib/leitor.ts:542`, `lib/tipos.ts:147-149`) com a exibição
hoje suprimida. O default proposto é que as duas telas digam a mesma verdade.

## Delta a RN-200 vale como está escrita (SEAL-LOTES · 2026-08-05)

Este épico define a **RN-200**, e ela não muda de enunciado. O que muda é o código que a
implementava a mais do que ela pede, e o registro precisa existir aqui porque a divergência
sobreviveu meses justamente por não estar escrita em lugar nenhum que se lesse.

**O enunciado, intacto:** *"Após a 1ª venda, edição de **preço** (evento/kit/lote) é bloqueada."*
Só preço.

**A divergência medida.** A Rule `loteComercialImutavelSeVendido` (`firestore.rules:1118-1123`)
congela seis campos do lote: `preco`, `inicioEm`, `fimEm`, `quantidadeLimite`, `ordem` e
`modalidade`. Cinco deles não estão na RN-200, e a extensão nunca teve enunciado — ela existia
como comentário `"RN-200/300 (registrado)"` na Rule, no `api-client` e no `loteForm` do painel.
Comentário registra intenção; ele não é regra, e não é lido por quem confere a regra.

**Como isso apareceu.** O dono tentou editar um lote em vigência, não conseguiu mexer em
quantidade nem em datas, e reportou. A leitura da fala contra a regra escrita mostrou que **ele
estava pedindo a RN-200 como ela é**, e que a resposta correta não era negociar com ele: era
alinhar o código.

**Onde o delta foi selado.** A regra que declara campo a campo o que congela num lote vendido é a
**RN-497**, em [[LEELA-E04-config-vendas]], porque o objeto é o lote e o épico dono do lote é o
E04. A RN-200 permanece aqui, inalterada, e passa a ser exigível na letra. Registro completo em
`02-rodadas/2026-08-05-lotes-ux/`.

**Lição de método que vale para todo o canon:** extensão de regra que só existe em comentário de
código é extensão que ninguém pode contestar, porque ninguém a encontra. Quando o código for além
da regra escrita, ou a regra ganha o enunciado novo na mesma aterrissagem, ou o código volta para
o tamanho dela.

## Delta o kit fica na modalidade, e o lote pode dispensá-lo (SPEC-MODALIDADE-KIT · 2026-08-05)

Este épico define o kit (RN-210 a RN-217), e nenhuma dessas regras muda. O que muda é a vizinhança,
e o registro precisa existir aqui porque a pergunta que abriu a rodada era exatamente sobre este
épico: *"estamos sem opções no painel profissional de vincular um kit a um lote."*

**A ratificação do dono, verbatim:** *"nao, na verdade é na modalidade mesmo!"*

O vínculo fica onde está. `Kit.modalidades[]` (`packages/core/src/eventos/kit.ts:84-85`) continua
sendo o único vínculo do kit, o kit continua valendo em todos os lotes da modalidade, e o desenho
`Kit.lotes[]` está **recusado** — não adiado. A fronteira que o diagnóstico de 04/08 descreveu se
confirma: o lote é degrau de preço da inscrição dentro de uma modalidade, o kit é oferta paralela
com delta que aceita negativo (RN-211).

**O que muda, e mora no E04.** O lote ganha `incluiKitDaModalidade?`, ausente equivalendo a ligado,
e passa a poder dispensar a oferta inteira da modalidade dele. A regra é a **RN-503**, em
[[LEELA-E04-config-vendas]], porque o campo é do lote e o épico dono do lote é o E04. A tudo-ou-nada
foi apresentada ao dono e aceita: três kits na modalidade somem juntos.

### O que o interruptor não muda neste épico

Medido, não presumido. As quatro afirmações vieram da varredura registrada em
`02-rodadas/2026-08-05-modalidade-e-kit/02-spec-modalidade-e-kit.md`.

**O balcão não muda.** O kit entregue é lido do inscrito, que carrega o enum em `inscrito.kit`
(RN-202) e o id real em `inscrito.kitId` (`packages/core/src/eventos/inscrito.ts:139-147`). Nenhum
caminho da entrega consulta o lote, e nenhum pode passar a consultar.

**O aprovisionamento não muda** (RN-224/RN-225/RN-226). A conta é
`aEncomendar = max(0, qtdVendida − estoqueFisico)`
(`packages/core/src/eventos/aprovisionamento.ts:266-269`), com `qtdVendida` recomputado a partir de
inscritos confirmados por SKU `itemId__[corte__]tamanho`. Não há reserva: desligar o interruptor
não libera estoque porque nada estava preso, e o único efeito é `qtdVendida` parar de crescer pelas
vendas daquele lote.

**`Kit.capacidade` não muda, e vale registrar o que ela é.** Os dois consumidores dela somam por
documento de kit — a capacidade derivada do evento
(`functions/src/overview/aggregateProfessionalDashboard.ts:86, 102`) e a matriz de estoque do
painel, onde `saldo = capacidade − totalRetirados`
(`apps/painel/src/routes/eventos/_lib/distribuicao.ts:199-209`). O documento continua existindo com
a mesma capacidade. E, contra a leitura intuitiva da palavra, **`Kit.capacidade` não bloqueia venda
nenhuma**: ela não é lida no checkout nem decrementada em lugar algum. O único estoque que gateia é
a vaga do lote, e mesmo ela é recontada, nunca reservada.

**O e-mail do ingresso não muda**, e por uma razão que já era verdade: ele nunca mostrou kit. O
template carrega nome, modalidade, código, QR e link (`functions/src/email/templates.ts:311-330`).

### O comentário de follow-up que pode morrer

`apps/landing/.../checkout/tipos.ts:64-66` ainda diz que *"persistir o kitId real no inscrito é
follow-up (hoje o doc guarda só o enum canônico)"*. Isso deixou de ser verdade: o `kitId` real é
gravado em `createInscricaoCharge.ts:1704-1707`. O comentário é dívida de documentação, sai junto da
tarefa 2c da fila da rodada, e é o mesmo defeito que a SEAL-LOTES nomeou em 05/08 — comentário que
registra intenção e envelhece sem que ninguém perceba.

### Fronteira registrada

A modalidade não é entidade deste épico nem de nenhum: é string em array do doc do evento. As seis
regras que governam a edição dessa lista (RN-500 a RN-505) vivem em
[[LEELA-E04-config-vendas]], e o que este épico consome delas é o efeito no kit — renomear migra
`Kit.modalidades[]` no mesmo commit (RN-501), e remover é recusado enquanto um kit apontar
(RN-502).

## Delta o kit não vende desconto (SPEC-SEM-KIT · 2026-08-05)

> Rodada `02-rodadas/2026-08-05-sem-kit/`. Decisão **D-0805-7** do dono, que **revoga a RN-211**.
> Este épico é o dono das quatro regras novas, porque o kit é entidade dele (faixa 200-236).

### A revogação, e o que sobrevive dela

A RN-211 dizia que *"Sem kit" é kit válido e aceita preço negativo (desconto)*. O dono revogou a
segunda metade em 05/08, com a razão de negócio dita na mesma frase: o brinde do patrocinador
precisa chegar à mão do participante, e uma opção de abrir mão dele por dinheiro trabalha contra
isso. O enunciado original continua legível na seção "Regras de negócio aplicáveis", **marcado**,
porque `kitEhDesconto` e o ramo negativo de `labelDeltaKit` seguem no código enquanto existir
documento legado. A primeira metade sobrevive dentro da RN-506: um kit chamado "Sem kit" continua
sendo kit válido.

### O brinde é contrapartida de patrocinador · diretriz durável

> *"é interessante para os organizadores e patrocinadores que os participantes tenham os kits com
> os brindes deles."* — o dono, 05/08.

Isto não é regra técnica e não tem número: é a razão pela qual as regras de kit são como são, e
serve para decidir os próximos casos sem precisar perguntar de novo. **Um item de patrocinador que
não chega à mão do participante é contrapartida não entregue**, e a plataforma vive de vender essa
contrapartida (RN-213, RN-214, e a ativação de marcas que o rodapé da S205 já contabiliza).

Consequência operacional: **nenhum desenho pode oferecer ao comprador um caminho para declinar o
kit em troca de dinheiro.** Colidem com a diretriz, e por isso nascem recusados até que o dono diga
outra coisa: o desconto por dispensar o kit (que é o caso desta rodada), o kit vendido à parte da
inscrição, o cupom que zera apenas o delta do kit, e qualquer variante de "inscrição sem brinde
mais barata". Não colide, e segue permitido: a modalidade que não oferece kit nenhum, o kit de
preço zero, e o lote que dispensa a oferta inteira (RN-503).

### RN-506 · o preço do kit tem piso zero, e a fronteira é a Rule

**O preço de um kit é valor monetário em centavos exatos, maior ou igual a zero.** A regra revoga a
RN-211 e vale no create e no update. Um kit chamado "Sem kit" continua legítimo; o que a plataforma
não vende é desconto por dispensar o brinde.

**A proibição mora na Rule antes de morar em qualquer outro lugar**, e a razão é medida: o kit é
**escrita direta do cliente** (`packages/api-client/src/eventos/kits.ts:85-109` faz `setDoc` com
merge, e **nenhuma Cloud Function cria ou atualiza kit** — as Functions só leem), então o
`SalvarKitInput` é tipo TypeScript e tipo não recusa payload. Validação só na tela seria sugestão.

**O molde já existe no arquivo e é o do lote.** `shapeKitValido` (`firestore.rules:959-966`) exige
hoje `preco is number` e nada mais; o lote exige as duas coisas certas, `moneyCentExato` e
`preco >= 0` (`:1060-1061`). O kit passa a espelhar o lote. Isso fecha, de graça, uma segunda porta
que a apuração encontrou aberta: sem `moneyCentExato`, `preco: 75.001` e `Infinity` passam pela
Rule do kit hoje, porque `is number` é verdadeiro para float infinito.

**O predicado do core se divide em dois, e isso não é preciosismo.** `precoKitValido`
(`packages/core/src/eventos/kit.ts:113-116`) é chamado em dois papéis opostos: como escrita, diz o
que pode ser gravado; como leitura, é chamado pelo `parseKit` (`:289`) e dentro de
`computeSaleState` (`packages/core/src/checkout/saleState.ts:265-269`), onde **lança**. Apertá-lo
num lugar só faria toda cotação que envolva um kit legado negativo ser recusada, derrubando o
checkout de eventos vivos que ninguém tocou. Por isso `precoKitValido` **fica liberal** (leitura,
Postel, o mesmo padrão do `gradeEfetivaDoItem` neste arquivo) e nasce `precoKitGravavel`, que é o
espelho exato da Rule e é o que a tela e o contrato chamam.

**Quem já tem kit negativo continua vendendo, e não continua editando.** Vender continua porque o
predicado de leitura não mudou. Editar para de funcionar por efeito de segunda ordem: o payload do
`salvarKit` carrega `preco` incondicionalmente (`kits.ts:88-95`), então mexer na descrição de um
kit legado passa a bater na Rule com uma recusa que fala de preço. **Essa recusa precisa de
endereço na tela** — é o mesmo defeito que a review da SEAL-LOTES corrigiu no `LoteModal`
(`2a97a592`). Migração automática está **recusada**: reescrever preço em varredura contraria a
RN-200 em evento com venda e muda configuração de organizador sem ele saber. O reparo é operação
nomeada (RN-509).

**O que a regra deliberadamente não remove.** `kitEhDesconto` (`kit.ts:119-121`) fica, e vira o
detector do legado que a operação de reparo usa. `guardPrecoNaoNegativo`
(`saleState.ts:230-245`, chamado em `:288` e `:314`) fica, perde a causa viva e passa a ser última
linha de defesa, exatamente como o piso do principal na RN-456 — remover defesa porque a causa
sumiu é como o resíduo de juros zero nasceu. **Nenhum número de receita já apurado muda**, porque
`agregarFinanceiro` declara por escrito que nunca deriva receita de preço de kit
(`functions/src/eventos/agregarFinanceiro.ts:24-25`).

Falsificação: gravar um kit com `preco: -1` tem de ser recusado **pela Rule**, com a tela intacta e
com payload montado à mão; `preco: 75.001` também; e uma cotação sobre um evento que ainda tenha
kit negativo no banco tem de continuar fechando normalmente.

### RN-507 · o valor `sem_kit` do enum é rótulo, e não é o kit que a RN-506 elimina

**Duas coisas se chamam "sem kit" e só uma morre.** O que a RN-506 elimina é um **kit vendável**:
documento em `eventos/{id}/kits/{kitId}` com preço abaixo de zero. O que **continua existindo e é
necessário** é o valor `sem_kit` do enum `KitInscrito`
(`packages/core/src/eventos/inscrito.ts:41`, RN-202), que é **rótulo de fallback** do inscrito:
`kitEnumFromId` (`checkout/tipos.ts:66-72`) o devolve tanto para kit fora do conjunto canônico do
seed quanto para ausência de kit, e o preço **nunca** depende dele.

**Cinco superfícies vivas dependem do valor existir**, nenhuma delas ligada a desconto: o stepper
do credenciamento (`packages/core/src/eventos/entrega.ts:36-46`, `kitJaConcluido`), o carimbo de
`kitEntregueEm` (`AtendimentoPanel.tsx:121-123`), o denominador de kits a retirar
(`_lib/balcao.ts:130, 148`), o checklist do balcão (`_lib/balcao.ts:247, 258`) e o rótulo mais a
chave `porKit.sem_kit` do financeiro (`_lib/kitLabels.ts:19-24`).

**A confusão tem tamanho medido.** Em produção, 32 inscritos carregam `kit == 'sem_kit'` — 24 na
Meia Floripa e 8 na São Silvestre — e **nenhum deles carrega `kitId`**. São o rótulo, não a compra
do kit de desconto. Uma leitura apressada contaria esses 32 como "gente que comprou o Sem kit", e
não é isso que eles são.

**Modalidade que não oferece kit nenhum é caso legítimo e permanece.** O checkout já tem o ramo
(`StepModalidadeKit.tsx:251-257`), o inscrito nasce com `sem_kit`, o balcão trata e o
aprovisionamento ignora.

Esta regra existe por razão operacional declarada: sem ela, "tirar o Sem kit do produto" tem duas
leituras, e a errada apaga o enum e derruba o credenciamento no dia da prova. Falsificação: uma
varredura que remova o valor `sem_kit` do enum tem de deixar vermelha a suíte do credenciamento, e
não apenas a do checkout.

### RN-508 · escolher kit é obrigatório onde a modalidade oferece kits, e a saída é um kit de preço zero

**A obrigatoriedade não nasce nesta rodada: ela já é o código.** `CheckoutFlow.tsx:1706-1715`
recusa avançar quando `kitsDaModalidade(...).length > 0` e `kitId` está vazio. Não existe botão de
"não quero kit". O que fazia o gate parecer suave era o "Sem kit" estar **dentro** da lista:
escolhê-lo satisfazia o gate, e o comprador achava que estava recusando quando estava comprando. O
que a RN-506 muda é o conteúdo da lista, não a regra de avanço.

**A saída, onde o organizador quiser abrir uma, é um kit de preço zero.** É o único desenho
compatível com a diretriz do patrocinador: a pessoa escolhe um kit, o kit pode não conter nada, e
ninguém ganha dinheiro por dispensar brinde. O acervo já usa esse padrão para outra finalidade —
seis dos quinze kits de produção custam zero, todos chamados "Kit básico" ou "Kit trilha" —, mas
**nenhum kit de preço zero chamado "Sem kit" existe hoje**: o padrão da saída teria de ser criado.
Se a plataforma **garante** essa saída ou deixa a decisão com o organizador é juízo de dono, aberto
como **SEMKIT-2**; o default em vigor é deixar com o organizador, porque forçar a saída em toda
modalidade contraria a razão que o dono deu.

**Não há beco por esgotamento hoje, e a razão é desconfortável.** `Kit.capacidade` não gateia venda
nenhuma: varredura por `capacidade` sobre `functions/src/checkout/` e sobre
`apps/landing/app/(public)/[eventSlug]/inscricao/` devolve **zero ocorrências**. O campo é
carregado pela projeção pública (`leitor.ts:196`) e nunca lido para decidir compra. **Kit esgotado
não é um estado que o produto alcança.**

**E é aí que a regra vira condição sobre o futuro.** No dia em que a capacidade do kit passar a
recusar escolha, a modalidade com todos os kits esgotados vira beco fechado: o gate exige `kitId`,
a lista vem vazia e nenhum gesto satisfaz a etapa. **Toda tarefa que faça `capacidade` gatear tem
de trazer junto o que a etapa faz quando a lista esvazia** — cair no ramo de "não inclui kit" e
deixar avançar, ou fechar a modalidade com a mesma honestidade do lote esgotado. Ligar a
capacidade sem isso é ligar um beco.

**Vocabulário.** A frase única da RN-504 vale e ganha um terceiro caso: **"Esta inscrição não
inclui kit."** cobre modalidade sem kit, lote com o interruptor desligado e qualquer outro caminho
sem kit. Fica proibida, além do que a RN-504 já proibia, qualquer copy que ofereça **abrir mão** do
kit, sugira desconto por dispensá-lo ou apresente a ausência de kit como escolha econômica. O nome
"Sem kit" **não** é proibido; o preço é. E há um defeito de copy a corrigir: `labelDeltaKit`
renderiza `preco === 0` como "Incluso" (`StepModalidadeKit.tsx:16-17`) e "Incluso no valor"
(`KitsSection.tsx:9-10`), que lê como "você ganha isto" no exato kit criado para ser a saída — o
rótulo tem de sair do conteúdo do kit, não do sinal do preço. As duas cópias da função são a mesma
dívida.

Falsificação: numa modalidade com dois kits pagos e nenhum de preço zero, o checkout não oferece
nenhum caminho de avanço sem kit, e isso é o comportamento esperado; numa modalidade com um kit de
preço zero e sem itens, o rótulo dele não diz "Incluso".

### RN-509 · os dois kits negativos de produção são reparados na fonte e no banco, por operação nomeada

**Existem dois, estão medidos, e nenhum deles foi vendido.** `meia-floripa-2026` tem um kit
`sem_kit` a **−15** e `sao-silvestre-floripa-2025` tem um a **−10**. Os treze restantes vão de 0 a
89. Os dois nasceram do **seed**, não de configuração de organizador:
`functions/src/seed/kits.seed.ts:64` e `functions/scripts/preview-seed-extra.ts:457`, aplicados em
produção pelo runner `functions/scripts/prod-seed-leela-hub.ts:194,203`, que escapa do
`assertEmulatorOnly` de propósito com `LEELA_SEED_PROD_ACK`. Os quinze kits do banco batem 1:1 com
o seed, sem preço editado.

**Nenhum pedido pago referencia qualquer um dos dois**, e a medição é direta em `leela-hub`: zero
inscritos com `kitId == 'sem_kit'`, zero itens de pedido apontando para eles, e zero pagamentos na
São Silvestre. Mais que isso, **`ItemPedido` não tem campo de kit**
(`packages/core/src/pedidos/pedido.ts:123-145`): não existe caminho no modelo para um pedido
apontar para um kit. Os 32 inscritos com `kit == 'sem_kit'` são o rótulo enum da RN-507, todos de
seed, todos sem `pedidoRef`. **Mexer nesses dois kits não mexe em dinheiro já cobrado**, e é essa
medição que torna o reparo seguro.

**O organizador não consegue reparar, e isso não é falha da RN-506.** Os dois eventos têm inscritos
(462 e 40), então `eventoPaiTemVenda()` é verdadeiro: `precoEditavel` (`firestore.rules:999-1003`)
congela o campo `preco`, e o `delete` é negado (`:1025`). A tela reflete isso com
`MSG_PRECO_BLOQUEADO` (`KitEditor.tsx:85`). **O reparo é necessariamente operação de plataforma**,
por `isPlatformAdmin()` ou por Function declarada, e por isso é uma exceção **declarada** à RN-200,
não um contorno dela. A exceção se sustenta porque a medição acima prova que não há comprador para
proteger; sem essa prova, a RN-200 valeria e o reparo não aconteceria.

**O reparo tem duas metades e a ordem importa.** Corrigir só o banco não resolve: o runner de seed
já rodou duas vezes em produção, e uma terceira ressuscita os dois kits. **A fonte vem primeiro**
(`kits.seed.ts:64` e `preview-seed-extra.ts:457`), o banco depois. Um reparo que inverta a ordem
tem janela para regredir sozinho.

**A escolha entre apagar, zerar e renomear é do dono** (item **SEMKIT-1**), com o default proposto
sendo **zerar o preço nos dois**: é o movimento mínimo que satisfaz a regra nova, preserva a saída
que as modalidades 5k e 10k já oferecem, mantém `Kit.capacidade` estável para os dois consumidores
que somam por documento (`aggregateProfessionalDashboard.ts:97`, `distribuicao.ts:199-209`), e
produz exatamente o padrão de que a RN-508 fala. Apagar removeria configuração e deixaria 32
inscritos rotulados "Sem kit" sem kit correspondente no evento — estado legítimo pela RN-507, e
ainda assim uma demonstração incoerente. Renomear acrescenta churn sem resolver nada que zerar não
resolva.

Falsificação: depois do reparo, uma varredura por `kitEhDesconto` sobre os kits de `leela-hub`
devolve zero, e uma execução limpa do seed de produção **não** recria nenhum preço negativo.

## Delta a imagem do kit e a capa do evento passaram a subir de verdade (2026-08-05 · DIAG-STORAGE-CAPA · DEPLOY-TUDO-0805)

Duas metades do mesmo assunto fecharam no mesmo dia, e as duas eram de produção, não de código.

**A primeira.** Toda regra de arquivo deste épico que pergunta ao banco "este evento é da sua
produtora?" estava publicada, correta e **inútil**: quem executa essa pergunta é um agente de
serviço do Google, ele precisa de uma permissão específica para ler o banco, e quem concede é o
próprio comando de deploy — **só quando ele roda em terminal interativo**. Os deploys da casa eram
todos automatizados. Consequência medida: o balde de arquivos estava **vazio, zero objetos em todo
prefixo, desde sempre**. Capa de evento, foto de kit, capa de clube e logo de patrocinador nunca
subiram. A permissão foi concedida em 05/08 e a conferência de prontidão passou a acusá-la todo
deploy.

**A segunda.** O bloco de regra da terceira foto do kit (RN-427) estava no arquivo desde 02/08 e o
que estava publicado era de 29/07. Subiu no deploy de 05/08, como bloco puramente aditivo: nenhuma
linha existente mudou, nenhuma permissão foi afrouxada nem revogada.

Sem regra nova — a RN-227 e a RN-427 seguem como estão. A história é a **S036** no
[[LEELA-E00-fundacao-tecnica]].

**O que este épico precisa guardar:** ⛔ **quando a pergunta ao banco falha por permissão, a
negação sai com a mesma frase de uma negação legítima.** O organizador lê "você não tem permissão
para acessar este arquivo" nos dois casos, e não há como distinguir. É o que fez o defeito durar
meses sem ninguém desconfiar de infraestrutura. A tradução dessa mensagem na tela está escrita e
sem dono.

**Ressalva honesta:** a prova de que o conserto funciona é de **configuração**, não de upload. As
sete conferências pós-deploy são todas de leitura, e nenhuma subiu um arquivo. Trocar a capa de um
evento de verdade continua sendo conferência do dono.

## Delta o painel conta quem pagou (2026-08-11 · D-1008-R19)

A decisão transversal do dono sobre métrica de dinheiro está registrada no E09, com a conta errada
localizada arquivo e linha. Aqui fica a metade que é deste épico: o número de inscritos que a
operação exibe passa a distinguir quem pagou de quem apenas emitiu cobrança.

Esta seção consolida no épico uma história que até hoje só existia na pasta da rodada de 05/08 e
no kanban.

### S221 · o contador de pagantes, separado do que congela a configuração

| Tarefa | Estado | Prova |
|---|---|---|
| S221-T1 · o campo de pagantes nasce no agregado, na mesma transação que já recalcula o financeiro | 📋 | RN-486 |
| S221-T2 · as dezenove telas que mostram "N inscritos" passam a ler o número novo | 📋 | cabeçalho, sub-menu, contagem regressiva, hub, portfólio, esgotado, alertas e vagas restantes |
| S221-T3 · a prova de que a fechadura não se mexeu | 📋 | RN-487; percurso, modalidade, kit, preço e modo de taxa continuam congelados por um evento que só tem PIX pendente |
| S221-T4 · o retrato diário carrega o número novo sem perder o antigo | 📋 | para a série histórica não trocar de significado no meio |

**O cuidado que a história inteira existe para preservar:** o contador que aparece na tela e o
contador que tranca a configuração do evento são coisas diferentes. Separar o primeiro não pode
afrouxar o segundo — é por isso que a T3 é um teste de ataque, e não uma nota.

**Registro da lane METRICAS-PAGANTES-PAINEL (11/08 · D-1008-R19) — a T1 tem menos trabalho do que
parecia:** a contagem de pagantes **já existe publicada** em `eventos/{id}/financeiro/current`,
no campo `inscritos.porStatus` (`Record<StatusInscrito, number>`), escrito por
`agregarFinanceiro` desde o S207-T2. Foi ele que destravou o conserto do ticket médio sem campo
novo e sem leitura nova. A T1 continua de pé para quem precisa do número **no doc do evento**
(as telas que hoje leem `evento.qtdInscritos` não enxergam o agregado financeiro), mas o
mecanismo de origem já está resolvido — é projeção, não cálculo novo.

**E a T2 encolheu junto:** a varredura das superfícies do painel (tabela completa no handoff
`leela-metricas-pagantes-painel.md`) mostrou que as telas que dizem "N inscritos" estão
**CONFORMES** — elas contam inscritos e é isso que o rótulo promete (contagem regressiva, hub,
vagas, ocupação, "Inscrições" da Análise). O defeito era só onde a contagem virava **denominador
de dinheiro**, e havia exatamente um lugar assim no painel inteiro. A T2 vira, então, revisão de
rótulo caso a caso — não troca cega das dezenove telas.
