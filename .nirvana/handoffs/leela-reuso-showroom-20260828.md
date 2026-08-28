# Handoff — REUSO-E-SHOWROOM (2026-08-28)

Branch: `ds/reuso-showroom-20260828`
Lane: `leela-reuso-showroom-20260828`
Itens: SecaoHead → SectionHeader, inventário de cobertura, catraca §10

---

## Bloco 1 — Consolidação SecaoHead → SectionHeader

### Contexto

O handoff DS-BORDAS-20260827 (V2708-08) identificou `SecaoHead` como a
consolidação "barata (~2h)": arquivo local que duplicava o `SectionHeader`
publicado no DS em 11/08. O próprio comentário do SecaoHead argumentava que
a peça "não sobe ao design system porque é composição de tela" — a CANONE-1
decidiu o contrário.

### Usos migrados

7 usos em um único arquivo (`apps/painel/src/routes/clubes/engajamento/EngajamentoView.tsx`):

| Uso | Props usadas |
|-----|-------------|
| `CardEmBreve` (linha ~261) | `titulo` |
| `RankingDeDesafios` (linha ~318) | `titulo` + `ajuda` (dinâmica) + `controle` |
| `ModalidadesDaComunidade` (linha ~411) | `titulo` + `ajuda` (dinâmica) + `controle` |
| Equilíbrio dos pilares (linha ~641) | `titulo` + `ajuda` |
| Situação dos membros (linha ~689) | `titulo` + `ajuda` |
| Como a comunidade entra (linha ~713) | `titulo` + `ajuda` |
| Desafios ligados a um evento (linha ~809) | `titulo` + `ajuda` |

### Mapeamento de props

| SecaoHead prop | SectionHeader prop | Notas |
|---|---|---|
| `titulo` | `title` | — |
| `descricao` | `description` | — |
| `ajuda` (string) | `help` (ReactNode) | Ver AjudaDoBloco abaixo |
| `controle` | `control` | — |
| `acaoRotulo` + `onAcao` | `action` (ReactNode) | Não usado em prod — padrão no teste |

### AjudaDoBloco

O `SectionHeader` do DS tem o slot `help` como ReactNode puro — a peça fica
sem estado e server-safe. O padrão do "?" (Popover + IconButton com
`aria-label` que cita o bloco) foi extraído para:

`apps/painel/src/components/AjudaDoBloco.tsx`

Reutilizável em qualquer bloco do painel que precise de contexto de ajuda.
Preserva todas as regras do REFACTOR item 8:
- Portal fora da árvore do card
- Família tipográfica declarada no PopoverContent
- Nome acessível cita o título do bloco

### Arquivos deletados

- `apps/painel/src/components/SecaoHead.tsx`
- `apps/painel/src/components/__tests__/SecaoHead.test.tsx`

### Arquivos criados / modificados

- `apps/painel/src/components/AjudaDoBloco.tsx` (novo)
- `apps/painel/src/components/__tests__/AjudaDoBloco.test.tsx` (novo, migrado de SecaoHead.test)
- `apps/painel/src/routes/clubes/engajamento/EngajamentoView.tsx` (migrado)
- `eslint.config.mjs` (entrada morta de SecaoHead.tsx removida da dívida herdada)
- `scripts/gate-canon.baseline.json` (atualizado: `padrao-reimplementado-fora-do-ds.total: 3 → 2`)

### Gates

- Build: PASS (pnpm turbo build)
- Lint: PASS 0 warnings
- gate-canon: PASS
- Testes painel: 265 arquivos, 3067 testes — todos verdes

---

## Bloco 2 — Inventário de cobertura Showroom × Storybook × Docs

### Metodologia

- **Storybook**: presença de `*.stories.tsx` (direto ou em subdiretório) no
  diretório do componente em `packages/design-system/src/components/`
- **Showcase**: presença de uso real (import + demo interativa) em
  `packages/design-system/showcase/src/sections/ComponentsPage.tsx` ou
  `App.tsx`
- **Doc**: presença de `*.docs.mdx` no diretório do componente

Unidade de medição: **família de componente** = diretório em
`packages/design-system/src/components/`. Total: **65 famílias**.

O barrel exporta **93 nomes** (incluindo sub-componentes como `CardContent`,
`PopoverTrigger`, `RadioCard`, `CommandInput`, etc.).

### Matriz completa de cobertura

| Componente | Story | Showcase | Doc |
|---|:---:|:---:|:---:|
| Alert | ✓ | ✓ | ✓ |
| AppShell | ✓ | ✓ (App.tsx) | ✓ |
| Avatar | ✓ | ✓ | ✓ |
| Badge | ✓ | ✓ | ✓ |
| BottomNav | ✓ | ✗ (harness separado) | ✓ |
| Breadcrumb | ✓ | ✓ | ✓ |
| Button | ✓ | ✓ | ✓ |
| Calendar | ✓ | ✓ (DatePicker/DateRangePicker) | ✗ |
| Card | ✓ | ✓ (ui.tsx) | ✓ |
| CardDesafio | ✓ | ✓ | ✓ |
| CardDominio | ✓ | ✓ | ✓ |
| CardEvento | ✓ | ✓ | ✓ |
| charts (BarChart/DonutChart) | ✓ | ✓ | ✗ |
| Checkbox | ✓ | ✓ | ✗ |
| CheckboxField | ✓ | ✓ | ✓ |
| Chip | ✓ | ✓ | ✓ |
| Combobox | ✓ | ✓ | ✗ |
| Command | ✓ | ✓ (via Combobox demo) | ✗ |
| DateBadge | ✓ | ✗ | ✓ |
| DefinitionItem | ✓ | ✓ | ✓ |
| Dialog | ✓ | ✓ | ✗ |
| Divider | ✓ | ✓ | ✓ |
| Drawer | ✓ | ✓ | ✓ |
| DropdownMenu | ✓ | ✓ | ✓ |
| EmptyState | ✓ | ✓ | ✓ |
| EventRow | ✓ | ✗ | ✓ |
| Field | ✓ | ✓ | ✗ |
| FieldGroup | ✓ | ✓ | ✓ |
| FileInput | ✓ | ✓ | ✓ |
| FilterBar | ✓ | ✓ | ✓ |
| FilterChips | ✓ | ✓ | ✓ |
| FilterMenu | ✓ | ✓ | ✓ |
| FormGrid | ✓ | ✓ | ✓ |
| IconButton | ✓ | ✓ | ✓ |
| Input | ✓ | ✓ | ✓ |
| InputSenha | ✓ | ✗ | ✗ |
| KpiCard | ✓ | ✓ | ✓ |
| MetricGrid | ✓ | ✓ | ✓ |
| Modal | ✓ | ✓ | ✓ |
| PageHeader | ✓ | ✓ | ✓ |
| Pagination | ✓ | ✓ | ✓ |
| Popover | ✓ | ✓ | ✓ |
| Radio | ✓ | ✓ | ✗ |
| ResultCount | ✓ | ✓ | ✓ |
| RowActions | ✓ | ✗ | ✗ |
| SearchInput | ✓ | ✓ | ✓ |
| SectionHeader | ✓ | ✓ | ✓ |
| Select | ✓ | ✓ | ✗ |
| Sidebar | ✓ | ✓ | ✓ |
| SidebarRail | ✓ | ✗ (harness separado) | ✗ |
| Skeleton | ✓ | ✓ | ✓ |
| Sparkline | ✓ | ✗ | ✓ |
| SplitPanel | ✓ | ✓ | ✓ |
| Stack | ✓ | ✓ | ✓ |
| Stepper | ✓ | ✓ | ✓ |
| SubNav | ✓ | ✓ | ✓ |
| Switch | ✓ | ✓ | ✗ |
| SystemStateScreen | ✓ | ✗ | ✗ |
| Table | ✓ | ✓ | ✓ |
| Tabs | ✓ | ✓ | ✓ |
| Textarea | ✓ | ✓ | ✗ |
| Thumb | ✓ | ✓ | ✓ |
| Toast | ✓ | ✓ (via useToast demo) | ✓ |
| Toolbar | ✓ | ✗ | ✓ |
| Tooltip | ✓ | ✓ | ✓ |

### Números

| Dimensão | Com cobertura | Sem cobertura | % |
|---|---:|---:|---:|
| Storybook (story) | **65** | **0** | **100%** |
| Showcase (demo interativa) | **56** | **9** | **86%** |
| Docs (`.docs.mdx`) | **50** | **15** | **77%** |

### Componentes sem showcase (9)

BottomNav, DateBadge, EventRow, InputSenha, RowActions, SidebarRail,
Sparkline, SystemStateScreen, Toolbar.

*Nota: BottomNav e SidebarRail têm harness separado (`harness-bottomnav.html`);
são casos de layout que não encaixam no ComponentsPage.*

### Componentes sem doc (15)

Calendar, charts, Checkbox, Combobox, Command, Dialog, Field, InputSenha,
Radio, RowActions, Select, SidebarRail, Switch, SystemStateScreen, Textarea.

### Stories novas escritas nesta lane

**Nenhuma.** Todos os 65 componentes já tinham `*.stories.tsx` — incluindo
Card, Table, Dialog e Badge, mencionados como candidatos pela tarefa. A
catraca `componente-sem-story.ds = 0` (implementada no Bloco 3) agora
trava essa linha.

---

## Bloco 3 — Catraca §10: `componente-sem-story.ds`

### Implementação

Adicionado ao `scripts/gate-canon.mjs` (antes da comparação com o baseline),
seguindo o padrão dos existentes:

```
componente-sem-story.ds = 0  ← baseline de 28/08 (100% de cobertura)
```

**O que conta:** diretórios em `packages/design-system/src/components/` que
não têm nenhum arquivo `*.stories.tsx` — verificação recursiva para capturar
stories em subdiretórios (como `charts/BarChart.stories.tsx`).

**Semântica da catraca:**
- Baseline = 0 (todas as 65 famílias têm story em 28/08)
- SUBIR reprova: novo componente sem story falha o gate
- DESCER é impossível (mínimo = 0) — o contador mede ausência, não presença
- `--relatorio` lista os diretórios sem story para triagem

**Arquivo:** `scripts/gate-canon.mjs` (linhas adicionadas antes de
"comparação com o baseline")

**Baseline:** `scripts/gate-canon.baseline.json`
```json
"componente-sem-story": { "ds": 0 }
```

### O que a catraca NÃO mede (e por quê)

| Dimensão | Por que não |
|---|---|
| Showcase (56/65) | Número alto de exceções legítimas (BottomNav/SidebarRail têm harness separado; componentes de infraestrutura não têm demo natural) — um baseline de 9 "sem showcase" desceria devagar e geraria falsos positivos |
| Docs (50/65) | A ausência de `.docs.mdx` não é bloqueante no processo atual — o DoD de componente menciona story, não MDX separado. Medir sem plano de resolver gera ruído. |

**Plano dimensionado para o dono priorizar:**

- **Docs das 15 famílias sem .docs.mdx:** ~30h total (2h/família × 15).
  Componentes de maior uso no painel que justificam priorização: Dialog,
  Checkbox, Select, Radio, Textarea (5 famílias × 2h = 10h primeira onda).

- **Showcase das 9 famílias sem demo:** ~18h total (2h/família × 9).
  Candidatos imediatos (não são harness especiais): DateBadge, EventRow,
  Sparkline, SystemStateScreen, Toolbar, InputSenha (6h primeira onda).

---

## Gate visual

Screenshots em `.nirvana/gate-visual/reuso-showroom/`:
- `01-section-header-showcase.png` — SectionHeader com slots (help, control, action) no showcase
- `02-componentes-overview.jpg` — galeria de componentes com SectionHeader visível

Servidor: `vite preview --port 4616` (PID 78537 encerrado após capturas).

---

## Status dos gates

| Gate | Resultado |
|---|---|
| Build (turbo) | PASS |
| Lint painel | PASS (0 warnings) |
| TSC | (coberto pelo build turbo) |
| `node scripts/gate-canon.mjs` | PASS |
| Testes painel | 265 arquivos · 3067 testes PASS |
| Testes DS | 2150 PASS · 31 FAIL (pré-existentes: ThemeProvider localStorage + Toast sem provider — não relacionados a esta lane) |
| Gate visual | Screenshots em `.nirvana/gate-visual/reuso-showroom/` |
