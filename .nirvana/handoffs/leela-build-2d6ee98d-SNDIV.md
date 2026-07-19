# Checkpoint — SUBNAV-DIV · divisórias em todo SubNav (RN-229 ampliada) · trace leela-build-2d6ee98d

employee: sf-ux-engineer · model: Opus · project_dir: C:\dev\LEELA
brief: `.nirvana/briefs/leela-subnav-divisorias-enriched.md`
decisão-fonte: DEC-0719 item 21 (Vitor) — divisória vale para TODO SubNav do painel,
supersede globalmente o "SubNav plano sem divisor" de 2026-07-11.

## O que foi feito
Reuso-primeiro: o padrão de divisória JÁ EXISTIA no DS. O `SubNav` (@leela/design-system)
tem a prop `divider` desde R9-A (`b433f71`) — aplica `border-b border-b-[var(--border-subtle)]`,
o MESMO token que as terciárias de evento (Financeiro/Kits/Config) usam. Nada foi recriado:
o lote só ATIVOU a prop nos consumidores do painel que ainda estavam planos. Zero mudança
em `packages/design-system` (nenhum token novo foi preciso).

## Inventário de SubNav no painel (grep `<SubNav`)
Consumidores em `apps/painel` (os render-sites do DS package — stories/showroom/tests — são
do território da forge e ficaram intocados):

| Render-site | Antes | Depois |
|---|---|---|
| `eventos/kits/KitsLayout.tsx` | `divider` ✅ (R9-A) | sem mudança |
| `eventos/configuracoes/ConfiguracoesLayout.tsx` | `divider` ✅ (R9-A) | sem mudança |
| `eventos/financeiro/FinanceiroLayout.tsx` | `divider` ✅ (R9-A) | sem mudança |
| `eventos/evento/EventoShell.tsx` (menu primário do evento) | plano | **+ `divider`** |
| `clubes/clube/ClubeShell.tsx` (menu do clube) | plano | **+ `divider`** |
| `financeiro/_components/FinanceiroSubNav.tsx` (back-office Análise/Repasses) | plano | **+ `divider`** |

3 já tinham (terciárias de evento), 3 receberam agora. Padrão global, sem variação por página.
`overflow-x-auto overscroll-x-contain` (adendo 12) preservado — vive no componente do DS, os
consumidores não o tocam.

## Token / AA
`--border-subtle` resolve nos dois temas (mesma linha das terciárias, já validada no gate
R9-A/GATE-DS-W1 de matriz AA por estado): brasa → `neutral-800`, wine → `neutral-200`.
Zero estilo hardcoded; a divisória é 1px via border do DS. Nenhum valor cru introduzido.

## Testes (RTL/snapshot da divisória)
Asserção nova em cada um dos 3 render-sites alterados, afirmando `border-b` no landmark de
navegação:
- `eventos/evento/__tests__/EventoShell.test.tsx` (+1 caso)
- `clubes/clube/__tests__/ClubeShell.test.tsx` (+1 caso)
- `financeiro/_components/__tests__/FinanceiroSubNav.test.tsx` (arquivo novo, +2 casos:
  aba ativa por rota + divisória)

## Gates
- tsc (`pnpm type-check` no painel): **0 erros**
- eslint (`pnpm lint`, `--max-warnings 0`): **0**
- suíte painel completa (`pnpm test` / vitest run): **165 arquivos · 1236 testes · verde**
- RTL da divisória nos 3 sites: verde
- AA nos 2 temas (brasa/wine): coberto pelo token existente já validado; divisória 1px não-texto
- zero estilo hardcoded: confirmado (token existente)
- prova visual: dispensada pelo brief (mudança 1px por prop) — Vitor confere nas rotas abaixo

## Território (respeitado)
- `ClubeShell.tsx` fica na árvore da lane UPLOAD-SWEEP (telas de clube). A mudança foi
  **prop-only** (`divider`), que o brief autoriza explicitamente mesmo em tela de outra lane
  (só ajuste ALÉM de prop viraria pendência). Nenhuma outra edição na tela.
- `KitsLayout.tsx` (lane TAMANHOS-GRADE) não precisou de mudança — já tinha `divider`.
- `packages/design-system/**` NÃO tocado.
- Sem stash; `git commit --only` nos meus paths; `git status` conferido antes do board
  (V1-KANBAN.md estava limpo, sem edição de outra lane).

## Board
`leela-specs/00-boards/V1-KANBAN.md`: card `[DEC-0719 · b] subnav-divisórias` movido de
📋 Backlog → ✅ Feito (SUBNAV-DIV).

## Onde o Vitor confere (sem navegador — rotas do painel)
- **Evento** → qualquer evento, menu de seções primário (Visão/Inscritos/…/Financeiro/Config):
  agora com a linha divisória abaixo do menu — antes era o único plano do evento.
- **Clube** → qualquer clube, menu de seções (Overview/Membros/Desafios/Parcerias/…): linha nova.
- **Financeiro** (item do sidebar) → menu Análise | Repasses: linha nova.
- Conferir que as terciárias de evento (Financeiro/Kits/Config DENTRO do evento) seguem
  idênticas (já tinham a linha) e que em tablet/mobile o menu ainda rola de lado sem quebrar.

## Premissas
1. A prop `divider` do DS É o padrão canônico das terciárias (mesmo token/border) — replicá-la
   é o reuso pedido; não havia divisória "à mão" a copiar em outro lugar.
2. Aplicação global sem exceção por página (brief: "nada de variação por página").
3. `ConfiguracoesLayout` mantém a guarda `tabs.length > 1` já existente (não renderiza SubNav
   com 1 aba) — fora do escopo alterar isso.

## Pendências
- Nenhuma bloqueadora. O menu de Configurações só mostra SubNav (com ou sem divisória) quando
  há 2+ abas visíveis — comportamento pré-existente, não é regressão deste lote.
