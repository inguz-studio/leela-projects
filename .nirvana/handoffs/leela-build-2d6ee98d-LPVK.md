# Handoff · leela-build-2d6ee98d · lote LP-VENDAS-KIT

employee: sf-frontend-engineer · model: Opus (UI) · project: C:\dev\LEELA
brief: .nirvana/briefs/leela-lp-vendas-kit-enriched.md

## Estado das tasks
- [x] T1 — Imagens mock semi-realistas (fotos royalty-free) nas superfícies públicas
- [ ] T2 — Modal de regulamento na página do evento (Dialog/Modal do DS)
- [ ] T3 — KitEditor no painel (descrição/itens/upload 1:1) + exibição no KitDetalhe

## T1 FEITO (gates: tsc 0 · eslint 0 · verify:brand PASS)
- 7 fotos de capa por tema (Unsplash License) → public/covers/*.jpg; CAPAS_MOCK repontado.
- Hero unificado no resolvedor temático (capaDoEvento) — antes usava resolverCapa genérico.
- CoverImage FALLBACK_CAPA → foto (era leela-evento-brasa.svg).
- Galeria (3) → fotos; avatar de organizador mock → foto de retrato.
- DECISÃO: logos de patrocinador ficam SVG (logo é marca, não foto); kit fallback
  segue arte SVG on-brand (nenhuma foto royalty-free de "kit de corrida" fiel; foto
  real chega pelo upload do T3). Verificação visual de cada foto por Read (rejeitados
  nadador/powerlifting/badminton). Créditos no REPORT.

## Descobertas de arquitetura (conferidas por leitura)
- Backend PRONTO: `Kit.descricao/itens/imagemUrl` (core/eventos/kit.ts), `salvarKit`
  aceita os campos (api-client/eventos/kits.ts), `uploadImagemKit(eventoId,kitId,file)`
  valida 1:1 e sobe p/ `eventos/{eventoId}/kits/{kitId}` (api-client/storage.ts).
- Checkout `KitDetalhe.tsx` + `kitDetalheDados.ts` JÁ consomem `KitPublico.imagemUrl`
  real (fallback mock por campo). Projeção `lib/leitor.ts` (lerKits) JÁ mapeia
  descricao/itens/imagemUrl → KitPublico. Logo T3-checkout = wiring pronto; falta só
  o painel gravar (KitEditor sem os campos hoje) + tornar o fallback fotográfico.
- Capas mock hoje = SVG (`coverEvento.ts` CAPAS_MOCK, `cover.ts` CAPA_MOCK, galeria).
  Vitor quer FOTO (banco de imagens). Ponto único: CAPAS_MOCK alimenta hero+cards.
- `regulamento` vive em `Evento` (core), NÃO é projetado p/ a landing hoje → projetar.
- Seed vive em functions/src/seed (NÃO tocar). Regulamento p/ o gate = write aditivo
  no emulator (sem editar source).

## Restrições ativas
- NÃO tocar functions/**, crm (E19). Sem stash. commit --only por path. Preview vivo.

## Commits
(pendente)
