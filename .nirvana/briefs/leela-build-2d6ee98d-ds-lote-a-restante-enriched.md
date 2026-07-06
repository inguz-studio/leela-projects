# Brief enriquecido — DS LEELA · Lote A restante (Toast/Popover + substituições shadcn + matriz AA)

trace: leela-build-2d6ee98d · data: 2026-07-05 · maestro: harness/Nirvana-OS
executor: business **software-forge** / employee **sf-frontend-engineer** (Fable) · squad de apoio: **magic-ds v3.0.0**
project_dir: `C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA`
output_path: `packages/design-system/` (código) + `.nirvana/outputs/leela-build-2d6ee98d/DS-LOTE-A-RESTANTE-SUMMARY.md` (sumário)

## Leituras obrigatórias ANTES de codar (ordem)
1. `.nirvana/briefs/ds-consolidacao-shadcn-brasa.md` — brief vinculante com as 4 decisões do Vitor.
2. `leela-specs/discovery/plano-shadcn-2026-07-05.md` — plano técnico (aliases, governança, dark:/data-theme).
3. `.nirvana/WIKI.md` §3 e §6 — protocolo LEELA (mutexes, staging cirúrgico, commit por task).
4. Squad magic-ds: `C:\Users\Vitor Eduardo\Desktop\Vaults\Antigravity\Squads-Vault\squads\magic-ds\agents\mds-component-crafter.md` (engenharia token-only) e `agents\mds-ux-heuristics.md` (gate APPROVE/REJECT) + checklist `checklists\a11y-wcag-checklist.md`.
5. DNA (mind-clones, ler e incorporar): `C:\Users\Vitor Eduardo\businesses\_library\dna\dan-abramov\` + `kent-c-dodds\` (agent/AGENT.md de cada).

## Estado JÁ ENTREGUE (não refazer, pushed até 3d42cff)
- A1: camada de aliases shadcn→brasa gerada pelo pipeline de tokens + Tooltip PoC (954a8b7).
- A2: motion tokenizado via tailwindcss-animate no preset (ffcf704).
- A3: Button, Input, Badge, Skeleton, Separator, Breadcrumb já substituídos por shadcn stock restilizado brasa, API estável (3d42cff). Suíte DS 542/542 verde.
- `components.json` já aponta para `packages/design-system`.

## Escopo DESTE lote (na ordem)
### T1 — Toast: visual shadcn, comportamento nosso (decisão bd31974)
Adotar a aparência shadcn preservando integralmente a fila do `useToast` existente. Zero regressão de API pública e de a11y. Testes existentes do Toast portados e verdes.

### T2 — Popover → DropdownMenu: visual shadcn, comportamento nosso
Migrar para DropdownMenu com visual shadcn, PORTANDO os 13 testes WAI-APG de foco/teclado integralmente (não reescrever o comportamento do zero). Zero regressão de a11y.

### T3..Tn — Demais componentes gateados do E01 → shadcn stock restilizado
Modal (→Dialog), Tabs, Card, Table, Avatar e o que restar do inventário E01 ainda não substituído (inventariar em `packages/design-system/src/components/` vs o que A3 já cobriu). Mesmo padrão do A3: shadcn stock, restilizado com tokens brasa, API pública estável (imports dos consumidores NÃO quebram), testes portados.

### T-final — Matriz de contraste AA reconstruída e re-provada
48 pares × 2 temas (brasa + leela) = 104 asserts, mesmo bar do E01. Cada par novo introduzido pelos componentes shadcn entra na matriz. **Substituir sem re-provar AA = FALHA do lote.**

## Critérios de aceitação (gate do maestro)
1. Suíte completa do DS verde (`pnpm --filter @leela/design-system test`) — nenhum teste perdido vs 542 atuais; testes dos componentes substituídos portados, não deletados.
2. Matriz AA com 104 asserts passando, incluindo pares novos.
3. ESLint no-hardcoded-tokens limpo (zero cor/spacing/duração crua; nada de classes stock slate/gray; nada de `dark:` — tema via `data-theme`).
4. API pública estável: `src/index.ts` exporta os mesmos símbolos; consumidores do painel compilam sem alteração.
5. 1 task = 1 commit `[LEELA-DS-A4]`, `[LEELA-DS-A5]`... staging cirúrgico (git add por caminho, nunca `git add -A`).
6. SEM push (maestro pusha no gate). SEM tocar em functions/, Rules, apps/painel (fora escopo deste lote).
7. Sumário final em `.nirvana/outputs/leela-build-2d6ee98d/DS-LOTE-A-RESTANTE-SUMMARY.md`: o que foi substituído, decisões tomadas (## Premissas assumidas), contagem de testes antes/depois, pares AA novos.

## Restrições operacionais
- Máquina 8GB: rodar suíte em blocos por componente durante o desenvolvimento; suíte completa só no fechamento.
- Roteamento de modelo: você é Fable; se recrutar subagentes, Fable/Opus apenas — Sonnet PROIBIDO.
- Contexto a ~70%: escrever HANDOFF.json no padrão do WIKI e encerrar limpo (o maestro redespacha).
