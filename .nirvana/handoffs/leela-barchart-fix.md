# Handoff — BARCHART-FIX · aridade do tickFormatter no BarChart do DS

- **trace_id:** `leela-redesign-v2-20260810` · lane BARCHART-FIX
- **worktree:** `C:\dev\leela-wt-redesign-v2` · branch `redesign-engajamento-v2` · base `dec4c2cc` (árvore limpa confirmada no início)
- **fonte:** achado registrado na lane UXW-FIX (`.nirvana/handoffs/leela-uxw-fix.md`, seção 7), fora do diff daquela lane
- **status:** PAGA. Gates verdes, bundle novo no ar em `:4601`, nenhum deploy.

---

## 1. O defeito

`packages/design-system/src/components/charts/BarChart.tsx` passava
`tickFormatter={truncarRotulo}` direto para o `YAxis` do Recharts. O Recharts
chama `tickFormatter(valor, índice)` — dois argumentos —, e o segundo caía no
parâmetro `max` de `truncarRotulo(rotulo, max = TICK_MAX_CHARS)`. Resultado:
todo rótulo do eixo Y truncava para o índice da barra em caracteres (barra 0
→ 1 char, barra 1 → 1 char, barra 2 → 1 char), reproduzido no build servido
com "Ativos" (6 caracteres) num container de 505px — não era falta de
espaço, era aridade quebrada. Pré-existente desde `a826dc3a`.

## 2. O conserto

Novo export `formatarTickEixoY(valor, _index?)` em `BarChart.tsx`, que ignora
o segundo argumento e chama `truncarRotulo(valor)` só com o valor —
`TICK_MAX_CHARS` segue como default dentro de `truncarRotulo`, intocado. O
`YAxis` passa a usar `tickFormatter={formatarTickEixoY}` no lugar da
referência direta.

```diff
+/**
+ * Wrapper de aridade do `tickFormatter` do eixo Y — o Recharts chama o
+ * formatter com `(valor, índice)`; passar `truncarRotulo` direto faz o
+ * índice da barra cair no parâmetro `max`, truncando TODO rótulo do eixo
+ * para 1 caractere (achado UXW-FIX, pré-existente desde `a826dc3a`). O 2º
+ * argumento é ignorado de propósito — só o valor decide o truncamento.
+ * @pure
+ */
+export function formatarTickEixoY(valor: string, _index?: number): string {
+  return truncarRotulo(valor);
+}
...
-              tickFormatter={truncarRotulo}
+              tickFormatter={formatarTickEixoY}
```

Optei por um wrapper nomeado e exportado (em vez do arrow inline
`tickFormatter={(v) => truncarRotulo(v)}`) porque fica testável isoladamente,
chamando-o exatamente como o Recharts chama, sem precisar mockar o módulo
`recharts` (que não desenha SVG em jsdom — comentário já existente no topo
do arquivo de teste).

**Invariantes preservados:** API pública do `BarChart` (`BarChartProps`)
intacta; tabela sr-only com identidade completa intacta; `truncarRotulo` e
`TICK_MAX_CHARS` sem mudança de assinatura ou comportamento; os 3 testes
pré-existentes de `truncarRotulo` intactos.

## 3. Teste de aridade

Adicionado em `packages/design-system/src/components/charts/__tests__/BarChart.test.tsx`,
logo após o describe de `truncarRotulo`:

```ts
describe('formatarTickEixoY (BARCHART-FIX · aridade do tickFormatter)', () => {
  it('chamado exatamente como o Recharts chama — (valor, índice) — não deixa o índice virar `max`', () => {
    expect(formatarTickEixoY('Corrida noturna — Ibirapuera', 0)).toBe('Corrida notu…');
    expect(formatarTickEixoY('Ativos', 0)).toBe('Ativos');
    expect(formatarTickEixoY('Ativos', 1)).toBe('Ativos');
    expect(formatarTickEixoY('Ativos', 2)).toBe('Ativos');
  });
});
```

Chama o formatter com `(value, index)` — a assinatura literal que o Recharts
usa — e prova as duas pontas: o caso que TEM que truncar (nome longo) segue
truncando pelo valor, e o caso que NÃO pode truncar ("Ativos", 6 chars) fica
intacto nos três primeiros índices de barra (0, 1, 2), onde o defeito
aparecia.

## 4. Gates — números reais

Tudo em **foreground**, em série, `--config.verify-deps-before-run=false`.

| Gate | Resultado |
|---|---|
| Suíte design-system COMPLETA | **75 arquivos · 1809 testes · 1809 passed, 0 failed** (59,26 s) — +1 teste vs. baseline (1808) |
| `type-check` design-system | limpo (`tsc --noEmit`, exit 0) |
| `lint` design-system `--max-warnings 0` | limpo (`src` + `showcase/src`) |
| Testes do painel que consomem `BarChart` (grep confirmou 4 telas: `EngajamentoView`, `FinanceiroView`, `AnaliseVendasView`, `OverviewDashboard`→`ModalidadesPanels`) | **4 arquivos · 87 testes · 87 passed, 0 failed** (23,41 s) |
| `type-check` painel | limpo (`tsc --noEmit`, exit 0) |
| `lint` painel `--max-warnings 0` | limpo |

### Grep de consumidores (painel)

Busca por `\bBarChart\b` em `apps/painel/**/*.{ts,tsx}` encontrou 8 arquivos;
descartados os que só citam o tipo `BarChartDatum` ou comentam o componente
sem renderizá-lo (`CohortIdadeSexo.tsx`, `OcupacaoEventos.tsx`,
`crm/visao-geral/_lib/modalidades.ts`). Os 4 que efetivamente montam
`<BarChart>` na árvore e têm teste próprio, todos rodados:

1. `clubes/engajamento/EngajamentoView.tsx` → `EngajamentoView.test.tsx`
2. `eventos/financeiro/FinanceiroView.tsx` → `FinanceiroView.test.tsx`
3. `crm/visao-geral/AnaliseVendasView.tsx` → `AnaliseVendasView.test.tsx`
4. `eventos/evento/overview/ModalidadesPanels.tsx` (renderizado por
   `OverviewDashboard.tsx`, sem teste próprio) → `OverviewDashboard.test.tsx`

Nota honesta: jsdom não desenha SVG do Recharts (sem layout), então esses 4
testes não exercitam o `tickFormatter` em runtime — servem de gate de
regressão (nada quebrou na árvore que consome `BarChart`), não de prova do
fix. A prova do fix é o teste de aridade (seção 3) + a conferência visual no
`:4601` (seção 6).

## 5. Commit e push

| Commit | Conteúdo |
|---|---|
| `89537700` | `fix(ds): blinda a aridade do tickFormatter do BarChart [BARCHART-FIX]` — `BarChart.tsx` + `BarChart.test.tsx`, único par de arquivos no diff |

`git commit --only` com pathspec dos 2 arquivos exatos. Push feito para
`origin/redesign-engajamento-v2` (`dec4c2cc..89537700`).

## 6. Servidor de conferência

| | |
|---|---|
| Build design-system (`tsup`) | precisou rodar ANTES do build do painel — `@leela/design-system` resolve para `dist/index.mjs`, e o 1º `vite build` deu bundle com hash idêntico ao antigo (`index-gP3Fk6z3.js`, mesmo SHA-256) porque a DS não tinha sido recompilada. Corrigido: `pnpm build` na DS, depois `vite build --mode leela-hub` no painel de novo. |
| Build painel | `vite build --mode leela-hub` · 4011 módulos · exit 0 · 11,48 s |
| Bundle novo | `assets/index-DtmHYTG9.js` — 2.286,76 kB (gzip 608,80 kB) · CSS `index-sDPZyP0B.css` inalterado |
| SHA-256 do JS (disco = servido, conferido igual) | `6170f763538449af25c30bc91c47df02cc44e309214ff8888038f931259a75db` |
| PID antigo (:4601) | `23744` — morto (`taskkill /PID 23744 /F`) |
| **PID novo (:4601)** | **`5380`** — mesma porta, mesmo `.maestro-logs/serve-4601.js`, log confirma `pid=5380`, `HTTP 200` |
| `curl http://localhost:4601/` | referencia `assets/index-DtmHYTG9.js` no HTML servido |
| `:4599` | **intocado** — segue no PID `25384` |
| Deploy | **NENHUM** |

**Prova de vida do bundle:** o HTML servido em `:4601` referencia o JS novo
(`index-DtmHYTG9.js`, hash diferente do bundle anterior `index-gP3Fk6z3.js`
citado no handoff da UXW-FIX), e o SHA-256 do arquivo baixado via `curl`
bate byte a byte com o SHA-256 do arquivo em disco. O bundle novo está no
ar.

**Conferência renderizada final (rótulos completos na Ocupação/Engajamento,
navegador real em `:4601`) é do maestro** — não foi feita nesta lane.

---

## 7. escalate_if — não disparou

Não foi preciso mudar a API do `BarChart` nem tocar mais de ~3 arquivos de
produto: o diff final é 2 arquivos (`BarChart.tsx` + seu teste), zero
arquivos de consumidor tocados. Rota proporcional cumprida.
