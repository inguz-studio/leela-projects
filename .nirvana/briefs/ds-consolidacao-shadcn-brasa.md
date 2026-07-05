# Brief — Consolidação do Design System LEELA (shadcn + brasa + ícones + motion)

trace: leela-build-2d6ee98d · data: 2026-07-05 · solicitante: Vitor
executor previsto: squad **magic-ds** (design system atômico sobre shadcn/ui + tokens + motion + WCAG AA + Storybook)
inputs: leela-specs/discovery/plano-shadcn-2026-07-05.md · diagnostico-sidebar-2026-07-05.md · projeto de referência Be Hero (WEB-APPV2, be-hero-documentacao)

## Objetivo
Padronizar o design system do LEELA (tokens, animações, componentes) sobre shadcn/ui, estilizado no tema brasa,
com ícones Lucide e a sidebar fixa do mockup Be Hero, para escalar as construções da Onda 2+ sobre base consistente.
Higiene AGORA, antes da Onda 2 (o shell é base de toda tela de vendas/checkout).

## Decisões do Vitor (VINCULANTES, 2026-07-05)
1. **Componentes E01 → SUBSTITUIR por shadcn stock** (Button, Modal, Tabs, Badge, Toast, Avatar, Divider, Card, Table,
   Skeleton, etc.). NÃO é "manter os nossos". Porém — TRAVA CRÍTICA: cada componente substituído deve ter o contraste
   AA RECONSTRUÍDO e re-provado no mesmo padrão do E01 (48 pares × 2 temas = 104 asserts) e a cobertura de teste PORTADA
   (não perder os ~502 testes; migrar/reescrever contra as versões shadcn). Substituir sem re-estabelecer AA = FALHA.
2. **Sidebar FIXA substitui o modo colapsável** (240px sempre visível, padrão Be Hero). Não manter as duas variantes.
3. **Executar AGORA, antes da Onda 2.** Ordem: Lote A (fundação shadcn+brasa) → Lote B (sidebar fixa + ícones + shell).

## Escopo por lote (do plano-shadcn + diagnóstico-sidebar)

### Lote A — Fundação shadcn+brasa
- Mapear ~15 aliases de tokens (ex.: shadcn `--background` → nosso `--surface-base`) gerados pelo pipeline de tokens.
- ~15 entradas no tailwind-preset para o CLI do shadcn sair já com a cara brasa.
- `components.json` do shadcn — DESTINO dos componentes = **packages/design-system** (regra DS-obrigatório), não o app.
- Substituir os componentes gateados por versões shadcn restilizadas aos tokens brasa, com AA reconstruído (decisão 1).
- Prova: componentes re-auditados WCAG 2.2 AA, testes portados verdes, Storybook atualizado.

### Lote B — Sidebar fixa + ícones + shell
- lucide-react como peer dep do DS; preencher os 8 ícones no DEFAULT_SIDEBAR_SECTIONS (hoje `icon: null`).
- Corrigir `icon: null` nos 3 consumidores; sidebar variante FIXA (240px), preservando a11y (nav landmark, foco, teclado).
- **Envolver /eventos e /clubes no AppShell** — hoje renderizam SEM menu (bug do diagnóstico, item 18 do DoD violado).
  Isso é o custo real: ~29 telas passam a montar o shell. Layout raiz em App.tsx envolvendo todas as rotas.
- Rodapé com avatar/logo conforme mockup (pode ser T3 opcional).
- Gate visual (harness visual-qa: renderiza em browser real, screenshot desktop+mobile, julga contra o mockup Be Hero).

## Guarda-rails (não negociáveis)
- NÃO regenerar o DS do zero — CONSOLIDAR o existente (o E01 já é Radix+cva+tokens; a arquitetura fica).
- Motion/animações: adicionar via Motion (padrão do squad), tokenizadas (sem hardcode de duração/easing).
- Gate de contraste AA é BLOQUEANTE (mesmo bar do E01). Gate visual contra o mockup é BLOQUEANTE.
- Tokens da tema brasa são a fonte de verdade; nada de cor/spacing/tipografia hardcoded (regra no-hardcoded-tokens).
- 1 task = 1 commit; mutexes; sem push (maestro faz no gate); protocolo LEELA (WIKI.md).
- **PRIMEIRA ENTREGA = plano de execução detalhado** (mapa de tokens, lista componente-a-componente com plano de AA,
  breakdown de tasks) para revisão do maestro/Vitor ANTES de mudança em massa de código. Blast radius alto (33 telas).

## Fora de escopo
- Não tocar lógica de negócio, Functions, Rules (só o design-system e a camada de layout/shell do painel).
- Landing pública (awwwards-singularity-studio) é da Onda 2, não deste brief.
