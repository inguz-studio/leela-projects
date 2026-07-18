# Cobertura do mockup — export Claude Design (WEB-APPV2) vs DS/painel

> Data: 2026-07-06 · Executor: squad magic-ds (mds-librarian, task map-components) · trace leela-build-2d6ee98d
> O que é: execução retroativa do passo 3 do protocolo de intake (`handoff-claude-design.md` §3.3, "mapa classe → componente DS"). Responde à pergunta do Vitor: "por que existem componentes do handoff que estão inativos?"
> Fontes: 36 telas de `WEB-APPV2 (1)/` + `be-hero.css` · barrel `packages/design-system/src/index.ts` (25 componentes) · consumidores em `apps/painel/src` · diagnóstico-sidebar e plano-shadcn de 2026-07-05 · brief `ds-consolidacao-shadcn-brasa` · V1-CHECKLIST.

## Resumo executivo

O vocabulário das 36 telas agrupa em **50 componentes de facto**, mais 1 componente do lado DS sem consumo (Tooltip), somando 51 itens classificados:

| Categoria | Qtde | Leitura |
|---|---|---|
| ATIVO | 30 | Implementado e em uso (DS ou composição local do painel) |
| PARCIAL | 6 | Existe, mas falta variante, consumo ou promoção ao DS (5 do mockup + Tooltip, que existe no DS e ninguém consome) |
| AUSENTE-GAP | 6 | Nunca virou spec nem task. É o buraco do intake: o passo 3 não rodou na Onda 1, então a regra "componente sem correspondente vira candidato via CLI shadcn" nunca gerou trabalho |
| ADIADO | 5 | Decisão documentada de escopo (Onda 2 ou pós-V1), com citação |
| AGUARDA-DADO | 1 | Slot pronto no componente, falta ligar dado real |
| AGUARDA-DECISÃO | 1 | Depende de decisão/asset do Vitor |
| ARTEFATO | 2 | Controle do próprio Claude Design, não é componente de produto |

A resposta curta pro Vitor: **nada está inativo por acidente de código**. Os inativos se dividem em três causas: (1) seis componentes de formulário e feedback que o intake da Onda 1 nunca inventariou, então nunca viraram task (AUSENTE-GAP); (2) cinco itens com adiamento decidido e registrado (checkout, editor de vendas, financeiro global, card de upgrade, comunicação global); (3) três slots prontos aguardando dado ou marca (badges da nav, brand block, KPIs de preview), já registrados como follow-up no gate B5 do V1-CHECKLIST.

### Os 5 gaps mais relevantes (com rota)

1. **Família de formulário ausente no DS: Select, Switch, Checkbox, RadioGroup, Textarea.** O mockup usa em 10 a 19 telas cada; o painel improvisa com elementos nativos (`<select>` em 2 arquivos, checkbox nativo em 6, radio em 2, textarea em 7, zero `role="switch"`). Rota: lote de higiene **DS-Forms via CLI shadcn, antes do E04** da Onda 2, porque os editores S300-T3/T4/T5/T6 e S304 são form-pesados e vão multiplicar o improviso.
2. **Progress ausente.** Barras de progresso e distribuição aparecem em 18 telas (`.bar-fill`, `.k-progress`, `.pc-kit-fill`, `.open-bar`); no painel são divs locais em 5 arquivos. Rota: entra no mesmo lote DS-Forms (shadcn `progress` + variante slim).
3. **CardKPI triplicado fora do DS.** A família `.kpi-*` aparece em 28 telas e o handoff §3.3 já previa `.kpi-*` → CardKPI. Hoje existem 3 implementações locais duplicadas (`overview/_components/KpiRow.tsx`, `eventos/_components/KpiCard.tsx`, `clubes/_components/KpiCard.tsx`). Rota: promover a componente DS antes de E09s-L3-T1, que cria mais 3 cards de saldo.
4. **`.icon-btn` sem correspondente.** 146 usos no mockup; o Button do DS só tem sizes sm|md|lg, sem size icon-only. Rota: follow-up XS no DS (adicionar `size: icon` ao buttonVariants), pode ir no lote DS-Forms.
5. **DropdownMenu órfão do alias.** O componente novo existe (A5, 13 testes WAI-APG portados), mas o painel ainda importa pelo alias deprecated `Popover` em 2 arquivos e tem zero imports de `DropdownMenu`. Rota: higiene XS de rename no primeiro lote da Onda 2 que tocar essas telas.

---

## Tabela mestre

Legenda de telas: contagem sobre as 36 do export; nomes listados quando o grupo é restrito.

### A. Shell e navegação

| Componente do mockup (classes) | Telas | Correspondente DS/painel | Categoria | Causa | Rota |
|---|---|---|---|---|---|
| Grid da aplicação (`.app`, 240px + 1fr) | 35 | `AppShell` (layout raiz em App.tsx) | ATIVO | Entregue em DS-B3 (2544ded); zero rota sem shell | — |
| Sidebar fixa (`.sidebar`, `.nav`, `.nav-item`, `.nav-label`, ícones Lucide inline) | 35 | `Sidebar` fixa 240px + `DEFAULT_SIDEBAR_SECTIONS` com 8 ícones | ATIVO | DS-B1 (bd55a8e) + DS-B2 (650c005); colapsável substituído por decisão vinculante 2 do brief | — |
| Badge numérico da nav (`.nav-badge`, Eventos "3" e Comunicação "4") | 36 | `SidebarItem.badge` (Sidebar.tsx:39, render :188) | AGUARDA-DADO | Slot existe e renderiza; nenhum consumidor passa contagem real | Follow-up registrado no gate B5 do V1-CHECKLIST ("badges da nav: ligar dado"); ligar ao agregado `getOverview` num lote XS da Onda 2 |
| Brand block do topo (`.brand`, `.brand-mark` "BE HERO.", `.brand-sub`) | 36 | Sem correspondente no `Sidebar` do DS | AGUARDA-DECISÃO | O produto é LEELA; a marca (nome, logotipo) ainda não existe como asset | Follow-up registrado no gate B5 ("brand block topo sidebar, aguarda marca Leela"); decisão de marca é do Vitor |
| Rodapé do sidebar (`.sidebar-footer`, avatar + nome + "Ver perfil") | 35 | `SidebarFooter` (avatar + nome da sessão) | ATIVO | DS-B4 (69439f0). Nota: o link "Ver perfil" não navega, não há tela de perfil na V1 | — |
| Card de upgrade no rodapé (presente no mockup original Be Hero; ausente neste export de 36 telas) | 0 | Sem correspondente | ADIADO | Diagnóstico-sidebar §4, task T3 opcional: "pode esperar a Onda 2 sem prejuízo"; reconfirmado como follow-up no B5 | Onda 2, junto da anatomia completa do rodapé |
| Breadcrumb (`.breadcrumb`) | 32 | `Breadcrumb` | ATIVO | E01 S001-3-T1 | — |
| Header do contexto (`.ev-header`, `.ev-title`, `.ev-meta`, `.ev-actions`, 96px) | 17 | `PageHeader` | ATIVO | S202-T1 (83d4036) e S102-T1 (adc9c93) | — |
| Sub-navegação de contexto (`.ev-tabs`/`.ev-tab`, `.club-tabs`/`.club-tab`, `.subnav-tab`) | 24 | `SubNav` | ATIVO | S202-T1 (evento) e S102-T1 (clube, 6 tabs) | — |
| Terceiro nível (`.subsub-nav`, `.subsub-tab`, `.subtab-pane`) | 8 (família Kits) | `Tabs` | ATIVO | S205-T2/T4 (sub-telas de kits) | — |

### B. Átomos

| Componente do mockup | Telas | Correspondente | Categoria | Causa | Rota |
|---|---|---|---|---|---|
| Botão (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`) | 34 | `Button` shadcn stock restilizado | ATIVO | DS-A3 (3d42cff) | — |
| Botão de ícone (`.icon-btn`, 146 usos) | 30+ | `Button` sem size icon-only | PARCIAL | O DS só expõe sm\|md\|lg (Button.tsx:85-93); telas improvisam com className | Adicionar `size: icon` ao buttonVariants; XS, entra no lote DS-Forms |
| Badge de status (`.badge` + `badge-neutro`/`-vitoria`/`-brasa`/`-heroico`/`-alerta`/`-vulcao`) | 35 | `Badge` variantes neutro\|vitoria\|brand\|heroico\|alerta\|vulcao | ATIVO | DS-A3; mapeamento 1:1 (brasa → brand) preservado | — |
| Badges contextuais (`.ebadge`, `.channel-badge`, `.badge-via`) | 11 | Composições locais sobre `Badge` | ATIVO | Implementadas nas telas de comunicação/membros da Onda 1 | — |
| Chip (`.chip`, `.chip-count`) | 24 | `Chip` | ATIVO | E01 S001-2-T2 | — |
| Avatar (`.avatar`, `.avatar-sm`, `.member-avatar`, `.club-avatar`, `.tev-org-avatar`) | 36 | `Avatar` | ATIVO | DS-A7 (ed7a8f1), engine própria de imagem | — |
| Separador (`.sep`, `.item-divider`, `.kit-divider`, `.tier-divider`, `.dot-sep`) | 30+ | `Divider`/Separator shadcn | ATIVO | DS-A3 | — |
| Input de texto (`.input`, `.txt-input`, `.fld`, `.form-field`, `.field-label`, `.form-helper`) | 25+ | `Input` | ATIVO | DS-A3 | — |
| Campo de busca (`.search-input`, `.search-wrap`) | 26 | `Input` reaproveitado com placeholder "Buscar" (6+ arquivos) | PARCIAL | Funciona, mas não existe SearchInput com ícone de lupa e clear como no mockup | Promover padrão de busca a componente DS no lote DS-Forms |
| Select (`<select>`, `.select-*`, `.txt-select`) | 16 | Nenhum no DS; `<select>` nativo em 2 arquivos do painel | AUSENTE-GAP | Passo 3 do intake não rodou na Onda 1; nunca virou candidato via CLI | shadcn `select` no lote DS-Forms, pré-E04 (S300-T4/T5/T6 dependem) |
| Checkbox (`.checkbox`, `.check`, `.item-checkbox`, `.item-cb-vis`) | 10 | Nenhum no DS; checkbox nativo em 6 arquivos | AUSENTE-GAP | Idem | shadcn `checkbox` no lote DS-Forms |
| Radio e radio-card (`.radio`, `.radio-option`, `.radio-dot`, `.radio-card`, `.radio-title`) | 19 | Nenhum no DS; radio nativo em 2 arquivos | AUSENTE-GAP | Idem; o mockup usa radio-cards ricos nos editores | shadcn `radio-group` + variante card no lote DS-Forms |
| Switch/toggle (`.switch`, `.sw`, `.sw-dot`, `.toggle-row`, `.section-toggle`, `.sp-toggle`) | 16 | Nenhum no DS; zero `role="switch"` no painel (toggles hoje são checkboxes) | AUSENTE-GAP | Idem; pior caso de fidelidade, o mockup usa switch em publicação de seção e logo de patrocinador | shadcn `switch` no lote DS-Forms, pré-E04 (S300-T3 usa `.section-toggle` por seção) |
| Textarea (compose de comunicado/campanha) | 6+ | Nenhum no DS; `<textarea>` nativo em 7 arquivos | AUSENTE-GAP | Idem | shadcn `textarea` no lote DS-Forms |
| Barra de progresso (`.bar`, `.bar-fill`, `.k-progress`, `.pc-kit-bar`/`.pc-kit-fill`, `.open-bar`) | 18 | Nenhum no DS; divs locais em 5 arquivos | AUSENTE-GAP | Idem | shadcn `progress` + variante slim de distribuição no lote DS-Forms |

### C. Dados, cards e feedback

| Componente do mockup | Telas | Correspondente | Categoria | Causa | Rota |
|---|---|---|---|---|---|
| Card KPI (`.kpi`, `.kpi-card`, `.kpi-value`, `.kpi-label`, `.kpi-sub`, `.kpi-row`, `.kpi-foot`, `.dist-kpi`, `.kit-kpi`, `.side-kpi`) | 28 | 3 implementações locais: `overview/_components/KpiRow.tsx`, `eventos/_components/KpiCard.tsx`, `clubes/_components/KpiCard.tsx` | PARCIAL | Implementado por tela, nunca promovido ao DS, apesar do handoff §3.3 prever `.kpi-*` → CardKPI. Nota: "KPIs preview (dado)" do B5 é questão de dado, pré-existente | Consolidar como `CardKPI` no DS antes de E09s-L3-T1 (que cria 3 cards novos) |
| Card genérico (`.summary-card`, `.side-card`, `.edit-card`, `.section-card`, `.cad-*`, `.card-head`) | 20+ | `Card` shadcn (A6, e1dbe58) | PARCIAL | O componente existe no DS mas tem zero imports no painel; as telas da Onda 1 usam divs locais (anteriores ao A6) | Adotar nas telas novas da Onda 2; sem retrofit (plano-shadcn §4: "o gate já foi pago") |
| Cards de domínio (`.event-card`, `.club-card`, `.kit-card`, `.item-card`, `.comunicado-card`, `.prod-card`) | 20+ | `CardEvento`, `CardDesafio` + composições locais | ATIVO | E01 S001-3-T4 + telas S205/S107/S108 | — |
| Tabela densa (`.cell`, `.col-*`, `.row-*`, theads custom) | 15+ | `Table` (composição sobre primitivos shadcn) | ATIVO | DS-A11 (acfadb0); consumo em inscritos, membros, tenants, parcerias | — |
| Paginação (`.page-num`) | 8 | `Pagination` | ATIVO | S203-T2 (cursor 18/pág em InscritosView) | — |
| Modal (`.modal-overlay`, `.modal-head`, `.modal-foot`, `.modal-eyebrow`) | 19 | `Modal` + `ConfirmModal` frame shadcn | ATIVO | DS-A9 (bde308c); modais de convite, item de kit, destrutivos §2.15 | — |
| Menu contextual (`.menu-pop`, `.menu-pop-item`, `.row-popover`, `.header-menu-popover`, `.card-popover`, `.row-menu-btn`) | 15 | `DropdownMenu` (visual shadcn, 13 testes WAI-APG portados) | PARCIAL | A5 entregue, mas o painel importa pelo alias deprecated `Popover` (2 arquivos); zero imports de `DropdownMenu` | Rename Popover → DropdownMenu no primeiro lote da Onda 2 que tocar as telas; higiene XS |
| Stepper do balcão (`.step`, `.step-num`, `.step-head`, `.step-title`, 3 passos) | 8 | `Stepper` | ATIVO | S204-T1 (6de9e43) | — |
| Stepper de checkout (`.step-pill`, `.step-bar`, `.step-done`, `.step-sep`, 5 etapas) | 1 (PaginaVendas-Conteudo) | Nenhum consumidor ainda | ADIADO | Checkout público é Onda 2; máquina de estados em E12 S1203-T1 (V1-CHECKLIST, Onda 2) | E12 S1203, brief `onda2-E12-lotes.md` |
| Alertas e banners (`.alert-row`, `.alert-text`, `.alert-alerta`, `.banner-alerta`, `.b-ico`/`.b-msg`, `.item-alert`) | 5+ | `AlertsPanel` local (S602-T2) + banners no dashboard do evento (S202-T2) | ATIVO | Implementado como composição local do painel | Candidato natural a `Alert` DS quando a Onda 2 repetir o padrão; sem urgência |
| Feed de atividade (`.tl-item`, `.log-row`, `.act-row`, `.atividade-item`, `.recent-item`) | 5+ | Atividade recente do dashboard (S202-T2) + `RecentRegistrations` (S601-T2) | ATIVO | Composições locais; o próprio mockup usa 4 vocabulários diferentes pro mesmo padrão | — |
| Empty state (`.empty*`) | 22 | `EmptyState` | ATIVO | E01 S001-3-T2; 13 imports no painel | — |
| Toast (`.toast-notification`, telas de clube) | 10 | `Toast` frame shadcn + fila `useToast` intacta | ATIVO | DS-A4 (6c5abf9), decisão vinculante 4 do brief | — |
| Campo copiável (`.copy-btn`, `.public-url`, `.invite-code`) | 11 | Locais no modal de convite (S104-T1) e URL pública (S201) | ATIVO | Composição local | — |

### D. Domínio (organismos por área)

| Componente do mockup | Telas | Correspondente | Categoria | Causa | Rota |
|---|---|---|---|---|---|
| Bloco de patrocinador (`.sp-*`, `.sponsor-block`, `.sponsored`, toggle de logo) | 8 | Parcerias S107 + modal de item de kit S205-T3 (RN-214) | ATIVO | Onda 1 completa | — |
| Tabela de eventos promovidos (`.tev-*`, `.tabela-eventos-promovidos`, comissão/cupom) | 6 (família Club-Parcerias) | `ParceriasView.tsx` (colunas comissão, cupom, janela) | ATIVO | S107-T2 (d6afe48); espelho read-only | — |
| Catálogo de ações do desafio (`.acao-*`, 16 ações, pilares) | 2 | `DesafioEditor` + `catalogoAcoes` seed 16 | ATIVO | S105-T1 + S106-T2 | — |
| Consequências anti-streak (`.consequencia-*`) | 2 | Presente em 2 arquivos do editor de desafio | ATIVO | S106; a execução gameficada da jornada segue fora da V1 (E13) por recorte documentado | — |
| Composer de comunicado (`.comunicado-*`, `.compose-section`, `.estimativa-num`, `select-variavel`) | 4 | `ComunicadosList` + `ComunicadoEditor` (70/30 + preview) | ATIVO | S108/S109 | — |
| Painel de distribuição de kits (`.pc-*`: barras por tamanho/modalidade) | 3 | Sub-tela Distribuição (S205-T4) | ATIVO | Onda 1 | — |
| Editor da página de vendas (`.sc-*`, `.section-card`, `.section-toggle`, `.sc-preview`) | 1 (PaginaVendas-Conteudo) | Nenhum | ADIADO | E04 é Onda 2; tela prevista em S300-T3 (V1-CHECKLIST) | E04-slim, brief `onda2-E04-lotes.md`; depende do gap Switch/Select (lote DS-Forms antes) |
| Financeiro global (tela `Financeiro.html` inteira) | 1 | Nenhum (só existe o financeiro por evento, S207) | ADIADO | Repasses do organizador são E09-slim, Onda 2 (L3-T1: 3 cards vendido/disponível/retido) | E09-slim, brief `onda2-E09slim-lotes.md` |
| Comunicação global (tela `Comunicacao.html` inteira) | 1 | Nenhum (comunicação de clube existe; a de evento entra na Onda 2) | ADIADO | E06 recorte V1 cobre só campanhas do evento; cortes registrados no brief `onda2-E06-lotes.md`. A central global do mockup não tem task própria: herda da soma clube + evento; se o Vitor quiser a central unificada, é decisão nova | E06 (Onda 2); central unificada a arbitrar no fim da Onda 2 |

### E. Artefatos do Claude Design (não são componentes de produto)

| Item | Telas | Classificação | Nota |
|---|---|---|---|
| Painel de ajustes (`.tweaks`, `.tweak-chip`, `.tweak-swatch`, `.tweak-row`, `.tweaks-close`) | 8 | ARTEFATO | Controle de variação de tema/densidade do próprio Claude Design, embutido em 8 telas. Não portar. |
| Marcadores e apoio (`.web-only`, pasta `debug/`, `screenshots/`, `uploads/`, "Painel do Organizador (standalone).html") | 5+ | ARTEFATO | Anotações de plataforma e arquivos de trabalho do export; a standalone é duplicata da tela principal. |

### F. Componentes DS sem par no mockup (referência inversa)

| Componente DS | Situação |
|---|---|
| `Skeleton` | O mockup nunca desenha loading (0 telas); o DS tem e o painel usa em ~25 pontos. DS à frente do mockup, correto. |
| `Tooltip` | Nasceu como prova real do CLI no Lote A (DS-A1); zero consumo no painel até aqui. Vira útil na Onda 2 (tabelas densas, ícones sem label). |
| `ThemeProvider`, pipeline de tokens, `cn` | Infraestrutura, sem expressão visual direta no mockup. |

## Não classificados

Nenhum componente ficou sem categoria. Cerca de 40 classes de 1 a 3 letras do mockup (`.n`, `.d`, `.v`, `.k`, `.m-k`, `.s-v`, `.ok`, `.on`) são micro-utilitárias do CSS artesanal, sem identidade de componente; foram tratadas como vocabulário utilitário e absorvidas pelos grupos acima quando contextuais.

## Método

1. Extração por grep de todos os `class="…"` das 36 telas, com frequência (top: `.badge` 434, `.btn` 294, `.nav-item` 280, `.icon-btn` 146).
2. Agrupamento por componente de facto seguindo o vocabulário consistente que o próprio handoff §1 aponta.
3. Mapeamento contra o barrel do DS (25 componentes exportados) e contra os consumidores reais (`grep` de imports de `@leela/design-system` no painel + componentes locais em `_components/`).
4. Cruzamento com as decisões registradas: brief ds-consolidacao (decisões vinculantes 1 a 4), plano-shadcn §4 e §6, diagnóstico-sidebar §4, V1-CHECKLIST (gate B5 e Onda 2).
