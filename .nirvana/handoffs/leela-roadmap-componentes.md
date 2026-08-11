# Handoff vivo — ROADMAP-COMPONENTES

- **trace:** `leela-roadmap-componentes-20260810`
- **lane:** ROADMAP-COMPONENTES · empresa software-forge · sf-frontend-lead
- **base:** `main` @ `b0f979e5` (redesign inteiro mergeado)
- **working dir:** `C:\dev\LEELA` — árvore compartilhada com a lane de deploy. `git commit --only` com pathspec explícito, sempre. Nunca `add -A`, `amend` ou `stash`.
- **entregável:** documentos em `leela-specs/02-rodadas/2026-08-11-roadmap-componentes/`. Nenhuma tela se mexe.

## Estado

| Fase | Documento | Estado |
|---|---|---|
| Ata | `01-ordem-do-dono.md` | escrito |
| A · inventário | `02-inventario-componentes.md` | em medição |
| B · cânone | `03-canone-componentes.md` | aguarda A |
| C · ondas | `04-ondas-roadmap.md` | aguarda B |
| D · gate | `05-gate-leela-canon.md` | aguarda A |

## Achados que entram no inventário (vindos da noite)

Cinco handoffs alimentam a medição; nenhum deles é conserto desta lane, todos viram item de onda.

- `leela-redesign-ajustes-dono.md` — telas legadas com background cru sob o filme glass
- `leela-redesign-parcerias-nav.md` — `<article>` cru em MinhasAfiliacoes
- `leela-uxw-fix.md` — fila não aplicada: `be-hero.com.br` hardcoded, jargão RN-141/RN-144/"idempotente" em telas fora do diff, melhorias de copy
- `leela-redesign-engajamento-dash.md` — import cross-route clubes→overview a promover para `src/components/`
- `leela-redesign-hifi-rec-FIX.md` — F4 tooltip focus-visible, F5 rodapé, F6 ARIA grid da Agenda

## Infra de gate já existente (o molde do `leela-canon`)

ESLint flat config na raiz (`eslint.config.mjs`) carrega três plugins de `packages/design-system/lint/`:
`leela-tokens-plugin.mjs` (regra `no-hardcoded-tokens`), `leela-scroll-plugin.mjs` (`no-scroll-de-um-eixo`), `leela-auth-plugin.mjs` (`rota-fora-da-fronteira`, `senha-fora-do-ds`). Testes de regra em `lint/__tests__/*.test.mjs` com `RuleTester` do ESLint sob vitest. `senha-fora-do-ds` é o precedente mais próximo: já barra um controle cru específico em favor do componente do DS.

## Riscos e parada limpa

Emergência: parar após o commit do documento em curso; o handoff acima diz exatamente onde retomar. Nenhum arquivo de código foi tocado por esta lane em momento nenhum.
