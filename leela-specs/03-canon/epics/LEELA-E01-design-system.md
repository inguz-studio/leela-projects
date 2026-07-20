# LEELA-E01 · Design System temável & Shell (como código)

- **Superfície:** Todas
- **Horizonte:** H1 (Onda 0 → habilita Onda 1)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 📋 Backlog (DS visual v3 pronto; portar para código)
- **Depende de:** LEELA-E00
- **De-para:** BH-E01 (Foundation)

## Objetivo

Portar o Design System v3 para código em `packages/design-system`, como **sistema temável**: um conjunto único de componentes React (e variante React Native) consome **tokens semânticos**; os temas `brasa` (identidade atual das 36 telas) e `leela` (Oxblood/Lima) são apenas conjuntos distintos de **tokens primitivos**, trocáveis em runtime via `ThemeProvider`. Nenhuma tela redefine token ou componente localmente — essa é a governança. Os componentes web são construídos com **Tailwind CSS + shadcn/ui (Radix)**, customizados para atender às regras §2.x; os tokens do tema `brasa` (e do `leela`) alimentam o `tailwind.config.ts` + o tema shadcn, mantendo o contrato semantic-only.

## Personas & JTBD

Infraestrutura de UI. Serve todas as personas via consistência visual e velocidade de construção das telas de domínio.

## Critérios de sucesso do épico

- `tokens.json` gera CSS custom properties (web) e objeto de tema (RN), em **3 tiers** (primitives → semantic → component).
- Trocar `theme="brasa"` ↔ `theme="leela"` re-tematiza todas as telas sem tocar componente.
- Biblioteca de componentes cobre o inventário abaixo, com variantes/estados e a11y AA.
- Catálogo navegável (Storybook ou equivalente) documenta cada componente.
- Shell (Sidebar 8 itens + Breadcrumb + Header 96px §2.1 + SubNav §2.14) montável em qualquer app.

## Regras de negócio / de design aplicáveis

- §2.1 (Header 96px), §2.2/§2.14 (sub-nav, underline Brasa 2px na ativa + contador pill), §2.5 (tabela densa: linha 64px), §2.7 (tabs no DOM), §2.15 (ConfirmModal com preview de consequências), §2.16 (flat, sem borda decorativa; exceções: input, divider, card selecionado, upload dashed, card crítico border-left Vulcão).
- Governança de tokens: componente referencia **semantic**, nunca primitivo direto.

## Modelo de dados tocado

Nenhum. Puramente apresentação.

## Fora de escopo

- Telas de domínio (ficam nos épicos de cada módulo).
- Migração visual das 36 telas para o tema `leela` (decisão de tema fica no consumidor; o E01 só entrega ambos os temas).

---

## Tema · arquitetura de tokens (3 tiers)

- **Primitives** (por tema): escalas de cor cruas. Tema `brasa`: Brasa 50→900 (500 `#FF450C`), Vulcão, Heroico, Vitória, Alerta, Neutros (surface base `#0C0C0C`, raised `#161616`). Tema `leela`: Oxblood `#7A1520` + Lima `#C8E84A` + neutros próprios.
- **Semantic** (compartilhado entre temas): `--surface-base/raised/overlay/high/sunken`, `--text-primary/secondary/tertiary/disabled/brand/danger/success`, `--action-primary(+hover/pressed/disabled)/secondary/destructive`, `--border-subtle/default/strong/brand/focus/danger`, feedback success/danger/warning/info.
- **Component:** `--btn-height-md`, etc.
- **Tipografia:** por tema — `brasa`: Exo 2 (display+ui) + JetBrains Mono; `leela`: Figtree/Syne conforme a marca. Escala Major Third (10→50px); H3+ Bold Italic; sem italic ≤16px.
- **Espaçamento** baseline 4px; **radius** none→pill; **elevação** elev-0→3 + elev-brand (glow); **motion** com `prefers-reduced-motion`; **ícones** Lucide 24×24 stroke 1.75 currentColor.

---

## User stories

### LEELA-S001-1 · Tokens em 3 tiers + temas trocáveis · (de-para BH-E01)

**Como** time, **quero** os tokens como código em tiers com temas trocáveis, **para** re-tematizar o produto sem tocar componentes.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Todas · **RNs:** §2.16

**Critérios de aceite:**
- **Dado** `theme="brasa"`, **quando** renderizo qualquer componente, **então** usa Brasa `#FF450C` + Exo 2.
- **Dado** que troco para `theme="leela"`, **quando** re-renderiza, **então** paleta e tipografia mudam sem alterar markup do componente.
- **Dado** um componente, **quando** referencia cor, **então** usa token semantic (nunca hex nem primitivo direto).

**Tasks:**

#### LEELA-S001-1-T1 · `tokens.json` (3 tiers) + gerador CSS vars / tema RN
- **Tipo:** ui-component · **Depende de:** E00-S000-1-T4 · **Estimativa:** M
- **Arquivos:** `packages/design-system/tokens/{primitives.brasa,primitives.leela,semantic,component}.json`; `packages/design-system/src/theme/generate.ts` (gera CSS vars web + objeto RN); `themes/{brasa,leela}.css`
- **Passos:** 1) codificar primitives dos dois temas (do design brief); 2) mapear semantic → primitive; 3) gerador que emite `:root[data-theme="brasa"]{...}` e `[data-theme="leela"]{...}` + export tipado p/ RN.
- **Aceite:** dado build, quando gero, então saem os dois arquivos de tema e um `tokens.d.ts` tipado.
- **Testes:** unit — semantic sempre resolve para um primitive existente no tema.

#### LEELA-S001-1-T2 · `ThemeProvider` (web + RN) com troca em runtime
- **Tipo:** ui-component · **Depende de:** T1 · **Estimativa:** S
- **Arquivos:** `packages/design-system/src/theme/ThemeProvider.tsx` (web via `data-theme` no root) + variante RN (context).
- **Aceite:** dado `<ThemeProvider theme="leela">`, quando monto, então `data-theme="leela"` aplica e os componentes re-tematizam.
- **Testes:** unit — troca de tema muda a var computada.

### LEELA-S001-2 · Componentes átomos · (de-para BH-E01)

**Como** dev de telas, **quero** os átomos do DS, **para** montar qualquer tela sem estilizar do zero.

- **MoSCoW:** Must · **Estimativa:** M · **RNs:** §2.16

**Critérios de aceite:**
- **Dado** cada átomo, **quando** uso, **então** cobre todas as variantes/estados e é acessível (foco, contraste AA).

**Tasks:**
#### LEELA-S001-2-T1 · Button (Primary/Secondary/Ghost/Destructive · sm/md/lg · estados)
- **Tipo:** ui-component · **Depende de:** S001-1-T2 · **Estimativa:** S
- **Arquivos:** `packages/design-system/src/components/Button/*`
- **Detalhe:** máx 1 Primary por tela; radius-sm; SemiBold 16px sem italic; foco 2px AA; `type="button"` default (RN anti-submit acidental).
- **Testes:** render por variante/estado; ação de clique; foco por teclado.
#### LEELA-S001-2-T2 · Input, Badge, Chip, Avatar, Divider
- **Tipo:** ui-component · **Depende de:** S001-1-T2 · **Estimativa:** M
- **Detalhe:** Input estados default/hover/focus(glow)/invalid(border-danger+erro inline)/disabled; Badge semânticos (brasa/heroico/vulcao/vitoria/alerta/neutro — nunca misturar semântica); Chip radius-pill active brasa; Avatar sm/md/lg + gradiente inicial + estado VIP; Divider subtle/default/strong.
- **Testes:** render por variante/estado; Input inválido mostra erro.

### LEELA-S001-3 · Moléculas & organismos · (de-para BH-E01)

**Como** dev de telas, **quero** os componentes compostos (tabela densa, sub-nav, modais, cards, shell), **para** entregar telas de domínio rapidamente e consistentes.

- **MoSCoW:** Must · **Estimativa:** L · **RNs:** §2.5, §2.7, §2.14, §2.15, §2.16

**Critérios de aceite:**
- **Dado** ConfirmModal, **quando** disparo ação destrutiva, **então** mostra preview de consequências (perde/mantém) e confirma em Vulcão (§2.15).
- **Dado** Table densa, **quando** listo, **então** linha 64px, header uppercase, paginação e EmptyState.

**Tasks:**
#### LEELA-S001-3-T1 · Shell (Sidebar 8 itens + Breadcrumb + Header 96px + SubNav §2.14)
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** Sidebar OPERAÇÃO (Visão Geral, Eventos badge, Clubs, Financeiro, Comunicação, Marcas, Analytics) + CONTA (Configurações); SubNav underline Brasa 2px + contador pill; Header 96px (avatar/nome/badges/metadados/ações).
#### LEELA-S001-3-T2 · Table densa (§2.5) + EmptyState + paginação + Popover de linha
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** linha 64px, padding 14/20, header uppercase 0.08em; EmptyState "Nenhum X encontrado com os filtros aplicados"; contador "mostrando X de Y"; Popover (só um aberto por vez, `stopPropagation`).
#### LEELA-S001-3-T3 · Modal + ConfirmModal (§2.15) com 4 vias de fechamento
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** overlay blur; larguras 480/560/640; fechar por cancelar/X/overlay/Esc; ConfirmModal com card do alvo + lista perde (Vulcão) + mantém (Vitória) + motivo opcional + checkbox notificar.
#### LEELA-S001-3-T4 · Toast, Cards (Evento/Desafio), Stepper, Skeleton, Tabs (§2.7)
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** Toast some 4s (danger persiste), borda esq 3px por variante; Card Evento (media 16/10 gradiente por categoria + badge modalidade, hover translateY); Card Desafio (progress-bar vitoria + 100% elev-brand); Stepper de checkout 5 etapas; Skeleton shimmer (nunca spinner solto em lista); Tabs todas no DOM.

### LEELA-S001-4 · Governança & catálogo · (de-para BH-E01)

**Como** time, **quero** um catálogo documentado e regras de governança, **para** que o DS permaneça único e consistente ao longo do tempo.

- **MoSCoW:** Should · **Estimativa:** S

**Critérios de aceite:**
- **Dado** o catálogo, **quando** abro, **então** vejo cada componente com props, variantes e exemplos, nos dois temas.
- **Dado** um PR de tela, **quando** usa cor/spacing hardcoded, **então** o lint de tokens acusa.

**Tasks:**
#### LEELA-S001-4-T1 · Catálogo (Storybook) dos componentes nos 2 temas
- **Tipo:** ui-component · **Estimativa:** S
#### LEELA-S001-4-T2 · Lint de tokens (proíbe hex/px hardcoded em componentes) + doc de governança
- **Tipo:** setup · **Estimativa:** XS
- **Arquivos:** `leela-specs/governanca-design.md` (regras: semantic-only, flat §2.16, a11y AA, nomenclatura, processo de adicionar componente/token).

---

## Ordem sugerida

`S001-1 (tokens+tema) → S001-2 (átomos) → S001-3 (moléculas/organismos) → S001-4 (governança)`. Ao fim, Onda 1 (E05/E03/E02) consome estes componentes.

---

## Regras de negócio novas (IA-MENU · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-ia-menu/`. O E01 é o dono da navegação — a arquitetura de informação do menu principal é regra deste épico, e os épicos de domínio (E09, E11, E19, E03) apenas consomem o endereço que ela define. Verbatim e desenho completo em `00-decisao.md`; mapa das rotas em `01-mapa-de-para.md`.

- **RN-233 · O menu principal tem 6 áreas.** OPERAÇÃO: **Visão geral · Eventos · Clubs · CRM · Marcas**; CONTA: **Configurações**. Saem `Financeiro` (os dois filhos se mudaram: Análise → CRM › Visão geral; Repasses → Eventos › Repasses) e `Analytics` (placeholder sem rota, hoje suprimido no consumidor pela RN-821 — passa a ser removido do `DEFAULT_SIDEBAR_SECTIONS` do próprio DS, e o filtro `IDS_SUPRIMIDOS` do painel deixa de existir). `Comunicação` vira **CRM** (id `crm`, destino `/crm`). **Item de menu sem rota é proibido** — por isso `Configurações` passa a apontar para `/conta`, fechando a última entrada inerte. A troca dentro de cada área acontece por SubNav no padrão §2.14 (underline 2px na ativa, divisória, rolagem lateral própria em tela estreita), o mesmo componente que Eventos, Clubs e o antigo Financeiro já usavam.
- **RN-234 · Rota antiga nunca quebra.** Toda URL que existia antes de uma reorganização de navegação redireciona para o destino novo, preservando o que vier depois do prefixo. Para esta rodada: `/financeiro` → `/crm`; `/financeiro/repasses` → `/eventos/repasses`; `/financeiro/*` → `/crm`; `/crm/{chave}` no formato antigo → `/crm/clientes/{chave}`. O redirecionamento é declarado na entrada da rota (sem camada nova, sem configuração de servidor) e **cada linha do mapa tem teste próprio** — a falha aqui é silenciosa no build e barulhenta na cara de quem clicou. Armadilha estrutural: a rota legada `/crm/:param` casa com qualquer segmento, então as subdivisões nomeadas (`clientes`, `comunicacao`) precisam ser declaradas antes do parâmetro, com teste provando que `/crm/clientes` abre a lista e não entra em laço.

### Efeito no S001-3-T1 (Shell)

A task de Shell foi escrita com "Sidebar OPERAÇÃO (Visão Geral, Eventos badge, Clubs, Financeiro, Comunicação, Marcas, Analytics) + CONTA (Configurações)" — **8 itens**. Esse inventário está superado pela RN-233. O contrato do componente não muda (seções, itens, badge, item ativo derivado do pathname); muda a lista default e a documentação que a acompanha: `Sidebar.stories.tsx`, `Sidebar.docs.mdx`, `LLM.txt` e a suíte do Sidebar precisam ser reconciliados para 6 itens no mesmo lote — senão o catálogo passa a documentar um menu que não existe, que é exatamente o tipo de divergência que a governança do S001-4 existe para impedir.

**Execução:** `IAM-T1` (menu de 6 áreas, rota sonnet) e `IAM-T6` (redirects, rota sonnet) em `02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`.
