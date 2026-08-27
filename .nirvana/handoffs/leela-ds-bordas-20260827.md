# Handoff — DS-BORDAS-E-BENTO (2026-08-27)

Branch: `ds/bordas-e-bento-20260827`
Lane: `leela-ds-bordas-20260827`
Itens: V2708-07, V2708-02, V2708-08, V2708-16

---

## V2708-07 — Remoção de bordas de bento cards e tabelas

### Regra aplicada (§2.16)

Separação por superfície e elevação; borda decorativa zero. Exceções documentadas
no comentário de Card.tsx: KpiCard crítico (acento esquerdo), Toast urgente/critical,
CardDominio active, e similares — permanecem pela intenção semântica do destaque.

### Inventário de remoções

| Componente | Arquivo | O que foi removido | O que substituiu |
|---|---|---|---|
| `Card` (root) | `packages/design-system/src/components/Card/Card.tsx` | `border border-border` do className base | Elevação via `shadow-elev-1` já existente |
| `TableRow` | `packages/design-system/src/components/Table/Table.tsx` | `border-b border-b-[var(--border-subtle)]` | Zebra stripe: `even:bg-[var(--table-header-bg)]` |
| `TableCell` (card-mode) | `packages/design-system/src/components/Table/Table.tsx` | `max-lg:border-b max-lg:border-b-[var(--border-subtle)]` | Espaço/padding preservado |
| `TableRow` (card-mode body) | `packages/design-system/src/components/Table/Table.tsx` | `max-lg:border-b-0 max-lg:[&>*:last-child]:border-b-0` | Removido (era reset de borda que deixou de existir) |

**Tokens usados (sem invenção):** `--table-header-bg` já existia para o background
do `<thead>`; reutilizado como zebra stripe (aprox. 1.5% tint = separação sutil).

### Testes atualizados

- `Card/__tests__/Card.test.tsx`: asserção `not.toContain('border-border')` (intenção mantida: ausência de borda é a regra)
- `apps/painel/src/routes/eventos/kits/__tests__/superficie-cartoes.test.tsx`: idem, 2 testes de KitCard e ItemCard

---

## V2708-02 — Conteúdo flutuando sem Card no painel

### Varredura de telas mencionadas pelo dono (Kits)

Rota: `apps/painel/src/routes/eventos/kits/`

| Seção | Estado anterior | Estado após |
|---|---|---|
| "Kits do evento" | `<section>` nua sem wrapper | `<Card as="section" aria-label="Kits do evento">` |
| "Catálogo de itens" | `<section>` nua sem wrapper | `<Card as="section" aria-label="Catálogo de itens">` |

Arquivo modificado: `apps/painel/src/routes/eventos/kits/KitsCadastroView.tsx`

### Outras rotas verificadas

Varredura adicional nas rotas de eventos (overview, financeiro, comunicação,
check-in): conteúdo relevante já estava em `<Card>` do DS ou em componentes
de tabela do DS. Nenhuma outra seção identificada como "conteúdo flutuando
sem Card" com impacto visual equivalente ao dos Kits.

---

## V2708-08 — Auditoria de duplicação DS × apps

### Resposta direta ao dono: "Estou enganado?"

**Não, você não está enganado.** O painel tem pelo menos 5 componentes locais
que duplicam padrões já existentes (ou recém-publicados) no DS. Isso não é
catástrofe — a maioria nasceu antes do padrão existir — mas o custo de drift
cresce a cada sprint que os dois caminham separados.

### Números

| Métrica | Valor |
|---|---|
| Famílias de componentes no DS (`packages/design-system/src/components/`) | **65** |
| Arquivos `.tsx` no DS (excluindo testes) | **137** |
| Componentes locais em `apps/painel/src/components/` | **7** |
| Duplicatas identificadas (painel local vs DS) | **5** |

### Inventário de duplicatas

| Local (painel) | DS equivalente | Custo de consolidação |
|---|---|---|
| `components/SecaoHead.tsx` | `SectionHeader` (publicado em 2026-08-11) | **Barato ~2h** — SecaoHead já usa o DS internamente; substituir chamadas nas rotas que a importam (OverviewView, EngajamentoView). |
| `routes/eventos/evento/overview/OverviewKpis.tsx` → `KpiTile` (inline) | `KpiCard` | **Médio ~4h** — KpiTile tem prop `icon` opcional que KpiCard já suporta; checar se `variante` mapeia direto. |
| `routes/eventos/financeiro/FinanceiroView.tsx` → `CardValor` | `DefinitionItem` | **Médio ~3h por instância** — 3 instâncias independentes; o slot de label/valor/trend está em DefinitionItem. |
| `routes/eventos/comunicacao/ComunicacaoView.tsx` → `CardValor` | `DefinitionItem` | (incluso acima) |
| `routes/eventos/repasses/_components/SaldoCards.tsx` → `CardValor` | `DefinitionItem` | (incluso acima) |

**Total consolidação barata (SecaoHead):** ~2h, 1 arquivo deletado, ~3 rotas atualizadas.
**Total consolidação média (KpiTile + 3× CardValor):** ~13h, requer validação de props e snapshot.

### O que NÃO é duplicata

- `CartaoV3.tsx` — experimento de card com blur/glass específico de landing B (não tem par no DS; candidato a subir depois da estabilização do `Card`).
- `InsightsDaLeela.tsx` — composição de tela (AI summary block), não primitivo de UI.
- `fields/DateField.tsx`, `fields/DateTimeField.tsx` — wrappers de integração com react-hook-form + date-fns; DS não tem opinião sobre integração de formulário.
- `nav/AreaSubNav.tsx` — layout de rota específico, não componente reutilizável.

---

## V2708-16 — Catraca de governança

### (a) Tailwind alpha modifier + var() hex — instância corrigida

**Problema:** `bg-surface-base/80` no overlay do Dialog era silenciosamente descartado
por Tailwind. O preset mapeia tokens para `var(--token)` que resolve em hex — o
modificador `/80` precisa de canais RGB separados ou `color()` syntax.

**Correção aplicada:**
- `packages/design-system/src/components/Dialog/Dialog.tsx` linha ~202:
  `bg-surface-base/80` → `bg-[var(--dialog-overlay-bg)]`
- Token `--dialog-overlay-bg` adicionado nos 3 temas com rgba já calculada:
  - `brasa.css`: `rgba(12,12,12,0.80)` (surface-base `#0C0C0C`)
  - `wine.css`: `rgba(253,250,247,0.80)` (surface-base `#FDFAF7`)
  - `dark-wine.css`: `rgba(8,3,6,0.80)` (surface-base `#080306`)
  - `themes/index.css`: bloco inline equivalente nos 3 seletores de tema

**Regra de governança a documentar:** nunca usar `/alpha` com tokens do preset
LEELA — sempre criar um token dedicado com rgba pré-computada ou usar `color-mix()`
quando os valores forem estáticos por tema.

### (b) Lint plugin — furo com underscore em arbitrary values

**Problema:** `shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.5)]` passava sem flagrar
porque Tailwind converte `_` em espaço internamente, mas o regex `\b` (word boundary)
falha entre `_` (word char) e letras/dígitos adjacentes.

**Correção aplicada em `packages/design-system/lint/leela-tokens-plugin.mjs`:**
- No loop `ARBITRARY_SEGMENT`, a string `inner` passa por `replace(/_/g, ' ')` antes
  das checagens de `RAW_UNIT`, `COLOR_FN` e `NAMED_COLOR`.
- Resultado: `_rgba(` normaliza para ` rgba(` e é flagrado por `COLOR_FN`.

**Casos de regressão adicionados** (4 testes em `lint/__tests__/leela-tokens-plugin.test.mjs`):
- Flagra `shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.5)]`
- Flagra `grid-[64px_auto]`
- Flagra `bg-[0_0_0_hsla(0,0%,0%,0.5)]`
- Não flagra `shadow-[var(--elevation-1)_var(--elevation-2)]` (legítimo)

---

## Gate visual

Screenshots em `.nirvana/gate-visual/ds-bordas-bento/`:
- `01-login-card-sem-borda.png` — AuthCard sem borda, tema brasa
- `02-recuperar-senha-sem-borda.png` — AuthCard sem borda
- `03-cadastrar-sem-borda.png` — AuthCard com formulário (Card como section)

Servidor: `npx vite preview --port 4611` (PID encerrado após capturas).
Config: `.nirvana/gate-visual/ds-bordas-bento/playwright.gate.config.ts`.

---

## Status dos gates

| Gate | Resultado |
|---|---|
| lint (design-system) | 0 erros, 0 warnings |
| lint (painel) | 0 erros, 0 warnings |
| tsc (design-system) | 0 erros |
| tsc (painel) | 0 erros |
| build `@leela/painel` | OK (4.07s, 4 tasks) |
| tests design-system | 92 passed (2 falhos pré-existentes: ThemeProvider + showcase-init-theme, localStorage no jsdom — não relacionados) |
| tests painel (kits/superficie-cartoes) | 14 passed |
| tests lint plugin | 19 passed (incl. 4 novos V2708-16b) |
| gate visual Playwright | 3 passed (7.9s) |
