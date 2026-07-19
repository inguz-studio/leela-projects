# Handoff — Lote R9-C: modelo real do Kit (trace leela-build-2d6ee98d)

Employee: sf-backend-lead · Business: software-forge
Protocolo: 09-emergency-handoff. Atualizado a cada task.

## Missão
Estender o Kit com o modelo REAL da visão de compra (RN-227 + gap R13):
`descricao`, `itens[]`, `imagemUrl` 1:1 — core + Rules + Storage + api-client +
leitura pública do checkout + seed do preview. Painel (KitEditor) fica para a
lane UI se a tela for grande — backend/api-client completos.

## Ownership
SEUS: packages/core/** (kit), packages/api-client/** (kit), functions/src/**
(kit/upload), firestore.rules, storage.rules, firestore.indexes.json,
functions/scripts/preview-seed-*.ts, e na landing SOMENTE
`[eventSlug]/inscricao/checkout/KitDetalhe.tsx` + `kitDetalheDados.ts` + tipos
de leitura de kit em `lib/`.
NÃO TOCAR: apps/painel/**, convite/**, demais landing, design-system.

## Tasks
- [x] T1 core: Kit.descricao/itens/imagemUrl + parseKit + unit tests — `20f1e80` (24/24)
- [x] T2 firestore.rules: shape dos campos novos + kitsRules tests — `dab8238` (40/40 emulator 8080)
- [x] T3 storage: path `eventos/{eventoId}/kits/{kitId}` (RN-227) + rules tests + uploadImagemKit 1:1 — `79c4535` (41/41)
- [x] T4 api-client kits.ts: SalvarKitInput com campos novos — dentro de `dab8238`
- [x] T5 leitura pública: KitPublico + lerKits + kitDetalheDados consome dado real (fallback mock rico) — `62bd7ba` + fixtures painel `64bf1e8`
- [x] T6 seed: descricao/itens nos kits do preview (aditivo, idempotente, :8180) — `0ec9181` (ret3): itens DERIVADOS de ITEM_KIT_SEEDS via itensDoKitSeed(); gates tsc src+scripts 0 · eslint 0 · 20 kits (15 c/ visão) · 2ª rodada byte-idêntica · parseKit 20/20
- [x] T7 docs: modelo-de-dados-firestore.md + RN delta + épico E03 + boards — `5fcfd23`: RN da visão de compra RENUMERADA RN-229→**RN-230** (colisão real: RN-229 no cânon R9 = divisórias terciárias/E01, já codada em `b433f71`); comentários corrigidos em core/api-client/functions/landing (comment-only); boards por hunk (E19 intocada)

## Estado
✅ LOTE R9-C COMPLETO (T1–T7). Backend/seed/leitura pública do modelo real do
Kit entregues. Pendência transferida à lane UI: edição de descricao/itens +
upload de imagem no KitEditor (painel). Hunks da lane E19 seguem no working
tree, intocados.
⚠️ Lane E19-CRM-BACKEND em paralelo nos arquivos compartilhados (firestore.rules,
core/index.ts…) — staging por path explícito + revisão do diff staged por commit.
Working tree tem hunks alheios em apps/painel (AddPatrocinadorModal) — NÃO staged.

## Decisões/premissas até aqui
- Path de Storage segue RN-227 ratificada: `eventos/{eventoId}/kits/{kitId}`,
  guarda cross-tenant por `firestore.get` no doc do evento (padrão clube/R5).
- Testes de rules no emulator de TESTE (8080/9199 via emulators:exec), nunca
  no :8180 do preview.
- Imagem mock do preview: APP-SIDE (padrão capas R14) — o seed NÃO grava URL
  relativa (lição R14: isUrlCapaValida rejeita e o leitor descarta).
- (ret3) Itens do kit canônico DERIVADOS do catálogo ITEM_KIT_SEEDS (uma fonte
  só; marca no rótulo quando exibirLogo — RN-214); `sem_kit` declara os seus.
- (ret3) Kits dos eventos r14-* SEM visão de propósito — exercitam o ramo de
  fallback mock rico do checkout (campos opcionais no modelo).
- (ret3) Prova byte-idêntica de idempotência exclui só `atualizadoEm`
  (serverTimestamp por rodada by design); `criadoEm` provou-se preservado.
