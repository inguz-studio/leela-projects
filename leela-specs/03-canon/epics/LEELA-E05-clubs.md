# LEELA-E05 · Módulo Clubs

- **Superfície:** Painel
- **Horizonte:** H1 (Onda 1 — Núcleo do Painel)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 🔄 protótipo 11 telas pronto; portar para código
- **Depende de:** LEELA-E00 (fundação), LEELA-E01 (Design System & Shell)
- **De-para:** BH-E05 (Módulo Clubs · Sprint 2)

## Objetivo

Entregar ao **Coordenador de Assessoria** o módulo que ele usa para operar a comunidade do clube dentro do Painel do Profissional: gerenciar membros, desenhar desafios (o motor de engajamento signature da Leela), capturar valor financeiro via afiliação a eventos e patrocínios, comunicar de forma segmentada e configurar identidade/regras do clube. É o núcleo do lock-in emocional (comunidade + desafios) e financeiro (afiliação clube↔organizador) que diferencia a Leela de uma ticketeira.

O épico porta as 11 telas do protótipo (10 implementadas + 1 placeholder) e 5 modais de parcerias para Next.js (App Router) + Firestore, criando as coleções `clubes` e subcoleções (`membros`, `desafios`, `parcerias`, `comunicados`, `permissoesAdmin`) com seus agregados mantidos por Cloud Functions.

## Personas & JTBD

- **Persona primária:** Coordenador de Assessoria — **Felipe Martins**, owner do clube **Corrida Perfeita Sul** (Lagoa da Conceição, Florianópolis/SC; assessoria esportiva; corrida de rua; 120 membros ativos; código de convite **8A3K9**; desde 12 Jan 2022).
- **JTBD atendidos:**
  - "Gerenciar meus atletas e comunidade num lugar só."
  - "Engajar meus atletas com desafios que fazem parte do meu planejamento de treino."
  - "Capturar valor do tráfego que já gero para eventos" (afiliação).
  - "Comunicar com a base de forma segmentada e organizada."
  - "Controlar a identidade e as regras do meu clube."
- **Persona secundária de leitura:** Admin do clube (Camila Ramos), com permissões granulares (RN-142).

## Critérios de sucesso do épico

- Coordenador navega hub → clube → 6 tabs (Overview, Membros, Desafios, Parcerias, Comunicação, Configurações) sem quebra de shell.
- Cria e publica um desafio Modelo C (equilíbrio mínimo por pilar) com cálculo de pontos e bônus corretos (RN-111, RN-115).
- Aceita uma parceria de evento e obtém link master rastreável + cupom, com conversão atribuída dentro da janela (RN-125).
- Envia comunicado segmentado respeitando limite de 4 push/semana e truncamento de 160 chars (RN-133, RN-134).
- Todas as listas têm busca + filtros combináveis + estado vazio + contador "mostrando X de Y".
- Ações destrutivas (desativar patrocinador, remover evento, deletar clube) passam por `ConfirmModal` com preview de consequências (§2.15) e disclaimer LGPD onde irreversível (RN-144).
- Todas as telas consomem tokens e componentes de `packages/design-system`; nenhuma redefine estilo local; §2.16 (flat) respeitada.

## Regras de negócio aplicáveis

- **RN-100** — Clube tem 2 papéis para o profissional: owner ou parceiro.
- **RN-101** — Código de convite: 5 chars alfanuméricos maiúsculos, exclui 0/O/1/I/L.
- **RN-102** — Membro tem 3 status: ativo, novo (entrou < 7 dias), inativo (sem atividade 30+ dias).
- **RN-103** — Membro tem 3 papéis: owner (1 único), admin (N), membro (N).
- **RN-104** — Clube pago é promessa de produto: UI presente, lógica adiada.
- **RN-105** — Sub-afiliação de membros parkada para fase futura.
- **RN-106** — Convite por email aceita no máximo 50 destinatários por envio.
- **RN-110** — Desafio tem 3 modelos de conclusão: A (meta por ação), B (meta de pontos), C (equilíbrio mínimo — signature).
- **RN-111** — Modelo C é o único que opera os 3 pilares simultaneamente (exige mínimo por pilar).
- **RN-112** — Desafio pode ter patrocínio vinculado (institucional do clube).
- **RN-113** — Desafio pode ser vinculado a um evento; o vínculo adiciona a copy "(Preparação para [evento])".
- **RN-114** — Catálogo tem 16 ações em 3 pilares (7 Físico, 5 Mental, 4 Espiritual).
- **RN-115** — 2 bônus de pontuação: +20% se 3 pilares no mesmo dia, +10% se 5+ dias na semana.
- **RN-116** — Recompensa tem 4 tipos: medalha digital, cupom de evento, medalha física, custom.
- **RN-117** — Visibilidade do desafio: só membros, aberto por convite, público.
- **RN-120** — Comissão é definida pelo organizador, não pelo clube; o clube só aceita/recusa.
- **RN-121** — Configuração do programa de afiliação mora no painel do organizador (E04).
- **RN-122** — Modal de termos do programa é read-only para o clube.
- **RN-123** — Patrocinador tem modelo comercial: financeiro (R$/ano) ou permuta.
- **RN-124** — Ações destrutivas (desativar/remover) exigem modal com preview (§2.15).
- **RN-125** — Evento promovido gera link master rastreável + cupom exclusivo + comissão.
- **RN-130** — Comunicado tem 3 estados: enviado, agendado, rascunho.
- **RN-131** — Comunicado tem 2 canais: push, email (ou ambos).
- **RN-132** — Comunicado tem 2 origens: manual, automatizada.
- **RN-133** — Limite do clube: 4 comunicados push por semana.
- **RN-134** — Push tem limite de 160 caracteres no corpo.
- **RN-135** — Email suporta imagem de capa; push não.
- **RN-140** — Visibilidade da página do clube: pública, indexável, privada.
- **RN-141** — Aprovação manual de membros é opcional (toggle).
- **RN-142** — Admin tem 6 permissões configuráveis independentes.
- **RN-143** — Comportamento de membros: aberto, moderado, silencioso.
- **RN-144** — Deletar clube é irreversível, com disclaimer LGPD e export de dados por 90 dias.
- **RN-216** — Nomenclatura "kit" nunca "tier" (herdada do módulo de eventos; aplica-se a copy de recompensa/cupom de evento vinculado).

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Coleções/subcoleções desta fase:

- `clubes/{clubId}` (docId = slug) — `nome`, `descricao`, `slug`, `categoria`, `modalidade`, `localizacao`, `ownerId`, `codigoConvite`, `visibilidade`, `aprovacaoManual`, `modeloEntrada`; ∑ `qtdMembrosAtivos`, `qtdDesafiosAtivos`.
- `clubes/{clubId}/membros/{membroId}` — join Atleta⇄Clube; `atletaId`, 🔁`atletaNome`, `papel`, `entrouEm`, `entrouVia`, ∑`status`.
- `clubes/{clubId}/permissoesAdmin/{profId}` — 6 flags bool (RN-142).
- `clubes/{clubId}/desafios/{desafioId}` + subcoleção de junção `acoes/{acaoId}` (⇄ N:N Desafio↔CatálogoAção).
- `catalogoAcoes/{acaoId}` — global, seed fixo de 16 ações (RN-114).
- `clubes/{clubId}/parcerias/{parceriaId}` — evento_afiliado ou patrocinador; ∑`conversoes`, ∑`valorAReceber`.
- `clubes/{clubId}/comunicados/{comunicadoId}` — ∑`alcance`, ∑`aberturasPct`.
- Leitura de `eventos/{eventoId}/programaAfiliacao` (read-only espelhado — RN-121/122).

Todas as coleções novas são criadas **com Security Rules na mesma task**. Agregados ∑ e campos financeiros: escrita **apenas via Cloud Function** (Admin SDK), nunca do cliente.

## Análise futura (capturado, NÃO-DECIDIDO)

- **Construtor de formulário de perguntas personalizadas (CAP-FORMBUILDER, 2026-07-19).** O Vitor pediu, ao analisar concorrentes, para **registrar e analisar depois** a ideia de o organizador montar perguntas próprias exibidas **na inscrição/entrada de clubes** (e na compra de eventos, ver E12): seleção múltipla/única, sim-não e anexo de arquivo. **Escopo NÃO-DECIDIDO** (onde a resposta vive, quem lê, export, obrigatoriedade por pergunta, limite de perguntas) e riscos a estudar na análise (anexo de arquivo = Storage + LGPD, dado sensível de saúde Art. 11; resposta ligada ao membro/inscrito; benchmark Sympla/TicketSports). **Não gera RN nem entra na fila executável.** Registro canônico: `02-rodadas/2026-07-19-formbuilder/00-captura.md`.

## Fora de escopo (Won't nesta fase)

- Painel financeiro do clube (a coluna "a receber" das parcerias cobre a visão mínima; financeiro completo é E09).
- Lógica de clube pago (RN-104 — só UI com "Em breve").
- Lógica de sub-afiliação de membros (RN-105 — só placeholder, ver S111).
- Configuração do programa de afiliação (mora no painel do organizador — E04).
- Marketplace público de clubes.
- Gateway de pagamento concreto e split real (fica no `PaymentProvider` + E04/E12); aqui a parceria só registra intenção e agregados de conversão.
- Perfil individual de membro (tela dedicada) e modais de "arquivar/transferir clube" (registrados como pendência no protótipo).

---

## User stories

Stories LEELA-S101…S111, de-para BH-101…BH-111. Persona em todas: Coordenador de Assessoria (Felipe Martins / Corrida Perfeita Sul).

> Nota de referências de tela: `Club-Desafios.html` (lista) e `Club-Configuracoes.html` são descritas na SPEC-01 mas **não estão presentes** na pasta `WEB-APPV2 (1)/`; usar a descrição da SPEC-01 §2.5 e §2.10 como fonte para essas duas telas até que os HTMLs sejam disponibilizados (ver "Lacunas" ao fim).

---

### LEELA-S101 · Hub de clubes · (de-para BH-101)

**Como** Coordenador de Assessoria, **quero** ver todos os clubes que gerencio em um hub central, separados entre próprios e parceiros, **para** acessar rapidamente o clube que quero administrar.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Clubs.html`
- **RNs:** RN-100

**Critérios de aceite (Given/When/Then):**
- **Dado** que sou owner de ≥1 clube, **quando** abro o hub, **então** vejo a zona "clubes próprios" com um card por clube (avatar, nome, categoria, contagem de membros).
- **Dado** que participo de clubes como parceiro, **quando** abro o hub, **então** vejo a zona "clubes parceiros" separada.
- **Dado** o topo do hub, **quando** carrega, **então** vejo KPIs globais (total de membros, clubes ativos, desafios em andamento).
- **Dado** um card de clube, **quando** clico, **então** navego para o Overview daquele clube.
- **Dado** o botão "+ Criar clube", **quando** está presente, **então** é visível (fluxo de criação fora do escopo desta fase).
- **Dado** o `•••` de um card, **quando** clico, **então** abre popover (Ver perfil → Overview; Editar configurações → Configurações).

**Tasks:** LEELA-S101-T1, LEELA-S101-T2

#### LEELA-S101-T1 · Modelo de dados `clubes` + tipos + Security Rules

- **Tipo:** data-model · **Depende de:** E00 (Firebase), — · **Bloqueia:** S101-T2, S102-T1, S103-T1 · **Estimativa:** M

**Objetivo**
Criar a coleção `clubes/{clubId}` (docId = slug), os tipos de domínio em `packages/core` e as Security Rules que garantem que o profissional só lê/escreve clubes que possui ou onde é admin.

**Contexto & referências**
- RNs: RN-100 (owner/parceiro), RN-101 (formato do código), RN-104 (modeloEntrada), RN-140 (visibilidade), RN-141 (aprovacaoManual)
- Modelo de dados: `modelo-de-dados-firestore.md` → `clubes/{clubId}`
- Mocks canônicos: Corrida Perfeita Sul (slug `corrida-perfeita-sul`, owner Felipe Martins, código 8A3K9), ver HANDOFF-05

**Arquivos (criar/editar)**
- `packages/core/src/clubs/clube.ts` — `type Clube`, `type PapelClube = 'owner' | 'parceiro'`, factory/validadores
- `packages/core/src/clubs/codigo-convite.ts` — gerador + validador (RN-101)
- `packages/core/src/clubs/index.ts` — barrel export
- `packages/api-client/src/clubs.ts` — leitura tipada de `clubes`
- `firestore.rules` — regras de `clubes/{clubId}`
- `functions/src/seed/clubes.seed.ts` — seed do clube canônico (dev/emulator)

**Passos de implementação**
1. Definir `type Clube` com todos os campos do modelo (`nome`≤60, `descricao`≤280, `slug` único, `categoria`, `modalidade`, `localizacao`, `ownerId`, `codigoConvite`, `visibilidade`, `aprovacaoManual`, `modeloEntrada`, `criadoEm`, `atualizadoEm`) + agregados read-only `qtdMembrosAtivos`, `qtdDesafiosAtivos`.
2. Implementar `gerarCodigoConvite()` e `validarCodigoConvite(codigo)` — 5 chars maiúsculos, alfabeto exclui `0 O 1 I L` (RN-101).
3. Security Rules: leitura por owner (`resource.data.ownerId == request.auth.uid`) ou admin (via `permissoesAdmin`/custom claims); escrita de campos ∑ negada ao cliente; leitura pública quando `visibilidade in ['publica','indexavel']`.
4. Seed do clube canônico para emulator.

**Modelo de dados / contratos**
- Coleção: `clubes/{slug}` — campos acima.
- Tipos: `Clube`, `PapelClube` em `packages/core`.

**Regras de negócio a respeitar**
- RN-100, RN-101 (alfabeto do código), RN-104, RN-140, RN-141.

**Critérios de aceite (testáveis)**
- **Dado** `validarCodigoConvite`, **quando** recebe `8A3K9`, **então** retorna válido; **quando** recebe um código com `0/O/1/I/L`, **então** retorna inválido.
- **Dado** um profissional que não é owner nem admin, **quando** tenta ler um clube privado, **então** as rules negam.

**Testes a escrever**
- unit (core): validador/gerador de código exclui alfabeto proibido (RN-101).
- integração (emulator rules): owner lê/escreve; terceiro não lê clube privado; cliente não escreve `qtdMembrosAtivos`.

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes (core + rules)
- [ ] Security Rules cobrem leitura/escrita por papel; agregados só via Function
- [ ] Sem segredo no cliente; sem `localStorage` para estado de domínio
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Subcoleções `membros`/`desafios`/`parcerias`/`comunicados` (têm tasks próprias). Fluxo de criação de clube pela UI.

#### LEELA-S101-T2 · Tela Hub de clubes (2 zonas + KPIs)

- **Tipo:** screen · **Depende de:** S101-T1, E01-S001-3 (Shell, Card, Popover) · **Estimativa:** M

**Objetivo**
Renderizar o hub com KPIs globais, zona de clubes próprios e zona de clubes parceiros, cards flat e popover de ações por card.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Clubs.html`
- RNs: RN-100
- Mocks: Corrida Perfeita Sul (owner) — as demais entradas de parceiros usam ACATE Run Club como clube parceiro (HANDOFF-05)
- Componentes DS: Card (§2.16 flat), Badge de categoria, Avatar (iniciais CPS), Popover de linha, KPI cards
- Comportamento: C3 (popover — só um aberto por vez, `stopPropagation`)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/page.tsx` — hub
- `apps/painel/app/clubs/_components/ClubeCard.tsx`
- `apps/painel/app/clubs/_components/HubKpis.tsx`

**Passos de implementação**
1. Query `clubes` onde `ownerId == uid` (zona A) e onde o profissional é parceiro (zona B).
2. Renderizar KPIs globais no topo (soma de membros, clubes ativos, desafios em andamento).
3. Card por clube: avatar, nome, badge categoria, contagem de membros; hover sem borda decorativa (§2.16).
4. Popover `•••`: "Ver perfil" → `/clubs/[slug]`; "Editar configurações" → `/clubs/[slug]/configuracoes`.
5. Botão "+ Criar clube" visível (ação fora de escopo — desabilitada/placeholder).

**Modelo de dados / contratos**
- Leitura: `clubes` (owner + parceiro). Sem escrita.

**Regras de negócio a respeitar**
- RN-100 (2 zonas por papel).

**Critérios de aceite (testáveis)**
- **Dado** owner de 1 clube + parceiro de 1 clube, **quando** abro o hub, **então** vejo as duas zonas com os cards corretos.
- **Dado** o `•••` de um card, **quando** abro outro popover, **então** o anterior fecha (C3).

**Testes a escrever**
- unit (componente): render de `ClubeCard` por papel; KPIs somam.
- e2e: click no card navega para o Overview correto.

**Definition of Done**
- [ ] Critérios de aceite passam · Testes verdes
- [ ] Sem borda decorativa em cards (§2.16); tokens do DS (nada hardcoded)
- [ ] Estados vazio/erro/carregando cobertos (§2.12) — skeleton em vez de spinner solto
- [ ] Acessibilidade AA (foco, labels, contraste)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Fluxo de criação de clube.

---

### LEELA-S102 · Dashboard do clube · (de-para BH-102)

**Como** Coordenador de Assessoria, **quero** um dashboard de visão geral ao entrar no clube, **para** entender a saúde da comunidade sem abrir cada seção.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Overview.html`
- **RNs:** RN-101, §2.5 (tabela densa), §2.14 (sub-nav)

**Critérios de aceite (Given/When/Then):**
- **Dado** o topo do dashboard, **quando** carrega, **então** vejo 4 KPIs: membros ativos, desafios ativos, conversão em eventos, receita de parcerias.
- **Dado** o header do clube (96px), **quando** carrega, **então** vejo avatar (CPS), nome + badge categoria, metadados (owner · membros · localização · desde) e o código **8A3K9** copiável (RN-101).
- **Dado** o ícone copy do código, **quando** clico, **então** toast "Código de convite copiado" (C2, sem navegação).
- **Dado** a seção "Novos membros", **quando** carrega, **então** vejo tabela densa (§2.5), não grid de avatares, com popover por linha (Ver perfil / Dar boas-vindas / Promover Admin).
- **Dado** a seção Parcerias em destaque, **quando** clico "Gerenciar →", **então** navego para Parcerias.
- **Dado** a sub-nav do clube, **quando** carrega, **então** a tab Overview está ativa (underline Brasa 2px + contador pill).

**Tasks:** LEELA-S102-T1, LEELA-S102-T2

#### LEELA-S102-T1 · Shell do contexto de clube (layout + header 96px + sub-nav 6 tabs + breadcrumb)

- **Tipo:** screen · **Depende de:** E01-S001-3-T1 (Shell), S101-T1 · **Bloqueia:** S102-T2, S103-T2, S105-T2, S107-T2, S108-T2, S110-T1 · **Estimativa:** M

**Objetivo**
Criar o layout compartilhado do contexto de clube (`app/clubs/[slug]/layout.tsx`) com breadcrumb, header do clube 96px e sub-nav de 6 tabs (§2.14), consumido por todas as tabs.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Overview.html` (header + sub-nav)
- SPEC-01 §1.2 (header) e §1.3 (sub-nav: `Overview · Membros (120) · Desafios (3) · Parcerias · Comunicação · Configurações`)
- RNs: RN-101 (código copiável no header)
- Componentes DS: Header 96px (§2.1), SubNav (§2.14 underline Brasa 2px + contador pill), Breadcrumb, Avatar, Badge
- Comportamento: C1 (sub-nav navega via href), C2 (copiar código), C3 (popover `•••` do header)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/layout.tsx` — carrega clube + monta header + sub-nav
- `apps/painel/app/clubs/[slug]/_components/ClubHeader.tsx`
- `apps/painel/app/clubs/[slug]/_components/ClubSubNav.tsx`

**Passos de implementação**
1. `layout.tsx` resolve `[slug]` → doc `clubes/{slug}`; 404 se não existe/sem acesso.
2. Breadcrumb: `Clubs / [nome] / [seção ativa]`.
3. Header 96px: avatar 72×72 (iniciais), H2 nome + badge categoria, linha de metadados, segunda linha com código copiável + slug público, botões "Ver página pública ↗" + `•••`.
4. SubNav com 6 tabs, contadores em pill (membros/desafios vindos dos agregados), tab ativa por rota (§2.14).
5. Copiar código → toast (C2).

**Modelo de dados / contratos**
- Leitura: `clubes/{slug}` (+ agregados `qtdMembrosAtivos`, `qtdDesafiosAtivos` para os contadores).

**Regras de negócio a respeitar**
- RN-101 (código no header); §2.14 (sub-nav).

**Critérios de aceite (testáveis)**
- **Dado** um slug válido, **quando** entro em qualquer tab, **então** header + sub-nav aparecem e a tab da rota atual está ativa.
- **Dado** slug inexistente ou sem acesso, **quando** acesso, **então** vejo 404/403 (delega a E07).

**Testes a escrever**
- unit (componente): SubNav marca ativa por rota; contador pill lê agregado.
- e2e: clicar numa tab navega e mantém header.

**Definition of Done**
- [ ] Shell padrão + sub-nav §2.14 corretos · Critérios passam · Testes verdes
- [ ] Tokens do DS; §2.16; a11y AA (foco/labels)
- [ ] Estados erro/carregando cobertos · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Conteúdo de cada tab (tasks próprias). Página pública do clube (E12).

#### LEELA-S102-T2 · Conteúdo do Overview (4 KPIs + atividade + parcerias em destaque + tabela de novos membros)

- **Tipo:** screen · **Depende de:** S102-T1, S103-T1 (membros), E01-S001-3-T2 (Table densa) · **Estimativa:** M

**Objetivo**
Renderizar o dashboard do clube: 4 KPIs, seção de atividade recente, parcerias em destaque com link "Gerenciar →", e tabela densa de novos membros com popover.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Overview.html`
- RNs: §2.5 (tabela densa)
- Mocks: KPIs canônicos do clube (120 membros ativos, 3 desafios ativos, conversão/receita de parcerias) + 8 novos membros da HANDOFF-05 (Rafael Pinho, Juliana Mendes, Bruno Silveira, Amanda Coelho, Thiago Lins, Marcos Goulart, Vitória Ribeiro, Lucas Duarte)
- Componentes DS: KPI card, Table densa (§2.5), Popover, Card (§2.16)
- Comportamento: C3 (popover), toasts "Mensagem de boas-vindas enviada para [nome]" e "[nome] promovido a Admin"

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/page.tsx` — Overview
- `apps/painel/app/clubs/[slug]/_components/OverviewKpis.tsx`
- `apps/painel/app/clubs/[slug]/_components/NovosMembrosTable.tsx`

**Passos de implementação**
1. 4 KPIs no topo (membros ativos, desafios ativos, conversão em eventos, receita de parcerias) a partir de agregados.
2. Seção atividade recente (feed resumido; "Ver feed completo →" desabilitado por ora).
3. Seção parcerias em destaque com "Gerenciar →" → `/clubs/[slug]/parcerias`.
4. Tabela densa (§2.5) de novos membros (8 linhas) com popover por linha; "Dar boas-vindas"/"Promover para Admin" → toast.
5. "Ver todos →" → `/clubs/[slug]/membros`.

**Modelo de dados / contratos**
- Leitura: `clubes/{slug}` (agregados) + `membros` ordenados por `entrouEm` desc (limite 8).

**Regras de negócio a respeitar**
- §2.5 (tabela densa); RN-102 (status exibido na tabela).

**Critérios de aceite (testáveis)**
- **Dado** o Overview, **quando** carrega, **então** vejo 4 KPIs e a tabela densa de novos membros (nunca grid de avatares).
- **Dado** "Promover para Admin" no popover, **quando** clico, **então** toast de confirmação (sem escrita real nesta fase de UI).

**Testes a escrever**
- unit (componente): render de KPIs e tabela de novos membros.
- e2e: "Gerenciar →" e "Ver todos →" navegam corretamente.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.5 (linha 64px, header uppercase); §2.16 (cards flat); tokens do DS
- [ ] Estados vazio/erro/carregando (§2.12) · a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Feed de atividade real; perfil individual de membro.

---

### LEELA-S103 · Gestão de membros · (de-para BH-103)

**Como** Coordenador de Assessoria, **quero** ver e filtrar a lista completa de membros, **para** encontrar rapidamente um atleta e gerenciar seu papel ou permanência.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Membros.html`
- **RNs:** RN-102, RN-103, §2.5

**Critérios de aceite (Given/When/Then):**
- **Dado** 120 membros (12 mock visíveis), **quando** abro a tela, **então** vejo tabela densa (§2.5) com contador "mostrando X de Y".
- **Dado** a busca, **quando** digito "Camila", **então** só linhas que casam aparecem e o contador atualiza (C6).
- **Dado** os chips de status (ativo/novo/inativo), **quando** seleciono um, **então** filtra exclusivo dentro do grupo (C4); idem chips de papel.
- **Dado** busca + chips juntos, **quando** combino, **então** o filtro é a interseção.
- **Dado** filtro que zera resultados, **quando** aplico, **então** EmptyState "Nenhum membro encontrado com os filtros aplicados" (C7).
- **Dado** o `•••` de uma linha, **quando** clico, **então** popover (Ver perfil / Promover para Admin / Promover para Owner / Remover membro).

**Tasks:** LEELA-S103-T1, LEELA-S103-T2

#### LEELA-S103-T1 · Modelo `membros` + derivação de status + Function de agregados + Rules

- **Tipo:** data-model · **Depende de:** S101-T1 · **Bloqueia:** S103-T2, S102-T2 · **Estimativa:** M

**Objetivo**
Criar a subcoleção `clubes/{clubId}/membros/{membroId}`, a derivação de `status` em `core`, a Cloud Function que mantém `status` e os agregados `qtdMembrosAtivos`, e as Security Rules.

**Contexto & referências**
- RNs: RN-102 (status por data), RN-103 (papéis)
- Modelo: `modelo-de-dados-firestore.md` → `membros` + agregados ∑
- Mocks: 12 membros canônicos (Felipe owner; Camila/André admin; Mariana/Larissa/Helena "nova"; Thiago inativo 45d) — HANDOFF-05

**Arquivos (criar/editar)**
- `packages/core/src/clubs/membro.ts` — `type Membro`, `type StatusMembro`, `type PapelMembro`, `derivarStatus(entrouEm, ultimaAtividadeEm, hoje)`
- `functions/src/clubs/onMembroWrite.ts` — mantém `status` + `qtdMembrosAtivos`
- `functions/src/clubs/recalcularStatusMembros.ts` — cron diário (novo→ativo após 7d; ativo→inativo após 30d)
- `firestore.rules` — regras de `membros`
- `functions/src/seed/membros.seed.ts` — 12 membros canônicos

**Passos de implementação**
1. `type Membro` (`atletaId`, 🔁`atletaNome`, `papel`, `entrouEm`, `entrouVia`, `status`, `ultimaAtividadeEm`).
2. `derivarStatus`: novo se `entrouEm` < 7 dias; inativo se sem atividade 30+ dias; senão ativo (RN-102). Função pura em `core`.
3. Function onWrite mantém `status` e incrementa/decrementa `qtdMembrosAtivos` (idempotente).
4. Cron diário recalcula `status` por data.
5. Rules: leitura por owner/admin do clube; escrita de `status`/agregados só via Function.

**Modelo de dados / contratos**
- `clubes/{clubId}/membros/{membroId}` — campos acima.
- Tipos: `Membro`, `StatusMembro = 'ativo'|'novo'|'inativo'`, `PapelMembro = 'owner'|'admin'|'membro'`.

**Regras de negócio a respeitar**
- RN-102 (limiares 7d/30d), RN-103 (owner único).

**Critérios de aceite (testáveis)**
- **Dado** `derivarStatus` com `entrouEm` há 3 dias, **então** retorna "novo"; há 40 dias sem atividade → "inativo"; ativo recente → "ativo".
- **Dado** onWrite de novo membro, **então** `qtdMembrosAtivos` incrementa uma vez (reprocessar não duplica).

**Testes a escrever**
- unit (core): `derivarStatus` nos 3 limiares.
- integração (emulator): agregado idempotente; rules impedem escrita de `status` pelo cliente.

**Definition of Done**
- [ ] Critérios passam · Testes verdes (core + Function + rules)
- [ ] Agregados idempotentes; escrita só via Function
- [ ] Rules por papel testadas · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
UI da lista (S103-T2). Perfil individual.

#### LEELA-S103-T2 · Tela de membros (tabela densa + busca + filtros combináveis + popover)

- **Tipo:** screen · **Depende de:** S103-T1, S102-T1, E01-S001-3-T2 (Table densa/EmptyState/Popover) · **Estimativa:** M

**Objetivo**
Renderizar a tabela densa de membros com busca em tempo real, filtros combináveis (status × papel), estado vazio, contador e popover de ações por linha.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Membros.html`
- RNs: RN-102, RN-103, §2.5
- Mocks: 120 membros (12 visíveis) — HANDOFF-05
- Componentes DS: Table densa (§2.5), Chip de filtro, Input de busca, EmptyState, Popover
- Comportamento: C4 (chips exclusivos por grupo), C6 (busca), C7 (empty), C3 (popover)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/membros/page.tsx`
- `apps/painel/app/clubs/[slug]/membros/_components/MembrosTable.tsx`
- `apps/painel/app/clubs/[slug]/membros/_components/MembrosFilters.tsx`

**Passos de implementação**
1. Query `membros` (paginada). `status` já vem derivado.
2. Busca client-side por nome + chips exclusivos de status e de papel; combinação = interseção.
3. EmptyState quando zera; contador "mostrando X de Y".
4. Popover por linha: Ver perfil (desabilitado), Promover para Admin (toast), Promover para Owner (§2.15 — abre ConfirmModal de transferência; no protótipo cursor default, aqui usar ConfirmModal), Remover membro (§2.15 ConfirmModal).
5. "+ Convidar membros" → abre modal de convite (S104).

**Modelo de dados / contratos**
- Leitura: `membros`. Escrita de papel/remoção via Function (não confiar no cliente).

**Regras de negócio a respeitar**
- RN-102, RN-103; §2.5; §2.15 para remover/transferir.

**Critérios de aceite (testáveis)**
- **Dado** 120 membros, **quando** busco "Camila", **então** só linhas que casam aparecem e o contador atualiza.
- **Dado** filtro "inativo", **quando** nenhum casa, **então** EmptyState com a copy padrão.
- **Dado** "Remover membro", **quando** confirmo no ConfirmModal, **então** vejo preview de consequências antes de confirmar (§2.15).

**Testes a escrever**
- unit (componente): filtro combinado status × papel + busca.
- e2e: busca + filtro combinado atualiza contador; abrir modal de convite.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.5; §2.16; §2.15 (ConfirmModal em remover/transferir); tokens do DS
- [ ] EmptyState + contador; estados erro/carregando (§2.12); a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Perfil individual do membro.

---

### LEELA-S104 · Convidar membros · (de-para BH-104)

**Como** Coordenador de Assessoria, **quero** convidar atletas por link, código ou email, **para** crescer a comunidade pelos canais que fizerem sentido.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Membros-Modal-Convite.html`
- **RNs:** RN-101, RN-106

**Critérios de aceite (Given/When/Then):**
- **Dado** o modal, **quando** abre, **então** vejo 3 tabs internas (Link público, Por código, Por email) com a tab Link ativa por padrão.
- **Dado** a tab Link, **quando** clico "Copiar", **então** toast "Link de convite copiado"; botões WhatsApp/Telegram/QR disparam toasts (C18).
- **Dado** a tab Código, **quando** vejo o código, **então** é **8A3K9** em destaque + botão copiar; o botão principal navega de volta após 1s.
- **Dado** a tab Email, **quando** deixo vazio e envio, **então** toast de erro "Adicione pelo menos 1 email"; **quando** informo emails válidos (≤50), **então** spinner + toast "[N] convite(s) enviado(s)" + navega.
- **Dado** mais de 50 emails, **quando** tento enviar, **então** validação bloqueia (RN-106).
- **Dado** o modal, **quando** aciono Cancelar/X/overlay/Esc, **então** fecha e volta para Membros (4 vias, C10).

**Tasks:** LEELA-S104-T1

#### LEELA-S104-T1 · Modal de convite (3 tabs + validações + 4 vias de fechamento)

- **Tipo:** screen · **Depende de:** S103-T2, S101-T1 (código), E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Implementar o modal de convite com 3 canais (link/código/email), validação de email (não vazio, máx 50) e as 4 vias de fechamento.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Membros-Modal-Convite.html`
- RNs: RN-101 (código), RN-106 (máx 50 emails)
- Mocks: código 8A3K9; slug público `be-hero.com.br/c/corrida-perfeita-sul` (usar domínio Leela quando definido)
- Componentes DS: Modal (largura 560), Tabs internas (§2.7 — todas no DOM), Input/Textarea, Button, Toast
- Comportamento: C10 (4 vias), C18 (compartilhamento), validação de email

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/membros/_components/ConviteModal.tsx`
- `packages/core/src/clubs/convite.ts` — `parseEmails(texto)`, `validarConvite(emails)` (não vazio, ≤50 — RN-106)

**Passos de implementação**
1. Modal com 3 tabs internas (todas no DOM, §2.7); Link ativa por padrão.
2. Tab Link: link copiável + WhatsApp/Telegram/QR (toasts C18).
3. Tab Código: 8A3K9 grande + copiar; botão principal "Concluído" navega após 1s.
4. Tab Email: textarea (vírgula/linha), `parseEmails` + `validarConvite`; vazio → toast erro; >50 → bloqueia (RN-106); válido → spinner + toast "[N] convite(s) enviado(s)" + navega.
5. Fechamento por Cancelar/X/overlay/Esc (C10); click dentro do card não fecha.

**Modelo de dados / contratos**
- Sem coleção nova nesta fase (envio real de email/convite é integração futura); usa `codigoConvite` do clube.

**Regras de negócio a respeitar**
- RN-101 (código), RN-106 (≤50 emails).

**Critérios de aceite (testáveis)**
- **Dado** `validarConvite` com 51 emails, **então** inválido; com 0 emails, então inválido; com 1–50, válido.
- **Dado** o modal aberto, **quando** pressiono Esc, **então** fecha e volta para Membros.

**Testes a escrever**
- unit (core): `parseEmails` (vírgula/linha/espaços) + limite 50.
- unit (componente): troca de tabs; validação de email vazio dispara toast.
- e2e: 4 vias de fechamento.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Modal com 4 vias de fechamento; §2.7 (tabs no DOM); tokens do DS
- [ ] a11y AA (foco preso no modal, labels); Toast em toda ação
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Envio real de email/push e criação de registros de convite pendente (integração futura).

---

### LEELA-S105 · Listar e gerir desafios · (de-para BH-105)

**Como** Coordenador de Assessoria, **quero** ver todos os desafios (ativos e encerrados) com progresso coletivo, **para** acompanhar engajamento e decidir quando criar ou encerrar desafios.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Desafios.html` (ver nota de lacuna — usar SPEC-01 §2.5)
- **RNs:** RN-110, RN-111, RN-112, RN-113, RN-114, RN-115

**Critérios de aceite (Given/When/Then):**
- **Dado** o topo, **quando** carrega, **então** vejo 4 KPIs (desafios ativos, membros participando, taxa de conclusão, pontos distribuídos).
- **Dado** a seção ativos, **quando** carrega, **então** vejo 3 cards grandes com progresso coletivo e distribuição por pilar (Físico/Mental/Espiritual).
- **Dado** a seção encerrados, **quando** carrega, **então** vejo 2 cards menores.
- **Dado** os filtros, **quando** uso chips de status (exclusivos, C4) e chips de modelo A/B/C (toggles, C5) + busca, **então** a lista filtra e mostra EmptyState quando zera.
- **Dado** o `•••` de um card, **quando** clico, **então** popover com 6 ações (Ver detalhes, Editar, Duplicar, Notificar participantes, Arquivar, Encerrar antecipadamente).
- **Dado** "Editar", **quando** clico, **então** navego para o editor `?id=[slug]`.

**Tasks:** LEELA-S105-T1, LEELA-S105-T2

#### LEELA-S105-T1 · Modelo `desafios` + `catalogoAcoes` (seed 16 ações) + junção `acoes` + Rules

- **Tipo:** data-model · **Depende de:** S101-T1 · **Bloqueia:** S105-T2, S106-T1 · **Estimativa:** M

**Objetivo**
Criar `clubes/{clubId}/desafios/{desafioId}`, o catálogo global `catalogoAcoes` (seed de 16 ações em 3 pilares), a subcoleção de junção N:N `desafios/{id}/acoes`, e as Security Rules.

**Contexto & referências**
- RNs: RN-110 a RN-117
- Modelo: `modelo-de-dados-firestore.md` → `desafios`, `catalogoAcoes`, junção `acoes`
- Mocks: 16 ações exatas (Físico 7, Mental 5, Espiritual 4) + 3 modelos + 5 desafios canônicos — HANDOFF-05

**Arquivos (criar/editar)**
- `packages/core/src/clubs/desafio.ts` — `type Desafio`, `type ModeloDesafio = 'A'|'B'|'C'`, `type Pilar = 'fisico'|'mental'|'espiritual'`, `type Recompensa`, `type VisibilidadeDesafio`
- `packages/core/src/clubs/catalogo-acoes.ts` — `type Acao` + as 16 ações
- `functions/src/seed/catalogoAcoes.seed.ts` — seed exato (Correr `footprints` 2pt/km, Meditar `sparkles` 5pt/10min, ...)
- `functions/src/seed/desafios.seed.ts` — 5 desafios canônicos
- `firestore.rules` — `desafios` + `acoes` + `catalogoAcoes` (leitura global)

**Passos de implementação**
1. `type Desafio` com todos os campos do modelo (`nome`, `descricao`, `modelo`, `dataInicio`, `dataFim`, `status`, `patrocinioId?`, `eventoVinculadoId?`, `metaTotalPontos?`, `minimoPorPilar?`, `recompensaTipo`, `visibilidade`).
2. `catalogoAcoes` global (seed fixo, 16 ações, RN-114) com `nome`, `pilar`, `unidade`, `pontosBase`, `icone`.
3. Junção `acoes/{acaoId}`: `{ acaoRef, meta? }` (meta só no Modelo A).
4. Rules: `catalogoAcoes` leitura global autenticada; `desafios` leitura/escrita por owner/admin; agregados de progresso só via Function.

**Modelo de dados / contratos**
- `clubes/{clubId}/desafios/{desafioId}` + `.../acoes/{acaoId}`; `catalogoAcoes/{acaoId}` global.

**Regras de negócio a respeitar**
- RN-110 (3 modelos), RN-111 (Modelo C 3 pilares), RN-114 (16 ações), RN-116 (4 recompensas), RN-117 (3 visibilidades).

**Critérios de aceite (testáveis)**
- **Dado** o seed, **quando** rodo no emulator, **então** `catalogoAcoes` tem exatamente 16 docs (7/5/4 por pilar) com ícones e pontos corretos.
- **Dado** um desafio Modelo A, **quando** persisto ações, **então** cada `acao` tem `meta`; Modelo B/C não exigem `meta` por ação.

**Testes a escrever**
- integração (emulator): seed cria 16 ações; junção `acoes` persiste; rules por papel.
- unit (core): tipos e guards de modelo.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Seed exato (16 ações) · Rules por papel · agregados só via Function
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Cálculo de pontos/bônus (S106-T1). UI (S105-T2, S106-T2).

#### LEELA-S105-T2 · Tela lista de desafios (KPIs + cards ativos/encerrados + filtros + popover)

- **Tipo:** screen · **Depende de:** S105-T1, S102-T1, E01-S001-3-T4 (Card Desafio) · **Estimativa:** L

**Objetivo**
Renderizar a lista de desafios com 4 KPIs, cards de ativos (progresso por pilar) e encerrados, filtros combináveis e popover de 6 ações por card.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Desafios.html` (usar SPEC-01 §2.5 — ver lacuna)
- RNs: RN-110 a RN-115
- Mocks: 3 ativos (Preparação Meia Floripa C 62%; Morro da Cruz A 47%; Marcha Mental B 78%) + 2 encerrados (Verão Leve, Desconexão Rota do Sol) — HANDOFF-05
- Componentes DS: KPI card, Card Desafio (progress-bar Vitória, 100% elev-brand), Chip filtro, EmptyState, Popover
- Comportamento: C4 (status exclusivo), C5 (modelo toggles), C6 (busca), C7 (empty), C3 (popover)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/desafios/page.tsx`
- `apps/painel/app/clubs/[slug]/desafios/_components/DesafioCard.tsx`
- `apps/painel/app/clubs/[slug]/desafios/_components/DesafiosFilters.tsx`

**Passos de implementação**
1. Query `desafios` do clube; separar `status` ativo/encerrado.
2. 4 KPIs; cards ativos grandes com distribuição por pilar; encerrados menores.
3. Filtros: chips de status exclusivos + chips de modelo A/B/C toggles + busca; EmptyState + contador.
4. Popover (6 ações): Ver detalhes (desabilitado), Editar → `desafios/editar?id=[slug]`, Duplicar (toast), Notificar participantes (toast), Arquivar (toast), Encerrar antecipadamente (§2.15).
5. "+ Criar desafio" → `desafios/editar` (create).

**Modelo de dados / contratos**
- Leitura: `desafios` + agregados de progresso.

**Regras de negócio a respeitar**
- RN-110 (badge de modelo), RN-112/113 (indicadores de patrocínio/evento).

**Critérios de aceite (testáveis)**
- **Dado** chip modelo "C" ativo + busca "Floripa", **quando** aplico, **então** só Preparação Meia Floripa aparece.
- **Dado** filtro que zera, **quando** aplico, **então** EmptyState "Nenhum desafio encontrado com os filtros aplicados".

**Testes a escrever**
- unit (componente): filtros status(exclusivo) × modelo(toggle) + busca.
- e2e: "+ Criar desafio" e "Editar" navegam para o editor nos modos corretos.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.16; Card Desafio do DS; §2.15 em "encerrar"; tokens do DS
- [ ] EmptyState + contador; estados erro/carregando (§2.12); a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Relatório detalhado do desafio; "Ver no app".

---

### LEELA-S106 · Criar/editar desafio · (de-para BH-106)

**Como** Coordenador de Assessoria, **quero** criar ou editar um desafio definindo modelo, ações, metas, recompensa e visibilidade, **para** desenhar desafios alinhados ao meu planejamento de treino.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Desafios-Editar.html`
- **RNs:** RN-110, RN-111, RN-112, RN-113, RN-114, RN-115, RN-116, RN-117

**Critérios de aceite (Given/When/Then):**
- **Dado** o editor, **quando** abre sem `?id`, **então** modo create (campos vazios); com `?id=[slug]`, modo edit (pré-preenchido).
- **Dado** o seletor de modelo A/B/C, **quando** escolho, **então** os campos de meta exibidos mudam (A: meta por ação; B: meta de pontos; C: meta + mínimo por pilar) (C12).
- **Dado** o Modelo C, **quando** tento publicar sem mínimo por pilar, **então** a validação bloqueia (RN-111).
- **Dado** o catálogo de 16 ações em tabs por pilar, **quando** marco/edito uma ação, **então** o resumo ao vivo e o preview do card recalculam (C16), aplicando os bônus RN-115 no cálculo exibido.
- **Dado** que vinculo um evento, **quando** confirmo, **então** o sistema adiciona a copy "(Preparação para [evento])" (RN-113).
- **Dado** "Salvar rascunho", **quando** clico, **então** spinner + toast e permaneço; "Publicar" navega + notifica.

**Tasks:** LEELA-S106-T1, LEELA-S106-T2

#### LEELA-S106-T1 · Motor de pontuação + validação de modelo (core)

- **Tipo:** api/function · **Depende de:** S105-T1 · **Bloqueia:** S106-T2 · **Estimativa:** M

**Objetivo**
Implementar em `packages/core` o cálculo de pontos por ação, os 2 bônus (RN-115) e as validações de publicação por modelo (A/B/C), incluindo mínimo por pilar do Modelo C.

**Contexto & referências**
- RNs: RN-110, RN-111, RN-114, RN-115, RN-116, RN-117
- Fonte: HANDOFF-05 (pontos base por ação, 2 bônus, 3 modelos)
- Estratégia de testes: cobertura alta em `core` — bônus e mínimo por pilar são casos prioritários

**Arquivos (criar/editar)**
- `packages/core/src/clubs/pontuacao.ts` — `calcularPontos(registros)` com bônus +20% (3 pilares/dia) e +10% (5+ dias/semana)
- `packages/core/src/clubs/desafio-validacao.ts` — `validarPublicacao(desafio, acoes)` por modelo
- `packages/core/src/clubs/evento-vinculo.ts` — `copyPreparacao(nomeEvento)` → "(Preparação para [evento])"

**Passos de implementação**
1. `calcularPontos`: soma `pontosBase × quantidade` por ação; aplica +20% quando 3 pilares no mesmo dia; +10% quando 5+ dias na semana (regras de cálculo, não dados).
2. `validarPublicacao`: Modelo A exige `meta` em cada ação obrigatória; Modelo B exige `metaTotalPontos`; Modelo C exige `metaTotalPontos` + `minimoPorPilar` para os 3 pilares (RN-111).
3. `copyPreparacao` gera a copy de vínculo de evento (RN-113).

**Modelo de dados / contratos**
- Funções puras em `core` (sem I/O); consumidas pelo editor e por Functions de agregado.

**Regras de negócio a respeitar**
- RN-111 (mínimo por pilar), RN-113 (copy), RN-115 (bônus exatos).

**Critérios de aceite (testáveis)**
- **Dado** registros em 3 pilares no mesmo dia, **então** `calcularPontos` aplica +20%; **dado** 5+ dias na semana, **então** +10%; ambos acumulam.
- **Dado** Modelo C sem mínimo em um pilar, **então** `validarPublicacao` retorna erro (RN-111).
- **Dado** vínculo com "Meia Maratona Floripa 2026", **então** `copyPreparacao` retorna "(Preparação para Meia Maratona Floripa 2026)".

**Testes a escrever**
- unit (core): bônus (cada um e combinados); validação por modelo A/B/C; copy de vínculo.

**Definition of Done**
- [ ] Critérios passam · Testes verdes (cobertura alta em core)
- [ ] Sem `any` não justificado · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Persistência/agregação em Firestore (Function de progresso vive no modelo de dados; aqui só a regra pura).

#### LEELA-S106-T2 · Editor de desafio (layout 70/30 + modelo dual + resumo/preview ao vivo)

- **Tipo:** screen · **Depende de:** S106-T1, S105-T1, S102-T1, E01-S001-3-T4 (Card Desafio) · **Estimativa:** L

**Objetivo**
Implementar o editor de desafio em layout 70/30, com seletor de modelo que altera campos, catálogo de 16 ações em tabs por pilar, e coluna direita sticky com resumo ao vivo + preview do card no app + dica contextual.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Desafios-Editar.html`
- RNs: RN-110 a RN-117
- Mocks: 16 ações (tabs por pilar), recompensa padrão "Cupom para evento vinculado · R$ 20 off" (RN-216: "kit" nunca "tier" na copy), desafios canônicos para modo edit — HANDOFF-05
- Componentes DS: Layout 70/30, Cards de seção, Tabs (§2.7), Radio group (C12), Card Desafio (preview), Button (1 Primary), Toast
- Comportamento: C12 (radios), C16 (preview ao vivo), C8/C9 (salvar/cancelar)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/desafios/editar/page.tsx` — modo dual via `?id`
- `apps/painel/app/clubs/[slug]/desafios/editar/_components/{IdentidadeCard,ModeloCard,AcoesMetasCard,RecompensaVisibilidadeCard,ResumoAoVivo,PreviewCard}.tsx`

**Passos de implementação**
1. Layout 70/30; esquerda com 4 cards (identidade, modelo, ações e metas, recompensa e visibilidade).
2. Seletor de modelo A/B/C mostra/esconde campos de meta (C12); Modelo C exibe mínimo por pilar.
3. Catálogo de 16 ações em tabs por pilar; marcar ação atualiza resumo (C16) usando `calcularPontos` (S106-T1).
4. Coluna direita sticky: resumo ao vivo que recalcula + preview do Card Desafio + dica contextual.
5. Vincular evento adiciona copy "(Preparação para [evento])" via `copyPreparacao`.
6. Salvar rascunho (permanece, C8) / Publicar (valida com `validarPublicacao`, navega + notifica).

**Modelo de dados / contratos**
- Escrita: `desafios/{id}` + junção `acoes`. `status` rascunho/ativo. Agregados só via Function.

**Regras de negócio a respeitar**
- RN-110/111 (modelo/mínimo por pilar), RN-113 (copy), RN-116 (recompensa), RN-117 (visibilidade), RN-216 (copy "kit").

**Critérios de aceite (testáveis)**
- **Dado** modo edit `?id=preparacao-meia-floripa`, **quando** abro, **então** os campos vêm pré-preenchidos com o mock.
- **Dado** Modelo C sem mínimo por pilar, **quando** clico Publicar, **então** vejo erro e não navego (RN-111).
- **Dado** marco uma ação, **quando** edito a meta, **então** resumo e preview recalculam ao vivo (C16).

**Testes a escrever**
- unit (componente): troca de modelo mostra/esconde campos; recálculo de resumo.
- e2e: criar/publicar desafio Modelo C com mínimo por pilar (fluxo crítico da estratégia de testes).

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.16; §2.7 (tabs no DOM); máx 1 Primary; copy "kit" (RN-216); tokens do DS
- [ ] Estados vazio/erro/carregando (§2.12); a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Encerramento antecipado; notificação real a participantes (integração de push).

---

### LEELA-S107 · Gestão de parcerias · (de-para BH-107)

**Como** Coordenador de Assessoria, **quero** gerenciar eventos que promovo, patrocinadores institucionais e convites de parceria, **para** capturar valor financeiro do tráfego que gero e formalizar apoios ao clube.

- **MoSCoW:** Must · **Estimativa:** XL · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Parcerias.html` + `Club-Parcerias-Modal-Adicionar.html` + `Club-Parcerias-Modal-Desativar.html` + `Club-Parcerias-Modal-Remover-Evento.html` + `Club-Parcerias-Modal-Termos-Programa.html`
- **RNs:** RN-120, RN-121, RN-122, RN-123, RN-124, RN-125

**Critérios de aceite (Given/When/Then):**
- **Dado** convites pendentes (2 cards), **quando** clico "Aceitar parceria", **então** spinner + toast + o card some + badge atualiza; "Recusar" faz o card sumir com fade.
- **Dado** o bloco de eventos promovidos, **quando** carrega, **então** vejo tabela densa (3 eventos) com link master + QR + info de comissão por linha.
- **Dado** a comissão, **quando** clico no info, **então** abre o modal de termos read-only (RN-122); o clube nunca edita a comissão (RN-120/121).
- **Dado** o bloco de patrocinadores (3 cards), **quando** clico "+ Adicionar patrocinador", **então** abre o modal de cadastro; "Desativar"/"Pausar" abrem o modal de desativação com preview (§2.15, RN-124).
- **Dado** "Remover parceria" de um evento, **quando** clico, **então** abre o modal de remoção com preview de consequências (§2.15).

**Tasks:** LEELA-S107-T1, LEELA-S107-T2, LEELA-S107-T3, LEELA-S107-T4, LEELA-S107-T5

#### LEELA-S107-T1 · Modelo `parcerias` + espelho read-only do programa + agregados + Rules

- **Tipo:** data-model · **Depende de:** S101-T1 · **Bloqueia:** S107-T2..T5 · **Estimativa:** M

**Objetivo**
Criar `clubes/{clubId}/parcerias/{parceriaId}` (evento_afiliado e patrocinador), o espelho read-only dos termos do programa de afiliação, os agregados `conversoes`/`valorAReceber` (via Function) e as Security Rules.

**Contexto & referências**
- RNs: RN-120 (comissão do organizador), RN-121 (programa mora no organizador), RN-122 (read-only), RN-123 (financeiro/permuta), RN-125 (link+cupom+comissão)
- Modelo: `modelo-de-dados-firestore.md` → `parcerias` + `programaAfiliacao`
- Mocks: 3 eventos ativos (Meia Floripa 10%, Trail Ratones 8%, Corrida da Ponte 6%), 2 convites (Maratona 2027 12%, ACATE Corporativo 5%), 3 patrocinadores (ACATE permuta, CDL R$12.000/ano, Secretaria permuta) — HANDOFF-05

**Arquivos (criar/editar)**
- `packages/core/src/clubs/parceria.ts` — `type Parceria` (union evento_afiliado | patrocinador), `type StatusParceria`, `type ModeloComercial`
- `functions/src/clubs/onConversao.ts` — mantém `conversoes` + `valorAReceber` (idempotente; janela de atribuição)
- `firestore.rules` — `parcerias`: clube lê; termos/comissão read-only; agregados só via Function
- `functions/src/seed/parcerias.seed.ts` — 3 eventos + 2 convites + 3 patrocinadores

**Passos de implementação**
1. `type Parceria` com `tipo`, `status`; ramo evento_afiliado (`eventoId`, `organizadorId`, `programaAfiliacaoRef`, 🔁`comissaoPct`/`cupom`/`linkMaster`/`janelaAtribuicaoDias`, ∑`conversoes`/`valorAReceber`); ramo patrocinador (`nome`, `modeloComercial`, `valorAnual?`, `contrapartida`, `contratoUrl?`).
2. Espelhar termos do programa como cópia read-only (RN-121/122).
3. Function de conversão: incrementa `conversoes` e `valorAReceber` só se dentro da `janelaAtribuicaoDias`; idempotente.
4. Rules: clube não escreve `comissaoPct`/termos/agregados; só altera `status` (aceitar/recusar/pausar).

**Modelo de dados / contratos**
- `clubes/{clubId}/parcerias/{parceriaId}` — conforme modelo de dados.

**Regras de negócio a respeitar**
- RN-120, RN-121, RN-122 (comissão/termos read-only para o clube), RN-123, RN-125.

**Critérios de aceite (testáveis)**
- **Dado** o clube, **quando** tenta escrever `comissaoPct`, **então** as rules negam (RN-120/122).
- **Dado** uma conversão fora da janela de atribuição, **quando** processada, **então** não incrementa `conversoes` (RN-125).
- **Dado** reprocessar a mesma conversão, **então** o agregado não duplica.

**Testes a escrever**
- integração (emulator): rules read-only de comissão; agregado idempotente e sensível à janela.
- unit (core): guards do union evento_afiliado/patrocinador.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Comissão/termos read-only (RN-120/122); agregados só via Function e idempotentes
- [ ] Rules por papel · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Split de pagamento real (PaymentProvider/E04); configuração do programa (E04).

#### LEELA-S107-T2 · Tela de parcerias (3 blocos + aceitar/recusar convite + ações rápidas)

- **Tipo:** screen · **Depende de:** S107-T1, S102-T1, E01-S001-3-T2 (Table densa) · **Estimativa:** L

**Objetivo**
Renderizar a tela de parcerias com bloco de convites pendentes (aceitar/recusar animados), bloco de eventos promovidos (tabela densa) e bloco de patrocinadores (cards), com ações rápidas (copiar link master, QR, ver termos).

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Parcerias.html`
- RNs: RN-120, RN-121, RN-122, RN-124, RN-125
- Mocks: 3 eventos + 2 convites + 3 patrocinadores; performance da Meia Floripa (234 cliques, 28 conversões, 12%, R$528 a receber) — HANDOFF-05
- Componentes DS: Table densa (§2.5), Card (§2.16), Badge (convite novo `badge-brasa`), Popover, Toast
- Comportamento: C3 (popover), C18 (QR/link), C15 (destrutivas → modal)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/parcerias/page.tsx`
- `apps/painel/app/clubs/[slug]/parcerias/_components/{ConvitesPendentes,EventosPromovidosTable,PatrocinadoresCards}.tsx`

**Passos de implementação**
1. Bloco convites pendentes: 2 cards com "Ver termos completos ↗" (→ modal termos), "Aceitar parceria" (spinner + toast + card some + badge atualiza), "Recusar" (fade + toast).
2. Bloco eventos promovidos: tabela densa (link master copiável, QR, info de comissão → modal termos, `•••` 4 opções).
3. Bloco patrocinadores: 3 cards; "+ Adicionar" → modal; "Desativar"/`•••`"Pausar" → modal desativar; "Renovar" (toast); "Histórico de pagamentos" (toast diferente CDL financeiro vs permuta).
4. "Remover parceria" (popover de evento) → modal remover-evento.

**Modelo de dados / contratos**
- Leitura: `parcerias`. Escrita: só `status` (aceitar/recusar/pausar) via Function.

**Regras de negócio a respeitar**
- RN-120/121/122 (comissão read-only), RN-124 (destrutivas com preview), RN-125.

**Critérios de aceite (testáveis)**
- **Dado** um convite pendente, **quando** aceito, **então** spinner → toast → card some → badge atualiza.
- **Dado** o info de comissão, **quando** clico, **então** abre o modal de termos read-only (não edito comissão).

**Testes a escrever**
- unit (componente): render dos 3 blocos; aceitar/recusar altera lista.
- e2e: aceitar parceria → link master rastreável exibido (fluxo crítico da estratégia de testes).

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.5; §2.16; §2.15 em destrutivas; comissão read-only; tokens do DS
- [ ] Estados vazio (sem convites)/erro/carregando (§2.12); a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Relatório detalhado; renegociar comissão; explorar eventos.

#### LEELA-S107-T3 · Modal adicionar patrocinador (validação progressiva)

- **Tipo:** screen · **Depende de:** S107-T1, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Implementar o modal de cadastro de patrocinador com 6 campos obrigatórios + 2 opcionais e validação progressiva por campo.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Parcerias-Modal-Adicionar.html`
- RNs: RN-123 (financeiro/permuta)
- Mocks: modelo de CDL Wellness (financeiro R$12.000/ano) e ACATE (permuta) — HANDOFF-05
- Componentes DS: Modal (560), Input, Radio (modelo comercial), Upload dashed (logo/contrato), Toast
- Comportamento: C8 (salvar), C10 (4 vias), C14 (upload), validações da SPEC-02

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/parcerias/_components/AdicionarPatrocinadorModal.tsx`
- `packages/core/src/clubs/patrocinador-validacao.ts` — validações (logo, nome, tipo, modelo comercial, contrapartida ≥20 chars)

**Passos de implementação**
1. Formulário com campos: logo (obrigatório), nome, tipo, modelo comercial (financeiro/permuta), contrapartida (≥20 chars), + campos condicionais (valorAnual se financeiro), opcionais (contrato, observação).
2. Validação progressiva: toast específico por campo faltante (SPEC-02 §validações).
3. Upload simulado (C14) → toast "[item] carregado".
4. Submeter válido → spinner + toast + navega; 4 vias de fechamento (C10).

**Modelo de dados / contratos**
- Escrita: `parcerias/{id}` tipo patrocinador (via Function/cliente conforme rules).

**Regras de negócio a respeitar**
- RN-123 (modelo comercial); §2.15 não se aplica (criação); validações da SPEC-02.

**Critérios de aceite (testáveis)**
- **Dado** contrapartida com <20 chars, **quando** submeto, **então** toast de validação e não navega.
- **Dado** modelo comercial "financeiro", **quando** selecionado, **então** o campo valor anual aparece.

**Testes a escrever**
- unit (core): validações por campo (logo/nome/tipo/modelo/contrapartida).
- unit (componente): campo condicional financeiro; toast por campo faltante.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Modal 4 vias; upload dashed (exceção §2.16 permitida); tokens do DS
- [ ] a11y AA (foco preso, labels, erros inline) · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Upload real de arquivo; contrato/assinatura.

#### LEELA-S107-T4 · Modais destrutivos: desativar patrocinador + remover evento (§2.15)

- **Tipo:** screen · **Depende de:** S107-T1, E01-S001-3-T3 (ConfirmModal) · **Estimativa:** M

**Objetivo**
Implementar os dois modais de ação destrutiva de parcerias (desativar patrocinador / pausar parceria; remover evento), ambos com preview de consequências (§2.15), motivo opcional e checkbox de notificação.

**Contexto & referências**
- Telas: `WEB-APPV2 (1)/Club-Parcerias-Modal-Desativar.html`, `Club-Parcerias-Modal-Remover-Evento.html`
- RNs: RN-124 (destrutivas com preview)
- Mocks: desativar CDL Wellness; remover Corrida da Ponte 2026 — HANDOFF-05
- Componentes DS: ConfirmModal (§2.15 — perde em Vulcão / mantém em Vitória), Textarea (motivo), Checkbox (notificar), Toast
- Comportamento: C15 (destrutiva), C10 (4 vias)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/parcerias/_components/DesativarPatrocinadorModal.tsx`
- `apps/painel/app/clubs/[slug]/parcerias/_components/RemoverEventoModal.tsx`

**Passos de implementação**
1. ConfirmModal com card do alvo + lista "o que perde" (Vulcão) + "o que mantém" (Vitória) + motivo opcional + checkbox notificar.
2. Desativar patrocinador (também acionado por "Pausar parceria" no popover); remover evento (acionado por "Remover parceria").
3. Confirmar (Vulcão) → spinner + toast + navega; 4 vias de fechamento.

**Modelo de dados / contratos**
- Escrita: `parcerias/{id}.status` → inativa (via Function/rules).

**Regras de negócio a respeitar**
- RN-124 (§2.15 preview obrigatório).

**Critérios de aceite (testáveis)**
- **Dado** desativar patrocinador, **quando** abro o modal, **então** vejo preview de consequências (perde/mantém) antes de confirmar.
- **Dado** confirmar, **quando** clico no botão Vulcão, **então** spinner + toast + navego.

**Testes a escrever**
- unit (componente): render do preview; confirmar dispara ação.
- e2e: fluxo desativar patrocinador com confirmação.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.15 (preview perde/mantém); Modal 4 vias; tokens do DS
- [ ] a11y AA · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Reversão/undo da ação; histórico de auditoria.

#### LEELA-S107-T5 · Modal termos do programa (read-only, 5 slugs + fallback)

- **Tipo:** screen · **Depende de:** S107-T1, E01-S001-3-T3 (Modal 640) · **Estimativa:** S

**Objetivo**
Implementar o modal informacional de termos do programa de afiliação, read-only (RN-122), que hidrata 1 de 5 cenários via query string, com fallback para Meia Floripa.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Parcerias-Modal-Termos-Programa.html`
- RNs: RN-121 (programa mora no organizador), RN-122 (read-only)
- Mocks: termos da Meia Floripa (janela 7 dias, liberação após 28 Abr 2026, repasse 10 dias úteis, teto sem limite) + 4 outros slugs — HANDOFF-05
- Slugs suportados: `meia-floripa-2026`, `trail-ratones-2026`, `corrida-ponte-2026`, `maratona-floripa-2027`, `acate-corporativo-2026`; fallback → `meia-floripa-2026`
- Componentes DS: Modal informacional (640), Button, Toast

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/parcerias/_components/TermosProgramaModal.tsx`

**Passos de implementação**
1. Ler `?evento=[slug]`; hidratar termos a partir do espelho read-only da parceria (S107-T1).
2. Renderizar termos: comissão, cupom, janela de atribuição, critério de liberação, prazo de repasse, teto mensal.
3. Slug desconhecido → fallback Meia Floripa.
4. "Baixar PDF" → spinner + toast (permanece); fechar por 4 vias.

**Modelo de dados / contratos**
- Leitura: espelho read-only dos termos em `parcerias/{id}` (nunca editável pelo clube).

**Regras de negócio a respeitar**
- RN-121/122 (read-only; clube não edita termos nem comissão).

**Critérios de aceite (testáveis)**
- **Dado** `?evento=trail-ratones-2026`, **quando** abro, **então** vejo os termos do Trail Ratones (comissão 8%).
- **Dado** slug desconhecido, **quando** abro, **então** vejo os termos da Meia Floripa (fallback).
- **Dado** o modal, **quando** procuro editar, **então** não há campos editáveis (read-only).

**Testes a escrever**
- unit (componente): hidratação por slug + fallback; ausência de campos editáveis.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Read-only garantido (RN-122); Modal 4 vias; tokens do DS
- [ ] a11y AA · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Geração real de PDF; edição de termos (mora no organizador — E04).

---

### LEELA-S108 · Listar comunicados · (de-para BH-108)

**Como** Coordenador de Assessoria, **quero** ver todos os comunicados (enviados, agendados, rascunhos) com métricas, **para** acompanhar minha comunicação com a base e gerenciar disparos.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Comunicacao.html`
- **RNs:** RN-130, RN-131, RN-132, RN-133

**Critérios de aceite (Given/When/Then):**
- **Dado** o topo, **quando** carrega, **então** vejo 4 KPIs (comunicados do mês, taxa de abertura, alcance acumulado, automações).
- **Dado** 7 comunicados (4 enviados, 2 agendados, 1 rascunho), **quando** carrega, **então** cada card tem borda esquerda colorida por status.
- **Dado** os filtros (busca + 3 grupos: status/canal/origem), **quando** combino, **então** filtra e mostra EmptyState quando zera.
- **Dado** o `•••` de um card, **quando** clico, **então** popover contextual por status (opções diferentes para enviado/agendado/rascunho).
- **Dado** "+ Nova campanha", **quando** clico, **então** navego para o editor.

**Tasks:** LEELA-S108-T1, LEELA-S108-T2

#### LEELA-S108-T1 · Modelo `comunicados` + limite de push + agregados + Rules

- **Tipo:** data-model · **Depende de:** S101-T1 · **Bloqueia:** S108-T2, S109-T1 · **Estimativa:** M

**Objetivo**
Criar `clubes/{clubId}/comunicados/{comunicadoId}`, a validação do limite de 4 push/semana (RN-133) via Function, os agregados `alcance`/`aberturasPct` e as Security Rules.

**Contexto & referências**
- RNs: RN-130 (3 estados), RN-131 (2 canais), RN-132 (2 origens), RN-133 (≤4 push/semana)
- Modelo: `modelo-de-dados-firestore.md` → `comunicados` + agregados ∑
- Mocks: 7 comunicados canônicos + estimativas de alcance por segmento — HANDOFF-05

**Arquivos (criar/editar)**
- `packages/core/src/clubs/comunicado.ts` — `type Comunicado`, `type StatusComunicado`, `type CanalComunicado`, `type Segmento`
- `functions/src/clubs/onComunicadoEnvio.ts` — valida limite 4 push/semana (RN-133) + mantém `alcance`
- `firestore.rules` — `comunicados`
- `functions/src/seed/comunicados.seed.ts` — 7 comunicados canônicos

**Passos de implementação**
1. `type Comunicado` (`titulo`, `conteudo`, `capaUrl?`, `canal[]`, `origem`, `status`, `segmento` embed, `agendadoPara?`, `enviadoEm?`, ∑`alcance`, ∑`aberturasPct?`).
2. Function de envio: bloqueia o 5º push da semana no clube (RN-133); mantém `alcance` no envio.
3. Rules: leitura/escrita por owner/admin; agregados só via Function.

**Modelo de dados / contratos**
- `clubes/{clubId}/comunicados/{comunicadoId}` — conforme modelo.

**Regras de negócio a respeitar**
- RN-130/131/132/133.

**Critérios de aceite (testáveis)**
- **Dado** 4 push já enviados na semana, **quando** tento enviar o 5º push, **então** a Function bloqueia (RN-133).
- **Dado** um comunicado só email, **quando** envio, **então** o limite de push não se aplica.

**Testes a escrever**
- integração (emulator): limite 4 push/semana; agregado `alcance` idempotente; rules por papel.
- unit (core): tipos/guards de canal e status.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Limite de push por Function; agregados só via Function · Rules por papel
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Envio real de push/email (integração de notificações). UI (S108-T2).

#### LEELA-S108-T2 · Tela lista de comunicados (KPIs + filtros por 3 grupos + popover contextual)

- **Tipo:** screen · **Depende de:** S108-T1, S102-T1 · **Estimativa:** M

**Objetivo**
Renderizar a lista de comunicados com 4 KPIs, filtros por 3 grupos independentes (status/canal/origem) + busca, cards com borda esquerda por status e popover contextual por status.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Comunicacao.html`
- RNs: RN-130, RN-131, RN-132, RN-133
- Mocks: 7 comunicados + KPIs de comunicação (6 do mês, abertura 68%, alcance 2.184, 3 automações) — HANDOFF-05
- Componentes DS: KPI card, Card com borda esquerda 3px por status, Chip filtro, EmptyState, Popover
- Comportamento: C4/C6/C7 (filtros/busca/empty), C3 (popover contextual)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/comunicacao/page.tsx`
- `apps/painel/app/clubs/[slug]/comunicacao/_components/{ComunicadoCard,ComunicacaoFilters}.tsx`

**Passos de implementação**
1. 4 KPIs; lista de 7 comunicados com borda esquerda colorida por status (§2.16 exceção permitida: card com border-left).
2. Filtros: 3 grupos (status/canal/origem) + busca; EmptyState + contador.
3. Popover contextual: ENVIADA (reenviar/duplicar/arquivar/relatório); AGENDADA (editar/disparar agora/pausar/cancelar); RASCUNHO (continuar/enviar/agendar/descartar). "Cancelar envio" e "Descartar" em Vulcão.
4. "+ Nova campanha" → editor; "Editar"/"Continuar" → editor `?id=[slug]`.

**Modelo de dados / contratos**
- Leitura: `comunicados`.

**Regras de negócio a respeitar**
- RN-130/131/132; popover muda por status.

**Critérios de aceite (testáveis)**
- **Dado** filtro status "agendado", **quando** aplico, **então** só os 2 agendados aparecem e o contador atualiza.
- **Dado** um card ENVIADA, **quando** abro o `•••`, **então** vejo as opções de enviada (não as de rascunho).

**Testes a escrever**
- unit (componente): popover por status; filtro por 3 grupos + busca.
- e2e: "+ Nova campanha" e "Editar" navegam nos modos corretos.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.16 (border-left por status = exceção permitida); tokens do DS
- [ ] EmptyState + contador; estados erro/carregando (§2.12); a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Relatório completo de comunicado; automações.

---

### LEELA-S109 · Criar/editar comunicado · (de-para BH-109)

**Como** Coordenador de Assessoria, **quero** criar ou editar um comunicado com segmentação, canal, agendamento e preview ao vivo, **para** enviar a mensagem certa ao público certo no momento certo.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Comunicacao-Nova.html`
- **RNs:** RN-130, RN-131, RN-132, RN-133, RN-134, RN-135

**Critérios de aceite (Given/When/Then):**
- **Dado** o editor, **quando** abre sem `?id`, **então** modo create; com `?id=[slug]` (4 slugs mock), pré-preenchido.
- **Dado** a coluna direita sticky, **quando** edito, **então** o preview Push/Email atualiza ao vivo (C16); Push trunca em 160 chars (RN-134); email respeita quebras e capa (RN-135).
- **Dado** a segmentação, **quando** escolho por desafio/pilar/engajamento, **então** o tamanho estimado do segmento aparece.
- **Dado** o canal, **quando** seleciono, **então** os cards de canal são mutuamente exclusivos (C12) e capa só aparece para email (RN-135).
- **Dado** o agendamento, **quando** escolho "agendar", **então** aparecem data+hora e o botão principal muda; validações (título ≥5, conteúdo ≥10, segmento e canal obrigatórios) bloqueiam envio.

**Tasks:** LEELA-S109-T1, LEELA-S109-T2

#### LEELA-S109-T1 · Segmentação + validações de comunicado (core)

- **Tipo:** api/function · **Depende de:** S108-T1 · **Bloqueia:** S109-T2 · **Estimativa:** S

**Objetivo**
Implementar em `packages/core` o cálculo de tamanho estimado do segmento e as validações de formulário do comunicado (título ≥5, conteúdo ≥10, push ≤160, segmento e canal obrigatórios).

**Contexto & referências**
- RNs: RN-133 (limite push — validado em Function no envio), RN-134 (push 160)
- Mocks: estimativas de alcance por segmento (Todos 120, Preparação Meia 48, Morro 22, Marcha Mental 31, ativos 7/14/30d, por pilar 67/38/15) — HANDOFF-05
- Estratégia de testes: validações de formulário são casos unit prioritários

**Arquivos (criar/editar)**
- `packages/core/src/clubs/segmento.ts` — `estimarAlcance(segmento)` a partir dos agregados
- `packages/core/src/clubs/comunicado-validacao.ts` — `validarComunicado(input)` + `truncarPush(texto)` (160)

**Passos de implementação**
1. `estimarAlcance`: mapeia tipo de segmento (todos/por_desafio/por_pilar/por_engajamento) → tamanho estimado.
2. `validarComunicado`: título ≥5, conteúdo ≥10, segmento obrigatório, canal obrigatório; para push, corpo ≤160 (RN-134).
3. `truncarPush`: corta em 160 chars preservando integridade.

**Modelo de dados / contratos**
- Funções puras em `core`.

**Regras de negócio a respeitar**
- RN-134 (160), validações da SPEC-02.

**Critérios de aceite (testáveis)**
- **Dado** push com 200 chars, **quando** `truncarPush`, **então** retorna 160 chars.
- **Dado** título com 4 chars, **quando** `validarComunicado`, **então** inválido (mín 5).
- **Dado** segmento "Participantes Preparação Meia Floripa", **então** `estimarAlcance` = 48.

**Testes a escrever**
- unit (core): validações (título/conteúdo/segmento/canal); truncamento 160; estimativa por segmento.

**Definition of Done**
- [ ] Critérios passam · Testes verdes (cobertura alta em core)
- [ ] Sem `any` não justificado · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Limite de 4 push/semana (vive na Function de envio, S108-T1).

#### LEELA-S109-T2 · Editor de comunicado (70/30 + preview Push/Email ao vivo + modo dual)

- **Tipo:** screen · **Depende de:** S109-T1, S108-T1, S102-T1 · **Estimativa:** L

**Objetivo**
Implementar o editor de comunicado em layout 70/30, com 4 cards à esquerda (Identidade, Segmentação, Envio, Revisão), variáveis inseríveis e coluna direita sticky com preview Push/Email ao vivo.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Comunicacao-Nova.html`
- RNs: RN-130 a RN-135
- Mocks: 4 slugs de edição (`dica-ritmo-longa`, `sessao-mobilidade`, `boas-vindas-helena`, `alerta-kit-retirada`); variáveis `{nome}` `{clube}` `{proximo_evento}` `{felipe}` — HANDOFF-05
- Componentes DS: Layout 70/30, Cards de seção, Radio group (C12), Tabs de preview (§2.7), Button, Toast
- Comportamento: C12 (radios segmentação/canal/agendamento), C16 (preview ao vivo), C8/C9

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/comunicacao/nova/page.tsx` — modo dual via `?id`
- `apps/painel/app/clubs/[slug]/comunicacao/nova/_components/{IdentidadeCard,SegmentacaoCard,EnvioCard,RevisaoCard,PreviewPushEmail}.tsx`

**Passos de implementação**
1. Layout 70/30; 4 cards à esquerda com status dinâmico.
2. Segmentação por desafio/pilar/engajamento (C12) mostrando `estimarAlcance` (S109-T1).
3. Canais mutuamente exclusivos/combinados (C12); capa só para email (RN-135).
4. Preview sticky com tabs Push/Email (C16); Push trunca 160 (`truncarPush`); email respeita quebras.
5. Variáveis inseríveis via select; agendamento (C12) mostra data+hora e muda botão principal.
6. Salvar rascunho (permanece); Enviar/Agendar (valida com `validarComunicado`, navega).

**Modelo de dados / contratos**
- Escrita: `comunicados/{id}` (`status` rascunho/agendado/enviado). Envio real e `alcance` via Function.

**Regras de negócio a respeitar**
- RN-134 (160), RN-135 (capa só email), RN-130/131/132; validações da SPEC-02.

**Critérios de aceite (testáveis)**
- **Dado** `?id=alerta-kit-retirada`, **quando** abro, **então** campos pré-preenchidos com o mock.
- **Dado** canal Push, **quando** o corpo passa de 160, **então** o preview push trunca em 160 (RN-134).
- **Dado** canal Push selecionado, **quando** olho o formulário, **então** o campo de capa não aparece (RN-135).

**Testes a escrever**
- unit (componente): troca de canal esconde capa; preview trunca push.
- e2e: comunicado segmentado — push trunca 160 e respeita limite 4/semana (fluxo crítico da estratégia de testes).

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.7 (tabs no DOM); máx 1 Primary; RN-134/135; tokens do DS
- [ ] Estados vazio/erro/carregando (§2.12); a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Disparo real de push/email; relatório de abertura.

---

### LEELA-S110 · Configurações do clube · (de-para BH-110)

**Como** Coordenador de Assessoria, **quero** configurar identidade, página pública, regras de entrada, moderação e administração, **para** controlar como o clube se apresenta e opera.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Club-Configuracoes.html` (ver nota de lacuna — usar SPEC-01 §2.10)
- **RNs:** RN-101, RN-104, RN-140, RN-141, RN-142, RN-143, RN-144

**Critérios de aceite (Given/When/Then):**
- **Dado** o layout 25/75, **quando** carrega, **então** vejo anchor navigation sticky com scroll spy e 5 seções (Identidade, Página pública, Regras de entrada, Moderação, Admin avançada), cada uma com "Salvar alterações".
- **Dado** o slug, **quando** digito, **então** sanitiza em tempo real (minúsculas + números + hífens).
- **Dado** "Gerar novo código", **quando** clico, **então** spinner + código muda (pool de 5 mocks) + toast; o código respeita RN-101.
- **Dado** o modelo de entrada, **quando** olho "Pago", **então** está disabled com badge "Em breve"; clicar dispara toast "Clubes pagos chegam em breve" e não muda a seleção (RN-104).
- **Dado** as 6 permissões de admin (RN-142), **quando** alterno toggles, **então** alternam de forma independente.
- **Dado** o card "Deletar clube", **quando** carrega, **então** tem border-left Vulcão (exceção §2.16) e disclaimer LGPD de 90 dias (RN-144).

**Tasks:** LEELA-S110-T1, LEELA-S110-T2

#### LEELA-S110-T1 · Tela de configurações (25/75 + scroll spy + 5 seções + toggles/permissões)

- **Tipo:** screen · **Depende de:** S102-T1, S101-T1, E01-S001-2 (Input/Toggle/Radio) · **Estimativa:** L

**Objetivo**
Implementar a tela de configurações em layout 25/75 com anchor navigation + scroll spy e 5 seções, incluindo sanitização de slug, geração de código, visibilidade, aprovação manual, 6 permissões de admin e comportamento de membros.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Configuracoes.html` (usar SPEC-01 §2.10 — ver lacuna)
- RNs: RN-101, RN-104, RN-140, RN-141, RN-142, RN-143
- Mocks: código 8A3K9 + pool de novos códigos (K7M2X, P9N4T, W3R8B, N5HQ2, T8XC4); bio aprovada do clube — HANDOFF-05
- Componentes DS: Anchor nav sticky, Input (slug sanitizado), Toggle (C11), Radio (C12), Card crítico border-left Vulcão (§2.16 exceção), Button, Toast
- Comportamento: C17 (scroll spy), C11 (toggles), C12 (radios), C14 (upload avatar/banner)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/configuracoes/page.tsx`
- `apps/painel/app/clubs/[slug]/configuracoes/_components/{IdentidadeSection,PaginaPublicaSection,RegrasSection,ModeracaoSection,AdminAvancadaSection,AnchorNav}.tsx`
- `packages/core/src/clubs/slug.ts` — `sanitizarSlug(texto)`

**Passos de implementação**
1. Layout 25/75; anchor nav sticky + scroll spy (C17).
2. Identidade: avatar/banner (upload simulado C14), nome, bio; "Salvar alterações" por seção.
3. Página pública: slug com `sanitizarSlug` em tempo real; visibilidade (3 radios — RN-140); copiar link + compartilhar (C18).
4. Regras de entrada: "Gerar novo código" (pool de 5, respeita RN-101) + copiar; toggle aprovação manual (RN-141); modelo de entrada Gratuito (ativo) + Pago (disabled "Em breve", toast — RN-104).
5. Moderação: 6 toggles de permissão (RN-142, sem toast) + 3 radios de comportamento (RN-143).
6. Admin avançada: transferência/exportação/arquivar/deletar (o card deletar renderiza aqui; ação vai para S110-T2).

**Modelo de dados / contratos**
- Escrita: `clubes/{slug}` (identidade/slug/visibilidade/aprovacaoManual/codigoConvite) + `permissoesAdmin/{profId}` (6 flags).

**Regras de negócio a respeitar**
- RN-101 (código), RN-104 (pago disabled), RN-140/141/142/143.

**Critérios de aceite (testáveis)**
- **Dado** digito "Corrida Perfeita!" no slug, **quando** sanitiza, **então** vira "corrida-perfeita".
- **Dado** "Gerar novo código", **quando** clico, **então** o código muda para um do pool e respeita RN-101.
- **Dado** o radio "Pago", **quando** clico, **então** toast "Clubes pagos chegam em breve" e a seleção não muda (RN-104).

**Testes a escrever**
- unit (core): `sanitizarSlug` (acentos/espaços/maiúsculas/símbolos).
- unit (componente): scroll spy marca seção ativa; radio "Pago" não altera seleção.
- e2e: gerar código atualiza header; alternar 6 toggles.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.16 (border-left Vulcão só no card crítico); tokens do DS
- [ ] Estados erro/carregando (§2.12); a11y AA (foco/labels)
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Lógica de clube pago (RN-104); ação de deletar/arquivar (S110-T2).

#### LEELA-S110-T2 · Deletar clube (§2.15 + LGPD) + exportação de dados (Function)

- **Tipo:** api/function · **Depende de:** S110-T1, S101-T1, E01-S001-3-T3 (ConfirmModal) · **Estimativa:** M

**Objetivo**
Implementar a ação irreversível de deletar clube com `ConfirmModal` (preview de consequências, §2.15) e disclaimer LGPD, mais a Cloud Function de exportação de dados retida por 90 dias (RN-144).

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Configuracoes.html` (card "Deletar clube")
- RNs: RN-144 (irreversível, LGPD 90 dias)
- Componentes DS: ConfirmModal (§2.15), Toast
- Estratégia de testes: ações destrutivas exigem confirmação com preview; export por 90 dias (caso prioritário)

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/configuracoes/_components/DeletarClubeModal.tsx`
- `functions/src/clubs/deletarClube.ts` — soft-delete + agenda export
- `functions/src/clubs/exportarDadosClube.ts` — gera export retido por 90 dias
- `firestore.rules` — restringe delete ao owner

**Passos de implementação**
1. ConfirmModal com preview (o que perde em Vulcão / o que mantém em Vitória) + disclaimer LGPD (90 dias) + confirmação por digitação do nome (ou checkbox de ciência).
2. Confirmar → Function `deletarClube` (soft-delete; só owner via rules).
3. `exportarDadosClube` gera o pacote de dados retido por 90 dias após deleção (RN-144).
4. Toast de confirmação + navega para o hub.

**Modelo de dados / contratos**
- `clubes/{slug}` marcado como deletado; export retido 90 dias. Delete só via Function/owner.

**Regras de negócio a respeitar**
- RN-144 (irreversível + LGPD 90 dias); §2.15 (preview).

**Critérios de aceite (testáveis)**
- **Dado** deletar clube, **quando** abro o modal, **então** vejo preview + disclaimer LGPD antes de confirmar.
- **Dado** que não sou owner, **quando** tento deletar, **então** as rules negam.
- **Dado** deleção confirmada, **quando** processada, **então** o export de dados fica disponível por 90 dias.

**Testes a escrever**
- integração (emulator): só owner deleta; export retido 90 dias; soft-delete idempotente.
- unit (componente): ConfirmModal exige confirmação explícita.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] §2.15 (preview) + disclaimer LGPD (RN-144); delete só via Function/owner
- [ ] Erros observáveis no Sentry sem dado sensível · Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Arquivar clube (fluxo à parte, não construído no protótipo); restauração pós-deleção.

---

### LEELA-S111 · Sub-afiliação de membros (placeholder) · (de-para BH-111)

**Como** Coordenador de Assessoria, **quero** (futuramente) permitir que membros convidem outros membros com seu próprio sub-link rastreável, **para** transformar membros engajados em canais de crescimento do clube.

- **MoSCoW:** Could (placeholder) · **Estimativa:** XS · **Superfície:** Painel
- **Tela(s) de referência:** `Club-Membros-Modal-SubLink.html` (placeholder — não presente em WEB-APPV2, ver SPEC-01 §2.11)
- **RNs:** RN-105 (sub-afiliação parkada)

> **Placeholder / Could.** Recurso parkado (RN-105). Esta fase entrega apenas a tela de "Em breve"; a lógica de sub-afiliação e sub-link rastreável fica para fase futura. Não criar coleção nem agregados.

**Critérios de aceite (Given/When/Then):**
- **Dado** o modal placeholder, **quando** abre, **então** vejo texto explicando o recurso planejado e um botão "Avise-me quando estiver disponível".
- **Dado** o botão "Avise-me", **quando** clico, **então** toast de confirmação.
- **Dado** o modal, **quando** aciono Cancelar/X/overlay/Esc, **então** fecha e volta para Membros (4 vias).

**Tasks:** LEELA-S111-T1

#### LEELA-S111-T1 · Modal placeholder de sub-afiliação

- **Tipo:** screen · **Depende de:** S103-T2, E01-S001-3-T3 (Modal) · **Estimativa:** XS

**Objetivo**
Implementar o modal placeholder "Em breve" de sub-afiliação, sem lógica de domínio (RN-105).

**Contexto & referências**
- Tela: `Club-Membros-Modal-SubLink.html` (placeholder — SPEC-01 §2.11)
- RNs: RN-105
- Componentes DS: Modal (480), EmptyState/placeholder, Button, Toast
- Comportamento: C10 (4 vias), "Avise-me" → toast

**Arquivos (criar/editar)**
- `apps/painel/app/clubs/[slug]/membros/_components/SubAfiliacaoModal.tsx`

**Passos de implementação**
1. Modal com título + texto explicando o recurso planejado (sub-link rastreável de membro).
2. Botão "Avise-me quando estiver disponível" → toast.
3. 4 vias de fechamento (C10) → volta para Membros.

**Modelo de dados / contratos**
- Nenhum (placeholder).

**Regras de negócio a respeitar**
- RN-105 (parkada — sem lógica).

**Critérios de aceite (testáveis)**
- **Dado** o modal aberto, **quando** clico "Avise-me", **então** toast e permaneço.
- **Dado** Esc, **quando** pressiono, **então** fecha e volta para Membros.

**Testes a escrever**
- unit (componente): botão dispara toast; 4 vias de fechamento.

**Definition of Done**
- [ ] Critérios passam · Testes verdes
- [ ] Modal 4 vias; tokens do DS; a11y AA
- [ ] Lint + type-check limpos (ver `definition-of-done.md`)

**Fora de escopo**
Toda a lógica de sub-afiliação (RN-105): sub-link, rastreamento, atribuição, agregados.

---

## Mapa de tarefas (resumo)

| Story | De-para | Tasks | Tela(s) |
|---|---|---|---|
| S101 Hub | BH-101 | T1 (data-model), T2 (screen) | Clubs.html |
| S102 Dashboard | BH-102 | T1 (shell), T2 (screen) | Club-Overview.html |
| S103 Membros | BH-103 | T1 (data-model+Function), T2 (screen) | Club-Membros.html |
| S104 Convite | BH-104 | T1 (modal) | Club-Membros-Modal-Convite.html |
| S105 Desafios lista | BH-105 | T1 (data-model+seed), T2 (screen) | Club-Desafios.html |
| S106 Desafio editor | BH-106 | T1 (core pontuação), T2 (screen) | Club-Desafios-Editar.html |
| S107 Parcerias | BH-107 | T1 (data-model), T2 (screen), T3 (modal add), T4 (modais destrutivos), T5 (modal termos) | Club-Parcerias.html + 4 modais |
| S108 Comunicados lista | BH-108 | T1 (data-model+Function), T2 (screen) | Club-Comunicacao.html |
| S109 Comunicado editor | BH-109 | T1 (core validação), T2 (screen) | Club-Comunicacao-Nova.html |
| S110 Configurações | BH-110 | T1 (screen), T2 (Function delete/LGPD) | Club-Configuracoes.html |
| S111 Sub-afiliação | BH-111 | T1 (placeholder) | Club-Membros-Modal-SubLink.html |

**Total:** 11 stories · 23 tasks.

## Ordem sugerida de execução

`S101-T1 (clubes) → S103-T1 (membros) · S105-T1 (desafios) · S107-T1 (parcerias) · S108-T1 (comunicados)` (modelos de dados em paralelo) → `S102-T1 (shell)` → telas em paralelo por tab → S106-T1/S109-T1 (core) antes dos editores → S110-T2 e S111 por último (dependem das telas base). Ao fim, E13 (App do Atleta) reusa `packages/core` (desafios, pontuação, membros) e os agregados desta fase.

---

*Fim do épico LEELA-E05 · Módulo Clubs.*
