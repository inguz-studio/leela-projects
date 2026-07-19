# Handoff — KIT-IMG-LANDING (leela-build-2d6ee98d)

**Employee:** sf-frontend-engineer (software-forge) · **Data:** 2026-07-19 · **Território:** `apps/landing/**`

## Estado: ✅ COMPLETO (todos os gates verdes, prova visual capturada)

Imagem de kit agora aparece na **seção de kits da página de vendas** e no **checkout**, clicável para **ampliar** (lightbox do DS), com **placeholder padrão Leela** para kit sem imagem em produção.

## Gates
- tsc 0 · eslint 0 · suíte landing **55/55** (36 baseline + 19 novos) · verify:brand PASS
- Prova visual :3200 em `outputs/leela-build-2d6ee98d/`: `kits-section-lp.jpg`, `lightbox-kit-prata.jpg`, `placeholder-padrao-leela.jpg`

## Commits (pushados até T2; T3+docs a pushar neste handoff)
- `[LEELA-KITIMG-T1]` `lib/kitImagem.ts` + 5 fotos Unsplash 1:1 + `leela-kit-placeholder.svg` + teste cascata
- `[LEELA-KITIMG-T2]` `app/components/KitImagem.tsx` + `KitsSection.tsx` + `KitDetalhe.tsx` + teste lightbox
- `[LEELA-KITIMG-T3]` fix placeholder (decode XML + wordmark lime do header) + `rotuloKit` (alt sem "Kit Kit")

## Arquitetura
- Resolvedor puro `imagemDoKit(kit, preview)`: **real → foto mock temática (só preview) → placeholder Leela (produção)**. `temaKit` chaveia ciclismo/trail/wellness/bundle/tee.
- `KitImagem` = slot único das 2 superfícies; lightbox reusa `@leela/design-system/dialog` (ADR-017, Radix-free).
- `ehPreview()` (NEXT_PUBLIC_USE_EMULATOR) consistente server(LP)+client(checkout).

## Achado (corrigido)
Prova visual pegou o placeholder QUEBRADO: `--` dentro de comentário XML invalida o SVG p/ `<img>`. Reescrito. Sem a prova visual isso teria shippado quebrado.

## Não mexi (fora de território)
- `StepModalidadeKit` (lane TAMANHOS) · core/functions/financeiro (lane E11).

## Follow-ups (nenhum bloqueante)
- Variedade de foto por tema é validada por teste; visual mostra corrida (tee) — MTB/wellness ficam nos eventos de cada tema.
- Se o organizador subir imagem real (KitEditor/RN-230), ela vence a cascata em qualquer ambiente.

## Docs atualizados
E12 (landing) + E03 (placeholder = default de produção) + BOARD-EPICOS + KIT-IMG-LANDING-REPORT.md.
