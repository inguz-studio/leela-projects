# Handoff selado · PERF-PERCEPCAO (bundle split)

- **trace_id:** `leela-perf-percepcao-20260826`
- **natureza:** PERF — code-splitting por rota, remoção de código morto
- **repo:** `~/dev/LEELA` · branch `perf/percepcao-20260826`
- **lane:** PERF-PERCEPCAO

## Estado

Selado. Dois commits de código + gate-visual. Todos os gates obrigatórios verdes.

## Território honrado

Tocado:
- `apps/painel/src/App.tsx` — React.lazy + Suspense nas 6 áreas; RotaSkeleton inline
- `apps/painel/src/routes/overview/_data/overview.ts` — removida `useInscricoesRecentes` e imports exclusivos dela (`getLeelaDb`, `listarInscritos`, `valorDaInscricao`, `InscricaoRecenteInput`)
- `apps/painel/src/routes/overview/_data/__tests__/overview.test.tsx` — removido (testava só o código morto; explicado abaixo)
- `.nirvana/gate-visual/perf-percepcao/login-4603.png` — evidência visual

Não tocado: `.github/workflows/`, `functions/`, `apps/landing/`, `packages/design-system/`, `leela-specs/00-boards/MIGRACAO-DE-MAQUINA.md`.

## Tabela antes/depois de bundle

| Chunk | Antes (raw) | Antes (gzip) | Depois (raw) | Depois (gzip) |
|---|---|---|---|---|
| `index.js` (bundle principal) | 2.382 kB | **630 kB** | 1.713 kB | **464 kB** |
| `EventosRoutes.js` (novo chunk) | — | — | 300 kB | 79 kB |
| `PlataformaRoutes.js` (novo chunk) | — | — | 131 kB | 33 kB |
| `ClubesRoutes.js` (novo chunk) | — | — | 123 kB | 33 kB |
| `ParceriasRoutes.js` (novo chunk) | — | — | 48 kB | 13 kB |
| `CrmRoutes.js` (novo chunk) | — | — | 31 kB | 9 kB |
| `ContaRoutes.js` (novo chunk) | — | — | 23 kB | 7 kB |
| `index.css` | 149 kB | 22 kB | 149 kB | 22 kB |
| **Total JS** | **2.407 kB** | **640 kB** | **2.369 kB** | **637 kB** |

**Redução do chunk inicial: -669 kB raw / -166 kB gzip (-26%).** O total de JS em disco cresce marginalmente pelos chunks adicionais, mas o usuário NUNCA os baixa todos de uma vez — apenas os da área visitada.

Comando de medição: `pnpm vite build --mode leela-hub` em `apps/painel/` do worktree (nunca no checkout principal em :4601).

## O que foi feito

### 1. Code-split por área (`App.tsx`)

`React.lazy(() => import('./X').then(m => ({ default: m.X })))` nas 6 áreas pesadas:

- `EventosRoutes` · `ClubesRoutes` · `CrmRoutes` · `ParceriasRoutes` · `PlataformaRoutes` · `ContaRoutes`

`OverviewRoutes` permanece eager — é a primeira tela após o login e não pode apresentar flash de skeleton para o usuário já autenticado.

Cada `<Route>` envolto em `<Suspense fallback={<RotaSkeleton />}>`. O `RotaSkeleton` inline usa `Skeleton variant="rect"` do `@leela/design-system`, no mesmo padrão que `EventoLayout` e `OverviewContent`.

### 2. Remoção de código morto: `useInscricoesRecentes`

Confirmação via grep: a função `useInscricoesRecentes` (linhas 127-183 de `overview.ts`) não é importada por nenhum consumidor de produção — só pelo arquivo de teste `_data/__tests__/overview.test.tsx`. Verificado:

```
grep -rn "useInscricoesRecentes" apps/painel/src/ --include="*.ts" --include="*.tsx"
# resultado: apenas overview.ts (definição) e __tests__/overview.test.tsx
```

Removidos:
- A função completa e seu bloco de comentário JSDoc
- Imports exclusivos: `getLeelaDb`, `listarInscritos` (de `@leela/api-client`), `valorDaInscricao`, `InscricaoRecenteInput` (de `_lib/recentRegistrations`)
- O arquivo de teste `__tests__/overview.test.tsx` (testava APENAS `useInscricoesRecentes`)

## Testes ajustados

Nenhum teste existente teve sua asserção enfraquecida.

O arquivo `overview.test.tsx` foi **removido** (não ajustado) porque ele testava exclusivamente `useInscricoesRecentes`, que foi removido como código morto. Os 4 casos de teste do arquivo cobriam comportamentos que não existem mais na base de código.

A suíte saiu de 262 arquivos / 3.034 testes para 261 arquivos / 3.030 testes — redução exata de 1 arquivo e 4 testes correspondendo ao código morto removido.

Nenhum teste de render assíncrono precisou de ajuste com `findBy*`/`waitFor` porque os componentes `React.lazy` não são renderizados diretamente nos testes de unidade existentes — os testes do `App.tsx` usam o componente montado com mocks de rota e não disparam carregamentos lazy.

## Gates — evidência real

| Gate | Comando | Resultado |
|---|---|---|
| lint | `pnpm --filter @leela/painel lint` | **0 erros, 0 warnings** |
| tsc | `tsc --noEmit` (em `apps/painel/`) | **0 erros** |
| build | `pnpm vite build --mode leela-hub` | **OK** — 3.81s |
| testes | `pnpm --filter @leela/painel test --run` | **261 arquivos / 3.030 testes verdes** |
| gate visual | `node gate-visual-script.cjs` → Playwright headless :4603 | **PASSOU** — 0 erros de console |
| desligamento :4603 | `kill 5335` (PID exato via `lsof -nP -iTCP:4603 -sTCP:LISTEN -t`) | porta liberada |

Screenshot: `.nirvana/gate-visual/perf-percepcao/login-4603.png`

## O que o CI vai validar

O CI do repo (~37 min) é o gate final. Suíte verde localmente, mas o CI nunca passou no repo (891 execuções / 0 sucessos) por razões não relacionadas a esta lane — ver nota em memória `leela-ci-nunca-passou.md`.
