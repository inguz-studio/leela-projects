# Lote FIX-E01 — corrigir os 26 achados da revisão do Design System (E01)
trace_id: leela-build-2d6ee98d · repo: C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA · modelo: Fable 5

## Contexto
REVIEW-E01 (Fable, antagonista) reprovou o Design System (packages/design-system, tema "brasa"/"leela",
22 componentes, 356 testes, Storybook 2 temas) com 26 achados: 2 críticas, 9 altas, 9 médias, 6 baixas.
Veredicto: "pipeline verde mas teatro nos pontos de contraste". Um FIX-E01 anterior foi despachado e
morreu SEM commitar nada — refazer limpo a partir do HEAD atual (c56b747).

Achados nomeados no audit (gate_failed REVIEW-E01, 2026-07-03T16:12:31Z):
- F01 (CRÍTICA) tema leela ilegível — contraste 1.04:1
- F02 (CRÍTICA) Badge alerta fg==surface → invisível
- F03 (ALTA) Button Primary brasa 3.27:1 falha WCAG AA
- F04 (ALTA) ThemeProvider ignora prop `theme`
- F05 (ALTA) FOUC total em SSR
- F06 (ALTA) entry `./rn` inexistente no package.json
- F07 (ALTA) Popover sem portal → clipado por overflow
- F09 typo público volcao → vulcao (token/nome exportado)
- F10 ARIA inválida no Chip
- F11 lint de tokens com 3 furos
Os demais ~16 achados (médias/baixas) não foram detalhados no audit: re-audite você mesmo o pacote nas
mesmas dimensões (contraste AA em TODOS os pares token fg/bg dos 2 temas, ARIA/roles, entries do
package.json, furos do lint de tokens, naming, flat §2.16, tokens duplicados/hardcoded) e corrija o que
encontrar — o re-review antagonista vai verificar depois.

## Tarefa
1. Corrigir as 2 críticas primeiro (temas legíveis, matriz de contraste AA verificada por script/teste, não a olho).
2. Altas F03–F07; depois varredura médias/baixas + self-audit.
3. Commits atômicos por grupo coeso: `fix(design-system): ... [LEELA-S001-x-Tx]`.
4. Rodar: testes do pacote + build do Storybook + lint de tokens + `pnpm turbo type-check lint` no pacote. Números reais no relatório.
5. Devolver: tabela achado→commit, matriz de contraste antes/depois dos pares críticos, resultado dos comandos, follow-ups estacionados.

## Regras
- Mutex para commit/install: `mkdir .forge-mutex` na raiz do repo antes de `git commit`/`pnpm install`; `rmdir` depois; se existir, aguarde.
- NÃO tocar em functions/, .github/, apps/painel fora do necessário de tema (outro lote VERIFY-FIX-E00 trabalha lá).
- Renomes públicos (volcao→vulcao): atualizar todos os consumidores no monorepo + testes.
- Sem push. Flaky = reprovado. Contraste provado por número, não por screenshot.
