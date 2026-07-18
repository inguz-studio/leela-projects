# Handoff — Lote R14-EVENTOS (trace leela-build-2d6ee98d)

Employee: sf-frontend-engineer · Business: software-forge
Protocolo: 09-emergency-handoff. Atualizado a cada task.

## Missão
Listagem pública `/` mostra TODOS os eventos com CAPA (imagem mock rica, ⛔ critério 1),
em ESTADOS distintos (inscrições abertas / esgotado / encerradas), CTA/badge coerente por
estado, 100% tokens do DS.

## Diagnóstico (evidência)
1. ⛔ Capas nunca renderizavam: seed grava `imagemUrl` RELATIVO (`/seed-images/*.jpg`),
   mas (a) `/seed-images/` NÃO existe e (b) `isUrlCapaValida` (RN-153, @leela/core) REJEITA
   caminho relativo → o leitor descarta → card cai no gradiente do `CardEvento`. Confirmado
   no `curl :3200` (0 imagens, 10× "Inscrições encerradas", 0 "abertas").
2. Todos os eventos rendiam `encerrado`: os lotes extras têm janelas FIXAS dez/2025–abr/2026
   (desenhadas p/ `LEELA_CLOCK=2026-03-15`), mas o :3200 usa relógio REAL (jul/2026) → nenhum
   lote ativo → `deriveEstadoVenda` = encerrado em todos.

## Abordagem
- Capas resolvidas APP-SIDE (padrão R7/R12 `resolverCapa`/`mockImagem`): `lib/coverEvento.ts`
  escolhe capa rica por tema (esporte/nome) — nunca gradiente. Arte SVG própria em
  `apps/landing/public/covers/` (silhuetas de corredores/ciclista/yoga, paleta brasa, profundidade).
- Seed R14 ADITIVO (`functions/scripts/preview-seed-r14.ts`): eventos novos com janelas de lote
  RELATIVAS ao relógio real → estados limpos (aberto L1, aberto L2, esgotado, encerrado).
- Badge de estado (DS `Badge`) + CTA coerente por estado no card.

## Ownership respeitado
SEUS: `apps/landing/app/(public)/page.tsx`, `apps/landing/lib/coverEvento.ts`,
`apps/landing/public/covers/*`, `functions/scripts/preview-seed-r14.ts` (+runner).
NÃO TOCADOS: `[eventSlug]/**`, `apps/painel/**`, `packages/design-system/**`.

## Tasks
- [x] T1 capas ricas + resolver + page (listagem) — 7 covers SVG + coverEvento.ts + page.tsx
- [x] T2 seed R14 (estados) + aplicar :8180 (2 runs idempotentes) — aberto=3/esgotado=1/encerrado=1
- [x] T3 gates + smoke SSR + assert de imagens + screenshots

## Evidência (gates)
- type-check landing: `tsc --noEmit` EXIT 0.
- lint landing: `eslint app lib --max-warnings 0` EXIT 0 (inclui regra no-hardcoded-tokens).
- Seed :8180 run1 e run2: ambos "5 eventos (aberto=3·esgotado=1·encerrado=1)". Idempotente:
  `/` mostra 10 eventos ANTES e DEPOIS do run2; 5 R14 distintos (sem duplicar). docId+set(merge).
- ⛔ CRITÉRIO 1 (assert executável Playwright em :3200): 10 capas `<img alt="Capa de …">`,
  todas naturalWidth=1600×1000, broken=0. Zero `card-evento-gradient` no HTML da listagem.
- Estados visíveis: "Inscrições abertas" | "Esgotado" | "Inscrições encerradas".
- Screenshots: outputs/leela-build-2d6ee98d/R14-eventos/listagem-{desktop,mobile}.jpg.

## ⚠️ Achado de ambiente (NÃO é regressão do R14)
O dev server :3200 está servindo CSS parcial: a camada de utilitários do Tailwind sumiu
(layout.css = 7.5KB, 0 media queries, sem `.grid`/`.max-w-6xl`/`.text-4xl`) e o log acusa
`Cannot find module ./vendor-chunks/next@…js`. Efeito: a listagem renderiza em 1 coluna e o
hero fica sem escala nos screenshots — mas o MARKUP está correto (o `<ul>` mantém
`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) e as capas renderizam. Não toquei CSS/config/
layout nem o pipeline Tailwind. Fix: reiniciar o preview (`bash preview.sh`) regenera o CSS
completo. Deixado para o Vitor/maestro (proibido reiniciar :3200).

## Pendências para outras lanes
- Badge/CTA de estado NA PÁGINA do evento (`[eventSlug]`) = território R12-fix2.
- Restart do preview :3200 p/ CSS completo (ambiente) — ver achado acima.
